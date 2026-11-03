// Główna pętla: wybór broni i celu, odpalanie, sloty wybuchów, tempo czasu, kamera, interfejs,
// świadek, pogoda, powtórka, zdjęcie i link do scenariusza
(function () {
  const T = THREE;
  const Ut = EP.util, Ph = EP.phys, Wd = EP.world, C = EP.city, F = EP.fx, K = EP.cam, Dl = EP.delivery, A = EP.audio, SH = EP.shaders, PP = EP.post;
  const $ = (s) => document.querySelector(s);
  const WEAP = EP.weapons;

  const st = {
    weapon: WEAP.byId('moab'), ground: false,
    target: { point: new T.Vector3(-12, 0, -40), building: false },
    blasts: [], delivery: null, lastTank: null, simNow: 0, tsMode: 'auto', tsFixed: 1, paused: false,
    rings: true, film: true, follow: null, nextId: 1, lastBlast: null,
    wind: 1, windDir: 1, vis: 0, lambda: 80000, placingEye: false, lastShot: null, shot: false, mirv: 1, cmp: null
  };
  EP.state = st;

  const RING_DEF = {
    fireball: ['Kula ognia', '#ffffff'], heavy: ['Ciężkie zniszczenia · 140 kPa', '#ff3b30'], rad: ['Śmiertelne promieniowanie · 5 Sv', '#7dff5a'],
    moderate: ['Zawalenia budynków · 35 kPa', '#ff8a1c'], burn3: ['Oparzenia III stopnia', '#ff5fb0'], light: ['Zniszczone domy · 14 kPa', '#ffc94d'],
    frag: ['Zasięg odłamków', '#d0d0d0'], glass: ['Wybite szyby · 5 kPa', '#4dc6ff'], glass3: ['Pękające szyby · 3 kPa', '#8fb8ff']
  };
  // pogoda: wiatr (m/s), kierunek co 45°, przejrzystość powietrza
  const WINDS = [[0, 'cisza'], [4, 'słaby'], [12, 'silny']];
  const DIRS = ['↑ N', '↗ NE', '→ E', '↘ SE', '↓ S', '↙ SW', '← W', '↖ NW'];
  const VIS = [{ n: 'przejrzyste', lambda: 80000, V: 0 }, { n: 'zamglone', lambda: 22000, V: 28000 }, { n: 'mgła', lambda: 5000, V: 3500 }];

  // ---------- START ----------
  function boot() {
    const canvas = $('#c');
    Wd.init(canvas);
    if (!PP.init(Wd.renderer)) console.warn('Bez obróbki obrazu (brak WebGL2)');
    F.init(Wd.scene);
    C.generate();
    K.init(canvas);
    K.onClick = onClick;
    buildMarker();
    // rozgrzewka shaderów efektów
    const warm = F.warmup(); Wd.scene.add(warm);
    try { Wd.renderer.compile(Wd.scene, Wd.camera); } catch (e) { /* bez rozgrzewki */ }
    Wd.scene.remove(warm);
    // domyślny cel: skrzyżowanie w kwartale kamienic, gdzie już pierwszy wybuch daje wyraźne skutki
    let best = null, bd = 1e9;
    for (const bk of C.blocks) {
      if (bk.kind !== 2) continue;
      const d = Math.hypot(bk.cx + 760, bk.cz + 420);
      if (d < bd) { bd = d; best = bk; }
    }
    if (best) st.target.point.set(best.cx + 60, 0, best.cz + 60);
    if (mobile) Wd.sun.shadow.mapSize.set(2048, 2048);
    const pf = loadPrefs();
    if (pf.wind >= 0 && pf.wind < 3) st.wind = pf.wind;
    if (pf.dir >= 0 && pf.dir < 8) st.windDir = pf.dir;
    if (pf.vis >= 0 && pf.vis < 3) st.vis = pf.vis;
    if (pf.time === 'dusk' || pf.time === 'night') st.timeAtBoot = pf.time;
    if (pf.rings === false) st.rings = false;
    if (pf.film === false) st.film = false;
    readHash();
    buildUI();
    if (!st.rings) $('#bRings').classList.remove('on');
    if (!st.film) $('#bFilm').classList.remove('on');
    if (pf.sound === false) { A.setOn(false); $('#bSound').classList.remove('on'); $('#bSound').classList.add('mute'); }
    if (mobile) setTimeout(() => toast('Dotknij makiety, żeby wskazać cel', 2600), 400);
    applyWeather();
    resize();
    window.addEventListener('resize', resize);
    K.target.copy(st.target.point); K.tTarget.copy(K.target);
    K.dist = K.tDist = 3200; K.phi = K.tPhi = 1.05; K.theta = K.tTheta = 0.75;
    selectWeapon(st.weapon, true);
    last = performance.now();
    requestAnimationFrame(loop);
    $('#loading').hidden = true;
    $('#introGo').disabled = false;
    $('#introGo').textContent = 'Wejdź do makiety';
  }

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PREF_KEY = 'epicentrum-ustawienia';
  function loadPrefs() { try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function savePrefs() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ time: Wd.timeName, rings: st.rings, film: st.film, sound: A.enabled(), wind: st.wind, dir: st.windDir, vis: st.vis })); } catch (e) { /* bez zapisu */ }
  }
  // rozdzielczość dopasowywana do wydajności (telefony, słabsze karty)
  const mobile = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 600;
  const PR_MAX = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2), PR_MIN = mobile ? 0.6 : 0.75;
  let pr = PR_MAX;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    Wd.renderer.setPixelRatio(pr);
    Wd.renderer.setSize(w, h, false);
    Wd.camera.aspect = w / h;
    viewOffset();
    PP.setSize(w * pr, h * pr);
  }
  function mobileUI() { return window.innerWidth <= 760 || window.innerHeight <= 500; }
  // środek kadru w wolnej części ekranu, nie pod panelem
  function viewOffset() {
    const w = window.innerWidth, h = window.innerHeight;
    const cam = Wd.camera;
    if (mobileUI() && !K.eye) {
      const r = $('#left').getBoundingClientRect();
      let ox = 0, oy = 0;
      if (w <= 760) { const top = 56, bottom = Math.min(h, r.top || h); oy = Ut.clamp(h / 2 - (top + bottom) / 2, 0, h * 0.3); }
      else ox = -Ut.clamp((r.right || 0) / 2, 0, w * 0.25);
      cam.setViewOffset(w, h, ox, oy, w, h);
    } else if (cam.view) cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }
  let perfT = 0, perfAcc = 0, perfN = 0, goodT = 0, bootT = 0;
  function adaptRes(dtR) {
    bootT += dtR;
    if (bootT < 4 || dtR > 0.25 || document.hidden) return;
    perfAcc += dtR; perfN++; perfT += dtR;
    if (perfT < 1.5) return;
    const avg = perfAcc / perfN;
    perfT = perfAcc = perfN = 0;
    if (avg > 1 / 38 && pr > PR_MIN) { pr = Math.max(PR_MIN, pr - 0.25); goodT = 0; resize(); }
    else if (avg < 1 / 57) { goodT += 1.5; if (goodT > 8 && pr < PR_MAX) { pr = Math.min(PR_MAX, pr + 0.25); goodT = 0; resize(); } }
    else goodT = 0;
  }

  // ---------- ZNACZNIKI ----------
  let marker, eyeMarker;
  function buildMarker() {
    marker = new T.Group();
    const m1 = new T.MeshBasicMaterial({ color: 0xff3b30, transparent: true, opacity: 0.9, depthTest: false, side: T.DoubleSide });
    const ring = new T.Mesh(new T.RingGeometry(0.8, 1, 48), m1); ring.rotation.x = -Math.PI / 2; marker.add(ring);
    const ring2 = new T.Mesh(new T.RingGeometry(0.15, 0.25, 24), m1); ring2.rotation.x = -Math.PI / 2; marker.add(ring2);
    for (let i = 0; i < 4; i++) {
      const b = new T.Mesh(new T.PlaneGeometry(0.5, 0.08), m1); b.rotation.x = -Math.PI / 2;
      const a = i * Math.PI / 2; b.position.set(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25); b.rotation.z = a; marker.add(b);
    }
    const beam = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 1, 6, 1, true).translate(0, 0.5, 0), new T.MeshBasicMaterial({ color: 0xff5040, transparent: true, opacity: 0.5, depthWrite: false }));
    beam.scale.y = 6; marker.add(beam);
    marker.renderOrder = 10;
    marker.traverse((o) => { o.renderOrder = 10; });
    Wd.scene.add(marker);
    // świadek widziany z góry: niebieska szpilka
    eyeMarker = new T.Group();
    const m2 = new T.MeshBasicMaterial({ color: 0x4dc6ff, transparent: true, opacity: 0.95, depthTest: false });
    const pin = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 1, 6).translate(0, 0.5, 0), m2); pin.scale.y = 5; eyeMarker.add(pin);
    const head = new T.Mesh(new T.SphereGeometry(0.35, 12, 8), m2); head.position.y = 5; eyeMarker.add(head);
    const base = new T.Mesh(new T.RingGeometry(0.5, 0.7, 32), m2); base.rotation.x = -Math.PI / 2; eyeMarker.add(base);
    eyeMarker.traverse((o) => { o.renderOrder = 11; });
    eyeMarker.visible = false;
    Wd.scene.add(eyeMarker);
    // punkty celowania kolejnych głowic (MIRV)
    aimMarks = new T.Group();
    const m3 = new T.MeshBasicMaterial({ color: 0xff5040, transparent: true, opacity: 0.85, depthTest: false, side: T.DoubleSide });
    for (let i = 0; i < 8; i++) { const r = new T.Mesh(new T.RingGeometry(0.7, 1, 32), m3); r.rotation.x = -Math.PI / 2; r.renderOrder = 10; r.visible = false; aimMarks.add(r); }
    Wd.scene.add(aimMarks);
  }
  let aimMarks;
  // Rozrzut głowic: wzdłuż kierunku nadlotu, w dwóch rzędach przy ośmiu
  function mirvAims(center, n, D) {
    if (n <= 1) return [center.clone()];
    const sp = Ut.clamp(D.radii.moderate * 1.7, 900, 4200);
    const cam = Wd.camera.position;
    const ax = new T.Vector3(cam.x - center.x, 0, cam.z - center.z); if (ax.lengthSq() < 1) ax.set(1, 0, 0); ax.normalize();
    const pr = new T.Vector3(-ax.z, 0, ax.x);
    const pts = [];
    const lay = n === 3 ? [[-1, 0], [0, 0], [1, 0]] : [[-1.5, -0.55], [-0.5, -0.55], [0.5, -0.55], [1.5, -0.55], [-1.5, 0.55], [-0.5, 0.55], [0.5, 0.55], [1.5, 0.55]];
    for (const [a, b] of lay) {
      const j = (Ut.hash2(Math.round(center.x) + a * 7, Math.round(center.z) + b * 13) - 0.5) * 0.25;
      const p = center.clone().addScaledVector(ax, (a + j) * sp).addScaledVector(pr, (b - j) * sp);
      p.y = Wd.groundY(p.x, p.z);
      pts.push(p);
    }
    return pts;
  }
  function nWarheads(w) { return w.mirvOpts ? st.mirv : 1; }

  // ---------- WYBÓR ----------
  function groundFor(w) { return w.custom ? w.ck === 'nuke' && w.chob === 0 : st.ground; }
  function deriveFor(w) {
    const gy = Wd.groundY(st.target.point.x, st.target.point.z);
    return Ph.derive(w, { ground: groundFor(w), hob: w.kt ? 0 : Math.max(0, st.target.point.y - gy), lambda: st.lambda });
  }
  function previewDist(D) {
    return Ut.clamp(Math.max(D.radii.glass * 1.15, D.radii.glass3 * (D.cosmic ? 0.8 : 0), D.radii.moderate * 3.2, D.Htop * (D.nuke ? 1.4 : 0.8), 7), 7, 260000);
  }
  function selectWeapon(w, instant) {
    if (st.delivery && !st.delivery.done && !instant) { toast('Poczekaj, aż ładunek dotrze do celu'); return; }
    st.weapon = w;
    if (st.cmp && st.cmp.id === w.id) st.cmp = null;
    if (st.group !== w.group) showGroup(w.group);
    hideNext();
    document.querySelectorAll('.wpn').forEach((el) => el.classList.toggle('sel', el.dataset.id === w.id));
    const el = document.querySelector('.wpn.sel'); if (el && !instant) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    renderCard();
    const D = deriveFor(w);
    showRings(st.target.point, D, true);
    renderEffects(D, true);
    if (K.eye) { st.follow = null; updateEyeHud(); return; }
    const d = previewDist(D);
    const phi = d < 60 ? 1.18 : d < 5000 ? 1.08 : 1.15;
    const tg = st.target.point.clone(); tg.y = Wd.groundY(tg.x, tg.z) + (D.nuke ? Math.min(D.Htop * 0.3, d * 0.2) : 0);
    if (instant) { K.target.copy(tg); K.tTarget.copy(tg); K.dist = K.tDist = d; K.phi = K.tPhi = phi; }
    else K.flyTo(tg, d, phi, undefined, 1.8);
    st.follow = null;
  }
  function setTarget(p) {
    st.target = p;
    const D = deriveFor(st.weapon);
    showRings(p.point, D, true);
    renderEffects(D, true);
    if (K.eye) { K.lookEye(new T.Vector3(p.point.x, p.point.y + 10, p.point.z)); updateEyeHud(); }
  }

  function onClick(e) {
    const r = Wd.renderer.domElement.getBoundingClientRect();
    const ndc = new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const hit = C.pick(ndc, Wd.camera);
    if (!hit) return;
    if (st.placingEye) { placeEye(hit); return; }
    if (hit.building && hit.normal) hit.point.addScaledVector(hit.normal, 0.05);
    setTarget(hit);
    $('#hint').classList.add('gone');
  }

  // ---------- ODPALENIE ----------
  function fire() {
    if (st.delivery && !st.delivery.done) { toast('Ładunek jest jeszcze w drodze'); return; }
    hideNext();
    if (mobileUI()) { document.body.classList.add('collapsed'); viewOffset(); }
    A.init();
    const w = st.weapon;
    if (st.lastTank) { st.lastTank(); st.lastTank = null; }
    const tp = st.target.point.clone();
    const gy = Wd.groundY(tp.x, tp.z);
    const D = deriveFor(w);
    // zapamiętany strzał do powtórki
    st.lastShot = {
      wid: w.id, target: { point: tp.clone(), normal: st.target.normal ? st.target.normal.clone() : null, building: st.target.building }, ground: st.ground,
      custom: w.custom ? { ck: w.ck, clog: w.clog, chob: w.chob } : null, mirv: st.mirv,
      cam: { tg: K.tTarget.clone(), d: K.tDist, phi: K.tPhi, th: K.tTheta }
    };
    writeHash();
    $('#hint').classList.add('gone');
    let burstPos;
    if (w.kt) burstPos = new T.Vector3(tp.x, gy + D.hob, tp.z);
    else burstPos = tp.clone();
    if (w.groundHob && !w.kt) burstPos.y = Math.max(burstPos.y, gy + w.groundHob);
    const nw = nWarheads(w);
    const salvo = w.delivery === 'salvo' || nw > 1;
    const aims = nw > 1 ? mirvAims(tp, nw, D).map((p) => new T.Vector3(p.x, p.y + D.hob, p.z)) : null;
    st.multiR = aims ? Math.max(...aims.map((p) => Math.hypot(p.x - tp.x, p.z - tp.z))) : 0;
    st.delivery = Dl.start(w, { point: tp, normal: st.target.normal, building: st.target.building, aims }, burstPos, (pos, dir, i) => detonate(w, pos, dir, salvo && i > 0));
    if (st.delivery.cleanupLater) st.lastTank = st.delivery.cleanupLater;
    if (st.film && !K.eye && st.delivery.update) {
      st.delivery.update(0);
      K.film.pos.copy(st.delivery.cam.pos); K.film.look.copy(st.delivery.cam.look);
      K.mode = 'film'; K.fly = null;
    }
    st.follow = null;
    setRingsAlpha(0.35);
    $('#fire').classList.add('busy');
  }

  function allocSlot() {
    const used = new Set(st.blasts.map((b) => b.slot));
    for (let i = 0; i < SH.MAXE; i++) if (!used.has(i)) return i;
    // brak wolnych: najstarszy wybuch zapisuje skutki na drzewach i zwalnia slot
    const old = st.blasts.shift();
    C.bakeTrees(old);
    F.removeBlast(old);
    return old.slot;
  }

  function detonate(w, pos, dir, quiet) {
    const gy = Wd.groundY(pos.x, pos.z);
    const D = Ph.derive(w, { ground: groundFor(w), hob: w.kt ? 0 : Math.max(0, pos.y - gy), lambda: st.lambda });
    const bl = {
      id: st.nextId++, w, d: D, pos: pos.clone(), dir: dir ? dir.clone() : null, t: 0, frontR: 0, done: false, slot: allocSlot(),
      stats: { destroyed: 0, damaged: 0, light: 0, glass: 0, fires: 0, cars: 0, dead: 0, inj: 0, treesTotal: 0, spread: 0 },
      heard: false, simStart: st.simNow, light: st.nextId % Wd.xLights.length, blackR: 0
    };
    bl.simNow = st.simNow;
    if (!quiet) bl.multiR = st.multiR || 0;
    C.assess(bl);
    F.spawnExplosion(bl);
    st.blasts.push(bl);
    if (!quiet || !st.lastBlast) st.lastBlast = bl;
    else if (st.lastBlast && st.lastBlast.w === w) st.lastBlast.group = (st.lastBlast.group || [st.lastBlast]).concat([bl]);
    const camD = Wd.camera.position.distanceTo(pos);
    bl.camD = camD;
    if (K.eye) { bl.eyeD = camD; bl.eyeT = Ph.arrival(D.front, camD); }
    // kamera: kadr wybuchu, potem płynne oddalanie razem z falą
    if (!quiet) {
      if (K.eye) st.follow = bl;
      else {
        if (K.mode === 'film' && K.film.cur) K.setFromPose(K.film.cur.p, K.film.cur.l);
        K.mode = 'orbit';
        const fr = frameFor(bl, 0);
        const tg = pos.clone(); tg.y = gy + fr.ty;
        if (st.film || !K.userActive) {
          let th = Math.atan2(Wd.camera.position.x - pos.x, Wd.camera.position.z - pos.z);
          const ph = clearView(tg, fr.d, fr.phi, th);
          th = ph.th;
          K.flyTo(tg, fr.d, ph.phi, th, D.nuke ? 0.6 : 0.5);
          st.follow = bl;
          K.userActive = 0;
          K.autoSpin = D.nuke ? 0.012 : 0.03; K.spinLeft = 0.6;
        }
      }
      showRings(new T.Vector3(pos.x, gy, pos.z), D, false);
      setRingsAlpha(0);
    }
    $('#fire').classList.remove('busy');
  }

  // Kamera nie może patrzeć przez wieżowce: szukamy kąta, z którego wybuch jest widoczny
  function camPos(tg, d, phi, th) { const sp = Math.sin(phi); return new T.Vector3(tg.x + d * sp * Math.sin(th), tg.y + d * Math.cos(phi), tg.z + d * sp * Math.cos(th)); }
  function clearView(tg, d, phi, th) {
    if (d > 2500) return { phi, th };
    const look = tg.clone(); look.y = Math.max(look.y, Wd.groundY(tg.x, tg.z) + 1.5);
    const tries = [[phi, th], [phi, th + 0.6], [phi, th - 0.6], [phi * 0.75, th], [phi, th + 1.3], [phi, th - 1.3], [phi * 0.55, th], [0.35, th]];
    for (const [p, t] of tries) if (!C.segBlocked(look, camPos(look, d, p, t))) return { phi: p, th: t };
    return { phi: 0.3, th };
  }

  // Kadr: odległość kamery rosnąca z falą i grzybem
  function frameFor(bl, t) {
    const D = bl.d;
    const dy = bl.pos.y - Wd.groundY(bl.pos.x, bl.pos.z);
    const R = Ph.frontAt(D.front, t);
    const Rg = R > dy ? Math.sqrt(R * R - dy * dy) : 0;
    const top = F.cloudTop(bl) - Wd.groundY(bl.pos.x, bl.pos.z);
    const d0 = Math.max(D.fbR * 7, dy * 2.2, 4);
    const dF = Math.max(D.radii.moderate * 3, D.Htop * (D.nuke ? 1.5 : 0.9), D.radii.glass * (D.nuke ? 0.9 : 1.3), D.cosmic ? D.radii.glass3 * 0.9 : 0, 10);
    let d = Ut.clamp(Math.max(d0, Rg * 2.0, top * 1.7), d0, dF);
    if (bl.w.salvo) d = Math.max(d, 650);
    if (bl.multiR) d = Math.max(d, bl.multiR * 3.2);
    return { d, phi: D.nuke ? 1.22 : d < 60 ? 1.15 : 0.98, ty: D.nuke ? Math.max(dy * 0.6, top * 0.42) : Math.min(top * 0.3, d * 0.15) };
  }

  // ---------- PIERŚCIENIE ----------
  let ringList = [], ringCenter = new T.Vector3(), ringAlpha = 0, ringAlphaT = 1;
  function showRings(center, D, preview) {
    ringCenter.copy(center); ringCenter.y = Wd.groundY(center.x, center.z);
    const r = D.radii;
    const keys = D.nuke ? ['glass', 'light', 'burn3', 'moderate', 'rad', 'heavy', 'fireball'] : ['glass', 'frag', 'light', 'moderate', 'heavy', 'fireball'];
    if (!r.glass && r.glass3) keys.unshift('glass3');
    ringList = [];
    for (const k of keys) {
      let R = k === 'fireball' ? (D.nuke ? (D.cosmic ? 0 : D.fbR) : r.fireball) : r[k];
      if (!R || R <= 0) continue;
      ringList.push({ k, R, name: RING_DEF[k][0], col: RING_DEF[k][1] });
    }
    ringList.sort((a, b) => b.R - a.R);
    // drugi ładunek do porównania: główne zasięgi kropkami wokół tego samego punktu
    cmpList = [];
    if (st.cmp) {
      const DB = deriveCmp(st.cmp);
      for (const k of ['glass', 'light', 'moderate', 'heavy']) {
        const R = DB.radii[k];
        if (R > 0) cmpList.push({ k, R, name: RING_DEF[k][0], col: RING_DEF[k][1], cmp: true });
      }
      st.cmpD = DB;
    }
    const U = SH.uniforms;
    U.uRingC.value.copy(ringCenter);
    const all = ringList.slice(0, 8).concat(cmpList.slice(0, 8));
    U.uRingN.value = all.length;
    all.forEach((x, i) => { U.uRingR.value[i] = x.R; U.uRingCol.value[i].set(x.cmp ? lighten(x.col) : x.col); U.uRingSty.value[i] = x.cmp ? 1 : 0; });
    // punkty kolejnych głowic
    const n = nWarheads(st.weapon);
    const aims = preview && n > 1 ? mirvAims(st.target.point, n, D) : [];
    aimMarks.children.forEach((m, i) => { m.visible = i < aims.length; if (m.visible) m.position.copy(aims[i]).add(new T.Vector3(0, 0.5, 0)); });
    U.uRingDash.value = preview ? 1 : 0;
    // opad promieniotwórczy dla wybuchu przy ziemi: długość i szerokość zależą od wiatru
    if (D.fallout) {
      const wk = [0.35, 1, 1.8][st.wind], ww = [2.4, 1, 0.7][st.wind];
      U.uFall.value.set(ringCenter.x, ringCenter.z, D.fallout.len * wk, D.fallout.wid * ww);
      const wd = new T.Vector2(F.WIND.x, F.WIND.z);
      if (wd.lengthSq() < 1e-6) wd.copy(windVec(1)); else wd.normalize();
      U.uFallDir.value.copy(wd);
      U.uFallA.value = 1;
    } else U.uFallA.value = 0;
    st.ringPreview = preview;
  }
  function setRingsAlpha(a) { ringAlphaT = a; }
  let cmpList = [];
  function lighten(c) { const x = new T.Color(c); return '#' + x.lerp(new T.Color(1, 1, 1), 0.35).getHexString(); }
  function deriveCmp(w) {
    const gy = Wd.groundY(st.target.point.x, st.target.point.z);
    return Ph.derive(w, { ground: w.kt ? st.ground : true, hob: w.kt ? 0 : Math.max(0, st.target.point.y - gy), lambda: st.lambda });
  }
  // Panel porównania: wybór drugiego ładunku i zasięgi obok siebie
  function renderCmp(D) {
    const box = $('#cmpBox');
    const cur = st.weapon;
    const opts = WEAP.filter((w) => !w.custom && w.id !== cur.id).map((w) => `<option value="${w.id}"${st.cmp && st.cmp.id === w.id ? ' selected' : ''}>${w.short} · ${Ut.tnt(w.kt ? w.kt * 1e6 : w.tnt)}</option>`).join('');
    let h = `<div id="cmpRow"><span class="dot"></span>Porównaj z <select id="cmpSel" aria-label="Ładunek do porównania"><option value="">—</option>${opts}</select></div>`;
    if (st.cmp && st.cmpD) {
      const B = st.cmpD;
      const rowR = (name, a, b) => `<tr><td>${name}</td><td>${a > 0 ? Ut.dist(a) : '—'}</td><td class="b">${b > 0 ? Ut.dist(b) : '—'}</td></tr>`;
      const ea = D.Wtnt * (cur.salvo || 1), eb = B.Wtnt * (st.cmp.salvo || 1);
      const ratio = eb / ea;
      const rtxt = ratio >= 1 ? Ut.num(ratio, ratio < 10 ? 1 : 0) + '× silniejszy' : Ut.num(1 / ratio, 1 / ratio < 10 ? 1 : 0) + '× słabszy';
      const area = (R) => (R > 0 ? Ut.area(Math.PI * R * R) : '—');
      h += `<table class="cmpT"><tr><th></th><th>${cur.short}</th><th>${st.cmp.short}</th></tr>
        ${rowR('Szyby · 5 kPa', D.radii.glass, B.radii.glass)}
        ${rowR('Domy · 14 kPa', D.radii.light, B.radii.light)}
        ${rowR('Zawalenia · 35 kPa', D.radii.moderate, B.radii.moderate)}
        ${rowR('Ciężkie · 140 kPa', D.radii.heavy, B.radii.heavy)}
        ${D.nuke || B.nuke ? rowR('Oparzenia III st.', D.radii.burn3, B.radii.burn3) : ''}
        ${rowR('Kula ognia (średnica)', D.fbR * 2, B.fbR * 2)}
        <tr><td>Obszar zawaleń</td><td>${area(D.radii.moderate)}</td><td class="b">${area(B.radii.moderate)}</td></tr>
        <tr class="k"><td colspan="3">${st.cmp.short}: ${rtxt}, zasięg zawaleń ${D.radii.moderate > 0 && B.radii.moderate > 0 ? '× ' + Ut.num(B.radii.moderate / D.radii.moderate, 1) : 'nie do porównania'}</td></tr></table>`;
    }
    box.innerHTML = h;
  }
  function setCmp(id) {
    st.cmp = id ? WEAP.byId(id) : null;
    if (st.cmp && st.cmp.custom) st.cmp = null;
    const D = deriveFor(st.weapon);
    if (st.ringPreview !== false || !st.lastBlast) showRings(st.target.point, D, true);
    else if (st.lastBlast) showRings(st.lastBlast.pos, st.lastBlast.d, false);
    renderEffects(st.ringPreview === false && st.lastBlast ? st.lastBlast.d : D, st.ringPreview !== false);
    if (st.cmp && !st.rings) $('#bRings').click();
    setRingsAlpha(Math.max(ringAlphaT, 0.9));
  }

  // ---------- POGODA ----------
  function windVec(speed) { const a = st.windDir * Math.PI / 4; return new T.Vector2(Math.sin(a) * speed, -Math.cos(a) * speed); }
  function applyWeather() {
    const v = windVec(WINDS[st.wind][0]);
    F.WIND.set(v.x, 0, v.y);
    st.lambda = VIS[st.vis].lambda;
    Wd.visV = VIS[st.vis].V;
    $('#wWind').innerHTML = `<b>${WINDS[st.wind][1]}</b>`;
    $('#wDir').innerHTML = `<b>${DIRS[st.windDir]}</b>`;
    $('#wDir').disabled = st.wind === 0;
    savePrefs();
    $('#wVis').innerHTML = `<b>${VIS[st.vis].n}</b>`;
    const D = deriveFor(st.weapon);
    if (st.ringPreview !== false || !st.lastBlast) { showRings(st.target.point, D, true); renderEffects(D, true); }
  }

  // ---------- TEMPO CZASU ----------
  function autoTs() {
    if (st.delivery && !st.delivery.done && st.delivery.ts) return st.delivery.ts();
    const bl = st.lastBlast;
    if (!bl || bl.done) return 1;
    const D = bl.d, t = bl.t;
    const ts0 = Ut.clamp(D.tfb / 1.6, 0.015, 10);
    const ts1 = Ut.clamp(Math.max(D.tShockGlass / 8, ts0), 0.015, 40);
    const ts2 = D.nuke ? Ut.clamp(D.tRise / 22, 1, 40) : Ut.clamp(D.tRise / 22, 1, 3);
    let lt = Math.log(ts0);
    lt = Ut.lerp(lt, Math.log(ts1), Ut.smooth(D.tfb * 1.2, D.tfb * 3, t));
    const k2s = Math.max(D.tShockGlass * 0.9, D.tfb * 2.5);
    lt = Ut.lerp(lt, Math.log(ts2), Ut.smooth(k2s, k2s * 1.6, t));
    // wielki wybuch: przejście fali przez miasto trwa co najmniej kilka sekund, żeby dało się je zobaczyć
    if (D.nuke && D.radii.moderate > 600) {
      const dy = bl.pos.y - Wd.groundY(bl.pos.x, bl.pos.z);
      const Rg = bl.frontR > dy ? Math.sqrt(bl.frontR * bl.frontR - dy * dy) : 0;
      const Rc = Math.min(3600 + Math.hypot(bl.pos.x, bl.pos.z), D.radii.glass);
      if (Rg < Rc) {
        const p = Ph.overpressure(Math.max(bl.frontR, 1), D.cbrtW);
        const U = Ph.C0 * Math.sqrt(1 + 6 * p / (7 * Ph.P0));
        lt = Math.min(lt, Math.log(Ut.clamp(Rc / (U * 4), 0.02, 40)));
      }
    }
    // świadek: czekanie na falę przyspieszone, ostatnie sekundy przed jej dotarciem zwolnione
    if (bl.eyeT !== undefined && !bl.heard) {
      const left = bl.eyeT - t;
      const tw = Ut.clamp(left / 6, 0.6, 40);
      lt = Math.min(lt, Math.log(Math.max(tw, Math.exp(lt) * 0.3)));
      if (left > 0 && left < 2.5) lt = Math.min(lt, Math.log(Ut.clamp(left / 2.2, 0.35, 1.2)));
    }
    return Math.exp(lt);
  }
  function curTs() { if (st.paused) return 0; return st.tsMode === 'auto' ? autoTs() : st.tsFixed; }

  // ---------- PĘTLA ----------
  let last = 0, uiT = 0, hoverT = 0, flash = 0, exposureK = 0, dust = 0;
  const _v = new T.Vector3(), _c = new T.Color(), _s = new T.Vector3(), _r = new T.Vector3();
  function loop(now) {
    requestAnimationFrame(loop);
    const dtR = Math.min(0.1, (now - last) / 1000); last = now;
    adaptRes((now - (loop.prev || now)) / 1000); loop.prev = now;
    const ts = curTs();
    const dtSim = dtR * ts;
    const dtA = st.paused ? 0 : dtR * Math.min(ts, 1.5);
    st.ts = ts;
    st.simNow += dtSim;

    if (st.delivery && !st.delivery.done) {
      st.delivery.update(dtSim);
      if (K.mode === 'film') { K.film.pos.copy(st.delivery.cam.pos); K.film.look.copy(st.delivery.cam.look); }
    } else if (K.mode === 'film') K.mode = 'orbit';

    // wybuchy
    const U = SH.uniforms;
    let maxSlot = -1;
    flash *= Math.exp(-dtR * 2.2);
    let glow = 0, glowPos = null, rayK = 0, rayPos = null;
    Wd.xLights.forEach((l) => { l.intensity = 0; });
    const camPosW = Wd.camera.position;
    const zones = [];
    for (const bl of st.blasts) {
      bl.t += dtSim;
      bl.simNow = st.simNow;
      C.applyEvents(bl);
      F.updateBlast(bl, dtSim, dtA);
      const D = bl.d;
      bl.frontP = Ph.overpressure(Math.max(bl.frontR, 0.1), D.cbrtW);
      // slot dla shaderów
      const i = bl.slot;
      // po zakończeniu fala liczy się tylko tam, gdzie nadciśnienie mogło coś zmienić
      U.uE0.value[i].set(bl.pos.x, bl.pos.y, bl.pos.z, bl.done ? bl.doneR : bl.frontR);
      U.uE1.value[i].set(D.cbrtW, D.Y4pi, bl.t, D.fbR);
      U.uE2.value[i].set(D.nuke ? 1 : bl.w.frag ? 2 : 0, D.craterR, D.scorchR, D.tpulse);
      const dy = bl.pos.y - Wd.groundY(bl.pos.x, bl.pos.z);
      const vit = D.nuke && !D.cosmic ? (D.ground ? D.fbR * 0.8 : D.fbR > dy ? Math.sqrt(D.fbR * D.fbR - dy * dy) * 0.9 : 0) : 0;
      U.uHob.value[i].set(dy, vit, D.lambda || 80000, bl.done ? 0 : 1);
      if (i > maxSlot) maxSlot = i;
      // światło i błysk
      const t = bl.t;
      const env = t < D.tfb ? 1 : Math.exp(-(t - D.tfb) / (D.tfb * (D.nuke ? 2.5 : 1.2)));
      if (t < D.tfb * 25) {
        const l = Wd.xLights[bl.light];
        const fbp = bl.fx && bl.fx.fb ? bl.fx.fb.position : bl.pos;
        l.position.copy(fbp).add(_v.set(0, D.fbR * 0.4, 0));
        const lv = (D.nuke ? 30 : 22) * env + (D.nuke ? 3 * Math.exp(-t / (D.tRise * 0.5)) : 0);
        if (lv > l.intensity) {
          l.intensity = lv;
          l.distance = D.nuke ? Math.max(D.radii.burn1 * 1.4, D.fbR * 25) : D.fbR * 40 + 10;
          l.color.setRGB(1, Ut.lerp(0.55, 0.85, env), Ut.lerp(0.25, 0.65, env));
        }
      }
      if (D.nuke && t < D.tfb * 6) {
        const far = bl.camD > D.radii.moderate;
        const fl = Math.min(far ? 0.6 : 1, Math.exp(-t / (D.tfb * (far ? 0.25 : 0.35))) * (bl.camD < D.radii.glass * 3 ? 1 : 0.5)) * (RM ? 0.4 : 1);
        flash = Math.max(flash, fl);
        glow = Math.max(glow, env * 1.5); glowPos = bl.pos;
        if (env * 1.2 + fl > rayK) { rayK = env * 1.2 + fl; rayPos = bl.fx && bl.fx.fb ? bl.fx.fb.position : bl.pos; }
      } else if (!D.nuke && t < D.tfb * 2 && D.Wtnt > 100) {
        flash = Math.max(flash, 0.12 * Math.exp(-t / (D.tfb * 0.5)));
      }
      // dźwięk i wstrząs, gdy czoło fali dotrze do kamery
      if (!bl.heard) {
        const dc = camPosW.distanceTo(bl.pos);
        if (bl.frontR >= dc || (st.paused === false && ts > 0 && bl.t > Ph.arrival(D.front, dc) + 0.01)) {
          bl.heard = true;
          const mag = Ut.clamp((Math.log10(D.Wtnt) + 0.7) / 11.4, 0, 1);
          A.boom(mag, dc, 0);
          const p = Ph.overpressure(Math.max(dc, 0.5), D.cbrtW);
          if (!RM) K.shake = Math.max(K.shake, Ut.clamp(Math.log10(p + 1) / 2.2, 0.05, 1) * (D.nuke ? 1 : 0.6) * (K.eye ? 2.2 : 1));
          if (K.eye) {
            const k = Ut.clamp(Math.log10(p + 1) / 2, 0, 1);
            dust = Math.max(dust, Ut.smooth(0.15, 1, k) * 0.85);
            const d2 = new T.Vector3(K.eye.pos.x - bl.pos.x, 0, K.eye.pos.z - bl.pos.z).normalize();
            if (p > 1) F.gust(K.eye.pos, d2, k);
          }
        }
      }
      // strefa bez prądu: gaśnie tam, dokąd doszła niszcząca fala, potem kaskada dalej
      if (D.Wtnt >= 1000) {
        const Rb = Math.max(D.radii.light * 1.25, D.nuke && !D.cosmic ? D.radii.burn3 : 0);
        if (Rb > 0) {
          const Rg = bl.frontR > dy ? Math.sqrt(bl.frontR * bl.frontR - dy * dy) : 0;
          const cascade = 1 + 0.35 * Ut.smooth(0, 40, t - Ph.arrival(D.front, Rb + dy));
          bl.blackR = Math.max(bl.blackR, Math.min(Rg, Rb) * cascade, D.nuke && !D.cosmic ? Math.min(Rb, D.fbR * 3) : 0);
          if (bl.blackR > 0) zones.push(bl);
        }
      }
      // koniec aktywnej fazy
      const tEnd = D.nuke ? D.tRise * 9 : Math.max(30, D.tRise * 6);
      if (!bl.done && bl.t > tEnd && bl.evPtr >= bl.events.length) {
        bl.done = true;
        C.bakeTrees(bl);
        bl.doneR = Math.min(bl.frontR, Ph.radiusForP(2, D.cbrtW));
        if (bl.fx) { for (const m of bl.fx.meshes) if (m.parent) Wd.scene.remove(m); }
      }
    }
    U.uNE.value = maxSlot + 1;
    zones.sort((a, b) => b.blackR - a.blackR);
    for (let i = 0; i < 4; i++) {
      const z = zones[i];
      if (z) U.uBlack.value[i].set(z.pos.x, z.pos.z, z.blackR, 0); else U.uBlack.value[i].set(0, 0, 0, 0);
    }
    U.uBlackout.value = zones.length ? Math.min(1, U.uBlackout.value + dtR * 3) : 0;

    // meteor rozświetla niebo, zanim wybuchnie
    if (st.delivery && !st.delivery.done && st.delivery.glow && st.delivery.glow.k > 0) {
      const g = st.delivery.glow;
      glow = Math.max(glow, g.k * 0.8); glowPos = g.pos;
      flash = Math.max(flash, g.k * g.k * 0.08);
      rayK = Math.max(rayK, g.k * 0.4); rayPos = g.pos;
      const l = Wd.xLights[0];
      l.position.copy(g.pos); l.intensity = Math.max(l.intensity, 14 * g.k); l.distance = 0;
      l.color.setRGB(1, 0.93, 0.85);
    }

    C.update(dtA, dtSim, st.simNow);
    F.update(dtA, dtSim, Wd.camera, st.paused ? 0 : dtR * Math.min(ts, 4));
    // cień przeliczany tylko, gdy coś się rusza
    if (C.animating.length || C.carsMoving.length || (st.delivery && !st.delivery.done) || st.blasts.some((b) => !b.done && b.t < Ph.arrival(b.d.front, b.d.radii.moderate * 2.5 + b.d.hob) + 4) || F.debrisMoving()) Wd.shadowDirty = true;

    // kamera podąża za wybuchem
    if (st.follow && K.eye) {
      // świadek odruchowo podnosi wzrok za rosnącą chmurą, dopóki sam nie obróci głowy
      const bl = st.follow;
      if (!K.eye.user && bl.d.nuke) {
        const cz = Math.max(F.cloudTop(bl) * 0.75, bl.pos.y);
        const look = new T.Vector3(bl.pos.x, cz, bl.pos.z);
        const d = look.clone().sub(K.eye.pos);
        const pitch = Ut.clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.6, 1.45);
        if (pitch > K.eye.tPitch) K.eye.tPitch = Ut.lerp(K.eye.tPitch, pitch, 1 - Math.exp(-dtR * 0.8));
      }
      if (bl.done) st.follow = null;
    } else if (st.follow && !K.userActive && !K.fly) {
      const fr = frameFor(st.follow, st.follow.t);
      if (fr.d > K.tDist) K.tDist = fr.d;
      const ty = Wd.groundY(st.follow.pos.x, st.follow.pos.z) + fr.ty;
      K.tTarget.y = Ut.lerp(K.tTarget.y, ty, 1 - Math.exp(-dtR * 2));
      K.tPhi = Ut.lerp(K.tPhi, fr.phi, 1 - Math.exp(-dtR));
      if (st.follow.done) st.follow = null;
    }
    K.update(dtR, Wd.camera);
    if (K.eye) Wd.frame(Math.max(50, K.eye.pos.distanceTo(st.target.point)), _v.copy(K.eye.pos).addScaledVector(Wd.camera.getWorldDirection(_r), 600), true);
    else Wd.frame(K.viewDist || K.dist, K.target);

    // znaczniki celu i świadka
    const md = Wd.camera.position.distanceTo(st.target.point);
    marker.position.copy(st.target.point);
    marker.scale.setScalar(Math.max(0.15, md * 0.018));
    marker.visible = !(st.delivery && !st.delivery.done) && !(st.follow && st.follow.t < 8);
    if (aimMarks.children[0].visible) for (const m of aimMarks.children) { m.visible = m.visible && marker.visible && st.ringPreview !== false; m.scale.setScalar(Math.max(4, Wd.camera.position.distanceTo(m.position) * 0.012)); }
    marker.rotation.y += dtR * 0.6;
    if (eyeMarker.visible) eyeMarker.scale.setScalar(Math.max(0.3, Wd.camera.position.distanceTo(eyeMarker.position) * 0.016));

    // błysk, ekspozycja, poświata nieba
    setOp('#flash', Math.min(0.97, flash * (PP.enabled ? 0.8 : 1)));
    dust *= Math.exp(-dtR * 0.45);
    setOp('#dust', dust < 0.003 ? 0 : dust);
    exposureK = Ut.lerp(exposureK, flash, 0.3);
    Wd.renderer.toneMappingExposure = Wd.baseExposure * (1 + exposureK * 1.5);
    const sky = Wd.skyMat.uniforms;
    sky.uFlash.value = flash * 0.6;
    if (glowPos) { sky.uGlowDir.value.copy(glowPos).sub(Wd.camera.position).normalize(); sky.uGlow.value = Ut.lerp(sky.uGlow.value, glow, 0.2); }
    else sky.uGlow.value *= Math.exp(-dtR * 1.5);

    // pierścienie
    ringAlpha = Ut.lerp(ringAlpha, st.rings ? ringAlphaT : 0, 1 - Math.exp(-dtR * 4));
    if (st.lastBlast && !st.ringPreview && st.rings && ringAlphaT === 0 && st.lastBlast.t > st.lastBlast.d.tShockGlass * 1.1) ringAlphaT = 0.9;
    U.uRingA.value = ringAlpha;
    U.uTime.value += dtA;

    // dźwięk pożarów
    if (A.setFire) A.setFire(C.burning.length ? Math.min(1, C.burning.length / 40) * Ut.clamp(300 / ((K.eye ? 60 : K.dist) + 1), 0.05, 1) : 0);

    if (PP.enabled) postParams(rayK, rayPos);
    PP.render(Wd.scene, Wd.camera, dtR);
    if (st.shot) { st.shot = false; saveShot(); }

    uiT -= dtR;
    if (uiT <= 0) { uiT = 0.12; updateHud(); if (K.eye) updateEyeHud(); checkNext(); }
    updateLabels();
  }

  const opCache = {};
  function setOp(sel, v) { const s = v.toFixed(3); if (opCache[sel] !== s) { opCache[sel] = s; $(sel).style.opacity = s; } }

  // Parametry obróbki obrazu: czoła fal i drgające powietrze rzutowane na ekran
  function project(p, out) {
    out.copy(p).project(Wd.camera);
    const W = Wd.renderer.domElement.width, H = Wd.renderer.domElement.height;
    return { x: (out.x * 0.5 + 0.5) * W, y: (out.y * 0.5 + 0.5) * H, z: out.z, W, H };
  }
  function screenRadius(c, R, sc) {
    _r.setFromMatrixColumn(Wd.camera.matrixWorld, 1);
    const q = project(_v.copy(c).addScaledVector(_r, R), _s);
    return Math.hypot(q.x - sc.x, q.y - sc.y);
  }
  function postParams(rayK, rayPos) {
    const cam = Wd.camera.position;
    let nr = 0, nh = 0;
    const cand = [];
    for (const bl of st.blasts) {
      const fx = bl.fx;
      if (!fx) continue;
      if (fx.shell) {
        const a = fx.shell.material.uniforms.uS.value;
        const R = bl.frontR;
        const dc = cam.distanceTo(bl.pos);
        if (a > 0.02 && dc > R * 1.03) cand.push({ bl, a, R });
      }
      if (fx.fb && nh < PP.MAXH) {
        const u = fx.fb.material.uniforms;
        const k = Ut.clamp(u.uTemp.value / 1.7, 0, 1) * u.uAlpha.value;
        if (k > 0.03) {
          const sc = project(fx.fb.position, _s);
          if (sc.z < 1) {
            const R = fx.fb.scale.x;
            const rp = screenRadius(fx.fb.position, R * 1.6, { x: sc.x, y: sc.y });
            const yy = sc.y + rp * 0.5;
            if (rp > 3) { PP.setHaze(nh++, sc.x, yy, Math.min(rp, sc.H), k * (bl.d.nuke ? 0.8 : 0.6)); }
          }
        }
      }
    }
    cand.sort((a, b) => b.a - a.a);
    for (const c of cand) {
      if (nr >= PP.MAXR) break;
      const sc = project(c.bl.pos, _s);
      if (sc.z >= 1) continue;
      const scc = { x: sc.x, y: sc.y };
      const rp = screenRadius(c.bl.pos, c.R, scc);
      if (rp < 4 || rp > sc.W * 4) continue;
      PP.setRing(nr++, scc.x, scc.y, rp, Ut.clamp(rp * 0.05, 3, 40) * (window.devicePixelRatio > 1 ? 1.3 : 1), Ut.clamp(c.a * 1.6, 0, 1));
    }
    PP.nRings = nr; PP.nHaze = nh;
    const u = PP.u;
    if (rayPos && rayK > 0.02) {
      const sc = project(rayPos, _s);
      if (sc.z < 1) { u.uRayC.value.set(sc.x / sc.W, sc.y / sc.H); u.uRays.value = Ut.lerp(u.uRays.value, Math.min(1.4, rayK), 0.2); }
      else u.uRays.value *= 0.9;
    } else u.uRays.value *= 0.92;
    u.uAberr.value = RM ? 0 : Math.min(1, flash * 1.6 + K.shake * 0.9);
    u.uVig.value = Wd.timeName === 'night' ? 0.5 : 0.32;
    PP.bloom = Wd.timeName === 'night' ? 0.75 : 0.5;
  }

  function saveShot() {
    const cv = Wd.renderer.domElement;
    const name = 'epicentrum-' + st.weapon.id + (st.lastBlast ? '-T' + Math.round(st.lastBlast.t) + 's' : '') + '.png';
    cv.toBlob((b) => {
      if (!b) { toast('Nie udało się zapisać zdjęcia'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Zapisano zdjęcie ' + name);
    }, 'image/png');
  }

  // ---------- ŚWIADEK ----------
  function toggleEye() {
    if (K.eye) { exitEye(); return; }
    st.placingEye = !st.placingEye;
    $('#aEye').classList.toggle('on', st.placingEye);
    document.body.classList.toggle('placing', st.placingEye);
    if (st.placingEye) toast('Kliknij miejsce, w którym stoi świadek: ulicę albo dach', 3200);
  }
  function placeEye(hit) {
    st.placingEye = false;
    document.body.classList.remove('placing');
    const p = hit.point.clone();
    if (hit.building && hit.normal && hit.normal.y < 0.5) {
      // trafiona ściana: świadek stoi na chodniku przed nią
      p.addScaledVector(new T.Vector3(hit.normal.x, 0, hit.normal.z).normalize(), 2);
      p.y = Wd.groundY(p.x, p.z);
    } else if (!hit.building) p.y = Wd.groundY(p.x, p.z);
    p.y += 1.7;
    st.eyeHome = { tg: K.tTarget.clone(), d: K.tDist, phi: K.tPhi, th: K.tTheta };
    const D = deriveFor(st.weapon);
    const gy = Wd.groundY(st.target.point.x, st.target.point.z);
    const look = new T.Vector3(st.target.point.x, gy + (st.weapon.kt ? Math.min(D.hob, 2000) * 0.6 : 8), st.target.point.z);
    K.enterEye(p, look);
    K.film.w = 0; K.film.cur = null;
    eyeMarker.position.copy(p).add(new T.Vector3(0, -1.7, 0));
    $('#aEye').classList.add('on');
    document.body.classList.add('eye');
    $('#eyeHud').hidden = false;
    viewOffset();
    updateEyeHud();
  }
  function exitEye() {
    K.exitEye(Wd.camera);
    st.placingEye = false;
    $('#aEye').classList.remove('on');
    document.body.classList.remove('eye', 'placing');
    $('#eyeHud').hidden = true;
    eyeMarker.visible = !!st.eyeHome && false;
    if (st.eyeHome) {
      const h = st.eyeHome;
      K.target.copy(h.tg); K.tTarget.copy(h.tg); K.dist = K.tDist = h.d; K.phi = K.tPhi = h.phi; K.theta = K.tTheta = h.th;
    }
    if (st.follow) st.follow = null;
    viewOffset();
  }
  function eyeVerdict(p, q, D, d) {
    const out = [];
    let cls = 'ok';
    if (D.nuke && !D.cosmic && d < D.fbR) { out.push('Świadek jest wewnątrz kuli ognia.'); cls = 'dead'; }
    else if (p > 140) { out.push('Fala niszczy nawet budynki żelbetowe. Brak szans przeżycia.'); cls = 'dead'; }
    else if (p > 35) { out.push('Budynki wokół się zawalają. Szansa przeżycia na ulicy niewielka.'); cls = 'dead'; }
    else if (p > 14) { out.push('Fala przewraca człowieka, lecą gruz i szkło. Grożą ciężkie obrażenia.'); cls = 'bad'; }
    else if (p > 7) { out.push('Zerwane dachy, wybite okna. Największe zagrożenie to lecące szkło.'); cls = 'bad'; }
    else if (p > 3) { out.push('Pękają szyby. Bezpieczniej z dala od okien.'); cls = 'warn'; }
    else if (p > 1) out.push('Głośny huk i drżące szyby, bez zagrożenia.');
    else out.push('Do świadka dociera tylko odległy grzmot.');
    if (D.nuke) {
      if (q > D.burn3) { out.push('Żar: oparzenia III stopnia odkrytej skóry, zapalają się ubrania.'); if (cls !== 'dead') cls = 'bad'; }
      else if (q > Ph.TH.burn1) { out.push('Żar: oparzenia skóry jak od silnego słońca.'); if (cls === 'ok') cls = 'warn'; }
      if (!D.cosmic && d < D.radii.rad + D.hob * 0.3 && cls !== 'dead') { out.push('Śmiertelna dawka promieniowania.'); cls = 'dead'; }
    }
    return { txt: out.join(' '), cls };
  }
  function updateEyeHud() {
    if (!K.eye) return;
    const hud = $('#eyeHud');
    const bl = st.lastBlast && st.lastBlast.eyeT !== undefined ? st.lastBlast : null;
    const D = bl ? bl.d : deriveFor(st.weapon);
    const gy = Wd.groundY(st.target.point.x, st.target.point.z);
    const c = bl ? bl.pos : new T.Vector3(st.target.point.x, gy + (st.weapon.kt ? D.hob : Math.max(0, st.target.point.y - gy)), st.target.point.z);
    const ep = K.eye.pos;
    const dist = Math.hypot(ep.x - c.x, ep.z - c.z);
    const sl = Math.max(0.5, ep.distanceTo(c));
    const p = Ph.overpressure(sl, D.cbrtW);
    const q = Ph.thermal(Math.max(sl, 1), D.Y4pi, D.lambda);
    const at = Ph.arrival(D.front, sl);
    const v = eyeVerdict(p, q, D, sl);
    let state;
    if (!bl) state = `Fala dotarłaby po <b>${Ut.time(at)}</b>, dźwięk po <b>${Ut.time(sl / 343)}</b> (błysk od razu)`;
    else if (!bl.heard) state = `<span class="cd">Fala dotrze za <b>${Ut.time(Math.max(0, at - bl.t))}</b></span>`;
    else state = `<span class="cd hit">Fala dotarła po ${Ut.time(at)}</span>`;
    hud.innerHTML = `<div class="eh"><b>Świadek</b> · ${Ut.dist(dist)} od epicentrum${ep.y - Wd.groundY(ep.x, ep.z) > 4 ? ' · na dachu' : ''}<button id="eyeX" title="Wróć do widoku z góry (Esc)">✕</button></div>
      <div class="es">${state}</div>
      <div class="eg"><span>Nadciśnienie <b>${Ut.pressure(p)}</b></span>${D.nuke ? `<span>Żar <b>${Ut.num(q / 1000, q < 1e4 ? 1 : 0)} kJ/m²</b></span>` : ''}</div>
      <div class="ev ${v.cls}">${v.txt}</div>`;
    $('#eyeX').onclick = exitEye;
  }

  // ---------- CO DALEJ ----------
  function nextWeapon(w) {
    const kg = (x) => (x.kt ? x.kt * 1e6 : x.tnt) * (x.salvo || 1);
    const list = WEAP.filter((x) => !x.custom && x.id !== w.id).sort((a, b) => kg(a) - kg(b));
    return list.find((x) => kg(x) > kg(w) * 1.5) || null;
  }
  function checkNext() {
    const bl = st.lastBlast;
    if (!bl || bl.nextShown || (st.delivery && !st.delivery.done)) return;
    const D = bl.d;
    const tReady = D.nuke ? Math.max(D.tShockGlass * 1.2, D.tRise * (D.cosmic ? 0.5 : 1.1)) : Math.max(D.tShockGlass * 1.5, Math.min(D.tRise, 12));
    if (bl.t < tReady) return;
    bl.nextShown = true;
    const nw = nextWeapon(bl.w);
    const el = $('#next');
    el.innerHTML = `<span>Co dalej?</span><button data-n="replay">↻ Jeszcze raz</button>${K.eye ? '' : '<button data-n="eye">👁 Jako świadek</button>'}${nw ? `<button data-n="next">Silniejszy: ${nw.short}</button>` : ''}<button data-n="move">Inne miejsce</button><button class="x" data-n="x" aria-label="Zamknij">✕</button>`;
    el.hidden = false;
    el.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const n = b.dataset.n;
      hideNext();
      if (n === 'replay') replay();
      else if (n === 'eye') { toggleEye(); }
      else if (n === 'next' && nw) { resetCity(true); selectWeapon(nw); }
      else if (n === 'move') { resetCity(true); toast('Kliknij w makietę, żeby wskazać nowy cel', 2600); }
    };
  }
  function hideNext() { const el = $('#next'); if (el) el.hidden = true; }

  // ---------- POWTÓRKA, LINK ----------
  function replay() {
    const s = st.lastShot;
    if (!s) { toast('Najpierw coś odpal'); return; }
    if (st.delivery && !st.delivery.done) return;
    const w = WEAP.byId(s.wid);
    if (s.custom) { Object.assign(w, s.custom); WEAP.applyCustom(w); }
    resetCity(true);
    st.ground = s.ground;
    if (s.mirv) st.mirv = s.mirv;
    st.target = { point: s.target.point.clone(), normal: s.target.normal ? s.target.normal.clone() : null, building: s.target.building };
    st.weapon = w;
    showGroup(w.group);
    document.querySelectorAll('.wpn').forEach((el) => el.classList.toggle('sel', el.dataset.id === w.id));
    renderCard();
    if (!K.eye) {
      const c = s.cam;
      K.target.copy(c.tg); K.tTarget.copy(c.tg); K.dist = K.tDist = c.d; K.phi = K.tPhi = c.phi; K.theta = K.tTheta = c.th;
      K.fly = null; K.userActive = 0;
    }
    fire();
  }
  function writeHash() {
    const w = st.weapon, p = st.target.point;
    const q = new URLSearchParams();
    q.set('w', w.id); q.set('x', p.x.toFixed(1)); q.set('y', p.y.toFixed(1)); q.set('z', p.z.toFixed(1));
    if (st.target.building) q.set('b', '1');
    if (st.ground) q.set('g', '1');
    if (w.mirvOpts && st.mirv > 1) q.set('m', st.mirv);
    if (st.cmp) q.set('cmp', st.cmp.id);
    if (w.custom) { q.set('c', w.ck); q.set('k', w.clog.toFixed(2)); q.set('h', String(Math.round(w.chob))); }
    if (Wd.timeName !== 'day') q.set('t', Wd.timeName);
    if (st.wind !== 1) q.set('wi', st.wind);
    if (st.windDir !== 1) q.set('wd', st.windDir);
    if (st.vis) q.set('v', st.vis);
    try { history.replaceState(null, '', '#' + q.toString()); } catch (e) { /* plik lokalny bez historii */ }
  }
  function readHash() {
    if (location.hash.length < 3) return;
    const q = new URLSearchParams(location.hash.slice(1));
    const w = WEAP.byId(q.get('w'));
    if (!w) return;
    st.weapon = w;
    const x = parseFloat(q.get('x')), y = parseFloat(q.get('y')), z = parseFloat(q.get('z'));
    if (isFinite(x) && isFinite(z) && Math.hypot(x, z) < 300000) st.target = { point: new T.Vector3(x, isFinite(y) ? y : Wd.groundY(x, z), z), building: q.get('b') === '1' };
    st.ground = q.get('g') === '1';
    const m = parseInt(q.get('m'), 10); if (m === 3 || m === 8) st.mirv = m;
    const cw = WEAP.byId(q.get('cmp')); if (cw && !cw.custom) st.cmp = cw;
    if (w.custom) {
      w.ck = q.get('c') === 'nuke' ? 'nuke' : 'chem';
      const k = parseFloat(q.get('k')), h = parseFloat(q.get('h'));
      if (isFinite(k)) w.clog = Ut.clamp(k, w.ck === 'nuke' ? 4 : -1, w.ck === 'nuke' ? 11 : 6);
      if (isFinite(h)) w.chob = Math.max(-1, h);
      WEAP.applyCustom(w);
    }
    const t = q.get('t'); if (t === 'dusk' || t === 'night') st.timeAtBoot = t;
    const wi = parseInt(q.get('wi'), 10); if (wi >= 0 && wi < 3) st.wind = wi;
    const wd = parseInt(q.get('wd'), 10); if (wd >= 0 && wd < 8) st.windDir = wd;
    const v = parseInt(q.get('v'), 10); if (v >= 0 && v < 3) st.vis = v;
    st.fromLink = true;
  }
  function copyLink() {
    writeHash();
    const url = location.href;
    const ok = () => toast('Link do tego scenariusza skopiowany');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, () => prompt('Skopiuj link:', url));
    else prompt('Skopiuj link:', url);
  }

  // ---------- INTERFEJS ----------
  const TNAMES = {
    day: ['<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>', 'Dzień'],
    dusk: ['<svg viewBox="0 0 24 24"><path d="M6.5 16a5.5 5.5 0 0 1 11 0"/><path d="M2.5 16h19M5 20h14M12 4.5v3M4.6 8.6l2 2M19.4 8.6l-2 2"/></svg>', 'Zmierzch'],
    night: ['<svg viewBox="0 0 24 24"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/></svg>', 'Noc']
  };
  function setTime(n) {
    Wd.setTime(n);
    savePrefs();
    $('#bTime').innerHTML = `<span class="ti">${TNAMES[n][0]}</span><span class="tl">${TNAMES[n][1]}</span>`;
  }
  function keyFor(i) { return i < 9 ? String(i + 1) : i === 9 ? '0' : i === 10 ? '−' : i === 11 ? '=' : i === 12 ? ']' : ''; }
  function wYield(w) { return w.custom ? Ut.tnt(w.kt ? w.kt * 1e6 : w.tnt) : Ut.tnt(w.kt ? w.kt * 1e6 : w.tnt) + (w.salvo ? ' ×' + w.salvo : ''); }
  const GROUPS = ['conv', 'nuke', 'hist', 'custom'];
  const GN = { conv: 'Konwencjonalne', nuke: 'Jądrowe', hist: 'Katastrofy i kosmos', custom: 'Laboratorium' };
  const GT = { conv: 'Konwencj.', nuke: 'Jądrowe', hist: 'Katastrofy', custom: 'Własny' };
  function showGroup(g) {
    st.group = g;
    document.querySelectorAll('#wtabs button').forEach((b) => { b.classList.toggle('on', b.dataset.g === g); b.setAttribute('aria-selected', b.dataset.g === g); });
    document.querySelectorAll('#wlist .wpn').forEach((el) => { el.hidden = el.dataset.g !== g; });
  }
  function buildUI() {
    const list = $('#wlist');
    let html = '';
    $('#wtabs').innerHTML = GROUPS.map((g) => `<button role="tab" data-g="${g}" class="${g === 'nuke' ? 'nuke' : ''}" title="${GN[g]}">${GT[g]}</button>`).join('');
    $('#wtabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; showGroup(b.dataset.g); const first = WEAP.find((w) => w.group === b.dataset.g); if (first && st.weapon.group !== b.dataset.g) selectWeapon(first); });
    for (const g of GROUPS) {
      WEAP.filter((w) => w.group === g).forEach((w) => {
        const n = WEAP.indexOf(w);
        html += `<button class="wpn ${g}" data-id="${w.id}" data-g="${g}"><span class="ic">${WEAP.icon(w)}</span><span class="nm">${w.short}</span><span class="yl">${wYield(w)}</span><kbd>${keyFor(n)}</kbd></button>`;
      });
    }
    list.innerHTML = html;
    list.addEventListener('click', (e) => { const b = e.target.closest('.wpn'); if (b) selectWeapon(WEAP.byId(b.dataset.id)); });
    $('#lToggle').addEventListener('click', () => { document.body.classList.toggle('collapsed'); viewOffset(); });
    $('#fire').addEventListener('click', fire);
    $('#aReplay').addEventListener('click', replay);
    $('#aEye').addEventListener('click', toggleEye);
    $('#aShot').addEventListener('click', () => { st.shot = true; });
    $('#aLink').addEventListener('click', copyLink);
    $('#bRings').addEventListener('click', () => { st.rings = !st.rings; savePrefs(); $('#bRings').classList.toggle('on', st.rings); $('#bRings').setAttribute('aria-pressed', st.rings); if (st.rings && ringAlphaT === 0) ringAlphaT = 0.9; });
    $('#bFilm').addEventListener('click', () => { st.film = !st.film; savePrefs(); $('#bFilm').classList.toggle('on', st.film); $('#bFilm').setAttribute('aria-pressed', st.film); });
    $('#bSound').addEventListener('click', () => { A.init(); const on = A.toggle(); $('#bSound').classList.toggle('on', on); $('#bSound').classList.toggle('mute', !on); savePrefs(); });
    $('#bReset').addEventListener('click', () => resetCity());
    const times = ['day', 'dusk', 'night'];
    $('#bTime').addEventListener('click', () => setTime(times[(times.indexOf(Wd.timeName) + 1) % 3]));
    setTime(st.timeAtBoot || 'day');
    // podpowiedź znika przy pierwszym ruchu albo po kilkunastu sekundach
    Wd.renderer.domElement.addEventListener('pointerdown', () => $('#hint').classList.add('gone'), { once: true });
    setTimeout(() => $('#hint').classList.add('gone'), 15000);
    $('#wWind').addEventListener('click', () => { st.wind = (st.wind + 1) % 3; applyWeather(); });
    $('#wDir').addEventListener('click', () => { st.windDir = (st.windDir + 1) % 8; applyWeather(); });
    $('#wVis').addEventListener('click', () => { st.vis = (st.vis + 1) % 3; applyWeather(); });
    $('#bHelp').addEventListener('click', () => { $('#help').hidden = false; });
    $('#helpClose').addEventListener('click', () => { $('#help').hidden = true; });
    $('#introGo').addEventListener('click', () => { A.init(); $('#intro').hidden = true; });
    $('#bPanel').addEventListener('click', () => document.body.classList.toggle('fx-open'));
    document.querySelectorAll('#speeds button').forEach((b) => b.addEventListener('click', () => setSpeed(b.dataset.s)));
    const card = $('#card');
    card.addEventListener('click', (e) => {
      const b = e.target.closest('[data-burst]');
      if (b) {
        st.ground = b.dataset.burst === 'ground';
        renderCard();
        const D = deriveFor(st.weapon);
        showRings(st.target.point, D, true); renderEffects(D, true); setRingsAlpha(1);
        return;
      }
      const mv = e.target.closest('[data-mirv]');
      if (mv) {
        st.mirv = parseInt(mv.dataset.mirv, 10);
        renderCard();
        const D = deriveFor(st.weapon);
        showRings(st.target.point, D, true); renderEffects(D, true); setRingsAlpha(1);
        if (!K.eye && st.mirv > 1) { const tg = st.target.point.clone(); K.flyTo(tg, Math.max(previewDist(D), Ut.clamp(D.radii.moderate * 1.7, 900, 4200) * 5), 1.05, undefined, 1.4); }
        return;
      }
      const k = e.target.closest('[data-ck]');
      if (k && st.weapon.custom) {
        const w = st.weapon;
        if (w.ck === k.dataset.ck) return;
        w.ck = k.dataset.ck;
        w.clog = w.ck === 'nuke' ? Math.max(4, Math.min(11, w.clog < 4 ? 4.3 : w.clog)) : Math.min(6, w.clog);
        w.chob = -1;
        WEAP.applyCustom(w);
        selectWeapon(w);
        return;
      }
      if (e.target.closest('#cOpt') && st.weapon.custom) { st.weapon.chob = -1; customChanged(true); }
    });
    card.addEventListener('input', (e) => {
      const w = st.weapon;
      if (!w.custom) return;
      if (e.target.id === 'cLog') w.clog = parseFloat(e.target.value);
      else if (e.target.id === 'cHob') {
        const v = parseFloat(e.target.value);
        w.chob = v < 0.025 ? 0 : Math.abs(v - 0.5) < 0.018 ? -1 : Math.round(WEAP.optHob(Math.pow(10, w.clog) / 1e6) * Math.pow(10, (v - 0.5) * 1.6));
      }
      customChanged(false);
    });
    $('#cmpBox').addEventListener('change', (e) => { if (e.target.id === 'cmpSel') setCmp(e.target.value); });
    card.addEventListener('change', (e) => { if (st.weapon.custom && (e.target.id === 'cLog' || e.target.id === 'cHob')) customChanged(true); });
    // podgląd skutków pod kursorem
    Wd.renderer.domElement.addEventListener('pointermove', (e) => { hoverT = performance.now(); hover(e); });
    Wd.renderer.domElement.addEventListener('pointerleave', () => { $('#tip').hidden = true; });
    Wd.renderer.domElement.addEventListener('pointerdown', () => { if (K.eye) K.eye.user = true; });
    window.addEventListener('keydown', onKey);
  }
  function customChanged(final) {
    const w = st.weapon;
    WEAP.applyCustom(w);
    const D = deriveFor(w);
    $('#cY').textContent = Ut.tnt(w.kt ? w.kt * 1e6 : w.tnt);
    const hl = $('#cH'); if (hl) hl.textContent = w.chob === 0 ? 'przy ziemi' : Ut.dist(w.hob) + (w.chob < 0 ? ' · optymalna' : '');
    const hs = $('#cHob'); if (hs && final) hs.value = hobSlider(w);
    $('#cFacts').innerHTML = factsHtml(w) + cmpHtml(w);
    const yl = document.querySelector('.wpn[data-id="custom"] .yl'); if (yl) yl.textContent = wYield(w);
    showRings(st.target.point, D, true);
    renderEffects(D, true);
    if (final && !K.eye) {
      const d = previewDist(D);
      const tg = st.target.point.clone(); tg.y = Wd.groundY(tg.x, tg.z) + (D.nuke ? Math.min(D.Htop * 0.3, d * 0.2) : 0);
      K.flyTo(tg, d, d < 60 ? 1.18 : d < 5000 ? 1.08 : 1.15, undefined, 1.2);
    }
    if (K.eye) updateEyeHud();
  }
  function hobSlider(w) {
    if (w.chob === 0) return 0;
    if (w.chob < 0) return 0.5;
    const opt = WEAP.optHob(w.kt);
    return Ut.clamp(0.5 + Math.log10(w.chob / opt) / 1.6, 0.03, 1);
  }
  function setSpeed(s) {
    if (s === 'pause') { st.paused = !st.paused; }
    else if (s === 'auto') { st.tsMode = 'auto'; st.paused = false; }
    else { st.tsMode = 'fixed'; st.tsFixed = parseFloat(s); st.paused = false; }
    document.querySelectorAll('#speeds button').forEach((b) => {
      const v = b.dataset.s;
      b.classList.toggle('on', v === 'pause' ? st.paused : !st.paused && (v === 'auto' ? st.tsMode === 'auto' : st.tsMode === 'fixed' && parseFloat(v) === st.tsFixed));
    });
  }
  function onKey(e) {
    if (e.target.tagName === 'INPUT') { if (e.key === 'Enter') e.target.blur(); return; }
    if (!$('#intro').hidden) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#introGo').click(); } return; }
    const k = e.key;
    if (k >= '1' && k <= '9') { const w = WEAP[parseInt(k, 10) - 1]; if (w) selectWeapon(w); }
    else if (k === '0') selectWeapon(WEAP[9]);
    else if (k === '-') selectWeapon(WEAP[10]);
    else if (k === '=') selectWeapon(WEAP[11]);
    else if (k === ']' || k === '\\') selectWeapon(WEAP[12]);
    else if (k === ' ' || k === 'Enter') { e.preventDefault(); fire(); }
    else if (k === 'p' || k === 'P') setSpeed('pause');
    else if (k === 'r' || k === 'R') $('#bRings').click();
    else if (k === 'f' || k === 'F') $('#bFilm').click();
    else if (k === 't' || k === 'T') $('#bTime').click();
    else if (k === 'o' || k === 'O') toggleEye();
    else if (k === 'z' || k === 'Z') replay();
    else if (k === 'c' || k === 'C') {
      // kolejny ładunek do porównania (silniejszy od wybranego), potem wyłączenie
      const list = WEAP.filter((w) => !w.custom && w.id !== st.weapon.id);
      const i = st.cmp ? list.indexOf(st.cmp) : -1;
      const nx = i < 0 ? (nextWeapon(st.weapon) || list[0]) : list[i + 1] || null;
      setCmp(nx ? nx.id : '');
      toast(nx ? 'Porównanie: ' + nx.short : 'Bez porównania');
    }
    else if (k === 'Delete') resetCity();
    else if (k === 'Escape') { if (!$('#help').hidden) $('#help').hidden = true; else if (K.eye || st.placingEye) exitEye(); }
  }

  function resetCity(silent) {
    hideNext();
    for (const bl of st.blasts) F.removeBlast(bl);
    st.blasts = []; st.lastBlast = null; st.follow = null;
    if (st.delivery) { if (st.delivery.abort) st.delivery.abort(); st.delivery.done = true; }
    if (st.lastTank) { st.lastTank(); st.lastTank = null; }
    F.clear();
    C.reset();
    const U = SH.uniforms;
    for (let i = 0; i < SH.MAXE; i++) { U.uE1.value[i].z = -1; U.uE2.value[i].set(0, 0, 0, 1); }
    U.uNE.value = 0; U.uBlackout.value = 0;
    for (const v of U.uBlack.value) v.set(0, 0, 0, 0);
    PP.nRings = 0; PP.nHaze = 0;
    dust = 0;
    $('#fire').classList.remove('busy');
    const D = deriveFor(st.weapon);
    showRings(st.target.point, D, true); renderEffects(D, true); setRingsAlpha(1);
    if (K.eye) updateEyeHud();
    if (!silent) toast('Miasto odbudowane');
  }
  function toast(t, ms) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('show'), ms || 1800); }

  function factsHtml(w) { return `<dl>${w.facts.map((f) => `<dt>${f[0]}</dt><dd>${f[1]}</dd>`).join('')}</dl>`; }
  function cmpHtml(w) {
    const kg = w.kt ? w.kt * 1e6 : w.tnt;
    const total = kg * (w.salvo || 1);
    const dyn = total / 0.2, hiro = total / 15e6;
    let cmp = '';
    if (w.id !== 'dynamit') cmp = `= <b>${Ut.bigCount(dyn)}</b> ${Ut.plural(dyn, 'laska', 'laski', 'lasek')} dynamitu`;
    if (total >= 1e5 && w.id !== 'littleboy') cmp += `<br>= <b>${hiro >= 1 ? Ut.num(hiro, hiro < 10 ? 1 : 0) + '×' : Ut.num(hiro * 100, hiro < 0.01 ? 2 : 1) + '%'}</b> bomby z Hiroszimy`;
    return `<div class="cmp">${cmp}</div>`;
  }
  function renderCard() {
    const w = st.weapon;
    const kg = w.kt ? w.kt * 1e6 : w.tnt;
    const GL = { conv: 'Broń konwencjonalna', nuke: 'Broń jądrowa', hist: w.cosmic ? 'Zjawisko naturalne' : 'Katastrofa', custom: 'Laboratorium' };
    if (w.custom) {
      const nuke = w.ck === 'nuke';
      $('#card').innerHTML = `
        <div class="ch"><span class="ic big">${WEAP.icon(w)}</span><div><small>Laboratorium</small><h3>Własny ładunek</h3></div></div>
        <div class="seg"><button data-ck="chem" class="${!nuke ? 'on' : ''}">Chemiczny</button><button data-ck="nuke" class="${nuke ? 'on' : ''}">Jądrowy</button></div>
        <label class="sl"><span>Moc (równoważnik trotylu)</span><b id="cY">${Ut.tnt(kg)}</b></label>
        <input type="range" id="cLog" min="${nuke ? 4 : -1}" max="${nuke ? 11 : 6}" step="0.01" value="${w.clog}">
        <div class="ticks">${nuke ? '<span>10 t</span><span>1 kt</span><span>100 kt</span><span>10 Mt</span><span>100 Mt</span>' : '<span>100 g</span><span>10 kg</span><span>1 t</span><span>100 t</span><span>1 kt</span>'}</div>
        ${nuke ? `<label class="sl"><span>Wysokość wybuchu</span><b id="cH">${w.chob === 0 ? 'przy ziemi' : Ut.dist(w.hob) + (w.chob < 0 ? ' · optymalna' : '')}</b></label>
        <input type="range" id="cHob" class="hob" min="0" max="1" step="0.001" value="${hobSlider(w)}">
        <div class="ticks"><span>ziemia</span><span>optymalna</span><span>×6</span></div>
        <button id="cOpt" class="mini-btn">Ustaw optymalną</button>` : ''}
        <div id="cFacts">${factsHtml(w)}${cmpHtml(w)}</div>
        <p class="desc">${w.desc}</p>`;
      return;
    }
    let burst = '';
    if (w.kt && !w.cosmic) {
      burst = `<div class="burst"><button data-burst="air" class="${!st.ground ? 'on' : ''}">W powietrzu · ${Ut.dist(w.hob)}</button><button data-burst="ground" class="${st.ground ? 'on' : ''}">Przy ziemi</button></div>
      <p class="bnote">${st.ground ? 'Wybuch przy ziemi: mniejszy zasięg fali, ale krater i opad promieniotwórczy z wiatrem.' : 'Wysokość wybuchu dobrana tak jak w rzeczywistości, by fala zniszczyła jak największy obszar.'}</p>`;
    }
    if (w.mirvOpts) {
      burst += `<div class="mirv"><span>Głowice</span>${w.mirvOpts.map((n) => `<button data-mirv="${n}" class="${st.mirv === n ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="bnote">${st.mirv > 1 ? `Jedna rakieta, ${st.mirv} głowice spadają jedna po drugiej w rozrzucie wokół celu (czerwone kółka). Razem ${Ut.tnt(w.kt * 1e6 * st.mirv)}.` : 'Rakieta może nieść kilka głowic, każdą na inny cel.'}</p>`;
    }
    $('#card').innerHTML = `
      <div class="ch"><span class="ic big">${WEAP.icon(w)}</span><div><small>${GL[w.group]}</small><h3>${w.name}</h3></div></div>
      <div class="yield"><span>Równoważnik trotylu</span><b>${Ut.tnt(kg)}${w.salvo ? ' × ' + w.salvo : ''}</b></div>
      ${cmpHtml(w)}
      <p class="desc">${w.desc}</p>
      ${factsHtml(w)}
      ${burst}`;
  }

  function renderEffects(D, preview) {
    const ex = C.exposure(st.target.point, D);
    let h = `<div class="rings">`;
    for (const r of ringList) h += `<div class="ring"><i style="background:${r.col}"></i><span>${r.name}</span><b>${Ut.dist(r.R)}</b></div>`;
    h += `</div>`;
    if (D.cosmic) h += `<div class="mini">Rozbłysk na wysokości <b>${Ut.dist(D.hob)}</b> · kula ognia <b>${Ut.dist(D.fbR * 2)}</b></div>`;
    else if (D.nuke) h += `<div class="mini">Kula ognia: <b>${Ut.dist(D.fbR * 2)}</b> średnicy · grzyb do <b>${Ut.dist(D.Htop)}</b></div>`;
    else h += `<div class="mini">Kula ognia: <b>${Ut.dist(D.fbR * 2)}</b> średnicy${D.craterR ? ` · lej: <b>${Ut.dist(D.craterR * 2)}</b>` : ''}</div>`;
    if (D.fallout) h += `<div class="mini warn">Opad promieniotwórczy z wiatrem: ok. <b>${Ut.dist(D.fallout.len * [0.35, 1, 1.8][st.wind])}</b></div>`;
    if (D.radii.moderate > 0) h += `<div class="mini">Obszar zawaleń: <b>${Ut.area(Math.PI * D.radii.moderate * D.radii.moderate)}</b></div>`;
    if (preview) h += `<div class="mini">W strefie zawaleń (35 kPa) w tym miejscu: <b>${Ut.num(ex.bld, 0)}</b> ${Ut.plural(ex.bld, 'budynek', 'budynki', 'budynków')}, ok. <b>${Ut.bigCount(ex.pop)}</b> ${Ut.plural(ex.pop, 'osoba', 'osoby', 'osób')}</div>`;
    $('#effects .rbody').innerHTML = h;
    renderCmp(D);
  }

  function updateHud() {
    const bl = st.lastBlast;
    // zegar i tempo
    $('#clock').textContent = bl ? 'T+ ' + Ut.time(Math.max(0, bl.t)) : st.delivery && !st.delivery.done ? (st.weapon.delivery === 'meteor' ? 'Wejście w atmosferę…' : st.weapon.delivery === 'charge' || st.weapon.delivery === 'warehouse' ? 'Zapalnik…' : 'Lot pocisku…') : 'Gotowy';
    const ts = st.ts || 0;
    $('#tsv').textContent = st.paused ? 'pauza' : (ts < 1 ? Ut.num(ts, ts < 0.1 ? 3 : 2) : Ut.num(ts, ts < 10 ? 1 : 0)) + '×' + (ts < 0.98 ? ' zwolnione tempo' : ts > 1.05 ? ' przyspieszone' : ' czas rzeczywisty');
    $('#aReplay').disabled = !st.lastShot;
    const rep = $('#report');
    if (!bl) { rep.hidden = true; return; }
    rep.hidden = false;
    const group = bl.group || [bl];
    const S = { destroyed: 0, damaged: 0, light: 0, glass: 0, fires: 0, cars: 0, dead: 0, inj: 0, trees: 0, spread: 0 };
    for (const b of group) {
      for (const k in S) if (b.stats[k] !== undefined) S[k] += b.stats[k];
      if (b.t > Ph.arrival(b.d.front, b.d.radii.moderate * 2 + b.d.hob)) S.trees += b.stats.treesTotal;
    }
    const Rg = Math.sqrt(Math.max(0, bl.frontR * bl.frontR - (bl.pos.y - Wd.groundY(bl.pos.x, bl.pos.z)) ** 2));
    const pf = bl.frontP;
    const row = (l, v, cls) => `<div class="rr ${cls || ''}"><span>${l}</span><b>${v}</b></div>`;
    rep.innerHTML = `<h4>Raport · ${bl.w.short}${group.length > 1 ? ' (' + group.length + ')' : ''}</h4>
      ${pf > 0.8 ? row('Fala uderzeniowa', Ut.dist(Rg) + ' · ' + Ut.pressure(pf)) : row('Fala uderzeniowa', 'wygasła')}
      ${row('Budynki zawalone', Ut.num(S.destroyed, 0), 'red')}
      ${row('Poważnie uszkodzone', Ut.num(S.damaged, 0), 'org')}
      ${row('Lekko uszkodzone', Ut.num(S.light, 0))}
      ${row('Budynki z wybitymi szybami', Ut.num(S.glass, 0), 'blu')}
      ${row('Pożary', Ut.num(S.fires, 0) + (S.spread ? ' <small>(' + Ut.num(S.spread, 0) + ' od sąsiadów)</small>' : ''), 'org')}
      ${row('Powalone drzewa', Ut.num(S.trees, 0))}
      ${row('Samochody zniszczone', Ut.num(S.cars, 0))}
      ${row('Ofiary śmiertelne (szac.)', Ut.bigCount(S.dead), 'red')}
      ${row('Ranni (szac.)', Ut.bigCount(S.inj), 'org')}
      <p class="fine">Szacunek dla ludzi w budynkach makiety (ok. ${Ut.bigCount(C.totalPop)} mieszkańców), bez opadu i skutków późniejszych. Pożary mogą się rozprzestrzeniać przez wiele minut.</p>`;
  }

  // Etykiety pierścieni w 3D
  function updateLabels() {
    const box = $('#labels');
    const labs = ringList.concat(cmpList);
    if (!st.rings || ringAlpha < 0.05 || !labs.length || K.eye) { if (box.childElementCount) box.innerHTML = ''; return; }
    const cam = Wd.camera;
    const right = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 0); right.y = 0; right.normalize();
    const w = window.innerWidth, h = window.innerHeight;
    while (box.childElementCount < labs.length) box.appendChild(document.createElement('div'));
    while (box.childElementCount > labs.length) box.lastChild.remove();
    const placed = [];
    labs.forEach((r, i) => {
      const el = box.children[i];
      const a = r.cmp ? Math.PI - 0.5 + (i - ringList.length) * 0.32 : -0.5 + i * 0.3, ca = Math.cos(a), sa = Math.sin(a);
      const dir = new T.Vector3(right.x * ca - right.z * sa, 0, right.x * sa + right.z * ca);
      const p = ringCenter.clone().addScaledVector(dir, r.R);
      p.y = Wd.groundY(p.x, p.z);
      const s = p.project(cam);
      const x = (s.x * 0.5 + 0.5) * w, y = (-s.y * 0.5 + 0.5) * h;
      const vis = s.z < 1 && x > 0 && x < w - 60 && y > 40 && y < h && !placed.some((q) => Math.abs(q[1] - y) < 18 && Math.abs(q[0] - x) < 150);
      el.className = r.cmp ? 'lbl cmp' : 'lbl';
      el.style.display = vis ? '' : 'none';
      if (vis) {
        placed.push([x, y]);
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        el.style.opacity = ringAlpha.toFixed(2);
        const html = `<i style="background:${r.col}"></i>${r.cmp ? st.cmp.short + ': ' : ''}${r.name.split(' · ')[0]} <b>${Ut.dist(r.R)}</b>`;
        if (el._h !== html) { el._h = html; el.innerHTML = html; el.style.borderColor = r.col; }
      }
    });
  }

  // Podpowiedź pod kursorem: odległość, nadciśnienie, skutek
  let hoverPending = null;
  function hover(e) {
    hoverPending = e;
    if (hover.busy) return;
    hover.busy = true;
    requestAnimationFrame(() => {
      hover.busy = false;
      const ev = hoverPending;
      const tip = $('#tip');
      if (ev.pointerType === 'touch') { tip.hidden = true; return; }
      const r = Wd.renderer.domElement.getBoundingClientRect();
      const ndc = new T.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      const ray = new T.Raycaster(); ray.setFromCamera(ndc, Wd.camera);
      const o = ray.ray.origin, d = ray.ray.direction;
      if (d.y > -1e-4) { tip.hidden = true; return; }
      let t = -o.y / d.y;
      for (let k = 0; k < 5; k++) { const x = o.x + d.x * t, z = o.z + d.z * t; t = (Wd.groundY(x, z) - o.y) / d.y; }
      const p = o.clone().addScaledVector(d, t);
      const bl = st.lastBlast && !st.ringPreview ? st.lastBlast : null;
      const D = bl ? bl.d : deriveFor(st.weapon);
      const c = bl ? bl.pos : new T.Vector3(st.target.point.x, Wd.groundY(st.target.point.x, st.target.point.z) + (st.weapon.kt ? D.hob : Math.max(0, st.target.point.y - Wd.groundY(st.target.point.x, st.target.point.z))), st.target.point.z);
      const dist = Math.hypot(p.x - c.x, p.z - c.z);
      const sl = Math.max(0.3, p.distanceTo(c));
      const pr = Ph.overpressure(sl, D.cbrtW);
      const q = Ph.thermal(Math.max(sl, 1), D.Y4pi, D.lambda);
      let fx = pr > 140 ? 'zniszczone nawet budynki żelbetowe' : pr > 35 ? 'większość budynków się zawala' : pr > 14 ? 'domy zniszczone, bloki poważnie uszkodzone' : pr > 7 ? 'zerwane dachy, popękane ściany' : pr > 3 ? 'wybite szyby, latające szkło' : pr > 1 ? 'pojedyncze pęknięte szyby' : 'fala niegroźna';
      if (D.nuke && !D.cosmic && sl < D.fbR) fx = 'wnętrze kuli ognia, wszystko odparowuje';
      let th = '';
      if (D.nuke) th = q > D.ignite ? ' · zapłon budynków i drzew' : q > D.burn3 ? ' · oparzenia III stopnia' : q > Ph.TH.burn1 ? ' · oparzenia skóry' : '';
      const at = Ph.arrival(D.front, sl);
      tip.hidden = false;
      tip.style.transform = `translate(${Math.min(ev.clientX + 16, window.innerWidth - 300)}px, ${ev.clientY + 14}px)`;
      tip.innerHTML = `<b>${Ut.dist(dist)}</b> od epicentrum<br>nadciśnienie <b>${Ut.pressure(pr)}</b> · fala po <b>${Ut.time(at)}</b><br><span>${fx}${th}</span>${st.placingEye ? '<br><i>kliknij, żeby postawić tu świadka</i>' : ''}`;
    });
  }

  // dostęp z konsoli (i do testów): EP.app.placeEye({ point, building: false }) itd.
  EP.app = { placeEye, exitEye, selectWeapon, setTarget, fire, replay, resetCity: () => resetCity() };

  window.addEventListener('DOMContentLoaded', () => {
    try { boot(); }
    catch (err) {
      console.error(err);
      $('#loading').hidden = false;
      $('#loading').textContent = 'Nie udało się uruchomić grafiki 3D (WebGL). Spróbuj w Chrome, Edge albo Firefoksie.';
      $('#introGo').textContent = 'Brak WebGL';
    }
  });
})();
