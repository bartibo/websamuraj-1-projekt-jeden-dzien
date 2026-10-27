'use strict';
/* =====================================================================
   Pod jedną żarówką – logika sprawy: ustawienia, narzędzia, przybycie
   patrolu, zakończenia i karta zgłoszenia. Silnik (js/game.js) woła
   hooki obiektu CASE.
   ===================================================================== */

const CASE = {
  id: 'zarowka',
  start: 23 * 60 + 41, date: '26.10.2026', nextDate: '27.10.2026',
  phone: '+48 607 413 220', incident: 'KAL/2026/10/26/1187',
  hq: [241, 652], etaFirst: 2.5, parTime: 22,
  battery: 42, health: 64, stress: 80, bulb: 'on',
  mapTitle: 'Kalnów – fragment miasta',
  target: 'slodowa14',
  anyContact: ['wyjazd', 'wywozi', 'syreny', 'polnoc', 'powrot', 'alarm_dom', 'alarm_powrot'],
  chronoCats: ['miejsce', 'tozsamosc', 'sprawca', 'wniosek'],
  labels: {
    target: 'Interwencja pod adresem', recon: 'Rekonesans ulicy (obserwacja z radiowozu)', pick: '— wybierz adres albo ulicę —',
    go: 'Wyślij patrol pod ten adres', reconBtn: 'Rekonesans', candidate: 'Wybierz jako kandydatkę', chosen: '● wybrana kandydatka',
    rejected: 'wykluczona', victim: 'Poszkodowana', mapHint: 'Kliknij budynek z numerem, żeby zobaczyć dane z ewidencji i sprawdzić, czy pasuje do poszlak.',
  },

  intro: {
    kicker: 'Centrum Powiadamiania Ratunkowego · Kalnów · nocna zmiana',
    lead: ['Jest 23:41. Za chwilę odbierzesz zgłoszenie, w którym nikt nic nie mówi. Ktoś tylko pisze, szeptem palców po ekranie: dziewczyna zamknięta w piwnicy, z jedną żarówką nad głową, która nie pamięta nawet własnego imienia.',
      'Masz tylko czat, bazy danych, mapę miasta i jeden radiowóz. Ona ma telefon z kończącą się baterią.'],
    shift: '26.10.2026 · 19:00 – 07:00',
    warn: 'Gra porusza temat uprowadzenia, przemocy (bez drastycznych opisów), urazu i strachu.',
    image: 'sprawy/zarowka/intro.jpg',
  },

  /* stan właściwy dla tej sprawy */
  state: () => ({ perp: 'home', perpSuspicious: false, perpReturnAt: 48, perpMoveAt: null, perpFate: null,
    alarm: false, alarmAt: 0, moved: false, movedAt: 0, rain: false, asthma: false, olaDet: -1 }),

  healthDrain() {
    let hd = 0.35;
    if (S.asthma) hd += 0.9 * (has('oddech_instr') ? 0.5 : 1) * (S.stress > 80 ? 1.4 : 1);
    if (!has('cieplo') && S.t > 25) hd += 0.2;
    if (S.rain && !has('cieplo')) hd += 0.15;
    if (!has('czuwa') && S.health < 35) hd += 0.3;
    return hd;
  },
  altLight: () => has('zapalniczka'),
  altLightName: 'zapalniczka',
  altLightMsg: 'zapalam zapalniczkę. trochę widać',

  callerName: () => S.identity ? 'Maja Sikorska' : (has('majka') ? '„Majka”?' : 'NN · kobieta'),
  callerNum: () => CASE.phone + (has('sim') ? ' · Fundacja Psia Przystań' : ''),
  healthKnown: () => has('glowa'),
  kwal: () => has('schody') || has('zagrozenie') ? '189 KK · OSOBA RANNA' : 'DO USTALENIA',
  statusItems: () => [`AML: <b class="${S.phase === 'ring' ? '' : 'alr'}">BRAK FIX</b>`, `BTS: <b>${has('bts') ? 'KAL-04 · S-NE' : '—'}</b>`],

  /* Co wiadomo o adresie: 'confirmed' (patrol widział), 'probable' (poszlaki wskazują Słodową 14), null */
  addrLevel() {
    if (has('potwierdzony') || has('swiatlo') || S.rescued || S.escaped) return 'confirmed';
    if (['ewid_marek', 'ewid_henryk', 'sasiedzi', 'sasiadka', 'w_hw'].some(has)) return 'probable';
    const d = deducedBuilding();
    return d && d.id === 'slodowa14' ? 'probable' : null;
  },
  locText(al, cand) {
    if (al === 'confirmed') return 'ul. Słodowa 14 (potwierdzona)';
    if (al === 'probable') return 'prawdopodobnie ul. Słodowa 14';
    if (activeGeo().length >= 2 && cand.length >= 2 && cand.length <= 4) return `${cand.length} pasujące budynki`;
    if (has('adres_ppe')) return 'jeden z 3 adresów licznika';
    if (has('bts')) return 'sektor NE, KAL-04 (~1,2 km)';
    return 'nieustalona';
  },
  buildingInfo(b) {
    const typeName = { dom: 'dom jednorodzinny', kamienica: 'kamienica', blok: 'blok mieszkalny', obiekt: 'obiekt użytkowy' }[b.type];
    return `${typeName}, ${b.year} r. · ogrzewanie: ${esc(b.heating)} · piwnica: ${b.basement ? 'tak' : 'nie'} · prąd: ${b.power ? 'tak' : 'nie'}`;
  },

  protocol: () => [
    ['Lokalizacja przybliżona', has('bts') || has('pociag') || has('slod') || has('dzwon') || has('adres_ppe')],
    ['Lokalizacja dokładna', !!addrLevel()],
    ['Co się stało', has('schody') || has('zagrozenie')],
    ['Stan poszkodowanej', has('glowa')],
    ['Zagrożenie na miejscu', has('zagrozenie')],
    ['Tożsamość', S.identity],
    ['Sprawca ustalony', ['krs', 'ewid_marek', 'straznik', 'siostra', 'w_marek'].some(has) || S.perpFate === 'arrested'],
    ['Policja zadysponowana', !!S.order],
    ['ZRM zadysponowany', S.zrmSent],
  ],
  card() {
    const perp = ['ewid_marek', 'straznik', 'siostra', 'w_marek'].some(has) ? 'prawdopodobnie Marek Wróbel (prezes fundacji)' : has('krs') ? 'możliwy związek: Marek Wróbel?' : has('sms') ? '„Marek”, właściciel telefonu' : has('glos') ? 'mężczyzna, spokojny głos' : 'nieznany';
    const health = [has('glowa') && 'uraz głowy, niepamięć', has('oddech') && 'duszność (astma?)', has('zimno') && 'wychłodzenie', has('rozpuszczalnik') && S.mistakes.some(m => m.includes('rozpuszczalnik')) && 'oparzenie chemiczne jamy ustnej'].filter(Boolean).join('; ') || '—';
    const ident = S.identity ? 'Maja Sikorska, ur. 2007, ul. Kasztanowa 3/7' : [has('wlosy') && 'rude włosy', has('twarz') && 'ok. 18–22 l.', has('tatuaz') && 'tatuaż łapki', has('bransoletka') && 'bransoletka M&O', has('bluza') && 'bluza Psia Przystań', has('majka') && 'imię: Majka?'].filter(Boolean).join(', ') || 'NN';
    return [
      ['Telefon', CASE.phone + (has('sim') ? '<br>abonent: Fundacja Psia Przystań' : ''), true],
      ['Rodzaj', has('schody') || has('zagrozenie') ? 'pozbawienie wolności (art. 189 kk), osoba ranna' : 'do ustalenia'],
      ['Poszkodowana', ident], ['Stan', health], ['Miejsce', $('#caller-loc').textContent], ['Sprawca', perp],
      ['Kandydatka', S.candidate ? S.candidate.name + (S.identity ? ' ✓' : ' (do weryfikacji)') : '—'],
    ];
  },

  /* ---------- początek rozmowy ---------- */
  async opening() {
    await opSay('112, Centrum Powiadamiania Ratunkowego. Słucham?');
    await wait(900);
    await sys('Kanał głosowy: brak mowy. Słychać przyspieszony oddech i szum.');
    await opSay('Halo? Proszę się odezwać.');
    await wait(900);
    await sys('Rozmówca przerwał połączenie głosowe. Przyszła wiadomość w kanale tekstowym 112.');
    await her(['pomocy', 'jestem zamknięta w piwnicy', 'nie mogę mówić głośno. ktoś jest na górze', 'i nie wiem kim jestem. nic nie pamiętam']);
    await sys('Kanał tekstowy aktywny. AML: brak pozycji GPS. Telemetria baterii: 42%.');
    await decide({
      title: 'Pierwsza odpowiedź', text: 'Od pierwszego zdania zależy, czy ona ci zaufa.', timer: null,
      options: [
        { label: 'Jestem z tobą i pomogę ci. Czy jesteś teraz bezpieczna? Czy ktoś jest blisko?', async run() {
            await opSay('Jestem z tobą i pomogę ci. Czy jesteś teraz bezpieczna? Czy ktoś jest blisko?');
            flag('zagrozenie'); dS(-8); good('Spokojne otwarcie rozmowy, pytanie o zagrożenie');
            await her(['on jest na górze. chyba. słyszę telewizor', 'drzwi są zamknięte od zewnątrz', 'dobrze że ktoś odpisał']); } },
        { label: 'Gdzie dokładnie jesteś? Podaj adres albo cokolwiek, co widzisz.', async run() {
            await opSay('Gdzie dokładnie jesteś? Podaj adres albo cokolwiek, co widzisz.');
            dS(+4); S.defer = [];
            clue('piwnica');
            await her(['nie wiem!! piszę że nie wiem', 'piwnica. jedna żarówka. ceglane ściany']); flushDefer(); } },
        { label: 'Spokojnie. Jak się nazywasz? Ile masz lat?', async run() {
            await opSay('Spokojnie. Jak się nazywasz? Ile masz lat?');
            dS(+7);
            await her(['nie wiem. nie pamiętam. to jest najgorsze', 'chyba jestem młoda?']); } },
      ],
    });
  },

  /* ---------- patrol na miejscu ---------- */
  async arrive(b) {
    if (b.id !== 'slodowa14') return false;
    await arriveCorrect();
    return true;
  },
  async onRecon(street) {
    if (street === 'slodowa' && S.contact === 'active') await sys('Patrol stoi na Słodowej. W zakładce „Polecenia” możesz poprosić ją o sygnał światłem.');
  },
  async onCandidate(m) {
    await sys(`Kandydatka do weryfikacji: ${m.name}, ${m.age} l. Zapytaj ją o to (zakładka „Ona”) albo zadzwoń do zgłaszającego.`);
  },

  /* ---------- koniec ---------- */
  endingCode() {
    if (S.escaped) return 'E4';
    if (S.rescued) {
      if (S.lostAt != null && S.lostAt < S.rescueT) return 'E5';
      if (!S.identity) return 'E3';
      return S.perpFate === 'arrested' ? 'E1' : 'E2';
    }
    return (S.lostReason === 'sprawca' || S.moved) ? 'E7' : 'E6';
  },
  scoreExtra() {
    let p = 0;
    if (S.identity) p += 14;
    if (S.perpFate === 'arrested') p += 9;
    const med = ['ucisk', 'czuwa', 'oddech_instr', 'inhalator', 'cieplo', 'butelka'].filter(f => has(f) && !(f === 'butelka' && S.mistakes.some(m => m.includes('rozpuszczalnik')))).length;
    return p + med * 1.5;
  },
  finalMistakes() {
    if (S.lostReason === 'bateria' && !has('dim')) mistake('Nie oszczędzano baterii (polecenie przyciemnienia ekranu)');
    if (S.lostReason === 'omdlenie') {
      if (!has('oddech_instr') && !has('inhalator')) mistake('Brak pomocy przy duszności');
      if (!has('czuwa')) mistake('Nie polecono jej czuwać mimo urazu głowy');
    }
  },
  /* kolejność w „Co umknęło”: najpierw brakujący cel; 9 = pomiń */
  missedPrio(cat) {
    const locDone = S.rescued || S.escaped || addrLevel();
    return cat === 'tozsamosc' ? (S.identity ? 9 : 0) : cat === 'miejsce' ? (locDone ? 9 : 1) : 2;
  },
  stats: () => [
    ['Tożsamość', S.identity ? 'ustalona' : 'nieustalona'],
    ['Sprawca', S.perpFate === 'arrested' ? 'zatrzymany' : (S.rescued || S.escaped) ? 'zbiegł' : 'nieznany'],
  ],
  epilogue(code) { return epilogue(code); },
};

