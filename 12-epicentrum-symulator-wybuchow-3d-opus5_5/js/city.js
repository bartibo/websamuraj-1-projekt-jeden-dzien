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
  const TREES_BY = [];   // drzewa według siatki i indeksu instancji
  const CARS = [];
  let meshes = {}, treeMeshes = [], carMesh, treeMat = null, treeDepth = null;
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
      glass: 0, burn: 0, burnT: -1, burnSim: 0, pop: 0, alive: 0, inst: -1, varF: 0.8 + Math.random() * 0.45, rub: -1, burnBl: null, spreadT: 0
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
    buildRubble();
    buildBridges();
    buildGrid();
    fireData = new Uint8Array(64 * 64 * 4);
    fireTex = new T.DataTexture(fireData, 64, 64, T.RGBAFormat);
    fireTex.magFilter = T.LinearFilter; fireTex.minFilter = T.LinearFilter;
    fireTex.needsUpdate = true;
    S.uniforms.uFire.value = fireTex;
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
    // prostsze bryły (drzew jest ok. 60 tys.) i kafle 2 km, żeby kamera i cień pomijały niewidoczne
    const con = merge([
      { g: new T.CylinderGeometry(0.16, 0.22, 2.2, 5, 1, true).translate(0, 1.1, 0), c: trunkC, part: 0 },
      { g: new T.ConeGeometry(1.7, 5.4, 7, 1, true).translate(0, 4.2, 0), c: srgb(0.2, 0.36, 0.2), part: 1 }
    ]);
    const decCrown = new T.IcosahedronGeometry(2.2, 0);
    decCrown.scale(1, 0.92, 1);
    const dec = merge([
      { g: new T.CylinderGeometry(0.18, 0.26, 2.6, 5, 1, true).translate(0, 1.3, 0), c: trunkC, part: 0 },
      { g: decCrown.translate(0, 4.1, 0), c: srgb(0.3, 0.5, 0.22), part: 1 }
    ]);
    const TILE = 2000, tiles = new Map();
    for (const t of C.treeList) {
      const key = (t.conifer ? 'c' : 'd') + Math.floor(t.x / TILE) + ',' + Math.floor(t.z / TILE);
      if (!tiles.has(key)) tiles.set(key, { conifer: t.conifer, list: [] });
      tiles.get(key).list.push(t);
    }
    const lists = [], tgeos = [];
    for (const tl of tiles.values()) { lists.push(tl.list); tgeos.push(tl.conifer ? con : dec); TREES_BY.push([]); }
    tgeos.forEach((g0, gi) => {
      const g = g0.clone();
      const list = lists[gi];
      const n = Math.max(1, list.length);
      const mat = treeMat || (treeMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 }));
      if (!mat.userData.patched) { S.patchTree(mat); mat.userData.patched = true; }
      const m = new T.InstancedMesh(g, mat, n);
      m.count = list.length;
      m.castShadow = true; m.receiveShadow = true;
      const dm = treeDepth || (treeDepth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }));
      if (!dm.userData.patched) { S.patchTreeDepth(dm); dm.userData.patched = true; }
      m.customDepthMaterial = dm;
      const aFall = new T.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      const aSeed = new T.InstancedBufferAttribute(new Float32Array(n), 1);
      const aHit = new T.InstancedBufferAttribute(new Float32Array(n * 4), 4);
      const aHitS = new T.InstancedBufferAttribute(new Float32Array(n), 1);
      for (let i = 0; i < n; i++) aHit.array[i * 4] = -1;
      g.setAttribute('aFall', aFall); g.setAttribute('aSeed', aSeed); g.setAttribute('aHit', aHit); g.setAttribute('aHitS', aHitS);
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
        TREES_BY[gi][i] = t;
      });
      m.userData = { aFall, aHit, aHitS, gi };
      m.computeBoundingSphere();
      m.boundingSphere.radius += 16;
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

  // ---------- HAŁDY GRUZU ----------
  // Zawalony budynek zostawia nieregularną górę gruzu w kolorze swoich ścian
  let rubbleMesh, rubbleN = 0;
  const RUB_MAX = 7000;
  function buildRubble() {
    const g = new T.IcosahedronGeometry(1, 2);
    const p = g.attributes.position;
    const cols = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y < 0) y = 0;
      const n = Ut.noise(x * 2.3 + 5, z * 2.3 - 2) * 0.55 + Ut.noise(x * 6 + y * 3, z * 6) * 0.25;
      const k = 0.75 + n * 0.6;
      x *= 0.5 + 0.5 * k; z *= 0.5 + 0.5 * k; y = y * k * (0.6 + 0.4 * (1 - Math.hypot(x, z)));
      p.setXYZ(i, x * 0.55, Math.max(0, y), z * 0.55);
      const c = 0.6 + Ut.hash2(i, 77) * 0.55;
      cols[i * 3] = c; cols[i * 3 + 1] = c * 0.97; cols[i * 3 + 2] = c * 0.93;
    }
    g.setAttribute('color', new T.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true });
    rubbleMesh = new T.InstancedMesh(g, mat, RUB_MAX);
    rubbleMesh.count = 0; rubbleMesh.frustumCulled = false; rubbleMesh.receiveShadow = true; rubbleMesh.castShadow = false;
    rubbleMesh.instanceColor = new T.InstancedBufferAttribute(new Float32Array(RUB_MAX * 3), 3);
    Wd.scene.add(rubbleMesh);
  }
  function addRubble(b) {
    if (b.rub >= 0 || b.parent >= 0 || b.sy < 4) return;
    const idx = rubbleN % RUB_MAX; rubbleN++;
    rubbleMesh.count = Math.min(RUB_MAX, rubbleN);
    b.rub = idx;
    let vol = b.sx * b.sy * b.sz;
    for (let c = b.child; c >= 0; c = B[c].child) vol += B[c].sx * B[c].sy * B[c].sz;
    b.rubH = Ut.clamp(Math.pow(vol, 1 / 3) * 0.32, 1.4, Math.max(2, b.sy * 0.45));
    const col = new T.Color().setRGB(b.color[0] * 0.55 + 0.12, b.color[1] * 0.53 + 0.11, b.color[2] * 0.5 + 0.1);
    rubbleMesh.setColorAt(idx, col); rubbleMesh.instanceColor.needsUpdate = true;
    setRubble(b, 0);
  }
  function setRubble(b, k) {
    if (b.rub < 0) return;
    if (b.gone) k = 0;
    _p.set(b.x + b.tdx * b.sx * 0.12 * k, b.y, b.z + b.tdz * b.sz * 0.12 * k);
    _q.setFromAxisAngle(_up, b.rotY + b.seed * 0.6);
    _s.set(b.sx * (0.85 + 0.45 * k), Math.max(0.01, b.rubH * k), b.sz * (0.85 + 0.45 * k));
    if (b.gone) { _p.y = -1e5; _s.set(1e-4, 1e-4, 1e-4); }
    _m.compose(_p, _q, _s);
    rubbleMesh.setMatrixAt(b.rub, _m);
    rubbleMesh.instanceMatrix.needsUpdate = true;
  }

  // ---------- SIATKA SĄSIEDZTWA (rozprzestrzenianie pożarów) ----------
  const GC = 60, grid = new Map();
  let gridR = 1;
  function buildGrid() {
    let mh = 0;
    for (const b of B) {
      if (b.parent >= 0) continue;
      mh = Math.max(mh, Math.hypot(b.sx, b.sz) / 2);
      const k = Math.floor(b.x / GC) + ',' + Math.floor(b.z / GC);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(b.i);
    }
    gridR = Math.max(1, Math.ceil((mh + 2) / GC));
  }
  function neighbours(b) {
    if (b.nb) return b.nb;
    const out = [];
    const ci = Math.floor(b.x / GC), cj = Math.floor(b.z / GC);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const arr = grid.get((ci + di) + ',' + (cj + dj));
      if (!arr) continue;
      for (const j of arr) {
        if (j === b.i) continue;
        const o = B[j];
        const gx = Math.abs(o.x - b.x) - (o.sx + b.sx) / 2, gz = Math.abs(o.z - b.z) - (o.sz + b.sz) / 2;
        const gap = Math.max(gx, gz, 0);
        if (gap < 16) out.push([j, gap]);
      }
    }
    b.nb = out;
    return out;
  }
  const FLAM = { house: 1, vhouse: 1, tenement: 0.8, church: 0.6, ind: 0.7, slab: 0.4, office: 0.35, tower: 0.25, chimney: 0, tank: 0.5 };
  let fireData, fireTex, fireT = 0;
  function updateFireMap() {
    const acc = new Float32Array(64 * 64);
    for (const i of C.burning) {
      const b = B[i];
      if (b.burn <= 0.02) continue;
      const ii = Math.floor(b.x / BL) + 32, jj = Math.floor(b.z / BL) + 32;
      if (ii < 0 || ii > 63 || jj < 0 || jj > 63) continue;
      acc[jj * 64 + ii] += b.burn * Math.min(1, (b.sx * b.sz) / 1800);
    }
    let any = false;
    for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) {
      let v = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const a = i + di, c = j + dj;
        if (a < 0 || a > 63 || c < 0 || c > 63) continue;
        v += acc[c * 64 + a] * (di === 0 && dj === 0 ? 0.5 : 0.0625);
      }
      const q = Math.min(255, Math.round(Math.sqrt(Math.min(1, v / 2.5)) * 255));
      fireData[(j * 64 + i) * 4] = q;
      if (q) any = true;
    }
    fireTex.needsUpdate = true;
    return any;
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
    if (b.gone) {
      // wyrzucony razem z lejem krateru: znika
      _p.set(b.x, -1e5, b.z); _q.identity(); _s.set(1e-4, 1e-4, 1e-4);
      _m.compose(_p, _q, _s);
      const mm = meshes[b.shape];
      mm.setMatrixAt(b.inst, _m); mm.userData.dirtyM = true;
      return;
    }
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
    if (c.gone) { _p.set(c.x, -1e5, c.z); _q.identity(); _s.set(1e-4, 1e-4, 1e-4); _m.compose(_p, _q, _s); carMesh.setMatrixAt(i, _m); return; }
    _p.set(c.x, c.y, c.z);
    _e.set(c.rx, c.ry, c.rz, 'YXZ');
    _q.setFromEuler(_e);
    _s.set(1, 1, 1);
    _m.compose(_p, _q, _s);
    carMesh.setMatrixAt(i, _m);
  }
  function setDmgAttr(b) {
    const m = meshes[b.shape];
    // podczas zawalania shader dostaje postęp w części ułamkowej (2,51–2,99)
    const dv = b.dmg === 3 && b.anim < 1 ? 2.51 + 0.48 * b.anim : b.dmg;
    m.userData.aDmg.setXYZW(b.inst, dv, b.burn, b.glass, b.seed);
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
      // nadciśnienie: mediana z pięciu punktów konstrukcji, a dla szyb także najbliższa ściana
      const { p, pMax } = pressureOn(b, D, bx, by, bz, by0, dNear);
      const dC = Math.hypot(b.x - bx, by0 + b.sy * 0.5 - by, b.z - bz);
      const q = Ph.thermal(Math.max(dC, 1), D.Y4pi, D.lambda);
      const th = b.k.th, v = b.varF;
      let L = 0;
      if (p > th[0] * v) L = 1;
      if (p > th[1] * v) L = 2;
      if (p > th[2] * v) L = 3;
      if (D.nuke && (!D.cosmic || D.impact) && dNear < fbR * 0.85) L = 4;
      // uderzenie planetoidy: budynek w leju znika, tuż za wałem zasypują go wyrzucone skały
      let gone = 0, tGone = 0;
      if (D.impact) {
        const rh = Math.hypot(b.x - bx, b.z - bz) / D.cr.R;
        if (rh < 1.02) { gone = 5; tGone = craterTime(D.cr, rh); }
        else if (rh < 1.35) { gone = 4; tGone = ejectaTime(D.cr, rh); }
      }
      const glass = pMax > 2.8 + 3.5 * b.seed || L >= 2;
      let fire = 0;
      if (D.nuke && L < 4 && q > D.ignite * (0.6 + b.seed * 0.8)) fire = 1;
      if (D.nuke && L === 3 && Ut.hash2(b.i, 7) < 0.35) fire = 1;
      if (conv && L >= 3 && D.Wtnt > 40 && Ut.hash2(b.i, bl.id) < 0.3) fire = 1;
      if (conv && dNear < fbR * 1.4 && D.Wtnt > 2 && Ut.hash2(b.i, bl.id + 3) < 0.55) fire = 1;
      if (gone) ev.push({ t: tGone, kind: 'b', i: b.i, L: gone, glass: true, p, dir: [dx0, dz0], all: true });
      if (L === 0 && !glass && !fire) continue;
      const t = Ph.arrival(D.front, dNear);
      if (gone && t > tGone) continue;
      ev.push({ t, kind: 'b', i: b.i, L, glass, p, dir: [dx0, dz0] });
      if (fire) ev.push({ t: D.nuke ? D.tpulse * (0.3 + 0.7 * Ut.hash2(b.i, 3)) : t + 0.4, kind: 'f', i: b.i });
      // ofiary (szacunkowo, ludzie w budynkach)
      if (b.alive > 0) {
        let dead = p > 140 ? 0.9 : p > 35 ? 0.15 + 0.45 * (p - 35) / 105 : p > 14 ? 0.02 + 0.1 * (p - 14) / 21 : p > 7 ? 0.003 : 0;
        let inj = p > 140 ? 0.08 : p > 35 ? 0.4 : p > 14 ? 0.2 : p > 7 ? 0.06 : p > 3 ? 0.01 : glass ? 0.004 : 0;
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
      if (D.impact) {
        const rh = Math.hypot(dx, dz) / D.cr.R;
        if (rh < 1.35) ev.push({ t: rh < 1.02 ? craterTime(D.cr, rh) : ejectaTime(D.cr, rh), kind: 'cg', i });
      }
      const p = Ph.overpressure(Math.max(d, 0.3), D.cbrtW);
      const q = Ph.thermal(Math.max(d, 1), D.Y4pi, D.lambda);
      const burn = q > 300e3 || (conv && d < fbR * 2.2 && D.Wtnt > 1) || (p > 200 && Ut.hash2(i, 9) < 0.4);
      if (p < 20 * (0.8 + c.seed * 0.5) && !burn) continue;
      ev.push({ t: Ph.arrival(D.front, d), kind: 'c', i, p, burn, dir: [dx, dz] });
    }
    // drzewa: stan docelowy liczony raz, shader tylko odtwarza przewracanie w rytm czoła fali
    let trees = 0;
    const tR = Math.max(Ph.radiusForP(9, D.cbrtW), D.nuke ? Ph.radiusForQ(175e3, D.Y4pi, D.lambda) : 0);
    for (const t of TREES) {
      const dx = t.x - bx, dz = t.z - bz;
      if (Math.abs(dx) > tR || Math.abs(dz) > tR) continue;
      const d = Math.hypot(dx, t.y + 4 - by, dz);
      if (d > tR) continue;
      const pt = Ph.overpressure(Math.max(d, 0.3), D.cbrtW);
      const thr = 22 + 20 * t.seed;
      if (pt > thr) trees++;
      const fall = Ut.smooth(thr, thr * 1.35, pt);
      const strip = Ut.smooth(9 + 6 * t.seed, 30, pt);
      const qthr = 350e3 * (0.7 + 0.6 * t.seed);
      const ch = D.nuke ? Ut.smooth(qthr * 0.5, qthr, Ph.thermal(Math.max(d, 1), D.Y4pi, D.lambda)) : 0;
      if (fall < 0.002 && strip < 0.002 && ch < 0.002) continue;
      const u = treeMeshes[t.mesh].userData, a = u.aHit.array, k = t.idx * 4;
      const cur = a[k] > -0.5 ? a[k + 2] + 0.5 * u.aHitS.array[t.idx] + a[k + 3] : -1;
      if (cur >= fall + 0.5 * strip + ch) continue;
      if (a[k] > -0.5) bakeTree(t, u);
      a[k] = bl.slot; a[k + 1] = d; a[k + 2] = fall; a[k + 3] = ch; u.aHitS.array[t.idx] = strip;
      u.dirtyHit = true;
    }
    for (const m of treeMeshes) if (m.userData.dirtyHit) { m.userData.aHit.needsUpdate = true; m.userData.aHitS.needsUpdate = true; m.userData.dirtyHit = false; }
    stats.treesTotal = trees;
    ev.sort((a, b) => a.t - b.t);
    bl.events = ev; bl.evPtr = 0;
  };

  // Kiedy lej krateru dosięga odległości rho (×R), a kiedy spadają tam wyrzucone skały
  function craterTime(cr, rho) {
    const aT = cr.Rt / cr.R;
    return rho <= aT ? cr.tEx * Math.pow(rho / aT, 2.5) : cr.tEx + cr.tCol * 0.5 * Math.min(1, (rho - aT) / (1 - aT));
  }
  function ejectaTime(cr, rho) { return Math.max(cr.tEx * 0.8, Math.sqrt(2 * cr.R * Math.max(0, rho - 0.8) / 9.81)); }
  const _sp = [0, 0, 0, 0, 0];
  function pressureOn(b, D, bx, by, bz, by0, dNear) {
    const hx = b.sx / 2, hz = b.sz / 2;
    const hy = by0 + Math.min(b.sy * 0.5, 8);
    const w = D.cbrtW, f = (x, z) => Ph.overpressure(Math.max(0.3, Math.hypot(x - bx, hy - by, z - bz)), w);
    _sp[0] = f(b.x, b.z); _sp[1] = f(b.x - hx, b.z - hz); _sp[2] = f(b.x + hx, b.z - hz); _sp[3] = f(b.x - hx, b.z + hz); _sp[4] = f(b.x + hx, b.z + hz);
    // mediana z pięciu: sortowanie przez wstawianie w miejscu, bez nowych tablic
    for (let i = 1; i < 5; i++) { const v = _sp[i]; let j = i - 1; while (j >= 0 && _sp[j] > v) { _sp[j + 1] = _sp[j]; j--; } _sp[j + 1] = v; }
    return { p: _sp[2], pMax: Math.max(_sp[4], Ph.overpressure(Math.max(0.3, dNear), w)) };
  }
  // Poziom zniszczeń budynku (wspólny dla podglądu i dla wyniku)
  C.levelFor = function (b, D, pos) {
    const bx = pos.x, by = pos.y, bz = pos.z;
    const by0 = b.parent >= 0 ? B[b.parent].y + B[b.parent].sy : b.y;
    const hx = b.sx / 2, hz = b.sz / 2;
    const nx = Ut.clamp(bx, b.x - hx, b.x + hx), nz = Ut.clamp(bz, b.z - hz, b.z + hz), ny = Ut.clamp(by, by0, by0 + b.sy);
    const dNear = Math.hypot(nx - bx, ny - by, nz - bz);
    const { p } = pressureOn(b, D, bx, by, bz, by0, dNear);
    const th = b.k.th, v = b.varF;
    let L = 0;
    if (p > th[0] * v) L = 1;
    if (p > th[1] * v) L = 2;
    if (p > th[2] * v) L = 3;
    if (D.nuke && (!D.cosmic || D.impact) && dNear < D.fbR * 0.85) L = 4;
    if (D.impact && Math.hypot(b.x - bx, b.z - bz) < D.cr.R * 1.02) L = 5;
    return L;
  };
  function bakeTree(t, u) {
    const a = u.aHit.array, k = t.idx * 4, f = u.aFall.array;
    const s = a[k] | 0;
    const e = EP.shaders.uniforms.uE0.value[s];
    const dx = t.x - e.x, dz = t.z - e.z, l = Math.hypot(dx, dz) || 1;
    if (a[k + 2] > f[k + 2]) { f[k] = dx / l; f[k + 1] = dz / l; f[k + 2] = a[k + 2]; }
    f[k + 3] = Math.max(f[k + 3], a[k + 3]);
    a[k] = -1;
    u.dirtyFall = true;
  }

  const DUST = [0.62, 0.58, 0.52];
  C.applyEvents = function (bl) {
    const ev = bl.events, st = bl.stats;
    while (bl.evPtr < ev.length && ev[bl.evPtr].t <= bl.t) {
      const e = ev[bl.evPtr++];
      if (e.kind === 'b') {
        const b = B[e.i];
        if (e.dead) { st.dead += e.dead; st.inj += e.inj; b.alive = Math.max(0, b.alive - e.dead); }
        if (e.all && b.alive > 0) { st.dead += b.alive; b.alive = 0; }
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
        if (b.burnT < 0 && b.dmg < 4) { b.burnT = bl.simNow; b.burnSim = 0; b.burnBl = bl; b.spreadT = 40 + 80 * b.seed; st.fires++; C.burning.push(b.i); }
      } else if (e.kind === 'c') {
        hitCar(e, bl);
      } else if (e.kind === 'cg') {
        const c = CARS[e.i];
        if (!c.gone) {
          c.gone = true; c.dyn = false;
          if (!c.hit) { c.hit = 1; st.cars++; }
          setCarMatrix(c, e.i); carMesh.instanceMatrix.needsUpdate = true;
        }
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
    else if (L === 3) {
      b.hT = Math.min(b.hf, Math.max(1.2 / b.sy, 0.04 + 0.12 * r)); b.tiltT = 0.04 + 0.12 * r; b.adur = 1.8 + b.sy / 35;
      b.prog = false;
      if (b.shape === 'cyl' && b.sy > 40) { b.tiltT = 1.45; b.hT = 0.9; b.adur = 3.5; }
      else if (b.shape === 'box' && b.sy > 26) {
        // wysoki budynek składa się piętro po piętrze, coraz szybciej, jak przy swobodnym spadku
        b.prog = true; b.floors = Math.max(5, Math.round(b.sy / 3.6)); b.flDone = 0; b.surge = false;
        b.tiltT = 0.015 + 0.04 * r;
        b.adur = 1.0 + Math.sqrt(2 * b.sy / 9.81) * 1.35;
      }
    }
    else {
      b.hT = 0.015; b.tiltT = 0; b.adur = 0.25; b.burnT = -1; b.burn = 0;
      if (L >= 5) {
        b.gone = true;
        if (b.rub >= 0) setRubble(b, 0);
        for (let c = b.child; c >= 0; c = B[c].child) { B[c].gone = true; B[c].dmg = 5; setMatrix(B[c]); }
      }
    }
    b.anim = 0;
    if (L === 3) addRubble(b);
    if (!b.inAnim) { b.inAnim = true; C.animating.push(b.i); }
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
      if (!c.inMove) { c.inMove = true; C.carsMoving.push(e.i); }
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
        let kk = b.dmg >= 3 ? Math.pow(b.anim, 1.6) : k;
        if (b.prog && b.dmg === 3) {
          // skoki o kolejne piętra: chwila oporu, potem stropy spadają na niższe
          const f = b.anim * b.anim * b.floors, fl = Math.floor(f);
          kk = Math.min(1, (fl + Ut.smooth(0.5, 1, f - fl)) / b.floors);
          if (fl > b.flDone && EP.fx) {
            b.flDone = fl;
            const by0 = b.parent >= 0 ? B[b.parent].y + B[b.parent].sy * B[b.parent].hf : b.y;
            EP.fx.collapseFront(b, by0 + b.sy * (b.hf0 + (b.hT - b.hf0) * kk), Math.min(1, fl / b.floors + 0.3));
          }
          if (!b.surge && b.anim > 0.78 && EP.fx) { b.surge = true; EP.fx.dustSurge(b); }
        } else if (b.dmg === 3 && !b.surge && b.anim > 0.6 && b.sy > 10 && EP.fx) { b.surge = true; EP.fx.dustSurge(b); }
        b.hf = b.hf0 + (b.hT - b.hf0) * kk;
        b.tilt = b.tilt0 + (b.tiltT - b.tilt0) * k;
        setMatrix(b);
        if (b.dmg === 3 && (b.anim >= 1 || Math.abs(b.anim - (b._aSent || 0)) > 0.04)) { b._aSent = b.anim; setDmgAttr(b); }
        if (b.rub >= 0) setRubble(b, Ut.smooth(0.15, 1, b.anim));
        if (b.child >= 0) setMatrix(B[b.child]);
        if (b.child >= 0 && B[b.child].child >= 0) setMatrix(B[B[b.child].child]);
        if (b.anim < 1) still.push(i); else b.inAnim = false;
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
        // ogień przeskakuje na sąsiednie budynki, łatwiej z wiatrem i między domami
        if (b.burn > 0.55 && b.parent < 0 && age < 1100) {
          b.spreadT -= dtSim;
          if (b.spreadT <= 0) {
            b.spreadT = 30 + 70 * Math.random();
            const wind = EP.fx ? EP.fx.WIND : null, wl = wind ? Math.hypot(wind.x, wind.z) || 1 : 1;
            for (const [j, gap] of neighbours(b)) {
              const o = B[j];
              if (o.burnT >= 0 || o.dmg >= 4) continue;
              const fl = (FLAM[o.cls] || 0.4) * (o.dmg >= 2 ? 1.5 : 1);
              let pr = fl * (1 - gap / 16) * 0.45;
              if (wind) { const dx = o.x - b.x, dz = o.z - b.z, dl = Math.hypot(dx, dz) || 1; pr *= 1 + 0.8 * (dx * wind.x + dz * wind.z) / (dl * wl) * Math.min(1, wl / 4); }
              if (Math.random() < pr) {
                o.burnT = simNow; o.burnSim = 0; o.burnBl = b.burnBl; o.spreadT = 40 + 80 * o.seed;
                if (o.burnBl) { o.burnBl.stats.fires++; o.burnBl.stats.spread = (o.burnBl.stats.spread || 0) + 1; }
                still.push(j);
              }
            }
          }
        }
        if (age < 1600 && b.dmg < 4) still.push(i); else { b.burn = 0; setDmgAttr(b); }
      }
      C.burning = still;
    }
    fireT -= dtA;
    if (fireT <= 0 && fireTex && (C.burning.length || C._fireShown)) { fireT = 0.5; C._fireShown = updateFireMap(); }
    // samochody w locie
    if (C.carsMoving.length) {
      const still = [];
      for (const i of C.carsMoving) {
        const c = CARS[i];
        if (c.gone) { c.inMove = false; continue; }
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
        if (c.dyn) still.push(i); else c.inMove = false;
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
    for (const m of treeMeshes) {
      const u = m.userData, a = u.aHit.array;
      for (let i = 0; i < m.count; i++) if (a[i * 4] > -0.5 && (a[i * 4] | 0) === bl.slot) bakeTree(TREES_BY[m.userData.gi][i], u);
      if (u.dirtyFall) { u.aFall.needsUpdate = true; u.aHit.needsUpdate = true; u.dirtyFall = false; }
    }
  };

  // Odbudowa miasta
  C.reset = function () {
    for (const b of B) {
      b.gone = false; b.dmg = 0; b.hf = 1; b.hT = 1; b.tilt = 0; b.tiltT = 0; b.anim = 1; b.glass = 0; b.burn = 0; b.burnT = -1; b.alive = b.pop; b.rub = -1; b.burnBl = null; b.prog = false; b.surge = false; b._aSent = 0;
      setMatrix(b); setDmgAttr(b);
    }
    rubbleN = 0; rubbleMesh.count = 0;
    fireData.fill(0); fireTex.needsUpdate = true; C._fireShown = false;
    for (const i of C.animating) B[i].inAnim = false;
    for (const i of C.carsMoving) CARS[i].inMove = false;
    C.animating = []; C.burning = []; C.carsMoving = [];
    const col = new T.Color();
    CARS.forEach((c, i) => {
      c.x = c.x0 !== undefined ? c.x0 : c.x; c.z = c.z0 !== undefined ? c.z0 : c.z;
      c.y = 0; c.vx = c.vy = c.vz = 0; c.wx = c.wz = 0; c.rx = 0; c.rz = 0; c.dyn = false; c.burned = 0; c.hit = 0; c.gone = false;
      col.setRGB(c.col[0], c.col[1], c.col[2]); carMesh.setColorAt(i, col); setCarMatrix(c, i);
    });
    carMesh.instanceMatrix.needsUpdate = true; carMesh.instanceColor.needsUpdate = true;
    for (const m of treeMeshes) {
      const u = m.userData;
      u.aFall.array.fill(0); u.aFall.needsUpdate = true;
      for (let i = 0; i < u.aHit.count; i++) u.aHit.array[i * 4] = -1;
      u.aHit.needsUpdate = true;
    }
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

  // Czy odcinek a–b przecina stojący budynek (kamera nie powinna patrzeć przez ściany)
  C.segBlocked = function (a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), z0 = Math.min(a.z, b.z), z1 = Math.max(a.z, b.z);
    for (const o of B) {
      if (o.dmg >= 3) continue;
      const hx = o.sx / 2, hz = o.sz / 2;
      if (o.x + hx < x0 || o.x - hx > x1 || o.z + hz < z0 || o.z - hz > z1) continue;
      const by0 = o.parent >= 0 ? B[o.parent].y + B[o.parent].sy : o.y, by1 = by0 + o.sy * o.hf;
      let t0 = 0.02, t1 = 0.98;
      const ax = [[a.x, dx, o.x - hx, o.x + hx], [a.y, dy, by0, by1], [a.z, dz, o.z - hz, o.z + hz]];
      let hit = true;
      for (const [p, d, lo, hi] of ax) {
        if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) { hit = false; break; } continue; }
        let ta = (lo - p) / d, tb = (hi - p) / d;
        if (ta > tb) { const t = ta; ta = tb; tb = t; }
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
        if (t0 > t1) { hit = false; break; }
      }
      if (hit) return true;
    }
    return false;
  };

  // Najwyższy dach stojącego budynku pod punktem (x, z), z marginesem pad; -Infinity, gdy pod nogami nie ma budynku
  function insideB(o, x, z, pad) {
    const dx = x - o.x, dz = z - o.z, c = Math.cos(o.rotY), sn = Math.sin(o.rotY);
    const lx = dx * c - dz * sn, lz = dx * sn + dz * c;
    return Math.abs(lx) < o.sx / 2 + pad && Math.abs(lz) < o.sz / 2 + pad;
  }
  C.roofAt = function (x, z, pad) {
    let top = -Infinity;
    const ci = Math.floor(x / GC), cj = Math.floor(z / GC);
    for (let dj = -gridR; dj <= gridR; dj++) for (let di = -gridR; di <= gridR; di++) {
      const arr = grid.get((ci + di) + ',' + (cj + dj));
      if (!arr) continue;
      for (const j of arr) {
        const b = B[j];
        if (b.gone || b.dmg >= 3 || !insideB(b, x, z, pad)) continue;
        let h = b.y + b.sy * b.hf;
        for (let k = b.child; k >= 0; k = B[k].child) {
          const o = B[k], pp = B[o.parent];
          if (o.gone || o.dmg >= 3 || !insideB(o, x, z, pad)) break;
          h = pp.y + pp.sy * pp.hf + o.sy * o.hf;
        }
        if (h > top) top = h;
      }
    }
    return top;
  };

  // Liczba obiektów w strefie (do podglądu przed odpaleniem)
  C.exposure = function (pos, D) {
    let pop = 0, bld = 0;
    const R = D.radii.moderate + D.hob;
    const c = new T.Vector3(pos.x, Wd.groundY(pos.x, pos.z) + (D.nuke ? D.hob : Math.max(0, pos.y - Wd.groundY(pos.x, pos.z))), pos.z);
    for (const b of B) {
      const half = Math.max(b.sx, b.sz) * 0.75;
      if (Math.abs(b.x - pos.x) - half > R || Math.abs(b.z - pos.z) - half > R) continue;
      if (C.levelFor(b, D, c) >= 3) { pop += b.alive; bld++; }
    }
    return { pop, bld };
  };
})();
