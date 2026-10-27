'use strict';
/* =====================================================================
   Oddział zamknięty (18+) – dane fabuły
   Noc Wszystkich Świętych, dawny szpital psychiatryczny w Borku pod
   Kalnowem. Kinga ukrywa się w sali 12 Oddziału III (pawilon C,
   1 piętro). Dawid leży w izolatce 3 w piwnicy pawilonu D. Sprawca:
   Edmund Kubiak, były sanitariusz, który „prowadzi oddział” od 1998 r.
   ===================================================================== */

const CLUE_CATS = {
  miejsce: { name: 'Miejsce',             icon: '⌖' },
  ekipa:   { name: 'Ekipa i zaginieni',   icon: '◉' },
  sprawca: { name: 'Sprawca',             icon: '⚠' },
  zdrowie: { name: 'Zdrowie',             icon: '✚' },
  wniosek: { name: 'Wnioski',             icon: '∴' },
};

const CLUES = {
  /* ---------- MIEJSCE ---------- */
  aml: { cat: 'miejsce', geo: 'aml', title: 'Pozycja AML ±90 m',
    text: 'Telefon jest na terenie dawnego szpitala w Borku, z dokładnością ok. 90 m. W okręgu leżą pawilony C i D oraz prosektorium.',
    hint: 'Lokalizacja AML od razu zawężała teren do trzech budynków.' },
  sala: { cat: 'miejsce', geo: 'krata', title: 'Sala z kratą w oknie',
    text: 'Mała sala chorych: dwa metalowe łóżka z pasami, okno z kratą, drzwi z wizjerem. Zastawiła je krzesłem. Kraty w oknach miały tylko oddziały.' },
  znicze: { cat: 'miejsce', geo: 'cmentarz', title: 'Łuna zniczy za oknem',
    text: 'Za oknem czerwona łuna tysięcy zniczy. Dziś Wszystkich Świętych, a cmentarz parafialny przylega do muru szpitala od wschodu. Okno wychodzi na wschód.',
    hint: 'Za oknem świeciły znicze, więc okno wychodziło na wschód, na cmentarz.' },
  wieza: { cat: 'miejsce', geo: 'wieza', title: 'Wieża ciśnień po lewej',
    text: 'Gdy patrzy na znicze, po lewej, ok. 80 m dalej, stoi gruba ceglana wieża z czerwoną lampką, a po prawej kaplica ze zniczami w okienku. Wieża jest więc na północ od jej budynku.',
    hint: 'Wieża ciśnień po lewej stronie okna wskazywała jeden pawilon.' },
  pietro: { cat: 'miejsce', geo: 'pietro', title: 'Pierwsze piętro, wejście z tunelu',
    text: 'Z tunelu weszła schodami dwa półpiętra w górę, a czubki drzew są pod parapetem. To pierwsze piętro budynku połączonego z tunelami.',
    hint: 'Pytanie o drogę i schody dawało piętro i połączenie z tunelem.' },
  opaska: { cat: 'miejsce', title: 'Opaska: Oddz. III, sala 12',
    text: 'Na drugim łóżku leżała nowa koszula szpitalna i opaska na rękę: „LIS KINGA · ODDZ. III · SALA 12 · PRZYJĘTA 01.11”. Ktoś na nią czekał.',
    hint: 'Na przygotowanym łóżku leżała opaska z numerem oddziału. Plany szpitala mówiły, który to pawilon.' },
  graffiti: { cat: 'miejsce', title: 'Graffiti „ZBYCHU 2009”',
    text: 'Na ścianie korytarza naprzeciw jej drzwi: ZBYCHU 2009 i czaszka. Urbexowcy fotografują takie napisy i wrzucają na fora.',
    hint: 'Graffiti z korytarza można było znaleźć na forum urbexowym.' },
  forum_c: { cat: 'miejsce', geo: 'forum', title: 'Forum: pawilon C, 1 piętro',
    text: 'Zdjęcie z forum Opuszczone.pl (2021): graffiti ZBYCHU 2009 z czaszką, podpis „Borek, pawilon C (męski), 1 piętro, wschodnie skrzydło”.' },
  kabel: { cat: 'miejsce', title: 'Kabel w tunelu',
    text: 'W tunelu pod ścianą biegnie gruby, nowy kabel przypięty opaskami. Prowadzi tam, skąd słychać silnik, i dalej pod jeden z pawilonów.' },
  plany: { cat: 'miejsce', title: 'Plany szpitala',
    text: 'Archiwum: A – administracja; B – Oddz. I i II (kobiece), w piwnicy hydroterapia; C – Oddz. III (męski): piwnica, parter, piętro; D – oddział zamknięty, parterowy, izolatki w piwnicy; E – kuchnia i pralnia; tunele z kuchni do B, C, D i kotłowni.',
    hint: 'Archiwalne plany mówiły, który pawilon to Oddział III i gdzie są izolatki.' },
  swiatlo_c: { cat: 'miejsce', geo: 'swiatlo', title: 'Światło w oknie pawilonu C',
    text: 'Patrol spod muru cmentarza: w oknie na piętrze pawilonu C, wschodnie skrzydło, słabe czerwonawe światło, jak latarka przez palce.' },
  potwierdzony: { cat: 'miejsce', title: 'Błyski latarki: pawilon C',
    text: 'Patrol spod muru widział trzy błyski latarki w oknie pierwszego piętra, wschodnie skrzydło pawilonu C. Miejsce potwierdzone.' },

  /* ---------- EKIPA I ZAGINIENI ---------- */
  ekipa: { cat: 'ekipa', title: 'Troje urbexerów',
    text: 'Kinga Lis, Dawid Mrozek i Szymon „Szymek” Bała weszli ok. 23:30 dziurą w murze od strony cmentarza. Nagrywali transmisję na żywo.' },
  dawid_tunel: { cat: 'ekipa', title: 'Dawid zszedł do tuneli',
    text: 'Ok. 00:25 Dawid zszedł do tunelu pod kuchnią sprawdzić stukanie. Krzyknął imię Kingi i ucichł.' },
  live: { cat: 'ekipa', title: 'Transmisja „Strefa Zero”',
    text: 'Szymek trzymał telefon, który nadawał na żywo na kanale Strefa Zero w serwisie Streamio. Nagranie z transmisji może pokazywać, gdzie byli.',
    hint: 'Kanał Strefa Zero prowadził do zapisu transmisji, a ten do miejsca, w którym jest Dawid.' },
  stream: { cat: 'ekipa', title: 'Ostatnie minuty transmisji',
    text: 'Telefon Szymka leżał na podłodze piwnicznego korytarza: tabliczka „ODDZIAŁ ZAMKNIĘTY – IZOLATKI”, drzwi z judaszami. O 00:39 obraz zasłania biały fartuch i maska gazowa. Transmisja się urywa.' },
  szymek: { cat: 'ekipa', title: 'Szymek odnaleziony przy cmentarzu',
    text: 'Szymon Bała, ranny, wyszedł dziurą w murze do ludzi przy grobach. Widział, jak człowiek w masce wciąga Dawida w tunel, „tam, gdzie okienka piwnic są przy samej ziemi i mają kraty”.' },
  zabieg: { cat: 'ekipa', title: '„Zabieg o 1:30”',
    text: 'Z głośników: „Pacjent Dawid Mrozek przyjęty na oddział zamknięty. Zabieg zaplanowano na godzinę pierwszą trzydzieści”. Dawid żyje, jest na oddziale zamkniętym i ma czas do 01:30.',
    hint: 'Głos z głośników powiedział, gdzie jest Dawid i ile ma czasu.' },
  ciala: { cat: 'ekipa', title: 'Sala 14',
    text: 'W sali obok trzy łóżka. Na nich, przypięte pasami, ciała w koszulach szpitalnych, od dawna martwe. Pościel jest świeża.' },
  legitymacja: { cat: 'ekipa', title: 'Legitymacja Ewy Malinowskiej',
    text: 'Na szafce w sali 14 leży legitymacja studencka: Ewa Malinowska, ważna do 2019 roku.' },
  zaginieni: { cat: 'ekipa', title: 'Zaginieni z Borku',
    text: 'Baza zaginionych: Ewa Malinowska i Patryk Nowak (urbexowcy, czerwiec 2019) oraz Zenon Wilk (bezdomny, styczeń 2022). Wszyscy ostatnio w Borku.' },

  /* ---------- SPRAWCA ---------- */
  maska: { cat: 'sprawca', title: 'Człowiek w masce gazowej',
    text: 'Starsza sylwetka w długim białym fartuchu i starej masce gazowej. Stał na końcu korytarza w świetle latarki i przechylał głowę jak pies.' },
  glos: { cat: 'sprawca', title: 'Głos z głośników',
    text: 'Spokojny, starszy mężczyzna, mówi jak lekarz na obchodzie. Głośniki trzeszczą, w tle równe pikanie aparatury.' },
  agregat: { cat: 'sprawca', title: 'Agregat prądotwórczy',
    text: 'Gdzieś na terenie warczy agregat prądotwórczy. To on zasila głośniki i żarówki na korytarzach. Teren nie ma przyłącza prądu od 1998 roku.' },
  dym: { cat: 'sprawca', title: 'Dym z wentylacji',
    text: 'Z kratki wentylacyjnej czuć dym jak z piecyka. Ktoś tu mieszka i pali w piecu.' },
  legenda: { cat: 'sprawca', title: 'Legenda z forów',
    text: 'Na forach pisano, że w Borku „ktoś mieszka”, stróż albo „duch sanitariusza”, i że w 2019 roku zniknęła tu para urbexowców.' },
  zgloszenia: { cat: 'sprawca', title: 'Zgłoszenia z Borku',
    text: 'KPP: zaginięcia 2019 i 2022, skargi na nocne komunikaty z megafonów (2023), zgłoszenie bezdomnego „ktoś trzyma ludzi w pawilonie D” (2025), zamknięte po rozmowie ze stróżem E. Kubiakiem.',
    hint: 'Wcześniejsze zgłoszenia z Borku wskazywały pawilon D i stróża.' },
  wlasciciel: { cat: 'sprawca', title: 'Właściciel terenu',
    text: 'Księgi wieczyste: teren szpitala należy do Borek Development sp. z o.o. Spółka ma całodobowy numer ochrony.' },
  stroz: { cat: 'sprawca', title: 'Stróż: „pan Edmund”',
    text: 'Ochrona: terenu od zamknięcia szpitala pilnuje Edmund Kubiak, wcześniej sanitariusz na oddziale zamkniętym. Mieszka w portierni, nie ma komórki.',
    hint: 'Telefon do ochrony terenu dawał nazwisko stróża.' },
  ewid_kubiak: { cat: 'sprawca', title: 'Edmund Kubiak – ewidencja',
    text: 'Ur. 1961. Zameldowany: Borek, ul. Szpitalna 1 (portiernia). 1982–1998 sanitariusz Szpitala w Borku. 1998: trzy miesiące hospitalizacji psychiatrycznej.' },
  karta: { cat: 'sprawca', title: 'Karta sanitariusza',
    text: 'W administracji ktoś ułożył karty personelu w równe stosy. Na wierzchu: „Kubiak Edmund – sanitariusz, Oddz. zamknięty, 1982–1998”.' },
  lista: { cat: 'sprawca', title: 'Lista przyjęć z portierni',
    text: 'Na stole w portierni, równym pismem: „Przyjęcia 31.10/01.11: Mrozek D. – izolatka 3. Lis K. – sala 12, Oddz. III. Bała S. – zbiegł”.' },
  slady_e: { cat: 'sprawca', title: 'Ślady wleczenia w kuchni',
    text: 'W kuchni pawilonu E świeże ślady wleczenia i krwi prowadzą w tunel w stronę pawilonu D.' },
  izolatki_swiatlo: { cat: 'sprawca', title: 'Światło w piwnicy pawilonu D',
    text: 'Spod muru widać słabe światło w zakratowanych okienkach piwnicy pawilonu D, przy samej ziemi. Słychać agregat.' },
  slady_c: { cat: 'sprawca', title: 'Pusta sala 12',
    text: 'Sala 12 pusta, krzesło przewrócone. Krwawe ślady z jej rany prowadzą schodami w dół, do tunelu w stronę pawilonu D.' },

  /* ---------- ZDROWIE ---------- */
  noga: { cat: 'zdrowie', title: 'Rozcięta łydka',
    text: 'Głęboko rozcięła łydkę o szkło w tunelu. Krwawi mocno, spodnie są przesiąknięte.' },
  hiper: { cat: 'zdrowie', title: 'Atak paniki',
    text: 'Bardzo szybki oddech, mrowienie dłoni, zawroty głowy. Hiperwentylacja ze strachu.' },
  zimno: { cat: 'zdrowie', title: 'Wychłodzenie',
    text: 'Mokra kurtka, 2°C, siedzi na lastryko. Trzęsie się.' },

  /* ---------- WNIOSKI ---------- */
  w_oddz3: { cat: 'wniosek', geo: 'oddz3', title: 'Oddział III to pawilon C',
    text: 'Opaska mówi „Oddz. III, sala 12”, a plany: Oddział III mieścił się w pawilonie C. Kinga jest w pawilonie C, sala 12.' },
  w_izolatki: { cat: 'wniosek', title: 'Dawid w izolatkach pawilonu D',
    text: 'Oddział zamknięty i izolatki w piwnicy to według planów pawilon D. Tam jest Dawid.' },
  w_seria: { cat: 'wniosek', title: 'To nie pierwsi',
    text: 'Ewa Malinowska zaginęła w Borku w 2019 roku. Leży w sali 14, obok Kingi. Sprawca robi to od lat.' },
  w_sprawca: { cat: 'wniosek', title: 'Stróż to człowiek w masce',
    text: 'Głos lekarza, fartuch i maska, „przyjęcia na oddział”: to Edmund Kubiak, były sanitariusz oddziału zamkniętego, który nigdy z niego nie wyszedł.' },
  w_kabel: { cat: 'wniosek', title: 'Prąd idzie do pawilonu D',
    text: 'Kabel z tunelu prowadzi od agregatu w kotłowni pod pawilon D. Tam ktoś potrzebuje prądu w nocy.' },
};

