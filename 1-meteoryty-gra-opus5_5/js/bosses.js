'use strict';
/* Bossy: statek kosmiczny na koniec każdej fali. 100 różnych – generowanych z numeru fali
   (kadłub, kolory, klasa, nazwa, zdolności, sposób ruchu). Fala 100 to finałowy Okręt-matka. */

const FINAL_WAVE = 100;

// klasa rośnie co 10 fal
const BOSS_CLASSES = ['Korweta', 'Fregata', 'Niszczyciel', 'Krążownik', 'Pancernik',
  'Lotniskowiec', 'Żniwiarz', 'Strażnik', 'Dominator', 'Okręt-matka'];
const BOSS_NAMES = ['Kruk', 'Żmija', 'Szerszeń', 'Cerber', 'Hydra', 'Widmo', 'Burza', 'Ćma', 'Skorpion',
  'Gorgona', 'Lewiatan', 'Nemezis', 'Tytan', 'Feniks', 'Szakal', 'Raróg', 'Licho', 'Strzyga', 'Zmora',
  'Bies', 'Mamuna', 'Południca', 'Upiór', 'Wij', 'Bazyliszek'];

// zdolności odblokowywane z kolejnymi falami (p – okres w sekundach)
const BOSS_ABILITIES = [
  { id: 'salvo',    from: 1,  p: 2.4, name: 'salwa plazmy' },
  { id: 'fan',      from: 2,  p: 3.6, name: 'wachlarz pocisków' },
  { id: 'drop',     from: 3,  p: 5,   name: 'zrzut meteorytów' },
  { id: 'fighters', from: 9,  p: 12,  name: 'myśliwce' },
  { id: 'shield',   from: 8,  p: 0,   name: 'tarcza energetyczna' },
  { id: 'mines',    from: 7,  p: 7.5, name: 'miny' },
  { id: 'beam',     from: 8,  p: 8.5, name: 'laser oblężniczy' },
  { id: 'stream',   from: 10, p: 7,   name: 'strumień plazmy' },
  { id: 'missiles', from: 12, p: 6.5, name: 'rakiety samonaprowadzające' },
  { id: 'blink',    from: 15, p: 7,   name: 'skok fazowy' },
  { id: 'escort',   from: 18, p: 14,  name: 'wezwanie eskorty' },
];

const SHIP_SHAPES = {
  // górna połowa obrysu (dziób w +x), lustrzana względem osi x
  arrow:    [[1, 0], [0.55, -0.12], [0.1, -0.22], [-0.25, -0.75], [-0.55, -0.85], [-0.5, -0.35], [-0.85, -0.3], [-0.9, 0]],
  crescent: [[0.35, 0], [0.55, -0.25], [0.95, -0.7], [0.55, -0.88], [0, -0.55], [-0.55, -0.45], [-0.8, -0.2], [-0.75, 0]],
  mantis:   [[1, -0.06], [0.6, -0.18], [0.88, -0.55], [0.45, -0.44], [0.1, -0.3], [-0.3, -0.68], [-0.75, -0.58], [-0.55, -0.2], [-0.95, -0.1], [-0.9, 0]],
  trident:  [[1, -0.05], [0.4, -0.08], [0.4, -0.35], [0.95, -0.45], [0.95, -0.62], [0.2, -0.62], [-0.3, -0.42], [-0.8, -0.48], [-0.7, -0.16], [-0.95, -0.1], [-0.95, 0]],
  disc:     null,
  carrier:  [[0.92, 0], [0.92, -0.3], [0.62, -0.4], [0.62, -0.52], [-0.2, -0.52], [-0.3, -0.78], [-0.72, -0.78], [-0.8, -0.46], [-0.95, -0.4], [-0.95, 0]],
  crystal:  [[1, 0], [0.3, -0.35], [0.48, -0.72], [-0.1, -0.46], [-0.35, -0.92], [-0.5, -0.4], [-0.95, -0.26], [-0.8, 0]],
  ring:     null,
};
const SHAPE_KEYS = Object.keys(SHIP_SHAPES);

function hslRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [255 * f(0), 255 * f(8), 255 * f(4)].map(Math.round).join(',');
}
const roman = n => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n);

const BossGen = {
  cache: new Map(),

  // krok 11 (względnie pierwszy z 25): w obrębie klasy (10 fal) imiona się nie powtarzają,
  // a to samo imię wraca dopiero po kilkunastu falach i w innej klasie
  nameFor(n) {
    const tier = Math.floor((n - 1) / 10) % 10;
    const lap = Math.floor((n - 1) / 100);
    return `${BOSS_CLASSES[tier]} ${BOSS_NAMES[((n - 1) * 11) % BOSS_NAMES.length]}${lap ? ' ' + roman(lap + 1) : ''}`;
  },

  spec(n) {
    let s = this.cache.get(n);
    if (s) return s;
    const rng = mulberry32(n * 7919 + 13);
    const tier = Math.min(9, Math.floor((n - 1) / 10));
    const final = n === FINAL_WAVE;
    // kolejne bossy mają różne kadłuby (krok 3 mod 8) i kolory (złoty kąt)
    const shape = final ? 'ring' : SHAPE_KEYS[(n * 3 + Math.floor(n / 8)) % SHAPE_KEYS.length];
    const hue = (n * 137.508) % 360;
    const unlocked = BOSS_ABILITIES.filter(a => a.from <= n);
    const count = final ? unlocked.length : Math.min(5, 1 + Math.floor(n / 5), unlocked.length);
    // świeżo odblokowana zdolność pojawia się od razu w swojej fali, potem zdolności rotują; reszta losowo (stałe ziarno)
    const lead = unlocked[unlocked.length - 1].from === n ? unlocked.length - 1 : (n - 1) % unlocked.length;
    const pool = unlocked.filter((_, i) => i !== lead);
    const abil = [unlocked[lead]];
    while (abil.length < count && pool.length) abil.push(pool.splice((rng() * pool.length) | 0, 1)[0]);
    // każdy boss musi czymś strzelać – sama tarcza albo skok to za mało
    if (!abil.some(a => a.id !== 'shield' && a.id !== 'blink')) abil.push(BOSS_ABILITIES[0]);
    s = {
      n, final, shape, hue,
      name: final ? 'Okręt-matka Nawia' : this.nameFor(n),
      hull: [hslRgb(hue, 14 + rng() * 14, 62), hslRgb(hue, 18, 34), hslRgb(hue, 22, 14)],
      accent: hslRgb((hue + 160 + rng() * 40) % 360, 95, 62),
      move: final ? 'hover' : ['orbit', 'strafe', 'hover'][n % 3],
      size: final ? 90 : 40 + tier * 4 + rng() * 6,
      hp: (final ? 3.5 : 1) * (220 + n * 75),
      abilities: abil.map(a => a.id),
      seed: n * 31 + 7,
    };
    this.cache.set(n, s);
    return s;
  },

  // opis zdolności do sklepu i pomocy
  abilityNames(spec) {
    return spec.abilities.map(id => BOSS_ABILITIES.find(a => a.id === id).name);
  },
};

