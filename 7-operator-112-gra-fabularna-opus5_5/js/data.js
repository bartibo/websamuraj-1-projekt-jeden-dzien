'use strict';
/* =====================================================================
   Pod jedną żarówką – dane fabuły
   Poszlaki, pytania operatora, zdarzenia w czasie, budynki na mapie,
   baza osób zaginionych i zakończenia.
   Funkcje (her, sys, radio, decide, clue, flag, has, dS, dH, dB…)
   pochodzą z game.js i są wywoływane dopiero w trakcie gry.
   ===================================================================== */

const CLUE_CATS = {
  miejsce:   { name: 'Miejsce',     icon: '⌖' },
  tozsamosc: { name: 'Tożsamość',   icon: '◉' },
  sprawca:   { name: 'Sprawca',     icon: '⚠' },
  zdrowie:   { name: 'Zdrowie',     icon: '✚' },
  pamiec:    { name: 'Wspomnienia', icon: '✦' },
};

/* geo – ograniczenie na mapie, które ta poszlaka nakłada na budynek */
const CLUES = {
  /* ---------- MIEJSCE ---------- */
  piwnica: { cat: 'miejsce', geo: 'power', title: 'Piwnica z jedną żarówką',
    text: 'Niski ceglany strop, betonowa posadzka, półki ze słoikami. Świeci jedna żarówka na kablu, więc budynek ma prąd.' },
  schody: { cat: 'miejsce', geo: 'house', title: 'Drewniane schody i zasuwa',
    text: 'Strome drewniane schody do drzwi zamkniętych od zewnątrz na zasuwę. Nad stropem słychać kroki i telewizor. To raczej dom jednorodzinny niż blok.' },
  luksfery: { cat: 'miejsce', title: 'Okienko z luksferów',
    text: 'Pod stropem jest okienko z grubych szklanych pustaków. Wpada przez nie pomarańczowe światło latarni i światła aut, więc wychodzi na ulicę. Z ulicy widać, czy w piwnicy pali się światło.',
    hint: 'Okienko z luksferów widać z ulicy. Patrol, który przejeżdża obok, zobaczy światło żarówki albo jej mruganie.' },
  zsyp: { cat: 'miejsce', geo: 'coal', title: 'Zsyp na węgiel',
    text: 'W kącie leży kupka węgla, a nad nią jest metalowa klapa zsypu. Budynek jest ogrzewany węglem, pewnie przedwojenny.',
    hint: 'W kącie piwnicy był zsyp na węgiel. Ewidencja na mapie pokazuje, które domy grzeją węglem.' },
  pociag: { cat: 'miejsce', geo: 'rail', title: 'Pociąg tuż za ścianą',
    text: 'Pół minuty dudnienia i rytmicznego stukotu. Drżą słoiki i podłoga, więc tory są bliżej niż ok. 150 m.',
    hint: 'Dudnienie w 13. minucie to pociąg. Wystarczyło zapytać, jak długo trwało.' },
  slod: { cat: 'miejsce', geo: 'malt', title: 'Słodki zapach zboża',
    text: 'Przez okienko czuć mokre, prażone zboże, jakby pieczony chleb. Tak pachnie słodownia browaru, a wiatr niesie ten zapach najwyżej na ok. 500 m.',
    hint: 'Zapach pieczonego chleba to słodownia browaru. Wystarczyło zapytać o zapachy.' },
  dzwon: { cat: 'miejsce', geo: 'bell', title: 'Zegar wybija północ',
    text: 'O 00:00 dwanaście uderzeń dzwonu, głośno i blisko. W nocy godziny wybija tylko zegar na wieży kościoła św. Anny, słyszalny w promieniu ok. 700 m.',
    hint: 'O północy wybija zegar na wieży kościoła św. Anny. Można było poprosić ją, żeby policzyła uderzenia.' },
  bts: { cat: 'miejsce', geo: 'bts', title: 'Lokalizacja z sieci',
    text: 'Brak pozycji GPS (AML bez współrzędnych). Telefon jest zalogowany do stacji KAL-04, sektor północno-wschodni, zasięg do ok. 1,2 km.',
    hint: 'Narzędzie „Lokalizacja AML/BTS” od razu zawęża obszar do jednego sektora miasta.' },
  licznik: { cat: 'miejsce', title: 'Numer licznika prądu',
    text: 'Na liczniku przy schodach jest naklejka z numerem PPE 590 543 017 004 417 781. Dystrybutor energii wie, gdzie stoi ten licznik.',
    hint: 'Licznik prądu w piwnicy ma numer PPE. Dystrybutor energii podaje adres licznika.' },
  adres_ppe: { cat: 'miejsce', title: 'Licznik stoi przy Słodowej 14',
    text: 'Dystrybutor energii: licznik PPE …417 781 jest zamontowany w domu przy ul. Słodowej 14. Odbiorca: Henryk Wróbel (zm. 2024), wniosek o zmianę na Marka Wróbla w toku.' },
  pies: { cat: 'miejsce', title: 'Duży pies na podwórku',
    text: 'Na zewnątrz szczeka duży pies, niskim, grubym głosem. Pies na tapecie telefonu to też duży, czarny owczarek.' },
  sloiki: { cat: 'miejsce', title: 'Przetwory „H.W.”',
    text: 'Słoiki z ręcznie pisanymi etykietami: „Wiśnie 2021 H.W.”, „Ogórki H.W.”. Ktoś o inicjałach H.W. robił tu przetwory.' },
  swiatlo: { cat: 'miejsce', title: 'Światło w piwnicy pod 14',
    text: 'Patrol na Słodowej: w piwnicznym okienku z luksferów pod numerem 14 pali się słabe światło.' },
  potwierdzony: { cat: 'miejsce', title: 'Mruganie w okienku – Słodowa 14',
    text: 'Patrol widział, jak okienko piwnicy przy Słodowej 14 mruga trzy razy, zgodnie z poleceniem. Adres potwierdzony.' },
  sasiedzi: { cat: 'miejsce', title: 'Sąsiedzi o domu pod 14',
    text: 'Sąsiedzi ze Słodowej 6: „syn starego Wróbla spod czternastki ostatnio coś kombinuje, biały bus jeździ po nocach”.' },

  /* ---------- TOŻSAMOŚĆ ---------- */
  wlosy: { cat: 'tozsamosc', title: 'Rude włosy',
    text: 'Długie, rude włosy związane w kucyk.' },
  twarz: { cat: 'tozsamosc', title: 'Twarz w aparacie',
    text: 'Młoda, ok. 18–22 lat, piegi, zielone oczy, rozcięty łuk brwiowy.' },
  tatuaz: { cat: 'tozsamosc', title: 'Tatuaż psiej łapki',
    text: 'Mały tatuaż psiej łapki na lewym nadgarstku.',
    hint: 'Ona ma tatuaż łapki na nadgarstku. Wystarczyło zapytać o dłonie, a potem wpisać „łapa” w bazie zaginionych.' },
  bransoletka: { cat: 'tozsamosc', title: 'Bransoletka „M & O”',
    text: 'Pleciona bransoletka z koralików z literami „M & O”.' },
  bluza: { cat: 'tozsamosc', title: 'Bluza wolontariuszki',
    text: 'Szara bluza z napisem na plecach: PSIA PRZYSTAŃ – WOLONTARIAT i psia łapa.',
    hint: 'Na plecach jej bluzy był napis „Psia Przystań – wolontariat”. Wystarczyło poprosić, żeby ją zdjęła i przeczytała.' },
  bilet: { cat: 'tozsamosc', title: 'Bilet linii 7',
    text: 'Bilet skasowany 25.10.2026 o 18:12 w autobusie linii 7. Linia 7 kończy trasę na pętli przy ul. Polnej, obok schroniska.' },
  majka: { cat: 'tozsamosc', title: '„Majka”',
    text: 'Pamięta głos, który woła „Majka, chodź!”. Możliwe imię: Maja.' },
  tozsamosc: { cat: 'tozsamosc', title: 'Maja Sikorska, 19 lat',
    text: 'Potwierdzone: to Maja Sikorska z Kalnowa, zaginiona od niedzieli 25.10. Siostra: Aleksandra (Ola). Adres: ul. Kasztanowa 3/7.' },

  /* ---------- SPRAWCA ---------- */
  telefon: { cat: 'sprawca', title: 'Cudzy telefon',
    text: 'Telefon był w kieszeni jej bluzy, ale chyba nie jest jej: jest zablokowany kodem PIN, a na tapecie jest czarny owczarek.' },
  sim: { cat: 'sprawca', title: 'Numer służbowy fundacji',
    text: 'Numer jest zarejestrowany na Fundację Psia Przystań, ul. Polna 40 (schronisko dla zwierząt). To abonament firmowy.' },
  krs: { cat: 'sprawca', title: 'Prezes fundacji: Marek Wróbel',
    text: 'KRS: Fundacja Psia Przystań, prezes zarządu Marek Wróbel. Fundator: Henryk Wróbel (zm. 2024).',
    hint: 'Numer telefonu prowadzi do fundacji, a KRS do prezesa. Jego nazwisko można było sprawdzić w ewidencji.' },
  glos: { cat: 'sprawca', title: 'Męski głos',
    text: 'Pamięta spokojny męski głos: „Nie powinnaś była tu przychodzić”.' },
  zdjecia: { cat: 'sprawca', title: 'Zdjęcia klatek',
    text: 'Robiła telefonem zdjęcia: klatki w garażu za schroniskiem, chore szczenięta. Chciała to komuś pokazać. To prawdopodobny motyw.' },
  auto: { cat: 'sprawca', title: 'Odjeżdżające auto',
    text: 'Ok. 00:02 trzasnęły drzwi i odjechało auto z klekoczącym dieslem. Sprawca chyba wyszedł z domu.' },
  paragon: { cat: 'sprawca', title: 'Paragon z kurtki',
    text: 'W kurtce roboczej był paragon ze stacji paliw przy ul. Kolejowej: 25.10, godz. 21:40, 40 l oleju napędowego, płatność kartą „FUNDACJA PP”.' },
  ewid_marek: { cat: 'sprawca', title: 'Marek Wróbel – adresy',
    text: 'Zameldowany: ul. Ogrodowa 22/5 (blok). Właściciel domu przy ul. Słodowej 14 (spadek po ojcu, 2024).' },
  ewid_henryk: { cat: 'sprawca', title: 'Henryk Wróbel',
    text: 'Zm. 03.2024. Ostatnie miejsce zameldowania: ul. Słodowa 14 (dom). Spadkobierca: syn Marek.' },
  straznik: { cat: 'sprawca', title: 'Relacja stróża schroniska',
    text: 'Telefon służbowy ma kierownik, Marek Wróbel, który ma owczarka Bastka. Mieszka na Ogrodowej, ale ostatnio „remontuje dom po ojcu, gdzieś przy browarze”.' },
  sasiadka: { cat: 'sprawca', title: 'Relacja sąsiadki z Ogrodowej',
    text: 'Pan Wróbel rzadko bywa w mieszkaniu na Ogrodowej. „Siedzi w domu po ojcu, na Słodowej, przy torach.”' },
  siostra: { cat: 'sprawca', title: 'Relacja siostry',
    text: 'Ola: Maja od roku jest wolontariuszką w Psiej Przystani. Mówiła, że kierownik, pan Marek, „coś ukrywa z psami”. W niedzielę wieczorem pojechała tam zrobić zdjęcia i nie wróciła. Jej własny telefon wyłączył się o 20:03.' },

  /* ---------- ZDROWIE ---------- */
  glowa: { cat: 'zdrowie', title: 'Uraz głowy',
    text: 'Rana z tyłu głowy, zaschnięta krew we włosach, zawroty i niepamięć. Prawdopodobnie wstrząśnienie mózgu, więc nie może zasnąć.' },
  oddech: { cat: 'zdrowie', title: 'Świszczący oddech',
    text: 'Duszność i świsty przy wydechu, gorsze, kiedy się boi. Wygląda na atak astmy.' },
  astma: { cat: 'zdrowie', title: 'Astma',
    text: 'Siostra potwierdza, że Maja choruje na astmę i nosi inhalator w małej kieszonce na zamek przy rękawie bluzy.' },
  zimno: { cat: 'zdrowie', title: 'Wychłodzenie',
    text: 'Siedzi na mokrym betonie i jest jej bardzo zimno.' },
  rozpuszczalnik: { cat: 'zdrowie', title: 'Butelka z rozpuszczalnikiem',
    text: 'Butelka bez etykiety na półce: w środku jest rozpuszczalnik, nie woda.' },

  /* ---------- WSPOMNIENIA ---------- */
  m_autobus: { cat: 'pamiec', title: 'Autobus',
    text: 'Siedziała z tyłu autobusu i patrzyła w telefon. Była zła albo się bała.' },
  m_psy: { cat: 'pamiec', title: 'Dużo psów',
    text: 'Jechała na koniec trasy, tam, gdzie szczeka bardzo dużo psów.' },
  m_ola: { cat: 'pamiec', title: 'Ola',
    text: 'Kuchnia, zapach naleśników, ktoś bliski woła „Majka, chodź!”. Litera O z bransoletki to Ola.' },
  m_upadek: { cat: 'pamiec', title: 'Schody i upadek',
    text: 'Ktoś szarpał ją za ramię na schodach. Potem uderzenie i ciemność.' },
  m_fasola: { cat: 'pamiec', title: 'Fasola',
    text: 'Mały kundel z krzywym uchem, który śpi w jej nogach. Ma do kogo wracać.' },
};

