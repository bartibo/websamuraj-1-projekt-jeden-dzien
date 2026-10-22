/* Scena „Tablice barwne” – książka z sześcioma tablicami pseudoizochromatycznymi (w stylu Ishihary)
   rozłożona na stole, ok. 0,5 m od oczu.
   Tablice są generowane proceduralnie: koło upakowane kropkami różnej wielkości, cyfry z maski
   (Arial Black na płótnie pomocniczym). Kolory dobrane w liniowym RGB względem macierzy Machado 2009:
   • czerwono-zielone: tło i figura leżą (prawie) w płaszczyźnie rozpiętej przez kierunki zerowe macierzy
     protanopii i deuteranopii, więc dla obu typów figura różni się od tła tylko odrobiną jasności,
     którą maskuje losowy rozrzut jasności kropek;
   • klasyfikacyjna (26): „2” różni się od tła dokładnie wzdłuż kierunku zerowego protanopii,
     „6” – deuteranopii (protan widzi 6, deutan widzi 2);
   • niebiesko-żółta: różnica wzdłuż kierunku najmniej widocznego dla macierzy tritanopii. */
(function () {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const FOV = 40;

  /* kierunki zerowe macierzy Machado (liniowy RGB, wektory jednostkowe) */
  const N_P = [0.9896, -0.1437, -0.0029];   // protanopia: M·N_P = 0
  const N_D = [0.9221, -0.3860, 0.0284];    // deuteranopia: M·N_D = 0

  /* ---------- upakowanie kropek w kole jednostkowym (deterministyczne) ---------- */
  function packDots(seed) {
    const rnd = mulberry32(seed);
    const xs = [], ys = [], rs = [];
    const CS = 0.16, N = Math.ceil(2 / CS) + 1, gap = 0.008;
    const grid = [];
    for (let i = 0; i < N * N; i++) grid.push([]);
    const cell = v => Math.min(N - 1, Math.max(0, Math.floor((v + 1) / CS)));
    const tryPlace = (r0, r1, tries) => {
      for (let t = 0; t < tries; t++) {
        const r = r0 + (r1 - r0) * rnd();
        const lim = 1 - r - 0.012;
        const a = rnd() * 6.2831853, q = Math.sqrt(rnd()) * lim;
        const x = Math.cos(a) * q, y = Math.sin(a) * q;
        const cx = cell(x), cy = cell(y);
        let ok = true;
        for (let j = cy - 1; j <= cy + 1 && ok; j++) {
          if (j < 0 || j >= N) continue;
          for (let i = cx - 1; i <= cx + 1 && ok; i++) {
            if (i < 0 || i >= N) continue;
            const g = grid[j * N + i];
            for (let n = 0; n < g.length; n++) {
              const k = g[n], dx = xs[k] - x, dy = ys[k] - y, m = rs[k] + r + gap;
              if (dx * dx + dy * dy < m * m) { ok = false; break; }
            }
          }
        }
        if (ok) { grid[cy * N + cx].push(xs.length); xs.push(x); ys.push(y); rs.push(r); }
      }
    };
    tryPlace(0.045, 0.055, 60);
    tryPlace(0.035, 0.045, 600);
    tryPlace(0.027, 0.035, 3000);
    tryPlace(0.020, 0.027, 8000);
    tryPlace(0.014, 0.020, 12000);
    tryPlace(0.011, 0.014, 6000);
    // wzrost kropek do najbliższego sąsiada (gęstsze upakowanie)
    for (let k = 0; k < xs.length; k++) {
      const x = xs[k], y = ys[k];
      let slack = 1 - Math.hypot(x, y) - rs[k] - 0.012;
      const cx = cell(x), cy = cell(y);
      for (let j = cy - 1; j <= cy + 1; j++) {
        if (j < 0 || j >= N) continue;
        for (let i = cx - 1; i <= cx + 1; i++) {
          if (i < 0 || i >= N) continue;
          for (const m of grid[j * N + i]) {
            if (m === k) continue;
            const d = Math.hypot(xs[m] - x, ys[m] - y) - rs[m] - rs[k] - gap;
            if (d < slack) slack = d;
          }
        }
      }
      if (slack > 0) rs[k] = Math.min(rs[k] + slack * 0.85, Math.max(rs[k] * 1.5, 0.03), 0.058);
    }
    tryPlace(0.009, 0.013, 9000);   // drobne kropki w szczelinach
    return { xs, ys, rs };
  }

  /* ---------- maska cyfr ---------- */
  function digitMask(text, size) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const c = cv.getContext('2d', { willReadFrequently: true });
    let fs = size * 0.7;
    c.font = `900 ${fs}px "Arial Black", "Arial Bold", Arial, sans-serif`;
    let w = c.measureText(text).width;
    if (w > size * 0.82) { fs *= size * 0.82 / w; c.font = `900 ${fs}px "Arial Black", "Arial Bold", Arial, sans-serif`; w = c.measureText(text).width; }
    const m = c.measureText(text);
    const asc = m.actualBoundingBoxAscent || fs * 0.72, desc = m.actualBoundingBoxDescent || 0;
    c.fillStyle = '#000';
    c.textBaseline = 'alphabetic';
    c.fillText(text, (size - w) / 2, size / 2 + (asc - desc) / 2);
    const data = c.getImageData(0, 0, size, size).data;
    return (u, v) => {   // u, v ∈ [-1, 1]
      const x = Math.round((u + 1) / 2 * (size - 1)), y = Math.round((v + 1) / 2 * (size - 1));
      if (x < 0 || y < 0 || x >= size || y >= size) return false;
      return data[(y * size + x) * 4 + 3] > 127;
    };
  }

  /* ---------- kolory (liniowy RGB) ---------- */
  const lin2s = v => {
    v = Math.max(0, Math.min(1, v));
    return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
  };
  const clamp01 = v => Math.max(0, Math.min(1, v));

  /* Pary [tło, figura] dla tablic czerwono-zielonych – znalezione przeszukiwaniem tak, by po
     symulacji protanopii i deuteranopii różnica średnich ΔE*ab ≈ 4–5 (maskowana rozrzutem),
     a dla oka zdrowego ≈ 33–38. Losowy wybór pary i rozrzut są identyczne dla tła i figury. */
  const RG_SETS = [
    [[[0.32, 0.643, 0.134], [0.773, 0.551, 0.150]], [[0.357, 0.617, 0.249], [0.734, 0.490, 0.240]]],
    [[[0.171, 0.467, 0.241], [0.541, 0.373, 0.247]], [[0.189, 0.496, 0.159], [0.474, 0.391, 0.138]]],
    [[[0.200, 0.613, 0.334], [0.683, 0.472, 0.328]], [[0.166, 0.530, 0.322], [0.588, 0.452, 0.347]]]
  ];
  const TRITAN_SET = [[[0.448, 0.571, 0.089], [0.435, 0.481, 0.395]], [[0.620, 0.493, 0.035], [0.698, 0.481, 0.340]]];

  function jitter(base, r, jit, hue) {
    const k = 1 - jit + 2 * jit * r();
    const n0 = (r() - 0.5) * hue, n1 = (r() - 0.5) * hue, n2 = (r() - 0.5) * hue * 0.6;
    return [clamp01((base[0] + n0) * k), clamp01((base[1] + n1) * k), clamp01((base[2] + n2) * k)];
  }

  /* cls: 0 = tło, 1 = figura, 2 = druga figura (tablica klasyfikacyjna) */
  const PLATE_DEFS = [
    { answer: '12', type: 'kontrolna', seed: 101,
      color(cls, r) {
        if (cls) {
          const b = r() < 0.5 ? [0.86, 0.34, 0.06] : [0.80, 0.24, 0.05];
          return jitter(b, r, 0.2, 0.06);
        }
        const b = r() < 0.5 ? [0.10, 0.15, 0.25] : [0.16, 0.19, 0.24];
        return jitter(b, r, 0.25, 0.04);
      },
      note: 'Tablica kontrolna: liczbę 12 widzi każdy, także osoba z daltonizmem (figura różni się od tła jasnością). Kto jej nie odczyta, ma inny problem niż widzenie barw.' },
    { answer: '74', type: 'czerwono-zielona', seed: 202, set: 0,
      note: 'Prawidłowo: 74. Osoba z protanopią lub deuteranopią zwykle nie widzi żadnej liczby – kropki figury i tła mają dla niej ten sam kolor.' },
    { answer: '5', type: 'czerwono-zielona', seed: 303, set: 1,
      note: 'Prawidłowo: 5. Przy daltonizmie czerwono-zielonym (protanopia, deuteranopia) cyfra znika w tle.' },
    { answer: '29', type: 'czerwono-zielona', seed: 404, set: 2,
      note: 'Prawidłowo: 29. Osoba z deuteranopią lub protanopią zwykle nie odczytuje żadnej liczby albo zgaduje.' },
    { answer: '26', type: 'czerwono-zielona', seed: 505, split: true,
      color(cls, r) {
        const g = r() < 0.5 ? [0.06, 0.30, 0.07] : [0.09, 0.27, 0.12];
        let b = g;
        if (cls === 1) b = g.map((x, i) => x + 0.85 * N_P[i]);   // „2” – niewidoczna dla protanopii
        if (cls === 2) b = g.map((x, i) => x + 0.82 * N_D[i]);   // „6” – niewidoczna dla deuteranopii
        return jitter(b, r, 0.16, 0.03);
      },
      note: 'Tablica klasyfikacyjna. Prawidłowo: 26. Osoba z protanopią widzi zwykle tylko 6, a osoba z deuteranopią tylko 2 – tak odróżnia się te dwa typy daltonizmu.' },
    { answer: '45', type: 'niebiesko-żółta', seed: 606,
      color(cls, r) {
        const pr = TRITAN_SET[r() < 0.5 ? 0 : 1];
        return jitter(pr[cls ? 1 : 0], r, 0.28, 0.05);
      },
      note: 'Tablica niebiesko-żółta. Prawidłowo: 45. Osoba z tritanopią (rzadkie zaburzenie widzenia niebieskiego) nie widzi liczby; przy daltonizmie czerwono-zielonym jest widoczna.' }
  ];
  for (const d of PLATE_DEFS) {
    if (d.set !== undefined) {
      const pairs = RG_SETS[d.set];
      d.color = (cls, r) => {
        const pr = pairs[r() < 0.5 ? 0 : 1];
        return jitter(pr[cls ? 1 : 0], r, 0.3, 0.07);
      };
    }
  }

  /* położenie tablic w kadrze (u, v względem W, H; r względem W) */
  const LAYOUT = [
    { u: 365 / 1600, v: 322 / 900 }, { u: 650 / 1600, v: 322 / 900 }, { u: 507 / 1600, v: 592 / 900 },
    { u: 950 / 1600, v: 322 / 900 }, { u: 1235 / 1600, v: 322 / 900 }, { u: 1093 / 1600, v: 592 / 900 }
  ];
  const PR = 118 / 1600;

  /* układ kropek i kolory (niezależne od rozdzielczości) – liczone raz */
  let PLATE_CACHE = null;
  function buildPlates() {
    if (PLATE_CACHE) return PLATE_CACHE;
    PLATE_CACHE = PLATE_DEFS.map(def => {
      const dots = packDots(def.seed);
      const mask = digitMask(def.answer, 256);
      const r = mulberry32(def.seed * 7 + 1);
      const n = dots.xs.length;
      const cls = new Uint8Array(n), col = new Array(n), lin = new Array(n);
      for (let i = 0; i < n; i++) {
        let k = mask(dots.xs[i], dots.ys[i]) ? 1 : 0;
        if (k && def.split && dots.xs[i] > 0) k = 2;
        cls[i] = k;
        const c = def.color(k, r);
        lin[i] = c;
        col[i] = `rgb(${lin2s(c[0])},${lin2s(c[1])},${lin2s(c[2])})`;
      }
      return { def, dots, cls, col, lin };
    });
    return PLATE_CACHE;
  }

  function renderPlate(pl, R) {
    const S = Math.ceil(R * 2 + 4);
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d', { willReadFrequently: true });   // rasteryzacja na CPU – szybciej dla setek kółek
    const o = S / 2;
    c.fillStyle = '#f3eee2';
    c.beginPath(); c.arc(o, o, R, 0, 7); c.fill();
    const { xs, ys, rs } = pl.dots;
    for (let i = 0; i < xs.length; i++) {
      c.fillStyle = pl.col[i];
      c.beginPath(); c.arc(o + xs[i] * R, o + ys[i] * R, Math.max(0.6, rs[i] * R), 0, 6.2832); c.fill();
    }
    return cv;
  }

  const SCENE = {
    id: 'tablice',
    name: 'Tablice barwne',
    icon: '🎨',
    desc: 'Książka z tablicami do badania widzenia barw: odczytaj liczby z kropek, a potem włącz daltonizm i sprawdź, które znikają.',
    fovDeg: FOV,
    pupilMm: 4,
    night: false,
    defaultGaze: [LAYOUT[1].u, LAYOUT[1].v],
    plates: PLATE_DEFS.map((d, i) => ({ u: LAYOUT[i].u, v: LAYOUT[i].v, r: PR, answer: d.answer, type: d.type, note: d.note })),
    pois: [
      { u: LAYOUT[0].u, v: LAYOUT[0].v, label: 'Tablica 1 – kontrolna (0,5 m)' },
      { u: LAYOUT[1].u, v: LAYOUT[1].v, label: 'Tablica 2 – czerwono-zielona (0,5 m)' },
      { u: LAYOUT[4].u, v: LAYOUT[4].v, label: 'Tablica 5 – klasyfikacyjna (0,5 m)' },
      { u: LAYOUT[5].u, v: LAYOUT[5].v, label: 'Tablica 6 – niebiesko-żółta (0,45 m)' },
      { u: 0.93, v: 0.6, label: 'Kartka z odpowiedziami (0,45 m)' },
      { u: 0.5, v: 0.05, label: 'Ściana gabinetu (2,5 m)' }
    ],

    draw(P, W, H) {
      const c = P.ctx;
      const s = W / 1600;
      const rnd = mulberry32(4242);
      const font = (px, fam, w) => `${w || ''} ${Math.max(1, px)}px ${fam || 'Arial, Helvetica, sans-serif'}`.trim();

      /* głębia stołu: 1/odległość liniowe w y (płaszczyzna w perspektywie) */
      const yEdge = 112 * s;                  // dalsza krawędź stołu
      const D0 = 1 / 0.64, D1 = 1 / 0.36;     // dioptrie na krawędzi i na dole kadru
      const distAt = y => 1 / (D0 + (D1 - D0) * (y - yEdge) / (H - yEdge));

      /* ================= ŚCIANA W TLE (2,5 m, rozmyta) ================= */
      P.mat(2.6, { name: 'Ściana gabinetu' });
      let g = c.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, '#d9ddd2'); g.addColorStop(0.5, '#e6e8de'); g.addColorStop(1, '#cfd5cb');
      c.fillStyle = g; c.fillRect(0, 0, W, yEdge + 4 * s);
      // jasna plama światła z okna
      P.decor(c => {
        const gg = c.createRadialGradient(1150 * s, 40 * s, 10 * s, 1150 * s, 40 * s, 320 * s);
        gg.addColorStop(0, 'rgba(255,248,225,0.7)'); gg.addColorStop(1, 'rgba(255,248,225,0)');
        c.fillStyle = gg; c.fillRect(800 * s, 0, 700 * s, yEdge);
      });
      // regał z segregatorami (miękkie krawędzie)
      P.mat(2.4, { name: 'Regał z segregatorami' });
      c.fillStyle = '#b89772'; c.fillRect(120 * s, 0, 420 * s, yEdge);
      const binders = ['#3d6fb0', '#c4554d', '#d9a441', '#5f9a59', '#7b5ea7', '#3d6fb0', '#e07b39', '#4a8c8c', '#c4554d', '#d9a441', '#5f9a59', '#3a5a8c'];
      for (let i = 0; i < binders.length; i++) {
        const x = 132 * s + i * 33 * s;
        g = c.createLinearGradient(x, 0, x + 30 * s, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.15, binders[i]); g.addColorStop(0.85, binders[i]); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(x, 8 * s, 30 * s, 62 * s);
      }
      c.fillStyle = '#a3825f'; c.fillRect(120 * s, 70 * s, 420 * s, 8 * s);
      // rozmyta tablica Snellena na ścianie
      P.mat(2.6, { name: 'Tablica Snellena na ścianie' });
      g = c.createLinearGradient(780 * s, 0, 900 * s, 0);
      g.addColorStop(0, 'rgba(250,250,247,0)'); g.addColorStop(0.12, '#fafaf7'); g.addColorStop(0.88, '#fafaf7'); g.addColorStop(1, 'rgba(250,250,247,0)');
      c.fillStyle = g; c.fillRect(780 * s, 0, 120 * s, 96 * s);
      c.fillStyle = 'rgba(30,30,30,0.55)';
      for (let i = 0; i < 6; i++) {
        const w = (34 - i * 5) * s, h = (16 - i * 2.2) * s;
        c.fillRect(840 * s - w / 2, (6 + i * 15) * s, w, Math.max(2 * s, h * 0.6));
      }
      // roślina w tle
      P.mat(2.3, { name: 'Roślina w tle' });
      for (let i = 0; i < 26; i++) {
        const x = (1390 + (rnd() - 0.5) * 170) * s, y = (55 + (rnd() - 0.3) * 70) * s;
        c.fillStyle = ['rgba(70,120,60,0.85)', 'rgba(90,145,70,0.8)', 'rgba(60,105,55,0.85)'][i % 3];
        c.beginPath(); c.ellipse(x, y, 26 * s, 14 * s, rnd() * 3, 0, 7); c.fill();
      }

      /* ================= STÓŁ ================= */
      P.matGrad(0, yEdge, distAt(yEdge), 0, H, distAt(H), { name: 'Stół' });
      g = c.createLinearGradient(0, yEdge, 0, H);
      g.addColorStop(0, '#8a5a35'); g.addColorStop(0.5, '#9d6a40'); g.addColorStop(1, '#7b4e2c');
      c.fillStyle = g; c.fillRect(0, yEdge, W, H - yEdge);
      // krawędź blatu
      c.fillStyle = '#5c3a20'; c.fillRect(0, yEdge, W, 5 * s);
      c.fillStyle = 'rgba(255,220,180,0.35)'; c.fillRect(0, yEdge + 5 * s, W, 2 * s);
      // słoje drewna – gęstsze w głębi
      for (let i = 0; i < 90; i++) {
        const t = i / 90;
        const y = yEdge + 10 * s + (H - yEdge) * (t * t * 0.45 + t * 0.55);
        const amp = (2 + 6 * t) * s, ph = rnd() * 10, fr = 0.004 + rnd() * 0.004;
        c.strokeStyle = rnd() < 0.5 ? 'rgba(70,40,18,0.22)' : 'rgba(190,140,95,0.18)';
        c.lineWidth = (0.6 + 1.6 * t) * s;
        c.beginPath();
        for (let x = 0; x <= W; x += 20 * s) {
          const yy = y + Math.sin(x / s * fr + ph) * amp + Math.sin(x / s * fr * 3.1 + ph) * amp * 0.3;
          if (x === 0) c.moveTo(x, yy); else c.lineTo(x, yy);
        }
        c.stroke();
      }
      // spoina między deskami
      for (const t of [0.33, 0.72]) {
        const y = yEdge + (H - yEdge) * (t * t * 0.45 + t * 0.55);
        c.fillStyle = 'rgba(50,28,12,0.45)'; c.fillRect(0, y, W, (1 + 2 * t) * s);
      }
      // ciepłe światło lampki
      P.decor(c => {
        c.save(); c.globalCompositeOperation = 'lighter';
        const gg = c.createRadialGradient(780 * s, 420 * s, 50 * s, 780 * s, 420 * s, 900 * s);
        gg.addColorStop(0, 'rgba(255,225,170,0.16)'); gg.addColorStop(1, 'rgba(255,225,170,0)');
        c.fillStyle = gg; c.fillRect(0, yEdge, W, H - yEdge);
        c.restore();
      });

      /* ================= KUBEK HERBATY (lewy górny róg stołu) ================= */
      {
        const cx = 95 * s, cy = 215 * s, rx = 62 * s, ry = 30 * s, hh = 70 * s;
        P.decor(c => {
          c.fillStyle = 'rgba(40,20,5,0.3)';
          c.beginPath(); c.ellipse(cx + 18 * s, cy + hh + 10 * s, rx * 1.1, ry * 0.9, 0, 0, 7); c.fill();
        });
        P.mat(distAt(cy + hh), { name: 'Kubek z herbatą' });
        g = c.createLinearGradient(cx - rx, 0, cx + rx, 0);
        g.addColorStop(0, '#c9d8e0'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(1, '#9fb3bf');
        c.fillStyle = g;
        c.beginPath(); c.moveTo(cx - rx, cy); c.lineTo(cx - rx, cy + hh);
        c.ellipse(cx, cy + hh, rx, ry, 0, Math.PI, 0, true); c.lineTo(cx + rx, cy); c.closePath(); c.fill();
        c.strokeStyle = '#a9bcc6'; c.lineWidth = 9 * s;
        c.beginPath(); c.ellipse(cx + rx + 8 * s, cy + hh * 0.5, 18 * s, 26 * s, 0, -1.3, 1.3); c.stroke();
        c.fillStyle = '#e8eef1'; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 7); c.fill();
        c.fillStyle = '#8a4b1c'; c.beginPath(); c.ellipse(cx, cy + 3 * s, rx * 0.88, ry * 0.8, 0, 0, 7); c.fill();
        c.fillStyle = 'rgba(255,220,170,0.35)'; c.beginPath(); c.ellipse(cx - rx * 0.3, cy, rx * 0.3, ry * 0.25, 0, 0, 7); c.fill();
        c.fillStyle = '#2b5d8a'; c.font = font(11 * s, 'Arial, sans-serif', 'bold'); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('♥ OKO', cx - 6 * s, cy + hh * 0.62);
        P.decor(c => {
          c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 6 * s; c.lineCap = 'round';
          for (let k = 0; k < 2; k++) {
            c.beginPath(); c.moveTo(cx - 15 * s + k * 26 * s, cy - 8 * s);
            c.bezierCurveTo(cx - 40 * s + k * 26 * s, cy - 50 * s, cx + 10 * s + k * 26 * s, cy - 70 * s, cx - 10 * s + k * 26 * s, cy - 110 * s);
            c.stroke();
          }
          c.lineCap = 'butt';
        });
      }

      /* ================= KSIĄŻKA Z TABLICAMI ================= */
      const bk = { tl: [228 * s, 172 * s], tr: [1372 * s, 172 * s], br: [1400 * s, 772 * s], bl: [200 * s, 772 * s] };
      const quad = (a, b, cc, d) => { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(cc[0], cc[1]); c.lineTo(d[0], d[1]); c.closePath(); };
      const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      P.decor(c => {
        c.fillStyle = 'rgba(35,18,5,0.4)';
        c.beginPath(); c.moveTo(bk.tl[0] + 10 * s, bk.tl[1] + 14 * s); c.lineTo(bk.tr[0] + 22 * s, bk.tr[1] + 14 * s);
        c.lineTo(bk.br[0] + 30 * s, bk.br[1] + 22 * s); c.lineTo(bk.bl[0] + 14 * s, bk.bl[1] + 22 * s); c.closePath(); c.fill();
      });
      // okładka
      P.matGrad(0, bk.tl[1], distAt(bk.tl[1]), 0, bk.bl[1], distAt(bk.bl[1]), { name: 'Książka' });
      c.fillStyle = '#1f3552';
      quad([bk.tl[0] - 12 * s, bk.tl[1] - 8 * s], [bk.tr[0] + 12 * s, bk.tr[1] - 8 * s], [bk.br[0] + 14 * s, bk.br[1] + 14 * s], [bk.bl[0] - 14 * s, bk.bl[1] + 14 * s]);
      c.fill();
      // grubość bloku kartek (dolna krawędź)
      c.fillStyle = '#e4dccb';
      quad(bk.bl, bk.br, [bk.br[0] + 4 * s, bk.br[1] + 9 * s], [bk.bl[0] - 4 * s, bk.bl[1] + 9 * s]); c.fill();
      c.strokeStyle = 'rgba(120,105,80,0.5)'; c.lineWidth = 0.7 * s;
      for (let i = 1; i < 5; i++) {
        c.beginPath(); c.moveTo(bk.bl[0] - i * 0.8 * s, bk.bl[1] + i * 1.8 * s); c.lineTo(bk.br[0] + i * 0.8 * s, bk.br[1] + i * 1.8 * s); c.stroke();
      }
      // strony
      const midT = lerp(bk.tl, bk.tr, 0.5), midB = lerp(bk.bl, bk.br, 0.5);
      for (const side of [0, 1]) {
        const a = side ? midT : bk.tl, b = side ? bk.tr : midT, cc = side ? bk.br : midB, d = side ? midB : bk.bl;
        g = c.createLinearGradient(side ? midT[0] : bk.tl[0], 0, side ? bk.tr[0] : midT[0], 0);
        if (side) { g.addColorStop(0, '#d9d1bf'); g.addColorStop(0.08, '#f4efe3'); g.addColorStop(1, '#fbf8f0'); }
        else { g.addColorStop(0, '#fbf8f0'); g.addColorStop(0.92, '#f4efe3'); g.addColorStop(1, '#d9d1bf'); }
        c.fillStyle = g;
        c.beginPath(); c.moveTo(a[0], a[1]);
        c.quadraticCurveTo((a[0] + b[0]) / 2, a[1] - 10 * s, b[0], b[1]);
        c.lineTo(cc[0], cc[1]);
        c.quadraticCurveTo((cc[0] + d[0]) / 2, d[1] - 8 * s, d[0], d[1]);
        c.closePath(); c.fill();
      }
      P.decor(c => {
        const gg = c.createLinearGradient(midT[0] - 40 * s, 0, midT[0] + 40 * s, 0);
        gg.addColorStop(0, 'rgba(90,70,40,0)'); gg.addColorStop(0.5, 'rgba(90,70,40,0.28)'); gg.addColorStop(1, 'rgba(90,70,40,0)');
        c.fillStyle = gg; c.fillRect(midT[0] - 40 * s, midT[1], 80 * s, midB[1] - midT[1]);
      });
      // nagłówki i numery stron
      c.fillStyle = '#6d6455'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = font(11 * s, 'Georgia, serif', 'italic');
      c.fillText('Tablice do badania widzenia barw', 510 * s, 196 * s);
      c.fillText('Badanie przesiewowe · światło dzienne', 1090 * s, 196 * s);
      c.font = font(10 * s, 'Georgia, serif');
      c.fillText('— 14 —', 510 * s, 752 * s);
      c.fillText('— 15 —', 1090 * s, 752 * s);

      /* ================= TABLICE ================= */
      const plates = buildPlates();
      const R = PR * W;
      this._plateData = plates;   // do testów (symulacja daltonizmu w harnessie)
      plates.forEach((pl, i) => {
        const cx = LAYOUT[i].u * W, cy = LAYOUT[i].v * H;
        const dist = distAt(cy);
        P.decor(c => {
          c.strokeStyle = 'rgba(120,100,70,0.25)'; c.lineWidth = 2 * s;
          c.beginPath(); c.arc(cx, cy, R + 3 * s, 0, 7); c.stroke();
        });
        P.mat(dist, { name: 'Tablica ' + (i + 1) });
        const img = renderPlate(pl, R);
        // kolor: gotowy obraz tablicy (tylko płótno kolorowe), dane: koło w materiale tablicy
        P.decor(c => c.drawImage(img, cx - img.width / 2, cy - img.height / 2));
        P.dataOnly(c => { c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill(); });
        c.fillStyle = '#8b8170'; c.font = font(11 * s, 'Georgia, serif'); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(String(i + 1), cx + R * 0.95, cy + R * 0.98);
      });

      /* ================= OKULARY (lewy dół) ================= */
      {
        const ox = 120 * s, oy = 760 * s;
        const dd = distAt(oy);
        P.decor(c => {
          c.fillStyle = 'rgba(30,15,5,0.28)';
          for (const dx of [-56, 56]) { c.beginPath(); c.ellipse(ox + (dx + 10) * s, oy + 16 * s, 62 * s, 42 * s, 0, 0, 7); c.fill(); }
        });
        P.mat(dd, { name: 'Okulary' });
        c.strokeStyle = '#2a2320'; c.lineWidth = 6 * s;
        // zauszniki
        c.beginPath(); c.moveTo(ox - 112 * s, oy - 18 * s); c.quadraticCurveTo(ox - 40 * s, oy - 70 * s, ox + 60 * s, oy - 62 * s); c.stroke();
        c.beginPath(); c.moveTo(ox + 112 * s, oy - 18 * s); c.quadraticCurveTo(ox + 150 * s, oy - 60 * s, ox + 90 * s, oy - 78 * s); c.stroke();
        for (const dx of [-56, 56]) {
          const lx = ox + dx * s;
          g = c.createLinearGradient(lx - 50 * s, oy - 40 * s, lx + 50 * s, oy + 40 * s);
          g.addColorStop(0, 'rgba(200,225,240,0.55)'); g.addColorStop(0.5, 'rgba(170,200,220,0.3)'); g.addColorStop(1, 'rgba(210,230,245,0.55)');
          c.fillStyle = g;
          c.beginPath(); c.ellipse(lx, oy, 54 * s, 38 * s, 0, 0, 7); c.fill();
          c.lineWidth = 7 * s; c.strokeStyle = '#2a2320'; c.stroke();
        }
        c.lineWidth = 6 * s;
        c.beginPath(); c.moveTo(ox - 6 * s, oy - 14 * s); c.quadraticCurveTo(ox, oy - 26 * s, ox + 6 * s, oy - 14 * s); c.stroke();
        P.decor(c => {
          c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 3 * s;
          for (const dx of [-56, 56]) { c.beginPath(); c.arc(ox + (dx - 12) * s, oy - 8 * s, 22 * s, 3.6, 4.4); c.stroke(); }
        });
      }

      /* ================= KARTKA Z ODPOWIEDZIAMI PACJENTA ================= */
      {
        const px = 1408 * s, py = 280 * s, pw = 230 * s, ph = 560 * s, ang = 0.06;
        P.decor(c => {
          c.save(); c.translate(px + 10 * s, py + 12 * s); c.rotate(ang);
          c.fillStyle = 'rgba(35,18,5,0.3)'; c.fillRect(0, 0, pw, ph); c.restore();
        });
        c.save(); c.translate(px, py); c.rotate(ang);
        P.matGrad(0, 0, distAt(py), 0, ph, distAt(py + ph), { name: 'Kartka z odpowiedziami' });
        c.fillStyle = '#fdfcf7'; c.fillRect(0, 0, pw, ph);
        c.strokeStyle = 'rgba(120,160,200,0.45)'; c.lineWidth = 0.8 * s;
        for (let y = 70 * s; y < ph - 10 * s; y += 26 * s) { c.beginPath(); c.moveTo(8 * s, y); c.lineTo(pw - 8 * s, y); c.stroke(); }
        c.strokeStyle = 'rgba(220,90,90,0.5)'; c.beginPath(); c.moveTo(34 * s, 0); c.lineTo(34 * s, ph); c.stroke();
        c.fillStyle = '#1f2d55'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        c.font = font(15 * s, 'Georgia, serif', 'bold italic');
        c.fillText('Widzenie barw', 40 * s, 30 * s);
        c.font = font(11 * s, 'Georgia, serif', 'italic');
        c.fillText('pacjent: Jan N., 43 l.', 40 * s, 50 * s);
        const ans = [['1.', '12', '✓'], ['2.', '— nic', '✗'], ['3.', '— ?', '✗'], ['4.', '70 ?', '✗'], ['5.', '2', '!'], ['6.', '45', '✓']];
        c.font = font(15 * s, 'Georgia, serif', 'italic');
        ans.forEach(([n, a, m], i) => {
          const y = (66 + 26 * (i + 1)) * s;
          c.fillStyle = '#1f2d55'; c.fillText(n, 12 * s, y); c.fillText(a, 44 * s, y);
          c.fillStyle = m === '✓' ? '#2e7d32' : '#c62828'; c.fillText(m, 118 * s, y);
        });
        c.fillStyle = '#c62828'; c.font = font(12 * s, 'Georgia, serif', 'italic');
        c.fillText('wniosek: podejrzenie', 12 * s, 290 * s);
        c.fillText('deuteranopii →', 12 * s, 307 * s);
        c.fillText('anomaloskop', 12 * s, 324 * s);
        c.fillStyle = '#4b4b4b'; c.font = font(9 * s, 'Arial, sans-serif');
        ['Badanie wykonano przy świetle', 'dziennym, bez okularów barwnych.', 'Czas na odczyt jednej tablicy: 3 s.'].forEach((t, i) => c.fillText(t, 12 * s, (360 + i * 13) * s));
        c.strokeStyle = '#1f2d55'; c.lineWidth = 1 * s;
        c.beginPath(); c.moveTo(110 * s, 430 * s); c.bezierCurveTo(130 * s, 410 * s, 140 * s, 445 * s, 160 * s, 425 * s); c.bezierCurveTo(170 * s, 415 * s, 180 * s, 440 * s, 205 * s, 428 * s); c.stroke();
        c.restore();
      }

      /* ================= OŁÓWEK ================= */
      {
        const x0 = 560 * s, y0 = 850 * s, x1 = 980 * s, y1 = 812 * s;
        const ang = Math.atan2(y1 - y0, x1 - x0), len = Math.hypot(x1 - x0, y1 - y0), w = 15 * s;
        P.decor(c => {
          c.save(); c.translate(x0 + 6 * s, y0 + 10 * s); c.rotate(ang);
          c.fillStyle = 'rgba(30,15,5,0.3)'; c.fillRect(0, -w / 2, len, w); c.restore();
        });
        P.mat(distAt((y0 + y1) / 2), { name: 'Ołówek' });
        c.save(); c.translate(x0, y0); c.rotate(ang);
        g = c.createLinearGradient(0, -w / 2, 0, w / 2);
        g.addColorStop(0, '#f6d35b'); g.addColorStop(0.5, '#e8b622'); g.addColorStop(1, '#b8860b');
        c.fillStyle = g; c.fillRect(0, -w / 2, len * 0.86, w);
        c.fillStyle = '#c9c9c9'; c.fillRect(-18 * s, -w / 2, 18 * s, w);
        c.fillStyle = '#e57373'; c.fillRect(-36 * s, -w / 2, 18 * s, w);
        c.fillStyle = '#e9c9a0';
        c.beginPath(); c.moveTo(len * 0.86, -w / 2); c.lineTo(len, 0); c.lineTo(len * 0.86, w / 2); c.closePath(); c.fill();
        c.fillStyle = '#333'; c.beginPath(); c.moveTo(len * 0.96, -w * 0.15); c.lineTo(len, 0); c.lineTo(len * 0.96, w * 0.15); c.closePath(); c.fill();
        c.fillStyle = '#2d2d2d'; c.font = font(8 * s, 'Arial, sans-serif', 'bold'); c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillText('HB  ·  OŁÓWEK GRAFITOWY', 40 * s, 0.5 * s);
        c.restore();
      }

      /* ================= WINIETA ================= */
      P.decor(c => {
        const gg = c.createRadialGradient(W / 2, H * 0.5, H * 0.4, W / 2, H * 0.5, W * 0.62);
        gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(25,12,0,0.3)');
        c.fillStyle = gg; c.fillRect(0, 0, W, H);
      });
    }
  };

  window.SCENES = window.SCENES || [];
  SCENES.push(SCENE);
})();