/* =====================================================================
   NARZĘDZIA (BAZY)
   ===================================================================== */
const TOOLS = [
  { id: 'aml', name: 'Lokalizacja AML / BTS', desc: 'Pozycja z telefonu (AML) i stacja bazowa, do której jest zalogowany.', cost: 2, once: true,
    async run() { clue('bts'); return 'AML: brak współrzędnych GPS (telefon nie ma pozycji, prawdopodobnie jest pod ziemią).\nBTS: stacja KAL-04, sektor 15°–75° (północny wschód), szacowany zasięg do 1,2 km.\nNa mapie dodano nakładkę sektora.'; } },
  { id: 'hlr', name: 'Abonent numeru', desc: 'Zapytanie do operatora sieci komórkowej: na kogo jest zarejestrowany numer.', cost: 3, once: true,
    async run() { clue('sim'); return `Numer ${CASE.phone}.\nAbonent: FUNDACJA PSIA PRZYSTAŃ, ul. Polna 40, Kalnów (umowa firmowa, 3 karty SIM).\nUżytkownik karty: nie wskazano.`; } },
  { id: 'krs', name: 'Rejestr fundacji (KRS)', desc: 'Kto zarządza organizacją.', cost: 1, once: true,
    avail: () => has('sim') || has('bluza'), lock: 'Odblokuje się, gdy pojawi się nazwa jakiejś organizacji.',
    async run() { clue('krs'); return 'Fundacja „Psia Przystań”, KRS 0000412377, siedziba: ul. Polna 40, Kalnów (schronisko dla zwierząt).\nZarząd: Marek WRÓBEL – prezes zarządu.\nFundator: Henryk WRÓBEL (zm. 2024).'; } },
  { id: 'ewid', name: 'Ewidencja ludności', desc: 'Wyszukiwanie osoby po imieniu i nazwisku: adres zameldowania, nieruchomości, pojazdy.', cost: 1, input: true,
    placeholder: 'np. imię i nazwisko', registry: () => REGISTRY,
    miss: (q, n) => n.split(' ').length < 2 ? `Brak jednoznacznego wyniku dla „${q}”. Podaj imię i nazwisko (albo samo nazwisko, jeśli jest rzadkie).` : `Brak osoby „${q}” zameldowanej w powiecie kalnowskim.` },
  { id: 'zag', name: 'Baza osób zaginionych', desc: 'Aktywne zgłoszenia zaginięć z województwa. Filtrowanie nic nie kosztuje.', cost: 0, form: true },
  { id: 'ppe', name: 'Dyspozytor sieci energetycznej', desc: 'Pod jakim adresem jest zamontowany licznik o danym numerze PPE.', cost: 4, once: true,
    avail: () => has('licznik'), lock: 'Potrzebny numer licznika (PPE).',
    async run() { clue('adres_ppe'); return 'ENERPOL Dystrybucja, dyżurny dyspozytor:\nNumer niepełny (590 543 017 004 41…). W Kalnowie pasują 3 liczniki w budynkach z piwnicą:\n• ul. Słodowa 14 – dom jednorodzinny. Odbiorca: Henryk Wróbel (zm. 2024, umowa niezaktualizowana).\n• ul. Browarna 7 – dom jednorodzinny. Odbiorca: Józef Mielczarek.\n• ul. Kolejowa 12, komórka lok. 3 – kamienica. Odbiorca: Wspólnota Mieszkaniowa.\nNa mapie dodano ograniczenie „licznik PPE”.'; } },
  { id: 'schron', name: 'Telefon: schronisko „Psia Przystań”', desc: 'Całodobowy numer dyżurny schroniska.', cost: 3, once: true,
    avail: () => has('sim') || has('bluza') || has('krs'), lock: 'Odblokuje się, gdy będzie wiadomo, co łączy ją albo telefon ze schroniskiem.',
    async run() {
      let out = 'Odbiera stróż nocny, pan Zdzisław: „Numer służbowy? To telefon kierownika, pana Marka Wróbla. Coś się stało? Mogę do niego zaraz zadzwonić, on wszystko wyjaśni”.';
      await decide({
        title: 'Stróż chce zadzwonić do kierownika', text: 'Co mu odpowiadasz?', timer: null,
        options: [
          { label: 'Proszę do nikogo nie dzwonić. To sprawa policyjna.', async run() {
              clue('straznik'); good('Nie zaalarmowano sprawcy');
              out += '\n\nTy: „Proszę do nikogo nie dzwonić”.\nStróż: „Rozumiem, nikomu nie powiem. Pan Marek ma owczarka, Bastka, wszędzie go wozi. Mieszka na Ogrodowej, ale ostatnio remontuje dom po ojcu, gdzieś przy browarze”.';
              if (S.perp === 'away') out += '\nPo chwili dodaje ciszej: „Zresztą był tu przed chwilą. Białym busem, ładował do niego klatki ze szczeniakami. W środku nocy. Mówił, że to transport do adopcji”.'; } },
          { label: 'Dobrze, niech pan do niego zadzwoni i poprosi o kontakt z CPR.', async run() {
              S.alarm = true; S.alarmAt = S.t; mistake('Sprawca zaalarmowany przez telefon do schroniska');
              out += '\n\nTy: „Niech pan zadzwoni”.\nPo minucie stróż oddzwania: „Pan Marek mówi, że zgubił telefon i sam się odezwie”. Nie odzywa się.'; } },
        ],
      });
      return out;
    } },
  { id: 'rodzina', name: 'Telefon: osoba zgłaszająca zaginięcie', desc: 'Rozmowa z rodziną kandydatki wybranej w bazie zaginionych.', cost: 3,
    avail: () => !!S.candidate && (!S.toolsUsed['rodzina_' + S.candidate.id]
      || (S.candidate.id === 'maja' && !S.identity && identDetails().length > S.olaDet)),
    lock: 'Najpierw wybierz kandydatkę w bazie osób zaginionych.',
    extra: () => S.candidate ? ` <b>Kandydatka: ${esc(S.candidate.name)}</b> (${esc(S.candidate.reporter)}).` : '',
    async run() {
      const c = S.candidate;
      const again = !!S.toolsUsed['rodzina_' + c.id];
      S.toolsUsed['rodzina_' + c.id] = true;
      if (c.id !== 'maja') { S.candidateRejected[c.id] = true; return `${c.reporter}: ${c.call}`; }
      clue('siostra'); clue('astma'); flag('siostra_rozmowa');
      const det = identDetails();
      S.olaDet = det.length;
      let out = again
        ? 'Oddzwaniasz do Aleksandry Sikorskiej. Odbiera, zanim zdąży zabrzmieć sygnał: „Ma pan coś? Niech pan mówi!”.'
        : 'Aleksandra Sikorska odbiera po pierwszym sygnale. Mówi szybko, łamiącym się głosem: „Majka od roku jest wolontariuszką w Psiej Przystani. Ostatnio mówiła, że kierownik, pan Marek, coś ukrywa z psami. Dziś po szóstej pojechała tam zrobić zdjęcia. Jej telefon wyłączył się o 20:03. Ona ma astmę! Nosi inhalator w takiej małej kieszonce przy rękawie bluzy”.';
      if (det.length >= 2 && !S.identity) {
        S.identity = true; clue('tozsamosc'); good('Tożsamość potwierdzona przez rodzinę');
        out += `\n\nOpisujesz to, co wiesz (${det.map(d => CLUES[d].title.toLowerCase()).join(', ')}). Po drugiej stronie słychać płacz: „To ona. Bransoletkę M & O zrobiłam jej sama, na osiemnastkę. To Majka!”.`;
      } else if (!S.identity) {
        out += '\n\n„Proszę mi powiedzieć cokolwiek! Jakie ma włosy? Czy ma tatuaż?” Wiesz za mało, żeby to potwierdzić. Dowiedz się od niej więcej o wyglądzie i zadzwoń jeszcze raz.';
      }
      if (!again) out += '\n\nOla na koniec: „Proszę jej powiedzieć, że Fasola na nią czeka”.';
      return out;
    } },
];
function identDetails() { return ['tatuaz', 'bransoletka', 'bluza', 'wlosy', 'twarz', 'bilet'].filter(has); }
function onSlodowa(o) { return o && (o.street === 'slodowa' || (o.target && o.target.startsWith('slodowa'))); }

