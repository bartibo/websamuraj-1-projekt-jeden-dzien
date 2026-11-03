// Główna pętla: wybór broni i celu, odpalanie, sloty wybuchów, tempo czasu, kamera, interfejs
(function () {
  const T = THREE;
  const Ut = EP.util, Ph = EP.phys, Wd = EP.world, C = EP.city, F = EP.fx, K = EP.cam, Dl = EP.delivery, A = EP.audio, SH = EP.shaders;
  const $ = (s) => document.querySelector(s);
  const WEAP = EP.weapons;

  const st = {
    weapon: WEAP.byId('tomahawk'), ground: false,
    target: { point: new T.Vector3(-12, 0, -40), building: false },
    blasts: [], delivery: null, lastTank: null, simNow: 0, tsMode: 'auto', tsFixed: 1, paused: false,
    rings: true, film: true, follow: null, nextId: 1, lastBlast: null
  };
  EP.state = st;

  const RING_DEF = {
    fireball: ['Kula ognia', '#ffd23f'], heavy: ['Ciężkie zniszczenia · 140 kPa', '#ff3b30'], rad: ['Śmiertelne promieniowanie · 5 Sv', '#7dff5a'],
    moderate: ['Zawalenia budynków · 35 kPa', '#ff8a1c'], burn3: ['Oparzenia III stopnia', '#ff5fb0'], light: ['Zniszczone domy · 14 kPa', '#ffc94d'],
    frag: ['Zasięg odłamków', '#d0d0d0'], glass: ['Wybite szyby · 5 kPa', '#4dc6ff']
  };

  // ---------- START ----------
  function boot() {
    const canvas = $('#c');
    Wd.init(canvas);
    F.init(Wd.scene);
    C.generate();
    K.init(canvas);
    K.onClick = onClick;
    buildMarker();
    // domyślny cel: chodnik przy biurowcu w śródmieściu, żeby nawet mały ładunek coś pokazał
    let best = null, bd = 1e9;
    for (const b of C.B) {
      if (b.parent >= 0 || b.sy < 25 || b.y > 0 || (b.cls !== 'office' && b.cls !== 'tower')) continue;
      const d = Math.hypot(b.x + 150, b.z + 150);
      if (d < bd) { bd = d; best = b; }
    }
    if (best) st.target.point.set(best.x + best.sx / 2 + 2.2, 0, best.z + Math.min(6, best.sz * 0.2));
    buildUI();
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

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    Wd.renderer.setSize(w, h, false);
    Wd.camera.aspect = w / h;
    Wd.camera.updateProjectionMatrix();
  }

  // ---------- ZNACZNIK CELU ----------
  let marker;
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
  }

  // ---------- WYBÓR ----------
  function deriveFor(w) {
    const gy = Wd.groundY(st.target.point.x, st.target.point.z);
    return Ph.derive(w, { ground: st.ground, hob: w.kt ? 0 : Math.max(0, st.target.point.y - gy) });
  }
  function previewDist(D) {
    return Ut.clamp(Math.max(D.radii.glass * 1.15, D.radii.moderate * 3.2, D.Htop * (D.nuke ? 1.4 : 0.8), 7), 7, 260000);
  }
  function selectWeapon(w, instant) {
    st.weapon = w;
    document.querySelectorAll('.wpn').forEach((el) => el.classList.toggle('sel', el.dataset.id === w.id));
    renderCard();
    const D = deriveFor(w);
    showRings(st.target.point, D, true);
    renderEffects(D, true);
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
    if (!st.blasts.some((b) => !b.done) || true) showRings(p.point, D, true);
    renderEffects(D, true);
  }

  function onClick(e) {
    const r = Wd.renderer.domElement.getBoundingClientRect();
    const ndc = new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const hit = C.pick(ndc, Wd.camera);
    if (!hit) return;
    if (hit.building && hit.normal) hit.point.addScaledVector(hit.normal, 0.05);
    setTarget(hit);
    $('#hint').classList.add('gone');
  }

  // ---------- ODPALENIE ----------
  function fire() {
    if (st.delivery && !st.delivery.done) return;
    A.init();
    const w = st.weapon;
    if (st.lastTank) { st.lastTank(); st.lastTank = null; }
    const tp = st.target.point.clone();
    const gy = Wd.groundY(tp.x, tp.z);
    const D = deriveFor(w);
    let burstPos;
    if (w.kt) burstPos = new T.Vector3(tp.x, gy + D.hob, tp.z);
    else burstPos = tp.clone();
    if (w.groundHob && !w.kt) burstPos.y = Math.max(burstPos.y, gy + w.groundHob);
    const salvo = w.delivery === 'salvo';
    st.delivery = Dl.start(w, { point: tp, normal: st.target.normal, building: st.target.building }, burstPos, (pos, dir, i) => detonate(w, pos, dir, salvo && i > 0));
    if (st.delivery.cleanupLater) st.lastTank = st.delivery.cleanupLater;
    if (st.film && st.delivery.update) {
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
    const D = Ph.derive(w, { ground: st.ground, hob: w.kt ? 0 : Math.max(0, pos.y - gy) });
    const bl = {
      id: st.nextId++, w, d: D, pos: pos.clone(), dir: dir ? dir.clone() : null, t: 0, frontR: 0, done: false, slot: allocSlot(),
      stats: { destroyed: 0, damaged: 0, light: 0, glass: 0, fires: 0, cars: 0, dead: 0, inj: 0, treesTotal: 0 },
      heard: false, simStart: st.simNow, light: st.nextId % Wd.xLights.length
    };
    bl.simNow = st.simNow;
    C.assess(bl);
    F.spawnExplosion(bl);
    st.blasts.push(bl);
    if (!quiet || !st.lastBlast) st.lastBlast = bl;
    else if (st.lastBlast && st.lastBlast.w === w) st.lastBlast.group = (st.lastBlast.group || [st.lastBlast]).concat([bl]);
    const camD = Wd.camera.position.distanceTo(pos);
    bl.camD = camD;
    // kamera: kadr wybuchu, potem płynne oddalanie razem z falą
    if (!quiet) {
      if (K.mode === 'film' && K.film.cur) K.setFromPose(K.film.cur.p, K.film.cur.l);
      K.mode = 'orbit';
      const fr = frameFor(bl, 0);
      const tg = pos.clone(); tg.y = gy + fr.ty;
      if (st.film || !K.userActive) {
        const th = Math.atan2(Wd.camera.position.x - pos.x, Wd.camera.position.z - pos.z);
        K.flyTo(tg, fr.d, fr.phi, th, D.nuke ? 0.6 : 0.5);
        st.follow = bl;
        K.userActive = 0;
        K.autoSpin = D.nuke ? 0.012 : 0.03;
      }
      showRings(new T.Vector3(pos.x, gy, pos.z), D, false);
      setRingsAlpha(0);
    }
    $('#fire').classList.remove('busy');
  }

  // Kadr: odległość kamery rosnąca z falą i grzybem
  function frameFor(bl, t) {
    const D = bl.d;
    const dy = bl.pos.y - Wd.groundY(bl.pos.x, bl.pos.z);
    const R = Ph.frontAt(D.front, t);
    const Rg = R > dy ? Math.sqrt(R * R - dy * dy) : 0;
    const top = F.cloudTop(bl) - Wd.groundY(bl.pos.x, bl.pos.z);
    const d0 = Math.max(D.fbR * 7, dy * 2.2, 4);
    const dF = Math.max(D.radii.moderate * 3, D.Htop * (D.nuke ? 1.5 : 0.9), D.radii.glass * (D.nuke ? 0.9 : 1.3), 10);
    let d = Ut.clamp(Math.max(d0, Rg * 2.0, top * 1.7), d0, dF);
    if (bl.w.salvo) d = Math.max(d, 650);
    return { d, phi: D.nuke ? 1.22 : d < 60 ? 1.15 : 0.98, ty: D.nuke ? Math.max(dy * 0.6, top * 0.42) : Math.min(top * 0.3, d * 0.15) };
  }

  // ---------- PIERŚCIENIE ----------
  let ringList = [], ringCenter = new T.Vector3(), ringAlpha = 0, ringAlphaT = 1;
  function showRings(center, D, preview) {
    ringCenter.copy(center); ringCenter.y = Wd.groundY(center.x, center.z);
    const r = D.radii;
    const keys = D.nuke ? ['glass', 'light', 'burn3', 'moderate', 'rad', 'heavy', 'fireball'] : ['glass', 'frag', 'light', 'moderate', 'heavy', 'fireball'];
    ringList = [];
    for (const k of keys) {
      let R = k === 'fireball' ? (D.nuke ? D.fbR : r.fireball) : r[k];
      if (!R || R <= 0) continue;
      ringList.push({ k, R, name: RING_DEF[k][0], col: RING_DEF[k][1] });
    }
    ringList.sort((a, b) => b.R - a.R);
    const U = SH.uniforms;
    U.uRingC.value.copy(ringCenter);
    U.uRingN.value = Math.min(8, ringList.length);
    ringList.slice(0, 8).forEach((x, i) => { U.uRingR.value[i] = x.R; U.uRingCol.value[i].set(x.col); });
    U.uRingDash.value = preview ? 1 : 0;
    // opad promieniotwórczy dla wybuchu przy ziemi
    if (D.fallout) {
      U.uFall.value.set(ringCenter.x, ringCenter.z, D.fallout.len, D.fallout.wid);
      const wd = new T.Vector2(F.WIND.x, F.WIND.z).normalize();
      U.uFallDir.value.copy(wd);
      U.uFallA.value = 1;
    } else U.uFallA.value = 0;
    st.ringPreview = preview;
  }
  function setRingsAlpha(a) { ringAlphaT = a; }

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
    return Math.exp(lt);
  }
  function curTs() { if (st.paused) return 0; return st.tsMode === 'auto' ? autoTs() : st.tsFixed; }

  // ---------- PĘTLA ----------
  let last = 0, uiT = 0, hoverT = 0, flash = 0, exposureK = 0;
  const _v = new T.Vector3(), _c = new T.Color();
  function loop(now) {
    requestAnimationFrame(loop);
    const dtR = Math.min(0.1, (now - last) / 1000); last = now;
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
    let glow = 0, glowPos = null;
    Wd.xLights.forEach((l) => { l.intensity = 0; });
    const camPos = Wd.camera.position;
    for (const bl of st.blasts) {
      bl.t += dtSim;
      bl.simNow = st.simNow;
      C.applyEvents(bl);
      F.updateBlast(bl, dtSim, dtA);
      const D = bl.d;
      bl.frontP = Ph.overpressure(Math.max(bl.frontR, 0.1), D.cbrtW);
      // slot dla shaderów
      const i = bl.slot;
      U.uE0.value[i].set(bl.pos.x, bl.pos.y, bl.pos.z, bl.done ? 1e8 : bl.frontR);
      U.uE1.value[i].set(D.cbrtW, D.Y4pi, bl.t, D.fbR);
      U.uE2.value[i].set(D.nuke ? 1 : bl.w.frag ? 2 : 0, D.craterR, D.scorchR, D.tpulse);
      const dy = bl.pos.y - Wd.groundY(bl.pos.x, bl.pos.z);
      const vit = D.nuke ? (D.ground ? D.fbR * 0.8 : D.fbR > dy ? Math.sqrt(D.fbR * D.fbR - dy * dy) * 0.9 : 0) : 0;
      U.uHob.value[i].set(dy, vit, 0, 0);
      if (i > maxSlot) maxSlot = i;
      // światło i błysk
      const t = bl.t;
      const env = t < D.tfb ? 1 : Math.exp(-(t - D.tfb) / (D.tfb * (D.nuke ? 2.5 : 1.2)));
      const age = t;
      if (age < D.tfb * 25) {
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
        const fl = Math.exp(-t / (D.tfb * 0.35)) * (bl.camD < D.radii.glass * 3 ? 1 : 0.5);
        flash = Math.max(flash, fl);
        glow = Math.max(glow, env * 1.5); glowPos = bl.pos;
      } else if (!D.nuke && t < D.tfb * 2 && D.Wtnt > 100) {
        flash = Math.max(flash, 0.12 * Math.exp(-t / (D.tfb * 0.5)));
      }
      // dźwięk i wstrząs, gdy czoło fali dotrze do kamery
      if (!bl.heard) {
        const dc = camPos.distanceTo(bl.pos);
        if (bl.frontR >= dc || (st.paused === false && ts > 0 && bl.t > Ph.arrival(D.front, dc) + 0.01)) {
          bl.heard = true;
          const mag = Ut.clamp((Math.log10(D.Wtnt) + 0.7) / 11.4, 0, 1);
          A.boom(mag, dc, 0);
          const p = Ph.overpressure(Math.max(dc, 0.5), D.cbrtW);
          K.shake = Math.max(K.shake, Ut.clamp(Math.log10(p + 1) / 2.2, 0.05, 1) * (D.nuke ? 1 : 0.6));
        }
      }
      // koniec aktywnej fazy
      const tEnd = D.nuke ? D.tRise * 9 : Math.max(30, D.tRise * 6);
      if (!bl.done && bl.t > tEnd && bl.evPtr >= bl.events.length) {
        bl.done = true;
        if (bl.fx) { for (const m of bl.fx.meshes) if (m.parent) Wd.scene.remove(m); }
      }
      // uniform czasu cieplnego musi zostać, zostawiamy slot
    }
    U.uNE.value = maxSlot + 1;
    if (st.blasts.some((b) => b.d.nuke)) U.uBlackout.value = Math.min(1, U.uBlackout.value + dtR * 2);

    C.update(dtA, dtSim, st.simNow);
    F.update(dtA, dtSim, Wd.camera);

    // kamera podąża za wybuchem
    if (st.follow && !K.userActive && !K.fly) {
      const fr = frameFor(st.follow, st.follow.t);
      if (fr.d > K.tDist) K.tDist = fr.d;
      const ty = Wd.groundY(st.follow.pos.x, st.follow.pos.z) + fr.ty;
      K.tTarget.y = Ut.lerp(K.tTarget.y, ty, 1 - Math.exp(-dtR * 2));
      K.tPhi = Ut.lerp(K.tPhi, fr.phi, 1 - Math.exp(-dtR));
      if (st.follow.done) st.follow = null;
    }
    K.update(dtR, Wd.camera);
    Wd.frame(K.viewDist || K.dist, K.target);

    // znacznik celu
    const md = Wd.camera.position.distanceTo(st.target.point);
    marker.position.copy(st.target.point);
    marker.scale.setScalar(Math.max(0.15, md * 0.018));
    marker.visible = !(st.delivery && !st.delivery.done) && !(st.follow && st.follow.t < 8);
    marker.rotation.y += dtR * 0.6;

    // błysk, ekspozycja, poświata nieba
    $('#flash').style.opacity = Math.min(0.97, flash).toFixed(3);
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
    if (A.setFire) A.setFire(C.burning.length ? Math.min(1, C.burning.length / 40) * Ut.clamp(300 / (K.dist + 1), 0.05, 1) : 0);

    Wd.renderer.render(Wd.scene, Wd.camera);

    uiT -= dtR;
    if (uiT <= 0) { uiT = 0.12; updateHud(); }
    updateLabels();
  }

  // ---------- INTERFEJS ----------
  function buildUI() {
    const list = $('#wlist');
    let html = '';
    for (const g of ['conv', 'nuke']) {
      html += `<div class="grp">${g === 'conv' ? 'Konwencjonalne' : 'Jądrowe'}</div>`;
      WEAP.filter((w) => w.group === g).forEach((w) => {
        const n = WEAP.indexOf(w) + 1;
        const kg = w.kt ? w.kt * 1e6 : w.tnt * (w.salvo || 1);
        html += `<button class="wpn ${g}" data-id="${w.id}"><span class="ic">${WEAP.icon(w)}</span><span class="nm">${w.short}</span><span class="yl">${Ut.tnt(w.kt ? w.kt * 1e6 : w.tnt)}${w.salvo ? ' ×' + w.salvo : ''}</span><kbd>${n <= 9 ? n : n === 10 ? 0 : ''}</kbd></button>`;
        void kg;
      });
    }
    list.innerHTML = html;
    list.addEventListener('click', (e) => { const b = e.target.closest('.wpn'); if (b) selectWeapon(WEAP.byId(b.dataset.id)); });
    $('#fire').addEventListener('click', fire);
    $('#bRings').addEventListener('click', () => { st.rings = !st.rings; $('#bRings').classList.toggle('on', st.rings); if (st.rings && ringAlphaT === 0) ringAlphaT = 0.9; });
    $('#bFilm').addEventListener('click', () => { st.film = !st.film; $('#bFilm').classList.toggle('on', st.film); });
    $('#bSound').addEventListener('click', () => { A.init(); const on = A.toggle(); $('#bSound').classList.toggle('on', on); $('#bSound').querySelector('.ti').textContent = on ? '🔊' : '🔇'; });
    $('#bReset').addEventListener('click', resetCity);
    const times = ['day', 'dusk', 'night'], tnames = { day: ['☀️', 'Dzień'], dusk: ['🌇', 'Zmierzch'], night: ['🌙', 'Noc'] };
    $('#bTime').addEventListener('click', () => {
      const n = times[(times.indexOf(Wd.timeName) + 1) % 3];
      Wd.setTime(n);
      $('#bTime').innerHTML = `<span class="ti">${tnames[n][0]}</span><span class="tl">${tnames[n][1]}</span>`;
    });
    $('#bHelp').addEventListener('click', () => { $('#help').hidden = false; });
    $('#helpClose').addEventListener('click', () => { $('#help').hidden = true; });
    $('#introGo').addEventListener('click', () => { A.init(); $('#intro').hidden = true; });
    $('#bPanel').addEventListener('click', () => document.body.classList.toggle('fx-open'));
    document.querySelectorAll('#speeds button').forEach((b) => b.addEventListener('click', () => setSpeed(b.dataset.s)));
    $('#card').addEventListener('click', (e) => {
      const b = e.target.closest('[data-burst]');
      if (!b) return;
      st.ground = b.dataset.burst === 'ground';
      renderCard();
      const D = deriveFor(st.weapon);
      showRings(st.target.point, D, true); renderEffects(D, true); setRingsAlpha(1);
    });
    // podgląd skutków pod kursorem
    Wd.renderer.domElement.addEventListener('pointermove', (e) => { hoverT = performance.now(); hover(e); });
    Wd.renderer.domElement.addEventListener('pointerleave', () => { $('#tip').hidden = true; });
    window.addEventListener('keydown', onKey);
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
    if (e.target.tagName === 'INPUT') return;
    if (!$('#intro').hidden) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#introGo').click(); } return; }
    const k = e.key;
    if (k >= '1' && k <= '9') { const w = WEAP[parseInt(k, 10) - 1]; if (w) selectWeapon(w); }
    else if (k === '0') selectWeapon(WEAP[9]);
    else if (k === '-') selectWeapon(WEAP[10]);
    else if (k === '=') selectWeapon(WEAP[11]);
    else if (k === ' ' || k === 'Enter') { e.preventDefault(); fire(); }
    else if (k === 'p' || k === 'P') setSpeed('pause');
    else if (k === 'r' || k === 'R') $('#bRings').click();
    else if (k === 'f' || k === 'F') $('#bFilm').click();
    else if (k === 't' || k === 'T') $('#bTime').click();
    else if (k === 'Backspace' || k === 'Delete') resetCity();
    else if (k === 'Escape') { $('#help').hidden = true; }
  }

  function resetCity() {
    for (const bl of st.blasts) F.removeBlast(bl);
    st.blasts = []; st.lastBlast = null; st.follow = null;
    if (st.delivery) { st.delivery.done = true; }
    if (st.lastTank) { st.lastTank(); st.lastTank = null; }
    F.clear();
    C.reset();
    const U = SH.uniforms;
    for (let i = 0; i < SH.MAXE; i++) { U.uE1.value[i].z = -1; U.uE2.value[i].set(0, 0, 0, 1); }
    U.uNE.value = 0; U.uBlackout.value = 0;
    $('#fire').classList.remove('busy');
    const D = deriveFor(st.weapon);
    showRings(st.target.point, D, true); renderEffects(D, true); setRingsAlpha(1);
    toast('Miasto odbudowane');
  }
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('show'), 1800); }

  function renderCard() {
    const w = st.weapon;
    const kg = w.kt ? w.kt * 1e6 : w.tnt;
    const total = kg * (w.salvo || 1);
    const dyn = total / 0.2;
    const hiro = total / 15e6;
    let cmp = '';
    if (w.id !== 'dynamit') cmp = `= <b>${Ut.bigCount(dyn)}</b> ${Ut.plural(dyn, 'laska', 'laski', 'lasek')} dynamitu`;
    if (total >= 1e5 && w.id !== 'littleboy') cmp += `<br>= <b>${hiro >= 1 ? Ut.num(hiro, hiro < 10 ? 1 : 0) + '×' : Ut.num(hiro * 100, hiro < 0.01 ? 2 : 1) + '%'}</b> bomby z Hiroszimy`;
    let burst = '';
    if (w.kt) {
      burst = `<div class="burst"><button data-burst="air" class="${!st.ground ? 'on' : ''}">W powietrzu · ${Ut.dist(w.hob)}</button><button data-burst="ground" class="${st.ground ? 'on' : ''}">Przy ziemi</button></div>
      <p class="bnote">${st.ground ? 'Wybuch przy ziemi: mniejszy zasięg fali, ale krater i opad promieniotwórczy z wiatrem.' : 'Wysokość wybuchu dobrana tak jak w rzeczywistości, by fala zniszczyła jak największy obszar.'}</p>`;
    }
    $('#card').innerHTML = `
      <div class="ch"><span class="ic big">${WEAP.icon(w)}</span><div><small>${w.group === 'nuke' ? 'Broń jądrowa' : 'Broń konwencjonalna'}</small><h3>${w.name}</h3></div></div>
      <div class="yield"><span>Równoważnik trotylu</span><b>${Ut.tnt(kg)}${w.salvo ? ' × ' + w.salvo : ''}</b></div>
      <div class="cmp">${cmp}</div>
      <p class="desc">${w.desc}</p>
      <dl>${w.facts.map((f) => `<dt>${f[0]}</dt><dd>${f[1]}</dd>`).join('')}</dl>
      ${burst}`;
  }

  function renderEffects(D, preview) {
    const ex = C.exposure(st.target.point, D);
    let h = `<div class="rings">`;
    for (const r of ringList) h += `<div class="ring"><i style="background:${r.col}"></i><span>${r.name}</span><b>${Ut.dist(r.R)}</b></div>`;
    h += `</div>`;
    if (D.nuke) h += `<div class="mini">Kula ognia: <b>${Ut.dist(D.fbR * 2)}</b> średnicy · grzyb do <b>${Ut.dist(D.Htop)}</b></div>`;
    else h += `<div class="mini">Kula ognia: <b>${Ut.dist(D.fbR * 2)}</b> średnicy${D.craterR ? ` · lej: <b>${Ut.dist(D.craterR * 2)}</b>` : ''}</div>`;
    if (D.fallout) h += `<div class="mini warn">Opad promieniotwórczy z wiatrem: ok. <b>${Ut.dist(D.fallout.len)}</b></div>`;
    if (preview) h += `<div class="mini">W strefie zawaleń (35 kPa) w tym miejscu: <b>${Ut.num(ex.bld, 0)}</b> ${Ut.plural(ex.bld, 'budynek', 'budynki', 'budynków')}, ok. <b>${Ut.bigCount(ex.pop)}</b> ${Ut.plural(ex.pop, 'osoba', 'osoby', 'osób')}</div>`;
    $('#effects .rbody').innerHTML = h;
  }

  function updateHud() {
    const bl = st.lastBlast;
    // zegar i tempo
    $('#clock').textContent = bl ? 'T+ ' + Ut.time(Math.max(0, bl.t)) : st.delivery && !st.delivery.done ? 'Lot pocisku…' : 'Gotowy';
    const ts = st.ts || 0;
    $('#tsv').textContent = st.paused ? 'pauza' : (ts < 1 ? Ut.num(ts, ts < 0.1 ? 3 : 2) : Ut.num(ts, ts < 10 ? 1 : 0)) + '×' + (ts < 0.98 ? ' zwolnione tempo' : ts > 1.05 ? ' przyspieszone' : ' czas rzeczywisty');
    const rep = $('#report');
    if (!bl) { rep.hidden = true; return; }
    rep.hidden = false;
    const group = bl.group || [bl];
    const S = { destroyed: 0, damaged: 0, light: 0, glass: 0, fires: 0, cars: 0, dead: 0, inj: 0, trees: 0 };
    for (const b of group) {
      for (const k in S) if (b.stats[k] !== undefined) S[k] += b.stats[k];
      if (b.t > Ph.arrival(b.d.front, b.d.radii.moderate * 2 + b.d.hob)) S.trees += b.stats.treesTotal;
    }
    const D = bl.d;
    const Rg = Math.sqrt(Math.max(0, bl.frontR * bl.frontR - (bl.pos.y - Wd.groundY(bl.pos.x, bl.pos.z)) ** 2));
    const pf = bl.frontP;
    const row = (l, v, cls) => `<div class="rr ${cls || ''}"><span>${l}</span><b>${v}</b></div>`;
    rep.innerHTML = `<h4>Raport · ${bl.w.short}${group.length > 1 ? ' (' + group.length + ')' : ''}</h4>
      ${pf > 0.8 ? row('Fala uderzeniowa', Ut.dist(Rg) + ' · ' + Ut.pressure(pf)) : row('Fala uderzeniowa', 'wygasła')}
      ${row('Budynki zawalone', Ut.num(S.destroyed, 0), 'red')}
      ${row('Poważnie uszkodzone', Ut.num(S.damaged, 0), 'org')}
      ${row('Lekko uszkodzone', Ut.num(S.light, 0))}
      ${row('Budynki z wybitymi szybami', Ut.num(S.glass, 0), 'blu')}
      ${row('Pożary', Ut.num(S.fires, 0), 'org')}
      ${row('Powalone drzewa', Ut.num(S.trees, 0))}
      ${row('Samochody zniszczone', Ut.num(S.cars, 0))}
      ${row('Ofiary śmiertelne (szac.)', Ut.bigCount(S.dead), 'red')}
      ${row('Ranni (szac.)', Ut.bigCount(S.inj), 'org')}
      <p class="fine">Szacunek dla ludzi w budynkach makiety (ok. ${Ut.bigCount(C.totalPop)} mieszkańców), bez opadu i skutków późniejszych.</p>`;
  }

  // Etykiety pierścieni w 3D
  function updateLabels() {
    const box = $('#labels');
    if (!st.rings || ringAlpha < 0.05 || !ringList.length) { if (box.childElementCount) box.innerHTML = ''; return; }
    const cam = Wd.camera;
    const right = new T.Vector3().setFromMatrixColumn(cam.matrixWorld, 0); right.y = 0; right.normalize();
    const w = window.innerWidth, h = window.innerHeight;
    while (box.childElementCount < ringList.length) box.appendChild(document.createElement('div'));
    while (box.childElementCount > ringList.length) box.lastChild.remove();
    let lastY = -1e9;
    ringList.forEach((r, i) => {
      const el = box.children[i];
      const p = ringCenter.clone().addScaledVector(right, r.R);
      p.y = Wd.groundY(p.x, p.z);
      const s = p.project(cam);
      const x = (s.x * 0.5 + 0.5) * w, y = (-s.y * 0.5 + 0.5) * h;
      const vis = s.z < 1 && x > 0 && x < w && y > 0 && y < h && Math.abs(y - lastY) > 16;
      el.className = 'lbl';
      el.style.display = vis ? '' : 'none';
      if (vis) {
        lastY = y;
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
        el.style.opacity = ringAlpha.toFixed(2);
        el.style.borderColor = r.col;
        el.innerHTML = `<i style="background:${r.col}"></i>${r.name.split(' · ')[0]} <b>${Ut.dist(r.R)}</b>`;
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
      const r = Wd.renderer.domElement.getBoundingClientRect();
      const ndc = new T.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      const ray = new T.Raycaster(); ray.setFromCamera(ndc, Wd.camera);
      const o = ray.ray.origin, d = ray.ray.direction;
      const tip = $('#tip');
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
      const q = Ph.thermal(Math.max(sl, 1), D.Y4pi);
      let fx = pr > 140 ? 'zniszczone nawet budynki żelbetowe' : pr > 35 ? 'większość budynków się zawala' : pr > 14 ? 'domy zniszczone, bloki poważnie uszkodzone' : pr > 7 ? 'zerwane dachy, popękane ściany' : pr > 3 ? 'wybite szyby, latające szkło' : pr > 1 ? 'pojedyncze pęknięte szyby' : 'fala niegroźna';
      if (D.nuke && sl < D.fbR) fx = 'wnętrze kuli ognia, wszystko odparowuje';
      let th = '';
      if (D.nuke) th = q > D.ignite ? ' · zapłon budynków i drzew' : q > D.burn3 ? ' · oparzenia III stopnia' : q > Ph.TH.burn1 ? ' · oparzenia skóry' : '';
      const at = Ph.arrival(D.front, sl);
      tip.hidden = false;
      tip.style.transform = `translate(${ev.clientX + 16}px, ${ev.clientY + 14}px)`;
      tip.innerHTML = `<b>${Ut.dist(dist)}</b> od epicentrum<br>nadciśnienie <b>${Ut.pressure(pr)}</b> · fala po <b>${Ut.time(at)}</b><br><span>${fx}${th}</span>`;
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    try { boot(); }
    catch (err) {
      console.error(err);
      $('#loading').textContent = 'Nie udało się uruchomić grafiki 3D (WebGL). Spróbuj w Chrome, Edge albo Firefoksie.';
    }
  });
})();
