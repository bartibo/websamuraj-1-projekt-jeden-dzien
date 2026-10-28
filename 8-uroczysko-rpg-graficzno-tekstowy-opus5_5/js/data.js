'use strict';
/* =====================================================================
   Gdzie mgła ma zęby – dane świata: postacie, miejsca, przedmioty,
   przeciwnicy, wiedza, zakończenia, szepty
   ===================================================================== */

const BACKGROUNDS = {
  wareg: {
    n: 'Wareg', full: 'Wareg z Północy', name: 'Ulf',
    d: 'Najemnik ze szlaku od Ładogi po Kijów. Silny i nieufny, zna runy i mowę Północy.',
    st: { sil: 4, zre: 2, czu: 2, wol: 2 }, hp: 24,
    weapon: { n: 'Miecz', dmg: 6, st: 'sil' },
    inv: { pochodnia: 2, chleb: 1, krzesiwo: 1, mlotek: 1 }, silver: 12,
    perk: 'Czyta runy. Może przemówić do Hrodgara w jego mowie.',
  },
  moraw: {
    n: 'Morawianin', full: 'Ochrzczony wojownik z Moraw', name: 'Gorazd',
    d: 'Służył księciu, który przyjął chrzest. Twarda wola, drewniany krzyżyk na szyi i starzy bogowie w pamięci.',
    st: { sil: 3, zre: 2, czu: 2, wol: 4 }, hp: 20,
    weapon: { n: 'Topór', dmg: 5, st: 'sil' },
    inv: { pochodnia: 2, chleb: 2, miod: 1, krzesiwo: 1, krzyzyk: 1 }, silver: 6,
    perk: 'Silna wola. Krzyżyk osłabia szepty.',
  },
  lowca: {
    n: 'Łowca', full: 'Tropiciel z puszczy', name: 'Stojmir',
    d: 'Puszcza jest jego domem od dziecka. Bystre oczy, pewna ręka, łuk i nóż. Ale tej części lasu nie zna nikt.',
    st: { sil: 2, zre: 4, czu: 4, wol: 1 }, hp: 18,
    weapon: { n: 'Łuk i nóż', dmg: 5, st: 'zre' },
    inv: { pochodnia: 2, mieso: 2, bylica: 1, krzesiwo: 1 }, silver: 4,
    perk: 'Tropi i widzi więcej. Rzadziej trafia w drodze na złe spotkania.',
  },
};

const STATS = { sil: 'Siła', zre: 'Zręczność', czu: 'Czujność', wol: 'Wola' };

/* Mapa: współrzędne w układzie 600×460 (kora brzozy) */
const LOCS = {
  mszaniec: { n: 'Mszaniec', d: 'osada na skraju puszczy', sc: 'osada', x: 92, y: 400, adj: ['skraj'], danger: 0 },
  skraj:    { n: 'Płot z czaszek', d: 'skraj uroczyska', sc: 'skraj', x: 210, y: 330, adj: ['mszaniec', 'gaj', 'bagno', 'jar'], danger: 1 },
  jar:      { n: 'Wilczy Jar', d: 'na zachód, w rozpadlinie', sc: 'jar', x: 96, y: 214, adj: ['skraj', 'krag'], danger: 2 },
  gaj:      { n: 'Zbezczeszczony gaj', d: 'na północ, tam stał bóg', sc: 'gaj', x: 286, y: 226, adj: ['skraj', 'krag', 'oboz'], danger: 1 },
  bagno:    { n: 'Topielisko', d: 'na wschód, przez bagno', sc: 'bagno', x: 380, y: 372, adj: ['skraj', 'oboz'], danger: 2 },
  krag:     { n: 'Kamienny Krąg', d: 'na wzgórzu, wśród dziewięciu kamieni', sc: 'krag', x: 196, y: 98, adj: ['jar', 'gaj', 'kurhany'], danger: 2 },
  oboz:     { n: 'Obóz kopaczy', d: 'pod starym dębem', sc: 'oboz', x: 470, y: 250, adj: ['gaj', 'bagno', 'kurhany'], danger: 2 },
  kurhany:  { n: 'Pole Kurhanów', d: 'na północy, gdzie mgła najgęstsza', sc: 'kurhany', x: 418, y: 92, adj: ['krag', 'oboz'], danger: 3 },
};

