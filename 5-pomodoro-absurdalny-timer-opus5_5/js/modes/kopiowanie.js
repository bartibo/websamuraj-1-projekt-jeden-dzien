'use strict';
/* Tryb: Kopiowanie – okno kopiowania zadania do rzeczywistości z wiarygodnym jak zwykle szacunkiem czasu. */

A.defineMode({
  id: 'kopiowanie', name: 'Kopiowanie Zadania', icon: '💾', breakOk: false,
  tagline: 'Pasek postępu jest prawdziwy. Szacowany czas – jak zawsze.',
  create(host, s0) {
    host.innerHTML = `
      <div class="m-copy">
        <div class="mc-win">
          <div class="mc-bar"><span>Kopiowanie zadania do rzeczywistości</span><i>_</i><i>□</i><i class="x">×</i></div>
          <div class="mc-body">
            <div class="mc-anim">
              <div class="mc-folder">📂<small>Głowa</small></div>
              <div class="mc-fly"><span>📄</span><span>📄</span><span>📄</span></div>
              <div class="mc-folder">📁<small>Rzeczywistość</small></div>
            </div>
            <div class="mc-file">Kopiowanie: <b></b></div>
            <div class="mc-from">Z: <b>Głowa (C:)</b> &nbsp;Do: <b>Rzeczywistość (R:)</b></div>
            <div class="mc-pct"></div>
            <canvas class="mc-graph"></canvas>
            <div class="mc-prog"><span></span></div>
            <dl class="mc-info">
              <dt>Pozostało ok.:</dt><dd class="mc-eta"></dd>
              <dt>Szybkość:</dt><dd class="mc-speed"></dd>
              <dt>Pozostało elementów:</dt><dd class="mc-items"></dd>
            </dl>
            <div class="mc-honest"></div>
            <div class="mc-btns"><button class="mc-cancel">Anuluj</button></div>
            <div class="mc-msg"></div>
          </div>
        </div>
      </div>`;
    const fileEl = $('.mc-file b', host), pct = $('.mc-pct', host), prog = $('.mc-prog span', host);
    const eta = $('.mc-eta', host), speed = $('.mc-speed', host), items = $('.mc-items', host), honest = $('.mc-honest', host);
    const msg = $('.mc-msg', host), cv = $('.mc-graph', host), gctx = cv.getContext('2d');
    const files = bag(A.FILES), etas = bag(A.ETA);
    const cancels = ['Anulowanie anulowane.', 'Nie da się. Próbowaliśmy w 2009.', 'Przycisk „Anuluj” jest dekoracyjny.', 'Wysłano wniosek o anulowanie. Rozpatrzenie: 90 dni.', 'Anulować można tylko w dni nieparzyste o pełnej godzinie.'];
    let ci = 0;
    $('.mc-cancel', host).addEventListener('click', () => {
      msg.textContent = cancels[ci++ % cancels.length];
      A.audio.sfx.sad();
    });
    let fT = 99, eT = 99, hist = [], hT = 0, mbps = 3.2;
    fileEl.textContent = files();

    return {
      frame(s, dt) {
        if (!s.paused) { fT += dt; eT += dt; hT += dt; }
        if (fT > 3.2) { fT = 0; fileEl.textContent = files(); }
        if (eT > 2.4) { eT = 0; eta.textContent = s.remaining < 4 ? 'zaraz… zaraz…' : etas(); }
        if (hT > 0.25) {
          hT = 0;
          mbps = clamp(mbps + rand(-0.9, 0.9) + (chance(0.04) ? rand(-3, 3) : 0), 0.05, 8.5);
          hist.push(mbps); if (hist.length > 120) hist.shift();
        }
        const p = s.p;
        pct.textContent = `Ukończono ${fmt(p * 100, 0)}%`;
        prog.style.width = (p * 100) + '%';
        speed.textContent = `${fmt(mbps, 1)} MB/s (≈ ${fmt(mbps * 0.37, 2)} pieroga/s)`;
        const left = Math.ceil(s.remaining);
        items.textContent = `${fmtInt(left)} (${fmt(left * 1.37, 1)} MB wątpliwości)`;
        honest.textContent = s.paused ? 'Kopiowanie wstrzymane. Pliki czekają cierpliwie.' : `Naprawdę zostało ${mmss(s.remaining)}. Nie mów systemowi.`;
        // wykres szybkości
        const r = cv.getBoundingClientRect();
        const W = Math.max(10, Math.round(r.width)), H = Math.max(10, Math.round(r.height));
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        gctx.clearRect(0, 0, W, H);
        const fillW = W * p;
        gctx.fillStyle = '#d6f2d6'; gctx.fillRect(0, 0, fillW, H);
        gctx.beginPath(); gctx.moveTo(0, H);
        hist.forEach((v, i) => gctx.lineTo(hist.length > 1 ? i / (hist.length - 1) * fillW : 0, H - v / 9 * H));
        gctx.lineTo(fillW, H); gctx.closePath();
        gctx.fillStyle = '#7ccf7c'; gctx.fill();
        gctx.strokeStyle = '#2e8b2e'; gctx.lineWidth = 1; gctx.stroke();
        gctx.strokeStyle = '#999'; gctx.strokeRect(0.5, 0.5, W - 1, H - 1);
      },
      destroy() {},
    };
  },
});