/* =====================================================================
   PYTANIA I POLECENIA OPERATORA
   run() zwraca wiadomości rozmówczyni; ustawia też poszlaki i flagi.
   light: true – potrzebne światło (żarówka albo zapalniczka)
   calm: true – działa nawet przy panice
   repeat: N – można powtórzyć po N minutach
   ===================================================================== */
const Q_CATS = {
  stan:      'Stan',
  otoczenie: 'Otoczenie',
  zmysly:    'Dźwięki i zapachy',
  ona:       'Ona',
  polecenia: 'Polecenia',
};

const QUESTIONS = [
  /* ---------------- STAN ---------------- */
  { id: 'ranna', cat: 'stan', text: 'Czy jesteś ranna? Coś cię boli?',
    run() { clue('glowa'); return [
      'głowa. z tyłu',
      'jak dotykam to mam we włosach coś twardego i lepkiego. krew chyba',
      'kręci mi się w głowie jak wstaję'] } },

  { id: 'krew', cat: 'stan', text: 'Dotknij rany bardzo delikatnie. Czy nadal krwawi?',
    avail: () => has('glowa'),
    run() { flag('krew'); return [
      'chyba już nie leci. tylko jest mokro',
      'boli jak cholera'] } },

  { id: 'ucisk', cat: 'stan', text: 'Złóż rękaw albo chusteczkę i przyciśnij lekko do rany. Trzymaj kilka minut.',
    avail: () => asked('krew'),
    run() { flag('ucisk'); dH(+6); good('Instrukcja: ucisk rany głowy'); return [
      'mam chusteczkę z kieszeni. trzymam',
      'piszę jedną ręką wiec wolniej'] } },

  { id: 'nie_spij', cat: 'stan', calm: true, text: 'Masz uraz głowy. Nie wolno ci zasnąć. Cały czas pisz do mnie, dobrze?',
    avail: () => has('glowa'),
    run() { flag('czuwa'); dS(-4); good('Instrukcja: nie zasypiać przy urazie głowy'); return [
      'dobrze. nie zasnę',
      'tylko ty też nie przestawaj pisać. prosze'] } },

  { id: 'oddech', cat: 'stan', text: 'Jak ci się oddycha? Opisz to dokładnie.',
    avail: () => has('astma_start'),
    run() { clue('oddech'); return [
      'ciężko. świszczy mi w piersiach jak wydycham',
      'jakby ktoś mnie ściskał pasem',
      'jak się boję to jest gorzej'] } },

  { id: 'oddech_instr', cat: 'stan', calm: true,
    text: 'Usiądź prosto i oprzyj dłonie na kolanach. Wdech nosem, a potem długi, powolny wydech przez złożone usta, jak przez słomkę.',
    avail: () => has('oddech'),
    run() { flag('oddech_instr'); dH(+8); dS(-8); good('Instrukcja: pozycja i oddech przy duszności'); return [
      'siedzę',
      'wdech… i wydech jak przez słomkę',
      'trochę lepiej. przy długim wydechu mniej świszczy'] } },

  { id: 'inhalator', cat: 'stan',
    text: () => has('astma')
      ? 'Twoja siostra mówi, że masz astmę i nosisz inhalator w małej kieszonce przy rękawie bluzy. Sprawdź ją.'
      : (has('kieszonka') ? 'Przy rękawie bluzy jest kieszonka na zamek. Sprawdź, czy nie masz w niej inhalatora.'
        : 'Możesz chorować na astmę. Sprawdź dokładnie, czy nie masz przy sobie inhalatora.'),
    avail: () => has('oddech') && !has('inhalator') && (!asked('inhalator') || has('astma') || has('kieszonka')),
    repeat: 0.01,
    run() {
      if (has('astma') || has('kieszonka')) {
        flag('inhalator'); S.asthma = false; dH(+20); dS(-10); good('Odnaleziony inhalator');
        return ['kieszonka przy rękawie… zamek się zacina',
          'JEST. niebieski inhalator. jak mogłam nie wiedzieć',
          'dwa wdechy',
          'o boże. powietrze. dziękuję'];
      }
      return ['w kieszeniach spodni nie ma nic takiego',
        'nie wiem czy choruję. nic nie wiem'];
    } },

  { id: 'zimno', cat: 'stan', text: 'Jest ci zimno?',
    avail: () => has('piwnica') || asked('podloga'),
    run() { clue('zimno'); return [
      'bardzo. cała się trzęsę',
      'podłoga jest mokra. mam mokre spodnie'] } },

  { id: 'okryj', cat: 'stan', light: true, text: 'Poszukaj czegoś, czym możesz się okryć, i nie siedź na gołym betonie.',
    avail: () => has('zimno'),
    run() { flag('cieplo'); flag('zapalniczka'); dH(+8); clue('paragon'); good('Instrukcja: ochrona przed wychłodzeniem'); return [
      'na haku przy schodach wisi stara kurtka robocza. śmierdzi papierosami i psem',
      'założyłam. siedzę na skrzynce',
      'w kieszeni jest zapalniczka i paragon',
      'stacja paliw kolejowa. 25.10 21:40. olej napędowy 40 l. zapłacone kartą FUNDACJA PP'] } },

  { id: 'pic', cat: 'stan', text: 'Masz tam cokolwiek do picia?',
    avail: () => has('piwnica'),
    run() { flag('pic'); return [
      'nie piłam nic od… nie wiem od kiedy',
      'na półce stoi butelka bez etykiety z czymś przezroczystym. i są słoiki'] } },

  { id: 'butelka_wach', cat: 'stan', text: 'Nie pij od razu z tej butelki. Odkręć ją i najpierw powąchaj.',
    avail: () => has('pic') && !has('butelka'),
    run() { flag('butelka'); clue('rozpuszczalnik'); dS(+3); good('Ostrzeżenie przed nieznanym płynem'); return [
      'fuj. śmierdzi jak rozpuszczalnik. jak zmywacz',
      'chciałam to wypić. o boże'] } },

  { id: 'butelka_pij', cat: 'stan', text: 'Napij się z butelki, małymi łykami.',
    avail: () => has('pic') && !has('butelka'),
    run() { flag('butelka'); clue('rozpuszczalnik'); dH(-22); dS(+18); mistake('Kazano jej wypić nieznany płyn (rozpuszczalnik)'); return [
      'piecze!!!',
      'to nie woda. to jakiś rozpuszczalnik',
      'wyplułam. pali mnie gardło i język',
      'dlaczego?? skąd miałam wiedzieć'] } },

  { id: 'kompot', cat: 'stan', light: true, text: 'Otwórz słoik z owocami albo kompotem i wypij trochę soku.',
    avail: () => has('pic') && has('sloiki'),
    run() { dH(+8); dS(-4); good('Nawodnienie: kompot ze słoika'); return [
      'wiśnie. słodkie. dobrze że nie ogórki',
      'przepraszam że to piszę. ale lepiej'] } },

  /* ---------------- OTOCZENIE ---------------- */
  { id: 'opisz', cat: 'otoczenie', light: true, text: 'Opisz mi, co widzisz wokół siebie.',
    run() { clue('piwnica'); return [
      'mała piwnica. ściany z cegły, niski sufit',
      'na środku wisi jedna żarówka na kablu. tylko ona świeci',
      'drewniane półki ze słoikami. i schody na górę do drzwi'] } },

  { id: 'drzwi', cat: 'otoczenie', text: 'Czy drzwi na górze są zamknięte? Sprawdzałaś je?',
    avail: () => has('piwnica'),
    run() { clue('schody'); flag('zagrozenie');
      const m = ['tak. zamknięte od zewnątrz. jak się szarpie to słychać zasuwę',
        'schody drewniane, strasznie skrzypią'];
      m.push(S.perp === 'home' ? 'nad sufitem ktoś chodzi. słyszę telewizor. to chyba dom' : 'teraz na górze jest cicho. ale wcześniej ktoś tam chodził');
      return m; } },

  { id: 'okno', cat: 'otoczenie', text: 'Czy jest tam jakieś okno albo otwór na zewnątrz?',
    avail: () => has('piwnica'),
    run() { clue('luksfery'); return [
      'pod sufitem takie okienko z grubych szklanych kostek. nic przez nie nie widać',
      'wpada pomarańczowe światło. jak z latarni',
      'czasem przesuwa się białe. chyba światła aut'] } },

  { id: 'polki', cat: 'otoczenie', light: true, text: 'Co dokładnie stoi na półkach?',
    avail: () => has('piwnica'),
    run() { clue('sloiki'); flag('pic_seen'); return [
      'słoiki. ogórki, wiśnie, dżem. dużo',
      'na naklejkach ktoś pisał ręcznie. „wiśnie 2021 H.W.”',
      'jest butelka bez etykiety i pusta skrzynka po narzędziach'] } },

  { id: 'sciany', cat: 'otoczenie', light: true, text: 'Co jest na ścianach? Rury, liczniki, skrzynki?',
    avail: () => has('piwnica'),
    run() { flag('licznik_widziany'); return [
      'rury pod sufitem. jedna jest ciepła',
      'przy schodach wysoko wisi skrzynka z szybką. w środku kręci się kółeczko',
      'licznik prądu chyba?'] } },

  { id: 'licznik', cat: 'otoczenie', light: true,
    text: 'Spróbuj odczytać naklejkę na liczniku. Najważniejszy jest długi numer PPE.',
    avail: () => has('licznik_widziany') && !has('licznik'),
    repeat: 3,
    run() {
      if (S.health < 35) {
        dH(-10); dS(+10);
        return ['muszę wejść na skrzynkę. chwila', 'spadłam', 'wszystko się kręci. nie dam rady. nie teraz'];
      }
      const m = ['muszę wejść na skrzynkę. chwila'];
      if (S.perp === 'home' && !has('cicho')) {
        S.perpSuspicious = true; dS(+15);
        m.push('skrzynka zgrzytnęła o beton', 'on krzyknął z góry „co tam się dzieje?!”', 'nie ruszam się. cisza. chyba odpuścił');
      }
      clue('licznik'); dB(-1);
      m.push('jest naklejka. PPE 590 543 017 004 417 781', 'i logo firmy. ENERPOL dystrybucja');
      return m; } },

  { id: 'katy', cat: 'otoczenie', light: true, text: 'Obejdź powoli piwnicę i sprawdź wszystkie kąty.',
    avail: () => has('piwnica'),
    run() { clue('zsyp'); return [
      'w jednym rogu jest kupka węgla',
      'nad nią w ścianie metalowa klapa. taki zsyp na węgiel',
      'zamknięta od zewnątrz. pchałam. nic'] } },

  { id: 'podloga', cat: 'otoczenie', text: 'Na czym siedzisz? Jaka jest podłoga?',
    run() { return [
      'beton. mokry i zimny',
      'siedzę pod ścianą przy półkach'] } },

  /* ---------------- DŹWIĘKI I ZAPACHY ---------------- */
  { id: 'sluchaj', cat: 'zmysly', text: 'Zamknij na chwilę oczy i posłuchaj. Co słyszysz?',
    run() { clue('pies'); flag('zagrozenie');
      if (S.perp === 'home') return [
        'telewizor nad głową. chyba wiadomości albo mecz',
        'na dworze szczeka pies. gruby głos, duży pies',
        'i kapie woda gdzieś w rogu'];
      return ['na górze cisza', 'pies szczeka na dworze. duży', 'kapie woda. czasem przejedzie auto']; } },

  { id: 'pociag', cat: 'zmysly', text: 'To dudnienie wcześniej. Jak długo trwało i jak brzmiało?',
    avail: () => has('huk'),
    run() { clue('pociag'); return [
      'z pół minuty. narastało i cichło',
      'podłoga drżała, słoiki brzęczały. i taki stukot. tu-tum tu-tum',
      'to był pociąg. jestem pewna. bardzo blisko'] } },

  { id: 'zapach', cat: 'zmysly', text: 'Czy czujesz jakiś zapach?',
    run() { clue('slod'); return [
      'wilgoć. węgiel. kurz',
      'i coś słodkiego. jak pieczony chleb albo mokre zboże',
      'najmocniej przy okienku'] } },

  { id: 'policz', cat: 'zmysly', text: 'Za kilka minut będzie północ. Nasłuchuj, czy coś nie wybije godziny, i policz uderzenia.',
    avail: () => S.t < 18.5,
    run() { flag('policz'); return ['dobrze. będę liczyć'] } },

  { id: 'dzwony', cat: 'zmysly', text: 'O północy coś biło. Ile było uderzeń i jak głośno?',
    avail: () => S.t >= 19 && !has('dzwon'),
    run() { clue('dzwon'); return [
      'chyba dwanaście. nie liczyłam dokładnie',
      'głośno. jakby kościół był bardzo blisko'] } },

  { id: 'ulica', cat: 'zmysly', text: 'Słychać ulicę? Auta, ludzi, kroki?',
    run() { flag('ulica'); return [
      'rzadko auto. jedzie powoli. chyba wąska ulica',
      'raz ktoś szedł i się śmiał',
      'krzyczeć jak ktoś będzie przechodził?'] } },

  /* ---------------- ONA ---------------- */
  { id: 'imie', cat: 'ona', text: 'Pamiętasz, jak masz na imię?',
    run() {
      if (S.identity) return ['Maja. Majka. już wiem. dzięki tobie'];
      if (has('majka')) return ['Majka? to brzmi znajomo. ale nie umiem tego poczuć'];
      dS(+4); return ['nie. próbuję i jest pusto', 'jakby ktoś wyrwał kartkę z książki']; },
    repeat: 20 },

  { id: 'ostatnie', cat: 'ona', text: 'Co pamiętasz jako ostatnie, zanim się tu obudziłaś?',
    run() { clue('m_autobus'); return [
      { mem: 'autobus. siedziałam z tyłu i patrzyłam w telefon' },
      'byłam zła. albo się bałam. serce mi waliło'] } },

  { id: 'autobus', cat: 'ona', text: 'Dokąd jechałaś tym autobusem?',
    avail: () => has('m_autobus'),
    run() { clue('m_psy'); return [
      'na koniec trasy',
      { mem: 'tam gdzie szczeka dużo psów. bardzo dużo psów' },
      'nie wiem skąd to wiem'] } },

  { id: 'kieszenie', cat: 'ona', light: true, text: 'Sprawdź wszystkie kieszenie. Co w nich masz?',
    run() { clue('bilet'); flag('kieszenie'); return [
      'gumka do włosów. chusteczka',
      'bilet autobusowy. linia 7. skasowany 25.10 o 18:12',
      'telefon był w kieszeni bluzy. ale nie wiem czy jest mój'] } },

  { id: 'telefon', cat: 'ona', text: 'Czy ten telefon jest twój? Co widać na ekranie blokady?',
    avail: () => has('kieszenie'),
    run() { clue('telefon'); return [
      'zablokowany. pin. nie znam pinu. mogę tylko pisać na 112',
      'na tapecie wielki czarny pies. owczarek',
      'nie znam go. ale się go boję. dziwne'] } },

  { id: 'ubranie', cat: 'ona', text: 'Co masz na sobie?',
    run() { flag('napis'); return [
      'szara bluza z kapturem, jeansy, adidasy',
      'na plecach bluzy jest jakiś napis. nie widzę go'] } },

  { id: 'bluza', cat: 'ona', light: true, text: 'Zdejmij na chwilę bluzę i przeczytaj, co jest napisane na plecach.',
    avail: () => has('napis'),
    run() { clue('bluza'); flag('kieszonka'); dS(+2); return [
      'zimno… chwila',
      'PSIA PRZYSTAŃ. pod spodem WOLONTARIAT. i łapa',
      'przy rękawie jest jeszcze mała kieszonka na zamek',
      'założyłam z powrotem'] } },

  { id: 'rece', cat: 'ona', light: true, text: 'Spójrz na swoje dłonie i nadgarstki. Widzisz coś szczególnego?',
    run() { clue('tatuaz'); clue('bransoletka'); return [
      'podrapane ręce. jak od pazurów',
      'na lewym nadgarstku tatuaż. mała psia łapka',
      'i bransoletka z koralików. M & O'] } },

  { id: 'wlosy', cat: 'ona', text: 'Jakie masz włosy?',
    run() { clue('wlosy'); return [
      'rude. długie, w kucyku',
      'dziwne. wiem jakie mam włosy a nie wiem jak mam na imię'] } },

  { id: 'aparat', cat: 'ona', text: 'Włącz przedni aparat i opisz mi swoją twarz. (Zużyje dużo baterii.)',
    run() { dB(-3); clue('twarz'); dS(+6); return [
      'włączam',
      'młoda. może dwadzieścia lat. piegi. zielone oczy',
      'rozcięta brew i zaschnięta krew na policzku',
      'nie znam tej dziewczyny'] } },

  { id: 'mo', cat: 'ona', text: 'Litery M i O na bransoletce. Czy coś ci mówią?',
    avail: () => has('bransoletka'),
    run() { clue('m_ola'); clue('majka'); dS(+4); return [
      'O…',
      { mem: 'Ola. kuchnia. pachnie naleśnikami. ktoś woła „Majka, chodź!”' },
      'Majka. czy ja jestem Majka?'] } },

  { id: 'kto', cat: 'ona', text: 'Pamiętasz, jak się tu znalazłaś? Kto cię tu przyprowadził?',
    avail: () => has('m_psy') || has('telefon'),
    run() { clue('glos'); clue('m_upadek'); dS(+8); return [
      'mężczyzna. spokojny głos. to było najgorsze że spokojny',
      { mem: '„nie powinnaś była tu przychodzić”' },
      { mem: 'schody. szarpał mnie za ramię. potem uderzenie i nic' }] } },

  { id: 'dlaczego', cat: 'ona', text: 'Dlaczego jechałaś tam, gdzie są psy? Co tam robiłaś?',
    avail: () => has('glos') && has('m_psy'),
    run() { clue('zdjecia'); return [
      'zdjęcia',
      { mem: 'robiłam zdjęcia. moim telefonem. w garażu za schroniskiem' },
      'klatki jedna na drugiej. szczeniaki chore. bardzo dużo',
      'chciałam to komuś pokazać. chyba policji'] } },

  { id: 'weryfikacja', cat: 'ona',
    text: () => `Czy imię i nazwisko ${S.candidate ? S.candidate.name : ''} coś ci mówi?`,
    avail: () => S.candidate && !S.identity && !S.candidateRejected[S.candidate.id],
    repeat: 0.01,
    run() {
      if (S.candidate.id === 'maja') {
        S.identity = true; clue('tozsamosc'); dS(-15); good('Tożsamość potwierdzona przez nią samą');
        return ['Maja Sikorska',
          '…',
          'tak. TAK. to ja. Majka',
          { mem: 'Ola to moja siostra. mieszkamy na Kasztanowej. ona robi najgorsze naleśniki na świecie' },
          'boże Ola. ona pewnie szaleje'];
      }
      S.candidateRejected[S.candidate.id] = true; dS(+5);
      return ['nie… to nie brzmi jak ja', 'przepraszam. naprawdę próbuję'];
    } },

  { id: 'fasola', cat: 'ona', calm: true, text: 'Ola czeka na ciebie w domu z Fasolą. Pamiętasz Fasolę?',
    avail: () => has('siostra_rozmowa'),
    run() { clue('m_fasola'); dS(-22); good('Uspokojenie przez bliskie wspomnienie'); return [
      'Fasola!!',
      { mem: 'mały kundel z krzywym uchem. śpi mi w nogach i chrapie' },
      'dobrze. muszę wrócić. dla niej'] } },

  /* ---------------- POLECENIA ---------------- */
  { id: 'cicho', cat: 'polecenia', text: 'Nie krzycz i nie hałasuj. Pisz tylko do mnie, tak cicho, jak możesz.',
    run() { flag('cicho'); good('Polecenie zachowania ciszy'); return ['dobrze. jestem cicho'] } },

  { id: 'ekran', cat: 'polecenia', text: 'Przyciemnij ekran do minimum i wyłącz wszystko oprócz wiadomości. Musimy oszczędzać baterię.',
    run() { flag('dim'); good('Oszczędzanie baterii'); return [`zrobione. mam ${Math.max(1, Math.round(S.battery))}%`] } },

  { id: 'jestem', cat: 'polecenia', calm: true, repeat: 6,
    text: () => (S.order && S.order.status !== 'wolny')
      ? 'Policja już do ciebie jedzie. Wytrzymaj jeszcze chwilę, jestem tu cały czas.'
      : 'Jestem z tobą. Szukamy cię i nie przerwę tej rozmowy.',
    run() {
      if (S.order && S.order.status !== 'wolny') { dS(-18); return ['jedzie. naprawdę jedzie', 'dobrze. czekam. nie zostawiaj mnie']; }
      dS(-10); return ['dobrze', 'obiecujesz?'];
    } },

  { id: 'oddychaj', cat: 'polecenia', calm: true, repeat: 5,
    text: 'Oddychaj razem ze mną: wdech na cztery, wydech na sześć. Trzy razy.',
    run() { dS(-12); dH(+2); return ['wdech', 'wydech', '…ok. trochę lepiej'] } },

  { id: 'wykrec', cat: 'polecenia', text: 'Wykręć żarówkę. W ciemności nikt nie zobaczy, że nie śpisz.',
    avail: () => S.bulb === 'on',
    repeat: 0.01,
    run() { S.bulb = 'off'; dS(+8); return ['gorąca… owinęłam rękawem', 'zrobione. ciemno. świeci tylko ekran'] } },

  { id: 'wkrec', cat: 'polecenia', text: 'Wkręć z powrotem żarówkę.',
    avail: () => S.bulb === 'off',
    repeat: 0.01,
    run() { S.bulb = 'on'; dS(-4); return ['jest światło. dzięki bogu'] } },

  { id: 'bron', cat: 'polecenia', light: true, text: 'Poszukaj czegoś, czym w razie czego możesz się obronić.',
    run() { flag('rura'); return ['pusta skrzynka. słoiki', 'pod schodami leży kawałek metalowej rury', 'trzymam ją. ręce mi się trzęsą'] } },

  { id: 'plan', cat: 'polecenia', text: 'Jeśli ktoś będzie schodził: zgaś światło, schowaj telefon pod bluzę i udawaj, że śpisz.',
    avail: () => has('zagrozenie'),
    run() { flag('plan_ukrycia'); good('Plan na wypadek powrotu sprawcy'); return ['pod bluzę i śpię', 'a jak on…', 'dobrze. tak zrobię'] } },

  { id: 'krzycz', cat: 'polecenia', text: 'Krzycz głośno o pomoc!',
    avail: () => has('ulica') || has('zagrozenie'),
    repeat: 8,
    run() {
      if (S.perp === 'home') {
        S.perpSuspicious = true; dS(+25); mistake('Polecenie krzyku, gdy sprawca był w domu');
        return ['POMOCY!!! POMOCY!!!', '…', 'on wali w drzwi. krzyczy „jeszcze raz a pożałujesz”', 'przepraszam przepraszam'];
      }
      dS(+8); dH(-3);
      return ['krzyczałam aż mnie gardło boli', 'nikt. tylko pies szczeka mocniej'];
    } },

  { id: 'mrugaj', cat: 'polecenia', repeat: 2,
    text: 'Patrol jest już w okolicy. Wykręcaj i wkręcaj żarówkę: trzy razy, powoli.',
    avail: () => policeOnStreet() && S.bulb !== 'dead' && !has('potwierdzony'),
    run() { flag('mruga'); return ['wykręcam… wkręcam', 'raz… dwa… trzy', 'parzy w palce ale robię'] },
    after: () => blinkResult() },
];

