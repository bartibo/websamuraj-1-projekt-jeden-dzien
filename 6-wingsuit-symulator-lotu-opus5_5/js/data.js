/* Na Krawędzi – dane: miejsca skoków i warunki pogodowe */
(function (root) {
  'use strict';
  const WS = root.WS = root.WS || {};

  // s = odległość wzdłuż trasy (oś Z), h = wysokość dna doliny [m n.p.m.]
  WS.LOCATIONS = [
    {
      id: 'dolomity',
      name: 'Dolomity',
      title: 'Żleb Cieni',
      desc: 'Skok z grani na 2600 m, potem kręty żleb z progiem skalnym, wąwóz z wiszącym mostem i lądowisko na hali.',
      tags: ['2600 m', '≈5 km', 'most', 'próg skalny'],
      seed: 2407,
      exitH: 2600,
      clear: [[0, 420], [220, 420], [500, 220], [1000, 150], [1600, 115], [2250, 95], [3000, 70], [3350, 60], [4000, 70], [4650, 90], [6000, 90]],
      cliffs: [{ s: 0, len: 220 }, { s: 2250, len: 75, drop: 160 }],
      path: { a1: 300, f1: 1 / 800, p1: 0.4, a2: 120, f2: 1 / 330, p2: 1.9 },
      width: { base: 150, vary: 0.4, freq: 1 / 650 },
      narrows: [{ s0: 3000, s1: 3700, w: 40, k: 55 }],
      wallH: [[-2000, 900], [0, 800], [2000, 1000], [4500, 1200], [7000, 1150]],
      wallK: 150,
      ridgeAmp: 650,
      terrace: 0,
      water: null,
      sLand: 4650, landLen: 1800,
      gates: { from: 450, to: 4450, step: 300, lateral: 0.35 },
      bridge: { s: 3350, h: 55 },
      arch: null,
      palette: 'alpine',
      treeLine: 2150, snowLine: 2780,
      trees: { kind: 'pine', density: 0.55 },
      cloudBase: 2050
    },
    {
      id: 'fiord',
      name: 'Fiord',
      title: 'Ściana Trolli',
      desc: 'Pionowa ściana granitu prosto nad wodą, przelot nad taflą fiordu, cieśnina z mostem i lądowanie na plaży.',
      tags: ['1250 m', '≈2,6 km', 'nad wodą', 'cieśnina'],
      seed: 9133,
      exitH: 1250,
      floor: [[-4000, 1250], [0, 1250], [2050, 1250], [2350, 1376], [4000, 1376], [6500, 1700]],
      cliffs: [{ s: 0, len: 260, drop: 1370 }],
      path: { a1: 420, f1: 1 / 1250, p1: 2.2, a2: 110, f2: 1 / 480, p2: 0.7 },
      width: { base: 270, vary: 0.3, freq: 1 / 900 },
      narrows: [{ s0: 1700, s1: 2100, w: 95, k: 65 }],
      wallH: [[-2000, 700], [0, 650], [300, 1250], [1500, 1050], [2900, 700], [5000, 650]],
      wallK: 85,
      ridgeAmp: 420,
      terrace: 0,
      water: 0,
      sLand: 2350, landLen: 1500, landOff: 150,
      gates: { from: 450, to: 2250, step: 230, lateral: 0.55 },
      bridge: { s: 1900, h: 110 },
      arch: null,
      palette: 'fjord',
      treeLine: 650, snowLine: 1150,
      trees: { kind: 'pine', density: 0.45 },
      cloudBase: 850
    },
    {
      id: 'kanion',
      name: 'Kanion',
      title: 'Czerwona Szczelina',
      desc: 'Start z płaskowyżu, a potem coraz głębszy, kręty kanion: szczelina szeroka na 55 m, skalny łuk i most linowy.',
      tags: ['1950 m', '≈4 km', 'szczelina', 'skalny łuk'],
      seed: 5521,
      exitH: 1950,
      clear: [[0, 330], [160, 330], [500, 160], [1000, 120], [1500, 95], [1950, 80], [2500, 110], [2780, 120], [3000, 150], [3550, 190], [5000, 190]],
      cliffs: [{ s: 0, len: 160 }],
      path: { a1: 220, f1: 1 / 600, p1: 1.1, a2: 85, f2: 1 / 260, p2: 2.6 },
      width: { base: 70, vary: 0.4, freq: 1 / 500 },
      narrows: [{ s0: 1500, s1: 2450, w: 27, k: 22 }],
      wallH: null,
      flatTop: 1950,
      wallK: 45,
      ridgeAmp: 70,
      terrace: 1,
      water: null,
      sLand: 3550, landLen: 1800,
      gates: { from: 380, to: 3350, step: 250, lateral: 0.25 },
      bridge: { s: 2780, h: 48 },
      arch: { s: 1950 },
      palette: 'desert',
      treeLine: 1800, snowLine: 9999,
      trees: { kind: 'shrub', density: 0.18 },
      cloudBase: 1250
    }
  ];

  // Kąty słońca: el – wysokość nad horyzontem, az – azymut względem kierunku trasy (0 = przed nami)
  WS.WEATHER = [
    {
      id: 'slonce', name: 'Słońce', icon: '☀', desc: 'Czyste niebo, świetna widoczność, lekki wiatr.',
      sunEl: 48, sunAz: 145, skyTop: '#2c66bd', horizon: '#b8d3ee', sunCol: '#fff1da', sunInt: 1.1,
      sunFog: '#fdf0d8', ambSky: '#8fb2dc', ambGround: '#6a6250', fog: 0.000085, heightFog: 0,
      cloudCover: 0.32, cloudCol: '#ffffff', cloudDark: '#9fb0c6', cloudH: 1800,
      wind: 3, turb: 0.12, gust: 0.25, particles: 'pylek', snow: 0, wet: 0, lightning: false,
      puffs: 0, stars: 0, aurora: 0, disk: 1, exposure: 1.0
    },
    {
      id: 'zachod', name: 'Złota godzina', icon: '🌅', desc: 'Nisko stojące słońce, długie cienie, ciepłe światło.',
      sunEl: 7, sunAz: 30, skyTop: '#36508f', horizon: '#f0a46c', sunCol: '#ffb06a', sunInt: 1.25,
      sunFog: '#ffb37a', ambSky: '#7f78a6', ambGround: '#5a4232', fog: 0.00011, heightFog: 0,
      cloudCover: 0.38, cloudCol: '#ffc08e', cloudDark: '#7a5a7a', cloudH: 1900,
      wind: 2, turb: 0.08, gust: 0.2, particles: 'pylek', snow: 0, wet: 0, lightning: false,
      puffs: 0, stars: 0, aurora: 0, disk: 1, exposure: 1.0
    },
    {
      id: 'mgla', name: 'Mgła i chmury', icon: '🌫', desc: 'Przelot przez chmury, gęsta mgła w dolinach. Teren widać dopiero z bliska.',
      sunEl: 30, sunAz: 120, skyTop: '#8796a5', horizon: '#c1c8cf', sunCol: '#e9edf1', sunInt: 0.55,
      sunFog: '#dfe4e8', ambSky: '#b5bfca', ambGround: '#6a6d69', fog: 0.0009, heightFog: 1.4,
      cloudCover: 0.92, cloudCol: '#e4e8ec', cloudDark: '#8e979f', cloudH: 1500,
      wind: 5, turb: 0.35, gust: 0.35, particles: 'mzawka', snow: 0, wet: 0.35, lightning: false,
      puffs: 1, stars: 0, aurora: 0, disk: 0, exposure: 1.0
    },
    {
      id: 'burza', name: 'Burza', icon: '⛈', desc: 'Ulewa, pioruny i porywy wiatru. Lot dla twardzieli.',
      sunEl: 25, sunAz: 100, skyTop: '#262b33', horizon: '#4d545e', sunCol: '#9aa4b2', sunInt: 0.38,
      sunFog: '#59616c', ambSky: '#59616d', ambGround: '#2b2d2a', fog: 0.0005, heightFog: 0.6,
      cloudCover: 1.0, cloudCol: '#454b54', cloudDark: '#1e2228', cloudH: 1300,
      wind: 12, turb: 0.9, gust: 0.6, particles: 'deszcz', snow: 0, wet: 1, lightning: true,
      puffs: 2, stars: 0, aurora: 0, disk: 0, exposure: 1.0
    },
    {
      id: 'snieg', name: 'Śnieżyca', icon: '❄', desc: 'Zawieja, biel dookoła, zimny boczny wiatr.',
      sunEl: 22, sunAz: 120, skyTop: '#97a3b1', horizon: '#d6dce3', sunCol: '#e8eef5', sunInt: 0.5,
      sunFog: '#e6ebf0', ambSky: '#c9d3de', ambGround: '#878c93', fog: 0.00085, heightFog: 0.5,
      cloudCover: 0.96, cloudCol: '#e9edf2', cloudDark: '#9aa3ad', cloudH: 1400,
      wind: 9, turb: 0.55, gust: 0.45, particles: 'snieg', snow: 0.85, wet: 0, lightning: false,
      puffs: 1, stars: 0, aurora: 0, disk: 0, exposure: 1.0
    },
    {
      id: 'noc', name: 'Noc z zorzą', icon: '🌌', desc: 'Księżyc w pełni, gwiazdy i zorza polarna. Ziemia blisko, a widać mniej.',
      sunEl: 34, sunAz: 160, skyTop: '#03070f', horizon: '#17263f', sunCol: '#a3b8e8', sunInt: 0.95,
      sunFog: '#2a3d60', ambSky: '#3a4e7c', ambGround: '#151b27', fog: 0.00014, heightFog: 0,
      cloudCover: 0.12, cloudCol: '#6f7f9e', cloudDark: '#1a2236', cloudH: 2000,
      wind: 2, turb: 0.1, gust: 0.2, particles: 'pylek', snow: 0, wet: 0, lightning: false,
      puffs: 0, stars: 1, aurora: 1, disk: 2, exposure: 1.3
    }
  ];

  WS.WIND_DIRS = [
    { id: 'czolowy', name: 'Czołowy', angle: 180 },
    { id: 'boczny', name: 'Z boku', angle: 90 },
    { id: 'tylny', name: 'W plecy', angle: 0 }
  ];

  WS.CAMERAS = [
    { id: 'poscig', name: 'Za plecami' },
    { id: 'helm', name: 'Kamera na kasku' },
    { id: 'kino', name: 'Kamera filmowa' },
    { id: 'bok', name: 'Dron z boku' }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
