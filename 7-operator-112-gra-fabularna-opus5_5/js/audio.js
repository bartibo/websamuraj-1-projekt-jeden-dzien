'use strict';
/* =====================================================================
   Dźwięk – całość syntezowana w Web Audio, bez plików
   ===================================================================== */
const AUDIO = {
  ctx: null, master: null, on: true, amb: null, mus: null, heartT: 0,

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
      case 'pa': // stary głośnik: trzask, gong, szum pod głosem
        this.noise(0.25, { vol: 0.08, freq: 2500, q: 0.6 });
        this.tone(660, 0.9, { at: 0.25, vol: 0.05, type: 'triangle' }); this.tone(523, 1.2, { at: 0.75, vol: 0.05, type: 'triangle' });
        this.noise(2.6, { at: 1.6, vol: 0.025, freq: 1400, q: 0.8, attack: 0.1, release: 0.6 });
        this.tone(100, 2.6, { at: 1.6, vol: 0.02, type: 'sawtooth' });
        break;
      case 'generator':
        this.noise(5, { vol: 0.07, freq: 80, q: 1.2, type: 'lowpass', attack: 1.2, release: 2 });
        for (let i = 0; i < 40; i++) this.noise(0.05, { at: 0.8 + i * 0.1, vol: 0.025, freq: 120, q: 4 });
        break;
      case 'handle': for (let i = 0; i < 3; i++) { this.noise(0.08, { at: i * 0.35, vol: 0.09, freq: 2600, q: 5 }); this.tone(1900, 0.06, { at: i * 0.35 + 0.02, vol: 0.03, type: 'square' }); } break;
      case 'scream': this.tone(900, 1.6, { vol: 0.03, type: 'sawtooth', slide: -500, attack: 0.3 }); this.noise(1.6, { vol: 0.02, freq: 900, q: 6, attack: 0.3 }); break;
      case 'knock': for (const at of [0, 0.3, 0.6, 1.5, 1.8, 2.1]) this.noise(0.07, { at, vol: 0.14, freq: 160, q: 2, type: 'lowpass' }); break;
      case 'buzz': for (let k = 0; k < 2; k++) this.tone(170, 0.38, { at: k * 0.55, vol: 0.09, type: 'sawtooth', attack: 0.02 }); break;
      case 'link': [440, 660, 880].forEach((f, i) => this.tone(f, 0.22, { at: i * 0.07, vol: 0.05, type: 'triangle' })); break;
      case 'ui_move': this.tone(2400, 0.03, { vol: 0.016, type: 'triangle' }); this.noise(0.02, { vol: 0.012, freq: 5200, q: 2 }); break;
      case 'ui_ok': this.tone(330, 0.2, { vol: 0.06, type: 'triangle' }); this.tone(660, 0.28, { at: 0.05, vol: 0.035 }); break;
      case 'ui_back': this.tone(520, 0.14, { vol: 0.04, type: 'triangle', slide: -180 }); break;
      case 'whoosh': { const n = this.noise(0.6, { vol: 0.05, freq: 300, q: 1.4, attack: 0.25, release: 0.35 }); if (n) n.f.frequency.exponentialRampToValueAtTime(3200, n.t + 0.55); break; }
      case 'braam': { // uderzenie przy wejściu do menu
        const c = this.ctx, t = c.currentTime, f = c.createBiquadFilter(), g = c.createGain();
        f.type = 'lowpass'; f.Q.value = 2; f.frequency.setValueAtTime(1100, t); f.frequency.exponentialRampToValueAtTime(110, t + 3);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
        f.connect(g); g.connect(this.master);
        [55, 55.4, 82.4, 110].forEach(fr => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(t); o.stop(t + 3.7); });
        this.tone(41, 2.6, { vol: 0.2 });
        this.noise(1.2, { vol: 0.05, freq: 300, q: 0.6, type: 'lowpass', release: 1.1 });
        break;
      }
      case 'win': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.6, { at: i * 0.14, vol: 0.06 })); break;
      case 'bad': [392, 370, 311].forEach((f, i) => this.tone(f, 0.9, { at: i * 0.35, vol: 0.06, type: 'triangle' })); break;
    }
  },

  /* muzyka menu: deszcz za oknem, niski dron, rzadkie dźwięki pianina z echem i radio dyspozytorskie w tle */
  menuMusic(on) {
    const c = this.ctx;
    if (!on) {
      if (!this.mus) return;
      const m = this.mus; this.mus = null;
      m.timers.forEach(clearTimeout);
      m.g.gain.setTargetAtTime(0, c.currentTime, 0.3);
      setTimeout(() => { m.nodes.forEach(n => { try { n.stop(); } catch (e) { } }); m.g.disconnect(); }, 2000);
      return;
    }
    if (!c || this.mus) return;
    if (c.state === 'suspended') c.resume();
    const g = c.createGain(), m = this.mus = { g, nodes: [], timers: [] };
    g.gain.value = 0; g.gain.setTargetAtTime(1, c.currentTime, 1.2); g.connect(this.master);
    // deszcz
    const rain = c.createBufferSource(), hp = c.createBiquadFilter(), lp = c.createBiquadFilter(), rg = c.createGain();
    rain.buffer = this.noiseBuf(); rain.loop = true; hp.type = 'highpass'; hp.frequency.value = 700; lp.type = 'lowpass'; lp.frequency.value = 5200; rg.gain.value = 0.04;
    rain.connect(hp); hp.connect(lp); lp.connect(rg); rg.connect(g); rain.start(); m.nodes.push(rain);
    // dron z wolno otwieranym filtrem
    const df = c.createBiquadFilter(), dg = c.createGain();
    df.type = 'lowpass'; df.frequency.value = 240; df.Q.value = 3; dg.gain.value = 0.035; df.connect(dg); dg.connect(g);
    [55, 55.35, 82.4].forEach((f, i) => { const o = c.createOscillator(); o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.connect(df); o.start(); m.nodes.push(o); });
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.04; lg.gain.value = 110; lfo.connect(lg); lg.connect(df.frequency); lfo.start(); m.nodes.push(lfo);
    // echo dla pianina i radia
    const bus = c.createGain(), dl = c.createDelay(1), fb = c.createGain(), dlf = c.createBiquadFilter();
    dl.delayTime.value = 0.42; fb.gain.value = 0.38; dlf.type = 'lowpass'; dlf.frequency.value = 2200;
    bus.connect(g); bus.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(g);
    const note = (f, at = 0, vol = 0.045) => {
      const t = c.currentTime + at, o = c.createOscillator(), o2 = c.createOscillator(), ng = c.createGain(), h = c.createGain();
      o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f * 2.001; h.gain.value = 0.25;
      ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(vol, t + 0.01); ng.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      o.connect(ng); o2.connect(h); h.connect(ng); ng.connect(bus); o.start(t); o2.start(t); o.stop(t + 3.3); o2.stop(t + 3.3);
    };
    const pad = fs => fs.forEach(f => {
      const t = c.currentTime, o = c.createOscillator(), pf = c.createBiquadFilter(), pg = c.createGain();
      o.type = 'triangle'; o.frequency.value = f; pf.type = 'lowpass'; pf.frequency.value = 700;
      pg.gain.setValueAtTime(0, t); pg.gain.linearRampToValueAtTime(0.013, t + 3); pg.gain.linearRampToValueAtTime(0.0001, t + 9);
      o.connect(pf); pf.connect(pg); pg.connect(g); o.start(t); o.stop(t + 9.2);
    });
    const SCALE = [220, 261.6, 329.6, 392, 440, 493.9, 659.3];
    const CHORDS = [[110, 164.8, 261.6], [87.3, 130.8, 220], [73.4, 110, 174.6], [82.4, 123.5, 207.7]];
    let ci = 0;
    const loop = (fn, min, max, first) => {
      const run = () => { if (this.mus !== m) return; fn(); m.timers.push(setTimeout(run, (min + Math.random() * (max - min)) * 1000)); };
      m.timers.push(setTimeout(run, first * 1000));
    };
    loop(() => pad(CHORDS[ci++ % CHORDS.length]), 8, 8, 0.2);
    loop(() => { note(SCALE[Math.floor(Math.random() * SCALE.length)]); if (Math.random() < 0.35) note(SCALE[Math.floor(Math.random() * 4)], 0.5, 0.03); }, 2.2, 5, 2.5);
    loop(() => this.radioChatter(bus), 14, 26, 7);
  },

  /* trzask radiostacji i niewyraźny głos dyspozytora */
  radioChatter(dest) {
    const c = this.ctx, t0 = c.currentTime;
    const burst = (at, dur, vol, freq, q) => {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), gg = c.createGain(), t = t0 + at;
      s.buffer = this.noiseBuf(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      gg.gain.setValueAtTime(0, t); gg.gain.linearRampToValueAtTime(vol, t + 0.01); gg.gain.setValueAtTime(vol, t + dur - 0.02); gg.gain.linearRampToValueAtTime(0, t + dur);
      s.connect(f); f.connect(gg); gg.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    };
    burst(0, 0.12, 0.03, 2200, 0.8);
    let at = 0.15;
    for (let i = 0, n = 6 + Math.floor(Math.random() * 8); i < n; i++) { const d = 0.06 + Math.random() * 0.16; burst(at, d, 0.016 + Math.random() * 0.012, 600 + Math.random() * 900, 4); at += d + Math.random() * 0.06; }
    burst(at + 0.02, 0.18, 0.026, 2000, 0.8);
    const o = c.createOscillator(), og = c.createGain(), t = t0 + at + 0.22;
    o.type = 'square'; o.frequency.value = 1750; og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(0.007, t + 0.01); og.gain.linearRampToValueAtTime(0, t + 0.1);
    o.connect(og); og.connect(dest); o.start(t); o.stop(t + 0.15);
  },

  heartbeat(stress) {
    if (!this.ctx || !this.on || stress < 82) return;
    const now = performance.now();
    if (now - this.heartT > 1200 - (stress - 80) * 20) { this.heartT = now; this.play('heart'); }
  },
};
function sfx(n) { AUDIO.play(n); }
