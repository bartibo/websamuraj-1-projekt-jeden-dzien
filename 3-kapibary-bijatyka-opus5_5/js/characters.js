'use strict';
/* Cztery kapibary: wygląd, kostiumy, ciosy specjalne, super ciosy, pociski i combosy. */

function lookOf(o) {
  const L = Object.assign({ scale: 1, girth: 1, torsoLen: 1, head: 0.9, outline: '#24140a', voice: 1 }, o);
  L.furBack = shade(L.fur, -0.2);
  return L;
}

// Wstążki (opaska, szal) – w układzie głowy, powiewają za postacią
function drawRibbons(ctx, o, x, y, color, len, n, width) {
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    let px = x, py = y, a = Math.PI - 0.15 - i * 0.38;
    const pts = [[px, py]];
    for (let s = 0; s < 6; s++) {
      a += Math.sin(o.t * 0.16 + s * 0.8 + i * 1.7) * 0.14 - 0.07 + clamp(o.vx, -10, 10) * 0.012;
      px += Math.cos(a) * len / 6; py += Math.sin(a) * len / 6;
      pts.push([px, py]);
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a0d06'; ctx.lineWidth = width + 4;
    ctx.beginPath(); pts.forEach(([a1, b1], k) => k ? ctx.lineTo(a1, b1) : ctx.moveTo(a1, b1)); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); pts.forEach(([a1, b1], k) => k ? ctx.lineTo(a1, b1) : ctx.moveTo(a1, b1)); ctx.stroke();
  }
}

function drawOrange(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ffd27a'); g.addColorStop(0.5, '#ff9a1f'); g.addColorStop(1, '#e06a00');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.08); ctx.strokeStyle = '#7a3500'; ctx.stroke();
  ctx.fillStyle = 'rgba(160,70,0,0.35)';
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, d = r * (0.3 + (i % 3) * 0.2);
    ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.05, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#3f7d2b';
  ctx.beginPath(); ctx.ellipse(r * 0.25, -r * 0.95, r * 0.32, r * 0.14, -0.5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-r * 0.05, -r * 1.05, r * 0.1, r * 0.18);
  ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.22, r * 0.12, -0.6, 0, TAU);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
  ctx.restore();
}

function drawYuzuFruit(ctx, x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  g.addColorStop(0, '#fff3a0'); g.addColorStop(1, '#f2b705');
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#7a5200'; ctx.stroke();
  ctx.fillStyle = '#4c9a2a';
  ctx.beginPath(); ctx.ellipse(x + r * 0.4, y - r * 0.95, r * 0.5, r * 0.2, -0.4, 0, TAU); ctx.fill();
}

