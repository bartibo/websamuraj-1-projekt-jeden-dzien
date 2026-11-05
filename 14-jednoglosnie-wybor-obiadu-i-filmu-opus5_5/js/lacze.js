/* Jednogłośnie – łącze pokoju.
   Pokój nie ma własnego serwera. Każda wiadomość idzie naraz:
   - do dwóch publicznych brokerów MQTT (EMQX i HiveMQ) – jak jeden padnie, działa drugi,
   - do innych kart tej samej przeglądarki (BroadcastChannel) – działa nawet bez internetu,
   - do pamięci przeglądarki – odświeżenie strony niczego nie gubi.

   Szyfrowanie: identyfikator pokoju jest tylko w linku (po znaku #, więc nie trafia do żadnego
   serwera). Z niego liczymy dwie rzeczy: nazwę tematu (skrót SHA-256) i klucz AES-GCM.
   Broker widzi więc tylko losowo wyglądający temat i zaszyfrowane bajty – kto subskrybuje
   „wszystko”, nie zobaczy ani listy pokoi, ani propozycji, ani pseudonimów, i nie podrobi
   wiadomości (bez klucza GCM ich nie przyjmiemy). Wewnątrz szyfrogramu jest też nazwa klucza,
   więc nie da się przenieść cudzej wiadomości pod inny temat.

   Stan pokoju to zbiór kluczy („room”, „p/<osoba>”, „wyl/<osoba>”, „dod/<osoba>”, „decyzja”, „nast”).
   Wiadomości są „retained”, więc broker oddaje je od razu każdemu, kto wejdzie później.
   Przy konflikcie wygrywa wyższe „rev”. Klucze „hb/<osoba>” to bicie serca – nie są przechowywane. */
