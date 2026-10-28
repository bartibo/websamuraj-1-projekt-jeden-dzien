'use strict';
/* =====================================================================
   Gdzie mgła ma zęby – malarz scen (canvas 960×540)
   Każda scena to statyczne tło (rysowane raz, z ziarna) + warstwa żywa:
   mgła, ogień, dym, ogniki, postacie, światło pochodni, oczy w ciemności,
   falowanie obrazu przy niskim rozumie i czerwień przy wysokim znamieniu.
   ===================================================================== */

const Scene = (() => {
  const W = 960, H = 540;
  const TAU = Math.PI * 2;

  /* ---------- narzędzia ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  const hex = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const rgba = (h, a) => { const c = hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  /* ---------- palety pór dnia ---------- */
  const TOD = [
    { i: 0, sky: ['#2c3242', '#b39a96'], fog: '#bfb3b4', far: '#6c6d79', mid: '#363842', near: '#121318', ground: '#24262a', water: '#2a2d36' },
    { i: 1, sky: ['#56625f', '#bcc3b9'], fog: '#c9cec5', far: '#76817c', mid: '#39433f', near: '#121815', ground: '#262d28', water: '#2c3537' },
    { i: 2, sky: ['#1c1726', '#b0644a'], fog: '#8e6e70', far: '#4d3f4c', mid: '#271f28', near: '#0d0a0e', ground: '#1d1519', water: '#22171d' },
    { i: 3, sky: ['#020409', '#162131'], fog: '#34404f', far: '#18202b', mid: '#0c1119', near: '#030508', ground: '#0b0e13', water: '#0b1017' },
  ];
  const INNER = { i: 9, sky: ['#0e0b09', '#1d1712'], fog: '#3a3028', far: '#2b231c', mid: '#1c1712', near: '#0b0907', ground: '#120e0b', water: '#100c0a' };

  /* ---------- podstawowe kształty ---------- */
  function skyFill(c, P) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.sky[0]); g.addColorStop(1, P.sky[1]);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const glow = [[190, 290, 420, '255,196,170', 0.38], [620, 110, 520, '250,250,240', 0.28], [790, 320, 440, '255,140,70', 0.5], [760, 105, 230, '200,215,235', 0.16]][P.i];
    if (!glow) return;
    const [gx, gy, gr, gc, ga] = glow;
    const rg = c.createRadialGradient(gx, gy, 0, gx, gy, gr);
    rg.addColorStop(0, `rgba(${gc},${ga})`); rg.addColorStop(1, `rgba(${gc},0)`);
    c.fillStyle = rg; c.fillRect(0, 0, W, H);
    if (P.i === 3) {
      c.fillStyle = 'rgba(225,230,236,.85)'; c.beginPath(); c.arc(gx, gy, 22, 0, TAU); c.fill();
      c.fillStyle = 'rgba(160,170,185,.35)'; c.beginPath(); c.arc(gx - 6, gy - 4, 5, 0, TAU); c.arc(gx + 7, gy + 6, 4, 0, TAU); c.fill();
      for (let i = 0; i < 80; i++) { c.fillStyle = `rgba(220,226,236,${0.08 + Math.random() * 0.35})`; c.fillRect((i * 137.3) % W, (i * 71.7) % 260, 1.2, 1.2); }
    }
    if (P.i === 2) { c.fillStyle = 'rgba(255,170,110,.55)'; c.beginPath(); c.arc(gx, gy + 20, 30, 0, TAU); c.fill(); }
  }
  function groundFill(c, P, y) {
    const g = c.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, mix(P.ground, P.fog, 0.35)); g.addColorStop(0.35, P.ground); g.addColorStop(1, mix(P.ground, '#000000', 0.45));
    c.fillStyle = g; c.fillRect(0, y, W, H - y);
    band(c, y, 18, P.fog, 0.35);
  }
  function band(c, y, h, col, a) {
    const g = c.createLinearGradient(0, y - h, 0, y + h);
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(0.5, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.fillRect(0, y - h, W, h * 2);
  }
  function ridge(c, y, amp, col, R, step = 16) {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, H);
    const ph = R() * 10;
    for (let x = 0; x <= W + step; x += step) c.lineTo(x, y + Math.sin(x * 0.006 + ph) * amp + Math.sin(x * 0.021 + ph * 2) * amp * 0.35 + (R() - 0.5) * amp * 0.25);
    c.lineTo(W, H); c.closePath(); c.fill();
  }
  function pine(c, x, by, h, col, R) {
    const tiers = 7 + (R() * 5 | 0), w = h * (0.2 + R() * 0.08);
    const tw = [], th = [];
    for (let i = 0; i < tiers; i++) { const f = i / tiers; tw.push(w * (1 - f) * (0.8 + R() * 0.4)); th.push(by - h * 0.1 - f * h * 0.88); }
    const st = h * 0.88 / tiers;
    c.fillStyle = col; c.beginPath();
    c.moveTo(x - h * 0.014, by); c.lineTo(x - h * 0.014, by - h * 0.1);
    for (let i = 0; i < tiers; i++) { c.lineTo(x - tw[i], th[i] + st * 0.2); c.lineTo(x - tw[i] * 0.28, th[i] - st * 0.55); }
    c.lineTo(x, by - h);
    for (let i = tiers - 1; i >= 0; i--) { c.lineTo(x + tw[i] * 0.28, th[i] - st * 0.55); c.lineTo(x + tw[i] * (0.9 + R() * 0.2), th[i] + st * 0.2); }
    c.lineTo(x + h * 0.014, by - h * 0.1); c.lineTo(x + h * 0.014, by); c.closePath(); c.fill();
  }
  function bare(c, x, by, h, col, R, lw, depth = 6, lean = 0) {
    c.strokeStyle = col; c.lineCap = 'round';
    const br = (x1, y1, len, ang, w, d) => {
      const x2 = x1 + Math.cos(ang) * len, y2 = y1 + Math.sin(ang) * len;
      c.lineWidth = Math.max(0.6, w); c.beginPath(); c.moveTo(x1, y1);
      c.quadraticCurveTo(x1 + Math.cos(ang + 0.25) * len * 0.5, y1 + Math.sin(ang + 0.25) * len * 0.5, x2, y2); c.stroke();
      if (d <= 0 || len < 4) return;
      const n = 2 + (R() < 0.3 ? 1 : 0);
      for (let i = 0; i < n; i++) br(x2, y2, len * (0.6 + R() * 0.2), ang + (i - (n - 1) / 2) * (0.45 + R() * 0.4) + (R() - 0.5) * 0.35, w * 0.6, d - 1);
    };
    br(x, by, h * 0.36, -Math.PI / 2 + lean + (R() - 0.5) * 0.12, lw || h * 0.035, depth);
  }
  function birch(c, x, by, h, R, dark) {
    const w = h * 0.022;
    c.fillStyle = dark ? '#6d6c66' : '#cfcac0';
    c.beginPath(); c.moveTo(x - w, by); c.lineTo(x - w * 0.5, by - h); c.lineTo(x + w * 0.5, by - h); c.lineTo(x + w, by); c.fill();
    c.fillStyle = '#16171a';
    for (let y = by - 6; y > by - h; y -= 6 + R() * 14) { const len = w * (0.6 + R() * 1.2); c.fillRect(x - w + R() * w, y, len, 1.5 + R() * 2); }
    bare(c, x, by - h * 0.62, h * 0.7, dark ? '#4a4945' : '#8a867d', R, w * 0.6, 4);
  }
  function forest(c, R, o) {
    const n = o.n, kinds = o.kinds || ['pine'];
    const xs = [];
    for (let i = 0; i < n; i++) xs.push((i + R() * 0.9) / n * (W + 120) - 60);
    xs.sort(() => R() - 0.5);
    for (const x of xs) {
      if (o.skip && o.skip(x)) continue;
      const h = lerp(o.hmin, o.hmax, R()), y = o.y + (R() - 0.5) * (o.yj || 14);
      const k = kinds[(R() * kinds.length) | 0];
      if (k === 'pine') pine(c, x, y, h, o.col, R);
      else if (k === 'bare') bare(c, x, y, h, o.col, R, h * 0.03, o.depth || 5);
      else if (k === 'birch') birch(c, x, y, h, R, o.dark);
    }
  }
  function grass(c, R, y0, y1, col, n) {
    c.strokeStyle = col; c.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      const x = R() * W, y = lerp(y0, y1, R()), h = 4 + R() * 10 * (y / H);
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + (R() - 0.5) * 4, y - h * 0.6, x + (R() - 0.5) * 6, y - h); c.stroke();
    }
  }
  function skull(c, x, y, s, R, kind) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = '#a69d8a';
    if (kind === 'kon') {
      c.beginPath(); c.ellipse(0, 0, 7, 16, 0, 0, TAU); c.fill();
      c.fillStyle = '#1c1a17'; c.beginPath(); c.ellipse(-3.5, -7, 2, 2.6, 0, 0, TAU); c.ellipse(3.5, -7, 2, 2.6, 0, 0, TAU); c.fill();
      c.fillRect(-1.5, 8, 3, 5);
    } else if (kind === 'tur') {
      c.beginPath(); c.ellipse(0, 0, 9, 12, 0, 0, TAU); c.fill();
      c.strokeStyle = '#a69d8a'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-7, -8); c.quadraticCurveTo(-20, -12, -18, -26); c.moveTo(7, -8); c.quadraticCurveTo(20, -12, 18, -26); c.stroke();
      c.fillStyle = '#1c1a17'; c.beginPath(); c.ellipse(-4, -3, 2.4, 2.8, 0, 0, TAU); c.ellipse(4, -3, 2.4, 2.8, 0, 0, TAU); c.fill();
    } else {
      c.beginPath(); c.ellipse(0, -2, 8, 9, 0, 0, TAU); c.fill();
      c.fillRect(-5, 4, 10, 6);
      c.fillStyle = '#1c1a17'; c.beginPath(); c.ellipse(-3.2, -1, 2.3, 2.6, 0, 0, TAU); c.ellipse(3.2, -1, 2.3, 2.6, 0, 0, TAU); c.fill();
      c.fillRect(-1, 3, 2, 2);
      for (let i = -4; i < 5; i += 2) c.fillRect(i, 7, 1, 3);
    }
    c.restore();
  }
  function stone(c, x, by, w, h, col, lean, R) {
    c.fillStyle = col; c.beginPath();
    const top = by - h;
    c.moveTo(x - w / 2, by);
    c.lineTo(x - w * 0.5 + (R() - 0.5) * w * 0.15 + lean * 0.5, by - h * 0.55);
    c.lineTo(x - w * 0.32 + lean, top + (R() * h * 0.08));
    c.lineTo(x + w * 0.1 + lean, top - h * 0.03);
    c.lineTo(x + w * 0.38 + lean, top + h * 0.1 + R() * h * 0.05);
    c.lineTo(x + w * 0.5 + lean * 0.4, by - h * 0.5);
    c.lineTo(x + w / 2, by); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1;
    for (let i = 0; i < 3; i++) { c.beginPath(); const yy = by - h * (0.2 + R() * 0.6); c.moveTo(x - w * 0.3 + lean * 0.5, yy); c.lineTo(x + w * (R() * 0.3), yy + (R() - 0.5) * 8); c.stroke(); }
  }
  function mound(c, cx, by, rx, ry, col, R, top) {
    const pts = [];
    for (let i = 0; i <= 48; i++) { const a = Math.PI + i / 48 * Math.PI; pts.push([cx + Math.cos(a) * rx, by + Math.sin(a) * ry * (1 + Math.sin(i * 0.7) * 0.015)]); }
    const g = c.createLinearGradient(0, by - ry, 0, by);
    g.addColorStop(0, top ? mix(col, top, 0.22) : col); g.addColorStop(1, mix(col, '#000000', 0.35));
    c.fillStyle = g; c.beginPath(); c.moveTo(cx - rx, by); pts.forEach(p => c.lineTo(p[0], p[1])); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.moveTo(cx + rx * 0.1, by - ry); pts.slice(24).forEach(p => c.lineTo(p[0], p[1])); c.lineTo(cx + rx * 0.2, by); c.closePath(); c.fill();
    c.strokeStyle = mix(col, '#000000', 0.25); c.lineWidth = 1.2;
    for (let i = 0; i < pts.length; i += 1) { const [x, y] = pts[i]; for (let k = 0; k < 3; k++) { const xx = x + (R() - 0.5) * 8; c.beginPath(); c.moveTo(xx, y + 2); c.lineTo(xx + (R() - 0.5) * 6, y - 4 - R() * 7); c.stroke(); } }
  }
  function earthWall(c, R, col1, col2) {
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col1); g.addColorStop(1, col2);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 260; i++) {
      c.fillStyle = `rgba(${R() < 0.5 ? '0,0,0' : '120,100,80'},${0.04 + R() * 0.08})`;
      c.beginPath(); c.ellipse(R() * W, R() * H, 4 + R() * 26, 3 + R() * 12, R() * 3, 0, TAU); c.fill();
    }
  }
  function roots(c, R, n, col, y0 = 0, maxLen = 160) {
    c.strokeStyle = col; c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      let x = R() * W, y = y0 - 4, w = 1 + R() * 4, len = 30 + R() * maxLen;
      c.lineWidth = w; c.beginPath(); c.moveTo(x, y);
      const steps = 6;
      for (let k = 0; k < steps; k++) { x += (R() - 0.5) * 18; y += len / steps; c.lineTo(x, y); }
      c.stroke();
    }
  }
  function vaultArch(c, R, cx, cy, rx, ry, col) {
    c.save();
    c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, Math.PI, TAU); c.lineTo(cx + rx, H); c.lineTo(cx - rx, H); c.closePath(); c.fill();
    for (let a = Math.PI; a <= TAU + 0.01; a += 0.11 + R() * 0.05) {
      const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
      c.fillStyle = `rgba(${90 + R() * 40 | 0},${80 + R() * 30 | 0},${70 + R() * 20 | 0},.55)`;
      c.beginPath(); c.ellipse(x, y, 16 + R() * 10, 10 + R() * 6, a + Math.PI / 2, 0, TAU); c.fill();
    }
    c.restore();
  }

  /* =====================================================================
     SCENY: każda funkcja maluje tło i zwraca opis warstwy żywej
     ===================================================================== */
  const SC = {};

  SC.puszcza = (c, P, R) => {
    skyFill(c, P);
    ridge(c, 300, 14, mix(P.far, P.fog, 0.4), R);
    forest(c, R, { y: 312, n: 46, hmin: 70, hmax: 140, col: mix(P.far, P.fog, 0.25) });
    band(c, 310, 50, P.fog, 0.55);
    forest(c, R, { y: 372, n: 24, hmin: 150, hmax: 250, col: P.mid, kinds: ['pine', 'pine', 'bare'] });
    band(c, 372, 40, P.fog, 0.35);
    groundFill(c, P, 380);
    c.fillStyle = mix(P.ground, P.fog, 0.18);
    c.beginPath(); c.moveTo(430, 380); c.lineTo(520, 380); c.lineTo(760, H); c.lineTo(260, H); c.closePath(); c.fill();
    forest(c, R, { y: 560, n: 5, hmin: 480, hmax: 640, col: P.near, kinds: ['pine', 'bare'], skip: x => x > 220 && x < 740 });
    grass(c, R, 390, H, rgba(P.fog, 0.18), 220);
    return { gy: 470, fx: 620 };
  };

  SC.mgla = (c, P, R) => {
    const F2 = mix(P.fog, P.sky[1], 0.4);
    c.fillStyle = F2; c.fillRect(0, 0, W, H);
    forest(c, R, { y: 360, n: 18, hmin: 140, hmax: 260, col: mix(P.far, F2, 0.55), kinds: ['pine', 'bare'] });
    band(c, 330, 120, P.fog, 0.6);
    forest(c, R, { y: 420, n: 7, hmin: 260, hmax: 380, col: mix(P.mid, F2, 0.45), kinds: ['bare', 'pine'] });
    band(c, 420, 90, P.fog, 0.5);
    c.fillStyle = mix(P.ground, F2, 0.5); c.fillRect(0, 440, W, H - 440);
    return { gy: 480, fx: 560, fogBoost: 0.5 };
  };

  SC.osada = (c, P, R, ctx) => {
    skyFill(c, P);
    forest(c, R, { y: 300, n: 50, hmin: 70, hmax: 150, col: mix(P.far, P.fog, 0.3) });
    band(c, 300, 60, P.fog, 0.55);
    const dyn = { gy: 470, fx: 640, smokes: [], fires: [] };
    // dachy chat za częstokołem
    const roof = mix(P.mid, P.far, 0.3);
    for (let i = 0; i < 9; i++) {
      const x = 90 + i * 95 + (R() - 0.5) * 30, w = 70 + R() * 50, y = 360 - R() * 20;
      if (x > 410 && x < 550) continue;
      c.fillStyle = roof; c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x, y - 46 - R() * 18); c.lineTo(x + w / 2, y); c.fill();
      if (R() < 0.6) dyn.smokes.push({ x, y: y - 52 });
    }
    // chram
    c.fillStyle = roof; c.beginPath(); c.moveTo(690, 360); c.lineTo(760, 268); c.lineTo(830, 360); c.fill();
    c.strokeStyle = roof; c.lineWidth = 3; c.beginPath(); c.moveTo(760, 268); c.lineTo(748, 246); c.moveTo(760, 268); c.lineTo(772, 246); c.stroke();
    // częstokół
    const pal = mix(P.mid, P.near, 0.5);
    c.fillStyle = pal;
    for (let x = -10; x < W + 10; x += 13 + R() * 4) {
      if (x > 420 && x < 540) continue;
      const h = 70 + R() * 14 + (Math.abs(x - 480) < 300 ? 0 : -10);
      c.beginPath(); c.moveTo(x, 410); c.lineTo(x, 410 - h); c.lineTo(x + 6, 410 - h - 10); c.lineTo(x + 12, 410 - h); c.lineTo(x + 12, 410); c.fill();
    }
    // brama
    c.fillStyle = P.near;
    c.fillRect(410, 300, 16, 115); c.fillRect(534, 300, 16, 115); c.fillRect(400, 296, 160, 14);
    skull(c, 480, 288, 0.9, R, 'tur');
    dyn.fires.push({ x: 404, y: 330, s: 0.45, night: true }, { x: 556, y: 330, s: 0.45, night: true });
    band(c, 410, 26, P.fog, 0.3);
    groundFill(c, P, 410);
    c.fillStyle = mix(P.ground, P.fog, 0.15);
    c.beginPath(); c.moveTo(426, 410); c.lineTo(534, 410); c.lineTo(700, H); c.lineTo(300, H); c.fill();
    forest(c, R, { y: 560, n: 4, hmin: 500, hmax: 620, col: P.near, kinds: ['pine'], skip: x => x > 160 && x < 800 });
    grass(c, R, 415, H, rgba(P.fog, 0.15), 160);
    return dyn;
  };

  SC.chata = (c, P, R) => {
    c.fillStyle = '#1a120c'; c.fillRect(0, 0, W, H);
    for (let y = 0; y < 400; y += 30) {
      const g = c.createLinearGradient(0, y, 0, y + 30);
      g.addColorStop(0, '#3a2818'); g.addColorStop(0.5, '#2a1c11'); g.addColorStop(1, '#140d08');
      c.fillStyle = g; c.fillRect(0, y, W, 29);
      c.fillStyle = 'rgba(0,0,0,.35)';
      for (let x = 0; x < W; x += 120 + R() * 200) c.fillRect(x, y + 4, 2, 22);
    }
    c.fillStyle = '#100b07'; c.fillRect(0, 0, W, 34);
    c.fillStyle = '#24170e'; c.fillRect(0, 390, W, H - 390);
    // drzwi z mgłą
    c.fillStyle = '#5a5850'; c.fillRect(800, 170, 110, 220);
    const dg = c.createLinearGradient(800, 0, 910, 0); dg.addColorStop(0, 'rgba(200,200,190,.35)'); dg.addColorStop(1, 'rgba(120,120,110,.1)');
    c.fillStyle = dg; c.fillRect(800, 170, 110, 220);
    c.fillStyle = '#100b07'; c.fillRect(790, 160, 130, 12); c.fillRect(790, 160, 12, 232); c.fillRect(908, 160, 12, 232);
    // półki i garnki
    c.fillStyle = '#100b07'; c.fillRect(40, 200, 220, 8); c.fillRect(40, 280, 220, 8);
    for (let i = 0; i < 6; i++) { c.fillStyle = ['#4a3322', '#3b2a1e', '#5a4130'][i % 3]; const x = 60 + i * 34; c.beginPath(); c.ellipse(x, 190 - R() * 6, 11 + R() * 5, 14 + R() * 6, 0, 0, TAU); c.fill(); }
    for (let i = 0; i < 5; i++) { c.fillStyle = ['#3b2a1e', '#5a4130'][i % 2]; const x = 70 + i * 40; c.beginPath(); c.ellipse(x, 268 - R() * 4, 13, 12 + R() * 4, 0, 0, TAU); c.fill(); }
    // zioła
    c.strokeStyle = '#4a5236'; c.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const x = 300 + i * 34 + R() * 10, len = 40 + R() * 50;
      c.beginPath(); c.moveTo(x, 34); c.lineTo(x, 34 + len * 0.3); c.stroke();
      for (let k = 0; k < 7; k++) { c.beginPath(); c.moveTo(x, 34 + len * 0.3 + k * len * 0.1); c.lineTo(x + (R() - 0.5) * 18, 34 + len * 0.3 + k * len * 0.1 + 10); c.stroke(); }
    }
    // palenisko
    c.fillStyle = '#2b2520';
    for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; c.beginPath(); c.ellipse(480 + Math.cos(a) * 80, 470 + Math.sin(a) * 18 + 6, 16, 10, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#120c08'; c.beginPath(); c.ellipse(480, 474, 70, 14, 0, 0, TAU); c.fill();
    return { gy: 486, fx: 640, fires: [{ x: 480, y: 470, s: 1.3, warm: true }], interior: true };
  };

  SC.ognisko = (c, P, R) => {
    skyFill(c, TOD[3]);
    for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(220,225,235,${0.15 + R() * 0.5})`; c.fillRect(R() * W, R() * 230, 1.2, 1.2); }
    forest(c, R, { y: 290, n: 40, hmin: 70, hmax: 140, col: '#0e141c' });
    band(c, 290, 50, TOD[3].fog, 0.5);
    c.fillStyle = '#06080b';
    for (let i = 0; i < 6; i++) { const x = 80 + i * 170 + R() * 40, w = 110 + R() * 40, y = 400; c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x, y - 80 - R() * 20); c.lineTo(x + w / 2, y); c.fill(); c.fillRect(x - w * 0.4, y - 4, w * 0.8, 40); }
    c.fillStyle = '#06080b'; c.fillRect(0, 430, W, H - 430);
    return { gy: 480, fx: 640, fires: [{ x: 480, y: 470, s: 1.6, warm: true }], stars: true };
  };

  SC.skraj = (c, P, R) => {
    skyFill(c, P);
    forest(c, R, { y: 300, n: 40, hmin: 80, hmax: 150, col: mix(P.far, P.fog, 0.35) });
    // ściana mgły
    const g = c.createLinearGradient(0, 160, 0, 430);
    g.addColorStop(0, rgba(P.fog, 0)); g.addColorStop(0.35, rgba(P.fog, 0.92)); g.addColorStop(1, rgba(P.fog, 0.75));
    c.fillStyle = g; c.fillRect(0, 160, W, 270);
    groundFill(c, P, 400);
    c.fillStyle = mix(P.ground, P.fog, 0.2);
    c.beginPath(); c.moveTo(450, 400); c.lineTo(510, 400); c.lineTo(720, H); c.lineTo(240, H); c.fill();
    // pale z czaszkami w perspektywie
    const kinds = ['kon', 'tur', 'wilk', 'kon', 'wilk', 'tur', 'czlowiek', 'kon'];
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 7; i >= 0; i--) {
        const f = i / 7, s = lerp(3.2, 0.55, f), x = 480 + side * lerp(360, 70, f) + (R() - 0.5) * 10, by = lerp(610, 402, f);
        const ph = lerp(250, 40, f);
        c.fillStyle = mix(P.near, P.fog, f * 0.55);
        c.fillRect(x - 3 * s, by - ph, 6 * s, ph);
        const k = side < 0 && i === 2 ? 'czlowiek' : kinds[(i + (side > 0 ? 3 : 0)) % kinds.length];
        c.globalAlpha = 1 - f * 0.5;
        skull(c, x, by - ph - 6 * s, s * (k === 'czlowiek' ? 0.55 : 1), R, k === 'czlowiek' ? 'czlowiek' : k);
        c.globalAlpha = 1;
      }
    }
    grass(c, R, 405, H, rgba(P.fog, 0.15), 200);
    return { gy: 470, fx: 640, fogBoost: 0.3 };
  };

  SC.gaj = (c, P, R) => {
    skyFill(c, P);
    forest(c, R, { y: 300, n: 30, hmin: 120, hmax: 200, col: mix(P.far, P.fog, 0.3), kinds: ['bare', 'pine'], depth: 5 });
    band(c, 300, 70, P.fog, 0.55);
    forest(c, R, { y: 390, n: 9, hmin: 230, hmax: 330, col: P.mid, kinds: ['birch', 'bare'], dark: true, skip: x => x > 330 && x < 650 });
    groundFill(c, P, 395);
    // krąg kamieni wokół miejsca boga
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; c.fillStyle = mix(P.mid, P.fog, 0.15); c.beginPath(); c.ellipse(480 + Math.cos(a) * 170, 440 + Math.sin(a) * 34, 14, 8, 0, 0, TAU); c.fill(); }
    const idolUp = typeof F === 'function' && F('idol');
    const wood = '#3d3328';
    if (idolUp) {
      c.save(); c.translate(480, 440); c.rotate(-0.05);
      c.fillStyle = wood; c.fillRect(-22, -230, 44, 230);
      c.fillStyle = '#2b241c'; c.fillRect(-26, -244, 52, 18);
      c.strokeStyle = '#1c1712'; c.lineWidth = 2;
      for (let k = 0; k < 3; k++) { const y = -210 + k * 62; c.beginPath(); c.arc(-8, y, 3, 0, TAU); c.arc(8, y, 3, 0, TAU); c.moveTo(-8, y + 16); c.lineTo(8, y + 16); c.stroke(); }
      c.restore();
    } else {
      c.save(); c.translate(330, 470); c.rotate(-0.12);
      c.fillStyle = wood; c.fillRect(0, -22, 330, 44);
      c.fillStyle = '#2b241c'; c.fillRect(318, -26, 20, 52);
      c.strokeStyle = '#1c1712'; c.lineWidth = 2;
      for (let k = 0; k < 4; k++) { const x = 60 + k * 70; c.beginPath(); if (k === 3) { c.arc(x, -6, 3, 0, TAU); c.arc(x, 6, 3, 0, TAU); c.moveTo(x + 16, -8); c.lineTo(x + 16, 8); } else { for (let j = 0; j < 6; j++) { c.moveTo(x - 8 + R() * 16, -12 + R() * 24); c.lineTo(x - 8 + R() * 16, -12 + R() * 24); } } c.stroke(); }
      c.restore();
    }
    // ścięty dąb
    c.fillStyle = '#2b2219'; c.fillRect(690, 360, 90, 60);
    c.fillStyle = '#4a3a2a'; c.beginPath(); c.ellipse(735, 360, 46, 13, 0, 0, TAU); c.fill();
    c.strokeStyle = '#5e1d16'; c.lineWidth = 1.2;
    for (let r = 6; r < 44; r += 6) { c.beginPath(); c.ellipse(735, 360, r, r * 0.28, 0, 0, TAU); c.stroke(); }
    c.fillStyle = 'rgba(120,20,15,.75)'; c.beginPath(); c.moveTo(700, 364); c.quadraticCurveTo(704, 400, 698, 420); c.lineTo(712, 420); c.quadraticCurveTo(712, 390, 716, 364); c.fill();
    // ofiary
    for (let i = 0; i < 10; i++) { c.fillStyle = mix('#5a4636', P.ground, 0.4); c.beginPath(); c.ellipse(380 + R() * 260, 490 + R() * 30, 8 + R() * 6, 3, 0, 0, TAU); c.fill(); }
    forest(c, R, { y: 590, n: 3, hmin: 520, hmax: 620, col: P.near, kinds: ['bare'], skip: x => x > 150 && x < 830 });
    grass(c, R, 400, H, rgba(P.fog, 0.13), 180);
    const ribbon = !(typeof F === 'function' && F('wstazka_wzieta'));
    return { gy: 480, fx: 600, drips: [{ x: 705, y: 420 }], ribbon: ribbon ? { x: 222, y: 318 } : null };
  };

  SC.bagno = (c, P, R) => {
    skyFill(c, P);
    forest(c, R, { y: 300, n: 40, hmin: 70, hmax: 140, col: mix(P.far, P.fog, 0.35) });
    band(c, 300, 50, P.fog, 0.5);
    // woda
    const wy = 318;
    const wg = c.createLinearGradient(0, wy, 0, H); wg.addColorStop(0, mix(P.water, P.fog, 0.35)); wg.addColorStop(1, P.water);
    c.fillStyle = wg; c.fillRect(0, wy, W, H - wy);
    // odbicie
    const snap = mk(); snap.getContext('2d').drawImage(c.canvas, 0, 0);
    c.save(); c.globalAlpha = 0.28; c.translate(0, wy * 2); c.scale(1, -1); c.drawImage(snap, 0, wy - 160, W, 160, 0, wy - 160, W, 160); c.restore();
    c.fillStyle = rgba(P.water, 0.35); c.fillRect(0, wy, W, H - wy);
    for (let i = 0; i < 60; i++) { c.fillStyle = rgba(P.fog, 0.05 + R() * 0.08); c.fillRect(R() * W, wy + R() * (H - wy), 20 + R() * 80, 1); }
    // olchy w wodzie
    for (let i = 0; i < 6; i++) { const x = 60 + R() * 840; const y = wy + 10 + R() * 60; bare(c, x, y, 160 + R() * 140, mix(P.mid, P.fog, 0.2), R, 5, 5); }
    // kładka
    c.fillStyle = '#2a251e';
    for (let i = 0; i < 14; i++) {
      const f = i / 13, x = lerp(150, 560, f), y = lerp(H - 10, wy + 22, f), w = lerp(120, 30, f), h = lerp(16, 4, f);
      c.fillStyle = i % 2 ? '#2a251e' : '#322b22';
      c.beginPath(); c.ellipse(x, y, w, h, -0.12, 0, TAU); c.fill();
    }
    // topielec na wodzie
    if (!(typeof F === 'function' && F('topielec_done'))) {
      c.fillStyle = '#1c1d1c'; c.beginPath(); c.ellipse(650, 410, 46, 10, 0.06, 0, TAU); c.fill();
      c.beginPath(); c.ellipse(700, 412, 12, 8, 0, 0, TAU); c.fill();
      c.fillStyle = '#7b7a70'; c.beginPath(); c.ellipse(612, 418, 7, 3, 0, 0, TAU); c.ellipse(672, 421, 7, 3, 0, 0, TAU); c.fill();
      c.fillStyle = '#9a8a5a'; c.fillRect(640, 402, 6, 5);
    }
    // głowa w bagnie
    if (!(typeof F === 'function' && F('sul_done'))) {
      c.fillStyle = '#16120f'; c.beginPath(); c.ellipse(800, 360, 14, 16, 0, 0, TAU); c.fill();
      c.fillStyle = '#3d2a1c'; c.beginPath(); c.ellipse(800, 350, 15, 9, 0, Math.PI, TAU); c.fill();
      c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(800, 375, 34, 6, 0, 0, TAU); c.fill();
      bare(c, 840, 380, 170, P.mid, R, 6, 4, 0.6);
    }
    // trzciny
    c.strokeStyle = mix(P.mid, P.fog, 0.1); c.lineWidth = 1.5;
    for (let i = 0; i < 120; i++) { const x = R() * W, y = wy + 40 + R() * 200; if (x > 120 && x < 600 && y > lerp(H, wy, (x - 150) / 410) - 30) continue; const h = 20 + R() * 40; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 4, y - h * 0.5, x + (R() - 0.5) * 16, y - h); c.stroke(); }
    return { gy: 470, fx: 660, water: wy, wisps: true };
  };

  SC.jar = (c, P, R) => {
    skyFill(c, P);
    forest(c, R, { y: 140, n: 30, hmin: 60, hmax: 120, col: mix(P.far, P.fog, 0.3) });
    band(c, 200, 80, P.fog, 0.5);
    const rock = mix(P.mid, P.near, 0.3);
    c.fillStyle = rock;
    c.beginPath(); c.moveTo(0, 90); c.lineTo(150, 120); c.lineTo(250, 230); c.lineTo(330, 380); c.lineTo(420, H); c.lineTo(0, H); c.fill();
    c.beginPath(); c.moveTo(W, 80); c.lineTo(820, 110); c.lineTo(720, 240); c.lineTo(640, 390); c.lineTo(560, H); c.lineTo(W, H); c.fill();
    forest(c, R, { y: 130, n: 6, hmin: 120, hmax: 180, col: P.mid, skip: x => x > 200 && x < 760 });
    c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 2;
    for (let i = 0; i < 40; i++) { const left = R() < 0.5; const y = 140 + R() * 380; const x = left ? R() * lerp(150, 400, (y - 90) / 450) : W - R() * lerp(150, 400, (y - 80) / 460); c.beginPath(); c.moveTo(x, y); c.lineTo(x + (left ? 30 : -30) * R(), y + 10 * R()); c.stroke(); }
    roots(c, R, 18, mix(P.near, P.mid, 0.4), 120, 120);
    // dno z potokiem
    c.fillStyle = P.ground; c.beginPath(); c.moveTo(330, 380); c.lineTo(640, 390); c.lineTo(600, H); c.lineTo(380, H); c.fill();
    c.strokeStyle = rgba(P.fog, 0.45); c.lineWidth = 6; c.beginPath(); c.moveTo(490, 385); c.quadraticCurveTo(450, 440, 500, 480); c.quadraticCurveTo(540, 510, 480, H); c.stroke();
    // kości
    c.strokeStyle = '#9d9482'; c.lineWidth = 2.4;
    for (let i = 0; i < 26; i++) { const x = 360 + R() * 260, y = 420 + R() * 110, a = R() * 3, l = 6 + R() * 12; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    // skała pod wilczycą
    c.fillStyle = mix(P.mid, P.fog, 0.08); c.beginPath(); c.ellipse(520, 452, 90, 22, 0, Math.PI, TAU); c.fill();
    return { gy: 446, fx: 520, fogBoost: 0.15 };
  };

  SC.krag = (c, P, R) => {
    skyFill(c, P);
    if (P === TOD[3]) for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(220,225,235,${0.1 + R() * 0.4})`; c.fillRect(R() * W, R() * 220, 1.2, 1.2); }
    forest(c, R, { y: 330, n: 40, hmin: 60, hmax: 120, col: mix(P.far, P.fog, 0.35) });
    band(c, 330, 40, P.fog, 0.5);
    c.fillStyle = mix(P.ground, P.mid, 0.4);
    c.beginPath(); c.moveTo(0, 420); c.quadraticCurveTo(480, 290, W, 420); c.lineTo(W, H); c.lineTo(0, H); c.fill();
    const stones = [];
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + i / 9 * TAU; stones.push({ a, x: 480 + Math.cos(a) * 320, y: 410 + Math.sin(a) * 64 }); }
    stones.sort((a, b) => a.y - b.y);
    for (const s of stones) {
      const f = (s.y - 346) / 128, h = lerp(120, 230, f), w = lerp(40, 80, f);
      stone(c, s.x, s.y, w, h, mix(mix(P.mid, '#5d5b55', 0.35), P.fog, (1 - f) * 0.35), (480 - s.x) * 0.06, R);
      if (s.y < 420) { c.fillStyle = mix(P.ground, '#4f5a44', 0.4); for (let k = 0; k < 6; k++) c.fillRect(s.x - w / 2 + R() * w, s.y - 2 - R() * 10, 2, 8 + R() * 8); }
    }
    // ołtarz
    c.fillStyle = '#4a4740'; c.beginPath(); c.ellipse(480, 420, 70, 16, 0, 0, TAU); c.fill();
    c.fillStyle = '#3a3731'; c.fillRect(410, 420, 140, 14);
    c.strokeStyle = '#140d0c'; c.lineWidth = 2; c.beginPath(); c.moveTo(440, 418); c.lineTo(520, 422); c.moveTo(450, 424); c.lineTo(510, 414); c.stroke();
    grass(c, R, 400, H, rgba(P.fog, 0.15), 160);
    return { gy: 470, fx: 640 };
  };

  SC.oboz = (c, P, R) => {
    skyFill(c, P);
    forest(c, R, { y: 300, n: 40, hmin: 80, hmax: 150, col: mix(P.far, P.fog, 0.3) });
    band(c, 300, 60, P.fog, 0.55);
    forest(c, R, { y: 370, n: 12, hmin: 160, hmax: 240, col: mix(P.mid, P.fog, 0.1), skip: x => x < 300 });
    groundFill(c, P, 390);
    // stary dąb z dziuplą
    bare(c, 160, 540, 620, P.near, R, 46, 6, 0.05);
    c.fillStyle = P.near; c.beginPath(); c.moveTo(90, 540); c.quadraticCurveTo(120, 420, 130, 220); c.lineTo(190, 220); c.quadraticCurveTo(200, 420, 240, 540); c.fill();
    c.fillStyle = '#000'; c.beginPath(); c.ellipse(165, 380, 22, 34, 0.05, 0, TAU); c.fill();
    // namioty
    c.fillStyle = '#3a3128';
    c.beginPath(); c.moveTo(380, 440); c.lineTo(450, 340); c.lineTo(530, 440); c.fill();
    c.fillStyle = '#1a1612'; c.beginPath(); c.moveTo(430, 440); c.lineTo(455, 380); c.lineTo(470, 440); c.fill();
    c.fillStyle = '#332b23'; c.beginPath(); c.moveTo(560, 420); c.lineTo(600, 360); c.lineTo(640, 400); c.lineTo(620, 430); c.fill();
    // wóz
    c.save(); c.translate(760, 420); c.rotate(0.08);
    c.fillStyle = '#2b241c'; c.fillRect(-90, -40, 180, 40);
    c.fillStyle = '#3e352a'; c.fillRect(-50, -70, 80, 34);
    c.fillStyle = '#5a5246'; c.fillRect(-56, -76, 92, 10);
    c.strokeStyle = '#1a1612'; c.lineWidth = 6; c.beginPath(); c.arc(-60, 6, 26, 0, TAU); c.stroke(); c.beginPath(); c.arc(70, 14, 26, 0, TAU); c.stroke();
    c.restore();
    // łopaty
    c.strokeStyle = '#2b241c'; c.lineWidth = 4;
    for (let i = 0; i < 4; i++) { const x = 300 + R() * 360, y = 470 + R() * 40; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 20, y - 70); c.stroke(); c.fillStyle = '#4a4740'; c.fillRect(x - 6, y - 4, 12, 16); }
    // wygasłe ognisko
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; c.fillStyle = '#35322d'; c.beginPath(); c.ellipse(560 + Math.cos(a) * 34, 480 + Math.sin(a) * 9, 9, 6, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#121010'; c.beginPath(); c.ellipse(560, 480, 26, 6, 0, 0, TAU); c.fill();
    grass(c, R, 395, H, rgba(P.fog, 0.14), 180);
    return { gy: 470, fx: 300, smokes: [] };
  };

  SC.kurhany = (c, P, R) => {
    skyFill(c, P);
    forest(c, R, { y: 280, n: 36, hmin: 60, hmax: 120, col: mix(P.far, P.fog, 0.35) });
    band(c, 280, 60, P.fog, 0.6);
    // wielki kurhan
    mound(c, 500, 400, 470, 200, mix(P.mid, P.fog, 0.3), R, P.fog);
    c.fillStyle = '#050405'; c.beginPath(); c.moveTo(580, 300); c.lineTo(640, 296); c.lineTo(652, 360); c.lineTo(574, 364); c.fill();
    c.fillStyle = mix(P.mid, '#4a3a2a', 0.4); c.fillRect(570, 360, 90, 8);
    band(c, 390, 50, P.fog, 0.55);
    groundFill(c, P, 410);
    // trzy małe
    mound(c, 200, 470, 170, 82, P.mid, R, P.fog);
    mound(c, 480, 480, 70, 34, P.mid, R, P.fog);
    mound(c, 770, 470, 190, 100, P.mid, R, P.fog);
    c.fillStyle = '#060506'; c.beginPath(); c.moveTo(690, 470); c.lineTo(704, 420); c.lineTo(744, 414); c.lineTo(752, 470); c.fill();
    c.fillStyle = '#3b3833'; c.beginPath(); c.ellipse(200, 466, 46, 18, 0, 0, TAU); c.fill();
    c.strokeStyle = '#25231f'; c.lineWidth = 2; c.beginPath(); c.moveTo(186, 456); c.lineTo(214, 456); c.moveTo(200, 448); c.lineTo(200, 470); c.stroke();
    for (let i = 0; i < 16; i++) { c.fillStyle = mix(P.mid, '#5a564e', 0.5); c.beginPath(); c.ellipse(lerp(60, 900, R()), 470 + R() * 60, 6 + R() * 6, 4, 0, 0, TAU); c.fill(); }
    grass(c, R, 410, H, rgba(P.fog, 0.18), 260);
    return { gy: 500, fx: 480, steam: { x: 613, y: 300 }, glow: { x: 613, y: 330, r: 50 } };
  };

  function interiorBase(c, R) {
    earthWall(c, R, '#1f1812', '#0d0a08');
    vaultArch(c, R, 480, 330, 380, 260, '#2a2119');
    c.fillStyle = '#16110d'; c.beginPath(); c.ellipse(480, 500, 420, 70, 0, 0, TAU); c.fill();
    roots(c, R, 26, '#2c2219', 0, 180);
  }

  SC.kurhan = (c, P, R, spec) => {
    const v = spec.variant || 'kw1';
    if (v === 'kw1') {
      earthWall(c, R, '#221a13', '#0c0907');
      c.fillStyle = '#060504'; c.beginPath(); c.ellipse(480, 280, 70, 90, 0, 0, TAU); c.fill();
      for (let i = 0; i < 5; i++) {
        const f = i / 4, x1 = lerp(150, 410, f), x2 = lerp(810, 550, f), y1 = lerp(80, 200, f), y2 = lerp(540, 370, f), w = lerp(26, 8, f);
        c.fillStyle = mix('#3b2d1f', '#0c0907', f * 0.6); c.fillRect(x1 - w / 2, y1, w, y2 - y1); c.fillRect(x2 - w / 2, y1, w, y2 - y1); c.fillRect(x1, y1, x2 - x1, w * 0.8);
      }
      roots(c, R, 20, '#2c2219', 0, 120);
      c.fillStyle = '#0f0c0a'; c.beginPath(); c.ellipse(500, 470, 130, 22, 0.05, 0, TAU); c.fill();
      if (!(typeof F === 'function' && F('bjorn_zabrany'))) {
        c.fillStyle = '#1b1713'; c.beginPath(); c.ellipse(500, 458, 110, 16, 0.05, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(395, 452, 20, 15, 0, 0, TAU); c.fill();
        c.fillStyle = '#6a5a3a'; c.beginPath(); c.moveTo(380, 462); c.quadraticCurveTo(370, 480, 386, 486); c.stroke();
      }
      return { gy: 470, fx: 560, interior: true };
    }
    interiorBase(c, R);
    if (v === 'kw2') {
      for (let i = 0; i < 18; i++) { const x = 330 + (i % 9) * 36 + R() * 10, y = 450 + (i / 9 | 0) * 22; c.save(); c.globalAlpha = 0.85; skull(c, x, y, 0.9, R, 'kon'); c.restore(); }
      c.strokeStyle = '#8f846c'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(380, 432); c.lineTo(600, 432); c.stroke();
      for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(430 + i * 12, 422); c.lineTo(430 + i * 12, 442); c.stroke(); }
      c.beginPath(); c.arc(360, 430, 14, 0, TAU); c.stroke();
      c.strokeStyle = '#0a0a0c'; c.lineWidth = 7; c.beginPath(); c.moveTo(400, 424); c.lineTo(600, 420); c.stroke();
      c.lineWidth = 3; c.beginPath(); c.moveTo(420, 410); c.lineTo(420, 436); c.stroke();
      return { gy: 440, fx: 480, interior: true, wallFig: true };
    }
    if (v === 'km1' || v === 'km2') {
      c.strokeStyle = 'rgba(170,165,150,.35)'; c.lineWidth = 0.8;
      const n = v === 'km1' ? 140 : 90;
      for (let i = 0; i < n; i++) {
        c.beginPath();
        if (v === 'km2') { c.moveTo(480 + (R() - 0.5) * 30, 400); c.lineTo(R() * W, R() * 200); }
        else { c.moveTo(R() * W, R() * H * 0.8); c.lineTo(R() * W, R() * H * 0.8); }
        c.stroke();
      }
      return { gy: 480, fx: 480, interior: true, threads: v === 'km1' };
    }
    if (v === 'kd') {
      c.fillStyle = 'rgba(160,140,110,.25)';
      for (let i = 0; i < 26; i++) {
        const x = R() * W, y = 60 + R() * 330, s = 0.6 + R() * 0.5;
        c.save(); c.translate(x, y); c.rotate((R() - 0.5) * 1); c.scale(s, s);
        c.beginPath(); c.ellipse(0, 0, 9, 11, 0, 0, TAU); c.fill();
        for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(-8 + k * 4, -12 - (k === 0 ? -4 : 2), 2, 6, (k - 2) * 0.2, 0, TAU); c.fill(); }
        c.restore();
      }
      c.fillStyle = '#2c3524'; c.beginPath(); c.ellipse(480, 450, 150, 36, 0, 0, TAU); c.fill();
      c.strokeStyle = '#a0957c'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(450, 430, 13, 0, TAU); c.stroke();
      c.beginPath(); c.moveTo(462, 436); c.quadraticCurveTo(500, 450, 530, 430); c.stroke();
      c.beginPath(); c.moveTo(500, 444); c.quadraticCurveTo(520, 470, 490, 470); c.stroke();
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(475 + i * 9, 432); c.lineTo(478 + i * 9, 450); c.stroke(); }
      if (!(typeof has === 'function' && has('grzechotka'))) {
        c.fillStyle = '#8a6a4a'; c.beginPath(); c.ellipse(520, 440, 12, 8, -0.2, 0, TAU); c.fill(); c.beginPath(); c.moveTo(530, 436); c.lineTo(540, 430); c.lineTo(533, 442); c.fill();
      }
      return { gy: 470, fx: 480, interior: true };
    }
    return { gy: 470, fx: 480, interior: true };
  };

  SC.wrota = (c, P, R) => {
    skyFill(c, P);
    band(c, 140, 60, P.fog, 0.6);
    mound(c, 480, 560, 760, 470, mix(P.mid, P.near, 0.55), R, P.fog);
    c.fillStyle = '#020102'; c.beginPath(); c.moveTo(390, 540); c.lineTo(420, 260); c.lineTo(540, 260); c.lineTo(570, 540); c.fill();
    c.fillStyle = '#2b2219';
    c.fillRect(392, 240, 22, 300); c.fillRect(546, 240, 22, 300); c.fillRect(380, 236, 200, 18);
    for (let i = 0; i < 9; i++) { const f = i / 8, y = lerp(530, 300, f), w = lerp(170, 100, f); c.fillStyle = `rgba(70,50,35,${0.6 - f * 0.5})`; c.fillRect(480 - w / 2, y, w, lerp(10, 4, f)); }
    c.strokeStyle = '#2b241c'; c.lineWidth = 4; c.beginPath(); c.moveTo(250, 520); c.lineTo(300, 440); c.moveTo(690, 530); c.lineTo(660, 450); c.stroke();
    grass(c, R, 200, H, rgba(P.fog, 0.14), 240);
    return { gy: 520, fx: 680, steam: { x: 480, y: 260 }, glow: { x: 480, y: 420, r: 90 } };
  };

  SC.kosci = (c, P, R) => {
    c.fillStyle = '#0c0907'; c.fillRect(0, 0, W, H);
    const vx = 520, vy = 290;
    const wall = (side) => {
      for (let i = 0; i < 900; i++) {
        const f = R(), y = lerp(-40, H + 40, R());
        const xEdge = side < 0 ? lerp(0, vx - 60, f) : lerp(W, vx + 60, f);
        const yy = lerp(y, vy + (y - vy) * 0.25, f);
        const s = lerp(1.4, 0.3, f);
        c.fillStyle = mix('#b7ad95', '#120e0b', 0.35 + f * 0.6 + R() * 0.15);
        c.beginPath(); c.ellipse(xEdge, yy, 10 * s + R() * 6 * s, 3 * s + R() * 2 * s, (R() - 0.5) * 0.6, 0, TAU); c.fill();
        if (R() < 0.06) { c.beginPath(); c.arc(xEdge, yy, 7 * s, 0, TAU); c.fill(); c.fillStyle = '#0c0907'; c.beginPath(); c.arc(xEdge - 2 * s, yy - 1 * s, 1.6 * s, 0, TAU); c.arc(xEdge + 2 * s, yy - 1 * s, 1.6 * s, 0, TAU); c.fill(); }
      }
    };
    wall(-1); wall(1);
    c.fillStyle = '#0a0806';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(vx + 80, vy - 70); c.lineTo(vx - 80, vy - 70); c.fill();
    c.beginPath(); c.moveTo(0, H); c.lineTo(W, H); c.lineTo(vx + 80, vy + 60); c.lineTo(vx - 80, vy + 60); c.fill();
    c.fillStyle = '#000'; c.beginPath(); c.ellipse(vx, vy + 10, 60, 70, 0, 0, TAU); c.fill();
    c.fillStyle = '#000'; c.beginPath(); c.moveTo(150, 420); c.lineTo(170, 200); c.lineTo(250, 230); c.lineTo(250, 380); c.fill();
    roots(c, R, 30, '#221a13', 0, 160);
    return { gy: 470, fx: 520, interior: true, glow: { x: vx, y: vy + 20, r: 60 } };
  };

  SC.zerca = (c, P, R) => {
    interiorBase(c, R);
    c.strokeStyle = '#2b2018'; c.lineCap = 'round';
    for (let i = 0; i < 70; i++) {
      const a = R() * TAU, r = 300 + R() * 300;
      c.lineWidth = 1 + R() * 6;
      c.beginPath(); c.moveTo(480 + (R() - 0.5) * 40, 250 + (R() - 0.5) * 60);
      c.quadraticCurveTo(480 + Math.cos(a) * r * 0.5 + (R() - 0.5) * 100, 250 + Math.sin(a) * r * 0.5, 480 + Math.cos(a) * r, 250 + Math.sin(a) * r);
      c.stroke();
    }
    return { gy: 400, fx: 480, interior: true };
  };

  SC.gardziel = (c, P, R, spec) => {
    const d = spec.depth || 1, k = d / 7;
    c.fillStyle = mix('#140806', '#2a0806', k); c.fillRect(0, 0, W, H);
    const cx = 480, cy = 300;
    for (let i = 0; i < 16; i++) {
      const f = 1 - i / 16, rx = lerp(30, 640, f), ry = lerp(24, 420, f);
      c.fillStyle = mix(mix('#3b201a', '#5a1410', k), '#0a0302', 1 - f * 0.9);
      c.beginPath();
      for (let a = 0; a <= TAU + 0.01; a += 0.18) { const rr = 1 + (R() - 0.5) * 0.12; c.lineTo(cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr); }
      c.fill();
      if (d >= 3 && i % 2 === 0) {
        c.fillStyle = mix('#cbb9a0', '#2a0b08', 0.3 + (1 - f) * 0.6);
        const n = 10 + d * 2;
        for (let j = 0; j < n; j++) {
          const a = j / n * TAU + R() * 0.2, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry, len = lerp(6, 40, f) * (d / 7);
          c.beginPath(); c.moveTo(x + Math.cos(a + 1.57) * len * 0.3, y + Math.sin(a + 1.57) * len * 0.3); c.lineTo(x - Math.cos(a) * len, y - Math.sin(a) * len); c.lineTo(x - Math.cos(a + 1.57) * len * 0.3, y - Math.sin(a + 1.57) * len * 0.3); c.fill();
        }
      }
    }
    return { gy: 470, fx: 480, breathe: 0.012 + k * 0.02, glow: { x: cx, y: cy, r: 80 + d * 12, red: true } };
  };

  SC.serce = (c, P, R) => {
    c.fillStyle = '#050102'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      const x = R() * W, w = 20 + R() * 60;
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(40,8,6,0)'); g.addColorStop(1, `rgba(${60 + R() * 40 | 0},10,8,${0.2 + R() * 0.3})`);
      c.fillStyle = g; c.beginPath(); c.moveTo(x - w, H); c.quadraticCurveTo(x + (R() - 0.5) * 200, H * 0.4, x + (R() - 0.5) * 300, 0); c.lineTo(x + w * 0.2, 0); c.quadraticCurveTo(x + (R() - 0.5) * 100, H * 0.5, x + w, H); c.fill();
    }
    const g = c.createRadialGradient(480, 520, 10, 480, 520, 420); g.addColorStop(0, 'rgba(150,20,12,.55)'); g.addColorStop(1, 'rgba(60,5,5,0)');
    c.fillStyle = g; c.fillRect(0, 200, W, H);
    const nests = typeof F === 'function' && F('peta_polozone');
    for (let i = 0; i < 3; i++) {
      const x = 360 + i * 120, y = 500;
      c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, y, 34, 10, 0, 0, TAU); c.fill();
      c.strokeStyle = nests ? '#c9a45a' : '#4a2a20'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x - 10, y); c.quadraticCurveTo(x - 30, y - 60, 480 + (i - 1) * 20, 330); c.stroke();
    }
    return { gy: 500, fx: 480, breathe: 0.02, glow: { x: 480, y: 460, r: 160, red: true } };
  };

  /* =====================================================================
     POSTACIE (rysowane na żywo)
     ===================================================================== */
  function eyesAt(c, pts, col, r, t, blink = true) {
    const b = blink ? (Math.sin(t * 0.7 + pts[0][0]) > 0.97 ? 0.15 : 1) : 1;
    for (const [x, y] of pts) {
      const g = c.createRadialGradient(x, y, 0, x, y, r * 4);
      g.addColorStop(0, rgba(col, 0.9)); g.addColorStop(0.3, rgba(col, 0.35)); g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g; c.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
      c.fillStyle = rgba('#ffffff', 0.85); c.beginPath(); c.ellipse(x, y, r * 0.7, r * 0.7 * b, 0, 0, TAU); c.fill();
    }
  }

  function humanoid(c, o) {
    const { x, y, h } = o, col = o.col || '#08080a';
    const hunch = o.hunch || 0, wide = o.wide || 1, sway = Math.sin(o.t * 1.1 + x) * h * 0.004;
    const sy = y - h * 0.78, sw = h * 0.12 * wide, cw = h * 0.19 * wide * (o.cloak === false ? 0.6 : 1);
    const hx = x + hunch * h * 0.14 + sway, hy = y - h * 0.9 + hunch * h * 0.08;
    c.fillStyle = col; c.strokeStyle = col;
    if (o.cloak === false) {
      const hip = y - h * 0.44, wx = sw * 0.78, lw = h * 0.055;
      c.beginPath();
      c.moveTo(x - sw, sy); c.quadraticCurveTo(x - sw * 1.05, sy + h * 0.15, x - wx, y - h * 0.56);
      c.lineTo(x - sw * 1.08, hip); c.lineTo(x + sw * 1.08, hip); c.lineTo(x + wx, y - h * 0.56);
      c.quadraticCurveTo(x + sw * 1.05, sy + h * 0.15, x + sw, sy); c.quadraticCurveTo(hx, sy - h * 0.05, x - sw, sy); c.fill();
      c.lineCap = 'round'; c.lineWidth = lw;
      const st = Math.sin(o.t * 1.3) * h * 0.006;
      c.beginPath(); c.moveTo(x - sw * 0.5, hip); c.lineTo(x - sw * 0.62, y - h * 0.2); c.lineTo(x - sw * 0.7 + st, y); c.stroke();
      c.beginPath(); c.moveTo(x + sw * 0.5, hip); c.lineTo(x + sw * 0.62, y - h * 0.2); c.lineTo(x + sw * 0.7 - st, y); c.stroke();
      c.lineWidth = lw * 0.8;
      if (!o.arms) {
        c.beginPath(); c.moveTo(x - sw * 0.95, sy + h * 0.03); c.quadraticCurveTo(x - sw * 1.4, y - h * 0.55, x - sw * 1.25, y - h * 0.4 + st); c.stroke();
        c.beginPath(); c.moveTo(x + sw * 0.95, sy + h * 0.03); c.quadraticCurveTo(x + sw * 1.4, y - h * 0.55, x + sw * 1.35, y - h * 0.42 - st); c.stroke();
      }
      c.beginPath(); c.moveTo(hx - h * 0.025, hy + h * 0.04); c.lineTo(hx - h * 0.03, sy + 2); c.lineTo(hx + h * 0.03, sy + 2); c.lineTo(hx + h * 0.025, hy + h * 0.04); c.fill();
    } else {
    c.beginPath();
    c.moveTo(x - sw + hunch * h * 0.08, sy + hunch * h * 0.06);
    c.quadraticCurveTo(x - cw * 1.05, y - h * 0.35, x - cw, y);
    c.lineTo(x - h * 0.03, y); c.lineTo(x, y - h * 0.14); c.lineTo(x + h * 0.03, y);
    c.lineTo(x + cw, y);
    c.quadraticCurveTo(x + cw * 1.05, y - h * 0.35, x + sw + hunch * h * 0.08, sy + hunch * h * 0.06);
    c.quadraticCurveTo(hx, sy - h * 0.04, x - sw + hunch * h * 0.08, sy + hunch * h * 0.06);
    c.fill();
    }
    const hr = h * 0.064 * (o.head || 1);
    c.beginPath(); c.ellipse(hx, hy, hr * 0.9, hr * 1.1, 0, 0, TAU); c.fill();
    c.lineCap = 'round';
    if (o.arms === 'out') {
      c.lineWidth = h * 0.035;
      c.beginPath(); c.moveTo(x - sw, sy + h * 0.03); c.quadraticCurveTo(x - h * 0.3, sy - h * 0.02, x - h * 0.42, sy - h * 0.12); c.stroke();
      c.beginPath(); c.moveTo(x + sw, sy + h * 0.03); c.quadraticCurveTo(x + h * 0.3, sy - h * 0.02, x + h * 0.42, sy - h * 0.12); c.stroke();
    } else if (o.arms === 'long') {
      c.lineWidth = h * 0.025;
      const sw2 = Math.sin(o.t * 1.4) * h * 0.02;
      c.beginPath(); c.moveTo(x - sw, sy + h * 0.03); c.quadraticCurveTo(x - h * 0.24, y - h * 0.4, x - h * 0.22 + sw2, y - h * 0.05); c.stroke();
      c.beginPath(); c.moveTo(x + sw, sy + h * 0.03); c.quadraticCurveTo(x + h * 0.24, y - h * 0.4, x + h * 0.22 - sw2, y - h * 0.05); c.stroke();
      c.lineWidth = h * 0.008;
      for (let s = -1; s <= 1; s += 2) for (let k = 0; k < 4; k++) { const fx = x + s * h * 0.22 + (s < 0 ? sw2 : -sw2); c.beginPath(); c.moveTo(fx, y - h * 0.05); c.lineTo(fx + s * (k - 1.5) * h * 0.012, y + h * 0.03); c.stroke(); }
    }
    if (o.spear) { c.lineWidth = h * 0.012; c.beginPath(); c.moveTo(x + cw * 0.9, y + 4); c.lineTo(x + cw * 0.9, y - h * 1.25); c.stroke(); c.beginPath(); c.moveTo(x + cw * 0.9, y - h * 1.36); c.lineTo(x + cw * 0.9 - h * 0.02, y - h * 1.24); c.lineTo(x + cw * 0.9 + h * 0.02, y - h * 1.24); c.fill(); }
    if (o.staff) { c.lineWidth = h * 0.015; c.beginPath(); c.moveTo(x - cw * 0.8, y + 2); c.lineTo(x - cw * 0.6, y - h * 0.95); c.stroke(); }
    if (o.axe) {
      c.lineWidth = h * 0.02; c.beginPath(); c.moveTo(x + cw * 0.7, y - h * 0.2); c.lineTo(x + cw * 1.1, y - h * 0.85); c.stroke();
      c.beginPath(); c.moveTo(x + cw * 1.05, y - h * 0.82); c.quadraticCurveTo(x + cw * 1.7, y - h * 0.9, x + cw * 1.55, y - h * 0.68); c.lineTo(x + cw * 1.0, y - h * 0.74); c.fill();
    }
    if (o.sword) { c.lineWidth = h * 0.012; c.beginPath(); c.moveTo(x + cw * 0.8, y - h * 0.4); c.lineTo(x + cw * 1.4, y - h * 1.0); c.stroke(); c.beginPath(); c.moveTo(x + cw * 0.65, y - h * 0.47); c.lineTo(x + cw * 0.95, y - h * 0.33); c.stroke(); }
    if (o.braids) { c.lineWidth = h * 0.014; c.beginPath(); c.moveTo(hx - hr * 0.4, hy + hr); c.lineTo(hx - hr * 0.5, hy + hr * 2.6); c.moveTo(hx + hr * 0.4, hy + hr); c.lineTo(hx + hr * 0.5, hy + hr * 2.6); c.stroke(); }
    if (o.hair) { c.lineWidth = 1.2; c.strokeStyle = o.hairCol || col; for (let k = 0; k < 14; k++) { c.beginPath(); c.moveTo(hx + (k - 7) * hr * 0.12, hy - hr * 0.6); c.quadraticCurveTo(hx + (k - 7) * hr * 0.3, hy + h * 0.3, hx + (k - 7) * hr * 0.5 + Math.sin(o.t + k) * 3, y - (o.hairLen || 0.2) * h); c.stroke(); } c.strokeStyle = col; }
    if (o.ribbon) { c.fillStyle = '#b3241a'; c.fillRect(hx + hr * 0.4, hy - hr * 0.6, hr * 0.7, hr * 0.4); c.fillStyle = col; }
    if (o.beard) { c.fillStyle = o.beardCol || col; c.beginPath(); c.moveTo(hx - hr * 0.7, hy + hr * 0.3); c.quadraticCurveTo(hx, hy + hr * (o.beard * 3), hx + hr * 0.7, hy + hr * 0.3); c.fill(); c.fillStyle = col; }
    if (o.antlers) antlers(c, hx, hy - hr, h * o.antlers, col, o.t, o.antEyes);
    if (o.eyes) eyesAt(c, o.eyeOne ? [[hx + hr * 0.3, hy - hr * 0.1]] : [[hx - hr * 0.32, hy - hr * 0.1], [hx + hr * 0.32, hy - hr * 0.1]], o.eyes, hr * (o.eyeSize || 0.16), o.t);
    if (o.extraEyes) { const pts = []; const r2 = rng(7); for (let k = 0; k < o.extraEyes; k++) pts.push([hx + hr * (0.2 + r2() * 0.9), hy + hr * (r2() * 2 - 0.8)]); eyesAt(c, pts, '#ffd27a', hr * 0.08, o.t); }
    if (o.smile) { c.strokeStyle = 'rgba(255,240,230,.7)'; c.lineWidth = 1.5; c.beginPath(); c.arc(hx, hy + hr * 0.2, hr * 0.6, 0.2, Math.PI - 0.2); c.stroke(); }
  }

  function antlers(c, x, y, s, col, t, eyes) {
    const R = rng(4242), tips = [];
    c.strokeStyle = col; c.lineCap = 'round';
    const br = (x1, y1, len, ang, w, d) => {
      const a2 = ang + Math.sin(t * 0.6 + d) * 0.03;
      const x2 = x1 + Math.cos(a2) * len, y2 = y1 + Math.sin(a2) * len;
      c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      if (d <= 0) { tips.push([x2, y2]); return; }
      br(x2, y2, len * 0.72, a2 - 0.35 - R() * 0.3, w * 0.7, d - 1);
      br(x2, y2, len * 0.72, a2 + 0.35 + R() * 0.3, w * 0.7, d - 1);
      if (eyes && R() < 0.5) tips.push([x2, y2]);
    };
    br(x - s * 0.04, y, s * 0.28, -Math.PI / 2 - 0.55, Math.max(1.5, s * 0.03), 4);
    br(x + s * 0.04, y, s * 0.28, -Math.PI / 2 + 0.55, Math.max(1.5, s * 0.03), 4);
    if (eyes) {
      const pts = tips.filter((_, i) => i % 2 === 0);
      for (let i = 0; i < pts.length; i++) {
        const [ex, ey] = pts[i]; const open = Math.sin(t * 0.9 + i * 1.7) > -0.6;
        if (!open) continue;
        const g = c.createRadialGradient(ex, ey, 0, ex, ey, 9);
        g.addColorStop(0, 'rgba(255,90,60,.95)'); g.addColorStop(0.4, 'rgba(255,60,30,.35)'); g.addColorStop(1, 'rgba(255,40,20,0)');
        c.fillStyle = g; c.fillRect(ex - 9, ey - 9, 18, 18);
        c.fillStyle = '#ffe1c2'; c.beginPath(); c.ellipse(ex, ey, 1.8, 1.4, 0, 0, TAU); c.fill();
      }
    }
  }

  const WOLF = [[-1.00,-0.62],[-0.92,-0.70],[-0.80,-0.74],[-0.74,-0.92],[-0.68,-0.76],[-0.62,-0.94],[-0.56,-0.74],[-0.40,-0.70],[-0.10,-0.72],[0.25,-0.70],[0.55,-0.66],[0.70,-0.58],[0.86,-0.52],[1.02,-0.34],[1.06,-0.20],[0.94,-0.30],[0.78,-0.42],[0.70,-0.40],[0.68,-0.20],[0.64,0],[0.55,0],[0.56,-0.20],[0.50,-0.36],[0.40,-0.30],[0.20,-0.32],[-0.30,-0.34],[-0.34,-0.20],[-0.34,0],[-0.43,0],[-0.46,-0.20],[-0.50,-0.36],[-0.62,-0.44],[-0.80,-0.52],[-0.96,-0.54]];
  const BOAR = [[-1.0,-0.35],[-0.95,-0.50],[-0.80,-0.62],[-0.55,-0.80],[-0.30,-0.92],[0.0,-0.95],[0.35,-0.88],[0.65,-0.74],[0.85,-0.60],[0.95,-0.45],[1.02,-0.52],[0.98,-0.38],[0.88,-0.30],[0.80,-0.12],[0.76,0],[0.66,0],[0.64,-0.18],[0.40,-0.24],[-0.30,-0.24],[-0.38,-0.10],[-0.40,0],[-0.50,0],[-0.52,-0.16],[-0.70,-0.22],[-0.90,-0.24]];
  function quad(c, pts, x, y, s, col, flip, breathe) {
    c.fillStyle = col; c.beginPath();
    pts.forEach(([px, py], i) => { const X = x + px * s * (flip ? -1 : 1), Y = y + py * s * (1 + (py < -0.3 ? breathe : 0)); i ? c.lineTo(X, Y) : c.moveTo(X, Y); });
    c.closePath(); c.fill();
  }

  const FIG = {
    wilk: (c, x, y, s, t, o) => { quad(c, WOLF, x, y, s * 0.55, o.col, false, Math.sin(t * 2) * 0.01); eyesAt(c, [[x - 0.8 * s * 0.55, y - 0.66 * s * 0.55]], '#e8d38a', s * 0.012, t); },
    wilczyca: (c, x, y, s, t, o) => { quad(c, WOLF, x, y, s * 0.75, mix(o.col, '#5d5c5a', 0.2), false, Math.sin(t * 1.6) * 0.012); eyesAt(c, [[x - 0.8 * s * 0.75, y - 0.66 * s * 0.75]], '#f2efe6', s * 0.016, t, false); },
    wilki_spokojne: (c, x, y, s, t, o) => { const L = WOLF.map(([a, b]) => [a, b * 0.45]); quad(c, L, 150, 470, s * 0.3, o.col, true, 0); quad(c, L, 800, 480, s * 0.34, o.col, false, 0); quad(c, L, 690, 420, s * 0.22, o.col, false, 0); eyesAt(c, [[150 + 0.8 * s * 0.3, 470 - 0.3 * s * 0.3], [800 - 0.8 * s * 0.34, 480 - 0.3 * s * 0.34]], '#e8d38a', 2, t); },
    dzik: (c, x, y, s, t, o) => { quad(c, BOAR, x, y, s * 0.6, o.col, false, Math.sin(t * 3) * 0.01); c.strokeStyle = '#d8ccb0'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x - 0.9 * s * 0.6, y - 0.32 * s * 0.6); c.quadraticCurveTo(x - 1.0 * s * 0.6, y - 0.5 * s * 0.6, x - 0.86 * s * 0.6, y - 0.55 * s * 0.6); c.stroke(); eyesAt(c, [[x - 0.68 * s * 0.6, y - 0.56 * s * 0.6]], '#ff5a2a', s * 0.012, t); },
    straznik: (c, x, y, s, t, o) => humanoid(c, { x, y, h: s, t, col: o.col, spear: true, wide: 0.85, cloak: false }),
    starzec: (c, x, y, s, t, o) => humanoid(c, { x, y, h: s * 0.92, t, col: o.col, hunch: 0.5, wide: 1.25, beard: 1.6, beardCol: '#4d4a44' }),
    starucha: (c, x, y, s, t, o) => humanoid(c, { x, y, h: s * 0.85, t, col: o.col, hunch: 0.9, wide: 1.15, staff: true, eyes: '#e8e6dc', eyeOne: true, eyeSize: 0.2 }),
    kobieta: (c, x, y, s, t, o) => humanoid(c, { x, y, h: s * 0.9, t, col: o.col, wide: 0.85, braids: true, hunch: 0.25 }),
    sulislaw: (c, x, y, s, t, o) => { c.fillStyle = o.col; c.beginPath(); c.ellipse(x, y - s * 0.1, s * 0.07, s * 0.08, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(x, y - s * 0.02, s * 0.16, s * 0.05, 0, Math.PI, TAU); c.fill(); c.lineWidth = s * 0.02; c.strokeStyle = o.col; c.beginPath(); c.moveTo(x - s * 0.12, y - s * 0.03); c.lineTo(x - s * 0.25, y - s * 0.18 + Math.sin(t * 2) * 4); c.stroke(); eyesAt(c, [[x - s * 0.022, y - s * 0.11], [x + s * 0.022, y - s * 0.11]], '#e6e2d4', s * 0.006, t); },
    topielec: (c, x, y, s, t, o) => { const bob = Math.sin(t * 1.3) * 4; humanoid(c, { x, y: y + s * 0.35 + bob, h: s, t, col: '#202622', wide: 1.3, head: 1.35, arms: 'out', eyes: '#f4f6f0', eyeSize: 0.22, smile: true }); c.fillStyle = 'rgba(20,30,34,.85)'; c.fillRect(0, y + bob * 0.2, W, H - y); },
    wojownik: (c, x, y, s, t, o) => { humanoid(c, { x, y, h: s * 1.05, t, col: '#141619', wide: 0.85, cloak: false, sword: true, eyes: '#7fc6ff', eyeSize: 0.22 }); },
    szkielet: (c, x, y, s, t, o) => { c.save(); c.globalAlpha = 0.28 + Math.sin(t * 0.8) * 0.06; humanoid(c, { x: 560, y: 360, h: 260, t, col: '#000', wide: 0.9, sword: true }); c.restore(); },
    matka: (c, x, y, s, t, o) => {
      const h = s * 0.7, col = '#1a1714';
      c.fillStyle = col; c.beginPath(); c.moveTo(x - h * 0.3, y); c.quadraticCurveTo(x - h * 0.28, y - h * 0.6, x, y - h * 0.75); c.quadraticCurveTo(x + h * 0.28, y - h * 0.6, x + h * 0.32, y); c.fill();
      c.beginPath(); c.ellipse(x + h * 0.05, y - h * 0.8, h * 0.08, h * 0.1, 0.3, 0, TAU); c.fill();
      c.strokeStyle = '#8f8c84'; c.lineWidth = 1;
      for (let k = 0; k < 24; k++) { c.beginPath(); c.moveTo(x + h * 0.05 + (k - 12) * 1.5, y - h * 0.86); c.quadraticCurveTo(x + (k - 12) * 4, y - h * 0.4, x + (k - 12) * 6 + Math.sin(t * 0.6 + k) * 2, y + 6); c.stroke(); }
      const sp = t * 3; c.strokeStyle = '#6d5a44'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + h * 0.32, y - h * 0.3); c.lineTo(x + h * 0.32, y - h * 0.05); c.stroke();
      c.strokeStyle = 'rgba(200,195,180,.6)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + h * 0.32 + Math.cos(sp) * 4, y - h * 0.3); c.lineTo(x + h * 0.5, 0); c.stroke();
      eyesAt(c, [[x + h * 0.02, y - h * 0.8], [x + h * 0.1, y - h * 0.79]], '#cfd8c8', h * 0.012, t);
    },
    nici: (c, x, y, s, t, o) => { c.strokeStyle = 'rgba(205,200,185,.6)'; c.lineWidth = 1; const R = rng(99); for (let k = 0; k < 70; k++) { const sx = R() * W, ex = x + (R() - 0.5) * 300; c.beginPath(); c.moveTo(sx, 0); c.quadraticCurveTo((sx + ex) / 2 + Math.sin(t * 2 + k) * 30, y - 200, ex + Math.sin(t * 3 + k) * 20, y - R() * 200); c.stroke(); } },
    hrodgar: (c, x, y, s, t, o) => humanoid(c, { x, y, h: s * 1.05, t, col: '#0d0d0f', wide: 1.35, cloak: false, axe: true, braids: true, eyes: '#cfd6dd', eyeOne: true, eyeSize: 0.2, extraEyes: 14 }),
    mgielnica: (c, x, y, s, t, o) => {
      const h = s * 0.5, col = '#1b1a1d';
      c.fillStyle = col; c.beginPath(); c.ellipse(x, y - h * 0.3, h * 0.22, h * 0.28, 0, 0, TAU); c.fill();
      c.strokeStyle = col; c.lineWidth = h * 0.03; c.lineCap = 'round';
      for (let k = 0; k < 4; k++) { const sd = k < 2 ? -1 : 1, up = k % 2; c.beginPath(); c.moveTo(x + sd * h * 0.15, y - h * (0.3 + up * 0.15)); c.lineTo(x + sd * h * (0.55 + up * 0.1), y - h * (0.6 + up * 0.25) + Math.sin(t * 2 + k) * 4); c.lineTo(x + sd * h * (0.7 + up * 0.2), y - h * 0.02); c.stroke(); }
      c.fillStyle = '#cfcac0'; c.beginPath(); c.ellipse(x, y - h * 0.62, h * 0.13, h * 0.16, 0, 0, TAU); c.fill();
      c.fillStyle = '#1a0606'; c.beginPath(); c.ellipse(x, y - h * 0.56, h * 0.05, h * (0.03 + 0.03 * Math.abs(Math.sin(t * 4))), 0, 0, TAU); c.fill();
      c.strokeStyle = '#8d3a1e'; c.lineWidth = 1.4;
      for (let k = 0; k < 18; k++) { c.beginPath(); c.moveTo(x + (k - 9) * 2, y - h * 0.76); c.quadraticCurveTo(x + (k - 9) * 6 + Math.sin(t * 1.5 + k) * 10, y - h * 0.9, x + (k - 9) * 9 + Math.sin(t + k) * 14, y - h * 0.4); c.stroke(); }
    },
    dziecko: (c, x, y, s, t, o) => humanoid(c, { x, y, h: s * 0.5, t, col: o.col, wide: 0.9, head: 1.3, hair: true, hairCol: '#5a2a16', hairLen: 0.75, ribbon: true }),
    dziecko_cien: (c, x, y, s, t, o) => { c.save(); c.globalAlpha = 0.25 + Math.sin(t * 0.7) * 0.1; humanoid(c, { x: 260, y, h: s * 0.42, t, col: '#000', head: 1.3 }); c.restore(); },
    zerca: (c, x, y, s, t, o) => { humanoid(c, { x: 480, y: 330 + Math.sin(t * 0.8) * 3, h: 220, t, col: '#2a2722', wide: 0.9, arms: 'out', hair: true, hairCol: '#8a8678', hairLen: 0.4 }); c.fillStyle = 'rgba(210,205,190,.25)'; c.fillRect(455, 190, 50, 140); },
    zerca_wolny: (c, x, y, s, t, o) => humanoid(c, { x, y, h: s * 0.9, t, col: '#2a2722', hunch: 0.4, hair: true, hairCol: '#9a968a', hairLen: 0.45, eyes: '#f4f4ee', eyeSize: 0.15 }),
    zjawa: (c, x, y, s, t, o) => { c.save(); c.globalAlpha = 0.6 + Math.sin(t * 3) * 0.15; humanoid(c, { x, y, h: s, t, col: '#0b0c10', wide: 1.05, sword: true, eyes: '#f0f0f0', eyeSize: 0.16, smile: true }); c.restore(); },
    borowy: (c, x, y, s, t, o) => humanoid(c, { x, y, h: s * 0.6, t, col: '#1c2016', hunch: 0.6, wide: 1.1, staff: true, beard: 2.6, beardCol: '#4b5a3a', eyes: '#e9b64a', eyeSize: 0.18 }),
    trup: (c, x, y, s, t, o) => { c.fillStyle = o.col; bare(c, x + 40, y + 6, 520, o.col, rng(5), 22, 4); humanoid(c, { x, y: y + 4, h: s * 0.55, t: 0, col: '#0f1011', wide: 1.4, hunch: 0.7 }); },
    kruki: (c, x, y, s, t, o) => { const R = rng(31); bare(c, 640, 520, 560, o.col, R, 16, 5); for (let k = 0; k < 9; k++) { const bx = 560 + (k % 5) * 40 + (k > 4 ? 20 : 0), by = 250 + (k > 4 ? 60 : 0) + Math.sin(k) * 10; c.fillStyle = '#050506'; c.beginPath(); c.ellipse(bx, by, 9, 6, 0.3, 0, TAU); c.fill(); c.beginPath(); c.arc(bx - 8, by - 5, 4, 0, TAU); c.fill(); c.beginPath(); c.moveTo(bx + 6, by); c.lineTo(bx + 16, by + 6); c.lineTo(bx + 6, by + 4); c.fill(); } },
    pasterz: (c, x, y, s, t, o) => {
      const h = s * 1.12, bx = x + Math.sin(t * 0.4) * 6;
      const g = c.createLinearGradient(0, y - h, 0, y);
      g.addColorStop(0, 'rgba(10,6,8,.95)'); g.addColorStop(0.7, 'rgba(25,14,16,.85)'); g.addColorStop(1, 'rgba(60,20,20,0)');
      c.fillStyle = g; c.beginPath();
      c.moveTo(bx - h * 0.18, y); c.quadraticCurveTo(bx - h * 0.1, y - h * 0.5, bx - h * 0.06, y - h * 0.72); c.quadraticCurveTo(bx, y - h * 0.8, bx + h * 0.06, y - h * 0.72); c.quadraticCurveTo(bx + h * 0.1, y - h * 0.5, bx + h * 0.18, y); c.fill();
      c.fillStyle = 'rgba(8,4,6,.95)'; c.beginPath(); c.ellipse(bx, y - h * 0.76, h * 0.045, h * 0.065, 0, 0, TAU); c.fill();
      antlers(c, bx, y - h * 0.8, h * 1.05, 'rgba(18,10,12,.95)', t, true);
      eyesAt(c, [[bx - h * 0.015, y - h * 0.765], [bx + h * 0.015, y - h * 0.765]], '#ff3a20', h * 0.004, t);
      c.lineWidth = 3; c.strokeStyle = 'rgba(15,8,10,.8)';
      for (let k = 0; k < 2; k++) { const sd = k ? 1 : -1; c.beginPath(); c.moveTo(bx + sd * h * 0.07, y - h * 0.65); c.quadraticCurveTo(bx + sd * h * 0.3, y - h * 0.4 + Math.sin(t + k) * 10, bx + sd * h * 0.26, y - h * 0.08); c.stroke(); }
    },
  };

  /* =====================================================================
     WIDOK: płótno + stan + pętla
     ===================================================================== */
  function makeFog(col, seed, scale, density) {
    const c = mk(W * 2, H), x = c.getContext('2d'), R = rng(seed);
    for (let i = 0; i < 46; i++) {
      const px = R() * W * 2, py = H * (0.4 + R() * 0.6), r = Math.min(py - 4, (90 + R() * 200) * scale);
      for (const off of [-W * 2, 0, W * 2]) {
        const cx = px + off; if (cx + r < 0 || cx - r > W * 2) continue;
        const g = x.createRadialGradient(cx, py, 0, cx, py, r);
        g.addColorStop(0, rgba(col, 0.2 * density)); g.addColorStop(1, rgba(col, 0));
        x.fillStyle = g; x.fillRect(cx - r, py - r, r * 2, r * 2);
      }
    }
    return c;
  }
  const grainC = (() => {
    const c = mk(256, 256), x = c.getContext('2d'), d = x.createImageData(256, 256);
    for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    x.putImageData(d, 0, 0); return c;
  })();

  const views = [];
  let calm = false;

  function view(canvas, opts = {}) {
    const ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    const buf = mk(), bx = buf.getContext('2d');
    const prev = mk(), px = prev.getContext('2d');
    const v = {
      canvas, ctx, buf, bx, prev, px, spec: null, key: '', bg: null, dyn: {}, fogs: [], fade: 0,
      shake: 0, flash: 0, flashCol: '200,30,20', eyes: [], smoke: [], last: performance.now(), active: true, opts,
      set(spec) {
        const P = spec.k === 'chata' || spec.dark && spec.k !== 'wrota' ? INNER : TOD[spec.tod || 0];
        const key = [spec.k, spec.variant || '', spec.depth || 0, spec.k === 'chata' ? '' : spec.tod, spec.flagsKey || ''].join('|');
        this.spec = spec;
        if (key === this.key) return;
        if (this.bg) { this.px.clearRect(0, 0, W, H); this.px.drawImage(this.canvas, 0, 0); this.fade = 1; }
        this.key = key;
        const c = mk(), x = c.getContext('2d');
        const R = rng(hash(spec.k + (spec.variant || '') + (spec.depth || '')));
        const dyn = (SC[spec.k] || SC.mgla)(x, P, R, spec) || {};
        this.bg = c; this.dyn = dyn; this.P = P;
        const fogCol = spec.k === 'gardziel' || spec.k === 'serce' ? '#5a1a14' : P.fog;
        this.fogs = [makeFog(fogCol, 11, 1, 1), makeFog(fogCol, 23, 1.6, 0.8), makeFog(fogCol, 37, 0.7, 0.9)];
        this.smoke = [];
      },
      hit(col) { this.shake = 1; this.flash = 1; this.flashCol = col || '200,30,20'; },
    };
    views.push(v);
    return v;
  }

  function drawFire(c, x, y, s, t, warm) {
    const fl = 0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 29) * 0.06;
    const g = c.createRadialGradient(x, y - 20 * s, 0, x, y - 20 * s, 140 * s * fl);
    g.addColorStop(0, `rgba(255,170,80,${warm ? 0.45 : 0.3})`); g.addColorStop(1, 'rgba(255,120,40,0)');
    c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(x - 160 * s, y - 180 * s, 320 * s, 260 * s);
    for (let i = 0; i < 6; i++) {
      const ph = t * (6 + i) + i * 2, h = (34 + Math.sin(ph) * 9 + i * 3) * s, w = (10 - i) * s * 1.3, ox = Math.sin(ph * 0.7) * 4 * s + (i - 2.5) * 4 * s;
      c.fillStyle = i < 2 ? 'rgba(255,90,30,.55)' : i < 4 ? 'rgba(255,160,60,.55)' : 'rgba(255,230,160,.6)';
      c.beginPath(); c.moveTo(x + ox - w, y); c.quadraticCurveTo(x + ox - w * 0.6, y - h * 0.6, x + ox + Math.sin(ph) * 3 * s, y - h); c.quadraticCurveTo(x + ox + w * 0.6, y - h * 0.6, x + ox + w, y); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
  }

  function drawTorch(c, t) {
    const x = 120, y = 470;
    c.strokeStyle = '#2a1d12'; c.lineWidth = 9; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 30, H + 10); c.lineTo(x, y); c.stroke();
    drawFire(c, x, y + 2, 0.7, t, true);
  }

  function frame(now) {
    for (const v of views) {
      if (!v.active || !v.spec || !v.canvas.offsetParent && !v.opts.always) continue;
      const dt = Math.min(0.1, (now - v.last) / 1000); v.last = now;
      const t = now / 1000, s = v.spec, d = v.dyn, c = v.bx, P = v.P;
      const rz = s.rozum ?? 100, zn = s.znamie ?? 0;
      const mad = clamp((60 - rz) / 60, 0, 1), god = clamp((zn - 30) / 70, 0, 1);
      c.save();
      if (v.shake > 0) { c.translate((Math.random() - 0.5) * 14 * v.shake, (Math.random() - 0.5) * 10 * v.shake); v.shake = Math.max(0, v.shake - dt * 3); }
      if (d.breathe) { const k = 1 + Math.sin(t * 1.2) * d.breathe; c.translate(W / 2, H / 2); c.scale(k, k); c.translate(-W / 2, -H / 2); }
      c.drawImage(v.bg, 0, 0);

      if (d.stars) for (let i = 0; i < 4; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.4})`; c.fillRect(Math.random() * W, Math.random() * 220, 1, 1); }
      if (d.glow) {
        const pulse = 0.7 + Math.sin(t * 1.2) * 0.3;
        const g = c.createRadialGradient(d.glow.x, d.glow.y, 0, d.glow.x, d.glow.y, d.glow.r * 2.5);
        g.addColorStop(0, `rgba(220,40,20,${(d.glow.red ? 0.45 : 0.22) * pulse})`); g.addColorStop(1, 'rgba(120,10,5,0)');
        c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
      }
      if (d.smokes) {
        if (Math.random() < 0.25) for (const sm of d.smokes) v.smoke.push({ x: sm.x, y: sm.y, a: 0.22, r: 6, vx: 6 + Math.random() * 8 });
        if (d.steam && Math.random() < 0.3) v.smoke.push({ x: d.steam.x + (Math.random() - 0.5) * 30, y: d.steam.y, a: 0.25, r: 10, vx: 3 });
      } else if (d.steam && Math.random() < 0.35) v.smoke.push({ x: d.steam.x + (Math.random() - 0.5) * 40, y: d.steam.y + 10, a: 0.28, r: 12, vx: (Math.random() - 0.5) * 6 });
      for (const p of v.smoke) { p.y -= 14 * dt; p.x += p.vx * dt; p.r += 7 * dt; p.a -= 0.035 * dt; }
      v.smoke = v.smoke.filter(p => p.a > 0);
      for (const p of v.smoke) { c.fillStyle = rgba(s.k === 'wrota' || s.k === 'kurhany' ? '#c9b8b0' : P.fog, p.a); c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
      if (d.fires) for (const f of d.fires) if (!f.night || (s.tod >= 2)) drawFire(c, f.x, f.y, f.s, t, f.warm);
      if (d.drips) for (const dr of d.drips) { const ph = (t * 0.6) % 1; c.fillStyle = 'rgba(140,20,15,.9)'; c.beginPath(); c.ellipse(dr.x, dr.y + ph * 40, 2.2, 3.4, 0, 0, TAU); c.fill(); }
      if (d.ribbon) { const r = d.ribbon; c.strokeStyle = '#b3241a'; c.lineWidth = 3.4; c.beginPath(); c.moveTo(r.x, r.y); c.bezierCurveTo(r.x + 10, r.y + 10 + Math.sin(t * 3) * 6, r.x + 20 + Math.sin(t * 2.2) * 6, r.y + 22, r.x + 26 + Math.sin(t * 3.3) * 8, r.y + 40); c.stroke(); }
      if (d.wisps && s.tod >= 2) for (let i = 0; i < 7; i++) { const wx = 120 + i * 120 + Math.sin(t * 0.5 + i * 2) * 40, wy = 350 + Math.sin(t * 0.8 + i) * 20 + (i % 3) * 30; const a = 0.5 + Math.sin(t * 2 + i * 3) * 0.4; const g = c.createRadialGradient(wx, wy, 0, wx, wy, 18); g.addColorStop(0, `rgba(180,255,190,${a})`); g.addColorStop(1, 'rgba(120,255,160,0)'); c.fillStyle = g; c.fillRect(wx - 18, wy - 18, 36, 36); }
      if (d.water && Math.random() < 0.02) v.smoke.push({ x: Math.random() * W, y: d.water + 30, a: 0.08, r: 20, vx: 0 });

      // postać
      const fig = s.enemy || s.fig;
      if (fig && FIG[fig]) {
        const col = s.k === 'chata' ? '#0c0806' : mix(P.near, '#000000', 0.4);
        const big = !!s.enemy;
        const sz = big ? (fig === 'pasterz' ? 380 : 320) : (s.k === 'chata' ? 300 : fig === 'pasterz' ? 360 : 230);
        const fx = big ? 520 : (s.k === 'chata' ? 660 : (d.fx || 620)), fy = big ? Math.min(d.gy || 480, 500) : (d.gy || 470);
        FIG[fig](c, fx, fy, sz, t, { col });
      }

      // mgła
      const fogA = clamp((s.fogAmt ?? 0.6) + (d.fogBoost || 0) + (d.interior ? -0.35 : 0) + mad * 0.25, 0, 1.3);
      if (fogA > 0.02) {
        const speeds = [9, 5, 15], ys = [0, 30, 0];
        for (let i = 0; i < 3; i++) {
          const f = v.fogs[i], off = (t * speeds[i] + i * 300) % (W * 2);
          c.globalAlpha = fogA * (i === 1 ? 0.55 : 0.42);
          c.drawImage(f, -off, ys[i]); c.drawImage(f, W * 2 - off, ys[i]);
        }
        c.globalAlpha = 1;
      }

      // ciemność i światło pochodni
      if (s.dark && s.k !== 'gardziel' && s.k !== 'serce') {
        const lx = 130, ly = 450;
        const lr = s.lit ? 420 + Math.sin(t * 9) * 12 + Math.sin(t * 23) * 7 : 170;
        const g = c.createRadialGradient(lx, ly, 10, lx + 200, ly - 120, lr * 1.5);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.4, `rgba(0,0,0,${s.lit ? 0.2 : 0.75})`); g.addColorStop(1, `rgba(0,0,0,${s.lit ? 0.9 : 0.97})`);
        c.fillStyle = g; c.fillRect(-20, -20, W + 40, H + 40);
        if (s.lit) { c.globalCompositeOperation = 'lighter'; const wg = c.createRadialGradient(lx, ly, 0, lx, ly, 380); wg.addColorStop(0, 'rgba(255,140,50,.22)'); wg.addColorStop(1, 'rgba(255,100,30,0)'); c.fillStyle = wg; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; drawTorch(c, t); }
      }
      if (s.k === 'chata' || s.k === 'ognisko') {
        const fl = 0.85 + Math.sin(t * 11) * 0.05 + Math.sin(t * 27) * 0.04;
        const g = c.createRadialGradient(480, 450, 30, 480, 420, 620 * fl);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.7)');
        c.fillStyle = g; c.fillRect(0, 0, W, H);
      }

      // oczy w ciemności
      if (mad > 0.08 || god > 0.3) {
        const want = Math.round(mad * 9 + god * 4);
        if (v.eyes.length < want && Math.random() < 0.02) v.eyes.push({ x: 40 + Math.random() * (W - 80), y: 60 + Math.random() * 300, life: 0, dur: 3 + Math.random() * 5, s: 2 + Math.random() * 2.5 });
        for (const e of v.eyes) e.life += dt;
        v.eyes = v.eyes.filter(e => e.life < e.dur);
        for (const e of v.eyes) {
          const a = Math.sin(Math.PI * e.life / e.dur), open = Math.sin(e.life * 3) > -0.9 ? 1 : 0.1;
          for (const dx of [-e.s * 3.4, e.s * 3.4]) {
            const g = c.createRadialGradient(e.x + dx, e.y, 0, e.x + dx, e.y, e.s * 5);
            g.addColorStop(0, `rgba(255,${god > mad ? 50 : 150},40,${0.75 * a})`); g.addColorStop(1, 'rgba(255,60,20,0)');
            c.fillStyle = g; c.fillRect(e.x + dx - e.s * 5, e.y - e.s * 5, e.s * 10, e.s * 10);
            c.fillStyle = `rgba(255,235,200,${0.8 * a})`; c.beginPath(); c.ellipse(e.x + dx, e.y, e.s * 0.8, e.s * 0.6 * open, 0, 0, TAU); c.fill();
          }
        }
      } else v.eyes.length = 0;
      c.restore();

      // złożenie: falowanie obrazu
      const ctx = v.ctx;
      let amp = (mad * 7 + (s.k === 'gardziel' ? (s.depth || 0) * 0.7 : 0)) * (calm ? 0.25 : 1);
      if (amp > 0.3) {
        ctx.clearRect(0, 0, W, H);
        const sl = 6;
        for (let y = 0; y < H; y += sl) {
          const off = Math.sin(y * 0.022 + t * 2.1) * amp + Math.sin(y * 0.061 - t * 3.3) * amp * 0.4;
          ctx.drawImage(v.buf, 0, y, W, sl, off, y, W, sl);
        }
      } else ctx.drawImage(v.buf, 0, 0);
      if (v.fade > 0) { ctx.globalAlpha = v.fade; ctx.drawImage(v.prev, 0, 0); ctx.globalAlpha = 1; v.fade = Math.max(0, v.fade - dt * 1.4); }

      // czerwień znamienia, winieta, ziarno, błysk
      if (god > 0 || s.tint) {
        const beat = Math.pow(Math.max(0, Math.sin(t * 2.4)), 6);
        const a = (god * 0.35 + (s.tint || 0)) * (0.7 + beat * 0.3);
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
        g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(130,8,4,${a})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      const vg = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, W * 0.68);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${0.55 + mad * 0.3})`);
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.07 + mad * 0.05; ctx.globalCompositeOperation = 'overlay';
      ctx.drawImage(grainC, -Math.random() * 200, -Math.random() * 200, W + 200, H + 200);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (v.flash > 0) { ctx.fillStyle = `rgba(${v.flashCol},${v.flash * 0.45})`; ctx.fillRect(0, 0, W, H); v.flash = Math.max(0, v.flash - dt * 3); }
      if (v.opts.amb && (v.ambN = (v.ambN || 0) + 1) % 10 === 1) v.opts.amb.getContext('2d').drawImage(v.canvas, 0, 0, 160, 90);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    view,
    setCalm(v) { calm = v; },
    FIGS: Object.keys(FIG),
    SCENES: Object.keys(SC),
  };
})();
