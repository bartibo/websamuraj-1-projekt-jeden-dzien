'use strict';
/* Efekty: cząsteczki (pył, dym, ogień, iskry, szkło, rozbryzgi), gruz, bryły z fizyką,
   szczeliny w gruncie, pożary i poświata świateł. */

const _fv = new THREE.Vector3(), _fv2 = new THREE.Vector3(), _fq = new THREE.Quaternion(), _fq2 = new THREE.Quaternion();
const _fm = new THREE.Matrix4(), _fs = new THREE.Vector3(), _fe = new THREE.Euler();

function spriteTex(kind) {
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  if (kind === 'smoke') {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 26;
      const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r, rad = 18 + Math.random() * 26;
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.22)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, S, S);
    }
    // miękka krawędź
    c.globalCompositeOperation = 'destination-in';
    const g = c.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
  } else {
    const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, S, S);
  }
  const t = new THREE.CanvasTexture(cv);
  return t;
}

const PVERT = `
  attribute float size; attribute float alpha; attribute vec3 color; attribute float rot;
  uniform float scale; varying float vA; varying vec3 vC; varying float vR; varying float vFog;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(size * scale / max(0.5, -mv.z), 700.0);
    vA = alpha * smoothstep(4.0, 30.0, -mv.z); vC = color; vR = rot; vFog = -mv.z;
  }`;
