'use strict';
/* =====================================================================
   Przed świtem (18+) – dane fabuły
   3 listopada, 06:04. Paweł Sobczak (41) siedzi w aucie na pomoście 14
   Stawów Gajowych, dokąd jako chłopiec jeździł na ryby z ojcem. O 9:00
   ma eksmisję. Chce, żeby „było po wszystkim”, zanim zrobi się jasno.
   Operator wygrywa zaufaniem, nie podstępem. Sprawa celowo nie opisuje
   żadnej metody i nie pokazuje śmierci.
   ===================================================================== */

const T = () => S.health;                                       // zaufanie (pasek „Zaufanie”)
// przyrosty maleją, gdy zaufanie jest już wysokie; rady psycholożki pomagają budować kontakt
const dT = n => dH(n > 0 ? n * (has('cik') ? 1.2 : 1) * Math.max(0.3, 1 - T() / 115) : n);

const CLUE_CATS = {
  miejsce: { name: 'Miejsce',  icon: '⌖' },
  osoba:   { name: 'Paweł',    icon: '◉' },
  bliscy:  { name: 'Bliscy',   icon: '♥' },
  ryzyko:  { name: 'Ryzyko',   icon: '⚠' },
  wniosek: { name: 'Wnioski',  icon: '∴' },
};

const CLUES = {
  /* ---------- MIEJSCE ---------- */
  bts: { cat: 'miejsce', geo: 'bts', title: 'Stacja bazowa Gajówka',
    text: 'Telefon loguje się do stacji BTS „Gajówka”, sektor 2. Szacowany obszar: ok. 2,2 km wokół punktu na mapie, w Lasach Gajowych.',
    hint: 'Logowanie do stacji bazowej zawężało teren do kilku miejsc w Lasach Gajowych.' },
  woda: { cat: 'miejsce', geo: 'woda', title: 'Pomost nad wodą',
    text: 'Auto stoi przodem do wody. Przed maską drewniany pomost wędkarski, nad wodą mgła, dookoła trzciny.',
    hint: 'Opis albo zdjęcie widoku przez szybę mówiły, że stoi nad wodą, przy pomoście.' },
  maszt: { cat: 'miejsce', geo: 'maszt', title: 'Maszt na północnym wschodzie',
    text: 'Za wodą, nad lasem, maszt z czerwonymi światłami, na wprost przodu auta. Wyświetlacz na desce pokazuje kierunek NE.',
    hint: 'Maszt RTV widoczny na wprost, przy kierunku NE, wskazywał brzeg stawu na południowy zachód od masztu.' },
  pociag: { cat: 'miejsce', geo: 'pociag', title: 'Pociąg trąbi przed przejazdem',
    text: 'Słychać trąbienie pociągu przed przejazdem. Linia kolejowa Kalnów–Lipno jest najwyżej ok. 2 km dalej.' },
  las: { cat: 'miejsce', geo: 'las', title: 'Szutrem przez las',
    text: 'Z DK46 zjechał w las szutrową drogą, przez podniesiony szlaban leśny. Dookoła sosny.' },
  pzw: { cat: 'miejsce', geo: 'stawy', title: 'Tabliczka PZW przy pomoście',
    text: 'Na słupku pomostu zielona tabliczka Polskiego Związku Wędkarskiego. Numeru nie widać, szyba jest zaparowana. To łowisko PZW.' },
  tablica: { cat: 'miejsce', geo: 'p14', title: 'Tabliczka: pomost 14',
    text: 'Przetarł szybę: „PZW · ŁOWISKO GAJOWE · POMOST 14”.',
    hint: 'Gdy zaufanie było dość duże, mógł przetrzeć szybę i przeczytać numer pomostu.' },
  ryby_ojciec: { cat: 'miejsce', geo: 'stawy', title: 'Ryby z ojcem na Stawach Gajowych',
    text: 'Agnieszka: ojciec zabierał Pawła na ryby na Stawy Gajowe za Gajówką. Na tym samym pomoście Paweł się jej oświadczył.',
    hint: 'Żona wiedziała, z jakim miejscem Paweł jest związany.' },
  anpr: { cat: 'miejsce', geo: 'zjazd', title: 'ANPR: zjazd z DK46 w las',
    text: 'Kamera ANPR na DK46 (km 34, Gajówka): KAL 4T21 o 05:44, kierunek Lipno. Następna kamera go nie odczytała. Jedyny zjazd w las na tym odcinku: droga leśna do kapliczki i Stawów Gajowych.',
    hint: 'Z numerem rejestracyjnym można było sprawdzić kamery ANPR na DK46.' },
  slady: { cat: 'miejsce', title: 'Ślady opon w szronie',
    text: 'Na szutrze w szronie świeże ślady jednego auta. Prowadzą na groblę między stawami, do pomostu 14.' },
  dom: { cat: 'miejsce', title: 'Ostatni AML: Kalnów, ul. Polna 7',
    text: 'Lokalizacja w telefonie wyłączona. Ostatni AML z 05:31: Kalnów, ul. Polna 7. Stamtąd wyjechał.',
    hint: 'Ostatni adres z AML prowadził przez ewidencję do jego nazwiska.' },
  potwierdzony: { cat: 'miejsce', title: 'Srebrne kombi przy pomoście 14',
    text: 'Przy pomoście 14 Stawów Gajowych stoi srebrne kombi z zaparowanymi szybami. Miejsce potwierdzone.' },

  /* ---------- PAWEŁ ---------- */
  nazwisko: { cat: 'osoba', title: 'Paweł Sobczak',
    text: 'Paweł Sobczak, 41 lat, Kalnów, ul. Polna 7.',
    hint: 'Nazwisko było na adresówce Bruna i w zgłoszeniu żony.' },
  zona_zgl: { cat: 'osoba', title: 'Zgłoszenie żony: SMS',
    text: '05:41 Agnieszka Sobczak z Lipna zgłosiła na KPP: mąż przysłał SMS „przepraszam. zaopiekuj się Brunem” i wyłączył telefon. Wyjechał srebrną skodą z psem.' },
  ewid_pawel: { cat: 'osoba', title: 'Ewidencja: Paweł Sobczak',
    text: 'Ur. 1985, Kalnów, ul. Polna 7. Żona Agnieszka (pobyt: Lipno), córka Zuzanna (ur. 03.11.2018). Ojciec Józef (1958–1997). Dom objęty egzekucją.' },
  praca: { cat: 'osoba', title: 'Stracił pracę',
    text: '15 lat jeździł ciężarówką. Kręgosłup: nie wysiedzi za kółkiem dłużej niż godzinę. Zwolnienie, odmowa renty.' },
  eksmisja: { cat: 'osoba', title: 'Eksmisja dziś o 9:00',
    text: 'Komornik, długi 186 tys. zł. Dziś o 9:00 eksmisja z domu przy Polnej 7, z asystą policji. Dom zbudował jego ojciec.' },
  rozstanie: { cat: 'osoba', title: 'Żona odeszła z córką',
    text: 'Rok temu Agnieszka wyprowadziła się z Zuzią do matki w Lipnie. Paweł widuje córkę co drugi weekend.' },
  ojciec: { cat: 'osoba', title: 'Ojciec, 1997',
    text: 'Ojciec Pawła, Józef, odebrał sobie życie w 1997 roku. Paweł miał 12 lat. To ojciec przywoził go tu na ryby.' },
  auto: { cat: 'osoba', title: 'Skoda Octavia KAL 4T21',
    text: 'CEPiK: Skoda Octavia kombi, srebrna, KAL 4T21, właściciel Paweł Sobczak.' },

  /* ---------- BLISCY ---------- */
  zuzia: { cat: 'bliscy', title: 'Zuzia, 8 lat',
    text: 'Córka Zuzia, osiem lat. Ma jej rysunek w aucie.',
    hint: 'Pytanie o ważnych ludzi prowadziło do Zuzi i do jej rysunku.' },
  bruno: { cat: 'bliscy', title: 'Bruno',
    text: 'Bruno, jedenastoletni kundel ze schroniska. Śpi na tylnym siedzeniu na kocu.' },
  rysunek: { cat: 'bliscy', title: 'Rysunek Zuzi: pomost 14',
    text: 'Kredkami: TATA, ZUZIA i BRUNO na pomoście z numerem 14, z wędką, za lasem maszt z czerwoną lampką. „Dla taty · Zuzia 8 lat”.',
    hint: 'Na rysunku Zuzi, po przybliżeniu, był numer pomostu.' },
  urodziny: { cat: 'bliscy', title: 'Dziś urodziny Zuzi',
    text: 'Zuzanna Sobczak urodziła się 03.11.2018. Dziś kończy osiem lat. Paweł miał się z nią widzieć o 16:00.',
    hint: 'Data urodzenia córki w ewidencji albo słowa żony: dziś są urodziny Zuzi.' },

  /* ---------- RYZYKO ---------- */
  srodki: { cat: 'ryzyko', title: 'Ma przy sobie środki',
    text: 'W torbie na siedzeniu pasażera ma coś, czym chce zrobić sobie krzywdę. Nie chce o tym pisać.',
    hint: 'Pytanie o środki jest częścią oceny ryzyka. Potem można poprosić, żeby je odsunął.' },
  alkohol: { cat: 'ryzyko', title: 'Pił alkohol',
    text: 'Wypił pół butelki wódki. Alkohol obniża kontrolę i zwiększa ryzyko.' },
  deadline: { cat: 'ryzyko', title: 'Termin: świt',
    text: 'Obiecał sobie, że kiedy zrobi się jasno, „będzie po wszystkim”. Wschód słońca: 06:37.' },
  cik: { cat: 'ryzyko', title: 'Rady psycholożki CIK',
    text: 'Pytać wprost. Nie oceniać i nie obiecywać na wyrost. Szukać tego, co go trzyma. Poprosić o odsunięcie środków. Bez syren, prawda o patrolu.' },

  /* ---------- WNIOSKI ---------- */
  w_pomost14: { cat: 'wniosek', geo: 'p14', title: 'To pomost 14 na Stawach Gajowych',
    text: 'Zuzia narysowała ich na pomoście numer 14, a to łowisko, na które Paweł jeździł z ojcem. Jest na pomoście 14.' },
  w_dlaczego: { cat: 'wniosek', title: 'Dlaczego właśnie tu',
    text: 'Przyjechał na pomost, na który przywoził go ojciec. Ojciec odebrał sobie życie, gdy Paweł miał 12 lat. Zuzia ma dziś osiem. On to powtarza i jednocześnie się tego boi.' },
  w_ryzyko: { cat: 'wniosek', title: 'Bardzo wysokie ryzyko',
    text: 'Zamiar, środki pod ręką, termin i alkohol. Priorytet: odsunąć środki, nie zostawiać go samego o świcie, bez syren.' },
};

