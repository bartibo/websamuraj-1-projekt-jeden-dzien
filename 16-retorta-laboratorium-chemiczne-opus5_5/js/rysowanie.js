/* Retorta – rysowanie stołu laboratoryjnego i widoku cząsteczkowego */
'use strict';
(function () {
  const P = {
    zlewka: { H: 132, full: 0.82, r: () => 52, grad: true },
    kolba: { H: 152, full: 0.6, r: y => y < 12 ? 56 + Math.sqrt(Math.max(0, 144 - (12 - y) * (12 - y))) * 0.5 : y < 104 ? 62 - 45 * ((y - 12) / 92) : 17, grad: true },
    probowka: { H: 150, full: 0.86, r: y => y < 15 ? Math.sqrt(Math.max(0.5, 225 - (15 - y) * (15 - y))) : 15 },
    tygiel: { H: 46, full: 0.86, r: y => 19 + 15 * (y / 46) }
  };
  for (const k in P) {
    const p = P[k]; p.cum = [0]; let c = 0;
    for (let y = 1; y <= p.H; y++) { const r = p.r(y - 0.5); c += Math.PI * r * r; p.cum.push(c); }
    p.k = R.VT[k].cap / p.cum[Math.round(p.H * p.full)];
  }
  function poziom(p, vol) {
    if (vol <= 0) return 0;
    const t = vol / p.k;
    if (t >= p.cum[p.H]) { const r = p.r(p.H); return p.H + (t - p.cum[p.H]) / (Math.PI * r * r); }
    let lo = 0, hi = p.H;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (p.cum[m] < t) lo = m; else hi = m; }
    const a = p.cum[lo], b = p.cum[hi]; return lo + (t - a) / (b - a || 1);
  }
  R.poziom = poziom; R.PROFIL = P;

  const Rys = R.Rys = { uklad: [], stan: {}, wybrany: 0, hover: -1, mrug: 0 };
  let cv, ctx, W = 0, H = 0, dpr = 1, czasA = 0;

  Rys.init = function (canvas) { cv = canvas; ctx = cv.getContext('2d'); Rys.resize(); };
  Rys.resize = function () {
    if (!cv) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  };
  const rs = v => Rys.stan[v.id] || (Rys.stan[v.id] = { bub: [], dots: [], dym: [], isk: [], pour: null, tool: null, spawn: 0, dspawn: 0, smspawn: 0, seed: Math.random() * 1000 });
  Rys.nalej = (v, col, stale) => { rs(v).pour = { t: 0.7, col, stale }; };
  Rys.narzedzie = (v, typ, extra) => { rs(v).tool = { t: 2.6, typ, extra: extra || {} }; };

  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const hx = R.hex2rgb;
  function rnd(seed) { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }

  /* ---------- układ ---------- */
  function liczUklad() {
    const n = R.naczynia.length;
    const slot = W / Math.max(1, n);
    const benchY = H - 30;
    Rys.uklad = R.naczynia.map((v, i) => {
      const p = P[v.typ];
      const s = Math.max(0.5, Math.min(1.6, slot / 175, (H - 90) / 290));
      const podst = v.typ === 'probowka' ? 96 : v.typ === 'tygiel' ? 86 : 74;
      const by = benchY - podst * s;
      const cx = slot * (i + 0.5);
      const top = by - p.H * s;
      return { v, cx, by, s, p, x0: cx - slot / 2 + 4, x1: cx + slot / 2 - 4, y0: Math.max(0, top - 70 * s), y1: benchY + 4, top, benchY };
    });
  }
  Rys.trafienie = function (x, y) {
    for (let i = 0; i < Rys.uklad.length; i++) { const u = Rys.uklad[i]; if (x >= u.x0 && x <= u.x1 && y >= u.y0 && y <= u.y1) return i; }
    return -1;
  };
  Rys.pozycja = i => Rys.uklad[i];

  function sciezka(u, y0, y1, poszerz) {
    const { p, cx, by, s } = u; const e = poszerz || 0;
    ctx.beginPath();
    for (let y = y1; y >= y0; y -= 2) ctx.lineTo(cx - (p.r(Math.min(y, p.H)) + e) * s, by - y * s);
    ctx.lineTo(cx - (p.r(y0) + e) * s, by - y0 * s);
    for (let y = y0; y <= y1; y += 2) ctx.lineTo(cx + (p.r(Math.min(y, p.H)) + e) * s, by - y * s);
    ctx.lineTo(cx + (p.r(Math.min(y1, p.H)) + e) * s, by - y1 * s);
    ctx.closePath();
  }

  /* ---------- tło ---------- */
  function tlo() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#16253b'); g.addColorStop(0.75, '#1b2d45'); g.addColorStop(1, '#14202f');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // kafelki ściany
    ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
    const kt = 46;
    for (let y = 0; y < H - 30; y += kt) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let x = 0; x < W; x += kt) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H - 30); ctx.stroke(); }
    // blat
    const by = H - 30;
    const g2 = ctx.createLinearGradient(0, by, 0, H);
    g2.addColorStop(0, '#3b4a5e'); g2.addColorStop(0.15, '#2b3748'); g2.addColorStop(1, '#1d2633');
    ctx.fillStyle = g2; ctx.fillRect(0, by, W, H - by);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, by, W, 1.5);
  }

  /* ---------- palnik, statyw, łaźnia ---------- */
  function palnik(u, t) {
    const { cx, s, benchY, v, by } = u;
    const pw = 15 * s, ph = 46 * s, py = benchY - ph;
    // statyw / trójnóg
    ctx.strokeStyle = '#6d7787'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
    if (v.typ === 'probowka') {
      const sx = cx - 62 * s;
      ctx.beginPath(); ctx.moveTo(sx, benchY); ctx.lineTo(sx, by - 150 * s); ctx.stroke();
      ctx.fillStyle = '#4b5463'; ctx.fillRect(sx - 18 * s, benchY - 5 * s, 36 * s, 5 * s);
      ctx.beginPath(); ctx.moveTo(sx, by - 105 * s); ctx.lineTo(cx - 17 * s, by - 105 * s); ctx.stroke();
      ctx.fillStyle = '#8b6b48'; ctx.fillRect(cx - 21 * s, by - 112 * s, 42 * s, 13 * s);
    } else {
      const ty = by + 2 * s, half = (v.typ === 'tygiel' ? 30 : 58) * s;
      ctx.beginPath();
      ctx.moveTo(cx - half, ty); ctx.lineTo(cx - half - 8 * s, benchY);
      ctx.moveTo(cx + half, ty); ctx.lineTo(cx + half + 8 * s, benchY);
      ctx.moveTo(cx - half - 4 * s, ty); ctx.lineTo(cx + half + 4 * s, ty);
      ctx.stroke();
      if (v.typ === 'tygiel') { ctx.strokeStyle = '#e8e1d2'; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.moveTo(cx - 26 * s, ty - 1); ctx.lineTo(cx + 26 * s, ty - 1); ctx.stroke(); }
      else { ctx.fillStyle = '#9aa3ad'; ctx.fillRect(cx - 56 * s, ty - 1.5 * s, 112 * s, 3 * s); ctx.fillStyle = '#e9e4da'; ctx.beginPath(); ctx.arc(cx, ty, 14 * s, 0, Math.PI, true); ctx.fill(); }
    }
    // palnik Bunsena
    ctx.fillStyle = '#39414d'; ctx.beginPath(); ctx.ellipse(cx, benchY - 2 * s, 20 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createLinearGradient(cx - pw / 2, 0, cx + pw / 2, 0);
    g.addColorStop(0, '#5b6575'); g.addColorStop(0.45, '#a7b0bd'); g.addColorStop(1, '#4b5462');
    ctx.fillStyle = g; ctx.fillRect(cx - pw / 2, py, pw, ph - 3 * s);
    ctx.fillStyle = '#2b313a'; ctx.fillRect(cx - pw / 2 - 2 * s, py + ph * 0.6, pw + 4 * s, 6 * s);
    if (v.burner) {
      const fy = py, fl = (v.typ === 'probowka' ? 40 : 30) * s * (1 + 0.06 * Math.sin(t * 31 + cx));
      const g2 = ctx.createRadialGradient(cx, fy - fl * 0.4, 1, cx, fy - fl * 0.4, fl);
      g2.addColorStop(0, 'rgba(160,210,255,0.95)'); g2.addColorStop(0.5, 'rgba(70,120,255,0.55)'); g2.addColorStop(1, 'rgba(40,60,255,0)');
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.moveTo(cx - pw * 0.55, fy); ctx.quadraticCurveTo(cx - pw * 0.7, fy - fl * 0.6, cx, fy - fl); ctx.quadraticCurveTo(cx + pw * 0.7, fy - fl * 0.6, cx + pw * 0.55, fy); ctx.fill();
      ctx.fillStyle = 'rgba(120,200,255,0.9)';
      ctx.beginPath(); ctx.moveTo(cx - pw * 0.3, fy); ctx.quadraticCurveTo(cx, fy - fl * 0.55, cx + pw * 0.3, fy); ctx.fill();
    }
  }
  function lazniaLod(u, t) {
    const { cx, by, s, p } = u; if (!u.v.ice) return;
    const w = (p.r(Math.min(p.H * 0.4, p.H)) + 24) * s, h = Math.min(p.H * 0.55, 64) * s;
    ctx.fillStyle = 'rgba(140,200,255,0.22)'; ctx.strokeStyle = 'rgba(190,230,255,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - w, by - h); ctx.lineTo(cx - w + 6 * s, by + 6 * s); ctx.lineTo(cx + w - 6 * s, by + 6 * s); ctx.lineTo(cx + w, by - h); ctx.stroke(); ctx.fill();
    for (let i = 0; i < 7; i++) {
      const x = cx - w + 10 * s + rnd(i + 3) * (2 * w - 20 * s), y = by - rnd(i + 9) * h * 0.8;
      if (Math.abs(x - cx) < p.r(5) * s + 4) continue;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rnd(i) * 1.5);
      ctx.fillStyle = 'rgba(235,248,255,0.75)'; ctx.fillRect(-6 * s, -6 * s, 12 * s, 12 * s); ctx.restore();
    }
  }

  /* ---------- ciała stałe ---------- */
  function osadzone(u) {
    const { v } = u; let g = 0; const c = [0, 0, 0]; let kr = 0;
    for (const k in v.sol) {
      const s = R.SOLID[k]; if (!s) continue;
      if (['osad', 'proszek', 'krysztaly', 'klaczki'].includes(s.form) || s.dyn || (s.form === 'nalot' && !maGospodarza(v, k))) {
        const m = v.sol[k] * R.M(k) * (1 - (v.susp[k] || 0)); if (m <= 1e-6) continue;
        const col = R.kolorSolid(k, v); const w = Math.sqrt(m);
        for (let i = 0; i < 3; i++) c[i] += col[i] * w; g += m; kr += w;
      }
    }
    if (g <= 1e-6) return 0;
    return { h: Math.min(u.p.H * 0.32, 3 + 9 * Math.sqrt(g)), col: c.map(x => Math.round(x / kr)) };
  }
  function maGospodarza(v, k) { return Object.keys(v.sol).some(x => x !== k && R.SOLID[x] && R.SOLID[x].metal && !['Ag', 'Pb'].includes(x) && v.sol[x] > 1e-6); }
  function warstwaOsadu(u, os) {
    if (!os) return;
    const { p } = u;
    ctx.save(); sciezka(u, 0, os.h); ctx.clip();
    const g = ctx.createLinearGradient(0, u.by - os.h * u.s, 0, u.by);
    g.addColorStop(0, rgba(os.col, 0.85)); g.addColorStop(1, rgba(os.col.map(x => x * 0.82), 1));
    ctx.fillStyle = g; ctx.fillRect(u.cx - p.r(p.H) * u.s - 30, u.by - os.h * u.s - 2, (p.r(p.H) * 2 + 60) * u.s, os.h * u.s + 6);
    // ziarnistość
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 26; i++) { const x = u.cx + (rnd(i * 7.1) - 0.5) * 2 * p.r(os.h * 0.5) * u.s; const y = u.by - rnd(i * 3.3) * os.h * u.s; ctx.fillRect(x, y, 1.6, 1.6); }
    ctx.restore();
  }
  function bryly(u, t, os) {
    const { v, cx, by, s, p } = u;
    const baseY = (os ? os.h : 0) + 2;
    const surf = poziom(p, v.liq);
    const metale = Object.keys(v.sol).filter(k => R.SOLID[k] && R.SOLID[k].metal && !['Ag', 'Pb'].includes(k));
    const nalot = {}; for (const k of ['Cu', 'Ag', 'Pb', 'Fe', 'Zn']) if (v.coat[k] && v.sol[k] > 1e-7) nalot[k] = v.sol[k];
    let idx = 0;
    for (const k in v.sol) {
      const sd = R.SOLID[k]; const n = v.sol[k]; if (!sd || n < 1e-7) continue;
      const m = n * R.M(k); const col = hx(sd.col);
      let kol = col;
      if (sd.metal && metale[0] === k) {
        // nalot na gospodarzu
        for (const d in nalot) if (d !== k) { const f = Math.min(0.85, nalot[d] / (n + nalot[d]) * 3); const dc = d === 'Cu' ? [176, 84, 46] : d === 'Pb' ? [110, 115, 122] : d === 'Ag' ? [215, 220, 225] : [120, 120, 125]; kol = kol.map((x, i) => Math.round(x + (dc[i] - x) * f)); }
      }
      const sz = Math.min(1.6, 0.55 + Math.cbrt(m) * 0.7);
      const pływa = (sd.form === 'kawalek' && sd.metal && v.liq > 0.3);
      const xr = (rnd(idx + 1) - 0.5) * p.r(baseY + 5) * 0.9;
      idx++;
      ctx.save();
      const x0 = cx + xr * s, y0 = by - baseY * s;
      switch (sd.form) {
        case 'wstazka': {
          ctx.strokeStyle = rgba(kol, 1); ctx.lineWidth = 3.2 * s; ctx.lineCap = 'round';
          ctx.beginPath(); const L = 30 * sz * s;
          ctx.moveTo(x0 - L / 2, y0 - 3 * s); ctx.bezierCurveTo(x0 - L / 4, y0 - 16 * s * sz, x0 + L / 4, y0 + 4 * s, x0 + L / 2, y0 - 8 * s * sz); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.stroke(); break;
        }
        case 'granulki': case 'grudki': {
          const cnt = Math.max(1, Math.min(7, Math.round(1 + m * 2.2)));
          for (let i = 0; i < cnt; i++) {
            const gx = x0 + (rnd(i * 5 + idx) - 0.5) * p.r(baseY + 4) * 1.3 * s, r = (sd.form === 'grudki' ? 6 : 4.5) * sz * s * (0.75 + rnd(i * 13 + idx) * 0.5);
            const gy = y0 - r * 0.7;
            ctx.fillStyle = rgba(kol, 1);
            ctx.beginPath();
            for (let a = 0; a < 7; a++) { const an = a / 7 * Math.PI * 2, rr = r * (0.75 + rnd(i * 31 + a + idx) * 0.4); ctx.lineTo(gx + Math.cos(an) * rr, gy + Math.sin(an) * rr * 0.8); }
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.beginPath(); ctx.arc(gx - r * 0.3, gy - r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
          }
          break;
        }
        case 'blaszka': {
          ctx.translate(x0, y0); ctx.rotate(-0.35);
          const w = 11 * s * sz, h = 38 * s * sz;
          const g = ctx.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, rgba(kol, 1)); g.addColorStop(0.5, rgba(kol.map(x => Math.min(255, x + 50)), 1)); g.addColorStop(1, rgba(kol, 1));
          ctx.fillStyle = g; ctx.fillRect(-w / 2, -h, w, h);
          if (nalot.Ag) { // srebrne drzewko
            const f = Math.min(1, nalot.Ag * 400);
            ctx.strokeStyle = 'rgba(235,240,245,0.9)'; ctx.lineWidth = 1.2;
            for (let i = 0; i < 18 * f + 3; i++) {
              const yy = -rnd(i) * h, side = i % 2 ? 1 : -1, len = (4 + rnd(i + 7) * 12) * s * f + 2;
              ctx.beginPath(); ctx.moveTo(side * w / 2, yy); ctx.lineTo(side * (w / 2 + len), yy - len * 0.5); ctx.lineTo(side * (w / 2 + len * 1.3), yy - len * 0.2); ctx.stroke();
              if ((t * 3 + i) % 4 < 0.3) { ctx.fillStyle = '#fff'; ctx.fillRect(side * (w / 2 + len), yy - len * 0.5, 2, 2); }
            }
          }
          break;
        }
        case 'opilki': {
          ctx.fillStyle = rgba(kol, 1);
          const cnt = Math.min(90, 20 + m * 25);
          for (let i = 0; i < cnt; i++) { const gx = x0 + (rnd(i * 2.7 + idx) - 0.5) * p.r(baseY + 2) * 1.6 * s; const gy = y0 - rnd(i * 1.9) * 7 * s * sz; ctx.fillRect(gx, gy, 2.2 * s, 1.2 * s); }
          break;
        }
        case 'folia': {
          ctx.fillStyle = rgba(kol, 1); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1;
          ctx.beginPath(); const r = 10 * sz * s;
          for (let a = 0; a < 9; a++) { const an = a / 9 * Math.PI * 2, rr = r * (0.6 + rnd(a * 3 + idx) * 0.6); ctx.lineTo(x0 + Math.cos(an) * rr, y0 - r * 0.8 + Math.sin(an) * rr * 0.7); }
          ctx.closePath(); ctx.fill(); ctx.stroke(); break;
        }
        case 'kawalek': {
          let kx = x0, ky = y0 - 6 * s * sz;
          if (pływa) {
            const rw = p.r(Math.min(surf, p.H)) - 8;
            kx = cx + Math.sin(t * 2.7 + idx) * rw * 0.75 * s; ky = by - surf * s - 1;
            const r = 5 * s * Math.min(1.3, sz);
            ctx.fillStyle = 'rgba(235,240,245,1)'; ctx.beginPath(); ctx.arc(kx, ky, r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(kx, ky, r + 3 + Math.sin(t * 20) * 1.5, 0, Math.PI * 2); ctx.stroke();
            if (k === 'K' || v.kFlame > 0) { flameShape(kx, ky - r, 16 * s, [190, 130, 255], t); }
          } else if (k === 'ziemniak') {
            ctx.fillStyle = rgba(R.kolorSolid(k, v), 1);
            ctx.beginPath(); ctx.ellipse(kx, ky, 13 * s, 8 * s, 0.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(160,120,60,0.6)'; ctx.fillRect(kx - 12 * s, ky - 2 * s, 3 * s, 3 * s);
          } else {
            const w = 9 * s * sz; ctx.fillStyle = rgba(kol, 1); ctx.fillRect(kx - w / 2, ky - w / 2, w, w); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(kx - w / 2, ky - w / 2, w, 2);
          }
          break;
        }
        case 'waz': {
          const hh = Math.min(p.H * 2.2, 30 + 260 * Math.sqrt(n)) * s;
          const rw = p.r(p.H) * 0.62 * s;
          ctx.fillStyle = '#141414';
          ctx.beginPath(); ctx.moveTo(cx - rw, by - 2);
          for (let y = 0; y <= hh; y += 6) ctx.lineTo(cx - rw * (0.85 + 0.15 * Math.sin(y * 0.11 + 1)) + Math.sin(y * 0.05) * 6 * s, by - y);
          for (let y = hh; y >= 0; y -= 6) ctx.lineTo(cx + rw * (0.85 + 0.15 * Math.sin(y * 0.13)) + Math.sin(y * 0.05) * 6 * s, by - y);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(70,70,70,0.9)';
          for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(cx + (rnd(i * 4.1) - 0.5) * rw * 1.5, by - rnd(i * 2.3) * hh, 1.5 + rnd(i) * 2.5 * s, 0, Math.PI * 2); ctx.fill(); }
          break;
        }
        case 'lustro': case 'nalot': case 'osad': case 'proszek': case 'krysztaly': case 'klaczki': break;
        default: break;
      }
      ctx.restore();
    }
    // kryształki na wierzchu osadu
    if (os) {
      for (const k in v.sol) {
        const sd = R.SOLID[k]; if (!sd || sd.form !== 'krysztaly') continue;
        const m = v.sol[k] * R.M(k) * (1 - (v.susp[k] || 0)); if (m < 0.01) continue;
        const col = R.kolorSolid(k, v); const cnt = Math.min(14, 2 + m * 4);
        for (let i = 0; i < cnt; i++) {
          const x = cx + (rnd(i * 3.7 + k.length) - 0.5) * p.r(os.h) * 1.6 * s, y = by - os.h * s + 1, r = (2.5 + rnd(i * 9.1) * 3.5) * s;
          ctx.fillStyle = rgba(col.map(c => Math.min(255, c + 20)), 0.95);
          ctx.beginPath(); ctx.moveTo(x, y - r * 1.4); ctx.lineTo(x + r, y - r * 0.3); ctx.lineTo(x + r * 0.5, y + 1); ctx.lineTo(x - r * 0.6, y + 1); ctx.lineTo(x - r, y - r * 0.5); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.8; ctx.stroke();
        }
      }
    }
  }

  function flameShape(x, y, h, col, t, alpha) {
    const a = alpha === undefined ? 1 : alpha;
    const fl = h * (1 + 0.1 * Math.sin(t * 27 + x));
    const g = ctx.createRadialGradient(x, y - fl * 0.35, 1, x, y - fl * 0.3, fl * 0.9);
    g.addColorStop(0, `rgba(255,255,240,${0.95 * a})`); g.addColorStop(0.35, rgba(col, 0.85 * a)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - h * 0.35, y); ctx.quadraticCurveTo(x - h * 0.45, y - fl * 0.55, x + Math.sin(t * 9) * h * 0.1, y - fl); ctx.quadraticCurveTo(x + h * 0.45, y - fl * 0.55, x + h * 0.35, y); ctx.closePath(); ctx.fill();
  }

  /* ---------- naczynie ---------- */
  function rysujNaczynie(u, i, t, dt) {
    const { v, cx, by, s, p } = u;
    const st = rs(v);
    lazniaLod(u, t);
    // wnętrze szkła
    sciezka(u, 0, p.H); ctx.fillStyle = v.typ === 'tygiel' ? 'rgba(240,236,228,0.95)' : 'rgba(200,225,255,0.05)'; ctx.fill();
    if (v.typ === 'tygiel') {
      ctx.save(); sciezka(u, 0, p.H); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(cx, by - p.H * s, 40 * s, p.H * s); ctx.restore();
    }
    const os = osadzone(u);
    warstwaOsadu(u, os);
    bryly(u, t, os);
    const hl = Math.min(p.H + 0.5, poziom(p, v.liq));
    const ho = Math.min(p.H + 0.5, poziom(p, v.liq + v.oil));
    // ciecz
    if (v.liq > 0.005) {
      const k = R.kolorCieczy(v);
      const al = Math.min(0.92, Math.max(0.17, k.a * 0.88 + 0.12));
      sciezka(u, 0, hl);
      ctx.fillStyle = `rgba(${k.r},${k.g},${k.b},${al})`;
      if (!k.a) ctx.fillStyle = 'rgba(190,220,255,0.2)';
      ctx.fill();
      const mt = R.metnosc(v);
      if (mt) { ctx.fillStyle = rgba(mt.col, mt.a); ctx.fill(); }
      // połysk
      ctx.save(); ctx.clip();
      const g = ctx.createLinearGradient(cx - p.r(hl / 2) * s, 0, cx + p.r(hl / 2) * s, 0);
      g.addColorStop(0, 'rgba(255,255,255,0.14)'); g.addColorStop(0.3, 'rgba(255,255,255,0)'); g.addColorStop(0.8, 'rgba(0,0,0,0.08)');
      ctx.fillStyle = g; ctx.fillRect(cx - 80 * s, by - hl * s - 2, 160 * s, hl * s + 4);
      ctx.restore();
      // zawieszone drobiny
      if (mt && st.dots.length < 70 && Math.random() < mt.a * 2 * dt * 30) st.dots.push({ x: (Math.random() - 0.5) * 2, y: Math.random() * hl, vy: -2 - Math.random() * 3, c: mt.col, life: 3 + Math.random() * 3 });
      // powierzchnia
      if (v.typ !== 'probowka' || true) {
        const rr = p.r(Math.min(hl, p.H)) * s;
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(cx, by - hl * s, rr, Math.max(1.5, rr * 0.09), 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // drobiny
    for (let j = st.dots.length - 1; j >= 0; j--) {
      const d = st.dots[j]; d.y += d.vy * dt * (v.stir > 0 ? -1.5 : 1); d.life -= dt;
      if (v.stir > 0) d.x += Math.sin(t * 4 + j) * dt * 0.8;
      if (d.life <= 0 || d.y < 0 || d.y > hl) { st.dots.splice(j, 1); continue; }
      const rr = p.r(d.y) * 0.9; const x = cx + Math.max(-1, Math.min(1, d.x)) * rr * s;
      ctx.fillStyle = rgba(d.c.map(x => x * 0.9), 0.7); ctx.fillRect(x, by - d.y * s, 2, 2);
    }
    if (v.zloto > 0 && R.S(v, 'PbI2') > 1e-6) {
      for (let j = 0; j < 22; j++) {
        const yy = (rnd(j * 3.1) * hl + t * (6 + rnd(j) * 6)) % Math.max(1, hl); const y = hl - yy;
        const x = cx + (rnd(j * 7.3) - 0.5) * 1.6 * p.r(y) * s;
        const tw = 0.5 + 0.5 * Math.sin(t * 6 + j * 2);
        ctx.fillStyle = `rgba(255,215,40,${0.5 + 0.5 * tw})`; ctx.save(); ctx.translate(x, by - y * s); ctx.rotate(t + j); ctx.fillRect(-2.5, -1, 5, 2); ctx.restore();
      }
    }
    // olej
    if (v.oil > 0.01) {
      sciezka(u, hl, ho); ctx.fillStyle = `rgba(242,205,80,${0.55 * (1 - v.emul * 0.85)})`; ctx.fill();
      if (v.emul > 0.05 && v.liq > 0) { ctx.save(); sciezka(u, 0, hl); ctx.clip(); ctx.fillStyle = 'rgba(245,215,120,0.6)'; for (let j = 0; j < 40 * v.emul; j++) { const y = rnd(j * 1.7 + Math.floor(t * 2)) * hl; ctx.beginPath(); ctx.arc(cx + (rnd(j * 2.9) - 0.5) * 1.6 * p.r(y) * s, by - y * s, 1.5 + rnd(j) * 2, 0, Math.PI * 2); ctx.fill(); } ctx.restore(); }
    }
    // pęcherzyki
    const bub = v.bub + v.bubIn * 0.8;
    const wrz = v.steam > 0.001 && v.liq > 0.3;
    if (v.liq > 0.3) {
      st.spawn += dt * (Math.min(90, bub * 80000) + (wrz ? 25 : 0));
      while (st.spawn > 1 && st.bub.length < 160) {
        st.spawn -= 1;
        const zMetalu = Object.keys(v.sol).some(k => R.SOLID[k] && (R.SOLID[k].metal || k === 'MnO2' || k === 'CaCO3m' || k === 'ziemniak'));
        const y = (zMetalu && Math.random() < 0.7) ? (os ? os.h : 0) + 4 : Math.random() * hl * 0.6;
        st.bub.push({ x: (Math.random() - 0.5) * 1.6, y, r: (wrz && Math.random() < 0.4 ? 2.5 + Math.random() * 3 : 0.8 + Math.random() * 1.8), w: Math.random() * 6 });
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 0.9;
    for (let j = st.bub.length - 1; j >= 0; j--) {
      const b = st.bub[j]; b.y += (30 + b.r * 12) * dt; b.w += dt * 5;
      if (b.y >= hl || v.liq < 0.3) { st.bub.splice(j, 1); continue; }
      const rr = p.r(b.y) * 0.85; const x = cx + (b.x * rr + Math.sin(b.w) * 1.5) * s;
      ctx.beginPath(); ctx.arc(x, by - b.y * s, b.r * s, 0, Math.PI * 2); ctx.stroke();
    }
    // piana
    if (v.foam > 1) {
      const hf = poziom(p, v.liq + v.oil + v.foam);
      const htop = Math.min(hf, p.H + 70);
      ctx.save();
      ctx.fillStyle = 'rgba(250,250,245,0.95)';
      const fc = R.kolorCieczy(v); const tint = fc.a > 0.2 ? `rgba(${fc.r},${fc.g},${fc.b},0.35)` : null;
      for (let y = ho; y < htop; y += 4) {
        const rr = (y <= p.H ? p.r(y) : p.r(p.H) * (1 - (y - p.H) / 120)) * s;
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(cx + (rnd(y * 3 + k) - 0.5) * 1.8 * rr, by - y * s, (3 + rnd(y + k * 7) * 4) * s, 0, Math.PI * 2); ctx.fill(); }
      }
      if (tint) { ctx.fillStyle = tint; sciezka(u, ho, Math.min(htop, p.H)); ctx.fill(); }
      if (hf > p.H + 10) { // spływa po ściankach
        const sp = Math.min(p.H, (hf - p.H) * 0.8);
        ctx.fillStyle = 'rgba(250,250,245,0.92)';
        for (const sg of [-1, 1]) for (let y = p.H; y > p.H - sp; y -= 4) { ctx.beginPath(); ctx.arc(cx + sg * (p.r(Math.min(y, p.H)) + 4) * s, by - y * s, (3 + rnd(y * 5 + sg) * 3) * s, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
    }
    // lustro srebrne
    if (v.mirror > 0) {
      ctx.save(); sciezka(u, 0, Math.max(hl, 10)); ctx.lineWidth = 5 * s; ctx.strokeStyle = `rgba(225,230,236,${0.4 + 0.55 * v.mirror})`; ctx.stroke();
      ctx.clip(); const g = ctx.createLinearGradient(cx - 50 * s, 0, cx + 50 * s, 0); g.addColorStop(0, `rgba(240,244,248,${0.7 * v.mirror})`); g.addColorStop(0.5, `rgba(160,168,178,${0.4 * v.mirror})`); g.addColorStop(1, `rgba(240,244,248,${0.7 * v.mirror})`); ctx.fillStyle = g; ctx.fillRect(cx - 80 * s, by - hl * s, 160 * s, hl * s); ctx.restore();
    }
    // szkło
    if (v.typ !== 'tygiel') {
      ctx.save();
      sciezka(u, 0, p.H, 1.5); ctx.strokeStyle = 'rgba(220,235,255,0.75)'; ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let y = p.H; y >= 0; y -= 2) ctx.lineTo(cx - (p.r(y) + 1.5) * s, by - y * s);
      for (let y = 0; y <= p.H; y += 2) ctx.lineTo(cx + (p.r(y) + 1.5) * s, by - y * s);
      ctx.stroke();
      // wylew/kołnierz
      ctx.beginPath(); ctx.ellipse(cx, by - p.H * s, (p.r(p.H) + 3) * s, Math.max(2, p.r(p.H) * 0.12 * s), 0, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(230,240,255,0.6)'; ctx.stroke();
      // refleks
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3 * s;
      ctx.beginPath(); ctx.moveTo(cx - (p.r(p.H * 0.8) - 6) * s, by - p.H * 0.85 * s); ctx.lineTo(cx - (p.r(p.H * 0.25) - 6) * s, by - p.H * 0.2 * s); ctx.stroke();
      if (p.grad) {
        ctx.fillStyle = 'rgba(230,240,255,0.55)'; ctx.font = `${9 * s}px system-ui`; ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(230,240,255,0.5)';
        for (const ml of [50, 100, 150, 200]) { const y = poziom(p, ml); if (y > p.H) continue; const x = cx + (p.r(y) - 2) * s; ctx.beginPath(); ctx.moveTo(x - 10 * s, by - y * s); ctx.lineTo(x, by - y * s); ctx.stroke(); ctx.fillText(ml, x - 28 * s, by - y * s + 3 * s); }
      }
      ctx.restore();
    } else {
      sciezka(u, 0, p.H, 3); ctx.strokeStyle = '#d9d2c4'; ctx.lineWidth = 3 * s; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, by - p.H * s, (p.r(p.H) + 3) * s, 5 * s, 0, 0, Math.PI * 2); ctx.strokeStyle = '#f3efe6'; ctx.lineWidth = 2; ctx.stroke();
      if (v.T > 450) { sciezka(u, 0, p.H, 3); ctx.fillStyle = `rgba(255,${Math.max(60, 200 - (v.T - 450) / 3)},40,${Math.min(0.45, (v.T - 450) / 900)})`; ctx.fill(); }
    }
    // żar mieszaniny Fe+S
    if (v.glow > 0) { const g = ctx.createRadialGradient(cx, by - 8 * s, 2, cx, by - 8 * s, 40 * s); g.addColorStop(0, `rgba(255,170,60,${0.8 * v.glow})`); g.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = g; ctx.fillRect(cx - 50 * s, by - 50 * s, 100 * s, 60 * s); }
    // mieszanie bagietką
    if (v.stir > 0) {
      const a = Math.sin(t * 9) * 0.25; ctx.save(); ctx.translate(cx + Math.sin(t * 9) * p.r(p.H) * 0.4 * s, by - 6 * s); ctx.rotate(0.25 + a);
      ctx.strokeStyle = 'rgba(230,245,255,0.85)'; ctx.lineWidth = 3.5 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -(p.H + 30) * s); ctx.stroke(); ctx.restore();
    }
    // spalanie
    const mouthY = by - (v.typ === 'tygiel' ? Math.max(6, (os ? os.h : 0) + 6) : p.H) * s;
    if (v.burn) {
      const pl = R.SPAL[v.burn].plom;
      const kol = { mg: [255, 255, 255], s: [80, 110, 255], c: [255, 130, 40], fe: [255, 190, 90], na: [255, 200, 40], k: [190, 130, 255], li: [255, 40, 90], ca: [255, 110, 40] }[pl];
      if (pl === 'mg') {
        const g = ctx.createRadialGradient(cx, mouthY - 10 * s, 2, cx, mouthY - 10 * s, 120 * s);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.2, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(cx - 130 * s, mouthY - 140 * s, 260 * s, 200 * s);
      }
      if (pl === 'fe' || pl === 'mg') for (let j = 0; j < (pl === 'fe' ? 6 : 2); j++) st.isk.push({ x: cx, y: mouthY - 4 * s, vx: (Math.random() - 0.5) * 220, vy: -80 - Math.random() * 180, life: 0.5 + Math.random() * 0.6 });
      flameShape(cx, mouthY, (pl === 'c' ? 14 : pl === 's' ? 22 : 40) * s, kol, t, pl === 's' ? 0.85 : 1);
      if (pl === 'mg' || pl === 'na' || pl === 'ca' || pl === 'li') st.smspawn += dt * 14;
    }
    if (v.etohFire) flameShape(cx, by - hl * s, 34 * s, [80, 120, 255], t, 0.6);
    for (let j = st.isk.length - 1; j >= 0; j--) { const k = st.isk[j]; k.x += k.vx * dt; k.y += k.vy * dt; k.vy += 300 * dt; k.life -= dt; if (k.life <= 0) { st.isk.splice(j, 1); continue; } ctx.fillStyle = `rgba(255,${180 + Math.random() * 70},80,${k.life * 1.5})`; ctx.fillRect(k.x, k.y, 2.2, 2.2); }
    // gazy i dym nad naczyniem
    const kolorGazu = [];
    for (const g in v.head) { const G = R.GAZ[g]; if (G && G.kol && v.head[g] > 2e-6) kolorGazu.push([G.kol, Math.min(1, v.head[g] * 3000)]); }
    for (const g in v.vap) { const G = R.GAZ[g]; const ile = v.vap[g]; if (ile > 1e-6) kolorGazu.push([G && G.kol ? G.kol : [235, 235, 240], Math.min(1, ile * 600)]); }
    if (v.steam > 0.002) kolorGazu.push([[240, 240, 245], Math.min(1, v.steam * 6)]);
    if (v.vap.HCl && v.vap.NH3) kolorGazu.push([[250, 250, 250], 1]);
    for (const [kol, a] of kolorGazu) { st.smspawn += dt * 12 * a; st.lastSm = kol; st.lastA = a; }
    while (st.smspawn > 1 && st.dym.length < 90) { st.smspawn -= 1; const kol = st.lastSm || [240, 240, 240]; st.dym.push({ x: cx + (Math.random() - 0.5) * p.r(p.H) * s, y: mouthY, vx: (Math.random() - 0.5) * 12, vy: -18 - Math.random() * 20, r: 5 * s, life: 2.5, c: kol, a: 0.25 + 0.3 * (st.lastA || 0.5) }); }
    if (st.smspawn > 3) st.smspawn = 3;
    for (let j = st.dym.length - 1; j >= 0; j--) {
      const d = st.dym[j]; d.x += d.vx * dt; d.y += d.vy * dt; d.r += 9 * dt; d.life -= dt;
      if (d.life <= 0) { st.dym.splice(j, 1); continue; }
      ctx.fillStyle = rgba(d.c, d.a * d.life / 2.5); ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
    // nalewanie
    if (st.pour) {
      st.pour.t -= dt;
      const c = hx(st.pour.col.startsWith('#') ? st.pour.col : '#cfe8ff');
      if (st.pour.stale) { for (let j = 0; j < 10; j++) { ctx.fillStyle = rgba(c, 0.9); ctx.fillRect(cx - 4 + Math.random() * 8, u.y0 + Math.random() * (by - hl * s - u.y0), 2.5, 2.5); } }
      else { ctx.strokeStyle = rgba(c.map(x => Math.min(255, x)), 0.75); ctx.lineWidth = 3 * s * Math.min(1, st.pour.t * 3); ctx.beginPath(); ctx.moveTo(cx + 3, u.y0); ctx.quadraticCurveTo(cx, (u.y0 + by - hl * s) / 2, cx, by - hl * s); ctx.stroke(); }
      if (st.pour.t <= 0) st.pour = null;
    }
    // rurka
    if (v.tube != null) {
      const j = R.naczynia.findIndex(x => x.id === v.tube);
      if (j >= 0) {
        const w = Rys.uklad[j];
        const x1 = cx, y1 = by - p.H * s - 2, x2 = w.cx + (w.p.r(10) * 0.4) * w.s, y2 = w.by - 8 * w.s;
        const topY = Math.min(y1, w.top) - 40 * s;
        ctx.strokeStyle = 'rgba(150,110,80,0.9)'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1 + 8 * s); ctx.lineTo(x1, y1 - 6 * s); ctx.bezierCurveTo(x1, topY, x2, topY, x2, w.top - 6 * w.s); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.strokeStyle = 'rgba(220,235,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#5b4a3d'; ctx.fillRect(x1 - (p.r(p.H) + 2) * s, y1 - 4 * s, (p.r(p.H) + 2) * 2 * s, 7 * s);
      }
    }
    // termometr / etykieta
    ctx.font = `600 ${Math.max(10, 12 * s)}px system-ui`; ctx.textAlign = 'center';
    const lit = String.fromCharCode(65 + i);
    const etykieta = `${lit} · ${R.VT[v.typ].kr}`;
    ctx.fillStyle = i === Rys.wybrany ? '#7ef0c8' : 'rgba(220,230,245,0.75)';
    ctx.fillText(etykieta, cx, u.benchY + 19);
    const Ttxt = Math.round(v.T) + ' °C';
    const tx = cx + (p.r(p.H) + 10) * s, ty = by - p.H * s - 4;
    ctx.font = `700 ${Math.max(10, 11 * s)}px system-ui`; const tw = ctx.measureText(Ttxt).width + 12;
    const Tc = v.T > 60 ? '#ff7a59' : v.T < 12 ? '#6cc6ff' : '#c9d6e8';
    ctx.fillStyle = 'rgba(10,18,30,0.75)'; rr(tx - 2, ty - 14, tw, 18, 9); ctx.fill();
    ctx.fillStyle = Tc; ctx.textAlign = 'left'; ctx.fillText(Ttxt, tx + 4, ty);
    ctx.textAlign = 'center';
    // wybór
    if (i === Rys.wybrany || i === Rys.hover) {
      ctx.save(); ctx.strokeStyle = i === Rys.wybrany ? 'rgba(126,240,200,0.8)' : 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
      rr(u.x0 + 4, u.y0 + 4, u.x1 - u.x0 - 8, u.y1 - u.y0 - 2, 14); ctx.stroke(); ctx.restore();
    }
    // narzędzie
    if (st.tool) { st.tool.t -= dt; rysujNarzedzie(u, st.tool, t, mouthY); if (st.tool.t <= 0) st.tool = null; }
    if (v.spill > 0) { ctx.fillStyle = `rgba(255,90,60,${v.spill * 0.5})`; for (let j = 0; j < 12; j++) { ctx.beginPath(); ctx.arc(cx + (Math.random() - 0.5) * 120 * s, by - p.H * s - Math.random() * 50 * s, 2.5, 0, Math.PI * 2); ctx.fill(); } }
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function rysujNarzedzie(u, tl, t, mouthY) {
    const { cx, s } = u; const prog = 1 - tl.t / 2.6; const typ = tl.typ;
    const x = cx + 6 * s, y = mouthY - 8 * s;
    ctx.save();
    if (typ === 'zarzace' || typ === 'plonace') {
      const ef = tl.extra.efekt;
      const len = 70 * s; const ang = -0.9;
      ctx.translate(x, y - (1 - Math.min(1, prog * 3)) * 40 * s);
      ctx.rotate(ang);
      ctx.strokeStyle = '#c49a60'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();
      ctx.rotate(-ang);
      if (ef === 'rozblysk') flameShape(0, 0, 26 * s, [255, 190, 60], t);
      else if (ef === 'plomien') flameShape(0, 0, 18 * s, [255, 150, 50], t);
      else if (ef === 'pyk') { const r = 10 + prog * 60; ctx.fillStyle = `rgba(255,240,180,${Math.max(0, 0.8 - prog)})`; ctx.beginPath(); ctx.arc(0, 0, r * s, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = `900 ${18 * s}px system-ui`; ctx.fillText('PYK!', 0, -30 * s); }
      else if (ef === 'gasnie') { ctx.fillStyle = 'rgba(200,200,200,0.5)'; for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(Math.sin(j + t * 3) * 5, -10 - j * 9 - prog * 20, 4 + j * 2, 0, Math.PI * 2); ctx.fill(); } ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.arc(0, 0, 3 * s, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillStyle = `rgba(255,${120 + Math.sin(t * 20) * 40},40,0.95)`; ctx.beginPath(); ctx.arc(0, 0, 3.5 * s, 0, Math.PI * 2); ctx.fill(); }
    } else if (typ === 'papierek') {
      const c = tl.extra.kol || [230, 200, 120];
      ctx.translate(x - 4 * s, y - 50 * s + Math.min(1, prog * 3) * 30 * s);
      ctx.fillStyle = '#f2e2a6'; ctx.fillRect(-4 * s, -40 * s, 8 * s, 40 * s);
      ctx.fillStyle = rgba(c, Math.min(1, prog * 2)); ctx.fillRect(-4 * s, -14 * s, 8 * s, 14 * s);
    } else if (typ === 'wapienna' || typ === 'wapienna0') {
      ctx.translate(x + 30 * s, y - 40 * s);
      ctx.strokeStyle = 'rgba(220,235,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-7 * s, -30 * s); ctx.lineTo(-7 * s, 10 * s); ctx.arc(0, 10 * s, 7 * s, Math.PI, 0, true); ctx.lineTo(7 * s, -30 * s); ctx.stroke();
      ctx.fillStyle = typ === 'wapienna' ? `rgba(245,245,245,${0.3 + Math.min(0.6, prog)})` : 'rgba(200,225,255,0.3)'; ctx.fillRect(-6 * s, -10 * s, 12 * s, 22 * s);
      ctx.strokeStyle = 'rgba(150,110,80,0.9)'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(-36 * s, 40 * s); ctx.quadraticCurveTo(-30 * s, -40 * s, 0, -36 * s); ctx.lineTo(0, 6 * s); ctx.stroke();
    } else if (typ === 'nos') {
      ctx.font = `${30 * s}px system-ui`; ctx.fillText('👃', x + 40 * s, y - 30 * s);
      ctx.strokeStyle = 'rgba(200,220,255,0.6)'; ctx.lineWidth = 2;
      for (let j = 0; j < 3; j++) { ctx.beginPath(); const yy = y - 10 * s - j * 10 * s; ctx.moveTo(x - 20 * s, yy); ctx.quadraticCurveTo(x + 5 * s, yy - 10 * s + Math.sin(t * 6 + j) * 4, x + 28 * s, yy - 18 * s); ctx.stroke(); }
    } else if (typ === 'plomien') {
      const bx = cx - 60 * u.s, byy = u.benchY;
      ctx.fillStyle = '#7c8696'; ctx.fillRect(bx - 6 * s, byy - 40 * s, 12 * s, 40 * s);
      const c = tl.extra.kol || [120, 160, 255];
      flameShape(bx, byy - 40 * s, 55 * s, c, t);
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(bx + 50 * s, byy - 120 * s); ctx.lineTo(bx + 2 * s, byy - 62 * s); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx, byy - 60 * s, 3 * s, 0, Math.PI * 2); ctx.stroke();
    } else if (typ === 'slomka') {
      ctx.strokeStyle = '#ff8fa3'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + 40 * s, y - 60 * s); ctx.lineTo(cx, u.by - 10 * s); ctx.stroke();
    }
    ctx.restore();
  }

  /* ---------- główna pętla rysowania ---------- */
  Rys.rysuj = function (dt) {
    if (!ctx) return;
    czasA += dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tlo();
    liczUklad();
    if (!R.naczynia.length) {
      ctx.fillStyle = 'rgba(220,230,245,0.6)'; ctx.font = '600 16px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('Postaw naczynie przyciskiem „+ Naczynie”', W / 2, H / 2);
    }
    Rys.uklad.forEach(u => palnik(u, czasA));
    Rys.uklad.forEach((u, i) => rysujNaczynie(u, i, czasA, dt));
    // błysk magnezu
    let fl = 0; R.naczynia.forEach(v => fl = Math.max(fl, v.flash));
    if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${fl * 0.35})`; ctx.fillRect(0, 0, W, H); }
  };

  /* ---------- widok cząsteczkowy ---------- */
  const Mikro = R.Mikro = { cz: [], sig: '', t: 0 };
  const KOL_SP = { 'H^+': '#ff5470', 'OH^-': '#4f86ff', 'Na^+': '#ffb35c', 'Cl^-': '#7be38a', 'H2O2': '#9fd8ff' };
  function kolSp(sp, typ) {
    if (KOL_SP[sp]) return KOL_SP[sp];
    const j = R.ION[sp]; if (j && j.col) return `rgb(${j.col.join(',')})`;
    const m = R.MOL[sp]; if (m && m.col) return `rgb(${m.col.join(',')})`;
    if (typ === 'kat') return '#ff9f5a'; if (typ === 'an') return '#5ac8ff'; if (typ === 'wsk') return '#ff8fd8';
    return '#c4d4a8';
  }
  Mikro.rysuj = function (c, v, dt) {
    const g = c.getContext('2d'); const w = c.clientWidth, h = c.clientHeight;
    const d = Math.min(2, window.devicePixelRatio || 1);
    if (c.width !== Math.round(w * d)) { c.width = Math.round(w * d); c.height = Math.round(h * d); }
    g.setTransform(d, 0, 0, d, 0, 0);
    g.fillStyle = '#0c1626'; g.fillRect(0, 0, w, h);
    if (!v) return;
    const sk = R.sklad(v).filter(x => x.typ !== 'wsk' || true);
    const roz = sk.filter(x => x.typ !== 'sol' && x.sp !== 'deterg');
    const sol = sk.filter(x => x.typ === 'sol');
    const sig = roz.map(x => x.sp + Math.round(Math.log10(x.n + 1e-12) * 3)).join('|') + '#' + sol.map(x => x.sp + Math.round(Math.log10(x.n) * 2)).join('|') + (v.liq > 0.05 ? 'w' : 'd');
    if (sig !== Mikro.sig) {
      Mikro.sig = sig;
      const tot = roz.reduce((s, x) => s + x.n, 0) || 1;
      const nowe = [];
      const N = 34;
      roz.sort((a, b) => b.n - a.n).slice(0, 10).forEach(x => {
        const ile = Math.max(1, Math.min(14, Math.round(N * x.n / tot)));
        for (let i = 0; i < ile; i++) {
          const stary = Mikro.cz.find(p => p.sp === x.sp && !p.used && !p.stale);
          if (stary) { stary.used = true; nowe.push(stary); continue; }
          nowe.push({ sp: x.sp, typ: x.typ, x: Math.random() * w, y: Math.random() * (h - 40) + 10, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, lab: x.typ === 'wsk' ? 'wsk.' : R.uni(x.sp), kol: kolSp(x.sp, x.typ) });
        }
      });
      if (v.liq > 0.05) for (let i = 0; i < 22; i++) nowe.push({ sp: 'H2O', woda: true, x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, a: Math.random() * 6 });
      Mikro.krat = sol.slice(0, 3).map(x => ({ sp: x.sp, n: x.n, kol: R.SOLID[x.sp] ? R.SOLID[x.sp].col : '#ccc', lab: R.uni(R.SOLID[x.sp].f || x.sp), metal: !!(R.SOLID[x.sp] && R.SOLID[x.sp].metal) }));
      nowe.forEach(p => p.used = false);
      Mikro.cz = nowe;
    }
    Mikro.t += dt;
    const temp = Math.max(0.3, Math.min(3, (v.T + 273) / 294));
    // sieć krystaliczna ciał stałych
    let kx = 6;
    (Mikro.krat || []).forEach((k, i) => {
      const cols = 5, rows = 2, r = 5;
      for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
        const x = kx + a * 11 + (b % 2) * 5, y = h - 8 - b * 10;
        g.fillStyle = k.metal ? k.kol : ((a + b) % 2 ? k.kol : shade(k.kol));
        g.beginPath(); g.arc(x + Math.sin(Mikro.t * 6 * temp + a + b) * 0.6, y, r, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#cfe0f5'; g.font = '600 9px system-ui'; g.textAlign = 'left'; g.fillText(k.lab, kx, h - 30);
      kx += cols * 11 + 18;
    });
    for (const p of Mikro.cz) {
      p.vx += (Math.random() - 0.5) * 120 * dt * temp; p.vy += (Math.random() - 0.5) * 120 * dt * temp;
      const sp = Math.hypot(p.vx, p.vy), mx = 45 * temp; if (sp > mx) { p.vx *= mx / sp; p.vy *= mx / sp; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const dol = (Mikro.krat && Mikro.krat.length) ? h - 36 : h - 6;
      if (p.x < 6) { p.x = 6; p.vx = Math.abs(p.vx); } if (p.x > w - 6) { p.x = w - 6; p.vx = -Math.abs(p.vx); }
      if (p.y < 6) { p.y = 6; p.vy = Math.abs(p.vy); } if (p.y > dol) { p.y = dol; p.vy = -Math.abs(p.vy); }
      if (p.woda) {
        p.a += dt * 2;
        g.fillStyle = 'rgba(120,170,255,0.22)'; g.beginPath(); g.arc(p.x, p.y, 3.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(p.x + Math.cos(p.a) * 3.6, p.y + Math.sin(p.a) * 3.6, 1.6, 0, Math.PI * 2); g.arc(p.x + Math.cos(p.a + 1.8) * 3.6, p.y + Math.sin(p.a + 1.8) * 3.6, 1.6, 0, Math.PI * 2); g.fill();
        continue;
      }
      g.font = '700 9px system-ui';
      const tw = g.measureText(p.lab).width;
      const r = Math.max(7, tw / 2 + 3);
      g.fillStyle = p.kol; g.globalAlpha = 0.9; g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      g.fillStyle = '#0b1220'; g.textAlign = 'center'; g.fillText(p.lab, p.x, p.y + 3);
    }
    if (!Mikro.cz.length && !(Mikro.krat || []).length) { g.fillStyle = 'rgba(200,215,235,0.6)'; g.font = '12px system-ui'; g.textAlign = 'center'; g.fillText('Pusto – nie ma czego oglądać', w / 2, h / 2); }
  };
  function shade(hex) { const c = R.hex2rgb(hex); return `rgb(${c.map(x => Math.round(x * 0.75)).join(',')})`; }
})();
