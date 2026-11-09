/* Retorta – silnik reakcji: naczynia, ciepło, kinetyka, równowagi jonowe, gazy, testy */
'use strict';
(function () {
  const EPS = 1e-9;
  R.EPS = EPS;
  R.TAMB = 21;
  R.czas = 0;
  R.log = [];
  R.onEvent = null;
  R.naczynia = [];
  let nextId = 1;

  /* ---------- naczynie ---------- */
  R.Naczynie = class {
    constructor(typ) { this.id = nextId++; this.typ = typ; this.burner = false; this.ice = false; this.tube = null; this.reset(); }
    reset() {
      Object.assign(this, {
        liq: 0, etoh: 0, oil: 0, aq: {}, sol: {}, susp: {}, T: R.TAMB, head: {}, gacc: 0, bub: 0, binAcc: 0, bubIn: 0, vapAcc: {}, vap: {},
        foam: 0, stir: 0, emul: 0, burn: null, chemDT: 0, last: {}, indPrev: {}, pool: 0, steam: 0, evAcc: 0, flash: 0,
        thioT: null, thioDone: false, pbiHot: false, cuIdle: 0, hadThio: false, coat: {}, tMix: R.czas, zloto: 0, ziemBlue: 0,
        egzoDone: false, endoDone: false, etohFire: false, pH: null, burnFlame: 0, kFlame: 0, spill: 0, glow: 0, dryHint: false, warstwy: false
      });
    }
  };
  R.znajdz = id => R.naczynia.find(v => v.id === id);

  /* ---------- pomocnicze ---------- */
  const A = (v, s) => v.aq[s] || 0;
  const S = (v, s) => v.sol[s] || 0;
  function addA(v, s, n) { const x = (v.aq[s] || 0) + n; if (x < 1e-13) delete v.aq[s]; else v.aq[s] = x; }
  function addS(v, s, n, susp, coat) {
    const old = v.sol[s] || 0, x = old + n;
    if (x < 1e-13) { delete v.sol[s]; delete v.susp[s]; return; }
    if (n > 0) {
      const sp = susp === undefined ? (v.susp[s] || 0) : susp;
      v.susp[s] = ((v.susp[s] || 0) * old + sp * n) / x;
    }
    v.sol[s] = x;
    if (coat) v.coat[s] = true;
  }
  R.A = A; R.S = S; R.addA = addA; R.addS = addS;
  const L = v => Math.max(v.liq, 0.001) / 1000;
  R.L = L;
  const masaSol = v => { let m = 0; for (const k in v.sol) m += v.sol[k] * R.M(k); return m; };
  R.masaSol = masaSol;
  R.pojemnoscC = v => R.VT[v.typ].glass + v.liq * 4.0 + v.oil * 1.8 + masaSol(v) * 0.8;
  function heat(v, kJ) { const dT = kJ * 1000 / R.pojemnoscC(v); v.T += dT; v.chemDT += dT; }
  R.heat = heat;

  function lim(v, ch) {
    let x = Infinity;
    for (const k in ch) if (ch[k] < 0) {
      const have = k.startsWith('s:') ? S(v, k.slice(2)) : A(v, k);
      x = Math.min(x, have / -ch[k]);
    }
    return x === Infinity ? 0 : Math.max(0, x);
  }
  function rx(v, x, ch, dH) {
    for (const k in ch) {
      const n = ch[k] * x;
      if (k.startsWith('s:')) addS(v, k.slice(2), n, k === 's:Skol' || k === 's:MnO2kol' ? 1 : undefined);
      else if (k.startsWith('g:')) gas(v, k.slice(2), n);
      else addA(v, k, n);
    }
    if (dH) heat(v, -dH * x);
  }
  function pr(v, ch, dH) { const x = lim(v, ch); if (x > EPS) { rx(v, x, ch, dH); return true; } return false; }

  /* ---------- zdarzenia ---------- */
  R.emit = function (v, key, txt, eq, data) {
    const t = R.czas, last = v.last[key];
    if (last !== undefined && t - last < 0.5) return;
    const pokaz = last === undefined || t - last > 15;
    v.last[key] = t;
    const ev = { key, vid: v.id, t, data: data || {}, real: performance.now(), txt, eq };
    R.log.push(ev); if (R.log.length > 4000) R.log.splice(0, 1500);
    if (R.onEvent) R.onEvent(ev, v, pokaz && !!txt);
  };
  const emit = R.emit;

  /* ---------- gazy ---------- */
  function gas(v, g, n) {
    if (n <= 0) return;
    if (v.tube != null) {
      const t = R.znajdz(v.tube);
      if (t && t !== v) { if (v.liq > 0.3) v.gacc += n; else { v.vapAcc[g] = (v.vapAcc[g] || 0) + n * 0.3; } wprowadzGaz(t, g, n); return; }
      v.tube = null;
    }
    if (v.liq > 0.3) v.gacc += n; else v.vapAcc[g] = (v.vapAcc[g] || 0) + n;
    v.head[g] = (v.head[g] || 0) + n;
    emit(v, 'gaz:' + g, null, null);
  }
  R.gas = gas;
  function wprowadzGaz(t, g, n) {
    t.binAcc += n;
    emit(t, 'gaz:' + g, null, null);
    if (t.liq > 0.5) {
      if (g === 'CO2') { addA(t, 'CO2', n); t.co2In = R.czas; return; }
      if (g === 'NH3') { addA(t, 'NH3', n); return; }
      if (g === 'SO2') { addA(t, 'H^+', n); addA(t, 'HSO3^-', n); emit(t, 'r:so2-woda', 'Tlenek siarki(IV) rozpuszcza się w wodzie i tworzy kwas siarkowy(IV) – odczyn staje się kwasowy.', 'SO2 + H2O → H2SO3'); return; }
      if (g === 'HCl') { addA(t, 'H^+', n); addA(t, 'Cl^-', n); return; }
      if (g === 'NO2') { addA(t, 'H^+', n); addA(t, 'NO3^-', n); return; }
      if (g === 'H2S') { addA(t, 'H2S', n); return; }
    }
    t.head[g] = (t.head[g] || 0) + n;
  }

  /* ---------- odczyn ---------- */
  R.liczPH = function (v) {
    if (v.liq < 0.01) return null;
    const Lv = L(v), g = s => A(v, s) / Lv;
    const H = g('H^+'), OH = g('OH^-'), net = H - OH;
    if (Math.abs(net) > 2e-6) {
      if (net > 0) return Math.max(-1, -Math.log10((net + Math.sqrt(net * net + 4e-14)) / 2));
      const oh = (-net + Math.sqrt(net * net + 4e-14)) / 2; return Math.min(15, 14 + Math.log10(oh));
    }
    const buf = [], kw = [];
    const para = (ac, ba, pKa) => {
      const a = g(ac), b = g(ba);
      if (a > 1e-6 && b > 1e-6) buf.push(pKa + Math.log10(b / a));
      else if (a > 1e-6 && ac) kw.push(Math.min(7, 0.5 * (pKa - Math.log10(a))));
      else if (b > 1e-6 && ba) kw.push(Math.max(7, 14 - 0.5 * ((14 - pKa) - Math.log10(b))));
    };
    para('CH3COOH', 'CH3COO^-', 4.76);
    para('NH4^+', 'NH3', 9.25);
    const hc = g('HCO3^-'), co3 = g('CO3^2-'), co2 = g('CO2');
    if (hc > 1e-6 && co3 > 1e-6) buf.push(10.33 + Math.log10(co3 / hc));
    else if (hc > 1e-6 && co2 > 1e-6) buf.push(6.35 + Math.log10(hc / co2));
    else if (co3 > 1e-6) kw.push(14 - 0.5 * (3.67 - Math.log10(co3)));
    else if (hc > 1e-6) kw.push(8.3);
    else if (co2 > 1e-6) kw.push(Math.max(3.9, 0.5 * (6.35 - Math.log10(co2))));
    if (g('S^2-') > 1e-6) kw.push(14 - 0.5 * (1 - Math.log10(g('S^2-'))));
    if (g('PO4^3-') > 1e-6) kw.push(14 - 0.5 * (1.68 - Math.log10(g('PO4^3-'))));
    if (g('S2O3^2-') > 1e-6) kw.push(7.5);
    [['Fe^3+', 2.2], ['Al^3+', 5.0], ['Cu^2+', 7.5], ['Zn^2+', 9.0], ['Pb^2+', 7.7], ['Fe^2+', 9.5], ['Co^2+', 9.6]].forEach(([s, p]) => {
      if (g(s) > 1e-6) kw.push(Math.min(7, 0.5 * (p - Math.log10(g(s)))));
    });
    if (g('[Cu(NH3)4]^2+') > 1e-6 || g('[Ag(NH3)2]^+') > 1e-6 || g('[Zn(NH3)4]^2+') > 1e-6) kw.push(10.5);
    if (buf.length) return buf[0];
    if (!kw.length) return 7;
    const kw1 = kw.filter(x => x < 7), kw2 = kw.filter(x => x > 7);
    const a = kw1.length ? Math.min(...kw1) : null, b = kw2.length ? Math.max(...kw2) : null;
    if (a !== null && b !== null) return (a + b) / 2;
    return a !== null ? a : b !== null ? b : 7;
  };

  /* ---------- aktywność metali ---------- */
  const AKT = {
    K: { a: 1, q: 1, ion: 'K^+', woda: 0.8, dHw: -196, txtW: 'Potas gwałtownie reaguje z wodą i zapala się fioletowym płomieniem! Powstaje zasada potasowa i wodór.', eqW: '2K + 2H2O → 2KOH + H2↑' },
    Na: { a: 2, q: 1, ion: 'Na^+', woda: 0.35, dHw: -184, txtW: 'Sód topi się w srebrzystą kulkę, która z sykiem biega po wodzie. Wydziela się wodór, a w roztworze powstaje zasada sodowa.', eqW: '2Na + 2H2O → 2NaOH + H2↑' },
    Li: { a: 3, q: 1, ion: 'Li^+', woda: 0.12, dHw: -222, txtW: 'Lit pływa po wodzie i spokojnie syczy, wydzielając wodór. Powstaje wodorotlenek litu.', eqW: '2Li + 2H2O → 2LiOH + H2↑' },
    Ca: { a: 4, q: 2, ion: 'Ca^2+', woda: 0.05, dHw: -414, txtW: 'Wapń opada na dno i równo wydziela pęcherzyki wodoru. Roztwór mętnieje od słabo rozpuszczalnego Ca(OH)₂.', eqW: 'Ca + 2H2O → Ca(OH)2 + H2↑' },
    Mg: { a: 5, q: 2, ion: 'Mg^2+', kwas: 0.2, dHk: -467, txtK: 'Magnez burzliwie roztwarza się w kwasie – szybko wydziela się wodór, a naczynie robi się ciepłe.', eqK: 'Mg + 2H^+ → Mg^2+ + H2↑' },
    Al: { a: 6, q: 3, ion: 'Al^3+', kwas: 0.02, dHk: -531, txtK: 'Glin po chwili zaczyna roztwarzać się w kwasie, wydzielając wodór (najpierw musi puścić cienka warstewka tlenku).', eqK: '2Al + 6H^+ → 2Al^3+ + 3H2↑' },
    Zn: { a: 7, q: 2, ion: 'Zn^2+', kwas: 0.025, dHk: -153, txtK: 'Cynk roztwarza się w kwasie – na granulkach powstają pęcherzyki wodoru.', eqK: 'Zn + 2H^+ → Zn^2+ + H2↑' },
    Fe: { a: 8, q: 2, ion: 'Fe^2+', kwas: 0.008, dHk: -89, txtK: 'Żelazo powoli roztwarza się w kwasie. Wydziela się wodór, a roztwór staje się bladozielony od jonów Fe²⁺.', eqK: 'Fe + 2H^+ → Fe^2+ + H2↑' },
    Pb: { a: 9, q: 2, ion: 'Pb^2+' }, Cu: { a: 11, q: 2, ion: 'Cu^2+' }, Ag: { a: 12, q: 1, ion: 'Ag^+' }
  };
  R.AKT = AKT;
  const ION2MET = { 'Cu^2+': 'Cu', 'Ag^+': 'Ag', 'Pb^2+': 'Pb', 'Fe^2+': 'Fe', 'Zn^2+': 'Zn' };
  const NAZ_MET = { K: 'potas', Na: 'sód', Li: 'lit', Ca: 'wapń', Mg: 'magnez', Al: 'glin', Zn: 'cynk', Fe: 'żelazo', Pb: 'ołów', Cu: 'miedź', Ag: 'srebro' };
  const TXT_WYP = {
    Cu: m => `Na ${m === 'Fe' ? 'żelazie' : m === 'Zn' ? 'cynku' : m === 'Mg' ? 'magnezie' : 'glinie'} osadza się czerwonobrunatny nalot miedzi, a niebieska barwa roztworu słabnie. Bardziej aktywny ${NAZ_MET[m]} wypiera miedź z roztworu jej soli.`,
    Ag: m => `Na metalu wyrastają lśniące, srebrzyste kryształki srebra – „srebrne drzewko”.${m === 'Cu' ? ' Roztwór powoli niebieszczeje od jonów Cu²⁺.' : ''} Bardziej aktywny ${NAZ_MET[m]} wypiera srebro z jego soli.`,
    Pb: m => `Na metalu narasta szare, krzaczaste „drzewko” ołowiu. ${NAZ_MET[m][0].toUpperCase() + NAZ_MET[m].slice(1)} jest aktywniejszy od ołowiu i wypiera go z roztworu.`,
    Fe: m => `Na metalu osadza się szary nalot żelaza – ${NAZ_MET[m]} wypiera żelazo z jego soli.`,
    Zn: m => `Na metalu osadza się szary nalot cynku – ${NAZ_MET[m]} wypiera cynk z jego soli.`
  };
  function eqWyp(M, N, qM, qN) {
    const g = R.gcd(qM, qN), a = qN / g, b = qM / g; // a M + b N^qN+ → a M^qM+ + b N
    const c = x => x > 1 ? x : '';
    return `${c(a)}${M} + ${c(b)}${N2ion(N)} → ${c(a)}${AKT[M].ion} + ${c(b)}${N}`;
  }
  const N2ion = N => AKT[N].ion;

  /* ---------- reakcje termiczne ---------- */
  const TERM = [
    { k: 'CuSO4·5H2O', T: 105, sucho: 1, p: { 's:CuSO4': 1, 'g:H2O': 5 }, key: 'r:rozklad:CuSO4', txt: 'Niebieskie kryształy bieleją – siarczan(VI) miedzi(II) traci wodę krystalizacyjną.', eq: 'CuSO4·5H2O → CuSO4 + 5H2O↑' },
    { k: 'CoCl2·6H2O', T: 100, sucho: 1, p: { 's:CoCl2': 1, 'g:H2O': 6 }, key: 'r:CoCl2', txt: 'Różowe kryształy chlorku kobaltu(II) niebieszczeją po utracie wody krystalizacyjnej.', eq: 'CoCl2·6H2O → CoCl2 + 6H2O↑' },
    { k: 'NaHCO3', T: 100, sucho: 1, p: { 's:Na2CO3': 0.5, 'g:CO2': 0.5, 'g:H2O': 0.5 }, key: 'r:rozklad:NaHCO3', txt: 'Soda oczyszczona rozkłada się – wydziela się CO₂ i para wodna (dlatego ciasto z proszkiem do pieczenia rośnie).', eq: '2NaHCO3 → Na2CO3 + H2O + CO2↑' },
    { k: 'CuCO3', T: 200, sucho: 1, p: { 's:CuO': 1, 'g:CO2': 1 }, key: 'r:rozklad:CuCO3', txt: 'Niebieskozielony węglan miedzi(II) czernieje – rozkłada się na tlenek miedzi(II) i CO₂.', eq: 'CuCO3 → CuO + CO2↑' },
    { k: 'CaCO3m', T: 780, sucho: 1, p: { 's:CaO': 1, 'g:CO2': 1 }, key: 'r:rozklad:CaCO3', txt: 'Prażony węglan wapnia rozkłada się na wapno palone i CO₂ – tak powstaje wapno w wapiennikach.', eq: 'CaCO3 → CaO + CO2↑' },
    { k: 'CaCO3', T: 780, sucho: 1, p: { 's:CaO': 1, 'g:CO2': 1 }, key: 'r:rozklad:CaCO3', txt: 'Prażony węglan wapnia rozkłada się na wapno palone i CO₂.', eq: 'CaCO3 → CaO + CO2↑' },
    { k: 'KMnO4', T: 240, sucho: 1, p: { 's:K2MnO4': 0.5, 's:MnO2': 0.5, 'g:O2': 0.5 }, key: 'r:rozklad:KMnO4', txt: 'Kryształki manganianu(VII) potasu trzeszczą i rozpadają się w ciemny proszek, wydzielając tlen.', eq: '2KMnO4 → K2MnO4 + MnO2 + O2↑' },
    { k: 'NH4Cl', T: 300, sucho: 1, p: { 'g:NH3': 1, 'g:HCl': 1 }, key: 'r:NH4Cl', txt: 'Chlorek amonu znika z dna – rozkłada się na amoniak i chlorowodór, które w chłodniejszym miejscu znów łączą się w biały dym.', eq: 'NH4Cl → NH3↑ + HCl↑' },
    { k: 'C12H22O11', T: 185, sucho: 1, p: { 's:karmel': 1, 'g:H2O': 4 }, key: 'r:karmel', txt: 'Cukier topi się i brązowieje – powstaje karmel.', eq: 'C12H22O11 → karmel + H2O↑' },
    { k: 'C6H12O6', T: 160, sucho: 1, p: { 's:karmel': 0.5, 'g:H2O': 2 }, key: 'r:karmel', txt: 'Glukoza topi się i brązowieje – karmelizuje.', eq: 'C6H12O6 → karmel + H2O↑' },
    { k: 'karmel', T: 300, sucho: 1, p: { 's:C': 12, 'g:H2O': 9 }, key: 'r:zweglenie', txt: 'Karmel czernieje i dymi – cukier się zwęgla. Czarna pozostałość to węgiel, a para wodna ucieka.', eq: 'C12H22O11 → 12C + 11H2O↑' },
    { k: 'I2', T: 90, p: { 'g:I2': 1 }, key: 'r:sublimacja:I2', txt: 'Fioletowe pary! Jod sublimuje – przechodzi z ciała stałego od razu w gaz.', eq: 'I2(s) → I2(g)' },
    { k: 'Fe(OH)3', T: 250, sucho: 1, p: { 's:Fe2O3': 0.5, 'g:H2O': 1.5 }, key: 'r:rozklad:FeOH3', txt: 'Wodorotlenek żelaza(III) prażony zamienia się w czerwonobrunatny tlenek żelaza(III).', eq: '2Fe(OH)3 → Fe2O3 + 3H2O↑' },
    { k: 'Ag2O', T: 300, sucho: 1, p: { 's:Ag': 2, 'g:O2': 0.5 }, key: 'r:rozklad:Ag2O', txt: 'Tlenek srebra(I) rozkłada się na srebro i tlen.', eq: '2Ag2O → 4Ag + O2↑' },
    { k: 'ziemniak', T: 220, sucho: 1, p: { 's:C': 4, 'g:H2O': 3 }, key: 'r:zweglenie', txt: 'Ziemniak przypieka się i zwęgla.', eq: '(C6H10O5)n → C + H2O↑' }
  ];
  const SPAL = {
    Mg: { T: 620, p: { 's:MgO': 1 }, dH: -601, rate: 0.8, plom: 'mg', key: 'r:spalanie:Mg', txt: 'Magnez zapala się oślepiająco białym płomieniem! Powstaje biały proszek – tlenek magnezu. Nie patrz prosto w płomień!', eq: '2Mg + O2 → 2MgO' },
    S: { T: 250, p: { 'g:SO2': 1 }, dH: -297, rate: 0.25, plom: 's', key: 'r:spalanie:S', txt: 'Siarka topi się i pali małym, niebieskim płomieniem. Powstaje bezbarwny gaz o duszącym zapachu – tlenek siarki(IV).', eq: 'S + O2 → SO2↑' },
    C: { T: 500, p: { 'g:CO2': 1 }, dH: -394, rate: 0.12, plom: 'c', key: 'r:spalanie:C', txt: 'Węgiel żarzy się na pomarańczowo i powoli znika, spalając się do tlenku węgla(IV).', eq: 'C + O2 → CO2↑' },
    Fe: { T: 650, p: { 's:Fe3O4': 1 / 3 }, dH: -372, rate: 0.5, plom: 'fe', key: 'r:spalanie:Fe', txt: 'Opiłki żelaza w płomieniu rozbłyskują iskrami jak zimne ognie! Powstaje czarny tlenek żelaza(II,III).', eq: '3Fe + 2O2 → Fe3O4' },
    Na: { T: 150, p: { 's:Na2O': 0.5 }, dH: -207, rate: 0.6, plom: 'na', key: 'r:spalanie:Na', txt: 'Sód spala się jaskrawożółtym płomieniem, dając biały dym tlenku sodu.', eq: '4Na + O2 → 2Na2O' },
    K: { T: 120, p: { 's:K2O': 0.5 }, dH: -181, rate: 0.6, plom: 'k', key: 'r:spalanie:K', txt: 'Potas spala się fioletowym płomieniem.', eq: '4K + O2 → 2K2O' },
    Li: { T: 200, p: { 's:Li2O': 0.5 }, dH: -299, rate: 0.5, plom: 'li', key: 'r:spalanie:Li', txt: 'Lit spala się karminowoczerwonym płomieniem, dając biały tlenek litu.', eq: '4Li + O2 → 2Li2O' },
    Ca: { T: 500, p: { 's:CaO': 1 }, dH: -635, rate: 0.4, plom: 'ca', key: 'r:spalanie:Ca', txt: 'Wapń spala się ceglastoczerwonym płomieniem, dając biały tlenek wapnia.', eq: '2Ca + O2 → 2CaO' }
  };
  R.SPAL = SPAL;

  /* ---------- tlenki ---------- */
  const TLENKI = {
    CuO: { ion: 'Cu^2+', n: 1, q: 2, k: 0.006, txt: 'Czarny tlenek miedzi(II) roztwarza się w kwasie – roztwór niebieszczeje (szybciej na gorąco).', eq: 'CuO + 2H^+ → Cu^2+ + H2O' },
    MgO: { ion: 'Mg^2+', n: 1, q: 2, k: 0.1, woda: 0.03, txt: 'Tlenek magnezu roztwarza się w kwasie.', eq: 'MgO + 2H^+ → Mg^2+ + H2O', txtW: 'Tlenek magnezu słabo reaguje z wodą – powstaje odrobina wodorotlenku magnezu, więc odczyn jest zasadowy. To tlenek zasadowy.', eqW: 'MgO + H2O → Mg(OH)2' },
    CaO: { ion: 'Ca^2+', n: 1, q: 2, k: 0.3, woda: 0.15, dHw: -65, txt: 'Wapno palone reaguje z kwasem.', eq: 'CaO + 2H^+ → Ca^2+ + H2O', txtW: 'Gaszenie wapna: tlenek wapnia z sykiem reaguje z wodą i mocno się nagrzewa. Powstaje wodorotlenek wapnia (wapno gaszone).', eqW: 'CaO + H2O → Ca(OH)2', keyW: 'r:wapno-gaszenie' },
    Na2O: { ion: 'Na^+', n: 2, q: 1, k: 2, woda: 2, dHw: -150, txtW: 'Tlenek sodu reaguje z wodą, tworząc zasadę sodową.', eqW: 'Na2O + H2O → 2NaOH' },
    K2O: { ion: 'K^+', n: 2, q: 1, k: 2, woda: 2, dHw: -200, txtW: 'Tlenek potasu reaguje z wodą, tworząc zasadę potasową.', eqW: 'K2O + H2O → 2KOH' },
    Li2O: { ion: 'Li^+', n: 2, q: 1, k: 2, woda: 1.5, dHw: -130, txtW: 'Tlenek litu reaguje z wodą, tworząc wodorotlenek litu.', eqW: 'Li2O + H2O → 2LiOH' },
    Fe2O3: { ion: 'Fe^3+', n: 2, q: 3, k: 0.002, txt: 'Rdza powoli roztwarza się w kwasie – roztwór żółknie od jonów Fe³⁺.', eq: 'Fe2O3 + 6H^+ → 2Fe^3+ + 3H2O' }
  };

  /* ---------- strącanie ---------- */
  function osad(v, p) {
    const [kat, an] = p;
    const nk0 = A(v, kat), na0 = A(v, an);
    if (nk0 < EPS || na0 < EPS) return false;
    const w = R.wzorSoli(kat, an);
    let x = Math.min(nk0 / w.nk, na0 / w.na);
    const cap = p[5] ? p[5](v.T) * L(v) : 0;
    x -= cap;
    if (x <= EPS) return false;
    addA(v, kat, -x * w.nk); addA(v, an, -x * w.na);
    const key = R.sol(kat, an, true);
    addS(v, key, x, 1);
    const s = R.SOLID[key];
    const c = n => n > 1 ? n : '';
    const eq = key === 'Ag2O' ? '2Ag^+ + 2OH^- → Ag2O↓ + H2O' : `${c(w.nk)}${kat} + ${c(w.na)}${an} → ${key}↓`;
    emit(v, 'osad:' + key, `Wytrąca się ${s.opis} osad – ${s.n}.`, eq);
    if (key === 'CaCO3' && R.czas - (v.co2In || -99) < 3) emit(v, 'r:woda-wapienna-mleko', 'Woda wapienna mętnieje – wpuszczony gaz to tlenek węgla(IV)! Powstaje nierozpuszczalny węglan wapnia.', 'Ca(OH)2 + CO2 → CaCO3↓ + H2O');
    if (key === 'PbI2' && v.pbiHot && v.T < 75) {
      v.zloto = 1;
      emit(v, 'r:zloty-deszcz', 'Złoty deszcz! Podczas stygnięcia z roztworu wypadają lśniące, złote blaszki jodku ołowiu(II). Na gorąco ten osad lepiej się rozpuszcza.', 'Pb^2+ + 2I^- → PbI2↓');
    }
    return true;
  }
  function rozpuscOsadyMaxC(v) {
    for (const p of R.PRECIP) {
      if (!p[5]) continue;
      const w = R.wzorSoli(p[0], p[1]); const key = w.f;
      const n = S(v, key); if (n < EPS) continue;
      const present = Math.min(A(v, p[0]) / w.nk, A(v, p[1]) / w.na);
      const cap = p[5](v.T) * L(v);
      if (present < cap - EPS) {
        const y = Math.min(n, (cap - present));
        addS(v, key, -y); addA(v, p[0], y * w.nk); addA(v, p[1], y * w.na);
        if (key === 'PbI2' && S(v, key) < EPS && v.T > 70) {
          v.pbiHot = true;
          emit(v, 'r:pbi-rozp', 'Na gorąco żółty osad jodku ołowiu(II) rozpuścił się. Teraz pozwól mu ostygnąć…', null);
        }
      }
    }
  }

  /* ---------- reakcje szybkie (jonowe) ---------- */
  const HYDROKS = ['Fe^3+', 'Al^3+', 'Cu^2+', 'Zn^2+', 'Fe^2+', 'Pb^2+', 'Ag^+', 'Mn^2+', 'Co^2+', 'Mg^2+'];
  function szybkie(v) {
    if (v.liq <= 0.01) return;
    for (let it = 0; it < 40; it++) {
      let ch = false, x;
      x = Math.min(A(v, 'H^+'), A(v, 'OH^-'));
      if (x > EPS) {
        addA(v, 'H^+', -x); addA(v, 'OH^-', -x); heat(v, 57.3 * x); ch = true;
        if (x > 2e-5) emit(v, 'r:zobojetnianie', 'Zachodzi zobojętnianie: kationy H⁺ i aniony OH⁻ łączą się w cząsteczki wody, a roztwór się ogrzewa.', 'H^+ + OH^- → H2O');
      }
      ch = pr(v, { 'H^+': -1, 'NH3': -1, 'NH4^+': 1 }, -52) || ch;
      ch = pr(v, { 'H^+': -1, 'CH3COO^-': -1, 'CH3COOH': 1 }) || ch;
      ch = pr(v, { 'H^+': -1, 'CO3^2-': -1, 'HCO3^-': 1 }) || ch;
      x = lim(v, { 'H^+': -1, 'HCO3^-': -1 });
      if (x > EPS) { rx(v, x, { 'H^+': -1, 'HCO3^-': -1, 'g:CO2': 1 }); ch = true; emit(v, 'r:co2-kwas', 'Burzy się! Wydziela się bezbarwny gaz – tlenek węgla(IV).', '2H^+ + CO3^2- → H2O + CO2↑'); }
      x = lim(v, { 'H^+': -2, 'S^2-': -1 });
      if (x > EPS) { rx(v, x, { 'H^+': -2, 'S^2-': -1, 'g:H2S': 1 }); ch = true; emit(v, 'r:h2s', 'Czuć zapach zgniłych jaj – wydziela się trujący siarkowodór!', '2H^+ + S^2- → H2S↑'); }
      x = lim(v, { 'H^+': -1, '[Al(OH)4]^-': -1 });
      if (x > EPS) { rx(v, x, { 'H^+': -1, '[Al(OH)4]^-': -1 }); addS(v, R.sol('Al^3+', 'OH^-', true), x, 1); ch = true; }
      x = lim(v, { 'H^+': -2, '[Zn(OH)4]^2-': -1 });
      if (x > EPS) { rx(v, x, { 'H^+': -2, '[Zn(OH)4]^2-': -1 }); addS(v, R.sol('Zn^2+', 'OH^-', true), x, 1); ch = true; }
      ch = pr(v, { 'H^+': -4, '[Cu(NH3)4]^2+': -1, 'Cu^2+': 1, 'NH4^+': 4 }) || ch;
      ch = pr(v, { 'H^+': -2, '[Ag(NH3)2]^+': -1, 'Ag^+': 1, 'NH4^+': 2 }) || ch;
      ch = pr(v, { 'H^+': -4, '[Zn(NH3)4]^2+': -1, 'Zn^2+': 1, 'NH4^+': 4 }) || ch;
      ch = pr(v, { 'CO2': -1, 'OH^-': -1, 'HCO3^-': 1 }) || ch;
      ch = pr(v, { 'CH3COOH': -1, 'CO3^2-': -1, 'CH3COO^-': 1, 'HCO3^-': 1 }) || ch;
      ch = pr(v, { 'CH3COOH': -1, 'NH3': -1, 'CH3COO^-': 1, 'NH4^+': 1 }) || ch;
      x = lim(v, { 'CH3COOH': -1, 'HCO3^-': -1 });
      if (x > EPS) { rx(v, x, { 'CH3COOH': -1, 'HCO3^-': -1, 'CH3COO^-': 1, 'g:CO2': 1 }); ch = true; emit(v, 'r:co2-kwas', 'Burzy się i pieni! Kwas octowy reaguje z wodorowęglanem i wydziela się tlenek węgla(IV).', 'CH3COOH + NaHCO3 → CH3COONa + H2O + CO2↑'); }
      ch = pr(v, { 'OH^-': -1, 'CH3COOH': -1, 'CH3COO^-': 1 }, -56) || ch;
      ch = pr(v, { 'OH^-': -1, 'NH4^+': -1, 'NH3': 1 }) || ch;
      ch = pr(v, { 'OH^-': -1, 'HCO3^-': -1, 'CO3^2-': 1 }) || ch;
      ch = pr(v, { 'OH^-': -1, 'HSO3^-': -1 }) || ch;
      ch = pr(v, { 'CO2': -1, 'CO3^2-': -1, 'HCO3^-': 2 }) || ch;
      ch = pr(v, { 'H2S': -1, 'OH^-': -2, 'S^2-': 1 }) || ch;
      // chromiany
      x = lim(v, { 'CrO4^2-': -2, 'H^+': -2 });
      if (x > EPS) { rx(v, x, { 'CrO4^2-': -2, 'H^+': -2, 'Cr2O7^2-': 1 }); ch = true; emit(v, 'r:chromian', 'Żółty roztwór chromianu(VI) zmienia barwę na pomarańczową – w kwasie powstaje dichromian(VI).', '2CrO4^2- + 2H^+ → Cr2O7^2- + H2O'); }
      x = lim(v, { 'Cr2O7^2-': -1, 'OH^-': -2 });
      if (x > EPS) { rx(v, x, { 'Cr2O7^2-': -1, 'OH^-': -2, 'CrO4^2-': 2 }); ch = true; emit(v, 'r:dichromian', 'Pomarańczowy dichromian(VI) w zasadzie wraca do żółtego chromianu(VI). To równowaga zależna od pH!', 'Cr2O7^2- + 2OH^- → 2CrO4^2- + H2O'); }
      // Fe3+/Al3+ z węglanami – hydroliza
      for (const [kat, of] of [['Fe^3+', 'Fe(OH)3'], ['Al^3+', 'Al(OH)3']]) {
        x = lim(v, { [kat]: -2, 'CO3^2-': -3 });
        if (x > EPS) { rx(v, x, { [kat]: -2, 'CO3^2-': -3, 'g:CO2': 3 }); R.sol(kat, 'OH^-', true); addS(v, of, 2 * x, 1); ch = true; emit(v, 'osad:' + of, `Wytrąca się osad ${R.SOLID[of].n} i jednocześnie wydziela się CO₂ – węglan tego metalu nie istnieje w wodzie (hydroliza).`, `2${kat} + 3CO3^2- + 3H2O → 2${of}↓ + 3CO2↑`); }
      }
      // FeSCN
      x = lim(v, { 'Fe^3+': -1, 'SCN^-': -1 });
      if (x > EPS) { rx(v, x, { 'Fe^3+': -1, 'SCN^-': -1, 'FeSCN^2+': 1 }); ch = true; emit(v, 'r:krew', 'Krwistoczerwone zabarwienie! Jony Fe³⁺ tworzą z tiocyjanianem barwny kompleks – to bardzo czuły test na żelazo(III).', 'Fe^3+ + SCN^- → FeSCN^2+'); }
      x = lim(v, { 'FeSCN^2+': -1, 'OH^-': -3 });
      if (x > EPS) { rx(v, x, { 'FeSCN^2+': -1, 'OH^-': -3, 'SCN^-': 1 }); R.sol('Fe^3+', 'OH^-', true); addS(v, 'Fe(OH)3', x, 1); ch = true; }
      // amoniak z kationami → wodorotlenki
      for (const kat of HYDROKS) {
        const q = R.ION[kat].q;
        x = lim(v, { [kat]: -1, 'NH3': -q });
        if (x > EPS) {
          if (kat === 'Mg^2+' && A(v, 'NH4^+') > A(v, 'NH3') * 2) continue;
          rx(v, x, { [kat]: -1, 'NH3': -q, 'NH4^+': q });
          const key = R.sol(kat, 'OH^-', true);
          addS(v, key, kat === 'Ag^+' ? x / 2 : x, 1);
          const s = R.SOLID[key];
          emit(v, 'osad:' + key, `Amoniak wytrąca ${s.opis} osad – ${s.n}.`, kat === 'Ag^+' ? '2Ag^+ + 2NH3 + H2O → Ag2O↓ + 2NH4^+' : `${kat} + ${q > 1 ? q : ''}NH3 + ${q > 1 ? q : ''}H2O → ${key}↓ + ${q > 1 ? q : ''}NH4^+`);
          ch = true;
        }
      }
      // tabela strąceń
      for (const p of R.PRECIP) ch = osad(v, p) || ch;
      // amfoteryczność
      if (A(v, 'Al^3+') < EPS) {
        x = lim(v, { 's:Al(OH)3': -1, 'OH^-': -1 });
        if (x > EPS) { rx(v, x, { 's:Al(OH)3': -1, 'OH^-': -1, '[Al(OH)4]^-': 1 }); ch = true; emit(v, 'r:amfoter:Al', 'Galaretowaty osad wodorotlenku glinu roztwarza się w nadmiarze zasady – to wodorotlenek amfoteryczny!', 'Al(OH)3 + OH^- → [Al(OH)4]^-'); }
      }
      if (A(v, 'Zn^2+') < EPS) {
        x = lim(v, { 's:Zn(OH)2': -1, 'OH^-': -2 });
        if (x > EPS) { rx(v, x, { 's:Zn(OH)2': -1, 'OH^-': -2, '[Zn(OH)4]^2-': 1 }); ch = true; emit(v, 'r:amfoter:Zn', 'Biały osad wodorotlenku cynku roztwarza się w nadmiarze zasady – wodorotlenek cynku jest amfoteryczny.', 'Zn(OH)2 + 2OH^- → [Zn(OH)4]^2-'); }
      }
      // kompleksy amoniakalne
      if (A(v, 'Cu^2+') < EPS) {
        x = lim(v, { 's:Cu(OH)2': -1, 'NH3': -4 });
        if (x > EPS) { rx(v, x, { 's:Cu(OH)2': -1, 'NH3': -4, '[Cu(NH3)4]^2+': 1, 'OH^-': 2 }); ch = true; emit(v, 'r:miedz-amon', 'Niebieski osad znika, a roztwór staje się intensywnie ciemnoniebieski (lazurowy) – powstał kation kompleksowy tetraaminamiedzi(II).', 'Cu(OH)2 + 4NH3 → [Cu(NH3)4]^2+ + 2OH^-'); }
      }
      if (A(v, 'Zn^2+') < EPS) {
        x = lim(v, { 's:Zn(OH)2': -1, 'NH3': -4 });
        if (x > EPS) { rx(v, x, { 's:Zn(OH)2': -1, 'NH3': -4, '[Zn(NH3)4]^2+': 1, 'OH^-': 2 }); ch = true; emit(v, 'r:Zn-NH3', 'Biały osad wodorotlenku cynku rozpuszcza się w nadmiarze amoniaku – powstaje bezbarwny kompleks.', 'Zn(OH)2 + 4NH3 → [Zn(NH3)4]^2+ + 2OH^-'); }
      }
      if (A(v, 'Ag^+') < EPS) {
        x = lim(v, { 's:Ag2O': -1, 'NH3': -4 });
        if (x > EPS) { rx(v, x, { 's:Ag2O': -1, 'NH3': -4, '[Ag(NH3)2]^+': 2, 'OH^-': 2 }); ch = true; emit(v, 'r:tollens-odczynnik', 'Brunatny osad tlenku srebra(I) rozpuszcza się w amoniaku – powstał odczynnik Tollensa.', 'Ag2O + 4NH3 + H2O → 2[Ag(NH3)2]^+ + 2OH^-'); }
        if (A(v, 'NH3') / L(v) > 0.15) {
          x = lim(v, { 's:AgCl': -1, 'NH3': -2 });
          if (x > EPS) { rx(v, x, { 's:AgCl': -1, 'NH3': -2, '[Ag(NH3)2]^+': 1, 'Cl^-': 1 }); ch = true; emit(v, 'r:Ag-NH3', 'Biały osad chlorku srebra rozpuszcza się w amoniaku (tworzy się jon kompleksowy). Bromek srebra rozpuszcza się słabo, a jodek – wcale.', 'AgCl + 2NH3 → [Ag(NH3)2]^+ + Cl^-'); }
        }
      }
      // osady roztwarzane przez kwas
      if (A(v, 'H^+') > EPS) {
        for (const key in v.sol) {
          const s = R.SOLID[key]; if (!s || !s.dyn) continue;
          if (s.an === 'OH^-') {
            const nOH = key === 'Ag2O' ? 2 : R.ION[s.kat].q;
            x = lim(v, { ['s:' + key]: -1, 'H^+': -nOH });
            if (x > EPS) {
              rx(v, x, { ['s:' + key]: -1, 'H^+': -nOH, [s.kat]: key === 'Ag2O' ? 2 : 1 }); ch = true;
              emit(v, 'r:osad-kwas', `Osad ${s.n} roztwarza się w kwasie – zachodzi zobojętnienie.`, key === 'Ag2O' ? 'Ag2O + 2H^+ → 2Ag^+ + H2O' : `${key} + ${nOH}H^+ → ${s.kat} + ${nOH}H2O`);
            }
          }
        }
      }
      // szybkie redoks
      x = lim(v, { 'MnO4^-': -2, 'H2O2': -5, 'H^+': -6 });
      if (x > EPS) { rx(v, x, { 'MnO4^-': -2, 'H2O2': -5, 'H^+': -6, 'Mn^2+': 2, 'g:O2': 5 }); ch = true; emit(v, 'r:MnO4-H2O2', 'Fioletowy roztwór natychmiast się odbarwia i pieni – manganian(VII) utlenia nadtlenek wodoru do tlenu, a sam redukuje się do bezbarwnych jonów Mn²⁺.', '2MnO4^- + 5H2O2 + 6H^+ → 2Mn^2+ + 5O2↑ + 8H2O'); }
      if (A(v, 'H^+') < EPS) {
        x = lim(v, { 'MnO4^-': -2, 'H2O2': -3 });
        if (x > EPS) { rx(v, x, { 'MnO4^-': -2, 'H2O2': -3, 's:MnO2kol': 2, 'g:O2': 3, 'OH^-': 2 }); ch = true; emit(v, 'r:MnO4-H2O2-obojetny', 'Bez kwasu manganian(VII) redukuje się tylko do brunatnego osadu tlenku manganu(IV) – a ten dalej katalizuje rozkład wody utlenionej!', '2MnO4^- + 3H2O2 → 2MnO2↓ + 3O2↑ + 2OH^- + 2H2O'); }
      }
      x = lim(v, { 'MnO4^-': -1, 'Fe^2+': -5, 'H^+': -8 });
      if (x > EPS) { rx(v, x, { 'MnO4^-': -1, 'Fe^2+': -5, 'H^+': -8, 'Mn^2+': 1, 'Fe^3+': 5 }); ch = true; emit(v, 'r:MnO4-Fe', 'Manganian(VII) odbarwia się – utlenia jony Fe²⁺ do Fe³⁺ (roztwór lekko żółknie).', 'MnO4^- + 5Fe^2+ + 8H^+ → Mn^2+ + 5Fe^3+ + 4H2O'); }
      x = lim(v, { 'I2': -1, 'S2O3^2-': -2 });
      if (x > EPS) { rx(v, x, { 'I2': -1, 'S2O3^2-': -2, 'I^-': 2, 'S4O6^2-': 1 }); ch = true; if (x > 1e-6) emit(v, 'r:jod-tiosiarczan', 'Brunatna barwa jodu znika – tiosiarczan redukuje jod z powrotem do bezbarwnych jodków.', 'I2 + 2S2O3^2- → 2I^- + S4O6^2-'); }
      x = lim(v, { 'Cu^2+': -2, 'I^-': -4 });
      if (x > EPS) { rx(v, x, { 'Cu^2+': -2, 'I^-': -4, 'I2': 1 }); if (!R.SOLID.CuI) R.SOLID.CuI = { n: 'jodek miedzi(I)', col: '#efe7da', form: 'osad', tex: 'drob' }; addS(v, 'CuI', 2 * x, 1); ch = true; emit(v, 'r:Cu-I', 'Roztwór brunatnieje od wydzielonego jodu, a na dno opada jasny osad jodku miedzi(I) – jony Cu²⁺ utleniają jodki.', '2Cu^2+ + 4I^- → 2CuI↓ + I2'); }
      for (const [kat, n] of [['Cu^2+', 1], ['Pb^2+', 1], ['Ag^+', 2]]) {
        x = lim(v, { 'H2S': -1, [kat]: -n });
        if (x > EPS) { rx(v, x, { 'H2S': -1, [kat]: -n, 'H^+': 2 }); const key = R.sol(kat, 'S^2-', true); addS(v, key, x, 1); ch = true; emit(v, 'osad:' + key, `Siarkowodór strąca czarny osad – ${R.SOLID[key].n}.`, `H2S + ${n > 1 ? n : ''}${kat} → ${key}↓ + 2H^+`); }
      }
      // białko + metale ciężkie
      if (A(v, 'bialko') > EPS) {
        const heavy = (A(v, 'Cu^2+') + A(v, 'Pb^2+') + A(v, 'Ag^+')) / L(v);
        const ph = R.liczPH(v);
        if (heavy > 0.002 && ph < 10) {
          const y = A(v, 'bialko'); addA(v, 'bialko', -y); addS(v, 'bialkoS', y, 1); ch = true;
          emit(v, 'r:denat', 'Białko ścina się w kłaczki – sole metali ciężkich powodują denaturację. Dlatego są trujące (pierwsza pomoc: mleko lub surowe białko).', null, { powod: 'metal' });
        } else if (ph > 11.3) {
          const cu = A(v, 'Cu^2+') + S(v, 'Cu(OH)2');
          if (cu > EPS) {
            const y = Math.min(cu, A(v, 'bialko') * 20);
            const z = Math.min(S(v, 'Cu(OH)2'), y); addS(v, 'Cu(OH)2', -z); addA(v, 'Cu^2+', -(y - z));
            addA(v, 'biuret', y); ch = true;
            emit(v, 'r:biuret', 'Reakcja biuretowa: w zasadowym środowisku jony miedzi(II) tworzą z wiązaniami peptydowymi fioletowy kompleks – dowód na obecność białka.', 'białko + Cu^2+ (OH^-) → fioletowy kompleks');
          }
        }
      }
      if (!ch) break;
    }
    rozpuscOsadyMaxC(v);
  }

  /* ---------- reakcje powolne (kinetyka) ---------- */
  function kinetyka(v, dt) {
    const tf = Math.min(60, Math.max(0.15, Math.pow(2, (v.T - 20) / 10)));
    const Lv = L(v), mokre = v.liq > 0.3;
    const cH = mokre ? A(v, 'H^+') / Lv : 0;
    const cAc = mokre ? A(v, 'CH3COOH') / Lv : 0;
    const cHe = cH + 0.04 * cAc;
    const cOH = mokre ? A(v, 'OH^-') / Lv : 0;
    const stirF = v.stir > 0 ? 2.5 : 1;
    const zuzyjKwas = (need) => { const hs = Math.min(need, A(v, 'H^+')); addA(v, 'H^+', -hs); const r = need - hs; if (r > 0) { addA(v, 'CH3COOH', -r); addA(v, 'CH3COO^-', r); } };
    const kwasDost = () => A(v, 'H^+') + A(v, 'CH3COOH');

    for (const key of Object.keys(v.sol)) {
      const s = R.SOLID[key]; const n = S(v, key);
      if (!s || n < EPS) continue;
      const area = 0.004 + 0.6 * n;
      if (s.metal) {
        const M = s.metal, ak = AKT[M];
        if (mokre && ak.woda) {
          const r = Math.min(n, ak.woda * area * tf * dt * (cH > 0.1 ? 1.5 : 1));
          if (r > EPS) {
            rx(v, r, { ['s:' + key]: -1, [ak.ion]: 1, 'OH^-': ak.q, 'g:H2': ak.q / 2 }, ak.dHw);
            emit(v, 'r:' + M + '-woda', ak.txtW, ak.eqW);
            if (M === 'K') v.kFlame = 1;
          }
          continue;
        }
        if (mokre && cHe > 0.01 && ak.kwas) {
          let r = ak.kwas * Math.min(cHe, 4) * area * tf * stirF * dt;
          r = Math.min(r, n, kwasDost() / ak.q);
          if (r > EPS) {
            zuzyjKwas(r * ak.q); addS(v, key, -r); addA(v, ak.ion, r); gas(v, 'H2', r * ak.q / 2); heat(v, -ak.dHk * r);
            emit(v, 'r:metal-kwas:' + M, ak.txtK + (cH < 0.01 ? ' (W słabym kwasie octowym reakcja jest wolniejsza.)' : ''), ak.eqK);
          }
        }
        if (M === 'Mg' && mokre && cHe < 0.01 && v.T > 60) {
          const r = Math.min(n, 0.004 * area * tf * dt);
          if (r > EPS) { rx(v, r, { 's:Mg': -1, 'Mg^2+': 1, 'OH^-': 2, 'g:H2': 1 }, -350); emit(v, 'r:Mg-woda', 'Magnez powoli reaguje z gorącą wodą – wydzielają się pęcherzyki wodoru, a powstający wodorotlenek magnezu nadaje roztworowi odczyn zasadowy.', 'Mg + 2H2O → Mg(OH)2 + H2↑'); }
        }
        if (M === 'Cu' && mokre && cH > 0.3 && A(v, 'NO3^-') > EPS) {
          let r = 0.01 * area * tf * Math.min(cH, 4) * dt;
          r = Math.min(r, n, A(v, 'H^+') * 3 / 8, A(v, 'NO3^-') * 3 / 2);
          if (r > EPS) { rx(v, r, { 's:Cu': -1, 'H^+': -8 / 3, 'NO3^-': -2 / 3, 'Cu^2+': 1, 'g:NO2': 2 / 3 }, -120); emit(v, 'r:Cu-HNO3', 'Miedź roztwarza się w kwasie azotowym(V)! Roztwór niebieszczeje, a nad nim pojawia się brunatny tlenek azotu(IV). Kwas azotowy jest utleniaczem, więc radzi sobie nawet z miedzią.', '3Cu + 8HNO3 → 3Cu(NO3)2 + 2NO↑ + 4H2O'); }
        }
        if ((M === 'Cu' || M === 'Ag') && mokre && cH > 0.1 && A(v, 'NO3^-') < EPS) {
          v.cuIdle += dt;
          if (v.cuIdle > 3) emit(v, 'r:brak:Cu', 'Miedź leży w kwasie i nic się nie dzieje. Miedź stoi w szeregu aktywności za wodorem, więc nie wypiera go z kwasu.', null);
        }
        if ((M === 'Al' || M === 'Zn') && mokre && cOH > 0.2) {
          const k = M === 'Al' ? 0.02 : 0.004;
          let r = k * area * tf * Math.min(cOH, 4) * dt;
          r = Math.min(r, n, A(v, 'OH^-') / (M === 'Al' ? 1 : 2));
          if (r > EPS) {
            if (M === 'Al') { rx(v, r, { 's:Al': -1, 'OH^-': -1, '[Al(OH)4]^-': 1, 'g:H2': 1.5 }, -420); emit(v, 'r:Al-NaOH', 'Glin roztwarza się w zasadzie sodowej i wydziela się wodór! Glin to metal amfoteryczny – reaguje i z kwasami, i z zasadami.', '2Al + 2NaOH + 6H2O → 2Na[Al(OH)4] + 3H2↑'); }
            else { rx(v, r, { 's:Zn': -1, 'OH^-': -2, '[Zn(OH)4]^2-': 1, 'g:H2': 1 }, -150); emit(v, 'r:Zn-NaOH', 'Cynk powoli roztwarza się w stężonej zasadzie, wydzielając wodór – jest metalem amfoterycznym.', 'Zn + 2NaOH + 2H2O → Na2[Zn(OH)4] + H2↑'); }
          }
        }
        if (mokre && !ak.woda) {
          for (const ion in ION2MET) {
            const Mn = ION2MET[ion];
            if (Mn === M || AKT[Mn].a <= ak.a) continue;
            const ci = A(v, ion) / Lv; if (ci < 1e-4) continue;
            const qM = ak.q, qN = R.ION[ion].q;
            let r = 0.03 * ci * area * tf * stirF * dt;
            r = Math.min(r, S(v, key), A(v, ion) * qN / qM);
            if (r > EPS) {
              addS(v, key, -r); addA(v, ak.ion, r); addA(v, ion, -r * qM / qN); addS(v, Mn, r * qM / qN, 0, true);
              heat(v, 150 * r * qM / qN);
              emit(v, 'r:wypieranie:' + Mn, TXT_WYP[Mn](M), eqWyp(M, Mn, qM, qN));
            }
          }
        }
        continue;
      }
      // tlenki metali
      const tl = TLENKI[key];
      if (tl && mokre) {
        if (tl.woda && cHe < 0.01) {
          const r = Math.min(n, tl.woda * area * tf * stirF * dt);
          if (r > EPS) { addS(v, key, -r); addA(v, tl.ion, r * tl.n); addA(v, 'OH^-', r * tl.n * tl.q); if (tl.dHw) heat(v, -tl.dHw * r); emit(v, tl.keyW || 'r:tlenek-woda:' + key, tl.txtW, tl.eqW); }
        } else if (cHe > 0.01) {
          let r = tl.k * Math.min(cHe, 4) * area * tf * stirF * dt;
          r = Math.min(r, n, kwasDost() / (tl.n * tl.q));
          if (r > EPS) { zuzyjKwas(r * tl.n * tl.q); addS(v, key, -r); addA(v, tl.ion, r * tl.n); heat(v, 60 * r); if (tl.txt) emit(v, 'r:tlenek-kwas:' + key, tl.txt, tl.eq); }
        }
        continue;
      }
      // węglany + kwas
      const wegl = key === 'CaCO3m' || (s.dyn && s.an === 'CO3^2-');
      if (wegl && mokre && cHe > 0.004) {
        const kat = key === 'CaCO3m' ? 'Ca^2+' : s.kat; const nk = key === 'CaCO3m' ? 1 : s.ions[kat];
        const k = key === 'CaCO3m' ? 0.03 : 0.5;
        let r = k * Math.min(cHe, 4) * area * tf * stirF * dt;
        r = Math.min(r, n, kwasDost() / 2);
        if (r > EPS) {
          zuzyjKwas(2 * r); addS(v, key, -r); addA(v, kat, r * nk); gas(v, 'CO2', r);
          const f = key === 'CaCO3m' ? 'CaCO3' : key;
          emit(v, 'r:weglan-kwas', 'Węglan burzy się w kwasie – wydzielają się pęcherzyki tlenku węgla(IV), a ciało stałe znika.', `${f} + 2H^+ → ${nk > 1 ? nk : ''}${kat} + H2O + CO2↑`);
        }
      }
      if ((key === 'CaCO3' || key === 'CaCO3m') && mokre && A(v, 'CO2') > EPS && A(v, 'OH^-') < EPS) {
        let r = 3.0 * (A(v, 'CO2') / Lv) * area * dt;
        r = Math.min(r, n, A(v, 'CO2'));
        if (r > EPS) { rx(v, r, { ['s:' + key]: -1, 'CO2': -1, 'Ca^2+': 1, 'HCO3^-': 2 }); emit(v, 'r:woda-wapienna-klar', 'Mętny osad węglanu wapnia znika – nadmiar CO₂ zamienia go w rozpuszczalny wodorowęglan wapnia. Tak powstaje twarda woda i jaskinie krasowe!', 'CaCO3 + CO2 + H2O → Ca(HCO3)2'); }
      }
      // siarczki + kwas
      if ((key === 'FeS' || key === 'ZnS') && mokre && cH > 0.05) {
        let r = 0.05 * Math.min(cH, 4) * area * tf * stirF * dt; r = Math.min(r, n, A(v, 'H^+') / 2);
        if (r > EPS) { const kat = key === 'FeS' ? 'Fe^2+' : 'Zn^2+'; rx(v, r, { ['s:' + key]: -1, 'H^+': -2, [kat]: 1, 'g:H2S': 1 }); emit(v, 'r:h2s', `Siarczek roztwarza się w kwasie i czuć zapach zgniłych jaj – wydziela się trujący siarkowodór!`, `${key} + 2H^+ → ${kat} + H2S↑`); }
      }
    }

    // nadtlenek wodoru
    const nP = A(v, 'H2O2');
    if (nP > EPS && mokre) {
      let k = 0.0006, kat = null;
      const mn = S(v, 'MnO2') + S(v, 'MnO2kol');
      if (mn > EPS) { k += 0.5 * Math.min(1, mn * 300); kat = 'MnO2'; }
      const cI = A(v, 'I^-') / Lv; if (cI > 1e-4) { k += 1.2 * cI; kat = kat || 'KI'; }
      const cFe = A(v, 'Fe^3+') / Lv; if (cFe > 1e-4) { k += 0.6 * cFe; kat = kat || 'Fe'; }
      if (S(v, 'ziemniak') > EPS && v.T < 65) { k += 0.35; kat = kat || 'katalaza'; }
      const r = Math.min(nP, k * tf * nP * dt);
      rx(v, r, { 'H2O2': -1, 'g:O2': 0.5 }, -98);
      if (A(v, 'deterg') > EPS) v.foam += r * 0.5 * 20000;
      if (kat === 'KI' && A(v, 'I^-') > EPS) { const y = Math.min(r * 0.004, A(v, 'I^-') / 2); addA(v, 'I^-', -2 * y); addA(v, 'I2', y); }
      const rate = r / dt;
      if (kat && rate > (kat === 'KI' ? 1e-3 : 1e-4)) {
        const T = {
          MnO2: ['r:katalizator:MnO2', 'Z braunsztynem woda utleniona burzliwie się rozkłada – wydziela się tlen. Tlenek manganu(IV) to katalizator: przyspiesza reakcję, a sam się nie zużywa.', '2H2O2 → 2H2O + O2↑ (MnO2)'],
          KI: ['r:katalizator:KI', 'Jodek potasu katalizuje rozkład nadtlenku wodoru – wydziela się mnóstwo tlenu.', '2H2O2 → 2H2O + O2↑ (KI)'],
          Fe: ['r:katalizator:Fe', 'Jony żelaza(III) katalizują rozkład nadtlenku wodoru.', '2H2O2 → 2H2O + O2↑ (Fe^3+)'],
          katalaza: ['r:katalaza', 'Ziemniak pieni się w wodzie utlenionej! Enzym katalaza (biokatalizator) błyskawicznie rozkłada H₂O₂ na wodę i tlen. Ugotowany ziemniak tego nie potrafi – enzym ulega denaturacji.', '2H2O2 → 2H2O + O2↑ (katalaza)']
        }[kat];
        emit(v, T[0], T[1], T[2]);
      }
      if (A(v, 'deterg') > EPS && rate > 0.0015) emit(v, 'r:slon', 'Pasta do zębów dla słonia! Tlen z gwałtownego rozkładu nadtlenku wodoru spienia detergent w ogromny, ciepły wał piany.', '2H2O2 → 2H2O + O2↑');
    }
    // jodki + H2O2 (zegar jodowy)
    const cI = A(v, 'I^-') / Lv, cP = A(v, 'H2O2') / Lv;
    if (mokre && cI > 1e-4 && cP > 1e-4) {
      let x = 0.03 * cP * cI * (1 + 8 * cH) * tf * Lv * dt;
      x = Math.min(x, A(v, 'H2O2'), A(v, 'I^-') / 2);
      if (x > 0) {
        if (A(v, 'H^+') >= 2 * x) rx(v, x, { 'H2O2': -1, 'I^-': -2, 'H^+': -2, 'I2': 1 });
        else rx(v, x, { 'H2O2': -1, 'I^-': -2, 'I2': 1, 'OH^-': 2 });
        if (A(v, 'I2') > 1e-5 && !A(v, 'skrobia')) emit(v, 'r:jodki-H2O2', 'Roztwór brunatnieje – nadtlenek wodoru utlenia jodki do jodu.', 'H2O2 + 2I^- + 2H^+ → I2 + 2H2O');
      }
    }
    if (mokre && A(v, 'Fe^3+') > EPS && cI > 1e-4) {
      let x = 0.5 * (A(v, 'Fe^3+') / Lv) * cI * tf * Lv * dt;
      x = Math.min(x, A(v, 'Fe^3+'), A(v, 'I^-'));
      if (x > EPS) { rx(v, x, { 'Fe^3+': -1, 'I^-': -1, 'Fe^2+': 1, 'I2': 0.5 }); emit(v, 'r:Fe3-I', 'Roztwór brunatnieje – jony Fe³⁺ utleniają jodki do jodu, a same redukują się do Fe²⁺.', '2Fe^3+ + 2I^- → 2Fe^2+ + I2'); }
    }
    // tiosiarczan + kwas → siarka koloidalna
    if (A(v, 'S2O3^2-') > EPS) v.hadThio = true;
    const cS = A(v, 'S2O3^2-') / Lv;
    if (mokre && cS > 1e-5 && cH > 1e-3) {
      if (v.thioT == null) v.thioT = R.czas;
      let x = 0.0016 * cS * cH * tf * Lv * dt;
      x = Math.min(x, A(v, 'S2O3^2-'), A(v, 'H^+') / 2);
      if (x > 0) {
        addA(v, 'S2O3^2-', -x); addA(v, 'H^+', -2 * x); addS(v, 'Skol', x, 1); v.head.SO2 = (v.head.SO2 || 0) + x;
        if (!v.thioDone && S(v, 'Skol') / Lv > 0.0015) {
          v.thioDone = true;
          const t = R.czas - v.thioT;
          emit(v, 'r:siarka-koloid', `Roztwór zmętniał od żółtawobiałej siarki koloidalnej po ${t.toFixed(1).replace('.', ',')} s (temperatura ${Math.round(v.T)} °C).`, 'S2O3^2- + 2H^+ → S↓ + SO2↑ + H2O', { t, T: v.T });
        }
      }
    }
    // kameleon chemiczny
    const cukry = A(v, 'C6H12O6') + A(v, 'C12H22O11');
    if (mokre && cukry > EPS) {
      if (A(v, 'MnO4^-') > EPS && cOH > 0.05) {
        const x = Math.min(A(v, 'MnO4^-'), 0.1 * tf * A(v, 'MnO4^-') * dt + 1e-12);
        rx(v, x, { 'MnO4^-': -1, 'MnO4^2-': 1 });
        emit(v, 'r:kameleon-1', 'Fiolet ciemnieje i przechodzi w zieleń – manganian(VII) redukuje się do zielonego manganianu(VI).', 'MnO4^- + e^- → MnO4^2-');
      }
      if (A(v, 'MnO4^2-') > EPS && cOH > 0.02) {
        const x = Math.min(A(v, 'MnO4^2-'), 0.045 * tf * A(v, 'MnO4^2-') * dt + 1e-12);
        rx(v, x, { 'MnO4^2-': -1, 's:MnO2kol': 1, 'OH^-': 2 });
        if (S(v, 'MnO2kol') > 1e-5) emit(v, 'r:kameleon', 'Kameleon chemiczny: zieleń przechodzi w żółtobrązowy kolor – powstaje zawiesina tlenku manganu(IV). Mangan zmienił stopień utlenienia z VII przez VI na IV.', 'MnO4^- → MnO4^2- → MnO2');
      }
      if (A(v, 'MnO4^-') > EPS && cH > 0.1) {
        const x = Math.min(A(v, 'MnO4^-'), 0.03 * tf * A(v, 'MnO4^-') * dt);
        rx(v, x, { 'MnO4^-': -1, 'Mn^2+': 1 });
        emit(v, 'r:MnO4-cukier', 'W kwasie manganian(VII) powoli odbarwia się, utleniając cukier.', null);
      }
    }
    // próba Trommera
    const glu = A(v, 'C6H12O6');
    if (mokre && S(v, 'Cu(OH)2') > EPS && glu > EPS && v.T > 60) {
      let x = 0.05 * tf * S(v, 'Cu(OH)2') * dt;
      x = Math.min(x, S(v, 'Cu(OH)2') / 2, glu);
      if (x > EPS) { rx(v, x, { 's:Cu(OH)2': -2, 'C6H12O6': -1, 's:Cu2O': 1 }); emit(v, 'r:trommer', 'Próba Trommera: niebieski osad zmienia barwę przez żółtą na ceglastoczerwoną – powstaje tlenek miedzi(I). Glukoza ma właściwości redukujące (grupa aldehydowa).', 'C5H11O5CHO + 2Cu(OH)2 → C5H11O5COOH + Cu2O↓ + 2H2O'); }
    } else if (S(v, 'Cu(OH)2') > EPS && v.T > 70 && glu < EPS && A(v, 'bialko') < EPS) {
      const x = Math.min(S(v, 'Cu(OH)2'), 0.03 * tf * S(v, 'Cu(OH)2') * dt);
      const sp = v.susp['Cu(OH)2'] || 0;
      addS(v, 'Cu(OH)2', -x); addS(v, 'CuO', x, sp);
      emit(v, 'r:rozklad:CuOH2', 'Niebieski osad czernieje – wodorotlenek miedzi(II) rozkłada się na czarny tlenek miedzi(II) i wodę.', 'Cu(OH)2 → CuO + H2O');
    }
    // próba Tollensa
    const ag = A(v, '[Ag(NH3)2]^+');
    if (mokre && ag > EPS && glu > EPS && v.T > 35) {
      let x = 0.08 * tf * ag * dt; x = Math.min(x, ag, glu * 2);
      if (x > EPS) { rx(v, x, { '[Ag(NH3)2]^+': -1, 'C6H12O6': -0.5, 'NH3': 2, 's:Aglustro': 1 }); v.mirror = Math.min(1, S(v, 'Aglustro') * 3000); emit(v, 'r:lustro', 'Lustro srebrne! Ścianki naczynia pokrywają się lśniącą warstwą metalicznego srebra (próba Tollensa). Glukoza zredukowała jony srebra.', 'C5H11O5CHO + Ag2O → C5H11O5COOH + 2Ag↓'); }
    }
    // białko
    const nB = A(v, 'bialko');
    if (mokre && (nB > EPS || S(v, 'bialkoS') > EPS)) {
      if (A(v, 'NO3^-') > EPS && cH > 0.5 && v.T > 45) {
        const x1 = Math.min(nB, 0.4 * nB * dt * tf / 4 + 1e-12), x2 = Math.min(S(v, 'bialkoS'), 0.3 * S(v, 'bialkoS') * dt * tf / 4 + 1e-12);
        addA(v, 'bialko', -x1); addS(v, 'bialkoS', -x2); addS(v, 'bialkoN', x1 + x2, 1);
        emit(v, 'r:ksanto', 'Reakcja ksantoproteinowa: białko z kwasem azotowym(V) ścina się i żółknie (nitrują się pierścienie aromatyczne). Po dodaniu zasady barwa zmieni się na pomarańczową.', 'białko + HNO3 → żółty produkt');
      } else if (nB > EPS) {
        const etF = v.liq > 0 ? v.etoh / v.liq : 0;
        let powod = null;
        if (v.T > 62) powod = 'temperatura'; else if (etF > 0.3) powod = 'etanol'; else if (cH > 1.5) powod = 'kwas';
        if (powod) {
          const x = Math.min(nB, nB * dt * (powod === 'temperatura' ? tf / 40 : 3) + 1e-12);
          addA(v, 'bialko', -x); addS(v, 'bialkoS', x, 1);
          const T = { temperatura: 'Białko ścina się w białe kłaczki – to denaturacja pod wpływem temperatury (jak przy gotowaniu jajka). Tego procesu nie da się odwrócić.', etanol: 'Alkohol ścina białko w białe kłaczki – to denaturacja.', kwas: 'Stężony kwas ścina białko – to denaturacja.' };
          emit(v, 'r:denat', T[powod], null, { powod });
        }
      }
    }
    // estryfikacja
    if (mokre && A(v, 'CH3COOH') > EPS && A(v, 'C2H5OH') > EPS && v.T > 50 && A(v, 'SO4^2-') > EPS && cH > 0.8) {
      let x = 0.02 * tf * Math.min(A(v, 'CH3COOH'), A(v, 'C2H5OH')) * dt;
      x = Math.min(x, A(v, 'CH3COOH') * 0.7 - A(v, 'CH3COOC2H5') * 0.1);
      if (x > EPS) { rx(v, x, { 'CH3COOH': -1, 'C2H5OH': -1, 'CH3COOC2H5': 1 }); emit(v, 'r:ester', 'Estryfikacja: kwas octowy i etanol w obecności stężonego kwasu siarkowego(VI) tworzą octan etylu. Powąchaj – czuć owocowy zapach!', 'CH3COOH + C2H5OH ⇌ CH3COOC2H5 + H2O'); }
    }
    // wąż z cukru
    const suc = S(v, 'C12H22O11') + A(v, 'C12H22O11');
    if (suc > EPS && v.liq > 0.1 && cH > 12) {
      let x = (0.04 + 0.2 * Math.min(1, (v.T - 20) / 60)) * tf * suc * dt + 1e-12;
      x = Math.min(x, suc);
      const zs = Math.min(x, S(v, 'C12H22O11')); addS(v, 'C12H22O11', -zs); addA(v, 'C12H22O11', -(x - zs));
      addS(v, 'Cwaz', 12 * x, 0); gas(v, 'H2O', 11 * x); heat(v, 160 * x); v.head.SO2 = (v.head.SO2 || 0) + x * 0.3;
      emit(v, 'r:waz', 'Cukier czernieje, pęcznieje i wyrasta z naczynia jak czarny wąż! Stężony kwas siarkowy(VI) odbiera cukrowi wodę – zostaje porowaty węgiel spulchniony parą wodną.', 'C12H22O11 → 12C + 11H2O (H2SO4 stęż.)');
    }
    // Fe(OH)2 → Fe(OH)3 (tlen z powietrza)
    if (S(v, 'Fe(OH)2') > EPS) {
      const x = Math.min(S(v, 'Fe(OH)2'), 0.025 * S(v, 'Fe(OH)2') * dt * (v.stir > 0 ? 4 : 1));
      const sp = v.susp['Fe(OH)2'] || 0; addS(v, 'Fe(OH)2', -x); R.sol('Fe^3+', 'OH^-', true); addS(v, 'Fe(OH)3', x, sp);
      if (S(v, 'Fe(OH)3') > S(v, 'Fe(OH)2') * 0.4) emit(v, 'r:FeOH2-utl', 'Zielonkawy osad wodorotlenku żelaza(II) brunatnieje – utlenia się tlenem z powietrza do wodorotlenku żelaza(III).', '4Fe(OH)2 + O2 + 2H2O → 4Fe(OH)3');
    }
    // bezwodne sole + woda
    for (const k of ['CuSO4', 'CoCl2']) {
      if (S(v, k) > EPS && v.liq > 0.0005) {
        const s = R.SOLID[k]; const wodaMol = v.liq / 18;
        let x = Math.min(S(v, k), wodaMol / s.hydrN, 3 * (S(v, k) + 0.001) * dt);
        if (x > EPS) {
          addS(v, k, -x); addS(v, s.hydr, x); v.liq = Math.max(0, v.liq - x * s.hydrN * 18); heat(v, -s.dH * x);
          if (k === 'CuSO4') emit(v, 'r:hydrat:CuSO4', 'Biały, bezwodny siarczan(VI) miedzi(II) niebieszczeje i się nagrzewa – przyłącza wodę, tworząc hydrat. To prosty test na obecność wody!', 'CuSO4 + 5H2O → CuSO4·5H2O');
          else emit(v, 'r:hydrat:CoCl2', 'Niebieski chlorek kobaltu(II) różowieje po zetknięciu z wodą – tworzy hydrat.', 'CoCl2 + 6H2O → CoCl2·6H2O');
        }
      }
    }
    // termiczne
    const sucho = v.liq < 0.01;
    for (const t of TERM) {
      const n = S(v, t.k); if (n < EPS || v.T < t.T || (t.sucho && !sucho)) continue;
      const r = Math.min(n, (0.12 + 0.02 * (v.T - t.T)) * (n + 0.0005) * dt);
      rx(v, r, Object.assign({ ['s:' + t.k]: -1 }, t.p), 30);
      emit(v, t.key, t.txt, t.eq);
    }
    // Fe + S
    if (sucho && v.T > 250 && S(v, 'Fe') > EPS && S(v, 'S') > EPS) {
      const x = Math.min(S(v, 'Fe'), S(v, 'S'), 0.6 * (Math.min(S(v, 'Fe'), S(v, 'S')) + 0.0005) * dt);
      rx(v, x, { 's:Fe': -1, 's:S': -1, 's:FeS': 1 }, -100); v.glow = 1;
      emit(v, 'r:FeS', 'Mieszanina żelaza i siarki rozżarza się – zachodzi synteza siarczku żelaza(II). Reakcja sama się podtrzymuje, bo wydziela ciepło.', 'Fe + S → FeS');
    }
    // spalanie
    if (sucho) {
      if (!v.burn) {
        for (const k in SPAL) if (S(v, k) > EPS && v.T > SPAL[k].T) {
          if (R.VT[v.typ].otwarty) { v.burn = k; break; }
          if (!v.dryHint && (k === 'Mg' || k === 'S' || k === 'C' || k === 'Fe')) { v.dryHint = true; emit(v, 'r:wsk-tygiel', 'Do spalania potrzeba tlenu z powietrza. Spalaj substancje w tyglu – to otwarte naczynie, które stoi prosto w płomieniu.', null); }
        }
      }
      if (v.burn) {
        const sp = SPAL[v.burn]; const n = S(v, v.burn);
        if (n < EPS) { v.burn = null; }
        else {
          const x = Math.min(n, sp.rate * (n + 0.002) * dt);
          rx(v, x, Object.assign({ ['s:' + v.burn]: -1 }, sp.p), sp.dH);
          v.T = Math.max(v.T, sp.T + 100);
          if (v.burn === 'Mg') v.flash = 1;
          emit(v, sp.key, sp.txt, sp.eq);
        }
      }
    } else if (v.burn) v.burn = null;
    // etanol w ogniu
    if (v.etohFire) {
      if (v.etoh < 0.05 || v.liq < 0.05 || v.etoh / v.liq < 0.25) v.etohFire = false;
      else {
        const d = Math.min(v.etoh, 0.35 * dt);
        v.etoh -= d; v.liq -= d; const mol = d * 0.789 / 46.07; addA(v, 'C2H5OH', -mol);
        gas(v, 'CO2', 2 * mol); heat(v, 1367 * mol * 0.3);
        emit(v, 'r:spalanie:etanol', 'Etanol pali się spokojnym, prawie niewidocznym, niebieskim płomieniem. Powstają CO₂ i para wodna.', 'C2H5OH + 3O2 → 2CO2 + 3H2O');
      }
    }
    if (v.burner && R.VT[v.typ].otwarty && v.etoh > 0.1 && v.liq > 0 && v.etoh / v.liq > 0.4) v.etohFire = true;
    // ucieczka gazów rozpuszczonych
    if (mokre) {
      const nh3 = A(v, 'NH3');
      if (nh3 > EPS) { const r = Math.min(nh3, (0.004 + 0.08 * Math.max(0, v.T - 40) / 60) * nh3 * dt); addA(v, 'NH3', -r); if (r > 1e-7) gas(v, 'NH3', r); else v.head.NH3 = (v.head.NH3 || 0) + r; }
      const co2 = A(v, 'CO2');
      if (co2 > EPS) { const r = Math.min(co2, (0.03 + 0.3 * Math.max(0, v.T - 30) / 70) * co2 * dt); addA(v, 'CO2', -r); gas(v, 'CO2', r); }
      const h2s = A(v, 'H2S');
      if (h2s > EPS) { const r = Math.min(h2s, 0.15 * h2s * dt); addA(v, 'H2S', -r); gas(v, 'H2S', r); }
    }
  }

  /* ---------- rozpuszczanie i krystalizacja ---------- */
  function obecneJony(v, s) {
    if (s.mol) return A(v, s.mol);
    let p = Infinity; for (const j in s.ions) p = Math.min(p, A(v, j) / s.ions[j]); return p === Infinity ? 0 : p;
  }
  function rozpuszczanie(v, dt) {
    if (v.liq <= 0.3) return;
    const wodaG = Math.max(0, v.liq - v.etoh) + (v.typ ? 0 : 0);
    const etF = v.liq > 0 ? v.etoh / v.liq : 0;
    const stirF = v.stir > 0 ? 2.5 : 1;
    for (const key of Object.keys(v.sol)) {
      const s = R.SOLID[key]; if (!s || !s.sol || s.hydr) continue;
      const n = S(v, key); if (n < EPS) continue;
      const M = R.M(key);
      let capG = s.sol(v.T) * wodaG / 100; if (etF > 0.5 && !s.mol) capG *= 0.1;
      const cap = capG / M;
      const deficit = cap - obecneJony(v, s);
      if (deficit <= EPS) continue;
      const r = Math.min(n, deficit, (0.004 + 0.2 * n) * stirF * (1 + Math.max(0, v.T - 20) / 25) * dt);
      addS(v, key, -r);
      if (s.mol) addA(v, s.mol, r); else for (const j in s.ions) addA(v, j, r * s.ions[j]);
      if (s.dH) heat(v, -s.dH * r);
      if (key === 'KMnO4') emit(v, 'r:rozp:KMnO4', 'Kryształki manganianu(VII) potasu rozpuszczają się, a fioletowe smugi rozchodzą się po całej wodzie – to dyfuzja.', null);
      else if (key === 'CuSO4·5H2O') emit(v, 'r:rozp:CuSO4', 'Niebieskie kryształy rozpuszczają się, a woda niebieszczeje od jonów Cu²⁺.', 'CuSO4 → Cu^2+ + SO4^2-');
      else if (!s.dyn && !s.mol) emit(v, 'r:rozp:' + key, `${s.n[0].toUpperCase() + s.n.slice(1)} rozpuszcza się w wodzie – kryształ rozpada się na jony.`, null);
    }
    // jod: słabo rozpuszczalny (lepiej z jodkami)
    if (S(v, 'I2') > EPS) {
      const cap = 0.0012 * L(v) + A(v, 'I^-') * 0.8 + (etF > 0.4 ? 0.2 * L(v) : 0);
      const d = cap - A(v, 'I2');
      if (d > EPS) { const r = Math.min(S(v, 'I2'), d, (0.0005 + 0.05 * S(v, 'I2')) * stirF * dt); addS(v, 'I2', -r); addA(v, 'I2', r); }
    }
    // krystalizacja z roztworu przesyconego
    for (const key in R.SOLID) {
      const s = R.SOLID[key]; if (!s.sol || s.dyn || s.hydr) continue;
      const pres = obecneJony(v, s); if (pres < EPS) continue;
      let capG = s.sol(v.T) * wodaG / 100; if (etF > 0.5 && !s.mol) capG *= 0.1;
      const cap = capG / R.M(key);
      if (pres > cap * 1.02 + 1e-6) {
        const x = (pres - cap) * Math.min(1, 1.5 * dt);
        if (s.mol) addA(v, s.mol, -x); else for (const j in s.ions) addA(v, j, -x * s.ions[j]);
        addS(v, key, x, 0); if (s.dH) heat(v, s.dH * x);
        emit(v, 'r:krystalizacja', `Z roztworu wypadają kryształy – ${s.n}. W tej temperaturze roztwór był przesycony (więcej substancji się nie mieści).`, null, { key, T: v.T });
      }
    }
  }

  /* ---------- odparowanie do sucha ---------- */
  function wysusz(v) {
    v.liq = 0; v.etoh = 0;
    const powstale = [];
    const add = (k, n) => { if (n > EPS) { addS(v, k, n, 0); if (!powstale.includes(k)) powstale.push(k); } };
    const aq = v.aq; v.aq = {};
    const MOLS = { 'C12H22O11': 'C12H22O11', 'C6H12O6': 'C6H12O6', 'skrobia': 'skrobia', 'I2': 'I2', 'bialko': 'bialkoS' };
    const jony = {};
    for (const sp in aq) {
      const n = aq[sp];
      if (MOLS[sp]) { add(MOLS[sp], n); continue; }
      if (sp === 'NH3') { v.head.NH3 = (v.head.NH3 || 0) + n; continue; }
      if (!R.ION[sp]) continue;
      jony[sp] = (jony[sp] || 0) + n;
    }
    const rozbij = (sp, prod) => { const n = jony[sp]; if (!n) return; delete jony[sp]; for (const k in prod) jony[k] = (jony[k] || 0) + prod[k] * n; };
    rozbij('[Cu(NH3)4]^2+', { 'Cu^2+': 1 }); rozbij('[Ag(NH3)2]^+', { 'Ag^+': 1 }); rozbij('[Zn(NH3)4]^2+', { 'Zn^2+': 1 });
    rozbij('FeSCN^2+', { 'Fe^3+': 1, 'SCN^-': 1 }); rozbij('[Al(OH)4]^-', { 'Al^3+': 1, 'OH^-': 4 }); rozbij('[Zn(OH)4]^2-', { 'Zn^2+': 1, 'OH^-': 4 });
    if (jony['HCO3^-']) { const n = jony['HCO3^-']; delete jony['HCO3^-']; jony['CO3^2-'] = (jony['CO3^2-'] || 0) + n / 2; v.head.CO2 = (v.head.CO2 || 0) + n / 2; }
    // kwasy lotne uciekają
    if (jony['H^+']) {
      let h = jony['H^+']; delete jony['H^+'];
      for (const an of ['Cl^-', 'NO3^-', 'CH3COO^-', 'HSO3^-', 'SO4^2-']) {
        if (!jony[an] || h <= 0) continue; const q = -R.ION[an].q; const y = Math.min(jony[an], h / q); jony[an] -= y; h -= y * q;
        if (an === 'Cl^-') v.head.HCl = (v.head.HCl || 0) + y;
      }
    }
    const kat = [], ani = [];
    for (const sp in jony) if (jony[sp] > EPS) (R.ION[sp].q > 0 ? kat : ani).push([sp, jony[sp] * Math.abs(R.ION[sp].q)]);
    kat.sort((a, b) => b[1] - a[1]); ani.sort((a, b) => b[1] - a[1]);
    let i = 0, j = 0;
    while (i < kat.length && j < ani.length) {
      const e = Math.min(kat[i][1], ani[j][1]);
      const w = R.wzorSoli(kat[i][0], ani[j][0]);
      const key = R.sol(kat[i][0], ani[j][0], !!R.PRECIP.find(p => p[0] === kat[i][0] && p[1] === ani[j][0]));
      add(key, e / (R.ION[kat[i][0]].q * w.nk));
      kat[i][1] -= e; ani[j][1] -= e;
      if (kat[i][1] < EPS) i++; if (ani[j][1] < EPS) j++;
    }
    if (powstale.length) emit(v, 'r:krystalizacja', 'Woda odparowała do sucha – na dnie zostały kryształy: ' + powstale.map(k => R.SOLID[k].n).join(', ') + '.', null, { sucho: true, keys: powstale, T: v.T });
    else emit(v, 'r:odparowanie', 'Woda odparowała do sucha – na dnie nic nie zostało (była czysta albo zawierała tylko substancje lotne).', null, { sucho: true, keys: [] });
  }

  /* ---------- krok fizyki ---------- */
  function krokNaczynia(v, dt) {
    const vt = R.VT[v.typ];
    const C = R.pojemnoscC(v);
    let Q = 0;
    if (v.burner) Q += vt.P * dt;
    const Tenv = v.ice ? 1 : R.TAMB;
    const h = v.ice ? 7 : vt.h * (1 + Math.max(0, v.T - 100) / 200);
    Q -= h * (v.T - Tenv) * dt;
    v.T += Q / C;
    kinetyka(v, dt);
    szybkie(v);
    rozpuszczanie(v, dt);
    if (v.liq > 0) {
      const etF = v.etoh / v.liq;
      const cH = A(v, 'H^+') / L(v);
      let bp = 100 - 22 * Math.min(1, etF / 0.9);
      if (cH > 10) bp = Math.min(300, 100 + (cH - 10) * 9);
      if (v.T > bp) {
        const nadmiar = (v.T - bp) * C; v.T = bp;
        let dm = nadmiar / 1200;
        if (dm > 0) {
          const de = Math.min(v.etoh, dm * Math.min(1, 2.2 * etF));
          if (de > 0) { const molE = A(v, 'C2H5OH') * de / Math.max(v.etoh, 1e-9); addA(v, 'C2H5OH', -molE); v.etoh -= de; }
          v.liq -= dm; v.evAcc += dm;
          const nh3 = A(v, 'NH3'); if (nh3 > EPS) { addA(v, 'NH3', -nh3 * 0.5); gas(v, 'NH3', nh3 * 0.5); }
          emit(v, 'r:wrzenie', 'Ciecz wrze! Temperatura zatrzymała się na ' + Math.round(bp) + ' °C, bo całe dostarczane ciepło idzie na parowanie.', null);
          if (v.liq < 0.02) wysusz(v);
        }
      }
      if (v.ice && v.T < 0.5) v.T = 0.5;
    }
    if (v.T > vt.maxT) v.T = vt.maxT;
    if (v.T < -5) v.T = -5;

    if (v.liq > 0 && v.liq < 0.005) wysusz(v);

    // fizyka zawiesin
    if (v.stir > 0) v.stir -= dt;
    for (const k in v.sol) {
      const s = R.SOLID[k]; if (!s) continue;
      const ciezkie = s.metal || ['kawalek', 'grudki', 'granulki', 'wstazka', 'blaszka', 'folia', 'opilki', 'waz', 'lustro', 'nalot'].includes(s.form);
      if (ciezkie) { v.susp[k] = 0; continue; }
      let sp = v.susp[k] || 0;
      if (v.stir > 0 && v.liq > 0.3) sp = Math.min(1, sp + dt * 2.5);
      else {
        const rate = { gal: 0.035, ser: 0.08, drob: 0.05, kr: 0.2, kol: 0.003, kl: 0.03 }[s.tex] || (s.form === 'krysztaly' ? 0.6 : 0.3);
        sp = Math.max(0, sp - rate * dt * (v.liq > 0.3 ? 1 : 10));
      }
      v.susp[k] = sp;
    }
    // olej i woda
    if (v.oil > 0 && v.liq > 0.3) {
      const det = A(v, 'deterg') > EPS;
      if (v.stir > 0) v.emul = Math.min(1, v.emul + dt * (det ? 1.2 : 0.5));
      else v.emul = Math.max(0, v.emul - dt * (det ? 0.004 : 0.22));
      if (det && v.emul > 0.8) emit(v, 'r:emulsja', 'Powstała trwała emulsja: detergent otoczył kropelki oleju i rozproszył je w wodzie. Ciecz zrobiła się mleczna i już się nie rozwarstwia.', null);
      if (!v.warstwy && v.emul < 0.05) { v.warstwy = true; emit(v, 'r:warstwy', 'Olej i woda tworzą dwie warstwy – olej nie miesza się z wodą i, jako lżejszy, pływa na wierzchu. Taka mieszanina to mieszanina niejednorodna.', null); }
    }
    v.foam *= Math.exp(-dt / 30);
    if (v.foam < 0.5) v.foam = 0;
    // pęcherzyki, pary, gaz nad cieczą
    v.bub += (v.gacc / dt - v.bub) * Math.min(1, dt * 3); v.gacc = 0;
    v.bubIn += (v.binAcc / dt - v.bubIn) * Math.min(1, dt * 3); v.binAcc = 0;
    v.steam += (v.evAcc / dt - v.steam) * Math.min(1, dt * 2); v.evAcc = 0;
    for (const g in v.vapAcc) { v.vap[g] = (v.vap[g] || 0) + (v.vapAcc[g] / dt - (v.vap[g] || 0)) * Math.min(1, dt * 2); }
    v.vapAcc = {};
    for (const g in v.vap) { v.vap[g] *= Math.exp(-dt / 1.5); if (v.vap[g] < 1e-7) delete v.vap[g]; }
    for (const g in v.head) { const tau = g === 'H2' ? 4 : g === 'CO2' ? 14 : g === 'NO2' ? 12 : 9; v.head[g] *= Math.exp(-dt / tau); if (v.head[g] < 1e-9) delete v.head[g]; }
    v.flash = Math.max(0, v.flash - dt * 1.5); v.kFlame = Math.max(0, v.kFlame - dt * 0.8); v.glow = Math.max(0, v.glow - dt * 0.5);
    v.chemDT *= Math.exp(-dt / 8);
    if (v.chemDT > 9 && !v.egzoDone && !v.burner) { v.egzoDone = true; emit(v, 'r:egzo', 'Naczynie robi się wyraźnie cieplejsze – to proces egzotermiczny: energia chemiczna zamienia się w ciepło oddawane otoczeniu.', null, { T: v.T }); }
    if (v.chemDT < 2) v.egzoDone = false;
    if (v.chemDT < -4 && !v.endoDone && !v.burner) { v.endoDone = true; emit(v, 'r:endo', 'Naczynie robi się zimne – to proces endotermiczny: pochłania ciepło z otoczenia.', null, { T: v.T }); }
    if (v.chemDT > -1) v.endoDone = false;

    // obserwator: wskaźniki, skrobia
    v.pH = R.liczPH(v);
    if (v.pH !== null) {
      for (const sp in v.aq) {
        if (!sp.startsWith('w:')) continue;
        const ind = sp.slice(2), I = R.IND[ind]; const k = I.kol(v.pH); const nm = k ? k[0] : 'bezbarwny';
        const prev = v.indPrev[ind];
        if (prev !== nm) {
          v.indPrev[ind] = nm;
          if (k) emit(v, 'wsk:' + ind + ':' + nm, `${I.n[0].toUpperCase() + I.n.slice(1)} przyjmuje barwę: ${nm} (pH ≈ ${v.pH.toFixed(1).replace('.', ',')}).`, null);
          if (ind === 'php' && (prev === 'różowy' || prev === 'malinowy') && !k) emit(v, 'r:odbarwienie', 'Malinowa barwa znika – zasada została zobojętniona, pH spadło poniżej 8,2.', 'NaOH + HCl → NaCl + H2O');
        }
      }
    }
    if (A(v, 'I2') > 3e-7 && A(v, 'skrobia') > EPS) {
      emit(v, 'r:skrobia', 'Granatowe zabarwienie! Jod tworzy ze skrobią barwny kompleks – tak wykrywa się skrobię.', 'skrobia + I2 → granatowy kompleks');
      if (v.hadThio) emit(v, 'r:zegar', `Nagle cały roztwór granatowieje (po ${(R.czas - v.tMix).toFixed(1).replace('.', ',')} s)! Najpierw tiosiarczan zużywał powstający jod, a gdy się skończył – jod zabarwił skrobię. To zegar jodowy.`, 'H2O2 + 2I^- + 2H^+ → I2 + 2H2O', { t: R.czas - v.tMix });
    }
    if (S(v, 'ziemniak') > EPS && A(v, 'I2') > 1e-7) { v.ziemBlue = Math.min(1, v.ziemBlue + dt); emit(v, 'r:skrobia', 'Ziemniak granatowieje pod wpływem jodu – zawiera skrobię!', 'skrobia + I2 → granatowy kompleks'); }
    if (v.oil + v.liq > R.VT[v.typ].cap * 1.02) { const nad = v.oil + v.liq - R.VT[v.typ].cap; R.ubytek(v, nad / Math.max(0.001, v.liq + v.oil)); v.spill = 1; }
    v.spill = Math.max(0, v.spill - dt);
  }

  R.krok = function (dt) {
    const n = Math.max(1, Math.ceil(dt / 0.05)); const h = dt / n;
    for (let i = 0; i < n; i++) { R.czas += h; for (const v of R.naczynia) krokNaczynia(v, h); }
  };

  /* ---------- operacje ---------- */
  // proporcjonalne zmniejszenie zawartości ciekłej (wylanie części)
  R.ubytek = function (v, f) {
    f = Math.max(0, Math.min(1, f));
    v.liq *= 1 - f; v.etoh *= 1 - f; v.oil *= 1 - f; v.foam *= 1 - f;
    for (const s in v.aq) v.aq[s] *= 1 - f;
    for (const k in v.sol) { const sp = v.susp[k] || 0; if (sp > 0) { v.sol[k] *= 1 - f * sp; if (v.sol[k] < 1e-12) delete v.sol[k]; } }
  };
  R.wylej = function (v) { const { id, typ, burner, ice, tube } = v; v.reset(); Object.assign(v, { id, typ, burner, ice, tube }); };

  // dodanie odczynnika; zwraca komunikat lub null
  R.dodaj = function (v, reag, idx) {
    const kind = reag.kind;
    const cap = R.VT[v.typ].cap;
    const zajete = v.liq + v.oil;
    v.tMix = R.czas;
    if (kind === 'w') {
      const d = R.DAWKI.w[idx][0]; const ml = d * 0.05;
      if (v.liq < 0.2) { v.liq += ml; }
      else v.liq += ml;
      addA(v, 'w:' + reag.ind, d); delete v.indPrev[reag.ind];
      return null;
    }
    if (kind === 's' || kind === 'm') {
      let g = R.DAWKI[kind][idx][0];
      const key = reag.s; const mol = g / R.M(key);
      const C0 = R.pojemnoscC(v);
      addS(v, key, mol, 0);
      v.T = (C0 * v.T + g * 0.8 * R.TAMB) / (C0 + g * 0.8);
      if (kind === 'm' && (key === 'Na' || key === 'K') && g >= 1) return 'Uwaga: w szkolnej pracowni używa się kawałków wielkości ziarnka grochu. Większy kawałek sodu czy potasu może wybuchnąć!';
      return null;
    }
    let ml = R.DAWKI.r[idx][0];
    if (zajete + ml > cap) ml = cap - zajete;
    if (ml <= 0.001) return 'Naczynie jest już pełne!';
    const C0 = R.pojemnoscC(v);
    let msg = null, heatPo = 0;
    if (kind === 'o') { v.oil += ml; }
    else if (kind === 'e') { v.liq += ml; v.etoh += ml * 0.96; addA(v, 'C2H5OH', ml * 0.789 * 0.96 / 46.07); }
    else {
      const cHprzed = v.liq > 0.05 ? A(v, 'H^+') / L(v) : 0;
      if (kind !== 'k' && cHprzed > 14 && v.liq > 0) {
        msg = 'NIEBEZPIECZNIE! Wlałeś wodę do stężonego kwasu – ciecz gwałtownie się zagotowała i prysnęła! Zapamiętaj: „Pamiętaj, chemiku młody, wlewaj zawsze kwas do wody”.';
        emit(v, 'r:pryskanie', 'Pryskanie! Woda wlana do stężonego kwasu siarkowego(VI) natychmiast się zagotowała i wyrzuciła krople kwasu. Zawsze wlewaj kwas do wody, nigdy odwrotnie!', null);
        v.spill = 1.5; heat(v, v.pool * 0.6 + 2); v.pool *= 0.4;
      } else if (kind !== 'k' && v.pool > 0) {
        const f = Math.min(1, ml / Math.max(1, v.liq)); heat(v, v.pool * f); v.pool *= 1 - f;
      }
      if (kind === 'k') {
        const n = reag.c * ml / 1000;
        const W = v.liq;
        const f = W > 0 ? W / (W + 2 * ml) : 0;
        v.pool += 70 * n * (1 - f);
        heatPo = 70 * n * f;
        if (W > 5 && cHprzed < 5) emit(v, 'r:rozcienczanie-ok', 'Kwas wlany do wody – dobrze! Roztwór mocno się ogrzewa, ale nie pryska, bo ciepło rozchodzi się w dużej ilości wody.', null);
      }
      v.liq += ml;
      for (const sp in reag.sp) addA(v, sp, reag.c * ml / 1000 * reag.sp[sp]);
    }
    const Cadd = (kind === 'o' ? 1.8 : 4.0) * ml;
    v.T = (C0 * v.T + Cadd * R.TAMB) / (C0 + Cadd);
    if (heatPo) heat(v, heatPo);
    if (zajete + ml >= cap - 0.001 && R.DAWKI.r[idx][0] > ml + 0.001) return msg || 'Naczynie się przepełniło – nadmiar się wylał.';
    return msg;
  };

  // przelanie zawartości (ciecz + zawiesiny + drobne ciała stałe)
  R.przelej = function (a, b) {
    if (a === b) return 'To to samo naczynie.';
    const wolne = R.VT[b.typ].cap - b.liq - b.oil;
    const obj = a.liq + a.oil;
    const lekkie = k => { const s = R.SOLID[k]; return s && !s.metal && !['kawalek', 'grudki', 'granulki', 'wstazka', 'blaszka', 'folia', 'opilki', 'waz', 'lustro', 'nalot'].includes(s.form); };
    const sucheSol = Object.keys(a.sol).filter(lekkie);
    if (obj < 0.01 && !sucheSol.length) return 'W tym naczyniu nie ma nic, co dałoby się przelać lub przesypać.';
    if (wolne <= 0.01 && obj > 0.01) return 'Docelowe naczynie jest pełne.';
    const f = obj > 0.01 ? Math.min(1, wolne / obj) : 1;
    const Ca = R.pojemnoscC(a) - R.VT[a.typ].glass, Cb = R.pojemnoscC(b);
    const Cprz = Ca * f;
    b.T = (Cb * b.T + Cprz * a.T) / (Cb + Cprz || 1);
    b.liq += a.liq * f; b.etoh += a.etoh * f; b.oil += a.oil * f; b.foam += a.foam * f * 0.3; b.pool += a.pool * f;
    for (const s in a.aq) { addA(b, s, a.aq[s] * f); }
    for (const k of Object.keys(a.sol)) {
      if (!lekkie(k)) continue;
      const sp = obj > 0.01 ? Math.max(a.susp[k] || 0, 0.6) : 1;
      const m = a.sol[k] * f * sp;
      addS(b, k, m, Math.max(a.susp[k] || 0, 0.5)); addS(a, k, -m);
    }
    if (a.hadThio) b.hadThio = true;
    if (a.mirror) { /* lustro zostaje na ściankach */ }
    a.liq *= 1 - f; a.etoh *= 1 - f; a.oil *= 1 - f; a.foam *= 1 - f; a.pool *= 1 - f;
    for (const s in a.aq) { a.aq[s] *= 1 - f; if (a.aq[s] < 1e-13) delete a.aq[s]; }
    b.tMix = R.czas; b.stir = 1.0;
    for (const k in b.indPrev) delete b.indPrev[k];
    return f < 0.999 ? 'Przelano tylko część – więcej się nie zmieściło.' : null;
  };

  /* ---------- testy ---------- */
  const PROG = 1.5e-5;
  R.test = function (v, narz) {
    const h = v.head, ma = g => (h[g] || 0) > PROG || (v.bub > 1e-4 && (h[g] || 0) > PROG * 0.3);
    let r;
    if (narz === 'zarzace') {
      if (ma('O2')) r = { ok: true, key: 'test:zarzace:O2', txt: 'Żarzące się łuczywko rozbłyska jasnym płomieniem – w naczyniu jest TLEN!', efekt: 'rozblysk' };
      else if (ma('CO2') || ma('NH3')) r = { key: 'test:zarzace:gasnie', txt: 'Łuczywko gaśnie – gaz nad cieczą nie podtrzymuje palenia.', efekt: 'gasnie' };
      else r = { key: 'test:zarzace:nic', txt: 'Łuczywko dalej się tli – nie ma tu tlenu w większej ilości niż w powietrzu.', efekt: 'tli' };
    } else if (narz === 'plonace') {
      if (v.etoh > 0.1 && v.liq > 0 && v.etoh / v.liq > 0.4) { v.etohFire = true; r = { ok: true, key: 'test:plonace:etanol', txt: 'Etanol zapala się od łuczywka spokojnym, niebieskim płomieniem!', efekt: 'plomien' }; }
      else if (ma('H2')) { h.H2 = 0; r = { ok: true, key: 'test:pyk', txt: 'PYK! Charakterystyczny, cichy wybuch – w naczyniu był WODÓR, który spalił się z tlenem z powietrza.', efekt: 'pyk', eq: '2H2 + O2 → 2H2O' }; }
      else if (ma('CO2')) r = { ok: true, key: 'test:plonace:CO2', txt: 'Płonące łuczywko natychmiast gaśnie – to tlenek węgla(IV), który nie podtrzymuje palenia (stąd gaśnice śniegowe).', efekt: 'gasnie' };
      else if (ma('O2')) r = { key: 'test:plonace:O2', txt: 'Płomień łuczywka staje się jaśniejszy i większy – tlen podtrzymuje palenie.', efekt: 'rozblysk' };
      else if (ma('NH3') || ma('H2O')) r = { key: 'test:plonace:gasnie', txt: 'Łuczywko przygasa.', efekt: 'gasnie' };
      else r = { key: 'test:plonace:nic', txt: 'Łuczywko pali się dalej – nic szczególnego się nie dzieje.', efekt: 'plomien' };
    } else if (narz === 'papierek') {
      if (ma('NH3')) r = { ok: true, key: 'test:papier-NH3', txt: 'Wilgotny papierek trzymany nad naczyniem niebieszczeje – ulatnia się gaz o odczynie zasadowym: AMONIAK.' + (v.liq > 0.05 && v.pH !== null ? ` (Sama ciecz ma pH ≈ ${Math.round(v.pH)}.)` : ''), efekt: 'papierek', kol: R.uniKolor(10.5), data: { gaz: 'NH3' } };
      else if (v.liq > 0.05 && v.pH !== null) {
        const ph = v.pH;
        r = { key: 'test:papier', txt: `Papierek wskaźnikowy zabarwił się na kolor ${R.uniNazwa(ph)} – pH ≈ ${Math.max(0, Math.min(14, Math.round(ph)))}. Odczyn ${ph < 6.5 ? 'kwasowy' : ph > 7.5 ? 'zasadowy' : 'obojętny'}.`, efekt: 'papierek', kol: R.uniKolor(ph), data: { pH: ph, ac: A(v, 'CH3COOH') > EPS, cl: A(v, 'Cl^-') > EPS } };
      } else if (ma('NH3')) r = { ok: true, key: 'test:papier-NH3', txt: 'Wilgotny papierek nad naczyniem niebieszczeje – ulatnia się gaz o odczynie zasadowym: AMONIAK.', efekt: 'papierek', kol: R.uniKolor(10.5), data: { gaz: 'NH3' } };
      else if (ma('HCl') || ma('SO2') || ma('NO2')) r = { key: 'test:papier-kwas', txt: 'Wilgotny papierek nad naczyniem czerwienieje – ulatnia się gaz o odczynie kwasowym.', efekt: 'papierek', kol: R.uniKolor(2), data: { gaz: 'kwas' } };
      else r = { key: 'test:papier-sucho', txt: 'W naczyniu nie ma cieczy, a nad nim nie ulatnia się żaden gaz, który zmieniłby barwę papierka.', efekt: 'papierek', kol: [230, 200, 120] };
    } else if (narz === 'wapienna') {
      if (ma('CO2')) r = { ok: true, key: 'r:woda-wapienna-mleko', txt: 'Woda wapienna mętnieje – to dowód, że gaz to tlenek węgla(IV)! Powstał nierozpuszczalny węglan wapnia.', efekt: 'wapienna', eq: 'Ca(OH)2 + CO2 → CaCO3↓ + H2O' };
      else r = { key: 'test:wapienna:nic', txt: 'Woda wapienna pozostaje klarowna – w gazie nad naczyniem nie ma CO₂.', efekt: 'wapienna0' };
    } else if (narz === 'nos') {
      const z = [];
      if (ma('NH3') || A(v, 'NH3') / L(v) > 0.05) z.push(['NH3', 'ostry, duszący zapach amoniaku']);
      if (ma('H2S') || A(v, 'H2S') > EPS) z.push(['H2S', 'zapach zgniłych jaj (siarkowodór – trujący!)']);
      if (ma('SO2')) z.push(['SO2', 'duszący zapach palonej zapałki (SO₂)']);
      if (ma('NO2')) z.push(['NO2', 'drażniący, gryzący zapach – lepiej się odsunąć!']);
      if (ma('HCl')) z.push(['HCl', 'drażniący, kwaśny zapach chlorowodoru']);
      if (A(v, 'CH3COOC2H5') > 1e-5) z.push(['ester', 'przyjemny, owocowy zapach (jak gruszki albo klej)']);
      if (A(v, 'CH3COOH') / L(v) > 0.05 && v.liq > 0.05) z.push(['ocet', 'kwaśny zapach octu']);
      if (v.etoh > 0.2) z.push(['etanol', 'charakterystyczny zapach alkoholu']);
      if (ma('I2')) z.push(['I2', 'ostry zapach jodu']);
      if (S(v, 'karmel') > EPS) z.push(['karmel', 'słodki zapach karmelu']);
      if (S(v, 'Cwaz') > EPS || S(v, 'C') > EPS && (v.T > 100)) z.push(['spalenizna', 'zapach spalenizny']);
      if (z.length) r = { ok: true, key: 'test:zapach:' + (z.find(x => x[0] === 'ester') || z[0])[0], txt: 'Ostrożnie, ruchem dłoni kierujesz opary do nosa… Czuć: ' + z.map(x => x[1]).join('; ') + '.', efekt: 'nos', data: { co: z.map(x => x[0]) } };
      else r = { key: 'test:zapach:brak', txt: 'Ostrożnie wąchasz (ruchem dłoni kierując opary do nosa) – brak wyraźnego zapachu.', efekt: 'nos', data: { co: [] } };
    }
    if (r) emit(v, r.key, r.txt, r.eq || null, r.data);
    return r;
  };

  // próba płomieniowa
  R.probaPlomienia = function (v) {
    const ile = {};
    const dodajKat = (j, n) => { const p = R.ION[j] && R.ION[j].plomien; if (p) ile[p] = (ile[p] || 0) + n; };
    for (const sp in v.aq) dodajKat(sp, v.aq[sp]);
    for (const k in v.sol) { const s = R.SOLID[k]; if (!s) continue; if (s.ions) for (const j in s.ions) dodajKat(j, v.sol[k] * s.ions[j]); if (s.metal && R.PLOMIEN[s.metal]) ile[s.metal] = (ile[s.metal] || 0) + v.sol[k]; if (k === '[Cu(NH3)4]^2+') dodajKat('Cu^2+', v.sol[k]); }
    if (A(v, '[Cu(NH3)4]^2+') > EPS) ile.Cu = (ile.Cu || 0) + A(v, '[Cu(NH3)4]^2+');
    const el = Object.keys(ile).filter(k => ile[k] > 1e-7).sort((a, b) => ile[b] - ile[a]);
    let r;
    if (!el.length) r = { kol: [120, 160, 255], el: null, txt: 'Płomień się nie zmienia – w próbce nie ma pierwiastków barwiących płomień.' };
    else {
      let glowny = el[0];
      const tot = el.reduce((s, k) => s + ile[k], 0);
      if (ile.Na && ile.Na > tot * 0.08) glowny = 'Na';
      const P = R.PLOMIEN[glowny];
      const NAZ = { Na: 'sodu', K: 'potasu', Li: 'litu', Ca: 'wapnia', Sr: 'strontu', Ba: 'baru', Cu: 'miedzi' };
      let txt = `Płomień barwi się na kolor ${P.n} – to znak obecności ${NAZ[glowny]}.`;
      if (glowny === 'Na' && el.length > 1) txt += ' Uwaga: intensywny żółty kolor sodu potrafi zagłuszyć barwy innych pierwiastków!';
      r = { kol: P.kol, el: glowny, txt };
      emit(v, 'plomien:' + glowny, txt, null, { el: glowny });
    }
    return r;
  };

  // słomka: dmuchanie CO2 z płuc
  R.dmuchnij = function (v, n) {
    if (v.liq < 0.5) return 'Najpierw nalej do naczynia trochę cieczy.';
    addA(v, 'CO2', n); v.co2In = R.czas; v.binAcc += n * 3; emit(v, 'test:slomka', null, null);
    return null;
  };

  /* ---------- barwy ---------- */
  R.kolorCieczy = function (v) {
    let c = [1, 1, 1], al = 0;
    const Lv = L(v);
    const mix = (rgb, a) => { if (a <= 0.002) return; a = Math.min(1, a); for (let i = 0; i < 3; i++) c[i] *= 1 - a + a * rgb[i] / 255; al = 1 - (1 - al) * (1 - a * 0.95); };
    for (const sp in v.aq) {
      const n = v.aq[sp]; if (n <= 0) continue;
      const info = R.ION[sp] || R.MOL[sp];
      if (sp.startsWith('w:')) {
        const I = R.IND[sp.slice(2)]; const k = v.pH !== null ? I.kol(v.pH) : null;
        if (k) mix(k[1], 1 - Math.exp(-0.015 * n / Lv / (sp === 'w:php' ? 1 : 1.4)));
        continue;
      }
      if (sp === 'I2' && A(v, 'skrobia') > EPS) { mix([25, 25, 95], 1 - Math.exp(-6000 * n / Lv)); continue; }
      if (info && info.col) mix(info.col, 1 - Math.exp(-info.k * n / Lv));
    }
    if (A(v, 'skrobia') > EPS && A(v, 'I2') < 3e-7) al = Math.max(al, 0.08);
    if (A(v, 'bialko') > EPS) { mix([250, 245, 225], 0.25); }
    return { r: Math.round(c[0] * 255), g: Math.round(c[1] * 255), b: Math.round(c[2] * 255), a: al };
  };
  R.metnosc = function (v) {
    let tot = 0, c = [0, 0, 0];
    const Lv = L(v);
    for (const k in v.sol) {
      const sp = v.susp[k] || 0; if (sp <= 0.001) continue;
      const s = R.SOLID[k]; if (!s) continue;
      const a = Math.min(1, (v.sol[k] * sp / Lv) / (s.tex === 'kol' ? 0.004 : 0.012));
      if (a <= 0) continue;
      const col = kolorSolid(k, v);
      for (let i = 0; i < 3; i++) c[i] += col[i] * a;
      tot += a;
    }
    if (v.emul > 0.02 && v.oil > 0) { const a = v.emul * 0.8; for (let i = 0; i < 3; i++) c[i] += [250, 245, 215][i] * a; tot += a; }
    if (tot <= 0) return null;
    return { col: c.map(x => Math.round(x / tot)), a: Math.min(0.92, tot) };
  };
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function kolorSolid(k, v) {
    const s = R.SOLID[k];
    if (k === 'bialkoN' && v && v.pH > 8) return [240, 140, 40];
    if (k === 'ziemniak' && v && v.ziemBlue > 0) { const a = hex2rgb(s.col), b = [40, 40, 110]; return a.map((x, i) => Math.round(x + (b[i] - x) * v.ziemBlue)); }
    return hex2rgb(s.col);
  }
  R.kolorSolid = kolorSolid;
  R.hex2rgb = hex2rgb;

  /* ---------- opis zawartości ---------- */
  R.sklad = function (v) {
    const out = [];
    const Lv = L(v);
    for (const sp in v.aq) {
      const n = v.aq[sp]; if (n < 1e-8) continue;
      if (sp.startsWith('w:')) { out.push({ typ: 'wsk', sp, n, nazwa: R.IND[sp.slice(2)].n }); continue; }
      const jon = R.ION[sp], mol = R.MOL[sp];
      out.push({ typ: jon ? (jon.q > 0 ? 'kat' : 'an') : 'mol', sp, n, c: v.liq > 0.05 ? n / Lv : null, nazwa: jon ? jon.nazwa : mol ? mol.n : sp, f: mol && mol.f ? mol.f : sp });
    }
    for (const k in v.sol) {
      const n = v.sol[k]; if (n < 1e-8) continue;
      const s = R.SOLID[k];
      out.push({ typ: 'sol', sp: k, n, g: n * R.M(k), nazwa: s.n, f: s.f || k, osad: s.form === 'osad' || s.dyn });
    }
    return out;
  };
})();
