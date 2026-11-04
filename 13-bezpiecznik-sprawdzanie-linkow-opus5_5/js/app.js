/* Bezpiecznik – interfejs: pole, sprawdzanie, pełnoekranowy wynik. */
(function (BZ) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ekranStart = $('start'), ekranSpr = $('sprawdzanie'), ekranWynik = $('wynik');
  const pole = $('pole'), akcja = $('akcja'), akcjaTekst = $('akcja-tekst'), komunikat = $('komunikat'), wyczysc = $('wyczysc');
  const IKONY = {
    zielony: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="9"/><path d="m28 51 15 15 30-32" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    czerwony: '<svg viewBox="0 0 100 100"><path d="M31 5h38l26 26v38L69 95H31L5 69V31z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="M50 24v34" stroke="currentColor" stroke-width="11" stroke-linecap="round"/><circle cx="50" cy="75" r="6.5" fill="currentColor"/></svg>'
  };

  let trwa = false;
  let ostatniTekst = '';

  /* listy oszustw pobierają się w tle od razu po otwarciu */
  BZ.zacznijPobieracListy();

  /* ---------- pole i przycisk ---------- */
  function odswiezPrzycisk() {
    const pelne = pole.value.trim().length > 0;
    akcjaTekst.textContent = pelne ? 'Sprawdź' : 'Wklej link';
    $('ikona-wklej').toggleAttribute('hidden', pelne);
    $('ikona-sprawdz').toggleAttribute('hidden', !pelne);
    wyczysc.hidden = !pelne;
    if (!pelne) komunikat.textContent = '';
  }
  pole.addEventListener('input', odswiezPrzycisk);
  pole.addEventListener('paste', () => setTimeout(() => { odswiezPrzycisk(); start(); }, 30));
  pole.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); start(); }
  });
  wyczysc.addEventListener('click', () => { pole.value = ''; odswiezPrzycisk(); pole.focus(); });

  $('formularz').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (pole.value.trim()) return start();
    // puste pole: spróbuj wkleić ze schowka
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) throw new Error('brak');
      const txt = await navigator.clipboard.readText();
      if (!txt.trim()) { komunikat.textContent = 'Schowek jest pusty. Najpierw skopiuj link z wiadomości.'; return; }
      pole.value = txt;
      odswiezPrzycisk();
      start();
    } catch (err) {
      pole.focus();
      const dotyk = matchMedia('(pointer: coarse)').matches;
      komunikat.textContent = dotyk
        ? 'Przytrzymaj palec w polu powyżej i wybierz „Wklej”.'
        : 'Kliknij w pole powyżej i naciśnij Ctrl+V (na Macu ⌘+V).';
    }
  });

  document.querySelectorAll('[data-przyklad]').forEach(b => b.addEventListener('click', () => {
    pole.value = b.dataset.przyklad;
    odswiezPrzycisk();
    start(b);
  }));

  /* ---------- sprawdzanie ---------- */
  function pokaz(ekran) {
    for (const e of [ekranStart, ekranSpr]) e.hidden = e !== ekran;
  }

  async function start(zrodlo) {
    if (trwa) return;
    const tekst = pole.value.trim();
    if (!tekst) return;
    const linki = BZ.znajdzLinki(tekst);
    if (!linki.length) {
      komunikat.textContent = 'Nie widzę tu linku. Link zaczyna się zwykle od „https://” albo „www.”, np. www.przyklad.pl';
      pole.focus();
      return;
    }
    trwa = true;
    ostatniTekst = tekst;
    komunikat.textContent = '';
    if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) {}

    // środek animacji wyniku – tam, gdzie był przycisk
    const r = (zrodlo && zrodlo.getBoundingClientRect) ? zrodlo.getBoundingClientRect() : akcja.getBoundingClientRect();
    ekranWynik.style.setProperty('--x', `${Math.round(r.left + r.width / 2)}px`);
    ekranWynik.style.setProperty('--y', `${Math.round(Math.min(r.top + r.height / 2, innerHeight * .8))}px`);

    // ekran „Sprawdzam…”
    const kroki = [...document.querySelectorAll('#kroki li')];
    kroki.forEach(li => li.className = '');
    const pierwszy = BZ.rozbierz(linki[0]);
    $('spr-adres').textContent = linki.length > 1 ? `${linki.length} linki z wiadomości` : (pierwszy.ok ? (pierwszy.czytelny || '') : linki[0]);
    pokaz(ekranSpr);

    // stan kroków zbiorczo dla wszystkich linków (najgorszy wygrywa)
    const waga = { '': 0, ok: 1, pominiete: 2, uwaga: 3, zle: 4 };
    const krok = (klucz, stan) => {
      const li = kroki.find(l => l.dataset.krok === klucz);
      if (li && waga[stan] > waga[li.className || '']) li.className = stan;
    };

    const poczatek = performance.now();
    let wyniki = [];
    try {
      wyniki = (await Promise.all(linki.map(l => BZ.sprawdzLink(l, krok)))).filter(Boolean);
    } catch (e) {
      console.error(e);
    }
    // krótka pauza, żeby było widać, co sprawdziliśmy (wynik i tak przychodzi w 1–3 s)
    const minimum = 1300 - (performance.now() - poczatek);
    if (minimum > 0) await new Promise(r => setTimeout(r, minimum));

    trwa = false;
    if (!wyniki.length) {
      pokaz(ekranStart);
      komunikat.textContent = 'Ten adres wygląda na niepełny. Skopiuj link jeszcze raz w całości.';
      return;
    }
    pokazWynik(wyniki);
  }

  /* ---------- wynik ---------- */
  const KOLEJNOSC = { oszustwo: 3, podejrzany: 2, nieznany: 1, bezpieczny: 0 };

  function li(tekst) { const e = document.createElement('li'); e.textContent = tekst; return e; }

  function pokazWynik(wyniki) {
    const glowny = wyniki.slice().sort((a, b) => KOLEJNOSC[b.werdykt] - KOLEJNOSC[a.werdykt])[0];
    const zielony = glowny.werdykt === 'bezpieczny';
    const kolor = zielony ? 'zielony' : 'czerwony';

    ekranWynik.className = 'ekran ekran-wynik ' + kolor;
    $('w-ikona').innerHTML = IKONY[kolor];
    const naglowek = $('w-naglowek'), podtytul = $('w-podtytul'), domena = $('w-domena'), powody = $('w-powody'), porady = $('w-porady');
    powody.innerHTML = ''; porady.innerHTML = '';
    $('w-ponow').hidden = true;
    $('w-znowu').classList.remove('drugi');

    const ileLinkow = wyniki.length;
    domena.textContent = glowny.domena;

    if (glowny.werdykt === 'bezpieczny') {
      naglowek.textContent = 'Bezpieczny';
      podtytul.textContent = glowny.marka
        ? `To prawdziwa strona: ${glowny.marka.nazwa}.`
        : glowny.info.zaufana ? 'To znana, sprawdzona strona.' : (ileLinkow > 1 ? `Wszystkie ${ileLinkow} linki są w porządku.` : 'Ten link jest w porządku.');
      const sprawdzone = [];
      const z = glowny.zrodla;
      if (z.cf.stan === 'ok' || z.cf.stan === 'brak') sprawdzone.push('Cloudflare');
      if (z.op && z.op.lista) sprawdzone.push('OpenPhish');
      if (z.pd && z.pd.lista) sprawdzone.push('Phishing.Database');
      if (sprawdzone.length) powody.appendChild(li(`Nie ma go w żadnej bazie oszustów (${sprawdzone.join(', ')}).`));
      if (z.rd.stan === 'ok' && z.rd.dni >= 365) powody.appendChild(li(`Strona działa od ${Math.floor(z.rd.dni / 365)} ${odmienLata(Math.floor(z.rd.dni / 365))}.`));
      powody.appendChild(li('Nie ma w nim sztuczek oszustów: podróbek znanych marek, literówek ani ukrytych adresów.'));
      const rada = document.createElement('p');
      rada.className = 'w-rada';
      rada.textContent = 'Dobra rada na zawsze: prawdziwy bank, kurier ani urząd nie prosi w SMS-ie o kod BLIK, PIN ani hasło.';
      porady.appendChild(rada);
      porady.style.textAlign = 'center';
      dzwiek(true);
    } else {
      porady.style.textAlign = '';
      if (glowny.werdykt === 'oszustwo') {
        naglowek.textContent = 'Oszustwo!';
        podtytul.textContent = 'Nie klikaj w ten link.';
      } else if (glowny.werdykt === 'podejrzany') {
        naglowek.textContent = 'Nie klikaj!';
        podtytul.textContent = 'Ten link ma kilka cech oszustwa naraz.';
      } else {
        naglowek.textContent = 'Nie klikaj';
        podtytul.textContent = 'Nie udało się sprawdzić tego linku.';
      }
      if (ileLinkow > 1) podtytul.textContent += ` (sprawdziliśmy ${ileLinkow} linki z wiadomości)`;

      const lista = glowny.werdykt === 'oszustwo'
        ? glowny.twarde.concat(glowny.miekkie.filter(m => m.punkty >= 1).map(m => m.tekst)).slice(0, 4)
        : glowny.werdykt === 'podejrzany'
          ? glowny.miekkie.slice().sort((a, b) => b.punkty - a.punkty).map(m => m.tekst).slice(0, 4)
          : ['Nie udało się połączyć z bazami oszustów. Sprawdź internet i spróbuj ponownie. Do tego czasu nie otwieraj linku.'];
      lista.forEach(t => powody.appendChild(li(t)));

      if (glowny.werdykt === 'nieznany') {
        $('w-ponow').hidden = false;
        $('w-znowu').classList.add('drugi');
      } else {
        porady.innerHTML = `
          <h3>Co teraz zrobić?</h3>
          <ol>
            <li><b>Nie otwieraj linku</b> i nie podawaj nikomu żadnych danych ani kodów.</li>
            <li><b>Zgłoś i usuń wiadomość.</b> SMS prześlij bezpłatnie na numer <b>8080</b> – trafi do CERT Polska, który blokuje strony oszustów. E-mail zgłoś na stronie <b>incydent.cert.pl</b>.</li>
            <li>Jeśli dane karty, hasło albo kod BLIK zostały już tam wpisane – <b>od razu zadzwoń do swojego banku</b> (numer jest na odwrocie karty).</li>
          </ol>`;
      }
      dzwiek(false);
      if (navigator.vibrate) try { navigator.vibrate([220, 90, 220, 90, 220]); } catch (e) {}
    }

    // tabela „co sprawdziliśmy”
    const lista = $('w-lista');
    lista.innerHTML = '';
    const znak = { ok: '✓', zle: '✗', uwaga: '!', pominiete: '–' };
    for (const w of wyniki) {
      if (wyniki.length > 1) {
        const n = document.createElement('li');
        n.innerHTML = '<span class="z"></span><span class="n"></span>';
        n.querySelector('.n').textContent = w.domena;
        n.querySelector('.n').style.fontWeight = '900';
        lista.appendChild(n);
      }
      for (const s of w.szczegoly) {
        const e = document.createElement('li');
        e.innerHTML = '<span class="z"></span><span class="n"></span><span class="o"></span>';
        e.querySelector('.z').textContent = znak[s.stan] || '–';
        e.querySelector('.n').textContent = s.nazwa;
        e.querySelector('.o').textContent = s.opis;
        lista.appendChild(e);
      }
    }
    $('w-szczegoly').open = false;

    // pełny ekran z kolorem rozlewa się od przycisku
    ekranWynik.hidden = false;
    ekranWynik.scrollTop = 0;
    dopasujNaglowek(naglowek);
    document.querySelector('meta[name="theme-color"]').content = zielony ? '#00f25a' : '#ff1e1e';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ekranWynik.classList.add('pokaz');
      pokaz(null);
      ekranStart.hidden = false;
      ekranStart.setAttribute('aria-hidden', 'true');
      ($('w-ponow').hidden ? $('w-znowu') : $('w-ponow')).focus({ preventScroll: true });
    }));
    document.title = (zielony ? '✓ Bezpieczny' : '✗ Nie klikaj') + ' – Bezpiecznik';
  }

  /* Wielki napis ma być jak największy, ale nigdy nie łamać się w środku słowa. */
  function dopasujNaglowek(el) {
    el.style.fontSize = '';
    let rozmiar = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + 1 && rozmiar > 26) {
      rozmiar -= 3;
      el.style.fontSize = rozmiar + 'px';
    }
  }
  addEventListener('resize', () => { if (!ekranWynik.hidden) dopasujNaglowek($('w-naglowek')); });

  function odmienLata(n) {
    if (n === 1) return 'roku';
    return 'lat';
  }

  function wroc(zostawTekst) {
    ekranWynik.classList.remove('pokaz');
    ekranStart.removeAttribute('aria-hidden');
    document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.body).backgroundColor === 'rgb(0, 0, 0)' ? '#000000' : '#ffffff';
    document.title = 'Bezpiecznik – czy ten link jest bezpieczny?';
    setTimeout(() => { ekranWynik.hidden = true; }, 560);
    if (!zostawTekst) pole.value = '';
    odswiezPrzycisk();
    pokaz(ekranStart);
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    pole.focus({ preventScroll: true });
  }
  $('w-znowu').addEventListener('click', () => wroc(false));
  $('w-ponow').addEventListener('click', () => {
    ekranWynik.classList.remove('pokaz');
    ekranWynik.hidden = true;
    pole.value = ostatniTekst;
    start();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !ekranWynik.hidden) wroc(false);
  });

  /* ---------- dźwięk: dwa wznoszące tony albo niski alarm ---------- */
  let ac = null;
  function dzwiek(dobry) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      const t0 = ac.currentTime + 0.05;
      const tony = dobry ? [[660, 0, .16], [990, .14, .32]] : [[220, 0, .22], [220, .3, .52], [220, .6, .82]];
      for (const [f, a, b] of tony) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = dobry ? 'sine' : 'square';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + a);
        g.gain.exponentialRampToValueAtTime(dobry ? 0.18 : 0.07, t0 + a + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + b);
        o.connect(g).connect(ac.destination);
        o.start(t0 + a); o.stop(t0 + b + 0.05);
      }
    } catch (e) { /* bez dźwięku */ }
  }

  /* ---------- link w adresie strony: index.html#link=https://… ---------- */
  odswiezPrzycisk();
  const m = location.hash.match(/^#link=(.+)$/);
  if (m) {
    try { pole.value = decodeURIComponent(m[1]); } catch (e) { pole.value = m[1]; }
    odswiezPrzycisk();
    start();
  } else if (matchMedia('(pointer: fine)').matches) {
    pole.focus({ preventScroll: true });
  }

})(window.BZ);
