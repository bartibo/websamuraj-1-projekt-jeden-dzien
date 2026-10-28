'use strict';
/* Treści: absurdalne jednostki, liczniki świata, reakcje analizatora, patroni, nagrody, komunikaty. */

// Jednostki czasu. sec – ile sekund trwa jedna jednostka.
// forms: [1, 2–4, 5+, ułamek]
A.UNITS = [
  { sec: 3.5, forms: ['mrugnięcie', 'mrugnięcia', 'mrugnięć', 'mrugnięcia'], note: 'Człowiek mruga 15–20 razy na minutę. Jedno właśnie przepadło. Nie szukaj go.' },
  { sec: 60 / 70, forms: ['uderzenie serca', 'uderzenia serca', 'uderzeń serca', 'uderzenia serca'], note: 'Przy spokojnym tętnie 70/min. Jeśli rośnie – to pewnie przez ten licznik.' },
  { sec: 0.05, forms: ['uderzenie serca kolibra', 'uderzenia serca kolibra', 'uderzeń serca kolibra', 'uderzenia serca kolibra'], note: 'Serce kolibra potrafi bić 1200 razy na minutę. Koliber nie ma zadań do zrobienia.' },
  { sec: 0.002, forms: ['machnięcie skrzydeł komara', 'machnięcia skrzydeł komara', 'machnięć skrzydeł komara', 'machnięcia skrzydeł komara'], note: 'Komar macha skrzydłami ok. 500 razy na sekundę. Stąd to bzyczenie o 3 w nocy.' },
  { sec: 5.39e-44, forms: ['czas Plancka', 'czasy Plancka', 'czasów Plancka', 'czasu Plancka'], note: 'Najkrótszy sensowny odcinek czasu w fizyce. Zero w nazwie nie jest pomyłką. Zer jest dużo.' },
  { sec: 240, forms: ['jajko na miękko', 'jajka na miękko', 'jajek na miękko', 'jajka na miękko'], note: '4 minuty od wrzucenia do wrzątku. Spór o 3 czy 4 minuty trwa w rodzinach od pokoleń.' },
  { sec: 180, forms: ['herbata do zaparzenia', 'herbaty do zaparzenia', 'herbat do zaparzenia', 'herbaty do zaparzenia'], note: 'Czarna, 3 minuty. Torebka trzymana dłużej zaczyna mieć własne zdanie.' },
  { sec: 480, forms: ['makaron al dente', 'makarony al dente', 'makaronów al dente', 'makaronu al dente'], note: '8 minut. Rzucanie makaronem w ścianę nie jest metodą naukową, ale działa.' },
  { sec: 355, forms: ['odsłuchanie „Bohemian Rhapsody”', 'odsłuchania „Bohemian Rhapsody”', 'odsłuchań „Bohemian Rhapsody”', 'odsłuchania „Bohemian Rhapsody”'], note: '5 minut 55 sekund. Machanie głową w refrenie wliczone.' },
  { sec: 30, forms: ['reklama telewizyjna', 'reklamy telewizyjne', 'reklam telewizyjnych', 'reklamy telewizyjnej'], note: 'Standardowe 30 sekund. Proszek do prania znowu pierze lepiej niż poprzedni.' },
  { sec: 13.8e9 * 31557600, forms: ['wiek Wszechświata', 'wieki Wszechświata', 'wieków Wszechświata', 'wieku Wszechświata'], note: '13,8 miliarda lat. Twoje zadanie jest w tej skali tak krótkie, że aż wzruszające.' },
  { sec: 4 * 31557600, forms: ['kadencja Sejmu', 'kadencje Sejmu', 'kadencji Sejmu', 'kadencji Sejmu'], note: '4 lata. W tym czasie dałoby się zrobić zaskakująco dużo pomidorów.' },
  { sec: 100000 * 31557600, forms: ['epoka lodowcowa', 'epoki lodowcowe', 'epok lodowcowych', 'epoki lodowcowej'], note: 'Ok. 100 tysięcy lat na cykl. Mamut nie zdążyłby nawet otworzyć maila.' },
  { sec: 116.75 * 86400, forms: ['doba na Wenus', 'doby na Wenus', 'dób na Wenus', 'doby na Wenus'], note: 'Doba słoneczna na Wenus trwa 116,75 ziemskich dób. Poniedziałki tam to koszmar.' },
  { sec: 35730, forms: ['doba na Jowiszu', 'doby na Jowiszu', 'dób na Jowiszu', 'doby na Jowiszu'], note: 'Niecałe 10 godzin. Jowisz kręci się, jakby miał deadline.' },
  { sec: 300, forms: ['życie dorosłej jętki', 'życia dorosłej jętki', 'żyć dorosłej jętki', 'życia dorosłej jętki'], note: 'Samice jętki Dolania americana żyją jako dorosłe owady niecałe 5 minut. Bez pomidorów.' },
  { sec: 47 * 60, forms: ['kolejka w urzędzie', 'kolejki w urzędzie', 'kolejek w urzędzie', 'kolejki w urzędzie'], note: 'Średnio 47 minut. Pomiar wykonano, zanim zamknięto okienko nr 3.' },
  { sec: 12, forms: ['obrót talerza w mikrofalówce', 'obroty talerza w mikrofalówce', 'obrotów talerza w mikrofalówce', 'obrotu talerza w mikrofalówce'], note: 'Ok. 12 sekund. Wpatrywanie się w ten talerz to oficjalna dyscyplina narodowa.' },
  { sec: 6, forms: ['ziewnięcie', 'ziewnięcia', 'ziewnięć', 'ziewnięcia'], note: 'Ok. 6 sekund. Ziewnięcie jest zaraźliwe. Właśnie o nim czytasz. Proszę bardzo.' },
  { sec: 90 * 60, forms: ['mecz piłkarski', 'mecze piłkarskie', 'meczów piłkarskich', 'meczu piłkarskiego'], note: '90 minut bez doliczonego czasu. Sędzia i tak doliczy.' },
  { sec: 3 * 3600, forms: ['rosół babci', 'rosoły babci', 'rosołów babci', 'rosołu babci'], note: 'Minimum 3 godziny na małym ogniu. Krócej to już zupa w proszku i babcia o tym wie.' },
  { sec: 611, forms: ['okres półtrwania neutronu', 'okresy półtrwania neutronu', 'okresów półtrwania neutronu', 'okresu półtrwania neutronu'], note: 'Swobodny neutron rozpada się średnio po ok. 15 minutach, połowa z nich po ok. 10. Fizycy też mają swoje pomidory.' },
  { sec: 499, forms: ['podróż światła ze Słońca', 'podróże światła ze Słońca', 'podróży światła ze Słońca', 'podróży światła ze Słońca'], note: 'Światło leci ze Słońca do Ziemi 8 minut i 19 sekund. Bez przesiadek.' },
  { sec: 5562, forms: ['okrążenie Ziemi przez ISS', 'okrążenia Ziemi przez ISS', 'okrążeń Ziemi przez ISS', 'okrążenia Ziemi przez ISS'], note: 'Ok. 93 minuty na okrążenie. Astronauci widzą 16 wschodów słońca dziennie i nadal pracują.' },
  { sec: 239.3, forms: ['stopień obrotu Ziemi', 'stopnie obrotu Ziemi', 'stopni obrotu Ziemi', 'stopnia obrotu Ziemi'], note: 'Ziemia obraca się o 1° co niecałe 4 minuty. Trzymaj się krzesła.' },
  { sec: 60, forms: ['minuta', 'minuty', 'minut', 'minuty'], note: 'Zwykłe minuty. Nudne, wiemy. Pokazujemy je tylko raz na jakiś czas, żeby nie było nudno.' },
  { sec: 3155.76, forms: ['mikrostulecie', 'mikrostulecia', 'mikrostuleci', 'mikrostulecia'], note: 'Jedna milionowa stulecia to 52 minuty i 36 sekund. Tyle trwa podobno idealny wykład.' },
  { sec: 1, forms: ['sekunda', 'sekundy', 'sekund', 'sekundy'], note: 'Klasyczna sekunda. 9 192 631 770 drgań atomu cezu. Policzone ręcznie.' },
  { sec: 1477, forms: ['rekord wstrzymania oddechu', 'rekordy wstrzymania oddechu', 'rekordów wstrzymania oddechu', 'rekordu wstrzymania oddechu'], note: 'Ok. 24 minuty 37 sekund pod wodą, po oddychaniu czystym tlenem. Prosimy nie sprawdzać przy biurku.' },
  { sec: 950, forms: ['centymetr wzrostu bambusa', 'centymetry wzrostu bambusa', 'centymetrów wzrostu bambusa', 'centymetra wzrostu bambusa'], note: 'Najszybsze bambusy rosną do 91 cm na dobę. Da się to usłyszeć. Serio.' },
  { sec: 150, forms: ['przejście leniwca przez jezdnię', 'przejścia leniwca przez jezdnię', 'przejść leniwca przez jezdnię', 'przejścia leniwca przez jezdnię'], note: 'Leniwiec idzie ok. 0,24 km/h, jezdnia ma 10 m. Kierowcy proszeni o cierpliwość.' },
  { sec: 2.5, forms: ['„Grzegorz Brzęczyszczykiewicz”', '„Grzegorze Brzęczyszczykiewicze”', '„Grzegorzy Brzęczyszczykiewiczów”', '„Grzegorza Brzęczyszczykiewicza”'], note: 'Wypowiedzenie zajmuje ok. 2,5 sekundy. Z Chrząszczyżewoszyc, powiat Łękołody – dłużej.' },
  { sec: 37 * 60, forms: ['przerwa na kawę „na 5 minut”', 'przerwy na kawę „na 5 minut”', 'przerw na kawę „na 5 minut”', 'przerwy na kawę „na 5 minut”'], note: 'Według pomiarów terenowych trwa 37 minut. Z czego 5 to kawa.' },
  { sec: 47 * 60, forms: ['„za pięć minut” nastolatka', '„za pięć minut” nastolatka', '„za pięć minut” nastolatka', '„za pięć minut” nastolatka'], note: 'Jednostka z badań nad rodzicielstwem. Wartość niestabilna, zwykle rośnie.' },
  { sec: 0.3, forms: ['mgnienie oka', 'mgnienia oka', 'mgnień oka', 'mgnienia oka'], note: 'Ok. 0,3 sekundy. Tak, mgnienie oka trwa krócej niż mrugnięcie po kawie.' },
  { sec: 86400 * 365.25 / 12 / 3.5, forms: ['milimetr wzrostu paznokcia', 'milimetry wzrostu paznokcia', 'milimetrów wzrostu paznokcia', 'milimetra wzrostu paznokcia'], note: 'Paznokieć u ręki rośnie ok. 3,5 mm na miesiąc. Twój właśnie urósł. Niewiele, ale zawsze.' },
  { sec: 19.2, forms: ['odsłuchanie „Sto lat”', 'odsłuchania „Sto lat”', 'odsłuchań „Sto lat”', 'odsłuchania „Sto lat”'], note: 'Ok. 19 sekund, jedna zwrotka. Z „niech żyje nam” i fałszującym wujkiem.' },
];

