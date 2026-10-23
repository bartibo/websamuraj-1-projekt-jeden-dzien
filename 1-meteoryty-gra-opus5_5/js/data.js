'use strict';
/* Dane gry: typy meteorytów, palety efektów, ulepszenia, bonusy, ikony. */

// Indeks rozmiaru: 0 – mały, 1 – średni, 2 – duży
const METEOR_TYPES = {
  rock: {
    name: 'Skalny', desc: 'Najczęstszy. Duże rozpadają się na mniejsze odłamki.',
    radius: [13, 22, 34], hp: [10, 24, 48], impact: [3, 6, 10], score: [10, 20, 35], credits: [2, 3, 5],
    speed: 1.0, spin: 0.5, trail: 'dust', palette: 'rock', color: '#e3c7a2',
  },
  fast: {
    name: 'Szybki odłamek', desc: 'Mały, ale bardzo szybki. Pojawia się od fali 2.',
    radius: [10], hp: [7], impact: [4], score: [25], credits: [3],
    speed: 2.2, spin: 1.6, trail: 'fire', palette: 'fast', color: '#ff6050',
  },
  iron: {
    name: 'Żelazny', desc: 'Niezwykle wytrzymały i dobrze płatny. Od fali 3.',
    radius: [0, 21, 31], hp: [0, 80, 150], impact: [0, 10, 16], score: [0, 60, 100], credits: [0, 8, 13],
    speed: 0.72, spin: 0.35, trail: 'dust', palette: 'iron', color: '#c8d6e8', drop: 0.14,
  },
  volatile: {
    name: 'Wybuchowy', desc: 'Eksploduje i rani sąsiednie meteoryty – wykorzystaj to! Od fali 4.',
    radius: [0, 23], hp: [0, 26], impact: [0, 9], score: [0, 40], credits: [0, 5],
    speed: 0.95, spin: 0.4, trail: 'ember', palette: 'volatile', color: '#ff9a2a', blast: 115,
  },
  comet: {
    name: 'Kometa', desc: 'Szybka; po trafieniu rozpada się na lodowe odłamki. Od fali 6.',
    radius: [0, 19], hp: [0, 34], impact: [0, 8], score: [0, 50], credits: [0, 6],
    speed: 1.55, spin: 0.3, trail: 'comet', palette: 'comet', color: '#8fdcff',
  },
  zig: {
    name: 'Wirujący odłamek', desc: 'Leci zygzakiem – trudno go trafić. Od fali 7.',
    radius: [0, 16], hp: [0, 30], impact: [0, 7], score: [0, 55], credits: [0, 6],
    speed: 1.2, spin: 2.2, trail: 'zig', palette: 'zig', color: '#c98bff', wobble: 3.2,
  },
  shielded: {
    name: 'Ekranowany', desc: 'Tarcza energetyczna pochłania pociski i się odnawia. EMP zrywa ją od razu. Od fali 9.',
    radius: [0, 22, 30], hp: [0, 50, 90], impact: [0, 9, 13], score: [0, 70, 110], credits: [0, 8, 12],
    speed: 0.8, spin: 0.3, trail: 'dust', palette: 'iron', color: '#7fd7ff', shield: 0.9, art: 'iron', drop: 0.1,
  },
  hunter: {
    name: 'Łowca', desc: 'Obcy statek. Krąży po orbicie i ostrzeliwuje tarczę – jego pociski da się zestrzelić. Od fali 8.',
    radius: [0, 19], hp: [0, 110], impact: [0, 10], score: [0, 150], credits: [0, 15],
    speed: 1.1, spin: 0, trail: 'alien', palette: 'alien', color: '#8dff9a', ship: true, noPush: true, drop: 0.35,
  },
  bolt: {
    name: 'Pocisk plazmowy', desc: '',
    radius: [6], hp: [3], impact: [4], score: [5], credits: [0],
    speed: 2.4, spin: 0, trail: 'alien', palette: 'alien', color: '#8dff9a', noPush: true,
  },
  cluster: {
    name: 'Gromada', desc: 'Po rozbiciu rozsypuje się na 7 szybkich odłamków – niszcz ją z dala od planety. Od fali 11.',
    radius: [0, 0, 34], hp: [0, 0, 70], impact: [0, 0, 12], score: [0, 0, 90], credits: [0, 0, 10],
    speed: 0.75, spin: 0.4, trail: 'ember', palette: 'cluster', color: '#ff7ad9',
  },
  ice: {
    name: 'Lodowy odłamek', desc: '',
    radius: [9], hp: [6], impact: [3], score: [10], credits: [1],
    speed: 1.3, spin: 1.4, trail: 'frost', palette: 'comet', color: '#bfefff',
  },
  boss: {
    name: 'Planetoida', desc: 'Olbrzym nadlatujący co 5 fal. Wyrzuca z siebie odłamki.',
    radius: [78], hp: [800], impact: [45], score: [3000], credits: [160],
    speed: 0.32, spin: 0.12, trail: 'boss', palette: 'boss', color: '#ff4040', drop: 1,
  },
};