const PANIC = [
  'nie umiem nie umiem nie umiem',
  'on wróci. on wróci i',
  'nie mogę oddychać nie mogę myśleć',
  'przepraszam. ręce mi się trzęsą. o co pytałeś… o co pytałaś',
  'nie wiem!! nie wiem nic!!',
];
const DARK = [
  'jest ciemno. nic nie widzę',
  'nie widzę. trzeba by wkręcić żarówkę',
];

/* =====================================================================
   ZDARZENIA (sprawdzane po każdym upływie czasu)
   ===================================================================== */
const EVENTS = [
  { id: 'mruga1', when: () => S.t >= 4 && S.bulb === 'on',
    async run() { flickerBulb(3); sfx('flicker'); dS(+6); await her([
      'żarówka mruga!!',
      'nie gaśnij nie gaśnij',
      '…dobra. świeci. jak zgaśnie to oszaleję']); } },

  { id: 'kroki', when: () => S.t >= 9 && S.perp === 'home' && !S.alarm,
    async run() {
      flag('zagrozenie'); sfx('steps');
      await her(['ktoś chodzi nad głową', 'idzie w stronę drzwi do piwnicy?']);
      await decide({
        title: 'Kroki nad piwnicą', text: 'Ktoś chodzi tuż nad nią. Co jej każesz?', timer: 12,
        options: [
          { label: 'Wykręć żarówkę i bądź cicho.', async run() {
              S.bulb = 'off'; dS(+5); good('Właściwa reakcja na kroki');
              await opSay('Wykręć żarówkę i bądź cicho.');
              await her(['wykręciłam. ciemno', '…', 'poszedł dalej. chyba do kuchni. słyszę lodówkę']); } },
          { label: 'Schowaj telefon i udawaj, że śpisz.', async run() {
              good('Właściwa reakcja na kroki');
              await opSay('Schowaj telefon i udawaj, że śpisz.');
              await her(['schowałam']); await pauseContact(2);
              await her(['poszedł. nie zszedł', 'trzęsę się cała']); } },
          { label: 'Krzycz o pomoc, może ktoś usłyszy!', async run() {
              S.perpSuspicious = true; dS(+25); mistake('Polecenie krzyku, gdy sprawca był w domu');
              await opSay('Krzycz o pomoc!');
              await her(['POMOCY!!!', '…', 'on wali w drzwi. „jeszcze raz a pożałujesz”', 'przepraszam. przepraszam']); } },
        ],
        async onTimeout() { dS(+10); await her(['nie wiem co robić', '…', 'poszedł. nie zszedł. trzęsę się cała']); },
      });
    } },

  { id: 'huk', when: () => S.t >= 13,
    async run() { flag('huk'); sfx('train'); shake(); await her([
      'coś huczy!!',
      'wszystko się trzęsie. słoiki dzwonią',
      '…',
      'przestało']); } },

  { id: 'astma', when: () => S.t >= 16,
    async run() { flag('astma_start'); S.asthma = true; await her([
      'ciężko mi oddychać',
      'świszczy mi w piersiach. jak się boję to jeszcze gorzej']); } },

  { id: 'polnoc', when: () => S.t >= 19,
    async run() {
      sfx('bells');
      await sys('00:00 – północ.');
      if (has('policz')) {
        clue('dzwon'); good('Polecenie liczenia uderzeń zegara');
        await her(['BIJE ZEGAR', 'liczę…', 'dwanaście. 12 uderzeń. bardzo głośno, blisko. z tej strony co okienko']);
      } else {
        await her(['coś bije. dzwony?', 'głośno']);
      }
    } },

  { id: 'wyjazd', when: () => S.t >= 21 && S.perp === 'home' && !S.alarm && !S.perpMoveAt,
    async run() {
      S.perp = 'away'; clue('auto'); sfx('car');
      S.perpReturnAt = S.t + (S.perpSuspicious ? 13 : 27);
      await her([
        'trzasnęły drzwi na górze',
        'silnik. stuka jak stary diesel',
        'odjechał. chyba jestem sama w domu',
        'pies dalej szczeka']);
    } },

  { id: 'szczur', when: () => S.t >= 29,
    async run() { dS(+10); await her(['coś przebiegło mi po nodze!!!', 'szczur. boże. nienawidzę ich']); } },

  { id: 'deszcz', when: () => S.t >= 34,
    async run() { S.rain = true; sfx('rain'); await her([
      'chyba zaczęło padać. po okienku spływa woda',
      'ściana obok robi się mokra']); } },

  { id: 'mruga2', when: () => S.t >= 44 && S.bulb === 'on',
    async run() { flickerBulb(6); sfx('flicker'); dS(+6); await her([
      'żarówka znowu mruga. coraz częściej',
      'i brzęczy. jak umrze to ja też']); } },

  { id: 'przepalona', when: () => S.t >= 58 && S.bulb === 'on',
    async run() { S.bulb = 'dead'; flickerBulb(4); sfx('pop'); dS(+15); await her([
      'nie',
      'zgasła. przepaliła się',
      has('zapalniczka') ? 'mam tylko zapalniczkę z kurtki' : 'jest zupełnie ciemno. nie widzę własnych rąk']); } },

  { id: 'powrot', when: () => S.perp === 'away' && S.t >= S.perpReturnAt && !S.rescued && S.contact !== 'lost',
    async run() { await perpComesDown('powrot'); } },

  { id: 'alarm_dom', when: () => S.alarm && S.perp === 'home' && S.t >= S.alarmAt + 2 && !S.rescued && S.contact !== 'lost',
    async run() { await perpComesDown('alarm'); } },

  { id: 'alarm_powrot', when: () => S.alarm && S.perp === 'away' && S.t >= S.alarmAt + 7 && !S.rescued && S.contact !== 'lost',
    async run() { S.fired.add('powrot'); await perpComesDown('alarm'); } },

  { id: 'wywozi', when: () => S.perpMoveAt && S.t >= S.perpMoveAt && S.perp === 'home' && !S.rescued,
    async run() {
      S.moved = true; S.movedAt = S.t; S.perp = 'moved';
      if (S.contact === 'active') {
        await her(['on schodzi. ma taśmę i koc', 'mówi że jedziemy na wycieczkę', 'nie nie nie']);
        await perpSays(['koniec zabawy.']);
        await loseContact('sprawca');
      }
    } },

  { id: 'syreny', when: () => S.order && S.order.status === 'jedzie' && S.order.sirens && onSlodowa(S.order) && S.order.eta - S.t <= 1.5,
    async run() {
      if (S.contact === 'active') await her(['SYRENY!! słyszę syreny. blisko!']);
      if (S.perp === 'home') {
        S.perp = 'fled'; sfx('car');
        if (S.contact === 'active') await her(['on biega na górze. trzasnęły drzwi', 'auto odjeżdża. pisk opon']);
      }
    } },

  { id: 'senna', when: () => S.health < 30 && S.contact === 'active',
    async run() { await her(has('czuwa')
      ? ['oczy mi się zamykają. ale pamiętam. nie spać', 'pisz do mnie']
      : ['jestem taka zmęczona', 'może się na chwilę położę']); } },

  { id: 'senna2', when: () => S.health < 15 && S.contact === 'active',
    async run() { await her(['nie czje rąk', 'ciemnno sie robi']); } },
];

