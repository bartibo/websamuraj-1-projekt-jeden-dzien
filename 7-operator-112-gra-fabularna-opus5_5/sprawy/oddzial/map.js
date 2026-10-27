'use strict';
/* =====================================================================
   Oddział zamknięty – plan terenu szpitala w Borku, 1 px = 0,5 m
   ===================================================================== */

const GEO = {
  aml:      { label: '≤ 90 m od punktu AML',                 color: '#3fd0c9', test: b => Math.hypot(b.x - MAP.aml.x, b.y - MAP.aml.y) <= MAP.aml.r },
  wieza:    { label: 'wieża ciśnień 60–115 m na północ',     color: '#ff6b6b', test: b => { const d = Math.hypot(b.x - MAP.tower.x, b.y - MAP.tower.y); return d >= 120 && d <= 230 && b.y > MAP.tower.y; } },
  cmentarz: { label: 'okna na wschód, na cmentarz',          color: '#9aa5b1', test: b => b.view.includes('cmentarz') },
  pietro:   { label: 'ma piętro i wejście z tunelu',         color: '#9aa5b1', test: b => b.floors >= 2 && b.tunnel },
  krata:    { label: 'kraty w oknach (budynek oddziału)',    color: '#9aa5b1', test: b => b.bars },
  oddz3:    { label: 'Oddział III według planów',            color: '#9aa5b1', test: b => b.id === 'pawC' },
  forum:    { label: 'graffiti ze zdjęcia na forum',         color: '#9aa5b1', test: b => b.id === 'pawC' },
  swiatlo:  { label: 'światło widziane spod muru',           color: '#9aa5b1', test: b => b.id === 'pawC' },
};
const GEO_MAP_LAYERS = ['aml', 'wieza'];

