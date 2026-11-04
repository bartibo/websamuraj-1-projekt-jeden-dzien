/* Bezpiecznik – interfejs: pole, sprawdzanie, pełnoekranowy wynik. */
(function (BZ) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const ekranStart = $('start'), ekranSpr = $('sprawdzanie'), ekranWynik = $('wynik');
  const pole = $('pole'), akcja = $('akcja'), akcjaTekst = $('akcja-tekst'), komunikat = $('komunikat'), wyczysc = $('wyczysc');
  const IKONY = {
    zielony: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="9"/><path d="m28 51 15 15 30-32" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    czerwony: '<svg viewBox="0 0 100 100"><path d="M31 5h38l26 26v38L69 95H31L5 69V31z" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round"/><path d="M50 24v34" stroke="currentColor" stroke-width="11" stroke-linecap="round"/><circle cx="50" cy="75" r="6.5" fill="currentColor"/></svg>',
    // nie udało się sprawdzić: znak zapytania zamiast znaku „stop” – strona nie jest winna, tylko niesprawdzona
    nieznany: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" stroke-width="9" stroke-dasharray="14 9"/><path d="M36 38a14 14 0 1 1 20 12.6c-4 2-6 4.8-6 9.4v2" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="77" r="6.5" fill="currentColor"/></svg>'
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
      komunikat.textContent = 'Jeśli przeglądarka zapyta o dostęp do schowka, wybierz „Zezwól”.';
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
    // treść wiadomości: oszustwo „na dziecko”, prośba o BLIK czy dane karty bywa bez złego linku albo bez linku w ogóle
    const czytaj = !linki.length || BZ.jestTresc(tekst, linki);
    const schematy = czytaj ? BZ.przeczytajWiadomosc(tekst) : [];
    if (!linki.length && !schematy.length) {
      komunikat.textContent = 'Nie widzę tu linku ani znanego schematu oszustwa. Link zaczyna się zwykle od „https://” albo „www.”, np. www.przyklad.pl';
      pole.focus();
      return;
    }
    trwa = true;
    ostatniTekst = tekst;
    komunikat.textContent = '';
    $('spr-ogloszenie').textContent = 'Sprawdzam link, to potrwa kilka sekund.';
    if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) {}

    // środek animacji wyniku – tam, gdzie był przycisk
    const r = (zrodlo && zrodlo.getBoundingClientRect) ? zrodlo.getBoundingClientRect() : akcja.getBoundingClientRect();
    ekranWynik.style.setProperty('--x', `${Math.round(r.left + r.width / 2)}px`);
    ekranWynik.style.setProperty('--y', `${Math.round(Math.min(r.top + r.height / 2, innerHeight * .8))}px`);

    // ekran „Sprawdzam…”
    const kroki = [...document.querySelectorAll('#kroki li')];
    kroki.forEach(li => li.className = '');
    const pierwszy = linki.length ? BZ.rozbierz(linki[0]) : { ok: false };
    $('spr-adres').textContent = !linki.length ? 'treść wiadomości' : linki.length > 1 ? `${linki.length} linki z wiadomości` : (pierwszy.ok ? (pierwszy.czytelny || '') : linki[0]);
    kroki.forEach(li => { li.hidden = li.dataset.krok === 'tresc' ? !czytaj : !linki.length; });
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
    if (czytaj) krok('tresc', schematy.length ? 'zle' : 'ok');
    if (schematy.length) {
      wyniki.push({
        werdykt: 'oszustwo', tresc: true, info: {}, miekkie: [], punkty: 0, zrodla: {},
        domena: linki.length ? 'treść wiadomości' : 'wiadomość bez linku',
        twarde: schematy.map(s => s.tekst).concat(linki.length && wyniki.length && wyniki.every(w => w.werdykt === 'bezpieczny') ? ['Sam link prowadzi do prawdziwej strony, ale to nie zmienia tego, że wiadomość jest oszustwem.'] : []),
        szczegoly: [{ nazwa: 'Treść wiadomości (znane schematy oszustw)', stan: 'zle', opis: schematy.map(s => s.nazwa).join(', ') }]
      });
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
    $('w-ikona').innerHTML = IKONY[glowny.werdykt === 'nieznany' ? 'nieznany' : kolor];
    const naglowek = $('w-naglowek'), podtytul = $('w-podtytul'), domena = $('w-domena'), powody = $('w-powody'), porady = $('w-porady');
    const powody2 = $('w-powody2');
    powody.innerHTML = ''; porady.innerHTML = ''; powody2.innerHTML = '';
    $('w-dlaczego').hidden = true; $('w-wiecej').hidden = true; $('w-wiecej').open = false;
    $('w-ponow').hidden = true;
    $('w-znowu').classList.remove('drugi');
    $('w-zglos').hidden = true; $('w-ostrzez').hidden = true;

    const ileLinkow = wyniki.filter(w => !w.tresc).length;
    domena.textContent = glowny.domena;

    if (glowny.werdykt === 'bezpieczny') {
      naglowek.textContent = 'Bezpieczny';
      podtytul.textContent = glowny.marka
        ? `To prawdziwa strona: ${glowny.marka.nazwa}.`
        : glowny.info.zaufana ? 'To znana, sprawdzona strona.' : (ileLinkow > 1 ? `W żadnym z ${ileLinkow} linków nie znaleźliśmy oszustwa.` : 'Nie znaleźliśmy oszustwa.');
      const sprawdzone = [];
      const z = glowny.zrodla;
      if (z.cf.stan === 'ok' || z.cf.stan === 'brak') sprawdzone.push('Cloudflare');
      if (z.ce && z.ce.ok) sprawdzone.push('CERT Polska');
      if (z.op && z.op.lista) sprawdzone.push('OpenPhish');
      if (z.pd && z.pd.lista) sprawdzone.push('Phishing.Database');
      if (sprawdzone.length) powody.appendChild(li(`Nie ma go w żadnej bazie oszustów (${sprawdzone.join(', ')}).`));
      if (z.rd.stan === 'ok' && z.rd.dni >= 365) powody.appendChild(li(`Strona działa od ${Math.floor(z.rd.dni / 365)} ${odmienLata(Math.floor(z.rd.dni / 365))}.`));
      if (!glowny.punkty) powody.appendChild(li('Nie ma w nim sztuczek oszustów: podróbek znanych marek, literówek ani ukrytych adresów.'));
      else glowny.miekkie.forEach(m => powody.appendChild(li('Drobna uwaga: ' + m.tekst.charAt(0).toLowerCase() + m.tekst.slice(1))));
      const rada = document.createElement('p');
      rada.className = 'w-rada';
      rada.textContent = 'Dobra rada na zawsze: prawdziwy bank, kurier ani urząd nie prosi w SMS-ie o kod BLIK, PIN ani hasło.';
      porady.appendChild(rada);
      porady.style.textAlign = 'center';
      dzwiek(true);
    } else {
      porady.style.textAlign = '';
      if (glowny.werdykt === 'oszustwo' && glowny.tylkoSkrot) {
        naglowek.textContent = 'Nie klikaj!';
        podtytul.textContent = 'Ten link ukrywa, dokąd naprawdę prowadzi.';
      } else if (glowny.werdykt === 'oszustwo') {
        naglowek.textContent = 'Oszustwo!';
        podtytul.textContent = glowny.tresc && !glowny.info.host ? 'Nie odpisuj na tę wiadomość.' : 'Nie klikaj w ten link.';
      } else if (glowny.werdykt === 'podejrzany') {
        naglowek.textContent = 'Nie klikaj!';
        podtytul.textContent = 'Ten link ma kilka cech oszustwa naraz.';
      } else {
        naglowek.textContent = 'Nie klikaj';
        podtytul.textContent = 'Nie udało się sprawdzić tego linku.';
      }
      if (ileLinkow > 1) podtytul.textContent += ` (sprawdziliśmy ${ileLinkow} linki z wiadomości)`;

      const lista = glowny.werdykt === 'oszustwo'
        ? glowny.twarde.concat(glowny.miekkie.filter(m => m.punkty >= 1).map(m => m.tekst)).slice(0, 6)
        : glowny.werdykt === 'podejrzany'
          ? glowny.miekkie.slice().sort((a, b) => b.punkty - a.punkty).map(m => m.tekst).slice(0, 6)
          : ['Nie udało się połączyć z bazami oszustów. Sprawdź internet i spróbuj ponownie. Do tego czasu nie otwieraj linku.'];
      // najpierw „co zrobić”, potem dwa najważniejsze powody, reszta po kliknięciu
      lista.slice(0, 2).forEach(t => powody.appendChild(li(t)));
      lista.slice(2).forEach(t => powody2.appendChild(li(t)));
      $('w-wiecej').hidden = lista.length <= 2;
      $('w-dlaczego').hidden = glowny.werdykt === 'nieznany';

      if (glowny.werdykt === 'nieznany') {
        $('w-ponow').hidden = false;
        $('w-znowu').classList.add('drugi');
      } else {
        porady.innerHTML = `
          <h3>Co teraz zrobić?</h3>
          <ol>
            <li><b>${glowny.tresc && !glowny.info.host ? 'Nie odpisuj i nie wysyłaj' : 'Nie otwieraj linku'}</b> i nie podawaj nikomu żadnych danych ani kodów.</li>
            <li><b>Zgłoś i usuń wiadomość.</b> SMS prześlij bezpłatnie na numer <b>8080</b> – trafi do CERT Polska, który blokuje strony oszustów. E-mail zgłoś na stronie <b>incydent.cert.pl</b>.</li>
            <li>Jeśli dane karty, hasło albo kod BLIK zostały już tam wpisane – <b>od razu zadzwoń do swojego banku</b> (numer jest na odwrocie karty).</li>
          </ol>`;
        dodajPrzyciskiZgloszenia(glowny);
      }
      dzwiek(false);
      if (navigator.vibrate) try { navigator.vibrate([220, 90, 220, 90, 220]); } catch (e) {}
    }

    // tabela „co sprawdziliśmy”
    const lista = $('w-lista');
    lista.innerHTML = '';
    const znak = { ok: 'sprawdzone', zle: 'problem', uwaga: 'uwaga', pominiete: 'nie sprawdzono' };
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
        const z = e.querySelector('.z');
        z.classList.add(s.stan in znak ? s.stan : 'pominiete');
        z.setAttribute('aria-label', znak[s.stan] || 'nie sprawdzono');
        z.setAttribute('role', 'img');
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
    document.querySelector('meta[name="theme-color"]').content = zielony ? '#00f25a' : '#e00000';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ekranWynik.classList.add('pokaz');
      pokaz(null);
      ekranStart.hidden = false;
      ekranStart.setAttribute('aria-hidden', 'true');
      ekranStart.inert = true;
      ($('w-ponow').hidden ? $('w-znowu') : $('w-ponow')).focus({ preventScroll: true });
    }));
    document.title = (zielony ? '✓ Bezpieczny' : '✗ Nie klikaj') + ' – Bezpiecznik';
    // gest „Wstecz” na telefonie zamyka wynik, a nie całą stronę
    try { if (!(history.state && history.state.wynik)) history.pushState({ wynik: 1 }, ''); } catch (e) {}
  }

  /* Zgłoszenie do CERT (SMS na 8080 z treścią) i ostrzeżenie bliskich: tylko na telefonie */
  function dodajPrzyciskiZgloszenia(glowny) {
    const telefon = matchMedia('(pointer: coarse)').matches;
    if (!telefon) return;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const z = $('w-zglos');
    z.href = 'sms:8080' + (ios ? '&' : '?') + 'body=' + encodeURIComponent(ostatniTekst.slice(0, 600));
    z.hidden = false;
    if (navigator.share) {
      // domena zapisana tak, żeby nie dało się jej kliknąć: inpost[.]pl-doplata[.]top
      const nazwa = glowny.info && glowny.info.host ? glowny.domena.replace(/\./g, '[.]') : null;
      $('w-ostrzez').hidden = false;
      $('w-ostrzez').onclick = () => navigator.share({
        title: 'Uwaga na oszustwo',
        text: nazwa ? `Bezpiecznik: ${nazwa} to OSZUSTWO. Jeśli dostaniesz taki link w SMS-ie lub e-mailu, nie klikaj go i nie podawaj żadnych danych.`
          : 'Bezpiecznik: dostałem wiadomość, która jest oszustwem (podszywanie się pod bliskich, bank albo sklep). Jeśli dostaniesz podobną, nie odpisuj, nie wysyłaj kodów BLIK i zadzwoń na znany numer.'
      }).catch(() => {});
    }
  }

  /* Wielki napis ma być jak największy, ale nigdy nie łamać się w środku słowa. */
  function dopasujNaglowek(el) {
    el.style.fontSize = '';
    // jeden pomiar zamiast pętli (na słabym telefonie każde przeliczenie układu to kilkadziesiąt ms)
    if (el.scrollWidth > el.clientWidth + 1) {
      const rozmiar = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = Math.max(26, Math.floor(rozmiar * el.clientWidth / el.scrollWidth * 0.98)) + 'px';
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
    ekranStart.inert = false;
    if (history.state && history.state.wynik && !wroc.zHistorii) { wroc.bezHistorii = true; history.back(); }
    wroc.zHistorii = false;
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
  addEventListener('popstate', () => {
    if (wroc.bezHistorii) { wroc.bezHistorii = false; return; }
    if (!ekranWynik.hidden) { wroc.zHistorii = true; wroc(false); }
  });
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
      // po dźwięku usypiamy kontekst, żeby telefon nie trzymał otwartego strumienia dźwięku
      clearTimeout(dzwiek.t); dzwiek.t = setTimeout(() => { if (ac && ac.state === 'running') ac.suspend(); }, 1500);
    } catch (e) { /* bez dźwięku */ }
  }

  /* ---------- link w adresie strony: index.html#link=https://… albo udostępnienie z telefonu (?text=…&url=…) ---------- */
  odswiezPrzycisk();
  const m = location.hash.match(/^#link=(.+)$/);
  const q = new URLSearchParams(location.search);
  const udost = [q.get('title'), q.get('text'), q.get('url')].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' ');
  if (m) {
    try { pole.value = decodeURIComponent(m[1]); } catch (e) { pole.value = m[1]; }
    odswiezPrzycisk();
    start();
  } else if (udost.trim()) {
    pole.value = udost.trim();
    history.replaceState(null, '', location.pathname);   // udostępniony link nie zostaje w historii
    odswiezPrzycisk();
    start();
  } else if (matchMedia('(pointer: fine)').matches) {
    pole.focus({ preventScroll: true });
  }

  /* ---------- aplikacja na telefonie: działa bez sieci (sama strona), przyjmuje udostępnione wiadomości ---------- */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  let prosba = null;
  const instaluj = $('instaluj');
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); prosba = e;
    if (!matchMedia('(display-mode: standalone)').matches) instaluj.hidden = false;
  });
  instaluj.addEventListener('click', async () => {
    if (!prosba) return;
    prosba.prompt();
    try { await prosba.userChoice; } catch (e) {}
    prosba = null; instaluj.hidden = true;
  });
  addEventListener('appinstalled', () => { instaluj.hidden = true; });

})(window.BZ);