/* =====================================================================
   SEKWENCJA: SPRAWCA SCHODZI DO PIWNICY
   ===================================================================== */
async function perpComesDown(kind) {
  S.perp = 'basement'; sfx('car');
  await her(kind === 'powrot'
    ? ['auto pod domem!!', 'on wrócił. trzasnęły drzwi', 'idzie tutaj. słyszę zasuwę']
    : ['on schodzi!!', 'szybko schodzi. zasuwa', 'krzyczy na psa. jest wściekły']);
  if (S.contact !== 'active') { S.perp = 'home'; return; }
  sfx('alarm');
  await decide({
    title: 'Sprawca schodzi do piwnicy', text: 'Masz kilka sekund, zanim otworzy drzwi.', timer: 15,
    options: [
      { label: 'Zgaś światło, schowaj telefon i udawaj nieprzytomną.', run: () => hideOutcome(kind, false) },
      { label: 'Weź rurę i stań przy schodach. Uderz, gdy otworzy, i uciekaj.', show: () => has('rura'), run: () => fightOutcome() },
      { label: 'Krzycz, że policja już jedzie!', show: () => S.order && S.order.status !== 'wolny', run: () => bluffOutcome() },
      { label: 'Nie przerywaj, pisz do mnie dalej.', run: () => caughtOutcome(true) },
    ],
    onTimeout: () => (has('plan_ukrycia') || S.bulb !== 'on') ? hideOutcome(kind, true) : caughtOutcome(false),
  });
}

