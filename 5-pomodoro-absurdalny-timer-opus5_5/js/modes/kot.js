'use strict';
/* Tryb: Kot i Stół – kot zrzuca jeden przedmiot na każdy kawałek czasu. */

const KOT_ITEMS = [
  ['☕', 'kubek z kawą'], ['🪴', 'kwiatek mamy'], ['📱', 'telefon (i dobrze)'], ['🥛', 'szklanka mleka'], ['🍅', 'zapasowy pomidor'],
  ['🏆', 'puchar za nic'], ['🔑', 'klucze, których potem nie znajdziesz'], ['🧸', 'miś z dzieciństwa'], ['🎂', 'tort urodzinowy'],
  ['📚', 'książka o produktywności'], ['🥚', 'jajko (surowe)'], ['🍷', 'kieliszek po babci'], ['💡', 'genialny pomysł'], ['⏰', 'budzik'],
  ['🧁', 'babeczka'], ['🎮', 'pad'], ['🖊️', 'jedyny działający długopis'], ['🕯️', 'świeczka zapachowa'], ['🪙', 'moneta na szczęście'], ['🥟', 'ostatni pieróg'],
];

A.defineMode({
  id: 'kot', name: 'Kot i Stół', icon: '🐈', breakOk: false,
  tagline: 'Każdy przedmiot na stole to kawałek czasu. Kot dba, żeby czas mijał.',
  create(host, s0) {
    const C = makeCanvas(host);
    const cap = el('div', 'mode-caption');
    host.appendChild(cap);
    const M = clamp(Math.round(s0.total / 120), 6, 14);
    const chunk = s0.total / M;
    const rnd = mulberry32(hashStr(s0.task.name || 'kot'));
    const pool = KOT_ITEMS.slice().sort(() => rnd() - 0.5);
    const items = Array.from({ length: M }, (_, i) => ({ e: pool[i % pool.length][0], name: pool[i % pool.length][1], state: 'table', x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, shards: [] }));
    let catX = null, t = 0, swipe = 0, lastMsg = '', msgT = 0, tail = 0, faceCam = 0;
    const startDown = Math.min(M, Math.floor(s0.elapsed / chunk + 1e-9));
    for (let i = 0; i < startDown; i++) items[i].state = 'floor';

    return {
      frame(s, dt) {
        C.fit();
        const { g, w, h } = C;
        t += dt;
        const down = Math.min(M, Math.floor(s.elapsed / chunk + 1e-9));
        const floorY = h * 0.9, tableY = h * 0.56, tx0 = w * 0.12, tx1 = w * 0.88;
        const slot = i => lerp(tx0 + 40, tx1 - 40, M === 1 ? 0.5 : i / (M - 1));
        const sz = Math.min(58, (tx1 - tx0) / M * 0.8);

        // zrzuć zaległe
        for (let i = 0; i < down; i++) {
          const it = items[i];
          if (it.state === 'table') {
            it.state = 'fall'; it.x = slot(i); it.y = tableY - sz * 0.5;
            it.vx = rand(-40, 40); it.vy = -rand(180, 260); it.vr = rand(-8, 8);
            swipe = 0.35; lastMsg = `${it.e} ${it.name} – strącone. Kot niczego nie żałuje.`; msgT = 4;
            A.audio.sfx.meow();
          }
        }
        // kot idzie do następnego przedmiotu
        const nextI = Math.min(M - 1, down);
        const target = down >= M ? w * 0.5 : slot(nextI) + sz * 0.9;
        if (catX == null) catX = target;
        const walking = Math.abs(catX - target) > 2;
        catX = approach(catX, target, dt * 160);
        const tillNext = (down + 1) * chunk - s.elapsed;
        faceCam = !walking && tillNext < 3 && tillNext > 1 ? Math.min(1, faceCam + dt * 3) : Math.max(0, faceCam - dt * 3);
        swipe = Math.max(0, swipe - dt);
        tail += dt;

        // pokój
        g.fillStyle = '#f3e3c8'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#e9d3ad';
        for (let x = 0; x < w; x += 60) g.fillRect(x, 0, 30, floorY);
        g.fillStyle = '#b98b5a'; g.fillRect(0, floorY, w, h - floorY);
        g.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 0; x < w; x += 90) g.fillRect(x, floorY, 3, h - floorY);
        // obraz na ścianie
        g.fillStyle = '#7a4b25'; g.fillRect(w * 0.42, h * 0.08, w * 0.16, h * 0.2);
        g.fillStyle = '#9fd3f0'; g.fillRect(w * 0.42 + 8, h * 0.08 + 8, w * 0.16 - 16, h * 0.2 - 16);
        g.font = `${Math.min(h * 0.1, 50)}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('🐈', w * 0.5, h * 0.18);
        // stół
        g.fillStyle = '#8b5a2b'; g.fillRect(tx0, tableY, tx1 - tx0, 16);
        g.fillStyle = '#6e4420'; g.fillRect(tx0 + 20, tableY + 16, 14, floorY - tableY - 16); g.fillRect(tx1 - 34, tableY + 16, 14, floorY - tableY - 16);

        // przedmioty na stole
        g.font = `${sz}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
        for (let i = 0; i < M; i++) {
          const it = items[i];
          if (it.state === 'table') {
            const wob = i === nextI && tillNext < 2 ? Math.sin(t * 30) * 0.12 : 0;
            g.save(); g.translate(slot(i), tableY - sz * 0.5); g.rotate(wob); g.fillText(it.e, 0, 0); g.restore();
          }
        }

        // kot
        const cx = catX, cy = tableY;
        g.save(); g.translate(cx, cy);
        const step = walking ? Math.sin(t * 12) * 5 : 0;
        // ogon
        g.strokeStyle = '#3b3b3b'; g.lineWidth = 9; g.lineCap = 'round';
        g.beginPath(); g.moveTo(34, -30); g.quadraticCurveTo(70, -40 + Math.sin(tail * 3) * 18, 60 + Math.sin(tail * 2) * 12, -85); g.stroke();
        // nogi
        g.strokeStyle = '#2f2f2f'; g.lineWidth = 9;
        g.beginPath(); g.moveTo(22, -18); g.lineTo(22 + step, 0); g.moveTo(10, -18); g.lineTo(10 - step, 0); g.stroke();
        // łapa przednia (zamach)
        const reach = swipe > 0 ? Math.sin((0.35 - swipe) / 0.35 * Math.PI) * 30 : (faceCam > 0 ? Math.sin(t * 6) * 6 + 6 : 0);
        g.beginPath(); g.moveTo(-18, -20); g.lineTo(-24 - reach, swipe > 0 ? -8 : 0); g.stroke();
        g.beginPath(); g.moveTo(-8, -20); g.lineTo(-8 + step, 0); g.stroke();
        // tułów
        g.fillStyle = '#3b3b3b';
        g.beginPath(); g.ellipse(8, -32, 34, 20, 0, 0, TAU); g.fill();
        // głowa
        const hx = -26, hy = -52;
        g.beginPath(); g.arc(hx, hy, 20, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(hx - 17, hy - 8); g.lineTo(hx - 14, hy - 30); g.lineTo(hx - 3, hy - 16); g.fill();
        g.beginPath(); g.moveTo(hx + 17, hy - 8); g.lineTo(hx + 14, hy - 30); g.lineTo(hx + 3, hy - 16); g.fill();
        // oczy (patrzy w kamerę przed zrzutem)
        const look = lerp(-5, 0, faceCam);
        g.fillStyle = '#d6e86a';
        g.beginPath(); g.ellipse(hx - 8 + look * 0.5, hy - 2, 5, 6, 0, 0, TAU); g.ellipse(hx + 6 + look * 0.5, hy - 2, 5, 6, 0, 0, TAU); g.fill();
        g.fillStyle = '#111';
        g.beginPath(); g.ellipse(hx - 8 + look, hy - 2, 1.6, 5, 0, 0, TAU); g.ellipse(hx + 6 + look, hy - 2, 1.6, 5, 0, 0, TAU); g.fill();
        g.fillStyle = '#e88a9a'; g.beginPath(); g.moveTo(hx - 3 + look * 0.4, hy + 6); g.lineTo(hx + 1 + look * 0.4, hy + 6); g.lineTo(hx - 1 + look * 0.4, hy + 9); g.fill();
        g.strokeStyle = '#ccc'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(hx - 8, hy + 8); g.lineTo(hx - 26, hy + 5); g.moveTo(hx - 8, hy + 10); g.lineTo(hx - 26, hy + 12);
        g.moveTo(hx + 6, hy + 8); g.lineTo(hx + 22, hy + 5); g.moveTo(hx + 6, hy + 10); g.lineTo(hx + 22, hy + 12); g.stroke();
        g.restore();
        if (faceCam > 0.5) {
          g.font = '600 14px "Bricolage Grotesque", system-ui'; g.fillStyle = '#2a1d17'; g.textAlign = 'center';
          g.fillText('*patrzy Ci prosto w oczy*', cx - 26, cy - 100);
        }

        // spadające i potłuczone
        g.font = `${sz}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
        for (let i = 0; i < M; i++) {
          const it = items[i];
          if (it.state === 'fall') {
            it.vy += 900 * dt; it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt;
            if (it.y >= floorY - sz * 0.3) {
              it.state = 'floor'; it.y = floorY - sz * 0.3; it.rot = rand(-1.4, 1.4);
              A.audio.sfx.crash();
              for (let k = 0; k < 10; k++) it.shards.push({ x: it.x, y: it.y, vx: rand(-200, 200), vy: rand(-260, -60), life: 1 });
            }
            g.save(); g.translate(it.x, it.y); g.rotate(it.rot); g.fillText(it.e, 0, 0); g.restore();
          } else if (it.state === 'floor') {
            if (!it.x) { it.x = slot(i) + rand(-20, 20); it.y = floorY - sz * 0.3; it.rot = rand(-1.4, 1.4); }
            g.save(); g.globalAlpha = 0.85; g.translate(it.x, it.y); g.rotate(it.rot); g.scale(0.8, 0.8); g.fillText(it.e, 0, 0); g.restore();
          }
          for (const sh of it.shards) {
            if (sh.life <= 0) continue;
            sh.life -= dt * 1.4; sh.vy += 700 * dt; sh.x += sh.vx * dt; sh.y = Math.min(floorY + 4, sh.y + sh.vy * dt);
            g.fillStyle = `rgba(120,120,140,${sh.life})`; g.fillRect(sh.x, sh.y, 4, 4);
          }
        }
        if (msgT > 0) {
          msgT -= dt;
          g.globalAlpha = Math.min(1, msgT);
          g.font = `700 ${Math.max(14, Math.min(22, w * 0.024))}px "Bricolage Grotesque", system-ui`;
          g.fillStyle = '#2a1d17'; g.textAlign = 'center';
          g.fillText('💥 ' + lastMsg, w / 2, h * 0.38);
          g.globalAlpha = 1;
        }

        const left = M - down;
        cap.innerHTML = `Na stole: <b>${left} ${plural(left, 'przedmiot', 'przedmioty', 'przedmiotów')}</b> · jeden przedmiot ≈ ${mmss(chunk)} · następny spadnie za <b>${mmss(Math.max(0, tillNext))}</b>`;
      },
      destroy() {},
    };
  },
});

function approach(v, target, step) { return v < target ? Math.min(v + step, target) : Math.max(v - step, target); }
