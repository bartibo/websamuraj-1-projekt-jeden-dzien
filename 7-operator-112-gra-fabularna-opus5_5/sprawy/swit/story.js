'use strict';
/* =====================================================================
   Przed świtem (18+) – logika sprawy
   ===================================================================== */

const CASE = {
  id: 'swit',
  start: 364, date: '03.11.2026', nextDate: '03.11.2026',
  phone: '+48 601 447 382', incident: 'KAL/2026/11/03/0007',
  hq: [110, 640], etaFirst: 3, etaScale: 130, parTime: 30,
  battery: 46, health: 25, stress: 72, bulb: 'on',
  mapTitle: 'Lasy Gajowe – okolice Kalnowa (1 kratka ≈ 1 km)',
  target: 'p14',
  anyContact: ['kpp'],
  chronoCats: ['miejsce', 'bliscy', 'wniosek'],
  labels: {
    target: 'Miejsce', recon: 'Przejazd drogą (obserwacja)', reconShort: 'przejazd', pick: '— wybierz miejsce albo drogę —',
    go: 'Wyślij patrol w to miejsce', reconBtn: 'Przejazd', candidate: '—', chosen: '—',
    rejected: '—', victim: 'Rozmówca', mapHint: 'Kliknij miejsce na mapie, żeby zobaczyć opis i sprawdzić, czy pasuje do poszlak.',
  },
  words: {
    safe: 'bezpieczny', safeBox: 'Rozmówca bezpieczny.', found: 'Rozmówca odnaleziony', escaped: 'Rozmówca wyszedł sam',
    lostChrono: 'Utrata kontaktu z rozmówcą', herMsgs: 'Jego wiadomości', describes: 'on coś opisze', atVictim: 'przy rozmówcy',
    hid: 'Rozmówca odłożył telefon. Nie wysyłaj teraz wiadomości.', hpLabel: 'Zaufanie', stLabel: 'Napięcie',
  },
  lostText: {
    bateria: 'Urządzenie rozmówcy niedostępne: rozładowana bateria.',
    omdlenie: 'Rozmówca przestał odpisywać i wyłączył telefon.',
    rozlaczyl: 'Rozmówca zakończył rozmowę i wyłączył telefon.',
  },
  batteryLines: { 15: 'bateria 15%. zimno ją zjada', 10: '10%', 5: 'zaraz mi padnie' },
  idleLines: ['jesteś tam?', 'no i co. też już poszedłeś', 'dobra. nieważne'],
  onIdle: () => dT(-4),
  hpText: v => v < 15 ? 'zerwane' : v < 30 ? 'kruche' : v < 50 ? 'niepewne' : v < 70 ? 'rośnie' : 'mocne',
  stText: v => v >= 90 ? 'skrajne' : v >= 70 ? 'wysokie' : v >= 45 ? 'umiarkowane' : 'spokojniejszy',
  endNote: '<b>Jeśli myślisz o odebraniu sobie życia albo martwisz się o kogoś bliskiego, nie zostawaj z tym w pojedynkę.</b> Zadzwoń: <b>116 123</b> (Kryzysowy Telefon Zaufania), <b>800 70 2222</b> (Centrum Wsparcia dla osób w kryzysie psychicznym, całą dobę), <b>116 111</b> (Telefon Zaufania dla Dzieci i Młodzieży). W nagłym zagrożeniu życia: <b>112</b>.',
  intro: {
    kicker: 'Centrum Powiadamiania Ratunkowego · Kalnów · przed świtem',
    lead: ['Jest 06:04, trzeci listopada. Pierwszy przymrozek, mgła leży nad polami. Na numer 112 ktoś dzwoni i milczy, a potem pisze: nie dzwońcie, nie odbiorę.',
      'Mężczyzna siedzi w aucie gdzieś za miastem. Z tyłu śpi stary pies. Nie powie, gdzie jest, i nie chce, żeby ktoś przyjeżdżał. Chce tylko, żeby ktoś wiedział. Do świtu zostało nieco ponad pół godziny.'],
    shift: '02–03.11.2026 · 19:00 – 07:00',
    warn: 'Sprawa dla dorosłych (18+) o kryzysie samobójczym. Bez opisów metod i bez scen przemocy. Jeśli przeżywasz kryzys, zadzwoń pod 116 123 albo 800 70 2222, a w nagłym zagrożeniu pod 112.',
    image: 'sprawy/swit/intro.jpg',
  },

  state: () => ({ voluntary: false, forced: false, late: false, dawnT: null }),

  /* zaufanie samo słabnie, gdy napięcie jest wysokie i gdy on pije */
  healthDrain() {
    let d = S.stress > 75 ? 0.3 : 0.1;
    if (has('alkohol') && !has('bez_alko')) d += 0.1;
    return d;
  },
  batteryDrain: () => 0.08, // mróz
  altLight: () => true,
  altLightName: '',
  altLightMsg: '',

  callerName: () => has('nazwisko') ? 'Paweł Sobczak' : has('imie') ? 'Paweł' : 'NN · mężczyzna',
  callerNum: () => CASE.phone,
  healthKnown: () => true,
  kwal: () => has('wprost') || has('srodki') ? 'ZAMIAR SAMOBÓJCZY' : 'DO USTALENIA',
  statusItems: () => [`AML: <b class="alr">WYŁ.</b>`, `BTS: <b>${has('bts') ? 'GAJÓWKA S2' : '—'}</b>`, `ŚWIT: <b class="${S.t >= 24 ? 'amb' : ''}">06:37</b>`],

  addrLevel() {
    if (has('potwierdzony') || S.rescued) return 'confirmed';
    if (['tablica', 'w_pomost14'].some(has)) return 'probable';
    const d = deducedBuilding();
    return d && d.id === 'p14' ? 'probable' : null;
  },
  locText(al, cand) {
    if (al === 'confirmed') return 'Stawy Gajowe, pomost 14';
    if (al === 'probable') return 'prawdopodobnie Stawy Gajowe, pomost 14';
    if (activeGeo().length >= 1 && cand.length >= 2 && cand.length <= 4) return `${cand.length} pasujące miejsca`;
    if (has('bts')) return 'Lasy Gajowe (BTS, ok. 2 km)';
    if (has('dom')) return 'wyjechał z Kalnowa, ul. Polna 7';
    return 'nieustalone (lokalizacja wyłączona)';
  },
  buildingInfo(b) {
    return `${b.kind} · woda: ${b.water ? 'tak' : 'nie'} · w lesie: ${b.forest ? 'tak' : 'nie'} · dojazd: ${b.access}`;
  },

  protocol: () => [
    ['Kontakt nawiązany', has('imie')],
    ['Pytanie wprost o zamiar', has('wprost')],
    ['Środki ustalone', has('srodki')],
    ['Środki odsunięte', has('torba')],
    ['Lokalizacja przybliżona', has('bts') || activeGeo().length >= 2],
    ['Miejsce ustalone', !!addrLevel()],
    ['Tożsamość', has('nazwisko')],
    ['Zgoda na pomoc', has('zgoda')],
    ['Policja zadysponowana', !!S.order],
    ['ZRM zadysponowany', S.zrmSent],
  ],
  card() {
    return [
      ['Telefon', CASE.phone],
      ['Rodzaj', has('wprost') || has('srodki') ? 'zamiar samobójczy, osoba w kryzysie' : 'do ustalenia'],
      ['Rozmówca', has('nazwisko') ? 'Paweł Sobczak, 41 l.' : has('imie') ? 'Paweł, ok. 40 l.' : 'NN, mężczyzna'],
      ['Miejsce', $('#caller-loc').textContent],
      ['Pojazd', has('auto') ? 'Skoda Octavia kombi, srebrna, KAL 4T21' : has('zona_zgl') ? 'srebrna skoda kombi' : '—'],
      ['Środki', has('torba') ? 'w torbie, w zamkniętym bagażniku' : has('srodki') ? 'w torbie na siedzeniu obok' : '—'],
      ['Alkohol', has('bez_alko') ? 'pił, resztę wylał' : has('alkohol') ? 'pół butelki wódki' : '—'],
      ['Pies', has('bruno') ? 'Bruno, w aucie' : '—'],
      ['Termin', has('deadline') ? 'świt, 06:37' : '—'],
    ];
  },

  /* ---------- początek rozmowy ---------- */
  async opening() {
    await opSay('112, Centrum Powiadamiania Ratunkowego. Słucham?');
    await wait(900);
    await sys('Kanał głosowy: cisza, oddech, w tle cicho skomli pies. Rozmówca przerywa połączenie po 9 sekundach.');
    await sys('Przyszła wiadomość w kanale tekstowym 112.');
    await her(['nie dzwońcie. nie odbiorę', 'chciałem tylko żeby ktoś wiedział', 'w aucie jest pies. niech ktoś go potem zabierze. on nic nie zrobił', 'przepraszam za kłopot']);
    await sys('Kanał tekstowy aktywny. Lokalizacja AML niedostępna: usługa lokalizacji w telefonie wyłączona. Telemetria baterii: 46%.');
    await decide({
      title: 'Pierwsza odpowiedź', text: 'Mężczyzna pisze tak, jakby się żegnał. Nie chce, żeby ktoś dzwonił.', timer: null,
      options: [
        { label: 'Dobrze, że napisałeś. Jestem tutaj i nigdzie się nie spieszę. Jak mam się do ciebie zwracać?', async run() {
            await opSay('Dobrze, że napisałeś. Jestem tutaj i nigdzie się nie spieszę. Jak mam się do ciebie zwracać?');
            flag('imie'); dT(+8); dS(-6); good('Spokojne otwarcie, bez nacisku');
            await her(['paweł', 'nie musisz się spieszyć. ja też już nigdzie']); } },
        { label: 'Proszę natychmiast podać, gdzie pan jest. Wysyłamy policję.', async run() {
            await opSay('Proszę natychmiast podać, gdzie pan jest. Wysyłamy policję.');
            dT(-10); dS(+12); mistake('Nacisk na lokalizację zamiast nawiązania kontaktu');
            await her(['nie', 'właśnie dlatego nic nie powiem', 'jak usłyszę syreny to skończę od razu']); } },
        { label: 'Nie rób głupot. Masz dla kogo żyć.', async run() {
            await opSay('Nie rób głupot. Masz dla kogo żyć.');
            dT(-8); mistake('Moralizowanie na początku rozmowy');
            await her(['skąd wiesz dla kogo mam', 'nic o mnie nie wiesz']); } },
      ],
    });
  },

  /* ---------- patrol na miejscu ---------- */
  async arrive(b) {
    if (b.id === 'p14') { await arriveP14(); return true; }
    if (b.id === 'p3') {
      await radio(b.report);
      clue('slady'); clue('potwierdzony');
      mistake(`Patrol pod błędnym adresem: ${b.addr}`);
      S.order.status = 'wolny';
      await noticeLights();
      await radio('Patrol 0-7 wolny na grobli. Do pomostu 14 mamy 300 metrów.');
      return true;
    }
    return false;
  },
  async onRecon(street) { if (street === 'grobla') await noticeLights(); },
  onCandidate() { },
  onDispatch(o) {
    if (has('patrol_q')) return;
    flag('patrol_q');
    S.pending.push(() => patrolTalk());
  },

  /* ---------- koniec ---------- */
  endingCode() {
    if (!S.rescued) return 'E5';
    if (S.voluntary) return S.contact === 'lost' ? 'E6' : 'E1';
    if (S.late) return 'E4';
    if (S.forced) return 'E3';
    return 'E2';
  },
  scoreExtra() {
    let p = 0;
    if (S.voluntary) p += 14;
    if (S.late) p -= 12;
    if (S.forced) p -= 4;
    p += Math.max(0, S.health - 40) / 6;
    p += ['wprost', 'torba', 'bez_alko', 'umowa', 'przelom', 'cik', 'psycholog'].filter(has).length * 1.5;
    if (S.clues.size < 6) p -= 30;
    return p;
  },
  finalMistakes() {
    if (!has('wprost')) mistake('Nie zapytano wprost o zamiar samobójczy');
    if (has('srodki') && !has('torba')) mistake('Środki zostały przy nim do końca');
    if (S.lostReason === 'bateria' && !has('dim')) mistake('Nie oszczędzano baterii');
    if (S.rescued && !S.zrmSent) mistake('Brak ZRM: alkohol i wychłodzenie');
  },
  missedPrio(cat) {
    const locDone = S.rescued || addrLevel();
    return cat === 'miejsce' ? (locDone ? 9 : 0) : cat === 'bliscy' ? 1 : cat === 'ryzyko' ? 1 : 2;
  },
  stats: () => [
    ['Paweł', S.rescued ? (S.late ? 'nieprzytomny, żyje' : 'bezpieczny') : 'nieodnaleziony'],
    ['Zaufanie na końcu', Math.round(S.health) + ' / 100'],
    ['Bruno', S.rescued ? 'bezpieczny' : '?'],
  ],
  chronoExtra: () => S.dawnT != null ? [{ t: S.dawnT, l: 'Świt: przetrwał moment, który sobie wyznaczył', ok: true }] : [],
  epilogue(code) { return epilogue(code); },
};

