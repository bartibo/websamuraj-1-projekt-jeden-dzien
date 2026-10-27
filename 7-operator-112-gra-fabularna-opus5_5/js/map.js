'use strict';
/* =====================================================================
   Mapa – część wspólna wszystkich spraw: ograniczenia z poszlak,
   dopasowanie budynków, radiowóz, legenda. Rysunek terenu, GEO
   i nakładki dostarcza sprawa (sprawy/<id>/map.js).
   ===================================================================== */

const SVGNS = 'http://www.w3.org/2000/svg';

/* budynki zgodne ze wszystkimi ograniczeniami; jeden = dedukcja adresu */
function candidates() {
  const g = activeGeo();
  return g.length ? BUILDINGS.filter(b => g.every(x => GEO[x.geo].test(b))) : BUILDINGS.slice();
}
function deducedBuilding() {
  if (activeGeo().length < 2) return null;
  const c = candidates();
  return c.length === 1 ? c[0] : null;
}

/* aktywne ograniczenia = odkryte poszlaki z polem geo */
function activeGeo() {
  const out = [];
  for (const id in CLUES) if (CLUES[id].geo && S.clues.has(id)) out.push({ clue: id, geo: CLUES[id].geo });
  return out;
}
function buildingMatches(b) {
  return activeGeo().map(g => ({ ...g, ok: GEO[g.geo].test(b) }));
}

function el(tag, attrs, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function txt(parent, x, y, s, cls, extra) {
  const t = el('text', Object.assign({ x, y, class: cls || 'm-label' }, extra || {}), parent);
  t.textContent = s;
  return t;
}

function seeded(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function drawBuildings(svg) {
  const gb = el('g', { id: 'm-buildings' }, svg);
  for (const b of BUILDINGS) {
    const g = el('g', { class: 'm-b', 'data-id': b.id, tabindex: 0 }, gb);
    el('circle', { cx: b.x, cy: b.y, r: 26, class: 'm-b-glow', fill: 'url(#glowSel)' }, g);
    el('rect', { x: b.x - b.w / 2, y: b.y - b.h / 2, width: b.w, height: b.h, rx: 2, class: 'm-b-rect' }, g);
    const num = b.short || b.addr.replace(/^ul\. /, '').replace(/ \(.*\)$/, '').split(' ').pop();
    txt(g, b.x, b.y + 3.5, num, 'm-b-num', { 'text-anchor': 'middle' });
    g.addEventListener('click', () => onMapBuilding(b.id));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onMapBuilding(b.id); } });
  }

}

function drawCar(svg) {
  const car = el('g', { id: 'm-car', class: 'm-car', style: 'display:none' }, svg);
  el('circle', { cx: 0, cy: 0, r: 9, class: 'm-car-halo' }, car);
  el('rect', { x: -6, y: -4, width: 12, height: 8, rx: 2, class: 'm-car-body' }, car);

}

/* ---------- odświeżanie ---------- */
function updateMap() {
  const svg = document.getElementById('map');
  if (!svg || !S) return;
  svg.querySelectorAll('.m-ov').forEach(g => {
    const geo = g.dataset.geo;
    const found = Object.keys(CLUES).some(id => CLUES[id].geo === geo && S.clues.has(id));
    g.classList.toggle('on', found && S.ui.layers[geo] !== false);
  });
  const act = activeGeo();
  svg.querySelectorAll('.m-b').forEach(g => {
    const b = BUILDINGS.find(x => x.id === g.dataset.id);
    const all = act.length >= 2 && buildingMatches(b).every(m => m.ok);
    g.classList.toggle('match', all);
    g.classList.toggle('sel', S.ui.selBuilding === b.id);
    g.classList.toggle('target', !!(S.order && S.order.target === b.id && S.order.status !== 'wolny'));
  });
  // radiowóz
  const car = svg.getElementById ? svg.getElementById('m-car') : document.getElementById('m-car');
  const pos = policePos();
  if (pos) { car.style.display = ''; car.setAttribute('transform', `translate(${pos[0].toFixed(1)} ${pos[1].toFixed(1)})`); }
  else car.style.display = 'none';
  if (CASE.updateMap) CASE.updateMap(svg);
  renderMapLegend();
}

function targetPoint(o) {
  if (!o) return null;
  if (o.target) { const b = BUILDINGS.find(x => x.id === o.target); return [b.x, b.y + b.h / 2 + 8]; }
  const st = STREETS.find(x => x.id === o.street);
  const p = st.pts, m = Math.floor((p.length - 1) / 2);
  return [(p[m][0] + p[m + 1][0]) / 2, (p[m][1] + p[m + 1][1]) / 2];
}
function policePos() {
  const o = S.order;
  if (!o) return null;
  const to = targetPoint(o);
  if (o.status !== 'jedzie') return to;
  const k = Math.max(0, Math.min(1, (S.t - o.start) / Math.max(0.1, o.eta - o.start)));
  return [o.from[0] + (to[0] - o.from[0]) * k, o.from[1] + (to[1] - o.from[1]) * k];
}

function renderMapLegend() {
  const box = document.getElementById('map-legend');
  if (!box) return;
  const items = GEO_MAP_LAYERS.filter(geo => Object.keys(CLUES).some(id => CLUES[id].geo === geo && S.clues.has(id)));
  const act = activeGeo();
  let html = items.length
    ? items.map(geo => `<label class="lg"><input type="checkbox" data-geo="${geo}" ${S.ui.layers[geo] !== false ? 'checked' : ''}>
      <i style="background:${GEO[geo].color}"></i>${GEO[geo].label}</label>`).join('')
    : '<span class="muted">Nakładki pojawią się, gdy zbierzesz poszlaki o otoczeniu (dźwięki, zapachy, lokalizacja z sieci).</span>';
  // ranking budynków wg dopasowania do poszlak
  if (act.length >= 2) {
    const rank = BUILDINGS.map(b => ({ b, ok: buildingMatches(b).filter(m => m.ok).length }))
      .sort((x, y) => y.ok - x.ok || x.b.addr.localeCompare(y.b.addr)).slice(0, 5);
    html += `<div class="rank"><div class="rank-h">Dopasowanie budynków (${act.length} ograniczeń)</div>${rank.map(r =>
      `<button class="rk ${r.ok === act.length ? 'all' : ''} ${S.ui.selBuilding === r.b.id ? 'on' : ''}" data-b="${r.b.id}"><span>${esc(r.b.addr.replace(/^ul\. /, ''))}</span><b>${r.ok}/${act.length}</b></button>`).join('')}</div>`;
  }
  box.innerHTML = html;
  box.querySelectorAll('input').forEach(inp => inp.addEventListener('change', () => { S.ui.layers[inp.dataset.geo] = inp.checked; updateMap(); }));
  box.querySelectorAll('[data-b]').forEach(b => b.addEventListener('click', () => onMapBuilding(b.dataset.b)));
}