const SIZE_SPEED = [1.2, 1.0, 0.85];

// Kolory 'r,g,b' (debris jako hex)
const PALETTES = {
  rock:     { spark: '255,190,120', glow: '255,140,60',  smoke: '70,60,55',   debris: '#7a6550' },
  fast:     { spark: '255,130,90',  glow: '255,80,60',   smoke: '80,50,50',   debris: '#7a4a3a' },
  iron:     { spark: '220,235,255', glow: '150,200,255', smoke: '70,75,85',   debris: '#9aa6b6' },
  volatile: { spark: '255,210,90',  glow: '255,120,20',  smoke: '70,40,28',   debris: '#5a321e' },
  comet:    { spark: '210,245,255', glow: '110,200,255', smoke: '150,185,210', debris: '#d8f0ff' },
  boss:     { spark: '255,180,100', glow: '255,90,40',   smoke: '60,40,35',   debris: '#6a4a36' },
  shield:   { spark: '160,255,255', glow: '60,220,255',  smoke: '40,90,110',  debris: '#8ff' },
  planet:   { spark: '255,210,110', glow: '255,110,30',  smoke: '55,42,36',   debris: '#5a4a3a' },
  zig:      { spark: '225,180,255', glow: '170,90,255',  smoke: '60,40,80',   debris: '#7a5a9a' },
  cluster:  { spark: '255,170,230', glow: '255,80,200',  smoke: '70,40,60',   debris: '#6a4a5a' },
  alien:    { spark: '190,255,170', glow: '90,255,120',  smoke: '40,70,50',   debris: '#5a7a6a' },
  crate:    { spark: '255,230,150', glow: '255,200,80',  smoke: '70,65,55',   debris: '#b09060' },
};

const POWERUPS = {
  rapid:  { name: 'SZAŁ OGNIA',         desc: 'Podwójna szybkostrzelność przez 8 s', color: '255,210,70',  dur: 8, w: 3 },
  spread: { name: 'SALWA',              desc: 'Dodatkowe pociski w szerokim wachlarzu przez 9 s', color: '255,110,220', dur: 9, w: 3 },
  slow:   { name: 'SPOWOLNIENIE CZASU', desc: 'Meteoryty zwalniają do 40% przez 6 s', color: '110,190,255', dur: 6, w: 2 },
  shield: { name: 'TARCZA ODNOWIONA',   desc: 'Natychmiast ładuje tarczę do pełna', color: '70,255,210',  dur: 0, w: 2 },
  nuke:   { name: 'BOMBA ORBITALNA',    desc: 'Fala uderzeniowa na cały ekran', color: '255,80,60',   dur: 0, w: 1 },
  repair: { name: 'NAPRAWA PLANETY',    desc: 'Przywraca 15 pkt integralności planety', color: '120,255,120', dur: 0, w: 1.5 },
  // Pancerne kapsuły: trzeba je trafić kilka razy (hits)
  over:    { name: 'PRZECIĄŻENIE TARCZY', desc: 'Tarcza ładuje się do 160% pojemności. Pancerna: 6 trafień', color: '120,230,255', dur: 0, w: 0.8, hits: 6 },
  support: { name: 'SATELITY WSPARCIA',   desc: '+3 satelity na 20 s. Pancerna: 8 trafień', color: '150,255,170', dur: 20, w: 0.8, hits: 8 },
  gold:    { name: 'ZŁOTY DESZCZ',        desc: 'Podwójne kredyty i punkty przez 12 s. Pancerna: 6 trafień', color: '255,200,60', dur: 12, w: 0.8, hits: 6 },
};

