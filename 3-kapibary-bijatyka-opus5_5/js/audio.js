'use strict';
/* Dźwięk syntezowany na żywo (Web Audio): efekty, muzyka i komentator (synteza mowy). */

const Sfx = {
  ctx: null, master: null, sfxGain: null, musGain: null, noiseBuf: null,
  enabled: Store.get('sfx', true),
  muted: false,      // wyciszenie na czas walki pokazowej w tle menu
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp).connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.enabled ? 0.9 : 0;
    this.sfxGain.connect(this.master);
    this.musGain = this.ctx.createGain();
    this.musGain.gain.value = Music.enabled ? 0.42 : 0;
    this.duck = this.ctx.createGain();      // przyciszanie muzyki, gdy mówi komentator
    this.musGain.connect(this.duck).connect(this.master);
    this.voGain = this.ctx.createGain();
    this.voGain.gain.value = 1;
    this.voGain.connect(this.master);
    const len = this.ctx.sampleRate * 1.5;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // echo do efektów specjalnych
    this.echo = this.ctx.createDelay(1);
    this.echo.delayTime.value = 0.16;
    const fb = this.ctx.createGain(); fb.gain.value = 0.32;
    const echoOut = this.ctx.createGain(); echoOut.gain.value = 0.35;
    this.echo.connect(fb).connect(this.echo);
    this.echo.connect(echoOut).connect(this.sfxGain);
    Rec.load();
    if (Music.pending) Music.play(Music.pending);
  },
  setEnabled(on) {
    this.enabled = on; Store.set('sfx', on);
    if (this.sfxGain) this.sfxGain.gain.value = on ? 0.9 : 0;
  },

  // ---------- klocki ----------
  env(g, t, a, peak, d, end = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(end, t + a + d);
  },
  osc(type, f0, f1, dur, vol, out, t = this.ctx.currentTime, attack = 0.004) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    this.env(g, t, attack, vol, dur);
    o.connect(g).connect(out || this.sfxGain);
    o.start(t); o.stop(t + dur + attack + 0.05);
    return o;
  },
  noise(dur, vol, ftype, f0, f1, q = 1, out, t = this.ctx.currentTime, attack = 0.003) {
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = this.noiseBuf;
    s.loop = true;
    f.type = ftype; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this.env(g, t, attack, vol, dur);
    s.connect(f).connect(g).connect(out || this.sfxGain);
    s.start(t, Math.random()); s.stop(t + dur + attack + 0.05);
  },

  // Pisk kapibary (one naprawdę tak „gwiżdżą”)
  squeak(pitch = 1, len = 0.14, vol = 0.18) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
    o.type = 'triangle';
    const f = 900 * pitch;
    o.frequency.setValueAtTime(f * 0.8, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.45, t + len * 0.4);
    o.frequency.exponentialRampToValueAtTime(f * 1.05, t + len);
    lfo.frequency.value = 38; lg.gain.value = f * 0.06;
    lfo.connect(lg).connect(o.frequency);
    this.env(g, t, 0.01, vol, len);
    o.connect(g).connect(this.sfxGain);
    o.start(t); lfo.start(t); o.stop(t + len + 0.05); lfo.stop(t + len + 0.05);
  },

  ok() { return this.ctx && this.enabled && !this.muted; },

  play(name, p = 1) {
    if (!this.ok()) return;
    // nagrany efekt z ElevenLabs, jeśli jest w paczce; synteza zostaje jako zapas
    if (REC_SFX.has(name) && Rec.play(name, this.sfxGain, 1, rand(0.94, 1.06))) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'swingL': this.noise(0.1, 0.16, 'bandpass', 2200 * p, 700, 1.2); break;
      case 'swingH': this.noise(0.2, 0.24, 'bandpass', 1500 * p, 380, 1.1); break;
      case 'hitL':
        this.osc('sine', 220, 70, 0.1, 0.5);
        this.noise(0.07, 0.4, 'lowpass', 3200, 600, 0.8); break;
      case 'hitM':
        this.osc('sine', 180, 50, 0.16, 0.65);
        this.noise(0.12, 0.5, 'lowpass', 2800, 300, 0.9);
        this.osc('square', 90, 40, 0.06, 0.12); break;
      case 'hitH':
        this.osc('sine', 150, 38, 0.3, 0.85);
        this.noise(0.22, 0.65, 'lowpass', 2400, 160, 1);
        this.osc('sawtooth', 70, 30, 0.18, 0.18);
        this.noise(0.05, 0.4, 'highpass', 3000, 3000, 0.7); break;
      case 'block':
        this.osc('square', 1300, 900, 0.05, 0.12);
        this.noise(0.08, 0.3, 'bandpass', 4200, 2500, 4); break;
      case 'counter':
        this.osc('triangle', 1568, 1568, 0.25, 0.18);
        this.osc('triangle', 2093, 2093, 0.3, 0.12, null, t + 0.06); break;
      case 'jump': this.noise(0.12, 0.12, 'bandpass', 600, 1600, 1); break;
      case 'land': this.osc('sine', 120, 60, 0.08, 0.25); this.noise(0.08, 0.12, 'lowpass', 700, 200); break;
      case 'dash': this.noise(0.18, 0.2, 'bandpass', 900, 2600, 0.9); break;
      case 'fall':
        this.osc('sine', 110, 35, 0.35, 0.7);
        this.noise(0.3, 0.45, 'lowpass', 1200, 90, 0.7); break;
      case 'throwOrange':
        this.noise(0.25, 0.22, 'bandpass', 800, 2400, 1.2);
        this.osc('triangle', 660, 990, 0.12, 0.12); break;
      case 'splash':
        this.noise(0.45, 0.4, 'bandpass', 1400, 500, 0.7);
        this.noise(0.25, 0.25, 'highpass', 4000, 2000, 0.5, null, t + 0.05);
        for (let i = 0; i < 4; i++) this.osc('sine', rand(600, 1300), rand(1400, 2200), 0.05, 0.06, null, t + 0.04 * i + rand(0, 0.08)); break;
      case 'bubble': this.osc('sine', rand(400, 700), rand(1100, 1500), 0.06, 0.08); break;
      case 'shuriken':
        this.noise(0.18, 0.18, 'bandpass', 5000, 2500, 3);
        this.osc('triangle', 2400, 1800, 0.1, 0.05); break;
      case 'grab': this.osc('sine', 200, 120, 0.1, 0.4); this.noise(0.06, 0.25, 'lowpass', 1500, 400); break;
      case 'slam':
        this.osc('sine', 120, 28, 0.6, 0.95);
        this.noise(0.5, 0.7, 'lowpass', 1600, 60, 0.8);
        this.osc('sawtooth', 55, 30, 0.4, 0.2); break;
      case 'spin': this.noise(0.35, 0.18, 'bandpass', 700, 2200, 2); break;
      case 'teleport':
        this.osc('sine', 300, 1800, 0.25, 0.15);
        this.noise(0.25, 0.12, 'highpass', 2000, 6000, 1); break;
      case 'super':
        this.osc('sawtooth', 110, 880, 0.7, 0.18, this.echo);
        this.osc('square', 220, 1760, 0.7, 0.08);
        this.noise(0.7, 0.2, 'bandpass', 400, 5000, 2); break;
      case 'superHit':
        this.osc('sine', 100, 30, 0.6, 0.9);
        this.noise(0.4, 0.6, 'lowpass', 3500, 200, 0.8);
        this.osc('triangle', 880, 440, 0.4, 0.15, this.echo); break;
      case 'ko':
        this.osc('sine', 90, 25, 1.4, 1);
        this.noise(1.2, 0.6, 'lowpass', 2200, 50, 0.6);
        this.osc('sawtooth', 220, 55, 1, 0.2, this.echo); break;
      case 'gong':
        [196, 247, 294, 392].forEach((f, i) => this.osc('sine', f, f * 0.995, 1.6, 0.16 - i * 0.025, this.echo));
        this.noise(0.4, 0.15, 'bandpass', 900, 600, 3); break;
      case 'select': this.osc('square', 660, 660, 0.05, 0.08); break;
      case 'move': this.osc('triangle', 520, 520, 0.04, 0.08); break;
      case 'confirm':
        this.osc('square', 523, 523, 0.07, 0.09);
        this.osc('square', 784, 784, 0.12, 0.09, null, t + 0.07); break;
      case 'back': this.osc('square', 392, 262, 0.1, 0.08); break;
      case 'tech': this.osc('triangle', 1200, 600, 0.15, 0.2); this.noise(0.1, 0.2, 'highpass', 3000, 3000); break;
      case 'breaker':
        this.osc('sawtooth', 300, 1200, 0.3, 0.2, this.echo);
        this.noise(0.4, 0.4, 'bandpass', 600, 3000, 1); break;
      case 'twinkle':
        [1568, 2093, 2637, 3136].forEach((f, i) => this.osc('triangle', f, f, 0.25, 0.08, this.echo, t + i * 0.07)); break;
      case 'pop': this.osc('sine', 500, 1200, 0.06, 0.2); break;
      case 'steam': this.noise(0.9, 0.12, 'highpass', 3000, 5000, 0.5); break;
      case 'fanfare':
        [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.4]].forEach(([f, d]) => {
          this.osc('square', f, f, 0.25, 0.08, null, t + d);
          this.osc('triangle', f / 2, f / 2, 0.3, 0.1, null, t + d);
        }); break;
      case 'heart': this.osc('sine', 880, 1320, 0.15, 0.1); break;
      case 'chomp': this.osc('square', 180, 90, 0.08, 0.12); this.noise(0.06, 0.2, 'lowpass', 2000, 800); break;
      case 'whistle': this.osc('sine', 1200, 300, 0.9, 0.15); break;
      case 'armor': this.osc('square', 220, 180, 0.12, 0.15); this.osc('triangle', 1760, 1500, 0.2, 0.06); break;
    }
  },
};