const ICONS = {
  pochodnia: 'M11 22l1-11M9 11h6M12 3c2 2 3 3.5 2.5 5.5-.5 1.5-1.5 2.5-2.5 2.5s-2.5-1-2.5-3c0-1.5 1-2.5 2.5-5z',
  krzesiwo: 'M4 16c0-3 3-5 8-5s8 2 8 5zM8 11V9h8v2M12 3v3M8 4l1.5 2.5M16 4l-1.5 2.5',
  chleb: 'M3 15c0-4 4-7 9-7s9 3 9 7v3H3zM8 10l-1 3M12 9v3M16 10l1 3',
  mieso: 'M6 18c-2-2-2-6 1-9s7-4 9-2 1 6-2 9-6 4-8 2zM14 7l4-4M17 2l3 3M9 13c1-1 2-1 3 0',
  miod: 'M8 5h8M9 5v3c-3 1-4 4-4 7 0 3 2 5 7 5s7-2 7-5c0-3-1-6-4-7V5M18 10c2 0 3 1 3 3s-1 3-3 3M8 13h8',
  bylica: 'M12 22V6M12 10L8 7M12 13l4-3M12 16l-5-2M12 19l5-2M12 6l-2-3M12 6l2-3',
  sol: 'M7 9h10l2 10c0 1-1 2-2 2H7c-1 0-2-1-2-2zM9 9c0-3 1-5 3-5s3 2 3 5M9 9h6M10 14v.01M13 16v.01M11 18v.01M14 13v.01',
  lulek: 'M9 2h6v3H9zM8 5h8l1 3c2 2 2 9-1 12H8c-3-3-3-10-1-12zM9 13c2 1 4 1 6 0',
  lina: 'M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M19 13l3 6',
  kij: 'M5 21L19 3M8 15l2.5 1.5M10 12l3 .5M12 9.5l1 2.5M14 7l2 1',
  wstazka: 'M6 4c4 2 8 2 12 0-2 5-2 7 0 10-4 2-8 2-12 0 2-3 2-5 0-10zM10 15l-2 7 3-2 1 3 1-8',
  kiel: 'M9 3h6c0 6-1 12-3 18-2-6-3-12-3-18zM10 6h4M12 3V1',
  rog: 'M3 8c6 0 12 2 16 8l2-1-1 4-4-1 1-1c-3-5-8-7-14-7zM7 9l1 2M11 10l1 2',
  zelazo: 'M12 2l2 3v11h-4V5zM7 16h10M12 16v4M10 21h4',
  nic: 'M8 4h8M8 20h8M9 4v16M15 4v16M9 8l6 2M9 12l6 2M9 16l6 2M15 18c3 0 5 1 6 3',
  grzechotka: 'M5 13c0-4 3-6 7-6 3 0 5 2 7 1-1 2-2 3-2 5 0 4-3 6-7 6s-5-2-5-6zM9 11v.01M12 19v3M10 14l1 1M13 13l1 1',
  krzyzyk: 'M12 3v18M7 8h10M10 3h4',
  kaptorga: 'M8 4h8l-1 5 1 10-4 3-4-3 1-10zM12 2v2M10 10h4M10 14h4',
  mlotek: 'M6 5h12v5c-2 0-3 1-3 3H9c0-2-1-3-3-3zM12 13v8M10 21h4M12 2v3',
  topor: 'M6 21L16 6M13 3c4 0 7 3 7 7-3 0-5-1-7-3',
};