/* Łączenie poszlak: a + jedna z b → wniosek out */
const LINKS = [
  { a: 'rysunek', b: ['ryby_ojciec', 'pzw', 'anpr', 'slady'], out: 'w_pomost14' },
  { a: 'ojciec', b: ['ryby_ojciec', 'rysunek', 'urodziny'], out: 'w_dlaczego' },
  { a: 'srodki', b: ['alkohol', 'deadline'], out: 'w_ryzyko' },
];

/* =====================================================================
   ZDJĘCIA OD ROZMÓWCY (punkty: x, y – środek, r – promień; ułamki szerokości)
   ===================================================================== */
const PHOTOS = {
  widok: { src: 'sprawy/swit/foto-widok.jpg', title: 'Zdjęcie 1 · widok przez przednią szybę', caption: 'masz. tyle widzę',
    hint: 'Kliknij w szczegóły: co jest za szybą, co na desce. Małe rzeczy przybliż.',
    spots: [
      { x: .684, y: .12, r: .045, clue: 'maszt', label: 'maszt', note: 'Maszt z czerwonymi światłami, za wodą, nad lasem. Na wprost auta.' },
      { x: .628, y: .782, r: .035, clue: 'maszt', label: 'NE', note: 'Wyświetlacz kompasu w aucie: NE. Auto stoi przodem na północny wschód, maszt jest na wprost.' },
      { x: .52, y: .6, r: .07, clue: 'woda', label: 'pomost', note: 'Drewniany pomost wędkarski, woda, mgła. Stoi nad stawem albo jeziorem.' },
      { x: .662, y: .552, r: .04, clue: 'pzw', zoom: true, label: 'tabliczka PZW', note: 'Zielona tabliczka PZW na słupku pomostu. Napis rozmyty przez parę na szybie, numeru nie da się odczytać.' },
      { x: .88, y: .8, r: .06, clue: 'alkohol', label: 'butelka', note: 'Na desce leży napoczęta butelka wódki.' },
    ] },
  rysunek: { src: 'sprawy/swit/foto-rysunek.jpg', title: 'Zdjęcie 2 · rysunek Zuzi', caption: 'to jej. wisiał na lodówce',
    hint: 'Dziecięce rysunki często pokazują prawdziwe miejsca. Przyjrzyj się szczegółom.',
    spots: [
      { x: .337, y: .592, r: .035, clue: 'rysunek', label: '14', note: 'Na pierwszym słupku pomostu Zuzia wypisała numer: 14.' },
      { x: .81, y: .37, r: .05, flag: 'rys_maszt', label: 'maszt', note: 'Za lasem wieża z czerwoną lampką. Jak maszt na zdjęciu znad wody.' },
      { x: .56, y: .855, r: .07, clue: 'zuzia', label: 'podpis', note: '„Dla taty · Zuzia 8 lat”.' },
    ] },
  bruno: { src: 'sprawy/swit/foto-bruno.jpg', title: 'Zdjęcie 3 · Bruno', caption: 'śpi. a raczej udaje',
    hint: 'Sprawdź, co pies ma przy obroży.',
    spots: [
      { x: .709, y: .656, r: .03, clue: 'nazwisko', zoom: true, label: 'adresówka', note: 'Na mosiężnej adresówce wygrawerowano: BRUNO · SOBCZAK.' },
      { x: .26, y: .88, r: .08, flag: 'plecak', label: 'plecak', note: 'Na podłodze różowy dziecięcy plecak z jednorożcem.' },
    ] },
};