/* =====================================================================
   NARZĘDZIA (BAZY)
   ===================================================================== */
const TOOLS = [
  { id: 'aml', name: 'Lokalizacja AML', desc: 'Pozycja z telefonu przesyłana przy połączeniu z 112.', cost: 1, once: true,
    async run() { clue('dom'); return 'AML: brak pozycji. W telefonie wyłączona usługa lokalizacji.\nOstatni AML z tego numeru: dziś 05:31, Kalnów, ul. Polna 7 (±15 m). Od tego czasu telefon się przemieścił.'; } },
  { id: 'bts', name: 'Operator sieci: stacja bazowa', desc: 'Do jakiej stacji BTS loguje się telefon i jak się przemieszczał.', cost: 2, once: true,
    async run() { clue('bts'); return 'Plus GSM, numer +48 601 447 382:\n05:31 – BTS Kalnów-Centrum.\n05:44 – BTS Gajówka, sektor 1 (wzdłuż DK46).\nod 05:52 – BTS Gajówka, sektor 2 (azymut 330°), bez zmian.\nSzacowany obszar: ok. 2,2 km wokół punktu na mapie. Na mapie dodano nakładkę.'; } },
  { id: 'ewid', name: 'Ewidencja ludności', desc: 'Osoba po imieniu i nazwisku albo adres.', cost: 1, input: true,
    placeholder: 'np. imię i nazwisko albo ulica', registry: () => REGISTRY,
    miss: (q, n) => n.split(' ').length < 2 && !/polna/.test(n) ? `Brak jednoznacznego wyniku dla „${q}”. Podaj imię i nazwisko albo ulicę.` : `Brak wyników dla „${q}” w ewidencji gminy.` },
  { id: 'cepik', name: 'CEPiK: pojazdy', short: 'CEPiK', desc: 'Pojazdy po nazwisku właściciela albo numerze rejestracyjnym.', cost: 1, input: true,
    placeholder: 'np. nazwisko albo nr rejestracyjny', registry: () => CEPIK,
    miss: q => `CEPiK: brak pojazdów dla „${q}”.` },
  { id: 'anpr', name: 'Kamery ANPR na DK46', desc: 'Odczyty tablic rejestracyjnych z kamer na drodze krajowej.', cost: 2, once: true,
    avail: () => has('auto'), lock: 'Potrzebny numer rejestracyjny auta.',
    async run() { clue('anpr'); return 'System ANPR, odczyty KAL 4T21:\n05:39 – DK46 km 28, Kalnów-Wschód, kierunek Lipno.\n05:44 – DK46 km 34, Gajówka, kierunek Lipno.\nDK46 km 41, Lipno – brak odczytu.\nAuto zjechało z DK46 między km 34 a 41. Jedyny zjazd w las na tym odcinku: droga leśna Gajowa, do kapliczki św. Huberta i na groblę Stawów Gajowych.'; } },
  { id: 'egz', name: 'Rejestr egzekucji komorniczych', short: 'Egzekucje', desc: 'Postępowania komornicze po nazwisku albo adresie.', cost: 1, input: true,
    placeholder: 'np. nazwisko albo ulica', registry: () => EGZ,
    miss: q => `Brak postępowań dla „${q}”.` },
  { id: 'zona', name: 'Telefon: Agnieszka Sobczak', desc: 'Żona, która zgłosiła SMS pożegnalny.', cost: 2, once: true,
    avail: () => has('zona_zgl') || has('ewid_pawel'), lock: 'Najpierw ustal, kim jest rozmówca.',
    async run() {
      clue('ryby_ojciec'); clue('ojciec'); clue('urodziny'); clue('rozstanie');
      let out = 'Agnieszka Sobczak, roztrzęsiona: „Paweł? Boże. O piątej czterdzieści napisał mi, żebym wzięła Bruna, i wyłączył telefon. Jego tata… też tak. W dziewięćdziesiątym siódmym. Paweł miał dwanaście lat, nigdy o tym nie mówił.\nGdzie może być? Nie wiem. Jak był mały, ojciec zabierał go na ryby na Stawy Gajowe, za Gajówką. Tam mi się oświadczył, na tym samym pomoście. Zuzia ma dziś urodziny, mieliśmy się widzieć o szesnastej. Mogę do niego napisać?”';
      await decide({
        title: 'Agnieszka chce do niego napisać', text: 'Co jej odpowiadasz?', timer: null,
        options: [
          { label: 'Proszę na razie nie pisać ani nie dzwonić. Niech pani będzie pod telefonem, dam znać.', async run() {
              flag('zona_czeka'); good('Kontrola kontaktu z rodziną');
              out += '\n\nTy: „Proszę na razie nie pisać. Niech pani będzie pod telefonem”.\nAgnieszka: „Dobrze. Będę. Proszę mu powiedzieć… nie, nic. Proszę go tylko znaleźć”.'; } },
          { label: 'Niech pani napisze mu, że Zuzia na niego czeka.', async run() {
              mistake('Nacisk przez rodzinę bez przygotowania');
              out += '\n\nAgnieszka: „Dobrze, już piszę”.';
              S.pending.push(async () => {
                if (S.contact !== 'active') return;
                dT(-10); dS(+12);
                await her(['agnieszka napisała. że zuzia czeka', 'to ty jej kazałeś?', 'po co ją w to mieszasz']);
              }); } },
        ],
      });
      return out;
    } },
  { id: 'cik', name: 'Psycholog dyżurny CIK Kalnów', short: 'CIK', desc: 'Centrum Interwencji Kryzysowej: konsultacja i wsparcie na miejscu.', cost: 2, once: true,
    async run() {
      clue('cik'); flag('cik');
      let out = 'Marta Wilk, psycholożka dyżurna CIK Kalnów: „Rozmawiaj z nim, nie przesłuchuj. Zapytaj wprost, czy myśli o samobójstwie. To nie podsuwa pomysłu, tylko daje ulgę. Nie oceniaj, nie moralizuj, nie obiecuj, czego nie dotrzymasz. Szukaj tego, co go trzyma: ludzie, zwierzę, coś do zrobienia jutro. Poproś, żeby odłożył to, czym chce zrobić sobie krzywdę, jak najdalej, choćby do bagażnika. Uważaj na alkohol. Bez syren. Powiedz mu prawdę o patrolu, kiedy będzie gotów”.';
      await decide({
        title: 'Psycholożka może pojechać z patrolem', text: 'Dojedzie razem z policją, jeśli ich zadysponujesz.', timer: null,
        options: [
          { label: 'Tak, proszę jechać z patrolem.', async run() { flag('psycholog'); good('Psycholog CIK w drodze z patrolem'); out += '\n\nPsycholożka: „Jadę. Będę w radiowozie”.'; } },
          { label: 'Nie, wystarczy konsultacja.', async run() { } },
        ],
      });
      return out;
    } },
];