/* Przedmioty. bonus = premia do cechy, dopóki nosisz przedmiot. */
const ITEMS = {
  pochodnia: { n: 'Pochodnia', d: 'Smolne łuczywo owinięte natłuszczoną szmatą. Starcza na sześć kroków w ciemności.', use: 'light' },
  krzesiwo: { n: 'Krzesiwo', d: 'Stal, krzemień i hubka. Bez niego pochodnia jest tylko kijem.' },
  chleb: { n: 'Chleb', d: 'Twardy, razowy, z kminem. Przywraca 6 zdrowia.', use: 'eat', heal: 6 },
  mieso: { n: 'Suszone mięso', d: 'Paski suszonej dziczyzny. Przywracają 3 zdrowia. Wilki też je lubią.', use: 'eat', heal: 3 },
  miod: { n: 'Miód pitny', d: 'Gliniana flaszka mocnego miodu. Rozgrzewa i uspokaja: +10 rozumu.', use: 'drink' },
  bylica: { n: 'Bylica', d: 'Wiązka bylicy, zioła na złe duchy. Żujesz ją: +15 rozumu, a przez kilka kroków szepty bolą mniej.', use: 'chew' },
  sol: { n: 'Sól', d: 'Woreczek soli. Umarli jej nie znoszą. W walce rani upiory i duchy.' },
  lulek: { n: 'Wywar z lulka', d: 'Od Dobrawy. Goi rany i zabija gorączkę, ale otwiera oczy na to, czego nie powinieneś widzieć.', use: 'lulek' },
  lina: { n: 'Lina', d: 'Konopna lina kopaczy, mocna, długa na dwadzieścia łokci.' },
  kij: { n: 'Kij runiczny', d: 'Leszczynowy kij pokryty runami Północy. Hrodgar ryje wiadomość dla tego, kto przyjdzie.' },
  wstazka: { n: 'Czerwona wstążka', d: 'Wełniana wstążka Wiszki, zdjęta z gałęzi w gaju. Pachnie domowym dymem.' },
  kiel: { n: 'Kieł Wilczej Matki', d: 'Długi, żółty, z dziurką na rzemień. Wilki uznają cię za swego. +1 do Czujności.', bonus: { czu: 1 } },
  rog: { n: 'Róg pasterski', d: 'Róg pastucha Dziwisza. W walce płoszy zwierzęta i ogłusza duchy.' },
  zelazo: { n: 'Żelazo Wojownika', d: 'Pierwsze pęto. Czarny miecz, którego nie tknęła rdza, cięższy, niż powinien.', peto: true },
  nic: { n: 'Nić Matki', d: 'Drugie pęto. Szara nić nawinięta na kość, ciepła i bardzo lekka.', peto: true },
  grzechotka: { n: 'Grzechotka Dziecka', d: 'Trzecie pęto. Gliniany ptaszek z kamyczkami w środku. Czasem grzechocze sam.', peto: true },
  krzyzyk: { n: 'Drewniany krzyżyk', d: 'Od księcia, z chrztu. Nie wiesz, czy w niego wierzysz, ale szepty milkną przy nim szybciej. +1 do Woli.', bonus: { wol: 1 } },
  kaptorga: { n: 'Kaptorga', d: 'Srebrna puszeczka na ziele, dar od Miry. Noszona na piersi. +1 do Woli.', bonus: { wol: 1 } },
  mlotek: { n: 'Młot Thora', d: 'Srebrny młoteczek na rzemieniu, z domu. Trzyma przy zdrowych zmysłach. +1 do Woli.', bonus: { wol: 1 } },
};

const WEAPONS = {
  topor_hrodgara: { n: 'Topór Hrodgara', dmg: 7, st: 'sil' },
};