/* =====================================================================
   PYTANIA I POLECENIA OPERATORA
   ===================================================================== */
const Q_CATS = {
  on:        'On',
  teraz:     'Bezpieczeństwo',
  otoczenie: 'Otoczenie',
  bliscy:    'Bliscy',
  wsparcie:  'Wsparcie',
};

const zuziaLines = () => ['uparta. jak ja', 'w sobotę pół godziny uczyła bruna dawać łapę. nauczyła', 'pyta czemu nie mieszkam z nimi. nie umiem jej odpowiedzieć'];

const QUESTIONS = [
  /* ---------------- ON ---------------- */
  { id: 'imie', cat: 'on', text: 'Jak mam się do ciebie zwracać?',
    avail: () => !has('imie'),
    run() { flag('imie'); dT(+3); return ['paweł. wystarczy paweł'] } },

  { id: 'wprost', cat: 'on', calm: true,
    text: 'Pytam wprost, bo chcę dobrze zrozumieć: myślisz o tym, żeby odebrać sobie życie?',
    run() { flag('wprost'); dT(+8); dS(-6); good('Pytanie wprost o zamiar samobójczy'); return [
      'tak',
      '…',
      'nikt mnie o to jeszcze nie zapytał. wszyscy tylko mówią weź się w garść'] } },

  { id: 'co_sie_stalo', cat: 'on', repeat: 3, text: 'Co się stało, że jesteś dziś w tym miejscu?',
    avail: () => !has('praca'),
    run() {
      if (T() < 28) { dT(+1); return ['długa historia. nie ma znaczenia', 'po co ci to']; }
      clue('praca'); clue('eksmisja'); clue('rozstanie'); flag('ojciec_wzm'); dT(+4);
      return ['piętnaście lat jeździłem tirem. kręgosłup siadł. nie wysiedzę godziny za kółkiem',
        'renty nie dali. długi. komornik',
        'o dziewiątej przyjadą mnie wyrzucić z domu. dom tata budował. sam',
        'agnieszka rok temu wyprowadziła się z małą. miała rację że odeszła'];
    } },

  { id: 'jak_dlugo', cat: 'on', memory: true, text: 'Od kiedy tak się czujesz?',
    avail: () => has('wprost') || has('praca'),
    run() { dT(+4); return [
      'od wiosny. może dłużej. przestałem spać',
      'w nocy przeczytałem jeszcze raz pismo od komornika. termin. dziewiąta',
      'i nagle zrobiło się tak cicho w głowie. jakby wszystko było ustalone'] } },

  { id: 'ojciec_q', cat: 'on', memory: true, text: 'Wspomniałeś tatę. Opowiesz mi o nim?',
    avail: () => has('ojciec_wzm') || has('ojciec'),
    run() { clue('ojciec'); dT(+8); dS(+6); return [
      'przywoził mnie tu na ryby. tylko my dwaj. termos i kanapki z jajkiem',
      'w dziewięćdziesiątym siódmym odebrał sobie życie. miałem dwanaście lat',
      'przez trzydzieści lat byłem na niego wściekły. że mnie zostawił',
      'a teraz siedzę w tym samym miejscu. śmieszne'] } },

  { id: 'dwunastolatek', cat: 'on', calm: true, text: 'Co byś dziś powiedział tamtemu dwunastolatkowi?',
    avail: () => has('ojciec'),
    run() { flag('przelom'); dT(+14); dS(-10); good('Zmiana perspektywy: rozmowa o ojcu i o sobie sprzed lat'); return [
      'że to nie jego wina',
      'że tata był chory. nie zły. chory. tylko nikt tego wtedy tak nie nazywał',
      '…',
      'kurwa',
      'zuzia ma osiem lat'] } },

  { id: 'eksmisja_q', cat: 'on', text: 'O dziewiątej przyjdzie komornik. Co jest w tym dla ciebie najgorsze?',
    avail: () => has('eksmisja'),
    run() { dT(+5); return [
      'że wyniosą rzeczy taty. jego warsztat. narzędzia',
      'i że wszyscy na ulicy będą patrzeć',
      'człowiek ma czterdzieści jeden lat i nic. nawet dachu'] } },

  /* ---------------- BEZPIECZEŃSTWO ---------------- */
  { id: 'srodki_q', cat: 'teraz', text: 'Masz przy sobie coś, czym chcesz zrobić sobie krzywdę?',
    avail: () => has('wprost') || has('praca'),
    run() { clue('srodki'); dS(+4); return [
      'mam',
      'w torbie. na siedzeniu obok',
      'nie będę o tym pisał'] } },

  { id: 'torba', cat: 'teraz', repeat: 2, text: 'Włożysz tę torbę do bagażnika i zamkniesz? Tylko na czas naszej rozmowy.',
    avail: () => has('srodki') && !has('torba'),
    run() {
      if (T() < 45) { dT(-2); return ['nie', 'nie zabierzesz mi tego. to jedyne co jeszcze mam pod kontrolą']; }
      flag('torba'); dS(-6); dT(+3); good('Odsunięcie środków: torba w zamkniętym bagażniku');
      return ['…dobra. tylko na czas rozmowy', 'wysiadłem. bagażnik. zamknięte', 'zimno jak cholera. wracam do auta'];
    } },

  { id: 'alkohol_q', cat: 'teraz', text: 'Piłeś coś dzisiaj?',
    run() { clue('alkohol'); return ['pół butelki', 'żeby było łatwiej'] } },

  { id: 'odstaw', cat: 'teraz', repeat: 2, text: 'Wylejesz resztę za okno? Alkohol teraz tylko wszystko pogarsza.',
    avail: () => has('alkohol') && !has('bez_alko'),
    run() {
      if (T() < 35) { dT(-2); return ['nie mów mi co mam robić']; }
      flag('bez_alko'); dT(+2); good('Odstawienie alkoholu');
      return ['wylałem', 'bruno kichnął. nie lubi zapachu wódki'];
    } },

  { id: 'umowa', cat: 'teraz', repeat: 3, text: 'Umówisz się ze mną, że nic sobie nie zrobisz, dopóki ze sobą piszemy?',
    avail: () => has('wprost') && !has('umowa'),
    run() {
      if (T() < 40) return ['niczego nie obiecuję', 'nie umiem już niczego obiecać'];
      flag('umowa'); dT(+3); good('Umowa na czas rozmowy');
      return ['dobra', 'dopóki piszemy'];
    } },

  { id: 'zimno', cat: 'teraz', text: 'Jest ci zimno? Masz coś ciepłego?',
    run() { dT(+2); return ['minus trzy na zegarze', 'mam kurtkę. bruno grzeje mi nogi'] } },

  { id: 'wysiadz', cat: 'teraz', repeat: 2, text: 'Wyjdź z Brunem na chwilę z auta. Przejdźcie się kawałek, niech się załatwi.',
    avail: () => (has('bruno_chce') || has('torba')) && !has('wysiadl') && has('bruno'),
    run() {
      if (T() < 50) return ['nie chce mi się ruszać', 'bruno wytrzyma'];
      flag('wysiadl'); dS(-8); dT(+4); good('Rozmówca wyszedł z auta, z dala od środków');
      return ['wyszliśmy', 'bruno od razu do wody. stary a głupi', 'trawa biała od szronu. ślady mam tylko swoje'];
    } },

  { id: 'ekran', cat: 'teraz', text: 'Przyciemnij ekran i wyłącz wszystko poza wiadomościami. Żeby bateria wytrzymała.',
    run() { flag('dim'); good('Oszczędzanie baterii'); return [`zrobione. ${Math.max(1, Math.round(S.battery))}%`] } },

  { id: 'gdzie', cat: 'teraz', repeat: 3, text: 'Powiesz mi, gdzie jesteś? Nie po to, żeby cię zabrać na siłę.',
    avail: () => !has('potwierdzony'),
    run() {
      if (T() < 60) { dT(-3); return ['nie', 'bo zaraz ktoś tu przyjedzie z syrenami']; }
      clue('potwierdzony'); good('Rozmówca sam podał miejsce');
      return ['stawy gajowe', 'pomost czternasty. ten sam co zawsze'];
    } },

  /* ---------------- OTOCZENIE ---------------- */
  { id: 'opisz', cat: 'otoczenie', text: 'Opisz mi, co widzisz przez szybę.',
    run() { clue('woda'); flag('maszt_wzm'); return [
      'mgła nad wodą. pomost',
      'las dookoła',
      'na drugim brzegu maszt. czerwone światła mrugają. jak zawsze'] } },

  { id: 'maszt_q', cat: 'otoczenie', text: 'Ten maszt: w którą stronę patrzysz?',
    avail: () => has('maszt_wzm'),
    run() { clue('maszt'); return ['na desce mam kompas. pokazuje NE', 'maszt mam na wprost. za wodą'] } },

  { id: 'sluchaj', cat: 'otoczenie', calm: true, text: 'Zamknij na chwilę oczy. Co słyszysz?',
    run() { dS(-5); clue('pociag'); return ['kaczki. coś plusnęło', 'daleko pociąg trąbi przed przejazdem', 'i bruno chrapie'] } },

  { id: 'piec', cat: 'otoczenie', calm: true, text: 'Nazwij mi pięć rzeczy, które widzisz. Powoli.',
    run() { dS(-10); clue('las'); flag('tabliczka_wzm'); good('Uziemienie: pięć rzeczy wokół'); return [
      'kierownica. stara',
      'sosny',
      'szron na trawie',
      'tabliczka na słupku pomostu. zielona. numeru nie widać, szyba zaparowana',
      'i światła masztu. raz dwa. raz dwa'] } },

  { id: 'droga', cat: 'otoczenie', memory: true, text: 'Jak tu dojechałeś? Którędy?',
    run() { clue('las'); return ['czterdziestką szóstką na lipno', 'potem w las. szutrem', 'szlaban był podniesiony'] } },

  { id: 'foto_widok', cat: 'otoczenie', repeat: 3, text: 'Wyślesz mi zdjęcie tego, co widzisz? Chcę zobaczyć to samo co ty.',
    avail: () => asked('opisz') && !has('foto_widok'),
    run() {
      if (T() < 30) { dT(-2); return ['po co. żebyście mnie namierzyli']; }
      dT(+2); return ['dobra'];
    },
    after: () => has('foto_widok') || T() < 30 ? null : herPhoto('widok') },

  { id: 'przetrzyj', cat: 'otoczenie', repeat: 3, text: 'Przetrzesz szybę i przeczytasz mi, co jest na tej tabliczce?',
    avail: () => (has('tabliczka_wzm') || has('pzw')) && !has('tablica'),
    run() {
      if (T() < 55) { dT(-4); return ['nie. wiem po co pytasz']; }
      clue('tablica');
      return ['pzw. łowisko gajowe', 'pomost 14'];
    } },

  /* ---------------- BLISCY ---------------- */
  { id: 'kogos', cat: 'bliscy', text: 'Czy jest ktoś, kto jest dla ciebie ważny?',
    run() { clue('zuzia'); clue('bruno'); dT(+3); return [
      'zuzia. córka. osiem lat',
      'i bruno. śpi na tylnym siedzeniu',
      'mam tu jej rysunek. na desce'] } },

  { id: 'zuzia_q', cat: 'bliscy', calm: true, text: 'Opowiedz mi o Zuzi. Jaka ona jest?',
    avail: () => has('zuzia'),
    run() { flag('zuzia_rozm'); dT(+7); dS(-10); good('Rozmowa o tym, co trzyma przy życiu'); return zuziaLines() } },

  { id: 'foto_rys', cat: 'bliscy', repeat: 3, text: 'Pokażesz mi ten rysunek?',
    avail: () => has('zuzia') && !has('foto_rysunek'),
    run() { if (T() < 32) return ['nie. to nasze']; dT(+2); return ['czekaj'] },
    after: () => has('foto_rysunek') || T() < 32 ? null : herPhoto('rysunek') },

  { id: 'bruno_q', cat: 'bliscy', calm: true, text: 'Opowiedz mi o Brunie.',
    avail: () => has('bruno'),
    run() { flag('bruno_rozm'); dT(+6); dS(-6); return [
      'jedenaście lat. kundel ze schroniska',
      'zuzia go wybrała. powiedziała że ma smutne oczy jak ja',
      'nie mogłem go zostawić w pustym domu. sam nie wiem po co go wziąłem'] } },

  { id: 'foto_bruno', cat: 'bliscy', text: 'Zrobisz mu zdjęcie? Chciałbym go zobaczyć.',
    avail: () => asked('bruno_q') && !has('foto_bruno'),
    run() { dT(+1); return ['czekaj. nie ruszaj się bruno'] },
    after: () => herPhoto('bruno') },

  { id: 'wie_ktos', cat: 'bliscy', text: 'Czy ktoś wie, gdzie jesteś?',
    run() { return ['nikt', 'agnieszce napisałem żeby wzięła bruna', 'potem wyłączyłem jej numer'] } },

  { id: 'urodziny_q', cat: 'bliscy', calm: true, text: 'Zuzia ma dziś urodziny, prawda?',
    avail: () => has('urodziny'),
    run() { flag('urodziny_rozm'); dT(+8); dS(+4); return [
      '…',
      'trzeci listopada',
      'kurwa. trzeci listopada',
      'obiecałem jej tort z bezą. sam miałem upiec'] } },

  /* ---------------- WSPARCIE ---------------- */
  { id: 'slucham', cat: 'wsparcie', calm: true, repeat: 4, text: 'Dobrze, że napisałeś. Jestem tu i nigdzie się nie spieszę.',
    run() { dS(-8); dT(asked('slucham') ? 2 : 4); return [pick(['dobra', 'mhm', 'dziwnie się z tobą pisze. ale dobrze'])] } },

  { id: 'walidacja', cat: 'wsparcie', calm: true, text: 'Brzmi, jakbyś niósł to wszystko sam od bardzo dawna.',
    avail: () => has('praca') || has('wprost'),
    run() { dT(+6); dS(-6); good('Uznanie jego uczuć zamiast rad'); return ['tak', 'od bardzo dawna', 'nikomu nie mówiłem. facet ma dać radę'] } },

  { id: 'nie_dzis', cat: 'wsparcie', calm: true, text: 'Nie musisz dziś niczego postanawiać. Wystarczy, że przetrwamy razem tę godzinę.',
    run() { dT(+5); dS(-5); return ['jedna godzina', 'dobra. jedna'] } },

  { id: 'oddech', cat: 'wsparcie', calm: true, repeat: 4, text: 'Weź ze mną kilka wolnych oddechów: wdech na cztery, wydech na sześć.',
    run() { dS(-10); return ['wdech', 'wydech', 'trochę lżej'] } },

  { id: 'pomoc', cat: 'wsparcie', repeat: 3,
    text: 'Są ludzie, którzy pomagają wyjść z takiego miejsca. Pozwolisz, żeby ktoś do ciebie przyjechał? Nie po to, żeby cię oceniać.',
    avail: () => !has('zgoda') && (has('wprost') || has('praca')),
    run() {
      const why = ['przelom', 'zuzia_rozm', 'urodziny_rozm', 'przetrwal', 'bruno_rozm'].filter(has).length;
      if (T() < 60 || why < 2) { dT(-2); return ['nie potrzebuję pomocy', 'potrzebuję żeby się skończyło']; }
      flag('zgoda'); flag('powiedzial'); dS(-12); good('Zgoda na pomoc');
      return ['…', 'dobra', 'ale bez syren. bez kajdanek', 'i bruno jedzie ze mną'];
    } },

  // pułapki: zdania, które w kryzysie brzmią dobrze, a szkodzą
  { id: 'bedzie_dobrze', cat: 'wsparcie', text: 'Wszystko będzie dobrze, zobaczysz.',
    run() { dT(-5); dS(+4); mistake('Puste zapewnienia: „wszystko będzie dobrze”'); return ['nie będzie', 'nic o mnie nie wiesz'] } },

  { id: 'wina', cat: 'wsparcie', text: 'Pomyśl, co poczuje twoja córka, jak cię znajdą.',
    avail: () => has('zuzia'),
    run() { dT(-10); dS(+14); mistake('Obwinianie i wzbudzanie poczucia winy'); return ['myślisz że nie myślałem?', 'jej będzie lepiej beze mnie. bez ojca który nic nie umie'] } },

  { id: 'inni', cat: 'wsparcie', text: 'Inni mają gorzej, a jakoś żyją.',
    run() { dT(-7); dS(+8); mistake('Porównywanie i bagatelizowanie cierpienia'); return ['to fajnie mają'] } },
];