// ---------------- Muzyka generowana na żywo ----------------
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);

const TRACKS = {
  // Bossa nova znad brazylijskich bagien
  pantanal: {
    bpm: 112, swing: 0.1,
    kick: 'x.....x.x.....x.', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', rim: 'x..x..x...x..x..',
    chords: [[57, 60, 64, 67], [62, 66, 69, 72], [55, 59, 62, 66], [52, 55, 59, 62]],
    bass: [[45, 52], [50, 57], [43, 50], [40, 47]],
    scale: [57, 60, 62, 64, 67, 69, 72, 74, 76, 79], lead: 'marimba', leadDensity: 0.42, pad: 0.05,
  },
  // Gorące źródła nocą: koto i taiko
  onsen: {
    bpm: 92, swing: 0,
    kick: 'x.......x.....x.', snare: '', hat: '..x...x...x...x.', taiko: 'x.......x.x.....',
    chords: [[52, 57, 59, 64], [53, 57, 60, 64], [52, 57, 59, 64], [50, 53, 57, 60]],
    bass: [[40, 47], [41, 48], [40, 47], [38, 45]],
    scale: [64, 65, 69, 71, 72, 76, 77, 81], lead: 'koto', leadDensity: 0.3, pad: 0.07,
  },
  // Dojo w bambusach: szybko i bojowo
  dojo: {
    bpm: 146, swing: 0,
    kick: 'x...x...x...x.x.', snare: '....x.......x..x', hat: 'xxxxxxxxxxxxxxxx', taiko: 'x..x..x...x.x...',
    chords: [[50, 53, 57, 60], [48, 52, 55, 58], [46, 50, 53, 57], [48, 52, 55, 60]],
    bass: [[38, 38], [36, 36], [34, 34], [36, 43]],
    scale: [62, 65, 67, 69, 72, 74, 77, 79], lead: 'koto', leadDensity: 0.55, pad: 0.04,
  },
  menu: {
    bpm: 96, swing: 0.12,
    kick: 'x.......x..x....', snare: '....x.......x...', hat: '..x...x...x...x.', rim: '...x.....x......',
    chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [55, 59, 62, 65]],
    bass: [[41, 48], [40, 47], [38, 45], [43, 50]],
    scale: [65, 67, 69, 72, 74, 76, 77, 79], lead: 'marimba', leadDensity: 0.3, pad: 0.06,
  },
  victory: {
    bpm: 128, swing: 0.05,
    kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', rim: '',
    chords: [[60, 64, 67, 72], [65, 69, 72, 77], [67, 71, 74, 79], [60, 64, 67, 72]],
    bass: [[48, 55], [53, 60], [55, 62], [48, 55]],
    scale: [72, 74, 76, 79, 81, 84], lead: 'marimba', leadDensity: 0.6, pad: 0.06,
  },
};

