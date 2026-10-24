'use strict';
/* Wykończenia po ostatniej rundzie: Kapibality każdej postaci i wspólna Kapiprzyjaźń.
   run(g, c) steruje pozami i pozycjami, draw(ctx, g, c, warstwa) rysuje rekwizyty. */

// Przybliżony czubek głowy kapibary (świat, y w dół)
function headTop(f, sitting) {
  const sc = f.look.scale;
  return [f.x + f.facing * 26 * sc, -f.y - (sitting ? 156 : 200) * sc];
}

function winPose(c, w, t) {
  c.wtp = c.wtp || clonePose(STANCE);
  return w.ch.winPoseFn ? w.ch.winPoseFn(t, c.wtp) : POSES.win;
}

function drawBubble(ctx, x, y, text) {
  ctx.font = "22px 'Rubik', sans-serif";
  const w = ctx.measureText(text).width + 36;
  rrect(ctx, x - w / 2, y - 30, w, 46, 18);
  ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#24140a'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 10, y + 15); ctx.lineTo(x + 4, y + 34); ctx.lineTo(x + 12, y + 15); ctx.fillStyle = '#ffffff'; ctx.fill();
  ctx.fillStyle = '#24140a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - 7);
}

function drawBird(ctx, x, y, s, flap, color = '#3d6fb6') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = color; ctx.strokeStyle = '#1b2a40'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 10, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(11, -8, 7, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffb02e'; ctx.beginPath(); ctx.moveTo(17, -9); ctx.lineTo(25, -7); ctx.lineTo(17, -5); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(13, -10, 1.6, 0, TAU); ctx.fill();
  ctx.fillStyle = shade(color, -0.2);
  ctx.beginPath(); ctx.ellipse(-2, -4 - flap * 8, 11, 5, -0.4 - flap * 0.6, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawDuck(ctx, x, y, s, t) {
  ctx.save(); ctx.translate(x, y + Math.abs(Math.sin(t * 0.3)) * -3); ctx.scale(s, s);
  ctx.fillStyle = '#ffe14d'; ctx.strokeStyle = '#7a5d00'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, -10, 13, 10, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(10, -22, 8, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff9d2e'; ctx.beginPath(); ctx.ellipse(19, -21, 5, 2.5, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(12, -24, 1.5, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawTub(ctx, x, w, h, front) {
  if (!front) {
    ctx.beginPath(); ctx.ellipse(x, -h, w / 2, 16, 0, Math.PI, TAU);
    ctx.fillStyle = '#7a4a22'; ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x - w / 2, -h); ctx.lineTo(x - w / 2 + 10, 0); ctx.lineTo(x + w / 2 - 10, 0); ctx.lineTo(x + w / 2, -h);
  ctx.ellipse(x, -h, w / 2, 16, 0, 0, Math.PI);
  ctx.closePath();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, '#8a5a2b'); g.addColorStop(0.5, '#c58a4c'); g.addColorStop(1, '#8a5a2b');
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#3d220c'; ctx.stroke();
  ctx.strokeStyle = 'rgba(60,30,10,0.45)'; ctx.lineWidth = 2;
  for (let i = 1; i < 6; i++) { const xx = x - w / 2 + i * w / 6; ctx.beginPath(); ctx.moveTo(xx, -h + 14); ctx.lineTo(xx + (xx < x ? 2 : -2), 0); ctx.stroke(); }
  ctx.strokeStyle = '#4a4f57'; ctx.lineWidth = 6;
  [0.3, 0.75].forEach(k => { ctx.beginPath(); ctx.moveTo(x - w / 2 + 4 * k, -h * (1 - k)); ctx.lineTo(x + w / 2 - 4 * k, -h * (1 - k)); ctx.stroke(); });
  ctx.beginPath(); ctx.ellipse(x, -h, w / 2 - 6, 11, 0, 0, Math.PI);
  ctx.strokeStyle = '#8fdcff'; ctx.lineWidth = 6; ctx.stroke();
}

const FIN_KAPI = {
  id: 'fin_kapi', name: 'Owocowa Lawina', motion: [6, 2, 6], glyph: '→↓→', btn: 'HP', range: null, dur: 320,
  title: 'KAPIBALITY!',
  run(g, c) {
    const { w, l, t, d } = c;
    if (t === 0) { w.forcePose = POSES.point; l.forcePose = POSES.dizzy; d.oy = 1150; d.vy = 0; d.ox = l.x; d.rot = 0; g.sfx('whistle'); }
    if (t >= 10 && !d.hit) {
      d.vy -= 0.6; d.oy += d.vy;
      if (d.oy <= 125) {
        d.oy = 125; d.hit = true; d.vy = 10; d.away = l.x > w.x ? 1 : -1;
        l.forcePose = mkPose({ eye: 4, mouth: 1, aF: [50, 0], aB: [-40, 0], lF: [50, 0], lB: [-50, 0] });
        l.extraScale = [1.6, 0.13];
        g.shake(24); g.fx.juice(l.x, -30, 40, 1); g.fx.juice(l.x, -30, 40, -1); g.fx.dust(l.x, 0, 20, 0);
        g.sfx('slam'); g.sfx('splash');
      }
    }
    if (d.hit) {
      d.oy += d.vy; d.vy -= 0.7;
      if (d.oy < 125) { d.oy = 125; d.vy = Math.abs(d.vy) * 0.45; }
      d.ox += 7 * d.away; d.rot += 0.07 * d.away;
      const k = Math.max(0, 1 - (t - 70) / 60);
      l.extraScale = [1.6 + Math.sin(t * 0.5) * 0.12 * k, 0.13 + Math.sin(t * 0.5 + 1) * 0.04 * k];
      if (t % 30 === 0) g.fx.stars(l.x, -20, 3);
    }
    if (t >= 150) w.forcePose = winPose(c, w, t - 150);
  },
  draw(ctx, g, c, layer) {
    const d = c.d;
    if (layer !== 'front' || d.oy === undefined) return;
    const k = clamp(1 - d.oy / 1150, 0.1, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.35 * k})`;
    ctx.beginPath(); ctx.ellipse(d.ox, 0, 130 * k, 20 * k, 0, 0, TAU); ctx.fill();
    drawOrange(ctx, d.ox, -d.oy, 125, d.rot);
  },
};

const FIN_YUZU = {
  id: 'fin_yuzu', name: 'Wieczny Relaks', motion: [2, 6, 2], glyph: '↓→↓', btn: 'LK', range: null, dur: 340,
  title: 'KAPIBALITY!',
  run(g, c) {
    const { w, l, t, d } = c;
    if (t === 0) {
      w.forcePose = mkPose({ torso: 0, head: -18, aF: [30, -50], aB: [26, -46], eye: 1, mouth: 2 });
      l.forcePose = POSES.dizzy; d.ty = 900; d.vy = 0; g.sfx('whistle');
    }
    if (t >= 20 && !d.landed) {
      d.vy -= 0.7; d.ty += d.vy;
      if (d.ty <= 0) {
        d.ty = 0; d.landed = true;
        l.forcePose = mkPose({ eye: 1, mouth: 2 }, POSES.sit);
        g.fx.splash(l.x, -95, 30, 1.1); g.sfx('splash'); g.shake(10);
      }
    }
    if (d.landed) {
      if (t % 4 === 0) g.fx.steam(l.x, -100, 1, 70);
      if (t === 90) { d.fy = 700; d.fvy = 0; }
      if (d.fy !== undefined && !d.fl) {
        d.fvy -= 0.6; d.fy += d.fvy;
        const ht = -headTop(l, true)[1];
        if (d.fy <= ht + 8) { d.fy = ht + 8; d.fl = true; g.sfx('pop'); g.fx.stars(l.x, -ht, 4, '#fff3a0'); }
      }
      if (t === 120) g.sfx('steam');
    }
    if (t >= 150) w.forcePose = winPose(c, w, t - 150);
  },
  draw(ctx, g, c, layer) {
    const d = c.d, l = c.l;
    if (d.ty === undefined) return;
    const W = 200 * l.look.scale, Ht = 92;
    ctx.save(); ctx.translate(0, -d.ty);
    drawTub(ctx, l.x, W, Ht, layer === 'front');
    ctx.restore();
    if (layer !== 'front') return;
    if (d.fy !== undefined) {
      const [hx] = headTop(l, true);
      drawYuzuFruit(ctx, hx, -d.fy, 15);
    }
    if (c.t > 130 && c.t < 300) drawBubble(ctx, l.x, -300, 'Już mi się nie chce walczyć...');
    if (c.t > 160) {
      ctx.font = "26px 'Titan One', sans-serif"; ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('z', l.x + 70, -240 - (c.t % 60) * 0.6);
      ctx.fillText('Z', l.x + 90, -270 - (c.t % 60) * 0.4);
    }
  },
};

const FIN_CIEN = {
  id: 'fin_cien', name: 'Kapi-Maki', motion: [4, 6, 4], glyph: '←→←', btn: 'LP', range: 260, dur: 330,
  title: 'KAPIBALITY!',
  run(g, c) {
    const { w, l, t, d } = c;
    if (t === 0) { w.forcePose = POSES.crouch; l.forcePose = POSES.dizzy; }
    if (t === 10) { w.hidden = true; g.fx.leaves(w.x, -100, 30, 8); g.sfx('teleport'); }
    if (t > 10 && t < 64 && t % 4 === 0) {
      const a = rand(0, Math.PI), cx = l.x, cy = -l.y - 100;
      g.fx.add({ type: 'slash', x: cx - Math.cos(a) * 130, y: cy - Math.sin(a) * 130, x2: cx + Math.cos(a) * 130, y2: cy + Math.sin(a) * 130, life: 10, size: 9, color: '#ffffff' }, true);
      g.fx.leaves(cx, cy, 3, 5);
      g.sfx(t % 8 ? 'swingL' : 'swingH');
    }
    if (t === 72) { l.hidden = true; d.roll = true; g.sfx('pop'); g.fx.leaves(l.x, -110, 30, 9); g.fx.steam(l.x, -60, 6, 60); }
    if (t === 96) {
      w.hidden = false; w.x = g.clampX(l.x - w.facing * 190);
      w.forcePose = mkPose({ torso: 50, head: 24, aF: [20, 30], aB: [16, 32], eye: 1 });
      g.fx.leaves(w.x, -100, 14, 5);
    }
    if (t >= 170) w.forcePose = winPose(c, w, t - 170);
  },
  draw(ctx, g, c, layer) {
    const d = c.d, l = c.l, t = c.t;
    if (layer !== 'front') return;
    if (t > 40 && !d.roll) {
      const k = clamp((t - 40) / 30, 0, 1);
      ctx.fillStyle = '#1f3a24';
      ctx.fillRect(l.x - 95, -230 * k, 190, 230 * k);
      ctx.strokeStyle = '#0d1c10'; ctx.lineWidth = 4; ctx.strokeRect(l.x - 95, -230 * k, 190, 230 * k);
    }
    if (!d.roll) return;
    const x = l.x, y = -118 + Math.sin(t * 0.15) * 2, R = 115;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(x, 0, R, 16, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fillStyle = '#1f3a24'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#0d1c10'; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, R - 16, 0, TAU); ctx.fillStyle = '#fbfaf2'; ctx.fill();
    ctx.fillStyle = '#e4e1d2';
    for (let i = 0; i < 40; i++) {
      const a = i * 2.4, r = R - 22 - (i % 3) * 9;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, 5, 2.5, a, 0, TAU); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, y, R - 48, 0, TAU); ctx.fillStyle = l.look.fur; ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, R - 48, 0, TAU); ctx.clip();
    drawCapyHead(ctx, l.look, x - l.facing * 22, y + 18, 0.9, l.facing < 0, { eye: t % 90 < 6 ? 1 : 4, mouth: 1, t });
    ctx.restore();
    ctx.fillStyle = '#f4e6b8';
    for (let i = 0; i < 12; i++) { const a = i * 0.9 + 0.3; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * (R - 8), y + Math.sin(a) * (R - 8), 3, 1.6, a, 0, TAU); ctx.fill(); }
    // talerzyk z sosem sojowym i wasabi
    const sx = x + (l.x > c.w.x ? 1 : -1) * 170;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(sx, -8, 40, 10, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#24140a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#4a2410'; ctx.beginPath(); ctx.ellipse(sx, -9, 28, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8fc93a'; ctx.beginPath(); ctx.arc(sx + 50, -10, 10, Math.PI, TAU); ctx.fill();
  },
};

const FIN_BRUNO = {
  id: 'fin_bruno', name: 'Na Księżyc', motion: [2, 'n', 2, 'n', 2], glyph: '↓↓↓', btn: 'HP', range: 200, dur: 330,
  title: 'KAPIBALITY!',
  run(g, c) {
    const { w, l, t, d } = c;
    if (t === 0) { w.forcePose = POSES.grab; l.forcePose = POSES.dizzy; d.a = 0; d.sp = 0; g.sfx('grab'); }
    if (t < 14) {
      l.y = lerp(0, 175, t / 14); l.x = lerp(l.x, w.x, t / 14);
      l.forcePose = mkPose({ rot: 180 * t / 14 }, POSES.airHit);
    }
    if (t === 14) w.forcePose = clonePose(POSES.lift);
    if (t >= 14 && t < 96) {
      d.sp = Math.min(0.55, d.sp + 0.008); d.a += d.sp;
      w.forcePose.fx = Math.cos(d.a);
      l.x = w.x + Math.sin(d.a) * 26; l.y = 175 + w.y;
      l.facing = Math.cos(d.a) > 0 ? -w.facing : w.facing;
      l.forcePose = mkPose({ rot: 180 }, POSES.airHit);
      if (t % 14 === 0) g.sfx('spin');
      if (t % 3 === 0) g.fx.dust(w.x + rand(-60, 60), 0, 2, sign(rand(-1, 1)));
    }
    if (t === 96) { d.fly = true; d.vy = 34; w.forcePose = mkPose({ torso: -6, head: -30, aF: [20, -70], aB: [14, -64], as: 1.2, eye: 2, mouth: 1 }); g.sfx('swingH'); g.shake(8); }
    if (d.fly && !l.hidden) {
      l.y += d.vy; d.vy *= 0.985;
      const k = clamp((l.y - 175) / 900, 0, 1);
      l.extraScale = [1 - k * 0.8, 1 - k * 0.8];
      l.forcePose = mkPose({ rot: t * 25 }, POSES.airHit);
      if (l.y > 1250) { l.hidden = true; d.star = 0; g.sfx('twinkle'); }
    }
    if (d.star !== undefined) d.star++;
    if (t >= 160) w.forcePose = winPose(c, w, t - 160);
  },
  screen(ctx, g, c) {
    const d = c.d;
    if (d.star === undefined || d.star > 90) return;
    const k = d.star < 20 ? d.star / 20 : 1 - (d.star - 20) / 70;
    const x = VW * 0.5 + (c.l.x - g.cam.x) * 0.25, y = 110;
    ctx.save(); ctx.translate(x, y); ctx.rotate(d.star * 0.05); ctx.globalAlpha = clamp(k, 0, 1);
    drawStar(ctx, 0, 0, 30 * k + 6, '#fff7c2');
    ctx.globalAlpha = 1; ctx.restore();
  },
};

const FRIENDSHIP = [{
  id: 'friend', name: 'Kapiprzyjaźń', motion: [4, 'n', 4, 2], glyph: '←←↓', btn: 'LK', range: null, dur: 380,
  title: 'KAPIPRZYJAŹŃ!',
  run(g, c) {
    const { w, l, t, d } = c;
    if (t === 0) {
      const sit = mkPose({ eye: 1, mouth: 2 }, POSES.sit);
      w.forcePose = sit; l.forcePose = sit;
      w.facing = l.x > w.x ? 1 : -1; l.facing = -w.facing;
      d.birds = [
        { f: w, x: w.x - 600, y: -520, c: '#3d6fb6' },
        { f: l, x: l.x + 600, y: -560, c: '#e2574c' },
      ];
      d.ducks = [0, 1, 2, 3].map(i => ({ x: Math.min(w.x, l.x) - 500 - i * 46 }));
      g.sfx('fanfare');
    }
    const mid = (w.x + l.x) / 2;
    if (t > 20 && t % 12 === 0) g.fx.hearts(mid, -200, 1);
    for (const b of d.birds) {
      const [tx, ty] = headTop(b.f, true);
      const k = clamp((t - 30) / 90, 0, 1);
      b.cx = lerp(b.x, tx, easeOut(k)); b.cy = lerp(b.y, ty - 12, easeOut(k)) - Math.sin(k * Math.PI) * 60;
      if (t === 120) g.sfx('heart');
    }
    for (const du of d.ducks) if (t > 50) du.x += 1.6;
    if (t === 150 || t === 170) g.sfx('pop');
  },
  draw(ctx, g, c, layer) {
    const d = c.d, t = c.t;
    if (!d.birds) return;
    if (layer === 'back') {
      const mid = (c.w.x + c.l.x) / 2, a = clamp((t - 20) / 80, 0, 0.75);
      const cols = ['#ff4d4d', '#ff9f1c', '#ffe14d', '#5fd35f', '#4db8ff', '#8b6dff'];
      ctx.globalAlpha = a; ctx.lineWidth = 14;
      cols.forEach((col, i) => { ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(mid, 40, 430 - i * 14, Math.PI, TAU); ctx.stroke(); });
      ctx.globalAlpha = 1;
      return;
    }
    for (const du of d.ducks) drawDuck(ctx, du.x, 0, 1.1, t + du.x);
    for (const b of d.birds) {
      const flying = t < 120;
      drawBird(ctx, b.cx, b.cy, 1, flying ? Math.sin(t * 0.6) : 0, b.c);
    }
    [[c.w, 150], [c.l, 170]].forEach(([f, at]) => {
      if (t < at) return;
      const [hx, hy] = headTop(f, true);
      const k = clamp((t - at) / 14, 0, 1);
      drawOrange(ctx, hx - f.facing * 10, lerp(hy - 400, hy - 40, easeIn(k)), 16, 0);
    });
  },
}];

KAPI.finishers = [FIN_KAPI];
YUZU.finishers = [FIN_YUZU];
CIEN.finishers = [FIN_CIEN];
BRUNO.finishers = [FIN_BRUNO];
YUZU.she = true;
