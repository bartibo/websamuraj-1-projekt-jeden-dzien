'use strict';
/* =====================================================================
   Oddział zamknięty (18+) – logika sprawy
   ===================================================================== */

const floorKnown = () => ['pietro', 'opaska', 'forum_c', 'potwierdzony', 'swiatlo_c', 'lista', 'w_oddz3'].some(has);
const dawidKnown = () => ['w_izolatki', 'lista', 'izolatki_swiatlo', 'slady_e'].some(has);

const CASE = {
  id: 'oddzial',
  start: 47, date: '01.11.2026', nextDate: '01.11.2026',
  phone: '+48 535 208 917', incident: 'KAL/2026/11/01/0031',
  hq: [110, 700], etaFirst: 7, etaScale: 450, parTime: 26,
  battery: 36, health: 70, stress: 78, bulb: 'off',
  mapTitle: 'Borek – teren dawnego szpitala',
  target: 'pawC',
  anyContact: ['szymek', 'zabieg_d', 'zabiera', 'zabieg_k', 'polowanie'],
  chronoCats: ['miejsce', 'ekipa', 'sprawca', 'wniosek'],
  labels: {
    target: 'Przeszukanie budynku', recon: 'Obserwacja z zewnątrz', reconShort: 'obserwacja', pick: '— wybierz budynek albo trasę —',
    go: 'Wyślij patrol do tego budynku', reconBtn: 'Obserwacja', candidate: 'Powiąż ze zgłoszeniem', chosen: '● powiązano ze sprawą',
    rejected: 'brak związku', victim: 'Zgłaszająca', mapHint: 'Kliknij budynek, żeby zobaczyć dane z archiwum i sprawdzić, czy pasuje do poszlak.',
  },
  intro: {
    kicker: 'Centrum Powiadamiania Ratunkowego · Kalnów · noc Wszystkich Świętych',
    lead: ['Jest 00:47, pierwszy listopada. Cmentarz w Borku świeci tysiącami zniczy. Za jego murem stoi szpital psychiatryczny zamknięty w 1998 roku. Przed północą weszło tam troje urbexerów z kamerą i transmisją na żywo.',
      'Teraz jedna z nich pisze do ciebie, bo nie może mówić. Schowała się w sali, której nie umie nazwać. Z głośników, które od trzydziestu lat nie mają prądu, ktoś spokojnym głosem zapowiada przyjęcia na oddział.'],
    shift: '31.10–01.11.2026 · 19:00 – 07:00',
    warn: 'Sprawa dla dorosłych (18+): martwe ciała, przemoc, porwanie, sceny grozy. Bez drastycznych opisów, ale bez taryfy ulgowej.',
    image: 'sprawy/oddzial/intro.jpg',
  },

  state: () => ({ perp: 'D', perpSuspicious: false, huntAt: 999, takeAt: null, deadline: 43, dawid: 'held', dawidT: null,
    hyper: false, kingaIn: 'pawC', kingaDeadline: null, kingaDead: false, takenAt: null, perpFate: null }),

  healthDrain() {
    let hd = 0.3;
    if (!has('opatrunek')) hd += has('ucisk') ? 0.25 : 0.55;
    if (S.hyper && !has('oddech_instr')) hd += 0.3;
    if (!has('cieplo') && S.t > 15) hd += 0.2;
    if (!has('czuwa') && S.health < 35) hd += 0.25;
    return hd;
  },
  batteryDrain: () => S.bulb === 'on' ? 0.3 : 0,
  altLight: () => false,
  altLightName: '',
  altLightMsg: '',

  callerName: () => has('imie') ? 'Kinga Lis' : 'NN · kobieta',
  callerNum: () => CASE.phone,
  healthKnown: () => has('noga'),
  kwal: () => has('ciala') ? '148 KK · ZABÓJSTWO' : has('zagrozenie') ? '189 KK · ZAGROŻENIE ŻYCIA' : 'DO USTALENIA',
  statusItems: () => [`AML: <b class="${has('aml') ? 'amb' : ''}">${has('aml') ? '±90 M' : 'DOSTĘPNA'}</b>`, `TEREN: <b>SZPITAL BOREK</b>`],

  addrLevel() {
    if (has('potwierdzony') || S.rescued || S.escaped) return 'confirmed';
    if (S.kingaIn !== 'pawC') return null;
    if (['w_oddz3', 'forum_c', 'swiatlo_c'].some(has)) return 'probable';
    const d = deducedBuilding();
    return d && d.id === 'pawC' ? 'probable' : null;
  },
  locText(al, cand) {
    if (S.kingaIn === 'pawD' && !S.rescued) return has('slady_c') ? 'zabrana, ślady prowadzą do pawilonu D' : 'nieznane (kontakt urwany)';
    if (al === 'confirmed') return 'Pawilon C, 1 piętro, sala 12';
    if (al === 'probable') return 'prawdopodobnie pawilon C' + (floorKnown() ? ', 1 p.' : '');
    if (activeGeo().length >= 2 && cand.length >= 2 && cand.length <= 4) return `${cand.length} pasujące budynki`;
    if (has('aml')) return 'szpital w Borku (±90 m)';
    return 'szpital w Borku, budynek nieustalony';
  },
  buildingInfo(b) {
    return `${b.kind}, ${b.year} r. · kondygnacje: ${esc(b.levels)} · tunel: ${b.tunnel ? 'tak' : 'nie'} · kraty: ${b.bars ? 'tak' : 'nie'}`;
  },

  protocol: () => [
    ['Lokalizacja przybliżona', has('aml')],
    ['Budynek ustalony', !!addrLevel()],
    ['Piętro i sala', floorKnown()],
    ['Stan poszkodowanej', has('noga')],
    ['Zagrożenie na miejscu', has('zagrozenie')],
    ['Drugi poszkodowany zlokalizowany', dawidKnown() || S.dawid !== 'held'],
    ['Sprawca ustalony', ['ewid_kubiak', 'stroz', 'w_sprawca', 'karta'].some(has) || S.perpFate === 'arrested'],
    ['Policja zadysponowana', !!S.order],
    ['ZRM zadysponowany', S.zrmSent],
  ],
  card() {
    const perp = ['ewid_kubiak', 'w_sprawca'].some(has) ? 'Edmund Kubiak, były sanitariusz, stróż terenu' : has('stroz') || has('karta') ? 'możliwy związek: stróż Edmund Kubiak?' : has('maska') ? 'mężczyzna w masce gazowej i fartuchu' : has('pa') ? 'mężczyzna mówiący przez głośniki' : 'nieznany';
    const health = [has('noga') && 'rozcięta łydka, krwawienie' + (has('opatrunek') ? ' (opatrunek)' : ''), has('hiper') && 'atak paniki', has('zimno') && 'wychłodzenie'].filter(Boolean).join('; ') || '—';
    const dawid = S.dawid === 'alive' ? 'odnaleziony żywy' : S.dawid === 'dead' && S.dawidT != null ? 'odnaleziony martwy' : dawidKnown() ? 'prawdopodobnie pawilon D, izolatki' : has('dawid_tunel') ? 'zaginiony w tunelach' : '—';
    return [
      ['Telefon', CASE.phone],
      ['Rodzaj', has('ciala') ? 'zabójstwo (art. 148 kk), pozbawienie wolności' : has('zagrozenie') ? 'pozbawienie wolności (art. 189 kk), zagrożenie życia' : 'do ustalenia'],
      ['Zgłaszająca', has('imie') ? 'Kinga Lis, 23 l.' : 'NN, kobieta'],
      ['Stan', health], ['Miejsce', $('#caller-loc').textContent],
      ['Dawid Mrozek', dawid],
      ['Szymon Bała', has('szymek') ? 'odnaleziony, ranny' : has('ekipa') ? 'nieznany' : '—'],
      ['Sprawca', perp],
    ];
  },

  /* ---------- początek rozmowy ---------- */
  async opening() {
    await opSay('112, Centrum Powiadamiania Ratunkowego. Słucham?');
    await wait(900);
    await sys('Kanał głosowy: szept, szybki oddech. W tle trzaski i odległy, metaliczny głos z głośnika.');
    await sys('Szept: „…szpital… w Borku… on tu chodzi…”');
    await opSay('Jeśli nie może pani mówić, proszę pisać. Jestem tutaj.');
    await wait(700);
    await sys('Rozmówczyni przerwała połączenie głosowe. Przyszła wiadomość w kanale tekstowym 112.');
    await her(['jestem w starym szpitalu w borku. psychiatryk', 'nie mogę mówić. ktoś chodzi po korytarzach', 'zgubiłam znajomych. nie wiem w którym budynku jestem', 'biegłam po ciemku. prosze']);
    await sys('Kanał tekstowy aktywny. AML: pozycja przybliżona dostępna w narzędziach. Telemetria baterii: 36%.');
    await decide({
      title: 'Pierwsza odpowiedź', text: 'Ona jest w ciemnym budynku, a ktoś chodzi po korytarzach.', timer: null,
      options: [
        { label: 'Jestem z tobą. Jak masz na imię? Czy jesteś teraz w zamkniętym pomieszczeniu?', async run() {
            await opSay('Jestem z tobą. Jak masz na imię? Czy jesteś teraz w zamkniętym pomieszczeniu?');
            flag('imie'); flag('zagrozenie'); dS(-8); good('Spokojne otwarcie rozmowy, pytanie o bezpieczeństwo');
            await her(['kinga. kinga lis', 'jestem w jakiejś sali. zastawiłam drzwi krzesłem', 'dobrze że ktoś odpisał']); } },
        { label: 'Wyjdź z budynku najkrótszą drogą i biegnij do bramy.', async run() {
            await opSay('Wyjdź z budynku najkrótszą drogą i biegnij do bramy.');
            dS(+10); mistake('Polecenie ucieczki przez ciemny, nieznany budynek, w którym jest sprawca');
            await her(['nie!! nie wiem gdzie jest wyjście', 'na korytarzu on chodzi. nie wyjdę stąd']); } },
        { label: 'Opisz mi tego człowieka.', async run() {
            await opSay('Opisz mi tego człowieka.');
            dS(+6); S.defer = []; clue('maska');
            await her(['maska. gazowa. stara', 'biały fartuch. nie chcę o nim myśleć']); flushDefer(); } },
      ],
    });
  },

  /* ---------- patrol na terenie ---------- */
  async arrive(b) {
    const o = S.order;
    if (b.id === 'pawC') { await arriveC(); return true; }
    if (b.id === 'pawD') { await arriveD(); return true; }
    await radio(`${b.addr}: wchodzimy, przeszukujemy.`);
    await advance(b.search);
    await radio(b.report);
    if (b.clue) clue(b.clue);
    o.status = 'wolny'; o.onStreet = 'aleja';
    await radio('Patrol 0-7 wolny na terenie szpitala. Przejście do innego budynku zajmie ok. minuty.');
    return true;
  },
  async onRecon(street) {
    if (street === 'mur' && S.contact === 'active' && S.kingaIn === 'pawC') await sys('Patrol stoi pod murem, widzi wschodnie okna pawilonów. W „Poleceniach” możesz poprosić ją o sygnał latarką.');
  },
  async onCandidate(m) {
    if (['ewa', 'patryk', 'zenon', 'rafal'].includes(m.id)) {
      clue('zaginieni'); good('Powiązanie z wcześniejszymi zaginięciami');
      await sys(`Powiązano: ${m.name}, zaginięcie ${m.since.split('-').reverse().join('.')}. Ostatni ślad: Borek.`);
    } else {
      S.candidateRejected[m.id] = true; S.candidate = null;
      await sys(`${m.name}: nic nie łączy tego zaginięcia z Borkiem.`);
    }
  },
  onDispatch(o) {
    if (S.kingaIn === 'pawC' && !S.rescued && ['D', 'tunel'].includes(S.perp)) S.huntAt = Math.min(S.huntAt, o.eta - (o.sirens ? 3 : 2));
  },
  updateMap(svg) {
    const t = svg.querySelector('#m-tunnels');
    if (t) t.classList.toggle('on', has('plany') || has('kabel'));
  },

  /* ---------- koniec ---------- */
  endingCode() {
    if (S.escaped) return 'E3';
    if (S.rescued) {
      if (S.lostAt != null && S.lostAt < S.rescueT) return 'E4';
      return S.dawid === 'alive' ? 'E1' : 'E2';
    }
    return S.lostReason === 'sprawca' ? 'E6' : 'E5';
  },
  scoreExtra() {
    let p = 0;
    if (S.dawid === 'alive') p += 14;
    if (S.perpFate === 'arrested') p += 9;
    const med = ['ucisk', 'opatrunek', 'oddech_instr', 'cieplo', 'czuwa'].filter(has).length;
    if (S.clues.size < 6) p -= 30; // wygrana bez śledztwa nie jest dobrą robotą
    return p + med * 1.5;
  },
  finalMistakes() {
    if (S.lostReason === 'bateria' && !has('dim')) mistake('Nie oszczędzano baterii (przyciemnienie ekranu, zgaszona latarka)');
    if (S.lostReason === 'omdlenie' && !has('opatrunek')) mistake('Nie zatamowano krwawienia z nogi');
    if (S.dawid === 'dead') mistake('Dawid nie został odnaleziony przed 01:30');
  },
  missedPrio(cat) {
    const locDone = S.rescued || S.escaped || addrLevel();
    return cat === 'miejsce' ? (locDone ? 9 : 0) : cat === 'ekipa' ? (S.dawid === 'alive' ? 2 : 1) : 2;
  },
  stats: () => [
    ['Kinga', S.escaped ? 'wydostała się sama' : S.rescued ? 'uratowana' : S.kingaDead ? 'nie żyje' : 'nieodnaleziona'],
    ['Dawid', S.dawid === 'alive' ? 'uratowany' : S.dawid === 'dead' ? 'nie żyje' : 'nieodnaleziony'],
    ['Sprawca', S.perpFate === 'arrested' ? 'zatrzymany' : (S.rescued || S.escaped) ? 'zbiegł' : 'na wolności'],
  ],
  chronoExtra: () => S.dawidT != null ? [{ t: S.dawidT, l: S.dawid === 'alive' ? 'Dawid odnaleziony żywy' : 'Dawid odnaleziony martwy', ok: S.dawid === 'alive', bad: S.dawid !== 'alive' }] : [],
  epilogue(code) { return epilogue(code); },
};

