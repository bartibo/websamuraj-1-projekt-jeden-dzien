'use strict';
/* Cząsteczki i efekty: iskry trafień, kurz, krople, liście, para, napisy. Współrzędne świata, y w dół. */

class FX {
  constructor() { this.p = []; this.front = []; }
  clear() { this.p.length = 0; this.front.length = 0; }

  add(o, front) {
    const q = Object.assign({ life: 30, t: 0, vx: 0, vy: 0, g: 0, drag: 1, size: 4, grow: 0, rot: 0, vr: 0,
      color: '#ffffff', type: 'dust', alpha: 1 }, o);
    (front ? this.front : this.p).push(q);
    return q;
  }

  hitSpark(x, y, lvl, dir, palette) {
    const big = lvl === 'H' || lvl === 'S';
    const cols = palette || (lvl === 'S' ? ['#ffffff', '#7ff6ff', '#ff7ad9'] : big ? ['#ffffff', '#ffd25a', '#ff8a2a'] : ['#ffffff', '#fff1a8', '#ffd25a']);
    this.add({ type: 'flash', x, y, size: big ? 40 : 24, grow: big ? 5 : 3, life: big ? 10 : 7, color: cols[1] }, true);
    this.add({ type: 'star', x, y, size: big ? 46 : 30, life: big ? 12 : 8, rot: rand(0, 1), color: cols[0], color2: cols[2] }, true);
    const n = big ? 16 : 9;
    for (let i = 0; i < n; i++) {
      const a = (dir > 0 ? 0 : Math.PI) + rand(-1.3, 1.3);
      const s = rand(5, big ? 17 : 11);
      this.add({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.86, life: randInt(8, 16), size: rand(2, 4), color: pick(cols) }, true);
    }
    if (big) this.add({ type: 'ring', x, y, size: 20, grow: 9, life: 14, color: cols[1] }, true);
  }

  blockSpark(x, y, dir) {
    this.add({ type: 'flash', x, y, size: 20, grow: 2, life: 6, color: '#8fd8ff' }, true);
    for (let i = 0; i < 8; i++) {
      const a = (dir > 0 ? Math.PI : 0) + rand(-1.1, 1.1);
      const s = rand(3, 9);
      this.add({ type: 'shard', x, y, vx: -Math.cos(a) * s, vy: Math.sin(a) * s - 2, g: 0.3, drag: 0.92, life: randInt(10, 18), size: rand(4, 7), rot: rand(0, TAU), vr: rand(-0.3, 0.3), color: pick(['#bfefff', '#6fc8ff', '#ffffff']) }, true);
    }
    this.add({ type: 'hex', x, y, size: 34, life: 10, color: '#8fd8ff', dir }, true);
  }

  dust(x, y, n = 6, dir = 0, color = '#c9b08a') {
    for (let i = 0; i < n; i++) {
      this.add({ type: 'dust', x: x + rand(-14, 14), y: y - rand(0, 6), vx: dir * rand(1, 3) + rand(-1.6, 1.6), vy: -rand(0.3, 1.6),
        drag: 0.93, life: randInt(18, 32), size: rand(6, 12), grow: 0.5, color, alpha: 0.55 });
    }
  }

  splash(x, y, n = 14, power = 1, color = '#8fdcff') {
    for (let i = 0; i < n; i++) {
      this.add({ type: 'drop', x: x + rand(-10, 10), y, vx: rand(-4, 4) * power, vy: -rand(4, 11) * power, g: 0.45,
        life: randInt(22, 40), size: rand(3, 6), color: pick([color, '#ffffff', '#5ab8f0']) }, true);
    }
  }

  juice(x, y, n = 10, dir = 1) {
    for (let i = 0; i < n; i++) {
      this.add({ type: 'drop', x, y, vx: dir * rand(1, 6) + rand(-2, 2), vy: -rand(2, 8), g: 0.4,
        life: randInt(18, 32), size: rand(2.5, 5), color: pick(['#ff9f1c', '#ffbf47', '#ffe08a']) }, true);
    }
  }

  leaves(x, y, n = 10, spread = 6) {
    for (let i = 0; i < n; i++) {
      this.add({ type: 'leaf', x: x + rand(-20, 20), y: y + rand(-30, 30), vx: rand(-spread, spread), vy: rand(-spread, spread * 0.4), g: 0.08,
        drag: 0.95, life: randInt(30, 60), size: rand(6, 10), rot: rand(0, TAU), vr: rand(-0.25, 0.25), color: pick(['#5fbf4a', '#3e9a3a', '#8fd65a']) }, true);
    }
  }

  steam(x, y, n = 3, spread = 30) {
    for (let i = 0; i < n; i++) {
      this.add({ type: 'steam', x: x + rand(-spread, spread), y, vx: rand(-0.4, 0.4), vy: -rand(0.6, 1.6), drag: 0.99,
        life: randInt(40, 80), size: rand(10, 20), grow: 0.35, color: '#ffffff', alpha: 0.32 });
    }
  }

