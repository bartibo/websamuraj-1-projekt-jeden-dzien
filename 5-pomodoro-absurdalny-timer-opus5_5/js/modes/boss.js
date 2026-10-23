'use strict';
/* Tryb: Walka z Bossem – zadanie ma tyle punktów życia, ile zostało sekund. */

A.defineMode({
  id: 'boss', name: 'Walka z Bossem', icon: '⚔️', breakOk: false,
  tagline: 'Zadanie ma tyle HP, ile zostało sekund. Każda sekunda to cios.',
  create(host, s0) {
    const C = makeCanvas(host);
    const cap = el('div', 'mode-caption');
    host.appendChild(cap);
    const name = (s0.task.name || 'Zadanie').slice(0, 28);
    let lastSec = Math.ceil(s0.remaining), pops = [], combo = 0, t = 0, shake = 0, attack = 0;
    let taunt = pick(A.BOSS_TAUNTS), tauntT = 0, phaseMsg = '', phaseT = 0, phase = s0.p >= 0.9 ? 2 : s0.p >= 0.5 ? 1 : 0;
    const CRITS = ['KRYTYCZNE!', 'SUPER EFEKTYWNE!', 'CIOS Z PÓŁOBROTU!', 'TRAFIENIE W EGO!', 'PRZEZ PANCERZ!', 'MOCNE JAK KAWA!', 'NIEUNIKNIONE!'];

    return {
      frame(s, dt) {
        C.fit();
        const { g, w, h } = C;
        t += dt;
        const sec = Math.ceil(s.remaining);
        if (sec < lastSec && !s.paused) {
          const n = lastSec - sec;
          combo += n;
          const crit = chance(0.12);
          pops.push({ x: rand(-0.12, 0.12), y: 0, vy: -rand(60, 100), life: 1.3, txt: `−${n}${crit ? ' ' + pick(CRITS) : ''}`, crit });
          shake = crit ? 0.35 : 0.15; attack = 0.3;
          crit ? A.audio.sfx.crit() : A.audio.sfx.hit();
        }
        if (s.paused) combo = 0;
        lastSec = sec;
        const p = s.p;
        const np = p >= 0.9 ? 2 : p >= 0.5 ? 1 : 0;
        if (np > phase) {
          phase = np; phaseT = 3.5;
          phaseMsg = phase === 1 ? 'FAZA 2: BOSS SIĘ WKURZYŁ' : 'OSTATNIA FAZA: BOSS SIĘ POCI';
          A.audio.sfx.siren();
        }
        phase = np;
        tauntT += dt;
        if (tauntT > 9) { tauntT = 0; taunt = pick(A.BOSS_TAUNTS); }
        shake = Math.max(0, shake - dt); attack = Math.max(0, attack - dt);

        // arena
        const bg = g.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, phase === 2 ? '#3a0d16' : phase === 1 ? '#2c1236' : '#1c1d3a');
        bg.addColorStop(1, '#0d0d16');
        g.fillStyle = bg; g.fillRect(0, 0, w, h);
        g.fillStyle = 'rgba(255,255,255,.04)';
        for (let i = 0; i < 12; i++) g.fillRect(((i * 97 + t * 8) % (w + 80)) - 40, h * 0.78, 40, 2);
        g.fillStyle = '#26243a'; g.fillRect(0, h * 0.8, w, h * 0.2);

        // pasek HP
        const bw = Math.min(w * 0.8, 640), bx = (w - bw) / 2, by = 22;
        g.fillStyle = '#000'; roundRect(g, bx - 4, by - 4, bw + 8, 30, 8); g.fill();
        const hp = s.remaining / s.total;
        const hpg = g.createLinearGradient(bx, 0, bx + bw, 0);
        hpg.addColorStop(0, '#ff3b3b'); hpg.addColorStop(1, '#ff9f3b');
        g.fillStyle = '#3a1010'; roundRect(g, bx, by, bw, 22, 6); g.fill();
        g.fillStyle = hpg; roundRect(g, bx, by, Math.max(0, bw * hp), 22, 6); g.fill();
        g.fillStyle = '#fff'; g.font = '700 14px "Bricolage Grotesque", system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(`${name.toUpperCase()} · HP ${fmtInt(sec)} / ${fmtInt(Math.round(s.total))}`, w / 2, by + 11);

        // boss
        const bsx = w * 0.66, bsy = h * 0.52;
        const R = Math.min(w, h) * (0.2 - p * 0.05);
        const sh = shake > 0 ? rand(-6, 6) : 0;
        g.save(); g.translate(bsx + sh, bsy + Math.sin(t * 2) * 6);
        const col = phase === 2 ? '#b8452e' : phase === 1 ? '#8e3fb0' : '#4f6bd6';
        // cień
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, R * 1.15, R * 0.9, R * 0.15, 0, 0, TAU); g.fill();
        // ciało – galareta
        g.fillStyle = col; g.strokeStyle = '#111'; g.lineWidth = 3;
        g.beginPath();
        for (let a = 0; a <= TAU + 0.01; a += 0.2) {
          const rr = R * (1 + Math.sin(a * 5 + t * 3) * 0.05 + (a > Math.PI ? 0 : 0.08));
          const px = Math.cos(a) * rr * 1.1, py = Math.sin(a) * rr;
          a === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
        }
        g.closePath(); g.fill(); g.stroke();
        // rogi w fazie 2+
        if (phase >= 1) {
          g.fillStyle = '#f2e6c8';
          for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * R * 0.45, -R * 0.85); g.lineTo(sx * R * 0.75, -R * 1.45); g.lineTo(sx * R * 0.7, -R * 0.75); g.fill(); g.stroke(); }
        }
        // oczy patrzą na bohatera
        for (const sx of [-1, 1]) {
          g.fillStyle = '#fff'; g.beginPath(); g.arc(sx * R * 0.35, -R * 0.2, R * 0.2, 0, TAU); g.fill(); g.stroke();
          g.fillStyle = '#111'; g.beginPath(); g.arc(sx * R * 0.35 - R * 0.08, -R * 0.18, R * 0.09, 0, TAU); g.fill();
        }
        g.strokeStyle = '#111'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(-R * 0.55, -R * 0.48); g.lineTo(-R * 0.15, -R * (phase ? 0.32 : 0.42)); g.moveTo(R * 0.55, -R * 0.48); g.lineTo(R * 0.15, -R * (phase ? 0.32 : 0.42)); g.stroke();
        // usta z zębami
        g.fillStyle = '#300'; g.beginPath(); g.ellipse(0, R * 0.3, R * 0.4, R * (0.12 + Math.abs(Math.sin(t * 2)) * 0.08), 0, 0, TAU); g.fill();
        g.fillStyle = '#fff';
        for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * R * 0.1 - R * 0.04, R * 0.2); g.lineTo(i * R * 0.1 + R * 0.04, R * 0.2); g.lineTo(i * R * 0.1, R * 0.28); g.fill(); }
        // pot w ostatniej fazie
        if (phase === 2) {
          g.fillStyle = '#9fd8ff';
          for (let i = 0; i < 3; i++) { const yy = ((t * 40 + i * 30) % 60); g.beginPath(); g.arc(R * (0.7 + i * 0.1), -R * 0.6 + yy, 4, 0, TAU); g.fill(); }
        }
        g.restore();
        // dymek bossa
        g.font = `600 ${Math.max(13, Math.min(18, w * 0.02))}px "Bricolage Grotesque", system-ui`;
        const tw = g.measureText(taunt).width + 26;
        const tx = clamp(bsx - tw / 2, 8, w - tw - 8), ty = bsy - R * 1.65;
        g.fillStyle = '#fff'; roundRect(g, tx, ty, tw, 34, 12); g.fill();
        g.fillStyle = '#111'; g.textAlign = 'center'; g.fillText(taunt, tx + tw / 2, ty + 17);

        // bohater – pomidor z mieczem
        const hx = w * 0.26 + (attack > 0 ? Math.sin(attack / 0.3 * Math.PI) * w * 0.06 : 0), hy = h * 0.68;
        const HR = Math.min(w, h) * 0.06;
        g.save(); g.translate(hx, hy + (s.paused ? 0 : Math.abs(Math.sin(t * 6)) * -4));
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, HR * 1.6, HR, HR * 0.2, 0, 0, TAU); g.fill();
        g.fillStyle = '#e5432f'; g.strokeStyle = '#111'; g.lineWidth = 2.5;
        g.beginPath(); g.ellipse(0, 0, HR * 1.1, HR, 0, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = '#3c8d3a'; for (let i = 0; i < 5; i++) { g.save(); g.translate(0, -HR); g.rotate(i / 5 * TAU); g.beginPath(); g.ellipse(0, -HR * 0.2, HR * 0.1, HR * 0.3, 0, 0, TAU); g.fill(); g.restore(); }
        g.fillStyle = '#111'; g.beginPath(); g.arc(HR * 0.25, -HR * 0.15, HR * 0.1, 0, TAU); g.arc(HR * 0.6, -HR * 0.15, HR * 0.1, 0, TAU); g.fill();
        g.lineWidth = 3; g.beginPath(); g.moveTo(HR * 0.1, -HR * 0.4); g.lineTo(HR * 0.4, -HR * 0.3); g.moveTo(HR * 0.75, -HR * 0.4); g.lineTo(HR * 0.5, -HR * 0.3); g.stroke();
        // nogi
        g.beginPath(); g.moveTo(-HR * 0.4, HR * 0.9); g.lineTo(-HR * 0.5, HR * 1.5); g.moveTo(HR * 0.4, HR * 0.9); g.lineTo(HR * 0.5, HR * 1.5); g.stroke();
        // miecz
        const swing = attack > 0 ? -1.2 + (0.3 - attack) / 0.3 * 2.4 : -0.6 + Math.sin(t * 2) * 0.1;
        g.save(); g.translate(HR * 1.0, 0); g.rotate(swing);
        g.fillStyle = '#ddd'; g.fillRect(-3, -HR * 2.2, 6, HR * 2); g.strokeRect(-3, -HR * 2.2, 6, HR * 2);
        g.fillStyle = '#c99a2e'; g.fillRect(-10, -HR * 0.25, 20, 6); g.fillRect(-3, -HR * 0.2, 6, HR * 0.5);
        g.restore();
        if (s.paused) { g.fillStyle = '#fff'; g.font = '700 22px system-ui'; g.fillText('zzz', HR * 0.5, -HR * 1.6); }
        g.restore();

        // liczby obrażeń
        pops = pops.filter(q => q.life > 0);
        for (const q of pops) {
          q.life -= dt; q.y += q.vy * dt; q.vy += 60 * dt;
          g.globalAlpha = Math.min(1, q.life);
          g.font = `900 ${q.crit ? 30 : 24}px "Bricolage Grotesque", system-ui`;
          g.lineWidth = 5; g.strokeStyle = '#000'; g.fillStyle = q.crit ? '#ffd23b' : '#fff';
          g.strokeText(q.txt, bsx + q.x * w, bsy - R * 0.5 + q.y);
          g.fillText(q.txt, bsx + q.x * w, bsy - R * 0.5 + q.y);
        }
        g.globalAlpha = 1;
        if (combo > 2) {
          g.font = '900 28px "Bricolage Grotesque", system-ui'; g.textAlign = 'left';
          g.fillStyle = '#ffd23b'; g.strokeStyle = '#000'; g.lineWidth = 5;
          const ct = `COMBO ×${fmtInt(combo)}`;
          g.strokeText(ct, 20, h * 0.2); g.fillText(ct, 20, h * 0.2);
        }
        if (phaseT > 0) {
          phaseT -= dt;
          g.globalAlpha = Math.min(1, phaseT);
          g.font = `900 ${Math.min(42, w * 0.05)}px "Bricolage Grotesque", system-ui`; g.textAlign = 'center';
          g.fillStyle = '#ff4d4d'; g.strokeStyle = '#000'; g.lineWidth = 6;
          g.strokeText(phaseMsg, w / 2, h * 0.88); g.fillText(phaseMsg, w / 2, h * 0.88);
          g.globalAlpha = 1;
        }
        g.textBaseline = 'alphabetic';
        cap.innerHTML = `Każda sekunda zadaje <b>1 punkt obrażeń</b>. Krytyczne też. · Bossowi zostało <b>${mmss(s.remaining)}</b>`;
      },
      destroy() {},
    };
  },
});