/* Bronie z kontenerów: zestrzel przelatujący kontener (ok. 30 trafień), a broń zastąpi działo na kilkanaście sekund. */
const CRATE_HITS = 30;
const WEAPONS = {
  laser:   { name: 'LANCA LASEROWA',   desc: 'Ciągła wiązka tnąca wszystko na linii ognia', color: '255,90,130', dur: 12 },
  rockets: { name: 'WYRZUTNIA RAKIET', desc: 'Samonaprowadzające rakiety z wybuchem obszarowym', color: '255,150,60', dur: 14 },
  tesla:   { name: 'DZIAŁO ŁUKOWE',    desc: 'Błyskawica przeskakuje między pobliskimi celami', color: '150,175,255', dur: 13 },
};

const HOMING_NAMES = ['brak', 'słabe', 'średnie', 'silne'];

// Po 10 poziomach Moc i Szybkostrzelność da się dalej podkręcać, ale coraz drożej – ujście dla kredytów
const softCost = l => l < 10 ? 60 + l * 50 : Math.round(560 * Math.pow(1.3, l - 9));

const UPGRADES = [
  { id: 'dmg', name: 'Moc działa', desc: 'Silniejsze pociski plazmowe.', max: Infinity, pips: 10,
    cost: softCost, stat: (g, l) => `${fmt1(g.calcDmg(l))} → ${fmt1(g.calcDmg(l + 1))} obrażeń` },
  { id: 'rate', name: 'Szybkostrzelność', desc: 'Szybsze chłodzenie luf.', max: Infinity, pips: 10,
    cost: softCost, stat: (g, l) => `${fmt1(g.calcRate(l))} → ${fmt1(g.calcRate(l + 1))} strz./s` },
  { id: 'multi', name: 'Wielolufowość', desc: 'Dodatkowy pocisk w każdej salwie.', max: 4,
    cost: l => 180 + l * 170, stat: (g, l) => `Pociski: ${l + 1} → ${l + 2}` },
  { id: 'pierce', name: 'Przebicie', desc: 'Pocisk przelatuje przez kolejny cel.', max: 3,
    cost: l => 200 + l * 180, stat: (g, l) => `Przebicia: ${l} → ${l + 1}` },
  { id: 'homing', name: 'Naprowadzanie', desc: 'Pociski skręcają w stronę celów.', max: 3,
    cost: l => 220 + l * 200, stat: (g, l) => `${HOMING_NAMES[l]} → ${HOMING_NAMES[l + 1]}` },
  { id: 'shield', name: 'Generator tarczy', desc: 'Większa pojemność tarczy.', max: 8,
    cost: l => 80 + l * 70, stat: (g, l) => `${g.calcShield(l)} → ${g.calcShield(l + 1)} pkt` },
  { id: 'regen', name: 'Regeneracja tarczy', desc: 'Szybsze odnawianie tarczy.', max: 6,
    cost: l => 90 + l * 80, stat: (g, l) => `${fmt1(g.calcRegen(l))} → ${fmt1(g.calcRegen(l + 1))} pkt/s` },
  { id: 'drone', name: 'Satelita obronny', desc: 'Dron na orbicie strzela samodzielnie.', max: 4,
    cost: l => 250 + l * 250, stat: (g, l) => `Satelity: ${l} → ${l + 1}` },
  { id: 'emp', name: 'Impuls EMP', desc: 'Krótsza odnowa i większy zasięg.', max: 5,
    cost: l => 150 + l * 120, stat: (g, l) => `Odnowa ${fmt1(g.calcEmpCd(l))} → ${fmt1(g.calcEmpCd(l + 1))} s` },
  { id: 'repair', name: 'Naprawa planety', desc: 'Odbudowa zniszczonych regionów.', max: Infinity,
    cost: l => 70 + l * 30, stat: g => `+25 pkt (teraz ${Math.ceil(g.hp)}/${g.maxHp})` },
];

