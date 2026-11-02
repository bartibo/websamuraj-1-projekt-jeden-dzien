// Misje, lekcje „Jak to działa?”, odznaki i motywy plansz
window.Iskry = window.Iskry || {};
(function () {
  const C = Iskry.circuit;
  const N = (c, r) => C.node(c, r);

  // element z misji: typ, od [c,r] do [c,r] (dla baterii: od minusa do plusa; dla diody: od + do −)
  const el = (type, from, to, extra) => Object.assign({ type, a: N(from[0], from[1]), b: N(to[0], to[1]), locked: true }, extra || {});
  // kabel po kolejnych punktach (tylko odcinki poziome/pionowe)
  function wires(pts, extra) {
    const out = [];
    for (let i = 1; i < pts.length; i++) {
      let [c, r] = pts[i - 1];
      const [c2, r2] = pts[i];
      while (c !== c2 || r !== r2) {
        const nc = c + Math.sign(c2 - c), nr = c === c2 ? r + Math.sign(r2 - r) : r;
        out.push(el('wire', [c, r], [nc, nr], extra));
        c = nc; r = nr;
      }
    }
    return out;
  }

  // ---------- pomocnicze sprawdzanie ----------
  const of = (ctx, t) => ctx.pieces.filter(p => p.type === t);
  const on = (ctx, p) => !!(ctx.res.pieces[p.id] && ctx.res.pieces[p.id].on) && !p.burnt;
  const inputs = ctx => ctx.pieces.filter(C.isInput);

  // dla urządzenia: który przełącznik sam nim steruje (urządzenie działa ⇔ ten przełącznik włączony)
  function controllers(ctx) {
    if (ctx._ctrl) return ctx._ctrl;
    const ins = inputs(ctx);
    const devs = ctx.pieces.filter(p => ['bulb', 'motor', 'buzzer', 'led'].includes(p.type));
    const table = C.combos(ctx.pieces, (res, ov) => ({ ov, on: Object.fromEntries(devs.map(d => [d.id, !!(res.pieces[d.id] && res.pieces[d.id].on)])) }));
    const ctrl = {};
    for (const d of devs) {
      ctrl[d.id] = null;
      for (const x of ins) {
        if (table.every(row => row.on[d.id] === !!row.ov[x.id])) { ctrl[d.id] = x.id; break; }
      }
    }
    return (ctx._ctrl = ctrl);
  }
  function ownControl(ctx, type) {
    const devs = of(ctx, type);
    if (!devs.length || inputs(ctx).length > 5) return false;
    const ctrl = controllers(ctx);
    const mine = ctrl[devs[0].id];
    if (!mine) return false;
    return !Object.keys(ctrl).some(id => id !== devs[0].id && ctrl[id] === mine);
  }

  Iskry.MISSIONS = [
    {
      id: 'm1', emoji: '💡', title: 'Pierwsze światełko',
      intro: 'Cześć! Jestem Wolcik ⚡ Ta żarówka chce świecić, ale iskierki nie mają którędy do niej dojechać. Zbuduj im tor wyścigowy: połącz kablami plus baterii z żarówką, a żarówkę z minusem!',
      hint: 'Wybierz na dole „Kabel” i przeciągnij palcem lub myszką od kropki przy baterii do kropki przy żarówce. Potrzebne są dwie drogi: jedna górą, druga dołem.',
      setup: [el('battery', [3, 4], [3, 3]), el('bulb', [7, 3], [7, 4])],
      tray: { wire: 99 },
      checks: [{ t: 'Żarówka świeci', f: c => of(c, 'bulb').some(p => on(c, p)) }],
      explain: 'Tor jest zamknięty, więc iskierki ścigają się dookoła bez końca: bateria daje im klocki energii, a w żarówce je oddają – cieniutki drucik rozgrzewa się i świeci. To właśnie jest <b>obwód elektryczny</b>: zamknięta pętla. Wystarczy jedna dziura w torze i wyścig staje.',
    },
    {
      id: 'm2', emoji: '🔘', title: 'Pstryczek-elektryczek',
      intro: 'W torze jest dziura, a my chcemy ją otwierać i zamykać na zawołanie! Wstaw wyłącznik w puste miejsce, a potem pstrykaj nim, dotykając go.',
      hint: 'Wybierz „Wyłącznik” i dotknij pustego miejsca na górnym torze. Potem w trybie „Rączka” dotknij wyłącznika, żeby go włączyć i wyłączyć.',
      setup: [el('battery', [3, 4], [3, 3]), el('bulb', [7, 3], [7, 4]), ...wires([[3, 3], [4, 3]]), ...wires([[5, 3], [7, 3]]), ...wires([[3, 4], [7, 4]])],
      tray: { switch: 1, wire: 99 },
      checks: [
        { t: 'Wyłącznik włączony – żarówka świeci', sticky: true, f: c => of(c, 'switch').some(s => s.on) && of(c, 'bulb').some(p => on(c, p)) && of(c, 'switch').length > 0 },
        { t: 'Wyłącznik wyłączony – ciemno', sticky: true, f: c => of(c, 'switch').length > 0 && of(c, 'switch').every(s => !s.on) && !of(c, 'bulb').some(p => on(c, p)) && C.combos(c.pieces, r => Object.values(r.pieces).some(x => x.on)).some(Boolean) },
      ],
      explain: 'Wyłącznik działa jak <b>most zwodzony</b> na torze. Podniesiony – iskierki stają w miejscu, bo tor jest przerwany. Opuszczony – wyścig rusza. Tak samo działa każdy włącznik światła w domu, tylko jest schowany w ścianie.',
    },
    {
      id: 'm3', emoji: '🌀', title: 'Wiatraczek',
      intro: 'Silniczek zamienia energię iskierek w kręcenie! Podłącz go do baterii i zrób wiatraczek. A potem spróbuj zakręcić nim w drugą stronę.',
      hint: 'Połącz baterię i silniczek kablami. Żeby śmigło kręciło się w drugą stronę, dotknij baterii i wybierz „Odwróć”.',
      setup: [el('battery', [3, 4], [3, 3]), el('motor', [7, 3], [7, 4])],
      tray: { wire: 99 },
      checks: [
        { t: 'Śmigło się kręci', sticky: true, f: c => of(c, 'motor').some(p => on(c, p)) },
        { t: 'Śmigło kręci się w drugą stronę', sticky: true, f: c => { const m = of(c, 'motor').find(p => on(c, p)); if (!m) return false; const s = Math.sign(c.res.pieces[m.id].speed); c.mem.dirs = c.mem.dirs || {}; c.mem.dirs[s] = true; return c.mem.dirs[1] && c.mem.dirs[-1]; } },
      ],
      explain: 'Iskierki zawsze ścigają się od plusa (+) do minusa (−). Gdy odwracasz baterię, wyścig rusza w przeciwną stronę, a silniczek kręci się na odwrót. Tak działają zabawkowe samochody, które jeżdżą do przodu i do tyłu!',
    },
    {
      id: 'm4', emoji: '🚀', title: 'Turbo-wiatrak',
      intro: 'Wiatraczek kręci się, ale leniwie. Zrób mu TURBO! Dołóż drugą baterię, żeby iskierki dostały większe klocki energii.',
      hint: 'Postaw drugą baterię na torze zamiast kawałka kabla (możesz ją położyć prosto na kablu). Plus jednej baterii musi prowadzić do minusa drugiej – jeśli śmigło stanie, odwróć nową baterię.',
      setup: [el('battery', [3, 4], [3, 3]), el('motor', [7, 3], [7, 4]), ...wires([[3, 3], [7, 3]], { locked: false }), ...wires([[3, 4], [7, 4]], { locked: false })],
      tray: { battery: 2, wire: 99 },
      checks: [{ t: 'Śmigło kręci się w trybie TURBO', f: c => of(c, 'motor').some(p => on(c, p) && Math.abs(c.res.pieces[p.id].vd) >= 2.5) }],
      explain: 'Dwie baterie ustawione jedna za drugą (plus do minusa) to jak dwie windy: pierwsza daje iskierce jeden klocek, druga dokłada drugi. Większe klocki to większe <b>napięcie</b> – iskierki mocniej pchają i silniczek kręci się szybciej. Włącz „Klocki” po prawej, żeby zobaczyć wieże napięcia!',
    },
    {
      id: 'm5', emoji: '🚃', title: 'Lampki w pociągu',
      intro: 'Zapal dwie żarówki jedną baterią, ustawiając je jedną za drugą, jak wagoniki pociągu. Iskierki muszą przejechać najpierw przez jedną, a potem przez drugą.',
      hint: 'Zrób jedną pętlę: bateria → żarówka → żarówka → z powrotem do baterii. Obie żarówki muszą leżeć na tym samym torze.',
      setup: [el('battery', [2, 4], [2, 3])],
      tray: { bulb: 2, wire: 99 },
      checks: [
        { t: 'Obie żarówki świecą', f: c => of(c, 'bulb').length >= 2 && of(c, 'bulb').every(p => on(c, p)) },
        { t: 'Leżą na jednym torze, jedna za drugą', f: c => { const b = of(c, 'bulb'); return b.length === 2 && b.every(p => on(c, p)) && b.every(p => Math.abs(c.res.pieces[p.id].vd) < 1.0) && Math.abs(Math.abs(c.res.pieces[b[0].id].I) - Math.abs(c.res.pieces[b[1].id].I)) < 0.01; } },
      ],
      explain: 'Świecą, ale słabiej niż jedna żarówka, prawda? Iskierka ma tylko jeden klocek od baterii i musi podzielić go na pół: połowę oddaje w pierwszej żarówce, połowę w drugiej. To połączenie <b>szeregowe</b>. Jeśli jedna żarówka się przepali, tor się przerywa i gasną obie.',
    },
    {
      id: 'm6', emoji: '☀️', title: 'Jasno jak w dzień',
      intro: 'A teraz zapal dwie żarówki jedną baterią tak, żeby OBIE świeciły jasno! Podpowiem: każda żarówka potrzebuje własnego toru.',
      hint: 'Zbuduj dwie osobne pętle obok siebie, jak drabinkę: każda żarówka łączy się osobno z plusem i z minusem baterii.',
      setup: [el('battery', [2, 4], [2, 3])],
      tray: { bulb: 2, wire: 99 },
      checks: [{ t: 'Obie żarówki świecą jasno', f: c => of(c, 'bulb').length >= 2 && of(c, 'bulb').every(p => on(c, p) && Math.abs(c.res.pieces[p.id].vd) > 1.2) }],
      explain: 'Teraz tor się rozwidla jak autostrada na dwa pasy. Każda iskierka jedzie tylko przez jedną żarówkę i oddaje tam cały swój klocek, więc obie świecą jasno. To połączenie <b>równoległe</b> – tak są podłączone lampy w domu. Uwaga: bateria musi wypuścić dwa razy więcej iskierek, więc szybciej się zużyje.',
    },
    {
      id: 'm7', emoji: '🔔', title: 'Dzwonek do drzwi',
      intro: 'Ding-dong! Zbuduj dzwonek do drzwi: brzęczyk ma brzęczeć tylko wtedy, gdy ktoś trzyma przycisk.',
      hint: 'Wstaw przycisk w dziurę na górnym torze i dokończ tor kablem. Przycisk działa tylko, dopóki go trzymasz – przytrzymaj go palcem albo myszką.',
      setup: [el('battery', [3, 4], [3, 3]), el('buzzer', [7, 3], [7, 4]), ...wires([[3, 4], [7, 4]]), ...wires([[3, 3], [4, 3]])],
      tray: { button: 1, wire: 99 },
      checks: [
        { t: 'Przytrzymaj przycisk – dzwoni!', sticky: true, f: c => of(c, 'button').some(b => b.on) && of(c, 'buzzer').some(p => on(c, p)) },
        { t: 'Puść przycisk – cisza', sticky: true, after: 0, f: c => of(c, 'button').length > 0 && of(c, 'button').every(b => !b.on) && !of(c, 'buzzer').some(p => on(c, p)) },
      ],
      explain: 'Przycisk to mostek, który trzeba przytrzymać. Puszczasz – sprężynka go podnosi i wyścig staje. Dlatego dzwonek dzwoni tylko, gdy ktoś naciska. Brzęczyk w środku ma blaszkę, która drży bardzo szybko, kiedy przejeżdżają przez niego iskierki: BZZZ!',
    },
    {
      id: 'm8', emoji: '🔴', title: 'Magiczna dioda',
      intro: 'Dioda LED to wybredny element: przepuszcza iskierki tylko w jedną stronę, potrzebuje dużych klocków i łatwo ją przepalić. Zapal ją tak, żeby się nie spaliła!',
      hint: 'Trzy sekrety diody: 1) plus (+) diody musi prowadzić do plusa baterii – inaczej odwróć diodę, 2) jedna bateria to za mało, potrzebne są dwie, 3) wstaw opornik, który spowolni wyścig i ochroni diodę.',
      setup: [el('battery', [2, 4], [2, 3]), el('led', [7, 4], [7, 3])],
      tray: { battery: 2, resistor: 1, wire: 99 },
      checks: [{ t: 'Dioda świeci i jest cała', f: c => of(c, 'led').some(p => on(c, p)) }],
      explain: 'Dioda to <b>bramka w jedną stronę</b>: wpuszcza iskierki tylko od plusa do minusa. Żeby przez nią przejść, iskierka potrzebuje klocka większego niż jedna bateria, a <b>opornik</b> to wąska ścieżka, która robi mały korek – iskierek jedzie mniej, więc dioda się nie przegrzewa. Diody świecą jasno i zużywają mało energii.',
    },
    {
      id: 'm9', emoji: '🔐', title: 'Sejf z dwoma kluczami',
      intro: 'Zbuduj alarm skarbca! Lampka ma się zapalić TYLKO wtedy, gdy włączone są OBA wyłączniki naraz. Jeden nie wystarczy.',
      hint: 'Postaw oba wyłączniki na tym samym torze, jeden za drugim. Wtedy iskierki muszą przejechać przez oba mosty.',
      setup: [el('battery', [3, 4], [3, 3]), el('bulb', [8, 3], [8, 4]), ...wires([[3, 4], [8, 4]])],
      tray: { switch: 2, wire: 99 },
      checks: [
        { t: 'Oba wyłączniki włączone – świeci', sticky: true, f: c => of(c, 'switch').length === 2 && of(c, 'switch').every(s => s.on) && of(c, 'bulb').some(p => on(c, p)) },
        { t: 'Każdy wyłącznik sam gasi lampkę', f: c => of(c, 'switch').length === 2 && C.combos(c.pieces, (r, ov, ins) => Object.values(r.pieces).some(x => x.on && x.glow !== undefined) === ins.every(i => ov[i.id])).every(Boolean) },
      ],
      explain: 'Dwa mosty zwodzone jeden za drugim: iskierka przejedzie tylko wtedy, gdy opuszczone są oba. Informatycy nazywają to bramką <b>I</b> (po angielsku AND). Tak działają maszyny, które ruszają dopiero po wciśnięciu dwóch przycisków naraz – żeby nikt nie włożył ręki tam, gdzie nie trzeba.',
    },
    {
      id: 'm10', emoji: '🚪', title: 'Dom z dwojgiem drzwi',
      intro: 'Dom ma drzwi z przodu i z tyłu. Zrób jeden dzwonek, który zadzwoni z KAŻDEGO z dwóch przycisków.',
      hint: 'Postaw przyciski obok siebie na dwóch równoległych torach, jak dwa mostki nad rzeką. Iskierki mogą przejechać jednym albo drugim.',
      setup: [el('battery', [2, 4], [2, 3]), el('buzzer', [8, 3], [8, 4]), ...wires([[2, 4], [8, 4]])],
      tray: { button: 2, wire: 99 },
      checks: [
        { t: 'Każdy przycisk osobno włącza dzwonek', f: c => of(c, 'button').length === 2 && C.combos(c.pieces, (r, ov, ins) => Object.values(r.pieces).some(x => x.on && x.level !== undefined) === ins.some(i => ov[i.id])).every(Boolean) },
        { t: 'Zadzwoń!', sticky: true, f: c => of(c, 'button').some(b => b.on) && of(c, 'buzzer').some(p => on(c, p)) },
      ],
      explain: 'Dwie drogi obok siebie: wystarczy, że jedna jest otwarta, i iskierki już jadą. To bramka <b>LUB</b> (po angielsku OR). Tak działa światło na klatce schodowej, które włączysz z każdego piętra.',
    },
    {
      id: 'm11', emoji: '⚠️', title: 'Uwaga, zwarcie!',
      intro: 'Ojej! Ktoś zrobił skrót w torze. Iskierki pędzą na skróty, omijają żarówkę, a bateria robi się gorąca! Znajdź ten skrót i go usuń.',
      hint: 'Szukaj kabla, który łączy górny tor z dolnym z pominięciem żarówki. Wybierz „Gumkę” i dotknij go.',
      setup: [el('battery', [3, 4], [3, 3]), el('bulb', [8, 3], [8, 4]), ...wires([[3, 3], [8, 3]]), ...wires([[3, 4], [8, 4]]), el('wire', [5, 3], [5, 4], { locked: false, color: 1 })],
      tray: { wire: 99 },
      checks: [
        { t: 'Bateria się nie grzeje (nie ma zwarcia)', f: c => !c.res.short },
        { t: 'Żarówka świeci', f: c => of(c, 'bulb').some(p => on(c, p)) },
      ],
      explain: '<b>Zwarcie</b> to tor bez żadnej przeszkody: iskierki pędzą jak szalone prosto z plusa do minusa, a bateria bardzo się grzeje. W prawdziwym życiu zwarcie może przypalić kable, a nawet wywołać pożar. Dlatego: nigdy nie łącz biegunów baterii samym drutem i <b>nigdy nie wkładaj niczego do gniazdka w ścianie</b> – tam czeka prąd tak silny, że jest groźny dla ludzi.',
    },
    {
      id: 'm12', emoji: '🏠', title: 'Wielki finał: Domek',
      intro: 'Ostatnia misja! Zrób instalację w domku: lampka z własnym wyłącznikiem, wiatrak z własnym wyłącznikiem i dzwonek z przyciskiem. Każde urządzenie ma działać osobno.',
      hint: 'Zrób trzy „szczebelki drabinki” między górnym a dolnym torem. Na każdym szczebelku: urządzenie i jego włącznik. Plus baterii u góry, minus na dole.',
      setup: [el('battery', [1, 5], [1, 4]), el('battery', [1, 4], [1, 3])],
      tray: { bulb: 1, motor: 1, buzzer: 1, switch: 2, button: 1, wire: 99 },
      checks: [
        { t: 'Lampka ma swój wyłącznik', f: c => ownControl(c, 'bulb') },
        { t: 'Wiatrak ma swój wyłącznik', f: c => ownControl(c, 'motor') },
        { t: 'Dzwonek ma swój przycisk', f: c => ownControl(c, 'buzzer') },
        { t: 'Wszystko działa naraz', sticky: true, f: c => ['bulb', 'motor', 'buzzer'].every(t => of(c, t).some(p => on(c, p))) },
      ],
      explain: 'Tak wygląda prawdziwa instalacja elektryczna: wszystkie urządzenia są podłączone <b>równolegle</b> do jednego źródła, a każde ma własny włącznik na swoim torze. Dlatego możesz zgasić lampę w kuchni, a lodówka dalej chłodzi. Zostajesz Mistrzem Iskrolandii!',
    },
  ];

  // ---------- odznaki (odkrycia w zabawie) ----------
  Iskry.BADGES = [
    { id: 'light', e: '💡', t: 'Pierwsze światło', d: 'Zapal żarówkę.' },
    { id: 'stacks', e: '🧱', t: 'Budowniczy', d: 'Włącz wieże klocków napięcia.' },
    { id: 'reverse', e: '🔄', t: 'Wsteczny bieg', d: 'Zakręć silniczkiem w obie strony.' },
    { id: 'short', e: '🕵️', t: 'Detektyw zwarć', d: 'Zrób w Iskrolandii zwarcie (tylko tutaj!).' },
    { id: 'burn', e: '💥', t: 'Pyk!', d: 'Przepal żarówkę albo diodę (potem ją napraw).' },
    { id: 'five', e: '🌟', t: 'Iluminacja', d: 'Zapal 5 żarówek naraz.' },
    { id: 'rainbow', e: '🌈', t: 'Tęcza', d: 'Zapal naraz 3 diody w różnych kolorach.' },
    { id: 'orchestra', e: '🎺', t: 'Orkiestra', d: 'Żarówka, silniczek i brzęczyk działają naraz.' },
    { id: 'tower', e: '🗼', t: 'Wieża mocy', d: 'Zbuduj napięcie 4 klocków (4 baterie w rzędzie).' },
    { id: 'master', e: '🏆', t: 'Mistrz Iskrolandii', d: 'Ukończ wszystkie misje.' },
  ];

  Iskry.THEMES = [
    { id: 'klasyczny', name: 'Klasyczny', stars: 0, board: 0x3d7bfd, mat: 0xeaf2ff, bg: 'linear-gradient(180deg,#bfe3ff 0%,#e9f6ff 55%,#fff6e2 100%)' },
    { id: 'sloneczny', name: 'Słoneczny', stars: 4, board: 0xffa41b, mat: 0xfff7e0, bg: 'linear-gradient(180deg,#ffe29a 0%,#fff1c9 50%,#ffd3e3 100%)' },
    { id: 'dzungla', name: 'Dżungla', stars: 10, board: 0x25a55f, mat: 0xeafbe6, bg: 'linear-gradient(180deg,#a8eec0 0%,#e3fbd8 55%,#fff6cf 100%)' },
    { id: 'cukierkowy', name: 'Cukierkowy', stars: 18, board: 0xff5fae, mat: 0xfff0f8, bg: 'linear-gradient(180deg,#ffc9e8 0%,#f3dcff 55%,#d6e4ff 100%)' },
    { id: 'kosmiczny', name: 'Kosmiczny', stars: 26, board: 0x5b3df5, mat: 0xd9dcff, bg: 'radial-gradient(ellipse at 50% 0%,#3b2b8f 0%,#171a45 55%,#0b0d24 100%)', dark: true },
  ];

  // ---------- lekcje: metafory w obrazkach ----------
  const loop = 'M60,40 H300 a30,30 0 0 1 30,30 V130 a30,30 0 0 1 -30,30 H60 a30,30 0 0 1 -30,-30 V70 a30,30 0 0 1 30,-30 Z';
  const dots = (path, n, dur, size, color, extra) => Array.from({ length: n }, (_, i) =>
    `<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${size * 0.2}" fill="${color}" stroke="#7a4a00" stroke-width="1.5"><animateMotion dur="${dur}s" repeatCount="indefinite" begin="-${(dur * i) / n}s" path="${path}" ${extra || ''}/></rect>`).join('');
  const battery = (x, y) => `<g transform="translate(${x},${y})"><rect x="-16" y="-34" width="32" height="68" rx="8" fill="#3a6df0"/><rect x="-16" y="-34" width="32" height="22" rx="8" fill="#ff9f1c"/><rect x="-7" y="-41" width="14" height="8" rx="2" fill="#f5c451"/><text x="0" y="-16" font-size="16" text-anchor="middle" fill="#fff" font-weight="900">+</text><text x="0" y="26" font-size="18" text-anchor="middle" fill="#fff" font-weight="900">−</text></g>`;
  const bulb = (x, y, g) => `<g transform="translate(${x},${y})"><circle r="${22}" fill="${g ? '#fff3a8' : '#eef'}" stroke="#c9a640" stroke-width="2"/>${g ? '<circle r="34" fill="#ffd23f" opacity=".25"><animate attributeName="r" values="30;38;30" dur="1.2s" repeatCount="indefinite"/></circle>' : ''}<path d="M-8,4 q4,-12 8,0 q4,12 8,0" fill="none" stroke="#c77" stroke-width="2"/><rect x="-10" y="20" width="20" height="12" rx="3" fill="#2f9e6e"/></g>`;

  Iskry.LESSONS = [
    {
      title: 'Obwód to tor wyścigowy',
      svg: `<path d="${loop}" fill="none" stroke="#c9d6ea" stroke-width="22" stroke-linejoin="round"/><path d="${loop}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="8 10"/>${dots(loop, 9, 6, 14, '#ffe14d')}${battery(30, 100)}${bulb(330, 100, true)}`,
      text: 'Iskierki prądu ścigają się po zamkniętym torze: wyjeżdżają z plusa baterii, przejeżdżają przez żarówkę i wracają do minusa. Tor musi być <b>zamknięty</b> – wystarczy jedna dziura i cały wyścig staje.',
    },
    {
      title: 'Prąd = ile iskierek przejeżdża',
      svg: `<text x="20" y="45" font-size="15" font-weight="800" fill="#555">mały prąd</text><path d="M20,70 H340" stroke="#c9d6ea" stroke-width="20"/>${dots('M20,70 H340', 3, 5, 14, '#ffe14d')}<text x="20" y="125" font-size="15" font-weight="800" fill="#555">duży prąd</text><path d="M20,150 H340" stroke="#c9d6ea" stroke-width="20"/>${dots('M20,150 H340', 10, 1.6, 14, '#ffe14d')}<rect x="300" y="55" width="8" height="30" fill="#333"/><rect x="300" y="135" width="8" height="30" fill="#333"/>`,
      text: '<b>Prąd</b> to wyścig: liczymy, ile iskierek przejeżdża przez metę w ciągu sekundy. Im więcej i im szybciej – tym większy prąd. W Iskrolandii widać to po prędkości kosteczek na kablach. Fizycy mierzą prąd w <b>amperach (A)</b>.',
    },
    {
      title: 'Napięcie = wielkość klocka',
      svg: `${battery(40, 60)}<path d="M70,60 H340" stroke="#c9d6ea" stroke-width="26"/>${dots('M70,60 H340', 5, 4, 14, '#ffe14d')}${battery(26, 150)}${battery(56, 150)}<path d="M86,150 H340" stroke="#c9d6ea" stroke-width="36"/>${dots('M86,150 H340', 5, 4, 26, '#ff9f1c')}<text x="220" y="30" font-size="15" font-weight="800" fill="#555">1 bateria = 1 klocek</text><text x="200" y="118" font-size="15" font-weight="800" fill="#555">2 baterie = 2 klocki</text>`,
      text: 'Bateria jest jak winda: każda iskierka, która przez nią przejedzie, dostaje <b>klocek energii</b>. Dwie baterie jedna za drugą dają dwa razy większy klocek. Wielkość klocka to <b>napięcie</b> – mierzy się je w <b>woltach (V)</b>. Jedna bateria AA to 1,5 V.',
    },
    {
      title: 'Żarówka zabiera klocki',
      svg: `${bulb(180, 70, true)}<path d="M20,140 H340" stroke="#c9d6ea" stroke-width="30"/>${Array.from({ length: 6 }, (_, i) => `<rect x="-11" y="-11" width="22" height="22" rx="4" fill="#ff9f1c" stroke="#7a4a00" stroke-width="1.5"><animateMotion dur="4s" repeatCount="indefinite" begin="-${i * 0.66}s" path="M20,140 H340"/><animateTransform attributeName="transform" type="scale" values="1;1;.35;.35" keyTimes="0;.45;.55;1" dur="4s" begin="-${i * 0.66}s" repeatCount="indefinite" additive="sum"/></rect>`).join('')}<path d="M180,100 V125" stroke="#c9a640" stroke-width="3" stroke-dasharray="4 4"/>`,
      text: 'Kiedy iskierka przejeżdża przez żarówkę, silniczek albo brzęczyk, <b>oddaje swój klocek</b>. Z tej energii robi się światło, ruch albo dźwięk. Iskierki nie znikają – wracają do baterii pustymi wózkami po nowe klocki.',
    },
    {
      title: 'Opór = wąska ścieżka',
      svg: `<path d="M20,100 H130 L160,88 H220 L250,100 H340" fill="none" stroke="#c9d6ea" stroke-width="40" stroke-linejoin="round"/><rect x="150" y="84" width="80" height="32" rx="10" fill="#e8c99b"/><rect x="170" y="84" width="7" height="32" fill="#2ecc71"/><rect x="190" y="84" width="7" height="32" fill="#222"/><rect x="210" y="84" width="7" height="32" fill="#d4af37"/>${dots('M20,100 H340', 8, 6, 14, '#ffe14d', 'keyPoints="0;0.38;0.62;1" keyTimes="0;0.15;0.85;1" calcMode="linear"')}`,
      text: '<b>Opornik</b> to wąska, wyboista ścieżka. Iskierki tłoczą się i jadą wolniej, więc prąd jest mniejszy – jak korek na drodze. Opór chroni delikatne elementy, na przykład diody. Mierzy się go w <b>omach (Ω)</b>.',
    },
    {
      title: 'Jedna za drugą czy obok siebie?',
      svg: `<text x="20" y="28" font-size="14" font-weight="800" fill="#555">szeregowo: dzielą się klockiem</text>${bulb(120, 62, false)}${bulb(220, 62, false)}<circle cx="120" cy="62" r="16" fill="#ffe680" opacity=".7"/><circle cx="220" cy="62" r="16" fill="#ffe680" opacity=".7"/><text x="20" y="122" font-size="14" font-weight="800" fill="#555">równolegle: każda ma swój tor</text>${bulb(120, 160, true)}${bulb(220, 160, true)}`,
      text: '<b>Szeregowo</b> (jedna za drugą): iskierka dzieli klocek na pół, więc obie żarówki świecą słabiej. <b>Równolegle</b> (obok siebie): każda żarówka ma własny tor i dostaje cały klocek, więc obie świecą jasno.',
    },
    {
      title: 'Dioda = bramka w jedną stronę',
      svg: `<path d="M20,70 H340" stroke="#c9d6ea" stroke-width="24"/><path d="M160,52 L200,70 L160,88 Z" fill="#a66cff"/><rect x="200" y="52" width="6" height="36" fill="#a66cff"/>${dots('M20,70 H340', 6, 4, 14, '#ffe14d')}<path d="M20,150 H340" stroke="#c9d6ea" stroke-width="24"/><path d="M200,132 L160,150 L200,168 Z" fill="#a66cff"/><rect x="154" y="132" width="6" height="36" fill="#a66cff"/>${dots('M20,150 H150', 3, 3, 14, '#ffe14d')}<text x="250" y="190" font-size="14" font-weight="800" fill="#e44">stop!</text>`,
      text: '<b>Dioda</b> przepuszcza iskierki tylko w jedną stronę – zgodnie ze strzałką, od plusa do minusa. Odwrócona nie wpuści nikogo. Dioda świecąca (LED) potrzebuje większego klocka niż jedna bateria i opornika do ochrony.',
    },
    {
      title: 'Zwarcie i bezpieczeństwo',
      svg: `${battery(40, 100)}<path d="M40,58 V30 H200 V170 H40 V142" fill="none" stroke="#ffb3b3" stroke-width="16"/>${dots('M40,58 V30 H200 V170 H40 V142', 12, 0.9, 12, '#ff4d5e')}<text x="230" y="70" font-size="40">🔥</text><text x="230" y="130" font-size="40">🔌</text><path d="M228,95 L290,145 M290,95 L228,145" stroke="#e33" stroke-width="7" stroke-linecap="round"/>`,
      text: '<b>Zwarcie</b> to tor bez żadnej przeszkody. Iskierki pędzą jak szalone, a bateria robi się gorąca. Zasady prawdziwego elektryka: bawimy się tylko bateriami, <b>nigdy nie dotykamy gniazdka w ścianie</b>, nie bierzemy do ręki kabli z uszkodzoną izolacją i nie łączymy plusa z minusem samym drutem.',
    },
  ];

  Iskry.INFO = {
    wire: 'Kabel to szeroka autostrada dla iskierek – prawie nic ich nie spowalnia.',
    battery: 'Bateria to winda dla iskierek: na plusie (+) każda dostaje klocek energii. 1 bateria = 1 klocek (1,5 V).',
    bulb: 'Żarówka: iskierki przeciskają się przez cieniutki drucik i oddają mu klocki. Drucik robi się gorący i świeci!',
    motor: 'Silniczek zamienia klocki iskierek w kręcenie. Odwróć baterię, a zakręci się w drugą stronę!',
    switch: 'Wyłącznik to most zwodzony na torze. Dźwignia w górze – most podniesiony, iskierki stoją. Dźwignia na dole – jadą! Dotknij, żeby przełączyć.',
    button: 'Przycisk działa tylko, kiedy go trzymasz – jak dzwonek do drzwi.',
    led: 'Dioda LED przepuszcza iskierki tylko w jedną stronę (od + do −). Potrzebuje 2 baterii i opornika, żeby się nie przepalić.',
    buzzer: 'Brzęczyk robi BZZZ, kiedy przejeżdżają przez niego iskierki.',
    resistor: 'Opornik to wąska ścieżka – robi się korek i iskierki jadą wolniej. Chroni delikatne diody.',
  };
})();