  stars(x, y, n = 8, color = '#ffe66d') {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(2, 7);
      this.add({ type: 'tstar', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.92, life: randInt(20, 40), size: rand(4, 8), rot: rand(0, TAU), vr: 0.2, color }, true);
    }
  }

  hearts(x, y, n = 5) {
    for (let i = 0; i < n; i++) {
      this.add({ type: 'heart', x: x + rand(-40, 40), y: y + rand(-20, 20), vx: rand(-0.6, 0.6), vy: -rand(0.8, 2), life: randInt(50, 90), size: rand(7, 13), color: pick(['#ff5d8f', '#ff8fb3', '#ff3d6e']) }, true);
    }
  }

  // napisy w tym samym miejscu (np. PRZERYWNIK! i KONTRA!) układają się w stos zamiast nachodzić na siebie
  text(x, y, str, color = '#fff', size = 26) {
    const near = this.front.filter(q => q.type === 'txt' && q.t < q.life && Math.abs(q.x - x) < 220 && Math.abs(q.y - y) < 60).length;
    this.add({ type: 'txt', x, y: y - near * (size + 8), vy: -1.4, drag: 0.95, life: 50, str, size, color }, true);
  }

  shock(x, y, color = '#fff2c4') {
    this.add({ type: 'ring', x, y, size: 10, grow: 12, life: 18, color, flat: 0.28 }, true);
    this.add({ type: 'ring', x, y, size: 10, grow: 7, life: 22, color, flat: 0.28 });
  }

  update() {
    for (const arr of [this.p, this.front]) {
      for (let i = arr.length - 1; i >= 0; i--) {
        const q = arr[i];
        q.t++;
        q.vx *= q.drag; q.vy *= q.drag;
        q.vy += q.g;
        q.x += q.vx; q.y += q.vy;
        q.rot += q.vr;
        q.size += q.grow;
        if (q.type === 'leaf') q.x += Math.sin(q.t * 0.15) * 0.8;
        if (q.t >= q.life) arr.splice(i, 1);
      }
    }
  }

  draw(ctx, front) {
    const arr = front ? this.front : this.p;
    for (const q of arr) {
      const k = 1 - q.t / q.life;
      ctx.globalAlpha = q.alpha * (q.type === 'txt' ? Math.min(1, k * 3) : k);
      switch (q.type) {
        case 'flash': {
          const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.size);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, q.color); g.addColorStop(1, rgba(q.color, 0));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill();
          break;
        }
        case 'star': {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
          const s = q.size * (0.6 + 0.6 * (1 - k));
          ctx.beginPath();
          for (let i = 0; i < 16; i++) {
            const r = i % 2 ? s * 0.32 : s * (i % 4 === 0 ? 1 : 0.7);
            const a = i / 16 * TAU;
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fillStyle = q.color; ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = q.color2; ctx.stroke();
          ctx.restore();
          break;
        }
        case 'spark':
          ctx.strokeStyle = q.color; ctx.lineWidth = q.size; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 2.2, q.y - q.vy * 2.2); ctx.stroke();
          break;
        case 'ring':
          ctx.strokeStyle = q.color; ctx.lineWidth = 4 * k + 1;
          ctx.beginPath(); ctx.ellipse(q.x, q.y, q.size, q.size * (q.flat || 1), 0, 0, TAU); ctx.stroke();
          break;
        case 'hex': {
          ctx.save(); ctx.translate(q.x, q.y); ctx.scale(0.5, 1);
          ctx.strokeStyle = q.color; ctx.lineWidth = 4;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.lineTo(Math.cos(a) * q.size, Math.sin(a) * q.size); }
          ctx.closePath(); ctx.stroke();
          ctx.fillStyle = rgba(q.color, 0.2); ctx.fill();
          ctx.restore();
          break;
        }
        case 'shard':
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
          ctx.fillStyle = q.color;
          ctx.beginPath(); ctx.moveTo(0, -q.size); ctx.lineTo(q.size * 0.5, 0); ctx.lineTo(0, q.size); ctx.lineTo(-q.size * 0.5, 0); ctx.fill();
          ctx.restore();
          break;
        case 'dust': case 'steam':
          ctx.fillStyle = q.color;
          ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill();
          break;
        case 'drop':
          ctx.fillStyle = q.color;
          ctx.beginPath(); ctx.ellipse(q.x, q.y, q.size * 0.8, q.size * 1.1, Math.atan2(q.vy, q.vx) + Math.PI / 2, 0, TAU); ctx.fill();
          break;
        case 'leaf':
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
          ctx.fillStyle = q.color;
          ctx.beginPath(); ctx.ellipse(0, 0, q.size, q.size * 0.45, 0, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(20,60,20,0.6)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-q.size, 0); ctx.lineTo(q.size, 0); ctx.stroke();
          ctx.restore();
          break;
        case 'tstar':
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
          drawStar(ctx, 0, 0, q.size, q.color);
          ctx.restore();
          break;
        case 'heart':
          drawHeart(ctx, q.x, q.y, q.size, q.color);
          break;
        case 'slash': {
          const w = q.size * k;
          ctx.lineCap = 'round';
          ctx.strokeStyle = rgba(q.color, 0.35); ctx.lineWidth = w * 2.4;
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x2, q.y2); ctx.stroke();
          ctx.strokeStyle = q.color; ctx.lineWidth = w;
          ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x2, q.y2); ctx.stroke();
          break;
        }
        case 'txt':
          ctx.font = `${q.size}px 'Titan One', 'Arial Black', sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 6; ctx.strokeStyle = '#1b0f08'; ctx.lineJoin = 'round';
          ctx.strokeText(q.str, q.x, q.y);
          ctx.fillStyle = q.color; ctx.fillText(q.str, q.x, q.y);
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}

function drawStar(ctx, x, y, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = i / 10 * TAU - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
}

function drawHeart(ctx, x, y, s, color) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.4, y, x - s * 0.8, y - s * 1.1, x, y - s * 0.35);
  ctx.bezierCurveTo(x + s * 0.8, y - s * 1.1, x + s * 1.4, y, x, y + s * 0.9);
  ctx.fillStyle = color; ctx.fill();
}
