'use strict';
/* Proceduralna, obracająca się Ziemia renderowana piksel po pikselu:
   kontynenty, oceany, czapy lodowe, chmury, światła miast po nocnej stronie,
   poświata atmosfery i trwałe, żarzące się kratery po uderzeniach. */

class Planet {
  constructor(seed) {
    this.W = 512; this.H = 256;
    this.tilt = -0.38;
    this.rot = 0; this.crot = 0;
    this.doom = 0;
    this.heatList = []; this.heatAcc = 0;
    this.D = 0; this.n = 0;
    this.generate(seed);
  }

  generate(seed) {
    const W = this.W, H = this.H, N = W * H;
    const nT = makeNoise3(seed), nD = makeNoise3(seed + 101), nM = makeNoise3(seed + 202);
    const nC = makeNoise3(seed + 303), nL = makeNoise3(seed + 404);
    const hgt = new Float32Array(N), cld = new Float32Array(N), det = new Float32Array(N);
    const moi = new Float32Array(N), city = new Float32Array(N);

    for (let y = 0; y < H; y++) {
      const lat = (0.5 - (y + 0.5) / H) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
      for (let x = 0; x < W; x++) {
        const lon = (x + 0.5) / W * TAU;
        const px = cl * Math.cos(lon), py = sl, pz = cl * Math.sin(lon);
        const i = y * W + x;
        const d = nD(px * 5 + 3, py * 5 + 3, pz * 5 + 3, 3);
        det[i] = d;
        const wx = nM(px * 1.2 + 9, py * 1.2 + 9, pz * 1.2 + 9, 2) - 0.5;
        hgt[i] = nT(px * 1.35 + 11 + wx, py * 1.35 + 7 + wx, pz * 1.35 + 3 - wx, 6) + (d - 0.5) * 0.07;
        moi[i] = nM(px * 2.2 + 1, py * 2.2 + 1, pz * 2.2 + 1, 3);
        const cw = (d - 0.5) * 1.6;
        cld[i] = nC(px * 2.4 + cw, py * 3.6 + 2, pz * 2.4 - cw, 5);
        city[i] = nL(px * 11, py * 11, pz * 11, 2);
      }
    }
    // Progi z percentyli – niezależne od rozkładu szumu
    const pct = (arr, p) => { const s = Float32Array.from(arr).sort(); return s[Math.floor(p * (s.length - 1))]; };
    const SEA = pct(hgt, 0.6), DEEP = pct(hgt, 0.25), TOP = pct(hgt, 0.995);
    const C0 = pct(cld, 0.5), C1 = pct(cld, 0.93);
    const CITY = pct(city, 0.74);

    this.tex = new Uint8ClampedArray(N * 3);
    this.cloud = new Uint8Array(N);
    this.lights = new Uint8Array(N);
    this.heat = new Uint8Array(N);
    const rng = mulberry32(seed + 9);

    for (let y = 0; y < H; y++) {
      const lat = (0.5 - (y + 0.5) / H) * Math.PI, alat = Math.abs(lat);
      for (let x = 0; x < W; x++) {
        const i = y * W + x, h = hgt[i], d = det[i];
        let r, g, b;
        if (h < SEA) {
          const t = clamp((SEA - h) / (SEA - DEEP), 0, 1);
          const t2 = Math.pow(t, 0.6);
          r = lerp(40, 8, t2); g = lerp(140, 36, t2); b = lerp(175, 98, t2);
        } else {
          const e = clamp((h - SEA) / (TOP - SEA), 0, 1);
          const dry = clamp(1 - Math.abs(alat - 0.4) * 2.4, 0, 1) * smoothstep(0.42, 0.6, 1 - moi[i]);
          r = lerp(56, 104, e); g = lerp(120, 102, e); b = lerp(50, 62, e);
          r = lerp(r, 204, dry * 0.85); g = lerp(g, 172, dry * 0.85); b = lerp(b, 110, dry * 0.85);
          const mt = smoothstep(0.5, 0.85, e);
          r = lerp(r, 120, mt); g = lerp(g, 102, mt); b = lerp(b, 88, mt);
          const sn = smoothstep(0.86, 0.98, e);
          r = lerp(r, 236, sn); g = lerp(g, 236, sn); b = lerp(b, 240, sn);
          const tun = smoothstep(0.85, 1.12, alat);
          r = lerp(r, 128, tun); g = lerp(g, 130, tun); b = lerp(b, 112, tun);
          const v = (d - 0.5) * 34;
          r += v; g += v; b += v * 0.6;
          if (city[i] > CITY && alat < 1.1 && e < 0.6 && rng() < 0.45) this.lights[i] = 110 + rng() * 145;
        }
        const ice = smoothstep(1.16 + (d - 0.5) * 0.5, 1.26 + (d - 0.5) * 0.5, alat);
        if (ice > 0) {
          r = lerp(r, 230, ice); g = lerp(g, 240, ice); b = lerp(b, 250, ice);
          if (ice > 0.5) this.lights[i] = 0;
        }
        const k = i * 3;
        this.tex[k] = r; this.tex[k + 1] = g; this.tex[k + 2] = b;
        cld[i] = smoothstep(C0, C1, cld[i]);
      }
    }
    // Rozmycie chmur (poziomo z zawijaniem, pionowo z obcięciem) – miękkie krawędzie
    const tmp = new Float32Array(N), K = 2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let s = 0;
        for (let k = -K; k <= K; k++) s += cld[y * W + ((x + k + W) % W)];
        tmp[y * W + x] = s / (K * 2 + 1);
      }
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let s = 0, c = 0;
        for (let k = -K; k <= K; k++) {
          const yy = y + k;
          if (yy < 0 || yy >= H) continue;
          s += tmp[yy * W + x]; c++;
        }
        this.cloud[y * W + x] = Math.pow(s / c, 1.15) * 225;
      }
    }
    this.texBase = this.tex.slice();
    this.lightsBase = this.lights.slice();
  }

  reset() {
    this.tex.set(this.texBase);
    this.lights.set(this.lightsBase);
    this.heat.fill(0);
    this.heatList.length = 0;
    this.doom = 0;
    this.dirty = true;
  }

  // Prekalkulacja mapowania piksel ekranu -> współrzędne tekstury dla danego promienia
  setSize(R, dpr) {
    this.R = R;
    const D = Math.max(32, Math.min(Math.ceil(R * 2 * dpr), 340));
    if (this.D === D) return;
    this.D = D;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = D;
    this.ctx = this.canvas.getContext('2d');
    this.img = this.ctx.createImageData(D, D);
    const half = D / 2, W = this.W, H = this.H;
    const sun = norm3(-0.55, -0.5, 0.67);
    const ct = Math.cos(this.tilt), st = Math.sin(this.tilt);
    const pix = [], tu = [], tv = [], lt = [], rim = [], ea = [];
    for (let j = 0; j < D; j++) {
      for (let i = 0; i < D; i++) {
        const nx = (i + 0.5 - half) / half, ny = (j + 0.5 - half) / half;
        const rl = Math.sqrt(nx * nx + ny * ny);
        if (rl > 1 + 0.7 / half) continue;
        const alpha = clamp((1 - rl) * half + 0.5, 0, 1);
        let qx = nx, qy = ny;
        if (rl > 0.999) { qx = nx / rl * 0.999; qy = ny / rl * 0.999; }
        const nz = Math.sqrt(Math.max(0, 1 - qx * qx - qy * qy));
        const L = qx * sun[0] + qy * sun[1] + nz * sun[2];
        const x2 = qx * ct - qy * st, y2 = qx * st + qy * ct;
        const lat = Math.asin(clamp(-y2, -1, 1)), lon = Math.atan2(x2, nz);
        pix.push((j * D + i) * 4);
        tu.push(lon / TAU * W);
        tv.push(clamp(Math.floor((0.5 - lat / Math.PI) * H), 0, H - 1) * W);
        lt.push(L);
        rim.push(Math.pow(1 - nz, 2.6));
        ea.push(Math.round(alpha * 255));
      }
    }
    this.pix = Int32Array.from(pix);
    this.tu = Float32Array.from(tu);
    this.tv = Int32Array.from(tv);
    this.lt = Float32Array.from(lt);
    this.rim = Float32Array.from(rim);
    this.ea = Uint8Array.from(ea);
    this.n = pix.length;
  }

  decayHeat(dt) {
    if (!this.heatList.length) return;
    this.heatAcc += dt * 38;
    const dec = this.heatAcc | 0;
    if (!dec) return;
    this.heatAcc -= dec;
    const hl = this.heatList, h = this.heat;
    let j = 0;
    for (let i = 0; i < hl.length; i++) {
      const ti = hl[i], v = h[ti] - dec;
      if (v > 0) { h[ti] = v; hl[j++] = ti; } else h[ti] = 0;
    }
    hl.length = j;
  }

  // Obrót jest powolny, więc piksele przeliczamy co 3. klatkę (od razu – po uderzeniu i w czasie zagłady)
  render(dt) {
    if (!this.n) return;
    this.acc = (this.acc || 0) + dt;
    this.frame = ((this.frame || 0) + 1) % 3;
    if (this.frame && !this.dirty && !this.doom) return;
    dt = this.acc; this.acc = 0; this.dirty = false;
    this.rot = (this.rot + dt * 0.07) % TAU;
    this.crot = (this.crot + dt * 0.095) % TAU;
    this.decayHeat(dt);
    const W = this.W, tex = this.tex, cl = this.cloud, li = this.lights, heat = this.heat;
    const off = this.rot / TAU * W, coff = this.crot / TAU * W;
    const data = this.img.data, n = this.n;
    const PIX = this.pix, TU = this.tu, TV = this.tv, LT = this.lt, RIM = this.rim, EA = this.ea;
    const doom = this.doom;
    for (let k = 0; k < n; k++) {
      const tu = TU[k];
      let u = (tu + off) | 0; u %= W; if (u < 0) u += W;
      let cu = (tu + coff) | 0; cu %= W; if (cu < 0) cu += W;
      const row = TV[k], ti = row + u, t3 = ti * 3;
      const L = LT[k];
      const day = L > 0 ? L : 0;
      const lit = day * 1.25 + 0.04;
      const sh = 0.035 + 0.965 * (lit > 1 ? 1 : lit);
      const c = cl[row + cu] * 0.0039;
      let r = (tex[t3] * (1 - c) + 248 * c) * sh;
      let g = (tex[t3 + 1] * (1 - c) + 250 * c) * sh;
      let b = (tex[t3 + 2] * (1 - c) + 255 * c) * sh;
      if (day < 0.22) {
        const nl = (1 - day / 0.22) * li[ti] * (1 - c * 0.8);
        r += nl; g += nl * 0.72; b += nl * 0.36;
      }
      const hh = heat[ti];
      if (hh) { r += hh; g += hh * 0.42; b += hh * 0.08; }
      const rm = RIM[k] * (0.22 + day);
      r += rm * 70; g += rm * 150; b += rm * 255;
      if (doom > 0) {
        const gr = (r + g + b) * 0.333;
        r = r + (gr * 1.3 + 70 - r) * doom;
        g = g + (gr * 0.45 - g) * doom;
        b = b + (gr * 0.18 - b) * doom;
      }
      const p = PIX[k];
      data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = EA[k];
    }
    this.ctx.putImageData(this.img, 0, 0);
  }

  // Trwały, żarzący się krater w miejscu uderzenia (kąt w układzie ekranu)
  addImpact(screenAngle, power) {
    this.dirty = true;
    const W = this.W, H = this.H, tex = this.tex;
    const nx = Math.cos(screenAngle) * 0.88, ny = Math.sin(screenAngle) * 0.88;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const ct = Math.cos(this.tilt), st = Math.sin(this.tilt);
    const x2 = nx * ct - ny * st, y2 = nx * st + ny * ct;
    const lat = Math.asin(clamp(-y2, -1, 1)), lon = Math.atan2(x2, nz);
    const u0 = lon / TAU * W + this.rot / TAU * W, v0 = (0.5 - lat / Math.PI) * H;
    const rad = 3 + clamp(power, 0.3, 3) * 5;
    const ru = rad / Math.max(0.25, Math.cos(lat));
    const cv = Math.ceil(rad), cuu = Math.ceil(ru);
    for (let dv = -cv; dv <= cv; dv++) {
      const v = Math.floor(v0 + dv);
      if (v < 0 || v >= H) continue;
      for (let du = -cuu; du <= cuu; du++) {
        const a = du / ru, bb = dv / rad, dd = Math.sqrt(a * a + bb * bb);
        if (dd > 1) continue;
        let u = Math.floor(u0 + du) % W;
        if (u < 0) u += W;
        const ti = v * W + u, t3 = ti * 3, f = 1 - dd;
        const k = Math.min(1, f * 1.7) * 0.82;
        tex[t3] = lerp(tex[t3], 40, k); tex[t3 + 1] = lerp(tex[t3 + 1], 27, k); tex[t3 + 2] = lerp(tex[t3 + 2], 20, k);
        this.lights[ti] = 0;
        const hv = Math.min(255, 255 * Math.pow(f, 0.6) * (0.65 + power * 0.25)) | 0;
        if (hv > this.heat[ti]) {
          if (!this.heat[ti]) this.heatList.push(ti);
          this.heat[ti] = hv;
        }
      }
    }
  }
}
