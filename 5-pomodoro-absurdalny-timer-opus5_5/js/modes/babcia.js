'use strict';
/* Tryb: Babcia Lepi Pierogi – jeden pieróg na każdy kawałek czasu, ostatni gotowy z końcem zadania. */

A.defineMode({
  id: 'babcia', name: 'Babcia Lepi Pierogi', icon: '🥟', breakOk: true,
  tagline: 'Babcia Halina lepi jednego pieroga na każdy kawałek czasu. Ostatni będzie gotowy z końcem zadania.',
  create(host, s0) {
    const C = makeCanvas(host);
    const cap = el('div', 'mode-caption');
    host.appendChild(cap);
    const M = clamp(Math.round(s0.total / 60), 4, 24);
    const chunk = s0.total / M;
    const talk = bagStored('babcia', A.BABCIA_LINES);
    let line = s0.kind === 'break' ? 'Przerwa? To siadaj, zaraz będą pierogi.' : 'No siadaj, siadaj. Zaraz będą pierogi.';
    let lineT = 0, t = 0, made = Math.min(M, Math.floor(s0.elapsed / chunk + 1e-9)), popT = 0;
    const steam = Array.from({ length: 5 }, (_, i) => ({ ph: i * 1.3, x: rand(-0.5, 0.5) }));

    // Pieróg leżący płaską stroną w dół, z falbanką
    function pierog(g, x, y, s, crimps = 9) {
      g.save();
      g.fillStyle = '#f3dfb2'; g.strokeStyle = '#a27c3e'; g.lineWidth = Math.max(1.5, s * 0.08);
      g.beginPath(); g.moveTo(x - s, y); g.arc(x, y, s, Math.PI, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath(); g.ellipse(x - s * 0.25, y - s * 0.5, s * 0.35, s * 0.14, -0.3, 0, TAU); g.fill();
      g.lineWidth = Math.max(1, s * 0.06);
      for (let i = 1; i < crimps; i++) {
        const a = Math.PI + i / crimps * Math.PI;
        g.beginPath(); g.moveTo(x + Math.cos(a) * s * 0.8, y + Math.sin(a) * s * 0.8); g.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); g.stroke();
      }
      g.restore();
    }

    // ręce rysowane po stole, żeby sięgały do stolnicy (kontur, potem rękaw)
    function arms(g, x, ty, k, hands) {
      g.save(); g.translate(x, ty); g.lineCap = 'round';
      for (const [col, lw] of [['#2a1d17', 19 * k], ['#6a3d7a', 14 * k]]) {
        g.strokeStyle = col; g.lineWidth = lw;
        for (const [sx, h] of [[-1, hands[0]], [1, hands[1]]]) {
          g.beginPath(); g.moveTo(sx * 46 * k, -112 * k); g.quadraticCurveTo(sx * 78 * k, -50 * k, h[0], h[1]); g.stroke();
        }
      }
      g.restore();
    }

    function babcia(g, x, ty, k) {
      g.save(); g.translate(x, ty);
      // sukienka w kropki i fartuch (dół schowany za stołem)
      g.fillStyle = '#7a4a8c'; g.strokeStyle = '#2a1d17'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-58 * k, -120 * k); g.quadraticCurveTo(0, -140 * k, 58 * k, -120 * k); g.lineTo(80 * k, 40 * k); g.lineTo(-80 * k, 40 * k); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(((i * 37) % 120 - 60) * k, (-110 + ((i * 53) % 140)) * k, 3.2 * k, 0, TAU); g.fill(); }
      g.fillStyle = '#fffaf0';
      g.beginPath(); g.moveTo(-36 * k, -92 * k); g.lineTo(36 * k, -92 * k); g.lineTo(44 * k, 40 * k); g.lineTo(-44 * k, 40 * k); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#e5432f'; g.beginPath(); g.arc(0, -60 * k, 7 * k, 0, TAU); g.fill();
      // głowa
      const hy = -168 * k;
      g.fillStyle = '#f3cfb0'; g.strokeStyle = '#2a1d17'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, hy, 38 * k, 0, TAU); g.fill(); g.stroke();
      // siwe włosy i kok
      g.fillStyle = '#d4d4d4';
      g.beginPath(); g.arc(0, hy - 4 * k, 39 * k, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(0, hy - 18 * k, -38 * k, hy - 8 * k); g.fill(); g.stroke();
      g.beginPath(); g.arc(0, hy - 46 * k, 19 * k, 0, TAU); g.fill(); g.stroke();
      g.strokeStyle = '#b5b5b5'; g.lineWidth = 2;
      g.beginPath(); g.arc(0, hy - 46 * k, 10 * k, 0.5, 4); g.stroke();
      // okulary, oczy, policzki, uśmiech
      g.strokeStyle = '#2a1d17'; g.lineWidth = 2.5;
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 15 * k, hy + 2 * k, 11 * k, 0, TAU); g.stroke(); }
      g.beginPath(); g.moveTo(-4 * k, hy + 1 * k); g.lineTo(4 * k, hy + 1 * k); g.stroke();
      const blink = Math.sin(t * 0.9) > 0.97;
      g.fillStyle = '#2a1d17';
      for (const sx of [-1, 1]) {
        if (blink) { g.beginPath(); g.moveTo(sx * 15 * k - 4 * k, hy + 3 * k); g.lineTo(sx * 15 * k + 4 * k, hy + 3 * k); g.stroke(); }
        else { g.beginPath(); g.arc(sx * 15 * k + 2 * k, hy + 3 * k, 3 * k, 0, TAU); g.fill(); }
      }
      g.fillStyle = 'rgba(240,120,120,.4)';
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 24 * k, hy + 18 * k, 7 * k, 4.5 * k, 0, 0, TAU); g.fill(); }
      g.lineWidth = 2.5; g.beginPath(); g.arc(0, hy + 14 * k, 11 * k, 0.25, Math.PI - 0.25); g.stroke();
      g.restore();
    }

    function bubble(g, text, ax, ay, maxW, fs, w) {
      g.font = `600 ${fs}px "Bricolage Grotesque", system-ui, sans-serif`;
      const lines = [];
      for (const word of text.split(' ')) {
        const cand = lines.length ? lines[lines.length - 1] + ' ' + word : word;
        if (lines.length && g.measureText(cand).width <= maxW - 28) lines[lines.length - 1] = cand; else lines.push(word);
      }
      const lh = fs * 1.25, bh = lines.length * lh + 18;
      const tw = Math.min(maxW, Math.max(...lines.map(l => g.measureText(l).width)) + 28);
      const bx = clamp(ax - 30, 10, w - tw - 10), by = Math.max(8, ay - bh - 18);
      g.fillStyle = '#fff'; g.strokeStyle = '#2a1d17'; g.lineWidth = 2;
      roundRect(g, bx, by, tw, bh, 14); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(ax - 8, by + bh); g.lineTo(ax - 14, ay); g.lineTo(ax + 10, by + bh); g.closePath(); g.fill(); g.stroke();
      g.fillRect(ax - 6, by + bh - 3, 14, 5);
      g.fillStyle = '#2a1d17'; g.textAlign = 'center'; g.textBaseline = 'middle';
      lines.forEach((l, i) => g.fillText(l, bx + tw / 2, by + 9 + lh * (i + 0.5)));
    }

    return {
      frame(s, dt) {
        C.fit();
        const { g, w, h } = C;
        t += dt;
        const now = Math.min(M, Math.floor(s.elapsed / chunk + 1e-9));
        if (now > made) { made = now; popT = 0.6; A.audio.sfx.pop(); }
        popT = Math.max(0, popT - dt);
        if (!s.paused) { lineT += dt; if (lineT > 9) { lineT = 0; line = talk(); } }
        const f = made >= M ? 1 : (s.elapsed - made * chunk) / chunk;

        // kuchnia: kafelki, półka ze słoikami
        g.fillStyle = '#f6ecd8'; g.fillRect(0, 0, w, h);
        const ty = h * 0.66, tile = Math.max(26, h * 0.06);
        g.fillStyle = '#dfe9f2'; g.fillRect(0, ty - tile * 4, w, tile * 4);
        g.strokeStyle = '#b7c7d6'; g.lineWidth = 1.5;
        for (let y = ty - tile * 4; y <= ty; y += tile) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        for (let x = 0; x <= w; x += tile) { g.beginPath(); g.moveTo(x, ty - tile * 4); g.lineTo(x, ty); g.stroke(); }
        const shY = ty - tile * 4 - h * 0.06;
        g.fillStyle = '#8b5a2b'; g.fillRect(w * 0.55, shY, w * 0.4, 10);
        const jars = ['#7aa34a', '#c0392b', '#e7b33a', '#7aa34a', '#9b59b6'];
        jars.forEach((c, i) => {
          const jx = w * 0.58 + i * w * 0.075, jh = h * 0.09, jw = Math.min(w * 0.05, jh * 0.75);
          g.fillStyle = 'rgba(255,255,255,.6)'; g.strokeStyle = '#2a1d17'; g.lineWidth = 2;
          roundRect(g, jx, shY - jh, jw, jh, 6); g.fill(); g.stroke();
          g.fillStyle = c; roundRect(g, jx + 3, shY - jh * 0.7, jw - 6, jh * 0.65, 4); g.fill();
          g.fillStyle = '#e5432f'; g.fillRect(jx - 2, shY - jh - 6, jw + 4, 8); g.strokeRect(jx - 2, shY - jh - 6, jw + 4, 8);
          g.fillStyle = '#fffaf0'; g.fillRect(jx + 4, shY - jh * 0.55, jw - 8, jh * 0.22);
        });

        // babcia za stołem
        const k = clamp(h / 560, 0.6, 1.5);
        const bx = w * 0.3;
        const boardY = ty + h * 0.07;
        const kneading = !s.paused;
        const hL = [bx - 70 * k + (kneading ? Math.sin(t * 5) * 8 * k : 0), boardY - 10 * k - (kneading ? Math.abs(Math.sin(t * 5)) * 10 * k : 0)];
        const hR = [bx + 60 * k + (kneading ? Math.cos(t * 4) * 6 * k : 0), boardY - 8 * k - (kneading ? Math.abs(Math.cos(t * 4)) * 8 * k : 0)];
        babcia(g, bx, ty + 20 * k, k);

        // stół
        g.fillStyle = '#c99a62'; g.fillRect(0, ty, w, h * 0.16);
        g.fillStyle = '#8b5a2b'; g.fillRect(0, ty + h * 0.16, w, h - ty - h * 0.16);
        g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, ty + h * 0.16, w, 6);

        // stolnica, ciasto, wałek
        const bw = Math.min(w * 0.36, 300 * k), bh = h * 0.12;
        g.fillStyle = '#e2b77c'; g.strokeStyle = '#2a1d17'; g.lineWidth = 2.5;
        roundRect(g, bx - bw / 2, ty + h * 0.015, bw, bh, 10); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.5)';
        for (let i = 0; i < 18; i++) g.fillRect(bx - bw / 2 + ((i * 47) % bw), ty + h * 0.03 + ((i * 29) % (bh * 0.8)), 2, 2);
        const dr = 70 * k * Math.sqrt(Math.max(0.08, 1 - s.p * 0.92));
        g.fillStyle = '#f5e6c4'; g.strokeStyle = '#c9a66b';
        g.beginPath(); g.ellipse(bx - bw * 0.2, boardY, dr, dr * 0.32, 0, 0, TAU); g.fill(); g.stroke();
        // wałek
        g.save(); g.translate(bx - bw * 0.2, boardY - dr * 0.32 - 10 * k); g.rotate(-0.08);
        g.fillStyle = '#d29b5c'; g.strokeStyle = '#2a1d17'; g.lineWidth = 2;
        roundRect(g, -55 * k, -7 * k, 110 * k, 14 * k, 7 * k); g.fill(); g.stroke();
        g.fillStyle = '#a86f35'; roundRect(g, -75 * k, -4 * k, 20 * k, 8 * k, 4 * k); g.fill(); roundRect(g, 55 * k, -4 * k, 20 * k, 8 * k, 4 * k); g.fill();
        g.restore();
        // pieróg w trakcie lepienia
        const px = bx + bw * 0.22, py = boardY + 8 * k, ps = 24 * k;
        if (made < M) {
          if (f < 0.3) {
            g.fillStyle = '#f5e6c4'; g.strokeStyle = '#c9a66b'; g.lineWidth = 2;
            g.beginPath(); g.ellipse(px, py - 4 * k, ps, ps * 0.35, 0, 0, TAU); g.fill(); g.stroke();
            g.fillStyle = '#fffaf0'; g.beginPath(); g.ellipse(px, py - 6 * k, ps * 0.45 * (f / 0.3), ps * 0.14 * (f / 0.3), 0, 0, TAU); g.fill();
          } else pierog(g, px, py, ps, 1 + Math.floor((f - 0.3) / 0.7 * 9));
        }
        // ręce i dłonie
        arms(g, bx, ty + 20 * k, k, [[hL[0] - bx, hL[1] - ty - 20 * k], [hR[0] - bx, hR[1] - ty - 20 * k]]);
        g.fillStyle = '#f3cfb0'; g.strokeStyle = '#2a1d17'; g.lineWidth = 2;
        for (const [hx, hy] of [hL, hR]) { g.beginPath(); g.ellipse(hx, hy, 13 * k, 10 * k, 0, 0, TAU); g.fill(); g.stroke(); }

        // blacha z gotowymi pierogami
        const tx0 = w * 0.55, tw = Math.min(w * 0.3, 420 * k), th = h * 0.12;
        g.fillStyle = '#b9bcc4'; g.strokeStyle = '#2a1d17'; g.lineWidth = 2.5;
        roundRect(g, tx0, ty + h * 0.015, tw, th, 8); g.fill(); g.stroke();
        const cols = Math.ceil(M / 2), cw = tw / cols, ss = Math.min(cw * 0.42, th * 0.36);
        for (let i = 0; i < made; i++) {
          const c = i % cols, r = Math.floor(i / cols);
          const sc = i === made - 1 && popT > 0 ? 1 + Math.sin((0.6 - popT) / 0.6 * Math.PI) * 0.35 : 1;
          pierog(g, tx0 + cw * (c + 0.5), ty + h * 0.015 + th * (r === 0 ? 0.42 : 0.86), ss * sc);
        }
        // garnek z rosołem
        const gx = Math.min(w - 50 * k, tx0 + tw + 70 * k), gy = ty + h * 0.03;
        if (gx + 45 * k < w) {
          g.fillStyle = '#c0392b'; g.strokeStyle = '#2a1d17'; g.lineWidth = 2.5;
          roundRect(g, gx - 40 * k, gy - 50 * k, 80 * k, 60 * k, 10 * k); g.fill(); g.stroke();
          g.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(gx - 20 * k + i * 20 * k, gy - 22 * k, 4 * k, 0, TAU); g.fill(); }
          g.fillStyle = '#7f8c8d'; g.fillRect(gx - 46 * k, gy - 56 * k, 92 * k, 8 * k); g.strokeRect(gx - 46 * k, gy - 56 * k, 92 * k, 8 * k);
          g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3 * k;
          for (const st of steam) {
            const yy = ((t * 18 + st.ph * 20) % 60) * k;
            g.globalAlpha = 1 - yy / (60 * k);
            g.beginPath(); g.moveTo(gx + st.x * 50 * k, gy - 60 * k - yy); g.quadraticCurveTo(gx + st.x * 50 * k + 8 * k, gy - 70 * k - yy, gx + st.x * 50 * k, gy - 80 * k - yy); g.stroke();
          }
          g.globalAlpha = 1;
        }

        bubble(g, line, bx + 30 * k, ty - 215 * k, Math.min(w * 0.5, 380), Math.max(13, Math.min(19, 15 * k)), w);
        g.textBaseline = 'alphabetic';
        if (popT > 0) {
          g.globalAlpha = popT / 0.6; g.font = `800 ${Math.round(18 * k)}px "Bricolage Grotesque", system-ui`; g.fillStyle = '#2a1d17'; g.textAlign = 'center';
          g.fillText('+1 pieróg!', tx0 + tw / 2, ty - 10 * k - (0.6 - popT) * 40);
          g.globalAlpha = 1;
        }
        const next = made >= M ? 0 : (made + 1) * chunk - s.elapsed;
        setHTML(cap, `Ulepione: <b>${made} z ${M}</b> · jeden pieróg ≈ ${mmss(chunk)} · ${made >= M ? 'komplet, babcia nakrywa do stołu' : `następny za <b>${mmss(next)}</b>`} · ciasta zostało <b>${fmt((1 - s.p) * 100, 0)}%</b>`);
      },
      destroy() {},
    };
  },
});
