'use strict';
/* Tryb: Wyścig Fotonu – foton wystrzelony ze Słońca na starcie zadania leci przez Układ Słoneczny. */

A.defineMode({
  id: 'foton', name: 'Wyścig Fotonu', icon: '☄️', breakOk: true,
  tagline: 'Na starcie zadania ze Słońca wyleciał foton. Zobacz, dokąd doleci, zanim skończysz.',
  create(host, s0) {
    const C = makeCanvas(host);
    const cap = el('div', 'mode-caption');
    host.appendChild(cap);
    const stars = Array.from({ length: 160 }, () => ({ x: Math.random(), y: Math.random(), r: rand(0.3, 1.4), ph: rand(0, TAU) }));
    const belt = Array.from({ length: 140 }, () => ({ dx: rand(-1, 1), y: rand(-1, 1) }));
    let t = 0, msg = '', msgT = 0;
    const passed = new Set(A.PLANETS.filter(p => p.t <= s0.elapsed).map(p => p.name));
    // skala: pierwiastek z czasu lotu, żeby wewnętrzne planety się nie zlały
    const tMax = Math.max(s0.total * 1.12, 900);

    return {
      frame(s, dt) {
        C.fit();
        const { g, w, h } = C;
        t += dt;
        const x0 = w * 0.07, x1 = w * 0.95, cy = h * 0.5;
        const X = sec => x0 + Math.sqrt(Math.min(sec, tMax) / tMax) * (x1 - x0);
        g.fillStyle = '#05060f'; g.fillRect(0, 0, w, h);
        for (const st of stars) {
          g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + st.ph));
          g.fillStyle = '#fff'; g.fillRect(st.x * w, st.y * h, st.r, st.r);
        }
        g.globalAlpha = 1;
        // Słońce
        const sr = Math.min(h * 0.22, w * 0.08);
        const sg = g.createRadialGradient(x0 - sr * 0.6, cy, 0, x0 - sr * 0.6, cy, sr * 2.2);
        sg.addColorStop(0, '#fff6c8'); sg.addColorStop(0.3, '#ffcc33'); sg.addColorStop(0.5, 'rgba(255,140,0,.5)'); sg.addColorStop(1, 'rgba(255,100,0,0)');
        g.fillStyle = sg; g.beginPath(); g.arc(x0 - sr * 0.6, cy, sr * 2.2, 0, TAU); g.fill();
        // oś
        g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x0, cy); g.lineTo(x1, cy); g.stroke();
        // planety
        g.textAlign = 'center';
        A.PLANETS.forEach((p, i) => {
          if (p.t > tMax) return;
          const px = X(p.t);
          if (p.belt) {
            g.fillStyle = 'rgba(180,170,150,.6)';
            for (const b of belt) g.fillRect(px + b.dx * 10, cy + b.y * h * 0.32, 1.5, 1.5);
          } else {
            const pg = g.createRadialGradient(px - p.r * 0.3, cy - p.r * 0.3, 0, px, cy, p.r);
            pg.addColorStop(0, '#fff'); pg.addColorStop(0.3, p.color); pg.addColorStop(1, '#111');
            g.fillStyle = pg; g.beginPath(); g.arc(px, cy, p.r, 0, TAU); g.fill();
            if (p.ring) { g.strokeStyle = 'rgba(230,208,142,.8)'; g.lineWidth = 2; g.beginPath(); g.ellipse(px, cy, p.r * 2, p.r * 0.5, -0.3, 0, TAU); g.stroke(); }
          }
          g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '600 12px system-ui';
          const ly = i % 2 ? cy + 34 : cy - 28;
          g.fillText(p.name, px, ly);
          g.fillStyle = 'rgba(255,255,255,.4)'; g.font = '11px system-ui';
          g.fillText(mmss(p.t), px, ly + 14);
          if (!passed.has(p.name) && s.elapsed >= p.t) {
            passed.add(p.name);
            msg = `Foton minął: ${p.name}! 🎉`; msgT = 4;
            A.audio.sfx.ding();
          }
        });
        // meta zadania
        const ex = X(s.total);
        g.strokeStyle = 'rgba(229,67,47,.8)'; g.setLineDash([6, 6]); g.lineWidth = 2;
        g.beginPath(); g.moveTo(ex, cy - h * 0.36); g.lineTo(ex, cy + h * 0.36); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#ff8a73'; g.font = '700 13px system-ui';
        g.fillText('Tu będzie foton,', ex, cy - h * 0.38 - 14);
        g.fillText('gdy skończysz', ex, cy - h * 0.38);
        // foton ze smugą
        const fx = X(s.elapsed);
        const tr = g.createLinearGradient(x0, 0, fx, 0);
        tr.addColorStop(0, 'rgba(255,240,150,0)'); tr.addColorStop(1, 'rgba(255,240,150,.9)');
        g.strokeStyle = tr; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x0, cy); g.lineTo(fx, cy); g.stroke();
        const glow = g.createRadialGradient(fx, cy, 0, fx, cy, 22);
        glow.addColorStop(0, '#fff'); glow.addColorStop(0.3, 'rgba(255,240,150,.9)'); glow.addColorStop(1, 'rgba(255,200,80,0)');
        g.fillStyle = glow; g.beginPath(); g.arc(fx, cy, 22 + Math.sin(t * 8) * 2, 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.font = '700 14px "Bricolage Grotesque", system-ui';
        g.fillText('foton Fotek', fx, cy + 60);

        // dalekie planety poza skalą
        const far = A.PLANETS.find(p => p.t > tMax && !p.belt);
        if (far) {
          g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '12px system-ui';
          g.fillText(`→ ${far.name}: ${mmss(far.t)} lotu (nie zdążysz, i dobrze)`, w - 12, h - 14);
        }
        if (msgT > 0) {
          msgT -= dt;
          g.globalAlpha = Math.min(1, msgT); g.textAlign = 'center';
          g.font = `900 ${Math.min(34, w * 0.045)}px "Bricolage Grotesque", system-ui`;
          g.fillStyle = '#ffe680'; g.fillText(msg, w / 2, h * 0.14);
          g.globalAlpha = 1;
        }
        const km = s.elapsed * 299792;
        cap.innerHTML = `Foton przeleciał <b>${fmt(km / 1e6, 1)} mln km</b> · prędkość 299 792 km/s (bez mandatu) · do końca zadania doleci jeszcze <b>${fmt(s.remaining * 0.299792, 0)} mln km</b>`;
      },
      destroy() {},
    };
  },
});