/* =====================================================================
   PATROL POD SŁODOWĄ 14
   ===================================================================== */
async function arriveCorrect() {
  const o = S.order;
  // adres trafiony bez żadnej podstawy w poszlakach (np. z pamięci poprzedniej gry): patrol nie ma powodu, żeby wejść
  if (o.blind && !hasEvidence()) mistake('Patrol wysłany pod adres, którego nic w zgłoszeniu nie wskazywało');
  if (S.moved) {
    if (S.t - S.movedAt <= 3) {
      await radio('Spod czternastki rusza biały bus bez świateł! Blokujemy go radiowozem…');
      await radio('Kierowca zatrzymany: Marek Wróbel. W przestrzeni ładunkowej młoda kobieta, związana, przytomna!');
      S.perp = 'arrested'; S.perpFate = 'arrested';
      await rescue();
      return;
    }
    await radio('Słodowa 14: furtka otwarta, dom pusty. W piwnicy żarówka na kablu, stara kurtka, ślady krwi na schodach. Nikogo. Na podjeździe brak busa.');
    o.status = 'wolny'; S.emptyHouse = true;
    await sys('Sprawca zdążył ją wywieźć. Zgłoszenie przekazano do wydziału kryminalnego.');
    S.pending.push(() => finish());
    return;
  }
  if (S.perp === 'home' || S.perp === 'basement') {
    await radio('Słodowa 14: drzwi otworzył mężczyzna, ok. 45 lat, spokojny. Twierdzi, że mieszka sam i nikogo tu nie ma. W tle szczeka owczarek.');
    await decide({
      title: 'Patrol pod Słodową 14', text: hasEvidence() ? 'Mężczyzna wszystkiemu zaprzecza. Co robisz?' : 'Mężczyzna wszystkiemu zaprzecza, a w zgłoszeniu nic nie wskazuje na ten dom. Bez podstaw patrol nie wejdzie.', timer: null,
      options: [
        { label: 'Poproś ją, żeby krzyczała i stukała w rurę.', show: () => S.contact === 'active', async run() {
            await opSay('Policja jest pod drzwiami! Krzycz i stukaj w rurę, ile masz siły!');
            await her(['POMOCY!!! JESTEM TUTAJ!!!', 'stukam stukam stukam']);
            await radio('Słyszymy krzyk z piwnicy! Wchodzimy!');
            await radio('Mężczyzna próbował zatrzasnąć drzwi, obezwładniony. Schodzimy do piwnicy.');
            good('Potwierdzenie obecności sygnałem dźwiękowym');
            S.perp = 'arrested'; S.perpFate = 'arrested';
            await rescue(); } },
        { label: 'Wejście siłowe. Biorę to na siebie.', show: () => hasEvidence(), async run() {
            await radio('Przyjąłem, wchodzimy.');
            await radio('Mężczyzna obezwładniony. Drzwi do piwnicy zamknięte na zasuwę… otwieramy.');
            if (hasEvidence()) good('Uzasadnione wejście siłowe');
            S.perp = 'arrested'; S.perpFate = 'arrested';
            await rescue(); } },
        { label: 'Bez podstaw do wejścia. Zostańcie na ulicy i obserwujcie dom.', show: () => !hasEvidence(), async run() {
            await radio('Przyjąłem. Odchodzimy od drzwi, stoimy na ulicy z widokiem na dom.');
            o.status = 'wolny'; o.onStreet = 'slodowa';
            if (S.perp === 'home') { S.alarm = true; S.alarmAt = S.t; S.fired.delete('alarm_dom'); } } },
        { label: 'Wycofajcie się, sprawdzimy to inaczej.', async run() {
            await radio('Przyjąłem, odjeżdżamy.');
            mistake('Wycofanie patrolu spod właściwego adresu');
            o.status = 'wolny';
            S.perp = 'home'; S.alarm = true; S.alarmAt = S.t; S.fired.delete('alarm_dom'); } },
      ],
    });
    return;
  }
  let rep = 'Słodowa 14: dom ciemny, nikt nie otwiera. Za bramą duży czarny owczarek.';
  if (S.bulb === 'on') rep += ' W piwnicznym okienku słabe światło.';
  await radio(rep);
  await decide({
    title: 'Patrol pod Słodową 14', text: hasEvidence() ? 'Nikt nie otwiera. Decyzja należy do ciebie.' : 'Nikt nie otwiera, a poza przeczuciem nic nie wskazuje na ten dom. Bez podstaw patrol nie wyważy drzwi.', timer: null,
    options: [
      { label: 'Niech da znak: krzyk i stukanie.', show: () => S.contact === 'active', async run() {
          await opSay('Policja jest przed domem! Krzycz i stukaj w rurę!');
          await her(['JESTEM TUTAJ!!! POMOCY!!!']);
          await radio('Słyszymy ją! Wchodzimy!');
          good('Potwierdzenie obecności sygnałem dźwiękowym');
          await enterHouse(); } },
      { label: 'Wejście siłowe, natychmiast.', show: () => hasEvidence(), async run() {
          await radio('Przyjąłem, wchodzimy.');
          good('Uzasadnione wejście siłowe');
          await enterHouse(); } },
      { label: 'Bez podstaw do wejścia. Zostańcie na ulicy i obserwujcie dom.', show: () => !hasEvidence(), async run() {
          await radio('Przyjąłem. Wycofujemy się od furtki, stoimy na ulicy z widokiem na dom.');
          o.status = 'wolny'; o.onStreet = 'slodowa';
          if (S.perp === 'home') { S.alarm = true; S.alarmAt = S.t; S.fired.delete('alarm_dom'); } } },
    ],
  });
}