/* =====================================================================
   NARZĘDZIA (BAZY)
   ===================================================================== */
const TOOLS = [
  { id: 'aml', name: 'Lokalizacja AML', desc: 'Pozycja z modułu GPS telefonu przesłana przy połączeniu.', cost: 2, once: true,
    async run() { clue('aml'); return 'AML: 50,8123 N, 19,4471 E, dokładność ±90 m (sygnał GPS tłumiony przez budynek).\nTeren: dawny Szpital dla Nerwowo i Psychicznie Chorych w Borku, ul. Szpitalna 1.\nW okręgu: pawilony C i D oraz prosektorium. Na mapie dodano nakładkę.'; } },
  { id: 'plany', name: 'Archiwum: plany szpitala', desc: 'Skany planów z archiwum konserwatora zabytków (1911, 1974).', cost: 3, once: true,
    async run() { clue('plany'); return 'Wojewódzki Konserwator Zabytków, karta obiektu „Zespół szpitala w Borku”:\nA – administracja (parter, piętro).\nB – Oddziały I i II, kobiece (piwnica z hydroterapią, parter, piętro).\nC – Oddział III, męski (piwnica, parter, piętro). Sale 10–16 w skrzydle wschodnim, od strony cmentarza.\nD – oddział zamknięty, parterowy. W piwnicy izolatki z okienkami w poziomie terenu.\nE – kuchnia i pralnia. Tunele z kuchni do B, C, D i kotłowni.\nKotłownia z kominem, wieża ciśnień (1911), prosektorium przy murze cmentarnym.\nNa mapie zaznaczono tunele.'; } },
  { id: 'stream', name: 'Streamio: zapis transmisji', desc: 'Wniosek do serwisu o zapis i dane transmisji na żywo.', cost: 3, once: true,
    avail: () => has('live') || has('kanal_forum'), lock: 'Potrzebna nazwa kanału albo serwisu.',
    async run() { clue('stream'); return 'Streamio, dział współpracy z organami ścigania. Kanał „Strefa Zero”, transmisja „BOREK LIVE – Wszystkich Świętych w psychiatryku”, start 23:31.\n\n00:18 – korytarz, Szymek: „Dawid, tu jest kabel, ktoś tu ma prąd”.\n00:24 – stukanie z tunelu. Dawid schodzi sam.\n00:31 – trzask, głos z głośników. Obraz gwałtownie się trzęsie, bieg, krzyk Kingi gdzieś z boku.\n00:33 – telefon leży na podłodze piwnicznego korytarza. W kadrze emaliowana tabliczka: „ODDZIAŁ ZAMKNIĘTY – IZOLATKI”. Stare drzwi z judaszami.\n00:36 – z głębi korytarza ciągnięcie czegoś ciężkiego po posadzce.\n00:39 – kadr zasłania biały fartuch. Maska gazowa pochyla się nad obiektywem. Koniec transmisji.\n\nCzat widzów (fragmenty): „to fejk”, „ZA NIM”, „dzwońcie na policję serio”, „ile płacicie aktorom”.'; } },
  { id: 'forum', name: 'Forum urbex Opuszczone.pl', short: 'Forum', desc: 'Wyszukiwarka wątków i zdjęć: nazwy miejsc, napisy z graffiti, pseudonimy.', cost: 1, input: true,
    placeholder: 'np. nazwa miejsca, napis z graffiti', registry: () => FORUM,
    miss: q => `Brak wyników dla „${q}”. Spróbuj nazwy miejsca, napisu z graffiti albo nazwy kanału.` },
  { id: 'kpp', name: 'KPP Kalnów: zgłoszenia z adresu', desc: 'Wcześniejsze interwencje i zgłoszenia dotyczące terenu szpitala.', cost: 2, once: true,
    async run() { clue('zgloszenia'); return 'KPP Kalnów, zgłoszenia z adresu ul. Szpitalna 1, Borek:\n• 06.2019 – zaginięcie Ewy Malinowskiej i Patryka Nowaka, ostatni sygnał telefonów: Borek. Sprawa w toku.\n• 01.2022 – zaginięcie Zenona Wilka, bezdomnego, nocował w pustostanach Borku.\n• 11.2023 – skargi mieszkańców: nocą z terenu szpitala dochodzą komunikaty z megafonów.\n• 10.2024 – motocykl Rafała Kowalczyka porzucony na parkingu przy cmentarzu w Borku.\n• 03.2025 – bezdomny zgłasza: „ktoś trzyma ludzi w pawilonie D”. Patrol: teren zamknięty, stróż E. Kubiak oświadcza, że nikogo nie ma. Sprawa zamknięta.'; } },
  { id: 'kw', name: 'Księgi wieczyste: właściciel terenu', desc: 'Kto jest właścicielem i kto odpowiada za teren.', cost: 2, once: true,
    async run() { clue('wlasciciel'); return 'KW nr KA1K/00041177/3: dz. 211/4, Borek, ul. Szpitalna 1.\nWłaściciel: BOREK DEVELOPMENT sp. z o.o., Kalnów.\nW KRS spółki: numer całodobowy ochrony obiektu.'; } },
  { id: 'ochrona', name: 'Telefon: ochrona obiektu', desc: 'Całodobowy numer ochrony Borek Development.', cost: 3, once: true,
    avail: () => has('wlasciciel'), lock: 'Najpierw ustal właściciela terenu.',
    async run() {
      clue('stroz');
      let out = 'Dyżurny firmy, zaspany: „Szpital w Borku? Tam nic nie ma, ruiny. Pilnuje nam tego pan Edmund Kubiak, mieszka w portierni od zawsze. Był tam sanitariuszem jeszcze za szpitala, na oddziale zamkniętym. Komórki nie ma, tylko stary telefon stacjonarny w portierni. Mam do niego zadzwonić?”';
      await decide({
        title: 'Ochrona chce zadzwonić do stróża', text: 'Co odpowiadasz?', timer: null,
        options: [
          { label: 'Nie. Proszę nikogo nie powiadamiać, to sprawa policyjna.', async run() {
              good('Nie zaalarmowano sprawcy');
              out += '\n\nTy: „Proszę nikogo nie powiadamiać”.\nDyżurny: „Jasne… Wie pan co, on jest dziwny, ale porządny. Codziennie zgłasza obchód. Mówi «obchód», jakby to dalej był szpital”.'; } },
          { label: 'Tak, niech pan do niego zadzwoni i każe mu otworzyć bramę dla policji.', async run() {
              mistake('Sprawca zaalarmowany telefonem od ochrony');
              S.perpSuspicious = true;
              if (S.dawid === 'held') S.deadline = Math.min(S.deadline, S.t + 10);
              out += '\n\nPo chwili dyżurny oddzwania, zmieszany: „Pan Edmund odebrał. Powiedział tylko: «Wszyscy pacjenci są na oddziale. Proszę nie przeszkadzać w zabiegach». I odłożył słuchawkę”.'; } },
        ],
      });
      return out;
    } },
  { id: 'ewid', name: 'Ewidencja ludności', desc: 'Osoba po imieniu i nazwisku: zameldowanie, zatrudnienie, adnotacje.', cost: 1, input: true,
    placeholder: 'np. imię i nazwisko', registry: () => REGISTRY,
    miss: (q, n) => n.split(' ').length < 2 ? `Brak jednoznacznego wyniku dla „${q}”. Podaj imię i nazwisko.` : `Brak osoby „${q}” w ewidencji gminy.` },
  { id: 'zag', name: 'Baza osób zaginionych', desc: 'Zgłoszenia zaginięć z województwa, także sprzed lat. Filtrowanie nic nie kosztuje.', cost: 0, form: true },
];

