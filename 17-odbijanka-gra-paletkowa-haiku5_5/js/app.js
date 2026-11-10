/* Odbijanka – pętla gry, menu, wejście (klawiatura, mysz, dotyk), zapis w przeglądarce. */
(function () {
  'use strict';
  const G = window.Odbijanka;
  const W = G.W;
  const H = G.H;

  const canvas = document.getElementById('plotno');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);

  const el = {
    hud: $('hud'),
    menu: $('menu'),
    pauza: $('pauza'),
    koniec: $('koniec'),
    sekcjaPoziom: $('sekcja-poziom'),
    sekcjaMecz: $('sekcja-mecz'),
    info: $('sterowanie-info'),
    rekordSolo: $('rekord-solo'),
    koniecTytul: $('koniec-tytul'),
    koniecWynik: $('koniec-wynik'),
    koniecOpis: $('koniec-opis'),
    btnDzwiek: $('btn-dzwiek'),
    btnPauza: $('btn-pauza'),
  };

  const KLUCZ_USTAWIEN = 'odbijanka-ustawienia';
  const KLUCZ_REKORDU = 'odbijanka-rekord';

  function czytaj(klucz, domyslne) {
    try {
      const s = localStorage.getItem(klucz);
      return s ? JSON.parse(s) : domyslne;
    } catch (e) {
      return domyslne;
    }
  }
  function zapisz(klucz, wartosc) {
    try { localStorage.setItem(klucz, JSON.stringify(wartosc)); } catch (e) { /* prywatny tryb – trudno */ }
  }

  const OPISY = {
    ai: 'Sterowanie: mysz / dotyk albo W i S (lub ↑ i ↓). Pierwszy do wyznaczonej liczby punktów wygrywa.',
    dwoch: 'Gracz 1: W i S (albo mysz / dotyk po lewej stronie). Gracz 2: ↑ i ↓ (albo mysz / dotyk po prawej).',
    solo: 'Jedna paletka, trzy życia. Odbijaj jak najdłużej. Duch pokazuje, gdzie była Twoja paletka w najlepszej serii i jak wyglądał jej przebieg.',
  };

  const ust = Object.assign({ tryb: 'ai', poziom: 1, cel: 7 }, czytaj(KLUCZ_USTAWIEN, {}));
  let rekord = czytaj(KLUCZ_REKORDU, null);
  let partia = null;
  let stan = 'menu';              // 'menu' | 'gra' | 'pauza' | 'koniec'
  let ostatni = performance.now();
  let skalaX = 1;
  let skalaY = 1;
  const klawisze = new Set();

  // ---------- rozmiar canvasu (16:10, dopasowany do okna, ostre na ekranach HiDPI) ----------
  function dopasujRozmiar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const szer = Math.min(window.innerWidth, window.innerHeight * (W / H));
    const wys = szer * (H / W);
    canvas.style.width = szer + 'px';
    canvas.style.height = wys + 'px';
    canvas.width = Math.round(szer * dpr);
    canvas.height = Math.round(wys * dpr);
    skalaX = canvas.width / W;
    skalaY = canvas.height / H;
  }

  // ---------- menu ----------
  function odswiezMenu() {
    document.querySelectorAll('[data-tryb]').forEach((b) => b.classList.toggle('aktywny', b.dataset.tryb === ust.tryb));
    document.querySelectorAll('[data-poziom]').forEach((b) => b.classList.toggle('aktywny', Number(b.dataset.poziom) === ust.poziom));
    document.querySelectorAll('[data-cel]').forEach((b) => b.classList.toggle('aktywny', Number(b.dataset.cel) === ust.cel));
    el.sekcjaPoziom.classList.toggle('ukryty', ust.tryb !== 'ai');
    el.sekcjaMecz.classList.toggle('ukryty', ust.tryb === 'solo');
    el.info.textContent = OPISY[ust.tryb];
    el.rekordSolo.textContent = rekord ? rekord.wynik : 0;
  }

  function zapiszUst() { zapisz(KLUCZ_USTAWIEN, ust); }

  document.querySelectorAll('[data-tryb]').forEach((b) => b.addEventListener('click', () => {
    ust.tryb = b.dataset.tryb;
    zapiszUst();
    odswiezMenu();
  }));
  document.querySelectorAll('[data-poziom]').forEach((b) => b.addEventListener('click', () => {
    ust.poziom = Number(b.dataset.poziom);
    zapiszUst();
    odswiezMenu();
  }));
  document.querySelectorAll('[data-cel]').forEach((b) => b.addEventListener('click', () => {
    ust.cel = Number(b.dataset.cel);
    zapiszUst();
    odswiezMenu();
  }));

  function nowaPartia() {
    return new G.Partia({
      tryb: ust.tryb,
      poziom: ust.poziom,
      celPunktow: ust.cel,
      duch: ust.tryb === 'solo' ? rekord : null,
    });
  }

  function ukryjNakladki() {
    el.menu.classList.add('ukryty');
    el.pauza.classList.add('ukryty');
    el.koniec.classList.add('ukryty');
  }

  function start() {
    G.dzwiek.init();
    partia = nowaPartia();
    ukryjNakladki();
    el.hud.classList.remove('ukryty');
    document.body.classList.add('w-grze');
    stan = 'gra';
  }

  function naMenu() {
    partia = new G.Partia({ tryb: 'demo', celPunktow: 999 });
    ukryjNakladki();
    el.menu.classList.remove('ukryty');
    el.hud.classList.add('ukryty');
    document.body.classList.remove('w-grze');
    stan = 'menu';
    odswiezMenu();
  }

  // ---------- pauza ----------
  function pauza() {
    if (stan !== 'gra') return;
    stan = 'pauza';
    el.pauza.classList.remove('ukryty');
  }
  function wznow() {
    if (stan !== 'pauza') return;
    stan = 'gra';
    el.pauza.classList.add('ukryty');
  }
  function przelaczPauze() {
    if (stan === 'gra') pauza();
    else if (stan === 'pauza') wznow();
  }

  // ---------- koniec ----------
  function nazwaZwyciezcy() {
    if (partia.tryb === 'dwoch') return partia.zwyciezca === 0 ? 'Wygrywa Gracz 1!' : 'Wygrywa Gracz 2!';
    return partia.zwyciezca === 0 ? 'Wygrywasz!' : 'Komputer wygrał';
  }

  function pokazKoniec() {
    stan = 'koniec';
    if (partia.tryb === 'solo') {
      const wynik = partia.trafienia;
      const stary = rekord ? rekord.wynik : 0;
      const nowy = wynik > stary;
      if (nowy) {
        rekord = { wynik, historia: partia.historia };
        zapisz(KLUCZ_REKORDU, rekord);
      }
      el.koniecTytul.textContent = 'Koniec serii';
      el.koniecWynik.textContent = wynik + ' odbić';
      let opis = nowy && wynik > 0 ? 'Nowy rekord! Poprzedni: ' + stary + '.' : 'Rekord: ' + (rekord ? rekord.wynik : 0) + '.';
      if (partia.duch && !nowy) opis += ' Duch miał ' + partia.duch.wynik + '.';
      el.koniecOpis.textContent = opis;
    } else {
      el.koniecTytul.textContent = nazwaZwyciezcy();
      el.koniecWynik.textContent = partia.wynik[0] + ' : ' + partia.wynik[1];
      el.koniecOpis.textContent = partia.tryb === 'ai'
        ? 'Poziom: ' + G.POZIOMY_AI[ust.poziom].nazwa + '. Rewanż jednym kliknięciem.'
        : 'Rewanż jednym kliknięciem.';
    }
    el.koniec.classList.remove('ukryty');
    el.hud.classList.add('ukryty');
    document.body.classList.remove('w-grze');
  }

  // ---------- wejście ----------
  function sterujKlawiszami() {
    const p1 = partia.paletki[0];
    const p2 = partia.paletki[1];
    const dwoch = ust.tryb === 'dwoch';
    const gora1 = klawisze.has('KeyW') || (!dwoch && klawisze.has('ArrowUp'));
    const dol1 = klawisze.has('KeyS') || (!dwoch && klawisze.has('ArrowDown'));
    p1.dir = (dol1 ? 1 : 0) - (gora1 ? 1 : 0);
    if (dwoch) {
      p2.dir = (klawisze.has('ArrowDown') ? 1 : 0) - (klawisze.has('ArrowUp') ? 1 : 0);
    }
    if (p1.dir !== 0) p1.cel = null;
    if (p2.dir !== 0) p2.cel = null;
  }

  function naWskaznik(e) {
    if (stan !== 'gra' || !partia) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * W;
    const y = (e.clientY - r.top) / r.height * H;
    const idx = ust.tryb === 'dwoch' && x > W / 2 ? 1 : 0;
    partia.paletki[idx].cel = y;
    if (e.pointerType !== 'mouse') e.preventDefault();
  }
  canvas.addEventListener('pointermove', naWskaznik);
  canvas.addEventListener('pointerdown', naWskaznik);

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    klawisze.add(e.code);
    if (e.repeat) return;

    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (stan === 'pauza') wznow();
      else przelaczPauze();
    } else if (e.code === 'KeyM') {
      G.dzwiek.init();
      odswiezDzwiek();
    } else if (e.code === 'Enter') {
      if (stan === 'menu' || stan === 'koniec') start();
      else if (stan === 'pauza') wznow();
    }
  });
  window.addEventListener('keyup', (e) => klawisze.delete(e.code));
  window.addEventListener('blur', () => {
    klawisze.clear();
    if (stan === 'gra') pauza();
  });

  function odswiezDzwiek() {
    el.btnDzwiek.textContent = G.dzwiek.jestWyciszony() ? 'Dźwięk: wył.' : 'Dźwięk: wł.';
  }
  el.btnDzwiek.addEventListener('click', () => {
    G.dzwiek.init();
    G.dzwiek.przelacz();
    odswiezDzwiek();
  });
  el.btnPauza.addEventListener('click', przelaczPauze);

  $('start').addEventListener('click', start);
  $('rewanz').addEventListener('click', start);
  $('koniec-menu').addEventListener('click', naMenu);
  $('pauza-menu').addEventListener('click', naMenu);
  $('wznow').addEventListener('click', wznow);
  $('pauza-restart').addEventListener('click', start);

  window.addEventListener('resize', dopasujRozmiar);

  // ---------- pętla ----------
  function petla(t) {
    const dt = Math.min(0.033, Math.max(0, (t - ostatni) / 1000));
    ostatni = t;

    if (partia) {
      if (stan === 'gra') {
        sterujKlawiszami();
        partia.krok(dt);
        if (partia.stan === 'koniec') pokazKoniec();
      } else if (stan === 'menu') {
        partia.krok(dt);   // tło menu – demo
      }
      ctx.setTransform(skalaX, 0, 0, skalaY, 0, 0);
      G.rysuj(ctx, partia, t / 1000);
    }
    requestAnimationFrame(petla);
  }

  // ---------- start aplikacji ----------
  dopasujRozmiar();
  odswiezDzwiek();
  odswiezMenu();
  naMenu();
  requestAnimationFrame((t) => {
    ostatni = t;
    petla(t);
  });
})();
