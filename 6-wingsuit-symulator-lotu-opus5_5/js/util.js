/* Na Krawędzi – narzędzia: matematyka, szum proceduralny, losowość, zapis */
(function (root) {
  'use strict';
  const WS = root.WS = root.WS || {};

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const damp = (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

  // Generator liczb pseudolosowych (mulberry32)
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Hasz punktu siatki → [0,1)
  function hash2(x, z, seed) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(seed | 0, 982451653)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // Szum simplex 2D (S. Gustavson), z ziarnem
  const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;

  function Simplex(seed) {
    const r = rng(seed || 1);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    this.gx = new Float32Array(512);
    this.gy = new Float32Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      const g = GRAD[this.perm[i] & 7];
      this.gx[i] = g[0]; this.gy[i] = g[1];
    }
  }
  Simplex.prototype.noise = function (xin, yin) {
    const perm = this.perm, gx = this.gx, gy = this.gy;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t);
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { const g = perm[ii + perm[jj]]; t0 *= t0; n += t0 * t0 * (gx[g] * x0 + gy[g] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { const g = perm[ii + i1 + perm[jj + j1]]; t1 *= t1; n += t1 * t1 * (gx[g] * x1 + gy[g] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { const g = perm[ii + 1 + perm[jj + 1]]; t2 *= t2; n += t2 * t2 * (gx[g] * x2 + gy[g] * y2); }
    return 70 * n; // ~[-1,1]
  };
  Simplex.prototype.fbm = function (x, y, oct) {
    let a = 1, f = 1, s = 0, n = 0;
    for (let o = 0; o < oct; o++) {
      s += a * this.noise(x * f, y * f);
      n += a; a *= 0.5; f *= 2.03;
    }
    return s / n;
  };
  // Szum „grzbietowy” – ostre granie, [0,1]
  Simplex.prototype.ridged = function (x, y, oct) {
    let a = 1, f = 1, s = 0, n = 0, w = 1;
    for (let o = 0; o < oct; o++) {
      let v = 1 - Math.abs(this.noise(x * f, y * f));
      v *= v;
      v *= w;
      w = clamp(v * 1.6, 0, 1);
      s += a * v; n += a;
      a *= 0.5; f *= 2.1;
    }
    return s / n;
  };

  // Krzywa łamana z gładkim (Catmull-Rom) przejściem po punktach [s, v]
  function makeCurve(pts) {
    const n = pts.length;
    return function (s) {
      if (s <= pts[0][0]) return pts[0][1];
      if (s >= pts[n - 1][0]) return pts[n - 1][1];
      let i = 0;
      while (i < n - 2 && s > pts[i + 1][0]) i++;
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      const t = (s - p1[0]) / (p2[0] - p1[0]);
      // monotoniczna interpolacja Hermite'a (bez przestrzeleń)
      const d1 = p2[1] - p1[1];
      let m1 = (p2[1] - p0[1]) / Math.max(1e-6, (p2[0] - p0[0])) * (p2[0] - p1[0]);
      let m2 = (p3[1] - p1[1]) / Math.max(1e-6, (p3[0] - p1[0])) * (p2[0] - p1[0]);
      if (p1 === p0) m1 = d1;
      if (p3 === p2) m2 = d1;
      if (d1 === 0 || m1 * d1 <= 0) m1 = 0;
      if (d1 === 0 || m2 * d1 <= 0) m2 = 0;
      m1 = clamp(m1, -3 * Math.abs(d1), 3 * Math.abs(d1));
      m2 = clamp(m2, -3 * Math.abs(d1), 3 * Math.abs(d1));
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
    };
  }

  const store = {
    get(k, def) {
      try { const v = localStorage.getItem('nakrawedzi.' + k); return v == null ? def : JSON.parse(v); }
      catch (e) { return def; }
    },
    set(k, v) {
      try { localStorage.setItem('nakrawedzi.' + k, JSON.stringify(v)); } catch (e) { /* tryb prywatny */ }
    }
  };

  function fmt(n, d) {
    return Number(n).toLocaleString('pl-PL', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }

  WS.U = { clamp, lerp, smoothstep, damp, rng, hash2, Simplex, makeCurve, store, fmt };
})(typeof window !== 'undefined' ? window : globalThis);
