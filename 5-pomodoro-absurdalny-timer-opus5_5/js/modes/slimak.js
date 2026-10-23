'use strict';
/* Tryb: Wielki Wyścig – ślimak Zbigniew dociera do mety dokładnie z końcem zadania. */

A.defineMode({
  id: 'slimak', name: 'Wielki Wyścig Ślimaka', icon: '🐌', breakOk: true,
  tagline: 'Ślimak Zbigniew dotrze do mety dokładnie wtedy, gdy skończysz. Ani sekundy wcześniej.',
  create(host) {
    const C = makeCanvas(host);
    const cap = el('div', 'mode-caption');
    host.appendChild(cap);
    const talk = bag(A.SNAIL_TALK);
    let line = 'Panie i Panowie, wyścig stulecia rozpoczęty!', lineT = 0, t = 0;
    const fans = Array.from({ length: 26 }, (_, i) => ({ x: i / 25, c: pick(['#e5432f', '#3a7bd5', '#e7b33a', '#3c8d4a', '#9b59b6', '#f39c12']), ph: rand(0, TAU), skin: pick(['#f1c9a5', '#d7a27c', '#8d5a3b', '#f6dcc2']) }));
    let slothX = 0, slothDir = 1, slothSleep = 0;

    function snail(g, x, y, S, t, moving) {
      g.save(); g.translate(x, y);
      const stretch = moving ? 1 + Math.sin(t * 3) * 0.06 : 1;
      // ciało
      g.fillStyle = '#e9c98f'; g.strokeStyle = '#7a5a2a'; g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-S * 1.1, 0);
      g.quadraticCurveTo(-S * 1.2, -S * 0.3, -S * 0.6, -S * 0.3);
      g.lineTo(S * 0.7 * stretch, -S * 0.35);
      g.quadraticCurveTo(S * 1.15 * stretch, -S * 0.5, S * 1.1 * stretch, 0);
      g.closePath(); g.fill(); g.stroke();
      // czułki
      const hx = S * 0.95 * stretch;
      g.strokeStyle = '#7a5a2a'; g.lineWidth = 3; g.lineCap = 'round';
      const wob = Math.sin(t * 4) * S * 0.1;
      g.beginPath(); g.moveTo(hx - S * 0.1, -S * 0.35); g.lineTo(hx - S * 0.05 + wob, -S * 1.0);
      g.moveTo(hx + S * 0.05, -S * 0.3); g.lineTo(hx + S * 0.3 - wob, -S * 0.95); g.stroke();
      for (const [ex, ey] of [[hx - S * 0.05 + wob, -S * 1.0], [hx + S * 0.3 - wob, -S * 0.95]]) {
        g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, S * 0.13, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#111'; g.beginPath(); g.arc(ex + S * 0.04, ey, S * 0.06, 0, TAU); g.fill();
      }
      // uśmiech
      g.strokeStyle = '#7a5a2a'; g.lineWidth = 2;
      g.beginPath(); g.arc(hx + S * 0.02, -S * 0.25, S * 0.1, 0.2, Math.PI - 0.5); g.stroke();
      // muszla
      g.save(); g.translate(-S * 0.15, -S * 0.75);
      const grd = g.createRadialGradient(-S * 0.2, -S * 0.2, S * 0.1, 0, 0, S * 0.75);
      grd.addColorStop(0, '#f2a65a'); grd.addColorStop(1, '#a3541c');
      g.fillStyle = grd; g.strokeStyle = '#5c2c0b'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(0, 0, S * 0.7, 0, TAU); g.fill(); g.stroke();
      g.beginPath();
      for (let a = 0; a < TAU * 2.6; a += 0.1) {
        const r = S * 0.62 * (1 - a / (TAU * 2.8));
        const px = Math.cos(a + t * 0.2) * r, py = Math.sin(a + t * 0.2) * r;
        a === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
      }
      g.stroke();
      g.restore();
      // numer startowy
      g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 1.5;
      g.fillRect(-S * 0.75, -S * 0.32, S * 0.42, S * 0.28); g.strokeRect(-S * 0.75, -S * 0.32, S * 0.42, S * 0.28);
      g.fillStyle = '#111'; g.font = `700 ${S * 0.22}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('1', -S * 0.54, -S * 0.17);
      g.restore();
    }

    function sloth(g, x, y, S, t, dir, sleeping) {
      g.save(); g.translate(x, y); g.scale(dir, 1);
      g.fillStyle = '#8a6a4a'; g.strokeStyle = '#4a3420'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(0, -S * 0.55, S * 0.75, S * 0.5, 0, 0, TAU); g.fill(); g.stroke();
      // nogi
      const st = sleeping ? 0 : Math.sin(t * 2) * S * 0.1;
      g.beginPath(); g.ellipse(-S * 0.4 + st, -S * 0.08, S * 0.14, S * 0.12, 0, 0, TAU); g.ellipse(S * 0.4 - st, -S * 0.08, S * 0.14, S * 0.12, 0, 0, TAU); g.fill();
      // głowa
      g.beginPath(); g.arc(S * 0.65, -S * 0.85, S * 0.36, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#e8d6b8'; g.beginPath(); g.ellipse(S * 0.7, -S * 0.82, S * 0.28, S * 0.22, 0, 0, TAU); g.fill();
      g.fillStyle = '#3a2614';
      g.beginPath(); g.ellipse(S * 0.58, -S * 0.86, S * 0.1, S * 0.06, -0.3, 0, TAU); g.ellipse(S * 0.84, -S * 0.86, S * 0.1, S * 0.06, 0.3, 0, TAU); g.fill();
      if (!sleeping) { g.fillStyle = '#fff'; g.beginPath(); g.arc(S * 0.6, -S * 0.87, S * 0.025, 0, TAU); g.arc(S * 0.82, -S * 0.87, S * 0.025, 0, TAU); g.fill(); }
      g.strokeStyle = '#3a2614'; g.lineWidth = 1.5; g.beginPath(); g.arc(S * 0.71, -S * 0.75, S * 0.07, 0.3, Math.PI - 0.3); g.stroke();
      g.restore();
      if (sleeping) {
        g.fillStyle = '#4a3420'; g.font = `700 ${S * 0.4}px system-ui`;
        g.fillText('z', x + S * 0.6, y - S * 1.4 - (t * 10 % 10)); g.fillText('Z', x + S * 0.9, y - S * 1.8 - (t * 10 % 12));
      }
    }

    return {
      frame(s, dt) {
        C.fit();
        const { g, w, h } = C;
        t += dt;
        if (!s.paused) {
          lineT += dt;
          if (lineT > 8) { lineT = 0; line = talk(); }
          // leniwiec: idzie, śpi, zawraca
          if (slothSleep > 0) slothSleep -= dt;
          else {
            slothX += slothDir * dt * 0.006;
            if (chance(dt * 0.08)) slothSleep = rand(3, 8);
            if (chance(dt * 0.05) || slothX < 0 || slothX > 0.9) slothDir *= -1;
            slothX = clamp(slothX, 0, 0.9);
          }
        }

        // niebo i trawa
        const sky = g.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#9fd3f0'); sky.addColorStop(0.5, '#d9f0ff'); sky.addColorStop(0.5, '#8cc85c'); sky.addColorStop(1, '#5e9e3a');
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
        // chmury
        g.fillStyle = 'rgba(255,255,255,.85)';
        for (let i = 0; i < 4; i++) {
          const cx = ((i * 0.31 + t * 0.004) % 1.2 - 0.1) * w, cy = h * (0.08 + i * 0.07);
          g.beginPath(); g.arc(cx, cy, 18, 0, TAU); g.arc(cx + 20, cy - 8, 22, 0, TAU); g.arc(cx + 44, cy, 17, 0, TAU); g.fill();
        }
        // trybuna z kibicami
        const tribY = h * 0.42;
        g.fillStyle = '#c0b49c'; g.fillRect(0, tribY - 6, w, 14);
        for (const f of fans) {
          const fx = f.x * w * 0.96 + 10, jump = Math.max(0, Math.sin(t * 3 + f.ph)) * 5;
          g.fillStyle = f.c; g.fillRect(fx - 7, tribY - 18 - jump, 14, 14);
          g.fillStyle = f.skin; g.beginPath(); g.arc(fx, tribY - 24 - jump, 6, 0, TAU); g.fill();
        }
        // tory
        const x0 = Math.max(w * 0.2, 120), x1 = w * 0.9;
        const lanes = [h * 0.6, h * 0.76, h * 0.92];
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.setLineDash([16, 12]);
        for (const ly of [h * 0.52, h * 0.68, h * 0.84]) { g.beginPath(); g.moveTo(0, ly); g.lineTo(w, ly); g.stroke(); }
        g.setLineDash([]);
        // start i meta
        g.fillStyle = '#fff'; g.fillRect(x0 - 2, h * 0.52, 4, h * 0.48);
        const sq = 10;
        for (let y = h * 0.52, r = 0; y < h; y += sq, r++) for (let c = 0; c < 3; c++) {
          g.fillStyle = (r + c) % 2 ? '#111' : '#fff'; g.fillRect(x1 + c * sq, y, sq, sq);
        }
        g.fillStyle = '#111'; g.font = '700 13px system-ui'; g.textAlign = 'center';
        g.fillText('META', x1 + 15, h * 0.5);
        g.fillText('START', x0, h * 0.5);

        const S = Math.min(h * 0.075, w * 0.05);
        // ślad śluzu
        const sx = lerp(x0, x1, s.p);
        const sl = g.createLinearGradient(x0, 0, sx, 0);
        sl.addColorStop(0, 'rgba(220,240,255,.15)'); sl.addColorStop(1, 'rgba(230,250,255,.85)');
        g.strokeStyle = sl; g.lineWidth = S * 0.35; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x0, lanes[0] + 2); g.lineTo(sx - S, lanes[0] + 2); g.stroke();
        snail(g, sx, lanes[0], S, t, !s.paused);
        sloth(g, lerp(x0, x1, slothX), lanes[1], S * 1.1, t, slothDir, slothSleep > 0);
        // kamień
        g.fillStyle = '#8d8d8d'; g.strokeStyle = '#555'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(x0 + S * 0.8, lanes[2] - S * 0.35, S * 0.7, S * 0.45, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.font = `600 ${Math.max(11, S * 0.28)}px system-ui`; g.textAlign = 'left';
        const labels = [['Zbigniew', 'ślimak, faworyt publiczności'], ['Bogdan', 'leniwiec, ma swój plan'], ['Kamień', 'faworyt bukmacherów']];
        labels.forEach(([n, d], i) => {
          const lw = x0 - 18, ly = lanes[i] - S * 1.1;
          g.fillStyle = 'rgba(0,0,0,.35)'; roundRect(g, 8, ly - 4, lw, 40, 8); g.fill();
          g.fillStyle = '#fff'; g.font = `700 ${Math.max(12, Math.min(16, w * 0.014))}px system-ui`;
          g.fillText(n, 16, ly + 13, lw - 14);
          g.font = `${Math.max(10, Math.min(13, w * 0.011))}px system-ui`; g.fillStyle = 'rgba(255,255,255,.85)';
          g.fillText(d, 16, ly + 29, lw - 14);
        });

        // dymek komentatora
        g.font = `600 ${Math.max(14, Math.min(20, w * 0.022))}px "Bricolage Grotesque", system-ui`;
        const tw = Math.min(w - 40, g.measureText(line).width + 36);
        g.fillStyle = '#2a1d17'; roundRect(g, (w - tw) / 2, h * 0.17, tw, 42, 21); g.fill();
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('🎙️ ' + line, w / 2, h * 0.17 + 21);
        g.textBaseline = 'alphabetic';

        const dist = s.total * 0.001, done = dist * s.p;
        cap.innerHTML = `Dystans: <b>${fmt(dist, 2)} m</b> · Zbigniew przebył <b>${fmt(done * 100, 1)} cm</b> · prędkość <b>${fmt(dist / s.total * 3.6, 4)} km/h</b> · meta za ${mmss(s.remaining)}`;
      },
      destroy() {},
    };
  },
});
