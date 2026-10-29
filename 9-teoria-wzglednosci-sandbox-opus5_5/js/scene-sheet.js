/* =====================================================================
   Gumowy czas – scena „Grawitacja” i „Razem”
   Gumowa płachta czasoprzestrzeni w 3D (rzut perspektywiczny na canvas 2D).
   Promień: skala logarytmiczna (od powierzchni do 100 promieni ciała).
   Głębokość lejka: kształt dokładny (∝ 1 − tempo zegara), siła wzmocniona
   logarytmicznie, żeby było widać i Księżyc, i czarną dziurę.
   Kolor siatki: jak bardzo zwalnia czas w danym miejscu.
   ===================================================================== */
'use strict';
(function (R) {
  const P = R.phys, F = R.fmt;
  const NR = 30, NS = 48;
  const RHO_R = 1.7;                 // promień ciała na płachcie
  const S = 10;                      // h = 100 R
  const SD = 11.2;                   // brzeg płachty
  const LAM = (S - RHO_R) / Math.log(101);
  const HS = 2.3;                    // skala głębokości

  const HEAT = [
    [0, [70, 110, 210]], [0.3, [90, 130, 255]], [0.5, [150, 120, 255]], [0.7, [215, 105, 235]],
    [0.85, [255, 105, 150]], [0.94, [255, 160, 80]], [1, [255, 236, 180]]
  ];
  function heat(t) {
    for (let i = 0; i < HEAT.length - 1; i++) {
      const [ta, a] = HEAT[i], [tb, b] = HEAT[i + 1];
      if (t <= tb) { const k = (t - ta) / (tb - ta); return [a[0] + (b[0] - a[0]) * k | 0, a[1] + (b[1] - a[1]) * k | 0, a[2] + (b[2] - a[2]) * k | 0]; }
    }
    return HEAT[HEAT.length - 1][1];
  }

  const rhoOfH = h => RHO_R + LAM * Math.log(1 + h);
  const hOfRho = rho => Math.exp((rho - RHO_R) / LAM) - 1;

  function SheetScene() {
    const rings = new Float32Array(NR + 1);
    for (let i = 0; i <= NR; i++) rings[i] = RHO_R + (SD - RHO_R) * Math.pow(i / NR, 1.45);
    const ringDepth = new Float32Array(NR + 1);
    const ringTarget = new Float32Array(NR + 1);
    const ringStr = new Float32Array(NR + 1);
    const cosJ = new Float32Array(NS + 1), sinJ = new Float32Array(NS + 1);
    for (let j = 0; j <= NS; j++) { cosJ[j] = Math.cos(j / NS * Math.PI * 2); sinJ[j] = Math.sin(j / NS * Math.PI * 2); }
    const sx = new Float32Array((NR + 1) * NS), sy = new Float32Array((NR + 1) * NS), sd = new Float32Array((NR + 1) * NS);
    const quads = [];
    for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) quads.push({ i, j, d: 0 });

    const cam = { yaw: -0.55, pitch: 0.62, dist: 24, idle: 99, W: 0, H: 0, f: 1, cy: 0 };
    const st = {
      t: 0, first: true, pulses: [], pulsePhase: 0, flashA: 0, received: 0,
      disk: null, shipAng: 0.6, shipTrail: [], bodyKey: ''
    };
    // cząstki dysku akrecyjnego
    st.disk = [];
    for (let i = 0; i < 320; i++) {
      const r = 3 + Math.pow(Math.random(), 1.6) * 10;
      st.disk.push({ r, a: Math.random() * Math.PI * 2, s: 0.6 + Math.random() * 1.6, lift: Math.random() * 0.12 });
    }

    function depthAtRho(rho) {
      if (rho <= rings[0]) return ringDepth[0];
      for (let i = 0; i < NR; i++) {
        if (rho <= rings[i + 1]) { const k = (rho - rings[i]) / (rings[i + 1] - rings[i]); return ringDepth[i] + (ringDepth[i + 1] - ringDepth[i]) * k; }
      }
      return ringDepth[NR];
    }

    function targets(body) {
      const w = body.bh ? 1 : Math.max(0.08, P.strength(body.deltaSurf));
      const ref = body.bh ? 1 : body.deltaSurf;
      for (let i = 0; i <= NR; i++) {
        const g = P.gravAt(body, hOfRho(rings[i]));
        let d = w * g.delta / ref;
        if (body.bh) d += 0.28 * Math.log10(1 / Math.max(g.rate, 1e-4));
        ringTarget[i] = d * HS;
        ringStr[i] = P.strength(g.delta);
      }
    }

    function project(x, y, z, out) {
      const cY = Math.cos(cam.yaw), sY = Math.sin(cam.yaw), cP = Math.cos(cam.pitch), sP = Math.sin(cam.pitch);
      const xr = x * cY - y * sY, yr = x * sY + y * cY;
      const dep = yr * cP - z * sP + cam.dist;
      const up = yr * sP + z * cP;
      const k = cam.f / Math.max(dep, 0.5);
      out[0] = cam.W / 2 + xr * k; out[1] = cam.cy - up * k; out[2] = dep;
      return out;
    }
    const tmp = [0, 0, 0], tmp2 = [0, 0, 0];

    /* -------------------------------- update -------------------------------- */
    function update(dt, s) {
      st.t += dt;
      targets(s.body);
      const k = st.first ? 1 : Math.min(1, s.dtReal * 4.5);
      for (let i = 0; i <= NR; i++) ringDepth[i] += (ringTarget[i] - ringDepth[i]) * k;
      st.first = false;
      cam.idle += s.dtReal;
      if (cam.idle > 4) cam.yaw += s.dtReal * 0.035;

      // błyski z zegara B do obserwatora A
      if (s.mode === 'gravity' && s.pulses) {
        st.pulsePhase += s.gB.rate * dt * 1.25;
        if (st.pulsePhase >= 1) { st.pulsePhase -= Math.floor(st.pulsePhase); st.pulses.push({ rho: rhoOfH(s.hB) }); }
        const rhoA = SD - 0.35;
        for (const p of st.pulses) p.rho += dt * 3.2;
        const before = st.pulses.length;
        st.pulses = st.pulses.filter(p => p.rho < rhoA);
        if (st.pulses.length < before) { st.flashA = 1; st.received += before - st.pulses.length; }
      } else st.pulses = [];
      st.flashA = Math.max(0, st.flashA - s.dtReal * 2.5);

      // statek na orbicie (tryb „Razem”)
      if (s.mode === 'both') {
        const w = s.sp.beta > 0 ? 0.22 + 1.5 * Math.sqrt(s.sp.beta) : 0;
        st.shipAng += w * dt;
        if (dt > 0) {
          st.shipTrail.push(st.shipAng);
          if (st.shipTrail.length > 46) st.shipTrail.shift();
        }
      }
      for (const p of st.disk) p.a += dt * 5.5 * Math.pow(p.r, -1.5);
    }

    /* -------------------------------- draw -------------------------------- */
    function draw(ctx, W, H, s) {
      cam.W = W; cam.H = H;
      cam.f = Math.min(W * 0.92, H * 1.55) * 0.98;
      cam.cy = H * 0.40;
      const body = s.body;

      // tło
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#04060f'); g.addColorStop(1, '#0a1022');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      drawBgStars(ctx, W, H);

      // rzut siatki
      for (let i = 0; i <= NR; i++) {
        const rho = rings[i], z = -ringDepth[i];
        for (let j = 0; j < NS; j++) {
          project(rho * cosJ[j], rho * sinJ[j], z, tmp);
          const n = i * NS + j; sx[n] = tmp[0]; sy[n] = tmp[1]; sd[n] = tmp[2];
        }
      }
      for (const q of quads) {
        const a = q.i * NS + q.j, b = q.i * NS + (q.j + 1) % NS, c = (q.i + 1) * NS + q.j, d = (q.i + 1) * NS + (q.j + 1) % NS;
        q.d = (sd[a] + sd[b] + sd[c] + sd[d]) * 0.25;
      }
      quads.sort((p, q) => q.d - p.d);

      const zc = -ringDepth[0];
      project(0, 0, zc, tmp2);
      const bodyScreen = { x: tmp2[0], y: tmp2[1], d: tmp2[2], r: RHO_R * cam.f / tmp2[2] };

      // kolory pierścieni
      const fill = [], line = [];
      for (let i = 0; i <= NR; i++) {
        const c = heat(ringStr[i]);
        fill.push('rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',');
        line.push(c);
      }
      let bodyDrawn = false;
      const dMin = cam.dist - SD, span = SD * 2;
      ctx.lineWidth = 1;
      for (const q of quads) {
        if (!bodyDrawn && q.d < bodyScreen.d) { drawBody(ctx, body, bodyScreen, s); bodyDrawn = true; }
        const a = q.i * NS + q.j, b = q.i * NS + (q.j + 1) % NS, c = (q.i + 1) * NS + q.j, d = (q.i + 1) * NS + (q.j + 1) % NS;
        const fog = P.clamp(1.15 - (q.d - dMin) / span * 0.75, 0.35, 1);
        ctx.beginPath();
        ctx.moveTo(sx[a], sy[a]); ctx.lineTo(sx[c], sy[c]); ctx.lineTo(sx[d], sy[d]); ctx.lineTo(sx[b], sy[b]); ctx.closePath();
        const pit = body.bh && q.i === 0;      // gardziel czarnej dziury: ciemna studnia
        ctx.fillStyle = pit ? 'rgba(0,0,0,0.92)' : fill[q.i] + (0.11 * fog).toFixed(3) + ')';
        ctx.fill();
        const lc = line[q.i];
        const edgeA = (pit ? 0.3 : q.i % 3 === 0 ? 0.75 : 0.42) * fog;
        ctx.strokeStyle = 'rgba(' + lc[0] + ',' + lc[1] + ',' + lc[2] + ',' + edgeA.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(sx[b], sy[b]); ctx.lineTo(sx[a], sy[a]);
        if (q.j % 2 === 0) ctx.lineTo(sx[c], sy[c]);
        if (q.i === NR - 1) { ctx.moveTo(sx[c], sy[c]); ctx.lineTo(sx[d], sy[d]); }
        ctx.stroke();
      }
      if (!bodyDrawn) drawBody(ctx, body, bodyScreen, s);

      if (body.bh) drawDisk(ctx, body);
      if (s.mode === 'gravity') drawGravityMarkers(ctx, s);
      else drawBothMarkers(ctx, s, bodyScreen);
    }

    let bgStars = null;
    function drawBgStars(ctx, W, H) {
      if (!bgStars) { bgStars = []; for (let i = 0; i < 180; i++) bgStars.push([Math.random(), Math.random(), Math.random() * 1.4 + 0.3, Math.random() * 6]); }
      for (const s of bgStars) {
        ctx.fillStyle = 'rgba(210,225,255,' + (0.25 + 0.25 * Math.sin(st.t * 0.8 + s[3])).toFixed(3) + ')';
        ctx.fillRect(s[0] * W, s[1] * H, s[2], s[2]);
      }
    }

    /* ------------------------------ ciała ------------------------------ */
    function drawBody(ctx, body, b, s) {
      const { x, y, r } = b;
      const t = st.t;
      const kind = body.kind;
      if (body.bh) return drawHole(ctx, body, b);
      ctx.save();
      // poświata
      const glowCol = { moon: '200,200,210', earth: '110,170,255', jupiter: '230,190,140', sun: '255,190,80', wd: '200,225,255', ns: '160,200,255' }[kind] || '200,200,255';
      const glowR = kind === 'sun' ? r * 2.3 : kind === 'wd' || kind === 'ns' ? r * 2.6 : r * 1.45;
      const gl = ctx.createRadialGradient(x, y, r * 0.8, x, y, glowR);
      gl.addColorStop(0, 'rgba(' + glowCol + ',' + (kind === 'sun' || kind === 'ns' || kind === 'wd' ? 0.45 : 0.22) + ')');
      gl.addColorStop(1, 'rgba(' + glowCol + ',0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2); ctx.fill();

      if (kind === 'ns') drawPulsarBeams(ctx, x, y, r, t);

      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
      let grad;
      switch (kind) {
        case 'moon':
          grad = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
          grad.addColorStop(0, '#d9d9de'); grad.addColorStop(1, '#5d5f69');
          ctx.fillStyle = grad; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
          ctx.fillStyle = 'rgba(60,62,72,0.35)';
          [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [0.05, 0.45, 0.12], [-0.45, 0.35, 0.1], [0.45, -0.35, 0.09]].forEach(([a, c, rr]) => {
            ctx.beginPath(); ctx.arc(x + a * r, y + c * r, rr * r, 0, Math.PI * 2); ctx.fill();
          });
          break;
        case 'earth': {
          grad = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
          grad.addColorStop(0, '#5fb0ff'); grad.addColorStop(1, '#0d2f6e');
          ctx.fillStyle = grad; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
          const rot = (t * 0.06) % 2;
          ctx.fillStyle = 'rgba(80,170,90,0.85)';
          [[-0.5, -0.2, 0.32, 0.22], [0.1, 0.25, 0.25, 0.35], [0.55, -0.3, 0.2, 0.15], [1.1, 0.1, 0.3, 0.25], [1.6, -0.25, 0.28, 0.2]].forEach(([a, c, w, h]) => {
            const xx = ((a + rot + 1) % 2.4) - 1.2;
            ctx.beginPath(); ctx.ellipse(x + xx * r, y + c * r, w * r, h * r, 0.4, 0, Math.PI * 2); ctx.fill();
          });
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          [[-0.2, -0.55, 0.5, 0.08], [0.3, 0.6, 0.6, 0.07], [-0.4, 0.1, 0.4, 0.06]].forEach(([a, c, w, h]) => {
            ctx.beginPath(); ctx.ellipse(x + a * r, y + c * r, w * r, h * r, -0.2, 0, Math.PI * 2); ctx.fill();
          });
          break;
        }
        case 'jupiter': {
          const cols = ['#e8d3b0', '#c79a6b', '#f1e2c4', '#b07d52', '#ead7b5', '#c49a70', '#f0dfc0'];
          for (let i = 0; i < 14; i++) {
            ctx.fillStyle = cols[i % cols.length];
            ctx.fillRect(x - r, y - r + i * (2 * r / 14), 2 * r, 2 * r / 14 + 1);
          }
          ctx.fillStyle = 'rgba(190,80,50,0.8)';
          ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.3, r * 0.18, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
          shade(ctx, x, y, r);
          break;
        }
        case 'sun': {
          grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
          grad.addColorStop(0, '#fff6d0'); grad.addColorStop(0.6, '#ffc94a'); grad.addColorStop(1, '#f08a1c');
          ctx.fillStyle = grad; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
          ctx.fillStyle = 'rgba(255,120,20,0.18)';
          for (let i = 0; i < 18; i++) {
            const a = i * 2.4 + t * 0.05, d = (i % 5) / 5 * r * 0.8;
            ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.08 + 0.05 * Math.sin(t * 1.3 + i)), 0, Math.PI * 2); ctx.fill();
          }
          break;
        }
        case 'wd':
          grad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.05, x, y, r);
          grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.7, '#cfe0ff'); grad.addColorStop(1, '#7f9de0');
          ctx.fillStyle = grad; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
          break;
        case 'ns':
          grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.05, x, y, r);
          grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, '#b9d4ff'); grad.addColorStop(1, '#4766c8');
          ctx.fillStyle = grad; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
          ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
          for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.ellipse(x, y, r, r * i / 4, t * 2, 0, Math.PI * 2); ctx.stroke(); }
          break;
      }
      ctx.restore();
      if (body.impossible) {
        ctx.strokeStyle = 'rgba(255,93,115,' + (0.5 + 0.4 * Math.sin(t * 6)).toFixed(3) + ')';
        ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(x, y, r + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    function shade(ctx, x, y, r) {
      const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r * 1.05);
      g.addColorStop(0, 'rgba(255,255,255,0.12)'); g.addColorStop(0.7, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    function drawPulsarBeams(ctx, x, y, r, t) {
      const a = t * 2.6;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const sgn of [1, -1]) {
        const dir = a + (sgn > 0 ? 0 : Math.PI);
        const len = r * 4.2, half = 0.17;
        const g = ctx.createLinearGradient(x, y, x + Math.cos(dir) * len, y + Math.sin(dir) * len * 0.6);
        g.addColorStop(0, 'rgba(170,210,255,0.55)'); g.addColorStop(1, 'rgba(170,210,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(dir - half) * len, y + Math.sin(dir - half) * len * 0.6);
        ctx.lineTo(x + Math.cos(dir + half) * len, y + Math.sin(dir + half) * len * 0.6);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    function drawHole(ctx, body, b) {
      // horyzont zdarzeń: wylot lejka wypełniony czernią
      ctx.beginPath();
      for (let j = 0; j < NS; j++) { const n = j; if (j === 0) ctx.moveTo(sx[n], sy[n]); else ctx.lineTo(sx[n], sy[n]); }
      ctx.closePath();
      ctx.fillStyle = '#000'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,170,80,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
      // sfera fotonowa (r = 1,5 rs): tu światło może krążyć po okręgu
      const rho = rhoOfH(0.5), z = -depthAtRho(rho);
      ctx.save();
      ctx.shadowColor = '#ffb050'; ctx.shadowBlur = 10;
      ctx.strokeStyle = 'rgba(255,190,110,0.8)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let j = 0; j <= 64; j++) {
        const a = j / 64 * Math.PI * 2;
        project(rho * Math.cos(a), rho * Math.sin(a), z, tmp);
        if (j === 0) ctx.moveTo(tmp[0], tmp[1]); else ctx.lineTo(tmp[0], tmp[1]);
      }
      ctx.stroke();
      ctx.restore();
    }
    function drawDisk(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of st.disk) {
        const rho = rhoOfH(p.r - 1);
        if (rho > SD) continue;
        const z = -depthAtRho(rho) + 0.05 + p.lift;
        project(rho * Math.cos(p.a), rho * Math.sin(p.a), z, tmp);
        const beam = 1 + 0.75 * Math.sin(p.a + cam.yaw);       // strona lecąca ku nam jaśniejsza
        const hot = P.clamp((13 - p.r) / 10, 0, 1);
        const c = hot > 0.7 ? '255,236,200' : hot > 0.4 ? '255,180,90' : '255,110,60';
        ctx.fillStyle = 'rgba(' + c + ',' + (0.22 * beam * (0.4 + hot)).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(tmp[0], tmp[1], p.s * (1 + hot), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    /* ------------------------------ znaczniki ------------------------------ */
    function pill(ctx, x, y, text, col, sub) {
      ctx.font = '600 12px "Space Grotesk", system-ui, sans-serif';
      const w1 = ctx.measureText(text).width;
      let w2 = 0;
      if (sub) { ctx.font = '11px "JetBrains Mono", monospace'; w2 = ctx.measureText(sub).width; }
      const w = Math.max(w1, w2) + 16, h = sub ? 36 : 22;
      const bx = P.clamp(x - w / 2, 6, cam.W - w - 6), by = P.clamp(y - h, 6, cam.H - h - 6);
      ctx.fillStyle = 'rgba(8,12,26,0.82)';
      ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, w, h, 7) : ctx.rect(bx, by, w, h); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e6ecff'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = '600 12px "Space Grotesk", system-ui, sans-serif';
      ctx.fillText(text, bx + 8, by + 5);
      if (sub) { ctx.fillStyle = col; ctx.font = '11px "JetBrains Mono", monospace'; ctx.fillText(sub, bx + 8, by + 20); }
    }
    function dot(ctx, x, y, r, rgb, glow) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * (2.4 + glow * 2));
      g.addColorStop(0, 'rgba(' + rgb + ',0.9)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * (2.4 + glow * 2), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgb(' + rgb + ')'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.stroke();
    }
    function stemLabel(ctx, x, y, len, col, text, sub) {
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x, y - len); ctx.stroke();
      ctx.globalAlpha = 1;
      pill(ctx, x, y - len, text, col, sub);
    }

    function observerA(ctx, label) {
      const rhoA = SD - 0.35;
      project(rhoA, 0, -depthAtRho(rhoA), tmp);
      const x = tmp[0], y = tmp[1];
      dot(ctx, x, y, 5.5, '94,227,255', st.flashA);
      stemLabel(ctx, x, y, 34, '#5ee3ff', label, null);
      return [x, y];
    }

    function drawGravityMarkers(ctx, s) {
      const rhoB = rhoOfH(s.hB), rhoA = SD - 0.35;
      // droga błysków
      ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k <= 30; k++) {
        const rho = rhoB + (rhoA - rhoB) * k / 30;
        project(rho, 0, -depthAtRho(rho) + 0.02, tmp);
        if (k === 0) ctx.moveTo(tmp[0], tmp[1]); else ctx.lineTo(tmp[0], tmp[1]);
      }
      ctx.stroke(); ctx.setLineDash([]);
      // błyski: im wyżej się wspinają, tym bardziej czerwienieją
      const bodyRate = s.gB.rate;
      for (const p of st.pulses) {
        const gHere = P.gravAt(s.body, hOfRho(p.rho));
        const c = P.shiftColor(bodyRate / Math.max(gHere.rate, 1e-9));
        project(p.rho, 0, -depthAtRho(p.rho) + 0.03, tmp);
        const gg = ctx.createRadialGradient(tmp[0], tmp[1], 0, tmp[0], tmp[1], 9);
        gg.addColorStop(0, 'rgba(' + c.join(',') + ',1)'); gg.addColorStop(1, 'rgba(' + c.join(',') + ',0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(tmp[0], tmp[1], 9, 0, Math.PI * 2); ctx.fill();
      }
      observerA(ctx, 'A · ty, daleko');
      // zegar B
      project(rhoB, 0, -depthAtRho(rhoB) + 0.04, tmp);
      const col = P.shiftColor(s.gB.rate);
      const txt = col.map(v => Math.round(v + (255 - v) * 0.35));   // napis musi być czytelny także w głębokiej czerwieni
      dot(ctx, tmp[0], tmp[1], 6, col.join(','), s.clockPulse || 0);
      stemLabel(ctx, tmp[0], tmp[1], 46, 'rgb(' + txt.join(',') + ')', 'B · zegar przy źródle', 'tempo ' + F.rate(s.gB.rate, s.gB.delta));
    }

    function drawBothMarkers(ctx, s, bs) {
      const rhoB = rhoOfH(s.hB);
      const zB = -depthAtRho(rhoB) + 0.05;
      // orbita
      ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,184,77,0.45)'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let j = 0; j <= 72; j++) {
        const a = j / 72 * Math.PI * 2;
        project(rhoB * Math.cos(a), rhoB * Math.sin(a), zB, tmp);
        if (j === 0) ctx.moveTo(tmp[0], tmp[1]); else ctx.lineTo(tmp[0], tmp[1]);
      }
      ctx.stroke(); ctx.setLineDash([]);

      observerA(ctx, 'A · ty, daleko');

      // zegar na powierzchni
      if (!s.body.bh) {
        const x = bs.x, y = bs.y - bs.r;
        dot(ctx, x, y, 4.5, '126,224,138', 0);
        pill(ctx, x, y - 10, 'zegar na powierzchni', '#7ee08a', null);
      }
      // nieruchomy zegar na wysokości orbity
      project(rhoB, 0, zB, tmp);
      dot(ctx, tmp[0], tmp[1], 4.5, '185,140,255', 0);

      // smuga i statek
      ctx.lineCap = 'round';
      for (let k = 1; k < st.shipTrail.length; k++) {
        const a0 = st.shipTrail[k - 1], a1 = st.shipTrail[k];
        project(rhoB * Math.cos(a0), rhoB * Math.sin(a0), zB, tmp);
        project(rhoB * Math.cos(a1), rhoB * Math.sin(a1), zB, tmp2);
        ctx.strokeStyle = 'rgba(255,184,77,' + (k / st.shipTrail.length * 0.6).toFixed(3) + ')';
        ctx.lineWidth = 3 * k / st.shipTrail.length;
        ctx.beginPath(); ctx.moveTo(tmp[0], tmp[1]); ctx.lineTo(tmp2[0], tmp2[1]); ctx.stroke();
      }
      const a = st.shipAng;
      project(rhoB * Math.cos(a), rhoB * Math.sin(a), zB, tmp);
      project(rhoB * Math.cos(a + 0.05), rhoB * Math.sin(a + 0.05), zB, tmp2);
      const ang = Math.atan2(tmp2[1] - tmp[1], tmp2[0] - tmp[0]);
      const per = cam.f / tmp[2];
      const len = Math.max(2.2, 0.75 * per * s.sp.rate), wid = 0.3 * per;
      ctx.save();
      ctx.translate(tmp[0], tmp[1]); ctx.rotate(ang);
      ctx.shadowColor = '#ffb84d'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffd59a';
      ctx.beginPath(); ctx.ellipse(0, 0, len / 2, wid / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff9a3d';
      ctx.beginPath(); ctx.moveTo(len / 2, 0); ctx.lineTo(len / 2 - Math.min(len * 0.4, 6), -wid / 2); ctx.lineTo(len / 2 - Math.min(len * 0.4, 6), wid / 2); ctx.closePath(); ctx.fill();
      ctx.restore();
      pill(ctx, tmp[0], tmp[1] - 14, 'statek', '#ffb84d', 'tempo ' + F.rate(s.tot.rate, s.tot.delta));
    }

    /* ------------------------------ kamera ------------------------------ */
    function drag(dx, dy) {
      cam.yaw += dx * 0.006;
      cam.pitch = P.clamp(cam.pitch + dy * 0.004, 0.18, 1.45);
      cam.idle = 0;
    }
    function zoom(dy) { cam.dist = P.clamp(cam.dist * (1 + dy * 0.001), 13, 42); cam.idle = 0; }
    function resetView() { cam.yaw = -0.55; cam.pitch = 0.62; cam.dist = 24; cam.idle = 99; }
    function resetPulses() { st.pulses = []; st.received = 0; st.pulsePhase = 0; }

    return { update, draw, drag, zoom, resetView, resetPulses, get received() { return st.received; } };
  }

  R.SheetScene = SheetScene;
})(window.Rel);
