/* Jednogłośnie – łącze pokoju.
   Pokój nie ma własnego serwera. Każda wiadomość idzie naraz:
   - do dwóch publicznych brokerów MQTT (EMQX i HiveMQ) – jak jeden padnie, działa drugi,
   - do innych kart tej samej przeglądarki (BroadcastChannel) – działa nawet bez internetu,
   - do pamięci przeglądarki – odświeżenie strony niczego nie gubi.
   Stan pokoju to zbiór kluczy („room”, „p/<osoba>”, „wyl/<osoba>”). Wiadomości są „retained”,
   więc broker oddaje je od razu każdemu, kto wejdzie później. Przy konflikcie wygrywa wyższe „rev”.
   Klucze „hb/<osoba>” to bicie serca (kto jest teraz w pokoju) – nie są przechowywane. */
(function (global) {
  'use strict';

  const BROKERY = [
    { nazwa: 'EMQX', url: 'wss://broker.emqx.io:8084/mqtt' },
    { nazwa: 'HiveMQ', url: 'wss://broker.hivemq.com:8884/mqtt' },
  ];
  const PREFIX = 'jednoglosnie/v1/';
  const KLUCZ_OK = /^(room|p\/[a-z0-9]{4,16}|wyl\/[a-z0-9]{4,16}|hb\/[a-z0-9]{4,16})$/;

  function ls(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null');
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }

  class Lacze {
    /**
     * @param {string} roomId
     * @param {object} o { lokalnie:boolean, onPut(key,val,zrodlo), onHb(pid,val), onStatus({ok,razem}) }
     */
    constructor(roomId, o) {
      this.id = roomId;
      this.o = o || {};
      this.dane = new Map();
      this.moje = new Set();
      this.klienci = [];
      this.base = PREFIX + roomId + '/';
      this.cacheKey = 'jg:stan:' + roomId;
    }

    start(mojPid) {
      this.pid = mojPid || null;
      // 1. pamięć przeglądarki
      const snap = ls(this.cacheKey);
      if (snap && typeof snap === 'object') {
        for (const k of Object.keys(snap)) this.przyjmij(k, snap[k], 'pamiec');
      }
      // 2. inne karty
      try {
        this.bc = new BroadcastChannel('jednoglosnie-' + this.id);
        this.bc.onmessage = (e) => this.zKarty(e.data);
        this.bc.postMessage({ t: 'hello' });
      } catch (e) { this.bc = null; }
      // 3. brokerzy
      if (!this.o.lokalnie) this.polacz();
      this.status();
    }

    polacz() {
      for (const b of BROKERY) {
        const will = this.pid ? { topic: this.base + 'hb/' + this.pid, payload: JSON.stringify({ off: 1 }), retain: false } : null;
        const c = new MiniMqtt(b.url, {
          keepalive: 30,
          will,
          onMessage: (topic, text) => this.zBrokera(topic, text),
          onState: (s) => {
            if (s === 'ok') {
              // po (ponownym) połączeniu odświeżamy u brokera swoje klucze i pokój
              for (const k of this.moje) { const v = this.dane.get(k); if (v) c.publish(this.base + k, JSON.stringify(v), true); }
              const room = this.dane.get('room');
              if (room && !this.moje.has('room')) c.publish(this.base + 'room', JSON.stringify(room), true);
              if (this.o.onPolaczono) this.o.onPolaczono(b.nazwa);
            }
            this.status();
          },
        });
        c.nazwa = b.nazwa;
        c.subscribe(this.base + '#');
        c.connect();
        this.klienci.push(c);
      }
    }

    /** Ustawia tożsamość już po starcie (gdy ktoś dołącza do pokoju dopiero po obejrzeniu ekranu powitalnego). */
    ustawPid(pid) {
      if (this.pid === pid) return;
      this.pid = pid;
      if (!this.o.lokalnie && this.klienci.length) {
        // ostatnia wola jest ustalana przy połączeniu – łączymy się ponownie z nową
        for (const c of this.klienci) c.end();
        this.klienci = [];
        this.polacz();
      }
    }

    status() {
      const ok = this.klienci.filter(c => c.state === 'ok').length;
      if (this.o.onStatus) this.o.onStatus({ ok, razem: this.klienci.length, lokalnie: !!this.o.lokalnie });
    }

    zBrokera(topic, text) {
      if (!topic.startsWith(this.base)) return;
      const k = topic.slice(this.base.length);
      if (!KLUCZ_OK.test(k) || !text || text.length > 200000) return;
      let v; try { v = JSON.parse(text); } catch (e) { return; }
      if (!v || typeof v !== 'object') return;
      if (k.startsWith('hb/')) { if (this.o.onHb) this.o.onHb(k.slice(3), v); return; }
      this.przyjmij(k, v, 'broker');
    }

    zKarty(m) {
      if (!m || typeof m !== 'object') return;
      if (m.t === 'hello') {
        if (this.dane.size) this.bc.postMessage({ t: 'snap', d: Object.fromEntries(this.dane) });
      } else if (m.t === 'snap' && m.d && typeof m.d === 'object') {
        for (const k of Object.keys(m.d)) if (KLUCZ_OK.test(k)) this.przyjmij(k, m.d[k], 'karta');
      } else if (m.t === 'put' && typeof m.k === 'string' && KLUCZ_OK.test(m.k)) {
        this.przyjmij(m.k, m.v, 'karta');
      } else if (m.t === 'hb' && typeof m.pid === 'string') {
        if (this.o.onHb) this.o.onHb(m.pid, m.v || {});
      }
    }

    przyjmij(k, v, zrodlo) {
      if (!v || typeof v !== 'object' || typeof v.rev !== 'number') return false;
      const stare = this.dane.get(k);
      if (stare && stare.rev >= v.rev) return false;
      this.dane.set(k, v);
      this.zapiszPamiec();
      if (this.o.onPut) this.o.onPut(k, v, zrodlo);
      return true;
    }

    zapiszPamiec() {
      clearTimeout(this.tz);
      this.tz = setTimeout(() => ls(this.cacheKey, Object.fromEntries(this.dane)), 250);
    }

    get(k) { return this.dane.get(k); }
    klucze() { return [...this.dane.keys()]; }

    /** Zapisuje klucz u siebie i rozsyła wszędzie. `tylkoTu` – nie wysyłaj (np. wirtualni znajomi). */
    put(k, v, tylkoTu) {
      const stare = this.dane.get(k);
      v.rev = Math.max(Date.now(), stare ? stare.rev + 1 : 0);
      this.dane.set(k, v);
      this.zapiszPamiec();
      if (tylkoTu) return v;
      if (k === 'room' || k === 'p/' + this.pid) this.moje.add(k);
      const text = JSON.stringify(v);
      if (this.bc) this.bc.postMessage({ t: 'put', k, v });
      for (const c of this.klienci) c.publish(this.base + k, text, true);
      return v;
    }

    hb(v) {
      if (!this.pid) return;
      v = v || {};
      if (this.bc) this.bc.postMessage({ t: 'hb', pid: this.pid, v });
      const text = JSON.stringify(v);
      for (const c of this.klienci) c.publish(this.base + 'hb/' + this.pid, text, false);
    }

    stop() {
      try { this.hb({ off: 1 }); } catch (e) {}
      for (const c of this.klienci) c.end();
      this.klienci = [];
      if (this.bc) { this.bc.close(); this.bc = null; }
      clearTimeout(this.tz);
      ls(this.cacheKey, Object.fromEntries(this.dane));
    }
  }

  Lacze.BROKERY = BROKERY;
  global.Lacze = Lacze;
})(window);
