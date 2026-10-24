'use strict';
/* Tsunami przy brzegu i w mieście: symulacja płytkiej wody na siatce ok. 3 × 3 m.
   Równania płytkiej wody (prędkości na krawędziach komórek, strumień z komórki „pod prąd”,
   tarcie Manninga). Woda płynie ulicami, omija budynki, przelewa się przez falochron, porywa
   łodzie, auta i szczątki, a potem spływa do morza. Na granicy morskiej wchodzi fala z harmonogramu
   Tsunami (quake.js); dalej od brzegu morze rysuje World.updateSea. */

const _fl = { u: 0, w: 0 };
const _fload = { d: 0, f: 0, fx: 0, fz: 0, x: 0, z: 0 };

const Flood = {
  SPEED: 2.0,         // sekundy symulacji na sekundę animacji (czas jest skrócony jak w całym symulatorze)
  AMP: 0.45,          // wysokość fali na granicy morskiej względem H z prognozy
  G: 9.81,
  EPS: 0.01,
  SHORE: 75,
  CITY: { x0: -200, x1: 200, z0: -190, z1: 46 },
  active: false,
  wallH: 0,

  /* ------------------------------------------------------------ budowa */
  init(scene) {
    this.scene = scene;
    // granice dokładnie na liniach siatki morza – morze poza obszarem przejmuje rysowanie bez szwu
    const W = World.seaNX + 1, sb = World.sBase;
    this.X0 = sb[(0 * W + World.SIM_I0) * 3];
    this.X1 = sb[(0 * W + World.SIM_I1) * 3];
    this.Z1 = sb[(World.SIM_J1 * W) * 3 + 2];
    this.Z0 = -240;
    this.NX = Math.round((this.X1 - this.X0) / 3);
    this.NZ = Math.round((this.Z1 - this.Z0) / 3);
    this.DX = (this.X1 - this.X0) / this.NX;
    this.DZ = (this.Z1 - this.Z0) / this.NZ;
    const NX = this.NX, NZ = this.NZ, N = NX * NZ;
    const F = n => new Float32Array(n);
    this.bed0 = F(N); this.bed = F(N); this.h = F(N);
    this.u = F((NX + 1) * NZ); this.w = F(NX * (NZ + 1));
    this.u2 = F((NX + 1) * NZ); this.w2 = F(NX * (NZ + 1));
    this.fu = F((NX + 1) * NZ); this.fw = F(NX * (NZ + 1));
    this.scl = F(N); this.n2 = F(N); this.n2base = F(N); this.kf = F(N);
    this.foam = F(N); this.tmp = F(N); this.turb = F(N);
    this.hmax = F(N); this.dryT = F(N);
    this.edgeW = F(NZ); this.edgeE = F(NZ);
    this.solid = new Uint8Array(N); this.land = new Uint8Array(N);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const c = j * NX + i;
      const x = this.X0 + (i + 0.5) * this.DX, z = this.Z0 + (j + 0.5) * this.DZ;
      const b = World.baseHeight(x, z);
      this.bed0[c] = b;
      this.land[c] = b > 0.25 ? 1 : 0;
      // tarcie: morze gładkie, plaża, miasto (krawężniki, ogrodzenia, drobne przeszkody)
      const city = x > -200 && x < 200 && z > -190 && z < 46;
      const n = b < 0 ? 0.022 : city ? 0.04 : 0.03;
      this.n2base[c] = n * n;
    }
    // falochron: rząd komórek tuż przed promenadą
    this.wallJ = Math.floor((51.5 - this.Z0) / this.DZ);
    this.wallZ = this.Z0 + (this.wallJ + 0.5) * this.DZ;
    this.buildMesh(scene);
    this.buildMud(scene);
    this.wallGroup = new THREE.Group();
    scene.add(this.wallGroup);
    this.wallMat = new THREE.MeshStandardMaterial({ color: 0xb2aea4, roughness: 0.92, metalness: 0 });
    Debris.init(scene);
    this.reset();
  },

  buildMesh(scene) {
    const NX = this.NX, NZ = this.NZ, N = NX * NZ;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 4), uv = new Float32Array(N * 2), flow = new Float32Array(N * 4);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      // skrajne wierzchołki leżą na granicy obszaru (styk z siatką morza)
      const x = i === 0 ? this.X0 : i === NX - 1 ? this.X1 : this.X0 + (i + 0.5) * this.DX;
      const z = j === 0 ? this.Z0 : j === NZ - 1 ? this.Z1 : this.Z0 + (j + 0.5) * this.DZ;
      pos[k * 3] = x; pos[k * 3 + 2] = z;
      uv[k * 2] = x / 70; uv[k * 2 + 1] = z / 70;
    }
    const idx = new Uint32Array((NX - 1) * (NZ - 1) * 6);
    let q = 0;
    for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
      const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1;
      idx[q++] = a; idx[q++] = c; idx[q++] = b;
      idx[q++] = b; idx[q++] = c; idx[q++] = d;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('aFlow', new THREE.BufferAttribute(flow, 4).setUsage(THREE.DynamicDrawUsage));
    const nrm = new Float32Array(N * 3);
    for (let k = 0; k < N; k++) nrm[k * 3 + 1] = 1;
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, (this.Z0 + this.Z1) / 2), 900);
    this.geo = g;
    this.uTime = { value: 0 };
    const mat = this.mat = new THREE.MeshStandardMaterial({
      color: 0xffffff, vertexColors: true, roughness: 0.1, metalness: 0.1, transparent: true,
      normalMap: World.seaNormal, normalScale: new THREE.Vector2(0.28, 0.28)
    });
    const foamTex = this.makeFoamTex();
    mat.onBeforeCompile = sh => {
      sh.uniforms.uTime = this.uTime;
      sh.uniforms.uFoamTex = { value: foamTex };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aFlow;\nvarying vec4 vFlow;\nvarying vec2 vWXZ;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlow = aFlow;\nvWXZ = (modelMatrix * vec4(position, 1.0)).xz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform sampler2D uFoamTex;\nvarying vec4 vFlow;\nvarying vec2 vWXZ;\nfloat gFoam = 0.0;')
        // piana płynie z nurtem (dwie przesunięte w fazie próbki – bez skoków tekstury)
        .replace('#include <color_fragment>', `#include <color_fragment>
          {
            vec2 fl = vFlow.xy;
            float p0 = fract(uTime * 0.33), p1 = fract(uTime * 0.33 + 0.5);
            float wb = abs(p0 - 0.5) * 2.0;
            vec2 bs = vWXZ / 17.0;
            float f0 = texture2D(uFoamTex, bs - fl * (p0 * 3.0 / 17.0)).r;
            float f1 = texture2D(uFoamTex, bs + vec2(0.37, 0.61) - fl * (p1 * 3.0 / 17.0)).r;
            float ft = mix(f0, f1, wb);
            float fo = clamp(vFlow.z, 0.0, 1.0) * 0.72;
            gFoam = smoothstep(1.0 - fo, 1.0 - fo + 0.22, ft) * smoothstep(0.02, 0.15, fo);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.93, 0.94), gFoam);
            diffuseColor.a = mix(diffuseColor.a, max(diffuseColor.a, 0.96), gFoam * step(0.02, diffuseColor.a));
          }`)
        // mętna woda z mułem nie jest lustrem
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.32, clamp(vFlow.w, 0.0, 1.0));\nroughnessFactor = mix(roughnessFactor, 0.85, gFoam);')
        // fale na powierzchni płyną z nurtem, a w rwącej wodzie robi się drobna kipiel
        .replace('#include <normal_fragment_maps>', `
          {
            vec2 fl = vFlow.xy;
            float p0 = fract(uTime * 0.33), p1 = fract(uTime * 0.33 + 0.5);
            float wb = abs(p0 - 0.5) * 2.0;
            vec2 sh = fl * (3.0 / 70.0);
            vec3 n0 = texture2D(normalMap, vNormalMapUv - sh * p0).xyz * 2.0 - 1.0;
            vec3 n1 = texture2D(normalMap, vNormalMapUv + vec2(0.5) - sh * p1).xyz * 2.0 - 1.0;
            vec3 mapN = mix(n0, n1, wb);
            float sp = length(fl);
            vec3 nA = texture2D(normalMap, vNormalMapUv * 4.3 - fl * (p0 * 3.0 / 16.0)).xyz * 2.0 - 1.0;
            vec3 nB = texture2D(normalMap, vNormalMapUv * 4.3 + vec2(0.3) - fl * (p1 * 3.0 / 16.0)).xyz * 2.0 - 1.0;
            vec3 n2 = mix(nA, nB, wb);
            mapN.xy = mapN.xy * normalScale + n2.xy * clamp(sp * 0.09, 0.0, 0.6);
            mapN.xy *= 1.0 - gFoam * 0.6;
            normal = normalize(tbn * mapN);
          }`);
    };
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.userData.ownEnv = true;
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 1.5;
    this.mesh.name = 'flood';
    scene.add(this.mesh);
  },

  /* Okresowa tekstura piany: koronka na krawędziach komórek (jak piana na fali) i gęstsze kłaczki.
     Najjaśniejsze są nitki koronki – przy małej ilości piany widać tylko je. */
  makeFoamTex() {
    const S = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d');
    const img = c.createImageData(S, S);
    const rr = U.rng(31);
    const pts = [];
    for (let k = 0; k < 56; k++) pts.push([rr() * S, rr() * S]);
    const waves = [];
    for (let k = 0; k < 24; k++) {
      let fx = 0, fy = 0;
      while (fx === 0 && fy === 0) { fx = Math.round((rr() * 2 - 1) * (2 + k * 0.5)); fy = Math.round((rr() * 2 - 1) * (2 + k * 0.5)); }
      waves.push([fx, fy, rr() * 6.283, 1 / Math.hypot(fx, fy)]);
    }
    const blob = new Float32Array(S * S);
    let lo = 1e9, hi = -1e9;
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      let v = 0;
      for (const [fx, fy, ph, a] of waves) v += Math.sin((i / S * fx + j / S * fy) * 6.283 + ph) * a;
      blob[j * S + i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      let f1 = 1e9, f2 = 1e9;
      for (const [px, py] of pts) {
        let dx = Math.abs(i - px), dy = Math.abs(j - py);
        if (dx > S / 2) dx = S - dx;
        if (dy > S / 2) dy = S - dy;
        const d = dx * dx + dy * dy;
        if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
      }
      const edge = Math.sqrt(f2) - Math.sqrt(f1);
      const lace = 1 - U.smooth(0, 5, edge);
      const bl = (blob[j * S + i] - lo) / (hi - lo);
      const v = Math.max(lace, Math.pow(bl, 1.3) * 0.8);
      const o = (j * S + i) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = v * 255;
      img.data[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  },

  /* Ślad po zalewie: muł na ziemi tam, dokąd doszła woda (ciemny i mokry, potem przesycha). */
  buildMud(scene) {
    const NX = this.NX, NZ = this.NZ, N = NX * NZ;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 4);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      const x = this.X0 + (i + 0.5) * this.DX, z = this.Z0 + (j + 0.5) * this.DZ;
      // na stromszym dnie morza siatka gruntu jest rzadsza – unosimy muł, żeby nie chował się pod nią
      pos[k * 3] = x; pos[k * 3 + 1] = this.bed0[k] + (this.bed0[k] < 0.5 ? 0.3 : 0.04); pos[k * 3 + 2] = z;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(this.geo.index);
    g.computeVertexNormals();
    this.mudGeo = g;
    this.mudMesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      vertexColors: true, transparent: true, depthWrite: false, roughness: 0.75, metalness: 0,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    }));
    this.mudMesh.receiveShadow = true;
    this.mudMesh.renderOrder = 1;
    this.mudMesh.visible = false;
    scene.add(this.mudMesh);
  },

  /* ------------------------------------------------------------ stan */
  reset() {
    const N = this.NX * this.NZ;
    this.bed.set(this.bed0);
    this.n2.set(this.n2base);
    this.solid.fill(0);
    this.u.fill(0); this.w.fill(0);
    this.foam.fill(0); this.turb.fill(0); this.hmax.fill(0); this.dryT.fill(0);
    this.applyWall();
    for (let c = 0; c < N; c++) this.h[c] = Math.max(0, -this.bed[c]);
    this.active = false;
    this.simT = 0;
    this.calmT = 0;
    this.maxC = 5;
    this.spray = [];
    this.roar = 0;
    this.focus = { x: 0, z: this.SHORE, ok: false };
    this.resetStats();
    this.mudMesh.visible = false;
    this.mudDirty = false;
    this.meshDirty = true;
    Debris.reset();
  },

  resetStats() {
    this.stats = { maxDepthCity: 0, inland: 0, maxSpeed: 0, overtopped: false, breached: 0, waves: 0 };
  },

  /* Budynki stojące są przeszkodą; zawalone – stertą gruzu, przez którą woda przepływa z oporem. */
  bindBuildings() {
    const NX = this.NX;
    for (const b of City.buildings) {
      const cells = [], ring = [];
      const ci0 = Math.floor((b.x - b.fw / 2 - this.X0) / this.DX), ci1 = Math.floor((b.x + b.fw / 2 - this.X0) / this.DX);
      const cj0 = Math.floor((b.z - b.fd / 2 - this.Z0) / this.DZ), cj1 = Math.floor((b.z + b.fd / 2 - this.Z0) / this.DZ);
      for (let j = cj0 - 1; j <= cj1 + 1; j++) for (let i = ci0 - 1; i <= ci1 + 1; i++) {
        if (i < 0 || j < 0 || i >= NX || j >= this.NZ) continue;
        const x = this.X0 + (i + 0.5) * this.DX, z = this.Z0 + (j + 0.5) * this.DZ;
        const inside = Math.abs(x - b.x) < b.fw / 2 - 0.2 && Math.abs(z - b.z) < b.fd / 2 - 0.2;
        if (inside) cells.push(j * NX + i);
        else if (Math.abs(x - b.x) < b.fw / 2 + this.DX && Math.abs(z - b.z) < b.fd / 2 + this.DZ) ring.push(j * NX + i);
      }
      b.fCells = cells;
      b.fRing = ring;
      b.fSolid = true;
      b.fLoadT = 0;
      for (const c of cells) { this.solid[c] = 1; this.h[c] = 0; }
      const k = 0.8 + Math.random() * 0.45;
      // progi z grubsza jak po tsunami w Japonii w 2011 r.: domy drewniane od ~2 m wody, żelbet zwykle przetrwał
      b.fLimD = { house: 2.0, masonry: 4.6, belfry: 6.0, panel: 13, office: 17, tower: 99 }[b.type] * k;
      b.fLimF = { house: 9, masonry: 32, belfry: 45, panel: 170, office: 280, tower: 900 }[b.type] * k;
    }
  },

  syncObstacles() {
    for (const b of City.buildings) {
      if (!b.fSolid || !b.collapsed) continue;
      b.fSolid = false;
      for (const c of b.fCells) {
        this.solid[c] = 0;
        this.bed[c] = Math.max(this.bed[c], this.bed0[c] + 0.7);   // sterta gruzu
        this.n2[c] = 0.12 * 0.12;
        this.h[c] = 0;
      }
    }
  },

  /* ------------------------------------------------------------ falochron */
  setWall(H) {
    this.wallH = H;
    for (const s of (this.wallSegs || [])) this.wallGroup.remove(s.mesh);
    this.wallSegs = [];
    const NX = this.NX, j = this.wallJ;
    const crest = World.G0 + H;
    if (H > 0) {
      const SEG = 3;
      for (let i0 = 0; i0 < NX; i0 += SEG) {
        const i1 = Math.min(NX - 1, i0 + SEG - 1);
        let minB = 1e9, maxB = -1e9;
        for (let i = i0; i <= i1; i++) { const b = this.bed0[j * NX + i]; minB = Math.min(minB, b); maxB = Math.max(maxB, b); }
        if (minB >= crest) continue;      // teren wyżej niż korona – mur niepotrzebny
        const x0 = this.X0 + i0 * this.DX, x1 = this.X0 + (i1 + 1) * this.DX;
        const bot = minB - 1.2, hh = crest - bot;
        const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 0.12, hh, this.DZ * 0.92), this.wallMat);
        m.position.set((x0 + x1) / 2, bot + hh / 2, this.wallZ);
        m.castShadow = true;
        m.receiveShadow = true;
        this.wallGroup.add(m);
        this.wallSegs.push({ i0, i1, mesh: m, intact: true, t: 0, fall: 0, bot, hh, need: U.rand(2.5, 5) });
      }
    }
    this.bed.set(this.bed0);
    for (const b of City.buildings) if (b.fCells && !b.fSolid) for (const c of b.fCells) this.bed[c] = this.bed0[c] + 0.7;
    this.applyWall();
    const N = this.NX * this.NZ;
    if (!this.active) for (let c = 0; c < N; c++) if (!this.solid[c]) this.h[c] = Math.max(0, -this.bed[c]);
    World.shadowDirty = true;
  },

  applyWall() {
    if (!this.wallSegs) return;
    const NX = this.NX, j = this.wallJ, crest = World.G0 + this.wallH;
    for (const s of this.wallSegs) {
      if (!s.intact) continue;
      for (let i = s.i0; i <= s.i1; i++) {
        const c = j * NX + i;
        this.bed[c] = Math.max(this.bed0[c], crest);
        this.h[c] = 0;
      }
    }
  },

  /* Przelew przez koronę: jeśli długo i mocno, segment muru pęka i przewraca się w stronę lądu. */
  updateWall(dt) {
    if (!this.wallSegs || this.wallSegs.length === 0) return;
    const NX = this.NX, j = this.wallJ, h = this.h, w = this.w;
    for (const s of this.wallSegs) {
      if (s.intact) {
        let over = 0, vin = 0;
        for (let i = s.i0; i <= s.i1; i++) {
          const c = j * NX + i;
          over = Math.max(over, h[c]);
          vin = Math.max(vin, -w[j * NX + i]);
        }
        if (over > 0.4) this.stats.overtopped = true;
        if (over > 1.6 && vin > 3) s.t += dt * (over / 2);
        if (s.t > s.need) {
          s.intact = false;
          this.stats.breached++;
          for (let i = s.i0; i <= s.i1; i++) { const c = j * NX + i; this.bed[c] = this.bed0[c]; }
          _fv.set(s.mesh.position.x, World.G0 + this.wallH, this.wallZ);
          FX.impactDust(_fv, 9, 3, 0.6);
          Sound.crash(0.6, Main.panFor(_fv.x, _fv.z), Main.distFactor(_fv.x, _fv.z));
          if (this.stats.breached === 1) UI.toast('🧱 Fala przerwała falochron', 'alert');
        }
      } else if (s.fall < 1) {
        s.fall = Math.min(1, s.fall + dt * 0.6);
        const e = s.fall * s.fall;
        s.mesh.rotation.x = -1.35 * e;
        s.mesh.position.y = s.bot + s.hh / 2 - e * s.hh * 0.45;
        s.mesh.position.z = this.wallZ - e * s.hh * 0.4;
        World.shadowDirty = true;
      }
    }
  },

  /* ------------------------------------------------------------ próbkowanie */
  cellAt(x, z) {
    const i = Math.floor((x - this.X0) / this.DX), j = Math.floor((z - this.Z0) / this.DZ);
    if (i < 0 || j < 0 || i >= this.NX || j >= this.NZ) return -1;
    return j * this.NX + i;
  },
  depthAt(x, z) {
    if (!this.h) return 0;
    const c = this.cellAt(x, z);
    return c < 0 || this.solid[c] ? 0 : this.h[c];
  },
  /* poziom lustra wody (dwuliniowo, tylko z mokrych komórek); null – sucho */
  etaAt(x, z) {
    const fi = (x - this.X0) / this.DX - 0.5, fj = (z - this.Z0) / this.DZ - 0.5;
    const i = Math.floor(fi), j = Math.floor(fj);
    if (i < 0 || j < 0 || i >= this.NX - 1 || j >= this.NZ - 1) return null;
    const a = fi - i, b = fj - j, NX = this.NX;
    let s = 0, ws = 0;
    const add = (c, wt) => { if (wt > 0 && this.h[c] > this.EPS && !this.solid[c]) { s += (this.bed[c] + this.h[c]) * wt; ws += wt; } };
    add(j * NX + i, (1 - a) * (1 - b));
    add(j * NX + i + 1, a * (1 - b));
    add((j + 1) * NX + i, (1 - a) * b);
    add((j + 1) * NX + i + 1, a * b);
    return ws > 0.05 ? s / ws : null;
  },
  velAt(x, z, out) {
    out.u = 0; out.w = 0;
    const c = this.cellAt(x, z);
    if (c < 0) return out;
    const NX = this.NX, i = c % NX, j = (c / NX) | 0;
    out.u = 0.5 * (this.u[j * (NX + 1) + i] + this.u[j * (NX + 1) + i + 1]);
    out.w = 0.5 * (this.w[j * NX + i] + this.w[(j + 1) * NX + i]);
    return out;
  },
  /* Prędkość nurtu w czasie animacji (symulacja biegnie SPEED razy szybciej) – do unoszenia rzeczy. */
  drift(x, z, out) {
    this.velAt(x, z, out);
    out.u *= this.SPEED;
    out.w *= this.SPEED;
    return out;
  },
  solidAt(x, z) {
    const c = this.cellAt(x, z);
    if (c < 0) return false;
    if (this.solid[c]) return true;
    // korona falochronu też zatrzymuje pływające rzeczy, dopóki woda jej nie przykryje
    return this.wallH > 0 && ((c / this.NX) | 0) === this.wallJ && this.bed[c] > this.bed0[c] + 0.5 && this.h[c] < 0.8;
  },

  /* Obciążenie budynku: największa głębokość i „siła” przepływu h·v² w pierścieniu wokół obrysu. */
  buildingLoad(b) {
    const o = _fload;
    o.d = 0; o.f = 0; o.fx = 0; o.fz = 0;
    if (!this.active || !b.fRing) return o;
    const NX = this.NX, h = this.h;
    for (const c of b.fRing) {
      const d = h[c];
      if (d < 0.05) continue;
      const i = c % NX, j = (c / NX) | 0;
      const uc = 0.5 * (this.u[j * (NX + 1) + i] + this.u[j * (NX + 1) + i + 1]);
      const wc = 0.5 * (this.w[j * NX + i] + this.w[(j + 1) * NX + i]);
      const f = d * (uc * uc + wc * wc);
      if (d > o.d) o.d = d;
      if (f > o.f) { o.f = f; o.fx = uc; o.fz = wc; o.x = this.X0 + (i + 0.5) * this.DX; o.z = this.Z0 + (j + 0.5) * this.DZ; }
    }
    return o;
  },

  /* ------------------------------------------------------------ symulacja */
  update(dt, time) {
    const ts = Quake.tsunami && Quake.tsunami.tau >= -0.5 && !Quake.tsunami.done ? Quake.tsunami : null;
    if (ts) this.drainT = 0;
    if (ts && !this.active) {
      this.active = true;
      this.calmT = 0;
      this.resetStats();
      Debris.unmoor = false;
    }
    if (!this.active) return;
    this.syncObstacles();
    const dtSim = dt * this.SPEED;
    for (let j = 0; j < this.NZ; j++) {
      const e = ts ? ts.farLevel(this.X0, this.Z0 + (j + 0.5) * this.DZ) : 0;
      this.edgeW[j] = e; this.edgeE[j] = e;
    }
    if (dtSim > 0) {
      const dmax = 0.38 * Math.min(this.DX, this.DZ) / Math.max(4, this.maxC);
      const n = Math.min(8, Math.ceil(dtSim / dmax));
      const h = dtSim / n;
      for (let k = 0; k < n; k++) {
        const eIn = ts ? ts.etaIn(ts.tau + h * (k + 1 - n)) : 0;
        this.step(h, eIn);
      }
      this.simT += dtSim;
      this.post(dtSim, !!ts);
      this.updateWall(dtSim);
    }
    Debris.update(dt, time);
    this.spawnSpray(dt);
    // koniec: brak tsunami i woda się uspokoiła (albo długo spływa – wtedy zostaje jak jest)
    if (!ts) {
      this.drainT = (this.drainT || 0) + dt;
      this.calmT = this.maxV < 0.12 && this.landMax < 0.06 ? this.calmT + dt : 0;
      if (this.calmT > 1.5 || this.drainT > 100) {
        this.drainT = 0;
        this.active = false;
        this.meshDirty = true;
        this.spray.length = 0;
        this.roar = 0;
      }
    }
  },

  step(dt, eIn) {
    const NX = this.NX, NZ = this.NZ, DX = this.DX, DZ = this.DZ, g = this.G, EPS = this.EPS;
    const h = this.h, b = this.bed, S = this.solid, n2 = this.n2;
    const UW = NX + 1;
    this.advectVel(dt);
    const u = this.u, w = this.w, fu = this.fu, fw = this.fw;
    const vlim = Math.min(28, 0.5 * Math.min(DX, DZ) / dt);
    let maxC = 0;
    // współczynnik tarcia Manninga g·n²/h^(4/3) – raz na komórkę
    const kf = this.kf, N = NX * NZ;
    for (let c = 0; c < N; c++) {
      const hh = h[c] > 0.05 ? h[c] : 0.05;
      kf[c] = g * n2[c] / (hh * Math.cbrt(hh));
    }
    // przyspieszenie od różnicy poziomów wody + tarcie dna (krawędzie pionowe, oś x)
    for (let j = 0; j < NZ; j++) {
      const row = j * NX, urow = j * UW;
      for (let i = 1; i < NX; i++) {
        const l = row + i - 1, r = l + 1, k = urow + i;
        if (S[l] || S[r]) { u[k] = 0; continue; }
        const hl = h[l], hr = h[r];
        if (hl < EPS && hr < EPS) { u[k] = 0; continue; }
        const el = b[l] + hl, er = b[r] + hr;
        if ((hl < EPS && b[l] > er) || (hr < EPS && b[r] > el)) { u[k] = 0; continue; }
        let v = u[k] - g * dt * (er - el) / DX;
        v /= 1 + dt * 0.5 * (kf[l] + kf[r]) * Math.abs(v);
        u[k] = v > vlim ? vlim : v < -vlim ? -vlim : v;
      }
    }
    // to samo dla krawędzi poziomych (oś z)
    for (let i = 0; i < NX; i++) w[i] = 0;
    for (let j = 1; j < NZ; j++) {
      const row = j * NX;
      for (let i = 0; i < NX; i++) {
        const c0 = row - NX + i, c1 = row + i, k = row + i;
        if (S[c0] || S[c1]) { w[k] = 0; continue; }
        const h0 = h[c0], h1 = h[c1];
        if (h0 < EPS && h1 < EPS) { w[k] = 0; continue; }
        const e0 = b[c0] + h0, e1 = b[c1] + h1;
        if ((h0 < EPS && b[c0] > e1) || (h1 < EPS && b[c1] > e0)) { w[k] = 0; continue; }
        let v = w[k] - g * dt * (e1 - e0) / DZ;
        v /= 1 + dt * 0.5 * (kf[c0] + kf[c1]) * Math.abs(v);
        w[k] = v > vlim ? vlim : v < -vlim ? -vlim : v;
      }
    }
    // granica morska: fala wchodzi, odbita swobodnie wychodzi (warunek Flathera)
    const top = NZ * NX, lastRow = (NZ - 1) * NX;
    for (let i = 0; i < NX; i++) {
      const c = lastRow + i;
      const d0 = Math.max(2, -b[c]);
      const cc = Math.sqrt(g * d0);
      const wb = (cc / d0) * (b[c] + h[c] - 2 * eIn);
      w[top + i] = wb;
      const hOut = Math.max(0, eIn - b[c]);
      fw[top + i] = wb > 0 ? wb * h[c] : wb * hOut;
    }
    // strumienie (głębokość z komórki „pod prąd”)
    for (let j = 0; j < NZ; j++) {
      const row = j * NX, urow = j * UW;
      for (let i = 1; i < NX; i++) {
        const v = u[urow + i];
        fu[urow + i] = v > 0 ? v * h[row + i - 1] : v * h[row + i];
      }
    }
    // boki obszaru: otwarte – nadmiar wody odpływa wzdłuż wybrzeża, morze z zewnątrz może wpłynąć
    const eW = this.edgeW, eE = this.edgeE;
    for (let j = 0; j < NZ; j++) {
      const urow = j * UW;
      for (let side = 0; side < 2; side++) {
        const c = j * NX + (side ? NX - 1 : 0), k = urow + (side ? NX : 0);
        const hc = S[c] ? 0 : h[c], hx = Math.max(0, (side ? eE[j] : eW[j]) - b[c]);
        if (hc < EPS && hx < EPS) { u[k] = 0; fu[k] = 0; continue; }
        const d = Math.max(0.5, hc, hx);
        let vout = Math.sqrt(g / d) * (hc - hx);
        vout = vout > vlim ? vlim : vout < -vlim ? -vlim : vout;
        const f = vout > 0 ? vout * hc : vout * hx;
        u[k] = side ? vout : -vout;
        fu[k] = side ? f : -f;
      }
    }
    for (let i = 0; i < NX; i++) fw[i] = 0;
    for (let j = 1; j < NZ; j++) {
      const row = j * NX;
      for (let i = 0; i < NX; i++) {
        const v = w[row + i];
        fw[row + i] = v > 0 ? v * h[row - NX + i] : v * h[row + i];
      }
    }
    // ogranicznik: z komórki nie może wypłynąć więcej wody, niż w niej jest
    const scl = this.scl;
    for (let j = 0; j < NZ; j++) {
      const row = j * NX, urow = j * UW;
      for (let i = 0; i < NX; i++) {
        const c = row + i;
        const out = dt * ((Math.max(0, fu[urow + i + 1]) - Math.min(0, fu[urow + i])) / DX
          + (Math.max(0, fw[c + NX]) - Math.min(0, fw[c])) / DZ);
        scl[c] = out > h[c] && out > 0 ? h[c] / out : 1;
      }
    }
    for (let j = 0; j < NZ; j++) {
      const row = j * NX, urow = j * UW;
      for (let i = 1; i < NX; i++) {
        const k = urow + i, f = fu[k];
        if (f !== 0) fu[k] = f * (f > 0 ? scl[row + i - 1] : scl[row + i]);
      }
      if (fu[urow] < 0) fu[urow] *= scl[row];
      if (fu[urow + NX] > 0) fu[urow + NX] *= scl[row + NX - 1];
    }
    for (let j = 1; j < NZ; j++) {
      const row = j * NX;
      for (let i = 0; i < NX; i++) {
        const k = row + i, f = fw[k];
        if (f !== 0) fw[k] = f * (f > 0 ? scl[row - NX + i] : scl[row + i]);
      }
    }
    for (let i = 0; i < NX; i++) if (fw[top + i] > 0) fw[top + i] *= scl[lastRow + i];
    // bilans masy
    let maxV = 0;
    for (let j = 0; j < NZ; j++) {
      const row = j * NX, urow = j * UW;
      for (let i = 0; i < NX; i++) {
        const c = row + i;
        if (S[c]) { h[c] = 0; continue; }
        let hn = h[c] + dt * ((fu[urow + i] - fu[urow + i + 1]) / DX + (fw[c] - fw[c + NX]) / DZ);
        if (hn < 0) hn = 0;
        h[c] = hn;
        if (hn > EPS) {
          const vu = Math.abs(u[urow + i]) + Math.abs(w[c]);
          const cc = vu + Math.sqrt(g * hn);
          if (cc > maxC) maxC = cc;
          if (vu > maxV) maxV = vu;
        }
      }
    }
    this.maxC = maxC;
  },

  /* Unoszenie prędkości z prądem (półlagranżowsko, dwuliniowo). */
  advectVel(dt) {
    const NX = this.NX, NZ = this.NZ, UW = NX + 1, EPS = this.EPS;
    const u = this.u, w = this.w, u2 = this.u2, w2 = this.w2, h = this.h;
    const kx = dt / this.DX, kz = dt / this.DZ;
    for (let j = 0; j < NZ; j++) {
      const jb = j > 0 ? j : 1, jt = j < NZ - 1 ? j + 1 : NZ - 1;
      for (let i = 1; i < NX; i++) {
        const k = j * UW + i, v = u[k];
        const l = j * NX + i - 1;
        if (v === 0 || (h[l] < EPS && h[l + 1] < EPS)) { u2[k] = v; continue; }
        const wv = 0.25 * (w[jb * NX + i - 1] + w[jb * NX + i] + w[jt * NX + i - 1] + w[jt * NX + i]);
        let fi = i - v * kx, fj = j - wv * kz;
        if (fi < 0) fi = 0; else if (fi > NX - 0.001) fi = NX - 0.001;
        if (fj < 0) fj = 0; else if (fj > NZ - 1.001) fj = NZ - 1.001;
        const ii = fi | 0, jj = fj | 0, a = fi - ii, bb = fj - jj, q = jj * UW + ii;
        u2[k] = (u[q] * (1 - a) + u[q + 1] * a) * (1 - bb) + (u[q + UW] * (1 - a) + u[q + UW + 1] * a) * bb;
      }
    }
    for (let j = 1; j < NZ; j++) {
      for (let i = 0; i < NX; i++) {
        const k = j * NX + i, v = w[k];
        if (v === 0 || (h[k - NX] < EPS && h[k] < EPS)) { w2[k] = v; continue; }
        const uv = 0.25 * (u[(j - 1) * UW + i] + u[(j - 1) * UW + i + 1] + u[j * UW + i] + u[j * UW + i + 1]);
        let fi = i - uv * kx, fj = j - v * kz;
        if (fi < 0) fi = 0; else if (fi > NX - 1.001) fi = NX - 1.001;
        if (fj < 0) fj = 0; else if (fj > NZ - 0.001) fj = NZ - 0.001;
        const ii = fi | 0, jj = fj | 0, a = fi - ii, bb = fj - jj, q = jj * NX + ii;
        w2[k] = (w[q] * (1 - a) + w[q + 1] * a) * (1 - bb) + (w[q + NX] * (1 - a) + w[q + NX + 1] * a) * bb;
      }
    }
    for (let j = 0; j < NZ; j++) for (let i = 1; i < NX; i++) u[j * UW + i] = u2[j * UW + i];
    for (let j = 1; j < NZ; j++) for (let i = 0; i < NX; i++) w[j * NX + i] = w2[j * NX + i];
  },

  /* Po krokach: piana, zmącenie, ślady zalewu, statystyki, punkt „czoła fali” dla kamery. */
  post(dt, forcing) {
    const NX = this.NX, NZ = this.NZ, DX = this.DX, DZ = this.DZ, UW = NX + 1, EPS = this.EPS;
    const h = this.h, b = this.bed, u = this.u, w = this.w, S = this.solid, L = this.land;
    const foam = this.foam, turb = this.turb, tmp = this.tmp;
    const decay = Math.exp(-dt / 2.5);
    const st = this.stats, C = this.CITY;
    let maxV = 0, landMax = 0, roar = 0, frontZ = 1e9, frontX = 0, frontN = 0, crestZ = 0, crestE = -1e9;
    const spray = this.spray;
    spray.length = 0;
    for (let j = 1; j < NZ - 1; j++) {
      const z = this.Z0 + (j + 0.5) * DZ;
      for (let i = 1; i < NX - 1; i++) {
        const c = j * NX + i;
        const d = h[c];
        if (d < EPS || S[c]) { foam[c] = 0; continue; }
        const ul = u[j * UW + i], ur = u[j * UW + i + 1], wb = w[c], wt = w[c + NX];
        const uc = 0.5 * (ul + ur), wc = 0.5 * (wb + wt);
        const sp = Math.sqrt(uc * uc + wc * wc);
        const div = (ur - ul) / DX + (wt - wb) / DZ;
        const e = b[c] + d;
        const eL = h[c - 1] > EPS ? b[c - 1] + h[c - 1] : e, eR = h[c + 1] > EPS ? b[c + 1] + h[c + 1] : e;
        const eB = h[c - NX] > EPS ? b[c - NX] + h[c - NX] : e, eT = h[c + NX] > EPS ? b[c + NX] + h[c + NX] : e;
        const gx = (eR - eL) / (2 * DX), gz = (eT - eB) / (2 * DZ);
        const grad = Math.sqrt(gx * gx + gz * gz);
        const nearSolid = S[c - 1] | S[c + 1] | S[c - NX] | S[c + NX];
        let src = Math.max(0, -div) * 0.2 + Math.max(0, grad - 0.1) * 2.0 + Math.max(0, sp - 3) * 0.035;
        if (d < 0.3 && sp > 1.5) src += 0.2;
        if (nearSolid && sp > 2) src += 0.35;
        foam[c] = Math.min(0.9, foam[c] * decay + src * dt);
        if (sp > maxV) maxV = sp;
        const x = this.X0 + (i + 0.5) * DX;
        if (L[c]) {
          turb[c] = Math.min(1, turb[c] + dt * 2.5);
          if (d > this.hmax[c]) this.hmax[c] = d;
          this.dryT[c] = 0;
          if (d > landMax) landMax = d;
          roar += d * sp;
          if (x > C.x0 && x < C.x1 && z > C.z0 && z < C.z1) {
            if (d > st.maxDepthCity) st.maxDepthCity = d;
            if (sp > st.maxSpeed) st.maxSpeed = sp;
          }
          if (d > 0.15 && Math.abs(x) < 300) {
            st.inland = Math.max(st.inland, this.SHORE - z);
            if (Math.abs(x) < 190 && z < frontZ + 6) {
              if (z < frontZ - 6) { frontZ = z; frontX = 0; frontN = 0; }
              frontX += x; frontN++;
            }
          }
          // po ostatniej fali woda na płaskim terenie wsiąka i uchodzi kanałami (przyspieszone)
          if (!forcing) h[c] = Math.max(0, d - dt * (d < 0.1 ? 0.012 : 0.008));
        } else if (Math.abs(x) < 160 && z > this.SHORE && e > crestE) { crestE = e; crestZ = z; }
        // rozbryzgi: stroma ściana wody albo uderzenie o budynek
        if (d > 0.3 && ((grad > 0.3 && sp > 2.2) || (nearSolid && sp > 3)) && spray.length < 400) spray.push(c);
      }
    }
    // piana i muł płyną z wodą
    this.advectCell(foam, tmp, dt);
    this.advectCell(turb, tmp, dt);
    const N = NX * NZ;
    for (let c = 0; c < N; c++) {
      if (!L[c]) turb[c] *= 0.9995;
      if (h[c] < EPS) this.dryT[c] += dt;
    }
    this.maxV = maxV;
    this.landMax = landMax;
    this.roar = U.clamp(roar / 9000, 0, 1);
    if (frontN > 0) { this.focus.x = frontX / frontN; this.focus.z = frontZ; this.focus.ok = true; }
    else if (crestE > 0.5) { this.focus.x = 0; this.focus.z = crestZ; this.focus.ok = true; }
    else this.focus.ok = false;
    this.meshDirty = true;
    this.mudDirty = true;
  },

  advectCell(f, tmp, dt) {
    const NX = this.NX, NZ = this.NZ, DX = this.DX, DZ = this.DZ, UW = NX + 1, h = this.h, u = this.u, w = this.w;
    tmp.set(f);
    for (let j = 1; j < NZ - 1; j++) for (let i = 1; i < NX - 1; i++) {
      const c = j * NX + i;
      if (h[c] < this.EPS) continue;
      const uc = 0.5 * (u[j * UW + i] + u[j * UW + i + 1]), wc = 0.5 * (w[c] + w[c + NX]);
      if (uc === 0 && wc === 0) continue;
      let fi = i - uc * dt / DX, fj = j - wc * dt / DZ;
      fi = U.clamp(fi, 0, NX - 1.001); fj = U.clamp(fj, 0, NZ - 1.001);
      const ii = fi | 0, jj = fj | 0, a = fi - ii, bb = fj - jj, k = jj * NX + ii;
      f[c] = (tmp[k] * (1 - a) + tmp[k + 1] * a) * (1 - bb) + (tmp[k + NX] * (1 - a) + tmp[k + NX + 1] * a) * bb;
    }
  },

  spawnSpray(dt) {
    const sp = this.spray;
    if (!sp.length) return;
    const NX = this.NX, UW = NX + 1;
    const n = Math.min(sp.length, Math.round(dt * 420));
    for (let k = 0; k < n; k++) {
      const c = sp[(Math.random() * sp.length) | 0];
      const i = c % NX, j = (c / NX) | 0;
      const uc = 0.5 * (this.u[j * UW + i] + this.u[j * UW + i + 1]), wc = 0.5 * (this.w[c] + this.w[c + NX]);
      const x = this.X0 + (i + Math.random()) * this.DX, z = this.Z0 + (j + Math.random()) * this.DZ;
      const y = this.bed[c] + this.h[c];
      const s = U.clamp(Math.hypot(uc, wc) / 8, 0.4, 1.4);
      FX.dust.spawn({
        x, y: y + 0.3, z, vx: uc * this.SPEED * 0.6 + U.rand(-1.5, 1.5), vy: U.rand(2, 7) * s, vz: wc * this.SPEED * 0.6 + U.rand(-1.5, 1.5),
        life: U.rand(0.6, 1.3), s0: U.rand(0.8, 1.6) * s, s1: U.rand(2.5, 5.5) * s, a: 0.7, r: 0.92, g: 0.94, b: 0.95, grav: 8, drag: 0.4, fin: 0.04
      });
    }
  },

  /* ------------------------------------------------------------ rysowanie */
  updateMesh(time) {
    this.uTime.value = time;
    const quakeOn = Quake.events.length > 0;
    if (!this.meshDirty && !quakeOn && !this.quakeWas && !World.seaColorsDirtyFlood) return;
    this.quakeWas = quakeOn;
    World.seaColorsDirtyFlood = false;
    this.meshDirty = false;
    const NX = this.NX, NZ = this.NZ, UW = NX + 1, EPS = 0.015;
    const h = this.h, b = this.bed, S = this.solid, u = this.u, w = this.w;
    const g = this.geo, P = g.attributes.position.array, Cc = g.attributes.color.array, Fl = g.attributes.aFlow.array, turb = this.turb;
    const wb = World.waterBase || new THREE.Color(0x23506e);
    const T = Quake.T, sMin = Quake.sMin, n = Quake.n, Ex = Quake.E.x, Ez = Quake.E.z;
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const c = j * NX + i, o = c * 3;
      const d = S[c] ? 0 : h[c];
      let y, depth = d, alpha;
      if (d > EPS) y = b[c] + d;
      else {
        // brzeg wody: przedłużamy lustro z mokrych sąsiadów (ładna linia styku z gruntem)
        let s = 0, k = 0;
        if (i > 0 && h[c - 1] > EPS && !S[c - 1]) { s += b[c - 1] + h[c - 1]; k++; }
        if (i < NX - 1 && h[c + 1] > EPS && !S[c + 1]) { s += b[c + 1] + h[c + 1]; k++; }
        if (j > 0 && h[c - NX] > EPS && !S[c - NX]) { s += b[c - NX] + h[c - NX]; k++; }
        if (j < NZ - 1 && h[c + NX] > EPS && !S[c + NX]) { s += b[c + NX] + h[c + NX]; k++; }
        if (k > 0) {
          const e = s / k;
          if (S[c]) { y = e; depth = Math.max(0, e - b[c]); } else y = Math.min(e, b[c]) - 0.06;
        } else y = b[c] - 1.5;
      }
      if (quakeOn && depth > 0) {
        const ex = P[o] - Ex, ez = P[o + 2] - Ez;
        const s = Math.sqrt(ex * ex + ez * ez);
        const f = s - sMin, ii = f | 0;
        if (ii >= 0 && ii < n - 1) y += (T.dy[ii] + (T.dy[ii + 1] - T.dy[ii]) * (f - ii)) * U.clamp((720 - Math.hypot(P[o], P[o + 2] + 60)) / 340, 0, 1);
      }
      P[o + 1] = y;
      // kolor: głębia morza, płycizna, muł niesiony z lądu
      const shallow = 1 - U.smooth(0, 9, depth);
      let r = wb.r + shallow * 0.05, gg = wb.g + shallow * 0.16, bl = wb.b + shallow * 0.12;
      const tb = turb[c];
      if (tb > 0.01) {
        const m = Math.min(1, tb) * 0.94;
        r = U.lerp(r, 0.15, m); gg = U.lerp(gg, 0.095, m); bl = U.lerp(bl, 0.04, m);
      }
      if (depth <= 0.005) alpha = 0;
      else {
        alpha = 0.3 + 0.66 * U.smooth(0, 3.5, depth);
        alpha = U.lerp(alpha, 0.6 + 0.37 * U.smooth(0, 0.7, depth), Math.min(1, tb));
        alpha *= U.smooth(0.0, 0.06, depth);
      }
      const q = c * 4;
      Cc[q] = r; Cc[q + 1] = gg; Cc[q + 2] = bl; Cc[q + 3] = alpha;
      if (d > EPS) {
        Fl[q] = 0.5 * (u[j * UW + i] + u[j * UW + i + 1]) * this.SPEED;
        Fl[q + 1] = 0.5 * (w[c] + w[c + NX]) * this.SPEED;
        Fl[q + 2] = this.foam[c];
      } else { Fl[q] = 0; Fl[q + 1] = 0; Fl[q + 2] = 0; }
      Fl[q + 3] = tb;
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.attributes.aFlow.needsUpdate = true;
    World.gridNormals(g, NX, NZ, 0, NX - 1, 0, NZ - 1);
    if (this.mudDirty) this.updateMud(time);
  },

  updateMud(time) {
    if (this.lastMud && time - this.lastMud < 0.3 && this.active) return;
    this.lastMud = time;
    this.mudDirty = false;
    const N = this.NX * this.NZ, col = this.mudGeo.attributes.color.array;
    let any = false;
    const h = this.h, b0 = this.bed0;
    for (let c = 0; c < N; c++) {
      const q = c * 4;
      // dno odsłonięte przez cofające się morze: mokry, ciemny piasek
      if (b0[c] < 0.1 && b0[c] > -14 && h[c] < 0.03 && this.active) {
        any = true;
        col[q] = 0.2; col[q + 1] = 0.16; col[q + 2] = 0.11; col[q + 3] = 0.8;
        continue;
      }
      if (!this.land[c] || this.hmax[c] < 0.08) { col[q + 3] = 0; continue; }
      any = true;
      const wet = 1 - U.smooth(5, 60, this.dryT[c] / this.SPEED);
      const k = U.smooth(0.08, 1.2, this.hmax[c]);
      col[q] = U.lerp(0.32, 0.12, wet); col[q + 1] = U.lerp(0.26, 0.1, wet); col[q + 2] = U.lerp(0.17, 0.07, wet);
      col[q + 3] = (0.25 + 0.3 * k) * (0.8 + 0.2 * wet);
    }
    this.mudGeo.attributes.color.needsUpdate = true;
    this.mudMesh.visible = any;
  },

  /* ------------------------------------------------------------ dla interfejsu */
  /* Dźwięk szumu wody: przepływ po lądzie i nadchodzący grzbiet. */
  roarLevel() {
    if (!this.active) return 0;
    const ts = Quake.tsunami;
    let near = 0;
    if (ts && ts.tau > 0) near = U.clamp(ts.etaIn(ts.tau) / Math.max(1, ts.A), 0, 1) * 0.5;
    return Math.max(this.roar, near);
  }
};

