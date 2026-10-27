/* Na Krawędzi – start aplikacji: menu, budowa świata, pętla gry, sterowanie (klawiatura, pad, dotyk) */
(function () {
  'use strict';
  const WS = window.WS;
  const { clamp, lerp, smoothstep, damp, fmt, store } = WS.U;
  const $ = (id) => document.getElementById(id);
  const V3 = THREE.Vector3;

  THREE.ColorManagement.enabled = false;

  const TIPS = [
    'Nurkowanie daje prędkość, a podciągnięcie zamienia ją z powrotem na wysokość.',
    'Duży przechył to ostry skręt, ale też szybka utrata wysokości.',
    'Mnożnik punktów rośnie, im bliżej skał lecisz. Kilka metrów od ściany to nawet ×8.',
    'Prawdziwi piloci mówią na to „proximity flying”. Liczy się linia i zapas.',
    'Napis „WYCIĄGAJ!” oznacza, że do ziemi zostały ok. 2 sekundy.',
    'Spadochron otwiera się ok. 2 sekund. Nie zostawiaj go na ostatnią chwilę.',
    'W burzy porywy wiatru szarpią kombinezonem. Zostaw sobie więcej zapasu.',
    'Kamera filmowa (C) pokazuje przelot z boku, tak jak na nagraniach z zawodów.',
    'Punkty przy skale zbierają się w serii. Odbij od ściany na sekundę, żeby ją zaliczyć, zanim coś pójdzie nie tak.',
    'Gdy znacznik LĄDOWISKO robi się zielony, spadochron otwarty teraz doniesie Cię do koła.',
    'Niebieski duch to Twój najlepszy lot w tym miejscu. Przy każdej bramce widzisz, czy prowadzisz.',
    'Poniżej 150 km/h kombinezon słabo nosi. Nurkuj, zanim zabraknie prędkości.'
  ];
  const calmDefault = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- ustawienia ----------
  const S = Object.assign({
    loc: 'dolomity', wx: 'slonce', wind: 3, windDir: 'czolowy', turb: 12, mode: 'trasa',
    smoke: true, slowmo: true, invert: false, cam: 0, ghost: true, calm: calmDefault, gfx: 'auto', fps: false
  }, store.get('settings', {}));
  const saveS = () => store.set('settings', S);

  // ---------- render ----------
  const canvas = $('view');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (e) {
    $('menu').classList.remove('on'); $('nogl').classList.add('on');
    return;
  }
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  // ---------- jakość grafiki ----------
  // Poziom „auto” bierze ocenę sprzętu (karta graficzna, procesor, pamięć), a potem sprawdza płynność lotu pokazowego.
  // Wynik sprawdzenia zapamiętuje się dla tej karty, więc przy następnej wizycie od razu startuje właściwy poziom.
  const TIERS = WS.Quality.TIERS;
  const hw = WS.Quality.detect(renderer);
  const autoSaved = store.get('gfxAuto', null);
  let autoTier = autoSaved && autoSaved.gpu === hw.rawGpu ? Math.min(hw.tier, autoSaved.tier) : hw.tier;
  if (S.gfx !== 'auto' && !TIERS.some(t => t.id === S.gfx)) S.gfx = 'auto';
  const tierIndex = () => S.gfx === 'auto' ? autoTier : TIERS.findIndex(t => t.id === S.gfx);
  WS.Q = TIERS[tierIndex()];
  let maxRatio = WS.Quality.ratioFor(WS.Q, window.innerWidth, window.innerHeight);
  let pixelRatio = maxRatio;
  renderer.setPixelRatio(pixelRatio);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.3, 60000);
  const lights = { sun: new THREE.DirectionalLight(0xffffff, 1), hemi: new THREE.HemisphereLight(0xffffff, 0x444444, 1) };
  scene.add(lights.sun, lights.sun.target, lights.hemi);
  const post = new WS.Post(renderer, WS.Q);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    maxRatio = WS.Quality.ratioFor(WS.Q, w, h);
    pixelRatio = Math.min(pixelRatio, maxRatio);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(w, h, false);
    post.setSize(Math.floor(w * pixelRatio), Math.floor(h * pixelRatio));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // ---------- aplikacja ----------
  const app = {
    scene, camera, renderer,
    audio: new WS.Audio(), hud: new WS.HUD(),
    sky: new WS.Sky(scene), weather: new WS.Weather(scene),
    world: null, terrain: null, props: null, pilot: new WS.Pilot(scene),
    rig: null, built: null
  };
  app.ghost = new WS.Ghost(scene);
  app.rig = new WS.CameraRig(camera, null);
  app.rig.mode = S.cam || 0;
  const game = new WS.Game(app);
  app.game = game;

  let state = 'menu';
  let demo = false;
  let replayT = 0, ghost = null, demoT = 0, demoCam = 0, highlight = null;
  const locById = (id) => WS.LOCATIONS.find(l => l.id === id) || WS.LOCATIONS[0];
  const wxById = (id) => WS.WEATHER.find(w => w.id === id) || WS.WEATHER[0];

  function gameOpts() {
    const dir = WS.WIND_DIRS.find(d => d.id === S.windDir) || WS.WIND_DIRS[0];
    return { mode: S.mode, wind: S.wind, windAngle: dir.angle, turb: S.turb / 100, slowmo: S.slowmo, wxMult: wxById(S.wx).mult || 1 };
  }

  // Budowa świata (asynchronicznie, z paskiem postępu)
  let building = null;
  function buildWorld(locId, wxId) {
    const key = locId + '|' + wxId + '|' + WS.Q.id;
    if (app.built === key) return Promise.resolve();
    if (building && building.key === key) return building.p;
    const loc = locById(locId), wx = wxById(wxId);
    $('loadTitle').textContent = `${loc.name} · ${wx.name}`;
    $('loadTip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
    $('loadFill').style.width = '0%';
    // na ekranie tytułowym postęp pokazuje cienki pasek pod logo
    if (!(state === 'menu' && view === 'press')) $('loading').classList.add('on');
    const token = {};
    building = { key, token };
    building.p = new Promise((resolve) => {
      if (app.terrain) { app.terrain.dispose(); app.terrain = null; }
      if (app.props) { app.props.dispose(); app.props = null; }
      game.clearDebris();
      const world = new WS.World(loc);
      WS.planCourse(world);
      app.world = world;
      WS.currentWeather = wx;
      WS.applyWeather(wx, scene, lights);
      WS.U3.uHF.value.set(Math.max(world.water, loc.cloudBase - 250), 180, wx.heightFog);
      app.sky.setWeather(wx, loc, world);
      app.weather.set(wx, gameOpts(), world);
      app.terrain = new WS.Terrain(scene, world);
      app.terrain.setSkyTop(wx.skyTop);
      app.props = new WS.Props(scene, world);
      app.rig.setWorld(world);
      const gen = app.terrain.buildAll(world.exit.x, world.exit.z + 100);
      let prog = 0.02;
      const step = () => {
        if (building.token !== token) return;
        const t0 = performance.now();
        let r;
        while (performance.now() - t0 < 40) {
          r = gen.next();
          if (r.done) break;
          if (typeof r.value === 'number') prog = r.value;
          else prog = Math.min(0.74, prog + 0.004);
        }
        $('loadFill').style.width = $('tLoadFill').style.width = (prog * 100).toFixed(0) + '%';
        if (r && r.done) {
          app.built = key;
          $('loading').classList.remove('on');
          building = null;
          resolve();
        } else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    return building.p;
  }

  // ---------- menu ----------
  function buildMenu() {
    const best = store.get('best', {});
    const stars = store.get('stars', {});
    const nStars = (k) => { let n = 0, m = stars[k] || 0; while (m) { n += m & 1; m >>= 1; } return n; };
    const locs = $('locs');
    locs.innerHTML = '';
    for (const l of WS.LOCATIONS) {
      const b = document.createElement('button');
      b.className = 'loc' + (S.loc === l.id ? ' on' : '');
      const rec = Math.max(best[l.id + '|trasa'] || 0, best[l.id + '|wolny'] || 0);
      const st = WS.WEATHER.reduce((a, w) => a + nStars(l.id + '|' + w.id), 0);
      b.innerHTML = `<div class="t">${l.name}<em>${l.title}</em></div><p>${l.desc}</p><div class="tags">${l.tags.map(t => `<span>${t}</span>`).join('')}</div><div class="rec">${rec ? `rekord ${fmt(rec)}` : ''}${st ? `<span class="st">★ ${st}/${WS.WEATHER.length * 3}</span>` : ''}</div>`;
      b.onclick = () => { S.loc = l.id; saveS(); buildMenu(); app.audio.start(); app.audio.play('click'); menuWorld(); };
      locs.appendChild(b);
    }
    const wxs = $('wxs');
    wxs.innerHTML = '';
    for (const w of WS.WEATHER) {
      const b = document.createElement('button');
      b.className = 'wx' + (S.wx === w.id ? ' on' : '');
      const ns = nStars(S.loc + '|' + w.id);
      b.innerHTML = `<span class="i">${WS.WX_ICONS[w.id] || w.icon}</span><span class="n">${w.name}</span><span class="m">${w.mult > 1 ? `punkty ×${fmt(w.mult, 2).replace(/0$/, '')}` : '&nbsp;'}</span><span class="s">${'★'.repeat(ns)}<i>${'★'.repeat(3 - ns)}</i></span>`;
      b.title = w.desc;
      b.onclick = () => {
        S.wx = w.id; S.wind = w.wind; S.turb = Math.round(w.turb * 100);
        saveS(); buildMenu(); app.audio.start(); app.audio.play('click'); menuWorld();
      };
      wxs.appendChild(b);
    }
    let d = wxs.parentElement.querySelector('.wxdesc');
    if (!d) { d = document.createElement('p'); d.className = 'wxdesc'; wxs.after(d); }
    d.textContent = wxById(S.wx).desc;
    $('optWind').value = S.wind; $('windOut').textContent = S.wind + ' m/s';
    $('optTurb').value = S.turb; $('turbOut').textContent = S.turb + '%';
    const dir = $('optDir');
    dir.innerHTML = '';
    for (const wd of WS.WIND_DIRS) {
      const b = document.createElement('button');
      b.textContent = wd.name; b.className = S.windDir === wd.id ? 'on' : '';
      b.onclick = () => { S.windDir = wd.id; saveS(); buildMenu(); };
      dir.appendChild(b);
    }
    for (const b of $('optMode').querySelectorAll('button')) {
      b.classList.toggle('on', b.dataset.v === S.mode);
      b.onclick = () => { S.mode = b.dataset.v; saveS(); buildMenu(); };
    }
    const bv = best[S.loc + '|' + S.mode];
    const L = locById(S.loc), ks = S.loc + '|' + S.wx;
    const starList = WS.STARS.map((x, i) => `<span class="${(stars[ks] || 0) & (1 << i) ? 'on' : ''}">★ ${x.desc ? x.desc(L) : x.name}</span>`).join('');
    $('bestLbl').innerHTML = (bv ? `Rekord: <b>${fmt(bv)}</b> pkt` : 'Pierwszy skok w tym miejscu') + `<div class="goals">${starList}</div>`;
  }
  $('optWind').oninput = (e) => { S.wind = +e.target.value; $('windOut').textContent = S.wind + ' m/s'; saveS(); };
  $('optTurb').oninput = (e) => { S.turb = +e.target.value; $('turbOut').textContent = S.turb + '%'; saveS(); };
  $('optSmoke').onchange = (e) => { S.smoke = e.target.checked; saveS(); app.pilot.smokeOn = S.smoke; };
  $('optSlow').onchange = (e) => { S.slowmo = e.target.checked; saveS(); };
  $('optInvert').onchange = (e) => { S.invert = e.target.checked; saveS(); };
  $('optSound').onchange = (e) => { app.audio.start(); app.audio.setEnabled(e.target.checked); };
  $('optGhost').onchange = (e) => { S.ghost = e.target.checked; saveS(); };
  $('optCalm').onchange = (e) => { S.calm = e.target.checked; saveS(); };
  $('optFps').onchange = (e) => { S.fps = e.target.checked; saveS(); $('fps').classList.toggle('on', S.fps); };

  // ---------- ekrany menu ----------
  // press – tytuł („naciśnij dowolny klawisz”), main – menu główne, jump – wybór skoku, settings, help
  let view = 'press';
  let ready = false;
  const VIEW_SCREEN = { press: 'title', main: 'title', jump: 'menu', settings: 'settings', help: 'helpScr' };
  function showScreen(id) {
    for (const s of ['title', 'menu', 'settings', 'helpScr', 'pause', 'results']) $(s).classList.toggle('on', s === id);
    $('touch').classList.toggle('on', state === 'play');
  }
  function showView(v) {
    view = v;
    showScreen(VIEW_SCREEN[v]);
    $('title').classList.toggle('press', v === 'press');
    if (v === 'main') { buildMain(); selItem(menuSel, true); }
    if (v === 'jump') buildMenu();
    if (v === 'settings') buildSettings();
  }

  const items = [...document.querySelectorAll('.mi')];
  let menuSel = 0;
  function selItem(i, focus) {
    menuSel = (i + items.length) % items.length;
    items.forEach((b, k) => b.classList.toggle('sel', k === menuSel));
    if (focus) items[menuSel].focus({ preventScroll: true });
  }
  function menuAction(a) {
    app.audio.start(); app.audio.play('click');
    if (a === 'quick') startFlight();
    else if (a === 'jump') showView('jump');
    else if (a === 'settings') showView('settings');
    else if (a === 'help') showView('help');
  }
  items.forEach((b, i) => {
    b.onmouseenter = () => { if (menuSel !== i) { selItem(i); app.audio.play('tick'); } };
    b.onclick = () => menuAction(b.dataset.a);
  });
  for (const b of document.querySelectorAll('[data-back]')) b.onclick = () => { app.audio.play('click'); showView('main'); };

  function enterMain() {
    app.audio.start();
    app.audio.play('whoosh', { v: 0.45 });
    showView('main');
  }
  $('title').addEventListener('pointerdown', (e) => { if (view === 'press' && ready) { e.preventDefault(); enterMain(); } });

  const gfxName = () => WS.Q.name + (S.gfx === 'auto' ? ' (auto)' : '');
  function buildMain() {
    const L = locById(S.loc), W = wxById(S.wx);
    $('miQuick').textContent = `${L.name} · ${W.name} · ${S.mode === 'wolny' ? 'wolny lot' : 'trasa z bramkami'}`;
    $('miGfx').textContent = `grafika: ${gfxName()}, sterowanie, dźwięk`;
    $('capLoc').textContent = L.name;
    $('capSub').textContent = `${L.title} · ${W.name}`;
    const best = store.get('best', {}), stars = store.get('stars', {});
    let nst = 0;
    for (const k in stars) { let m = stars[k]; while (m) { nst += m & 1; m >>= 1; } }
    const top = Math.max(0, ...Object.values(best));
    $('tStats').innerHTML = `<span>★ <b>${nst}</b>/${WS.LOCATIONS.length * WS.WEATHER.length * 3}</span>` +
      (top ? `<span>najlepszy lot <b>${fmt(top)}</b></span>` : '') + `<span class="q">grafika <b>${gfxName()}</b></span>`;
  }

  function buildSettings() {
    const seg = $('optQ');
    seg.innerHTML = '';
    const opts = [{ id: 'auto', name: 'Auto', sub: TIERS[autoTier].name }].concat(TIERS.map(t => ({ id: t.id, name: t.name })));
    for (const o of opts) {
      const b = document.createElement('button');
      b.innerHTML = o.name + (o.sub ? `<small>${o.sub}</small>` : '');
      b.className = S.gfx === o.id ? 'on' : '';
      b.onclick = () => { if (S.gfx === o.id) return; S.gfx = o.id; saveS(); app.audio.play('click'); applyQuality(true); };
      seg.appendChild(b);
    }
    const q = WS.Q, w = window.innerWidth, h = window.innerHeight;
    $('qDesc').textContent = (S.gfx === 'auto' ? `Automatycznie: ${q.name}. ` : '') + q.desc;
    const feats = [
      ['wygładzanie krawędzi', q.msaa > 0], ['poświata świateł', q.bloom], ['promienie słońca', q.rays], ['odblaski obiektywu', q.flare],
      ['rzeźba skał, połysk śniegu', q.hq > 0], ['dokładniejsze drzewa i chmury', q.hq > 0], ['gęstszy teren', q.seg > 48],
      [`detale terenu do ${fmt((q.R + 0.5) * 200)} m`, true], [`render ${Math.round(w * maxRatio)}×${Math.round(h * maxRatio)}`, true]
    ];
    $('qFeats').innerHTML = feats.map(([n, on]) => `<span class="${on ? 'on' : ''}">${n}</span>`).join('');
    let hwTxt = `Karta graficzna: <b>${hw.gpu}</b> · procesor: <b>${hw.cores}</b> wątków${hw.mem ? ` · pamięć: <b>${hw.mem} GB</b>` : ''}.<br>Ocena sprzętu: <b>${TIERS[hw.tier].name}</b>`;
    if (hw.why.length) hwTxt += ` (${hw.why.join(', ')})`;
    if (autoTier < hw.tier) hwTxt += `, po sprawdzeniu płynności: <b>${TIERS[autoTier].name}</b>`;
    $('qHw').innerHTML = hwTxt + '.';
    $('optSmoke').checked = S.smoke; $('optSlow').checked = S.slowmo; $('optInvert').checked = S.invert; $('optSound').checked = app.audio.enabled;
    $('optGhost').checked = S.ghost; $('optCalm').checked = S.calm; $('optFps').checked = S.fps;
  }

  // Zmiana poziomu: obróbka obrazu i rozdzielczość od razu, teren i drzewa przy następnej budowie świata
  // (rebuild = true przebudowuje świat w menu od razu, np. po wyborze w ustawieniach)
  function applyQuality(rebuild) {
    const q = TIERS[tierIndex()];
    if (q !== WS.Q) {
      WS.Q = q;
      post.setQuality(q);
      pixelRatio = WS.Quality.ratioFor(q, window.innerWidth, window.innerHeight);
      resize();
      post.setMSAA(true);
      fpsAcc = fpsN = fpsT = 0;
      if (rebuild && state === 'menu') menuWorld();
    }
    if (view === 'settings') buildSettings();
  }

  function menuWorld() {
    return buildWorld(S.loc, S.wx).then(() => { if (state === 'menu') startDemo(); });
  }

  function startDemo() {
    demo = true;
    const o = gameOpts();
    o.slowmo = false;
    app.weather.set(wxById(S.wx), o, app.world);
    game.start(o);
    demoT = 0;
    app.hud.show(false);
  }

  function goMenu(v) {
    state = 'menu';
    app.hud.show(false);
    showView(v || 'jump');
    menuWorld();
  }

  function startFlight() {
    app.audio.start();
    state = 'loading';
    showScreen(null);
    buildWorld(S.loc, S.wx).then(() => {
      demo = false;
      app.weather.set(wxById(S.wx), gameOpts(), app.world);
      app.pilot.smokeOn = S.smoke;
      const rec = store.get('ghost.' + S.loc + '|' + S.mode, null);
      app.ghost.set(rec);
      app.ghost.pilot.smokeOn = S.smoke;
      const o = gameOpts();
      o.ref = rec && rec.splits;
      game.start(o);
      app.rig.mode = S.cam || 0;
      state = 'play';
      // napisy z lotu pokazowego nie przechodzą do prawdziwego lotu
      $('popups').innerHTML = '';
      app.hud.show(true);
      showScreen(null);
      $('fade').classList.add('on');
      setTimeout(() => $('fade').classList.remove('on'), 60);
    });
  }

  function showResults() {
    state = 'results';
    const r = game.summary();
    const best = store.get('best', {});
    const key = S.loc + '|' + S.mode;
    const prevBest = best[key] || 0;
    const isBest = r.score > prevBest && r.score > 0;
    if (isBest) {
      best[key] = r.score; store.set('best', best);
      if (game.frames.length > 8) store.set('ghost.' + key, { v: 1, score: r.score, splits: r.splits, f: WS.ghostEncode(game.frames) });
    }
    const loc = locById(S.loc), wx = wxById(S.wx);
    // gwiazdki za to miejsce i pogodę
    const allStars = store.get('stars', {});
    const sk = S.loc + '|' + S.wx;
    const had = allStars[sk] || 0;
    let got = 0;
    WS.STARS.forEach((st, i) => { if (st.test(r, loc)) got |= 1 << i; });
    allStars[sk] = had | got; store.set('stars', allStars);
    $('resStars').innerHTML = WS.STARS.map((st, i) => {
      const cls = got & (1 << i) ? (had & (1 << i) ? 'on' : 'on new') : had & (1 << i) ? 'had' : '';
      return `<span class="${cls}" style="--d:${i * 0.25 + 0.3}s"><b>★</b>${st.desc ? st.desc(loc) : st.name}</span>`;
    }).join('');

    $('resKind').textContent = `${loc.name} · ${wx.name} · ${S.mode === 'wolny' ? 'wolny lot' : 'trasa'}${r.wxMult > 1 ? ` · punkty ×${fmt(r.wxMult, 2).replace(/0$/, '')}` : ''}`;
    const t = $('resTitle');
    const titles = { 'skała': 'UDERZENIE W SKAŁĘ', 'woda': 'UDERZENIE W WODĘ', 'drzewo': 'PROSTO W DRZEWO', 'most': 'UDERZENIE W MOST', 'łuk': 'UDERZENIE W ŁUK SKALNY' };
    t.textContent = r.ok ? r.kind.toUpperCase() : (titles[r.kind] || 'WYPADEK');
    t.className = r.ok ? 'ok' : 'bad';
    $('resScore').textContent = fmt(r.score);
    $('resBest').textContent = isBest ? (prevBest ? `★ NOWY REKORD (+${fmt(r.score - prevBest)})` : '★ PIERWSZY WYNIK – od teraz leci z Tobą duch tego lotu') : (prevBest ? `rekord: ${fmt(prevBest)} · brakło ${fmt(prevBest - r.score)}` : '');
    $('resCause').textContent = r.ok ? (r.landDist >= 26 ? `Lądowanie ${fmt(r.landDist)} m od środka koła. Otwórz spadochron, gdy znacznik LĄDOWISKO zrobi się zielony.` : '') : r.cause;
    const items = [
      ['Czas lotu', `${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}`],
      ['Prędkość maks.', `${fmt(r.top)} km/h`],
      ['Najbliżej skał', r.minProx < 1e8 ? `${fmt(r.minProx, 1)} m` : '–'],
      ['Bliskie przeloty', fmt(r.near)],
      ['Bramki', r.gatesTotal ? `${r.gatesOk}/${r.gatesTotal}` : 'wolny lot'],
      ['Najlepsza seria', r.comboBest ? `+${fmt(r.comboBest)}` : '–'],
      ['Lot przy ścianie', `${fmt(r.closeTime, 1)} s`],
      ['Przeciążenie maks.', `${fmt(r.maxG, 1)} g`],
      ['Dystans', `${fmt(r.dist / 1000, 2)} km`],
      r.ok ? ['Premia za lądowanie', `+${fmt(r.bonus)}`] : ['Uderzenie', `${fmt(r.impact || 0)} km/h (−${fmt(r.lost)})`]
    ];
    $('resGrid').innerHTML = items.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
    app.hud.show(false);
    app.ghost.hide();
    showScreen('results');
    // powtórka zaczyna się tuż przed najciekawszą chwilą lotu, w zwolnionym tempie, z kamery przy skale
    const m = game.bestMoment();
    const F = game.frames;
    highlight = null;
    replayT = 0;
    if (m && F.length > 2) {
      const t0 = F[0][0];
      replayT = Math.max(0, m.t - t0 - 2.2);
      highlight = { from: replayT, at: m.t - t0, until: m.t - t0 + 1.2, shot: false };
      const what = m.kind === 'near' ? `${fmt(m.min, 1)} m od skały przy ${fmt(m.sp)} km/h` : m.kind === 'most' ? `przelot pod mostem, ${fmt(m.sp)} km/h` : m.kind === 'łuk' ? `przelot przez skalne okno, ${fmt(m.sp)} km/h` : m.kind === 'cel' ? 'lądowanie w kole' : `uderzenie przy ${fmt(m.sp)} km/h`;
      $('resNote').textContent = `W tle: najlepszy moment lotu (${what}), potem cała powtórka.`;
    } else $('resNote').textContent = 'W tle leci powtórka Twojego lotu.';
    app.pilot.resetTrails();
    app.rig.snap();
  }

  function pause(on) {
    if (on && state === 'play') { state = 'pause'; showScreen('pause'); }
    else if (!on && state === 'pause') { state = 'play'; showScreen(null); }
  }

  $('btnGo').onclick = startFlight;
  $('btnResume').onclick = () => pause(false);
  $('btnRestart').onclick = () => { state = 'play'; showScreen(null); startFlight(); };
  $('btnMenu').onclick = () => goMenu('jump');
  $('btnMain').onclick = () => goMenu('main');
  $('btnAgain').onclick = startFlight;
  $('btnToMenu').onclick = () => goMenu('jump');

  // ---------- sterowanie ----------
  const keys = new Set();
  const pressed = new Set();
  const inp = { pitch: 0, roll: 0, tuck: false, spread: false, jumpPressed: false, chutePressed: false };
  const touch = { x: 0, y: 0, active: false, tuck: false, spread: false };
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'range') return;
    const k = e.code;
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    app.audio.start();
    if (state === 'menu') {
      if (view === 'press') { if (ready && !e.repeat) enterMain(); e.preventDefault(); return; }
      if (view === 'main') {
        if (k === 'ArrowDown' || k === 'KeyS') { selItem(menuSel + 1, true); app.audio.play('tick'); return; }
        if (k === 'ArrowUp' || k === 'KeyW') { selItem(menuSel - 1, true); app.audio.play('tick'); return; }
        if (k === 'Enter' || k === 'Space') { e.preventDefault(); menuAction(items[menuSel].dataset.a); return; }
        if (k === 'Escape') { showView('press'); return; }
      } else if (k === 'Escape') { app.audio.play('click'); showView('main'); return; }
    }
    if (k === 'Enter' && state === 'menu' && view === 'jump') { e.preventDefault(); startFlight(); }
    else if (k === 'Enter' && state === 'results') startFlight();
    else if ((k === 'Escape' || k === 'KeyP') && (state === 'play' || state === 'pause')) pause(state === 'play');
    else if (k === 'KeyR' && (state === 'play' || state === 'results' || state === 'pause')) startFlight();
    else if (k === 'KeyM') { app.audio.setEnabled(!app.audio.enabled); $('optSound').checked = app.audio.enabled; app.hud.toast(app.audio.enabled ? 'DŹWIĘK WŁĄCZONY' : 'DŹWIĘK WYŁĄCZONY'); }
    else if (k === 'KeyC' && (state === 'play' || state === 'results')) { const c = app.rig.next(); S.cam = app.rig.mode; saveS(); app.hud.toast(c.name.toUpperCase()); }
    else if (k === 'KeyH' && state === 'play') { S.smoke = !S.smoke; app.pilot.smokeOn = S.smoke; saveS(); app.hud.toast(S.smoke ? 'DYM WŁĄCZONY' : 'DYM WYŁĄCZONY'); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); pause(true); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { keys.clear(); pause(true); app.audio.suspend(); } else app.audio.resume();
  });

  // dotyk
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (isTouch) document.body.classList.add('touch');
  const stick = $('stick'), knob = $('knob');
  let stickId = null, stickC = null;
  stick.addEventListener('pointerdown', (e) => { stickId = e.pointerId; const r = stick.getBoundingClientRect(); stickC = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; stick.setPointerCapture(e.pointerId); moveStick(e); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  const endStick = (e) => { if (e.pointerId === stickId) { stickId = null; touch.x = touch.y = 0; knob.style.transform = ''; } };
  stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
  function moveStick(e) {
    let dx = (e.clientX - stickC.x) / stickC.r, dy = (e.clientY - stickC.y) / stickC.r;
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    touch.x = dx; touch.y = dy;
    knob.style.transform = `translate(${dx * 45}px, ${dy * 45}px)`;
  }
  for (const b of document.querySelectorAll('.tbtns button')) {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); app.audio.start(); b.classList.add('on');
      if (k === 'spread') { touch.spread = true; pressed.add('TouchJump'); }
      if (k === 'tuck') touch.tuck = true;
      if (k === 'chute') pressed.add('TouchChute');
      if (k === 'cam') { const c = app.rig.next(); app.hud.toast(c.name.toUpperCase()); }
      if (k === 'pause') pause(true);
    });
    const up = () => { b.classList.remove('on'); if (k === 'spread') touch.spread = false; if (k === 'tuck') touch.tuck = false; };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
  }

  let padPrev = {};
  let padNavT = 0;
  function readInput(dt) {
    let pT = 0, rT = 0;
    const inv = S.invert ? -1 : 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) pT -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) pT += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) rT -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) rT += 1;
    // klawiatura → płynne wychylenie
    inp.pitch = pT === 0 ? damp(inp.pitch, 0, 9, dt) : clamp(inp.pitch + Math.sign(pT * inv - inp.pitch) * dt * 4.5, -1, 1);
    inp.roll = rT === 0 ? damp(inp.roll, 0, 8, dt) : clamp(inp.roll + Math.sign(rT - inp.roll) * dt * 5, -1, 1);
    if (pT !== 0 && Math.abs(inp.pitch - pT * inv) < 0.06) inp.pitch = pT * inv;
    if (rT !== 0 && Math.abs(inp.roll - rT) < 0.06) inp.roll = rT;
    inp.tuck = keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.tuck;
    inp.spread = keys.has('Space') || touch.spread;
    inp.jumpPressed = pressed.has('Space') || pressed.has('TouchJump');
    inp.chutePressed = pressed.has('KeyF') || pressed.has('TouchChute');
    if (touch.x || touch.y) { inp.roll = touch.x; inp.pitch = touch.y * inv; }
    // pad
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (Math.abs(ax) > 0.12) inp.roll = ax;
      if (Math.abs(ay) > 0.12) inp.pitch = ay * inv;
      const btn = (i) => gp.buttons[i] && gp.buttons[i].pressed;
      if (btn(7)) inp.tuck = true;
      if (btn(6)) inp.spread = true;
      const edge = (i) => btn(i) && !padPrev[i];
      if (state === 'menu') {
        const up = btn(12) || ay < -0.6, down = btn(13) || ay > 0.6;
        padNavT -= dt;
        if ((up || down) && padNavT <= 0 && view === 'main') { selItem(menuSel + (down ? 1 : -1), true); app.audio.play('tick'); padNavT = 0.28; }
        if (!up && !down) padNavT = 0;
        if (edge(0)) { if (view === 'press') { if (ready) enterMain(); } else if (view === 'main') menuAction(items[menuSel].dataset.a); else if (view === 'jump') startFlight(); }
        if (edge(1) && view !== 'main' && view !== 'press') showView('main');
      } else if (edge(0)) { inp.jumpPressed = true; if (state === 'results') startFlight(); }
      if (edge(1)) inp.chutePressed = true;
      if (edge(3)) { const c = app.rig.next(); app.hud.toast(c.name.toUpperCase()); }
      if (edge(9)) pause(state === 'play');
      padPrev = {}; for (let i = 0; i < gp.buttons.length; i++) padPrev[i] = btn(i);
      break;
    }
    pressed.clear();
    return inp;
  }

  // ---------- pętla ----------
  let hudT = 0;
  const hlSlow = () => !!highlight && replayT >= highlight.at - 1.4 && replayT < highlight.until;
  let last = performance.now();
  let fpsAcc = 0, fpsN = 0, fpsT = 0;
  const tmpV = new V3(), tmpD = new V3();
  // sprawdzenie płynności w trybie auto: kilka sekund lotu pokazowego; za wolno → poziom niżej (najwyżej dwa razy)
  const bench = { warm: 0, t: 0, n: 0, drops: 0, done: S.gfx !== 'auto' };
  let meter = { t: 0, n: 0 }, capT = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    let rdt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // automatyczna jakość
    // (klatki budowania świata trwają ~40 ms i nie świadczą o płynności gry)
    if (building || state === 'loading') { fpsAcc = fpsN = fpsT = 0; } else { fpsAcc += rdt; fpsN++; fpsT += rdt; }
    if (!bench.done && S.gfx === 'auto' && state === 'menu' && demo && !building && !document.hidden) {
      if ((bench.warm += rdt) > 1.5) {
        bench.t += rdt; bench.n++;
        if (bench.t > 3) {
          const avg = bench.t / bench.n;
          if (avg > 1 / 40 && autoTier > 0 && bench.drops < 2) {
            autoTier--; bench.drops++;
            applyQuality(false);
            if (view === 'main') buildMain();
            bench.warm = bench.t = bench.n = 0;
          } else bench.done = true;
          store.set('gfxAuto', { gpu: hw.rawGpu, tier: autoTier });
        }
      }
      fpsAcc = fpsN = fpsT = 0;
    }
    if (fpsT > 2.5) {
      const avg = fpsAcc / fpsN, lo = WS.Q.minRatio;
      if (avg > 0.026 && pixelRatio > lo) { pixelRatio = Math.max(lo, pixelRatio - 0.25); post.setMSAA(false); resize(); }
      else if (avg < 0.0175 && pixelRatio < maxRatio && state !== 'pause') { pixelRatio = Math.min(maxRatio, pixelRatio + 0.25); if (pixelRatio >= maxRatio) post.setMSAA(true); resize(); }
      fpsAcc = 0; fpsN = 0; fpsT = 0;
    }
    if (S.fps) {
      meter.t += rdt; meter.n++;
      if (meter.t > 0.5) {
        $('fps').textContent = `${Math.round(meter.n / meter.t)} kl/s · ${WS.Q.name} · ${Math.round(window.innerWidth * pixelRatio)}×${Math.round(window.innerHeight * pixelRatio)}`;
        meter.t = meter.n = 0;
      }
    }
    const U = WS.U3;
    U.uTime.value += rdt;
    const time = U.uTime.value;
    const input = readInput(rdt);
    if (!app.world || !app.terrain || building) { renderer.clear(); return; }

    let fl = game.fl;
    let target = fl;
    let camOpts = { turb: S.turb / 100, prox: 0 };
    if ((state === 'menu' || state === 'loading') && demo && fl) {
      // lot pokazowy z autopilotem
      demoT += rdt;
      let di = { pitch: 0, roll: 0 };
      if (fl.phase === 'ledge' && demoT > 1.2) di.jumpPressed = true;
      if (fl.phase === 'flight') {
        const w = app.world;
        const tg = game.next < w.gates.length ? w.gates[game.next] : { x: w.land.x, y: w.land.y + 60, z: w.land.z };
        di = WS.autopilot(fl, w, tg, { margin: 18 });
        if (game.agl < 120 && game.next >= w.gates.length) di.chutePressed = true;
      }
      game.update(rdt, di);
      if (game.result && game.endT > 3) startDemo();
      demoCam += rdt;
      const modes = [2, 3, 0, 2, 3];
      app.rig.mode = modes[Math.floor(demoCam / 6) % modes.length];
      camOpts.ledgeView = 'ledge';
    } else if (state === 'play') {
      game.update(rdt, input);
      camOpts.prox = game.pf;
      if (game.result && game.endT > (game.result.ok ? 3 : 3.2)) showResults();
    } else if (state === 'results') {
      const hl = highlight;
      replayT += rdt * (hlSlow() ? 0.3 : 1);
      if (hl && replayT >= hl.until + 2.5) highlight = null;
      ghost = game.replayState(replayT, ghost);
      if (ghost) target = ghost;
      camOpts.replay = true;
      // ujęcie najlepszej chwili: kamera stoi przy torze lotu, pilot przelatuje obok
      if (hl && ghost && !hl.shot) {
        hl.shot = true;
        const pm = game.replayState(hl.at, null);
        if (pm) app.rig.setShot(pm.pos, pm.vel);
      }
      if (hl && replayT < hl.until + 2) camOpts.force = 'kino';
      if (replayT > 0.1 && ghost && ghost.flightTime < 0.15) app.pilot.resetTrails();
    }
    fl = target;
    if (!fl) return;

    // świat wokół pilota
    app.terrain.update(fl.pos.x, fl.pos.z, state === 'results' ? 8 : 5);
    app.weather.sample(time, fl.pos, 0, game.env);
    if (state === 'results') app.rig.update(rdt * (hlSlow() ? 0.3 : 1), fl, camOpts);
    else if (state === 'menu') app.rig.update(rdt, fl, camOpts);
    else if (state !== 'pause') app.rig.update(rdt * (game.timeScale || 1), fl, camOpts);
    if (window.__ws.camOverride) { const o = window.__ws.camOverride; camera.position.fromArray(o.pos); camera.up.set(0, 1, 0); camera.lookAt(new V3().fromArray(o.look)); camera.fov = o.fov || 70; camera.updateProjectionMatrix(); }
    U.uCam.value.copy(camera.position);
    lights.sun.position.copy(camera.position).addScaledVector(U.uSunDir.value, 100);
    lights.sun.target.position.copy(camera.position);
    app.sky.update(camera, rdt);
    const pvel = fl.vel || tmpV.set(0, 0, 0);
    app.weather.update(state === 'pause' ? 0 : rdt, time, camera, pvel, game.env.wind);
    for (const ev of app.weather.events) app.audio.schedule('thunder', ev.delay, { power: ev.power });
    app.weather.events.length = 0;
    app.props.update(rdt, time, game.next);
    app.props.animate(time, game.env.wind);
    app.ghost.update(game.fl.flightTime, state === 'pause' ? 0 : rdt * (game.timeScale || 1), time, camera,
      S.ghost && state === 'play' && game.fl.phase !== 'ledge' && !game.result);
    const helm = app.rig.modeId === 'helm';
    app.pilot.update(fl, state === 'pause' ? 0 : rdt * (game.timeScale || 1), time, camera, !helm || fl.phase === 'ledge' ? true : false);
    if (helm && fl.phase !== 'ledge') app.pilot.root.visible = false;

    // obróbka obrazu
    const kmh = (fl.airspeed || 0) * 3.6;
    if (state === 'menu' && view === 'main' && (capT -= rdt) <= 0) {
      capT = 0.12;
      $('capSpd').textContent = fmt(kmh);
      $('capAgl').textContent = fmt(Math.max(0, game.agl || 0));
    }
    const flying = fl.phase === 'flight';
    const pu = post.u;
    const calm = S.calm ? 0.25 : 1;
    app.rig.calm = S.calm;
    const blur = (flying && app.rig.modeId !== 'kino' ? smoothstep(150, 400, kmh) * 0.9 + (fl.tuck ? 0.15 : 0) : 0) * calm;
    pu.uBlur.value = damp(pu.uBlur.value, blur, 4, rdt);
    pu.uAberr.value = damp(pu.uAberr.value, flying ? smoothstep(180, 420, kmh) + (state === 'play' ? game.pf * 0.6 : 0) : 0, 4, rdt);
    const wxc = wxById(S.wx);
    pu.uExposure.value = wxc.exposure || 1;
    pu.uSat.value = wxc.sat || 1;
    // poświata i słońce na ekranie: promienie przez szczeliny chmur i grani, odblaski obiektywu
    const bl = wxc.bloom || [0.15, 1];
    pu.uBloom.value = bl[0];
    post.bloomCfg.thr = bl[1]; post.bloomCfg.knee = bl[1] * 0.5;
    camera.updateMatrixWorld();
    tmpV.copy(U.uSunDir.value).multiplyScalar(5000).add(camera.position).project(camera);
    camera.getWorldDirection(tmpD);
    const sunOn = tmpV.z < 1 ? smoothstep(0, 0.25, tmpD.dot(U.uSunDir.value)) * (1 - smoothstep(1, 1.6, Math.max(Math.abs(tmpV.x), Math.abs(tmpV.y)))) : 0;
    pu.uSunUV.value.set(tmpV.x * 0.5 + 0.5, tmpV.y * 0.5 + 0.5);
    const inCloud = 1 - pu.uWhite.value;
    pu.uRays.value = (wxc.rays || 0) * sunOn * inCloud;
    pu.uFlare.value = (wxc.disk === 1 ? 1 : wxc.disk === 2 ? 0.3 : 0) * sunOn * inCloud;
    pu.uRayCol.value.copy(U.uSunCol.value);
    pu.uVig.value = 0.32 + (state === 'play' ? game.adr * 0.35 : 0.1);
    pu.uRed.value = state === 'play' ? Math.max(game.warn * 0.9, game.flash * calm) : 0;
    const cd = app.sky.density(camera.position);
    pu.uWhite.value = damp(pu.uWhite.value, cd, 6, rdt);
    pu.uFlash.value = (WS.U3.uFlash.value * 0.08 + (state === 'play' ? game.flash * 0.4 : 0)) * calm;
    pu.uTime.value = time % 100;
    pu.uDesat.value = state === 'pause' ? 0.7 : (game.result && !game.result.ok && state === 'play' ? 0.5 : 0);
    if (flying && fl.vel) {
      tmpV.copy(fl.pos).addScaledVector(fl.vel, 4).project(camera);
      if (tmpV.z < 1) pu.uCenter.value.set(clamp(tmpV.x * 0.5 + 0.5, 0.15, 0.85), clamp(tmpV.y * 0.5 + 0.5, 0.15, 0.85));
    } else pu.uCenter.value.set(0.5, 0.5);

    // dźwięk
    const hs = state === 'play' ? game.hudState() : null;
    if (hs) { hudT -= rdt; hs.full = hudT <= 0; if (hs.full) hudT = 1 / 15; }
    app.audio.tick(rdt);
    app.audio.update(rdt, {
      speed: fl.airspeed || 0, phase: state === 'pause' ? 'paused' : fl.phase, prox: state === 'play' ? game.pf : 0, adr: state === 'play' ? game.adr : 0.1,
      heart: state === 'play' && (fl.phase === 'flight' || fl.phase === 'chute' || fl.phase === 'ledge'), warn: state === 'play' && fl.phase === 'flight' ? game.warn : 0,
      rain: wxById(S.wx).particles === 'deszcz' ? 1 : 0, music: state === 'play', pan: (fl.bank || 0) * 0.4, ambientWind: S.wind
    });

    if (state === 'play' && hs) app.hud.update(hs, camera, rdt);
    else hudT = 0;
    post.render(scene, camera);
  }

  // ---------- start ----------
  resize();
  app.pilot.smokeOn = S.smoke;
  $('fps').classList.toggle('on', S.fps);
  showView('press');
  menuWorld().then(() => { ready = true; $('title').classList.add('ready'); });
  requestAnimationFrame(loop);
  window.__ws = { app, game, S, hw, post, startFlight, goMenu, menuWorld, buildMenu, showView, applyQuality, get tier() { return WS.Q.id; }, bench };
})();
