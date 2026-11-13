/* Dziesiątka – interfejs: postępy, widoki, arena pisania, statystyki */
(function () {
  'use strict';
  const DZ = window.DZ;
  const { los, jestLitera, jestWielka } = DZ.narz;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ogr = (v, a, b) => Math.max(a, Math.min(b, v));

  const KLUCZ = 'dziesiatka.v1';
  const PROG = 0.9;                 // minimalna dokładność, żeby zaliczyć krok lekcji
  const LICZBA_LITER = DZ.LITERY_WSZYSTKIE.length;

  /* ================= Stan i zapis ================= */
  const UST = { dzwiek: true, klaw: 'pelna', dlonie: true, poBledzie: 'blokuj', jednostka: 'zn', celDzienny: 15, celPredkosci: 200,
    rozmiar: 'm', motyw: 'auto', odblokuj: false, metronom: 0, graWszystkie: false };
  const nowyStan = () => ({ ust: { ...UST }, lekcje: {}, klawisze: {}, pomylki: {}, sesje: [], dni: {}, start: null, rekord: 0,
    graRekord: 0, wlasny: '', wlasnyPoz: 0, powitany: false });
  function wczytaj() {
    try {
      const s = JSON.parse(localStorage.getItem(KLUCZ));
      if (s && typeof s === 'object' && s.ust) return { ...nowyStan(), ...s, ust: { ...UST, ...s.ust } };
    } catch (e) { /* brak dostępu albo uszkodzony zapis – zaczynamy od zera */ }
    return nowyStan();
  }
  let S = wczytaj();
  function zapisz() {
    if (S.sesje.length > 600) S.sesje = S.sesje.slice(-600);
    try { localStorage.setItem(KLUCZ, JSON.stringify(S)); } catch (e) { /* tryb prywatny – gramy bez zapisu */ }
  }

  /* ================= Pomocnicze ================= */
  const dataKlucz = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const dzisK = () => dataKlucz(new Date());
  const dzien = () => { const k = dzisK(); return S.dni[k] = S.dni[k] || { s: 0, zn: 0, t: 0, l: 0, x: 0 }; };
  function seria() {
    let n = 0; const d = new Date();
    const ok = () => (S.dni[dataKlucz(d)] || {}).s >= 60;
    if (!ok()) d.setDate(d.getDate() - 1);
    while (ok()) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const jedn = () => S.ust.jednostka === 'wpm' ? 'słów/min' : 'zn./min';
  const pr = zn => Math.round(S.ust.jednostka === 'wpm' ? zn / 5 : zn);
  const proc = d => (d >= 0.9995 ? '100' : (d * 100).toFixed(1).replace('.', ',')) + '%';
  const czasTxt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  const minTxt = s => s < 60 ? Math.round(s) + ' s' : s < 3600 ? Math.round(s / 60) + ' min' : Math.floor(s / 3600) + ' h ' + Math.round(s % 3600 / 60) + ' min';
  const dataTxt = t => new Date(t).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
  const poziom = zn => { let p = DZ.POZIOMY[0]; for (const x of DZ.POZIOMY) if (zn >= x.od) p = x; return p.nazwa; };
  const TYPY = { lekcja: 'lekcja', trening: 'trening', test: 'test', start: 'punkt startowy', gra: 'gra' };

  const ostatnie = n => S.sesje.filter(x => x.typ !== 'gra' && x.typ !== 'start' && x.n >= 30).slice(-n);
  function srednie() {
    const o = ostatnie(10);
    if (!o.length) return null;
    const cz = o.reduce((a, x) => a + x.s, 0) || 1;
    return { zn: o.reduce((a, x) => a + x.zn * x.s, 0) / cz, dok: o.reduce((a, x) => a + x.dok * x.s, 0) / cz / 100 };
  }
  function logSesja(typ, w) {
    const s = Math.round(w.ms / 1000);
    S.sesje.push({ t: Date.now(), typ, zn: Math.round(w.znMin), dok: Math.round(w.dok * 1000) / 10, s, n: w.znaki });
    const d = dzien(); d.s += s; d.zn += w.znaki;
  }

  /* ----- statystyki klawiszy ----- */
  function uczKlawisze(probki, pomylki) {
    for (const p of probki) {
      const k = S.klawisze[p.ch] = S.klawisze[p.ch] || { n: 0, b: 0, d: 0, t: 0, tn: 0 };
      k.n++; if (!p.ok) k.b++;
      k.d += ((p.ok ? 1 : 0) - k.d) * (k.n < 14 ? 1 / k.n : 0.07);
      if (p.ok && p.ms) { k.tn++; k.t += (Math.min(p.ms, 2000) - k.t) * (k.tn < 14 ? 1 / k.tn : 0.09); }
    }
    for (const [o, w] of pomylki) { const kl = o + w; S.pomylki[kl] = (S.pomylki[kl] || 0) + 1; }
  }
  // Pewność klawisza 0–1: dokładność razy zbliżenie do docelowej prędkości. null = za mało danych
  function pewnosc(ch) {
    const k = S.klawisze[ch];
    if (!k || k.n < 8) return null;
    const dok = ogr((k.d - 0.8) / 0.17, 0, 1);
    const celMs = 60000 / S.ust.celPredkosci;
    const szyb = k.t ? ogr(celMs / k.t, 0, 1) : 0.4;
    return dok * Math.pow(szyb, 0.8);
  }
  const opanowane = () => [...DZ.LITERY_WSZYSTKIE].filter(c => (pewnosc(c) || 0) >= 0.8).length;

  /* ----- kurs ----- */
  const gw = i => (S.lekcje[DZ.LEKCJE[i].id] || {}).gw || 0;
  const dostepna = i => i === 0 || S.ust.odblokuj || gw(i - 1) > 0 || gw(i) > 0;
  const nastepna = () => DZ.LEKCJE.findIndex((l, i) => !gw(i));
  const ukonczone = () => DZ.LEKCJE.filter((l, i) => gw(i)).length;
  function znaneLitery() {
    if (S.ust.odblokuj) return [...DZ.LITERY_WSZYSTKIE];
    const s = new Set();
    DZ.LEKCJE.forEach((l, i) => { if (gw(i)) for (const c of l.nowe) if (jestLitera(c)) s.add(c); });
    if (s.size < 2) { s.add('f'); s.add('j'); }
    return [...s];
  }
  function fokusLiter() {
    const lit = znaneLitery();
    const oc = lit.map(c => { const p = pewnosc(c); return { c, p: p == null ? 0.35 : p, brak: p == null }; }).sort((a, b) => a.p - b.p);
    const wagi = {};
    oc.forEach(o => { wagi[o.c] = 1 + 3 * (1 - o.p); });
    const fokus = oc.filter(o => o.p < 0.9).slice(0, 3).map(o => o.c);
    fokus.forEach(c => { wagi[c] *= 1.8; });
    return { lit, wagi, fokus, oc };
  }
  function czipy(nowe, maks) {
    const zn = [...nowe];
    const pokaz = zn.slice(0, maks || 6).map(c => {
      const z = DZ.ZNAK[c];
      return '<kbd class="p' + z.p + '">' + esc(jestLitera(c) ? c.toUpperCase() : c) + '</kbd>';
    }).join('');
    const shift = zn.length && zn.every(jestWielka) ? '<kbd class="bezp">Shift</kbd>' : '';
    return shift + pokaz + (zn.length > (maks || 6) ? '<span class="wiecej">+' + (zn.length - (maks || 6)) + '</span>' : '');
  }
  const gwiazdki = n => '<span class="gwiazdki" aria-label="' + n + ' z 3 gwiazdek">' + [0, 1, 2].map(i => '<i class="' + (i < n ? 'jest' : '') + '">★</i>').join('') + '</span>';

  /* ================= Dymek, toast, modal ================= */
  const dymek = $('#dymek');
  function pokazDymek(html, x, y) {
    dymek.innerHTML = html; dymek.hidden = false;
    const r = dymek.getBoundingClientRect();
    dymek.style.left = ogr(x - r.width / 2, 8, window.innerWidth - r.width - 8) + 'px';
    dymek.style.top = (y - r.height - 10 < 8 ? y + 18 : y - r.height - 10) + 'px';
  }
  const ukryjDymek = () => { dymek.hidden = true; };
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('[data-dymek]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    pokazDymek(esc(el.dataset.dymek).replace(/\n/g, '<br>'), r.left + r.width / 2, r.top);
  });
  document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('[data-dymek]')) ukryjDymek(); });

  let toastT;
  function toast(txt, ms) {
    const t = $('#toast');
    t.textContent = txt; t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, ms || 4500);
  }
  function modal(html, wiazanie) {
    const m = $('#modal');
    m.innerHTML = '<div class="modal-okno" role="dialog" aria-modal="true">' + html + '</div>';
    m.hidden = false;
    if (wiazanie) wiazanie(m);
    const f = $('[data-fokus]', m); if (f) f.focus();
  }
  const zamknijModal = () => { $('#modal').hidden = true; $('#modal').innerHTML = ''; };

  /* ================= Nawigacja ================= */
  let widok = '';
  const RYSUJ = {};
  function pokaz(w) {
    if (widok === 'arena' && w !== 'arena') arenaStop();
    if (widok === 'gra' && w !== 'gra') DZ.gra.stop();
    widok = w;
    $$('.widok').forEach(s => s.classList.toggle('aktywny', s.id === 'w-' + w));
    $$('#nawigacja button').forEach(b => b.classList.toggle('akt', b.dataset.widok === w));
    document.body.classList.toggle('tryb-arena', w === 'arena');
    ukryjDymek();
    if (RYSUJ[w]) RYSUJ[w]();
    odswiezGore();
    window.scrollTo(0, 0);
  }
  function odswiezGore() {
    const n = seria();
    $('#pSeria b').textContent = n;
    $('#pSeria').classList.toggle('pali', n > 0);
  }
  function zastosujUst() {
    const r = document.documentElement;
    if (S.ust.motyw === 'auto') delete r.dataset.theme; else r.dataset.theme = S.ust.motyw;
    r.dataset.rozmiar = S.ust.rozmiar;
    DZ.dzwiek.ustaw(S.ust.dzwiek);
  }

  /* ================= Widok: Dziś ================= */
  const RADY = [
    'Wyczuj wypustki na F i J, zanim zaczniesz. To Twój punkt zero.',
    'Jeśli robisz dużo błędów, zwolnij o połowę. Prędkość wróci sama, i to z nawiązką.',
    'Połóż ściereczkę na dłoniach. Nie da się zerkać na coś, czego nie widać.',
    'Po każdym sięgnięciu palec wraca do bazy. Bez tego każda droga jest inna.',
    'Pisz równo. Lepiej wolno jak metronom niż szybko ze zrywami.',
    'Kwadrans dziennie wystarczy. Pamięć ruchowa utrwala się w przerwach między sesjami.',
    'Shift zawsze przeciwną ręką niż litera. Mały palec przytrzymuje, druga ręka pisze.',
    'Patrz na tekst o dwa, trzy znaki przed kursorem. Oczy prowadzą, palce nadążają.',
    'Luźne ramiona, proste plecy, nadgarstki w powietrzu. Napięcie spowalnia palce.',
    'Gdy zgubisz pozycję, nie patrz w dół. Poszukaj wypustek palcami wskazującymi.'
  ];
  RYSUJ.dzis = function () {
    const d = dzien(), cel = S.ust.celDzienny * 60, czesc = Math.min(1, d.s / cel);
    const nast = nastepna(), sr = srednie(), h = new Date().getHours();
    const kroki = [
      { zrobione: d.t >= 1, tyt: 'Rozgrzewka', opis: 'Jedna runda treningu inteligentnego', akcja: 'trening:adapt' },
      nast >= 0
        ? { zrobione: d.l >= 1, tyt: 'Lekcja ' + (nast + 1), opis: DZ.LEKCJE[nast].tytul, akcja: 'lekcja:' + nast }
        : { zrobione: d.t >= 3, tyt: 'Płynność', opis: 'Zdania i przysłowia, trzy rundy', akcja: 'trening:zdania' },
      { zrobione: d.x >= 1, tyt: 'Pomiar', opis: 'Test minutowy – zobacz, ile dziś piszesz', akcja: 'test:1' }
    ];
    const glowny = kroki.find(k => !k.zrobione);
    const obw = 2 * Math.PI * 52;
    const { oc } = fokusLiter();
    const slabe = oc.filter(o => !o.brak && o.p < 0.8).slice(0, 6);
    const dzienRoku = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 864e5);

    $('#w-dzis').innerHTML = `
      <div class="dzis">
        <div class="karta bohater">
          <p class="nadtytul">${h >= 18 || h < 5 ? 'Dobry wieczór' : 'Dzień dobry'}</p>
          <h1>${nast === 0 && !S.sesje.length ? 'Zaczynamy od dwóch klawiszy' : nast < 0 ? 'Kurs ukończony. Teraz szlifujemy prędkość' : 'Plan na dziś'}</h1>
          ${!S.start && S.sesje.length < 3 ? `<button class="baner" data-akcja="start"><b>Zmierz punkt startowy</b><span>Minuta pisania po staremu. Dzięki temu zobaczysz później, ile dała nauka.</span><i>→</i></button>` : ''}
          <ol class="plan">
            ${kroki.map((k, i) => `<li class="${k.zrobione ? 'zrobione' : ''}"><button data-akcja="${k.akcja}">
              <span class="plan-nr">${k.zrobione ? '✓' : i + 1}</span>
              <span class="plan-txt"><b>${esc(k.tyt)}</b><span>${esc(k.opis)}</span></span><i>→</i></button></li>`).join('')}
          </ol>
          <div class="bohater-dol">
            ${glowny ? `<button class="przycisk glowny duzy" data-akcja="${glowny.akcja}" data-fokus>${d.s ? 'Dalej' : 'Zaczynam'}: ${esc(glowny.tyt.toLowerCase())}</button>`
              : `<span class="odznaka-dnia">Plan na dziś wykonany</span><button class="przycisk" data-akcja="trening:adapt">Jeszcze jedna runda</button>`}
          </div>
        </div>

        <div class="karta cel-dnia">
          <div class="pierscien">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" class="pt"/>
              <circle cx="60" cy="60" r="52" class="pw" stroke-dasharray="${obw}" stroke-dashoffset="${obw * (1 - czesc)}" transform="rotate(-90 60 60)"/>
            </svg>
            <div><b>${Math.floor(d.s / 60)}</b><span>z ${S.ust.celDzienny} min</span></div>
          </div>
          <div class="cel-opis">
            <h2>Cel dzienny</h2>
            <p>${czesc >= 1 ? 'Wykonany. Reszta to już premia.' : d.s ? 'Zostało ' + minTxt(cel - d.s) + '.' : 'Kwadrans codziennie daje więcej niż godzina raz w tygodniu.'}</p>
            <p class="seria-txt"><span aria-hidden="true">🔥</span> Seria: <b>${seria()}</b> ${dni(seria())}</p>
          </div>
        </div>

        <div class="kafle">
          <div class="kafel"><span>Prędkość</span><b>${sr ? pr(sr.zn) : '–'}<small>${jedn()}</small></b>
            <em>${S.start && sr ? delta(sr.zn - S.start.zn) + ' względem startu (' + pr(S.start.zn) + ')' : sr ? poziom(sr.zn) : 'średnia z ostatnich ćwiczeń'}</em></div>
          <div class="kafel"><span>Dokładność</span><b>${sr ? proc(sr.dok) : '–'}</b><em>${sr ? (sr.dok >= 0.96 ? 'bardzo czysto' : sr.dok >= 0.92 ? 'celuj w 96%' : 'zwolnij, celuj w 96%') : 'cel: co najmniej 96%'}</em></div>
          <div class="kafel"><span>Opanowane litery</span><b>${opanowane()}<small>z ${LICZBA_LITER}</small></b><em>dokładnie i w tempie ${pr(S.ust.celPredkosci)} ${jedn()}</em></div>
          <div class="kafel"><span>Kurs</span><b>${ukonczone()}<small>z ${DZ.LEKCJE.length} lekcji</small></b>
            <div class="pasek maly"><i style="width:${ukonczone() / DZ.LEKCJE.length * 100}%"></i></div></div>
        </div>

        <div class="karta">
          <h2>Klawisze do poprawy</h2>
          ${slabe.length ? `<p class="drobne">Te litery idą Ci najwolniej albo z błędami. Trening inteligentny podsuwa je częściej.</p>
            <div class="slabe">${slabe.map(o => `<div class="slaby"><kbd class="p${DZ.ZNAK[o.c].p}">${o.c.toUpperCase()}</kbd><div class="pasek maly"><i style="width:${Math.round(o.p * 100)}%"></i></div><span>${Math.round(o.p * 100)}%</span></div>`).join('')}</div>
            <button class="przycisk" data-akcja="trening:adapt">Ćwicz je teraz</button>`
            : `<p class="drobne">${Object.keys(S.klawisze).length ? 'Na razie żadna litera nie odstaje. Tak trzymaj.' : 'Po pierwszych ćwiczeniach zobaczysz tu litery, które sprawiają Ci najwięcej kłopotu.'}</p>`}
        </div>

        <div class="karta rada-dnia">
          <h2>Rada na dziś</h2>
          <p>${RADY[dzienRoku % RADY.length]}</p>
          <button class="link" data-akcja="widok:poradnik">Cały poradnik →</button>
        </div>
      </div>`;
  };
  const dni = n => n === 1 ? 'dzień' : 'dni';
  const delta = v => (v >= 0 ? '+' : '−') + Math.abs(pr(v));

  // Wspólna obsługa przycisków data-akcja
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-akcja]');
    if (!b) return;
    const [co, arg] = b.dataset.akcja.split(':');
    if (co === 'lekcja') startLekcja(+arg);
    else if (co === 'trening') startTrening(arg);
    else if (co === 'test') startTest(+arg, false);
    else if (co === 'start') startTest(1, true);
    else if (co === 'widok') pokaz(arg);
  });

  /* ================= Widok: Kurs ================= */
  RYSUJ.kurs = function () {
    const nast = nastepna();
    const suma = DZ.LEKCJE.reduce((a, l, i) => a + gw(i), 0);
    $('#w-kurs').innerHTML = `
      <div class="naglowek-widoku"><div><h1>Kurs</h1>
        <p class="lead">Trzydzieści cztery krótkie lekcje, od dwóch klawiszy do pełnej klawiatury. Każda zajmuje kilka minut i kończy się krokiem bez podpowiedzi.</p></div>
        <div class="licznik-gw">${gwiazdki(3)}<b>${suma}</b><span>z ${DZ.LEKCJE.length * 3}</span></div></div>
      ${DZ.ETAPY.map((et, e) => {
        const lek = DZ.LEKCJE.map((l, i) => ({ l, i })).filter(x => x.l.etap === e);
        const zr = lek.filter(x => gw(x.i)).length;
        return `<div class="etap">
          <div class="etap-glowa"><span class="etap-nr">${e + 1}</span><div><h2>${esc(et.nazwa)}</h2><p>${esc(et.opis)}</p></div>
            <span class="etap-postep">${zr}/${lek.length}</span></div>
          <div class="lekcje">${lek.map(({ l, i }) => `<button class="lekcja ${dostepna(i) ? '' : 'zablok'} ${gw(i) ? 'zrobiona' : ''} ${i === nast ? 'biezaca' : ''}" data-lekcja="${i}" ${dostepna(i) ? '' : 'aria-disabled="true"'}>
              <span class="lnr">${dostepna(i) ? i + 1 : '🔒'}</span>
              <span class="ltyt">${esc(l.tytul)}</span>
              <span class="ldol"><span class="lkl">${l.nowe ? czipy(l.nowe, 5) : '<span class="drobne">' + (l.typ === 'egzamin' ? 'wszystko naraz' : l.typ === 'zdania' ? 'pełne zdania' : 'powtórka') + '</span>'}</span>${gwiazdki(gw(i))}</span>
            </button>`).join('')}</div></div>`;
      }).join('')}`;
    $$('#w-kurs .lekcja').forEach(b => b.onclick = () => {
      const i = +b.dataset.lekcja;
      if (dostepna(i)) startLekcja(i);
      else toast('Ta lekcja odblokuje się po ukończeniu poprzedniej. Jeśli znasz już te klawisze, możesz odblokować cały kurs w ustawieniach.');
    });
  };

  /* ================= Arena pisania ================= */
  const A = { cfg: null, i: 0, sesja: null, stan: 'brak', klaw: null, zn: [], wyniki: [], glowna: null, blokadaDo: 0, tStart: 0, zlyUklad: 0 };
  const METRO = [0, 60, 90, 120, 150, 180, 240];

  function arenaInit() {
    A.klaw = new DZ.Klawiatura($('#aKlaw'), { dlonie: true });
    $('#aWyjdz').onclick = arenaWyjdz;
    const cykl = (id, fn) => { $(id).onclick = e => { fn(); zapisz(); arenaUst(); arenaWskaz(); e.currentTarget.blur(); }; };
    cykl('#aKlawTryb', () => { const k = ['pelna', 'kolory', 'ukryta']; S.ust.klaw = k[(k.indexOf(S.ust.klaw) + 1) % 3]; });
    cykl('#aDlonie', () => { S.ust.dlonie = !S.ust.dlonie; });
    cykl('#aDzwiek', () => { S.ust.dzwiek = !S.ust.dzwiek; });
    cykl('#aMetronom', () => { S.ust.metronom = METRO[(METRO.indexOf(S.ust.metronom) + 1) % METRO.length] || 0; });
    document.addEventListener('keydown', naKlawisz);
  }
  function arenaUst() {
    const k = A.cfg && A.cfg.kroki[A.i];
    const tryb = S.ust.klaw === 'ukryta' ? 'ukryta' : (k && k.podp === false) ? 'kolory' : S.ust.klaw;
    A.klaw.tryb(tryb);
    $('#aKlaw').classList.toggle('bez-dloni', !S.ust.dlonie);
    $('#aKlawTryb').innerHTML = 'Klawiatura: <b>' + ({ pelna: 'z podpowiedziami', kolory: 'same kolory', ukryta: 'ukryta' })[S.ust.klaw] + '</b>';
    $('#aDlonie').innerHTML = 'Dłonie: <b>' + (S.ust.dlonie ? 'widać' : 'ukryte') + '</b>';
    $('#aDzwiek').innerHTML = 'Dźwięk: <b>' + (S.ust.dzwiek ? 'wł.' : 'wył.') + '</b>';
    $('#aMetronom').innerHTML = 'Metronom: <b>' + (S.ust.metronom ? pr(S.ust.metronom) + ' ' + jedn() : 'wył.') + '</b>';
    $('#aZnJ').textContent = jedn();
    DZ.dzwiek.ustaw(S.ust.dzwiek);
    clearInterval(A.metro);
    if (S.ust.metronom) A.metro = setInterval(() => { if (A.stan === 'pisanie' && A.tStart) DZ.dzwiek.tik(); }, 60000 / S.ust.metronom);
  }
  function arenaStart(cfg) {
    A.cfg = cfg; A.wyniki = []; A.runda = 0; A.i = 0;
    pokaz('arena');
    $('#aTytul').textContent = cfg.tytul;
    $('#aCzasJ').textContent = cfg.limit ? 'zostało' : 'czas';
    if (cfg.intro) arenaIntro(); else arenaKrok(0);
  }
  function arenaStop() {
    clearInterval(A.tik); clearInterval(A.metro);
    A.stan = 'brak'; A.sesja = null;
  }
  function arenaWyjdz() { pokaz((A.cfg && A.cfg.powrot) || 'dzis'); }

  function rysujKroki() {
    const kr = A.cfg.kroki, el = $('#aKroki');
    el.hidden = kr.length < 2;
    el.innerHTML = kr.map((k, i) => `<span class="${i < A.i || A.wyniki[i] ? 'zrobiony' : ''} ${i === A.i ? 'teraz' : ''}"><i>${i < A.i ? '✓' : i + 1}</i>${esc(k.nazwa)}</span>`).join('');
  }
  function arenaIntro() {
    const cfg = A.cfg;
    A.stan = 'intro'; A.i = 0;
    clearInterval(A.tik);
    rysujKroki(); arenaUst();
    $('#aPod').textContent = '';
    $('#aTekstBox').hidden = true; $('#aPodp').innerHTML = '';
    $('#aPostep').style.width = '0%';
    $('#aZn').textContent = '–'; $('#aDok').textContent = '–'; $('#aCzas').textContent = '0:00';
    A.klaw.wyczysc(); A.klaw.zaznacz(cfg.intro.nowe || []);
    const p = $('#aPanel');
    p.hidden = false;
    $('.arena').classList.add('w-panelu');
    p.innerHTML = `<div class="panel-in intro">
      <p class="nadtytul">${esc(cfg.intro.nad || '')}</p><h2>${esc(cfg.intro.tytul)}</h2>
      <p class="panel-opis">${esc(cfg.intro.opis)}</p>
      ${cfg.intro.klawisze || ''}
      <div class="panel-akcje"><button class="przycisk glowny" id="pGl">Zaczynam <kbd>Enter</kbd></button></div></div>`;
    A.glowna = () => arenaKrok(0);
    A.blokadaDo = performance.now() + 300;
    $('#pGl').onclick = A.glowna;
  }
  function arenaKrok(i) {
    const cfg = A.cfg, k = cfg.kroki[i];
    A.i = i; A.stan = 'pisanie'; A.tStart = 0; A.glowna = null;
    const tekst = typeof k.tekst === 'function' ? k.tekst() : k.tekst;
    A.sesja = new DZ.Sesja(tekst, cfg.tryb);
    $('#aPod').textContent = (typeof k.opis === 'function' ? k.opis() : k.opis) || '';
    $('#aPanel').hidden = true; $('#aTekstBox').hidden = false;
    $('.arena').classList.remove('w-panelu');
    A.klaw.zaznacz([]);
    rysujKroki(); rysujTekst(); arenaUst(); arenaWskaz(); liczniki();
    clearInterval(A.tik);
    A.tik = setInterval(liczniki, 250);
  }
  function rysujTekst() {
    const box = $('#aTekst');
    box.innerHTML = ''; box.style.transform = 'translateY(0)';
    A.zn = []; A.topOst = -1;
    let sl = null;
    A.sesja.tekst.forEach(ch => {
      if (!sl) { sl = document.createElement('span'); sl.className = 'sl'; box.appendChild(sl); }
      const z = document.createElement('span');
      z.className = 'z'; z.textContent = ch;
      sl.appendChild(z); A.zn.push(z);
      if (ch === ' ') sl = null;
    });
    odswiezZnaki(0, 1);
    przewin();
  }
  function odswiezZnaki(od, do_) {
    const s = A.sesja;
    for (let i = Math.max(0, od); i <= do_ && i < A.zn.length; i++) {
      const st = s.stan[i];
      let c = 'z' + (st === 1 ? ' ok' : st === 2 ? ' zle' : st === 3 ? ' popr' : '');
      if (i === s.poz && !s.koniec) c += ' teraz' + (s.blad ? ' blad' : '');
      if (A.zn[i].className !== c) A.zn[i].className = c;
    }
  }
  function przewin() {
    const z = A.zn[Math.min(A.sesja.poz, A.zn.length - 1)];
    if (!z) return;
    const top = z.parentElement.offsetTop;
    if (top === A.topOst) return;
    A.topOst = top;
    const box = $('#aTekst'), lh = parseFloat(getComputedStyle(box).lineHeight) || 48;
    box.style.transform = 'translateY(' + (-Math.max(0, Math.round(top / lh) - 1) * lh) + 'px)';
  }
  function opisZnaku(ch) {
    const p = DZ.Klawiatura.plan(ch);
    if (!p) return '';
    const kl = DZ.KLAWISZ[p.z.kod];
    const nazwa = ch === ' ' ? 'Spacja' : /[a-z]/.test(kl.m) ? kl.m.toUpperCase() : kl.m;
    const cz = [];
    if (p.z.shift) { const lewa = p.z.p <= 3; cz.push(`<span><kbd class="p${lewa ? 9 : 0}">Shift</kbd> ${lewa ? 'prawy' : 'lewy'} mały</span>`); }
    if (p.z.alt) cz.push('<span><kbd class="p5">Alt</kbd> prawy kciuk</span>');
    cz.push(`<span><kbd class="p${p.z.p}">${esc(nazwa)}</kbd> ${ch === ' ' ? 'kciuk' : DZ.PALCE[p.z.p].nazwa}</span>`);
    return cz.join('<i>+</i>');
  }
  function arenaWskaz() {
    const s = A.sesja, podp = $('#aPodp');
    if (A.stan !== 'pisanie' || !s || s.koniec) { if (A.stan !== 'intro') A.klaw.wyczysc(); podp.innerHTML = ''; return; }
    const k = A.cfg.kroki[A.i];
    const pelna = (S.ust.klaw === 'pelna' && k.podp !== false) || s.blad;   // po pomyłce zawsze pokazujemy drogę
    if (pelna) { A.klaw.wskaz(s.oczekiwany); podp.innerHTML = S.ust.klaw === 'ukryta' && !s.blad ? '' : opisZnaku(s.oczekiwany); }
    else {
      A.klaw.wyczysc();
      podp.innerHTML = k.podp === false && S.ust.klaw !== 'ukryta' ? '<span class="drobne">Bez podpowiedzi. Gdy zgubisz pozycję, wyczuj wypustki na F i J.</span>' : '';
    }
  }
  function liczniki() {
    const s = A.sesja;
    if (!s || A.stan !== 'pisanie') return;
    const teraz = performance.now();
    let ms;
    if (A.cfg.limit) {
      ms = A.tStart ? teraz - A.tStart : 0;
      const zost = Math.max(0, A.cfg.limit * 1000 - ms);
      $('#aCzas').textContent = czasTxt(Math.ceil(zost / 1000));
      if (A.tStart && zost <= 0) { arenaKoniec(); return; }
    } else {
      ms = s.aktywny + (s.tOst ? Math.min(teraz - s.tOst, 4000) : 0);
      $('#aCzas').textContent = czasTxt(ms / 1000);
    }
    const w = s.wynik(ms);
    $('#aZn').textContent = ms > 3000 ? pr(w.znMin) : '–';
    $('#aDok').textContent = s.uderzenia ? Math.round(w.dok * 100) + '%' : '100%';
    $('#aPostep').style.width = (A.cfg.limit ? ogr(ms / (A.cfg.limit * 10), 0, 100) : s.poz / s.tekst.length * 100) + '%';
  }

  function naKlawisz(e) {
    if (widok !== 'arena' || !$('#modal').hidden) return;
    if (A.stan === 'intro' || A.stan === 'wynik') {
      if (e.key === 'Enter' || (A.stan === 'intro' && e.key === ' ')) {
        e.preventDefault();
        if (performance.now() >= A.blokadaDo && A.glowna) A.glowna();
      } else if (e.key === 'Escape') { e.preventDefault(); arenaWyjdz(); }
      else if (e.key === ' ' || e.key === "'" || e.key === '/') e.preventDefault();
      return;
    }
    if (A.stan !== 'pisanie') return;
    if (e.key === 'Escape') { e.preventDefault(); arenaWyjdz(); return; }
    if (e.metaKey || (e.ctrlKey && !e.altKey)) return;
    if (e.code === 'AltRight' || e.key === 'AltGraph' || e.key === 'Tab') { e.preventDefault(); return; }
    if (e.getModifierState) $('#aCaps').hidden = !e.getModifierState('CapsLock');
    const s = A.sesja;
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (s.cofnij()) { odswiezZnaki(s.poz, s.poz + 1); arenaWskaz(); przewin(); }
      return;
    }
    if (e.key.length !== 1 || e.isComposing) return;
    e.preventDefault();
    if (/^Key[A-Z]$/.test(e.code) && /^[a-z]$/i.test(e.key) && !e.altKey && e.key.toUpperCase() !== e.code[3] && ++A.zlyUklad === 3)
      toast('Wygląda na to, że Twój układ klawiatury jest inny niż „Polski (programisty)”. Klawiatura na ekranie może nie zgadzać się z Twoją.', 9000);
    const przed = s.poz;
    const w = s.wpisz(e.key, performance.now());
    if (!w) return;
    if (!A.tStart) A.tStart = performance.now();
    A.klaw.blysk(e.code, w.ok);
    if (w.ok) { if (e.key === ' ') DZ.dzwiek.spacja(); else DZ.dzwiek.klik(); } else DZ.dzwiek.blad();
    odswiezZnaki(przed - 1, s.poz + 1);
    if (w.koniec) arenaKoniec();
    else { arenaWskaz(); przewin(); }
  }

  function arenaKoniec() {
    const s = A.sesja, cfg = A.cfg;
    if (A.stan !== 'pisanie') return;
    A.stan = 'wynik';
    clearInterval(A.tik);
    const ms = cfg.limit ? Math.min(cfg.limit * 1000, performance.now() - A.tStart) : s.aktywny;
    const w = s.wynik(ms);
    A.klaw.wyczysc(); $('#aPodp').innerHTML = ''; $('#aCaps').hidden = true;
    $('#aPostep').style.width = '100%';
    if (w.znaki >= 10) { uczKlawisze(s.probki, s.pomylki); logSesja(cfg.typ, w); }
    const spec = cfg.poKroku(w, A.i);
    zapisz();
    pokazPanel(spec, w);
    odswiezGore();
  }
  function radaPo(w) {
    if (w.dok < 0.9) return 'Zwolnij. Pisz tak wolno, żeby trafiać za pierwszym razem – prędkość przyjdzie sama.';
    if (w.dok < 0.95) return 'Jest dobrze, ale tempo trochę wyprzedza palce. Celuj w 95% i więcej.';
    if (w.dok >= 0.985) return 'Bardzo czysto. Możesz delikatnie przyspieszyć.';
    return 'Pilnuj równego rytmu. Stałe tempo jest ważniejsze niż zrywy.';
  }
  function pokazPanel(spec, w) {
    $('.arena').classList.add('w-panelu');
    const zle = Object.entries(spec.zle || w.zle).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const p = $('#aPanel');
    $('#aTekstBox').hidden = true;
    p.hidden = false;
    p.innerHTML = `<div class="panel-in ${spec.ton || ''}">
      ${spec.gwiazdki != null ? '<div class="panel-gw">' + gwiazdki(spec.gwiazdki) + '</div>' : ''}
      ${spec.nad ? '<p class="nadtytul">' + esc(spec.nad) + '</p>' : ''}
      <h2>${esc(spec.tytul)}</h2>
      <p class="panel-opis">${spec.opis || esc(radaPo(w))}</p>
      <div class="panel-liczby">
        <div><b>${pr(spec.zn != null ? spec.zn : w.znMin)}</b><span>${jedn()}</span></div>
        <div><b>${proc(spec.dok != null ? spec.dok : w.dok)}</b><span>dokładność</span></div>
        <div><b>${spec.bledy != null ? spec.bledy : w.bledy}</b><span>${spec.bledyEt || 'pomyłki'}</span></div>
        <div><b>${czasTxt((spec.ms != null ? spec.ms : w.ms) / 1000)}</b><span>czas</span></div>
      </div>
      ${zle.length ? `<p class="panel-zle">Najwięcej pomyłek: ${zle.map(([c, n]) => `<span><kbd class="p${(DZ.ZNAK[c] || {}).p}">${c === ' ' ? 'spacja' : esc(c)}</kbd>×${n}</span>`).join(' ')}</p>` : ''}
      ${spec.dodatek || ''}
      <div class="panel-akcje">${spec.akcje.map((a, i) => `<button class="przycisk ${a.glowna ? 'glowny' : ''}" data-i="${i}">${esc(a.txt)}${a.glowna ? ' <kbd>Enter</kbd>' : ''}</button>`).join('')}</div>
    </div>`;
    $$('.panel-akcje button', p).forEach(b => b.onclick = () => spec.akcje[+b.dataset.i].fn());
    const gl = spec.akcje.find(a => a.glowna);
    A.glowna = gl ? gl.fn : null;
    A.blokadaDo = performance.now() + 700;
    if (spec.ton === 'slabo') DZ.dzwiek.slabo();
    else if (spec.gwiazdki) for (let i = 0; i < spec.gwiazdki; i++) DZ.dzwiek.gwiazdka(i);
    else DZ.dzwiek.sukces();
  }

  /* ----- lekcja ----- */
  function startLekcja(idx) {
    const lek = DZ.LEKCJE[idx], kroki = DZ.gen.kroki(idx), nowe = [...lek.nowe];
    const klawisze = nowe.length && nowe.length <= 6
      ? '<div class="intro-klawisze">' + nowe.map(c => { const pl = DZ.Klawiatura.plan(c); return `<div><kbd class="p${pl.z.p} duzy">${esc(jestLitera(c) ? c.toUpperCase() : c)}</kbd><span>${pl.z.shift ? 'Shift + ' : ''}${pl.z.alt ? 'prawy Alt + ' : ''}${DZ.PALCE[pl.z.p].nazwa}</span></div>`; }).join('') + '</div>'
      : '';
    arenaStart({
      typ: 'lekcja', tytul: 'Lekcja ' + (idx + 1) + '. ' + lek.tytul, kroki, tryb: S.ust.poBledzie, powrot: 'kurs',
      intro: { nad: 'Etap ' + (lek.etap + 1) + ' · ' + DZ.ETAPY[lek.etap].nazwa, tytul: lek.tytul, opis: lek.rada, nowe, klawisze },
      poKroku(w, i) {
        const powtorz = { txt: 'Powtórz krok', fn: () => arenaKrok(i) };
        if (w.dok < PROG) return { ton: 'slabo', tytul: 'Jeszcze raz, spokojniej', opis: 'Do zaliczenia kroku potrzeba ' + Math.round(PROG * 100) + '% dokładności. Zwolnij tak bardzo, żeby trafiać za pierwszym razem.', akcje: [{ ...powtorz, glowna: true }] };
        A.wyniki[i] = w;
        if (i < kroki.length - 1) return { nad: 'Krok ' + (i + 1) + ' z ' + kroki.length, tytul: 'Zaliczone', akcje: [{ txt: 'Dalej: ' + kroki[i + 1].nazwa.toLowerCase(), glowna: true, fn: () => arenaKrok(i + 1) }, powtorz] };
        // koniec lekcji
        const wy = A.wyniki.filter(Boolean);
        const zn = wy.reduce((a, x) => a + x.poprawne, 0) / (wy.reduce((a, x) => a + x.ms, 0) / 60000);
        const dok = wy.reduce((a, x) => a + x.dok * x.znaki, 0) / wy.reduce((a, x) => a + x.znaki, 0);
        const g = dok >= 0.98 ? 3 : dok >= 0.95 ? 2 : 1;
        const st = S.lekcje[lek.id] = S.lekcje[lek.id] || { gw: 0, zn: 0, dok: 0, razy: 0 };
        const pierwszyRaz = !st.gw;
        st.gw = Math.max(st.gw, g); st.zn = Math.max(st.zn, Math.round(zn)); st.dok = Math.max(st.dok, Math.round(dok * 1000) / 10); st.razy++;
        dzien().l++;
        const nast = DZ.LEKCJE[idx + 1];
        const koniecEtapu = !nast || nast.etap !== lek.etap;
        const akcje = [];
        if (nast) akcje.push({ txt: 'Następna lekcja', glowna: true, fn: () => startLekcja(idx + 1) });
        else akcje.push({ txt: 'Trening inteligentny', glowna: true, fn: () => startTrening('adapt') });
        akcje.push({ txt: 'Powtórz lekcję', fn: () => startLekcja(idx) }, { txt: 'Do kursu', fn: () => pokaz('kurs') });
        const zle = {};
        wy.forEach(x => { for (const c in x.zle) zle[c] = (zle[c] || 0) + x.zle[c]; });
        return {
          zle, gwiazdki: g, zn, dok, ms: wy.reduce((a, x) => a + x.ms, 0), bledy: wy.reduce((a, x) => a + x.bledy, 0),
          nad: !nast ? 'Cały kurs za Tobą' : koniecEtapu && pierwszyRaz ? 'Etap ukończony: ' + DZ.ETAPY[lek.etap].nazwa : 'Lekcja ' + (idx + 1) + ' ukończona',
          tytul: g === 3 ? 'Wzorowo' : g === 2 ? 'Dobra robota' : 'Zaliczone',
          opis: !nast ? 'Znasz całą klawiaturę. Teraz liczy się regularny trening: kwadrans dziennie i prędkość będzie rosła.'
            : g === 3 ? 'Trzy gwiazdki oznaczają co najmniej 98% dokładności. Tak wygląda fundament szybkiego pisania.'
              : g === 2 ? 'Dwie gwiazdki. Trzecią dostaniesz za 98% dokładności – warto wrócić tu jutro.'
                : 'Jedna gwiazdka. Lekcja zaliczona, ale opłaca się ją powtórzyć wolniej i czyściej.',
          akcje
        };
      }
    });
  }

  /* ----- trening ----- */
  const TRENINGI = {
    adapt: { nazwa: 'Trening inteligentny', ikona: '◎', etap: 0, opis: 'Słowa dobrane pod Twoje najsłabsze litery. Im więcej piszesz, tym celniej trafia w to, co wymaga pracy.' },
    czeste: { nazwa: 'Najczęstsze słowa', ikona: '200', etap: 4, opis: 'Dwieście słów, które piszesz bez przerwy. Warto mieć je w palcach jako gotowe ruchy.', tekst: () => DZ.gen.czeste(200, 200) },
    zdania: { nazwa: 'Zdania i przysłowia', ikona: ',.?', etap: 4, opis: 'Pełne zdania z wielkimi literami, interpunkcją i polskimi znakami. Najbliżej prawdziwego pisania.', tekst: () => DZ.gen.zdania(230) },
    polskie: { nazwa: 'Polskie znaki', ikona: 'ą', etap: 4, opis: 'Słowa gęste od ogonków i kresek. Prawy Alt przestanie być przeszkodą.', tekst: () => DZ.gen.polskie(190) },
    dwuznaki: { nazwa: 'Sz, cz, rz, ch, dz', ikona: 'sz', etap: 2, opis: 'Polskie dwuznaki to stałe pary ruchów. Gdy wejdą w palce, całe słowa przyspieszają.', tekst: () => DZ.gen.dwuznaki(190) },
    wielkie: { nazwa: 'Wielkie litery i interpunkcja', ikona: 'Aa!', etap: 4, opis: 'Imiona, miasta, pytania i wykrzyknienia. Trening obu Shiftów.', tekst: () => DZ.gen.wielkie(200) },
    cyfry: { nazwa: 'Cyfry', ikona: '12', etap: 5, opis: 'Liczby, daty, godziny i kwoty. Górny rząd bez patrzenia.', tekst: () => DZ.gen.cyfry(160) },
    symbole: { nazwa: 'Symbole', ikona: '@#', etap: 5, opis: 'Adresy, nawiasy, procenty i działania. Przydatne w pracy i w kodzie.', tekst: () => DZ.gen.symbole(170) },
    wlasny: { nazwa: 'Własny tekst', ikona: '✎', etap: 0, opis: 'Wklej dowolny tekst i przepisuj go po kawałku: artykuł, notatki, fragment książki.' }
  };
  const etapZrobiony = e => DZ.LEKCJE.every((l, i) => l.etap > e || gw(i)) || S.ust.odblokuj;

  function startTrening(tryb) {
    const def = TRENINGI[tryb];
    let fokus = [], tekst = def.tekst, opis = def.opis.split('.')[0] + '.';
    if (tryb === 'adapt') {
      tekst = () => { const f = fokusLiter(); fokus = f.fokus; return DZ.gen.adaptacyjny(f.lit, f.wagi, 170, f.fokus); };
      opis = () => fokus.length ? 'W tej rundzie częściej: ' + fokus.map(c => c.toUpperCase()).join(', ') : 'Wszystkie poznane litery po równo';
    } else if (tryb === 'wlasny') {
      if (!S.wlasny) { pokaz('trening'); toast('Najpierw wklej swój tekst w polu poniżej.'); return; }
      tekst = () => { const p = DZ.gen.porcja(S.wlasny, S.wlasnyPoz, 260); A.wlasnyNast = p.nast; return p.tekst; };
      opis = () => 'Fragment od znaku ' + (S.wlasnyPoz + 1) + ' z ' + S.wlasny.length;
    }
    arenaStart({
      typ: 'trening', tytul: def.nazwa, tryb: S.ust.poBledzie, powrot: 'trening',
      kroki: [{ nazwa: def.nazwa, opis, tekst, podp: true }],
      poKroku(w) {
        A.runda++; dzien().t++;
        if (tryb === 'wlasny') S.wlasnyPoz = A.wlasnyNast;
        const sr = srednie();
        const lepiej = sr && w.znMin > sr.zn * 1.05 && w.dok >= 0.95;
        let dodatek = '';
        if (tryb === 'adapt' && fokus.length) {
          dodatek = '<div class="panel-fokus">' + fokus.map(c => { const p = pewnosc(c); return `<div class="slaby"><kbd class="p${DZ.ZNAK[c].p}">${c.toUpperCase()}</kbd><div class="pasek maly"><i style="width:${Math.round((p || 0) * 100)}%"></i></div><span>${p == null ? 'mało danych' : Math.round(p * 100) + '%'}</span></div>`; }).join('') + '</div>';
        }
        return {
          nad: 'Runda ' + A.runda, tytul: w.dok < PROG ? 'Za dużo pomyłek' : lepiej ? 'Powyżej Twojej średniej' : 'Runda zaliczona', ton: w.dok < PROG ? 'slabo' : '',
          dodatek, akcje: [{ txt: 'Następna runda', glowna: true, fn: () => arenaKrok(0) }, { txt: 'Zakończ', fn: arenaWyjdz }]
        };
      }
    });
  }

  RYSUJ.trening = function () {
    const f = fokusLiter();
    const karta = (id, d) => `<button class="tryb ${id === 'adapt' ? 'wyrozniony' : ''}" data-akcja="trening:${id}">
      <span class="tryb-ikona" aria-hidden="true">${d.ikona}</span><b>${esc(d.nazwa)}</b><span>${esc(d.opis)}</span>
      ${id === 'adapt' ? `<span class="tryb-fokus">${f.fokus.length ? 'Teraz na celowniku: ' + f.fokus.map(c => `<kbd class="p${DZ.ZNAK[c].p}">${c.toUpperCase()}</kbd>`).join('') : 'Litery w grze: ' + f.lit.length}</span>` : ''}
      ${!etapZrobiony(d.etap) && d.etap ? `<em>Najlepiej po etapie „${esc(DZ.ETAPY[d.etap].nazwa)}”</em>` : ''}</button>`;
    $('#w-trening').innerHTML = `
      <div class="naglowek-widoku"><div><h1>Trening</h1>
        <p class="lead">Kurs uczy, gdzie są klawisze. Trening robi z tego odruch. Każda runda to około dwóch minut.</p></div></div>
      <div class="tryby">${Object.entries(TRENINGI).filter(([id]) => id !== 'wlasny').map(([id, d]) => karta(id, d)).join('')}</div>
      <div class="karta wlasny">
        <h2>Własny tekst</h2>
        <p class="drobne">Wklej dowolny tekst. Znaki, których nie ma na klawiaturze (na przykład „drukarskie” cudzysłowy), zostaną zamienione na zwykłe. Tekst zostaje tylko w tej przeglądarce.</p>
        <textarea id="wlTekst" rows="5" placeholder="Wklej tutaj tekst do przepisywania…">${esc(S.wlasny)}</textarea>
        <div class="wiersz"><button class="przycisk glowny" id="wlStart">Przepisuj</button>
          <span class="drobne" id="wlInfo">${S.wlasny ? 'Zapisano ' + S.wlasny.length + ' znaków, jesteś przy ' + (S.wlasnyPoz + 1) + '.' : ''}</span></div>
      </div>`;
    $('#wlStart').onclick = () => {
      const t = DZ.gen.normalizuj($('#wlTekst').value);
      if (t.length < 40) { toast('Tekst jest za krótki. Wklej przynajmniej kilka zdań.'); return; }
      if (t !== S.wlasny) { S.wlasny = t; S.wlasnyPoz = 0; zapisz(); }
      startTrening('wlasny');
    };
  };

  /* ----- test ----- */
  function startTest(min, bazowy) {
    zamknijModal();
    arenaStart({
      typ: bazowy ? 'start' : 'test', tytul: bazowy ? 'Punkt startowy' : 'Test ' + min + ' min', tryb: 'swobodny', limit: min * 60, powrot: bazowy ? 'dzis' : 'test',
      kroki: [{ nazwa: 'Test', podp: false, tekst: () => DZ.gen.test(min),
        opis: bazowy ? 'Pisz tak, jak piszesz na co dzień. Czas ruszy z pierwszym klawiszem.' : 'Czas ruszy z pierwszym klawiszem. Błędy poprawiaj klawiszem Backspace.' }],
      poKroku(w) {
        const zn = Math.round(w.znMin), poprz = S.rekord;
        let nad = bazowy ? 'Punkt startowy zapisany' : 'Wynik testu', opis;
        if (bazowy) {
          S.start = { zn, dok: Math.round(w.dok * 1000) / 10, t: Date.now() };
          opis = 'To Twoja prędkość sprzed nauki. Przez pierwsze dni nowa technika będzie wolniejsza – to normalne. Wrócisz do tego wyniku, a potem go przeskoczysz.';
        } else {
          dzien().x++;
          if (zn > S.rekord && w.dok >= 0.9) S.rekord = zn;
          const cz = [];
          if (zn > poprz && w.dok >= 0.9 && poprz) cz.push('Nowy rekord, poprzedni to ' + pr(poprz) + ' ' + jedn() + '.');
          if (S.start) cz.push(zn >= S.start.zn ? 'To ' + delta(zn - S.start.zn) + ' ' + jedn() + ' względem punktu startowego.' : 'Do punktu startowego (' + pr(S.start.zn) + ') brakuje jeszcze ' + pr(S.start.zn - zn) + '. Nowa technika potrzebuje czasu.');
          if (w.dok < 0.92) cz.push('Dokładność poniżej 92% mocno obniża wynik. Wolniej znaczy tu szybciej.');
          if (w.zostalo) cz.push('W tekście zostało ' + w.zostalo + ' niepoprawionych znaków.');
          opis = esc(cz.join(' ') || radaPo(w));
          nad = 'Poziom: ' + poziom(zn);
        }
        return {
          nad, tytul: pr(zn) + ' ' + jedn(), opis, bledyEt: 'błędne uderzenia',
          dodatek: `<p class="drobne">${S.ust.jednostka === 'wpm' ? zn + ' zn./min' : Math.round(zn / 5) + ' słów/min (WPM)'} · liczone są tylko poprawne znaki</p>`,
          akcje: bazowy ? [{ txt: 'Zaczynam naukę', glowna: true, fn: () => startLekcja(Math.max(0, nastepna())) }, { txt: 'Na później', fn: () => pokaz('dzis') }]
            : [{ txt: 'Gotowe', glowna: true, fn: () => pokaz('test') }, { txt: 'Jeszcze raz', fn: () => startTest(min, false) }, { txt: 'Statystyki', fn: () => pokaz('staty') }]
        };
      }
    });
  }
  RYSUJ.test = function () {
    const testy = S.sesje.filter(x => x.typ === 'test').slice(-8).reverse();
    $('#w-test').innerHTML = `
      <div class="naglowek-widoku"><div><h1>Test prędkości</h1>
        <p class="lead">Ciągły tekst na czas, bez podpowiedzi, z poprawianiem błędów. Tak sprawdzisz, ile naprawdę piszesz.</p></div></div>
      <div class="test-wybor">
        ${[1, 2, 5].map(m => `<button class="tryb test-karta" data-akcja="test:${m}"><span class="test-min">${m}</span><b>${m === 1 ? 'minuta' : m === 2 ? 'minuty' : 'minut'}</b><span>${m === 1 ? 'Szybki pomiar na co dzień' : m === 2 ? 'Dokładniejszy wynik' : 'Sprawdzian wytrzymałości'}</span></button>`).join('')}
      </div>
      <div class="kafle trzy">
        <div class="kafel"><span>Rekord</span><b>${S.rekord ? pr(S.rekord) : '–'}<small>${jedn()}</small></b><em>${S.rekord ? poziom(S.rekord) : 'przy dokładności co najmniej 90%'}</em></div>
        <div class="kafel"><span>Punkt startowy</span><b>${S.start ? pr(S.start.zn) : '–'}<small>${jedn()}</small></b><em>${S.start ? 'zmierzony ' + dataTxt(S.start.t) + ', dokładność ' + String(S.start.dok).replace('.', ',') + '%' : '<button class="link" data-akcja="start">Zmierz teraz →</button>'}</em></div>
        <div class="kafel"><span>Twój cel</span><b>${pr(S.ust.celPredkosci)}<small>${jedn()}</small></b><em>zmienisz go w ustawieniach</em></div>
      </div>
      <div class="karta"><h2>Ostatnie testy</h2>
        ${testy.length ? `<table class="tabela"><thead><tr><th>Kiedy</th><th>Czas</th><th class="l">Prędkość</th><th class="l">Dokładność</th></tr></thead><tbody>
          ${testy.map(x => `<tr><td>${new Date(x.t).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>${minTxt(x.s)}</td><td class="l">${pr(x.zn)} ${jedn()}</td><td class="l">${String(x.dok).replace('.', ',')}%</td></tr>`).join('')}</tbody></table>`
          : '<p class="drobne">Nie masz jeszcze żadnego testu. Pierwszy warto zrobić już teraz, żeby mieć punkt odniesienia.</p>'}
      </div>`;
  };

  /* ================= Widok: Statystyki ================= */
  const SVGNS = 'http://www.w3.org/2000/svg';
  function wykres(host, dane, o) {
    if (dane.length < 2) { host.innerHTML = '<p class="pusto">Wykres pojawi się po kilku ćwiczeniach.</p>'; return; }
    const W = Math.max(320, Math.round(host.clientWidth) || 640), H = 210, ml = 40, mr = 54, mt = 14, mb = 24, pw = W - ml - mr, ph = H - mt - mb;
    const ys = dane.map(d => d.y).concat(o.odn ? [o.odn.y] : []);
    let lo = o.min != null ? Math.min(o.min, Math.floor(Math.min(...ys))) : 0, hi = o.max != null ? o.max : Math.max(...ys) * 1.1;
    const krok = [1, 2, 5, 10, 20, 25, 50, 100, 200].find(k => (hi - lo) / k <= 4) || 500;
    lo = Math.floor(lo / krok) * krok; hi = Math.max(lo + krok, Math.ceil(hi / krok) * krok);
    if (o.max != null) hi = Math.min(hi, o.max);
    const X = i => ml + (dane.length === 1 ? pw / 2 : i / (dane.length - 1) * pw), Y = v => mt + ph - (v - lo) / (hi - lo) * ph;
    const linia = dane.map((d, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(d.y).toFixed(1)).join(' ');
    let siatka = '';
    for (let v = lo; v <= hi + 0.001; v += krok) siatka += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}" class="${v === lo ? 'os' : 'siatka'}"/><text x="${ml - 8}" y="${Y(v) + 4}" class="tik" text-anchor="end">${v}${o.suf || ''}</text>`;
    const ost = dane[dane.length - 1];
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="wykres" role="img" aria-label="${esc(o.opis)}">
      ${siatka}
      ${o.odn ? `<line x1="${ml}" x2="${W - mr}" y1="${Y(o.odn.y)}" y2="${Y(o.odn.y)}" class="odn"/><text x="${ml + 6}" y="${Y(o.odn.y) - 5}" class="tik">${esc(o.odn.etyk)}</text>` : ''}
      <path d="${linia} L${X(dane.length - 1)} ${Y(lo)} L${X(0)} ${Y(lo)} Z" class="pole" style="fill:${o.kolor}"/>
      <path d="${linia}" class="linia" style="stroke:${o.kolor}"/>
      <text x="${ml}" y="${H - 6}" class="tik">${esc(dane[0].x)}</text>
      <text x="${W - mr}" y="${H - 6}" class="tik" text-anchor="end">${esc(ost.x)}</text>
      <line class="celownik" x1="0" x2="0" y1="${mt}" y2="${mt + ph}" visibility="hidden"/>
      <circle class="kropka" r="5" cx="${X(dane.length - 1)}" cy="${Y(ost.y)}" style="fill:${o.kolor}"/>
      <text x="${X(dane.length - 1) + 10}" y="${Y(ost.y) + 5}" class="etykieta">${(o.krotko || o.fmt)(ost.y)}</text>
      <rect x="${ml}" y="${mt}" width="${pw}" height="${ph}" fill="transparent" class="lapacz"/>
    </svg>`;
    const svg = $('svg', host), cel = $('.celownik', svg), kr = $('.kropka', svg);
    const ruch = e => {
      const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
      const i = ogr(Math.round((x - ml) / pw * (dane.length - 1)), 0, dane.length - 1), d = dane[i];
      cel.setAttribute('x1', X(i)); cel.setAttribute('x2', X(i)); cel.setAttribute('visibility', 'visible');
      kr.setAttribute('cx', X(i)); kr.setAttribute('cy', Y(d.y));
      pokazDymek('<b>' + o.fmt(d.y) + '</b><br>' + esc(d.opis), r.left + X(i) / W * r.width, r.top + Y(d.y) / H * r.height);
    };
    $('.lapacz', svg).addEventListener('pointermove', ruch);
    $('.lapacz', svg).addEventListener('pointerdown', ruch);
    $('.lapacz', svg).addEventListener('pointerleave', () => {
      cel.setAttribute('visibility', 'hidden'); kr.setAttribute('cx', X(dane.length - 1)); kr.setAttribute('cy', Y(ost.y)); ukryjDymek();
    });
  }
  // Statystyki fizycznego klawisza: suma po wszystkich znakach, które z niego powstają
  function statKlawisza(k) {
    let n = 0, bl = 0, t = 0, tn = 0;
    const znaki = k.kod === 'Space' ? [' '] : [k.m, k.d, k.pl, k.pl && k.pl.toUpperCase()].filter(Boolean);
    for (const c of znaki) { const s = S.klawisze[c]; if (!s) continue; n += s.n; bl += (1 - s.d) * s.n; if (s.tn) { t += s.t * s.tn; tn += s.tn; } }
    return n >= 8 ? { n, blad: bl / n, ms: tn ? t / tn : null } : null;
  }
  let trybMapy = 'bledy';
  RYSUJ.staty = function () {
    const ses = S.sesje.filter(x => x.typ !== 'gra' && x.typ !== 'start' && x.n >= 30).slice(-60);
    const sumaS = Object.values(S.dni).reduce((a, d) => a + d.s, 0), sumaZn = Object.values(S.dni).reduce((a, d) => a + d.zn, 0);
    const sr = srednie();
    // palce
    const palce = [0, 1, 2, 3, 6, 7, 8, 9].map(p => {
      let n = 0, bl = 0;
      for (const [c, s] of Object.entries(S.klawisze)) { const z = DZ.ZNAK[c]; if (z && z.p === p && c !== ' ') { n += s.n; bl += s.b; } }
      return { p, n, blad: n ? bl / n : 0 };
    });
    const maxBl = Math.max(0.1, ...palce.map(x => x.blad));
    const pom = Object.entries(S.pomylki).filter(([k, n]) => n >= 2 && k[0] !== ' ' && k[1] !== ' ').sort((a, b) => b[1] - a[1]).slice(0, 8);
    // kalendarz: 14 tygodni, od poniedziałku
    const dzis = new Date(); dzis.setHours(12, 0, 0, 0);
    const pocz = new Date(dzis); pocz.setDate(pocz.getDate() - ((pocz.getDay() + 6) % 7) - 13 * 7);
    let kal = '';
    for (let i = 0; i < 14 * 7; i++) {
      const d = new Date(pocz); d.setDate(d.getDate() + i);
      if (d > dzis) { kal += '<i class="pusty"></i>'; continue; }
      const s = (S.dni[dataKlucz(d)] || {}).s || 0, cel = S.ust.celDzienny * 60;
      const st = !s ? 0 : s < cel / 3 ? 1 : s < cel * 2 / 3 ? 2 : s < cel ? 3 : 4;
      kal += `<i class="k${st}" data-dymek="${d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' })}: ${s ? minTxt(s) : 'bez ćwiczeń'}"></i>`;
    }

    $('#w-staty').innerHTML = `
      <div class="naglowek-widoku"><div><h1>Statystyki</h1>
        <p class="lead">Liczby nie kłamią: zobacz, jak rośnie prędkość, które klawisze kuleją i jak regularnie ćwiczysz.</p></div></div>
      <div class="kafle">
        <div class="kafel"><span>Prędkość teraz</span><b>${sr ? pr(sr.zn) : '–'}<small>${jedn()}</small></b><em>${S.start && sr ? 'start: ' + pr(S.start.zn) + ' (' + delta(sr.zn - S.start.zn) + ')' : 'średnia z 10 ostatnich ćwiczeń'}</em></div>
        <div class="kafel"><span>Dokładność teraz</span><b>${sr ? proc(sr.dok) : '–'}</b><em>średnia z 10 ostatnich ćwiczeń</em></div>
        <div class="kafel"><span>Czas ćwiczeń</span><b>${sumaS ? minTxt(sumaS) : '–'}</b><em>${sumaZn.toLocaleString('pl-PL')} napisanych znaków</em></div>
        <div class="kafel"><span>Seria</span><b>${seria()}<small>${dni(seria())}</small></b><em>${Object.values(S.dni).filter(d => d.s >= 60).length} dni z ćwiczeniami łącznie</em></div>
      </div>
      <div class="dwa">
        <div class="karta"><h2>Prędkość</h2><p class="drobne">${jedn()} w kolejnych ćwiczeniach (lekcje, trening, testy)</p><div id="wPred"></div></div>
        <div class="karta"><h2>Dokładność</h2><p class="drobne">procent trafień za pierwszym razem</p><div id="wDok"></div></div>
      </div>
      <div class="karta">
        <div class="wiersz miedzy"><div><h2>Mapa klawiatury</h2><p class="drobne" id="mapaOpis"></p></div>
          <div class="segment" id="mapaTryb"><button data-t="bledy">Pomyłki</button><button data-t="czas">Czas reakcji</button></div></div>
        <div class="klaw-wrap statyczna" id="mapaKlaw"></div>
        <div class="legenda-skali"><span id="skalaOd"></span><i class="c1"></i><i class="c2"></i><i class="c3"></i><i class="c4"></i><i class="c5"></i><span id="skalaDo"></span><span class="brak-danych"><i></i>za mało danych</span></div>
      </div>
      <div class="dwa">
        <div class="karta"><h2>Palce</h2><p class="drobne">odsetek pomyłek na klawiszach każdego palca</p>
          <div class="slupki">${palce.map(x => `<div class="slupek" data-dymek="${DZ.PALCE[x.p].nazwa}: ${x.n ? (x.blad * 100).toFixed(1).replace('.', ',') + '% pomyłek na ' + x.n + ' uderzeń' : 'brak danych'}">
            <span class="sl-nazwa"><i class="kolor p${x.p}"></i>${DZ.PALCE[x.p].nazwa}</span>
            <span class="sl-tor"><i style="width:${x.n ? Math.max(1, x.blad / maxBl * 100) : 0}%"></i><b>${x.n ? (x.blad * 100).toFixed(1).replace('.', ',') + '%' : '–'}</b></span></div>`).join('')}</div>
        </div>
        <div class="karta"><h2>Najczęstsze pomyłki</h2><p class="drobne">który klawisz naciskasz zamiast właściwego</p>
          ${pom.length ? `<ul class="pomylki">${pom.map(([k, n]) => `<li><span>zamiast</span><kbd class="p${(DZ.ZNAK[k[0]] || {}).p}">${esc(k[0])}</kbd><span>wpisujesz</span><kbd class="p${(DZ.ZNAK[k[1]] || { p: 'x' }).p}">${esc(k[1])}</kbd><b>${n}×</b></li>`).join('')}</ul>`
            : '<p class="pusto">Powtarzające się pomyłki pojawią się tu po kilku ćwiczeniach.</p>'}
        </div>
      </div>
      <div class="karta"><h2>Regularność</h2><p class="drobne">ostatnie 14 tygodni, każdy kwadrat to jeden dzień</p>
        <div class="kalendarz">${kal}</div>
        <div class="legenda-skali"><span>bez ćwiczeń</span><i class="k0"></i><i class="k1"></i><i class="k2"></i><i class="k3"></i><i class="k4"></i><span>cel dzienny wykonany</span></div>
      </div>
      <details class="karta"><summary>Tabela ostatnich ćwiczeń</summary>
        ${ses.length ? `<table class="tabela"><thead><tr><th>Kiedy</th><th>Rodzaj</th><th class="l">Znaki</th><th class="l">Prędkość</th><th class="l">Dokładność</th></tr></thead><tbody>
        ${ses.slice(-25).reverse().map(x => `<tr><td>${new Date(x.t).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td><td>${TYPY[x.typ]}</td><td class="l">${x.n}</td><td class="l">${pr(x.zn)} ${jedn()}</td><td class="l">${String(x.dok).replace('.', ',')}%</td></tr>`).join('')}</tbody></table>` : '<p class="pusto">Brak danych.</p>'}
      </details>`;

    const pkt = (x, i, y) => ({ x: dataTxt(x.t), y, opis: TYPY[x.typ] + ', ' + new Date(x.t).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) });
    wykres($('#wPred'), ses.map((x, i) => pkt(x, i, pr(x.zn))), { kolor: 'var(--seria-1)', krotko: v => Math.round(v), fmt: v => Math.round(v) + ' ' + jedn(), opis: 'Prędkość pisania w kolejnych ćwiczeniach',
      odn: S.start ? { y: pr(S.start.zn), etyk: 'punkt startowy: ' + pr(S.start.zn) } : null });
    wykres($('#wDok'), ses.map((x, i) => pkt(x, i, x.dok)), { kolor: 'var(--seria-2)', fmt: v => String(Math.round(v * 10) / 10).replace('.', ',') + '%', min: 90, max: 100, suf: '%', opis: 'Dokładność w kolejnych ćwiczeniach' });

    const mapa = new DZ.Klawiatura($('#mapaKlaw'), { mala: true });
    const rysujMape = () => {
      $$('#mapaTryb button').forEach(b => b.classList.toggle('akt', b.dataset.t === trybMapy));
      const bl = trybMapy === 'bledy', celMs = 60000 / S.ust.celPredkosci;
      $('#mapaOpis').textContent = bl ? 'im ciemniejszy klawisz, tym częściej się na nim mylisz' : 'im ciemniejszy klawisz, tym dłużej go szukasz';
      $('#skalaOd').textContent = bl ? 'do 2% pomyłek' : 'w tempie celu';
      $('#skalaDo').textContent = bl ? 'ponad 12%' : 'ponad 3× wolniej';
      mapa.cieplo(k => {
        if (k.p == null || (k.spec && k.kod !== 'Space')) return null;
        const s = statKlawisza(k);
        if (!s || (!bl && !s.ms)) return null;
        const st = bl ? (s.blad <= 0.02 ? 1 : s.blad <= 0.04 ? 2 : s.blad <= 0.07 ? 3 : s.blad <= 0.12 ? 4 : 5)
          : (s.ms <= celMs ? 1 : s.ms <= celMs * 1.5 ? 2 : s.ms <= celMs * 2.2 ? 3 : s.ms <= celMs * 3 ? 4 : 5);
        const nazwa = k.kod === 'Space' ? 'Spacja' : (k.d || '').toUpperCase() === k.d && /[A-Z]/.test(k.d) ? k.d : k.m;
        return { tlo: 'var(--c' + st + ')', tekst: 'var(--ci' + st + ')',
          opis: nazwa + ': ' + (s.blad * 100).toFixed(1).replace('.', ',') + '% pomyłek' + (s.ms ? ', ' + Math.round(s.ms) + ' ms (' + pr(60000 / s.ms) + ' ' + jedn() + ')' : '') + '\n' + s.n + ' uderzeń' };
      });
    };
    $$('#mapaTryb button').forEach(b => b.onclick = () => { trybMapy = b.dataset.t; rysujMape(); });
    rysujMape();
  };

  /* ================= Widok: Poradnik ================= */
  let poradnikGotowy = false;
  RYSUJ.poradnik = function () {
    if (poradnikGotowy) return;
    poradnikGotowy = true;
    new DZ.Klawiatura($('#porKlaw'), { mala: true, dlonie: true });
    $('#porLegenda').innerHTML = [0, 1, 2, 3, 6, 7, 8, 9].map(p => `<span><i class="kolor p${p}"></i>${DZ.PALCE[p].nazwa}</span>`).join('') + '<span><i class="kolor p4"></i>kciuki</span>';
  };

  /* ================= Widok: Ustawienia ================= */
  RYSUJ.ustawienia = function () {
    const seg = (klucz, opcje) => `<div class="segment" data-ust="${klucz}">${opcje.map(([v, t]) => `<button data-v="${v}" class="${String(S.ust[klucz]) === String(v) ? 'akt' : ''}">${t}</button>`).join('')}</div>`;
    const w = (tyt, opis, kontrolka) => `<div class="ust-wiersz"><div><b>${tyt}</b><span>${opis}</span></div>${kontrolka}</div>`;
    $('#w-ustawienia').innerHTML = `
      <div class="naglowek-widoku"><div><h1>Ustawienia</h1></div></div>
      <div class="karta ust">
        <h2>Nauka</h2>
        ${w('Po pomyłce', 'W nauce najlepiej, gdy kursor czeka na właściwy klawisz. Testy zawsze działają z poprawianiem.', seg('poBledzie', [['blokuj', 'Kursor czeka'], ['swobodny', 'Piszę dalej i poprawiam']]))}
        ${w('Klawiatura na ekranie', 'Z czasem przejdź na same kolory, a potem ją ukryj.', seg('klaw', [['pelna', 'Z podpowiedziami'], ['kolory', 'Same kolory'], ['ukryta', 'Ukryta']]))}
        ${w('Dłonie pod klawiaturą', 'Pokazują, którym palcem nacisnąć klawisz.', seg('dlonie', [[true, 'Widać'], [false, 'Ukryte']]))}
        ${w('Cel dzienny', 'Ile minut chcesz ćwiczyć każdego dnia.', seg('celDzienny', [[10, '10 min'], [15, '15 min'], [20, '20 min'], [30, '30 min']]))}
        ${w('Docelowa prędkość', 'Do niej odnosi się „opanowanie” liter i mapa klawiatury.', seg('celPredkosci', [[150, pr(150)], [200, pr(200)], [250, pr(250)], [300, pr(300)], [400, pr(400)]]))}
        ${w('Wszystkie lekcje odblokowane', 'Włącz, jeśli część klawiatury już znasz i chcesz zacząć od środka.', seg('odblokuj', [[false, 'Po kolei'], [true, 'Odblokowane']]))}
      </div>
      <div class="karta ust">
        <h2>Wygląd i dźwięk</h2>
        ${w('Jednostka prędkości', 'Znaki na minutę są w Polsce standardem. Słowa na minutę (WPM) to znaki podzielone przez 5.', seg('jednostka', [['zn', 'zn./min'], ['wpm', 'słów/min']]))}
        ${w('Rozmiar tekstu ćwiczeń', '', seg('rozmiar', [['s', 'Mały'], ['m', 'Średni'], ['l', 'Duży']]))}
        ${w('Motyw', '', seg('motyw', [['auto', 'Jak w systemie'], ['light', 'Jasny'], ['dark', 'Ciemny']]))}
        ${w('Dźwięki klawiszy', 'Ciche stuknięcie przy trafieniu i niższy ton przy pomyłce.', seg('dzwiek', [[true, 'Włączone'], [false, 'Wyłączone']]))}
      </div>
      <div class="karta ust">
        <h2>Twoje dane</h2>
        <p class="drobne">Postępy są zapisane tylko w tej przeglądarce. Nic nie jest wysyłane do internetu.</p>
        <div class="wiersz">
          <button class="przycisk" id="uEksport">Pobierz kopię postępów</button>
          <button class="przycisk" id="uImport">Wczytaj kopię</button>
          <button class="przycisk grozny" id="uReset">Usuń wszystkie postępy</button>
          <input type="file" id="uPlik" accept="application/json,.json" hidden>
        </div>
      </div>`;
    $$('#w-ustawienia .segment button').forEach(b => b.onclick = () => {
      const k = b.parentElement.dataset.ust, v = b.dataset.v;
      S.ust[k] = v === 'true' ? true : v === 'false' ? false : /^\d+$/.test(v) ? +v : v;
      zapisz(); zastosujUst(); RYSUJ.ustawienia();
    });
    $('#uEksport').onclick = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(S)], { type: 'application/json' }));
      a.download = 'dziesiatka-postepy-' + dzisK() + '.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    };
    $('#uImport').onclick = () => $('#uPlik').click();
    $('#uPlik').onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      f.text().then(t => {
        const d = JSON.parse(t);
        if (!d || !d.ust || !d.lekcje || !Array.isArray(d.sesje)) throw new Error('zły plik');
        S = { ...nowyStan(), ...d, ust: { ...UST, ...d.ust } };
        zapisz(); zastosujUst(); pokaz('dzis'); toast('Postępy wczytane.');
      }).catch(() => toast('Nie udało się wczytać tego pliku. To nie wygląda na kopię postępów z Dziesiątki.'));
    };
    $('#uReset').onclick = () => modal(`<h2>Usunąć wszystkie postępy?</h2><p>Znikną ukończone lekcje, statystyki klawiszy, historia ćwiczeń i rekordy. Tego nie da się cofnąć.</p>
      <div class="wiersz"><button class="przycisk" id="mNie" data-fokus>Zostaw</button><button class="przycisk grozny" id="mTak">Usuń</button></div>`, m => {
      $('#mNie', m).onclick = zamknijModal;
      $('#mTak', m).onclick = () => { const ust = S.ust; S = nowyStan(); S.ust = { ...ust, odblokuj: false }; S.powitany = true; zapisz(); zamknijModal(); pokaz('dzis'); toast('Postępy usunięte. Zaczynasz od początku.'); };
    });
  };

  /* ================= Gra ================= */
  RYSUJ.gra = function () { DZ.gra.menu(); };
  function graInit() {
    DZ.gra.init({
      aktywny: () => widok === 'gra' && $('#modal').hidden,
      rekord: () => S.graRekord,
      wszystkie: () => S.ust.graWszystkie,
      ustawWszystkie: v => { S.ust.graWszystkie = v; zapisz(); },
      ileLiter: () => znaneLitery().length,
      slowa: () => {
        const lit = S.ust.graWszystkie ? [...DZ.LITERY_WSZYSTKIE] : znaneLitery(), D = new Set(lit);
        let sl = DZ.gen.slowa(D, 2).filter(x => x.length <= 10);
        if (sl.length < 40) { const p = new Set(sl); for (let i = 0; i < 300 && p.size < 60; i++) p.add(DZ.gen.pseudo(lit, D, 2 + Math.floor(Math.random() * 3))); sl = [...p]; }
        return sl;
      },
      naKoniec: w => {
        const rek = w.punkty > S.graRekord;
        if (rek) S.graRekord = w.punkty;
        if (w.czas >= 10) {
          S.sesje.push({ t: Date.now(), typ: 'gra', zn: Math.round(w.znMin), dok: Math.round(w.dok * 1000) / 10, s: Math.round(w.czas), n: w.znaki });
          const d = dzien(); d.s += Math.round(w.czas); d.zn += w.znaki;
        }
        zapisz(); odswiezGore();
        return rek;
      },
      fmt: zn => pr(zn) + ' ' + jedn()
    });
  }

  /* ================= Powitanie ================= */
  function powitanie() {
    const slajdy = [
      `<p class="nadtytul">Dziesiątka</p><h2>Od dwóch palców do dziesięciu</h2>
       <p>Nauczysz się pisać bez patrzenia na klawiaturę: szybko, równo i z małą liczbą błędów. Wystarczy kwadrans dziennie.</p>
       <ul class="pow-lista"><li><b>34 krótkie lekcje</b> – od klawiszy F i J po polskie znaki, cyfry i symbole</li>
       <li><b>Klawiatura na ekranie</b> pokazuje klawisz i palec, więc nie musisz patrzeć w dół</li>
       <li><b>Trening inteligentny</b> sam znajduje Twoje słabe litery</li></ul>`,
      `<p class="nadtytul">Zasada numer jeden</p><h2>Palce mają swój dom</h2>
       <p>Połóż lewą dłoń na <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> <kbd>F</kbd>, a prawą na <kbd>J</kbd> <kbd>K</kbd> <kbd>L</kbd> <kbd>;</kbd>. Na F i J wyczujesz małe wypustki. Kciuki nad spacją.</p>
       <div class="klaw-wrap statyczna" id="powKlaw"></div>
       <p class="drobne">Każdy kolor to jeden palec. Od teraz patrzysz tylko na ekran.</p>`,
      `<p class="nadtytul">Zanim zaczniesz</p><h2>Zmierzmy punkt startowy</h2>
       <p>Napisz przez minutę tak, jak piszesz dziś – po swojemu, nawet dwoma palcami. Wynik zostanie zapisany, żeby za kilka tygodni było widać różnicę.</p>
       <p class="drobne">Uprzedzam: przez pierwsze dni nowa technika będzie wolniejsza od starej. To normalny etap, nie krok wstecz.</p>`
    ];
    let i = 0;
    const rysuj = () => modal(`<div class="powitanie">${slajdy[i]}
      <div class="pow-dol"><span class="kropki">${slajdy.map((s, j) => `<i class="${j === i ? 'akt' : ''}"></i>`).join('')}</span>
      <div class="wiersz">${i === 2 ? '<button class="przycisk" id="powPomin">Pomiń pomiar</button>' : ''}
      <button class="przycisk glowny" id="powDalej" data-fokus>${i === 2 ? 'Zmierz minutę' : 'Dalej'}</button></div></div></div>`, m => {
      if (i === 1) new DZ.Klawiatura($('#powKlaw', m), { mala: true, dlonie: true });
      $('#powDalej', m).onclick = () => {
        if (i < 2) { i++; rysuj(); return; }
        S.powitany = true; zapisz(); startTest(1, true);
      };
      const p = $('#powPomin', m);
      if (p) p.onclick = () => { S.powitany = true; zapisz(); zamknijModal(); pokaz('dzis'); };
    });
    rysuj();
  }

  /* ================= Start ================= */
  zastosujUst();
  arenaInit();
  graInit();
  $$('[data-widok]').forEach(b => b.addEventListener('click', () => pokaz(b.dataset.widok)));
  $('#logo').onclick = () => pokaz('dzis');
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden && S.powitany) zamknijModal(); });
  window.addEventListener('beforeunload', zapisz);
  pokaz('dzis');
  if (!S.powitany) powitanie();

  DZ.app = { stan: () => S, pokaz, startLekcja, startTrening, startTest };
})();