async function enterHouse() {
  if (S.order.psp) await radio('Strażacy otwierają drzwi narzędziem hydraulicznym. Mamy wejście.', 'JRG-1');
  else { await radio('Drzwi antywłamaniowe, wyważamy. To potrwa.'); await advance(2); }
  await rescue();
  if (S.perp === 'away') {
    await decide({
      title: 'Sprawca może wrócić', text: 'Właściciel domu, prawdopodobnie sprawca, jest poza domem. Zostawić nieoznakowany radiowóz w pobliżu?', timer: null,
      options: [
        { label: 'Tak, zasadzka przy domu.', async run() {
            await radio('Przyjąłem. Gasimy światła, stoimy za rogiem.');
            await advance(clamp(S.perpReturnAt - S.t, 1, 25));
            await radio('Podjeżdża biały Ducato… Kierowca zatrzymany: Marek Wróbel. Na siedzeniu pasażera owczarek i torba z taśmą.');
            S.perp = 'arrested'; S.perpFate = 'arrested'; good('Zasadzka na sprawcę'); } },
        { label: 'Nie, wszyscy zostają przy poszkodowanej.', async run() {
            await radio('Przyjąłem.'); S.perpFate = 'fled'; } },
      ],
    });
  } else if (S.perp === 'fled') S.perpFate = 'fled';
}

