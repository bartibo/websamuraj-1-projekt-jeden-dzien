/* Jednogłośnie – karty i stos do przesuwania. */
(function (global) {
  'use strict';

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* Windows nie ma emoji flag – zamiast flagi Włoch pokazałby litery „IT”. Tam zostawiamy samą nazwę kraju. */
  const BEZ_FLAG = /Windows/i.test(navigator.userAgent || '');
  function kraj(k) { return BEZ_FLAG ? String(k || '').replace(/[\u{1F1E6}-\u{1F1FF}]{2}\s*/gu, '') : (k || ''); }

  function czas(m) {
    if (!m) return '';
    const h = Math.floor(m / 60), r = m % 60;
    return h ? (h + ' h' + (r ? ' ' + r + ' min' : '')) : (r + ' min');
  }

  /** Treść karty (bez obsługi gestów). Używana też na ekranie dopasowania. */
  function tresc(item) {
    const typ = item.id[0] === 'f' ? 'film' : item.id[0] === 'o' ? 'obiad' : 'wlasne';
    const a = el('article', 'karta karta-' + typ);
    a.style.setProperty('--h', String(item.h || 0));
    a.appendChild(el('div', 'karta-tlo'));

    if (typ === 'obiad') {
      const e = el('div', 'karta-emoji'); e.appendChild(el('span', '', item.e)); a.appendChild(e);
      const info = el('div', 'karta-info');
      info.appendChild(el('p', 'karta-kraj', kraj(item.k)));
      info.appendChild(el('h3', 'karta-nazwa', item.n));
      info.appendChild(el('p', 'karta-opis', item.o));
      if (item.t && item.t.length) {
        const ul = el('ul', 'karta-tagi');
        for (const t of item.t) ul.appendChild(el('li', '', t));
        info.appendChild(ul);
      }
      a.appendChild(info);
    } else if (typ === 'film') {
      const wz = el('div', 'plakat-wzor');
      for (let i = 0; i < 14; i++) wz.appendChild(el('span', '', item.e));
      a.appendChild(wz);
      const g = el('div', 'plakat');
      g.appendChild(el('p', 'plakat-rok', String(item.r || '')));
      const t = el('h3', 'plakat-tytul', item.n);
      const dl = item.n.length;
      t.style.setProperty('--r', dl > 30 ? '0.62' : dl > 20 ? '0.75' : dl > 12 ? '0.9' : '1.1');
      g.appendChild(t);
      g.appendChild(el('p', 'plakat-meta', [item.e, item.g, czas(item.m)].filter(Boolean).join('  ·  ')));
      g.appendChild(el('p', 'karta-opis', item.o));
      if (item.d) g.appendChild(el('p', 'plakat-rez', 'reż. ' + item.d));
      a.appendChild(g);
    } else {
      const e = el('div', 'karta-emoji'); e.appendChild(el('span', '', item.e || '💡')); a.appendChild(e);
      const info = el('div', 'karta-info');
      info.appendChild(el('p', 'karta-kraj', item.a ? '✨ Dorzuca: ' + item.a : 'Propozycja z listy pokoju'));
      const t = el('h3', 'karta-nazwa', item.n);
      if (item.n.length > 28) t.classList.add('dluga');
      info.appendChild(t);
      a.appendChild(info);
    }
    return a;
  }

  /** Druga strona karty: więcej informacji i linki (zwiastun, przepis…). */
  function szczegoly(item, linki) {
    const typ = item.id[0] === 'f' ? 'film' : item.id[0] === 'o' ? 'obiad' : 'wlasne';
    const d = el('div', 'karta-szczegoly');
    d.setAttribute('role', 'region');
    d.setAttribute('aria-label', 'Szczegóły: ' + item.n);
    d.appendChild(el('p', 'sz-nad', typ === 'film' ? 'Film' : typ === 'obiad' ? kraj(item.k) || 'Danie' : 'Propozycja'));
    d.appendChild(el('h3', 'sz-tytul', (item.e ? item.e + ' ' : '') + item.n));
    if (typ === 'film') {
      d.appendChild(el('p', 'sz-meta', [item.r, item.g, czas(item.m)].filter(Boolean).join(' · ')));
      if (item.d) d.appendChild(el('p', 'sz-meta', 'Reżyseria: ' + item.d));
    }
    if (item.o) d.appendChild(el('p', 'sz-opis', item.o));
    if (item.t && item.t.length) {
      const ul = el('ul', 'karta-tagi');
      for (const t of item.t) ul.appendChild(el('li', '', t));
      d.appendChild(ul);
    }
    if (item.a) d.appendChild(el('p', 'sz-meta', 'Dorzuca: ' + item.a));
    if (linki) {
      const box = el('div', 'sz-linki');
      for (const [t, h] of linki(item)) {
        const a = el('a', 'btn btn-ciemny', t);
        a.href = h; a.target = '_blank'; a.rel = 'noopener';
        box.appendChild(a);
      }
      d.appendChild(box);
    }
    d.appendChild(el('p', 'sz-wroc', 'Dotknij karty, żeby wrócić · przesuwasz jak zwykle'));
    // linki działają normalnie – nie zaczynają przeciągania karty
    d.addEventListener('pointerdown', (e) => { if (e.target.closest('a, button')) e.stopPropagation(); });
    return d;
  }

  class Stos {
    /** @param {HTMLElement} root  @param {object} o { onSwipe(id, wartosc), linki(item) } */
    constructor(root, o) {
      this.root = root;
      this.o = o;
      this.karty = new Map(); // id → element
      this.kolejnosc = [];
      this.redukcja = matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /** Ustawia, które karty leżą na stosie (pierwsza na wierzchu). */
    ustaw(ids, items, goraco) {
      // usuń nieaktualne (poza lecącymi)
      for (const [id, k] of this.karty) {
        if (!ids.includes(id) && !k.classList.contains('leci')) { k.remove(); this.karty.delete(id); }
      }
      ids.forEach((id, i) => {
        let k = this.karty.get(id);
        if (!k || k.classList.contains('leci')) {
          const item = items.get(id);
          if (!item) return;
          k = this.zbuduj(item);
          this.karty.set(id, k);
          this.root.appendChild(k);
          if (i > 0) k.classList.add('wchodzi');
        }
        k.style.zIndex = String(100 - i);
        k.dataset.poz = String(Math.min(i, 3));
        k.classList.toggle('wierzch', i === 0);
        if (i !== 0) k.classList.remove('odwrocona');
        k.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
        this.goraco(k, goraco ? goraco(id) : null);
      });
      requestAnimationFrame(() => {
        for (const k of this.root.querySelectorAll('.wchodzi')) k.classList.remove('wchodzi');
      });
      this.kolejnosc = ids.slice();
    }

    goraco(k, g) {
      const b = k.querySelector('.goraco');
      if (!g) { b.hidden = true; return; }
      b.hidden = false;
      if (b.textContent !== g) {
        b.textContent = g;
        b.classList.remove('puls'); void b.offsetWidth; b.classList.add('puls');
      }
    }

    zbuduj(item) {
      const k = el('div', 'karta-ramka');
      k.dataset.id = item.id;
      k.appendChild(tresc(item));
      const g = el('p', 'goraco'); g.hidden = true; k.appendChild(g);
      k.appendChild(szczegoly(item, this.o.linki));
      const info = el('button', 'karta-i', 'i');
      info.type = 'button';
      info.setAttribute('aria-label', 'Szczegóły i linki (spacja)');
      info.setAttribute('aria-expanded', 'false');
      info.title = 'Szczegóły i linki (spacja)';
      info.addEventListener('pointerdown', (e) => e.stopPropagation());
      info.addEventListener('click', () => this.odwroc(k));
      k.appendChild(info);
      k.appendChild(el('span', 'pieczec pieczec-tak', 'TAK!'));
      k.appendChild(el('span', 'pieczec pieczec-nie', 'NIE'));
      k.appendChild(el('span', 'pieczec pieczec-weto', 'WETO'));
      this.gesty(k);
      return k;
    }

    /** Pokazuje / chowa szczegóły karty z wierzchu. */
    odwroc(k) {
      k = k || this.wierzch();
      if (!k || !k.classList.contains('wierzch')) return;
      const on = !k.classList.contains('odwrocona');
      k.classList.toggle('odwrocona', on);
      k.querySelector('.karta-i').setAttribute('aria-expanded', String(on));
    }

    wierzch() {
      const id = this.kolejnosc[0];
      const k = id && this.karty.get(id);
      return k && !k.classList.contains('leci') ? k : null;
    }

    gesty(k) {
      let x0 = 0, y0 = 0, dx = 0, dy = 0, t0 = 0, ciagnie = false, pid = null, hist = [];
      const tak = k.querySelector('.pieczec-tak'), nie = k.querySelector('.pieczec-nie');

      k.addEventListener('pointerdown', (e) => {
        if (!k.classList.contains('wierzch') || k.classList.contains('leci')) return;
        if (e.button !== undefined && e.button !== 0) return;
        ciagnie = true; pid = e.pointerId;
        x0 = e.clientX; y0 = e.clientY; dx = dy = 0; t0 = performance.now(); hist = [[t0, 0]];
        k.setPointerCapture(pid);
        k.classList.add('ciagnieta');
        // chwyt za górną połowę obraca w jedną stronę, za dolną – w drugą (jak prawdziwa karta)
        const r = k.getBoundingClientRect();
        k._znak = (e.clientY - r.top) < r.height / 2 ? 1 : -1;
      });
      k.addEventListener('pointermove', (e) => {
        if (!ciagnie || e.pointerId !== pid) return;
        dx = e.clientX - x0; dy = e.clientY - y0;
        const t = performance.now();
        hist.push([t, dx]); if (hist.length > 6) hist.shift();
        k.style.transform = `translate(${dx}px, ${dy * 0.6}px) rotate(${dx * 0.06 * k._znak}deg)`;
        const p = Math.max(-1, Math.min(1, dx / 110));
        tak.style.opacity = String(Math.max(0, p));
        nie.style.opacity = String(Math.max(0, -p));
        k.style.setProperty('--blask', String(Math.abs(p)));
        k.dataset.kier = p > 0.15 ? 'tak' : p < -0.15 ? 'nie' : '';
      });
      const koniec = (e) => {
        if (!ciagnie || (e && e.pointerId !== pid)) return;
        ciagnie = false;
        k.classList.remove('ciagnieta');
        const [ta, xa] = hist[0], [tb, xb] = hist[hist.length - 1];
        const v = (xb - xa) / Math.max(1, tb - ta); // px/ms
        if (Math.abs(dx) > 110 || (Math.abs(v) > 0.55 && Math.abs(dx) > 35)) {
          this.rzuc(dx > 0 ? 1 : -1, k, dy, Math.abs(v));
        } else {
          k.style.transform = '';
          tak.style.opacity = nie.style.opacity = '0';
          k.style.setProperty('--blask', '0');
          k.dataset.kier = '';
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6 && performance.now() - t0 < 350) this.odwroc(k);
        }
      };
      k.addEventListener('pointerup', koniec);
      k.addEventListener('pointercancel', koniec);
      k.addEventListener('lostpointercapture', koniec);
    }

    /** Wyrzuca kartę z wierzchu: kier 1 = tak, -1 = nie. `wartosc` – zapisany głos (np. 2 = weto). */
    rzuc(kier, k, dy, v, wartosc) {
      k = k || this.wierzch();
      if (!k) return false;
      const id = k.dataset.id;
      k.classList.add('leci');
      k.classList.remove('wierzch', 'odwrocona');
      k.dataset.kier = kier > 0 ? 'tak' : 'nie';
      (wartosc === 2 ? k.querySelector('.pieczec-weto') : kier > 0 ? k.querySelector('.pieczec-tak') : k.querySelector('.pieczec-nie')).style.opacity = '1';
      const w = Math.max(window.innerWidth, 600);
      const dur = this.redukcja ? 160 : Math.max(220, Math.min(480, 420 - (v || 0) * 120));
      k.style.transition = `transform ${dur}ms cubic-bezier(.2,.7,.3,1), opacity ${dur}ms ease`;
      requestAnimationFrame(() => {
        k.style.transform = `translate(${kier * w * 1.1}px, ${(dy || 0) * 0.6 + 60}px) rotate(${kier * 28}deg)`;
        k.style.opacity = '0.2';
      });
      setTimeout(() => { k.remove(); if (this.karty.get(id) === k) this.karty.delete(id); }, dur + 40);
      this.kolejnosc = this.kolejnosc.filter(x => x !== id);
      this.o.onSwipe(id, wartosc !== undefined ? wartosc : kier > 0 ? 1 : 0);
      return true;
    }

    /** Animacja cofnięcia: karta wraca z boku na wierzch. */
    wroc(id, kier) {
      const k = this.karty.get(id);
      if (!k) return;
      k.style.transition = 'none';
      k.style.transform = `translate(${kier * Math.max(window.innerWidth, 600)}px, 40px) rotate(${kier * 25}deg)`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        k.style.transition = '';
        k.style.transform = '';
      }));
    }

    wyczysc() {
      for (const k of this.karty.values()) k.remove();
      this.karty.clear();
      this.kolejnosc = [];
    }
  }

  global.Karty = { tresc, Stos, czas, kraj };
})(window);
