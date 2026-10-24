'use strict';
/* Areny: niebo, warstwy z paralaksą (rysowane raz do bufora), widzowie-kapibary i pogoda. */

const STAGE_W = 2000;
const GROUND_SY = 668;
const LAYER_TOP = -980, LAYER_H = 1120;

// Widz: kapibara w tle, która kibicuje po mocnych ciosach
// przygaszone, szarawe futro: kibic stojący na wysokości głów walczących nie zlewa się z nimi
const SPECTATOR_LOOK = lookOf({ fur: '#75604b', furDark: '#57473a', belly: '#958069', paw: '#3a2c22', nose: '#3a2c22' });

function spectatorLook(extra) { return Object.assign({}, SPECTATOR_LOOK, extra); }

function hillPath(ctx, rng, x0, x1, base, amp, step) {
  ctx.beginPath();
  ctx.moveTo(x0, 200);
  let y = base;
  for (let x = x0; x <= x1 + step; x += step) {
    y = base - amp * (0.5 + 0.5 * Math.sin(x * 0.004 + rng() * 0.6)) - rng() * amp * 0.3;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(x1, 200);
  ctx.closePath();
}

function drawPalm(ctx, x, y, h, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20, y - h * 0.5, x + 10, y - h); ctx.stroke();
  ctx.fillStyle = col;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.5;
    ctx.beginPath();
    ctx.moveTo(x + 10, y - h);
    ctx.quadraticCurveTo(x + 10 + Math.cos(a) * 60, y - h + Math.sin(a) * 40 - 20, x + 10 + Math.cos(a) * 95, y - h + Math.sin(a) * 30 + 30);
    ctx.quadraticCurveTo(x + 10 + Math.cos(a) * 50, y - h + Math.sin(a) * 30, x + 10, y - h);
    ctx.fill();
  }
}

function drawAcacia(ctx, x, y, h, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y - h * 0.6); ctx.lineTo(x - 30, y - h * 0.9);
  ctx.moveTo(x - 6, y - h * 0.6); ctx.lineTo(x + 30, y - h * 0.92); ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(x, y - h, 110, 26, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - 40, y - h + 6, 60, 18, 0, 0, TAU); ctx.fill();
}

function drawBamboo(ctx, x, y, h, w, col, rng) {
  ctx.fillStyle = col;
  ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = shade(col, -0.25);
  for (let s = y - 60 - rng() * 40; s > y - h; s -= 70 + rng() * 30) ctx.fillRect(x - w / 2 - 1, s, w + 2, 4);
  ctx.fillStyle = shade(col, 0.15);
  ctx.fillRect(x - w / 2 + w * 0.2, y - h, w * 0.15, h);
  ctx.fillStyle = shade(col, 0.05);
  for (let i = 0; i < 5; i++) {
    const ly = y - h * (0.3 + rng() * 0.7), dir = rng() < 0.5 ? -1 : 1;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath(); ctx.ellipse(x + dir * (16 + k * 10), ly + k * 6, 18, 4, dir * (0.4 + k * 0.2), 0, TAU); ctx.fill();
    }
  }
}

