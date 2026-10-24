'use strict';
/* Skala Mercallego, typy budynków i gotowe scenariusze. */

const MMI = [
  null,
  { name: 'Nieodczuwalne', color: '#dfe6ee', text: 'Rejestrują je tylko sejsmografy. Ludzie niczego nie zauważają.' },
  { name: 'Bardzo słabe', color: '#bfccff', text: 'Odczuwalne tylko przez nieliczne osoby w spoczynku, zwłaszcza na wyższych piętrach.' },
  { name: 'Słabe', color: '#9fe3ff', text: 'Odczuwalne w budynkach, podobnie jak przejazd ciężarówki. Wiszące lampy delikatnie się kołyszą.' },
  { name: 'Umiarkowane', color: '#7ff5e8', text: 'Brzęczą szyby i naczynia, skrzypią ściany. Zaparkowane samochody wyraźnie się kołyszą.' },
  { name: 'Dość silne', color: '#7cf28f', text: 'Budzi śpiących. Przewracają się niestabilne przedmioty, pękają pojedyncze szyby.' },
  { name: 'Silne', color: '#f4f25a', text: 'Odczuwają je wszyscy, wielu wybiega z domów. Przesuwają się meble, odpada tynk.' },
  { name: 'Bardzo silne', color: '#ffc93c', text: 'Trudno ustać na nogach. Szkody w słabych budynkach, spadają dachówki i kominy. Brak prądu.' },
  { name: 'Niszczące', color: '#ff9330', text: 'Częściowe zawalenia budynków murowanych, padają kominy i latarnie. Ogromna panika.' },
  { name: 'Gwałtowne', color: '#ff4b2b', text: 'Poważne szkody nawet w solidnych budynkach, część zawala się całkowicie. Pęka grunt.' },
  { name: 'Druzgocące', color: '#e0183c', text: 'Większość budynków murowanych i z prefabrykatów jest zniszczona. Szerokie szczeliny w gruncie.' },
  { name: 'Katastrofalne', color: '#b0124f', text: 'Ocalały tylko nieliczne konstrukcje. Grunt faluje, zrywa się, osuwają się zbocza.' },
  { name: 'Totalne zniszczenie', color: '#7a0f5c', text: 'Niemal wszystko jest zniszczone. Na powierzchni widać fale, a przedmioty są wyrzucane w powietrze.' }
];

/* Odporność: Idmg – pierwsze uszkodzenia, Iheavy – poważne, Icol – zawalenie (mediana w skali MMI). */
const BTYPES = {
  house: {
    name: 'Dom jednorodzinny', short: 'dom', fh: 3.0, Idmg: 7.0, Iheavy: 8.3, Icol: 9.5, zeta: 0.07,
    desc: 'Lekka konstrukcja szkieletowa. Dobrze znosi drgania, ale nie wytrzyma tsunami.'
  },
  masonry: {
    name: 'Kamienica (cegła, mur bez zbrojenia)', short: 'kamienica', fh: 3.4, Idmg: 6.2, Iheavy: 7.3, Icol: 8.3, zeta: 0.06,
    desc: 'Kruchy, ciężki mur bez stali. W trzęsieniach ziemi zwykle pada pierwszy.'
  },
  panel: {
    name: 'Blok z wielkiej płyty', short: 'blok', fh: 2.8, Idmg: 7.0, Iheavy: 8.3, Icol: 9.4, zeta: 0.05,
    desc: 'Prefabrykowane płyty betonowe. Słabe miejsca to połączenia między płytami.'
  },
  office: {
    name: 'Biurowiec żelbetowy', short: 'biurowiec', fh: 3.6, Idmg: 7.5, Iheavy: 8.9, Icol: 10.1, zeta: 0.05,
    desc: 'Szkielet z betonu zbrojonego. Ugina się i pęka, zanim się zawali.'
  },
  tower: {
    name: 'Wieżowiec antysejsmiczny', short: 'wieżowiec', fh: 3.8, Idmg: 8.7, Iheavy: 10.2, Icol: 11.5, zeta: 0.11,
    desc: 'Nowoczesna stalowa konstrukcja z tłumikiem masowym (złota kula na szczycie), który wygasza kołysanie.'
  },
  belfry: {
    name: 'Wieża kościelna (cegła)', short: 'wieża', fh: 4.2, Idmg: 6.0, Iheavy: 7.0, Icol: 7.9, zeta: 0.05,
    desc: 'Smukła, ciężka i murowana. Kołysze się mocno i łatwo pęka.'
  }
};

