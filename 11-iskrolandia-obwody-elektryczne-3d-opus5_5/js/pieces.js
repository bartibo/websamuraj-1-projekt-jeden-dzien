// Modele 3D elementów obwodu. Każdy element leży na krawędzi siatki:
// lokalna oś X biegnie od końcówki a (x = -0,5) do końcówki b (x = +0,5).
window.Iskry = window.Iskry || {};
(function () {
  const T = THREE;
  const P = Iskry.pieces = {};
  const geos = {};
  const mats = {};
  const geo = (k, fn) => geos[k] || (geos[k] = fn());
  const shared = new WeakSet();
  const std = (k, o) => mats[k] || (mats[k] = new T.MeshStandardMaterial(o), shared.add(mats[k]), mats[k]);
  // zwalnia materiały należące tylko do tego elementu (wspólne i tekstury z pamięci podręcznej zostają)
  P.dispose = function (group) {
    group.traverse(o => {
      const m = o.material;
      if (m && !shared.has(m)) m.dispose();
    });
  };

  P.WIRE_COLORS = [0xff4d5e, 0x3d8bff, 0x2ecc71, 0xb46bff, 0x2d3142, 0x14b8a6];
  P.LED_COLORS = [
    { c: 0xff3b3b, name: 'czerwona' }, { c: 0x2bff6a, name: 'zielona' },
    { c: 0x3b8bff, name: 'niebieska' }, { c: 0xffe23b, name: 'żółta' }, { c: 0xff5fd2, name: 'różowa' },
  ];
  P.PLATE = {
    battery: 0xcfdcff, bulb: 0xfff0c2, motor: 0xffd9c9, switch: 0xc6f3ec, button: 0xffd3e2,
    led: 0xe6dcff, buzzer: 0xd9deea, resistor: 0xe0f2cc, dimmer: 0xffe3b8, tester: 0xe9d2a8,
  };

  const metal = () => std('metal', { color: 0xdfe4ec, metalness: 0.9, roughness: 0.28 });
  const gold = () => std('gold', { color: 0xf5c451, metalness: 0.9, roughness: 0.3 });
  const plastic = (c, r) => std('pl' + c + (r || ''), { color: c, roughness: r || 0.42, metalness: 0.02 });

  function roundedRect(w, h, r) {
    const s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  P.roundedRect = roundedRect;
  P.slab = function (w, d, t, r, bevel) {
    return geo('slab' + [w, d, t, r, bevel], () => {
      const b = bevel === undefined ? 0.015 : bevel;
      const g = new T.ExtrudeGeometry(roundedRect(w, d, r || Math.min(w, d) * 0.3), {
        depth: t, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 8,
      });
      g.rotateX(-Math.PI / 2);
      return g;
    });
  };

  // części, które się ruszają w update(); reszta modelu ma zamrożoną macierz (szybciej na telefonie)
  const dyn = o => { o.userData.dyn = true; return o; };
  function add(parent, g, m, x, y, z, shadow) {
    const o = new T.Mesh(g, m);
    o.position.set(x || 0, y || 0, z || 0);
    o.castShadow = shadow !== false;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  const cyl = (rt, rb, h, s) => geo('cyl' + [rt, rb, h, s], () => new T.CylinderGeometry(rt, rb, h, s || 20));
  const cylX = (r, h, s) => geo('cylX' + [r, h, s], () => { const g = new T.CylinderGeometry(r, r, h, s || 20); g.rotateZ(Math.PI / 2); return g; });
  const sph = (r, a, b) => geo('sph' + [r, a, b], () => new T.SphereGeometry(r, a || 20, b || 14));
  const box = (x, y, z) => geo('box' + [x, y, z], () => new T.BoxGeometry(x, y, z));

  // --- tekstury rysowane w kodzie ---
  const texCache = {};
  P.textTex = function (text, color, size, w, h, stroke) {
    const k = [text, color, size, w, h, stroke].join('|');
    if (texCache[k]) return texCache[k];
    const cv = document.createElement('canvas');
    cv.width = w || 128; cv.height = h || 128;
    const g = cv.getContext('2d');
    g.font = '900 ' + (size || 100) + 'px "Segoe UI", system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = (size || 100) * (stroke ? 0.2 : 0.12); g.strokeStyle = stroke || 'rgba(255,255,255,.85)'; g.lineJoin = 'round';
    g.strokeText(text, cv.width / 2, cv.height / 2 + 4);
    g.fillStyle = color;
    g.fillText(text, cv.width / 2, cv.height / 2 + 4);
    const t = new T.CanvasTexture(cv);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    return (texCache[k] = t);
  };
  P.glowTex = (function () {
    let t = null;
    return function () {
      if (t) return t;
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      const g = cv.getContext('2d');
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.25, 'rgba(255,255,255,.55)');
      gr.addColorStop(0.6, 'rgba(255,255,255,.12)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      t = new T.CanvasTexture(cv);
      return t;
    };
  })();
  function diodeTex() {
    if (texCache.diode) return texCache.diode;
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = '#5b3fa8'; g.strokeStyle = '#5b3fa8'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(8, 32); g.lineTo(120, 32); g.stroke();
    g.beginPath(); g.moveTo(44, 10); g.lineTo(80, 32); g.lineTo(44, 54); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(84, 10); g.lineTo(84, 54); g.stroke();
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace;
    return (texCache.diode = t);
  }
  const decalMats = new Map();
  function decal(parent, tex, w, h, x, y, z, rotY) {
    let dm = decalMats.get(tex);
    if (!dm) { dm = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }); decalMats.set(tex, dm); shared.add(dm); }
    const m = new T.Mesh(geo('pl' + w + h, () => new T.PlaneGeometry(w, h)), dm);
    m.rotation.x = -Math.PI / 2;
    if (rotY) m.rotation.z = rotY;
    m.position.set(x, y, z);
    m.renderOrder = 2;
    parent.add(m);
    return m;
  }
  // plama światła na macie pod świecącym elementem
  function lightPool(g, color, size) {
    const m = new T.Mesh(geo('pool', () => new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)),
      new T.MeshBasicMaterial({ map: P.glowTex(), color, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending }));
    m.scale.set(size, 1, size);
    m.position.y = 0.075;
    m.raycast = () => {};
    m.renderOrder = 1;
    g.add(m);
    return m;
  }
  function glowSprite(color) {
    const s = new T.Sprite(new T.SpriteMaterial({
      map: P.glowTex(), color, depthWrite: false, transparent: true, opacity: 0,
    }));
    s.raycast = () => {};
    return s;
  }

  // --- ścieżki iskierek (lokalne punkty) ---
  function polyPath(pts) {
    const v = pts.map(p => new T.Vector3(p[0], p[1], p[2] || 0));
    return v;
  }
  function curvePath(pts, n) {
    const c = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], p[1], p[2] || 0)));
    return c.getPoints(n || 20);
  }
  const frontPath = z => curvePath([[-0.5, 0.07], [-0.32, 0.1, z * 0.7], [0, 0.11, z], [0.32, 0.1, z * 0.7], [0.5, 0.07]], 22);

  function poles(g, plusX) {
    const ring = geo('poleRing', () => new T.TorusGeometry(0.115, 0.022, 8, 28).rotateX(Math.PI / 2));
    add(g, ring, plastic(0xff3b3b, 0.4), plusX, 0.06, 0, false);
    add(g, ring, plastic(0x2d3142, 0.4), -plusX, 0.06, 0, false);
  }
  function basePlate(g, type) {
    add(g, P.slab(0.84, 0.42, 0.04, 0.1), plastic(P.PLATE[type], 0.6), 0, 0.005, 0);
    add(g, cyl(0.1, 0.1, 0.05, 20), metal(), -0.5, 0.03, 0);
    add(g, cyl(0.1, 0.1, 0.05, 20), metal(), 0.5, 0.03, 0);
    add(g, box(0.16, 0.012, 0.07), metal(), -0.4, 0.06, 0, false);
    add(g, box(0.16, 0.012, 0.07), metal(), 0.4, 0.06, 0, false);
  }

  // ===================== Budowniczowie elementów =====================
  const B = {};

  B.wire = function (g, p) {
    const color = P.WIRE_COLORS[(p.color || 0) % P.WIRE_COLORS.length];
    const curve = new T.QuadraticBezierCurve3(new T.Vector3(-0.5, 0.07, 0), new T.Vector3(0, 0.36, 0), new T.Vector3(0.5, 0.07, 0));
    const tube = geo('wireTube', () => new T.TubeGeometry(curve, 28, 0.045, 10, false));
    add(g, tube, plastic(color, 0.35));
    add(g, cyl(0.085, 0.085, 0.07, 18), metal(), -0.5, 0.035, 0);
    add(g, cyl(0.085, 0.085, 0.07, 18), metal(), 0.5, 0.035, 0);
    return { path: curve.getPoints(24).map(v => v.add(new T.Vector3(0, 0.035, 0))), update() {} };
  };

  B.battery = function (g) {
    basePlate(g, 'battery');
    const body = plastic(0x3a6df0, 0.35).clone();
    const band = plastic(0xff9f1c, 0.35).clone();
    add(g, cylX(0.13, 0.4, 28), body, -0.1, 0.2, 0);
    add(g, cylX(0.13, 0.16, 28), band, 0.18, 0.2, 0);
    add(g, cylX(0.05, 0.05, 16), gold(), 0.285, 0.2, 0);
    add(g, cylX(0.12, 0.012, 24), metal(), -0.305, 0.2, 0);
    // uchwyty
    add(g, box(0.035, 0.2, 0.16), metal(), -0.33, 0.12, 0);
    add(g, box(0.035, 0.2, 0.16), metal(), 0.33, 0.12, 0);
    decal(g, P.textTex('−', '#ffffff', 110, 128, 128, '#16306e'), 0.17, 0.17, -0.24, 0.334, 0);
    decal(g, P.textTex('1,5 V', '#ffffff', 60, 256, 96, '#16306e'), 0.24, 0.09, -0.06, 0.334, 0);
    decal(g, P.textTex('+', '#ffffff', 120, 128, 128, '#a33a00'), 0.2, 0.2, 0.18, 0.334, 0);
    poles(g, 0.5);
    // „winda” iskierek – łuk nad baterią
    const path = curvePath([[-0.5, 0.07], [-0.36, 0.3], [-0.15, 0.43], [0.15, 0.43], [0.36, 0.3], [0.5, 0.07]], 26);
    let heat = 0;
    return {
      path,
      update(r, dt) {
        const target = r && r.short ? 1 : 0;
        heat += (target - heat) * Math.min(1, dt * (target ? 1.2 : 0.8));
        body.emissive.setRGB(heat * 0.9, heat * 0.12, 0);
        band.emissive.setRGB(heat * 0.9, heat * 0.2, 0);
        return { heat };
      },
    };
  };

  B.bulb = function (g, p) {
    basePlate(g, 'bulb');
    add(g, cyl(0.15, 0.17, 0.1, 24), plastic(0x2f9e6e, 0.5), 0, 0.1, 0);
    const screw = add(g, cyl(0.095, 0.095, 0.12, 20), metal(), 0, 0.2, 0);
    for (let i = 0; i < 3; i++) add(g, geo('screwT', () => new T.TorusGeometry(0.097, 0.012, 6, 24).rotateX(Math.PI / 2)), metal(), 0, 0.155 + i * 0.035, 0, false);
    const glass = new T.MeshStandardMaterial({
      color: 0xffffff, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0,
      emissive: 0xffc860, emissiveIntensity: 0, depthWrite: false,
    });
    const gl = add(g, sph(0.19, 28, 20), glass, 0, 0.42, 0, false);
    gl.renderOrder = 3;
    const filMat = new T.MeshStandardMaterial({ color: 0x8a6d3b, emissive: 0xffb340, emissiveIntensity: 0, roughness: 0.6 });
    const helix = new T.CatmullRomCurve3(Array.from({ length: 40 }, (_, i) => {
      const t = i / 39; const a = t * Math.PI * 14;
      return new T.Vector3(-0.07 + t * 0.14, 0.42 + Math.sin(a) * 0.018, Math.cos(a) * 0.018);
    }));
    const fil = add(g, geo('fil', () => new T.TubeGeometry(helix, 80, 0.006, 5)), filMat, 0, 0, 0, false);
    add(g, geo('supp', () => new T.CylinderGeometry(0.007, 0.007, 0.2, 6)), metal(), -0.07, 0.33, 0, false);
    add(g, geo('supp'), metal(), 0.07, 0.33, 0, false);
    const halo = dyn(glowSprite(0xffc21a));
    halo.position.set(0, 0.42, 0);
    g.add(halo);
    const pool = lightPool(g, 0xffd23f, 1.3);
    const brokenMat = new T.MeshStandardMaterial({ color: 0x4a4a4a, transparent: true, opacity: 0.55, roughness: 0.3 });
    const path = polyPath([[-0.5, 0.07], [-0.2, 0.1], [-0.07, 0.24], [-0.07, 0.42], [0.07, 0.42], [0.07, 0.24], [0.2, 0.1], [0.5, 0.07]]);
    let glow = 0;
    return {
      path, light: { y: 0.42, color: 0xffc46b },
      update(r, dt, t, q) {
        if (q) p = q;
        if (p.burnt) {
          gl.material = brokenMat; fil.visible = false; halo.material.opacity = 0; pool.material.opacity = 0; glow = 0;
          return { glow: 0 };
        }
        gl.material = glass; fil.visible = true;
        const target = r ? r.glow : 0;
        glow += (target - glow) * Math.min(1, dt * 12);
        const flick = glow > 0.05 ? 1 + Math.sin(t * 37) * 0.015 : 1;
        glass.color.setHex(glow > 0.05 ? 0xfff1b0 : 0xffffff);
        glass.emissiveIntensity = glow * 1.5 * flick;
        glass.opacity = 0.32 + Math.min(0.5, glow * 0.4);
        filMat.emissiveIntensity = Math.min(3, glow * 4);
        halo.material.opacity = Math.min(1, glow * 0.9);
        const s = 0.55 + glow * 1.1;
        halo.scale.set(s, s, s);
        pool.material.opacity = Math.min(0.75, glow * 0.55);
        return { glow };
      },
    };
  };

  B.motor = function (g, p) {
    basePlate(g, 'motor');
    add(g, cyl(0.14, 0.14, 0.24, 28), metal(), 0, 0.18, 0);
    add(g, cyl(0.145, 0.145, 0.06, 28), plastic(0xff7a45), 0, 0.31, 0);
    add(g, cyl(0.145, 0.145, 0.04, 28), plastic(0x2d3142), 0, 0.07, 0);
    add(g, cyl(0.016, 0.016, 0.16, 8), metal(), 0, 0.41, 0);
    add(g, box(0.06, 0.04, 0.03), gold(), -0.13, 0.1, 0.1);
    add(g, box(0.06, 0.04, 0.03), gold(), 0.13, 0.1, 0.1);
    const prop = dyn(new T.Group());
    prop.position.y = 0.48;
    g.add(prop);
    add(prop, sph(0.045, 16, 10), plastic(0xffd23f), 0, 0, 0);
    [0xff4d5e, 0xffc93c, 0x3d8bff].forEach((c, i) => {
      const arm = new T.Group();
      arm.rotation.y = (i * Math.PI * 2) / 3;
      const blade = add(arm, sph(0.1, 16, 10), plastic(c, 0.4), 0.17, 0, 0);
      blade.scale.set(1.6, 0.18, 0.62);
      blade.rotation.x = 0.35;
      prop.add(arm);
    });
    const blurMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    const blur = add(prop, geo('blurDisc', () => new T.CircleGeometry(0.34, 32).rotateX(-Math.PI / 2)), blurMat, 0, 0.01, 0, false);
    let w = 0;
    return {
      path: frontPath(0.21),
      update(r, dt) {
        const target = r && r.on ? r.speed * 14 : 0;
        w += (target - w) * Math.min(1, dt * 2.5);
        prop.rotation.y += w * dt;
        blurMat.opacity = Math.min(0.35, Math.abs(w) / 60);
        return { spin: w };
      },
    };
  };

  B.switch = function (g, p) {
    basePlate(g, 'switch');
    add(g, box(0.07, 0.14, 0.12), metal(), -0.26, 0.11, 0);
    add(g, box(0.035, 0.12, 0.12), metal(), 0.23, 0.1, 0.0);
    add(g, box(0.035, 0.12, 0.12), metal(), 0.29, 0.1, 0.0);
    add(g, cylX(0.03, 0.12, 12), gold(), -0.26, 0.17, 0);
    const lever = dyn(new T.Group());
    lever.position.set(-0.26, 0.17, 0);
    g.add(lever);
    add(lever, box(0.56, 0.025, 0.05), metal(), 0.28, 0, 0);
    add(lever, cyl(0.05, 0.05, 0.12, 16), plastic(0xff4d5e, 0.35), 0.58, 0.04, 0);
    add(lever, sph(0.05, 16, 10), plastic(0xff4d5e, 0.35), 0.58, 0.1, 0);
    const ledMat = new T.MeshStandardMaterial({ color: 0x334, emissive: 0x2bff6a, emissiveIntensity: 0 });
    add(g, sph(0.03, 12, 8), ledMat, 0, 0.06, 0.15, false);
    let a = p.on ? 0 : 0.85;
    return {
      path: polyPath([[-0.5, 0.07], [-0.26, 0.21], [0.26, 0.21], [0.5, 0.07]]),
      update(r, dt, t, q) {
        if (q) p = q;
        const target = p.on ? 0 : 0.85;
        a += (target - a) * Math.min(1, dt * 14);
        lever.rotation.z = a;
        ledMat.emissiveIntensity = p.on ? 1.5 : 0;
        ledMat.color.setHex(p.on ? 0x2bff6a : 0x334455);
      },
    };
  };

  B.button = function (g, p) {
    basePlate(g, 'button');
    add(g, cyl(0.16, 0.17, 0.12, 28), plastic(0x2d3142, 0.5), 0, 0.1, 0);
    add(g, geo('btnRing', () => new T.TorusGeometry(0.135, 0.015, 8, 28).rotateX(Math.PI / 2)), metal(), 0, 0.165, 0, false);
    const cap = dyn(new T.Group());
    g.add(cap);
    const capMat = plastic(0xff3d6e, 0.3).clone();
    add(cap, cyl(0.115, 0.115, 0.07, 28), capMat, 0, 0.19, 0);
    const dome = add(cap, sph(0.115, 28, 12), capMat, 0, 0.225, 0);
    dome.scale.y = 0.45;
    let y = 0;
    return {
      path: frontPath(0.23),
      update(r, dt, t, q) {
        if (q) p = q;
        const target = p.on ? -0.045 : 0;
        y += (target - y) * Math.min(1, dt * 25);
        cap.position.y = y;
        capMat.emissive.setRGB(p.on ? 0.35 : 0, 0, p.on ? 0.08 : 0);
      },
    };
  };

  B.led = function (g, p) {
    basePlate(g, 'led');
    const col = P.LED_COLORS[(p.color || 0) % P.LED_COLORS.length].c;
    add(g, cyl(0.009, 0.009, 0.18, 6), metal(), -0.05, 0.12, 0, false);
    add(g, cyl(0.009, 0.009, 0.18, 6), metal(), 0.05, 0.12, 0, false);
    const domeMat = new T.MeshStandardMaterial({
      color: col, transparent: true, opacity: 0.55, roughness: 0.15, emissive: col, emissiveIntensity: 0, depthWrite: false,
    });
    add(g, cyl(0.1, 0.1, 0.025, 24), domeMat, 0, 0.215, 0, false);
    const d1 = add(g, cyl(0.085, 0.085, 0.12, 24), domeMat, 0, 0.285, 0, false);
    const d2 = add(g, geo('ledTop', () => new T.SphereGeometry(0.085, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), domeMat, 0, 0.345, 0, false);
    d1.renderOrder = d2.renderOrder = 3;
    add(g, box(0.05, 0.03, 0.05), plastic(0x9aa3b5), 0, 0.29, 0, false);
    decal(g, diodeTex(), 0.36, 0.18, 0, 0.068, 0.12);
    decal(g, P.textTex('+', '#ff3b3b', 120, 128, 128, '#ffffff'), 0.15, 0.15, -0.3, 0.068, -0.02);
    decal(g, P.textTex('−', '#2d3142', 120, 128, 128, '#ffffff'), 0.15, 0.15, 0.3, 0.068, -0.02);
    poles(g, -0.5);
    const halo = dyn(glowSprite(col));
    halo.position.set(0, 0.3, 0);
    g.add(halo);
    const pool = lightPool(g, col, 0.9);
    let glow = 0;
    return {
      path: polyPath([[-0.5, 0.07], [-0.15, 0.09], [-0.05, 0.2], [0, 0.32], [0.05, 0.2], [0.15, 0.09], [0.5, 0.07]]),
      light: { y: 0.3, color: col },
      update(r, dt, t, q) {
        if (q) p = q;
        if (p.burnt) {
          domeMat.color.setHex(0x444444); domeMat.emissiveIntensity = 0; halo.material.opacity = 0; pool.material.opacity = 0;
          return { glow: 0 };
        }
        domeMat.color.setHex(col);
        const target = r ? r.glow : 0;
        glow += (target - glow) * Math.min(1, dt * 18);
        domeMat.emissiveIntensity = glow * 1.6;
        halo.material.opacity = Math.min(0.9, glow * 0.75);
        const s = 0.35 + glow * 0.7;
        halo.scale.set(s, s, s);
        pool.material.opacity = Math.min(0.7, glow * 0.5);
        return { glow: glow * 0.6 };
      },
    };
  };

  B.buzzer = function (g, p) {
    basePlate(g, 'buzzer');
    const body = dyn(new T.Group());
    g.add(body);
    add(body, cyl(0.17, 0.17, 0.15, 32), plastic(0x23262f, 0.5), 0, 0.12, 0);
    add(body, geo('bzRing', () => new T.TorusGeometry(0.1, 0.016, 8, 28).rotateX(Math.PI / 2)), metal(), 0, 0.2, 0, false);
    add(body, cyl(0.035, 0.035, 0.01, 16), std('hole', { color: 0x050505 }), 0, 0.2, 0, false);
    decal(body, P.textTex('BZZ', '#ffd23f', 44, 128, 64), 0.16, 0.08, 0, 0.197, 0.115);
    const rings = [0, 1, 2].map(() => {
      const m = new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0, depthWrite: false });
      const o = dyn(add(g, geo('wave', () => new T.TorusGeometry(0.2, 0.012, 6, 40).rotateX(Math.PI / 2)), m, 0, 0.25, 0, false));
      return o;
    });
    let lvl = 0;
    return {
      path: frontPath(0.24),
      update(r, dt, t) {
        const target = r && r.on ? r.level : 0;
        lvl += (target - lvl) * Math.min(1, dt * 15);
        body.position.x = lvl > 0.05 ? Math.sin(t * 90) * 0.006 * lvl : 0;
        body.position.z = lvl > 0.05 ? Math.cos(t * 77) * 0.004 * lvl : 0;
        rings.forEach((o, i) => {
          const ph = ((t * 1.6 + i / 3) % 1);
          const s = 0.6 + ph * 1.6;
          o.scale.set(s, 1, s);
          o.position.y = 0.24 + ph * 0.12;
          o.material.opacity = lvl > 0.05 ? (1 - ph) * 0.8 * Math.min(1, lvl * 1.5) : 0;
        });
        return { level: lvl };
      },
    };
  };

  B.resistor = function (g) {
    basePlate(g, 'resistor');
    add(g, box(0.035, 0.11, 0.05), metal(), -0.36, 0.1, 0);
    add(g, box(0.035, 0.11, 0.05), metal(), 0.36, 0.1, 0);
    add(g, cylX(0.012, 0.74, 8), metal(), 0, 0.15, 0, false);
    const beige = plastic(0xe8c99b, 0.6);
    add(g, cylX(0.065, 0.3, 20), beige, 0, 0.15, 0);
    add(g, sph(0.072, 16, 12), beige, -0.15, 0.15, 0);
    add(g, sph(0.072, 16, 12), beige, 0.15, 0.15, 0);
    [[-0.1, 0x2ecc71], [-0.04, 0x222222], [0.02, 0x222222], [0.11, 0xd4af37]].forEach(([x, c]) =>
      add(g, cylX(0.068, 0.028, 20), plastic(c, 0.5), x, 0.15, 0, false));
    return {
      path: curvePath([[-0.5, 0.07], [-0.3, 0.2], [0, 0.26], [0.3, 0.2], [0.5, 0.07]], 20),
      update() {},
    };
  };

  B.dimmer = function (g, p) {
    basePlate(g, 'dimmer');
    // łuk ścieżki oporowej i skala od „szeroko” do „wąsko”
    const arc = geo('dimArc', () => new T.TorusGeometry(0.15, 0.022, 8, 40, Math.PI * 1.5).rotateX(Math.PI / 2).rotateY(-Math.PI * 0.25));
    add(g, arc, plastic(0x3a2f2a, 0.7), 0, 0.06, 0, false);
    [[0x2ecc71, 0.012], [0xffc93c, 0.02], [0xff4d5e, 0.03]].forEach(([c, r], i) => {
      const seg = add(g, geo('dimSeg' + i, () => new T.TorusGeometry(0.205, r, 8, 16, Math.PI * 0.46).rotateX(Math.PI / 2)), plastic(c, 0.45), 0, 0.062, 0, false);
      seg.rotation.y = Math.PI * 0.25 + i * Math.PI * 0.5 - Math.PI * 0.02;
    });
    const knob = dyn(new T.Group());
    knob.position.set(0, 0.06, 0);
    g.add(knob);
    add(knob, cyl(0.105, 0.115, 0.13, 28), plastic(0xff8c1a, 0.35), 0, 0.075, 0);
    add(knob, cyl(0.085, 0.085, 0.02, 28), plastic(0xffc06b, 0.3), 0, 0.15, 0, false);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      add(knob, box(0.018, 0.11, 0.022), plastic(0xe0700a, 0.4), Math.sin(a) * 0.112, 0.075, Math.cos(a) * 0.112, false).rotation.y = a;
    }
    add(knob, box(0.03, 0.016, 0.1), plastic(0x2d3142, 0.3), 0, 0.167, -0.04, false);
    let ang = 0;
    return {
      path: curvePath([[-0.5, 0.07], [-0.3, 0.2], [0, 0.3], [0.3, 0.2], [0.5, 0.07]], 20),
      update(r, dt, t, q) {
        if (q) p = q;
        const v = p.val === undefined ? 0.5 : p.val;
        const target = -Math.PI * 0.75 + v * Math.PI * 1.5;
        ang += (target - ang) * Math.min(1, dt * 12);
        knob.rotation.y = -ang;
      },
    };
  };

  P.emojiTex = function (e) {
    const k = 'emoji' + e;
    if (texCache[k]) return texCache[k];
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2);
    g.fillStyle = '#fff'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#2d3142'; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '76px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
    g.fillText(e, 64, 70);
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace;
    return (texCache[k] = t);
  };
  B.tester = function (g, p) {
    basePlate(g, 'tester');
    const clip = (x, c) => {
      add(g, cyl(0.03, 0.03, 0.16, 10), metal(), x, 0.1, 0, false);
      const jaw = add(g, box(0.12, 0.035, 0.06), plastic(c, 0.35), x * 0.72, 0.19, 0);
      jaw.rotation.z = x < 0 ? -0.25 : 0.25;
      add(g, box(0.1, 0.012, 0.05), metal(), x * 0.62, 0.165, 0, false);
    };
    clip(-0.3, 0xff4d5e);
    clip(0.3, 0x2d3142);
    add(g, cyl(0.12, 0.13, 0.05, 24), plastic(0xffffff, 0.5), 0, 0.05, 0);
    const itemMat = new T.SpriteMaterial({ map: P.emojiTex('🔑'), transparent: true, depthWrite: false });
    const item = dyn(new T.Sprite(itemMat));
    item.scale.set(0.42, 0.42, 0.42);
    item.position.set(0, 0.3, 0);
    g.add(item);
    const halo = dyn(glowSprite(0xffe14d));
    halo.position.set(0, 0.26, 0);
    g.add(halo);
    let mat = -1, glow = 0;
    return {
      path: curvePath([[-0.5, 0.07], [-0.3, 0.2], [-0.12, 0.24], [0.12, 0.24], [0.3, 0.2], [0.5, 0.07]], 20),
      update(r, dt, t, q) {
        if (q) p = q;
        const m = (p.mat || 0) % Iskry.circuit.MATERIALS.length;
        if (m !== mat) { mat = m; itemMat.map = P.emojiTex(Iskry.circuit.MATERIALS[m].e); itemMat.needsUpdate = true; }
        const target = r && Math.abs(r.I) > 1e-3 ? Math.min(1, Math.abs(r.I) * 4) : 0;
        glow += (target - glow) * Math.min(1, dt * 8);
        halo.material.opacity = glow * 0.6;
        halo.scale.setScalar(0.3 + glow * 0.3);
        item.position.y = 0.3 + Math.sin(t * 2) * 0.008;
      },
    };
  };

  // Ramka (obwódka) do zaznaczeń i wskazówek na planszy
  P.frameGeo = function (w, d, th, r) {
    return geo('frame' + [w, d, th, r], () => {
      const s = roundedRect(w, d, r);
      s.holes.push(roundedRect(w - th * 2, d - th * 2, Math.max(0.02, r - th)));
      const g2 = new T.ShapeGeometry(s, 8);
      g2.rotateX(-Math.PI / 2);
      return g2;
    });
  };

  // Nieruchome części ze wspólnym materiałem łączymy w jedną siatkę (mniej wywołań rysowania –
  // to główny koszt na telefonie). Złączona geometria jest wspólna dla wszystkich elementów danego typu.
  function bakeStatic(g, type) {
    g.updateMatrixWorld(true);
    const byMat = new Map();
    g.traverse(o => {
      if (!o.isMesh || o.userData.dyn || !shared.has(o.material)) return;
      for (let up = o.parent; up && up !== g; up = up.parent) if (up.userData.dyn) return;
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(o);
    });
    for (const [m, list] of byMat) {
      if (list.length < 2) continue;
      const geom = geo('bake:' + type + ':' + m.uuid + ':' + list.length, () => mergeList(list));
      list.forEach(o => o.parent.remove(o));
      const mm = new T.Mesh(geom, m);
      mm.castShadow = list.some(o => o.castShadow);
      mm.receiveShadow = true;
      mm.renderOrder = Math.max(...list.map(o => o.renderOrder));
      g.add(mm);
    }
  }
  function mergeList(list) {
    const parts = list.map(o => (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld));
    const out = new T.BufferGeometry();
    for (const n of ['position', 'normal', 'uv']) {
      if (!parts.every(q => q.attributes[n])) continue;
      const arr = new Float32Array(parts.reduce((a, q) => a + q.attributes[n].array.length, 0));
      let off = 0;
      for (const q of parts) { arr.set(q.attributes[n].array, off); off += q.attributes[n].array.length; }
      out.setAttribute(n, new T.BufferAttribute(arr, parts[0].attributes[n].itemSize));
    }
    parts.forEach(q => q.dispose());
    out.computeBoundingSphere();
    return out;
  }

  // Buduje element; zwraca { group, path (punkty lokalne), update, light }
  P.build = function (p) {
    const g = new T.Group();
    const res = B[p.type](g, p);
    res.group = g;
    bakeStatic(g, p.type);
    // dzieci części ruchomej też mają stałą macierz lokalną – świat liczy się od rodzica
    g.traverse(o => {
      if (o === g || o.userData.dyn) return;
      o.matrixAutoUpdate = false;
      o.updateMatrix();
    });
    return res;
  };

  // Płaski „duch” podglądu miejsca
  P.ghost = function (type) {
    const p = { type, a: 0, b: 1, on: false, color: 0 };
    const b = P.build(p);
    const m = new T.MeshBasicMaterial({ color: 0x4cd964, transparent: true, opacity: 0.45, depthWrite: false });
    b.group.traverse(o => {
      if (o.isMesh) { if (o.material.map) o.visible = false; o.material = m; o.castShadow = false; }
      if (o.isSprite) o.visible = false;
    });
    b.group.userData.ghostMat = m;
    return b.group;
  };
})();
