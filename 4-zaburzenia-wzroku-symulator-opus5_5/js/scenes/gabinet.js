/* Scena „Gabinet okulisty” – widok pacjenta siedzącego w fotelu badawczym.
   Wąskie pole widzenia (24°) jest celowe: litery tablicy Snellena mają na ekranie
   wielkość kątową zgodną z rzeczywistą tablicą na 5 m (5′/V), bo rozmycie w aplikacji
   liczone jest z tego samego FOV. Oczy pacjenta: 1,2 m nad podłogą (pozycja siedząca). */
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

  const FOV = 24;
  const EYE = 1.2;          // wysokość oczu siedzącego pacjenta [m]
  const ZB = 5;             // tylna ściana z tablicą
  const XL = -0.62;         // lewa ściana (z oknem)

  /* ---------- optotypy Sloana na siatce 5×5 (wysokość = 5 jednostek, kreska = 1) ---------- */
  const PI = Math.PI;
  const GLYPHS = {
    E: [['r', 0, 0, 1, 5], ['r', 0, 0, 5, 1], ['r', 0, 2, 4.6, 1], ['r', 0, 4, 5, 1]],
    F: [['r', 0, 0, 1, 5], ['r', 0, 0, 5, 1], ['r', 0, 2, 4.2, 1]],
    P: [['r', 0, 0, 1, 5], ['r', 0, 0, 3, 1], ['r', 0, 2, 3, 1], ['a', 3, 1.5, 1.5, 0.5, -PI / 2, PI / 2]],
    B: [['r', 0, 0, 1, 5], ['r', 0, 0, 3, 1], ['r', 0, 2, 3, 1], ['r', 0, 4, 3, 1],
      ['a', 3, 1.5, 1.5, 0.5, -PI / 2, PI / 2], ['a', 3, 3.5, 1.5, 0.5, -PI / 2, PI / 2]],
    D: [['r', 0, 0, 1, 5], ['r', 0, 0, 2.5, 1], ['r', 0, 4, 2.5, 1], ['a', 2.5, 2.5, 2.5, 1.5, -PI / 2, PI / 2]],
    O: [['a', 2.5, 2.5, 2.5, 1.5, 0, 2 * PI]],
    C: [['a', 2.5, 2.5, 2.5, 1.5, 0.52, 2 * PI - 0.52]],
    U: [['r', 0, 0, 1, 2.5], ['r', 4, 0, 1, 2.5], ['a', 2.5, 2.5, 2.5, 1.5, 0, PI]],
    T: [['r', 0, 0, 5, 1], ['r', 2, 0, 1, 5]],
    L: [['r', 0, 0, 1, 5], ['r', 0, 4, 5, 1]],
    H: [['r', 0, 0, 1, 5], ['r', 4, 0, 1, 5], ['r', 0, 2, 5, 1]],
    Z: [['r', 0, 0, 5, 1], ['r', 0, 4, 5, 1], ['p', 3.55, 1, 5, 1, 1.45, 4, 0, 4]],
    N: [['r', 0, 0, 1, 5], ['r', 4, 0, 1, 5], ['p', 0.2, 0, 1.5, 0, 4.8, 5, 3.5, 5]],
    K: [['r', 0, 0, 1, 5], ['p', 0.8, 2.3, 3.6, 0, 5, 0, 0.8, 3.5], ['p', 1.7, 2.0, 5, 5, 3.6, 5, 0.9, 2.9]]
  };

  function glyphPath(c, ch, x, y, h) {
    const u = h / 5;
    const parts = GLYPHS[ch];
    for (const p of parts) {
      if (p[0] === 'r') {
        c.rect(x + p[1] * u, y + p[2] * u, p[3] * u, p[4] * u);
      } else if (p[0] === 'a') {
        const cx = x + p[1] * u, cy = y + p[2] * u, R = p[3] * u, r = p[4] * u, a0 = p[5], a1 = p[6];
        if (a1 - a0 >= 2 * PI - 1e-6) {
          c.moveTo(cx + R, cy); c.arc(cx, cy, R, 0, 2 * PI, false); c.closePath();
          c.moveTo(cx + r, cy); c.arc(cx, cy, r, 2 * PI, 0, true); c.closePath();
        } else {
          c.moveTo(cx + R * Math.cos(a0), cy + R * Math.sin(a0));
          c.arc(cx, cy, R, a0, a1, false);
          c.lineTo(cx + r * Math.cos(a1), cy + r * Math.sin(a1));
          c.arc(cx, cy, r, a1, a0, true);
          c.closePath();
        }
      } else {
        c.moveTo(x + p[1] * u, y + p[2] * u);
        for (let i = 3; i < p.length; i += 2) c.lineTo(x + p[i] * u, y + p[i + 1] * u);
        c.closePath();
      }
    }
  }

  /* wiersze tablicy: [opis, visus, litery, odległość, z której oko zdrowe czyta wiersz] */
  const ROWS = [
    ['0,1', 0.1, 'E', '50 m'],
    ['0,2', 0.2, 'FP', '25 m'],
    ['0,3', 0.3, 'TOZ', '16,7 m'],
    ['0,4', 0.4, 'LPED', '12,5 m'],
    ['0,5', 0.5, 'PECFD', '10 m'],
    ['0,6', 0.6, 'EDFCZP', '8,3 m'],
    ['0,7', 0.7, 'FELOPZD', '7,1 m'],
    ['0,8', 0.8, 'DEFPOTEC', '6,3 m'],
    ['0,9', 0.9, 'LEFODPCT', '5,6 m'],
    ['1,0', 1.0, 'FDPLTCEO', '5 m'],
    ['1,25', 1.25, 'HNBZUKED', '4 m'],
    ['1,5', 1.5, 'UZKHNBEP', '3,3 m']
  ];

  function wrapLines(c, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  window.SCENES = window.SCENES || [];
  SCENES.push({
    id: 'gabinet',
    name: 'Gabinet okulisty',
    icon: '🩺',
    desc: 'Siedzisz w fotelu badawczym: przeczytaj tablicę Snellena z 5 m (każdy wiersz to inna ostrość wzroku), a potem kartę do czytania z bliska w dłoni.',
    fovDeg: FOV,
    pupilMm: 4,
    night: false,
    defaultGaze: [0.5, 0.42],
    pois: [
      { u: 0.5, v: 0.17, label: 'Tablica Snellena – linia 0,1 (5 m)' },
      { u: 0.5, v: 0.5, label: 'Tablica Snellena – linia 1,0 (5 m)' },
      { u: 0.17, v: 0.72, label: 'Karta do czytania (40 cm)' },
      { u: 0.1, v: 0.25, label: 'Widok za oknem (30–300 m)' },
      { u: 0.62, v: 0.68, label: 'Test czerwono-zielony (5 m)' },
      { u: 0.93, v: 0.27, label: 'Foropter (1,2 m)' },
      { u: 0.71, v: 0.12, label: 'Zegar ścienny (5 m)' }
    ],

    draw(P, W, H) {
      const c = P.ctx;
      const s = W / 1600;
      const f = (W / 2) / Math.tan(FOV / 2 * Math.PI / 180);
      const yH = H * 0.5;
      const pr = (X, Y, Z) => [W / 2 + f * X / Z, yH + f * (EYE - Y) / Z];
      const k5 = f / ZB;                       // piksele na metr na tylnej ścianie
      const rnd = mulberry32(20261022);
      const font = (px, fam, w) => `${w || ''} ${Math.max(1, px)}px ${fam || 'Arial, Helvetica, sans-serif'}`.trim();

      const xCorner = pr(XL, 0, ZB)[0];
      const zAtX = x => -XL * f / (W / 2 - x);   // głębia lewej ściany w kolumnie ekranu x

      /* ================= TYLNA ŚCIANA ================= */
      P.mat(ZB, { name: 'Ściana gabinetu' });
      let g = c.createLinearGradient(xCorner, 0, W, 0);
      g.addColorStop(0, '#eef0e6'); g.addColorStop(0.45, '#e2e5da'); g.addColorStop(1, '#cfd3c8');
      c.fillStyle = g;
      c.fillRect(xCorner - 2, 0, W - xCorner + 2, H);
      // dolna część ściany – zmywalna boazeria
      const yRail = pr(0, 0.9, ZB)[1];
      g = c.createLinearGradient(xCorner, 0, W, 0);
      g.addColorStop(0, '#a9c3bd'); g.addColorStop(1, '#8eaaa4');
      c.fillStyle = g;
      c.fillRect(xCorner - 2, yRail, W - xCorner + 2, H - yRail);
      c.fillStyle = '#b48a5e';
      c.fillRect(xCorner - 2, yRail - 0.018 * k5, W - xCorner + 2, 0.03 * k5);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillRect(xCorner - 2, yRail - 0.018 * k5, W - xCorner + 2, 0.007 * k5);
      // pionowe panele boazerii
      c.fillStyle = 'rgba(60,90,85,0.18)';
      for (let X = -0.6; X < 1.3; X += 0.3) {
        const x = pr(X, 0, ZB)[0];
        if (x > xCorner) c.fillRect(x, yRail + 0.012 * k5, 1.2 * s, H);
      }
      // gniazdko elektryczne
      P.mat(ZB, { name: 'Gniazdko' });
      {
        const [gx, gy] = pr(0.95, 0.7, ZB);
        c.fillStyle = '#f4f3ee'; c.fillRect(gx - 0.04 * k5, gy - 0.04 * k5, 0.08 * k5, 0.08 * k5);
        c.fillStyle = '#9a9a92';
        c.beginPath(); c.arc(gx - 0.012 * k5, gy, 0.005 * k5, 0, 7); c.arc(gx + 0.012 * k5, gy, 0.005 * k5, 0, 7); c.fill();
      }
      // smuga dziennego światła z okna na tylnej ścianie
      P.decor(c => {
        c.save();
        c.globalCompositeOperation = 'lighter';
        const [ax, ay] = pr(XL, 2.3, ZB), [bx, by] = pr(XL, 0.95, ZB);
        const g2 = c.createLinearGradient(ax, 0, ax + 420 * s, 0);
        g2.addColorStop(0, 'rgba(255,240,205,0.30)'); g2.addColorStop(1, 'rgba(255,240,205,0)');
        c.fillStyle = g2;
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + 300 * s, ay + 30 * s); c.lineTo(bx + 420 * s, by + 60 * s); c.lineTo(bx, by); c.closePath(); c.fill();
        c.restore();
      });

      /* ================= LEWA ŚCIANA Z OKNEM ================= */
      const zLeft0 = zAtX(0);
      P.matGrad(0, 0, zLeft0, xCorner, 0, ZB, { name: 'Ściana boczna' });
      g = c.createLinearGradient(0, 0, xCorner, 0);
      g.addColorStop(0, '#c8ccc1'); g.addColorStop(1, '#d9dcd1');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(xCorner, 0); c.lineTo(xCorner, H); c.lineTo(0, H); c.closePath(); c.fill();
      // boazeria na lewej ścianie (dolna część, zbiega do punktu zbiegu)
      {
        const a = pr(XL, 0.9, zLeft0), b = pr(XL, 0.9, ZB);
        c.fillStyle = '#9db8b2';
        c.beginPath(); c.moveTo(a[0] - 2, a[1]); c.lineTo(b[0], b[1]); c.lineTo(b[0], H); c.lineTo(a[0] - 2, H); c.closePath(); c.fill();
      }

      // okno – rama w płaszczyźnie ściany
      const Z0w = 2.6, Z1w = 4.8, Ys = 0.86, Yt = 2.6;
      const wq = [pr(XL, Yt, Z0w), pr(XL, Yt, Z1w), pr(XL, Ys, Z1w), pr(XL, Ys, Z0w)];
      const winPath = (cc) => { cc.beginPath(); cc.moveTo(wq[0][0], wq[0][1]); for (let i = 1; i < 4; i++) cc.lineTo(wq[i][0], wq[i][1]); cc.closePath(); };

      // widok za oknem (przycięty do otworu okna)
      c.save();
      winPath(c); c.clip();
      const G = 4.4;   // oczy pacjenta nad poziomem ulicy (I piętro)
      const yG = Z => yH + f * G / Z;          // poziom gruntu na odległości Z
      const yAt = (h, Z) => yH - f * (h - G) / Z; // wysokość h nad gruntem
      P.mat(Infinity, { name: 'Niebo', em: 0.04 });
      g = c.createLinearGradient(0, 0, 0, yH + 60 * s);
      g.addColorStop(0, '#79abdc'); g.addColorStop(0.65, '#b5d3ec'); g.addColorStop(1, '#e3eef3');
      c.fillStyle = g; c.fillRect(0, 0, xCorner, H);
      // chmury
      c.fillStyle = 'rgba(255,255,255,0.85)';
      for (const [cx, cy, r] of [[60, 70, 40], [110, 60, 55], [170, 85, 38], [230, 150, 30], [260, 140, 42]]) {
        c.beginPath(); c.arc(cx * s, cy * s, r * s, 0, 7); c.fill();
      }
      // pas drzew na horyzoncie (300 m)
      P.mat(300, { name: 'Drzewa na horyzoncie' });
      c.fillStyle = '#6f8f6a';
      c.beginPath(); c.moveTo(0, yG(300));
      for (let x = 0; x <= xCorner + 10; x += 9 * s) c.lineTo(x, yAt(11 + 3 * Math.sin(x * 0.07 / s) + 2 * Math.pow(Math.sin(x * 0.31 / s), 2), 300));
      c.lineTo(xCorner + 10, yG(300)); c.closePath(); c.fill();
      // blok mieszkalny (180 m)
      P.mat(180, { name: 'Blok za oknem' });
      {
        const Z = 180, x0 = 70 * s, x1 = 300 * s, top = yAt(16.5, Z), bot = yG(Z);
        g = c.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, '#e9dfcf'); g.addColorStop(1, '#d4c7b2');
        c.fillStyle = g; c.fillRect(x0, top, x1 - x0, bot - top);
        c.fillStyle = '#b9ab95'; c.fillRect(x0, top - 3 * s, x1 - x0, 4 * s);
        const st = f * 2.8 / Z;
        for (let fl = 0; fl < 5; fl++) {
          const yy = bot - (fl + 1) * st + st * 0.3;
          for (let x = x0 + 8 * s; x < x1 - 14 * s; x += 30 * s) {
            c.fillStyle = (fl + Math.round(x)) % 3 ? '#5f7d95' : '#7f9cb0';
            c.fillRect(x, yy, 16 * s, st * 0.42);
          }
          c.fillStyle = 'rgba(120,100,80,0.35)'; c.fillRect(x0, yy + st * 0.55, x1 - x0, 3 * s);
        }
      }
      // kamienica z czerwonej cegły (70 m)
      P.mat(70, { name: 'Kamienica za oknem' });
      {
        const Z = 70, x0 = 215 * s, x1 = xCorner + 10, top = yAt(15, Z), bot = yG(Z);
        c.fillStyle = '#a4553f'; c.fillRect(x0, top, x1 - x0, bot - top);
        c.fillStyle = '#8b4533';
        for (let y = top; y < bot; y += 6 * s) c.fillRect(x0, y, x1 - x0, 1 * s);
        c.fillStyle = '#e6dccb'; c.fillRect(x0, top, 6 * s, bot - top);
        const st = f * 3.6 / Z;
        for (let fl = 0; fl < 4; fl++) {
          const yy = bot - (fl + 1) * st + st * 0.22;
          for (const xx of [x0 + 26 * s, x0 + 100 * s]) {
            c.fillStyle = '#efe6d6'; c.fillRect(xx - 5 * s, yy - 5 * s, 56 * s, st * 0.55 + 10 * s);
            c.fillStyle = '#3e5568'; c.fillRect(xx, yy, 46 * s, st * 0.55);
            c.fillStyle = '#e8e0d0'; c.fillRect(xx + 21 * s, yy, 4 * s, st * 0.55);
            c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(xx + 2 * s, yy + 2 * s, 17 * s, st * 0.2);
          }
        }
      }
      // drzewo (30 m) – korona wchodzi z lewej
      P.mat(30, { name: 'Drzewo za oknem' });
      {
        const Z = 30;
        c.fillStyle = '#5a4532';
        c.fillRect(52 * s, yAt(6, Z), 22 * s, yG(Z) - yAt(6, Z));
        const cols = ['#3f6b35', '#4f7d3d', '#5f8f45', '#6fa04e', '#86b45a'];
        for (let i = 0; i < 150; i++) {
          const a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd());
          const x = 45 * s + Math.cos(a) * rr * 125 * s;
          const y = 350 * s + Math.sin(a) * rr * 230 * s;
          const shade = Math.min(4, Math.floor((1 - (y - 120 * s) / (500 * s)) * 3 + rnd() * 2.2));
          c.fillStyle = cols[Math.max(0, shade)];
          c.beginPath(); c.arc(x, y, (14 + rnd() * 18) * s, 0, 7); c.fill();
        }
      }
      // odbicie w szybie
      P.decor(c => {
        c.fillStyle = 'rgba(255,255,255,0.10)';
        c.beginPath(); c.moveTo(0, 120 * s); c.lineTo(xCorner, 40 * s); c.lineTo(xCorner, 140 * s); c.lineTo(0, 300 * s); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.06)';
        c.beginPath(); c.moveTo(0, 360 * s); c.lineTo(xCorner, 220 * s); c.lineTo(xCorner, 245 * s); c.lineTo(0, 400 * s); c.closePath(); c.fill();
      });
      c.restore();

      // rama okna: ościeże, słupek, parapet
      P.matGrad(0, 0, zLeft0, xCorner, 0, ZB, { name: 'Okno' });
      c.fillStyle = '#f3f3ef';
      {
        // pionowy słupek i dalsza krawędź ramy
        for (const [za, zb] of [[3.55, 3.63], [Z1w - 0.07, Z1w]]) {
          const a = pr(XL, Yt, za), b = pr(XL, Yt, zb), d = pr(XL, Ys, zb), e = pr(XL, Ys, za);
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.lineTo(e[0], e[1]); c.closePath(); c.fill();
        }
        // grubość ramy po dalszej stronie (widoczna płaszczyzna)
        const a = pr(XL, Yt, Z1w), b = pr(XL - 0.06, Yt, Z1w), d = pr(XL - 0.06, Ys, Z1w), e = pr(XL, Ys, Z1w);
        c.fillStyle = '#dcdcd5';
        c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.lineTo(e[0], e[1]); c.closePath(); c.fill();
        // klamka
        const [hx, hy] = pr(XL, 1.35, 3.59);
        c.fillStyle = '#c9c9c2'; c.fillRect(hx - 3 * s, hy - 26 * s, 7 * s, 52 * s);
        // parapet
        const p0 = pr(XL, Ys, zLeft0), p1 = pr(XL, Ys, Z1w + 0.05), p2 = pr(XL + 0.22, Ys, Z1w + 0.05), p3 = pr(XL + 0.22, Ys, 2.0);
        g = c.createLinearGradient(0, p1[1], 0, H);
        g.addColorStop(0, '#f6f5f0'); g.addColorStop(1, '#dedcd2');
        c.fillStyle = g;
        c.beginPath(); c.moveTo(p0[0] - 4, p0[1]); c.lineTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.lineTo(p3[0], p3[1]); c.closePath(); c.fill();
      }
      // zasłona przy bliższej krawędzi okna
      P.matGrad(0, 0, zLeft0, 50 * s, 0, zAtX(50 * s), { name: 'Zasłona' });
      g = c.createLinearGradient(0, 0, 46 * s, 0);
      g.addColorStop(0, '#6d7f9a'); g.addColorStop(0.3, '#8b9cb5'); g.addColorStop(0.55, '#6c7d97'); g.addColorStop(0.8, '#90a1b9'); g.addColorStop(1, '#71839c');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(40 * s, 0);
      c.bezierCurveTo(32 * s, 300 * s, 48 * s, 500 * s, 36 * s, H); c.lineTo(0, H); c.closePath(); c.fill();
      // cień w narożniku
      P.decor(c => {
        const g2 = c.createLinearGradient(xCorner - 30 * s, 0, xCorner + 25 * s, 0);
        g2.addColorStop(0, 'rgba(70,75,65,0)'); g2.addColorStop(0.55, 'rgba(70,75,65,0.16)'); g2.addColorStop(1, 'rgba(70,75,65,0)');
        c.fillStyle = g2; c.fillRect(xCorner - 30 * s, 0, 55 * s, H);
      });

      /* ================= PLAKAT „BUDOWA OKA” ================= */
      {
        const [px0, py0] = pr(-0.49, 1.58, ZB), [px1, py1] = pr(-0.225, 1.12, ZB);
        const pw = px1 - px0, ph = py1 - py0;
        P.decor(c => { c.fillStyle = 'rgba(40,45,35,0.18)'; c.fillRect(px0 + 4 * s, py0 + 5 * s, pw, ph); });
        P.mat(ZB, { name: 'Plakat „Budowa oka”' });
        c.fillStyle = '#fbfaf5'; c.fillRect(px0, py0, pw, ph);
        c.fillStyle = '#2b5d8a'; c.fillRect(px0, py0, pw, ph * 0.12);
        c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = font(22 * s, 'Arial, sans-serif', 'bold');
        c.fillText('BUDOWA OKA', px0 + pw / 2, py0 + ph * 0.065);
        // przekrój gałki ocznej
        const ex = px0 + pw * 0.52, ey = py0 + ph * 0.44, R = pw * 0.3;
        c.fillStyle = '#c4473e'; c.beginPath(); c.arc(ex, ey, R, 0, 7); c.fill();               // naczyniówka
        c.fillStyle = '#f3c26a'; c.beginPath(); c.arc(ex, ey, R * 0.93, 0, 7); c.fill();        // siatkówka
        c.fillStyle = '#eaf3f6'; c.beginPath(); c.arc(ex, ey, R * 0.88, 0, 7); c.fill();        // ciało szkliste
        c.lineWidth = R * 0.07; c.strokeStyle = '#f7f1ea'; c.beginPath(); c.arc(ex, ey, R * 1.0, 0, 7); c.stroke(); // twardówka
        c.lineWidth = 1.2 * s; c.strokeStyle = '#a07c6c'; c.beginPath(); c.arc(ex, ey, R * 1.04, 0, 7); c.stroke();
        // rogówka
        c.fillStyle = 'rgba(170,215,235,0.9)';
        c.beginPath(); c.ellipse(ex - R * 0.93, ey, R * 0.22, R * 0.42, 0, Math.PI / 2, Math.PI * 1.5); c.fill();
        c.strokeStyle = '#6aa6c4'; c.lineWidth = 1.5 * s; c.stroke();
        // tęczówka
        c.fillStyle = '#5a7fa8';
        c.fillRect(ex - R * 0.86, ey - R * 0.42, R * 0.07, R * 0.28);
        c.fillRect(ex - R * 0.86, ey + R * 0.14, R * 0.07, R * 0.28);
        // soczewka
        c.fillStyle = '#d9c86f'; c.beginPath(); c.ellipse(ex - R * 0.66, ey, R * 0.12, R * 0.27, 0, 0, 7); c.fill();
        // nerw wzrokowy
        c.fillStyle = '#e8c06e';
        c.beginPath(); c.moveTo(ex + R * 0.9, ey - R * 0.12); c.lineTo(ex + R * 1.45, ey - R * 0.17); c.lineTo(ex + R * 1.45, ey + R * 0.2); c.lineTo(ex + R * 0.9, ey + R * 0.14); c.closePath(); c.fill();
        // plamka
        c.fillStyle = '#d18a2e'; c.beginPath(); c.arc(ex + R * 0.87, ey - R * 0.2, R * 0.05, 0, 7); c.fill();
        // promień światła
        c.strokeStyle = 'rgba(230,170,40,0.85)'; c.lineWidth = 1 * s;
        c.beginPath(); c.moveTo(px0 + 6 * s, ey - R * 0.25); c.lineTo(ex - R * 0.66, ey - R * 0.12); c.lineTo(ex + R * 0.87, ey - R * 0.2); c.stroke();
        // podpisy
        const labels = [
          ['rogówka', ex - R * 1.08, ey - R * 0.3, px0 + pw * 0.04, py0 + ph * 0.19, 'left'],
          ['tęczówka', ex - R * 0.83, ey - R * 0.38, px0 + pw * 0.3, py0 + ph * 0.17, 'left'],
          ['soczewka', ex - R * 0.66, ey + R * 0.2, px0 + pw * 0.04, py0 + ph * 0.72, 'left'],
          ['ciało szkliste', ex + R * 0.1, ey + R * 0.3, px0 + pw * 0.33, py0 + ph * 0.75, 'left'],
          ['siatkówka', ex + R * 0.6, ey - R * 0.65, px0 + pw * 0.62, py0 + ph * 0.17, 'left'],
          ['plamka żółta', ex + R * 0.87, ey - R * 0.2, px0 + pw * 0.62, py0 + ph * 0.21, 'left'],
          ['nerw wzrokowy', ex + R * 1.3, ey + R * 0.15, px0 + pw * 0.55, py0 + ph * 0.79, 'left']
        ];
        c.font = font(9 * s); c.textBaseline = 'middle';
        for (const [t, ax, ay, lx, ly, al] of labels) {
          c.strokeStyle = '#555'; c.lineWidth = 0.7 * s;
          c.beginPath(); c.moveTo(ax, ay); c.lineTo(lx + (al === 'left' ? 0 : 0), ly + 5 * s); c.stroke();
          c.fillStyle = '#222'; c.textAlign = 'left'; c.fillText(t, lx, ly);
        }
        // opis drobnym drukiem
        c.fillStyle = '#444'; c.font = font(7 * s); c.textAlign = 'left';
        const fine = ['Światło przechodzi przez rogówkę, źrenicę', 'i soczewkę, a obraz powstaje na siatkówce.', 'Najostrzej widzi plamka żółta – dołek środkowy.'];
        fine.forEach((t, i) => c.fillText(t, px0 + pw * 0.05, py0 + ph * (0.86 + i * 0.045)));
      }

      /* ================= ROŚLINA W NAROŻNIKU (fikus) ================= */
      {
        const Zp = 4.8, Xp = -0.58;
        const kp = f / Zp;
        P.mat(Zp, { name: 'Roślina' });
        const [bx, by] = pr(Xp, 0.5, Zp);
        // gałązki
        c.strokeStyle = '#6b5236'; c.lineCap = 'round';
        const tips = [];
        for (let i = 0; i < 7; i++) {
          const tx = Xp + (rnd() - 0.5) * 0.16, ty = 1.0 + rnd() * 0.5;
          const [x1, y1] = pr(tx, ty, Zp);
          c.lineWidth = (3 - i * 0.25) * s;
          c.beginPath(); c.moveTo(bx + (i - 3) * 3 * s, by); c.quadraticCurveTo(bx + (x1 - bx) * 0.2, (by + y1) / 2, x1, y1); c.stroke();
          tips.push([x1, y1, tx, ty]);
        }
        c.lineCap = 'butt';
        const leafCols = ['#2f5f2a', '#3b7232', '#4a843a', '#5a9645', '#3f7a35'];
        for (let i = 0; i < 70; i++) {
          const t = tips[i % tips.length];
          const X = t[2] + (rnd() - 0.5) * 0.13, Y = t[3] - rnd() * 0.42 + 0.05;
          const [lx, ly] = pr(X, Y, Zp);
          const L = (0.05 + rnd() * 0.035) * kp, Wl = L * 0.45;
          c.save(); c.translate(lx, ly); c.rotate((rnd() - 0.5) * 2.6 + (X < Xp ? -0.5 : 0.5));
          c.fillStyle = leafCols[Math.floor(rnd() * leafCols.length)];
          c.beginPath(); c.moveTo(0, 0);
          c.bezierCurveTo(-Wl, -L * 0.25, -Wl * 0.8, -L * 0.85, 0, -L);
          c.bezierCurveTo(Wl * 0.8, -L * 0.85, Wl, -L * 0.25, 0, 0); c.fill();
          c.strokeStyle = 'rgba(210,235,180,0.45)'; c.lineWidth = 0.8 * s;
          c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -L * 0.9); c.stroke();
          c.restore();
        }
      }

      /* ================= TABLICA SNELLENA ================= */
      const chart = { x0: pr(-0.2, 0, ZB)[0], x1: pr(0.2, 0, ZB)[0], y0: pr(0, 1.63, ZB)[1] };
      {
        const hOf = V => Math.max(4, f * Math.tan((5 / 60) * Math.PI / 180) / V);
        const hs = ROWS.map(r => hOf(r[1]));
        const lab = Math.max(9, 10 * s);
        const header = 0.04 * k5;
        // układ pionowy: odstęp ≥ etykieta
        const tops = [];
        let y = chart.y0 + header + 0.03 * k5;
        for (let i = 0; i < ROWS.length; i++) {
          tops.push(y);
          const gap = Math.max(lab * 0.95, hs[i] * 0.55 + 7 * s);
          y += hs[i] + gap;
        }
        const yRed = y + 2 * s;
        const duoTop = yRed + 0.02 * k5;
        const duoH = 0.06 * k5;
        chart.y1 = duoTop + duoH + 0.025 * k5;
        const cw = chart.x1 - chart.x0, chh = chart.y1 - chart.y0;
        const fr = 0.014 * k5;
        // poświata podświetlanej tablicy
        P.decor(c => {
          c.save(); c.globalCompositeOperation = 'lighter';
          const gg = c.createRadialGradient(W / 2, chart.y0 + chh / 2, chh * 0.3, W / 2, chart.y0 + chh / 2, chh * 0.85);
          gg.addColorStop(0, 'rgba(255,255,245,0.18)'); gg.addColorStop(1, 'rgba(255,255,245,0)');
          c.fillStyle = gg; c.fillRect(chart.x0 - chh, chart.y0 - chh * 0.4, cw + 2 * chh, chh * 1.8);
          c.restore();
          c.fillStyle = 'rgba(40,45,40,0.25)'; c.fillRect(chart.x0 - fr + 5 * s, chart.y0 - fr + 7 * s, cw + 2 * fr, chh + 2 * fr);
        });
        // obudowa
        P.mat(ZB - 0.05, { name: 'Tablica Snellena' });
        g = c.createLinearGradient(0, chart.y0 - fr, 0, chart.y1 + fr);
        g.addColorStop(0, '#d7dadc'); g.addColorStop(1, '#a9aeb2');
        c.fillStyle = g;
        c.fillRect(chart.x0 - fr, chart.y0 - fr, cw + 2 * fr, chh + 2 * fr);
        // podświetlane lico
        P.mat(ZB - 0.05, { name: 'Tablica Snellena', em: 0.05 });
        g = c.createRadialGradient(W / 2, chart.y0 + chh * 0.45, 10 * s, W / 2, chart.y0 + chh * 0.45, chh * 0.75);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#f1f3f2');
        c.fillStyle = g;
        c.fillRect(chart.x0, chart.y0, cw, chh);
        c.fillStyle = '#1d3f6e'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = font(lab, 'Arial, sans-serif', 'bold');
        c.fillText('TABLICA SNELLENA · 5 m', W / 2, chart.y0 + header * 0.6);
        c.fillStyle = '#c9ced2'; c.fillRect(chart.x0 + 0.02 * k5, chart.y0 + header + 0.008 * k5, cw - 0.04 * k5, 1 * s);
        // wiersze
        for (let i = 0; i < ROWS.length; i++) {
          const [lv, V, letters, dist] = ROWS[i];
          const h = hs[i], top = tops[i];
          const gapPrev = i ? (top - (tops[i - 1] + hs[i - 1])) / 2 : header * 0.4;
          const gapNext = i < ROWS.length - 1 ? (tops[i + 1] - (top + h)) / 2 : 3 * s;
          const nm = 'Tablica Snellena – linia ' + lv;
          P.mat(ZB - 0.05, { name: nm, em: 0.05 });
          P.dataOnly(c => c.fillRect(chart.x0, top - gapPrev, cw, h + gapPrev + gapNext));
          const n = letters.length;
          const rowW = (2 * n - 1) * h;
          let x = W / 2 - rowW / 2;
          c.fillStyle = '#111111';
          c.beginPath();
          for (const ch of letters) { glyphPath(c, ch, x, top, h); x += 2 * h; }
          c.fill();
          c.font = font(lab, 'Arial, sans-serif');
          c.fillStyle = '#2a2a2a';
          c.textAlign = 'left'; c.fillText(lv, chart.x0 + 0.015 * k5, top + h / 2);
          c.textAlign = 'right'; c.fillStyle = '#6a6a6a'; c.fillText(dist, chart.x1 - 0.015 * k5, top + h / 2);
        }
        // czerwona linia pod wierszem 1,0
        P.mat(ZB - 0.05, { name: 'Tablica Snellena', em: 0.05 });
        const iOne = ROWS.findIndex(r => r[1] === 1.0);
        const yOne = tops[iOne] + hs[iOne] + Math.max(lab * 0.95, hs[iOne] * 0.55 + 7 * s) / 2;
        c.fillStyle = '#d0302a'; c.fillRect(chart.x0 + 0.06 * k5, yOne - 0.6 * s, cw - 0.12 * k5, 1.3 * s);
        // test dwubarwny (czerwono-zielony)
        P.mat(ZB - 0.05, { name: 'Test czerwono-zielony', em: 0.05 });
        const dx0 = chart.x0 + 0.04 * k5, dw = cw - 0.08 * k5;
        c.fillStyle = '#d42a1e'; c.fillRect(dx0, duoTop, dw / 2, duoH);
        c.fillStyle = '#23a043'; c.fillRect(dx0 + dw / 2, duoTop, dw / 2, duoH);
        c.strokeStyle = '#0d0d0d';
        for (let side = 0; side < 2; side++) {
          for (let j = 0; j < 3; j++) {
            const rr = duoH * (0.32 - j * 0.07);
            const cx = dx0 + dw * (0.25 + side * 0.5) + (j - 1) * dw * 0.14;
            c.lineWidth = rr * 0.28;
            c.beginPath(); c.arc(cx, duoTop + duoH / 2, rr, 0, 7); c.stroke();
          }
        }
        // śruby mocujące
        P.mat(ZB - 0.05, { name: 'Tablica Snellena' });
        c.fillStyle = '#8b9196';
        for (const [sx, sy] of [[chart.x0 - fr / 2, chart.y0 - fr / 2], [chart.x1 + fr / 2, chart.y0 - fr / 2], [chart.x0 - fr / 2, chart.y1 + fr / 2], [chart.x1 + fr / 2, chart.y1 + fr / 2]]) {
          c.beginPath(); c.arc(sx, sy, fr * 0.28, 0, 7); c.fill();
        }
        // przewód zasilający
        c.strokeStyle = '#e9ebe6'; c.lineWidth = 2.5 * s;
        c.beginPath(); c.moveTo(chart.x1 - 0.03 * k5, chart.y1 + fr); c.bezierCurveTo(chart.x1 - 0.02 * k5, chart.y1 + 60 * s, chart.x1 + 0.05 * k5, chart.y1 + 40 * s, chart.x1 + 0.06 * k5, H); c.stroke();
      }

      /* ================= ZEGAR ================= */
      {
        const [cx, cy] = pr(0.42, 1.66, ZB);
        const R = 0.115 * k5;
        P.decor(c => { c.fillStyle = 'rgba(40,45,35,0.2)'; c.beginPath(); c.arc(cx + 4 * s, cy + 6 * s, R * 1.02, 0, 7); c.fill(); });
        P.mat(ZB - 0.04, { name: 'Zegar ścienny' });
        c.fillStyle = '#2e2f33'; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
        g = c.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e8e8e2');
        c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 0.9, 0, 7); c.fill();
        c.fillStyle = '#222';
        for (let i = 0; i < 60; i++) {
          const a = i / 60 * Math.PI * 2, big = i % 5 === 0;
          const r0 = R * (big ? 0.76 : 0.81), r1 = R * 0.86;
          c.save(); c.translate(cx, cy); c.rotate(a);
          c.fillRect(-(big ? 1.2 : 0.5) * s, -r1, (big ? 2.4 : 1) * s, r1 - r0);
          c.restore();
        }
        c.font = font(Math.max(9, 11 * s), 'Arial, sans-serif', 'bold'); c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let h = 1; h <= 12; h++) {
          const a = h / 12 * Math.PI * 2;
          c.fillText(String(h), cx + Math.sin(a) * R * 0.62, cy - Math.cos(a) * R * 0.62);
        }
        c.font = font(6 * s); c.fillStyle = '#777'; c.fillText('QUARTZ', cx, cy + R * 0.35);
        const hand = (a, len, w, col) => {
          c.save(); c.translate(cx, cy); c.rotate(a); c.fillStyle = col;
          c.beginPath(); c.moveTo(-w, R * 0.12); c.lineTo(-w * 0.6, -len); c.lineTo(w * 0.6, -len); c.lineTo(w, R * 0.12); c.closePath(); c.fill();
          c.restore();
        };
        hand((10 + 9 / 60) / 12 * Math.PI * 2, R * 0.48, 2.6 * s, '#1b1b1b');
        hand(9 / 60 * Math.PI * 2, R * 0.72, 1.8 * s, '#1b1b1b');
        hand(37 / 60 * Math.PI * 2, R * 0.78, 0.6 * s, '#c62828');
        c.fillStyle = '#c62828'; c.beginPath(); c.arc(cx, cy, 2.4 * s, 0, 7); c.fill();
      }

      /* ================= DYPLOM ================= */
      {
        const [x0, y0] = pr(0.3, 1.5, ZB), [x1, y1] = pr(0.58, 1.15, ZB);
        const w = x1 - x0, h = y1 - y0;
        P.decor(c => { c.fillStyle = 'rgba(40,45,35,0.2)'; c.fillRect(x0 + 4 * s, y0 + 6 * s, w, h); });
        P.mat(ZB - 0.02, { name: 'Dyplom' });
        g = c.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, '#7a5a35'); g.addColorStop(0.5, '#a07a48'); g.addColorStop(1, '#6b4c2b');
        c.fillStyle = g; c.fillRect(x0, y0, w, h);
        const m = 0.012 * k5;
        c.fillStyle = '#f7f0dc'; c.fillRect(x0 + m, y0 + m, w - 2 * m, h - 2 * m);
        c.strokeStyle = '#b89a5a'; c.lineWidth = 1 * s; c.strokeRect(x0 + m + 5 * s, y0 + m + 5 * s, w - 2 * m - 10 * s, h - 2 * m - 10 * s);
        c.fillStyle = '#3b2a14'; c.textAlign = 'center'; c.textBaseline = 'middle';
        const cx = x0 + w / 2;
        c.font = font(9 * s, 'Georgia, serif'); c.fillText('UNIWERSYTET MEDYCZNY', cx, y0 + h * 0.13);
        c.font = font(19 * s, 'Georgia, serif', 'bold'); c.fillText('DYPLOM', cx, y0 + h * 0.25);
        c.font = font(9 * s, 'Georgia, serif', 'italic'); c.fillText('lek. med. Anna Kowalczyk', cx, y0 + h * 0.37);
        c.font = font(7 * s, 'Georgia, serif'); c.fillStyle = '#4d3b22';
        const lines = ['uzyskała tytuł specjalisty w dziedzinie', 'okulistyki po złożeniu egzaminu', 'państwowego z wynikiem bardzo dobrym.'];
        lines.forEach((t, i) => c.fillText(t, cx, y0 + h * (0.47 + i * 0.065)));
        c.font = font(5 * s, 'Georgia, serif');
        ['Na podstawie rozporządzenia Ministra Zdrowia w sprawie', 'specjalizacji lekarzy i lekarzy dentystów, nr dypl. 4721/2014'].forEach((t, i) => c.fillText(t, cx, y0 + h * (0.69 + i * 0.045)));
        c.font = font(6 * s, 'Georgia, serif'); c.fillText('Warszawa, 12 czerwca 2014 r.', x0 + w * 0.3, y0 + h * 0.86);
        c.fillStyle = '#b3312b'; c.beginPath(); c.arc(x0 + w * 0.76, y0 + h * 0.83, 0.022 * k5, 0, 7); c.fill();
        c.fillStyle = '#d65a50'; c.beginPath(); c.arc(x0 + w * 0.76, y0 + h * 0.83, 0.014 * k5, 0, 7); c.fill();
        c.strokeStyle = '#1e2c5a'; c.lineWidth = 0.8 * s;
        c.beginPath(); c.moveTo(x0 + w * 0.18, y0 + h * 0.8);
        c.bezierCurveTo(x0 + w * 0.25, y0 + h * 0.72, x0 + w * 0.3, y0 + h * 0.84, x0 + w * 0.36, y0 + h * 0.77);
        c.bezierCurveTo(x0 + w * 0.4, y0 + h * 0.73, x0 + w * 0.42, y0 + h * 0.82, x0 + w * 0.48, y0 + h * 0.78); c.stroke();
      }

      /* ================= BIURKO Z MONITOREM ================= */
      {
        const Zf = 4.15, Zbk = 4.95, Yd = 0.76;
        const a = pr(0.27, Yd, Zbk), b = pr(1.4, Yd, Zbk), cc = pr(1.4, Yd, Zf), d = pr(0.27, Yd, Zf);
        // monitor (za blatem, na podstawce)
        const Zm = 4.72;
        const [mx0, my0] = pr(0.47, 1.13, Zm), [mx1, my1] = pr(0.9, 0.84, Zm);
        P.decor(c => { c.fillStyle = 'rgba(30,35,30,0.18)'; c.fillRect(mx0 + 10 * s, my0 + 8 * s, mx1 - mx0, my1 - my0); });
        P.mat(Zm + 0.05, { name: 'Monitor' });
        c.fillStyle = '#2c2f33';
        const [sx, sy] = pr(0.685, 0.84, Zm + 0.05);
        c.fillRect(sx - 0.025 * k5, my1 - 4 * s, 0.05 * k5, sy - my1 + 0.07 * k5);
        c.fillRect(sx - 0.1 * k5, pr(0, Yd, Zm + 0.05)[1] - 6 * s, 0.2 * k5, 6 * s);
        P.mat(Zm, { name: 'Monitor' });
        c.fillStyle = '#1d1f22'; c.fillRect(mx0, my0, mx1 - mx0, my1 - my0);
        const bz = 0.012 * f / Zm;
        P.mat(Zm, { name: 'Monitor', em: 0.04 });
        const sx0 = mx0 + bz, sy0 = my0 + bz, sw = mx1 - mx0 - 2 * bz, sh = my1 - my0 - 2.6 * bz;
        c.fillStyle = '#eef3f8'; c.fillRect(sx0, sy0, sw, sh);
        c.fillStyle = '#2f6db1'; c.fillRect(sx0, sy0, sw, sh * 0.11);
        c.fillStyle = '#fff'; c.font = font(8 * s, 'Arial, sans-serif', 'bold'); c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillText('Karta pacjenta – badanie refrakcji', sx0 + 6 * s, sy0 + sh * 0.055);
        c.font = font(7 * s); c.fillStyle = '#26323e';
        const rowsTxt = ['Pacjent: Jan Nowak, ur. 1979', 'Visus OP: 0,6 → 1,0 (sc / cc)', 'Visus OL: 0,5 → 1,0', 'OP: sph −1,25  cyl −0,50  ax 180°', 'OL: sph −1,50  cyl −0,25  ax 175°', 'Add: +1,25 D   PD: 64 mm', 'Ciśn. wewnątrzgałkowe: 15 / 16 mmHg'];
        rowsTxt.forEach((t, i) => c.fillText(t, sx0 + 6 * s, sy0 + sh * (0.2 + i * 0.105)));
        c.fillStyle = '#c8d6e4'; c.fillRect(sx0 + sw * 0.7, sy0 + sh * 0.18, sw * 0.25, sh * 0.5);
        c.fillStyle = '#7fa2c4'; c.beginPath(); c.arc(sx0 + sw * 0.825, sy0 + sh * 0.43, sw * 0.08, 0, 7); c.fill();
        c.fillStyle = '#2b3d50'; c.beginPath(); c.arc(sx0 + sw * 0.825, sy0 + sh * 0.43, sw * 0.03, 0, 7); c.fill();
        P.mat(Zm, { name: 'Monitor' });
        c.fillStyle = '#6fd36f'; c.beginPath(); c.arc(mx1 - bz * 1.5, my1 - bz * 0.8, 1.5 * s, 0, 7); c.fill();
        // blat
        P.matGrad(0, a[1], Zbk, 0, d[1], Zf, { name: 'Biurko' });
        g = c.createLinearGradient(0, a[1], 0, d[1]);
        g.addColorStop(0, '#b78f63'); g.addColorStop(1, '#a37a50');
        c.fillStyle = g;
        c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(cc[0], cc[1]); c.lineTo(d[0], d[1]); c.closePath(); c.fill();
        // front biurka
        P.mat(Zf, { name: 'Biurko' });
        g = c.createLinearGradient(0, d[1], 0, H);
        g.addColorStop(0, '#8a6440'); g.addColorStop(0.1, '#7a5634'); g.addColorStop(1, '#5e4127');
        c.fillStyle = g;
        c.fillRect(d[0], d[1], W - d[0], H - d[1]);
        c.fillStyle = '#c9a77d'; c.fillRect(d[0], d[1], W - d[0], 2 * s);
        // szuflada
        c.strokeStyle = 'rgba(40,25,10,0.5)'; c.lineWidth = 1.2 * s;
        c.strokeRect(d[0] + 0.12 * f / Zf, d[1] + 0.03 * f / Zf, 0.5 * f / Zf, 0.12 * f / Zf);
        // klawiatura
        P.matGrad(0, pr(0, Yd, 4.55)[1], 4.55, 0, pr(0, Yd, 4.35)[1], 4.35, { name: 'Klawiatura' });
        {
          const k0 = pr(0.5, Yd + 0.02, 4.55), k1 = pr(0.88, Yd + 0.02, 4.55), k2 = pr(0.9, Yd + 0.02, 4.35), k3 = pr(0.48, Yd + 0.02, 4.35);
          c.fillStyle = '#e4e4e0';
          c.beginPath(); c.moveTo(k0[0], k0[1]); c.lineTo(k1[0], k1[1]); c.lineTo(k2[0], k2[1]); c.lineTo(k3[0], k3[1]); c.closePath(); c.fill();
          c.fillStyle = '#b9b9b3';
          for (let r = 0; r < 4; r++) for (let q = 0; q < 14; q++) {
            const t = (r + 0.5) / 4.4, x = k3[0] + (k0[0] - k3[0]) * t + (q + 0.3) / 14 * ((k2[0] - k3[0]) * (1 - t) + (k1[0] - k0[0]) * t);
            const y = k3[1] + (k0[1] - k3[1]) * t;
            c.fillRect(x, y - 1.2 * s, 6 * s, 2.2 * s);
          }
        }
        // teczki
        P.mat(4.5, { name: 'Teczki' });
        {
          const [tx, ty] = pr(1.0, Yd, 4.5);
          const cols = ['#3d6fb0', '#d9a441', '#5f9a59', '#c4554d'];
          cols.forEach((col, i) => {
            c.fillStyle = col;
            c.fillRect(tx - 2 * s * i, ty - (i + 1) * 4.2 * s, 0.24 * f / 4.5, 4 * s);
          });
          c.fillStyle = '#f2efe6'; c.fillRect(tx + 2 * s, ty - 18 * s, 0.24 * f / 4.5 - 4 * s, 1.5 * s);
        }
        // kubek z długopisami
        P.mat(4.4, { name: 'Kubek z długopisami' });
        {
          const [ux, uy] = pr(0.38, Yd, 4.4);
          const uw = 0.08 * f / 4.4, uh = 0.1 * f / 4.4;
          const pens = [['#1d4fa0', -0.3, 1.35], ['#d23a2e', 0.05, 1.5], ['#2a2a2a', 0.3, 1.3], ['#f0c53b', 0.15, 1.15]];
          for (const [col, dx, len] of pens) {
            c.strokeStyle = col; c.lineWidth = 3 * s;
            c.beginPath(); c.moveTo(ux + dx * uw * 0.4, uy - uh * 0.5); c.lineTo(ux + dx * uw * 1.3, uy - uh * len); c.stroke();
          }
          g = c.createLinearGradient(ux - uw / 2, 0, ux + uw / 2, 0);
          g.addColorStop(0, '#d8e4ea'); g.addColorStop(0.4, '#ffffff'); g.addColorStop(1, '#b8c6cd');
          c.fillStyle = g; c.fillRect(ux - uw / 2, uy - uh, uw, uh);
          c.fillStyle = '#2b5d8a'; c.font = font(8 * s, 'Arial, sans-serif', 'bold'); c.textAlign = 'center';
          c.fillText('OKO', ux, uy - uh * 0.45);
        }
      }

      /* ================= SZAFKA, MODEL OKA, KASETA SZKIEŁ ================= */
      {
        const Zs = 4.62, Yt2 = 0.86;
        const a = pr(-0.42, Yt2, Zs + 0.3), b = pr(0.2, Yt2, Zs + 0.3), cc = pr(0.2, Yt2, Zs), d = pr(-0.42, Yt2, Zs);
        P.matGrad(0, a[1], Zs + 0.3, 0, d[1], Zs, { name: 'Szafka' });
        c.fillStyle = '#e9e7e0';
        c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(cc[0], cc[1]); c.lineTo(d[0], d[1]); c.closePath(); c.fill();
        P.mat(Zs, { name: 'Szafka' });
        g = c.createLinearGradient(0, d[1], 0, H);
        g.addColorStop(0, '#f2f1ec'); g.addColorStop(1, '#cfccc3');
        c.fillStyle = g; c.fillRect(d[0], d[1], cc[0] - d[0], H - d[1]);
        c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(d[0], d[1], cc[0] - d[0], 2 * s);
        c.fillStyle = '#9a9a92';
        c.fillRect((d[0] + cc[0]) / 2 - 1 * s, d[1] + 10 * s, 2 * s, H);
        c.fillRect((d[0] + cc[0]) / 2 - 30 * s, d[1] + 30 * s, 18 * s, 3 * s);
        c.fillRect((d[0] + cc[0]) / 2 + 12 * s, d[1] + 30 * s, 18 * s, 3 * s);
        // kaseta szkieł próbnych
        const Zk = Zs + 0.12;
        P.mat(Zk, { name: 'Kaseta szkieł próbnych' });
        {
          const [kx0, ky0] = pr(0.06, Yt2 + 0.06, Zk), [kx1, ky1] = pr(0.2, Yt2, Zk);
          c.fillStyle = '#3a2a1c'; c.fillRect(kx0, ky0, kx1 - kx0, ky1 - ky0);
          c.fillStyle = '#7d1f1f'; c.fillRect(kx0 + 2 * s, ky0 + 2 * s, kx1 - kx0 - 4 * s, ky1 - ky0 - 4 * s);
          for (let i = 0; i < 9; i++) {
            const lx = kx0 + (i + 0.6) * (kx1 - kx0) / 9.3;
            c.fillStyle = i % 2 ? '#c63b32' : '#222';
            c.beginPath(); c.ellipse(lx, ky0 + 2 * s, 5.5 * s, 3 * s, 0, 0, 7); c.fill();
            c.fillStyle = 'rgba(210,235,245,0.9)';
            c.beginPath(); c.ellipse(lx, ky0 + 2 * s, 3.8 * s, 1.8 * s, 0, 0, 7); c.fill();
          }
        }
        // model oka na podstawce
        const Ze = Zs + 0.1;
        P.mat(Ze, { name: 'Model oka' });
        {
          const [ex, ey] = pr(-0.01, Yt2 + 0.058, Ze);
          const R = 0.048 * f / Ze;
          c.fillStyle = '#4c4a46'; c.fillRect(ex - R * 0.7, pr(0, Yt2, Ze)[1] - 4 * s, R * 1.4, 4 * s);
          c.fillRect(ex - 2 * s, ey + R * 0.8, 4 * s, pr(0, Yt2, Ze)[1] - ey - R * 0.8);
          g = c.createRadialGradient(ex - R * 0.35, ey - R * 0.35, R * 0.1, ex, ey, R);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#efe6e0'); g.addColorStop(1, '#c9b8ae');
          c.fillStyle = g; c.beginPath(); c.arc(ex, ey, R, 0, 7); c.fill();
          // przekrój – ćwiartka wycięta
          c.fillStyle = '#c4473e'; c.beginPath(); c.moveTo(ex, ey); c.arc(ex, ey, R * 0.95, -Math.PI / 2, 0); c.closePath(); c.fill();
          c.fillStyle = '#f0c46e'; c.beginPath(); c.moveTo(ex, ey); c.arc(ex, ey, R * 0.82, -Math.PI / 2, 0); c.closePath(); c.fill();
          c.fillStyle = '#e8f1f3'; c.beginPath(); c.moveTo(ex, ey); c.arc(ex, ey, R * 0.74, -Math.PI / 2, 0); c.closePath(); c.fill();
          c.fillStyle = '#5a7fa8'; c.beginPath(); c.arc(ex - R * 0.62, ey + R * 0.1, R * 0.26, 0, 7); c.fill();
          c.fillStyle = '#141414'; c.beginPath(); c.arc(ex - R * 0.62, ey + R * 0.1, R * 0.11, 0, 7); c.fill();
          c.fillStyle = '#e09a40'; c.beginPath(); c.arc(ex + R * 0.18, ey - R * 0.2, R * 0.12, 0, 7); c.fill();
        }
      }

      /* ================= FOROPTER (1,2 m) ================= */
      {
        const Zf = 1.2;
        const kf = f / Zf;
        const cx = W - 0.004 * kf, cy = pr(0, 1.27, Zf)[1];
        const R = 0.07 * kf;
        P.decor(c => {
          const gg = c.createRadialGradient(cx - R * 0.2, cy + R * 0.25, R * 0.8, cx - R * 0.2, cy + R * 0.25, R * 1.25);
          gg.addColorStop(0, 'rgba(30,35,30,0.25)'); gg.addColorStop(1, 'rgba(30,35,30,0)');
          c.fillStyle = gg; c.beginPath(); c.arc(cx - R * 0.2, cy + R * 0.25, R * 1.25, 0, 7); c.fill();
        });
        // ramię wysięgnika
        P.mat(Zf + 0.12, { name: 'Foropter' });
        g = c.createLinearGradient(W - 0.045 * kf, 0, W, 0);
        g.addColorStop(0, '#bfc3c6'); g.addColorStop(0.4, '#eef0f1'); g.addColorStop(1, '#a5aaae');
        c.fillStyle = g;
        c.fillRect(W - 0.05 * kf, 0, 0.06 * kf, cy - R * 0.6);
        // obudowa
        P.mat(Zf + 0.04, { name: 'Foropter' });
        g = c.createLinearGradient(cx - R, cy - R, cx + R * 0.3, cy + R);
        g.addColorStop(0, '#f2f0ea'); g.addColorStop(0.55, '#dcd8ce'); g.addColorStop(1, '#b9b4a8');
        c.fillStyle = g;
        c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
        c.strokeStyle = '#9d988b'; c.lineWidth = 2 * s; c.stroke();
        // tarcza osi cylindra
        P.mat(Zf, { name: 'Foropter' });
        const ax = cx - R * 0.42, ay = cy + R * 0.05, Ra = R * 0.5;
        c.fillStyle = '#2f3034'; c.beginPath(); c.arc(ax, ay, Ra, 0, 7); c.fill();
        c.fillStyle = '#f2f2ee'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = font(10 * s, 'Arial, sans-serif', 'bold');
        for (let deg = 0; deg < 360; deg += 5) {
          const a = deg * Math.PI / 180;
          const r0 = Ra * (deg % 30 === 0 ? 0.8 : 0.88);
          c.save(); c.translate(ax, ay); c.rotate(a);
          c.fillRect(-0.6 * s, -Ra * 0.97, 1.2 * s, Ra * 0.97 - r0);
          c.restore();
          if (deg % 30 === 0 && deg <= 180) {
            const aa = -a;
            c.fillText(String(deg), ax + Math.cos(aa) * Ra * 0.66, ay + Math.sin(aa) * Ra * 0.66);
          }
        }
        // otwór soczewki
        g = c.createRadialGradient(ax - Ra * 0.1, ay - Ra * 0.1, 2, ax, ay, Ra * 0.36);
        g.addColorStop(0, '#2f4a5a'); g.addColorStop(1, '#0d1418');
        c.fillStyle = '#c9ccce'; c.beginPath(); c.arc(ax, ay, Ra * 0.42, 0, 7); c.fill();
        c.fillStyle = g; c.beginPath(); c.arc(ax, ay, Ra * 0.35, 0, 7); c.fill();
        // okienko z wartością sfery
        const wx = cx - R * 0.55, wy = cy - R * 0.7;
        c.fillStyle = '#26282b'; c.fillRect(wx - 34 * s, wy - 14 * s, 68 * s, 28 * s);
        c.fillStyle = '#f5f5f0'; c.fillRect(wx - 30 * s, wy - 10 * s, 60 * s, 20 * s);
        c.fillStyle = '#c62828'; c.font = font(15 * s, 'Arial, sans-serif', 'bold');
        c.fillText('−1,25', wx, wy + 1 * s);
        c.fillStyle = '#555'; c.font = font(9 * s, 'Arial, sans-serif', 'bold');
        c.fillText('SPH', wx + 52 * s, wy);
        // pokrętła
        const knob = (kx, ky, kr, col) => {
          c.fillStyle = col; c.beginPath(); c.arc(kx, ky, kr, 0, 7); c.fill();
          c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1.2 * s;
          for (let i = 0; i < 24; i++) {
            const a = i / 24 * Math.PI * 2;
            c.beginPath(); c.moveTo(kx + Math.cos(a) * kr * 0.75, ky + Math.sin(a) * kr * 0.75); c.lineTo(kx + Math.cos(a) * kr, ky + Math.sin(a) * kr); c.stroke();
          }
          const gg = c.createRadialGradient(kx - kr * 0.3, ky - kr * 0.3, 1, kx, ky, kr * 0.75);
          gg.addColorStop(0, 'rgba(255,255,255,0.5)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = gg; c.beginPath(); c.arc(kx, ky, kr * 0.75, 0, 7); c.fill();
        };
        P.mat(Zf - 0.03, { name: 'Foropter' });
        knob(cx - R * 0.78, cy + R * 0.62, R * 0.2, '#3a3c40');
        knob(cx - R * 0.05, cy + R * 0.7, R * 0.14, '#3a3c40');
        knob(cx - R * 0.12, cy - R * 0.28, R * 0.11, '#7e8288');
        c.fillStyle = '#555'; c.font = font(9 * s, 'Arial, sans-serif', 'bold');
        c.fillText('CYL', cx - R * 0.05, cy + R * 0.45);
        c.fillText('AXIS', cx - R * 0.12, cy - R * 0.47);
        // odblask
        P.decor(c => {
          c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3 * s;
          c.beginPath(); c.arc(cx, cy, R * 0.94, Math.PI * 1.05, Math.PI * 1.45); c.stroke();
        });
      }

      /* ================= KARTA DO CZYTANIA W DŁONI (0,4 m) ================= */
      {
        const ang = -0.045;
        const ox = -14 * s, oy = 486 * s;      // lewy górny róg karty
        const cw = 640 * s, chh = 520 * s;
        const dTop = 0.43, dBot = 0.385;
        const card = (cc) => { cc.beginPath(); cc.rect(0, 0, cw, chh); };
        P.decor(c => {
          c.save(); c.translate(ox + 14 * s, oy + 18 * s); c.rotate(ang);
          c.fillStyle = 'rgba(20,25,20,0.28)'; card(c); c.fill(); c.restore();
        });
        // palec wskazujący za kartą (rysowany przed kartą – karta go zasłania)
        P.mat(0.41, { name: 'Dłoń' });
        {
          const gg = c.createLinearGradient(600 * s, 0, 712 * s, 0);
          gg.addColorStop(0, '#d89a76'); gg.addColorStop(0.6, '#eab48f'); gg.addColorStop(1, '#b77654');
          c.fillStyle = gg;
          c.beginPath();
          c.moveTo(560 * s, 690 * s);
          c.bezierCurveTo(640 * s, 640 * s, 712 * s, 690 * s, 708 * s, 780 * s);
          c.bezierCurveTo(706 * s, 830 * s, 700 * s, 870 * s, 696 * s, H + 5);
          c.lineTo(560 * s, H + 5); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(140,80,55,0.45)'; c.lineWidth = 2 * s;
          c.beginPath(); c.moveTo(640 * s, 790 * s); c.quadraticCurveTo(670 * s, 782 * s, 703 * s, 798 * s); c.stroke();
        }
        c.save();
        c.translate(ox, oy); c.rotate(ang);
        P.matGrad(0, 0, dTop, 0, chh * 0.8, dBot, { name: 'Karta do czytania' });
        g = c.createLinearGradient(0, 0, cw, chh);
        g.addColorStop(0, '#fffdf7'); g.addColorStop(1, '#f1ede2');
        c.fillStyle = g; card(c); c.fill();
        c.strokeStyle = '#d6d0c0'; c.lineWidth = 1.5 * s; c.strokeRect(0, 0, cw, chh);
        c.fillStyle = '#1d3f6e'; c.fillRect(0, 0, cw, 4 * s);
        c.textAlign = 'left'; c.textBaseline = 'alphabetic';
        c.fillStyle = '#5a6470'; c.font = font(9 * s, 'Arial, sans-serif', 'bold');
        c.fillText('TABLICA DO CZYTANIA Z BLISKA · 40 cm', 66 * s, 22 * s);
        const paras = [
          ['Nr 1', 30, 'Jesień przyszła wcześnie, a liście w parku pożółkły.'],
          ['Nr 2', 23, 'Babcia czyta gazetę przy oknie, popijając herbatę z cytryną.'],
          ['Nr 3', 18, 'W aptece na rogu kupiłem krople do oczu i nowe szkła kontaktowe.'],
          ['Nr 4', 14, 'Pociąg do Gdańska odjeżdża z peronu trzeciego o godzinie 17:45. Prosimy zachować ostrożność.'],
          ['Nr 5', 11, 'Skład: woda, cukier, sok jabłkowy z zagęszczonego soku (35%), kwas cytrynowy, witamina C. Przechowywać w suchym miejscu.'],
          ['Nr 6', 9, 'Drobny druk w umowach i ulotkach leków najszybciej zdradza starczowzroczność – zwykle po czterdziestce trzeba odsuwać tekst coraz dalej.']
        ];
        let y = 34 * s;
        const tx = 66 * s;
        for (const [lab, px, text] of paras) {
          const fs = px * s;
          c.font = font(fs, 'Georgia, "Times New Roman", serif');
          const maxW = (y > 200 * s ? 372 : 520) * s;
          const lines = wrapLines(c, text, maxW);
          const lh = fs * 1.22;
          const blockH = lines.length * lh;
          P.matGrad(0, 0, dTop, 0, chh * 0.8, dBot, { name: 'Karta do czytania – ' + lab });
          P.dataOnly(c => c.fillRect(4 * s, y, cw - 8 * s, blockH + 6 * s));
          c.fillStyle = '#9a2b25'; c.font = font(9 * s, 'Arial, sans-serif', 'bold');
          c.fillText(lab, 26 * s, y + fs * 0.95);
          c.fillStyle = '#1a1a1a'; c.font = font(fs, 'Georgia, "Times New Roman", serif');
          lines.forEach((t, i) => c.fillText(t, tx, y + fs * 0.95 + i * lh));
          y += blockH + 7 * s + fs * 0.25;
        }
        c.restore();

        // dłoń: kciuk na karcie, palec wskazujący wychyla się zza prawej krawędzi
        const skin = (x0, y0, x1, y1) => {
          const gg = c.createLinearGradient(x0, y0, x1, y1);
          gg.addColorStop(0, '#f0c2a0'); gg.addColorStop(0.55, '#dea07c'); gg.addColorStop(1, '#b97a58');
          return gg;
        };
        // kciuk – od nasady (prawy dół) do opuszka na karcie
        {
          const tx0 = 478 * s, ty0 = 770 * s, ang2 = Math.atan2(940 - 770, 690 - 478);
          const len = 300 * s, wd = 62 * s;
          P.decor(c => {
            c.save(); c.translate(tx0 + 18 * s, ty0 + 22 * s); c.rotate(ang2);
            c.fillStyle = 'rgba(30,25,20,0.25)';
            c.beginPath(); c.ellipse(len * 0.4, 0, len * 0.55, wd * 1.05, 0, 0, 7); c.fill(); c.restore();
          });
          P.mat(0.37, { name: 'Dłoń' });
          c.save(); c.translate(tx0, ty0); c.rotate(ang2);
          const gg = c.createLinearGradient(0, -wd, 0, wd);
          gg.addColorStop(0, '#f2c8a6'); gg.addColorStop(0.45, '#e2a682'); gg.addColorStop(1, '#b97856');
          c.fillStyle = gg;
          c.beginPath();
          c.moveTo(0, -wd * 0.78);
          c.bezierCurveTo(len * 0.35, -wd * 0.95, len * 0.7, -wd * 1.15, len, -wd * 1.5);
          c.lineTo(len, wd * 1.4);
          c.bezierCurveTo(len * 0.7, wd * 1.1, len * 0.35, wd * 0.95, 0, wd * 0.8);
          c.bezierCurveTo(-wd * 0.62, wd * 0.75, -wd * 0.62, -wd * 0.75, 0, -wd * 0.78);
          c.closePath(); c.fill();
          // paznokieć
          const ng = c.createLinearGradient(0, -wd * 0.5, 0, wd * 0.5);
          ng.addColorStop(0, '#f7dfd2'); ng.addColorStop(1, '#e9bfae');
          c.fillStyle = ng;
          c.beginPath();
          c.moveTo(-wd * 0.32, -wd * 0.52);
          c.quadraticCurveTo(-wd * 0.55, 0, -wd * 0.32, wd * 0.52);
          c.lineTo(wd * 0.75, wd * 0.5); c.quadraticCurveTo(wd * 0.9, 0, wd * 0.75, -wd * 0.5); c.closePath(); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.5)';
          c.beginPath(); c.ellipse(wd * 0.1, -wd * 0.22, wd * 0.35, wd * 0.1, 0, 0, 7); c.fill();
          c.strokeStyle = 'rgba(150,90,60,0.5)'; c.lineWidth = 2 * s;
          c.beginPath(); c.moveTo(len * 0.45, -wd * 0.7); c.quadraticCurveTo(len * 0.5, 0, len * 0.45, wd * 0.6); c.stroke();
          c.beginPath(); c.moveTo(len * 0.5, -wd * 0.6); c.quadraticCurveTo(len * 0.56, 0, len * 0.5, wd * 0.5); c.stroke();
          c.restore();
        }
      }

      /* ================= WINIETA ================= */
      P.decor(c => {
        const gg = c.createRadialGradient(W / 2, H * 0.45, H * 0.45, W / 2, H * 0.45, W * 0.62);
        gg.addColorStop(0, 'rgba(0,0,0,0)'); gg.addColorStop(1, 'rgba(10,15,10,0.22)');
        c.fillStyle = gg; c.fillRect(0, 0, W, H);
      });
    }
  });
})();
