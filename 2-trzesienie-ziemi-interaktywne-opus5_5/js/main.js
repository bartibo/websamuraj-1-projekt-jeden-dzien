'use strict';
/* Start aplikacji, pętla główna, kamera, klawiatura, podpowiedzi po najechaniu. */

const VIEWS = [
  { name: 'Panorama', target: [-5, 10, -55], radius: 400, theta: 0.7, phi: 1.02 },
  { name: 'Centrum', target: [0, 22, -75], radius: 150, theta: 0.85, phi: 1.2 },
  { name: 'Ulica', target: [20, 9, -50], radius: 52, theta: 1.5708, phi: 1.4 },
  { name: 'Wybrzeże', target: [-40, 4, 30], radius: 270, theta: 1.05, phi: 1.2 },
  { name: 'Z góry', target: [0, 0, -65], radius: 430, theta: 0.0, phi: 0.18 },
  { name: 'Fala', target: [0, 4, 75], radius: 250, theta: 0.7, phi: 1.02, follow: true }
];

const Main = {
  time: 0,
  slow: false,
  shakeOn: true,
  peakI: 1,
  kick: 0,
  lastTsunami: null,
  warned: new Set(),

  init() {
    const canvas = $('view');
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(window.innerWidth, window.innerHeight, false);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate = false;
    r.shadowMap.needsUpdate = true;
    this.shadowFrames = 5;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;

    Quake.init();
    City.makePlan();
    World.init(r);
    this.scene = World.scene;
    this.camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 1, 9000);
    FX.init(this.scene);
    City.build(this.scene);
    Flood.init(this.scene);
    Flood.bindBuildings();
    this.controls = new OrbitCam(this.camera, canvas);
    this.controls.radius = 720;
    this.controls.phi = 0.7;
    this.controls.theta = 1.3;
    this.controls.flyTo(VIEWS[0]);
    this.controls.onUserInput = () => {
      document.querySelectorAll('#viewSeg button').forEach(b => b.classList.remove('on'));
    };
    Seismo.init($('seismo'));
    UI.init();
    this.setTOD('sunset');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindKeys();
    this.bindHover(canvas);
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('button');
      if (b) b.blur();
    });
    Quake.onEvent = ev => {
      UI.toast(`Wstrząs wtórny · M ${U.fmt(ev.M, 1)}`, 'alert');
      UI.startLive(ev);
    };
    this.ray = new THREE.Raycaster();
    this.last = performance.now();
    requestAnimationFrame(t => this.frame(t));
    this.warmup();
  },

  /* Rozgrzewka: każdy rodzaj efektu rysujemy raz (pod ziemią), żeby shadery skompilowały się
     przed startem, a nie w środku trzęsienia (to dawało przycięcia po kilkaset ms). */
  warmup() {
    const c = new THREE.Color(0.5, 0.5, 0.5);
    for (let i = 0; i < 3; i++) FX.rubble.add(i * 3, -40, -60, 0, 0, 0, 1, c);
    FX.dust.spawn({ x: 0, y: -40, z: -60, life: 5, s0: 2 });
    FX.fire.spawn({ x: 0, y: -40, z: -60, life: 5, s0: 2 });
    FX.cracks.spawn(0, -60, 6, 0.5, 0);
    FX.cracks.update(0.016);
    FX.dust.update(0.016, this.scene.fog);
    FX.fire.update(0.016, this.scene.fog);
    FX.rubble.update(0.016);
    FX.glowBuf.length = 0;
    FX.glowBuf.push(0, -40, -60, 1, 1, 1, 2);
    FX.updateGlow(0);
    for (const L of FX.lights) { L.intensity = 1; L.position.set(0, -30, -60); }
    const shadowAuto = this.renderer.shadowMap.autoUpdate;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.compile(this.scene, this.camera);
    this.renderer.render(this.scene, this.camera);
    for (const tod of ['day', 'night', 'sunset']) {
      this.setTOD(tod);
      this.renderer.shadowMap.needsUpdate = true;
      this.renderer.render(this.scene, this.camera);
    }
    this.renderer.shadowMap.autoUpdate = shadowAuto;
    FX.clear();
    this.shadowFrames = 5;
  },

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    FX.setScale(h * this.renderer.getPixelRatio(), this.camera.fov);
    if (Seismo.cv) Seismo.resize();
  },

  setTOD(k) {
    this.shadowFrames = 3;
    World.setTOD(k);
    City.setTOD(TOD[k]);
    const env = TOD[k].env;
    for (const b of City.buildings) {
      b.mat.envMapIntensity = b.type === 'tower' || b.type === 'office' ? env * 1.5 : env;
      b.roofMat.envMapIntensity = env;
    }
    UI.setTOD(k);
  },

  view(i) {
    this.follow = !!VIEWS[i].follow;
    this.controls.flyTo(VIEWS[i]);
    document.querySelectorAll('#viewSeg button').forEach((b, k) => b.classList.toggle('on', k === i));
  },

  toggle(what) {
    if (what === 'slow') { this.slow = !this.slow; UI.setToggle('tSlow', this.slow); UI.toast(this.slow ? '🐢 Zwolnione tempo ×0,3' : 'Normalne tempo'); }
    if (what === 'auto') { this.controls.auto = !this.controls.auto; UI.setToggle('tAuto', this.controls.auto); }
    if (what === 'shake') { this.shakeOn = !this.shakeOn; UI.setToggle('tShake', this.shakeOn); }
    if (what === 'sound') { Sound.init(); Sound.setEnabled(!Sound.enabled); UI.setToggle('tSound', Sound.enabled); }
    if (what === 'after') { Quake.aftershocks = !Quake.aftershocks; UI.setToggle('tAfter', Quake.aftershocks); }
  },

  trigger() {
    Sound.init();
    const p = Object.assign({}, UI.params);
    if (Quake.events.length === 0) { this.peakI = 1; this.warned.clear(); }
    const before = Quake.events.length;
    const ev = Quake.trigger(p);
    const now = Seismo.clock;
    for (let i = before; i < Quake.events.length; i++) {
      const e = Quake.events[i];
      const off = now + (e.t0 - Quake.time);
      if (e.kind === 'main') {
        Seismo.addMarker(off + e.tPa, 'P', '#7fd1ff');
        Seismo.addMarker(off + e.tSa, 'S', '#ffb347');
      } else Seismo.addMarker(off + e.tSa, 'W', '#ff7b7b');
    }
    if (Quake.tsunami) this.lastTsunami = Quake.tsunami;
    UI.startLive(ev);
    const mc = Seis.magClass(p.M);
    const I = Math.round(ev.I);
    UI.banner(`M ${U.fmt(p.M, 1)} · ${mc.name}`, `epicentrum ${p.dist} km od miasta, głębokość ${p.depth} km · przewidywana intensywność ${U.roman(I)}`, mc.color);
    if (this.controls.auto === false && this.autoOnQuake) this.controls.auto = true;
  },

  rebuild() {
    Quake.stopAll();
    FX.clear();
    City.build(this.scene);
    Flood.reset();
    Flood.bindBuildings();
    Flood.setWall(Flood.wallH);
    this.setTOD(World.tod);
    World.updateGround();
    World.seaColorsDirty = true;
    Sound.setSiren(false);
    Sound.setShake(0, 0);
    Sound.setWater(0);
    this.peakI = 1;
    this.lastTsunami = null;
    $('live').hidden = true;
    $('report').hidden = true;
    $('go').classList.remove('shaking');
    UI.liveShown = false;
    UI.reportPending = false;
    this.shadowFrames = 3;
    UI.toast('🏗 Miasto odbudowane');
  },

  /* ----------------------------------------------------- pomocnicze (dźwięk, kamera) */
  panFor(x, z) {
    const c = this.camera;
    const e = c.matrixWorld.elements;
    const dx = x - c.position.x, dz = z - c.position.z;
    const l = Math.hypot(dx, dz) || 1;
    return U.clamp((dx * e[0] + dz * e[2]) / l, -1, 1) * 0.8;
  },
  distFactor(x, z, raw) {
    const c = this.camera.position;
    const d = Math.hypot(x - c.x, z - c.z, World.G0 - c.y);
    if (raw) return Math.max(0.5, d / 120);
    return U.clamp(d / 600, 0, 1);
  },
  shakeKick(a) { this.kick = Math.min(2.5, this.kick + a); },
  liveDamage(b) {
    if (b.collapsed) {
      const t = performance.now();
      if (!this.lastColToast || t - this.lastColToast > 2500) {
        this.lastColToast = t;
        const what = b.washed ? '🌊 Woda porwała' : b.byWater ? '🌊 Woda zburzyła' : '💥 Zawalił się';
        UI.toast(`${what}: ${b.name.toLowerCase()}`, 'alert');
      }
    }
  },

  /* Komunikaty o kolejnych falach tsunami. */
  waveNews(ts) {
    const seen = ts.news || (ts.news = new Set());
    const n = ts.wavesArrived(), all = ts.crests.length;
    if (n > 0 && !seen.has('w' + n)) {
      seen.add('w' + n);
      const big = n > 1 && ts.crests[n - 1].amp > ts.crests[n - 2].amp;
      UI.toast(n === 1 ? '🌊 Pierwsza fala uderza w wybrzeże' : `🌊 Fala ${n} z ${all}${big ? ' – większa od poprzedniej!' : ''}`, 'alert');
      if (n > 1) UI.banner(`🌊 FALA ${n}`, big ? 'kolejna fala bywa groźniejsza od pierwszej' : 'woda znów wdziera się do miasta', '#6fd3ff');
    }
    const c = ts.crests[n - 1];
    if (c && n < all && ts.tau > c.e + Tsunami.TRAVEL + 4 && !seen.has('r' + n)) {
      seen.add('r' + n);
      UI.toast('⚠ Woda się cofa. Nie wracaj na brzeg – kolejna fala już płynie', 'info');
    }
  },

  bindKeys() {
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'SELECT') return;
      const k = e.key.toLowerCase();
      const inRange = document.activeElement && document.activeElement.type === 'range';
      if (e.code === 'Space') { e.preventDefault(); this.trigger(); return; }
      if ((k === 'arrowup' || k === 'arrowdown') && !inRange) {
        e.preventDefault();
        const d = (k === 'arrowup' ? 1 : -1) * (e.shiftKey ? 0.5 : 0.1);
        UI.params.M = U.clamp(Math.round((UI.params.M + d) * 10) / 10, 1, 9.9);
        UI.apply(UI.params);
        UI.markScenario(-1);
        return;
      }
      if (k === 'r') this.rebuild();
      else if (k === 's') this.toggle('slow');
      else if (k === 'c') this.toggle('auto');
      else if (k === 'k') this.toggle('shake');
      else if (k === 'm') this.toggle('sound');
      else if (k === 'a') this.toggle('after');
      else if (k === 'h' || k === '?') UI.help($('help').hidden);
      else if (k === 'escape') UI.help(false);
      else if (k === 't') {
        const order = ['day', 'sunset', 'night'];
        this.setTOD(order[(order.indexOf(World.tod) + 1) % 3]);
      } else if (k >= '1' && k <= '6') this.view(+k - 1);
    });
  },

  bindHover(canvas) {
    this.mouse = new THREE.Vector2();
    let lastT = 0, pending = null;
    canvas.addEventListener('pointermove', e => {
      if (e.buttons) { UI.tooltip(null); return; }
      pending = e;
      const t = performance.now();
      if (t - lastT < 70) return;
      lastT = t;
      this.pick(pending);
    });
    canvas.addEventListener('pointerleave', () => UI.tooltip(null));
    canvas.addEventListener('pointerdown', () => UI.tooltip(null));
  },

  pick(e) {
    this.mouse.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    this.ray.setFromCamera(this.mouse, this.camera);
    const hit = this.ray.intersectObjects(City.pickables, false)[0];
    const b = hit && hit.object.userData.b;
    UI.tooltip(b || null, e.clientX, e.clientY);
    this.hoverB = b;
    this.hoverE = e;
  },

  /* ---------------------------------------------------------------- pętla */
  frame(now) {
    requestAnimationFrame(t => this.frame(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    const dtS = dt * (this.slow ? 0.3 : 1);
    this.time += dtS;

    Quake.update(dtS);
    Flood.update(dtS, this.time);
    Debris.idle(dtS, this.time);
    if (Quake.events.length) this.peakI = Math.max(this.peakI, City.maxIeff);
    World.updateGround();
    City.update(dtS, this.time);
    FX.update(dtS, this.time, this.camera);
    World.updateSea(this.time);
    Flood.updateMesh(this.time);

    // ostrzeżenia: system wczesnego ostrzegania i tsunami
    for (const ev of Quake.events) {
      if (ev.kind !== 'main' || this.warned.has(ev)) continue;
      if (Quake.time >= ev.t0 + ev.tPa) {
        this.warned.add(ev);
        if (ev.I >= 5 && ev.gapReal > 1.5) {
          UI.toast(`📡 Wczesne ostrzeżenie: fala S dotrze za ${U.fmt(ev.gapReal, 0)} s`, 'info');
          Sound.alert();
        }
      }
    }
    const ts = Quake.tsunami;
    if (ts && ts.tau >= 0 && !ts.announced) {
      ts.announced = true;
      UI.toast('🌊 Ostrzeżenie przed tsunami! Morze się cofa', 'alert');
      UI.banner('⚠ TSUNAMI', 'morze odsłania dno – za chwilę nadejdzie fala', '#6fd3ff');
      Sound.setSiren(true);
    }
    Sound.setSiren(!!(ts && ts.tau >= 0 && !ts.done));
    Sound.setWater(Flood.roarLevel());
    if (ts && ts.tau >= 0) this.waveNews(ts);

    // sejsmogram i dudnienie
    const st = Quake.station();
    Seismo.push(dtS, st.v, st.h);
    Seismo.draw(Quake.events.length ? MMI[U.clamp(Math.round(Quake.nowI), 1, 12)].color : '#ffb347');
    const lvl = Quake.events.length ? U.clamp((Quake.nowI - 1.8) / 8.5, 0, 1) : 0;
    const Mx = Quake.events.reduce((m, e) => Math.max(m, e.M), 0);
    Sound.setShake(lvl, U.clamp((7 - Mx) / 5, 0, 1));
    Sound.update(this.time);

    // kamera (widok „Fala” prowadzi za czołem wody)
    if (this.follow) {
      const f = Flood.focus;
      _v1.set(f.ok ? f.x * 0.4 : 0, 4, f.ok ? U.clamp(f.z, -90, 420) : Flood.SHORE);
      this.controls.goal.target.lerp(_v1, Math.min(1, dt * 1.5));
    }
    this.controls.update(dt);
    if (this.shakeOn && (Quake.events.length || this.kick > 0.01)) {
      const g = Quake.sample(this.controls.target.x, this.controls.target.z, _gs, false);
      const I = Quake.nowI;
      const near = U.clamp(140 / this.controls.radius, 0.35, 2.2);
      const jit = (Math.max(0, I - 3.2) * 0.03 + this.kick * 0.25) * near;
      this.controls.shake.set(
        g.dx * 0.8 + (Math.random() - 0.5) * jit,
        g.dy * 0.8 + (Math.random() - 0.5) * jit,
        g.dz * 0.8 + (Math.random() - 0.5) * jit);
      this.camera.position.add(this.controls.shake);
      this.camera.rotateZ((Math.random() - 0.5) * jit * 0.004 + Math.sin(this.time * 7) * Math.max(0, I - 5) * 0.0009);
      this.controls.shake.set(0, 0, 0);
    }
    this.kick *= Math.exp(-dt * 3);

    // mapa cieni odświeżana tylko, gdy coś się rusza
    const busy = Quake.active || Flood.active || World.shadowDirty || this.kick > 0.05 || City.trees.moving || City.lamps.moving ||
      FX.bodies.list.some(b => !b.sleep) || FX.rubble.list.some(c => !c.rest) ||
      City.buildings.some(b => b.mode === 'pancake' || b.mode === 'topple' || Math.abs(b.ux) + Math.abs(b.uz) > 1e-3);
    if (busy) this.shadowFrames = 3;
    World.shadowDirty = false;
    if (this.shadowFrames > 0) { this.renderer.shadowMap.needsUpdate = true; this.shadowFrames--; }

    UI.update(dtS, now);
    if (this.hoverB && this.hoverE && Quake.active && now % 6 < 1) this.pick(this.hoverE);
    this.renderer.render(this.scene, this.camera);
  }
};

/* uruchomienie – najpierw pokazujemy ekran powitalny, potem budujemy świat */
window.addEventListener('load', () => {
  const start = $('start');
  start.disabled = true;
  setTimeout(() => {
    try {
      Main.init();
      $('loading').textContent = 'Gotowe!';
      start.disabled = false;
    } catch (err) {
      console.error(err);
      $('loading').textContent = 'Nie udało się uruchomić WebGL: ' + err.message;
    }
  }, 40);
  start.onclick = () => {
    Sound.init();
    $('intro').classList.add('hide');
    setTimeout(() => { $('intro').hidden = true; }, 500);
  };
});