const PFRAG = `
  uniform sampler2D map; uniform vec3 fogColor; uniform float fogNear, fogFar, fogMix, fogFade;
  varying float vA; varying vec3 vC; varying float vR; varying float vFog;
  void main(){
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vR), s = sin(vR);
    uv = mat2(c, -s, s, c) * uv + 0.5;
    vec4 t = texture2D(map, uv);
    float a = t.a * vA;
    if (a < 0.002) discard;
    float f = smoothstep(fogNear, fogFar, vFog);
    vec3 col = mix(vC * t.rgb, fogColor, f * fogMix);
    gl_FragColor = vec4(col, a * (1.0 - f * fogFade));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

class PSys {
  constructor(max, tex, additive, scene) {
    this.max = max;
    this.n = 0;
    const F = k => new Float32Array(max * k);
    this.p = F(3); this.v = F(3); this.c = F(3);
    this.age = F(1); this.life = F(1); this.s0 = F(1); this.s1 = F(1); this.a0 = F(1);
    this.drag = F(1); this.grav = F(1); this.rot = F(1); this.rotV = F(1); this.fin = F(1); this.coll = new Uint8Array(max);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(F(3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(F(3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aSize = new THREE.BufferAttribute(F(1), 1).setUsage(THREE.DynamicDrawUsage);
    this.aAlpha = new THREE.BufferAttribute(F(1), 1).setUsage(THREE.DynamicDrawUsage);
    this.aRot = new THREE.BufferAttribute(F(1), 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.aPos);
    g.setAttribute('color', this.aCol);
    g.setAttribute('size', this.aSize);
    g.setAttribute('alpha', this.aAlpha);
    g.setAttribute('rot', this.aRot);
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: tex }, scale: { value: 800 },
        fogColor: { value: new THREE.Color() }, fogNear: { value: 300 }, fogFar: { value: 2500 },
        fogMix: { value: additive ? 0 : 1 }, fogFade: { value: additive ? 1 : 0.3 }
      },
      vertexShader: PVERT, fragmentShader: PFRAG,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 3 : 2;
    scene.add(this.points);
  }
  spawn(o) {
    let i;
    if (this.n < this.max) i = this.n++;
    else i = Math.floor(Math.random() * this.max);
    const p = this.p, v = this.v, c = this.c;
    p[i * 3] = o.x; p[i * 3 + 1] = o.y; p[i * 3 + 2] = o.z;
    v[i * 3] = o.vx || 0; v[i * 3 + 1] = o.vy || 0; v[i * 3 + 2] = o.vz || 0;
    c[i * 3] = o.r === undefined ? 1 : o.r; c[i * 3 + 1] = o.g === undefined ? 1 : o.g; c[i * 3 + 2] = o.b === undefined ? 1 : o.b;
    this.age[i] = 0;
    this.life[i] = o.life || 2;
    this.s0[i] = o.s0 || 1;
    this.s1[i] = o.s1 === undefined ? this.s0[i] : o.s1;
    this.a0[i] = o.a === undefined ? 1 : o.a;
    this.drag[i] = o.drag || 0;
    this.grav[i] = o.grav || 0;
    this.rot[i] = Math.random() * 6.28;
    this.rotV[i] = o.rotV === undefined ? U.rand(-0.6, 0.6) : o.rotV;
    this.fin[i] = o.fin || 0.08;
    this.coll[i] = o.coll ? 1 : 0;
  }
  clear() { this.n = 0; this.points.geometry.setDrawRange(0, 0); }
  update(dt, fog) {
    const p = this.p, v = this.v, c = this.c;
    const P = this.aPos.array, C = this.aCol.array, S = this.aSize.array, A = this.aAlpha.array, R = this.aRot.array;
    let i = 0;
    while (i < this.n) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {
        // zamiana z ostatnim
        const j = --this.n;
        if (i !== j) {
          for (let k = 0; k < 3; k++) { p[i * 3 + k] = p[j * 3 + k]; v[i * 3 + k] = v[j * 3 + k]; c[i * 3 + k] = c[j * 3 + k]; }
          this.age[i] = this.age[j]; this.life[i] = this.life[j]; this.s0[i] = this.s0[j]; this.s1[i] = this.s1[j];
          this.a0[i] = this.a0[j]; this.drag[i] = this.drag[j]; this.grav[i] = this.grav[j]; this.rot[i] = this.rot[j];
          this.rotV[i] = this.rotV[j]; this.fin[i] = this.fin[j]; this.coll[i] = this.coll[j];
        }
        continue;
      }
      const dr = Math.max(0, 1 - this.drag[i] * dt);
      v[i * 3] *= dr; v[i * 3 + 1] = v[i * 3 + 1] * dr - this.grav[i] * dt; v[i * 3 + 2] *= dr;
      p[i * 3] += v[i * 3] * dt; p[i * 3 + 1] += v[i * 3 + 1] * dt; p[i * 3 + 2] += v[i * 3 + 2] * dt;
      if (this.coll[i]) {
        const gy = World.baseHeight(p[i * 3], p[i * 3 + 2]) + 0.05;
        if (p[i * 3 + 1] < gy) {
          p[i * 3 + 1] = gy;
          v[i * 3 + 1] *= -0.25;
          v[i * 3] *= 0.6; v[i * 3 + 2] *= 0.6;
        }
      }
      this.rot[i] += this.rotV[i] * dt;
      const t = this.age[i] / this.life[i];
      const fi = Math.min(1, t / this.fin[i]);
      P[i * 3] = p[i * 3]; P[i * 3 + 1] = p[i * 3 + 1]; P[i * 3 + 2] = p[i * 3 + 2];
      C[i * 3] = c[i * 3]; C[i * 3 + 1] = c[i * 3 + 1]; C[i * 3 + 2] = c[i * 3 + 2];
      S[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * (1 - (1 - t) * (1 - t));
      A[i] = this.a0[i] * fi * Math.pow(1 - t, 1.3);
      R[i] = this.rot[i];
      i++;
    }
    this.points.geometry.setDrawRange(0, this.n);
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = this.aAlpha.needsUpdate = this.aRot.needsUpdate = true;
    if (fog) {
      this.mat.uniforms.fogColor.value.copy(fog.color);
      this.mat.uniforms.fogNear.value = fog.near;
      this.mat.uniforms.fogFar.value = fog.far;
    }
  }
}

/* Gruz: drobne odłamki (instancje), prosta fizyka z odbiciem od podłoża. */
class Rubble {
  constructor(max, scene) {
    this.max = max;
    this.list = [];
    this.next = 0;
    const geo = new THREE.DodecahedronGeometry(0.5, 0);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }), max);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    const c = new THREE.Color(0.5, 0.5, 0.5);
    for (let i = 0; i < max; i++) this.mesh.setColorAt(i, c);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
    this.dirty = false;
  }
  add(x, y, z, vx, vy, vz, size, color) {
    let ch;
    if (this.list.length < this.max) {
      ch = { i: this.list.length };
      this.list.push(ch);
      this.mesh.count = this.list.length;
    } else {
      ch = this.list[this.next];
      this.next = (this.next + 1) % this.max;
    }
    Object.assign(ch, {
      x, y, z, vx, vy, vz, rest: false, sx: size * U.rand(0.7, 1.4), sy: size * U.rand(0.5, 1), sz: size * U.rand(0.7, 1.3),
      rx: Math.random() * 6, ry: Math.random() * 6, rz: Math.random() * 6, wx: U.rand(-6, 6), wz: U.rand(-6, 6), t: 0
    });
    this.mesh.setColorAt(ch.i, color);
    this.mesh.instanceColor.needsUpdate = true;
    this.write(ch);
    this.dirty = true;
  }
  write(ch) {
    _fe.set(ch.rx, ch.ry, ch.rz);
    _fq.setFromEuler(_fe);
    _fv.set(ch.x, ch.y, ch.z);
    _fs.set(ch.sx, ch.sy, ch.sz);
    _fm.compose(_fv, _fq, _fs);
    this.mesh.setMatrixAt(ch.i, _fm);
  }
  clear() { this.list = []; this.next = 0; this.mesh.count = 0; }
  update(dt) {
    let any = this.dirty;
    const quake = Quake.events.length > 0;
    const fl = Flood.active;
    for (const ch of this.list) {
      if (ch.rest && !quake && !fl) continue;
      // tsunami: rwąca woda wlecze odłamki po dnie
      let inFlow = false;
      if (fl && Flood.depthAt(ch.x, ch.z) > ch.sy * 0.8) {
        Flood.drift(ch.x, ch.z, _fl);
        if (_fl.u * _fl.u + _fl.w * _fl.w > 9 / ch.sx) {
          inFlow = true;
          ch.rest = false;
          const k = Math.min(1, dt * 1.5);
          ch.vx += (_fl.u * 0.55 - ch.vx) * k;
          ch.vz += (_fl.w * 0.55 - ch.vz) * k;
          if (Flood.solidAt(ch.x + ch.vx * dt * 3, ch.z + ch.vz * dt * 3)) { ch.vx *= -0.3; ch.vz *= -0.3; }
        }
      }
      if (ch.rest && !quake) continue;
      ch.t += dt;
      if (!ch.rest) {
        ch.vy -= 9.81 * dt;
        ch.x += ch.vx * dt; ch.y += ch.vy * dt; ch.z += ch.vz * dt;
        ch.rx += ch.wx * dt; ch.rz += ch.wz * dt;
      }
      let gy = World.baseHeight(ch.x, ch.z);
      if (quake) gy += Quake.dyAt(Quake.distFromE(ch.x, ch.z));
      const bottom = gy + ch.sy * 0.35;
      if (ch.y <= bottom) {
        ch.y = bottom;
        if (!ch.rest) {
          // nachylenie zbocza – odłamki staczają się
          const hx = World.baseHeight(ch.x + 1, ch.z) - World.baseHeight(ch.x - 1, ch.z);
          const hz = World.baseHeight(ch.x, ch.z + 1) - World.baseHeight(ch.x, ch.z - 1);
          const slope = Math.hypot(hx, hz) / 2;
          if (slope > 0.25) {
            ch.vx = ch.vx * 0.85 - hx * 4 * dt * 9.81;
            ch.vz = ch.vz * 0.85 - hz * 4 * dt * 9.81;
            ch.vy = Math.abs(ch.vy) * 0.2;
          } else if (inFlow) {
            ch.vy = 0;
            ch.wx = ch.vz * 0.8; ch.wz = -ch.vx * 0.8;
          } else {
            ch.vy = -ch.vy * 0.28;
            ch.vx *= 0.55; ch.vz *= 0.55;
            ch.wx *= 0.6; ch.wz *= 0.6;
            if (Math.abs(ch.vy) < 0.6 && Math.hypot(ch.vx, ch.vz) < 0.4) { ch.rest = true; ch.vy = 0; }
          }
        }
      }
      this.write(ch);
      any = true;
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
    this.dirty = false;
  }
}

/* Bryły sztywne (segmenty budynków, kominy) z kontaktem z podłożem. */
class Bodies {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
  }
  add(obj, half, v, w, opts) {
    const b = {
      obj, half, v: v.clone(), w: w ? w.clone() : new THREE.Vector3(), sleep: false, sleepT: 0, lastImpact: -9, opts: opts || {},
      invI: new THREE.Vector3(
        3 / (half.y * half.y + half.z * half.z),
        3 / (half.x * half.x + half.z * half.z),
        3 / (half.x * half.x + half.y * half.y))
    };
    this.list.push(b);
    if (this.list.length > 320) {
      const old = this.list.find(x => x.sleep);
      if (old) this.list.splice(this.list.indexOf(old), 1);
    }
    return b;
  }
  detach(obj, half, o) {
    this.scene.attach(obj);
    const b = this.add(obj, half, new THREE.Vector3(o.vx || 0, o.vy || 0, o.vz || 0),
      new THREE.Vector3(U.rand(-1, 1), U.rand(-1, 1), U.rand(-1, 1)).multiplyScalar(o.spin || 1), { kind: 'small' });
    return b;
  }
  remove(b) {
    const i = this.list.indexOf(b);
    if (i >= 0) this.list.splice(i, 1);
    if (b.obj.parent) b.obj.parent.remove(b.obj);
  }
  clear() {
    for (const b of this.list) if (b.obj.parent) b.obj.parent.remove(b.obj);
    this.list = [];
  }
  applyIinv(b, q, qi, vec) {
    vec.applyQuaternion(qi);
    vec.x *= b.invI.x; vec.y *= b.invI.y; vec.z *= b.invI.z;
    return vec.applyQuaternion(q);
  }
  update(dt, time) {
    const quake = Quake.events.length > 0;
    const corner = new THREE.Vector3(), r = new THREE.Vector3(), vp = new THREE.Vector3(), tmp = new THREE.Vector3();
    const rn = new THREE.Vector3(), t = new THREE.Vector3();
    const steps = 3, h = dt / steps;
    for (const b of this.list) {
      if (b.sleep && !quake) continue;
      if (b.sleep && quake) { b.sleep = false; b.sleepT = 0; }
      const o = b.obj, p = o.position, q = o.quaternion;
      let maxImpact = 0;
      for (let st = 0; st < steps; st++) {
        b.v.y -= 9.81 * h;
        p.addScaledVector(b.v, h);
        _fq.set(b.w.x, b.w.y, b.w.z, 0).multiply(q);
        q.x += 0.5 * h * _fq.x; q.y += 0.5 * h * _fq.y; q.z += 0.5 * h * _fq.z; q.w += 0.5 * h * _fq.w;
        q.normalize();
        _fq2.copy(q).invert();
        // kontakty narożników z gruntem
        let maxPen = 0, contacts = 0;
        const dyg = quake ? Quake.dyAt(Quake.distFromE(p.x, p.z)) : 0;
        for (let k = 0; k < 8; k++) {
          r.set(k & 1 ? b.half.x : -b.half.x, k & 2 ? b.half.y : -b.half.y, k & 4 ? b.half.z : -b.half.z).applyQuaternion(q);
          corner.copy(p).add(r);
          const gy = World.baseHeight(corner.x, corner.z) + dyg;
          const pen = gy - corner.y;
          if (pen <= 0) continue;
          contacts++;
          if (pen > maxPen) maxPen = pen;
          vp.crossVectors(b.w, r).add(b.v);
          const vn = vp.y;
          if (vn < 0) {
            if (-vn > maxImpact) maxImpact = -vn;
            rn.set(-r.z, 0, r.x);                 // r × n, n = (0,1,0)
            const Irn = this.applyIinv(b, q, _fq2, tmp.copy(rn));
            const denom = 1 + _fv.crossVectors(Irn, r).y;
            const j = -(1 + 0.15) * vn / denom;
            b.v.y += j;
            b.w.addScaledVector(Irn, j);
            // tarcie
            vp.crossVectors(b.w, r).add(b.v);
            const vt = Math.hypot(vp.x, vp.z);
            if (vt > 1e-4) {
              t.set(-vp.x / vt, 0, -vp.z / vt);
              _fv2.crossVectors(r, t);
              const Irt = this.applyIinv(b, q, _fq2, _fv2);
              const dT = 1 + t.dot(_fv.crossVectors(Irt, r));
              const jt = Math.min(vt / dT, 0.65 * j);
              b.v.addScaledVector(t, jt);
              b.w.addScaledVector(Irt, jt);
            }
          }
        }
        if (maxPen > 0) p.y += maxPen * 0.85;
        if (contacts > 0) { b.w.multiplyScalar(0.994); b.v.x *= 0.997; b.v.z *= 0.997; }
        b.contacts = contacts;
      }
      // uderzenie o ziemię: pył, gruz, dźwięk
      if (maxImpact > 3.5 && time - b.lastImpact > 0.35) {
        b.lastImpact = time;
        const big = b.opts.kind === 'seg';
        const s = U.clamp(maxImpact / 15, 0.2, 1) * (big ? 1 : 0.3);
        _fv.set(p.x, World.baseHeight(p.x, p.z) + 0.5, p.z);
        FX.impactDust(_fv, b.half.x * 2.2, b.half.z * 2.2, s);
        if (big) {
          FX.rubbleAt(_fv, Math.max(b.half.x, b.half.z), Math.round(6 + s * 14), b.opts.owner);
          Sound.crash(s * 0.8, Main.panFor(p.x, p.z), Main.distFactor(p.x, p.z));
          Main.shakeKick(s * 0.25 / Main.distFactor(p.x, p.z, true));
        }
      }
      // uśpienie
      // usypiamy tylko bryłę, która leży stabilnie (co najmniej 3 narożniki na ziemi)
      if (b.v.lengthSq() < 0.03 && b.w.lengthSq() < 0.006 && b.contacts >= 3) {
        b.sleepT += dt;
        if (b.sleepT > 1.0) { b.sleep = true; b.v.set(0, 0, 0); b.w.set(0, 0, 0); }
      } else b.sleepT = 0;
      b.age = (b.age || 0) + dt;
      if (b.age > 25) b.sleep = true;
      if (p.y < -60) b.sleep = true;
    }
  }
}

/* Szczeliny w gruncie (wstęgi z gradientem: ciemny środek, brązowe brzegi) */
class Cracks {
  constructor(scene, maxPts) {
    this.max = maxPts;
    this.list = [];
    this.used = 0;
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(maxPts * 3 * 3);
    this.col = new Float32Array(maxPts * 3 * 3);
    const idx = new Uint32Array(maxPts * 12);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(new THREE.BufferAttribute(idx, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.geo = g;
    this.idx = idx;
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, fog: true });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    scene.add(this.mesh);
  }
  clear() { this.list = []; this.used = 0; this.geo.setDrawRange(0, 0); }
  spawn(x, z, len, width, ang) {
    const n = Math.max(3, Math.round(len / 1.6));
    if (this.used + n > this.max) return;
    const pts = [];
    let a = ang;
    for (let i = 0; i < n; i++) {
      pts.push({ x, z });
      a += U.rand(-0.45, 0.45);
      x += Math.cos(a) * 1.6;
      z += Math.sin(a) * 1.6;
    }
    const c = { pts, start: this.used, n, grow: 0, speed: U.rand(0.3, 0.8), width, wv: pts.map(() => U.rand(0.5, 1.2)) };
    this.used += n;
    this.list.push(c);
    // indeksy
    for (let i = 0; i < n - 1; i++) {
      const b = (c.start + i) * 3, nb = b + 3, o = (c.start + i) * 12;
      const I = this.idx;
      I[o] = b; I[o + 1] = nb; I[o + 2] = b + 1; I[o + 3] = b + 1; I[o + 4] = nb; I[o + 5] = nb + 1;
      I[o + 6] = b + 1; I[o + 7] = nb + 1; I[o + 8] = b + 2; I[o + 9] = b + 2; I[o + 10] = nb + 1; I[o + 11] = nb + 2;
    }
    this.geo.index.needsUpdate = true;
    this.geo.setDrawRange(0, (this.used) * 12);
  }
  update(dt) {
    if (this.list.length === 0) return;
    const quake = Quake.events.length > 0;
    const P = this.pos, C = this.col;
    const s = { dx: 0, dy: 0, dz: 0 };
    for (const c of this.list) {
      if (c.grow >= 1 && !quake && c.done) continue;
      if (quake) c.grow = Math.min(1, c.grow + dt * c.speed);
      const visN = c.grow * (c.n - 1);
      for (let i = 0; i < c.n; i++) {
        const p = c.pts[i];
        const prev = c.pts[Math.max(0, i - 1)], nxt = c.pts[Math.min(c.n - 1, i + 1)];
        let tx = nxt.x - prev.x, tz = nxt.z - prev.z;
        const tl = Math.hypot(tx, tz) || 1;
        tx /= tl; tz /= tl;
        const prog = U.clamp(visN - i + 1, 0, 1);
        const taper = Math.sin(Math.PI * (i / (c.n - 1)) * 0.98 + 0.01);
        const w = c.width * c.wv[i] * taper * prog * 0.5 * (0.4 + 0.6 * c.grow);
        if (quake) Quake.sample(p.x, p.z, s, false); else { s.dx = s.dy = s.dz = 0; }
        const y = World.baseHeight(p.x, p.z) + s.dy + 0.06;
        const o = (c.start + i) * 9;
        P[o] = p.x + s.dx - tz * w; P[o + 1] = y; P[o + 2] = p.z + s.dz + tx * w;
        P[o + 3] = p.x + s.dx; P[o + 4] = y - 0.02; P[o + 5] = p.z + s.dz;
        P[o + 6] = p.x + s.dx + tz * w; P[o + 7] = y; P[o + 8] = p.z + s.dz - tx * w;
        C[o] = 0.3; C[o + 1] = 0.24; C[o + 2] = 0.18;
        C[o + 3] = 0.03; C[o + 4] = 0.025; C[o + 5] = 0.02;
        C[o + 6] = 0.3; C[o + 7] = 0.24; C[o + 8] = 0.18;
      }
      if (!quake) c.done = true;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.computeBoundingSphere();
  }
}

const FX = {
  init(scene) {
    this.scene = scene;
    this.texSmoke = spriteTex('smoke');
    this.texGlow = spriteTex('glow');
    this.dust = new PSys(4500, this.texSmoke, false, scene);
    this.fire = new PSys(3500, this.texGlow, true, scene);
    this.glowSys = new PSys(1, this.texGlow, true, scene);
    this.rubble = new Rubble(2600, scene);
    this.bodies = new Bodies(scene);
    this.cracks = new Cracks(scene, 2600);
    // warstwa poświaty (latarnie, światła aut)
    const G = 900;
    const g = new THREE.BufferGeometry();
    this.gPos = new THREE.BufferAttribute(new Float32Array(G * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.gCol = new THREE.BufferAttribute(new Float32Array(G * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.gSize = new THREE.BufferAttribute(new Float32Array(G), 1).setUsage(THREE.DynamicDrawUsage);
    this.gAlpha = new THREE.BufferAttribute(new Float32Array(G).fill(0.85), 1);
    this.gRot = new THREE.BufferAttribute(new Float32Array(G), 1);
    g.setAttribute('position', this.gPos);
    g.setAttribute('color', this.gCol);
    g.setAttribute('size', this.gSize);
    g.setAttribute('alpha', this.gAlpha);
    g.setAttribute('rot', this.gRot);
    this.glowMax = G;
    this.glow = new THREE.Points(g, this.glowSys.mat);
    this.glow.frustumCulled = false;
    this.glow.renderOrder = 4;
    scene.add(this.glow);
    scene.remove(this.glowSys.points);
    this.glowBuf = [];
    this.fires = [];
    this.lights = [];
    for (let i = 0; i < 4; i++) {
      const L = new THREE.PointLight(0xff7a2a, 0, 90, 1.6);
      L.position.set(0, -100, 0);
      scene.add(L);
      this.lights.push(L);
    }
    this.crackTimer = 0;
    this.landTimer = 0;
  },

  setScale(h, fov) {
    const s = h / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
    this.dust.mat.uniforms.scale.value = s;
    this.fire.mat.uniforms.scale.value = s;
  },

  clear() {
    this.dust.clear();
    this.fire.clear();
    this.rubble.clear();
    this.bodies.clear();
    this.cracks.clear();
    this.fires = [];
    for (const L of this.lights) { L.intensity = 0; L.position.y = -100; }
  },

  dustColor() {
    const t = World.tod;
    if (t === 'night') return [0.16, 0.16, 0.18];
    if (t === 'sunset') return [0.62, 0.5, 0.42];
    return [0.72, 0.68, 0.6];
  },

  /* ---------------------------------------------------------- emitery */
  impactDust(pos, w, d, s) {
    const [r, g, b] = this.dustColor();
    const n = Math.round(6 + s * 26);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = U.rand(2, 9) * s + 1;
      this.dust.spawn({
        x: pos.x + U.rand(-w / 2, w / 2), y: pos.y + U.rand(0, 2), z: pos.z + U.rand(-d / 2, d / 2),
        vx: Math.cos(a) * sp, vy: U.rand(0.5, 3) * s, vz: Math.sin(a) * sp,
        life: U.rand(4, 9) * (0.5 + s), s0: U.rand(3, 6) * (0.6 + s), s1: U.rand(10, 22) * (0.5 + s),
        a: U.rand(0.35, 0.6), r: r * U.rand(0.9, 1.1), g: g * U.rand(0.9, 1.1), b: b * U.rand(0.9, 1.1), drag: 0.9, grav: -0.15, fin: 0.05
      });
    }
  },

  collapseDust(b) {
    const [r, g, bl] = this.dustColor();
    const n = Math.round(U.clamp(40 + b.H * 2.5, 40, 160));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = U.rand(4, 14);
      const y = World.G0 + U.rand(0, Math.min(b.H, 40));
      this.dust.spawn({
        x: b.x + U.rand(-b.fw / 2, b.fw / 2), y, z: b.z + U.rand(-b.fd / 2, b.fd / 2),
        vx: Math.cos(a) * sp, vy: U.rand(-1, 3), vz: Math.sin(a) * sp,
        life: U.rand(8, 16), s0: U.rand(6, 12), s1: U.rand(22, 45),
        a: U.rand(0.35, 0.55), r: r * U.rand(0.9, 1.1), g: g * U.rand(0.9, 1.1), b: bl * U.rand(0.9, 1.1), drag: 0.55, grav: -0.12, fin: 0.04
      });
    }
  },

  facadeDust(b, n) {
    const [r, g, bl] = this.dustColor();
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5;
      const x = b.x + (side ? U.rand(-b.fw / 2, b.fw / 2) : (Math.random() < 0.5 ? -1 : 1) * b.fw / 2);
      const z = b.z + (side ? (Math.random() < 0.5 ? -1 : 1) * b.fd / 2 : U.rand(-b.fd / 2, b.fd / 2));
      this.dust.spawn({
        x, y: World.G0 + U.rand(1, b.H), z, vx: U.rand(-1, 1), vy: U.rand(-1.5, 0.5), vz: U.rand(-1, 1),
        life: U.rand(3, 6), s0: 2, s1: U.rand(6, 12), a: 0.4, r, g, b: bl, drag: 0.8, grav: 0.4
      });
    }
  },

  matColor(b) {
    const t = b.type;
    const c = new THREE.Color();
    if (t === 'masonry' || t === 'belfry') return Math.random() < 0.55 ? c.setRGB(0.55, 0.3, 0.22) : c.copy(b.baseColor).multiplyScalar(0.75);
    if (t === 'house') return Math.random() < 0.5 ? c.setRGB(0.45, 0.32, 0.22) : Math.random() < 0.5 ? c.copy(b.roofMat.color) : c.copy(b.baseColor).multiplyScalar(0.8);
    if (t === 'tower' || t === 'office') return Math.random() < 0.3 ? c.setRGB(0.35, 0.45, 0.55) : c.setRGB(0.55, 0.55, 0.53);
    return c.setRGB(0.6, 0.59, 0.56).multiplyScalar(U.rand(0.8, 1.1));
  },

  facadeChunks(b, n) {
    for (let i = 0; i < n; i++) {
      const side = Math.floor(Math.random() * 4);
      let x = b.x, z = b.z, vx = 0, vz = 0;
      if (side === 0) { x += b.fw / 2 + 0.3; z += U.rand(-b.fd / 2, b.fd / 2); vx = U.rand(0.5, 2.5); }
      else if (side === 1) { x -= b.fw / 2 + 0.3; z += U.rand(-b.fd / 2, b.fd / 2); vx = -U.rand(0.5, 2.5); }
      else if (side === 2) { z += b.fd / 2 + 0.3; x += U.rand(-b.fw / 2, b.fw / 2); vz = U.rand(0.5, 2.5); }
      else { z -= b.fd / 2 + 0.3; x += U.rand(-b.fw / 2, b.fw / 2); vz = -U.rand(0.5, 2.5); }
      this.rubble.add(x, World.G0 + U.rand(b.H * 0.3, b.H), z, vx, U.rand(-1, 1), vz, U.rand(0.25, 0.6), this.matColor(b));
    }
  },

  rubbleBurst(b, pos, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = U.rand(2, 8);
      const ex = Math.cos(a) * b.fw / 2, ez = Math.sin(a) * b.fd / 2;
      this.rubble.add(pos.x + ex, pos.y + U.rand(0, 1.5), pos.z + ez, Math.cos(a) * sp, U.rand(1, 5), Math.sin(a) * sp,
        U.rand(0.35, 1.1), this.matColor(b));
    }
  },

  rubbleAt(pos, rad, n, b) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = U.rand(1.5, 7);
      const col = b ? this.matColor(b) : new THREE.Color(0.55, 0.54, 0.5);
      this.rubble.add(pos.x + Math.cos(a) * rad * Math.random(), pos.y + U.rand(0, 1), pos.z + Math.sin(a) * rad * Math.random(),
        Math.cos(a) * sp, U.rand(1, 4), Math.sin(a) * sp, U.rand(0.35, 1.0), col);
    }
  },

  rubblePile(b) {
    const n = Math.round(U.clamp(b.fw * b.fd / 12, 8, 60));
    for (let i = 0; i < n; i++) {
      const x = b.x + U.rand(-b.fw * 0.75, b.fw * 0.75), z = b.z + U.rand(-b.fd * 0.75, b.fd * 0.75);
      this.rubble.add(x, World.G0 + U.rand(0.5, 3), z, U.rand(-1, 1), 0, U.rand(-1, 1), U.rand(0.5, 1.6), this.matColor(b));
    }
  },

  glassBurst(b, n) {
    const H = b.H;
    for (let i = 0; i < n; i++) {
      const side = Math.floor(Math.random() * 4);
      let x = b.x, z = b.z, vx = 0, vz = 0;
      if (side === 0) { x += b.fw / 2 + 0.2; z += U.rand(-b.fd / 2, b.fd / 2); vx = U.rand(0.5, 3); }
      else if (side === 1) { x -= b.fw / 2 + 0.2; z += U.rand(-b.fd / 2, b.fd / 2); vx = -U.rand(0.5, 3); }
      else if (side === 2) { z += b.fd / 2 + 0.2; x += U.rand(-b.fw / 2, b.fw / 2); vz = U.rand(0.5, 3); }
      else { z -= b.fd / 2 + 0.2; x += U.rand(-b.fw / 2, b.fw / 2); vz = -U.rand(0.5, 3); }
      this.fire.spawn({
        x, y: World.G0 + U.rand(2, H), z, vx, vy: U.rand(-1, 1), vz, life: U.rand(1.2, 2.4), s0: U.rand(0.35, 0.7), s1: 0.2,
        a: 0.9, r: 0.75, g: 0.9, b: 1.0, grav: 9.81, drag: 0.1, coll: true, rotV: 0, fin: 0.01
      });
    }
  },

  sparks(pos, n) {
    for (let i = 0; i < n; i++) {
      this.fire.spawn({
        x: pos.x, y: pos.y, z: pos.z, vx: U.rand(-5, 5), vy: U.rand(0, 6), vz: U.rand(-5, 5),
        life: U.rand(0.5, 1.4), s0: U.rand(0.4, 0.8), s1: 0.1, a: 1, r: 1, g: U.rand(0.7, 0.95), b: 0.4, grav: 9.81, drag: 0.4, coll: true, fin: 0.01
      });
    }
  },

  sparkBurstAtLamps(lamps, k) {
    if (!lamps) return;
    for (let i = 0; i < k; i++) {
      const l = U.pick(lamps.list);
      if (l.hx !== undefined) this.sparks(_fv.set(l.hx, l.hy, l.hz), 18);
    }
  },

  sandBoil(x, z) {
    const y = World.G0 + 0.2;
    for (let i = 0; i < 6; i++) {
      this.dust.spawn({
        x: x + U.rand(-0.5, 0.5), y, z: z + U.rand(-0.5, 0.5), vx: U.rand(-1, 1), vy: U.rand(3, 7), vz: U.rand(-1, 1),
        life: U.rand(1, 2), s0: 0.8, s1: 2.5, a: 0.75, r: 0.35, g: 0.28, b: 0.18, grav: 9.81, drag: 0.2, coll: true
      });
    }
  },

  /* Rozbryzg wody (np. o ścianę budynku); vx, vz – kierunek nurtu, s – siła. */
  splash(x, z, y, vx = 0, vz = 0, s = 1) {
    const n = Math.round(3 + s * 3);
    for (let i = 0; i < n; i++) {
      this.dust.spawn({
        x: x + U.rand(-1.5, 1.5), y, z: z + U.rand(-1.5, 1.5), vx: U.rand(-2, 2) - vx * 0.25, vy: U.rand(3, 8) * s, vz: U.rand(-2, 2) - vz * 0.25,
        life: U.rand(0.7, 1.4), s0: 1.0 * s, s1: 3.2 * s, a: 0.65, r: 0.9, g: 0.92, b: 0.92, grav: 9.81, drag: 0.4
      });
    }
  },

  maybeFire(b) {
    const I = Quake.peakI;
    if (I < 8 || this.fires.length >= 8) return;
    if (Math.random() > 0.18 + (I - 8) * 0.08) return;
    this.fires.push({ x: b.x + U.rand(-b.fw / 3, b.fw / 3), z: b.z + U.rand(-b.fd / 3, b.fd / 3), delay: U.rand(2, 7), k: 0, size: U.clamp(b.fw / 12, 0.6, 1.6), out: false });
  },

  /* --------------------------------------------------------- aktualizacja */
  update(dt, time, camera) {
    const fog = World.scene.fog;
    // szczeliny w gruncie
    const I = Quake.events.length ? City.maxIeff : 1;
    if (I >= 8.4) {
      this.crackTimer -= dt * (I - 8.2) * 1.6;
      if (this.crackTimer <= 0) {
        this.crackTimer = 1;
        const x = U.rand(-210, 210), z = U.rand(-185, 60);
        this.cracks.spawn(x, z, 8 + (I - 8) * U.rand(6, 14), 0.25 + (I - 8) * U.rand(0.2, 0.45), Math.random() * Math.PI * 2);
      }
    }
    // osuwiska na zboczach
    if (I >= 8.8) {
      this.landTimer -= dt * (I - 8.5);
      if (this.landTimer <= 0) {
        this.landTimer = 0.25;
        for (let tries = 0; tries < 6; tries++) {
          const x = U.rand(-440, 440), z = U.rand(-440, 20);
          const h = World.baseHeight(x, z);
          if (h < 15 || h > 140) continue;
          const [r, g, b] = [0.42, 0.36, 0.28];
          for (let i = 0; i < 4; i++) {
            this.rubble.add(x + U.rand(-4, 4), h + U.rand(1, 4), z + U.rand(-4, 4), U.rand(-2, 2), 0, U.rand(-2, 2), U.rand(0.6, 2.2), new THREE.Color(r, g, b).multiplyScalar(U.rand(0.8, 1.2)));
          }
          _fv.set(x, h + 1, z);
          this.impactDust(_fv, 10, 10, 0.5);
          break;
        }
      }
    }
    // pożary
    let fireLevel = 0;
    const sorted = [];
    for (const f of this.fires) {
      if (f.delay > 0) { f.delay -= dt; continue; }
      if (f.out) continue;
      if (Flood.active && Flood.depthAt(f.x, f.z) > 0.5) {
        f.out = true;
        continue;
      }
      f.k = Math.min(1, f.k + dt * 0.12);
      const s = f.size * (0.35 + f.k * 0.65);
      const y = World.G0 + 1;
      const nF = Math.round(dt * 60 * 2 * s) + (Math.random() < 0.5 ? 1 : 0);
      for (let i = 0; i < nF; i++) {
        this.fire.spawn({
          x: f.x + U.rand(-4, 4) * s, y: y + U.rand(0, 2), z: f.z + U.rand(-4, 4) * s, vx: U.rand(-0.6, 0.6), vy: U.rand(3, 7) * s, vz: U.rand(-0.6, 0.6),
          life: U.rand(0.6, 1.3), s0: U.rand(3, 5) * s, s1: U.rand(0.5, 1.5), a: 0.8, r: 1, g: U.rand(0.45, 0.65), b: 0.15, drag: 0.6, fin: 0.15
        });
      }
      if (Math.random() < dt * 14 * s) {
        this.dust.spawn({
          x: f.x + U.rand(-2, 2), y: y + 6 * s, z: f.z + U.rand(-2, 2), vx: U.rand(-0.5, 0.5) + 1.2, vy: U.rand(3, 6), vz: U.rand(-0.5, 0.5) + 0.6,
          life: U.rand(10, 16), s0: 5 * s, s1: 32 * s, a: 0.55, r: 0.09, g: 0.085, b: 0.08, drag: 0.15, grav: -0.1, fin: 0.1
        });
      }
      if (Math.random() < dt * 0.6) this.sparks(_fv.set(f.x, y + 3, f.z), 6);
      fireLevel += s;
      sorted.push(f);
    }
    sorted.sort((a, b) => b.size - a.size);
    for (let i = 0; i < this.lights.length; i++) {
      const L = this.lights[i], f = sorted[i];
      if (f) {
        L.position.set(f.x, World.G0 + 5, f.z);
        L.intensity = (1400 + Math.random() * 900) * f.size * f.k;
      } else L.intensity = 0;
    }
    Sound.setFire(fireLevel * 0.5);
    this.dust.update(dt, fog);
    this.fire.update(dt, fog);
    this.rubble.update(dt);
    this.bodies.update(dt, time);
    this.cracks.update(dt);
    this.updateGlow(time);
  },

  updateGlow(time) {
    const out = this.glowBuf;
    out.length = 0;
    if (City.lamps) City.lamps.glows(out);
    if (City.cars) City.cars.glows(out, time, City.lampsLevel * (City.power || 0) + (World.tod === 'night' ? 0.3 : 0.0));
    const n = Math.min(this.glowMax, out.length / 7);
    const P = this.gPos.array, C = this.gCol.array, S = this.gSize.array;
    for (let i = 0; i < n; i++) {
      P[i * 3] = out[i * 7]; P[i * 3 + 1] = out[i * 7 + 1]; P[i * 3 + 2] = out[i * 7 + 2];
      C[i * 3] = out[i * 7 + 3]; C[i * 3 + 1] = out[i * 7 + 4]; C[i * 3 + 2] = out[i * 7 + 5];
      S[i] = out[i * 7 + 6];
    }
    this.glow.geometry.setDrawRange(0, n);
    this.gPos.needsUpdate = this.gCol.needsUpdate = this.gSize.needsUpdate = true;
  }
};