/* Przeciwnicy. beast – zwierzę (ogień i róg), spirit – upiór (sól), illusion – może być złudzeniem */
const ENEMIES = {
  wilk: {
    n: 'Wilk', hp: 8, def: 8, atk: 2, dmg: [2, 4], beast: true, fig: 'wilk',
    intro: 'Szary wilk, chudy, z wyszczerzonymi zębami. Oczy ma za jasne.',
    hit: ['Kły zaciskają się na twoim udzie.', 'Wilk skacze i rozdziera ci rękaw razem ze skórą.', 'Czujesz zęby na łydce.'],
    miss: ['Kłapnięcie tuż przy twarzy.', 'Wilk krąży, szuka luki.', 'Odskakujesz przed kłami.'],
  },
  wilczyca: {
    n: 'Wilcza Matka', hp: 14, def: 9, atk: 4, dmg: [2, 5], beast: true, fig: 'wilczyca',
    intro: 'Wielka, siwa, z bielmem na lewym oku. To ona cię ugryzła trzy noce temu.',
    hit: ['Wilczyca uderza całym ciężarem i powala cię na kolano.', 'Kły tną ci bark.', 'Pazury orzą ci pierś.'],
    miss: ['Wilczyca patrzy na ciebie zdrowym okiem i czeka.', 'Unika twojego ciosu i zachodzi cię z boku.', 'Jej kły zamykają się na pustym powietrzu.'],
  },
  topielec: {
    n: 'Topielec', hp: 12, def: 8, atk: 3, dmg: [2, 5], spirit: true, rz: 2, fig: 'topielec',
    intro: 'Napuchnięty trup kopacza, z białymi jak u ryby oczami i uśmiechem od ucha do ucha.',
    hit: ['Zimne palce zaciskają się na twojej kostce i ciągną pod wodę.', 'Topielec bije cię w pierś pięścią ciężką jak kamień.', 'Woda wlewa ci się do ust.'],
    miss: ['Topielec chwyta za płaszcz, ale tkanina się wyrywa.', 'Bulgocze coś, co może być śmiechem.', 'Ślizga się na kładce.'],
  },
  upior: {
    n: 'Upiór wojownika', hp: 16, def: 10, atk: 4, dmg: [2, 6], spirit: true, rz: 3, fig: 'wojownik',
    intro: 'Kości w resztkach kolczugi, a w oczodołach zimny błękit. Wojownik wstał, bo ktoś dotknął jego żelaza.',
    hit: ['Kościste palce zaciskają się na twoim gardle, zimne jak lód.', 'Upiór uderza cię płazem starego miecza.', 'Czujesz w piersi zimno, jakby ktoś włożył ci tam garść śniegu.'],
    miss: ['Upiór się zatacza, stawy mu trzeszczą.', 'Zimne ostrze świszcze nad twoją głową.', 'Upiór wpatruje się w ciebie pustymi oczodołami.'],
  },
  nici: {
    n: 'Nici Matki', hp: 12, def: 7, atk: 3, dmg: [1, 4], fireWeak: true, fig: 'nici',
    intro: 'Tysiące szarych nici napinają się z brzękiem i suną ku tobie jak węże.',
    hit: ['Nić tnie ci policzek jak cięciwa.', 'Nici oplatają ci szyję i zaciskają się.', 'Coś przecina ci dłoń do kości.'],
    miss: ['Nici brzęczą tuż przy uchu.', 'Przecinasz kilka nici, ale na ich miejsce przychodzą następne.', 'Nici drżą i cofają się.'],
  },
  hrodgar: {
    n: 'Hrodgar', hp: 20, def: 9, atk: 4, dmg: [3, 6], spirit: true, rz: 2, fig: 'hrodgar',
    intro: 'Wódz kopaczy z toporem w dłoni. Połowę twarzy porasta kora i dziesiątki mrugających oczu.',
    hit: ['Topór Hrodgara spada na ciebie z dzikim, nieludzkim rykiem.', 'Hrodgar uderza cię głową, a oczy na jego twarzy mrugają z uciechy.', 'Ostrze tnie ci bok.'],
    miss: ['Topór wbija się w ziemię tuż obok twojej stopy.', 'Hrodgar zatrzymuje się w pół ruchu i coś mamrocze w mowie Północy.', 'Uchylasz się.'],
  },
  mgielnica: {
    n: 'Mgielnica', hp: 6, def: 6, atk: 0, dmg: [0, 1], illusion: true, rz: 0, fig: 'mgielnica', noFlee: false,
    intro: 'Coś małego, z długimi kończynami i gładką twarzą bez oczu. Skrzeczy wysoko, przenikliwie.',
    hit: ['Stworzenie drapie cię słabo, rozpaczliwie.'],
    miss: ['Stworzenie kuli się i skrzeczy. Brzmi to prawie jak płacz.', 'Zasłania gładką twarz długimi palcami.', 'Cofa się w głąb dziupli, dalej nie ma już dokąd.'],
  },
  zjawa: {
    n: 'Twój cień', hp: 10, def: 8, atk: 3, dmg: [0, 0], illusion: true, rz: 5, fig: 'zjawa',
    intro: 'Stoisz naprzeciw siebie. Ten drugi ty uśmiecha się szerzej, niż pozwalają usta.',
    hit: ['Twój cień dotyka twojego czoła i coś w tobie gaśnie.', 'Szepcze ci do ucha twoim głosem rzeczy, o których nikomu nie mówiłeś.'],
    miss: ['Cień przechyla głowę, dokładnie jak ty.', 'Cofa się, bezgłośnie.'],
  },
  dzik: {
    n: 'Odyniec', hp: 12, def: 8, atk: 3, dmg: [2, 5], beast: true, fig: 'dzik',
    intro: 'Ogromny odyniec z oczami jak węgle. Szczecina na grzbiecie mu się jeży, z pyska bucha para.',
    hit: ['Szabla rozpruwa ci udo.', 'Odyniec taranuje cię i przewraca w błoto.'],
    miss: ['Odyniec przebiega obok, zawraca i ryje ziemię.', 'Uskakujesz za pień w ostatniej chwili.'],
  },
  zyr: {
    n: 'Pasterz Mgły', hp: 40, def: 11, atk: 6, dmg: [4, 8], spirit: true, god: true, rz: 5, fig: 'pasterz',
    intro: 'Wysoki jak dąb, z mgły i głodu, z porożem pełnym oczu.',
    hit: ['Poroże przebija mgłę i ciebie razem z nią.', 'Setki oczu patrzą na ciebie naraz. Z nosa cieknie ci krew.', 'Pasterz dotyka cię i przez chwilę jesteś zwierzęciem w jego stadzie.'],
    miss: ['Mgła rozstępuje się tam, gdzie przed chwilą stałeś.', 'Pasterz śmieje się twoim głosem.', 'Oczy w porożu mrugają nierówno, jakby coś je bolało.'],
  },
};