// Liczniki „Tymczasem na świecie” (na sekundę). f – formatowanie zdania.
A.WORLD = [
  { id: 'births', rate: 4.3, icon: '👶', txt: n => `na świecie urodziło się <b>${fmtInt(n)}</b> ${plural(Math.round(n), 'dziecko', 'dzieci', 'dzieci')}` },
  { id: 'cells', rate: 3.8e6, icon: '🧬', txt: n => `Twoje ciało wymieniło <b>${fmtInt(n)}</b> ${plural(Math.round(n), 'komórkę', 'komórki', 'komórek')} na nowe` },
  { id: 'heart', rate: 70 / 60, icon: '❤️', txt: n => `Twoje serce uderzyło <b>${fmtInt(n)}</b> ${plural(Math.round(n), 'raz', 'razy', 'razy')}` },
  { id: 'blood', rate: 5 / 60, icon: '🩸', txt: n => `i przepompowało <b>${fmt(n, 1)}</b> l krwi` },
  { id: 'blinks', rate: 17 / 60, icon: '👁️', txt: n => `Twoje powieki mrugnęły ok. <b>${fmtInt(n)}</b> ${plural(Math.round(n), 'raz', 'razy', 'razy')}` },
  { id: 'hair', rate: 100000 * 0.35 / 86400 / 10, icon: '💇', txt: n => `Twoje włosy urosły łącznie o <b>${fmt(n, 2)}</b> cm (wszystkie 100 tysięcy razem)` },
  { id: 'skin', rate: 500, icon: '🧂', txt: n => `z Twojej skóry odpadło <b>${fmtInt(n)}</b> ${plural(Math.round(n), 'komórka', 'komórki', 'komórek')} naskórka` },
  { id: 'emails', rate: 4.0e6, icon: '📧', txt: n => `wysłano <b>${fmtInt(n)}</b> e-maili (prawie połowa to spam)` },
  { id: 'search', rate: 99000, icon: '🔎', txt: n => `ludzie wpisali <b>${fmtInt(n)}</b> zapytań do wyszukiwarek` },
  { id: 'lightning', rate: 44, icon: '⚡', txt: n => `w Ziemię uderzyło <b>${fmtInt(n)}</b> ${plural(Math.round(n), 'piorun', 'pioruny', 'piorunów')}` },
  { id: 'eggs', rate: 50700, icon: '🥚', txt: n => `kury zniosły <b>${fmtInt(n)}</b> jaj` },
  { id: 'coffee', rate: 26000, icon: '☕', txt: n => `ludzkość wypiła <b>${fmtInt(n)}</b> filiżanek kawy` },
  { id: 'photos', rate: 57000, icon: '📸', txt: n => `zrobiono <b>${fmtInt(n)}</b> zdjęć (głównie kotów i obiadów)` },
  { id: 'rotation', rate: 360 / 86164, icon: '🌍', txt: n => `Ziemia obróciła się o <b>${fmt(n, 3)}°</b>` },
  { id: 'orbit', rate: 29.78, icon: '☀️', txt: n => `Ziemia przeleciała wokół Słońca <b>${fmtInt(n)}</b> km (z Tobą na pokładzie)` },
  { id: 'galaxy', rate: 230, icon: '🌌', txt: n => `Układ Słoneczny przesunął się w Galaktyce o <b>${fmtInt(n)}</b> km` },
  { id: 'sunmass', rate: 4.26, icon: '🔥', txt: n => `Słońce zamieniło w czystą energię <b>${fmt(n, 1)}</b> mln ton materii` },
  { id: 'universe', rate: 1.0, icon: '🔭', txt: n => `promień obserwowalnego Wszechświata urósł o ok. <b>${fmt(n, 1)}</b> mln km` },
  { id: 'moon', rate: 3.8e4 / 31557600, icon: '🌙', txt: n => `Księżyc oddalił się od Ziemi o <b>${fmt(n, 2)}</b> µm` },
  { id: 'atlantic', rate: 2.5e4 / 31557600, icon: '🌊', txt: n => `Atlantyk poszerzył się o <b>${fmt(n, 2)}</b> µm` },
  { id: 'pierogi', rate: 310, icon: '🥟', txt: n => `w Polsce zjedzono ok. <b>${fmtInt(n)}</b> pierogów (metodologia: babcia)` },
];

