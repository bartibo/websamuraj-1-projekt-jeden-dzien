/* Na Krawędzi – pilot w kombinezonie skrzydłowym, spadochron i smugi dymu */
(function (root) {
  'use strict';
  const WS = root.WS;
  const { clamp, lerp, smoothstep, damp } = WS.U;
  const V3 = THREE.Vector3;

  const SUIT = [1.0, 0.36, 0.1], SUIT2 = [0.12, 0.13, 0.16], STRIPE = [0.98, 0.95, 0.9];

  class Pilot {
    constructor(scene) {
      this.scene = scene;
      this.root = new THREE.Group();
      this.model = new THREE.Group();
      this.root.add(this.model);
      scene.add(this.root);
      const lam = (c) => WS.patchFog(new THREE.MeshLambertMaterial({ color: c }));
      const suitM = lam(0xff5c1a), darkM = lam(0x1d1f24), helmM = lam(0xf2f2f2), visorM = WS.patchFog(new THREE.MeshPhongMaterial({ color: 0x111820, shininess: 80, specular: 0x88aacc }));

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), suitM);
      torso.rotation.x = Math.PI / 2; torso.scale.set(1.15, 1, 0.78); torso.position.z = 0.02;
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.42), darkM);
      pack.position.set(0, 0.15, 0.05);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 10), helmM);
      head.position.set(0, 0.03, 0.56);
      const visor = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), visorM);
      visor.position.set(0, -0.06, 0.58); visor.rotation.x = Math.PI - 0.5;
      const cam = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.08), darkM);
      cam.position.set(0, 0.17, 0.57);
      this.model.add(torso, pack, head, visor, cam);

      const limbGeo = new THREE.CylinderGeometry(0.055, 0.045, 1, 8);
      this.limbs = {};
      for (const k of ['armL', 'armR', 'legL', 'legR']) {
        const m = new THREE.Mesh(limbGeo, k.startsWith('arm') ? suitM : darkM);
        this.model.add(m); this.limbs[k] = m;
      }
      const shoe = new THREE.BoxGeometry(0.1, 0.22, 0.1);
      this.feet = [new THREE.Mesh(shoe, darkM), new THREE.Mesh(shoe, darkM)];
      this.model.add(this.feet[0], this.feet[1]);
      const glove = new THREE.SphereGeometry(0.06, 8, 6);
      this.hands = [new THREE.Mesh(glove, darkM), new THREE.Mesh(glove, darkM)];
      this.model.add(this.hands[0], this.hands[1]);

      // błony skrzydeł – geometria przeliczana co klatkę
      this.wingPts = 22;
      const wg = new THREE.BufferGeometry();
      this.wingPos = new Float32Array(this.wingPts * 3 * 3 * 2);
      wg.setAttribute('position', new THREE.BufferAttribute(this.wingPos, 3));
      const wc = new Float32Array(this.wingPos.length);
      wg.setAttribute('color', new THREE.BufferAttribute(wc, 3));
      this.wingCol = wc;
      this.wingGeo = wg;
      this.wings = new THREE.Mesh(wg, WS.patchFog(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
      this.wings.frustumCulled = false;
      this.model.add(this.wings);

      this._chute();
      this._smoke();
      this.spread = 1;
      this.m = new THREE.Matrix4();
      this.q = new THREE.Quaternion();
      this.tmp = new V3(); this.tmp2 = new V3(); this.tmp3 = new V3();
      this.footW = [new V3(), new V3()];
      this.smokeOn = true;
    }

    _chute() {
      const g = new THREE.BoxGeometry(8, 0.55, 2.8, 18, 1, 2);
      const p = g.attributes.position;
      const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        p.setY(i, p.getY(i) - x * x * 0.045 + (z > 0 ? 0.12 : 0) - Math.max(0, -z) * 0.05);
        const cell = Math.floor((x + 4) / (8 / 9));
        const c = cell % 3 === 0 ? [0.12, 0.45, 0.95] : cell % 3 === 1 ? [1, 0.82, 0.15] : [0.95, 0.95, 0.95];
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      this.canopy = new THREE.Mesh(g, WS.patchFog(new THREE.MeshLambertMaterial({ vertexColors: true })));
      this.canopy.position.y = 6.2;
      const segs = [];
      for (let i = 0; i <= 8; i++) {
        const x = -3.8 + i * 0.95;
        const y = 6.2 - x * x * 0.045 - 0.3;
        for (const z of [-1.1, 0.4, 1.3]) segs.push(x, y, z, x < 0 ? -0.22 : 0.22, 0.55, 0);
      }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs), 3));
      this.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x333333 }));
      this.chuteGrp = new THREE.Group();
      this.chuteGrp.add(this.canopy, this.lines);
      this.chuteGrp.visible = false;
      this.scene.add(this.chuteGrp);
    }

    _smoke() {
      this.trailN = 160;
      this.trails = [0, 1].map(() => ({ pts: [], t: 0 }));
      const g = new THREE.BufferGeometry();
      const n = this.trailN * 2 * 2;
      this.smPos = new Float32Array(n * 3);
      this.smA = new Float32Array(n);
      this.smC = new Float32Array(n);
      g.setAttribute('position', new THREE.BufferAttribute(this.smPos, 3));
      g.setAttribute('aA', new THREE.BufferAttribute(this.smA, 1));
      g.setAttribute('aC', new THREE.BufferAttribute(this.smC, 1));
      const idx = [];
      for (let k = 0; k < 2; k++) {
        const o = k * this.trailN * 2;
        for (let i = 0; i < this.trailN - 1; i++) {
          const a = o + i * 2, b = a + 1, c = a + 2, d = a + 3;
          idx.push(a, b, c, b, d, c);
        }
      }
      g.setIndex(idx);
      this.smGeo = g;
      const mat = new THREE.ShaderMaterial({
        uniforms: { uFogCol: WS.U3.uFogCol, uSunFog: WS.U3.uSunFog, uSunDir: WS.U3.uSunDir, uCam: WS.U3.uCam, uFogDens: WS.U3.uFogDens, uHF: WS.U3.uHF, uAmbSky: WS.U3.uAmbSky, uSunCol: WS.U3.uSunCol },
        vertexShader: `attribute float aA; attribute float aC; varying float vA; varying float vC; varying vec3 vW;
          void main(){ vA = aA; vC = aC; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `uniform vec3 uAmbSky; uniform vec3 uSunCol; varying float vA; varying float vC; varying vec3 vW;
          ${WS.GLSL.fogPars}
          void main(){
            float trail = floor(vC + 0.001);
            float edge = 1.0 - abs(fract(vC) - 0.25) * 4.0;
            vec3 base = mix(vec3(1.0, 0.5, 0.16), vec3(0.95, 0.18, 0.18), trail);
            vec3 col = base * (uSunCol * 0.6 + uAmbSky * 0.7);
            float dc = length(vW - uCam);
            float a = vA * smoothstep(2.0, 12.0, dc) * smoothstep(0.0, 0.7, edge);
            gl_FragColor = vec4(applyFog(col, vW), a);
          }`,
        transparent: true, depthWrite: false, side: THREE.DoubleSide
      });
      this.smoke = new THREE.Mesh(g, mat);
      this.smoke.frustumCulled = false;
      this.smoke.renderOrder = 6;
      this.scene.add(this.smoke);
    }

    resetTrails() { for (const t of this.trails) t.pts.length = 0; }

    dispose() {
      this.scene.remove(this.root, this.chuteGrp, this.smoke);
      this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      this.chuteGrp.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      this.smGeo.dispose();
    }

    _limb(mesh, a, b) {
      const d = this.tmp.subVectors(b, a);
      const len = d.length();
      mesh.position.copy(a).addScaledVector(d, 0.5);
      mesh.quaternion.setFromUnitVectors(this.tmp2.set(0, 1, 0), d.multiplyScalar(1 / len));
      mesh.scale.set(1, len, 1);
    }

    update(fl, dt, time, camera, visible) {
      const ph = fl.phase;
      this.root.visible = visible;
      // orientacja ciała (lot: poziomo; czasza / ziemia: pionowo)
      const up = fl.upright || 0;
      const fwd = this.tmp3.copy(fl.fwdB);
      const upB = new V3().copy(fl.upB);
      if (up > 0) {
        const h = fl.heading;
        fwd.lerp(new V3(0, 1, 0), up).normalize();
        upB.lerp(new V3(-h.x, 0, -h.z), up).normalize();
      }
      const left = new V3().crossVectors(upB, fwd).normalize();
      upB.crossVectors(fwd, left).normalize();
      this.m.makeBasis(left, upB, fwd);
      this.root.quaternion.setFromRotationMatrix(this.m);
      this.root.position.copy(fl.pos);

      // poza: rozłożenie skrzydeł
      let target = fl.tuck ? 0.25 : fl.spread ? 1.15 : 1;
      if (ph === 'ledge') target = 0.05;
      if (ph === 'chute' || ph === 'landed' || ph === 'crashed') target = -1;
      if (ph === 'flight' && fl.inflate < 1) target = Math.min(target, fl.inflate * 1.2);
      this.spread = damp(this.spread, target, 7, dt);
      const s = Math.max(0, this.spread);
      const hang = Math.max(0, -this.spread);
      const spd = fl.airspeed;
      const flut = smoothstep(25, 90, spd) * (ph === 'flight' ? 1 : 0);

      const P = (x, y, z) => new V3(x, y, z);
      const sh = [P(0.19, 0.03, 0.36), P(-0.19, 0.03, 0.36)];
      const hip = [P(0.1, 0, -0.27), P(-0.1, 0, -0.27)];
      const pts = [];
      for (let k = 0; k < 2; k++) {
        const sg = k === 0 ? 1 : -1;
        // dłoń: od tułowia (złożony) do szeroko (rozłożony); pod czaszą – w górze przy sterówkach
        const wr = P(sg * lerp(0.26, 0.8, s), lerp(-0.05, 0.0, s), lerp(-0.12, 0.24, s));
        if (hang > 0) wr.lerp(P(sg * 0.28, 0.08, 0.85 + (fl.brake || 0) * -0.35), hang);
        const ft = P(sg * lerp(0.1, 0.3, s), lerp(0, 0.02, s), -0.98);
        if (ph === 'ledge') { ft.set(sg * 0.14, 0, -0.95); }
        this._limb(this.limbs[k ? 'armR' : 'armL'], sh[k], wr);
        this._limb(this.limbs[k ? 'legR' : 'legL'], hip[k], ft);
        this.hands[k].position.copy(wr);
        this.feet[k].position.copy(ft).add(P(0, -0.04, -0.06));
        this.feet[k].rotation.x = 0.3;
        pts.push({ wr, ft });
      }
      // błony
      const wp = this.wingPos, wc = this.wingCol;
      let o = 0;
      const tri = (a, b, c, ca, cb, cc) => {
        wp[o * 3] = a.x; wp[o * 3 + 1] = a.y; wp[o * 3 + 2] = a.z; wc[o * 3] = ca[0]; wc[o * 3 + 1] = ca[1]; wc[o * 3 + 2] = ca[2]; o++;
        wp[o * 3] = b.x; wp[o * 3 + 1] = b.y; wp[o * 3 + 2] = b.z; wc[o * 3] = cb[0]; wc[o * 3 + 1] = cb[1]; wc[o * 3 + 2] = cb[2]; o++;
        wp[o * 3] = c.x; wp[o * 3 + 1] = c.y; wp[o * 3 + 2] = c.z; wc[o * 3] = cc[0]; wc[o * 3 + 1] = cc[1]; wc[o * 3 + 2] = cc[2]; o++;
      };
      const wingK = smoothstep(0.05, 0.6, s);
      const segN = 5;
      for (let k = 0; k < 2; k++) {
        const sg = k === 0 ? 1 : -1;
        const { wr, ft } = pts[k];
        const hs = P(sg * 0.2, 0, -0.3).lerp(sh[k], 1 - wingK);
        // krawędź spływu skrzydła ramiennego (od nadgarstka do biodra, wklęsła), z trzepotaniem
        let prev = wr.clone();
        for (let i = 1; i <= segN; i++) {
          const t = i / segN;
          const e = new V3().lerpVectors(wr, hs, t);
          e.z += Math.sin(t * Math.PI) * 0.1 * wingK;
          e.x -= sg * Math.sin(t * Math.PI) * 0.06;
          e.y += Math.sin(time * 38 + t * 5 + k) * 0.022 * flut * Math.sin(t * Math.PI);
          const ca = i === segN ? SUIT : (i % 2 ? SUIT : STRIPE);
          tri(sh[k], prev, e, SUIT, SUIT, ca);
          prev = e;
        }
        // skrzydło nożne (między nogą a ogonem)
        const tail = P(0, Math.sin(time * 31) * 0.02 * flut, lerp(-0.75, -1.02, wingK));
        const crotch = P(0, 0, -0.32);
        const mid = new V3().lerpVectors(ft, tail, 0.5);
        mid.z += 0.05 * wingK;
        tri(crotch, ft, mid, SUIT2, SUIT2, SUIT);
        tri(crotch, mid, tail, SUIT2, SUIT, SUIT2);
      }
      for (let i = o; i < wp.length / 3; i++) { wp[i * 3] = wp[i * 3 + 1] = wp[i * 3 + 2] = 0; }
      this.wingGeo.attributes.position.needsUpdate = true;
      this.wingGeo.attributes.color.needsUpdate = true;
      this.wingGeo.computeVertexNormals();
      this.wings.visible = s > 0.02;

      // spadochron
      const cg = this.chuteGrp;
      if (ph === 'chute' || (ph === 'landed' && fl.chute > 0)) {
        cg.visible = true;
        const c = fl.chute;
        const e = ph === 'landed' ? 1 : c < 1 ? 1 + 2.2 * Math.pow(c - 1, 3) + 1.2 * Math.pow(c - 1, 2) : 1;
        const h = fl.heading;
        cg.position.copy(fl.pos);
        cg.rotation.set(0, Math.atan2(-h.x, -h.z) + Math.PI, 0);
        const bankC = clamp(-(fl.lastRoll || 0) * 0.25, -0.3, 0.3);
        cg.rotation.z = bankC;
        cg.scale.set(clamp(e, 0.05, 1.1), clamp(c * 1.4, 0.2, 1), clamp(e, 0.1, 1.1));
        if (ph === 'landed') {
          fl.chuteCollapse = Math.min(1, (fl.chuteCollapse || 0) + dt * 0.5);
          cg.position.y -= fl.chuteCollapse * 5.5;
          cg.rotation.x = -fl.chuteCollapse * 1.3;
        }
      } else cg.visible = false;

      // dym ze stóp
      this._updateSmoke(fl, dt, camera);
    }

    _updateSmoke(fl, dt, camera) {
      const emit = this.smokeOn && fl.phase === 'flight' && fl.flightTime > 1.2;
      for (let k = 0; k < 2; k++) {
        const tr = this.trails[k];
        const f = this.feet[k];
        const wpos = this.footW[k];
        f.getWorldPosition(wpos);
        tr.t += dt;
        for (const p of tr.pts) p.age += dt;
        while (tr.pts.length && tr.pts[0].age > 4.5) tr.pts.shift();
        if (emit && tr.t > 1 / 40) {
          tr.t = 0;
          tr.pts.push({ x: wpos.x, y: wpos.y, z: wpos.z, age: 0, vx: fl.vel.x * 0.04, vy: fl.vel.y * 0.04, vz: fl.vel.z * 0.04 });
          if (tr.pts.length > this.trailN) tr.pts.shift();
        }
      }
      const pos = this.smPos, A = this.smA, C = this.smC;
      const cp = camera.position;
      const side = this.tmp, tan = this.tmp2, tc = new V3();
      for (let k = 0; k < 2; k++) {
        const pts = this.trails[k].pts;
        const o = k * this.trailN * 2;
        const n = pts.length;
        for (let i = 0; i < this.trailN; i++) {
          const j = o + i * 2;
          if (i >= n) {
            for (let q = 0; q < 2; q++) { pos[(j + q) * 3] = pos[(j + q) * 3 + 1] = pos[(j + q) * 3 + 2] = 0; A[j + q] = 0; }
            continue;
          }
          const p = pts[n - 1 - i];
          const pn = pts[Math.max(0, n - 2 - i)];
          // dym dryfuje i rozszerza się z wiekiem
          const px = p.x, py = p.y + p.age * 0.35, pz = p.z;
          tan.set(p.x - pn.x, p.y - pn.y, p.z - pn.z);
          if (tan.lengthSq() < 1e-6) tan.set(0, 0, 1);
          tc.set(cp.x - px, cp.y - py, cp.z - pz);
          side.crossVectors(tan, tc).normalize();
          const wdt = 0.12 + p.age * 0.7;
          const a = Math.max(0, 1 - p.age / 4.5) * 0.4 * (i === 0 ? 0 : 1) * Math.min(1, i / 4);
          for (let q = 0; q < 2; q++) {
            const sgn = q ? 1 : -1;
            pos[(j + q) * 3] = px + side.x * wdt * sgn; pos[(j + q) * 3 + 1] = py + side.y * wdt * sgn; pos[(j + q) * 3 + 2] = pz + side.z * wdt * sgn;
            A[j + q] = a; C[j + q] = k + (q ? 0.5 : 0);
          }
        }
      }
      this.smGeo.attributes.position.needsUpdate = true;
      this.smGeo.attributes.aA.needsUpdate = true;
      this.smGeo.attributes.aC.needsUpdate = true;
    }
  }

  WS.Pilot = Pilot;
})(window);