async function hideOutcome(kind, timedOut) {
  if (!timedOut) await opSay('Zgaś światło, schowaj telefon i udawaj nieprzytomną.');
  else if (has('plan_ukrycia')) await sys('Brak polecenia. Rozmówczyni robi to, co ustaliliście wcześniej.');
  if (S.bulb === 'on') S.bulb = 'off';
  good('Ukryła telefon przed sprawcą');
  await pauseContact(kind === 'alarm' ? 4 : 3);
  if (S.contact === 'lost') return;
  S.perp = 'home';
  if (kind === 'alarm') {
    S.perpMoveAt = S.t + 16; dS(+20);
    await her(['…', 'zszedł z latarką. przeszukiwał półki',
      'pytał gdzie jest telefon. udawałam że śpię. kopnął mnie w nogę',
      'trzymałam telefon pod sobą',
      'powiedział do siebie: „za kwadrans cię stąd zabiorę”',
      'poszedł na górę. prosze. szybko']);
  } else {
    dS(+15);
    await her(['…', 'zszedł. świecił mi latarką w twarz',
      'postawił butelkę wody i powiedział „jutro to załatwimy”',
      'poszedł na górę. jest w domu. słyszę telewizor']);
  }
}

async function fightOutcome() {
  await opSay('Weź rurę i stań przy schodach. Uderz, gdy otworzy, i uciekaj.');
  if (S.health >= 45 && S.stress < 96) {
    S.escaped = true; S.escapeT = S.t; S.perp = 'ranny';
    await her(['…', 'UDERZYŁAM', 'leży na schodach. biegnę',
      'drzwi otwarte!! korytarz. drzwi wejściowe',
      'jestem na dworze. deszcz. latarnie',
      'pies szczeka za siatką ale mnie nie goni',
      'na domu tabliczka. SŁODOWA 14',
      'biegnę do sąsiadów. pukam']);
    await sys('Rozmówczyni wydostała się z budynku: ul. Słodowa 14.');
    await rescueByEscape();
    return;
  }
  await her(['…', 'nie trafiłam', 'on mnie trzyma za rękę']);
  await caughtOutcome(false, true);
}

