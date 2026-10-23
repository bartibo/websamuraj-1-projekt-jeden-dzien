'use strict';
/* Tryb: Zaświadczenie Urzędowe – pozostały czas słownie, po rzymsku, binarnie, Morse’em i na palcach. */

A.defineMode({
  id: 'urzedowe', name: 'Zaświadczenie Urzędowe', icon: '📜', breakOk: true,
  tagline: 'Pozostały czas poświadczony na piśmie, w ośmiu systemach naraz.',
  create(host, s0) {
    const nr = `ABS/${new Date().getFullYear()}/${String(hashStr(s0.task.name || 'x') % 9000 + 1000)}/${randInt(10, 99)}`;
    host.innerHTML = `
      <div class="m-doc">
        <div class="md-paper">
          <div class="md-head">
            <div>RZECZPOSPOLITA ABSURDALNA<br><small>Ministerstwo Czasu Nadmiernie Mierzonego<br>Departament Odliczania, pokój 404</small></div>
            <div class="md-nr">Sygn. akt: ${nr}</div>
          </div>
          <h2>ZAŚWIADCZENIE<br><small>o czasie pozostałym do końca zadania</small></h2>
          <p class="md-lead">Niniejszym zaświadcza się, że do końca zadania „<b>${esc(s0.task.name || 'Zadanie bez nazwy')}</b>” pozostało:</p>
          <table class="md-table">
            <tr><th>Słownie</th><td data-k="slow"></td></tr>
            <tr><th>Słownie, w minutach</th><td data-k="slowm"></td></tr>
            <tr><th>Cyframi rzymskimi</th><td data-k="rom"></td></tr>
            <tr><th>Binarnie</th><td data-k="bin" class="mono"></td></tr>
            <tr><th>Szesnastkowo</th><td data-k="hex" class="mono"></td></tr>
            <tr><th>Alfabetem Morse’a</th><td data-k="morse" class="mono"></td></tr>
            <tr><th>Na palcach obu rąk</th><td data-k="palce"></td></tr>
            <tr><th>W tuzinach</th><td data-k="tuz"></td></tr>
            <tr><th>Kreskami (minuty)</th><td data-k="tally" class="tally"></td></tr>
          </table>
          <p class="md-foot">Zaświadczenie wydaje się na wniosek własny zegara, w celu przedłożenia go samemu sobie. Od zaświadczenia nie przysługuje odwołanie, przysługuje natomiast herbata.</p>
          <div class="md-sign">
            <div class="md-stamp"><span>MINISTERSTWO<br>CZASU</span><b>⌛</b></div>
            <div class="md-sig"><i>K. Kazimierz</i><small>Kierownik Referatu Sekund</small></div>
          </div>
        </div>
      </div>`;
    const cells = {};
    $$('td[data-k]', host).forEach(td => { cells[td.dataset.k] = td; });
    let last = -1;
    const stamp = $('.md-stamp', host);

    return {
      frame(s) {
        const sec = Math.ceil(s.remaining);
        if (sec === last) return;
        last = sec;
        const m = Math.floor(sec / 60), r = sec % 60;
        cells.slow.textContent = `${slownie(sec, true)} ${plural(sec, 'sekunda', 'sekundy', 'sekund')}`;
        cells.slowm.textContent = m
          ? `${slownie(m, true)} ${plural(m, 'minuta', 'minuty', 'minut')}${r ? ` i ${slownie(r, true)} ${plural(r, 'sekunda', 'sekundy', 'sekund')}` : ' równo'}`
          : `zero minut i ${slownie(r, true)} ${plural(r, 'sekunda', 'sekundy', 'sekund')}`;
        cells.rom.textContent = sec ? roman(sec) + ' s' : 'NULLA (Rzymianie nie znali zera, my też już nie)';
        cells.bin.textContent = sec.toString(2).replace(/(\d)(?=(\d{4})+$)/g, '$1 ');
        cells.hex.textContent = '0x' + sec.toString(16).toUpperCase();
        cells.morse.textContent = morse(sec);
        const hands = Math.floor(sec / 10), fingers = sec % 10;
        cells.palce.textContent = `${fmtInt(hands)} ${plural(hands, 'raz', 'razy', 'razy')} wszystkie dziesięć palców i jeszcze ${fingers} ${plural(fingers, 'palec', 'palce', 'palców')}`;
        const dz = Math.floor(sec / 12), dr = sec % 12;
        cells.tuz.textContent = `${fmtInt(dz)} ${plural(dz, 'tuzin', 'tuziny', 'tuzinów')} i ${dr} ${plural(dr, 'sztuka', 'sztuki', 'sztuk')} luzem`;
        const mins = Math.ceil(sec / 60);
        let tally = '';
        for (let i = 0; i < Math.floor(mins / 5); i++) tally += '<span class="t5">||||</span>';
        tally += '<span>' + '|'.repeat(mins % 5) + '</span>';
        cells.tally.innerHTML = tally || '—';
        if (sec % 60 === 0 && sec > 0) { stamp.classList.remove('thump'); void stamp.offsetWidth; stamp.classList.add('thump'); A.audio.sfx.stamp(); }
      },
      destroy() {},
    };
  },
});