/* Łączenie poszlak: a + jedna z b → wniosek out */
const LINKS = [
  { a: 'opaska', b: ['plany'], out: 'w_oddz3' },
  { a: 'lista', b: ['plany'], out: 'w_oddz3' },
  { a: 'plany', b: ['stream', 'zabieg', 'szymek', 'izolatki_swiatlo'], out: 'w_izolatki' },
  { a: 'legitymacja', b: ['zaginieni', 'legenda', 'zgloszenia'], out: 'w_seria' },
  { a: 'stroz', b: ['maska', 'glos', 'karta'], out: 'w_sprawca' },
  { a: 'ewid_kubiak', b: ['maska', 'glos', 'karta'], out: 'w_sprawca' },
  { a: 'kabel', b: ['agregat', 'izolatki_swiatlo'], out: 'w_kabel' },
];

/* =====================================================================
   PYTANIA I POLECENIA OPERATORA
   ===================================================================== */
const Q_CATS = {
  stan:      'Stan',
  otoczenie: 'Otoczenie',
  zmysly:    'Dźwięki',
  ekipa:     'Ekipa',
  polecenia: 'Polecenia',
};

const QUESTIONS = [
  /* ---------------- STAN ---------------- */
  { id: 'ranna', cat: 'stan', text: 'Jesteś ranna? Coś cię boli?',
    run() { clue('noga'); return [
      'noga. łydka',
      'przecięłam o szkło jak biegłam tunelem. tam były wybite okienka',
      'spodnie mokre. chyba dużo krwi. nie patrzę'] } },

  { id: 'ucisk', cat: 'stan', text: 'Przyciśnij ranę mocno dłonią przez materiał i trzymaj. Nie puszczaj.',
    avail: () => has('noga'),
    run() { flag('ucisk'); dH(+6); good('Instrukcja: ucisk krwawiącej rany'); return [
      'trzymam. boli jak cholera',
      'piszę lewą ręką. będzie wolniej'] } },

  { id: 'opatrunek', cat: 'stan', light: true,
    text: 'Zwiń szalik albo rękaw w wałek, połóż na ranę i obwiąż mocno paskiem od torby.',
    avail: () => asked('ucisk'),
    run() { flag('opatrunek'); dH(+10); good('Instrukcja: opatrunek uciskowy'); return [
      'szalik. pasek od torby',
      'zawiązałam. mocno',
      'przestaje kapać. chyba'] } },

  { id: 'oddech', cat: 'stan', text: 'Oddychasz bardzo szybko. Mrowią cię dłonie?',
    avail: () => has('hiper_start'),
    run() { clue('hiper'); return [
      'tak. palce mi drętwieją',
      'jakbym się dusiła a powietrza mam za dużo'] } },

  { id: 'oddech_instr', cat: 'stan', calm: true,
    text: 'Złóż dłonie przy ustach. Wdech nosem na cztery, wydech powoli na sześć. Licz ze mną.',
    avail: () => has('hiper_start'),
    run() { flag('oddech_instr'); S.hyper = false; dS(-10); dH(+4); good('Instrukcja: oddech przy ataku paniki'); return [
      'raz dwa trzy cztery',
      'wydech…',
      'mniej mrowi. ok'] } },

  { id: 'zimno', cat: 'stan', text: 'Jest ci zimno?',
    avail: () => has('noga') || has('sala'),
    run() { clue('zimno'); return [
      'lodowato. widzę swój oddech',
      'kurtka mokra. leżałam w kałuży w tunelu'] } },

  { id: 'okryj', cat: 'stan', light: true, text: 'Poszukaj czegoś, czym możesz się okryć.',
    avail: () => has('zimno'),
    run() { flag('cieplo'); dH(+6); dS(+4); good('Instrukcja: ochrona przed wychłodzeniem'); return [
      'na drugim łóżku leży koc',
      'czysty. pachnie proszkiem do prania',
      'ktoś go tu położył niedawno. w opuszczonym szpitalu',
      'okryłam się. nie chcę o tym myśleć'] } },

  { id: 'nie_spij', cat: 'stan', calm: true, text: 'Straciłaś dużo krwi. Nie zasypiaj, pisz do mnie cały czas.',
    avail: () => has('noga'),
    run() { flag('czuwa'); dS(-4); good('Instrukcja: czuwanie przy utracie krwi'); return [
      'nie zasnę. tu się nie da zasnąć',
      'ty też nie przestawaj'] } },

  /* ---------------- OTOCZENIE ---------------- */
  { id: 'opisz', cat: 'otoczenie', text: 'Opisz, gdzie jesteś. Tyle, ile widzisz.',
    run() { clue('sala'); flag('zagrozenie'); return [
      'sala. przez okno wpada czerwone światło, trochę widać',
      'dwa łóżka metalowe. z pasami',
      'okno z kratą. szyba pęknięta',
      'drzwi z takim wizjerem. zastawiłam je krzesłem'] } },

  { id: 'okno', cat: 'otoczenie', text: 'Co widać przez okno?',
    avail: () => has('sala'),
    run() { clue('znicze'); flag('ludzie_blisko'); return [
      'drzewa. niżej',
      'a dalej czerwona łuna. setki małych światełek',
      'znicze. cmentarz. przecież dziś są wszystkich świętych'] } },

  { id: 'wieza', cat: 'otoczenie', text: 'Patrzysz na znicze. Co widać po bokach okna?',
    avail: () => has('znicze'),
    run() { clue('wieza'); return [
      'po lewej wieża. gruba, z cegły. na górze czerwona lampka',
      'blisko. może osiemdziesiąt metrów',
      'po prawej mała kaplica. w jej okienku też świecą znicze'] } },

  { id: 'droga', cat: 'otoczenie', memory: true, text: 'Którędy tu przybiegłaś? Ile było schodów?',
    avail: () => has('sala'),
    run() { clue('pietro'); return [
      'z tunelu. były drzwi i schody w górę',
      'dwa półpiętra. może trzy',
      'jak patrzę przez okno to czubki drzew są pod parapetem'] } },

  { id: 'tunel', cat: 'otoczenie', memory: true, text: 'Opisz tunel, którym biegłaś.',
    avail: () => has('ekipa') || asked('droga'),
    run() { clue('kabel'); return [
      'niski. rury pod sufitem. przewrócone wózki na jedzenie',
      'pod ścianą gruby czarny kabel. nowy. przypięty opaskami',
      'szedł tam skąd słychać silnik. ja biegłam w drugą stronę'] } },

  { id: 'szafka', cat: 'otoczenie', light: true, text: 'Sprawdź powoli szafki i drugie łóżko.',
    avail: () => has('sala'),
    run() { clue('opaska'); dS(+12); return [
      'szafka pusta. kurz',
      'na drugim łóżku złożona koszula szpitalna. nowa. i opaska na rękę',
      'plastikowa. napisane długopisem',
      'LIS KINGA. ODDZ. III. SALA 12. PRZYJĘTA 01.11',
      'to ja. on na mnie czekał. KURWA on na mnie czekał'] } },

  { id: 'wizjer', cat: 'otoczenie', text: 'Wyjrzyj ostrożnie przez wizjer na korytarz.',
    avail: () => has('sala') && has('prad'),
    run() {
      clue('graffiti');
      const m = ['korytarz. jedna żarówka się pali',
        'na ścianie naprzeciwko napis sprayem. ZBYCHU 2009. i czaszka',
        'drzwi naprzeciwko mają numery 11 i 13. ja chyba jestem w 12'];
      if (S.perp === 'C') { dS(+15); m.push('na końcu korytarza ktoś stoi. tyłem. nie rusza się', 'odsuwam się od drzwi'); }
      return m; } },

  { id: 'sasiednia', cat: 'otoczenie', light: true,
    text: 'Ktoś puka w ścianę. Czy możesz bezpiecznie zajrzeć do sali obok?',
    avail: () => has('pukanie'),
    run() {
      if (S.perp === 'C') { dS(+20); return ['otwieram drzwi…', 'kroki na schodach!! wracam', 'zastawiłam znowu. on jest w budynku']; }
      clue('ciala'); clue('legitymacja'); dS(+20); flag('widziala');
      return ['przeszłam. drzwi obok otwarte',
        'trzy łóżka. na każdym ktoś leży',
        'przypięci pasami. w koszulach. nie ruszają się',
        'śmierdzi. słodko. jak zgniłe kwiaty',
        'jedna ma długie włosy. skóra jak papier',
        'na szafce legitymacja. EWA MALINOWSKA. ważna do 2019',
        'wróciłam. wróciłam. nie mogę',
        'kto pukał?? tam nikt nie żyje'];
    } },

  { id: 'barykada', cat: 'otoczenie', text: 'Dosuń do drzwi drugie łóżko. Powoli, bez hałasu.',
    avail: () => has('sala') && !has('barykada'),
    run() {
      flag('barykada');
      if (S.perp === 'C') { S.perpSuspicious = true; dS(+15); mistake('Hałas przy barykadzie, gdy on był w budynku');
        return ['łóżko zgrzytnęło o podłogę', 'na korytarzu cisza. potem kroki. szybkie', 'stanęły. odeszły. on słyszał']; }
      good('Barykada drzwi');
      return ['przesunęłam. skrzypiało', 'drzwi otwierają się do środka. teraz nie otworzy'];
    } },

  /* ---------------- DŹWIĘKI I ZAPACHY ---------------- */
  { id: 'sluchaj', cat: 'zmysly', repeat: 10, text: 'Zamknij oczy i posłuchaj. Co słyszysz?',
    run() {
      clue('agregat');
      if (has('prad')) return ['silnik. warczy równo. gdzieś za budynkiem', 'buczą żarówki na korytarzu', 'i coś pika. daleko. jak w szpitalu przy łóżku'];
      return ['kapie woda', 'daleko warczy silnik. cicho, równo', 'i ktoś nuci? nie wiem. może to wiatr'];
    } },

  { id: 'zapach', cat: 'zmysly', text: 'Czujesz jakiś zapach?',
    run() { clue('dym'); return [
      'stęchlizna. mokry tynk',
      'i dym. jak z piecyka. z kratki wentylacyjnej przy suficie'] } },

  { id: 'glos_pa', cat: 'zmysly', memory: true, text: 'Ten głos z głośników – jak brzmiał?',
    avail: () => has('pa'),
    run() { clue('glos'); return [
      'spokojny. starszy facet. mówi jak lekarz na obchodzie',
      'trzeszczy jak stare radio',
      'w tle coś pikało. równo'] } },

  { id: 'ludzie', cat: 'zmysly', text: 'Słyszysz albo widzisz ludzi przy cmentarzu?',
    avail: () => has('znicze'),
    run() { flag('ludzie'); return [
      'czasem przejedzie auto. trzasną drzwi',
      'raz ktoś się śmiał. daleko',
      'jakbym krzyknęła to by usłyszeli?'] } },

  /* ---------------- EKIPA ---------------- */
  { id: 'imie', cat: 'ekipa', text: 'Jak masz na imię?',
    avail: () => !has('imie'),
    run() { flag('imie'); return ['kinga. kinga lis'] } },

  { id: 'co_sie_stalo', cat: 'ekipa', memory: true, text: 'Co się stało? Od początku, krótko.',
    run() { clue('ekipa'); return [
      'weszliśmy dziurą w murze od cmentarza. we trójkę. o wpół do dwunastej',
      'ja, dawid i szymek. nagrywaliśmy live',
      'dawid zszedł do tuneli bo coś stukało. nie wrócił',
      'potem włączyły się głośniki. szymek zaczął biec. ja w drugą stronę'] } },

  { id: 'dawid', cat: 'ekipa', memory: true, text: 'Gdzie ostatnio był Dawid?',
    avail: () => has('ekipa'),
    run() { clue('dawid_tunel'); return [
      'w tunelu pod kuchnią. tam są takie wózki na jedzenie',
      'krzyknął moje imię. raz',
      'potem nic'] } },

  { id: 'szymek_q', cat: 'ekipa', text: 'Gdzie jest Szymek? Miał telefon?',
    avail: () => has('ekipa'),
    run() { clue('live'); return [
      'nie wiem. pobiegł z telefonem',
      'nadawaliśmy live. kanał Strefa Zero na Streamio',
      'może dalej nadaje. może ktoś to ogląda'] } },

  { id: 'maska_q', cat: 'ekipa', memory: true, text: 'Widziałaś tego człowieka? Opisz go.',
    avail: () => has('ekipa') || has('pa'),
    run() { clue('maska'); dS(+6); return [
      'raz. na końcu korytarza w świetle latarki',
      'maska gazowa. stara. i biały fartuch do ziemi',
      'stał i patrzył. przechylił głowę jak pies',
      'nie uciekał. on się nie spieszył'] } },

  { id: 'legenda_q', cat: 'ekipa', text: 'Czytaliście coś o tym miejscu, zanim weszliście?',
    avail: () => has('ekipa'),
    run() { clue('legenda'); return [
      'na forum pisali że ktoś tu mieszka. że stróż. albo duch sanitariusza',
      'i że w 2019 zniknęła tu para od urbexu',
      'myśleliśmy że to ściema. dla klikalności'] } },

  { id: 'szymek_ok', cat: 'ekipa', calm: true, text: 'Szymek żyje. Policja znalazła go przy cmentarzu, jest bezpieczny.',
    avail: () => has('szymek_ok'),
    run() { dS(-16); good('Przekazanie dobrej wiadomości o Szymku'); return [
      'szymek żyje??',
      'dzięki bogu. dzięki bogu',
      'to znaczy że da się stąd wyjść. dobrze. dobrze'] } },

  { id: 'imie_q', cat: 'ekipa', text: 'Skąd on może znać twoje imię i nazwisko?',
    avail: () => has('wola_ja'),
    run() { dS(+5); return [
      'z transmisji. w opisie kanału są nasze imiona',
      'albo dawid mu powiedział',
      'o boże co on mu zrobił że powiedział'] } },

  /* ---------------- POLECENIA ---------------- */
  { id: 'cicho', cat: 'polecenia', text: 'Bądź absolutnie cicho. Pisz tylko do mnie.',
    run() { flag('cicho'); good('Polecenie zachowania ciszy'); return ['dobrze. nawet nie oddycham'] } },

  { id: 'ekran', cat: 'polecenia', text: 'Przyciemnij ekran do minimum i wyłącz wszystko oprócz wiadomości. Oszczędzamy baterię.',
    run() { flag('dim'); good('Oszczędzanie baterii'); return [`zrobione. ${Math.max(1, Math.round(S.battery))}%`] } },

  { id: 'jestem', cat: 'polecenia', calm: true, repeat: 6,
    text: () => (S.order && S.order.status !== 'wolny')
      ? 'Policja już jedzie do Borku. Jestem z tobą cały czas.'
      : 'Jestem z tobą. Szukamy cię i nie przerwę tej rozmowy.',
    run() {
      if (S.order && S.order.status !== 'wolny') { dS(-16); return ['jadą. naprawdę jadą', 'szybko. prosze szybko']; }
      dS(-10); return ['dobrze', 'nie zostawiaj mnie'];
    } },

  { id: 'oddychaj', cat: 'polecenia', calm: true, repeat: 5,
    text: 'Oddychaj ze mną: wdech na cztery, wydech na sześć. Trzy razy.',
    run() { dS(-12); dH(+2); return ['wdech', 'wydech', '…trochę lepiej'] } },

  { id: 'latarka_on', cat: 'polecenia', repeat: 0.01, text: 'Włącz latarkę w telefonie, ale zasłoń ją palcami.',
    avail: () => S.bulb === 'off',
    run() { S.bulb = 'on'; dS(-3); return ['włączona. przez palce. czerwone światło', 'widzę więcej'] } },

  { id: 'latarka_off', cat: 'polecenia', repeat: 0.01, text: 'Zgaś latarkę.',
    avail: () => S.bulb === 'on',
    run() { S.bulb = 'off'; dS(+4); return ['zgaszona. ciemno'] } },

  { id: 'bron', cat: 'polecenia', light: true, text: 'Poszukaj czegoś, czym możesz się bronić.',
    run() { flag('rura'); return ['krzesło ma metalowe nogi. jedna się chwieje', 'wykręciłam ją. ciężka', 'trzymam. ręce mi się trzęsą'] } },

  { id: 'plan', cat: 'polecenia', text: 'Jeśli ktoś będzie wchodził: latarka zgaszona, pod łóżko, telefon pod brzuch, nie oddychaj.',
    avail: () => has('zagrozenie'),
    run() { flag('plan'); good('Plan na wypadek wejścia sprawcy'); return ['pod łóżko. telefon pod brzuch', 'dobrze'] } },

  { id: 'krzycz', cat: 'polecenia', repeat: 8, text: 'Krzycz o pomoc przez okno, w stronę cmentarza!',
    avail: () => has('ludzie') || has('zagrozenie'),
    run() {
      S.perpSuspicious = true; S.huntAt = Math.min(S.huntAt, S.t + 3); dS(+20);
      mistake('Krzyk zdradził, gdzie ona jest');
      if (S.perp === 'C') return ['POMOCY!!! POMOCY!!!', '…', 'kroki. biegnie. on biegnie po schodach', 'przepraszam przepraszam'];
      return ['POMOCY!!!', 'nikt. tylko echo', 'i głośnik', 'on się zaśmiał. przez głośnik. cicho i długo'];
    } },

  { id: 'mrugaj', cat: 'polecenia', repeat: 2,
    text: 'Patrol stoi pod murem cmentarza. Mrugnij latarką w okno: trzy razy, powoli.',
    avail: () => policeOnStreet() && !has('potwierdzony') && S.kingaIn === 'pawC',
    run() { flag('mruga'); return ['włączam… gaszę', 'raz… dwa… trzy', 'widzą?'] },
    after: () => blinkResult() },
];

