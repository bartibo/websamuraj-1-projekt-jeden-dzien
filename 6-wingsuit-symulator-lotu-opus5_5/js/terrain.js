/* Na Krawędzi – teren: kawałki z detalem wokół pilota, dalsze pierścienie, kolory skał, cienie od słońca, drzewa, woda */
(function (root) {
  'use strict';
  const WS = root.WS;
  const { clamp, lerp, smoothstep } = WS.U;
  const U = WS.U3;

  const CHUNK = 200, SEG = 48, R = 4;
  const SHADOW_STEPS = [9, 26, 60, 130, 260, 520];

  // ---------- materiał terenu ----------
  const VERT = /* glsl */`
    attribute float shade;
    varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vS;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vW = w.xyz; vN = normal; vC = color; vS = shade;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const FRAG = /* glsl */`
    uniform vec3 uSunCol; uniform vec3 uAmbSky; uniform vec3 uAmbGround;
    uniform float uSnow; uniform float uWet; uniform float uFlash;
    uniform vec4 uHole;
    varying vec3 vW; varying vec3 vN; varying vec3 vC; varying float vS;
    ${WS.GLSL.noise}
    ${WS.GLSL.fogPars}
    void main() {
      #ifdef HOLE
        if (vW.x > uHole.x && vW.x < uHole.z && vW.z > uHole.y && vW.z < uHole.w) discard;
      #endif
      vec3 N = normalize(vN);
      vec3 d = vW - uCam;
      float dist = length(d);
      float steep = 1.0 - N.y;
      // płaskie powierzchnie: współrzędne xz, strome ściany: (pozioma wzdłuż ściany, wysokość)
      float wall = smoothstep(0.35, 0.65, steep);
      vec2 wp2 = mix(vW.xz, vec2(dot(vW.xz, normalize(vec2(-N.z, N.x) + 1e-4)), vW.y), wall);
      float n1 = vnoise(wp2 * 0.021);
      float n2 = vnoise(wp2 * 0.11 + 7.0);
      float fNear = exp(-dist / 160.0);
      float n3 = fNear > 0.02 ? vnoise(wp2 * 0.43 + 3.0) * 0.65 + vnoise(wp2 * vec2(0.95, 0.8) + 11.0) * 0.35 : 0.5;
      float n4 = vnoise(vec2((vW.x + vW.z) * 0.25, vW.y * 0.32));
      float det = n1 * 0.45 + n2 * 0.35 + (n3 - 0.5) * 0.5 * fNear + 0.1;
      float rock = smoothstep(0.3, 0.6, steep);
      det = mix(det, n4 * 0.55 + n2 * 0.3 + (n3 - 0.5) * 0.4 * fNear + 0.12, rock);
      vec3 col = vC * (0.7 + 0.6 * det);
      float sn = uSnow * smoothstep(0.52, 0.82, N.y + (n2 - 0.5) * 0.35);
      col = mix(col, vec3(0.9, 0.92, 0.96) * (0.9 + 0.12 * n2), sn);
      col *= 1.0 - uWet * 0.22 * (1.0 - sn);
      float diff = max(dot(N, uSunDir), 0.0) * vS;
      vec3 amb = mix(uAmbGround, uAmbSky, N.y * 0.5 + 0.5);
      vec3 lit = col * (uSunCol * diff + amb * (0.72 + 0.28 * vS) + uFlash);
      if (uWet > 0.0) {
        vec3 V = d / max(dist, 0.01);
        vec3 H = normalize(uSunDir - V);
        lit += uSunCol * pow(max(dot(N, H), 0.0), 30.0) * 0.18 * uWet * vS;
      }
      gl_FragColor = vec4(applyFog(lit, vW), 1.0);
    }`;

  function terrainMaterial(hole) {
    const uniforms = {
      uSunCol: U.uSunCol, uAmbSky: U.uAmbSky, uAmbGround: U.uAmbGround,
      uSnow: U.uSnow, uWet: U.uWet, uFlash: U.uFlash,
      uFogCol: U.uFogCol, uSunFog: U.uSunFog, uSunDir: U.uSunDir, uCam: U.uCam, uFogDens: U.uFogDens, uHF: U.uHF,
      uHole: { value: new THREE.Vector4(1e9, 1e9, -1e9, -1e9) }
    };
    const m = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, vertexColors: true });
    if (hole) m.defines = { HOLE: 1 };
    return m;
  }

  // ---------- kolory podłoża ----------
  function makePalette(world) {
    const L = world.L, n = world.n2;
    const tmp = [0, 0, 0];
    const set = (r, g, b) => { tmp[0] = r; tmp[1] = g; tmp[2] = b; return tmp; };
    const mix = (a, b, t) => { tmp[0] = a[0] + (b[0] - a[0]) * t; tmp[1] = a[1] + (b[1] - a[1]) * t; tmp[2] = a[2] + (b[2] - a[2]) * t; };
    if (L.palette === 'alpine') {
      const grass = [0.33, 0.45, 0.19], grass2 = [0.43, 0.47, 0.25], forest = [0.14, 0.22, 0.1];
      const rock = [0.5, 0.48, 0.45], rock2 = [0.36, 0.35, 0.34], scree = [0.62, 0.6, 0.56], snow = [0.94, 0.95, 0.98];
      return (x, z, h, ny, fl) => {
        const v = n.noise(x / 160, z / 160);
        const steep = 1 - ny;
        const g = [0, 0, 0];
        const gt = smoothstep(L.treeLine - 100, L.treeLine + 250, h + v * 80);
        for (let i = 0; i < 3; i++) g[i] = grass[i] + (grass2[i] - grass[i]) * clamp(gt + v * 0.3, 0, 1);
        const fd = world.forest(x, z, h, ny);
        for (let i = 0; i < 3; i++) g[i] += (forest[i] - g[i]) * clamp(fd * 1.5, 0, 0.9);
        const r = [0, 0, 0];
        const rv = clamp(0.5 + n.noise(x / 60, h / 25) * 0.7, 0, 1);
        for (let i = 0; i < 3; i++) r[i] = rock[i] + (rock2[i] - rock[i]) * rv;
        const sc = smoothstep(0.18, 0.3, steep) * (1 - smoothstep(0.38, 0.5, steep)) * smoothstep(L.treeLine - 200, L.treeLine + 100, h);
        for (let i = 0; i < 3; i++) r[i] += (scree[i] - r[i]) * sc * 0.6;
        const rk = smoothstep(0.26, 0.44, steep + v * 0.08);
        mix(g, r, rk);
        const out = [tmp[0], tmp[1], tmp[2]];
        const s = smoothstep(L.snowLine - 150, L.snowLine + 150, h + v * 140) * smoothstep(0.35, 0.6, ny);
        for (let i = 0; i < 3; i++) out[i] += (snow[i] - out[i]) * s;
        return out;
      };
    }
    if (L.palette === 'fjord') {
      const grass = [0.24, 0.36, 0.16], forest = [0.11, 0.19, 0.1], rock = [0.4, 0.41, 0.43], rock2 = [0.26, 0.27, 0.29];
      const sand = [0.66, 0.62, 0.5], under = [0.22, 0.3, 0.28], snow = [0.93, 0.95, 0.98], moss = [0.3, 0.34, 0.2];
      return (x, z, h, ny, fl) => {
        const v = n.noise(x / 140, z / 140);
        const steep = 1 - ny;
        const g = [0, 0, 0];
        const fd = world.forest(x, z, h, ny);
        for (let i = 0; i < 3; i++) g[i] = grass[i] + (forest[i] - grass[i]) * clamp(fd * 1.6, 0, 0.9);
        const r = [0, 0, 0];
        // pionowe zacieki na granicie
        const streak = clamp(0.5 + n.noise(x / 18 + z / 18, h / 220) * 0.8, 0, 1);
        for (let i = 0; i < 3; i++) r[i] = rock[i] + (rock2[i] - rock[i]) * streak;
        const ms = smoothstep(0.3, 0.5, ny) * (1 - smoothstep(500, 800, h));
        for (let i = 0; i < 3; i++) r[i] += (moss[i] - r[i]) * ms * 0.5;
        mix(g, r, smoothstep(0.24, 0.42, steep + v * 0.06));
        const out = [tmp[0], tmp[1], tmp[2]];
        if (h < 5) { const t = smoothstep(5, 1, h); for (let i = 0; i < 3; i++) out[i] += (sand[i] - out[i]) * t * ny; }
        if (h < -1) { const t = smoothstep(-1, -6, h); for (let i = 0; i < 3; i++) out[i] += (under[i] - out[i]) * t; }
        const s = smoothstep(L.snowLine - 120, L.snowLine + 150, h + v * 120) * smoothstep(0.3, 0.6, ny);
        for (let i = 0; i < 3; i++) out[i] += (snow[i] - out[i]) * s;
        return out;
      };
    }
    // pustynia: warstwy piaskowca
    const bands = [[0.72, 0.37, 0.2], [0.82, 0.52, 0.31], [0.6, 0.29, 0.17], [0.86, 0.68, 0.48], [0.68, 0.42, 0.26]];
    const sand = [0.84, 0.64, 0.43], top = [0.7, 0.5, 0.33], bush = [0.4, 0.42, 0.24];
    return (x, z, h, ny, fl) => {
      const v = n.noise(x / 300, z / 300);
      const t = h / 13 + v * 1.4 + n.noise(x / 900, z / 900) * 2;
      const i0 = ((Math.floor(t) % 5) + 5) % 5, i1 = (i0 + 1) % 5;
      const f = smoothstep(0.75, 1, t - Math.floor(t));
      const b0 = bands[i0], b1 = bands[i1];
      const out = [b0[0] + (b1[0] - b0[0]) * f, b0[1] + (b1[1] - b0[1]) * f, b0[2] + (b1[2] - b0[2]) * f];
      const flat = smoothstep(0.84, 0.95, ny);
      const nearFloor = 1 - smoothstep(4, 25, h - fl);
      const c = nearFloor > 0 ? sand : top;
      const k = flat * (nearFloor > 0 ? Math.max(nearFloor, 0.5) : 0.75);
      for (let i = 0; i < 3; i++) out[i] += (c[i] - out[i]) * k;
      const fd = world.forest(x, z, h, ny);
      for (let i = 0; i < 3; i++) out[i] += (bush[i] - out[i]) * fd * 0.6;
      return out;
    };
  }

  // Cień od słońca: promień w stronę słońca po zgrubnym terenie
  function sunShade(world, x, y, z, sd) {
    const hl = Math.hypot(sd.x, sd.z);
    if (sd.y <= 0.02) return 0.3;
    let s = 1;
    for (let i = 0; i < SHADOW_STEPS.length; i++) {
      const d = SHADOW_STEPS[i];
      const ry = y + 1.5 + sd.y * d;
      const h = world.height(x + sd.x * d, z + sd.z * d, 1);
      s = Math.min(s, smoothstep(-4 - d * 0.02, 4 + d * 0.03, ry - h));
      if (s <= 0) break;
    }
    return s;
  }

  // ---------- drzewa ----------
  function mergeGeos(list) {
    let total = 0;
    const parts = list.map(({ geo, color }) => {
      const g = geo.index ? geo.toNonIndexed() : geo;
      total += g.attributes.position.count;
      return { g, color };
    });
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
    let o = 0;
    for (const { g, color } of parts) {
      g.computeVertexNormals();
      const p = g.attributes.position.array, nn = g.attributes.normal.array;
      pos.set(p, o * 3); nor.set(nn, o * 3);
      for (let i = 0; i < g.attributes.position.count; i++) {
        const sh = 0.85 + 0.15 * Math.random();
        col[(o + i) * 3] = color[0] * sh; col[(o + i) * 3 + 1] = color[1] * sh; col[(o + i) * 3 + 2] = color[2] * sh;
      }
      o += g.attributes.position.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  }

  function treeGeometry(kind) {
    if (kind === 'shrub') {
      const a = new THREE.IcosahedronGeometry(1.4, 0); a.scale(1.2, 0.8, 1.2); a.translate(0, 0.9, 0);
      const b = new THREE.IcosahedronGeometry(1.0, 0); b.translate(0.9, 0.7, 0.3);
      return mergeGeos([{ geo: a, color: [0.42, 0.45, 0.25] }, { geo: b, color: [0.36, 0.4, 0.22] }]);
    }
    const trunk = new THREE.CylinderGeometry(0.22, 0.32, 3.2, 5); trunk.translate(0, 1.6, 0);
    const c1 = new THREE.ConeGeometry(2.9, 6.5, 7); c1.translate(0, 5.2, 0);
    const c2 = new THREE.ConeGeometry(2.2, 5.2, 7); c2.translate(0, 8.4, 0);
    const c3 = new THREE.ConeGeometry(1.4, 4.0, 7); c3.translate(0, 11.3, 0);
    return mergeGeos([
      { geo: trunk, color: [0.33, 0.24, 0.16] },
      { geo: c1, color: [0.16, 0.3, 0.15] },
      { geo: c2, color: [0.18, 0.33, 0.16] },
      { geo: c3, color: [0.2, 0.36, 0.18] }
    ]);
  }

  // ---------- system terenu ----------
  class Terrain {
    constructor(scene, world) {
      this.scene = scene; this.world = world;
      this.group = new THREE.Group();
      scene.add(this.group);
      this.palette = makePalette(world);
      this.matNear = terrainMaterial(false);
      this.matMid = terrainMaterial(true);
      this.matFar = terrainMaterial(true);
      this.treeGeo = treeGeometry(world.L.trees.kind);
      this.treeMat = WS.patchFog(new THREE.MeshLambertMaterial({ vertexColors: true }));
      this.chunks = new Map();
      this.queue = [];
      this.job = null;
      this.center = null;
      this.square = null;
      this.sunDir = U.uSunDir.value.clone();
      this.water = null;
    }

    dispose() {
      for (const c of this.chunks.values()) this._freeChunk(c);
      this.chunks.clear();
      for (const m of [this.mid, this.far, this.water]) if (m) { m.geometry.dispose(); this.group.remove(m); }
      this.scene.remove(this.group);
      this.matNear.dispose(); this.matMid.dispose(); this.matFar.dispose(); this.treeGeo.dispose(); this.treeMat.dispose();
    }

    // Pełna budowa przed lotem (z paskiem postępu)
    *buildAll(cx, cz) {
      const w = this.world;
      // pierścień środkowy (50 m oczko) i daleki (400 m)
      const midRect = { x0: -6000, z0: -5000, x1: 6000, z1: Math.max(9000, w.L.sLand + w.L.landLen + 2500) };
      this.midRect = midRect;
      let g = yield* this._gridGen(midRect.x0, midRect.z0, midRect.x1, midRect.z1, 50, 1, 120);
      this.mid = new THREE.Mesh(g, this.matMid);
      this.mid.frustumCulled = false;
      this.group.add(this.mid);
      g = yield* this._gridGen(-34000, -30000, 34000, 40000, 400, 1, 0);
      this.far = new THREE.Mesh(g, this.matFar);
      this.far.frustumCulled = false;
      this.matFar.uniforms.uHole.value.set(midRect.x0 + 60, midRect.z0 + 60, midRect.x1 - 60, midRect.z1 - 60);
      this.group.add(this.far);
      if (w.hasWater) this._buildWater();
      // kawałki wokół startu
      this.center = null;
      this.update(cx, cz, 0, true);
      while (this.queue.length || this.job) {
        this._work(12);
        yield 0.75 + 0.25 * (1 - this.queue.length / ((2 * R + 1) ** 2));
      }
      this.update(cx, cz, 0, true);
    }

    *_gridGen(x0, z0, x1, z1, cell, lod, skirt) {
      const w = this.world, pal = this.palette, sd = this.sunDir;
      const nx = Math.round((x1 - x0) / cell) + 1, nz = Math.round((z1 - z0) / cell) + 1;
      const extra = skirt ? 2 * (nx + nz) : 0;
      const count = nx * nz + extra;
      const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3), sh = new Float32Array(count);
      const H = new Float32Array(nx * nz);
      let t0 = performance.now();
      for (let j = 0; j < nz; j++) {
        const z = z0 + j * cell;
        for (let i = 0; i < nx; i++) H[j * nx + i] = w.height(x0 + i * cell, z, lod);
        if (performance.now() - t0 > 30) { yield null; t0 = performance.now(); }
      }
      for (let j = 0; j < nz; j++) {
        const z = z0 + j * cell;
        const fl = w.floor(z);
        for (let i = 0; i < nx; i++) {
          const k = j * nx + i, x = x0 + i * cell, h = H[k];
          const hl = H[j * nx + Math.max(0, i - 1)], hr = H[j * nx + Math.min(nx - 1, i + 1)];
          const hd = H[Math.max(0, j - 1) * nx + i], hu = H[Math.min(nz - 1, j + 1) * nx + i];
          let ax = (hl - hr), az = (hd - hu), ay = 2 * cell;
          const il = 1 / Math.hypot(ax, ay, az);
          ax *= il; ay *= il; az *= il;
          pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
          nor[k * 3] = ax; nor[k * 3 + 1] = ay; nor[k * 3 + 2] = az;
          const c = pal(x, z, h, ay, fl);
          col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
          sh[k] = cell > 100 ? 1 - 0.0 : sunShade(w, x, h, z, sd);
        }
        if (performance.now() - t0 > 30) { yield null; t0 = performance.now(); }
      }
      const idx = [];
      for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
      if (skirt) this._skirt(pos, nor, col, sh, nx, nz, skirt, idx);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('shade', new THREE.BufferAttribute(sh, 1));
      g.setIndex(idx);
      return g;
    }

    // „Fartuch” na brzegach siatki – zasłania szpary między poziomami szczegółów
    _skirt(pos, nor, col, sh, nx, nz, depth, idx) {
      let o = nx * nz;
      const ring = [];
      for (let i = 0; i < nx; i++) ring.push(i);
      for (let j = 1; j < nz; j++) ring.push(j * nx + nx - 1);
      for (let i = nx - 2; i >= 0; i--) ring.push((nz - 1) * nx + i);
      for (let j = nz - 2; j > 0; j--) ring.push(j * nx);
      ring.push(0);
      const first = o;
      for (let r = 0; r < ring.length && o < pos.length / 3; r++) {
        const k = ring[r];
        pos[o * 3] = pos[k * 3]; pos[o * 3 + 1] = pos[k * 3 + 1] - depth; pos[o * 3 + 2] = pos[k * 3 + 2];
        nor[o * 3] = nor[k * 3]; nor[o * 3 + 1] = nor[k * 3 + 1]; nor[o * 3 + 2] = nor[k * 3 + 2];
        col[o * 3] = col[k * 3]; col[o * 3 + 1] = col[k * 3 + 1]; col[o * 3 + 2] = col[k * 3 + 2];
        sh[o] = sh[k];
        if (r > 0) {
          const a = ring[r - 1], b = k, c = o - 1, d = o;
          idx.push(a, b, c, b, d, c, a, c, b, b, c, d);
        }
        o++;
      }
      return first;
    }

    _buildWater() {
      const w = this.world;
      const geo = new THREE.PlaneGeometry(80000, 80000, 1, 1);
      geo.rotateX(-Math.PI / 2);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uFogCol: U.uFogCol, uSunFog: U.uSunFog, uSunDir: U.uSunDir, uCam: U.uCam, uFogDens: U.uFogDens, uHF: U.uHF,
          uSunCol: U.uSunCol, uAmbSky: U.uAmbSky, uTime: U.uTime, uWet: U.uWet, uFlash: U.uFlash,
          uSkyTop: { value: new THREE.Color(WS.currentWeather ? WS.currentWeather.skyTop : '#3366aa') }
        },
        vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
        fragmentShader: `
          uniform vec3 uSunCol; uniform vec3 uAmbSky; uniform vec3 uSkyTop; uniform float uTime; uniform float uWet; uniform float uFlash;
          varying vec3 vW;
          ${WS.GLSL.noise}
          ${WS.GLSL.fogPars}
          void main(){
            vec3 d = vW - uCam; float dist = length(d); vec3 V = d / dist;
            float fN = exp(-dist / 600.0);
            vec2 p = vW.xz;
            float t = uTime;
            float e = 0.6;
            float h0 = fbm3(p * 0.05 + vec2(t * 0.05, t * 0.03)) + fbm3(p * 0.21 - vec2(t * 0.11, 0.0)) * 0.5 * fN;
            float hx = fbm3((p + vec2(e, 0.0)) * 0.05 + vec2(t * 0.05, t * 0.03)) + fbm3((p + vec2(e, 0.0)) * 0.21 - vec2(t * 0.11, 0.0)) * 0.5 * fN;
            float hz = fbm3((p + vec2(0.0, e)) * 0.05 + vec2(t * 0.05, t * 0.03)) + fbm3((p + vec2(0.0, e)) * 0.21 - vec2(t * 0.11, 0.0)) * 0.5 * fN;
            float amp = 1.2 + uWet * 1.5;
            vec3 N = normalize(vec3((h0 - hx) * amp, e, (h0 - hz) * amp));
            float fres = pow(1.0 - max(dot(-V, N), 0.0), 4.0) * 0.85 + 0.08;
            vec3 R = reflect(V, N);
            vec3 sky = mix(uFogCol, uSkyTop, clamp(R.y * 1.5, 0.0, 1.0));
            vec3 deep = vec3(0.02, 0.07, 0.08) + uAmbSky * 0.08;
            vec3 col = mix(deep, sky, fres);
            float sp = pow(max(dot(R, uSunDir), 0.0), 220.0);
            col += uSunCol * sp * 3.0 + uSunCol * pow(max(dot(R, uSunDir), 0.0), 18.0) * 0.12;
            col += uFlash * 0.25;
            gl_FragColor = vec4(applyFog(col, vW), 1.0);
          }`
      });
      this.water = new THREE.Mesh(geo, mat);
      this.water.position.y = w.water;
      this.water.frustumCulled = false;
      this.group.add(this.water);
    }

    setSkyTop(c) { if (this.water) this.water.material.uniforms.uSkyTop.value.set(c); }

    key(cx, cz) { return cx + ',' + cz; }

    update(px, pz, budget, force) {
      const cx = Math.floor(px / CHUNK), cz = Math.floor(pz / CHUNK);
      if (force || !this.center || this.center.x !== cx || this.center.z !== cz) {
        this.center = { x: cx, z: cz };
        const want = [];
        for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) want.push({ x: cx + i, z: cz + j, d: i * i + j * j });
        want.sort((a, b) => a.d - b.d);
        this.want = new Set(want.map(c => this.key(c.x, c.z)));
        this.queue = want.filter(c => !this.chunks.has(this.key(c.x, c.z)) && !(this.job && this.job.key === this.key(c.x, c.z)));
      }
      if (budget > 0) this._work(budget);
      // przełącz dziurę w siatce środkowej dopiero, gdy wszystkie potrzebne kawałki są gotowe
      if (!this.queue.length && !this.job) {
        const c = this.center;
        const sq = (c.x - R) + ',' + (c.z - R);
        if (this.square !== sq) {
          this.square = sq;
          this.matMid.uniforms.uHole.value.set((c.x - R) * CHUNK + 0.5, (c.z - R) * CHUNK + 0.5, (c.x + R + 1) * CHUNK - 0.5, (c.z + R + 1) * CHUNK - 0.5);
          for (const [k, ch] of this.chunks) if (!this.want.has(k)) { this._freeChunk(ch); this.chunks.delete(k); }
        }
      }
    }

    _work(budget) {
      const t0 = performance.now();
      while (performance.now() - t0 < budget) {
        if (!this.job) {
          const c = this.queue.shift();
          if (!c) return;
          this.job = { key: this.key(c.x, c.z), cx: c.x, cz: c.z, gen: this._chunkGen(c.x, c.z) };
        }
        const r = this.job.gen.next();
        if (r.done) {
          const ch = r.value;
          this.chunks.set(this.job.key, ch);
          this.group.add(ch.mesh);
          if (ch.trees) this.group.add(ch.trees);
          this.job = null;
        }
      }
    }

    _freeChunk(ch) {
      this.group.remove(ch.mesh); ch.mesh.geometry.dispose();
      if (ch.trees) { this.group.remove(ch.trees); ch.trees.dispose(); }
    }

    *_chunkGen(cx, cz) {
      const w = this.world, pal = this.palette, sd = this.sunDir;
      const N = SEG, st = CHUNK / N, x0 = cx * CHUNK, z0 = cz * CHUNK;
      const M = N + 3; // z ramką
      const H = new Float32Array(M * M);
      for (let j = 0; j < M; j++) {
        const z = z0 + (j - 1) * st;
        for (let i = 0; i < M; i++) H[j * M + i] = w.height(x0 + (i - 1) * st, z, 0);
        if (j % 6 === 5) yield;
      }
      const nv = (N + 1) * (N + 1);
      const extra = 4 * (N + 1);
      const pos = new Float32Array((nv + extra) * 3), nor = new Float32Array((nv + extra) * 3), col = new Float32Array((nv + extra) * 3), sh = new Float32Array(nv + extra);
      for (let j = 0; j <= N; j++) {
        const z = z0 + j * st;
        const fl = w.floor(z);
        for (let i = 0; i <= N; i++) {
          const k = j * (N + 1) + i, x = x0 + i * st;
          const hi = (j + 1) * M + (i + 1);
          const h = H[hi];
          let ax = H[hi - 1] - H[hi + 1], az = H[hi - M] - H[hi + M], ay = 2 * st;
          const il = 1 / Math.hypot(ax, ay, az);
          ax *= il; ay *= il; az *= il;
          pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
          nor[k * 3] = ax; nor[k * 3 + 1] = ay; nor[k * 3 + 2] = az;
          const c = pal(x, z, h, ay, fl);
          col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
          sh[k] = sunShade(w, x, h, z, sd);
        }
        if (j % 4 === 3) yield;
      }
      const idx = [];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
      this._skirt(pos, nor, col, sh, N + 1, N + 1, 18, idx);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('shade', new THREE.BufferAttribute(sh, 1));
      g.setIndex(idx);
      g.computeBoundingSphere();
      g.boundingSphere.radius += 30;
      const mesh = new THREE.Mesh(g, this.matNear);
      yield;
      // drzewa
      const list = w.treesIn(x0, z0, CHUNK);
      let trees = null;
      if (list.length) {
        trees = new THREE.InstancedMesh(this.treeGeo, this.treeMat, list.length);
        const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
        const c = new THREE.Color();
        const shrub = w.L.trees.kind === 'shrub';
        for (let i = 0; i < list.length; i++) {
          const t = list[i];
          q.setFromAxisAngle(up, t.r * 40);
          const hs = shrub ? t.s : t.s * (0.85 + 0.3 * ((t.r * 7) % 1));
          sc.set(t.s, hs, t.s);
          p.set(t.x, t.y, t.z);
          m.compose(p, q, sc);
          trees.setMatrixAt(i, m);
          const shd = sunShade(w, t.x, t.y + 6, t.z, sd);
          const v = 0.8 + 0.4 * ((t.r * 13) % 1);
          c.setRGB(v * (0.5 + 0.5 * shd), v * (0.52 + 0.48 * shd), v * (0.55 + 0.45 * shd));
          trees.setColorAt(i, c);
          t.h = (shrub ? 2 : 13.5) * hs; t.cr = (shrub ? 1.6 : 2.8) * t.s;
        }
        trees.instanceMatrix.needsUpdate = true;
        if (trees.instanceColor) trees.instanceColor.needsUpdate = true;
        trees.computeBoundingSphere();
      }
      return { mesh, trees, list, cx, cz };
    }

    // Czy punkt trafia w drzewo (kolizja)
    treeHit(x, y, z) {
      const ch = this.chunks.get(this.key(Math.floor(x / CHUNK), Math.floor(z / CHUNK)));
      if (!ch || !ch.list) return false;
      for (const t of ch.list) {
        const dy = y - t.y;
        if (dy < 0 || dy > t.h) continue;
        const dx = x - t.x, dz = z - t.z;
        const r = t.cr * (1 - dy / t.h) + 0.5;
        if (dx * dx + dz * dz < r * r) return true;
      }
      return false;
    }

    // Najbliższe drzewo poniżej (do bliskich przelotów)
    treeNear(x, y, z, rad) {
      const ch = this.chunks.get(this.key(Math.floor(x / CHUNK), Math.floor(z / CHUNK)));
      if (!ch || !ch.list) return 1e9;
      let best = 1e9;
      for (const t of ch.list) {
        const dx = x - t.x, dz = z - t.z;
        if (Math.abs(dx) > rad || Math.abs(dz) > rad) continue;
        const top = t.y + t.h;
        const dd = Math.hypot(dx, dz, Math.max(0, y - top));
        if (dd < best) best = dd;
      }
      return best;
    }
  }

  WS.Terrain = Terrain;
  WS.TERRAIN = { CHUNK, SEG, R };
})(window);
