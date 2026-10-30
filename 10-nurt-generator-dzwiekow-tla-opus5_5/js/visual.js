/* =====================================================================
   Nurt – tło: wstęga płynących linii
   Przy niskiej energii płynie wolno i szeroko w chłodnych barwach,
   przy wysokiej przyspiesza, faluje drobniej i robi się ciepła.
   Oddycha razem z głośnością tego, co gra.
   ===================================================================== */
'use strict';
(function (N) {
  N.createVisual = function (canvas) {
    const g = canvas.getContext('2d');
    const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const LINES = 24;
    let w = 0, h = 0, dpr = 1;
    let energy = 0.5, shown = 0.5, playing = false, act = 0.35, level = 0, levelS = 0;
    let t = 0, last = performance.now();
    const motes = Array.from({ length: 46 }, () => ({ x: Math.random(), line: Math.random() * LINES, s: 0.4 + Math.random(), a: Math.random() }));

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize);
    resize();

    function flowY(nx, i, e, cy, spread, amp) {
      const k = i - LINES / 2;
      return cy + k * spread +
        amp * (Math.sin(nx * 2.3 + t * 0.45 + i * 0.05) * 0.85 +
               Math.sin(nx * 5.8 + t * 1.25 + i * 0.21) * 0.45 +
               Math.sin(nx * (11 + 6 * e) - t * 1.9 + i * 0.13) * 0.16 * (0.3 + e));
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      shown += (energy - shown) * Math.min(1, dt * 1.8);
      act += ((playing ? 1 : 0.28) - act) * Math.min(1, dt * 1.2);
      levelS += (level - levelS) * Math.min(1, dt * 6);
      const e = shown;
      t += dt * (0.16 + e * 1.15) * act * (reduced ? 0.35 : 1);

      const [r, gg, b] = N.mix.color(e);
      const [r2, g2, b2] = N.mix.color(Math.min(1, e + 0.14));
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#07080d';
      g.fillRect(0, 0, w, h);
      const glow = g.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h) * 0.65);
      glow.addColorStop(0, `rgba(${r},${gg},${b},${0.10 + 0.08 * act})`);
      glow.addColorStop(1, 'rgba(7,8,13,0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, w, h);

      const cy = h * 0.56;
      const spread = h * (0.009 + 0.004 * e);
      const amp = h * (0.07 + 0.05 * e) * (0.75 + 0.25 * act) * (1 + levelS * 0.9);
      const step = Math.max(10, w / 110);
      g.globalCompositeOperation = 'lighter';
      g.lineWidth = 1.2;
      for (let i = 0; i < LINES; i++) {
        const u = i / (LINES - 1);
        const cr = Math.round(r + (r2 - r) * u), cg = Math.round(gg + (g2 - gg) * u), cb = Math.round(b + (b2 - b) * u);
        const edge = 1 - Math.abs(u - 0.5) * 1.5;
        const alpha = (0.05 + 0.11 * edge) * (0.55 + 0.45 * act);
        const grad = g.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, `rgba(${cr},${cg},${cb},0)`);
        grad.addColorStop(0.25, `rgba(${cr},${cg},${cb},${alpha})`);
        grad.addColorStop(0.75, `rgba(${cr},${cg},${cb},${alpha})`);
        grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        g.strokeStyle = grad;
        g.beginPath();
        for (let x = -step; x <= w + step; x += step) {
          const y = flowY(x / w, i, e, cy, spread, amp);
          if (x < 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      }

      // drobinki niesione nurtem
      const speed = (0.012 + 0.07 * e) * act * (reduced ? 0.35 : 1);
      for (const m of motes) {
        m.x += dt * speed * m.s;
        if (m.x > 1.05) { m.x = -0.05; m.line = Math.random() * LINES; }
        const y = flowY(m.x, m.line, e, cy, spread, amp);
        const fade = Math.sin(Math.PI * Math.max(0, Math.min(1, m.x)));
        g.fillStyle = `rgba(${r2},${g2},${b2},${(0.25 + 0.5 * m.a) * fade * act})`;
        g.beginPath();
        g.arc(m.x * w, y, 0.8 + m.a * 1.4, 0, Math.PI * 2);
        g.fill();
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    return {
      setEnergy(e) { energy = e; },
      setPlaying(p) { playing = p; },
      setLevel(l) { level = l; }
    };
  };
})(window.Nurt);
