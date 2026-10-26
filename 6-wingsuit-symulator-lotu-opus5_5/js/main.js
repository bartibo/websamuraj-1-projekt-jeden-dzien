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
    'Kamera filmowa (C) pokazuje przelot z boku, tak jak na nagraniach z zawodów.'
  ];

  // ---------- ustawienia ----------
  const S = Object.assign({
    loc: 'dolomity', wx: 'slonce', wind: 3, windDir: 'czolowy', turb: 12, mode: 'trasa',
    smoke: true, slowmo: true, invert: false, cam: 0
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
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pixelRatio);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.3, 60000);
  const lights = { sun: new THREE.DirectionalLight(0xffffff, 1), hemi: new THREE.HemisphereLight(0xffffff, 0x444444, 1) };
  scene.add(lights.sun, lights.sun.target, lights.hemi);
  const post = new WS.Post(renderer);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
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
  app.rig = new WS.CameraRig(camera, null);
  app.rig.mode = S.cam || 0;
  const game = new WS.Game(app);
  app.game = game;

  let state = 'menu';
  let demo = false;
  let replayT = 0, ghost = null, demoT = 0, demoCam = 0;
  const locById = (id) => WS.LOCATIONS.find(l => l.id === id) || WS.LOCATIONS[0];
  const wxById = (id) => WS.WEATHER.find(w => w.id === id) || WS.WEATHER[0];

  function gameOpts() {
    const dir = WS.WIND_DIRS.find(d => d.id === S.windDir) || WS.WIND_DIRS[0];
    return { mode: S.mode, wind: S.wind, windAngle: dir.angle, turb: S.turb / 100, slowmo: S.slowmo };
  }

  // Budowa świata (asynchronicznie, z paskiem postępu)
  let building = null;
  function buildWorld(locId, wxId) {
    const key = locId + '|' + wxId;
    if (app.built === key) return Promise.resolve();
    if (building && building.key === key) return building.p;
    const loc = locById(locId), wx = wxById(wxId);
    $('loadTitle').textContent = `${loc.name} · ${wx.name}`;
    $('loadTip').textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
    $('loadFill').style.width = '0%';
    $('loading').classList.add('on');
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
        $('loadFill').style.width = (prog * 100).toFixed(0) + '%';
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
    const locs = $('locs');
    locs.innerHTML = '';
    for (const l of WS.LOCATIONS) {
      const b = document.createElement('button');
      b.className = 'loc' + (S.loc === l.id ? ' on' : '');
      const rec = Math.max(best[l.id + '|trasa'] || 0, best[l.id + '|wolny'] || 0);
      b.innerHTML = `<div class="t">${l.name}<em>${l.title}</em></div><p>${l.desc}</p><div class="tags">${l.tags.map(t => `<span>${t}</span>`).join('')}</div>${rec ? `<div class="rec">rekord ${fmt(rec)}</div>` : ''}`;
      b.onclick = () => { S.loc = l.id; saveS(); buildMenu(); app.audio.start(); app.audio.play('click'); menuWorld(); };
      locs.appendChild(b);
    }
    const wxs = $('wxs');
    wxs.innerHTML = '';
    for (const w of WS.WEATHER) {
      const b = document.createElement('button');
      b.className = 'wx' + (S.wx === w.id ? ' on' : '');
      b.innerHTML = `<span class="i">${w.icon}</span><span class="n">${w.name}</span>`;
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
    $('optSmoke').checked = S.smoke; $('optSlow').checked = S.slowmo; $('optInvert').checked = S.invert; $('optSound').checked = app.audio.enabled;
    const bv = best[S.loc + '|' + S.mode];
    $('bestLbl').innerHTML = bv ? `Rekord: <b>${fmt(bv)}</b> pkt` : 'Pierwszy skok w tym miejscu';
  }
  $('optWind').oninput = (e) => { S.wind = +e.target.value; $('windOut').textContent = S.wind + ' m/s'; saveS(); };
  $('optTurb').oninput = (e) => { S.turb = +e.target.value; $('turbOut').textContent = S.turb + '%'; saveS(); };
  $('optSmoke').onchange = (e) => { S.smoke = e.target.checked; saveS(); app.pilot.smokeOn = S.smoke; };
  $('optSlow').onchange = (e) => { S.slowmo = e.target.checked; saveS(); };
  $('optInvert').onchange = (e) => { S.invert = e.target.checked; saveS(); };
  $('optSound').onchange = (e) => { app.audio.start(); app.audio.setEnabled(e.target.checked); };

  function showScreen(id) {
    for (const s of ['menu', 'pause', 'results']) $(s).classList.toggle('on', s === id);
    $('touch').classList.toggle('on', state === 'play');
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

  function goMenu() {
    state = 'menu';
    app.hud.show(false);
    showScreen('menu');
    buildMenu();
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
      game.start(gameOpts());
      app.rig.mode = S.cam || 0;
      state = 'play';
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
    const isBest = r.score > (best[key] || 0);
    if (isBest) { best[key] = r.score; store.set('best', best); }
    const loc = locById(S.loc), wx = wxById(S.wx);
    $('resKind').textContent = `${loc.name} · ${wx.name} · ${S.mode === 'wolny' ? 'wolny lot' : 'trasa'}`;
    const t = $('resTitle');
    const titles = { 'skała': 'UDERZENIE W SKAŁĘ', 'woda': 'UDERZENIE W WODĘ', 'drzewo': 'PROSTO W DRZEWO', 'most': 'UDERZENIE W MOST', 'łuk': 'UDERZENIE W ŁUK SKALNY' };
    t.textContent = r.ok ? `LĄDOWANIE: ${r.kind.toUpperCase()}` : (titles[r.kind] || 'WYPADEK');
    t.className = r.ok ? 'ok' : 'bad';
    $('resScore').textContent = fmt(r.score);
    $('resBest').textContent = isBest ? '★ NOWY REKORD' : (best[key] ? `rekord: ${fmt(best[key])}` : '');
    const items = [
      ['Czas lotu', `${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}`],
      ['Prędkość maks.', `${fmt(r.top)} km/h`],
      ['Najbliżej skał', r.minProx < 1e8 ? `${fmt(r.minProx, 1)} m` : '–'],
      ['Bliskie przeloty', fmt(r.near)],
      ['Bramki', r.gatesTotal ? `${r.gatesOk}/${r.gatesTotal}` : 'wolny lot'],
      ['Dystans', `${fmt(r.dist / 1000, 2)} km`],
      ['Przewyższenie', `${fmt(Math.max(0, r.drop))} m`],
      ['Przeciążenie maks.', `${fmt(r.maxG, 1)} g`],
      ['Lot przy ścianie', `${fmt(r.closeTime, 1)} s`],
      r.ok ? ['Premia za lądowanie', `+${fmt(r.bonus)}`] : ['Uderzenie', `${fmt(r.impact || 0)} km/h (−${fmt(r.lost)})`]
    ];
    $('resGrid').innerHTML = items.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
    app.hud.show(false);
    showScreen('results');
    replayT = 0;
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
  $('btnMenu').onclick = goMenu;
  $('btnAgain').onclick = startFlight;
  $('btnToMenu').onclick = goMenu;

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
    if (k === 'Enter' && state === 'menu') startFlight();
    else if (k === 'Enter' && state === 'results') startFlight();
    else if ((k === 'Escape' || k === 'KeyP') && (state === 'play' || state === 'pause')) pause(state === 'play');
    else if (k === 'KeyR' && (state === 'play' || state === 'results' || state === 'pause')) startFlight();
    else if (k === 'KeyM') { app.audio.setEnabled(!app.audio.enabled); $('optSound').checked = app.audio.enabled; app.hud.toast(app.audio.enabled ? 'DŹWIĘK WŁĄCZONY' : 'DŹWIĘK WYŁĄCZONY'); }
    else if (k === 'KeyC' && (state === 'play' || state === 'results')) { const c = app.rig.next(); S.cam = app.rig.mode; saveS(); app.hud.toast(c.name.toUpperCase()); }
    else if (k === 'KeyH' && state === 'play') { S.smoke = !S.smoke; app.pilot.smokeOn = S.smoke; saveS(); app.hud.toast(S.smoke ? 'DYM WŁĄCZONY' : 'DYM WYŁĄCZONY'); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

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
      if (edge(0)) { inp.jumpPressed = true; if (state === 'menu' || state === 'results') startFlight(); }
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
  let last = performance.now();
  let fpsAcc = 0, fpsN = 0, fpsT = 0;
  const tmpV = new V3();

  function loop(now) {
    requestAnimationFrame(loop);
    let rdt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // automatyczna jakość
    fpsAcc += rdt; fpsN++; fpsT += rdt;
    if (fpsT > 2.5) {
      const avg = fpsAcc / fpsN;
      if (avg > 0.026 && pixelRatio > 0.75) { pixelRatio = Math.max(0.75, pixelRatio - 0.25); resize(); }
      fpsAcc = 0; fpsN = 0; fpsT = 0;
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
      const modes = [0, 0, 2, 0, 3];
      app.rig.mode = modes[Math.floor(demoCam / 6) % modes.length];
      camOpts.ledgeView = 'ledge';
    } else if (state === 'play') {
      game.update(rdt, input);
      camOpts.prox = game.pf;
      if (game.result && game.endT > (game.result.ok ? 3 : 3.2)) showResults();
    } else if (state === 'results') {
      replayT += rdt;
      ghost = game.replayState(replayT, ghost);
      if (ghost) target = ghost;
      camOpts.replay = true;
      if (replayT > 0.1 && ghost && ghost.flightTime < 0.15) app.pilot.resetTrails();
    }
    fl = target;
    if (!fl) return;

    // świat wokół pilota
    app.terrain.update(fl.pos.x, fl.pos.z, state === 'results' ? 8 : 5);
    app.weather.sample(time, fl.pos, 0, game.env);
    if (state === 'results' || state === 'menu') app.rig.update(rdt, fl, camOpts);
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
    const helm = app.rig.modeId === 'helm';
    app.pilot.update(fl, state === 'pause' ? 0 : rdt * (game.timeScale || 1), time, camera, !helm || fl.phase === 'ledge' ? true : false);
    if (helm && fl.phase !== 'ledge') app.pilot.root.visible = false;

    // obróbka obrazu
    const kmh = (fl.airspeed || 0) * 3.6;
    const flying = fl.phase === 'flight';
    const pu = post.u;
    const blur = flying && app.rig.modeId !== 'kino' ? smoothstep(150, 400, kmh) * 0.9 + (fl.tuck ? 0.15 : 0) : 0;
    pu.uBlur.value = damp(pu.uBlur.value, blur, 4, rdt);
    pu.uAberr.value = damp(pu.uAberr.value, flying ? smoothstep(180, 420, kmh) + (state === 'play' ? game.pf * 0.6 : 0) : 0, 4, rdt);
    pu.uExposure.value = wxById(S.wx).exposure || 1;
    pu.uVig.value = 0.32 + (state === 'play' ? game.adr * 0.35 : 0.1);
    pu.uRed.value = state === 'play' ? Math.max(game.warn * 0.9, game.flash) : 0;
    const cd = app.sky.density(camera.position);
    pu.uWhite.value = damp(pu.uWhite.value, cd, 6, rdt);
    pu.uFlash.value = WS.U3.uFlash.value * 0.18 + (state === 'play' ? game.flash * 0.4 : 0);
    pu.uTime.value = time % 100;
    pu.uDesat.value = state === 'pause' ? 0.7 : (game.result && !game.result.ok && state === 'play' ? 0.5 : 0);
    if (flying && fl.vel) {
      tmpV.copy(fl.pos).addScaledVector(fl.vel, 4).project(camera);
      if (tmpV.z < 1) pu.uCenter.value.set(clamp(tmpV.x * 0.5 + 0.5, 0.15, 0.85), clamp(tmpV.y * 0.5 + 0.5, 0.15, 0.85));
    } else pu.uCenter.value.set(0.5, 0.5);

    // dźwięk
    const hs = state === 'play' ? game.hudState() : null;
    app.audio.tick(rdt);
    app.audio.update(rdt, {
      speed: fl.airspeed || 0, phase: state === 'pause' ? 'paused' : fl.phase, prox: state === 'play' ? game.pf : 0, adr: state === 'play' ? game.adr : 0.1,
      heart: state === 'play' && (fl.phase === 'flight' || fl.phase === 'chute' || fl.phase === 'ledge'), warn: state === 'play' && fl.phase === 'flight' ? game.warn : 0,
      rain: wxById(S.wx).particles === 'deszcz' ? 1 : 0, music: state === 'play', pan: (fl.bank || 0) * 0.4, ambientWind: S.wind
    });

    if (state === 'play' && hs) app.hud.update(hs, camera, rdt);
    post.render(scene, camera);
  }

  // ---------- start ----------
  resize();
  buildMenu();
  app.pilot.smokeOn = S.smoke;
  showScreen('menu');
  menuWorld();
  requestAnimationFrame(loop);
  window.__ws = { app, game, S, startFlight, goMenu, menuWorld, buildMenu };
})();
