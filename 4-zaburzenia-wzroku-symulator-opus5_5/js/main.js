/* main.js – stan aplikacji, źródła obrazu (sceny, kamera, zdjęcie), wzrok, pętla renderowania. */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const COND = new Map(CONDITIONS.map(c => [c.id, c]));
  const SCENE_LIST = (window.SCENES || []).slice();
  const SCENE_ORDER = ['ulica-dzien', 'ulica-noc', 'targ', 'gabinet', 'tablice'];
  SCENE_LIST.sort((a, b) => (SCENE_ORDER.indexOf(a.id) + 99) % 99 - (SCENE_ORDER.indexOf(b.id) + 99) % 99);
  const SOURCES = {
    camera: { id: 'camera', name: 'Kamera', icon: '📷', fovDeg: 60, pupilMm: 4, night: false, desc: 'Obraz z twojej kamery.' },
    photo: { id: 'photo', name: 'Twoje zdjęcie', icon: '🖼️', fovDeg: 55, pupilMm: 3.5, night: false, desc: 'Dowolne zdjęcie z twojego komputera lub telefonu.' }
  };

  /* ---------------- stan ---------------- */
  const S = {
    mode: 'sim',
    sceneId: (SCENE_LIST[0] || {}).id,
    source: 'scene',
    srcDist: 1,
    selected: 'myopia',
    active: [],
    combine: false,
    compare: false,
    split: 0.5,
    autoLook: true,
    fieldStyle: 0,
    holdHealthy: false,
    store: {}
  };

  function paramsFor(id) {
    if (!S.store[id]) {
      const c = COND.get(id), p = {};
      for (const d of c.params) p[d.k] = d.def;
      S.store[id] = { params: p, corrected: false };
    }
    return S.store[id];
  }
  function activeEntries() {
    return S.active.map(id => ({ cond: COND.get(id), params: paramsFor(id).params, corrected: paramsFor(id).corrected }));
  }

  /* ---------------- grafika ---------------- */
  const viewer = $('viewer'), canvas = $('view');
  let R;
  try { R = new VisionRenderer(canvas); }
  catch (e) {
    console.error(e);
    const m = $('viewer-msg');
    m.hidden = false;
    m.innerHTML = '<div><b>Twoja przeglądarka nie obsługuje WebGL2</b>Symulacja potrzebuje grafiki 3D w przeglądarce. Spróbuj aktualnego Chrome, Edge, Firefoksa lub Safari i sprawdź, czy przyspieszenie sprzętowe jest włączone.</div>';
  }
  const colorCv = document.createElement('canvas');
  const dataCv = document.createElement('canvas');
  const P = new Painter(colorCv, dataCv);
  let sceneVersion = 0, sceneW = 0, sceneH = 0;
  let coverScale = [1, 1];
  const video = $('video');
  let camStream = null, photoImg = null;

  function sceneMeta() {
    if (S.source !== 'scene') return SOURCES[S.source];
    return SCENE_LIST.find(s => s.id === S.sceneId) || SCENE_LIST[0];
  }
  function isUniform() { return S.source !== 'scene'; }

  function wantedSceneWidth() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = viewer.clientWidth, h = viewer.clientHeight;
    const need = Math.max(w, h * 16 / 9) * dpr;
    const cap = S.source === 'camera' ? 1280 : 1920;
    return Math.round(clamp(need, 960, cap) / 16) * 16;
  }

  function drawScene() {
    const W = wantedSceneWidth(), H = Math.round(W * 9 / 16);
    sceneW = W; sceneH = H;
    P.begin(W, H);
    if (S.source === 'scene') {
      const sc = sceneMeta();
      try { sc.draw(P, W, H, {}); }
      catch (e) { console.error('Scena ' + sc.id, e); }
      P.finish();
    } else {
      drawSourceImage();
      P.fillUniform(S.srcDist, S.source === 'camera' ? 'Obraz z kamery' : 'Twoje zdjęcie');
      P.finish();
    }
    if (R) R.upload(colorCv, dataCv);
    sceneVersion++;
    lastOpticsKey = '';
    UI.onSceneDrawn();
  }

  function drawSourceImage() {
    const c = P.c, W = sceneW, H = sceneH;
    c.fillStyle = '#111'; c.fillRect(0, 0, W, H);
    const img = S.source === 'camera' ? video : photoImg;
    if (!img) return;
    const iw = img.videoWidth || img.naturalWidth || img.width, ih = img.videoHeight || img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const s = Math.max(W / iw, H / ih);
    const dw = iw * s, dh = ih * s;
    c.save();
    if (S.source === 'camera') { c.translate(W, 0); c.scale(-1, 1); }
    c.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    c.restore();
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.round(viewer.clientWidth * dpr)), h = Math.max(2, Math.round(viewer.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const va = w / h, sa = 16 / 9;
    coverScale = va > sa ? [1, sa / va] : [va / sa, 1];
    const want = wantedSceneWidth();
    if (!sceneW || Math.abs(want - sceneW) / sceneW > 0.12) drawScene();
    UI.placeQuiz();
  }
  let resizeT = 0;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 120); });

  /* ---------------- wzrok (kursor / autorozglądanie) ---------------- */
  const G = {
    u: 0.5, v: 0.45, tu: 0.5, tv: 0.45,
    pointer: false, lastPointer: -10, poiIdx: 0, poiT: 0,
    fu: 0.5, fv: 0.45, fvu: 0, fvv: 0       // męty – opóźnione za wzrokiem
  };
  function screenToScene(clientX, clientY) {
    const r = viewer.getBoundingClientRect();
    const sx = (clientX - r.left) / r.width, sy = (clientY - r.top) / r.height;
    const gx = (sx - 0.5) * coverScale[0] + 0.5;
    const gy = ((1 - sy) - 0.5) * coverScale[1] + 0.5;
    return [clamp(gx, 0, 1), clamp(1 - gy, 0, 1)];
  }
  function sceneToScreen(u, v) {
    const gx = (u - 0.5) / coverScale[0] + 0.5;
    const gy = ((1 - v) - 0.5) / coverScale[1] + 0.5;
    return [gx, 1 - gy];
  }
  let splitDrag = false;
  viewer.addEventListener('pointermove', e => {
    if (splitDrag) return;
    if (e.pointerType === 'touch' && e.buttons === 0) return;
    const [u, v] = screenToScene(e.clientX, e.clientY);
    G.tu = u; G.tv = v; G.u = u; G.v = v;
    G.pointer = true; G.lastPointer = performance.now() / 1000;
  });
  viewer.addEventListener('pointerdown', e => {
    if (e.target.closest('.quiz, .split-knob, .chip')) return;
    const [u, v] = screenToScene(e.clientX, e.clientY);
    G.tu = u; G.tv = v; G.u = u; G.v = v;
    G.pointer = true; G.lastPointer = performance.now() / 1000;
  });
  viewer.addEventListener('pointerleave', () => { G.pointer = false; });
  viewer.addEventListener('pointerup', e => { if (e.pointerType === 'touch') G.pointer = false; });

  function updateGaze(t, dt) {
    const meta = sceneMeta();
    const idle = !G.pointer && t - G.lastPointer > 1.3;
    if (idle && S.autoLook) {
      const pois = S.source === 'scene' ? (meta.pois || []) : [];
      if (t > G.poiT) {
        if (pois.length) {
          G.poiIdx = (G.poiIdx + 1) % pois.length;
          const p = pois[G.poiIdx];
          G.tu = p.u; G.tv = p.v;
        } else {
          G.tu = 0.5 + (Math.random() - 0.5) * 0.4; G.tv = 0.5 + (Math.random() - 0.5) * 0.3;
        }
        G.poiT = t + 2.8;
      }
      const k = 1 - Math.exp(-dt / 0.06);
      G.u += (G.tu - G.u) * k; G.v += (G.tv - G.v) * k;
    } else if (idle && !S.autoLook) {
      const d = meta.defaultGaze || [0.5, 0.45];
      G.tu = d[0]; G.tv = d[1];
      const k = 1 - Math.exp(-dt / 0.06);
      G.u += (G.tu - G.u) * k; G.v += (G.tv - G.v) * k;
    }
    // męty: sprężyna z niedotłumieniem – dryfują dalej po zatrzymaniu wzroku
    const ax = (G.u - G.fu) * 26 - G.fvu * 2.6, ay = (G.v - G.fv) * 26 - G.fvv * 2.6 + 0.004;
    G.fvu += ax * dt; G.fvv += ay * dt;
    G.fu += G.fvu * dt; G.fv += G.fvv * dt;
    const ring = $('gaze');
    const showRing = idle && S.mode !== 'about';
    ring.classList.toggle('on', showRing);
    if (showRing) {
      const [sx, sy] = sceneToScreen(G.u, G.v);
      ring.style.left = (sx * 100) + '%'; ring.style.top = (sy * 100) + '%';
    }
  }

  /* ---------------- mrugnięcia, błyski, aura ---------------- */
  const FX = { blinkStart: -10, blinkEnd: 0, flash: 0, flashPos: [0, 0], nextFlash: 2, auraT: 0 };
  function blink() { const t = performance.now() / 1000; if (t - FX.blinkStart > 0.3) FX.blinkStart = t; }
  function lidValue(t) {
    const x = t - FX.blinkStart;
    if (x < 0 || x > 0.26) return 0;
    if (x < 0.09) return x / 0.09;
    if (x < 0.13) { FX.blinkEnd = FX.blinkStart + 0.13; return 1; }
    return 1 - (x - 0.13) / 0.13;
  }

  /* ---------------- pętla ---------------- */
  const eye = new Sim.Eye(), eyeH = new Sim.Eye();
  const healthyV = Sim.baseVision();
  let lastOpticsKey = '', lastHealthyKey = '';
  let lastT = performance.now() / 1000;
  let hudT = 0, diagT = 0;
  const live = { V: healthyV, target: null, focus: 0, visus: 1 };
  let slowFrames = 0, fastFrames = 0;

  function keyOf(u) {
    let s = '';
    for (const k in u) { const v = u[k]; s += k + (Array.isArray(v) ? v.map(x => x.toFixed(5)).join(',') : (typeof v === 'number' ? v.toFixed(5) : v)) + ';'; }
    return s;
  }

  function frame() {
    requestAnimationFrame(frame);
    const t = performance.now() / 1000;
    const dt = Math.min(0.1, Math.max(0.001, t - lastT));
    lastT = t;
    if (!R || !sceneW) return;

    if (S.source === 'camera' && video.readyState >= 2) {
      drawSourceImage();
      R.upload(colorCv, null);
    }

    updateGaze(t, dt);
    const meta = sceneMeta();
    const lid = lidValue(t);
    const blinkAge = lid > 0 ? 0 : Math.max(0, t - Math.max(FX.blinkEnd, FX.blinkStart + 0.26));
    const ctx = { night: !!meta.night, t, blinkAge };
    const entries = activeEntries();
    const V = Sim.compose(entries, ctx);
    live.V = V;
    if (V.autoBlink && blinkAge > 5.5) blink();

    const smp = P.sample(G.u, G.v);
    const uniformD = isUniform() ? 1 / S.srcDist : -1;
    const targetD = isUniform() ? 1 / S.srcDist : smp.diopters;
    live.target = isUniform() ? { name: S.source === 'camera' ? 'Obraz z kamery' : 'Twoje zdjęcie', dist: S.srcDist } : { name: smp.name, dist: smp.dist };
    live.targetD = targetD;
    eye.update(V, targetD, dt);
    eyeH.update(healthyV, targetD, dt);
    live.focus = eye.focus; live.effort = eye.effort; live.accom = eye.accom;
    const nearD = isUniform() ? uniformD : (P.maxDiopters || 3);
    const defocus = Math.abs(targetD - eye.focus) + V.cyl / 2 + V.baseD + V.ghostD * V.ghostW + V.comaD * 0.3;
    live.visus = Sim.visus(defocus, meta.pupilMm * V.pupilMul, V.visusCap);

    // optyka – przeliczana tylko, gdy coś się zmieniło (albo przy kamerze)
    const t0 = performance.now();
    let heavy = false;
    const ou = Sim.opticsUniforms(V, eye.focus, meta, nearD, uniformD, false);
    const key = keyOf(ou) + sceneVersion;
    if (key !== lastOpticsKey || S.source === 'camera') {
      R.renderOptics('opt', ou); lastOpticsKey = key; heavy = true;
    }
    const showHealthy = S.compare || S.holdHealthy;
    if (showHealthy) {
      const hu = Sim.opticsUniforms(healthyV, eyeH.focus, meta, nearD, uniformD, true);
      const hk = keyOf(hu) + sceneVersion;
      if (hk !== lastHealthyKey || S.source === 'camera') { R.renderOptics('healthy', hu); lastHealthyKey = hk; heavy = true; }
    }

    // ruchy oczu (oczopląs)
    let shake = [0, 0];
    if (V.shakeAmp > 0) {
      const f = V.shakeFreq, a = V.shakeAmp / 2;
      let x;
      if (V.shakeKind === 'jerk') { const ph = (t * f) % 1; x = ph < 0.82 ? -a + 2 * a * (ph / 0.82) : a - 2 * a * ((ph - 0.82) / 0.18); }
      else x = a * Math.sin(t * f * Math.PI * 2);
      shake = [x / meta.fovDeg, 0.15 * a * Math.sin(t * f * 4.1) / (meta.fovDeg * 9 / 16)];
    }
    // błyski przy odwarstwieniu
    if (V.flashes && t > FX.nextFlash) {
      FX.flash = 1; const ang = Math.random() * Math.PI * 2, r = 14 + Math.random() * 14;
      FX.flashPos = [Math.cos(ang) * r, Math.sin(ang) * r];
      FX.nextFlash = t + 1.2 + Math.random() * 3;
    }
    FX.flash *= Math.exp(-dt / 0.09);
    // aura: ~25 s przebiegu i chwila przerwy
    let auraPhase = 0;
    if (V.aura) { FX.auraT += dt * (V.auraSpeed || 1); const c = FX.auraT % 30; auraPhase = c < 25 ? c / 25 : 0; }
    else FX.auraT = 0;

    const fov = meta.fovDeg, aspect = sceneW / sceneH;
    const split = S.holdHealthy ? 2 : (S.compare ? S.split : -1);
    R.renderFinal({
      uCoverScale: coverScale, uCoverOff: [0, 0], uFov: fov, uTime: t % 1000, uSplit: split,
      uGaze: [G.u, 1 - G.v], uFloatGaze: [G.fu, 1 - G.fv], uShake: shake,
      uDipOff: [V.dipDeg[0] / fov, -V.dipDeg[1] / (fov / aspect)], uDipMix: V.dipMix,
      uScatter: Math.min(0.9, V.scatter), uVeil: V.veil, uExposure: V.exposure, uNightBlind: Math.min(1, V.nightBlind),
      uDesat: Math.min(1, V.desat), uContrast: Math.min(0.8, V.contrast), uTint: V.tint,
      uCvd: Sim.cvdMatrix(V.cvd, V.cvdSev), uMono: V.mono,
      uFieldStyle: S.fieldStyle, uGlaucoma: V.glaucoma, uTunnel: V.tunnel, uHemi: V.hemi, uHemiAmt: V.hemiAmt,
      uScotoma: V.scotoma, uMetamorph: V.metamorph, uDetach: V.detach, uDR: V.dr, uEdema: V.edema,
      uFloaters: Math.min(1, V.floaters), uSnow: V.snow, uAura: V.aura, uAuraPhase: auraPhase, uWarp: V.warp,
      uLid: lid, uSquint: V.squint, uFieldDim: V.fieldDim, uFlash: [FX.flashPos[0], FX.flashPos[1], V.flashes ? FX.flash : 0],
      uHealthyScatter: 0.025
    });

    // adaptacja jakości: jeśli przeliczanie optyki jest za wolne, mniej próbek
    if (heavy) {
      const ms = performance.now() - t0;
      if (dt > 0.045 && ms > 4) { if (++slowFrames > 4) { R.maxN = Math.max(40, Math.round(R.maxN * 0.8)); slowFrames = 0; } }
      else if (dt < 0.02) { if (++fastFrames > 90) { R.maxN = Math.min(160, R.maxN + 10); fastFrames = 0; } }
    }

    if (t - hudT > 0.1) { hudT = t; UI.updateHud(live, meta); }
    if (t - diagT > 1 / 30) { diagT = t; UI.drawDiagram(live, t); }
  }

  /* ---------------- akcje ---------------- */
  function selectCondition(id) {
    if (S.mode === 'quiz') return;
    if (id === 'healthy') { S.active = []; S.selected = 'healthy'; }
    else if (S.combine) {
      const i = S.active.indexOf(id);
      if (i >= 0 && S.selected === id) { S.active.splice(i, 1); S.selected = S.active[S.active.length - 1] || 'healthy'; }
      else { if (i < 0) S.active.push(id); S.selected = id; }
    } else { S.active = [id]; S.selected = id; }
    paramsFor(S.selected === 'healthy' ? 'healthy' : S.selected);
    FX.auraT = 0;
    UI.refresh();
    saveHash();
  }
  function removeCondition(id) {
    S.active = S.active.filter(x => x !== id);
    if (S.selected === id) S.selected = S.active[S.active.length - 1] || 'healthy';
    UI.refresh(); saveHash();
  }
  function setParam(id, k, v) { paramsFor(id).params[k] = v; UI.refreshDynamic(); saveHash(); }
  function toggleCorrection(id) {
    id = id || S.selected;
    const c = COND.get(id);
    if (!c || !c.correction || !S.active.includes(id)) return;
    const st = paramsFor(id);
    st.corrected = !st.corrected;
    if (st.corrected && id === 'cataract') UI.toast('Sztuczna soczewka po operacji nie akomoduje, więc do czytania potrzebne są okulary. Spójrz na coś z bliska.', 5200);
    if (st.corrected && id === 'presbyopia') UI.toast('Okulary do czytania wyostrzają bliż, ale rozmywają dal. Spójrz daleko.', 4200);
    UI.refresh(); saveHash();
  }
  function setCombine(on) {
    S.combine = on;
    if (!on && S.active.length > 1) S.active = S.selected !== 'healthy' ? [S.selected] : [];
    UI.refresh();
  }
  function setScene(id) {
    if (id === 'camera') return startCamera();
    if (id === 'photo') return pickPhoto();
    stopCamera();
    S.source = 'scene'; S.sceneId = id;
    G.poiT = 0; G.poiIdx = -1;
    drawScene(); UI.refresh(); saveHash();
  }
  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { UI.toast('Ta przeglądarka nie daje dostępu do kamery.'); return; }
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
      video.srcObject = camStream;
      await video.play();
      S.source = 'camera'; S.srcDist = 0.6;
      UI.syncSrcDist();
      drawScene(); UI.refresh();
    } catch (e) {
      console.warn(e);
      UI.toast('Nie udało się włączyć kamery. Sprawdź uprawnienia przeglądarki.', 4200);
    }
  }
  function stopCamera() {
    if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; video.srcObject = null; }
  }
  function pickPhoto() { $('file').click(); }
  function loadPhoto(file) {
    if (!file || !/^image\//.test(file.type)) { UI.toast('To nie wygląda na obraz.'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      stopCamera();
      photoImg = img; S.source = 'photo';
      if (S.srcDist < 1) S.srcDist = 4;
      UI.syncSrcDist();
      drawScene(); UI.refresh();
    };
    img.onerror = () => UI.toast('Nie udało się wczytać obrazu.');
    img.src = url;
  }
  function setSrcDist(d) {
    S.srcDist = d;
    P.fillUniform(d, S.source === 'camera' ? 'Obraz z kamery' : 'Twoje zdjęcie');
    P.finish();
    if (R) R.upload(colorCv, dataCv);
    lastOpticsKey = '';
    UI.syncSrcDist();
  }

  $('file').addEventListener('change', e => { loadPhoto(e.target.files[0]); e.target.value = ''; });
  viewer.addEventListener('dragover', e => { e.preventDefault(); $('drop').hidden = false; });
  viewer.addEventListener('dragleave', () => { $('drop').hidden = true; });
  viewer.addEventListener('drop', e => { e.preventDefault(); $('drop').hidden = true; loadPhoto(e.dataTransfer.files[0]); });

  /* ---------------- porównanie ---------------- */
  const splitKnob = $('split-knob');
  splitKnob.addEventListener('pointerdown', e => { splitDrag = true; splitKnob.setPointerCapture(e.pointerId); e.preventDefault(); });
  splitKnob.addEventListener('pointermove', e => {
    if (!splitDrag) return;
    const r = viewer.getBoundingClientRect();
    S.split = clamp((e.clientX - r.left) / r.width, 0.04, 0.96);
    UI.placeSplit();
  });
  splitKnob.addEventListener('pointerup', () => { splitDrag = false; });
  function setCompare(on) { S.compare = on; lastHealthyKey = ''; UI.refresh(); }

  /* ---------------- klawiatura ---------------- */
  window.addEventListener('keydown', e => {
    if (e.target.matches('input[type=search], input[type=text]')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); blink(); }
    else if (k === 'c') setCompare(!S.compare);
    else if (k === 'k') toggleCorrection();
    else if (k === 'h') { if (!S.holdHealthy) { S.holdHealthy = true; lastHealthyKey = ''; } }
    else if (k === 'f') toggleFullscreen();
    else if (k === 'escape') UI.closeModals();
    else if (/^[1-9]$/.test(k)) { const list = UI.sceneButtons(); const b = list[+k - 1]; if (b && S.mode !== 'quiz') setScene(b.id); }
    else if ((k === 'arrowdown' || k === 'arrowup') && S.mode === 'sim' && !e.target.matches('input[type=range]')) {
      e.preventDefault();
      const ids = UI.visibleConditionIds();
      const i = ids.indexOf(S.selected);
      const n = ids[clamp(i + (k === 'arrowdown' ? 1 : -1), 0, ids.length - 1)];
      if (n && n !== S.selected) selectCondition(n);
    }
  });
  window.addEventListener('keyup', e => { if (e.key.toLowerCase() === 'h') S.holdHealthy = false; });

  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) (el.requestFullscreen || el.webkitRequestFullscreen || (() => {})).call(el);
    else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  }

  /* ---------------- adres (link do konkretnego widoku) ---------------- */
  function saveHash() {
    if (S.mode === 'quiz') return;
    const parts = [];
    if (S.active.length) parts.push('z=' + S.active.join('+'));
    if (S.source === 'scene') parts.push('s=' + S.sceneId);
    for (const id of S.active) {
      const st = paramsFor(id);
      const ps = Object.keys(st.params).map(k => k + ':' + st.params[k]).join(',');
      if (ps) parts.push(id + '=' + ps);
      if (st.corrected) parts.push(id + '-k=1');
    }
    try { history.replaceState(null, '', '#' + parts.join('&')); } catch (e) { /* file:// w niektórych przeglądarkach */ }
  }
  function loadHash() {
    const h = location.hash.slice(1);
    if (!h) return false;
    const q = {};
    h.split('&').forEach(p => { const i = p.indexOf('='); if (i > 0) q[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)); });
    if (q.s && SCENE_LIST.some(s => s.id === q.s)) S.sceneId = q.s;
    if (q.z) {
      const ids = q.z.split('+').filter(id => COND.has(id) && id !== 'healthy');
      if (!ids.length) { S.active = []; S.selected = 'healthy'; }
      for (const id of ids) {
        const st = paramsFor(id);
        if (q[id]) q[id].split(',').forEach(kv => {
          const [k, v] = kv.split(':');
          const d = COND.get(id).params.find(x => x.k === k);
          if (d) st.params[k] = d.type === 'range' ? clamp(parseFloat(v), d.min, d.max) : (d.options.some(o => o.v === v) ? v : d.def);
        });
        if (q[id + '-k']) st.corrected = true;
      }
      if (ids.length) { S.active = ids; S.selected = ids[ids.length - 1]; S.combine = ids.length > 1; }
    }
    return true;
  }

  /* ---------------- start ---------------- */
  const App = {
    S, COND, SCENE_LIST, SOURCES, P, G,
    sceneMeta, isUniform, paramsFor, activeEntries,
    selectCondition, removeCondition, setParam, toggleCorrection, setCombine, setScene, setCompare, setSrcDist,
    blink, toggleFullscreen, pickPhoto, loadPhoto, screenToScene, sceneToScreen, saveHash,
    setAutoLook(on) { S.autoLook = on; UI.refresh(); },
    setFieldStyle(v) { S.fieldStyle = v; UI.refresh(); },
    setMode(m) { S.mode = m; UI.refresh(); },
    resetFx() { FX.auraT = 0; FX.blinkStart = -10; }
  };
  window.App = App;

  const fromHash = loadHash();
  if (!fromHash) { S.active = ['myopia']; S.selected = 'myopia'; paramsFor('myopia'); }
  UI.init(App);
  resize();
  if (!sceneW) drawScene();
  requestAnimationFrame(frame);
  // Czcionki z Google mogą dojść później – scena rysuje się czcionkami systemowymi, więc przerysowanie nie jest konieczne,
  // ale interfejs przeliczy rozmiary.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => resize());
})();