async function rescue() {
  S.rescued = true; S.rescueT = S.t;
  if (S.order) S.order.status = 'zakonczone';
  if (S.contact === 'active') {
    await her(['ktoś jest za drzwiami', 'światło latarki!!', S.identity ? 'wołają moje imię. MAJA. to ja!!' : 'krzyczą „policja”', 'otwierają']);
    await her(['…', 'dziękuję. dziękuję. dziękuję']);
  }
  const who = S.identity ? 'Maja Sikorska, 19 lat' : 'Młoda kobieta NN, ok. 20 lat';
  const state = S.lostReason === 'omdlenie' ? 'nieprzytomna, oddycha' : 'przytomna, uraz głowy, wychłodzona' + (S.asthma ? ', duszność' : '');
  await radio(`Mamy ją! ${who}, ${state}.`);
  if (S.zrmSent) await radio('ZRM K-03 na miejscu, przejmujemy poszkodowaną.', 'ZRM K-03');
  else {
    mistake('Brak ZRM na miejscu: poszkodowana z urazem głowy czekała na karetkę');
    await radio('Potrzebny ZRM! Nie ma tu zespołu.');
    await sys('Zadysponowano ZRM K-03. Dojazd 8 min.');
  }
  if (S.contact === 'active') await opSay(S.identity ? 'Jesteś bezpieczna, Maju. Już po wszystkim.' : 'Jesteś bezpieczna. Już po wszystkim.');
  sfx('win');
  S.phase = 'done';
}

