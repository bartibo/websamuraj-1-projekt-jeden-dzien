'use strict';
/* =====================================================================
   Gdzie mgła ma zęby – dźwięk syntezowany na żywo (Web Audio)
   Wiatr, bordun, ogień, krople, kruki, sowa, szepty, bicie serca,
   bęben w walce, gęśle w osadzie. Bez plików.
   ===================================================================== */

const Snd = (() => {
  let ac = null, master = null, on = true, noise = null;
  const L = {};           // warstwy ciągłe
  let mood = { wind: 0.5, drone: 0.2, fire: 0, drip: 0, birds: 0, owls: 0, whisper: 0, heart: 0, deep: 0, village: 0, red: 0 };
  let timer = null;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = on ? 0.8 : 0;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ac.destination);
    noise = ac.createBuffer(1, ac.sampleRate * 3, ac.sampleRate);
    const d = noise.getChannelData(0); let b = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = b * 3.5 + w * 0.15; }
    buildLayers();
    setMood({});
    timer = setInterval(tickEvents, 250);
  }

  function noiseSrc() { const s = ac.createBufferSource(); s.buffer = noise; s.loop = true; s.loopStart = Math.random(); return s; }
  const gain = (v = 0) => { const g = ac.createGain(); g.gain.value = v; return g; };
  const ramp = (p, v, t = 1.5) => { if (!ac) return; p.cancelScheduledValues(ac.currentTime); p.setTargetAtTime(v, ac.currentTime, t / 3); };

  function buildLayers() {
    // wiatr
    { const n = noiseSrc(), bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 0.6;
      const g = gain(0), lfo = ac.createOscillator(), lg = gain(160); lfo.frequency.value = 0.07; lfo.connect(lg); lg.connect(bp.frequency);
      const lfo2 = ac.createOscillator(), lg2 = gain(0.05); lfo2.frequency.value = 0.13; lfo2.connect(lg2); lg2.connect(g.gain);
      n.connect(bp); bp.connect(g); g.connect(master); n.start(); lfo.start(); lfo2.start(); L.wind = g; }
    // bordun
    { const g = gain(0), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 2;
      const o1 = ac.createOscillator(), o2 = ac.createOscillator(), o3 = ac.createOscillator();
      o1.type = 'sawtooth'; o2.type = 'sawtooth'; o3.type = 'sine';
      o1.frequency.value = 55; o2.frequency.value = 55 * 1.4983; o3.frequency.value = 27.5;
      o2.detune.value = 7;
      const lfo = ac.createOscillator(), lg = gain(60); lfo.frequency.value = 0.05; lfo.connect(lg); lg.connect(lp.frequency);
      [o1, o2].forEach(o => o.connect(lp)); lp.connect(g);
      const g3 = gain(0); o3.connect(g3); g3.connect(master);
      g.connect(master); [o1, o2, o3, lfo].forEach(o => o.start());
      L.drone = g; L.sub = g3; L.droneOsc = [o1, o2, o3]; L.droneLp = lp; }
    // ogień (szum)
    { const n = noiseSrc(), hp = ac.createBiquadFilter(); hp.type = 'lowpass'; hp.frequency.value = 900;
      const g = gain(0); n.connect(hp); hp.connect(g); g.connect(master); n.start(); L.fire = g; }
  }

  function env(g, t0, a, peak, dcy) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dcy);
  }

  function crackle() {
    const t = ac.currentTime, s = noiseSrc(), hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800 + Math.random() * 2000;
    const g = gain(0); s.connect(hp); hp.connect(g); g.connect(master);
    env(g, t, 0.002, 0.08 * mood.fire, 0.04 + Math.random() * 0.05); s.start(t); s.stop(t + 0.15);
  }
  function drip() {
    const t = ac.currentTime, o = ac.createOscillator(), g = gain(0);
    o.type = 'sine'; const f = 900 + Math.random() * 900;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.12);
    const dl = ac.createDelay(); dl.delayTime.value = 0.23; const fb = gain(0.35);
    o.connect(g); g.connect(master); g.connect(dl); dl.connect(fb); fb.connect(dl); fb.connect(master);
    env(g, t, 0.003, 0.08 * mood.drip, 0.18); o.start(t); o.stop(t + 0.3);
  }
  function crow() {
    const t0 = ac.currentTime, n = 2 + (Math.random() * 3 | 0), pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; pan.connect(master); }
    for (let i = 0; i < n; i++) {
      const t = t0 + i * 0.32, o = ac.createOscillator(), bp = ac.createBiquadFilter(), g = gain(0);
      o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(380, t + 0.22);
      bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 3;
      o.connect(bp); bp.connect(g); g.connect(pan || master);
      env(g, t, 0.01, 0.05 * mood.birds, 0.24); o.start(t); o.stop(t + 0.3);
    }
  }
  function owl() {
    const t0 = ac.currentTime;
    [0, 0.5, 0.75].forEach((dt, i) => {
      const t = t0 + dt, o = ac.createOscillator(), g = gain(0);
      o.type = 'sine'; o.frequency.setValueAtTime(390, t); o.frequency.linearRampToValueAtTime(360, t + 0.35);
      o.connect(g); g.connect(master); env(g, t, 0.06, 0.05 * mood.owls * (i ? 0.8 : 1), 0.35); o.start(t); o.stop(t + 0.5);
    });
  }
  function whisper(strength = 1) {
    if (!ac || !on) return;
    const t = ac.currentTime, dur = 0.8 + Math.random() * 1.2;
    const s = noiseSrc(), bp = ac.createBiquadFilter(), bp2 = ac.createBiquadFilter(), g = gain(0);
    bp.type = 'bandpass'; bp.Q.value = 9; bp2.type = 'bandpass'; bp2.Q.value = 7;
    const pan = ac.createStereoPanner ? ac.createStereoPanner() : null;
    for (let k = 0; k < 8; k++) { bp.frequency.setValueAtTime(700 + Math.random() * 2400, t + k * dur / 8); bp2.frequency.setValueAtTime(1600 + Math.random() * 2400, t + k * dur / 8); }
    s.connect(bp); s.connect(bp2); bp.connect(g); bp2.connect(g);
    if (pan) { pan.pan.value = Math.random() * 2 - 1; g.connect(pan); pan.connect(master); } else g.connect(master);
    g.gain.setValueAtTime(0.0001, t);
    for (let k = 0; k < 6; k++) g.gain.linearRampToValueAtTime((0.12 + Math.random() * 0.25) * strength, t + (k + 0.5) * dur / 6);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.start(t); s.stop(t + dur + 0.1);
  }
  function thump(t, f, v) {
    const o = ac.createOscillator(), g = gain(0); o.type = 'sine';
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.15);
    o.connect(g); g.connect(master); env(g, t, 0.005, v, 0.18); o.start(t); o.stop(t + 0.25);
  }
  let heartNext = 0, pluckNext = 0, crowNext = 0, owlNext = 0, whisperNext = 0;
  const SCALE = [146.83, 164.81, 174.61, 196, 220, 246.94, 261.63, 293.66];
  function pluck(f, t, v = 0.06) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), lp = ac.createBiquadFilter(), g = gain(0);
    o.type = 'triangle'; o2.type = 'sawtooth'; o.frequency.value = f; o2.frequency.value = f * 1.002;
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(400, t + 1.2);
    const g2 = gain(0.25); o2.connect(g2); g2.connect(lp); o.connect(lp); lp.connect(g); g.connect(master);
    env(g, t, 0.005, v, 1.6); o.start(t); o2.start(t); o.stop(t + 1.8); o2.stop(t + 1.8);
  }
  function phrase() {
    const t0 = ac.currentTime + 0.05; let i = Math.random() * 4 | 0;
    const n = 4 + (Math.random() * 4 | 0);
    for (let k = 0; k < n; k++) { i = Math.max(0, Math.min(SCALE.length - 1, i + (Math.random() * 5 | 0) - 2)); pluck(SCALE[i] * (Math.random() < 0.2 ? 0.5 : 1), t0 + k * (0.38 + (k % 3 === 2 ? 0.2 : 0)), 0.045 * mood.village); }
    pluck(73.42, t0, 0.04 * mood.village);
  }

  function tickEvents() {
    if (!ac || !on) return;
    const now = ac.currentTime;
    if (mood.fire > 0 && Math.random() < 0.45 * mood.fire) crackle();
    if (mood.drip > 0 && Math.random() < 0.08 * mood.drip) drip();
    if (mood.birds > 0 && now > crowNext && Math.random() < 0.05) { crow(); crowNext = now + 6 + Math.random() * 10; }
    if (mood.owls > 0 && now > owlNext && Math.random() < 0.04) { owl(); owlNext = now + 10 + Math.random() * 14; }
    if (mood.whisper > 0 && now > whisperNext && Math.random() < 0.06 * mood.whisper) { whisper(0.5 + mood.whisper * 0.5); whisperNext = now + 3 + Math.random() * 6; }
    if (mood.heart > 0 && now > heartNext) { const bpm = 60 + mood.heart * 60; thump(now, 70, 0.25 * mood.heart); thump(now + 0.18, 60, 0.17 * mood.heart); heartNext = now + 60 / bpm; }
    if (mood.village > 0 && now > pluckNext && Math.random() < 0.2) { phrase(); pluckNext = now + 9 + Math.random() * 10; }
  }

  function setMood(m) {
    mood = Object.assign({}, mood, m);
    if (!ac) return;
    ramp(L.wind.gain, 0.22 * mood.wind, 3);
    ramp(L.drone.gain, 0.05 * mood.drone, 3);
    ramp(L.sub.gain, 0.12 * mood.deep, 3);
    ramp(L.fire.gain, 0.03 * mood.fire, 2);
    const detune = -mood.red * 300;
    L.droneOsc.forEach(o => ramp(o.detune, detune + (o === L.droneOsc[1] ? 7 : 0), 6));
    ramp(L.droneLp.frequency, 240 + mood.red * 500 + mood.deep * 200, 4);
  }

  const sfx = {
    click() { if (!ac || !on) return; const t = ac.currentTime, o = ac.createOscillator(), g = gain(0); o.type = 'triangle'; o.frequency.value = 180; o.connect(g); g.connect(master); env(g, t, 0.002, 0.05, 0.06); o.start(t); o.stop(t + 0.1); },
    dice() { if (!ac || !on) return; const t = ac.currentTime; for (let i = 0; i < 7; i++) { const s = noiseSrc(), bp = ac.createBiquadFilter(), g = gain(0); bp.type = 'bandpass'; bp.frequency.value = 2400 + Math.random() * 1500; bp.Q.value = 6; s.connect(bp); bp.connect(g); g.connect(master); const tt = t + i * 0.07 + Math.random() * 0.03; env(g, tt, 0.001, 0.25, 0.03); s.start(tt); s.stop(tt + 0.06); } },
    success() { if (!ac || !on) return; const t = ac.currentTime; pluck(293.66, t, 0.08); pluck(440, t + 0.12, 0.07); },
    fail() { if (!ac || !on) return; const t = ac.currentTime; pluck(155.56, t, 0.08); pluck(146.83, t + 0.15, 0.07); },
    hit() { if (!ac || !on) return; const t = ac.currentTime; thump(t, 110, 0.5); const s = noiseSrc(), hp = ac.createBiquadFilter(), g = gain(0); hp.type = 'highpass'; hp.frequency.value = 900; s.connect(hp); hp.connect(g); g.connect(master); env(g, t, 0.002, 0.25, 0.12); s.start(t); s.stop(t + 0.2); },
    hurt() { if (!ac || !on) return; const t = ac.currentTime; thump(t, 70, 0.6); thump(t + 0.09, 55, 0.4); },
    drum() { if (!ac || !on) return; const t = ac.currentTime; thump(t, 90, 0.35); },
    whisper,
    roar() { if (!ac || !on) return; const t = ac.currentTime, s = noiseSrc(), lp = ac.createBiquadFilter(), g = gain(0); lp.type = 'lowpass'; lp.frequency.setValueAtTime(600, t); lp.frequency.exponentialRampToValueAtTime(120, t + 1.6); s.connect(lp); lp.connect(g); g.connect(master); env(g, t, 0.1, 0.6, 1.6); s.start(t); s.stop(t + 1.9); const o = ac.createOscillator(), g2 = gain(0); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 1.6); o.connect(g2); g2.connect(master); env(g2, t, 0.1, 0.12, 1.5); o.start(t); o.stop(t + 1.8); },
    horn() { if (!ac || !on) return; const t = ac.currentTime, o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = gain(0); o.type = 'sawtooth'; o.frequency.setValueAtTime(130, t); o.frequency.linearRampToValueAtTime(146, t + 0.3); lp.type = 'lowpass'; lp.frequency.value = 900; o.connect(lp); lp.connect(g); g.connect(master); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.15); g.gain.setValueAtTime(0.2, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8); o.start(t); o.stop(t + 1.9); },
    page() { if (!ac || !on) return; const t = ac.currentTime, s = noiseSrc(), bp = ac.createBiquadFilter(), g = gain(0); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 0.8; s.connect(bp); bp.connect(g); g.connect(master); env(g, t, 0.03, 0.05, 0.2); s.start(t); s.stop(t + 0.3); },
  };

  return {
    init,
    setMood,
    sfx,
    get on() { return on; },
    setOn(v) { on = v; if (master) ramp(master.gain, v ? 0.8 : 0, 0.3); },
  };
})();
