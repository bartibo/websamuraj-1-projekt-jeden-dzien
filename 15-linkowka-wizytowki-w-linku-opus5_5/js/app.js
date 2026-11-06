/* Linkówka – kreator, podgląd, udostępnianie i tryb wizytówki. */
'use strict';

(() => {
  // Gdy aplikację otwarto z pliku (file://), link dla innych musi prowadzić do wersji online.
  const ONLINE = 'https://1prompt1zdanie.vibemaster.pl/15-linkowka-wizytowki-w-linku-opus5_5/';
  const Z_PLIKU = location.protocol === 'file:';
  const KLUCZ_SZKICU = 'linkowka-szkic-v1';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const tutaj = () => location.href.split('#')[0];
  const bazaUdostepniania = () => (Z_PLIKU ? ONLINE : tutaj());
  const formatLiczby = (n) => n.toLocaleString('pl-PL');
  const odmiana = (n, a, b, c) => (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);

  /* ================= toast ================= */
  let toastTimer;
  function pokazToast(tekst) {
    const t = $('#toast');
    t.textContent = tekst;
    t.classList.add('wl');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('wl'), 2600);
  }
  window.pokazToast = pokazToast;

  /* ================= kod QR ================= */
  let qrNazwa = 'wizytowka';
  function pokazQR(url, nazwa) {
    const okno = $('#qr-okno');
    const canvas = $('#qr-canvas');
    const info = $('#qr-info');
    qrNazwa = nazwa || 'wizytowka';
    try {
      const qr = qrcode(0, url.length < 1100 ? 'M' : 'L');
      qr.addData(url);
      qr.make();
      const n = qr.getModuleCount();
      const margines = 4;
      const skala = Math.max(4, Math.floor(1100 / (n + margines * 2)));
      const bok = (n + margines * 2) * skala;
      canvas.width = canvas.height = bok;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, bok, bok);
      ctx.fillStyle = '#111111';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect((c + margines) * skala, (r + margines) * skala, skala, skala);
      canvas.hidden = false;
      $('#qr-pobierz').disabled = false;
      info.textContent = `Kod ${n}×${n} modułów · ${formatLiczby(url.length)} ${odmiana(url.length, 'znak', 'znaki', 'znaków')} adresu.` +
        (n > 100 ? ' Kod jest gęsty – na wydruku daj mu co najmniej 5 cm.' : '');
    } catch (e) {
      canvas.hidden = true;
      $('#qr-pobierz').disabled = true;
      info.textContent = 'Ta wizytówka jest za długa na kod QR. Skróć bio albo opisy projektów.';
    }
    if (typeof okno.showModal === 'function') okno.showModal(); else okno.setAttribute('open', '');
  }
  $('#qr-pobierz').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = $('#qr-canvas').toDataURL('image/png');
    a.download = 'kod-qr-' + qrNazwa.toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '') + '.png';
    a.click();
  });
  $('#qr-okno').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

  async function udostepnij(url, tytul) {
    if (navigator.share) {
      try { await navigator.share({ title: tytul, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const ok = await Karta.kopiujTekst(url);
    pokazToast(ok ? 'Link skopiowany do schowka' : 'Nie udało się skopiować linku');
  }

  /* ================= tryb wizytówki ================= */
  async function pokazWizytowke(ladunek) {
    const widok = $('#karta-widok');
    let d;
    try {
      d = await Kod.odkoduj(ladunek);
      if (!d.imie.trim()) throw new Error('Brak imienia');
    } catch (e) {
      widok.replaceChildren(stronaBledu());
      document.title = 'Uszkodzony link – Linkówka';
      return;
    }
    const czysty = ladunek.replace(/[^A-Za-z0-9_-]/g, '');
    const link = Z_PLIKU ? ONLINE + '#w' + czysty : tutaj() + '#w' + czysty;
    const karta = Karta.narysuj(d, { anim: true, link, linkTworzenia: tutaj(), linkEdycji: tutaj() + '#e' + czysty });

    const fab = document.createElement('div');
    fab.className = 'fab';
    fab.innerHTML =
      '<button type="button" class="fab-b" data-a="qr" aria-label="Pokaż kod QR"><svg class="ik" viewBox="0 0 24 24"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3z"/><path d="M14 14h3v3h-3zM21 14v.01M14 21h.01M17 21h4v-4"/></svg><span>Kod QR</span></button>' +
      '<button type="button" class="fab-b" data-a="share"><svg class="ik" viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg><span>Udostępnij</span></button>';
    fab.querySelector('[data-a=qr]').addEventListener('click', () => pokazQR(link, d.imie));
    fab.querySelector('[data-a=share]').addEventListener('click', () => udostepnij(link, d.imie + (d.rola ? ' – ' + d.rola : '')));

    widok.replaceChildren(karta, fab);
    document.title = d.imie.trim() + (d.rola.trim() ? ' – ' + d.rola.trim() : '');
    const m = Karta.MOTYWY[d.motyw] || Karta.MOTYWY[0];
    $('meta[name=theme-color]').setAttribute('content', m.bg);
    const opis = $('meta[name=description]');
    if (opis) opis.setAttribute('content', (d.bio || d.rola || '').slice(0, 160));
    window.scrollTo(0, 0);
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
  let urzadzenie = 'tel';
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
          <label class="pole"><span class="etykieta">Link</span><input data-p="${i}" data-pk="url" maxlength="300" inputmode="url" autocapitalize="off" spellcheck="false" placeholder="behance.net/gallery/…"></label>
        </div>
        <label class="pole"><span class="etykieta">Co zrobiłaś/zrobiłeś i z jakim efektem <span class="licznik" data-licznik-p="${i}"></span></span><input data-p="${i}" data-pk="opis" maxlength="140" placeholder="Nowy sklep i identyfikacja. Sprzedaż +30% w pierwszy kwartał."></label>
        <label class="pole pole-krotkie"><span class="etykieta">Etykieta</span><input data-p="${i}" data-pk="tag" maxlength="40" placeholder="Branding · 2025"></label>`;
      kontener.append(box);
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
  }

  function ustawMotyw(i) {
    aktualnyStan.motyw = i;
    $$('#motywy [data-motyw]').forEach((b) => { const on = +b.dataset.motyw === i; b.classList.toggle('wl', on); b.setAttribute('aria-checked', on); });
  }
  function ustawAkcent(c) {
    aktualnyStan.akcent = c || '';
    let znaleziony = false;
    $$('#akcenty button[data-akcent]').forEach((b) => {
      const on = b.dataset.akcent.toLowerCase() === (c || '').toLowerCase();
      if (on) znaleziony = true;
      b.classList.toggle('wl', on);
      b.setAttribute('aria-checked', on);
    });
    const w = $('#akcenty .akc-wlasny');
    w.classList.toggle('wl', !znaleziony && !!c);
    if (!znaleziony && c) { w.style.background = c; w.querySelector('input').value = c; } else w.style.background = '';
  }

  function zFormularza() {
    const d = Kod.pusty();
    $$('[data-k]').forEach((i) => { d[i.dataset.k] = i.value; });
    $$('[data-p]').forEach((i) => { d.projekty[+i.dataset.p][i.dataset.pk] = i.value; });
    $$('[data-l]').forEach((i) => { d.linki[+i.dataset.l] = i.value; });
    d.status = +(($('input[name=status]:checked') || {}).value || 0);
    d.motyw = aktualnyStan.motyw;
    d.akcent = aktualnyStan.akcent;
    return d;
  }

  function doFormularza(d) {
    $$('[data-k]').forEach((i) => { i.value = d[i.dataset.k] || ''; });
    $$('[data-p]').forEach((i) => { i.value = (d.projekty[+i.dataset.p] || {})[i.dataset.pk] || ''; });
    $$('[data-l]').forEach((i) => { i.value = d.linki[+i.dataset.l] || ''; });
    const r = $(`input[name=status][value="${d.status | 0}"]`);
    if (r) r.checked = true;
    ustawMotyw(d.motyw | 0);
    ustawAkcent(d.akcent || '');
  }

  const czyPusty = (d) =>
    ![d.imie, d.rola, d.miasto, d.bio, d.stawka, d.awatar, d.email, d.tel, ...d.linki, ...d.projekty.flatMap((p) => [p.tytul, p.url, p.opis, p.tag])].some((x) => x.trim());

  function liczniki() {
    const bio = $('[data-k=bio]');
    $('[data-licznik=bio]').textContent = `${bio.value.length}/${bio.maxLength}`;
    for (let i = 0; i < Kod.MAX_PROJ; i++) {
      const op = $(`[data-p="${i}"][data-pk=opis]`);
      $(`[data-licznik-p="${i}"]`).textContent = op.value.length ? `${op.value.length}/${op.maxLength}` : '';
    }
    $$('[data-l]').forEach((i) => {
      const p = Karta.platforma(i.value);
      const zn = $(`[data-plat="${i.dataset.l}"]`);
      zn.textContent = i.value.trim() ? (p ? p.nazwa : 'zły adres') : '';
      zn.classList.toggle('zly', !!i.value.trim() && !p);
    });
    $$('[data-p][data-pk=url]').forEach((i) => {
      i.classList.toggle('zly', !!i.value.trim() && !Karta.bezpiecznyUrl(i.value));
    });
    const em = $('[data-k=email]');
    em.classList.toggle('zly', !!em.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim()));
  }

  let timerZmiany;
  function zmiana() {
    clearTimeout(timerZmiany);
    timerZmiany = setTimeout(odswiez, 90);
  }

  async function odswiez() {
    const d = zFormularza();
    aktualnyStan = d;
    liczniki();
    const pusto = czyPusty(d);
    zapiszSzkic(pusto ? null : d);

    // Podgląd
    let doPodgladu = d;
    if (pusto) {
      doPodgladu = Object.assign({}, PRZYKLADY[0], { motyw: d.motyw, akcent: d.akcent, projekty: PRZYKLADY[0].projekty.map((p) => Object.assign({}, p)), linki: PRZYKLADY[0].linki.slice() });
    } else if (!d.imie.trim()) {
      doPodgladu = Object.assign({}, d, { imie: 'Twoje Imię' });
    }
    $('#pg-wstazka').hidden = !pusto;
    const inner = $('#pg-inner');
    const scroll = $('#pg-scroll');
    const y = scroll.scrollTop;
    inner.replaceChildren(Karta.narysuj(doPodgladu, { linkTworzenia: '#', link: aktualnyLink }));
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
    const przyciski = ['#b-kopiuj', '#b-otworz', '#b-qr', '#b-udostepnij', '#m-kopiuj'];
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
    else if (n > 2000) { klasa = 'ok'; opis = 'OK dla maili i komunikatorów'; }
    dl.className = 'ud-dl ' + klasa;
    dl.textContent = `${formatLiczby(n)} ${odmiana(n, 'znak', 'znaki', 'znaków')} · ${opis}`;
    const zysk = Math.round((1 - wynik.spakowane / wynik.json) * 100);
    $('#pg-info').textContent = `dane ${formatLiczby(wynik.json)} B → ${wynik.ladunek[0] === '1' ? `deflate ${formatLiczby(wynik.spakowane)} B (−${zysk}%)` : 'bez kompresji'}`;
    $('#pg-url').textContent = aktualnyLink.replace(/^https?:\/\//, '');
    przyciski.forEach((s) => { $(s).disabled = false; });
    aktualnyStan = d;
  }

  /* ---------- szkic w przeglądarce ---------- */
  let timerZapisu;
  function zapiszSzkic(d) {
    try {
      if (d) localStorage.setItem(KLUCZ_SZKICU, JSON.stringify(d));
      else localStorage.removeItem(KLUCZ_SZKICU);
    } catch (e) { return; }
    const z = $('#f-zapis');
    if (!d) { z.textContent = ''; return; }
    z.textContent = 'Zapisano w tej przeglądarce';
    z.classList.add('wl');
    clearTimeout(timerZapisu);
    timerZapisu = setTimeout(() => z.classList.remove('wl'), 1400);
  }
  function wczytajSzkic() {
    try {
      const s = JSON.parse(localStorage.getItem(KLUCZ_SZKICU) || 'null');
      if (!s || typeof s !== 'object') return null;
      const d = Kod.pusty();
      Object.keys(d).forEach((k) => { if (typeof d[k] === typeof s[k] && !Array.isArray(d[k])) d[k] = s[k]; });
      if (Array.isArray(s.projekty)) s.projekty.slice(0, Kod.MAX_PROJ).forEach((p, i) => { if (p) Object.keys(d.projekty[i]).forEach((k) => { if (typeof p[k] === 'string') d.projekty[i][k] = p[k]; }); });
      if (Array.isArray(s.linki)) s.linki.slice(0, Kod.MAX_LINKI).forEach((u, i) => { if (typeof u === 'string') d.linki[i] = u; });
      d.motyw = Math.max(0, Math.min(Karta.MOTYWY.length - 1, d.motyw | 0));
      if (!/^#[0-9a-f]{6}$/i.test(d.akcent)) d.akcent = '';
      return d;
    } catch (e) { return null; }
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
    const ramka = tel ? 22 : 2; // obramowanie ramki (telefon / okno) z obu stron razem
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
    $$('.seg [data-urz]').forEach((b) => { const on = b.dataset.urz === u; b.classList.toggle('wl', on); b.setAttribute('aria-selected', on); });
    $('#pg-scroll').scrollTop = 0;
    dopasuj();
  }

  /* ---------- start kreatora ---------- */
  function uruchomEdytor(daneZLinku) {
    if (!edytorGotowy) {
      edytorGotowy = true;
      zbudujFormularz();
      $('#formularz').addEventListener('input', zmiana);
      $('#formularz').addEventListener('change', zmiana);
      $('#formularz').addEventListener('submit', (e) => e.preventDefault());

      $('#b-przyklad').addEventListener('click', () => {
        const p = PRZYKLADY[licznikPrzykladu++ % PRZYKLADY.length];
        doFormularza(JSON.parse(JSON.stringify(p)));
        odswiez();
        pokazToast(`Przykład ${((licznikPrzykladu - 1) % PRZYKLADY.length) + 1}/${PRZYKLADY.length}: motyw ${Karta.MOTYWY[p.motyw].nazwa}. Kliknij jeszcze raz po kolejny`);
      });
      $('#b-wyczysc').addEventListener('click', () => {
        if (!czyPusty(zFormularza()) && !confirm('Wyczyścić wszystkie pola?')) return;
        doFormularza(Kod.pusty());
        odswiez();
      });

      const kopiuj = async () => {
        if (!aktualnyLink) return;
        const ok = await Karta.kopiujTekst(aktualnyLink);
        pokazToast(ok ? 'Link skopiowany. Wklej go klientowi, w stopkę maila albo w bio' : 'Nie udało się skopiować – zaznacz link ręcznie');
        if (ok) { $('#b-kopiuj').classList.add('zrobione'); setTimeout(() => $('#b-kopiuj').classList.remove('zrobione'), 1500); }
      };
      $('#b-kopiuj').addEventListener('click', kopiuj);
      $('#m-kopiuj').addEventListener('click', kopiuj);
      $('#b-otworz').addEventListener('click', () => {
        if (!aktualnyLink) return;
        window.open(tutaj() + aktualnyLink.slice(aktualnyLink.indexOf('#')), '_blank', 'noopener');
      });
      $('#b-qr').addEventListener('click', () => { if (aktualnyLink) pokazQR(aktualnyLink, aktualnyStan.imie); });
      if (navigator.share) {
        $('#b-udostepnij').hidden = false;
        $('#b-udostepnij').addEventListener('click', () => { if (aktualnyLink) udostepnij(aktualnyLink, aktualnyStan.imie + ' – wizytówka'); });
      }
      $('#ud-link').addEventListener('click', () => {
        if (!aktualnyLink) return;
        const r = document.createRange();
        r.selectNodeContents($('#ud-link'));
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      });
      $('#m-podglad').addEventListener('click', () => $('#kol-podglad').scrollIntoView({ behavior: 'smooth', block: 'start' }));

      $$('.seg [data-urz]').forEach((b) => b.addEventListener('click', () => ustawUrzadzenie(b.dataset.urz)));
      new ResizeObserver(() => dopasuj()).observe($('#pg-ekran'));
      new ResizeObserver(() => {
        const inner = $('#pg-inner');
        $('#pg-sizer').style.height = inner.offsetHeight * (inner.getBoundingClientRect().width / (inner.offsetWidth || 1)) + 'px';
      }).observe($('#pg-inner'));

      if (Z_PLIKU) {
        const nota = $('#ud-nota');
        nota.hidden = false;
        nota.textContent = 'Aplikacja jest otwarta z pliku, więc link prowadzi do jej wersji online (1prompt1zdanie.vibemaster.pl). Przycisk „Otwórz” pokaże wizytówkę z tego komputera.';
      }
      ustawUrzadzenie(urzadzenie);
    }

    const start = daneZLinku || wczytajSzkic() || Kod.pusty();
    doFormularza(start);
    odswiez();
    if (daneZLinku) pokazToast('Wczytano wizytówkę z linku. Zmień, co chcesz, i skopiuj nowy link');
  }

  /* ================= trasowanie ================= */
  async function trasa() {
    const h = location.hash;
    if (/^#w./.test(h)) {
      document.documentElement.dataset.tryb = 'karta';
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