/* Grafika statku – generowana raz na boss i rozmiar */
const ShipArt = {
  cache: new Map(),
  get(spec, r) {
    const key = spec.n + '_' + Math.round(r * 2);
    let a = this.cache.get(key);
    if (!a) { a = this.make(spec, r); this.cache.set(key, a); }
    return a;
  },

  outline(spec, r) {
    const rng = mulberry32(spec.seed);
    const p = new Path2D();
    if (spec.shape === 'disc' || spec.shape === 'ring') {
      const n = 28;
      for (let i = 0; i <= n; i++) {
        const a = i / n * TAU;
        const fin = spec.shape === 'disc' && (i % 7 === 3) ? 1.18 : 1;
        const x = Math.cos(a) * r * 0.95 * fin, y = Math.sin(a) * r * (spec.shape === 'disc' ? 0.78 : 0.95) * fin;
        if (i) p.lineTo(x, y); else p.moveTo(x, y);
      }
      p.closePath();
      if (spec.shape === 'ring') { p.moveTo(r * 0.58, 0); p.arc(0, 0, r * 0.58, 0, TAU, true); p.closePath(); }
      return p;
    }
    const half = SHIP_SHAPES[spec.shape].map(([x, y], i, arr) => {
      const j = y === 0 ? 0 : (rng() - 0.5) * 0.12;
      return [x + (i && i < arr.length - 1 ? (rng() - 0.5) * 0.1 : 0), y + j];
    });
    const pts = half.concat(half.slice(0, -1).reverse().map(([x, y]) => [x, -y]).slice(0));
    pts.forEach(([x, y], i) => (i ? p.lineTo(x * r, y * r) : p.moveTo(x * r, y * r)));
    p.closePath();
    return p;
  },

  make(spec, r) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const half = r * 1.25 + 6, S = Math.ceil(half * 2 * dpr);
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d');
      g.scale(S / (half * 2), S / (half * 2));
      g.translate(half, half);
      return [c, g];
    };
    const [c, g] = mk(), [w, wg] = mk();
    const rng = mulberry32(spec.seed + 1);
    const path = this.outline(spec, r);
    const [h0, h1, h2] = spec.hull, acc = spec.accent;

    // silniki z tyłu (pod kadłubem)
    const engines = 2 + (spec.n % 3);
    for (let i = 0; i < engines; i++) {
      const y = (i - (engines - 1) / 2) * r * 0.3;
      g.fillStyle = `rgb(${h2})`;
      g.fillRect(-r * 1.02, y - r * 0.08, r * 0.3, r * 0.16);
      const eg = g.createRadialGradient(-r * 1.05, y, 0, -r * 1.05, y, r * 0.22);
      eg.addColorStop(0, '#fff'); eg.addColorStop(0.4, `rgba(${acc},0.9)`); eg.addColorStop(1, `rgba(${acc},0)`);
      g.fillStyle = eg;
      g.beginPath(); g.arc(-r * 1.05, y, r * 0.22, 0, TAU); g.fill();
    }

    const grd = g.createLinearGradient(-r * 0.4, -r, r * 0.3, r);
    grd.addColorStop(0, `rgb(${h0})`); grd.addColorStop(0.55, `rgb(${h1})`); grd.addColorStop(1, `rgb(${h2})`);
    g.fillStyle = grd;
    g.fill(path, 'evenodd');

    g.save();
    g.clip(path, 'evenodd');
    // płyty pancerza
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
    for (let k = 0; k < 7; k++) {
      const x = -r + rng() * r * 2;
      g.beginPath(); g.moveTo(x, -r); g.lineTo(x + (rng() - 0.5) * r * 0.3, r); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    for (let k = 0; k < 4; k++) {
      const y = (rng() - 0.5) * r * 1.4;
      g.beginPath(); g.moveTo(-r, y); g.lineTo(r, y + (rng() - 0.5) * 6); g.stroke();
    }
    // światło i cień
    const sh = g.createLinearGradient(0, -r, 0, r);
    sh.addColorStop(0, 'rgba(255,255,255,0.18)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = sh; g.fillRect(-r * 1.3, -r * 1.3, r * 2.6, r * 2.6);
    g.restore();

    // wieżyczki – ich pozycje (guns) są lufami, z których boss strzela
    const turrets = 2 + (rng() * 3 | 0), guns = [];
    for (let k = 0; k < turrets; k++) {
      const x = (rng() - 0.6) * r * 0.9, y = (k % 2 ? 1 : -1) * r * (0.2 + rng() * 0.3);
      const tr = r * (0.08 + rng() * 0.05);
      if (!g.isPointInPath(path, x * (S / (half * 2)) + S / 2, y * (S / (half * 2)) + S / 2, 'evenodd')) continue;
      guns.push([x + tr * 2.2, y]);
      g.fillStyle = `rgb(${h2})`; g.beginPath(); g.arc(x, y, tr * 1.3, 0, TAU); g.fill();
      g.fillStyle = `rgb(${h1})`; g.beginPath(); g.arc(x, y, tr, 0, TAU); g.fill();
      g.strokeStyle = `rgb(${h0})`; g.lineWidth = tr * 0.5;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + tr * 2.2, y); g.stroke();
    }
    // kokpit / rdzeń
    const cx = spec.shape === 'ring' || spec.shape === 'disc' ? 0 : r * 0.42;
    const cr = spec.shape === 'ring' ? r * 0.3 : r * 0.17;
    const cg = g.createRadialGradient(cx - cr * 0.3, -cr * 0.3, 0, cx, 0, cr);
    cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.35, `rgb(${acc})`); cg.addColorStop(1, `rgba(${acc},0.35)`);
    g.fillStyle = cg;
    g.beginPath(); g.ellipse(cx, 0, cr * (spec.shape === 'ring' ? 1 : 1.5), cr, 0, 0, TAU); g.fill();
    if (spec.shape === 'ring') {
      g.strokeStyle = `rgb(${h1})`; g.lineWidth = r * 0.07;
      for (let k = 0; k < 4; k++) {
        const a = k / 4 * TAU + 0.4;
        g.beginPath(); g.moveTo(Math.cos(a) * r * 0.32, Math.sin(a) * r * 0.32); g.lineTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62); g.stroke();
      }
    }
    // światła pozycyjne
    g.fillStyle = `rgb(${acc})`;
    for (let k = 0; k < 6; k++) {
      const x = (rng() - 0.5) * r * 1.4, y = (rng() - 0.5) * r * 1.2;
      if (!g.isPointInPath(path, x * (S / (half * 2)) + S / 2, y * (S / (half * 2)) + S / 2, 'evenodd')) continue;
      g.beginPath(); g.arc(x, y, Math.max(1, r * 0.035), 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1.4;
    g.stroke(path);
    g.strokeStyle = `rgba(${acc},0.35)`; g.lineWidth = 1;
    g.stroke(path);

    wg.fillStyle = '#fff';
    wg.fill(path, 'evenodd');
    if (guns.length < 2) guns.push([r * 0.9, 0], [r * 0.3, 0]);
    return { canvas: c, white: w, half, guns };
  },
};

/* Zwykłe statki wroga – ten sam generator grafiki, stały kształt i kolor dla każdego typu */
const ENEMY_SHIPS = {
  bomber:    { shape: 'carrier',  hue: 28 },
  kamikaze:  { shape: 'arrow',    hue: 355 },
  gunship:   { shape: 'trident',  hue: 75 },
  minelayer: { shape: 'crescent', hue: 320 },
  carrier:   { shape: 'disc',     hue: 270 },
  escort:    { shape: 'crystal',  hue: 190 },
  swarmer:   { shape: 'mantis',   hue: 15 },
  missile:   { shape: 'arrow',    hue: 45 },
};
const enemySpecCache = {};
function enemySpec(type) {
  let s = enemySpecCache[type];
  if (s) return s;
  const i = Object.keys(ENEMY_SHIPS).indexOf(type), E = ENEMY_SHIPS[type];
  s = enemySpecCache[type] = {
    n: 900 + i, shape: E.shape, hue: E.hue, seed: 4000 + i * 17,
    hull: [hslRgb(E.hue, 30, 60), hslRgb(E.hue, 26, 34), hslRgb(E.hue, 24, 14)],
    accent: hslRgb((E.hue + 180) % 360, 95, 62),
  };
  return s;
}
