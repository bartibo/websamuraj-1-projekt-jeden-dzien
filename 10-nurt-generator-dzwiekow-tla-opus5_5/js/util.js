/* =====================================================================
   Nurt – drobne narzędzia wspólne dla wszystkich modułów
   ===================================================================== */
'use strict';
window.Nurt = window.Nurt || {};
(function (N) {
  // Źródło losowości. Silnik z ziarnem podstawia tu na czas swoich obliczeń
  // własny generator, więc to samo ziarno daje ten sam utwór.
  let rng = Math.random;
  const SEED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  N.util = {
    random: () => rng(),
    rand: (a, b) => a + rng() * (b - a),
    randi: (a, b) => Math.floor(a + rng() * (b - a + 1)),
    pick: arr => arr[Math.floor(rng() * arr.length)],
    chance: p => rng() < p,
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    smooth: t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); },
    mtof: m => 440 * Math.pow(2, (m - 69) / 12),

    /** Generator z ziarnem: hash cyrb128 z tekstu i sfc32. */
    seeded(seed) {
      let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
      const s = String(seed);
      for (let i = 0; i < s.length; i++) {
        const k = s.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
      }
      let a = h1 >>> 0, b = h2 >>> 0, c = h3 >>> 0, d = h4 >>> 0;
      return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        let t = (a + b) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        d = (d + 1) | 0;
        t = (t + d) | 0;
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
      };
    },
    /** Uruchom fn z podanym generatorem jako źródłem losowości. */
    withRng(r, fn) {
      const prev = rng;
      rng = r;
      try { return fn(); } finally { rng = prev; }
    },
    /** Nowe ziarno: sześć znaków bez mylących się liter i cyfr. */
    newSeed() {
      let s = '';
      for (let i = 0; i < 6; i++) s += SEED_CHARS[Math.floor(Math.random() * SEED_CHARS.length)];
      return s;
    },
    cleanSeed: s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12),

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