async function rescueByEscape() {
  S.rescued = true; S.rescueT = S.t;
  if (S.order && S.order.status !== 'wolny' && onSlodowa(S.order)) await radio('Widzimy ją! Dziewczyna na ulicy przed czternastką, przejmujemy.');
  else {
    S.order = { target: 'slodowa14', street: 'slodowa', mode: 'adres', zrm: true, psp: false, sirens: true, start: S.t, eta: S.t + 5, from: CASE.hq, status: 'zakonczone', onStreet: 'slodowa' };
    S.zrmSent = true;
    await sys('▸ DYSPOZYCJA · Policja i ZRM → ul. Słodowa 14, na sygnałach (adres podała rozmówczyni).');
  }
  await her(['sąsiadka otworzyła. pani w szlafroku', 'okryła mnie kocem. dzwoni po was', 'syreny. słyszę syreny']);
  await advance(3);
  await radio('Słodowa 14: mężczyzna z rozciętym czołem na schodach do piwnicy, zatrzymany. Poszkodowana u sąsiadów, ZRM ją przejmuje.');
  S.perp = 'arrested'; S.perpFate = 'arrested';
  await opSay('Jesteś bezpieczna. Zostań z sąsiadką, ratownicy już są.');
  sfx('win');
  S.phase = 'done';
}

