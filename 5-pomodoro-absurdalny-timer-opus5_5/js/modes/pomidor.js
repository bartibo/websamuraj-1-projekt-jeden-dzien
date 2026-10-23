'use strict';
/* Tryb: Pomidor Przemijania – gąsienica Grażyna zjada pomidora w tempie upływu czasu. */

A.defineMode({
  id: 'pomidor', name: 'Pomidor Przemijania', icon: '🍅', breakOk: false,
  tagline: 'Gąsienica Grażyna je pomidora dokładnie w tempie Twojego zadania.',
  create(host) {
    const C = makeCanvas(host);
    const off = document.createElement('canvas');
    const og = off.getContext('2d');
    const cap = el('div', 'mode-caption');
    host.appendChild(cap);

    // Kęsy: kolumnami od prawej do lewej, z zygzakiem
    const bites = [];
    const COLS = 9, ROWS = 8;
    for (let c = 0; c < COLS; c++) {
      const x = 1.05 - c * (2.1 / (COLS - 1));
      for (let r0 = 0; r0 < ROWS; r0++) {
        const r = c % 2 ? ROWS - 1 - r0 : r0;
        const y = -1.0 + r * (2.0 / (ROWS - 1));
        if (Math.hypot(x, y) < 1.18) bites.push({ x: x + rand(-0.04, 0.04), y: y + rand(-0.04, 0.04), s: rand(0.24, 0.3) });
      }
    }
    const N = bites.length;
    let shown = -1, crumbs = [], chew = 0, t = 0;

    const LINES = [
      [0, 'Cześć! Jestem pomidorem. Pilnuję Twojego czasu.'],
      [0.15, 'Czy ktoś mnie… podgryza?'],
      [0.3, 'Hej! To był mój bok! Potrzebowałem go!'],
      [0.5, 'Pół pomidora to wciąż pomidor. Tak sobie powtarzam.'],
      [0.7, 'Grażyna, porozmawiajmy jak owoc z owadem.'],
      [0.85, 'Widzę światło… i szypułkę.'],
      [0.96, 'Było pięknie. Pamiętaj mnie w sałatce.'],
    ];

    function drawTomato(g, R, p) {
      g.save();
      // ciało
      const grd = g.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.05);
      grd.addColorStop(0, '#ff8a6b'); grd.addColorStop(0.45, '#ec3d24'); grd.addColorStop(1, '#a51d10');
      g.fillStyle = grd;
      g.beginPath();
      g.ellipse(0, 0, R * 1.06, R, 0, 0, TAU);
      g.fill();
      // płaty
      g.strokeStyle = 'rgba(120,10,0,.25)'; g.lineWidth = R * 0.03;
      for (const a of [-0.5, 0, 0.5]) { g.beginPath(); g.ellipse(a * R * 0.9, 0, R * 0.32, R * 0.95, 0, -1.2, 1.2); g.stroke(); }
      // odblask
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath(); g.ellipse(-R * 0.45, -R * 0.5, R * 0.22, R * 0.12, -0.6, 0, TAU); g.fill();
      // twarz
      const eyeY = -R * 0.08, eyeX = R * 0.3;
      g.fillStyle = '#2a1410';
      if (p < 0.85) {
        const er = R * (p > 0.6 ? 0.1 : 0.08);
        for (const sx of [-1, 1]) {
          g.fillStyle = '#fff'; g.beginPath(); g.arc(sx * eyeX, eyeY, er * 1.4, 0, TAU); g.fill();
          g.fillStyle = '#2a1410'; g.beginPath(); g.arc(sx * eyeX + R * 0.02, eyeY + R * 0.01, er * (p > 0.6 ? 0.45 : 0.75), 0, TAU); g.fill();
        }
        // brwi zmartwione
        if (p > 0.15) {
          g.strokeStyle = '#2a1410'; g.lineWidth = R * 0.035; g.lineCap = 'round';
          const tilt = Math.min(1, (p - 0.15) * 3) * R * 0.08;
          for (const sx of [-1, 1]) {
            g.beginPath(); g.moveTo(sx * (eyeX - R * 0.12), eyeY - R * 0.2 - tilt); g.lineTo(sx * (eyeX + R * 0.1), eyeY - R * 0.2); g.stroke();
          }
        }
      } else {
        // oczy zamknięte – spokój
        g.strokeStyle = '#2a1410'; g.lineWidth = R * 0.035; g.lineCap = 'round';
        for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * eyeX, eyeY, R * 0.08, 0.2, Math.PI - 0.2); g.stroke(); }
      }
      // usta
      g.strokeStyle = '#2a1410'; g.fillStyle = '#5a0f08'; g.lineWidth = R * 0.035;
      const my = R * 0.28;
      g.beginPath();
      if (p < 0.15) { g.arc(0, my - R * 0.08, R * 0.16, 0.25, Math.PI - 0.25); g.stroke(); }
      else if (p < 0.5) { g.moveTo(-R * 0.12, my); g.quadraticCurveTo(0, my - R * 0.06, R * 0.12, my); g.stroke(); }
      else if (p < 0.85) { g.ellipse(0, my, R * 0.09, R * 0.12, 0, 0, TAU); g.fill(); }
      else { g.moveTo(-R * 0.1, my); g.lineTo(R * 0.1, my); g.stroke(); }
      // rumieńce
      g.fillStyle = 'rgba(255,170,170,.35)';
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * R * 0.52, R * 0.12, R * 0.12, R * 0.07, 0, 0, TAU); g.fill(); }
      g.restore();
    }

    function drawStem(g, R) {
      g.save();
      g.translate(0, -R * 0.95);
      g.fillStyle = '#3c8d3a'; g.strokeStyle = '#1f5a20'; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        g.save(); g.rotate(i / 6 * TAU + 0.3);
        g.beginPath(); g.ellipse(0, -R * 0.15, R * 0.07, R * 0.2, 0, 0, TAU); g.fill(); g.stroke();
        g.restore();
      }
      g.fillStyle = '#2f7a2c';
      g.beginPath(); g.roundRect ? g.roundRect(-R * 0.04, -R * 0.32, R * 0.08, R * 0.3, R * 0.03) : g.rect(-R * 0.04, -R * 0.32, R * 0.08, R * 0.3); g.fill();
      g.restore();
    }

    function drawCaterpillar(g, x, y, R, p, t, chewing) {
      const segR = R * (0.085 + p * 0.06);
      const n = 7;
      g.save();
      for (let i = n - 1; i >= 0; i--) {
        const sx = x + i * segR * 1.45 + Math.sin(t * 6 - i) * segR * 0.15;
        const sy = y + Math.sin(t * 5 + i * 0.9) * segR * 0.35 + i * segR * 0.25;
        g.fillStyle = i % 2 ? '#7fc34a' : '#5aa632';
        g.strokeStyle = '#2d5d18'; g.lineWidth = 2;
        g.beginPath(); g.arc(sx, sy, segR * (i === 0 ? 1.15 : 1), 0, TAU); g.fill(); g.stroke();
        if (i > 0) { g.fillStyle = '#2d5d18'; g.fillRect(sx - 1, sy + segR * 0.8, 2, segR * 0.5); }
      }
      // głowa
      const hx = x, hy = y + Math.sin(t * 5) * segR * 0.35;
      g.fillStyle = '#fff';
      for (const dx of [-0.35, 0.35]) { g.beginPath(); g.arc(hx + dx * segR, hy - segR * 0.25, segR * 0.32, 0, TAU); g.fill(); }
      g.fillStyle = '#111';
      for (const dx of [-0.35, 0.35]) { g.beginPath(); g.arc(hx + dx * segR - segR * 0.08, hy - segR * 0.25, segR * 0.15, 0, TAU); g.fill(); }
      g.strokeStyle = '#111'; g.lineWidth = 2;
      g.beginPath();
      const mo = chewing ? Math.abs(Math.sin(t * 25)) * segR * 0.3 : 0;
      g.ellipse(hx - segR * 0.2, hy + segR * 0.35, segR * 0.25, 0.5 + mo, 0, 0, TAU); g.stroke();
      // czułki
      g.beginPath();
      g.moveTo(hx - segR * 0.3, hy - segR * 0.8); g.quadraticCurveTo(hx - segR * 0.6, hy - segR * 1.8, hx - segR * 0.9, hy - segR * 1.7);
      g.moveTo(hx + segR * 0.3, hy - segR * 0.8); g.quadraticCurveTo(hx + segR * 0.2, hy - segR * 1.9, hx + segR * 0.4, hy - segR * 1.9);
      g.stroke();
      g.fillStyle = '#e5432f';
      g.beginPath(); g.arc(hx - segR * 0.9, hy - segR * 1.7, segR * 0.15, 0, TAU); g.arc(hx + segR * 0.4, hy - segR * 1.9, segR * 0.15, 0, TAU); g.fill();
      g.restore();
    }

    return {
      frame(s, dt) {
        C.fit();
        const { g, w, h } = C;
        t += dt;
        const p = s.p;
        const k = Math.min(N, Math.floor(p * N + 1e-9));
        if (shown >= 0 && k > shown) {
          chew = 0.8;
          A.audio.sfx.bite();
          const b = bites[k - 1];
          for (let i = 0; i < 14; i++) crumbs.push({ bx: b.x, by: b.y, vx: rand(-1, 1.5), vy: rand(-2.5, -0.5), life: 1, seed: Math.random() < 0.3 });
        }
        shown = k;
        chew = Math.max(0, chew - dt);

        g.clearRect(0, 0, w, h);
        // tło: obrus w kratkę
        const cell = 36;
        g.fillStyle = '#fbf3e4'; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(229,67,47,.09)';
        for (let x = 0; x < w; x += cell * 2) g.fillRect(x, 0, cell, h);
        for (let y = 0; y < h; y += cell * 2) g.fillRect(0, y, w, cell);

        const R = Math.min(w * 0.3, h * 0.33);
        const cx = w / 2, cy = h * 0.5;

        // talerz
        g.fillStyle = 'rgba(0,0,0,.08)';
        g.beginPath(); g.ellipse(cx, cy + R * 1.05, R * 1.5, R * 0.28, 0, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.strokeStyle = '#d8cdbb'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(cx, cy + R * 0.95, R * 1.45, R * 0.3, 0, 0, TAU); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(cx, cy + R * 0.95, R * 1.0, R * 0.18, 0, 0, TAU); g.stroke();

        // pomidor na osobnym płótnie, kęsy wycinane
        const S = Math.ceil(R * 2.8);
        if (off.width !== S) { off.width = S; off.height = S; }
        og.setTransform(1, 0, 0, 1, 0, 0);
        og.clearRect(0, 0, S, S);
        og.translate(S / 2, S / 2);
        drawTomato(og, R, p);
        og.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < k; i++) {
          const b = bites[i];
          og.beginPath(); og.arc(b.x * R, b.y * R, b.s * R, 0, TAU); og.fill();
        }
        og.globalCompositeOperation = 'source-over';
        // miąższ na krawędzi kęsów
        og.globalCompositeOperation = 'source-atop';
        og.strokeStyle = '#ffb199'; og.lineWidth = R * 0.05;
        for (let i = Math.max(0, k - 30); i < k; i++) {
          const b = bites[i];
          og.beginPath(); og.arc(b.x * R, b.y * R, b.s * R + R * 0.02, 0, TAU); og.stroke();
        }
        og.globalCompositeOperation = 'source-over';
        const sq = 1 + Math.sin(t * 2) * 0.01;
        g.save(); g.translate(cx, cy); g.scale(1 / sq, sq);
        g.drawImage(off, -S / 2, -S / 2);
        drawStem(g, R);
        g.restore();

        // okruchy
        crumbs = crumbs.filter(c => c.life > 0);
        for (const c of crumbs) {
          c.life -= dt * 0.8; c.vy += dt * 6; c.bx += c.vx * dt * 0.6; c.by += c.vy * dt * 0.6;
          g.fillStyle = c.seed ? `rgba(240,220,140,${c.life})` : `rgba(220,50,30,${c.life})`;
          g.beginPath(); g.arc(cx + c.bx * R, cy + c.by * R, c.seed ? 3 : 4, 0, TAU); g.fill();
        }

        // gąsienica przy ostatnim kęsie
        const cur = bites[Math.max(0, Math.min(N - 1, k))];
        const gx = cx + cur.x * R + R * 0.18, gy = cy + cur.y * R;
        drawCaterpillar(g, gx, gy, R, p, t, chew > 0 || (!s.paused && Math.sin(t * 1.3) > 0.4));

        // dymek pomidora
        let line = LINES[0][1];
        for (const [pp, l] of LINES) if (p >= pp) line = l;
        g.font = `600 ${Math.max(13, R * 0.1)}px "Bricolage Grotesque", system-ui, sans-serif`;
        const tw = Math.min(w * 0.42, g.measureText(line).width + 28);
        const bx = Math.max(10, cx - R * 1.35 - tw * 0.55), by = cy - R * 1.25;
        g.fillStyle = '#fff'; g.strokeStyle = '#2a1d17'; g.lineWidth = 2;
        roundRect(g, bx, by - 22, tw, 44, 14); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(bx + tw * 0.7, by + 22); g.lineTo(cx - R * 0.5, cy - R * 0.75); g.lineTo(bx + tw * 0.55, by + 22); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.fillRect(bx + tw * 0.55 + 2, by + 19, tw * 0.15 - 4, 5);
        g.fillStyle = '#2a1d17'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.save(); g.beginPath(); g.rect(bx + 6, by - 22, tw - 12, 44); g.clip();
        g.fillText(line, bx + tw / 2, by + 1);
        g.restore();
        if (chew > 0) {
          g.font = `700 ${Math.max(14, R * 0.12)}px "Bricolage Grotesque", sans-serif`;
          g.fillStyle = `rgba(45,93,24,${chew})`;
          g.fillText('mniam', gx + R * 0.3, gy - R * 0.35 - (0.8 - chew) * 30);
        }

        cap.innerHTML = `Pomidor zjedzony w <b>${fmt(p * 100, 0)}%</b> · gąsienica Grażyna przytyła o <b>${fmt(p * 14, 1)} g</b> · zostało ${mmss(s.remaining)}`;
      },
      destroy() {},
    };
  },
});
