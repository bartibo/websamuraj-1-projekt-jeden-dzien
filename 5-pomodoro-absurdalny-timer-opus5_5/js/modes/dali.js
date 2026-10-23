'use strict';
/* Tryb: Zegar Dalego – im mniej zostało, tym bardziej zegar się topi. */

A.defineMode({
  id: 'dali', name: 'Zegar Dalego', icon: '🫠', breakOk: true,
  tagline: 'Pokazuje pozostały czas. Topi się proporcjonalnie do upływu.',
  create(host) {
    const C = makeCanvas(host);
    const cap = el('div', 'mode-caption');
    host.appendChild(cap);
    const off = document.createElement('canvas'), og = off.getContext('2d');
    let t = 0, drips = [], dripT = 0;
    const ants = Array.from({ length: 9 }, () => ({ a: rand(0, TAU), sp: rand(0.4, 1.2) * (chance(0.5) ? 1 : -1), r: rand(0.3, 0.8) }));
    const QUOTES = [
      'Czas jest miękki. Jak ser camembert w słońcu.',
      'Trwałość pamięci, trwałość zadania.',
      'Nie jestem dziwny. Po prostu nie jestem normalny. — zegar',
      'Wskazówki zastanawiają się, czy nie spłynąć.',
      'Surrealizm w biurze to po prostu poniedziałek.',
    ];
    const quote = bag(QUOTES);
    let q = quote(), qT = 0;

    function face(S, s) {
      if (off.width !== S) { off.width = S; off.height = S; }
      const R = S / 2 - 6;
      og.setTransform(1, 0, 0, 1, 0, 0);
      og.clearRect(0, 0, S, S);
      og.translate(S / 2, S / 2);
      const gr = og.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.1, 0, 0, R);
      gr.addColorStop(0, '#f4f0e0'); gr.addColorStop(1, '#c9c1a0');
      og.fillStyle = '#7d8a96'; og.beginPath(); og.arc(0, 0, R + 5, 0, TAU); og.fill();
      og.fillStyle = gr; og.beginPath(); og.arc(0, 0, R, 0, TAU); og.fill();
      og.strokeStyle = '#3d4650'; og.lineWidth = 2; og.stroke();
      og.fillStyle = '#2a2a2a'; og.font = `600 ${R * 0.16}px Georgia, serif`; og.textAlign = 'center'; og.textBaseline = 'middle';
      for (let i = 1; i <= 12; i++) {
        const a = i / 12 * TAU - Math.PI / 2;
        og.fillText(roman(i), Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.78);
      }
      for (let i = 0; i < 60; i++) {
        const a = i / 60 * TAU;
        og.fillRect(Math.cos(a) * R * 0.92 - 1, Math.sin(a) * R * 0.92 - 1, i % 5 ? 2 : 4, i % 5 ? 2 : 4);
      }
      const rem = s.remaining;
      const mA = (rem / 60 % 60) / 60 * TAU - Math.PI / 2, sA = (rem % 60) / 60 * TAU - Math.PI / 2;
      og.strokeStyle = '#1d1d1d'; og.lineCap = 'round';
      og.lineWidth = R * 0.05; og.beginPath(); og.moveTo(0, 0); og.lineTo(Math.cos(mA) * R * 0.6, Math.sin(mA) * R * 0.6); og.stroke();
      og.strokeStyle = '#a3261b'; og.lineWidth = R * 0.02; og.beginPath(); og.moveTo(-Math.cos(sA) * R * 0.15, -Math.sin(sA) * R * 0.15); og.lineTo(Math.cos(sA) * R * 0.8, Math.sin(sA) * R * 0.8); og.stroke();
      og.fillStyle = '#1d1d1d'; og.beginPath(); og.arc(0, 0, R * 0.05, 0, TAU); og.fill();
      og.font = `italic 600 ${R * 0.18}px Georgia, serif`; og.fillStyle = '#3d2b1a';
      og.fillText(mmss(rem), 0, R * 0.38);
      og.font = `italic ${R * 0.08}px Georgia, serif`;
      og.fillText('pozostało (miękko)', 0, R * 0.52);
    }

    return {
      frame(s, dt) {
        C.fit();
        const { g, w, h } = C;
        t += dt;
        qT += dt; if (qT > 10) { qT = 0; q = quote(); }
        const melt = 0.08 + s.p * 0.92;
        // pustynia
        const sky = g.createLinearGradient(0, 0, 0, h * 0.62);
        sky.addColorStop(0, '#5f8fb4'); sky.addColorStop(0.6, '#c9d6c8'); sky.addColorStop(1, '#f1d9a0');
        g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.62);
        g.fillStyle = '#6d9cb0'; g.fillRect(0, h * 0.6, w, h * 0.04);
        const gr = g.createLinearGradient(0, h * 0.62, 0, h);
        gr.addColorStop(0, '#a77b45'); gr.addColorStop(1, '#4a3018');
        g.fillStyle = gr; g.fillRect(0, h * 0.64, w, h * 0.36);
        // klif
        g.fillStyle = '#c99a4e';
        g.beginPath(); g.moveTo(w * 0.72, h * 0.62); g.lineTo(w * 0.78, h * 0.38); g.lineTo(w * 0.9, h * 0.34); g.lineTo(w, h * 0.36); g.lineTo(w, h * 0.62); g.fill();
        g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.moveTo(w * 0.9, h * 0.34); g.lineTo(w, h * 0.36); g.lineTo(w, h * 0.62); g.lineTo(w * 0.86, h * 0.62); g.fill();
        // martwe drzewo
        const trunkX = w * 0.18, branchY = h * 0.4, tipX = w * 0.42;
        g.strokeStyle = '#3b2412'; g.lineCap = 'round';
        g.lineWidth = 16; g.beginPath(); g.moveTo(trunkX, h * 0.82); g.quadraticCurveTo(trunkX - 10, h * 0.6, trunkX + 4, branchY); g.stroke();
        g.lineWidth = 9; g.beginPath(); g.moveTo(trunkX + 4, branchY); g.quadraticCurveTo(w * 0.3, branchY - 14, tipX, branchY - 2); g.stroke();
        g.lineWidth = 5; g.beginPath(); g.moveTo(trunkX + 2, branchY + 10); g.lineTo(trunkX - 30, branchY - 40); g.stroke();
        // plinta
        g.fillStyle = '#5a3a1c'; g.fillRect(w * 0.05, h * 0.8, w * 0.38, h * 0.06);
        g.fillStyle = '#7a5428'; g.fillRect(w * 0.05, h * 0.78, w * 0.38, h * 0.025);

        // topiący się zegar
        const S = Math.round(Math.min(w * 0.34, h * 0.52));
        // kałuża pod zegarem
        g.fillStyle = 'rgba(201,193,160,.8)';
        g.beginPath(); g.ellipse(tipX - S * 0.55 + S * 0.8, h * 0.83, 20 + s.p * 60, 4 + s.p * 5, 0, 0, TAU); g.fill();
        face(S, s);
        const X0 = tipX - S * 0.55, Y0 = branchY - S * 0.38;
        const u0 = 0.5;
        const strip = 2;
        g.save();
        g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 12; g.shadowOffsetY = 6;
        for (let x = 0; x < S; x += strip) {
          const u = x / S;
          const k = Math.max(0, u - u0) / (1 - u0);
          const kl = Math.max(0, 0.12 - u) / 0.12;
          const sag = melt * S * 0.75 * Math.pow(k, 1.5) + kl * melt * S * 0.12 + Math.sin(t * 0.8 + u * 5) * 2 * melt;
          const st = 1 + melt * 0.9 * k;
          g.drawImage(off, x, 0, strip, S, X0 + x, Y0 + sag, strip + 0.6, S * st);
        }
        g.restore();
        // gałąź przechodzi przez zegar – zegar na niej wisi
        g.strokeStyle = '#3b2412'; g.lineWidth = 9; g.lineCap = 'round';
        g.beginPath(); g.moveTo(X0 - 4, branchY - 6); g.quadraticCurveTo(X0 + S * 0.3, branchY - 2, X0 + S * 0.45, branchY + 2); g.stroke();
        // krople
        dripT += dt * melt;
        if (!s.paused && dripT > 0.9) {
          dripT = 0;
          const u = rand(0.6, 0.95), k = (u - u0) / (1 - u0);
          const bottom = Y0 + melt * S * 0.75 * Math.pow(k, 1.5) + S * (1 + melt * 0.9 * k) - S * 0.05;
          drips.push({ x: X0 + u * S, y: bottom, vy: 0, len: rand(6, 14) });
        }
        drips = drips.filter(d => d.y < h * 0.83);
        g.fillStyle = '#c9c1a0';
        for (const d of drips) {
          d.vy += 300 * dt; d.y += d.vy * dt;
          g.beginPath(); g.ellipse(d.x, d.y, 4, d.len / 2 + d.vy * 0.02, 0, 0, TAU); g.fill();
        }

        // zamknięty zegarek z mrówkami
        const px = w * 0.6, py = h * 0.8, pr = Math.min(w, h) * 0.06;
        g.fillStyle = '#d06a1d'; g.strokeStyle = '#6b3205'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(px, py, pr * 1.2, pr * 0.6, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#111';
        for (const a of ants) {
          if (!s.paused) a.a += a.sp * dt;
          g.beginPath(); g.ellipse(px + Math.cos(a.a) * pr * a.r * 1.2, py + Math.sin(a.a) * pr * a.r * 0.6, 2.5, 1.5, a.a + Math.PI / 2, 0, TAU); g.fill();
        }

        g.font = `italic ${Math.max(14, Math.min(20, w * 0.02))}px Georgia, serif`;
        g.fillStyle = 'rgba(30,20,10,.75)'; g.textAlign = 'right';
        g.fillText(`„${q}”`, w - 20, h * 0.08);
        cap.innerHTML = `Stopień roztopienia: <b>${fmt(melt * 100, 0)}%</b> · zostało <b>${mmss(s.remaining)}</b> · mrówki na zegarku: <b>${ants.length}</b> (nie wiedzą, która godzina)`;
      },
      destroy() {},
    };
  },
});
