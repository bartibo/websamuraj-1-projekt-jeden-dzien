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

    // Deszcz: gęsta, ziarnista tekstura tysięcy uderzeń kropli, cichy szum spływającej
    // wody, odrobina dołu i bliskie plaśnięcia planowane na bieżąco (więc się nie powtarzają).
    // Proporcje dobrane do widma prawdziwych nagrań deszczu (patrz README).
    gains.rain = U.gain(ctx, 0);
    const patter = U.gain(ctx, 1);
    const tone = U.filter(ctx, 'highpass', 220, 0.6);
    tone.connect(U.filter(ctx, 'lowpass', 2800, 0.5)).connect(patter).connect(gains.rain);
    src(B.patter, 0).connect(tone);
    // druga kopia: wolniej (większe krople) i z zamienionymi kanałami, więc wzór się nie powtarza
    const slow = src(B.patter, 5.3);
    slow.playbackRate.value = 0.86;
    const split = ctx.createChannelSplitter(2), swap = ctx.createChannelMerger(2);
    slow.connect(split);
    split.connect(swap, 0, 1);
    split.connect(swap, 1, 0);
    swap.connect(tone);
    src(B.pink, 4.1).connect(U.filter(ctx, 'bandpass', 1000, 0.45)).connect(U.gain(ctx, 0.1)).connect(patter);
    src(B.brown, 3.3).connect(U.filter(ctx, 'lowpass', 200, 0.6)).connect(U.gain(ctx, 0.1)).connect(gains.rain);
    gains.rain.connect(E.bus);
    gains.rain.connect(U.gain(ctx, 0.12)).connect(E.reverbIn);

    // podmuchy: deszcz raz gęstnieje, raz rzednie
    const gust = ctx.createOscillator();
    gust.frequency.value = 0.055;
    const gust2 = ctx.createOscillator();
    gust2.frequency.value = 0.021;
    gust.connect(U.gain(ctx, 0.12)).connect(patter.gain);
    gust2.connect(U.gain(ctx, 0.1)).connect(patter.gain);

    /** Bliska kropla: krótki trzask szumu o losowej barwie, w całej panoramie. */
    function splat(t) {
      const s = ctx.createBufferSource();
      s.buffer = B.white;
      s.loop = true;
      const g = ctx.createGain();
      const a = 0.08 + Math.pow(U.random(), 3) * 0.8;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + 0.0008);
      g.gain.setTargetAtTime(0, t + 0.001, U.rand(0.004, 0.018));
      s.connect(U.filter(ctx, 'bandpass', U.rand(600, 3200), U.rand(0.4, 1))).connect(g)
        .connect(U.panner(ctx, U.rand(-0.9, 0.9))).connect(gains.rain);
      s.start(t, U.rand(0, 4));
      s.stop(t + 0.15);
    }

    let rain = 0, nextSplat = 0, running = false;
    return {
      gains,
      start(t) {
        sources.forEach(s => s.start(t, s.offset0));
        gust.start(t);
        gust2.start(t);
        running = true;
      },
      setParams(m) { rain = m.rain; },
      schedule(until) {
        if (!running) return;
        if (rain > 0.01) {
          const now = ctx.currentTime;
          if (nextSplat < now) nextSplat = now + U.rand(0, 0.2);
          while (nextSplat < until) {
            splat(nextSplat);
            nextSplat += -Math.log(1 - U.random()) / 9; // ok. 9 na sekundę, nieregularnie
          }
        }
      }
    };
  };
})(window.Nurt);
