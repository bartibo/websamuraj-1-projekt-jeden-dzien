// Kamera orbitalna: obrót, przesuwanie, przybliżanie (mysz i dotyk), płynne przeloty i tryb filmowy
(function () {
  const T = THREE;
  const Ut = EP.util;
  const Wd = EP.world;
  const K = EP.cam = {
    target: new T.Vector3(0, 0, 0), dist: 2600, theta: 0.9, phi: 1.0,
    tTarget: new T.Vector3(0, 0, 0), tDist: 2600, tTheta: 0.9, tPhi: 1.0,
    mode: 'orbit', userActive: 0, shake: 0, autoSpin: 0,
    film: { pos: new T.Vector3(), look: new T.Vector3(), w: 0 }
  };
  const MIN_D = 1.2, MAX_D = 380000;

  K.init = function (el) {
    let drag = null;
    const ptrs = new Map();
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      drag = { x: e.clientX, y: e.clientY, btn: e.button, moved: 0, t: performance.now(), shift: e.shiftKey };
      if (ptrs.size === 2) drag.pinch = pinchState();
    });
    el.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const prev = ptrs.get(e.pointerId);
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!drag) return;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved < 4) return;
      K.interrupt();
      if (ptrs.size >= 2) {
        const ps = pinchState();
        if (drag.pinch) {
          const k = drag.pinch.d / Math.max(10, ps.d);
          K.tDist = Ut.clamp(K.tDist * k, MIN_D, MAX_D);
          pan((ps.cx - drag.pinch.cx) * 0.5, (ps.cy - drag.pinch.cy) * 0.5);
          K.tTheta += (ps.a - drag.pinch.a);
        }
        drag.pinch = ps;
        return;
      }
      if (drag.btn === 2 || drag.btn === 1 || drag.shift) pan(dx, dy);
      else {
        K.tTheta -= dx * 0.0055;
        K.tPhi = Ut.clamp(K.tPhi - dy * 0.0045, 0.05, 1.53);
      }
    });
    const up = (e) => {
      ptrs.delete(e.pointerId);
      if (drag && ptrs.size === 0) {
        if (drag.moved < 6 && performance.now() - drag.t < 450 && drag.btn === 0 && K.onClick) K.onClick(e);
        drag = null;
      }
      if (drag && ptrs.size === 1) drag.pinch = null;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      K.interrupt();
      const k = Math.exp(Ut.clamp(e.deltaY, -200, 200) * 0.0015);
      K.tDist = Ut.clamp(K.tDist * k, MIN_D, MAX_D);
    }, { passive: false });
    function pinchState() {
      const a = [...ptrs.values()];
      const dx = a[1].x - a[0].x, dy = a[1].y - a[0].y;
      return { d: Math.hypot(dx, dy), cx: (a[0].x + a[1].x) / 2, cy: (a[0].y + a[1].y) / 2, a: Math.atan2(dy, dx) };
    }
  };
  function pan(dx, dy) {
    const s = K.dist * 0.0016;
    const fx = -Math.sin(K.theta), fz = -Math.cos(K.theta);
    const rx = Math.cos(K.theta), rz = -Math.sin(K.theta);
    K.tTarget.x += (-dx * rx + dy * fx) * s;
    K.tTarget.z += (-dx * rz + dy * fz) * s;
    K.tTarget.y = Wd.groundY(K.tTarget.x, K.tTarget.z);
  }
  K.pan = pan;
  // Użytkownik przejmuje kamerę – kończy tryb filmowy
  K.interrupt = function () { K.userActive = 1; K.autoSpin = 0; if (K.mode === 'film') K.mode = 'orbit'; K.fly = null; };

  K.flyTo = function (target, dist, phi, theta, dur) {
    K.fly = { t: 0, dur: dur || 1.6, a: { tg: K.tTarget.clone(), d: K.tDist, phi: K.tPhi, th: K.tTheta },
      b: { tg: target.clone(), d: dist, phi: phi !== undefined ? phi : K.tPhi, th: theta !== undefined ? theta : K.tTheta } };
    let dth = K.fly.b.th - K.fly.a.th;
    while (dth > Math.PI) dth -= Math.PI * 2; while (dth < -Math.PI) dth += Math.PI * 2;
    K.fly.b.th = K.fly.a.th + dth;
  };
  // Ustawienie kamery z pozycji i punktu patrzenia (po trybie filmowym)
  K.setFromPose = function (pos, look) {
    const d = pos.clone().sub(look);
    K.target.copy(look); K.tTarget.copy(look);
    K.dist = K.tDist = Math.max(MIN_D, d.length());
    K.theta = K.tTheta = Math.atan2(d.x, d.z);
    K.phi = K.tPhi = Ut.clamp(Math.acos(Ut.clamp(d.y / K.dist, -1, 1)), 0.05, 1.53);
  };

  const _p = new T.Vector3(), _l = new T.Vector3();
  K.update = function (dtR, camera) {
    if (K.fly) {
      const f = K.fly;
      f.t += dtR;
      const k = Ut.smooth(0, 1, Math.min(1, f.t / f.dur));
      K.tTarget.lerpVectors(f.a.tg, f.b.tg, k);
      K.tDist = Math.exp(Ut.lerp(Math.log(f.a.d), Math.log(f.b.d), k));
      K.tPhi = Ut.lerp(f.a.phi, f.b.phi, k);
      K.tTheta = Ut.lerp(f.a.th, f.b.th, k);
      if (f.t >= f.dur) K.fly = null;
    }
    if (K.autoSpin) K.tTheta += K.autoSpin * dtR;
    const a = 1 - Math.exp(-dtR * 7);
    K.target.lerp(K.tTarget, a);
    K.dist = Math.exp(Ut.lerp(Math.log(K.dist), Math.log(K.tDist), a));
    K.theta = Ut.lerp(K.theta, K.tTheta, a);
    K.phi = Ut.lerp(K.phi, K.tPhi, a);
    const sp = Math.sin(K.phi);
    _p.set(K.target.x + K.dist * sp * Math.sin(K.theta), K.target.y + K.dist * Math.cos(K.phi), K.target.z + K.dist * sp * Math.cos(K.theta));
    _l.copy(K.target);
    // tryb filmowy: płynne przejście do pozycji podanej przez lot pocisku
    const fl = K.film;
    fl.w = Ut.lerp(fl.w, K.mode === 'film' ? 1 : 0, 1 - Math.exp(-dtR * 3));
    if (fl.w > 0.001) {
      fl.cur = fl.cur || { p: fl.pos.clone(), l: fl.look.clone() };
      const b = 1 - Math.exp(-dtR * 6);
      fl.cur.p.lerp(fl.pos, b); fl.cur.l.lerp(fl.look, b);
      _p.lerp(fl.cur.p, fl.w); _l.lerp(fl.cur.l, fl.w);
    } else fl.cur = null;
    const gy = Wd.groundY(_p.x, _p.z) + Math.max(0.4, K.dist * 0.01);
    if (_p.y < gy) _p.y = gy;
    camera.position.copy(_p);
    if (K.shake > 0.0001) {
      const s = K.shake * Math.min(K.dist, 2000) * 0.012;
      camera.position.x += (Math.random() - 0.5) * s; camera.position.y += (Math.random() - 0.5) * s; camera.position.z += (Math.random() - 0.5) * s;
      K.shake *= Math.exp(-dtR * 3.5);
    }
    camera.lookAt(_l);
    K.viewDist = camera.position.distanceTo(_l);
  };
  K.snapFilm = function () { K.film.cur = { p: K.film.pos.clone(), l: K.film.look.clone() }; K.film.w = 1; };
})();
