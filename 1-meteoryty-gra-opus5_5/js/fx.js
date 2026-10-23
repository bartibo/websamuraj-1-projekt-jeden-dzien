'use strict';
/* Efekty: cache sprite'ów poświaty, system cząsteczek, napisy, grafika meteorytów i ikony bonusów. */

const SpriteCache = {
  _glow: new Map(),
  glow(color) {
    let c = this._glow.get(color);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, `rgba(${color},1)`);
    grd.addColorStop(0.22, `rgba(${color},0.55)`);
    grd.addColorStop(0.55, `rgba(${color},0.14)`);
    grd.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    this._glow.set(color, c);
    return c;
  },
};

class ParticleSystem {
  constructor() { this.items = []; this.texts = []; this.cap = 2400; this.fonts = new Map(); }
  clear() { this.items.length = 0; this.texts.length = 0; }

  // p: { k: 'spark'|'glow'|'ring'|'smoke'|'debris', x, y, vx, vy, life, s, c, a, drag, grow, len, r0, r1, rot, vr }
  add(p) {
    if (this.items.length > this.cap) return;
    p.age = 0;
    if (p.vx === undefined) { p.vx = 0; p.vy = 0; }
    if (p.a === undefined) p.a = 1;
    p.fill = p.k === 'debris' ? p.c : `rgb(${p.c})`;
    this.items.push(p);
  }

  text(x, y, str, color, size, life = 1.1) {
    if (this.texts.length > 40) this.texts.shift();
    this.texts.push({ x, y, str, fill: `rgb(${color})`, size, life, age: 0, vy: -40 });
  }