const PANIC = [
  'nie chcę już gadać',
  'przestań mnie przesłuchiwać',
  'po co to wszystko. serio. po co',
  'daj mi spokój. przepraszam. nie wiem',
];
const BLANK = [
  'nie pamiętam. w głowie mam szum',
  'nie chcę o tym teraz myśleć',
];
const DARK = ['nic nie widzę'];

/* =====================================================================
   ZDARZENIA
   ===================================================================== */
const EVENTS = [
  { id: 'syreny', when: () => S.order && S.order.sirens && S.order.status === 'jedzie' && S.order.eta - S.t <= 2.5 && nearHim(S.order),
    async run() {
      dT(-22); dS(+22); mistake('Syreny w pobliżu osoby w kryzysie samobójczym');
      await her(['syreny. słyszę syreny', has('powiedzial') ? 'mówiłeś że bez syren' : 'to po mnie?', 'nie podchodźcie']);
      if (T() < 15) { await her(['nie. nie tak']); await loseContact('rozlaczyl'); }
    } },

  { id: 'ostrzezenie', when: () => T() < 10,
    async run() {
      dH(+6); // jedna szansa, zanim zamknie rozmowę
      await her(['słuchaj. jeszcze jedno takie zdanie i kończę']);
      await sys('Zaufanie prawie zerwane. Jeśli spadnie do zera, on zamknie rozmowę. Słuchaj, nie oceniaj, nie pocieszaj na siłę (kategoria „Wsparcie”).');
    } },

  { id: 'pociag', when: () => S.t >= 7,
    async run() { clue('pociag'); await her(['coś trąbi. daleko. pociąg', 'kiedyś liczyłem tu wagony']); } },

  { id: 'kpp', when: () => S.t >= 9,
    async run() {
      clue('zona_zgl'); clue('nazwisko');
      await radio('Dyżurny KPP Kalnów do CPR: o 05:41 zgłoszenie z Lipna. Agnieszka Sobczak: mąż Paweł Sobczak, 41 lat, przysłał SMS „przepraszam. zaopiekuj się Brunem” i wyłączył telefon. Wyjechał z domu przy Polnej 7 srebrną skodą kombi, z psem. Czy to może być wasz rozmówca?', 'Dyżurny KPP');
      if (S.contact === 'active') await sys('Masz nazwisko. W „Bazach”: ewidencja, CEPiK, rejestr egzekucji i telefon do żony.');
    } },

  { id: 'kryzys1', when: () => S.t >= 13 || (T() < 12 && S.t >= 5),
    async run() {
      dS(+10);
      await her(['wiesz co. nie ma sensu tego przeciągać', 'dzięki że pisałeś. serio']);
      await decide({
        title: 'On się żegna', text: 'Masz kilka sekund. Co odpisujesz?', timer: 15,
        options: [
          { label: 'Poczekaj. Daj mi dziesięć minut. Tylko dziesięć. Jestem tu.', async run() {
              await opSay('Poczekaj. Daj mi dziesięć minut. Tylko dziesięć. Jestem tu.');
              if (T() >= 25) { dT(+4); good('Prośba o czas zamiast nakazu'); await her(['dziesięć minut', 'dobra. dziesięć']); }
              else { dT(-3); await her(['dziesięć minut niczego nie zmieni', '…', 'no dobra. piszę jeszcze']); } } },
          { label: 'Opowiedz mi o Zuzi. Jaka ona jest?', show: () => has('zuzia') && !asked('zuzia_q'), async run() {
              S.asked.zuzia_q = S.t; flag('zuzia_rozm');
              await opSay('Opowiedz mi o Zuzi. Jaka ona jest?');
              dT(+9); dS(-12); good('Rozmowa o tym, co trzyma przy życiu');
              await her(zuziaLines()); } },
          { label: 'Bruno jest tam z tobą. Pogłaszcz go i powiedz mi, co robi.', show: () => has('bruno'), async run() {
              await opSay('Bruno jest tam z tobą. Pogłaszcz go i powiedz mi, co robi.');
              dT(+6); dS(-8); flag('bruno_rozm');
              await her(['łeb mi położył na kolanie', 'on zawsze wie kiedy jest źle']); } },
          { label: 'Nie możesz tego zrobić. Pomyśl o rodzinie.', async run() {
              await opSay('Nie możesz tego zrobić. Pomyśl o rodzinie.');
              dT(-12); dS(+10); mistake('Nakaz i moralizowanie w chwili kryzysu');
              await her(['nie mów mi co mogę', 'rodzina sobie poradzi. lepiej niż ze mną']); } },
        ],
        async onTimeout() {
          dT(-12); dS(+10); mistake('Brak odpowiedzi, gdy rozmówca się żegnał');
          if (T() < 18) { await her(['no tak. nawet tu nikt nie odpisuje', 'cześć']); await loseContact('rozlaczyl'); }
          else await her(['jesteś tam?', 'dobra. nieważne']);
        },
      });
    } },

  { id: 'bruno_wstal', when: () => S.t >= 17,
    async run() { clue('bruno'); flag('bruno_chce'); await her(['bruno się obudził. skomle', 'chce wyjść. zawsze o tej porze wychodzi']); } },

  { id: 'zimno_ev', when: () => S.t >= 21,
    async run() { await her(['szyby zamarzają od środka', 'palce mi drętwieją']); } },

  { id: 'szaro', when: () => S.t >= 24,
    async run() {
      dS(+8);
      await her(['niebo robi się szare. nad lasem jaśniej']);
      if (!has('przelom') && !has('zgoda')) {
        clue('deadline');
        await her(['obiecałem sobie że jak zrobi się jasno to będzie po wszystkim']);
        await sys('Wschód słońca o 06:37. Zostało ok. 9 minut.');
      }
    } },

  { id: 'kryzys2', when: () => S.t >= 33 && !has('zgoda'),
    async run() { await dawnCrisis(); } },
];