/* =====================================================================
   PAWILON C: KINGA
   ===================================================================== */
async function arriveC() {
  const o = S.order, floor = floorKnown(), blind = o.blind && !hasEvidence();
  // bez żadnej poszlaki patrol nie wie, czego szuka: przeszukuje cały pawilon od piwnicy
  if (blind) mistake('Patrol wysłany do pawilonu C bez żadnej poszlaki');
  await radio(`Pawilon C, wchodzimy od dziedzińca. ${floor ? 'Idziemy prosto na pierwsze piętro, skrzydło wschodnie.' : blind ? 'Nie mamy nic poza adresem szpitala. Przeszukujemy pawilon od piwnicy, każde pomieszczenie.' : 'Nie wiemy, które piętro. Przeszukujemy od piwnicy, sala po sali.'}`);
  await advance(floor ? 1 : blind ? 9 : 4);
  if (S.rescued || S.escaped) return;
  if (S.kingaIn !== 'pawC') {
    await radio('Pawilon C, piętro, sala 12: pusto. Krzesło przewrócone, koc na podłodze. Krwawe ślady prowadzą schodami w dół, do tunelu w stronę pawilonu D.');
    clue('slady_c');
    o.status = 'wolny'; o.onStreet = 'aleja';
    return;
  }
  if (S.perp === 'C') {
    if (o.sirens) {
      await radio('Ktoś zbiega schodami do piwnicy! Biały fartuch! Zniknął w tunelu.');
      S.perp = 'D';
      if (S.dawid === 'held') S.deadline = Math.min(S.deadline, S.t + 4);
      mistake('Syreny spłoszyły sprawcę: uciekł tunelem do pawilonu D');
    } else {
      await radio('Na korytarzu piętra mężczyzna w masce gazowej i fartuchu, z pękiem kluczy. Nie ucieka. Stoi i patrzy. Zatrzymany.');
      S.perp = 'arrested'; S.perpFate = 'arrested'; good('Dyskretny dojazd: sprawca zaskoczony i zatrzymany');
    }
  }
  if (S.contact === 'active') {
    await decide({
      title: 'Patrol na piętrze pawilonu C', text: 'Policjanci są na korytarzu. Sal jest kilkanaście, drzwi zastawione od środka.', timer: null,
      options: [
        { label: 'Powiedz jej, żeby zastukała w drzwi i zawołała.', async run() {
            await opSay('Policja jest na twoim korytarzu. Zastukaj w drzwi i zawołaj!');
            await her(['TUTAJ!!! DWUNASTKA!!!', 'stukam']);
            await radio('Słyszymy! Sala 12!'); good('Potwierdzenie obecności sygnałem dźwiękowym'); } },
        { label: 'Niech sprawdzają salę po sali.', async run() {
            await radio('Przyjąłem, sala po sali.'); await advance(2); } },
      ],
    });
  } else await advance(2);
  await rescueKinga('sala');
}

