'use strict';
/* Narzędzia: losowanie, liczby po polsku, odmiana, słownie, zapis w przeglądarce. */

const A = window.A = {};

const TAU = Math.PI * 2;
function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
function chance(p) { return Math.random() < p; }
function easeOut(t) { return 1 - (1 - t) * (1 - t); }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function easeOutBack(t) { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// Losowanie bez powtórek, dopóki pula się nie wyczerpie
function bag(arr) {
  let pool = [];
  return () => { if (!pool.length) pool = shuffle(arr); return pool.pop(); };
}
// Deterministyczny generator (stałe „losowe” cechy zadania)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/* ---------- Liczby ---------- */

// Polska odmiana: 1 minuta, 2 minuty, 5 minut
function plural(n, one, few, many) {
  n = Math.abs(n);
  if (n === 1) return one;
  const d = n % 10, h = n % 100;
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
}
// Forma dla dowolnej liczby: ułamki biorą dopełniacz l.poj. („2,5 minuty”)
function unitForm(v, forms) {
  if (!Number.isInteger(v)) return forms[3] || forms[1];
  return plural(v, forms[0], forms[1], forms[2]);
}

const NBSP = ' ';
// Format liczby po polsku z rozsądną liczbą cyfr znaczących
function fmt(v, maxDec) {
  if (!isFinite(v)) return '∞';
  const a = Math.abs(v);
  let dec;
  if (maxDec != null) dec = maxDec;
  else if (a === 0) dec = 0;
  else if (a >= 1000) dec = 0;
  else if (a >= 100) dec = 1;
  else if (a >= 10) dec = 1;
  else if (a >= 1) dec = 2;
  else dec = Math.min(20, Math.ceil(-Math.log10(a)) + 2);
  let s = v.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: dec, useGrouping: true });
  return s.replace(/\s/g, NBSP);
}
function fmtInt(v) { return Math.round(v).toLocaleString('pl-PL').replace(/\s/g, NBSP); }
// Wartość liczbowa po zaokrągleniu jak w fmt (do doboru formy)
function roundedLike(v) {
  const s = fmt(v).replace(/ /g, '').replace(',', '.');
  return parseFloat(s);
}
// „2,5 minuty”, „5 minut”, „1 minuta”
function qty(v, forms, maxDec) {
  const s = fmt(v, maxDec);
  const r = parseFloat(s.replace(/ /g, '').replace(',', '.'));
  return s + NBSP + unitForm(r, forms);
}

function mmss(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
}
function minutesWord(min) { return qty(min, ['minuta', 'minuty', 'minut', 'minuty']); }
function minutesAcc(min) { return qty(min, ['minutę', 'minuty', 'minut', 'minuty']); }

/* ---------- Słownie ---------- */

const W_UNITS = ['zero', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć',
  'dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście',
  'siedemnaście', 'osiemnaście', 'dziewiętnaście'];
const W_TENS = ['', '', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt',
  'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'];
const W_HUND = ['', 'sto', 'dwieście', 'trzysta', 'czterysta', 'pięćset', 'sześćset', 'siedemset',
  'osiemset', 'dziewięćset'];
const W_BIG = [null, ['tysiąc', 'tysiące', 'tysięcy'], ['milion', 'miliony', 'milionów'], ['miliard', 'miliardy', 'miliardów']];

function words999(n) {
  const out = [];
  const h = Math.floor(n / 100), r = n % 100;
  if (h) out.push(W_HUND[h]);
  if (r >= 20) { out.push(W_TENS[Math.floor(r / 10)]); if (r % 10) out.push(W_UNITS[r % 10]); }
  else if (r > 0) out.push(W_UNITS[r]);
  return out;
}
// 1437 → „tysiąc czterysta trzydzieści siedem”
function slownie(n, feminine) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'zero';
  const parts = [];
  let g = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) {
      let w = words999(chunk);
      if (g === 0) {
        if (feminine && chunk % 100 !== 12 && chunk % 10 === 2 && chunk % 100 >= 2) w[w.length - 1] = 'dwie';
        if (feminine && chunk === 1) w = ['jedna'];
      } else {
        const forms = W_BIG[g];
        if (chunk === 1) w = [forms[0]];
        else w.push(plural(chunk, forms[0], forms[1], forms[2]));
      }
      parts.unshift(w.join(' '));
    }
    n = Math.floor(n / 1000); g++;
  }
  return parts.join(' ');
}

function roman(n) {
  n = Math.floor(n);
  if (n <= 0) return 'nulla';
  const map = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, r] of map) while (n >= v) { s += r; n -= v; }
  return s;
}
const MORSE = { 0: '−−−−−', 1: '·−−−−', 2: '··−−−', 3: '···−−', 4: '····−', 5: '·····', 6: '−····', 7: '−−···', 8: '−−−··', 9: '−−−−·' };
function morse(n) { return String(Math.floor(n)).split('').map(d => MORSE[d]).join(' '); }

/* ---------- Zapis ---------- */

const store = {
  get(key, def) {
    try { const v = localStorage.getItem('absurdoro.' + key); return v == null ? def : JSON.parse(v); }
    catch (e) { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('absurdoro.' + key, JSON.stringify(val)); } catch (e) { /* tryb prywatny */ }
  },
  del(key) { try { localStorage.removeItem('absurdoro.' + key); } catch (e) { /* nic */ } },
};

/* ---------- Płótno dopasowane do kontenera ---------- */

// Tworzy canvas wypełniający element; w i h w pikselach CSS
function makeCanvas(host) {
  const cv = document.createElement('canvas');
  cv.className = 'mode-canvas';
  host.appendChild(cv);
  const g = cv.getContext('2d');
  const o = { cv, g, w: 1, h: 1, dpr: 1 };
  o.fit = () => {
    const r = host.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w !== o.w || h !== o.h || dpr !== o.dpr) {
      o.w = w; o.h = h; o.dpr = dpr;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + 'px'; cv.style.height = h + 'px';
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  o.fit();
  return o;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* ---------- Rejestr trybów odliczania ---------- */
// Każdy tryb: { id, name, icon, tagline, breakOk, create(host, s) → { frame(s, dt), destroy() } }
A.MODES = [];
A.defineMode = m => A.MODES.push(m);
