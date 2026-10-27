'use strict';
/* =====================================================================
   Pod jedną żarówką – mapa Kalnowa (fikcyjne miasto), 1 px = 2 m
   ===================================================================== */

function distRail(x, y) {
  const { x1, y1, x2, y2 } = MAP.rail;
  return Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / Math.hypot(y2 - y1, x2 - x1);
}
function railY(x) { const r = MAP.rail; return r.y1 + (r.y2 - r.y1) * (x / (r.x2 - r.x1)); }
function bearingFrom(o, x, y) { return (Math.atan2(x - o.x, -(y - o.y)) * 180 / Math.PI + 360) % 360; }
function inSector(x, y) {
  const b = MAP.bts, d = Math.hypot(x - b.x, y - b.y);
  if (d > b.r) return false;
  const br = bearingFrom(b, x, y);
  return br >= b.from && br <= b.to;
}
function riverX(y) {
  // przybliżony przebieg rzeki Kalnej
  const pts = [[0, 905], [120, 902], [260, 932], [380, 926], [500, 935], [600, 950], [700, 985]];
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) {
      const [ya, xa] = pts[i - 1], [yb, xb] = pts[i];
      return xa + (xb - xa) * (y - ya) / (yb - ya);
    }
  }
  return 985;
}

const GEO = {
  rail:  { label: '≤ 150 m od torów',            color: '#ff9f43', test: b => distRail(b.x, b.y) <= MAP.ranges.rail },
  malt:  { label: '≤ 480 m od słodowni browaru', color: '#e9c46a', test: b => Math.hypot(b.x - MAP.brewery.x, b.y - MAP.brewery.y) <= MAP.ranges.malt },
  bell:  { label: '≤ 700 m od wieży św. Anny',   color: '#b49cff', test: b => Math.hypot(b.x - MAP.church.x, b.y - MAP.church.y) <= MAP.ranges.bell },
  bts:   { label: 'w sektorze stacji KAL-04',    color: '#3fd0c9', test: b => inSector(b.x, b.y) },
  coal:  { label: 'ogrzewanie węglowe',          color: '#9aa5b1', test: b => b.heating.startsWith('węglowe') },
  house: { label: 'dom jednorodzinny',           color: '#9aa5b1', test: b => b.type === 'dom' },
  power: { label: 'ma piwnicę i prąd',           color: '#9aa5b1', test: b => b.basement && b.power },
  ppe:   { label: 'licznik o pasującym nr PPE',  color: '#9aa5b1', test: b => ['slodowa14', 'browarna7', 'kolejowa12'].includes(b.id) },
  hw:    { label: 'dom Henryka Wróbla',          color: '#9aa5b1', test: b => b.id === 'slodowa14' },
};
const GEO_MAP_LAYERS = ['rail', 'malt', 'bell', 'bts'];

