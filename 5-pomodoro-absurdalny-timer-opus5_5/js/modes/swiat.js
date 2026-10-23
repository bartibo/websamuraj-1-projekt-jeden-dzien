'use strict';
/* Tryb: Tymczasem na Świecie – liczniki tego, co się wydarzyło od startu zadania. */

A.defineMode({
  id: 'swiat', name: 'Tymczasem na Świecie', icon: '🌍', breakOk: true,
  tagline: 'Wszystko, co wydarzyło się, odkąd zaczęło się zadanie. Dane orientacyjne, szok prawdziwy.',
  create(host) {
    host.innerHTML = `
      <div class="m-world">
        <div class="mw-head">Od startu zadania (<b class="mw-el"></b> temu):</div>
        <ul class="mw-list"></ul>
        <div class="mw-foot"></div>
      </div>`;
    const list = $('.mw-list', host), elT = $('.mw-el', host), foot = $('.mw-foot', host);
    const SHOW = 7;
    const order = shuffle(A.WORLD);
    let shown = order.slice(0, SHOW), rest = order.slice(SHOW), swapT = 0;
    const lis = shown.map(w => {
      const li = el('li');
      li.innerHTML = `<span class="mw-ic">${w.icon}</span><span class="mw-tx"></span>`;
      list.appendChild(li);
      return li;
    });
    let ri = 0;
    return {
      frame(s, dt) {
        if (!s.paused) swapT += dt;
        if (swapT > 6) {
          swapT = 0;
          const i = ri++ % SHOW;
          rest.push(shown[i]);
          shown[i] = rest.shift();
          const li = lis[i];
          $('.mw-ic', li).textContent = shown[i].icon;
          li.classList.remove('swap'); void li.offsetWidth; li.classList.add('swap');
        }
        elT.textContent = mmss(s.elapsed);
        shown.forEach((w, i) => { $('.mw-tx', lis[i]).innerHTML = w.txt(s.elapsed * w.rate); });
        const births = s.remaining * 4.3;
        foot.innerHTML = `Do końca zostało <b>${mmss(s.remaining)}</b>. W tym czasie urodzi się jeszcze ok. <b>${fmtInt(births)}</b> ${plural(Math.round(births), 'osoba', 'osoby', 'osób')}, a światło przeleci <b>${fmt(s.remaining * 0.299792, 1)} mln km</b>.`;
      },
      destroy() {},
    };
  },
});
