'use strict';
/* Miasto: plan zabudowy, budynki (z drganiami, uszkodzeniami i zawaleniami), drzewa, samochody, latarnie. */

const BAY = { house: 3.5, masonry: 3.6, panel: 3.0, office: 2.4, tower: 2.0, belfry: 3.5 };
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const _e1 = new THREE.Euler(), _m1 = new THREE.Matrix4(), _s1 = new THREE.Vector3();
const _gs = { dx: 0, dy: 0, dz: 0, ax: 0, ay: 0, az: 0, I: 1 };
const UP = new THREE.Vector3(0, 1, 0);

/* Geometria prostopadłościanu z UV w metrach – okna układają się równo na każdej ścianie. */
function facadeBox(w, h, d, TW, TH, y0, uOff, roof) {
  const g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    let u, v;
    if (Math.abs(ny) > 0.5) { u = 10 / 512; v = 1 - 3 / 512; }   // stały kolor ściany (strop/spód)
    else {
      let a;
      if (Math.abs(nx) > 0.5) a = nx > 0 ? (d / 2 - z) : (z + d / 2);
      else a = nz > 0 ? (x + w / 2) : (w / 2 - x);
      u = (a + uOff) / TW;
      v = (y + h / 2 + y0) / TH;
    }
    uv.setXY(i, u, v);
  }
  // jedna grupa (ściany + strop + spód) albo dwie, gdy widać dach – mniej wywołań rysowania
  g.clearGroups();
  if (roof) {
    const src = g.index.array, idx = [];
    for (const gi of [0, 1, 3, 4, 5]) for (let k = 0; k < 6; k++) idx.push(src[gi * 6 + k]);
    for (let k = 0; k < 6; k++) idx.push(src[2 * 6 + k]);
    g.setIndex(idx);
    g.addGroup(0, 30, 0);
    g.addGroup(30, 6, 1);
  }
  return g;
}