const WAVE_INTRO = {
  1: 'Przytrzymaj LPM, by strzelać · Spacja – impuls EMP',
  2: 'Nowe zagrożenie: szybkie odłamki',
  3: 'Nowe zagrożenie: meteoryty żelazne',
  4: 'Nowe zagrożenie: meteoryty wybuchowe',
  6: 'Nowe zagrożenie: komety',
  7: 'Nowe zagrożenie: wirujące odłamki',
  8: 'Nowe zagrożenie: Łowcy – obce statki na orbicie',
  9: 'Nowe zagrożenie: meteoryty z tarczą – EMP ją zrywa',
  11: 'Nowe zagrożenie: gromady – nie rozbijaj ich przy planecie',
};
const WAVE_FLAVOR = [
  'Czujniki wykrywają gęsty rój',
  'Pole odłamków gęstnieje',
  'Utrzymaj tarczę za wszelką cenę',
  'Radar nie nadąża z liczeniem',
  'Ludzkość patrzy w niebo',
  'Kolejna fala na kursie kolizyjnym',
];

/* Protokoły obrony: co kilka fal wybór 1 z 3 kart na resztę rozgrywki. Każda ma plus i minus. */
const PROTOCOL_WAVES = [2, 4, 7, 10, 14, 18];
const PROTOCOL_MAX = 4;
const PROTOCOLS = [
  { id: 'rail',     name: 'Działo szynowe',       plus: '×2,6 obrażeń, +2 przebicia', minus: 'połowa szybkostrzelności', icon: 'pierce' },
  { id: 'chain',    name: 'Reakcja łańcuchowa',   plus: '20% zestrzeleń wybucha i rani sąsiadów', minus: 'tarcza −20%', icon: 'chain' },
  { id: 'mirror',   name: 'Tarcza zwierciadlana', plus: 'uderzenie w tarczę odpala 3 pociski', minus: 'regeneracja tarczy −40%', icon: 'shield' },
  { id: 'cryo',     name: 'Kriopociski',          plus: 'trafiony meteoryt zwalnia na 1,5 s', minus: 'obrażenia −20%', icon: 'cryo' },
  { id: 'scrap',    name: 'Złomiarze',            plus: 'kredyty z meteorytów ×1,6', minus: 'tarcza −30%', icon: 'scrap' },
  { id: 'overload', name: 'Przeciążenie EMP',     plus: 'każde zestrzelenie skraca odnowę EMP o 0,4 s', minus: 'zasięg EMP −25%', icon: 'emp' },
  { id: 'glass',    name: 'Szklane działo',       plus: '×1,6 obrażeń', minus: 'tarcza −50%', icon: 'dmg' },
  { id: 'cascade',  name: 'Kaskada',              plus: 'combo trwa 4 s, mnożnik do ×7', minus: 'uderzenie w tarczę zeruje combo', icon: 'cascade' },
  { id: 'swarm',    name: 'Rój',                  plus: 'dwa razy więcej satelitów (co najmniej 2)', minus: 'satelity −50% obrażeń, działo −15% szybkostrzelności', icon: 'drone' },
];