const SCENARIOS = [
  { label: 'Mikrowstrząs', sub: 'M 2,0', M: 2.0, depth: 6, dist: 4, soil: 'stiff', sea: false },
  { label: 'Lekkie', sub: 'M 4,3', M: 4.3, depth: 8, dist: 6, soil: 'stiff', sea: false },
  { label: 'Umiarkowane', sub: 'M 5,6', M: 5.6, depth: 10, dist: 6, soil: 'stiff', sea: false },
  { label: 'Silne', sub: 'M 6,6', M: 6.6, depth: 12, dist: 8, soil: 'stiff', sea: false },
  { label: 'Bardzo silne', sub: 'M 7,6', M: 7.6, depth: 14, dist: 10, soil: 'stiff', sea: false },
  { label: 'Katastrofalne', sub: 'M 9,0', M: 9.0, depth: 20, dist: 20, soil: 'soft', sea: true }
];

const HISTORIC = [
  { label: 'Northridge (USA)', year: 1994, M: 6.7, depth: 18, dist: 6, soil: 'stiff', sea: false,
    note: 'Uskok ukryty pod Los Angeles. Zawaliły się estakady autostrad, zginęło 57 osób.' },
  { label: 'Kobe (Japonia)', year: 1995, M: 6.9, depth: 17, dist: 12, soil: 'soft', sea: false,
    note: 'Wielkie trzęsienie Hanshin. Grunt w porcie uległ upłynnieniu, zginęło ponad 6 tys. osób.' },
  { label: "L'Aquila (Włochy)", year: 2009, M: 6.3, depth: 9, dist: 4, soil: 'stiff', sea: false,
    note: 'Ucierpiało historyczne centrum z murowanymi kamienicami. Zginęło 309 osób.' },
  { label: 'Haiti', year: 2010, M: 7.0, depth: 13, dist: 22, soil: 'soft', sea: false,
    note: 'Słabe budownictwo doprowadziło do ogromnych strat w Port-au-Prince.' },
  { label: 'Turcja i Syria', year: 2023, M: 7.8, depth: 12, dist: 15, soil: 'stiff', sea: false,
    note: 'Uskok pękł na długości ok. 350 km. Zginęło ponad 50 tys. osób.' },
  { label: 'Tōhoku (Japonia)', year: 2011, M: 9.1, depth: 29, dist: 70, soil: 'stiff', sea: true,
    note: 'Najsilniejsze trzęsienie w historii Japonii. Tsunami miejscami przekroczyło 30 m.' },
  { label: 'Sumatra (Ocean Indyjski)', year: 2004, M: 9.1, depth: 30, dist: 110, soil: 'soft', sea: true,
    note: 'Tsunami uderzyło w 14 krajów. Zginęło ok. 230 tys. osób.' },
  { label: 'Valdivia (Chile)', year: 1960, M: 9.5, depth: 33, dist: 30, soil: 'stiff', sea: true,
    note: 'Najsilniejsze trzęsienie ziemi, jakie kiedykolwiek zarejestrowano.' },
  { label: 'Megatrzęsienie', year: 0, hypo: true, M: 9.9, depth: 25, dist: 40, soil: 'soft', sea: true,
    note: 'Scenariusz „co by było, gdyby”. Takiego trzęsienia nigdy nie zarejestrowano. Uskok musiałby pęknąć na długości ok. 2500 km, mniej więcej jak z Gdańska do Lizbony.' }
];

const TOD = {
  day: {
    label: 'Dzień', sunEl: 50, sunAz: -28, sunColor: 0xfff1dc, sunI: 3.2, hemiSky: 0xbfd8ff, hemiGround: 0x8a7a62, hemiI: 1.05,
    skyTop: 0x2c6cd6, skyHor: 0xcfe4f8, skyBot: 0x9fb8cc, fog: 0xc6daee, fogNear: 420, fogFar: 2900, exposure: 0.85,
    windows: 0.0, lamps: 0.0, sunGlow: 0.5, stars: 0, env: 0.9, water: 0x2a6d8c
  },
  sunset: {
    label: 'Zachód', sunEl: 12, sunAz: -64, sunColor: 0xffb070, sunI: 3.6, hemiSky: 0xa3b4e0, hemiGround: 0x6b5442, hemiI: 1.15,
    skyTop: 0x1e3170, skyHor: 0xff9c63, skyBot: 0x5b4a5c, fog: 0xc98b72, fogNear: 380, fogFar: 2600, exposure: 1.0,
    windows: 0.45, lamps: 1.0, sunGlow: 1.0, stars: 0.12, env: 1.0, water: 0x23506e
  },
  night: {
    label: 'Noc', sunEl: 38, sunAz: -40, sunColor: 0x9fb4ff, sunI: 0.6, hemiSky: 0x3a4a80, hemiGround: 0x0b0b12, hemiI: 0.6,
    skyTop: 0x01030a, skyHor: 0x14213f, skyBot: 0x05070c, fog: 0x0e1628, fogNear: 300, fogFar: 2200, exposure: 1.1,
    windows: 1.1, lamps: 1.6, sunGlow: 0.25, stars: 1, env: 0.45, water: 0x0f2436
  }
};
