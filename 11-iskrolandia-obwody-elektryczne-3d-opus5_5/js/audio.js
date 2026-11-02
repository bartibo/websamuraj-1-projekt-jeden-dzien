// Dźwięki syntezowane na żywo (Web Audio) – bez plików, bez internetu
window.Iskry = window.Iskry || {};
(function () {
  const A = Iskry.audio = {};
  let ctx = null, master = null, noiseBuf = null;
  let buzzGain, buzzOsc, buzzLfoGain, motorGain, motorOsc, motorFilter;
  let muted = false;

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // brzęczyk: fala prostokątna z „trzepotaniem”
    buzzOsc = ctx.createOscillator();
    buzzOsc.type = 'square';
    buzzOsc.frequency.value = 380;
    const bf = ctx.createBiquadFilter();
    bf.type = 'lowpass'; bf.frequency.value = 1800;
    const trem = ctx.createGain(); trem.gain.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 32;
    buzzLfoGain = ctx.createGain(); buzzLfoGain.gain.value = 0.4;
    lfo.connect(buzzLfoGain).connect(trem.gain);
    buzzGain = ctx.createGain(); buzzGain.gain.value = 0;
    buzzOsc.connect(bf).connect(trem).connect(buzzGain).connect(master);
    buzzOsc.start(); lfo.start();

    // silniczek: cichy, ciepły szum piłokształtny
    motorOsc = ctx.createOscillator();
    motorOsc.type = 'sawtooth';
    motorOsc.frequency.value = 50;
    motorFilter = ctx.createBiquadFilter();
    motorFilter.type = 'lowpass'; motorFilter.frequency.value = 300;
    motorGain = ctx.createGain(); motorGain.gain.value = 0;
    motorOsc.connect(motorFilter).connect(motorGain).connect(master);
    motorOsc.start();
  };

  A.setMuted = function (m) {
    muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.05);
  };
  A.isMuted = () => muted;

  // ciągłe dźwięki: poziom brzęczyków i prędkość silniczków (0..~1.5)
  A.setContinuous = function (buzz, motor) {
    if (!ctx) return;
    const t = ctx.currentTime;
    buzzGain.gain.setTargetAtTime(Math.min(0.12, buzz * 0.09), t, 0.03);
    buzzOsc.frequency.setTargetAtTime(300 + Math.min(1.5, buzz) * 180, t, 0.05);
    const m = Math.min(2.5, motor);
    motorGain.gain.setTargetAtTime(m > 0.05 ? 0.05 + m * 0.03 : 0, t, 0.1);
    motorOsc.frequency.setTargetAtTime(40 + m * 70, t, 0.15);
    motorFilter.frequency.setTargetAtTime(200 + m * 400, t, 0.15);
  };

  function tone(f, dur, type, vol, when, f2) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, freq, when, q) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq || 1000; f.Q.value = q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  const SFX = {
    place() { tone(520, 0.09, 'triangle', 0.25); tone(820, 0.12, 'triangle', 0.2, 0.06); },
    snap() { tone(1300 + Math.random() * 300, 0.04, 'square', 0.06); },
    pick() { tone(700, 0.06, 'triangle', 0.15); },
    swOn() { noise(0.03, 0.3, 3000, 0, 2); tone(880, 0.1, 'sine', 0.15, 0.01); },
    swOff() { noise(0.03, 0.3, 2000, 0, 2); tone(440, 0.1, 'sine', 0.12, 0.01); },
    erase() { noise(0.25, 0.2, 1500, 0, 0.7); tone(600, 0.2, 'sine', 0.1, 0, 200); },
    flip() { tone(500, 0.08, 'triangle', 0.18, 0, 800); tone(800, 0.08, 'triangle', 0.15, 0.08, 500); },
    burn() { noise(0.4, 0.5, 900, 0, 0.6); tone(160, 0.3, 'sine', 0.35, 0, 60); noise(0.6, 0.12, 4000, 0.15, 3); },
    short() { tone(880, 0.12, 'square', 0.07); tone(660, 0.12, 'square', 0.07, 0.16); tone(880, 0.12, 'square', 0.07, 0.32); },
    error() { tone(220, 0.15, 'sine', 0.2, 0, 160); },
    ui() { tone(900, 0.05, 'sine', 0.1); },
    repair() { [660, 880, 1100].forEach((f, i) => tone(f, 0.1, 'triangle', 0.15, i * 0.06)); },
    check() { tone(988, 0.1, 'sine', 0.2); tone(1318, 0.18, 'sine', 0.2, 0.08); },
    success() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.22, i * 0.11));
      [1568, 2093, 2637].forEach((f, i) => tone(f, 0.25, 'sine', 0.08, 0.5 + i * 0.07));
    },
    star() { tone(1318, 0.25, 'sine', 0.2); tone(1975, 0.3, 'sine', 0.12, 0.05); },
    badge() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, 'square', 0.06, i * 0.08)); },
  };
  A.sfx = function (name) { if (ctx && !muted && SFX[name]) SFX[name](); };

  // Czytanie na głos (jeśli przeglądarka ma polski głos)
  A.speak = function (text) {
    if (!('speechSynthesis' in window)) return false;
    try {
      speechSynthesis.cancel();
      const clean = text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'pl-PL';
      const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith('pl'));
      if (v) u.voice = v;
      u.rate = 1.0; u.pitch = 1.15;
      speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  };
  A.stopSpeak = function () { try { speechSynthesis.cancel(); } catch (e) {} };
})();
