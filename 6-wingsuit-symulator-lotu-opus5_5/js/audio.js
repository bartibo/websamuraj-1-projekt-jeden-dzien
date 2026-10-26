/* Na Krawędzi – dźwięk syntezowany na żywo (Web Audio): wiatr, łopot kombinezonu, serce, wysokościomierz, pioruny */
(function (root) {
  'use strict';
  const WS = root.WS;
  const { clamp, lerp, smoothstep } = WS.U;

  class Audio {
    constructor() {
      this.ctx = null; this.enabled = WS.U.store.get('sound', true);
      this.hbT = 0; this.beepT = 0; this.queue = [];
    }

    start() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = this.ctx = new AC();
      this.master = c.createGain(); this.master.gain.value = this.enabled ? 0.9 : 0;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.master.connect(comp); comp.connect(c.destination);
      // bufory szumu
      const len = c.sampleRate * 3;
      const white = c.createBuffer(2, len, c.sampleRate), brown = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const w = white.getChannelData(ch), b = brown.getChannelData(ch);
        let last = 0;
        for (let i = 0; i < len; i++) {
          const r = Math.random() * 2 - 1;
          w[i] = r;
          last = (last + 0.02 * r) / 1.02; b[i] = last * 3.5;
        }
      }
      this.white = white; this.brown = brown;
      const loop = (buf) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * 2); return s; };

      // wiatr: pasmo środkowe
      this.windF = c.createBiquadFilter(); this.windF.type = 'bandpass'; this.windF.Q.value = 0.7; this.windF.frequency.value = 500;
      this.windG = c.createGain(); this.windG.gain.value = 0;
      this.windPan = c.createStereoPanner ? c.createStereoPanner() : null;
      loop(white).connect(this.windF); this.windF.connect(this.windG);
      if (this.windPan) { this.windG.connect(this.windPan); this.windPan.connect(this.master); } else this.windG.connect(this.master);
      // dudnienie
      this.rumF = c.createBiquadFilter(); this.rumF.type = 'lowpass'; this.rumF.frequency.value = 160;
      this.rumG = c.createGain(); this.rumG.gain.value = 0;
      loop(brown).connect(this.rumF); this.rumF.connect(this.rumG); this.rumG.connect(this.master);
      // syk
      this.hisF = c.createBiquadFilter(); this.hisF.type = 'highpass'; this.hisF.frequency.value = 3500;
      this.hisG = c.createGain(); this.hisG.gain.value = 0;
      loop(white).connect(this.hisF); this.hisF.connect(this.hisG); this.hisG.connect(this.master);
      // łopot materiału
      this.flF = c.createBiquadFilter(); this.flF.type = 'bandpass'; this.flF.frequency.value = 700; this.flF.Q.value = 1.4;
      this.flG = c.createGain(); this.flG.gain.value = 0;
      this.flDepth = c.createGain(); this.flDepth.gain.value = 0;
      this.flLfo = c.createOscillator(); this.flLfo.type = 'square'; this.flLfo.frequency.value = 22;
      this.flLfo.connect(this.flDepth); this.flDepth.connect(this.flG.gain); this.flLfo.start();
      loop(white).connect(this.flF); this.flF.connect(this.flG); this.flG.connect(this.master);
      // bliskość skał (szum odbity od ściany)
      this.prF = c.createBiquadFilter(); this.prF.type = 'bandpass'; this.prF.frequency.value = 1400; this.prF.Q.value = 2;
      this.prG = c.createGain(); this.prG.gain.value = 0;
      loop(white).connect(this.prF); this.prF.connect(this.prG); this.prG.connect(this.master);
      // deszcz
      this.rnF = c.createBiquadFilter(); this.rnF.type = 'highpass'; this.rnF.frequency.value = 900;
      this.rnG = c.createGain(); this.rnG.gain.value = 0;
      loop(white).connect(this.rnF); this.rnF.connect(this.rnG); this.rnG.connect(this.master);
      // napięcie: niski dron, otwiera się z adrenaliną
      this.drG = c.createGain(); this.drG.gain.value = 0;
      this.drF = c.createBiquadFilter(); this.drF.type = 'lowpass'; this.drF.frequency.value = 200; this.drF.Q.value = 3;
      for (const f of [55, 55.4, 82.6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(this.drF); o.start(); }
      this.drF.connect(this.drG); this.drG.connect(this.master);
    }

    setEnabled(on) {
      this.enabled = on; WS.U.store.set('sound', on);
      if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
    }

    _set(p, v, tc) { p.setTargetAtTime(v, this.ctx.currentTime, tc || 0.08); }

    // co klatkę
    update(dt, s) {
      if (!this.ctx) return;
      const sp = s.speed || 0; // m/s względem powietrza
      const fly = s.phase === 'flight';
      const ch = s.phase === 'chute';
      const k = clamp(sp / 70, 0, 1.8);
      const wv = (fly ? 1 : ch ? 0.25 : 0.12) * (0.08 + 0.55 * k * k);
      this._set(this.windG.gain, Math.min(0.9, wv + (s.ambientWind || 0) * 0.02));
      this._set(this.windF.frequency, 300 + sp * 22);
      if (this.windPan) this._set(this.windPan.pan, clamp(s.pan || 0, -0.8, 0.8), 0.2);
      this._set(this.rumG.gain, fly ? 0.25 * k * k : 0.03);
      this._set(this.hisG.gain, fly ? 0.06 * smoothstep(40, 100, sp) : 0);
      this._set(this.flG.gain, 0);
      this._set(this.flDepth.gain, fly ? 0.12 * smoothstep(30, 85, sp) : ch ? 0.05 : 0);
      this._set(this.flLfo.frequency, ch ? 9 : 16 + sp * 0.28);
      this._set(this.prG.gain, fly ? 0.5 * (s.prox || 0) * k : 0, 0.05);
      this._set(this.prF.frequency, 900 + sp * 18);
      this._set(this.rnG.gain, (s.rain || 0) * 0.12 * (0.5 + k * 0.5));
      const adr = s.adr || 0;
      this._set(this.drG.gain, s.music ? 0.05 + adr * 0.07 : 0, 0.5);
      this._set(this.drF.frequency, 120 + adr * 700, 0.3);
      // serce
      if (s.heart) {
        this.hbT -= dt;
        if (this.hbT <= 0) {
          const bpm = 70 + adr * 110;
          this.hbT = 60 / bpm;
          const v = 0.25 + adr * 0.55;
          this._thump(0, v); this._thump(0.13, v * 0.7);
        }
      }
      // wysokościomierz ostrzegawczy
      if (s.warn > 0) {
        this.beepT -= dt;
        if (this.beepT <= 0) { this.beepT = lerp(0.35, 0.08, s.warn); this._beep(2600, 0.06, 0.12); }
      } else this.beepT = 0;
    }

    _env(g, t0, a, peak, d) {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    }

    _thump(delay, v) {
      const c = this.ctx, t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.15);
      this._env(g, t, 0.01, v, 0.18);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.3);
    }

    _beep(f, d, v) {
      const c = this.ctx, t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'square'; o.frequency.value = f;
      this._env(g, t, 0.005, v, d);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + d + 0.05);
    }

    _noise(buf, t, dur, filt, f0, f1, peak, q) {
      const c = this.ctx;
      const s = c.createBufferSource(); s.buffer = buf;
      const f = c.createBiquadFilter(); f.type = filt; f.Q.value = q || 1;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = c.createGain();
      this._env(g, t, Math.min(0.05, dur * 0.2), peak, dur);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(t, Math.random()); s.stop(t + dur + 0.1);
    }

    play(name, p) {
      if (!this.ctx || !this.enabled) return;
      const c = this.ctx, t = c.currentTime;
      p = p || {};
      switch (name) {
        case 'gate': {
          [880, 1320, 1760].forEach((f, i) => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sine'; o.frequency.value = f * (p.pitch || 1);
            this._env(g, t + i * 0.05, 0.01, 0.16, 0.35);
            o.connect(g); g.connect(this.master); o.start(t + i * 0.05); o.stop(t + 0.6);
          });
          this._noise(this.white, t, 0.4, 'bandpass', 3000, 600, 0.25, 1.5);
          break;
        }
        case 'miss': this._beep(220, 0.25, 0.15); break;
        case 'whoosh': this._noise(this.white, t, 0.55, 'bandpass', 2400, 300, 0.5 * (p.v || 1), 1.2); break;
        case 'jump': this._noise(this.white, t, 1.2, 'bandpass', 300, 1500, 0.35, 0.8); break;
        case 'chute': {
          this._noise(this.white, t, 0.25, 'lowpass', 3000, 200, 0.9, 0.5);
          this._noise(this.brown, t + 0.05, 0.6, 'lowpass', 400, 80, 0.9, 0.7);
          for (let i = 0; i < 6; i++) this._noise(this.white, t + 0.3 + i * 0.12, 0.1, 'bandpass', 900, 500, 0.2, 2);
          break;
        }
        case 'land': this._noise(this.brown, t, 0.4, 'lowpass', 300, 60, 0.8, 0.7); break;
        case 'crash': {
          this._noise(this.brown, t, 1.2, 'lowpass', 800, 40, 1.4, 0.7);
          this._noise(this.white, t, 0.5, 'lowpass', 6000, 300, 0.9, 0.5);
          const o = c.createOscillator(), g = c.createGain();
          o.frequency.value = 3800;
          g.gain.setValueAtTime(0.0001, t + 0.3); g.gain.exponentialRampToValueAtTime(0.05, t + 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 5);
          o.connect(g); g.connect(this.master); o.start(t + 0.3); o.stop(t + 5.2);
          break;
        }
        case 'splash': this._noise(this.white, t, 1.2, 'lowpass', 5000, 400, 0.8, 0.6); break;
        case 'thunder': {
          const v = p.power || 1;
          this._noise(this.brown, t, 0.4, 'lowpass', 2500, 200, 0.7 * v, 0.6);
          this._noise(this.brown, t + 0.15, 3.5, 'lowpass', 500, 40, 1.0 * v, 0.6);
          break;
        }
        case 'bonus': {
          [523, 659, 784, 1046].forEach((f, i) => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'triangle'; o.frequency.value = f;
            this._env(g, t + i * 0.07, 0.01, 0.14, 0.4);
            o.connect(g); g.connect(this.master); o.start(t + i * 0.07); o.stop(t + 1);
          });
          break;
        }
        case 'click': this._beep(1200, 0.03, 0.05); break;
      }
    }

    // zdarzenia opóźnione (grzmot po błysku)
    schedule(name, delay, p) { this.queue.push({ name, t: delay, p }); }
    tick(dt) {
      for (let i = this.queue.length - 1; i >= 0; i--) {
        const q = this.queue[i];
        q.t -= dt;
        if (q.t <= 0) { this.play(q.name, q.p); this.queue.splice(i, 1); }
      }
    }
  }

  WS.Audio = Audio;
})(window);