async function blinkResult() {
  await wait(700);
  if (policeOnStreet('slodowa') && S.bulb !== 'dead') {
    await radio('Widzimy! Okienko piwnicy pod Słodową 14 mrugnęło trzy razy. Potwierdzam adres!');
    clue('potwierdzony'); good('Potwierdzenie adresu sygnałem świetlnym');
    S.ui.dispatch.target = 'b:slodowa14';
    await sys('Adres potwierdzony. Zadysponuj patrol bezpośrednio na ul. Słodową 14 (zakładka „Służby”), będą w minutę.');
  } else if (S.order && S.order.onStreet) {
    await radio(`Nic nie widzimy. Na ${streetName(S.order.onStreet).replace('ul. ', 'ulicy ')} wszystkie piwnice ciemne.`);
  }
}

/* =====================================================================
   EPILOGI
   ===================================================================== */
function epilogue(code) {
  const clk = fmtClock(S.rescueT != null ? S.rescueT : S.t);
  const heal = 'W szpitalu lekarze stwierdzają wstrząśnienie mózgu. Pamięć wraca falami: najpierw Fasola, potem naleśniki Oli, na końcu schody. Gdy tylko otwiera oczy, Maja pyta o Fasolę. Potem pyta, kto był po drugiej stronie czatu.';
  const dogs = 'Dwa dni później w garażu za schroniskiem Psia Przystań policja i inspektorzy weterynarii znajdują 41 psów w klatkach ustawionych jedna na drugiej, tak jak na zdjęciach, które Maja zrobiła tamtego wieczoru, zanim kierownik ją przyłapał. Jej telefon ze zdjęciami leży roztrzaskany w schowku białego busa.';
  const perpLine = S.perpFate === 'arrested'
    ? 'Marek Wróbel słyszy zarzuty pozbawienia wolności, spowodowania uszczerbku na zdrowiu i znęcania się nad zwierzętami.'
    : 'Marek Wróbel odjechał białym busem, zanim ktokolwiek zdążył go zatrzymać. Szukano go przez trzy dni i znaleziono w domku letniskowym nad zalewem, z laptopem pełnym ogłoszeń „szczeniaki rasowe, tanio”.';
  const P = a => a.map(x => `<p>${x}</p>`).join('');
  switch (code) {
    case 'E1': return P([`${clk}. Patrol 0-7 wyprowadza z piwnicy przy ul. Słodowej 14 dziewiętnastoletnią Maję Sikorską. Marek Wróbel siedzi skuty w radiowozie, a za bramą wciąż szczeka jego owczarek Bastek.`, dogs + ' ' + perpLine, heal]);
    case 'E2': return P([`${clk}. Patrol 0-7 wyprowadza z piwnicy przy ul. Słodowej 14 Maję Sikorską, owiniętą w koc. Dom jest pusty, a na podjeździe zostały świeże ślady opon.`, perpLine + ' ' + dogs, heal]);
    case 'E3': return P([`${clk}. Patrol wynosi z piwnicy przy ul. Słodowej 14 dziewczynę owiniętą w koc. W karcie przyjęcia na SOR ktoś wpisuje: „NN, kobieta, ok. 20 lat, uraz głowy, niepamięć”.`,
      'Przez resztę nocy dziewczyna z opaską NN na ręku patrzy w sufit i próbuje sobie przypomnieć własne imię. Dopiero rano policjant przegląda bazę zaginionych i znajduje wieczorne zgłoszenie siostry. Aleksandra Sikorska przyjeżdża do szpitala w kapciach. Przez te kilka godzin Maja była nikim.',
      perpLine]);
    case 'E4': return P(['Rura trafiła go w skroń. Maja wybiegła w deszcz i zastukała do sąsiadki. Patrol znalazł Marka Wróbla na schodach do piwnicy: oszołomionego, z rozciętym czołem i z kluczykami do busa w dłoni.',
      'Zadziałało, ale mogło się skończyć zupełnie inaczej. Na szkoleniach w CPR ta rozmowa będzie omawiana jeszcze długo: dobrze, że miała rurę, i źle, że musiała jej użyć.',
      S.identity ? heal : 'Do szpitala trafia jako „NN”. Kim jest, ustalono dopiero rano.']);
    case 'E5': {
      const how = {
        bateria: 'Kiedy patrol wyważa drzwi do piwnicy, telefon leży na betonie z czarnym ekranem. Dziewczyna siedzi skulona pod półką ze słoikami i powtarza, że przecież pisała i że ktoś obiecał.',
        omdlenie: 'Patrol znajduje ją nieprzytomną pod półką ze słoikami. Oddycha płytko i ze świstem. Lekarz z SOR powie potem, że kwadrans później byłoby za późno.',
        sprawca: 'Telefonu nie ma, bo zabrał go sprawca. Ona siedzi w ciemności, z taśmą na nadgarstkach. Patrol wszedł, zanim zdążył ją wywieźć.',
      }[S.lostReason] || '';
      return P([how, `Zgłoszenie zamknięto o ${clk}. W rubryce „kontakt z rozmówcą” wpisano „utracony”, a w rubryce „rezultat” – „odnaleziona żywa”.`,
        S.identity ? heal : 'Kim jest, ustalono dopiero rano, po wieczornym zgłoszeniu zaginięcia.', perpLine]);
    }
    case 'E6': {
      const notes = S.clueOrder.filter(c => CLUES[c.id].cat === 'miejsce').map(c => CLUES[c.id].title.toLowerCase());
      return P([`Ostatnia wiadomość w kanale: „${esc(S.lastHer || '…')}”. Potem już tylko cisza.`,
        `Karta zgłoszenia nr ${CASE.incident} trafia do wydziału kryminalnego razem z twoimi notatkami${notes.length ? ': ' + esc(notes.join('; ')) : '. Notatek o miejscu jest bardzo mało'}.`,
        'Patrole do rana pukają do kolejnych domów i schodzą do kolejnych piwnic. Gdzieś pod jedną żarówką ktoś wciąż czeka.',
        '<b>To zgłoszenie pozostaje otwarte.</b>']);
    }
    case 'E7': return P(['Ostatnie dwie wiadomości w kanale nie są od niej: „kto to”, „z kim piszesz”.',
      S.emptyHouse ? 'W piwnicy przy Słodowej 14 została żarówka na kablu, kurtka robocza i ślady krwi na schodach. Busa nie ma.' : 'Nikt nie wie, gdzie jest ta piwnica. Telefon fundacji Psia Przystań już się nie loguje do sieci.',
      'Sprawa trafia do wydziału kryminalnego. Rano listy gończe, ogłoszenia, psy tropiące. Biały bus mógł pojechać w każdą stronę.',
      '<b>To zgłoszenie pozostaje otwarte.</b>']);
  }
  return '';
}