// Odległości od Słońca w sekundach lotu światła
A.PLANETS = [
  { name: 'Merkury', t: 193, r: 3, color: '#b5a99a' },
  { name: 'Wenus', t: 361, r: 5, color: '#e8c27a' },
  { name: 'Ziemia', t: 499, r: 5.5, color: '#4c8fe0' },
  { name: 'Mars', t: 760, r: 4, color: '#d2603c' },
  { name: 'Pas planetoid', t: 1350, r: 0, color: '#9a8f80', belt: true },
  { name: 'Jowisz', t: 2595, r: 13, color: '#d8b48a' },
  { name: 'Saturn', t: 4756, r: 11, color: '#e6d08e', ring: true },
  { name: 'Uran', t: 9573, r: 8, color: '#9fd8e0' },
  { name: 'Neptun', t: 15000, r: 8, color: '#4f6fe0' },
  { name: 'Pas Kuipera', t: 20000, r: 0, color: '#8890a0', belt: true },
];

// Przeliczenia do ekranu tworzenia zadania. f(min) → zdanie
A.CONVERT = [
  m => `${qty(m * 60 / 3.5, ['mrugnięcie', 'mrugnięcia', 'mrugnięć', 'mrugnięcia'], 0)}`,
  m => `${qty(m * 60 * 500, ['machnięcie', 'machnięcia', 'machnięć', 'machnięcia'], 0)} skrzydeł komara`,
  m => `${qty(m / 4, ['jajko', 'jajka', 'jajek', 'jajka'])} na miękko`,
  m => `${qty(m * 60 / 355, ['odsłuchanie', 'odsłuchania', 'odsłuchań', 'odsłuchania'])} „Bohemian Rhapsody”`,
  m => `${fmt(m * 60 / (13.8e9 * 31557600))} wieku Wszechświata`,
  m => `${fmt(m / 60 / 24 / 365.25 / 4)} kadencji Sejmu`,
  m => `${fmt(m * 60 * 299792)} km lotu światła`,
  m => `${fmt(m * 60 * 29.78)} km lotu Ziemi wokół Słońca`,
  m => `${qty(m / 37, ['przerwa', 'przerwy', 'przerw', 'przerwy'])} na kawę „na 5 minut”`,
  m => `${qty(m * 4, ['metr', 'metry', 'metrów', 'metra'])} marszu leniwca`,
  m => `${qty(m * 60 * 0.001 * 100, ['centymetr', 'centymetry', 'centymetrów', 'centymetra'])} sprintu ślimaka`,
  m => `${qty(m * 110 / 60, ['kilometr', 'kilometry', 'kilometrów', 'kilometra'])} biegu geparda`,
  m => `${qty(m / 5, ['życie', 'życia', 'żyć', 'życia'])} dorosłej jętki`,
  m => `${qty(m * 60 / 2.5, ['„Grzegorz Brzęczyszczykiewicz”', '„Grzegorze Brzęczyszczykiewicze”', '„Grzegorzy Brzęczyszczykiewiczów”', '„Grzegorza Brzęczyszczykiewicza”'], 0)}`,
  m => `${fmt(m / 180)} rosołu babci`,
  m => `${qty(m * 60 * 4.3, ['nowy obywatel', 'nowych obywateli', 'nowych obywateli', 'nowego obywatela'], 0)} Ziemi`,
  m => `${fmt(m * 60 * 4.26)} mln ton Słońca zamienionych w światło`,
  m => `${qty(m / 60 * 100000 * 0.35 / 24 / 10, ['centymetr', 'centymetry', 'centymetrów', 'centymetra'])} wzrostu wszystkich Twoich włosów`,
  m => `${fmt(m * 60 / 5.39e-44)} czasów Plancka`,
  m => `${fmt(m / 52.596)} mikrostulecia`,
  m => `${qty(m * 60 / 12, ['obrót', 'obroty', 'obrotów', 'obrotu'], 0)} talerza w mikrofalówce`,
];

// Analizator nazwy zadania: słowa kluczowe → komentarz
A.KEYWORDS = [
  [/mail|skrzynk|poczt|odpisa/, 'Wykryto e-maile. Ryzyko odpowiedzi „Re: Re: Fwd: Re:” – 94%.'],
  [/raport|sprawozd/, 'Raport wykryty. Ministerstwo poprosi o raport z tego raportu.'],
  [/sprząt|porząd|odkurz|ogarn/, 'Sprzątanie. Kurz już o tym wie i przegrupowuje się pod szafą.'],
  [/egzamin|kolokw|sesj|matur/, 'Egzamin na horyzoncie. Notatki zgłaszają, że nie były czytane od września.'],
  [/nauk|ucz|powtórk|lekcj/, 'Nauka. Mózg przygotowuje się do udawania, że wszystko rozumie.'],
  [/excel|arkusz|tabel/, 'Arkusz kalkulacyjny. Komórka A1 już się boi.'],
  [/prezentac|slajd|deck/, 'Prezentacja. Szacowana liczba slajdów: o 14 za dużo.'],
  [/spotkan|meeting|call|zebran|narad/, 'To spotkanie mogło być mailem. Zapisano w aktach sprawy.'],
  [/kod|bug|program|debug|refaktor|commit|deploy/, 'Programowanie. Przewidywana liczba nowych błędów: zaskakująco dodatnia.'],
  [/pran|pralk|skarpet/, 'Pranie. Jedna skarpeta już planuje ucieczkę. Druga udaje, że nic nie wie.'],
  [/gotow|obiad|kolacj|śniadan|piecz/, 'Gotowanie. Czujnik dymu przechodzi w stan podwyższonej gotowości.'],
  [/trening|ćwicz|biega|siłown|joga|przysiad|pompk/, 'Ćwiczenia. Kanapa złożyła oficjalny protest.'],
  [/pisa|esej|artyku|tekst|referat|magister|licencj/, 'Pisanie. Kursor mruga z niecierpliwością. Kursor zawsze mruga z niecierpliwością.'],
  [/czyta|książk|lektur/, 'Czytanie. Zakładka szykuje się do przeprowadzki o 30 stron dalej.'],
  [/zmyw|naczyn|garn|zmywar/, 'Naczynia. Garnek po bigosie poczuł się zauważony.'],
  [/medyt|relaks|oddech|odpocz/, 'Relaks na czas. Mistrzowie zen zgłaszają lekki niepokój.'],
  [/faktur|podat|pit|zus|urząd|wniosek|formularz/, 'Wykryto PAPIERY. Uruchamiam syrenę biurokratyczną. Ijo-ijo.'],
  [/kot|kici/, 'Kot wykryty. Zadanie przechodzi automatycznie na własność kota.'],
  [/pies|psa|spacer/, 'Pies wykryty. Zadanie zostanie wykonane z entuzjazmem 300%.'],
  [/szef|prezes|kierown|boss/, 'Szef w nazwie zadania. Postawa wyprostowana, mina: zaangażowana.'],
  [/drzemk|spać|sen\b|spanie|zdrzemn/, 'Drzemka z timerem. To już poziom zaawansowany. Szacunek.'],
  [/pomidor|pomodoro/, 'Pomidor w zadaniu pomidorowym. Wszechświat zaczyna się zapętlać.'],
  [/gra[ćm ]|granie|gierk|konsol/, 'Granie zapisane jako zadanie. Sprytne. Bardzo sprytne.'],
  [/zakup|sklep|lista/, 'Zakupy. Na liście jest chleb. Do domu wróci wszystko poza chlebem.'],
  [/telefon|zadzwoni|oddzwoni/, 'Telefon do wykonania. Szansa, że ktoś odbierze, odwrotnie proporcjonalna do chęci.'],
  [/mam[aęy]|babci|tat[aę]|teściow/, 'Rodzina w zadaniu. Pytanie „a kiedy…?” padnie z prawdopodobieństwem 87%.'],
  [/nic|niczego|lenistw|leżeć/, 'Robienie niczego wymaga skupienia jak każde inne zadanie. Szanujemy.'],
  [/kaw[aęy]|herbat/, 'Napój w zadaniu. Kubek zacznie stygnąć w chwili, gdy klikniesz start.'],
  [/świat|ludzkoś|planet/, 'Ratowanie świata w 25 minut? Odważnie. Ministerstwo trzyma kciuki.'],
  [/rower|samoch|aut[ao]|napraw/, 'Naprawa. Na końcu zostanie jedna śrubka. Zawsze zostaje jedna śrubka.'],
];