/* Wydarzenia fal: od fali 3 każda zwykła fala ma jedno zjawisko, zapowiadane w sklepie. */
const WAVE_EVENTS = [
  { id: 'caps',     name: 'Deszcz kapsuł',      desc: 'bonusy wypadają 3× częściej', from: 3, drop: 3 },
  { id: 'perseids', name: 'Rój Perseidów',      desc: 'szybkie odłamki z jednego sektora nieba', from: 4, weights: { fast: 9 }, count: 1.15, sector: 0.7 },
  { id: 'volleys',  name: 'Ostrzał salwami',    desc: 'meteoryty nadlatują zwartymi grupami', from: 4, volley: 0.35 },
  { id: 'iron',     name: 'Pole żelaza',        desc: 'dużo żelaznych meteorytów, kredyty ×1,5', from: 5, weights: { iron: 8 }, count: 0.8, credits: 1.5 },
  { id: 'chainrx',  name: 'Niestabilny rój',    desc: 'dużo wybuchowych – czas na reakcje łańcuchowe', from: 5, weights: { volatile: 8 } },
  { id: 'storm',    name: 'Burza słoneczna',    desc: 'tarcza się nie odnawia, EMP ładuje się 2× szybciej', from: 6, noRegen: true, emp: 0.5 },
  { id: 'comets',   name: 'Deszcz komet',       desc: 'komety rozpadające się na lód', from: 7, weights: { comet: 7 } },
  { id: 'fronts',   name: 'Dwa fronty',         desc: 'meteoryty nadlatują z dwóch przeciwnych stron', from: 8, fronts: true },
  { id: 'convoy',   name: 'Konwój zaopatrzenia', desc: 'trzy kontenery z bronią do zestrzelenia', from: 4, crates: 3 },
  { id: 'hunters',  name: 'Polowanie',          desc: 'dodatkowi Łowcy na orbicie, kredyty ×1,3', from: 10, hunters: 2, credits: 1.3 },
];

const ICONS = (() => {
  const s = inner => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  return {
    dmg: s('<path d="M12 2l2.4 6.3L21 9l-5 4.4L17.4 21 12 17.3 6.6 21 8 13.4 3 9l6.6-.7z"/>'),
    rate: s('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    multi: s('<path d="M12 21V5M6 21l3.2-14M18 21l-3.2-14"/><path d="M9.5 7.5L12 4l2.5 3.5"/>'),
    pierce: s('<circle cx="12" cy="12" r="5"/><path d="M2 12h19M17.5 8.5L21 12l-3.5 3.5"/>'),
    homing: s('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>'),
    shield: s('<path d="M12 2.5l8 3v6c0 5-3.4 8.8-8 10.5-4.6-1.7-8-5.5-8-10.5v-6z"/>'),
    regen: s('<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/><path d="M12 9v6M9 12h6"/>'),
    drone: s('<rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M3 3.5l4 4-2.5 2.5-4-4zM21 20.5l-4-4 2.5-2.5 4 4z"/><path d="M7.5 7.5l2 2M14.5 14.5l2 2"/>'),
    emp: s('<circle cx="12" cy="12" r="2.2"/><path d="M7.8 7.8a6 6 0 0 1 8.4 0M16.2 16.2a6 6 0 0 1-8.4 0M4.9 4.9a10 10 0 0 1 14.2 0M19.1 19.1a10 10 0 0 1-14.2 0"/>'),
    repair: s('<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18"/>'),
    pause: s('<path d="M9 5v14M15 5v14"/>'),
    chain: s('<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/>'),
    cryo: s('<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9 4l3 2 3-2M9 20l3-2 3 2"/>'),
    scrap: s('<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2a3.4 3.4 0 1 0 0 5.6M8 12h5"/>'),
    cascade: s('<path d="M4 18l4-4 4 3 8-9"/><path d="M15 8h5v5"/>'),
    laser: s('<path d="M3 21L21 3"/><path d="M14 3h7v7"/><circle cx="5" cy="19" r="1.5"/>'),
    rockets: s('<path d="M12 2c3 3 4 7 3 12H9C8 9 9 5 12 2z"/><path d="M9 14l-3 3v3l3-2M15 14l3 3v3l-3-2M11 18h2v3h-2z"/>'),
    tesla: s('<path d="M13 2L5 13h6l-2 9 10-13h-6l2-7z"/>'),
  };
})();
