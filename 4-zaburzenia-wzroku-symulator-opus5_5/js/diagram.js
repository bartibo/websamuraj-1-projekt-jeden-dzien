/* diagram.js – animowane, edukacyjne schematy oka (Canvas 2D) do panelu bocznego „Oczami innych”.
   API:  EyeDiagram.draw(canvas, type, p, t)   (t – czas w sekundach, do animacji)
   type: 'refraction' | 'binocular' | 'cones' | 'anatomy'  (parametry opisane przy funkcjach rysujących).
   Płótno samo dopasowuje rozdzielczość do clientWidth/clientHeight × devicePixelRatio (maks. 2).
   Tło zostaje przezroczyste – rysujemy na panelu #121826. */
(function () {
  'use strict';

  var COL = {
    line: '#cbd5e1', cornea: '#93c5fd', retina: '#f472b6', macula: '#fbbf24', nerve: '#fca5a5',
    ray: '#fbbf24', ray2: '#5eead4', accent: '#5eead4', warn: '#f87171', text: '#e6ebf5', muted: '#93a0b8',
    iris: '#7f93b5', dim: '#475569', dark: '#0b1020'
  };
  var FAM = 'Inter, system-ui, sans-serif';
  var TAU = Math.PI * 2;
  var FS = 11;              // bieżący rozmiar czcionki (px CSS) – ustawiany w setup()
  var warned = false;

  // ───────────────────────────── narzędzia ─────────────────────────────
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function num(v, d) { return (typeof v === 'number' && !isNaN(v)) ? v : d; }
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  var hexCache = {};
  function rgba(hex, a) {
    var c = hexCache[hex];
    if (!c) { var n = parseInt(hex.slice(1), 16); c = hexCache[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (Math.round(clamp(a, 0, 1) * 1000) / 1000) + ')';
  }
  function mixHex(h1, h2, k, a) {
    rgba(h1, 1); rgba(h2, 1);
    var c1 = hexCache[h1], c2 = hexCache[h2];
    return 'rgba(' + Math.round(lerp(c1[0], c2[0], k)) + ',' + Math.round(lerp(c1[1], c2[1], k)) + ',' +
      Math.round(lerp(c1[2], c2[2], k)) + ',' + (a == null ? 1 : Math.round(a * 1000) / 1000) + ')';
  }

  function setup(canvas) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var cw = canvas.clientWidth || canvas.width || 400, ch = canvas.clientHeight || canvas.height || 230;
    var bw = Math.max(1, Math.round(cw * dpr)), bh = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = 1; ctx.setLineDash([]);
    var s = Math.min(cw / 400, ch / 230);
    FS = clamp(Math.round(11 * clamp(s, 0.88, 1.1) * 2) / 2, 9.5, 12);
    return { ctx: ctx, W: cw, H: ch, s: s, dpr: dpr };
  }

  function font(ctx, size, weight) { ctx.font = (weight || 600) + ' ' + size + 'px ' + FAM; }

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
  }

  // Podpis z (opcjonalnym) ciemnym tłem-pigułką. Zwraca prostokąt.
  function tag(ctx, text, x, y, o) {
    o = o || {};
    var size = o.size || FS;
    font(ctx, size, o.weight || 600);
    var w = ctx.measureText(text).width, pad = o.pad == null ? 4 : o.pad, h = size + 6;
    var al = o.align || 'left';
    var x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x;
    if (o.bg !== false) {
      rr(ctx, x0 - pad, y - h / 2, w + pad * 2, h, 6);
      ctx.fillStyle = o.bg || 'rgba(18,24,38,0.86)'; ctx.fill();
      if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 1; ctx.stroke(); }
    }
    ctx.fillStyle = o.color || COL.text; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x0, y + 0.5);
    if (o.strike) {
      ctx.strokeStyle = o.strike; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x0 - 2, y + 1); ctx.lineTo(x0 + w + 2, y + 0.5); ctx.stroke();
    }
    return { x: x0 - pad, y: y - h / 2, w: w + pad * 2, h: h };
  }

  // Podpis z linią odniesienia: (tx,ty) – wskazywany punkt, (lx,ly) – kotwica podpisu.
  function callout(ctx, text, tx, ty, lx, ly, o) {
    o = o || {};
    var lc = o.lineColor || 'rgba(147,160,184,0.75)';
    ctx.strokeStyle = lc; ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(tx, ty);
    if (o.elbow) ctx.lineTo(o.elbow[0], o.elbow[1]);
    ctx.lineTo(lx, ly); ctx.stroke();
    ctx.fillStyle = o.dotColor || COL.text;
    ctx.beginPath(); ctx.arc(tx, ty, 1.9, 0, TAU); ctx.fill();
    return tag(ctx, text, lx, ly, o);
  }

  function badge(ctx, text, cx, cy, color) {
    font(ctx, FS, 700);
    var w = ctx.measureText(text).width, h = FS + 10, dot = 8;
    var x0 = cx - (w + dot + 22) / 2;
    rr(ctx, x0, cy - h / 2, w + dot + 22, h, h / 2);
    ctx.fillStyle = rgba(color, 0.13); ctx.fill();
    ctx.strokeStyle = rgba(color, 0.55); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x0 + 11, cy, 3.2, 0, TAU); ctx.fill();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
    ctx.fillText(text, x0 + 11 + dot, cy + 0.5);
  }

  function arrow(ctx, x1, y1, x2, y2, color, lw, head) {
    head = head || 5; lw = lw || 1.4;
    var a = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * head * 0.6, y2 - Math.sin(a) * head * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.45) * head, y2 - Math.sin(a - 0.45) * head);
    ctx.lineTo(x2 - Math.cos(a + 0.45) * head, y2 - Math.sin(a + 0.45) * head);
    ctx.closePath(); ctx.fill();
  }

  function poly(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  }

  // Promień ze świetlistą otoczką.
  function ray(ctx, pts, color, lw, o) {
    o = o || {};
    poly(ctx, pts);
    if (o.dash) ctx.setLineDash(o.dash);
    var a = o.alpha == null ? 1 : o.alpha;
    if (o.glow !== false) { ctx.strokeStyle = rgba(color, 0.16 * a); ctx.lineWidth = lw * 4.2; ctx.stroke(); }
    ctx.strokeStyle = rgba(color, 0.95 * a); ctx.lineWidth = lw; ctx.stroke();
    ctx.setLineDash([]);
  }

  // Kropki światła płynące wzdłuż łamanej.
  function flow(ctx, pts, t, color, o) {
    o = o || {};
    var speed = o.speed || 40, gap = o.gap || 54, ph = o.phase || 0, r = o.r || 1.7, a0 = o.alpha == null ? 1 : o.alpha;
    var n = pts.length / 2, segL = [], L = 0, i;
    for (i = 0; i < n - 1; i++) {
      var dx = pts[2 * i + 2] - pts[2 * i], dy = pts[2 * i + 3] - pts[2 * i + 1];
      var l = Math.sqrt(dx * dx + dy * dy); segL.push(l); L += l;
    }
    if (L < 2) return;
    var d0 = ((t * speed + ph) % gap + gap) % gap;
    var halo = rgba(color, 0.24), core = o.core || '#fffbeb';
    for (var d = d0; d < L; d += gap) {
      var acc = 0, k = 0;
      while (k < segL.length - 1 && acc + segL[k] < d) { acc += segL[k]; k++; }
      var f = segL[k] ? (d - acc) / segL[k] : 0;
      var x = pts[2 * k] + (pts[2 * k + 2] - pts[2 * k]) * f, y = pts[2 * k + 1] + (pts[2 * k + 3] - pts[2 * k + 1]) * f;
      ctx.globalAlpha = a0 * clamp(Math.min(d / 12, (L - d) / 12), 0, 1);
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, r * 2.5, 0, TAU); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function glowDot(ctx, x, y, r, color, a) {
    a = a == null ? 1 : a;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, 0.9 * a)); g.addColorStop(0.35, rgba(color, 0.45 * a)); g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  function cross(ctx, x, y, r, color, lw) {
    ctx.strokeStyle = color; ctx.lineWidth = lw || 1.6;
    ctx.beginPath(); ctx.moveTo(x - r, y - r); ctx.lineTo(x + r, y + r); ctx.moveTo(x + r, y - r); ctx.lineTo(x - r, y + r); ctx.stroke();
  }

  function star(ctx, x, y, r, color, a) {
    ctx.globalAlpha = a == null ? 1 : a;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r;
      if (i) ctx.lineTo(x + Math.cos(ang) * rr2, y + Math.sin(ang) * rr2); else ctx.moveTo(x + Math.cos(ang) * rr2, y + Math.sin(ang) * rr2);
    }
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Największy pierwiastek t przecięcia prostej (x+dx·t, y+dy·t) z elipsą.
  function ellHit(x, y, dx, dy, cx, cy, rx, ry) {
    var X = (x - cx) / rx, Y = (y - cy) / ry, DX = dx / rx, DY = dy / ry;
    var A = DX * DX + DY * DY, B = 2 * (X * DX + Y * DY), C = X * X + Y * Y - 1;
    var disc = B * B - 4 * A * C;
    if (disc < 0 || A === 0) return 1;
    return (-B + Math.sqrt(disc)) / (2 * A);
  }

  function fmtNum(v, dec) {
    var s = (Math.round(Math.abs(v) * Math.pow(10, dec)) / Math.pow(10, dec)).toString().replace('.', ',');
    return s;
  }
  function fmtD(v) {
    var r = Math.round(v * 4) / 4;
    return (r > 0 ? '+' : r < 0 ? '−' : '') + fmtNum(r, 2) + ' D';
  }
  function fmtDist(d) {
    if (!(d > 0) || !isFinite(d)) return '∞';
    if (d < 1) return Math.round(d * 100) + ' cm';
    return fmtNum(d, d < 10 ? 1 : 0) + ' m';
  }

  // ───────────────────────────── oko w przekroju ─────────────────────────────
  function eyeGeom(cx, cy, ry, o) {
    o = o || {};
    var rx = ry * 1.04 * (o.axial || 1);
    var cr = ry * 0.5, k = Math.sqrt(1 - 0.25);
    var x0 = cx - rx * k;
    var cone = clamp(o.cone || 0, 0, 1);
    var bulge = ry * (0.2 + 0.26 * cone);
    var acc = clamp(o.accom || 0, 0, 10);
    var rrx = rx - ry * 0.065, rry = ry * 0.935;
    var g = {
      cx: cx, cy: cy, rx: rx, ry: ry, cr: cr, x0: x0, phi: Math.acos(-k),
      cone: cone, bulge: bulge, coneDy: cr * 0.3 * cone, apexX: x0 - bulge,
      irisX: x0 + ry * 0.055, lensX: x0 + ry * 0.2,
      lensRx: ry * Math.min(0.165, 0.1 + 0.0075 * acc), lensRy: ry * (0.36 - 0.006 * acc),
      pupilR: ry * 0.19, rrx: rrx, rry: rry,
      nerveA: 0.27, nerveW: 0.11, lw: Math.max(1.3, ry * 0.027)
    };
    g.aOra = Math.acos(clamp((x0 + ry * 0.2 - cx) / rrx, -1, 1));
    g.retX = cx + rrx;
    g.corn = corneaPts(g, bulge, 0);
    g.cornTab = sampleCornea(g.corn);
    return g;
  }
  function rPt(g, a) { return [g.cx + g.rrx * Math.cos(a), g.cy + g.rry * Math.sin(a)]; }
  function sPt(g, a) { return [g.cx + g.rx * Math.cos(a), g.cy + g.ry * Math.sin(a)]; }

  function corneaPts(g, b, thick) {
    var x0 = g.x0 + thick * 0.25, top = g.cy - g.cr * (1 - thick / g.ry * 0.5), bot = g.cy + g.cr * (1 - thick / g.ry * 0.5);
    var ax = g.x0 - b + thick, ay = g.cy + g.coneDy;
    var c = g.cone, bb = b - thick, k = 0.552;
    function cp(ex, ey, cx2, cy2) { return [lerp(ex, cx2, c), lerp(ey, cy2, c)]; }
    var a1 = cp(x0 - k * bb, top, x0 - bb * 0.42, top + (ay - top) * 0.2);
    var a2 = cp(ax, ay - k * (ay - top), ax + bb * 0.1, ay - (ay - top) * 0.14);
    var b1 = cp(ax, ay + k * (bot - ay), ax + bb * 0.1, ay + (bot - ay) * 0.14);
    var b2 = cp(x0 - k * bb, bot, x0 - bb * 0.42, bot - (bot - ay) * 0.2);
    return [x0, top, a1[0], a1[1], a2[0], a2[1], ax, ay, b1[0], b1[1], b2[0], b2[1], x0, bot];
  }
  function cornPath(ctx, c, rev, move) {
    if (!rev) {
      if (move !== false) ctx.moveTo(c[0], c[1]);
      ctx.bezierCurveTo(c[2], c[3], c[4], c[5], c[6], c[7]);
      ctx.bezierCurveTo(c[8], c[9], c[10], c[11], c[12], c[13]);
    } else {
      if (move !== false) ctx.moveTo(c[12], c[13]); else ctx.lineTo(c[12], c[13]);
      ctx.bezierCurveTo(c[10], c[11], c[8], c[9], c[6], c[7]);
      ctx.bezierCurveTo(c[4], c[5], c[2], c[3], c[0], c[1]);
    }
  }
  function bez(p0, p1, p2, p3, u) {
    var v = 1 - u;
    return v * v * v * p0 + 3 * v * v * u * p1 + 3 * v * u * u * p2 + u * u * u * p3;
  }
  function sampleCornea(c) {
    var tab = [], i, u;
    for (i = 0; i <= 12; i++) { u = i / 12; tab.push(bez(c[0], c[2], c[4], c[6], u), bez(c[1], c[3], c[5], c[7], u)); }
    for (i = 1; i <= 12; i++) { u = i / 12; tab.push(bez(c[6], c[8], c[10], c[12], u), bez(c[7], c[9], c[11], c[13], u)); }
    return tab;
  }
  // x przedniej powierzchni rogówki na wysokości y = cy + h
  function corneaX(g, h) {
    var y = g.cy + h, tab = g.cornTab;
    for (var i = 2; i < tab.length; i += 2) {
      if (tab[i + 1] >= y) {
        var y0 = tab[i - 1], f = tab[i + 1] - y0 ? (y - y0) / (tab[i + 1] - y0) : 0;
        return lerp(tab[i - 2], tab[i], clamp(f, 0, 1));
      }
    }
    return g.x0;
  }

  function drawNerve(ctx, g, o) {
    var a1 = g.nerveA - g.nerveW, a2 = g.nerveA + g.nerveW;
    var p1 = sPt(g, a1), p2 = sPt(g, a2), L = g.ry * 0.5, dx = 0.97, dy = 0.24;
    var e1 = [p1[0] + dx * L, p1[1] + dy * L], e2 = [p2[0] + dx * L, p2[1] + dy * L];
    var gr = ctx.createLinearGradient(p1[0], p1[1], e1[0], e1[1]);
    gr.addColorStop(0, rgba(COL.nerve, 0.3)); gr.addColorStop(1, rgba(COL.nerve, 0.03));
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(e1[0], e1[1]); ctx.lineTo(e2[0], e2[1]); ctx.lineTo(p2[0], p2[1]);
    ctx.ellipse(g.cx, g.cy, g.rrx, g.rry, 0, a2, a1, true); ctx.closePath();
    ctx.fillStyle = gr; ctx.fill();
    var gs = ctx.createLinearGradient(p1[0], p1[1], e1[0], e1[1]);
    gs.addColorStop(0, rgba(COL.nerve, 0.95)); gs.addColorStop(1, rgba(COL.nerve, 0.1));
    ctx.strokeStyle = gs; ctx.lineWidth = g.lw;
    ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(e1[0], e1[1]); ctx.moveTo(p2[0], p2[1]); ctx.lineTo(e2[0], e2[1]); ctx.stroke();
    // włókna nerwowe
    var nF = 5, keep = o.fibers == null ? 1 : o.fibers;
    var d1 = rPt(g, a1), d2 = rPt(g, a2);
    for (var i = 1; i < nF; i++) {
      var f = i / nF, alive = (i / nF) <= keep + 0.001 || nF * keep >= i;
      var sx = lerp(d1[0], d2[0], f) + g.lw, sy = lerp(d1[1], d2[1], f);
      var ex = lerp(e1[0], e2[0], f), ey = lerp(e1[1], e2[1], f);
      var lg = ctx.createLinearGradient(sx, sy, ex, ey);
      lg.addColorStop(0, rgba(alive ? COL.nerve : '#64748b', alive ? 0.7 : 0.45)); lg.addColorStop(1, rgba(COL.nerve, 0));
      ctx.strokeStyle = lg; ctx.lineWidth = alive ? 1 : 0.8;
      if (!alive) ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.setLineDash([]);
    }
    g.nerveEnd = [(e1[0] + e2[0]) / 2, (e1[1] + e2[1]) / 2];
    g.nerveMid = [(p1[0] + p2[0] + e1[0] + e2[0]) / 4, (p1[1] + p2[1] + e1[1] + e2[1]) / 4];
  }

  // Rysuje oko w przekroju bocznym. o: retinaSegs, lensFill, lensStroke, lensGlow, noMacula, noDisc, fibers, retinaAlpha
  function drawEye(ctx, g, o) {
    o = o || {};
    var cx = g.cx, cy = g.cy;
    var vg = ctx.createRadialGradient(cx + g.rx * 0.2, cy, g.ry * 0.1, cx, cy, g.rx);
    vg.addColorStop(0, 'rgba(148,163,184,0.085)'); vg.addColorStop(1, 'rgba(148,163,184,0.02)');
    ctx.fillStyle = vg; ctx.beginPath(); ctx.ellipse(cx, cy, g.rrx, g.rry, 0, 0, TAU); ctx.fill();
    // komora przednia
    ctx.fillStyle = 'rgba(147,197,253,0.05)';
    ctx.beginPath(); cornPath(ctx, g.corn); ctx.closePath(); ctx.fill();

    if (!o.noNerve) drawNerve(ctx, g, o);
    // twardówka
    ctx.strokeStyle = COL.line; ctx.lineWidth = g.lw * 1.15;
    ctx.beginPath(); ctx.ellipse(cx, cy, g.rx, g.ry, 0, -g.phi, g.nerveA - g.nerveW); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, g.rx, g.ry, 0, g.nerveA + g.nerveW, g.phi); ctx.stroke();
    // naczyniówka (cienka)
    ctx.strokeStyle = 'rgba(244,114,182,0.18)'; ctx.lineWidth = g.lw * 0.9;
    ctx.beginPath(); ctx.ellipse(cx, cy, (g.rx + g.rrx) / 2, (g.ry + g.rry) / 2, 0, -g.aOra, g.aOra); ctx.stroke();
    // siatkówka
    var segs = o.retinaSegs || [[-g.aOra, g.nerveA - g.nerveW * 0.9], [g.nerveA + g.nerveW * 0.9, g.aOra]];
    ctx.strokeStyle = rgba(COL.retina, o.retinaAlpha == null ? 1 : o.retinaAlpha); ctx.lineWidth = g.lw * 1.15;
    for (var i = 0; i < segs.length; i++) {
      ctx.beginPath(); ctx.ellipse(cx, cy, g.rrx, g.rry, 0, segs[i][0], segs[i][1]); ctx.stroke();
    }
    // tarcza nerwu wzrokowego
    if (!o.noDisc) {
      ctx.strokeStyle = 'rgba(253,230,138,0.75)'; ctx.lineWidth = g.lw * 0.9;
      ctx.beginPath(); ctx.ellipse(cx, cy, g.rrx + g.lw * 0.6, g.rry + g.lw * 0.4, 0, g.nerveA - g.nerveW * 0.85, g.nerveA + g.nerveW * 0.85); ctx.stroke();
    }
    // plamka żółta
    if (!o.noMacula) {
      ctx.strokeStyle = COL.macula; ctx.lineWidth = g.lw * 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, g.rrx - g.lw * 0.3, g.rry, 0, -0.085, 0.085); ctx.stroke();
    }
    // rogówka
    var inner = corneaPts(g, g.bulge, g.ry * 0.07 * (1 - 0.65 * g.cone));
    ctx.beginPath(); cornPath(ctx, g.corn); cornPath(ctx, inner, true, false); ctx.closePath();
    ctx.fillStyle = o.corneaFill || 'rgba(147,197,253,0.2)'; ctx.fill();
    if (o.corneaGlow) {
      ctx.strokeStyle = rgba(COL.accent, o.corneaGlow); ctx.lineWidth = g.lw * 4;
      ctx.beginPath(); cornPath(ctx, g.corn); ctx.stroke();
    }
    ctx.strokeStyle = COL.cornea; ctx.lineWidth = g.lw;
    ctx.beginPath(); cornPath(ctx, g.corn); ctx.stroke();
    ctx.strokeStyle = 'rgba(147,197,253,0.55)'; ctx.lineWidth = g.lw * 0.6;
    ctx.beginPath(); cornPath(ctx, inner); ctx.stroke();
    // ciało rzęskowe i obwódka
    var cbx = g.x0 + g.ry * 0.13;
    for (var sgn = -1; sgn <= 1; sgn += 2) {
      var cby = cy + sgn * (g.cr + g.ry * 0.07);
      ctx.fillStyle = 'rgba(100,116,139,0.55)';
      ctx.beginPath(); ctx.ellipse(cbx, cby, g.ry * 0.075, g.ry * 0.045, sgn * 0.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(203,213,225,0.35)'; ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(cbx, cby - sgn * g.ry * 0.03); ctx.lineTo(g.lensX, cy + sgn * g.lensRy * 0.92);
      ctx.moveTo(cbx + g.ry * 0.03, cby - sgn * g.ry * 0.02); ctx.lineTo(g.lensX + g.lensRx * 0.5, cy + sgn * g.lensRy * 0.85);
      ctx.stroke();
    }
    // soczewka
    if (o.lensGlow) {
      ctx.strokeStyle = rgba(o.lensGlowColor || COL.accent, o.lensGlow); ctx.lineWidth = g.lw * 4;
      ctx.beginPath(); ctx.ellipse(g.lensX, cy, g.lensRx, g.lensRy, 0, 0, TAU); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(g.lensX, cy, g.lensRx, g.lensRy, 0, 0, TAU);
    ctx.fillStyle = o.lensFill || 'rgba(147,197,253,0.22)'; ctx.fill();
    ctx.strokeStyle = o.lensStroke || COL.cornea; ctx.lineWidth = g.lw * 0.85; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(g.lensX, cy, g.lensRx * 0.55, g.lensRy * 0.7, 0, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
    // tęczówka
    ctx.strokeStyle = COL.iris; ctx.lineWidth = g.ry * 0.045;
    ctx.beginPath();
    ctx.moveTo(g.irisX, cy - g.cr * 0.98); ctx.lineTo(g.irisX, cy - g.pupilR);
    ctx.moveTo(g.irisX, cy + g.cr * 0.98); ctx.lineTo(g.irisX, cy + g.pupilR);
    ctx.stroke();
  }

  // ───────────────────────────── 1. REFRAKCJA ─────────────────────────────
  /* p = { error: E (D; + krótkowzroczność, − nadwzroczność), cyl: C (≥0), axisDeg, accom: A (≥0),
           targetDist: m | Infinity, lens: P (D okularów; 0 = brak), label?: string }
     ΔD = 1/targetDist − (E + P + A);  ΔD<0 → ognisko przed siatkówką, ΔD>0 → za siatkówką. */
  function drawRefraction(D, p, t) {
    var ctx = D.ctx, W = D.W, H = D.H;
    var E = num(p.error, 0), C = Math.max(0, num(p.cyl, 0)), A = Math.max(0, num(p.accom, 0)), P = num(p.lens, 0);
    var dist = p.targetDist;
    var far = !(dist > 0) || !isFinite(dist) || dist > 6;
    var V = far ? 0 : 1 / dist;
    var dD = V - (E + P + A), dD2 = dD - C;
    var astig = C >= 0.12;
    var ry = Math.min((H - 30) / 2 - 14, W * 0.172);
    var cy = Math.round((H - 26) / 2 + 6);
    var g = eyeGeom(W * 0.6, cy, ry, { axial: 1 + 0.028 * clamp(E, -8, 8), accom: A });
    var retX = g.retX, kpx = ry * 0.17;
    function fx(d) {
      return clamp(retX + kpx * d / (1 + 0.07 * Math.abs(d)), g.lensX + (retX - g.lensX) * 0.3, W - 8);
    }
    var xf = fx(dD), xf2 = fx(dD2);
    var hasSpec = Math.abs(P) >= 0.05;
    var gap = ry * 0.55, xs = g.apexX - gap, specH = ry * 0.6;
    var sx = Math.max(14, W * 0.045), startX = 3;
    var m = 0.11 * P / (1 + 0.12 * Math.abs(P));
    var aIn = far ? 0 : 1 / Math.max(10, xs - sx);

    drawEye(ctx, g, { lensGlow: A > 0.05 ? 0.25 + 0.12 * Math.sin(t * 3) : 0 });

    // okulary
    if (hasSpec) {
      var te = P < 0 ? ry * (0.09 + 0.006 * Math.min(8, -P)) : ry * 0.025, tc = P < 0 ? ry * 0.025 : ry * (0.09 + 0.006 * Math.min(8, P));
      var top = cy - specH, bot = cy + specH;
      ctx.beginPath();
      ctx.moveTo(xs - te, top); ctx.lineTo(xs + te, top);
      ctx.quadraticCurveTo(xs + 2 * tc - te, cy, xs + te, bot);
      ctx.lineTo(xs - te, bot);
      ctx.quadraticCurveTo(xs - 2 * tc + te, cy, xs - te, top);
      ctx.closePath();
      ctx.fillStyle = 'rgba(147,197,253,0.2)'; ctx.fill();
      ctx.strokeStyle = COL.cornea; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.fillStyle = '#64748b';
      rr(ctx, xs - te - 2, top - 4, te * 2 + 4, 4, 2); ctx.fill();
      rr(ctx, xs - te - 2, bot, te * 2 + 4, 4, 2); ctx.fill();
      tag(ctx, 'okulary ' + fmtD(P), xs, top - 12, { align: 'center', color: COL.cornea, bg: false });
      tag(ctx, P < 0 ? '(rozpraszające)' : '(skupiające)', xs, top - 12 - FS - 2, { align: 'center', color: COL.muted, size: FS - 1.5, bg: false });
    }

    // źródło i promienie
    function inRay(h) {
      var pts = [], xc = corneaX(g, h), yc = cy + h;
      if (hasSpec) {
        var hs = h / Math.max(0.3, 1 + (xc - xs) * aIn - m);
        if (far) pts.push(startX, cy + hs); else pts.push(sx, cy);
        pts.push(xs, cy + hs);
      } else {
        if (far) pts.push(startX, yc); else pts.push(sx, cy);
      }
      pts.push(xc, yc, g.lensX, cy + h * 0.84);
      return pts;
    }
    function bundle(hs, xF, color, lw, ph) {
      var hits = [];
      for (var i = 0; i < hs.length; i++) {
        var h = hs[i], pin = inRay(h);
        var x1 = g.lensX, y1 = cy + h * 0.84, dx = xF - x1, dy = cy - y1;
        var th = ellHit(x1, y1, dx, dy, g.cx, cy, g.rrx, g.rry);
        var hx = x1 + dx * th, hy = y1 + dy * th;
        var full = pin.concat([hx, hy]);
        ray(ctx, full, color, lw);
        if (th < 1) ray(ctx, [hx, hy, xF, cy], color, lw * 0.85, { dash: [3, 4], alpha: 0.55, glow: false });
        flow(ctx, full, t, color, { phase: ph + i * 13, speed: 38, gap: 62 });
        hits.push(hy);
      }
      return hits;
    }
    var pr = g.pupilR * 0.92;
    var hitsA = bundle([-pr, -pr * 0.45, pr * 0.45, pr], xf, COL.ray, 1.3, 0);
    var hitsB = astig ? bundle([-pr * 0.78, -pr * 0.22, pr * 0.22, pr * 0.78], xf2, COL.ray2, 1.1, 27) : null;

    if (!far) {
      glowDot(ctx, sx, cy, 9, COL.ray, 0.8 + 0.2 * Math.sin(t * 4));
      ctx.fillStyle = '#fff7d6'; ctx.beginPath(); ctx.arc(sx, cy, 2.4, 0, TAU); ctx.fill();
      var dyl = cy + ry * 0.86, x2 = g.apexX;
      arrow(ctx, (sx + x2) / 2, dyl, sx + 1, dyl, COL.muted, 1, 5);
      arrow(ctx, (sx + x2) / 2, dyl, x2 - 1, dyl, COL.muted, 1, 5);
      ctx.strokeStyle = 'rgba(147,160,184,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, cy + 6); ctx.lineTo(sx, dyl + 4); ctx.moveTo(x2, cy + g.cr + 4); ctx.lineTo(x2, dyl + 4); ctx.stroke();
      tag(ctx, fmtDist(dist), (sx + x2) / 2, dyl, { align: 'center', color: COL.text });
    }

    // rozmycie na siatkówce
    function blurArc(hits, color) {
      var mn = Math.min.apply(null, hits), mx = Math.max.apply(null, hits);
      var a0 = Math.asin(clamp((mn - cy) / g.rry, -1, 1)), a1 = Math.asin(clamp((mx - cy) / g.rry, -1, 1));
      if (a1 - a0 < 0.03) { glowDot(ctx, retX, cy, 7 + Math.sin(t * 4), color); return; }
      ctx.strokeStyle = rgba(color, 0.3); ctx.lineWidth = g.lw * 4;
      ctx.beginPath(); ctx.ellipse(g.cx, cy, g.rrx, g.rry, 0, a0, a1); ctx.stroke();
      ctx.strokeStyle = rgba(color, 0.9); ctx.lineWidth = g.lw * 1.4;
      ctx.beginPath(); ctx.ellipse(g.cx, cy, g.rrx, g.rry, 0, a0, a1); ctx.stroke();
    }
    blurArc(hitsA, COL.ray);
    if (hitsB) blurArc(hitsB, COL.ray2);
    // ogniska
    var pulse = 0.75 + 0.25 * Math.sin(t * 4);
    glowDot(ctx, xf, cy, 6, COL.ray, pulse);
    cross(ctx, xf, cy, 3, '#fff3c4', 1.4);
    if (astig) { glowDot(ctx, xf2, cy, 6, COL.ray2, pulse); cross(ctx, xf2, cy, 3, '#ccfbf1', 1.4); }

    // tytuł i opis
    var ty = 11;
    if (p.label) { tag(ctx, p.label, 8, ty, { bg: false, weight: 700 }); ty += FS + 4; }
    var sub = far ? 'obiekt daleko (∞)' : 'obiekt z bliska';
    if (A > 0.05) sub += ' · akomodacja ' + fmtD(A).replace('+', '');
    tag(ctx, sub, 8, ty, { bg: false, color: COL.muted, size: FS - 1 });
    ty += FS + 3;
    if (astig) {
      font(ctx, FS - 1.5, 600);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = COL.ray; ctx.beginPath(); ctx.moveTo(8, ty); ctx.lineTo(18, ty); ctx.stroke();
      var tw = tag(ctx, 'poziomy', 22, ty, { bg: false, color: COL.ray, size: FS - 1.5 });
      ctx.strokeStyle = COL.ray2; ctx.beginPath(); ctx.moveTo(tw.x + tw.w + 6, ty); ctx.lineTo(tw.x + tw.w + 16, ty); ctx.stroke();
      tag(ctx, 'pionowy', tw.x + tw.w + 20, ty, { bg: false, color: COL.ray2, size: FS - 1.5 });
      // dwa ogniska
      var lx = (xf + xf2) / 2, ly = cy - ry - 4;
      ctx.strokeStyle = 'rgba(147,160,184,0.75)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xf, cy - 4); ctx.lineTo(lx, ly + 6); ctx.lineTo(xf2, cy - 4); ctx.stroke();
      tag(ctx, 'dwa ogniska', lx, ly, { align: 'center', color: COL.text });
    }

    // okienko: obraz punktu na siatkówce
    var ir = Math.max(11, ry * 0.21), ix = W - ir - 9, iy = ir + 7;
    ctx.fillStyle = 'rgba(11,16,32,0.9)'; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(ix, iy, ir - 1, 0, TAU); ctx.clip();
    var kb = ir * 0.17;
    var bx = Math.min(ir - 1, 1.3 + kb * Math.abs(dD)), by = Math.min(ir - 1, 1.3 + kb * Math.abs(astig ? dD2 : dD));
    ctx.translate(ix, iy); ctx.rotate(-num(p.axisDeg, 0) * Math.PI / 180); ctx.scale(bx, by);
    var bg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    var sharp = Math.max(bx, by) < 2.5;
    bg.addColorStop(0, sharp ? '#fffbeb' : rgba(COL.ray, 0.95)); bg.addColorStop(0.55, rgba(COL.ray, sharp ? 0.8 : 0.45)); bg.addColorStop(1, rgba(COL.ray, 0));
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(147,160,184,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, TAU); ctx.stroke();
    tag(ctx, 'obraz punktu', W - 6, iy + ir + 9, { align: 'right', color: COL.muted, size: FS - 1.5, bg: false });

    // plakietka stanu
    var txt, col;
    if (astig && Math.abs(dD) >= 0.25 || astig && Math.abs(dD2) >= 0.25) { txt = 'Dwa ogniska → obraz rozmyty i rozciągnięty'; col = COL.warn; }
    else if (Math.abs(dD) < 0.25) { txt = 'Ognisko na siatkówce → ostro'; col = COL.accent; }
    else if (dD < 0) { txt = 'Ognisko przed siatkówką → obraz rozmyty'; col = COL.warn; }
    else { txt = 'Ognisko za siatkówką → obraz rozmyty'; col = COL.warn; }
    badge(ctx, txt, W / 2, H - 13, col);
  }

  // ───────────────────────────── 2. WIDZENIE OBUOCZNE ─────────────────────────────
  /* p = { devDeg, kind: 'eso'|'exo'|'hyper', mode: 'diplopia'|'suppression'|'amblyopia'|'nystagmus', ampDeg?, jerk? }
     Oko prowadzące – prawe, odchylone/słabsze – lewe. */
  function topEye(ctx, x, y, r, ang, dim) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(203,213,225,0.07)'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = COL.line; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.rotate(ang);
    ctx.strokeStyle = COL.cornea; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(r * 0.25, 0, r * 0.86, -0.78, 0.78); ctx.stroke();
    ctx.strokeStyle = dim ? '#64748b' : COL.iris; ctx.lineWidth = r * 0.2;
    ctx.beginPath(); ctx.moveTo(r * 0.74, -r * 0.62); ctx.lineTo(r * 0.74, -r * 0.2); ctx.moveTo(r * 0.74, r * 0.2); ctx.lineTo(r * 0.74, r * 0.62); ctx.stroke();
    ctx.fillStyle = 'rgba(147,197,253,0.35)'; ctx.beginPath(); ctx.ellipse(r * 0.52, 0, r * 0.13, r * 0.3, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(COL.retina, 0.8); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.84, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
    ctx.restore();
  }

  function miniWin(ctx, x, y, w, h, title, titleColor) {
    rr(ctx, x, y, w, h, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fill();
    ctx.strokeStyle = 'rgba(148,163,184,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    tag(ctx, title, x + w / 2, y - 8, { align: 'center', color: titleColor || COL.muted, size: FS - 1, bg: false });
  }

  function drawBinocular(D, p, t) {
    var ctx = D.ctx, W = D.W, H = D.H;
    var dev = clamp(Math.abs(num(p.devDeg, 0)), 0, 45), kind = p.kind || 'eso', mode = p.mode || 'diplopia';
    var nyst = mode === 'nystagmus';
    var amp = clamp(num(p.ampDeg, 4), 0, 20);
    var winH = clamp(H * 0.25, 42, 62), winY = H - winH - 5;
    var mx = W / 2, er = clamp(H * 0.072, 10, 18), eyeY = winY - er - 21, objY = 22;
    var sep = clamp(W * 0.1, 30, 46);
    var Lx = mx - sep, Rx = mx + sep;
    var rad = Math.PI / 180;

    var wv = 0;
    if (nyst) {
      if (p.jerk) { var ph = (t * 2.2) % 1; wv = ph < 0.8 ? ph / 0.8 * 2 - 1 : 1 - (ph - 0.8) / 0.2 * 2; }
      else wv = Math.sin(t * TAU * 2.2);
    }
    var nOff = nyst ? wv * amp * 2 * rad : 0;
    var visDev = Math.min(dev * 2, 40) * rad;
    var aL0 = Math.atan2(objY - eyeY, mx - Lx), aR0 = Math.atan2(objY - eyeY, mx - Rx);
    var aL = aL0 + nOff, aR = aR0 + nOff;
    if (!nyst && kind === 'eso') aL += visDev;
    if (!nyst && kind === 'exo') aL -= visDev;

    // głowa (subtelnie) i nos
    ctx.beginPath(); ctx.moveTo(mx - er * 0.5, eyeY + er * 0.7);
    ctx.quadraticCurveTo(mx - er * 0.1, eyeY - er * 0.2, mx, eyeY - er * 1.05);
    ctx.quadraticCurveTo(mx + er * 0.1, eyeY - er * 0.2, mx + er * 0.5, eyeY + er * 0.7);
    ctx.fillStyle = 'rgba(148,163,184,0.1)'; ctx.fill();
    ctx.strokeStyle = 'rgba(148,163,184,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();

    // linie widzenia
    function sight(x, ang, color, solid, phase) {
      var fx0 = x + Math.cos(ang) * er, fy0 = eyeY + Math.sin(ang) * er;
      var len = (fy0 - objY) / Math.max(0.2, -Math.sin(ang));
      var ex = fx0 + Math.cos(ang) * len, ey = fy0 + Math.sin(ang) * len;
      if (solid) {
        ray(ctx, [ex, ey, fx0, fy0], color, 1.3);
        flow(ctx, [ex, ey, fx0, fy0], t, color, { phase: phase, speed: 34, gap: 40 });
      } else {
        ray(ctx, [fx0, fy0, ex, ey], color, 1.2, { dash: [4, 4], glow: false });
      }
      return [ex, ey];
    }
    var leftOnTarget = nyst || dev < 0.5;
    var endL = sight(Lx, aL, leftOnTarget ? COL.ray : COL.ray2, leftOnTarget, 17);
    sight(Rx, aR, COL.ray, true, 0);
    if (!leftOnTarget && mode === 'diplopia' && kind !== 'hyper') star(ctx, endL[0], endL[1] + 2, 6, COL.ray2, 0.5);

    star(ctx, mx, objY, 9, COL.ray);
    glowDot(ctx, mx, objY, 16, COL.ray, 0.35);
    topEye(ctx, Lx, eyeY, er, aL, mode === 'amblyopia' || mode === 'suppression');
    topEye(ctx, Rx, eyeY, er, aR, false);

    // podpisy nad widokiem
    var title = nyst ? 'Oczopląs' : kind === 'eso' ? 'Zez zbieżny' : kind === 'exo' ? 'Zez rozbieżny' : 'Zez pionowy';
    if (!nyst && dev > 0) title += ' · ' + fmtNum(dev, 0) + '°';
    tag(ctx, title, 8, 11, { bg: false, weight: 700 });
    var sub = nyst ? 'oczy rytmicznie drgają' : kind === 'eso' ? 'oko skręca do nosa' : kind === 'exo' ? 'oko ucieka na zewnątrz' : 'oko ucieka w górę';
    tag(ctx, sub, 8, 11 + FS + 4, { bg: false, color: COL.muted, size: FS - 1 });
    if (!nyst) tag(ctx, '(kąt pokazany ×2)', W - 8, 11, { bg: false, color: COL.muted, size: FS - 2, align: 'right' });

    var lblL = mode === 'amblyopia' ? 'oko leniwe' : nyst ? 'lewe oko' : 'oko zezujące';
    tag(ctx, lblL, Lx - er - 7, eyeY, { align: 'right', color: leftOnTarget && !nyst ? COL.text : COL.ray2, size: FS - 1 });
    tag(ctx, nyst ? 'prawe oko' : 'oko prowadzące', Rx + er + 7, eyeY, { align: 'left', color: COL.text, size: FS - 1 });
    if (kind === 'hyper' && !nyst) {
      var ax = Lx - er - 6;
      arrow(ctx, Lx + er * 0.2, eyeY - er - 2, Lx + er * 0.2, eyeY - er - 16, COL.ray2, 1.6, 5);
      tag(ctx, 'w górę', Lx + er * 0.2 - 4, eyeY - er - 12, { align: 'right', color: COL.ray2, size: FS - 1.5 });
      void ax;
    }
    if (nyst) {
      for (var s2 = -1; s2 <= 1; s2 += 2) {
        var ex2 = mx + s2 * sep + s2 * (er + 9), aR2 = er * 0.75;
        ctx.strokeStyle = COL.ray2; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(mx + s2 * sep, eyeY, er + 6, Math.PI / 2 + s2 * (Math.PI / 2) - 0.75, Math.PI / 2 + s2 * (Math.PI / 2) + 0.75); ctx.stroke();
        for (var e3 = -1; e3 <= 1; e3 += 2) {
          var aa = Math.PI / 2 + s2 * (Math.PI / 2) + e3 * 0.75, hx = mx + s2 * sep + Math.cos(aa) * (er + 6), hy = eyeY + Math.sin(aa) * (er + 6);
          var ta = aa + e3 * Math.PI / 2;
          arrow(ctx, hx - Math.cos(ta) * 3, hy - Math.sin(ta) * 3, hx + Math.cos(ta) * 2, hy + Math.sin(ta) * 2, COL.ray2, 1.4, 5);
        }
        void ex2; void aR2;
      }
    }

    // okienka: lewe oko, prawe oko, mózg
    var gapW = 18, bw = (W - 12 - gapW * 2) / 3, x1 = 6, x2 = x1 + bw + gapW, x3 = x2 + bw + gapW;
    var cyW = winY + winH / 2, sr = clamp(winH * 0.2, 7, 12);
    var off = clamp(dev * 1.6, 7, bw * 0.3);
    var odx = 0, ody = 0;
    if (!nyst) { if (kind === 'eso') odx = -off; else if (kind === 'exo') odx = off; else ody = Math.min(off, winH * 0.25); }
    var supp = mode === 'suppression' || mode === 'amblyopia';
    miniWin(ctx, x1, winY, bw, winH, mode === 'amblyopia' ? 'lewe oko (leniwe)' : 'lewe oko', supp ? COL.warn : null);
    miniWin(ctx, x2, winY, bw, winH, 'prawe oko');
    miniWin(ctx, x3, winY, bw, winH, 'mózg widzi', COL.text);
    font(ctx, FS + 2, 700); ctx.fillStyle = COL.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+', x1 + bw + gapW / 2, cyW); ctx.fillText('→', x2 + bw + gapW / 2, cyW);

    ctx.save(); rr(ctx, x1, winY, bw, winH, 7); ctx.clip();
    if (nyst) {
      var nx = wv * bw * 0.16;
      for (var k = 0; k < 4; k++) star(ctx, x1 + bw / 2 + nx - k * wv * 3, cyW, sr, COL.ray, 0.9 - k * 0.22);
    } else if (mode === 'amblyopia') {
      for (var b = 0; b < 7; b++) star(ctx, x1 + bw / 2 + odx + Math.cos(b) * 3, cyW + ody + Math.sin(b) * 3, sr * 1.1, COL.ray, 0.16);
    } else star(ctx, x1 + bw / 2 + odx, cyW + ody, sr, leftOnTarget || mode !== 'diplopia' ? COL.ray : COL.ray2, mode === 'suppression' ? 0.5 : 1);
    if (supp) {
      ctx.fillStyle = 'rgba(71,85,105,0.5)'; ctx.fillRect(x1, winY, bw, winH);
      ctx.strokeStyle = rgba(COL.warn, 0.6); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x1 + 4, winY + 4); ctx.lineTo(x1 + bw - 4, winY + winH - 4);
      ctx.moveTo(x1 + bw - 4, winY + 4); ctx.lineTo(x1 + 4, winY + winH - 4); ctx.stroke();
    }
    ctx.restore();
    if (supp) tag(ctx, 'mózg wyłącza obraz', x1 + bw / 2, cyW, { align: 'center', color: COL.warn, size: FS - 1.5, bg: 'rgba(18,24,38,0.92)' });

    ctx.save(); rr(ctx, x2, winY, bw, winH, 7); ctx.clip();
    if (nyst) { for (var k2 = 0; k2 < 4; k2++) star(ctx, x2 + bw / 2 + wv * bw * 0.16 - k2 * wv * 3, cyW, sr, COL.ray, 0.9 - k2 * 0.22); }
    else star(ctx, x2 + bw / 2, cyW, sr, COL.ray);
    ctx.restore();

    ctx.save(); rr(ctx, x3, winY, bw, winH, 7); ctx.clip();
    if (nyst) {
      for (var k3 = 0; k3 < 5; k3++) star(ctx, x3 + bw / 2 + wv * bw * 0.16 - k3 * wv * 3, cyW, sr, COL.ray, 0.9 - k3 * 0.17);
    } else if (mode === 'diplopia' && (Math.abs(odx) + Math.abs(ody) > 0) && dev > 0.3) {
      star(ctx, x3 + bw / 2 + odx * 0.5, cyW + ody * 0.5, sr, COL.ray2, 0.55);
      star(ctx, x3 + bw / 2 - odx * 0.5, cyW - ody * 0.5, sr, COL.ray);
    } else star(ctx, x3 + bw / 2, cyW, sr, COL.ray);
    ctx.restore();
    if (mode === 'diplopia' && dev > 0.3 && !nyst) tag(ctx, 'podwójnie', x3 + bw - 4, winY + winH - 8, { align: 'right', color: COL.warn, size: FS - 2, bg: false });
    if (nyst) tag(ctx, 'obraz drga', x3 + bw - 4, winY + winH - 8, { align: 'right', color: COL.warn, size: FS - 2, bg: false });
  }

  // ───────────────────────────── 3. CZOPKI ─────────────────────────────
  /* p = { missing: null|'L'|'M'|'S', shift: 0..1, mono: bool }
     missing – który typ czopka jest wadliwy; shift – siła: 0<shift<1 → anomalia (krzywa przesunięta),
     shift ≥1 (albo 0 / brak) → całkowity brak (krzywa przerywana, szara). mono → tylko pręciki. */
  var CONES = {
    S: { pk: 420, sl: 24, sr: 30, col: '#60a5fa' },
    M: { pk: 530, sl: 42, sr: 40, col: '#4ade80' },
    L: { pk: 560, sl: 50, sr: 42, col: '#f87171' }
  };
  function sens(l, pk, sl, sr) { var d = (l - pk) / (l < pk ? sl : sr); return Math.exp(-0.5 * d * d); }

  function wlRGB(l) {
    var r = 0, g = 0, b = 0;
    if (l < 440) { r = -(l - 440) / 60; b = 1; }
    else if (l < 490) { g = (l - 440) / 50; b = 1; }
    else if (l < 510) { g = 1; b = -(l - 510) / 20; }
    else if (l < 580) { r = (l - 510) / 70; g = 1; }
    else if (l < 645) { r = 1; g = -(l - 645) / 65; }
    else { r = 1; }
    var f = l < 420 ? 0.3 + 0.7 * (l - 380) / 40 : l > 645 ? 0.3 + 0.7 * (700 - l) / 55 : 1;
    return [r * f, g * f, b * f];
  }
  var SIM = {
    L: [0.11238, 0.88762, 0, 0.11238, 0.88762, 0, 0.00401, -0.00401, 1],
    M: [0.29275, 0.70725, 0, 0.29275, 0.70725, 0, -0.02234, 0.02234, 1],
    S: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039]
  };
  var specCache = {};
  function spectrumCanvas(key, miss, sev, mono) {
    if (specCache[key]) return specCache[key];
    var N = 160, c = document.createElement('canvas'); c.width = N; c.height = 1;
    var cx = c.getContext('2d'), img = cx.createImageData(N, 1);
    for (var i = 0; i < N; i++) {
      var l = 380 + 320 * i / (N - 1), rgb = wlRGB(l), out;
      if (mono) {
        var v = Math.pow(sens(l, 498, 40, 46) * 0.9, 0.8); out = [v, v, v];
      } else if (miss) {
        var lin = [Math.pow(rgb[0], 2.2), Math.pow(rgb[1], 2.2), Math.pow(rgb[2], 2.2)], M = SIM[miss];
        out = [];
        for (var k = 0; k < 3; k++) {
          var sim = M[k * 3] * lin[0] + M[k * 3 + 1] * lin[1] + M[k * 3 + 2] * lin[2];
          out.push(Math.pow(clamp(lerp(lin[k], sim, sev), 0, 1), 1 / 2.2));
        }
      } else out = rgb;
      img.data[i * 4] = out[0] * 255; img.data[i * 4 + 1] = out[1] * 255; img.data[i * 4 + 2] = out[2] * 255; img.data[i * 4 + 3] = 255;
    }
    cx.putImageData(img, 0, 0);
    specCache[key] = c;
    return c;
  }

  function drawCones(D, p, t) {
    var ctx = D.ctx, W = D.W, H = D.H;
    var miss = (p.missing === 'L' || p.missing === 'M' || p.missing === 'S') ? p.missing : null;
    var mono = !!p.mono;
    var sh = num(p.shift, 1);
    var absent = !!miss && (!(sh > 0) || sh >= 0.999);
    var anom = miss && !absent ? clamp(sh, 0, 1) : 0;
    var ml = Math.max(46, W * 0.12), mr = 10, pt = 46, pb = H - 46;
    var pw = W - ml - mr;
    function X(l) { return ml + (l - 380) / 320 * pw; }
    function Y(v) { return pb - v * (pb - pt); }

    // siatka i oś
    ctx.strokeStyle = 'rgba(148,163,184,0.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ml, Y(0.5)); ctx.lineTo(ml + pw, Y(0.5)); ctx.moveTo(ml, Y(1)); ctx.lineTo(ml + pw, Y(1)); ctx.stroke();
    ctx.strokeStyle = 'rgba(203,213,225,0.55)';
    ctx.beginPath(); ctx.moveTo(ml, pb); ctx.lineTo(ml + pw, pb); ctx.moveTo(ml, pb); ctx.lineTo(ml, pt - 4); ctx.stroke();
    font(ctx, FS - 2, 600); ctx.fillStyle = COL.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var l = 400; l <= 700; l += 50) {
      ctx.beginPath(); ctx.moveTo(X(l), pb); ctx.lineTo(X(l), pb + 3); ctx.stroke();
      if (l % 100 === 0) ctx.fillText(l === 700 ? '700 nm' : String(l), l === 700 ? X(l) - 14 : X(l), pb + 9);
    }
    ctx.save(); ctx.translate(ml - 8, (pt + pb) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('czułość', 0, 0); ctx.restore();

    function curve(pk, sl, sr, color, o) {
      o = o || {};
      ctx.beginPath(); ctx.moveTo(X(380), Y(0));
      for (var l2 = 380; l2 <= 700; l2 += 5) ctx.lineTo(X(l2), Y(sens(l2, pk, sl, sr)));
      ctx.lineTo(X(700), Y(0));
      if (o.fill) { ctx.fillStyle = rgba(color, o.fill); ctx.fill(); }
      ctx.beginPath();
      for (var l3 = 380; l3 <= 700; l3 += 5) { var yy = Y(sens(l3, pk, sl, sr)); if (l3 === 380) ctx.moveTo(X(l3), yy); else ctx.lineTo(X(l3), yy); }
      if (o.dash) ctx.setLineDash(o.dash);
      if (o.glow) { ctx.strokeStyle = rgba(color, 0.18); ctx.lineWidth = 6; ctx.stroke(); }
      ctx.strokeStyle = rgba(color, o.alpha == null ? 1 : o.alpha); ctx.lineWidth = o.lw || 2; ctx.stroke();
      ctx.setLineDash([]);
    }

    var info = 'trzy typy czopków – widzenie barwne', infoCol = COL.accent, name = 'norma';
    var keys = ['S', 'M', 'L'];
    var pulse = 0.5 + 0.5 * Math.sin(t * 2.5);
    for (var i = 0; i < 3; i++) {
      var key = keys[i], c = CONES[key], lblX = X(c.pk), lblY = Y(1) - 8, al = key === 'M' ? 'right' : key === 'L' ? 'left' : 'center';
      if (key === 'M') lblX -= 3; if (key === 'L') lblX += 3;
      var label = key + ' ' + c.pk;
      if (mono) {
        curve(c.pk, c.sl, c.sr, '#64748b', { dash: [3, 4], lw: 1.2, alpha: 0.6 });
        tag(ctx, label, lblX, lblY, { align: al, color: '#64748b', size: FS - 1, bg: false, strike: '#64748b' });
      } else if (miss === key && absent) {
        curve(c.pk, c.sl, c.sr, '#64748b', { dash: [4, 4], lw: 1.4 });
        tag(ctx, label, lblX, lblY, { align: al, color: '#64748b', size: FS - 1, bg: false, strike: COL.warn });
      } else if (miss === key && anom > 0) {
        var target = key === 'L' ? CONES.M.pk : key === 'M' ? CONES.L.pk : CONES.M.pk;
        var npk = lerp(c.pk, target, anom * 0.85);
        curve(c.pk, c.sl, c.sr, c.col, { dash: [3, 4], lw: 1, alpha: 0.55 });
        curve(npk, c.sl, c.sr, c.col, { fill: 0.16, lw: 2.2, glow: true });
        var ay = Y(0.9);
        arrow(ctx, X(c.pk), ay, X(npk), ay, COL.text, 1.4, 5);
        tag(ctx, key + '′ ' + Math.round(npk), X(npk), Y(0.66), { align: 'center', color: c.col, size: FS - 1, border: rgba(c.col, 0.5) });
        tag(ctx, label, lblX, lblY, { align: al, color: rgba(c.col, 0.6), size: FS - 1, bg: false });
      } else {
        curve(c.pk, c.sl, c.sr, c.col, { fill: 0.15 + 0.03 * pulse, lw: 2 });
        tag(ctx, label, lblX, lblY, { align: al, color: c.col, size: FS - 1, bg: false });
      }
    }
    if (mono) {
      curve(498, 40, 46, '#cbd5e1', { fill: 0.18, lw: 2.2, glow: true });
      tag(ctx, 'pręciki 498', X(498) + 4, Y(0.78), { align: 'left', color: COL.line, size: FS - 1 });
      info = 'tylko pręciki – brak barw'; infoCol = COL.warn; name = 'achromatopsja';
    } else if (miss) {
      var names = { L: ['protanopia', 'protanomalia'], M: ['deuteranopia', 'deuteranomalia'], S: ['tritanopia', 'tritanomalia'] };
      name = names[miss][absent ? 0 : 1];
      info = absent ? 'brak czopków ' + miss : 'czopki ' + miss + ' przesunięte (' + Math.round(anom * 100) + '%)';
      infoCol = COL.warn;
    }
    tag(ctx, 'Czułość czopków', 8, 11, { bg: false, weight: 700 });
    tag(ctx, name, W - 8, 11, { bg: false, weight: 700, align: 'right', color: miss || mono ? COL.warn : COL.accent });
    tag(ctx, info, W - 8, 11 + FS + 4, { bg: false, align: 'right', color: miss || mono ? '#fca5a5' : COL.muted, size: FS - 1, strike: false });

    // paski widma
    var by1 = pb + 16, by2 = pb + 31, bh = 8;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(spectrumCanvas('n', null, 0, false), 0, 0, 160, 1, ml, by1, pw, bh);
    var simKey = mono ? 'mono' : miss ? miss + Math.round((absent ? 1 : anom) * 20) : 'n';
    ctx.drawImage(spectrumCanvas(simKey, miss, absent ? 1 : anom, mono), 0, 0, 160, 1, ml, by2, pw, bh);
    ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1;
    ctx.strokeRect(ml + 0.5, by1 + 0.5, pw - 1, bh - 1); ctx.strokeRect(ml + 0.5, by2 + 0.5, pw - 1, bh - 1);
    tag(ctx, 'widmo', ml - 5, by1 + bh / 2, { align: 'right', color: COL.muted, size: FS - 2, bg: false });
    tag(ctx, 'tak widzi', ml - 5, by2 + bh / 2, { align: 'right', color: miss || mono ? COL.text : COL.muted, size: FS - 2, bg: false });
  }

  // ───────────────────────────── 4. ANATOMIA ─────────────────────────────
  function singleEye(D, o) {
    var ry = Math.min(D.H * 0.31, D.W * 0.17);
    return eyeGeom(D.W * 0.47, D.H * 0.5 + 3, ry, o);
  }
  function insetEye(D, o) {
    var ry = Math.min(D.H * 0.29, D.W * 0.155);
    var g = eyeGeom(0, D.H * 0.5 + 2, ry, o);
    var cx = 8 + (g.cx - g.apexX) + D.W * 0.02;
    return eyeGeom(cx, D.H * 0.5 + 2, ry, o);
  }
  function insetCircle(D, g) {
    var right = g.cx + g.rx + g.ry * 0.5 + 10;
    var r = Math.min(D.H * 0.33, (D.W - right - 8) / 2);
    return { x: D.W - 8 - r, y: D.H * 0.5 + 2, r: r };
  }
  function zoomLines(ctx, sx, sy, sr, ix, iy, ir) {
    ctx.strokeStyle = 'rgba(203,213,225,0.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.stroke();
    var a = Math.atan2(iy - sy, ix - sx), d = Math.hypot(ix - sx, iy - sy);
    var b = Math.asin(clamp((ir - sr) / d, -1, 1));
    ctx.strokeStyle = 'rgba(203,213,225,0.3)'; ctx.setLineDash([3, 3]); ctx.beginPath();
    for (var s = -1; s <= 1; s += 2) {
      var n = a + s * (Math.PI / 2 + b);
      ctx.moveTo(sx + Math.cos(n) * sr, sy + Math.sin(n) * sr); ctx.lineTo(ix + Math.cos(n) * ir, iy + Math.sin(n) * ir);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }
  function lensFrame(ctx, x, y, r) {
    ctx.strokeStyle = 'rgba(203,213,225,0.85)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r - 3, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
  }

  // Dno oka w okienku-lupie. o: cup, drusen, scar, dr, rp, vessels
  var VESSELS = [
    // [grubość, kolor 0=żyła 1=tętnica, punkty krzywej Béziera w jednostkach promienia]
    [1, 0, -0.42, -0.03, -0.18, -0.5, 0.32, -0.56, 0.9, -0.36], [1, 0, -0.42, 0.03, -0.18, 0.5, 0.32, 0.56, 0.9, 0.36],
    [0.75, 1, -0.42, -0.06, -0.08, -0.38, 0.3, -0.4, 0.88, -0.14], [0.75, 1, -0.42, 0.06, -0.08, 0.38, 0.3, 0.4, 0.88, 0.14],
    [0.8, 0, -0.44, -0.04, -0.55, -0.35, -0.7, -0.55, -0.9, -0.62], [0.8, 0, -0.44, 0.04, -0.55, 0.35, -0.7, 0.55, -0.9, 0.62],
    [0.6, 1, -0.45, -0.02, -0.65, -0.12, -0.8, -0.2, -0.98, -0.18], [0.6, 1, -0.45, 0.02, -0.65, 0.12, -0.8, 0.2, -0.98, 0.18],
    [0.45, 1, 0.05, -0.45, 0.1, -0.3, 0.12, -0.22, 0.16, -0.15], [0.45, 1, 0.05, 0.45, 0.1, 0.3, 0.12, 0.22, 0.16, 0.15]
  ];
  function fundus(ctx, x, y, r, o, t) {
    o = o || {};
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    var gr = ctx.createRadialGradient(x + r * 0.1, y, r * 0.05, x, y, r);
    gr.addColorStop(0, '#c4583a'); gr.addColorStop(0.65, '#9c3a25'); gr.addColorStop(1, '#4d1a12');
    ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    var mxp = x + r * 0.1;
    var mg = ctx.createRadialGradient(mxp, y, 0, mxp, y, r * 0.22);
    mg.addColorStop(0, 'rgba(70,18,10,0.75)'); mg.addColorStop(1, 'rgba(70,18,10,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mxp, y, r * 0.22, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.7)'; ctx.beginPath(); ctx.arc(mxp, y, Math.max(1, r * 0.018), 0, TAU); ctx.fill();
    // tarcza
    var dx = x - r * 0.42, dr = r * 0.13;
    var dg = ctx.createRadialGradient(dx, y, 0, dx, y, dr);
    dg.addColorStop(0, o.paleDisc ? '#fff7e0' : '#ffe9b8'); dg.addColorStop(1, o.paleDisc ? '#f5dcb0' : '#eba673');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(dx, y, dr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,235,0.85)'; ctx.beginPath(); ctx.arc(dx + dr * 0.1, y, dr * (o.cup || 0.32), 0, TAU); ctx.fill();
    // naczynia
    var vs = o.vessels == null ? 1 : o.vessels;
    for (var i = 0; i < VESSELS.length; i++) {
      var v = VESSELS[i];
      ctx.strokeStyle = v[1] ? 'rgba(220,60,50,0.95)' : 'rgba(120,20,22,0.95)';
      ctx.lineWidth = Math.max(0.6, r * 0.028 * v[0] * vs);
      ctx.beginPath(); ctx.moveTo(x + v[2] * r, y + v[3] * r);
      ctx.bezierCurveTo(x + v[4] * r, y + v[5] * r, x + v[6] * r, y + v[7] * r, x + v[8] * r, y + v[9] * r); ctx.stroke();
    }
    var j, a, d, px, py, n;
    if (o.drusen) {
      n = Math.round(5 + 22 * o.drusen);
      for (j = 0; j < n; j++) {
        a = rnd(j + 3) * TAU; d = r * (0.05 + 0.2 * Math.sqrt(rnd(j + 40)));
        px = mxp + Math.cos(a) * d; py = y + Math.sin(a) * d;
        ctx.fillStyle = 'rgba(253,224,71,' + (0.6 + 0.35 * rnd(j)) + ')';
        ctx.beginPath(); ctx.arc(px, py, r * (0.015 + 0.02 * rnd(j + 9)), 0, TAU); ctx.fill();
      }
    }
    if (o.scar) {
      var sr = r * (0.04 + 0.15 * o.scar);
      var sg = ctx.createRadialGradient(mxp, y, 0, mxp, y, sr);
      sg.addColorStop(0, 'rgba(15,8,8,0.95)'); sg.addColorStop(0.7, 'rgba(30,12,10,0.8)'); sg.addColorStop(1, 'rgba(30,12,10,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(mxp, y, sr, 0, TAU); ctx.fill();
    }
    if (o.dr) {
      var sv = o.dr;
      n = Math.round(4 + 10 * sv);
      for (j = 0; j < n; j++) { // wysięki twarde
        a = rnd(j + 70) * TAU; d = r * (0.12 + 0.2 * rnd(j + 71));
        ctx.fillStyle = 'rgba(254,240,138,0.92)';
        ctx.beginPath(); ctx.arc(mxp + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.014 + 0.018 * rnd(j + 72)), 0, TAU); ctx.fill();
      }
      n = Math.round(3 + 7 * sv);
      for (j = 0; j < n; j++) { // wylewy plamiste
        a = rnd(j + 90) * TAU; d = r * (0.3 + 0.5 * rnd(j + 91));
        px = x + Math.cos(a) * d; py = y + Math.sin(a) * d * 0.9;
        ctx.fillStyle = 'rgba(110,8,12,0.9)';
        ctx.beginPath(); ctx.ellipse(px, py, r * (0.035 + 0.03 * rnd(j + 92)), r * (0.025 + 0.02 * rnd(j + 93)), rnd(j) * 3, 0, TAU); ctx.fill();
      }
      n = Math.round(8 + 18 * sv);
      for (j = 0; j < n; j++) { // mikrotętniaki
        a = rnd(j + 120) * TAU; d = r * (0.15 + 0.7 * rnd(j + 121));
        ctx.fillStyle = 'rgba(200,20,30,0.95)';
        ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, Math.max(0.8, r * 0.013), 0, TAU); ctx.fill();
      }
    }
    if (o.rp) {
      n = Math.round(10 + 40 * o.rp);
      ctx.strokeStyle = 'rgba(20,10,8,0.92)'; ctx.lineWidth = Math.max(0.8, r * 0.014);
      for (j = 0; j < n; j++) {
        a = rnd(j + 200) * TAU; d = r * (0.62 - 0.22 * o.rp + (0.36 + 0.22 * o.rp) * rnd(j + 201));
        px = x + Math.cos(a) * d; py = y + Math.sin(a) * d;
        var sz = r * (0.03 + 0.03 * rnd(j + 202));
        ctx.beginPath();
        for (var k = 0; k < 4; k++) {
          var b = rnd(j * 7 + k) * TAU;
          ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(b) * sz, py + Math.sin(b) * sz);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    lensFrame(ctx, x, y, r);
    return { macula: [mxp, y], disc: [dx, y], discR: dr };
  }

  function sevOf(p, d) { return clamp(num(p.severity, d), 0, 1); }

  function incomingRays(ctx, g, t, hs, color, toX, toY, o) {
    o = o || {};
    var res = [];
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i], xc = corneaX(g, h);
      var pts = [o.startX == null ? 3 : o.startX, g.cy + h, xc, g.cy + h, g.lensX, g.cy + h * 0.84];
      if (toX != null) pts.push(toX, toY == null ? g.cy : toY);
      ray(ctx, pts, color, 1.2, { alpha: o.alpha });
      if (!o.noFlow) flow(ctx, pts, t, color, { phase: i * 17, alpha: o.alpha });
      res.push(pts);
    }
    return res;
  }

  function anatomyHealthy(D, p, t) {
    var ctx = D.ctx, W = D.W, H = D.H, g = singleEye(D);
    drawEye(ctx, g);
    var pr = g.pupilR * 0.8;
    incomingRays(ctx, g, t, [-pr, pr], COL.ray, g.retX, g.cy);
    glowDot(ctx, g.retX, g.cy, 6 + Math.sin(t * 4), COL.ray);
    var fs = FS - 0.5;
    callout(ctx, 'rogówka', corneaX(g, -g.cr * 0.55), g.cy - g.cr * 0.55, 8, g.cy - g.ry * 0.78, { size: fs });
    callout(ctx, 'tęczówka', g.irisX, g.cy + (g.cr + g.pupilR) / 2, 8, g.cy + g.ry * 0.78, { size: fs });
    callout(ctx, 'soczewka', g.lensX, g.cy - g.lensRy, g.lensX - g.ry * 0.25, 12, { size: fs, align: 'center' });
    tag(ctx, 'ciało szkliste', g.cx + g.rx * 0.08, g.cy - g.ry * 0.5, { align: 'center', color: COL.muted, size: FS - 1.5, bg: false });
    var rp = rPt(g, -0.75);
    callout(ctx, 'siatkówka', rp[0], rp[1], W - 8, 18, { size: fs, align: 'right', dotColor: COL.retina });
    callout(ctx, 'plamka żółta', g.retX, g.cy, W - 8, g.cy - g.ry * 0.3, { size: fs, align: 'right', dotColor: COL.macula });
    callout(ctx, 'nerw wzrokowy', g.nerveMid[0], g.nerveMid[1], W - 8, g.cy + g.ry * 0.8, { size: fs, align: 'right', dotColor: COL.nerve });
  }

  function anatomyLens(D, p, t) {
    var ctx = D.ctx, W = D.W, H = D.H, sev = sevOf(p, 0.6), g = singleEye(D);
    var lensFill = mixHex('#93c5fd', '#c99a3a', Math.min(1, sev * 1.2), 0.22 + 0.55 * sev);
    drawEye(ctx, g, { lensFill: lensFill, lensStroke: mixHex('#93c5fd', '#e0b25a', sev), lensGlow: 0.2 + 0.12 * Math.sin(t * 3), lensGlowColor: COL.macula });
    // mętne obłoczki w soczewce
    ctx.save(); ctx.beginPath(); ctx.ellipse(g.lensX, g.cy, g.lensRx, g.lensRy, 0, 0, TAU); ctx.clip();
    for (var i = 0; i < 9; i++) {
      var bx = g.lensX + (rnd(i) - 0.5) * g.lensRx * 1.6, by = g.cy + (rnd(i + 5) - 0.5) * g.lensRy * 1.7;
      glowDot(ctx, bx, by, g.lensRx * (0.5 + 0.6 * rnd(i + 9)), '#f5f0e1', 0.25 + 0.5 * sev);
    }
    ctx.restore();
    var pr = g.pupilR * 0.85, hs = [-pr, 0, pr];
    var through = 1 - 0.75 * sev;
    for (var k = 0; k < hs.length; k++) {
      var h = hs[k], pts = [3, g.cy + h, corneaX(g, h), g.cy + h, g.lensX, g.cy + h * 0.84];
      ray(ctx, pts, COL.ray, 1.3); flow(ctx, pts, t, COL.ray, { phase: k * 19 });
      var pts2 = [g.lensX, g.cy + h * 0.84, g.retX, g.cy];
      ray(ctx, pts2, COL.ray, 1.2, { alpha: through });
      flow(ctx, pts2, t, COL.ray, { phase: k * 19 + 30, alpha: through });
    }
    // rozproszone światło
    var n = Math.round(6 + 12 * sev);
    for (var j = 0; j < n; j++) {
      var a = rnd(j + 1) * TAU, len = g.ry * (0.12 + 0.2 * rnd(j + 2));
      var fl = 0.5 + 0.5 * Math.sin(t * 5 + j * 1.7);
      var sx = g.lensX + Math.cos(a) * g.lensRx * 0.6, sy = g.cy + Math.sin(a) * g.lensRy * 0.5;
      ctx.strokeStyle = rgba(COL.ray, (0.25 + 0.5 * fl) * (0.4 + 0.6 * sev)); ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len); ctx.stroke();
    }
    glowDot(ctx, g.retX, g.cy, 8, COL.ray, 0.35 + 0.5 * through);
    callout(ctx, 'zmętniała soczewka (zaćma)', g.lensX, g.cy - g.lensRy, g.lensX - g.ry * 0.1, 13, { align: 'center', dotColor: COL.macula });
    var sp = [g.lensX + g.ry * 0.2, g.cy + g.ry * 0.25];
    callout(ctx, 'rozproszone światło', sp[0], sp[1], g.lensX - g.ry * 0.3, H - 12, { align: 'center' });
    callout(ctx, 'mniej światła', g.retX, g.cy, W - 8, g.cy - g.ry * 0.55, { align: 'right', dotColor: COL.macula });
    tag(ctx, 'na siatkówce', W - 8, g.cy - g.ry * 0.55 + FS + 5, { align: 'right', color: COL.text });
  }

  function anatomyGlaucoma(D, p, t) {
    var ctx = D.ctx, W = D.W, H = D.H, sev = sevOf(p, 0.6), g = insetEye(D);
    drawEye(ctx, g, { fibers: 1 - 0.8 * sev, noDisc: true });
    // wydrążenie tarczy w przekroju
    var a1 = g.nerveA - g.nerveW * 0.9, a2 = g.nerveA + g.nerveW * 0.9;
    var q1 = rPt(g, a1), q2 = rPt(g, a2), depth = g.ry * (0.04 + 0.2 * sev);
    var mxp = (q1[0] + q2[0]) / 2 + depth * 0.97, myp = (q1[1] + q2[1]) / 2 + depth * 0.24;
    ctx.fillStyle = 'rgba(11,16,32,0.9)';
    ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.quadraticCurveTo(mxp, myp - (q2[1] - q1[1]) * 0.6, mxp, myp);
    ctx.quadraticCurveTo(mxp, myp + (q2[1] - q1[1]) * 0.6, q2[0], q2[1]); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(253,230,138,0.9)'; ctx.lineWidth = g.lw;
    ctx.beginPath(); ctx.moveTo(q1[0], q1[1]); ctx.quadraticCurveTo(mxp, myp - (q2[1] - q1[1]) * 0.6, mxp, myp);
    ctx.quadraticCurveTo(mxp, myp + (q2[1] - q1[1]) * 0.6, q2[0], q2[1]); ctx.stroke();
    // strzałki ciśnienia
    var pulse = 0.5 + 0.5 * Math.sin(t * 3);
    var ang = [-2.2, -1.3, -0.5, 0.75, 1.4, 2.15];
    for (var i = 0; i < ang.length; i++) {
      var a = ang[i], r0 = 0.32, r1 = 0.62 + 0.12 * pulse * (0.4 + sev);
      arrow(ctx, g.cx + g.rx * 0.15 + Math.cos(a) * g.rrx * r0, g.cy + Math.sin(a) * g.rry * r0,
        g.cx + g.rx * 0.15 + Math.cos(a) * g.rrx * r1, g.cy + Math.sin(a) * g.rry * r1, rgba(COL.warn, 0.6 + 0.4 * pulse), 1.6, 6);
    }
    tag(ctx, 'ciśnienie ↑', g.cx + g.rx * 0.15, g.cy, { align: 'center', color: COL.warn, size: FS - 1 });
    var ic = insetCircle(D, g);
    zoomLines(ctx, (q1[0] + q2[0]) / 2 + 2, (q1[1] + q2[1]) / 2, g.ry * 0.14, ic.x, ic.y, ic.r);
    // powiększona tarcza
    ctx.save(); ctx.beginPath(); ctx.arc(ic.x, ic.y, ic.r, 0, TAU); ctx.clip();
    var fg = ctx.createRadialGradient(ic.x, ic.y, ic.r * 0.3, ic.x, ic.y, ic.r);
    fg.addColorStop(0, '#b34a2f'); fg.addColorStop(1, '#5a1d13');
    ctx.fillStyle = fg; ctx.fillRect(ic.x - ic.r, ic.y - ic.r, ic.r * 2, ic.r * 2);
    var dR = ic.r * 0.56, cdr = 0.3 + 0.58 * sev;
    var dg = ctx.createRadialGradient(ic.x, ic.y, dR * 0.4, ic.x, ic.y, dR);
    dg.addColorStop(0, '#f7c08a'); dg.addColorStop(1, '#df8a5c');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.arc(ic.x, ic.y, dR, 0, TAU); ctx.fill();
    var cg = ctx.createRadialGradient(ic.x + dR * 0.05, ic.y, 0, ic.x + dR * 0.05, ic.y, dR * cdr);
    cg.addColorStop(0, '#fffaf0'); cg.addColorStop(0.8, '#fde9c8'); cg.addColorStop(1, 'rgba(253,233,200,0.6)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(ic.x + dR * 0.05, ic.y, dR * cdr, 0, TAU); ctx.fill();
    // naczynia wychodzą z zagłębienia i załamują się na jego brzegu
    var ccx = ic.x + dR * 0.05, cR = dR * cdr;
    for (var v = 0; v < 4; v++) {
      var s = v < 2 ? -1 : 1, side = v % 2 ? 1 : -1;
      var kx = ccx + side * cR * 0.3, ky = ic.y + s * cR * 0.95;
      ctx.strokeStyle = v % 2 ? 'rgba(220,60,50,0.95)' : 'rgba(120,20,22,0.95)'; ctx.lineWidth = Math.max(1, ic.r * (v % 2 ? 0.026 : 0.034));
      ctx.beginPath(); ctx.moveTo(ccx + side * 1.5, ic.y + s * cR * 0.15);
      ctx.lineTo(kx, ky);
      ctx.lineTo(kx + side * ic.r * 0.05, ky + s * ic.r * 0.06);
      ctx.bezierCurveTo(kx + side * ic.r * 0.1, ic.y + s * ic.r * 0.75, ccx + side * ic.r * 0.45, ic.y + s * ic.r * 0.85, ccx + side * ic.r * 0.85, ic.y + s * ic.r * 0.75);
      ctx.stroke();
    }
    ctx.restore();
    lensFrame(ctx, ic.x, ic.y, ic.r);
    callout(ctx, 'wydrążona tarcza nerwu', ic.x + dR * cdr * 0.7, ic.y - dR * cdr * 0.5, ic.x, 12, { align: 'center', dotColor: COL.text });
    callout(ctx, 'ubytek włókien nerwowych', g.nerveMid[0], g.nerveMid[1] + 3, g.cx + g.rx * 0.3, H - 11, { align: 'center', dotColor: COL.nerve });
  }

  function anatomyFundusCommon(D, p, t, kind) {
    var ctx = D.ctx, W = D.W, H = D.H, sev = sevOf(p, 0.6), g = insetEye(D);
    var o = {};
    if (kind === 'rp') {
      var segs = [[-g.aOra, g.nerveA - g.nerveW * 0.9], [g.nerveA + g.nerveW * 0.9, g.aOra]];
      o.retinaSegs = segs;
    }
    drawEye(ctx, g, o);
    var pr = g.pupilR * 0.75;
    incomingRays(ctx, g, t, [-pr, pr], COL.ray, g.retX, g.cy);
    var ic = insetCircle(D, g), src;
    if (kind === 'macula') {
      // druzy i plama w przekroju
      for (var i = 0; i < 6; i++) {
        var a = -0.3 + 0.6 * i / 5 + 0.03 * (rnd(i) - 0.5), pt = rPt(g, a);
        ctx.fillStyle = COL.macula; ctx.beginPath(); ctx.arc(pt[0] - g.lw, pt[1], g.lw * (0.6 + 0.6 * sev), 0, TAU); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(15,10,10,0.95)'; ctx.lineWidth = g.lw * 2.4;
      ctx.beginPath(); ctx.ellipse(g.cx, g.cy, g.rrx, g.rry, 0, -0.05 - 0.1 * sev, 0.05 + 0.1 * sev); ctx.stroke();
      src = [g.retX, g.cy];
      zoomLines(ctx, src[0], src[1], g.ry * 0.16, ic.x, ic.y, ic.r);
      var f = fundus(ctx, ic.x, ic.y, ic.r, { drusen: 0.3 + 0.7 * sev, scar: sev }, t);
      var dA = 0.9, dP = [f.macula[0] + Math.cos(dA) * ic.r * 0.2, f.macula[1] - Math.sin(dA) * ic.r * 0.2];
      callout(ctx, 'druzy (złogi)', dP[0], dP[1], ic.x, 12, { align: 'center', dotColor: COL.macula });
      callout(ctx, 'zniszczona plamka', f.macula[0], f.macula[1], ic.x, H - 11, { align: 'center', dotColor: COL.text });
      callout(ctx, 'plamka żółta', g.retX, g.cy, g.cx, 12, { align: 'center', dotColor: COL.macula });
    } else if (kind === 'dr') {
      for (var j = 0; j < 4 + Math.round(6 * sev); j++) {
        var a2 = -1.3 + 2.4 * rnd(j + 11), q = rPt(g, a2);
        ctx.fillStyle = j % 3 ? 'rgba(220,38,38,0.95)' : 'rgba(254,240,138,0.95)';
        ctx.beginPath(); ctx.arc(q[0] - g.lw * 1.2, q[1], g.lw * (0.8 + 0.5 * rnd(j)), 0, TAU); ctx.fill();
      }
      src = rPt(g, -0.35);
      zoomLines(ctx, src[0], src[1], g.ry * 0.16, ic.x, ic.y, ic.r);
      fundus(ctx, ic.x, ic.y, ic.r, { dr: sev }, t);
      // wskazania na konkretne zmiany (te same ziarna co w fundus())
      var aM = rnd(121) * TAU, dM = ic.r * (0.15 + 0.7 * rnd(122));
      var mA = [ic.x + Math.cos(aM) * dM, ic.y + Math.sin(aM) * dM];
      var aH = rnd(90) * TAU, dH = ic.r * (0.3 + 0.5 * rnd(91));
      var hA = [ic.x + Math.cos(aH) * dH, ic.y + Math.sin(aH) * dH * 0.9];
      var aE = rnd(70) * TAU, dE = ic.r * (0.12 + 0.2 * rnd(71));
      var eA = [ic.x + ic.r * 0.1 + Math.cos(aE) * dE, ic.y + Math.sin(aE) * dE];
      var pts3 = [[mA, 'mikrotętniaki'], [hA, 'wylewy'], [eA, 'wysięki']];
      pts3.sort(function (u, w) { return u[0][1] - w[0][1]; });
      callout(ctx, pts3[0][1], pts3[0][0][0], pts3[0][0][1], ic.x - ic.r * 0.35, 12, { align: 'center', dotColor: COL.text });
      callout(ctx, pts3[1][1], pts3[1][0][0], pts3[1][0][1], ic.x + ic.r * 0.55, 12, { align: 'center', dotColor: COL.text });
      callout(ctx, pts3[2][1], pts3[2][0][0], pts3[2][0][1], ic.x, H - 11, { align: 'center', dotColor: COL.text });
      callout(ctx, 'naczynia siatkówki', src[0], src[1], g.cx - g.rx * 0.1, 12, { align: 'center', dotColor: COL.retina });
    } else {
      // barwnikowe zwyrodnienie: grudki na obwodzie, zachowany środek
      var n = Math.round(6 + 10 * sev);
      for (var m = 0; m < n; m++) {
        var s = m % 2 ? 1 : -1, a3 = s * (0.75 + (g.aOra - 0.85) * rnd(m + 300)), q3 = rPt(g, a3);
        ctx.strokeStyle = 'rgba(30,20,16,0.95)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (var k = 0; k < 3; k++) { var b = rnd(m * 5 + k) * TAU; ctx.moveTo(q3[0], q3[1]); ctx.lineTo(q3[0] + Math.cos(b) * g.lw * 1.8, q3[1] + Math.sin(b) * g.lw * 1.8); }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(15,23,42,' + (0.35 + 0.4 * sev) + ')'; ctx.lineWidth = g.lw * 1.3;
      ctx.beginPath(); ctx.ellipse(g.cx, g.cy, g.rrx, g.rry, 0, -g.aOra, -0.7 + 0.1 * sev); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(g.cx, g.cy, g.rrx, g.rry, 0, 0.7 - 0.1 * sev, g.aOra); ctx.stroke();
      src = rPt(g, -1.2);
      zoomLines(ctx, src[0], src[1], g.ry * 0.16, ic.x, ic.y, ic.r);
      fundus(ctx, ic.x, ic.y, ic.r, { rp: sev, vessels: 1 - 0.5 * sev, paleDisc: sev > 0.4 }, t);
      var cr2 = ic.r * (0.5 - 0.2 * sev);
      ctx.strokeStyle = rgba(COL.accent, 0.75); ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(ic.x + ic.r * 0.05, ic.y, cr2, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      var aB = rnd(200) * TAU, dB = ic.r * (0.62 - 0.22 * sev + (0.36 + 0.22 * sev) * rnd(201));
      var bP = [ic.x + Math.cos(aB) * dB, ic.y + Math.sin(aB) * dB];
      for (var z = 200; z < 260 && bP[1] > ic.y; z++) {
        aB = rnd(z) * TAU; dB = ic.r * (0.62 - 0.22 * sev + (0.36 + 0.22 * sev) * rnd(z + 1));
        bP = [ic.x + Math.cos(aB) * dB, ic.y + Math.sin(aB) * dB];
      }
      callout(ctx, 'grudki barwnika', bP[0], bP[1], ic.x, 12, { align: 'center', dotColor: COL.text });
      callout(ctx, 'zachowany środek', ic.x + ic.r * 0.05, ic.y + cr2, ic.x, H - 11, { align: 'center', dotColor: COL.accent });
      callout(ctx, 'obwód siatkówki', src[0], src[1], g.cx - g.rx * 0.1, 12, { align: 'center', dotColor: COL.retina });
    }
  }

  function anatomyDetachment(D, p, t) {
    var ctx = D.ctx, W = D.W, H = D.H, sev = sevOf(p, 0.6), g = singleEye(D);
    var aT = -g.aOra + 0.35, aE = -1.35 + 1.0 * sev;
    if (aE < aT + 0.4) aE = aT + 0.4;
    var segs = [[-g.aOra, aT - 0.12], [aE, g.nerveA - g.nerveW * 0.9], [g.nerveA + g.nerveW * 0.9, g.aOra]];
    drawEye(ctx, g, { retinaSegs: segs });
    var N = 16, flap = [], wall = [];
    var amp = g.ry * (0.2 + 0.22 * sev);
    for (var i = 0; i <= N; i++) {
      var u = i / N, a = lerp(aT, aE, u), b = rPt(g, a);
      var dx = g.cx - b[0], dy = g.cy - b[1], dl = Math.hypot(dx, dy);
      var d = amp * Math.pow(1 - u, 1.4) * (1 + 0.08 * Math.sin(t * 1.7 + u * 5)) + Math.sin(t * 2.2 + u * 7) * g.ry * 0.012 * (1 - u);
      flap.push(b[0] + dx / dl * d, b[1] + dy / dl * d);
      wall.push(b[0], b[1]);
    }
    // płyn pod odwarstwieniem
    ctx.beginPath(); ctx.moveTo(flap[0], flap[1]);
    for (var k = 2; k < flap.length; k += 2) ctx.lineTo(flap[k], flap[k + 1]);
    for (var k2 = wall.length - 2; k2 >= 0; k2 -= 2) ctx.lineTo(wall[k2], wall[k2 + 1]);
    ctx.closePath(); ctx.fillStyle = 'rgba(147,197,253,0.18)'; ctx.fill();
    // płat siatkówki
    ctx.strokeStyle = rgba(COL.retina, 0.3); ctx.lineWidth = g.lw * 4; poly(ctx, flap); ctx.stroke();
    ctx.strokeStyle = COL.retina; ctx.lineWidth = g.lw * 1.15; poly(ctx, flap); ctx.stroke();
    // zawinięty brzeg przy otworze
    ctx.beginPath(); ctx.moveTo(flap[0], flap[1]);
    ctx.quadraticCurveTo(flap[0] - g.ry * 0.03, flap[1] + g.ry * 0.07, flap[0] + g.ry * 0.04, flap[1] + g.ry * 0.06); ctx.stroke();
    var hole = rPt(g, aT - 0.06);
    ctx.strokeStyle = rgba(COL.warn, 0.7 + 0.3 * Math.sin(t * 4)); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(hole[0], hole[1], g.ry * 0.07, 0, TAU); ctx.stroke();
    // światło
    var pr = g.pupilR * 0.75;
    incomingRays(ctx, g, t, [-pr, pr], COL.ray, g.retX, g.cy);
    // okienko pola widzenia z zasłoną
    var r = Math.min(g.ry * 0.42, (W - (g.cx + g.rx + g.ry * 0.55)) / 2 - 10), ix = W - r - 10, iy = H - r - 12;
    ctx.save(); ctx.beginPath(); ctx.arc(ix, iy, r, 0, TAU); ctx.clip();
    var bgG = ctx.createLinearGradient(ix, iy - r, ix, iy + r);
    bgG.addColorStop(0, '#9cc9f0'); bgG.addColorStop(0.55, '#d8e6f3'); bgG.addColorStop(0.56, '#7aa36a'); bgG.addColorStop(1, '#55804a');
    ctx.fillStyle = bgG; ctx.fillRect(ix - r, iy - r, 2 * r, 2 * r);
    var cov = 0.3 + 0.55 * sev, edge = iy + r - 2 * r * cov;
    ctx.beginPath(); ctx.moveTo(ix - r, iy + r);
    for (var x = -r; x <= r; x += 3) ctx.lineTo(ix + x, edge + Math.sin(x * 0.25 + t * 1.5) * 2 + x * 0.12);
    ctx.lineTo(ix + r, iy + r); ctx.closePath();
    var cg = ctx.createLinearGradient(ix, edge - 6, ix, iy + r);
    cg.addColorStop(0, 'rgba(71,85,105,0.85)'); cg.addColorStop(0.3, 'rgba(51,65,85,0.97)'); cg.addColorStop(1, 'rgba(30,41,59,1)');
    ctx.fillStyle = cg; ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(203,213,225,0.7)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(ix, iy, r, 0, TAU); ctx.stroke();
    tag(ctx, 'pole widzenia:', W - 8, iy - r - 22, { align: 'right', color: COL.muted, size: FS - 1.5, bg: false });
    tag(ctx, 'szara zasłona', W - 8, iy - r - 9, { align: 'right', color: COL.text, size: FS - 1, bg: false });
    var fp = [flap[N], flap[N + 1]];
    var mid = [flap[N / 2 * 2 - 6], flap[N / 2 * 2 - 5]];
    void fp;
    callout(ctx, 'otwór (przedarcie)', hole[0], hole[1], 8, 14, { align: 'left', dotColor: COL.warn });
    callout(ctx, 'odklejona siatkówka', mid[0], mid[1], g.cx + g.rx * 0.5, 13, { align: 'center', dotColor: COL.retina });
  }

  function anatomyVitreous(D, p, t) {
    var ctx = D.ctx, W = D.W, H = D.H, sev = sevOf(p, 0.6), g = singleEye(D);
    drawEye(ctx, g);
    // stożek światła
    var ox = g.lensX, oy = g.cy;
    var fl = [];
    var nF = 2 + Math.round(2 * sev);
    for (var i = 0; i < nF; i++) {
      var bx = g.cx + g.rx * (-0.1 + 0.45 * rnd(i + 3)), by = g.cy + g.ry * (-0.42 + 0.84 * rnd(i + 8)) * 0.8;
      bx += Math.sin(t * 0.55 + i * 2.1) * g.ry * 0.08; by += Math.cos(t * 0.43 + i * 1.3) * g.ry * 0.07;
      fl.push([bx, by, i]);
    }
    var pr = g.pupilR * 0.8;
    incomingRays(ctx, g, t, [-pr, pr], COL.ray, null, null);
    // wachlarz promieni z soczewki
    for (var r2 = 0; r2 < 7; r2++) {
      var ang = -0.55 + 1.1 * r2 / 6, th = ellHit(ox, oy, Math.cos(ang), Math.sin(ang), g.cx, g.cy, g.rrx, g.rry);
      var pts = [ox, oy, ox + Math.cos(ang) * th, oy + Math.sin(ang) * th];
      ray(ctx, pts, COL.ray, 0.9, { alpha: 0.45, glow: false });
      flow(ctx, pts, t, COL.ray, { phase: r2 * 11, alpha: 0.7, r: 1.4 });
    }
    // cienie na siatkówce i męty
    var shadowPts = [];
    for (var j = 0; j < fl.length; j++) {
      var f = fl[j], dx = f[0] - ox, dy = f[1] - oy, tt = ellHit(ox, oy, dx, dy, g.cx, g.cy, g.rrx, g.rry);
      var hx = ox + dx * tt, hy = oy + dy * tt, a = Math.atan2((hy - g.cy) / g.rry, (hx - g.cx) / g.rrx);
      var span = 0.07 + 0.05 * rnd(j + 20);
      ctx.strokeStyle = 'rgba(2,6,23,0.85)'; ctx.lineWidth = g.lw * 3.2;
      ctx.beginPath(); ctx.ellipse(g.cx, g.cy, g.rrx, g.rry, 0, a - span, a + span); ctx.stroke();
      ctx.strokeStyle = 'rgba(148,163,184,0.18)'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(f[0], f[1]); ctx.lineTo(hx, hy); ctx.stroke(); ctx.setLineDash([]);
      shadowPts.push([hx, hy]);
    }
    for (var q = 0; q < fl.length; q++) {
      var fx = fl[q][0], fy = fl[q][1], s = g.ry * (0.15 + 0.07 * rnd(q + 30));
      var wob = Math.sin(t * 0.9 + q * 2);
      ctx.strokeStyle = 'rgba(148,163,184,0.25)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(fx - s, fy - s * 0.3);
      ctx.bezierCurveTo(fx - s * 0.3, fy - s * (0.9 + 0.3 * wob), fx + s * 0.2, fy + s * 0.7, fx + s, fy + s * 0.15 * Math.cos(t * 0.8 + q));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(226,232,240,0.85)'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = 'rgba(203,213,225,0.55)';
      ctx.beginPath(); ctx.ellipse(fx + s * 0.15, fy + s * 0.05, g.lw * 2.2, g.lw * 1.5, wob, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(fx - s * 0.6, fy - s * 0.3, g.lw * 1.3, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(fx + s * 0.75, fy + s * 0.2, g.lw, 0, TAU); ctx.fill();
    }
    var top = fl[0];
    for (var z = 1; z < fl.length; z++) if (fl[z][1] < top[1]) top = fl[z];
    callout(ctx, 'męty w ciele szklistym', top[0], top[1], g.cx, 13, { align: 'center', dotColor: COL.line });
    var sp = shadowPts[0];
    for (var z2 = 1; z2 < shadowPts.length; z2++) if (shadowPts[z2][1] > sp[1]) sp = shadowPts[z2];
    callout(ctx, 'cień na siatkówce', sp[0] + 2, sp[1], W - 8, H - 14, { align: 'right', dotColor: COL.text });
  }

  function anatomyCornea(D, p, t) {
    var ctx = D.ctx, W = D.W, H = D.H, sev = sevOf(p, 0.6), g = singleEye(D, { cone: sev });
    drawEye(ctx, g, { corneaGlow: 0.2 + 0.1 * Math.sin(t * 3) });
    var pr = g.pupilR * 0.95, hs = [-pr, -pr * 0.5, 0.0001, pr * 0.5, pr];
    var foci = [], OX = [0.62, 0.12, 0.38, 0.0, 0.5], OY = [0.1, -0.2, 0.22, 0.05, -0.1];
    for (var i = 0; i < hs.length; i++) {
      var h = hs[i];
      var fx = g.retX - g.ry * (0.03 + OX[i] * sev);
      var fy = g.cy + OY[i] * g.ry * sev + Math.sin(t * 1.3 + i) * g.ry * 0.015 * sev;
      var xc = corneaX(g, h), lx = g.lensX, ly = g.cy + h * 0.84 + (rnd(i + 4) - 0.5) * g.ry * 0.12 * sev;
      var th = ellHit(lx, ly, fx - lx, fy - ly, g.cx, g.cy, g.rrx, g.rry);
      var pts = [3, g.cy + h, xc, g.cy + h, lx, ly, lx + (fx - lx) * th, ly + (fy - ly) * th];
      var col = i % 2 ? COL.ray2 : COL.ray;
      ray(ctx, pts, col, 1.15); flow(ctx, pts, t, col, { phase: i * 13 });
      foci.push([fx, fy, col]);
    }
    for (var k = 0; k < foci.length; k++) cross(ctx, foci[k][0], foci[k][1], 2.6, foci[k][2], 1.3);
    var ap = [g.apexX, g.cy + g.coneDy];
    callout(ctx, 'stożkowata, cienka rogówka', ap[0], ap[1] + 2, 8, H - 13, { align: 'left', dotColor: COL.cornea });
    var mf = foci[0];
    for (var z = 1; z < foci.length; z++) if (foci[z][1] < mf[1]) mf = foci[z];
    callout(ctx, 'wiele ognisk → rozmycie', mf[0], mf[1], W - 8, 14, { align: 'right', dotColor: COL.text });
    tag(ctx, 'i zniekształcenia', W - 8, 14 + FS + 5, { align: 'right', color: COL.text });
  }

  // układ: małe oko po lewej + panel powiększenia po prawej
  function zoomLayout(D) {
    var ry = Math.min(D.H * 0.22, D.W * 0.105);
    var g0 = eyeGeom(0, D.H * 0.46, ry);
    var g = eyeGeom(8 + (0 - g0.apexX), D.H * 0.46, ry);
    var px = Math.max(D.W * 0.36, g.cx + g.rx + ry * 0.6 + 12);
    return { g: g, x: px, y: 24, w: D.W - px - 8, h: D.H - 24 - 30 };
  }
  function zoomPanel(ctx, Z, sx, sy, title) {
    var g = Z.g, sr = g.ry * 0.17;
    ctx.strokeStyle = 'rgba(203,213,225,0.75)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(203,213,225,0.28)'; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(sx + sr * 0.3, sy - sr * 0.95); ctx.lineTo(Z.x, Z.y);
    ctx.moveTo(sx + sr * 0.3, sy + sr * 0.95); ctx.lineTo(Z.x, Z.y + Z.h); ctx.stroke(); ctx.setLineDash([]);
    rr(ctx, Z.x, Z.y, Z.w, Z.h, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.025)'; ctx.fill();
    ctx.strokeStyle = 'rgba(203,213,225,0.45)'; ctx.lineWidth = 1.2; ctx.stroke();
    tag(ctx, title, Z.x + 2, 11, { bg: false, color: COL.muted, size: FS - 1 });
  }

  function anatomyTear(D, p, t) {
    var ctx = D.ctx, W = D.W, H = D.H, sev = sevOf(p, 0.5), Z = zoomLayout(D), g = Z.g;
    drawEye(ctx, g, { corneaGlow: 0.18 + 0.1 * Math.sin(t * 3) });
    incomingRays(ctx, g, t, [-g.pupilR * 0.6, g.pupilR * 0.6], COL.ray, g.retX, g.cy, { startX: 2 });
    zoomPanel(ctx, Z, g.apexX + 1, g.cy - g.cr * 0.2, 'powiększenie: powierzchnia rogówki');
    var px = Z.x, py = Z.y, pw = Z.w, ph = Z.h;
    ctx.save(); rr(ctx, px, py, pw, ph, 8); ctx.clip();
    var ys = py + ph * 0.38, lipT = Math.max(3, ph * 0.035), aqT = ph * 0.2 * (1 - 0.45 * sev), muT = Math.max(3, ph * 0.04);
    var yEp = ys + lipT + aqT + muT, epT = ph * 0.15;
    var rayR = px + pw * 0.58;
    // przerwy w filmie
    var nG = sev < 0.12 ? 0 : sev < 0.45 ? 1 : sev < 0.8 ? 2 : 3, gw = pw * (0.06 + 0.07 * sev);
    var gaps = [], gx = [0.24, 0.48, 0.07];
    for (var i = 0; i < nG; i++) gaps.push([px + pw * gx[i] - gw / 2, px + pw * gx[i] + gw / 2]);
    gaps.sort(function (a, b) { return a[0] - b[0]; });
    function inGap(x) { for (var k = 0; k < gaps.length; k++) if (x > gaps[k][0] && x < gaps[k][1]) return true; return false; }
    // nabłonek i miąższ
    ctx.fillStyle = 'rgba(147,197,253,0.08)'; ctx.fillRect(px, yEp, pw, py + ph - yEp);
    ctx.strokeStyle = 'rgba(147,197,253,0.18)'; ctx.lineWidth = 1;
    for (var sl = 0; sl < 4; sl++) { var yy = yEp + epT + 6 + sl * 7; ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy); ctx.stroke(); }
    var cw = 12;
    for (var cx = px - 4; cx < px + pw; cx += cw) {
      rr(ctx, cx + 1, yEp + 1, cw - 2, epT * 0.55, 3);
      var dry = inGap(cx + cw / 2);
      ctx.fillStyle = dry ? 'rgba(248,113,113,0.38)' : 'rgba(148,163,184,0.2)'; ctx.fill();
      ctx.strokeStyle = dry ? 'rgba(248,113,113,0.7)' : 'rgba(148,163,184,0.45)'; ctx.stroke();
      rr(ctx, cx + 1 + cw / 2, yEp + epT * 0.58, cw - 2, epT * 0.4, 3);
      ctx.fillStyle = 'rgba(148,163,184,0.12)'; ctx.fill();
    }
    // warstwy filmu (poza przerwami)
    ctx.save();
    ctx.beginPath();
    var x0 = px;
    for (var gi = 0; gi < gaps.length; gi++) { ctx.rect(x0, py, gaps[gi][0] - x0, ph); x0 = gaps[gi][1]; }
    ctx.rect(x0, py, px + pw - x0, ph);
    ctx.clip();
    ctx.fillStyle = 'rgba(94,234,212,0.45)'; ctx.fillRect(px, yEp - muT, pw, muT);
    ctx.fillStyle = 'rgba(147,197,253,0.3)';
    ctx.beginPath(); ctx.moveTo(px, yEp - muT);
    for (var x = px; x <= px + pw; x += 4) ctx.lineTo(x, ys + lipT + Math.sin(x * 0.07 + t * 1.6) * 1.2);
    ctx.lineTo(px + pw, yEp - muT); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(251,191,36,0.75)';
    ctx.beginPath(); ctx.moveTo(px, ys + lipT);
    for (var x2 = px; x2 <= px + pw; x2 += 4) ctx.lineTo(x2, ys + Math.sin(x2 * 0.07 + t * 1.6) * 1.2);
    for (var x3 = px + pw; x3 >= px; x3 -= 4) ctx.lineTo(x3, ys + lipT + Math.sin(x3 * 0.07 + t * 1.6) * 1.2);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // resztki filmu w przerwach
    for (var g2 = 0; g2 < gaps.length; g2++) {
      ctx.fillStyle = 'rgba(94,234,212,0.18)'; ctx.fillRect(gaps[g2][0], yEp - muT * 0.5, gaps[g2][1] - gaps[g2][0], muT * 0.5);
    }
    // promienie
    var nR = 6;
    for (var r = 0; r < nR; r++) {
      var rx = px + 10 + (rayR - px - 10) * (r + 0.5) / nR;
      if (inGap(rx)) {
        var pts = [rx, py + 2, rx, yEp];
        ray(ctx, pts, COL.ray, 1.2); flow(ctx, pts, t, COL.ray, { phase: r * 9, speed: 30, gap: 40 });
        for (var b = -1; b <= 1; b += 2) {
          var pb = [rx, yEp, rx + b * ph * 0.12, yEp + ph * 0.1 + Math.abs(Math.sin(t * 3 + r)) * 3];
          ray(ctx, pb, COL.ray, 1, { alpha: 0.55, glow: false });
        }
      } else {
        var pts2 = [rx, py + 2, rx, ys, rx + 2, py + ph - 2];
        ray(ctx, pts2, COL.ray, 1.2); flow(ctx, pts2, t, COL.ray, { phase: r * 9, speed: 30, gap: 40 });
      }
    }
    ctx.restore();
    // podpisy warstw (prawa kolumna)
    var lx = px + pw - 6, fs = FS - 1.5, sp = fs + 5;
    var labels = [['lipidowa', ys + lipT / 2, COL.ray], ['wodna', ys + lipT + aqT / 2, COL.cornea], ['śluzowa', yEp - muT / 2, COL.accent], ['nabłonek rogówki', yEp + epT * 0.4, COL.line]];
    var prev = -1e9, lyArr = [];
    for (var li = 0; li < labels.length; li++) { var ly = Math.max(labels[li][1], prev + sp); lyArr.push(ly); prev = ly; }
    var shift = Math.max(0, prev - (py + ph - 8));
    for (var lj = 0; lj < labels.length; lj++) {
      var yL = lyArr[lj] - shift;
      if (Math.abs(yL - labels[lj][1]) > 1) {
        ctx.strokeStyle = rgba(labels[lj][2], 0.6); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(lx - 66, labels[lj][1]); ctx.lineTo(lx - 56, yL); ctx.stroke();
      }
      tag(ctx, labels[lj][0], lx, yL, { align: 'right', color: labels[lj][2], size: fs, bg: 'rgba(18,24,38,0.75)', pad: 3 });
    }
    if (gaps.length) {
      var gc = (gaps[0][0] + gaps[0][1]) / 2;
      callout(ctx, 'przerwa w filmie', gc, yEp - 2, gc + 4, ys - ph * 0.17, { align: 'left', color: COL.warn, size: FS - 1, dotColor: COL.warn });
    }
    var ok = sev < 0.12;
    badge(ctx, ok ? 'Gładki film łzowy → ostry obraz' : 'Przerwy w filmie → rozproszenie, pieczenie', W / 2 + (Z.x - 8) / 2 - W * 0.0, H - 13, ok ? COL.accent : COL.warn);
  }

  function anatomyPhotoreceptors(D, p, t) {
    var ctx = D.ctx, W = D.W, H = D.H, v = p.variant || 'normal', Z = zoomLayout(D), g = Z.g;
    var glare = v === 'glare', noRods = v === 'noRods', noCones = v === 'noCones';
    drawEye(ctx, g);
    incomingRays(ctx, g, t, [-g.pupilR * 0.6, g.pupilR * 0.6], COL.ray, g.retX, g.cy, { startX: 2 });
    zoomPanel(ctx, Z, g.retX - 1, g.cy, 'powiększenie: siatkówka (fotoreceptory)');
    var px = Z.x, py = Z.y, pw = Z.w, ph = Z.h;
    ctx.save(); rr(ctx, px, py, pw, ph, 8); ctx.clip();
    if (glare) { ctx.fillStyle = 'rgba(254,243,199,' + (0.1 + 0.05 * Math.sin(t * 9)) + ')'; ctx.fillRect(px, py, pw, ph); }
    if (noRods) { ctx.fillStyle = 'rgba(15,23,42,0.45)'; ctx.fillRect(px, py, pw, ph); }
    var yTop = py + ph * 0.36, yIS = py + ph * 0.52, yOS = py + ph * 0.68, yBot = py + ph * 0.86;
    // nabłonek barwnikowy
    ctx.fillStyle = 'rgba(120,53,15,0.55)'; ctx.fillRect(px, yBot, pw, py + ph - yBot);
    ctx.fillStyle = 'rgba(120,53,15,0.85)'; ctx.fillRect(px, yBot, pw, 3);
    // warstwa włókien / komórek zwojowych (u góry)
    ctx.strokeStyle = 'rgba(203,213,225,0.15)'; ctx.lineWidth = 1;
    for (var f = 0; f < 3; f++) { ctx.beginPath(); ctx.moveTo(px, py + ph * (0.24 + f * 0.035)); ctx.lineTo(px + pw, py + ph * (0.24 + f * 0.035)); ctx.stroke(); }
    // promienie światła z góry
    var nR = glare ? 14 : 6;
    for (var r = 0; r < nR; r++) {
      var rx = px + pw * (r + 0.5) / nR;
      var pts = [rx, py + 2, rx, yBot - 4];
      ray(ctx, pts, glare ? '#fde68a' : COL.ray, glare ? 1.4 : 1, { alpha: glare ? 0.75 : 0.5, glow: glare });
      flow(ctx, pts, t, COL.ray, { phase: r * 13, speed: glare ? 70 : 36, gap: glare ? 26 : 46, r: glare ? 2 : 1.6 });
    }
    // fotoreceptory
    var step = Math.max(11, pw / 17), n = Math.floor((pw - 8) / step), cone = 0, rodP = null, coneP = null;
    var coneCols = ['#f87171', '#4ade80', '#60a5fa'];
    for (var i = 0; i < n; i++) {
      var x = px + 4 + step * (i + 0.5), isCone = i % 3 === 1;
      var on = isCone ? !noCones : !noRods;
      var act = glare ? 0.7 + 0.3 * Math.sin(t * 14 + i * 1.3) : 0.45 + 0.35 * Math.sin(t * 3 + i * 0.9);
      ctx.strokeStyle = 'rgba(203,213,225,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, yTop - 4); ctx.lineTo(x, yIS); ctx.stroke();
      ctx.fillStyle = 'rgba(203,213,225,0.5)'; ctx.beginPath(); ctx.arc(x, yTop - 4, 1.8, 0, TAU); ctx.fill();
      if (isCone) {
        var col = noCones ? '#475569' : coneCols[cone % 3]; cone++;
        // segment wewnętrzny (bańka) i zewnętrzny (stożek)
        ctx.fillStyle = rgba(noCones ? '#475569' : '#cbd5e1', 0.35);
        ctx.beginPath(); ctx.ellipse(x, (yIS + yOS) / 2 - 2, step * 0.3, (yOS - yIS) * 0.5, 0, 0, TAU); ctx.fill();
        if (on) glowDot(ctx, x, yOS + (yBot - yOS) * 0.35, step * 0.9, glare ? '#fffbeb' : col, act * (glare ? 1 : 0.7));
        ctx.beginPath(); ctx.moveTo(x - step * 0.28, yOS); ctx.lineTo(x + step * 0.28, yOS); ctx.lineTo(x, yBot - 2); ctx.closePath();
        ctx.fillStyle = on ? rgba(col, 0.85) : 'rgba(51,65,85,0.8)'; ctx.fill();
        if (!on) { ctx.strokeStyle = '#64748b'; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]); }
        if (!coneP && i > n * 0.5) coneP = [x, (yOS + yBot) / 2];
      } else {
        var rc = '#c4b5fd';
        ctx.fillStyle = rgba(noRods ? '#475569' : '#cbd5e1', 0.3);
        rr(ctx, x - step * 0.16, yIS, step * 0.32, yOS - yIS, 2); ctx.fill();
        if (on) glowDot(ctx, x, (yOS + yBot) / 2, step * 0.8, glare ? '#fffbeb' : rc, act * (glare ? 1 : 0.55));
        rr(ctx, x - step * 0.18, yOS - 1, step * 0.36, yBot - yOS - 1, 2);
        ctx.fillStyle = on ? rgba(rc, 0.85) : 'rgba(51,65,85,0.8)'; ctx.fill();
        if (!on) { ctx.strokeStyle = '#64748b'; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]); }
        if (!rodP && i > 1) rodP = [x, (yOS + yBot) / 2];
      }
    }
    ctx.restore();
    if (rodP) callout(ctx, noRods ? 'pręciki – nie działają' : 'pręciki', rodP[0], rodP[1], px + pw * 0.04, py + ph * 0.12, { align: 'left', color: noRods ? COL.warn : '#c4b5fd', size: FS - 1, dotColor: COL.text });
    if (coneP) callout(ctx, noCones ? 'czopki – nie działają' : 'czopki', coneP[0], coneP[1], px + pw - 6, py + ph * 0.12, { align: 'right', color: noCones ? COL.warn : COL.text, size: FS - 1, dotColor: COL.text });
    var txt = 'Pręciki: zmierzch · czopki: barwy i ostrość', col2 = COL.accent;
    if (noRods) { txt = 'Pręciki nie działają → ślepota zmierzchowa'; col2 = COL.warn; }
    else if (noCones) { txt = 'Czopki nie działają → brak barw, razi światło'; col2 = COL.warn; }
    else if (glare) { txt = 'Nadmiar światła → przebodźcowanie, ból'; col2 = COL.warn; }
    badge(ctx, txt, W / 2, H - 13, col2);
  }

  function anatomyPathway(D, p, t) {
    var ctx = D.ctx, W = D.W, H = D.H, lesion = p.lesion || null;
    var k = Math.min(H / 230, W / 360), mx = W / 2;
    var fieldY = 20 * k, fr = 12 * k, eyeY = 60 * k, er = 13 * k, sep = 40 * k;
    var chY = 104 * k, lgnY = 144 * k, ctxY = 203 * k;
    var hy = 128 * k, hry = 96 * k, hrx = 86 * k;
    // głowa
    ctx.fillStyle = 'rgba(148,163,184,0.04)'; ctx.strokeStyle = 'rgba(148,163,184,0.3)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(mx, hy, hrx, hry, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx - 8 * k, hy - hry + 2); ctx.lineTo(mx, hy - hry - 10 * k); ctx.lineTo(mx + 8 * k, hy - hry + 2); ctx.stroke();
    // kora wzrokowa (płaty potyliczne)
    var lobes = [[-1, COL.accent], [1, COL.ray]];
    for (var l = 0; l < 2; l++) {
      var sd = lobes[l][0], hurt = (lesion === 'left' && sd < 0) || (lesion === 'right' && sd > 0);
      ctx.fillStyle = hurt ? 'rgba(71,85,105,0.35)' : rgba(lobes[l][1], 0.16);
      ctx.strokeStyle = hurt ? 'rgba(148,163,184,0.5)' : rgba(lobes[l][1], 0.6); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(mx + sd * 23 * k, ctxY, 21 * k, 12 * k, sd * 0.25, 0, TAU); ctx.fill(); ctx.stroke();
    }
    // włókna: [oko -1/1, strona siatkówki -1 skroniowa / 1 nosowa] → półkula
    var fibers = [];
    for (var e = -1; e <= 1; e += 2) {
      for (var half = -1; half <= 1; half += 2) {
        var ex = mx + e * sep, inner = half > 0; // nosowa połowa leży bliżej nosa
        var sx = ex + e * (inner ? -1 : 1) * er * 0.45;
        var hemi = inner ? -e : e;
        fibers.push({ sx: sx, hemi: hemi });
      }
    }
    function bezPts(arr, x0, y0, cx1, cy1, x1, y1, n) {
      for (var i = 1; i <= n; i++) {
        var u = i / n, v = 1 - u;
        arr.push(v * v * x0 + 2 * v * u * cx1 + u * u * x1, v * v * y0 + 2 * v * u * cy1 + u * u * y1);
      }
    }
    for (var f = 0; f < fibers.length; f++) {
      var F = fibers[f], hm = F.hemi;
      var off = (F.sx < mx ? -1 : 1) * 2 * k;
      var pts = [F.sx, eyeY + er * 0.8];
      bezPts(pts, F.sx, eyeY + er * 0.8, F.sx, chY - 14 * k, mx + off, chY - 3 * k, 6);
      var after = [mx + off, chY - 3 * k];
      bezPts(after, mx + off, chY - 3 * k, mx + hm * 6 * k, chY + 6 * k, mx + hm * 30 * k, lgnY, 6);
      bezPts(after, mx + hm * 30 * k, lgnY, mx + hm * 52 * k, (lgnY + ctxY) / 2, mx + hm * 22 * k, ctxY - 4 * k, 7);
      var col = hm < 0 ? COL.accent : COL.ray;
      var dead = (lesion === 'left' && hm < 0) || (lesion === 'right' && hm > 0);
      ray(ctx, pts, col, 1.4);
      flow(ctx, pts, t, col, { phase: f * 9, speed: 30, gap: 44 });
      if (dead) ray(ctx, after, '#64748b', 1.3, { dash: [3, 4], glow: false });
      else { ray(ctx, after, col, 1.4); flow(ctx, after, t, col, { phase: f * 9 + 20, speed: 30, gap: 44 }); }
    }
    // ciało kolankowate
    for (var s2 = -1; s2 <= 1; s2 += 2) {
      ctx.fillStyle = 'rgba(203,213,225,0.25)'; ctx.beginPath(); ctx.ellipse(mx + s2 * 30 * k, lgnY, 4.5 * k, 3.5 * k, 0, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(203,213,225,0.9)'; ctx.beginPath(); ctx.ellipse(mx, chY, 5 * k, 3 * k, 0, 0, TAU); ctx.fill();
    // oczy (z góry, patrzą w górę)
    topEye(ctx, mx - sep, eyeY, er, -Math.PI / 2, false);
    topEye(ctx, mx + sep, eyeY, er, -Math.PI / 2, false);
    // pola widzenia nad oczami
    for (var e2 = -1; e2 <= 1; e2 += 2) {
      var fx = mx + e2 * sep;
      for (var hh = -1; hh <= 1; hh += 2) {
        var lost = (lesion === 'right' && hh < 0) || (lesion === 'left' && hh > 0);
        ctx.beginPath(); ctx.moveTo(fx, fieldY); ctx.arc(fx, fieldY, fr, hh < 0 ? Math.PI / 2 : -Math.PI / 2, hh < 0 ? Math.PI * 1.5 : Math.PI / 2); ctx.closePath();
        ctx.fillStyle = lost ? 'rgba(2,6,23,0.95)' : rgba(hh < 0 ? COL.ray : COL.accent, 0.22); ctx.fill();
      }
      ctx.save(); ctx.beginPath(); ctx.arc(fx, fieldY, fr, 0, TAU); ctx.clip();
      if (lesion === 'aura') {
        var R = ((t * 0.45) % 1) * fr * 1.6;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.3; ctx.beginPath();
        for (var z = 0; z <= 12; z++) {
          var a = Math.PI * 0.55 + z / 12 * Math.PI * 0.9, rz = R + (z % 2 ? 2 : -2) * k;
          var zx = fx - fr * 0.2 + Math.cos(a) * rz, zy = fieldY + Math.sin(a) * rz;
          if (z) ctx.lineTo(zx, zy); else ctx.moveTo(zx, zy);
        }
        ctx.stroke();
      }
      if (lesion === 'snow') {
        var seed = Math.floor(t * 14);
        for (var sn = 0; sn < 26; sn++) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.6 * rnd(seed * 31 + sn)) + ')';
          ctx.fillRect(fx + (rnd(seed * 17 + sn) - 0.5) * fr * 2, fieldY + (rnd(seed * 13 + sn + 5) - 0.5) * fr * 2, 1.2, 1.2);
        }
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(203,213,225,0.7)'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(fx, fieldY, fr, 0, TAU); ctx.moveTo(fx, fieldY - fr); ctx.lineTo(fx, fieldY + fr); ctx.stroke();
    }
    // zmiany w korze
    if (lesion === 'left' || lesion === 'right') {
      var sd2 = lesion === 'left' ? -1 : 1, xx = mx + sd2 * 38 * k, yy = (lgnY + ctxY) / 2 + 2 * k;
      cross(ctx, xx, yy, 5 * k, COL.warn, 2.2);
      callout(ctx, 'uszkodzenie ' + (sd2 < 0 ? 'lewej' : 'prawej') + ' półkuli', xx + sd2 * 5 * k, yy, sd2 < 0 ? 8 : W - 8, H - 13, { align: sd2 < 0 ? 'left' : 'right', color: COL.warn, dotColor: COL.warn });
      var fxx = mx + sd2 * -1 * (sep + fr), fyy = fieldY;
      callout(ctx, 'brak ' + (sd2 < 0 ? 'prawej' : 'lewej') + ' połowy pola', mx - sd2 * (sep + fr * 0.5), fyy + fr * 0.5, sd2 > 0 ? 8 : W - 8, fieldY + 18 * k, { align: sd2 > 0 ? 'left' : 'right', color: COL.text, dotColor: COL.warn });
      void fxx;
    } else if (lesion === 'aura') {
      var ph = (t * 0.45) % 1, R2 = 4 * k + ph * 20 * k, cxA = mx + 23 * k, cyA = ctxY;
      ctx.save(); ctx.beginPath(); ctx.ellipse(cxA, cyA, 21 * k, 12 * k, 0.25, 0, TAU); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - ph * 0.7) + ')'; ctx.lineWidth = 1.8; ctx.beginPath();
      for (var z2 = 0; z2 <= 14; z2++) {
        var a2 = -Math.PI + z2 / 14 * Math.PI, rz2 = R2 + (z2 % 2 ? 2 : -2) * k;
        var X2 = cxA + Math.cos(a2) * rz2, Y2 = cyA + 6 * k + Math.sin(a2) * rz2 * 0.8;
        if (z2) ctx.lineTo(X2, Y2); else ctx.moveTo(X2, Y2);
      }
      ctx.stroke(); ctx.restore();
      glowDot(ctx, cxA, cyA, 16 * k, COL.ray, 0.3 + 0.3 * Math.sin(t * 5));
      callout(ctx, 'fala w korze wzrokowej (aura)', cxA + 18 * k, cyA, W - 8, H - 13, { align: 'right', color: COL.ray, dotColor: COL.ray });
      callout(ctx, 'migocący zygzak', mx - sep - fr * 0.6, fieldY, 8, fieldY + 18 * k, { align: 'left', dotColor: COL.text });
    } else if (lesion === 'snow') {
      var seed2 = Math.floor(t * 14);
      for (var q = 0; q < 60; q++) {
        var sdq = q % 2 ? 1 : -1, aq = rnd(seed2 * 7 + q) * TAU, rq = Math.sqrt(rnd(seed2 * 3 + q + 11));
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.65 * rnd(seed2 + q * 5)) + ')';
        ctx.fillRect(mx + sdq * 23 * k + Math.cos(aq) * rq * 19 * k, ctxY + Math.sin(aq) * rq * 10 * k, 1.5, 1.5);
      }
      callout(ctx, 'kora „szumi” (śnieg optyczny)', mx + 40 * k, ctxY, W - 8, H - 13, { align: 'right', dotColor: COL.text });
      callout(ctx, 'migoczące punkty', mx - sep - fr * 0.6, fieldY, 8, fieldY + 18 * k, { align: 'left', dotColor: COL.text });
    } else {
      callout(ctx, 'kora wzrokowa', mx + 40 * k, ctxY, W - 8, H - 13, { align: 'right', dotColor: COL.text });
    }
    // stałe podpisy
    callout(ctx, 'nerw wzrokowy', mx - sep * 0.75, (eyeY + chY) / 2 + 2 * k, 8, (eyeY + chY) / 2 + 12 * k, { align: 'left', size: FS - 1, dotColor: COL.text });
    callout(ctx, 'skrzyżowanie', mx + 5 * k, chY, W - 8, chY - 4 * k, { align: 'right', size: FS - 1, dotColor: COL.text });
    tag(ctx, 'pole widzenia', mx + sep + fr + 6, fieldY, { align: 'left', color: COL.muted, size: FS - 1.5, bg: false });
  }

  /* p = { part, severity: 0..1, lesion?, variant? } – szczegóły w opisie modułu / raporcie */
  function drawAnatomy(D, p, t) {
    switch (p.part) {
      case 'lens': return anatomyLens(D, p, t);
      case 'opticNerve': return anatomyGlaucoma(D, p, t);
      case 'macula': return anatomyFundusCommon(D, p, t, 'macula');
      case 'retinaVessels': return anatomyFundusCommon(D, p, t, 'dr');
      case 'retinaPeriphery': return anatomyFundusCommon(D, p, t, 'rp');
      case 'detachment': return anatomyDetachment(D, p, t);
      case 'vitreous': return anatomyVitreous(D, p, t);
      case 'cornea': return anatomyCornea(D, p, t);
      case 'tearFilm': return anatomyTear(D, p, t);
      case 'pathway': return anatomyPathway(D, p, t);
      case 'photoreceptors': return anatomyPhotoreceptors(D, p, t);
      default: return anatomyHealthy(D, p, t);
    }
  }

  // ───────────────────────────── API ─────────────────────────────
  function draw(canvas, type, p, t) {
    if (!canvas || !canvas.getContext) return;
    var D = setup(canvas);
    p = p || {}; t = num(t, 0);
    D.ctx.save();
    try {
      if (type === 'refraction') drawRefraction(D, p, t);
      else if (type === 'binocular') drawBinocular(D, p, t);
      else if (type === 'cones') drawCones(D, p, t);
      else drawAnatomy(D, p, t);
    } catch (e) {
      if (!warned) { warned = true; console.error('EyeDiagram:', e); }
    }
    D.ctx.restore();
    D.ctx.setLineDash([]); D.ctx.globalAlpha = 1;
  }

  window.EyeDiagram = { draw: draw };
})();