const STAGES = [
  {
    id: 'pantanal', name: 'Bagna Pantanalu', sub: 'Brazylia, zachód słońca', music: 'pantanal',
    sky(ctx, t) {
      const g = ctx.createLinearGradient(0, 0, 0, GROUND_SY);
      g.addColorStop(0, '#2b1b4a'); g.addColorStop(0.45, '#c2507a'); g.addColorStop(0.75, '#ff8a5c'); g.addColorStop(1, '#ffd08a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      const sx = VW * 0.6, sy = 420;
      const sg = ctx.createRadialGradient(sx, sy, 20, sx, sy, 260);
      sg.addColorStop(0, 'rgba(255,240,180,0.9)'); sg.addColorStop(0.3, 'rgba(255,190,110,0.4)'); sg.addColorStop(1, 'rgba(255,140,80,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#fff1c4'; ctx.beginPath(); ctx.arc(sx, sy, 70, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 380 + t * 0.15) % (VW + 400)) - 200;
        ctx.beginPath(); ctx.ellipse(cx, 160 + i * 40, 140, 16, 0, 0, TAU); ctx.fill();
      }
    },
    layers: [
      { f: 0.12, draw(ctx, rng, x0, x1) {
        ctx.fillStyle = '#7a3f6e'; hillPath(ctx, rng, x0, x1, -150, 120, 40); ctx.fill();
        ctx.fillStyle = '#5e2f5a'; hillPath(ctx, rng, x0, x1, -110, 70, 30); ctx.fill();
      } },
      { f: 0.3, draw(ctx, rng, x0, x1) {
        ctx.fillStyle = '#3d1f3c'; ctx.fillRect(x0, -120, x1 - x0, 300);
        for (let x = x0; x < x1; x += 120 + rng() * 160) {
          if (rng() < 0.5) drawPalm(ctx, x, -100, 150 + rng() * 60, '#2a1430');
          else drawAcacia(ctx, x, -100, 110 + rng() * 40, '#2a1430');
        }
        ctx.fillStyle = '#2a1430'; hillPath(ctx, rng, x0, x1, -96, 14, 20); ctx.fill();
      } },
      { f: 0.55, draw(ctx, rng, x0, x1) {
        const g = ctx.createLinearGradient(0, -110, 0, 0);
        g.addColorStop(0, '#ffb07a'); g.addColorStop(0.4, '#c86a6a'); g.addColorStop(1, '#5a3456');
        ctx.fillStyle = g; ctx.fillRect(x0, -110, x1 - x0, 300);
        ctx.fillStyle = 'rgba(255,230,180,0.5)';
        for (let i = 0; i < 160; i++) ctx.fillRect(x0 + rng() * (x1 - x0), -100 + rng() * 90, 20 + rng() * 60, 2);
        ctx.fillStyle = '#3b2a1e';
        for (let x = x0; x < x1; x += 30) ctx.fillRect(x, -112 - rng() * 6, 30, 8);
      } },
      { f: 1, draw(ctx, rng, x0, x1) {
        const g = ctx.createLinearGradient(0, 0, 0, 120);
        g.addColorStop(0, '#6e5232'); g.addColorStop(1, '#3d2a18');
        ctx.fillStyle = g; ctx.fillRect(x0, 0, x1 - x0, 140);
        ctx.fillStyle = '#5b8a3a'; ctx.fillRect(x0, -4, x1 - x0, 10);
        for (let x = x0; x < x1; x += 6) {
          const h = 6 + rng() * 14;
          ctx.fillStyle = rng() < 0.5 ? '#6fa043' : '#4f7d2e';
          ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x + 3, -h); ctx.lineTo(x + 6, 2); ctx.fill();
        }
        for (let i = 0; i < 90; i++) {
          ctx.fillStyle = rgba('#2a1a0e', 0.3 + rng() * 0.3);
          ctx.beginPath(); ctx.ellipse(x0 + rng() * (x1 - x0), 20 + rng() * 100, 4 + rng() * 14, 2 + rng() * 4, 0, 0, TAU); ctx.fill();
        }
        for (let i = 0; i < 30; i++) {
          ctx.fillStyle = 'rgba(140,200,255,0.25)';
          ctx.beginPath(); ctx.ellipse(x0 + rng() * (x1 - x0), 30 + rng() * 80, 20 + rng() * 40, 4 + rng() * 5, 0, 0, TAU); ctx.fill();
        }
      } },
    ],
    spectators: [
      { x: 300, f: 0.55, y: -110, s: 0.42, look: {}, deco: 'bird' },
      { x: 560, f: 0.55, y: -110, s: 0.38, look: {}, deco: null },
      { x: 900, f: 0.55, y: -110, s: 0.45, look: {}, deco: 'orange' },
      { x: 1180, f: 0.55, y: -110, s: 0.4, look: {}, deco: 'bird' },
      { x: 1420, f: 0.55, y: -110, s: 0.36, look: {}, deco: null },
    ],
    dyn(ctx, li, t, g) {
      if (li !== 2) return;
      // kajman w rzece
      const cx = 760 + Math.sin(t * 0.004) * 200, cy = -55;
      ctx.fillStyle = '#2f3b22';
      ctx.beginPath(); ctx.ellipse(cx, cy, 46, 7, 0, Math.PI, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 30, cy - 6, 5, 0, TAU); ctx.arc(cx + 18, cy - 6, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath(); ctx.arc(cx + 30, cy - 7, 2, 0, TAU); ctx.arc(cx + 18, cy - 7, 2, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,240,210,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(cx, cy + 2, 60 + Math.sin(t * 0.1) * 6, 6, 0, 0, TAU); ctx.stroke();
    },
    weather(g, fx, t, cam) {
      if (t % 200 === 0) g.stage.flyers.push({ x: cam.x - 900, y: -rand(380, 520), vx: rand(2, 3.2), t: 0 });
    },
    front(ctx, t, cam) {
      ctx.fillStyle = '#1d2b14';
      for (let i = 0; i < 26; i++) {
        const x = i * 54 - ((cam.x * 1.25) % 54), side = i < 6 || i > 19;
        if (!side) continue;
        const sway = Math.sin(t * 0.03 + i) * 8;
        ctx.beginPath(); ctx.moveTo(x, VH); ctx.quadraticCurveTo(x + sway, VH - 80, x + sway * 2 + 6, VH - 150 - (i % 3) * 30); ctx.lineTo(x + 12, VH); ctx.fill();
      }
    },
  },
  {
    id: 'onsen', name: 'Gorące Źródła Yuzu', sub: 'Japonia, zimowa noc', music: 'onsen',
    sky(ctx, t) {
      const g = ctx.createLinearGradient(0, 0, 0, GROUND_SY);
      g.addColorStop(0, '#060c24'); g.addColorStop(0.6, '#1c2c56'); g.addColorStop(1, '#3a4f7e');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      const r = mulberry32(7);
      for (let i = 0; i < 120; i++) {
        const tw = 0.5 + 0.5 * Math.sin(t * 0.05 + i * 1.7);
        ctx.fillStyle = `rgba(255,255,255,${0.3 + tw * 0.6})`;
        ctx.fillRect(r() * VW, r() * 380, 2, 2);
      }
      const mx = VW * 0.78, my = 140;
      const mg = ctx.createRadialGradient(mx, my, 30, mx, my, 200);
      mg.addColorStop(0, 'rgba(255,250,220,0.5)'); mg.addColorStop(1, 'rgba(255,250,220,0)');
      ctx.fillStyle = mg; ctx.fillRect(mx - 200, my - 200, 400, 400);
      ctx.fillStyle = '#fffbe6'; ctx.beginPath(); ctx.arc(mx, my, 54, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(200,190,160,0.4)';
      ctx.beginPath(); ctx.arc(mx - 16, my - 10, 10, 0, TAU); ctx.arc(mx + 14, my + 16, 7, 0, TAU); ctx.fill();
    },
    layers: [
      { f: 0.1, draw(ctx, rng, x0, x1) {
        ctx.fillStyle = '#2c3b66'; hillPath(ctx, rng, x0, x1, -230, 200, 60); ctx.fill();
        ctx.save(); ctx.clip();
        ctx.fillStyle = '#e8eefc';
        for (let x = x0; x < x1; x += 160) { ctx.beginPath(); ctx.moveTo(x - 80, -330); ctx.lineTo(x, -460); ctx.lineTo(x + 80, -330); ctx.fill(); }
        ctx.restore();
        ctx.fillStyle = '#1e2a4e'; hillPath(ctx, rng, x0, x1, -160, 80, 40); ctx.fill();
      } },
      { f: 0.32, draw(ctx, rng, x0, x1) {
        for (let x = x0 + 100; x < x1; x += 520) {
          const w = 380, y = -150;
          ctx.fillStyle = '#3b2a26'; ctx.fillRect(x, y - 150, w, 160);
          ctx.fillStyle = '#20263a';
          ctx.beginPath(); ctx.moveTo(x - 40, y - 140); ctx.quadraticCurveTo(x + w / 2, y - 230, x + w + 40, y - 140); ctx.lineTo(x + w + 10, y - 170); ctx.quadraticCurveTo(x + w / 2, y - 250, x - 10, y - 170); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#eef3ff'; ctx.fillRect(x - 30, y - 178, w + 60, 8);
          for (let i = 0; i < 5; i++) {
            ctx.fillStyle = '#ffcf7a'; ctx.fillRect(x + 20 + i * 72, y - 120, 52, 70);
            ctx.strokeStyle = '#3b2a26'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x + 46 + i * 72, y - 120); ctx.lineTo(x + 46 + i * 72, y - 50); ctx.moveTo(x + 20 + i * 72, y - 85); ctx.lineTo(x + 72 + i * 72, y - 85); ctx.stroke();
          }
        }
        ctx.fillStyle = '#141b30'; ctx.fillRect(x0, -150, x1 - x0, 300);
        for (let x = x0; x < x1; x += 12) { ctx.fillStyle = '#5a4030'; ctx.fillRect(x, -190, 9, 46); }
      } },
      { f: 0.6, draw(ctx, rng, x0, x1) {
        ctx.fillStyle = '#2a3348'; ctx.fillRect(x0, -120, x1 - x0, 200);
        const g = ctx.createLinearGradient(0, -100, 0, -20);
        g.addColorStop(0, '#5fa6c8'); g.addColorStop(1, '#2b5f86');
        ctx.fillStyle = g; ctx.fillRect(x0, -100, x1 - x0, 80);
        for (let x = x0; x < x1; x += 28 + rng() * 22) {
          ctx.fillStyle = rng() < 0.5 ? '#59627a' : '#6c768f';
          ctx.beginPath(); ctx.ellipse(x, -102, 20 + rng() * 10, 12 + rng() * 5, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = '#f0f4ff'; ctx.beginPath(); ctx.ellipse(x - 4, -110, 12, 4, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = rng() < 0.5 ? '#59627a' : '#4a5268';
          ctx.beginPath(); ctx.ellipse(x, -18, 22, 12, 0, 0, TAU); ctx.fill();
        }
      } },
      { f: 1, draw(ctx, rng, x0, x1) {
        ctx.fillStyle = '#4a5068'; ctx.fillRect(x0, 0, x1 - x0, 140);
        for (let y = 0; y < 140; y += 34) {
          for (let x = x0 + (y / 34 % 2) * 40; x < x1; x += 80) {
            ctx.fillStyle = rng() < 0.5 ? '#5a6280' : '#525a76';
            ctx.fillRect(x + 2, y + 2, 76, 30);
          }
        }
        ctx.fillStyle = 'rgba(240,245,255,0.85)';
        for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.ellipse(x0 + rng() * (x1 - x0), 4 + rng() * 120, 20 + rng() * 40, 4 + rng() * 6, 0, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#e8eefc'; ctx.fillRect(x0, -3, x1 - x0, 7);
      } },
    ],
    spectators: [
      { x: 360, f: 0.6, y: -40, s: 0.42, look: { blush: '#ff8fa3' }, deco: 'yuzu', bath: true },
      { x: 640, f: 0.6, y: -40, s: 0.4, look: {}, deco: 'towel', bath: true },
      { x: 980, f: 0.6, y: -40, s: 0.46, look: {}, deco: 'yuzu', bath: true },
      { x: 1260, f: 0.6, y: -40, s: 0.4, look: { blush: '#ff8fa3' }, deco: 'towel', bath: true },
    ],
    dyn(ctx, li, t, g) {
      if (li === 1) {
        for (let i = 0; i < 6; i++) {
          const x = 120 + i * 260, y = -205, fl = 0.85 + Math.sin(t * 0.13 + i * 2) * 0.15;
          const lg = ctx.createRadialGradient(x, y, 2, x, y, 60);
          lg.addColorStop(0, `rgba(255,170,90,${0.55 * fl})`); lg.addColorStop(1, 'rgba(255,170,90,0)');
          ctx.fillStyle = lg; ctx.fillRect(x - 60, y - 60, 120, 120);
          ctx.fillStyle = '#e8462e'; ctx.beginPath(); ctx.ellipse(x, y, 13, 18, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = `rgba(255,220,120,${fl})`; ctx.beginPath(); ctx.ellipse(x, y, 7, 12, 0, 0, TAU); ctx.fill();
        }
      }
      if (li === 2 && g && t % 6 === 0) g.stage.steamQ.push({ x: rand(-200, 1500), y: -60, life: 0, s: rand(14, 30) });
    },
    weather(g, fx, t, cam) {
      for (let i = 0; i < 2; i++) g.stage.snow.push({ x: rand(-50, VW + 50), y: -10, vx: rand(-0.4, 0.4), vy: rand(0.8, 1.8), s: rand(1.5, 3.5), ph: rand(0, TAU) });
    },
    front(ctx, t, cam) {
      ctx.fillStyle = '#3b2a20';
      for (let i = 0; i < 3; i++) {
        const x = -60 + i * 26 - (cam.x * 0.25 % 26);
        ctx.fillRect(x, VH - 230, 16, 230);
      }
      ctx.fillStyle = '#e8eefc'; ctx.fillRect(-80, VH - 236, 140, 8);
    },
  },
  {
    id: 'dojo', name: 'Dojo w Bambusach', sub: 'Góry, letnie popołudnie', music: 'dojo',
    sky(ctx, t) {
      const g = ctx.createLinearGradient(0, 0, 0, GROUND_SY);
      g.addColorStop(0, '#7cc6f0'); g.addColorStop(0.7, '#c9ecff'); g.addColorStop(1, '#f2fbff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 330 + t * 0.2) % (VW + 400)) - 200, cy = 90 + (i % 3) * 50;
        ctx.beginPath(); ctx.ellipse(cx, cy, 90, 26, 0, 0, TAU); ctx.ellipse(cx + 50, cy - 14, 50, 22, 0, 0, TAU); ctx.fill();
      }
    },
    layers: [
      { f: 0.1, draw(ctx, rng, x0, x1) {
        ctx.fillStyle = '#a9cfe0'; hillPath(ctx, rng, x0, x1, -260, 220, 50); ctx.fill();
        ctx.fillStyle = '#8fbcc9'; hillPath(ctx, rng, x0, x1, -200, 120, 40); ctx.fill();
      } },
      { f: 0.25, draw(ctx, rng, x0, x1) {
        for (let x = x0; x < x1; x += 26 + rng() * 30) drawBamboo(ctx, x, -120, 500 + rng() * 300, 14 + rng() * 6, '#7fb48a', rng);
        ctx.fillStyle = '#6f9a5a'; ctx.fillRect(x0, -122, x1 - x0, 300);
      } },
      { f: 0.45, draw(ctx, rng, x0, x1) {
        for (let x = x0; x < x1; x += 40 + rng() * 40) drawBamboo(ctx, x, -90, 600 + rng() * 300, 20 + rng() * 8, '#5f9e5a', rng);
        ctx.fillStyle = '#4f7f48'; ctx.fillRect(x0, -92, x1 - x0, 300);
        ctx.fillStyle = '#9a6a3c'; ctx.fillRect(x0, -96, x1 - x0, 22);
        ctx.fillStyle = '#7a4f2a'; ctx.fillRect(x0, -76, x1 - x0, 6);
        for (let x = x0; x < x1; x += 120) { ctx.fillStyle = '#6b4020'; ctx.fillRect(x, -74, 12, 74); }
        // dojo
        for (let x = x0 + 200; x < x1; x += 900) {
          const y = -90, w = 520;
          ctx.fillStyle = '#7a4a2a'; ctx.fillRect(x, y - 190, w, 190);
          ctx.fillStyle = '#f3e3c3';
          for (let i = 0; i < 6; i++) ctx.fillRect(x + 14 + i * 84, y - 170, 72, 140);
          ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 3;
          for (let i = 0; i < 6; i++) for (let j = 1; j < 4; j++) { ctx.beginPath(); ctx.moveTo(x + 14 + i * 84, y - 170 + j * 35); ctx.lineTo(x + 86 + i * 84, y - 170 + j * 35); ctx.stroke(); }
          ctx.fillStyle = '#3a2a2a';
          ctx.beginPath(); ctx.moveTo(x - 60, y - 180); ctx.lineTo(x + w / 2, y - 280); ctx.lineTo(x + w + 60, y - 180); ctx.lineTo(x + w + 30, y - 200); ctx.lineTo(x + w / 2, y - 300); ctx.lineTo(x - 30, y - 200); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#c0392b';
          ctx.beginPath(); ctx.arc(x + w / 2, y - 235, 22, 0, TAU); ctx.fill();
        }
      } },
      { f: 1, draw(ctx, rng, x0, x1) {
        const g = ctx.createLinearGradient(0, 0, 0, 140);
        g.addColorStop(0, '#c08a52'); g.addColorStop(1, '#8a5a30');
        ctx.fillStyle = g; ctx.fillRect(x0, 0, x1 - x0, 140);
        ctx.strokeStyle = 'rgba(90,50,20,0.5)'; ctx.lineWidth = 2;
        for (let y = 8; y < 140; y += 18 + y * 0.12) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
        for (let i = 0; i < 160; i++) {
          const y = rng() * 140, x = x0 + rng() * (x1 - x0);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 14); ctx.stroke();
        }
        ctx.fillStyle = '#6b4020'; ctx.fillRect(x0, -6, x1 - x0, 8);
      } },
    ],
    spectators: [
      { x: 360, f: 0.45, y: -96, s: 0.4, look: { upperArm: '#f6f1e4' }, deco: 'band' },
      { x: 520, f: 0.45, y: -96, s: 0.38, look: { upperArm: '#f6f1e4' }, deco: 'band' },
      { x: 1000, f: 0.45, y: -96, s: 0.42, look: { upperArm: '#f6f1e4' }, deco: 'band' },
      { x: 1180, f: 0.45, y: -96, s: 0.38, look: { upperArm: '#f6f1e4' }, deco: 'band' },
    ],
    dyn(ctx, li, t) {
      if (li !== 2) return;
      for (let i = 0; i < 4; i++) {
        const x = 300 + i * 340, y = -330;
        const sw = Math.sin(t * 0.03 + i) * 6;
        ctx.fillStyle = i % 2 ? '#c0392b' : '#f4b400';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40, y); ctx.lineTo(x + 40 + sw, y + 140); ctx.lineTo(x + 20 + sw, y + 120); ctx.lineTo(x + sw, y + 140); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + 20 + sw * 0.5, y + 50, 11, 0, TAU); ctx.fill();
      }
    },
    weather(g, fx, t, cam) {
      if (t % 9 === 0) fx.add({ type: 'leaf', x: cam.x + rand(-700, 700), y: -rand(500, 700), vx: rand(-1, 1), vy: rand(0.6, 1.2), g: 0.004, drag: 1, life: 420, size: rand(6, 9), rot: rand(0, TAU), vr: rand(-0.05, 0.05), color: pick(['#8fd65a', '#c2d94a', '#5fbf4a']), alpha: 0.85 });
    },
    front(ctx, t, cam) {
      const x = VW - 70 - (cam.x * 0.3 % 40);
      drawBamboo(ctx, x, VH, 760, 30, '#3f7a3a', mulberry32(5));
      drawBamboo(ctx, 40 - (cam.x * 0.3 % 40), VH, 760, 26, '#3f7a3a', mulberry32(9));
    },
  },
];

class Stage {
  constructor(def) {
    this.def = def;
    this.t = 0;
    this.layers = [];
    this.flyers = []; this.snow = []; this.steamQ = [];
    this.cheer = 0;
    this.specs = (def.spectators || []).map((s, i) => ({ ...s, ph: i * 1.7, look: spectatorLook(s.look), jump: 0 }));
    this.build();
  }

  build() {
    for (const L of this.def.layers) {
      const zl = 1 + (1.2 - 1) * L.f;
      const half = VW / 2 / zl + 120;
      const x0 = Math.floor(450 * L.f - half), x1 = Math.ceil(1550 * L.f + half);
      const c = document.createElement('canvas');
      c.width = x1 - x0; c.height = LAYER_H;
      const ctx = c.getContext('2d');
      ctx.translate(-x0, -LAYER_TOP);
      L.draw(ctx, mulberry32(L.f * 1000 + this.def.id.length), x0, x1);
      this.layers.push({ f: L.f, canvas: c, x0 });
    }
  }

  layerTransform(ctx, cam, f) {
    const zl = 1 + (cam.zoom - 1) * f;
    ctx.translate(VW / 2, GROUND_SY + cam.lift * f);
    ctx.scale(zl, zl);
    ctx.translate(-cam.x * f, 0);
  }

  update(g) {
    this.t++;
    const t = this.t;
    if (this.def.weather) this.def.weather(g, g.fx, t, g.cam);
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const b = this.flyers[i]; b.x += b.vx; b.t++;
      if (b.t > 900) this.flyers.splice(i, 1);
    }
    for (let i = this.snow.length - 1; i >= 0; i--) {
      const s = this.snow[i]; s.x += s.vx + Math.sin(t * 0.03 + s.ph) * 0.4; s.y += s.vy;
      if (s.y > VH) this.snow.splice(i, 1);
    }
    for (let i = this.steamQ.length - 1; i >= 0; i--) {
      const s = this.steamQ[i]; s.life++; s.y -= 0.6; s.x += 0.2;
      if (s.life > 120) this.steamQ.splice(i, 1);
    }
    if (this.cheer > 0) this.cheer--;
    for (const s of this.specs) if (s.jump > 0) s.jump--;
  }

  hype(n) {
    this.cheer = Math.max(this.cheer, n);
    for (const s of this.specs) if (chance(0.7)) s.jump = randInt(20, 40);
  }

  drawBack(ctx, cam, g) {
    this.def.sky(ctx, this.t);
    for (const b of this.flyers) {
      const x = VW / 2 + (b.x - cam.x * 0.2), y = GROUND_SY + b.y;
      ctx.strokeStyle = 'rgba(40,20,40,0.8)'; ctx.lineWidth = 2.5;
      const fl = Math.sin(b.t * 0.25) * 6;
      ctx.beginPath(); ctx.moveTo(x - 12, y - fl); ctx.quadraticCurveTo(x - 5, y - 4, x, y); ctx.quadraticCurveTo(x + 5, y - 4, x + 12, y - fl); ctx.stroke();
    }
    this.layers.forEach((L, li) => {
      ctx.save();
      this.layerTransform(ctx, cam, L.f);
      ctx.drawImage(L.canvas, L.x0, LAYER_TOP);
      if (this.def.dyn) this.def.dyn(ctx, li, this.t, g);
      this.drawSpecs(ctx, L.f);
      if (li === 2 && this.steamQ.length) {
        for (const s of this.steamQ) {
          ctx.fillStyle = `rgba(255,255,255,${0.18 * Math.sin(s.life / 120 * Math.PI)})`;
          ctx.beginPath(); ctx.arc(s.x, s.y - s.life * 0.3, s.s + s.life * 0.2, 0, TAU); ctx.fill();
        }
      }
      ctx.restore();
    });
  }

  drawSpecs(ctx, f) {
    for (const s of this.specs) {
      if (s.f !== f) continue;
      const t = this.t;
      const cheer = this.cheer > 0;
      const jy = s.jump > 0 ? -Math.sin((s.jump / 40) * Math.PI) * 40 : 0;
      const p = mkPose(cheer
        ? { hy: -60, torso: 0, head: -20, aF: [10, -60], aB: [-6, -58], eye: 1, mouth: 2 }
        : { hy: s.bath ? -40 : -24, torso: -2, head: -4 + Math.sin(t * 0.03 + s.ph) * 4, aF: [26, 22], aB: [22, 24], lF: [40, -6], lB: [30, -4], eye: (t + s.ph * 50) % 260 < 8 ? 1 : 0 });
      ctx.save();
      ctx.translate(s.x, s.y + jy + Math.sin(t * 0.05 + s.ph) * (s.bath ? 2 : 0));
      ctx.scale(s.x > STAGE_W * f * 0.5 ? -s.s : s.s, s.s);
      drawCapy(ctx, s.look, p, { t });
      const deco = s.deco;
      const hx = 20, hy = (cheer ? -60 : s.bath ? -40 : -24) - 140;
      if (deco === 'orange') drawOrange(ctx, hx, hy - 6, 16, 0);
      if (deco === 'yuzu') drawYuzuFruit(ctx, hx, hy - 6, 14);
      if (deco === 'towel') { rrect(ctx, hx - 26, hy - 8, 52, 14, 6); ctx.fillStyle = '#fff'; ctx.fill(); }
      if (deco === 'bird') drawBird(ctx, hx, hy - 10, 1, cheer ? Math.sin(t * 0.6) : 0);
      if (deco === 'band') { ctx.fillStyle = '#e8332a'; ctx.fillRect(hx - 30, hy + 6, 60, 9); }
      ctx.restore();
      if (s.bath) {
        ctx.fillStyle = 'rgba(70,140,190,0.85)';
        ctx.fillRect(s.x - 60, s.y - 14, 120, 40);
        ctx.strokeStyle = 'rgba(220,245,255,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(s.x, s.y - 14, 40 + Math.sin(t * 0.08 + s.ph) * 4, 4, 0, 0, TAU); ctx.stroke();
      }
    }
  }

  drawFront(ctx, cam) {
    if (this.def.front) this.def.front(ctx, this.t, cam);
    if (this.snow.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (const s of this.snow) { ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, TAU); ctx.fill(); }
    }
  }
}