const PANIC = [
  'nie nie nie nie',
  'on tu idzie on tu idzie',
  'nie mogę oddychać nie mogę',
  'przepraszam. ręce. nie mogę pisać. o co pytałeś',
  'nie wiem!!! nie wiem nic!!!',
];
const BLANK = [
  'nie pamiętam. biegłam. było ciemno. nie wiem',
  'w głowie mam tylko jego maskę. nic więcej',
  'za bardzo się boję żeby to sobie przypomnieć',
];
const DARK = [
  'za ciemno. nic nie widzę',
  'musiałabym włączyć latarkę. a jak on zobaczy?',
];

/* =====================================================================
   ZDARZENIA
   ===================================================================== */
const EVENTS = [
  { id: 'pa1', when: () => S.t >= 2,
    async run() {
      flag('pa'); flag('zagrozenie');
      await announce('Uwaga. Cisza nocna. Pacjenci proszeni są o powrót do sal.');
      dS(+6);
      await her(['znowu ten głos. z głośnika na korytarzu', 'on wie że tu jesteśmy']);
    } },

  { id: 'klamki', when: () => S.t >= 6,
    async run() {
      S.perp = 'C'; sfx('steps');
      await her(['kroki na korytarzu. powoli', 'sprawdza drzwi. jedne po drugich']);
      sfx('handle');
      await decide({
        title: 'Ktoś sprawdza klamki', text: 'Jest dwoje drzwi od niej. Co jej każesz?', timer: 12,
        options: [
          { label: S.bulb === 'on' ? 'Zgaś latarkę i nie ruszaj się. Ani dźwięku.' : 'Nie ruszaj się. Ani dźwięku.', async run() {
              S.bulb = 'off'; good('Właściwa reakcja na sprawdzanie drzwi');
              await opSay('Zgaś latarkę i nie ruszaj się. Ani dźwięku.');
              await her(['…', 'szarpnął moją klamkę. krzesło trzyma', 'postał. słyszę jak oddycha przez maskę', 'poszedł dalej. schodami w dół']); } },
          { label: has('cieplo') ? 'Wejdź pod łóżko i zasłoń się kocem.' : 'Wejdź pod łóżko.', async run() {
              S.bulb = 'off'; good('Właściwa reakcja na sprawdzanie drzwi');
              await opSay('Wejdź pod łóżko i zasłoń się.');
              await her(['pod łóżkiem']); await pauseContact(2);
              await her(['poszedł. nie wszedł', 'trzęsę się cała']); } },
          { label: 'Przytrzymaj drzwi całym ciałem!', async run() {
              S.perpSuspicious = true; S.huntAt = Math.min(S.huntAt, S.t + 12); dS(+15);
              mistake('Opór przy drzwiach zdradził, że ktoś jest w sali');
              await opSay('Przytrzymaj drzwi całym ciałem!');
              await her(['trzymam!!', 'szarpnął mocniej. potem przestał', 'powiedział przez drzwi. spokojnie. „dobranoc, pani Kingo”']); } },
        ],
        async onTimeout() {
          if (S.bulb === 'on') {
            S.perpSuspicious = true; S.huntAt = Math.min(S.huntAt, S.t + 12); mistake('Światło latarki widoczne spod drzwi');
            await her(['nie zgasiłam latarki', 'zatrzymał się. światło spod drzwi', 'zapukał. dwa razy. delikatnie', 'i poszedł']);
          } else { dS(+8); await her(['nie ruszałam się', 'poszedł. chyba na dół']); }
        },
      });
      if (S.perp === 'C') S.perp = 'D';
      if (S.contact === 'active' && !has('barykada')) await sys('On sprawdza drzwi. Krzesło to mało: pomyśl o barykadzie i o planie, co ona zrobi, gdy wróci.');
    } },

  { id: 'agregat', when: () => S.t >= 9,
    async run() {
      flag('prad'); sfx('generator');
      await her(['na korytarzu zapaliła się żarówka. przez szparę pod drzwiami widać', 'ktoś włączył światło. silnik gdzieś warczy głośniej']);
    } },

  { id: 'hiper', when: () => S.t >= 11 && S.stress >= 65,
    async run() {
      flag('hiper_start'); S.hyper = true;
      await her(['nie mogę złapać powietrza', 'ręce mi drętwieją. serce wali']);
    } },

  { id: 'szymek', when: () => S.t >= 14,
    async run() {
      clue('szymek');
      await radio('Dyżurny KPP Kalnów do CPR: przy cmentarzu w Borku ludzie od zniczy znaleźli rannego chłopaka, Szymon Bała, 21 lat. Wyszedł dziurą w murze szpitala. Mówi, że kolegę Dawida człowiek w masce gazowej wciągnął do tuneli, „tam, gdzie okienka piwnic są przy ziemi i mają kraty”. Koleżanka Kinga pobiegła w drugą stronę. Telefon z transmisją zgubił w środku.', 'Dyżurny KPP');
      if (S.contact === 'active') await sys('Szymek żyje i jest bezpieczny. Możesz jej to przekazać, to ją uspokoi.');
      flag('szymek_ok');
    } },

  { id: 'pa2', when: () => S.t >= 18 && S.dawid === 'held',
    async run() {
      S.deadline = Math.min(S.deadline, 43); // 01:30
      await announce('Pacjent Dawid Mrozek przyjęty na oddział zamknięty. Zabieg zaplanowano na godzinę pierwszą trzydzieści.');
      clue('zabieg'); dS(+10);
      await her(['dawid. on ma dawida', 'jaki zabieg?? co to znaczy zabieg']);
    } },

  { id: 'krzyk', when: () => S.t >= 24 && S.dawid === 'held',
    async run() {
      sfx('scream'); dS(+8); flag('dawid_zyje');
      await her(['krzyk. daleko. przez rury', 'to dawid. znam jego głos', 'on żyje. jeszcze żyje']);
    } },

  { id: 'pukanie', when: () => S.t >= 27,
    async run() {
      flag('pukanie'); sfx('knock'); dS(+8);
      await her(['ktoś puka w ścianę. z sali obok', 'trzy razy. przerwa. trzy razy', 'tam ktoś jest. może ktoś żywy?']);
    } },

  { id: 'pa3', when: () => S.t >= 32 || (S.perpSuspicious && S.t >= 20) || S.t >= S.huntAt - 3,
    async run() {
      flag('wola_ja');
      S.huntAt = Math.min(S.huntAt, S.t + (S.perpSuspicious ? 3 : 6));
      await announce('Pacjentka Kinga Lis proszona do gabinetu zabiegowego. Pacjentka Lis.');
      dS(+14);
      await her(['to moje imię', 'skąd on zna moje imię', 'on idzie po mnie']);
    } },

  { id: 'radio', when: () => S.t >= 38 && has('pukanie'),
    async run() {
      dS(+8);
      await her(['w sali obok włączyło się radio. samo', 'ktoś śpiewa kołysankę. „aaa kotki dwa”', 'tam przecież nikogo nie ma']);
    } },

  { id: 'polowanie', when: () => S.t >= S.huntAt && ['D', 'tunel', 'C'].includes(S.perp) && S.kingaIn === 'pawC' && !S.rescued && !S.escaped,
    async run() { await perpComesUp(); } },

  { id: 'zabieg_d', when: () => S.t >= S.deadline && S.dawid === 'held',
    async run() {
      S.dawid = 'dead'; sfx('generator');
      if (S.contact === 'active') {
        await announce('Zabieg rozpoczęty.');
        await her(['żarówka na korytarzu przygasa. i znowu. i znowu', 'nie słyszę już krzyku', 'o boże. dawid']);
        dS(+20);
      }
    } },

  { id: 'zabiera', when: () => S.takeAt != null && S.t >= S.takeAt && S.kingaIn === 'pawC' && !S.rescued && !S.escaped,
    async run() { await takeHer('klucz'); } },

  { id: 'zabieg_k', when: () => S.kingaDeadline != null && S.t >= S.kingaDeadline && S.kingaIn === 'pawD' && !S.rescued,
    async run() { S.kingaDead = true; } },

  { id: 'senna', when: () => S.health < 30 && S.contact === 'active',
    async run() { await her(has('czuwa')
      ? ['oczy mi się zamykają. ale nie śpię', 'pisz do mnie']
      : ['zimno mi. nogi nie czuję', 'chce mi się spać. tylko chwilę']); } },

  { id: 'senna2', when: () => S.health < 15 && S.contact === 'active',
    async run() { await her(['ciemno mi przed ocz', 'zimnno']); } },
];

