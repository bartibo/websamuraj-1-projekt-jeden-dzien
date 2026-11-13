/* Dziesiątka – klawiatura ekranowa z kolorami palców i dłońmi */
(function () {
  'use strict';
  const DZ = window.DZ;

  const SVG = 'http://www.w3.org/2000/svg';
  // Palce lewej dłoni w układzie 250×130 (prawa jest lustrzanym odbiciem)
  const KSZTALTY = [
    { x: 6, y: 34, w: 32, h: 70 },    // mały
    { x: 50, y: 16, w: 32, h: 88 },   // serdeczny
    { x: 94, y: 6, w: 32, h: 98 },    // środkowy
    { x: 138, y: 18, w: 32, h: 86 },  // wskazujący
    { x: 184, y: 58, w: 32, h: 60, obr: 'rotate(50 200 112)' } // kciuk
  ];

  function dlon(strona) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 250 130');
    svg.setAttribute('class', 'dlon dlon-' + strona);
    svg.setAttribute('aria-hidden', 'true');
    const g = document.createElementNS(SVG, 'g');
    if (strona === 'P') g.setAttribute('transform', 'translate(250 0) scale(-1 1)');
    const spod = document.createElementNS(SVG, 'rect');
    for (const [k, v] of Object.entries({ x: 6, y: 78, width: 176, height: 50, rx: 25, class: 'spod' })) spod.setAttribute(k, v);
    g.appendChild(spod);
    KSZTALTY.forEach((s, i) => {
      const r = document.createElementNS(SVG, 'rect');
      const palec = strona === 'L' ? i : 9 - i;
      for (const [k, v] of Object.entries({ x: s.x, y: s.y, width: s.w, height: s.h, rx: s.w / 2, class: 'pal p' + palec })) r.setAttribute(k, v);
      if (s.obr) r.setAttribute('transform', s.obr);
      r.dataset.palec = palec;
      g.appendChild(r);
    });
    svg.appendChild(g);
    return svg;
  }

  class Klawiatura {
    constructor(host, opcje) {
      opcje = opcje || {};
      this.host = host;
      this.kl = {};
      const el = this.el = document.createElement('div');
      el.className = 'klaw' + (opcje.mala ? ' mala' : '');
      el.setAttribute('aria-hidden', 'true');
      for (const rzad of DZ.UKLAD) {
        const r = document.createElement('div');
        r.className = 'rz';
        for (const k of rzad) {
          const d = document.createElement('div');
          d.className = 'kl' + (k.p != null ? ' p' + k.p : ' bezp') + (k.spec ? ' spec' : '') + (k.kod === 'Space' ? ' spacja' : '');
          d.style.setProperty('--w', k.w);
          d.dataset.kod = k.kod;
          if (k.spec) d.innerHTML = '<span class="ke">' + k.etykieta + '</span>';
          else if (/[a-z]/.test(k.m)) d.innerHTML = '<span class="kg">' + k.d + '</span>' + (k.pl ? '<span class="kp">' + k.pl + '</span>' : '');
          else d.innerHTML = '<span class="ks">' + k.d + '</span><span class="kg">' + k.m + '</span>';
          if (k.kod === 'KeyF' || k.kod === 'KeyJ') d.insertAdjacentHTML('beforeend', '<i class="wyp"></i>');
          this.kl[k.kod] = d;
          r.appendChild(d);
        }
        el.appendChild(r);
      }
      host.appendChild(el);
      if (opcje.dlonie) {
        const dl = this.dlonie = document.createElement('div');
        dl.className = 'dlonie';
        dl.appendChild(dlon('L')); dl.appendChild(dlon('P'));
        host.appendChild(dl);
      }
    }
    // Które klawisze i palce są potrzebne do wpisania znaku
    static plan(ch) {
      const z = DZ.ZNAK[ch];
      if (!z) return null;
      const lewa = z.p <= 3;
      const kody = [z.kod], palce = ch === ' ' ? [4, 5] : [z.p], mody = [];
      if (z.shift) { const k = lewa ? 'ShiftRight' : 'ShiftLeft'; mody.push(k); palce.push(lewa ? 9 : 0); }
      if (z.alt) { mody.push('AltRight'); palce.push(5); }
      return { z, kody, mody, palce };
    }
    wyczysc() {
      for (const k in this.kl) this.kl[k].classList.remove('cel', 'cel-mod');
      if (this.dlonie) this.dlonie.querySelectorAll('.pal.akt').forEach(p => p.classList.remove('akt'));
    }
    wskaz(ch) {
      this.wyczysc();
      const p = Klawiatura.plan(ch);
      if (!p) return;
      this.kl[p.z.kod].classList.add('cel');
      for (const m of p.mody) this.kl[m].classList.add('cel-mod');
      if (this.dlonie) for (const nr of p.palce) { const e = this.dlonie.querySelector('.pal.p' + nr); if (e) e.classList.add('akt'); }
    }
    blysk(kod, ok) {
      const e = this.kl[kod];
      if (!e) return;
      const kl = ok ? 'traf' : 'pudlo';
      e.classList.remove('traf', 'pudlo');
      void e.offsetWidth;
      e.classList.add(kl);
      clearTimeout(e._t);
      e._t = setTimeout(() => e.classList.remove(kl), ok ? 140 : 420);
    }
    zaznacz(znaki) {
      for (const k in this.kl) this.kl[k].classList.remove('nowy');
      for (const ch of znaki || []) { const z = DZ.ZNAK[ch]; if (z) this.kl[z.kod].classList.add('nowy'); }
    }
    // Mapa ciepła: fn(opisKlawisza) → { tlo, tekst, opis } albo null
    cieplo(fn) {
      this.el.classList.add('cieplo');
      for (const kod in this.kl) {
        const e = this.kl[kod], w = fn(DZ.KLAWISZ[kod]);
        e.style.background = w ? w.tlo : '';
        e.style.color = w ? w.tekst : '';
        e.classList.toggle('brak', !w);
        if (w && w.opis) e.dataset.dymek = w.opis; else delete e.dataset.dymek;
      }
    }
    tryb(t) { // 'pelna' | 'kolory' | 'ukryta'
      this.host.classList.toggle('bez-celu', t !== 'pelna');
      this.host.classList.toggle('ukryta', t === 'ukryta');
    }
  }
  DZ.Klawiatura = Klawiatura;
})();
