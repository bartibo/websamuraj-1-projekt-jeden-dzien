// Dostarczenie ładunku: modele pocisków i ich lot do celu (z kamerą „filmową”)
(function () {
  const T = THREE;
  const Ut = EP.util;
  const Wd = EP.world;
  const F = EP.fx;
  const Dl = EP.delivery = {};

  const mat = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6, metalness: 0.2 }, o || {}));
  function cyl(r, len, m, seg) { const g = new T.CylinderGeometry(r, r, len, seg || 12); g.rotateX(Math.PI / 2); return new T.Mesh(g, m); }
  function cone(r, len, m) { const g = new T.ConeGeometry(r, len, 12); g.rotateX(Math.PI / 2); return new T.Mesh(g, m); }
  function box(x, y, z, m) { return new T.Mesh(new T.BoxGeometry(x, y, z), m); }
  function fins(grp, r, z, span, chord, m, n) {
    for (let i = 0; i < (n || 4); i++) {
      const f = box(0.02 + span * 0.02, span, chord, m);
      const a = i / (n || 4) * Math.PI * 2;
      f.position.set(Math.cos(a) * (r + span / 2), Math.sin(a) * (r + span / 2), z);
      f.rotation.z = a - Math.PI / 2;
      grp.add(f);
    }
  }
  // Modele: oś +Z = przód
  const MODELS = {
    dyn() {
      const g = new T.Group();
      const red = mat(0xc4301f, { roughness: 0.7, metalness: 0 });
      const s = cyl(0.016, 0.2, red); g.add(s);
      const band = cyl(0.0165, 0.03, mat(0xe8cf6a, { metalness: 0 })); g.add(band);
      const fuse = cyl(0.002, 0.09, mat(0x777066)); fuse.position.z = 0.14; g.add(fuse);
      g.userData.fuseTip = new T.Vector3(0, 0, 0.185);
      return g;
    },
    gren() {
      const g = new T.Group();
      const b = new T.Mesh(new T.SphereGeometry(0.033, 16, 12), mat(0x4f6630, { roughness: 0.8 })); b.scale.z = 1.3; g.add(b);
      const top = cyl(0.012, 0.03, mat(0x8a8d84)); top.position.z = 0.05; g.add(top);
      return g;
    },
    tank() {
      const g = new T.Group();
      const olive = mat(0x5b6136, { roughness: 0.85, metalness: 0.1 }), dark = mat(0x2a2b22, { roughness: 0.9 });
      const hull = box(3.6, 1.3, 7.2, olive); hull.position.y = 1.35; g.add(hull);
      for (const s of [-1, 1]) { const tr = box(0.7, 1.1, 7.6, dark); tr.position.set(s * 1.85, 0.6, 0); g.add(tr); }
      const tur = box(2.8, 0.95, 3.2, olive); tur.position.set(0, 2.45, -0.4); g.add(tur);
      const gun = cyl(0.1, 5.4, olive); gun.position.set(0, 2.5, 3.6); g.add(gun);
      g.userData.muzzle = new T.Vector3(0, 2.5, 6.3);
      return g;
    },
    shell() { const g = new T.Group(); const b = cyl(0.06, 0.55, mat(0xb39857, { metalness: 0.6 })); g.add(b); const n = cone(0.06, 0.2, mat(0x6f7d46)); n.position.z = 0.37; g.add(n); return g; },
    rpg() { const g = new T.Group(); const b = cyl(0.025, 0.6, mat(0x50583a)); g.add(b); const h = cone(0.045, 0.3, mat(0x6c7552)); h.position.z = 0.42; g.add(h); fins(g, 0.025, -0.28, 0.06, 0.06, mat(0x3c4228), 6); return g; },
    missile() { const g = new T.Group(); const b = cyl(0.09, 1.6, mat(0xd0d3d6, { metalness: 0.4 })); g.add(b); const n = cone(0.09, 0.25, mat(0xe2c04a)); n.position.z = 0.92; g.add(n); fins(g, 0.09, 0.4, 0.14, 0.12, mat(0x9aa1a6)); fins(g, 0.09, -0.7, 0.16, 0.14, mat(0x9aa1a6)); return g; },
    grad() { const g = new T.Group(); const b = cyl(0.061, 2.9, mat(0x6e7353)); g.add(b); const n = cone(0.061, 0.35, mat(0x4a4e38)); n.position.z = 1.62; g.add(n); fins(g, 0.061, -1.35, 0.12, 0.2, mat(0x4a4e38)); return g; },
    cruise() {
      const g = new T.Group(); const m = mat(0xc9ccd0, { metalness: 0.5, roughness: 0.4 });
      const b = cyl(0.26, 5.6, m); g.add(b); const n = new T.Mesh(new T.SphereGeometry(0.26, 12, 8), m); n.position.z = 2.8; n.scale.z = 1.5; g.add(n);
      const w = box(2.65, 0.04, 0.45, mat(0x9aa1a6)); w.position.z = 0.3; g.add(w);
      fins(g, 0.26, -2.5, 0.35, 0.35, mat(0x9aa1a6));
      return g;
    },
    ballistic() { const g = new T.Group(); const b = cyl(0.46, 6.2, mat(0xd8dbcd, { roughness: 0.5 })); g.add(b); const n = cone(0.46, 1.6, mat(0x7f8a6d)); n.position.z = 3.9; g.add(n); fins(g, 0.46, -2.7, 0.5, 0.9, mat(0x7f8a6d)); return g; },
    moab() {
      const g = new T.Group(); const m = mat(0x56644d, { roughness: 0.75 });
      const b = cyl(0.52, 7.4, m); g.add(b); const n = new T.Mesh(new T.SphereGeometry(0.52, 14, 10), m); n.scale.z = 2.2; n.position.z = 3.7; g.add(n);
      const fm = mat(0x3f4a39);
      for (let i = 0; i < 4; i++) { const f = box(1.0, 0.06, 0.9, fm); const a = i * Math.PI / 2; f.position.set(Math.cos(a) * 1.0, Math.sin(a) * 1.0, -3.6); f.rotation.z = a; g.add(f); }
      return g;
    },
    davy() { const g = new T.Group(); const b = new T.Mesh(new T.SphereGeometry(0.14, 16, 12), mat(0x9aa27e)); b.scale.z = 2.0; g.add(b); const t = cyl(0.04, 0.5, mat(0x6f7656)); t.position.z = -0.45; g.add(t); fins(g, 0.04, -0.62, 0.12, 0.12, mat(0x6f7656)); return g; },
    littleboy() { const g = new T.Group(); const m = mat(0x5b5f57, { roughness: 0.7 }); const b = cyl(0.36, 2.2, m); g.add(b); const n = new T.Mesh(new T.SphereGeometry(0.36, 14, 10), m); n.scale.z = 1.2; n.position.z = 1.1; g.add(n); const t = box(0.8, 0.8, 0.8, mat(0x4a4d46)); t.position.z = -1.4; g.add(t); return g; },
    rv() { const g = new T.Group(); const c = cone(0.28, 1.75, mat(0x2b2724, { roughness: 0.9 })); g.add(c); return g; },
    tsar() {
      const g = new T.Group(); const m = mat(0xd9d6cc, { roughness: 0.6 });
      const b = cyl(1.05, 6.5, m); g.add(b); const n = new T.Mesh(new T.SphereGeometry(1.05, 16, 12), m); n.scale.z = 1.6; n.position.z = 3.2; g.add(n);
      fins(g, 1.05, -3.2, 1.0, 1.4, mat(0xbab6aa));
      return g;
    },
    chute() {
      const g = new T.Group();
      const c = new T.Mesh(new T.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), new T.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.9, side: T.DoubleSide }));
      c.scale.set(22, 16, 22); c.position.y = 30; g.add(c);
      const lm = new T.LineBasicMaterial({ color: 0x9a948a });
      const pts = [];
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; pts.push(new T.Vector3(0, 0, 0), new T.Vector3(Math.cos(a) * 21, 37, Math.sin(a) * 21)); }
      g.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(pts), lm));
      return g;
    }
  };

  function place(obj) { Wd.scene.add(obj); return obj; }
  const v3 = (x, y, z) => new T.Vector3(x, y, z);

  // Kierunek nadlotu: od strony kamery, lekko z boku, żeby lot był widoczny
  function approachDir(target) {
    const cam = Wd.camera.position;
    const d = v3(cam.x - target.x, 0, cam.z - target.z);
    if (d.lengthSq() < 1) d.set(1, 0, 0);
    d.normalize();
    const a = 0.55;
    return v3(d.x * Math.cos(a) - d.z * Math.sin(a), 0, d.x * Math.sin(a) + d.z * Math.cos(a));
  }

  // Start dostarczenia. burst(pos, dir, i) wywoływane przy każdej detonacji.
  Dl.start = function (w, tgt, burstPos, burst) {
    const D = { t: 0, done: false, objs: [], cam: { pos: v3(0, 0, 0), look: v3(0, 0, 0), fov: 50 }, ts: () => 1 };
    const P = tgt.point.clone();
    const dir = approachDir(P);
    const add = (o) => { D.objs.push(place(o)); return o; };
    const camSet = (pos, look) => { D.cam.pos.copy(pos); D.cam.look.copy(look); };
    const finish = () => { D.done = true; for (const o of D.objs) Wd.scene.remove(o); };
    const kind = w.delivery;
    const look = new T.Vector3();

    if (kind === 'fuse') {
      const m = add(MODELS.dyn());
      const up = tgt.normal && tgt.normal.y > 0.5 ? 0 : 0;
      m.position.copy(P).add(v3(0, 0.017 + up, 0));
      m.rotation.y = Math.atan2(dir.x, dir.z) + 1.2;
      const FUSE = 3.0;
      D.ts = () => 1;
      D.update = function (dt) {
        D.t += dt;
        const k = Math.min(1, D.t / FUSE);
        const tip = m.userData.fuseTip.clone(); tip.z = 0.185 - 0.085 * k;
        m.localToWorld(tip);
        if (Math.random() < 0.9) F.trail(tip.x, tip.y, tip.z, 0.012, 'spark');
        if (Math.random() < 0.3) F.trail(tip.x, tip.y + 0.01, tip.z, 0.012, 'light');
        const ang = Math.atan2(dir.z, dir.x) + D.t * 0.15;
        camSet(v3(P.x + Math.cos(ang) * 1.1, P.y + 0.45, P.z + Math.sin(ang) * 1.1), P.clone().add(v3(0, 0.05, 0)));
        if (EP.audio) EP.audio.fuse(dt);
        if (D.t >= FUSE) { burst(m.position.clone(), null, 0); finish(); }
      };
    } else if (kind === 'throw') {
      const m = add(MODELS.gren());
      const start = P.clone().addScaledVector(dir, 14).add(v3(0, 1.7, 0));
      const FL = 1.1;
      const land = P.clone().addScaledVector(dir, 1.2);
      let rolling = false;
      D.update = function (dt) {
        D.t += dt;
        if (D.t < FL) {
          const k = D.t / FL;
          m.position.lerpVectors(start, land, k);
          m.position.y = Ut.lerp(start.y, land.y + 0.035, k) + 4.2 * k * (1 - k);
          m.rotation.x += dt * 12; m.rotation.y += dt * 7;
        } else {
          if (!rolling) { rolling = true; if (EP.audio) EP.audio.clink(); }
          const k = Math.min(1, (D.t - FL) / 0.6);
          m.position.lerpVectors(land, P, k * (2 - k)); m.position.y = P.y + 0.035;
          m.rotation.x += dt * 8 * (1 - k);
        }
        camSet(start.clone().addScaledVector(dir, 3).add(v3(0, 0.5, 0)), m.position.clone().lerp(P, 0.5));
        if (D.t >= 3.6) { burst(m.position.clone(), null, 0); finish(); }
      };
    } else if (kind === 'tank') {
      const tank = add(MODELS.tank());
      const ax = Math.abs(dir.x) > Math.abs(dir.z) ? v3(Math.sign(dir.x), 0, 0) : v3(0, 0, Math.sign(dir.z));
      const tp = P.clone().addScaledVector(ax, 280);
      if (ax.x !== 0) tp.z = Math.round(P.z / 120) * 120; else tp.x = Math.round(P.x / 120) * 120;
      if (Math.abs(tp.x - Wd.riverX(tp.z)) < 70) tp.addScaledVector(ax, 140);
      tp.y = Wd.groundY(tp.x, tp.z);
      tank.position.copy(tp);
      tank.lookAt(v3(P.x, tp.y, P.z));
      const muzzle = tank.localToWorld(tank.userData.muzzle.clone());
      const shell = add(MODELS.shell()); shell.visible = false;
      const AIM = 1.3, SPEED = 900;
      const dist = muzzle.distanceTo(P);
      const fwd = P.clone().sub(muzzle).normalize();
      let fired = false;
      D.ts = () => (D.t < AIM ? 1 : 0.1);
      D.update = function (dt) {
        D.t += dt;
        const back = tp.clone().addScaledVector(fwd, -16).add(v3(fwd.z * 6, 5, -fwd.x * 6));
        if (D.t >= AIM && !fired) { fired = true; F.muzzle(muzzle.x, muzzle.y, muzzle.z, fwd, 1.2); shell.visible = true; if (EP.audio) EP.audio.cannon(); tank.position.addScaledVector(fwd, -0.3); }
        if (fired) {
          const s = (D.t - AIM) * SPEED;
          shell.position.copy(muzzle).addScaledVector(fwd, Math.min(s, dist));
          shell.lookAt(P);
          F.trail(shell.position.x, shell.position.y, shell.position.z, 0.15, 'fire');
          camSet(back, shell.position.clone().lerp(P, 0.6));
          if (s >= dist) { burst(P.clone(), fwd, 0); shell.visible = false; D.done = true; D.keep = tank; }
        } else camSet(back, P);
      };
      D.cleanupLater = () => { Wd.scene.remove(tank); };
    } else if (kind === 'rpg') {
      const m = add(MODELS.rpg());
      const start = P.clone().addScaledVector(dir, 75); start.y = Math.max(P.y, 0) + 1.6;
      const fwd = P.clone().sub(start).normalize();
      const dist = start.distanceTo(P);
      F.muzzle(start.x, start.y, start.z, fwd.clone().negate(), 0.5);
      if (EP.audio) EP.audio.rocket(0.6);
      D.ts = () => 0.3;
      D.update = function (dt) {
        D.t += dt;
        const v = Math.min(300, 120 + D.t * 600);
        const s = Math.min(dist, 120 * D.t + 300 * D.t * D.t);
        m.position.copy(start).addScaledVector(fwd, s); m.lookAt(P);
        F.trail(m.position.x, m.position.y, m.position.z, 0.15, 'light');
        F.trail(m.position.x, m.position.y, m.position.z, 0.08, 'fire');
        camSet(P.clone().addScaledVector(dir, 22).add(v3(fwd.z * 14, 9, -fwd.x * 14)), m.position.clone().lerp(P, 0.6));
        if (s >= dist) { burst(P.clone().addScaledVector(fwd, -0.2), fwd, 0); finish(); }
        void v;
      };
    } else if (kind === 'drone' || kind === 'cruise' || kind === 'ballistic' || kind === 'reentry') {
      const cfg = {
        drone: { m: 'missile', back: 1700, up: 1100, speed: 430, trail: 'light', ts: 1, camB: 10, camU: 2.5, ts2: 0.6 },
        cruise: { m: 'cruise', back: 2600, up: 45, speed: 245, trail: 'light', ts: 1.4, camB: 22, camU: 5, ts2: 0.7 },
        ballistic: { m: 'ballistic', back: 1500, up: 6200, speed: 2000, trail: 'plasma', ts: 0.45, camB: 40, camU: 8, ts2: 0.3 },
        reentry: { m: 'rv', back: 7000, up: 16000, speed: 5200, trail: 'plasma', ts: 0.5, camB: 30, camU: 6, ts2: 0.35 }
      }[kind];
      const m = add(MODELS[cfg.m]());
      const end = burstPos.clone();
      const start = end.clone().addScaledVector(dir, cfg.back); start.y = end.y + cfg.up;
      if (kind === 'cruise') start.y = Math.max(Wd.groundY(start.x, start.z) + 45, P.y + 45);
      // trajektoria: prosta, a dla pocisku manewrującego lot nisko i nurkowanie na końcu
      const path = (k) => {
        if (kind !== 'cruise') return start.clone().lerp(end, k);
        const p = start.clone().lerp(end, k);
        const kk = Ut.smooth(0.82, 0.93, k), dive = Ut.smooth(0.93, 1, k);
        p.y = Ut.lerp(start.y, end.y + 140, kk);
        p.y = Ut.lerp(p.y, end.y, dive);
        return p;
      };
      const len = start.distanceTo(end) * (kind === 'cruise' ? 1.03 : 1);
      const dur = len / cfg.speed;
      if (EP.audio) EP.audio.rocket(kind === 'cruise' ? 0.4 : 0.8);
      D.ts = () => (D.t > dur - 0.5 ? cfg.ts2 : cfg.ts);
      D.update = function (dt) {
        D.t += dt;
        const k = Math.min(1, D.t / dur);
        const p = path(k), pn = path(Math.min(1, k + 0.002));
        m.position.copy(p);
        if (pn.distanceToSquared(p) > 1e-6) m.lookAt(pn);
        const fwd = pn.clone().sub(p).normalize();
        const n = kind === 'reentry' || kind === 'ballistic' ? 3 : 1;
        for (let i = 0; i < n; i++) {
          const q = p.clone().addScaledVector(fwd, -i * cfg.speed * dt / n);
          F.trail(q.x, q.y, q.z, kind === 'reentry' ? 3 : kind === 'ballistic' ? 2 : 0.5, cfg.trail);
          if (cfg.trail === 'plasma') F.trail(q.x, q.y, q.z, kind === 'reentry' ? 4 : 2.5, 'light');
        }
        if (cfg.trail === 'light') F.trail(p.x, p.y, p.z, kind === 'cruise' ? 0.6 : 0.3, 'fire');
        const side = v3(fwd.z, 0, -fwd.x).normalize();
        const cp = p.clone().addScaledVector(fwd, -cfg.camB).addScaledVector(side, cfg.camB * 0.35); cp.y += cfg.camU;
        const gy = Wd.groundY(cp.x, cp.z) + 2; if (cp.y < gy) cp.y = gy;
        look.copy(p).addScaledVector(fwd, cfg.camB * 2);
        if (k > 0.9) look.lerp(end, (k - 0.9) * 10);
        camSet(cp, look);
        if (k >= 1) { burst(end.clone(), fwd, 0); finish(); }
      };
    } else if (kind === 'salvo') {
      const N = w.salvo || 20;
      const rk = [];
      const inc = v3(dir.x * 0.7, 0.72, dir.z * 0.7).normalize();
      const fwd = inc.clone().negate();
      const ax = v3(dir.x, 0, dir.z);
      const pr = v3(-dir.z, 0, dir.x);
      for (let i = 0; i < N; i++) {
        const a = (Math.random() - 0.5) * 2, b = (Math.random() - 0.5) * 2;
        const gp = P.clone().addScaledVector(ax, a * 150).addScaledVector(pr, b * 70);
        gp.y = Wd.groundY(gp.x, gp.z);
        const m = add(MODELS.grad()); m.visible = false;
        rk.push({ m, end: gp, t0: i * 0.5, dur: 2.2, done: false, start: gp.clone().addScaledVector(inc, 1500) });
      }
      if (EP.audio) EP.audio.rocket(1);
      const camP = P.clone().addScaledVector(dir, 420).add(v3(0, 260, 0));
      D.ts = () => 1;
      D.update = function (dt) {
        D.t += dt;
        let left = 0;
        for (const r of rk) {
          if (r.done) continue;
          left++;
          const k = (D.t - r.t0) / r.dur;
          if (k < 0) continue;
          r.m.visible = true;
          r.m.position.lerpVectors(r.start, r.end, Math.min(1, k));
          r.m.lookAt(r.end);
          F.trail(r.m.position.x, r.m.position.y, r.m.position.z, 0.5, 'light');
          F.trail(r.m.position.x, r.m.position.y, r.m.position.z, 0.4, 'fire');
          if (k >= 1) { r.done = true; r.m.visible = false; burst(r.end.clone(), fwd, rk.indexOf(r)); }
        }
        camSet(camP, P);
        if (!left) finish();
      };
    } else if (kind === 'bombfall' || kind === 'bombhigh' || kind === 'recoilless') {
      const mname = kind === 'bombfall' ? 'moab' : kind === 'bombhigh' ? 'littleboy' : 'davy';
      const m = add(MODELS[mname]());
      const end = burstPos.clone();
      let start, dur;
      if (kind === 'bombfall') { start = end.clone().addScaledVector(dir, 260); start.y = end.y + 620; dur = 11.2; }
      else if (kind === 'bombhigh') { start = end.clone().addScaledVector(dir, 400); start.y = end.y + 1500; dur = 6.0; }
      else { start = P.clone().addScaledVector(dir, 1900); start.y = Wd.groundY(start.x, start.z) + 1.5; dur = 7.5; }
      // rzut ukośny dokładnie do punktu wybuchu
      const g = 9.81;
      const v0 = v3((end.x - start.x) / dur, (end.y - start.y + 0.5 * g * dur * dur) / dur, (end.z - start.z) / dur);
      const pos = (t) => v3(start.x + v0.x * t, start.y + v0.y * t - 0.5 * g * t * t, start.z + v0.z * t);
      if (kind === 'recoilless') { F.muzzle(start.x, start.y, start.z, v0.clone().normalize(), 0.8); if (EP.audio) EP.audio.cannon(); }
      else if (EP.audio) EP.audio.whistle(dur);
      D.ts = () => (kind === 'bombfall' ? 2.2 : kind === 'bombhigh' ? 1.2 : 1.6);
      D.update = function (dt) {
        D.t += dt;
        const t = Math.min(D.t, dur);
        const p = pos(t), pn = pos(t + 0.02);
        m.position.copy(p); m.lookAt(pn);
        const fwd = pn.clone().sub(p).normalize();
        if (kind === 'recoilless') F.trail(p.x, p.y, p.z, 0.2, 'light');
        const side = v3(fwd.z, 0, -fwd.x).normalize();
        const back = kind === 'recoilless' ? 6 : 22;
        const cp = p.clone().addScaledVector(fwd, -back).addScaledVector(side, back * 0.5); cp.y += back * 0.25;
        const gy = Wd.groundY(cp.x, cp.z) + 2; if (cp.y < gy) cp.y = gy;
        camSet(cp, p.clone().addScaledVector(fwd, back * 3).lerp(end, 0.3));
        if (D.t >= dur) { burst(end.clone(), fwd, 0); finish(); }
      };
    } else if (kind === 'parachute') {
      const bomb = add(MODELS.tsar());
      const chute = add(MODELS.chute());
      const end = burstPos.clone();
      const start = end.clone().add(v3(0, 900, 0));
      const dur = 900 / 25;
      D.ts = () => 9;
      D.update = function (dt) {
        D.t += dt;
        const p = start.clone().lerp(end, Math.min(1, D.t / dur));
        p.x += Math.sin(D.t * 0.15) * 4;
        bomb.position.copy(p); bomb.lookAt(p.x, p.y - 10, p.z);
        bomb.rotation.z += Math.sin(D.t * 0.3) * 0.02;
        chute.position.copy(p).add(v3(0, 4, 0));
        chute.rotation.y = D.t * 0.05;
        const ang = Math.atan2(dir.z, dir.x) + D.t * 0.02;
        camSet(v3(p.x + Math.cos(ang) * 110, p.y + 25, p.z + Math.sin(ang) * 110), p.clone().add(v3(0, 6, 0)));
        if (D.t >= dur) { burst(end.clone(), null, 0); finish(); }
      };
    }
    return D;
  };
})();