/* =====================================================================
   PATROL: PRAWDA, SYRENY, PRZYJAZD
   ===================================================================== */
async function patrolTalk() {
  if (S.contact !== 'active' || S.rescued) return;
  if (has('zgoda')) { flag('powiedzial'); await opSay('Ludzie są w drodze. Bez syren. Bruno jedzie z tobą.'); await her(['dobra', 'czekam']); return; }
  await decide({
    title: 'Patrol jedzie. Mówisz mu o tym?', text: 'Jeśli usłyszy albo zobaczy radiowóz bez uprzedzenia, może to odebrać jak zdradę.', timer: null,
    options: [
      { label: 'Powiedz prawdę: wysłałem do ciebie ludzi. Nie po to, żeby cię zamknąć, tylko żebyś nie był sam.', async run() {
          await opSay('Powiem ci prawdę: wysłałem do ciebie ludzi. Nie po to, żeby cię zamknąć, tylko żebyś nie był sam.');
          flag('powiedzial'); good('Szczerość wobec rozmówcy');
          if (T() >= 50) { dT(+6); await her(['…', 'dobra. ale bez syren', 'i niech nie świecą mi po oczach']); }
          else if (T() >= 30) { dT(-6); dS(+8); await her(['czyli jednak', 'wiedziałem']); }
          else { dT(-12); dS(+12); await her(['czyli wszystko to było po to', 'żeby mnie namierzyć']); if (T() < 8) await loseContact('rozlaczyl'); } } },
      { label: 'Nic mu nie mów.', async run() { flag('cisza_patrol'); } },
      { label: 'Powiedz mu, że nikogo nie wysłałeś.', async run() {
          await opSay('Nikogo nie wysłałem. Jesteśmy tylko my.');
          flag('klamstwo'); dT(+3);
          await her(['dobra', 'dzięki']); } },
    ],
  });
}