A.ANALYZER_GENERIC = [
  'Zadanie wygląda na wykonalne. To podejrzane.',
  'Analiza wstępna: zadanie ma początek. Koniec – do potwierdzenia.',
  'Komputer kwantowy przeliczył to zadanie i poprosił o urlop.',
  'Zadanie zarejestrowane w 0,3 s. Najszybciej w historii urzędu.',
  'Wykryto potencjał. Wykryto też kanapę w pobliżu. Trwa ocena sił.',
  'Zadanie ma pozytywną aurę. Lekko musztardową, ale pozytywną.',
  'Algorytm przewiduje sukces. Algorytm przewidywał też pogodę na weekend.',
];

A.AURAS = ['musztardowa', 'pomidorowa', 'turkusowa jak basen w 1998', 'beżowa (urzędowa)', 'neonowo-różowa',
  'szara, ale z ambicjami', 'złota, lekko przypalona', 'kapibarowa', 'w paski', 'przezroczysta (podejrzane)'];
A.DRINKS = ['herbata z cytryną', 'kawa po turecku', 'kompot z suszu', 'woda z kranu (klasyka)', 'kakao jak w przedszkolu',
  'mięta od babci', 'oranżada w proszku', 'zimna kawa, o której zapomnisz', 'rosół (to też napój)', 'sok z buraka (dla odważnych)'];

A.PATRONS = [
  { name: 'św. Ekspedyt', role: 'patron spraw pilnych (naprawdę istnieje)' },
  { name: 'Kapibara Hortensja', role: 'patronka spokoju w obliczu deadline’u' },
  { name: 'Ślimak Zbigniew', role: 'patron konsekwencji w działaniu' },
  { name: 'Babcia Halina', role: 'patronka „a jadłeś coś?”' },
  { name: 'Kot Prezes', role: 'patron zrzucania rzeczy ze stołu' },
  { name: 'Pan Kazimierz z kadr', role: 'patron pieczątek okrągłych i podłużnych' },
  { name: 'Duch Kopernika', role: 'patron ruszania tego, co stoi w miejscu' },
  { name: 'Leniwiec Bogdan', role: 'patron przerw, które trwają dłużej niż praca' },
  { name: 'Golem z Excela', role: 'patron formuł, których nikt nie rozumie' },
  { name: 'Pomidor Nieznany', role: 'patron wszystkich pomidorów świata' },
];

A.REASONS = [
  'Bo trzeba', 'Bo szef', 'Dla chwały', 'Bo kot patrzy', 'Dla potomnych',
  'Bo mama pyta', 'Bo już wstyd', 'Dla nauki', 'Bez powodu (artystycznie)', 'Bo termin był wczoraj',
];

A.LEVELS = [
  { name: 'Łagodny', desc: 'Prawie normalny timer. Tylko trochę dziwny.', rotate: 90, event: 0 },
  { name: 'Podejrzany', desc: 'Sposoby odliczania zmieniają się co półtorej minuty. Ktoś coś czasem ogłosi.', rotate: 75, event: 240 },
  { name: 'Kafkowski', desc: 'Urząd czuwa. Kontrole, komunikaty, pieczątki.', rotate: 60, event: 150 },
  { name: 'Bareja', desc: 'Pełna biurokracja absurdu. Inspektor może wejść w każdej chwili.', rotate: 45, event: 100 },
  { name: 'Kosmiczny horror', desc: 'Czas przestaje być tym, czym się wydawał. Ekran też.', rotate: 30, event: 60 },
];

A.PRESETS = [
  { min: 1, label: 'Mgnienie', sub: '1 min · do testów' },
  { min: 4, label: 'Jajko na miękko', sub: '4 min' },
  { min: 15, label: 'Kocia drzemka', sub: '15 min' },
  { min: 25, label: 'Klasyczny pomidor', sub: '25 min' },
  { min: 47, label: 'Kolejka w urzędzie', sub: '47 min' },
  { min: 90, label: 'Mecz bez dogrywki', sub: '90 min' },
];

// Komunikaty w trakcie zadania. f(s) – s: stan sesji
A.EVENTS = [
  s => ['KOMUNIKAT MINISTERSTWA', 'Potwierdzamy: minuta, która właśnie minęła, była autentyczna. Certyfikat w drodze.'],
  s => ['NIEWIARYGODNE', 'Właśnie minęło więcej czasu niż kiedykolwiek wcześniej w historii Wszechświata. Serio. Sprawdziliśmy.'],
  s => ['ALERT TERMICZNY', `Kawa w Twoim kubku ostygła od startu o ok. ${fmt(Math.min(60, s.elapsed / 60 * 1.2), 1)}°C. Ona też ma swoje zadanie.`],
  s => ['WIADOMOŚĆ OD ŚLIMAKA', `Ślimak Zbigniew przesyła pozdrowienia. Od startu przeszedł ${fmt(s.elapsed * 0.1, 1)} cm i jest z siebie dumny.`],
  s => ['RAPORT BIOLOGICZNY', `Od startu zadania Twój wiek wzrósł o ${minutesAcc(Math.round(s.elapsed / 60) || 1)}. Nie mów nikomu.`],
  s => ['PLOTKA Z KORYTARZA', 'Ktoś w pokoju obok właśnie skończył swoje zadanie. Nie daj się wyprzedzić.'],
  s => ['PROGNOZA', 'Do końca zadania nie spadnie żaden meteoryt. Prawdopodobnie. Tarcza Ziemi czuwa.'],
  s => ['STATYSTYKA', `${fmt(s.p * 100, 0)}% zadania za Tobą. ${fmt(100 - s.p * 100, 0)}% przed Tobą. 0% obok Ciebie.`],
  s => ['KAPIBARA ZGŁASZA', 'Kapibara na mecie już czeka z herbatą. Herbata się parzy. Kapibara się nie spieszy.'],
  s => ['KOSMOS', `Od startu Wszechświat urósł o ok. ${fmt(s.elapsed * 1.0, 0)} mln km. Twoje biurko – o 0. Stabilnie.`],
  s => ['ZAWIADOMIENIE', 'Pomidor odbył w Twoim imieniu spotkanie. Ustalono, że spotkamy się ponownie.'],
  s => ['BADANIA NAUKOWE', 'Naukowcy potwierdzają: osoby korzystające z tego timera starzeją się w tym samym tempie co wszyscy.'],
  s => ['UWAGA', 'Twoje włosy właśnie urosły. Wszystkie. Jednocześnie. Nic nie poradzimy.'],
  s => ['DZIAŁ KADR', 'Pan Kazimierz przybił pieczątkę na Twoim zadaniu. Nikt nie wie dlaczego. On też nie.'],
  s => ['HOROSKOP', 'Gwiazdy mówią: w najbliższych minutach coś się skończy. Najpewniej to zadanie.'],
  s => ['PILNE', 'Na świecie urodziło się właśnie kilkadziesiąt osób, które kiedyś też będą miały zadania. Trzymamy kciuki.'],
  s => ['DZIAŁ ZAMÓWIEŃ', 'Zamówiliśmy dla Pana/Pani 3 dodatkowe minuty. Przyjdą kurierem w przyszłym tygodniu, między 8 a 20.'],
  s => ['KOMUNIKAT KAPIBARY', 'Hortensja weszła do gorącego źródła. Prosi, żeby jej nie przeszkadzać do końca zadania. Ani potem.'],
  s => ['POGODA DLA ZADANIA', 'Nad biurkiem przechodzi front skupienia. Od strony kanapy nadciąga niż prokrastynacyjny.'],
  s => ['OGŁOSZENIE DROBNE', 'Zamienię dwie poniedziałkowe godziny na jedną piątkową. Kontakt: pokój 404, pytać o Kazimierza.'],
  s => ['WIADOMOŚĆ OD KOTA', 'Kot Prezes zauważył, że na stole coś stoi. Prosimy się do tego nie przywiązywać.'],
  s => { const k = Math.floor(s.p * 8); return ['GASTRONOMIA', `Gdyby zadanie było pizzą, zjedzone byłyby ${k} ${plural(k, 'kawałek', 'kawałki', 'kawałków')} z 8. ${k >= 4 ? 'Ten z największą ilością sera już za Tobą.' : 'Najlepsze jeszcze przed Tobą.'}`]; },
  s => ['BABCIA HALINA DZWONI', 'Pyta, czy jesz. Powiedzieliśmy, że tak. Prosimy nas nie wydać.'],
  s => ['DZIAŁ KADR', 'Pan Kazimierz poszedł na drugie śniadanie. Pieczątek pilnuje jego sweter.'],
  s => ['ASTRONOMIA', `Od startu Ziemia obróciła się o ${fmt(s.elapsed / 239.3, 2)}°. Prosimy nie wychylać się przez okno.`],
  s => ['AWIZO', 'Próbowaliśmy doręczyć Panu/Pani skupienie, ale nikogo nie było w domu. Odbiór w okienku nr 3 w ciągu 7 dni.'],
  s => ['AKTUALIZACJA', 'Zainstalowano Czas 2.0. Lista zmian: sekundy są teraz o 0% krótsze. Poprawiono stabilność poniedziałków.'],
  s => ['SŁOWO NA DZIŚ', '„Chronofagia” – pożeranie czasu. Gąsienica Grażyna uprawia ją zawodowo, z pomidorem.'],
  s => ['INFORMACJA DLA PODRÓŻNYCH', 'Zadanie jedzie zgodnie z rozkładem. Wagon restauracyjny zamknięty do odwołania. Odwołania nie przewiduje się.'],
  s => ['NAUKA', 'Czytanie tego komunikatu zajęło ok. 4 sekundy. Odejmiemy je od przerwy. Żart. Prawdopodobnie.'],
  s => ['LOTERIA MINISTERIALNA', `Gratulacje! Wygrał(-a) Pan/Pani ${minutesAcc(Math.max(1, Math.ceil(s.remaining / 60)))} dalszej pracy. Nagrody nie można wymienić na gotówkę.`],
  s => ['ZGUBA', 'Na korytarzu znaleziono jedną minutę. Właściciel proszony o kontakt. Minuta jest lekko pognieciona.'],
  s => ['PRZEPIS NA DZIŚ', 'Weź jedno zadanie, dodaj szczyptę skupienia, odstaw telefon na 25 minut. Nie mieszać z mediami społecznościowymi.'],
  s => ['RAPORT Z KOSMOSU', `Foton wysłany ze Słońca na starcie Twojego zadania jest już ${s.elapsed > 760 ? 'za Marsem' : s.elapsed > 499 ? 'za orbitą Ziemi' : s.elapsed > 361 ? 'za Wenus' : 'w drodze do Wenus'}.`],
];