/* =====================================================================
   SPRAWCA IDZIE PO NIĄ
   ===================================================================== */
async function perpComesUp() {
  S.perp = 'C'; sfx('steps');
  if (S.contact !== 'active') { S.takeAt = S.t + 1; return; }  // bez kontaktu nikt jej nie ostrzeże
  await her(['kroki na schodach. szybkie', 'idzie prosto tutaj', 'brzęk kluczy']);
  sfx('alarm');
  await decide({
    title: 'On stoi pod drzwiami sali 12', text: 'Masz kilka sekund, zanim przekręci klucz.', timer: 15,
    options: [
      { label: 'Zgaś latarkę, pod łóżko, telefon pod brzuch, nie oddychaj.', run: () => hideOutcome(false) },
      { label: 'Weź nogę od krzesła. Uderz, gdy wejdzie, i uciekaj schodami w dół.', show: () => has('rura'), run: () => fightOutcome() },
      { label: 'Krzycz, że policja już jest na terenie!', show: () => !!S.order, run: () => bluffOutcome() },
      { label: 'Nie przerywaj, pisz do mnie dalej.', async run() { await opSay('Nie przerywaj, pisz do mnie dalej.'); mistake('Telefon nie został ukryty przed sprawcą'); await takeHer('teraz'); } },
    ],
    onTimeout: () => has('plan') ? hideOutcome(true) : (mistake('Brak reakcji i planu, gdy sprawca wchodził do sali'), takeHer('teraz')),
  });
}

