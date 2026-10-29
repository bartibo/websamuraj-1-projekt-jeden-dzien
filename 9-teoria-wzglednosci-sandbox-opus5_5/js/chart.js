/* =====================================================================
   Gumowy czas – wykres „mapa efektu”
   Prędkość: tempo zegara i długość statku w funkcji prędkości.
   Grawitacja / Razem: o ile zegar spóźnia się na dobę w funkcji wysokości.
   ===================================================================== */
'use strict';
(function (R) {
  const P = R.phys, F = R.fmt;
  const FONT = '"Space Grotesk", system-ui, sans-serif';
  const MONO = '"JetBrains Mono", monospace';

  function setup(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    return { ctx, W, H };
  }

  function frame(ctx, box) {
    ctx.strokeStyle = 'rgba(160,180,255,0.25)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(box.x, box.y); ctx.lineTo(box.x, box.y + box.h); ctx.lineTo(box.x + box.w, box.y + box.h); ctx.stroke();
  }
  function marker(ctx, x, y, col, text, box) {
    ctx.strokeStyle = col; ctx.setLineDash([3, 4]); ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, box.y + box.h); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    if (text) {
      ctx.font = '600 12px ' + FONT;
      const w = ctx.measureText(text).width + 12;
      let tx = x + 10, ty = y - 26;
      if (tx + w > box.x + box.w) tx = x - 10 - w;
      if (ty < 2) ty = y + 10;
      ctx.fillStyle = 'rgba(8,12,26,0.85)'; ctx.fillRect(tx, ty, w, 20);
      ctx.fillStyle = col; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(text, tx + 6, ty + 10);
    }
  }

  /* ---------------------------- prędkość ---------------------------- */
  function drawSpeed(cv, sp) {
    const { ctx, W, H } = setup(cv);
    const box = { x: 44, y: 12, w: W - 58, h: H - 46 };
    frame(ctx, box);
    ctx.font = '11px ' + MONO; ctx.fillStyle = 'rgba(200,210,240,0.6)';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const v = i / 4, y = box.y + box.h * (1 - v);
      ctx.fillText(F.num(v, 2), box.x - 6, y);
      ctx.strokeStyle = 'rgba(160,180,255,0.08)';
      ctx.beginPath(); ctx.moveTo(box.x, y); ctx.lineTo(box.x + box.w, y); ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    [0, 25, 50, 75, 90, 100].forEach(p => {
      const x = box.x + box.w * p / 100;
      ctx.fillText(p + '%', x, box.y + box.h + 5);
    });
    ctx.fillStyle = 'rgba(200,210,240,0.5)'; ctx.font = '11px ' + FONT;
    ctx.fillText('prędkość statku (procent prędkości światła)', box.x + box.w / 2, box.y + box.h + 19);
    // krzywa: tempo = długość = √(1−β²)
    const grad = ctx.createLinearGradient(box.x, 0, box.x + box.w, 0);
    grad.addColorStop(0, '#5ee3ff'); grad.addColorStop(0.7, '#ffb84d'); grad.addColorStop(1, '#ff5d73');
    ctx.strokeStyle = grad; ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 400; i++) {
      const b = 1 - Math.pow(1 - i / 400, 2.2);
      const x = box.x + box.w * b, y = box.y + box.h * (1 - Math.sqrt(1 - b * b));
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    const x = box.x + box.w * sp.beta, y = box.y + box.h * (1 - sp.rate);
    marker(ctx, x, y, '#ffb84d', 'tempo i długość ×' + (sp.rate < 0.001 ? F.sci(sp.rate, 2) : F.num(sp.rate, 3)), box);
  }

  /* ------------------------- grawitacja / razem ------------------------- */
  // x: log10(h) od -10 do 2, y: log10(spóźnienie na dobę w sekundach)
  function drawHeight(cv, opt) {
    const { ctx, W, H } = setup(cv);
    const box = { x: 62, y: 12, w: W - 76, h: H - 46 };
    const body = opt.body;
    const N = 220;
    const series = opt.series.map(s => {
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const lh = -10 + 12 * i / N;
        const v = s.fn(Math.pow(10, lh));
        pts.push([lh, v > 0 && isFinite(v) ? Math.log10(v * P.DAY) : NaN]);
      }
      return { pts, col: s.col, dash: s.dash, label: s.label, width: s.width };
    });
    let lo = Infinity, hi = -Infinity;
    series.forEach(s => s.pts.forEach(p => { if (!isNaN(p[1])) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); } }));
    if (opt.lines) opt.lines.forEach(l => { const v = Math.log10(l.value * P.DAY); lo = Math.min(lo, v); hi = Math.max(hi, v); });
    if (!isFinite(lo)) { lo = -12; hi = 5; }
    lo = Math.max(Math.floor(lo - 0.3), -15); hi = Math.min(Math.ceil(hi + 0.3), Math.log10(P.DAY) + 0.15);
    if (hi - lo < 2) lo = hi - 2;
    const X = lh => box.x + box.w * (lh + 10) / 12;
    const Y = lv => box.y + box.h * (1 - (lv - lo) / (hi - lo));

    // siatka i opisy osi
    ctx.font = '11px ' + MONO; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const ticks = [[-15, '1 fs'], [-12, '1 ps'], [-9, '1 ns'], [-6, '1 µs'], [-3, '1 ms'], [0, '1 s'], [Math.log10(60), '1 min'], [Math.log10(3600), '1 h'], [Math.log10(P.DAY), 'cała doba']];
    ticks.forEach(([v, t]) => {
      if (v < lo - 0.01 || v > hi + 0.01) return;
      const y = Y(v);
      ctx.strokeStyle = 'rgba(160,180,255,0.09)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(box.x, y); ctx.lineTo(box.x + box.w, y); ctx.stroke();
      ctx.fillStyle = 'rgba(200,210,240,0.6)'; ctx.fillText(t, box.x - 6, y);
    });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const xt = [-9, -6, -3, 0, 2];
    xt.forEach(lh => {
      const x = X(lh);
      ctx.strokeStyle = 'rgba(160,180,255,0.07)';
      ctx.beginPath(); ctx.moveTo(x, box.y); ctx.lineTo(x, box.y + box.h); ctx.stroke();
      ctx.fillStyle = 'rgba(200,210,240,0.6)';
      const lbl = F.len(Math.pow(10, lh) * body.R), half = ctx.measureText(lbl).width / 2;
      ctx.fillText(lbl, Math.min(x, W - half - 2), box.y + box.h + 5);
    });
    ctx.fillStyle = 'rgba(200,210,240,0.5)'; ctx.font = '11px ' + FONT;
    ctx.fillText(body.bh ? 'wysokość nad horyzontem zdarzeń' : 'wysokość nad powierzchnią', box.x + box.w / 2, box.y + box.h + 19);
    frame(ctx, box);

    // linie poziome (np. zegar na powierzchni)
    if (opt.lines) opt.lines.forEach(l => {
      const y = Y(Math.log10(l.value * P.DAY));
      ctx.strokeStyle = l.col; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(box.x, y); ctx.lineTo(box.x + box.w, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = l.col; ctx.font = '11px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText(l.label, box.x + box.w - 4, y - 3);
    });
    // krzywe
    series.forEach(s => {
      ctx.strokeStyle = s.col; ctx.lineWidth = s.width || 2.5; ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      let pen = false;
      s.pts.forEach(([lh, lv]) => {
        if (isNaN(lv)) { pen = false; return; }
        const x = X(lh), y = Y(Math.max(lv, lo));
        if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
      });
      ctx.stroke(); ctx.setLineDash([]);
    });
    // legenda
    let lx = box.x + 8;
    ctx.font = '11px ' + FONT; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    series.forEach(s => {
      if (!s.label) return;
      const ly = box.y + box.h - 12;
      ctx.fillStyle = s.col; ctx.fillRect(lx, ly - 2, 14, 3);
      ctx.fillStyle = 'rgba(220,228,255,0.8)'; ctx.fillText(s.label, lx + 18, ly);
      lx += ctx.measureText(s.label).width + 34;
    });
    // punkt bieżący
    if (opt.point && opt.point.value > 0) {
      const lh = P.clamp(Math.log10(opt.point.h), -10, 2);
      const lv = Math.log10(opt.point.value * P.DAY);
      marker(ctx, X(lh), Y(P.clamp(lv, lo, hi)), opt.point.col, opt.point.label, box);
    }
  }

  R.chart = { drawSpeed, drawHeight };
})(window.Rel);
