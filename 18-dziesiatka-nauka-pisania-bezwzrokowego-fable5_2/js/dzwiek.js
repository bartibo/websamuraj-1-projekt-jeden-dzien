/* Dziesiątka – dźwięki syntezowane w Web Audio (bez plików) */
(function () {
  'use strict';
  const DZ = window.DZ;
  let ctx = null, wlaczony = true;

  function kontekst() {
    if (!ctx) {
      const K = window.AudioContext || window.webkitAudioContext;
      if (!K) return null;
      try { ctx = new K(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function ton(czest, czas, typ, glosnosc, opoznienie, zjazd, zawsze) {
    if (!wlaczony && !zawsze) return;
    const c = kontekst();
    if (!c) return;
    const t = c.currentTime + (opoznienie || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = typ || 'sine';
    o.frequency.setValueAtTime(czest, t);
    if (zjazd) o.frequency.exponentialRampToValueAtTime(zjazd, t + czas);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(glosnosc, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + czas);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + czas + 0.02);
  }

  DZ.dzwiek = {
    ustaw(v) { wlaczony = !!v; },
    klik() { ton(1500 + Math.random() * 300, 0.035, 'triangle', 0.035, 0, 700); },
    spacja() { ton(520, 0.05, 'triangle', 0.04, 0, 300); },
    blad() { ton(150, 0.14, 'square', 0.05, 0, 95); },
    tik() { ton(990, 0.03, 'sine', 0.06, 0, 0, true); },   // metronom gra także przy wyłączonych dźwiękach klawiszy
    sukces() { [523, 659, 784, 1047].forEach((f, i) => ton(f, 0.22, 'sine', 0.07, i * 0.09)); },
    slabo() { [392, 330].forEach((f, i) => ton(f, 0.25, 'sine', 0.06, i * 0.14)); },
    gwiazdka(i) { ton(880 + i * 220, 0.3, 'sine', 0.07, i * 0.22); },
    trafione() { ton(700, 0.12, 'sine', 0.06, 0, 1400); },
    strata() { ton(220, 0.35, 'sawtooth', 0.05, 0, 70); }
  };
})();