async function bluffOutcome() {
  await opSay('Krzycz, że policja już jedzie!');
  S.perp = 'fled'; dS(+10); sfx('car');
  await her(['POLICJA JUŻ TU JEDZIE!!!', '…', 'zatrzymał się na schodach. zaklął',
    'pobiegł na górę. trzaskanie szuflad', 'auto. odjeżdża. pisk opon', 'chyba uciekł. jestem sama']);
}

async function caughtOutcome(byOrder, afterFight) {
  if (byOrder) { await opSay('Nie przerywaj, pisz do mnie dalej.'); mistake('Telefon nie został ukryty przed sprawcą'); }
  if (!afterFight) await her(['on tu jest', 'świeci mi w ']);
  await perpSays(['kto to', 'z kim piszesz']);
  S.perp = 'home'; S.perpMoveAt = S.t + 12;
  await loseContact('sprawca');
}

/* =====================================================================
   MAPA (współrzędne w px, 1 px = 2 m)
   ===================================================================== */
const MAP = {
  rail: { x1: 0, y1: 200, x2: 1000, y2: 150 },
  brewery: { x: 765, y: 285 },
  church: { x: 520, y: 395 },
  bts: { x: 430, y: 330, from: 15, to: 75, r: 600 },
  ranges: { rail: 75, malt: 240, bell: 350 },
};

const STREETS = [
  { id: 'slodowa',   name: 'ul. Słodowa',    pts: [[430, 252], [705, 252]], recon: true },
  { id: 'torowa',    name: 'ul. Torowa',     pts: [[705, 252], [790, 212], [895, 205]], recon: true },
  { id: 'browarna',  name: 'ul. Browarna',   pts: [[705, 252], [705, 470]], recon: true },
  { id: 'kolejowa',  name: 'ul. Kolejowa',   pts: [[30, 240], [430, 228], [430, 252]], recon: true },
  { id: 'nadrzeczna', name: 'ul. Nadrzeczna', pts: [[705, 360], [830, 360], [855, 480], [890, 560]], recon: true },
  { id: 'koscielna', name: 'ul. Kościelna',  pts: [[300, 430], [705, 430]] },
  { id: 'glowna',    name: 'ul. Główna',     pts: [[300, 120], [300, 700]] },
  { id: 'ogrodowa',  name: 'ul. Ogrodowa',   pts: [[120, 560], [1000, 560]], recon: true },
  { id: 'kasztanowa', name: 'ul. Kasztanowa', pts: [[40, 470], [300, 470]] },
  { id: 'mlynska',   name: 'ul. Młyńska',    pts: [[560, 430], [560, 700]] },
  { id: 'polna',     name: 'ul. Polna',      pts: [[945, 560], [990, 700]] },
];