/* Dach dwuspadowy: kalenica wzdłuż osi x */
function gableGeo(w, d, rh) {
  const hw = w / 2 + 0.35, hd = d / 2 + 0.45;
  const P = [
    // połacie
    -hw, 0, hd, hw, 0, hd, hw, rh, 0, -hw, 0, hd, hw, rh, 0, -hw, rh, 0,
    hw, 0, -hd, -hw, 0, -hd, -hw, rh, 0, hw, 0, -hd, -hw, rh, 0, hw, rh, 0,
    // szczyty
    hw, 0, hd, hw, 0, -hd, hw, rh, 0,
    -hw, 0, -hd, -hw, 0, hd, -hw, rh, 0,
    // spód
    -hw, 0, hd, -hw, 0, -hd, hw, 0, -hd, -hw, 0, hd, hw, 0, -hd, hw, 0, hd
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.computeVertexNormals();
  g.translate(0, -rh / 2, 0);
  return g;
}

const City = {
  plan: null,
  buildings: [],
  pickables: [],
  footprints: [],
  lotPaint: [],
  power: 1,
  powerFlicker: 1,
  blackout: false,
  blackoutAt: -1,
  windowsLevel: 0.85,
  lampsLevel: 1,
  mats: {},
  group: null,
  maxIeff: 1,

  /* ---------------------------------------------------------------- plan */
  makePlan() {
    const r = U.rng(2026);
    const P = { buildings: [], trees: [], lamps: [], parked: [], lots: [] };
    const fp = this.footprints = [];
    const lots = this.lotPaint = [];
    const addB = (type, x, z, w, d, floors, yaw, extra) => {
      const b = Object.assign({ type, x, z, w, d, floors, yaw, tint: null, seed: r() }, extra || {});
      P.buildings.push(b);
      const sw = (Math.abs(Math.sin(yaw)) > 0.5);
      fp.push({ x, z, w: sw ? d : w, d: sw ? w : d });
      return b;
    };
    const tree = (x, z, s, kind) => P.trees.push({ x, z, s: s || r.range(0.8, 1.25), kind: kind || (r() < 0.25 ? 'con' : 'dec') });
    const pastel = ['#f3e3c3', '#efd2b5', '#e9c6a5', '#dfe5cf', '#d5e1e8', '#f4e7a8', '#e8c9c3', '#f1efe6', '#d9d1e6'];
    const houseCols = ['#f4f1ea', '#f1e1c6', '#dfe9f1', '#f1d9cf', '#e5edd8', '#f5edc9', '#e6e1f0', '#ffffff'];
    const roofCols = ['#9a4b32', '#8b3e2c', '#5d6168', '#6f4a3a', '#a65a3a', '#4f545c'];

    const CX = [-160, -120, -80, -40, 0, 40, 80, 120, 160];
    const CZ = [-150, -110, -70, -30, 10];
    const district = (cx, cz) => {
      if (cz === 10) return cx === 0 ? 'park' : 'houses';
      if (cz === -30) {
        if (cx === 0) return 'plaza';
        if (Math.abs(cx) === 40) return 'office';
        if (Math.abs(cx) === 80) return 'masonry';
        return 'houses';
      }
      if (cz === -150 && Math.abs(cx) <= 40) return 'park';
      if (Math.abs(cx) <= 40) {
        if ((cx === 0 && cz === -70) || (cx === -40 && cz === -110)) return 'tower';
        return 'office';
      }
      return cx > 0 ? 'masonry' : 'panel';
    };

    for (const cx of CX) for (const cz of CZ) {
      const d = district(cx, cz);
      const x0 = cx - 15, x1 = cx + 15, z0 = cz - 15, z1 = cz + 15;
      if (d === 'houses') {
        for (const ox of [-7.5, 7.5]) for (const oz of [-7.5, 7.5]) {
          const lx = cx + ox, lz = cz + oz;
          lots.push({ x0: lx - 7.2, x1: lx + 7.2, z0: lz - 7.2, z1: lz + 7.2, color: r() < 0.5 ? '#6b8f45' : '#739650' });
          const big = r() < 0.45;
          const w = big ? 10.5 : 7, dd = 7;
          const yaw = r() < 0.5 ? 0 : Math.PI / 2;
          const fl = r() < 0.55 ? 2 : 1;
          const hx = lx + r.range(-1.2, 1.2) + (ox < 0 ? -0.8 : 0.8), hz = lz + (oz < 0 ? -1.5 : 1.5);
          addB('house', hx, hz, w, dd, fl, yaw, { tint: r.pick(houseCols), roof: r.pick(roofCols) });
          // drzewa w ogrodzie
          const tx = lx - ox * 0.62, tz = lz - oz * 0.55;
          tree(tx + r.range(-1.5, 1.5), tz + r.range(-1, 1));
          if (r() < 0.5) tree(lx + r.range(-5, 5), lz - oz * 0.75, 0.7);
          // podjazd z autem
          if (r() < 0.35) P.parked.push({ x: lx + (ox > 0 ? 5.2 : -5.2), z: lz + oz * 0.55, yaw: Math.PI / 2 });
        }
      } else if (d === 'masonry') {
        lots.push({ x0, x1, z0, z1, color: '#8f8a80', tiles: true });
        for (const side of [1, -1]) {
          const widths = r.pick([[10.8, 7.2, 10.8], [7.2, 14.4, 7.2], [10.8, 10.8, 7.2], [7.2, 7.2, 14.4]]);
          let x = x0 + 0.6;
          for (const w of widths) {
            const fl = r.int(3, 5);
            addB('masonry', x + w / 2, cz + side * 8.6, w, 12, fl, side > 0 ? 0 : Math.PI, { tint: r.pick(pastel) });
            x += w;
          }
        }
        tree(cx + r.range(-6, 6), cz + r.range(-1, 1), 0.9, 'dec');
      } else if (d === 'panel') {
        const point = r() < 0.3;
        if (point) {
          addB('panel', cx, cz, 15, 15, r.int(11, 14), 0, { tint: r.pick(['#e6e3dc', '#dcd8d0', '#e2dcc8']) });
          for (let i = 0; i < 5; i++) tree(cx + r.range(-14, 14), cz + (r() < 0.5 ? -12.5 : 12.5));
        } else {
          const yaw = (CX.indexOf(cx) + CZ.indexOf(cz)) % 2 ? 0 : Math.PI / 2;
          addB('panel', cx, cz + (yaw ? 0 : r.range(-3, 3)), 27, 12, r.int(5, 11), yaw, { tint: r.pick(['#e6e3dc', '#d7dde0', '#e5dccb', '#dde3d4']) });
          for (let i = 0; i < 6; i++) {
            const along = r.range(-13, 13), off = r() < 0.5 ? -11.5 : 11.5;
            if (yaw) tree(cx + off, cz + along); else tree(cx + along, cz + off);
          }
        }
        lots.push({ x0: cx - 3, x1: cx + 3, z0: z0, z1: z1, color: '#a9a69e' });
        P.parked.push({ x: cx - 13, z: cz + 13.5, yaw: 0 }, { x: cx - 8, z: cz + 13.5, yaw: 0 });
      } else if (d === 'office') {
        lots.push({ x0, x1, z0, z1, color: '#b3aea4', tiles: true });
        if (r() < 0.6) {
          addB('office', cx, cz, 16.8, 16.8, r.int(9, 16), 0, { tint: r.pick(['#dfe9f2', '#d2e2ee', '#e6eef2', '#d9e4e0']) });
        } else {
          addB('office', cx - 6.5, cz - 3, 14.4, 21.6, r.int(7, 11), 0, { tint: r.pick(['#dfe9f2', '#e6e6e6']) });
          addB('office', cx + 8.5, cz + 7, 9.6, 12, r.int(4, 6), 0, { tint: '#e8e4dc' });
        }
        tree(cx - 13, cz + 13, 0.8, 'dec'); tree(cx + 13, cz - 13, 0.8, 'dec');
      } else if (d === 'tower') {
        lots.push({ x0, x1, z0, z1, color: '#bcb6aa', tiles: true });
        addB('tower', cx, cz, 22, 22, r.int(29, 34), 0, { tint: r.pick(['#cfe0ee', '#d8e4ec']) });
        tree(cx - 13.5, cz + 13.5, 0.7, 'dec'); tree(cx + 13.5, cz + 13.5, 0.7, 'dec');
      } else if (d === 'park') {
        lots.push({ x0, x1, z0, z1, color: '#5f8c40', path: true });
        const n = cz === 10 ? 12 : 16;
        for (let i = 0; i < n; i++) {
          let x = cx + r.range(-14, 14), z = cz + r.range(-14, 14);
          if (Math.abs(Math.abs(x - cx) - Math.abs(z - cz)) < 2.5) continue;
          tree(x, z, r.range(0.9, 1.5));
        }
      } else if (d === 'plaza') {
        lots.push({ x0, x1, z0, z1, color: '#c3b9a7', tiles: true });
        addB('belfry', cx - 9.5, cz - 4, 7, 7, 8, 0, { tint: '#ffffff' });
        addB('masonry', cx + 3.5, cz - 4, 19, 11, 3, 0, { tint: '#efe4d0', name: 'Kościół – nawa', gable: true, fh: 4.4 });
        for (let i = -12; i <= 12; i += 6) tree(cx + i, cz + 12.5, 0.75, 'dec');
      }
    }

    // latarnie wzdłuż ulic
    const RX = World.ROADS_X, RZ = World.ROADS_Z;
    let side = 1;
    for (const x of RX) {
      for (let z = RZ[0] + 13; z < RZ[RZ.length - 1] - 6; z += 26) {
        side = -side;
        P.lamps.push({ x: x + side * 4.4, z, yaw: side > 0 ? Math.PI : 0 });
      }
    }
    for (const z of RZ) {
      for (let x = RX[0] + 13; x < RX[RX.length - 1] - 6; x += 26) {
        side = -side;
        P.lamps.push({ x, z: z + side * 4.4, yaw: side > 0 ? Math.PI / 2 : -Math.PI / 2 });
      }
    }
    // promenada
    for (let x = -215; x <= 215; x += 18) {
      P.lamps.push({ x, z: 45.5, yaw: Math.PI / 2 });
      if (r() < 0.8) tree(x + 9, 47.5, 0.85, 'dec');
    }
    // zaparkowane auta przy krawężnikach
    for (let i = 0; i < 34; i++) {
      const horiz = r() < 0.5;
      if (horiz) {
        const z = r.pick(RZ), x = r.range(RX[0] + 8, RX[RX.length - 1] - 8);
        if (Math.abs(((x - RX[0]) % 40) - 0) < 8 || Math.abs(((x - RX[0]) % 40) - 40) < 8) continue;
        P.parked.push({ x, z: z + (r() < 0.5 ? -2.6 : 2.6), yaw: 0 });
      } else {
        const x = r.pick(RX), z = r.range(RZ[0] + 8, RZ[RZ.length - 1] - 8);
        if (Math.abs(((z - RZ[0]) % 40)) < 8 || Math.abs(((z - RZ[0]) % 40) - 40) < 8) continue;
        P.parked.push({ x: x + (r() < 0.5 ? -2.6 : 2.6), z, yaw: Math.PI / 2 });
      }
    }
    // las na wzgórzach
    let tries = 0;
    while (P.trees.length < 760 && tries++ < 20000) {
      const x = r.range(-450, 450), z = r.range(-450, 30);
      const h = World.baseHeight(x, z);
      if (h < 4 || h > 160) continue;
      if (U.fbm2(x * 0.01, z * 0.01, 3) < 0.45) continue;
      tree(x, z, r.range(0.9, 1.7), r() < 0.75 ? 'con' : 'dec');
    }
    this.plan = P;
  },

  /* ------------------------------------------------------------ materiały */
  facadeTex(kind) {
    const S = 512, cell = 64;
    const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
    const cv = mk(), ev = mk();
    const c = cv.getContext('2d'), e = ev.getContext('2d');
    const r = U.rng(kind.length * 977 + kind.charCodeAt(0));
    e.fillStyle = '#000';
    e.fillRect(0, 0, S, S);
    const warm = ['#ffb75e', '#ffa64a', '#ffc77e', '#ffbd6a', '#ff9f45'];
    const cool = ['#9fcbff', '#b6d8ff', '#ffd08a', '#8fc0f5'];
    const lit = (x, y, w, h, p, pal) => {
      if (r() < p) {
        const g = e.createLinearGradient(0, y, 0, y + h);
        const col = pal[Math.floor(r() * pal.length)];
        g.addColorStop(0, col);
        g.addColorStop(1, r() < 0.3 ? '#3a2a10' : col);
        e.fillStyle = g;
        e.globalAlpha = 0.5 + r() * 0.4;
        e.fillRect(x, y, w, h);
        e.globalAlpha = 1;
      }
    };
    const glass = (x, y, w, h, a, b) => {
      const g = c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      c.fillStyle = g;
      c.fillRect(x, y, w, h);
    };
    if (kind === 'house') {
      c.fillStyle = '#f2efe8'; c.fillRect(0, 0, S, S);
      for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(0,0,0,${r() * 0.04})`; c.fillRect(r() * S, r() * S, 2, 2); }
      for (let y = 0; y < S; y += cell) for (let x = 0; x < S; x += cell) {
        c.fillStyle = '#fbfbfb'; c.fillRect(x + 16, y + 12, 32, 36);
        glass(x + 19, y + 15, 26, 30, '#56708a', '#24303c');
        c.fillStyle = '#fbfbfb'; c.fillRect(x + 31, y + 15, 2, 30); c.fillRect(x + 19, y + 28, 26, 2);
        if (r() < 0.35) { c.fillStyle = r() < 0.5 ? '#3f5e3a' : '#6b4a32'; c.fillRect(x + 9, y + 13, 6, 34); c.fillRect(x + 49, y + 13, 6, 34); }
        lit(x + 19, y + 15, 26, 30, 0.45, warm);
      }
    } else if (kind === 'masonry') {
      c.fillStyle = '#efe5d2'; c.fillRect(0, 0, S, S);
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(80,60,30,${r() * 0.05})`; c.fillRect(r() * S, r() * S, 3, 1); }
      for (let y = 0; y < S; y += cell) {
        c.fillStyle = '#d8cbb2'; c.fillRect(0, y, S, 6);
        c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(0, y + 6, S, 2);
        for (let x = 0; x < S; x += cell) {
          c.fillStyle = '#e0d4bc';
          c.beginPath(); c.moveTo(x + 17, y + 14); c.lineTo(x + 32, y + 9); c.lineTo(x + 47, y + 14); c.fill();
          c.fillStyle = '#fbf8f0'; c.fillRect(x + 19, y + 15, 26, 42);
          glass(x + 22, y + 18, 20, 36, '#5b6f80', '#202a33');
          c.fillStyle = '#fbf8f0'; c.fillRect(x + 31, y + 18, 2, 36); c.fillRect(x + 22, y + 32, 20, 2);
          c.fillStyle = '#cdbfa5'; c.fillRect(x + 17, y + 57, 30, 3);
          lit(x + 22, y + 18, 20, 36, 0.5, warm);
        }
      }
    } else if (kind === 'panel') {
      c.fillStyle = '#d5d3cd'; c.fillRect(0, 0, S, S);
      for (let i = 0; i < 2000; i++) { c.fillStyle = `rgba(0,0,0,${r() * 0.05})`; c.fillRect(r() * S, r() * S, 2, 2); }
      const balc = ['#c76b47', '#5c86b0', '#d9b44a', '#7aa36a', '#c9c6bd'];
      for (let y = 0; y < S; y += cell) for (let x = 0; x < S; x += cell) {
        const col = Math.floor(x / cell);
        glass(x + 10, y + 16, 44, 26, '#5d7183', '#26323d');
        c.fillStyle = '#e9e8e4'; c.fillRect(x + 31, y + 16, 2, 26);
        lit(x + 10, y + 16, 44, 26, 0.5, warm);
        if (col % 4 === 1 || col % 4 === 2) {
          c.fillStyle = balc[(Math.floor(col / 4) + Math.floor(y / cell / 2)) % balc.length];
          c.fillRect(x, y + 44, cell, 14);
          c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, y + 58, cell, 3);
        }
        c.fillStyle = '#a6a49c';
        c.fillRect(x, y + cell - 2, cell, 2);
        if (col % 2 === 0) c.fillRect(x, y, 2, cell);
      }
    } else if (kind === 'office') {
      c.fillStyle = '#9eaebc'; c.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += cell) for (let x = 0; x < S; x += cell) {
        glass(x, y + 15, cell, 49, '#86a2b8', '#3f5b72');
        c.fillStyle = '#2f3a44'; c.fillRect(x, y + 15, 3, 49); c.fillRect(x + 32, y + 15, 1.5, 49);
        c.fillStyle = '#b8c5cf'; c.fillRect(x, y + 13, cell, 2);
        lit(x + 3, y + 17, 61, 45, 0.32, cool);
      }
    } else if (kind === 'tower') {
      c.fillStyle = '#5e7286'; c.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += cell) for (let x = 0; x < S; x += cell) {
        glass(x, y + 7, cell, 57, '#6f8fae', '#2c435b');
        c.fillStyle = '#b9c6d2'; c.fillRect(x, y + 7, 2, 57);
        c.fillStyle = '#8a9bab'; c.fillRect(x, y, cell, 7);
        lit(x + 2, y + 9, 62, 53, 0.28, cool);
      }
    } else if (kind === 'belfry') {
      c.fillStyle = '#9a573f'; c.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 8) {
        const off = (y / 8) % 2 ? 8 : 0;
        c.fillStyle = 'rgba(40,20,10,0.35)'; c.fillRect(0, y, S, 1.5);
        for (let x = off; x < S; x += 16) c.fillRect(x, y, 1.5, 8);
      }
      for (let i = 0; i < 1500; i++) { c.fillStyle = `rgba(255,220,180,${r() * 0.06})`; c.fillRect(r() * S, r() * S, 4, 2); }
      for (let y = 0; y < S; y += cell * 2) for (let x = 0; x < S; x += cell * 2) {
        c.fillStyle = '#e9dcc5'; c.fillRect(x + 22, y + 20, 20, 34);
        c.beginPath(); c.arc(x + 32, y + 20, 10, Math.PI, 0); c.fill();
        c.fillStyle = '#1f1a17'; c.fillRect(x + 25, y + 22, 14, 30);
        c.beginPath(); c.arc(x + 32, y + 22, 7, Math.PI, 0); c.fill();
        lit(x + 25, y + 22, 14, 30, 0.15, warm);
      }
    }
    const t = new THREE.CanvasTexture(cv), te = new THREE.CanvasTexture(ev);
    for (const x of [t, te]) {
      x.colorSpace = THREE.SRGBColorSpace;
      x.wrapS = x.wrapT = THREE.RepeatWrapping;
      x.anisotropy = 8;
    }
    return { map: t, emissive: te, TW: 8 * BAY[kind], TH: 8 * BTYPES[kind].fh };
  },

  initMaterials() {
    const M = this.mats;
    const props = {
      house: { roughness: 0.9, metalness: 0 }, masonry: { roughness: 0.92, metalness: 0 }, panel: { roughness: 0.88, metalness: 0 },
      office: { roughness: 0.35, metalness: 0.25 }, tower: { roughness: 0.22, metalness: 0.4 }, belfry: { roughness: 0.95, metalness: 0 }
    };
    for (const k of Object.keys(BTYPES)) {
      const f = this.facadeTex(k);
      M[k] = f;
      f.mat = new THREE.MeshStandardMaterial(Object.assign({
        map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 0.8
      }, props[k]));
    }
    M.roofFlat = new THREE.MeshStandardMaterial({ color: 0x7a776f, roughness: 0.95 });
    M.roofDark = new THREE.MeshStandardMaterial({ color: 0x4a4c50, roughness: 0.8, metalness: 0.2 });
    M.copper = new THREE.MeshStandardMaterial({ color: 0x5f9c87, roughness: 0.45, metalness: 0.5 });
    M.gold = new THREE.MeshStandardMaterial({ color: 0xe0b44a, roughness: 0.25, metalness: 1 });
    M.steel = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.4, metalness: 0.8 });
    M.ac = new THREE.MeshStandardMaterial({ color: 0xb9bcbf, roughness: 0.6, metalness: 0.3 });
    M.brick = new THREE.MeshStandardMaterial({ color: 0x8e4a35, roughness: 0.9 });
    M.trunk = new THREE.MeshStandardMaterial({ color: 0x5b4130, roughness: 1 });
    M.leaf = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true });
    M.carBody = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.5 });
    M.carCab = new THREE.MeshStandardMaterial({ color: 0x1d252e, roughness: 0.15, metalness: 0.6 });
    M.carBase = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.8 });
    M.pole = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.5, metalness: 0.6 });
    M.lampHead = new THREE.MeshBasicMaterial({ color: 0xffffff });
  },

  /* ------------------------------------------------------------- budowa */
  build(scene) {
    if (!this.mats.house) this.initMaterials();
    this.clear(scene);
    this.group = new THREE.Group();
    this.group.name = 'city';
    scene.add(this.group);
    for (const spec of this.plan.buildings) this.buildings.push(new Building(spec, this.group));
    this.trees = new Trees(this.plan.trees, this.group);
    this.cars = new Cars(this.plan.parked, this.group);
    this.lamps = new Lamps(this.plan.lamps, this.group);
    this.power = 1;
    this.powerFlicker = 1;
    this.blackout = false;
    this.blackoutAt = -1;
    this.flickerT = 0;
    this.maxIeff = 1;
    this.applyLights();
  },

  clear(scene) {
    for (const b of this.buildings) b.dispose();
    this.buildings = [];
    this.pickables = [];
    if (this.group) {
      scene.remove(this.group);
      this.group.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
    }
    this.group = null;
  },

  setTOD(p) {
    this.windowsLevel = p.windows;
    this.lampsLevel = p.lamps;
    this.applyLights();
  },

  applyLights() {
    const pw = this.power * this.powerFlicker;
    for (const b of this.buildings) b.setWindows(this.windowsLevel * pw);
    if (this.lamps) this.lamps.level = this.lampsLevel * pw;
  },

  /* --------------------------------------------------------- aktualizacja */
  update(dt, time) {
    const quakeOn = Quake.events.length > 0;
    let maxI = 1;
    for (const b of this.buildings) {
      b.update(dt, time, quakeOn);
      if (b.Inow > maxI) maxI = b.Inow;
    }
    this.maxIeff = maxI;
    // zasilanie: migotanie i blackout
    if (quakeOn) {
      if (maxI >= 5.6 && !this.blackout) {
        this.flickerT -= dt;
        if (this.flickerT <= 0) {
          this.powerFlicker = Math.random() < 0.5 ? U.rand(0.05, 0.5) : 1;
          this.flickerT = U.rand(0.04, 0.25) * (maxI > 6.5 ? 0.6 : 1.4);
          if (maxI < 6.3 && Math.random() < 0.6) this.powerFlicker = 1;
        }
        if (maxI >= 6.9 && this.blackoutAt < 0) this.blackoutAt = time + U.rand(0.6, 1.8);
      } else this.powerFlicker = 1;
    } else this.powerFlicker = 1;
    if (this.blackoutAt > 0 && time >= this.blackoutAt && !this.blackout) {
      this.blackout = true;
      this.power = 0;
      FX.sparkBurstAtLamps(this.lamps, 6);
      if (UI.toast) UI.toast('⚡ Awaria sieci – miasto bez prądu');
    }
    this.applyLights();
    this.trees.update(dt, time, quakeOn);
    this.cars.update(dt, time, quakeOn);
    this.lamps.update(dt, time, quakeOn);
  },

  /* Najbliższy stojący budynek zawierający punkt (do odpychania pływających aut) */
  pushOut(x, z, rad) {
    for (const b of this.buildings) {
      if (b.collapsed) continue;
      const hx = b.fw / 2 + rad, hz = b.fd / 2 + rad;
      const dx = x - b.x, dz = z - b.z;
      if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
        const px = hx - Math.abs(dx), pz = hz - Math.abs(dz);
        if (px < pz) return { x: b.x + Math.sign(dx || 1) * hx, z };
        return { x, z: b.z + Math.sign(dz || 1) * hz };
      }
    }
    return null;
  },

  stats() {
    const st = { total: 0, ok: 0, light: 0, heavy: 0, collapsed: 0, byType: {} };
    for (const b of this.buildings) {
      st.total++;
      const k = b.collapsed ? 'collapsed' : b.state >= 2 ? 'heavy' : b.state >= 1 ? 'light' : 'ok';
      st[k]++;
      const t = st.byType[b.type] || (st.byType[b.type] = { total: 0, ok: 0, light: 0, heavy: 0, collapsed: 0 });
      t.total++;
      t[k]++;
    }
    st.treesDown = this.trees.fallenCount();
    st.lampsDown = this.lamps.fallenCount();
    st.carsMoved = this.cars.floatedCount();
    return st;
  }
};

