'use strict';
/* =====================================================================
   Szkic piwnicy „na podstawie relacji” – przekrój w stylu planu.
   Elementy pojawiają się w miarę, jak ona je opisuje.
   ===================================================================== */

function buildSketch(svg) {
  svg.setAttribute('viewBox', '0 0 320 210');
  svg.innerHTML = `
  <defs>
    <radialGradient id="bulbGlow" cx="0.5" cy="0.3" r="0.75">
      <stop offset="0" stop-color="#ffcf70" stop-opacity=".55"/>
      <stop offset=".45" stop-color="#ffb547" stop-opacity=".16"/>
      <stop offset="1" stop-color="#ffb547" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lampGlow"><stop offset="0" stop-color="#ff9a3c" stop-opacity=".6"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>
    <pattern id="bricks" width="16" height="8" patternUnits="userSpaceOnUse">
      <path d="M0 0H16M0 4H16M4 0V4M12 4V8" stroke="#23405a" stroke-width=".6" fill="none"/>
    </pattern>
    <clipPath id="roomClip"><rect x="40" y="80" width="240" height="118"/></clipPath>
  </defs>

  <!-- nad ziemią -->
  <g class="sk-out">
    <line x1="0" y1="78" x2="320" y2="78" class="sk-ground"/>
    <text x="8" y="72" class="sk-t sk-dim">poziom ulicy</text>
    <g id="sk-lamp" class="sk-hide">
      <line x1="16" y1="78" x2="16" y2="34" class="sk-line"/><path d="M16 34 h8" class="sk-line"/>
      <circle cx="24" cy="37" r="22" fill="url(#lampGlow)"/><circle cx="24" cy="37" r="2.4" fill="#ff9a3c"/>
    </g>
    <path d="M40 78 V30 L160 6 L280 30 V78" class="sk-house"/>
    <text id="sk-addr" x="160" y="26" text-anchor="middle" class="sk-t sk-addr">adres: ?</text>
    <g id="sk-upstairs">
      <text id="sk-up-t" x="122" y="62" text-anchor="middle" class="sk-t sk-dim">nad piwnicą: ?</text>
      <g id="sk-perp" class="sk-hide"><circle cx="214" cy="52" r="4" class="sk-perp"/><path d="M214 56 v12 M208 61 h12 M214 68 l-4 9 M214 68 l4 9" class="sk-perp-l"/></g>
      <g id="sk-tv" class="sk-hide"><rect x="228" y="56" width="16" height="11" class="sk-tv"/></g>
    </g>
    <g id="sk-train" class="sk-hide"><text x="300" y="50" text-anchor="end" class="sk-t sk-rail">≡≡ tory ≡≡</text></g>
    <g id="sk-bell" class="sk-hide"><text x="292" y="16" text-anchor="end" class="sk-t sk-bell">♪ zegar: 12 uderzeń</text></g>
    <g id="sk-malt" class="sk-hide"><path d="M60 64 q4 -6 0 -12 q-4 -6 0 -12 M70 64 q4 -6 0 -12 q-4 -6 0 -12" class="sk-malt"/><text x="78" y="46" class="sk-t sk-maltt">słód</text></g>
    <g id="sk-dog" class="sk-hide"><path d="M292 76 l2 -7 l6 0 l3 -4 l2 2 l-1 4 l0 5 M296 69 v7 M302 70 v6" class="sk-dog"/><text x="300" y="62" text-anchor="middle" class="sk-t sk-dim">pies</text></g>
    <g id="sk-rain" class="sk-hide">${Array.from({ length: 22 }, (_, i) => `<line x1="${8 + i * 14}" y1="${4 + (i * 7) % 20}" x2="${4 + i * 14}" y2="${14 + (i * 7) % 20}" class="sk-rainl"/>`).join('')}</g>
  </g>

  <!-- piwnica -->
  <rect x="40" y="80" width="240" height="118" fill="url(#bricks)" class="sk-room"/>
  <g clip-path="url(#roomClip)">
    <g id="sk-window" class="sk-hide">
      <rect x="52" y="82" width="34" height="13" class="sk-win"/>
      <path d="M60.5 82 v13 M69 82 v13 M77.5 82 v13 M52 88.5 h34" class="sk-win-l"/>
      <path d="M52 95 L40 150 L120 150 L86 95 Z" class="sk-win-beam"/>
    </g>
    <g id="sk-chute" class="sk-hide">
      <rect x="104" y="84" width="20" height="14" class="sk-metal"/>
      <path d="M104 198 q10 -18 22 -14 q10 2 12 14 Z" class="sk-coal"/>
      <text x="114" y="106" text-anchor="middle" class="sk-t sk-dim">zsyp</text>
    </g>
    <g id="sk-shelves" class="sk-hide">
      <path d="M46 120 H96 M46 150 H96 M46 178 H96 M48 112 V198 M94 112 V198" class="sk-line"/>
      <g id="sk-jars" class="sk-hide">
        ${[0, 1, 2, 3].map(i => `<rect x="${51 + i * 11}" y="110" width="7" height="10" rx="1.5" class="sk-jar j${i % 3}"/>`).join('')}
        ${[0, 1, 2].map(i => `<rect x="${53 + i * 13}" y="140" width="7" height="10" rx="1.5" class="sk-jar j${(i + 1) % 3}"/>`).join('')}
        ${[0, 1, 2, 3].map(i => `<rect x="${51 + i * 11}" y="168" width="7" height="10" rx="1.5" class="sk-jar j${(i + 2) % 3}"/>`).join('')}
      </g>
      <g id="sk-bottle" class="sk-hide"><rect x="86" y="134" width="5" height="16" rx="1.5" class="sk-bottle"/></g>
    </g>
    <g id="sk-stairs" class="sk-hide">
      <path d="M190 198 L272 82 M206 198 L280 92" class="sk-line"/>
      ${Array.from({ length: 8 }, (_, i) => { const y = 192 - i * 14, x = 194 + i * 10; return `<path d="M${x} ${y} h14" class="sk-line"/>`; }).join('')}
      <rect x="250" y="80" width="30" height="5" class="sk-door"/>
      <text x="262" y="98" text-anchor="middle" class="sk-t sk-dim">zasuwa</text>
    </g>
    <g id="sk-meter" class="sk-hide"><rect x="228" y="96" width="16" height="20" class="sk-metal"/><circle cx="236" cy="108" r="3" class="sk-line"/>
      <text id="sk-meter-t" x="236" y="125" text-anchor="middle" class="sk-t sk-dim">licznik</text></g>
    <g id="sk-pipe" class="sk-hide"><rect x="200" y="194" width="36" height="3" rx="1.5" class="sk-metal"/></g>
    <rect x="146" y="184" width="28" height="14" class="sk-crate"/>
    <!-- żarówka -->
    <g id="sk-bulb">
      <circle id="sk-glow" cx="160" cy="104" r="110" fill="url(#bulbGlow)"/>
      <line x1="160" y1="80" x2="160" y2="98" class="sk-cord"/>
      <circle id="sk-bulb-c" cx="160" cy="102" r="4.5" class="sk-bulb"/>
    </g>
    <!-- ona -->
    <g id="sk-girl" class="sk-girl">
      <circle cx="160" cy="166" r="6"/>
      <path d="M160 172 q-9 3 -10 12 h20 q-1 -9 -10 -12 Z"/>
      <path id="sk-hair" d="M154 164 q6 -9 12 0 l2 9 q-2 -2 -3 -6" class="sk-hair"/>
      <path id="sk-jacket" class="sk-hide sk-jacketp" d="M149 175 q11 -6 22 0 v10 h-22 Z"/>
      <rect id="sk-phone" x="166" y="176" width="3.5" height="6" rx=".8" class="sk-phone"/>
    </g>
  </g>
  <rect id="sk-dark" x="40" y="80" width="240" height="118" class="sk-dark"/>
  <rect x="40" y="80" width="240" height="118" class="sk-wall"/>
  <text x="160" y="208" text-anchor="middle" class="sk-t sk-dim" id="sk-caption">szkic na podstawie relacji</text>`;
}

