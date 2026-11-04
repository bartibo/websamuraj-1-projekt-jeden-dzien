// Uderzenia planetoid: krater powstający na oczach (wykop leja, osuwanie ścian, wypiętrzenie dna),
// kurtyna wyrzuconych skał, fala pyłu przy ziemi, stopione skały na dnie i wstrząs sejsmiczny.
// Profil krateru liczy ta sama funkcja na CPU (Ph.craterH – chodzenie, wybór celu, gruz) i w shaderze.
(function () {
  const T = THREE;
  const Ut = EP.util, Ph = EP.phys, Wd = EP.world, S = EP.shaders;
  const I = EP.impact = {};
  const MAXC = 4;
  const NR = 150, NS = 256;
  const list = [];          // aktywne kratery
  let mat = null;

  function material() {
    if (mat) return mat;
    mat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
    S.patchGround(mat, true);
    return mat;
  }

  // Siatka biegunowa wokół środka krateru; wysokość pierwotnego terenu w wierzchołkach, zmiana w shaderze
  function buildMesh(c) {
    const cr = c.cr, R = cr.R, cov = cr.cover;
    const n = NR * NS + 1;
    const pos = new Float32Array(n * 3), aCr = new Float32Array(n * 2);
    pos[0] = c.x; pos[1] = Wd.groundY0(c.x, c.z); pos[2] = c.z;
    aCr[0] = 0; aCr[1] = c.slot;
    for (let i = 1; i <= NR; i++) {
      const rho = cov * Math.pow(i / NR, 1.15);
      for (let s = 0; s < NS; s++) {
        const a = s / NS * Math.PI * 2;
        const x = c.x + Math.cos(a) * rho * R, z = c.z + Math.sin(a) * rho * R;
        const k = 1 + (i - 1) * NS + s;
        pos[k * 3] = x; pos[k * 3 + 1] = Wd.groundY0(x, z); pos[k * 3 + 2] = z;
        aCr[k * 2] = rho; aCr[k * 2 + 1] = c.slot;
      }
    }
    const idx = [];
    for (let s = 0; s < NS; s++) idx.push(0, 1 + (s + 1) % NS, 1 + s);
    for (let i = 1; i < NR; i++) {
      for (let s = 0; s < NS; s++) {
        const a = 1 + (i - 1) * NS + s, b = 1 + (i - 1) * NS + (s + 1) % NS;
        const cc = 1 + i * NS + s, d = 1 + i * NS + (s + 1) % NS;
        idx.push(a, b, cc, b, d, cc);
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.BufferAttribute(new Float32Array(n * 3).fill(0).map((v, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setAttribute('aCr', new T.BufferAttribute(aCr, 2));
    g.setIndex(idx);
    const m = new T.Mesh(g, material());
    m.receiveShadow = true;
    m.frustumCulled = false;
    Wd.scene.add(m);
    return m;
  }

  // Wysokość krateru w punkcie (dla Wd.groundY)
  function extraH(x, z) {
    let h = 0;
    for (const c of list) {
      const dx = x - c.x, dz = z - c.z;
      const lim = c.cr.R * c.cr.cover;
      if (Math.abs(dx) > lim || Math.abs(dz) > lim) continue;
      const rho = Math.hypot(dx, dz) / c.cr.R;
      if (rho < c.cr.cover) h += Ph.craterH(c.cr, c.s, rho);
    }
    return h;
  }

  function freeSlot() {
    const used = new Set(list.map((c) => c.slot));
    for (let i = 0; i < MAXC; i++) if (!used.has(i)) return i;
    removeCrater(list[0]);
    return freeSlot();
  }
  function removeCrater(c) {
    const i = list.indexOf(c);
    if (i >= 0) list.splice(i, 1);
    if (c.mesh) { Wd.scene.remove(c.mesh); c.mesh.geometry.dispose(); }
    const U = S.uniforms;
    U.uImp.value[c.slot].set(0, 0, 0, 0);
    if (!list.length) Wd.extraH = null;
    Wd.shadowDirty = true;
  }

  // Nowy krater w chwili uderzenia
  I.spawn = function (bl) {
    const D = bl.d;
    if (!D.impact) return;
    const c = { bl, cr: D.cr, x: bl.pos.x, z: bl.pos.z, t: 0, s: Ph.craterState(D.cr, 0, {}), quake: false, fx: { acc: 0, hot: 0, surge: false, rocks: false } };
    c.slot = freeSlot();
    c.mesh = buildMesh(c);
    list.push(c);
    bl.crater = c;
    Wd.extraH = extraH;
    writeUniforms(c);
  };

  function writeUniforms(c) {
    const U = S.uniforms, k = c.slot, s = c.s, cr = c.cr;
    U.uImp.value[k].set(c.x, c.z, cr.R, cr.cover);
    U.uImpS.value[k].set(s.rim, s.glow, s.ej, cr.type + 0.49 * s.blend);
    U.uImpA.value[k].set(s.a, s.d, s.lip, s.blend);
    U.uImpB.value[k].set(s.upH, s.upW, cr.dF, cr.hRim);
  }

  const tint = () => (Wd.timeName === 'dusk' ? [1.0, 0.82, 0.7] : Wd.timeName === 'night' ? [0.55, 0.6, 0.75] : [1, 1, 1]);

  // Aktualizacja kraterów (czas symulacji) i efektów wokół nich
  I.update = function (dtSim, dtA, cam) {
    for (const c of list) {
      const bl = c.bl;
      const t = bl.t;
      const moving = t < c.cr.tForm * 1.05 || c.s.glow > 0.01 || c.s.ej < 7;
      if (moving || c.dirty !== false) {
        Ph.craterState(c.cr, t, c.s);
        writeUniforms(c);
        c.dirty = moving;
        if (t < c.cr.tForm * 1.1) Wd.shadowDirty = true;
      }
      if (dtSim > 0 && bl.fx !== null) effects(c, t, dtSim);
      quake(c, t, cam);
    }
  };

  // Kurtyna wyrzuconych skał, gorące strugi, bryły skalne, fala pyłu i para z dna
  function effects(c, t, dt) {
    const F = EP.fx, cr = c.cr, R = cr.R, s = c.s;
    const smoke = F.smoke, add = F.add;
    if (!smoke) return;
    const tn = tint(), dl = F.litFor(0, 0.8, 0.6);
    const gx = c.x, gz = c.z;
    const g = 9.81;
    const vref = Math.sqrt(g * R);
    // przy wielkich kraterach rzadsza i drobniejsza kurtyna, żeby krater było widać przez pył
    const big = Ut.clamp(1.25 - Math.log10(Math.max(R, 100) / 1000) * 0.35, 0.45, 1);
    // kurtyna: odwrócony stożek skał wylatujących spod brzegu leja pod kątem ok. 45°
    if (t < cr.tEx * 1.25) {
      const share = Ut.clamp(smoke.free.length / 3000, 0.15, 1);
      c.fx.acc += dt / cr.tEx * 420 * share;
      while (c.fx.acc > 1) {
        c.fx.acc -= 1;
        const a = Math.random() * 6.283, ca = Math.cos(a), sa = Math.sin(a);
        const r = s.rim * R * (0.92 + Math.random() * 0.1);
        const x = gx + ca * r, z = gz + sa * r;
        const v = vref * (0.55 + 0.7 * Math.random()) * (1.25 - 0.55 * Math.min(1, t / cr.tEx));
        const el = 0.7 + Math.random() * 0.25;
        const vy = v * Math.sin(el), vh = v * Math.cos(el);
        const sh = 0.45 + Math.random() * 0.35;
        smoke.spawn({ x, y: Wd.groundY(x, z) + R * 0.02, z, vx: ca * vh, vy, vz: sa * vh, grav: g, drag: 0.015,
          life: (2 * vy / g) * (0.75 + Math.random() * 0.35) + 0.5, s0: R * 0.05 * big, s1: R * (0.16 + Math.random() * 0.12) * big,
          c: [0.5 * sh * tn[0] + 0.1, 0.44 * sh * tn[1] + 0.09, 0.36 * sh * tn[2] + 0.08], a: 0.8 * big, heat: t < cr.tEx * 0.3 ? 0.9 : 0, heatT: cr.tEx * 0.3, fin: 0.04, lit: dl, spin: 0.3 });
      }
      // gorące strugi stopionych skał i pary tuż po uderzeniu
      if (t < cr.tEx * 0.45) {
        c.fx.hot += dt / cr.tEx * 160;
        while (c.fx.hot > 1) {
          c.fx.hot -= 1;
          const u = F.randDir(true), v = vref * (1.2 + Math.random() * 1.6);
          const up = 0.5 + 0.5 * Math.abs(u[1]);
          add.spawn({ x: gx + u[0] * R * 0.1, y: Wd.groundY(gx, gz) + R * 0.05, z: gz + u[2] * R * 0.1, vx: u[0] * v * 0.7, vy: up * v, vz: u[2] * v * 0.7, grav: g, drag: 0.02,
            life: 1.2 * up * v / g + 0.3, s0: R * 0.05, s1: R * 0.015, c: [1, 0.6, 0.25], a: 1, heat: 2, heatT: cr.tEx * 0.6, fin: 0 });
        }
      }
    }
    // bryły skalne lecące łukiem (przy mniejszych kraterach widać je z bliska)
    if (!c.fx.rocks && t > cr.tEx * 0.15 && R < 2500) {
      c.fx.rocks = true;
      const deb = F.debris;
      const n = Math.round(Ut.clamp(60 + R / 40, 60, 160));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, ca = Math.cos(a), sa = Math.sin(a);
        const r = cr.Rt * (0.5 + Math.random() * 0.5);
        const v = vref * (0.6 + Math.random() * 0.9), el = 0.6 + Math.random() * 0.4;
        const sc = R * (0.006 + Math.random() * 0.02);
        deb.add({ x: gx + ca * r, y: Wd.groundY(gx + ca * r, gz + sa * r) + sc, z: gz + sa * r, vx: ca * v * Math.cos(el), vy: v * Math.sin(el), vz: sa * v * Math.cos(el), s: sc,
          c: [0.42, 0.36, 0.3], hot: Math.random() < 0.3 ? 0.8 : 0 });
      }
    }
    // fala pyłu przy ziemi (base surge), gdy kurtyna opada
    if (!c.fx.surge && t > cr.tEx * 0.85) {
      c.fx.surge = true;
      const n = Math.round(Ut.clamp(smoke.free.length / 20, 40, 160));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, ca = Math.cos(a), sa = Math.sin(a);
        const r = R * (1 + Math.random() * 0.25);
        const x = gx + ca * r, z = gz + sa * r;
        const sp = vref * (0.25 + Math.random() * 0.35);
        const sh = 0.55 + Math.random() * 0.2;
        smoke.spawn({ x, y: Wd.groundY(x, z) + R * 0.04, z, vx: ca * sp, vy: vref * 0.02, vz: sa * sp, drag: 0.6 / Math.max(1, cr.tEx), buoy: 0,
          life: cr.tEx * (3 + Math.random() * 3), s0: R * 0.12, s1: R * (0.4 + Math.random() * 0.25), c: [0.6 * sh * tn[0] + 0.1, 0.55 * sh * tn[1] + 0.09, 0.47 * sh * tn[2] + 0.08], a: 0.55 * big, fin: 0.05, lit: dl });
      }
    }
    // para i dym nad stopionymi skałami na dnie
    if (s.glow > 0.08 && t > cr.tEx * 0.5) {
      c.fx.st = (c.fx.st || 0) + dt / cr.tForm * 40 * s.glow;
      while (c.fx.st > 1) {
        c.fx.st -= 1;
        const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * s.rim * R * 0.8;
        const x = gx + Math.cos(a) * r, z = gz + Math.sin(a) * r;
        const gr = 0.3 + Math.random() * 0.2;
        smoke.spawn({ x, y: Wd.groundY(x, z) + R * 0.03, z, vx: 0, vy: vref * 0.05, vz: 0, drag: 0.3 / Math.max(1, cr.tEx), buoy: vref * 0.02 / Math.max(1, cr.tEx),
          life: cr.tForm * (1.5 + Math.random()), s0: R * 0.08, s1: R * 0.3, c: [gr * tn[0], gr * 0.95 * tn[1], gr * 0.9 * tn[2]], a: 0.45, heat: 0.8, heatT: cr.tForm, fin: 0.1, lit: dl });
      }
    }
  }

  // Wstrząs: fala sejsmiczna (ok. 6 km/s) dociera przed falą uderzeniową w powietrzu
  function quake(c, t, cam) {
    if (c.quake) return;
    const D = c.bl.d;
    const d = Math.hypot(cam.position.x - c.x, cam.position.z - c.z);
    if (t * 6000 < d) return;
    c.quake = true;
    const km = d / 1000;
    // magnituda odczuwana w danej odległości (Collins i in. 2005)
    const me = km < 60 ? D.mag - 0.0238 * km : km < 700 ? D.mag - 0.0048 * km - 1.1644 : D.mag - 1.66 * Math.log10(km / 111) - 6.399;
    const k = Ut.clamp((me - 3) / 5, 0, 1);
    c.feltMag = me;
    if (k <= 0) return;
    const K = EP.cam;
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!RM) K.shake = Math.max(K.shake, k * (K.eye ? 1.6 : 0.8));
    if (EP.audio && EP.audio.quake) EP.audio.quake(k);
  }
  // Magnituda odczuwana przez świadka (do panelu)
  I.feltMag = function (D, d) {
    const km = d / 1000;
    return km < 60 ? D.mag - 0.0238 * km : km < 700 ? D.mag - 0.0048 * km - 1.1644 : D.mag - 1.66 * Math.log10(km / 111) - 6.399;
  };

  I.remove = function (bl) { if (bl.crater) { removeCrater(bl.crater); bl.crater = null; } };
  I.clear = function () { while (list.length) removeCrater(list[0]); };
  I.active = () => list.length > 0;
  // Czy punkt leży w kraterze (rho < 1) lub pod wyrzuconymi skałami
  I.inside = function (x, z) {
    for (const c of list) { const rho = Math.hypot(x - c.x, z - c.z) / c.cr.R; if (rho < c.cr.cover) return rho; }
    return -1;
  };
})();
