/* Retorta – dane chemiczne: pierwiastki, jony, substancje stałe, odczynniki, tabela strąceń, wskaźniki */
'use strict';
const R = window.R = {};

/* ---------- pierwiastki (Z = indeks + 1) ---------- */
R.EL_RAW = 'H,wodór,1.008;He,hel,4.0026;Li,lit,6.94;Be,beryl,9.0122;B,bor,10.81;C,węgiel,12.011;N,azot,14.007;O,tlen,15.999;F,fluor,18.998;Ne,neon,20.180;' +
 'Na,sód,22.990;Mg,magnez,24.305;Al,glin,26.982;Si,krzem,28.085;P,fosfor,30.974;S,siarka,32.06;Cl,chlor,35.45;Ar,argon,39.948;K,potas,39.098;Ca,wapń,40.078;' +
 'Sc,skand,44.956;Ti,tytan,47.867;V,wanad,50.942;Cr,chrom,51.996;Mn,mangan,54.938;Fe,żelazo,55.845;Co,kobalt,58.933;Ni,nikiel,58.693;Cu,miedź,63.546;Zn,cynk,65.38;' +
 'Ga,gal,69.723;Ge,german,72.630;As,arsen,74.922;Se,selen,78.971;Br,brom,79.904;Kr,krypton,83.798;Rb,rubid,85.468;Sr,stront,87.62;Y,itr,88.906;Zr,cyrkon,91.224;' +
 'Nb,niob,92.906;Mo,molibden,95.95;Tc,technet,98;Ru,ruten,101.07;Rh,rod,102.91;Pd,pallad,106.42;Ag,srebro,107.87;Cd,kadm,112.41;In,ind,114.82;Sn,cyna,118.71;' +
 'Sb,antymon,121.76;Te,tellur,127.60;I,jod,126.90;Xe,ksenon,131.29;Cs,cez,132.91;Ba,bar,137.33;La,lantan,138.91;Ce,cer,140.12;Pr,prazeodym,140.91;Nd,neodym,144.24;' +
 'Pm,promet,145;Sm,samar,150.36;Eu,europ,151.96;Gd,gadolin,157.25;Tb,terb,158.93;Dy,dysproz,162.50;Ho,holm,164.93;Er,erb,167.26;Tm,tul,168.93;Yb,iterb,173.05;' +
 'Lu,lutet,174.97;Hf,hafn,178.49;Ta,tantal,180.95;W,wolfram,183.84;Re,ren,186.21;Os,osm,190.23;Ir,iryd,192.22;Pt,platyna,195.08;Au,złoto,196.97;Hg,rtęć,200.59;' +
 'Tl,tal,204.38;Pb,ołów,207.2;Bi,bizmut,208.98;Po,polon,209;At,astat,210;Rn,radon,222;Fr,frans,223;Ra,rad,226;Ac,aktyn,227;Th,tor,232.04;' +
 'Pa,protaktyn,231.04;U,uran,238.03;Np,neptun,237;Pu,pluton,244;Am,ameryk,243;Cm,kiur,247;Bk,berkel,247;Cf,kaliforn,251;Es,einstein,252;Fm,ferm,257;' +
 'Md,mendelew,258;No,nobel,259;Lr,lorens,266;Rf,rutherford,267;Db,dubn,268;Sg,seaborg,269;Bh,bohr,270;Hs,has,269;Mt,meitner,278;Ds,darmsztadt,281;' +
 'Rg,roentgen,282;Cn,kopernik,285;Nh,nihon,286;Fl,flerow,289;Mc,moskow,290;Lv,liwermor,293;Ts,tenes,294;Og,oganeson,294';

R.EL = [];
R.ELS = {};
(function () {
  const alk = [3, 11, 19, 37, 55, 87], ziem = [4, 12, 20, 38, 56, 88], nie = [1, 6, 7, 8, 15, 16, 34],
    hal = [9, 17, 35, 53, 85, 117], szl = [2, 10, 18, 36, 54, 86, 118], pol = [5, 14, 32, 33, 51, 52],
    pod = [13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116];
  const gazy = [1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86], ciecze = [35, 80];
  R.EL_RAW.split(';').forEach((s, i) => {
    const [sym, n, m] = s.split(','); const z = i + 1;
    let kat = 't';
    if (alk.includes(z)) kat = 'a'; else if (ziem.includes(z)) kat = 'e'; else if (nie.includes(z)) kat = 'n';
    else if (hal.includes(z)) kat = 'h'; else if (szl.includes(z)) kat = 'g'; else if (pol.includes(z)) kat = 'm';
    else if (pod.includes(z)) kat = 'p'; else if (z >= 57 && z <= 71) kat = 'l'; else if (z >= 89 && z <= 103) kat = 'c';
    // położenie w układzie
    const granice = [2, 10, 18, 36, 54, 86, 118];
    let okres = granice.findIndex(g => z <= g) + 1;
    const start = okres === 1 ? 1 : granice[okres - 2] + 1;
    const idx = z - start;
    let gr, wiersz = okres, kol;
    if (okres === 1) gr = z === 1 ? 1 : 18;
    else if (okres <= 3) gr = idx < 2 ? idx + 1 : idx + 11;
    else if (okres <= 5) gr = idx + 1;
    else {
      if (idx < 2) gr = idx + 1;
      else if (idx <= 16) { gr = null; wiersz = okres === 6 ? 9 : 10; kol = idx + 2; }
      else gr = idx - 13;
    }
    if (gr) kol = gr;
    const stan = gazy.includes(z) ? 'gaz' : ciecze.includes(z) ? 'ciecz' : (z > 103 ? 'nieznany' : 'ciało stałe');
    const el = { z, sym, n, m: +m, kat, okres, gr, wiersz, kol, stan };
    R.EL.push(el); R.ELS[sym] = el;
  });
})();
R.KAT = {
  a: ['litowce (metale alkaliczne)', '#ff8f6b'], e: ['berylowce (metale ziem alkalicznych)', '#ffc66b'], t: ['metale przejściowe', '#f2d98a'],
  p: ['metale bloku p', '#a9d8b0'], m: ['półmetale', '#8fd6c9'], n: ['niemetale', '#86c5ff'], h: ['fluorowce (halogeny)', '#b7a6ff'],
  g: ['helowce (gazy szlachetne)', '#e3a6ff'], l: ['lantanowce', '#ffadc9'], c: ['aktynowce', '#ff9fb0']
};

/* ---------- masa molowa ze wzoru ---------- */
R.masa = function (f) {
  if (!f) return 0;
  f = f.split('^')[0];
  let suma = 0;
  f.split('·').forEach(cz => {
    let mn = 1; const m0 = cz.match(/^(\d+)(.*)$/);
    if (m0) { mn = +m0[1]; cz = m0[2]; }
    suma += mn * masaCzesci(cz);
  });
  return suma;
  function masaCzesci(s) {
    const stos = [0]; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === '(' || c === '[') { stos.push(0); i++; }
      else if (c === ')' || c === ']') {
        i++; let d = ''; while (i < s.length && /\d/.test(s[i])) d += s[i++];
        const v = stos.pop() * (d ? +d : 1); stos[stos.length - 1] += v;
      } else if (/[A-Z]/.test(c)) {
        let sym = c; i++; if (i < s.length && /[a-z]/.test(s[i])) sym += s[i++];
        let d = ''; while (i < s.length && /\d/.test(s[i])) d += s[i++];
        const el = R.ELS[sym]; stos[stos.length - 1] += (el ? el.m : 0) * (d ? +d : 1);
      } else i++;
    }
    return stos[0];
  }
};

