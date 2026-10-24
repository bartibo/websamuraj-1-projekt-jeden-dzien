'use strict';
/* Matematyka, losowość, szum proceduralny i wzory sejsmologiczne. */

const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  smooth(e0, e1, x) {
    const t = U.clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  },
  rand: (a = 0, b = 1) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  chance: p => Math.random() < p,
  gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  },
  /* Powtarzalny generator (mulberry32) – układ miasta jest zawsze ten sam. */
  rng(seed) {
    let a = seed >>> 0;
    const f = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (a, b) => a + f() * (b - a);
    f.int = (a, b) => Math.floor(a + f() * (b - a + 1));
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    return f;
  },
  hash2(x, y) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  },
  noise2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = U.hash2(xi, yi), b = U.hash2(xi + 1, yi);
    const c = U.hash2(xi, yi + 1), d = U.hash2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  },
  fbm2(x, y, oct = 4) {
    let s = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) {
      s += amp * U.noise2(x * f, y * f);
      n += amp;
      amp *= 0.5;
      f *= 2.03;
    }
    return s / n;
  },
  roman(n) {
    return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][U.clamp(Math.round(n), 1, 12)];
  },
  fmt(n, d = 1) {
    return n.toLocaleString('pl-PL', { minimumFractionDigits: d, maximumFractionDigits: d });
  },
  fmtBig(n) {
    if (n >= 1e12) return U.fmt(n / 1e12, 1) + ' bln';
    if (n >= 1e9) return U.fmt(n / 1e9, 1) + ' mld';
    if (n >= 1e6) return U.fmt(n / 1e6, 1) + ' mln';
    if (n >= 1e4) return U.fmt(n / 1e3, 0) + ' tys.';
    if (n >= 100) return U.fmt(n, 0);
    if (n >= 1) return U.fmt(n, 1);
    return U.fmt(n, 3);
  }
};

/* Wzory sejsmologiczne (przybliżone, uproszczone na potrzeby symulacji). */
const Seis = {
  /* Intensywność w skali Mercallego (MMI) w zależności od magnitudy i odległości.
     Dla M ≥ 4 – relacja Atkinson & Wald (2007), dla słabszych – prosta zależność liniowa. */
  mmi(M, distKm, depthKm, soil) {
    const R = Math.max(4, Math.sqrt(distKm * distKm + depthKm * depthKm));
    const lr = Math.log10(R);
    const aw = 12.27 + 2.270 * (M - 6) + 0.1304 * (M - 6) * (M - 6) - 1.30 * lr - 0.000707 * R
      + 1.95 * Math.max(0, Math.log10(R / 50)) - 0.577 * M * lr;
    const lin = 1.5 * M - 1.5 * lr + 0.25;
    const k = U.smooth(3.4, 4.2, M);
    let I = lin * (1 - k) + aw * k;
    I += Seis.SOIL[soil].dI;
    return U.clamp(I, 1, 12);
  },
  SOIL: {
    rock: { name: 'Lita skała', dI: -0.35, freq: 1.15, dur: 0.9 },
    stiff: { name: 'Grunt zwięzły', dI: 0, freq: 1, dur: 1 },
    soft: { name: 'Miękkie osady', dI: 0.8, freq: 0.72, dur: 1.3 }
  },
  /* Szczytowe przyspieszenie gruntu w g (Wald i in. 1999, odwrócone). */
  pgaG(I) {
    const cm = I < 5 ? Math.pow(10, (I - 1) / 2.2) : Math.pow(10, (I + 1.66) / 3.66);
    return Math.min(2.0, cm / 981);
  },
  /* Wizualna amplituda przemieszczenia gruntu w metrach (lekko przesadzona, żeby było widać). */
  visAmp(pga) {
    return Math.min(1.35, 0.85 * Math.pow(pga, 0.75));
  },
  energyJ: M => Math.pow(10, 1.5 * M + 4.8),
  /* Średnia liczba trzęsień o magnitudzie ≥ M na świecie w ciągu roku (Gutenberg–Richter). */
  perYear(M) {
    let n = Math.pow(10, 8.0 - M);
    if (M > 8) n *= Math.pow(10, -(M - 8) * 0.35);
    return n;
  },
  /* Długość pęknięcia uskoku (Wells & Coppersmith 1994) i czas trwania pękania. */
  ruptureKm: M => Math.pow(10, 0.59 * M - 2.44),
  durationReal(M) {
    return Math.max(0.5, Seis.ruptureKm(M) / 2.8 + (M > 4 ? 2 : 0.3));
  },
  tsunamiHeight(M, depth, dist, sea) {
    if (!sea || M < 6.9) return 0;
    const tbl = [[6.9, 0], [7.0, 1.4], [7.5, 3.2], [8.0, 5.5], [8.5, 8.5], [9.0, 12], [9.5, 15.5], [9.9, 19.5]];
    let H = 0;
    for (let i = 0; i < tbl.length - 1; i++) {
      if (M >= tbl[i][0] && M <= tbl[i + 1][0]) {
        const t = (M - tbl[i][0]) / (tbl[i + 1][0] - tbl[i][0]);
        H = U.lerp(tbl[i][1], tbl[i + 1][1], t);
      }
    }
    if (M > 9.9) H = 19.5;
    H *= U.clamp((85 - depth) / 50, 0, 1);
    H *= U.clamp(1.15 - dist / 450, 0.55, 1);
    return H;
  },
  /* Najsilniejsze zarejestrowane trzęsienie: Valdivia 1960, M 9,5. Powyżej – scenariusz hipotetyczny. */
  M_RECORD: 9.5,
  magClass(M) {
    if (M < 2) return { name: 'Mikrowstrząs', color: '#8fb3c9' };
    if (M < 4) return { name: 'Słabe', color: '#7fd1b9' };
    if (M < 5) return { name: 'Lekkie', color: '#b9e06a' };
    if (M < 6) return { name: 'Umiarkowane', color: '#ffd23f' };
    if (M < 7) return { name: 'Silne', color: '#ff9f1c' };
    if (M < 8) return { name: 'Bardzo silne', color: '#ff5a36' };
    if (M <= 9.5) return { name: 'Katastrofalne', color: '#e0115f' };
    return { name: 'Hipotetyczne', color: '#b43cf0' };
  }
};
