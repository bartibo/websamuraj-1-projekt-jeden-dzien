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
  { name: 'Łagodny', desc: 'Prawie normalny timer. Tylko trochę dziwny.', rotate: 75, event: 0 },
  { name: 'Podejrzany', desc: 'Liczniki zmieniają się co minutę. Ktoś coś czasem ogłosi.', rotate: 55, event: 240 },
  { name: 'Kafkowski', desc: 'Urząd czuwa. Kontrole, komunikaty, pieczątki.', rotate: 40, event: 150 },
  { name: 'Bareja', desc: 'Pełna biurokracja absurdu. Tryby zmieniają się często.', rotate: 28, event: 95 },
  { name: 'Kosmiczny horror', desc: 'Czas przestaje być tym, czym się wydawał. Ekran też.', rotate: 18, event: 55 },
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
  s => ['CIEKAWOSTKA', 'Pomidor jest owocem. Ten timer też jest trochę owocem. Owocem pracy.'],
  s => ['PLOTKA Z KORYTARZA', 'Ktoś w pokoju obok właśnie skończył swoje zadanie. Nie daj się wyprzedzić.'],
  s => ['PROGNOZA', 'Do końca zadania nie spadnie żaden meteoryt. Prawdopodobnie. Tarcza Ziemi czuwa.'],
  s => ['STATYSTYKA', `${fmt(s.p * 100, 0)}% zadania za Tobą. ${fmt(100 - s.p * 100, 0)}% przed Tobą. 0% obok Ciebie.`],
  s => ['KAPIBARA ZGŁASZA', 'Kapibara na mecie już czeka z herbatą. Herbata się parzy. Kapibara się nie spieszy.'],
  s => ['KOSMOS', `Od startu Wszechświat urósł o ok. ${fmt(s.elapsed * 1.0, 0)} mln km. Twoje biurko – o 0. Stabilnie.`],
  s => ['ZAWIADOMIENIE', 'Pomidor odbył w Twoim imieniu spotkanie. Ustalono, że spotkamy się ponownie.'],
  s => ['KOMUNIKAT', 'Uprzejmie informujemy, że czas płynie. Za utrudnienia nie przepraszamy, bo to nie nasza wina.'],
  s => ['BADANIA NAUKOWE', 'Naukowcy potwierdzają: osoby korzystające z tego timera starzeją się w tym samym tempie co wszyscy.'],
  s => ['UWAGA', 'Twoje włosy właśnie urosły. Wszystkie. Jednocześnie. Nic nie poradzimy.'],
  s => ['DZIAŁ KADR', 'Pan Kazimierz przybił pieczątkę na Twoim zadaniu. Nikt nie wie dlaczego. On też nie.'],
  s => ['HOROSKOP', 'Gwiazdy mówią: w najbliższych minutach coś się skończy. Najpewniej to zadanie.'],
  s => ['PILNE', 'Na świecie urodziło się właśnie kilkadziesiąt osób, które kiedyś też będą miały zadania. Trzymamy kciuki.'],
  s => ['RAPORT Z KOSMOSU', `Foton wysłany ze Słońca na starcie Twojego zadania jest już ${s.elapsed > 760 ? 'za Marsem' : s.elapsed > 499 ? 'za orbitą Ziemi' : s.elapsed > 361 ? 'za Wenus' : 'w drodze do Wenus'}.`],
];

A.CONTROLS = [
  'KONTROLA MINISTERIALNA! Czy obecnie pracujesz nad zadaniem?',
  'KONTROLA! Inspektor pyta, czy to, co robisz, to na pewno zadanie.',
  'KONTROLA! Czy w ciągu ostatniej minuty patrzył(-a) Pan/Pani w telefon?',
  'KONTROLA SANITARNA CZASU! Czy minuty są przechowywane w odpowiedniej temperaturze?',
];
A.CONTROL_ANSWERS = [
  ['Tak', 'Oczywiście', 'Jak śmiesz'],
  ['Tak', 'Raczej tak', 'Zadanie to stan umysłu'],
  ['Nie', 'Tylko trochę', 'Odmawiam odpowiedzi'],
  ['Tak', 'W lodówce', 'Co?'],
];
A.CONTROL_REPLIES = [
  'Odpowiedź przyjęta. Pieczątka uczciwości przyznana.',
  'Inspektor kiwa głową z uznaniem. Lub zasnął. Trudno ocenić.',
  'Protokół podpisany w trzech egzemplarzach. Wracaj do pracy.',
  'Kontrola zakończona wynikiem pozytywnym. Gratulujemy (niechętnie).',
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
];
A.JUDGES = [
  ['Kapibara Hortensja', () => 10, ['Spokojnie. Wszystko jest na 10.', 'Dziesięć. Jak zawsze. Herbaty?']],
  ['Ślimak Zbigniew', () => rand(2, 5), ['Za szybko. Zdecydowanie za szybko.', 'Nie zdążyłem nawet ruszyć.']],
  ['Babcia Halina', () => 10, ['Dziesięć, ale zjedz coś, bo blado wyglądasz.', 'Pięknie! A kiedy ślub?']],
  ['Kot Prezes', () => randInt(0, 10), ['*zrzuca kartkę z oceną ze stołu*', '*patrzy z pogardą, potem mruczy*']],
  ['Ministerstwo Czasu', () => NaN, ['Ocena zostanie doręczona w ciągu 90 dni roboczych.', 'Wymagany wniosek o wydanie oceny (formularz B-12).']],
  ['Duch Kopernika', () => rand(8, 10), ['Wstrzymał Słońce, ruszył Ziemię. A Ty – zadanie. Szacunek.', 'Ziemia się kręci. Zadanie też się kręciło. Zgadza się.']],
];
A.STAMPS = ['ZATWIERDZONO', 'WYKONANO (PODOBNO)', 'SPRAWDZONO WZROKOWO', 'ZGODNIE Z PLANEM', 'NIEWIARYGODNE'];

// Wydłużone napisy końcowego odliczania
A.FINAL_COUNT = {
  10: ['DZIESIĘĆ', 'słownie'],
  9: ['IX', 'po rzymsku'],
  8: ['1000', 'binarnie'],
  7: ['🐌🐌🐌🐌🐌🐌🐌', 'w ślimakach'],
  6: ['−····', 'alfabetem Morse’a'],
  5: ['✋', 'na palcach'],
  4: ['2 + 2', 'po zatwierdzeniu przez komisję'],
  3: ['🍅🍅🍅', 'w pomidorach'],
  2: ['DWIE', 'sekundy, słownie'],
  1: ['JEDNA!', 'ostatnia, nie mrugaj'],
};

// Przerwa
A.BREAK_TIPS = [
  'Wstań. Przeciągnij się jak kot, który właśnie odkrył, że istnieje.',
  'Popatrz przez okno na coś odległego. Udawaj, że kręcisz teledysk.',
  'Napij się wody. Kawa nie liczy się jako woda, choć bardzo by chciała.',
  'Zrób 5 głębokich oddechów. Szósty jest opcjonalny, ale zalecany.',
  'Porozmawiaj z rośliną. Ona też ma ciężki dzień.',
  'Rozluźnij ramiona. Właśnie teraz. One są przy uszach, prawda?',
];
