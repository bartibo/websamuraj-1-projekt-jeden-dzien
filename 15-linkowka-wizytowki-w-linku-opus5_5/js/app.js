/* Linkówka – kreator, podgląd, udostępnianie i tryb wizytówki. */
'use strict';

(() => {
  // Gdy aplikację otwarto z pliku (file://), link dla innych musi prowadzić do wersji online.
  const ONLINE = 'https://projekty.vibemaster.pl/15-linkowka-wizytowki-w-linku-opus5_5/';
  const Z_PLIKU = location.protocol === 'file:';
  const KLUCZ_SZKICU = 'linkowka-szkic-v1';
  const KLUCZ_URZ = 'linkowka-urzadzenie';
  const QR_MAX = 2800; // powyżej tylu znaków kod QR przestaje się mieścić

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const tutaj = () => location.href.split('#')[0];
  const bazaUdostepniania = () => (Z_PLIKU ? ONLINE : tutaj());
  const formatLiczby = (n) => n.toLocaleString('pl-PL');
  const odmiana = (n, a, b, c) => (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
  const kopia = (o) => JSON.parse(JSON.stringify(o));
  const zapisz = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const odczytaj = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  /* ================= toast (z opcjonalnym przyciskiem „Cofnij”) ================= */
  let toastTimer;
  function pokazToast(tekst, akcja) {
    const t = $('#toast');
    t.replaceChildren(document.createTextNode(tekst));
    if (akcja) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toast-b';
      b.textContent = akcja.etykieta;
      b.addEventListener('click', () => { t.classList.remove('wl'); akcja.zrob(); });
      t.append(b);
    }
    t.classList.toggle('z-akcja', !!akcja);
    t.classList.add('wl');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('wl'), akcja ? 7000 : 2600);
  }
  window.pokazToast = pokazToast;

  /* ================= kod QR (biblioteka ładuje się dopiero przy pierwszym użyciu) ================= */
  let qrLib;
  function zaladujQR() {
    if (typeof qrcode === 'function') return Promise.resolve();
    if (!qrLib) {
      qrLib = new Promise((ok, zle) => {
        const s = document.createElement('script');
        s.src = 'lib/qrcode.js';
        s.onload = ok;
        s.onerror = () => { qrLib = null; zle(new Error('Nie udało się wczytać generatora QR')); };
        document.head.append(s);
      });
    }
    return qrLib;
  }
  /** Rysuje kod na canvasie. Poziom korekcji L: przy ~1000 znakach daje ~100 zamiast ~113 modułów. */
  function rysujQR(canvas, url, pikseli = 1100) {
    const qr = qrcode(0, 'L');
    qr.addData(url);
    qr.make();
    const n = qr.getModuleCount();
    const margines = 4;
    const skala = Math.max(4, Math.floor(pikseli / (n + margines * 2)));
    const bok = (n + margines * 2) * skala;
    canvas.width = canvas.height = bok;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, bok, bok);
    ctx.fillStyle = '#111111';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + margines) * skala, (r + margines) * skala, skala, skala);
    return n;
  }

  let qrNazwa = 'wizytowka';
  async function pokazQR(url, nazwa) {
    const okno = $('#qr-okno');
    const canvas = $('#qr-canvas');
    const info = $('#qr-info');
    qrNazwa = nazwa || 'wizytowka';
    try {
      await zaladujQR();
      const n = rysujQR(canvas, url);
      canvas.hidden = false;
      $('#qr-pobierz').disabled = false;
      info.textContent = `Kod ${n}×${n} modułów · ${formatLiczby(url.length)} ${odmiana(url.length, 'znak', 'znaki', 'znaków')} adresu.` +
        ` Na wydruku daj mu co najmniej ${Math.max(3, Math.ceil(n * 0.05))} cm` + (n > 117 ? ' albo skróć bio, żeby kod był rzadszy.' : '.');
    } catch (e) {
      canvas.hidden = true;
      $('#qr-pobierz').disabled = true;
      info.textContent = typeof qrcode === 'function'
        ? 'Ta wizytówka jest za długa na kod QR. Skróć bio albo opisy projektów.'
        : 'Nie udało się wczytać generatora kodu QR. Sprawdź połączenie i spróbuj jeszcze raz.';
    }
    if (typeof okno.showModal === 'function') okno.showModal(); else okno.setAttribute('open', '');
  }
  $('#qr-pobierz').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = $('#qr-canvas').toDataURL('image/png');
    a.download = 'kod-qr-' + qrNazwa.toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '') + '.png';
    a.click();
  });
  $$('dialog.okno').forEach((o) => o.addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }));

  async function udostepnij(url, tytul) {
    if (navigator.share) {
      try { await navigator.share({ title: tytul, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const ok = await Karta.kopiujTekst(url);
    pokazToast(ok ? 'Link skopiowany do schowka' : 'Nie udało się skopiować linku');
  }

  /* ================= tryb wizytówki ================= */
  const IK_QR = '<svg class="ik" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z"/><path d="M14 14h3v3h-3zM21 14v.01M14 21h.01M17 21h4v-4"/></svg>';
  const IK_SHARE = '<svg class="ik" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>';
  let zdejmijFab = null;

  async function pokazWizytowke(ladunek) {
    const widok = $('#karta-widok');
    let d;
    try {
      d = await Kod.odkoduj(ladunek);
      if (!d.imie.trim()) throw new Error('Brak imienia');
    } catch (e) {
      if (window.wczytajFonty) window.wczytajFonty('edytor');
      widok.replaceChildren(stronaBledu());
      document.title = 'Uszkodzony link – Linkówka';
      return;
    }
    const m = Karta.MOTYWY[d.motyw] || Karta.MOTYWY[0];
    if (window.wczytajFonty) window.wczytajFonty(m.id); // tylko kroje tego motywu
    document.documentElement.dataset.motyw = m.id;

    const czysty = ladunek.replace(/[^A-Za-z0-9_-]/g, '');
    const link = (Z_PLIKU ? ONLINE : tutaj()) + '#w' + czysty;
    const karta = Karta.narysuj(d, { anim: true, link, linkTworzenia: tutaj(), linkEdycji: tutaj() + '#e' + czysty });

    const fab = document.createElement('div');
    fab.className = 'fab';
    fab.innerHTML =
      `<button type="button" class="fab-b" data-a="qr" aria-label="Pokaż kod QR">${IK_QR}<span>Kod QR</span></button>` +
      `<button type="button" class="fab-b" data-a="share" aria-label="Udostępnij wizytówkę">${IK_SHARE}<span>Udostępnij</span></button>`;
    fab.querySelector('[data-a=qr]').addEventListener('click', () => pokazQR(link, d.imie));
    fab.querySelector('[data-a=share]').addEventListener('click', () => udostepnij(link, d.imie + (d.rola ? ' – ' + d.rola : '')));

    widok.replaceChildren(karta, fab);
    document.title = d.imie.trim() + (d.rola.trim() ? ' – ' + d.rola.trim() : '');
    $('meta[name=theme-color]').setAttribute('content', m.bg);
    const opis = $('meta[name=description]');
    if (opis) opis.setAttribute('content', (d.bio || d.rola || '').slice(0, 160));
    window.scrollTo(0, 0);

    // Przyciski chowają się przy czytaniu (przewijanie w dół) i wracają przy przewijaniu w górę i na końcu strony
    if (zdejmijFab) zdejmijFab();
    let ostatnieY = window.scrollY, czeka = false;
    const przy = () => {
      czeka = false;
      const y = window.scrollY;
      const koniec = y + innerHeight >= document.documentElement.scrollHeight - 40;
      if (Math.abs(y - ostatnieY) > 6 || koniec) {
        fab.classList.toggle('schowany', y > ostatnieY && y > 120 && !koniec);
        ostatnieY = y;
      }
    };
    const naScroll = () => { if (!czeka) { czeka = true; requestAnimationFrame(przy); } };
    window.addEventListener('scroll', naScroll, { passive: true });
    zdejmijFab = () => window.removeEventListener('scroll', naScroll);
  }

  function stronaBledu() {
    const s = document.createElement('div');
    s.className = 'blad';
    s.innerHTML =
      '<div class="blad-in"><div class="blad-ik">✂️</div><h1>Ten link jest niepełny</h1>' +
      '<p>Wizytówka mieści się w całości w adresie, więc wystarczy, że przy kopiowaniu urwie się kilka znaków, i nie da się jej odczytać. Poproś o link jeszcze raz, najlepiej skopiowany przyciskiem „Kopiuj link”.</p>' +
      '<a class="btn btn-glowny" href="./">Zrób własną wizytówkę</a></div>';
    s.querySelector('a').href = tutaj();
    return s;
  }

  /* ================= kreator ================= */
  let edytorGotowy = false;
  let urzadzenie = odczytaj(KLUCZ_URZ) === 'pc' ? 'pc' : 'tel';
  let aktualnyLink = '';
  let licznikKodowania = 0;
  let licznikPrzykladu = 0;
  let aktualnyStan = Kod.pusty();

  function zbudujFormularz() {
    // Projekty
    const kontener = $('#projekty');
    for (let i = 0; i < Kod.MAX_PROJ; i++) {
      const box = document.createElement('fieldset');
      box.className = 'projekt';
      box.innerHTML = `
        <legend><span class="projekt-nr">0${i + 1}</span>Projekt ${['pierwszy', 'drugi', 'trzeci'][i]}</legend>
        <div class="rzad">
          <label class="pole"><span class="etykieta">Nazwa</span><input data-p="${i}" data-pk="tytul" maxlength="60" placeholder="${['Sklep dla marki odzieżowej', 'Aplikacja do rezerwacji', 'Kampania na premierę'][i]}"></label>
          <label class="pole"><span class="etykieta">Link</span><input data-p="${i}" data-pk="url" maxlength="300" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="behance.net/gallery/…"><small class="blad-pola" data-blad-p="${i}"></small></label>
        </div>
        <label class="pole"><span class="etykieta">Co zrobiłaś/zrobiłeś i z jakim efektem <span class="licznik" data-licznik-p="${i}"></span></span><input data-p="${i}" data-pk="opis" maxlength="140" placeholder="Nowy sklep i identyfikacja. Sprzedaż +30% w pierwszy kwartał."></label>
        <label class="pole pole-krotkie"><span class="etykieta">Etykieta</span><input data-p="${i}" data-pk="tag" maxlength="40" placeholder="Branding · 2025"></label>`;
      kontener.append(box);
    }
    // Oferta
    const oferta = $('#pakiety');
    const podpOf = [['Audyt UX strony', 'od 2 500 zł', '5 dni roboczych'], ['Projekt sklepu', 'od 9 000 zł', '4–6 tygodni'], ['Opieka miesięczna', '1 800 zł / mies.', 'stała współpraca']];
    for (let i = 0; i < Kod.MAX_PAK; i++) {
      const w = document.createElement('div');
      w.className = 'pakiet';
      w.innerHTML = `<span class="projekt-nr" aria-hidden="true">0${i + 1}</span>
        <input data-o="${i}" data-ok="nazwa" maxlength="50" placeholder="${podpOf[i][0]}" aria-label="Usługa ${i + 1}: nazwa">
        <input data-o="${i}" data-ok="cena" maxlength="30" placeholder="${podpOf[i][1]}" aria-label="Usługa ${i + 1}: cena">
        <input data-o="${i}" data-ok="czas" maxlength="30" placeholder="${podpOf[i][2]}" aria-label="Usługa ${i + 1}: czas lub zakres">`;
      oferta.append(w);
    }
    // Linki
    const linki = $('#linki');
    const podp = ['linkedin.com/in/…', 'github.com/…', 'behance.net/…', 'twojastrona.pl'];
    for (let i = 0; i < Kod.MAX_LINKI; i++) {
      const w = document.createElement('label');
      w.className = 'link-pole';
      w.innerHTML = `<input data-l="${i}" maxlength="300" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="${podp[i]}" aria-label="Profil lub strona ${i + 1}"><span class="link-plat" data-plat="${i}"></span>`;
      linki.append(w);
    }
    // Szybkie emoji
    const emo = $('#emoji-szybkie');
    const ini = document.createElement('button');
    ini.type = 'button';
    ini.className = 'emo emo-ini';
    ini.textContent = 'Aa';
    ini.title = 'Inicjały';
    ini.dataset.emoji = '';
    emo.append(ini);
    ['🧑‍💻', '👩‍🎨', '🎨', '📸', '✍️', '🎬', '🎧', '🧠', '🚀', '🦊', '🌿', '⚡'].forEach((e) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'emo';
      b.textContent = e;
      b.dataset.emoji = e;
      b.setAttribute('aria-label', 'Awatar ' + e);
      emo.append(b);
    });
    emo.addEventListener('click', (e) => {
      const b = e.target.closest('[data-emoji]');
      if (!b) return;
      $('[data-k=awatar]').value = b.dataset.emoji;
      zmiana();
    });
    // Motywy
    const motywy = $('#motywy');
    Karta.MOTYWY.forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'motyw';
      b.dataset.motyw = i;
      b.setAttribute('role', 'radio');
      b.innerHTML = `<span class="motyw-pr" data-pr="${m.id}"><b>Aa</b><i></i><i></i></span><span class="motyw-n"></span><span class="motyw-o"></span>`;
      const pr = b.querySelector('.motyw-pr');
      pr.style.background = m.bg;
      pr.style.color = m.ink;
      pr.querySelector('b').style.fontFamily = m.font;
      pr.style.setProperty('--a', m.akcent);
      b.querySelector('.motyw-n').textContent = m.nazwa;
      b.querySelector('.motyw-o').textContent = m.opis;
      motywy.append(b);
    });
    motywy.addEventListener('click', (e) => {
      const b = e.target.closest('[data-motyw]');
      if (!b) return;
      ustawMotyw(+b.dataset.motyw);
      zmiana();
    });
    // Akcenty
    const ak = $('#akcenty');
    ['', '#c2410c', '#e11d48', '#ff5c8a', '#db2777', '#7c3aed', '#2563eb', '#0891b2', '#059669', '#a3e635', '#ca8a04', '#111111'].forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'akc' + (c ? '' : ' akc-auto');
      b.dataset.akcent = c;
      b.setAttribute('role', 'radio');
      b.title = c ? c : 'Kolor motywu';
      b.setAttribute('aria-label', c ? 'Akcent ' + c : 'Kolor domyślny motywu');
      if (c) b.style.background = c; else b.textContent = 'auto';
      ak.append(b);
    });
    const wlasny = document.createElement('label');
    wlasny.className = 'akc akc-wlasny';
    wlasny.title = 'Własny kolor';
    wlasny.innerHTML = '<input type="color" value="#ff5a36" aria-label="Własny kolor akcentu">';
    ak.append(wlasny);
    ak.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-akcent]');
      if (!b) return;
      ustawAkcent(b.dataset.akcent);
      zmiana();
    });
    wlasny.querySelector('input').addEventListener('input', (e) => { ustawAkcent(e.target.value); zmiana(); });

    // Strzałki w grupach motywów i kolorów (jedna grupa = jeden przystanek klawisza Tab)
    [[motywy, '[data-motyw]'], [ak, 'button[data-akcent]']].forEach(([grupa, sel]) => {
      grupa.addEventListener('keydown', (e) => {
        const kier = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!kier) return;
        const lista = $$(sel, grupa);
        const i = lista.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        const cel = lista[(i + kier + lista.length) % lista.length];
        cel.focus();
        cel.click();
      });
    });
  }

  function ustawMotyw(i) {
    aktualnyStan.motyw = i;
    $$('#motywy [data-motyw]').forEach((b) => {
      const on = +b.dataset.motyw === i;
      b.classList.toggle('wl', on);
      b.setAttribute('aria-checked', on);
      b.tabIndex = on ? 0 : -1;
    });
  }
  function ustawAkcent(c) {
    aktualnyStan.akcent = c || '';
    let znaleziony = false;
    $$('#akcenty button[data-akcent]').forEach((b) => {
      const on = b.dataset.akcent.toLowerCase() === (c || '').toLowerCase();
      if (on) znaleziony = true;
      b.classList.toggle('wl', on);
      b.setAttribute('aria-checked', on);
      b.tabIndex = on ? 0 : -1;
    });
    const w = $('#akcenty .akc-wlasny');
    w.classList.toggle('wl', !znaleziony && !!c);
    if (!znaleziony && c) { w.style.background = c; w.querySelector('input').value = c; } else w.style.background = '';
    if (!znaleziony && c) { const pierwszy = $('#akcenty button[data-akcent]'); if (pierwszy) pierwszy.tabIndex = 0; }
    // Miniatury motywów pokazują wybrany kolor, a nie domyślny
    $$('#motywy .motyw-pr').forEach((pr, i) => pr.style.setProperty('--a', c || Karta.MOTYWY[i].akcent));
  }

  function pokazWolneOd() {
    const s = +(($('input[name=status]:checked') || {}).value || 0);
    $('#pole-wolne').hidden = !(s === 2 || s === 3);
    $('#wolne-etykieta').textContent = s === 3 ? 'Grafik pełny do' : 'Wolne terminy od';
  }

  function zFormularza() {
    const d = Kod.pusty();
    $$('[data-k]').forEach((i) => { d[i.dataset.k] = i.value; });
    $$('[data-p]').forEach((i) => { d.projekty[+i.dataset.p][i.dataset.pk] = i.value; });
    $$('[data-o]').forEach((i) => { d.pakiety[+i.dataset.o][i.dataset.ok] = i.value; });
    $$('[data-l]').forEach((i) => { d.linki[+i.dataset.l] = i.value; });
    d.opinia = { cytat: $('[data-op=cytat]').value, autor: $('[data-op=autor]').value };
    d.status = +(($('input[name=status]:checked') || {}).value || 0);
    d.wolneOd = Kod.zIso($('#wolne-od').value);
    d.motyw = aktualnyStan.motyw;
    d.akcent = aktualnyStan.akcent;
    return d;
  }

  function doFormularza(d) {
    $$('[data-k]').forEach((i) => { i.value = d[i.dataset.k] || ''; });
    $$('[data-p]').forEach((i) => { i.value = (d.projekty[+i.dataset.p] || {})[i.dataset.pk] || ''; });
    $$('[data-o]').forEach((i) => { i.value = ((d.pakiety || [])[+i.dataset.o] || {})[i.dataset.ok] || ''; });
    $$('[data-l]').forEach((i) => { i.value = d.linki[+i.dataset.l] || ''; });
    $('[data-op=cytat]').value = (d.opinia && d.opinia.cytat) || '';
    $('[data-op=autor]').value = (d.opinia && d.opinia.autor) || '';
    const r = $(`input[name=status][value="${d.status | 0}"]`);
    if (r) r.checked = true;
    $('#wolne-od').value = Kod.doIso(d.wolneOd | 0);
    pokazWolneOd();
    ustawMotyw(d.motyw | 0);
    ustawAkcent(d.akcent || '');
  }

  const teksty = (d) => [d.imie, d.rola, d.miasto, d.bio, d.stawka, d.awatar, d.email, d.tel, ...d.linki,
    ...d.projekty.flatMap((p) => [p.tytul, p.url, p.opis, p.tag]),
    ...(d.pakiety || []).flatMap((p) => [p.nazwa, p.cena, p.czas]),
    (d.opinia || {}).cytat || '', (d.opinia || {}).autor || ''];
  const czyPusty = (d) => !teksty(d).some((x) => x.trim());
  const takieSame = (a, b) => JSON.stringify(teksty(a)) === JSON.stringify(teksty(b)) && a.motyw === b.motyw && a.akcent === b.akcent && a.status === b.status;

  /** Komunikat pod polem: dlaczego to, co wpisano, nie trafi na wizytówkę. */
  function bladPola(sel, tekst) {
    const b = $(sel);
    if (!b) return;
    b.textContent = tekst || '';
    b.hidden = !tekst;
  }
  function powodUrl(v) {
    const s = v.trim();
    if (!s) return '';
    if (/^@/.test(s)) return 'To nazwa użytkownika, a potrzebny jest cały adres profilu, np. instagram.com/' + s.slice(1);
    if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https?:/i.test(s)) return 'Tylko adresy stron (https://…). Ten nie będzie klikalny';
    if (!Karta.bezpiecznyUrl(s)) return 'Brakuje domeny, np. behance.net/gallery/123. Bez niej to nie będzie link';
    return '';
  }

  function liczniki(d) {
    const bio = $('[data-k=bio]');
    $('[data-licznik=bio]').textContent = `${bio.value.length}/${bio.maxLength}`;
    for (let i = 0; i < Kod.MAX_PROJ; i++) {
      const op = $(`[data-p="${i}"][data-pk=opis]`);
      $(`[data-licznik-p="${i}"]`).textContent = op.value.length ? `${op.value.length}/${op.maxLength}` : '';
    }
    const zleLinki = [];
    $$('[data-l]').forEach((i) => {
      const p = Karta.platforma(i.value);
      const zn = $(`[data-plat="${i.dataset.l}"]`);
      const zly = !!i.value.trim() && !p;
      zn.textContent = i.value.trim() ? (p ? p.nazwa : 'zły adres') : '';
      zn.classList.toggle('zly', zly);
      i.classList.toggle('zly', zly);
      if (zly) zleLinki.push(`Profil ${+i.dataset.l + 1}: ${powodUrl(i.value)}`);
    });
    bladPola('[data-blad=linki]', zleLinki.join('. '));
    $$('[data-p][data-pk=url]').forEach((i) => {
      const powod = powodUrl(i.value);
      i.classList.toggle('zly', !!powod);
      bladPola(`[data-blad-p="${i.dataset.p}"]`, powod);
    });
    const em = $('[data-k=email]');
    const emZly = !!em.value.trim() && !Karta.emailOk(em.value.trim());
    em.classList.toggle('zly', emZly);
    bladPola('[data-blad=email]', emZly ? 'Ten adres nie pojawi się na wizytówce. Sprawdź, czy ma @ i domenę, np. jan@firma.pl' : '');
    const tel = $('[data-k=tel]');
    const telZly = !!tel.value.trim() && !Karta.telHref(tel.value);
    tel.classList.toggle('zly', telZly);
    bladPola('[data-blad=tel]', telZly ? 'Za mało cyfr – ten numer nie pojawi się na wizytówce' : '');
    const av = $('[data-k=awatar]').value.trim();
    const avZly = av && !/^https?:\/\//i.test(av) && !/^\p{L}{1,3}$/u.test(av) && !/^[\p{Extended_Pictographic}\p{Regional_Indicator}‍️\p{Emoji_Modifier}\s]+$/u.test(av);
    bladPola('[data-blad=awatar]', avZly ? 'Wpisz emoji, do 3 liter albo adres zdjęcia zaczynający się od https://. Na razie będą inicjały' : '');

    // Brak jakiegokolwiek kontaktu = klient nie ma jak się odezwać
    const brakKontaktu = d.imie.trim() && !Karta.emailOk(d.email.trim()) && !Karta.telHref(d.tel || '') && !d.linki.some((u) => Karta.platforma(u));
    const nota = $('#ud-ostrzezenie');
    nota.hidden = !brakKontaktu;
  }

  let timerZmiany;
  function zmiana(e) {
    if (e && e.target && e.target.name === 'status') pokazWolneOd();
    clearTimeout(timerZmiany);
    timerZmiany = setTimeout(odswiez, 90);
  }

  async function odswiez() {
    clearTimeout(timerZmiany);
    const d = zFormularza();
    aktualnyStan = d;
    liczniki(d);
    const pusto = czyPusty(d);
    zapiszSzkic(pusto ? null : d);

    // Podgląd: pusty formularz pokazuje przykład, a niewypełnione sekcje – wyblakłe atrapy z przykładu
    const wzor = PRZYKLADY[0];
    let doPodgladu = Object.assign({}, d, { wydano: Kod.dzis() });
    const atrapy = {};
    if (pusto) {
      doPodgladu = Object.assign(kopia(wzor), { motyw: d.motyw, akcent: d.akcent, wydano: Kod.dzis() });
    } else {
      if (!d.imie.trim()) doPodgladu.imie = 'Twoje Imię';
      if (!d.bio.trim() && !d.rola.trim()) { doPodgladu.bio = wzor.bio; atrapy.bio = true; }
      if (!d.projekty.some((p) => p.tytul.trim() || p.url.trim() || p.opis.trim())) { doPodgladu.projekty = kopia(wzor.projekty); atrapy.projekty = true; }
    }
    const wst = $('#pg-wstazka');
    wst.hidden = !pusto && !atrapy.bio && !atrapy.projekty;
    wst.textContent = pusto ? 'Przykład. Zacznij wpisywać, a podgląd zmieni się na Twój' : 'Wyblakłe sekcje to przykład – znikną, gdy wpiszesz własne';
    const inner = $('#pg-inner');
    const scroll = $('#pg-scroll');
    const y = scroll.scrollTop;
    inner.replaceChildren(Karta.narysuj(doPodgladu, { linkTworzenia: '#', link: aktualnyLink, podglad: true, atrapy }));
    inner.querySelectorAll('.wz-stopka a').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
    scroll.scrollTop = y;
    dopasuj();

    // Link
    const nr = ++licznikKodowania;
    if (!d.imie.trim()) { ustawLink(null); return; }
    const wynik = await Kod.zakoduj(d);
    if (nr !== licznikKodowania) return;
    ustawLink(wynik, d);
  }

  function ustawLink(wynik, d) {
    const pole = $('#ud-link');
    const dl = $('#ud-dl');
    const przyciski = ['#b-kopiuj', '#b-kopiuj2', '#b-otworz', '#b-qr', '#b-udostepnij', '#m-kopiuj', '#b-hiper', '#b-stopka', '#b-druk'];
    if (!wynik) {
      aktualnyLink = '';
      pole.textContent = 'Wpisz imię i nazwisko – link pojawi się tutaj.';
      pole.classList.add('pusty');
      dl.textContent = '';
      dl.className = 'ud-dl';
      $('#pg-info').textContent = '';
      $('#pg-url').textContent = 'linkowka';
      przyciski.forEach((s) => { $(s).disabled = true; });
      return;
    }
    aktualnyLink = bazaUdostepniania() + '#w' + wynik.ladunek;
    pole.classList.remove('pusty');
    const baza = document.createElement('span');
    baza.className = 'ud-baza';
    baza.textContent = bazaUdostepniania().replace(/^https?:\/\//, '');
    const reszta = document.createElement('span');
    reszta.textContent = '#w' + wynik.ladunek;
    const opak = document.createElement('span');
    opak.className = 'ud-t';
    opak.append(baza, reszta);
    pole.replaceChildren(opak);

    const n = aktualnyLink.length;
    let klasa = 'ok', opis = 'zmieści się wszędzie';
    if (n > 8000) { klasa = 'zle'; opis = 'za długi, skróć opisy'; }
    else if (n > 4000) { klasa = 'uwaga'; opis = 'długi, niektóre serwisy go utną'; }
    else if (n > QR_MAX) { klasa = 'uwaga'; opis = 'za długi na kod QR, skróć bio'; }
    else if (n > 2000) { klasa = 'ok'; opis = 'OK dla maili i komunikatorów'; }
    dl.className = 'ud-dl ' + klasa;
    dl.textContent = `${formatLiczby(n)} ${odmiana(n, 'znak', 'znaki', 'znaków')} · ${opis}`;
    const zysk = Math.round((1 - wynik.spakowane / wynik.json) * 100);
    $('#pg-info').textContent = `dane ${formatLiczby(wynik.json)} B → ${wynik.ladunek[0] === '1' ? `deflate ${formatLiczby(wynik.spakowane)} B (−${zysk}%)` : 'bez kompresji'}`;
    $('#pg-url').textContent = aktualnyLink.replace(/^https?:\/\//, '');
    przyciski.forEach((s) => { $(s).disabled = false; });
    $('#b-druk').disabled = n > QR_MAX;
    aktualnyStan = d;
  }

  /* ---------- szkic w przeglądarce ---------- */
  let timerZapisu;
  function zapiszSzkic(d) {
    if (!zapisz(KLUCZ_SZKICU, d ? JSON.stringify(d) : null)) return;
    const z = $('#f-zapis');
    if (!d) { z.textContent = ''; return; }
    z.textContent = 'Zapisano w tej przeglądarce';
    z.classList.add('wl');
    clearTimeout(timerZapisu);
    timerZapisu = setTimeout(() => z.classList.remove('wl'), 1400);
  }
  function wczytajSzkic(klucz = KLUCZ_SZKICU) {
    try {
      const s = JSON.parse(odczytaj(klucz) || 'null');
      if (!s || typeof s !== 'object') return null;
      const d = Kod.pusty();
      Object.keys(d).forEach((k) => { if (typeof d[k] === typeof s[k] && typeof d[k] !== 'object') d[k] = s[k]; });
      if (Array.isArray(s.projekty)) s.projekty.slice(0, Kod.MAX_PROJ).forEach((p, i) => { if (p) Object.keys(d.projekty[i]).forEach((k) => { if (typeof p[k] === 'string') d.projekty[i][k] = p[k]; }); });
      if (Array.isArray(s.pakiety)) s.pakiety.slice(0, Kod.MAX_PAK).forEach((p, i) => { if (p) Object.keys(d.pakiety[i]).forEach((k) => { if (typeof p[k] === 'string') d.pakiety[i][k] = p[k]; }); });
      if (Array.isArray(s.linki)) s.linki.slice(0, Kod.MAX_LINKI).forEach((u, i) => { if (typeof u === 'string') d.linki[i] = u; });
      if (s.opinia && typeof s.opinia === 'object') ['cytat', 'autor'].forEach((k) => { if (typeof s.opinia[k] === 'string') d.opinia[k] = s.opinia[k]; });
      d.motyw = Math.max(0, Math.min(Karta.MOTYWY.length - 1, d.motyw | 0));
      d.status = Math.max(0, Math.min(3, d.status | 0));
      if (!/^#[0-9a-f]{6}$/i.test(d.akcent)) d.akcent = '';
      return d;
    } catch (e) { return null; }
  }
  /** Wstawia nowe dane do formularza, a poprzednie da się przywrócić przyciskiem w komunikacie. */
  function podmienZCofnieciem(nowe, tekst) {
    const poprzednie = zFormularza();
    doFormularza(nowe);
    odswiez();
    if (czyPusty(poprzednie)) { pokazToast(tekst); return; }
    pokazToast(tekst, { etykieta: 'Cofnij', zrob: () => { doFormularza(poprzednie); odswiez(); pokazToast('Przywrócono Twoje dane'); } });
  }

  /* ---------- podgląd: dopasowanie skali ---------- */
  function dopasuj() {
    const ekran = $('#pg-ekran');
    const rama = $('#pg-rama');
    const scroll = $('#pg-scroll');
    const sizer = $('#pg-sizer');
    const inner = $('#pg-inner');
    if (!ekran.clientWidth) return;
    const tel = urzadzenie === 'tel';
    ekran.dataset.urz = urzadzenie;
    const W = tel ? 390 : 1280;
    const H = 844;
    const cs = getComputedStyle(ekran);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const rs = getComputedStyle(rama);
    const ramka = parseFloat(rs.borderLeftWidth) + parseFloat(rs.borderRightWidth); // ramka telefonu / okna z obu stron
    const dostW = ekran.clientWidth - padX - ramka;
    const dostH = ekran.clientHeight - padY - (tel ? ramka : ramka + 34);
    let s = Math.min(1, dostW / W);
    if (tel) {
      s = Math.min(s, dostH / H);
      rama.style.width = W * s + ramka + 'px';
      scroll.style.height = H * s + 'px';
      inner.style.minHeight = H + 'px';
    } else {
      rama.style.width = '100%';
      scroll.style.height = Math.max(200, dostH) + 'px';
      inner.style.minHeight = Math.max(200, dostH) / s + 'px';
    }
    inner.style.width = W + 'px';
    inner.style.transform = `scale(${s})`;
    sizer.style.width = W * s + 'px';
    sizer.style.height = inner.offsetHeight * s + 'px';
  }

  function ustawUrzadzenie(u) {
    urzadzenie = u;
    zapisz(KLUCZ_URZ, u);
    $$('.seg [data-urz]').forEach((b) => { const on = b.dataset.urz === u; b.classList.toggle('wl', on); b.setAttribute('aria-selected', on); });
    $('#pg-scroll').scrollTop = 0;
    dopasuj();
  }

  /* ---------- podgląd na telefonie: pełny ekran z powrotem do edycji ---------- */
  function pelnyPodglad(wl) {
    const html = document.documentElement;
    if (wl === html.classList.contains('pg-pelny')) return;
    html.classList.toggle('pg-pelny', wl);
    const b = $('#m-podglad');
    b.lastChild.textContent = wl ? 'Wróć do edycji' : 'Podgląd';
    b.setAttribute('aria-expanded', wl);
    if (wl) {
      history.pushState({ podglad: 1 }, '');
      $('#pg-scroll').scrollTop = 0;
    } else if (history.state && history.state.podglad) {
      history.back();
    }
    requestAnimationFrame(dopasuj);
  }

  /* ---------- wysyłka: hiperłącze, stopka maila, wydruk ---------- */
  const tytulLinku = (d) => d.imie.trim() + (d.rola.trim() ? ' – ' + d.rola.trim() : '');
  async function kopiujHtml(html, tekst) {
    try {
      if (!window.ClipboardItem || !navigator.clipboard.write) throw new Error('brak');
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([tekst], { type: 'text/plain' }) })]);
      return 'html';
    } catch (e) {
      return (await Karta.kopiujTekst(tekst)) ? 'tekst' : '';
    }
  }
  function kolorStopki(d) {
    const m = Karta.MOTYWY[d.motyw] || Karta.MOTYWY[0];
    const a = /^#[0-9a-f]{6}$/i.test(d.akcent) ? d.akcent : m.akcent;
    return Karta.akcentDoTekstu(a, '#ffffff');
  }
  function htmlStopki(d, link) {
    const acc = kolorStopki(d);
    const email = Karta.emailOk(d.email.trim()) ? d.email.trim() : '';
    const th = Karta.telHref(d.tel || '');
    const kontakt = [th ? `<a href="${escHtml(th)}" style="color:#333;text-decoration:none">${escHtml(d.tel.trim())}</a>` : '',
      email ? `<a href="mailto:${escHtml(email)}" style="color:#333;text-decoration:none">${escHtml(email)}</a>` : ''].filter(Boolean).join(' &nbsp;·&nbsp; ');
    return `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.45;color:#333">` +
      `<tr><td style="border-left:3px solid ${acc};padding:2px 0 2px 12px">` +
      `<div style="font-size:16px;font-weight:bold;color:#111">${escHtml(d.imie.trim())}</div>` +
      (d.rola.trim() ? `<div style="color:#555">${escHtml(d.rola.trim())}</div>` : '') +
      (kontakt ? `<div style="margin-top:6px">${kontakt}</div>` : '') +
      `<div style="margin-top:8px"><a href="${escHtml(link)}" style="color:${acc};font-weight:bold;text-decoration:none">Zobacz moją wizytówkę →</a></div>` +
      `</td></tr></table>`;
  }
  function pokazStopke() {
    const d = aktualnyStan;
    $('#stopka-podglad').innerHTML = htmlStopki(d, aktualnyLink); // dane przechodzą przez escHtml
    $('#stopka-podglad').querySelectorAll('a').forEach((a) => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
    const okno = $('#stopka-okno');
    if (typeof okno.showModal === 'function') okno.showModal(); else okno.setAttribute('open', '');
  }

  async function drukuj() {
    const d = aktualnyStan;
    if (!aktualnyLink) return;
    try { await zaladujQR(); } catch (e) { pokazToast('Nie udało się wczytać generatora kodu QR'); return; }
    const canvas = document.createElement('canvas');
    try { rysujQR(canvas, aktualnyLink, 900); } catch (e) { pokazToast('Ta wizytówka jest za długa na kod QR. Skróć bio albo opisy projektów'); return; }
    const qr = canvas.toDataURL('image/png');
    const m = Karta.MOTYWY[d.motyw] || Karta.MOTYWY[0];
    const acc = kolorStopki(d);
    const email = Karta.emailOk(d.email.trim()) ? d.email.trim() : '';
    const tel = Karta.telHref(d.tel || '') ? d.tel.trim() : '';
    const druk = $('#druk');
    druk.replaceChildren();
    druk.style.setProperty('--acc', acc);
    druk.style.setProperty('--fh', m.font);
    const el = (tag, klasa, tekst) => { const e = document.createElement(tag); if (klasa) e.className = klasa; if (tekst) e.textContent = tekst; return e; };
    druk.append(el('p', 'druk-instr', 'Wytnij wzdłuż ciągłych linii, złóż na pół wzdłuż przerywanej i sklej. Kod QR na odwrocie otwiera wizytówkę.'));
    for (let i = 0; i < 5; i++) {
      const para = el('div', 'druk-para');
      const przod = el('div', 'druk-przod');
      przod.append(el('div', 'druk-imie', d.imie.trim()));
      if (d.rola.trim()) przod.append(el('div', 'druk-rola', d.rola.trim()));
      const k = el('div', 'druk-kontakt');
      [tel, email, d.miasto.trim()].filter(Boolean).forEach((t) => k.append(el('div', null, t)));
      przod.append(k);
      const tyl = el('div', 'druk-tyl');
      const img = el('img');
      img.src = qr;
      img.alt = '';
      tyl.append(img);
      const opis = el('div', 'druk-tyl-tx');
      opis.append(el('b', null, 'Projekty, oferta i kontakt'), el('span', null, 'Zeskanuj aparatem w telefonie'));
      tyl.append(opis);
      para.append(przod, tyl);
      druk.append(para);
    }
    await Promise.all($$('img', druk).map((i) => (i.complete ? null : new Promise((ok) => { i.onload = ok; i.onerror = ok; }))));
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    window.print();
  }

  /* ---------- start kreatora ---------- */
  function uruchomEdytor(daneZLinku) {
    if (window.wczytajFonty) window.wczytajFonty('edytor');
    delete document.documentElement.dataset.motyw;
    if (zdejmijFab) { zdejmijFab(); zdejmijFab = null; }
    if (!edytorGotowy) {
      edytorGotowy = true;
      zbudujFormularz();
      $('#formularz').addEventListener('input', zmiana);
      $('#formularz').addEventListener('change', zmiana);
      $('#formularz').addEventListener('submit', (e) => e.preventDefault());

      $('#b-przyklad').addEventListener('click', () => {
        const nr = licznikPrzykladu++ % PRZYKLADY.length;
        const p = PRZYKLADY[nr];
        podmienZCofnieciem(kopia(p), `Przykład ${nr + 1}/${PRZYKLADY.length}: motyw ${Karta.MOTYWY[p.motyw].nazwa}. Kliknij jeszcze raz po kolejny`);
      });
      $('#b-wyczysc').addEventListener('click', () => {
        if (czyPusty(zFormularza())) return;
        podmienZCofnieciem(Kod.pusty(), 'Wyczyszczono formularz');
      });

      const kopiuj = async () => {
        if (!aktualnyLink) return;
        const ok = await Karta.kopiujTekst(aktualnyLink);
        pokazToast(ok ? 'Link skopiowany. Wklej go klientowi, w stopkę maila albo w bio' : 'Nie udało się skopiować – zaznacz link ręcznie');
        if (ok) { $('#b-kopiuj').classList.add('zrobione'); setTimeout(() => $('#b-kopiuj').classList.remove('zrobione'), 1500); }
      };
      $('#b-kopiuj').addEventListener('click', kopiuj);
      $('#m-kopiuj').addEventListener('click', kopiuj);
      $('#b-kopiuj2').addEventListener('click', kopiuj);
      $('#b-otworz').addEventListener('click', () => {
        if (!aktualnyLink) return;
        window.open(tutaj() + aktualnyLink.slice(aktualnyLink.indexOf('#')), '_blank', 'noopener');
      });
      $('#b-qr').addEventListener('click', () => { if (aktualnyLink) pokazQR(aktualnyLink, aktualnyStan.imie); });
      if (navigator.share) {
        $('#b-udostepnij').hidden = false;
        $('#b-udostepnij').addEventListener('click', () => { if (aktualnyLink) udostepnij(aktualnyLink, aktualnyStan.imie + ' – wizytówka'); });
      }
      $('#b-hiper').addEventListener('click', async () => {
        if (!aktualnyLink) return;
        const tytul = tytulLinku(aktualnyStan);
        const jak = await kopiujHtml(`<a href="${escHtml(aktualnyLink)}">${escHtml(tytul)}</a>`, aktualnyLink);
        pokazToast(jak === 'html' ? `Skopiowano „${tytul}” jako link. Wklej w Gmailu, Outlooku, Slacku albo Notion` : jak ? 'Skopiowano sam adres – ta przeglądarka nie kopiuje hiperłączy' : 'Nie udało się skopiować');
      });
      $('#b-stopka').addEventListener('click', () => { if (aktualnyLink) pokazStopke(); });
      $('#stopka-kopiuj').addEventListener('click', async () => {
        const d = aktualnyStan;
        const tekst = [d.imie.trim(), d.rola.trim(), [d.tel.trim(), d.email.trim()].filter(Boolean).join(' · '), 'Wizytówka: ' + aktualnyLink].filter(Boolean).join('\n');
        const jak = await kopiujHtml(htmlStopki(d, aktualnyLink), tekst);
        pokazToast(jak === 'html' ? 'Stopka skopiowana. Wklej ją w ustawieniach podpisu programu pocztowego' : jak ? 'Skopiowano stopkę jako zwykły tekst' : 'Nie udało się skopiować');
        if (jak) $('#stopka-okno').close();
      });
      $('#b-druk').addEventListener('click', drukuj);
      $('#ud-link').addEventListener('click', () => {
        if (!aktualnyLink) return;
        const r = document.createRange();
        r.selectNodeContents($('#ud-link'));
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      });
      $('#m-podglad').addEventListener('click', () => pelnyPodglad(!document.documentElement.classList.contains('pg-pelny')));
      window.addEventListener('popstate', () => { if (document.documentElement.classList.contains('pg-pelny')) pelnyPodglad(false); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.documentElement.classList.contains('pg-pelny')) pelnyPodglad(false); });
      matchMedia('(min-width: 980px)').addEventListener('change', (e) => { if (e.matches) pelnyPodglad(false); });

      $$('.seg [data-urz]').forEach((b) => b.addEventListener('click', () => ustawUrzadzenie(b.dataset.urz)));
      // Jeden obserwator na ekran podglądu i na samą kartę (zmiana wysokości po dojściu fontów i zdjęć)
      const ro = new ResizeObserver(() => dopasuj());
      ro.observe($('#pg-ekran'));
      ro.observe($('#pg-inner'));

      if (Z_PLIKU) {
        const nota = $('#ud-nota');
        nota.hidden = false;
        nota.textContent = 'Aplikacja jest otwarta z pliku, więc link prowadzi do jej wersji online (projekty.vibemaster.pl). Przycisk „Otwórz” pokaże wizytówkę z tego komputera.';
      }
      ustawUrzadzenie(urzadzenie);
    }

    const szkic = wczytajSzkic();
    if (daneZLinku) {
      // Szkic, który różni się od danych z linku, nie przepada – można do niego wrócić
      if (szkic && !czyPusty(szkic) && !takieSame(szkic, daneZLinku)) {
        doFormularza(daneZLinku);
        odswiez();
        pokazToast('Wczytano wizytówkę z linku. Twój wcześniejszy szkic odłożyłem na bok', { etykieta: 'Przywróć szkic', zrob: () => { doFormularza(szkic); odswiez(); } });
      } else {
        doFormularza(daneZLinku);
        odswiez();
        const wiek = daneZLinku.wydano ? Kod.dzis() - daneZLinku.wydano : 0;
        pokazToast(wiek > 90
          ? `Ta wersja ma ${Math.round(wiek / 30)} mies. Sprawdź status i projekty, potem skopiuj nowy link`
          : 'Wczytano wizytówkę z linku. Zmień, co chcesz, i skopiuj nowy link');
      }
    } else {
      doFormularza(szkic || Kod.pusty());
      odswiez();
    }
  }

  /* ================= trasowanie ================= */
  async function trasa() {
    const h = location.hash;
    if (/^#w./.test(h)) {
      document.documentElement.dataset.tryb = 'karta';
      document.documentElement.classList.remove('pg-pelny');
      await pokazWizytowke(h.slice(2));
      return;
    }
    document.documentElement.dataset.tryb = 'edytor';
    document.title = 'Linkówka – wizytówka freelancera zapisana w linku';
    $('meta[name=theme-color]').setAttribute('content', '#f3f1ec');
    let dane = null;
    if (/^#e./.test(h)) {
      try { dane = await Kod.odkoduj(h.slice(2)); } catch (e) { pokazToast('Nie udało się odczytać tego linku'); }
      history.replaceState(null, '', tutaj());
    }
    uruchomEdytor(dane);
    if (dane) window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', trasa);
  trasa();
})();