const Music = {
  enabled: Store.get('music', true),
  track: null, pending: null, timer: null, step: 0, nextT: 0, rng: Math.random,
  setEnabled(on) {
    this.enabled = on; Store.set('music', on);
    if (Sfx.musGain) Sfx.musGain.gain.value = on ? 0.42 : 0;
  },
  play(name) {
    if (!Sfx.ctx) { this.pending = name; return; }
    if (this.track === TRACKS[name] && this.timer) return;
    this.stop();
    this.track = TRACKS[name];
    this.name = name;
    this.step = 0;
    this.rng = mulberry32(name.length * 977 + 13);
    this.nextT = Sfx.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
  },
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; this.track = null; },
  // pauza walki: muzyka milknie, po wznowieniu wraca utwór areny
  setPaused(p) {
    if (p) { this.resumeName = this.name; this.stop(); }
    else if (this.resumeName) this.play(this.resumeName);
  },
  schedule() {
    const tr = this.track; if (!tr) return;
    const ctx = Sfx.ctx;
    const stepDur = 60 / tr.bpm / 4;
    while (this.nextT < ctx.currentTime + 0.12) {
      const s = this.step % 16, bar = Math.floor(this.step / 16) % 4;
      const t = this.nextT + (s % 2 === 1 ? tr.swing * stepDur : 0);
      this.voice(tr, s, bar, t, stepDur);
      this.nextT += stepDur;
      this.step++;
    }
  },
  voice(tr, s, bar, t, sd) {
    const out = Sfx.musGain, S = Sfx;
    const on = (pat) => pat && pat[s] === 'x';
    if (on(tr.kick)) { S.osc('sine', 140, 42, 0.28, 0.75, out, t, 0.002); }
    if (on(tr.snare)) { S.noise(0.13, 0.28, 'bandpass', 1900, 1400, 0.8, out, t); S.osc('triangle', 200, 140, 0.08, 0.18, out, t); }
    if (on(tr.hat)) S.noise(0.035, s % 4 === 2 ? 0.1 : 0.06, 'highpass', 8000, 8000, 0.7, out, t);
    if (on(tr.rim)) S.osc('triangle', 1750, 1700, 0.035, 0.1, out, t);
    if (on(tr.taiko)) { S.osc('sine', 82, 46, 0.55, 0.85, out, t); S.noise(0.12, 0.25, 'lowpass', 500, 120, 0.7, out, t); }
    const chord = tr.chords[bar], bass = tr.bass[bar];
    // bas
    if (s === 0 || s === 6 || s === 8 || s === 14) {
      const n = (s === 6 || s === 14) ? bass[1] : bass[0];
      this.bassNote(NOTE(n), t, sd * (s === 0 ? 5 : 2), out);
    }
    // akordy
    if (s === 0) chord.forEach(n => this.padNote(NOTE(n), t, sd * 15, tr.pad, out));
    if (tr.lead === 'marimba' && (s === 3 || s === 10)) chord.slice(1).forEach(n => S.osc('sine', NOTE(n + 12), NOTE(n + 12), 0.12, 0.035, out, t));
    // melodia generatywna
    if (this.rng() < tr.leadDensity && (s % 2 === 0 || this.rng() < 0.3)) {
      const n = tr.scale[Math.floor(this.rng() * tr.scale.length)];
      if (tr.lead === 'marimba') {
        S.osc('sine', NOTE(n), NOTE(n), 0.22, 0.09, out, t);
        S.osc('sine', NOTE(n) * 4, NOTE(n) * 4, 0.05, 0.02, out, t);
      } else {
        this.koto(NOTE(n), t, out);
      }
    }
  },
  bassNote(f, t, dur, out) {
    const ctx = Sfx.ctx, o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f;
    fl.type = 'lowpass'; fl.frequency.value = 420; fl.Q.value = 2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl).connect(g).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  },
  padNote(f, t, dur, vol, out) {
    const ctx = Sfx.ctx, g = ctx.createGain(), fl = ctx.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 1000;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fl.connect(g).connect(out);
    [-6, 6].forEach(det => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      o.connect(fl); o.start(t); o.stop(t + dur + 0.05);
    });
  },
  koto(f, t, out) {
    const ctx = Sfx.ctx, o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f;
    fl.type = 'lowpass'; fl.Q.value = 3;
    fl.frequency.setValueAtTime(f * 6, t);
    fl.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    o.connect(fl).connect(g).connect(out);
    o.start(t); o.stop(t + 0.75);
  },
};

