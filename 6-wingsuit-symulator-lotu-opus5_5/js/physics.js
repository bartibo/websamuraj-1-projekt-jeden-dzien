/* Na Krawędzi – model lotu: kombinezon skrzydłowy (siła nośna, opór, przechył), spadochron, autopilot */
(function (root) {
  'use strict';
  const WS = root.WS = root.WS || {};
  const { clamp, lerp, smoothstep, damp } = WS.U;
  const V3 = THREE.Vector3;

  const G = 9.81;
  const MASS = 88;
  const S0 = 0.75;          // efektywna powierzchnia skrzydła [m²]
  const CLA = 3.2;          // nachylenie krzywej siły nośnej [1/rad]
  const A_STALL = 0.42;     // kąt przeciągnięcia (~24°)
  const TRIM = 0.19;        // kąt natarcia bez sterowania (~11°)
  const UP = new V3(0, 1, 0);

  class Flight {
    constructor(world) {
      this.world = world;
      this.pos = new V3(); this.vel = new V3(); this.acc = new V3();
      this.vdir = new V3(0, 0, 1); this.lift = new V3(0, 1, 0); this.right = new V3(1, 0, 0);
      this.fwdB = new V3(0, 0, 1); this.upB = new V3(0, 1, 0); this.rightB = new V3(-1, 0, 0);
      this.heading = new V3(0, 0, 1);
      this._t1 = new V3(); this._t2 = new V3(); this._t3 = new V3();
      this.reset();
    }

    reset() {
      const w = this.world;
      this.pos.set(w.exit.x, w.exit.y + 0.95, w.exit.z);
      this.vel.set(0, 0, 0);
      this.heading.set(w.exitDir.x, 0, w.exitDir.z).normalize();
      this.vdir.copy(this.heading);
      this.phase = 'ledge';
      this.bank = 0; this.alpha = TRIM; this.inflate = 0; this.spreadF = 1;
      this.chute = 0; this.flare = 1; this.brake = 0;
      this.g = 1; this.gSmooth = 1;
      this.airspeed = 0; this.time = 0; this.flightTime = 0;
      this.tuck = false; this.spread = false; this.stall = 0;
      this.visAlpha = 1.2;
      this._orient();
    }

    jump() {
      if (this.phase !== 'ledge') return;
      this.phase = 'flight';
      this.vel.copy(this.heading).multiplyScalar(5.5);
      this.vel.y = 1.6;
      this.inflate = 0;
      this.exitAssist = true;
    }

    deploy() {
      if (this.phase !== 'flight') return false;
      this.phase = 'chute';
      this.chute = 0;
      this.flare = 1;
      return true;
    }

    step(dt, inp, env) {
      this.time += dt;
      if (this.phase === 'ledge' || this.phase === 'landed' || this.phase === 'crashed') { this._orient(); return; }
      this.flightTime += dt;
      const n = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / n;
      for (let i = 0; i < n; i++) this._sub(h, inp, env);
      this._orient();
    }

    _sub(dt, inp, env) {
      const wind = env.wind;
      const air = this._t1.copy(this.vel).sub(wind);
      let V = air.length();
      this.airspeed = V;
      if (V > 0.05) this.vdir.copy(air).multiplyScalar(1 / V);
      else this.vdir.copy(this.heading);

      // Układ odniesienia siły nośnej
      const rr = this._t2.crossVectors(this.vdir, UP);
      const rl = rr.length();
      const hr = this._t3.crossVectors(this.heading, UP);
      if (rl < 0.25) rr.addScaledVector(hr, (0.25 - rl) * 4);
      rr.normalize();
      this.right.copy(rr);
      const lref = this._t3.crossVectors(rr, this.vdir).normalize();

      const chuteMode = this.phase === 'chute';
      const o = chuteMode ? this.chute : 0;

      // --- sterowanie kombinezonem
      this.tuck = !!inp.tuck && !chuteMode;
      this.spread = !!inp.spread && !this.tuck && !chuteMode;
      this.inflate = Math.min(1, this.inflate + dt / 1.3);
      const p = chuteMode ? 0 : clamp(inp.pitch || 0, -1, 1);
      let at = TRIM + (p > 0 ? p * 0.25 : p * 0.17);
      if (this.tuck) at -= 0.05;
      if (this.spread) at += 0.035;
      at = Math.max(0.015, at) + (env.turbA || 0);
      // tuż po wyskoku pilot „wyciąga” lot większym kątem natarcia
      if (this.exitAssist) {
        if ((this.flightTime > 2 && this.vdir.y > -0.42) || p < -0.5 || this.flightTime > 14) this.exitAssist = false;
        else if (!chuteMode) at = Math.max(at, 0.37);
      }
      this.alpha = damp(this.alpha, at, 4.5, dt);
      const bt = clamp(inp.roll || 0, -1, 1) * 1.3 + (env.turbB || 0);
      this.bank = damp(this.bank, chuteMode ? 0 : bt, 3.0, dt);
      this.spreadF = damp(this.spreadF, this.tuck ? 0.6 : this.spread ? 1.12 : 1, 6, dt);

      const cb = Math.cos(this.bank), sb = Math.sin(this.bank);
      this.lift.copy(lref).multiplyScalar(cb).addScaledVector(rr, sb);

      // --- aerodynamika
      const a = this.alpha;
      let CL = a < A_STALL ? CLA * a : Math.max(0.35, CLA * A_STALL - (a - A_STALL) * 2.5);
      if (this.spread) CL *= 1.08;
      let CD = 0.072 + 0.22 * CL * CL + (a > A_STALL ? (a - A_STALL) * 1.5 : 0);
      const infl = 0.12 + 0.88 * this.inflate;
      // przy małej prędkości kombinezon „wiotczeje”
      const lowV = smoothstep(4, 16, V);
      this.stall = this.inflate > 0.95 ? 1 - smoothstep(16, 26, V) : 0;
      // przy małej prędkości kombinezon pracuje całą powierzchnią (łatwiejsze wyjście z nurkowania po skoku)
      const S = S0 * this.spreadF * infl * (1 + 1.1 * (1 - smoothstep(18, 46, V)));
      const rho = 1.225 * Math.exp(-this.pos.y / 9000);
      const q = 0.5 * rho * V * V;
      const body = (this.tuck ? 0.04 : 0.05) + 0.3 * (1 - this.inflate);
      const extra = Math.max(0, V - 85) * 0.0035;
      const Lf = q * S * CL * (0.25 + 0.75 * lowV) * (1 - o);
      const Df = q * (S * CD + body + extra) * (1 - o);

      const acc = this.acc.set(0, -G, 0);
      acc.addScaledVector(this.lift, Lf / MASS);
      acc.addScaledVector(this.vdir, -Df / MASS);
      if (env.turbAcc) acc.addScaledVector(env.turbAcc, 1 - 0.7 * o);

      this.vel.addScaledVector(acc, dt);

      // --- spadochron
      if (chuteMode) {
        this.chute = Math.min(1, this.chute + dt / 1.7);
        const roll = clamp(inp.roll || 0, -1, 1);
        const yaw = roll * 0.8 * dt * this.chute;
        const c = Math.cos(yaw), s = Math.sin(yaw);
        const hx = this.heading.x, hz = this.heading.z;
        this.heading.set(hx * c - hz * s, 0, hx * s + hz * c).normalize();
        const br = clamp(inp.pitch || 0, 0, 1);
        this.brake = damp(this.brake, br, 5, dt);
        if (br > 0.3) this.flare = Math.max(0, this.flare - dt / 2.2);
        else this.flare = Math.min(1, this.flare + dt / 6);
        const fwd = lerp(13.5, 5, this.brake);
        const sink = 6.2 - 4.4 * this.brake * this.flare + 1.8 * this.brake * (1 - this.flare);
        const tx = wind.x + this.heading.x * fwd, ty = -sink, tz = wind.z + this.heading.z * fwd;
        const k = 0.3 + 3.2 * this.chute * this.chute;
        const f = 1 - Math.exp(-k * dt);
        this.vel.x += (tx - this.vel.x) * f;
        this.vel.y += (ty - this.vel.y) * f + G * dt * this.chute; // grawitację przejmuje czasza
        this.vel.z += (tz - this.vel.z) * f;
      }

      // przeciążenie (bez grawitacji)
      const ax = acc.x, ay = acc.y + G, az = acc.z;
      let gl = Math.sqrt(ax * ax + ay * ay + az * az) / G;
      if (chuteMode) gl = Math.max(gl, 1);
      this.g = gl;
      this.gSmooth = damp(this.gSmooth, gl, 6, dt);

      this.pos.addScaledVector(this.vel, dt);

      const hx = this.vel.x, hz = this.vel.z;
      const hl = Math.hypot(hx, hz);
      if (!chuteMode && hl > 0.5) {
        const k = smoothstep(0.5, 3, hl);
        this.heading.x = lerp(this.heading.x, hx / hl, k * 0.5);
        this.heading.z = lerp(this.heading.z, hz / hl, k * 0.5);
        this.heading.normalize();
      }
    }

    // Orientacja ciała do rysowania i kamery
    _orient() {
      if (this.phase === 'ledge') {
        this.fwdB.copy(this.heading); this.upB.set(0, 1, 0);
        this.rightB.crossVectors(this.fwdB, this.upB).normalize();
        this.upright = 1;
        return;
      }
      const v = this.vdir, l = this.lift;
      const fall = this.inflate;
      // Na początku skoku ciało leży poziomo, nawet gdy prędkość jest skierowana w dół
      const flatA = Math.min(1.35, Math.acos(clamp(v.dot(this.heading), -1, 1)));
      this.visAlpha = lerp(flatA, this.alpha, smoothstep(0.3, 1, fall));
      const ca = Math.cos(this.visAlpha), sa = Math.sin(this.visAlpha);
      this.fwdB.copy(v).multiplyScalar(ca).addScaledVector(l, sa).normalize();
      this.upB.copy(l).multiplyScalar(ca).addScaledVector(v, -sa).normalize();
      this.rightB.crossVectors(this.fwdB, this.upB).normalize();
      this.upright = this.phase === 'chute' ? smoothstep(0, 0.8, this.chute) : 0;
      if (this.phase === 'landed') this.upright = 1;
    }

    get speed() { return this.vel.length(); }
    get hSpeed() { return Math.hypot(this.vel.x, this.vel.z); }
  }

  // Autopilot: leci do kolejnego celu, pilnuje ziemi. Używany w tle menu, w lotach wzorcowych i w testach.
  function autopilot(fl, world, target, opts) {
    const inp = { pitch: 0, roll: 0, tuck: false, spread: false };
    if (fl.phase !== 'flight') return inp;
    opts = opts || {};
    const p = fl.pos, v = fl.vel;
    const dx = target.x - p.x, dz = target.z - p.z;
    const dist = Math.hypot(dx, dz);
    // kurs
    const hx = fl.heading.x, hz = fl.heading.z;
    const cross = hx * dz - hz * dx, dot = hx * dx + hz * dz;
    const err = Math.atan2(cross, dot); // >0 → cel po prawej
    inp.roll = clamp(err * 2.4, -0.75, 0.75);
    // ścieżka schodzenia: pożądana prędkość pionowa
    const hv = Math.max(1, fl.hSpeed);
    if (opts.neutral) inp.pitch = 0;
    else {
      const need = (p.y - target.y) / Math.max(40, dist);
      const vyDes = -hv * need;
      inp.pitch = clamp((vyDes - v.y) * 0.05, -0.85, 0.3);
      if (fl.airspeed < 34) inp.pitch = Math.min(inp.pitch, -0.25);
      if (fl.airspeed > 85 && need < 0.6) inp.pitch = Math.max(inp.pitch, 0.25);
    }
    // ziemia przed nami
    const margin = opts.margin || 14;
    for (let t = 0.5; t <= 3.5; t += 0.5) {
      const x = p.x + v.x * t, z = p.z + v.z * t, y = p.y + v.y * t;
      const gh = world.ground(x, z);
      if (y < gh + margin) { inp.pitch = Math.max(inp.pitch, clamp(1.25 - t * 0.28, 0.3, 1)); inp.roll *= 0.3; break; }
    }
    // przy ścianie odbij w stronę osi doliny
    const off = (p.x - world.px(p.z)) * world.tangent(p.z).z;
    const w = world.width(p.z);
    if (Math.abs(off) > w * 0.85 && dist > 120) inp.roll = clamp(inp.roll + Math.sign(off) * 0.6, -1, 1);
    return inp;
  }

  // Lot wzorcowy bez sterowania wysokością → profil wysokości y(s). Na jego podstawie stawiamy bramki,
  // żeby każda była osiągalna, a zarazem ciągnęła pilota w dół, bliżej skał.
  function planCourse(world) {
    const fl = new Flight(world);
    fl.jump();
    const env = { wind: new THREE.Vector3() };
    const ref = [];
    const s0 = -50;
    let t = 0;
    while (t < 240) {
      const z = fl.pos.z + 220;
      const tgt = { x: world.px(z), y: 0, z };
      const inp = autopilot(fl, world, tgt, { neutral: true, margin: 12 });
      fl.step(1 / 30, inp, env);
      t += 1 / 30;
      const bin = Math.floor((fl.pos.z - s0) / 10);
      if (bin >= 0 && ref[bin] == null) ref[bin] = fl.pos.y;
      if (t > 1 && fl.pos.y < world.ground(fl.pos.x, fl.pos.z) + 2) break;
      if (fl.pos.z > world.L.sLand + 400) break;
    }
    // uzupełnij luki
    let last = world.L.exitH;
    for (let i = 0; i < ref.length; i++) { if (ref[i] == null) ref[i] = last; last = ref[i]; }
    const refAt = (s) => {
      const i = clamp(Math.floor((s - s0) / 10), 0, ref.length - 1);
      return ref[i] == null ? last : ref[i];
    };
    const base = (s) => Math.max(world.floor(s), world.water);
    const plan = (s) => {
      let y = refAt(s);
      for (const sp of world.specials) {
        const lead = clamp((refAt(sp.s) - sp.y) * 2.6, 400, 950);
        const yu = sp.y;
        if (s > sp.s - lead && s <= sp.s) {
          const k = (s - (sp.s - lead)) / lead;
          y = Math.min(y, lerp(refAt(sp.s - lead), yu, k * k * (3 - 2 * k)));
        } else if (s > sp.s) {
          y = Math.min(y, yu + 25 - (s - sp.s) / 3.2);
        }
      }
      return y;
    };
    for (const g of world.gates) {
      if (g.type !== 'ring') continue;
      const b = base(g.s);
      const pl = plan(g.s);
      let y = Math.max(b + 24, pl - 0.3 * Math.max(0, pl - b));
      const gh = world.ground(g.x, g.z);
      if (y < gh + 16) y = gh + 16;
      g.y = y;
    }
    world.refProfile = ref; world.refS0 = s0;
    return world.gates;
  }

  WS.Flight = Flight;
  WS.autopilot = autopilot;
  WS.planCourse = planCourse;
  WS.PHYS = { G, MASS, TRIM };
})(typeof window !== 'undefined' ? window : globalThis);