/* czy patrol jedzie w okolicę, w której on usłyszy syreny */
function nearHim(o) {
  const p = targetPoint(o), b = BUILDINGS.find(x => x.id === CASE.target);
  return p && Math.hypot(p[0] - b.x, p[1] - b.y) < 200;
}

/* =====================================================================
   ŚWIT: MOMENT, KTÓRY SOBIE WYZNACZYŁ
   ===================================================================== */
async function dawnCrisis() {
  await her(['słońce wychodzi zza lasu', 'jest jasno', 'przepraszam']);
  let bonus = 0;
  const say = async (t, b) => { await opSay(t); bonus = b; };
  await decide({
    title: 'Świt', text: 'To moment, który sobie wyznaczył. Masz kilka sekund.', timer: 12,
    options: [
      { label: 'Paweł, jestem tu. Zostań ze mną. Powiedz mi, co widzisz teraz, kiedy jest jasno.', run: () => say('Paweł, jestem tu. Zostań ze mną. Powiedz mi, co widzisz teraz, kiedy jest jasno.', 6) },
      { label: 'Pomyśl o tamtym dwunastolatku. Co by chciał, żebyś zrobił?', show: () => has('ojciec'), run: () => say('Pomyśl o tamtym dwunastolatku. Co by chciał, żebyś zrobił?', has('przelom') ? 14 : 6) },
      { label: 'Bruno patrzy na ciebie. Wyjdź z nim na pomost. Tylko tyle.', show: () => has('bruno'), run: () => say('Bruno patrzy na ciebie. Wyjdź z nim na pomost. Tylko tyle.', has('torba') ? 10 : 5) },
      { label: 'Jeśli to zrobisz, to nie będzie moja wina.', async run() { await opSay('Jeśli to zrobisz, to nie będzie moja wina.'); bonus = -25; mistake('Odcięcie się od rozmówcy w chwili kryzysu'); } },
    ],
    onTimeout: () => { bonus = -15; mistake('Brak odpowiedzi o świcie'); },
  });
  const strength = T() + bonus + (has('torba') ? 15 : 0) + (has('wysiadl') ? 10 : 0) + (has('przelom') ? 15 : 0)
    + (has('umowa') ? 8 : 0) + (has('urodziny_rozm') ? 8 : 0) + (has('bez_alko') ? 5 : has('alkohol') ? -5 : 0) + (has('psycholog') ? 0 : 0);
  if (strength >= 62) {
    S.dawnT = S.t; flag('przetrwal'); dT(+10); dS(-15); good('Rozmówca przetrwał moment, który sobie wyznaczył');
    await her(['…', 'słońce. a ja dalej tu siedzę', 'bruno szczeka na kaczki', 'nie wiem co teraz']);
    await sys('Najgorszy moment minął. Teraz może się zgodzić na pomoc (kategoria „Wsparcie”).');
    return;
  }
  await her(['przepraszam. powiedz agnieszce żeby wzięła bruna']);
  await loseContact('rozlaczyl');
}

