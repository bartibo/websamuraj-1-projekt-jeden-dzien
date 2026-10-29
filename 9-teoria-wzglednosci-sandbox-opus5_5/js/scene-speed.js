/* =====================================================================
   Gumowy czas – scena „Prędkość” (szczególna teoria względności)
   Widok z boku: statek w układzie nieruchomego obserwatora, skrócony
   o 1/γ, z zegarem świetlnym w środku (błysk leci zygzakiem).
   Widok z kokpitu: aberracja i efekt Dopplera dla gwiazd.
   ===================================================================== */
'use strict';
(function (R) {
  const P = R.phys, F = R.fmt;
  const CPX = 230;          // prędkość światła na ekranie [px/s]
  const TRAIL_T = 3.2;      // ile sekund pamięta smuga błysku

  function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

  function SpeedScene() {
    const st = {
      ready: false, W: 0, H: 0, x: 0, p: 0, obsP: 0, t: 0,
      trail: [], exhaust: [], ticksShip: 0, ticksObs: 0, flash: 0, flashObs: 0,
      stars: null, sky: null
    };

    function layout(W, H) {
      const hh = P.clamp(H * 0.085, 30, 50);
      const L = P.clamp(W * 0.34, 170, 380);
      return {
        W, H, hh, L, hc: hh * 1.4,
        laneY: Math.max(hh * 1.62 + 52, H * 0.42),
        groundY: H - 58,
        pxPerM: L / 100
      };
    }

    function init(W, H) {
      st.W = W; st.H = H;
      const r = rnd(7);
      st.stars = [];
      for (let i = 0; i < 260; i++) st.stars.push({ x: r(), y: r(), s: r() * r() * 1.8 + 0.3, tw: r() * 6.28, sp: 0.5 + r() * 2 });
      // niebo dla widoku z kokpitu: gwiazdy w 3D + pas Drogi Mlecznej
      const N = 2600;
      const sky = { n: N, a: new Float32Array(N), phi: new Float32Array(N), T: new Float32Array(N), b: new Float32Array(N) };
      const temps = [3100, 3600, 4300, 5200, 5800, 6500, 7800, 9800, 14000, 24000];
      const r2 = rnd(42);
      for (let i = 0; i < N; i++) {
        let a, phi;
        if (i < 1500) { a = r2() * 2; phi = r2() * Math.PI * 2; }
        else {
          // pas: kierunki skupione wokół wielkiego koła nachylonego do osi lotu
          const lon = r2() * Math.PI * 2;
          const lat = (r2() + r2() + r2() - 1.5) * 0.18;
          let x = Math.cos(lat) * Math.cos(lon), y = Math.cos(lat) * Math.sin(lon), z = Math.sin(lat);
          const tilt = 1.05; // obrót wokół osi y
          const xr = x * Math.cos(tilt) + z * Math.sin(tilt), zr = -x * Math.sin(tilt) + z * Math.cos(tilt);
          a = 1 + xr; phi = Math.atan2(zr, y);
        }
        sky.a[i] = a; sky.phi[i] = phi;
        sky.T[i] = temps[Math.floor(Math.pow(r2(), 1.4) * temps.length)];
        sky.b[i] = i < 1500 ? 0.12 + Math.pow(r2(), 4) * 1.6 : 0.05 + r2() * 0.12;
      }
      st.sky = sky;
      st.x = W * 0.6;
      st.ready = true;
    }

    function reset() { st.trail = []; st.exhaust = []; st.ticksShip = 0; st.ticksObs = 0; st.p = 0; st.obsP = 0; }

    function update(dt, sp, W, H) {
      if (!st.ready || Math.abs(W - st.W) > 1 || Math.abs(H - st.H) > 1) { const keep = st.ready; init(W, H); if (keep) st.x = P.clamp(st.x, 0, W); }
      const lay = layout(W, H);
      st.t += dt;
      const k = sp.rate, Lc = lay.L * k;
      // ruch statku i zawijanie ekranu
      st.x += sp.beta * CPX * dt;
      if (st.x - Lc / 2 > W + 50) {
        const shift = -(W + 100 + Lc);
        st.x += shift;
        st.trail.forEach(p => { p.x += shift; });
        st.exhaust.forEach(p => { p.x += shift; });
      }
      // błysk w zegarze statku: w pionie leci z prędkością c·√(1−β²)
      st.p += CPX * k / lay.hc * dt;
      while (st.p >= 2) { st.p -= 2; st.ticksShip++; st.flash = 1; }
      st.obsP += CPX / lay.hc * dt;
      while (st.obsP >= 2) { st.obsP -= 2; st.ticksObs++; st.flashObs = 1; }
      st.flash = Math.max(0, st.flash - dt * 3);
      st.flashObs = Math.max(0, st.flashObs - dt * 3);
      const yPh = lay.laneY + lay.hc / 2 - (st.p < 1 ? st.p : 2 - st.p) * lay.hc;
      if (dt > 0) st.trail.push({ x: st.x, y: yPh, t: st.t });
      while (st.trail.length && st.t - st.trail[0].t > TRAIL_T) st.trail.shift();
      // spaliny zostają w miejscu, w którym je wyrzucono
      if (sp.beta > 2e-4 && dt > 0) {
        const n = Math.random() < dt * 40 ? 1 : 0;
        for (let i = 0; i < n; i++) {
          st.exhaust.push({ x: st.x - Lc / 2 - lay.L * 0.035 * k, y: lay.laneY + (Math.random() - 0.5) * lay.hh * 0.6,
            vx: (Math.random() - 0.5) * 16, vy: (Math.random() - 0.5) * 18, life: 1.8, max: 1.8 });
        }
      }
      st.exhaust.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
      st.exhaust = st.exhaust.filter(p => p.life > 0).slice(-160);
    }

    /* ------------------------------ rysowanie ------------------------------ */
    function draw(ctx, W, H, sp, view) {
      if (!st.ready) return;
      if (view === 'cockpit') return drawCockpit(ctx, W, H, sp);
      const lay = layout(W, H);
      drawBackdrop(ctx, W, H);
      drawGround(ctx, lay);
      drawShipGroup(ctx, lay, sp);
      drawObserverClock(ctx, lay);
    }

    function drawBackdrop(ctx, W, H) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#04060f'); g.addColorStop(0.7, '#0a1226'); g.addColorStop(1, '#0d1630');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const neb = ctx.createRadialGradient(W * 0.22, H * 0.2, 10, W * 0.22, H * 0.2, W * 0.45);
      neb.addColorStop(0, 'rgba(120,80,200,0.13)'); neb.addColorStop(1, 'rgba(120,80,200,0)');
      ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
      const neb2 = ctx.createRadialGradient(W * 0.85, H * 0.65, 10, W * 0.85, H * 0.65, W * 0.4);
      neb2.addColorStop(0, 'rgba(40,140,200,0.09)'); neb2.addColorStop(1, 'rgba(40,140,200,0)');
      ctx.fillStyle = neb2; ctx.fillRect(0, 0, W, H);
      for (const s of st.stars) {
        const a = 0.35 + 0.35 * Math.sin(st.t * s.sp + s.tw);
        ctx.fillStyle = 'rgba(220,230,255,' + a.toFixed(3) + ')';
        ctx.fillRect(s.x * W, s.y * (H - 70), s.s, s.s);
      }
      // planeta z pierścieniem w tle
      const px = W * 0.7, py = H * 0.12, pr = Math.min(W, H) * 0.05;
      const pg = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.1, px, py, pr);
      pg.addColorStop(0, '#6d7fb8'); pg.addColorStop(1, '#1e2747');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(170,190,240,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(px, py, pr * 1.9, pr * 0.42, -0.25, 0, Math.PI * 2); ctx.stroke();
    }

    function drawGround(ctx, lay) {
      const { W, H, groundY, pxPerM } = lay;
      // platforma obserwatora
      const g = ctx.createLinearGradient(0, groundY, 0, H);
      g.addColorStop(0, 'rgba(94,227,255,0.10)'); g.addColorStop(1, 'rgba(94,227,255,0.02)');
      ctx.fillStyle = g; ctx.fillRect(0, groundY, W, H - groundY);
      ctx.strokeStyle = 'rgba(94,227,255,0.45)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, groundY + 0.5); ctx.lineTo(W, groundY + 0.5); ctx.stroke();
      // twoja linijka (nieruchoma)
      const y = H - 22, step = pxPerM * 10;
      ctx.strokeStyle = 'rgba(94,227,255,0.7)'; ctx.fillStyle = 'rgba(190,240,255,0.85)';
      ctx.font = '11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.beginPath(); ctx.moveTo(16, y); ctx.lineTo(W, y); ctx.stroke();
      for (let i = 0; 16 + i * step < W; i++) {
        const x = 16 + i * step, big = i % 5 === 0;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - (big ? 10 : 5)); ctx.stroke();
        if (big) ctx.fillText(i * 10 + ' m', x, y + 3);
      }
      ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(190,240,255,0.55)';
      ctx.fillText('twoja linijka', W - 10, groundY + 8);
    }

    function drawObserverClock(ctx, lay) {
      const { groundY, hc } = lay;
      const x = 44, yb = groundY - 10, yt = yb - hc;
      // obserwator (Ty)
      const fx = x + 46, fy = groundY;
      ctx.strokeStyle = '#5ee3ff'; ctx.fillStyle = '#5ee3ff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(fx, fy - 40, 6.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx, fy - 33); ctx.lineTo(fx, fy - 15);
      ctx.moveTo(fx, fy - 15); ctx.lineTo(fx - 6, fy - 1); ctx.moveTo(fx, fy - 15); ctx.lineTo(fx + 6, fy - 1);
      ctx.moveTo(fx, fy - 28); ctx.lineTo(fx - 8, fy - 20); ctx.moveTo(fx, fy - 28); ctx.lineTo(fx + 9, fy - 33);
      ctx.stroke();
      ctx.font = '600 12px "Space Grotesk", sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('Ty', fx + 12, fy - 40);
      // zegar świetlny
      drawMirror(ctx, x, yt, 26, '#5ee3ff');
      drawMirror(ctx, x, yb, 26, '#5ee3ff');
      ctx.strokeStyle = 'rgba(94,227,255,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 13, yt); ctx.lineTo(x - 13, yb); ctx.moveTo(x + 13, yt); ctx.lineTo(x + 13, yb); ctx.stroke();
      const py = yb - (st.obsP < 1 ? st.obsP : 2 - st.obsP) * hc;
      photon(ctx, x, py, 1 + st.flashObs);
      ctx.fillStyle = 'rgba(190,240,255,0.9)'; ctx.font = '600 12px "Space Grotesk", sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('Twój zegar świetlny', x - 26, yt - 22);
      ctx.fillStyle = 'rgba(190,240,255,0.6)'; ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText('tyknięcia: ' + st.ticksObs, x - 26, yt - 8);
    }

    function drawMirror(ctx, x, y, w, col) {
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.stroke();
    }
    function photon(ctx, x, y, boost) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 12 * boost);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,240,170,0.9)'); g.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 12 * boost, 0, Math.PI * 2); ctx.fill();
    }

    function drawShipGroup(ctx, lay, sp) {
      const { L, hh, hc, laneY, W } = lay;
      const k = sp.rate, Lc = L * k, x = st.x;

      // spaliny
      for (const p of st.exhaust) {
        const a = p.life / p.max;
        ctx.fillStyle = 'rgba(255,' + (140 + 80 * a | 0) + ',80,' + (0.35 * a).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.5 + (1 - a) * 4, 0, Math.PI * 2); ctx.fill();
      }

      // obrys długości spoczynkowej
      if (k < 0.995) {
        ctx.save();
        ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,184,77,0.45)'; ctx.lineWidth = 1.3;
        roundRect(ctx, x - L / 2, laneY - hh, L, hh * 2, hh * 0.6); ctx.stroke();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,200,120,0.7)'; ctx.font = '11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('tak długi jest statek, gdy stoi (100 m)', P.clamp(x, 140, W - 140), laneY - hh * 1.62 - 6);
      }

      // kadłub (skrócony w kierunku ruchu)
      const flame = sp.beta > 2e-4 ? (0.25 + 0.75 * Math.min(1, Math.log10(sp.gamma + 1) / 1.2)) * L * 0.22 : 0;
      if (Lc < 2.5) {
        // tak spłaszczony, że został tylko „plasterek”
        ctx.save();
        ctx.shadowColor = '#ffb84d'; ctx.shadowBlur = 14;
        ctx.strokeStyle = '#ffe3b0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, laneY - hh); ctx.lineTo(x, laneY + hh); ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(x, laneY); ctx.scale(k, 1);
        drawShip(ctx, L, hh, flame);
        ctx.restore();
      }

      // smuga błysku: w twoim układzie leci zygzakiem
      if (st.trail.length > 1) {
        ctx.lineCap = 'round';
        for (let i = 1; i < st.trail.length; i++) {
          const a = st.trail[i - 1], b = st.trail[i];
          if (Math.abs(b.x - a.x) > 200) continue;
          const age = (st.t - b.t) / TRAIL_T;
          ctx.strokeStyle = 'rgba(255,236,160,' + ((1 - age) * 0.85).toFixed(3) + ')';
          ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }

      // lusterka i błysk (punkt świetlny nie ma rozmiaru, więc się nie spłaszcza)
      const mw = Math.max(1.5, L * 0.16 * k);
      drawMirror(ctx, x, laneY - hc / 2, mw, '#ffd18a');
      drawMirror(ctx, x, laneY + hc / 2, mw, '#ffd18a');
      const yPh = laneY + hc / 2 - (st.p < 1 ? st.p : 2 - st.p) * hc;
      photon(ctx, x, yPh, 1 + st.flash);

      // linijka statku (skrócona)
      const ry = laneY + hh * 1.7 + 6;
      ctx.strokeStyle = 'rgba(255,184,77,0.85)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x - Lc / 2, ry); ctx.lineTo(x + Lc / 2, ry); ctx.stroke();
      for (let i = 0; i <= 10; i++) {
        const xx = x - Lc / 2 + Lc * i / 10, big = i % 5 === 0;
        ctx.beginPath(); ctx.moveTo(xx, ry); ctx.lineTo(xx, ry + (big ? 9 : 5)); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,214,150,0.95)'; ctx.font = '600 12px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const rulerTxt = 1 - k < 1e-4 ? 'linijka statku: 100 m (skrócenie za małe, by je zobaczyć)' : 'linijka statku: dla ciebie ' + F.len(100 * k) + ' zamiast 100 m';
      const half = ctx.measureText(rulerTxt).width / 2 + 10;
      ctx.fillText(rulerTxt, P.clamp(x, half, W - half), ry + 13);

      // podpis zegara statku
      ctx.fillStyle = 'rgba(255,214,150,0.95)'; ctx.font = '600 12px "Space Grotesk", sans-serif';
      ctx.textBaseline = 'bottom';
      const ty = laneY - hh * 1.62 - (k < 0.995 ? 22 : 6);
      const clockTxt = 'Zegar świetlny statku · tyknięcia: ' + st.ticksShip;
      const half2 = ctx.measureText(clockTxt).width / 2 + 10;
      ctx.fillText(clockTxt, P.clamp(x, half2, W - half2), ty);
    }

    function drawShip(ctx, L, hh, flame) {
      const x0 = -L / 2, x1 = L / 2, nose = L * 0.2;
      // płomień
      if (flame > 0) {
        const fl = flame * (0.85 + 0.15 * Math.sin(st.t * 40) + 0.08 * Math.sin(st.t * 23));
        const fx = x0 - L * 0.035;
        const g = ctx.createLinearGradient(fx, 0, fx - fl, 0);
        g.addColorStop(0, 'rgba(255,255,230,0.95)'); g.addColorStop(0.3, 'rgba(255,190,80,0.8)'); g.addColorStop(1, 'rgba(255,80,40,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(fx, -hh * 0.42); ctx.quadraticCurveTo(fx - fl * 0.5, -hh * 0.3, fx - fl, 0);
        ctx.quadraticCurveTo(fx - fl * 0.5, hh * 0.3, fx, hh * 0.42); ctx.closePath(); ctx.fill();
      }
      // stateczniki
      ctx.fillStyle = '#c9772c';
      ctx.beginPath(); ctx.moveTo(x0 + L * 0.02, -hh * 0.8); ctx.lineTo(x0 - L * 0.04, -hh * 1.62); ctx.lineTo(x0 + L * 0.07, -hh * 1.62); ctx.lineTo(x0 + L * 0.2, -hh * 0.93); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x0 + L * 0.02, hh * 0.8); ctx.lineTo(x0 - L * 0.04, hh * 1.62); ctx.lineTo(x0 + L * 0.07, hh * 1.62); ctx.lineTo(x0 + L * 0.2, hh * 0.93); ctx.closePath(); ctx.fill();
      // dysza
      ctx.fillStyle = '#3a4560';
      ctx.fillRect(x0 - L * 0.035, -hh * 0.5, L * 0.04, hh);
      // kadłub
      ctx.beginPath();
      ctx.moveTo(x0, -hh * 0.78);
      ctx.lineTo(x1 - nose, -hh);
      ctx.bezierCurveTo(x1 - nose * 0.35, -hh, x1, -hh * 0.35, x1, 0);
      ctx.bezierCurveTo(x1, hh * 0.35, x1 - nose * 0.35, hh, x1 - nose, hh);
      ctx.lineTo(x0, hh * 0.78);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, -hh, 0, hh);
      g.addColorStop(0, '#eef3fb'); g.addColorStop(0.45, '#b8c4da'); g.addColorStop(1, '#5d6a88');
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#ffb84d';
      ctx.fillRect(x0, hh * 0.42, L, hh * 0.14);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x1 - nose - 2, -hh, 3, hh * 2);
      ctx.restore();
      ctx.strokeStyle = '#26304a'; ctx.lineWidth = 1.5; ctx.stroke();
      // komora zegara świetlnego (przekrój)
      ctx.fillStyle = '#070b18';
      roundRect(ctx, -L * 0.11, -hh * 0.84, L * 0.22, hh * 1.68, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(255,184,77,0.55)'; ctx.lineWidth = 1.2; ctx.stroke();
      // iluminatory z przodu
      for (let i = 0; i < 3; i++) {
        const cx = L * (0.15 + i * 0.065), cy = -hh * 0.2, r = hh * 0.15;
        ctx.fillStyle = '#16233f'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#26304a'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = 'rgba(160,220,255,0.6)'; ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
      }
      // nazwa
      ctx.fillStyle = '#2a3552';
      ctx.font = '700 ' + Math.round(hh * 0.34) + 'px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('KOPERNIK', -L * 0.3, -hh * 0.12);
    }

    function roundRect(ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
    }

    /* ------------------------- widok z kokpitu ------------------------- */
    function drawCockpit(ctx, W, H, sp) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, Rs = Math.min(W, H) * 0.47, TMAX = 2.0944; // 120°
      const sky = st.sky, beta = sp.beta, omb = sp.omb, gam = sp.gamma;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, Rs, 0, Math.PI * 2); ctx.clip();
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rs);
      bg.addColorStop(0, '#05070f'); bg.addColorStop(1, '#020309');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      // poświata: światło z całego nieba skupia się przed dziobem
      const conc = P.clamp(Math.log10(gam) / 3.5, 0, 0.85);
      if (conc > 0.01) {
        const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rs * (0.5 - conc * 0.35));
        gr.addColorStop(0, 'rgba(200,225,255,' + (conc * 0.9).toFixed(3) + ')');
        gr.addColorStop(1, 'rgba(120,160,255,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < sky.n; i++) {
        const a = sky.a[i];
        const ct = (a - omb) / (a * beta + omb);
        const th = Math.acos(ct > 1 ? 1 : ct < -1 ? -1 : ct);
        if (th > TMAX) continue;
        const D = gam * (omb + beta * a);          // przesunięcie Dopplera
        const Tobs = sky.T[i] * D;
        let col = P.kelvinRGB(Tobs);
        let br = sky.b[i] * Math.min(D * D, 8);
        if (Tobs < 1500) br *= Math.pow(Math.max(Tobs, 1) / 1500, 3);
        if (br < 0.02) continue;
        const rr = th / TMAX * Rs;
        const x = cx + rr * Math.cos(sky.phi[i]), y = cy + rr * Math.sin(sky.phi[i]);
        const size = 0.5 + 1.5 * Math.sqrt(Math.min(br, 4));
        ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + Math.min(1, br).toFixed(3) + ')';
        if (size < 1.3) ctx.fillRect(x, y, size, size);
        else { ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();

      // ramka kokpitu
      ctx.strokeStyle = 'rgba(255,184,77,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, Rs, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, Rs * (Math.PI / 2) / TMAX, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,184,77,0.6)';
      ctx.beginPath(); ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 5, cy); ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 14, cy);
      ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 5); ctx.moveTo(cx, cy + 5); ctx.lineTo(cx, cy + 14); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '11px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('na boki (90°)', cx, cy - Rs * (Math.PI / 2) / TMAX - 6);
      ctx.fillText('za plecami (120°)', cx, cy + Rs - 10);
      ctx.fillStyle = 'rgba(255,214,150,0.8)';
      ctx.fillText('kierunek lotu', cx, cy + 28);
    }

    return { update, draw, reset, get ticks() { return { ship: st.ticksShip, obs: st.ticksObs }; } };
  }

  R.SpeedScene = SpeedScene;
})(window.Rel);