async function rescueKinga(where) {
  S.rescued = true; S.rescueT = S.t;
  if (S.order) S.order.status = 'na_miejscu';
  if (S.contact === 'active') {
    await her(['ktoś odsuwa łóżko', 'latarki. mundury', 'POLICJA. oni są tutaj']);
    await her(['…', 'dziękuję. dziękuję. nie puszczajcie mnie']);
  }
  const state = S.lostReason === 'omdlenie' ? 'nieprzytomna, oddycha' : 'przytomna, rana nogi' + (has('opatrunek') ? ' z opatrunkiem' : ', mocno krwawi') + ', wychłodzona';
  await radio(where === 'izolatka' ? `Izolatka 2! Młoda kobieta przypięta pasami do łóżka, ${state}. To Kinga Lis.` : `Mamy ją! Kinga Lis, sala 12, ${state}.`);
  if (S.zrmSent) await radio('ZRM K-03 przy bramie, idziemy z noszami.', 'ZRM K-03');
  else {
    mistake('Brak ZRM: poszkodowana z krwawiącą raną czekała na karetkę');
    await radio('Potrzebny ZRM, ona krwawi!');
    await sys('Zadysponowano ZRM K-03. Dojazd 9 min.');
    S.zrmSent = true;
  }
  if (S.contact === 'active') await opSay('Jesteś bezpieczna, Kingo. Policjanci zostaną z tobą.');
  if (S.dawid === 'held') await findDawid();
  sfx('win');
  S.phase = 'done';
}