(function (global) {
  'use strict';

  const BROKERY = [
    { nazwa: 'EMQX', url: 'wss://broker.emqx.io:8084/mqtt' },
    { nazwa: 'HiveMQ', url: 'wss://broker.hivemq.com:8884/mqtt' },
  ];
  const PREFIX = 'jednoglosnie/v2/';
  const OS = '[a-z0-9]{4,16}';
  const KLUCZ_OK = new RegExp(`^(room|decyzja|nast|p\\/${OS}|wyl\\/${OS}|dod\\/${OS}|hb\\/${OS})$`);
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function ls(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null');
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }

  /* ---------- szyfrowanie ---------- */
  const SUBTLE = global.crypto && global.crypto.subtle;
  function hex(b) { return [...b].map(x => x.toString(16).padStart(2, '0')).join(''); }
  function b64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function zB64(t) {
    const s = atob(t);
    const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  }
  async function przygotujSzyfr(id) {
    const skrot = async (t) => new Uint8Array(await SUBTLE.digest('SHA-256', enc.encode(t)));
    const temat = hex((await skrot('jednoglosnie|temat|' + id)).slice(0, 16));
    const klucz = await SUBTLE.importKey('raw', await skrot('jednoglosnie|klucz|' + id), 'AES-GCM', false, ['encrypt', 'decrypt']);
    return { temat, klucz };
  }

  class Lacze {
    /**
     * @param {string} roomId
     * @param {object} o { lokalnie:boolean, onPut(key,val,zrodlo), onHb(pid,val), onStatus({ok,razem,lokalnie,bezSzyfru}) }
     */
    constructor(roomId, o) {
      this.id = roomId;
      this.o = o || {};
      this.dane = new Map();
      this.klienci = [];
      this.cacheKey = 'jg:stan:' + roomId;
      this.wysylka = Promise.resolve();
      this.bezSzyfru = !this.o.lokalnie && !SUBTLE;
      this.szyfr = (!this.o.lokalnie && SUBTLE) ? przygotujSzyfr(roomId) : null;
      if (this.szyfr) this.szyfr.then(s => { this.base = PREFIX + s.temat + '/'; }).catch(() => { this.szyfr = null; this.bezSzyfru = true; this.status(); });
    }

    start(mojPid) {
      this.pid = mojPid || null;
      // 1. pamięć przeglądarki
      const snap = ls(this.cacheKey);
      if (snap && typeof snap === 'object') {
        for (const k of Object.keys(snap)) if (KLUCZ_OK.test(k)) this.przyjmij(k, snap[k], 'pamiec');
      }
      // 2. inne karty
      try {
        this.bc = new BroadcastChannel('jednoglosnie-' + this.id);
        this.bc.onmessage = (e) => this.zKarty(e.data);
        this.bc.postMessage({ t: 'hello' });
      } catch (e) { this.bc = null; }
      // 3. brokerzy (dopiero gdy gotowy klucz)
      if (this.szyfr) this.polacz();
      this.status();
    }

    async zaszyfruj(k, v) {
      const { klucz } = await this.szyfr;
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(await SUBTLE.encrypt({ name: 'AES-GCM', iv }, klucz, enc.encode(JSON.stringify({ k, v }))));
      const out = new Uint8Array(12 + ct.length);
      out.set(iv); out.set(ct, 12);
      return b64(out);
    }

    async odszyfruj(k, text) {
      const { klucz } = await this.szyfr;
      const u = zB64(text);
      if (u.length < 29) return null;
      const pt = await SUBTLE.decrypt({ name: 'AES-GCM', iv: u.subarray(0, 12) }, klucz, u.subarray(12));
      const m = JSON.parse(dec.decode(pt));
      return m && m.k === k ? m.v : null;
    }

    async polacz() {
      const gen = this.gen = (this.gen || 0) + 1;
      let will = null;
      try {
        await this.szyfr;
        if (this.pid) will = { topic: this.base + 'hb/' + this.pid, payload: await this.zaszyfruj('hb/' + this.pid, { off: 1 }), retain: false };
      } catch (e) { return; }
      if (this.zatrzymane || gen !== this.gen) return;
      for (const b of BROKERY) {
        const c = new MiniMqtt(b.url, {
          keepalive: 30,
          will,
          onMessage: (topic, text) => this.zBrokera(topic, text),
          onState: (s) => {
            if (s === 'ok') {
              // po (ponownym) połączeniu odświeżamy u brokera cały znany stan pokoju –
              // jeśli któryś broker zgubił wiadomości, każdy uczestnik je przywróci
              for (const [k, v] of this.dane) this.wyslij(k, v, [c]);
              // „jestem” + prośba o odpowiedź – inni od razu widzą nas na żywo, a my ich
              if (this.pid) this.wyslij('hb/' + this.pid, { ask: 1 }, [c], false);
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
      if (this.szyfr) {
        // ostatnia wola jest ustalana przy połączeniu – łączymy się ponownie z nową
        const stare = this.klienci;
        this.klienci = [];
        this.wysylka = this.wysylka.then(() => { for (const c of stare) c.end(); });
        this.polacz();
      }
    }

    /** Po powrocie do karty albo odzyskaniu internetu: sprawdź połączenia i wznów je od razu. */
    obudz() {
      for (const c of this.klienci) c.wake();
    }

    status() {
      const ok = this.klienci.filter(c => c.state === 'ok').length;
      if (this.o.onStatus) this.o.onStatus({ ok, razem: this.klienci.length, lokalnie: !!this.o.lokalnie, bezSzyfru: this.bezSzyfru });
    }

    zBrokera(topic, text) {
      if (!this.base || !topic.startsWith(this.base)) return;
      const k = topic.slice(this.base.length);
      if (!KLUCZ_OK.test(k) || !text || text.length > 300000) return;
      this.odszyfruj(k, text).then((v) => {
        if (!v || typeof v !== 'object' || this.zatrzymane) return;
        if (k.startsWith('hb/')) { if (this.o.onHb) this.o.onHb(k.slice(3), v); return; }
        this.przyjmij(k, v, 'broker');
      }).catch(() => { /* obca albo uszkodzona wiadomość – pomijamy */ });
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

    /** Szyfruje i wysyła do brokerów – po kolei, żeby starsza wersja nie wyprzedziła nowszej. */
    wyslij(k, v, klienci, retain) {
      if (!this.szyfr) return;
      const cel = klienci || this.klienci;
      if (!cel.length) return;
      this.wysylka = this.wysylka
        .then(() => this.zaszyfruj(k, v))
        .then((text) => { for (const c of cel) c.publish(this.base + k, text, retain !== false); })
        .catch(() => {});
    }

    /** Zapisuje klucz u siebie i rozsyła wszędzie. `tylkoTu` – nie wysyłaj (np. wirtualni znajomi). */
    put(k, v, tylkoTu) {
      const stare = this.dane.get(k);
      v.rev = Math.max(Date.now(), stare ? stare.rev + 1 : 0);
      this.dane.set(k, v);
      this.zapiszPamiec();
      if (tylkoTu) return v;
      if (this.bc) this.bc.postMessage({ t: 'put', k, v });
      this.wyslij(k, v);
      return v;
    }

    hb(v) {
      if (!this.pid) return;
      v = v || {};
      if (this.bc) this.bc.postMessage({ t: 'hb', pid: this.pid, v });
      this.wyslij('hb/' + this.pid, v, null, false);
    }

    stop() {
      try { this.hb({ off: 1 }); } catch (e) {}
      this.zatrzymane = true;
      const klienci = this.klienci;
      this.klienci = [];
      // najpierw niech wyjdzie wszystko z kolejki (np. zaproszenie do nowej rundy), potem rozłączamy
      this.wysylka.then(() => setTimeout(() => { for (const c of klienci) c.end(); }, 300));
      if (this.bc) { this.bc.close(); this.bc = null; }
      clearTimeout(this.tz);
      ls(this.cacheKey, Object.fromEntries(this.dane));
    }
  }

  Lacze.BROKERY = BROKERY;
  Lacze.KLUCZ_OK = KLUCZ_OK;
  global.Lacze = Lacze;
})(window);
