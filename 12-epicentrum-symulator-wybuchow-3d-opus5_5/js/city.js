// Makieta miasta: generowanie zabudowy, drzew, samochodów, mostów i wsi oraz skutki wybuchów
// (zawalenia, pożary, szyby, przewrócone samochody, ofiary).
(function () {
  const T = THREE;
  const Ut = EP.util;
  const Ph = EP.phys;
  const Wd = EP.world;
  const S = EP.shaders;
  const C = EP.city = {};

  const BL = 120;
  C.BL = BL;
  C.CITY_R = 2950;

  // Klasy budynków: typ shadera, progi [lekkie, poważne, zniszczenie] kPa, nazwa
  const CLS = {
    house:    { typ: 0, th: [5, 14, 30], name: 'dom' },
    tenement: { typ: 1, th: [7, 22, 50], name: 'kamienica' },
    slab:     { typ: 2, th: [8, 28, 70], name: 'blok' },
    tower:    { typ: 3, th: [9, 40, 115], name: 'wieżowiec' },
    office:   { typ: 1, th: [8, 30, 85], name: 'biurowiec' },
    ind:      { typ: 4, th: [5, 14, 38], name: 'hala' },
    chimney:  { typ: 5, th: [10, 25, 60], name: 'komin' },
    tank:     { typ: 6, th: [8, 18, 45], name: 'zbiornik' },
    church:   { typ: 8, th: [7, 22, 55], name: 'kościół' },
    vhouse:   { typ: 0, th: [5, 14, 30], name: 'dom' }
  };
  const CLS_KEYS = Object.keys(CLS);

  // ---------- GEOMETRIE ----------
  function boxGeo() { const g = new T.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0); return g; }
  function cylGeo() { const g = new T.CylinderGeometry(0.5, 0.5, 1, 20, 1); g.translate(0, 0.5, 0); return g; }
  function houseGeo() {
    // ściany do 0,66, dwuspadowy dach do 1,0 z kalenicą wzdłuż X
    const P = [], N = [];
    const w = 0.66, o = 0.05;
    function tri(a, b, c) {
      const ab = new T.Vector3().subVectors(b, a), ac = new T.Vector3().subVectors(c, a);
      const n = new T.Vector3().crossVectors(ab, ac).normalize();
      for (const v of [a, b, c]) { P.push(v.x, v.y, v.z); N.push(n.x, n.y, n.z); }
    }
    function quad(a, b, c, d) { tri(a, b, c); tri(a, c, d); }
    const V = (x, y, z) => new T.Vector3(x, y, z);
    quad(V(-0.5, 0, 0.5), V(0.5, 0, 0.5), V(0.5, w, 0.5), V(-0.5, w, 0.5));
    quad(V(0.5, 0, -0.5), V(-0.5, 0, -0.5), V(-0.5, w, -0.5), V(0.5, w, -0.5));
    quad(V(0.5, 0, 0.5), V(0.5, 0, -0.5), V(0.5, w, -0.5), V(0.5, w, 0.5));
    quad(V(-0.5, 0, -0.5), V(-0.5, 0, 0.5), V(-0.5, w, 0.5), V(-0.5, w, -0.5));
    tri(V(0.5, w, 0.5), V(0.5, w, -0.5), V(0.5, 1, 0));
    tri(V(-0.5, w, -0.5), V(-0.5, w, 0.5), V(-0.5, 1, 0));
    quad(V(-0.5 - o, w - 0.03, 0.5 + o), V(0.5 + o, w - 0.03, 0.5 + o), V(0.5 + o, 1, 0), V(-0.5 - o, 1, 0));
    quad(V(0.5 + o, w - 0.03, -0.5 - o), V(-0.5 - o, w - 0.03, -0.5 - o), V(-0.5 - o, 1, 0), V(0.5 + o, 1, 0));
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(N, 3));
    return g;
  }
  function merge(list) {
    let n = 0;
    for (const it of list) { if (it.g.index) it.g = it.g.toNonIndexed(); n += it.g.attributes.position.count; }
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), part = new Float32Array(n);
    let o = 0;
    for (const it of list) {
      const g = it.g.index ? it.g.toNonIndexed() : it.g;
      const p = g.attributes.position.array, nn = g.attributes.normal.array, c = g.attributes.position.count;
      pos.set(p, o * 3); nor.set(nn, o * 3);
      for (let i = 0; i < c; i++) { col[(o + i) * 3] = it.c[0]; col[(o + i) * 3 + 1] = it.c[1]; col[(o + i) * 3 + 2] = it.c[2]; part[o + i] = it.part || 0; }
      o += c;
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3));
    g.setAttribute('normal', new T.BufferAttribute(nor, 3));
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.setAttribute('aPart', new T.BufferAttribute(part, 1));
    return g;
  }
  const srgb = (r, g, b) => { const c = new T.Color(); c.setRGB(r, g, b, T.SRGBColorSpace); return [c.r, c.g, c.b]; };

  // ---------- DANE ----------
  const B = [];          // rekordy budynków
  const TREES = [];      // {x,y,z,s,mesh,idx,seed}
  const CARS = [];
  let meshes = {}, treeMeshes = [], carMesh;
  let cityTex;
  C.B = B; C.TREES = TREES; C.CARS = CARS;

  function addB(cls, x, y, z, sx, sy, sz, color, opt) {
    opt = opt || {};
    const k = CLS[cls];
    const shape = opt.shape || (k.typ === 0 ? 'house' : (k.typ === 5 || k.typ === 6) ? 'cyl' : 'box');
    const b = {
      i: B.length, cls, k, shape, x, y, z, sx, sy, sz, rotY: opt.rotY || 0, color,
      seed: opt.seed !== undefined ? opt.seed : Math.random(), parent: opt.parent !== undefined ? opt.parent : -1, child: -1,
      dmg: 0, hf: 1, hf0: 1, hT: 1, tilt: 0, tilt0: 0, tiltT: 0, tdx: 1, tdz: 0, anim: 1, adur: 1,
      glass: 0, burn: 0, burnT: -1, burnSim: 0, pop: 0, alive: 0, inst: -1, varF: 0.8 + Math.random() * 0.45
    };
    const floors = Math.max(1, Math.round(sy / 3.2));
    const area = sx * sz;
    b.pop = cls === 'house' || cls === 'vhouse' ? 3.1 : cls === 'tenement' ? area * floors / 38 : cls === 'slab' ? area * floors / 32
      : cls === 'tower' || cls === 'office' ? area * floors / 30 * 0.6 : cls === 'ind' ? area / 450 : cls === 'church' ? 20 : 0;
    b.alive = b.pop;
    if (b.parent >= 0) B[b.parent].child = b.i;
    B.push(b);
    return b;
  }

  // ---------- GENEROWANIE ----------
  C.generate = function () {
    const rnd = Ut.rng(20261103);
    const kinds = new Uint8Array(64 * 64 * 4);
    const setKind = (bi, bj, k) => { const ii = bi + 32, jj = bj + 32; if (ii >= 0 && ii < 64 && jj >= 0 && jj < 64) kinds[(jj * 64 + ii) * 4] = k; };
    const pastel = [srgb(0.86, 0.8, 0.66), srgb(0.8, 0.66, 0.5), srgb(0.75, 0.75, 0.72), srgb(0.84, 0.62, 0.55), srgb(0.7, 0.76, 0.66), srgb(0.9, 0.86, 0.76), srgb(0.66, 0.6, 0.55), srgb(0.78, 0.7, 0.58)];
    const slabC = [srgb(0.82, 0.82, 0.8), srgb(0.75, 0.73, 0.68), srgb(0.84, 0.8, 0.7), srgb(0.7, 0.74, 0.78)];
    const glassC = [srgb(0.45, 0.55, 0.62), srgb(0.38, 0.45, 0.5), srgb(0.55, 0.6, 0.62), srgb(0.32, 0.4, 0.46), srgb(0.6, 0.58, 0.52)];
    const stoneC = [srgb(0.8, 0.76, 0.68), srgb(0.66, 0.62, 0.56), srgb(0.72, 0.7, 0.68), srgb(0.55, 0.52, 0.5)];
    const houseC = [srgb(0.92, 0.9, 0.84), srgb(0.88, 0.8, 0.66), srgb(0.78, 0.82, 0.8), srgb(0.9, 0.76, 0.62), srgb(0.8, 0.72, 0.66), srgb(0.95, 0.94, 0.9)];
    const indC = [srgb(0.6, 0.62, 0.64), srgb(0.5, 0.56, 0.62), srgb(0.62, 0.5, 0.42), srgb(0.7, 0.7, 0.66)];
    const brick = srgb(0.55, 0.3, 0.24);
    const parks = new Set(['-2,0', '-2,1', '-3,0', '-3,1', '4,-6', '-9,5', '6,9']);
    const blocks = [];

    for (let bj = -26; bj <= 25; bj++) {
      for (let bi = -26; bi <= 25; bi++) {
        const cx = (bi + 0.5) * BL, cz = (bj + 0.5) * BL;
        const r = Math.hypot(cx, cz);
        const rr = r * (0.9 + 0.22 * Ut.noise(cx / 700 + 5, cz / 700 - 3));
        if (rr > C.CITY_R) continue;
        const dRiv = Math.abs(cx - Wd.riverX(cz));
        let kind;
        const ang = Math.atan2(cz, cx);
        if (dRiv < 125) kind = dRiv > 64 ? 5 : 0;
        else if (parks.has(bi + ',' + bj)) kind = 5;
        else if (ang > -2.75 && ang < -1.85 && r > 1450) kind = 6;
        else if (rr < 520) kind = 1;
        else if (rr < 1380) kind = rnd() < 0.33 ? 3 : 2;
        else kind = rnd() < 0.035 ? 5 : 4;
        if (kind === 0) continue;
        setKind(bi, bj, kind);
        blocks.push({ bi, bj, cx, cz, r, kind, dRiv });
      }
    }
    // Tekstura rodzajów kwartałów dla shadera ziemi
    cityTex = new T.DataTexture(kinds, 64, 64, T.RGBAFormat);
    cityTex.magFilter = T.NearestFilter; cityTex.minFilter = T.NearestFilter;
    cityTex.needsUpdate = true;
    S.uniforms.uCity.value = cityTex;

    const treeList = [];
    const addTree = (x, z, s, conifer) => treeList.push({ x, z, y: Wd.groundY(x, z), s, conifer, seed: rnd() });

    for (const bk of blocks) {
      const { cx, cz, r, kind } = bk;
      if (kind === 1) {
        // śródmieście: wieżowce i biurowce, najwyższe w centrum
        const hBase = 45 + 230 * Math.exp(-r / 260);
        const layout = rnd();
        const lots = layout < 0.35 ? [[0, 0, 88, 88]] : layout < 0.7 ? [[-23, 0, 42, 88], [23, 0, 42, 88]] : [[-23, -23, 42, 42], [23, -23, 42, 42], [-23, 23, 42, 42], [23, 23, 42, 42]];
        for (const L of lots) {
          const lx = cx + L[0], lz = cz + L[1];
          let H = hBase * (0.35 + 0.75 * Math.pow(rnd(), 0.8)) * (lots.length === 1 ? 1.15 : 1);
          if (bk.bi === 0 && bk.bj === -1 && L === lots[0]) H = 310;
          const glass = rnd() < 0.6;
          if (H > 70 && rnd() < 0.65) {
            const podH = 10 + rnd() * 12;
            const pod = addB('office', lx, 0, lz, L[2] - 4, podH, L[3] - 4, Ut.rng((bk.bi * 99 + bk.bj) | 0)() < 0.5 ? stoneC[0] : stoneC[2]);
            const fw = (L[2] - 4) * (0.5 + rnd() * 0.3), fd = (L[3] - 4) * (0.5 + rnd() * 0.3);
            const tw = addB(glass ? 'tower' : 'office', lx, podH, lz, Math.min(fw, 46), H - podH, Math.min(fd, 46), glass ? rnd.pick(glassC) : rnd.pick(stoneC), { parent: pod.i });
            if (H > 160 && rnd() < 0.6) {
              addB('tower', lx, H, lz, tw.sx * 0.62, H * 0.18, tw.sz * 0.62, tw.color, { parent: tw.i });
            }
          } else {
            addB(glass ? 'tower' : 'office', lx, 0, lz, L[2] - 6 - rnd() * 8, Math.max(18, H * 0.6), L[3] - 6 - rnd() * 8, glass ? rnd.pick(glassC) : rnd.pick(stoneC));
          }
        }
      } else if (kind === 2) {
        // kamienice wokół podwórza
        const H0 = 14 + 12 * (1 - Ut.smooth(520, 1380, r));
        const depth = 13;
        const rows = [[-46 + depth / 2, true], [46 - depth / 2, true], [-46 + depth / 2, false], [46 - depth / 2, false]];
        for (const [off, alongX] of rows) {
          let s = alongX ? -46 : -46 + depth;
          const end = alongX ? 46 : 46 - depth;
          while (s < end - 6) {
            let len = 12 + rnd() * 14;
            if (end - (s + len) < 9) len = end - s;
            const H = H0 + (rnd() - 0.4) * 7;
            const mid = s + len / 2;
            const col = rnd.pick(pastel);
            if (alongX) addB('tenement', cx + mid, 0, cz + off, len - 0.3, H, depth, col);
            else addB('tenement', cx + off, 0, cz + mid, depth, H, len - 0.3, col);
            s += len;
          }
        }
        const nt = 2 + Math.floor(rnd() * 5);
        for (let t = 0; t < nt; t++) addTree(cx + (rnd() - 0.5) * 50, cz + (rnd() - 0.5) * 50, 0.9 + rnd() * 0.5, false);
        // drzewa przy chodnikach
        for (let s = -40; s <= 40; s += 20) {
          if (rnd() < 0.7) addTree(cx + s, cz - 50.2, 0.7 + rnd() * 0.3, false);
          if (rnd() < 0.7) addTree(cx - 50.2, cz + s, 0.7 + rnd() * 0.3, false);
        }
      } else if (kind === 3) {
        // osiedle bloków
        const v = rnd();
        const col = rnd.pick(slabC);
        if (v < 0.4) {
          addB('slab', cx, 0, cz - 24, 84, rnd() < 0.5 ? 31 : 15, 12, col);
          addB('slab', cx, 0, cz + 24, 84, rnd() < 0.5 ? 31 : 15, 12, rnd.pick(slabC));
        } else if (v < 0.75) {
          addB('slab', cx - 24, 0, cz, 12, 15 + rnd() * 16, 84, col);
          addB('slab', cx + 20, 0, cz - 20, 18, 34 + rnd() * 10, 18, rnd.pick(slabC));
          addB('slab', cx + 20, 0, cz + 22, 18, 34 + rnd() * 10, 18, rnd.pick(slabC));
        } else {
          addB('slab', cx, 0, cz, 60, 44, 12, col);
          addB('slab', cx - 30, 0, cz + 30, 16, 15, 16, rnd.pick(slabC));
        }
        const nt = 8 + Math.floor(rnd() * 8);
        for (let t = 0; t < nt; t++) {
          const x = cx + (rnd() - 0.5) * 88, z = cz + (rnd() - 0.5) * 88;
          if (Math.abs(z - cz - 24) < 9 || Math.abs(z - cz + 24) < 9) continue;
          addTree(x, z, 0.9 + rnd() * 0.6, rnd() < 0.2);
        }
      } else if (kind === 4) {
        if (rnd() < 0.08) {
          // sklep / szkoła
          addB('office', cx, 0, cz + 10, 56, 8 + rnd() * 4, 34, rnd.pick(stoneC));
          for (let t = 0; t < 6; t++) addTree(cx + (rnd() - 0.5) * 80, cz - 36 + rnd() * 6, 0.9 + rnd() * 0.4, false);
        } else {
          for (const zs of [-1, 1]) {
            let x = -42;
            while (x < 38) {
              const w = 9 + rnd() * 3, d = 8 + rnd() * 3, h = 6.5 + rnd() * 3.5;
              const hx = cx + x + w / 2, hz = cz + zs * (46 - 5 - d / 2);
              addB('house', hx, 0, hz, w, h, d, rnd.pick(houseC), { rotY: 0 });
              x += w + 3.5 + rnd() * 3;
            }
          }
          const nt = 4 + Math.floor(rnd() * 6);
          for (let t = 0; t < nt; t++) addTree(cx + (rnd() - 0.5) * 86, cz + (rnd() - 0.5) * 22, 0.8 + rnd() * 0.5, rnd() < 0.3);
        }
      } else if (kind === 5) {
        const nt = 30 + Math.floor(rnd() * 30);
        for (let t = 0; t < nt; t++) {
          const x = cx + (rnd() - 0.5) * 96, z = cz + (rnd() - 0.5) * 96;
          if (Math.abs(x - Wd.riverX(z)) < 68) continue;
          addTree(x, z, 0.9 + rnd() * 0.7, rnd() < 0.25);
        }
        if (bk.bi === -2 && bk.bj === 0) addB('chimney', cx + 20, 0, cz + 50, 12, 236, 12, srgb(0.8, 0.8, 0.8)); // wieża telewizyjna
      } else if (kind === 6) {
        const n = 1 + Math.floor(rnd() * 2.6);
        for (let i = 0; i < n; i++) {
          const w = 36 + rnd() * 50, d = 22 + rnd() * 22;
          const x = cx + (rnd() - 0.5) * (92 - w), z = cz + (i - (n - 1) / 2) * (92 / n);
          addB('ind', x, 0, z, w, 8 + rnd() * 9, Math.min(d, 92 / n - 6), rnd.pick(indC));
        }
        if (rnd() < 0.3) addB('chimney', cx + 36, 0, cz + 36, 5 + rnd() * 3, 55 + rnd() * 60, 5, brick);
        if (rnd() < 0.3) {
          const nt = 2 + Math.floor(rnd() * 3);
          for (let i = 0; i < nt; i++) { const dd = 14 + rnd() * 8; addB('tank', cx - 34 + i * 22, 0, cz - 36, dd, 10 + rnd() * 6, dd, srgb(0.86, 0.86, 0.84)); }
        }
      }
    }

    // Wsie w okolicy
    for (const v of Wd.villages) {
      const vy = Wd.vilHeight(v);
      const n = Math.round(v.r * v.r / 1400);
      addB('church', v.x, vy, v.z, 12, 13, 22, srgb(0.9, 0.88, 0.82), { rotY: rnd() * 3 });
      addB('church', v.x + 2, vy, v.z + 12, 6, 32, 6, srgb(0.9, 0.88, 0.82), { shape: 'box' });
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, d = 20 + Math.sqrt(rnd()) * v.r;
        const x = v.x + Math.cos(a) * d, z = v.z + Math.sin(a) * d;
        addB('vhouse', x, vy, z, 9 + rnd() * 3, 6.5 + rnd() * 3, 8 + rnd() * 3, rnd.pick(houseC), { rotY: Math.round(rnd() * 4) * Math.PI / 2 + (rnd() - 0.5) * 0.4 });
      }
      for (let i = 0; i < n * 0.6; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * v.r * 1.2;
        addTree(v.x + Math.cos(a) * d, v.z + Math.sin(a) * d, 0.9 + rnd() * 0.6, rnd() < 0.4);
      }
    }

    // Lasy wokół miasta (prawdziwe drzewa do 9 km, dalej las rysuje shader ziemi)
    let forestN = 0;
    const FS = 28;
    for (let z = -9000; z <= 9000 && forestN < 42000; z += FS) {
      for (let x = -9000; x <= 9000; x += FS) {
        const jx = x + (Ut.hash2(x, z) - 0.5) * FS, jz = z + (Ut.hash2(z, x) - 0.5) * FS;
        const r = Math.hypot(jx, jz);
        if (r < 3300 || r > 9000) continue;
        const f = Wd.landAt(jx, jz, 0);
        if (f < 0.45 || Ut.hash2(x * 3, z * 7) > (f - 0.3) * 1.4) continue;
        addTree(jx, jz, 1.3 + rnd() * 0.8, rnd() < 0.7);
        forestN++;
      }
    }

    // Samochody zaparkowane przy krawężnikach
    const carCols = [srgb(0.85, 0.85, 0.85), srgb(0.1, 0.1, 0.12), srgb(0.6, 0.08, 0.08), srgb(0.15, 0.25, 0.55), srgb(0.55, 0.57, 0.6), srgb(0.9, 0.9, 0.92), srgb(0.2, 0.35, 0.25), srgb(0.75, 0.6, 0.2)];
    for (const bk of blocks) {
      if (CARS.length > 4200) break;
      for (const ax of [0, 1]) {
        const n = Math.floor(rnd() * (bk.kind === 4 ? 2.2 : 3.6));
        for (let i = 0; i < n; i++) {
          const along = (rnd() - 0.5) * 96;
          const lane = (rnd() < 0.5 ? -1 : 1) * (rnd() < 0.7 ? 6.3 : 2.4);
          let x, z, yaw;
          if (ax === 0) { x = bk.cx + along; z = bk.cz - 60 + lane; yaw = lane > 0 ? 0 : Math.PI; }
          else { x = bk.cx - 60 + lane; z = bk.cz + along; yaw = lane > 0 ? Math.PI / 2 : -Math.PI / 2; }
          if (Math.abs(x - Wd.riverX(z)) < 66) continue;
          CARS.push({ x, y: 0, z, yaw, col: rnd.pick(carCols), dyn: false, vx: 0, vy: 0, vz: 0, wx: 0, wz: 0, rx: 0, rz: 0, ry: yaw, burned: 0, hit: 0, seed: rnd(), settled: true });
        }
      }
    }

    C.treeList = treeList;
    C.blocks = blocks;
    buildMeshes();
    buildBridges();
    C.totalPop = B.reduce((s, b) => s + b.pop, 0);
    C.rememberCars();
  };

  // ---------- SIATKI ----------
  function buildMeshes() {
    const scene = Wd.scene;
    const geos = { box: boxGeo(), house: houseGeo(), cyl: cylGeo() };
    const counts = { box: 0, house: 0, cyl: 0 };
    for (const b of B) counts[b.shape]++;
    for (const sh of ['box', 'house', 'cyl']) {
      const n = Math.max(1, counts[sh]);
      const mat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0.0 });
      S.patchBuilding(mat, sh);
      const m = new T.InstancedMesh(geos[sh], mat, n);
      m.count = counts[sh];
      m.castShadow = true; m.receiveShadow = true;
      m.frustumCulled = false;
      const aSize = new T.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      const aDmg = new T.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      aDmg.setUsage(T.DynamicDrawUsage);
      geos[sh].setAttribute('aSize', aSize);
      geos[sh].setAttribute('aDmg', aDmg);
      m.userData = { aSize, aDmg, list: [], dirtyM: false, dirtyD: false };
      meshes[sh] = m;
      scene.add(m);
    }
    const col = new T.Color();
    for (const b of B) {
      const m = meshes[b.shape];
      b.inst = m.userData.list.length;
      m.userData.list.push(b.i);
      m.userData.aSize.setXYZW(b.inst, b.sx, b.sy, b.sz, b.k.typ);
      m.userData.aDmg.setXYZW(b.inst, 0, 0, 0, b.seed);
      col.setRGB(b.color[0], b.color[1], b.color[2]);
      m.setColorAt(b.inst, col);
      setMatrix(b);
    }
    for (const sh in meshes) { const m = meshes[sh]; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    C.meshes = meshes;

    // Drzewa
    const trunkC = srgb(0.36, 0.26, 0.18);
    const con = merge([
      { g: new T.CylinderGeometry(0.16, 0.22, 2.2, 6).translate(0, 1.1, 0), c: trunkC, part: 0 },
      { g: new T.ConeGeometry(1.7, 5.4, 8).translate(0, 4.2, 0), c: srgb(0.2, 0.36, 0.2), part: 1 }
    ]);
    const dec = merge([
      { g: new T.CylinderGeometry(0.18, 0.26, 2.6, 6).translate(0, 1.3, 0), c: trunkC, part: 0 },
      { g: new T.IcosahedronGeometry(2.2, 1).translate(0, 4.1, 0), c: srgb(0.3, 0.5, 0.22), part: 1 }
    ]);
    const lists = [C.treeList.filter((t) => t.conifer), C.treeList.filter((t) => !t.conifer)];
    [con, dec].forEach((g, gi) => {
      const list = lists[gi];
      const n = Math.max(1, list.length);
      const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
      S.patchTree(mat);
      const m = new T.InstancedMesh(g, mat, n);
      m.count = list.length;
      m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
      const dm = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
      S.patchTreeDepth(dm);
      m.customDepthMaterial = dm;
      const aFall = new T.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      const aSeed = new T.InstancedBufferAttribute(new Float32Array(n), 1);
      g.setAttribute('aFall', aFall); g.setAttribute('aSeed', aSeed);
      const mt = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), ps = new T.Vector3(), up = new T.Vector3(0, 1, 0);
      list.forEach((t, i) => {
        q.setFromAxisAngle(up, t.seed * 6.283);
        sc.setScalar(t.s);
        ps.set(t.x, t.y - 0.2, t.z);
        mt.compose(ps, q, sc);
        m.setMatrixAt(i, mt);
        aSeed.setX(i, t.seed);
        const tint = 0.8 + t.seed * 0.4;
        col.setRGB(tint, tint * (0.95 + 0.1 * Math.sin(t.seed * 40)), tint * 0.9);
        m.setColorAt(i, col);
        t.mesh = gi; t.idx = i;
        TREES.push(t);
      });
      m.userData = { aFall };
      treeMeshes.push(m);
      scene.add(m);
    });

    // Samochody
    const carG = merge([
      { g: new T.BoxGeometry(4.3, 0.95, 1.8).translate(0, 0.72, 0), c: [1, 1, 1] },
      { g: new T.BoxGeometry(2.3, 0.72, 1.62).translate(-0.25, 1.55, 0), c: srgb(0.12, 0.14, 0.17) },
      { g: new T.BoxGeometry(4.0, 0.36, 1.7).translate(0, 0.25, 0), c: srgb(0.05, 0.05, 0.05) }
    ]);
    const carMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.3 });
    carMesh = new T.InstancedMesh(carG, carMat, Math.max(1, CARS.length));
    carMesh.count = CARS.length;
    carMesh.receiveShadow = true; carMesh.castShadow = true; carMesh.frustumCulled = false;
    CARS.forEach((c, i) => { col.setRGB(c.col[0], c.col[1], c.col[2]); carMesh.setColorAt(i, col); setCarMatrix(c, i); });
    carMesh.instanceMatrix.needsUpdate = true;
    scene.add(carMesh);
    C.carMesh = carMesh;
  }

  function buildBridges() {
    const mat = new T.MeshStandardMaterial({ color: 0x8a8781, roughness: 0.85 });
    const g = new T.BoxGeometry(1, 1, 1);
    for (let k = -24; k <= 24; k += 2) {
      const z = k * BL;
      if (Math.abs(z) > 2700) continue;
      const xc = Wd.riverX(z);
      if (Math.hypot(xc, z) > C.CITY_R + 80) continue;
      const deck = new T.Mesh(g, mat);
      deck.scale.set(132, 1.4, 17); deck.position.set(xc, 0.25, z);
      deck.castShadow = true; deck.receiveShadow = true;
      Wd.scene.add(deck);
      for (const s of [-1, 1]) {
        const rail = new T.Mesh(g, mat);
        rail.scale.set(132, 1.1, 0.4); rail.position.set(xc, 1.45, z + s * 8.3);
        Wd.scene.add(rail);
      }
      for (const px of [-30, 0, 30]) {
        const pil = new T.Mesh(g, mat);
        pil.scale.set(3, 8, 12); pil.position.set(xc + px, -3.5, z);
        Wd.scene.add(pil);
      }
    }
  }

  const _m = new T.Matrix4(), _q = new T.Quaternion(), _q2 = new T.Quaternion(), _p = new T.Vector3(), _s = new T.Vector3(), _ax = new T.Vector3(), _up = new T.Vector3(0, 1, 0);
  function setMatrix(b) {
    let y = b.y;
    if (b.parent >= 0) { const p = B[b.parent]; y = p.y + p.sy * p.hf; }
    _p.set(b.x, y, b.z);
    _ax.set(b.tdz, 0, -b.tdx).normalize();
    _q.setFromAxisAngle(_ax, b.tilt);
    _q2.setFromAxisAngle(_up, b.rotY);
    _q.multiply(_q2);
    _s.set(b.sx, Math.max(0.02, b.sy * b.hf), b.sz);
    _m.compose(_p, _q, _s);
    const m = meshes[b.shape];
    m.setMatrixAt(b.inst, _m);
    m.userData.dirtyM = true;
  }
  const _e = new T.Euler();
  function setCarMatrix(c, i) {
    _p.set(c.x, c.y, c.z);
    _e.set(c.rx, c.ry, c.rz, 'YXZ');
    _q.setFromEuler(_e);
    _s.set(1, 1, 1);
    _m.compose(_p, _q, _s);
    carMesh.setMatrixAt(i, _m);
  }
  function setDmgAttr(b) {
    const m = meshes[b.shape];
    m.userData.aDmg.setXYZW(b.inst, b.dmg, b.burn, b.glass, b.seed);
    m.userData.dirtyD = true;
  }

  // ---------- SKUTKI WYBUCHU ----------
  // Ocena każdego obiektu w zasięgu: kiedy dotrze fala i co z nim zrobi
  C.assess = function (bl) {
    const D = bl.d;
    const bx = bl.pos.x, by = bl.pos.y, bz = bl.pos.z;
    const maxR = Math.max(D.radii.glass * 1.1, D.radii.burn1, D.fbR * 3) + D.hob;
    const ev = [];
    const stats = bl.stats;
    const sp = [0, 0, 0, 0, 0];
    const fbR = D.fbR;
    const conv = !D.nuke;
    for (const b of B) {
      const dx0 = b.x - bx, dz0 = b.z - bz;
      const half = Math.max(b.sx, b.sz) * 0.75;
      if (Math.abs(dx0) - half > maxR || Math.abs(dz0) - half > maxR) continue;
      const by0 = b.parent >= 0 ? B[b.parent].y + B[b.parent].sy : b.y;
      // najbliższy punkt bryły (dla czasu dotarcia)
      const hx = b.sx / 2, hz = b.sz / 2;
      const nx = Ut.clamp(bx, b.x - hx, b.x + hx), nz = Ut.clamp(bz, b.z - hz, b.z + hz), ny = Ut.clamp(by, by0, by0 + b.sy);
      const dNear = Math.hypot(nx - bx, ny - by, nz - bz);
      if (dNear > maxR) continue;
      // nadciśnienie: mediana z pięciu punktów konstrukcji
      const hy = by0 + Math.min(b.sy * 0.5, 8);
      const pts = [[b.x, hy, b.z], [b.x - hx, hy, b.z - hz], [b.x + hx, hy, b.z - hz], [b.x - hx, hy, b.z + hz], [b.x + hx, hy, b.z + hz]];
      for (let k = 0; k < 5; k++) sp[k] = Ph.overpressure(Math.max(0.3, Math.hypot(pts[k][0] - bx, pts[k][1] - by, pts[k][2] - bz)), D.cbrtW);
      sp.sort((a, c) => a - c);
      const p = sp[2];
      const pMax = sp[4];
      const dC = Math.hypot(b.x - bx, by0 + b.sy * 0.5 - by, b.z - bz);
      const q = Ph.thermal(Math.max(dC, 1), D.Y4pi);
      const th = b.k.th, v = b.varF;
      let L = 0;
      if (p > th[0] * v) L = 1;
      if (p > th[1] * v) L = 2;
      if (p > th[2] * v) L = 3;
      if (D.nuke && dNear < fbR * 0.85) L = 4;
      const glass = pMax > 5 * (0.7 + b.seed * 0.7) || L >= 2;
      let fire = 0;
      if (D.nuke && L < 4 && q > D.ignite * (0.6 + b.seed * 0.8)) fire = 1;
      if (D.nuke && L === 3 && Ut.hash2(b.i, 7) < 0.35) fire = 1;
      if (conv && L >= 3 && D.Wtnt > 40 && Ut.hash2(b.i, bl.id) < 0.3) fire = 1;
      if (conv && dNear < fbR * 1.4 && D.Wtnt > 2 && Ut.hash2(b.i, bl.id + 3) < 0.55) fire = 1;
      if (L === 0 && !glass && !fire) continue;
      const t = Ph.arrival(D.front, dNear);
      ev.push({ t, kind: 'b', i: b.i, L, glass, p, dir: [dx0, dz0] });
      if (fire) ev.push({ t: D.nuke ? D.tpulse * (0.3 + 0.7 * Ut.hash2(b.i, 3)) : t + 0.4, kind: 'f', i: b.i });
      // ofiary (szacunkowo, ludzie w budynkach)
      if (b.alive > 0) {
        let dead = p > 140 ? 0.9 : p > 35 ? 0.15 + 0.45 * (p - 35) / 105 : p > 14 ? 0.02 + 0.1 * (p - 14) / 21 : p > 7 ? 0.003 : 0;
        let inj = p > 140 ? 0.08 : p > 35 ? 0.4 : p > 14 ? 0.2 : p > 7 ? 0.06 : p > 3 ? 0.01 : 0;
        // przy małych ładunkach dotknięta jest tylko część dużego budynku
        if (conv) { const f = Ut.clamp(D.radii.light / Math.max(b.sx, b.sz, b.sy), 0.08, 1); dead *= f; inj *= f; }
        if (L === 4) { dead = 1; inj = 0; }
        if (D.nuke) {
          if (q > D.burn3) { dead += (1 - dead) * 0.12; inj += 0.25; }
          if (dC < D.radii.rad + D.hob * 0.3) { dead += (1 - dead) * 0.35; }
          if (fire) dead += (1 - dead) * 0.1;
        }
        dead = Math.min(1, dead); inj = Math.min(1 - dead, inj);
        ev[ev.length - (fire ? 2 : 1)].dead = b.alive * dead;
        ev[ev.length - (fire ? 2 : 1)].inj = b.alive * inj;
      }
    }
    for (let i = 0; i < CARS.length; i++) {
      const c = CARS[i];
      const dx = c.x - bx, dz = c.z - bz;
      if (Math.abs(dx) > maxR || Math.abs(dz) > maxR) continue;
      const d = Math.hypot(dx, c.y + 1 - by, dz);
      if (d > maxR) continue;
      const p = Ph.overpressure(Math.max(d, 0.3), D.cbrtW);
      const q = Ph.thermal(Math.max(d, 1), D.Y4pi);
      const burn = q > 300e3 || (conv && d < fbR * 2.2 && D.Wtnt > 1) || (p > 200 && Ut.hash2(i, 9) < 0.4);
      if (p < 20 * (0.8 + c.seed * 0.5) && !burn) continue;
      ev.push({ t: Ph.arrival(D.front, d), kind: 'c', i, p, burn, dir: [dx, dz] });
    }
    // drzewa (do statystyki; przewracanie robi GPU)
    let trees = 0;
    for (const t of TREES) {
      const dx = t.x - bx, dz = t.z - bz;
      if (Math.abs(dx) > maxR || Math.abs(dz) > maxR) continue;
      const d = Math.hypot(dx, t.y + 4 - by, dz);
      if (Ph.overpressure(Math.max(d, 0.3), D.cbrtW) > 22 + 20 * t.seed) trees++;
    }
    stats.treesTotal = trees;
    ev.sort((a, b) => a.t - b.t);
    bl.events = ev; bl.evPtr = 0;
  };

  const DUST = [0.62, 0.58, 0.52];
  C.applyEvents = function (bl) {
    const ev = bl.events, st = bl.stats;
    while (bl.evPtr < ev.length && ev[bl.evPtr].t <= bl.t) {
      const e = ev[bl.evPtr++];
      if (e.kind === 'b') {
        const b = B[e.i];
        if (e.dead) { st.dead += e.dead; st.inj += e.inj; b.alive = Math.max(0, b.alive - e.dead); }
        let changed = false;
        if (e.glass && !b.glass) { b.glass = 1; st.glass++; changed = true; EP.fx && EP.fx.glassBurst(b, bl); }
        if (e.L > b.dmg) {
          const prev = b.dmg;
          b.dmg = e.L; changed = true;
          if (e.L >= 3 && prev < 3) st.destroyed++;
          else if (e.L === 2 && prev < 2) st.damaged++;
          else if (e.L === 1 && prev < 1) st.light++;
          startCollapse(b, e, bl);
          if (b.child >= 0) {
            const c = B[b.child];
            if (e.L >= 2 && c.dmg < e.L) { c.dmg = Math.max(e.L, 3); startCollapse(c, e, bl); setDmgAttr(c); }
          }
        }
        if (changed) setDmgAttr(b);
      } else if (e.kind === 'f') {
        const b = B[e.i];
        if (b.burnT < 0 && b.dmg < 4) { b.burnT = bl.simNow; b.burnSim = 0; st.fires++; C.burning.push(b.i); }
      } else if (e.kind === 'c') {
        hitCar(e, bl);
      }
    }
  };

  function startCollapse(b, e, bl) {
    const L = b.dmg;
    const r = Ut.hash2(b.i, 17);
    const d = Math.hypot(e.dir[0], e.dir[1]) || 1;
    b.tdx = e.dir[0] / d; b.tdz = e.dir[1] / d;
    b.hf0 = b.hf; b.tilt0 = b.tilt;
    if (L === 1) { b.hT = b.hf; b.tiltT = b.tilt; b.adur = 0.01; }
    else if (L === 2) { b.hT = Math.min(b.hf, 0.7 + 0.18 * r); b.tiltT = (0.03 + 0.05 * r) * (b.shape === 'cyl' ? 2 : 1); b.adur = 1.4 + b.sy / 50; }
    else if (L === 3) { b.hT = Math.min(b.hf, Math.max(2.2 / b.sy, 0.07 + 0.15 * r)); b.tiltT = 0.04 + 0.12 * r; b.adur = 1.8 + b.sy / 35; if (b.shape === 'cyl' && b.sy > 40) { b.tiltT = 1.45; b.hT = 0.9; b.adur = 3.5; } }
    else { b.hT = 0.015; b.tiltT = 0; b.adur = 0.25; b.burnT = -1; b.burn = 0; }
    b.anim = 0;
    if (!C.animating.includes(b.i)) C.animating.push(b.i);
    if (L >= 2 && EP.fx) EP.fx.collapseFx(b, bl, L);
  }

  function hitCar(e, bl) {
    const c = CARS[e.i];
    const st = bl.stats;
    if (e.p > 20 * (0.8 + c.seed * 0.5)) {
      // prędkość cząstek powietrza za czołem fali
      const P0 = Ph.P0, p = e.p;
      const u = 5 * p / (7 * P0) * Ph.C0 / Math.sqrt(1 + 6 * p / (7 * P0));
      const v = Math.min(70, u * 0.22) * (0.7 + 0.6 * c.seed);
      const d = Math.hypot(e.dir[0], e.dir[1]) || 1;
      c.vx += e.dir[0] / d * v; c.vz += e.dir[1] / d * v; c.vy += v * (0.25 + 0.35 * c.seed);
      c.wx += (c.seed - 0.5) * v * 0.5; c.wz += (Ut.hash2(e.i, 5) - 0.5) * v * 0.6;
      c.dyn = true; c.settled = false;
      if (!c.hit) { c.hit = 1; st.cars++; }
      if (!C.carsMoving.includes(e.i)) C.carsMoving.push(e.i);
    }
    if (e.burn && !c.burned) {
      c.burned = 1;
      const col = new T.Color().setRGB(0.05, 0.045, 0.04);
      carMesh.setColorAt(e.i, col); carMesh.instanceColor.needsUpdate = true;
      if (!c.hit) { c.hit = 1; st.cars++; }
    }
  }

  C.animating = [];
  C.burning = [];
  C.carsMoving = [];

  // Aktualizacja animacji zawaleń, pożarów i samochodów
  C.update = function (dtA, dtSim, simNow) {
    if (C.animating.length) {
      const still = [];
      for (const i of C.animating) {
        const b = B[i];
        b.anim = Math.min(1, b.anim + dtA / b.adur);
        const k = b.anim * b.anim * (3 - 2 * b.anim);
        const kk = b.dmg >= 3 ? Math.pow(b.anim, 1.6) : k;
        b.hf = b.hf0 + (b.hT - b.hf0) * kk;
        b.tilt = b.tilt0 + (b.tiltT - b.tilt0) * k;
        setMatrix(b);
        if (b.child >= 0) setMatrix(B[b.child]);
        if (b.child >= 0 && B[b.child].child >= 0) setMatrix(B[B[b.child].child]);
        if (b.anim < 1) still.push(i);
        if (EP.fx && b.dmg >= 2 && b.anim < 0.85) EP.fx.collapseDust(b, dtA);
      }
      C.animating = still;
    }
    // pożary: rozgorzenie i wygasanie (czas symulacji)
    if (C.burning.length) {
      const still = [];
      for (const i of C.burning) {
        const b = B[i];
        b.burnSim += dtSim;
        const age = b.burnSim;
        const target = Ut.smooth(0, 25, age) * (1 - Ut.smooth(900, 1600, age));
        if (Math.abs(target - b.burn) > 0.01 || (target === 0 && b.burn > 0)) { b.burn = target; setDmgAttr(b); }
        if (age < 1600 && b.dmg < 4) still.push(i); else { b.burn = 0; setDmgAttr(b); }
      }
      C.burning = still;
    }
    // samochody w locie
    if (C.carsMoving.length) {
      const still = [];
      for (const i of C.carsMoving) {
        const c = CARS[i];
        const dt = Math.min(dtA, 0.05);
        c.vy -= 9.81 * dt;
        c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
        c.rx += c.wx * dt * 0.3; c.rz += c.wz * dt * 0.3;
        if (c.y <= 0) {
          c.y = 0;
          if (c.vy < -2) { c.vy = -c.vy * 0.25; } else c.vy = 0;
          c.vx *= 0.6; c.vz *= 0.6; c.wx *= 0.5; c.wz *= 0.5;
          if (Math.abs(c.vx) + Math.abs(c.vz) + Math.abs(c.vy) < 0.6) {
            // ląduje na kołach, boku albo dachu
            c.rx = Math.round(c.rx / (Math.PI / 2)) * (Math.PI / 2);
            c.rz = Math.round(c.rz / Math.PI) * Math.PI;
            const side = Math.abs(Math.sin(c.rx)) > 0.5;
            const upside = !side && Math.cos(c.rx) * Math.cos(c.rz) < 0;
            c.y = side ? 0.9 : upside ? 1.95 : 0;
            c.dyn = false;
          }
        }
        setCarMatrix(c, i);
        if (c.dyn) still.push(i);
      }
      carMesh.instanceMatrix.needsUpdate = true;
      C.carsMoving = still;
    }
    for (const sh in meshes) {
      const m = meshes[sh];
      if (m.userData.dirtyM) { m.instanceMatrix.needsUpdate = true; m.userData.dirtyM = false; }
      if (m.userData.dirtyD) { m.userData.aDmg.needsUpdate = true; m.userData.dirtyD = false; }
    }
  };

  // Zapisanie skutków wybuchu na drzewach, zanim zwolni się jego slot w shaderze
  C.bakeTrees = function (bl) {
    const D = bl.d;
    const bx = bl.pos.x, by = bl.pos.y, bz = bl.pos.z;
    const maxR = Math.max(D.radii.moderate * 2.5, D.radii.burn1) + D.hob;
    for (const t of TREES) {
      const dx = t.x - bx, dz = t.z - bz;
      if (Math.abs(dx) > maxR || Math.abs(dz) > maxR) continue;
      const d = Math.hypot(dx, t.y + 4 - by, dz);
      const p = Ph.overpressure(Math.max(d, 0.3), D.cbrtW);
      const thr = 22 + 20 * t.seed;
      const fall = Ut.smooth(thr, thr * 1.35, p);
      const q = Ph.thermal(Math.max(d, 1), D.Y4pi);
      const qthr = 350e3 * (0.7 + 0.6 * t.seed);
      const ch = Ut.smooth(qthr * 0.5, qthr, q);
      const a = treeMeshes[t.mesh].userData.aFall;
      const cur = a.getZ(t.idx);
      if (fall > cur) { const l = Math.hypot(dx, dz) || 1; a.setXYZW(t.idx, dx / l, dz / l, fall, Math.max(a.getW(t.idx), ch)); }
      else if (ch > a.getW(t.idx)) a.setW(t.idx, ch);
    }
    for (const m of treeMeshes) m.userData.aFall.needsUpdate = true;
  };

  // Odbudowa miasta
  C.reset = function () {
    for (const b of B) {
      b.dmg = 0; b.hf = 1; b.hT = 1; b.tilt = 0; b.tiltT = 0; b.anim = 1; b.glass = 0; b.burn = 0; b.burnT = -1; b.alive = b.pop;
      setMatrix(b); setDmgAttr(b);
    }
    C.animating = []; C.burning = []; C.carsMoving = [];
    const col = new T.Color();
    CARS.forEach((c, i) => {
      c.x = c.x0 !== undefined ? c.x0 : c.x; c.z = c.z0 !== undefined ? c.z0 : c.z;
      c.y = 0; c.vx = c.vy = c.vz = 0; c.wx = c.wz = 0; c.rx = 0; c.rz = 0; c.dyn = false; c.burned = 0; c.hit = 0;
      col.setRGB(c.col[0], c.col[1], c.col[2]); carMesh.setColorAt(i, col); setCarMatrix(c, i);
    });
    carMesh.instanceMatrix.needsUpdate = true; carMesh.instanceColor.needsUpdate = true;
    for (const m of treeMeshes) { m.userData.aFall.array.fill(0); m.userData.aFall.needsUpdate = true; }
    C.update(0, 0, 0);
  };
  C.rememberCars = function () { for (const c of CARS) { c.x0 = c.x; c.z0 = c.z; } };

  // Wybór celu: budynek (dach/ściana) albo teren
  const ray = new T.Raycaster();
  C.pick = function (ndc, camera) {
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects([meshes.box, meshes.house, meshes.cyl], false);
    let best = null;
    if (hits.length) best = { point: hits[0].point.clone(), normal: hits[0].face ? hits[0].face.normal.clone() : null, building: true };
    // teren: iteracja wzdłuż promienia
    const o = ray.ray.origin, d = ray.ray.direction;
    let tg = null;
    if (d.y < -1e-4) {
      let t = -o.y / d.y;
      for (let k = 0; k < 6; k++) {
        const x = o.x + d.x * t, z = o.z + d.z * t;
        const h = Wd.groundY(x, z);
        t = (h - o.y) / d.y;
      }
      if (t > 0) tg = t;
    }
    if (tg !== null) {
      const gp = o.clone().addScaledVector(d, tg);
      if (!best || hits[0].distance > tg) best = { point: gp, building: false };
    }
    return best;
  };

  // Liczba obiektów w strefie (do podglądu przed odpaleniem)
  C.exposure = function (pos, D) {
    let pop = 0, bld = 0;
    const R = D.radii.moderate + D.hob;
    for (const b of B) {
      if (Math.abs(b.x - pos.x) > R || Math.abs(b.z - pos.z) > R) continue;
      const d = Math.hypot(b.x - pos.x, b.y + 4 - pos.y, b.z - pos.z);
      if (Ph.overpressure(Math.max(d, 0.3), D.cbrtW) > 35) { pop += b.alive; bld++; }
    }
    return { pop, bld };
  };
})();
