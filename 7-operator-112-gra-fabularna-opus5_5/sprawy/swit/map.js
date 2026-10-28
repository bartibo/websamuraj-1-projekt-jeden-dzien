'use strict';
/* =====================================================================
   Przed świtem – okolice Kalnowa: Lasy Gajowe, stawy, DK46, kolej.
   1 px = 10 m.
   ===================================================================== */

const GEO = {
  bts:    { label: 'zasięg BTS Gajówka, sektor 2 (ok. 2,2 km)', color: '#3fd0c9', test: b => Math.hypot(b.x - MAP.bts.x, b.y - MAP.bts.y) <= MAP.bts.r },
  woda:   { label: 'nad wodą, przy pomoście',                   color: '#5aa9ff', test: b => b.water },
  maszt:  { label: 'maszt RTV 1–4 km na północny wschód',      color: '#ff6b6b', test: b => { const dx = MAP.mast.x - b.x, dy = b.y - MAP.mast.y, a = Math.atan2(dy, dx) * 180 / Math.PI, d = Math.hypot(dx, dy); return a >= 20 && a <= 70 && d >= 120 && d <= 420; } },
  pociag: { label: 'do 2 km od linii kolejowej',                color: '#ffb547', test: b => Math.abs(b.x - MAP.railX) <= 200 },
  las:    { label: 'w lesie, dojazd szutrem',                   color: '#9aa5b1', test: b => b.forest },
  zjazd:  { label: 'dojazd drogą leśną Gajową',                 color: '#9aa5b1', test: b => b.road === 'gajowa' },
  stawy:  { label: 'łowisko PZW (Stawy Gajowe)',               color: '#9aa5b1', test: b => !!b.pzw },
  p14:    { label: 'pomost numer 14',                           color: '#9aa5b1', test: b => b.id === 'p14' },
};
const GEO_MAP_LAYERS = ['bts', 'maszt', 'pociag'];

