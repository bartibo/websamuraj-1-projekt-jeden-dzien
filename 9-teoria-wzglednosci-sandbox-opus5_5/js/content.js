/* =====================================================================
   Gumowy czas – treści: gotowe ustawienia, zadania, ciekawostki,
   słowniczek i stałe objaśnienia „dlaczego”.
   ===================================================================== */
'use strict';
(function (R) {
  const P = R.phys;
  const C = P.C;
  const RE = 6.371e6;

  const SPEED_PRESETS = [
    { label: '🚗 Samochód', beta: 27.78 / C, title: '100 km/h' },
    { label: '✈️ Samolot', beta: 250 / C, title: '900 km/h' },
    { label: '🛰️ ISS', beta: 7660 / C, title: 'Międzynarodowa Stacja Kosmiczna: 7,66 km/s' },
    { label: '☀️ Sonda Parker', beta: 191700 / C, title: 'Najszybszy obiekt zbudowany przez ludzi: ok. 192 km/s' },
    { label: '½ c', beta: 0.5, title: 'Połowa prędkości światła' },
    { label: '87 % c', beta: 0.8660254, title: 'Tu czas płynie dokładnie 2 razy wolniej' },
    { label: '99 % c', beta: 0.99 },
    { label: '⚛️ Mion', beta: 0.998, title: 'Mion z promieniowania kosmicznego, lecący przez atmosferę' },
    { label: '99,99 % c', beta: 0.9999 },
    { label: '⚛️ Proton w LHC', omb: 1 / (2 * 7250 * 7250), title: 'Proton w Wielkim Zderzaczu Hadronów: 99,999999 % c' }
  ];
  const SPEED_SCALE = [
    { beta: 0, label: '0' },
    { beta: 7660 / C, label: 'ISS' },
    { beta: 0.1, label: '10 %' },
    { beta: 0.9, label: '90 %' },
    { beta: 0.9999, label: '99,99 %' },
    { omb: 1e-8, label: 'c' }
  ];

  const BODY_ICONS = { moon: '🌑', earth: '🌍', jupiter: '🪐', sun: '☀️', wd: '⚪', ns: '💫', bh: '⚫', smbh: '🕳️' };

  const HEIGHT_PRESETS = [
    { label: 'tuż przy', h: 1e-10 },
    { label: '0,01 R', h: 0.01, title: 'Jedna setna promienia' },
    { label: '0,1 R', h: 0.1, title: 'Jedna dziesiąta promienia' },
    { label: '1 R', h: 1, title: 'Wysokość równa promieniowi ciała' },
    { label: '10 R', h: 10 },
    { label: '100 R', h: 100 }
  ];

  const SCENARIOS = [
    { id: 'gps', label: '🛰️ Satelita GPS', body: 'earth', h: 20200e3 / RE, orbit: true, title: 'Orbita 20 200 km nad Ziemią' },
    { id: 'iss', label: '🧑‍🚀 ISS', body: 'earth', h: 420e3 / RE, orbit: true, title: 'Stacja kosmiczna 420 km nad Ziemią' },
    { id: 'ns', label: '💫 Wokół gwiazdy neutronowej', body: 'ns', h: 1, orbit: true },
    { id: 'isco', label: '⚫ Najniższa stabilna orbita', body: 'bh', h: 2, orbit: true, title: 'Ostatnia stabilna orbita wokół czarnej dziury: 3 promienie horyzontu od środka' },
    { id: 'miller', label: '🎬 Jak w „Interstellar”', body: 'smbh', h: 2.66e-10, orbit: false, beta: 0, title: '1 godzina = 7 lat' }
  ];

  /* ----------------------------- zadania ----------------------------- */
  const TASKS = [
    { id: 'half', mode: 'speed', text: 'Skróć statek o połowę: niech dla ciebie ma tylko 50 m.',
      hint: 'Potrzeba ok. 87 % prędkości światła.', check: d => d.sp.gamma >= 2 },
    { id: 'ten', mode: 'speed', text: 'Spraw, by zegar na statku szedł 10 razy wolniej niż twój.',
      hint: 'To okolice 99,5 % prędkości światła.', check: d => d.sp.gamma >= 10 },
    { id: 'proxima', mode: 'speed', text: 'Dolećcie do Proximy Centauri tak, by załoga postarzała się o mniej niż rok.',
      hint: 'Patrz na zdanie z rakietą w panelu „Co tu się dzieje?”.', check: d => d.sp.beta * d.sp.gamma >= P.PROXIMA_LY },
    { id: 'iss', mode: 'speed', text: 'Ustaw prędkość stacji ISS i sprawdź, o ile spóźnia się zegar przez dobę.',
      hint: 'Jest na to przycisk pod suwakiem.', check: d => d.sp.beta > 2.4e-5 && d.sp.beta < 2.7e-5 },
    { id: 'half-g', mode: 'gravity', text: 'Znajdź miejsce, w którym czas płynie 2 razy wolniej niż daleko od źródła.',
      hint: 'Gwiazda neutronowa nie wystarczy. Spróbuj czarnej dziury.', check: d => d.gB.rate <= 0.5 },
    { id: 'freeze', mode: 'gravity', text: 'Prawie zatrzymaj czas: niech zegar B idzie 1000 razy wolniej.',
      hint: 'Czarna dziura i zegar „tuż przy” horyzoncie.', check: d => d.gB.rate <= 0.001 },
    { id: 'sirius', mode: 'gravity', text: 'Postaw zegar na powierzchni Słońca, a potem Syriusza B. Gdzie czas zwalnia bardziej?',
      hint: 'Obie gwiazdy mają prawie tę samą masę.', check: (d, flags) => flags.sun && flags.wd },
    { id: 'gps', mode: 'both', text: 'Odtwórz GPS: zegar satelity śpieszy się względem Ziemi o ok. 38 µs na dobę.',
      hint: 'Ziemia, swobodna orbita, wysokość ok. 20 200 km (albo gotowy scenariusz).',
      check: d => d.bb.near.id === 'earth' && d.bb.exact && S().b.orbit && d.vsSurf * P.DAY > 36e-6 && d.vsSurf * P.DAY < 40e-6 },
    { id: 'balance', mode: 'both', text: 'Znajdź orbitę wokół Ziemi, na której zegar statku idzie tak samo jak na powierzchni.',
      hint: 'Gdzieś między ISS a GPS. Szukaj na wykresie, gdzie krzywa przecina zieloną linię.',
      check: d => d.bb.near.id === 'earth' && d.bb.exact && S().b.orbit && Math.abs(d.vsSurf * P.DAY) < 1e-6 },
    { id: 'fast-orbit', mode: 'both', text: 'Krąż swobodnie wokół czarnej dziury z prędkością ponad połowy prędkości światła.',
      hint: 'Zejdź do wysokości 2 promieni horyzontu albo niżej.', check: d => d.bb.bh && S().b.orbit && d.orbit.possible && d.spB.beta >= 0.4999 }
  ];
  let stateRef = null;
  const S = () => stateRef;

  /* ---------------------------- ciekawostki ---------------------------- */
  const FACTS = [
    { t: 'GPS w twoim telefonie', b: 'Zegary atomowe na satelitach GPS śpieszą się o ok. 38 mikrosekund na dobę: słabsza grawitacja na orbicie przyspiesza je o 45 µs, a szybki ruch spowalnia o 7 µs. Bez poprawek z teorii względności pozycja w nawigacji rozjeżdżałaby się o ponad 10 km dziennie.', try: 'Zakładka 3, scenariusz „Satelita GPS”.' },
    { t: 'Miony, które nie powinny dolecieć', b: 'Promieniowanie kosmiczne tworzy w atmosferze, ok. 15 km nad nami, cząstki zwane mionami. Żyją średnio 2,2 mikrosekundy, więc powinny rozpaść się po ok. 660 m lotu. A jednak mnóstwo ich dociera do ziemi. Lecą z prędkością 99,8 % c, więc ich czas płynie ok. 16 razy wolniej.', try: 'Zakładka 1, przycisk „Mion”.' },
    { t: 'Zegary w samolotach (1971)', b: 'Joseph Hafele i Richard Keating zabrali zegary atomowe w dwie podróże samolotem dookoła świata. Lecąc na wschód, zegary straciły 59 nanosekund, a lecąc na zachód zyskały 273 ns względem zegarów w laboratorium. Dokładnie tak, jak przewiduje teoria względności (prędkość i wysokość lotu razem).' },
    { t: '33 centymetry różnicy', b: 'W 2010 r. fizycy z amerykańskiego NIST podnieśli superdokładny zegar optyczny o 33 cm i zmierzyli, że zaczął tykać odrobinę szybciej. Kto przez 79 lat mieszka 30 cm wyżej od swojego bliźniaka, postarzeje się o ok. 90 miliardowych części sekundy bardziej.' },
    { t: 'Światło, które się męczy (1959)', b: 'Robert Pound i Glen Rebka wysłali promienie gamma z piwnicy na dach wieży uniwersytetu Harvarda (22,5 m). Na górze światło miało odrobinę niższą częstotliwość, było przesunięte ku czerwieni. Pierwszy laboratoryjny dowód, że grawitacja wpływa na czas.' },
    { t: 'Protony w LHC', b: 'W Wielkim Zderzaczu Hadronów protony lecą z prędkością 99,999999 % prędkości światła. Ich czas płynie ok. 7000 razy wolniej, a dla samego protonu 27-kilometrowy tunel ma niecałe 4 metry.', try: 'Zakładka 1, przycisk „Proton w LHC”.' },
    { t: 'Astronauci młodnieją', b: 'Na ISS wygrywa prędkość: stacja pędzi 7,7 km/s, a grawitacja jest tam niewiele słabsza niż na Ziemi. Po roku na orbicie astronauta jest młodszy od bliźniaka na Ziemi o mniej więcej 9 milisekund.', try: 'Zakładka 3, scenariusz „ISS”.' },
    { t: 'Godzina za siedem lat', b: 'W filmie „Interstellar” (2014) godzina na planecie Millera to 7 lat na Ziemi. Konsultantem był noblista Kip Thorne. Tak silny efekt wymaga ogromnej, bardzo szybko wirującej czarnej dziury i orbity tuż przy horyzoncie.', try: 'Zakładka 3, scenariusz „Jak w Interstellar”.' },
    { t: 'Zdjęcie czarnej dziury', b: 'W 2019 r. sieć radioteleskopów Event Horizon Telescope pokazała pierwsze zdjęcie cienia czarnej dziury w galaktyce M87. W 2022 r. sfotografowała też Sagittariusa A*, czarną dziurę w środku naszej Galaktyki, 4,3 mln razy cięższą od Słońca.', try: 'Zakładka 2, „Sgr A*”.' },
    { t: 'Gwiazdy przesunięte przez Słońce (1919)', b: 'Podczas zaćmienia Słońca Arthur Eddington sfotografował gwiazdy widoczne tuż przy jego tarczy. Były przesunięte o 1,75 sekundy kątowej. Światło skręciło w zakrzywionej czasoprzestrzeni, dokładnie tyle, ile przewidział Einstein. Nazajutrz był sławny na cały świat.' },
    { t: 'Zmarszczki czasoprzestrzeni', b: 'W 2015 r. detektory LIGO pierwszy raz złapały fale grawitacyjne z połączenia dwóch czarnych dziur oddalonych o 1,3 mld lat świetlnych. Czterokilometrowe ramiona detektora zmieniły długość o tysięczną część rozmiaru protonu.' }
  ];

  /* ---------------------------- słowniczek ---------------------------- */
  const GLOSSARY = [
    ['Prędkość światła (c)', 'Ok. 300 000 km na sekundę. Najwyższa prędkość we Wszechświecie i taka sama dla każdego obserwatora, niezależnie od tego, jak sam się porusza. Nic, co ma masę, nie może jej osiągnąć.'],
    ['Szczególna teoria względności', 'Teoria Einsteina z 1905 r. o tym, co dzieje się przy bardzo dużych prędkościach: czas zwalnia, długości się skracają, a masa i energia są tym samym (E = mc²).'],
    ['Ogólna teoria względności', 'Teoria Einsteina z 1915 r. o grawitacji. Grawitacja to nie siła ciągnąca na odległość, tylko zakrzywienie czasoprzestrzeni przez masę. Ciała poruszają się po „najprostszych” drogach w zakrzywionej czasoprzestrzeni.'],
    ['Dylatacja czasu', 'Wydłużenie czasu. Zegar, który szybko się porusza albo jest blisko dużej masy, tyka wolniej, gdy porównasz go ze swoim. Zwalniają wszystkie procesy, także starzenie się.'],
    ['Skrócenie Lorentza', 'Szybko poruszający się przedmiot jest krótszy w kierunku ruchu, gdy mierzy go nieruchomy obserwator. W poprzek ruchu wymiary się nie zmieniają.'],
    ['Czynnik Lorentza (γ, gamma)', 'Liczba mówiąca, ile razy wolniej tyka poruszający się zegar i ile razy krótszy jest poruszający się przedmiot. Przy codziennych prędkościach to praktycznie 1, przy 87 % c równo 2, a przy prędkości światła rośnie do nieskończoności.'],
    ['Czasoprzestrzeń', 'Trzy wymiary przestrzeni i czas połączone w jedną całość. Masa ją zakrzywia, a zakrzywienie czasu (czas płynie wolniej) to właśnie to, co odczuwamy jako grawitację.'],
    ['Nieruchomy obserwator', 'Ty. Osoba, względem której mierzymy wszystko inne. W zakładce „Prędkość” stoisz na platformie, a statek przelatuje obok. W „Grawitacji” jesteś bardzo daleko od źródła, gdzie grawitacja nic nie zmienia.'],
    ['Horyzont zdarzeń', 'Granica wokół czarnej dziury, zza której nic nie może uciec, nawet światło. Z daleka widać, jak zegar zbliżający się do horyzontu zwalnia prawie do zera i gaśnie w czerwieni.'],
    ['Promień Schwarzschilda', 'Rozmiar, do którego trzeba by ścisnąć ciało, żeby stało się czarną dziurą. Dla Ziemi to ok. 9 mm, dla Słońca ok. 3 km.'],
    ['Grawitacyjne przesunięcie ku czerwieni', 'Światło wydostające się z pola grawitacji traci energię i jego barwa przesuwa się w stronę czerwieni. To ten sam efekt co dylatacja czasu, widziany w kolorze światła.'],
    ['Efekt Dopplera i aberracja', 'Gdy lecisz szybko, światło gwiazd przed tobą staje się niebieskie i jaśniejsze, a za tobą czerwone i słabe. Do tego gwiazdy „zbiegają się” przed dziób, tak jak krople deszczu, które przy biegu lecą ci prosto w twarz.'],
    ['Rok świetlny', 'Droga, którą światło przebywa w rok: ok. 9,5 biliona km. Najbliższa gwiazda (Proxima Centauri) leży 4,24 roku świetlnego od nas.'],
    ['Orbita swobodna', 'Krążenie bez pracy silników, tylko dzięki grawitacji. Im niżej, tym szybciej trzeba lecieć. Wokół czarnej dziury najniższa stabilna orbita leży 3 promienie horyzontu od środka.']
  ];

  /* ---------------------- stałe objaśnienia „dlaczego” ---------------------- */
  const WHY = {
    speed:
      '<details open><summary>Dlaczego czas zwalnia? Zegar świetlny</summary>' +
      '<p>W środku statku jest <b>zegar świetlny</b>: błysk światła odbija się między dwoma lusterkami, a każde odbicie od dolnego to jedno tyknięcie. Ty masz na platformie identyczny zegar.</p>' +
      '<p>Dla załogi błysk leci prosto w górę i w dół. Ale ty widzisz, że w tym czasie statek przesuwa się do przodu, więc błysk leci <b>zygzakiem</b>, po dłuższej drodze (żółta smuga).</p>' +
      '<p>Światło ma zawsze tę samą prędkość, dla każdego. Dłuższa droga przy tej samej prędkości to dłuższe tyknięcie. Dlatego zegar statku tyka wolniej. I nie jest to wada zegara: tak samo zwalnia każdy proces na statku, bicie serca, starzenie się, rozpad cząstek.</p></details>' +
      '<details><summary>Dlaczego statek się skraca?</summary>' +
      '<p>To druga strona tego samego medalu. Ty i załoga zgadzacie się co do prędkości statku. Skoro dla załogi podróż trwa krócej, to droga, którą widzą za oknem, musi być dla nich krótsza. Wszystko, co porusza się względem obserwatora, jest dla niego spłaszczone w kierunku ruchu: ty widzisz spłaszczony statek, załoga widzi spłaszczony świat.</p>' +
      '<p class="aside">Tak statek się <i>mierzy</i>. Na zdjęciu wyglądałby trochę inaczej (jakby lekko obrócony), bo światło z jego dalszych części leci do aparatu dłużej.</p></details>' +
      '<details><summary>Co widzi pilot? Widok z kokpitu</summary>' +
      '<p>Przy dużych prędkościach gwiazdy „zbiegają się” przed dziobem, jak krople deszczu, które przy biegu lecą ci prosto w twarz. Światło z przodu staje się niebieskie i jaśniejsze, a za plecami ciemnieje i czerwienieje (efekt Dopplera). Przełącz widok przyciskiem w prawym górnym rogu animacji.</p></details>',
    gravity:
      '<details open><summary>Co pokazuje siatka?</summary>' +
      '<p>Masa zakrzywia czasoprzestrzeń, trochę jak ciężka kula położona na rozciągniętej gumowej płachcie. <b>Im głębiej w lejku, tym wolniej płynie czas.</b> Kolor siatki mówi, jak bardzo: niebieski to prawie normalnie, fiolet i róż to wyraźnie wolniej, pomarańcz i biel to czas, który prawie stoi.</p>' +
      '<p class="aside">Lejek jest „podkręcony”. Prawdziwe zakrzywienie przy Ziemi jest miliardy razy słabsze niż przy czarnej dziurze, więc głębokość pokazujemy w skali logarytmicznej, a odległości są ściśnięte. Liczby na zegarach są dokładne.</p></details>' +
      '<details><summary>Błyski z zegara B</summary>' +
      '<p>Zegar B co swoją sekundę wysyła błysk. Wspinając się z grawitacyjnego „dołka”, światło traci energię i czerwienieje: to <b>grawitacyjne przesunięcie ku czerwieni</b>. Ty odbierasz błyski rzadziej niż raz na sekundę. To właśnie dylatacja czasu, widziana na własne oczy.</p></details>' +
      '<details><summary>Liczy się masa i… ciasnota</summary>' +
      '<p>Słońce i Syriusz B mają prawie tę samą masę. Ale Syriusz B jest wielkości Ziemi, więc jego powierzchnia leży o wiele bliżej środka masy. Zegar na niej zwalnia ponad 100 razy mocniej niż na powierzchni Słońca. Czas najbardziej zwalnia tam, gdzie dużo masy jest ściśnięte w małej przestrzeni, a najbardziej ściśnięte są czarne dziury.</p></details>',
    both:
      '<details open><summary>Dwa efekty naraz</summary>' +
      '<p>Zegar statku zwalnia z dwóch powodów: bo siedzi w grawitacyjnym „dołku” (ogólna teoria względności) i bo szybko leci (szczególna teoria). Oba efekty się składają.</p>' +
      '<p>Im niżej orbita, tym mocniej działa grawitacja, ale też tym szybciej trzeba krążyć. Wysoko nad Ziemią wygrywa słabsza grawitacja i zegar satelity <b>śpieszy się</b> względem zegara na powierzchni. Nisko wygrywa prędkość i zegar <b>się spóźnia</b>. Granica leży ok. 3200 km nad Ziemią.</p></details>' +
      '<details><summary>GPS: względność w twojej kieszeni</summary>' +
      '<p>Satelity GPS krążą 20 200 km nad Ziemią z prędkością ok. 3,9 km/s. Słabsza grawitacja przyspiesza ich zegary o ok. 45 µs na dobę, ruch spowalnia o ok. 7 µs. Razem wychodzi +38 µs na dobę. Brzmi jak nic, ale światło przebywa w tym czasie ponad 11 km. Bez poprawek Einsteina nawigacja byłaby bezużyteczna już po jednym dniu.</p></details>' +
      '<details><summary>Kto jest punktem odniesienia?</summary>' +
      '<p>Ty, czyli obserwator A, jesteś bardzo daleko od źródła grawitacji i się nie ruszasz. Wszystkie tempa zegarów podajemy względem ciebie. Dodatkowo porównujemy statek z zegarem stojącym na powierzchni (tak jak satelitę GPS porównuje się z zegarami na Ziemi).</p></details>'
  };

  R.content = {
    SPEED_PRESETS, SPEED_SCALE, BODY_ICONS, HEIGHT_PRESETS, SCENARIOS, TASKS, FACTS, GLOSSARY, WHY,
    bindState(s) { stateRef = s; }
  };
})(window.Rel);
