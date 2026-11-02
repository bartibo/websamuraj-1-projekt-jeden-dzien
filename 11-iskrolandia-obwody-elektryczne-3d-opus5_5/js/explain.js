// Wolcik-detektyw: tłumaczy, DLACZEGO element w obwodzie dziecka działa albo nie działa,
// i wskazuje miejsce na planszy. Sprawdza obwód „na próbę” (kopia planszy z jedną zmianą).
window.Iskry = window.Iskry || {};
(function () {
  const C = Iskry.circuit;
  const E = Iskry.explain = {};

  const DEVICES = ['bulb', 'motor', 'buzzer', 'led'];
  // mianownik, biernik
  const NAMES = {
    bulb: ['żarówka', 'żarówkę'], motor: ['silniczek', 'silniczek'], buzzer: ['brzęczyk', 'brzęczyk'], led: ['dioda', 'diodę'],
    battery: ['bateria', 'baterię'], switch: ['wyłącznik', 'wyłącznik'], button: ['przycisk', 'przycisk'],
    resistor: ['opornik', 'opornik'], dimmer: ['ściemniacz', 'ściemniacz'], wire: ['kabel', 'kabel'],
  };
  E.name = (t, k) => (NAMES[t] || ['element', 'element'])[k || 0];
  E.DEVICES = DEVICES;

  const copy = list => list.map(p => Object.assign({}, p));
  const isLow = p => !p.burnt && (p.type === 'wire' || (C.isInput(p) && p.on));
  const works = (res, id) => !!(res.pieces[id] && res.pieces[id].on);

  // Czy element działa po zmianie planszy (zmiana robiona na kopii)
  function worksIf(pieces, id, mutate) {
    const L = copy(pieces);
    mutate(L, id => L.find(p => p.id === id));
    const me = L.find(p => p.id === id);
    if (!me || me.burnt) return false;
    return works(C.solve(L), id);
  }

  function adjacency(pieces, use) {
    const adj = new Map();
    const push = (n, p, m) => { if (!adj.has(n)) adj.set(n, []); adj.get(n).push({ p, to: m }); };
    for (const p of pieces) if (use(p)) { push(p.a, p, p.b); push(p.b, p, p.a); }
    return adj;
  }

  // Wyspa elementów połączonych z węzłem (wyłączniki traktowane jak zamknięte)
  function island(pieces, start) {
    const adj = adjacency(pieces, p => !p.burnt);
    const nodes = new Set([start]), ids = new Set();
    const q = [start];
    while (q.length) {
      const n = q.pop();
      for (const e of adj.get(n) || []) {
        ids.add(e.p.id);
        if (!nodes.has(e.to)) { nodes.add(e.to); q.push(e.to); }
      }
    }
    return { nodes, ids };
  }

  // Najkrótsza droga „bez przeszkód” (kable, włączone wyłączniki) z węzła do węzła z pominięciem jednego elementu
  function easyPath(pieces, from, to, skipId, withBatteries) {
    const adj = adjacency(pieces, p => p.id !== skipId && (isLow(p) || (withBatteries && p.type === 'battery' && !p.burnt)));
    const prev = new Map([[from, null]]);
    const q = [from];
    while (q.length) {
      const n = q.shift();
      if (n === to) break;
      for (const e of adj.get(n) || []) if (!prev.has(e.to)) { prev.set(e.to, { n, p: e.p }); q.push(e.to); }
    }
    if (!prev.has(to) || from === to) return null;
    const ids = [];
    for (let n = to; prev.get(n); n = prev.get(n).n) ids.push(prev.get(n).p.id);
    return ids;
  }

  // Końce toru, przy których iskierki nie mają dalej drogi
  function deadEnds(pieces, isl) {
    const deg = new Map();
    for (const p of pieces) if (!p.burnt) { deg.set(p.a, (deg.get(p.a) || 0) + 1); deg.set(p.b, (deg.get(p.b) || 0) + 1); }
    return [...isl.nodes].filter(n => deg.get(n) === 1);
  }

  const listNames = arr => {
    const counts = {};
    arr.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1; });
    return Object.entries(counts).map(([t, n]) => (n > 1 ? n + '× ' : '') + E.name(t)).join(', ');
  };

  // Urządzenia, które gasną, gdy zabraknie elementu x (czyli leżą z nim na jednym torze)
  function seriesMates(pieces, res, p) {
    const I = Math.abs(res.pieces[p.id].I);
    return pieces.filter(x => x !== p && !x.burnt && ['bulb', 'motor', 'buzzer', 'led', 'resistor', 'dimmer'].includes(x.type)
      && res.pieces[x.id] && Math.abs(Math.abs(res.pieces[x.id].I) - I) < Math.max(0.002, I * 0.04)
      && !worksIf(pieces, p.id, (L) => { const i = L.findIndex(q => q.id === x.id); L.splice(i, 1); }));
  }

  function batteryOf(pieces, p) {
    const isl = island(pieces, p.a);
    return pieces.filter(x => x.type === 'battery' && !x.burnt && isl.ids.has(x.id));
  }

  // ---------- dlaczego nie działa ----------
  function whyNot(pieces, res, p) {
    const r = res.pieces[p.id] || {};
    const marks = [{ piece: p.id, kind: 'cause' }];
    if (p.burnt) {
      return {
        tone: 'bad', marks,
        text: p.type === 'led'
          ? 'Przepaliła się, bo pędziło przez nią za dużo iskierek naraz. Napraw ją i postaw na jej torze <b>opornik</b> – zrobi mały korek.'
          : 'Przepaliła się, bo dostała za duże klocki (4 baterie to za dużo). Napraw ją i zabierz jedną baterię.',
      };
    }
    if (p.type === 'led' && r.reverse) return { tone: 'bad', marks, text: 'Jest <b>odwrócona</b>. Dioda to bramka w jedną stronę: wpuszcza iskierki tylko od swojego plusa (+). Dotknij „Odwróć”.' };

    if (!pieces.some(x => x.type === 'battery' && !x.burnt)) return { tone: 'bad', marks, text: 'Na planszy nie ma żadnej <b>baterii</b>. Iskierki nie mają skąd wziąć klocków energii.' };

    const isl = island(pieces, p.a);
    const bats = pieces.filter(x => x.type === 'battery' && !x.burnt && isl.ids.has(x.id));
    if (!bats.length) {
      return { tone: 'bad', marks: marks.concat(deadEnds(pieces, isl).map(n => ({ node: n, kind: 'end' }))), text: `Ta część toru nie jest połączona z <b>baterią</b>. Iskierki nie mają skąd tu przyjechać. Połącz kablem z plusem i minusem baterii.` };
    }

    // wyłączniki i przyciski, które trzeba włączyć
    const open = pieces.filter(x => C.isInput(x) && !x.on && isl.ids.has(x.id));
    if (open.length) {
      const single = open.filter(s => worksIf(pieces, p.id, (L, f) => { f(s.id).on = true; }));
      const need = single.length ? single : (worksIf(pieces, p.id, (L, f) => open.forEach(s => { f(s.id).on = true; })) ? open : []);
      if (need.length) {
        const btn = need.every(s => s.type === 'button');
        const many = need.length > 1 && !single.length;
        return {
          tone: 'warn', marks: need.map(s => ({ piece: s.id, kind: 'cause' })).concat({ piece: p.id, kind: 'rel' }),
          text: btn
            ? (many ? 'Trzeba przytrzymać <b>oba przyciski</b> naraz – iskierki muszą przejechać przez każdy.' : 'Iskierki czekają przy <b>przycisku</b>. Przytrzymaj go palcem, a pojadą!')
            : many ? 'Na torze są <b>dwa mosty</b> jeden za drugim. Iskierki przejadą dopiero, gdy włączysz oba wyłączniki.'
              : (single.length > 1 ? 'Wystarczy włączyć <b>jeden z wyłączników</b> – każdy otwiera inną drogę.' : 'Most jest podniesiony: <b>wyłącznik</b> jest wyłączony. Dotknij go, żeby iskierki mogły przejechać.'),
        };
      }
    }

    // przedmiot na stoliku badacza, który nie przewodzi
    const ins = pieces.find(x => x.type === 'tester' && isl.ids.has(x.id) && !C.conducts(x) && worksIf(pieces, p.id, (L, f) => { f(x.id).mat = 0; }));
    if (ins) {
      const m = C.MATERIALS[(ins.mat || 0) % C.MATERIALS.length];
      return { tone: 'warn', marks: [{ piece: ins.id, kind: 'cause' }, { piece: p.id, kind: 'rel' }], text: `${m.e} ${m.n[0].toUpperCase() + m.n.slice(1)} <b>nie przewodzi prądu</b> – iskierki nie mają przez co przejechać. Taki materiał to <b>izolator</b>. Spróbuj czegoś z metalu!` };
    }

    // skrót obok elementu
    const sc = easyPath(pieces, p.a, p.b, p.id);
    if (sc) {
      return {
        tone: 'bad', marks: sc.map(id => ({ piece: id, kind: 'cause' })).concat({ piece: p.id, kind: 'rel' }),
        text: `Iskierki jadą <b>na skróty</b>! Oba końce ${p.type === 'led' ? 'diody' : p.type === 'bulb' ? 'żarówki' : 'tego elementu'} łączy sam kabel, a iskierki zawsze wybierają łatwiejszą drogę. Usuń skrót, który miga.`,
      };
    }
    // zwarcie gdzie indziej zabiera wszystkie iskierki
    if (res.short) {
      const b = pieces.find(x => res.shortIds.includes(x.id));
      const path = b ? easyPath(pieces, b.b, b.a, b.id, true) : null;
      if (path) return { tone: 'bad', marks: path.map(id => ({ piece: id, kind: 'cause' })), text: 'Gdzieś obok jest <b>zwarcie</b>: kabel łączy plus z minusem baterii bez żadnego urządzenia. Wszystkie iskierki pędzą tamtędy. Usuń kabel, który miga.' };
    }
    // baterie przeciwko sobie
    if (bats.length > 1) {
      const flip = bats.find(b => worksIf(pieces, p.id, (L, f) => { const q = f(b.id); const t = q.a; q.a = q.b; q.b = t; }));
      if (flip) return { tone: 'bad', marks: [{ piece: flip.id, kind: 'cause' }], text: '<b>Baterie pchają w przeciwne strony</b> i ich klocki się znoszą. Plus jednej musi prowadzić do minusa drugiej. Odwróć baterię, która miga.' };
    }
    if (p.type === 'led' && r.tooSmall) {
      return { tone: 'warn', marks, text: `Dostaje tylko ${C.blocksText(r.vd)}. Dioda otwiera bramkę dopiero przy <b>więcej niż jednym klocku</b> – postaw drugą baterię jedna za drugą.` };
    }
    if (p.type === 'led' && worksIf(pieces, p.id, (L, f) => { const q = f(p.id); const t = q.a; q.a = q.b; q.b = t; })) {
      return { tone: 'bad', marks, text: 'Plus (+) diody patrzy w złą stronę, więc bramka jest zamknięta. Dotknij „Odwróć”.' };
    }
    const ends = deadEnds(pieces, island(pieces, p.a));
    if (ends.length) {
      return {
        tone: 'bad', marks: marks.concat(ends.map(n => ({ node: n, kind: 'end' }))),
        text: 'Tor się <b>urywa</b> tam, gdzie miga wykrzyknik. Iskierki potrzebują zamkniętej pętli: z plusa baterii, przez urządzenie, z powrotem do minusa. Dołóż tam kabel.',
      };
    }
    // dochodzi, ale za mało
    if (Math.abs(r.I) > 1e-3 || Math.abs(r.vd) > 0.05) {
      const mates = Math.abs(r.I) > 1e-3 ? seriesMates(pieces, res, p) : [];
      return {
        tone: 'warn', marks: marks.concat(mates.map(x => ({ piece: x.id, kind: 'rel' }))),
        text: `Iskierki dojeżdżają, ale klocki są <b>za małe</b> (${C.blocksText(r.vd)}).` + (mates.length ? ` Na tym samym torze jest też ${listNames(mates)} i każdy zabiera kawałek klocka. Dołóż baterię albo zabierz coś z toru.` : ' Dołóż baterię.'),
      };
    }
    return { tone: 'bad', marks, text: 'Iskierki tu nie dojeżdżają. Sprawdź, czy jest zamknięta pętla: plus baterii → urządzenie → minus baterii.' };
  }

  // ---------- dlaczego działa (i jak mocno) ----------
  function whyYes(pieces, res, p) {
    const r = res.pieces[p.id];
    const I = Math.abs(r.I);
    const bits = [];
    const marks = [];
    const mates = seriesMates(pieces, res, p);
    const bats = batteryOf(pieces, p);
    const batI = bats.reduce((m, b) => Math.max(m, Math.abs(res.pieces[b.id].I)), 0);
    const each = `Każda iskierka oddaje tu <b>${C.blocksText(r.vd)}</b>`;
    if (p.type === 'bulb') bits.push(r.glow > 0.9 ? 'Świeci bardzo jasno, bo dostaje duże klocki.' : r.glow > 0.35 ? 'Świeci, bo iskierki przejeżdżają i oddają drucikowi klocki.' : 'Świeci słabo, bo dostaje tylko mały kawałek klocka.');
    if (p.type === 'motor') bits.push(`Kręci się ${r.speed > 0 ? 'w prawo' : 'w lewo'}. Odwróć baterię, a iskierki pojadą w drugą stronę i śmigło też.`);
    if (p.type === 'buzzer') bits.push('Brzęczy, bo iskierki szarpią w nim blaszkę.');
    if (p.type === 'led') bits.push('Bramka jest otwarta: plus diody patrzy w stronę plusa baterii.');
    bits.push(each + '.');
    if (mates.length) {
      bits.push(`Dzieli się klockiem z: ${listNames(mates)} – leżą na jednym torze, jeden za drugim (<b>szeregowo</b>). Usuń jeden, a zgaśnie cały tor.`);
      mates.forEach(x => marks.push({ piece: x.id, kind: 'rel' }));
    } else if (batI > I * 1.35) {
      bits.push('Ma <b>własny tor</b> obok innych (równolegle), więc dostaje cały klocek.');
    }
    if (p.type === 'led' && !pieces.some(x => (x.type === 'resistor' || x.type === 'dimmer') && mates.includes(x))) bits.push('Uwaga: bez opornika na torze łatwo ją przepalić!');
    return { tone: 'good', marks, text: bits.join(' ') };
  }

  // Urządzenia, których działanie zależy od tego wyłącznika
  function controls(pieces, res, s) {
    return pieces.filter(d => DEVICES.includes(d.type) && !d.burnt &&
      works(res, d.id) !== worksIf(pieces, d.id, (L, f) => { f(s.id).on = !s.on; }));
  }

  E.why = function (pieces, res, id) {
    const p = pieces.find(x => x.id === id);
    if (!p || !res || !res.pieces[id]) return null;
    const r = res.pieces[id];
    if (DEVICES.includes(p.type)) return works(res, id) && !p.burnt ? whyYes(pieces, res, p) : whyNot(pieces, res, p);

    if (p.type === 'battery') {
      if (r.short) {
        const path = easyPath(pieces, p.b, p.a, p.id, true) || [];
        return { tone: 'bad', marks: path.map(x => ({ piece: x, kind: 'cause' })), text: '<b>Zwarcie!</b> Kabel łączy plus z minusem bez żadnego urządzenia. Iskierki pędzą na skróty, a bateria się grzeje. Usuń kabel, który miga.' };
      }
      if (Math.abs(r.I) > 1e-3) {
        const isl = island(pieces, p.a);
        const fed = pieces.filter(d => DEVICES.includes(d.type) && isl.ids.has(d.id) && works(res, d.id));
        const many = fed.length > 1 && fed.every(d => !seriesMates(pieces, res, d).some(m => fed.includes(m)));
        return {
          tone: 'good', marks: fed.map(d => ({ piece: d.id, kind: 'rel' })),
          text: `Wypuszcza <b>${C.sparksText(r.I)}</b>, a każdej daje 1 klocek.` + (fed.length ? ` Zasila: ${listNames(fed)}.` : '') + (many ? ' Każde urządzenie ma własny tor, więc bateria musi wypuścić więcej iskierek i szybciej się zużyje.' : ''),
        };
      }
      const ends = deadEnds(pieces, island(pieces, p.a));
      return { tone: 'warn', marks: ends.map(n => ({ node: n, kind: 'end' })), text: ends.length ? 'Iskierki czekają z klockami, ale tor jest <b>otwarty</b> – urywa się tam, gdzie miga wykrzyknik.' : 'Iskierki czekają z klockami, ale nie mają którędy pojechać: tor jest przerwany albo zamknięty wyłącznikiem.' };
    }
    if (C.isInput(p)) {
      const ctl = controls(pieces, res, p);
      const verb = p.type === 'button' ? (p.on ? 'Wciśnięty' : 'Puszczony') : (p.on ? 'Włączony' : 'Wyłączony');
      return {
        tone: 'info', marks: ctl.map(d => ({ piece: d.id, kind: 'rel' })),
        text: `${verb}${p.on ? ': most opuszczony, iskierki mogą jechać.' : ': most podniesiony, iskierki stoją.'} ` + (!p.on && Math.abs(r.vd) > 0.3 ? 'Klocki czekają po obu stronach mostu – <b>napięcie jest, ale prądu brak</b>. ' : '') + (ctl.length ? `Steruje: <b>${listNames(ctl)}</b>.` : 'Na razie niczym nie steruje – żadne urządzenie od niego nie zależy.'),
      };
    }
    if (p.type === 'resistor' || p.type === 'dimmer') {
      if (Math.abs(r.I) < 1e-3) return { tone: 'info', marks: [], text: 'Teraz nikt tędy nie jedzie. Opór działa dopiero, gdy iskierki płyną przez tor.' };
      const L = copy(pieces); const me = L.find(x => x.id === id); me.type = 'wire';
      const I2 = Math.abs(C.solve(L).pieces[id].I);
      return { tone: 'info', marks: [], text: `Wąska ścieżka robi <b>korek</b>: przejeżdża tu ${C.sparksText(r.I)}. Bez ${p.type === 'dimmer' ? 'ściemniacza' : 'opornika'} jechałoby ${C.sparksText(I2)}.` };
    }
    if (p.type === 'tester') {
      const m = C.MATERIALS[(p.mat || 0) % C.MATERIALS.length];
      const Name = m.e + ' ' + m.n[0].toUpperCase() + m.n.slice(1);
      const flows = Math.abs(r.I) > 1e-3;
      if (!isFinite(m.R)) return { tone: 'warn', marks: [], text: `${Name} <b>nie przewodzi</b> prądu – to <b>izolator</b>. ${Math.abs(r.vd) > 0.3 ? 'Klocki czekają po obu stronach, ale iskierki nie mają przez co przejechać.' : 'Podłącz stolik do baterii i żarówki, żeby to sprawdzić.'}` };
      if (m.R > 1) return { tone: 'info', marks: [], text: `${Name} <b>przewodzi, ale słabo</b> – robi korek jak opornik. ${flows ? `Przejeżdża tylko ${C.sparksText(r.I)}.` : ''}` };
      return { tone: 'good', marks: [], text: `${Name} jest z <b>metalu</b>, a metale świetnie przewodzą prąd. ${flows ? `Przejeżdża ${C.sparksText(r.I)}.` : 'Połącz stolik z baterią i żarówką, żeby to zobaczyć.'}` };
    }
    if (p.type === 'wire') {
      if (Math.abs(r.I) > 1e-3) {
        return { tone: 'good', marks: [], text: `Przewozi <b>${C.sparksText(r.I)}</b>. Każda wiezie ${C.blocksText(Math.max(r.Va || 0, r.Vb || 0))}. Kabel prawie ich nie spowalnia.` };
      }
      if ((r.Va || 0) > 0.05) {
        const ends = deadEnds(pieces, island(pieces, p.a));
        return { tone: 'warn', marks: ends.map(n => ({ node: n, kind: 'end' })), text: `Iskierki stoją z klockami (${C.blocksText(r.Va)}) i czekają. Tor ${ends.length ? 'urywa się tam, gdzie miga wykrzyknik' : 'jest gdzieś przerwany'}.` };
      }
      return { tone: 'info', marks: [], text: 'Pusty kabel – nie dochodzą tu klocki z baterii.' };
    }
    return null;
  };

  // Przegląd całej planszy (Wolcik w piaskownicy)
  E.overview = function (pieces, res) {
    if (!pieces.length) return { tone: 'info', marks: [], text: 'Plansza jest pusta! Postaw baterię, żarówkę i połącz je kablami w pętlę.' };
    if (res.short) {
      const b = pieces.find(x => res.shortIds.includes(x.id));
      const w = E.why(pieces, res, b.id);
      return { tone: 'bad', marks: w.marks, text: w.text, focus: b.id };
    }
    const devs = pieces.filter(p => DEVICES.includes(p.type));
    if (!devs.length) return { tone: 'info', marks: [], text: 'Nie ma tu żadnego urządzenia. Dołóż żarówkę, silniczek, diodę albo brzęczyk – coś, co zrobi użytek z klocków!' };
    const off = devs.filter(d => d.burnt || !works(res, d.id));
    // najpierw to, co nie działa „przez przypadek” – pomijamy urządzenia czekające na wyłącznik
    for (const d of off) {
      const w = whyNot(pieces, res, d);
      if (w.tone === 'warn' && /wyłącznik|przycisk|most/.test(w.text)) continue;
      return Object.assign({ focus: d.id }, w, { text: `${E.name(d.type)[0].toUpperCase() + E.name(d.type).slice(1)}: ` + w.text });
    }
    const on = devs.filter(d => works(res, d.id) && !d.burnt);
    if (!on.length && off.length) {
      const w = whyNot(pieces, res, off[0]);
      return Object.assign({ focus: off[0].id }, w);
    }
    return { tone: 'good', marks: on.map(d => ({ piece: d.id, kind: 'rel' })), text: `Wszystko gra! Działa: ${listNames(on)}. Dotknij dowolnego elementu, a powiem ci, dlaczego działa tak, a nie inaczej.` };
  };
})();