// ============================ KAPITAN KAPI ============================
const KAPI = {
  id: 'kapi', name: 'Kapitan Kapi', title: 'Mistrz Pomarańczowej Pięści', style: 'Wszechstronny', diff: 1,
  color: '#ff8a2a',
  desc: 'Trenował karate nad brzegiem Amazonki, aż rzeka zaczęła mu się kłaniać. Rzuca pomarańczami, wzbija się w niebo i kręci jak wiatrak. Dobry na początek.',
  hp: 1000, walkF: 3.5, walkB: 2.9, jumpV: 16.5, jumpX: 4.5,
  look: lookOf({
    fur: '#a8743f', furDark: '#7d5229', belly: '#d6a76e', paw: '#4b2f1c', nose: '#4a2c1a', voice: 1,
    upperArm: '#f6f1e4', thigh: '#f6f1e4',
    bodyDeco(ctx, G) {
      const rx = G.rx, ry = G.ry;
      ctx.fillStyle = '#f6f1e4'; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
      const g = ctx.createLinearGradient(-rx, 0, rx, 0);
      g.addColorStop(0, 'rgba(90,70,50,0.35)'); g.addColorStop(0.6, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
      ctx.fillStyle = '#d6a76e';
      ctx.beginPath(); ctx.moveTo(rx * 0.05, -ry); ctx.lineTo(rx, -ry); ctx.lineTo(rx * 0.55, -ry * 0.15); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#cbbf9f'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(rx * 0.02, -ry); ctx.lineTo(rx * 0.55, -ry * 0.12); ctx.stroke();
      ctx.fillStyle = '#1d1a1a'; ctx.fillRect(-rx, ry * 0.28, rx * 2, ry * 0.17);
    },
    bodyOver(ctx, G) {
      const x = G.rx * 0.82, y = G.ry * 0.36;
      ctx.fillStyle = '#1d1a1a'; ctx.strokeStyle = '#000';
      ctx.beginPath(); ctx.ellipse(x, y, 9, 7, 0, 0, TAU); ctx.fill();
      ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.strokeStyle = '#1d1a1a';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y + 26); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 28); ctx.stroke();
    },
    headBack(ctx, o) { drawRibbons(ctx, o, -26, -32, '#e8332a', 62, 2, 7); },
    headDeco(ctx) {
      ctx.beginPath();
      ctx.moveTo(-31, -24); ctx.lineTo(-23, -42); ctx.lineTo(60, -50); ctx.lineTo(63, -38); ctx.closePath();
      ctx.fillStyle = '#e8332a'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#24140a'; ctx.stroke();
      ctx.beginPath(); ctx.arc(-27, -32, 7, 0, TAU); ctx.fillStyle = '#c4231b'; ctx.fill(); ctx.stroke();
    },
  }),
  winPoseFn(f, tp) {
    const k = Math.min(1, f / 20);
    lerpPose(STANCE, mkPose({ torso: 0, head: -16, aF: [0, -64], aB: [30, 4], as: 1.1, eye: 1, mouth: 2 }), easeOut(k), tp);
    tp.aF[0] += Math.sin(f * 0.15) * 6;
    return tp;
  },
  introPoseFn(f, tp) {
    const bow = f < 50;
    lerpPose(STANCE, bow ? mkPose({ torso: 50, head: 20, aF: [20, 30], aB: [16, 32], eye: 1 }) : STANCE, bow ? easeOut(Math.min(1, f / 20)) : 0, tp);
    return tp;
  },
  specials: [
    {
      id: 'k_rise', name: 'Wznosząca Łapa', motion: 'dp', btn: 'P',
      desc: 'Podbródkowy w niebo, nietykalny na starcie. Najlepszy na skaczących.',
      make: s => defMove({
        id: 'k_rise', name: 'Wznosząca Łapa', type: 'special', str: 6, total: 80, invul: [0, s === 'H' ? 8 : 5],
        landLag: s === 'H' ? 20 : 14, trail: true,
        poses: K(STANCE, [[0, { hy: -40, torso: 30, head: -10, aF: [24, 18], aB: [18, 20], lF: [30, 0], lB: [-28, 0] }],
          [3, { hy: -72, hx: 6, torso: -2, head: -24, aF: [26, -82], as: 1.3, aB: [10, -10], lF: [22, -46], lB: [-12, -20], eye: 2, mouth: 1 }],
          [16, { hy: -72, torso: -4, head: -26, aF: [24, -80], as: 1.3, aB: [10, -12], lF: [20, -40], lB: [-14, -24], eye: 2, mouth: 1 }],
          [30, POSES.jumpFall]]),
        vel: [[3, s === 'H' ? 3.2 : 2.4, s === 'H' ? 16.5 : 13.5]],
        hits: s === 'H'
          ? [{ f: [3, 6], box: [54, 140, 80, 120], dmg: 55, hs: 20, launch: [2.5, 13], lvl: 'H', jp: 0 },
            { f: [7, 13], box: [40, 200, 84, 110], dmg: 50, hs: 20, launch: [2.5, 13], lvl: 'H' }]
          : [{ f: [3, 8], box: [52, 150, 80, 130], dmg: 80, hs: 20, launch: [2.2, 12], lvl: 'H', jp: 0 }],
        sfx: [[2, 'swingH']],
      }),
    },
    {
      id: 'k_orange', name: 'Pomarańczowa Kula', motion: 'qcf', btn: 'P',
      desc: 'Rzut pomarańczą. LŁ – wolna, MŁ – szybka.',
      can: me => !me.g.hasProj(me, 'main'),
      make: s => defMove({
        id: 'k_orange', name: 'Pomarańczowa Kula', type: 'special', str: 6, total: 44,
        poses: K(STANCE, [[0], [6, { hx: -8, torso: -4, head: -6, aF: [-14, 6], aB: [-22, 2], eye: 2 }],
          [11, { hx: 14, torso: 24, head: 4, aF: [66, -14], aB: [52, -6], as: 1.2, mouth: 1, eye: 2, lF: [34, 0] }],
          [30, { hx: 12, torso: 20, aF: [60, -10], aB: [48, -4], as: 1.2, lF: [34, 0] }], [44]]),
        proj: [{ f: 11, kind: 'orange', x: 92, y: 124, vx: s === 'H' ? 10.5 : 6.5, w: 52, h: 52, limit: 'main',
          hit: H({ dmg: 60, chip: 12, hs: 18, bs: 12, kb: 6, lvl: 'M' }) }],
        sfx: [[10, 'throwOrange']],
      }),
    },
    {
      id: 'k_wind', name: 'Wiatrak Kapibary', motion: 'qcb', btn: 'K',
      desc: 'Wirujący kopniak w powietrzu, trafia z obu stron. MK – więcej obrotów.',
      make: s => {
        const n = s === 'H' ? 5 : 3, hits = [];
        for (let i = 0; i < n; i++) {
          hits.push({ f: [10 + i * 6, 12 + i * 6], box: [0, 104, 196, 60], dmg: 30, hs: 18, bs: 10, kb: 3, lvl: i === n - 1 ? 'H' : 'M',
            airLaunch: [2.5, 6], launch: i === n - 1 ? [4, 9] : null });
        }
        const SPIN = mkPose({ hy: -62, torso: 4, head: -8, lF: [92, -74], ls: 1.3, lB: [-6, -36], aF: [14, -44], aB: [4, -40], eye: 2, mouth: 1 });
        return defMove({
          id: 'k_wind', name: 'Wiatrak Kapibary', type: 'special', str: 6, total: 14 + n * 6, landLag: 10, trail: true, hurt: 160,
          vel: [[8, s === 'H' ? 5 : 4, 6]], grav: s === 'H' ? 0.32 : 0.45,
          poseFn(me, f, tp) {
            if (f < 8) return lerpPose(STANCE, POSES.preJump, f / 8, tp);
            lerpPose(SPIN, SPIN, 0, tp);
            if (f < 12 + n * 6) tp.fx = Math.cos((f - 8) * 0.55);
            else lerpPose(SPIN, POSES.jumpFall, 0.7, tp);
            return tp;
          },
          hits, sfx: [[8, 'spin'], [20, 'spin'], [32, 'spin']],
        });
      },
    },
    {
      id: 'k_bomb', name: 'Bomba z Kąpieli', motion: 'dd', btn: 'K',
      desc: 'Wyskok i plaśnięcie brzuchem. Cios z góry – trzeba blokować stojąc.',
      make: s => defMove({
        id: 'k_bomb', name: 'Bomba z Kąpieli', type: 'special', str: 6, total: 120, landLag: 22,
        vel: [[8, s === 'H' ? 5.5 : 3.5, s === 'H' ? 15 : 13]],
        poseFn(me, f, tp) {
          if (f < 8) return lerpPose(STANCE, POSES.preJump, f / 8, tp);
          if (me.vy > 0) return lerpPose(POSES.jumpUp, POSES.tuck, 0.6, tp);
          return lerpPose(POSES.tuck, FLOP, clamp(-me.vy / 6, 0, 1), tp);
        },
        hits: [{ f: [12, 120], cond: me => me.vy < 0, box: [40, 50, 150, 90], dmg: 85, hs: 24, guard: 'high', lvl: 'H', kd: true, launch: [3, 7] }],
        onLand(me, opp, g) {
          g.fx.splash(me.x + me.facing * 40, 0, 26, 1.2); g.fx.shock(me.x + me.facing * 30, 0, '#9fe3ff');
          g.shake(8); g.sfx('splash');
          if (!me.contact) g.instantHit(me, H({ box: [60, 22, 220, 44], dmg: 40, hs: 20, guard: 'low', kd: true, launch: [3, 6], lvl: 'M' }));
        },
        sfx: [[8, 'jump']],
      }),
    },
  ],
  superInfo: { name: 'Pomarańczowy Wodospad', desc: 'Olbrzymia pomarańcza – 5 trafień.' },
  superMove: () => defMove({
    id: 'k_super', name: 'Pomarańczowy Wodospad', type: 'super', str: 10, total: 70, invul: [0, 18],
    poses: K(STANCE, [[0, { hx: -10, torso: -8, head: -10, aF: [-6, 22], aB: [-14, 18], eye: 1, sq: 0.05 }],
      [14, { hx: -12, torso: -10, aF: [-8, 18], aB: [-16, 16], eye: 2 }],
      [17, { hx: 18, torso: 22, aF: [66, -4], aB: [62, 6], as: 1.25, mouth: 1, eye: 2, lF: [38, 0] }],
      [50, { hx: 18, torso: 22, aF: [64, -4], aB: [60, 6], as: 1.25, mouth: 1, eye: 2, lF: [38, 0] }], [70]]),
    proj: [{ f: 17, kind: 'megaOrange', x: 120, y: 120, vx: 9, w: 150, h: 150, hits: 5, interval: 6, life: 160, super: true, carry: true,
      hit: H({ dmg: 55, chip: 12, hs: 28, bs: 14, kb: 2, lvl: 'S', airLaunch: [2, 4] }),
      lastHit: H({ dmg: 70, chip: 15, hs: 30, bs: 14, kb: 8, lvl: 'S', launch: [7, 12] }) }],
    sfx: [[16, 'throwOrange'], [16, 'superHit']],
  }),
  combos: [
    ['Klasyk', 'LŁ, LŁ, MŁ, ↓↘→+MŁ'],
    ['Pod niebo', '↓LK, ↓LK, MŁ, →↓↘+MŁ'],
    ['Wiatrak', 'skok MK, MŁ, MK, ↓↙←+MK'],
    ['Powietrzny', '↓MŁ, ↑, LŁ, LK, MŁ, MK, →↓↘+MŁ'],
    ['Pełna moc', 'LK, MŁ, ↓↘→+MŁ, ↓↘→↓↘→+Ł'],
  ],
  aiCombos: [
    ['s.LP', 's.LP', 's.HP', 'sp:k_orange:HP'],
    ['c.LK', 'c.LK', 's.HP', 'sp:k_rise:HP'],
    ['s.LK', 's.HP', 'sp:k_wind:HK'],
    ['c.LP', 'c.HK'],
    ['c.HP', 'jump', 'j.LP', 'j.LK', 'j.HP', 'j.HK', 'land', 'sp:k_rise:HP'],
    ['s.HP', 'sp:k_orange:HP', 'super'],
  ],
  zoning: ['sp:k_orange:LP', 'sp:k_orange:HP'],
  antiAir: 'sp:k_rise:HP',
  // przycisk specjalny: sam, z →, z ←, z ↓ (w powietrzu: sam, z ↓)
  easy: { n: 'k_orange', f: 'k_rise', b: 'k_wind', d: 'k_bomb' },
  quotes: ['Pomarańcza dziennie trzyma przeciwnika z daleka.', 'Spokój. Woda. Karate.', 'Ukłoń się rzece, nie mnie.'],
};
const FLOP = mkPose({ hy: -46, rot: 78, torso: 0, head: -70, aF: [58, -26], aB: [50, -22], lF: [-18, -34], lB: [-34, -26], eye: 2, mouth: 1 });