function updateSketch() {
  const svg = document.getElementById('sketch');
  if (!svg || !S) return;
  const show = (id, on) => { const e = svg.querySelector('#' + id); if (e) e.classList.toggle('sk-hide', !on); };
  show('sk-lamp', has('luksfery'));
  show('sk-window', has('luksfery'));
  show('sk-chute', has('zsyp'));
  show('sk-shelves', has('piwnica'));
  show('sk-jars', has('sloiki'));
  show('sk-bottle', has('pic'));
  show('sk-stairs', has('schody'));
  show('sk-meter', has('licznik_widziany'));
  show('sk-pipe', has('rura'));
  show('sk-train', has('pociag'));
  show('sk-bell', has('dzwon'));
  show('sk-malt', has('slod'));
  show('sk-dog', has('pies'));
  show('sk-rain', !!S.rain);
  show('sk-jacket', has('cieplo'));
  const hair = svg.querySelector('#sk-hair');
  hair.classList.toggle('red', has('wlosy'));
  svg.querySelector('#sk-meter-t').textContent = has('licznik') ? 'PPE …781' : 'licznik';

  const knowsUp = has('zagrozenie') || has('auto');
  const upT = svg.querySelector('#sk-up-t');
  let up = 'nad piwnicą: ?';
  if (knowsUp) {
    if (S.perp === 'home' || S.perp === 'basement') up = 'nad piwnicą: on jest w domu';
    else if (S.perp === 'away') up = 'nad piwnicą: wyjechał';
    else if (S.perp === 'fled') up = 'nad piwnicą: uciekł';
    else if (S.perp === 'arrested') up = 'nad piwnicą: zatrzymany';
    else up = 'nad piwnicą: pusto';
  }
  upT.textContent = up;
  show('sk-perp', knowsUp && (S.perp === 'home' || S.perp === 'basement'));
  show('sk-tv', knowsUp && S.perp === 'home');

  let addr = 'adres: ?';
  if (has('potwierdzony') || has('adres_ppe') || S.rescued || S.escaped) addr = 'ul. Słodowa 14';
  else if (has('ewid_marek') || has('ewid_henryk') || has('sasiadka') || has('sasiedzi')) addr = 'ul. Słodowa 14 ?';
  else if (has('bts')) addr = 'sektor NE (KAL-04)';
  svg.querySelector('#sk-addr').textContent = addr;

  const dark = S.bulb !== 'on';
  svg.querySelector('#sk-dark').style.opacity = S.contact === 'lost' ? 0.88 : (dark ? 0.78 : 0);
  svg.querySelector('#sk-glow').style.display = dark ? 'none' : '';
  svg.querySelector('#sk-bulb-c').classList.toggle('off', dark);
  svg.querySelector('#sk-bulb-c').classList.toggle('dead', S.bulb === 'dead');
  svg.querySelector('#sk-phone').classList.toggle('off', S.contact !== 'active');
  svg.querySelector('#sk-girl').style.opacity = (S.rescued || S.escaped) ? 0.15 : 1;
}

let flickerTimer = null;
function flickerBulb(n) {
  const svg = document.getElementById('sketch');
  const bulbIcon = document.getElementById('chat-bulb');
  const glow = svg && svg.querySelector('#sk-glow');
  let i = 0;
  clearInterval(flickerTimer);
  flickerTimer = setInterval(() => {
    const on = i % 2 === 1 || i >= n * 2;
    if (glow && S.bulb === 'on') glow.style.opacity = on ? 1 : 0.05;
    if (bulbIcon) bulbIcon.classList.toggle('dim', !on);
    document.body.classList.toggle('flick', !on);
    if (++i > n * 2) { clearInterval(flickerTimer); if (glow) glow.style.opacity = 1; document.body.classList.remove('flick'); if (bulbIcon) bulbIcon.classList.remove('dim'); }
  }, 90 + Math.random() * 120);
}