// Kontrole w trakcie zadania: pytanie i odpowiedzi, każda z własną reakcją inspektora
A.CONTROLS = [
  { t: 'KONTROLA MINISTERIALNA', q: 'Czy obecnie pracuje Pan/Pani nad zadaniem?', a: [
    ['Tak', 'Inspektor notuje: „tak”. Dopisuje: „podejrzanie szybko”.'],
    ['Oczywiście', 'Słowo „oczywiście” wzbudziło czujność. Kontrola kończy się remisem.'],
    ['Jak śmiesz', 'Inspektor przeprasza i wychodzi tyłem. Z ukłonem.']] },
  { t: 'KONTROLA', q: 'Czy w ciągu ostatniej minuty patrzył(-a) Pan/Pani w telefon?', a: [
    ['Nie', 'Telefon twierdzi inaczej. Ministerstwo wierzy Panu/Pani. Na razie.'],
    ['Tylko trochę', 'Szczerość odnotowana. Telefon dostał upomnienie na piśmie.'],
    ['Odmawiam odpowiedzi', 'Prawo do milczenia przysługuje. Telefon i tak wszystko powie.']] },
  { t: 'KONTROLA SANITARNA CZASU', q: 'Czy minuty są przechowywane w odpowiedniej temperaturze?', a: [
    ['Tak', 'Termometr potwierdza: minuty w normie. Sekundy lekko przegrzane.'],
    ['W lodówce', 'Minuty w lodówce zachowują świeżość do 3 dni. Sanepid zadowolony.'],
    ['Co?', 'Odpowiedź „Co?” zakwalifikowano jako „nie wiem, ale się postaram”.']] },
  { t: 'KONTROLA SKARBOWA', q: 'Czy deklaruje Pan/Pani wszystkie zużyte sekundy?', a: [
    ['Wszystkie', 'Przyjęto. Nadpłata: 0,3 sekundy. Zwrot w ciągu 90 dni roboczych.'],
    ['Większość', 'Niezadeklarowane sekundy zostaną ściągnięte w formie ziewnięć.'],
    ['Jakie sekundy?', 'Inspektor też nie wie. Sprawa umorzona z braku sekund.']] },
  { t: 'KONTROLA BHP', q: 'Czy siedzi Pan/Pani prosto?', a: [
    ['Siedzę prosto', 'Plecy właśnie się wyprostowały, prawda? Wszyscy tak robią. Inspektor też.'],
    ['Teraz już tak', 'Kontrola okazała się skuteczna. Pierwszy raz w historii urzędu.'],
    ['Leżę', 'Pozycję poziomą wpisano do protokołu jako „ergonomia autorska”.']] },
  { t: 'KONTROLA BABCI HALINY', q: 'Czy zjadł(-a) Pan/Pani dziś coś ciepłego?', a: [
    ['Tak', 'Babcia Halina prosi o zdjęcie talerza. Do akt.'],
    ['Kawa się liczy?', 'Nie liczy się. Babcia już jedzie z rosołem. Ma klucze.'],
    ['Nie', 'Ministerstwo nie komentuje. Babcia komentuje za dwoje.']] },
  { t: 'KONTROLA KAPIBARY', q: 'Czy jest Pan/Pani spokojny(-a)?', a: [
    ['Bardzo', 'Kapibara kiwa głową. Kapibara wie.'],
    ['Teraz już nie', 'Kontrola wywołała stres, który miała zbadać. Wniosek: kontrola działa.'],
    ['Ommm', 'Kapibara przyznaje Panu/Pani miejsce w gorącym źródle. Z ręcznikiem.']] },
  { t: 'KONTROLA JAKOŚCI', q: 'Proszę ocenić bieżącą minutę w skali 1–10.', a: [
    ['10', 'Minuta wzruszona. Prosi o opinię na piśmie.'],
    ['6', 'Minuta przyjmuje krytykę. Następna będzie lepsza. Albo taka sama.'],
    ['Minuta jak minuta', 'Cenimy szczerość. Minuta też, choć się do tego nie przyzna.']] },
  { t: 'KONTROLA KOTA PREZESA', q: 'Czy na biurku są jeszcze jakieś rzeczy?', a: [
    ['Tak, kilka', 'Kot Prezes przyjął do wiadomości. Już idzie.'],
    ['Już nie', 'Kot Prezes rozczarowany. Musi poszukać innego biurka.'],
    ['Mam psa', 'Kontrola przerwana z przyczyn dyplomatycznych.']] },
  { t: 'KONTROLA ŚLIMAKA', q: 'Czy nie pracuje Pan/Pani za szybko?', a: [
    ['Pracuję powoli', 'Zbigniew jest dumny. Wzruszył się czułkami.'],
    ['Za szybko', 'Zbigniew prosi o zwolnienie do 0,001 km/h. Dla bezpieczeństwa.'],
    ['Nie pracuję wcale', 'Zbigniew: „szacun”. Ministerstwo: brak komentarza.']] },
  { t: 'KONTROLA ZAKŁADEK', q: 'Ile kart jest teraz otwartych w przeglądarce?', a: [
    ['Jedna', 'Inspektor parska śmiechem. Przeprasza. Znowu parska.'],
    ['Kilka', '„Kilka” wpisano do protokołu jako 47. Proszę nie zaprzeczać.'],
    ['Nie liczę', 'Mądra decyzja. Liczenie zajęłoby resztę zadania.']] },
  { t: 'KONTROLA NAWODNIENIA', q: 'Kiedy ostatnio pił(-a) Pan/Pani wodę?', a: [
    ['Przed chwilą', 'Nerki przesyłają podziękowania. Ręcznie pisane.'],
    ['Rano', 'Ministerstwo zaleca łyk wody. To nie jest prośba.'],
    ['Kawa to woda', 'Kawa to w 98% woda. Pozostałe 2% to wymówka.']] },
  { t: 'KONTROLA PLANOWANIA', q: 'Czy wie Pan/Pani, co zrobi po tym zadaniu?', a: [
    ['Tak', 'Gratulujemy. Plan zostanie zgubiony w ciągu 4 minut.'],
    ['Przerwę', 'Odpowiedź wzorowa. Kapibara klaszcze. Powoli.'],
    ['Następne zadanie', 'Ministerstwo podziwia. I trochę się martwi.']] },
  { t: 'KONTROLA AKUSTYCZNA', q: 'Czy w pokoju jest cicho?', a: [
    ['Cicho', 'Inspektor szepcze „dziękuję” i wychodzi na palcach.'],
    ['Gra muzyka', 'Muzyka sprawdzona. Ministerstwo prosi o link.'],
    ['Sąsiad wierci', 'Sąsiada wpisano do rejestru. Wierci zgodnie z harmonogramem.']] },
  { t: 'KONTROLA WZROKU', q: 'Proszę mrugnąć.', a: [
    ['Mrugnięte', 'Mrugnięcie zarejestrowane. Jedno z ok. 15 tysięcy dzisiaj.'],
    ['Nie mogę, skupiam się', 'Godne podziwu. Oczy złożyły skargę do rzecznika.'],
    ['Mrugam dwa razy', 'Dwa mrugnięcia to w języku urzędników „pomocy”. Pomoc w drodze. Szacowany czas: 90 dni.']] },
  { t: 'KONTROLA CELNA', q: 'Czy ma Pan/Pani przy sobie przekąski?', a: [
    ['Nie', 'Okruchy na klawiaturze mówią co innego.'],
    ['Ciastko', 'Ciastko zarekwirowane. Inspektor zje je po służbie.'],
    ['Pieroga', 'Pieróg przyjęty. Kontrola nigdy się nie odbyła.']] },
];

