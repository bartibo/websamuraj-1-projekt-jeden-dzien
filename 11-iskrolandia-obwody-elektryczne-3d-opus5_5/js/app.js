// Iskrolandia – sklejenie wszystkiego: stan, narzędzia, dotyk i mysz, misje, laboratorium, nagrody, zapis
(function () {
  const C = Iskry.circuit, S = Iskry.scene, A = Iskry.audio, U = Iskry.ui, E = Iskry.explain, L = Iskry.lab;
  const P = Iskry.pieces;
  const $ = U.$;
  const MISSIONS = Iskry.MISSIONS, EXPS = L.EXPERIMENTS;

  const COMP = ['battery', 'bulb', 'motor', 'switch', 'button', 'led', 'buzzer', 'resistor', 'dimmer', 'tester'];
  const TOOL_NAMES = { hand: 'Rączka', wire: 'Kabel', erase: 'Gumka', meter: 'Miernik', battery: 'Bateria', bulb: 'Żarówka', motor: 'Silniczek', switch: 'Wyłącznik', button: 'Przycisk', led: 'Dioda', buzzer: 'Brzęczyk', resistor: 'Opornik', dimmer: 'Ściemniacz', tester: 'Stolik' };
  const NEW_TOOLS = ['meter', 'dimmer', 'tester'];
  // lekcja „Jak działa prąd?” do elementu (link „Więcej” w dymku)
  const LESSON_OF = { wire: 0, battery: 2, bulb: 3, motor: 3, buzzer: 3, switch: 0, button: 0, resistor: 4, dimmer: 4, led: 6, tester: 4 };
  const compactMQ = window.matchMedia('(max-width: 640px) and (orientation: portrait), (max-height: 500px) and (orientation: landscape)');
  const portraitMQ = window.matchMedia('(max-width: 640px) and (orientation: portrait)');
  const landMQ = window.matchMedia('(max-height: 500px) and (orientation: landscape)');

  const st = {
    mode: 'home', pieces: [], nextId: 1, tool: 'hand', res: null,
    mission: null, mIdx: -1, sticky: [], hints: 0, freeHint: false, done: false, mem: {},
    history: [], selected: null, wireColor: 0, ledColor: 0, matNext: 0,
    showStacks: false, showSparks: true, wasShort: false, sessionDirs: {},
    puz: null, exp: -1, recentPuz: [], probes: [null, null], marksFrom: null,
  };

  // ---------- zapis ----------
  const KEY = 'iskrolandia.v1';
  const fresh = () => ({ stars: {}, badges: {}, theme: 'klasyczny', sandbox: null, muted: false, read: false, lab: {}, oracle: 0, mats: {}, seen: {}, tips: {} });
  let save = fresh();
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) save = Object.assign(save, s); } catch (e) {}
  let saveT = null;
  function persist() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }, 300);
  }
  const saveNow = () => { clearTimeout(saveT); try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} };
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
  const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);
  const buzzHand = ms => { if (!save.muted && navigator.vibrate) try { navigator.vibrate(ms || 10); } catch (e) {} };

  // ---------- elementy ----------
  const clean = p => {
    const o = { id: p.id, type: p.type, a: p.a, b: p.b, on: !!p.on, burnt: !!p.burnt, locked: !!p.locked, color: p.color || 0 };
    if (p.val !== undefined) o.val = p.val;
    if (p.mat !== undefined) o.mat = p.mat;
    if (p.tag) o.tag = p.tag;
    return o;
  };
  const snapshot = () => JSON.stringify(st.pieces.map(clean));
  function pushHistory() {
    st.history.push(snapshot());
    if (st.history.length > 60) st.history.shift();
  }
  const byId = id => st.pieces.find(p => p.id === id);
  const atEdge = (a, b) => { const k = C.edgeKey(a, b); return st.pieces.find(p => C.edgeKey(p.a, p.b) === k); };

  function makePiece(type, a, b, extra) {
    const p = Object.assign({ id: 'p' + st.nextId++, type, a, b, on: false, burnt: false, locked: false, color: 0 }, extra || {});
    const has = k => extra && k in extra && extra[k] !== undefined;
    if (type === 'wire' && !has('color')) p.color = st.wireColor;
    if (type === 'led' && !has('color')) { p.color = st.ledColor; st.ledColor = (st.ledColor + 1) % P.LED_COLORS.length; }
    if (type === 'dimmer' && !has('val')) p.val = 0.3;
    if (type === 'tester' && !has('mat')) { p.mat = st.matNext; st.matNext = (st.matNext + 3) % C.MATERIALS.length; }
    return p;
  }

  function setPieces(list) {
    st.pieces = list.map(p => makePiece(p.type, p.a, p.b, { on: !!p.on, burnt: !!p.burnt, locked: !!p.locked, color: p.color || 0, val: p.val, mat: p.mat, tag: p.tag }));
    st.probes = [null, null];
    S.setProbes(null, null);
    selectPiece(null);
    region = null;
    changed(false);
    updateRegion(true);
  }
  // kable z zestawów bez koloru: czerwone po stronie plusa, niebieskie po stronie minusa (jak w piaskownicy)
  function colorWires(setup) {
    const res = C.solve(st.pieces);
    st.pieces.forEach((p, i) => {
      if (p.type !== 'wire' || (setup[i] && setup[i].color !== undefined)) return;
      const v = Math.max(res.nodeV.get(p.a) || 0, res.nodeV.get(p.b) || 0);
      const top = Math.max(0, ...res.nodeV.values());
      p.color = top > 0.1 && v < top * 0.2 ? 1 : 0;
    });
    S.sync(st.pieces);
  }

  // ---------- kadr: kamera pokazuje obszar obwodu (rośnie razem z nim) ----------
  let region = null, fullView = false;
  function updateRegion(reset) {
    if (st.mode === 'home' || fullView) { S.setRegion(null, !reset); if (reset) region = null; return; }
    let c0 = 99, c1 = -1, r0 = 99, r1 = -1;
    for (const p of st.pieces) for (const n of [p.a, p.b]) {
      const q = C.cr(n);
      c0 = Math.min(c0, q.c); c1 = Math.max(c1, q.c); r0 = Math.min(r0, q.r); r1 = Math.max(r1, q.r);
    }
    if (c1 < 0) { c0 = 3; c1 = 6; r0 = 2; r1 = 4; }
    // margines jednej kratki, żeby było gdzie dobudować
    c0 -= 1; c1 += 1; r0 -= 1; r1 += 1;
    if (region && !reset) { c0 = Math.min(c0, region.c0); c1 = Math.max(c1, region.c1); r0 = Math.min(r0, region.r0); r1 = Math.max(r1, region.r1); }
    const grow = (a, b, min, max) => {
      const need = min - (b - a);
      if (need > 0) { a -= need / 2; b += need / 2; }
      if (a < 0) { b -= a; a = 0; }
      if (b > max) { a -= b - max; b = max; }
      return [Math.max(0, a), Math.min(max, b)];
    };
    [c0, c1] = grow(c0, c1, 5, C.COLS - 1);
    [r0, r1] = grow(r0, r1, 3, C.ROWS - 1);
    region = { c0, c1, r0, r1 };
    S.setRegion(region, !reset);
  }
  function toggleFullView() {
    fullView = !fullView;
    $('vReset').querySelector('small').textContent = fullView ? 'Obwód' : 'Plansza';
    updateRegion(false);
    S.resetView();
  }

  // ---------- rozwiązywanie i reakcje ----------
  let overviewT = null;
  function changed(structural, keepBubble) {
    for (let k = 0; k < 4; k++) {
      st.res = C.solve(st.pieces);
      const burn = st.pieces.filter(p => st.res.pieces[p.id] && st.res.pieces[p.id].burnNow);
      if (!burn.length) break;
      burn.forEach(p => {
        p.burnt = true;
        const w = S.worldOf(p.id);
        if (w) { w.y = 0.4; S.fx('spark', w, 14); S.fx('smoke', w, 6); }
      });
      A.sfx('burn');
      buzzHand(60);
      award('burn');
      const b = burn[0];
      if (!st.puz) tip('burn' + b.type, b.type === 'led'
        ? 'Pyk! Dioda się przepaliła – iskierki pędziły przez nią za szybko. Dotknij jej, żeby ją naprawić, a potem dodaj <b>opornik</b>, który zrobi mały korek.'
        : 'Pyk! Za duże klocki dla żarówki – drucik się przepalił. Dotknij jej, żeby ją naprawić, i zabierz jedną baterię.', 'wow', true);
    }
    S.sync(st.pieces);
    S.setResults(st.res);
    updateRegion(false);
    reactions();
    if (st.mode === 'mission') evalMission();
    if (keepBubble) refreshBubbleLive(); else refreshBubble();
    refreshMeter();
    updateTray();
    if (st.marksFrom === 'wolcik') clearMarks();
    if (st.puz) checkPuzzle();
    if (st.mode === 'sandbox' && structural !== false) { save.sandbox = st.pieces.map(clean); persist(); }
    // znak zapytania przy Wolciku, gdy coś nie działa (po chwili, żeby nie przeszkadzać w budowaniu)
    clearTimeout(overviewT);
    $('wolcikBadge').hidden = true;
    if ((st.mode === 'sandbox' || (st.mode === 'mission' && !st.done)) && !st.puz) {
      overviewT = setTimeout(() => {
        const o = E.overview(st.pieces, st.res);
        $('wolcikBadge').hidden = !(o && (o.tone === 'bad') && st.pieces.length > 1);
      }, 3500);
    }
  }

  // wskazówki pokazane raz zapamiętujemy (także między sesjami)
  const tipsShown = save.tips || (save.tips = {});
  let lastTip = 0;
  function tip(key, text, mood, force) {
    if (tipsShown[key] && !force) return;
    if (!force && performance.now() - lastTip < 4000) return;
    if (st.mode === 'home') return;
    tipsShown[key] = true;
    persist();
    lastTip = performance.now();
    U.say(text, { mood: mood || 'happy' });
  }

  function reactions() {
    if (st.mode === 'home') return;
    const r = st.res;
    const on = t => st.pieces.filter(p => p.type === t && r.pieces[p.id] && r.pieces[p.id].on && !p.burnt);
    const bulbs = on('bulb'), motors = on('motor'), buzz = on('buzzer'), leds = on('led');
    if (bulbs.length) award('light');
    if (bulbs.length >= 5) award('five');
    if (new Set(leds.map(p => p.color % P.LED_COLORS.length)).size >= 3) award('rainbow');
    if (bulbs.length && motors.length && buzz.length) award('orchestra');
    motors.forEach(m => { st.sessionDirs[Math.sign(r.pieces[m.id].speed)] = true; });
    if (st.sessionDirs[1] && st.sessionDirs[-1]) award('reverse');
    let maxV = 0;
    for (const v of r.nodeV.values()) maxV = Math.max(maxV, v);
    if (maxV >= 5.4) award('tower');
    // stolik badacza: zapisujemy przedmioty sprawdzone w obwodzie z baterią
    for (const p of st.pieces) {
      if (p.type !== 'tester') continue;
      const x = r.pieces[p.id];
      if (x && (Math.abs(x.I) > 1e-3 || Math.abs(x.vd) > 0.3)) {
        const m = (p.mat || 0) % C.MATERIALS.length;
        if (!save.mats[m]) { save.mats[m] = 1; persist(); }
      }
    }
    if (Object.keys(save.mats).length >= 6) award('materials');

    if (r.short && !st.wasShort) {
      A.sfx('short');
      buzzHand(80);
      award('short');
      if (!(st.mission && st.mission.id === 'm11') && !st.puz) tip('short', '⚠️ Zwarcie! Iskierki pędzą na skróty, nie przejeżdżając przez żadną żarówkę ani silniczek, a bateria robi się gorąca. Dotknij mnie, a pokażę, gdzie jest ten skrót. W prawdziwym życiu tak się nie robi!', 'worry', true);
    }
    st.wasShort = r.short;
    if (st.puz) return;
    for (const p of st.pieces) {
      const x = r.pieces[p.id];
      if (!x) continue;
      if (p.type === 'led' && x.reverse) tip('ledrev', 'Dioda jest odwrócona! To bramka w jedną stronę: plus (+) diody musi prowadzić do plusa baterii. Dotknij diody i wybierz „Odwróć”.', 'wow');
      if (p.type === 'led' && x.tooSmall) tip('ledsmall', 'Dioda dostaje za małe klocki. Potrzebuje więcej niż jednej baterii – dołóż drugą, jedna za drugą.', 'wow');
    }
  }

  // ---------- odznaki i gwiazdki ----------
  function award(id) {
    if (save.badges[id]) return;
    save.badges[id] = Date.now();
    persist();
    const b = Iskry.BADGES.find(x => x.id === id);
    if (!b) return;
    setTimeout(() => {
      A.sfx('badge');
      U.toast(`<span class="te">${b.e}</span><div><small>Nowa odznaka!</small><b>${b.t}</b></div>`, 'badge');
    }, 400);
  }
  function updateStars() { $('starCount').textContent = totalStars(); }

  // ---------- znaczniki na planszy ----------
  function setMarks(list, from) { S.setMarks(list); st.marksFrom = list && list.length ? from : null; }
  function clearMarks() { if (st.puz) applyPuzMarks(); else setMarks(null); }
  U.onHush = () => { if (st.marksFrom === 'wolcik') clearMarks(); };

  // ---------- misje ----------
  function enterBoard(mode) {
    st.mode = mode;
    if (fullView) toggleFullView();
    hideScreens();
    document.body.classList.remove('at-home');
    document.body.dataset.mode = mode;
    S.setAuto(false);
    $('vPuzzle').hidden = mode !== 'sandbox';
    $('side').classList.remove('open');
    U.hush();
    closePuz(true);
    if (st.showStacks) toggleStacks();
  }

  function startMission(i) {
    const m = MISSIONS[i];
    enterBoard('mission');
    st.mission = m; st.mIdx = i;
    st.sticky = m.checks.map(() => false);
    st.hints = 0; st.freeHint = false; st.done = false; st.mem = {}; st.history = []; st.wasShort = false;
    $('missionCard').hidden = false;
    $('missionCard').classList.toggle('min', compactMQ.matches);
    $('mcEmoji').textContent = m.emoji;
    $('mcNum').textContent = 'Misja ' + (i + 1) + ' z ' + MISSIONS.length;
    $('mcTitle').textContent = m.title;
    $('modeLabel').textContent = m.emoji + ' ' + m.title;
    setPieces(m.setup.map(x => Object.assign({}, x)));
    colorWires(m.setup);
    buildTray();
    setTool(m.id === 'm11' ? 'erase' : (m.tray.wire && Object.keys(m.tray).length === 1 ? 'wire' : 'hand'));
    evalMission();
    updateHintLabel();
    layoutFrames();
    setTimeout(() => U.say(m.intro, { stay: true, mood: m.id === 'm11' ? 'worry' : 'happy' }), 350);
  }

  let flashT = null;
  function evalMission() {
    const m = st.mission;
    if (!m) return;
    const ctx = { pieces: st.pieces, res: st.res, mem: st.mem };
    let all = true, ticked = false;
    const vals = m.checks.map((c, i) => {
      let v = false;
      try { v = !!c.f(ctx); } catch (e) { v = false; }
      if (c.after !== undefined && !st.sticky[c.after]) v = false;
      if (c.sticky) { if (v && !st.sticky[i]) { st.sticky[i] = true; ticked = true; } v = st.sticky[i]; }
      else if (v && !st.sticky[i]) { st.sticky[i] = true; ticked = true; }
      else if (!v) st.sticky[i] = false;
      if (!v) all = false;
      return v;
    });
    $('mcChecks').innerHTML = m.checks.map((c, i) => `<li class="${vals[i] ? 'ok' : ''}"><i>${vals[i] ? '✔' : ''}</i>${c.t}</li>`).join('');
    $('mcProg').innerHTML = vals.map(v => `<i class="${v ? 'ok' : ''}"></i>`).join('');
    const nextI = vals.indexOf(false);
    $('mcNext').textContent = nextI >= 0 ? '○ ' + m.checks[nextI].t : '✔ Gotowe!';
    if (ticked && !st.done) {
      A.sfx('check');
      buzzHand(15);
      const card = $('missionCard');
      card.classList.add('flash');
      clearTimeout(flashT);
      flashT = setTimeout(() => card.classList.remove('flash'), 1400);
    }
    if (all && !st.done) {
      st.done = true;
      $('wolcikBadge').hidden = true;
      selectPiece(null);
      U.hush();
      U.dance();
      // chwila na nacieszenie się efektem, zanim wyskoczy okno
      setTimeout(() => { if (st.mission === m && st.done) missionComplete(); }, 2200);
    }
  }

  function missionComplete() {
    const m = st.mission;
    if (!m || st.mode !== 'mission') return;
    const stars = Math.max(1, 3 - st.hints);
    const prev = save.stars[m.id] || 0;
    save.stars[m.id] = Math.max(prev, stars);
    persist();
    updateStars();
    if (MISSIONS.every(x => save.stars[x.id])) award('master');
    A.sfx('success');
    U.confetti(180);
    U.hush();
    const unlocked = Iskry.THEMES.filter(t => t.stars > totalStars() - (save.stars[m.id] - prev) && t.stars <= totalStars());
    const next = st.mIdx + 1 < MISSIONS.length ? st.mIdx + 1 : -1;
    const starHtml = [0, 1, 2].map(i => `<span class="bigstar ${i < stars ? 'got' : ''}" style="animation-delay:${0.3 + i * 0.35}s">★</span>`).join('');
    [0, 1, 2].slice(0, stars).forEach(i => setTimeout(() => A.sfx('star'), 500 + i * 350));
    const exp = EXPS.findIndex(e => e.mission === m.id);
    U.modal(
      `<div class="win"><div class="win-sticker">${m.emoji}</div><h2>Misja wykonana!</h2><div class="stars">${starHtml}</div>
       <p class="win-sub">${m.title}${st.hints ? ` · podpowiedzi: ${st.hints}` : ' · bez płatnych podpowiedzi!'}</p>
       <div class="explain"><b>Co tu się stało?</b><p>${m.explain}</p></div>
       ${unlocked.length ? `<p class="unlock">🎁 Odblokowano planszę: <b>${unlocked.map(t => t.name).join(', ')}</b> (zmienisz ją w Nagrodach)</p>` : ''}</div>`,
      [
        next >= 0 ? { label: '▶ Następna misja', cls: 'primary', fn: () => startMission(next) } : { label: '🏆 Zobacz nagrody', cls: 'primary', fn: openAlbum },
        { label: '🧪 Pobaw się jeszcze', fn: () => {} },
        exp >= 0 ? { label: '🔬 Eksperyment', fn: () => startExperiment(exp) } : { label: '🎯 Mapa misji', fn: openMap },
      ], { cls: 'win-panel' });
  }

  // Podpowiedź: najpierw darmowy Wolcik-detektyw (pokazuje, co nie działa), potem tekst za gwiazdkę
  function showHint() {
    if (!st.mission) return;
    A.sfx('ui');
    if (!st.freeHint && !st.done) {
      st.freeHint = true;
      updateHintLabel();
      const o = E.overview(st.pieces, st.res);
      const note = '<br><small>Ta podpowiedź była za darmo. Następna kosztuje gwiazdkę (−⭐).</small>';
      if (o && o.tone !== 'good' && o.marks.length) {
        setMarks(o.marks, 'wolcik');
        U.say('🔍 ' + o.text + note, { stay: true, mood: 'detect' });
        return;
      }
      // obwód działa, ale misja jeszcze nie: wskazujemy pierwszy niezaliczony punkt
      const i = st.sticky.indexOf(false);
      const c = st.mission.checks[i];
      const ins = st.pieces.filter(C.isInput);
      setMarks(ins.map(x => ({ piece: x.id, kind: 'cause' })), 'wolcik');
      U.say(`🔍 Coś już działa! Brakuje jeszcze punktu: <b>${c ? c.t : ''}</b>.` + (ins.length ? ' Popstrykaj wyłącznikami i przyciskami (migają) i patrz, co się dzieje.' : ' Spójrz na listę misji i spróbuj to zrobić.') + note, { stay: true, mood: 'detect' });
      return;
    }
    if (!st.done) st.hints++;
    U.say('💡 ' + st.mission.hint, { stay: true, mood: 'happy' });
  }

  function updateHintLabel() {
    $('mcHint').textContent = st.freeHint ? '💡 Podpowiedź (−⭐)' : '💡 Podpowiedź (za darmo)';
    $('mcHintMini').title = st.freeHint ? 'Podpowiedź (kosztuje gwiazdkę)' : 'Podpowiedź (za darmo)';
  }

  // ---------- tryby ----------
  const DEMO = (() => {
    const N = C.node;
    const w = (a, b, c) => ({ type: 'wire', a: N(a[0], a[1]), b: N(b[0], b[1]), color: c });
    return [
      { type: 'battery', a: N(2, 5), b: N(2, 4) }, { type: 'battery', a: N(2, 4), b: N(2, 3) },
      w([2, 3], [2, 2], 0), w([2, 2], [3, 2], 0), { type: 'switch', a: N(3, 2), b: N(4, 2), on: true }, w([4, 2], [5, 2], 0), w([5, 2], [6, 2], 0), w([6, 2], [7, 2], 0), w([7, 2], [8, 2], 0),
      { type: 'bulb', a: N(5, 2), b: N(5, 3) }, { type: 'motor', a: N(8, 2), b: N(8, 3) },
      w([2, 5], [2, 6], 1), w([2, 6], [3, 6], 1), w([3, 6], [4, 6], 1), w([4, 6], [5, 6], 1), w([5, 6], [6, 6], 1), w([6, 6], [7, 6], 1), w([7, 6], [8, 6], 1),
      { type: 'resistor', a: N(5, 4), b: N(5, 3) }, { type: 'led', a: N(5, 4), b: N(5, 5), color: 1 }, w([5, 5], [5, 6], 1),
      w([8, 3], [8, 4], 3), { type: 'buzzer', a: N(8, 4), b: N(8, 5) }, { type: 'button', a: N(8, 5), b: N(8, 6) },
    ];
  })();
  const STARTER = (() => {
    const N = C.node;
    return [
      { type: 'battery', a: N(3, 4), b: N(3, 3) },
      { type: 'wire', a: N(3, 3), b: N(4, 3), color: 0 }, { type: 'switch', a: N(4, 3), b: N(5, 3), on: true }, { type: 'wire', a: N(5, 3), b: N(6, 3), color: 0 },
      { type: 'bulb', a: N(6, 3), b: N(6, 4) },
      { type: 'wire', a: N(3, 4), b: N(4, 4), color: 1 }, { type: 'wire', a: N(4, 4), b: N(5, 4), color: 1 }, { type: 'wire', a: N(5, 4), b: N(6, 4), color: 1 },
    ];
  })();

  function goHome() {
    enterBoard('home');
    st.mission = null;
    document.body.classList.add('at-home');
    $('missionCard').hidden = true;
    selectPiece(null);
    setPieces(DEMO);
    S.setAuto(true);
    U.show('home');
    layoutFrames();
  }
  function startSandbox() {
    enterBoard('sandbox');
    st.mission = null; st.history = []; st.wasShort = false;
    $('missionCard').hidden = true;
    $('modeLabel').textContent = '🧪 Piaskownica';
    setPieces(save.sandbox && save.sandbox.length ? save.sandbox : STARTER);
    buildTray();
    setTool('hand');
    layoutFrames();
    const fresh = NEW_TOOLS.filter(t => !save.seen[t]);
    setTimeout(() => {
      if (!tipsShown.sandbox) tip('sandbox', 'To twoja piaskownica! Wybierz element na dole i dotknij planszy, żeby go postawić. Kable rysujesz, przeciągając palcem od kropki do kropki. Dotknij elementu, a powiem ci, <b>dlaczego</b> działa (albo nie). A gdy zbudujesz coś, co świeci, naciśnij <b>❓ Zagadka</b>!', 'happy', true);
      else if (fresh.length) tip('newtools', 'Nowe narzędzia na tacce: <b>Miernik</b> 📏, <b>Ściemniacz</b> 🎛️ i <b>Stolik badacza</b> 🔑 – sprawdź, co przewodzi prąd!', 'wow', true);
    }, 300);
  }
  function hideScreens() { ['home', 'map', 'album', 'lessons', 'modal', 'labScreen'].forEach(id => U.hide(id)); }

  // ---------- tacka narzędzi ----------
  function trayItems() {
    if (st.mode === 'mission') {
      const t = st.mission.tray;
      const items = ['hand'];
      if (t.wire) items.push('wire');
      items.push('erase');
      COMP.forEach(c => { if (t[c]) items.push(c); });
      return items;
    }
    if (st.mode === 'lab') {
      const items = ['hand'];
      const mv = st.puz && st.puz.move;
      if (mv && mv.do === 'remove') items.push('erase');
      if (mv && mv.do === 'add') items.push(mv.type);
      return items;
    }
    return ['hand', 'wire', 'erase', 'meter', ...COMP];
  }
  function left(type) {
    if (st.mode === 'lab') {
      const mv = st.puz && st.puz.move;
      return mv && mv.do === 'add' && mv.type === type && !L.done(st.pieces, mv) ? 1 : 0;
    }
    if (st.mode !== 'mission') return Infinity;
    const lim = st.mission.tray[type] || 0;
    if (lim >= 99) return Infinity;
    return lim - st.pieces.filter(p => p.type === type && !p.locked).length;
  }
  function buildTray() {
    const tray = $('tray');
    const items = trayItems();
    tray.classList.toggle('many', items.length > 7);
    tray.innerHTML = items.map((k, i) =>
      (k === 'battery' ? '<span class="tsep"></span>' : '') +
      `<button class="titem ${st.mode === 'sandbox' && NEW_TOOLS.includes(k) && !save.seen[k] ? 'new' : ''}" data-tool="${k}" aria-label="${TOOL_NAMES[k]}">${i < 10 ? `<kbd>${(i + 1) % 10}</kbd>` : ''}${U.icon(k)}<span>${TOOL_NAMES[k]}</span><em class="cnt"></em></button>`).join('');
    tray.querySelectorAll('.titem').forEach(b => {
      b.addEventListener('pointerdown', e => trayDown(e, b.dataset.tool, b));
      b.addEventListener('contextmenu', e => e.preventDefault());
      b.addEventListener('click', e => { if (e.detail === 0) { A.init(); A.sfx('ui'); setTool(b.dataset.tool); } });
    });
    updateTray();
  }
  function updateTray() {
    document.querySelectorAll('#tray .titem').forEach(b => {
      const k = b.dataset.tool;
      b.classList.toggle('sel', st.tool === k);
      const l = left(k);
      const cnt = b.querySelector('.cnt');
      if (COMP.includes(k) && l !== Infinity && st.mode !== 'lab') { cnt.textContent = '×' + Math.max(0, l); b.classList.toggle('empty', l <= 0); }
      else { cnt.textContent = ''; b.classList.remove('empty'); }
    });
  }
  function setTool(k) {
    st.tool = k;
    updateTray();
    S.showGhost(null);
    document.body.dataset.tool = k;
    if (k !== 'hand') selectPiece(null);
    if (k !== 'meter') { st.probes = [null, null]; S.setProbes(null, null); refreshMeter(); }
    if (NEW_TOOLS.includes(k) && !save.seen[k]) {
      save.seen[k] = 1; persist();
      const el = document.querySelector(`#tray .titem[data-tool="${k}"]`);
      if (el) el.classList.remove('new');
    }
  }

  const TOOL_TIPS = {
    wire: 'Kabel: przeciągnij palcem lub myszką od kropki do kropki. Możesz rysować długie kable za jednym razem!',
    erase: 'Gumka: dotknij elementu albo przeciągnij po kilku, żeby je usunąć.',
    meter: '📏 Miernik pokazuje <b>napięcie</b>, czyli ile klocków różnicy jest między dwiema kropkami. Przeciągnij od kropki do kropki albo dotknij elementu.',
    switch: 'Wyłącznik to most zwodzony. Postaw go na torze, a potem dotykaj, żeby go włączać i wyłączać.',
    button: 'Przycisk działa tylko, dopóki go trzymasz – jak dzwonek do drzwi. Postaw go na torze.',
    dimmer: '🎛️ Ściemniacz to ścieżka, którą możesz zwężać suwakiem. Postaw go obok żarówki i kręć!',
    tester: '🔑 Stolik badacza sprawdza, co przewodzi prąd. Wstaw go w tor z baterią i żarówką, a potem dotykaj, żeby zmieniać przedmiot.',
  };

  // przeciąganie z tacki na planszę (palcem: tylko ruch w stronę planszy; ruch wzdłuż tacki ją przewija)
  let trayDrag = null;
  function trayDown(e, k, btn) {
    A.init();
    if (e.pointerType === 'mouse') e.preventDefault();
    const vertTray = getComputedStyle($('tray')).flexDirection === 'column';
    trayDrag = { k, x: e.clientX, y: e.clientY, moved: false, el: null, scrolled: false };
    const mv = ev => {
      if (!trayDrag) return;
      const dx = ev.clientX - trayDrag.x, dy = ev.clientY - trayDrag.y;
      if (!trayDrag.moved && !trayDrag.scrolled && Math.hypot(dx, dy) > 10) {
        const towardBoard = ev.pointerType === 'mouse' ? true : vertTray ? dx > 0 && Math.abs(dx) > Math.abs(dy) : dy < 0 && Math.abs(dy) > Math.abs(dx);
        if (!towardBoard || !COMP.includes(k)) { trayDrag.scrolled = true; return; }
        trayDrag.moved = true;
        const el = document.createElement('div');
        el.className = 'drag-ico';
        el.innerHTML = U.icon(k);
        document.body.appendChild(el);
        trayDrag.el = el;
        setTool(k);
      }
      if (trayDrag.el) {
        trayDrag.el.style.transform = `translate(${ev.clientX - 32}px, ${ev.clientY - 72}px)`;
        const pk = S.pick(ev.clientX, ev.clientY - 40);
        if (overCanvas(ev) && pk.grid) {
          const e2 = C.nearestEdge(pk.grid.fc, pk.grid.fr);
          S.showGhost(k, e2.a, e2.b, canPlaceAt(k, e2.a, e2.b));
          trayDrag.edge = e2;
        } else { S.showGhost(null); trayDrag.edge = null; }
      }
    };
    const up = ev => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (!trayDrag) return;
      if (trayDrag.el) {
        trayDrag.el.remove();
        S.showGhost(null);
        if (ev.type !== 'pointercancel' && trayDrag.edge && overCanvas(ev)) placeComponent(k, trayDrag.edge.a, trayDrag.edge.b);
      } else if (!trayDrag.scrolled && ev.type !== 'pointercancel') {
        A.sfx('ui');
        setTool(k);
        if (TOOL_TIPS[k]) tip('info-' + k, TOOL_TIPS[k]);
        else if (COMP.includes(k)) tip('info-' + k, U.icon(k, 'ico-inline') + ' ' + Iskry.INFO[k] + ' Dotknij planszy między dwiema kropkami, żeby go postawić.');
      }
      trayDrag = null;
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }
  function overCanvas(e) {
    const r = $('c').getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }

  // ---------- stawianie, usuwanie, przesuwanie ----------
  function canPlaceAt(type, a, b, ignoreId) {
    const ex = atEdge(a, b);
    if (ex && ex.id !== ignoreId) {
      if (!(ex.type === 'wire' && !ex.locked && type !== 'wire')) return false;
    }
    if (type !== 'wire' && left(type) <= 0 && !ignoreId) return false;
    return true;
  }

  function placeComponent(type, a, b) {
    const ex = atEdge(a, b);
    if (left(type) <= 0) {
      A.sfx('error');
      U.say(st.mode === 'lab' ? 'Postaw go w zielonym miejscu.' : 'W tej misji nie ma już więcej elementów typu „' + TOOL_NAMES[type] + '”. Możesz przestawić te, które już stoją.', { mood: 'wow' });
      return false;
    }
    if (ex && !(ex.type === 'wire' && !ex.locked)) {
      A.sfx('error');
      tip('occupied', 'Tu już coś stoi! Wybierz wolne miejsce między dwiema kropkami.', 'wow', true);
      return false;
    }
    // w eksperymencie: tylko w zielonym miejscu i od razu w dobrą stronę
    let na = Math.min(a, b), nb = Math.max(a, b);
    const mv = st.puz && st.puz.move;
    if (mv && mv.do === 'add' && mv.type === type) {
      if (C.edgeKey(a, b) !== C.edgeKey(mv.a, mv.b)) {
        if (st.mode === 'lab') { A.sfx('error'); tip('spot', 'Postaw go w <b>zielonym miejscu</b>, które miga.', 'wow', true); return false; }
      } else { na = mv.a; nb = mv.b; }
    }
    pushHistory();
    if (ex) st.pieces = st.pieces.filter(p => p !== ex);
    const p = makePiece(type, na, nb);
    if (type === 'switch') p.on = false;
    st.pieces.push(p);
    A.sfx('place');
    buzzHand(12);
    changed();
    if (type === 'switch') tip('switchTap', 'Wyłącznik stoi! Na razie jest wyłączony – dźwignia w górze. Dotknij go, żeby go włączyć.', 'happy', true);
    if (type === 'tester') tip('testerTap', 'Stolik badacza stoi! Dotknij go, żeby zmienić przedmiot. Czy żarówka się zapali?', 'happy', true);
    // w misji po wyczerpaniu elementów wracamy do Rączki
    if (st.mode === 'mission' && left(type) <= 0) setTool('hand');
    return true;
  }

  function placeWire(a, b, color) {
    if (!C.adjacent(a, b)) return false;
    const ex = atEdge(a, b);
    if (ex) return false;
    st.pieces.push(makePiece('wire', Math.min(a, b), Math.max(a, b), { color }));
    A.sfx('snap');
    return true;
  }

  function removePiece(p, quiet) {
    if (!p) return false;
    if (p.locked) {
      if (!quiet) { A.sfx('error'); tip('locked', 'Ten element jest przykręcony na stałe 🔩 – nie da się go zabrać.', 'wow', true); }
      return false;
    }
    st.pieces = st.pieces.filter(x => x !== p);
    const w = S.worldOf(p.id);
    if (w) { w.y = 0.25; S.fx('star', w, 6); }
    A.sfx('erase');
    return true;
  }

  function flipPiece(p) {
    pushHistory();
    const t = p.a; p.a = p.b; p.b = t;
    A.sfx('flip');
    changed();
  }

  function cycleMaterial(p) {
    pushHistory();
    p.mat = ((p.mat || 0) + 1) % C.MATERIALS.length;
    A.sfx('pick');
    changed();
  }

  // ---------- zaznaczenie i dymek ----------
  function selectPiece(id) {
    const was = !$('bubble').hidden;
    st.selected = id;
    S.select(id);
    $('bubble').hidden = !id;
    bubbleKey = '';
    if (was !== !!id) requestAnimationFrame(layoutFrames);
    if (id) {
      if (compactMQ.matches) U.hushTransient();
      refreshBubble();
      if (st.puz && st.puz.phase === 'do' && st.puz.move.do === 'inspect' && id === st.puz.target) setTimeout(() => revealPuzzle(), 900);
    } else if (st.marksFrom === 'bubble') clearMarks();
  }

  function statusOf(p, r) {
    if (!r) return '';
    switch (p.type) {
      case 'battery': return r.short ? '🔥 Zwarcie! Bateria się grzeje.' : Math.abs(r.I) > 0.003 ? '⬆️ Daje iskierkom klocki energii.' : '⏸ Czeka – tor nie jest zamknięty.';
      case 'bulb': return p.burnt ? '💥 Przepalona! Naciśnij „Napraw”.' : r.glow > 0.9 ? '🌞 Świeci bardzo jasno!' : r.glow > 0.35 ? '💡 Świeci!' : r.on ? '🕯️ Świeci słabiutko.' : '⚫ Nie świeci.';
      case 'motor': return r.on ? (r.speed > 0 ? '↻ Kręci się w prawo' : '↺ Kręci się w lewo') + (Math.abs(r.speed) > 1.6 ? ' – TURBO! 🚀' : '.') : '⏸ Stoi.';
      case 'switch': return p.on ? '✅ Włączony – most opuszczony.' : '⛔ Wyłączony – most podniesiony.';
      case 'button': return p.on ? '✅ Wciśnięty – iskierki jadą!' : '👆 Przytrzymaj go, żeby włączyć.';
      case 'led': return p.burnt ? '💥 Przepalona! Naciśnij „Napraw”.' : r.reverse ? '🚫 Odwrócona – bramka zamknięta.' : r.tooSmall ? '🧱 Za małe klocki.' : r.on ? '✨ Świeci!' : '⚫ Nie świeci.';
      case 'buzzer': return r.on ? '🔔 BZZZ!' : '🤫 Cisza.';
      case 'resistor': return Math.abs(r.I) > 0.001 ? '🚧 Robi korek – iskierki zwalniają.' : '⏸ Pusta ścieżka.';
      case 'dimmer': { const v = p.val === undefined ? 0.5 : p.val; return v < 0.15 ? '🛣️ Ścieżka szeroka – prawie bez korka.' : v > 0.8 ? '🚧 Ścieżka bardzo wąska – duży korek!' : '🎛️ Ścieżka zwężona – mały korek.'; }
      case 'tester': { const m = C.MATERIALS[(p.mat || 0) % C.MATERIALS.length]; return m.e + ' Na stoliku: ' + m.n + '.'; }
      case 'wire': return Math.abs(r.I) > 0.002 ? '🏎️ Iskierki pędzą!' : (r.Va > 0.05 ? '🧱 Klocki czekają.' : '⏸ Pusty kabel.');
    }
    return '';
  }

  let bubbleKey = '';
  function refreshBubble() {
    const id = st.selected;
    const p = id && byId(id);
    if (!p) { $('bubble').hidden = true; if (st.marksFrom === 'bubble') clearMarks(); return; }
    const key = [id, p.type, p.burnt, p.on, p.locked, compactMQ.matches].join(':');
    if (key === bubbleKey) { refreshBubbleLive(); return; }
    bubbleKey = key;
    const btns = [];
    if (['battery', 'led', 'motor'].includes(p.type)) btns.push('<button data-act="flip">⇄ Odwróć</button>');
    if (p.type === 'led' || p.type === 'wire') btns.push('<button data-act="color">🎨 Kolor</button>');
    if (p.type === 'switch') btns.push(`<button data-act="toggle">${p.on ? '⛔ Wyłącz' : '✅ Włącz'}</button>`);
    if (p.type === 'tester') btns.push('<button data-act="mat" class="hot">🔄 Inny przedmiot</button>');
    if (p.burnt) btns.push('<button data-act="repair" class="hot">🔧 Napraw</button>');
    if (!p.locked) btns.push('<button data-act="del">🗑 Usuń</button>');
    const lesson = LESSON_OF[p.type];
    $('bubble').innerHTML = `
      <div class="bh">${U.icon(p.type, 'ico-b')}<b>${C.TYPES[p.type].name}${p.locked ? ' 🔩' : ''}</b>${compactMQ.matches ? '<button class="bx" data-act="info" aria-label="Co to jest?">ℹ️</button>' : ''}<button class="bx" data-act="close" aria-label="Zamknij">✕</button></div>
      <div class="bs" data-live="status"></div>
      <div class="why" data-live="why"></div>
      <div class="meters" data-live="meters"></div>
      ${p.type === 'dimmer' ? `<label class="dial">szeroko <input type="range" min="0" max="1" step="0.01" value="${p.val === undefined ? 0.5 : p.val}" aria-label="Szerokość ścieżki"> wąsko</label>` : ''}
      ${p.type === 'tester' ? '<div class="mats" data-live="mats"></div>' : ''}
      <div class="ba">${btns.join('')}</div>
      <p class="binfo">${Iskry.INFO[p.type]}${lesson !== undefined ? ` <button data-act="lesson">📖 Więcej</button>` : ''}</p>`;
    $('bubble').querySelectorAll('[data-act]').forEach(b => b.onclick = ev => { ev.stopPropagation(); bubbleAct(byId(id), b.dataset.act); });
    const range = $('bubble').querySelector('.dial input');
    if (range) {
      let pushed = false;
      range.addEventListener('pointerdown', () => { if (!pushed) { pushHistory(); pushed = true; } });
      range.addEventListener('input', () => { const q = byId(id); if (!q) return; q.val = +range.value; changed(false, true); });
      range.addEventListener('change', () => { pushed = false; if (st.mode === 'sandbox') { save.sandbox = st.pieces.map(clean); persist(); } });
    }
    refreshBubbleLive();
  }
  // części dymka zmieniające się na żywo (bez przebudowy przycisków i suwaka)
  function refreshBubbleLive() {
    const id = st.selected;
    const p = id && byId(id);
    const box = $('bubble');
    if (!p || box.hidden) return;
    const r = st.res && st.res.pieces[id];
    const volt = p.type === 'wire' ? (r ? Math.max(r.Va || 0, r.Vb || 0) : 0) : (r ? Math.abs(r.vd) : 0);
    const I = r ? Math.abs(r.I) : 0;
    const q = sel => box.querySelector(`[data-live="${sel}"]`);
    q('status').innerHTML = statusOf(p, r);
    const w = E.why(st.pieces, st.res, id);
    const why = q('why');
    if (w && w.text) { why.hidden = false; why.className = 'why ' + w.tone; why.innerHTML = w.text; } else why.hidden = true;
    q('meters').innerHTML = `
      <div class="meter m-v"><span>🧱 ${p.type === 'wire' ? 'Klocki na kablu' : 'Napięcie'}</span><b>${C.blocksText(volt)}</b><small>${C.fmt(volt, 2)} V</small></div>
      <div class="meter m-i"><span>🏎️ Prąd</span><b>${C.sparksText(I)}</b><small>${C.fmt(I, I < 0.1 ? 3 : 2)} A</small></div>`;
    const mats = q('mats');
    if (mats) {
      const cur = (p.mat || 0) % C.MATERIALS.length;
      mats.innerHTML = '<b style="width:100%;font-size:12px">Sprawdzone przedmioty:</b>' + C.MATERIALS.map((m, i) => save.mats[i] || i === cur
        ? `<span class="${!isFinite(m.R) ? 'no' : m.R > 1 ? 'weak' : 'yes'}">${m.e} ${!isFinite(m.R) ? '✗' : m.R > 1 ? '½' : '✓'}</span>` : '<span>❔</span>').join('');
    }
    st.bubbleMarks = w ? w.marks.filter(x => x.piece && x.piece !== id).map(x => x.piece) : [];
    if (!(st.puz && st.puz.phase !== 'show')) setMarks(w ? w.marks : null, 'bubble');
  }

  function bubbleAct(p, act) {
    A.init();
    if (!p) return;
    if (act === 'close') { A.sfx('ui'); selectPiece(null); return; }
    if (act === 'info') { $('bubble').classList.toggle('more'); return; }
    if (act === 'lesson') { A.sfx('ui'); U.openLessons(LESSON_OF[p.type]); return; }
    if (act === 'flip') flipPiece(p);
    if (act === 'toggle') toggleSwitch(p);
    if (act === 'mat') cycleMaterial(p);
    if (act === 'color') {
      pushHistory();
      p.color = (p.color + 1) % (p.type === 'led' ? P.LED_COLORS.length : P.WIRE_COLORS.length);
      A.sfx('pick'); changed();
    }
    if (act === 'repair') { pushHistory(); p.burnt = false; A.sfx('repair'); changed(); }
    if (act === 'del') { pushHistory(); if (removePiece(p)) { selectPiece(null); changed(); } }
  }

  function toggleSwitch(p) {
    pushHistory();
    p.on = !p.on;
    A.sfx(p.on ? 'swOn' : 'swOff');
    buzzHand(10);
    changed();
  }

  // ---------- miernik ----------
  function setProbes(a, b) {
    // czerwona sonda zawsze na wyższej wieży – wynik bez minusów
    if (a !== null && b !== null && st.res && st.res.raw(a) < st.res.raw(b)) { const t = a; a = b; b = t; }
    st.probes = [a, b];
    S.setProbes(a, b);
    refreshMeter();
  }
  function refreshMeter() {
    const box = $('meterBox');
    const [a, b] = st.probes;
    if (a === null || st.tool !== 'meter' || !st.res) { if (!box.hidden) { box.hidden = true; requestAnimationFrame(layoutFrames); } return; }
    box.hidden = false;
    if (b === null) { box.innerHTML = '<small>Miernik</small><em>Teraz dotknij drugiej kropki</em>'; requestAnimationFrame(layoutFrames); return; }
    const r = st.res;
    const on = n => r.nodeV.has(n);
    if (!on(a) || !on(b)) { box.innerHTML = '<small>Miernik</small><b>—</b><em>Sonda nie dotyka żadnego toru.</em>'; return; }
    if (r.island(a) !== r.island(b)) { box.innerHTML = '<small>Miernik</small><b>—</b><em>To dwa osobne kawałki toru – nic ich nie łączy.</em>'; return; }
    const dv = Math.abs(r.raw(a) - r.raw(b));
    const piece = atEdge(a, b);
    let note = dv < 0.05 ? 'Wieże są tej samej wysokości – brak napięcia.' : 'Tyle klocków różnicy jest między sondami.';
    if (piece && dv >= 0.05) {
      const pr = r.pieces[piece.id];
      if (C.isInput(piece) && !piece.on) note = 'Klocki czekają po obu stronach mostu: <b>napięcie jest, a prądu brak!</b>';
      else if (piece.type === 'battery') note = 'Tyle klocków bateria daje każdej iskierce.';
      else if (pr && Math.abs(pr.I) > 1e-3) note = 'Tyle klocków zostawia tu każda iskierka.';
    }
    if (piece && dv < 0.05 && piece.type === 'wire') note = 'Kabel prawie nie zabiera klocków.';
    box.innerHTML = `<small>Miernik 📏</small><b>${C.blocksText(dv)} · ${C.fmt(dv, 2)} V</b><em>${note}</em>`;
    requestAnimationFrame(layoutFrames);
    if (dv > 0.5) award('meter');
  }

  // ---------- zagadki i eksperymenty ----------
  function startExperiment(i) {
    const ex = EXPS[i];
    enterBoard('lab');
    st.exp = i; st.mission = null; st.history = []; st.wasShort = false;
    $('missionCard').hidden = true;
    $('modeLabel').textContent = '🔬 ' + ex.title;
    setPieces(ex.setup.map(x => Object.assign({}, x)));
    colorWires(ex.setup);
    if (ex.stacks && !st.showStacks) toggleStacks();
    st.puz = L.fromExperiment(ex, st.pieces, st.res);
    st.puz.phase = 'ask';
    buildTray();
    setTool('hand');
    renderPuz();
    layoutFrames();
  }
  function startPuzzle() {
    if (st.mode !== 'sandbox') return;
    selectPiece(null);
    const g = L.generate(st.pieces, st.res, st.recentPuz);
    if (!g) {
      U.say('Zbuduj obwód, w którym coś <b>działa</b> – najlepiej z dwiema żarówkami albo z wyłącznikiem – a ułożę ci zagadkę! 🧩', { mood: 'wow' });
      return;
    }
    st.recentPuz.push(g.key);
    if (st.recentPuz.length > 10) st.recentPuz.shift();
    st.puz = Object.assign(g, { phase: 'ask', snap: snapshot() });
    U.hush();
    renderPuz();
    layoutFrames();
  }
  function applyPuzMarks() {
    const pz = st.puz;
    if (!pz) return;
    const m = [];
    m.push({ piece: pz.target, kind: 'look' });
    // w wyniku plansza pokazuje to, o czym mówi wyjaśnienie (np. wykrzyknik na urwanym torze)
    if (pz.phase === 'show' && !pz.exp) {
      const w = E.why(st.pieces, st.res, pz.target);
      if (w) w.marks.forEach(x => { if (x.piece !== pz.target) m.push(x); });
    }
    if (pz.ref) m.push({ piece: pz.ref, kind: 'ref' });
    if (pz.phase !== 'show') {
      if (pz.move.do === 'add') m.push({ edge: [pz.move.a, pz.move.b], kind: 'spot' });
      else if (pz.move.id && pz.move.id !== pz.target) m.push({ piece: pz.move.id, kind: 'act' });
      else if (pz.move.id) m.push({ piece: pz.move.id, kind: 'act' });
    }
    S.setMarks(m);
    st.marksFrom = 'puz';
  }
  function renderPuz() {
    const pz = st.puz, card = $('puzCard');
    if (!pz) { card.hidden = true; return; }
    card.hidden = false;
    const ex = pz.exp;
    const steps = ['Zgadnij', 'Sprawdź', 'Zrozum'];
    const si = { ask: 0, do: 1, wait: 1, show: 2 }[pz.phase];
    if (pz.phase === 'wait') return;
    let body = '';
    if (pz.phase === 'ask') {
      body = `<p class="pz-q">${L.question(pz, st.pieces)}</p><div class="pz-opts">${L.options(pz).map(o => `<button data-k="${o.k}"><span>${optIcon(pz, o)}</span>${o.t}</button>`).join('')}</div>`;
    } else if (pz.phase === 'do') {
      body = `<p class="pz-guess">Twój typ: <b>${L.label(pz, pz.guess)}</b> · patrz na <span class="mk mk-b">niebieską ramkę</span></p><p class="pz-task">👉 ${L.task(pz.move, st.pieces)}</p>
        <div class="pz-btns"><button data-a="auto">🪄 Zrób to za mnie</button></div>`;
    } else {
      const right = pz.guess === pz.result;
      body = `<div class="pz-res"><span class="big-e">${right ? '🎉' : '🤯'}</span><b>${right ? 'Zgadłeś!' : 'Niespodzianka!'}</b></div>
        <p class="pz-guess" style="text-align:center">Wynik: <b>${L.label(pz, pz.result)}</b>${right ? '' : ` · twój typ: ${L.label(pz, pz.guess)}`}</p>
        ${pz.diff ? `<p class="pz-diff">${pz.diff}</p>` : ''}
        <p class="pz-exp">${pz.explain}</p>
        <div class="pz-btns">${ex
          ? `${st.exp + 1 < EXPS.length ? '<button class="primary" data-a="next">▶ Następny</button>' : '<button class="primary" data-a="list">🔬 Lista</button>'}<button data-a="again">↺ Jeszcze raz</button>`
          : '<button class="primary" data-a="new">❓ Nowa zagadka</button><button data-a="restore">↶ Przywróć obwód</button><button data-a="close">✓ Koniec</button>'}</div>`;
    }
    card.innerHTML = `<div class="pz-head"><span class="pz-emoji">${ex ? ex.emoji : '❓'}</span><div><small>${ex ? 'Eksperyment ' + (st.exp + 1) + ' z ' + EXPS.length : 'Zagadka Wolcika'}</small><b>${ex ? ex.title : 'Co się stanie, jeśli…?'}</b></div><button class="pz-x" data-a="x" aria-label="Zamknij">✕</button></div>
      <div class="pz-steps">${steps.map((s, i) => `<span class="${i === si ? 'on' : i < si ? 'done' : ''}">${i + 1}. ${s}</span>`).join('')}</div>${body}`;
    U.toastHold(pz.phase === 'ask');
    card.querySelectorAll('[data-k]').forEach(b => b.onclick = () => answerPuz(b.dataset.k));
    card.querySelectorAll('[data-a]').forEach(b => b.onclick = () => puzAction(b.dataset.a));
    applyPuzMarks();
    if (save.read && pz.phase !== 'do') A.speak((pz.phase === 'ask' ? L.question(pz, st.pieces) : pz.explain).replace(/<[^>]+>/g, ''));
  }
  // żarówka zgaszona / słabsza / jaśniejsza – czytelniej niż 🌑 🔅 🔆
  const BULB_ICO = {
    off: '<svg viewBox="0 0 32 32" class="opt-ico"><circle cx="16" cy="13" r="9" fill="#d5dcec" stroke="#8a93a8" stroke-width="2"/><rect x="12" y="22" width="8" height="6" rx="2" fill="#8a93a8"/></svg>',
    down: '<svg viewBox="0 0 32 32" class="opt-ico"><circle cx="16" cy="13" r="9" fill="#fff3a8" stroke="#d9b440" stroke-width="2"/><rect x="12" y="22" width="8" height="6" rx="2" fill="#8a93a8"/></svg>',
    up: '<svg viewBox="0 0 32 32" class="opt-ico"><g stroke="#ff9f1c" stroke-width="2.5" stroke-linecap="round"><path d="M16 1v3M4 13H1M31 13h-3M6 4l2 2M26 4l-2 2"/></g><circle cx="16" cy="13" r="9" fill="#ffd23f" stroke="#ff9f1c" stroke-width="2"/><rect x="12" y="22" width="8" height="6" rx="2" fill="#8a93a8"/></svg>',
  };
  const optIcon = (pz, o) => (pz.kind === 'bulb' && pz.before && pz.before.on && BULB_ICO[o.k]) || o.e;
  function answerPuz(k) {
    const pz = st.puz;
    if (!pz || pz.phase !== 'ask') return;
    A.sfx('pick');
    pz.guess = k;
    pz.phase = 'do';
    const tool = pz.move.do === 'inspect' ? 'hand' : L.tool(pz.move);
    if (st.mode === 'lab') buildTray();
    setTool(trayItems().includes(tool) ? tool : 'hand');
    renderPuz();
    if (pz.move.do === 'add') {
      const el = document.querySelector(`#tray .titem[data-tool="${pz.move.type}"]`);
      if (el) { el.classList.add('nudge'); setTimeout(() => el.classList.remove('nudge'), 3200); }
    }
  }
  function puzAction(a) {
    A.init(); A.sfx('ui');
    const pz = st.puz;
    if (a === 'x') { if (st.mode === 'lab') openLab(); else closePuz(); return; }
    if (a === 'auto' && pz) {
      const mv = pz.move, p = byId(mv.id);
      if (mv.do === 'inspect') { selectPiece(pz.target); return; }
      if (mv.do === 'add') { placeComponent(mv.type, mv.a, mv.b); return; }
      if (!p) return;
      pushHistory();
      if (mv.do === 'remove') { p.locked = false; removePiece(p, true); }
      if (mv.do === 'toggle') { p.on = !p.on; A.sfx(p.on ? 'swOn' : 'swOff'); }
      if (mv.do === 'flip') { const t = p.a; p.a = p.b; p.b = t; A.sfx('flip'); }
      if (mv.do === 'dial') p.val = mv.to;
      changed();
      return;
    }
    if (a === 'next') startExperiment(st.exp + 1);
    if (a === 'again') startExperiment(st.exp);
    if (a === 'list') openLab();
    if (a === 'new') startPuzzle();
    if (a === 'restore' && pz) { setPieces(JSON.parse(pz.snap)); closePuz(); }
    if (a === 'close') closePuz();
  }
  function closePuz(silent) {
    if (!st.puz) return;
    st.puz = null;
    U.toastHold(false);
    $('puzCard').hidden = true;
    S.setMarks(null); st.marksFrom = null;
    if (!silent) layoutFrames();
  }
  let revealT = null;
  function checkPuzzle() {
    const pz = st.puz;
    if (!pz || pz.phase !== 'do' || pz.move.do === 'inspect') return;
    if (!L.done(st.pieces, pz.move)) return;
    pz.phase = 'wait';
    if (compactMQ.matches) { selectPiece(null); U.hushTransient(); }
    clearTimeout(revealT);
    revealT = setTimeout(revealPuzzle, 1300); // chwila, żeby zobaczyć efekt na planszy
  }
  function revealPuzzle() {
    const pz = st.puz;
    if (!pz || pz.phase === 'show') return;
    let result = pz.answer;
    if (pz.kind !== 'cmpI' && pz.kind !== 'cmpV') {
      const t = byId(pz.target);
      if (t) result = L.classify(pz.kind, pz.before, L.measure(t, st.res.pieces[t.id]));
    }
    pz.result = result;
    pz.phase = 'show';
    if (compactMQ.matches || pz.move.do !== 'inspect') selectPiece(null);
    {
      const t = byId(pz.target), r = t && st.res.pieces[t.id];
      if (pz.kind === 'cmpI' || pz.kind === 'cmpV') {
        const ref = byId(pz.ref), rr = ref && st.res.pieces[ref.id];
        const val = x => pz.kind === 'cmpI' ? C.sparksText(x.I) : C.blocksText(Math.max(x.Va || 0, x.Vb || 0));
        if (r && rr) pz.diff = `Przed żarówką: <b>${val(rr)}</b> · za żarówką: <b>${val(r)}</b>`;
      } else if (t) {
        const fmt = m => pz.kind === 'battery' ? C.sparksText(m.v) : !m.on ? 'nie działa' : pz.kind === 'motor' ? `${m.v > 0 ? '↻' : '↺'} ${Math.round(Math.abs(m.v) * 100)}% obrotów` : pz.kind === 'buzzer' ? `🔔 ${Math.round(m.v * 100)}% głośności` : `💡 ${Math.round(Math.min(1.6, m.v) * 100)}% jasności`;
        pz.diff = `Przed: <b>${fmt(pz.before)}</b> → po: <b>${fmt(L.measure(t, r))}</b>`;
      }
    }
    const right = pz.guess === result;
    if (pz.exp) pz.explain = pz.exp.explain;
    else {
      const w = E.why(st.pieces, st.res, pz.target);
      pz.explain = (w ? w.text : '') || '';
    }
    if (right) {
      A.sfx('success'); U.confetti(70); U.dance();
      save.oracle = (save.oracle || 0) + 1;
      if (save.oracle >= 5) award('oracle');
    } else A.sfx('flip');
    if (pz.exp) {
      const prev = save.lab[pz.exp.id] || {};
      save.lab[pz.exp.id] = { done: 1, right: prev.right || right };
      if (Object.keys(save.lab).length >= 5) award('scientist');
      if (EXPS.every(e => save.lab[e.id])) award('professor');
    }
    persist();
    renderPuz();
    layoutFrames();
  }

  function openLab() {
    closePuz(true);
    const grid = $('labGrid');
    grid.innerHTML = EXPS.map((e, i) => {
      const s = save.lab[e.id];
      return `<button class="mtile ltile ${s ? 'done' : ''}" data-i="${i}"><span class="mnum">${i + 1}</span><span class="memo">${e.emoji}</span><b>${e.title}</b><span class="lstat">${s ? (s.right ? '🎯 zgadnięte' : '✔ sprawdzone') : 'nowy'}</span></button>`;
    }).join('');
    grid.querySelectorAll('.ltile').forEach(b => b.onclick = () => { A.init(); A.sfx('ui'); startExperiment(+b.dataset.i); });
    U.show('labScreen');
  }

  // ---------- kadrowanie: plansza w wolnej części sceny ----------
  let sideWidth = 70;
  function layoutFrames() {
    const stage = $('stage');
    const sr = stage.getBoundingClientRect();
    if (!sr.width) return;
    const rel = el => { const r = el.getBoundingClientRect(); return { l: r.left - sr.left, t: r.top - sr.top, r: r.right - sr.left, b: r.bottom - sr.top, w: r.width, h: r.height }; };
    const base = { l: 4, t: 4, r: 4, b: 4 };
    if (st.mode === 'home') {
      const c = !$('home').hidden ? document.querySelector('#home .home-card').getBoundingClientRect() : null;
      if (c) base.b = Math.max(base.b, sr.bottom - c.top + 8);
      base.t = Math.max(base.t, 6);
      S.setFrames([base]);
      return;
    }
    const side = $('side');
    const s = rel(side);
    sideWidth = s.w + 10;
    if (portraitMQ.matches) base.b = Math.max(base.b, sr.height - s.t + 4);
    else base.r = Math.max(base.r, sr.width - s.l + 4);
    const bub = $('bubble'), mb = $('meterBox');
    if (portraitMQ.matches && !bub.hidden) base.b = Math.max(base.b, sr.height - rel(bub).t + 4);
    if (portraitMQ.matches && !mb.hidden) base.b = Math.max(base.b, sr.height - rel(mb).t + 4);
    if (landMQ.matches && !bub.hidden) base.r = Math.max(base.r, sr.width - rel(bub).l + 4);
    const leg = $('legend');
    if (getComputedStyle(leg).display !== 'none') base.b = Math.max(base.b, sr.height - rel(leg).t + 2);
    const card = !$('puzCard').hidden ? $('puzCard') : !$('missionCard').hidden ? $('missionCard') : null;
    if (!card) { S.setFrames([base]); return; }
    const c = rel(card);
    S.setFrames([
      Object.assign({}, base, { t: Math.max(base.t, c.b + 6) }),
      Object.assign({}, base, { l: Math.max(base.l, c.r + 6) }),
    ]);
  }
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => layoutFrames());
    ['stage', 'missionCard', 'puzCard', 'side', 'bubble'].forEach(id => ro.observe($(id)));
  }
  window.addEventListener('resize', () => { layoutFrames(); bubbleKey = ''; refreshBubble(); });

  // ---------- wskaźnik na planszy ----------
  const canvas = $('c');
  const ptrs = new Map();
  let g = null; // bieżący gest
  let lastTap = { t: 0, x: 0, y: 0 };

  function pinchInfo() {
    const v = [...ptrs.values()];
    return { d: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y), x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
  }
  function cancelGesture() {
    if (g && g.kind === 'press') { g.p.on = false; changed(false); }
    if (g && (g.kind === 'move' || g.kind === 'place')) S.showGhost(null);
    if (g && g.kind === 'wire' && g.placed) changed();
    g = null;
  }

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    A.init();
    if (st.mode === 'home') return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    $('side').classList.remove('open');
    U.hushTransient();
    if (ptrs.size === 2) { cancelGesture(); const pi = pinchInfo(); g = { kind: 'pinch', d: pi.d, x: pi.x, y: pi.y }; return; }
    if (ptrs.size > 2) return;
    const x = e.clientX, y = e.clientY;
    if (e.button === 2) { g = { kind: 'orbit', x, y }; return; }
    if (e.button === 1) { g = { kind: 'pan', x, y }; return; }
    const pk = S.pick(x, y);
    const tool = st.tool;
    const hit = pk.pid && byId(pk.pid);
    // wyłączniki, przyciski i stolik działają w każdym narzędziu (oprócz gumki i miernika)
    if (hit && tool !== 'erase' && tool !== 'meter' && (C.isInput(hit) || hit.type === 'tester')) {
      if (hit.type === 'button') { hit.on = true; A.sfx('swOn'); buzzHand(10); changed(false); g = { kind: 'press', p: hit, x, y }; return; }
      g = { kind: 'pieceDown', p: hit, x, y };
      return;
    }
    if (tool === 'hand') {
      g = hit ? { kind: 'pieceDown', p: hit, x, y } : { kind: 'emptyDown', x, y };
    } else if (tool === 'wire') {
      if (!pk.grid) return;
      const nn = C.nearestNode(pk.grid.fc, pk.grid.fr);
      g = { kind: 'wire', last: nn.d < 0.42 ? nn.n : null, x, y, moved: false, placed: 0, color: st.wireColor, grid: pk.grid, hist: snapshot(), hit };
    } else if (tool === 'erase') {
      g = { kind: 'erase', x, y, hist: snapshot(), removed: 0 };
      eraseAt(pk);
    } else if (tool === 'meter') {
      g = { kind: 'meter', x, y, moved: false, hit, start: pk.grid ? C.nearestNode(pk.grid.fc, pk.grid.fr) : null };
    } else {
      g = { kind: 'place', x, y };
      if (pk.grid) { const ed = C.nearestEdge(pk.grid.fc, pk.grid.fr); S.showGhost(tool, ed.a, ed.b, canPlaceAt(tool, ed.a, ed.b)); }
    }
  });

  function eraseAt(pk) {
    let p = pk.pid && byId(pk.pid);
    if (!p && pk.grid) {
      const ed = C.nearestEdge(pk.grid.fc, pk.grid.fr);
      if (ed.d < 0.3) p = atEdge(ed.a, ed.b);
    }
    if (p && removePiece(p, g && g.removed > 0)) { g.removed++; changed(); }
  }

  canvas.addEventListener('pointermove', e => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (st.mode === 'home') return;
    if (!g) { hover(e); return; }
    const x = e.clientX, y = e.clientY;
    const moved = Math.hypot(x - g.x, y - g.y);
    switch (g.kind) {
      case 'pinch': {
        if (ptrs.size < 2) return;
        const pi = pinchInfo();
        S.zoomBy(g.d / Math.max(10, pi.d));
        S.pan(g.x, g.y, pi.x, pi.y);
        g.d = pi.d; g.x = pi.x; g.y = pi.y;
        break;
      }
      case 'orbit':
        S.orbit(x - g.x, y - g.y); g.x = x; g.y = y;
        break;
      case 'pan':
        S.pan(g.x, g.y, x, y); g.x = x; g.y = y;
        break;
      case 'emptyDown':
        if (moved > 8) { g = { kind: 'orbit', x, y }; }
        break;
      case 'pieceDown':
        if (moved > 10) {
          if (g.p.locked) { g = { kind: 'orbit', x, y }; tip('locked', 'Ten element jest przykręcony na stałe 🔩. Możesz go dotknąć, żeby zobaczyć, co się w nim dzieje.', 'wow'); }
          else if (st.tool === 'hand') { g = { kind: 'move', p: g.p, x, y }; A.sfx('pick'); selectPiece(null); }
          else g = { kind: 'orbit', x, y };
        }
        break;
      case 'move': {
        const pk = S.pick(x, y);
        if (!pk.grid) break;
        const ed = C.nearestEdge(pk.grid.fc, pk.grid.fr);
        g.edge = ed;
        S.showGhost(g.p.type, ed.a, ed.b, canPlaceAt(g.p.type, ed.a, ed.b, g.p.id));
        break;
      }
      case 'wire': wireMove(x, y); break;
      case 'erase': eraseAt(S.pick(x, y)); break;
      case 'meter': {
        const pk = S.pick(x, y);
        if (!pk.grid || !g.start || moved < 8) break;
        g.moved = true;
        const nn = C.nearestNode(pk.grid.fc, pk.grid.fr);
        if (nn.n !== g.start.n) { st.probes = [g.start.n, nn.n]; S.setProbes(g.start.n, nn.n); refreshMeter(); }
        break;
      }
      case 'place': {
        const pk = S.pick(x, y);
        if (pk.grid) { const ed = C.nearestEdge(pk.grid.fc, pk.grid.fr); S.showGhost(st.tool, ed.a, ed.b, canPlaceAt(st.tool, ed.a, ed.b)); }
        break;
      }
    }
  });

  function wireMove(x, y) {
    const pk = S.pick(x, y);
    if (!pk.grid) return;
    if (Math.hypot(x - g.x, y - g.y) > 6) g.moved = true;
    const nn = C.nearestNode(pk.grid.fc, pk.grid.fr);
    if (nn.d > 0.42) return;
    if (g.last === null) { g.last = nn.n; return; }
    let guard = 0;
    while (g.last !== nn.n && guard++ < 30) {
      const a = C.cr(g.last), b = C.cr(nn.n);
      let step;
      if (Math.abs(b.c - a.c) >= Math.abs(b.r - a.r)) step = C.node(a.c + Math.sign(b.c - a.c), a.r);
      else step = C.node(a.c, a.r + Math.sign(b.r - a.r));
      if (placeWire(g.last, step, g.color)) {
        if (!g.placed) st.history.push(g.hist);
        g.placed++;
        S.sync(st.pieces);
      }
      g.last = step;
    }
  }

  function endPointer(e) {
    ptrs.delete(e.pointerId);
    if (!g) return;
    if (g.kind === 'pinch') { if (ptrs.size === 0) g = null; return; }
    const x = e.clientX, y = e.clientY;
    switch (g.kind) {
      case 'press':
        g.p.on = false; A.sfx('swOff'); changed(false);
        break;
      case 'pieceDown': {
        const p = g.p;
        if (p.type === 'switch') { toggleSwitch(p); if (st.tool === 'hand' && !compactMQ.matches && !st.done) selectPiece(p.id); }
        else if (p.type === 'tester') { cycleMaterial(p); selectPiece(p.id); }
        else if (p.burnt) { pushHistory(); p.burnt = false; A.sfx('repair'); changed(); selectPiece(p.id); }
        else { A.sfx('ui'); selectPiece(st.selected === p.id ? null : p.id); }
        break;
      }
      case 'emptyDown': {
        selectPiece(null);
        const now = performance.now();
        if (now - lastTap.t < 400 && Math.hypot(x - lastTap.x, y - lastTap.y) < 30) { S.resetView(); A.sfx('ui'); lastTap.t = 0; }
        else lastTap = { t: now, x, y };
        break;
      }
      case 'move': {
        S.showGhost(null);
        const ed = g.edge;
        if (ed && canPlaceAt(g.p.type, ed.a, ed.b, g.p.id)) {
          pushHistory();
          const ex = atEdge(ed.a, ed.b);
          if (ex && ex !== g.p) st.pieces = st.pieces.filter(q => q !== ex);
          const rev = g.p.a > g.p.b;
          const lo = Math.min(ed.a, ed.b), hi = Math.max(ed.a, ed.b);
          g.p.a = rev ? hi : lo; g.p.b = rev ? lo : hi;
          A.sfx('place');
          changed();
        } else if (ed) A.sfx('error');
        break;
      }
      case 'wire':
        if (!g.moved && !g.placed) {
          // stuknięcie w element w trybie kabla otwiera jego dymek
          if (g.hit && g.hit.type !== 'wire') { A.sfx('ui'); selectPiece(g.hit.id); break; }
          if (g.grid) {
            const ed = C.nearestEdge(g.grid.fc, g.grid.fr);
            if (!atEdge(ed.a, ed.b)) { pushHistory(); placeWire(ed.a, ed.b, g.color); }
            else if (g.hit) { A.sfx('ui'); selectPiece(g.hit.id); break; }
            else A.sfx('error');
          }
        }
        st.wireColor = (st.wireColor + 1) % P.WIRE_COLORS.length;
        changed();
        break;
      case 'erase':
        if (g.removed) st.history.push(g.hist);
        break;
      case 'meter': {
        if (g.moved) { setProbes(st.probes[0], st.probes[1]); A.sfx('snap'); break; }
        if (g.hit && g.hit.type !== 'wire') { setProbes(g.hit.a, g.hit.b); A.sfx('snap'); break; }
        if (!g.start || g.start.d > 0.45) {
          if (g.hit) { setProbes(g.hit.a, g.hit.b); A.sfx('snap'); }
          break;
        }
        const [a, b] = st.probes;
        if (a !== null && b === null && a !== g.start.n) setProbes(a, g.start.n);
        else setProbes(g.start.n, null);
        A.sfx('snap');
        break;
      }
      case 'place': {
        S.showGhost(null);
        const pk = S.pick(x, y);
        const hit = pk.pid && byId(pk.pid);
        if (hit && hit.type !== 'wire') { A.sfx('ui'); selectPiece(hit.id); break; }
        if (pk.grid) { const ed = C.nearestEdge(pk.grid.fc, pk.grid.fr); placeComponent(st.tool, ed.a, ed.b); }
        break;
      }
    }
    g = null;
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); cancelGesture(); });
  canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !g) S.showGhost(null); });

  function hover(e) {
    if (e.pointerType !== 'mouse') return;
    const pk = S.pick(e.clientX, e.clientY);
    const hit = pk.pid && byId(pk.pid);
    if (COMP.includes(st.tool) && pk.grid && !(hit && hit.type !== 'wire')) {
      const ed = C.nearestEdge(pk.grid.fc, pk.grid.fr);
      S.showGhost(st.tool, ed.a, ed.b, canPlaceAt(st.tool, ed.a, ed.b));
    } else if (st.tool === 'wire' && pk.grid && !(hit && hit.type !== 'wire')) {
      const ed = C.nearestEdge(pk.grid.fc, pk.grid.fr);
      S.showGhost('wire', ed.a, ed.b, !atEdge(ed.a, ed.b));
    } else S.showGhost(null);
    canvas.style.cursor = st.tool === 'hand' ? (pk.pid ? 'pointer' : 'grab') : st.tool === 'erase' ? (pk.pid ? 'not-allowed' : 'default') : (hit && (C.isInput(hit) || hit.type !== 'wire')) ? 'pointer' : 'crosshair';
  }

  canvas.addEventListener('wheel', e => { e.preventDefault(); S.zoomBy(e.deltaY > 0 ? 1.08 : 0.93); }, { passive: false });

  // ---------- przyciski boczne ----------
  function sideBtn(id, fn) { $(id).addEventListener('click', () => { A.init(); A.sfx('ui'); fn(); }); }
  function toggleStacks() {
    st.showStacks = !st.showStacks; S.setShowStacks(st.showStacks);
    $('vStacks').classList.toggle('on', st.showStacks);
  }
  sideBtn('vStacks', () => {
    toggleStacks();
    if (st.showStacks) { award('stacks'); tip('stacks', '🧱 Wieże klocków pokazują <b>napięcie</b> w każdym miejscu toru. Przy plusie baterii wieża jest wysoka, a każda żarówka czy silniczek zabiera iskierkom klocki – za nimi wieże są niższe.'); }
  });
  sideBtn('vSparks', () => { st.showSparks = !st.showSparks; S.setShowSparks(st.showSparks); $('vSparks').classList.toggle('on', st.showSparks); });
  sideBtn('vPuzzle', startPuzzle);
  sideBtn('vRotL', () => S.rotate(-Math.PI / 4));
  sideBtn('vRotR', () => S.rotate(Math.PI / 4));
  sideBtn('vZoomIn', () => S.zoomBy(0.85));
  sideBtn('vZoomOut', () => S.zoomBy(1.15));
  sideBtn('vTop', () => S.topView());
  sideBtn('vReset', toggleFullView);
  sideBtn('vUndo', undo);
  sideBtn('vMoreBtn', () => { const o = $('side').classList.toggle('open'); $('vMoreBtn').setAttribute('aria-expanded', o); });
  sideBtn('vClear', () => {
    $('side').classList.remove('open');
    if (st.mode === 'mission') {
      U.modal('<h2>Zacząć misję od nowa?</h2><p>Plansza wróci do początku. Gwiazdki z podpowiedzi zostaną policzone tak jak teraz.</p>',
        [{ label: '↺ Od nowa', cls: 'primary', fn: () => { const h = st.hints, f = st.freeHint; startMission(st.mIdx); st.hints = h; st.freeHint = f; updateHintLabel(); } }, { label: 'Nie' }]);
    } else if (st.mode === 'lab') {
      startExperiment(st.exp);
    } else {
      U.modal('<h2>Wyczyścić planszę?</h2><p>Wszystkie elementy znikną. (Możesz to potem cofnąć przyciskiem ↶.)</p>',
        [{ label: '🧹 Wyczyść', cls: 'primary', fn: () => { pushHistory(); closePuz(); st.pieces = []; selectPiece(null); A.sfx('erase'); changed(); } }, { label: 'Nie' }]);
    }
  });
  function undo() {
    const h = st.history.pop();
    if (!h) { A.sfx('error'); return; }
    st.pieces = JSON.parse(h);
    selectPiece(null);
    changed();
  }

  $('mcHint').onclick = () => { A.init(); showHint(); };
  $('mcHintMini').onclick = () => { A.init(); showHint(); };
  $('mcRestart').onclick = () => $('vClear').click();
  $('mcToggle').onclick = () => {
    A.sfx('ui');
    const c = $('missionCard');
    c.classList.toggle('min');
    $('mcToggle').setAttribute('aria-expanded', !c.classList.contains('min'));
    layoutFrames();
  };

  // ---------- ekrany ----------
  function openMap() {
    const grid = $('mapGrid');
    grid.innerHTML = MISSIONS.map((m, i) => {
      const s = save.stars[m.id] || 0;
      const nextUp = !s && MISSIONS.slice(0, i).every(x => save.stars[x.id]);
      return `<button class="mtile ${s ? 'done' : ''} ${nextUp ? 'next' : ''}" data-i="${i}">
        <span class="mnum">${i + 1}</span><span class="memo">${m.emoji}</span><b>${m.title}</b>
        <span class="mstars">${[0, 1, 2].map(k => `<i class="${k < s ? 'got' : ''}">★</i>`).join('')}</span></button>`;
    }).join('');
    grid.querySelectorAll('.mtile').forEach(b => b.onclick = () => { A.init(); A.sfx('ui'); startMission(+b.dataset.i); });
    U.show('map');
  }
  function openAlbum() {
    const ts = totalStars();
    $('stickers').innerHTML = MISSIONS.map(m => `<div class="sticker ${save.stars[m.id] ? 'got' : ''}" title="${m.title}"><span>${save.stars[m.id] ? m.emoji : '❔'}</span><small>${m.title}</small></div>`).join('');
    $('badges').innerHTML = Iskry.BADGES.map(b => `<div class="badge ${save.badges[b.id] ? 'got' : ''}"><span>${save.badges[b.id] ? b.e : '🔒'}</span><b>${b.t}</b><small>${b.d}</small></div>`).join('');
    $('themes').innerHTML = Iskry.THEMES.map(t => {
      const ok = ts >= t.stars;
      return `<button class="theme ${save.theme === t.id ? 'sel' : ''} ${ok ? '' : 'locked'}" data-t="${t.id}" style="--tb:#${t.board.toString(16).padStart(6, '0')};--tbg:${t.bg}">
        <span class="tprev"><i></i></span><b>${t.name}</b><small>${ok ? (save.theme === t.id ? 'wybrana' : 'wybierz') : '🔒 ' + t.stars + ' ⭐'}</small></button>`;
    }).join('');
    $('themes').querySelectorAll('.theme').forEach(b => b.onclick = () => {
      const t = Iskry.THEMES.find(x => x.id === b.dataset.t);
      if (ts < t.stars) { A.sfx('error'); return; }
      A.sfx('pick'); save.theme = t.id; persist(); applyTheme(); openAlbum();
    });
    U.show('album');
  }
  function applyTheme() {
    const t = Iskry.THEMES.find(x => x.id === save.theme) || Iskry.THEMES[0];
    document.body.style.background = t.bg;
    document.body.classList.toggle('dark', !!t.dark);
    S.setTheme(t);
  }
  function openParents() {
    U.modal(`<h2>👪 Dla rodziców i nauczycieli</h2>
      <p><b>Bezpiecznie:</b> Iskrolandia działa w całości w przeglądarce. Nie łączy się z internetem, nie ma reklam, kont, zakupów ani linków na zewnątrz. Postęp (gwiazdki, odznaki, eksperymenty, plansza z piaskownicy) zapisuje się tylko na tym urządzeniu.</p>
      <p><b>Czego uczy:</b> obwód zamknięty i otwarty, prąd i napięcie (przez metafory wyścigu iskierek i klocków energii), opór, połączenia szeregowe i równoległe, kierunek prądu, dioda jako zawór jednokierunkowy, przewodniki i izolatory, bramki logiczne I/LUB, zwarcie i zasady bezpieczeństwa.</p>
      <p><b>Jak uczy:</b> Wolcik-detektyw tłumaczy, <i>dlaczego</i> konkretny element w obwodzie dziecka działa albo nie, i pokazuje przyczynę na planszy. Laboratorium (14 eksperymentów) i zagadki w piaskownicy działają według schematu „przewiduję – sprawdzam – wyjaśniam”, który najskuteczniej prostuje typowe błędne przekonania (np. że żarówka „zużywa” prąd albo że odwrócona bateria zgasi żarówkę).</p>
      <p><b>Fizyka pod spodem jest prawdziwa:</b> obwód liczony jest prawem Ohma i prawami Kirchhoffa (analiza węzłowa). Bateria to 1,5 V z małym oporem wewnętrznym, żarówka 5 Ω, silniczek 4 Ω, brzęczyk 15 Ω, opornik 50 Ω, ściemniacz 0–10 Ω, dioda LED ok. 1,8 V. Miernik pokazuje napięcie między dowolnymi dwoma punktami. Liczby w woltach i amperach są widoczne w dymku każdego elementu. Uproszczenie: iskierki płyną umownym kierunkiem prądu (od + do −), a elektrony w drucie płyną odwrotnie.</p>
      <p><b>Sterowanie:</b> dotyk, mysz i klawiatura (1–0 narzędzia, Ctrl+Z cofnij, R odwróć, Delete usuń, Esc zamknij). Dwa palce przesuwają i przybliżają planszę, przeciągnięcie po pustym miejscu ją obraca, podwójne stuknięcie wyśrodkowuje. Myszą: prawy przycisk obraca, środkowy przesuwa, kółko przybliża.</p>
      <label class="chk"><input type="checkbox" id="optRead" ${save.read ? 'checked' : ''}> Wolcik czyta swoje dymki na głos (jeśli przeglądarka ma polski głos)</label>`,
      [{ label: 'Zamknij', cls: 'primary' }, {
        label: '🗑 Wyzeruj postęp', fn: () => U.modal('<h2>Na pewno?</h2><p>Znikną wszystkie gwiazdki, odznaki, eksperymenty i plansza z piaskownicy.</p>',
          [{ label: 'Tak, wyzeruj', cls: 'primary', fn: () => { save = Object.assign(fresh(), { muted: save.muted, read: save.read }); persist(); applyTheme(); updateStars(); } }, { label: 'Nie' }]),
      }]);
    $('optRead').onchange = e => { save.read = e.target.checked; U.setReadAloud(save.read); persist(); };
  }

  $('btnHome').onclick = () => { A.sfx('ui'); goHome(); };
  $('btnLearn').onclick = () => { A.init(); A.sfx('ui'); U.openLessons(0); };
  $('btnLab').onclick = () => { A.init(); A.sfx('ui'); openLab(); };
  $('btnMap').onclick = () => { A.init(); A.sfx('ui'); openMap(); };
  $('btnAlbum').onclick = () => { A.init(); A.sfx('ui'); openAlbum(); };
  $('btnSound').onclick = () => {
    A.init();
    save.muted = !save.muted; A.setMuted(save.muted); persist();
    $('soundIcon').textContent = save.muted ? '🔇' : '🔊';
  };
  $('goMissions').onclick = () => { A.init(); A.sfx('ui'); openMap(); };
  $('goSandbox').onclick = () => { A.init(); A.sfx('ui'); startSandbox(); };
  $('goLab').onclick = () => { A.init(); A.sfx('ui'); openLab(); };
  $('goLearn').onclick = () => { A.init(); A.sfx('ui'); U.openLessons(0); };
  $('goAlbum').onclick = () => { A.init(); A.sfx('ui'); openAlbum(); };
  $('goParents').onclick = () => { A.init(); A.sfx('ui'); openParents(); };
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => {
    A.sfx('ui'); A.stopSpeak();
    U.hide(b.closest('.screen').id);
  });
  // lekcja → eksperyment z tą zasadą
  U.lessonTry = i => EXPS.findIndex(e => e.lesson === i);
  U.onTry = i => { const k = U.lessonTry(i); if (k >= 0) { A.stopSpeak(); startExperiment(k); } };

  U.onMascot = () => {
    A.init();
    if (st.puz) { U.say(st.puz.phase === 'ask' ? L.question(st.puz, st.pieces) : st.puz.phase === 'show' ? st.puz.explain : L.task(st.puz.move, st.pieces), { mood: 'happy' }); return; }
    if (st.mode === 'mission' && st.done) { U.say('Brawo! Ta misja jest zrobiona 🌟', { mood: 'happy' }); return; }
    const o = E.overview(st.pieces, st.res);
    if (o && o.tone !== 'good') {
      setMarks(o.marks, 'wolcik');
      U.say('🔍 ' + o.text, { mood: 'detect', ms: 16000 });
      $('wolcikBadge').hidden = true;
      return;
    }
    if (st.mode === 'mission') { U.say(st.mission.intro, { stay: true }); return; }
    const ideas = ['Naciśnij <b>❓ Zagadka</b> – ułożę ci pytanie z twojego obwodu!', 'Włącz „Klocki” i zobacz wieże napięcia! 🧱', 'Co się stanie, gdy postawisz 4 baterie jedna za drugą? 🗼', 'Wstaw <b>stolik badacza</b> i sprawdź, czy klucz przewodzi prąd. A kaczuszka? 🦆', 'Postaw <b>ściemniacz</b> obok żarówki i kręć suwakiem! 🎛️', 'Weź <b>miernik</b> i zmierz napięcie na wyłączonym wyłączniku. Zaskoczenie! 📏'];
    setMarks(o ? o.marks : null, 'wolcik');
    U.say((o ? o.text + ' ' : '') + ideas[Math.floor(Math.random() * ideas.length)], { mood: 'happy' });
  };

  // ---------- klawiatura ----------
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Escape') {
      const open = ['modal', 'lessons', 'album', 'map', 'labScreen'].find(id => !$(id).hidden);
      if (open) { U.hide(open); A.stopSpeak(); return; }
      if (st.selected) { selectPiece(null); return; }
      setTool('hand');
      return;
    }
    if (st.mode === 'home') return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
    const p = st.selected && byId(st.selected);
    if ((e.key === 'Delete' || e.key === 'Backspace') && p) { pushHistory(); if (removePiece(p)) { selectPiece(null); changed(); } return; }
    if (e.key.toLowerCase() === 'r' && p && ['battery', 'led', 'motor'].includes(p.type)) { flipPiece(p); return; }
    if (/^[0-9]$/.test(e.key)) {
      const items = trayItems();
      const i = e.key === '0' ? 9 : +e.key - 1;
      if (items[i]) { A.init(); A.sfx('ui'); setTool(items[i]); }
    }
  });

  // ---------- pętla ----------
  let last = performance.now();
  function place(el, sx, sy, gap) {
    const stage = $('stage');
    const W = stage.clientWidth, H = stage.clientHeight;
    const bw = el.offsetWidth, bh = el.offsetHeight;
    const x = Math.max(8, Math.min(W - bw - 8, sx - bw / 2));
    const y = Math.max(8, Math.min(H - bh - 8, sy - bh - gap));
    el.style.transform = `translate(${x}px, ${y}px)`;
  }
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  let lastTouch = 0, lastDraw = 0;
  window.addEventListener('pointerdown', () => { lastTouch = performance.now(); S.wake(); }, true);
  window.addEventListener('pointermove', () => { lastTouch = performance.now(); }, true);
  function frame(now) {
    requestAnimationFrame(frame);
    // nic się nie rusza – nie rysujemy (oszczędza baterię); w spokoju na telefonie 30 kl/s
    if (!S.isBusy() && !g && !ptrs.size) { last = now; A.setContinuous(0, 0); return; }
    if (coarse && !g && !ptrs.size && now - lastTouch > 2000 && now - lastDraw < 30) return;
    lastDraw = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    S.render(dt, now / 1000);
    // dymek nad elementem (na telefonie pionowo jest panelem na dole)
    const sideW = portraitMQ.matches ? 0 : sideWidth;
    if (st.selected && !portraitMQ.matches && !landMQ.matches) {
      const sp = S.screenOf(st.selected, 0.75);
      const b = $('bubble');
      if (sp && !sp.behind) {
        const bw = b.offsetWidth, bh = b.offsetHeight;
        const stage = $('stage');
        const W = stage.clientWidth - sideW, H = stage.clientHeight;
        const low = S.screenOf(st.selected, 0);
        const cand = [
          [sp.x - bw / 2, sp.y - bh - 14],
          [sp.x + 50, (sp.y + low.y) / 2 - bh / 2],
          [sp.x - bw - 50, (sp.y + low.y) / 2 - bh / 2],
          [sp.x - bw / 2, low.y + 30],
        ];
        // dymek nie zasłania elementów, które właśnie pokazuje (znaczniki „dlaczego”)
        const avoid = (st.bubbleMarks || []).map(id => S.screenOf(id, 0.2)).filter(Boolean);
        const free = ([x, y]) => !avoid.some(q => q.x > x - 20 && q.x < x + bw + 20 && q.y > y - 20 && q.y < y + bh + 20);
        const fits = ([x, y]) => x >= 8 && y >= 8 && x + bw <= W - 8 && y + bh <= H - 8;
        const pos = cand.find(c => fits(c) && free(c)) || cand.find(fits) || cand[0];
        const x = Math.max(8, Math.min(W - bw - 8, pos[0]));
        const y = Math.max(8, Math.min(H - bh - 8, pos[1]));
        b.style.transform = `translate(${x}px, ${y}px)`;
      }
    }
    // tabliczka miernika nad sondami
    if (!$('meterBox').hidden && st.probes[0] !== null && !portraitMQ.matches) {
      const a = S.nodePos(st.probes[0]);
      if (st.probes[1] !== null) a.add(S.nodePos(st.probes[1])).multiplyScalar(0.5);
      a.y = 0.6;
      const sp = S.screenOfPoint(a);
      place($('meterBox'), sp.x, sp.y, 12);
    }
    // ciągłe dźwięki
    if (st.res && st.mode !== 'home') {
      let buzz = 0, mot = 0;
      for (const p of st.pieces) {
        const r = st.res.pieces[p.id];
        if (!r || !r.on) continue;
        if (p.type === 'buzzer') buzz += r.level;
        if (p.type === 'motor') mot += Math.abs(r.speed);
      }
      A.setContinuous(buzz, mot);
    } else A.setContinuous(0, 0);
  }

  // ---------- start ----------
  if (!S.init(canvas, $('stage'))) {
    $('nogl').hidden = false;
    return;
  }
  U.initMascot();
  U.initLessons();
  U.setReadAloud(!!save.read);
  A.setMuted(!!save.muted);
  $('soundIcon').textContent = save.muted ? '🔇' : '🔊';
  applyTheme();
  updateStars();
  buildTray();
  goHome();
  S.resize();
  // najpierw strona, potem w tle kompilacja shaderów, dopiero wtedy pierwsza klatka 3D
  requestAnimationFrame(() => setTimeout(() => S.warm().then(() => requestAnimationFrame(frame)), 0));
  compactMQ.addEventListener && compactMQ.addEventListener('change', () => {
    updateRegion(false);
    if (st.mission) $('missionCard').classList.toggle('min', compactMQ.matches);
    bubbleKey = ''; refreshBubble(); layoutFrames();
  });

  // do testów
  window.__iskry = { st, startMission, startSandbox, startExperiment, startPuzzle, openLab, goHome, setTool, placeComponent, changed, selectPiece, answerPuz, puzAction, setProbes, MISSIONS, save: () => save };
})();