async function hideOutcome(timedOut) {
  if (!timedOut) await opSay('Zgaś latarkę, pod łóżko, telefon pod brzuch. Nie oddychaj.');
  else if (has('plan')) await sys('Brak polecenia. Rozmówczyni robi to, co ustaliliście wcześniej.');
  S.bulb = 'off';
  if (!has('barykada') && !has('plan')) {
    // bez barykady i bez planu znajduje ją od razu
    mistake('Brak barykady i planu ukrycia: znalazł ją pod łóżkiem');
    await her(['pod łóżkiem', 'klucz. drzwi. krzesło się przewraca', 'świeci latarką po podłodze']);
    await takeHer('teraz');
    return;
  }
  good('Ukryła się przed sprawcą');
  await pauseContact(3);
  if (S.contact === 'lost') return;
  S.perp = 'D';
  S.takeAt = S.t + 9;
  dS(+20);
  await her(['…',
    has('barykada') ? 'próbował otworzyć. łóżko zablokowało drzwi' : 'wszedł. świecił po łóżkach. ja pod spodem. widziałam jego buty',
    'powiedział: „pacjentka nie powinna się chować. wrócę z siostrą oddziałową”',
    'jaką siostrą?? tu nikogo nie ma',
    'poszedł. ale wróci. prosze. szybko']);
}