/* ====================================================================== */
class Building {
  constructor(spec, parent) {
    const T = BTYPES[spec.type];
    this.spec = spec;
    this.type = spec.type;
    this.T = T;
    this.name = spec.name || T.name;
    this.x = spec.x;
    this.z = spec.z;
    this.yaw = spec.yaw;
    const sw = Math.abs(Math.sin(spec.yaw)) > 0.5;
    this.fw = sw ? spec.d : spec.w;
    this.fd = sw ? spec.w : spec.d;
    this.floors = spec.floors;
    const fh = spec.fh || T.fh;
    this.fh = fh;
    this.H = spec.floors * fh;
    this.root = new THREE.Group();
    this.root.position.set(spec.x, World.G0, spec.z);
    parent.add(this.root);
    this.qYaw = new THREE.Quaternion().setFromAxisAngle(UP, spec.yaw);

    // materiały własne budynku (do przyciemniania przy uszkodzeniach)
    const base = City.mats[spec.type];
    this.mat = base.mat.clone();
    if (spec.tint) this.mat.color.set(spec.tint);
    this.baseColor = this.mat.color.clone();
    this.roofMat = (spec.type === 'house' || spec.gable) ? new THREE.MeshStandardMaterial({ color: spec.roof || '#8a4733', roughness: 0.85 })
      : City.mats.roofFlat.clone();
    const mats = [this.mat, this.roofMat];
    const flatRoof = !(spec.type === 'house' || spec.gable || spec.type === 'belfry');

    // segmenty (grupy pięter)
    const maxSegs = { house: 2, masonry: 3, panel: 5, office: 5, tower: 8, belfry: 4 }[spec.type];
    const per = Math.max(1, Math.ceil(spec.floors / maxSegs));
    this.segs = [];
    const uOff = Math.floor(spec.seed * 8) * BAY[spec.type];
    const vOff = Math.floor((spec.seed * 97) % 8) * fh;
    let f = 0;
    while (f < spec.floors) {
      const n = Math.min(per, spec.floors - f);
      const h = n * fh;
      const isTop = f + n >= spec.floors;
      const geo = facadeBox(spec.w, h, spec.d, base.TW, base.TH, f * fh + vOff, uOff, isTop && flatRoof);
      const mesh = new THREE.Mesh(geo, isTop && flatRoof ? mats : this.mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.b = this;
      this.root.add(mesh);
      this.segs.push({ obj: mesh, h, w: spec.w, d: spec.d, bottom: f * fh, kind: 'body' });
      City.pickables.push(mesh);
      f += n;
    }
    const top = this.segs[this.segs.length - 1].obj;
    const topH = this.segs[this.segs.length - 1].h;
    this.chimneys = [];
    // dachy i detale
    if (spec.type === 'house' || spec.gable) {
      const rh = spec.gable ? 6 : U.lerp(2.4, 3.4, spec.seed);
      const geo = gableGeo(spec.w, spec.d, rh);
      const roof = new THREE.Mesh(geo, this.roofMat);
      roof.castShadow = true;
      roof.userData.b = this;
      this.root.add(roof);
      this.segs.push({ obj: roof, h: rh, w: spec.w + 0.7, d: spec.d + 0.9, bottom: this.H, kind: 'roof' });
      City.pickables.push(roof);
      if (!spec.gable) {
        const ch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), City.mats.brick);
        ch.castShadow = true;
        ch.position.set(spec.w * 0.25, rh * 0.3, spec.d * 0.15);
        roof.add(ch);
        this.chimneys.push({ obj: ch, half: new THREE.Vector3(0.4, 1.1, 0.4), I: 6.9 + U.rand(0, 1.2) });
      }
    } else if (spec.type === 'belfry') {
      const sh = 13;
      const sp = new THREE.Mesh(new THREE.ConeGeometry(spec.w * 0.62, sh, 4).rotateY(Math.PI / 4), City.mats.copper);
      sp.castShadow = true;
      sp.userData.b = this;
      this.root.add(sp);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), City.mats.gold);
      ball.position.y = sh / 2 + 0.3;
      sp.add(ball);
      this.segs.push({ obj: sp, h: sh, w: spec.w, d: spec.d, bottom: this.H, kind: 'roof' });
      City.pickables.push(sp);
    } else if (spec.type === 'tower') {
      // korona z tłumikiem masowym
      const ch = 9;
      const crown = new THREE.Group();
      const pil = new THREE.BoxGeometry(0.8, ch, 0.8);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const p = new THREE.Mesh(pil, City.mats.steel);
        p.position.set(sx * (spec.w / 2 - 0.6), 0, sz * (spec.d / 2 - 0.6));
        p.castShadow = true;
        crown.add(p);
      }
      const slab = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 0.8, 0.8, spec.d + 0.8), City.mats.roofDark);
      slab.position.y = ch / 2;
      slab.castShadow = true;
      crown.add(slab);
      const ring = new THREE.Mesh(new THREE.BoxGeometry(spec.w, 0.5, spec.d), City.mats.steel);
      ring.position.y = -ch / 2 + 0.25;
      crown.add(ring);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 14, 6), City.mats.steel);
      mast.position.y = ch / 2 + 7;
      crown.add(mast);
      const tmd = new THREE.Mesh(new THREE.SphereGeometry(3.3, 24, 16), City.mats.gold);
      tmd.castShadow = true;
      tmd.position.y = -0.5;
      crown.add(tmd);
      this.tmd = tmd;
      crown.userData.b = this;
      slab.userData.b = this;
      tmd.userData.b = this;
      this.root.add(crown);
      this.segs.push({ obj: crown, h: ch, w: spec.w, d: spec.d, bottom: this.H, kind: 'roof' });
      City.pickables.push(slab, tmd);
    } else {
      // dach płaski: klimatyzatory, kominy
      const n = spec.type === 'office' ? 2 : spec.type === 'panel' ? 1 : 0;
      for (let i = 0; i < n; i++) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(U.rand(1.5, 3), U.rand(1, 1.8), U.rand(1.5, 2.5)), City.mats.ac);
        ac.position.set(U.rand(-spec.w / 3, spec.w / 3), topH / 2 + 0.6, U.rand(-spec.d / 3, spec.d / 3));
        ac.castShadow = true;
        top.add(ac);
      }
      if (spec.type === 'masonry') {
        for (let i = 0; i < 1; i++) {
          const ch = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.4, 0.9), City.mats.brick);
          ch.castShadow = true;
          ch.position.set(U.rand(-spec.w / 3, spec.w / 3), topH / 2 + 1.2, U.rand(-spec.d / 3, spec.d / 3));
          top.add(ch);
          this.chimneys.push({ obj: ch, half: new THREE.Vector3(0.45, 1.2, 0.45), I: 6.8 + U.rand(0, 1.2) });
        }
      }
    }
    this.Htot = this.H + (this.segs[this.segs.length - 1].kind === 'roof' ? this.segs[this.segs.length - 1].h : 0);

    // dynamika: oscylator o jednym stopniu swobody
    const Tn = U.clamp(spec.type === 'house' ? 0.22 : 0.085 * spec.floors + 0.1, 0.22, 4.2);
    this.omega = 2 * Math.PI / Tn;
    this.zeta = T.zeta;
    this.ux = 0; this.uz = 0; this.vx = 0; this.vz = 0;
    this.umax = this.H * 0.016 + 0.05;

    // progi zniszczeń (losowe – każdy budynek jest trochę inny)
    const soilPen = 0;
    this.Idmg = T.Idmg + U.gauss() * 0.3 + soilPen;
    this.Iheavy = Math.max(this.Idmg + 0.4, T.Iheavy + U.gauss() * 0.35);
    this.Icol = Math.max(this.Iheavy + 0.3, T.Icol + U.gauss() * 0.4);
    this.Iglass = 5.2 + U.rand(0, 1.3) + (spec.type === 'tower' ? 0.8 : 0);
    this.colNeed = U.rand(0.4, 2.6) * (spec.type === 'tower' ? 1.6 : 1);
    this.tDmg = 0; this.tHeavy = 0; this.tCol = 0;
    this.state = 0;
    this.collapsed = false;
    this.mode = 'stand';
    this.leanX = 0; this.leanZ = 0; this.leanTX = 0; this.leanTZ = 0; this.leanBaseX = 0; this.leanBaseZ = 0;
    this.sink = 0;
    this.liq = null;
    this.Inow = 1;
    this.glassCount = 0;
    this.winLevel = 1;
    this.flooded = 0;
    this.lastCreak = 0;
  }

  dispose() {
    for (const s of this.segs) {
      s.obj.traverse(o => { if (o.geometry && o.geometry.type !== 'BoxGeometry') return; });
      if (s.obj.geometry) s.obj.geometry.dispose();
      if (s.obj.parent) s.obj.parent.remove(s.obj);
      if (s.body) FX.bodies.remove(s.body);
    }
    for (const c of this.chimneys) {
      if (c.body) FX.bodies.remove(c.body);
      if (c.obj.parent) c.obj.parent.remove(c.obj);
    }
    if (this.root.parent) this.root.parent.remove(this.root);
    if (this.pivot && this.pivot.parent) this.pivot.parent.remove(this.pivot);
    this.mat.dispose();
    this.roofMat.dispose();
  }

  setWindows(level) {
    const alive = this.collapsed ? 0 : this.state >= 2 ? 0.25 : 1;
    this.mat.emissiveIntensity = level * alive * this.winLevel * (this.flooded > 1.2 ? 0 : 1);
  }

  stateText() {
    if (this.collapsed) return { t: 'Zawalony', c: '#ff4b4b' };
    if (this.state >= 2) return { t: 'Poważnie uszkodzony', c: '#ff9330' };
    if (this.state >= 1) return { t: 'Lekko uszkodzony', c: '#ffd23f' };
    return { t: 'Bez uszkodzeń', c: '#6ee7a0' };
  }

  worldPos(out) { return out.set(this.x, World.G0 + this.H / 2, this.z); }

  /* -------------------------------------------------------------- update */
  update(dt, time, quakeOn) {
    if (this.mode === 'pancake') { this.followGround(); this.updatePancake(dt); return; }
    if (this.mode === 'topple') { this.updateTopple(dt); return; }
    if (this.mode === 'rubble') { this.followGround(); this.Inow = 1; return; }
    if (this.mode === 'broken') { this.Inow = 1; return; }

    const g = Quake.sample(this.x, this.z, _gs, quakeOn);
    this.Inow = quakeOn ? g.I : 1;
    // oscylator – wymuszenie przyspieszeniem gruntu
    if (quakeOn || Math.abs(this.ux) + Math.abs(this.uz) + Math.abs(this.vx) + Math.abs(this.vz) > 1e-4) {
      const steps = Math.max(1, Math.ceil(this.omega * dt / 0.25));
      const h = dt / steps, w = this.omega, w2 = w * w, z2 = 2 * this.zeta * w;
      const ax = quakeOn ? g.ax : 0, az = quakeOn ? g.az : 0;
      const gain = this.state >= 2 ? 1.5 : 1;
      for (let i = 0; i < steps; i++) {
        this.vx += (-ax * gain - z2 * this.vx - w2 * this.ux) * h;
        this.vz += (-az * gain - z2 * this.vz - w2 * this.uz) * h;
        this.ux += this.vx * h;
        this.uz += this.vz * h;
      }
    }
    // miękkie ograniczenie wychylenia (wizualnie)
    const um = this.umax * (this.state >= 2 ? 2 : 1);
    const mag = Math.hypot(this.ux, this.uz);
    let ox = this.ux, oz = this.uz;
    if (mag > 1e-6) {
      const k = um * Math.tanh(mag / um) / mag;
      ox *= k; oz *= k;
    }
    // trwałe przechylenie (uszkodzenia, upłynnienie gruntu)
    this.leanX += (this.leanTX - this.leanX) * Math.min(1, dt * 1.5);
    this.leanZ += (this.leanTZ - this.leanZ) * Math.min(1, dt * 1.5);
    if (this.liq) {
      const L = this.liq;
      if (quakeOn) L.k = Math.min(1, L.k + dt / L.time);
      this.sink = L.sink * L.k;
      this.leanTX = L.tx * L.k + this.leanBaseX;
      this.leanTZ = L.tz * L.k + this.leanBaseZ;
      if (quakeOn && Math.random() < dt * 2.5 * (1 - L.k)) FX.sandBoil(this.x + U.rand(-this.fw, this.fw), this.z + U.rand(-this.fd, this.fd));
    }
    // pozycja i nachylenie od fal powierzchniowych
    let tiltX = 0, tiltZ = 0;
    if (quakeOn) {
      const sxp = Quake.dyAt(Quake.distFromE(this.x + 3, this.z)) - Quake.dyAt(Quake.distFromE(this.x - 3, this.z));
      const szp = Quake.dyAt(Quake.distFromE(this.x, this.z + 3)) - Quake.dyAt(Quake.distFromE(this.x, this.z - 3));
      tiltZ = Math.atan(sxp / 6);
      tiltX = -Math.atan(szp / 6);
    }
    this.root.position.set(this.x + g.dx, World.G0 + g.dy - this.sink, this.z + g.dz);
    this.root.rotation.set(tiltX + this.leanX, 0, tiltZ + this.leanZ);

    // zginanie: przesunięcie i obrót każdego segmentu
    const H = this.H;
    for (const s of this.segs) {
      const hc = s.kind === 'roof' ? H + s.h / 2 : s.bottom + s.h / 2;
      const xi = Math.min(1, hc / H);
      const shape = 1.5 * xi * xi - 0.5 * xi * xi * xi;
      const slope = (3 * xi - 1.5 * xi * xi) / H;
      s.obj.position.set(ox * shape, hc, oz * shape);
      _e1.set(Math.atan(oz * slope), 0, -Math.atan(ox * slope));
      _q1.setFromEuler(_e1);
      s.obj.quaternion.copy(_q1).multiply(this.qYaw);
    }
    if (this.tmd) {
      // tłumik porusza się w przeciwfazie do wychylenia budynku
      _v1.set(-ox * 0.9, 0, -oz * 0.9).clampLength(0, 4.5);
      _q1.copy(this.qYaw).invert();
      _v1.applyQuaternion(_q1);
      this.tmd.position.set(_v1.x, -0.5 - _v1.length() * 0.12, _v1.z);
    }

    if (quakeOn) this.damage(dt, time, g.I, ox, oz);
    this.tsunamiCheck(dt);
  }

  damage(dt, time, I, ox, oz) {
    // szyby
    if (I >= this.Iglass && this.glassCount < 3 && Math.random() < dt * (1 + (I - this.Iglass) * 2)) {
      this.glassCount++;
      if (FX.fire.n < 2200) FX.glassBurst(this, Math.round(Math.min(14, 4 + (I - 5) * 2.5)));
      Sound.glass(Main.panFor(this.x, this.z), 0.7);
      if (this.winLevel > 0.5 && I > 6) this.winLevel = U.rand(0.3, 0.8);
    }
    // kominy
    for (const c of this.chimneys) {
      if (!c.body && I >= c.I && Math.random() < dt * 1.5) {
        c.body = FX.bodies.detach(c.obj, c.half, { vx: ox * 3, vy: 1.5, vz: oz * 3, spin: 3 });
      }
    }
    // trzeszczenie
    if (I > 6 && time - this.lastCreak > 2 && Math.random() < dt * 0.4) {
      this.lastCreak = time;
      Sound.creak(0.5);
    }
    // uszkodzenia
    if (I >= this.Idmg) this.tDmg += dt;
    if (I >= this.Iheavy) this.tHeavy += dt;
    if (I >= this.Icol) this.tCol += dt;
    if (this.state < 1 && this.tDmg > 0.25) {
      this.state = 1;
      this.mat.color.copy(this.baseColor).lerp(new THREE.Color(0x8d8578), 0.18);
      FX.facadeDust(this, 6);
      if (Main.liveDamage) Main.liveDamage(this);
    }
    if (this.state < 2 && this.tHeavy > 0.7) {
      this.state = 2;
      this.mat.color.copy(this.baseColor).lerp(new THREE.Color(0x6e675e), 0.38);
      this.roofMat.color.lerp(new THREE.Color(0x5a5550), 0.25);
      const a = Math.random() * Math.PI * 2, m = U.rand(0.015, 0.05);
      this.leanBaseX = Math.cos(a) * m;
      this.leanBaseZ = Math.sin(a) * m;
      this.leanTX = this.leanBaseX;
      this.leanTZ = this.leanBaseZ;
      FX.facadeDust(this, 16);
      FX.facadeChunks(this, 14);
      Sound.crash(0.15, Main.panFor(this.x, this.z), Main.distFactor(this.x, this.z));
      if (Main.liveDamage) Main.liveDamage(this);
    }
    if (this.state >= 1 && I > this.Idmg + 0.4 && Math.random() < dt * (I - this.Idmg) * 0.8) {
      FX.facadeChunks(this, 2);
    }
    if (this.tCol > this.colNeed) {
      this.collapse(ox, oz);
      return;
    }
    // upłynnienie gruntu
    if (Quake.lastParams && Quake.lastParams.soil === 'soft' && !this.liq && I >= 7.6 && Math.random() < dt * 0.25) {
      const p = U.smooth(7.4, 9.5, I);
      if (Math.random() < p) {
        const a = Math.random() * Math.PI * 2, m = U.rand(0.02, 0.12) * (this.H > 20 ? 1.2 : 0.7);
        this.liq = { sink: U.rand(0.3, 1.8) * (this.H > 20 ? 1.3 : 0.8), tx: Math.cos(a) * m, tz: Math.sin(a) * m, k: 0, time: U.rand(4, 9) };
      } else this.liq = { sink: 0, tx: 0, tz: 0, k: 1, time: 1 };
    }
  }

  /* Tsunami: napór wody (głębokość i siła przepływu h·v²) z symulacji wokół budynku. */
  tsunamiCheck(dt) {
    if (!Flood.active || this.collapsed) return;
    const L = Flood.buildingLoad(this);
    if (L.d <= 0.05) return;
    this.flooded = Math.max(this.flooded, L.d);
    if (L.f > 3 && Math.random() < dt * Math.min(8, L.f * 0.12)) FX.splash(L.x, L.z, World.G0 + L.d, L.fx, L.fz, Math.min(2.5, L.f / 40));
    const over = Math.max(L.d / this.fLimD, L.f / this.fLimF);
    if (over > 0.65 && this.state < 2) {
      this.state = 2;
      this.mat.color.copy(this.baseColor).lerp(new THREE.Color(0x6e675e), 0.38);
      FX.facadeChunks(this, 6);
      if (Main.liveDamage) Main.liveDamage(this);
    }
    this.fLoadT = over > 1 ? this.fLoadT + dt : Math.max(0, this.fLoadT - dt);
    if (this.fLoadT < 0.5) return;
    this.byWater = true;
    if (this.type === 'house') { this.washAway(); return; }
    this.tCol = 99;
    this.state = 2;
    const sp = Math.hypot(L.fx, L.fz) || 1;
    const tall = this.type === 'panel' || this.type === 'office' || this.type === 'tower' || this.type === 'belfry';
    this.collapse(L.fx / sp, L.fz / sp, tall ? 'topple' : 'pancake');
  }

  /* Lekki dom porwany przez wodę: rozpada się na pływające deski i płaty dachu. */
  washAway() {
    this.collapsed = true;
    this.washed = true;
    this.state = 3;
    this.mode = 'rubble';
    for (const s of this.segs) { s.obj.visible = false; const k = City.pickables.indexOf(s.obj); if (k >= 0) City.pickables.splice(k, 1); }
    for (const c of this.chimneys) c.obj.visible = false;
    Debris.houseDebris(this);
    _v1.set(this.x, World.G0 + 1, this.z);
    FX.impactDust(_v1, this.fw, this.fd, 0.3);
    Sound.crash(0.35, Main.panFor(this.x, this.z), Main.distFactor(this.x, this.z));
    if (Main.liveDamage) Main.liveDamage(this);
  }

  followGround() {
    if (Quake.events.length === 0) return;
    const g = Quake.sample(this.x, this.z, _gs, false);
    this.root.position.set(this.x + g.dx, World.G0 + g.dy - this.sink, this.z + g.dz);
  }

  /* -------------------------------------------------------------- zawalenie */
  collapse(ox, oz, force) {
    if (this.collapsed) return;
    this.collapsed = true;
    this.state = 3;
    this.mat.color.copy(this.baseColor).lerp(new THREE.Color(0x5e5850), 0.5);
    this.roofMat.color.lerp(new THREE.Color(0x4a4642), 0.4);
    this.mat.emissiveIntensity = 0;
    // kominy odpadają
    for (const c of this.chimneys) if (!c.body) c.body = FX.bodies.detach(c.obj, c.half, { vx: U.rand(-2, 2), vy: 2, vz: U.rand(-2, 2), spin: 4 });
    let mode = force;
    if (!mode) {
      const tall = this.H > 28;
      const pTop = this.type === 'tower' ? 0.75 : this.type === 'belfry' ? 0.8 : this.type === 'office' ? 0.45 : this.type === 'panel' ? 0.25 : 0;
      mode = (tall || this.type === 'belfry') && Math.random() < pTop ? 'topple' : 'pancake';
    }
    if (mode === 'topple') this.startTopple(ox, oz);
    else this.startPancake();
    const size = U.clamp(this.H * this.fw * this.fd / 9000, 0.25, 1);
    Sound.crash(size, Main.panFor(this.x, this.z), Main.distFactor(this.x, this.z));
    Main.shakeKick(size * 0.6 / Main.distFactor(this.x, this.z, true));
    FX.collapseDust(this, 1);
    FX.maybeFire(this);
    if (Main.liveDamage) Main.liveDamage(this);
  }

  startPancake() {
    this.mode = 'pancake';
    const n = this.segs.length;
    let f = 0;
    if (this.type !== 'house' && Math.random() < 0.5) f = U.randInt(0, Math.max(0, Math.floor((n - 1) * 0.5)));
    this.pk = { top: this.segs[f].bottom, list: [], impacts: 0 };
    for (let i = f; i < n; i++) {
      const s = this.segs[i];
      s.vy = -0.5;
      s.y = s.obj.position.y;
      s.landed = false;
      s.jx = s.obj.position.x;
      s.jz = s.obj.position.z;
      this.pk.list.push(s);
    }
    // pozostałe kondygnacje tracą pion
    for (let i = 0; i < f; i++) {
      const s = this.segs[i];
      s.obj.rotation.x += U.rand(-0.02, 0.02);
      s.obj.rotation.z += U.rand(-0.02, 0.02);
    }
    this.root.rotation.x *= 0.5;
    this.root.rotation.z *= 0.5;
  }

  updatePancake(dt) {
    const pk = this.pk;
    let top = pk.top;
    let allLanded = true;
    for (const s of pk.list) {
      if (s.landed) {
        if (s.sy > s.syT) {
          s.sy = Math.max(s.syT, s.sy - dt * 3.5);
          s.obj.scale.y = s.sy;
          s.obj.position.y = s.bottom + s.h * s.sy / 2;
        }
        top = s.bottom + s.h * s.syT;
        continue;
      }
      allLanded = false;
      s.vy -= 9.81 * dt;
      s.y += s.vy * dt;
      const bottom = s.y - s.h / 2;
      if (bottom <= top) {
        s.landed = true;
        s.bottom = top;
        s.syT = s.kind === 'roof' ? 0.6 : U.rand(0.18, 0.32);
        s.sy = 1;
        s.obj.position.y = top + s.h / 2;
        s.obj.position.x = s.jx + U.rand(-0.8, 0.8);
        s.obj.position.z = s.jz + U.rand(-0.8, 0.8);
        s.obj.rotation.x += U.rand(-0.07, 0.07);
        s.obj.rotation.z += U.rand(-0.07, 0.07);
        s.obj.rotation.y += U.rand(-0.06, 0.06);
        const speed = -s.vy;
        for (const o of pk.list) if (!o.landed) o.vy *= 0.5;
        pk.impacts++;
        _v1.set(this.x, World.G0 + top, this.z);
        FX.impactDust(_v1, this.fw, this.fd, U.clamp(speed / 12, 0.3, 1));
        FX.rubbleBurst(this, _v1, Math.round(4 + this.fw * this.fd / 40));
        if (pk.impacts % 2 === 1) Sound.crash(U.clamp(speed / 20, 0.15, 0.8), Main.panFor(this.x, this.z), Main.distFactor(this.x, this.z));
        top = s.bottom + s.h * s.syT;
      } else {
        s.obj.position.y = s.y;
      }
    }
    if (allLanded && pk.list.every(s => s.sy <= s.syT + 1e-3)) {
      this.mode = 'rubble';
      FX.rubblePile(this);
    }
  }

  startTopple(ox, oz) {
    this.mode = 'topple';
    let dx = ox, dz = oz;
    let l = Math.hypot(dx, dz);
    if (l < 1e-4) { const a = Math.random() * Math.PI * 2; dx = Math.cos(a); dz = Math.sin(a); l = 1; }
    dx /= l; dz /= l;
    const e = Math.abs(dx) * this.fw / 2 + Math.abs(dz) * this.fd / 2;
    const P = new THREE.Vector3(this.root.position.x + dx * e, this.root.position.y, this.root.position.z + dz * e);
    this.pivot = new THREE.Group();
    this.pivot.position.copy(P);
    this.root.parent.add(this.pivot);
    this.pivot.updateMatrixWorld(true);
    this.pivot.attach(this.root);
    this.tp = { axis: new THREE.Vector3(dz, 0, -dx).normalize(), th: 0.0, w: 0.06, br: U.rand(0.45, 0.85), P, dx, dz };
  }

  updateTopple(dt) {
    const tp = this.tp;
    const Hc = this.Htot * 0.5;
    const alpha = (3 * 9.81 / (2 * this.Htot)) * Math.sin(tp.th + 0.04) * 0.95;
    tp.w += alpha * dt;
    tp.th += tp.w * dt;
    this.pivot.quaternion.setFromAxisAngle(tp.axis, tp.th);
    if (Math.random() < dt * 8) {
      _v1.set(tp.P.x, tp.P.y, tp.P.z);
      FX.impactDust(_v1, this.fw * 0.6, this.fd * 0.6, 0.4);
    }
    if (tp.th > tp.br) {
      // rozpad na swobodne bryły
      this.pivot.updateMatrixWorld(true);
      const scene = this.pivot.parent;
      for (const s of this.segs) {
        const o = s.obj;
        o.getWorldPosition(_v1);
        _v2.copy(_v1).sub(tp.P);
        const vel = new THREE.Vector3().crossVectors(tp.axis, _v2).multiplyScalar(tp.w);
        const half = new THREE.Vector3(s.w / 2, s.h / 2, s.d / 2);
        scene.attach(o);
        s.body = FX.bodies.add(o, half, vel, tp.axis.clone().multiplyScalar(tp.w + U.rand(-0.3, 0.3)), { kind: 'seg', owner: this });
        s.body.v.x += U.rand(-1, 1);
        s.body.v.z += U.rand(-1, 1);
      }
      this.mode = 'broken';
      this.pivot.parent.remove(this.pivot);
      Sound.crash(0.8, Main.panFor(this.x, this.z), Main.distFactor(this.x, this.z));
    }
    void Hc;
  }
}

