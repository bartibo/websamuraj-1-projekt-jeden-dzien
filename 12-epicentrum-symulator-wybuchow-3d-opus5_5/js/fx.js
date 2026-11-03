// Efekty wizualne: cząsteczki (dym, ogień, iskry), gruz, kula ognia, fala uderzeniowa,
// ściana pyłu, chmura Wilsona i grzyb atomowy, pożary miasta, odłamki szkła.
(function () {
  const T = THREE;
  const Ut = EP.util;
  const Ph = EP.phys;
  const Wd = EP.world;
  const F = EP.fx = {};

  const WIND = new T.Vector3(3.5, 0, 1.2);
  F.WIND = WIND;

  // ---------- TEKSTURY ----------
  function smokeTex() {
    const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), img = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = (x + 0.5) / N * 2 - 1, dy = (y + 0.5) / N * 2 - 1;
      const r = Math.sqrt(dx * dx + dy * dy);
      const n = Ut.fbm(x / 18 + 3, y / 18 + 7, 4);
      const fall = Math.max(0, 1 - r);
      const a = Math.pow(fall, 1.4) * Ut.smooth(0.18, 0.75, n * 0.75 + fall * 0.55);
      const k = (y * N + x) * 4;
      img.data[k] = Math.round(Ut.clamp(n * 1.3 - 0.15 + (1 - r) * 0.3, 0, 1) * 255);
      img.data[k + 1] = img.data[k]; img.data[k + 2] = img.data[k];
      img.data[k + 3] = Math.round(Ut.clamp(a * 1.25, 0, 1) * 255);
    }
    g.putImageData(img, 0, 0);
    const t = new T.CanvasTexture(c); t.colorSpace = T.NoColorSpace; return t;
  }
  function glowTex() {
    const N = 64, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), img = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = (x + 0.5) / N * 2 - 1, dy = (y + 0.5) / N * 2 - 1;
      const r = Math.sqrt(dx * dx + dy * dy);
      const a = Math.exp(-r * r * 5) * (1 - Ut.smooth(0.8, 1, r));
      const k = (y * N + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
      img.data[k + 3] = Math.round(a * 255);
    }
    g.putImageData(img, 0, 0);
    const t = new T.CanvasTexture(c); t.colorSpace = T.NoColorSpace; return t;
  }

  // ---------- SYSTEM CZĄSTEK (instancjonowane billboardy) ----------
  const PVERT = `
attribute vec3 iPos; attribute vec4 iCol; attribute vec3 iSRH;
uniform float uFogD;
varying vec2 vUv; varying vec4 vCol; varying float vHeat; varying float vFog;
void main(){
  vUv = position.xy + 0.5;
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  float c = cos(iSRH.y), s = sin(iSRH.y);
  mv.xy += vec2(c*position.x - s*position.y, s*position.x + c*position.y) * iSRH.x;
  gl_Position = projectionMatrix * mv;
  vCol = iCol; vHeat = iSRH.z;
  float fd = -mv.z; vFog = 1.0 - exp(-uFogD*uFogD*fd*fd);
  // cząstki tuż przy kamerze znikają, żeby nie zasłaniały całego kadru
  vCol.a *= clamp((fd - iSRH.x*0.15) / (iSRH.x*0.9 + 0.01), 0.0, 1.0);
}`;
  const PFRAG_SMOKE = `
uniform sampler2D uTex; uniform vec3 uFogC;
varying vec2 vUv; varying vec4 vCol; varying float vHeat; varying float vFog;
void main(){
  vec4 t = texture2D(uTex, vUv);
  float a = t.a * vCol.a;
  if (a < 0.003) discard;
  vec3 hc = mix(vec3(1.0,0.32,0.05), vec3(1.0,0.86,0.55), clamp(vHeat - 1.0, 0.0, 1.0));
  vec3 c = vCol.rgb*(0.62 + 0.5*t.r) + hc*vHeat*(0.5 + 0.7*t.r);
  c = mix(c, uFogC, vFog*(1.0 - min(vHeat, 1.0)*0.8));
  gl_FragColor = vec4(c, a);
}`;
  const PFRAG_ADD = `
uniform sampler2D uTex;
varying vec2 vUv; varying vec4 vCol; varying float vHeat; varying float vFog;
void main(){
  float a = texture2D(uTex, vUv).a * vCol.a;
  if (a < 0.003) discard;
  vec3 hc = mix(vec3(1.0,0.4,0.08), vec3(1.0,0.92,0.7), clamp(vHeat - 1.0, 0.0, 1.0));
  vec3 c = mix(vCol.rgb, hc, clamp(vHeat, 0.0, 1.0));
  gl_FragColor = vec4(c*(1.0 - vFog), a);
}`;

  class PSys {
    constructor(max, additive, tex) {
      this.max = max; this.additive = additive;
      const A = (n) => new Float32Array(max * n);
      this.p = A(3); this.v = A(3); this.age = A(1); this.life = A(1);
      this.s0 = A(1); this.s1 = A(1); this.col = A(3); this.a0 = A(1);
      this.rot = A(1); this.rotV = A(1); this.drag = A(1); this.buoy = A(1); this.grav = A(1);
      this.heat0 = A(1); this.heatT = A(1); this.fin = A(1); this.lit = A(1);
      this.alive = new Uint8Array(max); this.ctrl = new Uint8Array(max);
      this.cur = A(4); // sterowane: rozmiar, alfa, ciepło (aktualne)
      this.free = []; for (let i = max - 1; i >= 0; i--) this.free.push(i);
      this.order = new Uint32Array(max); this.depth = new Float32Array(max);
      const g = new T.InstancedBufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      this.aPos = new T.InstancedBufferAttribute(new Float32Array(max * 3), 3); this.aPos.setUsage(T.DynamicDrawUsage);
      this.aCol = new T.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.aCol.setUsage(T.DynamicDrawUsage);
      this.aSRH = new T.InstancedBufferAttribute(new Float32Array(max * 3), 3); this.aSRH.setUsage(T.DynamicDrawUsage);
      g.setAttribute('iPos', this.aPos); g.setAttribute('iCol', this.aCol); g.setAttribute('iSRH', this.aSRH);
      g.instanceCount = 0;
      this.mat = new T.ShaderMaterial({
        vertexShader: PVERT, fragmentShader: additive ? PFRAG_ADD : PFRAG_SMOKE,
        uniforms: { uTex: { value: tex }, uFogD: { value: 0 }, uFogC: { value: new T.Color() } },
        transparent: true, depthWrite: false,
        blending: additive ? T.AdditiveBlending : T.NormalBlending
      });
      this.mesh = new T.Mesh(g, this.mat);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = additive ? 3 : 2;
      this.g = g;
      this.n = 0;
    }
    spawn(o) {
      let i = this.free.pop();
      if (i === undefined) return -1;
      this.alive[i] = 1; this.ctrl[i] = o.ctrl ? 1 : 0;
      const p = this.p, v = this.v;
      p[i * 3] = o.x; p[i * 3 + 1] = o.y; p[i * 3 + 2] = o.z;
      v[i * 3] = o.vx || 0; v[i * 3 + 1] = o.vy || 0; v[i * 3 + 2] = o.vz || 0;
      this.age[i] = 0; this.life[i] = o.life || 1;
      this.s0[i] = o.s0 || 1; this.s1[i] = o.s1 !== undefined ? o.s1 : (o.s0 || 1);
      const c = o.c || [1, 1, 1];
      this.col[i * 3] = c[0]; this.col[i * 3 + 1] = c[1]; this.col[i * 3 + 2] = c[2];
      this.a0[i] = o.a !== undefined ? o.a : 1;
      this.rot[i] = Math.random() * 6.28; this.rotV[i] = (Math.random() - 0.5) * (o.spin || 0.6);
      this.drag[i] = o.drag || 0; this.buoy[i] = o.buoy || 0; this.grav[i] = o.grav || 0;
      this.heat0[i] = o.heat || 0; this.heatT[i] = o.heatT || 0.3;
      this.fin[i] = o.fin !== undefined ? o.fin : 0.08; this.lit[i] = o.lit !== undefined ? o.lit : 1;
      this.cur[i * 4] = this.s0[i]; this.cur[i * 4 + 1] = 0; this.cur[i * 4 + 2] = 0;
      return i;
    }
    kill(i) { if (this.alive[i]) { this.alive[i] = 0; this.ctrl[i] = 0; this.free.push(i); } }
    update(dt, cam, fogD, fogC) {
      const p = this.p, v = this.v;
      const cx = cam.position.x, cy = cam.position.y, cz = cam.position.z;
      cam.getWorldDirection(_fwd);
      let n = 0;
      for (let i = 0; i < this.max; i++) {
        if (!this.alive[i]) continue;
        if (!this.ctrl[i]) {
          const a = (this.age[i] += dt);
          const L = this.life[i];
          if (a >= L) { this.kill(i); continue; }
          const k = Math.exp(-this.drag[i] * dt);
          v[i * 3] = v[i * 3] * k + WIND.x * (1 - k) * 0.6;
          v[i * 3 + 1] = v[i * 3 + 1] * k + (this.buoy[i] - this.grav[i]) * dt;
          v[i * 3 + 2] = v[i * 3 + 2] * k + WIND.z * (1 - k) * 0.6;
          p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
          if (this.grav[i] > 0 && p[i * 3 + 1] < 0.05) { p[i * 3 + 1] = 0.05; v[i * 3 + 1] *= -0.3; v[i * 3] *= 0.5; v[i * 3 + 2] *= 0.5; }
          this.rot[i] += this.rotV[i] * dt;
          const t = a / L;
          const fi = this.fin[i] > 0 ? Math.min(1, t / this.fin[i]) : 1;
          const g1 = 1 - (1 - t) * (1 - t);
          this.cur[i * 4] = this.s0[i] + (this.s1[i] - this.s0[i]) * g1;
          this.cur[i * 4 + 1] = this.a0[i] * fi * Math.pow(1 - t, 1.3);
          this.cur[i * 4 + 2] = this.heat0[i] * Math.exp(-a / this.heatT[i]);
        }
        if (this.cur[i * 4 + 1] < 0.002) continue;
        this.order[n] = i;
        this.depth[i] = (p[i * 3] - cx) * _fwd.x + (p[i * 3 + 1] - cy) * _fwd.y + (p[i * 3 + 2] - cz) * _fwd.z;
        n++;
      }
      // sortowanie kubełkowe od najdalszych (tylko dym)
      let ord = this.order;
      if (!this.additive && n > 1) {
        let mn = Infinity, mx = -Infinity;
        for (let k = 0; k < n; k++) { const d = this.depth[ord[k]]; if (d < mn) mn = d; if (d > mx) mx = d; }
        const NB = 2048, span = (mx - mn) || 1;
        const cnt = _cnt; cnt.fill(0);
        for (let k = 0; k < n; k++) { const b = Math.min(NB - 1, Math.floor((mx - this.depth[ord[k]]) / span * NB)); _bk[k] = b; cnt[b]++; }
        let s = 0; for (let b = 0; b < NB; b++) { const c = cnt[b]; cnt[b] = s; s += c; }
        for (let k = 0; k < n; k++) _tmp[cnt[_bk[k]]++] = ord[k];
        ord = _tmp;
      }
      const P = this.aPos.array, Cc = this.aCol.array, H = this.aSRH.array;
      for (let k = 0; k < n; k++) {
        const i = ord[k];
        P[k * 3] = p[i * 3]; P[k * 3 + 1] = p[i * 3 + 1]; P[k * 3 + 2] = p[i * 3 + 2];
        const l = this.lit[i];
        Cc[k * 4] = this.col[i * 3] * l; Cc[k * 4 + 1] = this.col[i * 3 + 1] * l; Cc[k * 4 + 2] = this.col[i * 3 + 2] * l; Cc[k * 4 + 3] = this.cur[i * 4 + 1];
        H[k * 3] = this.cur[i * 4]; H[k * 3 + 1] = this.rot[i]; H[k * 3 + 2] = this.cur[i * 4 + 2];
      }
      this.n = n;
      this.g.instanceCount = n;
      this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aSRH.needsUpdate = true;
      this.mat.uniforms.uFogD.value = fogD;
      this.mat.uniforms.uFogC.value.setRGB(fogC[0], fogC[1], fogC[2]);
    }
    clear() { for (let i = 0; i < this.max; i++) this.kill(i); }
  }
  const _fwd = new T.Vector3();
  let _cnt, _bk, _tmp;

  // ---------- GRUZ ----------
  class Debris {
    constructor(max) {
      this.max = max;
      const mat = new T.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
      this.mesh = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), mat, max);
      this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = true;
      this.mesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(max * 3), 3);
      this.items = []; this.next = 0;
      this.m = new T.Matrix4(); this.q = new T.Quaternion(); this.e = new T.Euler(); this.s = new T.Vector3(); this.pp = new T.Vector3();
      this.c = new T.Color();
    }
    add(o) {
      let it;
      if (this.items.length < this.max) { it = {}; this.items.push(it); it.idx = this.items.length - 1; this.mesh.count = this.items.length; }
      else { it = this.items[this.next]; this.next = (this.next + 1) % this.max; }
      Object.assign(it, { x: o.x, y: o.y, z: o.z, vx: o.vx, vy: o.vy, vz: o.vz, rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6,
        wx: (Math.random() - 0.5) * 10, wy: (Math.random() - 0.5) * 10, wz: (Math.random() - 0.5) * 10, sx: o.s * (0.6 + Math.random() * 0.8), sy: o.s * (0.3 + Math.random() * 0.6), sz: o.s * (0.6 + Math.random() * 0.8), rest: false, hot: o.hot || 0 });
      const c = o.c || [0.4, 0.38, 0.35];
      const k = 0.7 + Math.random() * 0.4;
      this.c.setRGB(c[0] * k, c[1] * k, c[2] * k, T.SRGBColorSpace);
      this.mesh.setColorAt(it.idx, this.c);
      this.mesh.instanceColor.needsUpdate = true;
      it.moving = true;
      this.write(it);
    }
    write(it) {
      this.pp.set(it.x, it.y, it.z); this.e.set(it.rx, it.ry, it.rz); this.q.setFromEuler(this.e); this.s.set(it.sx, it.sy, it.sz);
      this.m.compose(this.pp, this.q, this.s); this.mesh.setMatrixAt(it.idx, this.m);
    }
    update(dt) {
      let any = false;
      const d = Math.min(dt, 0.05);
      for (const it of this.items) {
        if (!it.moving) continue;
        any = true;
        it.vy -= 9.81 * d;
        const k = Math.exp(-0.15 * d);
        it.vx *= k; it.vz *= k;
        it.x += it.vx * d; it.y += it.vy * d; it.z += it.vz * d;
        it.rx += it.wx * d; it.ry += it.wy * d; it.rz += it.wz * d;
        const gy = Wd.groundY(it.x, it.z) + it.sy * 0.4;
        if (it.y < gy) {
          it.y = gy;
          if (it.vy < -3) { it.vy = -it.vy * 0.3; it.vx *= 0.5; it.vz *= 0.5; it.wx *= 0.5; it.wy *= 0.5; it.wz *= 0.5; }
          else { it.vy = 0; it.vx *= 0.3; it.vz *= 0.3; if (Math.abs(it.vx) + Math.abs(it.vz) < 0.4) { it.moving = false; } }
        }
        this.write(it);
      }
      if (any) this.mesh.instanceMatrix.needsUpdate = true;
    }
    clear() { this.items = []; this.next = 0; this.mesh.count = 0; }
  }

  // ---------- SHADERY: KULA OGNIA, FALA, PYŁ ----------
  const NOISE3 = `
float h3(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0 - 2.0*f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float f3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a*n3(p); p = p*2.02 + 3.1; a *= 0.5; } return s/0.97; }
`;
  function fireballMat() {
    return new T.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uTemp: { value: 1.5 }, uAlpha: { value: 1 }, uSeed: { value: 0 }, uFogD: { value: 0 }, uFogC: { value: new T.Color() }, uSmoke: { value: 0 } },
      transparent: true, depthWrite: true,
      vertexShader: NOISE3 + `
uniform float uT, uSeed, uFogD;
varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vFog;
void main(){
  vP = position;
  float d = f3(position*2.2 + vec3(uSeed, uT*0.35, uSeed*0.7));
  vec3 p = position*(0.9 + 0.22*d);
  vec4 wp = modelMatrix*vec4(p, 1.0);
  vN = normalize(mat3(modelMatrix)*normal);
  vV = normalize(cameraPosition - wp.xyz);
  vec4 mv = viewMatrix*wp;
  gl_Position = projectionMatrix*mv;
  float fd = -mv.z; vFog = 1.0 - exp(-uFogD*uFogD*fd*fd);
}`,
      fragmentShader: NOISE3 + `
uniform float uT, uTemp, uAlpha, uSeed, uSmoke; uniform vec3 uFogC;
varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vFog;
void main(){
  float n = f3(vP*3.0 + vec3(uSeed, -uT*0.5, 0.0));
  float n2 = f3(vP*7.0 - vec3(0.0, uT*0.9, uSeed));
  float limb = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
  float t = uTemp*(0.55 + 0.65*n + 0.25*n2)*(0.55 + 0.45*limb);
  vec3 c = vec3(0.12,0.09,0.07);
  c = mix(c, vec3(0.75,0.12,0.02), smoothstep(0.15, 0.4, t));
  c = mix(c, vec3(1.0,0.45,0.05), smoothstep(0.35, 0.7, t));
  c = mix(c, vec3(1.0,0.82,0.35), smoothstep(0.65, 1.0, t));
  c = mix(c, vec3(1.0,0.98,0.92), smoothstep(1.0, 1.5, t));
  c *= 1.0 + 1.5*smoothstep(0.9, 1.6, t);
  vec3 sm = vec3(0.28,0.24,0.21)*(0.6 + 0.6*n);
  c = mix(c, sm, uSmoke*(1.0 - smoothstep(0.5, 0.9, t)));
  c = mix(c, uFogC, vFog*0.6);
  gl_FragColor = vec4(c, uAlpha*(0.75 + 0.25*limb));
}`
    });
  }
  function shellMat() {
    return new T.ShaderMaterial({
      uniforms: { uS: { value: 0 }, uCol: { value: new T.Color(0.85, 0.92, 1) } },
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 wp = modelMatrix*vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `uniform float uS; uniform vec3 uCol; varying vec3 vN; varying vec3 vV;
void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float a = pow(f, 7.0)*uS + pow(f, 2.0)*uS*0.04; gl_FragColor = vec4(uCol*a, 1.0); }`
    });
  }
  function wilsonMat() {
    return new T.ShaderMaterial({
      uniforms: { uA: { value: 0 }, uT: { value: 0 } },
      transparent: true, depthWrite: false,
      vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 wp = modelMatrix*vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: NOISE3 + `uniform float uA, uT; varying vec3 vP; varying vec3 vN; varying vec3 vV;
void main(){ float n = f3(vP*4.0 + uT*0.2); float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float a = uA*(0.25 + 0.75*pow(f, 1.5))*smoothstep(0.3, 0.7, n)*smoothstep(-0.2, 0.3, vP.y);
  gl_FragColor = vec4(vec3(0.95,0.96,0.98)*(0.8 + 0.2*n), a); }`
    });
  }
  function dustWallMat() {
    return new T.ShaderMaterial({
      uniforms: { uA: { value: 0 }, uT: { value: 0 }, uCol: { value: new T.Color(0.62, 0.56, 0.48) }, uFogD: { value: 0 }, uFogC: { value: new T.Color() } },
      transparent: true, depthWrite: false, side: T.DoubleSide,
      vertexShader: `uniform float uFogD; varying vec2 vUv; varying float vFog; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; float fd = -mv.z; vFog = 1.0 - exp(-uFogD*uFogD*fd*fd); }`,
      fragmentShader: NOISE3 + `uniform float uA, uT; uniform vec3 uCol, uFogC; varying vec2 vUv; varying float vFog;
void main(){ float n = f3(vec3(vUv.x*90.0, vUv.y*3.0 - uT*0.4, uT*0.1));
  float a = uA*pow(1.0 - vUv.y, 1.6)*smoothstep(0.25, 0.65, n + (1.0 - vUv.y)*0.35);
  vec3 c = uCol*(0.7 + 0.5*n); c = mix(c, uFogC, vFog);
  gl_FragColor = vec4(c, a); }`
    });
  }

  // ---------- INICJALIZACJA ----------
  let smoke, add, debris, scene;
  let tSmoke, tGlow;
  const sphereG = new T.SphereGeometry(1, 64, 40);
  const shellG = new T.SphereGeometry(1, 64, 32);
  const wallG = new T.CylinderGeometry(1, 1, 1, 128, 1, true).translate(0, 0.5, 0);
  F.init = function (sc) {
    scene = sc;
    tSmoke = smokeTex(); tGlow = glowTex();
    smoke = new PSys(16000, false, tSmoke);
    add = new PSys(9000, true, tGlow);
    const M = Math.max(smoke.max, add.max);
    _cnt = new Uint32Array(2048); _bk = new Uint16Array(M); _tmp = new Uint32Array(M);
    debris = new Debris(2600);
    scene.add(smoke.mesh); scene.add(add.mesh); scene.add(debris.mesh);
    F.smoke = smoke; F.add = add; F.debris = debris;
  };

  // Oświetlenie cząstek dymu przez słońce (0..1) z uwzględnieniem pory dnia
  function litFor(nx, ny, nz) {
    const P = Wd.preset, s = Wd.sunDir;
    const d = Math.max(0, nx * s.x + ny * s.y + nz * s.z);
    const day = P.night > 0.9 ? 0.12 : P.night > 0.4 ? 0.65 : 1;
    return (0.42 + 0.58 * d) * day + (P.night > 0.9 ? 0.06 : 0);
  }
  F.litFor = litFor;
  const tint = () => (Wd.timeName === 'dusk' ? [1.0, 0.82, 0.7] : Wd.timeName === 'night' ? [0.55, 0.6, 0.75] : [1, 1, 1]);

  // ---------- WYBUCH ----------
  F.spawnExplosion = function (bl) {
    const D = bl.d;
    const fx = bl.fx = { parts: [], meshes: [] };
    const P = bl.pos;
    // kula ognia
    const fb = new T.Mesh(sphereG, fireballMat());
    fb.material.uniforms.uSeed.value = Math.random() * 50;
    fb.position.copy(P); fb.scale.setScalar(0.01);
    fb.renderOrder = 1;
    scene.add(fb); fx.fb = fb; fx.meshes.push(fb);
    // fala uderzeniowa
    const sh = new T.Mesh(shellG, shellMat());
    sh.position.copy(P); sh.scale.setScalar(0.01); sh.renderOrder = 4;
    scene.add(sh); fx.shell = sh; fx.meshes.push(sh);
    // ściana pyłu przy ziemi
    const dw = new T.Mesh(wallG, dustWallMat());
    dw.position.set(P.x, Wd.groundY(P.x, P.z) - 0.2, P.z); dw.visible = false; dw.renderOrder = 2;
    scene.add(dw); fx.wall = dw; fx.meshes.push(dw);
    if (D.nuke) {
      const wi = new T.Mesh(shellG, wilsonMat());
      wi.position.copy(P); wi.visible = false; wi.renderOrder = 3;
      scene.add(wi); fx.wilson = wi; fx.meshes.push(wi);
    }
    // grzyb / słup dymu
    if (D.nuke || D.Wtnt >= 300) fx.cloud = makeCloud(bl);
    if (!D.nuke) convBurst(bl);
    fx.fireT = 0;
  };

  function convBurst(bl) {
    const D = bl.d, P = bl.pos, s = D.fbR;
    const cw = Math.cbrt(D.Wtnt);
    const gy = Wd.groundY(P.x, P.z);
    const tn = tint();
    const nFire = Math.min(140, Math.round(26 + 14 * cw));
    for (let i = 0; i < nFire; i++) {
      const u = randDir(D.hob < 1);
      const sp = s / D.tfb * (0.25 + Math.random() * 0.7);
      add.spawn({ x: P.x + u[0] * s * 0.2, y: P.y + u[1] * s * 0.2 + s * 0.1, z: P.z + u[2] * s * 0.2, vx: u[0] * sp, vy: u[1] * sp, vz: u[2] * sp, drag: 1 / (D.tfb * 1.2), buoy: s * 0.5,
        life: D.tfb * (2 + Math.random() * 3), s0: s * 0.5, s1: s * (1.1 + Math.random() * 0.6), c: [1, 0.55, 0.15], a: 0.9, heat: 2.2, heatT: D.tfb * 1.5, fin: 0.04 });
    }
    // czarny dym
    const nSm = Math.min(180, Math.round(30 + 16 * cw));
    const smokeLife = 6 + 4 * Math.pow(D.Wtnt, 0.18);
    for (let i = 0; i < nSm; i++) {
      const u = randDir(D.hob < 1);
      const sp = s / D.tfb * (0.08 + Math.random() * 0.22);
      const dark = 0.1 + Math.random() * 0.12;
      smoke.spawn({ x: P.x + u[0] * s * 0.4, y: P.y + Math.abs(u[1]) * s * 0.4 + s * 0.2, z: P.z + u[2] * s * 0.4, vx: u[0] * sp, vy: u[1] * sp * 0.6 + s * 0.3, vz: u[2] * sp,
        drag: 1.2, buoy: s * (0.25 + Math.random() * 0.3), life: smokeLife * (0.6 + Math.random() * 0.8), s0: s * 0.7, s1: s * (2.2 + Math.random() * 1.6),
        c: [dark * tn[0], dark * tn[1], dark * 0.95 * tn[2]], a: 0.92, heat: 1.4, heatT: D.tfb * 2.5, fin: 0.03, lit: 1 });
    }
    // pył z ziemi rozchodzący się pierścieniem
    if (D.hob < s * 2) {
      const nD = Math.min(90, Math.round(16 + 10 * cw));
      const dl = litFor(0, 1, 0);
      for (let i = 0; i < nD; i++) {
        const a = Math.random() * 6.283, sp = s * (2 + Math.random() * 3) / Math.max(0.6, D.tfb * 4);
        smoke.spawn({ x: P.x + Math.cos(a) * s * 0.5, y: gy + s * 0.3, z: P.z + Math.sin(a) * s * 0.5, vx: Math.cos(a) * sp, vy: s * 0.15, vz: Math.sin(a) * sp, drag: 1.3, buoy: s * 0.05,
          life: 3 + Math.random() * 4, s0: s * 0.6, s1: s * (2 + Math.random()), c: [0.6 * tn[0], 0.55 * tn[1], 0.47 * tn[2]], a: 0.55, fin: 0.1, lit: dl });
      }
    }
    // iskry i grudy ziemi
    const nSp = Math.min(120, 30 + 12 * cw);
    for (let i = 0; i < nSp; i++) {
      const u = randDir(true), sp = (20 + Math.random() * 60) * Math.pow(D.Wtnt, 0.12);
      add.spawn({ x: P.x, y: P.y + 0.2, z: P.z, vx: u[0] * sp, vy: Math.abs(u[1]) * sp, vz: u[2] * sp, grav: 9.81, drag: 0.4, life: 0.4 + Math.random() * 1.2, s0: s * 0.06 + 0.04, s1: 0.02, c: [1, 0.7, 0.3], a: 1, heat: 1.5, heatT: 0.5, fin: 0 });
    }
    if (D.craterR > 0 || D.Wtnt > 1) {
      const nDeb = Math.min(110, Math.round(10 + 18 * cw));
      for (let i = 0; i < nDeb; i++) {
        const u = randDir(true), sp = (6 + Math.random() * 22) * Math.pow(D.Wtnt, 0.1);
        debris.add({ x: P.x + u[0] * 0.3, y: P.y + 0.3, z: P.z + u[2] * 0.3, vx: u[0] * sp, vy: Math.abs(u[1]) * sp * 1.2 + 3, vz: u[2] * sp, s: Math.max(0.05, (D.craterR || 0.5) * 0.12 * (0.4 + Math.random())), c: [0.36, 0.3, 0.24] });
      }
    }
    // odłamki granatu
    if (bl.w.frag) {
      for (let i = 0; i < 260; i++) {
        const u = randDir(true), sp = 500 + Math.random() * 900;
        add.spawn({ x: P.x, y: P.y + 0.4, z: P.z, vx: u[0] * sp, vy: Math.abs(u[1]) * sp * 0.6, vz: u[2] * sp, life: 0.015 + Math.random() * 0.02, s0: 0.3, s1: 0.18, c: [1, 0.85, 0.5], a: 1, heat: 1.4, heatT: 0.05, fin: 0 });
      }
    }
    // strumień kumulacyjny
    if (bl.w.shaped && bl.dir) {
      for (let i = 0; i < 30; i++) {
        const sp = 300 + Math.random() * 900, j = 0.05;
        add.spawn({ x: P.x, y: P.y, z: P.z, vx: (bl.dir.x + (Math.random() - 0.5) * j) * sp, vy: (bl.dir.y + (Math.random() - 0.5) * j) * sp, vz: (bl.dir.z + (Math.random() - 0.5) * j) * sp, life: 0.01 + Math.random() * 0.02, s0: 0.3, s1: 0.1, c: [1, 0.9, 0.7], a: 1, heat: 2, heatT: 0.05, fin: 0 });
      }
    }
  }
  function randDir(upper) {
    let x, y, z, l;
    do { x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1; l = x * x + y * y + z * z; } while (l > 1 || l < 0.01);
    l = Math.sqrt(l);
    y = y / l; if (upper) y = Math.abs(y);
    return [x / l, y, z / l];
  }
  F.randDir = randDir;

  // ---------- GRZYB ----------
  function makeCloud(bl) {
    const D = bl.d;
    const nuke = D.nuke;
    const cl = { cap: [], stem: [], skirt: [], bl };
    const nCap = nuke ? 1500 : 320, nStem = nuke ? 520 : 130, nSkirt = nuke ? 260 : 70;
    for (let i = 0; i < nCap; i++) {
      const id = smoke.spawn({ x: 0, y: -1e6, z: 0, ctrl: true, s0: 1 });
      if (id < 0) break;
      cl.cap.push({ id, th: Math.random() * 6.283, ph: Math.random() * 6.283, rho: Math.sqrt(Math.random()), j: Math.random(), k: 0.5 + Math.random() * 0.6, sh: Math.random() });
    }
    for (let i = 0; i < nStem; i++) {
      const id = smoke.spawn({ x: 0, y: -1e6, z: 0, ctrl: true, s0: 1 });
      if (id < 0) break;
      cl.stem.push({ id, th: Math.random() * 6.283, s: Math.random(), rho: Math.sqrt(Math.random()), j: Math.random(), k: 0.6 + Math.random() * 0.6 });
    }
    for (let i = 0; i < nSkirt; i++) {
      const id = smoke.spawn({ x: 0, y: -1e6, z: 0, ctrl: true, s0: 1 });
      if (id < 0) break;
      cl.skirt.push({ id, th: Math.random() * 6.283, rho: 0.6 + Math.random() * 0.6, j: Math.random(), k: 0.6 + Math.random() * 0.8 });
    }
    return cl;
  }
  function updateCloud(cl, t) {
    const bl = cl.bl, D = bl.d, P = bl.pos;
    const nuke = D.nuke;
    const gy = Wd.groundY(P.x, P.z);
    const x = t / D.tRise;
    const rise = 1 - Math.exp(-2.4 * x);
    const z0 = D.hob + D.fbR * (D.hob > D.fbR ? 0.2 : 0.6);
    const zc = gy + z0 + (D.Htop * 0.8 - z0) * rise;
    const grow = 1 - Math.exp(-2.0 * x);
    const Rr = D.fbR * 0.45 + (D.capR * 0.6 - D.fbR * 0.45) * grow;
    const rr = D.fbR * 0.8 + (D.capR * 0.46 - D.fbR * 0.8) * grow;
    const flat = nuke ? 0.6 : 0.75;
    const stemR = D.fbR * 0.3 + (D.capR * (nuke ? 0.15 : 0.22) - D.fbR * 0.3) * grow;
    const roll = 6.283 * 1.4 * (1 - Math.exp(-x * 1.3));
    const fadeIn = Ut.smooth(D.tfb * 0.5, D.tfb * 2.6, t);
    const late = nuke ? 1 - Ut.smooth(D.tRise * 5, D.tRise * 9, t) : 1 - Ut.smooth(D.tRise * 3, D.tRise * 6, t);
    const tn = tint();
    const sp = smoke.p, cur = smoke.cur, col = smoke.col;
    const s = Wd.sunDir;
    const ageRed = nuke ? Ut.smooth(D.tRise * 0.5, 0, t) : 0;
    const base = nuke ? [1.0, 0.95, 0.9] : [0.2, 0.18, 0.17];
    const day = Wd.preset.night > 0.9 ? 0.12 : Wd.preset.night > 0.4 ? 0.6 : 1;
    const night = Wd.preset.night;
    for (const c of cl.cap) {
      const ph = c.ph - roll * (0.7 + 0.6 * c.j);
      const cr = Math.cos(ph), sr = Math.sin(ph);
      const rad = Rr + c.rho * rr * cr;
      const th = c.th + 0.15 * Math.sin(t * 0.05 + c.j * 6);
      const ct = Math.cos(th), st = Math.sin(th);
      const i = c.id;
      sp[i * 3] = P.x + rad * ct; sp[i * 3 + 1] = zc + c.rho * rr * sr * flat + rr * 0.1 * (c.sh - 0.5); sp[i * 3 + 2] = P.z + rad * st;
      const nx = cr * ct, ny = sr, nz = cr * st;
      const l = Math.max(0, nx * s.x + ny * s.y + nz * s.z);
      const lit = ((0.5 + 0.55 * l) * day + 0.05 * night) * (0.82 + 0.18 * (1 - c.rho));
      const heat = 2.0 * Math.exp(-t / (D.tfb * (2.2 + 4.5 * (1 - c.rho)))) * (nuke ? 1 : 0.6);
      cur[i * 4] = rr * (0.5 + 0.55 * c.k) * (0.45 + 0.55 * Ut.smooth(0, D.tfb * 3, t));
      cur[i * 4 + 1] = 0.85 * fadeIn * late;
      cur[i * 4 + 2] = heat + (nuke ? 0.12 * night * Math.exp(-t / (D.tRise * 0.6)) : 0);
      const red = ageRed * 0.4;
      col[i * 3] = base[0] * tn[0] * lit * (1 + red * 0.1); col[i * 3 + 1] = base[1] * tn[1] * lit * (1 - red * 0.4); col[i * 3 + 2] = base[2] * tn[2] * lit * (1 - red * 0.55);
      smoke.lit[i] = 1;
    }
    const Htop = Math.max(0, zc - gy - rr * flat * 0.4);
    const stemVis = Ut.smooth(D.tfb * 1.5, D.tRise * 0.35, t);
    const dl = Wd.preset.night > 0.9 ? 0.1 : Wd.preset.night > 0.4 ? 0.55 : 0.85;
    for (const c of cl.stem) {
      const sfrac = (c.s + t / (D.tRise * 0.6) * (0.6 + 0.4 * c.j)) % 1;
      const i = c.id;
      const h = sfrac * Htop;
      const vis = h < Htop * stemVis ? 1 : 0;
      const r = stemR * (0.5 + 0.7 * c.rho) * (1 + 1.8 * Math.pow(1 - sfrac, 7));
      const th = c.th + sfrac * 2.0;
      sp[i * 3] = P.x + r * Math.cos(th); sp[i * 3 + 1] = gy + h + stemR * 0.3; sp[i * 3 + 2] = P.z + r * Math.sin(th);
      cur[i * 4] = stemR * (0.9 + 0.7 * c.k) * (1 + (1 - sfrac) * 0.5);
      cur[i * 4 + 1] = 0.7 * vis * Ut.smooth(0, 0.08, sfrac) * Ut.smooth(1, 0.82, sfrac) * fadeIn * late;
      cur[i * 4 + 2] = nuke ? 0.6 * Math.exp(-t / (D.tfb * 4)) * sfrac : 0;
      const lc = dl * (0.6 + 0.4 * Math.max(0, Math.cos(th) * s.x + Math.sin(th) * s.z));
      const bc = nuke ? [0.8, 0.72, 0.64] : [0.24, 0.21, 0.19];
      col[i * 3] = bc[0] * tn[0] * lc; col[i * 3 + 1] = bc[1] * tn[1] * lc; col[i * 3 + 2] = bc[2] * tn[2] * lc;
      smoke.lit[i] = 1;
    }
    const baseR = stemR * 1.6 + D.capR * 0.5 * grow;
    const skVis = Ut.smooth(D.tfb, D.tfb * 6, t) * (D.hob < D.fbR * 3 || nuke ? 1 : 0);
    for (const c of cl.skirt) {
      const i = c.id;
      const r = baseR * c.rho;
      const th = c.th + t * 0.002;
      sp[i * 3] = P.x + r * Math.cos(th); sp[i * 3 + 1] = gy + stemR * 0.35 * c.k; sp[i * 3 + 2] = P.z + r * Math.sin(th);
      cur[i * 4] = stemR * (1.1 + c.k);
      cur[i * 4 + 1] = 0.5 * skVis * late;
      cur[i * 4 + 2] = 0;
      col[i * 3] = 0.62 * tn[0] * dl; col[i * 3 + 1] = 0.56 * tn[1] * dl; col[i * 3 + 2] = 0.48 * tn[2] * dl;
      smoke.lit[i] = 1;
    }
    cl.zc = zc; cl.rr = rr; cl.Rr = Rr;
    if (late <= 0) { for (const g of [cl.cap, cl.stem, cl.skirt]) for (const c of g) smoke.kill(c.id); cl.dead = true; }
  }
  F.cloudTop = (bl) => (bl.fx && bl.fx.cloud && bl.fx.cloud.zc ? bl.fx.cloud.zc + bl.fx.cloud.rr * 0.6 : 0);

  // Aktualizacja efektów jednego wybuchu (t – czas symulacji od detonacji)
  F.updateBlast = function (bl, dtSim, dtA) {
    const D = bl.d, fx = bl.fx, t = bl.t, P = bl.pos;
    if (!fx) return;
    const gy = Wd.groundY(P.x, P.z);
    const fogD = Wd.scene.fog.density, fogC = Wd.fogDisplay;
    // kula ognia
    if (fx.fb) {
      const fb = fx.fb, u = fb.material.uniforms;
      let R, temp, alpha, smk = 0;
      if (D.nuke) {
        R = D.fbR * Math.min(1, Math.pow(t / D.tfb, 0.4)) * (1 + 0.25 * Ut.smooth(D.tfb, D.tfb * 6, t));
        temp = 1.7 * (t < D.tfb ? 1 : Math.exp(-(t - D.tfb) / (D.tfb * 3.2)));
        alpha = 1 - Ut.smooth(D.tfb * 3, D.tfb * 8, t);
        const cz = fx.cloud && fx.cloud.zc ? fx.cloud.zc : P.y;
        fb.position.set(P.x, Ut.lerp(P.y, cz, Ut.smooth(D.tfb * 0.6, D.tfb * 4, t)), P.z);
        fb.scale.set(R, R * Ut.lerp(1, 0.7, Ut.smooth(D.tfb, D.tfb * 4, t)), R);
        smk = Ut.smooth(D.tfb * 1.5, D.tfb * 5, t);
      } else {
        R = D.fbR * Math.min(1, Math.pow(t / D.tfb, 0.33)) * (1 + 0.3 * Ut.smooth(D.tfb, D.tfb * 3, t));
        temp = 1.6 * (t < D.tfb * 0.6 ? 1 : Math.exp(-(t - D.tfb * 0.6) / (D.tfb * 0.9)));
        alpha = 1 - Ut.smooth(D.tfb * 0.9, D.tfb * 2.2, t);
        fb.position.set(P.x, P.y + R * 0.15 + D.fbR * 0.3 * Ut.smooth(D.tfb, D.tfb * 4, t), P.z);
        fb.scale.setScalar(R);
        smk = 0.6 * Ut.smooth(D.tfb * 0.8, D.tfb * 2.5, t);
      }
      u.uT.value = t / D.tfb * 2; u.uTemp.value = temp; u.uAlpha.value = alpha; u.uSmoke.value = smk;
      u.uFogD.value = fogD; u.uFogC.value.setRGB(fogC[0], fogC[1], fogC[2]);
      if (alpha <= 0.001) { scene.remove(fb); fb.material.dispose(); fx.fb = null; }
    }
    // fala uderzeniowa
    const R = Ph.frontAt(D.front, t);
    bl.frontR = R;
    const pF = Ph.overpressure(R, D.cbrtW);
    if (fx.shell) {
      const str = Ut.smooth(1.5, 25, pF) * (R > D.fbR * 1.05 ? 1 : 0.15);
      fx.shell.scale.setScalar(Math.max(R, 0.01));
      fx.shell.material.uniforms.uS.value = str * (D.nuke ? 0.9 : 0.7);
      if (pF < 1.2) { scene.remove(fx.shell); fx.shell.material.dispose(); fx.shell = null; }
    }
    if (fx.wilson) {
      const a = Ut.smooth(D.tfb * 0.7, D.tfb * 1.4, t) * (1 - Ut.smooth(D.tfb * 2.2, D.tfb * 4, t));
      fx.wilson.visible = a > 0.005;
      fx.wilson.scale.setScalar(Math.max(R * 0.98, D.fbR * 1.2));
      fx.wilson.material.uniforms.uA.value = a * 0.55;
      fx.wilson.material.uniforms.uT.value = t;
      if (t > D.tfb * 4.2) { scene.remove(fx.wilson); fx.wilson.material.dispose(); fx.wilson = null; }
    }
    if (fx.wall) {
      const dy = P.y - gy;
      const Rg = R > dy ? Math.sqrt(R * R - dy * dy) : 0;
      const pg = Ph.overpressure(Math.max(R, 0.1), D.cbrtW);
      const str = Ut.smooth(3, 40, pg);
      const H = Math.max(0.3, Rg * (D.nuke ? 0.07 : 0.16) * (0.4 + 0.6 * str));
      fx.wall.visible = Rg > D.fbR * 0.6 && str > 0.01;
      fx.wall.scale.set(Math.max(Rg, 0.1), H, Math.max(Rg, 0.1));
      const mu = fx.wall.material.uniforms;
      mu.uA.value = str * 0.85; mu.uT.value = t; mu.uFogD.value = fogD; mu.uFogC.value.setRGB(fogC[0], fogC[1], fogC[2]);
      const lc = litFor(0, 0.6, 0.8);
      mu.uCol.value.setRGB(0.62 * lc, 0.56 * lc, 0.48 * lc);
      if (pg < 2.5 && Rg > D.fbR * 3) { scene.remove(fx.wall); fx.wall.material.dispose(); fx.wall = null; }
    }
    if (fx.cloud && !fx.cloud.dead) updateCloud(fx.cloud, t);
    // pył wzbijany przy ziemi przez czoło fali (średnie wybuchy)
    if (!D.nuke && R > D.fbR && pF > 8 && dtA > 0) {
      const dy = P.y - gy, Rg = R > dy ? Math.sqrt(R * R - dy * dy) : 0;
      const n = Math.min(6, Math.round(dtA * 60 * Ut.smooth(8, 60, pF) * 2));
      const dl = litFor(0, 1, 0), tn = tint();
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283;
        smoke.spawn({ x: P.x + Math.cos(a) * Rg, y: gy + D.fbR * 0.2, z: P.z + Math.sin(a) * Rg, vx: Math.cos(a) * 5, vy: 1, vz: Math.sin(a) * 5, drag: 1, buoy: 0.5,
          life: 2.5 + Math.random() * 3, s0: D.fbR * 0.5, s1: D.fbR * 1.6, c: [0.62 * tn[0], 0.57 * tn[1], 0.5 * tn[2]], a: 0.4 * Ut.smooth(8, 40, pF), fin: 0.15, lit: dl });
      }
    }
    // dym unoszący się z leja po wybuchu konwencjonalnym
    if (!D.nuke && t > D.tfb && t < D.tfb + 8 + Math.cbrt(D.Wtnt) * 2 && dtA > 0) {
      fx.smAcc = (fx.smAcc || 0) + dtSim * Math.min(30, 4 + Math.cbrt(D.Wtnt) * 2);
      const tn = tint();
      while (fx.smAcc > 1) {
        fx.smAcc -= 1;
        const s = D.fbR;
        smoke.spawn({ x: P.x + (Math.random() - 0.5) * s, y: gy + s * 0.5, z: P.z + (Math.random() - 0.5) * s, vx: 0, vy: s * 0.8, vz: 0, drag: 0.6, buoy: s * 0.3,
          life: 6 + Math.random() * 6, s0: s * 0.8, s1: s * 3.2, c: [0.16 * tn[0], 0.15 * tn[1], 0.14 * tn[2]], a: 0.6, fin: 0.1, lit: 1 });
      }
    }
  };

  F.removeBlast = function (bl) {
    if (!bl.fx) return;
    for (const m of bl.fx.meshes) { if (m.parent) scene.remove(m); m.material.dispose(); }
    if (bl.fx.cloud && !bl.fx.cloud.dead) for (const g of [bl.fx.cloud.cap, bl.fx.cloud.stem, bl.fx.cloud.skirt]) for (const c of g) smoke.kill(c.id);
    bl.fx = null;
  };

  // ---------- EFEKTY BUDYNKÓW ----------
  let debrisBudget = 200, dustBudget = 120;
  const camPos = new T.Vector3();
  function nearEnough(b, k) {
    const d = Math.hypot(b.x - camPos.x, b.y + b.sy * 0.5 - camPos.y, b.z - camPos.z);
    return Math.max(b.sx, b.sy, b.sz) / Math.max(d, 1) > (k || 0.004);
  }
  F.glassBurst = function (b, bl) {
    if (!nearEnough(b, 0.02) || debrisBudget <= 0) return;
    const P = bl.pos;
    const n = Math.min(14, 4 + Math.round(b.sy / 6));
    const dx = b.x - P.x, dz = b.z - P.z;
    const fx = Math.abs(dx) > Math.abs(dz);
    for (let i = 0; i < n; i++) {
      let x, z;
      if (fx) { x = b.x - Math.sign(dx) * b.sx / 2; z = b.z + (Math.random() - 0.5) * b.sz; }
      else { z = b.z - Math.sign(dz) * b.sz / 2; x = b.x + (Math.random() - 0.5) * b.sx; }
      const y = b.y + 1 + Math.random() * Math.min(b.sy - 1, 40);
      const sp = 3 + Math.random() * 8;
      add.spawn({ x, y, z, vx: Math.sign(dx) * sp * (fx ? 1 : 0.3) + (Math.random() - 0.5) * 3, vy: Math.random() * 2, vz: Math.sign(dz) * sp * (fx ? 0.3 : 1) + (Math.random() - 0.5) * 3,
        grav: 9.81, life: 1 + Math.random() * 1.5, s0: 0.25, s1: 0.15, c: [0.75, 0.9, 1], a: 0.9, fin: 0 });
    }
    debrisBudget -= 2;
    if (EP.audio) EP.audio.glass(Math.hypot(b.x - camPos.x, b.z - camPos.z));
  };
  F.collapseFx = function (b, bl, L) {
    if (!nearEnough(b, 0.004)) return;
    const vol = b.sx * b.sy * b.sz;
    const nDeb = Math.min(debrisBudget, Math.round(Ut.clamp(Math.cbrt(vol) * (L >= 3 ? 1.2 : 0.5), 3, 36)));
    const dir = [b.tdx, b.tdz];
    const pF = Math.max(10, Math.min(400, bl.frontP || 50));
    const push = Math.min(50, Math.sqrt(pF) * 1.6);
    for (let i = 0; i < nDeb; i++) {
      const s = Math.max(0.3, Math.min(b.sx, b.sz) * (0.04 + Math.random() * 0.08));
      debris.add({ x: b.x + (Math.random() - 0.5) * b.sx, y: b.y + Math.random() * b.sy * 0.8, z: b.z + (Math.random() - 0.5) * b.sz,
        vx: dir[0] * push * Math.random() + (Math.random() - 0.5) * 6, vy: Math.random() * 8, vz: dir[1] * push * Math.random() + (Math.random() - 0.5) * 6, s, c: b.color.map((c) => Math.pow(c, 0.45)) });
    }
    debrisBudget -= nDeb;
    const nDust = Math.min(dustBudget, L >= 3 ? 7 : 3);
    const tn = tint(), dl = litFor(0, 1, 0);
    const fp = Math.max(b.sx, b.sz);
    for (let i = 0; i < nDust; i++) {
      smoke.spawn({ x: b.x + (Math.random() - 0.5) * b.sx, y: b.y + fp * 0.3, z: b.z + (Math.random() - 0.5) * b.sz, vx: dir[0] * 4 + (Math.random() - 0.5) * 4, vy: 1 + Math.random() * 2, vz: dir[1] * 4 + (Math.random() - 0.5) * 4,
        drag: 0.5, buoy: 0.6, life: 8 + Math.random() * 8, s0: fp * 0.7, s1: fp * (1.8 + Math.random()), c: [0.68 * tn[0], 0.63 * tn[1], 0.56 * tn[2]], a: 0.6, fin: 0.06, lit: dl });
    }
    dustBudget -= nDust;
    if (EP.audio && nearEnough(b, 0.03)) EP.audio.crumble(Math.hypot(b.x - camPos.x, b.z - camPos.z), Math.cbrt(vol));
  };
  F.collapseDust = function (b, dtA) {
    if (dustBudget <= 0 || Math.random() > dtA * 6 || !nearEnough(b, 0.006)) return;
    const fp = Math.max(b.sx, b.sz), tn = tint(), dl = litFor(0, 1, 0);
    smoke.spawn({ x: b.x + (Math.random() - 0.5) * b.sx, y: b.y + b.sy * b.hf, z: b.z + (Math.random() - 0.5) * b.sz, vx: (Math.random() - 0.5) * 3, vy: -1, vz: (Math.random() - 0.5) * 3,
      drag: 0.6, buoy: 0.3, life: 7 + Math.random() * 6, s0: fp * 0.6, s1: fp * 1.6, c: [0.68 * tn[0], 0.63 * tn[1], 0.56 * tn[2]], a: 0.5, fin: 0.1, lit: dl });
    dustBudget--;
  };

  // ---------- POŻARY ----------
  let fireSel = [], fireTimer = 0;
  function updateFires(dtA, dtSim, cam) {
    const C = EP.city;
    if (!C.burning.length) { fireSel = []; return; }
    fireTimer -= dtA;
    if (fireTimer <= 0) {
      fireTimer = 0.4;
      // najbliższe płonące budynki, a przy oglądaniu z daleka losowa próbka
      const arr = [];
      for (const i of C.burning) {
        const b = C.B[i];
        if (b.burn < 0.05) continue;
        const d = Math.hypot(b.x - cam.position.x, b.y - cam.position.y, b.z - cam.position.z);
        arr.push([d / Math.max(4, Math.max(b.sx, b.sz)), i, d]);
      }
      arr.sort((a, b) => a[0] - b[0]);
      fireSel = arr.slice(0, 70);
    }
    const tn = tint();
    const scale = Math.max(1, dtSim > 0 ? 1 : 0);
    if (dtA <= 0) return;
    const camD = EP.cam ? EP.cam.dist : 500;
    for (const [, i, d] of fireSel) {
      const b = C.B[i];
      const fp = Math.max(b.sx, b.sz);
      const top = b.y + b.sy * b.hf;
      const vis = Math.max(fp * 0.45, camD * 0.006);
      const rate = b.burn * scale * (fireSel.length > 40 ? 3 : 6);
      b._fa = (b._fa || 0) + dtA * rate;
      while (b._fa > 1) {
        b._fa -= 1;
        const x = b.x + (Math.random() - 0.5) * b.sx * 0.8, z = b.z + (Math.random() - 0.5) * b.sz * 0.8;
        add.spawn({ x, y: top + vis * 0.1, z, vx: 0, vy: vis * 0.8, vz: 0, drag: 0.8, buoy: vis * 0.5, life: 0.9 + Math.random() * 0.8, s0: vis * 0.7, s1: vis * 0.25, c: [1, 0.5, 0.12], a: 0.85, heat: 1.6, heatT: 0.6, fin: 0.12 });
        if (Math.random() < 0.55) {
          const g = 0.08 + Math.random() * 0.1;
          smoke.spawn({ x, y: top + vis * 0.6, z, vx: 0, vy: vis * 0.6, vz: 0, drag: 0.35, buoy: vis * 0.2, life: 8 + Math.random() * 8, s0: vis * 0.8, s1: vis * 4, c: [g * tn[0], g * tn[1], g * tn[2]], a: 0.55, heat: 0.6, heatT: 1, fin: 0.06, lit: 1 });
        }
      }
    }
  }

  // ---------- SMUGI POCISKÓW ----------
  F.trail = function (x, y, z, s, kind) {
    const tn = tint(), dl = litFor(0, 1, 0);
    if (kind === 'fire') {
      add.spawn({ x, y, z, life: 0.12 + Math.random() * 0.1, s0: s * 1.2, s1: s * 0.4, c: [1, 0.6, 0.2], a: 1, heat: 1.8, heatT: 0.1, fin: 0 });
    } else if (kind === 'spark') {
      const u = randDir(false);
      add.spawn({ x, y, z, vx: u[0] * 1.5, vy: u[1] * 1.5 + 1, vz: u[2] * 1.5, grav: 6, life: 0.2 + Math.random() * 0.35, s0: s, s1: s * 0.3, c: [1, 0.8, 0.4], a: 1, heat: 1.6, heatT: 0.2, fin: 0 });
    } else if (kind === 'plasma') {
      add.spawn({ x, y, z, life: 0.25 + Math.random() * 0.2, s0: s * 1.5, s1: s * 0.5, c: [1, 0.75, 0.45], a: 1, heat: 2.2, heatT: 0.2, fin: 0 });
    } else {
      const g = kind === 'dark' ? 0.3 : 0.86;
      smoke.spawn({ x, y, z, vx: (Math.random() - 0.5) * s, vy: (Math.random() - 0.3) * s, vz: (Math.random() - 0.5) * s, drag: 0.5, buoy: 0.2, life: 3 + Math.random() * 4, s0: s * 0.8, s1: s * 3.5, c: [g * tn[0], g * tn[1], g * tn[2]], a: 0.55, fin: 0.04, lit: dl });
    }
  };
  F.muzzle = function (x, y, z, dir, s) {
    for (let i = 0; i < 18; i++) {
      const sp = (10 + Math.random() * 30) * s;
      add.spawn({ x, y, z, vx: dir.x * sp + (Math.random() - 0.5) * 6, vy: dir.y * sp + (Math.random() - 0.5) * 6, vz: dir.z * sp + (Math.random() - 0.5) * 6, drag: 6, life: 0.15 + Math.random() * 0.15, s0: s * 1.5, s1: s * 0.6, c: [1, 0.7, 0.3], a: 1, heat: 2, heatT: 0.1, fin: 0 });
    }
    const tn = tint();
    for (let i = 0; i < 14; i++) {
      const sp = (4 + Math.random() * 14) * s;
      smoke.spawn({ x, y, z, vx: dir.x * sp + (Math.random() - 0.5) * 3, vy: dir.y * sp + Math.random() * 2, vz: dir.z * sp + (Math.random() - 0.5) * 3, drag: 1.5, buoy: 0.4, life: 3 + Math.random() * 3, s0: s * 1.2, s1: s * 4, c: [0.75 * tn[0], 0.73 * tn[1], 0.7 * tn[2]], a: 0.6, fin: 0.05, lit: litFor(0, 1, 0) });
    }
  };

  // ---------- PĘTLA ----------
  F.update = function (dtA, dtSim, cam) {
    camPos.copy(cam.position);
    debrisBudget = 220; dustBudget = 140;
    updateFires(dtA, dtSim, cam);
    const fogD = Wd.scene.fog.density, fogC = Wd.fogDisplay;
    smoke.update(dtA, cam, fogD, fogC);
    add.update(dtA, cam, fogD, fogC);
    debris.update(dtA);
  };
  F.clear = function () { smoke.clear(); add.clear(); debris.clear(); fireSel = []; };
})();