// ============================ MAMA YUZU ============================
const YUZU = {
  id: 'yuzu', name: 'Mama Yuzu', title: 'Królowa Gorących Źródeł', style: 'Strefowa', diff: 2,
  color: '#58c8ef',
  desc: 'Właścicielka najsłynniejszego onsenu w Japonii. Trzyma rywali na dystans falami, gejzerami i ręcznikiem. Kto podejdzie zbyt blisko, wyjedzie na mydle.',
  hp: 960, walkF: 3.2, walkB: 3.0, jumpV: 16.8, jumpX: 4.2,
  look: lookOf({
    fur: '#b98a58', furDark: '#8d6236', belly: '#e6c291', paw: '#5a3a24', nose: '#5b3523', blush: '#ff8fa3', voice: 1.2,
    scale: 0.96, girth: 0.95, upperArm: '#8ed3ea',
    bodyDeco(ctx, G) {
      const rx = G.rx, ry = G.ry;
      ctx.fillStyle = '#8ed3ea'; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) {
        ctx.beginPath(); ctx.arc(-rx + j * 34 + (i % 2) * 17, -ry + i * 22, 8, Math.PI, TAU); ctx.stroke();
      }
      ctx.fillStyle = '#e6c291';
      ctx.beginPath(); ctx.moveTo(rx * 0.1, -ry); ctx.lineTo(rx, -ry); ctx.lineTo(rx * 0.55, -ry * 0.25); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(rx * 0.05, -ry); ctx.lineTo(rx * 0.55, -ry * 0.2); ctx.stroke();
      ctx.fillStyle = '#ff7aa8'; ctx.fillRect(-rx, ry * 0.12, rx * 2, ry * 0.3);
      ctx.fillStyle = '#ffd2e1'; ctx.fillRect(-rx, ry * 0.24, rx * 2, ry * 0.05);
    },
    bodyOver(ctx, G) {
      ctx.save(); ctx.translate(-G.rx * 0.85, G.ry * 0.26);
      ctx.fillStyle = '#ff7aa8'; ctx.strokeStyle = '#24140a'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(-8, -6, 12, 9, -0.5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-8, 10, 12, 9, 0.5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.restore();
    },
    headDeco(ctx) {
      rrect(ctx, -24, -68, 72, 19, 8);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#24140a'; ctx.stroke();
      ctx.strokeStyle = '#4aa3d8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-16, -62); ctx.lineTo(40, -62); ctx.moveTo(-16, -55); ctx.lineTo(40, -55); ctx.stroke();
      drawYuzuFruit(ctx, 14, -80, 13);
    },
  }),
  winPoseFn(f, tp) {
    lerpPose(STANCE, mkPose({ torso: 4, head: -10, aF: [30, -40], aB: [26, -30], eye: 1, mouth: 2 }), Math.min(1, f / 15), tp);
    tp.aF[0] += Math.sin(f * 0.25) * 8; tp.head += Math.sin(f * 0.1) * 4;
    return tp;
  },
  introPoseFn(f, tp) {
    lerpPose(STANCE, mkPose({ torso: 0, head: -16, aF: [18, -60], aB: [24, 4], eye: 1, mouth: 2 }), f < 50 ? Math.min(1, f / 15) : 0, tp);
    if (f < 50) tp.aF[0] += Math.sin(f * 0.3) * 10;
    return tp;
  },
  specials: [
    {
      id: 'y_towel', name: 'Ręcznikowy Bicz', motion: 'dp', btn: 'P',
      desc: 'Długi bicz z mokrego ręcznika: najpierw w górę, potem przed siebie.',
      make: s => defMove({
        id: 'y_towel', name: 'Ręcznikowy Bicz', type: 'special', str: 6, total: 38, invul: s === 'H' ? [0, 6] : null,
        poses: K(STANCE, [[0], [5, { hx: -6, torso: -10, head: -12, aF: [-20, -50], aB: [-10, -30], eye: 2 }],
          [9, { hx: 6, torso: 4, head: -20, aF: [20, -70], as: 1.2, eye: 2, mouth: 1 }],
          [14, { hx: 16, torso: 24, head: 4, aF: [66, -10], as: 1.25, eye: 2, mouth: 1, lF: [34, 0] }],
          [24, { hx: 16, torso: 24, head: 4, aF: [64, -8], as: 1.25, eye: 2, lF: [34, 0] }], [38]]),
        hits: [{ f: [8, 11], box: [80, 210, 160, 120], dmg: 45, hs: 20, launch: [2, 12], lvl: 'M', jp: 0 },
          { f: [12, 15], box: [160, 120, 180, 64], dmg: 50, hs: 20, bs: 14, kb: 7, lvl: 'H' }],
        sfx: [[7, 'swingH'], [11, 'swingH']],
        drawExtra(ctx, me, f) {
          if (f < 4 || f > 30) return;
          let a, len;
          if (f < 9) { a = lerp(-150, -95, (f - 4) / 5); len = lerp(40, 150, (f - 4) / 5); }
          else if (f < 14) { a = lerp(-95, -5, (f - 9) / 5); len = 160; }
          else { a = -5; len = lerp(160, 40, (f - 14) / 16); }
          a *= DEG;
          const bx = 26 + Math.cos(a) * 60, by = -122 + Math.sin(a) * 60;
          const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
          const nx = -Math.sin(a), ny = Math.cos(a);
          const w = Math.sin(me.t * 0.6) * 14;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#24140a'; ctx.lineWidth = 17;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo((bx + ex) / 2 + nx * w, (by + ey) / 2 + ny * w, ex, ey); ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 12; ctx.stroke();
          ctx.strokeStyle = '#4aa3d8'; ctx.lineWidth = 3; ctx.stroke();
          me.g.fx.add({ type: 'drop', x: me.x + me.facing * ex, y: -me.y + ey, vx: rand(-2, 2), vy: rand(-2, 1), g: 0.4, life: 20, size: 3, color: '#bfeaff' }, true);
        },
      }),
    },
    {
      id: 'y_wave', name: 'Fala z Balii', motion: 'qcf', btn: 'P',
      desc: 'Fala sunie po ziemi – trzeba ją blokować kucając.',
      can: me => !me.g.hasProj(me, 'main'),
      make: s => defMove({
        id: 'y_wave', name: 'Fala z Balii', type: 'special', str: 6, total: 44,
        poses: K(STANCE, [[0], [6, { hy: -42, torso: 34, head: -14, aF: [8, 30], aB: [-2, 30], eye: 2 }],
          [12, { hx: 16, hy: -48, torso: 30, head: -8, aF: [66, 22], aB: [58, 26], as: 1.2, mouth: 1, eye: 2, lF: [36, 0] }],
          [30, { hx: 16, hy: -48, torso: 30, head: -8, aF: [64, 22], aB: [56, 26], as: 1.2, eye: 2, lF: [36, 0] }], [44]]),
        proj: [{ f: 12, kind: 'wave', x: 90, y: 30, vx: s === 'H' ? 8.5 : 6, w: 84, h: 60, limit: 'main',
          hit: H({ dmg: 55, chip: 12, hs: 18, bs: 12, kb: 6, guard: 'low', lvl: 'M' }) }],
        sfx: [[12, 'splash']],
        tick(me, opp, g, f) { if (f === 12) g.fx.splash(me.x + me.facing * 80, -10, 10, 0.7); },
      }),
    },
    {
      id: 'y_geyser', name: 'Gejzer', motion: 'qcb', btn: 'P',
      desc: 'Gejzer wybucha pod rywalem i wyrzuca go w górę. LŁ – blisko, MŁ – daleko.',
      can: me => !me.g.hasProj(me, 'geyser'),
      make: s => defMove({
        id: 'y_geyser', name: 'Gejzer', type: 'special', str: 6, total: 40,
        poses: K(STANCE, [[0], [6, { torso: -6, head: -14, aF: [24, -46], aB: [18, -40], eye: 1 }],
          [12, { hy: -50, torso: 22, head: 0, aF: [44, 30], aB: [36, 32], mouth: 1, eye: 2, lF: [30, 0], sq: 0.06 }],
          [28, { hy: -50, torso: 22, head: 0, aF: [44, 30], aB: [36, 32], eye: 2, lF: [30, 0] }], [40]]),
        proj: [{ f: 12, kind: 'geyser', x: s === 'H' ? 400 : 230, y: 140, vx: 0, w: 96, h: 280, life: 52, active: [20, 34], limit: 'geyser',
          hit: H({ dmg: 80, chip: 14, hs: 26, bs: 14, kb: 2, lvl: 'H', launch: [1.5, 16] }) }],
        sfx: [[12, 'bubble']],
      }),
    },
    {
      id: 'y_soap', name: 'Ślizg na Mydle', motion: 'bf', btn: 'K',
      desc: 'Wślizg brzuchem na kostce mydła. Nisko, przewraca, mija pociski.',
      make: s => {
        const SLIDE = { hx: 10, hy: -30, torso: 72, head: -56, aF: [54, 14], aB: [44, 18], lF: [-34, -10], lB: [-54, -8], eye: 2, mouth: 2 };
        return defMove({
          id: 'y_soap', name: 'Ślizg na Mydle', type: 'special', str: 6, total: s === 'H' ? 42 : 34, hurt: 78, fric: 0.965,
          poses: K(STANCE, [[0, { hy: -44, torso: 30, head: -10, aF: [20, 10], aB: [10, 14] }], [3, SLIDE], [s === 'H' ? 30 : 24, SLIDE], [s === 'H' ? 42 : 34]]),
          vel: [[3, s === 'H' ? 12.5 : 10]],
          hits: [{ f: [4, s === 'H' ? 22 : 17], box: [70, 26, 116, 48], dmg: 70, hs: 22, bs: 14, kb: 6, guard: 'low', lvl: 'H', kd: true }],
          sfx: [[5, 'splash']],
          tick(me, opp, g, f) {
            if (f > 5 && f < 26 && f % 3 === 0) g.fx.add({ type: 'flash', x: me.x - me.facing * rand(0, 40), y: -rand(4, 20), size: rand(4, 8), life: 26, vy: -0.5, color: '#e9f8ff', alpha: 0.8 });
          },
          drawExtra(ctx, me, f) {
            if (f < 4 || f > 30) return;
            rrect(ctx, 20, -16, 70, 16, 6);
            ctx.fillStyle = '#ffb3d0'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#24140a'; ctx.stroke();
          },
        });
      },
    },
  ],
  superInfo: { name: 'Wielka Fala', desc: 'Tsunami przez cały ekran – 6 trafień.' },
  superMove: () => defMove({
    id: 'y_super', name: 'Wielka Fala', type: 'super', str: 10, total: 66, invul: [0, 20],
    poses: K(STANCE, [[0, { torso: -12, head: -24, aF: [22, -70], aB: [12, -64], as: 1.15, eye: 1, mouth: 2 }],
      [16, { torso: -14, head: -26, aF: [20, -72], aB: [10, -66], as: 1.15, eye: 2, mouth: 1 }],
      [20, { hx: 16, hy: -46, torso: 36, head: 0, aF: [70, 20], aB: [62, 26], as: 1.2, eye: 2, mouth: 1, lF: [36, 0] }],
      [50, { hx: 16, hy: -46, torso: 36, head: 0, aF: [68, 20], aB: [60, 26], as: 1.2, eye: 2, lF: [36, 0] }], [66]]),
    proj: [{ f: 20, kind: 'tsunami', x: 60, y: 150, vx: 7.2, w: 220, h: 300, hits: 6, interval: 7, life: 170, carry: true, super: true,
      hit: H({ dmg: 46, chip: 10, hs: 26, bs: 14, kb: 2, lvl: 'S', airLaunch: [6, 5] }),
      lastHit: H({ dmg: 70, chip: 14, hs: 30, bs: 14, kb: 6, lvl: 'S', launch: [8, 13] }) }],
    sfx: [[19, 'splash'], [19, 'superHit']],
  }),
  combos: [
    ['Zmywak', 'LŁ, LK, MŁ, ↓↘→+MŁ'],
    ['Na mydle', '↓LK, ↓LK, ←→+MK'],
    ['Pranie', 'MŁ, →↓↘+MŁ'],
    ['Gejzer w górę', '↓MŁ, ↑, LK, MŁ, MK'],
    ['Sztorm', 'LK, MŁ, ↓↘→+MŁ, ↓↘→↓↘→+Ł'],
  ],
  aiCombos: [
    ['s.LP', 's.LK', 's.HP', 'sp:y_wave:HP'],
    ['c.LK', 'c.LK', 'sp:y_soap:LK'],
    ['s.HP', 'sp:y_towel:HP'],
    ['c.HP', 'jump', 'j.LK', 'j.HP', 'j.HK'],
    ['s.LK', 's.HP', 'sp:y_wave:HP', 'super'],
  ],
  zoning: ['sp:y_wave:LP', 'sp:y_wave:HP', 'sp:y_geyser:HP', 'sp:y_geyser:LP'],
  antiAir: 'sp:y_towel:HP',
  easy: { n: 'y_wave', f: 'y_towel', b: 'y_geyser', d: 'y_soap' },
  quotes: ['Ciepła kąpiel i wszystko przechodzi.', 'Następnym razem przynieś ręcznik.', 'Uspokój się, kochanie. Już po wszystkim.'],
};

