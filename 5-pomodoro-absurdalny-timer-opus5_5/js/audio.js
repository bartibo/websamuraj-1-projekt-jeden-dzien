'use strict';
/* Dźwięki syntezowane na żywo (Web Audio) i lektor (synteza mowy przeglądarki). */

A.audio = (() => {
  let ctx = null, master = null, noiseBuf = null;
  const cfg = { sfx: true, tick: false, voice: true };

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, opt = {}) {
    if (!cfg.sfx || !ensure()) return;
    const t0 = ctx.currentTime + (opt.delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slide), t0 + dur);
    if (opt.vibrato) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = opt.vibrato; lg.gain.value = freq * 0.03;
      lfo.connect(lg).connect(o.frequency); lfo.start(t0); lfo.stop(t0 + dur + 0.05);
    }
    const vol = opt.vol == null ? 0.3 : opt.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + (opt.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = o;
    if (opt.filter) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.filter;
      o.connect(f); node = f;
    }
    node.connect(g).connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, opt = {}) {
    if (!cfg.sfx || !ensure()) return;
    const t0 = ctx.currentTime + (opt.delay || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = opt.ftype || 'lowpass';
    f.frequency.setValueAtTime(opt.freq || 1200, t0);
    if (opt.fslide) f.frequency.exponentialRampToValueAtTime(opt.fslide, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(opt.vol || 0.4, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05);
  }

  const sfx = {
    click() { tone(660, 0.06, { type: 'square', vol: 0.08 }); },
    tick() { if (cfg.tick) tone(2200, 0.025, { type: 'square', vol: 0.04, filter: 3000 }); },
    tock() { if (cfg.tick) tone(1500, 0.03, { type: 'square', vol: 0.04, filter: 2500 }); },
    stamp() { noise(0.18, { freq: 500, vol: 0.9 }); tone(90, 0.2, { type: 'sine', vol: 0.6, slide: 45 }); },
    whoosh() { noise(0.35, { ftype: 'bandpass', freq: 300, fslide: 3000, vol: 0.25 }); },
    ding() { tone(1318, 0.5, { vol: 0.18 }); tone(1975, 0.6, { vol: 0.1, delay: 0.05 }); },
    pop() { tone(500, 0.08, { type: 'triangle', vol: 0.2, slide: 1400 }); },
    type() { noise(0.03, { ftype: 'highpass', freq: 3000, vol: 0.15 }); },
    crash() {
      noise(0.5, { ftype: 'highpass', freq: 2500, vol: 0.35 });
      for (let i = 0; i < 5; i++) tone(rand(2500, 5000), 0.15, { type: 'triangle', vol: 0.06, delay: i * 0.04 + rand(0, 0.03) });
      tone(120, 0.15, { vol: 0.3, slide: 60 });
    },
    hit() { tone(rand(200, 260), 0.09, { type: 'square', vol: 0.09, slide: 80 }); noise(0.05, { freq: 2000, vol: 0.12 }); },
    crit() { tone(880, 0.12, { type: 'sawtooth', vol: 0.1, slide: 220, filter: 2400 }); noise(0.12, { freq: 3000, vol: 0.2 }); },
    meow() { tone(700, 0.35, { type: 'sawtooth', vol: 0.08, slide: 1100, filter: 1800, vibrato: 7 }); tone(1100, 0.3, { type: 'sawtooth', vol: 0.06, slide: 600, filter: 1600, delay: 0.3 }); },
    // Gong dworcowy: trzy tony w górę
    gong() { [523, 659, 784].forEach((f, i) => { tone(f, 1.2, { vol: 0.2, delay: i * 0.38 }); tone(f * 2, 0.8, { vol: 0.05, delay: i * 0.38 }); }); },
    gongDown() { [784, 659, 523].forEach((f, i) => { tone(f, 1.2, { vol: 0.2, delay: i * 0.38 }); }); },
    flap() { noise(0.02, { ftype: 'highpass', freq: 4000, vol: 0.12 }); },
    siren() { for (let i = 0; i < 3; i++) { tone(600, 0.4, { type: 'triangle', vol: 0.12, slide: 1000, delay: i * 0.5 }); } },
    fanfare() {
      const notes = [[523, 0], [659, 0.14], [784, 0.28], [1047, 0.42], [784, 0.62], [1047, 0.76]];
      notes.forEach(([f, d]) => {
        tone(f, 0.35, { type: 'sawtooth', vol: 0.09, delay: d, filter: 2600 });
        tone(f / 2, 0.35, { type: 'square', vol: 0.05, delay: d, filter: 1200 });
      });
      tone(1047, 1.2, { type: 'sawtooth', vol: 0.1, delay: 0.95, filter: 2800, vibrato: 6 });
      tone(784, 1.2, { type: 'sawtooth', vol: 0.07, delay: 0.95, filter: 2400, vibrato: 6 });
    },
    // Trąbka imprezowa
    horn() { tone(320, 0.6, { type: 'sawtooth', vol: 0.12, slide: 520, filter: 1400, vibrato: 12 }); },
    sad() { tone(392, 0.4, { type: 'triangle', vol: 0.15 }); tone(370, 0.4, { type: 'triangle', vol: 0.15, delay: 0.4 }); tone(349, 0.4, { type: 'triangle', vol: 0.15, delay: 0.8 }); tone(330, 1.2, { type: 'triangle', vol: 0.15, delay: 1.2, vibrato: 5 }); },
    count(n) { tone(n <= 3 ? 880 : 660, 0.15, { type: 'square', vol: 0.12, filter: 2000 }); },
    boom() { noise(1.2, { freq: 400, fslide: 60, vol: 1 }); tone(70, 0.8, { vol: 0.6, slide: 30 }); },
    blip() { tone(1200, 0.05, { type: 'sine', vol: 0.08 }); },
    slurp() { tone(300, 0.4, { type: 'sine', vol: 0.15, slide: 900, vibrato: 18 }); },
    bite() { noise(0.08, { ftype: 'bandpass', freq: 1800, vol: 0.5 }); noise(0.06, { ftype: 'bandpass', freq: 900, vol: 0.4, delay: 0.09 }); },
  };

  let voicePl = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    voicePl = vs.find(v => /^pl/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  function say(text, opt = {}) {
    if (!cfg.voice || !('speechSynthesis' in window) || !voicePl) return;
    try {
      if (opt.interrupt !== false) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voicePl; u.lang = voicePl.lang;
      u.rate = opt.rate || 1; u.pitch = opt.pitch || 1; u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* bez głosu */ }
  }
  function hasVoice() { return !!voicePl; }

  return { cfg, ensure, sfx, say, hasVoice };
})();
