'use strict';
/* Otoczenie: niebo, światło, pora dnia, teren (z teksturą ulic) i morze. */

const World = {
  G0: 1.5,            // wysokość terenu w mieście
  SHORE: 75,
  ROADS_X: [-180, -140, -100, -60, -20, 20, 60, 100, 140, 180],
  ROADS_Z: [-170, -130, -90, -50, -10, 30],
  ROAD_W: 10,
  // obszar symulacji wody (flood.js) – w indeksach siatki morza; wewnątrz morze rysuje symulacja
  SIM_I0: 34,
  SIM_I1: 136,
  SIM_J1: 70,
  scene: null,
  renderer: null,
  tod: 'sunset',
  todP: null,

  baseHeight(x, z) {
    let h = 1.5;
    if (z > 48) {
      const t = z - 48;
      h = 1.5 - t * 0.055 - Math.max(0, t - 27) * 0.11;
      h = Math.max(h, -13 + 2.5 * U.noise2(x * 0.012, z * 0.012));
    }
    const ax = Math.abs(x);
    const side = U.smooth(225, 520, ax) * (1 - U.smooth(-60, 120, z));
    const north = U.smooth(-188, -520, z);
    const m = Math.max(side, north);
    if (m > 0) {
      const n = U.fbm2(x * 0.006 + 11, z * 0.006 - 7, 4);
      const rg = 1 - Math.abs(U.fbm2(x * 0.0024 + 3, z * 0.0024 + 9, 4) * 2 - 1);
      const far = U.smooth(320, 1400, Math.hypot(x, z + 60));
      h += m * (18 + 55 * n + far * (110 + 280 * rg * rg));
    }
    return h;
  },

  init(renderer) {
    this.renderer = renderer;
    const scene = this.scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xc98b72, 380, 2600);

    // niebo
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() },
        sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() },
        glow: { value: 1 }, stars: { value: 0 }
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = position; vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p; }`,
      fragmentShader: `
        uniform vec3 top, hor, bot, sunDir, sunCol; uniform float glow, stars; varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir); float h = d.y;
          vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h,0.0,1.0), 0.5)) : mix(hor, bot, pow(clamp(-h*3.0,0.0,1.0), 0.6));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          c += sunCol * (pow(s, 1400.0) * 9.0 + pow(s, 60.0) * 0.45 * glow + pow(s, 7.0) * 0.22 * glow);
          if (stars > 0.0) {
            vec3 p = floor(d * 380.0);
            float r = fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
            c += vec3(step(0.9982, r) * stars * smoothstep(0.02, 0.3, h) * (0.5 + r * 0.5));
          }
          gl_FragColor = vec4(c, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 20), this.skyMat);
    scene.add(this.sky);
    this.skyScene = new THREE.Scene();
    this.skyScene.add(new THREE.Mesh(this.sky.geometry, this.skyMat));
    this.pmrem = new THREE.PMREMGenerator(renderer);

    // światła
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -235; sc.right = 235; sc.top = 235; sc.bottom = -235; sc.near = 50; sc.far = 1400;
    const big = renderer.capabilities.maxTextureSize >= 8192;
    this.sun.shadow.mapSize.set(big ? 4096 : 2048, big ? 4096 : 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.35;
    this.sunTarget = new THREE.Object3D();
    this.sunTarget.position.set(0, 0, -60);
    scene.add(this.sunTarget);
    this.sun.target = this.sunTarget;
    scene.add(this.sun);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(this.hemi);

    this.buildGround();
    this.buildSea();
  },

  setTOD(key) {
    const p = this.todP = TOD[key];
    this.tod = key;
    const el = THREE.MathUtils.degToRad(p.sunEl), az = THREE.MathUtils.degToRad(p.sunAz);
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    const u = this.skyMat.uniforms;
    u.top.value.setHex(p.skyTop); u.hor.value.setHex(p.skyHor); u.bot.value.setHex(p.skyBot);
    u.sunDir.value.copy(dir);
    u.sunCol.value.setHex(p.sunColor).multiplyScalar(key === 'night' ? 0.5 : 1);
    u.glow.value = p.sunGlow; u.stars.value = p.stars;
    this.sun.color.setHex(p.sunColor);
    this.sun.intensity = p.sunI;
    this.sun.position.copy(this.sunTarget.position).addScaledVector(dir, 700);
    this.hemi.color.setHex(p.hemiSky);
    this.hemi.groundColor.setHex(p.hemiGround);
    this.hemi.intensity = p.hemiI;
    this.scene.fog.color.setHex(p.fog);
    this.scene.fog.near = p.fogNear;
    this.scene.fog.far = p.fogFar;
    this.renderer.toneMappingExposure = p.exposure;
    if (this.envRT) this.envRT.dispose();
    this.envRT = this.pmrem.fromScene(this.skyScene, 0.02, 1, 10000);
    this.scene.environment = this.envRT.texture;
    this.envIntensity = p.env;
    this.scene.traverse(o => {
      if (!o.material || o.userData.ownEnv) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m.envMapIntensity !== undefined) m.envMapIntensity = p.env;
    });
    this.seaMat.envMapIntensity = 1.0;
    this.waterBase = new THREE.Color(p.water);
    this.seaColorsDirty = true;
    this.seaColorsDirtyFlood = true;
    if (typeof Flood !== 'undefined' && Flood.mat) Flood.mat.envMapIntensity = 1.0;
  },

  /* Szybkie normalne dla regularnej siatki (różnice centralne), tylko w prostokącie zmian. */
  gridNormals(geo, W, H, i0, i1, j0, j1) {
    const p = geo.attributes.position.array, n = geo.attributes.normal.array;
    for (let j = j0; j <= j1; j++) {
      const ja = j > 0 ? j - 1 : j, jb = j < H - 1 ? j + 1 : j;
      for (let i = i0; i <= i1; i++) {
        const ia = i > 0 ? i - 1 : i, ib = i < W - 1 ? i + 1 : i;
        const a = (j * W + ia) * 3, b = (j * W + ib) * 3, c = (ja * W + i) * 3, d = (jb * W + i) * 3;
        const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2];
        const vx = p[d] - p[c], vy = p[d + 1] - p[c + 1], vz = p[d + 2] - p[c + 2];
        let nx = vy * uz - vz * uy, ny = vz * ux - vx * uz, nz = vx * uy - vy * ux;
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        const o = (j * W + i) * 3;
        n[o] = nx / l; n[o + 1] = ny / l; n[o + 2] = nz / l;
      }
    }
    geo.attributes.normal.needsUpdate = true;
  },

  /* ------------------------------------------------------------------ teren */
  remap(u, a, b) { return a * u + b * u * u * u * u * u; },

  buildGround() {
    const N = 210;
    const cnt = (N + 1) * (N + 1);
    const pos = new Float32Array(cnt * 3), uv = new Float32Array(cnt * 2), col = new Float32Array(cnt * 3);
    this.gBase = new Float32Array(cnt * 3);
    this.gTaper = new Float32Array(cnt);
    const tmpC = new THREE.Color();
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        const k = j * (N + 1) + i;
        const u = i / N * 2 - 1, v = j / N * 2 - 1;
        const x = this.remap(u, 450, 1100), z = this.remap(v, 450, 1100);
        const h = this.baseHeight(x, z);
        pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
        this.gBase[k * 3] = x; this.gBase[k * 3 + 1] = h; this.gBase[k * 3 + 2] = z;
        uv[k * 2] = (x + 450) / 900; uv[k * 2 + 1] = 1 - (z + 450) / 900;
        const r = Math.hypot(x - Quake.center.x, z - Quake.center.z);
        this.gTaper[k] = 1 - U.smooth(380, 720, r);
        // poza obszarem tekstury – kolory zboczy
        const edge = U.smooth(395, 448, Math.max(Math.abs(x), Math.abs(z)));
        this.terrainColor(x, z, h, tmpC);
        col[k * 3] = U.lerp(1, tmpC.r, edge);
        col[k * 3 + 1] = U.lerp(1, tmpC.g, edge);
        col[k * 3 + 2] = U.lerp(1, tmpC.b, edge);
      }
    }
    const idx = new Uint32Array(N * N * 6);
    let q = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
      idx[q++] = a; idx[q++] = c; idx[q++] = b;
      idx[q++] = b; idx[q++] = c; idx[q++] = d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    g.attributes.normal.setUsage(THREE.DynamicDrawUsage);
    this.groundGeo = g;
    this.gW = N + 1;
    // prostokąt siatki, w którym grunt może się ruszać
    let i0 = N, i1 = 0;
    for (let k = 0; k < cnt; k++) if (this.gTaper[k] > 0) { const i = k % (N + 1), j = (k / (N + 1)) | 0; if (i < i0) i0 = i; if (i > i1) i1 = i; }
    let j0 = N, j1 = 0;
    for (let k = 0; k < cnt; k++) if (this.gTaper[k] > 0) { const j = (k / (N + 1)) | 0; if (j < j0) j0 = j; if (j > j1) j1 = j; }
    this.gRect = [Math.max(0, i0 - 1), Math.min(N, i1 + 1), Math.max(0, j0 - 1), Math.min(N, j1 + 1)];
    this.groundTex = this.paintGround();
    this.groundMat = new THREE.MeshStandardMaterial({ map: this.groundTex, vertexColors: true, roughness: 0.95, metalness: 0 });
    this.ground = new THREE.Mesh(g, this.groundMat);
    this.ground.receiveShadow = true;
    this.ground.name = 'ground';
    this.scene.add(this.ground);
    this.groundDirty = false;
  },

  terrainColor(x, z, h, out) {
    const n = U.fbm2(x * 0.02, z * 0.02, 3);
    if (h < -0.5) return out.setRGB(0.42 + n * 0.1, 0.39 + n * 0.08, 0.3);
    if (z > 46 && h < 2) return out.setRGB(0.83 + n * 0.08, 0.74 + n * 0.08, 0.55);
    const slope = U.smooth(10, 120, h);
    const rock = U.smooth(70, 200, h + n * 40);
    const snow = U.smooth(240, 320, h + n * 50);
    let r = U.lerp(0.33, 0.18, slope) + n * 0.08, g = U.lerp(0.45, 0.3, slope) + n * 0.08, b = U.lerp(0.22, 0.17, slope);
    r = U.lerp(r, 0.42 + n * 0.1, rock); g = U.lerp(g, 0.4 + n * 0.1, rock); b = U.lerp(b, 0.37 + n * 0.1, rock);
    r = U.lerp(r, 0.93, snow); g = U.lerp(g, 0.95, snow); b = U.lerp(b, 0.98, snow);
    return out.setRGB(r, g, b);
  },

  /* Rysuje teksturę terenu: trawa, ulice, chodniki, place, plaża. */
  paintGround() {
    const big = this.renderer.capabilities.maxTextureSize >= 8192;
    const S = big ? 4096 : 2048;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d');
    const K = S / 900;
    const X = x => (x + 450) * K, Z = z => (z + 450) * K;

    // tło niskiej rozdzielczości z wysokości terenu
    const L = 300;
    const low = document.createElement('canvas');
    low.width = low.height = L;
    const lc = low.getContext('2d');
    const img = lc.createImageData(L, L);
    const tc = new THREE.Color();
    for (let j = 0; j < L; j++) for (let i = 0; i < L; i++) {
      const x = i / L * 900 - 450, z = j / L * 900 - 450;
      const h = this.baseHeight(x, z);
      this.terrainColor(x, z, h, tc);
      // w mieście jaśniejsza, równa trawa
      const city = (x > -195 && x < 195 && z > -185 && z < 46) ? 1 : 0;
      if (city) tc.setRGB(0.36 + U.fbm2(x * 0.05, z * 0.05, 2) * 0.08, 0.5 + U.fbm2(x * 0.04 + 5, z * 0.04, 2) * 0.08, 0.24);
      const edge = U.smooth(395, 448, Math.max(Math.abs(x), Math.abs(z)));
      tc.r = U.lerp(tc.r, 1, edge); tc.g = U.lerp(tc.g, 1, edge); tc.b = U.lerp(tc.b, 1, edge);
      const o = (j * L + i) * 4;
      img.data[o] = Math.pow(tc.r, 1 / 2.2) * 255;
      img.data[o + 1] = Math.pow(tc.g, 1 / 2.2) * 255;
      img.data[o + 2] = Math.pow(tc.b, 1 / 2.2) * 255;
      img.data[o + 3] = 255;
    }
    lc.putImageData(img, 0, 0);
    c.imageSmoothingEnabled = true;
    c.drawImage(low, 0, 0, S, S);

    // plaża: gradient piasku
    const gr = c.createLinearGradient(0, Z(40), 0, Z(110));
    gr.addColorStop(0, 'rgba(222,203,160,0)');
    gr.addColorStop(0.12, 'rgba(226,207,165,1)');
    gr.addColorStop(0.45, 'rgba(214,190,145,1)');
    gr.addColorStop(0.5, 'rgba(170,150,112,1)');
    gr.addColorStop(1, 'rgba(120,108,84,1)');
    c.fillStyle = gr;
    c.fillRect(X(-450), Z(40), 900 * K, 70 * K);

    // ziarno
    const rnd = U.rng(77);
    for (let i = 0; i < S * 14; i++) {
      const x = rnd() * S, y = rnd() * S, r = rnd() * 2.2 * K / 3;
      c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
      c.fillRect(x, y, r, r);
    }

    const RX = this.ROADS_X, RZ = this.ROADS_Z, W = this.ROAD_W;
    const x0 = RX[0], x1 = RX[RX.length - 1], z0 = RZ[0], z1 = RZ[RZ.length - 1];
    // nawierzchnia działek (place, podwórka)
    const lots = City.lotPaint || [];
    for (const l of lots) {
      c.fillStyle = l.color;
      c.fillRect(X(l.x0), Z(l.z0), (l.x1 - l.x0) * K, (l.z1 - l.z0) * K);
      if (l.tiles) {
        c.strokeStyle = 'rgba(0,0,0,0.07)';
        c.lineWidth = Math.max(1, K * 0.08);
        for (let x = l.x0; x < l.x1; x += 2.5) { c.beginPath(); c.moveTo(X(x), Z(l.z0)); c.lineTo(X(x), Z(l.z1)); c.stroke(); }
        for (let z = l.z0; z < l.z1; z += 2.5) { c.beginPath(); c.moveTo(X(l.x0), Z(z)); c.lineTo(X(l.x1), Z(z)); c.stroke(); }
      }
      if (l.path) {
        c.strokeStyle = '#c9b990';
        c.lineWidth = 2.2 * K;
        c.beginPath();
        c.moveTo(X(l.x0), Z(l.z0)); c.lineTo(X(l.x1), Z(l.z1));
        c.moveTo(X(l.x1), Z(l.z0)); c.lineTo(X(l.x0), Z(l.z1));
        c.stroke();
        c.beginPath();
        c.arc(X((l.x0 + l.x1) / 2), Z((l.z0 + l.z1) / 2), 6 * K, 0, Math.PI * 2);
        c.stroke();
      }
    }
    // promenada
    c.fillStyle = '#b08a5e';
    c.fillRect(X(x0 - 40), Z(36), (x1 - x0 + 80) * K, 9 * K);
    c.strokeStyle = 'rgba(60,40,20,0.25)';
    c.lineWidth = Math.max(1, K * 0.1);
    for (let x = x0 - 40; x < x1 + 40; x += 1.2) { c.beginPath(); c.moveTo(X(x), Z(36)); c.lineTo(X(x), Z(45)); c.stroke(); }

    // chodniki
    c.fillStyle = '#a7a59d';
    for (const x of RX) c.fillRect(X(x - W / 2), Z(z0 - W / 2), W * K, (z1 - z0 + W) * K);
    for (const z of RZ) c.fillRect(X(x0 - W / 2), Z(z - W / 2), (x1 - x0 + W) * K, W * K);
    // jezdnie
    const aw = 7;
    c.fillStyle = '#3b3e44';
    for (const x of RX) c.fillRect(X(x - aw / 2), Z(z0 - aw / 2), aw * K, (z1 - z0 + aw) * K);
    for (const z of RZ) c.fillRect(X(x0 - aw / 2), Z(z - aw / 2), (x1 - x0 + aw) * K, aw * K);
    // przetarcia asfaltu
    for (let i = 0; i < 1400; i++) {
      const horiz = rnd() < 0.5;
      const along = horiz ? U.lerp(x0, x1, rnd()) : U.lerp(z0, z1, rnd());
      const line = horiz ? RZ[Math.floor(rnd() * RZ.length)] : RX[Math.floor(rnd() * RX.length)];
      const off = (rnd() - 0.5) * aw;
      c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.04)';
      const r = (0.4 + rnd() * 1.6) * K;
      if (horiz) c.fillRect(X(along), Z(line + off), r * 2, r);
      else c.fillRect(X(line + off), Z(along), r, r * 2);
    }
    // oznakowanie poziome
    c.strokeStyle = 'rgba(240,240,230,0.75)';
    c.lineWidth = 0.18 * K;
    c.setLineDash([3 * K, 3 * K]);
    for (const x of RX) {
      for (let k = 0; k < RZ.length - 1; k++) {
        c.beginPath(); c.moveTo(X(x), Z(RZ[k] + 6)); c.lineTo(X(x), Z(RZ[k + 1] - 6)); c.stroke();
      }
    }
    for (const z of RZ) {
      for (let k = 0; k < RX.length - 1; k++) {
        c.beginPath(); c.moveTo(X(RX[k] + 6), Z(z)); c.lineTo(X(RX[k + 1] - 6), Z(z)); c.stroke();
      }
    }
    c.setLineDash([]);
    // przejścia dla pieszych
    c.fillStyle = 'rgba(245,245,240,0.8)';
    for (const x of RX) for (const z of RZ) {
      for (let s = -2.6; s <= 2.6; s += 1.3) {
        c.fillRect(X(x + s - 0.35), Z(z - 6.2), 0.7 * K, 1.8 * K);
        c.fillRect(X(x + s - 0.35), Z(z + 4.4), 0.7 * K, 1.8 * K);
        c.fillRect(X(x - 6.2), Z(z + s - 0.35), 1.8 * K, 0.7 * K);
        c.fillRect(X(x + 4.4), Z(z + s - 0.35), 1.8 * K, 0.7 * K);
      }
    }
    // fundamenty budynków (ciemniejsze płyty)
    for (const f of (City.footprints || [])) {
      c.fillStyle = 'rgba(70,68,64,0.9)';
      c.fillRect(X(f.x - f.w / 2 - 0.6), Z(f.z - f.d / 2 - 0.6), (f.w + 1.2) * K, (f.d + 1.2) * K);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  },

  /* Ruch gruntu: przesunięcie wierzchołków siatki terenu. */
  updateGround() {
    const g = this.groundGeo, pos = g.attributes.position.array, base = this.gBase, tap = this.gTaper;
    const active = Quake.events.length > 0;
    if (!active) {
      if (this.groundDirty) {
        pos.set(base);
        g.attributes.position.needsUpdate = true;
        this.gridNormals(g, this.gW, this.gW, ...this.gRect);
        this.groundDirty = false;
      }
      return;
    }
    const T = Quake.T, sMin = Quake.sMin, n = Quake.n, Ex = Quake.E.x, Ez = Quake.E.z;
    const cnt = tap.length;
    for (let k = 0; k < cnt; k++) {
      const t = tap[k];
      const o = k * 3;
      if (t <= 0) continue;
      const x = base[o], z = base[o + 2];
      const ex = x - Ex, ez = z - Ez;
      const s = Math.sqrt(ex * ex + ez * ez) || 1;
      const f = (s - sMin);
      const i = f | 0;
      if (i < 0 || i >= n - 1) { pos[o] = x; pos[o + 1] = base[o + 1]; pos[o + 2] = z; continue; }
      const kk = f - i;
      const dl = T.dl[i] + (T.dl[i + 1] - T.dl[i]) * kk;
      const dt = T.dt[i] + (T.dt[i + 1] - T.dt[i]) * kk;
      const dy = T.dy[i] + (T.dy[i + 1] - T.dy[i]) * kk;
      const rx = ex / s, rz = ez / s;
      pos[o] = x + (rx * dl - rz * dt) * t;
      pos[o + 1] = base[o + 1] + dy * t;
      pos[o + 2] = z + (rz * dl + rx * dt) * t;
    }
    g.attributes.position.needsUpdate = true;
    this.gridNormals(g, this.gW, this.gW, ...this.gRect);
    this.groundDirty = true;
  },

  /* ------------------------------------------------------------------ morze */
  buildSea() {
    const NX = 170, NZ = 130;
    const cnt = (NX + 1) * (NZ + 1);
    const pos = new Float32Array(cnt * 3), col = new Float32Array(cnt * 3), uv = new Float32Array(cnt * 2);
    this.sBase = new Float32Array(cnt * 3);   // x, wysokość dna, z
    this.sTaper = new Float32Array(cnt);
    this.sHidden = new Uint8Array(cnt);
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const k = j * (NX + 1) + i;
      const u = i / NX * 2 - 1, v = j / NZ;
      const x = this.remap(u, 450, 2550);
      const z = -200 + 650 * v + 2550 * Math.pow(v, 5);
      const h = this.baseHeight(x, z);
      this.sBase[k * 3] = x; this.sBase[k * 3 + 1] = h; this.sBase[k * 3 + 2] = z;
      this.sTaper[k] = 1 - U.smooth(380, 720, Math.hypot(x - Quake.center.x, z - Quake.center.z));
      // wnętrze obszaru symulacji: tę wodę rysuje Flood, tu chowamy siatkę pod dnem
      const hid = i > this.SIM_I0 && i < this.SIM_I1 && j < this.SIM_J1;
      this.sHidden[k] = hid ? 1 : 0;
      pos[k * 3] = x; pos[k * 3 + 1] = hid ? h - 3 : 0; pos[k * 3 + 2] = z;
      uv[k * 2] = x / 70; uv[k * 2 + 1] = z / 70;
    }
    const idx = new Uint32Array(NX * NZ * 6);
    let q = 0;
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1;
      idx[q++] = a; idx[q++] = c; idx[q++] = b;
      idx[q++] = b; idx[q++] = c; idx[q++] = d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(cnt * 3), 3).setUsage(THREE.DynamicDrawUsage));
    for (let k = 0; k < cnt; k++) g.attributes.normal.array[k * 3 + 1] = 1;
    this.seaGeo = g;
    this.seaNX = NX;
    this.seaNZ = NZ;
    // tylko ta część morza może się zmieniać (fala, cofanie, drgania)
    let si1 = 0, sj1 = 0, si0 = NX;
    for (let k = 0; k < cnt; k++) {
      const x = this.sBase[k * 3], z = this.sBase[k * 3 + 2];
      if (Math.abs(x) < 900 && z < 1150) { const i = k % (NX + 1), j = (k / (NX + 1)) | 0; si0 = Math.min(si0, i); si1 = Math.max(si1, i); sj1 = Math.max(sj1, j); }
    }
    this.sRect = [Math.max(0, si0 - 1), Math.min(NX, si1 + 1), 0, Math.min(NZ, sj1 + 1)];
    this.seaNormal = this.makeWaterNormal();
    this.seaMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, vertexColors: true, roughness: 0.1, metalness: 0.1,
      normalMap: this.seaNormal, normalScale: new THREE.Vector2(0.28, 0.28)
    });
    this.sea = new THREE.Mesh(g, this.seaMat);
    this.sea.userData.ownEnv = true;
    this.sea.receiveShadow = true;
    this.sea.name = 'sea';
    this.scene.add(this.sea);
    this.seaColorsDirty = true;
  },

  makeWaterNormal() {
    const S = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d');
    const img = c.createImageData(S, S);
    // okresowy szum z sumy fal o losowych kierunkach (bezszwowe kafelkowanie, bez kratki)
    const waves = [];
    const rr = U.rng(5);
    for (let k = 0; k < 28; k++) {
      let fx = 0, fy = 0;
      while (fx === 0 && fy === 0) { fx = Math.round((rr() * 2 - 1) * (2 + k * 0.6)); fy = Math.round((rr() * 2 - 1) * (2 + k * 0.6)); }
      waves.push([fx, fy, rr() * 6.283, 1 / Math.pow(Math.hypot(fx, fy), 1.2)]);
    }
    const hgt = (i, j) => {
      const x = i / S, y = j / S;
      let h = 0;
      for (const [fx, fy, ph, a] of waves) h += Math.sin((x * fx + y * fy) * 6.283 + ph) * a;
      return h;
    };
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const dx = hgt(i + 1, j) - hgt(i - 1, j), dy = hgt(i, j + 1) - hgt(i, j - 1);
      const nx = -dx * 1.6, ny = -dy * 1.6, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const o = (j * S + i) * 4;
      img.data[o] = (nx / l * 0.5 + 0.5) * 255;
      img.data[o + 1] = (ny / l * 0.5 + 0.5) * 255;
      img.data[o + 2] = (nz / l * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  },

  updateSea(time) {
    const g = this.seaGeo, pos = g.attributes.position.array, col = g.attributes.color.array, base = this.sBase, hid = this.sHidden;
    const W = this.seaNX + 1;
    const [ri0, ri1, rj0, rj1] = this.seaColorsDirty ? [0, this.seaNX, 0, this.seaNZ] : this.sRect;
    const ts = Quake.tsunami && Quake.tsunami.tau >= 0 && !Quake.tsunami.done ? Quake.tsunami : null;
    const quakeOn = Quake.events.length > 0;
    const T = Quake.T, sMin = Quake.sMin, n = Quake.n, Ex = Quake.E.x, Ez = Quake.E.z;
    const wb = this.waterBase || new THREE.Color(0x23506e);
    // bez trzęsienia i tsunami woda jest płaska – ruch daje przesuwana mapa normalnych
    if (!ts && !quakeOn && !this._tsWas && !this.seaColorsDirty && !this.seaMoved) {
      this.seaNormal.offset.set(time * 0.012, time * 0.008);
      return;
    }
    this.seaMoved = !!(ts || quakeOn);
    const colorsNeeded = this.seaColorsDirty || ts || this._tsWas;
    this._tsWas = !!ts;
    for (let j = rj0; j <= rj1; j++) for (let i = ri0; i <= ri1; i++) {
      const k = j * W + i;
      if (hid[k]) continue;
      const o = k * 3;
      const x = base[o], bed = base[o + 1], z = base[o + 2];
      let eta = 0, foam = 0;
      if (ts) {
        eta = ts.farLevel(x, z);
        if (colorsNeeded) foam = ts.farFoam(x, z);
      }
      if (quakeOn && this.sTaper[k] > 0) {
        const ex = x - Ex, ez = z - Ez;
        const s = Math.sqrt(ex * ex + ez * ez);
        const f = s - sMin, ii = f | 0;
        if (ii >= 0 && ii < n - 1) eta += (T.dy[ii] + (T.dy[ii + 1] - T.dy[ii]) * (f - ii)) * this.sTaper[k];
      }
      const wet = bed < eta - 0.02;
      pos[o + 1] = wet ? eta : Math.min(eta, bed - 2.5);
      if (colorsNeeded) {
        const depth = Math.max(0, eta - bed);
        const shallow = 1 - U.smooth(0, 9, depth);
        let r = wb.r + shallow * 0.05, gg = wb.g + shallow * 0.16, b = wb.b + shallow * 0.12;
        r = U.lerp(r, 0.92, foam); gg = U.lerp(gg, 0.95, foam); b = U.lerp(b, 0.96, foam);
        col[o] = r; col[o + 1] = gg; col[o + 2] = b;
      }
    }
    g.attributes.position.needsUpdate = true;
    if (colorsNeeded) {
      g.attributes.color.needsUpdate = true;
      this.seaColorsDirty = false;
    }
    this.gridNormals(g, W, this.seaNZ + 1, ri0, ri1, rj0, rj1);
    this.seaNormal.offset.set(time * 0.012, time * 0.008);
  }
};