const LORE = {
  rana: { t: 'Ugryzienie', x: 'Trzy noce przed przybyciem do Mszańca wilk z bielmem na lewym oku ugryzł cię w przedramię. Nie mocno, raczej jakby chciał cię zapamiętać. Rana nie krwawi i się nie goi. Dobrawa mówi, że to znamię Pasterza.' },
  uroczysko: { t: 'Uroczysko', x: 'Sześć nocy temu, w wigilię Dziadów, ktoś zwalił w świętym gaju Czworolicego, ściął święty dąb i rozkopał kurhany. Od tamtej pory mgła się nie podnosi i znikają ludzie: najpierw pastuch Dziwisz, potem mała Wiszka. Żerca Radogost poszedł „zawiązać, co rozwiązano” i nie wrócił.' },
  kopacze: { t: 'Kopacze Hrodgara', x: 'Pięciu Waregów z wodzem Hrodgarem przyszło po „srebro umarłych”. Drogę pokazał im Sulisław, syn starosty. Najpierw rozkopali kurhan wojownika, a gdy Bjorn wszedł do środka i nie wyszedł, Hrodgar kazał kopać wielki kurhan.' },
  pasterz: { t: 'Pasterz Mgły', x: 'Według Dobrawy uroczysko nie jest święte dlatego, że mieszkają tam bogowie. Jest święte, bo tam więzi się kogoś, kto był tu przed bogami. Starzy nazywali go Pasterzem Mgły: mgła jest jego stadem, a ludzie trawą. To głód, który nauczył się myśleć.' },
  peta: { t: 'Trzy pęta', x: 'Trzy małe kurhany to nie groby, tylko pęta. Dawno temu troje ludzi poszło pod ziemię z własnej woli, żeby trzymać Pasterza: Wojownik z żelazem (kurhan wschodni), Matka z nicią (zachodni) i Dziecko z zabawką (środkowy).' },
  rytual: { t: 'Jak zawiązać', x: 'Trzy pęta trzeba zanieść do serca wielkiego kurhanu, wypowiedzieć tam imię Pasterza i dać mu coś, czego się już nie odbierze. Na ostatnim kamieniu kręgu wyryto czwartego człowieka, który kładzie się obok tamtych trzech. Ktoś musi zostać na dole.' },
  imie: { t: 'Imię', x: 'Ż. Y. R. Żyr. Kto zna imię, może zawołać. I może zamknąć. Nie wymawiaj go na próżno.' },
  piesn1: { t: 'Piosenka o trzech (początek)', x: '<i>Śpi wojak z żelazem, śpi matka przy kądzieli,<br>śpi dzieciątko z grzechotką, by tamten nie wstał z pościeli…</i><br><br>Mira nie pamięta dalej. Wiszka zna całą.' },
  piesn2: { t: 'Piosenka o trzech', x: '<i>Śpi wojak z żelazem, śpi matka przy kądzieli,<br>śpi dzieciątko z grzechotką, by tamten nie wstał z pościeli.<br>Wojakowi się pokłoń, nie bierz mu miecza siłą,<br>matce odpowiedz mądrze, co było, co się śniło.<br>Dzieciątku daj coś w zamian, za darmo nic nie bierz,<br>a imię powiedz w sercu, gdzie ciemność jak zwierz.<br>A kto pęta zawiąże, ten zostanie przy kopcu –<br>lulaj, lulaj, dziecino, śpij spokojnie przy ojcu.</i>' },
  runy: { t: 'Runy Hrodgara', x: '„Hrodgar ryje dla tego, kto przyjdzie. Ziemia tu oddycha. Bjorn wszedł do kopca wojownika, nie wyszedł, wyszedł tylko jego śmiech. Dziewczynka ze wsi przyszła za nami i schowała się w dziupli, nie gońcie jej, tylko ona jest tu czysta. Chłopak ze wsi uciekł przez bagno. Ja schodzę do wielkiego. Srebro jest tam. Albo on. Jeśli nie wrócę, spalcie obóz.”' },
  lulek: { t: 'Wywar z lulka', x: 'Wywar Dobrawy goi rany i zbija gorączkę, ale otwiera oczy. „Jedni widzą prawdę, inni to, czego się boją. Nie wiem, którzy mają gorzej.” Może to, co widzisz w puszczy, to tylko lulek i gorączka?' },
  gdzie_imie: { t: 'Gdzie szukać imienia', x: 'Dobrawa nie wypowie imienia, bo „on usłyszy, że ktoś go woła”. Ale ostatni żerca przed Radogostem wydrapał je na ścianie w korytarzu z kości, w wielkim kurhanie. Trzeba światła. Dużo światła.' },
};