/* =====================================================================
   PAWILON D: DAWID (I KINGA, JEŚLI ZOSTAŁA ZABRANA)
   ===================================================================== */
async function arriveD() {
  const o = S.order;
  await radio('Pawilon D. Drzwi zastawione od środka. Wchodzimy okienkiem piwnicy, kraty przegniłe.');
  await advance(2);
  if (S.perp === 'D') {
    if (o.sirens) {
      await radio('W korytarzu izolatek ktoś gasi światło i ucieka tunelem! Biały fartuch!');
      S.perp = 'tunel';
    } else {
      await radio('Korytarz izolatek. Mężczyzna w masce gazowej stoi przy aparaturze. Odwraca się. „Proszę nie przeszkadzać w zabiegu.” Zatrzymany.');
      S.perp = 'arrested'; S.perpFate = 'arrested'; good('Sprawca zatrzymany przy izolatkach');
    }
  }
  if (S.dawid === 'held' || (S.dawid === 'dead' && S.dawidT == null)) await dawidFound();
  if (S.kingaIn === 'pawD' && !S.rescued) {
    if (S.kingaDead || S.t >= S.kingaDeadline) {
      S.kingaDead = true;
      await radio('Izolatka 2: młoda kobieta przypięta pasami, w koszuli szpitalnej. Na skroniach elektrody. Nie żyje.' + (has('opatrunek') ? ' Ma opatrunek na łydce, zrobiony szalikiem.' : ''));
      S.pending.push(() => finish());
      o.status = 'wolny';
      return;
    }
    good('Odnaleziona po utracie kontaktu');
    await rescueKinga('izolatka');
    return;
  }
  o.status = 'wolny'; o.onStreet = 'aleja';
  await radio('Patrol 0-7 wolny na terenie szpitala. Przejście do innego budynku zajmie ok. minuty.');
}

