/* =====================================================================
   Nurt – warstwy szumów: brązowy, różowy i deszcz za oknem
   ===================================================================== */
'use strict';
(function (N) {
  N.createNoiseLayers = function (E) {
    const ctx = E.ctx, U = N.util, B = E.buffers;
    const sources = [];
    const gains = {};
    const src = (buf, off) => { const s = U.loop(ctx, buf, off); sources.push(s); return s; };

    // Brązowy szum: ciepły, głęboki, jak szum oceanu zza ściany
    gains.brown = U.gain(ctx, 0);
    src(B.brown, 0)
      .connect(U.filter(ctx, 'highpass', 28, 0.5))
      .connect(U.filter(ctx, 'lowpass', 900, 0.5))
      .connect(gains.brown).connect(E.bus);

    // Różowy szum: jaśniejszy, równy, maskuje rozmowy w tle
    gains.pink = U.gain(ctx, 0);
    src(B.pink, 1.3)
      .connect(U.filter(ctx, 'highpass', 60, 0.5))
      .connect(U.filter(ctx, 'lowpass', 6500, 0.5))
      .connect(gains.pink).connect(E.bus);

    // Deszcz: szelest, pomruk, pojedyncze krople i delikatne podmuchy
    gains.rain = U.gain(ctx, 0);
    const hiss = U.gain(ctx, 0.5);
    src(B.pink, 4.1)
      .connect(U.filter(ctx, 'highpass', 650, 0.6))
      .connect(U.filter(ctx, 'lowpass', 8500, 0.5))
      .connect(hiss).connect(gains.rain);
    src(B.brown, 3.3)
      .connect(U.filter(ctx, 'lowpass', 240, 0.6))
      .connect(U.gain(ctx, 0.55)).connect(gains.rain);
    src(B.drops, 0)
      .connect(U.filter(ctx, 'lowpass', 7500, 0.5))
      .connect(U.gain(ctx, 0.9)).connect(gains.rain);
    gains.rain.connect(E.bus);
    gains.rain.connect(U.gain(ctx, 0.12)).connect(E.reverbIn);

    const gust = ctx.createOscillator();
    gust.frequency.value = 0.055;
    const gust2 = ctx.createOscillator();
    gust2.frequency.value = 0.021;
    gust.connect(U.gain(ctx, 0.12)).connect(hiss.gain);
    gust2.connect(U.gain(ctx, 0.1)).connect(hiss.gain);

    return {
      gains,
      start(t) {
        sources.forEach(s => s.start(t, s.offset0));
        gust.start(t);
        gust2.start(t);
      }
    };
  };
})(window.Nurt);
