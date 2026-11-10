/* Odbijanka – dźwięk syntezowany w przeglądarce (Web Audio). Bez plików audio. */
(function () {
  'use strict';
  const G = (window.Odbijanka = window.Odbijanka || {});

  const KLUCZ = 'odbijanka-cisza';
  let ctx = null;
  let glowny = null;
  let wyciszony = false;

  try { wyciszony = localStorage.getItem(KLUCZ) === '1'; } catch (e) { /* brak dostępu – trudno */ }

  // Wywoływane po pierwszym kliknięciu / klawiszu (wymóg przeglądarek).
  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      glowny = ctx.createGain();
      glowny.gain.value = wyciszony ? 0 : 0.5;
      glowny.connect(ctx.destination);
    } catch (e) {
      ctx = null;
    }
  }

  // Pojedynczy ton z obwiednią. f2 – opcjonalna częstotliwość końcowa (glissando).
  function ton(f1, czas, typ, glosnosc, f2, opoznienie) {
    if (!ctx || wyciszony) return;
    const t0 = ctx.currentTime + (opoznienie || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = typ || 'square';
    osc.frequency.setValueAtTime(f1, t0);
    if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t0 + czas);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(glosnosc || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + czas);
    osc.connect(g);
    g.connect(glowny);
    osc.start(t0);
    osc.stop(t0 + czas + 0.05);
  }

  const D = {
    init,

    // sila: 0..1 – im szybsza piłka, tym wyższy i ostrzejszy dźwięk
    odbicie(sila) {
      const s = Math.max(0, Math.min(1, sila || 0));
      ton(380 + s * 460, 0.09, 'square', 0.1, 260 + s * 220);
    },
    sciana() { ton(210, 0.06, 'triangle', 0.16, 150); },
    punkt() { ton(520, 0.35, 'sawtooth', 0.16, 90); },
    powerup() {
      ton(660, 0.12, 'triangle', 0.18);
      ton(880, 0.12, 'triangle', 0.18, null, 0.08);
      ton(1320, 0.18, 'triangle', 0.18, null, 0.16);
    },
    tarcza() { ton(180, 0.22, 'sine', 0.3, 900); },
    // n = 3, 2, 1 – odliczanie; n = 0 – start
    odliczanie(n) {
      if (n === 0) ton(990, 0.28, 'sine', 0.24);
      else ton(640, 0.12, 'sine', 0.2);
    },
    wygrana() {
      [523, 659, 784, 1046].forEach((f, i) => ton(f, 0.22, 'square', 0.1, null, i * 0.12));
    },
    przegrana() {
      [330, 262, 196, 147].forEach((f, i) => ton(f, 0.25, 'sawtooth', 0.09, null, i * 0.16));
    },

    // Przełącza wyciszenie; zwraca nowy stan.
    przelacz() {
      wyciszony = !wyciszony;
      try { localStorage.setItem(KLUCZ, wyciszony ? '1' : '0'); } catch (e) { /* ignorujemy */ }
      if (glowny) glowny.gain.value = wyciszony ? 0 : 0.5;
      return wyciszony;
    },
    jestWyciszony() { return wyciszony; },
  };

  G.dzwiek = D;
})();