async function dawidFound() {
  S.dawidT = S.t;
  if (S.perp === 'D') { // patrol jest już na terenie i wchodzi po cichu
    await radio('Korytarz izolatek. Mężczyzna w masce gazowej stoi przy aparaturze. Odwraca się: „Proszę nie przeszkadzać w zabiegu”. Zatrzymany.');
    S.perp = 'arrested'; S.perpFate = 'arrested'; good('Sprawca zatrzymany przy izolatkach');
  }
  if (S.dawid === 'dead' || S.t >= S.deadline) {
    S.dawid = 'dead';
    await radio('Izolatka 3: młody mężczyzna przypięty pasami do łóżka, ogolona głowa, na skroniach elektrody starego aparatu. Nie żyje. Agregat jeszcze pracuje.');
    return;
  }
  S.dawid = 'alive';
  await radio('Izolatka 3! Młody mężczyzna przypięty pasami, koszula szpitalna, na skroniach elektrody. Wyrywamy kabel z aparatu! Oddycha, nieprzytomny, w żyle wenflon. Dawid Mrozek, żyje!');
  good('Dawid odnaleziony przed „zabiegiem”');
}

async function findDawid() {
  if (dawidKnown()) { // śledztwo już wskazało izolatki: patrol idzie prosto tam
    await radio('Przyjąłem, drugi poszkodowany prawdopodobnie w izolatkach pawilonu D. Idziemy tunelem.');
    await advance(2);
    await dawidFound();
    return;
  }
  const tried = [];
  const opts = [['pawD', 'Pawilon D'], ['kotlownia', 'Kotłownia'], ['pawB', 'Pawilon B'], ['pawE', 'Pawilon E (kuchnia)'], ['pawA', 'Pawilon A']]
    .map(x => [x, Math.random()]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  const hint = dawidKnown() ? 'Poszlaki prowadzą do izolatek.' : has('zabieg') ? 'Kinga powtarza, że głos z głośników „przyjął Dawida na oddział zamknięty”.' : 'Dawid zniknął w tunelach pod kuchnią.';
  while (S.dawid === 'held' || (S.dawid === 'dead' && S.dawidT == null)) {
    let pickId = null;
    await decide({
      title: 'Gdzie jest Dawid?', text: hint + ' Patrol może przeszukać jeden budynek naraz.', timer: null,
      options: opts.filter(x => !tried.includes(x[0])).map(([id, l]) => ({ label: l, run() { pickId = id; } })),
    });
    tried.push(pickId);
    const b = BUILDINGS.find(x => x.id === pickId);
    await radio(`Przyjąłem: ${b.addr}.`);
    await advance(pickId === 'pawD' ? 2 : b.search + 2);
    if (pickId === 'pawD') { await dawidFound(); break; }
    await radio(b.report); if (b.clue) clue(b.clue);
    if (tried.length >= opts.length) break;
  }
}

/* =====================================================================
   UCIECZKA I SYGNAŁ LATARKĄ
   ===================================================================== */
async function rescueByEscape() {
  S.rescued = true; S.rescueT = S.t;
  if (!S.order || S.order.status === 'jedzie') {
    S.order = { target: null, street: 'mur', mode: 'rekon', zrm: true, psp: false, sirens: true, start: S.t, eta: S.t + 4, from: CASE.hq, status: 'na_miejscu', onStreet: 'mur' };
    S.zrmSent = true;
    await sys('▸ DYSPOZYCJA · Policja i ZRM → cmentarz w Borku, przy murze szpitala, na sygnałach.');
  }
  await her(['pani okryła mnie kurtką. dzwoni do was', 'ludzie stoją przy dziurze w murze. nikt nie chce tam wejść', 'dawid tam jest. dawid dalej tam jest']);
  await advance(3);
  await radio('Jesteśmy przy cmentarzu, mamy poszkodowaną. Wchodzimy na teren szpitala.');
  S.perpFate = 'fled';
  await opSay('Jesteś bezpieczna, Kingo. Zostań z tą panią.');
  if (S.dawid === 'held') await findDawid();
  sfx('win');
  S.phase = 'done';
}

async function blinkResult() {
  await wait(700);
  if (policeOnStreet('mur')) {
    await radio('Widzimy! Trzy błyski w oknie, pierwsze piętro, wschodnie skrzydło pawilonu C. Potwierdzam!');
    clue('potwierdzony'); good('Potwierdzenie miejsca sygnałem świetlnym');
    S.ui.dispatch.target = 'b:pawC';
    await sys('Miejsce potwierdzone. Zadysponuj patrol do pawilonu C (zakładka „Służby”), są przy murze, wejdą w minutę.');
  } else if (S.order && S.order.onStreet) {
    await radio(`Nic nie widzimy. Z miejsca, gdzie stoimy (${streetName(S.order.onStreet)}), nie widać okien od strony cmentarza.`);
  }
}

/* =====================================================================
   EPILOGI
   ===================================================================== */
function epilogue(code) {
  const clk = fmtClock(S.rescueT != null ? S.rescueT : S.t);
  const P = a => a.map(x => `<p>${x}</p>`).join('');
  const bodies = 'W sali 14 pawilonu C, za ścianą, przy której siedziała Kinga, policja znajduje trzy ciała przypięte pasami do łóżek: Ewę Malinowską i Patryka Nowaka, zaginionych w 2019 roku, i Zenona Wilka. W prosektorium czwarte, Rafała Kowalczyka. Pościel była świeża. Na drzwiach wisiały karty gorączkowe, wypełniane codziennie tym samym starannym pismem.';
  const perpLine = S.perpFate === 'arrested'
    ? 'Edmund Kubiak, sanitariusz oddziału zamkniętego w latach 1982–1998, przez dwadzieścia osiem lat po zamknięciu szpitala „prowadził oddział”. Na pierwszym przesłuchaniu pyta tylko, kto teraz zmieni pacjentom pościel.'
    : 'Edmund Kubiak zniknął w tunelach. Znaleziono go dwa dni później w kotłowni, przy wygasłym agregacie, w czystym, wyprasowanym fartuchu. Wypełniał karty pacjentów. Na ostatniej było jej nazwisko.';
  const dawidLine = S.dawid === 'alive'
    ? 'Dawid Mrozek budzi się na neurologii w Kalnowie po dwóch dniach. Z tamtej nocy pamięta tylko pikanie aparatu i to, że ktoś bardzo uprzejmie mówił do niego „panie Dawidzie”.'
    : 'Dawida Mrozka pochowano tydzień później na cmentarzu w Borku, kilkaset metrów od pawilonu D. Matka nie pozwoliła, żeby trumnę nieśli ludzie z internetu.';
  const stream = 'Zapis transmisji Strefy Zero obejrzało do rana ponad dwieście tysięcy osób. Najczęstszy komentarz: „dobry fejk”.';
  switch (code) {
    case 'E1': return P([`${clk}. Policjanci wyprowadzają Kingę Lis z sali 12 pawilonu C, owiniętą w folię termiczną. Kilka minut później ratownicy wynoszą z piwnicy pawilonu D Dawida Mrozka. Żyje.`, bodies, perpLine, dawidLine + ' ' + stream]);
    case 'E2': return P([`${clk}. Kinga Lis wychodzi z pawilonu C o własnych siłach, podtrzymywana przez dwóch policjantów. Na dziedzińcu mija nosze, które niosą z pawilonu D. Prześcieradło jest zaciągnięte na twarz.`, dawidLine, bodies, perpLine]);
    case 'E3': return P(['Noga od krzesła trafiła go w skroń. Maska spadła i Kinga zobaczyła siwego, starego człowieka o zdziwionych oczach. Biegła po ciemku w stronę zniczy, przez dziurę w murze, między groby, aż do kobiety, która zapalała lampkę na grobie męża.',
      S.dawid === 'alive' ? 'Patrol, który wszedł na teren po jej ucieczce, zdążył do izolatki numer 3.' : 'Patrol, który wszedł na teren po jej ucieczce, nie zdążył do izolatki numer 3.', dawidLine, bodies, perpLine]);
    case 'E4': {
      const how = S.lostReason === 'sprawca'
        ? 'Telefon znaleziono później w kieszeni fartucha. Ją w izolatce numer 2, przypiętą pasami, z elektrodami na skroniach' + (has('opatrunek') ? ' i z opatrunkiem z szalika na łydce' : '') + '. Aparat nie zdążył się nagrzać.'
        : S.lostReason === 'omdlenie'
          ? 'Patrol znajduje ją nieprzytomną na podłodze sali 12, pod oknem, w czerwonym świetle zniczy. Lekarz z SOR powie, że straciła prawie litr krwi.'
          : 'Kiedy patrol odsuwa łóżko od drzwi sali 12, telefon leży na podłodze z czarnym ekranem. Kinga siedzi pod oknem i liczy znicze, żeby nie zwariować.';
      return P([how, `Zgłoszenie zamknięto o ${clk}. W rubryce „kontakt z rozmówczynią” wpisano „utracony”, w rubryce „rezultat” – „odnaleziona żywa”.`, dawidLine, bodies, perpLine]);
    }
    case 'E5': return P([`Ostatnia wiadomość w kanale: „${esc(S.lastHer || '…')}”. Potem tylko cisza.`,
      'Policja przeszukuje dziewięć budynków i dwa kilometry tuneli do rana. Ktoś z ekipy poszukiwawczej mówi, że w jednym z korytarzy przez chwilę słyszał głośnik: „Pacjentka Lis na obchodzie nieobecna”.',
      '<b>To zgłoszenie pozostaje otwarte.</b>']);
    case 'E6': return P(['Ostatnie dwie wiadomości w kanale napisał on: „pacjentka nie powinna korzystać z telefonu”, „proszę się nie bać. to tylko zabieg”.',
      S.kingaDead ? 'Kingę Lis znaleziono w izolatce numer 2 pawilonu D. Za późno.' : 'Kingi Lis nie znaleziono tej nocy.',
      S.perpFate === 'arrested' ? dawidLine : '',
      S.perpFate === 'arrested' ? perpLine : 'Rok później kolejna grupa urbexerów nagrywa w Borku. Na jednym z kadrów, w oknie pawilonu D, ktoś stoi w białym fartuchu. Komentarze piszą, że to fejk.',
      '<b>To zgłoszenie pozostaje otwarte.</b>'].filter(Boolean));
  }
  return '';
}