/* ====================================================================== */
class Trees {
  constructor(list, parent) {
    const n = list.length;
    this.n = n;
    this.list = list.map(t => {
      const h = (t.kind === 'con' ? 2.6 : 2.4) * t.s + Math.random() * 0.6;
      return {
        x: t.x, z: t.z, kind: t.kind, h, cr: (t.kind === 'con' ? 2.0 : 2.4) * t.s,
        y0: World.baseHeight(t.x, t.z), ux: 0, uz: 0, vx: 0, vz: 0,
        fall: 0, fallW: 0, fallA: 0, Ifall: World.baseHeight(t.x, t.z) > 3 ? 99 : 9.9 + Math.random() * 1.8, tf: 0, rot: Math.random() * 6.28,
        hill: World.baseHeight(t.x, t.z) > 3
      };
    });
    const trunkG = new THREE.CylinderGeometry(0.18, 0.3, 1, 6).translate(0, 0.5, 0);
    const decG = new THREE.IcosahedronGeometry(1, 0);
    const conG = new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0);
    this.trunk = new THREE.InstancedMesh(trunkG, City.mats.trunk, n);
    this.dec = new THREE.InstancedMesh(decG, City.mats.leaf, n);
    this.con = new THREE.InstancedMesh(conG, City.mats.leaf, n);
    for (const m of [this.trunk, this.dec, this.con]) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      parent.add(m);
    }
    const c = new THREE.Color();
    let di = 0, ci = 0;
    for (const t of this.list) {
      if (t.kind === 'dec') {
        t.ci = di++;
        c.setHSL(0.24 + Math.random() * 0.08, 0.45 + Math.random() * 0.2, 0.26 + Math.random() * 0.1);
        this.dec.setColorAt(t.ci, c);
      } else {
        t.ci = ci++;
        c.setHSL(0.3 + Math.random() * 0.06, 0.4 + Math.random() * 0.15, 0.17 + Math.random() * 0.07);
        this.con.setColorAt(t.ci, c);
      }
    }
    this.dec.count = di;
    this.con.count = ci;
    this.dirty = true;
    this.update(0, 0, false);
  }
  fallenCount() { return this.list.filter(t => t.fall > 0.5).length; }
  update(dt, time, quakeOn) {
    const fl = Flood.active;
    if (!quakeOn && !this.dirty && !fl && !this.moving) return;
    this.dirty = false;
    let moving = false;
    const w = 2 * Math.PI * 0.9, w2 = w * w, z2 = 2 * 0.09 * w;
    const phase = Math.floor(time * 60) & 3;
    for (let j = 0; j < this.list.length; j++) {
      const t = this.list[j];
      let dx = 0, dy = 0, dz = 0, ax = 0, az = 0, I = 1;
      if (quakeOn) {
        const g = Quake.sample(t.x, t.z, _gs, (j & 3) === phase);
        dx = g.dx; dy = g.dy; dz = g.dz; ax = g.ax; az = g.az;
        if (g.I > 1) t.lastI = g.I;
        I = t.lastI || 1;
      }
      if (dt > 0) {
        const h = dt / 2;
        for (let k = 0; k < 2; k++) {
          t.vx += (-ax / (t.h * 3) - z2 * t.vx - w2 * t.ux) * h;
          t.vz += (-az / (t.h * 3) - z2 * t.vz - w2 * t.uz) * h;
          t.ux += t.vx * h; t.uz += t.vz * h;
        }
        const m = Math.hypot(t.ux, t.uz);
        if (m > 0.35) { t.ux *= 0.35 / m; t.uz *= 0.35 / m; }
        if (m > 1e-3 || Math.abs(t.vx) + Math.abs(t.vz) > 1e-3) moving = true;
        if (quakeOn && I >= t.Ifall && t.fall === 0) {
          t.tf += dt;
          if (t.tf > 1) {
            t.fall = 0.02; t.fallA = Math.atan2(t.uz || Math.random() - 0.5, t.ux || Math.random() - 0.5);
          }
        }
        // tsunami: woda łamie drzewo, a potem niesie je jak kłodę
        if (fl && !t.hill) {
          const d = Flood.depthAt(t.x, t.z);
          if (d > 0.2) {
            Flood.velAt(t.x, t.z, _fl);
            const f = d * (_fl.u * _fl.u + _fl.w * _fl.w);
            if (t.fall === 0 && (d > 2.8 || f > 7 * t.s)) { t.fall = 0.02; t.fallA = Math.atan2(_fl.w, _fl.u); t.drift = true; }
            if (t.drift && t.fall > 1 && d > 0.6) {
              t.x += _fl.u * Flood.SPEED * 0.85 * dt;
              t.z += _fl.w * Flood.SPEED * 0.85 * dt;
              const po = City.pushOut(t.x, t.z, 1);
              if (po) { t.x = po.x; t.z = po.z; }
              const e = Flood.etaAt(t.x, t.z);
              if (e !== null) t.y0 += (e - 0.5 - t.y0) * Math.min(1, dt * 3);
              t.fallA += (Math.random() - 0.5) * dt * 0.8;
              moving = true;
            } else if (t.drift) t.y0 += (World.baseHeight(t.x, t.z) - t.y0) * Math.min(1, dt * 2);
          }
        }
        if (t.fall > 0 && t.fall < Math.PI / 2 - 0.05) {
          t.fallW += 4.5 * Math.sin(t.fall + 0.05) * dt;
          t.fall = Math.min(Math.PI / 2 - 0.05, t.fall + t.fallW * dt);
          moving = true;
          if (t.fall >= Math.PI / 2 - 0.06) FX.impactDust(_v1.set(t.x + Math.cos(t.fallA) * t.h, t.y0 + 0.5, t.z + Math.sin(t.fallA) * t.h), 3, 3, 0.25);
        }
      }
      // macierze instancji
      const ca = Math.cos(t.fallA), sa = Math.sin(t.fallA);
      _e1.set(t.uz + t.fall * sa, t.rot, -t.ux - t.fall * ca, 'XYZ');
      _q1.setFromEuler(_e1);
      _v1.set(t.x + dx, t.y0 + dy - 0.1, t.z + dz);
      _s1.set(1.0 + t.h * 0.05, t.h, 1.0 + t.h * 0.05);
      _m1.compose(_v1, _q1, _s1);
      this.trunk.setMatrixAt(j, _m1);
      _v2.set(0, t.h + (t.kind === 'dec' ? t.cr * 0.55 : -t.cr * 0.3), 0).applyQuaternion(_q1).add(_v1);
      if (t.kind === 'dec') _s1.set(t.cr, t.cr * 0.9, t.cr);
      else _s1.set(t.cr * 0.75, t.cr * 2.6, t.cr * 0.75);
      _m1.compose(_v2, _q1, _s1);
      (t.kind === 'dec' ? this.dec : this.con).setMatrixAt(t.ci, _m1);
    }
    this.moving = moving;
    this.trunk.instanceMatrix.needsUpdate = true;
    this.dec.instanceMatrix.needsUpdate = true;
    this.con.instanceMatrix.needsUpdate = true;
  }
}

