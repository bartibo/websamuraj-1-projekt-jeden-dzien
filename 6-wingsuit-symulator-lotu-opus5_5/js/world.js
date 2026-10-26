/* Na Krawędzi – model świata: wysokość terenu, trasa, bramki, most, łuk, lądowisko, drzewa.
   Czysta matematyka (bez Three.js), żeby dało się ją testować poza przeglądarką. */
(function (root) {
  'use strict';
  const WS = root.WS = root.WS || {};
  const { clamp, lerp, smoothstep, Simplex, makeCurve, hash2 } = WS.U;

  class World {
    constructor(loc) {
      this.L = loc;
      this.n = new Simplex(loc.seed);
      this.n2 = new Simplex(loc.seed * 7 + 13);
      this.baseFloor = loc.floor ? makeCurve(loc.floor) : null;
      this.clearCurve = loc.clear ? makeCurve(loc.clear) : null;
      this.wallCurve = loc.wallH ? makeCurve(loc.wallH) : null;
      const P = loc.path;
      this.P = P;
      this.px0 = P.a1 * Math.sin(P.p1) + P.a2 * Math.sin(P.p2);
      this.water = loc.water == null ? -1e9 : loc.water;
      this.hasWater = loc.water != null;
      this.cliffEnd = loc.cliffs.reduce((m, c) => Math.max(m, c.s + c.len), 0);

      // Lądowisko
      const ls = loc.sLand + (loc.landOff || 220);
      this.land = { s: ls, x: this.px(ls), z: ls, r: 70 };
      this.land.y = this.floorRaw(ls);
      // Punkt wyskoku: półka tuż przed krawędzią
      this.exit = { x: this.px(-1.5), z: -1.5, y: loc.exitH };
      this.exitDir = this.tangent(0);

      this._buildSpecials();
      this._buildGates();
    }

    px(z) { const P = this.P; return P.a1 * Math.sin(z * P.f1 + P.p1) + P.a2 * Math.sin(z * P.f2 + P.p2) - this.px0; }
    dpx(z) { const P = this.P; return P.a1 * P.f1 * Math.cos(z * P.f1 + P.p1) + P.a2 * P.f2 * Math.cos(z * P.f2 + P.p2); }
    tangent(z) { const d = this.dpx(z), l = Math.hypot(d, 1); return { x: d / l, z: 1 / l }; }

    // Dno doliny bez drobnych nierówności
    floorRaw(s) {
      const L = this.L;
      if (this.clearCurve) {
        // dno liczone jako „zapas” pod lotem wzorcowym (bez sterowania) – trasa zawsze jest do przelecenia
        if (s <= 0) return L.exitH;
        const sl = L.sLand;
        const sc = Math.min(s, sl);
        let T = L.exitH - LOSS(sc) - this.clearCurve(sc);
        const cl = L.cliffs;
        for (let i = 1; i < cl.length; i++) {
          const c = cl[i];
          if (sc > c.s) T -= c.drop * Math.sin(Math.min(1, (sc - c.s) / c.len) * Math.PI / 2);
        }
        const c0 = cl[0];
        if (s < c0.len) T = L.exitH - (L.exitH - T) * Math.sin(s / c0.len * Math.PI / 2);
        if (s > sl + L.landLen) T += (s - sl - L.landLen) * 0.28;
        return T;
      }
      let h = this.baseFloor(s);
      const cl = this.L.cliffs;
      for (let i = 0; i < cl.length; i++) {
        const c = cl[i];
        if (s > c.s) {
          const t = Math.min(1, (s - c.s) / c.len);
          h -= c.drop * Math.sin(t * Math.PI / 2);
        }
      }
      return h;
    }
    floor(s) {
      let h = this.floorRaw(s);
      if (s > this.cliffEnd + 60) {
        const landMask = smoothstep(this.L.sLand - 250, this.L.sLand, s) * (1 - smoothstep(this.L.sLand + this.L.landLen - 200, this.L.sLand + this.L.landLen, s));
        h += this.n.noise(s / 900, 3.3) * 14 * (1 - landMask) * smoothstep(this.cliffEnd + 60, this.cliffEnd + 400, s);
      }
      return h;
    }
    width(s) {
      const L = this.L, W = L.width;
      let w;
      if (s < 0) w = 55 + Math.min(400, -s * 0.4);
      else {
        w = W.base * (1 + W.vary * Math.sin(s * W.freq + 1.3));
        w = lerp(55, w, smoothstep(0, this.cliffEnd + 150, s));
      }
      for (const nr of L.narrows) {
        const t = smoothstep(nr.s0 - 220, nr.s0, s) * (1 - smoothstep(nr.s1, nr.s1 + 220, s));
        w = lerp(w, nr.w, t);
      }
      const lt = smoothstep(L.sLand - 300, L.sLand + 100, s) * (1 - smoothstep(L.sLand + L.landLen - 300, L.sLand + L.landLen, s));
      return lerp(w, Math.max(w, 260), lt);
    }
    wallK(s) {
      const L = this.L;
      let k = L.wallK;
      for (const nr of L.narrows) {
        const t = smoothstep(nr.s0 - 220, nr.s0, s) * (1 - smoothstep(nr.s1, nr.s1 + 220, s));
        k = lerp(k, nr.k, t);
      }
      if (s > -10 && s < this.cliffEnd + 200) k = Math.min(k, lerp(70, k, smoothstep(0, this.cliffEnd + 200, s)));
      return k;
    }
    wallH(s, fl) {
      if (this.L.flatTop != null) return Math.max(40, this.L.flatTop - fl);
      return this.wallCurve(s);
    }

    // Wysokość terenu. lod 0 = pełny detal, 1 = zgrubnie (cienie, daleki teren)
    height(x, z, lod) {
      const L = this.L, n = this.n;
      const s = z;
      const dp = this.dpx(z);
      const d = (x - this.px(z)) / Math.sqrt(1 + dp * dp);
      const ad = Math.abs(d);
      const fl = this.floor(s);
      const w = this.width(s);
      const k = this.wallK(s);
      const u = Math.max(0, ad - w);
      let h = fl;

      // Nierówności dna (i lekkie koryto potoku)
      if (!lod) h += n.noise(x / 70, z / 70) * 2.4 + n.noise(x / 21, z / 21) * 0.7;
      h += n2bump(this, x, z, ad, w);

      // Ściany doliny
      const W = this.wallH(s, fl);
      let prof = 1 - Math.exp(-u / k);
      prof = Math.pow(prof, 0.85);
      const mod = 0.8 + 0.35 * n.noise(x / 900 + 7.7, z / 900);
      h += W * prof * mod;
      // Granie i szczyty
      const rm = smoothstep(0, 420, u);
      if (rm > 0) h += n.ridged(x / 1500 + 3.1, z / 1500 - 1.7, lod ? 3 : 5) * L.ridgeAmp * rm;
      // Chropowatość skały
      if (!lod) h += smoothstep(0, 18, u) * n.fbm(x / 42, z / 42, 2) * 6;
      else h += smoothstep(0, 18, u) * n.noise(x / 42, z / 42) * 4;

      // Tarasy skalne (kanion)
      if (L.terrace) {
        const hw = h - fl;
        const step = 30 + 8 * n.noise(x / 600, z / 600);
        const t = hw / step;
        const f = t - Math.floor(t);
        const hw2 = (Math.floor(t) + smoothstep(0.5, 0.72, f)) * step;
        h = fl + lerp(hw, hw2, 0.8 * smoothstep(2, 14, u));
      }

      // Półka wyskoku – płasko
      const ex = x - this.exit.x, ez = z - this.exit.z;
      const er = ex * ex + ez * ez;
      if (er < 900 && s < 0) h = lerp(L.exitH, h, smoothstep(10, 30, Math.sqrt(er)));
      // Lądowisko – płasko
      const lx = x - this.land.x, lz = z - this.land.z;
      const lr = lx * lx + lz * lz;
      if (lr < 160 * 160) h = lerp(this.land.y, h, smoothstep(60, 160, Math.sqrt(lr)));
      return h;
    }

    // Wysokość z dokładnym przebiegiem trójkątów siatki nie jest potrzebna – siatka ma 4 m oczko
    ground(x, z) { return Math.max(this.height(x, z, 0), this.water); }

    nominal(s) { return this.L.exitH - LOSS(Math.max(0, s)); }

    // Gęstość lasu 0..1 w danym miejscu (używana też do barwienia terenu)
    forest(x, z, h, ny) {
      const L = this.L;
      if (h < this.water + 3) return 0;
      const tl = L.treeLine;
      let dens = L.trees.density * (1 - smoothstep(tl - 220, tl, h));
      dens *= smoothstep(0.72, 0.86, ny);
      const patch = this.n2.noise(x / 260, z / 260) * 0.5 + 0.5;
      dens *= smoothstep(0.25, 0.6, patch);
      // pusto wokół wyskoku i lądowiska
      const lx = x - this.land.x, lz = z - this.land.z;
      if (lx * lx + lz * lz < 140 * 140) dens = 0;
      const ex = x - this.exit.x, ez = z - this.exit.z;
      if (ex * ex + ez * ez < 80 * 80) dens = 0;
      return dens;
    }

    // Drzewa w kwadracie [x0,x0+size]×[z0,z0+size]
    treesIn(x0, z0, size) {
      const out = [];
      const cell = this.L.trees.kind === 'shrub' ? 11 : 8.5;
      const n = Math.ceil(size / cell);
      const seed = this.L.seed;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const gx = Math.floor(x0 / cell) + i, gz = Math.floor(z0 / cell) + j;
          const r1 = hash2(gx, gz, seed), r2 = hash2(gx, gz, seed + 1), r3 = hash2(gx, gz, seed + 2);
          const x = (gx + r1) * cell, z = (gz + r2) * cell;
          if (x < x0 || x >= x0 + size || z < z0 || z >= z0 + size) continue;
          const h = this.height(x, z, 1);
          const e = 2.5;
          const hx = this.height(x + e, z, 1) - this.height(x - e, z, 1);
          const hz = this.height(x, z + e, 1) - this.height(x, z - e, 1);
          const ny = 2 * e / Math.sqrt(hx * hx + hz * hz + 4 * e * e);
          const dens = this.forest(x, z, h, ny);
          if (r3 > dens) continue;
          const sc = this.L.trees.kind === 'shrub' ? 0.6 + r1 * 0.7 : 0.75 + r2 * 0.65;
          out.push({ x, y: this.height(x, z, 0) - 0.4, z, s: sc, r: r3 });
        }
      }
      return out;
    }

    _buildSpecials() {
      const L = this.L;
      this.bridge = null; this.arch = null;
      if (L.bridge) {
        const s = L.bridge.s, z = s;
        const cx = this.px(z);
        const fl = this.floor(s);
        const deckY = Math.max(fl, this.water) + L.bridge.h;
        const t = this.tangent(z);
        const nx = t.z, nz = -t.x; // prostopadła
        const ends = [];
        for (const sg of [1, -1]) {
          let r = 0;
          for (; r < 900; r += 1.5) {
            const x = cx + nx * r * sg, zz = z + nz * r * sg;
            if (this.height(x, zz, 0) > deckY + 1.5) break;
          }
          r += 5;
          ends.push({ x: cx + nx * r * sg, z: z + nz * r * sg });
        }
        this.bridge = { s, y: deckY, a: ends[0], b: ends[1], t, n: { x: nx, z: nz }, cx, cz: z, half: 0 };
        this.bridge.half = Math.hypot(ends[0].x - ends[1].x, ends[0].z - ends[1].z) / 2;
        this.bridge.mx = (ends[0].x + ends[1].x) / 2;
        this.bridge.mz = (ends[0].z + ends[1].z) / 2;
      }
      if (L.arch) {
        const s = L.arch.s, z = s;
        const cx = this.px(z);
        const fl = this.floor(s);
        const t = this.tangent(z);
        const R = this.width(s) + 16;
        this.arch = { s, x: cx, y: fl - 8, z, R, r: 9, t, n: { x: t.z, z: -t.x } };
      }
    }

    // Bramki: położenie w poziomie. Wysokość ustala WS.planCourse (lot wzorcowy).
    _buildGates() {
      const L = this.L, G = L.gates;
      this.gates = [];
      const specials = [];
      if (this.bridge) {
        const b = this.bridge, base = Math.max(this.floor(b.s), this.water);
        specials.push({ type: 'most', s: b.s, x: b.cx, z: b.cz, y: Math.max((base + b.y) / 2 - 3, b.y - 24), under: b.y - 1.5, t: b.t, r: 0 });
      }
      if (this.arch) {
        const a = this.arch;
        specials.push({ type: 'łuk', s: a.s, x: a.x, z: a.z, y: a.y + (a.R - a.r) * 0.45, under: a.y + a.R - a.r - 1, t: a.t, r: 0 });
      }
      for (let s = G.from; s <= G.to; s += G.step) {
        if (specials.some(sp => Math.abs(s - sp.s) < 150)) continue;
        const z = s;
        const w = this.width(s);
        const side = Math.sin(s * 0.0013 + L.seed * 0.37) * G.lateral;
        const off = clamp(side * w, -(w - 18), w - 18);
        const t = this.tangent(z);
        const x = this.px(z) + off / t.z;
        this.gates.push({ type: 'ring', x, y: 0, z, s, t, r: 13 });
      }
      for (const sp of specials) this.gates.push(sp);
      this.gates.sort((a, b) => a.s - b.s);
      this.gates.forEach((g, i) => { g.idx = i; });
      this.specials = specials;
    }

    // Kolizje z obiektami: most (pomost) i łuk skalny
    hitObjects(x, y, z) {
      const b = this.bridge;
      if (b) {
        const dx = x - b.mx, dz = z - b.mz;
        const along = dx * b.n.x + dz * b.n.z; // wzdłuż mostu
        const across = dx * b.t.x + dz * b.t.z; // w poprzek
        if (Math.abs(along) < b.half && Math.abs(across) < 2.2 && y > b.y - 1.2 && y < b.y + 1.6) return 'most';
      }
      const a = this.arch;
      if (a) {
        const dx = x - a.x, dz = z - a.z, dy = y - a.y;
        const across = dx * a.t.x + dz * a.t.z; // oś przelotu
        const lat = dx * a.n.x + dz * a.n.z;
        if (Math.abs(across) < a.r + 1) {
          const rad = Math.hypot(lat, dy);
          if (dy > 0) {
            const dt = Math.hypot(rad - a.R, across);
            if (dt < a.r * (0.85 + 0.15 * Math.cos(Math.atan2(dy, lat) * 3))) return 'łuk';
          }
        }
      }
      return null;
    }
  }

  // Ile wysokości traci lot bez sterowania po skoku (zmierzone na modelu lotu, WS.Flight)
  const LOSS = makeCurve([[0, 0], [250, 280], [500, 410], [1000, 640], [1500, 800], [2000, 975], [3000, 1330], [4000, 1690], [5000, 2045], [7000, 2755], [9000, 3465]]);

  // drobne koryto potoku na dnie doliny (nie w kanionie i nie pod wodą)
  function n2bump(w, x, z, ad, wd) {
    if (w.L.palette === 'desert' || w.hasWater) return 0;
    return -4 * Math.exp(-(ad * ad) / 90) * smoothstep(300, 600, z);
  }

  WS.World = World;
})(typeof window !== 'undefined' ? window : globalThis);
