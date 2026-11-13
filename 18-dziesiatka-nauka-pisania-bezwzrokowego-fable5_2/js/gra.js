/* Dziesiątka – gra „Deszcz słów” */
(function () {
  'use strict';
  const DZ = window.DZ;
  const $ = s => document.querySelector(s);
  const G = DZ.gra = { stan: 'brak' };   // brak | menu | gra | pauza | koniec
  let cfg, pole, ekran, slowa = [], pula = [], cel = null, st = null, raf = 0, ost = 0, doSpawnu = 0;

  const ZYCIA = 5;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  G.init = function (c) {
    cfg = c; pole = $('#graPole'); ekran = $('#graEkran');
    document.addEventListener('keydown', klawisz);
    window.addEventListener('blur', () => { if (G.stan === 'gra') pauza(); });
  };

  function hud() {
    $('#gPunkty').textContent = st ? st.punkty : 0;
    $('#gPoziom').textContent = st ? st.poziom : 1;
    $('#gSeria').textContent = st ? st.seria : 0;
    const z = st ? st.zycia : ZYCIA;
    $('#gZycia').innerHTML = Array.from({ length: ZYCIA }, (x, i) => '<i class="' + (i < z ? 'jest' : '') + '">♥</i>').join('');
  }
  function sprzataj() {
    cancelAnimationFrame(raf);
    for (const s of slowa) s.el.remove();
    slowa = []; cel = null;
  }
  function plansza(html) { ekran.innerHTML = '<div class="gra-plansza">' + html + '</div>'; ekran.hidden = false; }

  G.menu = function () {
    sprzataj(); st = null; hud();
    G.stan = 'menu';
    const wsz = cfg.wszystkie();
    plansza(`<h2>Deszcz słów</h2>
      <p>Wpisuj spadające słowa, zanim dotkną ziemi. Masz pięć żyć, a deszcz z każdym poziomem pada szybciej.</p>
      <div class="segment" id="gZrodlo"><button class="${wsz ? '' : 'akt'}" data-v="0">Litery z kursu (${cfg.ileLiter()})</button><button class="${wsz ? 'akt' : ''}" data-v="1">Cały słownik</button></div>
      <button class="przycisk glowny duzy" id="gStart">Start <kbd>Enter</kbd></button>
      <p class="drobne">Rekord: <b>${cfg.rekord()}</b> pkt</p>`);
    document.querySelectorAll('#gZrodlo button').forEach(b => b.onclick = () => { cfg.ustawWszystkie(b.dataset.v === '1'); G.menu(); });
    $('#gStart').onclick = G.start;
  };

  G.start = function () {
    sprzataj();
    pula = cfg.slowa();
    st = { punkty: 0, poziom: 1, zycia: ZYCIA, seria: 0, maxSeria: 0, trafione: 0, uderzenia: 0, bledne: 0, znaki: 0, czas: 0 };
    G.stan = 'gra';
    ekran.hidden = true; ekran.innerHTML = '';
    doSpawnu = 0.4; ost = performance.now();
    hud();
    raf = requestAnimationFrame(petla);
  };
  G.stop = function () { if (G.stan !== 'brak') { sprzataj(); G.stan = 'brak'; } };

  function pauza() {
    if (G.stan !== 'gra') return;
    G.stan = 'pauza'; cancelAnimationFrame(raf);
    plansza('<h2>Pauza</h2><p>Słowa czekają w powietrzu.</p><button class="przycisk glowny duzy" id="gWznow">Gram dalej <kbd>Enter</kbd></button>');
    $('#gWznow').onclick = wznow;
  }
  function wznow() {
    if (G.stan !== 'pauza') return;
    G.stan = 'gra'; ekran.hidden = true; ekran.innerHTML = '';
    ost = performance.now();
    raf = requestAnimationFrame(petla);
  }

  function nowe() {
    const maks = Math.min(10, 3 + Math.ceil(st.poziom / 2));
    let kand = pula.filter(w => w.length <= maks);
    if (!kand.length) kand = pula;
    const zajete = new Set(slowa.map(s => s.txt[0]));
    const wolne = kand.filter(w => !zajete.has(w[0]) && !slowa.some(s => s.txt === w));
    const txt = (wolne.length ? wolne : kand)[Math.floor(Math.random() * (wolne.length ? wolne : kand).length)];
    const el = document.createElement('div');
    el.className = 'gs';
    el.innerHTML = '<b></b><span>' + esc(txt) + '</span>';
    pole.appendChild(el);
    const W = pole.clientWidth, sw = el.offsetWidth;
    // szukamy miejsca, w którym słowo nie nachodzi na inne u góry pola
    let x = 12;
    for (let p = 0; p < 8; p++) {
      x = 12 + Math.random() * Math.max(1, W - sw - 24);
      if (!slowa.some(s => s.y < 44 && x < s.x + s.el.offsetWidth + 12 && x + sw + 12 > s.x)) break;
    }
    const s = { txt, el, x, y: -36, wpisane: 0 };
    el.style.transform = 'translate(' + x + 'px,' + s.y + 'px)';
    slowa.push(s);
  }
  function petla(t) {
    if (G.stan !== 'gra') return;
    const dt = Math.min(0.05, (t - ost) / 1000); ost = t;
    st.czas += dt;
    const H = pole.clientHeight, dno = H - 40;
    const v = (24 + st.poziom * 5) * (H / 460);
    doSpawnu -= dt;
    if ((doSpawnu <= 0 && slowa.length < 7) || !slowa.length) { nowe(); doSpawnu = Math.max(0.9, 3.1 - st.poziom * 0.17); }
    for (let i = slowa.length - 1; i >= 0; i--) {
      const s = slowa[i];
      if (s.martwe) continue;
      s.y += v * dt;
      s.el.style.transform = 'translate(' + s.x + 'px,' + s.y + 'px)';
      if (s.y + 30 >= dno) strata(s);
    }
    if (G.stan === 'gra') raf = requestAnimationFrame(petla);
  }
  function usun(s, klasa) {
    s.martwe = true;
    if (cel === s) cel = null;
    s.el.classList.add(klasa);
    setTimeout(() => { s.el.remove(); const i = slowa.indexOf(s); if (i >= 0) slowa.splice(i, 1); }, 260);
  }
  function strata(s) {
    usun(s, 'rozbite');
    st.zycia--; st.seria = 0;
    DZ.dzwiek.strata();
    pole.classList.remove('wstrzas'); void pole.offsetWidth; pole.classList.add('wstrzas');
    hud();
    if (st.zycia <= 0) koniec();
  }
  function trafienie(s) {
    st.trafione++; st.seria++; st.maxSeria = Math.max(st.maxSeria, st.seria);
    st.znaki += s.txt.length;
    st.punkty += s.txt.length * 10 + Math.min(st.seria, 20) * 2;
    st.poziom = 1 + Math.floor(st.trafione / 8);
    usun(s, 'trafione');
    DZ.dzwiek.trafione();
    hud();
  }
  function koniec() {
    G.stan = 'koniec';
    const w = { punkty: st.punkty, czas: st.czas, znaki: st.znaki, znMin: st.czas > 5 ? st.znaki / (st.czas / 60) : 0, dok: st.uderzenia ? 1 - st.bledne / st.uderzenia : 1 };
    const wynik = st;
    sprzataj();
    const rek = cfg.naKoniec(w);
    plansza(`<p class="nadtytul">${rek ? 'Nowy rekord' : 'Koniec gry'}</p><h2>${wynik.punkty} pkt</h2>
      <div class="panel-liczby"><div><b>${wynik.trafione}</b><span>słów</span></div><div><b>${wynik.poziom}</b><span>poziom</span></div>
        <div><b>${Math.round(w.dok * 100)}%</b><span>dokładność</span></div><div><b>${wynik.maxSeria}</b><span>najdłuższa seria</span></div></div>
      <p class="drobne">Tempo: ${cfg.fmt(w.znMin)} · rekord: ${cfg.rekord()} pkt</p>
      <button class="przycisk glowny duzy" id="gStart">Jeszcze raz <kbd>Enter</kbd></button>`);
    $('#gStart').onclick = G.start;
    G.blokada = performance.now() + 800;
  }

  function klawisz(e) {
    if (!cfg || !cfg.aktywny()) return;
    if (G.stan === 'menu' || G.stan === 'koniec') {
      if (e.key === 'Enter' && !(G.blokada > performance.now())) { e.preventDefault(); G.start(); }
      return;
    }
    if (G.stan === 'pauza') { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); wznow(); } return; }
    if (G.stan !== 'gra') return;
    if (e.key === 'Escape') { e.preventDefault(); pauza(); return; }
    if (e.metaKey || (e.ctrlKey && !e.altKey)) return;
    if (e.key === ' ' || e.key === 'Backspace') {
      e.preventDefault();
      if (cel) { cel.wpisane = 0; rysuj(cel); cel.el.classList.remove('cel'); cel = null; }
      return;
    }
    if (e.key.length !== 1) return;
    e.preventDefault();
    const ch = e.key;
    st.uderzenia++;
    if (!cel) {
      const kand = slowa.filter(s => !s.martwe && s.txt[0] === ch).sort((a, b) => b.y - a.y);
      if (kand.length) { cel = kand[0]; cel.el.classList.add('cel'); }
    }
    if (cel && cel.txt[cel.wpisane] === ch) {
      cel.wpisane++; rysuj(cel);
      DZ.dzwiek.klik();
      if (cel.wpisane >= cel.txt.length) trafienie(cel);
    } else {
      st.bledne++; st.seria = 0;
      DZ.dzwiek.blad();
      if (cel) { cel.el.classList.remove('pudlo'); void cel.el.offsetWidth; cel.el.classList.add('pudlo'); }
      hud();
    }
  }
  function rysuj(s) {
    s.el.firstChild.textContent = s.txt.slice(0, s.wpisane);
    s.el.lastChild.textContent = s.txt.slice(s.wpisane);
  }
})();
