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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
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
    sparks.castShadow = true;
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
      if (o && o.sig !== sig) { scene.remove(o.group); objs.delete(p.id); o = null; }
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
        scene.add(o.group);
        objs.set(p.id, o);
      }
      o.p = p;
    }
    for (const [id, o] of objs) if (!seen.has(id)) { scene.remove(o.group); objs.delete(id); }
    if (selId && !objs.has(selId)) S.select(null);
  };

  S.setResults = function (res) {
    results = res;
    rebuildStacks();
  };

  S.setShowStacks = v => { showStacks = v; rebuildStacks(); };
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

  const blockColor = b => (b < 0.08 ? 0xffffff : PAL[Math.min(PAL.length - 1, Math.ceil(b - 1e-6) - 1)]);

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
        const n = Math.max(2, Math.floor(w.len / spacing));
        const sp = w.len / n;
        for (let i = 0; i < n && k < max; i++) {
          let s = (i * sp + o.offset) % w.len;
          if (s < 0) s += w.len;
          const u = s / w.len;
          const V = Va + (Vb - Va) * u;
          const blocks = Math.max(0, V) / C.BLOCK_V;
          const size = 0.045 + 0.055 * Math.min(blocks, 4);
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
  S.cam = cam;
  S.rotate = d => { cam.tTheta += d; };
  S.zoomBy = f => { cam.tZoom = Math.max(0.45, Math.min(1.6, cam.tZoom * f)); };
  S.orbit = (dx, dy) => {
    cam.tTheta -= dx * 0.008; cam.tPhi = Math.max(0.12, Math.min(1.25, cam.tPhi - dy * 0.006));
  };
  S.topView = () => { cam.tPhi = cam.tPhi > 0.3 ? 0.12 : 0.78; };
  S.resetView = () => {
    cam.tTheta = Math.round(cam.theta / (Math.PI * 2)) * Math.PI * 2;
    cam.tPhi = 0.78; cam.tZoom = 1;
  };
  S.setAuto = v => { cam.auto = v; if (!v) S.resetView(); };

  function updateCamera(dt) {
    if (cam.auto) { cam.tTheta += dt * 0.12; cam.tPhi = 0.9; cam.tZoom = 1.0; }
    const k = Math.min(1, dt * 7);
    cam.theta += (cam.tTheta - cam.theta) * k;
    cam.phi += (cam.tPhi - cam.phi) * k;
    cam.zoom += (cam.tZoom - cam.zoom) * k;
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    camera.aspect = w / h;
    // w pionie plansza obraca się o 90°, żeby dłuższy bok szedł wzdłuż ekranu
    const base = w / h < 0.85 ? Math.PI / 2 : 0;
    cam.base += (base - cam.base) * (cam.base === undefined ? 1 : k);
    if (isNaN(cam.base)) cam.base = base;
    const side = w < 900 ? 34 : 0;
    camera.setViewOffset(w, h, side, 0, w, h);
    camera.updateProjectionMatrix();
    // odległość dobrana tak, by cała plansza mieściła się w kadrze
    const hx = (C.COLS - 1) / 2 + 0.55, hz = (C.ROWS - 1) / 2 + 0.55;
    const mx = w < 900 ? 0.97 - 60 / w : 0.9, my = 0.93;
    let dist = 14;
    for (let it = 0; it < 5; it++) {
      placeCam(dist);
      let m = 0;
      for (const [x, z] of [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) {
        fitV.set(x, 0, z).project(camera);
        m = Math.max(m, Math.abs(fitV.x) / mx, Math.abs(fitV.y) / my);
      }
      dist *= m;
    }
    // wyśrodkowanie planszy w kadrze (perspektywa przesuwa ją w dół)
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (const [x, z] of [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz]]) {
      fitV.set(x, 0, z).project(camera);
      x0 = Math.min(x0, fitV.x); x1 = Math.max(x1, fitV.x); y0 = Math.min(y0, fitV.y); y1 = Math.max(y1, fitV.y);
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    cam.ox = cam.ox === undefined ? cx : cam.ox + (cx - cam.ox) * k;
    cam.oy = cam.oy === undefined ? cy : cam.oy + (cy - cam.oy) * k;
    camera.setViewOffset(w, h, side + (cam.ox * w) / 2, (-cam.oy * h) / 2, w, h);
    camera.updateProjectionMatrix();
    placeCam(dist * cam.zoom);
  }
  const fitV = new T.Vector3();
  function placeCam(dist) {
    const t = cam.target;
    const th = cam.theta + (cam.base || 0);
    camera.position.set(
      t.x + dist * Math.sin(cam.phi) * Math.sin(th),
      t.y + dist * Math.cos(cam.phi),
      t.z + dist * Math.sin(cam.phi) * Math.cos(th)
    );
    camera.up.set(0, 1, 0);
    if (cam.phi < 0.2) camera.up.set(-Math.sin(th), 0, -Math.cos(th));
    camera.lookAt(t);
    camera.updateMatrixWorld();
  }

  S.resize = function () {
    if (!renderer) return;
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    renderer.setSize(w, h, false);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  };

  // ---------- wskazywanie ----------
  S.pick = function (cx, cy) {
    const rect = canvas.getBoundingClientRect();
    const ndc = new T.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    let pid = null;
    const groups = [...objs.values()].map(o => o.group);
    const hits = ray.intersectObjects(groups, true);
    for (const h of hits) { if (h.object.userData.pid) { pid = h.object.userData.pid; break; } }
    const hit = ray.ray.intersectPlane(plane, new T.Vector3());
    let grid = null;
    if (hit) grid = { fc: hit.x + (C.COLS - 1) / 2, fr: hit.z + (C.ROWS - 1) / 2 };
    return { pid, grid };
  };

  S.screenOf = function (id, yOff) {
    const o = objs.get(id);
    if (!o) return null;
    tmpV.copy(o.group.position); tmpV.y += yOff === undefined ? 0.6 : yOff;
    tmpV.project(camera);
    const rect = canvas.getBoundingClientRect();
    return { x: (tmpV.x * 0.5 + 0.5) * rect.width, y: (-tmpV.y * 0.5 + 0.5) * rect.height, behind: tmpV.z > 1 };
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
      }
      const r = results ? results.pieces[id] : null;
      const st = o.update(r, dt, t) || {};
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
    renderer.render(scene, camera);
  };

  S.stateOf = id => (objs.get(id) || {}).state || {};
})();
