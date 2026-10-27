'use strict';
/* =====================================================================
   Oddział zamknięty – szkic sali „na podstawie relacji”.
   Widok od strony drzwi: okno z kratą na wschód, dwa łóżka, korytarz.
   ===================================================================== */

function buildSketch(svg) {
  svg.setAttribute('viewBox', '0 0 320 210');
  svg.innerHTML = `
  <defs>
    <radialGradient id="candleGlow" cx="0.5" cy="0.6" r="0.7"><stop offset="0" stop-color="#ff5a2a" stop-opacity=".65"/><stop offset="1" stop-color="#ff5a2a" stop-opacity="0"/></radialGradient>
    <radialGradient id="torch" cx="0.5" cy="1" r="1"><stop offset="0" stop-color="#ffe6b0" stop-opacity=".5"/><stop offset="1" stop-color="#ffe6b0" stop-opacity="0"/></radialGradient>
    <radialGradient id="corrBulb"><stop offset="0" stop-color="#ffe39a" stop-opacity=".7"/><stop offset="1" stop-color="#ffe39a" stop-opacity="0"/></radialGradient>
    <pattern id="tiles" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 0H12V12" stroke="#1d2a36" stroke-width=".6" fill="none"/></pattern>
  </defs>

  <!-- korytarz -->
  <rect x="0" y="0" width="320" height="34" fill="#0b1219"/>
  <text x="8" y="12" class="sk-t sk-dim">korytarz</text>
  <g id="sk-corr-bulb" class="sk-hide"><circle cx="150" cy="10" r="26" fill="url(#corrBulb)"/><circle cx="150" cy="8" r="2.5" class="sk-bulb"/></g>
  <text id="sk-graffiti" x="246" y="24" text-anchor="middle" class="sk-t sk-graf sk-hide">ZBYCHU 2009 ☠</text>
  <g id="sk-perp" class="sk-hide"><circle cx="96" cy="14" r="4" class="sk-perp"/><path d="M96 18 v10 M90 22 h12 M96 28 l-3 5 M96 28 l3 5" class="sk-perp-l"/><rect x="93" y="12" width="6" height="4" rx="1" class="sk-mask"/></g>
  <text id="sk-door-nr" x="44" y="30" text-anchor="middle" class="sk-t sk-dim">sala ?</text>
  <line x1="0" y1="34" x2="320" y2="34" class="sk-ground"/>

  <!-- sala -->
  <rect x="20" y="40" width="280" height="160" fill="url(#tiles)" class="sk-room"/>
  <g id="sk-window" class="sk-hide">
    <rect x="196" y="56" width="62" height="54" class="sk-win2"/>
    <rect x="196" y="56" width="62" height="54" fill="url(#candleGlow)"/>
    <g id="sk-candles">${Array.from({ length: 16 }, (_, i) => `<circle cx="${201 + (i % 8) * 7.3}" cy="${98 + Math.floor(i / 8) * 6}" r="1.2" class="sk-candle" style="animation-delay:${(i * 0.37) % 2}s"/>`).join('')}</g>
    <g id="sk-tower" class="sk-hide"><rect x="200" y="66" width="8" height="26" class="sk-tower"/><circle cx="204" cy="65" r="1.6" class="sk-tower-l"/></g>
    <path d="M206 56 v54 M216 56 v54 M226 56 v54 M236 56 v54 M246 56 v54" class="sk-bars"/>
    <path d="M232 60 l8 14 l-5 8" class="sk-crack"/>
    <path d="M196 110 L150 200 L300 200 L258 110 Z" class="sk-win-beam2"/>
  </g>
  <!-- łóżka -->
  <g id="sk-beds" class="sk-hide">
    <path d="M36 150 h70 M36 150 v30 M106 150 v30 M36 140 v10" class="sk-bed"/>
    <path d="M60 150 v4 M84 150 v4" class="sk-strap"/>
    <path d="M190 160 h80 M190 160 v30 M270 160 v30 M270 148 v12" class="sk-bed"/>
    <path d="M214 160 v4 M244 160 v4" class="sk-strap"/>
    <g id="sk-gown" class="sk-hide"><rect x="222" y="152" width="20" height="7" rx="1" class="sk-gown"/><rect x="246" y="155" width="9" height="3" rx="1" class="sk-band"/><text x="250" y="148" text-anchor="middle" class="sk-t sk-band-t">LIS K.</text></g>
  </g>
  <!-- drzwi -->
  <g id="sk-door">
    <rect x="24" y="44" width="34" height="96" class="sk-door2"/>
    <circle cx="41" cy="72" r="3" class="sk-peep"/>
    <g id="sk-chair" class="sk-hide"><path d="M62 140 l-8 -34 h16 M70 106 v34" class="sk-line"/></g>
    <g id="sk-barricade" class="sk-hide"><path d="M58 126 h46 v14 h-46 Z" class="sk-bar2"/></g>
  </g>
  <!-- ona -->
  <g id="sk-girl" class="sk-girl">
    <circle cx="140" cy="168" r="6"/>
    <path d="M140 174 q-9 3 -10 12 h20 q-1 -9 -10 -12 Z"/>
    <path id="sk-blanket" class="sk-hide sk-blanketp" d="M128 177 q12 -7 24 0 v11 h-24 Z"/>
    <path id="sk-leg" d="M148 186 l14 6" class="sk-leg"/>
    <circle id="sk-blood" cx="160" cy="194" r="4" class="sk-blood sk-hide"/>
    <rect id="sk-phone" x="146" y="176" width="3.5" height="6" rx=".8" class="sk-phone"/>
    <path id="sk-pipe" class="sk-hide" d="M122 172 l-8 -16" stroke="#7da3c5" stroke-width="2"/>
  </g>
  <path id="sk-beam" class="sk-hide" d="M148 178 L110 60 L200 60 Z" fill="url(#torch)"/>
  <rect id="sk-dark" x="20" y="40" width="280" height="160" class="sk-dark"/>
  <rect x="20" y="40" width="280" height="160" class="sk-wall"/>
  <text id="sk-next" x="306" y="120" text-anchor="middle" class="sk-t sk-dim" transform="rotate(90 306 120)">sala obok: ?</text>
  <text x="160" y="208" text-anchor="middle" class="sk-t sk-dim" id="sk-addr">szkic na podstawie relacji</text>`;
}