function buildMap(svg) {
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 1000 700');
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <radialGradient id="glowSel"><stop offset="0" stop-color="#ffb547" stop-opacity=".5"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></radialGradient>
    <pattern id="pines" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M4 12 l3 -7 l3 7 Z M11 6 l2.5 -5 l2.5 5 Z" fill="#152a1d"/></pattern>
    <pattern id="fields" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M0 22 L22 0" stroke="#1a2016" stroke-width="1"/></pattern>`;
  el('rect', { x: 0, y: 0, width: 1000, height: 700, class: 'm-bg' }, svg);
  el('rect', { x: 0, y: 0, width: 1000, height: 700, fill: 'url(#fields)', opacity: .7 }, svg);
  // siatka co 1 km
  const grid = el('g', { class: 'm-grid' }, svg);
  for (let x = 100; x < 1000; x += 100) el('line', { x1: x, y1: 0, x2: x, y2: 700 }, grid);
  for (let y = 100; y < 700; y += 100) el('line', { x1: 0, y1: y, x2: 1000, y2: y }, grid);

  // Lasy Gajowe
  el('path', { d: 'M150 70 L930 60 L960 360 L760 470 L640 440 L440 425 L360 455 L240 410 Z', class: 'm-forest' }, svg);
  el('path', { d: 'M150 70 L930 60 L960 360 L760 470 L640 440 L440 425 L360 455 L240 410 Z', fill: 'url(#pines)', opacity: .9 }, svg);
  txt(svg, 790, 110, 'Lasy Gajowe', 'm-label m-area', { 'text-anchor': 'middle' });

  // wody
  el('ellipse', { cx: 420, cy: 288, rx: 52, ry: 30, class: 'm-water' }, svg);
  el('ellipse', { cx: 520, cy: 306, rx: 62, ry: 32, class: 'm-water' }, svg);
  txt(svg, 470, 250, 'Stawy Gajowe', 'm-label', { 'text-anchor': 'middle' });
  el('path', { d: 'M150 220 q30 -40 70 -10 q30 30 -10 60 q-40 30 -70 0 q-20 -25 10 -50 Z', class: 'm-water' }, svg);
  txt(svg, 190, 205, 'starorzecze', 'm-label m-dim', { 'text-anchor': 'middle' });
  el('ellipse', { cx: 365, cy: 620, rx: 26, ry: 14, class: 'm-water' }, svg);
  el('ellipse', { cx: 405, cy: 628, rx: 18, ry: 11, class: 'm-water' }, svg);
  txt(svg, 385, 652, 'glinianki', 'm-label m-dim', { 'text-anchor': 'middle' });
  el('ellipse', { cx: 860, cy: 470, rx: 90, ry: 42, class: 'm-water' }, svg);
  txt(svg, 860, 425, 'Zalew Lipnicki', 'm-label m-dim', { 'text-anchor': 'middle' });

  // miasta
  const town = (x, y, w, h, name, lx, ly) => {
    const g = el('g', { class: 'm-town' }, svg);
    const r = seeded(x * 7 + y);
    for (let i = 0; i < 26; i++) el('rect', { x: x + r() * (w - 14), y: y + r() * (h - 10), width: 8 + r() * 10, height: 6 + r() * 8 }, g);
    txt(svg, lx, ly, name, 'm-label m-area', { 'text-anchor': 'middle' });
  };
  town(0, 600, 200, 100, 'Kalnów', 70, 592);
  town(880, 600, 120, 100, 'Lipno', 945, 592);
  town(400, 470, 90, 40, '', 0, 0);
  txt(svg, 470, 528, 'Gajówka', 'm-label m-dim', { 'text-anchor': 'middle' });

  // nakładki pod drogami
  const ov = el('g', { id: 'm-overlays' }, svg);
  buildOverlays(ov);

  // kolej
  el('line', { x1: MAP.railX, y1: 0, x2: MAP.railX, y2: 700, class: 'm-rail' }, svg);
  el('line', { x1: MAP.railX, y1: 0, x2: MAP.railX, y2: 700, class: 'm-rail-t' }, svg);
  txt(svg, MAP.railX - 8, 140, 'linia kolejowa Kalnów–Lipno', 'm-label m-dim', { 'text-anchor': 'middle', transform: `rotate(-90 ${MAP.railX - 8} 140)` });

  // drogi
  const gs = el('g', { class: 'm-streets' }, svg);
  for (const st of STREETS) el('polyline', { points: st.pts.map(p => p.join(',')).join(' '), class: 'm-street ' + (st.id === 'dk46' ? 'm-main' : 'm-path') }, gs);
  txt(svg, 700, 498, 'DK46', 'm-street-label', { 'text-anchor': 'middle' });
  txt(svg, 505, 438, 'Gajowa', 'm-street-label', { 'text-anchor': 'middle' });
  txt(svg, 560, 384, 'grobla', 'm-street-label', { 'text-anchor': 'middle' });

  // maszt RTV
  el('circle', { cx: MAP.mast.x, cy: MAP.mast.y, r: 9, class: 'm-tower' }, svg);
  el('circle', { cx: MAP.mast.x, cy: MAP.mast.y, r: 3, class: 'm-tower-light' }, svg);
  txt(svg, MAP.mast.x + 14, MAP.mast.y - 6, 'maszt RTV Gajówka', 'm-label m-dim');

  // KPP
  el('rect', { x: CASE.hq[0] - 7, y: CASE.hq[1] - 7, width: 14, height: 14, class: 'm-hq' }, svg);
  txt(svg, CASE.hq[0] + 12, CASE.hq[1] + 4, 'KPP', 'm-label');

  drawBuildings(svg);
  for (const b of BUILDINGS) txt(svg, b.x, b.y + b.h / 2 + 13, b.addr.replace(/^Stawy Gajowe, /, ''), 'm-label m-bname', { 'text-anchor': 'middle' });
  drawCar(svg);

  el('line', { x1: 860, y1: 680, x2: 960, y2: 680, class: 'm-scale' }, svg);
  txt(svg, 910, 672, '1 km', 'm-label m-dim', { 'text-anchor': 'middle' });
  txt(svg, 980, 24, 'N ↑', 'm-label', { 'text-anchor': 'end' });
}

function buildOverlays(g) {
  const a = el('g', { 'data-geo': 'bts', class: 'm-ov' }, g);
  el('circle', { cx: MAP.bts.x, cy: MAP.bts.y, r: MAP.bts.r, fill: GEO.bts.color, class: 'm-ov-fill' }, a);
  el('circle', { cx: MAP.bts.x, cy: MAP.bts.y, r: MAP.bts.r, stroke: GEO.bts.color, class: 'm-ov-line' }, a);
  // wycinek pierścienia na południowy zachód od masztu (stamtąd maszt jest na NE)
  const m = MAP.mast, r1 = 120, r2 = 420, p = (r, deg) => { const t = deg * Math.PI / 180; return [m.x + r * Math.cos(t), m.y - r * Math.sin(t)]; };
  const [a1, a2] = [200, 250], A = p(r2, a1), B = p(r2, a2), C = p(r1, a2), D = p(r1, a1);
  const d = `M${A} A ${r2} ${r2} 0 0 1 ${B} L${C} A ${r1} ${r1} 0 0 0 ${D} Z`;
  const w = el('g', { 'data-geo': 'maszt', class: 'm-ov' }, g);
  el('path', { d, fill: GEO.maszt.color, class: 'm-ov-fill' }, w);
  el('path', { d, stroke: GEO.maszt.color, class: 'm-ov-line' }, w);
  const r = el('g', { 'data-geo': 'pociag', class: 'm-ov' }, g);
  el('rect', { x: MAP.railX - 200, y: 0, width: 400, height: 700, fill: GEO.pociag.color, class: 'm-ov-fill' }, r);
}
