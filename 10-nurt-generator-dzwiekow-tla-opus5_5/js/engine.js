/* =====================================================================
   Nurt – silnik dźwięku
   Składa warstwy w jeden tor: suma → wyciszanie (pauza, koniec sesji)
   → głośność → łagodna kompresja → limiter → głośniki.
   Działa z każdym kontekstem audio, także z OfflineAudioContext
   (tak był kalibrowany poziom warstw).
   ===================================================================== */
'use strict';
(function (N) {
  // Poziom każdej warstwy przy wartości 1 w tabeli miksu (zmierzony, patrz README)
  const LEVEL = {
    brown: 0.31, pink: 0.18, rain: 0.36, pad: 0.52, keys: 0.46,
    bass: 0.09, drums: 0.38, melody: 0.5, vinyl: 0.64, cafe: 0.7,
    wind: 1.1, waves: 0.32, fire: 0.81, birds: 1.03,
    storm: 0.61, crickets: 0.79, train: 0.94
  };
  // Głośność (RMS) każdej warstwy przy wartości 1, względem deszczu – do pilnowania poziomu ręcznego miksu
  const LOUD = {
    brown: 1.23, pink: 0.56, rain: 1, pad: 0.99, keys: 1.12, bass: 1.32, drums: 1.43, melody: 0.55,
    vinyl: 0.09, cafe: 1.15, wind: 0.9, waves: 1.13, fire: 0.92, birds: 0.4,
    storm: 0.92, crickets: 0.65, train: 1.03
  };
  const power = mix => N.mix.LAYERS.reduce((p, k) => p + Math.pow(LOUD[k] * mix[k], 2), 0);

  /** Silnik dla kontekstu audio. Z ziarnem (`seed`) każdy wylosowany szczegół, od szumów po nuty, jest powtarzalny. */
  N.createEngine = function (ctx, seed) {
    const U = N.util;
    const R = seed ? U.seeded(seed) : Math.random;
    const E = U.withRng(R, () => build(ctx));
    E.seed = seed || null;
    // wszystko, co losuje, liczy się z generatorem tego silnika
    ['apply', 'start', 'schedule'].forEach(k => {
      const f = E[k];
      E[k] = (...a) => U.withRng(R, () => f(...a));
    });
    return E;
  };

  function build(ctx) {
    const U = N.util, B = N.buffers;
    const E = { ctx, LEVEL };
    // Długości pętli są „nieokrągłe”, żeby nie zgrywały się ze sobą ani z długością nagrania
    E.buffers = {
      white: B.noise(ctx, 'white', 4.79),
      pink: B.noise(ctx, 'pink', 10.41),
      brown: B.noise(ctx, 'brown', 9.73),
      drops: B.rainDrops(ctx, 12.13),
      crackle: B.crackle(ctx, 8.87),
      fire: B.fire(ctx, 13.91)
    };

    E.bus = U.gain(ctx, 1);
    E.fade = U.gain(ctx, 0);
    E.volume = U.gain(ctx, 0.5);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 2.5;
    comp.attack.value = 0.02; comp.release.value = 0.35;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.002; limiter.release.value = 0.12;
    E.analyser = ctx.createAnalyser();
    E.analyser.fftSize = 1024;
    E.bus.connect(E.fade).connect(E.volume).connect(comp).connect(limiter).connect(E.analyser);
    E.analyser.connect(ctx.destination);

    E.reverbIn = U.gain(ctx, 1);
    const conv = ctx.createConvolver();
    conv.buffer = B.impulse(ctx, 2.6, 2.6);
    E.reverbOut = U.gain(ctx, 0.5);
    E.reverbIn.connect(conv).connect(E.reverbOut).connect(E.bus);

    E.noise = N.createNoiseLayers(E);
    E.lofi = N.createLofi(E);
    E.cafe = N.createCafe(E);
    E.nature = N.createNature(E);
    E.ambience = N.createAmbience(E);
    E.layerGains = Object.assign({}, E.noise.gains, E.lofi.gains, E.cafe.gains, E.nature.gains, E.ambience.gains);
    E.mix = null;

    /** Ustaw proporcje warstw. Bez `immediate` wszystko płynie z ok. 0,7 s stałej czasowej. */
    E.apply = function (mix, immediate) {
      const t = ctx.currentTime;
      // przy wysokiej energii warstw jest więcej, więc lekko ściszamy całość (do -2 dB)
      let trim = Math.pow(10, -2 * mix.energy / 20);
      // ręczny miks głośniejszy niż ten z energii też jest ściszany, żeby całość nie przesterowała
      const p = power(mix), ref = power(N.mix.at(mix.energy));
      if (p > ref) trim *= Math.sqrt(ref / p);
      const rv = mix.space;
      if (immediate) {
        E.bus.gain.setValueAtTime(trim, t);
        E.reverbOut.gain.setValueAtTime(rv, t);
      } else {
        E.bus.gain.setTargetAtTime(trim, t, 0.7);
        E.reverbOut.gain.setTargetAtTime(rv, t, 0.7);
      }
      for (const k of N.mix.LAYERS) {
        const g = E.layerGains[k].gain, v = LEVEL[k] * mix[k];
        if (immediate) { g.cancelScheduledValues(t); g.setValueAtTime(v, t); }
        else g.setTargetAtTime(v, t, 0.7);
      }
      E.lofi.setParams(mix, immediate);
      E.cafe.setParams(mix, immediate);
      E.nature.setParams(mix, immediate);
      E.ambience.setParams(mix, immediate);
      E.mix = mix;
    };

    E.start = function () {
      const t = ctx.currentTime + 0.05;
      E.noise.start(t);
      E.lofi.start(t);
      E.cafe.start(t);
      E.nature.start(t);
      E.ambience.start(t);
    };

    E.schedule = function (until) {
      E.lofi.schedule(until);
      E.cafe.schedule(until);
      E.nature.schedule(until);
      E.ambience.schedule(until);
    };

    E.setVolume = function (v, immediate) {
      const g = v * v * 0.9;
      if (immediate) E.volume.gain.setValueAtTime(g, ctx.currentTime);
      else E.volume.gain.setTargetAtTime(g, ctx.currentTime, 0.08);
    };

    E.fadeTo = function (v, seconds) {
      const t = ctx.currentTime;
      E.fade.gain.cancelScheduledValues(t);
      E.fade.gain.setValueAtTime(E.fade.gain.value, t);
      E.fade.gain.linearRampToValueAtTime(v, t + seconds);
    };

    // Dzwonki: koniec sesji i przerwa (w górę), powrót do pracy (w dół, krótszy)
    const CHIMES = {
      end: [[0, 659.25], [0.42, 987.77]],
      work: [[0, 987.77], [0.3, 739.99]]
    };
    /** Miękki dzwonek. Omija wyciszanie, więc słychać go także po wygaszeniu tła. */
    E.chime = function (kind) {
      const t = ctx.currentTime + 0.05;
      (CHIMES[kind] || CHIMES.end).forEach(([dt, f]) => {
        [[1, 1, 3.2], [2.0, 0.35, 1.8], [3.01, 0.18, 1.1], [4.2, 0.08, 0.7]].forEach(([r, a, d]) => {
          const o = ctx.createOscillator();
          o.frequency.value = f * r;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, t + dt);
          g.gain.linearRampToValueAtTime(a * 0.12, t + dt + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dt + d);
          o.connect(g);
          g.connect(E.volume);
          g.connect(E.reverbIn);
          o.start(t + dt);
          o.stop(t + dt + d + 0.1);
        });
      });
    };

    return E;
  }
})(window.Nurt);
