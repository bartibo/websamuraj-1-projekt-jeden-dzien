'use strict';
/* =====================================================================
   Dźwięk – całość syntezowana w Web Audio, bez plików
   ===================================================================== */
const AUDIO = {
  ctx: null, master: null, on: true, amb: null, heartT: 0,

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? 0.8 : 0;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  setOn(v) {
    this.on = v;
    if (this.master) this.master.gain.setTargetAtTime(v ? 0.8 : 0, this.ctx.currentTime, 0.05);
  },
  noiseBuf() {
    if (this._nb) return this._nb;
    const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (this._nb = b);
  },
  tone(freq, dur, { type = 'sine', vol = 0.15, at = 0, attack = 0.005, slide = 0 } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, { vol = 0.1, at = 0, freq = 1000, q = 1, type = 'bandpass', attack = 0.01, release } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + at, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf(); s.loop = true;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - (release || dur * 0.4)));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.05);
    return { f, g, t };
  },

  ambience() {
    const c = this.ctx; if (!c || this.amb) return;
    // szum klimatyzacji i serwerowni CPR
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf(); s.loop = true; f.type = 'lowpass'; f.frequency.value = 380; g.gain.value = 0.035;
    s.connect(f); f.connect(g); g.connect(this.master); s.start();
    const o = c.createOscillator(), og = c.createGain();
    o.type = 'sine'; o.frequency.value = 50; og.gain.value = 0.012;
    o.connect(og); og.connect(this.master); o.start();
    this.amb = { s, o, g, og };
  },

  play(name) {
    if (!this.ctx || !this.on) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    switch (name) {
      case 'ring':
        for (let k = 0; k < 2; k++) for (let i = 0; i < 10; i++) {
          this.tone(440, 0.05, { at: k * 0.6 + i * 0.05, vol: 0.07, type: 'square' });
          this.tone(480, 0.05, { at: k * 0.6 + i * 0.05 + 0.025, vol: 0.05, type: 'square' });
        }
        break;
      case 'in': this.tone(880, 0.09, { vol: 0.07 }); this.tone(1320, 0.12, { at: 0.07, vol: 0.05 }); break;
      case 'out': this.tone(520, 0.05, { vol: 0.05, type: 'triangle' }); break;
      case 'type': for (let i = 0; i < 4; i++) this.noise(0.02, { at: i * 0.11 + Math.random() * 0.04, vol: 0.02, freq: 3500, q: 3 }); break;
      case 'sys': this.tone(660, 0.06, { vol: 0.04, type: 'triangle' }); break;
      case 'clue': this.tone(740, 0.18, { vol: 0.06 }); this.tone(988, 0.25, { at: 0.09, vol: 0.05 }); this.tone(1480, 0.3, { at: 0.18, vol: 0.03 }); break;
      case 'alarm': for (let i = 0; i < 3; i++) this.tone(960, 0.14, { at: i * 0.22, vol: 0.09, type: 'sawtooth' }); break;
      case 'tick': this.tone(1200, 0.03, { vol: 0.03, type: 'square' }); break;
      case 'radio':
        this.noise(0.18, { vol: 0.09, freq: 1800, q: 0.7 });
        this.tone(1750, 0.05, { at: 0.16, vol: 0.03, type: 'square' });
        break;
      case 'train': {
        const n = this.noise(9, { vol: 0.12, freq: 90, q: 0.8, type: 'lowpass', attack: 3, release: 4 });
        for (let i = 0; i < 14; i++) { this.noise(0.08, { at: 2 + i * 0.42, vol: 0.05, freq: 160, q: 2 }); this.noise(0.08, { at: 2.2 + i * 0.42, vol: 0.04, freq: 140, q: 2 }); }
        break;
      }
      case 'bells':
        for (let i = 0; i < 12; i++) {
          const at = 0.3 + i * 1.6;
          this.tone(196, 2.6, { at, vol: 0.06 }); this.tone(196 * 2.41, 1.8, { at, vol: 0.03 });
          this.tone(196 * 3.01, 1.2, { at, vol: 0.02 }); this.tone(196 * 0.5, 2.8, { at, vol: 0.03 });
        }
        break;
      case 'steps': for (let i = 0; i < 7; i++) this.noise(0.12, { at: i * 0.55, vol: 0.12, freq: 120, q: 1.4, type: 'lowpass' }); break;
      case 'car': this.noise(3.5, { vol: 0.08, freq: 70, q: 1, type: 'lowpass', attack: 0.6, release: 2.4 });
        for (let i = 0; i < 18; i++) this.noise(0.04, { at: 0.3 + i * 0.12, vol: 0.03, freq: 220, q: 3 });
        break;
      case 'rain': this.noise(12, { vol: 0.03, freq: 5000, q: 0.3, attack: 4, release: 6 }); break;
      case 'flicker': for (let i = 0; i < 6; i++) this.noise(0.03, { at: i * 0.13 + Math.random() * 0.05, vol: 0.05, freq: 6000, q: 1 }); break;
      case 'pop': this.noise(0.05, { vol: 0.12, freq: 4000, q: 1 }); this.tone(1800, 0.15, { at: 0.02, vol: 0.03, slide: -1500 }); break;
      case 'heart': this.tone(60, 0.12, { vol: 0.18 }); this.tone(55, 0.12, { at: 0.18, vol: 0.12 }); break;
      case 'lost': this.tone(480, 0.4, { vol: 0.07, type: 'square' }); this.tone(480, 0.4, { at: 0.6, vol: 0.07, type: 'square' }); this.tone(480, 0.4, { at: 1.2, vol: 0.07, type: 'square' }); break;
      case 'siren':
        for (let i = 0; i < 4; i++) { this.tone(700, 0.5, { at: i * 1.0, vol: 0.03, slide: 500, type: 'triangle' }); this.tone(1200, 0.5, { at: i * 1.0 + 0.5, vol: 0.03, slide: -500, type: 'triangle' }); }
        break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.6, { at: i * 0.14, vol: 0.06 })); break;
      case 'bad': [392, 370, 311].forEach((f, i) => this.tone(f, 0.9, { at: i * 0.35, vol: 0.06, type: 'triangle' })); break;
    }
  },

  heartbeat(stress) {
    if (!this.ctx || !this.on || stress < 82) return;
    const now = performance.now();
    if (now - this.heartT > 1200 - (stress - 80) * 20) { this.heartT = now; this.play('heart'); }
  },
};
function sfx(n) { AUDIO.play(n); }