// ============================ CIEŃ TRZCINY ============================
const CIEN = {
  id: 'cien', name: 'Cień Trzciny', title: 'Ninja z Bagien Pantanalu', style: 'Szybki i podstępny', diff: 3,
  color: '#a98bff',
  desc: 'Nikt nie widział, jak się porusza. Rzuca liśćmi ostrymi jak brzytwa, znika w trzcinach i spada z nieba kopniakiem. Dla cierpliwych i szybkich.',
  hp: 960, walkF: 4.0, walkB: 3.4, jumpV: 17.2, jumpX: 5.0,
  look: lookOf({
    fur: '#7d5a3c', furDark: '#5a3d27', belly: '#9c7552', paw: '#2a1a10', nose: '#2e1c12', outline: '#140b06', voice: 1.08,
    scale: 0.98, girth: 0.9, head: 0.88, upperArm: '#2d2340', thigh: '#2d2340', wrist: '#c9c2dc',
    bodyDeco(ctx, G) {
      const rx = G.rx, ry = G.ry;
      ctx.fillStyle = '#2d2340'; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
      ctx.strokeStyle = '#6a4fa0'; ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(-rx, -ry * 0.8); ctx.lineTo(rx, ry * 0.5); ctx.stroke();
      ctx.fillStyle = '#17111f'; ctx.fillRect(-rx, ry * 0.3, rx * 2, ry * 0.14);
      ctx.fillStyle = '#9c7552';
      ctx.beginPath(); ctx.moveTo(rx * 0.3, -ry); ctx.lineTo(rx, -ry); ctx.lineTo(rx * 0.7, -ry * 0.45); ctx.closePath(); ctx.fill();
    },
    backDeco(ctx, G) {
      ctx.save(); ctx.translate(G.sx - G.ux * 10, G.sy - G.uy * 10 + 4);
      drawRibbons(ctx, { t: G.t, vx: G.vx }, 0, 0, '#6a4fa0', 92, 2, 10);
      ctx.restore();
    },
    headDeco(ctx) {
      ctx.beginPath();
      ctx.moveTo(-32, -22); ctx.lineTo(-24, -44); ctx.lineTo(58, -50); ctx.lineTo(62, -36); ctx.closePath();
      ctx.fillStyle = '#241b30'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#140b06'; ctx.stroke();
      rrect(ctx, 10, -51, 30, 14, 3);
      ctx.fillStyle = '#b8c0cc'; ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#5a6270'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(25, -44, 7, 3.5, -0.3, 0, TAU); ctx.stroke();
      // maska na pyszczek
      ctx.beginPath();
      ctx.moveTo(30, -18); ctx.bezierCurveTo(50, -24, 66, -20, 84, -16); ctx.lineTo(84, 2);
      ctx.bezierCurveTo(78, 12, 60, 16, 40, 16); ctx.bezierCurveTo(30, 6, 28, -6, 30, -18); ctx.closePath();
      ctx.fillStyle = '#241b30'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#140b06'; ctx.stroke();
    },
  }),
  winPoseFn(f, tp) {
    lerpPose(STANCE, mkPose({ torso: 6, head: -4, aF: [36, -30], aB: [30, -26], lF: [10, 0], lB: [-10, 0], eye: 2, mouth: 0 }), Math.min(1, f / 15), tp);
    return tp;
  },
  introPoseFn(f, tp) {
    lerpPose(POSES.crouch, STANCE, clamp((f - 30) / 20, 0, 1), tp);
    return tp;
  },
  specials: [
    {
      id: 'c_crane', name: 'Żurawi Kopniak', motion: 'dp', btn: 'K',
      desc: 'Salto w tył z kopnięciem. Nietykalny na starcie, wyrzuca w górę.',
      make: s => {
        const CRANE = mkPose({ hy: -70, torso: -10, head: -20, lF: [40, -150], ls: 1.35, lB: [-10, -30], aF: [-20, -20], aB: [-30, -10], eye: 2, mouth: 1 });
        const hits = [{ f: [3, 8], box: [46, 150, 84, 130], dmg: s === 'H' ? 55 : 80, hs: 20, launch: [2, 13], lvl: 'H', jp: 0 }];
        if (s === 'H') hits.push({ f: [9, 15], box: [20, 220, 100, 100], dmg: 45, hs: 20, launch: [3, 12], lvl: 'H' });
        return defMove({
          id: 'c_crane', name: 'Żurawi Kopniak', type: 'special', str: 6, total: 80, invul: [0, s === 'H' ? 7 : 4], landLag: 16, trail: true,
          vel: [[3, 2.5, s === 'H' ? 17 : 14]],
          poseFn(me, f, tp) {
            if (f < 3) return POSES.crouch;
            lerpPose(CRANE, CRANE, 0, tp);
            tp.rot = -360 * easeOut(clamp((f - 3) / 24, 0, 1));
            return tp;
          },
          hits, sfx: [[3, 'swingH'], [9, 'swingH']],
        });
      },
    },
    {
      id: 'c_shur', name: 'Liść-Shuriken', motion: 'qcf', btn: 'P', air: true,
      desc: 'Szybki liść. Działa też w powietrzu – leci wtedy skosem w dół.',
      can: me => !me.g.hasProj(me, 'main'),
      make: s => defMove({
        id: 'c_shur', name: 'Liść-Shuriken', type: 'special', str: 6, total: 32,
        poses: K(STANCE, [[0], [5, { hx: -6, torso: 0, aF: [-20, -36], aB: [-24, -20], head: -8, eye: 2 }],
          [9, { hx: 12, torso: 22, aF: [66, -14], as: 1.2, aB: [10, -4], eye: 2, mouth: 1, lF: [32, 0] }],
          [20, { hx: 12, torso: 22, aF: [64, -12], as: 1.2, aB: [10, -4], eye: 2, lF: [32, 0] }], [32]]),
        proj: [{ f: 9, kind: 'shuriken', x: 80, y: 126, vx: s === 'H' ? 14 : 10, w: 36, h: 36, limit: 'main',
          hit: H({ dmg: 40, chip: 8, hs: 15, bs: 10, kb: 4 }) }],
        sfx: [[9, 'shuriken']],
      }),
      makeAir: s => defMove({
        id: 'c_shurA', name: 'Liść-Shuriken', type: 'special', str: 6, total: 26, landLag: 6, endInAir: true, grav: 0.4,
        poses: K(POSES.jumpFall, [[0], [4, { torso: 20, aF: [58, 24], as: 1.2, eye: 2, mouth: 1 }], [18, { torso: 20, aF: [56, 24], as: 1.2, eye: 2 }], [26]]),
        proj: [{ f: 4, kind: 'shuriken', x: 60, y: 80, vx: s === 'H' ? 9 : 7, vy: s === 'H' ? -9 : -7, w: 36, h: 36, limit: 'main',
          hit: H({ dmg: 40, chip: 8, hs: 15, bs: 10, kb: 4, guard: 'high' }) }],
        sfx: [[4, 'shuriken']],
        tick(me, opp, g, f) { if (f === 0) { me.vy = Math.max(me.vy, 2); me.vx *= 0.5; } },
      }),
    },
    {
      id: 'c_tele', name: 'Trzcinowy Teleport', motion: 'dd', btn: 'P',
      desc: 'Znika w liściach. LŁ – za plecami rywala, MŁ – nad jego głową.',
      make: s => defMove({
        id: 'c_tele', name: 'Trzcinowy Teleport', type: 'special', str: 6, total: 34, invul: [0, 24], cancel: false,
        poses: K(STANCE, [[0, { hy: -46, torso: 20, aF: [20, -30], aB: [10, -34], eye: 1 }], [6, { hy: -40, torso: 30, aF: [10, -40], aB: [6, -40], eye: 1 }],
          [20, POSES.crouch], [34]]),
        tick(me, opp, g, f) {
          if (f === 4) { g.fx.leaves(me.x, -110, 22, 7); g.sfx('teleport'); me.hidden = true; me.passThrough = true; }
          if (f === 20) {
            const side = sign(me.x - opp.x) || -opp.facing;
            me.hidden = false; me.passThrough = false;
            if (s === 'L') {
              me.x = g.clampX(opp.x - side * 95);
            } else {
              me.x = g.clampX(opp.x - side * 20);
              me.y = 230; me.airborne = true; me.vy = 0; me.vx = 0;
            }
            me.autoFace();
            g.fx.leaves(me.x, -me.y - 100, 18, 6); g.sfx('teleport');
            if (s === 'H') { me.endMove(); me.airActs = 1; me.jumpDir = 0; }
          }
        },
      }),
    },
    {
      id: 'c_rush', name: 'Szarża Cienia', motion: 'bf', btn: 'P',
      desc: 'Błyskawiczne cięcie na wylot – przelatuje przez rywala.',
      make: s => {
        const RUSH = { hx: 14, hy: -50, torso: 40, head: -20, aF: [70, -6], as: 1.25, aB: [-40, 0], lF: [40, -6], lB: [-50, -10], eye: 2, mouth: 1 };
        return defMove({
          id: 'c_rush', name: 'Szarża Cienia', type: 'special', str: 6, total: 38, trail: true, fric: 0.93,
          poses: K(STANCE, [[0, { hy: -44, torso: 30, aF: [-20, 10], aB: [-30, 6], eye: 2 }], [6, RUSH], [18, RUSH], [38]]),
          vel: [[6, s === 'H' ? 17 : 13]],
          hits: [{ f: [7, 16], box: [60, 110, 100, 120], dmg: 65, hs: 20, bs: 12, kb: 3, lvl: 'H' }],
          sfx: [[6, 'dash'], [8, 'swingH']],
          tick(me, opp, g, f) {
            if (f === 6) me.passThrough = true;
            if (f === 18) me.passThrough = false;
            if (f > 6 && f < 18) g.fx.leaves(me.x, -100, 1, 2);
          },
        });
      },
    },
    {
      id: 'c_dive', name: 'Nurkujący Kopniak', motion: 'down', btn: 'HK', air: 'only',
      desc: 'W powietrzu: ostry kopniak skosem w dół. Odbija się po trafieniu.',
      make: () => defMove({
        id: 'c_dive', name: 'Nurkujący Kopniak', type: 'special', str: 6, total: 200, landLag: 10, grav: 0, trail: true,
        poses: K(POSES.jumpFall, [[0, { torso: -10, lF: [30, -50], lB: [-10, -30] }],
          [4, { torso: -24, head: 20, hx: -6, lF: [70, 26], ls: 1.3, lB: [-16, -30], aF: [0, -40], aB: [-10, -36], eye: 2, mouth: 1 }],
          [200, { torso: -24, head: 20, hx: -6, lF: [70, 26], ls: 1.3, lB: [-16, -30], aF: [0, -40], aB: [-10, -36], eye: 2, mouth: 1 }]]),
        tick(me, opp, g, f) {
          if (f < 3) { me.vx *= 0.5; me.vy = 0; }
          if (f === 3) { me.vx = 8.5 * me.facing; me.vy = -11; g.sfx('swingH'); }
        },
        hits: [{ f: [4, 200], box: [50, 12, 74, 56], dmg: 60, hs: 16, bs: 10, kb: 5, guard: 'high', lvl: 'M',
          onContact(me) { me.vy = 9; me.vx = -3 * me.facing; me.endMove(); me.airActs = 0; } }],
        onLand(me, opp, g) { g.fx.dust(me.x, 0, 8, 0); },
      }),
    },
  ],
  superInfo: { name: 'Tysiąc Liści', desc: 'Doskok, a po trafieniu burza cięć ze wszystkich stron.' },
  superMove: () => {
    const SLASH = mkPose({ hx: 10, torso: 30, head: -10, aF: [70, 20], as: 1.25, aB: [-30, -20], lF: [40, 0], lB: [-40, 0], eye: 2, mouth: 1 });
    return defMove({
      id: 'c_super', name: 'Tysiąc Liści', type: 'super', str: 10, total: 46, invul: [0, 30], trail: true, fric: 1,
      poses: K(STANCE, [[0, { hy: -44, torso: 34, aF: [-20, 10], aB: [-30, 6], eye: 2 }], [6, SLASH], [40, SLASH], [46]]),
      vel: [[6, 17]],
      hits: [{ f: [7, 22], box: [60, 110, 110, 170], dmg: 30, hs: 60, bs: 16, kb: 0, lvl: 'S',
        onContact(me, opp, g, blocked) {
          if (blocked) return;
          me.mv.cine = 0; me.mv.total = me.mf + 110; me.vx = 0; me.invul = 120;
          g.hold(opp, me, POSES.hurtHigh);
        } }],
      tick(me, opp, g, f) {
        if (me.mv.cine === undefined) { if (f === 22) me.vx = 0; return; }
        const c = me.mv.cine++;
        me.vx = 0;
        if (c < 80 && c % 8 === 0) {
          const i = c / 8, a = i * 2.4;
          me.x = opp.x + Math.cos(a) * 110;
          me.y = Math.max(0, opp.y + 30 + Math.sin(a) * 80);
          me.facing = me.x < opp.x ? 1 : -1;
          const cx = opp.x, cy = -opp.y - 110;
          const la = rand(0, Math.PI);
          g.fx.add({ type: 'slash', x: cx - Math.cos(la) * 120, y: cy - Math.sin(la) * 120, x2: cx + Math.cos(la) * 120, y2: cy + Math.sin(la) * 120, life: 12, size: 10, color: '#ffffff' }, true);
          g.fx.leaves(cx, cy, 6, 6);
          g.directDamage(me, opp, 24, 'S');
          g.sfx(i % 2 ? 'swingH' : 'hitM');
        }
        me.hidden = c < 80 && c % 8 > 4;
        if (c === 80) {
          me.hidden = false;
          me.y = 0;
          me.x = g.clampX(opp.x - me.facing * 90);
          me.autoFace();
          opp.y = Math.max(opp.y, 0);
        }
        if (c === 88) {
          g.fx.add({ type: 'slash', x: opp.x - 60, y: -opp.y - 20, x2: opp.x + 60, y2: -opp.y - 220, life: 16, size: 16, color: '#d6c8ff' }, true);
          g.releaseHeld(opp, me, { dmg: 60, launch: [5, 15], lvl: 'S' });
        }
      },
      poseFn(me, f, tp) {
        if (me.mv.cine === undefined || me.mv.cine > 84) return keyPose(this.poses, Math.max(0, f), tp);
        lerpPose(SLASH, SLASH, 0, tp);
        if (me.mv.cine >= 80) { tp.aF = [30, -80]; tp.torso = -4; }
        return tp;
      },
    });
  },
  combos: [
    ['Szybkie łapki', 'LŁ, LK, MŁ, ←→+MŁ'],
    ['Żuraw', 'LK, MŁ, →↓↘+MK'],
    ['Zamiatacz', '↓LK, ↓LK, ↓MK'],
    ['Z nieba', 'skok ↓+MK, ↓LK, MŁ, ←→+MŁ'],
    ['Powietrzny', '↓MŁ, ↑, LŁ, LK, MŁ, MK, →↓↘+MK'],
  ],
  aiCombos: [
    ['s.LP', 's.LK', 's.HP', 'sp:c_rush:HP'],
    ['c.LK', 'c.LK', 'c.HK'],
    ['s.LK', 's.HP', 'sp:c_crane:HK'],
    ['c.HP', 'jump', 'j.LP', 'j.LK', 'j.HP', 'j.HK', 'land', 'sp:c_crane:HK'],
    ['s.LP', 's.HP', 'sp:c_rush:HP', 'super'],
  ],
  zoning: ['sp:c_shur:LP', 'sp:c_shur:HP', 'sp:c_tele:LP'],
  antiAir: 'sp:c_crane:HK',
  easy: { n: 'c_shur', f: 'c_crane', b: 'c_tele', d: 'c_rush', airN: 'c_shur', airD: 'c_dive' },
  quotes: ['Nie widziałeś mnie. Nikt mnie nie widzi.', 'Trzcina się ugina, ale nie łamie.', 'Za wolno. Zdecydowanie za wolno.'],
};

