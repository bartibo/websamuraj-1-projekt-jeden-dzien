/* =====================================================================
   Nurt – drobne narzędzia wspólne dla wszystkich modułów
   ===================================================================== */
'use strict';
window.Nurt = window.Nurt || {};
(function (N) {
  N.util = {
    rand: (a, b) => a + Math.random() * (b - a),
    randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: arr => arr[Math.floor(Math.random() * arr.length)],
    chance: p => Math.random() < p,
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    mtof: m => 440 * Math.pow(2, (m - 69) / 12),

    /** Pętla z bufora (start później, z podanym przesunięciem). */
    loop(ctx, buffer, offset) {
      const s = ctx.createBufferSource();
      s.buffer = buffer;
      s.loop = true;
      s.offset0 = offset || 0;
      return s;
    },
    filter(ctx, type, freq, q) {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      if (q != null) f.Q.value = q;
      return f;
    },
    gain(ctx, value) {
      const g = ctx.createGain();
      g.gain.value = value == null ? 1 : value;
      return g;
    },
    panner(ctx, pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan || 0;
      return p;
    }
  };
})(window.Nurt);