// Komentarze sportowe (tryb ślimaka)
A.SNAIL_TALK = [
  'Zbigniew przyspiesza! Teraz prawie 0,001 km/h!',
  'Leniwiec Bogdan biegnie w złą stronę. Ale z jaką gracją!',
  'Kamień nie rusza się od startu. Bukmacherzy nadal na niego stawiają.',
  'Zbigniew zostawia za sobą piękny, błyszczący ślad. Sędziowie zachwyceni.',
  'Czy to doping? Nie, to sałata.',
  'Publiczność wstrzymuje oddech. Niektórzy zasnęli.',
  'Zbigniew macha czułkami do kamery! Wzruszające!',
  'Leniwiec zatrzymał się na drzemkę. Taktyka czy filozofia?',
];

// Babcia Halina przy stolnicy
A.BABCIA_LINES = [
  'Jadłeś coś? Bo blado wyglądasz.',
  'A kiedy ślub?',
  'Za moich czasów zadania robiło się bez timera. I bez prądu.',
  'Weź jeszcze jednego, bo zmarniejesz.',
  'Ciasto musi odpocząć. Ty też, ale po zadaniu.',
  'Dziadek też miał kiedyś zadanie. W 1983. Do dziś o tym opowiada.',
  'Tylko nie mów nikomu, że dodaję gałkę muszkatołową.',
  'Z cebulką czy z cebulką?',
  'Co tak siedzisz zgarbiony? Plecy prosto!',
  'Ja w twoim wieku miałam już trzy zadania i krowę.',
  'Ten twój telefon to cię kiedyś zje.',
  'Z kapustą i grzybami, bo ruskie były wczoraj.',
  'Zrobię ci na drogę. Słoik oddasz.',
  'Ile ty masz tych zadań? Odpocznij trochę.',
  'Pierogi lepi się sercem. I mąką. Głównie mąką.',
  'Kapibara była na obiedzie. Zjadła cztery. Grzeczna.',
  'Każdy pieróg to minuta. Albo dwie. Babcia się nie spieszy.',
  'Jak skończysz, to dostaniesz deser. Jak nie skończysz, też.',
];

// Pociągi na tablicy odjazdów
A.TRAINS = [
  ['IC', 'PROKRASTYNACJA', 'JUTRO', 'OPÓŹNIENIE +∞'],
  ['TLK', 'KAWA BIS', 'KUCHNIA', 'O CZASIE'],
  ['OS', 'SCROLLOWANIE', 'DONIKĄD', 'ODWOŁANY'],
  ['EX', 'DRZEMKA EXPRESS', 'KANAPA', 'NA ŻĄDANIE'],
  ['REG', 'LODÓWKA', 'LODÓWKA', 'CO 15 MIN'],
  ['IC', 'PONIEDZIAŁEK', 'TYDZIEŃ', 'ZAWSZE PUNKTUALNIE'],
  ['TLK', 'NOWY ROK', 'POSTANOWIENIA', 'DO LUTEGO'],
  ['OS', 'PRANIE', 'SUSZARKA', 'OPÓŹNIENIE 2 DNI'],
];
A.ANNOUNCEMENTS = [
  'Pociąg „{task}” do stacji Koniec Zadania odjedzie zgodnie z planem. Prosimy nie wysiadać w trakcie jazdy.',
  'Uwaga! Pociąg „Prokrastynacja” ma opóźnienie nieskończoność. Prosimy nie czekać.',
  'Podróżnych do stacji Koniec Zadania prosimy o skupienie i trzymanie się poręczy.',
  'Pociąg „Kawa Bis” odjechał z kuchni. Następny za 15 minut. Albo za 5. Zależy.',
  'Informujemy, że w pociągu „{task}” działa wagon ciszy. Cały pociąg jest wagonem ciszy.',
  'Za utrudnienia przepraszamy. Utrudnień nie ma, ale na wszelki wypadek przepraszamy.',
];

// Pliki „kopiowane” w trybie kopiowania
A.FILES = [
  'motywacja.dll', 'kawa_final_v2_NAPRAWDE_FINAL.docx', 'skupienie.exe', 'cierpliwosc.sys', 'zdjecia_kota (4812).zip',
  'plan_na_dzis_v17.txt', 'wymowki_2026.xlsx', 'silna_wola.tmp', 'dobre_intencje.bak', 'sens_zycia.pdf (0 KB)',
  'kurz_spod_szafy.raw', 'pomidor.iso', 'odwaga.ini', 'deadline.lnk', 'notatki_z_zebrania_nikt_nie_czytal.odt',
];
A.ETA = [
  '3 sekundy', '17 lat', '4 minuty', 'do czwartku', 'nie wiadomo', '1 epokę lodowcową', '2 herbaty', 'chwilę',
  'jeszcze chwilę', 'kwadrans akademicki', '9 minut (słowo honoru)', '6 dni roboczych', 'krócej niż myślisz',
  'dłużej niż myślisz', '∞', '−5 minut (?!)', 'tyle, co rosół', '1 mikrostulecie', 'mniej więcej tyle',
];

