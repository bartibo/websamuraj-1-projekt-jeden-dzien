// Narzędzia: losowanie z ziarnem, szum, formatowanie liczb po polsku
window.EP = window.EP || {};
(function () {
  const U = EP.util = {};

  // Mulberry32 – powtarzalny generator liczb losowych
  U.rng = function (seed) {
    let a = seed >>> 0;
    const f = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (a0, b0) => a0 + (b0 - a0) * f();
    f.int = (a0, b0) => Math.floor(a0 + (b0 - a0 + 1) * f());
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    return f;
  };

  // Szum wartości 2D (deterministyczny)
  function hash2(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  U.hash2 = hash2;
  U.noise = function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  U.fbm = function (x, y, oct) {
    let s = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < (oct || 4); i++) {
      s += amp * U.noise(x * f + i * 17.3, y * f - i * 9.1);
      n += amp; amp *= 0.5; f *= 2.03;
    }
    return s / n;
  };

  U.clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smooth = (a, b, x) => { const t = U.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  const nf = (d) => new Intl.NumberFormat('pl-PL', { maximumFractionDigits: d, minimumFractionDigits: 0 });
  const NF = [nf(0), nf(1), nf(2), nf(3)];
  U.num = function (x, d) {
    if (d === undefined) d = Math.abs(x) >= 100 ? 0 : Math.abs(x) >= 10 ? 1 : 2;
    return NF[Math.min(3, d)].format(x);
  };

  // Odległość: m albo km
  U.dist = function (m) {
    if (m < 1) return U.num(m * 100, 0) + ' cm';
    if (m < 1000) return U.num(m, m < 10 ? 1 : 0) + ' m';
    return U.num(m / 1000, m < 10000 ? 2 : m < 100000 ? 1 : 0) + ' km';
  };
  U.area = function (m2) {
    if (m2 < 1e4) return U.num(m2, 0) + ' m²';
    if (m2 < 1e6) return U.num(m2 / 1e4, 1) + ' ha';
    return U.num(m2 / 1e6, m2 < 1e8 ? 1 : 0) + ' km²';
  };
  // Masa trotylu (kg) – g, kg, t, kt, Mt
  U.tnt = function (kg) {
    if (kg < 1) return U.num(kg * 1000, 0) + ' g';
    if (kg < 1000) return U.num(kg, kg < 10 ? 1 : 0) + ' kg';
    if (kg < 1e6) return U.num(kg / 1000, kg < 1e4 ? 1 : 0) + ' t';
    if (kg < 1e9) return U.num(kg / 1e6, kg < 1e7 ? 2 : 0) + ' kt';
    return U.num(kg / 1e9, 0) + ' Mt';
  };
  U.pressure = function (kpa) {
    if (kpa >= 1000) return U.num(kpa / 1000, 1) + ' MPa';
    return U.num(kpa, kpa < 10 ? 1 : 0) + ' kPa';
  };
  U.bigCount = function (n) {
    if (n < 1e4) return U.num(Math.round(n), 0);
    if (n < 1e6) return U.num(n / 1000, n < 1e5 ? 1 : 0) + ' tys.';
    if (n < 1e9) return U.num(n / 1e6, n < 1e7 ? 1 : 0) + ' mln';
    return U.num(n / 1e9, 1) + ' mld';
  };
  U.time = function (s) {
    if (s < 1) return U.num(s * 1000, 0) + ' ms';
    if (s < 60) return U.num(s, 1) + ' s';
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ' min ' + (r < 10 ? '0' : '') + r + ' s';
  };
  // Odmiana: 1 budynek, 2 budynki, 5 budynków
  U.plural = function (n, one, few, many) {
    n = Math.abs(Math.round(n));
    if (n === 1) return one;
    const d = n % 10, h = n % 100;
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
    return many;
  };
})();
