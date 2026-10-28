'use strict';
/* =====================================================================
   Przed świtem – szkic „na podstawie relacji”: widok z tylnego siedzenia
   przez przednią szybę. Niebo jaśnieje z każdą minutą do wschodu.
   ===================================================================== */

function buildSketch(svg) {
  svg.setAttribute('viewBox', '0 0 320 210');
  svg.innerHTML = `
  <defs>
    <linearGradient id="skSky" x1="0" y1="0" x2="0" y2="1"><stop id="sk-sky-top" offset="0" stop-color="#0a1220"/><stop id="sk-sky-bot" offset="1" stop-color="#1a2638"/></linearGradient>
    <radialGradient id="skPhone" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#9ff" stop-opacity=".45"/><stop offset="1" stop-color="#9ff" stop-opacity="0"/></radialGradient>
  </defs>
  <!-- za szybą -->
  <rect x="0" y="0" width="320" height="128" fill="url(#skSky)"/>
  <path class="sk-forest" d="M0 70 l8 -10 l6 8 l7 -14 l7 12 l9 -9 l6 7 l8 -13 l7 11 l9 -8 l8 9 l7 -12 l8 10 l9 -7 l7 8 l8 -13 l9 12 l7 -9 l8 8 l7 -12 l9 11 l8 -8 l7 9 l9 -13 l7 10 l8 -6 l8 8 l9 -12 l7 10 l8 -8 l9 9 l7 -10 l8 9 L320 70 L320 84 L0 84 Z"/>
  <g id="sk-mast" class="sk-hide"><path d="M236 18 L240 68 M232 68 L236 18 L244 68" class="sk-mastl"/><circle cx="236" cy="18" r="2" class="sk-mast-l"/><circle cx="237" cy="44" r="1.6" class="sk-mast-l"/></g>
  <rect id="sk-fog" x="0" y="78" width="320" height="50" class="sk-fog"/>
  <g id="sk-water" class="sk-hide">
    <rect x="0" y="84" width="320" height="44" class="sk-water"/>
    <path d="M140 128 L150 86 L170 86 L182 128 Z" class="sk-pier"/>
    <path d="M152 92 h16 M148 104 h24 M144 116 h32" class="sk-pier-l"/>
    <g id="sk-sign" class="sk-hide"><path d="M188 128 v-26" class="sk-pier-l"/><rect x="182" y="96" width="20" height="10" class="sk-sign"/><text id="sk-sign-t" x="192" y="104" text-anchor="middle" class="sk-t sk-sign-t">?</text></g>
  </g>
  <g id="sk-man-out" class="sk-hide"><circle cx="160" cy="98" r="2.6" class="sk-man"/><path d="M160 100 v7" class="sk-man-l"/><path d="M166 106 h5 l1 -2" class="sk-dog-l"/></g>
  <!-- szyba, rama, deska -->
  <path class="sk-frost" d="M0 0 L40 0 L22 40 L0 70 Z M320 0 L290 0 L306 30 L320 56 Z"/>
  <path class="sk-frame" d="M0 0 H320 V12 L300 128 H20 L0 12 Z M0 0 V210 M320 0 V210" fill="none"/>
  <path class="sk-dash" d="M0 128 H320 V150 Q160 140 0 150 Z"/>
  <g id="sk-ne" class="sk-hide"><rect x="148" y="132" width="24" height="10" rx="1.5" class="sk-disp"/><text x="160" y="140" text-anchor="middle" class="sk-t sk-ne">NE</text></g>
  <g id="sk-draw" class="sk-hide"><rect x="40" y="130" width="34" height="14" class="sk-paper" transform="rotate(-4 57 137)"/><text x="57" y="140" text-anchor="middle" class="sk-t sk-draw-t" transform="rotate(-4 57 137)">TATA·ZUZIA</text></g>
  <g id="sk-bottle" class="sk-hide"><rect x="240" y="132" width="30" height="8" rx="3" class="sk-bottle2"/><rect x="268" y="134" width="8" height="4" class="sk-bottle2"/></g>
  <!-- wnętrze -->
  <path class="sk-wheel" d="M30 190 a50 34 0 0 1 100 0"/>
  <g id="sk-man"><circle cx="82" cy="164" r="13" class="sk-man"/><path d="M58 210 q0 -30 24 -32 q24 2 24 32 Z" class="sk-man"/><circle id="sk-phone" cx="96" cy="190" r="10" fill="url(#skPhone)"/></g>
  <g id="sk-bag" class="sk-hide"><rect x="198" y="176" width="40" height="26" rx="4" class="sk-bag"/><path d="M206 176 q12 -12 24 0" class="sk-bag-l"/></g>
  <text id="sk-trunk" x="300" y="166" text-anchor="end" class="sk-t sk-dim sk-hide">torba → bagażnik</text>
  <g id="sk-dog" class="sk-hide"><path d="M250 206 q4 -20 30 -18 q18 2 22 12 l8 -4 l2 8 q-6 6 -14 4 Z" class="sk-dogb"/><circle cx="300" cy="196" r="1.4" fill="#000"/></g>
  <text id="sk-addr" x="160" y="122" text-anchor="middle" class="sk-t sk-addr">szkic na podstawie relacji</text>`;
}

function updateSketch() {
  const svg = document.getElementById('sketch');
  if (!svg || !S) return;
  const show = (id, on) => { const e = svg.querySelector('#' + id); if (e) e.classList.toggle('sk-hide', !on); };
  // niebo jaśnieje do wschodu słońca (t = 33)
  const k = Math.min(1, S.t / 33), mix = (a, b) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const rgb = c => `rgb(${c.join(',')})`;
  svg.querySelector('#sk-sky-top').setAttribute('stop-color', rgb(mix([10, 18, 32], [92, 110, 140])));
  svg.querySelector('#sk-sky-bot').setAttribute('stop-color', rgb(mix([26, 38, 56], [214, 160, 120])));
  show('sk-water', has('woda'));
  show('sk-mast', has('maszt') || has('maszt_wzm'));
  show('sk-ne', has('maszt'));
  show('sk-sign', has('pzw') || has('tablica') || has('tabliczka_wzm'));
  svg.querySelector('#sk-sign-t').textContent = has('tablica') || has('w_pomost14') || has('potwierdzony') ? '14' : '?';
  svg.querySelector('#sk-fog').style.opacity = has('woda') ? 0.35 : 0.8;
  show('sk-draw', has('zuzia'));
  show('sk-bottle', has('alkohol') && !has('bez_alko'));
  show('sk-bag', has('srodki') && !has('torba'));
  show('sk-trunk', has('torba'));
  show('sk-dog', has('bruno') && !has('wysiadl'));
  const out = has('wysiadl') && !S.rescued;
  show('sk-man', !out && !S.rescued);
  show('sk-man-out', out);
  svg.querySelector('#sk-phone').style.opacity = S.contact === 'active' ? 1 : 0;
  const al = addrLevel();
  svg.querySelector('#sk-addr').textContent = al === 'confirmed' ? 'Stawy Gajowe · pomost 14' : al === 'probable' ? 'Stawy Gajowe · pomost 14 ?' : has('woda') ? 'nad wodą · miejsce nieustalone' : 'szkic na podstawie relacji';
}

function flickerBulb() { }
