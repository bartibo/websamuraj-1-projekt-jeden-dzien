'use strict';
/* Cały dźwięk syntezowany na żywo przez Web Audio – zero plików audio. */

const Sound = (() => {
  let ctx = null, master = null, sfx = null, music = null, noiseBuf = null, arpBus = null;
  let muted = Store.get('tz_muted', false);
  let musicOn = Store.get('tz_music', true);
  let intensity = 0;
  let nextTime = 0, step = 0;
  const last = {};

  const STEP = 0.28; // ósemka przy ~107 BPM
  const PROG = [[57, 60, 64, 69], [53, 57, 60, 65], [50, 53, 57, 62], [52, 56, 59, 64]]; // Am F Dm E
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC(); } catch (e) { ctx = null; return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4;
    comp.attack.value = 0.003; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(comp);
    sfx = ctx.createGain(); sfx.gain.value = 0.6; sfx.connect(master);
    music = ctx.createGain(); music.gain.value = musicOn ? 0.55 : 0; music.connect(master);

    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  }

  function ok(name, ms) {
    if (!ctx || muted) return false;
    const t = performance.now();
    if (ms && last[name] && t - last[name] < ms) return false;
    last[name] = t;
    return true;
  }

  function tone(type, f0, f1, dur, vol, o = {}) {
    const t = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    if (o.detune) osc.detune.value = o.detune;
    const a = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.dest || sfx);
    osc.start(t); osc.stop(t + dur + 0.03);
  }

  function noise(dur, vol, f0, f1, o = {}) {
    const t = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'lowpass'; f.Q.value = o.q || 0.7;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfx);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.03);
  }

  /* ---------- muzyka proceduralna ---------- */
  function startMusic() {
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = STEP * 3;
    const fb = ctx.createGain(); fb.gain.value = 0.36;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(music);
    arpBus = ctx.createGain(); arpBus.connect(music); arpBus.connect(delay);
    nextTime = ctx.currentTime + 0.1;
    setInterval(schedule, 40);
  }
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    if (nextTime < ctx.currentTime - 0.3) nextTime = ctx.currentTime + 0.05; // po uśpieniu karty
    while (nextTime < ctx.currentTime + 0.25) {
      playStep(step, nextTime);
      nextTime += STEP;
      step++;
    }
  }
  function playStep(s, t) {
    if (!musicOn || muted) return;
    const chord = PROG[Math.floor(s / 16) % 4], pos = s % 16;
    if (pos === 0) { pad(chord, t, STEP * 16); bass(chord[0] - 24, t, STEP * 16); }
    if (intensity >= 1) {
      const pat = [0, 1, 2, 3, 2, 1, 2, 3];
      const n = chord[pat[pos % 8]] + 12 + (pos >= 8 && intensity >= 2 ? 12 : 0);
      musicNote(n, t, 'triangle', 0.03, STEP * 0.9);
      if (pos % 8 === 0) bass(chord[0] - 12, t, STEP * 2, 0.06);
    }
    if (intensity >= 2) {
      if (pos % 4 === 0) kick(t);
      if (pos % 4 === 2) hat(t);
    }
  }
  function pad(chord, t, dur) {
    for (let i = 0; i < 3; i++) {
      for (const det of [-8, 8]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = mtof(chord[i] - 12); o.detune.value = det;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650; f.Q.value = 0.4;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.02, t + 1.4);
        g.gain.setValueAtTime(0.02, t + dur - 0.5);
        g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.9);
        o.connect(f); f.connect(g); g.connect(music);
        o.start(t); o.stop(t + dur + 1);
      }
    }
  }
  function bass(m, t, dur, vol = 0.08) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = mtof(m);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(music); o.start(t); o.stop(t + dur + 0.05);
  }
  function musicNote(m, t, type, vol, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = mtof(m);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(arpBus); o.start(t); o.stop(t + dur + 0.05);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(music); o.start(t); o.stop(t + 0.25);
  }
  function hat(t) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.025, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(f); f.connect(g); g.connect(music);
    src.start(t, Math.random()); src.stop(t + 0.06);
  }

  return {
    init,
    get muted() { return muted; },
    get musicOn() { return musicOn; },
    setIntensity(v) { intensity = v; },
    // ukryta karta: zatrzymaj kontekst audio (muzyka nie tworzy wtedy nowych oscylatorów)
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() {
      muted = !muted; Store.set('tz_muted', muted);
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.03);
    },
    toggleMusic() {
      musicOn = !musicOn; Store.set('tz_music', musicOn);
      if (ctx) music.gain.setTargetAtTime(musicOn ? 0.55 : 0, ctx.currentTime, 0.1);
    },

    shoot() {
      if (!ok('shoot', 45)) return;
      tone('square', 950 + Math.random() * 140, 260, 0.08, 0.03);
      tone('sine', 1900, 700, 0.05, 0.025);
    },
    droneShot() { if (ok('drone', 80)) tone('triangle', 1500, 520, 0.06, 0.022); },
    hit() { if (ok('hit', 35)) tone('square', 240 + Math.random() * 60, 90, 0.05, 0.025); },
    explode(size = 1) {
      if (!ok('exp', 28)) return;
      const s = clamp(size, 0.3, 3);
      noise(0.22 + s * 0.32, 0.16 + s * 0.1, 2600, 90);
      tone('sine', 150 / (0.6 + s * 0.4), 32, 0.18 + s * 0.25, 0.16 + s * 0.08);
    },
    impact() {
      if (!ok('impact', 90)) return;
      tone('sine', 90, 26, 1.1, 0.6);
      tone('sawtooth', 62, 28, 0.6, 0.09);
      noise(1.3, 0.45, 1600, 45, { attack: 0.01 });
    },
    shieldHit() {
      if (!ok('shield', 50)) return;
      tone('sine', 950, 320, 0.35, 0.14);
      tone('triangle', 1420, 520, 0.25, 0.07);
      noise(0.2, 0.07, 6000, 1500, { type: 'bandpass', q: 2 });
    },
    shieldDown() {
      if (!ok('sdown', 300)) return;
      tone('sawtooth', 800, 90, 0.7, 0.1);
      noise(0.6, 0.15, 5000, 300, { type: 'bandpass', q: 3 });
    },
    powerup() {
      if (!ok('pw', 60)) return;
      [0, 4, 7, 12].forEach((n, i) => tone('triangle', mtof(74 + n), 0, 0.2, 0.08, { delay: i * 0.06 }));
    },
    emp() {
      if (!ok('emp', 100)) return;
      tone('sawtooth', 55, 900, 0.5, 0.1);
      tone('sine', 220, 40, 0.8, 0.3);
      noise(0.9, 0.22, 300, 8000, { type: 'bandpass', q: 1.5 });
    },
    nuke() {
      if (!ok('nuke', 200)) return;
      tone('sine', 70, 20, 2.2, 0.7);
      noise(2.2, 0.5, 3000, 40, { attack: 0.02 });
      tone('sawtooth', 40, 900, 0.9, 0.08);
    },
    wave() {
      if (!ok('wave', 300)) return;
      [57, 64, 69, 76].forEach((m, i) => tone('sawtooth', mtof(m), 0, 1.3, 0.035, { delay: i * 0.09, attack: 0.05 }));
    },
    clear() {
      if (!ok('clear', 300)) return;
      [69, 72, 76, 81, 84].forEach((m, i) => tone('triangle', mtof(m), 0, 0.45, 0.08, { delay: i * 0.08 }));
    },
    buy() {
      if (!ok('buy', 40)) return;
      tone('square', 660, 0, 0.07, 0.045);
      tone('square', 990, 0, 0.12, 0.045, { delay: 0.07 });
    },
    laser() {
      if (!ok('laser', 110)) return;
      tone('sawtooth', 170 + Math.random() * 25, 150, 0.13, 0.022);
      tone('sine', 1250, 1150, 0.1, 0.012);
    },
    zap() {
      if (!ok('zap', 60)) return;
      noise(0.09, 0.07, 7000, 2200, { type: 'bandpass', q: 4 });
      tone('square', 900 + Math.random() * 300, 260, 0.07, 0.018);
    },
    rocket() {
      if (!ok('rocket', 90)) return;
      noise(0.3, 0.08, 900, 160);
      tone('sawtooth', 180, 520, 0.16, 0.03);
    },
    metal() {
      if (!ok('metal', 55)) return;
      tone('square', 480 + Math.random() * 90, 360, 0.06, 0.025);
      tone('triangle', 1700, 1550, 0.08, 0.018);
    },
    alienShot() { if (ok('alien', 120)) tone('sine', 620, 1500, 0.18, 0.045); },
    weapon() {
      if (!ok('weapon', 200)) return;
      [62, 69, 74, 81].forEach((m, i) => tone('sawtooth', mtof(m), 0, 0.3, 0.05, { delay: i * 0.07 }));
      noise(0.4, 0.1, 400, 4000, { type: 'bandpass', q: 1.2 });
    },
    deny() { if (ok('deny', 120)) tone('sawtooth', 150, 100, 0.2, 0.06); },
    click() { if (ok('click', 30)) tone('sine', 1300, 700, 0.05, 0.05); },
    hover() { if (ok('hover', 40)) tone('sine', 2200, 1800, 0.025, 0.012); },
    combo(level) { if (ok('combo', 80)) tone('triangle', mtof(76 + Math.min(level, 8) * 2), 0, 0.25, 0.08); },
    boss() {
      if (!ok('boss', 1000)) return;
      for (let i = 0; i < 3; i++) {
        tone('sawtooth', 230, 180, 0.38, 0.08, { delay: i * 0.5 });
        tone('sawtooth', 345, 270, 0.38, 0.05, { delay: i * 0.5 });
      }
    },
    gameOver() {
      if (!ok('go', 1000)) return;
      [64, 60, 57, 52].forEach((m, i) => tone('sawtooth', mtof(m), mtof(m) * 0.97, 0.8, 0.06, { delay: i * 0.4, attack: 0.05 }));
      tone('sine', 60, 22, 3, 0.55);
      noise(3, 0.4, 900, 40, { attack: 0.03 });
    },
  };
})();