  update(dt) {
    const arr = this.items;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.age += dt;
      if (p.age >= p.life) { arr[i] = arr[arr.length - 1]; arr.pop(); continue; }
      if (p.drag) {
        const f = Math.max(0, 1 - p.drag * dt);
        p.vx *= f; p.vy *= f;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vr) p.rot += p.vr * dt;
    }
    const tx = this.texts;
    for (let i = tx.length - 1; i >= 0; i--) {
      const t = tx[i];
      t.age += dt;
      if (t.age >= t.life) { tx.splice(i, 1); continue; }
      t.y += t.vy * dt;
      t.vy *= Math.max(0, 1 - 2.2 * dt);
    }
  }

  drawNormal(ctx) {
    for (const p of this.items) {
      if (p.k === 'smoke') {
        const t = p.age / p.life;
        ctx.globalAlpha = p.a * (1 - t) * (t < 0.12 ? t / 0.12 : 1);
        ctx.fillStyle = p.fill;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s * (1 + t * (p.grow || 0)), 0, TAU);
        ctx.fill();
      } else if (p.k === 'debris') {
        const t = p.age / p.life;
        ctx.globalAlpha = 1 - t * t;
        ctx.fillStyle = p.fill;
        const c = Math.cos(p.rot), s = Math.sin(p.rot), h = p.s;
        ctx.beginPath();
        ctx.moveTo(p.x + c * h, p.y + s * h);
        ctx.lineTo(p.x - s * h * 0.8, p.y + c * h * 0.8);
        ctx.lineTo(p.x - c * h * 0.9, p.y - s * h * 0.9);
        ctx.lineTo(p.x + s * h * 0.6, p.y - c * h * 0.6);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawAdditive(ctx) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const p of this.items) {
      const k = p.k;
      if (k === 'smoke' || k === 'debris') continue;
      const t = p.age / p.life;
      if (k === 'glow') {
        ctx.globalAlpha = p.a * (1 - t);
        const s = p.s * (1 + t * (p.grow || 0));
        ctx.drawImage(SpriteCache.glow(p.c), p.x - s, p.y - s, s * 2, s * 2);
      } else if (k === 'spark') {
        ctx.globalAlpha = p.a * (1 - t);
        ctx.strokeStyle = p.fill;
        ctx.lineWidth = p.s;
        const l = p.len || 0.04;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * l, p.y - p.vy * l);
        ctx.stroke();
      } else if (k === 'ring') {
        const e = 1 - (1 - t) * (1 - t) * (1 - t);
        ctx.globalAlpha = p.a * (1 - t);
        ctx.strokeStyle = p.fill;
        ctx.lineWidth = p.s * (1 - t) + 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * e, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  drawTexts(ctx) {
    if (!this.texts.length) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    let cur = '';
    for (const t of this.texts) {
      const k = t.age / t.life;
      const pop = t.age < 0.12 ? 0.6 + (t.age / 0.12) * 0.5 : t.age < 0.22 ? 1.1 - (t.age - 0.12) : 1;
      ctx.globalAlpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      // napis fontu budowany raz na rozmiar i ustawiany tylko przy zmianie (parsowanie ctx.font jest drogie)
      const px = Math.round(t.size * pop);
      let f = this.fonts.get(px);
      if (!f) { f = `700 ${px}px Orbitron, Oxanium, "Segoe UI", sans-serif`; this.fonts.set(px, f); }
      if (f !== cur) { ctx.font = f; cur = f; }
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(t.str, t.x, t.y);
      ctx.fillStyle = t.fill;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}

/* ---------- Grafika meteorytów (generowana raz, kilka wariantów na typ i rozmiar) ---------- */
const ART_PAL = {
  rock:     ['#a38a70', '#65523f', '#291f18'],
  fast:     ['#a6745c', '#61392a', '#22120c'],
  iron:     ['#d0d8e2', '#6e7987', '#232932'],
  volatile: ['#74503a', '#3e2519', '#150a05'],
  comet:    ['#f4fcff', '#a9d9f6', '#3c74a3'],
  ice:      ['#f4fcff', '#b8e3fa', '#5a90bb'],
  zig:      ['#e2c8ff', '#8a5cc8', '#2c1648'],
  cluster:  ['#9a7a86', '#5a3c4a', '#1e1016'],
  boss:     ['#8f6a54', '#4f362a', '#170e09'],
};

const MeteorArt = {
  cache: new Map(),
  clear() { this.cache.clear(); },
  get(type, r) {
    const key = type + '_' + Math.round(r * 2);
    let list = this.cache.get(key);
    if (!list) { list = []; this.cache.set(key, list); }
    const maxVariants = type === 'boss' ? 2 : 6;
    if (list.length < maxVariants) {
      const art = this.make(type, r);
      list.push(art);
      return art;
    }
    return pick(list);
  },

  make(type, r) {
    if (type === 'hunter' || type === 'bolt') return this.makeAlien(type, r);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pad = 4, half = r + pad, S = Math.ceil(half * 2 * dpr);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    g.scale(S / (half * 2), S / (half * 2));
    g.translate(half, half);
    const pal = ART_PAL[type] || ART_PAL.rock;

    const n = Math.max(9, Math.round(8 + r / 3));
    const rough = type === 'iron' ? 0.13 : (type === 'comet' || type === 'ice') ? 0.2 : 0.27;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (Math.random() - 0.5) * 0.4 * (TAU / n);
      const rr = r * (1 - rough + Math.random() * rough);
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    const path = new Path2D();
    const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
    path.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      path.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    path.closePath();

    const grd = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, -r * 0.1, -r * 0.1, r * 1.3);
    grd.addColorStop(0, pal[0]); grd.addColorStop(0.55, pal[1]); grd.addColorStop(1, pal[2]);
    g.fillStyle = grd;
    g.fill(path);

    g.save();
    g.clip(path);
    for (let k = 0; k < r * 3; k++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.14)';
      g.fillRect(rand(-r, r), rand(-r, r), rand(0.6, 2.2), rand(0.6, 2.2));
    }
    if (type !== 'comet' && type !== 'ice') {
      const cn = Math.round(r / 6) + 1;
      for (let k = 0; k < cn; k++) {
        const a = rand(0, TAU), d = rand(0, r * 0.65);
        const cx = Math.cos(a) * d, cy = Math.sin(a) * d, cr = rand(0.1, 0.26) * r;
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.beginPath(); g.arc(cx, cy, cr, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.13)';
        g.lineWidth = Math.max(0.7, cr * 0.18);
        g.beginPath(); g.arc(cx, cy, cr, -0.2 * Math.PI, 0.75 * Math.PI); g.stroke();
      }
    }
    if (type === 'volatile' || type === 'boss') {
      const cracks = type === 'boss' ? 9 : 4;
      g.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        g.strokeStyle = pass ? 'rgba(255,230,140,0.9)' : 'rgba(255,120,30,0.95)';
        g.shadowColor = '#ff6a10';
        g.shadowBlur = pass ? 2 : 8;
        g.lineWidth = Math.max(0.8, r * (pass ? 0.025 : 0.065));
        const rs = mulberry32(type.length * 97 + Math.round(r) + pass * 0);
        for (let k = 0; k < cracks; k++) {
          let a = (k / cracks) * TAU + rs() * 0.6, d = r * 0.12;
          let x = Math.cos(a) * d, y = Math.sin(a) * d;
          g.beginPath(); g.moveTo(x, y);
          for (let s = 0; s < 4; s++) {
            a += (rs() - 0.5) * 1.1;
            d += r * (0.15 + rs() * 0.12);
            x = Math.cos(a) * d; y = Math.sin(a) * d;
            g.lineTo(x, y);
          }
          g.stroke();
        }
      }
      g.shadowBlur = 0;
    }
    if (type === 'zig') {
      // kryształowe ściany
      g.strokeStyle = 'rgba(240,220,255,0.45)';
      g.lineWidth = 1;
      for (let k = 0; k < 5; k++) {
        const a = rand(0, TAU);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke();
      }
    }
    if (type === 'cluster') {
      // świecące zarodki odłamków
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * TAU + rand(-0.2, 0.2), d = r * rand(0.25, 0.6), cr = r * rand(0.1, 0.16);
        const gr = g.createRadialGradient(Math.cos(a) * d, Math.sin(a) * d, 0, Math.cos(a) * d, Math.sin(a) * d, cr * 1.8);
        gr.addColorStop(0, 'rgba(255,190,240,1)'); gr.addColorStop(0.45, 'rgba(255,80,200,0.8)'); gr.addColorStop(1, 'rgba(255,80,200,0)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, cr * 1.8, 0, TAU); g.fill();
      }
    }
    if (type === 'iron') {
      g.strokeStyle = 'rgba(255,255,255,0.2)';
      g.lineWidth = 1;
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        g.arc(rand(-r, r) * 0.3, rand(-r, r) * 0.3, rand(0.3, 0.9) * r, rand(0, TAU), rand(0, TAU));
        g.stroke();
      }
      const sp = g.createRadialGradient(-r * 0.4, -r * 0.45, 0, -r * 0.4, -r * 0.45, r * 0.5);
      sp.addColorStop(0, 'rgba(255,255,255,0.55)'); sp.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sp; g.fillRect(-r, -r, r * 2, r * 2);
    }
    if (type === 'comet' || type === 'ice') {
      const fr = g.createRadialGradient(-r * 0.3, -r * 0.3, 0, -r * 0.3, -r * 0.3, r * 0.8);
      fr.addColorStop(0, 'rgba(255,255,255,0.75)'); fr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = fr; g.fillRect(-r, -r, r * 2, r * 2);
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.lineWidth = 0.8;
      for (let k = 0; k < 6; k++) {
        const a = rand(0, TAU);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke();
      }
    }
    const sh = g.createLinearGradient(-r, -r, r, r);
    sh.addColorStop(0, 'rgba(255,255,255,0.10)');
    sh.addColorStop(0.5, 'rgba(0,0,0,0)');
    sh.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = sh;
    g.fillRect(-half, -half, half * 2, half * 2);
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.45)';
    g.lineWidth = 1.2;
    g.stroke(path);

    // Biała sylwetka do błysku trafienia
    const w = document.createElement('canvas');
    w.width = w.height = S;
    const wg = w.getContext('2d');
    wg.scale(S / (half * 2), S / (half * 2));
    wg.translate(half, half);
    wg.fillStyle = '#fff';
    wg.fill(path);

    return { canvas: c, white: w, half };
  },

  // Statek Łowcy (spodek) i jego pocisk plazmowy
  makeAlien(type, r) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const half = r * 1.5 + 4, S = Math.ceil(half * 2 * dpr);
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d');
      g.scale(S / (half * 2), S / (half * 2));
      g.translate(half, half);
      return [c, g];
    };
    const [c, g] = mk(), [w, wg] = mk();
    if (type === 'bolt') {
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.5);
      gr.addColorStop(0, '#f4fff0'); gr.addColorStop(0.35, '#8dff9a'); gr.addColorStop(1, 'rgba(60,255,110,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 1.5, 0, TAU); g.fill();
      wg.fillStyle = '#fff'; wg.beginPath(); wg.arc(0, 0, r, 0, TAU); wg.fill();
      return { canvas: c, white: w, half };
    }
    const hull = new Path2D();
    hull.ellipse(0, 0, r * 1.35, r * 0.62, 0, 0, TAU);
    const hg = g.createLinearGradient(0, -r, 0, r);
    hg.addColorStop(0, '#b9c7d4'); hg.addColorStop(0.5, '#5b6b7a'); hg.addColorStop(1, '#1d2730');
    g.fillStyle = hg; g.fill(hull);
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.2; g.stroke(hull);
    // kopuła
    const dome = g.createRadialGradient(-r * 0.15, -r * 0.55, 0, 0, -r * 0.3, r * 0.75);
    dome.addColorStop(0, '#eaffef'); dome.addColorStop(0.4, '#6cff8a'); dome.addColorStop(1, '#0f5a2a');
    g.fillStyle = dome;
    g.beginPath(); g.ellipse(0, -r * 0.25, r * 0.6, r * 0.5, 0, Math.PI, TAU); g.fill();
    // światła wokół kadłuba
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * TAU;
      g.fillStyle = k % 2 ? '#8dff9a' : '#ffe27a';
      g.beginPath(); g.arc(Math.cos(a) * r * 1.05, Math.sin(a) * r * 0.42, r * 0.11, 0, TAU); g.fill();
    }
    wg.fillStyle = '#fff'; wg.fill(hull);
    wg.beginPath(); wg.ellipse(0, -r * 0.25, r * 0.6, r * 0.5, 0, Math.PI, TAU); wg.fill();
    return { canvas: c, white: w, half };
  },
};

