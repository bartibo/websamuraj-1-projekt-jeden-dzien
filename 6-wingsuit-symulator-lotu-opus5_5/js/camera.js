/* Na Krawędzi – kamery: za plecami, na kasku, filmowa (przeloty), dron z boku; drżenie i FOV zależne od prędkości */
(function (root) {
  'use strict';
  const WS = root.WS;
  const { clamp, lerp, smoothstep, damp } = WS.U;
  const V3 = THREE.Vector3;

  class CameraRig {
    constructor(camera, world) {
      this.cam = camera; this.world = world;
      this.mode = 0;
      this.pos = new V3(); this.look = new V3(); this.vel = new V3();
      this.up = new V3(0, 1, 0);
      this.fov = 75;
      this.shake = 0;
      this.n = new WS.U.Simplex(31);
      this.t = 0;
      this.cine = null;
      this.roll = 0;
      this.first = true;
    }

    setWorld(w) { this.world = w; this.cine = null; this.first = true; }
    snap() { this.first = true; this.cine = null; }

    // Kamera nad przepaścią w menu (powolny przelot dronem wzdłuż trasy)
    menu(dt, time) {
      const w = this.world;
      const s = 120 + (time * 22) % Math.max(800, w.L.sLand * 0.8);
      const z = s;
      const off = Math.sin(time * 0.05) * 80;
      const x = w.px(z) + off;
      const gh = Math.max(w.height(x, z, 1), w.water);
      const y = Math.max(gh + 60, w.nominal(s) + 40);
      const lz = z + 260, lx = w.px(lz);
      const ly = Math.max(w.height(lx, lz, 1), w.water) + 30;
      const p = new V3(x, y, z), l = new V3(lx, ly, lz);
      if (this.first) { this.pos.copy(p); this.look.copy(l); this.first = false; }
      this.pos.lerp(p, 1 - Math.exp(-dt * 2));
      this.look.lerp(l, 1 - Math.exp(-dt * 2));
      this.cam.position.copy(this.pos);
      this.cam.up.set(0, 1, 0);
      this.cam.lookAt(this.look);
      this.cam.fov = 62; this.cam.updateProjectionMatrix();
    }

    update(dt, fl, opts) {
      const w = this.world;
      this.t += dt;
      const sp = fl.airspeed || 0;
      const kmh = sp * 3.6;
      const ph = fl.phase;
      const P = fl.pos;
      const vd = fl.vel.lengthSq() > 1 ? fl.vel.clone().normalize() : fl.heading.clone();
      let fovT = 70;
      let desired = new V3(), look = new V3(), upT = new V3(0, 1, 0), rollT = 0;
      let mode = WS.CAMERAS[this.mode].id;
      if (ph === 'ledge') mode = opts.ledgeView || 'ledge';
      if (opts.replay && mode === 'helm') mode = 'kino';

      if (mode === 'ledge') {
        // nad ramieniem, widok w przepaść
        const h = fl.heading;
        const sw = Math.sin(this.t * 0.4) * 0.6;
        desired.set(P.x - h.x * 5.5 + h.z * (1.8 + sw), P.y + 5.2, P.z - h.z * 5.5 - h.x * (1.8 + sw));
        look.set(P.x + h.x * 26, P.y - 24, P.z + h.z * 26);
        fovT = 72;
      } else if (mode === 'poscig') {
        const back = ph === 'chute' ? 9 : 6.2;
        const upOff = ph === 'chute' ? 2.6 : 1.5;
        const ub = ph === 'chute' ? new V3(0, 1, 0) : fl.upB.clone().lerp(new V3(0, 1, 0), 0.55).normalize();
        desired.copy(P).addScaledVector(vd, -back).addScaledVector(ub, upOff);
        look.copy(P).addScaledVector(vd, 14).addScaledVector(ub, 0.6);
        if (ph === 'chute') look.y += 2;
        rollT = ph === 'flight' ? fl.bank * 0.45 : 0;
        fovT = 68 + clamp((kmh - 120) * 0.12, 0, 30) + (fl.tuck ? 4 : 0);
      } else if (mode === 'helm') {
        const head = P.clone().addScaledVector(fl.fwdB, 0.62).addScaledVector(fl.upB, 0.18);
        if (ph === 'chute' || ph === 'landed') head.copy(P).add(new V3(0, 0.75, 0));
        desired.copy(head);
        const lookDir = ph === 'flight' ? vd.clone().lerp(fl.fwdB, 0.25).normalize() : fl.heading.clone().add(new V3(0, -0.35, 0)).normalize();
        look.copy(head).addScaledVector(lookDir, 30);
        rollT = ph === 'flight' ? fl.bank * 0.9 : 0;
        fovT = 80 + clamp((kmh - 120) * 0.14, 0, 30);
      } else if (mode === 'bok') {
        const rt = fl.right.clone();
        if (rt.lengthSq() < 0.1) rt.set(1, 0, 0);
        desired.copy(P).addScaledVector(rt, 11).addScaledVector(vd, 2.5).add(new V3(0, 1.2, 0));
        look.copy(P).addScaledVector(vd, 4);
        fovT = 62 + clamp((kmh - 120) * 0.08, 0, 18);
      } else {
        // kino: stała kamera przy skale, pilot przelatuje obok; zmiana ujęcia po minięciu
        const c = this.cine;
        const distTo = c ? c.p.distanceTo(P) : 1e9;
        const ahead = c ? new V3().subVectors(c.p, P).dot(vd) : -1;
        if (!c || (ahead < -25 && distTo > 70) || distTo > 420) this._newCine(fl, vd);
        desired.copy(this.cine.p);
        look.copy(P).addScaledVector(vd, 3);
        const d = desired.distanceTo(P);
        fovT = clamp(2 * Math.atan(9 / Math.max(d, 1)) * 180 / Math.PI * 2.2, 22, 75);
      }

      // wygładzanie (sprężyna) – mocniejsze dla kamery z tyłu, żeby czuć szarpnięcia
      if (this.first) { this.pos.copy(desired); this.look.copy(look); this.first = false; }
      const k = mode === 'helm' ? 30 : mode === 'kino' ? 60 : mode === 'ledge' ? 3 : 9;
      this.pos.lerp(desired, 1 - Math.exp(-dt * k));
      this.look.lerp(look, 1 - Math.exp(-dt * (mode === 'kino' ? 12 : k * 1.3)));
      this.roll = damp(this.roll, rollT, 6, dt);
      this.fov = damp(this.fov, fovT, 3, dt);

      // nie wchodź w skałę
      const gh = w.ground(this.pos.x, this.pos.z);
      if (this.pos.y < gh + 1.2) this.pos.y = gh + 1.2;

      // drżenie: prędkość, turbulencja, bliskość skał, uderzenia
      const sh = ph === 'flight' ? smoothstep(140, 330, kmh) * 0.6 + (opts.turb || 0) * 0.35 + (opts.prox || 0) * 0.5 : 0;
      this.shake = Math.max(this.shake * Math.exp(-dt * 3), 0);
      const amp = (sh * 0.06 + this.shake) * (mode === 'kino' ? 0.25 : 1);
      const f = 18 + kmh * 0.05;
      const ox = this.n.noise(this.t * f, 1.1) * amp, oy = this.n.noise(this.t * f, 7.3) * amp, oz = this.n.noise(this.t * f, 13.9) * amp * 0.5;

      this.cam.position.set(this.pos.x + ox, this.pos.y + oy, this.pos.z + oz);
      this.cam.up.set(0, 1, 0);
      this.cam.lookAt(this.look);
      if (Math.abs(this.roll) > 1e-4) this.cam.rotateZ(-this.roll);
      this.cam.rotateZ(this.n.noise(this.t * f * 0.7, 21.7) * amp * 0.04);
      this.cam.fov = this.fov;
      this.cam.updateProjectionMatrix();
      this.modeId = mode;
    }

    _newCine(fl, vd) {
      const w = this.world;
      const P = fl.pos;
      const lead = clamp(fl.speed * 2.6, 35, 220);
      const side = Math.random() < 0.5 ? -1 : 1;
      const rt = new V3(-vd.z, 0, vd.x).normalize();
      for (let tries = 0; tries < 6; tries++) {
        const lim = Math.max(8, w.width(P.z + lead) * 0.6);
        const lat = Math.min(10 + Math.random() * 22, lim) * side;
        const p = P.clone().addScaledVector(vd, lead).addScaledVector(rt, lat);
        p.y += -6 + Math.random() * 14;
        const gh = w.ground(p.x, p.z);
        if (p.y < gh + 2.5) p.y = gh + 2.5;
        this.cine = { p };
        if (p.y - P.y < 40) return;
      }
    }

    impact(v) { this.shake = Math.max(this.shake, v); }
    next() { this.mode = (this.mode + 1) % WS.CAMERAS.length; this.cine = null; this.first = true; return WS.CAMERAS[this.mode]; }
  }

  WS.CameraRig = CameraRig;
})(window);