// ---------------- Nagrania z ElevenLabs ----------------
// Paczka audio/dzwieki.js (window.KAPI_DZWIEKI: nazwa → mp3 w base64) ładuje się po starcie strony.
// Warianty jednej kwestii mają końcówkę _1, _2…; grupa to nazwa bez końcówki.
const REC_SFX = new Set(['hitL', 'hitM', 'hitH', 'block', 'swingL', 'swingH', 'fall', 'ko', 'gong', 'slam', 'splash',
  'super', 'teleport', 'counter']);

const Rec = {
  buf: {}, groups: {}, last: {}, loading: false,
  load() {
    const src = window.KAPI_DZWIEKI;
    if (!src || !Sfx.ctx || this.loading) return;
    this.loading = true;
    for (const [key, b64] of Object.entries(src)) {
      const bin = atob(b64), u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      Sfx.ctx.decodeAudioData(u.buffer).then(b => {
        this.buf[key] = b;
        const g = key.replace(/_\d+$/, '');
        if (g !== key) (this.groups[g] = this.groups[g] || []).push(key);
      }).catch(() => {});
    }
    window.KAPI_DZWIEKI = null;
  },
  // losowy wariant z grupy, bez powtórzenia poprzedniego
  pick(name) {
    const list = this.groups[name];
    if (!list) return this.buf[name] ? name : null;
    if (list.length === 1) return list[0];
    let k;
    do k = pick(list); while (k === this.last[name]);
    return (this.last[name] = k);
  },
  has(name) { return !!this.pick(name); },
  // zwraca źródło dźwięku albo null, gdy nagrania nie ma
  play(name, out, vol = 1, rate = 1) {
    const key = this.pick(name);
    if (!key || !Sfx.ctx) return null;
    const s = Sfx.ctx.createBufferSource(), g = Sfx.ctx.createGain();
    s.buffer = this.buf[key]; s.playbackRate.value = rate; g.gain.value = vol;
    s.connect(g).connect(out);
    s.start();
    return s;
  },
};

