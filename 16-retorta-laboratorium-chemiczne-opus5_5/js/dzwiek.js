/* Retorta – dźwięki syntezowane w Web Audio (bez plików) */
'use strict';
R.Snd = (function () {
  let ac = null, master = null, szum = null, bulgG = null, palG = null, wl = true;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
      szum = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = szum.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // ciągłe: bulgotanie i szum palnika
      const n1 = ac.createBufferSource(); n1.buffer = szum; n1.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 1.2;
      bulgG = ac.createGain(); bulgG.gain.value = 0; n1.connect(bp); bp.connect(bulgG); bulgG.connect(master); n1.start();
      const n2 = ac.createBufferSource(); n2.buffer = szum; n2.loop = true;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      palG = ac.createGain(); palG.gain.value = 0; n2.connect(lp); lp.connect(palG); palG.connect(master); n2.start();
    } catch (e) { ac = null; }
  }
  function ton(f, dur, typ, g, f2, opoz) {
    const t = ac.currentTime + (opoz || 0);
    const o = ac.createOscillator(), G = ac.createGain();
    o.type = typ || 'sine'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    G.gain.setValueAtTime(0.0001, t); G.gain.exponentialRampToValueAtTime(g || 0.2, t + 0.01); G.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(G); G.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function halas(dur, f, typ, g, opoz, q) {
    const t = ac.currentTime + (opoz || 0);
    const s = ac.createBufferSource(); s.buffer = szum;
    const fl = ac.createBiquadFilter(); fl.type = typ || 'bandpass'; fl.frequency.value = f; fl.Q.value = q || 0.8;
    const G = ac.createGain(); G.gain.setValueAtTime(0.0001, t); G.gain.exponentialRampToValueAtTime(g || 0.3, t + 0.02); G.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(G); G.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const DZ = {
    nalej: () => { halas(0.45, 1100, 'bandpass', 0.18); halas(0.3, 2500, 'bandpass', 0.06, 0.05); },
    sypnij: () => { for (let i = 0; i < 6; i++) halas(0.04, 5000, 'highpass', 0.12, i * 0.035); },
    kropla: () => ton(900, 0.09, 'sine', 0.18, 1600),
    plop: () => { ton(420, 0.14, 'sine', 0.2, 160); },
    pyk: () => { halas(0.22, 500, 'lowpass', 0.9); ton(140, 0.18, 'triangle', 0.4, 60); },
    ding: () => { ton(988, 0.35, 'sine', 0.16); ton(1480, 0.4, 'sine', 0.08, null, 0.05); },
    odkrycie: () => { [660, 880, 1175, 1568].forEach((f, i) => ton(f, 0.3, 'triangle', 0.13, null, i * 0.07)); },
    sukces: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => ton(f, 0.45, 'triangle', 0.15, null, i * 0.09)); ton(1568, 0.8, 'sine', 0.1, null, 0.5); },
    blad: () => { ton(220, 0.25, 'square', 0.08, 150); },
    klik: () => ton(1400, 0.04, 'sine', 0.08),
    syk: () => halas(0.9, 4200, 'highpass', 0.2),
    wybuch: () => { halas(0.9, 260, 'lowpass', 0.9); ton(80, 0.6, 'sine', 0.4, 40); },
    blysk: () => { halas(1.3, 3000, 'bandpass', 0.35); ton(200, 0.8, 'sawtooth', 0.05, 900); },
    zapal: () => halas(0.5, 700, 'lowpass', 0.4),
    zgas: () => halas(0.3, 1800, 'highpass', 0.15),
    dmuch: () => halas(0.25, 900, 'bandpass', 0.15),
    szklo: () => { ton(2600, 0.25, 'sine', 0.08); ton(3900, 0.18, 'sine', 0.05, null, 0.02); }
  };
  return {
    init,
    graj(k) { if (!ac || !wl || !DZ[k]) return; try { DZ[k](); } catch (e) { } },
    poziomy(bulg, pal) {
      if (!ac) return; const t = ac.currentTime;
      bulgG.gain.setTargetAtTime(wl ? Math.min(0.22, bulg) : 0, t, 0.15);
      palG.gain.setTargetAtTime(wl ? Math.min(0.25, pal) : 0, t, 0.2);
    },
    get wlaczony() { return wl; },
    set wlaczony(x) { wl = x; if (!x && ac) { bulgG.gain.value = 0; palG.gain.value = 0; } }
  };
})();
