/* Scena „Targ warzywny” – słoneczny sobotni poranek na polskim targu.
   Blisko (0,4 m): dłoń z odręczną listą zakupów i wiklinowy koszyk.
   Średnio (1,6–3,4 m): stragan z drewnianymi skrzynkami owoców i warzyw, tabliczki kredowe, markiza w paski.
   Dalej (5–18 m): stragan z kwiatami, parasole, ludzie, baloniki, transparent.
   Daleko (60–260 m): drzewa w parku, kamienice, wieża ratusza, niebo.
   Scena jest bogata w czerwienie, zielenie, pomarańcze, fiolety i błękity – do symulacji daltonizmu. */
(function () {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const FOV = 50;
  const TAU = Math.PI * 2;
  const HAND = "'Segoe Print', 'Comic Sans MS', cursive";
  const CHALK = "'Segoe Print', 'Comic Sans MS', 'Trebuchet MS', cursive";

  window.SCENES = window.SCENES || [];
  SCENES.push({
    id: 'targ', name: 'Targ warzywny', icon: '🍎',
    desc: 'Czerwone i zielone jabłka obok siebie, pomidory w różnych stadiach dojrzałości, kolorowe kredy na tabliczkach – i lista zakupów w dłoni do czytania z bliska.',
    fovDeg: FOV,
    pupilMm: 3,
    night: false,
    defaultGaze: [0.46, 0.67],
    pois: [
      { u: 0.17, v: 0.66, label: 'Lista zakupów w dłoni (0,4 m)' },
      { u: 0.41, v: 0.67, label: 'Czerwone jabłka (2,3 m)' },
      { u: 0.58, v: 0.67, label: 'Zielone jabłka obok (2,3 m)' },
      { u: 0.61, v: 0.30, label: 'Tabliczka PROMOCJA – czerwona i zielona kreda (3,3 m)' },
      { u: 0.13, v: 0.38, label: 'Stragan z kwiatami (7 m)' },
      { u: 0.29, v: 0.11, label: 'Transparent (16 m)' },
      { u: 0.645, v: 0.165, label: 'Wieża ratusza z zegarem (180 m)' }
    ],
    draw(P, W, H) { drawTarg(P, W, H); }
  });

  function drawTarg(P, W, H) {
    const c = P.ctx;
    const s = W / 1600;
    const f = (W / 2) / Math.tan(FOV / 2 * Math.PI / 180);
    const yH = 330 * s;                 // horyzont (wzrok lekko w dół)
    const EYE = 1.6;
    const X2x = (X, Z) => W / 2 + f * X / Z;
    const Y2y = (Y, Z) => yH + f * (EYE - Y) / Z;
    const x2X = (x, Z) => (x - W / 2) * Z / f;
    const mpx = Z => f / Z;
    const R = mulberry32(20261022);
    const rr = (a, b) => a + (b - a) * R();
    const ri = (a, b) => Math.floor(rr(a, b + 1));
    const pick = arr => arr[Math.floor(R() * arr.length)];
    const hsl = (h, sa, l, a) => a === undefined ? `hsl(${h},${sa}%,${l}%)` : `hsla(${h},${sa}%,${l}%,${a})`;

    function poly(pts) {
      c.beginPath();
      c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.closePath();
    }
    function rrect(x, y, w, h, r) {
      c.beginPath();
      if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h);
    }
    function lin(x0, y0, x1, y1, stops) {
      const g = c.createLinearGradient(x0, y0, x1, y1);
      for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
      return g;
    }
    function rad(x0, y0, r0, x1, y1, r1, stops) {
      const g = c.createRadialGradient(x0, y0, r0, x1, y1, r1);
      for (let i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
      return g;
    }
    function shine(x, y, rx, ry, rot, a) {
      c.save();
      c.globalAlpha = a;
      c.fillStyle = '#ffffff';
      c.beginPath(); c.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, TAU); c.fill();
      c.restore();
    }
    // Materiał jednolity podawany jako stały gradient: Chrome miesza antyaliasowane krawędzie jednolitego koloru
    // z błędem zaokrąglenia ±1 (zły numer obiektu na płótnie danych), a wypełnienia gradientem są dokładne.
    function mat(d, o) { return P.matGrad(0, 0, d, 1, 0, d, o); }
    // Napisy tylko na kolorze: podłoże (kartka, tablica, płótno) ma już ten sam materiał na płótnie danych,
    // a antyaliasing tekstu w Chrome potrafi przekłamać kanały danych o ±1 (zły numer obiektu).
    function txt(t, x, y) { P.decor(() => c.fillText(t, x, y)); }
    function fitFont(text, maxW, size, tmpl) {
      c.font = tmpl.replace('#', size.toFixed(1));
      const w = c.measureText(text).width;
      if (w > maxW) { size *= maxW / w; c.font = tmpl.replace('#', size.toFixed(1)); }
      return size;
    }

    /* ======================= NIEBO ======================= */
    mat(Infinity, { name: 'Niebo' });
    c.fillStyle = lin(0, 0, 0, yH, [[0, '#3f86d6'], [0.45, '#7fb6ea'], [0.85, '#cfe3f1'], [1, '#f3ead8']]);
    c.fillRect(0, 0, W, yH + 6 * s);

    const sunX = 70 * s, sunY = 40 * s;
    P.decor(() => {
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = rad(sunX, sunY, 0, sunX, sunY, 380 * s, [[0, 'rgba(255,240,200,0.75)'], [0.15, 'rgba(255,225,170,0.35)'], [0.5, 'rgba(255,215,160,0.10)'], [1, 'rgba(255,215,160,0)']]);
      c.fillRect(0, 0, 450 * s, 420 * s);
      c.restore();
    });

    function cloud(cx, cy, w) {
      c.beginPath();
      const n = 9;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const x = cx - w / 2 + t * w + rr(-0.04, 0.04) * w;
        const r = w * (0.11 + 0.12 * Math.sin(Math.PI * t) + rr(0, 0.05));
        const y = cy - r * 0.45 + rr(-0.03, 0.03) * w;
        c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
      }
      c.moveTo(cx - w / 2, cy); c.rect(cx - w / 2, cy - w * 0.08, w, w * 0.08);
      c.fillStyle = lin(0, cy - w * 0.35, 0, cy, [[0, '#ffffff'], [0.6, '#f4f7fb'], [1, '#d5e0ec']]);
      c.fill();
    }
    mat(Infinity, { name: 'Niebo' });
    cloud(420 * s, 38 * s, 230 * s);
    cloud(1360 * s, 170 * s, 300 * s);
    cloud(780 * s, 18 * s, 150 * s);
    cloud(1230 * s, 228 * s, 160 * s);

    mat(Infinity, { name: 'Słońce', em: 1 });
    c.fillStyle = '#fffdf2';
    c.beginPath(); c.arc(sunX, sunY, 9 * s, 0, TAU); c.fill();

    /* ======================= KAMIENICE (230 m) ======================= */
    (function houses() {
      const Z = 230, m = mpx(Z), base = Y2y(0, Z);
      mat(Z, { name: 'Kamienice' });
      const cols = ['#f2d27a', '#f0b9a8', '#bfe0c8', '#f6e7c4', '#a9c9e6', '#e9a86a', '#d9c3e8', '#f4c9d4', '#cfe1a1', '#f3dfa0'];
      let x = -40 * s, k = 0;
      while (x < W + 40 * s) {
        const wm = rr(9, 14), hm = rr(14, 21), wpx = wm * m;
        const col = cols[k % cols.length]; k++;
        const top = base - hm * m;
        // dach
        const type = ri(0, 2);
        if (type === 0) {
          c.fillStyle = '#9a3f2e';
          poly([[x - 0.3 * m, top], [x + wpx + 0.3 * m, top], [x + wpx - 1.5 * m, top - 3.5 * m], [x + 1.5 * m, top - 3.5 * m]]); c.fill();
          c.fillStyle = '#6e2c22'; c.fillRect(x + wpx * 0.7, top - 5 * m, 0.9 * m, 2.5 * m);
        } else if (type === 1) {
          c.fillStyle = col;
          c.beginPath(); c.moveTo(x, top);
          c.lineTo(x + wpx * 0.2, top); c.quadraticCurveTo(x + wpx * 0.25, top - 3 * m, x + wpx * 0.38, top - 3.2 * m);
          c.lineTo(x + wpx * 0.5, top - 5 * m); c.lineTo(x + wpx * 0.62, top - 3.2 * m);
          c.quadraticCurveTo(x + wpx * 0.75, top - 3 * m, x + wpx * 0.8, top); c.lineTo(x + wpx, top); c.closePath(); c.fill();
          c.fillStyle = '#3d3a44'; c.beginPath(); c.arc(x + wpx * 0.5, top - 2.2 * m, 0.7 * m, 0, TAU); c.fill();
        } else {
          c.fillStyle = '#e9e1d0'; c.fillRect(x, top - 1.6 * m, wpx, 1.6 * m);
          c.fillStyle = '#b8ad97';
          for (let i = 0; i <= 4; i++) c.fillRect(x + i * (wpx - 0.8 * m) / 4, top - 2.6 * m, 0.8 * m, 1.2 * m);
        }
        // fasada
        c.fillStyle = lin(x, 0, x + wpx, 0, [[0, col], [1, col]]);
        c.fillRect(x, top, wpx, base - top);
        c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x + wpx - 0.5 * m, top, 0.5 * m, base - top);
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x, top, wpx, 0.5 * m);
        // okna
        const nc = Math.max(2, Math.round(wm / 2.6));
        const floors = Math.floor((hm - 4.5) / 3.3);
        for (let fl = 0; fl < floors; fl++) {
          const wy = base - 4.6 * m - fl * 3.3 * m - 1.8 * m;
          for (let i = 0; i < nc; i++) {
            const wx = x + (i + 0.5) * wpx / nc - 0.55 * m;
            c.fillStyle = '#f7f3ea'; c.fillRect(wx - 0.2 * m, wy - 0.2 * m, 1.5 * m, 2.2 * m);
            c.fillStyle = fl % 2 ? '#40546e' : '#4f6684'; c.fillRect(wx, wy, 1.1 * m, 1.8 * m);
          }
        }
        // parter: sklepy
        c.fillStyle = '#5a4a44'; c.fillRect(x, base - 3.8 * m, wpx, 3.8 * m);
        c.fillStyle = '#7d93a8';
        for (let i = 0; i < 2; i++) c.fillRect(x + (0.12 + 0.46 * i) * wpx, base - 3.2 * m, wpx * 0.34, 2.6 * m);
        x += wpx;
      }
      // przejrzystość powietrza – lekka mgiełka
      P.decor(() => {
        c.fillStyle = lin(0, base - 25 * m, 0, base, [[0, 'rgba(225,235,245,0.25)'], [1, 'rgba(240,236,228,0.45)']]);
        c.fillRect(0, base - 25 * m, W, 25 * m + 2 * s);
      });
    })();

    /* ======================= WIEŻA RATUSZA (180 m, stoi przed pierzeją) ======================= */
    (function tower() {
      const Z = 180, m = mpx(Z), x = 1032 * s, base = Y2y(0, Z);
      mat(Z, { name: 'Wieża ratusza' });
      const w = 8 * m, top = base - 24 * m;
      c.fillStyle = lin(x - w / 2, 0, x + w / 2, 0, [[0, '#d07a58'], [0.55, '#a8503a'], [1, '#7a3526']]);
      c.fillRect(x - w / 2, top, w, base - top);
      // gzymsy
      c.fillStyle = '#e8c9a8';
      for (const hh of [8, 16, 23.5]) c.fillRect(x - w / 2 - 0.4 * m, base - hh * m, w + 0.8 * m, 0.6 * m);
      // okna
      c.fillStyle = '#3a2a2e';
      for (const hh of [9.5, 14]) {
        for (const dx of [-2, 2]) {
          rrect(x + dx * m - 0.6 * m, base - hh * m - 2 * m, 1.2 * m, 2.6 * m, 0.6 * m); c.fill();
        }
      }
      // zegar
      const cy = base - 19.8 * m, cr = 2.1 * m;
      c.fillStyle = '#f6f0dc'; c.beginPath(); c.arc(x, cy, cr, 0, TAU); c.fill();
      c.strokeStyle = '#c9a246'; c.lineWidth = 0.35 * m; c.stroke();
      c.strokeStyle = '#2b2b2b'; c.lineWidth = 0.28 * m;
      c.beginPath(); c.moveTo(x, cy); c.lineTo(x + 0.9 * m, cy - 1.2 * m); c.moveTo(x, cy); c.lineTo(x - 0.3 * m, cy + 1.7 * m); c.stroke();
      // hełm z patyną
      const sp = top - 11.5 * m;
      c.fillStyle = lin(x - w / 2, 0, x + w / 2, 0, [[0, '#9ad6bf'], [0.5, '#5aa58b'], [1, '#2f6d5a']]);
      c.beginPath();
      c.moveTo(x - w / 2 - 0.6 * m, top);
      c.quadraticCurveTo(x - w * 0.62, top - 2.30 * m, x - w * 0.22, top - 3.45 * m);
      c.lineTo(x - 1.1 * m, top - 5.17 * m);
      c.quadraticCurveTo(x - 2.2 * m, top - 6.32 * m, x - 0.5 * m, top - 7.47 * m);
      c.lineTo(x, sp);
      c.lineTo(x + 0.5 * m, top - 7.47 * m);
      c.quadraticCurveTo(x + 2.2 * m, top - 6.32 * m, x + 1.1 * m, top - 5.17 * m);
      c.lineTo(x + w * 0.22, top - 3.45 * m);
      c.quadraticCurveTo(x + w * 0.62, top - 2.30 * m, x + w / 2 + 0.6 * m, top);
      c.closePath(); c.fill();
      // latarnia i kula
      c.fillStyle = '#2e5b4c'; c.fillRect(x - 0.8 * m, top - 5.0 * m, 1.6 * m, 1.0 * m);
      c.fillStyle = '#e8c45a'; c.beginPath(); c.arc(x, sp - 0.6 * m, 0.7 * m, 0, TAU); c.fill();
      c.strokeStyle = '#e8c45a'; c.lineWidth = 0.3 * m;
      c.beginPath(); c.moveTo(x, sp - 1.2 * m); c.lineTo(x, sp - 4 * m); c.moveTo(x - 1 * m, sp - 3 * m); c.lineTo(x + 1 * m, sp - 3 * m); c.stroke();
    })();

    /* ======================= DRZEWA W PARKU (55–95 m) ======================= */
    function tree(x, Z, hm) {
      const m = mpx(Z), base = Y2y(0, Z);
      mat(Z, { name: 'Drzewa w parku' });
      c.fillStyle = '#5b4535';
      c.fillRect(x - 0.25 * m, base - hm * 0.45 * m, 0.5 * m, hm * 0.45 * m);
      const cy = base - hm * 0.66 * m, cr = hm * 0.3 * m;
      const hue = rr(88, 118), lt = rr(30, 40);
      const blobs = [];
      for (let i = 0; i < 9; i++) {
        const a = rr(0, TAU), d = rr(0, 0.55) * cr;
        blobs.push([x + Math.cos(a) * d * 1.1, cy + Math.sin(a) * d * 0.85, cr * rr(0.45, 0.7)]);
      }
      blobs.sort((a, b) => a[1] - b[1]);
      for (const [bx, by, br] of blobs) {
        c.fillStyle = rad(bx - br * 0.45, by - br * 0.5, br * 0.1, bx, by, br, [[0, hsl(hue - 10, 55, lt + 22)], [0.6, hsl(hue, 50, lt + 6)], [1, hsl(hue + 8, 55, lt - 10)]]);
        c.beginPath(); c.arc(bx, by, br, 0, TAU); c.fill();
      }
    }
    const treeSpots = [[30, 92, 12], [150, 70, 13], [270, 88, 11], [360, 64, 14], [470, 84, 10], [560, 78, 11], [660, 92, 9], [1160, 85, 11], [1270, 66, 13], [1390, 80, 12], [1500, 60, 14], [1600, 74, 12], [760, 95, 9], [870, 90, 10]];
    treeSpots.sort((a, b) => b[1] - a[1]);
    for (const [tx, tz, th] of treeSpots) tree(tx * s, tz, th);

    /* ======================= BRUK ======================= */
    const zNear = f * EYE / (H - yH);
    const groundMat = () => P.matGrad(0, yH, 1e6, 0, H, zNear, { name: 'Bruk' });
    groundMat();
    c.fillStyle = lin(0, yH, 0, H, [[0, '#cfc6b8'], [0.25, '#b2a797'], [1, '#8f8475']]);
    c.fillRect(0, yH, W, H - yH);
    (function cobbles() {
      const tones = ['#b9ad9c', '#a89b89', '#c4b8a6', '#9d907f', '#b3a48f'];
      let Z = zNear * 0.96;
      let row = 0;
      while (Z < 60) {
        const Z2 = Z * 1.045;
        const y1 = Y2y(0, Z), y2 = Y2y(0, Z2);
        if (y1 - y2 < 2.2 * s) break;
        const stone = 0.2;
        const xMaxPx = 780 * s;
        const Xmin = x2X(-10, Z) - 0.4, Xmax = x2X(xMaxPx + 10, Z) + 0.4;
        const off = (row % 2) * stone / 2;
        const paths = tones.map(() => new Path2D());
        const gap = 0.12;
        for (let X = Math.floor(Xmin / stone) * stone + off; X < Xmax; X += stone) {
          const t = Math.abs(Math.sin(X * 91.7 + row * 13.1)) * 5 | 0;
          const a = X + stone * gap * 0.5, b = X + stone * (1 - gap * 0.5);
          const za = Z * (1 + 0.006), zb = Z2 * (1 - 0.006);
          const p = paths[t];
          p.moveTo(X2x(a, za), Y2y(0, za));
          p.lineTo(X2x(b, za), Y2y(0, za));
          p.lineTo(X2x(b, zb), Y2y(0, zb));
          p.lineTo(X2x(a, zb), Y2y(0, zb));
          p.closePath();
        }
        for (let i = 0; i < tones.length; i++) { c.fillStyle = tones[i]; c.fill(paths[i]); }
        Z = Z2; row++;
      }
      // mgiełka i ciepłe światło na bruku
      P.decor(() => {
        c.fillStyle = lin(0, yH, 0, yH + 120 * s, [[0, 'rgba(236,232,222,0.85)'], [1, 'rgba(236,232,222,0)']]);
        c.fillRect(0, yH, W, 120 * s);
        c.fillStyle = rad(200 * s, 600 * s, 0, 200 * s, 600 * s, 600 * s, [[0, 'rgba(255,220,160,0.18)'], [1, 'rgba(255,220,160,0)']]);
        c.fillRect(0, yH, W, H - yH);
      });
    })();

    /* ======================= LUDZIE ======================= */
    function person(X, Z, o) {
      const m = mpx(Z), x = X2x(X, Z), yF = Y2y(0, Z);
      const k = (o.h || 1.72) / 1.75;
      const Y = v => yF - v * k * m, L = v => v * k * m;
      mat(Z, { name: o.name || 'Kupujący' });
      P.decor(() => {
        c.fillStyle = 'rgba(40,30,20,0.28)';
        c.beginPath(); c.ellipse(x + L(0.25), yF, L(0.45), L(0.07), 0, 0, TAU); c.fill();
      });
      const st = o.step || 0;
      // nogi
      c.fillStyle = o.legs || '#2c3e5c';
      rrect(x - L(0.15), Y(0.93), L(0.13), L(0.88) - L(st), L(0.05)); c.fill();
      rrect(x + L(0.02), Y(0.93), L(0.13), L(0.88), L(0.05)); c.fill();
      c.fillStyle = o.shoes || '#2a2420';
      c.beginPath(); c.ellipse(x - L(0.085), Y(0.04 + st), L(0.08), L(0.045), 0, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(x + L(0.085), Y(0.04), L(0.08), L(0.045), 0, 0, TAU); c.fill();
      // spódnica
      if (o.skirt) {
        c.fillStyle = o.skirt;
        poly([[x - L(0.17), Y(1.0)], [x + L(0.17), Y(1.0)], [x + L(0.27), Y(0.48)], [x - L(0.27), Y(0.48)]]); c.fill();
      }
      // ręce (za tułowiem)
      c.fillStyle = o.top;
      rrect(x - L(0.27), Y(1.42), L(0.09), L(0.62), L(0.045)); c.fill();
      rrect(x + L(0.18), Y(1.42), L(0.09), L(0.62), L(0.045)); c.fill();
      c.fillStyle = o.skin || '#e9b896';
      c.beginPath(); c.arc(x - L(0.225), Y(0.77), L(0.05), 0, TAU); c.fill();
      c.beginPath(); c.arc(x + L(0.225), Y(0.77), L(0.05), 0, TAU); c.fill();
      // tułów
      c.fillStyle = lin(x - L(0.22), 0, x + L(0.22), 0, [[0, o.topLight || o.top], [1, o.topDark || o.top]]);
      c.beginPath();
      c.moveTo(x - L(0.17), Y(0.9));
      c.lineTo(x - L(0.2), Y(1.36));
      c.quadraticCurveTo(x - L(0.2), Y(1.47), x - L(0.08), Y(1.48));
      c.lineTo(x + L(0.08), Y(1.48));
      c.quadraticCurveTo(x + L(0.2), Y(1.47), x + L(0.2), Y(1.36));
      c.lineTo(x + L(0.17), Y(0.9));
      c.closePath(); c.fill();
      if (o.coat) { c.fillStyle = o.coat; poly([[x - L(0.19), Y(1.3)], [x + L(0.19), Y(1.3)], [x + L(0.22), Y(0.62)], [x - L(0.22), Y(0.62)]]); c.fill(); }
      // szyja i głowa
      c.fillStyle = o.skin || '#e9b896';
      c.fillRect(x - L(0.04), Y(1.53), L(0.08), L(0.06));
      c.beginPath(); c.ellipse(x, Y(1.62), L(0.085), L(0.11), 0, 0, TAU); c.fill();
      c.fillStyle = o.hair || '#3b2a1e';
      if (o.back) {
        c.beginPath(); c.ellipse(x, Y(1.64), L(0.09), L(0.11), 0, 0, TAU); c.fill();
        if (o.long) { rrect(x - L(0.1), Y(1.66), L(0.2), L(0.28), L(0.06)); c.fill(); }
        if (o.bun) { c.beginPath(); c.arc(x, Y(1.74), L(0.05), 0, TAU); c.fill(); }
      } else {
        c.beginPath(); c.ellipse(x, Y(1.68), L(0.09), L(0.07), 0, Math.PI, TAU); c.fill();
        if (o.long) { rrect(x - L(0.1), Y(1.68), L(0.04), L(0.26), L(0.02)); c.fill(); rrect(x + L(0.06), Y(1.68), L(0.04), L(0.26), L(0.02)); c.fill(); }
      }
      if (o.cap) {
        c.fillStyle = o.cap;
        c.beginPath(); c.ellipse(x, Y(1.7), L(0.1), L(0.065), 0, Math.PI, TAU); c.fill();
        c.fillRect(x - L(0.12), Y(1.7), L(0.24), L(0.025));
      }
      // torba
      if (o.bag) {
        c.strokeStyle = o.bag; c.lineWidth = Math.max(1, L(0.02));
        c.beginPath(); c.moveTo(x + L(0.1), Y(1.46)); c.lineTo(x + L(0.25), Y(0.95)); c.stroke();
        c.fillStyle = o.bag;
        rrect(x + L(0.18), Y(0.98), L(0.2), L(0.28), L(0.03)); c.fill();
        if (o.bagFill) {
          for (let i = 0; i < 3; i++) {
            c.fillStyle = o.bagFill[i % o.bagFill.length];
            c.beginPath(); c.arc(x + L(0.22 + i * 0.06), Y(0.99), L(0.035), 0, TAU); c.fill();
          }
        }
      }
      if (o.basket) {
        c.fillStyle = '#b07a3e';
        c.beginPath(); c.ellipse(x - L(0.3), Y(0.68), L(0.15), L(0.09), 0, 0, Math.PI); c.fill();
        c.strokeStyle = '#8a5a2a'; c.lineWidth = Math.max(1, L(0.015));
        c.beginPath(); c.ellipse(x - L(0.3), Y(0.68), L(0.12), L(0.16), 0, Math.PI, TAU); c.stroke();
        c.fillStyle = '#4caf3c'; c.beginPath(); c.arc(x - L(0.33), Y(0.7), L(0.05), 0, TAU); c.fill();
        c.fillStyle = '#e04a2a'; c.beginPath(); c.arc(x - L(0.26), Y(0.7), L(0.045), 0, TAU); c.fill();
      }
    }

    /* ======================= TRANSPARENT (16 m) ======================= */
    (function banner() {
      const Z = 16, m = mpx(Z);
      const xa = 130 * s, xb = 800 * s;
      const yt = Y2y(4.1, Z), yb = Y2y(3.3, Z), yg = Y2y(0, Z);
      mat(Z, { name: 'Transparent' });
      // słupy
      for (const px of [xa, xb]) {
        c.fillStyle = lin(px - 0.08 * m, 0, px + 0.08 * m, 0, [[0, '#6b7a80'], [0.4, '#c7d2d6'], [1, '#4a5458']]);
        c.fillRect(px - 0.07 * m, Y2y(4.4, Z), 0.14 * m, yg - Y2y(4.4, Z));
        c.fillStyle = '#3d4649'; c.beginPath(); c.arc(px, Y2y(4.4, Z), 0.1 * m, 0, TAU); c.fill();
      }
      // płótno z lekkim falowaniem
      const x0 = xa + 0.12 * m, x1 = xb - 0.12 * m;
      c.beginPath();
      c.moveTo(x0, yt);
      c.quadraticCurveTo((x0 + x1) / 2, yt + 0.12 * m, x1, yt);
      c.lineTo(x1, yb);
      c.quadraticCurveTo((x0 + x1) / 2, yb + 0.12 * m, x0, yb);
      c.closePath();
      c.fillStyle = lin(x0, 0, x1, 0, [[0, '#fffaf0'], [0.3, '#f4ecd9'], [0.55, '#fffdf5'], [0.8, '#efe6d0'], [1, '#fbf5e6']]);
      c.fill();
      c.strokeStyle = '#2e8b3e'; c.lineWidth = 0.07 * m; c.stroke();
      // liny
      c.strokeStyle = '#6a6052'; c.lineWidth = Math.max(1, 0.03 * m);
      c.beginPath(); c.moveTo(xa, Y2y(4.15, Z)); c.lineTo(x0, yt); c.moveTo(xa, Y2y(3.25, Z)); c.lineTo(x0, yb);
      c.moveTo(xb, Y2y(4.15, Z)); c.lineTo(x1, yt); c.moveTo(xb, Y2y(3.25, Z)); c.lineTo(x1, yb); c.stroke();
      // napisy
      const cx = (x0 + x1) / 2, bw = (x1 - x0) * 0.92;
      c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.fillStyle = '#1f7a33';
      fitFont('TARG ŚWIEŻOŚCI – SOBOTA 7:00–14:00', bw, 0.36 * m, "bold #px 'Trebuchet MS', Arial, sans-serif");
      c.font = c.font;
      // dwukolorowy tytuł: zielone „TARG ŚWIEŻOŚCI”, czerwona godzina
      const t1 = 'TARG ŚWIEŻOŚCI – ', t2 = 'SOBOTA 7:00–14:00';
      const w1 = c.measureText(t1).width, w2 = c.measureText(t2).width;
      const sx = cx - (w1 + w2) / 2, ty = yt + 0.47 * m;
      c.textAlign = 'left';
      c.fillStyle = '#1f7a33'; txt(t1, sx, ty);
      c.fillStyle = '#c8261e'; txt(t2, sx + w1, ty);
      c.textAlign = 'center';
      c.fillStyle = '#5a4a3a';
      fitFont('owoce • warzywa • kwiaty • nabiał • miody – prosto od rolników', bw * 0.8, 0.15 * m, "italic #px Georgia, 'Times New Roman', serif");
      txt('owoce • warzywa • kwiaty • nabiał • miody – prosto od rolników', cx, yt + 0.71 * m);
      c.textAlign = 'left';
    })();

    /* ======================= STRAGANY Z PARASOLAMI (11–15 m) ======================= */
    function umbrellaStall(X, Z, colA, colB, goods, cloth) {
      const m = mpx(Z), x = X2x(X, Z);
      mat(Z, { name: 'Stragan z parasolem' });
      // stół
      const tw = 1.7, td = 0.8;
      const yT = Y2y(0.85, Z - td / 2), yB = Y2y(0.0, Z - td / 2);
      c.fillStyle = cloth;
      c.fillRect(X2x(X - tw / 2, Z - td / 2), yT, tw * mpx(Z - td / 2), yB - yT - 0.25 * m);
      c.fillStyle = 'rgba(0,0,0,0.15)';
      c.fillRect(X2x(X - tw / 2, Z - td / 2), yT, tw * mpx(Z - td / 2), 0.06 * m);
      // towar: kopczyki kolorów
      for (let i = 0; i < goods.length; i++) {
        const gx = X2x(X - tw / 2 + (i + 0.5) * tw / goods.length, Z - 0.1);
        const gy = Y2y(0.9, Z - 0.1);
        for (let j = 0; j < 14; j++) {
          const ax = gx + rr(-0.16, 0.16) * m, ay = gy + rr(-0.06, 0.05) * m;
          c.fillStyle = rad(ax - 0.02 * m, ay - 0.02 * m, 0, ax, ay, 0.05 * m, [[0, '#ffffff'], [0.25, goods[i]], [1, goods[i]]]);
          c.beginPath(); c.arc(ax, ay, 0.045 * m, 0, TAU); c.fill();
        }
      }
      // kij
      c.fillStyle = '#d8d8d0';
      c.fillRect(x - 0.025 * m, Y2y(2.7, Z), 0.05 * m, Y2y(0.85, Z) - Y2y(2.7, Z));
      // czasza: spód (soczewka między bliższą i dalszą krawędzią) + bliższa połowa
      const Rr = 1.45, Ye = 2.3, Ya = 2.8, n = 10;
      const edge = th => [X2x(X + Rr * Math.cos(th), Z - Rr * Math.sin(th)), Y2y(Ye, Z - Rr * Math.sin(th))];
      const apex = [x, Y2y(Ya, Z)];
      c.beginPath();
      for (let i = 0; i <= 40; i++) { const p = edge(Math.PI * 2 * i / 40); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }
      c.closePath();
      c.fillStyle = lin(0, Y2y(Ye, Z - Rr), 0, Y2y(Ye, Z + Rr), [[0, colA], [1, colB]]);
      c.fill();
      P.decor(() => { c.fillStyle = 'rgba(20,10,30,0.35)'; c.fill(); });
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n;
        const p0 = edge(a0), p1 = edge(a1), pm = edge((a0 + a1) / 2);
        c.beginPath();
        c.moveTo(apex[0], apex[1]); c.lineTo(p0[0], p0[1]);
        c.quadraticCurveTo(pm[0], pm[1] + 0.12 * m, p1[0], p1[1]);
        c.closePath();
        const col = i % 2 ? colA : colB;
        c.fillStyle = lin(apex[0], apex[1], pm[0], pm[1], [[0, col], [1, col]]);
        c.fill();
      }
      P.decor(() => {
        c.fillStyle = lin(x - Rr * m, 0, x + Rr * m, 0, [[0, 'rgba(255,255,230,0.25)'], [0.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,30,0.22)']]);
        c.beginPath(); c.moveTo(apex[0], apex[1]);
        for (let i = 0; i <= 20; i++) { const p = edge(Math.PI * i / 20); c.lineTo(p[0], p[1]); }
        c.closePath(); c.fill();
      });
      c.fillStyle = '#f0f0e8'; c.beginPath(); c.arc(apex[0], apex[1], 0.05 * m, 0, TAU); c.fill();
    }
    umbrellaStall(-3.0, 15, '#e94b3c', '#fff4e0', ['#e8402a', '#f5c518', '#5aa83a', '#f08a1c'], '#3f6fb5');
    umbrellaStall(1.6, 14.5, '#2f7fd0', '#ffffff', ['#7a3fa0', '#d8203a', '#f4d03f', '#3c9a3c'], '#d9a441');
    umbrellaStall(-0.9, 12, '#f2c230', '#2d9a5a', ['#e33b2f', '#ffa21f', '#a6d34f', '#6c2a8a', '#fbe26a'], '#c0392b');
    umbrellaStall(3.8, 12.5, '#3aa856', '#fffbe8', ['#ef5a2c', '#ffd23f', '#9c3b6b'], '#8a5a3a');

    /* ======================= LUDZIE (8–13 m) ======================= */
    person(-1.9, 13, { top: '#2f6fb0', topDark: '#1f4c80', legs: '#3a3a44', hair: '#2a1d14', back: true, h: 1.8 });
    person(0.4, 12.5, { top: '#d8452f', topDark: '#9c2c1d', legs: '#2c3e5c', hair: '#c9a066', back: true, long: true, h: 1.66, bag: '#e9dcc0' });
    person(-0.3, 11, { top: '#f2e5c8', topDark: '#c8b896', legs: '#5a6b3a', hair: '#5a3a22', back: false, cap: '#2f5f8f', h: 1.78 });
    person(1.15, 10.5, { top: '#7a3f9a', topDark: '#4e2766', legs: '#1f2430', hair: '#1a1410', back: true, bun: true, h: 1.62, skirt: '#2c6a5a' });
    person(2.3, 9.6, { top: '#3c8a4a', topDark: '#245a30', legs: '#3b4a6b', hair: '#8a8a8a', back: false, h: 1.74, basket: true });
    person(-1.25, 9.2, { top: '#f0c33c', topDark: '#c09020', legs: '#2c3e5c', hair: '#6a3a1e', back: true, long: true, h: 1.68, bag: '#c0392b', bagFill: ['#3fae49', '#e74c3c'] });

    /* ======================= BALONIKI (10 m) ======================= */
    (function balloons() {
      const Z = 10, m = mpx(Z);
      const hx = X2x(0.62, Z), hy = Y2y(1.15, Z);
      person(0.62, Z + 0.3, { top: '#e07a2a', topDark: '#a8541a', legs: '#30343c', hair: '#3b2a1e', back: false, h: 1.76, cap: '#c0392b', name: 'Sprzedawca baloników' });
      mat(Z, { name: 'Baloniki' });
      const cols = ['#e8322a', '#f5c518', '#2f80ed', '#2fb04a', '#ff6fae', '#ff8a1c', '#8e44ad', '#18b8c9', '#e8322a', '#2fb04a', '#f5c518'];
      const bs = [];
      for (let i = 0; i < cols.length; i++) {
        bs.push([hx + rr(-0.4, 0.4) * m, Y2y(rr(2.65, 3.35), Z), cols[i], rr(0.15, 0.19) * m]);
      }
      bs.sort((a, b) => a[1] - b[1]);
      c.strokeStyle = 'rgba(240,240,240,0.9)'; c.lineWidth = Math.max(1, 0.012 * m);
      c.beginPath();
      for (const b of bs) { c.moveTo(hx, hy); c.quadraticCurveTo(hx + (b[0] - hx) * 0.3, (hy + b[1]) / 2, b[0], b[1] + b[3] * 1.25); }
      c.stroke();
      for (const [bx, by, col, br] of bs) {
        c.fillStyle = rad(bx - br * 0.4, by - br * 0.45, br * 0.05, bx, by, br * 1.3, [[0, '#ffffff'], [0.18, col], [1, col]]);
        c.beginPath(); c.ellipse(bx, by, br, br * 1.2, 0, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(bx, by + br * 1.15); c.lineTo(bx - br * 0.15, by + br * 1.35); c.lineTo(bx + br * 0.15, by + br * 1.35); c.closePath(); c.fill();
        P.decor(() => {
          c.fillStyle = 'rgba(0,0,0,0.18)';
          c.beginPath(); c.ellipse(bx + br * 0.35, by + br * 0.3, br * 0.55, br * 0.8, -0.3, 0, TAU); c.fill();
        });
      }
    })();

    /* ======================= LUDZIE BLIŻEJ (8 m) ======================= */
    person(-1.0, 8.0, { top: '#f4f1ea', topDark: '#c9c2b4', legs: '#2c3e5c', hair: '#d8b070', back: true, long: true, h: 1.7, bag: '#2f7a4a', bagFill: ['#ff5a3a', '#f5c518', '#7ac143'] });
    person(1.9, 8.4, { top: '#b73a3a', topDark: '#7a2424', legs: '#2a2a2a', hair: '#151010', back: false, h: 1.82, coat: '#4a5a6a' });

    /* ======================= STRAGAN Z KWIATAMI (6,4–7,6 m) ======================= */
    (function flowerStall() {
      const Zf = 6.4, Zb = 7.6;
      const XL = -3.6, XR = -1.2;
      const name = 'Stragan z kwiatami';
      // tylna ściana z plandeki
      mat(Zb, { name });
      c.fillStyle = lin(0, Y2y(2.4, Zb), 0, Y2y(0, Zb), [[0, '#2f5a3a'], [1, '#203f29']]);
      c.fillRect(X2x(XL, Zb), Y2y(2.4, Zb), X2x(XR, Zb) - X2x(XL, Zb), Y2y(0, Zb) - Y2y(2.4, Zb));
      // sprzedawczyni
      person(-2.2, 7.3, { top: '#e88fb0', topDark: '#b0607e', legs: '#3a3a44', hair: '#8b4a2a', back: false, h: 1.66, name: 'Kwiaciarka' });
      // stopnie
      const steps = [[7.25, 1.35], [6.95, 1.12], [6.65, 0.9]];
      for (const [z, yy] of steps) {
        mat(z, { name });
        const x0 = X2x(XL, z), x1 = X2x(XR, z);
        c.fillStyle = '#7a5434'; c.fillRect(x0, Y2y(yy, z), x1 - x0, 0.04 * mpx(z));
        c.fillStyle = '#5d3f26'; c.fillRect(x0, Y2y(yy, z) + 0.04 * mpx(z), x1 - x0, Y2y(0, z) - Y2y(yy, z));
      }
      // bukiety w wiadrach
      const kinds = [
        ['sunflower', 'Słoneczniki'], ['rose', 'Czerwone róże'], ['lavender', 'Lawenda'], ['tulipR', 'Tulipany'], ['corn', 'Chabry'],
        ['tulipY', 'Tulipany'], ['rose', 'Czerwone róże'], ['tulipP', 'Tulipany'], ['sunflower', 'Słoneczniki'], ['lavender', 'Lawenda'],
        ['roseP', 'Róże'], ['corn', 'Chabry'], ['tulipO', 'Tulipany'], ['rose', 'Czerwone róże'], ['tulipV', 'Tulipany']
      ];
      let kk = 0;
      for (let si = 0; si < steps.length; si++) {
        const [z, yy] = steps[si];
        const m = mpx(z);
        const nB = 5;
        for (let b = 0; b < nB; b++) {
          const [kind, nm] = kinds[kk++ % kinds.length];
          const X = XL + 0.25 + b * (XR - XL - 0.5) / (nB - 1) + (si % 2) * 0.12;
          const bx = X2x(X, z), by = Y2y(yy, z);
          const bw = 0.26 * m, bh = 0.24 * m;
          mat(z, { name: nm });
          // łodygi
          c.strokeStyle = '#3f8a2e'; c.lineWidth = Math.max(1, 0.012 * m);
          const heads = [];
          const nH = kind === 'sunflower' ? 4 : kind === 'lavender' ? 16 : 10;
          for (let i = 0; i < nH; i++) {
            const a = rr(-0.5, 0.5);
            const len = (kind === 'sunflower' ? rr(0.5, 0.65) : kind === 'lavender' ? rr(0.35, 0.45) : rr(0.3, 0.42)) * m;
            const hx = bx + Math.sin(a) * len + rr(-0.05, 0.05) * m, hy = by - bh - Math.cos(a) * len * 0.85;
            c.beginPath(); c.moveTo(bx + rr(-0.06, 0.06) * m, by - bh * 0.6); c.lineTo(hx, hy); c.stroke();
            heads.push([hx, hy]);
          }
          // liście
          c.fillStyle = '#4c9a36';
          for (let i = 0; i < 5; i++) {
            const lx = bx + rr(-0.15, 0.15) * m, ly = by - bh - rr(0.02, 0.12) * m;
            c.beginPath(); c.ellipse(lx, ly, 0.05 * m, 0.016 * m, rr(-1, 1), 0, TAU); c.fill();
          }
          heads.sort((p, q) => p[1] - q[1]);
          for (const [hx, hy] of heads) flower(kind, hx, hy, m);
          // wiadro
          c.fillStyle = lin(bx - bw / 2, 0, bx + bw / 2, 0, [[0, '#cfd6da'], [0.35, '#f4f7f8'], [0.7, '#9aa4aa'], [1, '#7c868c']]);
          poly([[bx - bw / 2, by - bh], [bx + bw / 2, by - bh], [bx + bw * 0.4, by], [bx - bw * 0.4, by]]); c.fill();
          c.fillStyle = '#8a959b'; c.fillRect(bx - bw / 2, by - bh, bw, 0.02 * m);
        }
      }
      // karteczki z cenami
      mat(6.5, { name: 'Ceny kwiatów' });
      const tags = [['Róże 8 zł/szt.', -2.78, 1.4], ['Słoneczniki 6 zł', -1.75, 1.4], ['Tulipany 3 zł', -2.4, 1.17]];
      for (const [t, X, yy] of tags) {
        const m = mpx(6.5), tx = X2x(X, 6.5), ty = Y2y(yy, 6.5);
        c.font = `bold ${(0.055 * m).toFixed(1)}px Arial, sans-serif`;
        const tw = c.measureText(t).width + 0.04 * m;
        c.fillStyle = '#fffbe8'; c.fillRect(tx - tw / 2, ty - 0.07 * m, tw, 0.09 * m);
        c.fillStyle = '#c0392b'; c.textAlign = 'center'; txt(t, tx, ty);
        c.textAlign = 'left';
      }
      // markiza w zielono-kremowe pasy (spód + falbana)
      const yA = 2.15, yAb = 2.45, nS = 12;
      const P0 = (X, z, Yv) => [X2x(X, z), Y2y(Yv, z)];
      P.matGrad(0, Y2y(yAb, Zb), Zb, 0, Y2y(yA, Zf), Zf, { name: 'Markiza kwiaciarni' });
      for (let i = 0; i < nS; i++) {
        const X0 = XL - 0.1 + i * (XR - XL + 0.2) / nS, X1 = X0 + (XR - XL + 0.2) / nS;
        poly([P0(X0, Zb, yAb), P0(X1, Zb, yAb), P0(X1, Zf, yA), P0(X0, Zf, yA)]);
        c.fillStyle = i % 2 ? '#2f8f4e' : '#f3ecd6'; c.fill();
      }
      P.decor(() => {
        c.fillStyle = 'rgba(30,40,20,0.35)';
        poly([P0(XL - 0.1, Zb, yAb), P0(XR + 0.1, Zb, yAb), P0(XR + 0.1, Zf, yA), P0(XL - 0.1, Zf, yA)]); c.fill();
      });
      // słupki
      mat(Zf, { name: 'Stragan z kwiatami' });
      const m = mpx(Zf);
      c.fillStyle = '#8a8f92';
      c.fillRect(X2x(XR + 0.08, Zf) - 0.03 * m, Y2y(yA, Zf), 0.06 * m, Y2y(0, Zf) - Y2y(yA, Zf));
      // falbana z napisem
      const fy0 = Y2y(yA, Zf), fy1 = Y2y(yA - 0.26, Zf);
      const fx0 = X2x(XL - 0.1, Zf), fx1 = X2x(XR + 0.1, Zf);
      mat(Zf, { name: 'Markiza kwiaciarni' });
      c.beginPath();
      c.moveTo(fx0, fy0); c.lineTo(fx1, fy0); c.lineTo(fx1, fy1);
      const sc = 10, sw = (fx1 - fx0) / sc;
      for (let i = sc - 1; i >= 0; i--) c.quadraticCurveTo(fx0 + (i + 0.5) * sw, fy1 + 0.09 * m, fx0 + i * sw, fy1);
      c.closePath();
      c.fillStyle = '#2f8f4e'; c.fill();
      c.save(); c.clip();
      c.fillStyle = '#f3ecd6';
      for (let i = 0; i < sc; i += 2) c.fillRect(fx0 + i * sw, fy0, sw, fy1 - fy0 + 0.1 * m);
      c.restore();
      c.fillStyle = '#fff8e0'; c.fillRect(fx0 + (fx1 - fx0) * 0.28, fy0 + 0.03 * m, (fx1 - fx0) * 0.44, 0.17 * m);
      c.fillStyle = '#1f6a3a';
      c.textAlign = 'center';
      c.font = `bold ${(0.14 * m).toFixed(1)}px Georgia, 'Times New Roman', serif`;
      txt('KWIATY u Basi', (fx0 + fx1) / 2, fy0 + 0.165 * m);
      c.textAlign = 'left';
    })();

    function flower(kind, x, y, m) {
      const r = 0.045 * m;
      if (kind === 'sunflower') {
        const R2 = 0.09 * m;
        c.fillStyle = '#f7c21a';
        c.beginPath();
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * TAU, ex = x + Math.cos(a) * R2 * 0.75, ey = y + Math.sin(a) * R2 * 0.75 * 0.9;
          c.moveTo(ex + Math.cos(a) * R2 * 0.42, ey + Math.sin(a) * R2 * 0.42);
          c.ellipse(ex, ey, R2 * 0.42, R2 * 0.16, a, 0, TAU);
        }
        c.fill();
        c.fillStyle = rad(x - R2 * 0.15, y - R2 * 0.15, 0, x, y, R2 * 0.5, [[0, '#8a5a1e'], [1, '#3a2210']]);
        c.beginPath(); c.arc(x, y, R2 * 0.45, 0, TAU); c.fill();
      } else if (kind === 'rose' || kind === 'roseP') {
        const base = kind === 'rose' ? [355, 85, 38] : [340, 70, 70];
        c.fillStyle = rad(x - r * 0.3, y - r * 0.3, 0, x, y, r, [[0, hsl(base[0], base[1], base[2] + 18)], [0.7, hsl(base[0], base[1], base[2])], [1, hsl(base[0], base[1], base[2] - 15)]]);
        c.beginPath(); c.arc(x, y, r * 0.75, 0, TAU); c.fill();
        c.strokeStyle = hsl(base[0], base[1], base[2] - 18); c.lineWidth = Math.max(0.6, r * 0.12);
        c.beginPath(); c.arc(x, y, r * 0.42, 0.5, 4.5); c.stroke();
        c.beginPath(); c.arc(x + r * 0.05, y, r * 0.18, 2, 6); c.stroke();
      } else if (kind === 'lavender') {
        c.fillStyle = '#8a6fc4';
        c.beginPath();
        for (let i = 0; i < 5; i++) { c.moveTo(x + r * 0.18, y + i * r * 0.35); c.ellipse(x, y + i * r * 0.35, r * 0.18, r * 0.24, 0, 0, TAU); }
        c.fill();
        c.fillStyle = '#b39ae0'; c.beginPath(); c.ellipse(x - r * 0.05, y, r * 0.12, r * 0.18, 0, 0, TAU); c.fill();
      } else if (kind === 'corn') {
        c.fillStyle = '#2f62e0';
        c.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * TAU;
          c.moveTo(x, y); c.lineTo(x + Math.cos(a - 0.25) * r * 0.75, y + Math.sin(a - 0.25) * r * 0.7); c.lineTo(x + Math.cos(a + 0.25) * r * 0.75, y + Math.sin(a + 0.25) * r * 0.7); c.closePath();
        }
        c.fill();
        c.fillStyle = '#4d2a8a'; c.beginPath(); c.arc(x, y, r * 0.22, 0, TAU); c.fill();
      } else {
        const tc = { tulipR: [2, 85, 50], tulipY: [48, 95, 55], tulipP: [335, 80, 70], tulipO: [24, 95, 55], tulipV: [285, 55, 45] }[kind];
        c.fillStyle = lin(x - r * 0.6, 0, x + r * 0.6, 0, [[0, hsl(tc[0], tc[1], tc[2] + 15)], [1, hsl(tc[0], tc[1], tc[2] - 12)]]);
        c.beginPath();
        c.moveTo(x - r * 0.5, y - r * 0.55);
        c.lineTo(x - r * 0.2, y - r * 0.25); c.lineTo(x, y - r * 0.65); c.lineTo(x + r * 0.2, y - r * 0.25); c.lineTo(x + r * 0.5, y - r * 0.55);
        c.quadraticCurveTo(x + r * 0.55, y + r * 0.45, x, y + r * 0.45);
        c.quadraticCurveTo(x - r * 0.55, y + r * 0.45, x - r * 0.5, y - r * 0.55);
        c.fill();
      }
    }

    /* ======================= PRZECHODZIEŃ BLISKO (5 m) ======================= */
    person(-0.95, 5.2, { top: '#3e6f9e', topDark: '#284b6e', topLight: '#5a8cbc', legs: '#d8cfbf', hair: '#2b1b12', back: true, long: true, h: 1.68, bag: '#e9c46a', bagFill: ['#e63946', '#57cc99', '#ff9f1c'] });

    /* ======================= NASZ STRAGAN – OWOCE I WARZYWA ======================= */
    // słupek markizy i tabliczka PROMOCJA
    const poleX = 0.62, poleZ = 3.4;
    (function poleAndBoard() {
      const m = mpx(poleZ), x = X2x(poleX, poleZ);
      mat(poleZ, { name: 'Słupek markizy' });
      c.fillStyle = lin(x - 0.03 * m, 0, x + 0.03 * m, 0, [[0, '#5d6a62'], [0.35, '#b9c7bd'], [1, '#3b4640']]);
      c.fillRect(x - 0.028 * m, Y2y(2.2, poleZ), 0.056 * m, Y2y(0, poleZ) - Y2y(2.2, poleZ));
      // tabliczka PROMOCJA
      const Zb = 3.3, mb = mpx(Zb);
      const bx0 = X2x(0.06, Zb), bx1 = X2x(0.57, Zb), by0 = Y2y(1.9, Zb), by1 = Y2y(1.5, Zb);
      mat(Zb, { name: 'Tabliczka PROMOCJA' });
      c.strokeStyle = '#6b5a44'; c.lineWidth = Math.max(1, 0.006 * mb);
      c.beginPath(); c.moveTo(bx0 + 0.05 * mb, by0); c.lineTo(X2x(0.31, Zb), Y2y(2.12, Zb)); c.lineTo(bx1 - 0.05 * mb, by0); c.stroke();
      chalkBoard(bx0, by0, bx1 - bx0, by1 - by0, mb, (bw, bh, u) => {
        c.textAlign = 'center';
        chalkText('PROMOCJA!', bw / 2, 0.075 * u, 0.062 * u, '#fff27a', true);
        c.textAlign = 'left';
        const L = [['Truskawki', '9,99 zł/łub.', '#ff6b5e'], ['Ogórki', '2,99 zł/kg', '#7de36a'], ['Pomidory', '6,49 zł/kg', '#ff6b5e'], ['Sałata', '2,50 zł/szt.', '#7de36a']];
        for (let i = 0; i < L.length; i++) {
          const yy = 0.135 * u + i * 0.054 * u;
          chalkText(L[i][0], 0.025 * u, yy, 0.034 * u, L[i][2]);
          c.textAlign = 'right';
          chalkText(L[i][1], bw - 0.022 * u, yy, 0.036 * u, L[i][2], true);
          c.textAlign = 'left';
        }
        c.textAlign = 'center';
        chalkText('tylko w sobotę • do wyczerpania zapasów', bw / 2, bh - 0.016 * u, 0.019 * u, '#f4f1e8');
        c.textAlign = 'left';
      });
    })();

    function chalkBoard(x, y, w, h, u, fn) {
      // u – piksele na metr; drewniana rama i łupkowa tablica
      const fr = 0.012 * u;
      c.fillStyle = lin(x, y, x + w, y + h, [[0, '#c08a52'], [1, '#8a5a2e']]);
      rrect(x, y, w, h, fr * 0.6); c.fill();
      c.fillStyle = lin(x, y, x + w * 0.4, y + h, [[0, '#2f3536'], [1, '#1d2122']]);
      c.fillRect(x + fr, y + fr, w - 2 * fr, h - 2 * fr);
      P.decor(() => {
        c.fillStyle = 'rgba(255,255,255,0.05)';
        c.beginPath(); c.ellipse(x + w * 0.4, y + h * 0.55, w * 0.35, h * 0.25, 0.2, 0, TAU); c.fill();
      });
      c.save();
      c.translate(x, y);
      fn(w, h, u);
      c.restore();
    }
    function chalkText(t, x, y, size, col, bold) {
      c.font = `${bold ? 'bold ' : ''}${size.toFixed(1)}px ${CHALK}`;
      c.save();
      c.shadowColor = col; c.shadowBlur = Math.max(1, size * 0.12);
      c.fillStyle = col; c.globalAlpha = 0.92;
      txt(t, x, y);
      c.restore();
    }

    // półka z warzywami pod markizą
    (function shelf() {
      const Zs = 3.12, Ys = 1.45, m = mpx(Zs);
      mat(Zs, { name: 'Stragan warzywny' });
      const x0 = X2x(0.66, Zs);
      c.fillStyle = '#7a5530'; c.fillRect(x0, Y2y(Ys, Zs), W - x0, 0.05 * m);
      c.fillStyle = '#4a321c'; c.fillRect(x0, Y2y(Ys, Zs) + 0.05 * m, W - x0, 0.08 * m);
      // sałata
      mat(Zs, { name: 'Sałata' });
      lettuce(X2x(0.8, Zs + 0.08), Y2y(Ys + 0.07, Zs + 0.08), 0.12 * mpx(Zs + 0.08));
      lettuce(X2x(1.0, Zs), Y2y(Ys + 0.07, Zs), 0.125 * m);
      // rzodkiewki
      mat(Zs, { name: 'Rzodkiewki' });
      radishBunch(X2x(1.18, Zs), Y2y(Ys + 0.04, Zs), m);
      radishBunch(X2x(1.3, Zs - 0.05), Y2y(Ys + 0.035, Zs - 0.05), mpx(Zs - 0.05));
      // marchew
      mat(Zs, { name: 'Marchew' });
      carrotBunch(X2x(1.5, Zs), Y2y(Ys + 0.03, Zs), m);
      tag(1.26, Zs - 0.08, Ys + 0.2, 0.13, 0.085, [['Rzodkiewka', 0.018, '#f4f1e8'], ['3,00 zł', 0.028, '#ff8fb0', true], ['za pęczek', 0.016, '#cfe8ff']]);
    })();

    // markiza w czerwono-kremowe pasy (widziana od spodu) + falbany
    (function awning() {
      const Yb = 2.15, Zb = 3.4, Zn = 0.9, XL = poleX, XR = 4.2, Yd = 0.13;
      const n = 16, sw = (XR - XL) / n;
      P.matGrad(0, Y2y(Yb, Zb), Zb, 0, Y2y(Yb, 1.4), 1.4, { name: 'Markiza' });
      for (let i = 0; i < n; i++) {
        const X0 = XL + i * sw, X1 = X0 + sw;
        poly([[X2x(X0, Zb), Y2y(Yb, Zb)], [X2x(X1, Zb), Y2y(Yb, Zb)], [X2x(X1, Zn), Y2y(Yb, Zn)], [X2x(X0, Zn), Y2y(Yb, Zn)]]);
        c.fillStyle = i % 2 ? '#f6ecd8' : '#d93a2e';
        c.fill();
      }
      P.decor(() => {
        // światło prześwituje przez płótno, bliżej – cień
        c.fillStyle = lin(0, Y2y(Yb, Zb), 0, 0, [[0, 'rgba(255,200,140,0.12)'], [1, 'rgba(60,20,10,0.28)']]);
        poly([[X2x(XL, Zb), Y2y(Yb, Zb)], [W, Y2y(Yb, Zb)], [W, 0], [X2x(XL, 1.6), 0]]);
        c.fill();
      });
      // falbana tylna (na Zb)
      mat(Zb, { name: 'Markiza' });
      const m = mpx(Zb);
      const fx0 = X2x(XL, Zb), fx1 = W + 10 * s, fy0 = Y2y(Yb, Zb), fy1 = Y2y(Yb - Yd, Zb);
      const scw = 0.22 * m;
      c.beginPath();
      c.moveTo(fx0, fy0); c.lineTo(fx1, fy0); c.lineTo(fx1, fy1);
      for (let x = fx1; x > fx0; x -= scw) c.quadraticCurveTo(x - scw / 2, fy1 + 0.07 * m, Math.max(fx0, x - scw), fy1);
      c.closePath();
      c.fillStyle = '#d93a2e'; c.fill();
      c.save(); c.clip();
      c.fillStyle = '#f6ecd8';
      for (let x = fx0; x < fx1; x += 2 * scw) c.fillRect(x, fy0, scw, fy1 - fy0 + 0.1 * m);
      c.restore();
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(fx0, fy0, fx1 - fx0, 0.012 * m);
      // falbana boczna (X = XL, od Zb do Zn) – głębia zmienna w poziomie
      const sidePts = [];
      const zs = [];
      for (let z = Zb; z >= Zn; z -= 0.11) zs.push(z);
      P.matGrad(X2x(XL, Zb), 0, Zb, X2x(XL, Zn), 0, Zn, { name: 'Markiza' });
      for (let i = 0; i < zs.length - 1; i++) {
        const za = zs[i], zb = zs[i + 1];
        const a0 = [X2x(XL, za), Y2y(Yb, za)], a1 = [X2x(XL, zb), Y2y(Yb, zb)];
        const b0 = [X2x(XL, za), Y2y(Yb - Yd, za)], b1 = [X2x(XL, zb), Y2y(Yb - Yd, zb)];
        const zm = (za + zb) / 2;
        c.beginPath();
        c.moveTo(a0[0], a0[1]); c.lineTo(a1[0], a1[1]); c.lineTo(b1[0], b1[1]);
        c.quadraticCurveTo(X2x(XL, zm), Y2y(Yb - Yd - 0.06, zm), b0[0], b0[1]);
        c.closePath();
        c.fillStyle = i % 2 ? '#e6dcc6' : '#b82c22';
        c.fill();
        sidePts.push(a0);
      }
    })();

    /* ---------- owoce i warzywa ---------- */
    function apple(x, y, r, red) {
      const h = red ? rr(-8, 6) : rr(68, 88);
      const pal = red ? [hsl(h + 14, 92, 64), hsl(h, 82, 40), hsl(h - 4, 85, 17)] : [hsl(h - 8, 85, 74), hsl(h, 68, 46), hsl(h + 14, 72, 20)];
      c.save(); c.translate(x, y); c.rotate(rr(-0.35, 0.35));
      c.beginPath();
      c.moveTo(0, -0.72 * r);
      c.bezierCurveTo(0.35 * r, -1.02 * r, 1.08 * r, -0.95 * r, 1.04 * r, -0.08 * r);
      c.bezierCurveTo(1.0 * r, 0.62 * r, 0.55 * r, 0.98 * r, 0.18 * r, 0.93 * r);
      c.quadraticCurveTo(0, 0.88 * r, -0.18 * r, 0.93 * r);
      c.bezierCurveTo(-0.55 * r, 0.98 * r, -1.0 * r, 0.62 * r, -1.04 * r, -0.08 * r);
      c.bezierCurveTo(-1.08 * r, -0.95 * r, -0.35 * r, -1.02 * r, 0, -0.72 * r);
      c.closePath();
      c.fillStyle = rad(-0.38 * r, -0.42 * r, 0.05 * r, 0, 0, 1.15 * r, [[0, pal[0]], [0.5, pal[1]], [1, pal[2]]]);
      c.fill();
      P.decor(() => {
      c.save(); c.clip();
      if (red) {
        if (R() < 0.6) {
          c.fillStyle = rad(0.5 * r, 0.5 * r, 0, 0.5 * r, 0.5 * r, 0.9 * r, [[0, 'rgba(250,200,70,0.55)'], [1, 'rgba(250,200,70,0)']]);
          c.fillRect(-r, -r, 2 * r, 2 * r);
        }
        c.strokeStyle = 'rgba(120,10,20,0.16)'; c.lineWidth = Math.max(0.5, r * 0.09);
        c.beginPath();
        for (let i = 0; i < 5; i++) { const a = -2.4 + i * rr(0.9, 1.3); c.moveTo(0, -0.7 * r); c.quadraticCurveTo(Math.cos(a) * r * 0.6, -0.2 * r, Math.cos(a) * r * 1.1, Math.sin(a) * 0.3 * r + 0.6 * r); }
        c.stroke();
        c.fillStyle = 'rgba(255,230,160,0.45)';
        for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(rr(-0.7, 0.7) * r, rr(-0.4, 0.75) * r, Math.max(0.5, r * 0.03), 0, TAU); c.fill(); }
      } else {
        if (R() < 0.35) {
          c.fillStyle = rad(-0.5 * r, -0.2 * r, 0, -0.5 * r, -0.2 * r, 0.7 * r, [[0, 'rgba(230,120,60,0.35)'], [1, 'rgba(230,120,60,0)']]);
          c.fillRect(-r, -r, 2 * r, 2 * r);
        }
        c.fillStyle = 'rgba(255,255,220,0.5)';
        for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(rr(-0.7, 0.7) * r, rr(-0.5, 0.7) * r, Math.max(0.5, r * 0.035), 0, TAU); c.fill(); }
      }
      c.restore();
      // zagłębienie i ogonek
      c.fillStyle = rad(0, -0.62 * r, 0, 0, -0.62 * r, 0.3 * r, [[0, red ? 'rgba(70,40,10,0.9)' : 'rgba(70,80,20,0.9)'], [1, 'rgba(0,0,0,0)']]);
      c.beginPath(); c.ellipse(0, -0.62 * r, 0.3 * r, 0.16 * r, 0, 0, TAU); c.fill();
      c.strokeStyle = '#5a3a1a'; c.lineWidth = Math.max(0.8, r * 0.09); c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -0.62 * r); c.quadraticCurveTo(0.05 * r, -0.9 * r, 0.2 * r, -1.0 * r); c.stroke();
      c.lineCap = 'butt';
      if (R() < 0.25) {
        c.fillStyle = '#3f8a2a';
        c.beginPath(); c.ellipse(0.42 * r, -0.98 * r, 0.3 * r, 0.11 * r, -0.4, 0, TAU); c.fill();
      }
      shine(-0.42 * r, -0.4 * r, 0.22 * r, 0.12 * r, -0.7, 0.55);
      });
      c.restore();
    }

    function tomato(x, y, r, stage) {
      // stage: 0 zielony, 1 przełom, 2 pomarańczowy, 3 czerwony, 4 malinowy
      const P3 = [
        [hsl(80, 60, 70), hsl(88, 55, 45), hsl(100, 60, 18)],
        [hsl(60, 70, 72), hsl(55, 60, 50), hsl(70, 55, 22)],
        [hsl(28, 95, 66), hsl(20, 90, 50), hsl(12, 85, 22)],
        [hsl(8, 95, 64), hsl(3, 88, 45), hsl(355, 85, 18)],
        [hsl(350, 80, 70), hsl(346, 66, 48), hsl(340, 65, 20)]
      ][stage];
      c.save(); c.translate(x, y); c.rotate(rr(-0.3, 0.3));
      c.beginPath();
      const lobes = 5;
      for (let i = 0; i <= 40; i++) {
        const a = i / 40 * TAU;
        const rr2 = r * (1 + 0.04 * Math.cos(a * lobes)) * (stage === 4 ? 1.05 : 1);
        const px = Math.cos(a) * rr2 * 1.08, py = Math.sin(a) * rr2 * 0.9;
        if (i) c.lineTo(px, py); else c.moveTo(px, py);
      }
      c.closePath();
      c.fillStyle = rad(-0.35 * r, -0.4 * r, 0.05 * r, 0, 0, 1.15 * r, [[0, P3[0]], [0.5, P3[1]], [1, P3[2]]]);
      c.fill();
      P.decor(() => {
      if (stage === 1 || stage === 2) {
        c.save(); c.clip();
        c.fillStyle = rad(0.3 * r, 0.4 * r, 0, 0.3 * r, 0.4 * r, 0.9 * r, [[0, stage === 1 ? 'rgba(240,140,60,0.6)' : 'rgba(230,50,30,0.55)'], [1, 'rgba(230,50,30,0)']]);
        c.fillRect(-r * 1.2, -r, 2.4 * r, 2 * r);
        c.restore();
      }
      if (stage >= 3) {
        c.strokeStyle = 'rgba(80,0,0,0.25)'; c.lineWidth = Math.max(0.5, r * 0.05);
        c.beginPath(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.3; c.moveTo(Math.cos(a) * r * 0.2, -0.45 * r + Math.sin(a) * r * 0.1); c.lineTo(Math.cos(a) * r * 0.75, -0.2 * r + Math.sin(a) * r * 0.45); } c.stroke();
      }
      // szypułka – gwiazdka
      c.fillStyle = '#2f7a2a';
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + 0.2;
        c.moveTo(0, -0.45 * r);
        c.quadraticCurveTo(Math.cos(a + 0.4) * r * 0.2, -0.45 * r + Math.sin(a + 0.4) * r * 0.12, Math.cos(a) * r * 0.42, -0.45 * r + Math.sin(a) * r * 0.24);
        c.quadraticCurveTo(Math.cos(a - 0.4) * r * 0.2, -0.45 * r + Math.sin(a - 0.4) * r * 0.12, 0, -0.45 * r);
      }
      c.fill();
      c.fillStyle = '#4f9a3a'; c.fillRect(-0.05 * r, -0.62 * r, 0.1 * r, 0.18 * r);
      shine(-0.4 * r, -0.3 * r, 0.2 * r, 0.12 * r, -0.6, 0.6);
      shine(0.45 * r, 0.25 * r, 0.06 * r, 0.04 * r, 0, 0.35);
      });
      c.restore();
    }

    function strawberry(x, y, r) {
      c.save(); c.translate(x, y); c.rotate(rr(-0.7, 0.7));
      c.beginPath();
      c.moveTo(-0.85 * r, -0.45 * r);
      c.bezierCurveTo(-1.0 * r, 0.25 * r, -0.35 * r, 0.95 * r, 0, 1.1 * r);
      c.bezierCurveTo(0.35 * r, 0.95 * r, 1.0 * r, 0.25 * r, 0.85 * r, -0.45 * r);
      c.quadraticCurveTo(0, -0.85 * r, -0.85 * r, -0.45 * r);
      c.closePath();
      const lt = rr(0, 6);
      c.fillStyle = rad(-0.3 * r, -0.2 * r, 0.05 * r, 0, 0.1 * r, 1.15 * r, [[0, hsl(358, 95, 62 + lt)], [0.55, hsl(354, 92, 44)], [1, hsl(350, 90, 22)]]);
      c.fill();
      P.decor(() => {
      if (R() < 0.15) { c.save(); c.clip(); c.fillStyle = 'rgba(250,240,170,0.6)'; c.fillRect(-r, -0.6 * r, 2 * r, 0.35 * r); c.restore(); }
      c.fillStyle = '#ffe27a';
      if (r > 5 * s) {
        for (let i = 0; i < 12; i++) {
          const sx = rr(-0.6, 0.6) * r, sy = rr(-0.25, 0.8) * r;
          if (Math.abs(sx) > (1.0 - sy / r * 0.6) * r * 0.75) continue;
          c.beginPath(); c.ellipse(sx, sy, Math.max(0.5, r * 0.045), Math.max(0.5, r * 0.07), 0, 0, TAU); c.fill();
        }
      }
      c.fillStyle = '#2f8a2c';
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI + i / 5 * Math.PI;
        c.moveTo(0, -0.55 * r);
        c.quadraticCurveTo(Math.cos(a + 0.3) * r * 0.4, -0.55 * r + Math.sin(a + 0.3) * r * 0.3, Math.cos(a) * r * 0.75, -0.55 * r + Math.sin(a) * r * 0.35 + 0.18 * r);
        c.quadraticCurveTo(Math.cos(a - 0.3) * r * 0.2, -0.5 * r, 0, -0.55 * r);
      }
      c.fill();
      shine(-0.35 * r, -0.05 * r, 0.16 * r, 0.1 * r, -0.8, 0.55);
      });
      c.restore();
    }

    function blueberry(x, y, r) {
      c.fillStyle = rad(x - 0.35 * r, y - 0.35 * r, 0, x, y, r * 1.05, [[0, '#9fb0d8'], [0.35, '#4a5a9a'], [1, '#141a40']]);
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      P.decor(() => {
      if (r > 3 * s) {
        c.strokeStyle = '#1a1530'; c.lineWidth = Math.max(0.5, r * 0.15);
        c.beginPath(); c.arc(x + 0.15 * r, y - 0.1 * r, r * 0.22, 0, TAU); c.stroke();
      }
      });
    }

    function plum(x, y, r) {
      c.save(); c.translate(x, y); c.rotate(rr(-0.6, 0.6));
      c.beginPath(); c.ellipse(0, 0, r * 0.78, r, 0, 0, TAU);
      c.fillStyle = rad(-0.3 * r, -0.35 * r, 0.05 * r, 0, 0, r * 1.1, [[0, hsl(262, 30, 62)], [0.4, hsl(268, 45, 32)], [1, hsl(275, 55, 11)]]);
      c.fill();
      P.decor(() => {
      c.strokeStyle = 'rgba(30,10,40,0.6)'; c.lineWidth = Math.max(0.5, r * 0.06);
      c.beginPath(); c.moveTo(0.1 * r, -0.95 * r); c.quadraticCurveTo(0.45 * r, 0, 0.1 * r, 0.95 * r); c.stroke();
      shine(-0.3 * r, -0.35 * r, 0.22 * r, 0.14 * r, -0.6, 0.25);
      });
      c.restore();
    }

    function orange(x, y, r) {
      c.fillStyle = rad(x - 0.38 * r, y - 0.4 * r, 0.05 * r, x, y, r * 1.1, [[0, '#ffd27a'], [0.45, '#f7901c'], [1, '#9a4300']]);
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      P.decor(() => {
      c.fillStyle = 'rgba(170,70,0,0.35)';
      for (let i = 0; i < 14; i++) {
        const a = rr(0, TAU), d = rr(0, 0.85) * r;
        c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, Math.max(0.5, r * 0.03), 0, TAU); c.fill();
      }
      c.fillStyle = '#6a7a2a';
      c.beginPath(); c.arc(x + rr(-0.2, 0.2) * r, y - 0.55 * r, Math.max(0.8, r * 0.07), 0, TAU); c.fill();
      shine(x - 0.38 * r, y - 0.38 * r, 0.2 * r, 0.12 * r, -0.7, 0.45);
      });
    }

    function lemon(x, y, r) {
      c.save(); c.translate(x, y); c.rotate(rr(-0.5, 0.5));
      c.beginPath();
      c.moveTo(-1.3 * r, 0);
      c.quadraticCurveTo(-1.15 * r, -0.85 * r, 0, -0.85 * r);
      c.quadraticCurveTo(1.15 * r, -0.85 * r, 1.3 * r, 0);
      c.quadraticCurveTo(1.15 * r, 0.85 * r, 0, 0.85 * r);
      c.quadraticCurveTo(-1.15 * r, 0.85 * r, -1.3 * r, 0);
      c.closePath();
      c.fillStyle = rad(-0.4 * r, -0.35 * r, 0.05 * r, 0, 0, r * 1.3, [[0, '#fffbc0'], [0.45, '#f7df2a'], [1, '#a88500']]);
      c.fill();
      P.decor(() => {
      shine(-0.4 * r, -0.4 * r, 0.3 * r, 0.1 * r, -0.2, 0.5);
      });
      c.restore();
    }

    function banana(x, y, len, ang, green) {
      c.save(); c.translate(x, y); c.rotate(ang);
      const t = len * 0.17;
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const u = i / 12;
        const px = u * len, py = -Math.sin(u * Math.PI * 0.85) * len * 0.22;
        const th = t * (0.55 + 0.45 * Math.sin(Math.min(1, u * 1.2) * Math.PI * 0.95));
        pts.push([px, py, th]);
      }
      c.beginPath();
      for (let i = 0; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1] - pts[i][2] / 2);
      for (let i = pts.length - 1; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1] + pts[i][2] / 2);
      c.closePath();
      c.fillStyle = lin(0, -len * 0.25 - t / 2, 0, t / 2, green ? [[0, '#eaf29a'], [0.5, '#bcd23e'], [1, '#6f8a18']] : [[0, '#fff6a8'], [0.5, '#f6d22a'], [1, '#b88a10']]);
      c.fill();
      P.decor(() => {
      c.strokeStyle = green ? 'rgba(90,110,20,0.5)' : 'rgba(150,110,20,0.45)'; c.lineWidth = Math.max(0.5, t * 0.06);
      c.beginPath(); for (let i = 1; i < pts.length - 1; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke();
      if (!green) {
        c.fillStyle = 'rgba(100,60,10,0.6)';
        for (let i = 0; i < 6; i++) { const p = pts[ri(2, 10)]; c.beginPath(); c.arc(p[0] + rr(-2, 2) * s, p[1] + rr(-0.3, 0.3) * p[2], Math.max(0.5, t * 0.06), 0, TAU); c.fill(); }
      }
      c.fillStyle = '#4a3a20';
      const e = pts[pts.length - 1];
      c.beginPath(); c.arc(e[0], e[1], Math.max(0.8, t * 0.18), 0, TAU); c.fill();
      });
      c.restore();
    }

    function beet(x, y, r) {
      c.fillStyle = rad(x - 0.35 * r, y - 0.35 * r, 0.05 * r, x, y, r * 1.05, [[0, '#c24a6a'], [0.45, '#7a1238'], [1, '#2a0414']]);
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      P.decor(() => {
      c.strokeStyle = '#5a0a24'; c.lineWidth = Math.max(0.6, r * 0.08);
      c.beginPath(); c.moveTo(x + 0.6 * r, y + 0.7 * r); c.quadraticCurveTo(x + 0.9 * r, y + 1.1 * r, x + 1.25 * r, y + 1.0 * r); c.stroke();
      c.strokeStyle = '#b0204a'; c.lineWidth = Math.max(0.6, r * 0.12);
      c.beginPath(); c.moveTo(x - 0.1 * r, y - 0.8 * r); c.lineTo(x - 0.3 * r, y - 1.25 * r); c.moveTo(x + 0.1 * r, y - 0.8 * r); c.lineTo(x + 0.3 * r, y - 1.3 * r); c.stroke();
      shine(x - 0.35 * r, y - 0.35 * r, 0.18 * r, 0.1 * r, -0.6, 0.3);
      });
    }

    function cucumber(x, y, len, ang) {
      const r = len * 0.17;
      c.save(); c.translate(x, y); c.rotate(ang);
      rrect(-len / 2, -r, len, 2 * r, r);
      c.fillStyle = lin(0, -r, 0, r, [[0, '#8cc45a'], [0.35, '#3f7f26'], [1, '#13361a']]);
      c.fill();
      P.decor(() => {
      c.save(); c.clip();
      c.fillStyle = 'rgba(220,240,160,0.35)';
      c.fillRect(len * 0.2, -r * 0.5, len * 0.3, r * 0.3);
      c.fillRect(len * 0.15, r * 0.1, len * 0.33, r * 0.25);
      c.restore();
      c.fillStyle = 'rgba(230,250,190,0.7)';
      for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(rr(-0.45, 0.45) * len, rr(-0.75, 0.6) * r, Math.max(0.5, r * 0.08), 0, TAU); c.fill(); }
      c.fillStyle = '#c9c070'; c.beginPath(); c.arc(len / 2 - r * 0.25, 0, r * 0.18, 0, TAU); c.fill();
      shine(-len * 0.1, -r * 0.55, len * 0.3, r * 0.14, 0, 0.35);
      });
      c.restore();
    }

    function pepper(x, y, r, col) {
      const pal = {
        red: [hsl(4, 95, 64), hsl(1, 90, 42), hsl(355, 90, 16)],
        yellow: [hsl(52, 100, 72), hsl(45, 98, 50), hsl(36, 95, 26)],
        green: [hsl(95, 60, 60), hsl(110, 62, 32), hsl(125, 70, 12)],
        orange: [hsl(32, 100, 66), hsl(25, 98, 50), hsl(18, 95, 24)]
      }[col];
      c.save(); c.translate(x, y); c.rotate(rr(-0.4, 0.4));
      c.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = i / 48 * TAU;
        const rr2 = r * (0.88 + 0.12 * Math.cos(a * 4 + 0.4));
        const px = Math.cos(a) * rr2, py = Math.sin(a) * rr2 * 0.88;
        if (i) c.lineTo(px, py); else c.moveTo(px, py);
      }
      c.closePath();
      c.fillStyle = rad(-0.35 * r, -0.35 * r, 0.05 * r, 0, 0, 1.1 * r, [[0, pal[0]], [0.5, pal[1]], [1, pal[2]]]);
      c.fill();
      P.decor(() => {
      c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = Math.max(0.6, r * 0.05);
      c.beginPath();
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.4 + Math.PI / 4; c.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.25); c.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.75); }
      c.stroke();
      // szypułka
      c.fillStyle = '#2e6a22';
      c.beginPath(); c.ellipse(0, -0.05 * r, 0.26 * r, 0.18 * r, 0, 0, TAU); c.fill();
      c.strokeStyle = '#4a8a2e'; c.lineWidth = Math.max(1, r * 0.13); c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -0.08 * r); c.quadraticCurveTo(0.05 * r, -0.35 * r, 0.25 * r, -0.42 * r); c.stroke();
      c.lineCap = 'butt';
      c.fillStyle = '#b8d88a'; c.beginPath(); c.arc(0.25 * r, -0.42 * r, Math.max(0.6, r * 0.06), 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = Math.max(0.8, r * 0.07); c.lineCap = 'round';
      c.beginPath(); c.arc(0, 0, r * 0.7, 3.5, 4.2); c.stroke();
      c.lineCap = 'butt';
      shine(-0.5 * r, 0.2 * r, 0.1 * r, 0.06 * r, 0, 0.5);
      });
      c.restore();
    }

    function lettuce(x, y, R0) {
      for (let layer = 0; layer < 4; layer++) {
        const rL = R0 * (1 - layer * 0.22), ph = rr(0, TAU);
        c.beginPath();
        for (let i = 0; i <= 60; i++) {
          const a = i / 60 * TAU;
          const rr2 = rL * (1 + 0.08 * Math.sin(a * 11 + ph) + 0.04 * Math.sin(a * 23));
          const px = x + Math.cos(a) * rr2, py = y - layer * R0 * 0.08 + Math.sin(a) * rr2 * 0.72;
          if (i) c.lineTo(px, py); else c.moveTo(px, py);
        }
        c.closePath();
        const l = 34 + layer * 12;
        c.fillStyle = rad(x - rL * 0.3, y - rL * 0.4, 0, x, y, rL * 1.1, [[0, hsl(85, 70, l + 22)], [0.6, hsl(95, 60, l + 6)], [1, hsl(105, 55, l - 10)]]);
        c.fill();
        c.strokeStyle = hsl(80, 60, 82, 0.5); c.lineWidth = Math.max(0.5, R0 * 0.015);
        c.beginPath();
        for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + ph; c.moveTo(x, y - layer * R0 * 0.08); c.lineTo(x + Math.cos(a) * rL * 0.8, y - layer * R0 * 0.08 + Math.sin(a) * rL * 0.55); }
        c.stroke();
      }
    }

    function radishBunch(x, y, m) {
      c.fillStyle = '#3f8f2e';
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI / 2 + rr(-0.8, 0.8);
        const lx = x + Math.cos(a) * 0.12 * m, ly = y + Math.sin(a) * 0.12 * m;
        c.beginPath(); c.ellipse(lx, ly, 0.03 * m, 0.07 * m, a + Math.PI / 2, 0, TAU);
        c.fillStyle = hsl(rr(95, 110), 55, rr(32, 44)); c.fill();
      }
      c.strokeStyle = '#d8e8b0'; c.lineWidth = Math.max(0.8, 0.004 * m);
      c.beginPath(); c.moveTo(x - 0.03 * m, y - 0.02 * m); c.lineTo(x + 0.03 * m, y - 0.02 * m); c.stroke();
      for (let i = 0; i < 7; i++) {
        const rx = x + rr(-0.06, 0.06) * m, ry = y + rr(0.0, 0.06) * m, r = 0.017 * m;
        c.strokeStyle = '#f2e8e0'; c.lineWidth = Math.max(0.5, r * 0.15);
        c.beginPath(); c.moveTo(rx, ry + r * 0.8); c.lineTo(rx + rr(-0.3, 0.3) * r, ry + r * 2.2); c.stroke();
        c.fillStyle = rad(rx - 0.35 * r, ry - 0.35 * r, 0, rx, ry, r, [[0, '#ff8fb0'], [0.5, '#e0245a'], [1, '#7a0828']]);
        c.beginPath(); c.arc(rx, ry, r, 0, TAU); c.fill();
        c.fillStyle = '#f6eeea'; c.beginPath(); c.ellipse(rx, ry + 0.75 * r, r * 0.35, r * 0.25, 0, 0, TAU); c.fill();
      }
    }

    function carrotBunch(x, y, m) {
      for (let i = 0; i < 9; i++) {
        const a = rr(-0.5, 0.5);
        const tx = x + Math.sin(a) * 0.12 * m, ty = y - 0.04 * m;
        c.strokeStyle = hsl(rr(95, 115), 55, rr(30, 45)); c.lineWidth = Math.max(0.6, 0.004 * m);
        c.beginPath();
        for (let j = 0; j < 7; j++) { const bb = a + rr(-0.4, 0.4); c.moveTo(x, y - 0.03 * m); c.lineTo(x + Math.sin(bb) * 0.22 * m, y - 0.03 * m - Math.cos(bb) * 0.2 * m); }
        c.stroke();
        void tx; void ty;
      }
      for (let i = 0; i < 8; i++) {
        const ang = 0.4 + rr(-0.35, 0.35);
        const cx = x + rr(-0.05, 0.05) * m, cy = y + rr(-0.02, 0.02) * m;
        const L = 0.17 * m, wd = 0.022 * m;
        c.save(); c.translate(cx, cy); c.rotate(ang);
        c.beginPath(); c.moveTo(-wd, 0); c.quadraticCurveTo(-wd, L * 0.5, 0, L); c.quadraticCurveTo(wd, L * 0.5, wd, 0); c.closePath();
        c.fillStyle = lin(-wd, 0, wd, 0, [[0, '#ffb04a'], [0.5, '#f27a12'], [1, '#a84a00']]);
        c.fill();
        c.strokeStyle = 'rgba(120,50,0,0.4)'; c.lineWidth = Math.max(0.5, wd * 0.08);
        c.beginPath(); for (let k = 1; k < 6; k++) { const yy = L * k / 7; c.moveTo(-wd * (1 - k / 7) * 0.9, yy); c.lineTo(wd * (1 - k / 7) * 0.5, yy + wd * 0.1); } c.stroke();
        c.restore();
      }
    }

    function dill(x, y, m) {
      c.strokeStyle = '#6aa83a'; c.lineWidth = Math.max(0.6, 0.004 * m);
      for (let i = 0; i < 18; i++) {
        const a = rr(-0.6, 0.6), L = rr(0.12, 0.2) * m;
        const ex = x + Math.sin(a) * L, ey = y - Math.cos(a) * L * 0.6;
        c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.stroke();
        c.fillStyle = hsl(rr(80, 100), 55, rr(40, 55));
        for (let j = 0; j < 5; j++) { c.beginPath(); c.arc(ex + rr(-0.02, 0.02) * m, ey + rr(-0.02, 0.02) * m, 0.006 * m, 0, TAU); c.fill(); }
      }
    }

    /* ---------- skrzynki ---------- */
    function crate(X0, X1, Zb, Yb, Zf, Yf, name, fill, tagSpec) {
      const pBL = [X2x(X0, Zb), Y2y(Yb, Zb)], pBR = [X2x(X1, Zb), Y2y(Yb, Zb)];
      const pFL = [X2x(X0, Zf), Y2y(Yf, Zf)], pFR = [X2x(X1, Zf), Y2y(Yf, Zf)];
      // tylna ścianka
      mat(Zb, { name: 'Drewniana skrzynka' });
      const up = 0.06;
      poly([pBL, pBR, [X2x(X1, Zb), Y2y(Yb + up, Zb)], [X2x(X0, Zb), Y2y(Yb + up, Zb)]]);
      c.fillStyle = '#b08350'; c.fill();
      // wnętrze
      P.matGrad(0, pBL[1], Zb, 0, pFL[1], Zf, { name: 'Drewniana skrzynka' });
      poly([pBL, pBR, pFR, pFL]);
      c.fillStyle = lin(0, pBL[1], 0, pFL[1], [[0, '#4a3220'], [1, '#6a4a2c']]);
      c.fill();
      // zawartość
      P.matGrad(0, pBL[1], Zb, 0, pFL[1], Zf, { name });
      const at = (u, w, lift) => {
        const X = X0 + (X1 - X0) * u, Z = Zb + (Zf - Zb) * w, Y = Yb + (Yf - Yb) * w + (lift || 0);
        return [X2x(X, Z), Y2y(Y, Z), mpx(Z)];
      };
      fill(at, X1 - X0);
      // boczne listwy
      P.matGrad(0, pBL[1], Zb, 0, pFL[1], Zf, { name: 'Drewniana skrzynka' });
      const th = 0.012;
      for (const Xs of [X0, X1 - th]) {
        poly([[X2x(Xs, Zb), Y2y(Yb + up, Zb)], [X2x(Xs + th, Zb), Y2y(Yb + up, Zb)], [X2x(Xs + th, Zf), Y2y(Yf + 0.03, Zf)], [X2x(Xs, Zf), Y2y(Yf + 0.03, Zf)]]);
        c.fillStyle = '#d6aa6c'; c.fill();
      }
      // przednia ścianka z deszczułek
      mat(Zf, { name: 'Drewniana skrzynka' });
      const m = mpx(Zf), fx0 = X2x(X0, Zf), fx1 = X2x(X1, Zf);
      const slats = [[0.03, -0.035], [-0.05, -0.12]];
      for (const [a, b] of slats) {
        const y0 = Y2y(Yf + a, Zf), y1 = Y2y(Yf + b, Zf);
        c.fillStyle = lin(0, y0, 0, y1, [[0, '#f0c98e'], [0.2, '#dcae70'], [1, '#b8864e']]);
        c.fillRect(fx0, y0, fx1 - fx0, y1 - y0);
        c.strokeStyle = 'rgba(120,70,30,0.35)'; c.lineWidth = Math.max(0.5, 0.0025 * m);
        c.beginPath();
        for (let i = 0; i < 3; i++) { const yy = y0 + (y1 - y0) * (0.25 + i * 0.25); c.moveTo(fx0, yy); c.bezierCurveTo(fx0 + (fx1 - fx0) * 0.3, yy + rr(-2, 2) * s, fx0 + (fx1 - fx0) * 0.7, yy + rr(-2, 2) * s, fx1, yy); }
        c.stroke();
      }
      c.fillStyle = '#2e2014';
      c.fillRect(fx0, Y2y(Yf - 0.035, Zf), fx1 - fx0, Y2y(Yf - 0.05, Zf) - Y2y(Yf - 0.035, Zf));
      c.fillStyle = '#8a6038';
      c.fillRect(fx0, Y2y(Yf + 0.03, Zf), 0.018 * m, Y2y(Yf - 0.12, Zf) - Y2y(Yf + 0.03, Zf));
      c.fillRect(fx1 - 0.018 * m, Y2y(Yf + 0.03, Zf), 0.018 * m, Y2y(Yf - 0.12, Zf) - Y2y(Yf + 0.03, Zf));
      P.decor(() => {
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.fillRect(fx0, Y2y(Yf - 0.12, Zf), fx1 - fx0, 0.02 * m);
      });
      if (tagSpec) tagSpec();
    }

    function tag(X, Z, Ybot, wM, hM, lines) {
      // tabliczka kredowa na patyku: dolna krawędź na wysokości Ybot (m), środek w X
      const m = mpx(Z);
      const x = X2x(X, Z), yb = Y2y(Ybot, Z), w = wM * m, h = hM * m;
      mat(Z, { name: 'Tabliczka z ceną' });
      c.fillStyle = '#9a7048';
      c.fillRect(x - 0.004 * m, yb - 0.01 * m, 0.008 * m, 0.09 * m);
      chalkBoard(x - w / 2, yb - h, w, h, m, (bw, bh, u) => {
        let yy = 0.012 * u;
        c.textAlign = 'center';
        for (const [t, sz, col, bold] of lines) {
          yy += sz * u * 0.98;
          chalkText(t, bw / 2, yy, sz * u, col, bold);
          yy += sz * u * 0.22;
        }
        c.textAlign = 'left';
      });
    }

    // ---- poziom A (tylny, 2,5–2,9 m) ----
    const A = { Zb: 2.9, Yb: 1.42, Zf: 2.5, Yf: 1.30, X: -0.25, w: 0.31 };
    const B = { Zb: 2.45, Yb: 1.27, Zf: 2.02, Yf: 1.12, X: -0.33, w: 0.33 };
    const C = { Zb: 1.97, Yb: 1.09, Zf: 1.6, Yf: 0.98, X: -0.36, w: 0.27 };
    const slot = (T, i) => [T.X + i * T.w, T.X + (i + 1) * T.w - 0.008];

    // równomierne rozłożenie owoców w skrzynce (od tyłu do przodu)
    function grid(at, cols, rows, rad3, draw, opts) {
      const o = opts || {};
      for (let rI = 0; rI < rows; rI++) {
        const w = (rI + 0.5) / rows * (o.wMax || 0.95);
        for (let cI = 0; cI < cols; cI++) {
          const u = (cI + 0.5 + (rI % 2) * 0.35 - 0.17 + rr(-0.12, 0.12)) / cols;
          if (u < 0.06 || u > 0.94) continue;
          const lift = rad3 * 0.6 + 0.02 * Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, w));
          const [x, y, m] = at(u, w + rr(-0.03, 0.03), lift);
          draw(x, y, rad3 * m * rr(0.92, 1.08), rI, cI);
        }
      }
      if (o.top) {
        for (let i = 0; i < o.top; i++) {
          const u = rr(0.2, 0.8), w = rr(0.25, 0.75);
          const [x, y, m] = at(u, w, rad3 * 1.5 + 0.02);
          draw(x, y, rad3 * m * rr(0.92, 1.08), -1, i);
        }
      }
    }

    let sl;
    // Banany
    sl = slot(A, 0);
    crate(sl[0], sl[1], A.Zb, A.Yb, A.Zf, A.Yf, 'Banany', (at) => {
      for (let i = 0; i < 6; i++) {
        const [x, y, m] = at(0.18 + (i % 3) * 0.3, 0.2 + Math.floor(i / 3) * 0.45, 0.05);
        const green = i === 1 || i === 5;
        for (let k = 0; k < 4; k++) banana(x - 0.07 * m + k * 0.012 * m, y + k * 0.012 * m, 0.17 * m, -0.25 + k * 0.1, green);
      }
    }, () => tag(slot(A, 0)[0] + 0.07, A.Zb - 0.05, A.Yb + 0.05, 0.13, 0.085, [['Banany', 0.017, '#fff27a'], ['5,49 zł', 0.028, '#f4f1e8', true], ['za kg', 0.015, '#cfe8ff']]));
    // Pomarańcze
    sl = slot(A, 1);
    crate(sl[0], sl[1], A.Zb, A.Yb, A.Zf, A.Yf, 'Pomarańcze', (at) => grid(at, 4, 5, 0.04, (x, y, r) => orange(x, y, r), { top: 3 }));
    // Cytryny
    sl = slot(A, 2);
    crate(sl[0], sl[1], A.Zb, A.Yb, A.Zf, A.Yf, 'Cytryny', (at) => grid(at, 5, 6, 0.032, (x, y, r) => lemon(x, y, r), { top: 3 }),
      () => tag(slot(A, 2)[0] + 0.21, A.Zb - 0.05, A.Yb + 0.05, 0.13, 0.085, [['Cytryny', 0.017, '#fff27a'], ['1,20 zł', 0.028, '#f4f1e8', true], ['za sztukę', 0.015, '#cfe8ff']]));
    // Śliwki
    sl = slot(A, 3);
    crate(sl[0], sl[1], A.Zb, A.Yb, A.Zf, A.Yf, 'Śliwki', (at) => grid(at, 7, 8, 0.024, (x, y, r) => plum(x, y, r), { top: 5 }),
      () => tag(slot(A, 3)[0] + 0.2, A.Zb - 0.05, A.Yb + 0.05, 0.145, 0.09, [['Śliwki węgierki', 0.0155, '#d8b4ff'], ['7,50 zł', 0.028, '#f4f1e8', true], ['za kg', 0.015, '#cfe8ff']]));
    // Buraki
    sl = slot(A, 4);
    crate(sl[0], sl[1], A.Zb, A.Yb, A.Zf, A.Yf, 'Buraki', (at) => grid(at, 4, 5, 0.038, (x, y, r) => beet(x, y, r), { top: 2 }));

    // ---- poziom B (środkowy, 2,0–2,45 m) ----
    sl = slot(B, 0);
    crate(sl[0], sl[1], B.Zb, B.Yb, B.Zf, B.Yf, 'Czerwone jabłka', (at) => grid(at, 4, 5, 0.04, (x, y, r) => apple(x, y, r, true), { top: 4 }),
      () => tag(slot(B, 0)[0] + 0.1, B.Zb - 0.06, B.Yb + 0.06, 0.15, 0.1, [['Jabłka Ligol', 0.017, '#ff8a7a'], ['4,99 zł/kg', 0.03, '#f4f1e8', true], ['polskie, z sadu', 0.013, '#cfe8ff']]));
    sl = slot(B, 1);
    crate(sl[0], sl[1], B.Zb, B.Yb, B.Zf, B.Yf, 'Zielone jabłka', (at) => grid(at, 4, 5, 0.04, (x, y, r) => apple(x, y, r, false), { top: 4 }),
      () => tag(slot(B, 1)[0] + 0.23, B.Zb - 0.06, B.Yb + 0.06, 0.15, 0.1, [['PROMOCJA', 0.018, '#ff6b5e', true], ['Jabłka zielone', 0.014, '#f4f1e8'], ['3,99 zł/kg', 0.027, '#7de36a', true]]));
    sl = slot(B, 2);
    crate(sl[0], sl[1], B.Zb, B.Yb, B.Zf, B.Yf, 'Pomidory malinowe', (at) => grid(at, 4, 6, 0.038, (x, y, r) => tomato(x, y, r, R() < 0.8 ? 4 : 3), { top: 3 }),
      () => tag(slot(B, 2)[0] + 0.1, B.Zb - 0.06, B.Yb + 0.06, 0.15, 0.1, [['Pomidory malinowe', 0.0135, '#ffb0c8'], ['12,90 zł', 0.03, '#f4f1e8', true], ['za kg', 0.013, '#cfe8ff']]));
    sl = slot(B, 3);
    crate(sl[0], sl[1], B.Zb, B.Yb, B.Zf, B.Yf, 'Pomidory dojrzewające', (at) => grid(at, 4, 6, 0.036, (x, y, r) => tomato(x, y, r, pick([0, 0, 1, 1, 2, 2, 3])), { top: 3 }),
      () => tag(slot(B, 3)[0] + 0.12, B.Zb - 0.06, B.Yb + 0.06, 0.15, 0.1, [['PROMOCJA', 0.018, '#7de36a', true], ['Pomidory gruntowe', 0.0125, '#f4f1e8'], ['6,49 zł/kg', 0.027, '#ff6b5e', true]]));
    sl = slot(B, 4);
    crate(sl[0], sl[1], B.Zb, B.Yb, B.Zf, B.Yf, 'Pomarańcze', (at) => grid(at, 4, 5, 0.04, (x, y, r) => orange(x, y, r), { top: 3 }));

    // ---- poziom C (przedni, 1,6–1,97 m) ----
    function lubianka(at, n) {
      // łubianki: kobiałki z wiórów pełne truskawek
      for (let k = 0; k < n; k++) {
        const u0 = 0.06 + k * 0.88 / n, u1 = u0 + 0.88 / n - 0.03;
        const corners = [at(u0, 0.08, 0.0), at(u1, 0.08, 0.0), at(u1, 0.92, 0.0), at(u0, 0.92, 0.0)];
        const wallTop = [at(u0, 0.08, 0.07), at(u1, 0.08, 0.07)];
        c.fillStyle = '#e9d3a6';
        poly([[corners[0][0], corners[0][1]], [corners[1][0], corners[1][1]], [wallTop[1][0], wallTop[1][1]], [wallTop[0][0], wallTop[0][1]]]); c.fill();
        c.fillStyle = '#b8955e';
        poly(corners.map(p => [p[0], p[1]])); c.fill();
        for (let rI = 0; rI < 10; rI++) {
          for (let cI = 0; cI < 6; cI++) {
            const u = u0 + (u1 - u0) * (cI + 0.5 + (rI % 2) * 0.5 - 0.25 + rr(-0.15, 0.15)) / 6;
            const w = 0.1 + (rI + 0.5) / 10 * 0.84;
            const [x, y, m] = at(u, w, 0.04 + 0.025 * Math.sin(Math.PI * (cI + 0.5) / 6));
            strawberry(x, y, 0.021 * m * rr(0.85, 1.15));
          }
        }
        // ścianki boczne łubianki (paski wiórów)
        for (const u of [u0, u1]) {
          const a = at(u, 0.08, 0.07), b = at(u, 0.92, 0.07);
          c.strokeStyle = '#f2dfb6'; c.lineWidth = 0.008 * a[2];
          c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        }
      }
    }
    sl = slot(C, 0);
    crate(sl[0], sl[1], C.Zb, C.Yb, C.Zf, C.Yf, 'Truskawki', (at) => lubianka(at, 1));
    sl = slot(C, 1);
    crate(sl[0], sl[1], C.Zb, C.Yb, C.Zf, C.Yf, 'Borówki', (at) => {
      for (let k = 0; k < 2; k++) {
        for (let q = 0; q < 2; q++) {
          const u0 = 0.07 + k * 0.44, u1 = u0 + 0.4, w0 = 0.08 + q * 0.45, w1 = w0 + 0.4;
          const a = at(u0, w0, 0.0), b = at(u1, w0, 0.0), cc = at(u1, w1, 0.0), d = at(u0, w1, 0.0);
          c.fillStyle = '#2a6aa8';
          poly([[a[0], a[1]], [b[0], b[1]], [cc[0], cc[1]], [d[0], d[1]]]); c.fill();
          for (let i = 0; i < 70; i++) {
            const u = u0 + rr(0.04, 0.96) * (u1 - u0), w = w0 + (i / 70) * (w1 - w0);
            const [x, y, m] = at(u, w, 0.02 + rr(0, 0.015));
            blueberry(x, y, 0.0068 * m * rr(0.85, 1.15));
          }
          c.strokeStyle = 'rgba(200,230,255,0.8)'; c.lineWidth = Math.max(1, 0.004 * a[2]);
          poly([[a[0], a[1]], [b[0], b[1]], [cc[0], cc[1]], [d[0], d[1]]]); c.stroke();
        }
      }
    });
    sl = slot(C, 2);
    crate(sl[0], sl[1], C.Zb, C.Yb, C.Zf, C.Yf, 'Papryki', (at) => {
      const cols3 = ['red', 'yellow', 'green'];
      for (let rI = 0; rI < 4; rI++) {
        for (let cI = 0; cI < 3; cI++) {
          const [x, y, m] = at((cI + 0.5) / 3 + rr(-0.04, 0.04), (rI + 0.5) / 4 * 0.95, 0.05);
          pepper(x, y, 0.045 * m * rr(0.9, 1.08), cols3[cI]);
        }
      }
    });
    sl = slot(C, 3);
    crate(sl[0], sl[1], C.Zb, C.Yb, C.Zf, C.Yf, 'Ogórki', (at) => {
      for (let rI = 0; rI < 9; rI++) {
        for (let cI = 0; cI < 2; cI++) {
          const [x, y, m] = at(0.28 + cI * 0.44 + rr(-0.03, 0.03), (rI + 0.5) / 9 * 0.95, 0.03);
          cucumber(x, y, 0.12 * m * rr(0.9, 1.1), rr(-0.15, 0.15));
        }
      }
    });
    sl = slot(C, 4);
    crate(sl[0], sl[1], C.Zb, C.Yb, C.Zf, C.Yf, 'Koperek', (at) => {
      for (let i = 0; i < 6; i++) { const [x, y, m] = at(0.2 + (i % 3) * 0.3, 0.2 + Math.floor(i / 3) * 0.4, 0.04); dill(x, y, m); }
    });
    // tabliczki poziomu C (wbite z tyłu skrzynek)
    tag(slot(C, 0)[0] + 0.2, C.Zb - 0.03, C.Yb + 0.02, 0.16, 0.1, [['Truskawki', 0.019, '#ff6b5e', true], ['12 zł', 0.032, '#f4f1e8', true], ['łubianka 2 kg', 0.013, '#cfe8ff']]);
    tag(slot(C, 2)[0] + 0.13, C.Zb - 0.03, C.Yb + 0.02, 0.16, 0.1, [['Papryka', 0.019, '#fff27a', true], ['14,99 zł', 0.032, '#f4f1e8', true], ['czerwona • żółta • zielona', 0.0105, '#cfe8ff']]);
    tag(slot(C, 3)[0] + 0.15, C.Zb - 0.03, C.Yb + 0.02, 0.16, 0.1, [['Ogórki gruntowe', 0.016, '#7de36a', true], ['6,50 zł', 0.032, '#f4f1e8', true], ['za kg', 0.013, '#cfe8ff']]);

    // delikatny cień markizy na prawej części straganu
    P.decor(() => {
      c.fillStyle = 'rgba(40,20,30,0.10)';
      c.fillRect(X2x(0.7, 2.8), 0, W, H);
    });

    /* ======================= DŁOŃ Z LISTĄ ZAKUPÓW (0,4 m) ======================= */
    (function shoppingList() {
      const Z = 0.4, m = mpx(Z);
      const ang = -0.075;
      const ox = 58 * s, oy = 432 * s, pw = 0.098 * m, ph = 0.15 * m;
      const skin = [[0, '#f6cfb0'], [0.6, '#e2a882'], [1, '#b8775a']];
      // kartka
      mat(Z, { name: 'Lista zakupów' });
      c.save(); c.translate(ox, oy); c.rotate(ang);
      P.decor(() => {
        c.fillStyle = 'rgba(30,20,10,0.25)';
        c.beginPath(); c.rect(0.006 * m, 0.008 * m, pw, ph); c.fill();
      });
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(pw, 0); c.lineTo(pw + 0.002 * m, ph); c.lineTo(0, ph); c.closePath();
      c.fillStyle = lin(0, 0, pw, ph, [[0, '#fffdf6'], [0.5, '#f8f3e6'], [1, '#ede5d2']]);
      c.fill();
      // linie i margines
      const lh = 0.0089 * m, top0 = 0.021 * m;
      c.strokeStyle = 'rgba(90,140,210,0.45)'; c.lineWidth = Math.max(1, 0.0004 * m);
      c.beginPath();
      for (let yy = top0; yy < ph; yy += lh) { c.moveTo(0, yy); c.lineTo(pw, yy); }
      c.stroke();
      c.strokeStyle = 'rgba(220,60,60,0.65)'; c.lineWidth = Math.max(1, 0.0005 * m);
      c.beginPath(); c.moveTo(0.012 * m, 0); c.lineTo(0.012 * m, ph); c.stroke();
      // dziurki po spirali
      c.fillStyle = '#c9c0ac';
      for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(pw * (0.12 + i * 0.16), 0.004 * m, 0.0015 * m, 0, TAU); c.fill(); }
      // tekst
      const ink = '#1d3a9a';
      c.fillStyle = ink;
      c.font = `bold ${(0.0068 * m).toFixed(1)}px ${HAND}`;
      txt('Zakupy na sobotę:', 0.016 * m, top0 - 0.0022 * m);
      c.strokeStyle = ink; c.lineWidth = Math.max(1, 0.0005 * m);
      c.beginPath(); c.moveTo(0.016 * m, top0 + 0.0003 * m); c.quadraticCurveTo(0.05 * m, top0 - 0.0006 * m, 0.077 * m, top0 + 0.0004 * m); c.stroke();
      const items = [
        ['jabłka czerwone 1 kg', 0, 1],
        ['pomidory malinowe', 0, 0],
        ['ogórki (6 szt.)', 0, 0],
        ['papryka żółta i zielona', 0, 0],
        ['truskawki – 2 łubianki', 0, 1],
        ['borówki', 0, 0],
        ['rzodkiewka, koperek', 0, 0],
        ['kwiaty dla mamy!', 1, 0]
      ];
      for (let i = 0; i < items.length; i++) {
        const [t, red, done] = items[i];
        const yy = top0 + (i + 1) * lh - 0.0018 * m;
        c.fillStyle = red ? '#c0262c' : ink;
        c.font = `${(0.0054 * m).toFixed(1)}px ${HAND}`;
        txt(t, 0.016 * m, yy);
        if (i === 1) {
          const tw0 = c.measureText(t).width;
          c.fillStyle = '#5a6a8a';
          c.font = `italic ${(0.0034 * m).toFixed(1)}px ${HAND}`;
          txt('(twarde!)', 0.019 * m + tw0, yy);
        }
        if (done) {
          // zielony „ptaszek” (odhaczone)
          c.strokeStyle = '#1f9a3a'; c.lineWidth = Math.max(1.2, 0.0008 * m); c.lineCap = 'round';
          const tw = c.measureText(t).width;
          c.beginPath(); c.moveTo(0.019 * m + tw, yy - 0.002 * m); c.lineTo(0.0215 * m + tw, yy + 0.0003 * m); c.lineTo(0.0265 * m + tw, yy - 0.0055 * m); c.stroke();
          c.lineCap = 'butt';
        }
      }
      // serduszko przy kwiatach
      const hy = top0 + 8 * lh - 0.0042 * m, hx = 0.077 * m, hr = 0.0016 * m;
      c.fillStyle = '#e0303a';
      c.beginPath(); c.moveTo(hx, hy + hr * 1.6);
      c.bezierCurveTo(hx - hr * 2.2, hy, hx - hr * 1.2, hy - hr * 1.6, hx, hy - hr * 0.5);
      c.bezierCurveTo(hx + hr * 1.2, hy - hr * 1.6, hx + hr * 2.2, hy, hx, hy + hr * 1.6); c.fill();
      c.restore();
      // światło na kartce
      P.decor(() => {
        c.save(); c.translate(ox, oy); c.rotate(ang);
        c.fillStyle = lin(0, 0, pw, ph, [[0, 'rgba(255,240,200,0.18)'], [1, 'rgba(60,40,20,0.12)']]);
        c.fillRect(0, 0, pw + 0.002 * m, ph);
        c.restore();
      });
      // dłoń trzymająca kartkę za lewy dolny róg: śródręcze z lewego dolnego rogu kadru, kciuk na kartce
      mat(Z - 0.01, { name: 'Dłoń' });
      c.fillStyle = lin(0, 780 * s, 120 * s, H, skin);
      c.beginPath();
      c.moveTo(0, 800 * s);
      c.quadraticCurveTo(40 * s, 805 * s, 66 * s, 838 * s);
      c.quadraticCurveTo(92 * s, 870 * s, 104 * s, H);
      c.lineTo(0, H); c.closePath(); c.fill();
      P.decor(() => {
        c.strokeStyle = 'rgba(150,90,70,0.35)'; c.lineWidth = 2 * s;
        c.beginPath(); c.moveTo(14 * s, 826 * s); c.quadraticCurveTo(36 * s, 842 * s, 44 * s, 880 * s); c.stroke();
      });
      // kciuk (od nasady w rogu ku górze-prawo)
      c.save(); c.translate(60 * s, 902 * s); c.rotate(-1.28);
      const tl = 0.03 * m, tw = 0.0185 * m;
      c.fillStyle = lin(0, -tw / 2, 0, tw / 2, [[0, '#f8d6bc'], [0.55, '#e6ad88'], [1, '#b97858']]);
      rrect(-tl * 0.35, -tw / 2, tl * 1.35, tw, tw / 2); c.fill();
      P.decor(() => {
        c.fillStyle = lin(0, -tw * 0.35, 0, tw * 0.35, [[0, '#fde9de'], [1, '#e8bba6']]);
        rrect(tl * 0.52, -tw * 0.33, tl * 0.42, tw * 0.62, tw * 0.28); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.6)'; rrect(tl * 0.6, -tw * 0.26, tl * 0.25, tw * 0.13, tw * 0.06); c.fill();
        c.strokeStyle = 'rgba(150,90,70,0.45)'; c.lineWidth = Math.max(1, 0.0006 * m);
        c.beginPath(); c.moveTo(tl * 0.28, -tw * 0.38); c.quadraticCurveTo(tl * 0.33, 0, tl * 0.28, tw * 0.38); c.stroke();
        c.fillStyle = 'rgba(40,20,10,0.18)'; rrect(-tl * 0.35, tw * 0.3, tl * 1.3, tw * 0.2, tw * 0.1); c.fill();
      });
      c.restore();
      // rękaw swetra (najbliżej, w samym rogu)
      mat(Z - 0.07, { name: 'Rękaw swetra' });
      c.beginPath(); c.moveTo(0, H - 62 * s); c.quadraticCurveTo(40 * s, H - 70 * s, 72 * s, H - 30 * s); c.lineTo(88 * s, H); c.lineTo(0, H); c.closePath();
      c.fillStyle = lin(0, H - 70 * s, 80 * s, H, [[0, '#e3ad45'], [0.5, '#c88a28'], [1, '#8a5a16']]);
      c.fill();
      P.decor(() => {
        c.save(); c.clip();
        c.strokeStyle = 'rgba(110,70,15,0.45)'; c.lineWidth = 4 * s;
        c.beginPath();
        for (let i = -1; i < 9; i++) { const ex = i * 11 * s, ey = H - 64 * s + i * 4 * s; c.moveTo(ex, ey); c.lineTo(ex + 22 * s, ey + 50 * s); }
        c.stroke();
        c.restore();
      });
    })();

    /* ======================= ŚWIATŁO PORANKA ======================= */
    P.decor(() => {
      c.save();
      c.globalCompositeOperation = 'soft-light';
      c.fillStyle = lin(0, 0, W, H, [[0, 'rgba(255,220,150,0.35)'], [0.6, 'rgba(255,255,255,0)'], [1, 'rgba(40,30,60,0.25)']]);
      c.fillRect(0, 0, W, H);
      c.restore();
      c.fillStyle = rad(W / 2, H / 2, H * 0.55, W / 2, H / 2, W * 0.75, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(20,10,0,0.22)']]);
      c.fillRect(0, 0, W, H);
    });
  }
})();