// Giełda
A.TICKERS = [['KAWA', 4], ['MOTYW', -2], ['SKUP', 3], ['LEŃ', -5], ['DRZEM', 1], ['POMID', 6], ['PIERÓG', 2], ['KOT', 9], ['MAIL', -3], ['EXCEL', -1]];
A.HEADLINES = [
  'Analitycy zaskoczeni: zadanie trwa dokładnie tyle, ile zaplanowano',
  'Kurs KAWY rośnie na wieść o porannym spotkaniu',
  'Kot Prezes zrzucił indeks ze stołu. Rynek w szoku',
  'Inwestorzy masowo pozbywają się akcji LEŃ',
  'Pomidor wchodzi na giełdę. Debiut udany, choć lekko soczysty',
  'Bank centralny podnosi stopy… na biurko. Relaks wskazany',
  'Ekonomiści: produktywność rośnie o 0,0001% na każde mrugnięcie',
  'Fundusz „Babcia Halina” zainwestował wyłącznie w pierogi. Zysk 400%',
  'Spółka DRZEM zawiesza notowania. Zarząd poszedł się zdrzemnąć',
  'Akcje MAIL tracą po fali odpowiedzi „Re: Re: Re:”',
];

// Boss
A.BOSS_TAUNTS = [
  'Nigdy mnie nie skończysz!', 'Mam jeszcze dużo sekund!', 'Moja druga forma jest gorsza!', 'Spójrz na telefon… no spójrz…',
  'Może przerwa na kawę?', 'Odłóż mnie na jutro!', 'Jutro będzie lepszy dzień na mnie!', 'Za mało jesteś skupiony… -a… -e…',
];

// Nagrody i jury w raporcie końcowym
A.AWARDS = [
  ['🍅', 'Order Pomidora III Klasy', 'za przetrwanie pełnego cyklu bez rozpadu na sos'],
  ['🐌', 'Dyplom Uznania od Ślimaka Zbigniewa', '„było szybko, może nawet za szybko”'],
  ['⏳', 'Złota Klepsydra z Okuciem', 'za cierpliwość wobec upływu czasu'],
  ['📵', 'Odznaka „Telefon? Jaki telefon?”', 'niezweryfikowana, przyznana w dobrej wierze'],
  ['🏛️', 'Tytuł Honorowego Obywatela Minuty', 'z prawem do jednej dodatkowej sekundy rocznie'],
  ['🐈', 'Medal od Kota Prezesa', 'zrzucony ze stołu w trakcie wręczania'],
  ['🥟', 'Pieróg Zasługi', 'z kapustą i grzybami, ruskie były wyprzedane'],
  ['🦥', 'Wyróżnienie Leniwca Bogdana', 'Bogdan nie zdążył go podpisać'],
  ['📎', 'Spinacz Wytrwałości', 'spinacz zwykły, ale wręczony z wielkim uczuciem'],
  ['🌌', 'Certyfikat Kosmiczny', 'za udział w rozszerzaniu się Wszechświata'],
  ['🧦', 'Order Samotnej Skarpety', 'za wytrwałość mimo braków w kompletach'],
  ['🪑', 'Medal Krzesła', 'krzesło przetrwało; odznaczenie odbiera w jego imieniu'],
  ['🖇️', 'Złoty Zszywacz', 'zszywa wszystko poza dniem roboczym'],
  ['🥒', 'Słoik Ogórków Honorowych', 'od Babci Haliny, słoik do zwrotu'],
  ['🧾', 'Paragon Wdzięczności', 'za wydanie czasu w rozsądnej cenie'],
  ['🌱', 'Odznaka Rośliny Doniczkowej', 'roślina była świadkiem i potwierdza'],
];
// Jury ocenia przebieg zadania. c – kontekst z finale.js (wynik, pauzy, kot, foton, godzina)
A.JUDGES = [
  ['Kapibara Hortensja', c => 10, c => c.quit
    ? pick(['Dziesięć. Porzucić też trzeba umieć.', 'Dziesięć. Zadanie nie zając, nie ucieknie. Chociaż właśnie uciekło.'])
    : pick(['Spokojnie. Wszystko jest na 10.', 'Dziesięć. Jak zawsze. Herbaty?', 'Dziesięć. Kapibara nie zna innych liczb.', 'Dziesięć i pół. Pół za pieczątkę.', 'Dziesięć. Nie spiesz się z następnym.'])],
  ['Ślimak Zbigniew', c => clamp(1.5 + c.sec / 400, 1.5, 9.5), c => c.sec < 300
    ? pick(['Za szybko. Zdecydowanie za szybko.', 'Nie zdążyłem nawet wystawić czułek.', 'Mrugnąłem i było po wszystkim.'])
    : c.sec < 1800 ? pick(['Przyzwoite tempo. Prawie ślimacze.', `W tym czasie przeszedłem ${fmt(c.sec * 0.1, 0)} cm. Byliśmy w tym razem.`, 'Zostawiłeś ładny ślad. Metaforycznie.'])
    : pick(['Wreszcie ktoś w moim tempie. Wzruszyłem się.', 'Takie zadania to ja rozumiem. Długie jak moja droga do mety.'])],
  ['Babcia Halina', c => 10, c => c.hour >= 22 || c.hour < 5
    ? pick(['Dziesięć, ale czemu nie śpisz o tej porze?', 'Dziesięć. A teraz spać, już!'])
    : c.hour >= 13 && c.hour < 16 ? pick(['Dziesięć. A obiad jadłeś? Bo pora.', 'Dziesięć, ale zupa stygnie.'])
    : c.pauses >= 2 ? pick([`Dziesięć. ${c.pauses} ${plural(c.pauses, 'pauza', 'pauzy', 'pauz')}, i dobrze, trzeba odpocząć.`, 'Dziesięć. Te pauzy to na kanapkę, mam nadzieję?'])
    : pick(['Dziesięć, ale zjedz coś, bo blado wyglądasz.', 'Pięknie! A kiedy ślub?', 'Dziesięć! Dziadek byłby dumny. On nigdy niczego nie skończył.', 'Dziesięć. Weź słoik ogórków na drogę.'])],
  ['Kot Prezes', c => Math.min(10, c.dropped.length), c => c.dropped.length
    ? `*zrzucił ${c.dropped.length} ${plural(c.dropped.length, 'przedmiot', 'przedmioty', 'przedmiotów')}, ostatni: ${c.dropped[c.dropped.length - 1]}. Ocenia według liczby*`
    : '*nie zdążył nic zrzucić, więc zrzuca kartkę z oceną*'],
  ['Ministerstwo Czasu', c => NaN, c => pick(['Ocena zostanie doręczona pocztą. Prosimy wyglądać listonosza.', 'Wymagany wniosek o wydanie oceny (formularz B-12). Ocenę wyślemy pocztą.', 'Ocena w drodze. Listonosz zgubił się na korytarzu.'])],
  ['Duch Kopernika', c => rand(8, 10), c => c.photon
    ? pick([`Foton z Twojego startu jest już za planetą ${c.photon}. Ja w Twoim wieku ruszyłem Ziemię.`, `Wstrzymał Słońce, ruszył Ziemię. A Ty – zadanie. Foton minął planetę ${c.photon}. Szacunek.`])
    : pick(['Ziemia się kręci. Zadanie też się kręciło. Zgadza się.', 'Foton nie zdążył nawet minąć Merkurego. Krótko, ale heliocentrycznie.'])],
];
A.STAMPS = ['ZATWIERDZONO', 'WYKONANO (PODOBNO)', 'SPRAWDZONO WZROKOWO', 'ZGODNIE Z PLANEM', 'NIEWIARYGODNE', 'PRZYJĘTO DO AKT', 'ZWERYFIKOWANO KAPIBARĄ', 'ODNOTOWANO W KRONICE'];

