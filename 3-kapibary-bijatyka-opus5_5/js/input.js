'use strict';
/* Klawiatura, układy klawiszy obu graczy i rozpoznawanie ruchów specjalnych. */

// SP – przycisk specjalny (łatwe sterowanie): sam albo z kierunkiem wykonuje ruch specjalny postaci
const BTN = ['LP', 'HP', 'LK', 'HK', 'SP'];
const BTN_LABEL = { LP: 'LŁ', HP: 'MŁ', LK: 'LK', HK: 'MK', SP: 'SP' };
const BTN_NAME = { LP: 'lekka łapa', HP: 'mocna łapa', LK: 'lekkie kopnięcie', HK: 'mocne kopnięcie', SP: 'cios specjalny' };

// Kody fizycznych klawiszy (e.code), więc działa na każdym układzie klawiatury
const BINDINGS = [
  { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    LP: ['KeyT'], HP: ['KeyY'], LK: ['KeyG'], HK: ['KeyH'], SP: ['KeyU'] },
  { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    LP: ['KeyO', 'Numpad4'], HP: ['KeyP', 'Numpad5'], LK: ['KeyL', 'Numpad1'], HK: ['Semicolon', 'Numpad2'], SP: ['BracketLeft', 'Numpad6'] },
];

const KEY_NAMES = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Semicolon: ';', BracketLeft: '[',
  Numpad1: 'Num1', Numpad2: 'Num2', Numpad4: 'Num4', Numpad5: 'Num5', Numpad6: 'Num6',
  Enter: 'Enter', Escape: 'Esc', Space: 'Spacja',
};
let layoutMap = null;
if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
  navigator.keyboard.getLayoutMap().then(m => { layoutMap = m; if (typeof UI !== 'undefined') UI.refreshKeyLabels(); }).catch(() => {});
}
function keyName(code) {
  if (KEY_NAMES[code]) return KEY_NAMES[code];
  if (layoutMap && layoutMap.get(code)) return layoutMap.get(code).toUpperCase();
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

const Keys = {
  down: new Set(),
  pad: new Set(),      // „klawisze” trzymane na padach
  hit: new Set(),      // wciśnięte od ostatniego kroku symulacji
  menuHit: [],         // kolejka dla menu
  init() {
    const gameCodes = new Set();
    for (const b of BINDINGS) for (const k in b) b[k].forEach(c => gameCodes.add(c));
    gameCodes.add('Space');
    gameCodes.add('Tab');   // Tab wynosił fokus do paska przeglądarki w środku walki
    window.addEventListener('keydown', e => {
      if (gameCodes.has(e.code) || e.code === 'Escape') e.preventDefault();
      this.down.add(e.code);   // także przy powtórzeniu: klawisz trzymany przy powrocie fokusu działa od razu
      if (e.repeat) return;
      this.press(e.code);
      if (typeof Sfx !== 'undefined') Sfx.unlock();   // Sfx to stała z audio.js, nie pole window
    });
    window.addEventListener('keyup', e => { this.down.delete(e.code); });
    window.addEventListener('blur', () => { this.down.clear(); });
  },
  press(code) { this.hit.add(code); this.menuHit.push(code); },
  isDown(code) { return this.down.has(code) || this.pad.has(code); },
  endStep() { this.hit.clear(); },
  takeMenu() { const q = this.menuHit; this.menuHit = []; return q; },
};

// ---------------- Pady ----------------
// Pad 1 steruje graczem 1, pad 2 graczem 2. Pad udaje klawisze gracza, więc menu i walka działają bez zmian.
// Układ standardowy: krzyżak albo lewa gałka – ruch, X/□ – LŁ, Y/△ – MŁ, A/✕ – LK, B/○ – MK,
// RB – cios specjalny, LB – rzut (LŁ+LK), RT – MŁ+MK (super, przerywnik), Start – pauza.
const Pads = {
  prev: [new Set(), new Set()],
  poll(screen) {
    if (!navigator.getGamepads) return;
    const inFight = screen === 'fight', strict = screen === 'pause' || screen === 'results';
    const pads = [...navigator.getGamepads()].filter(p => p && p.connected).slice(0, 2);
    Keys.pad.clear();
    pads.forEach((p, i) => {
      const B = BINDINGS[i], now = new Set();
      const btn = n => p.buttons[n] && p.buttons[n].pressed;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (btn(12) || ay < -0.5) now.add(B.up[0]);
      if (btn(13) || ay > 0.5) now.add(B.down[0]);
      if (btn(14) || ax < -0.5) now.add(B.left[0]);
      if (btn(15) || ax > 0.5) now.add(B.right[0]);
      if (inFight) {
        if (btn(2) || btn(4)) now.add(B.LP[0]);
        if (btn(3) || btn(7)) now.add(B.HP[0]);
        if (btn(0) || btn(4)) now.add(B.LK[0]);
        if (btn(1) || btn(7)) now.add(B.HK[0]);
        if (btn(5)) now.add(B.SP[0]);
      } else {
        // zatwierdź: w wyborze postaci za tego gracza, w pauzie i wynikach jak Enter
        if (btn(0) || btn(2)) now.add(strict ? 'Enter' : B.LP[0]);
        if (btn(1)) now.add('Escape');
      }
      if (btn(9)) now.add('Escape');
      for (const c of now) { Keys.pad.add(c); if (!this.prev[i].has(c)) { Keys.press(c); if (typeof Sfx !== 'undefined') Sfx.unlock(); } }
      this.prev[i] = now;
    });
  },
};

class KeyboardController {
  constructor(pi) { this.b = BINDINGS[pi]; this.human = true; }
  poll() {
    const held = k => this.b[k].some(c => Keys.isDown(c));
    const out = { l: held('left'), r: held('right'), u: held('up'), d: held('down'), press: [], hold: {} };
    for (const b of BTN) {
      out.hold[b] = held(b);
      if (this.b[b].some(c => Keys.hit.has(c))) out.press.push(b);
    }
    return out;
  }
}

// Manekin treningowy (stoi, kuca, skacze albo blokuje)
class DummyController {
  constructor() { this.mode = 0; this.human = false; }
  poll(me, opp) {
    const out = { l: false, r: false, u: false, d: false, press: [], hold: {} };
    const away = opp && opp.x > me.x ? 'l' : 'r';
    switch (this.mode) {
      case 1: out.d = true; break;
      case 2: out.u = true; break;
      case 3: {
        out[away] = true;
        const m = opp && opp.move;
        if (m && m.hits && m.hits.some(h => h.guard === 'low')) out.d = true;
        break;
      }
    }
    return out;
  }
}
const DUMMY_MODES = ['stoi', 'kuca', 'skacze', 'blokuje', 'komputer'];

// ---------------- Ruchy specjalne ----------------
// Kierunki w notacji klawiatury numerycznej, względem zwrotu postaci:
// 7 8 9 / 4 5 6 / 1 2 3, gdzie 6 = do przodu, 4 = do tyłu, 'n' = cokolwiek bez dołu
const MOTIONS = {
  qcf:  { alts: [[2, 3, 6], [2, 6]], win: 20, glyph: '↓↘→' },
  qcb:  { alts: [[2, 1, 4], [2, 4]], win: 20, glyph: '↓↙←' },
  dp:   { alts: [[6, 2, 3]], win: 20, glyph: '→↓↘' },
  // maxFirst: najdłużej trzymany pierwszy kierunek – blok (←) ani kucanie (↓) nie są początkiem ruchu
  bf:   { alts: [[4, 6]], win: 16, glyph: '←→', maxFirst: 10 },
  dd:   { alts: [[2, 'n', 2]], win: 15, glyph: '↓↓', maxFirst: 8 },
  qcf2: { alts: [[2, 3, 6, 2, 3, 6], [2, 6, 2, 6], [2, 3, 6, 3, 6]], win: 40, glyph: '↓↘→↓↘→' },
};
const DIR_GLYPH = { 1: '↙', 2: '↓', 3: '↘', 4: '←', 5: '•', 6: '→', 7: '↖', 8: '↑', 9: '↗' };

function dirMatch(p, d) {
  if (p === 'n') return d !== 1 && d !== 2 && d !== 3;
  return p === d;
}

// Szuka wzorca jako podciągu w historii kierunków (od najnowszych).
// Zwraca true, gdy ostatni element jest świeży, a cały ruch zmieścił się w oknie czasu.
function matchSeq(hist, pat, now, win, freshness, maxFirst) {
  let i = pat.length - 1;
  let lastEnd = -1, firstEnd = -1, firstDur = 0;
  for (let k = hist.length - 1; k >= 0 && i >= 0; k--) {
    const h = hist[k];
    const end = k + 1 < hist.length ? hist[k + 1].t : now;
    if (now - end > win) break;
    if (dirMatch(pat[i], h.d)) {
      if (i === pat.length - 1) lastEnd = end;
      if (i === 0) { firstEnd = end; firstDur = end - h.t; }
      i--;
    }
  }
  if (i >= 0) return false;
  if (maxFirst && firstDur > maxFirst) return false;
  return now - lastEnd <= freshness && now - firstEnd <= win;
}

function matchMotion(hist, motion, now) {
  const m = typeof motion === 'string' ? MOTIONS[motion] : { alts: [motion], win: 50 };
  const fresh = typeof motion === 'string' ? 8 : 14;
  return m.alts.some(p => matchSeq(hist, p, now, m.win, fresh, m.maxFirst));
}

function motionGlyph(motion) {
  if (typeof motion === 'string') return MOTIONS[motion].glyph;
  return motion.map(d => DIR_GLYPH[d] || '').join('');
}