/* Kontener z bronią – grafika generowana raz na rozmiar */
const CrateArt = {
  cache: new Map(),
  get(s) {
    const key = Math.round(s * 100);
    let c = this.cache.get(key);
    if (c) return c;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = 46 * s, H = 30 * s, pad = 4;
    c = document.createElement('canvas');
    c.width = Math.ceil((W + pad * 2) * dpr); c.height = Math.ceil((H + pad * 2) * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr); g.translate(pad, pad);
    const body = g.createLinearGradient(0, 0, 0, H);
    body.addColorStop(0, '#c9b48a'); body.addColorStop(0.5, '#7d6a48'); body.addColorStop(1, '#3a3022');
    g.fillStyle = body;
    g.beginPath(); g.roundRect(0, 0, W, H, 4 * s); g.fill();
    // ostrzegawcze pasy
    g.save();
    g.beginPath(); g.rect(0, H * 0.36, W, H * 0.28); g.clip();
    for (let x = -H; x < W + H; x += 9 * s) {
      g.fillStyle = '#ffcf3a';
      g.beginPath(); g.moveTo(x, H * 0.64); g.lineTo(x + 4.5 * s, H * 0.64); g.lineTo(x + 4.5 * s + H * 0.28, H * 0.36); g.lineTo(x + H * 0.28, H * 0.36); g.fill();
    }
    g.restore();
    g.strokeStyle = 'rgba(30,22,10,0.9)'; g.lineWidth = 1.4;
    g.beginPath(); g.roundRect(0, 0, W, H, 4 * s); g.stroke();
    g.strokeStyle = 'rgba(255,240,200,0.35)'; g.lineWidth = 1;
    for (const x of [W * 0.2, W * 0.8]) { g.beginPath(); g.moveTo(x, 2); g.lineTo(x, H - 2); g.stroke(); }
    c.w = W; c.h = H; c.pad = pad;
    this.cache.set(key, c);
    return c;
  },
};