/* ====================================================================== */
class Cars {
  constructor(parked, parent) {
    const RX = World.ROADS_X, RZ = World.ROADS_Z;
    this.list = [];
    const palette = ['#c8102e', '#f2f2f2', '#1b1b1b', '#2b5fa8', '#9aa1a8', '#e8b900', '#3c7d4a', '#7b2d8b', '#e46a1c', '#5a6b7c', '#dcd7cc'];
    const add = (o) => {
      o.col = new THREE.Color(U.pick(palette));
      o.y = World.G0; o.vy = 0; o.roll = 0; o.pitch = 0; o.vr = 0; o.vp = 0; o.alarm = 0; o.float = false; o.moved = false; o.spin = 0;
      o.len = U.rand(4.0, 4.7); o.wid = U.rand(1.75, 1.95);
      this.list.push(o);
    };
    for (const p of parked) add({ x: p.x, z: p.z, yaw: p.yaw, speed: 0, drive: false });
    // jadące auta
    for (let i = 0; i < 24; i++) {
      const horiz = Math.random() < 0.5;
      const ai = U.randInt(0, RX.length - 1), aj = U.randInt(0, RZ.length - 1);
      let bi = ai, bj = aj;
      if (horiz) bi = ai < RX.length - 1 ? ai + 1 : ai - 1; else bj = aj < RZ.length - 1 ? aj + 1 : aj - 1;
      const c = { drive: true, ai, aj, bi, bj, t: Math.random(), speed: U.rand(8, 12), vmax: U.rand(8, 12.5), x: 0, z: 0, yaw: 0 };
      add(c);
      this.placeDriving(c, 0);
    }
    const n = this.list.length;
    this.n = n;
    const bodyG = new THREE.BoxGeometry(1, 1, 1);
    this.body = new THREE.InstancedMesh(bodyG, City.mats.carBody, n);
    this.cab = new THREE.InstancedMesh(bodyG, City.mats.carCab, n);
    this.base = new THREE.InstancedMesh(bodyG, City.mats.carBase, n);
    for (const m of [this.body, this.cab, this.base]) {
      m.castShadow = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      parent.add(m);
    }
    this.list.forEach((c, i) => this.body.setColorAt(i, c.col));
    this.update(0, 0, false, true);
  }
  floatedCount() { return this.list.filter(c => c.moved).length; }
  placeDriving(c, dt) {
    const RX = World.ROADS_X, RZ = World.ROADS_Z;
    const ax = RX[c.ai], az = RZ[c.aj], bx = RX[c.bi], bz = RZ[c.bj];
    const L = Math.hypot(bx - ax, bz - az);
    c.t += c.speed * dt / L;
    if (c.t >= 1) {
      // skrzyżowanie: wybór kolejnego odcinka
      const opts = [];
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = c.bi + di, nj = c.bj + dj;
        if (ni < 0 || nj < 0 || ni >= RX.length || nj >= RZ.length) continue;
        if (ni === c.ai && nj === c.aj) continue;
        opts.push([ni, nj]);
      }
      if (opts.length === 0) opts.push([c.ai, c.aj]);
      const nx = U.pick(opts);
      c.ai = c.bi; c.aj = c.bj; c.bi = nx[0]; c.bj = nx[1];
      c.t = 0;
      return this.placeDriving(c, 0);
    }
    const dx = (bx - ax) / L, dz = (bz - az) / L;
    const t = U.clamp(c.t, 0, 1);
    c.x = ax + (bx - ax) * t - dz * 1.9;
    c.z = az + (bz - az) * t + dx * 1.9;
    const yaw = Math.atan2(-dz, dx);
    let d = yaw - c.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    c.yaw += d * (dt > 0 ? Math.min(1, dt * 8) : 1);
  }
  update(dt, time, quakeOn, force) {
    const fl = Flood.active;
    for (let i = 0; i < this.list.length; i++) {
      const c = this.list[i];
      let g = null;
      if (quakeOn) {
        g = Quake.sample(c.x, c.z, _gs, (i & 3) === (Math.floor(time * 60) & 3));
        if (g.I > 1) c.lastI = g.I;
      }
      const I = quakeOn ? (c.lastI || 1) : 1;
      // kierowcy zatrzymują się przy silniejszych drganiach
      if (c.drive) {
        if (I >= 4.7 || City.maxIeff >= 5.2) c.stopping = true;
        if (c.stopping) c.speed = Math.max(0, c.speed - 7 * dt);
        if (c.speed > 0 && !c.float) this.placeDriving(c, dt);
      }
      // alarm samochodowy
      if (quakeOn && I >= 4.6 && c.alarm <= 0 && Math.random() < dt * 0.5) c.alarm = U.rand(12, 25);
      if (c.alarm > 0) c.alarm -= dt;
      // tsunami: auto unosi się i płynie z nurtem, obija się o budynki
      let gy = World.G0;
      if (fl) {
        const depth = Flood.depthAt(c.x, c.z);
        if (depth > 0.7 && !c.float) { c.float = true; c.moved = true; c.drive = false; c.spin = U.rand(-0.6, 0.6); c.vx = 0; c.vz = 0; }
        if (c.float) {
          if (depth > 0.5) {
            Flood.drift(c.x, c.z, _fl);
            const k = Math.min(1, dt * 1.3);
            c.vx += (_fl.u - c.vx) * k;
            c.vz += (_fl.w - c.vz) * k;
            let nx = c.x + c.vx * dt, nz = c.z + c.vz * dt;
            if (Flood.solidAt(nx + Math.sign(c.vx) * 2, c.z)) { nx = c.x; c.vx *= -0.3; c.spin += U.rand(-1, 1); }
            if (Flood.solidAt(c.x, nz + Math.sign(c.vz) * 2)) { nz = c.z; c.vz *= -0.3; c.spin += U.rand(-1, 1); }
            c.x = U.clamp(nx, Flood.X0 + 4, Flood.X1 - 4);
            c.z = U.clamp(nz, Flood.Z0 + 4, Flood.Z1 - 4);
            c.yaw += c.spin * dt;
            c.spin *= Math.exp(-dt * 0.5);
            const eta = Flood.etaAt(c.x, c.z);
            gy = (eta === null ? World.baseHeight(c.x, c.z) + depth : eta) - 0.85;
            c.roll = Math.sin(time * 1.3 + i) * 0.15;
            c.pitch = Math.sin(time * 1.1 + i * 2) * 0.12;
          } else {
            gy = World.baseHeight(c.x, c.z);
            c.vx = 0; c.vz = 0;
          }
        }
      }
      if (!c.float) gy = World.baseHeight(c.x, c.z);
      // ruch pionowy z gruntem (i podskoki przy ekstremalnych drganiach)
      if (g) {
        const tgt = gy + g.dy;
        if (I >= 10.2 && c.y <= tgt + 0.02 && Math.random() < dt * (I - 10) * 1.3) c.vy = U.rand(1.5, 2.5) * (I - 9.8);
        c.vy -= 9.81 * dt;
        c.y += c.vy * dt;
        if (c.y <= tgt) { if (c.vy < -3) { c.vr += U.rand(-1, 1); c.vp += U.rand(-1, 1); } c.y = tgt; c.vy = 0; }
        // kołysanie nadwozia
        const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
        const aLong = g.ax * cy - g.az * sy, aLat = -g.ax * sy - g.az * cy;
        c.vr += (-aLat * 0.02 - 2 * 0.25 * 9 * c.vr - 81 * c.roll) * dt;
        c.vp += (aLong * 0.012 - 2 * 0.25 * 9 * c.vp - 81 * c.pitch) * dt;
        c.roll = U.clamp(c.roll + c.vr * dt, -0.25, 0.25);
        c.pitch = U.clamp(c.pitch + c.vp * dt, -0.2, 0.2);
        c.gx = g.dx; c.gz = g.dz;
      } else {
        if (!c.float || !fl) {
          c.vy -= 9.81 * dt;
          c.y += c.vy * dt;
          if (c.y <= gy) { c.y = gy; c.vy = 0; }
          if (!c.float) { c.roll *= 0.9; c.pitch *= 0.9; }
        } else c.y = gy;
        c.gx = 0; c.gz = 0;
      }
      if (dt === 0 || force) c.y = Math.max(c.y, gy);
      // macierze
      _e1.set(c.roll, c.yaw, c.pitch, 'YXZ');
      _q1.setFromEuler(_e1);
      _v1.set(c.x + (c.gx || 0), c.y, c.z + (c.gz || 0));
      _v2.set(0, 0.55, 0).applyQuaternion(_q1).add(_v1);
      _s1.set(c.len * 0.96, 0.42, c.wid * 0.95);
      _m1.compose(_v2, _q1, _s1);
      this.base.setMatrixAt(i, _m1);
      _v2.set(0, 1.0, 0).applyQuaternion(_q1).add(_v1);
      _s1.set(c.len, 0.62, c.wid);
      _m1.compose(_v2, _q1, _s1);
      this.body.setMatrixAt(i, _m1);
      _v2.set(-0.25, 1.62, 0).applyQuaternion(_q1).add(_v1);
      _s1.set(c.len * 0.52, 0.62, c.wid * 0.9);
      _m1.compose(_v2, _q1, _s1);
      this.cab.setMatrixAt(i, _m1);
      c.qx = _q1.x; c.qy = _q1.y; c.qz = _q1.z; c.qw = _q1.w;
      c.px = _v1.x; c.py = _v1.y; c.pz = _v1.z;
    }
    this.body.instanceMatrix.needsUpdate = true;
    this.cab.instanceMatrix.needsUpdate = true;
    this.base.instanceMatrix.needsUpdate = true;
  }
  /* Światła aut (reflektory, tylne, migacze alarmu) – do warstwy poświaty */
  glows(out, time, lampsLevel) {
    const q = _q2;
    for (const c of this.list) {
      if (c.float && c.alarm <= 0) continue;
      q.set(c.qx, c.qy, c.qz, c.qw);
      const blink = c.alarm > 0 && (Math.floor(time * 2.6) % 2 === 0);
      const front = c.drive && c.speed > -1 && lampsLevel > 0.1;
      for (const sx of [1, -1]) for (const sz of [-1, 1]) {
        if (!blink && !(front)) continue;
        _v1.set(sx * c.len * 0.5, 1.0, sz * c.wid * 0.36).applyQuaternion(q);
        const x = c.px + _v1.x, y = c.py + _v1.y, z = c.pz + _v1.z;
        if (blink) out.push(x, y, z, 1.0, 0.55, 0.1, 2.2);
        else if (sx > 0) out.push(x, y, z, 1.0, 0.95, 0.8, 2.6 * lampsLevel);
        else out.push(x, y, z, 0.9, 0.08, 0.05, 1.6 * lampsLevel);
      }
    }
  }
}