// ---------------- Komentator ----------------
// Kwestie nagrane lektorem (kom_*); gdy nagrania brak, mówi synteza mowy przeglądarki.
const Voice = {
  enabled: Store.get('voice', true),
  voice: null, src: null,
  init() {
    if (!('speechSynthesis' in window)) return;
    const pickVoice = () => {
      const vs = speechSynthesis.getVoices();
      this.voice = vs.find(v => /^pl/i.test(v.lang) && /male|krzysztof|adam|marek/i.test(v.name))
        || vs.find(v => /^pl/i.test(v.lang)) || null;
    };
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  },
  setEnabled(on) { this.enabled = on; Store.set('voice', on); },
  speaking() { return !!this.src; },
  stop() {
    if (this.src) { try { this.src.stop(); } catch (e) { /* już skończone */ } this.src = null; }
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    this.unduck();
  },
  unduck() { if (Sfx.duck) Sfx.duck.gain.setTargetAtTime(1, Sfx.ctx.currentTime, 0.25); },
  // key – nazwa nagrania bez „kom_”, text – to samo dla syntezy mowy
  line(key, text, opts = {}) {
    if (!this.enabled || Sfx.muted) return;
    if (opts.ifQuiet && this.speaking()) return;
    if (Sfx.ctx && Rec.has('kom_' + key)) {
      this.stop();
      const s = Rec.play('kom_' + key, Sfx.voGain, 1.1);
      if (!s) return;
      this.src = s;
      Sfx.duck.gain.setTargetAtTime(0.45, Sfx.ctx.currentTime, 0.04);
      s.onended = () => {
        if (this.src !== s) return;
        this.src = null; this.unduck();
        if (opts.then) this.line(opts.then);
      };
      return;
    }
    // synteza mowy tylko wtedy, gdy paczki nagrań nie ma (a nie gdy jeszcze się dekoduje)
    if (text && !Rec.loading && !window.KAPI_DZWIEKI) this.say(text, opts.pitch, opts.rate);
  },
  say(text, pitch = 0.6, rate = 1.05) {
    if (!this.enabled || Sfx.muted || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pl-PL';
      if (this.voice) u.voice = this.voice;
      u.pitch = pitch; u.rate = rate; u.volume = 1;
      speechSynthesis.speak(u);
    } catch (e) { /* brak syntezy */ }
  },
};