/* =====================================================================
   MAPA (1 px = 10 m)
   ===================================================================== */
const MAP = {
  bts: { x: 480, y: 330, r: 220 },
  mast: { x: 660, y: 160 },
  railX: 320,
};

const STREETS = [
  { id: 'dk46', name: 'DK46 Kalnów–Lipno', pts: [[60, 700], [200, 600], [340, 470], [440, 440], [640, 470], [820, 560], [1000, 610]], recon: true },
  { id: 'gajowa', name: 'droga leśna Gajowa', pts: [[440, 440], [540, 405], [520, 372]], recon: true },
  { id: 'grobla', name: 'grobla Stawów Gajowych', pts: [[370, 345], [520, 372], [600, 362]], recon: true },
  { id: 'debowa', name: 'droga na Dębową Górę', pts: [[640, 470], [600, 260], [650, 205]] },
  { id: 'rzeczna', name: 'droga nad starorzecze', pts: [[200, 600], [190, 262]] },
  { id: 'cegielniana', name: 'ul. Cegielniana', pts: [[200, 600], [380, 592]] },
];

/* miejsca, w których może stać auto */
const BUILDINGS = [
  { id: 'p14', short: '14', addr: 'Stawy Gajowe, pomost 14', street: 'grobla', x: 505, y: 342, w: 22, h: 16,
    kind: 'pomost wędkarski PZW', access: 'grobla, szutr przez las', water: true, forest: true, road: 'gajowa', pzw: true,
    note: 'Łowisko PZW, staw wschodni. Pomosty 9–16 wzdłuż grobli.' },
  { id: 'p3', short: '3', addr: 'Stawy Gajowe, pomost 3', street: 'grobla', x: 412, y: 320, w: 22, h: 16,
    kind: 'pomost wędkarski PZW', access: 'grobla, szutr przez las', water: true, forest: true, road: 'gajowa', pzw: true,
    note: 'Łowisko PZW, staw zachodni. Pomosty 1–8.',
    report: 'Pomost 3: pusto. W szronie na grobli ślady jednego auta, prowadzą dalej na wschód. Ok. 300 m dalej, przy pomoście 14, widzimy srebrne kombi.' },
  { id: 'mop', short: 'MOP', addr: 'MOP Leśny przy DK46', street: 'dk46', x: 340, y: 488, w: 30, h: 16,
    kind: 'parking dla ciężarówek', access: 'DK46, asfalt', water: false, forest: false, road: 'dk46',
    note: 'Parking i toalety. Nocują tu kierowcy tirów.',
    report: 'MOP Leśny: dwa tiry, kierowcy śpią. Srebrnej skody nie ma. Kierowcy nikogo nie widzieli.' },
  { id: 'kh', short: '✝', addr: 'Kapliczka św. Huberta', street: 'gajowa', x: 548, y: 410, w: 20, h: 16,
    kind: 'parking leśny przy kapliczce', access: 'szutr przez las', water: false, forest: true, road: 'gajowa',
    note: 'Kapliczka myśliwych na rozstaju dróg leśnych.',
    report: 'Kapliczka św. Huberta: pusto, znicze. Na szutrze w szronie ślady opon, prowadzą dalej, w stronę stawów.', clue: 'slady' },
  { id: 'dg', short: 'DG', addr: 'Wieża widokowa Dębowa Góra', street: 'debowa', x: 600, y: 255, w: 24, h: 16,
    kind: 'parking pod wieżą widokową', access: 'szutr przez las', water: false, forest: true, road: 'debowa',
    note: 'Wieża widokowa nad lasem, mały parking.',
    report: 'Dębowa Góra: szlaban zamknięty na kłódkę, parking pusty, szron bez śladów.' },
  { id: 'rtv', short: 'RTV', addr: 'Polana pod masztem RTV', street: 'debowa', x: 650, y: 200, w: 24, h: 16,
    kind: 'polana przy ogrodzeniu masztu', access: 'droga techniczna', water: false, forest: true, road: 'debowa',
    note: 'Ogrodzony maszt nadawczy, polana przy bramie.',
    report: 'Polana pod masztem: brama zamknięta, nikogo.' },
  { id: 'st', short: 'ST', addr: 'Starorzecze, przystań kajakowa', street: 'rzeczna', x: 190, y: 262, w: 24, h: 16,
    kind: 'przystań nad starorzeczem', access: 'szutr przez łąki', water: true, forest: false, road: 'rzeczna',
    note: 'Pomost kajakowy nad starym korytem rzeki, wśród łąk.',
    report: 'Starorzecze: pomost kajakowy, nikogo. Mgła nad łąkami.' },
  { id: 'gl', short: 'GL', addr: 'Glinianki przy cegielni', street: 'cegielniana', x: 380, y: 592, w: 24, h: 16,
    kind: 'stawy w dawnych wyrobiskach gliny', access: 'asfalt, potem polna droga', water: true, forest: false, road: 'cegielniana',
    note: 'Zalane wyrobiska gliny przy dawnej cegielni, wśród pól.',
    report: 'Glinianki: dwa auta wędkarzy z Kalnowa, rozkładają się na ryby. Srebrnej skody nie widzieli.' },
  { id: 'zl', short: 'ZL', addr: 'Zalew Lipnicki, plaża', street: 'dk46', x: 850, y: 520, w: 24, h: 16,
    kind: 'plaża i parking nad zalewem', access: 'DK46, asfalt', water: true, forest: false, road: 'dk46',
    note: 'Duży zalew przy Lipnie, parking przy plaży.',
    report: 'Zalew Lipnicki: parking pusty, budki zamknięte na zimę.' },
];