const ENDINGS = {
  zak_peta:        { t: 'Pęta', sub: 'Ktoś został na dole. Nie ty.', sc: 'kurhany', tone: 'dawn' },
  zak_czwarte:     { t: 'Czwarte pęto', sub: 'Zostałeś, żeby inni mogli odejść.', sc: 'serce', tone: 'dark' },
  zak_niedomkniete:{ t: 'Niedomknięte', sub: 'Nikt nie został. Pęta trzymają. Na razie.', sc: 'kurhany', tone: 'dawn' },
  zak_bogobojca:   { t: 'Bogobójca', sub: 'Zabiłeś głód. Głód potrzebował nowego domu.', sc: 'bagno', tone: 'red' },
  zak_pasterz:     { t: 'Nowy Pasterz', sub: 'Granica się zatarła. Po drugiej stronie było ciepło.', sc: 'serce', tone: 'red' },
  zak_goraczka:    { t: 'Gorączka', sub: 'Obudziłeś się. Chyba.', sc: 'chata', tone: 'warm' },
  zak_obled:       { t: 'Mgła w głowie', sub: 'Rozum pękł cicho, jak lód na kałuży.', sc: 'skraj', tone: 'mist' },
  zak_smierc:      { t: 'Pożarty', sub: 'Jeszcze jedno oko w porożu.', sc: 'mgla', tone: 'dark' },
  zak_wilk:        { t: 'Biały wilk', sub: 'Koło się zamyka. Ktoś musi ugryźć następnego.', sc: 'puszcza', tone: 'mist' },
  zak_mgla:        { t: 'Mgła w Mszańcu', sub: 'Zabrakło czasu. Pasterz się najadł.', sc: 'osada', tone: 'mist' },
  zak_droga:       { t: 'Droga na wschód', sub: 'Odszedłeś. Mgła nie.', sc: 'puszcza', tone: 'mist' },
};
const ENDING_ORDER = ['zak_peta', 'zak_czwarte', 'zak_niedomkniete', 'zak_bogobojca', 'zak_pasterz', 'zak_goraczka', 'zak_obled', 'zak_smierc', 'zak_wilk', 'zak_mgla', 'zak_droga'];