// ---------------- Głosy kapibar ----------------
// Kwestie postaci: <id>_hitL, _hitH, _ko, _atk, _super, _throw, _dizzy, _win. Jedna kwestia naraz na postać,
// ważniejsza przerywa mniej ważną.
const CAPY_PRIO = { hitL: 1, atk: 2, hitH: 3, throw: 3, super: 4, dizzy: 4, ko: 5, win: 5 };
const CapyVoice = {
  enabled: Store.get('capyvo', true),
  setEnabled(on) { this.enabled = on; Store.set('capyvo', on); },
  // f – wojownik (albo obiekt { ch, vo }), zwraca true, gdy kwestia poszła
  say(f, kind, prob = 1) {
    if (!this.enabled || !Sfx.ok() || !f.ch) return false;
    const now = Sfx.ctx.currentTime, cur = f.vo, busy = cur && now < cur.end;
    if (busy && CAPY_PRIO[kind] <= cur.prio) return false;
    if (!busy && cur && kind === 'hitL' && now < cur.end + 0.35) return false;   // chwila oddechu między kwestiami
    if (Math.random() >= prob) return false;
    const s = Rec.play(`${f.ch.id}_${kind}`, Sfx.voGain, kind === 'win' ? 1 : 0.95);
    if (!s) return false;
    if (busy) { try { cur.src.stop(); } catch (e) { /* już skończone */ } }
    f.vo = { src: s, prio: CAPY_PRIO[kind], end: now + s.buffer.duration };
    return true;
  },
  stop(f) { if (f.vo) { try { f.vo.src.stop(); } catch (e) { /* już skończone */ } f.vo = null; } },
};
