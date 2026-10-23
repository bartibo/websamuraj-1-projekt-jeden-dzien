'use strict';
/* Tryb: Giełda Produktywności – indeks WIG-POMIDOR rośnie do zamknięcia sesji (końca zadania). */

A.defineMode({
  id: 'gielda', name: 'Giełda Produktywności', icon: '📈', breakOk: false,
  tagline: 'Indeks WIG-POMIDOR. Sesja zamyka się z końcem zadania. Analitycy w szoku.',
  create(host, s0) {
    host.innerHTML = `
      <div class="m-stock">
        <div class="ms-top">
          <div><div class="ms-name">WIG-POMIDOR</div><div class="ms-sub">Giełda Papierów Absurdalnych · sesja ciągła</div></div>
          <div class="ms-price"><b></b><span></span></div>
        </div>
        <canvas class="ms-chart"></canvas>
        <div class="ms-news"><b>PILNE</b><span></span></div>
        <div class="ms-ticker"><div class="ms-ticker-in"></div></div>
        <div class="ms-close"></div>
      </div>`;
    const cv = $('.ms-chart', host), g = cv.getContext('2d');
    const priceB = $('.ms-price b', host), priceS = $('.ms-price span', host), news = $('.ms-news span', host);
    const tickIn = $('.ms-ticker-in', host), closeEl = $('.ms-close', host);
    const seed = hashStr(s0.task.name || 'gielda');
    const noise = i => {
      const r = mulberry32(seed + i * 7919)();
      return r * 2 - 1;
    };
    // cena w chwili e (sekundy): trend w górę + fale + szum; deterministyczna, więc wykres przetrwa zmianę trybu
    const base = 1000;
    const price = e => {
      const k = e / s0.total;
      let v = base * (1 + 0.42 * k * k + 0.08 * k);
      v += Math.sin(e * 0.05 + seed % 7) * 18 + Math.sin(e * 0.013 + seed % 3) * 30;
      const i = Math.floor(e / 2);
      v += lerp(noise(i), noise(i + 1), (e / 2) - i) * 12;
      return v;
    };
    const heads = bag(A.HEADLINES);
    let newsT = 99, tickT = 99;
    function ticker() {
      tickIn.innerHTML = A.TICKERS.map(([n, b]) => {
        const ch = b + rand(-4, 4);
        return `<span class="${ch >= 0 ? 'up' : 'dn'}">${n} ${ch >= 0 ? '▲' : '▼'} ${fmt(Math.abs(ch), 2)}%</span>`;
      }).join('') + `<span class="up">${esc((s0.task.name || 'ZADANIE').toUpperCase().slice(0, 14))} ▲ ${fmt(rand(20, 90), 2)}%</span>`;
    }
    let lastClose = false;

    return {
      frame(s, dt) {
        if (!s.paused) { newsT += dt; tickT += dt; }
        if (newsT > 9) { newsT = 0; news.textContent = heads(); news.classList.remove('in'); void news.offsetWidth; news.classList.add('in'); }
        if (tickT > 14) { tickT = 0; ticker(); }
        const r = cv.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const W = Math.max(10, Math.round(r.width)), H = Math.max(10, Math.round(r.height));
        if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, W, H);
        const now = price(s.elapsed), open = price(0);
        const ch = (now / open - 1) * 100;
        priceB.textContent = fmt(now, 2);
        priceS.textContent = `${ch >= 0 ? '▲ +' : '▼ '}${fmt(ch, 2)}%`;
        priceS.className = ch >= 0 ? 'up' : 'dn';
        // siatka
        const N = 160;
        const pts = [];
        for (let i = 0; i <= N; i++) pts.push(price(s.total * i / N));
        // skala tylko z tego, co już było – prognoza może uciec poza wykres
        let lo = Math.min(open, now), hi = Math.max(open, now);
        for (let i = 0; i <= Math.floor(s.p * N); i++) { lo = Math.min(lo, pts[i]); hi = Math.max(hi, pts[i]); }
        const pad = Math.max(15, (hi - lo) * 0.25);
        lo -= pad; hi += pad;
        const Y = v => H - 20 - (v - lo) / (hi - lo) * (H - 40);
        g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
        g.fillStyle = 'rgba(255,255,255,.35)'; g.font = '11px ui-monospace, monospace'; g.textAlign = 'right';
        for (let k = 0; k <= 4; k++) {
          const v = lo + (hi - lo) * k / 4, y = Y(v);
          g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
          g.fillText(fmt(v, 0), W - 4, y - 3);
        }
        // linia do teraz
        const n = Math.max(1, Math.floor(s.p * N));
        g.beginPath();
        for (let i = 0; i <= n; i++) { const x = i / N * W, y = Y(pts[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); }
        const cx = s.p * W, cyy = Y(now);
        g.lineTo(cx, cyy);
        const up = ch >= 0;
        g.strokeStyle = up ? '#3ddc84' : '#ff5a5a'; g.lineWidth = 2.5; g.stroke();
        g.lineTo(cx, H); g.lineTo(0, H); g.closePath();
        const fg = g.createLinearGradient(0, 0, 0, H);
        fg.addColorStop(0, up ? 'rgba(61,220,132,.35)' : 'rgba(255,90,90,.35)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = fg; g.fill();
        // przyszłość – kropki
        g.setLineDash([3, 6]); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
        g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip(); g.beginPath(); g.moveTo(cx, cyy); g.lineTo(W, Y(pts[N])); g.stroke(); g.restore(); g.setLineDash([]);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx, cyy, 4 + Math.sin(performance.now() / 150) * 1.5, 0, TAU); g.fill();
        g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.4)';
        g.fillText('prognoza analityków (wróżka Bożenka) ↗', Math.min(W - 140, cx + (W - cx) / 2), clamp(Y(lerp(now, pts[N], 0.5)) - 10, 16, H - 8));
        closeEl.innerHTML = s.remaining > 0
          ? `Do zamknięcia sesji: <b>${mmss(s.remaining)}</b> · obroty: ${fmtInt(s.elapsed * 1337)} pomidorów`
          : '🔔 DZWONEK! Sesja zamknięta. Rekord wszech czasów.';
        if (s.remaining <= 0 && !lastClose) { lastClose = true; }
      },
      destroy() {},
    };
  },
});
