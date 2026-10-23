'use strict';
/* Tryb: Przelicznik Absurdalny – pozostały czas w coraz dziwniejszych jednostkach. */

A.defineMode({
  id: 'jednostki', name: 'Przelicznik Absurdalny', icon: '🧮', breakOk: true,
  tagline: 'Pozostały czas w jednostkach, których nikt nie zatwierdził.',
  create(host) {
    host.innerHTML = `
      <div class="m-units">
        <div class="mu-label">Do końca zostało</div>
        <div class="mu-flip">
          <div class="mu-value"></div>
          <div class="mu-unit"></div>
        </div>
        <div class="mu-note"></div>
        <div class="mu-next"><span></span></div>
        <div class="mu-also"></div>
      </div>`;
    const valEl = $('.mu-value', host), unitEl = $('.mu-unit', host), noteEl = $('.mu-note', host);
    const flip = $('.mu-flip', host), bar = $('.mu-next span', host), also = $('.mu-also', host);
    const next = bag(A.UNITS);
    const PERIOD = 7.5;
    let unit = next(), timer = 0, lastStr = '';

    function setUnit(u) {
      unit = u;
      noteEl.textContent = u.note;
      flip.classList.remove('flip-in'); void flip.offsetWidth; flip.classList.add('flip-in');
      lastStr = '';
    }
    setUnit(unit);

    return {
      frame(s, dt) {
        if (!s.paused) timer += dt;
        if (timer >= PERIOD) { timer = 0; setUnit(next()); A.audio.sfx.flap(); }
        bar.style.width = (timer / PERIOD * 100) + '%';
        const v = s.remaining / unit.sec;
        const str = fmt(v);
        if (str !== lastStr) {
          lastStr = str;
          valEl.textContent = str;
          const len = str.length;
          valEl.style.setProperty('--len', len);
          valEl.classList.toggle('long', len > 14);
          valEl.classList.toggle('huge', len > 26);
          const r = parseFloat(str.replace(/ /g, '').replace(',', '.'));
          unitEl.textContent = unitForm(r, unit.forms);
        }
        also.textContent = `czyli po ludzku ${mmss(s.remaining)}, ale kto by tak liczył`;
      },
      destroy() {},
    };
  },
});