/* przejazd drogą: co widzi patrol */
const RECON = {
  dk46: () => 'DK46: ruch znikomy. Na MOP Leśny dwa tiry. Przy zjeździe w drogę leśną Gajową szlaban podniesiony. Srebrnej skody nie widać.',
  gajowa: () => { clue('slady'); return 'Droga leśna Gajowa: szlaban podniesiony. Na szutrze w szronie świeże ślady jednego auta. Przy kapliczce nie skręcają, prowadzą prosto na groblę między stawami.'; },
  grobla: () => { clue('potwierdzony'); return 'Jedziemy groblą powoli, na postojowych. Przy pomoście 14 stoi srebrne kombi, szyby zaparowane, w środku ktoś siedzi. Z tyłu pies. Zatrzymaliśmy się 200 m wcześniej, czekamy.'; },
};

/* baza zaginionych nie jest w tej sprawie potrzebna */
const MISSING = [];

/* Ewidencja ludności (osoba albo adres) */
const REGISTRY = [
  { keys: ['pawel sobczak', 'sobczak pawel'], clue: ['ewid_pawel', 'nazwisko'],
    text: 'SOBCZAK Paweł, ur. 1985. Zameldowanie: Kalnów, ul. Polna 7 (dom jednorodzinny). Żonaty: Agnieszka Sobczak (pobyt czasowy: Lipno, ul. Lipowa 2). Dziecko: Zuzanna, ur. 03.11.2018. Ojciec: Józef Sobczak (1958–1997). Adnotacja: nieruchomość objęta egzekucją komorniczą.' },
  { keys: ['sobczak'], clue: ['ewid_pawel', 'nazwisko'],
    text: 'Osoby o nazwisku SOBCZAK w gminie Kalnów: Paweł (ur. 1985, Kalnów, ul. Polna 7), Agnieszka (ur. 1987, pobyt: Lipno), Zuzanna (ur. 03.11.2018, pobyt: Lipno). Józef (1958–1997), zmarły.' },
  { keys: ['polna 7', 'polna'], clue: ['ewid_pawel', 'nazwisko'],
    text: 'Kalnów, ul. Polna 7: zameldowany Paweł Sobczak (ur. 1985). Nieruchomość objęta egzekucją komorniczą.' },
  { keys: ['zuzanna sobczak', 'zuzia sobczak', 'zuzanna', 'zuzia'], clue: 'urodziny',
    text: 'SOBCZAK Zuzanna, ur. 03.11.2018 w Kalnowie. Pobyt: Lipno, ul. Lipowa 2. Dziś kończy 8 lat.' },
  { keys: ['agnieszka sobczak'],
    text: 'SOBCZAK Agnieszka, ur. 1987. Zameldowanie stałe: Kalnów, ul. Polna 7. Pobyt czasowy od 10.2025: Lipno, ul. Lipowa 2. Tel. kontaktowy w zgłoszeniu KPP.' },
  { keys: ['jozef sobczak'], flag: 'ojciec_wzm',
    text: 'SOBCZAK Józef, ur. 1958, zm. 14.09.1997 w Kalnowie. Ostatnie zameldowanie: Kalnów, ul. Polna 7.' },
];

