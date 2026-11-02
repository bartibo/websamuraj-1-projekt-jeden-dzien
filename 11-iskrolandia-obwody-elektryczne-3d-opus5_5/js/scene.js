// Scena 3D: plansza, kamera, elementy, iskierki z klockami, wieże napięcia, efekty
window.Iskry = window.Iskry || {};
(function () {
  const T = THREE;
  const C = Iskry.circuit;
  const P = Iskry.pieces;
  const S = Iskry.scene = {};

  const PAL = [0xffe14d, 0xff9f1c, 0xff4d6d, 0xa970ff, 0x3db2ff, 0x2ecc71];
  S.PAL = PAL;

  let renderer, scene, camera, canvas, stageEl;
  let dpr = 1, frameNo = 0, shadowDirty = true, slowEma = 0, slowFrames = 0;
  let viewW = 1, viewH = 1; // rozmiar płótna w px CSS (zapamiętany, żeby nie czytać układu strony co klatkę)
  let boardMat, matMat, pegMesh;
  const objs = new Map();      // id -> { group, path, update, light, sig, world:{pts,cum,len}, offset, state }
  let results = null;
  let piecesRef = [];
  let sparks, sparkCount = 0;
  let stacks, studs;
  let showStacks = false, showSparks = true;
  const lights = [];
  const fx = [];
  let ghost = null, ghostType = null;
  let selRing, selId = null;
  const ray = new T.Raycaster();
  const plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  const tmpV = new T.Vector3(), tmpM = new T.Matrix4(), tmpQ = new T.Quaternion(), tmpS = new T.Vector3(), tmpC = new T.Color();

  const cam = { base: 0, theta: 0, phi: 0.78, zoom: 1, tTheta: 0, tPhi: 0.78, tZoom: 1, auto: false, target: new T.Vector3(0, 0, 0.1) };

  S.nodePos = function (n, out) {
    const { c, r } = C.cr(n);
    return (out || new T.Vector3()).set(c - (C.COLS - 1) / 2, 0, r - (C.ROWS - 1) / 2);
  };

  S.init = function (cv, stage) {
    canvas = cv; stageEl = stage;
    try {
      renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return false; }
    if (!renderer.getContext()) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false; // cienie przeliczane rzadziej (patrz S.render)
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.NoToneMapping;

    scene = new T.Scene();
    camera = new T.PerspectiveCamera(32, 1, 0.1, 200);
    ray.camera = camera;

    // otoczenie do odbić metalu
    const pm = new T.PMREMGenerator(renderer);
    const env = new T.Scene();
    const sky = new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.ShaderMaterial({
      side: T.BackSide,
      vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: 'varying vec3 p; void main(){ float h = normalize(p).y; vec3 c = mix(vec3(.18,.17,.2), vec3(.5,.5,.52), smoothstep(-.3,.6,h)); gl_FragColor = vec4(c,1.); }',
    }));
    env.add(sky);
    const lamp = new T.Mesh(new T.BoxGeometry(4, 0.3, 4), new T.MeshBasicMaterial({ color: 0xffffff }));
    lamp.position.set(0, 8, 0); env.add(lamp);
    const lamp2 = new T.Mesh(new T.BoxGeometry(0.3, 3, 5), new T.MeshBasicMaterial({ color: 0xbfd9ff }));
    lamp2.position.set(8, 3, 0); env.add(lamp2);
    scene.environment = pm.fromScene(env, 0.03).texture;
    scene.environmentIntensity = 0.8;

    scene.add(new T.HemisphereLight(0xffffff, 0x8f9fbf, 0.9));
    const sun = new T.DirectionalLight(0xfff4e2, 1.7);
    sun.position.set(4, 10, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -8; sc.right = 8; sc.top = 7; sc.bottom = -7; sc.near = 1; sc.far = 30;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 4;
    scene.add(sun);

    for (let i = 0; i < 4; i++) {
      const l = new T.PointLight(0xffc46b, 0, 3.5, 2);
      scene.add(l);
      lights.push(l);
    }

    buildBoard();
    buildInstanced();

    selRing = new T.Mesh(P.slab(1.08, 0.6, 0.01, 0.2, 0), new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8, depthWrite: false }));
    selRing.visible = false;
    selRing.renderOrder = 1;
    scene.add(selRing);

    S.resize();
    window.addEventListener('resize', S.resize);
    if (window.ResizeObserver) new ResizeObserver(() => S.resize()).observe(stageEl);
    return true;
  };

  function buildBoard() {
    const W = C.COLS - 1 + 1.5, D = C.ROWS - 1 + 1.5;
    boardMat = new T.MeshStandardMaterial({ color: 0x3d7bfd, roughness: 0.55 });
    const base = new T.Mesh(P.slab(W, D, 0.35, 0.5, 0.06), boardMat);
    base.position.y = -0.44;
    base.receiveShadow = true; base.castShadow = true;
    scene.add(base);
    matMat = new T.MeshStandardMaterial({ color: 0xeaf2ff, roughness: 0.85 });
    const mat = new T.Mesh(P.slab(W - 0.45, D - 0.45, 0.01, 0.3, 0), matMat);
    mat.position.y = -0.01;
    mat.receiveShadow = true;
    scene.add(mat);

    // siatka kropek prowadzących
    const lineMat = new T.MeshBasicMaterial({ color: 0xb8c8e6, transparent: true, opacity: 0.6 });
    for (let r = 0; r < C.ROWS; r++) {
      const l = new T.Mesh(new T.PlaneGeometry(C.COLS - 1, 0.02), lineMat);
      l.rotation.x = -Math.PI / 2; l.position.set(0, 0.003, r - (C.ROWS - 1) / 2);
      scene.add(l);
    }
    for (let c = 0; c < C.COLS; c++) {
      const l = new T.Mesh(new T.PlaneGeometry(0.02, C.ROWS - 1), lineMat);
      l.rotation.x = -Math.PI / 2; l.position.set(c - (C.COLS - 1) / 2, 0.003, 0);
      scene.add(l);
    }
    const pegGeo = new T.CylinderGeometry(0.075, 0.085, 0.04, 16);
    pegMesh = new T.InstancedMesh(pegGeo, new T.MeshStandardMaterial({ color: 0xc8d2e0, metalness: 0.8, roughness: 0.3 }), C.COLS * C.ROWS);
    let i = 0;
    for (let r = 0; r < C.ROWS; r++) for (let c = 0; c < C.COLS; c++) {
      tmpM.makeTranslation(c - (C.COLS - 1) / 2, 0.02, r - (C.ROWS - 1) / 2);
      pegMesh.setMatrixAt(i++, tmpM);
    }
    pegMesh.receiveShadow = true;
    scene.add(pegMesh);

    const ground = new T.Mesh(new T.CircleGeometry(30, 48), new T.ShadowMaterial({ opacity: 0.18 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.48;
    ground.receiveShadow = true;
    scene.add(ground);
  }

  function buildInstanced() {
    const MAX = 1600;
    const sg = new T.BoxGeometry(1, 1, 1);
    sparks = new T.InstancedMesh(sg, new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, emissive: 0x2a1c00 }), MAX);
    sparks.instanceMatrix.setUsage(T.DynamicDrawUsage);
    sparks.setColorAt(0, new T.Color(1, 1, 1));
    sparks.count = 0;
    sparks.frustumCulled = false;
    sparks.castShadow = false;
    scene.add(sparks);

    const MAXS = 700;
    stacks = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), MAXS);
    stacks.setColorAt(0, new T.Color(1, 1, 1));
    stacks.count = 0;
    stacks.castShadow = true;
    stacks.frustumCulled = false;
    scene.add(stacks);
    studs = new T.InstancedMesh(new T.CylinderGeometry(0.05, 0.05, 0.04, 14), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }), MAXS);
    studs.setColorAt(0, new T.Color(1, 1, 1));
    studs.count = 0;
    studs.frustumCulled = false;
    scene.add(studs);
  }

  S.setTheme = function (th) {
    if (!boardMat) return;
    boardMat.color.setHex(th.board);
    matMat.color.setHex(th.mat);
  };

  // ---------- elementy ----------
  const sigOf = p => [p.type, p.a, p.b, p.color || 0].join(':');

  function placeGroup(o, p) {
    const A = S.nodePos(p.a), Bv = S.nodePos(p.b);
    o.group.position.set((A.x + Bv.x) / 2, 0, (A.z + Bv.z) / 2);
    o.group.rotation.set(0, -Math.atan2(Bv.z - A.z, Bv.x - A.x), 0);
    o.group.updateMatrixWorld(true);
    const pts = o.path.map(v => v.clone().applyMatrix4(o.group.matrixWorld));
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    o.world = { pts, cum, len: cum[cum.length - 1] };
  }

  S.sync = function (pieces) {
    piecesRef = pieces;
    const seen = new Set();
    for (const p of pieces) {
      seen.add(p.id);
      let o = objs.get(p.id);
      const sig = sigOf(p);
      if (o && o.sig !== sig) { scene.remove(o.group); P.dispose(o.group); objs.delete(p.id); o = null; }
      if (!o) {
        o = P.build(p);
        o.sig = sig;
        o.offset = Math.random();
        o.state = {};
        o.group.userData.pid = p.id;
        o.group.traverse(c => { c.userData.pid = p.id; });
        placeGroup(o, p);
        o.group.scale.setScalar(0.01);
        o.pop = 0;
        shadowDirty = true;
        scene.add(o.group);
        objs.set(p.id, o);
      }
      o.p = p;
    }
    for (const [id, o] of objs) if (!seen.has(id)) { scene.remove(o.group); P.dispose(o.group); objs.delete(id); shadowDirty = true; }
    if (selId && !objs.has(selId)) S.select(null);
  };

  S.setResults = function (res) {
    results = res;
    rebuildStacks();
  };

  S.setShowStacks = v => {
    showStacks = v; rebuildStacks();
    // przy wieżach kamera schodzi niżej (widać wysokość), a iskierki bledną
    cam.tPhi = v ? Math.max(cam.tPhi, 1.02) : Math.min(cam.tPhi, cam.defPhi || 0.78);
    sparks.material.transparent = v; sparks.material.opacity = v ? 0.4 : 1; sparks.material.needsUpdate = true;
  };
  S.setShowSparks = v => { showSparks = v; };

  function rebuildStacks() {
    let k = 0;
    if (showStacks && results) {
      for (const [n, V] of results.nodeV) {
        if (V < 0.04) continue;
        const pos = S.nodePos(n, tmpV);
        const blocks = V / C.BLOCK_V;
        const full = Math.floor(blocks + 1e-6);
        const H = 0.17, G = 0.025;
        const hs = [];
        for (let i = 0; i < full; i++) hs.push(H);
        if (blocks - full > 0.08) hs.push(H * (blocks - full));
        let y = 0.09;
        hs.forEach((h, i) => {
          if (k >= stacks.instanceMatrix.count) return;
          const col = PAL[Math.min(i, PAL.length - 1)];
          tmpM.compose(tmpS.set(pos.x, y + h / 2, pos.z), tmpQ.identity(), new T.Vector3(0.22, h, 0.22));
          stacks.setMatrixAt(k, tmpM);
          stacks.setColorAt(k, tmpC.setHex(col));
          if (i === hs.length - 1) tmpM.makeTranslation(pos.x, y + h + 0.02, pos.z);
          else tmpM.makeScale(0, 0, 0);
          studs.setMatrixAt(k, tmpM);
          studs.setColorAt(k, tmpC.setHex(col));
          y += h + G;
          k++;
        });
      }
    }
    stacks.count = k; studs.count = k;
    stacks.instanceMatrix.needsUpdate = true; studs.instanceMatrix.needsUpdate = true;
    if (stacks.instanceColor) stacks.instanceColor.needsUpdate = true;
    if (studs.instanceColor) studs.instanceColor.needsUpdate = true;
  }

  function pointAt(w, s, out) {
    const { pts, cum } = w;
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const seg = cum[hi] - cum[lo] || 1;
    return out.copy(pts[lo]).lerp(pts[hi], (s - cum[lo]) / seg);
  }

  const blockColor = b => (b < 0.08 ? 0xcfd8e6 : PAL[Math.min(PAL.length - 1, Math.ceil(b - 1e-6) - 1)]);

  function updateSparks(dt, t) {
    let k = 0;
    const max = sparks.instanceMatrix.count;
    if (showSparks && results) {
      for (const [id, o] of objs) {
        const r = results.pieces[id];
        if (!r || !o.world) continue;
        const I = r.I, Va = r.Va || 0, Vb = r.Vb || 0;
        const moving = Math.abs(I) > 1e-4;
        if (!moving && Math.max(Va, Vb) < 0.03) continue;
        const w = o.world;
        const speed = moving ? Math.sign(I) * Math.min(9, 4 * Math.sqrt(Math.abs(I))) : 0;
        const hot = results.short && Math.abs(I) > C.SHORT_I * 0.5;
        o.offset += speed * dt;
        const spacing = 0.24;
        const inside = o.p && o.p.type !== 'wire' ? 0.6 : 1;
        const n = Math.max(2, Math.floor(w.len / spacing));
        const sp = w.len / n;
        for (let i = 0; i < n && k < max; i++) {
          let s = (i * sp + o.offset) % w.len;
          if (s < 0) s += w.len;
          const u = s / w.len;
          const V = Va + (Vb - Va) * u;
          const blocks = Math.max(0, V) / C.BLOCK_V;
          const size = (0.05 + 0.04 * Math.min(blocks, 4)) * inside;
          pointAt(w, s, tmpV);
          if (!moving) tmpV.y += Math.sin(t * 3 + i * 1.7) * 0.012;
          tmpV.y += size * 0.25;
          tmpQ.setFromAxisAngle(tmpS.set(0, 1, 0), o.group.rotation.y);
          tmpM.compose(tmpV, tmpQ, tmpS.set(size, size, size));
          sparks.setMatrixAt(k, tmpM);
          sparks.setColorAt(k, tmpC.setHex(hot ? (Math.sin(t * 20 + i) > 0 ? 0xff2d2d : 0xff8a00) : blockColor(blocks)));
          k++;
        }
      }
    }
    sparks.count = k;
    sparks.instanceMatrix.needsUpdate = true;
    if (sparks.instanceColor) sparks.instanceColor.needsUpdate = true;
  }

  // ---------- efekty ----------
  let fxTex = null;
  S.fx = function (kind, pos, n) {
    if (!scene) return;
    if (!fxTex) fxTex = P.glowTex();
    for (let i = 0; i < (n || 8); i++) {
      const m = new T.SpriteMaterial({
        map: fxTex, transparent: true, depthWrite: false,
        color: kind === 'smoke' ? 0x8a8f99 : kind === 'star' ? 0xffe14d : 0xffc040,
        blending: kind === 'smoke' ? T.NormalBlending : T.AdditiveBlending,
      });
      const s = new T.Sprite(m);
      s.raycast = () => {};
      s.position.copy(pos);
      const a = Math.random() * Math.PI * 2;
      const sp = kind === 'smoke' ? 0.15 : 1 + Math.random() * 1.5;
      const vel = new T.Vector3(Math.cos(a) * sp, kind === 'smoke' ? 0.4 + Math.random() * 0.3 : 1 + Math.random() * 2, Math.sin(a) * sp);
      const life = kind === 'smoke' ? 1.4 + Math.random() : 0.5 + Math.random() * 0.4;
      s.scale.setScalar(kind === 'smoke' ? 0.15 : 0.12);
      scene.add(s);
      fx.push({ s, vel, life, max: life, kind });
    }
  };
  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.life -= dt;
      if (f.life <= 0) { scene.remove(f.s); f.s.material.dispose(); fx.splice(i, 1); continue; }
      f.s.position.addScaledVector(f.vel, dt);
      const k = f.life / f.max;
      if (f.kind === 'smoke') { f.s.scale.setScalar(0.15 + (1 - k) * 0.5); f.s.material.opacity = k * 0.55; }
      else { f.vel.y -= 5 * dt; f.s.material.opacity = k; }
    }
  }

  // ---------- duch i zaznaczenie ----------
  S.showGhost = function (type, a, b, ok) {
    if (!type) { if (ghost) ghost.visible = false; return; }
    if (ghostType !== type) {
      if (ghost) scene.remove(ghost);
      ghost = P.ghost(type);
      ghostType = type;
      scene.add(ghost);
    }
    ghost.visible = true;
    const A = S.nodePos(a), Bv = S.nodePos(b);
    ghost.position.set((A.x + Bv.x) / 2, 0.01, (A.z + Bv.z) / 2);
    ghost.rotation.set(0, -Math.atan2(Bv.z - A.z, Bv.x - A.x), 0);
    ghost.userData.ghostMat.color.setHex(ok ? 0x4cd964 : 0xff4d5e);
  };
  S.select = function (id) {
    selId = id;
    selRing.visible = !!id;
  };

  // ---------- kamera ----------
  // Plansza mieści się w „wolnym” prostokącie sceny (bez kart i pasków).
  // frames = kandydaci { l, t, r, b } (marginesy w pikselach); wygrywa ten, w którym plansza jest największa.
  let frames = [{ l: 0, t: 0, r: 0, b: 0 }];
  S.setFrames = list => { frames = list && list.length ? list : [{ l: 0, t: 0, r: 0, b: 0 }]; cam.fitKey = ''; };
  S.cam = cam;
  cam.pan = new T.Vector3();
  cam.tPan = new T.Vector3();
  S.rotate = d => { cam.tTheta += d; };
  S.zoomBy = f => { cam.tZoom = Math.max(0.35, Math.min(1.6, cam.tZoom * f)); clampPan(); };
  S.orbit = (dx, dy) => {
    cam.tTheta -= dx * 0.008; cam.tPhi = Math.max(0.12, Math.min(1.25, cam.tPhi - dy * 0.006));
  };
  // przesuwanie widoku palcami: punkt planszy pod palcem jedzie razem z palcem
  const panA = new T.Vector3(), panB = new T.Vector3();
  S.pan = (x0, y0, x1, y1) => {
    if (!groundAt(x0, y0, panA) || !groundAt(x1, y1, panB)) return;
    cam.tPan.add(panA.sub(panB));
    clampPan();
    cam.pan.copy(cam.tPan);
  };
  function clampPan() {
    const k = Math.max(0, 1 - cam.tZoom) * 1.6 + 0.4;
    const mx = ((C.COLS - 1) / 2) * k, mz = ((C.ROWS - 1) / 2) * k;
    cam.tPan.x = Math.max(-mx, Math.min(mx, cam.tPan.x));
    cam.tPan.z = Math.max(-mz, Math.min(mz, cam.tPan.z));
  }
  S.topView = () => { cam.tPhi = cam.tPhi > 0.3 ? 0.12 : (cam.defPhi || 0.78); };
  S.resetView = () => {
    cam.tTheta = Math.round(cam.theta / (Math.PI * 2)) * Math.PI * 2;
    cam.tPhi = cam.defPhi || 0.78; cam.tZoom = 1; cam.tPan.set(0, 0, 0);
  };
  S.setAuto = v => { cam.auto = v; if (!v) S.resetView(); };

  const fitV = new T.Vector3();
  const HX = (C.COLS - 1) / 2 + 0.55, HZ = (C.ROWS - 1) / 2 + 0.55;
  const CORNERS = [[-HX, -HZ], [HX, -HZ], [-HX, HZ], [HX, HZ]];
  function extents() {
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (const [x, z] of CORNERS) {
      fitV.set(x, 0, z).project(camera);
      x0 = Math.min(x0, fitV.x); x1 = Math.max(x1, fitV.x); y0 = Math.min(y0, fitV.y); y1 = Math.max(y1, fitV.y);
    }
    return { x0, x1, y0, y1 };
  }
  // odległość, przy której plansza wypełnia prostokąt fr (dla danego obrotu)
  function fitDist(fr, w, h, th, phi) {
    const sx = Math.max(0.1, (w - fr.l - fr.r) / w) * 0.95, sy = Math.max(0.1, (h - fr.t - fr.b) / h) * 0.94;
    let dist = 14;
    camera.clearViewOffset();
    for (let it = 0; it < 5; it++) {
      placeCam(dist, th, phi, null);
      const e = extents();
      dist *= Math.max((e.x1 - e.x0) / (2 * sx), (e.y1 - e.y0) / (2 * sy));
    }
    return dist;
  }

  function updateCamera(dt) {
    if (cam.auto) { cam.tTheta += dt * 0.12; cam.tPhi = 0.9; cam.tZoom = 1.0; cam.tPan.set(0, 0, 0); }
    const k = Math.min(1, dt * 7);
    cam.theta += (cam.tTheta - cam.theta) * k;
    cam.phi += (cam.tPhi - cam.phi) * k;
    cam.zoom += (cam.tZoom - cam.zoom) * k;
    cam.pan.lerp(cam.tPan, k);
    const w = viewW, h = viewH;
    camera.aspect = w / h;

    // wybór prostokąta i orientacji planszy (tylko gdy zmienił się ekran albo karty)
    const key = w + 'x' + h + ':' + frames.map(f => [f.l, f.t, f.r, f.b].map(Math.round).join(',')).join('|');
    if (cam.fitKey !== key) {
      cam.fitKey = key;
      let best = null;
      for (const fr of frames) for (const base of [0, Math.PI / 2]) {
        const d = fitDist(fr, w, h, base, 0.78) * (base === cam.baseT ? 0.93 : 1); // premia za obecną orientację
        if (!best || d < best.d) best = { d, fr, base };
      }
      cam.frame = best.fr;
      cam.baseT = best.base;
      // wąski, wysoki kadr (telefon pionowo): kamera bardziej z góry, żeby kropki były dalej od siebie
      const fw = w - best.fr.l - best.fr.r, fh = h - best.fr.t - best.fr.b;
      const def = fw / fh < 0.85 ? 0.46 : 0.78;
      if (def !== cam.defPhi) {
        if (cam.defPhi === undefined || Math.abs(cam.tPhi - cam.defPhi) < 0.02) cam.tPhi = def;
        if (cam.defPhi === undefined) cam.phi = def;
        cam.defPhi = def;
      }
    }
    if (cam.base === undefined || isNaN(cam.base)) cam.base = cam.baseT;
    cam.base += (cam.baseT - cam.base) * k;
    const fr = cam.frame;
    const th = cam.theta + cam.base;
    // dopasowanie liczone od nowa tylko, gdy kamera się obraca albo zmienił się kadr
    const fk = cam.fitKey + ':' + th.toFixed(4) + ':' + cam.phi.toFixed(4);
    if (fk !== cam.fk) {
      cam.fk = fk;
      const d = fitDist(fr, w, h, th, cam.phi);
      // środek planszy w środek wolnego prostokąta
      placeCam(d, th, cam.phi, null);
      const e = extents();
      const fcx = ((fr.l + (w - fr.r)) / 2 / w) * 2 - 1, fcy = -(((fr.t + (h - fr.b)) / 2 / h) * 2 - 1);
      cam.fit = { d, ox: (((e.x0 + e.x1) / 2 - fcx) * w) / 2, oy: (-((e.y0 + e.y1) / 2 - fcy) * h) / 2 };
    }
    const { d, ox, oy } = cam.fit;
    cam.fd = cam.fd === undefined ? d : cam.fd + (d - cam.fd) * k;
    cam.ox = cam.ox === undefined ? ox : cam.ox + (ox - cam.ox) * k;
    cam.oy = cam.oy === undefined ? oy : cam.oy + (oy - cam.oy) * k;
    camera.setViewOffset(w, h, cam.ox, cam.oy, w, h);
    placeCam(cam.fd * cam.zoom, th, cam.phi, cam.pan);
  }
  function placeCam(dist, th, phi, pan) {
    const t = cam.target;
    const px = pan ? pan.x : 0, pz = pan ? pan.z : 0;
    camera.position.set(
      t.x + px + dist * Math.sin(phi) * Math.sin(th),
      t.y + dist * Math.cos(phi),
      t.z + pz + dist * Math.sin(phi) * Math.cos(th)
    );
    camera.up.set(0, 1, 0);
    if (phi < 0.2) camera.up.set(-Math.sin(th), 0, -Math.cos(th));
    camera.lookAt(t.x + px, t.y, t.z + pz);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
  }

  S.resize = function () {
    if (!renderer) return;
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    viewW = w || 1; viewH = h || 1;
    renderer.setSize(w, h, false);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  };

  // ---------- wskazywanie ----------
  const ndcV = new T.Vector2(), hitV = new T.Vector3(), groupList = [], hitList = [];
  function rayAt(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    ndcV.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndcV, camera);
  }
  function groundAt(cx, cy, out) {
    rayAt(cx, cy);
    return ray.ray.intersectPlane(plane, out);
  }
  S.pick = function (cx, cy) {
    rayAt(cx, cy);
    let pid = null;
    groupList.length = 0;
    for (const o of objs.values()) groupList.push(o.group);
    hitList.length = 0;
    ray.intersectObjects(groupList, true, hitList);
    for (const h of hitList) { if (h.object.userData.pid) { pid = h.object.userData.pid; break; } }
    const hit = ray.ray.intersectPlane(plane, hitV);
    let grid = null;
    if (hit) grid = { fc: hit.x + (C.COLS - 1) / 2, fr: hit.z + (C.ROWS - 1) / 2 };
    return { pid, grid };
  };

  S.screenOf = function (id, yOff) {
    const o = objs.get(id);
    if (!o) return null;
    tmpV.copy(o.group.position); tmpV.y += yOff === undefined ? 0.6 : yOff;
    tmpV.project(camera);
    return { x: (tmpV.x * 0.5 + 0.5) * viewW, y: (-tmpV.y * 0.5 + 0.5) * viewH, behind: tmpV.z > 1 };
  };
  S.screenOfNode = function (n) {
    S.nodePos(n, tmpV).project(camera);
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + (tmpV.x * 0.5 + 0.5) * rect.width, y: rect.top + (-tmpV.y * 0.5 + 0.5) * rect.height };
  };
  S.worldOf = id => { const o = objs.get(id); return o ? o.group.position.clone() : null; };

  // ---------- pętla ----------
  S.render = function (dt, t) {
    if (!renderer) return;
    updateCamera(dt);
    const glows = [];
    for (const [id, o] of objs) {
      if (o.pop < 1) {
        o.pop = Math.min(1, o.pop + dt * 5);
        const e = o.pop, s = 1 + Math.sin(e * Math.PI) * 0.25 * (1 - e) + 0;
        o.group.scale.setScalar(Math.max(0.01, e < 1 ? (1 - Math.pow(1 - e, 3)) * s : 1));
      } else if (o.group.matrixAutoUpdate) {
        // po animacji pojawienia się element stoi w miejscu – nie liczymy jego macierzy co klatkę
        o.group.matrixAutoUpdate = false;
        o.group.updateMatrix();
        o.group.matrixWorldNeedsUpdate = true;
      }
      const r = results ? results.pieces[id] : null;
      const st = o.update(r, dt, t, o.p) || {};
      o.state = st;
      if (st.glow > 0.02 && o.light) glows.push({ o, g: st.glow });
      if (st.heat > 0.6 && Math.random() < dt * 6) S.fx('smoke', tmpV.copy(o.group.position).setY(0.4), 1);
    }
    glows.sort((a, b) => b.g - a.g);
    lights.forEach((l, i) => {
      const gl = glows[i];
      if (!gl) { l.intensity = 0; return; }
      l.position.copy(gl.o.group.position); l.position.y = gl.o.light.y + 0.1;
      l.color.setHex(gl.o.light.color);
      l.intensity = Math.min(1.6, gl.g) * 1.4;
    });
    if (selId && objs.has(selId)) {
      const o = objs.get(selId);
      selRing.position.set(o.group.position.x, 0.004, o.group.position.z);
      selRing.rotation.y = o.group.rotation.y;
      selRing.material.opacity = 0.55 + Math.sin(t * 6) * 0.3;
    }
    updateSparks(dt, t);
    updateFx(dt);
    updateMarks(t);
    // cienie: od razu po zmianie planszy, a poza tym co trzecia klatka (śmigła, dźwignie)
    frameNo++;
    if (shadowDirty || frameNo % 3 === 0) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
    renderer.render(scene, camera);
    // słabszy telefon: gdy przez dłuższą chwilę jest poniżej ~36 klatek, zmniejszamy rozdzielczość
    slowEma += (dt - slowEma) * 0.05;
    if (frameNo > 120 && slowEma > 0.028 && dpr > 1) {
      if (++slowFrames > 90) { dpr = Math.max(1, dpr - 0.25); renderer.setPixelRatio(dpr); S.resize(); slowFrames = 0; slowEma = 1 / 60; }
    } else slowFrames = 0;
  };

  // ---------- znaczniki na planszy ----------
  // kind: cause/act (pomarańczowy – przyczyna albo „to zmieniasz”), rel/look (niebieski – patrz tutaj), ref (żółty),
  //       end (czerwony wykrzyknik na kropce – tu tor się urywa), spot (zielone miejsce na krawędzi)
  const MARK_COL = { cause: 0xff8a1c, act: 0xff8a1c, rel: 0x3d8bff, look: 0x3d8bff, ref: 0xffc400, end: 0xff3b4f, spot: 0x2ecc71 };
  const markPool = [];
  let marks = [];
  let bangTex = null;
  function markObj(i) {
    if (markPool[i]) return markPool[i];
    const g = new T.Group();
    const mat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false });
    const frame = new T.Mesh(P.frameGeo(1.12, 0.62, 0.075, 0.24), mat);
    const fill = new T.Mesh(P.slab(1.0, 0.5, 0.005, 0.2, 0), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }));
    const ring = new T.Mesh(new T.RingGeometry(0.13, 0.2, 28).rotateX(-Math.PI / 2), mat);
    if (!bangTex) bangTex = P.textTex('!', '#ff3b4f', 110);
    const bang = new T.Sprite(new T.SpriteMaterial({ map: bangTex, transparent: true, depthWrite: false, depthTest: false }));
    bang.scale.set(0.42, 0.42, 0.42);
    [frame, fill, ring, bang].forEach(o => { o.raycast = () => {}; o.renderOrder = 5; g.add(o); });
    g.visible = false;
    scene.add(g);
    return (markPool[i] = { g, frame, fill, ring, bang, mat });
  }
  S.setMarks = function (list) {
    marks = list || [];
    markPool.forEach(m => { m.g.visible = false; });
  };
  S.hasMarks = () => marks.length > 0;
  const mA = new T.Vector3(), mB = new T.Vector3();
  function updateMarks(t) {
    let i = 0;
    for (const mk of marks) {
      let rotY = 0, edge = false;
      if (mk.piece) {
        const o = objs.get(mk.piece); if (!o) continue;
        mA.copy(o.group.position); rotY = o.group.rotation.y; edge = true;
      } else if (mk.edge) {
        S.nodePos(mk.edge[0], mA); S.nodePos(mk.edge[1], mB);
        rotY = -Math.atan2(mB.z - mA.z, mB.x - mA.x); mA.add(mB).multiplyScalar(0.5); edge = true;
      } else if (mk.node !== undefined) S.nodePos(mk.node, mA);
      else continue;
      const m = markObj(i++);
      m.g.visible = true;
      m.g.position.set(mA.x, 0.012, mA.z);
      m.g.rotation.y = rotY;
      const col = MARK_COL[mk.kind] || 0xffffff;
      m.mat.color.setHex(col);
      m.fill.material.color.setHex(col);
      const pulse = 0.5 + 0.5 * Math.sin(t * 6 + i);
      m.frame.visible = edge; m.fill.visible = edge && mk.kind === 'spot';
      m.ring.visible = !edge; m.bang.visible = mk.kind === 'end';
      m.mat.opacity = 0.55 + pulse * 0.45;
      m.frame.scale.setScalar(1 + pulse * 0.06);
      m.ring.scale.setScalar(1 + pulse * 0.5);
      m.bang.position.y = 0.45 + pulse * 0.12;
    }
    for (; i < markPool.length; i++) markPool[i].g.visible = false;
  }

  // sondy miernika: czerwona i czarna szpilka na kropkach
  let probes = null;
  S.setProbes = function (a, b) {
    if (!probes) {
      probes = [0xff3b4f, 0x2d3142].map(c => {
        const g = new T.Group();
        const m = new T.MeshStandardMaterial({ color: c, roughness: 0.35 });
        const tip = new T.Mesh(new T.ConeGeometry(0.035, 0.16, 12).rotateX(Math.PI), new T.MeshStandardMaterial({ color: 0xdfe4ec, metalness: 0.9, roughness: 0.3 }));
        tip.position.y = 0.08;
        const body = new T.Mesh(new T.CylinderGeometry(0.06, 0.05, 0.36, 16), m);
        body.position.y = 0.34;
        const cap = new T.Mesh(new T.SphereGeometry(0.06, 16, 10), m);
        cap.position.y = 0.52;
        [tip, body, cap].forEach(o => { o.castShadow = true; o.raycast = () => {}; g.add(o); });
        g.visible = false;
        scene.add(g);
        return g;
      });
    }
    [a, b].forEach((n, i) => {
      const g = probes[i];
      g.visible = n !== null && n !== undefined;
      if (g.visible) { S.nodePos(n, g.position); g.position.y = 0.02; }
    });
  };
  S.screenOfPoint = function (v) {
    tmpV.copy(v).project(camera);
    return { x: (tmpV.x * 0.5 + 0.5) * viewW, y: (-tmpV.y * 0.5 + 0.5) * viewH };
  };

  S.stateOf = id => (objs.get(id) || {}).state || {};
})();