function buildMap(svg) {
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 1000 700');
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#1d3b2b" stroke-width="3"/></pattern>
    <pattern id="allot" width="22" height="16" patternUnits="userSpaceOnUse">
      <rect x="1" y="1" width="20" height="14" fill="none" stroke="#1d3b2b" stroke-width="1"/></pattern>
    <radialGradient id="glowSel"><stop offset="0" stop-color="#ffb547" stop-opacity=".5"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></radialGradient>`;

  el('rect', { x: 0, y: 0, width: 1000, height: 700, class: 'm-bg' }, svg);
  // siatka operacyjna 400 × 400 m
  const grid = el('g', { class: 'm-grid' }, svg);
  for (let x = 200; x < 1000; x += 200) el('line', { x1: x, y1: 0, x2: x, y2: 700 }, grid);
  for (let y = 200; y < 700; y += 200) el('line', { x1: 0, y1: y, x2: 1000, y2: y }, grid);
  'ABCDE'.split('').forEach((c, i) => txt(svg, i * 200 + 100, 14, c, 'm-grid-t', { 'text-anchor': 'middle' }));
  [1, 2, 3, 4].forEach((r, i) => txt(svg, 6, i * 200 + 104, String(r), 'm-grid-t'));

  // zieleń
  el('rect', { x: 330, y: 600, width: 210, height: 88, rx: 14, fill: 'url(#hatch)', class: 'm-park' }, svg);
  txt(svg, 435, 650, 'Park Miejski', 'm-label m-dim', { 'text-anchor': 'middle' });
  el('rect', { x: 40, y: 275, width: 220, height: 150, rx: 8, fill: 'url(#allot)', class: 'm-park' }, svg);
  txt(svg, 150, 352, 'ROD „Kolejarz”', 'm-label m-dim', { 'text-anchor': 'middle' });
  el('rect', { x: 600, y: 450, width: 90, height: 90, rx: 10, fill: 'url(#hatch)', class: 'm-park' }, svg);
  txt(svg, 645, 498, 'skwer', 'm-label m-dim', { 'text-anchor': 'middle' });

  // rzeka
  el('path', { d: 'M905 0 C 900 120, 935 260, 926 380 S 950 600, 985 700', class: 'm-river' }, svg);
  txt(svg, 948, 300, 'Kalna', 'm-label m-water', { transform: 'rotate(80 948 300)' });

  // nakładki (pod budynkami)
  const ov = el('g', { id: 'm-overlays' }, svg);
  buildOverlays(ov);

  // ulice
  const gs = el('g', { class: 'm-streets' }, svg);
  for (const st of STREETS) {
    el('polyline', { points: st.pts.map(p => p.join(',')).join(' '), class: 'm-street' }, gs);
  }
  // most
  el('rect', { x: 900, y: 552, width: 56, height: 16, class: 'm-bridge' }, svg);

  // tory
  const r = MAP.rail;
  el('line', { x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2, class: 'm-rail-bed' }, svg);
  el('line', { x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2, class: 'm-rail' }, svg);
  txt(svg, 40, 186, 'linia kolejowa', 'm-label m-dim', { transform: 'rotate(-2.9 40 186)' });

  // dworzec
  el('rect', { x: 150, y: 158, width: 64, height: 20, rx: 2, class: 'm-poi' }, svg);
  txt(svg, 182, 152, 'Kalnów Gł.', 'm-label', { 'text-anchor': 'middle' });

  // browar
  el('rect', { x: 725, y: 262, width: 82, height: 48, rx: 2, class: 'm-poi m-brewery' }, svg);
  el('circle', { cx: 795, cy: 270, r: 6, class: 'm-chimney' }, svg);
  txt(svg, 766, 328, 'Słodownia (browar)', 'm-label', { 'text-anchor': 'middle' });

  // kościół
  const ch = MAP.church;
  el('rect', { x: ch.x - 16, y: ch.y - 10, width: 32, height: 22, rx: 2, class: 'm-poi m-church' }, svg);
  el('path', { d: `M${ch.x} ${ch.y - 24} v12 M${ch.x - 5} ${ch.y - 19} h10`, class: 'm-cross' }, svg);
  txt(svg, ch.x, ch.y + 26, 'kościół św. Anny', 'm-label', { 'text-anchor': 'middle' });

  // komenda policji, szpital
  el('rect', { x: 215, y: 628, width: 52, height: 22, rx: 2, class: 'm-poi m-police' }, svg);
  txt(svg, 241, 664, 'KPP Kalnów', 'm-label', { 'text-anchor': 'middle' });
  el('rect', { x: 40, y: 600, width: 60, height: 30, rx: 2, class: 'm-poi m-hosp' }, svg);
  el('path', { d: 'M70 606 v18 M61 615 h18', class: 'm-hosp-cross' }, svg);
  txt(svg, 70, 645, 'Szpital', 'm-label', { 'text-anchor': 'middle' });

  // BTS
  for (const t of [{ x: MAP.bts.x, y: MAP.bts.y, n: 'KAL-04' }, { x: 130, y: 330, n: 'KAL-01' }, { x: 780, y: 610, n: 'KAL-07' }]) {
    el('path', { d: `M${t.x} ${t.y - 9} L${t.x + 7} ${t.y + 6} L${t.x - 7} ${t.y + 6} Z`, class: 'm-bts' }, svg);
    txt(svg, t.x + 10, t.y + 4, t.n, 'm-label m-dim');
  }

  // zabudowa dekoracyjna
  const deco = el('g', { class: 'm-deco' }, svg);
  const rnd = seeded(112);
  const keyPts = BUILDINGS.map(b => [b.x, b.y]).concat([[766, 285], [520, 395], [182, 168], [241, 639], [70, 615]]);
  const streetSegs = [];
  STREETS.forEach(st => { for (let i = 1; i < st.pts.length; i++) streetSegs.push([st.pts[i - 1], st.pts[i]]); });
  const segDist = (px, py, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
    let t = L ? ((px - a[0]) * dx + (py - a[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
  };
  const placed = [];
  for (const [a, b] of streetSegs) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    for (let d = 16; d < len - 10; d += 30 + rnd() * 10) {
      for (const side of [-1, 1]) {
        const off = 22 + rnd() * 6;
        const cx = a[0] + (b[0] - a[0]) * d / len + nx * off * side;
        const cy = a[1] + (b[1] - a[1]) * d / len + ny * off * side;
        if (cx < 8 || cx > 992 || cy < 8 || cy > 692) continue;
        if (keyPts.some(p => Math.hypot(p[0] - cx, p[1] - cy) < 34)) continue;
        if (distRail(cx, cy) < 22) continue;
        if (Math.abs(cx - riverX(cy)) < 32) continue;
        if (streetSegs.some(([p, q]) => segDist(cx, cy, p, q) < 14)) continue;
        if (placed.some(p => Math.hypot(p[0] - cx, p[1] - cy) < 22)) continue;
        if (cx > 330 && cx < 540 && cy > 600) continue;
        if (cx > 40 && cx < 260 && cy > 275 && cy < 425) continue;
        if (cx > 600 && cx < 690 && cy > 450 && cy < 540) continue;
        placed.push([cx, cy]);
        const w = 12 + rnd() * 8, h = 10 + rnd() * 6;
        el('rect', { x: (cx - w / 2).toFixed(1), y: (cy - h / 2).toFixed(1), width: w.toFixed(1), height: h.toFixed(1), rx: 1.5, class: 'm-house' }, deco);
      }
    }
  }

  // nazwy ulic
  const labels = {
    slodowa: [520, 266, 0], torowa: [835, 222, -8], browarna: [693, 420, -90], kolejowa: [120, 254, -1.7],
    nadrzeczna: [842, 520, 72], koscielna: [380, 444, 0], glowna: [292, 520, -90], ogrodowa: [700, 574, 0],
    kasztanowa: [200, 484, 0], mlynska: [552, 640, -90], polna: [975, 600, 72],
  };
  for (const st of STREETS) {
    const L = labels[st.id]; if (!L) continue;
    txt(svg, L[0], L[1], st.name, 'm-street-label', { transform: `rotate(${L[2]} ${L[0]} ${L[1]})`, 'text-anchor': 'middle' });
  }

  drawBuildings(svg);
  drawCar(svg);

  // podziałka
  el('line', { x1: 30, y1: 680, x2: 130, y2: 680, class: 'm-scale' }, svg);
  txt(svg, 80, 672, '200 m', 'm-label m-dim', { 'text-anchor': 'middle' });
  txt(svg, 980, 24, 'N ↑', 'm-label', { 'text-anchor': 'end' });
}

function buildOverlays(g) {
  const r = MAP.rail, w = MAP.ranges.rail;
  // pas wzdłuż torów
  const ang = Math.atan2(r.y2 - r.y1, r.x2 - r.x1), nx = -Math.sin(ang) * w, ny = Math.cos(ang) * w;
  const band = el('g', { 'data-geo': 'rail', class: 'm-ov' }, g);
  el('polygon', { points: `${r.x1 + nx},${r.y1 + ny} ${r.x2 + nx},${r.y2 + ny} ${r.x2 - nx},${r.y2 - ny} ${r.x1 - nx},${r.y1 - ny}`,
    fill: GEO.rail.color, class: 'm-ov-fill' }, band);

  const malt = el('g', { 'data-geo': 'malt', class: 'm-ov' }, g);
  el('circle', { cx: MAP.brewery.x, cy: MAP.brewery.y, r: MAP.ranges.malt, fill: GEO.malt.color, class: 'm-ov-fill' }, malt);
  el('circle', { cx: MAP.brewery.x, cy: MAP.brewery.y, r: MAP.ranges.malt, stroke: GEO.malt.color, class: 'm-ov-line' }, malt);

  const bell = el('g', { 'data-geo': 'bell', class: 'm-ov' }, g);
  el('circle', { cx: MAP.church.x, cy: MAP.church.y, r: MAP.ranges.bell, fill: GEO.bell.color, class: 'm-ov-fill' }, bell);
  el('circle', { cx: MAP.church.x, cy: MAP.church.y, r: MAP.ranges.bell, stroke: GEO.bell.color, class: 'm-ov-line' }, bell);

  const b = MAP.bts, a1 = (b.from - 90) * Math.PI / 180, a2 = (b.to - 90) * Math.PI / 180;
  const sec = el('g', { 'data-geo': 'bts', class: 'm-ov' }, g);
  const d = `M${b.x} ${b.y} L${b.x + b.r * Math.cos(a1)} ${b.y + b.r * Math.sin(a1)} A ${b.r} ${b.r} 0 0 1 ${b.x + b.r * Math.cos(a2)} ${b.y + b.r * Math.sin(a2)} Z`;
  el('path', { d, fill: GEO.bts.color, class: 'm-ov-fill' }, sec);
  el('path', { d, stroke: GEO.bts.color, class: 'm-ov-line' }, sec);
}