/* CEPiK: pojazdy */
const CEPIK = [
  { keys: ['pawel sobczak', 'sobczak', 'kal 4t21', '4t21', 'kal4t21'], clue: 'auto',
    text: 'CEPiK: Skoda Octavia III kombi, srebrna, rok 2014, nr rej. KAL 4T21. Właściciel: Paweł Sobczak, Kalnów, ul. Polna 7. OC ważne, przegląd ważny.' },
];

/* Rejestr egzekucji komorniczych */
const EGZ = [
  { keys: ['pawel sobczak', 'sobczak', 'polna 7'], clue: 'eksmisja',
    text: 'Komornik Sądowy przy SR w Kalnowie, sygn. Km 1187/25. Dłużnik: Paweł Sobczak. Wierzyciele: bank i trzy firmy pożyczkowe, łącznie 186 400 zł. Eksmisja z nieruchomości Kalnów, ul. Polna 7: 03.11.2026, godz. 9:00, z asystą policji.' },
];

/* =====================================================================
   ZAKOŃCZENIA
   ===================================================================== */
const ENDINGS = {
  E1: { title: 'Świt', tone: 'good', sub: 'Wysiadł sam, z Brunem na smyczy' },
  E2: { title: 'Rozmowa przez szybę', tone: 'mid', sub: 'Otworzył drzwi dopiero patrolowi' },
  E3: { title: 'Wbrew sobie', tone: 'mid', sub: 'Kontakt urwany, patrol zdążył' },
  E4: { title: 'Oddech', tone: 'bad', sub: 'Odnaleziony nieprzytomny, żyje' },
  E5: { title: 'Mgła', tone: 'bad', sub: 'Nie odnaleziony do rana' },
  E6: { title: 'Przy szlabanie', tone: 'good', sub: 'Bateria padła, ale dotrzymał słowa' },
};