function updateSketch() {
  const svg = document.getElementById('sketch');
  if (!svg || !S) return;
  const show = (id, on) => { const e = svg.querySelector('#' + id); if (e) e.classList.toggle('sk-hide', !on); };
  show('sk-window', has('sala'));
  show('sk-beds', has('sala'));
  show('sk-chair', has('sala'));
  show('sk-tower', has('wieza'));
  svg.querySelector('#sk-candles').style.display = has('znicze') ? '' : 'none';
  show('sk-gown', has('opaska'));
  show('sk-barricade', has('barykada'));
  show('sk-blanket', has('cieplo'));
  show('sk-blood', has('noga') && !has('opatrunek'));
  show('sk-pipe', has('rura'));
  show('sk-corr-bulb', has('prad'));
  show('sk-graffiti', has('graffiti'));
  show('sk-perp', S.perp === 'C' && S.kingaIn === 'pawC');
  show('sk-beam', S.bulb === 'on' && S.contact !== 'lost');
  svg.querySelector('#sk-door-nr').textContent = has('opaska') || has('graffiti') ? 'sala 12' : 'sala ?';
  svg.querySelector('#sk-next').textContent = has('ciala') ? 'sala 14: † † †' : has('pukanie') ? 'sala obok: puk puk' : 'sala obok: ?';
  const al = addrLevel();
  svg.querySelector('#sk-addr').textContent = al === 'confirmed' ? 'pawilon C · 1 piętro · sala 12' : al === 'probable' ? 'pawilon C ?' + (floorKnown() ? ' · 1 piętro' : '') : has('opaska') ? 'Oddz. III · sala 12 · pawilon ?' : 'szkic na podstawie relacji';
  const dark = S.bulb !== 'on';
  svg.querySelector('#sk-dark').style.opacity = S.contact === 'lost' ? 0.9 : (dark ? (has('znicze') ? 0.55 : 0.75) : 0.1);
  svg.querySelector('#sk-phone').classList.toggle('off', S.contact !== 'active');
  svg.querySelector('#sk-girl').style.opacity = (S.rescued || S.escaped || S.kingaIn !== 'pawC') ? 0.12 : 1;
}

function flickerBulb() { }
