/* Jednogłośnie – minimalny klient MQTT 3.1.1 po WebSocket.
   Obsługuje tylko to, czego potrzebuje aplikacja: CONNECT (z „ostatnią wolą”),
   SUBSCRIBE, PUBLISH QoS 0 (z flagą retain), PINGREQ i automatyczne wznawianie.
   Działa w przeglądarce i w Node 22+ (globalny WebSocket). */
(function (global) {
  'use strict';

  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function str(s) {
    const b = enc.encode(s);
    const out = new Uint8Array(b.length + 2);
    out[0] = b.length >> 8; out[1] = b.length & 255; out.set(b, 2);
    return out;
  }
  function concat(parts) {
    let n = 0; for (const p of parts) n += p.length;
    const out = new Uint8Array(n); let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }
  function packet(header, body) {
    const len = [];
    let x = body.length;
    do { let d = x % 128; x = Math.floor(x / 128); if (x > 0) d |= 128; len.push(d); } while (x > 0);
    return concat([Uint8Array.of(header, ...len), body]);
  }

  class MiniMqtt {
    /**
     * @param {string} url  np. wss://broker.emqx.io:8084/mqtt
     * @param {object} o    { clientId, keepalive, will:{topic,payload,retain}, onMessage(topic, text, retained), onState(state) }
     */
    constructor(url, o = {}) {
      this.url = url;
      this.o = o;
      this.clientId = o.clientId || ('jg' + Math.random().toString(36).slice(2, 12));
      this.keepalive = o.keepalive || 30;
      this.subs = new Set();
      this.queue = [];
      this.state = 'off';
      this.buf = new Uint8Array(0);
      this.retry = 0;
      this.stopped = false;
      this.pid = 1;
    }

    setState(s) {
      if (this.state === s) return;
      this.state = s;
      if (this.o.onState) this.o.onState(s, this);
    }

    connect() {
      this.stopped = false;
      this.setState('connecting');
      let ws;
      try { ws = new WebSocket(this.url, ['mqtt']); }
      catch (e) { this.scheduleReconnect(); return; }
      ws.binaryType = 'arraybuffer';
      this.ws = ws;
      const timeout = setTimeout(() => { if (this.state !== 'ok') { try { ws.close(); } catch (e) {} } }, 9000);
      ws.onopen = () => this.sendConnect();
      ws.onmessage = (e) => this.onData(new Uint8Array(e.data));
      ws.onerror = () => {};
      ws.onclose = () => {
        clearTimeout(timeout);
        clearInterval(this.ping);
        if (this.ws === ws) this.ws = null;
        if (!this.stopped) { this.setState('off'); this.scheduleReconnect(); }
      };
    }

    scheduleReconnect() {
      if (this.stopped) return;
      clearTimeout(this.rt);
      const delay = Math.min(15000, 800 * Math.pow(1.7, this.retry++)) + Math.random() * 500;
      this.rt = setTimeout(() => this.connect(), delay);
    }

    sendConnect() {
      const w = this.o.will;
      let flags = 0x02; // clean session
      if (w) { flags |= 0x04; if (w.retain) flags |= 0x20; }
      const vh = concat([str('MQTT'), Uint8Array.of(4, flags, this.keepalive >> 8, this.keepalive & 255)]);
      const parts = [vh, str(this.clientId)];
      if (w) { parts.push(str(w.topic)); parts.push(str(w.payload)); }
      this.raw(packet(0x10, concat(parts)));
    }

    raw(bytes) {
      if (this.ws && this.ws.readyState === 1) { this.ws.send(bytes); return true; }
      return false;
    }

    onData(chunk) {
      this.buf = this.buf.length ? concat([this.buf, chunk]) : chunk;
      for (;;) {
        const b = this.buf;
        if (b.length < 2) return;
        let mul = 1, len = 0, i = 1, byte;
        do {
          if (i >= b.length) return;
          byte = b[i++]; len += (byte & 127) * mul; mul *= 128;
        } while (byte & 128);
        if (b.length < i + len) return;
        const body = b.subarray(i, i + len);
        this.handle(b[0], body);
        this.buf = b.subarray(i + len);
      }
    }

    handle(h, body) {
      const type = h >> 4;
      if (type === 2) { // CONNACK
        if (body[1] === 0) {
          this.retry = 0;
          this.setState('ok');
          clearInterval(this.ping);
          this.ping = setInterval(() => this.raw(Uint8Array.of(0xC0, 0)), (this.keepalive * 1000) * 0.6);
          for (const t of this.subs) this.sendSub(t);
          const q = this.queue; this.queue = [];
          for (const p of q) this.raw(p);
        } else {
          this.setState('refused');
          try { this.ws.close(); } catch (e) {}
        }
      } else if (type === 3) { // PUBLISH
        const qos = (h >> 1) & 3;
        const retained = !!(h & 1);
        const tl = (body[0] << 8) | body[1];
        const topic = dec.decode(body.subarray(2, 2 + tl));
        let o = 2 + tl;
        if (qos > 0) o += 2;
        const text = dec.decode(body.subarray(o));
        if (this.o.onMessage) {
          try { this.o.onMessage(topic, text, retained); } catch (e) { console.error(e); }
        }
      }
      // SUBACK (9), PINGRESP (13) – nic do roboty
    }

    sendSub(topic) {
      const id = (this.pid++ % 65535) + 1;
      this.raw(packet(0x82, concat([Uint8Array.of(id >> 8, id & 255), str(topic), Uint8Array.of(0)])));
    }

    subscribe(topic) {
      this.subs.add(topic);
      if (this.state === 'ok') this.sendSub(topic);
    }

    publish(topic, text, retain) {
      const p = packet(0x30 | (retain ? 1 : 0), concat([str(topic), enc.encode(text)]));
      if (this.state === 'ok' && this.raw(p)) return;
      // trzymamy w kolejce do połączenia; z tej samej wiadomości wystarczy ostatnia wersja
      this.queue = this.queue.filter(q => !q._t || q._t !== topic);
      p._t = topic;
      this.queue.push(p);
      if (this.queue.length > 200) this.queue.shift();
    }

    end() {
      this.stopped = true;
      clearTimeout(this.rt);
      clearInterval(this.ping);
      if (this.ws) {
        this.raw(Uint8Array.of(0xE0, 0));
        try { this.ws.close(); } catch (e) {}
      }
      this.setState('off');
    }
  }

  global.MiniMqtt = MiniMqtt;
})(typeof window !== 'undefined' ? window : globalThis);