// ============================ GRUBY BRUNO ============================
const BRUNO = {
  id: 'bruno', name: 'Gruby Bruno', title: 'Sumo z Zalewu Rio', style: 'Zapaśnik', diff: 2,
  color: '#ffd23f',
  desc: 'Najcięższa kapibara w Ameryce Południowej i dumny sumita. Wolny, ale kiedy złapie – boli. Szarża brzuchem wytrzymuje jeden cios.',
  hp: 1120, walkF: 2.7, walkB: 2.3, jumpV: 15.2, jumpX: 4.0,
  look: lookOf({
    fur: '#8f5a35', furDark: '#663c20', belly: '#c99363', paw: '#3d2414', nose: '#3c2214', voice: 0.72,
    scale: 1.1, girth: 1.28, head: 0.92,
    bodyDeco(ctx, G) {
      ctx.strokeStyle = 'rgba(60,30,10,0.35)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(G.rx * 0.55, G.ry * 0.12, 4, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(G.rx * 0.3, -G.ry * 0.55); ctx.quadraticCurveTo(G.rx * 0.5, -G.ry * 0.45, G.rx * 0.7, -G.ry * 0.55); ctx.stroke();
    },
    hipDeco(ctx, G) {
      const x0 = G.hx - 52, x1 = G.hx + 58, y0 = G.hy - 24;
      rrect(ctx, x0, y0, x1 - x0, 28, 8);
      ctx.fillStyle = '#22305e'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#24140a'; ctx.stroke();
      ctx.strokeStyle = '#e1b13a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0 + 6, y0 + 6); ctx.lineTo(x1 - 6, y0 + 6); ctx.stroke();
      ctx.strokeStyle = '#e1b13a'; ctx.lineWidth = 3.5;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(G.hx + 28 + i * 7, y0 + 26); ctx.lineTo(G.hx + 26 + i * 7 + Math.sin(G.t * 0.1 + i) * 2, y0 + 50); ctx.stroke();
      }
    },
    headDeco(ctx) {
      ctx.fillStyle = '#2a170b'; ctx.strokeStyle = '#24140a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(-2, -60, 12, 8, -0.2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(10, -62, 8, 5, 0.3, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#e1b13a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(4, -67); ctx.lineTo(4, -55); ctx.stroke();
      ctx.save(); ctx.translate(52, -44); ctx.rotate(0.35);
      rrect(ctx, -10, -4, 20, 8, 3); ctx.fillStyle = '#f2d2a0'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#7a5530'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-3, 4); ctx.moveTo(3, -4); ctx.lineTo(3, 4); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#2a170b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(12, -45); ctx.lineTo(32, -43); ctx.stroke();
    },
  }),
  stance: mkPose({ hy: -56, torso: 6, head: -4, aF: [40, 4], aB: [34, 10], lF: [30, 0], lB: [-32, 0] }),
  winPoseFn(f, tp) {
    const k = Math.min(1, f / 15);
    lerpPose(STANCE, mkPose({ hy: -54, torso: -4, head: -16, aF: [10, -56], aB: [-10, -56], as: 1.05, lF: [34, 0], lB: [-34, 0], eye: 1, mouth: 2 }), k, tp);
    tp.hy += Math.abs(Math.sin(f * 0.12)) * -6;
    return tp;
  },
  introPoseFn(f, tp) {
    const k = f % 40 / 40;
    lerpPose(STANCE, mkPose({ hy: -48, torso: 12, lF: [30, -40 * Math.sin(k * Math.PI)], lB: [-36, 0], aF: [40, 10], aB: [30, 14] }), f < 70 ? 1 : 0, tp);
    return tp;
  },
  specials: [
    {
      id: 'b_lariat', name: 'Młyn Łap', motion: 'dp', btn: 'P',
      desc: 'Wirujący młyn z rozłożonymi łapami. Ciosy w głowę przelatują nad nim.',
      make: s => {
        const LAR = mkPose({ hy: -58, torso: 2, head: -10, aF: [62, -26], aB: [-62, -26], as: 1.15, eye: 2, mouth: 1 });
        const starts = s === 'H' ? [6, 14, 22, 30] : [6, 14, 22];
        return defMove({
          id: 'b_lariat', name: 'Młyn Łap', type: 'special', str: 6, total: starts[starts.length - 1] + 18, hurt: 120, fric: 1,
          vel: [[4, s === 'H' ? 3.5 : 2.2]],
          poseFn(me, f, tp) {
            lerpPose(LAR, LAR, 0, tp);
            if (f < starts[starts.length - 1] + 6) tp.fx = Math.cos(f * 0.4);
            else { lerpPose(LAR, STANCE, (f - starts[starts.length - 1] - 6) / 12, tp); me.vx *= 0.8; }
            return tp;
          },
          hits: starts.map((s0, i) => ({ f: [s0, s0 + 2], box: [0, 150, 250, 90], dmg: 38, hs: 18, bs: 10, kb: 4, lvl: 'M',
            airLaunch: [3, 9], launch: i === starts.length - 1 ? [4, 11] : null })),
          sfx: [[4, 'spin'], [18, 'spin']],
        });
      },
    },
    {
      id: 'b_grab', name: 'Bagienny Suplex', motion: 'dd', btn: 'P',
      desc: 'Chwyt, którego nie da się zablokować. LŁ – dalej, MŁ – mocniej.',
      make: s => {
        const ARCH = mkPose({ hx: -20, hy: -50, torso: -70, head: -60, aF: [-40, -60], aB: [-36, -56], lF: [30, 0], lB: [0, 0], eye: 2, mouth: 1 });
        const poses = K(STANCE, [[0], [4, { hx: 18, torso: 32, head: -4, aF: [64, -4], aB: [58, 2], as: 1.15, eye: 2, mouth: 3 }],
          [16, { hx: 18, torso: 32, head: -4, aF: [62, -4], aB: [56, 2], as: 1.15, eye: 2 }], [42]]);
        return defMove({
          id: 'b_grab', name: 'Bagienny Suplex', type: 'special', str: 6, total: 42, poses,
          grab: { f: [4, 6], range: s === 'L' ? 125 : 105, cmd: true },
          onGrab(me, opp, g) {
            me.mv.gf = me.mf; me.mv.total = me.mf + 64; me.mv.victim = opp; me.mv.dmg = s === 'L' ? 140 : 175;
            g.hold(opp, me); g.sfx('grab'); me.invul = 64;
          },
          poseFn(me, f, tp) {
            if (me.mv.gf === undefined) return keyPose(poses, Math.max(0, f), tp);
            const k = f - me.mv.gf;
            if (k < 14) return lerpPose(POSES.grab, POSES.lift, k / 14, tp);
            if (k < 30) return lerpPose(POSES.lift, ARCH, easeIn((k - 14) / 16), tp);
            if (k < 48) return lerpPose(ARCH, ARCH, 0, tp);
            return lerpPose(ARCH, STANCE, (k - 48) / 16, tp);
          },
          tick(me, opp, g, f) {
            if (me.mv.gf === undefined) return;
            const k = f - me.mv.gf, v = me.mv.victim;
            if (k <= 30 && v.state === 'held') {
              let dx, dy;
              if (k <= 14) { const t = k / 14; dx = lerp(80, 10, t); dy = lerp(30, 175, easeOut(t)); }
              else { const t = (k - 14) / 16; dx = lerp(10, -110, easeIn(t)); dy = lerp(175, 20, easeIn(t)); }
              g.place(v, me, dx, dy, mkPose({ rot: -k * 7 }, POSES.airHit));
            }
            if (k === 30) {
              g.releaseHeld(v, me, { dmg: me.mv.dmg, launch: [-1.5, 3], lvl: 'H' });
              g.shake(14); g.fx.shock(me.x - me.facing * 100, 0, '#e8d3a8'); g.fx.dust(me.x - me.facing * 100, 0, 22, 0); g.sfx('slam');
            }
          },
        });
      },
    },
    {
      id: 'b_charge', name: 'Brzuchowa Szarża', motion: 'bf', btn: 'P',
      desc: 'Szarża brzuchem. Wytrzymuje jeden cios i mocno odrzuca.',
      make: s => {
        const CH = { hx: 16, hy: -56, torso: -16, head: 10, aF: [-26, 20], aB: [-34, 16], lF: [40, -4], lB: [-40, 0], eye: 2, mouth: 3 };
        return defMove({
          id: 'b_charge', name: 'Brzuchowa Szarża', type: 'special', str: 6, total: 48, armor: [3, 22], fric: 0.97,
          poses: K(STANCE, [[0, { hx: -10, torso: -6, aF: [-20, 10], aB: [-26, 8], eye: 2 }], [4, CH], [24, CH], [48]]),
          vel: [[4, s === 'H' ? 10.5 : 8]],
          hits: [{ f: [5, 22], box: [70, 95, 84, 150], dmg: 90, hs: 24, bs: 16, kb: 12, lvl: 'H', airLaunch: [7, 9],
            onContact(me) { me.vx *= 0.2; } }],
          sfx: [[4, 'dash']],
          tick(me, opp, g, f) { if (f > 4 && f < 24 && f % 4 === 0) g.fx.dust(me.x - me.facing * 30, 0, 2, -me.facing); },
        });
      },
    },
    {
      id: 'b_stomp', name: 'Bagienne Tupnięcie', motion: 'dd', btn: 'K',
      desc: 'Fala uderzeniowa po ziemi w obie strony. Przewraca stojących i kucających.',
      make: s => defMove({
        id: 'b_stomp', name: 'Bagienne Tupnięcie', type: 'special', str: 6, total: 46,
        poses: K(STANCE, [[0], [12, { hy: -64, torso: -12, head: -14, lF: [30, -74], ls: 1.1, aF: [34, -40], aB: [28, -36], eye: 2 }],
          [16, { hy: -46, torso: 16, head: 8, lF: [44, 0], aF: [40, 10], aB: [34, 14], sq: 0.1, eye: 2, mouth: 3 }],
          [30, { hy: -46, torso: 16, head: 8, lF: [44, 0], aF: [40, 10], aB: [34, 14], eye: 2 }], [46]]),
        hits: [{ f: [16, 19], box: [0, 24, s === 'H' ? 460 : 340, 44], dmg: 60, hs: 24, bs: 14, kb: 6, guard: 'low', lvl: 'H', kd: true, groundOnly: true }],
        tick(me, opp, g, f) {
          if (f === 16) {
            g.shake(10); g.fx.shock(me.x + me.facing * 40, 0, '#d9c49a'); g.fx.dust(me.x + me.facing * 40, 0, 16, 0); g.sfx('slam');
          }
        },
      }),
    },
    {
      id: 'b_splash', name: 'Lecący Brzuch', motion: 'qcf', btn: 'K',
      desc: 'Skok i lądowanie całym cielskiem. Cios z góry.',
      make: s => defMove({
        id: 'b_splash', name: 'Lecący Brzuch', type: 'special', str: 6, total: 120, landLag: 18,
        vel: [[8, s === 'H' ? 6.5 : 4.5, s === 'H' ? 13 : 11]],
        poseFn(me, f, tp) {
          if (f < 8) return lerpPose(STANCE, POSES.preJump, f / 8, tp);
          if (me.vy > 2) return lerpPose(POSES.jumpUp, POSES.tuck, 0.4, tp);
          return lerpPose(POSES.tuck, FLOP, clamp((2 - me.vy) / 6, 0, 1), tp);
        },
        hits: [{ f: [12, 120], cond: me => me.vy < 2, box: [30, 50, 170, 90], dmg: 90, hs: 24, guard: 'high', lvl: 'H', kd: true, launch: [3, 7] }],
        onLand(me, opp, g) { g.shake(9); g.fx.shock(me.x + me.facing * 40, 0, '#e8d3a8'); g.fx.dust(me.x + me.facing * 40, 0, 18, 0); g.sfx('slam'); },
        sfx: [[8, 'jump']],
      }),
    },
  ],
  superInfo: { name: 'Bomba z Trampoliny', desc: 'Chwyt z bliska, lot w chmury i lądowanie, od którego drży ziemia.' },
  superMove: () => {
    const LIFT = POSES.lift;
    return defMove({
      id: 'b_super', name: 'Bomba z Trampoliny', type: 'super', str: 10, total: 50, invul: [0, 6],
      poses: K(STANCE, [[0, { hx: 18, torso: 30, aF: [66, -4], aB: [60, 2], as: 1.2, eye: 2, mouth: 3 }],
        [12, { hx: 18, torso: 30, aF: [64, -4], aB: [58, 2], as: 1.2, eye: 2, mouth: 3 }], [50]]),
      grab: { f: [1, 7], range: 150, cmd: true },
      onGrab(me, opp, g) {
        me.mv.gf = me.mf; me.mv.total = me.mf + 100; me.mv.victim = opp; me.invul = 110;
        g.hold(opp, me); g.sfx('grab');
      },
      poseFn(me, f, tp) {
        if (me.mv.gf === undefined) return keyPose(this.poses, Math.max(0, f), tp);
        const k = f - me.mv.gf;
        if (k < 10) return lerpPose(POSES.grab, POSES.preJump, k / 10, tp);
        if (k < 56) return lerpPose(LIFT, LIFT, 0, tp);
        if (k < 68) return lerpPose(FLOP, FLOP, 0, tp);
        return lerpPose(POSES.crouch, STANCE, (k - 68) / 30, tp);
      },
      tick(me, opp, g, f) {
        if (me.mv.gf === undefined) return;
        const k = f - me.mv.gf, v = me.mv.victim;
        if (k === 10) { g.sfx('jump'); g.fx.dust(me.x, 0, 20, 0); g.shake(6); }
        if (k >= 10 && k < 34) me.y = easeIn((k - 10) / 24) * 950;
        if (k === 40) g.sfx('whistle');
        if (k >= 56 && k < 66) me.y = 950 * (1 - easeIn((k - 56) / 10));
        if (k === 66) {
          me.y = 0;
          g.releaseHeld(v, me, { dmg: 310, launch: [1.5, 6], lvl: 'S' });
          g.shake(24); g.flashScreen('#ffffff', 0.7);
          g.fx.shock(me.x, 0, '#fff2c4'); g.fx.shock(me.x, 0, '#e8d3a8'); g.fx.dust(me.x, 0, 36, 0);
          g.sfx('slam'); g.sfx('superHit');
        }
        if (k < 66 && v.state === 'held') {
          const dy = k < 56 ? me.y + 175 : me.y - 30;
          g.place(v, me, k < 10 ? lerp(80, 0, k / 10) : 0, Math.max(0, k < 10 ? lerp(30, 175, k / 10) : dy),
            mkPose({ rot: k < 56 ? 180 : 170 }, POSES.airHit));
        }
      },
    });
  },
  combos: [
    ['Klaps i szarża', 'LŁ, MŁ, ←→+MŁ'],
    ['Podstęp', '↓LK, ↓↓+LŁ (chwyt)'],
    ['Wielki młyn', 'LK, MŁ, →↓↘+MŁ'],
    ['Z góry', 'skok MŁ, MŁ, ↓↘→+MK'],
    ['Trampolina', '↓LK, MŁ, ←→+MŁ, ↓↘→↓↘→+Ł'],
  ],
  aiCombos: [
    ['s.LP', 's.HP', 'sp:b_charge:HP'],
    ['c.LK', 'c.LK', 'c.HK'],
    ['s.LK', 's.HK'],
    ['c.HP', 'jump', 'j.HP', 'j.HK'],
    ['s.LK', 's.HP', 'sp:b_lariat:HP'],
  ],
  zoning: ['sp:b_charge:HP', 'sp:b_splash:HK', 'sp:b_stomp:HK'],
  antiAir: 'sp:b_lariat:HP',
  easy: { n: 'b_splash', f: 'b_lariat', b: 'b_charge', d: 'b_grab' },
  cmdGrab: 'sp:b_grab:HP',
  quotes: ['Mniej gadania, więcej jedzenia.', 'Grawitacja to mój najlepszy przyjaciel.', 'Uważaj na brzuch. Wszyscy uważają na brzuch.'],
};