/* ---------- formatowanie wzorów ---------- */
function _cz(s) { // rozbija 'SO4^2-' na treść i ładunek
  const i = s.indexOf('^'); return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)];
}
R.fmt = function (s) {
  if (!s) return '';
  const [b, q] = _cz(s); let out = '', prev = '';
  for (let i = 0; i < b.length; i++) {
    const c = b[i];
    if (/\d/.test(c) && /[A-Za-z\)\]]/.test(prev)) { let d = c; while (i + 1 < b.length && /\d/.test(b[i + 1])) d += b[++i]; out += '<sub>' + d + '</sub>'; prev = 'x'; continue; }
    out += c; prev = c;
  }
  if (q) out += '<sup>' + q.replace('-', '−') + '</sup>';
  return out;
};
const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻' };
R.uni = function (s) {
  if (!s) return '';
  const [b, q] = _cz(s); let out = '', prev = '';
  for (let i = 0; i < b.length; i++) {
    const c = b[i];
    if (/\d/.test(c) && /[A-Za-z\)\]]/.test(prev)) { let d = c; while (i + 1 < b.length && /\d/.test(b[i + 1])) d += b[++i]; out += [...d].map(x => SUB[+x]).join(''); prev = 'x'; continue; }
    out += c; prev = c;
  }
  if (q) out += [...q].map(x => SUP[x] || x).join('');
  return out;
};
// równanie: człony rozdzielone spacjami, '+', '→', współczynniki przed wzorem
R.fmtEq = function (eq) {
  if (!eq) return '';
  return eq.split(' ').map(t => {
    if (t === '+' || t === '→' || t === '⇌' || t === '=' || t === '') return t === '' ? '' : `<i class="op">${t}</i>`;
    if (/^\(.*\)$/.test(t) && !/[A-Z]/.test(t)) return `<small>${t}</small>`;
    let wsp = ''; const m = t.match(/^(\d+)(?=[A-Z\[\(])/); if (m) { wsp = m[1]; t = t.slice(wsp.length); }
    let suf = ''; const m2 = t.match(/(↓|↑)$/); if (m2) { suf = m2[1]; t = t.slice(0, -1); }
    return (wsp ? `<b class="wsp">${wsp}</b>` : '') + R.fmt(t) + (suf ? `<b class="${suf === '↓' ? 'osad' : 'gaz'}">${suf}</b>` : '');
  }).join(' ');
};
R.gcd = (a, b) => b ? R.gcd(b, a % b) : a;

/* ---------- jony ---------- */
// gen – dopełniacz kationu do nazwy soli, n – nazwa anionu, col – barwa w roztworze, k – siła barwy (na mol/dm³)
R.ION = {
  'H^+': { q: 1, gen: 'wodoru', nazwa: 'kation wodoru' },
  'Na^+': { q: 1, gen: 'sodu', plomien: 'Na' }, 'K^+': { q: 1, gen: 'potasu', plomien: 'K' }, 'Li^+': { q: 1, gen: 'litu', plomien: 'Li' },
  'NH4^+': { q: 1, gen: 'amonu' }, 'Ag^+': { q: 1, gen: 'srebra' },
  'Mg^2+': { q: 2, gen: 'magnezu' }, 'Ca^2+': { q: 2, gen: 'wapnia', plomien: 'Ca' }, 'Sr^2+': { q: 2, gen: 'strontu', plomien: 'Sr' },
  'Ba^2+': { q: 2, gen: 'baru', plomien: 'Ba' }, 'Zn^2+': { q: 2, gen: 'cynku' },
  'Cu^2+': { q: 2, gen: 'miedzi(II)', col: [70, 150, 235], k: 7, plomien: 'Cu' },
  'Fe^2+': { q: 2, gen: 'żelaza(II)', col: [165, 215, 140], k: 4 }, 'Fe^3+': { q: 3, gen: 'żelaza(III)', col: [214, 150, 40], k: 14 },
  'Pb^2+': { q: 2, gen: 'ołowiu(II)' }, 'Al^3+': { q: 3, gen: 'glinu' }, 'Mn^2+': { q: 2, gen: 'manganu(II)', col: [250, 205, 220], k: 1.5 },
  'Co^2+': { q: 2, gen: 'kobaltu(II)', col: [235, 105, 150], k: 8 },
  '[Cu(NH3)4]^2+': { q: 2, gen: 'tetraaminamiedzi(II)', col: [30, 45, 205], k: 60, nazwa: 'kation tetraaminamiedzi(II)' },
  '[Ag(NH3)2]^+': { q: 1, gen: 'diaminasrebra(I)', nazwa: 'kation diaminasrebra(I)' },
  '[Zn(NH3)4]^2+': { q: 2, gen: 'tetraaminacynku', nazwa: 'kation tetraaminacynku' },
  'FeSCN^2+': { q: 2, gen: 'tiocyjanianożelaza(III)', col: [165, 10, 22], k: 400, nazwa: 'kation tiocyjanianożelaza(III)' },
  'OH^-': { q: -1, n: 'wodorotlenek' }, 'Cl^-': { q: -1, n: 'chlorek' }, 'Br^-': { q: -1, n: 'bromek' }, 'I^-': { q: -1, n: 'jodek' },
  'NO3^-': { q: -1, n: 'azotan(V)' }, 'SO4^2-': { q: -2, n: 'siarczan(VI)' }, 'CO3^2-': { q: -2, n: 'węglan' }, 'HCO3^-': { q: -1, n: 'wodorowęglan' },
  'S^2-': { q: -2, n: 'siarczek' }, 'PO4^3-': { q: -3, n: 'fosforan(V)' }, 'CH3COO^-': { q: -1, n: 'octan' },
  'CrO4^2-': { q: -2, n: 'chromian(VI)', col: [245, 215, 25], k: 30 }, 'Cr2O7^2-': { q: -2, n: 'dichromian(VI)', col: [240, 115, 20], k: 30 },
  'MnO4^-': { q: -1, n: 'manganian(VII)', col: [150, 20, 150], k: 450 }, 'MnO4^2-': { q: -2, n: 'manganian(VI)', col: [35, 160, 75], k: 260 },
  'SCN^-': { q: -1, n: 'tiocyjanian' }, 'S2O3^2-': { q: -2, n: 'tiosiarczan' }, 'S4O6^2-': { q: -2, n: 'tetrationian' },
  'HSO3^-': { q: -1, n: 'wodorosiarczan(IV)' },
  '[Al(OH)4]^-': { q: -1, n: 'tetrahydroksoglinian' }, '[Zn(OH)4]^2-': { q: -2, n: 'tetrahydroksocynkan' }
};
for (const k in R.ION) {
  const j = R.ION[k];
  if (!j.nazwa) j.nazwa = j.q > 0 ? 'kation ' + j.gen : 'anion ' + j.n.replace(/ek$/, 'kowy').replace(/an\(/, 'anowy(').replace(/an$/, 'anowy');
}
// ładne nazwy anionów (ręcznie, bo odmiana bywa nieregularna)
const NAZWY_AN = {
  'OH^-': 'anion wodorotlenkowy', 'Cl^-': 'anion chlorkowy', 'Br^-': 'anion bromkowy', 'I^-': 'anion jodkowy', 'NO3^-': 'anion azotanowy(V)',
  'SO4^2-': 'anion siarczanowy(VI)', 'CO3^2-': 'anion węglanowy', 'HCO3^-': 'anion wodorowęglanowy', 'S^2-': 'anion siarczkowy',
  'PO4^3-': 'anion fosforanowy(V)', 'CH3COO^-': 'anion octanowy', 'CrO4^2-': 'anion chromianowy(VI)', 'Cr2O7^2-': 'anion dichromianowy(VI)',
  'MnO4^-': 'anion manganianowy(VII)', 'MnO4^2-': 'anion manganianowy(VI)', 'SCN^-': 'anion tiocyjanianowy', 'S2O3^2-': 'anion tiosiarczanowy',
  'S4O6^2-': 'anion tetrationianowy', 'HSO3^-': 'anion wodorosiarczanowy(IV)', '[Al(OH)4]^-': 'anion tetrahydroksoglinianowy',
  '[Zn(OH)4]^2-': 'anion tetrahydroksocynkanowy'
};
for (const k in NAZWY_AN) R.ION[k].nazwa = NAZWY_AN[k];

/* ---------- cząsteczki w roztworze ---------- */
R.MOL = {
  'H2O2': { n: 'nadtlenek wodoru' }, 'I2': { n: 'jod', col: [160, 85, 20], k: 180 }, 'NH3': { n: 'amoniak' },
  'CH3COOH': { n: 'kwas octowy' }, 'CO2': { n: 'tlenek węgla(IV)' }, 'C6H12O6': { n: 'glukoza' }, 'C12H22O11': { n: 'sacharoza' },
  'skrobia': { n: 'skrobia', f: '(C6H10O5)n' }, 'C2H5OH': { n: 'etanol' }, 'bialko': { n: 'białko (albumina)' },
  'biuret': { n: 'kompleks biuretowy', col: [125, 55, 175], k: 900 }, 'deterg': { n: 'detergent' },
  'CH3COOC2H5': { n: 'octan etylu (ester)' }, 'H2S': { n: 'siarkowodór' }
};

/* ---------- wskaźniki ---------- */
R.UNI_KOL = [[200, 20, 40], [225, 40, 40], [240, 80, 40], [245, 130, 40], [250, 170, 40], [245, 210, 50], [210, 220, 60], [80, 190, 70],
  [40, 170, 125], [40, 140, 175], [50, 90, 195], [75, 60, 175], [100, 50, 160], [112, 40, 140], [100, 30, 120]];
R.uniKolor = function (pH) {
  const p = Math.max(0, Math.min(14, pH)); const i = Math.min(13, Math.floor(p)); const f = p - i;
  const a = R.UNI_KOL[i], b = R.UNI_KOL[i + 1];
  return [0, 1, 2].map(j => Math.round(a[j] + (b[j] - a[j]) * f));
};
R.uniNazwa = function (pH) {
  if (pH < 2.5) return 'czerwony'; if (pH < 4.5) return 'pomarańczowy'; if (pH < 6.5) return 'żółty'; if (pH < 7.5) return 'zielony';
  if (pH < 9.5) return 'niebieskozielony'; if (pH < 11) return 'niebieski'; return 'fioletowy';
};
R.IND = {
  php: { n: 'fenoloftaleina', f: 'C20H14O4', kol(pH) { return pH < 8.2 ? null : pH < 9.4 ? ['różowy', [245, 130, 195]] : ['malinowy', [215, 20, 125]]; }, zakres: 'bezbarwna w kwasach i wodzie, malinowa w zasadach (pH > 8,2)' },
  mo: { n: 'oranż metylowy', kol(pH) { return pH < 3.1 ? ['czerwony', [220, 40, 45]] : pH < 4.4 ? ['pomarańczowy', [245, 130, 30]] : ['żółty', [245, 200, 40]]; }, zakres: 'czerwony w kwasach (pH < 3,1), żółty powyżej pH 4,4' },
  lak: { n: 'lakmus', kol(pH) { return pH < 5 ? ['czerwony', [205, 40, 60]] : pH < 8 ? ['fioletowy', [135, 70, 160]] : ['niebieski', [50, 80, 205]]; }, zakres: 'czerwony w kwasach, fioletowy w obojętnych, niebieski w zasadach' },
  uni: { n: 'wskaźnik uniwersalny', kol(pH) { return [R.uniNazwa(pH), R.uniKolor(pH)]; }, zakres: 'pełna tęcza: czerwony (pH 0) → zielony (7) → fioletowy (14)' },
  kap: {
    n: 'wywar z czerwonej kapusty', kol(pH) {
      if (pH < 3) return ['czerwony', [210, 30, 60]]; if (pH < 5) return ['różowy', [205, 75, 145]]; if (pH < 7.3) return ['fioletowy', [140, 70, 170]];
      if (pH < 8.5) return ['niebieski', [70, 90, 200]]; if (pH < 10.5) return ['niebieskozielony', [40, 155, 160]]; if (pH < 12.8) return ['zielony', [60, 170, 75]];
      return ['żółty', [225, 210, 60]];
    }, zakres: 'antocyjany: czerwony – różowy – fioletowy – niebieski – zielony – żółty'
  },
  btb: { n: 'błękit bromotymolowy', kol(pH) { return pH < 6 ? ['żółty', [235, 205, 40]] : pH < 7.6 ? ['zielony', [70, 165, 80]] : ['niebieski', [40, 85, 200]]; }, zakres: 'żółty w kwasach, zielony w obojętnych, niebieski w zasadach' }
};

/* ---------- płomienie ---------- */
R.PLOMIEN = {
  Na: { kol: [255, 190, 30], n: 'żółty (intensywny)' }, K: { kol: [185, 140, 255], n: 'fioletowy (liliowy)' }, Li: { kol: [255, 30, 80], n: 'karminowoczerwony' },
  Ca: { kol: [255, 105, 40], n: 'ceglastoczerwony' }, Sr: { kol: [255, 25, 25], n: 'krwistoczerwony' }, Ba: { kol: [185, 255, 90], n: 'żółtozielony' },
  Cu: { kol: [40, 230, 170], n: 'zielononiebieski' }
};

/* ---------- gazy ---------- */
R.GAZ = {
  H2: { n: 'wodór', opis: 'bezbarwny, bezwonny, palny, najlżejszy ze wszystkich gazów' },
  O2: { n: 'tlen', opis: 'bezbarwny, bezwonny, podtrzymuje palenie' },
  CO2: { n: 'tlenek węgla(IV)', opis: 'bezbarwny, cięższy od powietrza, gasi płomień, mąci wodę wapienną' },
  NH3: { n: 'amoniak', opis: 'bezbarwny, o ostrym, duszącym zapachu, barwi wilgotny papierek na niebiesko', kol: null },
  H2S: { n: 'siarkowodór', opis: 'bezbarwny, trujący, pachnie zgniłymi jajami' },
  NO2: { n: 'tlenek azotu(IV)', opis: 'brunatny, trujący, drażniący', kol: [170, 80, 25] },
  SO2: { n: 'tlenek siarki(IV)', opis: 'bezbarwny, duszący zapach palonej zapałki, z wodą daje kwas' },
  I2: { n: 'pary jodu', opis: 'fioletowe pary – jod sublimuje, czyli przechodzi z ciała stałego prosto w gaz', kol: [140, 60, 190] },
  HCl: { n: 'chlorowodór', opis: 'bezbarwny, drażniący, z wodą tworzy kwas solny' },
  H2O: { n: 'para wodna', opis: 'woda w stanie gazowym', kol: [240, 240, 245] }
};

/* ---------- tabela rozpuszczalności (g/100 g wody przy 0, 20, 40, 60, 80, 100 °C) ---------- */
function tab(a) { return T => { const t = Math.max(0, Math.min(100, T)) / 20; const i = Math.min(4, Math.floor(t)); const f = t - i; return a[i] + (a[i + 1] - a[i]) * f; }; }
R.tab = tab;

/* ---------- substancje stałe ---------- */
// form: krysztaly, proszek, granulki, wstazka, blaszka, opilki, kawalek, grudki, osad, klaczki, folia
R.SOLID = {
  'NaCl': { n: 'chlorek sodu', col: '#f2f5f8', form: 'krysztaly', ions: { 'Na^+': 1, 'Cl^-': 1 }, sol: tab([35.7, 35.9, 36.4, 37.1, 38, 39.2]), dH: 3.9 },
  'KCl': { n: 'chlorek potasu', col: '#f4f4f4', form: 'krysztaly', ions: { 'K^+': 1, 'Cl^-': 1 }, sol: tab([28, 34.2, 40, 45.8, 51.3, 56.3]), dH: 17.2 },
  'KNO3': { n: 'azotan(V) potasu (saletra potasowa)', col: '#f6f6f2', form: 'krysztaly', ions: { 'K^+': 1, 'NO3^-': 1 }, sol: tab([13.3, 31.6, 63.9, 110, 169, 246]), dH: 34.9 },
  'CuSO4·5H2O': { n: 'siarczan(VI) miedzi(II)–woda(1/5)', col: '#2c7de0', form: 'krysztaly', ions: { 'Cu^2+': 1, 'SO4^2-': 1 }, sol: tab([23.1, 32, 44.6, 61.8, 83.8, 114]), dH: 11.5, odw: 'CuSO4', odwT: 110, odwN: 5 },
  'CuSO4': { n: 'siarczan(VI) miedzi(II) bezwodny', col: '#eeebe2', form: 'proszek', ions: { 'Cu^2+': 1, 'SO4^2-': 1 }, hydr: 'CuSO4·5H2O', hydrN: 5, dH: -66 },
  'CoCl2·6H2O': { n: 'chlorek kobaltu(II)–woda(1/6)', col: '#d2557d', form: 'krysztaly', ions: { 'Co^2+': 1, 'Cl^-': 2 }, sol: tab([76, 90, 110, 130, 150, 170]), dH: 8, odw: 'CoCl2', odwT: 100, odwN: 6 },
  'CoCl2': { n: 'chlorek kobaltu(II) bezwodny', col: '#2e5bd6', form: 'proszek', ions: { 'Co^2+': 1, 'Cl^-': 2 }, hydr: 'CoCl2·6H2O', hydrN: 6, dH: -79 },
  'NH4Cl': { n: 'chlorek amonu (salmiak)', col: '#f7f7f7', form: 'krysztaly', ions: { 'NH4^+': 1, 'Cl^-': 1 }, sol: tab([29.4, 37.2, 45.8, 55.3, 65.6, 77.3]), dH: 14.8 },
  'NH4NO3': { n: 'azotan(V) amonu (saletra amonowa)', col: '#f8f8f4', form: 'krysztaly', ions: { 'NH4^+': 1, 'NO3^-': 1 }, sol: tab([118, 192, 297, 421, 580, 871]), dH: 25.7 },
  'NaOH': { n: 'wodorotlenek sodu', col: '#f5f5f0', form: 'granulki', ions: { 'Na^+': 1, 'OH^-': 1 }, sol: tab([42, 109, 129, 174, 313, 347]), dH: -44.5 },
  'CaCl2': { n: 'chlorek wapnia', col: '#f7f7f7', form: 'grudki', ions: { 'Ca^2+': 1, 'Cl^-': 2 }, sol: tab([59.5, 74.5, 128, 137, 147, 159]), dH: -82 },
  'KMnO4': { n: 'manganian(VII) potasu (nadmanganian)', col: '#3a0d47', form: 'krysztaly', ions: { 'K^+': 1, 'MnO4^-': 1 }, sol: tab([2.8, 6.4, 12.6, 22, 32, 45]), dH: 43.6 },
  'NaHCO3': { n: 'wodorowęglan sodu (soda oczyszczona)', col: '#fbfbfb', form: 'proszek', ions: { 'Na^+': 1, 'HCO3^-': 1 }, sol: tab([6.9, 9.6, 12.7, 16.4, 19, 23.6]), dH: 18.7 },
  'Na2CO3': { n: 'węglan sodu (soda)', col: '#fbfbfb', form: 'proszek', ions: { 'Na^+': 2, 'CO3^2-': 1 }, sol: tab([7, 21.5, 48.8, 46.4, 45.1, 44.7]), dH: -26.7 },
  'KI': { n: 'jodek potasu', col: '#f8f8f8', form: 'krysztaly', ions: { 'K^+': 1, 'I^-': 1 }, sol: tab([128, 144, 162, 176, 192, 206]), dH: 20.3 },
  'K2MnO4': { n: 'manganian(VI) potasu', col: '#1f4f2c', form: 'proszek', ions: { 'K^+': 2, 'MnO4^2-': 1 }, sol: tab([20, 30, 40, 50, 60, 70]), dH: 5 },
  'C12H22O11': { n: 'sacharoza (cukier)', col: '#fdfdfd', form: 'krysztaly', mol: 'C12H22O11', sol: tab([179, 200, 238, 287, 362, 487]), dH: 5.4 },
  'C6H12O6': { n: 'glukoza', col: '#fdfdfd', form: 'proszek', mol: 'C6H12O6', sol: tab([54, 91, 162, 240, 300, 350]), dH: 11 },
  'skrobia': { n: 'skrobia (mąka ziemniaczana)', f: 'C6H10O5', col: '#fbfaf4', form: 'proszek', mol: 'skrobia', sol: T => T > 60 ? 40 : 3, dH: 0 },
  'I2': { n: 'jod', col: '#3d2c4f', form: 'krysztaly', mol: 'I2', dH: 0 },
  'CaCO3m': { n: 'węglan wapnia (marmur)', f: 'CaCO3', col: '#efede6', form: 'grudki' },
  'MnO2': { n: 'tlenek manganu(IV) (braunsztyn)', col: '#2a2320', form: 'proszek' },
  'CuO': { n: 'tlenek miedzi(II)', col: '#1d1b1b', form: 'proszek' },
  'Cu2O': { n: 'tlenek miedzi(I)', col: '#b8452b', form: 'osad', tex: 'kr' },
  'MgO': { n: 'tlenek magnezu', col: '#f8f8f8', form: 'proszek' },
  'CaO': { n: 'tlenek wapnia (wapno palone)', col: '#f3f1ea', form: 'grudki' },
  'Na2O': { n: 'tlenek sodu', col: '#f4f1e6', form: 'proszek' }, 'Li2O': { n: 'tlenek litu', col: '#f6f6f6', form: 'proszek' },
  'K2O': { n: 'tlenek potasu', col: '#f4f1e6', form: 'proszek' },
  'Fe2O3': { n: 'tlenek żelaza(III) (rdza)', col: '#9a3d1f', form: 'proszek' },
  'Fe3O4': { n: 'tlenek żelaza(II,III) (zgorzelina)', col: '#2d2b2a', form: 'proszek' },
  'Na': { n: 'sód', col: '#cfd4da', form: 'kawalek', metal: 'Na' }, 'K': { n: 'potas', col: '#d4d6dc', form: 'kawalek', metal: 'K' },
  'Li': { n: 'lit', col: '#c9ccd0', form: 'kawalek', metal: 'Li' }, 'Ca': { n: 'wapń', col: '#d9d8cd', form: 'granulki', metal: 'Ca' },
  'Mg': { n: 'magnez (wstążka)', col: '#c9cdd3', form: 'wstazka', metal: 'Mg' }, 'Al': { n: 'glin (folia)', col: '#d8dce1', form: 'folia', metal: 'Al' },
  'Zn': { n: 'cynk (granulki)', col: '#a7afb8', form: 'granulki', metal: 'Zn' }, 'Fe': { n: 'żelazo (opiłki)', col: '#6a6d72', form: 'opilki', metal: 'Fe' },
  'Cu': { n: 'miedź', col: '#c9743d', form: 'blaszka', metal: 'Cu' }, 'Ag': { n: 'srebro', col: '#dfe3e8', form: 'nalot', metal: 'Ag' },
  'Pb': { n: 'ołów', col: '#7c8590', form: 'nalot', metal: 'Pb' },
  'S': { n: 'siarka', col: '#f2d43a', form: 'proszek' }, 'C': { n: 'węgiel drzewny', col: '#1e1e1e', form: 'grudki' },
  'FeS': { n: 'siarczek żelaza(II)', col: '#262524', form: 'grudki' },
  'Cwaz': { n: 'porowaty węgiel („wąż faraona”)', f: 'C', col: '#111111', form: 'waz' },
  'karmel': { n: 'karmel', f: 'C12H18O9', col: '#8b4a12', form: 'proszek' },
  'Skol': { n: 'siarka koloidalna', f: 'S', col: '#f3eec4', form: 'osad', tex: 'kol' },
  'bialkoS': { n: 'ścięte białko', f: 'C100H160N26O32S', col: '#f8f6ef', form: 'klaczki', tex: 'kl' },
  'bialkoN': { n: 'białko po reakcji ksantoproteinowej', f: 'C100H160N26O32S', col: '#f0c43c', form: 'klaczki', tex: 'kl' },
  'ziemniak': { n: 'kawałek surowego ziemniaka', f: 'C6H10O5', col: '#efe0ae', form: 'kawalek' },
  'Aglustro': { n: 'lustro srebrne', f: 'Ag', col: '#e6eaee', form: 'lustro' },
  'MnO2kol': { n: 'tlenek manganu(IV) (zawiesina)', f: 'MnO2', col: '#8a4a1c', form: 'osad', tex: 'kol' }
};

/* ---------- strącanie: [kation, anion, barwa, opis, tekstura, maxC(T) w mol/dm³] ---------- */
// tex: gal – galaretowaty, ser – serowaty, drob – drobnokrystaliczny, kr – krystaliczny
R.PRECIP = [
  ['Ag^+', 'S^2-', '#141414', 'czarny', 'drob'], ['Cu^2+', 'S^2-', '#1a1a1a', 'czarny', 'drob'], ['Pb^2+', 'S^2-', '#212121', 'czarny', 'drob'],
  ['Fe^2+', 'S^2-', '#262626', 'czarny', 'drob'], ['Zn^2+', 'S^2-', '#f3f3ec', 'biały', 'drob'],
  ['Fe^3+', 'OH^-', '#a4531f', 'rdzawobrunatny, galaretowaty', 'gal'], ['Al^3+', 'OH^-', '#eef2f6', 'biały, galaretowaty', 'gal'],
  ['Cu^2+', 'OH^-', '#3d98e6', 'niebieski, galaretowaty', 'gal'],
  ['Ag^+', 'I^-', '#efdc66', 'żółty, serowaty', 'ser'], ['Ag^+', 'Br^-', '#ede2a6', 'jasnożółty (kremowy), serowaty', 'ser'],
  ['Pb^2+', 'CrO4^2-', '#f6c300', 'żółty', 'drob'], ['Ba^2+', 'SO4^2-', '#fbfbfb', 'biały, drobnokrystaliczny', 'drob'],
  ['Ag^+', 'Cl^-', '#f6f6f4', 'biały, serowaty', 'ser'], ['Ag^+', 'SCN^-', '#f4f4f0', 'biały', 'ser'],
  ['Fe^2+', 'OH^-', '#6c8e4b', 'brudnozielony, galaretowaty', 'gal'], ['Zn^2+', 'OH^-', '#f2f3f3', 'biały, galaretowaty', 'gal'],
  ['Pb^2+', 'OH^-', '#efefef', 'biały', 'gal'], ['Ag^+', 'OH^-', '#5a3c22', 'brunatny', 'drob'],
  ['Co^2+', 'OH^-', '#c98aa6', 'różowy', 'gal'], ['Mn^2+', 'OH^-', '#e6d2bb', 'beżowy', 'gal'],
  ['Mg^2+', 'OH^-', '#f4f4f4', 'biały, galaretowaty', 'gal', () => 0.00017],
  ['Ag^+', 'CrO4^2-', '#a52b13', 'ceglastoczerwony', 'kr'], ['Ba^2+', 'CrO4^2-', '#f1d31e', 'żółty', 'drob'],
  ['Ag^+', 'PO4^3-', '#efcf3e', 'żółty', 'drob'], ['Ca^2+', 'PO4^3-', '#f8f8f8', 'biały', 'drob'], ['Ba^2+', 'PO4^3-', '#f8f8f8', 'biały', 'drob'],
  ['Mg^2+', 'PO4^3-', '#f8f8f8', 'biały', 'drob'], ['Al^3+', 'PO4^3-', '#f5f6f8', 'biały', 'gal'], ['Fe^3+', 'PO4^3-', '#efe4b5', 'bladożółty', 'drob'],
  ['Cu^2+', 'PO4^3-', '#5aa6d8', 'niebieski', 'drob'], ['Zn^2+', 'PO4^3-', '#f8f8f8', 'biały', 'drob'], ['Pb^2+', 'PO4^3-', '#f8f8f8', 'biały', 'drob'],
  ['Ag^+', 'CO3^2-', '#eee7bf', 'jasnożółty', 'drob'], ['Pb^2+', 'CO3^2-', '#f8f8f8', 'biały', 'drob'], ['Ba^2+', 'CO3^2-', '#fafafa', 'biały', 'drob'],
  ['Ca^2+', 'CO3^2-', '#fafafa', 'biały', 'drob'], ['Zn^2+', 'CO3^2-', '#f8f8f8', 'biały', 'drob'], ['Cu^2+', 'CO3^2-', '#3fb39b', 'niebieskozielony', 'drob'],
  ['Fe^2+', 'CO3^2-', '#cdd8bb', 'zielonkawobiały', 'drob'], ['Mn^2+', 'CO3^2-', '#f3e4da', 'bladoróżowy', 'drob'],
  ['Mg^2+', 'CO3^2-', '#f8f8f8', 'biały', 'drob', () => 0.01], ['Sr^2+', 'CO3^2-', '#fafafa', 'biały', 'drob'],
  ['Pb^2+', 'I^-', '#ffd21a', 'złocistożółty', 'kr', T => 0.0016 * Math.exp((T - 20) / 32)],
  ['Pb^2+', 'SO4^2-', '#f8f8f8', 'biały', 'drob', () => 0.0001],
  ['Pb^2+', 'Cl^-', '#f7f7f7', 'biały, igiełkowaty', 'kr', T => 0.035 * Math.exp((T - 20) / 65)],
  ['Pb^2+', 'Br^-', '#f7f7f7', 'biały', 'kr', () => 0.026],
  ['Sr^2+', 'SO4^2-', '#f8f8f8', 'biały', 'drob', () => 0.0006],
  ['Ca^2+', 'SO4^2-', '#f8f8f8', 'biały', 'kr', () => 0.015],
  ['Ag^+', 'SO4^2-', '#f8f8f8', 'biały', 'kr', () => 0.026],
  ['Ca^2+', 'OH^-', '#f7f7f7', 'biały (mleko wapienne)', 'gal', T => 0.021 * Math.exp(-(T - 20) / 90)]
];

/* ---------- nazwy i wzory soli ---------- */
R.wzorSoli = function (kat, an) {
  if (kat === 'Ag^+' && an === 'OH^-') return { f: 'Ag2O', nk: 2, na: 2 };
  const q1 = R.ION[kat].q, q2 = -R.ION[an].q, g = R.gcd(q1, q2);
  const nk = q2 / g, na = q1 / g; // liczba kationów, anionów
  const kb = _cz(kat)[0], ab = _cz(an)[0];
  const zloz = s => (s.match(/[A-Z]/g) || []).length > 1 || /\d/.test(s);
  const czK = nk > 1 ? (zloz(kb) ? '(' + kb + ')' + nk : kb + nk) : kb;
  const czA = na > 1 ? (zloz(ab) ? '(' + ab + ')' + na : ab + na) : ab;
  return { f: czK + czA, nk, na };
};
R.nazwaSoli = function (kat, an) {
  if (kat === 'Ag^+' && an === 'OH^-') return 'tlenek srebra(I)';
  if (kat === 'H^+') return { 'Cl^-': 'chlorowodór', 'NO3^-': 'kwas azotowy(V)', 'SO4^2-': 'kwas siarkowy(VI)' }[an] || 'kwas';
  return R.ION[an].n + ' ' + R.ION[kat].gen;
};
// rejestruje sól w R.SOLID (jeśli jej nie ma) i zwraca klucz
R.KOLOR_KAT = { 'Cu^2+': '#3a86d8', 'Fe^3+': '#c68a2a', 'Fe^2+': '#a9cf96', 'Co^2+': '#cf5a83', 'Mn^2+': '#f2d3dc', '[Cu(NH3)4]^2+': '#2b3fc0' };
R.KOLOR_AN = { 'MnO4^-': '#3a0d47', 'MnO4^2-': '#1f4f2c', 'CrO4^2-': '#f0cf20', 'Cr2O7^2-': '#ec7a1a' };
R.sol = function (kat, an, osad) {
  const w = R.wzorSoli(kat, an);
  let key = w.f;
  if (key === 'CuSO4' && !osad) key = 'CuSO4·5H2O';
  if (key === 'CoCl2' && !osad) key = 'CoCl2·6H2O';
  const p = R.PRECIP.find(p => p[0] === kat && p[1] === an);
  if (R.SOLID[key] && p && !R.SOLID[key].opis) { R.SOLID[key].opis = p[3]; R.SOLID[key].kat = kat; R.SOLID[key].an = an; }
  if (!R.SOLID[key]) {
    const ions = {}; ions[kat] = w.nk; ions[an] = w.na;
    if (w.f === 'Ag2O') { delete ions['OH^-']; ions['Ag^+'] = 2; }
    R.SOLID[key] = {
      n: R.nazwaSoli(kat, an), col: p ? p[2] : (R.KOLOR_AN[an] || R.KOLOR_KAT[kat] || '#f5f5f2'), form: p ? 'osad' : 'krysztaly',
      ions, tex: p ? p[4] : 'kr', opis: p ? p[3] : null, sol: p ? null : tab([40, 50, 60, 70, 80, 90]), dH: 0, dyn: true, kat, an
    };
  }
  return key;
};
// masa molowa wszystkich zdefiniowanych substancji stałych
R.M = function (key) {
  const s = R.SOLID[key]; if (!s) return 100;
  if (s.M) return s.M;
  s.M = R.masa(s.f || key) || 100; return s.M;
};

/* ---------- typy naczyń ---------- */
R.VT = {
  zlewka: { n: 'Zlewka 250 cm³', kr: 'Zlewka', cap: 250, glass: 90, P: 700, h: 0.9, maxT: 400 },
  kolba: { n: 'Kolba stożkowa 250 cm³', kr: 'Kolba', cap: 250, glass: 100, P: 650, h: 0.8, maxT: 400 },
  probowka: { n: 'Probówka 25 cm³', kr: 'Probówka', cap: 25, glass: 14, P: 230, h: 0.25, maxT: 600 },
  tygiel: { n: 'Tygiel porcelanowy', kr: 'Tygiel', cap: 15, glass: 50, P: 600, h: 0.15, maxT: 950, otwarty: true }
};

/* ---------- odczynniki na półce ---------- */
// kind: r – roztwór wodny, s – ciało stałe, m – metal, w – wskaźnik, o – olej, e – etanol, k – stężony kwas
// haz: zraca, tox, utl, palny, srod, szk, zdr
R.KATEGORIE = [
  ['wszystko', 'Wszystko'], ['kwasy', 'Kwasy'], ['zasady', 'Zasady'], ['sole', 'Sole'], ['metale', 'Metale'], ['tlenki', 'Tlenki i niemetale'],
  ['wskazniki', 'Wskaźniki'], ['organiczne', 'Organiczne'], ['inne', 'Woda i inne']
];
R.REAG = [
  // woda i inne
  { id: 'woda', n: 'Woda destylowana', f: 'H2O', cat: 'inne', kind: 'r', c: 0, sp: {}, col: '#cfe8ff', opis: 'Czysta woda bez rozpuszczonych soli. Rozpuszczalnik do wszystkiego.' },
  { id: 'h2o2', n: 'Woda utleniona 3%', f: 'H2O2', cat: 'inne', kind: 'r', c: 0.88, sp: { 'H2O2': 1 }, col: '#e8f4ff', haz: ['szk'], opis: 'Roztwór nadtlenku wodoru z apteczki. Sam rozkłada się bardzo powoli na wodę i tlen.' },
  { id: 'h2o2c', n: 'Perhydrol 30%', f: 'H2O2', cat: 'inne', kind: 'r', c: 9.8, sp: { 'H2O2': 1 }, col: '#e8f4ff', haz: ['zraca', 'utl'], opis: 'Stężony nadtlenek wodoru. Silny utleniacz, parzy skórę. Z katalizatorem rozkłada się gwałtownie.' },
  { id: 'wodaw', n: 'Woda wapienna', f: 'Ca(OH)2', cat: 'zasady', kind: 'r', c: 0.02, sp: { 'Ca^2+': 1, 'OH^-': 2 }, col: '#f2f6f8', haz: ['szk'], opis: 'Klarowny, nasycony roztwór wodorotlenku wapnia. Mętnieje pod wpływem CO₂ – tak wykrywa się ten gaz.' },
  { id: 'deterg', n: 'Płyn do mycia naczyń', f: '', cat: 'inne', kind: 'r', c: 1, sp: { 'deterg': 1 }, col: '#9be37a', opis: 'Detergent. Zmniejsza napięcie powierzchniowe, łączy olej z wodą (emulsja) i robi pianę.' },
  { id: 'olej', n: 'Olej roślinny', f: '', cat: 'organiczne', kind: 'o', col: '#f2d35b', opis: 'Tłuszcz ciekły. Nie miesza się z wodą i ma mniejszą gęstość, więc pływa na wierzchu.' },
  { id: 'etanol', n: 'Etanol 96%', f: 'C2H5OH', cat: 'organiczne', kind: 'e', col: '#f4f7ff', haz: ['palny'], opis: 'Alkohol etylowy. Miesza się z wodą w każdym stosunku, pali się niebieskim płomieniem.' },
  // kwasy
  { id: 'hcl', n: 'Kwas chlorowodorowy (solny)', f: 'HCl', cat: 'kwasy', kind: 'r', c: 1, sp: { 'H^+': 1, 'Cl^-': 1 }, col: '#fff3f0', haz: ['zraca'], stez: '1 mol/dm³', opis: 'Mocny kwas: w wodzie całkowicie rozpada się na jony H⁺ i Cl⁻. Taki kwas jest też w żołądku.' },
  { id: 'h2so4', n: 'Kwas siarkowy(VI) rozcieńczony', f: 'H2SO4', cat: 'kwasy', kind: 'r', c: 0.5, sp: { 'H^+': 2, 'SO4^2-': 1 }, col: '#fff3f0', haz: ['zraca'], stez: '0,5 mol/dm³', opis: 'Mocny kwas dwuprotonowy: z jednej cząsteczki powstają dwa kationy H⁺.' },
  { id: 'h2so4c', n: 'Kwas siarkowy(VI) stężony 98%', f: 'H2SO4', cat: 'kwasy', kind: 'k', c: 18.4, sp: { 'H^+': 2, 'SO4^2-': 1 }, col: '#fffbe8', haz: ['zraca'], stez: '18,4 mol/dm³', opis: 'Gęsta, oleista ciecz. Silnie odwadnia (zwęgla cukier) i gwałtownie grzeje się z wodą. Zawsze wlewaj KWAS DO WODY, nigdy odwrotnie!' },
  { id: 'hno3', n: 'Kwas azotowy(V)', f: 'HNO3', cat: 'kwasy', kind: 'r', c: 2, sp: { 'H^+': 1, 'NO3^-': 1 }, col: '#fffbe8', haz: ['zraca', 'utl'], stez: '2 mol/dm³', opis: 'Mocny kwas i jednocześnie utleniacz – roztwarza nawet miedź. Barwi białko na żółto.' },
  { id: 'ocet', n: 'Kwas octowy (ocet)', f: 'CH3COOH', cat: 'kwasy', kind: 'r', c: 1, sp: { 'CH3COOH': 1 }, col: '#fffaf0', haz: ['szk'], stez: '1 mol/dm³', opis: 'Kwas etanowy – słaby kwas: tylko niewielka część cząsteczek oddaje jon H⁺. Pachnie octem.' },
  // zasady
  { id: 'naoh', n: 'Wodorotlenek sodu (roztwór)', f: 'NaOH', cat: 'zasady', kind: 'r', c: 1, sp: { 'Na^+': 1, 'OH^-': 1 }, col: '#f0f4ff', haz: ['zraca'], stez: '1 mol/dm³', opis: 'Mocna zasada (ług sodowy). Jest śliska w dotyku, bo rozkłada tłuszcze skóry. Barwi fenoloftaleinę na malinowo.' },
  { id: 'naohs', n: 'Wodorotlenek sodu (granulki)', f: 'NaOH', cat: 'zasady', kind: 's', s: 'NaOH', col: '#f5f5f0', haz: ['zraca'], opis: 'Stały NaOH. Pochłania wilgoć z powietrza, a rozpuszczając się w wodzie, mocno ją ogrzewa.' },
  { id: 'nh3', n: 'Woda amoniakalna', f: 'NH3', cat: 'zasady', kind: 'r', c: 2, sp: { 'NH3': 1 }, col: '#f2f6ff', haz: ['zraca', 'srod'], stez: '2 mol/dm³', opis: 'Roztwór amoniaku w wodzie. Słaba zasada o ostrym zapachu. Tworzy z jonami miedzi piękny, ciemnoniebieski kompleks.' },
  // sole
  { id: 'nacls', n: 'Sól kuchenna', f: 'NaCl', cat: 'sole', kind: 's', s: 'NaCl', col: '#ffffff', opis: 'Chlorek sodu – białe kryształki. W 100 g wody rozpuści się ok. 36 g.' },
  { id: 'nacl', n: 'Chlorek sodu (roztwór)', f: 'NaCl', cat: 'sole', kind: 'r', c: 0.5, sp: { 'Na^+': 1, 'Cl^-': 1 }, col: '#f4f8ff', stez: '0,5 mol/dm³', opis: 'Roztwór soli kuchennej. Zawiera jony Na⁺ i Cl⁻.' },
  { id: 'kcl', n: 'Chlorek potasu', f: 'KCl', cat: 'sole', kind: 'r', c: 0.5, sp: { 'K^+': 1, 'Cl^-': 1 }, col: '#f4f8ff', stez: '0,5 mol/dm³', opis: 'Sól potasowa – barwi płomień na fioletowo.' },
  { id: 'licl', n: 'Chlorek litu', f: 'LiCl', cat: 'sole', kind: 'r', c: 0.5, sp: { 'Li^+': 1, 'Cl^-': 1 }, col: '#f4f8ff', haz: ['szk'], stez: '0,5 mol/dm³', opis: 'Sól litu – barwi płomień na karminowoczerwono.' },
  { id: 'cacl2', n: 'Chlorek wapnia (roztwór)', f: 'CaCl2', cat: 'sole', kind: 'r', c: 0.5, sp: { 'Ca^2+': 1, 'Cl^-': 2 }, col: '#f4f8ff', haz: ['szk'], stez: '0,5 mol/dm³', opis: 'Źródło jonów Ca²⁺. Barwi płomień na ceglastoczerwono.' },
  { id: 'cacl2s', n: 'Chlorek wapnia (stały)', f: 'CaCl2', cat: 'sole', kind: 's', s: 'CaCl2', col: '#ffffff', haz: ['szk'], opis: 'Bezwodny CaCl₂ – rozpuszczając się, mocno grzeje (używa się go w ogrzewaczach do rąk).' },
  { id: 'srcl2', n: 'Chlorek strontu', f: 'SrCl2', cat: 'sole', kind: 'r', c: 0.5, sp: { 'Sr^2+': 1, 'Cl^-': 2 }, col: '#f4f8ff', haz: ['szk'], stez: '0,5 mol/dm³', opis: 'Sól strontu – czerwone ognie sztuczne zawdzięczają barwę właśnie jemu.' },
  { id: 'bacl2', n: 'Chlorek baru', f: 'BaCl2', cat: 'sole', kind: 'r', c: 0.25, sp: { 'Ba^2+': 1, 'Cl^-': 2 }, col: '#f4f8ff', haz: ['tox'], stez: '0,25 mol/dm³', opis: 'Trujący! Odczynnik na jony siarczanowe(VI): daje biały osad BaSO₄. Barwi płomień na żółtozielono.' },
  { id: 'agno3', n: 'Azotan(V) srebra', f: 'AgNO3', cat: 'sole', kind: 'r', c: 0.1, sp: { 'Ag^+': 1, 'NO3^-': 1 }, col: '#f8f8f8', haz: ['zraca', 'srod'], stez: '0,1 mol/dm³', opis: 'Lapis. Odczynnik na jony chlorkowe, bromkowe i jodkowe – z każdym daje osad innej barwy. Brudzi skórę na czarno.' },
  { id: 'cuso4', n: 'Siarczan(VI) miedzi(II) (roztwór)', f: 'CuSO4', cat: 'sole', kind: 'r', c: 0.5, sp: { 'Cu^2+': 1, 'SO4^2-': 1 }, col: '#4b9be8', haz: ['szk', 'srod'], stez: '0,5 mol/dm³', opis: 'Niebieski roztwór – barwę daje uwodniony kation Cu²⁺.' },
  { id: 'cuso4s', n: 'Siarczan(VI) miedzi(II) – kryształy', f: 'CuSO4·5H2O', cat: 'sole', kind: 's', s: 'CuSO4·5H2O', col: '#2c7de0', haz: ['szk', 'srod'], opis: 'Niebieskie kryształy hydratu (sól z wodą krystalizacyjną). Po ogrzaniu tracą wodę i bieleją.' },
  { id: 'cuso4b', n: 'Siarczan(VI) miedzi(II) bezwodny', f: 'CuSO4', cat: 'sole', kind: 's', s: 'CuSO4', col: '#eeebe2', haz: ['szk', 'srod'], opis: 'Biały proszek. Z odrobiną wody natychmiast niebieszczeje – to test na obecność wody.' },
  { id: 'cocl2', n: 'Chlorek kobaltu(II) – kryształy', f: 'CoCl2·6H2O', cat: 'sole', kind: 's', s: 'CoCl2·6H2O', col: '#d2557d', haz: ['tox', 'zdr'], opis: 'Różowy hydrat. Po wysuszeniu niebieszczeje – stąd papierki wykrywające wilgoć.' },
  { id: 'fecl3', n: 'Chlorek żelaza(III)', f: 'FeCl3', cat: 'sole', kind: 'r', c: 0.5, sp: { 'Fe^3+': 1, 'Cl^-': 3 }, col: '#d9a23a', haz: ['zraca'], stez: '0,5 mol/dm³', opis: 'Żółtobrunatny roztwór. Z rodankiem daje krwistoczerwone zabarwienie.' },
  { id: 'feso4', n: 'Siarczan(VI) żelaza(II)', f: 'FeSO4', cat: 'sole', kind: 'r', c: 0.5, sp: { 'Fe^2+': 1, 'SO4^2-': 1 }, col: '#c6e2b5', haz: ['szk'], stez: '0,5 mol/dm³', opis: 'Bladozielony roztwór. Jony Fe²⁺ łatwo utleniają się do Fe³⁺.' },
  { id: 'alcl3', n: 'Chlorek glinu', f: 'AlCl3', cat: 'sole', kind: 'r', c: 0.5, sp: { 'Al^3+': 1, 'Cl^-': 3 }, col: '#f4f8ff', haz: ['zraca'], stez: '0,5 mol/dm³', opis: 'Źródło jonów Al³⁺. Ich wodorotlenek jest amfoteryczny.' },
  { id: 'znso4', n: 'Siarczan(VI) cynku', f: 'ZnSO4', cat: 'sole', kind: 'r', c: 0.5, sp: { 'Zn^2+': 1, 'SO4^2-': 1 }, col: '#f4f8ff', haz: ['szk', 'srod'], stez: '0,5 mol/dm³', opis: 'Bezbarwny roztwór jonów Zn²⁺.' },
  { id: 'mgso4', n: 'Siarczan(VI) magnezu', f: 'MgSO4', cat: 'sole', kind: 'r', c: 0.5, sp: { 'Mg^2+': 1, 'SO4^2-': 1 }, col: '#f4f8ff', stez: '0,5 mol/dm³', opis: 'Sól gorzka (sól Epsom). Bezbarwny roztwór jonów Mg²⁺.' },
  { id: 'pbno3', n: 'Azotan(V) ołowiu(II)', f: 'Pb(NO3)2', cat: 'sole', kind: 'r', c: 0.25, sp: { 'Pb^2+': 1, 'NO3^-': 2 }, col: '#f8f8f8', haz: ['tox', 'zdr', 'srod'], stez: '0,25 mol/dm³', opis: 'Trujący związek ołowiu – w szkole tylko pod okiem nauczyciela. Z jodkami daje złoty osad.' },
  { id: 'ki', n: 'Jodek potasu', f: 'KI', cat: 'sole', kind: 'r', c: 0.5, sp: { 'K^+': 1, 'I^-': 1 }, col: '#f8f8f8', stez: '0,5 mol/dm³', opis: 'Źródło jonów jodkowych. Katalizuje rozkład nadtlenku wodoru.' },
  { id: 'kbr', n: 'Bromek potasu', f: 'KBr', cat: 'sole', kind: 'r', c: 0.5, sp: { 'K^+': 1, 'Br^-': 1 }, col: '#f8f8f8', stez: '0,5 mol/dm³', opis: 'Źródło jonów bromkowych.' },
  { id: 'na2co3', n: 'Węglan sodu (soda)', f: 'Na2CO3', cat: 'sole', kind: 'r', c: 0.5, sp: { 'Na^+': 2, 'CO3^2-': 1 }, col: '#f4f8ff', haz: ['szk'], stez: '0,5 mol/dm³', opis: 'Roztwór ma odczyn zasadowy (hydroliza). Z kwasami burzy się, wydzielając CO₂.' },
  { id: 'nahco3', n: 'Soda oczyszczona', f: 'NaHCO3', cat: 'sole', kind: 's', s: 'NaHCO3', col: '#ffffff', opis: 'Wodorowęglan sodu – proszek do pieczenia i domowy „wulkan” z octem.' },
  { id: 'na2so4', n: 'Siarczan(VI) sodu', f: 'Na2SO4', cat: 'sole', kind: 'r', c: 0.5, sp: { 'Na^+': 2, 'SO4^2-': 1 }, col: '#f4f8ff', stez: '0,5 mol/dm³', opis: 'Sól glauberska. Źródło jonów siarczanowych(VI).' },
  { id: 'na2s', n: 'Siarczek sodu', f: 'Na2S', cat: 'sole', kind: 'r', c: 0.5, sp: { 'Na^+': 2, 'S^2-': 1 }, col: '#fbf8e8', haz: ['zraca', 'tox', 'srod'], stez: '0,5 mol/dm³', opis: 'Z jonami metali ciężkich daje czarne osady siarczków. Z kwasem uwalnia trujący H₂S.' },
  { id: 'na3po4', n: 'Fosforan(V) sodu', f: 'Na3PO4', cat: 'sole', kind: 'r', c: 0.25, sp: { 'Na^+': 3, 'PO4^3-': 1 }, col: '#f4f8ff', haz: ['szk'], stez: '0,25 mol/dm³', opis: 'Źródło jonów fosforanowych(V). Z jonami srebra daje żółty osad.' },
  { id: 'kscn', n: 'Tiocyjanian potasu (rodanek)', f: 'KSCN', cat: 'sole', kind: 'r', c: 0.5, sp: { 'K^+': 1, 'SCN^-': 1 }, col: '#f8f8f8', haz: ['szk'], stez: '0,5 mol/dm³', opis: 'Czuły odczynnik na jony Fe³⁺ – daje „krwawe” zabarwienie.' },
  { id: 'k2cro4', n: 'Chromian(VI) potasu', f: 'K2CrO4', cat: 'sole', kind: 'r', c: 0.25, sp: { 'K^+': 2, 'CrO4^2-': 1 }, col: '#f3d21d', haz: ['tox', 'zdr', 'srod'], stez: '0,25 mol/dm³', opis: 'Żółty roztwór. W kwasie zmienia się w pomarańczowy dichromian. Rakotwórczy – tylko wirtualnie!' },
  { id: 'kmno4', n: 'Manganian(VII) potasu (roztwór)', f: 'KMnO4', cat: 'sole', kind: 'r', c: 0.02, sp: { 'K^+': 1, 'MnO4^-': 1 }, col: '#8e1a8e', haz: ['utl', 'srod'], stez: '0,02 mol/dm³', opis: 'Fioletowy roztwór silnego utleniacza. Odbarwia się, gdy coś go zredukuje.' },
  { id: 'kmno4s', n: 'Manganian(VII) potasu – kryształy', f: 'KMnO4', cat: 'sole', kind: 's', s: 'KMnO4', col: '#3a0d47', haz: ['utl', 'szk', 'srod'], opis: 'Ciemnofioletowe kryształki. Po ogrzaniu rozkładają się, wydzielając tlen.' },
  { id: 'na2s2o3', n: 'Tiosiarczan sodu', f: 'Na2S2O3', cat: 'sole', kind: 'r', c: 0.2, sp: { 'Na^+': 2, 'S2O3^2-': 1 }, col: '#f8f8f8', stez: '0,2 mol/dm³', opis: 'Utrwalacz fotograficzny. W kwasie powoli wytrąca się z niego siarka, a jod zamienia z powrotem w jodki.' },
  { id: 'nh4cl', n: 'Chlorek amonu', f: 'NH4Cl', cat: 'sole', kind: 's', s: 'NH4Cl', col: '#ffffff', haz: ['szk'], opis: 'Salmiak. Z zasadą uwalnia amoniak, a ogrzany rozkłada się na NH₃ i HCl.' },
  { id: 'nh4no3', n: 'Azotan(V) amonu', f: 'NH4NO3', cat: 'sole', kind: 's', s: 'NH4NO3', col: '#ffffff', haz: ['utl'], opis: 'Nawóz. Rozpuszczając się, pochłania ciepło – woda robi się lodowata (okłady chłodzące).' },
  { id: 'kno3', n: 'Saletra potasowa', f: 'KNO3', cat: 'sole', kind: 's', s: 'KNO3', col: '#ffffff', haz: ['utl'], opis: 'Azotan(V) potasu. Jego rozpuszczalność bardzo silnie rośnie z temperaturą.' },
  { id: 'caco3', n: 'Węglan wapnia (marmur)', f: 'CaCO3', cat: 'sole', kind: 's', s: 'CaCO3m', col: '#efede6', opis: 'Kreda, marmur, wapień, skorupki jaj. Nie rozpuszcza się w wodzie, ale burzy w kwasach.' },
  // metale
  { id: 'na', n: 'Sód', f: 'Na', cat: 'metale', kind: 'm', s: 'Na', col: '#cfd4da', haz: ['palny', 'zraca'], opis: 'Miękki metal (kroi się nożem), przechowywany pod olejem, bo gwałtownie reaguje z wodą.' },
  { id: 'k', n: 'Potas', f: 'K', cat: 'metale', kind: 'm', s: 'K', col: '#d4d6dc', haz: ['palny', 'zraca'], opis: 'Jeszcze aktywniejszy od sodu – na wodzie zapala się fioletowym płomieniem.' },
  { id: 'li', n: 'Lit', f: 'Li', cat: 'metale', kind: 'm', s: 'Li', col: '#c9ccd0', haz: ['palny', 'zraca'], opis: 'Najlżejszy metal. Z wodą reaguje spokojniej niż sód.' },
  { id: 'ca', n: 'Wapń', f: 'Ca', cat: 'metale', kind: 'm', s: 'Ca', col: '#d9d8cd', haz: ['palny'], opis: 'Metal ziem alkalicznych. Z wodą reaguje równo, wydzielając wodór.' },
  { id: 'mg', n: 'Magnez (wstążka)', f: 'Mg', cat: 'metale', kind: 'm', s: 'Mg', col: '#c9cdd3', haz: ['palny'], opis: 'Lekki metal. Pali się oślepiająco białym płomieniem. Żywo reaguje z kwasami.' },
  { id: 'al', n: 'Glin (folia)', f: 'Al', cat: 'metale', kind: 'm', s: 'Al', col: '#d8dce1', opis: 'Aluminium. Reaguje i z kwasami, i z zasadami – to metal amfoteryczny.' },
  { id: 'zn', n: 'Cynk (granulki)', f: 'Zn', cat: 'metale', kind: 'm', s: 'Zn', col: '#a7afb8', opis: 'Szary metal. Klasyczny sposób otrzymywania wodoru: cynk + kwas solny.' },
  { id: 'fe', n: 'Żelazo (opiłki)', f: 'Fe', cat: 'metale', kind: 'm', s: 'Fe', col: '#6a6d72', opis: 'Opiłki żelaza. Z kwasem reagują powoli, z siarką po ogrzaniu tworzą siarczek.' },
  { id: 'cu', n: 'Miedź (blaszka)', f: 'Cu', cat: 'metale', kind: 'm', s: 'Cu', col: '#c9743d', opis: 'Metal szlachetniejszy od wodoru – nie wypiera go z kwasu solnego.' },
  // tlenki i niemetale
  { id: 'cao', n: 'Wapno palone', f: 'CaO', cat: 'tlenki', kind: 's', s: 'CaO', col: '#f3f1ea', haz: ['zraca'], opis: 'Tlenek wapnia. „Gaszenie wapna” wodą to silnie egzotermiczna reakcja.' },
  { id: 'mgo', n: 'Tlenek magnezu', f: 'MgO', cat: 'tlenki', kind: 's', s: 'MgO', col: '#f8f8f8', opis: 'Biały proszek – tlenek zasadowy.' },
  { id: 'cuo', n: 'Tlenek miedzi(II)', f: 'CuO', cat: 'tlenki', kind: 's', s: 'CuO', col: '#1d1b1b', haz: ['srod'], opis: 'Czarny proszek. Roztwarza się w kwasach, dając niebieski roztwór.' },
  { id: 'mno2', n: 'Tlenek manganu(IV)', f: 'MnO2', cat: 'tlenki', kind: 's', s: 'MnO2', col: '#2a2320', haz: ['szk'], opis: 'Braunsztyn – czarny proszek, świetny katalizator rozkładu H₂O₂. Sam się nie zużywa.' },
  { id: 'fe2o3', n: 'Tlenek żelaza(III) (rdza)', f: 'Fe2O3', cat: 'tlenki', kind: 's', s: 'Fe2O3', col: '#9a3d1f', opis: 'Czerwonobrunatny proszek – główny składnik rdzy.' },
  { id: 's', n: 'Siarka', f: 'S', cat: 'tlenki', kind: 's', s: 'S', col: '#f2d43a', haz: ['palny'], opis: 'Żółty niemetal. Pali się niebieskim płomieniem, dając duszący SO₂.' },
  { id: 'c', n: 'Węgiel drzewny', f: 'C', cat: 'tlenki', kind: 's', s: 'C', col: '#1e1e1e', haz: ['palny'], opis: 'Prawie czysty węgiel. Spala się do CO₂.' },
  { id: 'i2', n: 'Jod (kryształki)', f: 'I2', cat: 'tlenki', kind: 's', s: 'I2', col: '#3d2c4f', haz: ['szk', 'srod'], opis: 'Szaro-fioletowe kryształki. W wodzie rozpuszcza się słabo, a po ogrzaniu sublimuje fioletowymi parami.' },
  { id: 'lugol', n: 'Płyn Lugola (jod w KI)', f: 'I2', cat: 'wskazniki', kind: 'r', c: 0.05, sp: { 'I2': 1, 'K^+': 2, 'I^-': 2 }, col: '#b86a1c', haz: ['szk'], stez: '0,05 mol/dm³ I₂', opis: 'Brązowy roztwór jodu. Ze skrobią daje granatowe zabarwienie.' },
  // wskaźniki
  { id: 'php', n: 'Fenoloftaleina', f: '', cat: 'wskazniki', kind: 'w', ind: 'php', col: '#ffffff', haz: ['palny'], opis: 'Wskaźnik zasad: bezbarwna w kwasach i wodzie, malinowa w zasadach.' },
  { id: 'mo', n: 'Oranż metylowy', f: '', cat: 'wskazniki', kind: 'w', ind: 'mo', col: '#f2b33a', haz: ['tox'], opis: 'Wskaźnik kwasów: czerwony w kwasach, żółty w obojętnych i zasadowych.' },
  { id: 'lak', n: 'Lakmus', f: '', cat: 'wskazniki', kind: 'w', ind: 'lak', col: '#8b5fb0', opis: 'Najstarszy wskaźnik, otrzymywany z porostów: kwasy – czerwony, zasady – niebieski.' },
  { id: 'uni', n: 'Wskaźnik uniwersalny', f: '', cat: 'wskazniki', kind: 'w', ind: 'uni', col: '#6fc35c', haz: ['palny'], opis: 'Mieszanina wskaźników – każde pH ma swoją barwę, od czerwieni po fiolet.' },
  { id: 'kap', n: 'Wywar z czerwonej kapusty', f: '', cat: 'wskazniki', kind: 'w', ind: 'kap', col: '#7a4fb8', opis: 'Naturalny wskaźnik z kuchni! Antocyjany zmieniają barwę w całej skali pH.' },
  { id: 'btb', n: 'Błękit bromotymolowy', f: '', cat: 'wskazniki', kind: 'w', ind: 'btb', col: '#3d74c8', opis: 'Żółty w kwasach, zielony w obojętnych, niebieski w zasadach. Wyczuwa nawet CO₂ z oddechu.' },
  // organiczne
  { id: 'glukoza', n: 'Glukoza (roztwór)', f: 'C6H12O6', cat: 'organiczne', kind: 'r', c: 0.5, sp: { 'C6H12O6': 1 }, col: '#fbfbf2', stez: '0,5 mol/dm³', opis: 'Cukier prosty z grupą aldehydową – dlatego ma właściwości redukujące (próby Trommera i Tollensa).' },
  { id: 'cukier', n: 'Cukier (sacharoza)', f: 'C12H22O11', cat: 'organiczne', kind: 's', s: 'C12H22O11', col: '#ffffff', opis: 'Dwucukier z buraków. Nie daje próby Trommera, ale stężony H₂SO₄ zwęgla go w czarnego węża.' },
  { id: 'skrobia', n: 'Kleik skrobiowy', f: '(C6H10O5)n', cat: 'organiczne', kind: 'r', c: 0.06, sp: { 'skrobia': 1 }, col: '#f6f6ee', opis: 'Skrobia rozprowadzona w ciepłej wodzie. Z jodem barwi się na granatowo.' },
  { id: 'maka', n: 'Mąka ziemniaczana', f: '(C6H10O5)n', cat: 'organiczne', kind: 's', s: 'skrobia', col: '#fbfaf4', opis: 'Prawie czysta skrobia. W zimnej wodzie słabo się rozpuszcza – w gorącej tworzy kleik.' },
  { id: 'bialko', n: 'Białko jaja kurzego', f: '', cat: 'organiczne', kind: 'r', c: 0.02, sp: { 'bialko': 1 }, col: '#fbf7e6', opis: 'Roztwór albuminy. Ścina się pod wpływem ciepła, alkoholu i soli metali ciężkich.' },
  { id: 'sacharozaR', n: 'Sacharoza (roztwór)', f: 'C12H22O11', cat: 'organiczne', kind: 'r', c: 0.3, sp: { 'C12H22O11': 1 }, col: '#fbfbf2', stez: '0,3 mol/dm³', ukryty: true, opis: 'Roztwór cukru buraczanego.' },
  { id: 'ziemniak', n: 'Ziemniak (kawałek)', f: '', cat: 'organiczne', kind: 's', s: 'ziemniak', col: '#efe0ae', opis: 'Zawiera skrobię i enzym katalazę, który błyskawicznie rozkłada wodę utlenioną.' }
];
R.REAGI = {}; R.REAG.forEach(r => R.REAGI[r.id] = r);

R.HAZ = {
  zraca: ['Żrący', 'Niszczy skórę i oczy'], tox: ['Toksyczny', 'Trucizna'], utl: ['Utleniający', 'Podsyca pożar'], palny: ['Łatwopalny', 'Trzymaj z dala od ognia'],
  srod: ['Szkodliwy dla środowiska', 'Nie wylewaj do zlewu'], szk: ['Drażniący / szkodliwy', 'Uwaga przy kontakcie'], zdr: ['Zagrożenie dla zdrowia', 'Może działać rakotwórczo']
};

/* dawki: [roztwór mL], [ciało stałe g], [metal g], [wskaźnik – krople] */
R.DAWKI = {
  r: [[0.05, '1 kropla'], [1, '1 cm³'], [5, '5 cm³'], [20, '20 cm³']],
  s: [[0.2, 'szczypta'], [1, '1 g'], [3, '3 g'], [10, '10 g']],
  m: [[0.1, 'okruch'], [0.3, 'kawałek'], [1, '1 g'], [3, '3 g']],
  w: [[1, '1 kropla'], [3, '3 krople'], [10, '10 kropli'], [40, '2 cm³']]
};