/* ====================================================================== */
/* Łodzie, auta i szczątki niesione przez wodę. Łodzie stoją na kotwicy, póki prąd ich nie zerwie. */
const Debris = {
  MAX: 700,
  init(scene) {
    this.scene = scene;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88 }), this.MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    const c = new THREE.Color(0.5, 0.4, 0.3);
    for (let i = 0; i < this.MAX; i++) this.mesh.setColorAt(i, c);
    scene.add(this.mesh);
    this.list = [];
    this.boats = [];
    this.boatGroup = new THREE.Group();
    scene.add(this.boatGroup);
    this.makeBoatParts();
    this.makePier();
  },

  makeBoatParts() {
    const L = 7, H = 1.4, Wd = 2.5;
    const hull = new THREE.BoxGeometry(L, H, Wd, 6, 1, 1);
    const p = hull.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k), y = p.getY(k);
      let z = p.getZ(k);
      const t = (x + L / 2) / L;
      if (t > 0.55) z *= U.lerp(1, 0.08, Math.pow((t - 0.55) / 0.45, 1.3));
      if (y < 0) z *= 0.55;
      p.setXYZ(k, x, y + (t > 0.7 && y > 0 ? (t - 0.7) * 1.4 : 0), z);
    }
    hull.computeVertexNormals();
    this.hullGeo = hull;
    this.cabinGeo = new THREE.BoxGeometry(2.4, 1.7, 1.9);
    this.mastGeo = new THREE.CylinderGeometry(0.08, 0.12, 4.5, 6);
    this.white = new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.55 });
    this.glassM = new THREE.MeshStandardMaterial({ color: 0x24313c, roughness: 0.2, metalness: 0.4 });
    this.hullCols = ['#c8352e', '#2f62a8', '#f2f0ea', '#2f7d57', '#e2b23a', '#1f2a36', '#d96a2a'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
  },

  /* Drewniany pomost na plaży z kutrami zacumowanymi obok. */
  makePier() {
    const g = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4, 0.35, 52), wood);
    deck.position.set(-120, 2.3, 86);
    deck.castShadow = deck.receiveShadow = true;
    g.add(deck);
    const post = new THREE.CylinderGeometry(0.22, 0.22, 9, 6);
    for (let z = 62; z <= 110; z += 6) for (const sx of [-1.7, 1.7]) {
      const m = new THREE.Mesh(post, wood);
      m.position.set(-120 + sx, -2.2, z);
      g.add(m);
    }
    this.pier = g;
    this.pierDeck = deck;
    this.scene.add(g);
  },

  reset() {
    this.list.length = 0;
    this.mesh.count = 0;
    for (const bt of this.boats) this.boatGroup.remove(bt.obj);
    this.boats = [];
    const spots = [[-128, 78], [-112, 86], [-128, 96], [-112, 104], [-60, 94], [-20, 102], [35, 92], [80, 100], [140, 90], [190, 104]];
    spots.forEach(([x, z], i) => {
      const obj = new THREE.Group();
      const hull = new THREE.Mesh(this.hullGeo, this.hullCols[i % this.hullCols.length]);
      hull.castShadow = true;
      obj.add(hull);
      const cab = new THREE.Mesh(this.cabinGeo, i % 3 === 0 ? this.hullCols[(i + 2) % this.hullCols.length] : this.white);
      cab.position.set(-0.9, 1.45, 0);
      cab.castShadow = true;
      obj.add(cab);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 1.5), this.glassM);
      win.position.set(0.32, 1.7, 0);
      obj.add(win);
      if (i % 2 === 0) { const m = new THREE.Mesh(this.mastGeo, this.white); m.position.set(1.4, 2.9, 0); obj.add(m); }
      this.boatGroup.add(obj);
      const yaw = (x === -128 || x === -112) ? Math.PI / 2 : U.rand(-0.4, 0.4) + (i % 2 ? Math.PI : 0);
      this.boats.push({
        obj, x, z, ax: x, az: z, y: 0, vx: 0, vz: 0, yaw, spin: 0, draft: 0.75, k: 1.1, moored: true,
        roll: 0, pitch: 0, rollT: 0, ph: Math.random() * 6.28, half: 3.5, boat: true, land: false
      });
    });
    this.pier.visible = true;
    this.pierBroken = false;
    this.unmoor = false;
    this.place(0);
  },

  add(x, y, z, sx, sy, sz, color, draft) {
    let o;
    if (this.list.length < this.MAX) { o = { i: this.list.length }; this.list.push(o); this.mesh.count = this.list.length; }
    else { this.next = ((this.next || 0) + 1) % this.MAX; o = this.list[this.next]; }
    Object.assign(o, {
      x, y, z, vx: U.rand(-1, 1), vz: U.rand(-1, 1), vy: U.rand(1, 3), yaw: Math.random() * 6.28, spin: U.rand(-1.5, 1.5),
      sx, sy, sz, draft: draft || sy * 0.5, k: 1.6, roll: U.rand(-0.3, 0.3), pitch: U.rand(-0.3, 0.3), ph: Math.random() * 6.28, half: Math.max(sx, sz) / 2
    });
    this.mesh.setColorAt(o.i, color);
    this.mesh.instanceColor.needsUpdate = true;
  },

  /* Dom porwany przez wodę: deski, płaty dachu, belki. */
  houseDebris(b) {
    const wood = new THREE.Color(0.42, 0.3, 0.2), roof = b.roofMat.color.clone(), wall = b.baseColor.clone().multiplyScalar(0.85);
    const n = Math.round(10 + b.fw * b.fd / 6);
    for (let i = 0; i < n; i++) {
      const x = b.x + U.rand(-b.fw / 2, b.fw / 2), z = b.z + U.rand(-b.fd / 2, b.fd / 2), y = World.G0 + U.rand(0.5, b.H);
      const r = Math.random();
      if (r < 0.45) this.add(x, y, z, U.rand(2.5, 4.5), 0.18, U.rand(0.2, 0.35), wood.clone().multiplyScalar(U.rand(0.8, 1.2)));
      else if (r < 0.75) this.add(x, y, z, U.rand(1.6, 3), 0.14, U.rand(1.2, 2.2), roof.clone().multiplyScalar(U.rand(0.8, 1.1)));
      else this.add(x, y, z, U.rand(1.2, 2.4), 0.2, U.rand(1, 2), wall);
    }
  },

  pierDebris() {
    const wood = new THREE.Color(0.48, 0.36, 0.25);
    for (let i = 0; i < 26; i++) this.add(-120 + U.rand(-2, 2), 2.3, U.rand(62, 110), U.rand(2.5, 4), 0.2, U.rand(0.25, 0.4), wood.clone().multiplyScalar(U.rand(0.8, 1.2)));
  },

  /* Jedno ciało pływające: dryfuje z prądem, osiada na dnie, odbija się od budynków. */
  move(o, dt, time) {
    const F = Flood;
    const d = F.depthAt(o.x, o.z);
    const bedY = World.baseHeight(o.x, o.z);
    const free = !o.boat || !o.moored;
    if (d > o.draft) {
      F.drift(o.x, o.z, _fl);
      if (o.boat && o.moored && (Math.hypot(_fl.u, _fl.w) > 1.3 * F.SPEED || this.unmoor)) {
        o.moored = false;
        if (o.boat) o.spin = U.rand(-0.5, 0.5);
      }
      if (free) {
        const k = Math.min(1, o.k * dt);
        o.vx += (_fl.u - o.vx) * k;
        o.vz += (_fl.w - o.vz) * k;
      } else {
        o.vx += ((o.ax - o.x) * 0.3 - o.vx) * Math.min(1, dt * 2);
        o.vz += ((o.az - o.z) * 0.3 - o.vz) * Math.min(1, dt * 2);
      }
      const eta = F.etaAt(o.x, o.z);
      const ty = (eta === null ? bedY + d : eta) - o.draft * 0.55 + Math.sin(time * 1.3 + o.ph) * 0.12;
      o.y += (ty - o.y) * Math.min(1, dt * 5);
      o.rollT = Math.sin(time * 1.1 + o.ph) * 0.07 * (1 + Math.min(3, Math.hypot(o.vx, o.vz) * 0.25));
      o.pitch += (Math.sin(time * 0.9 + o.ph * 2) * 0.06 - o.pitch) * Math.min(1, dt * 2);
      o.spin *= Math.exp(-dt * 0.4);
      o.spin += (Math.random() - 0.5) * dt * Math.min(2, Math.hypot(o.vx, o.vz) * 0.2);
      o.land = false;
    } else {
      // na dnie albo na ulicy (łódź osiadła na odsłoniętym dnie zrywa się z kotwicy)
      if (o.boat && o.moored && F.active) o.moored = false;
      o.vx *= Math.exp(-dt * 4);
      o.vz *= Math.exp(-dt * 4);
      o.spin *= Math.exp(-dt * 4);
      const ty = bedY + (o.boat ? 0.35 : o.sy * 0.5);
      o.y += (ty - o.y) * Math.min(1, dt * 4);
      if (o.boat) o.rollT = o.ph > 3.14 ? 0.32 : -0.32;
      o.land = bedY > 0.3;
    }
    o.roll += (o.rollT - o.roll) * Math.min(1, dt * 2);
    if (free) {
      let nx = o.x + o.vx * dt, nz = o.z + o.vz * dt;
      const r = o.half * 0.6;
      const sx = Math.sign(o.vx) || 1, sz = Math.sign(o.vz) || 1;
      if (F.solidAt(nx + sx * r, o.z)) { nx = o.x; o.vx = -o.vx * 0.25; o.spin += U.rand(-1, 1); if (o.boat && Math.abs(o.vx) > 1) Sound.crash(0.15, Main.panFor(o.x, o.z), Main.distFactor(o.x, o.z)); }
      if (F.solidAt(o.x, nz + sz * r)) { nz = o.z; o.vz = -o.vz * 0.25; o.spin += U.rand(-1, 1); }
      o.x = U.clamp(nx, F.X0 + 5, F.X1 - 5);
      o.z = U.clamp(nz, F.Z0 + 5, F.Z1 - 5);
      o.yaw += o.spin * dt;
    }
  },

  update(dt, time) {
    if (!this.pierBroken && Flood.active && Flood.depthAt(-120, 70) > 2.4) {
      this.pierBroken = true;
      this.pier.visible = false;
      this.pierDebris();
    }
    for (const o of this.list) this.move(o, dt, time);
    for (const bt of this.boats) this.move(bt, dt, time);
    this.place(time);
  },

  /* Spokojne morze: łodzie kołyszą się przy kotwicy. */
  idle(dt, time) {
    if (Flood.active) return;
    for (const bt of this.boats) {
      if (!bt.moored) continue;
      bt.y = -bt.draft * 0.55 + Math.sin(time * 1.3 + bt.ph) * 0.12;
      bt.roll = Math.sin(time * 1.1 + bt.ph) * 0.05;
      bt.pitch = Math.sin(time * 0.8 + bt.ph * 2) * 0.03;
    }
    this.placeBoats();
  },

  placeBoats() {
    for (const bt of this.boats) {
      bt.obj.position.set(bt.x, bt.y, bt.z);
      _e1.set(bt.roll, bt.yaw, bt.pitch, 'YXZ');
      bt.obj.quaternion.setFromEuler(_e1);
    }
  },

  place() {
    for (const o of this.list) {
      _e1.set(o.roll, o.yaw, o.pitch, 'YXZ');
      _q1.setFromEuler(_e1);
      _v1.set(o.x, o.y, o.z);
      _s1.set(o.sx, o.sy, o.sz);
      _m1.compose(_v1, _q1, _s1);
      this.mesh.setMatrixAt(o.i, _m1);
    }
    if (this.list.length) this.mesh.instanceMatrix.needsUpdate = true;
    this.placeBoats();
  },

  stranded() { return this.boats.filter(b => !b.moored && b.land).length; }
};