const CHARACTERS = [KAPI, YUZU, CIEN, BRUNO];

// ---------------- Pociski: rysowanie ----------------
const PROJ_DRAW = {
  orange(ctx, p) {
    for (let i = 1; i <= 3; i++) {
      ctx.globalAlpha = 0.18 / i;
      drawOrange(ctx, p.x - p.vx * p.dir * i * 2.5, -p.y, 24, p.t * 0.3 * p.dir);
    }
    ctx.globalAlpha = 1;
    drawOrange(ctx, p.x, -p.y, 25, p.t * 0.3 * p.dir);
  },
  megaOrange(ctx, p) {
    const g = ctx.createRadialGradient(p.x, -p.y, 10, p.x, -p.y, 120);
    g.addColorStop(0, 'rgba(255,200,80,0.6)'); g.addColorStop(1, 'rgba(255,140,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, -p.y, 120, 0, TAU); ctx.fill();
    for (let i = 1; i <= 4; i++) {
      ctx.globalAlpha = 0.25 / i;
      drawOrange(ctx, p.x - p.dir * i * 34, -p.y, 64 - i * 6, p.t * 0.2 * p.dir);
    }
    ctx.globalAlpha = 1;
    drawOrange(ctx, p.x, -p.y, 70, p.t * 0.2 * p.dir);
  },
  wave(ctx, p) {
    const x = p.x, d = p.dir, h = 54 + Math.sin(p.t * 0.4) * 6;
    ctx.beginPath();
    ctx.moveTo(x - d * 60, 0);
    ctx.quadraticCurveTo(x - d * 20, -h * 0.6, x + d * 10, -h);
    ctx.quadraticCurveTo(x + d * 42, -h * 1.05, x + d * 40, -h * 0.55);
    ctx.quadraticCurveTo(x + d * 30, -h * 0.75, x + d * 26, -h * 0.4);
    ctx.quadraticCurveTo(x + d * 40, -10, x + d * 50, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, '#e9fbff'); g.addColorStop(0.4, '#6fd0f5'); g.addColorStop(1, '#2a8fd0');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#1b5f8f'; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(x + d * (8 + i * 7), -h + 4 + Math.sin(p.t * 0.5 + i) * 3, 4 - i * 0.5, 0, TAU); ctx.fill();
    }
  },
  geyser(ctx, p) {
    const x = p.x;
    if (p.t < p.active[0]) {
      ctx.fillStyle = 'rgba(160,220,255,0.8)';
      for (let i = 0; i < 6; i++) {
        const bx = x + Math.sin(p.t * 0.7 + i * 2) * 30, by = -((p.t * 3 + i * 9) % 30);
        ctx.beginPath(); ctx.arc(bx, by, 3 + (i % 3), 0, TAU); ctx.fill();
      }
      ctx.fillStyle = 'rgba(40,110,170,0.5)';
      ctx.beginPath(); ctx.ellipse(x, 0, 46, 10, 0, 0, TAU); ctx.fill();
      return;
    }
    const k = clamp((p.t - p.active[0]) / 5, 0, 1) * (p.t > p.active[1] ? clamp(1 - (p.t - p.active[1]) / 14, 0, 1) : 1);
    const h = 290 * k;
    const g = ctx.createLinearGradient(0, -h, 0, 0);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#a8e6ff'); g.addColorStop(1, '#3aa0e0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 40, 0);
    for (let y = 0; y <= h; y += 20) ctx.lineTo(x - 34 - Math.sin(y * 0.05 + p.t * 0.6) * 8, -y);
    ctx.arc(x, -h, 36, Math.PI, 0);
    for (let y = h; y >= 0; y -= 20) ctx.lineTo(x + 34 + Math.sin(y * 0.05 + p.t * 0.6 + 1) * 8, -y);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,90,150,0.7)'; ctx.stroke();
  },
  shuriken(ctx, p) {
    ctx.save();
    ctx.translate(p.x, -p.y);
    ctx.rotate(p.t * 0.5);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(TAU / 4);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.quadraticCurveTo(10, -6, 22, -2); ctx.quadraticCurveTo(10, 4, 0, 0);
      ctx.fillStyle = '#6fd04f'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#1f4f16'; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fillStyle = '#1f4f16'; ctx.fill();
    ctx.restore();
  },
  tsunami(ctx, p) {
    const x = p.x, d = p.dir, H = 300, t = p.t;
    ctx.beginPath();
    ctx.moveTo(x - d * 150, 0);
    ctx.bezierCurveTo(x - d * 120, -H * 0.5, x - d * 60, -H * 0.95, x + d * 30, -H);
    ctx.bezierCurveTo(x + d * 110, -H * 1.02, x + d * 130, -H * 0.7, x + d * 90, -H * 0.62);
    ctx.bezierCurveTo(x + d * 70, -H * 0.75, x + d * 50, -H * 0.6, x + d * 70, -H * 0.4);
    ctx.bezierCurveTo(x + d * 90, -H * 0.2, x + d * 110, -40, x + d * 120, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -H, 0, 0);
    g.addColorStop(0, '#f0fdff'); g.addColorStop(0.25, '#7fd8f7'); g.addColorStop(0.7, '#2b8fd0'); g.addColorStop(1, '#174f8a');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#123f6e'; ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 9; i++) {
      ctx.beginPath(); ctx.arc(x + d * (-20 + i * 14), -H + 2 + Math.sin(t * 0.4 + i) * 6, 9 - i * 0.6, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(x - d * 40 + d * i * 20, -H * 0.5 + i * 30, 30, d > 0 ? -0.5 : Math.PI - 1.2, d > 0 ? 1.2 : Math.PI + 0.5); ctx.stroke();
    }
    // rybka dla towarzystwa
    const fx = x + d * (60 + Math.sin(t * 0.2) * 20), fy = -H * 0.45 + Math.cos(t * 0.2) * 30;
    ctx.fillStyle = '#ff8a5c';
    ctx.beginPath(); ctx.ellipse(fx, fy, 12, 7, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(fx - d * 10, fy); ctx.lineTo(fx - d * 20, fy - 7); ctx.lineTo(fx - d * 20, fy + 7); ctx.fill();
  },
};