async function fightOutcome() {
  await opSay('Weź nogę od krzesła. Uderz, gdy wejdzie, i uciekaj schodami w dół.');
  if (S.health >= 45 && S.stress < 96) {
    S.escaped = true; S.escapeT = S.t; S.perp = 'ranny';
    await her(['…', 'UDERZYŁAM', 'maska mu spadła. leży. siwy stary facet',
      'biegnę. schody. parter. drzwi na dwór',
      'jestem na zewnątrz. zimno. biegnę do zniczy',
      'dziura w murze. przeszłam',
      'ludzie. jakaś pani przy grobie. krzyczy']);
    await sys('Rozmówczyni wydostała się z budynku: cmentarz parafialny w Borku, przy murze szpitala.');
    await rescueByEscape();
    return;
  }
  await her(['…', 'nie trafiłam', 'on złapał mnie za włosy']);
  await takeHer('teraz', true);
}

async function bluffOutcome() {
  await opSay('Krzycz, że policja już jest na terenie!');
  S.perp = 'D'; dS(+10);
  if (S.dawid === 'held') S.deadline = Math.min(S.deadline, S.t + 4);
  await her(['POLICJA JEST NA TERENIE!!!', '…', 'zatrzymał się',
    'zaśmiał się. powiedział: „w takim razie zabieg trzeba przyspieszyć”',
    'zbiega na dół. on idzie do dawida']);
}

/* zabiera ją do izolatki w pawilonie D */
async function takeHer(how, afterFight) {
  const live = S.contact === 'active';
  if (live && !afterFight) await her(how === 'klucz' ? ['klucz w zamku', 'drzwi', 'on tu jest'] : ['on tu jest', 'świeci mi w ']);
  if (live) await perpSays(['pacjentka nie powinna korzystać z telefonu.', 'proszę się nie bać. to tylko zabieg.']);
  S.kingaIn = 'pawD'; S.perp = 'D'; S.takenAt = S.t; S.kingaDeadline = Math.max(S.t + 16, S.deadline + 6);
  if (live) await loseContact('sprawca');
}

/* =====================================================================
   MAPA TERENU (1 px = 0,5 m)
   ===================================================================== */