/* światła na grobli: patrol w pobliżu, a on o tym nie wie */
async function noticeLights() {
  if (S.contact !== 'active' || S.rescued || has('zgoda')) return;
  if (has('klamstwo')) { dT(-20); mistake('Okłamanie rozmówcy w sprawie patrolu'); await her(['na grobli radiowóz', 'mówiłeś że nikogo nie wysłałeś']); return; }
  if (has('powiedzial')) return;
  dT(-8); dS(+8);
  await her(['na grobli jakieś światła. auto', 'to po mnie?']);
}

async function arriveP14() {
  const o = S.order;
  if (o.blind && !hasEvidence()) mistake('Patrol wysłany na ślepo, bez ustalenia miejsca');
  if (S.contact === 'active') {
    if (has('klamstwo')) {
      dT(-35); mistake('Okłamanie rozmówcy w sprawie patrolu');
      await her(['radiowóz', 'mówiłeś że nikogo nie wysłałeś', 'kłamałeś. jak wszyscy']);
    } else if (!has('powiedzial') && !has('zgoda')) {
      dT(-12); dS(+10);
      await her(['radiowóz. przy samym aucie', 'to po mnie?']);
    }
    if (has('zgoda') && T() >= 45) {
      await radio('Jesteśmy przy pomoście 14. Mężczyzna wysiada sam, ręce trzyma na widoku. Pies na smyczy.');
      await her(['widzę ich', 'wysiadam. z brunem', 'dziękuję. naprawdę']);
      S.voluntary = true;
      await rescued();
      return;
    }
    await standoff();
    return;
  }
  // kontakt urwany
  if (S.lostReason === 'bateria' && has('zgoda')) {
    await radio('Pomost 14. Mężczyzna siedzi na pomoście z psem, telefon rozładowany. Mówi, że czekał na nas, tak jak obiecał.');
    S.voluntary = true;
    await rescued();
    return;
  }
  const late = S.lostAt != null ? S.t - S.lostAt : 0;
  if (late <= 8) {
    await radio('Pomost 14. Auto zamknięte od środka, mężczyzna w środku, przytomny. Nie otwiera. Wybijamy szybę… Mamy go. Żyje. Szarpie się, ale już siedzi z nami.');
    S.forced = true;
  } else {
    await radio('Pomost 14. Mężczyzna w aucie, nieprzytomny, wychłodzony. Oddycha. Wybijamy szybę. ZRM, szybko!');
    S.forced = true; S.late = true;
  }
  await rescued();
}

