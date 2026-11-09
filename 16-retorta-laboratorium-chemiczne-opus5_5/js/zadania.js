/* Retorta – księga odkryć i zadania */
'use strict';
(function () {
  /* ---------- księga odkryć ---------- */
  const O = [];
  const dod = (key, kat, n, ik, hint) => O.push({ key, kat, n, ik, hint });
  // osady
  const widz = new Set();
  R.PRECIP.forEach(p => {
    const w = R.wzorSoli(p[0], p[1]); if (widz.has(w.f)) return; widz.add(w.f);
    dod('osad:' + w.f, 'osady', `${R.nazwaSoli(p[0], p[1])} (${R.uni(w.f)})`, null, `Połącz jony ${R.uni(p[0])} i ${R.uni(p[1])}`);
    O[O.length - 1].kol = p[2]; O[O.length - 1].opis = p[3];
  });
  // gazy
  for (const g in R.GAZ) dod('gaz:' + g, 'gazy', `${R.GAZ[g].n} (${R.uni(g)})`, '💨', R.GAZ[g].opis);
  // płomienie
  const PL = { Na: 'sód', K: 'potas', Li: 'lit', Ca: 'wapń', Sr: 'stront', Ba: 'bar', Cu: 'miedź' };
  for (const e in R.PLOMIEN) { dod('plomien:' + e, 'plomienie', `Płomień: ${PL[e]} – ${R.PLOMIEN[e].n}`, '🔥', `Próba płomieniowa soli zawierającej ${PL[e]}`); O[O.length - 1].kol = 'rgb(' + R.PLOMIEN[e].kol.join(',') + ')'; }
  // wskaźniki
  const KOL_IND = { php: ['różowy', 'malinowy'], mo: ['czerwony', 'pomarańczowy', 'żółty'], lak: ['czerwony', 'fioletowy', 'niebieski'], uni: ['czerwony', 'pomarańczowy', 'żółty', 'zielony', 'niebieskozielony', 'niebieski', 'fioletowy'], kap: ['czerwony', 'różowy', 'fioletowy', 'niebieski', 'niebieskozielony', 'zielony', 'żółty'], btb: ['żółty', 'zielony', 'niebieski'] };
  const PROBKI = { php: [7, 9, 12], mo: [1, 3.8, 6], lak: [2, 6.5, 10], uni: [1, 3.5, 5.5, 7, 8.5, 10, 12.5], kap: [1.5, 4, 6, 7.8, 9.5, 11.5, 13.5], btb: [4, 6.8, 9] };
  for (const i in KOL_IND) KOL_IND[i].forEach((k, j) => {
    dod(`wsk:${i}:${k}`, 'wskazniki', `${R.IND[i].n[0].toUpperCase() + R.IND[i].n.slice(1)} – ${k}`, '🎨', `Zmień odczyn roztworu z dodatkiem wskaźnika: ${R.IND[i].n}`);
    const ph = PROBKI[i][i === 'php' ? j + 1 : j]; const kk = R.IND[i].kol(ph); if (kk) O[O.length - 1].kol = 'rgb(' + kk[1].join(',') + ')';
  });
  // reakcje
  const RE = [
    ['r:zobojetnianie', 'Zobojętnianie kwasu zasadą', '⚖️', 'Połącz kwas z zasadą'],
    ['r:odbarwienie', 'Znikająca malina', '🫧', 'Odbarw fenoloftaleinę w zasadzie'],
    ['r:co2-kwas', 'Węglan + kwas = CO₂', '🫧', 'Węglan lub wodorowęglan w kwasie'],
    ['r:weglan-kwas', 'Marmur w kwasie', '🪨', 'Ciało stałe – węglan – i kwas'],
    ['r:woda-wapienna-mleko', 'Mleczna woda wapienna', '🥛', 'CO₂ i woda wapienna'],
    ['r:woda-wapienna-klar', 'Woda wapienna znów klarowna', '💧', 'Dużo CO₂ i zmętniała woda wapienna'],
    ['r:h2s', 'Zapach zgniłych jaj', '🥚', 'Siarczek i kwas'],
    ['r:chromian', 'Chromian → dichromian', '🟠', 'Żółty chromian w kwasie'],
    ['r:dichromian', 'Dichromian → chromian', '🟡', 'Pomarańczowy dichromian w zasadzie'],
    ['r:krew', 'Krwawa reakcja', '🩸', 'Jony Fe³⁺ i rodanek'],
    ['r:amfoter:Al', 'Amfoteryczny glin', '🔄', 'Wodorotlenek glinu i nadmiar zasady'],
    ['r:amfoter:Zn', 'Amfoteryczny cynk', '🔄', 'Wodorotlenek cynku i nadmiar zasady'],
    ['r:miedz-amon', 'Lazurowy kompleks miedzi', '💙', 'Osad Cu(OH)₂ i nadmiar amoniaku'],
    ['r:Zn-NH3', 'Kompleks amoniakalny cynku', '⚪', 'Zn(OH)₂ i nadmiar amoniaku'],
    ['r:Ag-NH3', 'AgCl znika w amoniaku', '🫥', 'Biały osad halogenku srebra i amoniak'],
    ['r:tollens-odczynnik', 'Odczynnik Tollensa', '🧴', 'Brunatny Ag₂O i amoniak'],
    ['r:osad-kwas', 'Osad roztwarza się w kwasie', '🧪', 'Wodorotlenek metalu i kwas'],
    ['r:MnO4-H2O2', 'Odbarwienie nadmanganianu', '💜', 'KMnO₄, kwas i woda utleniona'],
    ['r:MnO4-H2O2-obojetny', 'Brunatny braunsztyn z KMnO₄', '🟤', 'KMnO₄ i woda utleniona bez kwasu'],
    ['r:MnO4-Fe', 'KMnO₄ utlenia żelazo(II)', '💜', 'KMnO₄, kwas i jony Fe²⁺'],
    ['r:jod-tiosiarczan', 'Tiosiarczan gasi jod', '🤍', 'Brązowy jod i tiosiarczan'],
    ['r:Cu-I', 'Miedź(II) utlenia jodki', '🟫', 'Jony Cu²⁺ i jodki'],
    ['r:Fe3-I', 'Żelazo(III) utlenia jodki', '🟫', 'Jony Fe³⁺ i jodki'],
    ['r:jodki-H2O2', 'Woda utleniona utlenia jodki', '🟫', 'Jodek potasu i woda utleniona'],
    ['r:Na-woda', 'Sód na wodzie', '💥', 'Sód i woda'],
    ['r:K-woda', 'Potas w płomieniach', '🔥', 'Potas i woda'],
    ['r:Li-woda', 'Lit na wodzie', '🫧', 'Lit i woda'],
    ['r:Ca-woda', 'Wapń w wodzie', '🫧', 'Wapń i woda'],
    ['r:Mg-woda', 'Magnez w gorącej wodzie', '♨️', 'Magnez i bardzo gorąca woda'],
    ['r:metal-kwas:Mg', 'Magnez w kwasie', '⚡', 'Magnez i kwas'],
    ['r:metal-kwas:Zn', 'Cynk w kwasie', '⚡', 'Cynk i kwas'],
    ['r:metal-kwas:Fe', 'Żelazo w kwasie', '⚡', 'Żelazo i kwas'],
    ['r:metal-kwas:Al', 'Glin w kwasie', '⚡', 'Glin i kwas'],
    ['r:brak:Cu', 'Miedź się nie poddaje', '🛡️', 'Miedź i kwas solny'],
    ['r:Cu-HNO3', 'Miedź w kwasie azotowym', '🟤', 'Miedź i kwas azotowy(V)'],
    ['r:Al-NaOH', 'Glin w zasadzie', '⚡', 'Glin i stężona zasada'],
    ['r:Zn-NaOH', 'Cynk w zasadzie', '⚡', 'Cynk i stężona zasada'],
    ['r:wypieranie:Cu', 'Miedziowanie', '🟠', 'Aktywny metal i roztwór soli miedzi'],
    ['r:wypieranie:Ag', 'Srebrne drzewko', '🌲', 'Miedź i roztwór soli srebra'],
    ['r:wypieranie:Pb', 'Ołowiane drzewko', '🌳', 'Cynk i roztwór soli ołowiu'],
    ['r:wypieranie:Fe', 'Wypieranie żelaza', '🔩', 'Aktywny metal i sól żelaza(II)'],
    ['r:wapno-gaszenie', 'Gaszenie wapna', '♨️', 'Wapno palone i woda'],
    ['r:tlenek-woda:MgO', 'Tlenek zasadowy', '🧂', 'Tlenek magnezu i woda'],
    ['r:tlenek-woda:Na2O', 'Tlenek sodu w wodzie', '🧂', 'Spal sód, a tlenek wsyp do wody'],
    ['r:tlenek-kwas:CuO', 'Czarny proszek w kwasie', '🔵', 'Tlenek miedzi(II) i kwas'],
    ['r:tlenek-kwas:Fe2O3', 'Rdza w kwasie', '🟤', 'Rdza i kwas'],
    ['r:katalizator:MnO2', 'Braunsztyn – katalizator', '⚗️', 'Woda utleniona i MnO₂'],
    ['r:katalizator:KI', 'Jodek – katalizator', '⚗️', 'Woda utleniona i KI'],
    ['r:katalizator:Fe', 'Żelazo(III) – katalizator', '⚗️', 'Woda utleniona i FeCl₃'],
    ['r:katalaza', 'Enzym katalaza', '🥔', 'Woda utleniona i ziemniak'],
    ['r:slon', 'Pasta do zębów dla słonia', '🐘', 'Perhydrol, katalizator i detergent'],
    ['r:siarka-koloid', 'Znikający krzyżyk', '🌫️', 'Tiosiarczan i kwas'],
    ['r:kameleon-1', 'Zielony manganian(VI)', '💚', 'KMnO₄, zasada i cukier'],
    ['r:kameleon', 'Kameleon chemiczny', '🦎', 'Poczekaj, aż zieleń zmieni się dalej'],
    ['r:MnO4-cukier', 'Nadmanganian utlenia cukier', '🍬', 'KMnO₄, kwas i cukier'],
    ['r:trommer', 'Próba Trommera', '🧱', 'Świeży Cu(OH)₂, glukoza i ogrzewanie'],
    ['r:rozklad:CuOH2', 'Czernienie Cu(OH)₂', '⚫', 'Ogrzej niebieski osad'],
    ['r:lustro', 'Lustro srebrne', '🪞', 'Odczynnik Tollensa, glukoza i ciepło'],
    ['r:biuret', 'Reakcja biuretowa', '🟣', 'Białko, zasada i odrobina CuSO₄'],
    ['r:ksanto', 'Reakcja ksantoproteinowa', '🟡', 'Białko, kwas azotowy i ciepło'],
    ['r:denat', 'Denaturacja białka', '🍳', 'Białko i ciepło, alkohol lub metal ciężki'],
    ['r:ester', 'Owocowy ester', '🍐', 'Kwas octowy, etanol, stężony H₂SO₄ i ciepło'],
    ['r:waz', 'Czarny wąż z cukru', '🐍', 'Cukier i stężony kwas siarkowy'],
    ['r:FeOH2-utl', 'Brunatniejący osad', '🍂', 'Wodorotlenek żelaza(II) na powietrzu'],
    ['r:hydrat:CuSO4', 'Niebieska kropla', '💧', 'Bezwodny CuSO₄ i woda'],
    ['r:hydrat:CoCl2', 'Różowy chlorek kobaltu', '🌸', 'Bezwodny CoCl₂ i woda'],
    ['r:rozklad:CuSO4', 'Bielejący hydrat', '🤍', 'Ogrzej niebieskie kryształy'],
    ['r:CoCl2', 'Niebieski chlorek kobaltu', '🔵', 'Ogrzej różowe kryształy'],
    ['r:rozklad:NaHCO3', 'Rozkład sody oczyszczonej', '🍰', 'Ogrzej sodę oczyszczoną'],
    ['r:rozklad:CuCO3', 'Rozkład węglanu miedzi', '⚫', 'Ogrzej osad węglanu miedzi'],
    ['r:rozklad:CaCO3', 'Wypalanie wapna', '🏭', 'Mocno wyprażaj marmur w tyglu'],
    ['r:rozklad:KMnO4', 'Tlen z nadmanganianu', '💨', 'Ogrzej kryształy KMnO₄'],
    ['r:NH4Cl', 'Biały dym salmiaku', '🌫️', 'Ogrzej chlorek amonu'],
    ['r:karmel', 'Karmel', '🍮', 'Ogrzej suchy cukier'],
    ['r:zweglenie', 'Zwęglenie', '⚫', 'Ogrzewaj karmel dalej'],
    ['r:sublimacja:I2', 'Sublimacja jodu', '🟪', 'Ogrzej kryształki jodu'],
    ['r:rozklad:FeOH3', 'Prażenie Fe(OH)₃', '🟥', 'Wysusz i wyprażaj osad Fe(OH)₃'],
    ['r:FeS', 'Synteza siarczku żelaza', '🔶', 'Żelazo, siarka i ciepło'],
    ['r:spalanie:Mg', 'Spalanie magnezu', '🌟', 'Magnez w tyglu nad palnikiem'],
    ['r:spalanie:S', 'Spalanie siarki', '🔵', 'Siarka w tyglu nad palnikiem'],
    ['r:spalanie:C', 'Spalanie węgla', '🟠', 'Węgiel w tyglu nad palnikiem'],
    ['r:spalanie:Fe', 'Zimne ognie z żelaza', '✨', 'Opiłki żelaza w tyglu nad palnikiem'],
    ['r:spalanie:Na', 'Spalanie sodu', '🟡', 'Sód w tyglu nad palnikiem'],
    ['r:spalanie:K', 'Spalanie potasu', '🟣', 'Potas w tyglu nad palnikiem'],
    ['r:spalanie:Li', 'Spalanie litu', '🔴', 'Lit w tyglu nad palnikiem'],
    ['r:spalanie:Ca', 'Spalanie wapnia', '🟠', 'Wapń w tyglu nad palnikiem'],
    ['r:rozklad:Ag2O', 'Srebro z tlenku srebra', '🥈', 'Wysusz i wyprażaj brunatny Ag₂O'],
    ['r:spalanie:etanol', 'Płonący alkohol', '🔵', 'Etanol i ogień'],
    ['r:emulsja', 'Emulsja', '🥛', 'Olej, woda, detergent i mieszanie'],
    ['r:warstwy', 'Dwie warstwy', '🫗', 'Olej i woda'],
    ['r:egzo', 'Reakcja egzotermiczna', '🌡️', 'Coś, co grzeje się samo'],
    ['r:endo', 'Proces endotermiczny', '🧊', 'Coś, co samo się ochładza'],
    ['r:krystalizacja', 'Krystalizacja', '💎', 'Odparuj albo ochłódź roztwór'],
    ['r:wrzenie', 'Wrzenie', '♨️', 'Podgrzewaj wodę'],
    ['r:zloty-deszcz', 'Złoty deszcz', '🌟', 'Osad PbI₂ rozpuść na gorąco i ostudź'],
    ['r:skrobia', 'Granatowa skrobia', '🟦', 'Jod i skrobia'],
    ['r:zegar', 'Zegar jodowy', '⏱️', 'KI, kwas, skrobia, tiosiarczan, na końcu woda utleniona'],
    ['r:so2-woda', 'Kwaśny deszcz', '🌧️', 'SO₂ wprowadzony rurką do wody'],
    ['r:rozcienczanie-ok', 'Kwas do wody – brawo!', '✅', 'Bezpiecznie rozcieńcz stężony kwas'],
    ['r:pryskanie', 'Lekcja bezpieczeństwa', '⚠️', 'Tego lepiej nie odkrywać…'],
    ['r:rozp:KMnO4', 'Dyfuzja fioletu', '🟣', 'Kryształki KMnO₄ w wodzie'],
    ['test:pyk', 'Test na wodór', '💥', 'Płonące łuczywko nad wodorem'],
    ['test:zarzace:O2', 'Test na tlen', '🪵', 'Żarzące łuczywko nad tlenem'],
    ['test:plonace:CO2', 'Test na CO₂ łuczywkiem', '🪵', 'Płonące łuczywko nad CO₂'],
    ['test:papier-NH3', 'Test na amoniak', '📄', 'Wilgotny papierek nad amoniakiem'],
    ['test:zapach:ester', 'Zapach estru', '🍐', 'Powąchaj ester']
  ];
  RE.forEach(([k, n, ik, h]) => dod(k, 'reakcje', n, ik, h));
  R.ODKRYCIA = O;
  R.ODKI = {}; O.forEach(o => R.ODKI[o.key] = o);
  R.KAT_ODK = [['reakcje', 'Reakcje i zjawiska', '⚗️'], ['osady', 'Osady', '☁️'], ['gazy', 'Gazy', '💨'], ['wskazniki', 'Barwy wskaźników', '🎨'], ['plomienie', 'Barwy płomieni', '🔥']];

  /* ---------- zadania ---------- */
  const any = (c, f) => c.vs.some(f);
  const L = R.L, A = R.A, S = R.S;
  R.ROZDZIALY = [
    { id: 'r1', n: 'Pierwsze kroki w pracowni', ik: '🧪', opis: 'Roztwory, rozpuszczanie, ogrzewanie i rozdzielanie mieszanin.' },
    { id: 'r2', n: 'Kwasy, zasady i wskaźniki', ik: '🌈', opis: 'Odczyn, pH, zobojętnianie i kolorowe wskaźniki.' },
    { id: 'r3', n: 'Reakcje strąceniowe', ik: '☁️', opis: 'Osady, ich barwy i co je rozpuszcza.' },
    { id: 'r4', n: 'Gazy i jak je wykryć', ik: '💨', opis: 'Otrzymywanie i identyfikacja CO₂, H₂, O₂, NH₃ i H₂S.' },
    { id: 'r5', n: 'Metale', ik: '⚙️', opis: 'Szereg aktywności, wypieranie, spalanie, amfoteryczność.' },
    { id: 'r6', n: 'Energia i szybkość reakcji', ik: '🔥', opis: 'Egzo- i endotermia, katalizatory, temperatura, bezpieczeństwo.' },
    { id: 'r7', n: 'Chemia życia', ik: '🍞', opis: 'Cukry, skrobia, białka, estry i efektowne reakcje redoks.' },
    { id: 'r8', n: 'Chemiczny detektyw', ik: '🔍', opis: 'Zagadki: rozpoznaj zawartość tajemniczych probówek.' }
  ];
  const Z = R.ZADANIA = [
    // ---- R1
    {
      id: 'sol', r: 'r1', t: 'Pierwszy roztwór', reag: ['woda', 'nacls'], nacz: ['zlewka'],
      op: 'Każdy chemik zaczyna od roztworu. Przygotuj roztwór soli kuchennej w wodzie.',
      cele: [
        ['Nalej do zlewki co najmniej 20 cm³ wody', c => any(c, v => v.liq >= 19)],
        ['Wsyp sól kuchenną', c => any(c, v => S(v, 'NaCl') > 0 || A(v, 'Na^+') > 0)],
        ['Rozpuść całą sól (mieszaj!)', c => any(c, v => A(v, 'Na^+') > 0.004 && S(v, 'NaCl') < 1e-7 && v.liq > 1)]
      ],
      wsk: ['Na półce kliknij „Woda destylowana” przy dawce „20 cm³” – woda trafi do zaznaczonego naczynia.', 'Kryształki znikną szybciej, gdy użyjesz przycisku 🥄 Mieszaj pod zlewką.'],
      wyj: 'Sól rozpadła się na jony Na⁺ i Cl⁻, które otoczyły cząsteczki wody – zajrzyj do widoku cząsteczkowego po prawej! Powstał roztwór właściwy: jednorodna mieszanina, w której nie widać składników.',
      quiz: ['Jak nazywa się mieszanina, w której substancja rozpuściła się całkowicie i nie widać jej gołym okiem?', ['roztwór właściwy', 'zawiesina', 'emulsja', 'osad']]
    },
    {
      id: 'krysztaly', r: 'r1', t: 'Niebieskie kryształy', reag: ['woda', 'cuso4s'], nacz: ['zlewka', 'zlewka'],
      op: 'Kryształy siarczanu(VI) miedzi(II) mają piękny niebieski kolor. Czy roztwór też będzie niebieski? I jak przyspieszyć rozpuszczanie?',
      cele: [
        ['Wsyp kryształy do wody', c => c.ev('r:rozp:CuSO4')],
        ['Przyspiesz rozpuszczanie mieszaniem albo ogrzewaniem', c => c.ev('akcja:mieszaj') || c.ev('akcja:palnik')],
        ['Uzyskaj klarowny niebieski roztwór bez kryształów na dnie', c => any(c, v => A(v, 'Cu^2+') > 0.001 && S(v, 'CuSO4·5H2O') < 1e-7 && v.liq > 1)]
      ],
      wsk: ['Najpierw 20 cm³ wody, potem 3 g kryształów.', 'Pod zlewką masz przyciski 🥄 (mieszanie) i 🔥 (palnik).'],
      wyj: 'Niebieską barwę daje uwodniony kation miedzi(II). Mieszanie i ogrzewanie przyspieszają rozpuszczanie, bo cząsteczki wody szybciej i częściej docierają do powierzchni kryształów. Rozdrobnienie substancji działa podobnie.',
      quiz: ['Który sposób NIE przyspieszy rozpuszczania cukru w herbacie?', ['schłodzenie herbaty', 'mieszanie łyżeczką', 'użycie cukru pudru zamiast kostki', 'podgrzanie herbaty']]
    },
    {
      id: 'wrzenie', r: 'r1', t: 'Punkt wrzenia', reag: ['woda'], nacz: ['probowka'],
      op: 'Podgrzej wodę w probówce aż do wrzenia i obserwuj termometr. Co się dzieje z temperaturą, gdy woda już wrze?',
      cele: [['Nalej wody do probówki', c => any(c, v => v.liq > 2)], ['Doprowadź wodę do wrzenia', c => c.ev('r:wrzenie')]],
      wsk: ['Zapal palnik przyciskiem 🔥 pod probówką.', 'Czekanie się dłuży? Użyj przyspieszenia czasu ⏩ na pasku narzędzi.'],
      wyj: 'Podczas wrzenia temperatura stoi w miejscu (pod normalnym ciśnieniem – 100 °C). Całe ciepło z palnika idzie na zamianę wody w parę, a nie na ogrzewanie. Dlatego wrząca woda w garnku w górach (niższe ciśnienie) ma mniej niż 100 °C.',
      quiz: ['Co się dzieje z temperaturą wody, która już wrze?', ['stoi w miejscu', 'rośnie bez końca', 'spada', 'skacze w górę i w dół']]
    },
    {
      id: 'odparuj', r: 'r1', t: 'Sól z morza', reag: ['woda', 'nacls'], nacz: ['zlewka', 'tygiel'],
      op: 'Jak odzyskać sól rozpuszczoną w wodzie? Przygotuj roztwór i odparuj wodę do sucha.',
      cele: [
        ['Przygotuj roztwór soli', c => any(c, v => A(v, 'Na^+') > 0.001 && v.liq > 1)],
        ['Odparuj wodę do sucha i odzyskaj kryształy soli', c => c.ev('r:krystalizacja', d => d.sucho && d.keys && d.keys.includes('NaCl'))]
      ],
      wsk: ['Odparowanie 20 cm³ trwa długo – przelej (⤵) część roztworu do tygla albo użyj ⏩.', 'Tygiel stoi prosto w płomieniu, więc odparowuje bardzo szybko.'],
      wyj: 'Odparowanie (krystalizacja) rozdziela roztwór: woda ulatnia się jako para, a sól zostaje. Tak pozyskuje się sól w salinach nad morzem – tylko zamiast palnika pracuje słońce i wiatr.',
      quiz: ['Którą metodą najłatwiej odzyskać sól rozpuszczoną w wodzie?', ['odparowanie', 'sączenie', 'dekantacja', 'magnes']]
    },
    {
      id: 'olej', r: 'r1', t: 'Woda i olej', reag: ['woda', 'olej', 'deterg'], nacz: ['zlewka'],
      op: 'Czy olej rozpuści się w wodzie? Sprawdź, a potem spróbuj go „pogodzić” z wodą.',
      cele: [['Wlej do zlewki wodę i olej', c => c.ev('r:warstwy')], ['Dodaj detergent i wymieszaj – zrób emulsję', c => c.ev('r:emulsja')]],
      wsk: ['Po dodaniu płynu do mycia kliknij 🥄 kilka razy.'],
      wyj: 'Olej i woda tworzą mieszaninę niejednorodną – olej jest lżejszy i pływa na wierzchu. Cząsteczki detergentu mają „głowę” lubiącą wodę i „ogon” lubiący tłuszcz, dlatego otaczają kropelki oleju i rozpraszają je w wodzie. Tak płyn do naczyń zmywa tłuszcz, a mleko i majonez to też emulsje.',
      quiz: ['Dlaczego olej pływa na wodzie?', ['ma mniejszą gęstość i nie miesza się z wodą', 'jest cięższy od wody', 'rozpuszcza się w wodzie', 'bo jest gorący']]
    },
    {
      id: 'nasycony', r: 'r1', t: 'Roztwór nasycony', reag: ['woda', 'kno3'], nacz: ['probowka'],
      op: 'Ile saletry potasowej zmieści się w odrobinie wody? Przygotuj roztwór nasycony, rozpuść resztę na gorąco, a potem wyhoduj kryształy.',
      cele: [
        ['Rozpuść tyle saletry, aby część została na dnie (roztwór nasycony)', c => any(c, v => v.liq > 1 && S(v, 'KNO3') > 1e-4 && A(v, 'K^+') > 1e-4 && v.T < 35)],
        ['Podgrzej, aż rozpuści się cała saletra', c => any(c, v => v.liq > 1 && S(v, 'KNO3') < 1e-7 && A(v, 'K^+') > 0.02 && v.T > 40)],
        ['Ochłodź w łaźni lodowej i obserwuj krystalizację', c => c.ev('r:krystalizacja', d => d.key === 'KNO3' && d.T < 32)]
      ],
      wsk: ['Do 5 cm³ wody wsyp 3 g saletry i wymieszaj – część zostanie na dnie.', 'Po rozpuszczeniu na gorąco wyłącz palnik i włącz 🧊 łaźnię lodową.'],
      wyj: 'Rozpuszczalność saletry silnie rośnie z temperaturą: w 20 °C w 100 g wody rozpuszcza się ok. 32 g, a w 60 °C już ok. 110 g! Gdy gorący roztwór stygnie, nadmiar substancji wypada w postaci kryształów. Krystalizację stosuje się do oczyszczania substancji.',
      quiz: ['Roztwór, w którym w danej temperaturze nie rozpuści się już więcej substancji, to roztwór…', ['nasycony', 'nienasycony', 'rozcieńczony', 'koloidalny']]
    },
    // ---- R2
    {
      id: 'php', r: 'r2', t: 'Malinowy alarm', reag: ['naoh', 'hcl', 'woda', 'php'], nacz: ['probowka', 'probowka', 'probowka'],
      op: 'Fenoloftaleina to wskaźnik – substancja, która zmienia barwę zależnie od odczynu. Sprawdź, jak zachowuje się w zasadzie, w kwasie i w wodzie.',
      cele: [
        ['Zabarw fenoloftaleinę na malinowo', c => c.ev('wsk:php:malinowy')],
        ['Sprawdź fenoloftaleinę w kwasie', c => any(c, v => A(v, 'w:php') > 0 && v.pH !== null && v.pH < 3)],
        ['Sprawdź fenoloftaleinę w wodzie destylowanej', c => any(c, v => A(v, 'w:php') > 0 && v.pH !== null && Math.abs(v.pH - 7) < 0.6 && Object.keys(v.aq).length <= 2)]
      ],
      wsk: ['Do każdej probówki wlej inną ciecz, a potem dodaj 3 krople fenoloftaleiny.'],
      wyj: 'Fenoloftaleina jest bezbarwna w kwasach i w wodzie, a malinowa w zasadach (pH powyżej ok. 8,2). Dlatego świetnie wykrywa zasady – ale nie odróżni kwasu od wody!',
      quiz: ['Jaką barwę ma fenoloftaleina w kwasie?', ['jest bezbarwna', 'malinową', 'niebieską', 'żółtą']]
    },
    {
      id: 'lakmus', r: 'r2', t: 'Trzy barwy lakmusu', reag: ['hcl', 'naoh', 'ocet', 'nh3', 'woda', 'lak'], nacz: ['probowka', 'probowka', 'probowka'],
      op: 'Lakmus, otrzymywany z porostów, jest najstarszym wskaźnikiem. Uzyskaj wszystkie trzy jego barwy.',
      cele: [['Lakmus czerwony', c => c.ev('wsk:lak:czerwony')], ['Lakmus fioletowy', c => c.ev('wsk:lak:fioletowy')], ['Lakmus niebieski', c => c.ev('wsk:lak:niebieski')]],
      wsk: ['Czerwony – w kwasie, niebieski – w zasadzie. A w czym będzie fioletowy?'],
      wyj: 'Lakmus jest czerwony w kwasach, fioletowy w roztworach obojętnych i niebieski w zasadach. Stąd powiedzenie „test lakmusowy” – prosty sprawdzian, który od razu wszystko pokazuje.',
      quiz: ['Odczyn obojętny ma…', ['woda destylowana', 'ocet', 'kwas solny', 'woda amoniakalna']]
    },
    {
      id: 'kapusta', r: 'r2', t: 'Tęcza z kapusty', reag: ['hcl', 'ocet', 'woda', 'nahco3', 'nh3', 'naoh', 'kap'], nacz: ['probowka', 'probowka', 'probowka', 'probowka'],
      op: 'Wywar z czerwonej kapusty to naturalny wskaźnik z kuchni. Zrób z niego tęczę!',
      cele: [['Uzyskaj jednocześnie 4 różne barwy wywaru w 4 probówkach', c => new Set(c.vs.map(v => c.ind(v, 'kap')).filter(Boolean)).size >= 4], ['Odkryj zieloną barwę wywaru', c => c.ev('wsk:kap:zielony')]],
      wsk: ['W każdej probówce inna substancja: kwas solny, woda, soda oczyszczona, woda amoniakalna, zasada sodowa…', 'Wywar dodaj kroplami (np. 10 kropli) do każdej probówki.'],
      wyj: 'Barwniki kapusty (antocyjany) zmieniają budowę cząsteczek zależnie od stężenia jonów H⁺, a z nią kolor: od czerwonego w mocnych kwasach przez fioletowy (obojętny) i niebieskozielony aż do żółtego w mocnych zasadach. Te same barwniki są w jagodach i winogronach.',
      quiz: ['Na jaki kolor zabarwi się wywar z czerwonej kapusty w occie?', ['różowy lub czerwony', 'zielony', 'żółty', 'niebieski']]
    },
    {
      id: 'zobojetnij', r: 'r2', t: 'Zobojętnianie', reag: ['naoh', 'hcl', 'php'], nacz: ['zlewka'],
      op: 'Zasada i kwas „znoszą się” nawzajem. Zabarw zasadę fenoloftaleiną i dodawaj kwas, aż barwa zniknie.',
      cele: [['Zabarw roztwór NaOH fenoloftaleiną', c => c.ev('wsk:php:malinowy')], ['Dodawaj kwas solny, aż malinowa barwa zniknie', c => c.ev('r:odbarwienie')]],
      wsk: ['5 cm³ NaOH + 3 krople fenoloftaleiny, potem kwas po 1 cm³.'],
      wyj: 'Kationy H⁺ z kwasu łączą się z anionami OH⁻ z zasady w obojętne cząsteczki wody: H⁺ + OH⁻ → H₂O. Zostają jony Na⁺ i Cl⁻, czyli roztwór soli. Reakcja wydziela ciepło – zerknij na termometr.',
      quiz: ['Co powstaje w reakcji kwasu z zasadą?', ['sól i woda', 'wodór i tlen', 'tylko woda', 'osad i gaz']]
    },
    {
      id: 'ph7', r: 'r2', t: 'Dokładnie pH 7', reag: ['naoh', 'hcl', 'uni'], nacz: ['zlewka'], opcje: { bezPH: true },
      op: 'Wyzwanie dla precyzyjnych: przygotuj idealnie obojętny roztwór soli z NaOH i HCl. pH-metr jest wyłączony – patrz na wskaźnik uniwersalny i licz!',
      cele: [['Uzyskaj roztwór NaCl o pH 6,5–7,5 (wskaźnik uniwersalny zielony)', c => any(c, v => A(v, 'w:uni') > 0 && v.pH > 6.5 && v.pH < 7.5 && A(v, 'Na^+') > 0.002 && A(v, 'Cl^-') > 0.002)]],
      wsk: ['Oba roztwory mają stężenie 1 mol/dm³. Ile kwasu potrzeba na 5 cm³ zasady?', 'Wlej 5 cm³ NaOH, kroplę wskaźnika i dokładnie 5 cm³ HCl. Pomyłka? Wylej i zacznij od nowa.'],
      wyj: 'NaOH + HCl → NaCl + H₂O. Jeden mol kwasu zobojętnia jeden mol zasady, więc przy jednakowych stężeniach potrzeba jednakowych objętości. Zauważ, jak gwałtownie zmienia się pH przy punkcie zobojętnienia – wystarczy jedna kropla za dużo! Tak działa miareczkowanie.',
      quiz: ['Ile cm³ kwasu solnego (1 mol/dm³) zobojętni 10 cm³ NaOH (1 mol/dm³)?', ['10 cm³', '5 cm³', '20 cm³', '1 cm³']]
    },
    {
      id: 'moc', r: 'r2', t: 'Mocny i słaby kwas', reag: ['hcl', 'ocet', 'woda'], nacz: ['probowka', 'probowka'], opcje: { bezPH: true },
      op: 'Kwas solny i ocet mają tu takie samo stężenie: 1 mol/dm³. Czy są tak samo kwaśne? Zmierz ich pH papierkiem wskaźnikowym.',
      cele: [['Zmierz papierkiem pH kwasu solnego', c => c.ev('test:papier', d => d.cl && d.pH < 1.5)], ['Zmierz papierkiem pH octu', c => c.ev('test:papier', d => d.ac && !d.cl && d.pH > 2 && d.pH < 3.5)]],
      wsk: ['Zaznacz probówkę i użyj narzędzia 📄 Papierek.'],
      wyj: 'Kwas solny jest mocny – w wodzie prawie wszystkie cząsteczki HCl rozpadają się na jony, więc pH ≈ 0. Kwas octowy jest słaby: dysocjuje tylko ok. 0,4% cząsteczek, stąd pH ≈ 2,4. Dlatego ocet można bezpiecznie dodać do sałatki, a kwasu solnego – nie!',
      quiz: ['Dlaczego ocet ma wyższe pH niż kwas solny o tym samym stężeniu?', ['słabo dysocjuje, więc daje mało jonów H⁺', 'jest bardziej rozcieńczony', 'kwasy organiczne nie są kwasami', 'zawiera jony OH⁻']]
    },
    {
      id: 'kwasny', r: 'r2', t: 'Kwaśny deszcz', reag: ['s', 'woda', 'uni'], nacz: ['tygiel', 'zlewka'],
      op: 'Elektrownie węglowe spalają węgiel zawierający siarkę. Sprawdź, co się dzieje, gdy powstały gaz trafi do wody.',
      cele: [['Spal siarkę w tyglu', c => c.ev('r:spalanie:S')], ['Wprowadź gaz rurką do wody ze wskaźnikiem i ją zakwaś (pH < 4,5)', c => c.ev('r:so2-woda') && any(c, v => v.liq > 1 && v.pH !== null && v.pH < 4.5)]],
      wsk: ['Najpierw: zlewka z 20 cm³ wody i kilkoma kroplami wskaźnika uniwersalnego.', 'Kliknij 🔗 pod tyglem, a potem zlewkę – rurka poprowadzi gaz. Dopiero wtedy wsyp siarkę i zapal palnik pod tyglem.'],
      wyj: 'S + O₂ → SO₂, a SO₂ + H₂O → H₂SO₃ (kwas siarkowy(IV)). Tlenki siarki i azotu z kominów zakwaszają deszcz, który niszczy lasy, jeziora i wapienne zabytki. Dlatego elektrownie mają instalacje odsiarczania spalin.',
      quiz: ['Który tlenek jest główną przyczyną kwaśnych deszczy?', ['SO₂', 'CaO', 'MgO', 'Na₂O']]
    },
    {
      id: 'oddech', r: 'r2', t: 'Oddech pod lupą', reag: ['woda', 'btb'], nacz: ['zlewka'],
      op: 'Czy nasz oddech zmienia odczyn wody? Zabarw wodę błękitem bromotymolowym i podmuchaj słomką.',
      cele: [['Zabarw wodę błękitem bromotymolowym', c => c.ev('wsk:btb:zielony') || c.ev('wsk:btb:niebieski')], ['Dmuchaj słomką, aż wskaźnik zżółknie', c => c.ev('wsk:btb:żółty')]],
      wsk: ['Narzędzie 🥤 Słomka – przytrzymaj przycisk, żeby dmuchać dłużej.'],
      wyj: 'Wydychamy tlenek węgla(IV). W wodzie tworzy on słaby kwas węglowy: CO₂ + H₂O ⇌ H₂CO₃, dlatego odczyn staje się lekko kwasowy, a wskaźnik żółknie. Woda gazowana też jest lekko kwaśna.',
      quiz: ['Jaki gaz z naszego oddechu zakwasza wodę?', ['CO₂', 'O₂', 'N₂', 'H₂']]
    },
    // ---- R3
    {
      id: 'agcl', r: 'r3', t: 'Biały ser', reag: ['agno3', 'nacl', 'nh3', 'woda'], nacz: ['probowka', 'probowka'],
      op: 'Azotan(V) srebra to detektyw jonów chlorkowych. Połącz go z roztworem soli kuchennej, a potem sprawdź, co z osadem zrobi amoniak.',
      cele: [['Strąć osad chlorku srebra', c => c.ev('osad:AgCl')], ['Rozpuść osad w wodzie amoniakalnej', c => c.ev('r:Ag-NH3')]],
      wsk: ['5 cm³ AgNO₃ i 5 cm³ NaCl, a potem 5 cm³ wody amoniakalnej.'],
      wyj: 'Ag⁺ + Cl⁻ → AgCl↓ – biały, serowaty osad. To podstawowy test na jony chlorkowe (np. w wodzie z kranu). AgCl rozpuszcza się w amoniaku, bo powstaje jon kompleksowy [Ag(NH₃)₂]⁺. Na świetle AgCl ciemnieje – na tym opierała się dawna fotografia.',
      quiz: ['Którym odczynnikiem wykryjesz jony chlorkowe?', ['AgNO₃', 'NaOH', 'fenoloftaleiną', 'BaCl₂']]
    },
    {
      id: 'cuoh2', r: 'r3', t: 'Niebieska galareta', reag: ['cuso4', 'naoh'], nacz: ['probowka'],
      op: 'Połącz roztwór siarczanu(VI) miedzi(II) z zasadą sodową, a potem ogrzej powstały osad.',
      cele: [['Strąć niebieski osad wodorotlenku miedzi(II)', c => c.ev('osad:Cu(OH)2')], ['Ogrzej osad i obserwuj zmianę barwy', c => c.ev('r:rozklad:CuOH2')]],
      wsk: ['1 cm³ CuSO₄ i 5 cm³ NaOH, potem palnik.'],
      wyj: 'Cu²⁺ + 2OH⁻ → Cu(OH)₂↓ (niebieski, galaretowaty). Po ogrzaniu wodorotlenek rozkłada się: Cu(OH)₂ → CuO + H₂O, a czarny tlenek miedzi(II) zabarwia zawiesinę.',
      quiz: ['Jaki związek powstaje po ogrzaniu niebieskiego Cu(OH)₂?', ['czarny CuO', 'czerwona miedź', 'biały CuSO₄', 'zielony CuCO₃']]
    },
    {
      id: 'zloty', r: 'r3', t: 'Złoty deszcz', reag: ['pbno3', 'ki', 'woda'], nacz: ['zlewka'],
      op: 'Jedno z najpiękniejszych doświadczeń chemii! Strąć żółty jodek ołowiu(II), rozpuść go na gorąco i pozwól mu ostygnąć.',
      cele: [['Strąć żółty osad jodku ołowiu(II)', c => c.ev('osad:PbI2')], ['Rozpuść osad na gorąco', c => c.ev('r:pbi-rozp')], ['Ostudź roztwór i zobacz złoty deszcz', c => c.ev('r:zloty-deszcz')]],
      wsk: ['1 cm³ Pb(NO₃)₂, 1 cm³ KI i 20 cm³ wody. Potem palnik aż do wrzenia.', 'Gdy osad zniknie, wyłącz palnik i włącz 🧊 łaźnię lodową.'],
      wyj: 'Pb²⁺ + 2I⁻ → PbI₂↓. Rozpuszczalność jodku ołowiu(II) mocno rośnie z temperaturą. Podczas powolnego stygnięcia PbI₂ krystalizuje w postaci cienkich, lśniących, złotych blaszek. Uwaga: związki ołowiu są trujące – w prawdziwej pracowni robi to tylko nauczyciel.',
      quiz: ['Dlaczego osad PbI₂ rozpuścił się po ogrzaniu?', ['jego rozpuszczalność rośnie z temperaturą', 'rozłożył się na pierwiastki', 'wyparował', 'przereagował z wodą w gaz']]
    },
    {
      id: 'baso4', r: 'r3', t: 'Siarczany pod lupą', reag: ['bacl2', 'na2so4', 'na2co3', 'hcl'], nacz: ['probowka', 'probowka'],
      op: 'Jony baru dają białe osady i z siarczanami, i z węglanami. Jak je odróżnić? Spróbuj kwasem!',
      cele: [['Strąć siarczan(VI) baru', c => c.ev('osad:BaSO4')], ['Strąć węglan baru', c => c.ev('osad:BaCO3')], ['Dodaj kwas i sprawdź, który osad się rozpuści', c => c.ev('r:weglan-kwas') && any(c, v => S(v, 'BaSO4') > 1e-6 && A(v, 'H^+') > 1e-4)]],
      wsk: ['Probówka A: BaCl₂ + Na₂SO₄, probówka B: BaCl₂ + Na₂CO₃. Do obu dolej HCl.'],
      wyj: 'BaCO₃ roztwarza się w kwasie (wydziela się CO₂), a BaSO₄ – nie. Dzięki temu BaCl₂ z kwasem to test na siarczany. A ponieważ BaSO₄ jest praktycznie nierozpuszczalny nawet w kwasie żołądkowym, podaje się go pacjentom jako kontrast do prześwietleń – mimo że rozpuszczalne związki baru są trujące!',
      quiz: ['Dlaczego BaSO₄ można podać pacjentowi do prześwietlenia?', ['jest praktycznie nierozpuszczalny, więc jony Ba²⁺ nie trafiają do krwi', 'bar nie jest trujący', 'rozkłada się w żołądku', 'jest kwasem']]
    },
    {
      id: 'zelazo', r: 'r3', t: 'Dwa oblicza żelaza', reag: ['fecl3', 'feso4', 'naoh'], nacz: ['probowka', 'probowka'],
      op: 'Żelazo tworzy jony Fe²⁺ i Fe³⁺. Porównaj osady, które dają z zasadą sodową.',
      cele: [['Strąć wodorotlenek żelaza(III)', c => c.ev('osad:Fe(OH)3')], ['Strąć wodorotlenek żelaza(II)', c => c.ev('osad:Fe(OH)2')], ['Obserwuj, jak zielonkawy osad brunatnieje', c => c.ev('r:FeOH2-utl')]],
      wsk: ['Zielony osad brunatnieje szybciej, gdy go mieszasz (dostęp tlenu z powietrza).'],
      wyj: 'Fe³⁺ + 3OH⁻ → Fe(OH)₃↓ (rdzawobrunatny), Fe²⁺ + 2OH⁻ → Fe(OH)₂↓ (brudnozielony). Fe(OH)₂ szybko utlenia się tlenem z powietrza do Fe(OH)₃ – to ten sam proces, który powoduje rdzewienie.',
      quiz: ['Po czym odróżnisz jony Fe²⁺ od Fe³⁺ za pomocą NaOH?', ['po barwie osadu: zielonkawy kontra rdzawobrunatny', 'po zapachu', 'Fe²⁺ nie daje osadu', 'po temperaturze']]
    },
    {
      id: 'galeria', r: 'r3', t: 'Galeria osadów', reag: ['agno3', 'nacl', 'kbr', 'ki', 'cuso4', 'fecl3', 'naoh', 'bacl2', 'na2so4', 'pbno3', 'k2cro4', 'na2s', 'na3po4', 'na2co3'], nacz: ['probowka', 'probowka', 'probowka', 'probowka'],
      op: 'Wolna amerykanka: masz 14 roztworów soli. Zbierz kolekcję różnych osadów!',
      cele: [['Otrzymaj 6 różnych osadów', c => c.ile('osad:') >= 6], ['W tym co najmniej jeden czarny', c => ['osad:CuS', 'osad:Ag2S', 'osad:PbS', 'osad:FeS'].some(k => c.ev(k))], ['I jeden czerwony lub pomarańczowy', c => c.ev('osad:Ag2CrO4')]],
      wsk: ['Czarne są siarczki metali ciężkich (Na₂S + sól miedzi, srebra lub ołowiu).', 'Czerwonobrunatny osad daje chromian(VI) z jonami srebra.'],
      wyj: 'O tym, czy osad się wytrąci, decyduje rozpuszczalność soli – chemik sprawdza ją w tabeli rozpuszczalności. Barwa osadu często zdradza, jakie jony są w roztworze, dlatego reakcje strąceniowe są podstawą analizy jakościowej.',
      quiz: ['Skąd chemik wie, że po zmieszaniu dwóch roztworów wytrąci się osad?', ['sprawdza tabelę rozpuszczalności', 'zgaduje po kolorze roztworów', 'każde dwa roztwory dają osad', 'waży roztwory']]
    },
    {
      id: 'amfoter', r: 'r3', t: 'Amfoteryczny glin', reag: ['alcl3', 'naoh', 'hcl'], nacz: ['probowka'],
      op: 'Wodorotlenek glinu jest wyjątkowy. Strąć go ostrożnie, a potem dodaj dużo zasady.',
      cele: [['Strąć biały osad Al(OH)₃ (NaOH dodawaj po 1 cm³)', c => c.ev('osad:Al(OH)3')], ['Roztwórz osad w nadmiarze zasady', c => c.ev('r:amfoter:Al')]],
      wsk: ['5 cm³ AlCl₃, potem 1 cm³ NaOH – osad. Potem 20 cm³ NaOH.'],
      wyj: 'Al³⁺ + 3OH⁻ → Al(OH)₃↓, a w nadmiarze zasady: Al(OH)₃ + OH⁻ → [Al(OH)₄]⁻. Al(OH)₃ roztwarza się też w kwasach. Takie wodorotlenki nazywamy amfoterycznymi – zachowują się i jak zasada, i jak kwas.',
      quiz: ['Wodorotlenek amfoteryczny reaguje…', ['i z kwasami, i z zasadami', 'tylko z kwasami', 'tylko z zasadami', 'z niczym']]
    },
    {
      id: 'lazur', r: 'r3', t: 'Lazurowy kompleks', reag: ['cuso4', 'nh3'], nacz: ['probowka'],
      op: 'Dodawaj wodę amoniakalną do roztworu siarczanu(VI) miedzi(II) – najpierw ostrożnie, potem w nadmiarze.',
      cele: [['Strąć osad Cu(OH)₂ małą ilością amoniaku', c => c.ev('osad:Cu(OH)2')], ['Dodaj nadmiar amoniaku i uzyskaj ciemnoniebieski roztwór', c => c.ev('r:miedz-amon')]],
      wsk: ['5 cm³ CuSO₄, potem 1 cm³ NH₃, a na koniec 20 cm³ NH₃.'],
      wyj: 'Najpierw amoniak działa jak zasada: wytrąca Cu(OH)₂. Nadmiar amoniaku tworzy z jonem miedzi(II) kation kompleksowy [Cu(NH₃)₄]²⁺ o intensywnej, lazurowej barwie. To czuła reakcja na jony miedzi.',
      quiz: ['Co odpowiada za ciemnoniebieską barwę po dodaniu nadmiaru amoniaku?', ['jon kompleksowy [Cu(NH₃)₄]²⁺', 'rozpuszczony amoniak', 'osad Cu(OH)₂', 'jony OH⁻']]
    },
    {
      id: 'krew', r: 'r3', t: 'Krwawa reakcja', reag: ['fecl3', 'feso4', 'kscn', 'woda'], nacz: ['probowka', 'probowka'],
      op: 'Rodanek potasu to czuły wykrywacz jonów żelaza(III). Sprawdź go na obu rodzajach jonów żelaza.',
      cele: [['Uzyskaj krwistoczerwone zabarwienie', c => c.ev('r:krew')], ['Sprawdź, że jony Fe²⁺ nie dają tej barwy', c => any(c, v => A(v, 'Fe^2+') > 1e-4 && A(v, 'SCN^-') > 1e-4 && A(v, 'FeSCN^2+') < 1e-7)]],
      wsk: ['Do rozcieńczonego FeCl₃ (1 cm³ + 20 cm³ wody) dodaj kroplę KSCN.'],
      wyj: 'Fe³⁺ + SCN⁻ → [FeSCN]²⁺ – kompleks o barwie krwi. Wystarczą śladowe ilości żelaza(III)! Jony Fe²⁺ tej reakcji nie dają, więc tak odróżnia się stopnie utlenienia żelaza. Tę reakcję wykorzystywano w filmach do „sztucznej krwi”.',
      quiz: ['Na jakie jony jest czuły odczynnik KSCN?', ['Fe³⁺', 'Fe²⁺', 'Cu²⁺', 'Na⁺']]
    },
    // ---- R4
    {
      id: 'wulkan', r: 'r4', t: 'Domowy wulkan', reag: ['nahco3', 'ocet', 'deterg'], nacz: ['zlewka'],
      op: 'Soda oczyszczona i ocet – klasyka domowej chemii. Wywołaj erupcję i sprawdź, jaki gaz się wydziela.',
      cele: [['Wsyp sodę i wlej ocet', c => c.ev('r:co2-kwas')], ['Sprawdź gaz płonącym łuczywkiem', c => c.ev('test:plonace:CO2')]],
      wsk: ['3 g sody, kropla płynu do mycia i 20 cm³ octu.', 'Narzędzie 🔥 Płonące łuczywko zbliż od razu, póki się pieni.'],
      wyj: 'NaHCO₃ + CH₃COOH → CH₃COONa + H₂O + CO₂↑. Tlenek węgla(IV) gasi płomień, bo nie podtrzymuje palenia i jest cięższy od powietrza – wypiera tlen znad płomienia. Na tym działają gaśnice śniegowe.',
      quiz: ['Dlaczego płonące łuczywko zgasło?', ['CO₂ nie podtrzymuje palenia', 'łuczywko się zamoczyło', 'zabrakło wodoru', 'CO₂ jest palny']]
    },
    {
      id: 'wapienna', r: 'r4', t: 'Wykrywacz CO₂', reag: ['caco3', 'hcl', 'wodaw'], nacz: ['kolba', 'probowka'],
      op: 'Zbuduj prawdziwy zestaw do otrzymywania gazu: wytwórz CO₂ w kolbie i poprowadź go rurką do wody wapiennej.',
      cele: [['Otrzymaj CO₂ z marmuru i kwasu solnego', c => c.ev('r:weglan-kwas')], ['Wprowadź gaz do wody wapiennej i ją zmąć', c => c.ev('r:woda-wapienna-mleko')]],
      wsk: ['Do probówki wlej 5 cm³ wody wapiennej.', 'Kliknij 🔗 pod kolbą, potem probówkę. Następnie do kolby: 3 g marmuru i 20 cm³ kwasu.'],
      wyj: 'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑, a potem Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O. Zmętnienie wody wapiennej to klasyczny dowód na CO₂ – każdy inny bezbarwny gaz zostawi ją klarowną.',
      quiz: ['Jaki osad powoduje zmętnienie wody wapiennej?', ['CaCO₃', 'Ca(OH)₂', 'CaO', 'CaCl₂']]
    },
    {
      id: 'wydech', r: 'r4', t: 'Mętnieje i znika', reag: ['wodaw'], nacz: ['probowka'],
      op: 'Podmuchaj słomką do wody wapiennej. A potem… dmuchaj dalej!',
      cele: [['Zmąć wodę wapienną własnym oddechem', c => c.ev('r:woda-wapienna-mleko')], ['Dmuchaj dalej, aż osad zniknie', c => c.ev('r:woda-wapienna-klar')]],
      wsk: ['Przytrzymaj przycisk 🥤 Słomka – dmuchasz tak długo, jak trzymasz.'],
      wyj: 'Najpierw Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O. Nadmiar CO₂ zamienia węglan w rozpuszczalny wodorowęglan: CaCO₃ + CO₂ + H₂O → Ca(HCO₃)₂. Ta sama reakcja drąży jaskinie w wapieniu i sprawia, że woda bywa „twarda”.',
      quiz: ['Dlaczego osad znika przy długim dmuchaniu?', ['powstaje rozpuszczalny Ca(HCO₃)₂', 'CaCO₃ odparowuje', 'woda wapienna się zagotowała', 'osad opadł na dno']]
    },
    {
      id: 'wodor', r: 'r4', t: 'Wodór pyka', reag: ['zn', 'mg', 'hcl'], nacz: ['probowka'],
      op: 'Otrzymaj wodór i rozpoznaj go słynnym „pyknięciem”.',
      cele: [['Otrzymaj wodór z cynku i kwasu solnego', c => c.ev('r:metal-kwas:Zn')], ['Zbadaj gaz płonącym łuczywkiem', c => c.ev('test:pyk')]],
      wsk: ['1 g cynku i 20 cm³ HCl… a może 5 cm³ wystarczy? Łuczywko przyłóż, gdy bąbelkuje.'],
      wyj: 'Zn + 2HCl → ZnCl₂ + H₂↑. Wodór spala się z tlenem z powietrza tak szybko, że słychać cichy wybuch („pyk”): 2H₂ + O₂ → 2H₂O. Mieszanina wodoru z powietrzem jest wybuchowa – dlatego sterowiec Hindenburg spłonął w kilkadziesiąt sekund.',
      quiz: ['Co oznacza „pyknięcie” przy płonącym łuczywku?', ['obecność wodoru', 'obecność tlenu', 'obecność CO₂', 'koniec kwasu']]
    },
    {
      id: 'tlen', r: 'r4', t: 'Tlen rozpala', reag: ['h2o2', 'mno2', 'ziemniak'], nacz: ['probowka'],
      op: 'Woda utleniona sama rozkłada się bardzo powoli. Przyspiesz jej rozkład i wykryj powstający gaz.',
      cele: [['Rozłóż wodę utlenioną z katalizatorem', c => c.ev('r:katalizator:MnO2') || c.ev('r:katalaza')], ['Wykryj gaz żarzącym się łuczywkiem', c => c.ev('test:zarzace:O2')]],
      wsk: ['5 cm³ wody utlenionej i 1 g MnO₂ (albo kawałek ziemniaka), potem 🪵 Żarzące łuczywko.'],
      wyj: '2H₂O₂ → 2H₂O + O₂↑. Żarzące się łuczywko w tlenie rozbłyskuje płomieniem, bo tlen podtrzymuje palenie. Braunsztyn (MnO₂) przyspiesza rozkład, a sam się nie zużywa – to katalizator.',
      quiz: ['Co dzieje się z katalizatorem w reakcji?', ['przyspiesza ją i się nie zużywa', 'zużywa się całkowicie', 'spowalnia reakcję', 'zamienia się w tlen']]
    },
    {
      id: 'amoniak', r: 'r4', t: 'Ostry zapach', reag: ['nh4cl', 'naoh', 'woda'], nacz: ['probowka'],
      op: 'Sole amonowe zdradzają się w zasadach. Wytwórz amoniak i wykryj go bezpiecznie.',
      cele: [['Ogrzej chlorek amonu z zasadą sodową', c => c.ev('gaz:NH3')], ['Wykryj gaz wilgotnym papierkiem lub ostrożnie powąchaj', c => c.ev('test:papier-NH3') || c.ev('test:zapach:NH3')]],
      wsk: ['1 g NH₄Cl, 5 cm³ NaOH, palnik. Potem 📄 Papierek albo 👃 Powąchaj.'],
      wyj: 'NH₄Cl + NaOH → NaCl + H₂O + NH₃↑. Amoniak to gaz o ostrym zapachu i odczynie zasadowym – barwi wilgotny papierek na niebiesko. Wąchając, nigdy nie przykładaj nosa do naczynia – kieruj opary ruchem dłoni.',
      quiz: ['Jaki odczyn ma amoniak w wodzie?', ['zasadowy', 'kwasowy', 'obojętny', 'zależy od pogody']]
    },
    {
      id: 'h2s', r: 'r4', t: 'Zgniłe jaja', reag: ['fe', 's', 'hcl'], nacz: ['probowka'],
      op: 'Najpierw zsyntezuj siarczek żelaza(II) z pierwiastków, a potem dodaj do niego kwasu.',
      cele: [['Ogrzej mieszaninę żelaza i siarki', c => c.ev('r:FeS')], ['Dodaj kwas solny do siarczku', c => c.ev('r:h2s')]],
      wsk: ['Do suchej probówki: 1 g żelaza i 1 g siarki, palnik. Kwas dolej, gdy mieszanina się rozżarzy.'],
      wyj: 'Fe + S → FeS (reakcja syntezy, sama się podtrzymuje), a FeS + 2HCl → FeCl₂ + H₂S↑. Siarkowodór pachnie zgniłymi jajami i jest bardzo trujący – w pracowni pracuje się z nim tylko pod wyciągiem.',
      quiz: ['Co powstaje w reakcji żelaza z siarką?', ['siarczek żelaza(II)', 'siarczan(VI) żelaza(II)', 'tlenek żelaza(III)', 'nic – to tylko mieszanina']]
    },
    // ---- R5
    {
      id: 'szereg', r: 'r5', t: 'Wyścig metali', reag: ['mg', 'zn', 'fe', 'cu', 'hcl'], nacz: ['probowka', 'probowka', 'probowka', 'probowka'],
      op: 'Wrzuć cztery metale do kwasu solnego (każdy do osobnej probówki) i porównaj, jak szybko reagują.',
      cele: [['Magnez w kwasie', c => c.ev('r:metal-kwas:Mg')], ['Cynk w kwasie', c => c.ev('r:metal-kwas:Zn')], ['Żelazo w kwasie', c => c.ev('r:metal-kwas:Fe')], ['Miedź w kwasie', c => c.ev('r:brak:Cu')]],
      wsk: ['Do każdej probówki 5 cm³ HCl, potem kawałek metalu. Obserwuj pęcherzyki i termometr.'],
      wyj: 'Szereg aktywności: Mg > Zn > Fe > H > Cu. Metale stojące przed wodorem wypierają go z kwasów – tym szybciej, im są aktywniejsze. Miedź stoi za wodorem, więc w kwasie solnym nic się z nią nie dzieje.',
      quiz: ['Który metal nie wypiera wodoru z kwasu solnego?', ['miedź', 'magnez', 'cynk', 'żelazo']]
    },
    {
      id: 'miedziowanie', r: 'r5', t: 'Miedziany płaszcz', reag: ['zn', 'fe', 'cuso4'], nacz: ['probowka', 'probowka'],
      op: 'Włóż cynk lub żelazo do roztworu siarczanu(VI) miedzi(II). Co osadzi się na metalu?',
      cele: [['Pokryj metal warstewką miedzi', c => c.ev('r:wypieranie:Cu')], ['Odbarw roztwór – zużyj wszystkie jony Cu²⁺', c => any(c, v => v.liq > 0.5 && A(v, 'Cu^2+') < 2e-5 && (A(v, 'Zn^2+') > 1e-4 || A(v, 'Fe^2+') > 1e-4))]],
      wsk: ['Weź mało roztworu (1 cm³) i 1 g metalu. Pomóż sobie ⏩ i mieszaniem.'],
      wyj: 'Zn + Cu²⁺ → Zn²⁺ + Cu. Bardziej aktywny metal oddaje elektrony jonom mniej aktywnego. Niebieska barwa znika, bo ubywa jonów Cu²⁺. Dawniej tak „miedziowano” żelazne przedmioty.',
      quiz: ['Dlaczego roztwór CuSO₄ z cynkiem traci niebieską barwę?', ['jony Cu²⁺ zamieniają się w metaliczną miedź', 'cynk barwi roztwór', 'woda paruje', 'roztwór się ogrzewa']]
    },
    {
      id: 'srebro', r: 'r5', t: 'Srebrne drzewko', reag: ['cu', 'agno3'], nacz: ['probowka'],
      op: 'Włóż blaszkę miedzianą do roztworu azotanu(V) srebra i obserwuj cierpliwie.',
      cele: [['Wyhoduj srebrne kryształy', c => c.ev('r:wypieranie:Ag')], ['Zaobserwuj niebieszczenie roztworu', c => any(c, v => A(v, 'Cu^2+') / L(v) > 0.005 && S(v, 'Ag') > 0)]],
      wsk: ['20 cm³ AgNO₃ i 1 g miedzi. Użyj ⏩.'],
      wyj: 'Cu + 2Ag⁺ → Cu²⁺ + 2Ag. Miedź jest aktywniejsza od srebra, więc wypiera je z roztworu. Na blaszce rosną błyszczące kryształki srebra, a roztwór niebieszczeje od jonów Cu²⁺.',
      quiz: ['Dlaczego miedź wypiera srebro z roztworu AgNO₃?', ['miedź jest aktywniejsza od srebra', 'srebro jest aktywniejsze od miedzi', 'roztwór jest kwaśny', 'miedź jest cięższa']]
    },
    {
      id: 'sod', r: 'r5', t: 'Sód na wodzie', reag: ['na', 'k', 'li', 'woda', 'php'], nacz: ['zlewka'],
      op: 'Litowce to metale, które reagują z wodą. Wrzuć kawałek sodu do wody z fenoloftaleiną.',
      cele: [['Wrzuć sód do wody', c => c.ev('r:Na-woda')], ['Zobacz, jaki odczyn ma powstały roztwór', c => any(c, v => ['różowy', 'malinowy'].includes(c.ind(v, 'php')) && A(v, 'Na^+') > 0)]],
      wsk: ['Najpierw 20 cm³ wody i 3 krople fenoloftaleiny, potem kawałek sodu (0,3 g).'],
      wyj: '2Na + 2H₂O → 2NaOH + H₂↑. Sód jest lżejszy od wody, topi się od ciepła reakcji i biega po powierzchni. Powstaje zasada, więc fenoloftaleina malinowieje. Potas reaguje jeszcze gwałtowniej – sprawdź!',
      quiz: ['Co powstaje w reakcji sodu z wodą?', ['wodorotlenek sodu i wodór', 'tlenek sodu i tlen', 'chlorek sodu', 'sól i woda']]
    },
    {
      id: 'magnez', r: 'r5', t: 'Oślepiający magnez', reag: ['mg', 'woda', 'php'], nacz: ['tygiel', 'probowka'],
      op: 'Spal magnez, a powstały biały proszek zbadaj w wodzie z fenoloftaleiną.',
      cele: [['Spal magnez w tyglu', c => c.ev('r:spalanie:Mg')], ['Przesyp tlenek magnezu do wody z fenoloftaleiną i sprawdź odczyn', c => c.ev('r:tlenek-woda:MgO') && any(c, v => ['różowy', 'malinowy'].includes(c.ind(v, 'php')))]],
      wsk: ['Magnez wrzuć do tygla i zapal pod nim palnik. Użyj ⏩.', 'Po spaleniu: do probówki 10 cm³ wody + fenoloftaleina, potem ⤵ Przelej z tygla do probówki.'],
      wyj: '2Mg + O₂ → 2MgO. Magnez spala się tak jasno, że używano go w lampach błyskowych i racach. MgO to tlenek zasadowy: z wodą daje odrobinę Mg(OH)₂, dlatego fenoloftaleina różowieje.',
      quiz: ['Jaki odczyn ma wodna zawiesina tlenku magnezu?', ['zasadowy', 'kwasowy', 'obojętny', 'żaden']]
    },
    {
      id: 'glin', r: 'r5', t: 'Glin kontra zasada', reag: ['al', 'cu', 'naoh'], nacz: ['probowka', 'probowka'],
      op: 'Czy metal może reagować z zasadą? Sprawdź glin i miedź w zasadzie sodowej.',
      cele: [['Roztwórz glin w zasadzie', c => c.ev('r:Al-NaOH')], ['Sprawdź, że miedź nie reaguje z zasadą', c => any(c, v => S(v, 'Cu') > 1e-4 && A(v, 'OH^-') / L(v) > 0.2)]],
      wsk: ['20 cm³ NaOH i kawałek folii. Podgrzej, żeby przyspieszyć.'],
      wyj: '2Al + 2NaOH + 6H₂O → 2Na[Al(OH)₄] + 3H₂↑. Glin to metal amfoteryczny – reaguje i z kwasami, i z zasadami. Dlatego garnków aluminiowych nie myje się silnie zasadowymi środkami.',
      quiz: ['Dlaczego garnków aluminiowych nie myje się silnie zasadowymi środkami?', ['glin roztwarza się w zasadach', 'garnek się namagnesuje', 'zasada wybuchnie', 'glin jest kwasem']]
    },
    {
      id: 'hno3', r: 'r5', t: 'Kwas, który gryzie miedź', reag: ['cu', 'hcl', 'hno3'], nacz: ['probowka', 'probowka'],
      op: 'Miedź nie boi się kwasu solnego. A kwasu azotowego(V)?',
      cele: [['Sprawdź miedź w kwasie solnym', c => c.ev('r:brak:Cu')], ['Roztwórz miedź w kwasie azotowym(V)', c => c.ev('r:Cu-HNO3')]],
      wsk: ['Reakcja z HNO₃ przyspiesza na gorąco.'],
      wyj: '3Cu + 8HNO₃ → 3Cu(NO₃)₂ + 2NO↑ + 4H₂O, a NO na powietrzu brunatnieje do NO₂. Kwas azotowy(V) jest silnym utleniaczem – to on, a nie jony H⁺, utlenia miedź. Złoto przetrwa nawet to; roztwarza je dopiero woda królewska (HNO₃ + HCl).',
      quiz: ['Dlaczego HNO₃ roztwarza miedź, a HCl nie?', ['kwas azotowy(V) jest silnym utleniaczem', 'HNO₃ ma niższe pH', 'HCl jest gazem', 'miedź lubi azot']]
    },
    // ---- R6
    {
      id: 'egzo', r: 'r6', t: 'Ogrzewacz do rąk', reag: ['woda', 'cacl2s', 'naohs', 'cao', 'nh4no3'], nacz: ['probowka', 'probowka'],
      op: 'Bez palnika ogrzej wodę do co najmniej 35 °C – wyłącznie chemią!',
      cele: [['Wywołaj proces egzotermiczny', c => c.ev('r:egzo')], ['Osiągnij co najmniej 35 °C bez palnika', c => any(c, v => v.T >= 35 && !v.burner && v.liq > 0.5)]],
      wsk: ['5 cm³ wody i 3 g chlorku wapnia (albo granulek NaOH, albo wapna palonego).'],
      wyj: 'Rozpuszczanie CaCl₂ lub NaOH i gaszenie wapna (CaO + H₂O → Ca(OH)₂) to procesy egzotermiczne – oddają energię jako ciepło. Tak działają samopodgrzewające się puszki i chemiczne ogrzewacze do rąk.',
      quiz: ['Reakcja egzotermiczna…', ['oddaje ciepło do otoczenia', 'pochłania ciepło z otoczenia', 'nie zmienia temperatury', 'zachodzi tylko na mrozie']]
    },
    {
      id: 'endo', r: 'r6', t: 'Zimny okład', reag: ['woda', 'nh4no3', 'kno3', 'nacls'], nacz: ['probowka'],
      op: 'Ochłodź wodę do 10 °C bez łaźni lodowej – tylko rozpuszczaniem soli.',
      cele: [['Wywołaj proces endotermiczny', c => c.ev('r:endo')], ['Osiągnij 10 °C lub mniej bez lodu', c => any(c, v => v.T <= 10 && !v.ice && v.liq > 0.5)]],
      wsk: ['5 cm³ wody i 3 g azotanu(V) amonu, mieszaj.'],
      wyj: 'Rozpuszczanie NH₄NO₃ pochłania ciepło z otoczenia (proces endotermiczny) – woda robi się lodowata. Tak działają jednorazowe okłady chłodzące w apteczkach sportowych: wystarczy zgnieść woreczek, by sól wymieszała się z wodą.',
      quiz: ['Proces, który pochłania ciepło z otoczenia, to proces…', ['endotermiczny', 'egzotermiczny', 'katalityczny', 'fotochemiczny']]
    },
    {
      id: 'slon', r: 'r6', t: 'Pasta do zębów dla słonia', reag: ['h2o2c', 'deterg', 'ki', 'kap'], nacz: ['kolba'],
      op: 'Słynne doświadczenie z pokazów chemicznych: stężona woda utleniona, detergent i katalizator. Zrób wielką pianę!',
      cele: [['Wywołaj erupcję piany', c => c.ev('r:slon')]],
      wsk: ['Do kolby: 5 cm³ perhydrolu i 1 cm³ płynu do mycia, na końcu 5 cm³ KI.'],
      wyj: '2H₂O₂ → 2H₂O + O₂↑, katalizowane jonami jodkowymi. Tlen wydziela się tak szybko, że spienia detergent w ogromny wał. Piana jest ciepła – reakcja jest silnie egzotermiczna – i lekko brązowa od śladów jodu.',
      quiz: ['Jaką rolę pełni KI w tym doświadczeniu?', ['katalizatora', 'paliwa', 'detergentu', 'wskaźnika']]
    },
    {
      id: 'tempo', r: 'r6', t: 'Znikający krzyżyk', reag: ['na2s2o3', 'hcl', 'woda'], nacz: ['probowka', 'probowka'],
      op: 'Tiosiarczan z kwasem powoli mętnieje od siarki. Zmierz czas zmętnienia na zimno i na ciepło.',
      cele: [
        ['Zmieszaj tiosiarczan z kwasem w temperaturze pokojowej', c => c.ev('r:siarka-koloid', d => d.T < 30)],
        ['Powtórz w ciepłym roztworze (powyżej 45 °C)', c => c.ev('r:siarka-koloid', d => d.T > 45)],
        ['Na ciepło reakcja ma być szybsza', c => { const e = c.evs('r:siarka-koloid'); const z = e.filter(x => x.data.T < 30), g = e.filter(x => x.data.T > 45); return z.length && g.length && Math.min(...g.map(x => x.data.t)) < Math.min(...z.map(x => x.data.t)); }]
      ],
      wsk: ['5 cm³ tiosiarczanu i 1 cm³ HCl. Czas mierzy się od dolania kwasu.', 'Do drugiej probówki wlej tiosiarczan, podgrzej go do ok. 60 °C, wyłącz palnik i dopiero wtedy dolej kwas.'],
      wyj: 'Na₂S₂O₃ + 2HCl → 2NaCl + S↓ + SO₂ + H₂O. W wyższej temperaturze cząsteczki poruszają się szybciej i częściej zderzają z odpowiednią energią, więc reakcja przyspiesza – zwykle 2–4 razy na każde 10 °C. W szkole patrzy się przez probówkę na krzyżyk narysowany na kartce i mierzy, kiedy zniknie.',
      quiz: ['Jak temperatura wpływa na szybkość reakcji?', ['wyższa temperatura – szybsza reakcja', 'wyższa temperatura – wolniejsza reakcja', 'nie ma wpływu', 'reakcje zachodzą tylko w 0 °C']]
    },
    {
      id: 'katalizator', r: 'r6', t: 'Leniwa woda utleniona', reag: ['h2o2', 'mno2', 'ziemniak'], nacz: ['probowka', 'probowka', 'probowka'],
      op: 'Porównaj rozkład wody utlenionej: samej, z braunsztynem i z kawałkiem ziemniaka.',
      cele: [['Obserwuj samą wodę utlenioną – prawie nic się nie dzieje', c => any(c, v => A(v, 'H2O2') > 0.001 && S(v, 'MnO2') < 1e-9 && S(v, 'ziemniak') < 1e-9 && R.czas - v.tMix > 5)], ['Dodaj braunsztyn (MnO₂)', c => c.ev('r:katalizator:MnO2')], ['Spróbuj z kawałkiem ziemniaka', c => c.ev('r:katalaza')]],
      wsk: ['Do każdej probówki 5 cm³ wody utlenionej. Pierwszą zostaw w spokoju na chwilę.'],
      wyj: 'Bez katalizatora H₂O₂ rozkłada się tak wolno, że trzyma się ją miesiącami w apteczce. MnO₂ i enzym katalaza z ziemniaka obniżają energię potrzebną do reakcji, więc tlen wydziela się błyskawicznie. Katalaza chroni nasze komórki przed nadtlenkiem wodoru.',
      quiz: ['Enzymy, takie jak katalaza, to…', ['biokatalizatory', 'wskaźniki', 'kwasy', 'zasady']]
    },
    {
      id: 'waz', r: 'r6', t: 'Czarny wąż', reag: ['cukier', 'h2so4c'], nacz: ['zlewka'],
      op: 'Stężony kwas siarkowy(VI) potrafi „zjeść” wodę z cukru. Zobacz, co z niego zostanie.',
      cele: [['Zwęgl cukier stężonym kwasem siarkowym(VI)', c => c.ev('r:waz')]],
      wsk: ['10 g cukru i 5 cm³ stężonego kwasu. Cierpliwości – reakcja się rozkręca.'],
      wyj: 'C₁₂H₂₂O₁₁ → 12C + 11H₂O. Stężony H₂SO₄ jest higroskopijny i odwadniający: odbiera cukrowi wodór i tlen w postaci wody. Zostaje porowaty węgiel, który para wodna wypycha w górę. To dlatego stężony kwas siarkowy tak groźnie zwęgla skórę i papier.',
      quiz: ['Jaką właściwość stężonego H₂SO₄ pokazuje to doświadczenie?', ['odwadnia (jest higroskopijny)', 'jest zasadą', 'barwi na czarno', 'jest palny']]
    },
    {
      id: 'rozcienczanie', r: 'r6', t: 'Kwas do wody!', reag: ['woda', 'h2so4c'], nacz: ['zlewka', 'probowka'], porazka: c => c.ev('r:pryskanie'),
      op: 'Musisz rozcieńczyć stężony kwas siarkowy(VI). Zrób to bezpiecznie – jedna pomyłka i zadanie trzeba zacząć od nowa.',
      cele: [['Rozcieńcz stężony kwas siarkowy(VI) bezpiecznie', c => c.ev('r:rozcienczanie-ok') && !c.ev('r:pryskanie')]],
      wsk: ['„Pamiętaj, chemiku młody, wlewaj zawsze kwas do wody.” Najpierw 20 cm³ wody w zlewce.'],
      wyj: 'Rozcieńczanie stężonego H₂SO₄ wydziela mnóstwo ciepła. Gdy wlewamy kwas do dużej ilości wody, ciepło rozchodzi się bezpiecznie. Gdy odwrotnie – pierwsze krople wody zagotowują się na powierzchni gęstego kwasu i wyrzucają go na boki.',
      quiz: ['Jak bezpiecznie rozcieńczyć stężony kwas?', ['wlewać powoli kwas do wody, mieszając', 'wlewać wodę do kwasu', 'wrzucić lód do kwasu', 'podgrzać kwas']]
    },
    {
      id: 'prazenie', r: 'r6', t: 'Prażenie', reag: ['cuso4s', 'kmno4s', 'woda'], nacz: ['probowka', 'probowka'],
      op: 'Ciepło rozkłada niektóre substancje. Wypraż kryształy siarczanu(VI) miedzi(II) i manganianu(VII) potasu.',
      cele: [['Odwodnij niebieskie kryształy CuSO₄·5H₂O', c => c.ev('r:rozklad:CuSO4')], ['Przywróć im barwę kroplą wody', c => c.ev('r:hydrat:CuSO4')], ['Rozłóż KMnO₄ i wykryj tlen', c => c.ev('test:zarzace:O2')]],
      wsk: ['Kryształy prażysz w suchej probówce. Gdy zbieleją, wyłącz palnik i ostudź probówkę w łaźni lodowej 🧊 poniżej 100 °C (inaczej kropla od razu wyparuje). Potem dodaj 1 kroplę wody.', 'Do drugiej probówki 3 g KMnO₄ i palnik, potem 🪵 Żarzące łuczywko.'],
      wyj: 'CuSO₄·5H₂O → CuSO₄ + 5H₂O. Bezwodny, biały CuSO₄ chciwie przyłącza wodę i niebieszczeje, więc służy do wykrywania wody. 2KMnO₄ → K₂MnO₄ + MnO₂ + O₂↑ – tak w szkole otrzymuje się tlen.',
      quiz: ['Biały, bezwodny CuSO₄ służy do wykrywania…', ['wody', 'tlenu', 'skrobi', 'zasad']]
    },
    // ---- R7
    {
      id: 'skrobia', r: 'r7', t: 'Gdzie jest skrobia?', reag: ['lugol', 'skrobia', 'glukoza', 'ziemniak', 'woda'], nacz: ['probowka', 'probowka', 'probowka'],
      op: 'Płyn Lugola wykrywa skrobię. Zbadaj kleik skrobiowy, ziemniak i glukozę.',
      cele: [['Wykryj skrobię płynem Lugola', c => c.ev('r:skrobia')], ['Sprawdź, że glukoza nie daje tej reakcji', c => any(c, v => A(v, 'C6H12O6') > 1e-4 && A(v, 'I2') > 1e-6 && !A(v, 'skrobia'))]],
      wsk: ['Do każdej próbki wystarczy kilka kropli Lugola (kropla = najmniejsza dawka).'],
      wyj: 'Jod wnika do wnętrza spiralnych łańcuchów skrobi i tworzy z nią granatowy kompleks. Glukoza to pojedyncza cząsteczka cukru – nie ma spirali, więc nie daje tej barwy. Tak sprawdza się, czy np. w wędlinie albo serku nie ma dodatku mąki.',
      quiz: ['Na jaki kolor jod barwi skrobię?', ['granatowy', 'czerwony', 'zielony', 'żółty']]
    },
    {
      id: 'trommer', r: 'r7', t: 'Próba Trommera', reag: ['cuso4', 'naoh', 'glukoza', 'cukier', 'woda'], nacz: ['probowka', 'probowka'],
      op: 'Glukoza ma właściwości redukujące. Udowodnij to świeżo strąconym wodorotlenkiem miedzi(II).',
      cele: [['Przygotuj świeży osad Cu(OH)₂', c => c.ev('osad:Cu(OH)2')], ['Ogrzej go z glukozą', c => c.ev('r:trommer')]],
      wsk: ['1 cm³ CuSO₄ + 5 cm³ NaOH, potem 5 cm³ glukozy i palnik.'],
      wyj: 'Glukoza ma grupę aldehydową –CHO, która redukuje Cu(OH)₂ do ceglastoczerwonego Cu₂O, a sama utlenia się do kwasu glukonowego. Sacharoza tej próby nie daje (po ogrzaniu osad tylko czernieje do CuO) – sprawdź!',
      quiz: ['Ceglastoczerwony osad w próbie Trommera to…', ['Cu₂O', 'CuO', 'Cu(OH)₂', 'CuSO₄']]
    },
    {
      id: 'tollens', r: 'r7', t: 'Lustro srebrne', reag: ['agno3', 'naoh', 'nh3', 'glukoza'], nacz: ['probowka'],
      op: 'Pokryj ścianki probówki prawdziwym srebrem! Przygotuj odczynnik Tollensa i ogrzej go z glukozą.',
      cele: [['Strąć brunatny tlenek srebra(I)', c => c.ev('osad:Ag2O')], ['Rozpuść go w amoniaku (odczynnik Tollensa)', c => c.ev('r:tollens-odczynnik')], ['Dodaj glukozę i ogrzej', c => c.ev('r:lustro')]],
      wsk: ['5 cm³ AgNO₃ + 1 kropla NaOH (osad), potem 1 cm³ NH₃, potem 5 cm³ glukozy i palnik.'],
      wyj: 'Ag₂O rozpuszcza się w amoniaku, tworząc [Ag(NH₃)₂]⁺. Glukoza redukuje te jony do metalicznego srebra, które osiada na szkle jak lustro. Tak dawniej produkowano lustra i bombki choinkowe.',
      quiz: ['Co osadza się na ściankach w próbie Tollensa?', ['metaliczne srebro', 'tlenek miedzi', 'jod', 'sól kuchenna']]
    },
    {
      id: 'bialko', r: 'r7', t: 'Białko pod ostrzałem', reag: ['bialko', 'naoh', 'cuso4', 'hno3', 'etanol'], nacz: ['probowka', 'probowka', 'probowka'],
      op: 'Białko jaja kurzego można ściąć i rozpoznać dwiema reakcjami barwnymi.',
      cele: [['Zetnij białko ogrzewaniem lub alkoholem', c => c.ev('r:denat')], ['Wykonaj reakcję biuretową (fiolet)', c => c.ev('r:biuret')], ['Wykonaj reakcję ksantoproteinową (żółć)', c => c.ev('r:ksanto')]],
      wsk: ['Biuret: 5 cm³ białka + 5 cm³ NaOH + 1 kropla CuSO₄.', 'Ksantoproteinowa: 5 cm³ białka + 5 cm³ HNO₃ i palnik.'],
      wyj: 'Denaturacja niszczy przestrzenną budowę białka – nieodwracalnie (jak przy gotowaniu jajka). Reakcja biuretowa wykrywa wiązania peptydowe (fiolet z Cu²⁺ w zasadzie), a ksantoproteinowa – pierścienie aromatyczne w aminokwasach (żółknięcie z HNO₃; dlatego kwas azotowy barwi skórę na żółto).',
      quiz: ['Odczynnikiem w reakcji ksantoproteinowej jest…', ['stężony HNO₃', 'CuSO₄', 'jod', 'NaCl']]
    },
    {
      id: 'ester', r: 'r7', t: 'Owocowy zapach', reag: ['ocet', 'etanol', 'h2so4c'], nacz: ['probowka'],
      op: 'Kwas i alkohol mogą dać substancję o zapachu owoców. Przeprowadź estryfikację.',
      cele: [['Otrzymaj ester z kwasu octowego i etanolu', c => c.ev('r:ester')], ['Powąchaj produkt', c => c.ev('test:zapach:ester')]],
      wsk: ['5 cm³ octu, 5 cm³ etanolu i 1 cm³ stężonego H₂SO₄ (katalizator), potem palnik.'],
      wyj: 'CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O. Estry odpowiadają za zapachy owoców i kwiatów: octan etylu pachnie jak klej albo gruszki, octan izoamylu – jak banany. Stężony H₂SO₄ to katalizator, który dodatkowo wiąże wodę.',
      quiz: ['Jak nazywa się reakcja kwasu z alkoholem?', ['estryfikacja', 'zobojętnianie', 'hydratacja', 'spalanie']]
    },
    {
      id: 'kameleon', r: 'r7', t: 'Kameleon chemiczny', reag: ['kmno4', 'naoh', 'glukoza'], nacz: ['zlewka'],
      op: 'Fioletowy roztwór, który sam zmienia kolor. Dodaj do manganianu(VII) potasu zasadę i glukozę, a potem patrz.',
      cele: [['Fiolet przechodzi w zieleń', c => c.ev('r:kameleon-1')], ['Zieleń przechodzi w żółtobrązowy', c => c.ev('r:kameleon')]],
      wsk: ['5 cm³ KMnO₄, 5 cm³ NaOH, 5 cm³ glukozy. Ciepło przyspiesza.'],
      wyj: 'Glukoza stopniowo redukuje mangan: MnO₄⁻ (fiolet, Mn+VII) → MnO₄²⁻ (zieleń, Mn+VI) → MnO₂ (brąz, Mn+IV). Pośrednie mieszaniny dają barwy niebieskie i oliwkowe – stąd nazwa „kameleon”.',
      quiz: ['Co zmienia się w kameleonie chemicznym?', ['stopień utlenienia manganu', 'temperatura wrzenia', 'liczba atomów manganu', 'gęstość wody']]
    },
    {
      id: 'zegar', r: 'r7', t: 'Zegar jodowy', reag: ['ki', 'h2so4', 'skrobia', 'na2s2o3', 'h2o2'], nacz: ['zlewka'],
      op: 'Zbuduj chemiczny zegar: roztwór, który po kilku sekundach nagle zrobi się granatowy.',
      cele: [['Wywołaj nagłe granatowe zabarwienie po co najmniej 3 s', c => c.ev('r:zegar', d => d.t > 3)]],
      wsk: ['Kolejność: 5 cm³ KI, 5 cm³ H₂SO₄, 1 cm³ kleiku, 1 cm³ tiosiarczanu, a na końcu 5 cm³ wody utlenionej.', 'Więcej tiosiarczanu = dłuższe odliczanie.'],
      wyj: 'H₂O₂ powoli utlenia jodki do jodu. Dopóki w roztworze jest tiosiarczan, natychmiast zamienia jod z powrotem w jodki. Gdy tiosiarczan się skończy, jod od razu tworzy granatowy kompleks ze skrobią. Czas zależy od ilości tiosiarczanu, stężeń i temperatury.',
      quiz: ['Dlaczego granatowa barwa pojawia się nagle, a nie od razu?', ['tiosiarczan zużywa jod, dopóki sam się nie skończy', 'skrobia rozpuszcza się powoli', 'roztwór musi ostygnąć', 'przypadkiem']]
    },
    // ---- R8 detektyw
    {
      id: 'det-odczyn', r: 'r8', t: 'Kwas, zasada czy woda?', tajne: ['hcl', 'naoh', 'woda'], reag: ['php', 'uni', 'lak'], nacz: ['probowka', 'probowka', 'probowka'], opcje: { ukryj: true, bezPH: true },
      op: 'Ktoś pomieszał etykiety! W trzech butelkach są: kwas solny, zasada sodowa i woda destylowana. Ustal, co jest gdzie.',
      wsk: ['Jeden wskaźnik może nie wystarczyć: fenoloftaleina nie odróżni kwasu od wody.', 'Wskaźnik uniwersalny lub lakmus pokaże wszystkie trzy odczyny.'],
      wyj: 'Wskaźniki odpowiadają na pytanie o odczyn: kwas – pH < 7, woda – pH ≈ 7, zasada – pH > 7.'
    },
    {
      id: 'det-sole', r: 'r8', t: 'Trzy sole sodu', tajne: ['nacl', 'na2co3', 'na2so4'], reag: ['hcl', 'bacl2', 'agno3'], nacz: ['probowka', 'probowka', 'probowka'], opcje: { ukryj: true },
      op: 'Trzy bezbarwne roztwory: chlorek, węglan i siarczan(VI) sodu. Rozpoznaj je reakcjami charakterystycznymi.',
      wsk: ['Węglan zdradza się burzeniem po dodaniu kwasu.', 'BaCl₂ daje biały osad z siarczanem(VI) (i z węglanem!), a AgNO₃ – z chlorkiem.'],
      wyj: 'Węglany burzą się z kwasem (CO₂), siarczany(VI) dają z Ba²⁺ osad nierozpuszczalny w kwasie, a chlorki – biały, serowaty osad z Ag⁺.'
    },
    {
      id: 'det-plomien', r: 'r8', t: 'Płomień zdradzi metal', tajne: ['nacl', 'kcl', 'licl', 'bacl2'], reag: [], nacz: ['probowka', 'probowka', 'probowka', 'probowka'], opcje: { ukryj: true },
      op: 'Cztery chlorki: sodu, potasu, litu i baru. Wszystkie bezbarwne. Użyj drucika i palnika – płomień powie resztę.',
      wsk: ['Narzędzie 🔁 Drucik: zanurza drucik w zaznaczonym naczyniu i trzyma go w płomieniu.'],
      wyj: 'Atomy metali pobudzone w płomieniu wysyłają światło o charakterystycznych barwach: sód – żółte, potas – fioletowe, lit – karminowe, bar – żółtozielone. Na tym opierają się fajerwerki.'
    },
    {
      id: 'det-halogenki', r: 'r8', t: 'Rodzina halogenków', tajne: ['nacl', 'kbr', 'ki'], reag: ['agno3', 'nh3'], nacz: ['probowka', 'probowka', 'probowka'], opcje: { ukryj: true },
      op: 'Chlorek, bromek i jodek. Wszystkie dają osad z jonami srebra – ale czy taki sam?',
      wsk: ['Porównaj odcienie osadów: biały, kremowy, żółty.', 'Wątpliwości? Amoniak rozpuszcza tylko AgCl.'],
      wyj: 'AgCl – biały, AgBr – jasnożółty, AgI – żółty. Rozpuszczalność maleje od AgCl do AgI, dlatego tylko AgCl łatwo rozpuszcza się w amoniaku.'
    },
    {
      id: 'det-metale', r: 'r8', t: 'Białe osady', tajne: ['alcl3', 'znso4', 'mgso4'], reag: ['naoh', 'nh3'], nacz: ['probowka', 'probowka', 'probowka', 'probowka'], opcje: { ukryj: true },
      op: 'Glin, cynk i magnez – wszystkie dają białe wodorotlenki. Rozpoznaj je, sprawdzając, co rozpuszcza ich osady. Zadanie dla zaawansowanych!',
      wsk: ['Najpierw mało NaOH (osad), potem nadmiar NaOH. Który osad zostaje?', 'Z dwóch, które rozpuściły się w NaOH, tylko jeden rozpuszcza się też w nadmiarze amoniaku.'],
      wyj: 'Mg(OH)₂ nie rozpuszcza się ani w NaOH, ani w NH₃. Al(OH)₃ i Zn(OH)₂ są amfoteryczne (rozpuszczają się w NaOH), ale tylko cynk tworzy rozpuszczalny kompleks z amoniakiem [Zn(NH₃)₄]²⁺.'
    },
    {
      id: 'det-cukry', r: 'r8', t: 'Cukry i skrobia', tajne: ['glukoza', 'sacharozaR', 'skrobia'], reag: ['lugol', 'cuso4', 'naoh'], nacz: ['probowka', 'probowka', 'probowka', 'probowka'], opcje: { ukryj: true },
      op: 'Glukoza, sacharoza i skrobia – trzy białe roztwory. Rozpoznaj je płynem Lugola i próbą Trommera.',
      wsk: ['Płyn Lugola wskaże skrobię.', 'Z pozostałych dwóch tylko jeden daje ceglasty osad w próbie Trommera.'],
      wyj: 'Skrobia barwi się jodem na granatowo. Glukoza (cukier redukujący) daje ceglasty Cu₂O w próbie Trommera, sacharoza – nie.'
    }
  ];
  Z.forEach((z, i) => { z.nr = i + 1; });
})();
