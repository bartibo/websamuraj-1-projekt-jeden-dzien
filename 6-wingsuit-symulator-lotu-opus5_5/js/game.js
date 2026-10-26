/* Na Krawędzi – przebieg lotu: skok, punkty za bliskość, bramki, ostrzeżenia, spadochron, lądowanie/wypadek, powtórka */
(function (root) {
  'use strict';
  const WS = root.WS;
  const { clamp, lerp, smoothstep, damp, fmt } = WS.U;
  const V3 = THREE.Vector3;

  const PHASE_IDX = { ledge: 0, flight: 1, chute: 2, landed: 3, crashed: 4 };
  const PHASES = ['ledge', 'flight', 'chute', 'landed', 'crashed'];
  const LAT = [3, 6, 10, 15, 22, 32, 45];

  class Game {
    constructor(app) {
      this.app = app;
      this.env = { wind: new V3(), turbAcc: new V3(), turbA: 0, turbB: 0 };
      this.prev = new V3();
      this.debris = null;
    }

    start(opts) {
      const a = this.app;
      this.opts = opts;
      this.world = a.world;
      this.fl = new WS.Flight(this.world);
      this.free = opts.mode === 'wolny';
      this.score = 0; this.mult = 1; this.gatesOk = 0; this.gatesMissed = 0; this.streak = 0;
      this.next = 0; this.specials = 0; this.near = 0; this.topSpeed = 0; this.maxG = 1; this.minProx = 1e9;
      this.dist = 0; this.adr = 0.08; this.warn = 0; this.prox = 1e9; this.pf = 0;
      this.nearEv = null; this.slow = 0; this.timeScale = 1;
      this.endT = 0; this.result = null; this.closeTime = 0;
      this.frames = []; this.recT = 0;
      this.flash = 0;
      this.prev.copy(this.fl.pos);
      a.props.gateMeshes.forEach((m, i) => a.props.setGateState(i, 'wait'));
      a.pilot.resetTrails();
      a.rig.snap();
      this.hint = 'SPACJA – skok w przepaść';
      if (this.free) this.next = this.world.gates.length;
      this.gatesTotal = this.free ? 0 : this.world.gates.length;
    }

    // ---------- pętla ----------
    update(rdt, inp) {
      const a = this.app, fl = this.fl, w = this.world;
      // zwolnione tempo przy bardzo bliskich przelotach i przy wypadku
      this.slow = Math.max(0, this.slow - rdt);
      const tsT = this.slow > 0 ? 0.35 : 1;
      this.timeScale = damp(this.timeScale, tsT, this.slow > 0 ? 14 : 3, rdt);
      const dt = rdt * this.timeScale;

      if (fl.phase === 'ledge') {
        if (inp.jumpPressed) { fl.jump(); a.audio.play('jump'); this.hint = ''; }
      } else if (fl.phase === 'flight' && inp.chutePressed) {
        fl.deploy(); a.audio.play('chute'); a.rig.impact(0.25);
        this.popup('SPADOCHRON', 'otwarty');
      }
      this.prev.copy(fl.pos);
      w.time = (w.time || 0) + dt;
      a.weather.sample(fl.time, fl.pos, this.pf, this.env);
      fl.lastRoll = inp.roll;
      fl.step(dt, inp, this.env);

      const P = fl.pos;
      const gh = w.height(P.x, P.z, 0);
      const ground = Math.max(gh, w.water);
      const agl = P.y - ground;
      this.agl = agl;

      if (fl.phase === 'flight') this._flight(dt, rdt, agl, gh);
      else if (fl.phase === 'chute') this._chute(dt, agl, gh);

      // rekord do powtórki
      this.recT += dt;
      if (fl.phase !== 'ledge' && !this.result && this.recT >= 1 / 40) { this.recT = 0; this._record(); }
      if (this.result) {
        this.endT += rdt;
      }
      // efekt rozbicia
      if (this.debris) this._debris(dt);
      this.flash = Math.max(0, this.flash - rdt * 1.5);
    }

    _flight(dt, rdt, agl, gh) {
      const a = this.app, fl = this.fl, w = this.world, P = fl.pos;
      const kmh = fl.speed * 3.6;
      this.topSpeed = Math.max(this.topSpeed, kmh);
      if (fl.flightTime > 2) this.maxG = Math.max(this.maxG, fl.gSmooth);
      this.dist += Math.hypot(P.x - this.prev.x, P.z - this.prev.z);

      // --- bliskość: w dół, na boki, drzewa
      let prox = agl;
      const r = fl.right;
      const rx = r.x, rz = r.z, rl = Math.hypot(rx, rz) || 1;
      for (const sg of [-1, 1]) {
        for (const o of LAT) {
          const x = P.x + rx / rl * o * sg, z = P.z + rz / rl * o * sg;
          if (Math.max(w.height(x, z, 0), w.water) > P.y - 2) { prox = Math.min(prox, o * 0.9); break; }
        }
      }
      if (agl < 40) prox = Math.min(prox, a.terrain.treeNear(P.x, P.y, P.z, 25));
      const b = w.bridge;
      if (b) { const d = Math.hypot(P.x - b.mx, P.z - b.mz); if (d < b.half + 20) prox = Math.min(prox, Math.max(0, Math.abs(P.y - b.y) - 0.8) + Math.max(0, d - b.half)); }
      this.prox = prox;
      if (fl.flightTime > 3) this.minProx = Math.min(this.minProx, prox);
      this.pf = 1 - smoothstep(3, 55, prox);
      const pf = this.pf;

      // --- punkty
      if (fl.flightTime > 1.5) {
        this.mult = 1 + 6 * Math.pow(pf, 1.4) + smoothstep(220, 380, kmh) * 1.5;
        this.score += fl.speed * this.mult * dt * 0.8;
        if (pf > 0.6) this.closeTime += dt;
      }

      // --- bliski przelot (zdarzenie)
      if (prox < 12 && fl.flightTime > 3) {
        if (!this.nearEv) this.nearEv = { min: prox, sp: kmh };
        this.nearEv.min = Math.min(this.nearEv.min, prox);
        this.nearEv.sp = Math.max(this.nearEv.sp, kmh);
      } else if (this.nearEv && prox > 22) {
        const e = this.nearEv;
        const bonus = Math.round((12 - e.min) * 90 + e.sp * 2);
        this.score += bonus;
        this.near++;
        this.popup(e.min < 4 ? 'O WŁOS!' : 'BLISKO!', `${fmt(e.min, 1)} m · +${fmt(bonus)}`, e.min < 4 ? 'hot' : '');
        a.audio.play('whoosh', { v: 1.2 });
        if (e.min < 4 && this.opts.slowmo) this.slow = 0.55;
        this.nearEv = null;
      }

      // --- adrenalina
      const adrT = clamp(pf * 0.85 + smoothstep(160, 360, kmh) * 0.35 + this.warn * 0.4 + this.opts.turb * 0.15, 0, 1);
      this.adr = adrT > this.adr ? damp(this.adr, adrT, 2.2, dt) : Math.max(adrT, this.adr - dt * 0.07);

      // --- ostrzeżenie o ziemi (czas do zderzenia)
      let tti = 9;
      for (let t = 0.3; t <= 3; t += 0.3) {
        const x = P.x + fl.vel.x * t, z = P.z + fl.vel.z * t, y = P.y + fl.vel.y * t;
        if (y < Math.max(w.height(x, z, 1), w.water) + 1.5) { tti = t; break; }
      }
      this.warn = tti < 2.6 ? 1 - tti / 2.6 : 0;

      // --- bramki
      this._gates();

      // --- kolizje
      let hit = null;
      if (agl < 0.6) hit = P.y <= w.water + 0.6 && w.hasWater && gh < w.water ? 'woda' : 'skała';
      if (!hit) { const o = w.hitObjects(P.x, P.y, P.z); if (o) hit = o; }
      if (!hit && agl < 25 && a.terrain.treeHit(P.x, P.y, P.z)) hit = 'drzewo';
      if (hit) this._crash(hit);

      // podpowiedź o spadochronie
      const toLand = Math.hypot(P.x - w.land.x, P.z - w.land.z);
      if (!this.result) {
        if (agl < 350 && (this.next >= w.gates.length || toLand < 600) && fl.flightTime > 6) this.hint = 'F – otwórz spadochron';
        else if (fl.flightTime < 4) this.hint = 'W/S – nurkuj / podciągaj · A/D – skręt';
        else this.hint = '';
      }
    }

    _gates() {
      const w = this.world, fl = this.fl, a = this.app;
      if (this.free || this.next >= w.gates.length) return;
      const g = w.gates[this.next];
      const t = g.t;
      const d0 = (this.prev.x - g.x) * t.x + (this.prev.z - g.z) * t.z;
      const d1 = (fl.pos.x - g.x) * t.x + (fl.pos.z - g.z) * t.z;
      if (!(d0 < 0 && d1 >= 0)) return;
      const k = d0 / (d0 - d1);
      const cx = lerp(this.prev.x, fl.pos.x, k), cy = lerp(this.prev.y, fl.pos.y, k), cz = lerp(this.prev.z, fl.pos.z, k);
      const lat = (cx - g.x) * t.z - (cz - g.z) * t.x;
      let ok;
      if (g.type === 'ring') ok = Math.hypot(lat, cy - g.y) < g.r;
      else if (g.type === 'most') ok = cy < g.under && Math.abs(lat) < w.bridge.half;
      else ok = cy < g.under && Math.abs(lat) < w.arch.R - w.arch.r;
      if (ok) {
        this.streak++;
        this.gatesOk++;
        if (g.type === 'ring') {
          const c = 1 - Math.hypot(lat, cy - g.y) / g.r;
          const pts = Math.round((400 + c * 300) * (1 + 0.25 * Math.min(this.streak - 1, 8)));
          this.score += pts;
          this.popup(c > 0.75 ? 'IDEALNIE!' : 'BRAMKA', `+${fmt(pts)}${this.streak > 1 ? ` · seria ×${this.streak}` : ''}`, 'gate');
          a.audio.play('gate', { pitch: 1 + Math.min(this.streak, 10) * 0.04 });
        } else {
          this.specials++;
          const pts = 3000;
          this.score += pts;
          this.popup(g.type === 'most' ? 'POD MOSTEM!' : 'PRZEZ SKALNE OKNO!', `+${fmt(pts)}`, 'hot');
          a.audio.play('bonus');
          if (this.opts.slowmo) this.slow = 0.6;
        }
        a.props.setGateState(this.next, 'ok');
      } else {
        this.streak = 0;
        this.gatesMissed++;
        a.props.setGateState(this.next, 'miss');
        a.audio.play('miss');
        this.popup(g.type === 'ring' ? 'ominięta bramka' : (g.type === 'most' ? 'nad mostem…' : 'obok okna…'), '', 'miss');
      }
      this.next++;
    }

    _chute(dt, agl, gh) {
      const a = this.app, fl = this.fl, w = this.world, P = fl.pos;
      this.adr = Math.max(0.05, this.adr - dt * 0.12);
      this.warn = 0; this.pf = 0; this.prox = 1e9;
      this.mult = 1;
      this.hint = fl.chute < 1 ? '' : 'A/D – skręt · S – hamowanie (tuż nad ziemią)';
      const tree = agl < 20 && a.terrain.treeHit(P.x, P.y - 0.8, P.z);
      const obj = w.hitObjects(P.x, P.y, P.z);
      if (obj) { this._crash(obj); return; }
      if (agl < 0.9 || tree) {
        const vy = -fl.vel.y, vh = Math.hypot(fl.vel.x, fl.vel.z);
        const water = w.hasWater && gh < w.water;
        if (!tree && (vy > 11 || vh > 22)) { this._crash(water ? 'woda' : 'skała'); return; }
        P.y = tree ? P.y : Math.max(gh, w.water) + 0.9;
        const dl = Math.hypot(P.x - w.land.x, P.z - w.land.z);
        let kind, bonus;
        if (tree) { kind = 'Na drzewie'; bonus = 200; }
        else if (water) { kind = 'Wodowanie'; bonus = 500; a.audio.play('splash'); }
        else if (dl < 26) { kind = 'W celu!'; bonus = Math.round(1500 + 2500 * (1 - dl / 26)); }
        else { kind = dl < 160 ? 'Na lądowisku' : 'W terenie'; bonus = dl < 160 ? 1000 : 500; }
        const hard = vy > 6.5 || vh > 14;
        if (hard) { bonus = Math.round(bonus * 0.5); kind += ' (twardo)'; a.rig.impact(0.3); }
        this.score += bonus;
        fl.phase = 'landed';
        fl.vel.set(0, 0, 0);
        a.audio.play('land');
        this.popup(kind.toUpperCase(), `+${fmt(bonus)}`, 'gate');
        this.result = { ok: true, kind, bonus, landDist: dl, water, hard };
      }
    }

    _crash(what) {
      const a = this.app, fl = this.fl;
      if (this.result) return;
      const kmh = fl.speed * 3.6;
      fl.phase = 'crashed';
      const lost = Math.round(this.score * 0.5);
      this.score -= lost;
      this.result = { ok: false, kind: what, impact: kmh, lost };
      a.audio.play(what === 'woda' ? 'splash' : 'crash');
      a.rig.impact(1.6);
      this.flash = 1;
      this.adr = 1;
      if (this.opts.slowmo) this.slow = 0.9;
      this._spawnDebris(what);
      fl.vel.set(0, 0, 0);
    }

    _spawnDebris(what) {
      const a = this.app;
      const n = 140;
      const g = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3);
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const col = what === 'woda' ? 0xdfeeff : what === 'drzewo' ? 0x5a6b3a : 0xb8a890;
      if (!Game.dot) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 32;
        const cx = cv.getContext('2d');
        const gr = cx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        cx.fillStyle = gr; cx.fillRect(0, 0, 32, 32);
        Game.dot = new THREE.CanvasTexture(cv);
      }
      const m = new THREE.PointsMaterial({ color: col, map: Game.dot, size: what === 'woda' ? 0.22 : 0.14, transparent: true, opacity: 1, depthWrite: false });
      const pts = new THREE.Points(g, m);
      pts.frustumCulled = false;
      a.scene.add(pts);
      const v = [];
      const P = this.fl.pos;
      for (let i = 0; i < n; i++) {
        pos[i * 3] = P.x; pos[i * 3 + 1] = P.y; pos[i * 3 + 2] = P.z;
        v.push(new V3((Math.random() - 0.5) * 18, Math.random() * 14 + 2, (Math.random() - 0.5) * 18));
      }
      this.debris = { pts, v, t: 0 };
    }

    _debris(dt) {
      const d = this.debris;
      d.t += dt;
      const p = d.pts.geometry.attributes.position.array;
      for (let i = 0; i < d.v.length; i++) {
        d.v[i].y -= 9.8 * dt;
        p[i * 3] += d.v[i].x * dt; p[i * 3 + 1] += d.v[i].y * dt; p[i * 3 + 2] += d.v[i].z * dt;
      }
      d.pts.geometry.attributes.position.needsUpdate = true;
      d.pts.material.opacity = Math.max(0, 1 - d.t / 2.5);
      if (d.t > 2.6) this.clearDebris();
    }

    clearDebris() {
      if (!this.debris) return;
      this.app.scene.remove(this.debris.pts);
      this.debris.pts.geometry.dispose(); this.debris.pts.material.dispose();
      this.debris = null;
    }

    popup(t, s, k) { this.app.hud.popup(t, s, k); }

    // ---------- powtórka ----------
    _record() {
      const f = this.fl;
      this.frames.push([
        f.flightTime, f.pos.x, f.pos.y, f.pos.z, f.vel.x, f.vel.y, f.vel.z,
        f.fwdB.x, f.fwdB.y, f.fwdB.z, f.upB.x, f.upB.y, f.upB.z, f.right.x, f.right.y, f.right.z,
        f.heading.x, f.heading.z, f.bank, f.chute, PHASE_IDX[f.phase], f.tuck ? 1 : 0, f.spread ? 1 : 0, f.inflate, f.upright || 0, f.airspeed, f.brake || 0
      ]);
    }

    replayState(t, ghost) {
      const F = this.frames;
      if (F.length < 2) return null;
      const dur = F[F.length - 1][0] - F[0][0];
      const tt = F[0][0] + (t % (dur + 2.5));
      let i = 0, lo = 0, hi = F.length - 1;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (F[m][0] <= tt) lo = m; else hi = m - 1; }
      i = lo;
      const a = F[i], b = F[Math.min(F.length - 1, i + 1)];
      const k = b[0] > a[0] ? clamp((tt - a[0]) / (b[0] - a[0]), 0, 1) : 0;
      const L = (j) => a[j] + (b[j] - a[j]) * k;
      const g = ghost || {
        pos: new V3(), vel: new V3(), fwdB: new V3(), upB: new V3(), right: new V3(), heading: new V3(), vdir: new V3()
      };
      g.pos.set(L(1), L(2), L(3)); g.vel.set(L(4), L(5), L(6));
      g.fwdB.set(L(7), L(8), L(9)).normalize(); g.upB.set(L(10), L(11), L(12)).normalize(); g.right.set(L(13), L(14), L(15));
      g.heading.set(L(16), 0, L(17)).normalize();
      g.bank = L(18); g.chute = L(19); g.phase = PHASES[a[20]]; g.tuck = !!a[21]; g.spread = !!a[22]; g.inflate = L(23); g.upright = L(24);
      g.airspeed = L(25); g.brake = L(26); g.flightTime = L(0);
      g.speed = g.vel.length(); g.hSpeed = Math.hypot(g.vel.x, g.vel.z);
      if (g.phase === 'landed') g.phase = 'chute';
      if (i >= F.length - 1 && this.result && !this.result.ok) g.phase = 'crashed';
      return g;
    }

    hudState() {
      const fl = this.fl, w = this.world, P = fl.pos;
      const hv = fl.hSpeed;
      const tgt = this._target();
      const wd = this.env.wind;
      const wRel = Math.atan2(wd.x, wd.z) - Math.atan2(fl.heading.x, fl.heading.z);
      const ph = fl.phase;
      return {
        kmh: fl.speed * 3.6, vy: fl.vel.y, glide: fl.vel.y < -0.5 ? hv / -fl.vel.y : 0,
        agl: this.agl != null ? this.agl : 0, alt: P.y, prox: this.prox, pf: this.pf, score: this.score, mult: this.mult,
        gatesOk: this.gatesOk, gatesTotal: this.gatesTotal, time: fl.flightTime, adr: this.adr, g: fl.gSmooth,
        windRel: -wRel * 180 / Math.PI, windSpd: Math.hypot(wd.x, wd.z), warn: ph === 'flight' ? this.warn : 0,
        target: ph === 'flight' || ph === 'chute' ? tgt : null, hint: this.hint,
        phaseLbl: ph === 'chute' ? 'SPADOCHRON' : ph === 'ledge' ? 'NA KRAWĘDZI' : ''
      };
    }

    _target() {
      const w = this.world, P = this.fl.pos;
      if (!this.free && this.next < w.gates.length) {
        const g = w.gates[this.next];
        return { x: g.x, y: g.y, z: g.z, dist: Math.hypot(g.x - P.x, g.y - P.y, g.z - P.z), label: g.type === 'ring' ? `BRAMKA ${this.next + 1}` : g.type === 'most' ? 'POD MOST' : 'PRZEZ OKNO', special: g.type !== 'ring' };
      }
      const L = w.land;
      return { x: L.x, y: w.height(L.x, L.z, 0) + 2, z: L.z, dist: Math.hypot(L.x - P.x, L.z - P.z), label: 'LĄDOWISKO', special: false };
    }

    summary() {
      const r = this.result || {};
      return {
        ok: r.ok, kind: r.kind, score: Math.max(0, Math.round(this.score)), time: this.fl.flightTime, top: this.topSpeed, maxG: this.maxG,
        minProx: this.minProx, near: this.near, gatesOk: this.gatesOk, gatesTotal: this.gatesTotal, specials: this.specials,
        dist: this.dist, drop: this.world.L.exitH - this.fl.pos.y, closeTime: this.closeTime, lost: r.lost || 0, impact: r.impact,
        bonus: r.bonus || 0, landDist: r.landDist
      };
    }
  }

  WS.Game = Game;
})(window);
