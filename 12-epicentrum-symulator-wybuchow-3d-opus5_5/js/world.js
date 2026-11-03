// Świat: renderer, niebo, światła, teren z okolicą (do 400 km), mapa pokrycia terenu, pory dnia
(function () {
  const T = THREE;
  const Ut = EP.util;
  const S = EP.shaders;
  const Wd = EP.world = {};

  Wd.LAND_SIZE = 320000;
  Wd.LAND_RES = 1024;
  Wd.riverX = (z) => 700 + 260 * Math.sin(z / 900) + 120 * Math.sin(z / 370 + 1.3);
  Wd.HIGHWAYS = [0.35, 1.95, 3.55, 5.0];

  let renderer, scene, camera, sun, hemi, sky, skyMat, terrain;
  const xLights = [];

  Wd.init = function (canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene();
    scene.fog = new T.FogExp2(0xb8c8d8, 0.00012);
    camera = new T.PerspectiveCamera(50, 1, 0.1, 50000);
    Wd.renderer = renderer; Wd.scene = scene; Wd.camera = camera;

    hemi = new T.HemisphereLight(0x9fb4d0, 0x5a5040, 1.0);
    scene.add(hemi);
    sun = new T.DirectionalLight(0xfff2e0, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    scene.add(sun); scene.add(sun.target);
    Wd.sun = sun; Wd.hemi = hemi;
    // Stała liczba świateł punktowych, żeby nie przekompilowywać shaderów
    for (let i = 0; i < 3; i++) {
      const l = new T.PointLight(0xffc080, 0, 100, 0);
      l.visible = true;
      scene.add(l);
      xLights.push(l);
    }
    Wd.xLights = xLights;

    buildSky();
    buildLand();
    buildTerrain();
    Wd.setTime('day');
  };

  // ---------- NIEBO ----------
  function buildSky() {
    skyMat = new T.ShaderMaterial({
      side: T.BackSide, depthWrite: false, fog: false,
      uniforms: {
        uZen: { value: new T.Color() }, uHor: { value: new T.Color() }, uSunDir: { value: new T.Vector3(0, 1, 0) },
        uSunCol: { value: new T.Color() }, uNight: { value: 0 },
        uGlowDir: { value: new T.Vector3(0, 1, 0) }, uGlowCol: { value: new T.Color(1, 0.6, 0.3) }, uGlow: { value: 0 },
        uFlash: { value: 0 }
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
      fragmentShader: `
        uniform vec3 uZen, uHor, uSunDir, uSunCol, uGlowDir, uGlowCol; uniform float uNight, uGlow, uFlash;
        varying vec3 vDir;
        float h(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        void main(){
          vec3 d = normalize(vDir);
          float e = clamp(d.y, -0.2, 1.0);
          vec3 c = mix(uHor, uZen, pow(clamp(e, 0.0, 1.0), 0.55));
          c = mix(c, uHor*0.6, smoothstep(0.0, -0.2, d.y));
          float sd = max(dot(d, uSunDir), 0.0);
          c += uSunCol*(pow(sd, 900.0)*6.0 + pow(sd, 12.0)*0.25*(1.0 - uNight*0.7));
          if (uNight > 0.5){
            vec3 g = floor(d*420.0);
            float s = step(0.9975, h(g))*smoothstep(0.0, 0.25, d.y);
            c += vec3(0.9,0.92,1.0)*s*(0.5 + 0.5*h(g + 7.0))*uNight;
          }
          float gd = max(dot(d, uGlowDir), 0.0);
          c += uGlowCol*uGlow*(pow(gd, 6.0)*0.8 + pow(gd, 60.0)*2.0);
          c += vec3(1.0,0.97,0.9)*uFlash;
          gl_FragColor = vec4(c, 1.0);
        }`
    });
    sky = new T.Mesh(new T.SphereGeometry(1, 48, 24), skyMat);
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    scene.add(sky);
    Wd.skyMat = skyMat;
  }

  // ---------- MAPA POKRYCIA TERENU ----------
  // r = las, g = odmiana pól, b = jeziora, a = zabudowa wiejska
  Wd.villages = [];
  function buildLand() {
    const N = Wd.LAND_RES, SZ = Wd.LAND_SIZE;
    const rnd = Ut.rng(7781);
    // wsie przy autostradach i losowo w okolicy
    const vils = [];
    for (const a of Wd.HIGHWAYS) {
      for (let k = 0; k < 6; k++) {
        const dist = 7000 + k * 9000 + rnd() * 5000;
        const side = (rnd() < 0.5 ? -1 : 1) * (350 + rnd() * 700);
        const off = -40 * Math.sin(dist / 2300) + side;
        const dx = Math.cos(a), dz = Math.sin(a);
        vils.push({ x: dx * dist + dz * off, z: dz * dist - dx * off, r: 260 + rnd() * 380 });
      }
    }
    for (let i = 0; i < 14; i++) {
      const ang = rnd() * Math.PI * 2, d = 9000 + rnd() * 60000;
      vils.push({ x: Math.cos(ang) * d, z: Math.sin(ang) * d, r: 200 + rnd() * 300 });
    }
    Wd.villages = vils.filter((v) => Math.abs(v.x - Wd.riverX(v.z)) > v.r + 300);

    const data = new Uint8Array(N * N * 4);
    const forest = new Float32Array(N * N);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = (i + 0.5) / N * SZ - SZ / 2, z = (j + 0.5) / N * SZ - SZ / 2;
        const r = Math.hypot(x, z);
        let f = Ut.fbm(x / 5200 + 31, z / 5200 - 7, 4);
        f = Ut.smooth(0.48, 0.62, f) * Ut.smooth(3300, 4200, r);
        const lake = Ut.fbm(x / 9000 - 91, z / 9000 + 13, 3);
        let lk = Ut.smooth(0.735, 0.76, lake) * Ut.smooth(9000, 12000, r);
        let v = 0;
        for (const vi of Wd.villages) {
          if (Math.abs(x - vi.x) > vi.r * 1.5 || Math.abs(z - vi.z) > vi.r * 1.5) continue;
          const d = Math.hypot(x - vi.x, z - vi.z);
          if (d < vi.r * 1.5) v = Math.max(v, 1 - Ut.smooth(vi.r * 0.6, vi.r * 1.5, d));
        }
        const rd = Math.abs(x - Wd.riverX(z));
        f *= Ut.smooth(150, 450, rd) * (1 - v) * (1 - lk);
        const k = (j * N + i) * 4;
        data[k] = Math.round(f * 255);
        data[k + 1] = Math.round(Ut.noise(x / 30000, z / 30000) * 255);
        data[k + 2] = Math.round(lk * 255);
        data[k + 3] = Math.round(v * 255);
        forest[j * N + i] = f;
      }
    }
    const tex = new T.DataTexture(data, N, N, T.RGBAFormat);
    tex.magFilter = T.LinearFilter; tex.minFilter = T.LinearFilter;
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    S.uniforms.uLand.value = tex;
    Wd.landData = data; Wd.forestData = forest;
  }
  // Odczyt mapy z interpolacją (zgodnie z tym, co widzi shader)
  Wd.landAt = function (x, z, ch) {
    const N = Wd.LAND_RES, SZ = Wd.LAND_SIZE;
    const fx = (x / SZ + 0.5) * N - 0.5, fz = (z / SZ + 0.5) * N - 0.5;
    const i = Math.floor(fx), j = Math.floor(fz);
    const u = fx - i, v = fz - j;
    const g = (a, b) => {
      a = Ut.clamp(a, 0, N - 1); b = Ut.clamp(b, 0, N - 1);
      return Wd.landData[(b * N + a) * 4 + ch] / 255;
    };
    return (g(i, j) * (1 - u) + g(i + 1, j) * u) * (1 - v) + (g(i, j + 1) * (1 - u) + g(i + 1, j + 1) * u) * v;
  };

  // ---------- TEREN ----------
  Wd.height = function (x, z) {
    const r = Math.hypot(x, z);
    if (r < 4200) return 0;
    let h = Math.max(0, Ut.fbm(x / 9000 + 3, z / 9000 - 5, 4) - 0.38) * 900 * Ut.smooth(4200, 11000, r);
    h += Math.max(0, Ut.fbm(x / 26000 - 11, z / 26000 + 4, 4) - 0.42) * 5200 * Ut.smooth(45000, 120000, r);
    const rd = Math.abs(x - Wd.riverX(z));
    h *= Ut.smooth(120, 1800, rd);
    const lk = Wd.landAt(x, z, 2);
    h *= 1 - Ut.smooth(0.2, 0.6, lk);
    for (const v of Wd.villages) {
      const d = Math.hypot(x - v.x, z - v.z);
      if (d < v.r * 3) { const k = Ut.smooth(v.r * 0.8, v.r * 3, d); h = h * k + Wd.vilHeight(v) * (1 - k); }
    }
    return h;
  };
  Wd.vilHeight = function (v) {
    if (v.h === undefined) {
      const r = Math.hypot(v.x, v.z);
      let h = Math.max(0, Ut.fbm(v.x / 9000 + 3, v.z / 9000 - 5, 4) - 0.38) * 900 * Ut.smooth(4200, 11000, r);
      h += Math.max(0, Ut.fbm(v.x / 26000 - 11, v.z / 26000 + 4, 4) - 0.42) * 5200 * Ut.smooth(45000, 120000, r);
      v.h = h;
    }
    return v.h;
  };

  const TR = { rings: 200, segs: 288, R: 420000, pow: 2.6 };
  let tH = null;
  function ringR(i) { return TR.R * Math.pow(i / TR.rings, TR.pow); }
  function buildTerrain() {
    const nr = TR.rings, ns = TR.segs;
    const pos = new Float32Array((nr * ns + 1) * 3);
    tH = new Float32Array(nr * ns + 1);
    pos[0] = 0; pos[1] = 0; pos[2] = 0;
    for (let i = 1; i <= nr; i++) {
      const r = ringR(i);
      for (let s = 0; s < ns; s++) {
        const a = (s / ns) * Math.PI * 2;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const h = Wd.height(x, z);
        const k = 1 + (i - 1) * ns + s;
        pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
        tH[k] = h;
      }
    }
    const idx = [];
    for (let s = 0; s < ns; s++) idx.push(0, 1 + (s + 1) % ns, 1 + s);
    for (let i = 1; i < nr; i++) {
      for (let s = 0; s < ns; s++) {
        const a = 1 + (i - 1) * ns + s, b = 1 + (i - 1) * ns + (s + 1) % ns;
        const c = 1 + i * ns + s, d = 1 + i * ns + (s + 1) % ns;
        idx.push(a, b, c, b, d, c);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
    S.patchGround(m);
    terrain = new T.Mesh(g, m);
    terrain.receiveShadow = true;
    terrain.frustumCulled = false;
    scene.add(terrain);
    Wd.terrain = terrain;
  }
  // Wysokość siatki terenu w punkcie (dokładnie tak, jak jest narysowana)
  Wd.groundY = function (x, z) {
    const r = Math.hypot(x, z);
    if (r < 4000) return 0;
    const fi = TR.rings * Math.pow(r / TR.R, 1 / TR.pow);
    const i = Math.min(TR.rings - 1, Math.max(1, Math.floor(fi)));
    const ti = Ut.clamp(fi - i, 0, 1);
    let a = Math.atan2(z, x); if (a < 0) a += Math.PI * 2;
    const fs = a / (Math.PI * 2) * TR.segs;
    const s = Math.floor(fs) % TR.segs, ts = fs - Math.floor(fs);
    const s2 = (s + 1) % TR.segs;
    const v = (ii, ss) => tH[1 + (ii - 1) * TR.segs + ss];
    const h0 = v(i, s) * (1 - ts) + v(i, s2) * ts;
    const h1 = v(i + 1, s) * (1 - ts) + v(i + 1, s2) * ts;
    return h0 * (1 - ti) + h1 * ti;
  };

  // ---------- PORY DNIA ----------
  const PRESETS = {
    day: {
      el: 42, az: 215, sun: [1, 0.95, 0.88], sunI: 3.0, hemiS: [0.66, 0.75, 0.9], hemiG: [0.5, 0.45, 0.38], hemiI: 2.0,
      zen: [0.2, 0.42, 0.78], hor: [0.7, 0.8, 0.9], fog: [0.72, 0.8, 0.88], ref: [0.6, 0.7, 0.84], night: 0, exp: 1.0
    },
    dusk: {
      el: 5, az: 255, sun: [1, 0.52, 0.26], sunI: 2.4, hemiS: [0.55, 0.48, 0.66], hemiG: [0.35, 0.26, 0.22], hemiI: 1.3,
      zen: [0.14, 0.18, 0.4], hor: [0.98, 0.56, 0.36], fog: [0.62, 0.46, 0.44], ref: [0.85, 0.55, 0.45], night: 0.55, exp: 1.1
    },
    night: {
      el: 38, az: 140, sun: [0.55, 0.65, 1], sunI: 0.16, hemiS: [0.2, 0.24, 0.4], hemiG: [0.07, 0.07, 0.09], hemiI: 0.85,
      zen: [0.004, 0.008, 0.025], hor: [0.035, 0.045, 0.08], fog: [0.03, 0.035, 0.06], ref: [0.05, 0.06, 0.1], night: 1, exp: 1.25
    }
  };
  Wd.timeName = 'day';
  Wd.sunDir = new T.Vector3();
  Wd.setTime = function (name) {
    const P = PRESETS[name]; Wd.timeName = name; Wd.preset = P;
    const el = P.el * Math.PI / 180, az = P.az * Math.PI / 180;
    Wd.sunDir.set(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)).normalize();
    sun.color.setRGB(P.sun[0], P.sun[1], P.sun[2], T.SRGBColorSpace);
    sun.intensity = P.sunI;
    hemi.color.setRGB(P.hemiS[0], P.hemiS[1], P.hemiS[2], T.SRGBColorSpace);
    hemi.groundColor.setRGB(P.hemiG[0], P.hemiG[1], P.hemiG[2], T.SRGBColorSpace);
    hemi.intensity = P.hemiI;
    skyMat.uniforms.uZen.value.setRGB(P.zen[0], P.zen[1], P.zen[2]);
    skyMat.uniforms.uHor.value.setRGB(P.hor[0], P.hor[1], P.hor[2]);
    skyMat.uniforms.uSunCol.value.setRGB(P.sun[0], P.sun[1], P.sun[2]).multiplyScalar(name === 'night' ? 0.35 : 1);
    skyMat.uniforms.uSunDir.value.copy(Wd.sunDir);
    skyMat.uniforms.uNight.value = P.night;
    scene.fog.color.setRGB(P.fog[0], P.fog[1], P.fog[2], T.SRGBColorSpace);
    Wd.fogDisplay = P.fog;
    S.uniforms.uSkyRef.value.setRGB(P.ref[0], P.ref[1], P.ref[2], T.SRGBColorSpace);
    S.uniforms.uNight.value = P.night;
    renderer.toneMappingExposure = P.exp;
    Wd.baseExposure = P.exp;
  };

  // Dopasowanie kamery, mgły, cieni i nieba do odległości oglądania
  Wd.frame = function (camDist, target) {
    camera.near = Ut.clamp(camDist * 0.0025, 0.05, 60);
    camera.far = Ut.clamp(camDist * 120, 20000, 1500000);
    camera.updateProjectionMatrix();
    const d1 = 2.3 / (TR.R + camDist * 1.5);
    const d2 = 0.32 / (camDist * 25 + 2500);
    scene.fog.density = Math.max(d1, d2);
    sky.position.copy(camera.position);
    sky.scale.setScalar(camera.far * 0.9);
    // cień podąża za punktem, na który patrzymy
    const ext = Ut.clamp(camDist * 1.1, 30, 26000);
    const sc = sun.shadow.camera;
    sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext;
    sc.near = 1; sc.far = ext * 6 + 2000;
    sc.updateProjectionMatrix();
    // przyciąganie do siatki tekseli, żeby cienie nie migotały
    const texel = (2 * ext) / sun.shadow.mapSize.x;
    const tx = Math.round(target.x / texel) * texel, tz = Math.round(target.z / texel) * texel;
    sun.target.position.set(tx, 0, tz);
    sun.position.set(tx, 0, tz).addScaledVector(Wd.sunDir, ext * 3 + 1000);
    sun.shadow.normalBias = ext / 2048 * 1.2;
    sun.shadow.bias = -0.0002;
  };
})();