/* ====================================================================== */
class Lamps {
  constructor(list, parent) {
    this.list = list.map(l => ({
      x: l.x, z: l.z, yaw: l.yaw, y0: World.baseHeight(l.x, l.z), ux: 0, uz: 0, vx: 0, vz: 0,
      fall: 0, fallW: 0, fallA: 0, Ifall: 8.8 + Math.random() * 1.6, tf: 0, off: false
    }));
    const n = this.list.length;
    const poleG = new THREE.BoxGeometry(0.18, 1, 0.18).translate(0, 0.5, 0);
    const headG = new THREE.BoxGeometry(1.3, 0.22, 0.45);
    this.pole = new THREE.InstancedMesh(poleG, City.mats.pole, n);
    this.head = new THREE.InstancedMesh(headG, City.mats.lampHead, n);
    for (const m of [this.pole, this.head]) {
      m.castShadow = true;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      parent.add(m);
    }
    this.level = 1;
    this.lastLevel = -1;
    this.dirty = true;
    this.H = 6.8;
    this.head.setColorAt(0, new THREE.Color(1, 1, 1));
    this.head.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.update(0, 0, false);
  }
  fallenCount() { return this.list.filter(l => l.fall > 0.3).length; }
  update(dt, time, quakeOn) {
    const fl = Flood.active;
    const levelChanged = Math.abs(this.level - this.lastLevel) > 0.01;
    if (!quakeOn && !this.dirty && !levelChanged && !fl && !this.moving) return;
    this.dirty = false;
    const c = new THREE.Color();
    let moving = false;
    const w = 2 * Math.PI * 1.4, w2 = w * w, z2 = 2 * 0.05 * w;
    this.list.forEach((l, i) => {
      let dx = 0, dy = 0, dz = 0, ax = 0, az = 0;
      if (quakeOn) {
        const g = Quake.sample(l.x, l.z, _gs, (i & 3) === (Math.floor(time * 60) & 3));
        dx = g.dx; dy = g.dy; dz = g.dz; ax = g.ax; az = g.az;
        if (g.I > 1) l.lastI = g.I;
      }
      if (dt > 0) {
        l.vx += (-ax / 20 - z2 * l.vx - w2 * l.ux) * dt;
        l.vz += (-az / 20 - z2 * l.vz - w2 * l.uz) * dt;
        l.ux = U.clamp(l.ux + l.vx * dt, -0.3, 0.3);
        l.uz = U.clamp(l.uz + l.vz * dt, -0.3, 0.3);
        if (Math.abs(l.ux) + Math.abs(l.uz) + Math.abs(l.vx) > 1e-3) moving = true;
        if (quakeOn && (l.lastI || 1) >= l.Ifall && l.fall === 0) {
          l.tf += dt;
          if (l.tf > 0.6) {
            l.fall = 0.03; l.fallA = Math.random() * Math.PI * 2; l.off = true;
            FX.sparks(_v1.set(l.x, l.y0 + this.H, l.z), 25);
          }
        }
        if (fl) {
          const d = Flood.depthAt(l.x, l.z);
          if (d > 0.6) l.off = true;
          if (l.fall === 0 && d > 0.3) {
            Flood.velAt(l.x, l.z, _fl);
            if (d > 3.4 || d * (_fl.u * _fl.u + _fl.w * _fl.w) > 14) { l.fall = 0.03; l.fallA = Math.atan2(_fl.w, _fl.u); }
          }
        }
        if (l.fall > 0 && l.fall < Math.PI / 2 - 0.02) {
          l.fallW += 5 * Math.sin(l.fall + 0.05) * dt;
          l.fall = Math.min(Math.PI / 2 - 0.02, l.fall + l.fallW * dt);
          moving = true;
        }
      }
      const ca = Math.cos(l.fallA), sa = Math.sin(l.fallA);
      _e1.set(l.uz + l.fall * sa, 0, -l.ux - l.fall * ca, 'XYZ');
      _q1.setFromEuler(_e1);
      _v1.set(l.x + dx, l.y0 + dy, l.z + dz);
      _s1.set(1, this.H, 1);
      _m1.compose(_v1, _q1, _s1);
      this.pole.setMatrixAt(i, _m1);
      _q2.setFromAxisAngle(UP, l.yaw);
      _q2.premultiply(_q1);
      _v2.set(0.55, this.H, 0).applyQuaternion(_q2).add(_v1);
      _s1.set(1, 1, 1);
      _m1.compose(_v2, _q2, _s1);
      this.head.setMatrixAt(i, _m1);
      l.hx = _v2.x; l.hy = _v2.y - 0.25; l.hz = _v2.z;
      const on = !l.off && this.level > 0.02;
      if (on) c.setRGB(1.0 * Math.min(1.4, 0.4 + this.level), 0.82 * Math.min(1.4, 0.4 + this.level), 0.55 * Math.min(1.4, 0.4 + this.level));
      else c.setRGB(0.22, 0.22, 0.2);
      this.head.setColorAt(i, c);
    });
    this.lastLevel = this.level;
    this.moving = moving;
    this.pole.instanceMatrix.needsUpdate = true;
    this.head.instanceMatrix.needsUpdate = true;
    if (this.head.instanceColor) this.head.instanceColor.needsUpdate = true;
  }
  glows(out) {
    if (this.level < 0.05) return;
    for (const l of this.list) {
      if (l.off || l.hx === undefined) continue;
      out.push(l.hx, l.hy, l.hz, 1.0, 0.78, 0.45, 5.5 * Math.min(1.3, this.level));
    }
  }
}