async function standoff() {
  const need = 35 - (has('psycholog') ? 12 : 0) - (has('torba') ? 8 : 0);
  await decide({
    title: 'Patrol stoi przy aucie', text: 'Paweł siedzi w środku, drzwi zablokowane. Policjanci czekają na twój sygnał.', timer: null,
    options: [
      { label: 'Napisz mu: to ci ludzie, o których mówiłem. Są tu, żebyś nie był sam. Otwórz, kiedy będziesz gotów.', async run() {
          await opSay('To ci ludzie, o których mówiłem. Są tu, żebyś nie był sam. Otwórz, kiedy będziesz gotów.');
          if (T() >= need) {
            await her(['…', has('psycholog') ? 'jakaś pani stoi przy szybie. mówi że jest psycholożką' : 'policjant stoi przy szybie. nie świeci mi w oczy', 'otwieram']);
            await radio('Otworzył. Siedzi z nami w radiowozie, rozmawia. Pies z nami.');
          } else {
            await her(['nie', 'niech odjadą']);
            await radio('Zablokował drzwi, nie reaguje. Wybijamy szybę… Mamy go. Żyje.');
            S.forced = true;
          } } },
      { label: 'Niech policjanci natychmiast go wyciągną.', async run() {
          if (T() >= need) mistake('Siła tam, gdzie wystarczyła rozmowa');
          await radio('Wybijamy szybę… Mamy go. Szarpał się, już spokojny. Żyje.');
          S.forced = true; } },
    ],
  });
  await rescued();
}