/* Ikony broni z kontenerów */
function drawWeaponIcon(ctx, id, s) {
  ctx.beginPath();
  if (id === 'laser') {
    ctx.moveTo(-s, s); ctx.lineTo(s, -s); ctx.stroke();
    ctx.beginPath(); ctx.arc(s * 0.6, -s * 0.6, s * 0.3, 0, TAU); ctx.fill();
  } else if (id === 'rockets') {
    ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.55, -s * 0.2, s * 0.35, s * 0.55); ctx.lineTo(-s * 0.35, s * 0.55);
    ctx.quadraticCurveTo(-s * 0.55, -s * 0.2, 0, -s); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-s * 0.35, s * 0.3); ctx.lineTo(-s * 0.7, s); ctx.moveTo(s * 0.35, s * 0.3); ctx.lineTo(s * 0.7, s); ctx.stroke();
  } else {
    ctx.moveTo(s * 0.25, -s); ctx.lineTo(-s * 0.5, s * 0.1); ctx.lineTo(0, s * 0.1); ctx.lineTo(-s * 0.25, s);
    ctx.lineTo(s * 0.5, -s * 0.1); ctx.lineTo(0, -s * 0.1); ctx.closePath(); ctx.fill();
  }
}

/* Ikony bonusów rysowane wektorowo na canvasie */
function drawPowerIcon(ctx, type, s) {
  ctx.beginPath();
  switch (type) {
    case 'rapid':
      ctx.moveTo(s * 0.2, -s); ctx.lineTo(-s * 0.55, s * 0.12); ctx.lineTo(-s * 0.02, s * 0.12);
      ctx.lineTo(-s * 0.2, s); ctx.lineTo(s * 0.55, -s * 0.15); ctx.lineTo(s * 0.04, -s * 0.15);
      ctx.closePath(); ctx.fill();
      break;
    case 'spread':
      for (const a of [-0.55, 0, 0.55]) {
        ctx.moveTo(0, s * 0.85);
        ctx.lineTo(Math.sin(a) * s, -Math.cos(a) * s * 0.85);
      }
      ctx.stroke();
      break;
    case 'slow':
      ctx.moveTo(-s * 0.6, -s * 0.9); ctx.lineTo(s * 0.6, -s * 0.9); ctx.lineTo(-s * 0.6, s * 0.9);
      ctx.lineTo(s * 0.6, s * 0.9); ctx.closePath(); ctx.stroke();
      break;
    case 'shield':
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, -s * 0.62); ctx.lineTo(s * 0.72, s * 0.25);
      ctx.quadraticCurveTo(s * 0.45, s * 0.78, 0, s); ctx.quadraticCurveTo(-s * 0.45, s * 0.78, -s * 0.72, s * 0.25);
      ctx.lineTo(-s * 0.8, -s * 0.62); ctx.closePath(); ctx.stroke();
      break;
    case 'nuke':
      ctx.arc(0, 0, s * 0.2, 0, TAU); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a = i * TAU / 3 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(0, 0, s, a - 0.5, a + 0.5);
        ctx.arc(0, 0, s * 0.36, a + 0.5, a - 0.5, true);
        ctx.closePath(); ctx.fill();
      }
      break;
    case 'repair':
      ctx.fillRect(-s * 0.24, -s * 0.85, s * 0.48, s * 1.7);
      ctx.fillRect(-s * 0.85, -s * 0.24, s * 1.7, s * 0.48);
      break;
    case 'over':
      ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, -s * 0.62); ctx.lineTo(s * 0.72, s * 0.25);
      ctx.quadraticCurveTo(s * 0.45, s * 0.78, 0, s); ctx.quadraticCurveTo(-s * 0.45, s * 0.78, -s * 0.72, s * 0.25);
      ctx.lineTo(-s * 0.8, -s * 0.62); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -s * 0.45); ctx.lineTo(0, s * 0.45); ctx.moveTo(-s * 0.4, 0); ctx.lineTo(s * 0.4, 0); ctx.stroke();
      break;
    case 'support':
      ctx.strokeRect(-s * 0.3, -s * 0.3, s * 0.6, s * 0.6);
      ctx.strokeRect(-s, -s * 0.22, s * 0.5, s * 0.44);
      ctx.strokeRect(s * 0.5, -s * 0.22, s * 0.5, s * 0.44);
      break;
    case 'gold':
      ctx.arc(0, 0, s * 0.85, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, s * 0.4, 0.6, TAU - 0.6); ctx.stroke();
      break;
  }
}
