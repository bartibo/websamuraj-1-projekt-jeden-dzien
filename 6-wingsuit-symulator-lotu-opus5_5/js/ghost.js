/* Na Krawędzi – duch rekordu: zapis najlepszego lotu (10 klatek na sekundę) i odtwarzanie go obok pilota */
(function (root) {
  'use strict';
  const WS = root.WS;
  const { clamp, smoothstep } = WS.U;
  const V3 = THREE.Vector3;

  // pola klatki: czas, pozycja, przód ciała, góra ciała, kurs (x, z), czasza, faza, nadmuch, flagi (złożone/rozłożone)
  const NF = 16;
  const PHASES = ['ledge', 'flight', 'chute', 'landed', 'crashed'];

  // Z klatek powtórki (40 na sekundę, game.frames) robi zwarty zapis liczb całkowitych do localStorage
  function encode(frames) {
    const f = [];
    for (let i = 0; i < frames.length; i += 4) {
      const r = frames[i];
      f.push(Math.round(r[0] * 100), Math.round(r[1] * 10), Math.round(r[2] * 10), Math.round(r[3] * 10),
        Math.round(r[7] * 100), Math.round(r[8] * 100), Math.round(r[9] * 100),
        Math.round(r[10] * 100), Math.round(r[11] * 100), Math.round(r[12] * 100),
        Math.round(r[16] * 100), Math.round(r[17] * 100), Math.round(r[19] * 100), r[20], Math.round(r[23] * 100), r[21] | (r[22] << 1));
    }
    return f;
  }

  class Ghost {
    constructor(scene) {
      this.pilot = new WS.Pilot(scene, { ghost: true });
      this.pilot.root.visible = false;
      this.data = null;
      this.s = {
        pos: new V3(), vel: new V3(), fwdB: new V3(), upB: new V3(), right: new V3(), heading: new V3(), vdir: new V3(),
        bank: 0, chute: 0, phase: 'flight', tuck: false, spread: false, inflate: 1, upright: 0, airspeed: 0, brake: 0, flightTime: 0, lastRoll: 0
      };
      this._a = new V3();
    }

    set(rec) { this.data = rec && rec.f && rec.f.length >= NF * 2 ? rec : null; this.hide(); this.pilot.resetTrails(); }
    hide() { this.pilot.root.visible = false; this.pilot.chuteGrp.visible = false; }

    // Stan ducha w chwili t lotu (sekundy od skoku); null, gdy duch już skończył lot
    sample(t) {
      const F = this.data.f, n = F.length / NF;
      const T = (i) => F[i * NF] / 100;
      if (t > T(n - 1) + 1.5) return null;
      let lo = 0, hi = n - 1;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (T(m) <= t) lo = m; else hi = m - 1; }
      const i = lo, j = Math.min(n - 1, i + 1);
      const ta = T(i), tb = T(j);
      const k = tb > ta ? clamp((t - ta) / (tb - ta), 0, 1) : 0;
      const L = (q, sc) => (F[i * NF + q] + (F[j * NF + q] - F[i * NF + q]) * k) / sc;
      const s = this.s;
      s.pos.set(L(1, 10), L(2, 10), L(3, 10));
      if (tb > ta) s.vel.set((F[j * NF + 1] - F[i * NF + 1]) / 10, (F[j * NF + 2] - F[i * NF + 2]) / 10, (F[j * NF + 3] - F[i * NF + 3]) / 10).multiplyScalar(1 / (tb - ta));
      s.fwdB.set(L(4, 100), L(5, 100), L(6, 100)).normalize();
      s.upB.set(L(7, 100), L(8, 100), L(9, 100)).normalize();
      s.heading.set(L(10, 100), 0, L(11, 100)).normalize();
      s.chute = L(12, 100);
      s.phase = PHASES[F[i * NF + 13]] || 'flight';
      if (s.phase === 'landed' || s.phase === 'crashed') s.phase = 'chute';
      s.inflate = L(14, 100);
      const fl = F[i * NF + 15];
      s.tuck = !!(fl & 1); s.spread = !!(fl & 2);
      s.upright = s.phase === 'chute' ? smoothstep(0, 0.8, s.chute) : 0;
      s.airspeed = s.vel.length();
      s.flightTime = t;
      return s;
    }

    // co klatkę: duch leci w tym samym czasie lotu co gracz; znika, gdy jest tuż przy kamerze
    update(t, dt, time, camera, active) {
      if (!this.data || !active) { this.hide(); return; }
      const s = this.sample(t);
      if (!s) { this.hide(); return; }
      const d = s.pos.distanceTo(camera.position);
      this.pilot.update(s, dt, time, camera, d > 5);
      this.pilot.setGhostFade(smoothstep(5, 14, d));
    }
  }

  WS.Ghost = Ghost;
  WS.ghostEncode = encode;
})(window);
