/* =====================================================================
   Gumowy czas – podróż bliźniaczek (paradoks bliźniąt)
   Ola zostaje na Ziemi, Ala leci rakietą z prędkością z suwaka i wraca,
   gdy na Ziemi minie 20 lat. W rakiecie mija 20 lat / γ.
   Portrety (Nano Banana) przenikają się z wiekiem.
   ===================================================================== */
'use strict';
(function (R) {
  const P = R.phys, F = R.fmt;
  const AGES = [10, 15, 20, 30];
  const START = 10, EARTH_YEARS = 20;
  const T_LAUNCH = 1.0, T_TRIP = 6.4, T_LAND = 0.6;

  function Twins(stage, hooks) {
    const el = document.createElement('div');
    el.className = 'twins'; el.hidden = true;
    const pics = who => AGES.map(a => '<img src="img/' + who + a + '.webp" alt="" data-age="' + a + '">').join('');
    el.innerHTML =
      '<div class="tw-box" role="dialog" aria-modal="false" aria-labelledby="tw-title">' +
      '<button class="tw-close" type="button" aria-label="Zamknij">×</button>' +
      '<h3 id="tw-title">Podróż bliźniaczek</h3>' +
      '<p class="tw-sub"></p>' +
      '<div class="tw-row">' +
        '<div class="tw-card ola"><div class="tw-pic">' + pics('ola') + '</div><b>Ola</b><small>zostaje na Ziemi</small><div class="tw-age"><span>10</span> <i>lat</i></div></div>' +
        '<div class="tw-mid"><canvas class="tw-track"></canvas><div class="tw-years"></div></div>' +
        '<div class="tw-card ala"><div class="tw-pic">' + pics('ala') + '</div><b>Ala</b><small>leci rakietą</small><div class="tw-age"><span>10</span> <i>lat</i></div></div>' +
      '</div>' +
      '<p class="tw-result" aria-live="polite"></p>' +
      '<div class="tw-actions"><button class="btn primary" type="button" data-again>🚀 Jeszcze raz</button><button class="btn" type="button" data-close>Wróć do rakiety</button></div>' +
      '</div>';
    stage.appendChild(el);
    const $ = s => el.querySelector(s);
    const cv = $('.tw-track'), ctx = cv.getContext('2d');
    const cards = { ola: $('.tw-card.ola'), ala: $('.tw-card.ala') };
    let run = null, raf = 0;
    const stars = Array.from({ length: 60 }, () => [Math.random(), Math.random(), Math.random() * 1.3 + 0.3]);

    function setAge(card, age) {
      const imgs = card.querySelectorAll('img');
      for (let i = 0; i < AGES.length; i++) {
        const lo = AGES[i - 1], a = AGES[i], hi = AGES[i + 1];
        let o = 0;
        if (age <= a && (lo === undefined || age >= lo)) o = lo === undefined ? 1 : (age - lo) / (a - lo);
        else if (age >= a && (hi === undefined || age <= hi)) o = hi === undefined ? 1 : (hi - age) / (hi - a);
        imgs[i].style.opacity = o.toFixed(3);
      }
      const n = Math.floor(age + 1e-9);
      card.querySelector('.tw-age span').textContent = n;
      card.querySelector('.tw-age i').textContent = F.yearsWord(n);
    }

    function dist(sp) {
      const ly = sp.beta * EARTH_YEARS / 2;              // w jedną stronę
      return ly >= 0.01 ? F.num(ly, ly < 1 ? 2 : 1) + ' ' + (ly === 1 ? 'roku' : 'lat') + ' świetlnych' : F.len(ly * P.LY);
    }

    // rakieta czeka na go(): startuje, gdy Tik skończy zapowiedź
    function open(sp, again) {
      el.hidden = false;
      const diff = EARTH_YEARS * (1 - sp.rate);
      run = { sp, t: 0, diff, landed: false, launched: false, waiting: true, last: performance.now() };
      $('.tw-sub').innerHTML = 'Ala leci z prędkością <b>' + F.pct(sp) + '</b> prędkości światła do gwiazdy odległej o <b>' + dist(sp) + '</b> i wraca. Na Ziemi mija <b>20 lat</b>.';
      $('.tw-result').innerHTML = '';
      el.classList.remove('done');
      setAge(cards.ola, START); setAge(cards.ala, START);
      $('.tw-years').innerHTML = '<span class="wait">Gotowe do startu…</span>';
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(step);
      if (hooks.onStart) hooks.onStart(run, again);
    }
    function go() { if (run && run.waiting) { run.waiting = false; run.last = performance.now(); } }
    function close() {
      cancelAnimationFrame(raf); run = null; el.hidden = true;
      if (hooks.onClose) hooks.onClose();
    }
    $('.tw-close').addEventListener('click', close);
    $('[data-close]').addEventListener('click', close);
    $('[data-again]').addEventListener('click', () => open(hooks.speed(), true));

    function step(now) {
      if (!run) return;
      const dt = Math.min(0.05, (now - run.last) / 1000); run.last = now;
      if (run.waiting) { draw(0, 0, now / 1000); raf = requestAnimationFrame(step); return; }
      run.t += dt;
      const tt = run.t - T_LAUNCH;
      if (!run.launched && run.t >= T_LAUNCH * 0.6) { run.launched = true; if (hooks.sfx) hooks.sfx('start'); }
      const p = P.clamp(tt / T_TRIP, 0, 1);
      // łagodny start i hamowanie przy gwieździe i na Ziemi
      const ease = p < 0.5 ? smooth(p * 2) / 2 : 0.5 + smooth((p - 0.5) * 2) / 2;
      const yE = EARTH_YEARS * p, yS = yE * run.sp.rate;
      setAge(cards.ola, START + yE);
      setAge(cards.ala, START + yS);
      $('.tw-years').innerHTML = '<span class="e">Na Ziemi minęło <b>' + fy(yE) + '</b></span>' +
        '<span class="s">W rakiecie minęło <b>' + fy(yS) + '</b></span>';
      draw(ease, p, now / 1000);
      if (p >= 1 && !run.landed && run.t > T_LAUNCH + T_TRIP + T_LAND) finish();
      raf = requestAnimationFrame(step);
    }
    const smooth = x => x * x * (3 - 2 * x);
    const fy = y => (y > 0 && y < 0.1 ? F.dur(y * P.YEAR) : F.num(y, 1) + ' ' + F.yearsWord(Math.round(y * 10) / 10));

    function finish() {
      run.landed = true;
      el.classList.add('done');
      const d = run.diff, ala = START + EARTH_YEARS * run.sp.rate;
      const aN = Math.floor(ala + 1e-9);
      let html;
      if (d >= 0.5) html = 'Ala ma <b>' + aN + ' ' + F.yearsWord(aN) + '</b>, a Ola <b>30 lat</b>. Bliźniaczka z rakiety jest młodsza o <b>' + F.years(d) + '</b>!';
      else html = 'Obie mają po <b>30 lat</b>. Ala jest młodsza tylko o <b>' + F.dur(d * P.YEAR) + '</b>. Za mało, żeby to zobaczyć.';
      $('.tw-result').innerHTML = html;
      if (hooks.sfx) hooks.sfx('powrot');
      if (hooks.onDone) hooks.onDone(run);
    }

    function draw(e, p, time) {
      const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.max(1, r.width), H = Math.max(1, r.height);
      if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) { ctx.fillStyle = 'rgba(210,225,255,' + (0.3 + 0.3 * Math.sin(time * 1.5 + s[0] * 20)).toFixed(2) + ')'; ctx.fillRect(s[0] * W, s[1] * H, s[2], s[2]); }
      const y = H * 0.5, xE = 34, xS = W - 30, R0 = Math.min(22, H * 0.2);
      // trasa
      ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(xE, y); ctx.lineTo(xS, y); ctx.stroke(); ctx.setLineDash([]);
      // Ziemia
      const g = ctx.createRadialGradient(xE - R0 * 0.3, y - R0 * 0.3, 2, xE, y, R0);
      g.addColorStop(0, '#6fbcff'); g.addColorStop(1, '#123b80');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(xE, y, R0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(90,190,100,0.9)';
      ctx.beginPath(); ctx.ellipse(xE - R0 * 0.25, y - R0 * 0.1, R0 * 0.35, R0 * 0.25, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(xE + R0 * 0.35, y + R0 * 0.35, R0 * 0.25, R0 * 0.18, 0.2, 0, Math.PI * 2); ctx.fill();
      // gwiazda docelowa
      const sg = ctx.createRadialGradient(xS, y, 0, xS, y, R0 * 1.6);
      sg.addColorStop(0, 'rgba(255,240,200,1)'); sg.addColorStop(0.3, 'rgba(255,190,90,0.8)'); sg.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(xS, y, R0 * 1.6, 0, Math.PI * 2); ctx.fill();
      // rakieta: tam (e < 0,5) i z powrotem
      const back = e > 0.5, f = back ? (1 - e) * 2 : e * 2;
      const x = xE + R0 + 8 + (xS - R0 * 1.4 - xE - R0 - 8) * f;
      const moving = p > 0 && p < 1;
      const bob = moving ? Math.sin(time * 9) * 1.2 : 0;
      ctx.save(); ctx.translate(x, y - 16 + bob); if (back) ctx.scale(-1, 1);
      if (moving) {
        const fl = 12 + Math.sin(time * 40) * 3;
        const fg = ctx.createLinearGradient(-12, 0, -12 - fl, 0);
        fg.addColorStop(0, 'rgba(255,250,220,1)'); fg.addColorStop(0.4, 'rgba(255,180,70,0.9)'); fg.addColorStop(1, 'rgba(255,90,40,0)');
        ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-12 - fl, 0); ctx.lineTo(-12, 4); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = '#ff9a3d';
      ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(-16, -10); ctx.lineTo(-6, -6); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-12, 6); ctx.lineTo(-16, 10); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#eef3fb';
      ctx.beginPath(); ctx.moveTo(-12, -6); ctx.lineTo(6, -6); ctx.quadraticCurveTo(16, -5, 18, 0); ctx.quadraticCurveTo(16, 5, 6, 6); ctx.lineTo(-12, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5ee3ff'; ctx.beginPath(); ctx.arc(5, 0, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // podpisy
      ctx.font = '600 11px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(190,240,255,0.8)';
      ctx.fillText('Ziemia', xE, y + R0 + 15);
      ctx.fillStyle = 'rgba(255,214,150,0.85)'; ctx.fillText('gwiazda', xS, y + R0 + 15);
    }

    return { open, close, go, isOpen: () => !el.hidden };
  }

  R.Twins = Twins;
})(window.Rel);