const MAP = {
  aml: { x: 700, y: 300, r: 180 },
  tower: { x: 780, y: 300 },
  hole: { x: 868, y: 380 },
};

const STREETS = [
  { id: 'szpitalna', name: 'ul. Szpitalna', pts: [[0, 690], [1000, 690]] },
  { id: 'aleja', name: 'aleja główna', pts: [[110, 690], [110, 520], [560, 520], [560, 90]], recon: true },
  { id: 'dziedziniec', name: 'dziedziniec między C i D', pts: [[330, 300], [740, 300]], recon: true },
  { id: 'mur', name: 'ścieżka pod murem cmentarza', pts: [[852, 70], [852, 650]], recon: true },
];

/* type: pawilon | obiekt; floors – kondygnacje nad ziemią; tunnel – połączenie z tunelami */
const BUILDINGS = [
  { id: 'portiernia', short: 'P', addr: 'Portiernia przy bramie', street: 'aleja', x: 150, y: 640, w: 50, h: 28,
    kind: 'portiernia', year: 1911, levels: 'parter', floors: 1, tunnel: false, bars: false, view: [], search: 1,
    note: 'Według ewidencji mieszka tu stróż terenu.',
    report: 'Portiernia: drzwi otwarte, w środku nikogo. Łóżko polowe, piecyk, ściany oklejone kartami pacjentów z lat 90. Na stole lista, równym pismem: „Przyjęcia 31.10/01.11: Mrozek D. – izolatka 3. Lis K. – sala 12, Oddz. III. Bała S. – zbiegł”.',
    clue: 'lista' },
  { id: 'pawA', short: 'A', addr: 'Pawilon A (administracja)', street: 'aleja', x: 300, y: 600, w: 140, h: 46,
    kind: 'pawilon', year: 1911, levels: 'parter, piętro', floors: 2, tunnel: false, bars: false, view: [], search: 3,
    note: 'Biura, gabinet dyrektora, archiwum zakładowe.',
    report: 'Pawilon A: puste biura. Na podłodze sterty kart, ktoś ułożył je niedawno w równe stosy. Na wierzchu karta personelu: „Kubiak Edmund – sanitariusz, Oddz. zamknięty, 1982–1998”. Nikogo.',
    clue: 'karta' },
  { id: 'pawB', short: 'B', addr: 'Pawilon B (Oddz. I–II, kobiece)', street: 'aleja', x: 230, y: 330, w: 70, h: 170,
    kind: 'pawilon', year: 1911, levels: 'piwnica, parter, piętro', floors: 2, tunnel: true, bars: true, view: [], search: 4,
    note: 'Oddziały kobiece. W piwnicy hydroterapia.',
    report: 'Pawilon B: trzy kondygnacje, nikogo. W piwnicy wanny do hydroterapii z pasami. W jednej świeża woda, jeszcze letnia.' },
  { id: 'pawE', short: 'E', addr: 'Pawilon E (kuchnia, pralnia)', street: 'aleja', x: 430, y: 470, w: 120, h: 56,
    kind: 'pawilon', year: 1928, levels: 'piwnica, parter', floors: 1, tunnel: true, bars: false, view: [], search: 2,
    note: 'Kuchnia szpitalna i pralnia. Stąd rozchodzą się tunele.',
    report: 'Pawilon E, kuchnia: zejście do tuneli. Na posadzce świeże ślady wleczenia i krwi, prowadzą w tunel w stronę pawilonu D. Przewrócone wózki na jedzenie.',
    clue: 'slady_e' },
  { id: 'kotlownia', short: 'K', addr: 'Kotłownia z kominem', street: 'aleja', x: 430, y: 200, w: 80, h: 56,
    kind: 'obiekt', year: 1911, levels: 'parter', floors: 1, tunnel: true, bars: false, view: [], search: 1,
    note: 'Dawna kotłownia z kominem. Wejście do tuneli.',
    report: 'Kotłownia: pracuje agregat prądotwórczy, obok kanistry z olejem. Grube kable idą w tunel w stronę pawilonu D. Na stole talerz z jeszcze ciepłą zupą i złożona maska gazowa, zapasowa.' },
  { id: 'pawC', short: 'C', addr: 'Pawilon C (Oddz. III, męski)', street: 'aleja', x: 660, y: 420, w: 170, h: 56,
    kind: 'pawilon', year: 1913, levels: 'piwnica, parter, piętro', floors: 2, tunnel: true, bars: true, view: ['cmentarz'], search: 4,
    note: 'Oddział III. Wschodnie skrzydło od strony cmentarza.' },
  { id: 'pawD', short: 'D', addr: 'Pawilon D (oddział zamknięty)', street: 'aleja', x: 660, y: 150, w: 170, h: 56,
    kind: 'pawilon', year: 1936, levels: 'piwnica, parter', floors: 1, tunnel: true, bars: true, view: ['cmentarz'], search: 2,
    note: 'Oddział zamknięty. W piwnicy izolatki z okienkami przy ziemi.' },
  { id: 'prosektorium', short: 'Pr', addr: 'Prosektorium', street: 'aleja', x: 800, y: 190, w: 44, h: 40,
    kind: 'obiekt', year: 1911, levels: 'parter', floors: 1, tunnel: false, bars: false, view: [], search: 1,
    note: 'Prosektorium przy murze cmentarza. Okna zamurowane.',
    report: 'Prosektorium: stoły sekcyjne, zimno. Na jednym ciało pod prześcieradłem, spod spodu wystaje rękaw kurtki motocyklowej. Na ścianie kredą lista nazwisk, cztery przekreślone: Malinowska, Nowak, Wilk, Kowalczyk. Dwa nieprzekreślone: Mrozek, Lis.' },
  { id: 'kaplica', short: '✝', addr: 'Kaplica szpitalna', street: 'aleja', x: 780, y: 590, w: 44, h: 56,
    kind: 'obiekt', year: 1911, levels: 'parter', floors: 1, tunnel: false, bars: false, view: ['cmentarz'], search: 1,
    note: 'Kaplica szpitalna.',
    report: 'Kaplica: na ołtarzu dziesiątki zniczy, wszystkie zapalone dziś w nocy. Przed ołtarzem równo ustawione kapcie szpitalne, sześć par. Nikogo.' },
];

/* Obserwacja z zewnątrz */
const RECON = {
  mur: () => {
    let r = 'Idziemy ścieżką pod murem cmentarza, znicze świecą jak łuna. Pawilon D: w zakratowanych okienkach piwnicy, przy samej ziemi, słabe światło, słychać agregat.';
    clue('izolatki_swiatlo');
    if (S.kingaIn === 'pawC' && S.bulb === 'on') { r += ' Pawilon C: w oknie na piętrze, wschodnie skrzydło, słabe czerwonawe światło, jak latarka przez palce.'; clue('swiatlo_c'); }
    else r += ' Pawilon C: okna od wschodu ciemne.';
    return r + ' Prosektorium ma zamurowane okna. Stoimy pod murem, czekamy na dyspozycje.';
  },
  dziedziniec: () => 'Dziedziniec między C i D: na korytarzach obu pawilonów świecą pojedyncze żarówki. Po ziemi biegnie kabel od kotłowni do pawilonu D. Drzwi D zastawione od środka. Okien sal pawilonu C od strony cmentarza stąd nie widać.',
  aleja: () => 'Aleja główna: portiernia oświetlona, drzwi otwarte, w środku nikogo. Pawilony A, B i E ciemne. Słychać agregat od strony kotłowni.',
};

/* =====================================================================
   BAZA OSÓB ZAGINIONYCH
   ===================================================================== */
