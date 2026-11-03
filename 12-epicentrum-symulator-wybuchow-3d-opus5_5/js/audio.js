// Dźwięk syntezowany na żywo (Web Audio): huk zależny od siły i odległości, z opóźnieniem
// dźwięku względem błysku, lont, gwizd bomby, silnik rakiety, wystrzał, szkło, gruz, pożary.
(function () {
  const A = EP.audio = {};
  let ctx = null, master, comp, noiseBuf, brownBuf, on = true;
  A.enabled = () => on;

  A.init = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; return; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.4;
    master = ctx.createGain(); master.gain.value = 0.8;
    master.connect(comp); comp.connect(ctx.destination);
    const n = ctx.sampleRate * 4;
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    brownBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const a = noiseBuf.getChannelData(0), b = brownBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) { a[i] = Math.random() * 2 - 1; last = (last + 0.02 * a[i]) / 1.02; b[i] = last * 3.5; }
    ambient();
  };
  A.toggle = function () { on = !on; if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05); return on; };

  function noise(brown, dur, t0) {
    const s = ctx.createBufferSource();
    s.buffer = brown ? brownBuf : noiseBuf; s.loop = true;
    s.loopStart = Math.random() * 3; s.loopEnd = s.loopStart + 0.9;
    s.start(t0, Math.random() * 3); s.stop(t0 + dur + 0.1);
    return s;
  }
  function env(g, t0, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + dec);
  }

  // Huk wybuchu. mag: 0 (dynamit) … 1 (car-bomba), dist w metrach, delay w sekundach rzeczywistych
  A.boom = function (mag, dist, delay) {
    if (!ctx || !on) return;
    const t0 = ctx.currentTime + Math.max(0, delay || 0);
    const att = Math.max(0.08, Math.min(1, 1 / (1 + dist / (60 + 4000 * mag * mag))));
    const far = Math.min(1, dist / (300 + 30000 * mag));
    // trzask
    if (far < 0.8) {
      const s = noise(false, 0.15, t0), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'highpass'; f.frequency.value = 900 + 1500 * (1 - mag);
      env(g, t0, 0.002, 0.9 * att * (1 - far), 0.08 + mag * 0.2);
      s.connect(f); f.connect(g); g.connect(master);
    }
    // korpus
    {
      const dur = 0.5 + mag * 9;
      const s = noise(false, dur, t0), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'lowpass'; f.Q.value = 0.7;
      f.frequency.setValueAtTime(Math.max(200, (4200 - 3800 * mag) * (1 - far * 0.85)), t0);
      f.frequency.exponentialRampToValueAtTime(90 + 150 * (1 - mag), t0 + dur);
      env(g, t0, 0.004 + mag * 0.04, 1.0 * att, dur);
      s.connect(f); f.connect(g); g.connect(master);
    }
    // podmuch basowy
    {
      const dur = 0.6 + mag * 12;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(70 - 30 * mag, t0);
      o.frequency.exponentialRampToValueAtTime(22, t0 + dur);
      env(g, t0, 0.01 + mag * 0.1, (0.5 + 0.5 * mag) * Math.max(att, 0.3), dur);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.1);
    }
    // grzmot dla wielkich wybuchów
    if (mag > 0.35) {
      const dur = 8 + mag * 25;
      const s = noise(true, dur, t0 + 0.3), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'lowpass'; f.frequency.value = 160;
      g.gain.setValueAtTime(0.0001, t0 + 0.3);
      g.gain.exponentialRampToValueAtTime(0.9 * mag, t0 + 2 + mag * 3);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(master);
    }
    // echo odbite od budynków
    if (mag < 0.5) {
      for (let i = 0; i < 3; i++) {
        const td = t0 + 0.25 + i * 0.35 + Math.random() * 0.2;
        const s = noise(false, 0.8, td), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.frequency.value = 300 + Math.random() * 300; f.Q.value = 0.8;
        env(g, td, 0.01, 0.25 * att / (i + 1), 0.6);
        s.connect(f); f.connect(g); g.connect(master);
      }
    }
  };

  let fuseAcc = 0;
  A.fuse = function (dt) {
    if (!ctx || !on) return;
    fuseAcc += dt;
    if (fuseAcc < 0.06) return;
    fuseAcc = 0;
    const t0 = ctx.currentTime;
    const s = noise(false, 0.08, t0), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 3000 + Math.random() * 3000; f.Q.value = 1.5;
    env(g, t0, 0.005, 0.12 + Math.random() * 0.15, 0.06);
    s.connect(f); f.connect(g); g.connect(master);
  };
  A.clink = function () {
    if (!ctx || !on) return;
    const t0 = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 2200 + i * 900; o.type = 'triangle';
      env(g, t0 + i * 0.12, 0.002, 0.15 / (i + 1), 0.12);
      o.connect(g); g.connect(master); o.start(t0 + i * 0.12); o.stop(t0 + i * 0.12 + 0.2);
    }
  };
  A.whistle = function (dur) {
    if (!ctx || !on) return;
    const t0 = ctx.currentTime, d = Math.min(dur, 6);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(1500, t0); o.frequency.exponentialRampToValueAtTime(420, t0 + d);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + 0.1);
  };
  A.rocket = function (k) {
    if (!ctx || !on) return;
    const t0 = ctx.currentTime, d = 1.5 + k * 2;
    const s = noise(false, d, t0), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(400, t0); f.frequency.exponentialRampToValueAtTime(1800, t0 + d * 0.6); f.frequency.exponentialRampToValueAtTime(600, t0 + d);
    env(g, t0, 0.05, 0.35, d);
    s.connect(f); f.connect(g); g.connect(master);
  };
  A.cannon = function () { A.boom(0.12, 30, 0); };
  let glassT = 0;
  A.glass = function (dist) {
    if (!ctx || !on || dist > 400) return;
    const now = ctx.currentTime;
    if (now - glassT < 0.03) return;
    glassT = now;
    const n = 4 + Math.floor(Math.random() * 5);
    const vol = 0.12 / (1 + dist / 60);
    for (let i = 0; i < n; i++) {
      const t0 = now + Math.random() * 0.4 + dist / 343 * 0.1;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 2500 + Math.random() * 5000;
      env(g, t0, 0.001, vol, 0.05 + Math.random() * 0.15);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.25);
    }
  };
  let crumT = 0;
  A.crumble = function (dist, size) {
    if (!ctx || !on) return;
    const now = ctx.currentTime;
    if (now - crumT < 0.15) return;
    crumT = now;
    const d = 1 + Math.min(4, size / 10);
    const s = noise(true, d, now), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 500;
    env(g, now, 0.05, Math.min(0.5, 0.6 / (1 + dist / 300)), d);
    s.connect(f); f.connect(g); g.connect(master);
  };
  // Tło: lekki szum miasta i trzask pożarów
  let amb, fireG;
  function ambient() {
    const s = noise(true, 1e5, ctx.currentTime), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 400;
    amb = ctx.createGain(); amb.gain.value = 0.05;
    s.connect(f); f.connect(amb); amb.connect(master);
    const s2 = noise(false, 1e5, ctx.currentTime), f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass'; f2.frequency.value = 1400; f2.Q.value = 0.6;
    fireG = ctx.createGain(); fireG.gain.value = 0;
    s2.connect(f2); f2.connect(fireG); fireG.connect(master);
  }
  A.setFire = function (k) { if (fireG) fireG.gain.setTargetAtTime(Math.min(0.25, k) * (0.6 + Math.random() * 0.8), ctx.currentTime, 0.08); };
})();
