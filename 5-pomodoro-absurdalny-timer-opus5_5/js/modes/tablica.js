'use strict';
/* Tryb: Tablica Odjazdów – zadanie odjeżdża jak pociąg, a dworzec ogłasza komunikaty. */

const FLAP_CHARS = ' ABCDEFGHIJKLMNOPRSTUWXYZĄĆĘŁŃÓŚŹŻ0123456789:+-∞.';

// Tekst z klapek: zmieniona litera „przelatuje” przez kilka losowych znaków
function FlapRow(host, len, cls) {
  const row = el('div', 'flap-row ' + (cls || ''));
  const cells = [];
  for (let i = 0; i < len; i++) {
    const c = el('span', 'flap');
    c.textContent = ' ';
    row.appendChild(c);
    cells.push({ el: c, cur: ' ', target: ' ', spin: 0 });
  }
  host.appendChild(row);
  return {
    row,
    set(text) {
      text = String(text).toUpperCase().padEnd(len, ' ').slice(0, len);
      for (let i = 0; i < len; i++) {
        const c = cells[i];
        if (c.target !== text[i]) { c.target = text[i]; c.spin = 4 + ((Math.random() * 5) | 0) + (i % 4); }
      }
    },
    step() {
      let any = false;
      for (const c of cells) {
        if (c.spin > 0) {
          c.spin--;
          const ch = c.spin === 0 ? c.target : FLAP_CHARS[(Math.random() * FLAP_CHARS.length) | 0];
          if (ch !== c.cur) { c.cur = ch; c.el.textContent = ch; c.el.classList.remove('flip'); void c.el.offsetWidth; c.el.classList.add('flip'); }
          any = true;
        }
      }
      return any;
    },
  };
}

A.defineMode({
  id: 'tablica', name: 'Tablica Odjazdów', icon: '🚆', breakOk: true,
  tagline: 'Twoje zadanie to pociąg. Odjeżdża punktualnie. Pierwszy taki w historii.',
  create(host, s0) {
    host.innerHTML = `
      <div class="m-board">
        <div class="mb-head">
          <div class="mb-title">ODJAZDY <small>Dworzec Główny Twojej Produktywności</small></div>
          <div class="mb-clock"></div>
        </div>
        <div class="mb-cols"><span>GODZ.</span><span>POCIĄG</span><span>RELACJA</span><span>PERON</span><span>UWAGI</span></div>
        <div class="mb-rows"></div>
        <div class="mb-marquee"><div class="mb-marquee-in"></div></div>
      </div>`;
    const rowsHost = $('.mb-rows', host), clock = $('.mb-clock', host), marq = $('.mb-marquee-in', host);
    const rows = [];
    const NROWS = 6;
    for (let i = 0; i < NROWS; i++) {
      const r = el('div', 'mb-row' + (i === 0 ? ' main' : ''));
      rowsHost.appendChild(r);
      rows.push([FlapRow(r, 5, 'c-time'), FlapRow(r, 16, 'c-name'), FlapRow(r, 14, 'c-dest'), FlapRow(r, 2, 'c-peron'), FlapRow(r, 18, 'c-note')]);
    }
    const taskName = (s0.task.name || 'ZADANIE').toUpperCase();
    const trains = shuffle(A.TRAINS);
    const end = new Date(Date.now() + s0.remaining * 1000);
    const hhmm = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const peron = String(randInt(1, 9));
    let tNext = end.getTime();
    for (let i = 1; i < NROWS; i++) {
      const tr = trains[(i - 1) % trains.length];
      tNext += randInt(3, 17) * 60000;
      const d = new Date(tNext);
      rows[i][0].set(hhmm(d)); rows[i][1].set(`${tr[0]} ${tr[1]}`); rows[i][2].set(tr[2]); rows[i][3].set(String(randInt(1, 9))); rows[i][4].set(tr[3]);
    }
    rows[0][0].set(hhmm(end)); rows[0][2].set('KONIEC ZADANIA'); rows[0][3].set(peron);

    // przewijany komunikat
    let annT = 0;
    const ann = bag(A.ANNOUNCEMENTS);
    function announce(first) {
      const txt = ann().replace(/\{task\}/g, s0.task.name || 'Zadanie');
      marq.textContent = '🔊 ' + txt + '   ·   ' + txt;
      marq.style.animation = 'none'; void marq.offsetWidth; marq.style.animation = '';
      if (!first) {
        A.audio.sfx.gong();
        setTimeout(() => A.audio.say(txt, { rate: 0.95 }), 1300);
      }
    }
    announce(true);

    let stepT = 0, nameScroll = 0, nameT = 0;
    return {
      frame(s, dt) {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString('pl-PL');
        const endNow = new Date(Date.now() + s.remaining * 1000);
        rows[0][0].set(hhmm(endNow));
        // długie nazwy przewijają się w polu pociągu
        nameT += dt;
        if (nameT > 0.6) {
          nameT = 0;
          const full = `EX ${taskName}`;
          if (full.length > 16) { nameScroll = (nameScroll + 1) % (full.length + 4); rows[0][1].set((full + '    ' + full).slice(nameScroll, nameScroll + 16)); }
          else rows[0][1].set(full);
        }
        const r = s.remaining;
        rows[0][4].set(s.paused ? 'POSTÓJ (PAUZA)' : r > 60 ? `ODJAZD ZA ${mmss(r)}` : r > 10 ? `WSIADAĆ! ${Math.ceil(r)} S` : 'DRZWI ZAMYKAJĄ SIĘ');
        stepT += dt;
        if (stepT > 0.045) {
          stepT = 0;
          let any = false;
          for (const row of rows) for (const f of row) any = f.step() || any;
          if (any && Math.random() < 0.5) A.audio.sfx.flap();
        }
        if (!s.paused) {
          annT += dt;
          if (annT > 38) { annT = 0; announce(false); }
        }
      },
      destroy() { if ('speechSynthesis' in window) speechSynthesis.cancel(); },
    };
  },
});
