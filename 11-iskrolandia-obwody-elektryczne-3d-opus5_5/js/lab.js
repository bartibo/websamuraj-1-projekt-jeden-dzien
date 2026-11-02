// Laboratorium: eksperymenty „Zgadnij – sprawdź – zrozum” i zagadki Wolcika z obwodu dziecka
window.Iskry = window.Iskry || {};
(function () {
  const C = Iskry.circuit;
  const L = Iskry.lab = {};
  const N = (c, r) => C.node(c, r);
  const el = (type, from, to, extra) => Object.assign({ type, a: N(from[0], from[1]), b: N(to[0], to[1]), locked: true }, extra || {});
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
  const copy = list => list.map(p => Object.assign({}, p));

  // ---------- pomiar i porównanie „przed” i „po” ----------
  L.kindOf = p => (p.type === 'led' ? 'bulb' : p.type);
  L.measure = function (p, r) {
    if (!p || !r) return { on: false, v: 0 };
    switch (p.type) {
      case 'bulb': case 'led': return { on: !!r.on && !p.burnt, v: p.burnt ? 0 : r.glow };
      case 'motor': return { on: !!r.on, v: r.on ? r.speed : 0 };
      case 'buzzer': return { on: !!r.on, v: r.on ? r.level : 0 };
      default: return { on: Math.abs(r.I) > 1e-3, v: Math.abs(r.I) };
    }
  };
  function ratio(b, a) { return Math.abs(a) / Math.max(1e-9, Math.abs(b)); }
  L.classify = function (kind, b, a) {
    if (kind === 'battery') { const q = ratio(b.v, a.v); return q > 1.15 ? 'more' : q < 0.85 ? 'less' : 'same'; }
    if (!b.on) return a.on ? 'on' : 'stay';
    if (!a.on) return 'off';
    if (kind === 'motor' && Math.sign(a.v) !== Math.sign(b.v)) return 'reverse';
    const q = ratio(b.v, a.v);
    return q > 1.18 ? 'up' : q < 0.82 ? 'down' : 'same';
  };
  // wynik „na granicy” – takich zagadek nie zadajemy
  L.fuzzy = function (kind, b, a) {
    if (!b.on || !a.on) return false;
    const q = ratio(b.v, a.v);
    return (q > 0.82 && q < 0.93) || (q > 1.08 && q < 1.18);
  };

  const OPT = {
    bulb: { off: ['⚫', 'zgaśnie'], down: ['🔅', 'ciemniej'], up: ['🔆', 'jaśniej'], same: ['⚖️', 'tak samo'] },
    motor: { off: ['⏹️', 'stanie'], down: ['🐢', 'wolniej'], up: ['🚀', 'szybciej'], reverse: ['🔄', 'w drugą stronę'], same: ['⚖️', 'tak samo'] },
    buzzer: { off: ['🤫', 'ucichnie'], down: ['🔉', 'ciszej'], up: ['🔊', 'głośniej'], same: ['⚖️', 'tak samo'] },
    battery: { less: ['📉', 'mniej iskierek'], more: ['📈', 'więcej iskierek'], same: ['⚖️', 'tyle samo'] },
    offOn: { on: ['💡', 'zacznie działać'], stay: ['🌑', 'dalej nic'] },
    cmpI: { more: ['📈', 'więcej'], less: ['📉', 'mniej'], same: ['⚖️', 'tyle samo'], zero: ['0️⃣', 'zero – żarówka je zjadła'] },
    cmpV: { same: ['⚖️', 'tyle samo'], less: ['📉', 'mniej'], more: ['📈', 'więcej'] },
  };
  L.options = function (pz) {
    const set = pz.kind === 'cmpI' || pz.kind === 'cmpV' ? OPT[pz.kind] : !pz.before.on && pz.kind !== 'battery' ? OPT.offOn : OPT[pz.kind];
    return Object.entries(set).map(([k, [e, t]]) => ({ k, e, t }));
  };
  L.label = (pz, k) => { const o = L.options(pz).find(x => x.k === k); return o ? o.e + ' ' + o.t : k; };

  // ---------- ruchy ----------
  L.apply = function (pieces, mv) {
    const out = copy(pieces);
    const f = id => out.find(p => p.id === id);
    if (mv.do === 'remove') return out.filter(p => p.id !== mv.id);
    if (mv.do === 'toggle') f(mv.id).on = !f(mv.id).on;
    if (mv.do === 'flip') { const p = f(mv.id); const t = p.a; p.a = p.b; p.b = t; }
    if (mv.do === 'dial') f(mv.id).val = mv.to;
    if (mv.do === 'add') {
      const k = C.edgeKey(mv.a, mv.b);
      const rest = out.filter(p => C.edgeKey(p.a, p.b) !== k);
      rest.push({ id: 'tmp', type: mv.type, a: mv.a, b: mv.b, on: false, burnt: false, color: 0 });
      return rest;
    }
    return out;
  };
  // czy dziecko już zrobiło ruch na planszy
  L.done = function (pieces, mv) {
    const p = pieces.find(x => x.id === mv.id);
    switch (mv.do) {
      case 'remove': return !p;
      case 'toggle': return !!p && !!p.on !== !!mv.from;
      case 'flip': return !!p && p.a === mv.b0; // b0 = dawny koniec b
      case 'dial': return !!p && Math.abs((p.val || 0) - mv.from) >= 0.5;
      case 'add': return pieces.some(x => x.type === mv.type && C.edgeKey(x.a, x.b) === C.edgeKey(mv.a, mv.b));
    }
    return false;
  };

  // ---------- teksty ----------
  const INS = { bulb: 'żarówką', led: 'diodą', motor: 'silniczkiem', buzzer: 'brzęczykiem', battery: 'baterią' };
  const ACC = { bulb: 'żarówkę', led: 'diodę', motor: 'silniczek', buzzer: 'brzęczyk', battery: 'baterię', switch: 'wyłącznik', resistor: 'opornik', dimmer: 'ściemniacz', wire: 'kabel', button: 'przycisk', tester: 'stolik badacza' };
  L.ACC = ACC;
  function movePhrase(mv, p) {
    const o = '<span class="mk mk-o">pomarańczowej ramce</span>';
    switch (mv.do) {
      case 'remove': return `zabierzesz ${ACC[p.type]} w ${o}`;
      case 'toggle': return `${p.on ? 'wyłączysz' : 'włączysz'} wyłącznik w ${o}`;
      case 'flip': return `odwrócisz ${ACC[p.type]} w ${o}`;
      case 'dial': return 'przekręcisz ściemniacz do końca';
      case 'add': return mv.type === 'wire' ? `połączysz kablem kropki w <span class="mk mk-g">zielonym miejscu</span>` : `dołożysz ${ACC[mv.type]} w <span class="mk mk-g">zielonym miejscu</span>`;
    }
    return '';
  }
  L.question = function (pz, pieces) {
    if (pz.ask) return pz.ask;
    const t = pieces.find(p => p.id === pz.target);
    const m = pieces.find(p => p.id === pz.move.id) || {};
    const many = pieces.filter(p => p.type === t.type).length > 1;
    const who = t.type === 'battery' ? 'baterią – ile iskierek wypuści' : INS[t.type] + (many ? ' w <span class="mk mk-b">niebieskiej ramce</span>' : '');
    return `Co się stanie z ${who}, jeśli ${movePhrase(pz.move, m)}?`;
  };
  L.task = function (mv, pieces) {
    const p = pieces.find(x => x.id === mv.id) || {};
    switch (mv.do) {
      case 'remove': return 'Wybierz 🧽 <b>Gumkę</b> i dotknij elementu w pomarańczowej ramce.';
      case 'toggle': return 'Dotknij <b>wyłącznika</b> w pomarańczowej ramce.';
      case 'flip': return `Dotknij ${p.type === 'led' ? 'diody' : p.type === 'motor' ? 'silniczka' : 'baterii'} w pomarańczowej ramce i wybierz <b>⇄ Odwróć</b>.`;
      case 'dial': return 'Dotknij <b>ściemniacza</b> i przesuń suwak do końca.';
      case 'add': return mv.type === 'wire' ? 'Narysuj <b>kabel</b> w zielonym miejscu.' : `Postaw <b>${ACC[mv.type]}</b> w zielonym miejscu.`;
      case 'inspect': return 'Dotknij <b>kabla w niebieskiej ramce</b> i przeczytaj licznik.';
    }
    return '';
  };
  L.tool = mv => (mv.do === 'remove' ? 'erase' : mv.do === 'add' ? mv.type : 'hand');

  // ---------- zagadka z obwodu dziecka ----------
  const DEV = ['bulb', 'motor', 'buzzer', 'led'];
  L.generate = function (pieces, res, recent) {
    const cands = [];
    const devs = pieces.filter(p => DEV.includes(p.type) && !p.burnt);
    const consider = (mv, targets) => {
      const after = C.solve(L.apply(pieces, mv));
      for (const t of targets) {
        if (t.id === mv.id) continue;
        const kind = L.kindOf(t);
        const b = L.measure(t, res.pieces[t.id]);
        const a = L.measure(t, after.pieces[t.id]);
        // bez oczywistości: urządzenie, które nie działa, i tak nie zgaśnie po wyłączeniu
        if (kind !== 'battery' && !b.on && !(mv.do === 'toggle' && !mv.from)) continue;
        if (L.fuzzy(kind, b, a)) continue;
        if (Object.values(after.pieces).some(x => x.burnNow) || after.short) continue;
        const out = L.classify(kind, b, a);
        const key = mv.do + mv.id + '>' + t.id;
        if ((recent || []).includes(key)) continue;
        // zaskoczenia („tak samo”, „jaśniej”, „w drugą stronę”) ważą więcej
        const w = { same: 2, up: 2, reverse: 2, on: 1.5, more: 1.5, off: 1.5, down: 1.5, stay: 1, less: 1.5 }[out] || 1;
        cands.push({ move: mv, target: t.id, kind, before: b, answer: out, key, w });
      }
    };
    for (const p of pieces) {
      if (p.burnt) continue;
      if (['bulb', 'motor', 'buzzer', 'led', 'resistor', 'dimmer'].includes(p.type) && !p.locked) consider({ do: 'remove', id: p.id }, devs);
      if (p.type === 'switch') consider({ do: 'toggle', id: p.id, from: p.on }, devs);
      if (p.type === 'battery' && Math.abs(res.pieces[p.id].I) > 1e-3) consider({ do: 'flip', id: p.id, b0: p.b }, devs);
      if (p.type === 'wire' && !p.locked && Math.abs(res.pieces[p.id].I) > 1e-3 && Math.random() < 0.35) consider({ do: 'remove', id: p.id }, devs);
    }
    // ile iskierek wypuszcza bateria
    const bats = pieces.filter(p => p.type === 'battery' && Math.abs(res.pieces[p.id].I) > 1e-3);
    if (bats.length) for (const d of devs.filter(d => !d.locked && Math.abs(res.pieces[d.id].I) > 1e-3)) consider({ do: 'remove', id: d.id }, [bats[0]]);
    if (!cands.length) return null;
    // najpierw rodzaj wyniku (żeby nie było ciągle „tak samo”), potem konkretna zagadka
    const groups = {};
    cands.forEach(c => (groups[c.answer] = groups[c.answer] || []).push(c));
    const keys = Object.keys(groups);
    let sum = keys.reduce((s, k) => s + groups[k][0].w, 0), x = Math.random() * sum;
    const k = keys.find(k => (x -= groups[k][0].w) <= 0) || keys[0];
    return groups[k][Math.floor(Math.random() * groups[k].length)];
  };

  // ---------- eksperymenty ----------
  // tagi w setup: t = obserwowany, m = ten, który zmieniamy, r = punkt odniesienia
  L.EXPERIMENTS = [
    {
      id: 'e1', mission: 'm1', emoji: '🕳️', title: 'Dziura w torze', lesson: 0,
      setup: [el('battery', [3, 4], [3, 3]), el('bulb', [7, 3], [7, 4], { tag: 't' }), ...wires([[3, 3], [5, 3]]), el('wire', [5, 3], [6, 3], { tag: 'm', locked: false }), ...wires([[6, 3], [7, 3]]), ...wires([[3, 4], [7, 4]])],
      move: { do: 'remove' },
      explain: 'Iskierki ścigają się tylko po <b>zamkniętej pętli</b>. Wystarczy jedna dziura – nawet daleko od żarówki – i cały wyścig staje. Dlatego żarówka gaśnie, choć jej nie dotykałeś.',
    },
    {
      id: 'e2', emoji: '🏁', title: 'Czy żarówka zjada iskierki?', lesson: 1, kind: 'cmpI',
      setup: [el('battery', [3, 4], [3, 3]), el('bulb', [7, 3], [7, 4]), ...wires([[3, 3], [6, 3]]), el('wire', [6, 3], [7, 3], { tag: 'r' }), ...wires([[3, 4], [6, 4]]), el('wire', [6, 4], [7, 4], { tag: 't' })],
      ask: 'Kablem <b>przed żarówką</b> (<span class="mk mk-y">żółta ramka</span>) jedzie <b>{ref}</b>. A ile iskierek pojedzie kablem <b>za żarówką</b> (<span class="mk mk-b">niebieska ramka</span>)?',
      move: { do: 'inspect' },
      explain: 'Tyle samo! Iskierki <b>nie znikają</b> w żarówce – zostawiają w niej tylko swoje klocki energii i wracają do baterii pustymi wózkami. Prąd jest taki sam w każdym miejscu jednego toru.',
    },
    {
      id: 'e3', mission: 'm4', emoji: '🔋', title: 'Druga bateria', lesson: 2,
      setup: [el('battery', [3, 5], [3, 4]), el('wire', [3, 4], [3, 3], { locked: false }), ...wires([[3, 3], [7, 3]]), el('bulb', [7, 3], [7, 4], { tag: 't' }), ...wires([[7, 4], [7, 5]]), ...wires([[3, 5], [7, 5]])],
      move: { do: 'add', type: 'battery', a: N(3, 4), b: N(3, 3) },
      explain: 'Druga bateria jedna za drugą to druga winda: każda iskierka dostaje <b>dwa klocki</b> zamiast jednego. Większe klocki to większe <b>napięcie</b>, więc żarówka świeci jaśniej.',
    },
    {
      id: 'e4', emoji: '🧱', title: 'Klocki przed i za żarówką', lesson: 3, kind: 'cmpV', stacks: true,
      setup: [el('battery', [3, 4], [3, 3]), el('bulb', [7, 3], [7, 4]), ...wires([[3, 3], [6, 3]]), el('wire', [6, 3], [7, 3], { tag: 'r' }), ...wires([[3, 4], [6, 4]]), el('wire', [6, 4], [7, 4], { tag: 't' })],
      ask: 'Przed żarówką (<span class="mk mk-y">żółta ramka</span>) każda iskierka wiezie <b>{ref}</b>. Ile klocków ma <b>za żarówką</b> (<span class="mk mk-b">niebieska ramka</span>)?',
      move: { do: 'inspect' },
      explain: 'Za żarówką wieże są <b>płaskie</b>: iskierki oddały klocki drucikowi i z tej energii zrobiło się światło. Napięcie to właśnie różnica wysokości wież przed i za elementem.',
    },
    {
      id: 'e5', emoji: '🎛️', title: 'Ściemniacz', lesson: 4,
      setup: [el('battery', [3, 4], [3, 3]), ...wires([[3, 3], [4, 3]]), el('dimmer', [4, 3], [5, 3], { tag: 'm', val: 0 }), ...wires([[5, 3], [7, 3]]), el('bulb', [7, 3], [7, 4], { tag: 't' }), ...wires([[3, 4], [7, 4]])],
      move: { do: 'dial', to: 1 },
      explain: 'Ściemniacz to ścieżka, którą możesz zwężać. Im węższa, tym większy <b>korek</b> (opór): przejeżdża mniej iskierek na sekundę, więc żarówka dostaje mniej energii i przygasa. Tak działają ściemniacze lamp w domu.',
    },
    {
      id: 'e6', mission: 'm5', emoji: '🚃', title: 'Wagonik z pociągu', lesson: 5,
      setup: [el('battery', [2, 4], [2, 3]), ...wires([[2, 3], [3, 3]]), el('bulb', [3, 3], [4, 3], { tag: 'm', locked: false }), ...wires([[4, 3], [6, 3]]), el('bulb', [6, 3], [7, 3], { tag: 't' }), ...wires([[7, 3], [7, 4]]), ...wires([[2, 4], [7, 4]])],
      move: { do: 'remove' },
      explain: 'Żarówki stoją <b>jedna za drugą</b> na jednym torze. Gdy zabierzesz jedną, w torze robi się dziura i druga też gaśnie. Tak działały stare lampki choinkowe: jedna przepalona i ciemno na całej choince!',
    },
    {
      id: 'e7', mission: 'm6', emoji: '🛣️', title: 'Dwa pasy autostrady', lesson: 5,
      setup: [el('battery', [2, 4], [2, 3]), ...wires([[2, 3], [7, 3]]), ...wires([[2, 4], [7, 4]]), el('bulb', [5, 3], [5, 4], { tag: 'm', locked: false }), el('bulb', [7, 3], [7, 4], { tag: 't' })],
      move: { do: 'remove' },
      explain: 'Żarówki są <b>obok siebie</b> – każda ma własny pas. Zamknięcie jednego pasa nie przeszkadza drugiemu, więc druga żarówka świeci tak samo. Tak są podłączone lampy w domu.',
    },
    {
      id: 'e8', mission: 'm8', emoji: '🚦', title: 'Odwrócona dioda', lesson: 6,
      setup: [el('battery', [2, 5], [2, 4]), el('battery', [2, 4], [2, 3]), ...wires([[2, 3], [4, 3]]), el('resistor', [4, 3], [5, 3]), ...wires([[5, 3], [7, 3]]), el('led', [7, 3], [7, 4], { tag: 't', color: 1 }), ...wires([[7, 4], [7, 5]]), ...wires([[2, 5], [7, 5]])],
      move: { do: 'flip', self: true },
      explain: 'Dioda to <b>bramka w jedną stronę</b>. Odwrócona zamyka się przed iskierkami jadącymi od plusa i cały tor staje. Dlatego na diodzie zawsze trzeba sprawdzić, gdzie jest plus.',
    },
    {
      id: 'e9', mission: 'm2', emoji: '🙃', title: 'Odwrócona bateria', lesson: 6,
      setup: [el('battery', [3, 4], [3, 3], { tag: 'm' }), ...wires([[3, 3], [7, 3]]), el('bulb', [7, 3], [7, 4], { tag: 't' }), ...wires([[3, 4], [7, 4]])],
      move: { do: 'flip' },
      explain: 'Świeci tak samo! Iskierki jadą teraz w drugą stronę, ale żarówce to obojętne: drucik grzeje się bez względu na kierunek. Kierunek ma znaczenie tylko dla <b>diody</b> (bramki) i <b>silniczka</b> (kręci się na odwrót).',
    },
    {
      id: 'e10', mission: 'm11', emoji: '⚡', title: 'Skrót obok żarówki', lesson: 7,
      setup: [el('battery', [3, 4], [3, 3]), ...wires([[3, 3], [7, 3]]), el('bulb', [7, 3], [7, 4], { tag: 't' }), ...wires([[3, 4], [7, 4]]), el('wire', [7, 3], [8, 3]), el('wire', [7, 4], [8, 4])],
      move: { do: 'add', type: 'wire', a: N(8, 3), b: N(8, 4) },
      explain: 'Zgasła! Iskierki zawsze wybierają <b>łatwiejszą drogę</b>, a kabel nie ma prawie żadnego oporu. Wszystkie pojechały skrótem, a bateria zaczęła się grzać. To jest <b>zwarcie</b> – w prawdziwym życiu tak się nie robi.',
    },
    {
      id: 'e11', emoji: '🤼', title: 'Baterie przeciw sobie', lesson: 2,
      setup: [el('battery', [3, 5], [3, 4], { tag: 'm' }), el('battery', [3, 4], [3, 3]), ...wires([[3, 3], [7, 3]]), el('bulb', [7, 3], [7, 4], { tag: 't' }), ...wires([[7, 4], [7, 5]]), ...wires([[3, 5], [7, 5]])],
      move: { do: 'flip' },
      explain: 'Jedna bateria pcha iskierki w górę, druga w dół – jak dwie windy jadące w przeciwne strony. Ich klocki się <b>znoszą</b> i nic nie zostaje dla żarówki. Baterie łączymy zawsze plusem do minusa.',
    },
    {
      id: 'e12', emoji: '📈', title: 'Ile iskierek wypuści bateria?', lesson: 5,
      setup: [el('battery', [2, 4], [2, 3], { tag: 't' }), ...wires([[2, 3], [7, 3]]), ...wires([[2, 4], [7, 4]]), el('bulb', [7, 3], [7, 4])],
      move: { do: 'add', type: 'bulb', a: N(5, 3), b: N(5, 4) },
      explain: 'Każda żarówka obok siebie ma własny pas, a każdym pasem jadą iskierki. Bateria musi wypuścić ich <b>dwa razy więcej</b>, więc szybciej się zużyje. Dlatego im więcej lamp włączysz w domu, tym większy rachunek za prąd.',
    },
    {
      id: 'e13', mission: 'm3', emoji: '🌀', title: 'Silniczek i odwrócona bateria', lesson: 2,
      setup: [el('battery', [3, 4], [3, 3], { tag: 'm' }), ...wires([[3, 3], [7, 3]]), el('motor', [7, 3], [7, 4], { tag: 't' }), ...wires([[3, 4], [7, 4]])],
      move: { do: 'flip' },
      explain: 'Iskierki jadą teraz w drugą stronę, więc silniczek <b>kręci się na odwrót</b>. Żarówce kierunek jest obojętny, a silniczkowi nie – tak zabawkowe auta jeżdżą do przodu i do tyłu.',
    },
    {
      id: 'e14', mission: 'm12', emoji: '🏠', title: 'Wyłącznik w pokoju', lesson: 5,
      setup: [el('battery', [2, 4], [2, 3]), ...wires([[2, 3], [2, 2], [7, 2], [7, 3]]), ...wires([[2, 4], [2, 5], [7, 5], [7, 4]]), el('switch', [5, 2], [5, 3], { tag: 'm', on: true }), el('bulb', [5, 3], [5, 4]), el('wire', [5, 4], [5, 5]), el('bulb', [7, 3], [7, 4], { tag: 't' })],
      move: { do: 'toggle' },
      explain: 'Ta żarówka ma <b>własny tor</b>, więc wyłącznik na innym torze jej nie dotyczy. Tak wygląda instalacja w domu: zgaszenie światła w kuchni nie gasi lampy w pokoju.',
    },
  ];

  // Przygotowanie zagadki z eksperymentu (po postawieniu elementów na planszy)
  L.fromExperiment = function (exp, pieces, res) {
    const byTag = t => pieces.find(p => p.tag === t);
    const t = byTag('t');
    const m = exp.move.self ? t : byTag('m');
    const mv = Object.assign({}, exp.move, m ? { id: m.id } : {});
    if (mv.do === 'toggle') mv.from = m.on;
    if (mv.do === 'flip') mv.b0 = m.b;
    if (mv.do === 'dial') mv.from = m.val || 0;
    const pz = { exp, move: mv, target: t.id, kind: exp.kind || L.kindOf(t), ask: exp.ask };
    if (exp.kind === 'cmpI' || exp.kind === 'cmpV') {
      const ref = byTag('r');
      pz.ref = ref.id;
      const ri = res.pieces[ref.id], ti = res.pieces[t.id];
      const val = exp.kind === 'cmpI' ? [Math.abs(ri.I), Math.abs(ti.I)] : [Math.max(ri.Va, ri.Vb), Math.max(ti.Va, ti.Vb)];
      pz.before = { on: true, v: val[0] };
      pz.ask = exp.ask.replace('{ref}', exp.kind === 'cmpI' ? C.sparksText(val[0]) : C.blocksText(val[0]));
      const q = val[1] / Math.max(1e-9, val[0]);
      pz.answer = q > 1.1 ? 'more' : q < 0.9 ? 'less' : 'same';
      return pz;
    }
    pz.before = L.measure(t, res.pieces[t.id]);
    const after = C.solve(L.apply(pieces, mv));
    pz.answer = L.classify(pz.kind, pz.before, L.measure(t, after.pieces[t.id]));
    return pz;
  };
})();
