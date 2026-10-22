/* sim.js – model widzenia: składanie efektów zaburzeń, akomodacja oka, mundury dla shaderów. */
(function () {
  'use strict';

  // Amplituda akomodacji (D) w zależności od wieku – średnie wartości kliniczne (Duane, uproszczone).
  const AMP_TABLE = [[0, 15], [10, 13.5], [20, 11], [25, 10], [30, 8.5], [35, 7], [40, 5.5], [45, 3.5], [50, 2], [55, 1.25], [60, 1], [70, 0.75], [80, 0.5]];
  function ampForAge(age) {
    if (age <= AMP_TABLE[0][0]) return AMP_TABLE[0][1];
    for (let i = 1; i < AMP_TABLE.length; i++) {
      const [a1, v1] = AMP_TABLE[i], [a0, v0] = AMP_TABLE[i - 1];
      if (age <= a1) return v0 + (v1 - v0) * (age - a0) / (a1 - a0);
    }
    return 0.5;
  }

  // Macierze Machado, Oliveira i Fernandes (2009) dla pełnej utraty danego typu czopków, liniowe RGB.
  const CVD = {
    protan: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
    deutan: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.011820, 0.042940, 0.968881],
    tritan: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.303900]
  };
  const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  // Zwraca macierz w kolejności kolumnowej (tak, jak chce WebGL).
  function cvdMatrix(type, sev) {
    const M = CVD[type] || I3;
    const s = type ? Math.max(0, Math.min(1, sev)) : 0;
    const r = M.map((v, i) => I3[i] + (v - I3[i]) * s);
    return new Float32Array([r[0], r[3], r[6], r[1], r[4], r[7], r[2], r[5], r[8]]);
  }

  function baseVision() {
    return {
      error: 0,            // D: + krótkowzroczność, − nadwzroczność (oko „za mocne” / „za słabe”)
      amp: ampForAge(25),  // możliwa akomodacja
      lens: 0,             // moc okularów
      cyl: 0, axisDeg: 90, // astygmatyzm
      baseD: 0,            // stałe rozmycie wyrażone w dioptriach niedoostrzenia
      comaD: 0, comaAng: -90,
      ghostD: 0, ghostAng: -110, ghostW: 0,
      pupilMul: 1,
      dipDeg: [0, 0], dipMix: 0,
      shakeAmp: 0, shakeFreq: 3, shakeKind: 'pendular',
      scatter: 0.025, veil: 0, tint: [1, 1, 1], exposure: 1, contrast: 0, nightBlind: 0, desat: 0,
      cvd: null, cvdSev: 0, mono: 0,
      glaucoma: 0, tunnel: 0, hemi: 0, hemiAmt: 0, scotoma: 0, metamorph: 0, detach: 0, dr: 0, edema: 0,
      floaters: 0, snow: 0, aura: 0, warp: 0, squint: 0, fieldDim: 0.6,
      dryEye: 0, flashes: 0, fatigue: false, fluct: 0, visusCap: 1,
      autoBlink: false
    };
  }

  /* Składa stan widzenia z aktywnych zaburzeń. active: [{cond, params, corrected}] */
  function compose(active, ctx) {
    const V = baseVision();
    for (const a of active) a.cond.apply(V, a.params, a.corrected, ctx);
    return V;
  }

  /* Oko z akomodacją: ostrzy na to, na co patrzysz – w granicach swoich możliwości i z opóźnieniem. */
  class Eye {
    constructor() { this.focus = 0; this.effort = 0; this.t = 0; this.init = false; }
    range(V) { const E = V.error + V.lens; return [E, E + Math.max(0, V.amp)]; }
    update(V, targetD, dt) {
      const [lo, hi] = this.range(V);
      let want = Math.max(lo, Math.min(hi, targetD));
      this.t += dt;
      // Zmęczenie akomodacji (nadwzroczność): przy dużym wysiłku ostrość „ucieka” falami.
      const effortWanted = V.amp > 0 ? (want - lo) / V.amp : 0;
      if (V.fatigue && effortWanted > 0.6) {
        const k = (effortWanted - 0.6) / 0.4;
        want -= k * (0.35 + 0.35 * Math.sin(this.t * 1.1) + 0.2 * Math.sin(this.t * 2.9)) * Math.min(1.2, V.amp * 0.3);
        want = Math.max(lo, want);
      }
      if (V.fluct) want += V.fluct;
      if (!this.init) { this.focus = want; this.init = true; }
      this.focus += (want - this.focus) * (1 - Math.exp(-dt / 0.2));
      this.effort = V.amp > 0 ? Math.max(0, Math.min(1, (this.focus - lo) / V.amp)) : 0;
      this.accom = Math.max(0, this.focus - lo);
      return this.focus;
    }
  }

  /* Przybliżona ostrość wzroku (visus dziesiętny) przy danym niedoostrzeniu. */
  function visus(defocusD, pupilMm, cap) {
    const b = Math.abs(defocusD) * Math.sqrt(pupilMm / 3);
    const v = 1 / (1 + 2.2 * b);
    return Math.min(cap, Math.max(0.02, v));
  }

  function opticsUniforms(V, focus, scene, nearD, uniformD, healthy) {
    const fov = scene.fovDeg * Math.PI / 180;
    const pupil = scene.pupilMm * (healthy ? 1 : V.pupilMul) / 1000;
    const K = (pupil / 2) / fov;
    const cyl = healthy ? 0 : V.cyl;
    const base = healthy ? 0 : V.baseD;
    const ax = (V.axisDeg || 0) * Math.PI / 180;
    const nr = K * (Math.max(Math.abs(nearD - focus) + cyl / 2, 0)) * 1.05 + K * base;
    const ca = V.comaAng * Math.PI / 180, ga = V.ghostAng * Math.PI / 180;
    return {
      uFocus: focus, uCyl: cyl, uK: K, uBase: K * base,
      uUniformD: uniformD >= 0 ? uniformD : -1, uEm: 48, uNearR: nr,
      uAx: [Math.cos(ax), Math.sin(ax)],
      uComa: healthy ? [0, 0] : [Math.cos(ca) * K * V.comaD, Math.sin(ca) * K * V.comaD],
      uGhost: healthy || !V.ghostW ? [0, 0, 0] : [Math.cos(ga) * K * V.ghostD, Math.sin(ga) * K * V.ghostD, V.ghostW]
    };
  }

  window.Sim = { ampForAge, cvdMatrix, baseVision, compose, Eye, visus, opticsUniforms };
})();