async function rescued() {
  S.rescued = true; S.rescueT = S.t;
  if (S.order) S.order.status = 'na_miejscu';
  if (S.zrmSent) await radio('ZRM K-03 na grobli. Zabieramy go na SOR do Kalnowa, wychłodzenie i alkohol.', 'ZRM K-03');
  else { await radio('Potrzebny ZRM: wychłodzenie, alkohol.'); await sys('Zadysponowano ZRM K-03. Dojazd 9 min.'); S.zrmSent = true; }
  if (S.contact === 'active') await opSay('Jesteś bezpieczny, Paweł. Dobrze, że napisałeś.');
  sfx('win');
  S.phase = 'done';
}

/* =====================================================================
   EPILOGI (bez opisów metod, z nadzieją tam, gdzie się da)
   ===================================================================== */
function epilogue(code) {
  const clk = fmtClock(S.rescueT != null ? S.rescueT : S.t);
  const P = a => a.filter(Boolean).map(x => `<p>${x}</p>`).join('');
  const after = 'Komornik dostał rano notatkę z KPP i przesunął eksmisję o miesiąc. W marcu Paweł dostał rentę. Długi zostały, ale z doradcą z MOPS-u rozłożył je na raty.';
  const father = has('przelom') ? 'Na terapii po raz pierwszy mówi o ojcu na głos. Mówi, że tamtej nocy ktoś zapytał go, co by powiedział dwunastolatkowi, i że tego dnia odpowiedział też sobie.' : '';
  switch (code) {
    case 'E1': return P([`${clk}. Paweł Sobczak wysiada z auta, zanim radiowóz się zatrzyma. Ręce trzyma tak, żeby było je widać. Bruno idzie przy nodze. Policjantka pyta, czy może pogłaskać psa, i Paweł pierwszy raz od miesięcy się śmieje, krótko, jakby się zakrztusił.`,
      'Torba zostaje w zamkniętym bagażniku. Ratownicy zabierają go na SOR do Kalnowa, a stamtąd na oddział interwencji kryzysowej.' + (has('zona_czeka') ? ' Agnieszka przyjeżdża po Bruna o ósmej. Zuzi mówi, że tata jest w szpitalu, bo bardzo zmarzł.' : ''),
      after, father, 'W maju wraca na Stawy Gajowe, z Zuzią, wędką i tortem z bezą. Spóźnionym o pół roku.']);
    case 'E6': return P(['Telefon gaśnie w połowie zdania. Kiedy radiowóz dojeżdża na groblę, Paweł siedzi na końcu pomostu 14, z Brunem przy nodze, z rozładowanym telefonem w ręce. Wstaje, zanim policjanci wysiądą. „Obiecałem, że poczekam”.',
      'Torba leży w zamkniętym bagażniku. Na SOR-ze pyta tylko, czy ktoś da psu wody.', after, father]);
    case 'E2': return P([`${clk}. Radiowóz stoi przy aucie. Przez zaparowaną szybę widać, jak Paweł trzyma dłonie na kierownicy i patrzy na wodę. Rozmowa przez szybę trwa dwadzieścia minut, aż w końcu odblokowuje drzwi.`,
      'Przez tydzień na oddziale z nikim nie rozmawia. Potem prosi o numer do psycholożki z CIK.', after, father]);
    case 'E3': return P([`${clk}. Patrol wybija szybę i wyciąga go z auta. Szarpie się, krzyczy, żeby go zostawili, a potem siada na szronie i płacze. Bruno liże mu ręce.`,
      'Trafia na oddział psychiatryczny wbrew swojej woli, na obserwację. Kilka tygodni później do CPR Kalnów przychodzi list, pisany krzywym pismem: „Byłem na was wściekły. Teraz już nie”.', after]);
    case 'E4': return P(['Patrol znajduje go nieprzytomnego i wychłodzonego. Ratownicy pracują przy nim na grobli dwadzieścia minut, zanim można go zabrać. Bruno szczekał w aucie tak długo, że ochrypł.',
      'Paweł leży trzy doby na OIOM-ie w Kalnowie. Lekarze mówią, że zdecydowało kilka minut. Kiedy się budzi, pierwsze pytanie zadaje o psa.',
      'Wyjdzie z tego. Ale ta rozmowa zakończyła się za wcześnie.']);
    case 'E5': return P([`Ostatnia wiadomość w kanale: „${esc(S.lastHer || '…')}”. Potem tylko cisza.`,
      'Policja szuka srebrnej skody do południa. O dziewiątej komornik zastaje dom przy Polnej 7 pusty, a w warsztacie po ojcu równo poukładane narzędzia.',
      '<b>To zgłoszenie pozostaje otwarte.</b>']);
  }
  return '';
}
