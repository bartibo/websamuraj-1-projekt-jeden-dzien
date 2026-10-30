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
    bass: 0.09, drums: 0.38, melody: 0.5, vinyl: 0.64, cafe: 0.7
  };

  N.createEngine = function (ctx) {
    const U = N.util, B = N.buffers;
    const E = { ctx, LEVEL };
    E.buffers = {
      white: B.noise(ctx, 'white', 5),
      pink: B.noise(ctx, 'pink', 10),
      brown: B.noise(ctx, 'brown', 10),
      drops: B.rainDrops(ctx, 12),
      crackle: B.crackle(ctx, 9)
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
    E.reverbIn.connect(conv).connect(U.gain(ctx, 0.5)).connect(E.bus);

    E.noise = N.createNoiseLayers(E);
    E.lofi = N.createLofi(E);
    E.cafe = N.createCafe(E);
    E.layerGains = Object.assign({}, E.noise.gains, E.lofi.gains, E.cafe.gains);
    E.mix = null;

    /** Ustaw proporcje warstw. Bez `immediate` wszystko płynie z ok. 0,7 s stałej czasowej. */
    E.apply = function (mix, immediate) {
      const t = ctx.currentTime;
      // przy wysokiej energii warstw jest więcej, więc lekko ściszamy całość (do -2 dB)
      const trim = Math.pow(10, -2 * mix.energy / 20);
      if (immediate) E.bus.gain.setValueAtTime(trim, t);
      else E.bus.gain.setTargetAtTime(trim, t, 0.7);
      for (const k of N.mix.LAYERS) {
        const g = E.layerGains[k].gain, v = LEVEL[k] * mix[k];
        if (immediate) { g.cancelScheduledValues(t); g.setValueAtTime(v, t); }
        else g.setTargetAtTime(v, t, 0.7);
      }
      E.lofi.setParams(mix, immediate);
      E.cafe.setParams(mix, immediate);
      E.mix = mix;
    };

    E.start = function () {
      const t = ctx.currentTime + 0.05;
      E.noise.start(t);
      E.lofi.start(t);
      E.cafe.start(t);
    };

    E.schedule = function (until) {
      E.lofi.schedule(until);
      E.cafe.schedule(until);
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

    /** Miękki dzwonek – koniec sesji. Omija wyciszanie, więc słychać go po wygaszeniu tła. */
    E.chime = function () {
      const t = ctx.currentTime + 0.05;
      [[0, 659.25], [0.42, 987.77]].forEach(([dt, f]) => {
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
  };
})(window.Nurt);
