// Iskrolandia – sklejenie wszystkiego: stan, narzędzia, dotyk i mysz, misje, nagrody, zapis
(function () {
  const C = Iskry.circuit, S = Iskry.scene, A = Iskry.audio, U = Iskry.ui;
  const P = Iskry.pieces;
  const $ = U.$;
  const MISSIONS = Iskry.MISSIONS;

  const COMP = ['battery', 'bulb', 'motor', 'switch', 'button', 'led', 'buzzer', 'resistor'];
  const TOOL_NAMES = { hand: 'Rączka', wire: 'Kabel', erase: 'Gumka', battery: 'Bateria', bulb: 'Żarówka', motor: 'Silniczek', switch: 'Wyłącznik', button: 'Przycisk', led: 'Dioda', buzzer: 'Brzęczyk', resistor: 'Opornik' };

  const st = {
    mode: 'home', pieces: [], nextId: 1, tool: 'hand', res: null,
    mission: null, mIdx: -1, sticky: [], hints: 0, done: false, mem: {},
    history: [], selected: null, wireColor: 0, ledColor: 0,
    showStacks: false, showSparks: true, wasShort: false, sessionDirs: {},
  };

  // ---------- zapis ----------
  const KEY = 'iskrolandia.v1';
  let save = { stars: {}, badges: {}, theme: 'klasyczny', sandbox: null, muted: false, read: false };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) save = Object.assign(save, s); } catch (e) {}
  let saveT = null;
  function persist() {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }, 300);
  }
  const totalStars = () => Object.values(save.stars).reduce((a, b) => a + b, 0);

  // ---------- elementy ----------
  const clean = p => ({ id: p.id, type: p.type, a: p.a, b: p.b, on: !!p.on, burnt: !!p.burnt, locked: !!p.locked, color: p.color || 0 });
  const snapshot = () => JSON.stringify(st.pieces.map(clean));
  function pushHistory() {
    st.history.push(snapshot());
    if (st.history.length > 60) st.history.shift();
  }
  const byId = id => st.pieces.find(p => p.id === id);
  const atEdge = (a, b) => { const k = C.edgeKey(a, b); return st.pieces.find(p => C.edgeKey(p.a, p.b) === k); };

  function makePiece(type, a, b, extra) {
    const p = Object.assign({ id: 'p' + st.nextId++, type, a, b, on: false, burnt: false, locked: false, color: 0 }, extra || {});
    if (type === 'wire' && !(extra && 'color' in extra)) p.color = st.wireColor;
    if (type === 'led' && !(extra && 'color' in extra)) { p.color = st.ledColor; st.ledColor = (st.ledColor + 1) % P.LED_COLORS.length; }
    return p;
  }

  function setPieces(list) {
    st.pieces = list.map(p => makePiece(p.type, p.a, p.b, { on: !!p.on, burnt: !!p.burnt, locked: !!p.locked, color: p.color || 0 }));
    selectPiece(null);
    changed(false);
  }

  // ---------- rozwiązywanie i reakcje ----------
  function changed(structural) {
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
      award('burn');
      const b = burn[0];
      tip('burn' + b.type, b.type === 'led'
        ? 'Pyk! Dioda się przepaliła – iskierki pędziły przez nią za szybko. Dotknij jej i wybierz „Napraw”, a potem dodaj <b>opornik</b>, który zrobi mały korek.'
        : 'Pyk! Za duże klocki dla żarówki – drucik się przepalił. Dotknij jej i wybierz „Napraw”. Spróbuj z mniejszą liczbą baterii.', 'wow', true);
    }
    S.sync(st.pieces);
    S.setResults(st.res);
    reactions();
    if (st.mode === 'mission') evalMission();
    refreshBubble();
    updateTray();
    if (st.mode === 'sandbox' && structural !== false) { save.sandbox = st.pieces.map(clean); persist(); }
  }

  const tipsShown = {};
  let lastTip = 0;
  function tip(key, text, mood, force) {
    if (tipsShown[key] && !force) return;
    if (!force && performance.now() - lastTip < 6000) return;
    if (st.mode === 'home') return;
    tipsShown[key] = true;
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

    if (r.short && !st.wasShort) {
      A.sfx('short');
      award('short');
      if (!(st.mission && st.mission.id === 'm11')) tip('short', '⚠️ Zwarcie! Iskierki pędzą na skróty, nie przejeżdżając przez żadną żarówkę ani silniczek, a bateria robi się gorąca. Znajdź ten skrót i go usuń. W prawdziwym życiu tak się nie robi!', 'worry', true);
    }
    st.wasShort = r.short;
    for (const p of st.pieces) {
      const x = r.pieces[p.id];
      if (!x) continue;
      if (p.type === 'led' && x.reverse) tip('ledrev', 'Dioda jest odwrócona! To bramka w jedną stronę: plus (+) diody musi prowadzić do plusa baterii. Dotknij diody i wybierz „Odwróć”.', 'wow');
      if (p.type === 'led' && x.tooSmall) tip('ledsmall', 'Dioda dostaje za małe klocki. Potrzebuje więcej niż jednej baterii – dołóż drugą, jedną za drugą.', 'wow');
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

  function updateStars() {
    $('starCount').textContent = totalStars();
  }

  // ---------- misje ----------
  function startMission(i) {
    const m = MISSIONS[i];
    st.mode = 'mission'; st.mission = m; st.mIdx = i;
    st.sticky = m.checks.map(() => false);
    st.hints = 0; st.done = false; st.mem = {}; st.history = []; st.wasShort = false;
    S.setAuto(false);
    hideScreens();
    document.body.classList.remove('at-home');
    setPieces(m.setup.map(x => Object.assign({}, x)));
    $('missionCard').hidden = false;
    $('mcEmoji').textContent = m.emoji;
    $('mcNum').textContent = 'Misja ' + (i + 1) + ' z ' + MISSIONS.length;
    $('mcTitle').textContent = m.title;
    $('modeLabel').textContent = m.emoji + ' ' + m.title;
    buildTray();
    setTool(m.id === 'm11' ? 'erase' : (m.tray.wire && Object.keys(m.tray).length === 1 ? 'wire' : 'hand'));
    evalMission();
    setTimeout(() => U.say(m.intro, { stay: true, mood: m.id === 'm11' ? 'worry' : 'happy' }), 350);
  }

  function evalMission() {
    const m = st.mission;
    if (!m) return;
    const ctx = { pieces: st.pieces, res: st.res, mem: st.mem };
    const list = $('mcChecks');
    let all = true;
    const html = m.checks.map((c, i) => {
      let v = false;
      try { v = !!c.f(ctx); } catch (e) { v = false; }
      if (c.after !== undefined && !st.sticky[c.after]) v = false;
      if (c.sticky) { if (v && !st.sticky[i]) { st.sticky[i] = true; if (!st.done) A.sfx('check'); } v = st.sticky[i]; }
      else if (v && !st.sticky[i]) { st.sticky[i] = true; if (!st.done) A.sfx('check'); }
      else if (!v) st.sticky[i] = false;
      if (!v) all = false;
      return `<li class="${v ? 'ok' : ''}"><i>${v ? '✔' : ''}</i>${c.t}</li>`;
    }).join('');
    list.innerHTML = html;
    if (all && !st.done) {
      st.done = true;
      setTimeout(() => { if (st.mission === m && st.done) missionComplete(); }, 900);
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
    U.dance();
    U.hush();
    const unlocked = Iskry.THEMES.filter(t => t.stars > totalStars() - (save.stars[m.id] - prev) && t.stars <= totalStars());
    const next = st.mIdx + 1 < MISSIONS.length ? st.mIdx + 1 : -1;
    const starHtml = [0, 1, 2].map(i => `<span class="bigstar ${i < stars ? 'got' : ''}" style="animation-delay:${0.3 + i * 0.35}s">★</span>`).join('');
    [0, 1, 2].slice(0, stars).forEach(i => setTimeout(() => A.sfx('star'), 500 + i * 350));
    U.modal(
      `<div class="win"><div class="win-sticker">${m.emoji}</div><h2>Misja wykonana!</h2><div class="stars">${starHtml}</div>
       <p class="win-sub">${m.title}${st.hints ? ` · podpowiedzi: ${st.hints}` : ' · bez podpowiedzi!'}</p>
       <div class="explain"><b>Co tu się stało?</b><p>${m.explain}</p></div>
       ${unlocked.length ? `<p class="unlock">🎁 Odblokowano planszę: <b>${unlocked.map(t => t.name).join(', ')}</b> (zmienisz ją w Nagrodach)</p>` : ''}</div>`,
      [
        next >= 0 ? { label: '▶ Następna misja', cls: 'primary', fn: () => startMission(next) } : { label: '🏆 Zobacz nagrody', cls: 'primary', fn: openAlbum },
        { label: '🧪 Pobaw się jeszcze', fn: () => {} },
        { label: '🎯 Mapa misji', fn: openMap },
      ], { cls: 'win-panel' });
  }

  function showHint() {
    if (!st.mission) return;
    if (!st.done) st.hints++;
    A.sfx('ui');
    U.say('💡 ' + st.mission.hint, { stay: true, mood: 'happy' });
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
    st.mode = 'home'; st.mission = null;
    hideScreens();
    U.hush();
    $('missionCard').hidden = true;
    selectPiece(null);
    document.body.classList.add('at-home');
    setPieces(DEMO);
    S.setAuto(true);
    U.show('home');
  }
  function startSandbox() {
    st.mode = 'sandbox'; st.mission = null; st.history = []; st.wasShort = false;
    S.setAuto(false);
    hideScreens();
    document.body.classList.remove('at-home');
    $('missionCard').hidden = true;
    $('modeLabel').textContent = '🧪 Piaskownica';
    setPieces(save.sandbox && save.sandbox.length ? save.sandbox : STARTER);
    buildTray();
    setTool('hand');
    setTimeout(() => tip('sandbox', 'To twoja piaskownica! Wybierz element na dole i dotknij planszy, żeby go postawić. Kable rysujesz, przeciągając palcem od kropki do kropki. Dotknij elementu, żeby go obejrzeć, odwrócić albo usunąć.', 'happy', true), 300);
  }
  function hideScreens() { ['home', 'map', 'album', 'lessons', 'modal'].forEach(id => U.hide(id)); }

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
    return ['hand', 'wire', 'erase', ...COMP];
  }
  function left(type) {
    if (st.mode !== 'mission') return Infinity;
    const lim = st.mission.tray[type] || 0;
    if (lim >= 99) return Infinity;
    return lim - st.pieces.filter(p => p.type === type && !p.locked).length;
  }
  function buildTray() {
    const tray = $('tray');
    const items = trayItems();
    tray.innerHTML = items.map((k, i) =>
      (k === 'battery' ? '<span class="tsep"></span>' : '') +
      `<button class="titem" data-tool="${k}" aria-label="${TOOL_NAMES[k]}">${i < 10 ? `<kbd>${(i + 1) % 10}</kbd>` : ''}${U.icon(k)}<span>${TOOL_NAMES[k]}</span><em class="cnt"></em></button>`).join('');
    tray.querySelectorAll('.titem').forEach(b => {
      b.addEventListener('pointerdown', e => trayDown(e, b.dataset.tool));
    });
    updateTray();
  }
  function updateTray() {
    document.querySelectorAll('#tray .titem').forEach(b => {
      const k = b.dataset.tool;
      b.classList.toggle('sel', st.tool === k);
      const l = left(k);
      const cnt = b.querySelector('.cnt');
      if (COMP.includes(k) && l !== Infinity) { cnt.textContent = '×' + Math.max(0, l); b.classList.toggle('empty', l <= 0); }
      else { cnt.textContent = ''; b.classList.remove('empty'); }
    });
  }
  function setTool(k) {
    st.tool = k;
    updateTray();
    S.showGhost(null);
    document.body.dataset.tool = k;
    if (k !== 'hand') selectPiece(null);
  }

  // przeciąganie z tacki na planszę
  let trayDrag = null;
  function trayDown(e, k) {
    A.init();
    e.preventDefault();
    trayDrag = { k, x: e.clientX, y: e.clientY, moved: false, el: null };
    const mv = ev => {
      if (!trayDrag) return;
      const d = Math.hypot(ev.clientX - trayDrag.x, ev.clientY - trayDrag.y);
      if (!trayDrag.moved && d > 10 && COMP.includes(k)) {
        trayDrag.moved = true;
        const el = document.createElement('div');
        el.className = 'drag-ico';
        el.innerHTML = U.icon(k);
        document.body.appendChild(el);
        trayDrag.el = el;
        setTool(k);
      }
      if (trayDrag.el) {
        trayDrag.el.style.transform = `translate(${ev.clientX - 32}px, ${ev.clientY - 32}px)`;
        const pk = S.pick(ev.clientX, ev.clientY);
        if (overCanvas(ev) && pk.grid) {
          const e2 = C.nearestEdge(pk.grid.fc, pk.grid.fr);
          S.showGhost(k, e2.a, e2.b, canPlaceAt(k, e2.a, e2.b));
        } else S.showGhost(null);
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
        const pk = S.pick(ev.clientX, ev.clientY);
        if (overCanvas(ev) && pk.grid) {
          const e2 = C.nearestEdge(pk.grid.fc, pk.grid.fr);
          placeComponent(k, e2.a, e2.b);
        }
      } else {
        A.sfx('ui');
        setTool(k);
        if (COMP.includes(k)) tip('info-' + k, U.icon(k, 'ico-inline') + ' ' + Iskry.INFO[k] + ' Dotknij planszy, żeby go postawić.');
        else if (k === 'wire') tip('info-wire', 'Kabel: przeciągnij palcem lub myszką od kropki do kropki. Możesz rysować długie kable za jednym razem!');
        else if (k === 'erase') tip('info-erase', 'Gumka: dotknij elementu albo przeciągnij po kilku, żeby je usunąć.');
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
  function orient(type, a, b) { return a < b ? [a, b] : [b, a]; }

  function placeComponent(type, a, b) {
    const ex = atEdge(a, b);
    if (left(type) <= 0) {
      A.sfx('error');
      U.say('W tej misji nie ma już więcej elementów typu „' + TOOL_NAMES[type] + '”. Możesz przestawić te, które już stoją.', { mood: 'wow' });
      return false;
    }
    if (ex && !(ex.type === 'wire' && !ex.locked)) {
      A.sfx('error');
      tip('occupied', 'Tu już coś stoi! Wybierz wolne miejsce między dwiema kropkami.', 'wow', true);
      return false;
    }
    pushHistory();
    if (ex) st.pieces = st.pieces.filter(p => p !== ex);
    const [na, nb] = orient(type, a, b);
    const p = makePiece(type, na, nb);
    if (type === 'switch') p.on = false;
    st.pieces.push(p);
    A.sfx('place');
    changed();
    if (type === 'switch') tip('switchTap', 'Wyłącznik stoi! Na razie jest wyłączony – dźwignia w górze. Wybierz „Rączkę” i dotknij go, żeby włączyć.');
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
      if (!quiet) { A.sfx('error'); tip('locked', 'Ten element jest przykręcony na stałe w tej misji 🔩 – nie da się go zabrać.', 'wow', true); }
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

  // ---------- zaznaczenie i dymek ----------
  function selectPiece(id) {
    st.selected = id;
    S.select(id);
    $('bubble').hidden = !id;
    if (id) refreshBubble();
  }

  function statusOf(p, r) {
    if (!r) return '';
    switch (p.type) {
      case 'battery': return r.short ? '🔥 Zwarcie! Bateria się grzeje – usuń skrót.' : Math.abs(r.I) > 0.003 ? '⬆️ Daje iskierkom klocki energii.' : '⏸ Czeka – tor nie jest zamknięty.';
      case 'bulb': return p.burnt ? '💥 Przepalona! Naciśnij „Napraw”.' : r.glow > 0.9 ? '🌞 Świeci bardzo jasno!' : r.glow > 0.35 ? '💡 Świeci!' : r.on ? '🕯️ Świeci słabiutko.' : '⚫ Nie świeci – iskierki nie przejeżdżają.';
      case 'motor': return r.on ? (r.speed > 0 ? '↻ Kręci się w prawo' : '↺ Kręci się w lewo') + (Math.abs(r.speed) > 1.6 ? ' – TURBO! 🚀' : '.') : '⏸ Stoi.';
      case 'switch': return p.on ? '✅ Włączony – most opuszczony, iskierki jadą.' : '⛔ Wyłączony – most podniesiony. Dotknij, by włączyć.';
      case 'button': return p.on ? '✅ Wciśnięty – iskierki jadą!' : '👆 Przytrzymaj go, żeby włączyć.';
      case 'led': return p.burnt ? '💥 Przepalona! Naciśnij „Napraw”.' : r.reverse ? '🚫 Odwrócona – bramka zamknięta. Odwróć diodę!' : r.tooSmall ? '🧱 Za małe klocki – dołóż baterię.' : r.on ? '✨ Świeci!' : '⚫ Nie świeci.';
      case 'buzzer': return r.on ? '🔔 BZZZ!' : '🤫 Cisza.';
      case 'resistor': return Math.abs(r.I) > 0.001 ? '🚧 Robi korek – iskierki zwalniają.' : '⏸ Pusta ścieżka.';
      case 'wire': return Math.abs(r.I) > 0.002 ? '🏎️ Iskierki pędzą!' : (r.Va > 0.05 ? '🧱 Klocki czekają – tor jest gdzieś przerwany.' : '⏸ Pusty kabel.');
    }
    return '';
  }

  function refreshBubble() {
    const id = st.selected;
    const p = id && byId(id);
    if (!p) { $('bubble').hidden = true; return; }
    const r = st.res && st.res.pieces[id];
    const volt = p.type === 'wire' ? (r ? r.Va : 0) : (r ? Math.abs(r.vd) : 0);
    const I = r ? Math.abs(r.I) : 0;
    const vLabel = p.type === 'wire' ? 'Klocki na kablu' : 'Napięcie';
    const btns = [];
    if (['battery', 'led', 'motor'].includes(p.type)) btns.push('<button data-act="flip">⇄ Odwróć</button>');
    if (p.type === 'led' || p.type === 'wire') btns.push('<button data-act="color">🎨 Kolor</button>');
    if (p.type === 'switch') btns.push(`<button data-act="toggle">${p.on ? '⛔ Wyłącz' : '✅ Włącz'}</button>`);
    if (p.burnt) btns.push('<button data-act="repair" class="hot">🔧 Napraw</button>');
    if (!p.locked) btns.push('<button data-act="del">🗑 Usuń</button>');
    $('bubble').innerHTML = `
      <div class="bh">${U.icon(p.type === 'wire' ? 'wire' : p.type, 'ico-b')}<b>${C.TYPES[p.type].name}${p.locked ? ' 🔩' : ''}</b><button class="bx" data-act="close" aria-label="Zamknij">✕</button></div>
      <div class="bs">${statusOf(p, r)}</div>
      <div class="meters">
        <div class="meter m-v"><span>🧱 ${vLabel}</span><b>${C.blocksText(volt)}</b><small>${C.fmt(volt, 2)} V</small></div>
        <div class="meter m-i"><span>🏎️ Prąd</span><b>${C.sparksText(I)}</b><small>${C.fmt(I, I < 0.1 ? 3 : 2)} A</small></div>
      </div>
      <div class="ba">${btns.join('')}</div>
      <p class="binfo">${Iskry.INFO[p.type]}</p>`;
    $('bubble').querySelectorAll('[data-act]').forEach(b => b.onclick = ev => { ev.stopPropagation(); bubbleAct(p, b.dataset.act); });
  }

  function bubbleAct(p, act) {
    A.init();
    if (act === 'close') { A.sfx('ui'); selectPiece(null); return; }
    if (act === 'flip') flipPiece(p);
    if (act === 'toggle') toggleSwitch(p);
    if (act === 'color') {
      pushHistory();
      p.color = (p.color + 1) % (p.type === 'led' ? P.LED_COLORS.length : P.WIRE_COLORS.length);
      A.sfx('pick'); changed();
    }
    if (act === 'repair') { pushHistory(); p.burnt = false; A.sfx('repair'); changed(); }
    if (act === 'del') { pushHistory(); if (removePiece(p)) { selectPiece(null); changed(); } }
  }

  function toggleSwitch(p) {
    p.on = !p.on;
    A.sfx(p.on ? 'swOn' : 'swOff');
    changed();
  }

  // ---------- wskaźnik na planszy ----------
  const canvas = $('c');
  const ptrs = new Map();
  let g = null; // bieżący gest

  function pinchInfo() {
    const v = [...ptrs.values()];
    return { d: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y), x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
  }
  function cancelGesture() {
    if (g && g.kind === 'press') { g.p.on = false; changed(false); }
    if (g && g.kind === 'move') { S.showGhost(null); }
    if (g && g.kind === 'wire' && g.placed) changed();
    g = null;
  }

  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    A.init();
    if (st.mode === 'home') return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { cancelGesture(); const pi = pinchInfo(); g = { kind: 'pinch', d: pi.d, x: pi.x, y: pi.y }; return; }
    if (ptrs.size > 2) return;
    const x = e.clientX, y = e.clientY;
    if (e.button === 1 || e.button === 2) { g = { kind: 'orbit', x, y }; return; }
    const pk = S.pick(x, y);
    const tool = st.tool;
    if (tool === 'hand') {
      const p = pk.pid && byId(pk.pid);
      if (p && p.type === 'button') {
        p.on = true; A.sfx('swOn'); changed(false);
        g = { kind: 'press', p, x, y };
        return;
      }
      g = p ? { kind: 'pieceDown', p, x, y } : { kind: 'emptyDown', x, y };
    } else if (tool === 'wire') {
      if (!pk.grid) return;
      const nn = C.nearestNode(pk.grid.fc, pk.grid.fr);
      g = { kind: 'wire', last: nn.d < 0.42 ? nn.n : null, x, y, moved: false, placed: 0, color: st.wireColor, grid: pk.grid, hist: snapshot() };
    } else if (tool === 'erase') {
      g = { kind: 'erase', x, y, hist: snapshot(), removed: 0 };
      eraseAt(pk);
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
        S.orbit(pi.x - g.x, pi.y - g.y);
        g.d = pi.d; g.x = pi.x; g.y = pi.y;
        break;
      }
      case 'orbit':
        S.orbit(x - g.x, y - g.y); g.x = x; g.y = y;
        break;
      case 'emptyDown':
        if (moved > 7) { g = { kind: 'orbit', x, y }; }
        break;
      case 'pieceDown':
        if (moved > 9) {
          if (g.p.locked) { g = { kind: 'orbit', x, y }; tip('locked', 'Ten element jest przykręcony na stałe w tej misji 🔩. Możesz go dotknąć, żeby zobaczyć, co się w nim dzieje.', 'wow'); }
          else { g = { kind: 'move', p: g.p, x, y }; A.sfx('pick'); selectPiece(null); }
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
        if (p.type === 'switch') { toggleSwitch(p); selectPiece(p.id); }
        else if (p.burnt) { pushHistory(); p.burnt = false; A.sfx('repair'); changed(); selectPiece(p.id); }
        else { A.sfx('ui'); selectPiece(st.selected === p.id ? null : p.id); }
        break;
      }
      case 'emptyDown': selectPiece(null); break;
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
        if (!g.moved && !g.placed && g.grid) {
          const ed = C.nearestEdge(g.grid.fc, g.grid.fr);
          if (!atEdge(ed.a, ed.b)) { pushHistory(); placeWire(ed.a, ed.b, g.color); }
          else { A.sfx('error'); }
        }
        st.wireColor = (st.wireColor + 1) % P.WIRE_COLORS.length;
        changed();
        break;
      case 'erase':
        if (g.removed) st.history.push(g.hist);
        break;
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
    if (COMP.includes(st.tool) && pk.grid) {
      const ed = C.nearestEdge(pk.grid.fc, pk.grid.fr);
      S.showGhost(st.tool, ed.a, ed.b, canPlaceAt(st.tool, ed.a, ed.b));
    } else if (st.tool === 'wire' && pk.grid) {
      const ed = C.nearestEdge(pk.grid.fc, pk.grid.fr);
      S.showGhost('wire', ed.a, ed.b, !atEdge(ed.a, ed.b));
    } else S.showGhost(null);
    canvas.style.cursor = st.tool === 'hand' ? (pk.pid ? 'pointer' : 'grab') : st.tool === 'erase' ? (pk.pid ? 'not-allowed' : 'default') : 'crosshair';
  }

  canvas.addEventListener('wheel', e => { e.preventDefault(); S.zoomBy(e.deltaY > 0 ? 1.08 : 0.93); }, { passive: false });

  // ---------- przyciski boczne ----------
  function sideBtn(id, fn) { $(id).addEventListener('click', () => { A.init(); A.sfx('ui'); fn(); }); }
  sideBtn('vStacks', () => {
    st.showStacks = !st.showStacks; S.setShowStacks(st.showStacks);
    $('vStacks').classList.toggle('on', st.showStacks);
    if (st.showStacks) { award('stacks'); tip('stacks', '🧱 Wieże klocków pokazują <b>napięcie</b> w każdym miejscu toru. Przy plusie baterii wieża jest wysoka, a każda żarówka czy silniczek zabiera iskierkom klocki – za nimi wieże są niższe.'); }
  });
  sideBtn('vSparks', () => { st.showSparks = !st.showSparks; S.setShowSparks(st.showSparks); $('vSparks').classList.toggle('on', st.showSparks); });
  sideBtn('vRotL', () => S.rotate(-Math.PI / 4));
  sideBtn('vRotR', () => S.rotate(Math.PI / 4));
  sideBtn('vZoomIn', () => S.zoomBy(0.85));
  sideBtn('vZoomOut', () => S.zoomBy(1.15));
  sideBtn('vTop', () => S.topView());
  sideBtn('vUndo', undo);
  sideBtn('vClear', () => {
    if (st.mode === 'mission') {
      U.modal('<h2>Zacząć misję od nowa?</h2><p>Plansza wróci do początku. Gwiazdki z podpowiedzi zostaną policzone tak jak teraz.</p>',
        [{ label: '↺ Od nowa', cls: 'primary', fn: () => { const h = st.hints; startMission(st.mIdx); st.hints = h; } }, { label: 'Nie' }]);
    } else {
      U.modal('<h2>Wyczyścić planszę?</h2><p>Wszystkie elementy znikną. (Możesz to potem cofnąć przyciskiem ↶.)</p>',
        [{ label: '🧹 Wyczyść', cls: 'primary', fn: () => { pushHistory(); st.pieces = []; selectPiece(null); A.sfx('erase'); changed(); } }, { label: 'Nie' }]);
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
  $('mcRestart').onclick = () => $('vClear').click();

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
      <p><b>Bezpiecznie:</b> Iskrolandia działa w całości w przeglądarce. Nie łączy się z internetem, nie ma reklam, kont, zakupów ani linków na zewnątrz. Postęp (gwiazdki, odznaki, plansza z piaskownicy) zapisuje się tylko na tym urządzeniu.</p>
      <p><b>Czego uczy:</b> obwód zamknięty i otwarty, prąd i napięcie (przez metafory wyścigu iskierek i klocków energii), opór, połączenia szeregowe i równoległe, kierunek prądu, dioda jako zawór jednokierunkowy, bramki logiczne I/LUB, zwarcie i zasady bezpieczeństwa.</p>
      <p><b>Fizyka pod spodem jest prawdziwa:</b> obwód liczony jest prawem Ohma i prawami Kirchhoffa (analiza węzłowa). Bateria to 1,5 V z małym oporem wewnętrznym, żarówka 5 Ω, silniczek 4 Ω, brzęczyk 15 Ω, opornik 50 Ω, dioda LED ok. 1,8 V. Liczby w woltach i amperach są widoczne w dymku każdego elementu. Uproszczenie: iskierki płyną umownym kierunkiem prądu (od + do −), a elektrony w drucie płyną odwrotnie.</p>
      <p><b>Sterowanie:</b> dotyk, mysz i klawiatura (1–0 narzędzia, Ctrl+Z cofnij, R odwróć, Delete usuń, Esc zamknij). Dwa palce lub prawy przycisk myszy obracają planszę, kółko i szczypanie przybliżają.</p>
      <label class="chk"><input type="checkbox" id="optRead" ${save.read ? 'checked' : ''}> Wolcik czyta swoje dymki na głos (jeśli przeglądarka ma polski głos)</label>`,
      [{ label: 'Zamknij', cls: 'primary' }, {
        label: '🗑 Wyzeruj postęp', fn: () => U.modal('<h2>Na pewno?</h2><p>Znikną wszystkie gwiazdki, odznaki i plansza z piaskownicy.</p>',
          [{ label: 'Tak, wyzeruj', cls: 'primary', fn: () => { save = { stars: {}, badges: {}, theme: 'klasyczny', sandbox: null, muted: save.muted, read: save.read }; persist(); applyTheme(); updateStars(); } }, { label: 'Nie' }]),
      }]);
    $('optRead').onchange = e => { save.read = e.target.checked; U.setReadAloud(save.read); persist(); };
  }

  $('btnHome').onclick = () => { A.sfx('ui'); goHome(); };
  $('btnLearn').onclick = () => { A.init(); A.sfx('ui'); U.openLessons(0); };
  $('btnMap').onclick = () => { A.init(); A.sfx('ui'); openMap(); };
  $('btnAlbum').onclick = () => { A.init(); A.sfx('ui'); openAlbum(); };
  $('btnSound').onclick = () => {
    A.init();
    save.muted = !save.muted; A.setMuted(save.muted); persist();
    $('soundIcon').textContent = save.muted ? '🔇' : '🔊';
  };
  $('goMissions').onclick = () => { A.init(); A.sfx('ui'); openMap(); };
  $('goSandbox').onclick = () => { A.init(); A.sfx('ui'); startSandbox(); };
  $('goLearn').onclick = () => { A.init(); A.sfx('ui'); U.openLessons(0); };
  $('goAlbum').onclick = () => { A.init(); A.sfx('ui'); openAlbum(); };
  $('goParents').onclick = () => { A.init(); A.sfx('ui'); openParents(); };
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => {
    A.sfx('ui'); A.stopSpeak();
    U.hide(b.closest('.screen').id);
  });
  U.onMascot = () => {
    A.init();
    if (st.mission && !st.done) U.say(st.mission.intro, { stay: true });
    else if (st.mode === 'sandbox') U.say(['Spróbuj zapalić 5 żarówek naraz! 🌟', 'Włącz „Klocki” po prawej i zobacz wieże napięcia! 🧱', 'Co się stanie, gdy postawisz 4 baterie jedna za drugą? 🗼', 'Dioda potrzebuje opornika – inaczej pyk! 💥', 'Zakręć silniczkiem w drugą stronę – odwróć baterię! 🔄', 'Dotknij dowolnego elementu, żeby zmierzyć prąd i napięcie. 📏'][Math.floor(Math.random() * 6)]);
    else U.say('Hej! Jestem Wolcik ⚡ Kliknij mnie, kiedy potrzebujesz pomocy.');
  };

  // ---------- klawiatura ----------
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Escape') {
      const open = ['modal', 'lessons', 'album', 'map'].find(id => !$(id).hidden);
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
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    S.render(dt, now / 1000);
    // dymek nad elementem
    if (st.selected) {
      const sp = S.screenOf(st.selected, 0.75);
      const b = $('bubble');
      if (sp && !sp.behind) {
        const bw = b.offsetWidth, bh = b.offsetHeight;
        const stage = $('stage');
        const W = stage.clientWidth, H = stage.clientHeight;
        const low = S.screenOf(st.selected, 0);
        // nad elementem, a jeśli brak miejsca – z boku albo pod nim (nigdy na nim)
        const cand = [
          [sp.x - bw / 2, sp.y - bh - 14],
          [sp.x + 50, (sp.y + low.y) / 2 - bh / 2],
          [sp.x - bw - 50, (sp.y + low.y) / 2 - bh / 2],
          [sp.x - bw / 2, low.y + 30],
        ];
        let pos = cand.find(([x, y]) => x >= 8 && y >= 8 && x + bw <= W - 8 && y + bh <= H - 8) || cand[0];
        const x = Math.max(8, Math.min(W - bw - 8, pos[0]));
        const y = Math.max(8, Math.min(H - bh - 8, pos[1]));
        b.style.transform = `translate(${x}px, ${y}px)`;
      }
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
    requestAnimationFrame(frame);
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
  requestAnimationFrame(frame);

  // do testów
  window.__iskry = { st, startMission, startSandbox, goHome, setTool, placeComponent, changed, MISSIONS };
})();