function buildMap(svg) {
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 1000 700');
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <radialGradient id="glowSel"><stop offset="0" stop-color="#ffb547" stop-opacity=".5"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></radialGradient>
    <radialGradient id="cemGlow" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="#ff5a2a" stop-opacity=".22"/><stop offset="1" stop-color="#ff5a2a" stop-opacity="0"/></radialGradient>
    <pattern id="grass" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M2 8 l1 -3 M7 4 l1 -3" stroke="#14231a" stroke-width="1"/></pattern>`;
  el('rect', { x: 0, y: 0, width: 1000, height: 700, class: 'm-bg' }, svg);
  el('rect', { x: 40, y: 40, width: 830, height: 620, fill: 'url(#grass)', opacity: .8 }, svg);

  // cmentarz z tysiącami zniczy
  const cem = el('g', { class: 'm-cem' }, svg);
  el('rect', { x: 884, y: 40, width: 116, height: 620, class: 'm-cem-bg' }, cem);
  el('rect', { x: 850, y: 40, width: 150, height: 620, fill: 'url(#cemGlow)' }, cem);
  const rnd = seeded(1111);
  for (let gy = 56; gy < 650; gy += 22) for (let gx = 896; gx < 995; gx += 16) {
    el('rect', { x: gx, y: gy, width: 9, height: 13, rx: 1.5, class: 'm-grave' }, cem);
    if (rnd() < 0.85) el('circle', { cx: gx + 4.5 + (rnd() - 0.5) * 6, cy: gy + 15, r: 1.6, class: 'm-candle', style: `animation-delay:${(rnd() * 2).toFixed(2)}s` }, cem);
  }
  txt(svg, 942, 30, 'Cmentarz parafialny', 'm-label m-dim', { 'text-anchor': 'middle' });

  // mur szpitala, brama, dziura w murze
  el('rect', { x: 40, y: 40, width: 830, height: 620, class: 'm-wall' }, svg);
  el('line', { x1: 90, y1: 660, x2: 132, y2: 660, class: 'm-gate' }, svg);
  txt(svg, 111, 680, 'brama', 'm-label m-dim', { 'text-anchor': 'middle' });
  el('path', { d: `M${MAP.hole.x} ${MAP.hole.y - 12} l6 6 l-4 5 l5 6 l-7 7`, class: 'm-hole' }, svg);
  txt(svg, MAP.hole.x - 8, MAP.hole.y + 28, 'dziura w murze', 'm-label m-dim', { 'text-anchor': 'end' });

  // drzewa
  const rt = seeded(42);
  for (let i = 0; i < 70; i++) {
    const x = 60 + rt() * 780, y = 60 + rt() * 580;
    if (BUILDINGS.some(b => Math.abs(b.x - x) < b.w / 2 + 16 && Math.abs(b.y - y) < b.h / 2 + 16)) continue;
    if (Math.hypot(x - MAP.tower.x, y - MAP.tower.y) < 30) continue;
    el('circle', { cx: x, cy: y, r: 7 + rt() * 6, class: 'm-tree' }, svg);
  }

  // nakładki pod budynkami
  const ov = el('g', { id: 'm-overlays' }, svg);
  buildOverlays(ov);

  // alejki
  const gs = el('g', { class: 'm-streets' }, svg);
  for (const st of STREETS) el('polyline', { points: st.pts.map(p => p.join(',')).join(' '), class: 'm-street m-path' }, gs);
  txt(svg, 500, 684, 'ul. Szpitalna', 'm-street-label', { 'text-anchor': 'middle' });
  txt(svg, 330, 512, 'aleja główna', 'm-street-label', { 'text-anchor': 'middle' });
  txt(svg, 690, 292, 'dziedziniec', 'm-street-label', { 'text-anchor': 'middle' });
  txt(svg, 842, 470, 'ścieżka pod murem', 'm-street-label', { 'text-anchor': 'middle', transform: 'rotate(-90 842 470)' });

  // tunele (widoczne po planach albo po opisie tunelu)
  const tun = el('g', { id: 'm-tunnels', class: 'm-tunnels' }, svg);
  const E = BUILDINGS.find(b => b.id === 'pawE');
  for (const id of ['pawB', 'pawC', 'pawD', 'kotlownia']) {
    const b = BUILDINGS.find(x => x.id === id);
    el('path', { d: `M${E.x} ${E.y} L${E.x} ${(E.y + b.y) / 2} L${b.x} ${(E.y + b.y) / 2} L${b.x} ${b.y}`, class: 'm-tunnel' }, tun);
  }
  txt(tun, 470, 352, 'tunele', 'm-label m-tun-t');

  // wieża ciśnień i komin
  el('circle', { cx: MAP.tower.x, cy: MAP.tower.y, r: 16, class: 'm-tower' }, svg);
  el('circle', { cx: MAP.tower.x, cy: MAP.tower.y, r: 3, class: 'm-tower-light' }, svg);
  txt(svg, MAP.tower.x + 22, MAP.tower.y + 4, 'wieża ciśnień', 'm-label m-dim');
  el('circle', { cx: 462, cy: 182, r: 8, class: 'm-chimney' }, svg);

  drawBuildings(svg);
  // nazwy budynków (krótkie)
  for (const b of BUILDINGS) txt(svg, b.x, b.y + b.h / 2 + 14, b.addr.replace(/ \(.*\)$/, ''), 'm-label m-bname', { 'text-anchor': 'middle' });
  drawCar(svg);

  el('line', { x1: 60, y1: 690, x2: 160, y2: 690, class: 'm-scale' }, svg);
  txt(svg, 110, 682, '50 m', 'm-label m-dim', { 'text-anchor': 'middle' });
  txt(svg, 980, 24, 'N ↑', 'm-label', { 'text-anchor': 'end' });
}

function buildOverlays(g) {
  const a = el('g', { 'data-geo': 'aml', class: 'm-ov' }, g);
  el('circle', { cx: MAP.aml.x, cy: MAP.aml.y, r: MAP.aml.r, fill: GEO.aml.color, class: 'm-ov-fill' }, a);
  el('circle', { cx: MAP.aml.x, cy: MAP.aml.y, r: MAP.aml.r, stroke: GEO.aml.color, class: 'm-ov-line' }, a);
  // pierścień 120–230 px wokół wieży, tylko połowa południowa (wieża na północ od budynku)
  const t = MAP.tower, r1 = 120, r2 = 230;
  const w = el('g', { 'data-geo': 'wieza', class: 'm-ov' }, g);
  const d = `M${t.x - r2} ${t.y} A ${r2} ${r2} 0 0 0 ${t.x + r2} ${t.y} L${t.x + r1} ${t.y} A ${r1} ${r1} 0 0 1 ${t.x - r1} ${t.y} Z`;
  el('path', { d, fill: GEO.wieza.color, class: 'm-ov-fill' }, w);
  el('path', { d, stroke: GEO.wieza.color, class: 'm-ov-line' }, w);
}
