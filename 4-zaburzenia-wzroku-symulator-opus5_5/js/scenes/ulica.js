/* ulica.js – scena startowa „Oczami innych”: ulica Kwiatowa w polskim mieście, w dzień i nocą.
   Widok z oczu pieszego (1,6 m) stojącego na chodniku, perspektywa jednopunktowa wzdłuż ulicy.
   Świat w metrach: X w prawo, Y w górę, Z w głąb. Rysujemy w układzie 1600×900 (skala s = W/1600).
   Oba warianty (dzień/noc) korzystają z tego samego kodu – różnią się flagą NIGHT. */
(function () {
  'use strict';

  /* ---------- PRNG (deterministyczny) ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- kamera ---------- */
  const VW = 1600, VH = 900, CX = 800, HZ = 410, EYE = 1.6, FOV = 55;
  const F = CX / Math.tan(FOV * Math.PI / 360);           // ogniskowa ≈ 1536,8 px
  const PX = (X, Z) => CX + F * X / Z;
  const PY = (Y, Z) => HZ + F * (EYE - Y) / Z;
  const K = Z => F / Z;                                     // pikseli na metr w odległości Z
  const G = (X, Y, Z) => [PX(X, Z), PY(Y, Z)];
  const Z_BOTTOM = F * EYE / (VH - HZ);                    // ≈ 5 m – chodnik przy dolnej krawędzi

  /* ---------- układ ulicy (metry) ---------- */
  const XL = -2.8;     // lewe fasady (nasza strona)
  const XC = 2.0;      // nasz krawężnik
  const XR = 11.2;     // krawężnik po drugiej stronie (za pasem parkingowym 9,0–11,2)
  const XRF = 14.5;    // prawe fasady
  const ZEND = 95;     // koniec ulicy – dalej Plac Kwiatowy
  const SUN = { dx: -0.55, dz: 0.35 };   // przesunięcie cienia na metr wysokości (słońce z prawej, zza pleców)

  /* ---------- stan bieżącego rysowania ---------- */
  let P = null, c = null, NIGHT = false;

  /* ---------- kolory ---------- */
  function hx(h) { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  const HAZE_D = [206, 222, 236], HAZE_N = [26, 34, 66];
  const cl = v => Math.max(0, Math.min(255, v)) | 0;
  /* Kolor dzienny → (noc: przyciemniony, zimny) + mgiełka powietrzna dla dalekich rzeczy. */
  function col(h, k, Z, a) {
    let [r, g, b] = hx(h);
    if (k == null) k = 1;
    if (NIGHT) { r = r * 0.15 * k + 7; g = g * 0.17 * k + 10; b = b * 0.22 * k + 25; }
    else { r *= k; g *= k; b *= k; }
    if (Z && Z > 25) {
      const t = (1 - Math.exp(-(Z - 25) / (NIGHT ? 700 : 330))) * (NIGHT ? 0.55 : 0.8);
      const q = NIGHT ? HAZE_N : HAZE_D;
      r += (q[0] - r) * t; g += (q[1] - g) * t; b += (q[2] - b) * t;
    }
    return a == null ? `rgb(${cl(r)},${cl(g)},${cl(b)})` : `rgba(${cl(r)},${cl(g)},${cl(b)},${a})`;
  }
  const DN = (d, n) => NIGHT ? n : d;

  /* ---------- materiały ---------- */
  const M = (dist, name, em) => P.mat(dist, { name, em: em || 0 });
  /* ziemia (Y=0): 1/Z liniowe w y */
  function MG(name, em) { P.matGrad(0, HZ, 1e9, 0, VH, Z_BOTTOM, { name, em: em || 0 }); }
  /* ściana X=const: 1/Z liniowe w x */
  function MW(X, name, em) { const xe = X < 0 ? 0 : VW; P.matGrad(CX, 0, 1e9, xe, 0, F * X / (xe - CX), { name, em: em || 0 }); }
  /* płaszczyzna pozioma Y=const (spód daszku, sufit wiaty) */
  function MH(Y, name, em) { const ye = Y < EYE ? VH : 0; P.matGrad(0, HZ, 1e9, 0, ye, F * (EYE - Y) / (ye - HZ), { name, em: em || 0 }); }

  /* ---------- ścieżki ---------- */
  function path(pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
  function fillP(pts, style) { path(pts); c.fillStyle = style; c.fill(); }
  const wallQ = (X, z0, z1, y0, y1) => [G(X, y0, z0), G(X, y0, z1), G(X, y1, z1), G(X, y1, z0)];
  const flatQ = (x0, x1, z0, z1, Y) => [G(x0, Y, z0), G(x1, Y, z0), G(x1, Y, z1), G(x0, Y, z1)];
  const frontQ = (x0, x1, y0, y1, Z) => [G(x0, y0, Z), G(x1, y0, Z), G(x1, y1, Z), G(x0, y1, Z)];
  function rrect(x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function ell(x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, 7); }
  /* lokalny układ obiektu stojącego w (X,Y,Z): jednostka 1 m, „w górę” = ujemne y */
  function local(X, Y, Z, fn) { c.save(); c.translate(PX(X, Z), PY(Y, Z)); const k = K(Z); c.scale(k, k); fn(k); c.restore(); }
  /* napis w układzie lokalnym (rozmiar w metrach, rysowany w pikselach dla ostrości) */
  function ltext(str, x, y, sizeM, k, font, color, align) {
    c.save(); c.translate(x, y); c.scale(1 / k, 1 / k);
    c.font = font.replace('#', (sizeM * k).toFixed(2) + 'px'); c.fillStyle = color;
    c.textAlign = align || 'left'; c.textBaseline = 'alphabetic'; c.fillText(str, 0, 0); c.restore();
  }
  /* napis płasko na ścianie X=const – każda litera z własnym przekształceniem (prawdziwa perspektywa) */
  function wallText(str, X, zMid, yBase, hM, color, opt) {
    opt = opt || {};
    const fs = 100, chars = [...str];
    c.font = (opt.weight || 'bold') + ' ' + fs + 'px ' + (opt.family || 'Arial');
    const ws = chars.map(ch => c.measureText(ch).width);
    const tot = ws.reduce((a, b) => a + b, 0), cap = fs * 0.72;
    let L = hM * tot / cap * (opt.stretch || 1);
    if (opt.maxL && L > opt.maxL) L = opt.maxL;
    // lewa ściana: tekst biegnie w głąb, prawa: z głębi do nas – w obu przypadkach od lewej do prawej na ekranie
    const dir = X < 0 ? 1 : -1, zA = zMid - dir * L / 2;
    c.fillStyle = color; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    let acc = 0;
    chars.forEach((ch, i) => {
      const za = zA + dir * L * acc / tot, zb = zA + dir * L * (acc + ws[i]) / tot;
      acc += ws[i];
      if (ch === ' ') return;
      const p0 = G(X, yBase, za), p1 = G(X, yBase, zb), sy = hM * K((za + zb) / 2) / cap;
      c.save(); c.transform((p1[0] - p0[0]) / ws[i], (p1[1] - p0[1]) / ws[i], 0, sy, p0[0], p0[1]);
      c.fillText(ch, 0, 0); c.restore();
    });
  }
  /* poświata (tylko kolor, addytywnie) */
  function glow(x, y, r, rgb, a, core) {
    if (r < 1) return;
    P.decor(() => {
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(core || 0.18, `rgba(${rgb},${a * 0.42})`);
      g.addColorStop(0.55, `rgba(${rgb},${a * 0.1})`); g.addColorStop(1, `rgba(${rgb},0)`);
      c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); c.restore();
    });
  }
  /* cień rzucony przez prostopadłościan (otoczka wypukła podstawy i rzutu wierzchu) */
  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function shadowBox(x0, x1, z0, z1, h, a, y0) {
    const pts = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    const top = pts.map(p => [p[0] + SUN.dx * h, p[1] + SUN.dz * h]);
    const hp = hull(pts.concat(top)).map(p => G(p[0], y0 || 0, Math.max(0.5, p[1])));
    P.decor(() => { fillP(hp, `rgba(22,30,62,${a == null ? 0.3 : a})`); });
  }
  function shadowPole(X, Z, h, w) {
    const tip = [X + SUN.dx * h, Z + SUN.dz * h];
    P.decor(() => fillP([G(X - w / 2, 0, Z), G(X + w / 2, 0, Z), G(tip[0] + w / 2, 0, tip[1]), G(tip[0] - w / 2, 0, tip[1])], 'rgba(22,30,62,0.28)'));
  }

  /* =====================================================================
     NIEBO, WZGÓRZA, PLAC Z RATUSZEM
     ===================================================================== */
  function cloud(cx, cy, w, h, r) {
    const puffs = [];
    for (let i = 0; i < 16; i++) {
      const t = r() - 0.5;
      puffs.push([cx + t * w, cy - h * 0.35 * (1 - Math.abs(t) * 1.6) * r() , h * (0.32 + 0.35 * r() * (1 - Math.abs(t)))]);
    }
    P.decor(() => {
      // spód chmury (cień), potem jasna góra
      for (const p of puffs) {
        c.fillStyle = NIGHT ? 'rgba(34,42,78,0.55)' : 'rgba(176,192,214,0.75)';
        ell(p[0], p[1] + p[2] * 0.18, p[2] * 1.15, p[2] * 0.8); c.fill();
      }
      for (const p of puffs) {
        const g = c.createRadialGradient(p[0] + p[2] * 0.25, p[1] - p[2] * 0.35, p[2] * 0.1, p[0], p[1], p[2] * 1.05);
        if (NIGHT) { g.addColorStop(0, 'rgba(92,102,140,0.55)'); g.addColorStop(1, 'rgba(40,48,86,0)'); }
        else { g.addColorStop(0, 'rgba(255,253,246,0.98)'); g.addColorStop(0.7, 'rgba(240,242,248,0.85)'); g.addColorStop(1, 'rgba(225,232,244,0)'); }
        c.fillStyle = g; ell(p[0], p[1], p[2] * 1.1, p[2] * 0.82); c.fill();
      }
      // płaski spód
      c.fillStyle = NIGHT ? 'rgba(20,26,54,0.35)' : 'rgba(190,204,224,0.35)';
      ell(cx, cy + h * 0.22, w * 0.55, h * 0.12); c.fill();
    });
  }

  function drawSky(r) {
    M(Infinity, 'Niebo');
    const g = c.createLinearGradient(0, 0, 0, HZ);
    if (NIGHT) { g.addColorStop(0, '#02040d'); g.addColorStop(0.45, '#071232'); g.addColorStop(0.8, '#15234d'); g.addColorStop(1, '#3a3558'); }
    else { g.addColorStop(0, '#3a7dd0'); g.addColorStop(0.42, '#69a8e6'); g.addColorStop(0.8, '#b9d7ef'); g.addColorStop(1, '#f2e4c6'); }
    c.fillStyle = g; c.fillRect(0, 0, VW, HZ + 4);
    if (NIGHT) {
      for (let i = 0; i < 170; i++) {
        const x = 600 + r() * 760, y = r() * 330 * Math.sqrt(r()), rad = 0.55 + r() * r() * 1.5, e = 0.3 + r() * 0.2;
        M(Infinity, 'Gwiazdy', e);
        c.fillStyle = `rgb(255,${cl(232 + r() * 23)},${cl(205 + r() * 50)})`;
        c.beginPath(); c.arc(x, y, rad, 0, 7); c.fill();
      }
      // Księżyc
      const mx = 1088, my = 86, mr = 19;
      glow(mx, my, 150, '150,170,235', 0.16, 0.1);
      glow(mx, my, 45, '220,225,255', 0.35, 0.4);
      M(Infinity, 'Księżyc', 0.6);
      const mg = c.createRadialGradient(mx - 6, my - 7, 2, mx, my, mr);
      mg.addColorStop(0, '#fffef4'); mg.addColorStop(1, '#ddd6bb');
      c.fillStyle = mg; c.beginPath(); c.arc(mx, my, mr, 0, 7); c.fill();
      P.decor(() => {
        c.fillStyle = 'rgba(150,146,124,0.32)';
        [[-6, -4, 5], [5, 3, 4], [-2, 8, 3], [7, -8, 2.5], [-9, 5, 2]].forEach(q => { ell(mx + q[0], my + q[1], q[2], q[2] * 0.85); c.fill(); });
      });
      cloud(820, 150, 220, 40, r); cloud(1170, 200, 180, 30, r);
    } else {
      cloud(850, 82, 300, 80, r); cloud(1150, 160, 210, 55, r); cloud(760, 230, 150, 34, r); cloud(1010, 268, 230, 32, r);
      P.decor(() => {    // smugi cirrusów
        c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 3;
        for (let i = 0; i < 6; i++) { const y = 30 + i * 9, x = 960 + i * 25; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 90, y - 12, x + 200, y - 4); c.stroke(); }
      });
    }
  }

  function drawHills() {
    const ridge = (dist, base, amp, f1, f2, ph, colr, name) => {
      M(dist, name);
      c.fillStyle = colr; c.beginPath(); c.moveTo(560, HZ + 3);
      for (let x = 560; x <= 1280; x += 8) c.lineTo(x, HZ - base - amp * Math.sin(x * f1 + ph) - amp * 0.5 * Math.sin(x * f2 + ph * 2) - 3 * Math.sin(x * 0.21));
      c.lineTo(1280, HZ + 3); c.closePath(); c.fill();
    };
    ridge(4200, 64, 16, 0.011, 0.033, 1.3, DN('#a3b8ca', '#121a36'), 'Wzgórza za miastem');
    ridge(2300, 50, 8, 0.017, 0.045, 0.2, DN('#8aa49c', '#0f1730'), 'Wzgórza za miastem');
    if (!NIGHT) P.decor(() => {   // lasy na zboczu
      c.fillStyle = 'rgba(70,104,88,0.35)';
      for (let x = 740; x < 1020; x += 7) { ell(x, HZ - 47 - 6 * Math.sin(x * 0.05), 5, 3); c.fill(); }
    });
  }

  /* Domy po drugiej stronie placu, drzewa na placu, ratusz z wieżą zegarową */
  function drawFarTown(r) {
    const ZH = 265;
    M(ZH, 'Domy po drugiej stronie placu');
    const pal = ['#e8d3b0', '#d9a98f', '#c7cfb5', '#efe2c4', '#b9c7d6', '#e3bd8f'];
    for (let X = -46; X < 46;) {
      const w = 6 + r() * 5, h = 8 + r() * 5, cc = pal[(r() * pal.length) | 0];
      fillP(frontQ(X, X + w, 0, h, ZH), col(cc, 0.95, ZH));
      // dach (widoczny jako trójkąt/trapez nad gzymsem)
      fillP([G(X - 0.3, h, ZH), G(X + w + 0.3, h, ZH), G(X + w - 1.2, h + 3.2, ZH + 4), G(X + 1.2, h + 3.2, ZH + 4)], col('#a5503a', 0.9, ZH));
      for (let fl = 0; fl < 3; fl++) for (let wx = X + 1; wx < X + w - 1; wx += 1.6) {
        const lit = NIGHT && r() < 0.45;
        if (lit) M(ZH, 'Domy po drugiej stronie placu', 0.1);
        c.fillStyle = lit ? '#ffcf7e' : col('#4d5a66', 1, ZH);
        const q = frontQ(wx, wx + 0.8, 1.2 + fl * 3, 2.6 + fl * 3, ZH); path(q); c.fill();
        if (lit) M(ZH, 'Domy po drugiej stronie placu');
      }
      X += w;
    }
    // drzewa na placu
    M(180, 'Drzewa na placu');
    for (const X of [-15, -8, 13, 19]) {
      local(X, 0, 180, () => {
        c.fillStyle = col('#4b3a2b', 1, 180); c.fillRect(-0.2, -3, 0.4, 3);
        c.fillStyle = col(DN('#4c7f3a', '#3c5a40'), 1, 180);
        ell(0, -5.2, 2.8, 2.6); c.fill(); ell(-1.4, -4.4, 1.8, 1.6); c.fill(); ell(1.5, -4.6, 1.8, 1.6); c.fill();
      });
    }
    // ratusz
    const ZR = 210, TX0 = -0.6, TX1 = 6.6;
    M(ZR, 'Ratusz');
    fillP(frontQ(-16, 21, 0, 14, ZR), col('#e9d8b6', 1, ZR));
    fillP([G(-16.5, 14, ZR), G(21.5, 14, ZR), G(19, 19, ZR + 6), G(-14, 19, ZR + 6)], col('#b4553c', 0.95, ZR));
    for (let X = -15; X < 20.5; X += 2.4) {
      // arkady parteru i okna piętra
      fillP(frontQ(X + 0.4, X + 1.8, 0, 3.4, ZR), col('#5f5144', 1, ZR));
      const lit = NIGHT && (X * 7 | 0) % 3 !== 0;
      if (lit) M(ZR, 'Ratusz', 0.08);
      fillP(frontQ(X + 0.6, X + 1.6, 6.5, 9.5, ZR), lit ? '#ffd08a' : col('#56687a', 1, ZR));
      fillP(frontQ(X + 0.6, X + 1.6, 10.4, 12.4, ZR), lit ? '#ffcc80' : col('#56687a', 1, ZR));
      if (lit) M(ZR, 'Ratusz');
    }
    // wieża
    M(ZR - 4, 'Wieża ratusza');
    fillP(frontQ(TX0, TX1, 0, 34, ZR - 4), col('#e4cfa6', 1, ZR));
    fillP(frontQ(TX0 - 0.4, TX1 + 0.4, 33.4, 35, ZR - 4), col('#f3e6cc', 1, ZR));
    fillP(frontQ(TX0 - 0.4, TX1 + 0.4, 21.8, 22.6, ZR - 4), col('#f3e6cc', 1, ZR));
    for (const Y of [15.5, 18.5]) fillP(frontQ(1.9, 4.1, Y, Y + 2, ZR - 4), col('#4a5866', 1, ZR));
    fillP(frontQ(1.4, 4.6, 30.3, 32.6, ZR - 4), col('#3a4552', 1, ZR));   // okno dzwonnicy
    // hełm barokowy: bania, latarnia, iglica
    local((TX0 + TX1) / 2, 35, ZR - 4, () => {
      c.fillStyle = col(DN('#4f9c86', '#4d7f74'), 1, ZR);
      c.beginPath(); c.moveTo(-3.6, 0); c.bezierCurveTo(-4.6, -2.6, -2.4, -4.3, -0.9, -5.4); c.lineTo(0.9, -5.4);
      c.bezierCurveTo(2.4, -4.3, 4.6, -2.6, 3.6, 0); c.closePath(); c.fill();
      c.fillStyle = col('#e4cfa6', 1, ZR); c.fillRect(-1.1, -8.3, 2.2, 3);
      c.fillStyle = col('#2f3a44', 1, ZR); c.fillRect(-0.5, -7.9, 1, 2.2);
      c.fillStyle = col(DN('#4f9c86', '#4d7f74'), 1, ZR);
      c.beginPath(); c.moveTo(-1.5, -8.3); c.quadraticCurveTo(0, -11, 1.5, -8.3); c.closePath(); c.fill();
      c.beginPath(); c.moveTo(-0.25, -10.2); c.lineTo(0, -17); c.lineTo(0.25, -10.2); c.closePath(); c.fill();
      c.fillStyle = col('#d8b04a', 1, ZR); ell(0, -13.2, 0.45, 0.45); c.fill();
      c.fillRect(-0.06, -18.2, 0.12, 1.3); c.fillRect(-0.06, -18.0, 1.4, 0.5);   // chorągiewka
    });
    // tarcza zegara (16:40 w dzień, 21:15 nocą)
    const cx = PX((TX0 + TX1) / 2, ZR - 4), cy = PY(27.6, ZR - 4), cr = 2.15 * K(ZR - 4);
    M(ZR - 4, 'Zegar na wieży ratusza', NIGHT ? 0.25 : 0);
    c.fillStyle = col('#c9a24a', 1, ZR); c.beginPath(); c.arc(cx, cy, cr * 1.12, 0, 7); c.fill();
    c.fillStyle = NIGHT ? '#f3ecd2' : col('#fbf7ea', 1, 80); c.beginPath(); c.arc(cx, cy, cr, 0, 7); c.fill();
    c.fillStyle = '#1b1b1b';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.arc(cx + Math.cos(a) * cr * 0.82, cy + Math.sin(a) * cr * 0.82, i % 3 ? 0.35 : 0.6, 0, 7); c.fill(); }
    const hh = NIGHT ? 21.25 : 16.667, mm = NIGHT ? 15 : 40;
    const hand = (ang, len, wdt) => { c.strokeStyle = '#141414'; c.lineWidth = wdt; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.sin(ang) * len, cy - Math.cos(ang) * len); c.stroke(); };
    hand((hh % 12) / 12 * 2 * Math.PI, cr * 0.5, 1.6);
    hand(mm / 60 * 2 * Math.PI, cr * 0.8, 1.1);
    c.lineCap = 'butt';
    if (NIGHT) {
      glow(cx, cy, 30, '255,230,170', 0.25);
      // iluminacja wieży
      P.decor(() => {
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createLinearGradient(0, PY(0, ZR), 0, PY(36, ZR));
        g.addColorStop(0, 'rgba(255,190,110,0.28)'); g.addColorStop(1, 'rgba(255,190,110,0.04)');
        fillP(frontQ(TX0, TX1, 0, 35, ZR - 4), g); c.restore();
      });
    }
    // fontanna i ludzie na placu
    M(140, 'Fontanna na placu');
    local(7, 0, 140, () => {
      c.fillStyle = col('#9c968c', 1, 140); c.fillRect(-3, -0.6, 6, 0.6);
      c.fillStyle = col('#a8a297', 1, 140); c.fillRect(-0.3, -2.2, 0.6, 1.6); ell(0, -2.2, 1.2, 0.25); c.fill();
    });
    P.decor(() => local(7, 0, 140, () => {
      c.strokeStyle = NIGHT ? 'rgba(160,190,230,0.45)' : 'rgba(235,248,255,0.85)'; c.lineWidth = 0.12;
      for (const d of [-1, 1]) { c.beginPath(); c.moveTo(0, -2.6); c.quadraticCurveTo(d * 1.4, -3.6, d * 2.3, -0.6); c.stroke(); }
      c.beginPath(); c.moveTo(0, -2.3); c.lineTo(0, -3.8); c.stroke();
    }));
  }

  /* =====================================================================
     ZIEMIA: plac, chodniki, jezdnia, pasy
     ===================================================================== */
  function groundGrad(near, mid, far) {
    const g = c.createLinearGradient(0, HZ, 0, VH);
    g.addColorStop(0, far); g.addColorStop(0.12, mid); g.addColorStop(1, near);
    return g;
  }
  const TREES_R = [22, 31, 40, 49, 58, 67, 76, 85];

  function drawGround(r) {
    MG('Plac Kwiatowy');
    c.fillStyle = groundGrad(col('#b5a68e'), col('#bfb19a', 1, 80), col('#c9bea9', 1, 250));
    c.fillRect(-10, HZ, VW + 20, VH - HZ + 10);
    // nasz chodnik (płyty) – przerwany przecznicą
    MG('Chodnik');
    const sw = groundGrad(col('#b4aea4'), col('#bab4aa', 1, 60), col('#c2bcb2', 1, 95));
    fillP(flatQ(-9, XC, 2, 32, 0), sw); fillP(flatQ(-9, XC, 42, ZEND, 0), sw);
    MG('Chodnik po drugiej stronie');
    fillP(flatQ(XR, XRF + 8, 2, ZEND, 0), groundGrad(col('#a9a399', 0.9), col('#b1aba1', 0.9, 60), col('#bcb6ac', 1, 95)));
    // jezdnia
    MG('Jezdnia');
    const road = NIGHT ? groundGrad('#14161f', '#1b1e2b', '#232842') : groundGrad('#55565c', col('#6b6c72', 1, 60), col('#8d8f95', 1, 95));
    fillP(flatQ(XC, XR, 2, ZEND, 0), road);
    MG('Skrzyżowanie z ul. Różaną');
    fillP(flatQ(-60, XC, 32, 42, 0), road);
    // krawężniki
    MG('Krawężnik');
    fillP(flatQ(XC - 0.16, XC, 2, 32, 0), col('#d3cec4')); fillP(flatQ(XC - 0.16, XC, 42, ZEND, 0), col('#d3cec4'));
    MW(XR, 'Krawężnik'); fillP(wallQ(XR, 2, ZEND, 0, 0.14), col('#c9c4ba', 0.85));
    fillP(flatQ(XR, XR + 0.16, 2, ZEND, 0.14), col('#d6d1c6', 0.95));
    // linie: przerywana oś jezdni
    MG('Jezdnia');
    c.fillStyle = col('#ecebe4', 1);
    for (let z = 4; z < ZEND; z += 9) {
      if (z + 4 > 16.5 && z < 22.5) continue;
      path(flatQ(5.42, 5.58, z, z + 4, 0)); c.fill();
    }
    // linia warunkowego zatrzymania i pasy dla pieszych
    MG('Przejście dla pieszych');
    c.fillStyle = col('#f2f1ea', 1);
    for (let x = 2.3; x + 0.5 <= 11.05; x += 1.0) { path(flatQ(x, x + 0.5, 17.6, 21.4, 0)); c.fill(); }
    path(flatQ(5.5, 9.0, 16.4, 16.65, 0)); c.fill();                    // linia zatrzymania
    for (let z = 32.6; z < 41.6; z += 1.0) { path(flatQ(-2.6, 1.8, z, z + 0.5, 0)); c.fill(); }
    // dekor: faktura asfaltu, płyty chodnika, studzienki, łaty
    P.decor(() => {
      // płyty chodnikowe 0,5 m
      c.strokeStyle = NIGHT ? 'rgba(0,0,0,0.25)' : 'rgba(70,64,58,0.22)'; c.lineWidth = 1;
      c.beginPath();
      for (let x = -2.5; x < XC - 0.2; x += 0.5) {
        const a = G(x, 0, 2), b = G(x, 0, 32); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]);
        const a2 = G(x, 0, 42), b2 = G(x, 0, 70); c.moveTo(a2[0], a2[1]); c.lineTo(b2[0], b2[1]);
      }
      for (let z = 2; z < 32; z += 0.5) { const a = G(-6, 0, z), b = G(XC - 0.16, 0, z); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
      for (let z = 42; z < 60; z += 0.5) { const a = G(-6, 0, z), b = G(XC - 0.16, 0, z); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
      c.stroke();
      // kostka brukowa przy krawężniku
      c.fillStyle = NIGHT ? 'rgba(0,0,0,0.15)' : 'rgba(120,108,96,0.18)';
      path(flatQ(XC - 0.66, XC - 0.16, 2, 32, 0)); c.fill(); path(flatQ(XC - 0.66, XC - 0.16, 42, ZEND, 0)); c.fill();
      // faktura asfaltu
      for (let i = 0; i < 520; i++) {
        const z = 5 + Math.pow(r(), 1.8) * 60, X = XC + r() * (XR - XC), p = G(X, 0, z), rr = 0.05 + r() * 0.12;
        c.fillStyle = r() < 0.5 ? (NIGHT ? 'rgba(0,0,0,0.25)' : 'rgba(30,30,36,0.22)') : (NIGHT ? 'rgba(80,90,120,0.12)' : 'rgba(150,150,156,0.18)');
        ell(p[0], p[1], rr * K(z), rr * K(z) * EYE / z); c.fill();
      }
      // łata asfaltu, ślady opon
      c.fillStyle = NIGHT ? 'rgba(0,0,0,0.25)' : 'rgba(40,40,46,0.25)';
      path(flatQ(6.3, 8.1, 7.5, 12.5, 0)); c.fill();
      c.fillStyle = NIGHT ? 'rgba(0,0,0,0.2)' : 'rgba(35,35,40,0.16)';
      for (const x of [3.0, 4.6, 6.4, 8.0]) { path(flatQ(x, x + 0.45, 4, 80, 0)); c.fill(); }
      // studzienki i kratki
      for (const [X, z, rad] of [[4.2, 9.5, 0.35], [7.2, 27, 0.35], [-0.6, 14, 0.3]]) {
        const p = G(X, 0, z);
        c.fillStyle = NIGHT ? '#0b0d14' : '#3b3c40'; ell(p[0], p[1], rad * K(z), rad * K(z) * EYE / z); c.fill();
        c.strokeStyle = NIGHT ? 'rgba(90,100,130,0.4)' : 'rgba(120,120,126,0.8)'; c.lineWidth = 1.2; c.stroke();
      }
      for (const z of [8, 26, 47]) { c.fillStyle = NIGHT ? '#090b11' : '#2d2e33'; path(flatQ(XC + 0.05, XC + 0.45, z, z + 0.9, 0)); c.fill(); }
      // misy drzew po drugiej stronie
      for (const z of TREES_R) { c.fillStyle = col('#5b4632', 0.9); path(flatQ(12.0, 13.2, z - 0.6, z + 0.6, 0.14)); c.fill(); }
    });
  }

  /* =====================================================================
     KAMIENICE
     ===================================================================== */
  const LEFT = [
    { z0: 0.5, z1: 13.2, h: 15.6, c: '#ecd5a8', t: '#f8eedb', name: 'Kamienica z kwiaciarnią', balc: [1, 2], shops: [
      { z0: 1.0, z1: 8.6, txt: 'WARZYWA I OWOCE', bg: '#2f6e3c', fg: '#fff6d8', name: 'Warzywniak', ware: ['#d7372f', '#7fbf3f', '#f2d33b', '#e8862a'] },
      { z0: 9.3, z1: 12.95, txt: 'KWIACIARNIA', bg: '#a8436c', fg: '#ffffff', name: 'Kwiaciarnia', ware: ['#e0315a', '#f5c623', '#ffffff', '#c04ad0', '#3f9a3a'] }] },
    { z0: 13.2, z1: 22.5, h: 17.4, c: '#dd9d83', t: '#f4d6c6', name: 'Kamienica z apteką', balc: [1, 3], shops: [
      { z0: 14.0, z1: 21.8, txt: 'APTEKA', bg: '#ffffff', fg: '#168a3c', name: 'Apteka', ware: ['#ffffff', '#e8f4ec', '#2f9a52', '#d33'] }] },
    { z0: 22.5, z1: 32, h: 14.8, c: '#b9c79f', t: '#e5ebd3', name: 'Kamienica z piekarnią', balc: [2], shops: [
      { z0: 23.0, z1: 31.4, txt: 'PIEKARNIA', bg: '#7b4a25', fg: '#ffe7b0', name: 'Piekarnia', ware: ['#c98a3e', '#a8652a', '#e6b469'] }] },
    { z0: 42, z1: 57, h: 16.2, c: '#e2b866', t: '#f5e0ae', name: 'Kamienica z księgarnią', balc: [2], shops: [
      { z0: 42.6, z1: 50.5, txt: 'KSIĘGARNIA', bg: '#23395f', fg: '#f3e6c4', name: 'Księgarnia', ware: ['#c0392b', '#2e86c1', '#f1c40f', '#27ae60'] }] },
    { z0: 57, z1: 74, h: 15, c: '#a3b7ca', t: '#dde6ee', name: 'Kamienica (lewa strona)', balc: [1], shops: [
      { z0: 58, z1: 64, txt: 'LODY', bg: '#e86a9a', fg: '#ffffff', name: 'Lodziarnia', ware: ['#fff', '#f7b6c8'] }] },
    { z0: 74, z1: 95, h: 16.6, c: '#e8ab95', t: '#f7d9cd', name: 'Kamienica (lewa strona)', balc: [], shops: [
      { z0: 75, z1: 88, txt: 'BAR MLECZNY', bg: '#2d6d8a', fg: '#ffffff', name: 'Bar mleczny', ware: ['#fff'] }] },
  ];
  const RIGHT = [
    { z0: 0.5, z1: 38, h: 16.5, c: '#f0dc9e', t: '#fbf1d2', name: 'Kamienica z kawiarnią', balc: [2], shops: [
      { z0: 28.5, z1: 37.5, txt: 'KAWIARNIA', bg: '#3b2a20', fg: '#ffd9a0', name: 'Kawiarnia', neon: true, ware: ['#c98a3e', '#fff'] }] },
    { z0: 38, z1: 52, h: 13.2, c: '#ebe5dc', t: '#ffffff', name: 'Kamienica (prawa strona)', balc: [1], shops: [
      { z0: 39, z1: 51, txt: 'SPOŻYWCZY', bg: '#c0392b', fg: '#ffffff', name: 'Sklep spożywczy', ware: ['#f1c40f', '#e74c3c', '#27ae60'] }] },
    { z0: 52, z1: 68, h: 17.5, c: '#b9694e', t: '#e8c2a8', name: 'Kamienica z cegły', balc: [2], shops: [
      { z0: 54, z1: 61, txt: 'FRYZJER', bg: '#1f1f1f', fg: '#f5d76e', name: 'Fryzjer', ware: ['#fff'] }] },
    { z0: 68, z1: 95, h: 15, c: '#cdd8bf', t: '#eef3e6', name: 'Kamienica (prawa strona)', balc: [], shops: [] },
  ];

  /* gradient wzdłuż ściany (mgiełka zależna od odległości) */
  function zgrad(X, z0, z1, h, k) {
    const g = c.createLinearGradient(PX(X, z0), 0, PX(X, z1), 0);
    g.addColorStop(0, col(h, k, z0)); g.addColorStop(1, col(h, k, z1));
    return g;
  }

  function shopFront(s, b, X, side, sh, r) {
    const into = X + side * 0.18;            // szyba cofnięta w ścianę
    const n = Math.max(2, Math.round((s.z1 - s.z0) / 1.7)), step = (s.z1 - s.z0) / n;
    const doorI = side < 0 ? n - 1 : 0;
    for (let i = 0; i < n; i++) {
      const za = s.z0 + i * step + 0.14, zb = za + step - 0.28, zm = (za + zb) / 2;
      const isDoor = i === doorI, y0 = isDoor ? 0.05 : 0.55, y1 = 2.62;
      const em = NIGHT ? 0.13 : 0;
      MW(into, s.name, em);
      let g;
      if (NIGHT) {
        g = c.createLinearGradient(0, PY(y1, zm), 0, PY(y0, zm));
        g.addColorStop(0, '#ffe2a6'); g.addColorStop(1, '#f2b866');
      } else {
        g = c.createLinearGradient(PX(into, za), PY(y1, za), PX(into, zb), PY(y0, zb));
        g.addColorStop(0, col('#86a1b0', 1, zm)); g.addColorStop(0.45, col('#4d6373', 1, zm));
        g.addColorStop(0.55, col('#a7bdca', 1, zm)); g.addColorStop(1, col('#536676', 1, zm));
      }
      fillP(wallQ(into, za, zb, y0, y1), g);
      // towar na wystawie
      if (!isDoor && s.ware) {
        const into2 = into + side * 0.25;
        for (const Y of [0.9, 1.45, 2.0]) {
          c.fillStyle = col('#8a6a48', NIGHT ? 3 : 1, zm); path(wallQ(into2, za, zb, Y - 0.04, Y)); c.fill();
          for (let z = za + 0.1; z < zb - 0.08; z += 0.16 + r() * 0.08) {
            const rr = 0.06 + r() * 0.05, p = G(into2, Y + rr, z);
            c.fillStyle = col(s.ware[(r() * s.ware.length) | 0], NIGHT ? 4.2 : 1, z);
            ell(p[0], p[1], Math.max(0.8, rr * Math.abs(PX(into2, z + 1) - PX(into2, z))), rr * K(z)); c.fill();
          }
        }
        if (NIGHT) { M(zm, s.name, em); }
      }
      // ościeże (widać tylko dalsze) i nadproże
      M(zb, s.name);
      fillP([G(X, y0, zb), G(into, y0, zb), G(into, y1, zb), G(X, y1, zb)], col(b.c, sh * 0.8, zb));
      fillP([G(X, y1, za), G(X, y1, zb), G(into, y1, zb), G(into, y1, za)], col(b.c, sh * 0.62, zb));
      // ramy
      c.strokeStyle = col('#2c2a28', 1, zm); c.lineWidth = Math.max(0.7, 0.06 * K(zm));
      path(wallQ(into, za, zb, y0, y1)); c.stroke();
      if (isDoor) {
        const q = G(into, 1.05, za + (zb - za) * 0.85); c.fillStyle = col('#c9a84a', 1, zm); ell(q[0], q[1], 0.05 * K(zm) * 0.4, 0.05 * K(zm)); c.fill();
      } else {
        c.beginPath(); const a = G(into, 2.1, za), bb = G(into, 2.1, zb); c.moveTo(a[0], a[1]); c.lineTo(bb[0], bb[1]); c.stroke();
      }
      if (!NIGHT) P.decor(() => {    // odbicie światła na szybie
        c.fillStyle = 'rgba(255,255,255,0.12)';
        path([G(into, y0, za + 0.15), G(into, y0, za + 0.45), G(into, y1, za + 0.85), G(into, y1, za + 0.55)]); c.fill();
      });
    }
    // szyld
    MW(X + side * -0.04, s.name, NIGHT ? (s.neon ? 0.35 : 0.06) : 0);
    fillP(wallQ(X - side * 0.04, s.z0, s.z1, 2.86, 3.56), col(s.bg, s.bg === '#ffffff' ? sh : 1, (s.z0 + s.z1) / 2));
    if (NIGHT) M((s.z0 + s.z1) / 2, s.name, s.neon ? 0.45 : 0.2);
    const tc = NIGHT ? (s.neon ? '#ffd28a' : '#fff1cf') : s.fg;
    wallText(s.txt, X - side * 0.05, (s.z0 + s.z1) / 2, 3.0, 0.42, NIGHT && s.fg === '#168a3c' ? '#3cff7a' : tc, { maxL: s.z1 - s.z0 - 0.4 });
    if (NIGHT && s.neon) { const p = G(X, 3.2, (s.z0 + s.z1) / 2); glow(p[0], p[1], 90, '255,170,90', 0.3); }
  }

  function drawWindow(b, X, side, za, zb, y0, y1, sh, r, lit) {
    const into = X + side * 0.22, zm = (za + zb) / 2;
    M(zm, b.name);
    // obramienie i gzymsik nad oknem
    fillP(wallQ(X, za - 0.15, zb + 0.15, y0 - 0.14, y1 + 0.14), col(b.t, sh, zm));
    fillP(wallQ(X, za - 0.28, zb + 0.28, y1 + 0.2, y1 + 0.38), col(b.t, sh * 1.02, zm));
    // szyba
    if (lit) {
      M(zm, b.name, 0.1 + r() * 0.05);
      const g = c.createLinearGradient(0, PY(y1, zm), 0, PY(y0, zm));
      g.addColorStop(0, lit > 0.5 ? '#ffd88c' : '#ffe9c0'); g.addColorStop(1, lit > 0.5 ? '#f0a85a' : '#e8c48a');
      fillP(wallQ(into, za, zb, y0, y1), g);
      M(zm, b.name);
      // zasłony
      c.fillStyle = lit > 0.5 ? '#c4733a' : '#b9a27a';
      path(wallQ(into, za, za + 0.22, y0, y1)); c.fill(); path(wallQ(into, zb - 0.2, zb, y0, y1)); c.fill();
    } else {
      const g = c.createLinearGradient(0, PY(y1, zm), 0, PY(y0, zm));
      if (NIGHT) { g.addColorStop(0, '#0c1326'); g.addColorStop(1, '#151d33'); }
      else { g.addColorStop(0, col('#7d97ad', 1, zm)); g.addColorStop(0.5, col('#3e5263', 1, zm)); g.addColorStop(1, col('#2b3946', 1, zm)); }
      fillP(wallQ(into, za, zb, y0, y1), g);
      if (!NIGHT && r() < 0.5) { c.fillStyle = col('#efe9dc', 0.9, zm); path(wallQ(into, za, za + 0.3, y0 + 0.1, y1)); c.fill(); }
    }
    // ościeże dalsze i nadproże (widoczne od dołu)
    fillP([G(X, y0, zb), G(into, y0, zb), G(into, y1, zb), G(X, y1, zb)], col(b.c, sh * 0.8, zm));
    if (y1 > EYE) fillP([G(X, y1, za), G(X, y1, zb), G(into, y1, zb), G(into, y1, za)], col(b.c, sh * 0.6, zm));
    // ramy okienne (krzyż)
    c.strokeStyle = col('#f3efe6', NIGHT && lit ? 3 : sh, zm); c.lineWidth = Math.max(0.6, 0.07 * K(zm));
    c.beginPath();
    let a = G(into, y0, zm), q = G(into, y1, zm); c.moveTo(a[0], a[1]); c.lineTo(q[0], q[1]);
    a = G(into, y1 - 0.55, za); q = G(into, y1 - 0.55, zb); c.moveTo(a[0], a[1]); c.lineTo(q[0], q[1]);
    c.stroke();
    // parapet
    fillP(wallQ(X - side * 0.06, za - 0.08, zb + 0.08, y0 - 0.1, y0), col(b.t, sh * 0.9, zm));
    // skrzynka z pelargoniami
    if (r() < 0.22) {
      const xo = X - side * 0.28;
      fillP(wallQ(xo, za, zb, y0 - 0.32, y0 - 0.08), col('#7a4a2a', sh, zm));
      for (let i = 0; i < 9; i++) {
        const z = za + 0.08 + i * (zb - za - 0.16) / 8, p = G(xo, y0 - 0.02 + r() * 0.12, z), rr = 0.09 * K(z);
        c.fillStyle = col('#3c7a2c', sh, z); ell(p[0], p[1] + rr * 0.4, rr * 0.7, rr * 0.8); c.fill();
        c.fillStyle = col(i % 3 ? '#e2262f' : '#ff5a7a', NIGHT ? 1.4 : 1, z); ell(p[0], p[1] - rr * 0.3, rr * 0.5, rr * 0.55); c.fill();
      }
    }
  }

  function drawBalcony(b, X, side, za, zb, ys, sh) {
    const out = -side, Xo = X + out * 0.95, z0 = za - 0.45, z1 = zb + 0.45, zm = (z0 + z1) / 2;
    if (!NIGHT) P.decor(() => fillP(wallQ(X, z0 + 0.4, z1 + 0.5, ys - 1.1, ys), 'rgba(70,40,30,0.18)'));
    M(zm, b.name);
    fillP([G(X, ys, z0), G(X, ys, z1), G(Xo, ys, z1), G(Xo, ys, z0)], col(b.t, sh * 0.62, zm));   // spód płyty
    fillP(wallQ(Xo, z0, z1, ys, ys + 0.18), col(b.t, sh, zm));
    fillP(frontQ(Math.min(X, Xo), Math.max(X, Xo), ys, ys + 0.18, z0), col(b.t, sh * 0.95, z0));
    // balustrada kuta
    c.strokeStyle = col('#24262a', 1, zm); c.lineWidth = Math.max(0.6, 0.04 * K(zm));
    c.beginPath();
    let a = G(Xo, ys + 1.05, z0), q = G(Xo, ys + 1.05, z1); c.moveTo(a[0], a[1]); c.lineTo(q[0], q[1]);
    for (let z = z0; z <= z1 + 0.01; z += 0.14) { a = G(Xo, ys + 0.18, z); q = G(Xo, ys + 1.05, z); c.moveTo(a[0], a[1]); c.lineTo(q[0], q[1]); }
    a = G(X, ys + 1.05, z0); q = G(Xo, ys + 1.05, z0); c.moveTo(a[0], a[1]); c.lineTo(q[0], q[1]);
    for (let x = 0; x <= 0.95; x += 0.14) { a = G(X + out * x, ys + 0.18, z0); q = G(X + out * x, ys + 1.05, z0); c.moveTo(a[0], a[1]); c.lineTo(q[0], q[1]); }
    c.stroke();
    // ozdobny pas w połowie wysokości
    c.lineWidth = Math.max(0.6, 0.06 * K(zm)); c.beginPath();
    a = G(Xo, ys + 0.6, z0); q = G(Xo, ys + 0.6, z1); c.moveTo(a[0], a[1]); c.lineTo(q[0], q[1]); c.stroke();
    // doniczki z kwiatami na balustradzie
    for (let z = z0 + 0.3; z < z1 - 0.2; z += 0.55) {
      const p = G(Xo, ys + 1.12, z), rr = 0.13 * K(z);
      c.fillStyle = col('#3f7d30', sh, z); ell(p[0], p[1], rr * 0.6, rr * 0.7); c.fill();
      c.fillStyle = col(z % 1.1 < 0.55 ? '#e8303a' : '#f2f0f5', NIGHT ? 1.3 : 1, z); ell(p[0], p[1] - rr * 0.4, rr * 0.4, rr * 0.45); c.fill();
    }
  }

  function drawFacade(b, X, side, seed) {
    const r = mulberry32(seed), lr = mulberry32(seed * 7 + 3);
    const sh = side < 0 ? 1.04 : 0.74;          // lewa strona w słońcu, prawa w cieniu
    const out = -side, zm = (b.z0 + b.z1) / 2;
    MW(X, b.name);
    fillP(wallQ(X, b.z0, b.z1, 0, b.h), zgrad(X, b.z0, b.z1, b.c, sh));
    // cokół i gzyms nad parterem
    fillP(wallQ(X, b.z0, b.z1, 0, 0.5), zgrad(X, b.z0, b.z1, b.c, sh * 0.72));
    fillP(wallQ(X, b.z0, b.z1, 3.72, 3.95), zgrad(X, b.z0, b.z1, b.t, sh));
    fillP([G(X, 3.72, b.z0), G(X, 3.72, b.z1), G(X + out * 0.22, 3.72, b.z1), G(X + out * 0.22, 3.72, b.z0)], zgrad(X, b.z0, b.z1, b.t, sh * 0.7));
    // boniowanie parteru
    P.decor(() => {
      c.strokeStyle = 'rgba(0,0,0,0.09)'; c.lineWidth = 1; c.beginPath();
      for (let Y = 0.5; Y < 3.7; Y += 0.45) { const a = G(X, Y, b.z0), q = G(X, Y, b.z1); c.moveTo(a[0], a[1]); c.lineTo(q[0], q[1]); }
      c.stroke();
      // zabrudzenie przy ziemi i lekki gradient pionowy
      const g = c.createLinearGradient(0, PY(0, zm), 0, PY(b.h, zm));
      g.addColorStop(0, 'rgba(40,30,20,0.12)'); g.addColorStop(0.3, 'rgba(0,0,0,0)'); g.addColorStop(1, NIGHT ? 'rgba(0,0,0,0.25)' : 'rgba(255,240,210,0.08)');
      fillP(wallQ(X, b.z0, b.z1, 0, b.h), g);
    });
    // piętra
    const floors = Math.floor((b.h - 4.7) / 3.15), balconies = [];
    for (let f = 0; f < floors; f++) {
      const y0 = 4.95 + f * 3.15, y1 = y0 + 1.9;
      fillP(wallQ(X, b.z0, b.z1, y0 - 0.5, y0 - 0.38), zgrad(X, b.z0, b.z1, b.t, sh * 0.96));   // pas międzykondygnacyjny
      let bay = 0;
      for (let z = b.z0 + 1.5; z + 1.25 < b.z1 - 0.4; z += 2.9, bay++) {
        const lit = NIGHT ? (lr() < 0.42 ? (lr() < 0.5 ? 1 : 0.3) : 0) : (lr(), lr(), 0);
        drawWindow(b, X, side, z, z + 1.25, y0, y1, sh, r, lit);
        if (b.balc && b.balc.indexOf(f + 1) >= 0 && bay % 2 === 1) balconies.push([z, z + 1.25, y0 - 0.45]);
      }
    }
    balconies.sort((a, q) => q[0] - a[0]).forEach(bl => drawBalcony(b, X, side, bl[0], bl[1], bl[2], sh));
    // gzyms wieńczący
    M(zm, b.name);
    const Xo = X + out * 0.6;
    fillP([G(X, b.h - 0.75, b.z0), G(X, b.h - 0.75, b.z1), G(Xo, b.h - 0.75, b.z1), G(Xo, b.h - 0.75, b.z0)], zgrad(X, b.z0, b.z1, b.t, sh * 0.55));
    fillP(wallQ(Xo, b.z0, b.z1, b.h - 0.75, b.h), zgrad(X, b.z0, b.z1, b.t, sh));
    P.decor(() => {   // kostki (ząbki) pod gzymsem
      c.fillStyle = 'rgba(0,0,0,0.13)';
      for (let z = b.z0 + 0.2; z < b.z1; z += 0.5) { path(wallQ(X, z, z + 0.22, b.h - 1.0, b.h - 0.75)); c.fill(); }
    });
    // rynna na granicy budynków
    M(b.z1, b.name);
    c.strokeStyle = col('#8f969c', sh, b.z1); c.lineWidth = Math.max(0.8, 0.11 * K(b.z1));
    c.beginPath(); let a = G(X + out * 0.12, 0.3, b.z1 - 0.15), q = G(X + out * 0.12, b.h - 0.7, b.z1 - 0.15); c.moveTo(a[0], a[1]); c.lineTo(q[0], q[1]); c.stroke();
    // sklepy
    for (const s of b.shops) shopFront(s, b, X, side, sh, r);
  }

  function drawFacades() {
    // ściana kamienicy za przecznicą (widoczna w szczelinie ul. Różanej)
    M(42, 'Kamienica za skrzyżowaniem');
    fillP(frontQ(-40, XL, 0, 16.2, 42), col('#d8c3a0', 0.85, 42));
    for (let f = 0; f < 4; f++) for (let X = -6; X < XL - 0.5; X += 2.2) fillP(frontQ(X, X + 1.1, 4.9 + f * 3.15, 6.8 + f * 3.15, 42), NIGHT && (f + X) % 2 ? '#e7b36a' : col('#465566', 1, 42));
    // od najdalszych
    RIGHT.slice().reverse().forEach((b, i) => drawFacade(b, XRF, 1, 101 + i * 13));
    LEFT.slice().reverse().forEach((b, i) => drawFacade(b, XL, -1, 201 + i * 17));
    // tabliczka z nazwą ulicy (MSI – niebieska) i numer domu na narożnej kamienicy
    M(6.1, 'Tabliczka „ul. Kwiatowa”');
    fillP(wallQ(XL + 0.03, 5.55, 6.75, 2.22, 2.62), NIGHT ? '#132a55' : '#1d4f9c');
    c.strokeStyle = NIGHT ? '#8a96ad' : '#ffffff'; c.lineWidth = 1.6; path(wallQ(XL + 0.035, 5.6, 6.7, 2.26, 2.58)); c.stroke();
    wallText('ul. Kwiatowa', XL + 0.04, 6.15, 2.33, 0.17, NIGHT ? '#a9b4c8' : '#ffffff', { maxL: 1.0, weight: 'bold' });
    fillP(wallQ(XL + 0.03, 6.85, 7.15, 2.27, 2.57), NIGHT ? '#132a55' : '#1d4f9c');
    wallText('12', XL + 0.04, 7.0, 2.33, 0.17, NIGHT ? '#a9b4c8' : '#ffffff', { maxL: 0.24 });
  }

  /* =====================================================================
     OBIEKTY NA ULICY (każdy: z, draw(), opcjonalnie shadow() i lights)
     ===================================================================== */
  function lamp(X, Z, dir) {
    const ax = X + dir * 0.85, yl = 4.95;
    return {
      z: Z, lights: [{ X: ax, Y: yl - 0.2, Z, rgb: '255,196,120', size: 0.35, a: 1, pool: 4.5 }],
      shadow() { shadowPole(X, Z, 5.2, 0.14); },
      draw() {
        M(Z, 'Latarnia');
        const dark = col('#2d3935'), hi = col('#4d5c56');
        local(X, 0, Z, k => {
          c.fillStyle = dark;
          c.beginPath(); c.moveTo(-0.17, 0); c.lineTo(0.17, 0); c.lineTo(0.11, -0.75); c.lineTo(-0.11, -0.75); c.closePath(); c.fill();
          c.fillRect(-0.15, -0.84, 0.3, 0.09);
          c.beginPath(); c.moveTo(-0.07, -0.84); c.lineTo(0.07, -0.84); c.lineTo(0.045, -4.75); c.lineTo(-0.045, -4.75); c.closePath(); c.fill();
          c.fillStyle = hi; c.fillRect(-0.02, -4.6, 0.03, 3.7);
          c.fillStyle = dark; c.fillRect(-0.09, -2.7, 0.18, 0.09); c.fillRect(-0.08, -4.1, 0.16, 0.07);
          c.strokeStyle = dark; c.lineWidth = 0.07;
          c.beginPath(); c.moveTo(0, -4.7); c.bezierCurveTo(0, -5.35, dir * 0.4, -5.45, dir * 0.85, -5.3); c.stroke();
          c.lineWidth = 0.03; c.beginPath(); c.arc(dir * 0.2, -4.95, 0.13, 0, 7); c.stroke();
          // klosz
          c.fillStyle = dark;
          c.beginPath(); c.moveTo(dir * 0.85 - 0.04, -5.3); c.lineTo(dir * 0.85 + 0.04, -5.3); c.lineTo(dir * 0.85 + 0.04, -5.18); c.lineTo(dir * 0.85 - 0.04, -5.18); c.fill();
          c.beginPath(); c.moveTo(ax - X - 0.26, -yl - 0.08); c.lineTo(ax - X, -yl - 0.26); c.lineTo(ax - X + 0.26, -yl - 0.08); c.closePath(); c.fill();
        });
        M(Z, 'Latarnia – światło', NIGHT ? 1 : 0);
        local(ax, 0, Z, () => {
          const g = c.createLinearGradient(0, -yl - 0.08, 0, -yl + 0.3);
          if (NIGHT) { g.addColorStop(0, '#fff7e0'); g.addColorStop(1, '#ffd38a'); }
          else { g.addColorStop(0, '#f4f7f6'); g.addColorStop(1, '#b8c4c4'); }
          c.fillStyle = g;
          c.beginPath(); c.moveTo(-0.22, -yl - 0.08); c.lineTo(0.22, -yl - 0.08); c.lineTo(0.13, -yl + 0.3); c.lineTo(-0.13, -yl + 0.3); c.closePath(); c.fill();
        });
        M(Z, 'Latarnia');
        local(ax, 0, Z, () => { c.fillStyle = dark; c.fillRect(-0.15, -yl + 0.3, 0.3, 0.05); ell(0, -yl + 0.38, 0.04, 0.05); c.fill(); });
        if (NIGHT) {
          const p = G(ax, yl - 0.1, Z);
          glow(p[0], p[1], Math.max(70, 6 * K(Z)), '255,180,100', 0.5, 0.12);
          glow(p[0], p[1], Math.max(16, 1.0 * K(Z)), '255,240,210', 0.9, 0.35);
          // stożek światła
          P.decor(() => {
            c.save(); c.globalCompositeOperation = 'lighter';
            const g = c.createLinearGradient(0, p[1], 0, PY(0, Z));
            g.addColorStop(0, 'rgba(255,200,120,0.13)'); g.addColorStop(1, 'rgba(255,200,120,0)');
            fillP([[p[0] - 0.15 * K(Z), p[1]], [p[0] + 0.15 * K(Z), p[1]], G(ax + 2.2, 0, Z), G(ax - 2.2, 0, Z)], g);
            c.restore();
          });
        }
      }
    };
  }

  function tree(X, Z, seed, sc) {
    sc = sc || 1;
    return {
      z: Z,
      shadow() { shadowPole(X, Z, 4.5, 0.3); const p = G(X + SUN.dx * 6.3 * sc, 0, Z + SUN.dz * 6.3 * sc); P.decor(() => { c.fillStyle = 'rgba(22,30,62,0.25)'; ell(p[0], p[1], 2.4 * sc * K(Z), 2.4 * sc * K(Z) * EYE / Z); c.fill(); }); },
      draw() {
        const r = mulberry32(seed);
        M(Z, 'Drzewo (lipa)');
        local(X, 0, Z, () => {
          c.fillStyle = col('#5a4a3a', 0.9);
          c.beginPath(); c.moveTo(-0.2, 0); c.lineTo(0.2, 0); c.lineTo(0.13, -4.6 * sc); c.lineTo(-0.13, -4.6 * sc); c.closePath(); c.fill();
          c.strokeStyle = col('#5a4a3a', 0.9); c.lineWidth = 0.1;
          c.beginPath(); c.moveTo(0, -3.9 * sc); c.lineTo(-0.9, -5.2 * sc); c.moveTo(0, -4.2 * sc); c.lineTo(0.8, -5.4 * sc); c.stroke();
          c.fillStyle = col('#7c6a56', 1); c.fillRect(0.03, -4.4 * sc, 0.06, 4.2 * sc);
          const R = 2.3 * sc, cy = -6.4 * sc, blobs = [];
          for (let i = 0; i < 30; i++) {
            const a = r() * 6.283, d = Math.sqrt(r()) * R * 0.85;
            blobs.push([Math.cos(a) * d * 1.05, cy + Math.sin(a) * d * 0.85, R * (0.3 + r() * 0.22)]);
          }
          const tones = NIGHT ? ['#0e1d16', '#132a1d', '#1a3424'] : ['#3a6a2a', '#4f8a33', '#78b04c'];
          blobs.forEach(q => { c.fillStyle = col(tones[0], 1, Z); ell(q[0], q[1], q[2] * 1.1, q[2]); c.fill(); });
          blobs.forEach(q => { c.fillStyle = col(tones[1], 1, Z); ell(q[0] + q[2] * 0.15, q[1] - q[2] * 0.15, q[2] * 0.85, q[2] * 0.78); c.fill(); });
          blobs.forEach(q => { if (q[0] - (q[1] - cy) > -0.3) { c.fillStyle = col(tones[2], 1, Z); ell(q[0] + q[2] * 0.35, q[1] - q[2] * 0.35, q[2] * 0.45, q[2] * 0.4); c.fill(); } });
        });
      }
    };
  }

  /* samochód: widok z tyłu (jedzie od nas) albo z przodu (jedzie do nas); bok widoczny od strony X0 */
  function car(o) {
    const w = o.X1 - o.X0, L = o.L || 4.3, lights = [];
    const xm = (o.X0 + o.X1) / 2;
    if (o.view === 'rear' && !o.parked && (NIGHT || o.brake)) for (const s of [-1, 1]) lights.push({ X: xm + s * (w / 2 - 0.2), Y: 0.85, Z: o.Z, rgb: '255,40,30', size: 0.18, a: o.brake ? 0.9 : 0.6 });
    if (o.view === 'front' && !o.parked) for (const s of [-1, 1]) lights.push({ X: xm + s * (w / 2 - 0.25), Y: 0.72, Z: o.Z, rgb: NIGHT ? '255,245,220' : '240,245,255', size: NIGHT ? 0.25 : 0.12, a: NIGHT ? 1 : 0.4 });
    return {
      z: o.Z, lights,
      shadow() { shadowBox(o.X0, o.X1, o.Z, o.Z + L, 1.45, 0.32); },
      draw() {
        const body = o.color, zf = o.Z;
        // bok
        if (o.X0 > 0.2) {
          MW(o.X0, o.name || 'Samochód');
          const prof = o.view === 'rear'
            ? [[0, 0.3], [0, 0.95], [0.25, 1.02], [0.9, 1.05], [1.35, 1.42], [L - 1.6, 1.45], [L - 1.05, 1.0], [L - 0.15, 0.92], [L, 0.75], [L, 0.3]]
            : [[0, 0.3], [0, 0.78], [0.2, 0.9], [1.1, 1.0], [1.75, 1.43], [L - 1.25, 1.45], [L - 0.8, 1.0], [L, 0.95], [L, 0.3]];
          fillP(prof.map(p => G(o.X0, p[1], zf + p[0])), col(body, 0.72, zf));
          const gl = o.view === 'rear' ? [[1.0, 1.05], [1.4, 1.38], [L - 1.62, 1.4], [L - 1.15, 1.02]] : [[1.25, 1.02], [1.8, 1.38], [L - 1.3, 1.4], [L - 0.9, 1.02]];
          fillP(gl.map(p => G(o.X0, p[1], zf + p[0])), NIGHT ? '#0a0e18' : col('#2e3a46', 1, zf));
          for (const wz of [0.8, L - 0.8]) {
            const p = G(o.X0 + 0.02, 0.31, zf + wz), rz = 0.31;
            c.fillStyle = '#121214'; ell(p[0], p[1], Math.abs(PX(o.X0, zf + wz - rz) - PX(o.X0, zf + wz + rz)) / 2 + 1, rz * K(zf + wz)); c.fill();
            c.fillStyle = col('#9aa0a6', 0.8, zf); ell(p[0], p[1], Math.abs(PX(o.X0, zf + wz - rz) - PX(o.X0, zf + wz + rz)) / 4 + 0.5, rz * 0.5 * K(zf + wz)); c.fill();
          }
        }
        // przód / tył
        M(zf, o.name || 'Samochód');
        local(o.X0, 0, zf, k => {
          c.fillStyle = '#111114'; c.fillRect(0.08, -0.36, 0.26, 0.36); c.fillRect(w - 0.34, -0.36, 0.26, 0.36);
          const g = c.createLinearGradient(0, -1.0, 0, -0.25);
          g.addColorStop(0, col(body, 1.12, zf)); g.addColorStop(1, col(body, 0.82, zf));
          c.fillStyle = g; rrect(0, -1.0, w, 0.74, 0.12); c.fill();
          c.fillStyle = col(body, 0.95, zf);
          c.beginPath(); c.moveTo(0.1, -0.97); c.lineTo(0.36, -1.4); c.quadraticCurveTo(w / 2, -1.5, w - 0.36, -1.4); c.lineTo(w - 0.1, -0.97); c.closePath(); c.fill();
          c.fillStyle = NIGHT ? '#090c16' : col('#26323e', 1, zf);
          c.beginPath(); c.moveTo(0.24, -1.0); c.lineTo(0.43, -1.34); c.lineTo(w - 0.43, -1.34); c.lineTo(w - 0.24, -1.0); c.closePath(); c.fill();
          if (!NIGHT) { c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.moveTo(0.5, -1.0); c.lineTo(0.62, -1.34); c.lineTo(0.8, -1.34); c.lineTo(0.68, -1.0); c.fill(); }
          c.fillStyle = col('#1d1e22', 1, zf); c.fillRect(-0.02, -0.42, w + 0.04, 0.15);
          c.fillStyle = col('#f2f2ee', 1, zf); c.fillRect(w / 2 - 0.26, -0.56, 0.52, 0.12);
          c.fillStyle = col('#1e4fa3', 1, zf); c.fillRect(w / 2 - 0.26, -0.56, 0.05, 0.12);
          if (o.view === 'front') { c.fillStyle = col('#16181c', 1, zf); rrect(w / 2 - 0.42, -0.84, 0.84, 0.2, 0.04); c.fill(); }
          if (o.taxi) {
            c.fillStyle = col('#fff4b0', NIGHT ? 3 : 1, zf); c.fillRect(w / 2 - 0.25, -1.62, 0.5, 0.15);
            ltext('TAXI', w / 2, -1.5, 0.11, k, 'bold # Arial', '#222', 'center');
          }
        });
        // światła
        local(o.X0, 0, zf, () => {
          for (const s of [0, 1]) {
            const x = s ? w - 0.45 : 0.07;
            if (o.view === 'rear') {
              const on = !o.parked && (NIGHT || o.brake);
              M(zf, on ? 'Światła stop samochodu' : (o.name || 'Samochód'), on ? (o.brake ? 0.75 : 0.45) : 0);
              c.fillStyle = on ? (o.brake ? '#ff2a1e' : '#ff3a2a') : col('#9e1a1c', 1, zf);
              rrect(x, -0.92, 0.38, 0.16, 0.04); c.fill();
            } else {
              const on = !o.parked;
              M(zf, on ? 'Reflektory samochodu' : (o.name || 'Samochód'), on ? (NIGHT ? 1 : 0.3) : 0);
              c.fillStyle = on ? '#fffaf0' : col('#d8dde2', 1, zf);
              rrect(x, -0.82, 0.38, 0.14, 0.05); c.fill();
            }
          }
          if (o.view === 'rear' && o.brake) { M(zf, 'Światła stop samochodu', 0.7); c.fillStyle = '#ff2a1e'; c.fillRect(w / 2 - 0.2, -1.38, 0.4, 0.04); }
        });
        for (const L2 of lights) { const p = G(L2.X, L2.Y, L2.Z); glow(p[0], p[1], Math.max(6, L2.size * 6 * K(L2.Z)), L2.rgb, L2.a * (NIGHT ? 0.7 : 0.45)); }
      }
    };
  }

  /* autobus linii 17 nadjeżdżający z naprzeciwka (przód w Z=23) */
  function bus() {
    const X0 = 2.55, X1 = 5.1, Z0 = 23, L = 12, w = X1 - X0;
    const lights = [];
    for (const x of [X0 + 0.35, X1 - 0.35]) lights.push({ X: x, Y: 0.68, Z: Z0, rgb: NIGHT ? '255,246,224' : '240,246,255', size: NIGHT ? 0.32 : 0.15, a: NIGHT ? 1 : 0.45 });
    lights.push({ X: (X0 + X1) / 2, Y: 2.82, Z: Z0, rgb: '255,150,30', size: 0.8, a: NIGHT ? 0.55 : 0.2 });
    return {
      z: Z0, lights,
      shadow() { shadowBox(X0, X1, Z0, Z0 + L, 3.1, 0.34); },
      draw() {
        const name = 'Autobus linii 17';
        // bok
        MW(X0, name);
        fillP(wallQ(X0, Z0, Z0 + L, 0.3, 3.05), col('#f0c03a', 0.8, Z0 + 5));
        fillP(wallQ(X0, Z0, Z0 + L, 0.3, 0.95), col('#cf3426', 0.8, Z0 + 5));
        fillP(wallQ(X0, Z0, Z0 + L, 2.85, 3.05), col('#e9e9e4', 0.75, Z0 + 5));
        for (let z = Z0 + 1.6; z < Z0 + L - 0.6; z += 1.45) {
          const isD = z > Z0 + 5.8 && z < Z0 + 7.3;
          if (NIGHT) M(z, name, 0.1);
          fillP(wallQ(X0, z, z + 1.3, isD ? 0.35 : 1.15, 2.6), NIGHT ? '#cfe6d2' : col('#2b3843', 1, z));
          if (NIGHT) M(z, name);
        }
        fillP(wallQ(X0, Z0 + 0.25, Z0 + 1.4, 0.35, 2.6), NIGHT ? '#9fb7a6' : col('#33424e', 1, Z0));   // drzwi przednie
        for (const wz of [2.6, 9.3]) {
          const p = G(X0, 0.48, Z0 + wz), half = Math.abs(PX(X0, Z0 + wz - 0.5) - PX(X0, Z0 + wz + 0.5)) / 2;
          c.fillStyle = '#121214'; ell(p[0], p[1], half + 1, 0.5 * K(Z0 + wz)); c.fill();
        }
        // przód
        M(Z0, name);
        local(X0, 0, Z0, k => {
          c.fillStyle = '#121214'; c.fillRect(0.15, -0.4, 0.4, 0.4); c.fillRect(w - 0.55, -0.4, 0.4, 0.4);
          c.fillStyle = col('#f0c03a', 1.0, Z0); rrect(0, -3.08, w, 2.8, 0.18); c.fill();
          c.fillStyle = col('#cf3426', 1.0, Z0); c.fillRect(0, -0.98, w, 0.62);
          c.fillStyle = col('#2a2b2e', 1, Z0); c.fillRect(-0.02, -0.5, w + 0.04, 0.22);
          // szyba z kierowcą
          const g = c.createLinearGradient(0, -2.62, 0, -1.0);
          if (NIGHT) { g.addColorStop(0, '#2c3a3a'); g.addColorStop(1, '#4e6a5e'); }
          else { g.addColorStop(0, col('#5a7488', 1, Z0)); g.addColorStop(0.5, col('#26323d', 1, Z0)); g.addColorStop(1, col('#1b242c', 1, Z0)); }
          c.fillStyle = g; rrect(0.1, -2.62, w - 0.2, 1.62, 0.1); c.fill();
          c.fillStyle = NIGHT ? '#18201e' : col('#141a20', 1, Z0);
          ell(w - 0.75, -1.85, 0.16, 0.19); c.fill();
          c.beginPath(); c.moveTo(w - 1.08, -1.0); c.quadraticCurveTo(w - 0.75, -1.85, w - 0.42, -1.0); c.fill();
          c.strokeStyle = NIGHT ? '#1a2220' : col('#10161b', 1, Z0); c.lineWidth = 0.06; ell(w - 0.75, -1.25, 0.26, 0.07); c.stroke();
          c.lineWidth = 0.035; c.beginPath(); c.moveTo(0.5, -1.05); c.lineTo(1.15, -1.6); c.moveTo(1.4, -1.05); c.lineTo(2.05, -1.6); c.stroke();
          if (!NIGHT) { c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.moveTo(0.3, -1.0); c.lineTo(0.75, -2.62); c.lineTo(1.0, -2.62); c.lineTo(0.55, -1.0); c.fill(); }
          // lusterka „uszy królika”
          c.strokeStyle = '#1b1b1d'; c.lineWidth = 0.05;
          c.beginPath(); c.moveTo(0.05, -2.9); c.quadraticCurveTo(-0.35, -2.9, -0.3, -2.3); c.moveTo(w - 0.05, -2.9); c.quadraticCurveTo(w + 0.35, -2.9, w + 0.3, -2.3); c.stroke();
          c.fillStyle = '#1b1b1d'; c.fillRect(-0.4, -2.35, 0.17, 0.42); c.fillRect(w + 0.23, -2.35, 0.17, 0.42);
          // tablica rejestracyjna
          c.fillStyle = col('#f4f4f0', 1, Z0); c.fillRect(w / 2 - 0.26, -0.47, 0.52, 0.12);
          ltext('KR 1717A', w / 2 + 0.02, -0.375, 0.085, k, 'bold # Arial', '#111', 'center');
          ltext('MPK', w / 2, -1.12, 0.12, k, 'bold # Arial', col('#ffffff', 1, Z0), 'center');
          c.fillStyle = '#0b0b0c'; rrect(0.2, -2.98, w - 0.4, 0.32, 0.03); c.fill();
        });
        // wyświetlacz kierunkowy
        M(Z0, 'Wyświetlacz autobusu „17 DWORZEC”', NIGHT ? 0.4 : 0.2);
        local(X0, 0, Z0, k => {
          const led = NIGHT ? '#ffb030' : '#ff9a10';
          ltext('17', 0.28, -2.71, 0.25, k, 'bold # Arial', led, 'left');
          ltext('DWORZEC', w - 0.28, -2.72, 0.2, k, 'bold # Arial', led, 'right');
        });
        // reflektory
        M(Z0, 'Reflektory autobusu', NIGHT ? 1 : 0.3);
        local(X0, 0, Z0, () => {
          c.fillStyle = '#fffaf0';
          rrect(0.12, -0.78, 0.5, 0.16, 0.06); c.fill(); rrect(w - 0.62, -0.78, 0.5, 0.16, 0.06); c.fill();
        });
        for (const L2 of lights) { const p = G(L2.X, L2.Y, L2.Z); glow(p[0], p[1], Math.max(8, L2.size * 5 * K(L2.Z)), L2.rgb, L2.a * (NIGHT ? 0.75 : 0.5)); }
        if (NIGHT) {   // snopy reflektorów na mokrym asfalcie
          P.decor(() => {
            c.save(); c.globalCompositeOperation = 'lighter';
            for (const x of [X0 + 0.37, X1 - 0.37]) {
              const p = G(x, 0.68, Z0), g = c.createLinearGradient(0, p[1], 0, PY(0, 12));
              g.addColorStop(0, 'rgba(255,240,210,0.16)'); g.addColorStop(1, 'rgba(255,240,210,0)');
              fillP([[p[0] - 4, p[1]], [p[0] + 4, p[1]], G(x + 1.2, 0, 13), G(x - 1.2, 0, 13)], g);
            }
            c.restore();
          });
        }
      }
    };
  }

  /* sygnalizator: auta (zielone) + piesi (czerwony ludzik) + znak D-6 */
  function signalCars(X, Z, lit, withPed, name) {
    const lights = [{ X: X - 0.27, Y: lit === 'g' ? 2.42 : 3.08, Z, rgb: lit === 'g' ? '40,255,140' : '255,40,30', size: 0.2, a: 0.9 }];
    if (withPed) lights.push({ X: X - 0.25, Y: 1.93, Z, rgb: '255,40,30', size: 0.18, a: 0.8 });
    return {
      z: Z, lights,
      shadow() { shadowPole(X, Z, 3.5, 0.12); },
      draw() {
        M(Z, 'Sygnalizator świetlny');
        local(X, 0, Z, k => {
          c.fillStyle = col('#8a9096'); c.fillRect(-0.06, -3.45, 0.12, 3.45);
          c.fillStyle = col('#5d6369'); c.fillRect(-0.075, -0.6, 0.15, 0.6);
          c.fillStyle = col('#e6c21c'); rrect(0.05, -1.25, 0.14, 0.22, 0.02); c.fill();        // przycisk
          // tarcza tła z białą obwódką + komora
          c.fillStyle = col('#17181a'); rrect(-0.52, -3.33, 0.5, 1.13, 0.05); c.fill();
          c.strokeStyle = col('#f2f2f2'); c.lineWidth = 0.035; rrect(-0.5, -3.31, 0.46, 1.09, 0.04); c.stroke();
          c.fillStyle = col('#222428'); c.fillRect(-0.06, -3.1, 0.06, 0.08); c.fillRect(-0.06, -2.5, 0.06, 0.08);
          if (withPed) { c.fillStyle = col('#17181a'); rrect(-0.44, -2.12, 0.36, 0.64, 0.04); c.fill(); }
          // D-6 (przejście dla pieszych)
          c.fillStyle = col('#ffffff'); c.fillRect(-0.32, -4.06, 0.64, 0.64);
          c.fillStyle = col('#1f5fb8'); c.fillRect(-0.3, -4.04, 0.6, 0.6);
          c.fillStyle = col('#ffffff'); c.beginPath(); c.moveTo(0, -3.98); c.lineTo(0.25, -3.5); c.lineTo(-0.25, -3.5); c.closePath(); c.fill();
          c.fillStyle = col('#111'); c.fillRect(-0.15, -3.58, 0.3, 0.05);
          ell(0.01, -3.8, 0.028, 0.028); c.fill();
          c.lineWidth = 0.03; c.strokeStyle = col('#111'); c.beginPath(); c.moveTo(0, -3.77); c.lineTo(-0.02, -3.68); c.lineTo(-0.07, -3.6); c.moveTo(-0.02, -3.68); c.lineTo(0.04, -3.6); c.moveTo(0.005, -3.75); c.lineTo(-0.06, -3.7); c.moveTo(0.005, -3.75); c.lineTo(0.06, -3.71); c.stroke();
        });
        // lampy
        const lamps = [['r', 3.08, '#ff2a1e', '#4a1412'], ['y', 2.75, '#ffb21e', '#4a3410'], ['g', 2.42, '#2bff8c', '#0f3a24']];
        for (const [id, Y, on, off] of lamps) {
          const isOn = id === lit;
          M(Z, isOn ? (id === 'g' ? 'Sygnalizator – zielone dla aut' : (name || 'Sygnalizator – czerwone')) : 'Sygnalizator świetlny', isOn ? 0.6 : 0);
          local(X, 0, Z, () => {
            c.fillStyle = isOn ? on : off; c.beginPath(); c.arc(-0.27, -Y, 0.1, 0, 7); c.fill();
            if (isOn) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(-0.29, -Y - 0.03, 0.035, 0, 7); c.fill(); }
          });
          M(Z, 'Sygnalizator świetlny');
          local(X, 0, Z, () => { c.fillStyle = '#0c0c0d'; c.beginPath(); c.moveTo(-0.39, -Y - 0.1); c.quadraticCurveTo(-0.27, -Y - 0.2, -0.15, -Y - 0.1); c.lineTo(-0.15, -Y - 0.12); c.lineTo(-0.39, -Y - 0.12); c.fill(); });
        }
        if (withPed) {
          // czerwony ludzik stojący (zapalony), zielony idący (zgaszony)
          const man = (Y, on, colr, walk) => {
            local(X, 0, Z, () => {
              c.fillStyle = on ? '#1a0606' : '#071a0e'; c.beginPath(); c.arc(-0.26, -Y, 0.12, 0, 7); c.fill();
              c.fillStyle = colr;
              c.beginPath(); c.arc(-0.26, -Y - 0.075, 0.022, 0, 7); c.fill();
              if (walk) { c.beginPath(); c.moveTo(-0.28, -Y - 0.05); c.lineTo(-0.24, -Y - 0.05); c.lineTo(-0.22, -Y + 0.01); c.lineTo(-0.18, -Y + 0.08); c.lineTo(-0.21, -Y + 0.08); c.lineTo(-0.26, -Y + 0.02); c.lineTo(-0.31, -Y + 0.08); c.lineTo(-0.34, -Y + 0.08); c.lineTo(-0.29, -Y); c.closePath(); c.fill(); }
              else { c.fillRect(-0.29, -Y - 0.05, 0.06, 0.08); c.fillRect(-0.285, -Y + 0.03, 0.02, 0.06); c.fillRect(-0.255, -Y + 0.03, 0.02, 0.06); c.fillRect(-0.315, -Y - 0.045, 0.02, 0.06); c.fillRect(-0.225, -Y - 0.045, 0.02, 0.06); }
            });
          };
          M(Z, 'Sygnalizator dla pieszych – czerwony', 0.6); man(1.93, true, '#ff3324', false);
          M(Z, 'Sygnalizator świetlny'); man(1.66, false, '#14512e', true);
        }
        for (const L2 of lights) { const p = G(L2.X, L2.Y, L2.Z); glow(p[0], p[1], Math.max(10, 1.6 * K(Z)), L2.rgb, NIGHT ? 0.6 : 0.3, 0.12); }
      }
    };
  }

  /* słupek przystanku „A” z nazwą */
  function stopSign() {
    const X = 1.55, Z = 6.6;
    return {
      z: Z, shadow() { shadowPole(X, Z, 2.9, 0.07); },
      draw() {
        M(Z, 'Przystanek „Plac Kwiatowy”');
        local(X, 0, Z, k => {
          c.fillStyle = col('#9aa1a8'); c.fillRect(-0.03, -2.6, 0.06, 2.6);
          c.fillStyle = col('#c3c8cd'); c.fillRect(-0.01, -2.6, 0.015, 2.6);
          c.fillStyle = col('#ffffff'); rrect(-0.43, -2.5, 0.86, 0.4, 0.03); c.fill();
          c.strokeStyle = col('#1f7a3c'); c.lineWidth = 0.025; rrect(-0.41, -2.48, 0.82, 0.36, 0.025); c.stroke();
          ltext('Plac Kwiatowy', 0, -2.31, 0.115, k, 'bold # Arial', col('#14532a'), 'center');
          ltext('01   linie: 17 · 105 · N3', 0, -2.18, 0.062, k, '# Arial', col('#333333'), 'center');
          // „A” – żółte koło z zieloną obwódką
          c.fillStyle = col('#1f7a3c'); c.beginPath(); c.arc(0, -2.8, 0.235, 0, 7); c.fill();
          c.fillStyle = col('#f6d21c'); c.beginPath(); c.arc(0, -2.8, 0.2, 0, 7); c.fill();
          ltext('A', 0, -2.71, 0.25, k, 'bold # Arial', col('#1f7a3c'), 'center');
        });
      }
    };
  }

  function bollards(X, zs) {
    return zs.map(Z => ({
      z: Z, shadow() { shadowPole(X, Z, 0.9, 0.1); },
      draw() {
        M(Z, 'Słupek');
        local(X, 0, Z, () => {
          c.fillStyle = col('#3a3f45'); c.fillRect(-0.05, -0.9, 0.1, 0.9); ell(0, -0.9, 0.05, 0.03); c.fill();
          c.fillStyle = col('#e9eaea'); c.fillRect(-0.05, -0.8, 0.1, 0.07);
        });
      }
    }));
  }

  /* ogródek kawiarni po drugiej stronie: parasole i stoliki */
  function cafe(X, Z, colr) {
    return {
      z: Z, draw() {
        M(Z, 'Ogródek kawiarni');
        local(X, 0, Z, () => {
          c.fillStyle = col('#3b3b3b', 0.8, Z); c.fillRect(-0.03, -2.2, 0.06, 2.2);
          c.fillRect(-0.35, -0.75, 0.7, 0.05); c.fillRect(-0.03, -0.75, 0.06, 0.75);
          c.fillStyle = col(colr, 0.8, Z);
          c.beginPath(); c.moveTo(-1.3, -2.0); c.quadraticCurveTo(0, -2.75, 1.3, -2.0); c.closePath(); c.fill();
          c.fillStyle = col('#ffffff', 0.75, Z); c.fillRect(-1.3, -2.02, 2.6, 0.08);
          c.fillStyle = col('#6b4a2e', 0.8, Z); c.fillRect(-0.7, -0.5, 0.25, 0.05); c.fillRect(0.45, -0.5, 0.25, 0.05);
          c.fillRect(-0.68, -0.5, 0.03, 0.5); c.fillRect(0.67, -0.5, 0.03, 0.5); c.fillRect(-0.68, -1.0, 0.03, 0.5); c.fillRect(0.67, -1.0, 0.03, 0.5);
        });
        if (NIGHT) { const p = G(X, 2.1, Z); glow(p[0], p[1], 40, '255,190,120', 0.25); }
      }
    };
  }

  /* =====================================================================
     LUDZIE
     ===================================================================== */
  function drawPersonLocal(o, k) {
    const u = o.h / 1.75, back = o.view === 'back';
    const skin = col(o.skin || '#e9b896'), hair = col(o.hair || '#4a3020');
    const coatG = c.createLinearGradient(-0.25 * u, 0, 0.25 * u, 0);
    coatG.addColorStop(0, col(o.coat, 0.72)); coatG.addColorStop(0.6, col(o.coat, 1)); coatG.addColorStop(1, col(o.coat, 1.12));
    const st = o.stride || 0;
    // buty i nogi
    c.fillStyle = col('#1d1d20');
    ell(-0.09 * u - st, -0.03, 0.075 * u, 0.04); c.fill(); ell(0.09 * u + st, -0.03, 0.075 * u, 0.04); c.fill();
    c.fillStyle = col(o.skirt ? (o.legs || '#3a2e2a') : (o.pants || '#2f3d55'));
    c.beginPath(); c.moveTo(-0.17 * u, -0.95 * u); c.lineTo(-0.015 * u, -0.95 * u); c.lineTo(-0.04 * u - st * 0.5, -0.06); c.lineTo(-0.14 * u - st, -0.06); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0.17 * u, -0.95 * u); c.lineTo(0.015 * u, -0.95 * u); c.lineTo(0.04 * u + st * 0.5, -0.06); c.lineTo(0.14 * u + st, -0.06); c.closePath(); c.fill();
    if (o.skirt) { c.fillStyle = col(o.skirt); c.beginPath(); c.moveTo(-0.17 * u, -1.0 * u); c.lineTo(0.17 * u, -1.0 * u); c.lineTo(0.25 * u, -0.55 * u); c.lineTo(-0.25 * u, -0.55 * u); c.closePath(); c.fill(); }
    // długie włosy z tyłu (widok z przodu)
    if (o.hairLong && !back) { c.fillStyle = hair; rrect(-0.12 * u, -1.72 * u, 0.24 * u, 0.36 * u, 0.08 * u); c.fill(); }
    // ramiona (rękawy) i dłonie
    const hem = -(o.long ? 0.6 : 0.86) * u;
    c.fillStyle = col(o.coat, 0.8);
    c.beginPath(); c.moveTo(-0.24 * u, -1.41 * u); c.lineTo(-0.17 * u, -1.32 * u); c.lineTo(-0.2 * u, -0.86 * u); c.lineTo(-0.29 * u, -0.87 * u); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(0.24 * u, -1.41 * u); c.lineTo(0.17 * u, -1.32 * u); c.lineTo(0.2 * u, -0.86 * u); c.lineTo(0.29 * u, -0.87 * u); c.closePath(); c.fill();
    c.fillStyle = skin; ell(-0.245 * u, -0.82 * u, 0.042 * u, 0.05 * u); c.fill(); ell(0.245 * u, -0.82 * u, 0.042 * u, 0.05 * u); c.fill();
    // tułów
    c.fillStyle = coatG;
    c.beginPath(); c.moveTo(-0.07 * u, -1.49 * u); c.quadraticCurveTo(-0.22 * u, -1.48 * u, -0.235 * u, -1.38 * u);
    c.lineTo(-0.19 * u, -1.02 * u); c.lineTo(-0.21 * u, hem); c.lineTo(0.21 * u, hem); c.lineTo(0.19 * u, -1.02 * u);
    c.lineTo(0.235 * u, -1.38 * u); c.quadraticCurveTo(0.22 * u, -1.48 * u, 0.07 * u, -1.49 * u); c.closePath(); c.fill();
    if (!back) {
      c.strokeStyle = col(o.coat, 0.6); c.lineWidth = 0.012 * u;
      c.beginPath(); c.moveTo(0, -1.42 * u); c.lineTo(0, hem); c.stroke();
      c.fillStyle = col(o.coat, 0.6); for (let i = 0; i < 3; i++) { ell(0.03 * u, (-1.25 + i * 0.13) * u, 0.01 * u, 0.01 * u); c.fill(); }
    }
    if (o.scarf) { c.fillStyle = col(o.scarf); rrect(-0.1 * u, -1.52 * u, 0.2 * u, 0.09 * u, 0.03 * u); c.fill(); if (!back) c.fillRect(0.02 * u, -1.45 * u, 0.06 * u, 0.22 * u); }
    if (o.bag) {
      c.strokeStyle = col('#2a1d14'); c.lineWidth = 0.015 * u; c.beginPath(); c.moveTo(-0.15 * u, -1.46 * u); c.lineTo(0.24 * u, -1.0 * u); c.stroke();
      c.fillStyle = col(o.bag); rrect(0.2 * u, -1.05 * u, 0.15 * u, 0.2 * u, 0.02 * u); c.fill();
    }
    if (o.backpack && back) { c.fillStyle = col(o.backpack); rrect(-0.16 * u, -1.42 * u, 0.32 * u, 0.42 * u, 0.06 * u); c.fill(); }
    // szyja i głowa
    c.fillStyle = skin; c.fillRect(-0.04 * u, -1.56 * u, 0.08 * u, 0.09 * u);
    ell(0, -1.65 * u, 0.085 * u, 0.108 * u); c.fill();
    c.fillStyle = hair;
    if (back) { ell(0, -1.665 * u, 0.09 * u, 0.105 * u); c.fill(); if (o.hairLong) { rrect(-0.095 * u, -1.68 * u, 0.19 * u, 0.3 * u, 0.06 * u); c.fill(); } }
    else {
      c.beginPath(); c.ellipse(0, -1.67 * u, 0.092 * u, 0.098 * u, 0, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill();
      if (k * u > 60) {   // rysy twarzy widoczne z bliska
        c.fillStyle = col('#3a2a22'); ell(-0.03 * u, -1.645 * u, 0.008 * u, 0.008 * u); c.fill(); ell(0.03 * u, -1.645 * u, 0.008 * u, 0.008 * u); c.fill();
        c.strokeStyle = col('#a8665a'); c.lineWidth = 0.006 * u; c.beginPath(); c.arc(0, -1.62 * u, 0.025 * u, 0.3, Math.PI - 0.3); c.stroke();
      }
    }
    if (o.hat) { c.fillStyle = col(o.hat); ell(0, -1.735 * u, 0.13 * u, 0.025 * u); c.fill(); rrect(-0.08 * u, -1.83 * u, 0.16 * u, 0.1 * u, 0.03 * u); c.fill(); }
    if (o.cap) { c.fillStyle = col(o.cap); c.beginPath(); c.ellipse(0, -1.69 * u, 0.095 * u, 0.09 * u, 0, Math.PI, 0); c.fill(); }
    if (o.cane) { c.strokeStyle = col('#3b2a1c'); c.lineWidth = 0.025; c.beginPath(); c.moveTo(0.26 * u, -0.84 * u); c.lineTo(0.33 * u, 0); c.stroke(); }
    if (o.cup) { c.fillStyle = col('#f2ede4'); c.fillRect(0.22 * u, -0.92 * u, 0.06 * u, 0.09 * u); c.fillStyle = col('#7a4a2a'); c.fillRect(0.22 * u, -0.89 * u, 0.06 * u, 0.03 * u); }
    if (o.phoneGlow && NIGHT) { c.fillStyle = '#cfe6ff'; c.fillRect(-0.27 * u, -0.92 * u, 0.05 * u, 0.08 * u); }
  }
  function person(X, Z, o) {
    return {
      z: Z,
      shadow() { shadowBox(X - 0.2 * o.h / 1.75, X + 0.2 * o.h / 1.75, Z - 0.1, Z + 0.1, o.h, 0.28); },
      draw() { M(Z, o.name || 'Przechodzień'); local(X, 0, Z, k => drawPersonLocal(o, k)); }
    };
  }

  /* =====================================================================
     WIATA PRZYSTANKOWA Z ROZKŁADEM JAZDY
     ===================================================================== */
  function timetable(x0, y0, w, h) {
    // x0,y0 – lewy górny róg w px; w,h w px
    c.fillStyle = NIGHT ? '#d9dccf' : '#fbfaf3'; c.fillRect(x0, y0, w, h);
    const s = w / 154;   // 154 px przy 1600
    c.fillStyle = '#f6c700'; c.fillRect(x0, y0, w, 30 * s);
    c.fillStyle = '#c4161c'; c.fillRect(x0 + w - 34 * s, y0 + 3 * s, 30 * s, 24 * s);
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.fillStyle = '#111'; c.font = `bold ${12.5 * s}px Arial`; c.fillText('Plac Kwiatowy', x0 + 4 * s, y0 + 13 * s);
    c.font = `${9.5 * s}px Arial`; c.fillText('przystanek 01 →', x0 + 4 * s, y0 + 25 * s);
    c.fillStyle = '#fff'; c.font = `bold ${17 * s}px Arial`; c.textAlign = 'center'; c.fillText('17', x0 + w - 19 * s, y0 + 22 * s);
    c.textAlign = 'left'; c.fillStyle = '#111'; c.font = `bold ${10 * s}px Arial`;
    c.fillText('Kierunek: DWORZEC PKP', x0 + 4 * s, y0 + 42 * s);
    c.fillStyle = '#ddd'; c.fillRect(x0 + 2 * s, y0 + 46 * s, w - 4 * s, 11 * s);
    c.fillStyle = '#222'; c.font = `bold ${8.6 * s}px Arial`;
    c.fillText('godz.', x0 + 4 * s, y0 + 54.5 * s); c.fillText('Dni robocze', x0 + 28 * s, y0 + 54.5 * s);
    c.fillText('Sob.', x0 + 98 * s, y0 + 54.5 * s); c.fillText('Niedz.', x0 + 124 * s, y0 + 54.5 * s);
    const rows = [[5, '12 32 52', '40', '—'], [6, '07 22 37 52', '10 40', '20'], [7, '04 16 28 40 52', '10 40', '20'], [8, '04 16 28 40 52', '10 40', '20'],
      [9, '10 30 50', '10 40', '20 50'], [10, '10 30 50', '10 40', '20 50'], [11, '10 30 50', '10 40', '20 50'], [12, '10 30 50', '10 40', '20 50'],
      [13, '08 23 38 53', '10 40', '20 50'], [14, '05 17 29 41 53', '10 40', '20 50'], [15, '05 17 29 41 53', '10 40', '20 50'], [16, '05 17 29 41 53', '10 40', '20 50'],
      [17, '05 17 29 41 53', '10 40', '20'], [18, '10 30 50', '10 40', '20'], [19, '10 40', '10 40', '20'], [20, '10 40', '25', '20'], [21, '15 50', '25', '20'], [22, '30', '25', '—']];
    const rh = (h - 72 * s) / rows.length;
    rows.forEach((rw, i) => {
      const y = y0 + 60 * s + i * rh;
      if (i % 2) { c.fillStyle = 'rgba(0,0,0,0.05)'; c.fillRect(x0 + 2 * s, y, w - 4 * s, rh); }
      c.fillStyle = '#111'; c.font = `bold ${9 * s}px Arial`; c.fillText(String(rw[0]), x0 + 6 * s, y + rh * 0.82);
      c.font = `${8.4 * s}px Arial`; c.fillText(rw[1], x0 + 28 * s, y + rh * 0.82); c.fillText(rw[2], x0 + 98 * s, y + rh * 0.82); c.fillText(rw[3], x0 + 124 * s, y + rh * 0.82);
    });
    c.fillStyle = '#444'; c.font = `${6.2 * s}px Arial`;
    c.fillText('Czas przejazdu do Dworca PKP: 12 min. Rozkład ważny od 1.09.', x0 + 3 * s, y0 + h - 4 * s);
    c.strokeStyle = '#999'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x0 + 25 * s, y0 + 46 * s); c.lineTo(x0 + 25 * s, y0 + h - 12 * s);
    c.moveTo(x0 + 95 * s, y0 + 46 * s); c.lineTo(x0 + 95 * s, y0 + h - 12 * s); c.moveTo(x0 + 121 * s, y0 + 46 * s); c.lineTo(x0 + 121 * s, y0 + h - 12 * s); c.stroke();
  }

  function shelterParts() {
    const xa = -2.35, xb = -0.85, za = 6.5, zb = 11.0, yr = 2.55, nm = 'Wiata przystankowa';
    const frameC = () => col('#3c4046');
    const glass = (pts) => P.decor(() => {
      fillP(pts, NIGHT ? 'rgba(120,150,170,0.12)' : 'rgba(190,220,232,0.22)');
      c.strokeStyle = NIGHT ? 'rgba(160,180,200,0.15)' : 'rgba(255,255,255,0.35)'; c.lineWidth = 2; path(pts); c.stroke();
    });
    const post = (X, Z) => { M(Z, nm); fillP(frontQ(X - 0.05, X + 0.05, 0, yr, Z), frameC()); };
    const far = {
      z: zb + 0.01, draw() {
        // reklama na dalszej ścianie (podświetlana)
        M(zb, 'Plakat „Festiwal Kwiatów”', NIGHT ? 0.12 : 0);
        local(-2.2, 0, zb, k => {
          const g = c.createLinearGradient(0, -2.2, 0, -0.6);
          g.addColorStop(0, NIGHT ? '#ffd2e8' : '#ff8fb8'); g.addColorStop(1, NIGHT ? '#ffe9b0' : '#ffd166');
          c.fillStyle = g; c.fillRect(0, -2.2, 1.15, 1.6);
          for (const [x, y, cc] of [[0.3, -1.25, '#e0315a'], [0.62, -1.45, '#c04ad0'], [0.85, -1.15, '#f5a623']]) {
            c.fillStyle = cc; for (let i = 0; i < 6; i++) { ell(x + Math.cos(i) * 0.08, y + Math.sin(i) * 0.08, 0.06, 0.06); c.fill(); }
            c.fillStyle = '#ffe14d'; ell(x, y, 0.045, 0.045); c.fill();
          }
          ltext('FESTIWAL', 0.575, -1.95, 0.14, k, 'bold # Arial', '#5b1236', 'center');
          ltext('KWIATÓW', 0.575, -1.78, 0.14, k, 'bold # Arial', '#5b1236', 'center');
          ltext('12–14 IX · Rynek', 0.575, -0.72, 0.075, k, '# Arial', '#5b1236', 'center');
        });
        glass(frontQ(xa, xb, 0.12, yr - 0.1, zb));
        post(xa, zb); post(xb, zb);
        // tylna ściana (szkło) z ramą
        glass(wallQ(xa, za, zb, 0.12, yr - 0.1));
        MW(xa, nm); fillP(wallQ(xa, za, zb, 0.06, 0.14), frameC()); fillP(wallQ(xa, za, zb, yr - 0.14, yr - 0.06), frameC());
        // ławka
        M(8.8, 'Ławka na przystanku');
        fillP(flatQ(xa + 0.05, xa + 0.45, 7.4, 10.3, 0.46), col('#9a6a3e'));
        fillP(frontQ(xa + 0.05, xa + 0.45, 0.4, 0.46, 7.4), col('#6f4a2a'));
        fillP(frontQ(xa + 0.2, xa + 0.28, 0, 0.4, 7.5), frameC());
      }
    };
    const near = {
      z: za, draw() {
        post(xa, za); post(xb, za);
        // dach: spód, krawędź boczna i czołowa
        // dach ze szkła: szyba tylko na kolorze, rama z głębią
        P.decor(() => fillP(flatQ(xa - 0.12, xb + 0.2, za - 0.12, zb + 0.12, yr), NIGHT ? 'rgba(90,110,150,0.22)' : 'rgba(205,228,238,0.3)'));
        MH(yr, nm);
        c.strokeStyle = col('#3c4046');
        for (const z of [za - 0.12, za + 1.5, za + 3.0, zb + 0.12]) { c.lineWidth = Math.max(1, 0.045 * K(z)); c.beginPath(); const a = G(xa - 0.12, yr, z), b = G(xb + 0.2, yr, z); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
        c.lineWidth = 2; c.beginPath(); { const a = G(xa - 0.12, yr, za - 0.12), b = G(xa - 0.12, yr, zb + 0.12); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } c.stroke();
        if (NIGHT) { M(za + 2, nm, 0.4); fillP(flatQ(xa + 0.6, xa + 0.75, za + 0.3, zb - 0.3, yr - 0.01), '#e8f4ff'); const p = G(xa + 0.7, yr, (za + zb) / 2); glow(p[0], p[1] + 20, 120, '200,225,255', 0.25); }
        MW(xb + 0.2, nm); fillP(wallQ(xb + 0.2, za - 0.12, zb + 0.12, yr, yr + 0.08), col('#4a4f56'));
        M(za - 0.12, nm); fillP(frontQ(xa - 0.12, xb + 0.2, yr, yr + 0.08, za - 0.12), col('#555b62'));
        // przednia ściana: szkło + rama + rozkład jazdy
        glass(frontQ(xa, xb, 0.12, yr - 0.1, za));
        M(za, nm); fillP(frontQ(xa, xb, 0.06, 0.13, za), frameC()); fillP(frontQ(xa, xb, yr - 0.13, yr - 0.06, za), frameC());
        M(za, 'Rozkład jazdy', NIGHT ? 0.06 : 0);
        const q = frontQ(-2.18, -1.36, 1.0, 2.05, za);
        fillP(frontQ(-2.21, -1.33, 0.97, 2.08, za), '#2a2d31');
        const x0 = q[3][0], y0 = q[3][1], w = q[1][0] - q[0][0], h = q[0][1] - q[3][1];
        timetable(x0, y0, w, h);
        P.decor(() => { c.fillStyle = NIGHT ? 'rgba(200,220,255,0.06)' : 'rgba(255,255,255,0.1)'; path([[x0, y0], [x0 + w * 0.3, y0], [x0 + w * 0.05, y0 + h], [x0, y0 + h]]); c.fill(); });
      }
    };
    return [far, near];
  }

  /* =====================================================================
     STRAGAN Z OWOCAMI, MARKIZA, KWIATY
     ===================================================================== */
  const FRUIT = {
    'Jabłka czerwone': { c: ['#e53a2f', '#a81b1b'], r: 0.04, kind: 'apple' },
    'Jabłka zielone': { c: ['#a6d651', '#5f9a26'], r: 0.04, kind: 'apple' },
    'Pomidory': { c: ['#ff4a32', '#c21d12'], r: 0.037, kind: 'tomato' },
    'Cytryny': { c: ['#fff066', '#e2c21b'], r: 0.033, kind: 'lemon' },
    'Pomarańcze': { c: ['#ffae3b', '#e2731a'], r: 0.04, kind: 'apple' },
    'Śliwki': { c: ['#6c4a8e', '#3a2350'], r: 0.025, kind: 'plum' },
    'Ogórki': { c: ['#5aa54a', '#2d6b2a'], r: 0.03, kind: 'cuke' },
    'Papryka': { c: ['#ffd23a', '#e8a514'], r: 0.04, kind: 'apple' },
  };
  const PRICES = { 'Jabłka czerwone': '4,49', 'Jabłka zielone': '3,99', 'Pomidory': '8,99', 'Cytryny': '6,49', 'Pomarańcze': '5,99', 'Śliwki': '7,49', 'Ogórki': '5,49', 'Papryka': '9,99' };

  function crate(x0, x1, z0, z1, yt, fname, r) {
    const f = FRUIT[fname], zm = (z0 + z1) / 2;
    return {
      z: z0, draw() {
        M(zm, 'Skrzynki na straganie');
        // bok (widoczny z prawej) i przód skrzynki
        fillP(wallQ(x1, z0, z1, yt - 0.2, yt), col('#a87444', 0.8));
        fillP(frontQ(x0, x1, yt - 0.2, yt, z0), col('#c99158'));
        P.decor(() => {
          c.strokeStyle = 'rgba(90,55,25,0.55)'; c.lineWidth = 1;
          for (const yy of [yt - 0.135, yt - 0.07]) { const a = G(x0, yy, z0), b = G(x1, yy, z0); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
        });
        fillP(flatQ(x0 + 0.02, x1 - 0.02, z0 + 0.02, z1 - 0.02, yt - 0.02), col(f.c[1], 0.5));
        // owoce od najdalszych
        M(zm, fname);
        const pts = [], d = f.r * 2.05;
        for (let z = z1 - f.r; z > z0 + f.r * 0.6; z -= d * 0.82) for (let x = x0 + f.r + 0.01; x < x1 - f.r * 0.6; x += d) pts.push([x + (r() - 0.5) * f.r * 0.5, z, yt + r() * 0.03 + 0.01]);
        // druga warstwa – kopczyk
        for (let z = z1 - f.r * 2.5; z > z0 + f.r * 2; z -= d * 1.1) for (let x = x0 + f.r * 2.2; x < x1 - f.r * 2; x += d * 1.1) pts.push([x + (r() - 0.5) * f.r, z - 0.01, yt + f.r * 1.2 + r() * 0.02]);
        pts.sort((a, b) => b[1] - a[1] || a[2] - b[2]);
        for (const p of pts) {
          const q = G(p[0], p[2], p[1]), rad = f.r * K(p[1]);
          const g = c.createRadialGradient(q[0] + rad * 0.35, q[1] - rad * 0.4, rad * 0.1, q[0], q[1], rad * 1.05);
          const nk = NIGHT ? 2.6 : 1;
          g.addColorStop(0, col(f.c[0], 1.15 * nk)); g.addColorStop(0.7, col(f.c[0], nk)); g.addColorStop(1, col(f.c[1], nk));
          c.fillStyle = g;
          if (f.kind === 'lemon') { c.beginPath(); c.ellipse(q[0], q[1], rad * 1.25, rad * 0.9, 0.2, 0, 7); }
          else if (f.kind === 'cuke') { c.beginPath(); c.ellipse(q[0], q[1], rad * 0.9, rad * 2.2, 1.3 + r() * 0.4, 0, 7); }
          else ell(q[0], q[1], rad, rad * 0.95);
          c.fill();
          if (f.kind === 'tomato') { c.fillStyle = col('#2f7a22'); c.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 1.256; c.moveTo(q[0], q[1] - rad * 0.75); c.lineTo(q[0] + Math.cos(a) * rad * 0.35, q[1] - rad * 0.75 + Math.sin(a) * rad * 0.2); } c.lineWidth = Math.max(0.8, rad * 0.12); c.strokeStyle = col('#2f7a22'); c.stroke(); }
          if (f.kind === 'apple' && fname.startsWith('Jabłka')) { c.strokeStyle = col('#4a2f1a'); c.lineWidth = Math.max(0.7, rad * 0.1); c.beginPath(); c.moveTo(q[0], q[1] - rad * 0.6); c.lineTo(q[0] + rad * 0.15, q[1] - rad * 0.95); c.stroke(); }
        }
        // kartka z ceną na patyczku
        const cz = z0 + 0.03, cx = x0 + 0.05;
        M(cz, 'Cennik na straganie');
        local(cx, yt, cz, k => {
          c.fillStyle = col('#7a5a3a'); c.fillRect(0.06, -0.12, 0.008, 0.14);
          c.fillStyle = col('#fffdf0'); c.fillRect(0, -0.215, 0.165, 0.1);
          c.strokeStyle = col('#c0392b'); c.lineWidth = 0.004; c.strokeRect(0.004, -0.211, 0.157, 0.092);
          const short = fname.replace('Jabłka czerwone', 'Jabłka czerw.').replace('Jabłka zielone', 'Jabłka ziel.');
          ltext(short, 0.0825, -0.178, 0.026, k, 'bold # Arial', '#1b1b1b', 'center');
          ltext(PRICES[fname] + ' zł/kg', 0.0825, -0.134, 0.032, k, 'bold # Arial', col('#c0392b'), 'center');
        });
      }
    };
  }

  function fruitStand() {
    const r = mulberry32(55), objs = [];
    const cols = [[-2.42, -1.77], [-1.72, -1.07]];
    const rows = [[3.55, 4.05], [4.12, 4.62], [4.69, 5.19], [5.26, 5.76]];
    const names = [['Jabłka zielone', 'Jabłka czerwone'], ['Cytryny', 'Pomidory'], ['Pomarańcze', 'Papryka'], ['Ogórki', 'Śliwki']];
    rows.forEach((rw, i) => cols.forEach((cc, j) => objs.push(crate(cc[0], cc[1], rw[0], rw[1], 0.72 + i * 0.075, names[i][j], r))));
    // stół (pod skrzynkami) – rysowany przed nimi
    objs.push({
      z: 5.9, shadow() { shadowBox(-2.45, -1.05, 3.5, 5.8, 1.0, 0.3); },
      draw() {
        M(4.6, 'Stragan z owocami');
        fillP(wallQ(-1.05, 3.5, 5.85, 0, 0.62), col('#3d7a3a', 0.8));
        P.decor(() => { for (let z = 3.5; z < 5.85; z += 0.3) { fillP(wallQ(-1.049, z, z + 0.15, 0, 0.62), 'rgba(255,255,255,0.18)'); } });
      }
    });
    if (NIGHT) objs.push({ z: 3.3, draw() { const p = G(-1.6, 1.0, 4.6); glow(p[0], p[1], 380, '255,180,100', 0.22, 0.3); } });
    objs.push({
      z: 3.49, draw() {
        M(3.5, 'Stragan z owocami');
        fillP(frontQ(-2.45, -1.05, 0, 0.64, 3.5), col('#3d7a3a'));
        P.decor(() => { for (let x = -2.45; x < -1.05; x += 0.2) fillP(frontQ(x, x + 0.1, 0, 0.64, 3.5), 'rgba(255,255,255,0.2)'); });
        M(3.5, 'Stragan z owocami');
        fillP(frontQ(-2.47, -1.03, 0.58, 0.66, 3.49), col('#6b4a2e'));
      }
    });
    return objs;
  }

  function awning() {
    const z0 = 1.2, z1 = 7.0, xw = XL, xe = -1.2, yw = 3.45, ye = 2.95;
    return {
      z: z0, draw() {
        MH(3.2, 'Markiza warzywniaka');
        for (let z = z0, i = 0; z < z1; z += 0.45, i++) {
          const zz = Math.min(z1, z + 0.45);
          fillP([G(xw, yw, z), G(xe, ye, z), G(xe, ye, zz), G(xw, yw, zz)], i % 2 ? col('#f3f0e6', 0.72) : col('#2f8a45', 0.72));
        }
        // falbana z napisem
        MW(xe, 'Markiza warzywniaka');
        for (let z = z0, i = 0; z < z1; z += 0.45, i++) {
          const zz = Math.min(z1, z + 0.45), zm = (z + zz) / 2;
          path([G(xe, ye, z), G(xe, ye, zz), G(xe, ye - 0.25, zz), G(xe, ye - 0.31, zm), G(xe, ye - 0.25, z)]);
          c.fillStyle = i % 2 ? col('#f6f3ea', 0.95) : col('#2f8a45', 0.95); c.fill();
        }
        fillP(wallQ(xe + 0.002, 5.3, 6.95, ye - 0.235, ye - 0.015), col('#1f5e30'));
        wallText('ŚWIEŻE', xe + 0.005, 6.15, ye - 0.2, 0.15, col('#fff4c8', NIGHT ? 1.6 : 1), { maxL: 1.4 });
        // girlanda żarówek pod falbaną
        c.strokeStyle = col('#222222'); c.lineWidth = 1; c.beginPath();
        for (let z = 2.0; z <= 7.0; z += 0.05) { const p = G(xe + 0.03, ye - 0.36 - 0.05 * Math.abs(Math.sin((z - 2) * Math.PI / 0.5)), z); if (z === 2.0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); }
        c.stroke();
        for (let z = 2.25; z < 7.0; z += 0.5) {
          const p = G(xe + 0.03, ye - 0.42, z), rr = Math.max(1.5, 0.024 * K(z));
          M(z, 'Girlanda żarówek', NIGHT ? 1 : 0);
          c.fillStyle = NIGHT ? '#fff2c8' : col('#f4f1e4'); ell(p[0], p[1], rr * 0.85, rr); c.fill();
          if (NIGHT) glow(p[0], p[1], Math.max(14, 0.5 * K(z)), '255,200,120', 0.45);
        }
        if (!NIGHT) P.decor(() => {   // cień markizy na straganie i chodniku
          fillP(flatQ(-2.8, -1.6, 2.5, 7.3, 0), 'rgba(22,30,62,0.18)');
        });
      }
    };
  }

  function flowerBuckets() {
    const r = mulberry32(77), out = [];
    const colors = ['#e0315a', '#f5c623', '#ffffff', '#c04ad0', '#ff7a2a', '#e8303a'];
    for (let i = 0; i < 6; i++) {
      const X = -2.62 + (i % 2) * 0.36, Z = 11.4 + Math.floor(i / 2) * 0.55 + (i % 2) * 0.2, cc = colors[i];
      out.push({
        z: Z, draw() {
          M(Z, 'Kwiaty przed kwiaciarnią');
          local(X, 0, Z, () => {
            c.fillStyle = col('#9aa3aa'); c.beginPath(); c.moveTo(-0.14, -0.38); c.lineTo(0.14, -0.38); c.lineTo(0.11, 0); c.lineTo(-0.11, 0); c.closePath(); c.fill();
            c.fillStyle = col('#c3cad0'); c.fillRect(-0.14, -0.38, 0.28, 0.03);
            c.strokeStyle = col('#3f8a34'); c.lineWidth = 0.012; c.beginPath();
            const heads = [];
            for (let j = 0; j < 9; j++) { const x = (r() - 0.5) * 0.3, y = -0.55 - r() * 0.3; c.moveTo((r() - 0.5) * 0.1, -0.38); c.lineTo(x, y); heads.push([x, y]); }
            c.stroke();
            c.fillStyle = col('#3f8a34'); for (const h of heads) { ell(h[0] - 0.03, h[1] + 0.06, 0.04, 0.018); c.fill(); }
            for (const h of heads) { c.fillStyle = col(cc, NIGHT ? 1.6 : 1); ell(h[0], h[1], 0.045, 0.04); c.fill(); c.fillStyle = col(cc === '#ffffff' ? '#f5c623' : '#7a1030'); ell(h[0], h[1], 0.015, 0.015); c.fill(); }
          });
        }
      });
    }
    return out;
  }

  function trashBin(X, Z) {
    return {
      z: Z, shadow() { shadowBox(X - 0.2, X + 0.2, Z - 0.2, Z + 0.2, 0.95, 0.25); },
      draw() {
        M(Z, 'Kosz na śmieci');
        local(X, 0, Z, () => {
          c.fillStyle = col('#2f5d48'); rrect(-0.2, -0.92, 0.4, 0.86, 0.04); c.fill();
          c.fillStyle = col('#244a39'); c.fillRect(-0.22, -0.97, 0.44, 0.08);
          c.fillStyle = col('#1a1a1a'); c.fillRect(-0.12, -0.84, 0.24, 0.05);
          c.fillStyle = col('#3a3f45'); c.fillRect(-0.03, -0.06, 0.06, 0.06);
        });
      }
    };
  }

  /* szyldy prostopadłe do ściany (widoczne na wprost) */
  function bladeSign(Z, X0, X1, Y0, Y1, name, em, fn) {
    return {
      z: Z, lights: em > 0.3 ? [{ X: (X0 + X1) / 2, Y: (Y0 + Y1) / 2, Z, rgb: '40,255,110', size: 0.4, a: 0.7 }] : [],
      draw() {
        M(Z, name, em);
        c.strokeStyle = col('#2a2a2a'); c.lineWidth = Math.max(1, 0.04 * K(Z));
        const a = G(XL, Y1 + 0.08, Z), b = G(X1, Y1 + 0.08, Z); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
        local(X0, Y0, Z, k => fn(X1 - X0, Y1 - Y0, k));
      }
    };
  }
  function signs() {
    return [
      bladeSign(12.8, -2.72, -1.68, 3.0, 3.52, 'Kwiaciarnia', NIGHT ? 0.2 : 0, (w, h, k) => {
        c.fillStyle = NIGHT ? '#c0608a' : col('#a8436c'); rrect(0, -h, w, h, 0.05); c.fill();
        c.strokeStyle = NIGHT ? '#ffe0ee' : '#f6d6e4'; c.lineWidth = 0.025; rrect(0.03, -h + 0.03, w - 0.06, h - 0.06, 0.04); c.stroke();
        ltext('KWIACIARNIA', w / 2, -h * 0.45, 0.13, k, 'bold # Georgia', NIGHT ? '#fff4fa' : '#ffffff', 'center');
        ltext('kwiaty · wiązanki', w / 2, -h * 0.16, 0.07, k, 'italic # Georgia', NIGHT ? '#ffe0ee' : '#fbe3ee', 'center');
      }),
      bladeSign(17, -2.74, -1.96, 4.4, 5.12, 'Neon apteki (zielony krzyż)', NIGHT ? 0.5 : 0.3, (w, h, k) => {
        const cx = w / 2, cy = -h / 2, a = 0.36, t = 0.13;
        c.fillStyle = NIGHT ? '#46ff86' : '#21c45a';
        c.fillRect(cx - t, cy - a, 2 * t, 2 * a); c.fillRect(cx - a, cy - t, 2 * a, 2 * t);
        c.fillStyle = NIGHT ? '#d8ffe4' : '#7ef0a4';
        c.fillRect(cx - t * 0.4, cy - a * 0.85, t * 0.8, a * 1.7); c.fillRect(cx - a * 0.85, cy - t * 0.4, a * 1.7, t * 0.8);
        const p = [PX(-2.35, 17), PY(4.76, 17)];
        glow(p[0], p[1], NIGHT ? 120 : 40, '40,255,110', NIGHT ? 0.55 : 0.25);
      }),
      bladeSign(24, -2.76, -1.46, 3.02, 3.56, 'Piekarnia', NIGHT ? 0.15 : 0, (w, h, k) => {
        c.fillStyle = NIGHT ? '#8a5a30' : col('#7b4a25'); rrect(0, -h, w, h, 0.06); c.fill();
        ltext('PIEKARNIA', w / 2, -h * 0.42, 0.16, k, 'bold # Georgia', '#ffe7b0', 'center');
        ltext('chleb · bułki · drożdżówki', w / 2, -h * 0.13, 0.075, k, '# Arial', '#ffe7b0', 'center');
      }),
    ];
  }

  /* =====================================================================
     TELEFON W DŁONI (0,33 m)
     ===================================================================== */
  const PH = { x: 1392, y: 742, rot: -0.12 };
  function drawPhone() {
    const skin = NIGHT ? '#6a5a5a' : '#e8b493', skinD = NIGHT ? '#4e4040' : '#c98d6c';
    c.save(); c.translate(PH.x, PH.y); c.rotate(PH.rot);
    // palce za lewą krawędzią (opuszki wystają zza telefonu)
    M(0.35, 'Dłoń');
    for (const [y, l] of [[38, 30], [96, 34], [152, 30]]) {
      const g = c.createLinearGradient(-162 - l, 0, -150, 0); g.addColorStop(0, skinD); g.addColorStop(0.5, skin); g.addColorStop(1, skinD);
      c.fillStyle = g; rrect(-162 - l, y, l + 20, 52, 25); c.fill();
      P.decor(() => { c.strokeStyle = NIGHT ? 'rgba(30,20,20,0.5)' : 'rgba(150,90,70,0.45)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-162 - l * 0.45, y + 8); c.quadraticCurveTo(-162 - l * 0.6, y + 26, -162 - l * 0.45, y + 44); c.stroke(); });
    }
    // korpus telefonu
    M(0.33, 'Telefon w dłoni');
    c.fillStyle = '#1b1c20'; rrect(-162, -182, 324, 720, 46); c.fill();
    c.strokeStyle = '#6a6c73'; c.lineWidth = 3; rrect(-161, -181, 322, 718, 45); c.stroke();
    c.fillStyle = '#4a4c52'; c.fillRect(162, -80, 4, 70); c.fillRect(-166, -100, 4, 40);
    // ekran
    M(0.33, 'Telefon w dłoni', NIGHT ? 0.05 : 0);
    const bg = NIGHT ? '#0f1116' : '#f4f5f8', tx = NIGHT ? '#f1f2f5' : '#14161a', sub = NIGHT ? '#9aa0ab' : '#6b7280';
    c.fillStyle = bg; rrect(-150, -170, 300, 700, 36); c.fill();
    c.fillStyle = '#050506'; rrect(-42, -160, 84, 24, 12); c.fill();
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.fillStyle = tx; c.font = 'bold 16px Arial'; c.fillText(NIGHT ? '21:16' : '16:42', -124, -142);
    for (let i = 0; i < 4; i++) c.fillRect(70 + i * 6, -146 - i * 3, 4, 4 + i * 3);
    c.strokeStyle = tx; c.lineWidth = 1.5; rrect(100, -156, 26, 13, 3); c.stroke(); c.fillRect(102, -154, 17, 9); c.fillRect(127, -152, 2, 5);
    // powiadomienie
    c.fillStyle = NIGHT ? '#252830' : '#ffffff'; rrect(-142, -124, 284, 104, 20); c.fill();
    P.decor(() => { c.strokeStyle = 'rgba(0,0,0,0.08)'; c.lineWidth = 1; rrect(-142, -124, 284, 104, 20); c.stroke(); });
    c.fillStyle = '#ff7a1a'; rrect(-130, -112, 30, 30, 8); c.fill();
    c.fillStyle = '#fff'; rrect(-124, -106, 18, 16, 3); c.fill(); c.fillStyle = '#ff7a1a'; c.fillRect(-122, -104, 14, 6);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(-120, -88, 2.5, 0, 7); c.arc(-110, -88, 2.5, 0, 7); c.fill();
    c.fillStyle = sub; c.font = '11px Arial'; c.fillText('ROZKŁAD MPK', -92, -101); c.fillText('teraz', 102, -101);
    c.fillStyle = tx; c.font = 'bold 12.5px Arial'; c.fillText('Plac Kwiatowy (A)', -92, -86);
    c.font = 'bold 16px Arial'; c.fillText('Autobus 17 przyjedzie za 3 min', -130, -58);
    c.fillStyle = sub; c.font = '12px Arial'; c.fillText('Kierunek: Dworzec PKP · peron 2', -130, -40);
    c.font = '11px Arial'; c.fillText('Następny: 17:02 · linia 105 za 9 min', -130, -26);
    // rozmowa z Anią
    c.fillStyle = '#f39ab8'; c.beginPath(); c.arc(-124, 6, 15, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 15px Arial'; c.textAlign = 'center'; c.fillText('A', -124, 11); c.textAlign = 'left';
    c.fillStyle = tx; c.font = 'bold 15px Arial'; c.fillText('Ania', -102, 4);
    c.fillStyle = '#2bb14c'; c.beginPath(); c.arc(-62, -0.5, 4, 0, 7); c.fill();
    c.fillStyle = sub; c.font = '10.5px Arial'; c.fillText('aktywna teraz', -102, 18);
    c.fillStyle = NIGHT ? '#2a2d35' : '#dfe2e8'; c.fillRect(-150, 29, 300, 1);
    c.fillStyle = NIGHT ? '#262a33' : '#e7e9ee'; rrect(-140, 40, 218, 52, 16); c.fill();
    c.fillStyle = tx; c.font = '13.5px Arial'; c.fillText('Gdzie jesteś? Seans', -128, 61); c.fillText('zaczyna się o 17:30!', -128, 80);
    c.fillStyle = sub; c.font = '9.5px Arial'; c.fillText(NIGHT ? '21:09' : '16:38', 40, 86);
    c.fillStyle = '#2f7cf6'; rrect(-38, 100, 178, 52, 16); c.fill();
    c.fillStyle = '#fff'; c.font = '13.5px Arial'; c.fillText('Czekam na przystanku,', -26, 121); c.fillText('zaraz będę :)', -26, 140);
    c.fillStyle = NIGHT ? '#262a33' : '#e7e9ee'; rrect(-140, 160, 210, 52, 16); c.fill();
    c.fillStyle = tx; c.fillText('Kup po drodze jabłka', -128, 181); c.fillText('i cytryny, proszę', -128, 200);
    P.decor(() => {    // odblask na szkle
      const g = c.createLinearGradient(-150, -170, 150, 200);
      g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0.03)');
      c.fillStyle = g; rrect(-150, -170, 300, 700, 36); c.fill();
    });
    // dłoń z prawej i kciuk na ekranie
    M(0.36, 'Dłoń');
    const g = c.createLinearGradient(140, 0, 260, 0); g.addColorStop(0, skin); g.addColorStop(1, skinD);
    c.fillStyle = g;
    c.beginPath(); c.moveTo(150, 420); c.lineTo(150, 150); c.bezierCurveTo(152, 90, 185, 55, 240, 50); c.lineTo(300, 50); c.lineTo(300, 420); c.closePath(); c.fill();
    M(0.33, 'Dłoń');
    c.save(); c.translate(196, 170); c.rotate(-2.25);
    const gt = c.createLinearGradient(0, -28, 0, 28); gt.addColorStop(0, skinD); gt.addColorStop(0.45, skin); gt.addColorStop(1, skinD);
    c.fillStyle = gt; rrect(-30, -28, 168, 56, 28); c.fill();
    P.decor(() => {
      c.fillStyle = NIGHT ? 'rgba(210,190,190,0.35)' : 'rgba(255,228,216,0.9)'; rrect(96, -18, 38, 36, 15); c.fill();
      c.strokeStyle = NIGHT ? 'rgba(60,40,40,0.4)' : 'rgba(170,110,90,0.55)'; c.lineWidth = 1.2; rrect(96, -18, 38, 36, 15); c.stroke();
      c.beginPath(); c.moveTo(62, -24); c.quadraticCurveTo(68, 0, 62, 24); c.stroke();
      c.fillStyle = NIGHT ? 'rgba(0,0,0,0.25)' : 'rgba(120,60,40,0.18)'; rrect(-30, 10, 160, 18, 9); c.fill();
    });
    c.restore();
    // rękaw kurtki
    M(0.42, 'Dłoń');
    c.fillStyle = NIGHT ? '#1a2233' : '#3a5f8f';
    c.beginPath(); c.moveTo(190, 330); c.quadraticCurveTo(230, 250, 300, 230); c.lineTo(300, 420); c.lineTo(170, 420); c.closePath(); c.fill();
    P.decor(() => { c.strokeStyle = NIGHT ? 'rgba(0,0,0,0.4)' : 'rgba(20,40,70,0.5)'; c.lineWidth = 3; c.beginPath(); c.moveTo(196, 318); c.quadraticCurveTo(232, 262, 300, 242); c.stroke(); });
    if (NIGHT) P.decor(() => {     // poświata ekranu na dłoni
      c.save(); c.globalCompositeOperation = 'lighter';
      const gg = c.createRadialGradient(0, 100, 50, 0, 100, 330); gg.addColorStop(0, 'rgba(150,170,220,0.12)'); gg.addColorStop(1, 'rgba(150,170,220,0)');
      c.fillStyle = gg; c.fillRect(-330, -230, 660, 660); c.restore();
    });
    c.restore();
  }

  /* =====================================================================
     CIENIE (dzień) / ŚWIATŁA NA MOKRYM ASFALCIE (noc)
     ===================================================================== */
  function drawShadows(objs) {
    P.decor(() => {
      c.beginPath();
      for (const b of RIGHT) {
        const z0 = Math.max(3, b.z0), dz = SUN.dz * b.h, X = XRF + SUN.dx * b.h;
        const pts = [[XRF + 4, z0], [XRF, z0], [X, z0 + dz], [X, b.z1 + dz], [XRF + 4, b.z1 + dz]].map(p => G(p[0], 0, Math.min(p[1], ZEND + 10)));
        c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath();
      }
      c.fillStyle = 'rgba(28,38,80,0.3)'; c.fill();
    });
    for (const o of objs) if (o.shadow) o.shadow();
  }

  function drawNightGround(objs) {
    P.decor(() => {
      c.save(); c.globalCompositeOperation = 'lighter';
      // ogólny połysk mokrej jezdni (odbicie nieba)
      const sg = c.createLinearGradient(0, HZ, 0, HZ + 120);
      sg.addColorStop(0, 'rgba(70,80,130,0.35)'); sg.addColorStop(1, 'rgba(70,80,130,0)');
      fillP(flatQ(XC, XR, 8, ZEND, 0), sg);
      // światło z witryn na chodnikach
      const shopLight = (X, dir, s) => {
        const q = flatQ(X, X + dir * 2.6, Math.max(2, s.z0), s.z1, 0);
        const g = c.createLinearGradient(PX(X, (s.z0 + s.z1) / 2), 0, PX(X + dir * 2.6, (s.z0 + s.z1) / 2), 0);
        g.addColorStop(0, 'rgba(255,190,110,0.32)'); g.addColorStop(1, 'rgba(255,190,110,0)');
        fillP(q, g);
      };
      LEFT.forEach(b => b.shops.forEach(s => shopLight(XL, 1, s)));
      RIGHT.forEach(b => b.shops.forEach(s => shopLight(XRF, -1, s)));
      for (const o of objs) for (const L of (o.lights || [])) {
        if (L.Z > ZEND || L.X < XL || L.X > XRF) continue;
        if (L.pool) {
          const p = G(L.X, 0, L.Z), rx = L.pool * K(L.Z), ry = rx * EYE / L.Z;
          const g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], rx);
          g.addColorStop(0, 'rgba(255,190,110,0.3)'); g.addColorStop(1, 'rgba(255,190,110,0)');
          c.save(); c.translate(p[0], p[1]); c.scale(1, ry / rx); c.translate(-p[0], -p[1]);
          c.fillStyle = g; c.fillRect(p[0] - rx, p[1] - rx, 2 * rx, 2 * rx); c.restore();
        }
        // odbicie w mokrej nawierzchni: punkt lustrzany pod światłem
        const x = PX(L.X, L.Z), y0 = PY(0, L.Z), ym = PY(-L.Y, L.Z), wd = Math.max(2.5, L.size * K(L.Z) * 1.2);
        const len = (ym - y0) * 1.5;
        const g = c.createLinearGradient(0, y0, 0, y0 + len * 1.4);
        g.addColorStop(0, `rgba(${L.rgb},0)`); g.addColorStop(0.35, `rgba(${L.rgb},${0.38 * L.a})`); g.addColorStop(0.6, `rgba(${L.rgb},${0.2 * L.a})`); g.addColorStop(1, `rgba(${L.rgb},0)`);
        c.fillStyle = g; ell(x, y0 + len * 0.7, wd, len * 0.7); c.fill();
      }
      c.restore();
    });
  }

  /* =====================================================================
     SKŁADANIE SCENY
     ===================================================================== */
  function buildObjects() {
    const o = [];
    [26, 44, 62, 80].forEach(z => o.push(lamp(1.75, z, 1)));
    [35, 53, 71, 89].forEach(z => o.push(lamp(11.0, z, -1)));
    TREES_R.forEach((z, i) => o.push(tree(12.6, z, 900 + i * 31, 0.95 + (i % 3) * 0.06)));
    o.push(bus());
    o.push(car({ X0: 6.3, X1: 8.1, Z: 29, view: 'rear', color: '#2d5fa8' }));
    o.push(car({ X0: 6.0, X1: 7.8, Z: 55, view: 'rear', color: '#b8312f', brake: true }));
    o.push(car({ X0: 6.4, X1: 8.2, Z: 82, view: 'rear', color: '#e8e8e8' }));
    o.push(car({ X0: 2.9, X1: 4.7, Z: 58, view: 'front', color: '#444b55' }));
    o.push(car({ X0: 3.1, X1: 4.9, Z: 88, view: 'front', color: '#c7c9cc' }));
    o.push(car({ X0: 9.35, X1: 11.0, Z: 24, view: 'rear', color: '#f1c40f', taxi: true, parked: true, name: 'Taksówka' }));
    o.push(car({ X0: 9.35, X1: 11.0, Z: 38, view: 'rear', color: '#9aa3ad', parked: true }));
    o.push(car({ X0: 9.35, X1: 11.0, Z: 47.5, view: 'rear', color: '#2e5a46', parked: true }));
    o.push(signalCars(1.85, 17, 'g', true));
    o.push(signalCars(10.7, 62, 'r', false, 'Sygnalizator – czerwone (skrzyżowanie)'));
    o.push(stopSign());
    shelterParts().forEach(x => o.push(x));
    fruitStand().forEach(x => o.push(x));
    o.push(awning());
    flowerBuckets().forEach(x => o.push(x));
    signs().forEach(x => o.push(x));
    o.push(trashBin(1.2, 10.5));
    bollards(1.85, [11.6, 12.8, 14.0, 15.2]).forEach(x => o.push(x));
    o.push(cafe(13.5, 30.5, '#b03a2e'), cafe(13.5, 34, '#f2f2f2'), cafe(13.5, 37.5, '#b03a2e'));
    // ludzie
    o.push(person(-1.62, 9.3, { h: 1.66, coat: '#c0392b', long: true, pants: '#2b2b33', hair: '#5a3a22', hairLong: true, bag: '#3a2a1a', name: 'Kobieta w czerwonym płaszczu' }));
    o.push(person(0.35, 12.5, { h: 1.8, coat: '#34495e', pants: '#3b5b8a', hair: '#2a1d14', cup: true, scarf: '#d9a441', stride: 0.03, name: 'Mężczyzna z kawą' }));
    o.push(person(-0.95, 18.5, { h: 1.68, view: 'back', coat: '#e2a33a', long: true, pants: '#333333', hair: '#c49a5a', hairLong: true, name: 'Kobieta z dzieckiem' }));
    o.push(person(-0.45, 18.7, { h: 1.1, view: 'back', coat: '#3fa34d', pants: '#2f3d55', hair: '#6a4a2a', cap: '#e74c3c', backpack: '#f1c40f', name: 'Dziecko z plecakiem' }));
    o.push(person(0.95, 27, { h: 1.72, coat: '#7a6a55', long: true, pants: '#4a4a4a', hair: '#cccccc', hat: '#3b3b3b', cane: true, name: 'Starszy pan z laską' }));
    o.push(person(-1.7, 36.5, { h: 1.7, view: 'back', coat: '#5d6d7e', pants: '#222' }));
    o.push(person(0.3, 48, { h: 1.76, coat: '#8e44ad', pants: '#2c3e50', hair: '#111' }));
    o.push(person(-1.1, 63, { h: 1.65, coat: '#16a085', skirt: '#2c3e50', hair: '#7a4a2a', hairLong: true }));
    o.push(person(13.2, 32, { h: 1.7, coat: '#e67e22', pants: '#34495e', hair: '#3a2a1a' }));
    o.push(person(12.2, 45, { h: 1.62, view: 'back', coat: '#2980b9', pants: '#2c2c2c', hair: '#c9a46a', hairLong: true }));
    for (const [X, Z, cc] of [[-4, 118, '#c0392b'], [3.5, 132, '#2c3e50'], [11, 112, '#27ae60'], [-8, 150, '#8e44ad'], [1, 160, '#f39c12']]) o.push(person(X, Z, { h: 1.72, coat: cc, view: Z % 2 ? 'back' : 'front' }));
    return o;
  }

  function drawStreet(P_, W, H, night) {
    P = P_; c = P.ctx; NIGHT = !!night;
    c.save(); c.scale(W / VW, W / VW);
    c.lineJoin = 'round';
    drawSky(mulberry32(7));
    drawHills();
    drawGround(mulberry32(11));
    drawFarTown(mulberry32(13));
    const objs = buildObjects();
    if (NIGHT) drawNightGround(objs); else drawShadows(objs);
    drawFacades();
    objs.sort((a, b) => b.z - a.z).forEach(o => o.draw());
    // ciepłe popołudniowe światło / chłodny mrok
    P.decor(() => {
      const g = c.createRadialGradient(1500, 80, 50, 1300, 200, 1300);
      if (NIGHT) { g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(5,8,25,0.25)'); }
      else { g.addColorStop(0, 'rgba(255,214,150,0.16)'); g.addColorStop(1, 'rgba(255,214,150,0)'); }
      c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    });
    drawPhone();
    c.restore();
  }

  /* ---------- rejestracja ---------- */
  const uv = (x, y) => ({ u: +(x / VW).toFixed(3), v: +(y / VH).toFixed(3) });
  const phoneUV = (() => { const lx = -10, ly = -64, cs = Math.cos(PH.rot), sn = Math.sin(PH.rot); return uv(PH.x + lx * cs - ly * sn, PH.y + lx * sn + ly * cs); })();
  const P_TABLE = uv(PX(-1.77, 6.5), PY(1.55, 6.5));
  const P_FRUIT = uv(PX(-1.4, 4.4), PY(0.8, 4.4));
  const P_SIGNAL = uv(PX(1.58, 17), PY(2.42, 17));
  const P_BUS = uv(PX(3.85, 23), PY(2.82, 23));
  const P_CLOCK = uv(PX(3, 206), PY(27.6, 206));
  const P_LAMP = uv(PX(2.6, 26), PY(4.75, 26));
  const P_APTEKA = uv(PX(-2.35, 17), PY(4.76, 17));
  const basePois = [
    { u: phoneUV.u, v: phoneUV.v, label: 'Telefon w dłoni (0,33 m)' },
    { u: P_TABLE.u, v: P_TABLE.v, label: 'Rozkład jazdy (6,5 m)' },
    { u: P_FRUIT.u, v: P_FRUIT.v, label: 'Jabłka i pomidory (4,4 m)' },
    { u: P_SIGNAL.u, v: P_SIGNAL.v, label: 'Sygnalizator: zielone i czerwone (17 m)' },
    { u: P_BUS.u, v: P_BUS.v, label: 'Autobus „17 DWORZEC” (23 m)' },
    { u: P_CLOCK.u, v: P_CLOCK.v, label: 'Zegar na wieży ratusza (206 m)' },
  ];

  window.SCENES = window.SCENES || [];
  window.SCENES.push({
    id: 'ulica-dzien', name: 'Ulica w dzień', icon: '☀️',
    desc: 'Słoneczne popołudnie na ul. Kwiatowej: przeczytaj wiadomość w telefonie, rozkład jazdy, numer autobusu i zegar na wieży – i porównaj czerwone z zielonym na straganie i sygnalizatorze.',
    fovDeg: FOV, pupilMm: 3, night: false,
    defaultGaze: [P_BUS.u, P_BUS.v],
    pois: basePois.concat([{ u: P_APTEKA.u, v: P_APTEKA.v, label: 'Zielony krzyż apteki (17 m)' }]),
    draw(Pt, W, H) { drawStreet(Pt, W, H, false); }
  });
  window.SCENES.push({
    id: 'ulica-noc', name: 'Ulica nocą', icon: '🌙',
    desc: 'Mokra ulica po zmroku: latarnie, reflektory, neon apteki i sygnalizatory – zobacz, jak wady wzroku zamieniają światła w smugi, gwiazdki i poświaty.',
    fovDeg: FOV, pupilMm: 6, night: true,
    defaultGaze: [P_BUS.u, P_BUS.v],
    pois: basePois.concat([{ u: P_LAMP.u, v: P_LAMP.v, label: 'Latarnia (26 m)' }]),
    draw(Pt, W, H) { drawStreet(Pt, W, H, true); }
  });
})();