// Wydłużone napisy końcowego odliczania
// Każda liczba ma kilka wariantów, losowanych przy każdym odliczaniu
A.FINAL_COUNT = {
  10: [['DZIESIĘĆ', 'słownie'], ['X', 'po rzymsku, krzyżykiem'], ['A', 'szesnastkowo, dla programistów']],
  9: [['IX', 'po rzymsku'], ['3²', 'z potęgą urzędową'], ['DZIEWIĘĆ', 'jak żyć kota, który właśnie coś zrzucił']],
  8: [['1000', 'binarnie'], ['∞', 'obrócone o 90°'], ['🐙', 'w ramionach ośmiornicy']],
  7: [['🐌🐌🐌🐌🐌🐌🐌', 'w ślimakach'], ['VII', 'po rzymsku'], ['🌈', 'w kolorach tęczy']],
  6: [['−····', 'alfabetem Morse’a'], ['⚅', 'na kostce do gry'], ['½ TUZINA', 'hurtowo']],
  5: [['✋', 'na palcach'], ['V', 'po rzymsku'], ['🥟🥟🥟🥟🥟', 'w pierogach']],
  4: [['2 + 2', 'po zatwierdzeniu przez komisję'], ['🍀', 'w listkach koniczyny'], ['IV', 'nie IIII, sprawdziliśmy']],
  3: [['🍅🍅🍅', 'w pomidorach'], ['TRZY', 'słownie, z pieczątką'], ['π − 0,14', 'w przybliżeniu']],
  2: [['DWIE', 'sekundy, słownie'], ['✌️', 'na palcach'], ['10', 'binarnie, nie myl z dziesięcioma']],
  1: [['JEDNA!', 'ostatnia, nie mrugaj'], ['☝️', 'ostatnia'], ['I', 'po rzymsku, ostatnia']],
};

// Przerwa
A.BREAK_TIPS = [
  'Wstań. Przeciągnij się jak kot, który właśnie odkrył, że istnieje.',
  'Popatrz przez okno na coś odległego. Udawaj, że kręcisz teledysk.',
  'Napij się wody. Kawa nie liczy się jako woda, choć bardzo by chciała.',
  'Zrób 5 głębokich oddechów. Szósty jest opcjonalny, ale zalecany.',
  'Porozmawiaj z rośliną. Ona też ma ciężki dzień.',
  'Rozluźnij ramiona. Właśnie teraz. One są przy uszach, prawda?',
  'Odejdź od ekranu. Ekran poradzi sobie bez Ciebie. Sprawdzaliśmy.',
  'Podlej kwiatka. Albo chociaż popatrz na niego z troską.',
  'Przejdź się do kuchni i z powrotem. Najlepiej z herbatą.',
  'Pomachaj rękami jak ptak. Nikt nie patrzy. Kot nie liczy się jako ktoś.',
  'Zamknij oczy na 20 sekund. Nie zasypiaj. No, chyba że trochę.',
  'Zjedz coś. Babcia Halina sprawdzi.',
  'Wyjrzyj przez okno i policz gołębie. Wynik zachowaj dla siebie.',
  'Przeciągnij się tak, żeby coś strzyknęło. To dźwięk odpoczynku.',
  'Napisz do kogoś miłego. Nie o pracy. O kapibarach.',
];

// Komunikaty w czasie przerwy (zamiast kontroli)
A.BREAK_EVENTS = [
  ['KOMUNIKAT', 'Ministerstwo przypomina: w czasie przerwy pracować nie wolno. Kontrole zawieszone.'],
  ['KAPIBARA ZGŁASZA', 'Hortensja leży na leżaku obok. Nic nie mówi. To bardzo dobra przerwa.'],
  ['BABCIA HALINA', 'Babcia pyta, czy coś zjadłeś. Odpowiedz w sercu.'],
  ['DZIAŁ KADR', 'Pan Kazimierz też ma przerwę. Je kanapkę z jajkiem. Pieczątki odpoczywają.'],
  ['CIEKAWOSTKA', 'Leniwiec Bogdan odpoczywa 15–20 godzin na dobę i nikt mu nic nie mówi.'],
  ['POGODA', 'Nad leżakiem słonecznie. Wiatr słaby, z kierunku lodówki.'],
];

// Decyzja administracyjna: czasem z niespodzianką. w – waga losowania
A.VERDICTS = [
  { w: 55, kind: 'ok' },
  { w: 13, kind: 'appeal' },
  { w: 14, kind: 'cond' },
  { w: 9, kind: 'typo' },
  { w: 9, kind: 'escalate' },
];
A.REFUSALS = [
  'wniosek wypełniono długopisem w niewłaściwym odcieniu niebieskiego',
  'brak pieczątki na pieczątce',
  'w rubryce „powód” nie podano powodu powodu',
  'wnioskodawca uśmiechnął się przy składaniu wniosku, co jest niezgodne z regulaminem',
  'zadanie jest za mało zadaniowe',
  'Pan Kazimierz miał przerwę, a przerwa miała Pana Kazimierza',
  'kapibara była na urlopie',
  'wniosek złożono w czasie, a to sprzeczne z jego treścią',
];
A.CONDITIONS = [
  'w obecności rośliny doniczkowej',
  'kubek trzymać wyłącznie lewą ręką',
  'nie wolno myśleć o słoniu',
  'co najmniej raz się wyprostować',
  'nie otwierać lodówki bez potrzeby',
  'telefon ekranem do blatu',
  'przynajmniej raz westchnąć z satysfakcją',
  'nie mówić „jeszcze tylko jedno”',
  'wypić łyk wody w połowie zadania',
];
// Pomyłka urzędnika: [błędna jednostka (dopełniacz), kto się pomylił]
A.TYPOS = [
  ['lat', 'praktykant'], ['godzin', 'stażysta'], ['dni roboczych', 'Pan Kazimierz przed kawą'],
  ['stuleci', 'automat do pieczątek'], ['tygodni', 'kapibara (nie umie pisać)'],
];
// Przekazanie sprawy wyżej: [komu, co postanowił, napis na pieczątce]
A.ESCALATIONS = [
  ['Kapibarze Hortensji', 'Kapibara zatwierdza. Kapibara zawsze zatwierdza.', 'KAPIBARA: TAK'],
  ['Kotu Prezesowi', 'Kot Prezes przeczytał, zrzucił ze stołu, po czym podpisał łapą.', 'PODPISANO ŁAPĄ'],
  ['Babci Halinie', 'Babcia zatwierdza, pod warunkiem że coś zjesz.', 'BABCIA: NIECH BĘDZIE'],
  ['Duchowi Kopernika', 'Duch Kopernika wstrzymał Słońce na czas rozpatrzenia. Zatwierdzono.', 'PER ASPERA AD POMIDORA'],
];

// Ranga urzędowa według liczby ukończonych zadań
A.RANKS = [
  { at: 0, name: 'Petent', perk: '' },
  { at: 1, name: 'Petent Stały', perk: 'Prawo do uśmiechu przy okienku (bez przesady).' },
  { at: 3, name: 'Referent ds. Pomidorów', perk: 'Własny kubek w pokoju socjalnym. Podpisany. I tak ktoś go weźmie.' },
  { at: 6, name: 'Starszy Referent ds. Pomidorów', perk: 'Krzesło z oparciem. Z oparciem!' },
  { at: 10, name: 'Kierownik Okienka nr 3', perk: 'Kolejka VIP: w kolejce do okienka stoi już tylko jedna osoba. Pan/Pani.' },
  { at: 15, name: 'Naczelnik Wydziału Sekund', perk: 'Służbowy pomidor z kierowcą.' },
  { at: 25, name: 'Dyrektor Departamentu Kwadransów', perk: 'Prawo do przesunięcia jednego poniedziałku w roku (za zgodą kapibary).' },
  { at: 40, name: 'Wiceminister Czasu', perk: 'Gabinet z widokiem na zegar atomowy.' },
  { at: 60, name: 'Minister Czasu Nadmiernie Mierzonego', perk: 'Własna pieczątka. Okrągła. Z rączką.' },
  { at: 100, name: 'Czas we własnej osobie', perk: 'Wszystkie minuty świata podlegają odtąd Panu/Pani. Prosimy ich nie marnować.' },
];