const WHISPERS = [
  'zejdź niżej', 'jesteś głodny', 'oni cię okłamują', 'pamiętasz ten smak?', 'wiedzieliśmy, że przyjdziesz',
  'nie odwracaj się', 'ta stara kłamie', 'jeszcze jeden krok', 'twoja rana tęskni', 'wszyscy kiedyś zejdą',
  'słyszysz, jak oddychamy?', 'nikt cię tu nie zna', 'to tylko gorączka', 'to nie jest gorączka', 'jesteś w stadzie',
];
const HUNGER_WHISPERS = [
  'pachną tak ciepło', 'tylko jeden kęs', 'stado jest blisko', 'oni śpią, a ty nie', 'czujesz ich serca?',
];
const GLITCH_WORDS = ['ŻER', 'GŁÓD', 'ZEJDŹ', 'MY', 'KREW', 'OCZY', 'STADO', 'ON'];
const FAKE_CHOICES = ['Nakarm go', 'Zejdź niżej', 'Nie odwracaj się', 'On czeka', 'Uklęknij', 'Otwórz usta'];

/* Wizje po lulku: prawda albo strach */
const VISIONS = {
  mszaniec: ['Widzisz Bogumiła, jak w nocy stoi przy bramie i patrzy w puszczę. Wargi mu się poruszają. Modli się o syna. Albo o to, żeby syn nie wrócił.', 'Wszyscy mieszkańcy Mszańca mają przez chwilę zamknięte oczy, choć idą, rozmawiają, pracują.'],
  skraj: ['Widzisz, jak ktoś wbija na pal małą czaszkę. Ma długie palce i poroże. Nuci.', 'Pale z czaszkami są przez chwilę żywymi ludźmi, stoją w rzędzie i trzymają się za ręce.'],
  gaj: ['Widzisz kopaczy rąbiących dąb. Rudy chłopak płacze przy każdym uderzeniu. Z pnia tryska krew, a drzewo krzyczy głosem starca.', 'Czworolicy ma przez chwilę wszystkie cztery twarze i wszystkie patrzą na ciebie.'],
  bagno: ['Pod wodą, pod kładką, leżą ludzie. Wielu ludzi, w strojach z dawnych czasów. Mają otwarte oczy i patrzą w górę, na ciebie.', 'Widzisz, jak na bagnie tonie żerca w białej szacie. To nie Radogost. To ktoś dawniejszy.'],
  jar: ['Wilki przez chwilę mają ludzkie twarze. Jedną z nich jest twarz pastucha Dziwisza.', 'Widzisz siebie, na czterech łapach, z bielmem na oku.'],
  krag: ['Widzisz człowieka, który dawno temu kładzie się na głazie pośrodku kręgu. Ma twoją twarz.', 'Kamienie pochylają się nad tobą i coś mówią. Nie rozumiesz słów, rozumiesz ton: litość.'],
  oboz: ['Widzisz dziewczynkę z rudymi włosami, wspinającą się do dziupli. Ogląda się za siebie, przerażona. Za nią stoi Hrodgar i płacze.', 'Srebro w skrzyni się porusza, jak robaki.'],
  kurhany: ['Kurhany oddychają. Wszystkie trzy, a z nimi czwarty, wielki, równym, spokojnym rytmem, jak śpiący pies.', 'Widzisz troje ludzi, wojownika, kobietę i dziecko, którzy idą trzymając się za ręce i wchodzą prosto w ziemię.'],
};
