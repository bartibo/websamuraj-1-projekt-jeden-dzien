/* conditions.js – katalog zaburzeń wzroku: parametry, wpływ na model widzenia, schemat oka i treści edukacyjne. */
(function () {
  'use strict';

  const fmtD = (v, sign) => (sign || '') + v.toFixed(2).replace('.', ',') + ' D';
  const fmtPct = v => Math.round(v * 100) + '%';
  const fmtDeg = v => v.toFixed(v < 10 ? 1 : 0).replace('.', ',') + '°';

  const CATEGORIES = [
    { id: 'start', name: 'Punkt odniesienia' },
    { id: 'refr', name: 'Wady refrakcji', desc: 'Obraz nie skupia się dokładnie na siatkówce.' },
    { id: 'bino', name: 'Ustawienie i ruchy oczu' },
    { id: 'color', name: 'Widzenie barw' },
    { id: 'disease', name: 'Choroby oczu' },
    { id: 'other', name: 'Mózg i inne zjawiska' }
  ];

  const C = [];

  /* ======================= ZDROWE OKO ======================= */
  C.push({
    id: 'healthy', cat: 'start', name: 'Zdrowe oko', alt: 'emmetropia', icon: '👁️',
    tagline: 'Punkt odniesienia: tak widzi oko bez wad.',
    params: [],
    scenes: ['ulica-dzien'],
    apply() {},
    diagram: () => ({ type: 'anatomy', p: { part: 'healthy', severity: 0 } }),
    info: {
      sees: 'Oko działa jak aparat z automatyczną ostrością. Rogówka i soczewka skupiają światło na siatkówce, a mięsień rzęskowy zmienia kształt soczewki, kiedy patrzysz z bliska. To nazywa się akomodacją. Najostrzej widzisz tylko w małym środkowym obszarze, w plamce żółtej. Reszta pola widzenia jest dużo mniej ostra, ale mózg skleja z ruchów oczu wrażenie, że ostre jest wszystko.',
      why: 'Długość gałki ocznej (ok. 24 mm) i moc optyczna oka (ok. 60 dioptrii) są do siebie idealnie dopasowane. Tak się dzieje, kiedy dziecko rośnie, a oko „dostraja się” do ostrego obrazu. Ten proces nazywa się emmetropizacją.',
      who: 'Dorosłych bez żadnej wady wzroku jest mniej, niż się wydaje. Do tego po 45. roku życia prawie każdy zaczyna potrzebować okularów do czytania.',
      help: 'Badanie wzroku warto robić co 1–2 lata, a po 40. roku życia razem z pomiarem ciśnienia w oku.',
      fact: 'Każde oko ma ślepą plamkę: miejsce, w którym nerw wzrokowy wychodzi z oka i nie ma tam fotoreceptorów. Mózg łata tę dziurę tak dobrze, że nikt jej nie zauważa.',
      sim: 'Ruszaj kursorem po scenie. Oko patrzy tam, gdzie kursor, i ostrzy na tę odległość, jak prawdziwe oko 25-latka. Włącz „Porównaj”, żeby przy każdym zaburzeniu mieć zdrowe oko obok.',
      tryIt: ['Najedź na telefon w dłoni, a potem na autobus. Zdrowe oko ostrzy na obu.', 'Wybierz zaburzenie z listy po lewej.']
    }
  });

  /* ======================= WADY REFRAKCJI ======================= */
  C.push({
    id: 'myopia', cat: 'refr', name: 'Krótkowzroczność', alt: 'miopia', icon: '🔭',
    tagline: 'Ostro z bliska, rozmyte w dali.',
    params: [{ k: 'D', label: 'Wada', type: 'range', min: 0.5, max: 10, step: 0.25, def: 3, fmt: v => fmtD(v, '−') }],
    correction: { label: 'Załóż okulary', on: 'Okulary rozpraszające' },
    scenes: ['ulica-dzien', 'ulica-noc', 'gabinet'],
    apply(V, p, corr) { V.error += p.D; if (corr) V.lens -= p.D; },
    diagram: (p, corr, e) => ({ type: 'refraction', p: { error: p.D, cyl: 0, accom: e.accom, targetDist: e.targetDist, lens: corr ? -p.D : 0 } }),
    info: {
      sees: 'Bliskie rzeczy są ostre: telefon, książka, twarz rozmówcy. Wszystko dalej się rozmywa. Napisy na autobusach, tablice i twarze po drugiej stronie ulicy zlewają się w plamy. W nocy światła latarni i aut zmieniają się w duże, miękkie krążki. Przy wadzie −3 D ostro widać tylko do ok. 33 cm, a przy −6 D do ok. 17 cm.',
      why: 'Gałka oczna jest za długa (albo rogówka za mocno zakrzywiona), więc obraz dalekich rzeczy skupia się przed siatkówką, a nie na niej. Wadzie sprzyjają geny, ale też mało czasu na dworze i dużo patrzenia z bliska w dzieciństwie.',
      who: 'Ma ją ok. 30% ludzi na świecie. Szacuje się, że w 2050 roku będzie to co drugi człowiek. W dużych miastach Azji Wschodniej krótkowzroczność ma nawet 80–90% młodych dorosłych.',
      help: 'Okulary lub soczewki kontaktowe z soczewką rozpraszającą (minusową) albo laserowa korekcja wzroku. U dzieci postęp wady spowalniają m.in. krople z atropiną w niskiej dawce, specjalne soczewki okularowe i kontaktowe oraz co najmniej 2 godziny dziennie na dworze.',
      fact: 'Stopień wady w dioptriach to po prostu odwrotność odległości, do której widzisz ostro: przy −2 D to 1/2 m, czyli 50 cm. Bardzo duża krótkowzroczność (powyżej −6 D) zwiększa ryzyko odwarstwienia siatkówki i jaskry.',
      sim: 'Rozmycie liczę z prawdziwej optyki oka: z odległości każdego punktu sceny, wady w dioptriach i średnicy źrenicy. Dlatego w nocy (źrenica 6 mm) wada przeszkadza bardziej niż w dzień.',
      tryIt: ['Spójrz na telefon w dłoni: jest ostry.', 'Przełącz na „Ulica nocą” i zobacz światła.', 'Włącz okulary i porównaj.']
    }
  });

  C.push({
    id: 'hyperopia', cat: 'refr', name: 'Nadwzroczność', alt: 'dalekowzroczność, hipermetropia', icon: '📖',
    tagline: 'Oko musi się wysilać, żeby widzieć ostro, a z bliska wysiłek nie wystarcza.',
    params: [
      { k: 'D', label: 'Wada', type: 'range', min: 0.5, max: 8, step: 0.25, def: 3, fmt: v => fmtD(v, '+') },
      { k: 'age', label: 'Wiek', type: 'range', min: 8, max: 60, step: 1, def: 42, fmt: v => v + ' lat' }
    ],
    correction: { label: 'Załóż okulary', on: 'Okulary skupiające' },
    scenes: ['ulica-dzien', 'targ', 'gabinet'],
    apply(V, p, corr) {
      V.error -= p.D; V.amp = Math.min(V.amp, Sim.ampForAge(p.age)); V.fatigue = true;
      if (corr) V.lens += p.D;
    },
    diagram: (p, corr, e) => ({ type: 'refraction', p: { error: -p.D, cyl: 0, accom: e.accom, targetDist: e.targetDist, lens: corr ? p.D : 0 } }),
    info: {
      sees: 'Wbrew nazwie dalekowidz nie widzi „lepiej w dali”. Widzi ostro tylko dzięki ciągłemu napinaniu mięśnia, który normalnie służy do patrzenia z bliska. Młode oko często daje radę i wada pozostaje niezauważona, ale kosztem bólu głowy, pieczenia oczu i zmęczenia przy czytaniu. Gdy wada jest duża albo wiek odbiera oku siłę akomodacji, bliskie rzeczy się rozmywają, a potem także dalekie.',
      why: 'Gałka oczna jest za krótka albo układ optyczny za słaby, więc obraz skupia się za siatkówką. Oko „dosuwa” go, zwiększając moc soczewki, czyli akomodując.',
      who: 'Prawie każdy noworodek ma nadwzroczność, która zwykle zmniejsza się, gdy oko rośnie. Większa wada utrzymuje się u kilku do kilkunastu procent dzieci. U dzieci nieskorygowana nadwzroczność może wywołać zez zbieżny i niedowidzenie.',
      help: 'Okulary lub soczewki kontaktowe skupiające (plusowe), u dorosłych także zabiegi laserowe. U dzieci okulary bywają konieczne nawet wtedy, gdy dziecko „widzi dobrze”, bo chronią przed zezem i zmęczeniem.',
      fact: 'Wiele osób odkrywa nadwzroczność dopiero około 40. roku życia. Siła akomodacji spada wtedy na tyle, że wada, którą oko latami „ukrywało”, nagle wychodzi na jaw.',
      sim: 'Suwak wieku zmienia zapas akomodacji (u 10-latka to ok. 13 D, u 50-latka ok. 2 D). Pasek „Wysiłek oka” w lewym górnym rogu pokazuje, ile z niego zużywasz. Gdy przekracza ok. 60%, ostrość zaczyna falować, tak jak przy zmęczeniu.',
      tryIt: ['Patrz na telefon i obserwuj pasek wysiłku.', 'Ustaw wiek 15 lat: wszystko jest ostre, ale oko pracuje cały czas.', 'Ustaw 55 lat: rozmywa się nawet daleko.']
    }
  });

  C.push({
    id: 'astigmatism', cat: 'refr', name: 'Astygmatyzm', alt: 'niezborność', icon: '✳️',
    tagline: 'Kreski w jednym kierunku są ostre, w drugim rozmyte, a światła mają smugi.',
    params: [
      { k: 'cyl', label: 'Astygmatyzm (cylinder)', type: 'range', min: 0.5, max: 6, step: 0.25, def: 2.5, fmt: v => fmtD(v) },
      { k: 'axis', label: 'Oś', type: 'range', min: 0, max: 180, step: 5, def: 20, fmt: v => v + '°' },
      { k: 'sph', label: 'Do tego krótkowzroczność', type: 'range', min: 0, max: 6, step: 0.25, def: 0, fmt: v => v ? fmtD(v, '−') : 'brak' }
    ],
    correction: { label: 'Załóż okulary', on: 'Okulary torycze' },
    scenes: ['ulica-noc', 'gabinet', 'ulica-dzien'],
    apply(V, p, corr) {
      // astygmatyzm krótkowzroczny: jeden południk ostry w dali, drugi krótkowzroczny o wartość cylindra.
      // Patrząc w dal, oko nie może się „rozluźnić” bardziej, więc światła rozciągają się w smugi.
      V.error += p.sph + p.cyl / 2;
      V.cyl = Math.max(V.cyl, p.cyl); V.axisDeg = p.axis;
      if (corr) { V.lens -= p.sph + p.cyl / 2; V.cyl = 0; }
    },
    diagram: (p, corr, e) => ({ type: 'refraction', p: { error: p.sph + p.cyl / 2, cyl: corr ? 0 : p.cyl, axisDeg: p.axis, accom: e.accom, targetDist: e.targetDist, lens: corr ? -(p.sph + p.cyl / 2) : 0 } }),
    info: {
      sees: 'Obraz jest rozmyty „kierunkowo”. Kreski ułożone w jedną stronę są wyraźne, a w poprzek rozmyte. Litery się rozciągają, cyfry 8 i 0 albo litery E i F łatwo pomylić. Najbardziej widać to w nocy, bo każde światło zamienia się w smugę albo gwiazdkę z promieniami.',
      why: 'Rogówka (rzadziej soczewka) nie jest kulista jak piłka do koszykówki, tylko bardziej przypomina piłkę do rugby. W jednym kierunku łamie światło mocniej niż w drugim, więc oko ma dwa ogniska zamiast jednego i nie da się ostro ustawić obu naraz.',
      who: 'Bardzo częsty: niewielki astygmatyzm (od 0,5 D) ma mniej więcej co trzecia osoba. Często występuje razem z krótko- lub nadwzrocznością.',
      help: 'Okulary z soczewkami cylindrycznymi (torycznymi), soczewki kontaktowe toryczne lub laserowa korekcja. Przy nieregularnym astygmatyzmie (np. stożku rogówki) pomagają twarde soczewki kontaktowe.',
      fact: 'Oś astygmatyzmu podaje się w stopniach (0–180°) i jest wpisana w każdą receptę na okulary. Obrócenie soczewki o kilka stopni potrafi zepsuć korekcję. Spróbuj suwakiem „Oś”: smugi na światłach się obracają.',
      sim: 'Rozmycie ma kształt elipsy, bo każdy południk oka ma inne niedoostrzenie. Pokazuję najczęstszy, krótkowzroczny astygmatyzm. Z bliska oko ustawia ostrość pośrodku, na krążku najmniejszego rozproszenia, więc rozmycie jest okrągłe. W dali nie ma już jak się „rozluźnić” i światła rozciągają się w smugi.',
      tryIt: ['Przełącz na „Ulica nocą”: światła mają smugi.', 'Obracaj oś i patrz na latarnie.', 'W gabinecie zobacz, które litery mylą się najłatwiej.']
    }
  });

  C.push({
    id: 'presbyopia', cat: 'refr', name: 'Starczowzroczność', alt: 'prezbiopia', icon: '👓',
    tagline: '„Ręce za krótkie”: z wiekiem coraz trudniej czytać z bliska.',
    params: [{ k: 'age', label: 'Wiek', type: 'range', min: 38, max: 80, step: 1, def: 55, fmt: v => v + ' lat' }],
    correction: { label: 'Okulary do czytania', on: 'Okulary do czytania' },
    scenes: ['targ', 'ulica-dzien', 'gabinet'],
    apply(V, p, corr) {
      V.amp = Math.min(V.amp, Sim.ampForAge(p.age));
      if (corr) V.lens += Math.min(2.5, Math.max(0.75, Math.round((2.75 - V.amp * 0.5) * 4) / 4));
    },
    diagram: (p, corr, e) => ({ type: 'refraction', p: { error: 0, cyl: 0, accom: e.accom, targetDist: e.targetDist, lens: corr ? e.V.lens : 0 } }),
    info: {
      sees: 'Dal jest ostra, ale telefon, menu w restauracji czy etykieta na słoiku rozmywają się. Pomaga odsuwanie ich na długość ręki, aż ręki brakuje. Do tego dochodzi zmęczenie oczu przy czytaniu i potrzeba mocniejszego światła.',
      why: 'Soczewka oka z wiekiem twardnieje i traci elastyczność, więc mięsień rzęskowy nie może jej już mocno wybrzuszyć. Zakres akomodacji spada z ok. 14 dioptrii u dziecka do ok. 1 D po sześćdziesiątce. To nie choroba, tylko naturalne starzenie się oka.',
      who: 'Dotyka praktycznie każdego. Pierwsze objawy pojawiają się zwykle między 40. a 45. rokiem życia, a wada narasta mniej więcej do 60. roku.',
      help: 'Okulary do czytania, okulary dwuogniskowe lub progresywne, soczewki kontaktowe wieloogniskowe. Przy operacji zaćmy można wszczepić soczewkę wieloogniskową.',
      fact: 'Okulary do czytania korygują bliż, ale psują dal. Włącz je i spójrz na autobus albo wieżę: wszystko daleko się rozmyje. Dlatego wymyślono soczewki dwuogniskowe; przypisuje się je Benjaminowi Franklinowi.',
      sim: 'Suwak wieku ustawia zapas akomodacji zgodnie ze średnimi danymi klinicznymi. Oko ostrzy na to, na co patrzysz, ale tylko w granicach swoich możliwości.',
      tryIt: ['Spójrz na listę zakupów albo telefon.', 'Włącz okulary do czytania, a potem spójrz w dal.', 'Przesuń wiek z 40 na 70 lat.']
    }
  });

  /* ======================= OBUOCZNE ======================= */
  C.push({
    id: 'strabismus', cat: 'bino', name: 'Zez', alt: 'strabismus', icon: '👀',
    tagline: 'Oczy patrzą w różne miejsca. Dorosły widzi podwójnie, dziecko „wyłącza” jedno oko.',
    params: [
      { k: 'kind', label: 'Rodzaj', type: 'select', def: 'eso', options: [{ v: 'eso', label: 'zbieżny (do nosa)' }, { v: 'exo', label: 'rozbieżny (na zewnątrz)' }, { v: 'hyper', label: 'pionowy' }] },
      { k: 'pd', label: 'Kąt zeza', type: 'range', min: 2, max: 40, step: 1, def: 12, fmt: v => v + ' Δ (' + (v * 0.573).toFixed(1).replace('.', ',') + '°)' },
      { k: 'mode', label: 'Jak radzi sobie mózg', type: 'select', def: 'dip', options: [{ v: 'dip', label: 'podwójne widzenie (zez nabyty)' }, { v: 'sup', label: 'tłumienie (zez od dzieciństwa)' }] }
    ],
    correction: { label: 'Okulary z pryzmatem', on: 'Pryzmaty łączą obrazy' },
    scenes: ['ulica-dzien', 'gabinet', 'ulica-noc'],
    apply(V, p, corr) {
      const deg = p.pd * 0.573;
      const dir = p.kind === 'eso' ? [1, 0] : p.kind === 'exo' ? [-1, 0] : [0, 1];
      V.dipDeg = [dir[0] * deg, dir[1] * deg];
      V.dipMix = p.mode === 'dip' && !corr ? 0.5 : 0;
      if (p.mode === 'sup' && !corr) V.desat = Math.max(V.desat, 0);
    },
    diagram: (p, corr) => ({ type: 'binocular', p: { devDeg: corr ? 0 : p.pd * 0.573, kind: p.kind, mode: p.mode === 'dip' ? 'diplopia' : 'suppression' } }),
    info: {
      sees: 'Gdy zez pojawia się u dorosłego (np. po udarze, urazie, w cukrzycy albo chorobie tarczycy), każde oko widzi co innego, a mózg nie umie tego połączyć. Wszystko jest podwójne, zwykle przesunięte w bok, a przy zezie pionowym jedno nad drugim. Trudno zejść ze schodów, nalać wody do szklanki czy prowadzić auto. Dziecko z zezem od maleńkości zwykle nie widzi podwójnie, bo jego mózg uczy się ignorować obraz z odchylonego oka. Płaci za to niedowidzeniem i słabszym widzeniem przestrzennym.',
      why: 'Mięśnie poruszające gałkami ocznymi nie współpracują albo nerwy, które nimi sterują, są uszkodzone. U dzieci częstą przyczyną jest nieskorygowana nadwzroczność: oko tak mocno akomoduje, że „zjeżdża” do nosa.',
      who: 'Zez ma ok. 2–4% dzieci. U dorosłych nagłe podwójne widzenie zawsze wymaga pilnej diagnozy, bo może być objawem udaru albo tętniaka.',
      help: 'Okulary (także z pryzmatami), u dzieci zasłanianie zdrowego oka, ćwiczenia ortoptyczne, operacja mięśni ocznych, czasem zastrzyki z toksyny botulinowej.',
      fact: 'Kąt zeza podaje się w dioptriach pryzmatycznych (Δ). 1 Δ przesuwa obraz o 1 cm na odległości 1 metra, czyli o ok. 0,57°.',
      sim: 'W trybie „podwójne widzenie” nakładam obraz drugiego oka przesunięty o kąt zeza. W trybie „tłumienie” widzisz pojedynczo, tak jak dziecko z zezem. Brakuje jednak widzenia przestrzennego, którego na płaskim ekranie nie da się pokazać.',
      tryIt: ['Zwiększaj kąt i czytaj rozkład jazdy.', 'Przełącz na zez pionowy.', 'Włącz pryzmaty.']
    }
  });

  C.push({
    id: 'amblyopia', cat: 'bino', name: 'Niedowidzenie', alt: 'amblyopia, „leniwe oko”', icon: '🙈',
    tagline: 'Oko jest zdrowe, ale mózg nie nauczył się z niego korzystać.',
    params: [
      { k: 'v', label: 'Ostrość słabszego oka', type: 'range', min: 0.05, max: 0.6, step: 0.05, def: 0.2, fmt: v => v.toFixed(2).replace('.', ',') },
      { k: 'view', label: 'Patrzysz', type: 'select', def: 'weak', options: [{ v: 'weak', label: 'tylko słabszym okiem (zdrowe zasłonięte)' }, { v: 'both', label: 'obojgiem oczu' }] }
    ],
    correction: { label: 'Terapia w dzieciństwie', on: 'Po leczeniu zasłanianiem' },
    scenes: ['gabinet', 'ulica-dzien'],
    apply(V, p, corr) {
      if (p.view !== 'weak') return;
      const v = corr ? Math.max(p.v, 0.8) : p.v;
      V.baseD += (1 / v - 1) / 3.6;
      V.warp = Math.max(V.warp, 0.45 * (1 - v));
      V.contrast += 0.14 * (1 - v);
      V.visusCap = Math.min(V.visusCap, v);
    },
    diagram: () => ({ type: 'binocular', p: { devDeg: 0, kind: 'eso', mode: 'amblyopia' } }),
    info: {
      sees: 'Obojgiem oczu świat wygląda prawie normalnie, bo mózg korzysta z lepszego oka. Słabiej działa tylko widzenie przestrzenne, czyli ocena odległości. Gdy jednak zasłonić zdrowe oko, obraz jest rozmyty, mało kontrastowy i lekko „pofalowany”. Litery stojące obok siebie zlewają się mocniej niż pojedyncze (to tzw. stłoczenie). Okulary tego nie poprawią, bo problem leży w mózgu, a nie w oku.',
      why: 'W pierwszych latach życia mózg uczy się widzieć. Jeśli jedno oko dostarcza gorszy obraz, np. przez zeza, dużą różnicę wad między oczami albo wrodzoną zaćmę, mózg zaczyna go ignorować. Połączenia nerwowe dla tego oka się nie rozwijają.',
      who: 'Ok. 2–3% ludzi. To najczęstsza przyczyna słabego widzenia jednym okiem u dzieci i młodych dorosłych.',
      help: 'Leczenie działa najlepiej przed 7.–8. rokiem życia: najpierw korekcja wady, potem zasłanianie zdrowego oka plastrem na kilka godzin dziennie albo krople z atropiną. Coraz częściej stosuje się też gry komputerowe, w których każde oko widzi inny obraz.',
      fact: 'Dlatego badania wzroku u przedszkolaków są tak ważne. Dziecko z jednym słabym okiem zwykle się nie skarży, bo nie wie, że może widzieć inaczej.',
      sim: 'W trybie „tylko słabszym okiem” dodaję rozmycie, spadek kontrastu i delikatne, nieregularne zniekształcenia, które opisują osoby z niedowidzeniem. W trybie obuocznym obraz jest normalny, bo to właśnie jest sedno tej wady.',
      tryIt: ['W gabinecie sprawdź, którą linię tablicy przeczytasz.', 'Przełącz na „obojgiem oczu”.']
    }
  });

  C.push({
    id: 'nystagmus', cat: 'bino', name: 'Oczopląs', alt: 'nystagmus', icon: '〰️',
    tagline: 'Oczy same, rytmicznie drgają.',
    params: [
      { k: 'amp', label: 'Amplituda', type: 'range', min: 0.2, max: 3, step: 0.1, def: 1.2, fmt: v => fmtDeg(v) },
      { k: 'freq', label: 'Częstotliwość', type: 'range', min: 1, max: 6, step: 0.5, def: 3, fmt: v => v.toFixed(1).replace('.', ',') + ' Hz' },
      { k: 'kind', label: 'Rodzaj', type: 'select', def: 'jerk', options: [{ v: 'jerk', label: 'skokowy' }, { v: 'pendular', label: 'wahadłowy' }] },
      { k: 'onset', label: 'Kiedy powstał', type: 'select', def: 'acq', options: [{ v: 'acq', label: 'nabyty (świat „skacze”)' }, { v: 'cong', label: 'wrodzony (mózg kompensuje)' }] }
    ],
    correction: { label: 'Pozycja blokująca', on: 'Głowa w pozycji blokującej' },
    scenes: ['ulica-dzien', 'gabinet'],
    apply(V, p, corr) {
      const k = corr ? 0.3 : 1;
      if (p.onset === 'acq') { V.shakeAmp = p.amp * k; V.shakeFreq = p.freq; V.shakeKind = p.kind; }
      else { V.shakeAmp = 0.12 * p.amp * k; V.shakeFreq = p.freq; V.shakeKind = p.kind; V.baseD += 0.5 * p.amp * k; V.visusCap = Math.min(V.visusCap, 0.6 / (0.6 + p.amp * k)); }
    },
    diagram: (p, corr) => ({ type: 'binocular', p: { devDeg: 0, kind: 'eso', mode: 'nystagmus', ampDeg: p.amp * (corr ? 0.3 : 1), jerk: p.kind === 'jerk' } }),
    info: {
      sees: 'Przy oczopląsie nabytym (np. po udarze, w stwardnieniu rozsianym, po zatruciu) świat drga, skacze albo płynie. To tzw. oscylopsja, która utrudnia czytanie i chodzenie i wywołuje zawroty głowy. Osoby z oczopląsem wrodzonym zwykle nie widzą drgań, bo mózg je kompensuje, ale mają obniżoną ostrość wzroku. Odczytanie czegoś zajmuje im więcej czasu.',
      why: 'Zaburzone są mechanizmy, które utrzymują wzrok nieruchomo na celu: ośrodki w pniu mózgu, móżdżek, błędnik albo droga wzrokowa. Oczopląs wrodzony często towarzyszy albinizmowi, achromatopsji i innym wrodzonym chorobom oczu.',
      who: 'Szacuje się, że oczopląs ma ok. 1 na 400–1000 osób. Krótki oczopląs przy patrzeniu daleko w bok bywa zupełnie normalny.',
      help: 'Korekcja wad wzroku, soczewki kontaktowe, czasem leki (np. gabapentyna, memantyna) lub operacja mięśni ocznych, która przesuwa „punkt ciszy” na wprost.',
      fact: 'Wiele osób z oczopląsem ma „punkt ciszy”: położenie oczu, w którym drgania prawie ustają. Dlatego często trzymają głowę lekko obróconą albo przechyloną.',
      sim: 'W trybie nabytym cały obraz drga z wybraną amplitudą i częstotliwością. Oczopląs skokowy to powolny dryf i szybki powrót, wahadłowy to płynne kołysanie. W trybie wrodzonym zostaje tylko lekkie drżenie i spadek ostrości.',
      tryIt: ['Spróbuj przeczytać rozkład jazdy.', 'Włącz „pozycję blokującą”.']
    }
  });

  /* ======================= BARWY ======================= */
  const cvdInfo = (who, what) => ({ who, what });
  function cvdCond(id, name, alt, type, icon, tagline, info, diagramMissing) {
    C.push({
      id, cat: 'color', name, alt, icon, tagline,
      params: [{ k: 'sev', label: 'Nasilenie', type: 'range', min: 0.1, max: 1, step: 0.05, def: 1, fmt: v => v >= 0.99 ? 'pełne (' + alt.split(',')[0] + ')' : 'anomalia ' + fmtPct(v) }],
      scenes: ['targ', 'tablice', 'ulica-dzien'],
      apply(V, p) { V.cvd = type; V.cvdSev = p.sev; },
      diagram: p => ({ type: 'cones', p: { missing: diagramMissing, shift: p.sev, mono: false } }),
      info
    });
  }
  cvdCond('deutan', 'Daltonizm: zielony', 'deuteranopia, deuteranomalia', 'deutan', '🍏',
    'Najczęstszy rodzaj daltonizmu: czerwień i zieleń zlewają się w oliwkowo-żółte odcienie.', {
      sees: 'Czerwone i zielone jabłka mają prawie ten sam kolor. Dojrzałego pomidora trudno odróżnić od niedojrzałego, zielone kropki na mapie od czerwonych, a brązowy od zielonego. Pozostaje dobre rozróżnianie niebieskiego od żółtego. Większość osób z deuteranomalią (słabszą formą) widzi kolory, tylko „przygaszone” i łatwiejsze do pomylenia.',
      why: 'Czopki wrażliwe na zieleń (typu M) nie działają albo ich barwnik jest przesunięty w stronę czerwieni. Gen tych barwników leży na chromosomie X, dlatego wada dotyka głównie mężczyzn.',
      who: 'Ok. 6% mężczyzn (w tym ok. 5% deuteranomalia, ok. 1% deuteranopia) i ok. 0,4% kobiet.',
      help: 'Daltonizmu się nie leczy. Pomagają aplikacje, które nazywają kolory, oznaczenia symbolami zamiast samym kolorem i ustawienia ułatwień dostępu w komputerze i telefonie. Okulary z filtrami (np. EnChroma) zwiększają u części osób kontrast między barwami, ale nie przywracają widzenia kolorów.',
      fact: 'Nazwa „daltonizm” pochodzi od chemika Johna Daltona, który w 1794 roku opisał własną wadę. Poprosił, żeby po śmierci zbadano jego oczy. W 1995 roku z zachowanej tkanki wyczytano, że miał deuteranopię.',
      sim: 'Kolory przeliczam modelem Machado i współpracowników (2009), uznanym w badaniach nad widzeniem barw. Suwak przechodzi od anomalii (słabszej czułości) do całkowitego braku czopków.',
      tryIt: ['Na targu porównaj czerwone i zielone jabłka.', 'Otwórz „Tablice barwne”: które liczby znikają?', 'Spójrz na sygnalizator na ulicy.']
    }, 'M');
  cvdCond('protan', 'Daltonizm: czerwony', 'protanopia, protanomalia', 'protan', '🍎',
    'Czerwień jest ciemna i bura, myli się z zielenią i brązem.', {
      sees: 'Podobnie jak przy deuteranopii, czerwień i zieleń się zlewają, ale do tego czerwone rzeczy wyglądają na dużo ciemniejsze. Czerwone światło stopu, czerwony napis na czarnym tle czy dojrzała truskawka „gasną”. Czerwona róża może wyglądać prawie jak ciemne liście.',
      why: 'Brakuje czopków wrażliwych na czerwień (typu L) albo ich barwnik jest przesunięty w stronę zieleni. Dziedziczenie, jak przy deuteranopii, jest sprzężone z chromosomem X.',
      who: 'Ok. 2% mężczyzn (po ok. 1% protanopii i protanomalii) i ok. 0,02% kobiet.',
      help: 'Nie ma leczenia. Pomagają oznaczenia, aplikacje i ułatwienia dostępu. Sygnalizatory świetlne mają stałą kolejność świateł (czerwone zawsze u góry) właśnie z myślą o daltonistach.',
      fact: 'Osoby z protanopią widzą czerwone światło jako ciemniejsze, więc później zauważają światła stopu samochodu przed sobą. W niektórych krajach wada ta wyklucza z części zawodów, np. pilota.',
      sim: 'Model Machado (2009), liczony w liniowej przestrzeni barw. Zwróć uwagę, że czerwień nie tylko zmienia odcień, ale też ciemnieje.',
      tryIt: ['Spójrz na czerwone napisy cen na targu.', 'Porównaj róże z liśćmi.', 'Sprawdź tablice barwne.']
    }, 'L');
  cvdCond('tritan', 'Daltonizm: niebieski', 'tritanopia, tritanomalia', 'tritan', '🫐',
    'Rzadki: niebieski myli się z zielonym, a żółty z różowym.', {
      sees: 'Niebo i morze wyglądają turkusowo-zielono, żółte rzeczy różowo albo jasnoszaro, a fioletowe zlewają się z czerwonymi. Borówki i jeżyny tracą swój granatowy kolor. Czerwień i zieleń pozostają rozróżnialne.',
      why: 'Nie działają czopki wrażliwe na krótkie fale (typu S, „niebieskie”). Wada wrodzona jest dziedziczona niezależnie od płci. Wada nabyta może się pojawić w jaskrze, w chorobach siatkówki i przy zaćmie, bo żółknąca soczewka pochłania niebieskie światło.',
      who: 'Wrodzona tritanopia jest bardzo rzadka: szacunki mówią o ok. 1 osobie na 10–50 tysięcy, tak samo często u kobiet i mężczyzn.',
      help: 'Nie ma leczenia wady wrodzonej. Przy wadzie nabytej leczy się przyczynę, np. zaćmę.',
      fact: 'Czopków „niebieskich” jest najmniej, ok. 5–10% wszystkich, a w samym środku plamki żółtej nie ma ich wcale. Każdy ma więc malutką „tritanopię” w centrum widzenia, której nie zauważa.',
      sim: 'Model Machado (2009) dla braku czopków S.',
      tryIt: ['Spójrz na niebo i borówki na targu.', 'Sprawdź ostatnią tablicę barwną.']
    }, 'S');

  C.push({
    id: 'achromatopsia', cat: 'color', name: 'Achromatopsja', alt: 'całkowita ślepota barw', icon: '⚫',
    tagline: 'Świat w odcieniach szarości, słaba ostrość i oślepiające światło dzienne.',
    params: [],
    correction: { label: 'Ciemne filtry', on: 'Okulary z czerwonym filtrem' },
    scenes: ['targ', 'ulica-dzien'],
    apply(V, p, corr, ctx) {
      V.mono = 1;
      V.baseD += 2.4; V.visusCap = Math.min(V.visusCap, 0.12);
      V.shakeAmp = Math.max(V.shakeAmp, 0.25); V.shakeFreq = 4; V.shakeKind = 'pendular';
      if (!corr) {
        V.exposure *= ctx.night ? 1.25 : 2.1;
        V.scatter += ctx.night ? 0.05 : 0.18; V.veil += ctx.night ? 0 : 0.12;
        V.squint = Math.max(V.squint, ctx.night ? 0 : 0.42);
      }
    },
    diagram: () => ({ type: 'cones', p: { missing: null, shift: 1, mono: true } }),
    info: {
      sees: 'Nie ma kolorów, tylko odcienie szarości. W dzień jest za jasno: światło oślepia, oczy mrużą się i łzawią. Ostrość wzroku jest niska, ok. 0,1 (czyli tyle, ile widzi zdrowe oko z 10 razy większej odległości), a oczy często drgają w oczopląsie. O zmierzchu i w pochmurne dni widzi się wyraźnie lepiej.',
      why: 'Czopki, odpowiedzialne za kolory i ostre widzenie w dzień, nie działają. Pracują tylko pręciki, przystosowane do patrzenia w półmroku, które w pełnym słońcu są całkowicie „przesterowane”.',
      who: 'Bardzo rzadka: ok. 1 na 30 tysięcy osób. Wyjątkiem jest atol Pingelap na Pacyfiku, gdzie po tajfunie w XVIII wieku wadę ma nawet 5–10% mieszkańców.',
      help: 'Ciemne okulary z czerwonawym filtrem (odcinają światło, które najmocniej oślepia pręciki), pomoce powiększające, w badaniach terapia genowa.',
      fact: 'Oliver Sacks opisał Pingelap w książce „Wyspa daltonistów”. Mieszkańcy z achromatopsją wypływają na nocne połowy, bo w ciemności widzą lepiej niż inni.',
      sim: 'Łączę brak barw (widzenie samymi pręcikami), rozmycie odpowiadające ostrości ok. 0,1, oślepienie w dzień, mrużenie oczu i delikatny oczopląs. W scenie nocnej oślepienie znika.',
      tryIt: ['Porównaj „Targ” i „Ulica nocą”.', 'Włącz ciemne filtry.']
    }
  });

  /* ======================= CHOROBY OCZU ======================= */
  C.push({
    id: 'cataract', cat: 'disease', name: 'Zaćma', alt: 'katarakta', icon: '🌫️',
    tagline: 'Mętniejąca soczewka: mgła, pożółkłe kolory i oślepiające światła.',
    params: [{ k: 's', label: 'Zaawansowanie', type: 'range', min: 0.1, max: 1, step: 0.05, def: 0.6, fmt: fmtPct }],
    correction: { label: 'Operacja zaćmy', on: 'Wszczepiona sztuczna soczewka' },
    scenes: ['ulica-noc', 'targ', 'ulica-dzien'],
    apply(V, p, corr) {
      if (corr) { V.amp = Math.min(V.amp, 0.4); return; }
      const s = p.s;
      V.baseD += 1.6 * s * s + 0.3 * s;
      V.scatter += 0.45 * s; V.veil += 0.3 * s;
      V.tint = [V.tint[0], V.tint[1] * (1 - 0.13 * s), V.tint[2] * (1 - 0.5 * s)];
      V.exposure *= 1 - 0.3 * s; V.contrast += 0.12 * s; V.desat += 0.12 * s;
      V.error += 0.5 * s;   // zaćma jądrowa przesuwa refrakcję w stronę krótkowzroczności
    },
    diagram: (p, corr) => ({ type: 'anatomy', p: { part: 'lens', severity: corr ? 0 : p.s } }),
    info: {
      sees: 'Wszystko wygląda jak przez zaparowaną, pożółkłą szybę. Kolory są wyblakłe i cieplejsze (niebieski i fioletowy prawie znikają), a kontrast słabnie. Najgorzej jest w nocy i pod słońce: każde światło rozlewa się w dużą, oślepiającą poświatę z halo, przez co jazda autem po zmroku staje się niebezpieczna.',
      why: 'Białka w soczewce oka z wiekiem zmieniają strukturę, a soczewka mętnieje i brązowieje. Zaćmie sprzyjają wiek, promienie UV, cukrzyca, palenie, sterydy i urazy. Bywa też wrodzona.',
      who: 'Najczęstsza przyczyna ślepoty na świecie. W krajach bogatych to prawie zawsze kwestia czasu: wyraźną zaćmę ma znaczna część osób po 70.–75. roku życia.',
      help: 'Operacja: mętną soczewkę rozbija się ultradźwiękami i zastępuje sztuczną. Zabieg trwa ok. 15–20 minut i jest jedną z najczęściej wykonywanych operacji na świecie.',
      fact: 'Claude Monet malował z zaawansowaną zaćmą i jego obrazy z tamtych lat są brunatno-czerwone. Po operacji w 1923 roku znów zobaczył błękity i część płócien przemalował. Ciekawostka z symulacji: po operacji standardowa sztuczna soczewka nie akomoduje, więc do czytania potrzebne są okulary. Włącz operację i spójrz na telefon.',
      sim: 'Zaćmę tworzą: rozproszenie światła w soczewce (poświaty i zamglenie liczone z jasności sceny), żółty filtr pochłaniający niebieskie światło, spadek kontrastu, rozmycie i lekki przesuw w stronę krótkowzroczności.',
      tryIt: ['Przełącz na „Ulica nocą”: zobacz światła aut.', 'Na targu porównaj borówki i fiołki.', 'Włącz operację.']
    }
  });

  C.push({
    id: 'glaucoma', cat: 'disease', name: 'Jaskra', alt: 'glaukoma', icon: '🕳️',
    tagline: 'Cichy złodziej wzroku: niezauważalnie zabiera pole widzenia od brzegów.',
    params: [{ k: 's', label: 'Zaawansowanie', type: 'range', min: 0.1, max: 1, step: 0.05, def: 0.6, fmt: fmtPct }],
    scenes: ['ulica-dzien', 'targ'],
    apply(V, p) { V.glaucoma = 45 * Math.pow(4 / 45, p.s); V.contrast += 0.06 * p.s; },   // promień zachowanego pola w stopniach
    diagram: p => ({ type: 'anatomy', p: { part: 'opticNerve', severity: p.s } }),
    info: {
      sees: 'Na początku nic, i to jest najgroźniejsze. Ubytki zaczynają się na obrzeżach pola widzenia, często łukiem nad lub pod punktem patrzenia, a mózg „zamalowuje” je otoczeniem. Chorzy nie widzą czarnych plam, tylko po prostu nie zauważają rzeczy z boku: rowerzysty, krawężnika, ręki podanej do przywitania. Ostre widzenie w centrum zostaje najdłużej, aż zostaje „tunel”.',
      why: 'Nerw wzrokowy ulega powolnemu uszkodzeniu, najczęściej przez zbyt wysokie ciśnienie w oku, choć jaskra zdarza się też przy ciśnieniu prawidłowym. Obumarłe włókna nerwowe się nie odbudowują.',
      who: 'Na świecie choruje ok. 80 milionów ludzi. W Polsce szacunki mówią o kilkuset tysiącach chorych, z których mniej więcej połowa o tym nie wie. Ryzyko rośnie po 40. roku życia, przy jaskrze w rodzinie i dużej krótkowzroczności.',
      help: 'Krople obniżające ciśnienie, laser, operacja. Leczenie zatrzymuje chorobę, ale nie odwraca szkód, dlatego tak ważne jest wczesne wykrycie: pomiar ciśnienia w oku i badanie nerwu wzrokowego po 40. roku życia.',
      fact: 'Popularne obrazki „jaskry” z czarnym tunelem są mylące. Badania z udziałem pacjentów pokazują, że opisują oni raczej rozmyte, wyblakłe lub „brakujące” fragmenty obrazu niż czerń. Dlatego domyślnie pokazuję ubytki jako rozmyte i przygaszone. Wersję podręcznikową możesz włączyć przełącznikiem stylu ubytków.',
      sim: 'Ubytek jest „przyklejony” do siatkówki: idzie za twoim wzrokiem (kursorem). Nie da się więc „spojrzeć obok”. Kształt ubytku jest nieregularny, z typowym zwężeniem od strony nosa.',
      tryIt: ['Ruszaj kursorem: ubytek wędruje razem ze wzrokiem.', 'Zmień styl ubytków na czarny i porównaj.', 'Zwiększ zaawansowanie do 90%.']
    }
  });

  C.push({
    id: 'amd', cat: 'disease', name: 'Zwyrodnienie plamki (AMD)', alt: 'AMD', icon: '🎯',
    tagline: 'Znika środek obrazu, ten, na który właśnie patrzysz. Proste linie falują.',
    params: [
      { k: 'size', label: 'Wielkość mroczka', type: 'range', min: 1.5, max: 14, step: 0.5, def: 3.5, fmt: v => fmtDeg(v) },
      { k: 'type', label: 'Postać', type: 'select', def: 'wet', options: [{ v: 'dry', label: 'sucha' }, { v: 'wet', label: 'wysiękowa (mokra)' }] }
    ],
    scenes: ['gabinet', 'ulica-dzien', 'targ'],
    apply(V, p) {
      V.scotoma = p.size; V.metamorph = p.type === 'wet' ? 1 : 0.45;
      V.contrast += 0.1; V.desat += 0.15; V.visusCap = Math.min(V.visusCap, Math.max(0.02, 0.3 / p.size));
    },
    diagram: p => ({ type: 'anatomy', p: { part: 'macula', severity: Math.min(1, p.size / 12 + (p.type === 'wet' ? 0.2 : 0)) } }),
    info: {
      sees: 'Dokładnie tam, gdzie patrzysz, jest szara, rozmyta plama. Nie da się przeczytać tekstu, rozpoznać twarzy, nawlec igły ani zobaczyć wskazówek zegara. Proste linie, np. framugi, płytki i kratki, wyginają się i falują. Boczne widzenie zostaje, więc chory może swobodnie chodzić, ale żeby coś zobaczyć, musi patrzeć „obok”.',
      why: 'Z wiekiem w plamce żółtej (centrum siatkówki) gromadzą się złogi (druzy), a komórki obumierają. To postać sucha. W postaci wysiękowej pod siatkówką rosną nieprawidłowe naczynia krwionośne, które przeciekają i wywołują szybkie pogorszenie wzroku.',
      who: 'Główna przyczyna poważnej utraty wzroku u osób starszych w krajach rozwiniętych. Na świecie choruje ok. 200 milionów ludzi. Ryzyko rośnie po 50. roku życia, przy paleniu papierosów i w rodzinach z AMD.',
      help: 'Postać wysiękową leczy się zastrzykami do oka z lekami anty-VEGF, które hamują rozrost naczyń. W postaci suchej pomagają: rzucenie palenia, dieta bogata w luteinę i zeaksantynę (warzywa liściaste) i specjalne suplementy (wg badań AREDS). Dla postaci suchej pojawiają się nowe leki.',
      fact: 'Prosty domowy test to siatka Amslera: kratka z kropką pośrodku. Jeśli patrząc na kropkę jednym okiem widzisz pofalowane linie albo brakujące fragmenty, trzeba pilnie iść do okulisty.',
      sim: 'Mroczek jest przyklejony do miejsca, na które patrzysz: ruszaj kursorem i spróbuj przeczytać tablicę Snellena. W postaci wysiękowej dodaję mocniejsze zniekształcenia linii (metamorfopsje).',
      tryIt: ['W gabinecie spróbuj przeczytać tablicę.', 'Spójrz obok litery: wtedy ją „widać”.', 'Porównaj postać suchą i mokrą.']
    }
  });

  C.push({
    id: 'diabetic', cat: 'disease', name: 'Retinopatia cukrzycowa', alt: 'powikłanie cukrzycy', icon: '🩸',
    tagline: 'Plamy, rozmycie i wahania ostrości z uszkodzonych naczyń siatkówki.',
    params: [{ k: 's', label: 'Zaawansowanie', type: 'range', min: 0.1, max: 1, step: 0.05, def: 0.6, fmt: fmtPct }],
    scenes: ['ulica-dzien', 'targ'],
    apply(V, p) {
      const s = p.s;
      V.dr = s; V.edema = 0.55 * s; V.baseD += 0.7 * s; V.floaters = Math.max(V.floaters, 0.5 * s);
      V.desat += 0.18 * s; V.contrast += 0.1 * s; V.visusCap = Math.min(V.visusCap, 1 - 0.75 * s);
    },
    diagram: p => ({ type: 'anatomy', p: { part: 'retinaVessels', severity: p.s } }),
    info: {
      sees: 'Obraz jest rozmyty, zwłaszcza w centrum, gdy obrzęk obejmuje plamkę. Pojawiają się ciemne, czerwonawe plamy (wylewy krwi), pływające cienie i nici. Kolory bledną, a ostrość potrafi się zmieniać z dnia na dzień razem z poziomem cukru. We wczesnym stadium nie ma żadnych objawów.',
      why: 'Długotrwale podwyższony cukier uszkadza drobne naczynia krwionośne siatkówki. Przeciekają, tworzą mikrotętniaki i wylewy, a niedotleniona siatkówka wytwarza nowe, kruche naczynia, które łatwo pękają.',
      who: 'Jakieś zmiany ma mniej więcej co trzecia osoba z cukrzycą. To główna przyczyna ślepoty u dorosłych w wieku produkcyjnym.',
      help: 'Kontrola cukru, ciśnienia i cholesterolu. Zastrzyki anty-VEGF i sterydy przy obrzęku plamki, laseroterapia, a w zaawansowanych przypadkach operacja witrektomii. Osoby z cukrzycą powinny badać dno oka co najmniej raz w roku.',
      fact: 'Do wykrywania retinopatii od lat używa się sztucznej inteligencji. Zdjęcie dna oka analizowane przez algorytm pozwala na badania przesiewowe tam, gdzie brakuje okulistów.',
      sim: 'Wylewy są „przyklejone” do siatkówki i idą za wzrokiem. Dodaję też rozmycie centralne (obrzęk plamki), męty i spadek kontrastu oraz nasycenia barw.',
      tryIt: ['Ruszaj wzrokiem po scenie.', 'Zwiększ zaawansowanie.']
    }
  });

  C.push({
    id: 'rp', cat: 'disease', name: 'Barwnikowe zwyrodnienie siatkówki', alt: 'retinitis pigmentosa', icon: '🌒',
    tagline: 'Najpierw ślepota zmierzchowa, potem widzenie jak przez rurę.',
    params: [{ k: 's', label: 'Zaawansowanie', type: 'range', min: 0.1, max: 1, step: 0.05, def: 0.65, fmt: fmtPct }],
    scenes: ['ulica-noc', 'ulica-dzien'],
    apply(V, p) { V.tunnel = 40 * Math.pow(3 / 40, p.s); V.nightBlind = Math.max(V.nightBlind, 0.6 + 0.4 * p.s); V.fieldDim = 0.35; },
    diagram: p => ({ type: 'anatomy', p: { part: 'retinaPeriphery', severity: p.s } }),
    info: {
      sees: 'Pierwszym objawem jest kłopot z widzeniem po zmroku i długie przyzwyczajanie się do ciemności. Potem pole widzenia zwęża się od brzegów: zostaje „tunel”, czasem o średnicy kilku stopni. Przez taki tunel można przeczytać pojedyncze słowo, ale nie widać, co jest pod nogami. Ostre widzenie w centrum długo się utrzymuje.',
      why: 'Choroba genetyczna (znanych jest ponad 80 genów), w której stopniowo obumierają fotoreceptory: najpierw pręciki na obwodzie siatkówki, potem czopki.',
      who: 'Ok. 1 na 3–4 tysiące osób. Pierwsze objawy pojawiają się zwykle w dzieciństwie lub u młodych dorosłych.',
      help: 'Przy jednej z postaci (mutacja RPE65) zarejestrowano terapię genową, a w badaniach są kolejne. Pomagają ochrona przed słońcem, rehabilitacja wzroku, białe laski i latarki o szerokim snopie.',
      fact: 'Osoba z RP może przeczytać napis na pudełku, ale potknąć się o to pudełko. Dla obserwatora to wygląda jak niekonsekwencja, a to po prostu skutek widzenia tunelowego.',
      sim: 'Tunel podąża za wzrokiem. W scenie nocnej dodatkowo znika wszystko, co słabo oświetlone: tak działa ślepota zmierzchowa przy uszkodzonych pręcikach.',
      tryIt: ['Przełącz na „Ulica nocą”.', 'Spróbuj policzyć ludzi na ulicy.']
    }
  });

  C.push({
    id: 'detachment', cat: 'disease', name: 'Odwarstwienie siatkówki', alt: 'stan nagły!', icon: '⚡',
    tagline: 'Błyski, „deszcz” mętów i zasłona nasuwająca się na pole widzenia.',
    params: [{ k: 's', label: 'Postęp', type: 'range', min: 0.1, max: 1, step: 0.05, def: 0.45, fmt: fmtPct }],
    correction: { label: 'Pilna operacja', on: 'Siatkówka przyłożona' },
    scenes: ['ulica-dzien', 'targ'],
    apply(V, p, corr) {
      if (corr) { V.floaters = Math.max(V.floaters, 0.25); return; }
      V.detach = p.s; V.floaters = Math.max(V.floaters, 1); V.flashes = 1; V.baseD += 0.3 * p.s;
    },
    diagram: (p, corr) => ({ type: 'anatomy', p: { part: 'detachment', severity: corr ? 0.05 : p.s } }),
    info: {
      sees: 'Najpierw pojawiają się błyski światła na obrzeżach, nawet przy zamkniętych oczach, i nagły „deszcz” czarnych kropek i pajęczyn. Potem od jednej strony nasuwa się ciemna, falująca zasłona, jakby ktoś zaciągał kurtynę. Linie przy jej brzegu się wyginają. Jeśli odwarstwienie obejmie plamkę, gwałtownie spada ostrość wzroku.',
      why: 'Siatkówka odkleja się od tylnej ściany oka, zwykle przez przedarcie, przez które pod siatkówkę wnika płyn. Sprzyjają temu duża krótkowzroczność, wiek, urazy oka i wcześniejsze operacje.',
      who: 'Co roku ok. 1 na 10 tysięcy osób. Przy wysokiej krótkowzroczności ryzyko jest kilkukrotnie wyższe.',
      help: 'To stan nagły! Nagłe błyski, deszcz mętów albo cień w polu widzenia to powód, żeby jeszcze tego samego dnia jechać na ostry dyżur okulistyczny. Przedarcie można zaspawać laserem, a odwarstwienie trzeba operować. Im szybciej, tym większa szansa na zachowanie wzroku.',
      fact: 'Po operacji z wypełnieniem oka gazem trzeba czasem przez kilka dni leżeć w określonej pozycji, np. twarzą w dół. Pęcherzyk gazu dociska wtedy siatkówkę jak przycisk do papieru.',
      sim: 'Pokazuję błyski (fotopsje), deszcz mętów, ciemną zasłonę od dołu z falującym brzegiem i zniekształcenia przy jej krawędzi. Wszystko jest przyklejone do siatkówki.',
      tryIt: ['Zwiększaj postęp i obserwuj zasłonę.', 'Włącz operację.'],
      warn: 'Nagłe błyski, „deszcz” mętów lub cień w polu widzenia = pilnie do okulisty, tego samego dnia.'
    }
  });

  C.push({
    id: 'keratoconus', cat: 'disease', name: 'Stożek rogówki', alt: 'keratokonus', icon: '🔺',
    tagline: 'Wielokrotne, rozjechane obrazy i komety ciągnące się za światłami.',
    params: [{ k: 's', label: 'Zaawansowanie', type: 'range', min: 0.1, max: 1, step: 0.05, def: 0.6, fmt: fmtPct }],
    correction: { label: 'Twarde soczewki', on: 'Twarde soczewki kontaktowe' },
    scenes: ['ulica-noc', 'gabinet'],
    apply(V, p, corr) {
      const s = corr ? 0.06 : p.s;
      V.cyl = Math.max(V.cyl, 0.3 + 1.2 * s); V.axisDeg = 62;
      V.comaD = 1.6 * s; V.comaAng = -80;
      V.ghostD = 2.3 * s; V.ghostAng = -115; V.ghostW = 0.7;
      if (!corr) { V.error += 0.8 * s; V.scatter += 0.05 * s; }
    },
    diagram: (p, corr) => ({ type: 'anatomy', p: { part: 'cornea', severity: corr ? 0.1 : p.s } }),
    info: {
      sees: 'Zamiast jednego obrazu oko widzi kilka nałożonych na siebie, rozjechanych kopii. Dotyczy to też jednego oka, więc to nie jest „zwykłe” podwójne widzenie. Litery mają cienie i ogony, a światła w nocy zamieniają się w komety i rozbryzgi. Okulary pomagają coraz mniej, a wada szybko się zmienia.',
      why: 'Rogówka cienieje i wybrzusza się w kształt stożka. Jej powierzchnia staje się nieregularna, więc łamie światło w wielu kierunkach naraz. Sprzyjają temu geny, alergie i pocieranie oczu.',
      who: 'Nowsze badania mówią nawet o 1 na 400–2000 osób. Choroba zaczyna się zwykle u nastolatków i młodych dorosłych.',
      help: 'Cross-linking: krople z ryboflawiną naświetlane UV „usztywniają” rogówkę i zatrzymują postęp. Twarde i twardówkowe soczewki kontaktowe wygładzają optycznie powierzchnię oka. W zaawansowanych przypadkach robi się przeszczep rogówki.',
      fact: 'Twarda soczewka kontaktowa koryguje stożek dlatego, że łzy wypełniają przestrzeń między nią a nierówną rogówką. Oko „patrzy” wtedy przez gładką powierzchnię soczewki zamiast przez nierówną rogówkę.',
      sim: 'Łączę nieregularny astygmatyzm, komę (komety skierowane w dół, typowe dla stożka w dolnej części rogówki) i obrazy-duchy. Najlepiej widać to na światłach w nocy.',
      tryIt: ['„Ulica nocą”: zobacz latarnie i światła aut.', 'W gabinecie spróbuj czytać tablicę.', 'Załóż twarde soczewki.']
    }
  });

  C.push({
    id: 'dryeye', cat: 'disease', name: 'Zespół suchego oka', alt: 'DED', icon: '💧',
    tagline: 'Rozmazuje się, a mrugnięcie na chwilę pomaga.',
    params: [
      { k: 's', label: 'Nasilenie', type: 'range', min: 0.1, max: 1, step: 0.05, def: 0.7, fmt: fmtPct },
      { k: 'auto', label: 'Mruganie', type: 'select', def: 'manual', options: [{ v: 'manual', label: 'sam mrugam (spacja)' }, { v: 'auto', label: 'automatyczne co kilka sekund' }] }
    ],
    correction: { label: 'Sztuczne łzy', on: 'Krople nawilżające' },
    scenes: ['gabinet', 'ulica-dzien'],
    apply(V, p, corr, ctx) {
      const s = p.s * (corr ? 0.3 : 1);
      const dry = Math.min(1, Math.max(0, (ctx.blinkAge - 0.8) / 7));
      V.dryEye = s; V.autoBlink = p.auto === 'auto';
      V.baseD += s * dry * 1.8; V.warp = Math.max(V.warp, s * dry * 0.5);
      V.ghostD = Math.max(V.ghostD, s * dry * 0.6); V.ghostAng = -60; V.ghostW = Math.max(V.ghostW, s * dry * 0.4);
      V.scatter += 0.06 * s * dry;
    },
    diagram: p => ({ type: 'anatomy', p: { part: 'tearFilm', severity: p.s } }),
    info: {
      sees: 'Zaraz po mrugnięciu obraz jest ostry, ale po kilku sekundach zaczyna się rozmywać i falować, jakby przez zabrudzoną szybę. Oczy pieką, kłują i są „piaszczyste”. Paradoksalnie mogą też łzawić. Najgorzej jest przy komputerze, w klimatyzacji i wieczorem.',
      why: 'Film łzowy, cienka warstwa, która wygładza powierzchnię rogówki, jest niestabilny albo jest go za mało. Rozrywa się szybko po mrugnięciu i rogówka przestaje być optycznie gładka. Przyczyny to m.in. niedrożność gruczołów Meiboma, praca przy ekranach, wiek, hormony, soczewki kontaktowe i niektóre leki.',
      who: 'Bardzo częsty, dotyka od kilku do kilkudziesięciu procent dorosłych, zależnie od kryteriów. Częściej kobiety i osoby starsze.',
      help: 'Sztuczne łzy, ciepłe okłady i masaż powiek, przerwy w pracy przy ekranie (zasada 20-20-20: co 20 minut przez 20 sekund patrz na coś 20 stóp, czyli ok. 6 m, dalej), nawilżanie powietrza, a w cięższych przypadkach leki na receptę.',
      fact: 'Przy ekranie mrugamy nawet 3 razy rzadziej niż zwykle: zamiast ok. 15–20 razy na minutę tylko 5–7. Do tego wiele mrugnięć jest niepełnych.',
      sim: 'Od ostatniego mrugnięcia rośnie rozmycie, falowanie i „duchy”. Mrugnij spacją albo przyciskiem „Mrugnij”, a obraz wróci do ostrości.',
      tryIt: ['Nie mrugaj przez 10 s i obserwuj obraz.', 'Naciśnij spację.', 'Włącz krople nawilżające.']
    }
  });

  /* ======================= MÓZG I INNE ======================= */
  C.push({
    id: 'floaters', cat: 'other', name: 'Męty ciała szklistego', alt: 'muszki przed oczami', icon: '🦠',
    tagline: 'Przezroczyste nitki i kropki, które płyną za wzrokiem.',
    params: [{ k: 's', label: 'Ilość', type: 'range', min: 0.1, max: 1, step: 0.05, def: 0.8, fmt: fmtPct }],
    scenes: ['ulica-dzien', 'targ'],
    apply(V, p) { V.floaters = Math.max(V.floaters, p.s); },
    diagram: p => ({ type: 'anatomy', p: { part: 'vitreous', severity: p.s } }),
    info: {
      sees: 'Półprzezroczyste nitki, kłaczki, kółka i kropki dryfują w polu widzenia. Gdy próbujesz na nie spojrzeć, uciekają. Gdy zatrzymasz wzrok, płyną jeszcze chwilę siłą rozpędu i powoli opadają. Najlepiej je widać na tle jasnego nieba, białej ściany albo ekranu.',
      why: 'Ciało szkliste, czyli galaretka wypełniająca oko, z wiekiem się upłynnia, a jego włókna kolagenowe zlepiają się w grudki. Te grudki rzucają cień na siatkówkę. Częściej występują przy krótkowzroczności i po 50. roku życia.',
      who: 'Mniej lub bardziej widoczne męty ma prawie każdy dorosły.',
      help: 'Zwykle nie wymagają leczenia, a mózg z czasem uczy się je ignorować. Nagły wysyp mętów, zwłaszcza z błyskami, to sygnał alarmowy: może oznaczać przedarcie siatkówki.',
      fact: 'Łacińska nazwa to „muscae volitantes”, czyli latające muszki. Męty, które widzisz, to cienie grudek pływających kilka milimetrów przed siatkówką.',
      sim: 'Męty są przyklejone do oka: idą za kursorem z bezwładnością. Rusz szybko myszą i zatrzymaj się, a zobaczysz, jak dryfują dalej.',
      tryIt: ['Patrz na niebo.', 'Szybko przesuń kursor i zatrzymaj się.']
    }
  });

  C.push({
    id: 'migraine', cat: 'other', name: 'Aura migrenowa', alt: 'mroczek migocący', icon: '🌈',
    tagline: 'Migoczący zygzak, który rozszerza się i zostawia za sobą dziurę w obrazie.',
    params: [{ k: 'speed', label: 'Tempo (przyspieszone)', type: 'range', min: 0.5, max: 2, step: 0.1, def: 1, fmt: v => '×' + v.toFixed(1).replace('.', ',') }],
    scenes: ['ulica-dzien', 'gabinet'],
    apply(V, p) { V.aura = 1; V.auraSpeed = p.speed; },
    diagram: () => ({ type: 'anatomy', p: { part: 'pathway', lesion: 'aura', severity: 0.6 } }),
    info: {
      sees: 'Zaczyna się od małej, migoczącej plamki blisko środka pola widzenia. Rozszerza się w łuk w kształcie litery C, z jasnym, drgającym zygzakiem na brzegu, w którym czasem widać kolory. W środku łuku obraz znika albo jest rozmyty. Po 20–30 minutach łuk wychodzi poza pole widzenia i często zaczyna się ból głowy.',
      why: 'Przez korę wzrokową w tyle głowy przechodzi powolna fala pobudzenia, a za nią fala wyciszenia neuronów (tzw. korowa depresja szerząca się). Fala posuwa się po korze z prędkością ok. 3 mm na minutę, co dokładnie odpowiada tempu, w jakim rośnie zygzak.',
      who: 'Migrenę ma ok. 12–15% ludzi, z czego mniej więcej co trzecia osoba ma aurę. Aura może też pojawić się bez bólu głowy.',
      help: 'Leki przeciwbólowe i przeciwmigrenowe (np. tryptany, przeciwciała anty-CGRP), unikanie czynników wyzwalających. Pierwsza w życiu aura, zwłaszcza u osoby starszej, wymaga konsultacji lekarskiej, żeby wykluczyć udar.',
      fact: 'Zygzaki nazywa się „spektrum fortyfikacyjnym”, bo przypominają mury twierdzy widziane z góry. Aura nie znika po zamknięciu jednego oka, bo nie powstaje w oku, tylko w mózgu.',
      sim: 'Cały przebieg, który w rzeczywistości trwa ok. 20–30 minut, pokazuję w przyspieszeniu w ok. 25 sekund. Zygzak gęstnieje przy środku i rzednie na obrzeżach, bo centrum widzenia zajmuje więcej kory.',
      tryIt: ['Poczekaj na cały cykl.', 'Spróbuj czytać, gdy łuk przechodzi przez tekst.']
    }
  });

  C.push({
    id: 'snow', cat: 'other', name: 'Śnieg optyczny', alt: 'visual snow', icon: '📺',
    tagline: 'Całe pole widzenia pokrywa migoczący szum, jak w starym telewizorze.',
    params: [{ k: 's', label: 'Natężenie', type: 'range', min: 0.1, max: 1, step: 0.05, def: 0.6, fmt: fmtPct }],
    scenes: ['ulica-noc', 'ulica-dzien'],
    apply(V, p) { V.snow = p.s; V.scatter += 0.04 * p.s; V.floaters = Math.max(V.floaters, 0.35 * p.s); },
    diagram: () => ({ type: 'anatomy', p: { part: 'pathway', lesion: 'snow', severity: 0.6 } }),
    info: {
      sees: 'Drobne, migoczące punkciki pokrywają całe pole widzenia przez cały czas, także przy zamkniętych oczach i w ciemności, gdzie są najbardziej widoczne. Często dochodzą powidoki (obraz zostaje chwilę po odwróceniu wzroku), smugi za ruchomymi przedmiotami, nadwrażliwość na światło i gorsze widzenie nocą.',
      why: 'Przyczyną nie jest oko, tylko nadmierna pobudliwość kory wzrokowej i zaburzone „filtrowanie” sygnałów w mózgu. Badania obrazowe pokazują zmiany w obszarach przetwarzających obraz.',
      who: 'Z badań ankietowych wynika, że może dotyczyć ok. 2–3% ludzi. Jako osobny zespół rozpoznawany jest dopiero od ok. 2014 roku, więc wiele osób latami słyszało, że „wszystko jest w porządku”.',
      help: 'Nie ma skutecznego leku. Pomagają m.in. filtry barwne w okularach, praca nad snem i stresem, czasem leki stosowane w migrenie i padaczce.',
      fact: 'Wiele osób ze śniegiem optycznym ma go „od zawsze” i dopiero jako dorośli dowiadują się, że inni ludzie nie widzą świata przez szum.',
      sim: 'Pokazuję dynamiczny szum nałożony na cały obraz, rozbłyskujące drobiny i wzmocnione zjawiska entoptyczne (męty). Najmocniej widać to w scenie nocnej.',
      tryIt: ['Przełącz na „Ulica nocą”.']
    }
  });

  C.push({
    id: 'hemianopia', cat: 'other', name: 'Niedowidzenie połowicze', alt: 'hemianopsja', icon: '◐',
    tagline: 'Po udarze znika połowa świata, ta sama w obu oczach.',
    params: [{ k: 'side', label: 'Brakująca strona', type: 'select', def: 'left', options: [{ v: 'left', label: 'lewa' }, { v: 'right', label: 'prawa' }] }],
    scenes: ['ulica-dzien', 'gabinet'],
    apply(V, p) { V.hemi = p.side === 'left' ? -1 : 1; V.hemiAmt = 0.97; V.fieldDim = 0.42; },
    diagram: p => ({ type: 'anatomy', p: { part: 'pathway', lesion: p.side === 'left' ? 'right' : 'left', severity: 1 } }),
    info: {
      sees: 'W obu oczach brakuje tej samej połowy pola widzenia, np. wszystkiego, co jest na lewo od punktu patrzenia. Chory nie widzi czerni, tylko po prostu „nic”, i często nie zdaje sobie sprawy z ubytku. Wpada na przedmioty z jednej strony, je tylko z połowy talerza, gubi linijki przy czytaniu, nie zauważa aut nadjeżdżających z boku.',
      why: 'Uszkodzenie drogi wzrokowej za skrzyżowaniem nerwów wzrokowych, najczęściej w korze wzrokowej po przeciwnej stronie mózgu: po udarze, urazie lub przez guz. Uszkodzenie prawej półkuli zabiera lewą połowę świata.',
      who: 'Dotyczy znacznej części osób po udarze mózgu, zwłaszcza w okolicy płata potylicznego.',
      help: 'Część ubytków cofa się samoistnie w pierwszych miesiącach. Rehabilitacja uczy szybkiego „skanowania” wzrokiem w stronę ubytku, a specjalne pryzmaty w okularach przenoszą obraz z brakującej strony.',
      fact: 'Niektórzy pacjenci z uszkodzoną korą wzrokową potrafią „na ślepo” wskazać przedmiot w niewidzącym polu, choć twierdzą, że nic nie widzą. To zjawisko nazywa się ślepowidzeniem (blindsight).',
      sim: 'Ubytek idzie za wzrokiem i zostawia wąski pas widzenia przy samym środku (oszczędzenie plamki). Zwróć uwagę, jak łatwo przeoczyć rzeczy po jednej stronie.',
      tryIt: ['Spróbuj przeczytać rozkład jazdy od lewej.', 'Zmień stronę.']
    }
  });

  C.push({
    id: 'photophobia', cat: 'other', name: 'Światłowstręt', alt: 'fotofobia', icon: '☀️',
    tagline: 'Zwykłe światło dnia oślepia i boli.',
    params: [{ k: 's', label: 'Nasilenie', type: 'range', min: 0.1, max: 1, step: 0.05, def: 0.7, fmt: fmtPct }],
    correction: { label: 'Okulary przeciwsłoneczne', on: 'Ciemne okulary' },
    scenes: ['ulica-dzien', 'targ', 'ulica-noc'],
    apply(V, p, corr) {
      const s = p.s * (corr ? 0.25 : 1);
      V.exposure *= (1 + 1.0 * s) * (corr ? 0.65 : 1); V.scatter += 0.16 * s; V.veil += 0.12 * s; V.squint = Math.max(V.squint, 0.5 * s);
    },
    diagram: () => ({ type: 'anatomy', p: { part: 'photoreceptors', variant: 'glare', severity: 0.7 } }),
    info: {
      sees: 'Światło, które innym nie przeszkadza, jest nieprzyjemnie jasne, oślepiające, a nawet bolesne. Oczy same się mrużą i łzawią. Wszystko jest prześwietlone, jasne powierzchnie „świecą”, a kontrast słabnie.',
      why: 'To objaw, a nie choroba. Wywołują go m.in. migrena, zapalenia oka (np. zapalenie błony naczyniowej), zespół suchego oka, wstrząśnienie mózgu, albinizm i achromatopsja, a także krople rozszerzające źrenice u okulisty.',
      who: 'Częsty: towarzyszy większości napadów migreny i wielu chorobom oczu.',
      help: 'Leczenie przyczyny, okulary przeciwsłoneczne i filtry (np. odcinające światło niebieskie), czapka z daszkiem. Długie przebywanie w ciemności może paradoksalnie nasilać nadwrażliwość.',
      fact: 'Nagły silny światłowstręt z bólem oka i zaczerwienieniem może oznaczać ostry stan zapalny albo atak jaskry. Wtedy trzeba od razu jechać do okulisty.',
      sim: 'Zwiększam ekspozycję, rozpraszanie światła i poświaty oraz przymykam powieki, bo przy światłowstręcie odruchowo się mruży oczy.',
      tryIt: ['Porównaj dzień i noc.', 'Załóż ciemne okulary.']
    }
  });

  C.push({
    id: 'nightblind', cat: 'other', name: 'Ślepota zmierzchowa', alt: 'kurza ślepota, nyktalopia', icon: '🌙',
    tagline: 'W dzień dobrze, ale o zmierzchu wszystko, co nie świeci, znika.',
    params: [{ k: 's', label: 'Nasilenie', type: 'range', min: 0.1, max: 1, step: 0.05, def: 0.85, fmt: fmtPct }],
    correction: { label: 'Uzupełnij witaminę A', on: 'Po leczeniu niedoboru' },
    scenes: ['ulica-noc'],
    apply(V, p, corr) { if (!corr) V.nightBlind = Math.max(V.nightBlind, p.s); },
    diagram: () => ({ type: 'anatomy', p: { part: 'photoreceptors', variant: 'noRods', severity: 0.8 } }),
    info: {
      sees: 'W pełnym świetle wszystko wygląda normalnie. Po zmroku widać tylko latarnie, okna i reflektory, a ludzie, krawężniki, schody i zaparkowane auta toną w czerni. Wejście do ciemnego kina albo pokoju oznacza długie minuty „ślepoty”.',
      why: 'Nie działają pręciki, czyli fotoreceptory do widzenia w słabym świetle. Najczęstsze przyczyny to niedobór witaminy A (pręciki potrzebują jej do wytwarzania rodopsyny), barwnikowe zwyrodnienie siatkówki, zaawansowana zaćma i niektóre leki.',
      who: 'Niedobór witaminy A to wciąż poważny problem w krajach o niedożywieniu i wiodąca przyczyna ślepoty u dzieci, której można zapobiec. W Polsce ślepota zmierzchowa wynika najczęściej z chorób siatkówki.',
      help: 'Przy niedoborze uzupełnienie witaminy A działa szybko. Przy chorobach genetycznych pomagają dobre oświetlenie i latarki, a w badaniach jest terapia genowa.',
      fact: 'Mit o tym, że marchewka poprawia widzenie w nocy, rozpowszechnili Brytyjczycy w czasie II wojny światowej. W ten sposób tłumaczyli skuteczność swoich nocnych myśliwców i ukrywali przed Niemcami istnienie radaru.',
      sim: 'Najlepiej działa w scenie „Ulica nocą”. W dzień nic się nie zmienia, bo w dzień i tak widzimy czopkami.',
      tryIt: ['Przełącz na „Ulica nocą”.', 'Porównaj ze zdrowym okiem (Porównaj).']
    }
  });

  window.CATEGORIES = CATEGORIES;
  window.CONDITIONS = C;
})();