/* type: dom | kamienica | blok | obiekt */
const BUILDINGS = [
  { id: 'slodowa6', addr: 'ul. Słodowa 6', street: 'slodowa', x: 470, y: 228, w: 22, h: 17, type: 'dom', year: 1938,
    heating: 'węglowe', power: true, basement: true,
    note: 'Dom murowany, parterowy z poddaszem.',
    report: 'Słodowa 6: otworzyło starsze małżeństwo, obudzone. Za zgodą sprawdziliśmy piwnicę: pusto. Sąsiad mówi, że pod czternastką „syn starego Wróbla coś ostatnio kombinuje, biały bus jeździ po nocach”.',
    clue: 'sasiedzi' },
  { id: 'slodowa10', addr: 'ul. Słodowa 10', street: 'slodowa', x: 530, y: 228, w: 22, h: 17, type: 'dom', year: 1936,
    heating: 'gazowe (modernizacja 2015)', power: true, basement: true,
    note: 'Dom po termomodernizacji, kocioł gazowy.',
    report: 'Słodowa 10: młoda rodzina, płacze obudzone dziecko. Piwnica przerobiona na pralnię, pusto. Nikt nic nie słyszał.' },
  { id: 'slodowa14', addr: 'ul. Słodowa 14', street: 'slodowa', x: 590, y: 228, w: 24, h: 18, type: 'dom', year: 1934,
    heating: 'węglowe', power: true, basement: true,
    note: 'Dom przedwojenny, piętrowy, z piwnicą pod całym budynkiem.' },
  { id: 'slodowa18', addr: 'ul. Słodowa 18', street: 'slodowa', x: 650, y: 228, w: 22, h: 17, type: 'dom', year: 1931,
    heating: 'brak (pustostan)', power: false, basement: true,
    note: 'Pustostan. Przyłącze energii odłączone w 2019 r.',
    report: 'Słodowa 18: pustostan, okna zabite deskami. Weszliśmy przez wyważone drzwi: kurz bez śladów, prądu brak. Nikogo.' },
  { id: 'torowa2', addr: 'ul. Torowa 2', street: 'torowa', x: 830, y: 184, w: 22, h: 16, type: 'dom', year: 1998,
    heating: 'gazowe', power: true, basement: true,
    note: 'Dom z lat 90., garaż w piwnicy.',
    report: 'Torowa 2: właściciel w piżamie, bardzo zły. Piwnica to garaż z autem. Nikogo.' },
  { id: 'torowa5', addr: 'ul. Torowa 5', street: 'torowa', x: 870, y: 226, w: 22, h: 16, type: 'dom', year: 2012,
    heating: 'pompa ciepła', power: true, basement: false,
    note: 'Nowy dom bez podpiwniczenia.',
    report: 'Torowa 5: nowy dom bez piwnicy. Lokatorzy nic nie słyszeli.' },
  { id: 'browarna3', addr: 'ul. Browarna 3', street: 'browarna', x: 680, y: 340, w: 20, h: 18, type: 'dom', year: 1929,
    heating: 'węglowe', power: true, basement: true,
    note: 'Dom przy murze browaru.',
    report: 'Browarna 3: otworzyła starsza pani, przestraszona. Piwnica pełna węgla i rowerów, nikogo.' },
  { id: 'browarna7', addr: 'ul. Browarna 7', street: 'browarna', x: 735, y: 352, w: 22, h: 18, type: 'dom', year: 1952,
    heating: 'węglowe', power: true, basement: true,
    note: 'Dom z warsztatem w piwnicy.',
    report: 'Browarna 7: lokator majsterkował w piwnicy przy lampie, stąd światło. Zdziwiony, ale współpracuje. Nikogo innego.' },
  { id: 'kolejowa12', addr: 'ul. Kolejowa 12', street: 'kolejowa', x: 300, y: 210, w: 40, h: 18, type: 'kamienica', year: 1905,
    heating: 'węglowe (piece kaflowe)', power: true, basement: true,
    note: 'Kamienica, 8 lokali, korytarz piwniczny z komórkami.',
    report: 'Kolejowa 12: kamienica, osiem lokali. Przeszliśmy korytarz piwniczny i zapukaliśmy do każdej komórki: cisza, kłódki nienaruszone.' },
  { id: 'nadrzeczna9', addr: 'ul. Nadrzeczna 9', street: 'nadrzeczna', x: 852, y: 405, w: 22, h: 16, type: 'dom', year: 1960,
    heating: 'węglowe', power: true, basement: true,
    note: 'Dom nad rzeką, piwnica często zalewana.',
    report: 'Nadrzeczna 9: piwnica zalana do kostek, lokator wypompowuje wodę. Nikogo.' },
  { id: 'nadrzeczna11', addr: 'ul. Nadrzeczna 11', street: 'nadrzeczna', x: 870, y: 452, w: 22, h: 16, type: 'dom', year: 1974,
    heating: 'olejowe', power: true, basement: true,
    note: 'Dom z lat 70.',
    report: 'Nadrzeczna 11: nikt nie otwiera, w środku ciemno. Sąsiad mówi, że właściciele są w Norwegii. Przez okienka piwnicy ciemno i cicho.' },
  { id: 'ogrodowa22', addr: 'ul. Ogrodowa 22/5', street: 'ogrodowa', x: 405, y: 578, w: 70, h: 24, type: 'blok', year: 1979,
    heating: 'miejska sieć ciepłownicza', power: true, basement: true,
    note: 'Blok, 40 mieszkań, piwnice z komórkami lokatorskimi.',
    report: 'Ogrodowa 22/5: mieszkanie zamknięte, nikt nie otwiera. Sąsiadka w szlafroku: „pan Wróbel tu prawie nie bywa, siedzi w domu po ojcu, na Słodowej przy torach”.',
    clue: 'sasiadka' },
  { id: 'kasztanowa3', addr: 'ul. Kasztanowa 3/7', street: 'kasztanowa', x: 120, y: 488, w: 64, h: 22, type: 'blok', year: 1984,
    heating: 'miejska sieć ciepłownicza', power: true, basement: true,
    note: 'Blok mieszkalny.',
    report: 'Kasztanowa 3/7: otworzyła roztrzęsiona młoda kobieta, Aleksandra Sikorska. Jej siostra Maja zaginęła w niedzielę. Od dwóch dni szuka jej na własną rękę.' },
  { id: 'polna40', addr: 'ul. Polna 40 (schronisko)', street: 'polna', x: 955, y: 625, w: 36, h: 24, type: 'obiekt', year: 1996,
    heating: 'gazowe', power: true, basement: false,
    note: 'Schronisko dla zwierząt „Psia Przystań”.',
    report: 'Polna 40, schronisko: stróż nocny wpuścił nas na teren. Kierownika nie ma. Stróż mówi, że pan Marek Wróbel „ostatnio remontuje dom po ojcu, gdzieś przy browarze”. W garażu za budynkiem słychać mnóstwo psów, zabezpieczamy do rana.',
    clue: 'straznik' },
];

/* Raport z rekonesansu ulicy */
const RECON = {
  slodowa: () => {
    let r = 'Jedziemy wolno Słodową. Pod 18 pustostan, okna zabite deskami. Pod 14 przedwojenny dom, za bramą duży czarny owczarek.';
    r += S.perp === 'home' ? ' Na podjeździe biały bus, na piętrze migocze telewizor.' : ' Na podjeździe brak auta, w oknach ciemno.';
    if (S.bulb === 'on') { r += ' W piwnicznym okienku z luksferów pod 14 pali się słabe światło.'; clue('swiatlo'); }
    else r += ' Piwnice ciemne.';
    return r + ' Stoimy na ulicy, czekamy na dyspozycje.';
  },
  torowa: () => 'Torowa: domy jednorodzinne, wszystkie ciemne. Za nasypem przejechał pusty skład towarowy. Nic podejrzanego, czekamy na dyspozycje.',
  browarna: () => 'Browarna: pod numerem 7 pali się światło w piwnicy, słychać szlifierkę. Reszta ulicy śpi. Czekamy na dyspozycje.',
  kolejowa: () => 'Kolejowa: kamienice, w kilku oknach jeszcze światło. Przy stacji paliw pusto. Nic podejrzanego.',
  nadrzeczna: () => 'Nadrzeczna: rzeka wysoka, kilka piwnic zalanych, lokatorzy wypompowują wodę. Nic podejrzanego.',
  ogrodowa: () => 'Ogrodowa: bloki, cisza, na parkingu żadnego białego busa. Nic podejrzanego.',
};

/* =====================================================================
   BAZA OSÓB ZAGINIONYCH (fikcyjna)
   ===================================================================== */