const MISSING = [
  { id: 'ewa', name: 'Ewa Malinowska', age: 24, hair: 'ciemne', eyes: 'piwne', height: 166, city: 'Kalnów', since: '2019-06-14',
    features: 'kolczyk w brwi', clothes: 'kurtka moro, czołówka',
    notes: 'Studentka, fotografka urbex. Weszła z Patrykiem Nowakiem na teren szpitala w Borku. Ostatni sygnał telefonu: Borek, 02:14.',
    reporter: 'Halina Malinowska (matka)' },
  { id: 'patryk', name: 'Patryk Nowak', age: 26, hair: 'blond', eyes: 'niebieskie', height: 182, city: 'Kalnów', since: '2019-06-14',
    features: 'tatuaż kompasu na przedramieniu', clothes: 'czarna bluza, plecak z aparatem',
    notes: 'Zaginął razem z Ewą Malinowską. Ostatni sygnał telefonu: Borek.',
    reporter: 'Tomasz Nowak (brat)' },
  { id: 'zenon', name: 'Zenon Wilk', age: 58, hair: 'siwe', eyes: 'szare', height: 171, city: 'Kalnów', since: '2022-01-09',
    features: 'brak dwóch palców lewej dłoni', clothes: 'wojskowa kurtka',
    notes: 'Osoba w kryzysie bezdomności, nocował w pustostanach Borku.',
    reporter: 'MOPS Kalnów' },
  { id: 'rafal', name: 'Rafał Kowalczyk', age: 31, hair: 'ciemne', eyes: 'brązowe', height: 178, city: 'Lipno', since: '2024-10-31',
    features: 'broda', clothes: 'kurtka motocyklowa',
    notes: 'Wyjechał motocyklem w noc Halloween, motocykl znaleziony na parkingu przy cmentarzu w Borku.',
    reporter: 'Anna Kowalczyk (żona)' },
  { id: 'ida', name: 'Ida Sowa', age: 17, hair: 'blond', eyes: 'zielone', height: 160, city: 'Kalnów', since: '2026-10-20',
    features: 'aparat na zębach', clothes: 'różowa kurtka',
    notes: 'Konflikt z rodzicami, możliwy wyjazd do Wrocławia.',
    reporter: 'Marta Sowa (matka)' },
  { id: 'jerzy', name: 'Jerzy Kret', age: 79, hair: 'siwe', eyes: 'niebieskie', height: 168, city: 'Kalnów', since: '2026-10-28',
    features: 'otępienie, chodzi o lasce', clothes: 'szlafrok',
    notes: 'Wyszedł z domu opieki „Jesień”.',
    reporter: 'Dom Opieki „Jesień”' },
];

/* Ewidencja ludności */
const REGISTRY = [
  { keys: ['edmund kubiak', 'kubiak edmund'], clue: 'ewid_kubiak',
    text: 'KUBIAK Edmund, ur. 1961. Zameldowanie stałe: Borek, ul. Szpitalna 1 (budynek portierni dawnego szpitala). Zatrudnienie 1982–1998: Szpital dla Nerwowo i Psychicznie Chorych w Borku, sanitariusz, oddział zamknięty. Adnotacja: 1998 – hospitalizacja psychiatryczna (3 miesiące). Brak telefonu komórkowego, brak pojazdu.' },
  { keys: ['kubiak'], clue: 'ewid_kubiak',
    text: 'Jeden wynik dla nazwiska KUBIAK w gminie: Edmund, ur. 1961, zameldowany: Borek, ul. Szpitalna 1 (portiernia dawnego szpitala), były sanitariusz oddziału zamkniętego.' },
  { keys: ['kinga lis', 'lis kinga'],
    text: 'LIS Kinga, ur. 2003. Zameldowanie: Kalnów, ul. Ogrodowa 9/14. Kontakt w razie wypadku: Barbara Lis (matka).' },
  { keys: ['dawid mrozek', 'mrozek dawid', 'mrozek'],
    text: 'MROZEK Dawid, ur. 2001. Zameldowanie: Kalnów, ul. Kościelna 4/2. Prowadzi działalność: „Strefa Zero – produkcja wideo”.' },
  { keys: ['szymon bala', 'bala szymon'],
    text: 'BAŁA Szymon, ur. 2005. Zameldowanie: Lipno, ul. Polna 3. Student.' },
  { keys: ['ewa malinowska', 'malinowska ewa', 'malinowska'],
    text: 'MALINOWSKA Ewa, ur. 1995. Adnotacja: zaginiona od 14.06.2019 (KPP Kalnów), ostatni sygnał telefonu: Borek.' },
  { keys: ['patryk nowak', 'nowak patryk'],
    text: 'NOWAK Patryk, ur. 1993. Adnotacja: zaginiony od 14.06.2019 (KPP Kalnów), razem z Ewą Malinowską.' },
];

/* Forum urbex – wyszukiwarka */
const FORUM = [
  { keys: ['zbychu', 'zbychu 2009', 'zbych'], clue: 'forum_c',
    text: 'Opuszczone.pl › Borek › galeria (2021). Zdjęcie: korytarz z lastryko, graffiti ZBYCHU 2009 z czaszką. Podpis: „Borek, pawilon C (męski), 1 piętro, wschodnie skrzydło. Uwaga na dziury w podłodze”.' },
  { keys: ['borek', 'borek szpital', 'szpital borek', 'psychiatryk borek', 'psychiatryk'], clue: 'legenda',
    text: 'Opuszczone.pl › Borek. Wątki:\n• „Para z Kalnowa nie wróciła z Borku” (2019, zamknięty przez moderatora)\n• „Ktoś tam mieszka. Agregat chodzi w nocy” (2022)\n• „Głos z megafonów o 3 w nocy, słyszałem sam” (2023)\n• „Mapa tuneli: kuchnia → B, C, D i kotłownia” (2020)' },
  { keys: ['strefa zero'], flag: 'kanal_forum',
    text: 'Opuszczone.pl › Kanały: „Strefa Zero” (Kinga, Dawid, Szymek). Ostatni wpis 31.10, 22:58: „Dziś live z Borku! Wszystkich Świętych w psychiatryku, kto ogląda?”.' },
  { keys: ['maska', 'maska gazowa', 'sanitariusz', 'duch'], clue: 'legenda',
    text: 'Opuszczone.pl › Borek › „Sanitariusz z Borku” (2023): „Widziałem typa w masce gazowej i białym fartuchu, stał na dachu D i patrzył na cmentarz. Spadłem z płotu, tak spieprzałem”.' },
  { keys: ['tunel', 'tunele'],
    text: 'Opuszczone.pl › „Mapa tuneli w Borku” (2020): tunel główny spod kuchni (E) rozchodzi się do pawilonów B, C i D oraz do kotłowni. Wejścia z tuneli prowadzą do piwnic.' },
];

/* =====================================================================
   ZAKOŃCZENIA
   ===================================================================== */
const ENDINGS = {
  E1: { title: 'Wypisani', tone: 'good', sub: 'Kinga i Dawid żyją' },
  E2: { title: 'Jedno łóżko puste', tone: 'mid', sub: 'Kinga uratowana, Dawid nie przeżył „zabiegu”' },
  E3: { title: 'Ku światłom zniczy', tone: 'mid', sub: 'Wydostała się sama' },
  E4: { title: 'Izolatka numer 2', tone: 'mid', sub: 'Odnaleziona po utracie kontaktu' },
  E5: { title: 'Cisza nocna', tone: 'bad', sub: 'Kontakt urwany, sali nie znaleziono' },
  E6: { title: 'Nowa pacjentka', tone: 'bad', sub: 'Zabrał ją na oddział' },
};