const MISSING = [
  { id: 'maja', name: 'Maja Sikorska', age: 19, hair: 'rude', eyes: 'zielone', height: 168, city: 'Kalnów', since: '2026-10-25',
    features: 'piegi; tatuaż psiej łapy na lewym nadgarstku; bransoletka z koralików', clothes: 'szara bluza z kapturem, jeansy, białe adidasy',
    notes: 'Studentka I roku weterynarii, wolontariuszka schroniska Psia Przystań. Choruje na astmę. Ostatnio widziana na przystanku Kasztanowa ok. 18:05.',
    reporter: 'Aleksandra Sikorska (siostra)' },
  { id: 'oliwia', name: 'Oliwia Krawczyk', age: 16, hair: 'rude', eyes: 'niebieskie', height: 160, city: 'Kalnów', since: '2026-10-25',
    features: 'kolczyk w nosie', clothes: 'czarna kurtka, plecak w kwiaty',
    notes: 'Wcześniej trzykrotnie oddalała się z domu. Mogła wyjechać do chłopaka w Poznaniu.',
    reporter: 'Ewa Krawczyk (matka)',
    call: 'Matka Oliwii, roztrzęsiona: „Oliwka nie ma żadnego tatuażu, nie pozwoliłabym. I ma niebieskie oczy”. Po chwili dodaje, że córka właśnie napisała do koleżanki z Poznania.' },
  { id: 'natalia', name: 'Natalia Wójcik', age: 21, hair: 'rude (farbowane)', eyes: 'piwne', height: 172, city: 'Kalnów', since: '2026-10-24',
    features: 'blizna na brodzie', clothes: 'zielony płaszcz',
    notes: 'Wyszła z imprezy w klubie przy ul. Głównej ok. 2:00.',
    reporter: 'Kamil Wójcik (brat)',
    call: 'Brat Natalii: „Natalia ma piwne oczy i bliznę na brodzie, żadnych tatuaży”. Godzinę temu policja z Leszna odnalazła ją u znajomych.' },
  { id: 'karolina', name: 'Karolina Mazur', age: 19, hair: 'ciemny blond', eyes: 'szare', height: 165, city: 'Kalnów', since: '2026-08-01',
    features: 'tatuaż psiej łapy na karku', clothes: 'brak danych',
    notes: 'Prawdopodobnie wyjechała za granicę do pracy sezonowej.',
    reporter: 'Danuta Mazur (babcia)',
    call: 'Babcia Karoliny: „Karolinka ma tatuaż na karku, nie na ręce. I jest w Holandii, dzwoniła w zeszłym tygodniu, tylko policja jeszcze nie zamknęła sprawy”.' },
  { id: 'zuzanna', name: 'Zuzanna Pawlak', age: 20, hair: 'rude', eyes: 'zielone', height: 170, city: 'Lipno', since: '2026-10-19',
    features: 'tatuaż kotwicy na przedramieniu', clothes: 'kurtka jeansowa',
    notes: 'Ostatnio widziana na dworcu PKP w Lipnie.',
    reporter: 'Jan Pawlak (ojciec)',
    call: 'Ojciec Zuzanny: „Ma kotwicę na przedramieniu, nie łapę. I nie zna nikogo w Kalnowie, nigdy tam nie była”.' },
  { id: 'julia', name: 'Julia Kaczmarek', age: 17, hair: 'blond', eyes: 'niebieskie', height: 158, city: 'Rudnik', since: '2026-10-12',
    features: 'tatuaż motyla na łopatce', clothes: 'różowa bluza',
    notes: 'Konflikt z rodzicami, możliwa ucieczka.',
    reporter: 'Marta Kaczmarek (matka)',
    call: 'Matka Julii: „Julka jest blondynką i ma motyla na łopatce. To nie ona”.' },
  { id: 'patrycja', name: 'Patrycja Nowicka', age: 23, hair: 'rude', eyes: 'brązowe', height: 175, city: 'Kalnów', since: '2026-10-20',
    features: 'tatuaż róży na kostce', clothes: 'czerwona kurtka',
    notes: 'Kelnerka, nie przyszła do pracy.',
    reporter: 'Michał Nowicki (partner)',
    call: 'Partner Patrycji: „Ma brązowe oczy i różę na kostce, żadnej łapki ani bransoletek. Ona nie znosi psów”.' },
  { id: 'weronika', name: 'Weronika Zając', age: 34, hair: 'ciemne', eyes: 'brązowe', height: 167, city: 'Kalnów', since: '2026-09-02',
    features: 'brak', clothes: 'brak danych',
    notes: 'Wyjechała samochodem, auto odnaleziono na parkingu leśnym.',
    reporter: 'Piotr Zając (mąż)',
    call: 'Mąż Weroniki: „Żona ma 34 lata i ciemne włosy. To nie może być ona”.' },
  { id: 'agnieszka', name: 'Agnieszka Lewandowska', age: 52, hair: 'siwe', eyes: 'niebieskie', height: 162, city: 'Kalnów', since: '2026-10-21',
    features: 'okulary', clothes: 'beżowy płaszcz',
    notes: 'Choruje na depresję.',
    reporter: 'Tomasz Lewandowski (syn)',
    call: 'Syn pani Agnieszki: „Mama ma 52 lata, siwe włosy. To na pewno nie ona”.' },
  { id: 'helena', name: 'Helena Dudek', age: 78, hair: 'siwe', eyes: 'piwne', height: 155, city: 'Kalnów', since: '2026-10-26',
    features: 'otępienie, chodzi o lasce', clothes: 'szlafrok, kapcie',
    notes: 'Wyszła z domu opieki.',
    reporter: 'Dom Opieki „Jesień”',
    call: 'Dyżurna domu opieki: „Pani Helena ma 78 lat… chwileczkę, właśnie ją przyprowadził sąsiad!”' },
];

/* Ewidencja ludności – zapytania po nazwisku */
const REGISTRY = [
  { keys: ['marek wrobel', 'wrobel marek'], clue: 'ewid_marek',
    text: 'WRÓBEL Marek, ur. 1981. Zameldowanie stałe: ul. Ogrodowa 22/5, Kalnów. Nieruchomości: dom jednorodzinny ul. Słodowa 14, Kalnów (nabycie w drodze spadku, 2024). Pojazd: Fiat Ducato, biały, olej napędowy.' },
  { keys: ['henryk wrobel', 'wrobel henryk'], clue: 'ewid_henryk',
    text: 'WRÓBEL Henryk, ur. 1952, zm. 14.03.2024. Ostatnie miejsce zameldowania: ul. Słodowa 14, Kalnów (dom). Spadkobierca: syn Marek Wróbel.' },
  { keys: ['wrobel'], clue: ['ewid_marek', 'ewid_henryk'],
    text: 'Dwa wyniki dla nazwiska WRÓBEL w Kalnowie:\n• Henryk, ur. 1952, zm. 14.03.2024, ostatnio zameldowany: ul. Słodowa 14.\n• Marek, ur. 1981, zameldowany: ul. Ogrodowa 22/5. Właściciel domu ul. Słodowa 14 (spadek, 2024). Pojazd: Fiat Ducato, biały.' },
  { keys: ['maja sikorska', 'sikorska maja'],
    text: 'SIKORSKA Maja, ur. 2007. Zameldowanie: ul. Kasztanowa 3/7, Kalnów. Adnotacja: zgłoszona jako zaginiona 26.10.2026 (KPP Kalnów).' },
  { keys: ['aleksandra sikorska', 'sikorska aleksandra', 'ola sikorska'],
    text: 'SIKORSKA Aleksandra, ur. 2001. Zameldowanie: ul. Kasztanowa 3/7, Kalnów. Telefon kontaktowy podany przy zgłoszeniu zaginięcia siostry.' },
  { keys: ['sikorska'],
    text: 'Dwa wyniki dla nazwiska SIKORSKA w Kalnowie: Aleksandra (ur. 2001) i Maja (ur. 2007), obie ul. Kasztanowa 3/7. Maja: zgłoszona jako zaginiona 26.10.2026.' },
];

/* =====================================================================
   ZAKOŃCZENIA
   ===================================================================== */
const ENDINGS = {
  E1: { title: 'Światło w okienku', tone: 'good', sub: 'Uratowana, rozpoznana, sprawca zatrzymany' },
  E2: { title: 'Ucieczka w noc', tone: 'good', sub: 'Uratowana i rozpoznana, ale sprawca zbiegł' },
  E3: { title: 'Pacjentka NN', tone: 'mid', sub: 'Uratowana, ale nikt nie wie, kim jest' },
  E4: { title: 'Schodami w górę', tone: 'mid', sub: 'Uratowała się sama' },
  E5: { title: 'Po drugiej stronie ciszy', tone: 'mid', sub: 'Odnaleziona już po utracie kontaktu' },
  E6: { title: 'Zgłoszenie bez adresu', tone: 'bad', sub: 'Kontakt urwany, miejsca nie ustalono' },
  E7: { title: 'Z kim piszesz?', tone: 'bad', sub: 'Ostatnią wiadomość napisał on' },
};
