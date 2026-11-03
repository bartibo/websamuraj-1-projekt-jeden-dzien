// Fizyka wybuchu: nadciśnienie (Kinney–Graham), prędkość czoła fali, promieniowanie cieplne,
// kula ognia, krater, chmura. Jednostki: metry, sekundy, kilogramy TNT, kPa, J/m².
(function () {
  const Ph = EP.phys = {};
  const P0 = 101.325;          // ciśnienie atmosferyczne, kPa
  const C0 = 343;              // prędkość dźwięku, m/s
  const LAMBDA = 80000;        // droga tłumienia promieniowania cieplnego w powietrzu, m
  Ph.P0 = P0; Ph.C0 = C0; Ph.LAMBDA = LAMBDA;

  // Nadciśnienie szczytowe w funkcji odległości skalowanej Z = R / W^(1/3)  [m/kg^(1/3)]
  function kgRatio(Z) {
    Z = Math.max(Z, 0.06);
    const a = Z / 4.5, b = Z / 0.048, c = Z / 0.32, d = Z / 1.35;
    return 808 * (1 + a * a) / Math.sqrt((1 + b * b) * (1 + c * c) * (1 + d * d));
  }
  Ph.overpressure = (R, cbrtW) => P0 * kgRatio(R / cbrtW);

  // Odległość, na której nadciśnienie spada do p (kPa)
  Ph.radiusForP = function (p, cbrtW) {
    const target = p / P0;
    let lo = 0.06, hi = 2e4;
    if (kgRatio(lo) < target) return 0;
    for (let i = 0; i < 80; i++) {
      const mid = Math.sqrt(lo * hi);
      if (kgRatio(mid) > target) lo = mid; else hi = mid;
    }
    return lo * cbrtW;
  };

  // Strumień energii cieplnej (J/m²) w odległości d
  Ph.thermal = (d, Y4pi) => (Y4pi > 0 ? Y4pi * Math.exp(-d / LAMBDA) / (d * d) : 0);
  Ph.radiusForQ = function (q, Y4pi) {
    if (Y4pi <= 0) return 0;
    let lo = 1, hi = 2e6;
    for (let i = 0; i < 80; i++) {
      const mid = Math.sqrt(lo * hi);
      if (Ph.thermal(mid, Y4pi) > q) lo = mid; else hi = mid;
    }
    return lo;
  };

  // Tablica czasu dotarcia czoła fali: t(R). Prędkość czoła z równań Rankine'a–Hugoniota.
  Ph.buildFront = function (cbrtW, Rmax) {
    const N = 360;
    const R0 = 0.06 * cbrtW;
    const Rs = new Float64Array(N), Ts = new Float64Array(N);
    let t = 0, prevR = R0, prevU = speed(R0);
    Rs[0] = R0; Ts[0] = 0;
    for (let i = 1; i < N; i++) {
      const R = R0 * Math.pow(Rmax / R0, i / (N - 1));
      const U = speed(R);
      t += (R - prevR) * 0.5 * (1 / U + 1 / prevU);
      Rs[i] = R; Ts[i] = t; prevR = R; prevU = U;
    }
    function speed(R) {
      const p = Ph.overpressure(R, cbrtW);
      return C0 * Math.sqrt(1 + 6 * p / (7 * P0));
    }
    return { R: Rs, T: Ts, Rmax: Rmax, tMax: t, R0: R0 };
  };
  // Promień czoła po czasie t
  Ph.frontAt = function (f, t) {
    if (t <= 0) return 0;
    const T = f.T, R = f.R, n = T.length;
    if (t >= T[n - 1]) return R[n - 1] + (t - T[n - 1]) * C0;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] > t) hi = m; else lo = m; }
    const k = (t - T[lo]) / (T[hi] - T[lo]);
    return R[lo] + (R[hi] - R[lo]) * k;
  };
  // Czas dotarcia czoła na odległość R
  Ph.arrival = function (f, Rq) {
    const T = f.T, R = f.R, n = R.length;
    if (Rq <= R[0]) return 0;
    if (Rq >= R[n - 1]) return T[n - 1] + (Rq - R[n - 1]) / C0;
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (R[m] > Rq) hi = m; else lo = m; }
    return T[lo] + (T[hi] - T[lo]) * (Rq - R[lo]) / (R[hi] - R[lo]);
  };

  // Progi skutków (kPa i J/m²)
  Ph.TH = {
    glass: 5, light: 7, moderate: 35, heavy: 140,
    burn1: 84e3, burn3: 335e3, ignite: 500e3
  };

  // Wszystkie parametry wybuchu dla danej broni i opcji
  Ph.derive = function (w, opts) {
    opts = opts || {};
    const nuke = !!w.kt;
    const ground = nuke ? !!opts.ground : true;
    const kt = nuke ? w.kt : w.tnt / 1e6;
    const Wtnt = nuke ? w.kt * 1e6 : w.tnt;      // kg TNT
    const hob = nuke ? (ground ? Math.max(1, (w.groundHob || 1)) : w.hob) : (opts.hob || 0);
    // Efektywna masa dla fali uderzeniowej: odbicie od ziemi (i fala Macha dla wybuchów w powietrzu)
    const Weff = nuke ? Wtnt * (ground ? 0.9 : 2.2) : Wtnt * (w.shaped ? 1.2 : 1.8);
    const cbrtW = Math.cbrt(Weff);
    const E = Wtnt * 4.184e6;                     // energia całkowita, J
    const Eth = nuke ? E * 0.35 * (ground ? 0.7 : 1) : 0;
    const Y4pi = Eth / (4 * Math.PI);
    const ktS = Math.max(kt, 1);
    const burn3 = Ph.TH.burn3 * Math.pow(ktS / 15, 0.08);
    const ignite = Ph.TH.ignite * Math.pow(ktS / 15, 0.08);

    let fbR, tfb;
    if (nuke) { fbR = 62 * Math.pow(kt, 0.4); tfb = 0.9 * Math.pow(kt, 0.25); }
    else { fbR = 1.93 * Math.pow(Wtnt, 0.32) * (w.fireMul || 1); tfb = Math.max(0.05, 0.12 * Math.pow(Wtnt, 0.25)); }
    const tpulse = nuke ? tfb * 1.3 : tfb;

    let craterR = 0;
    if (nuke) {
      if (ground) craterR = 25 * Math.cbrt(kt);
      else if (fbR > hob) craterR = 0; // kula ognia dotyka ziemi – szkliwienie, bez dużego krateru
    } else {
      craterR = (w.crater || 0.9) * Math.cbrt(Wtnt);
      if (hob > 0.5) craterR = 0;
    }
    const scorchR = nuke ? 0 : fbR * 2.6;

    // Chmura / słup dymu
    let Htop, capR, tRise;
    if (nuke) {
      Htop = 5500 * Math.pow(kt, 0.23);
      Htop = Math.max(Htop, hob + fbR * 4);
      capR = Htop * (kt > 1000 ? 0.62 : 0.42);
      tRise = 150 * Math.pow(kt, 0.12);
    } else {
      Htop = 20 * Math.cbrt(Wtnt) + 6;
      capR = Htop * 0.35;
      tRise = 6 + 3 * Math.cbrt(Wtnt);
    }

    const slantToGround = (R) => (R > hob ? Math.sqrt(R * R - hob * hob) : 0);
    const rP = (p) => slantToGround(Ph.radiusForP(p, cbrtW));
    const rQ = (q) => slantToGround(Ph.radiusForQ(q, Y4pi));
    const radii = {
      fireball: slantToGround(fbR) || 0,
      fireballAir: fbR,
      heavy: rP(Ph.TH.heavy),
      moderate: rP(Ph.TH.moderate),
      light: rP(14),          // 14 kPa: poważne uszkodzenia domów
      glass: rP(Ph.TH.glass),
      burn3: rQ(burn3),
      burn1: rQ(Ph.TH.burn1),
      ignite: rQ(ignite),
      rad: nuke ? slantToGround(720 * Math.pow(kt, 0.19)) : 0,
      frag: w.frag ? w.frag : 0
    };
    const Rmax = Math.max(Ph.radiusForP(1.2, cbrtW), fbR * 3, 10) * 1.05;
    const front = Ph.buildFront(cbrtW, Rmax);

    // Opad promieniotwórczy (tylko wybuch przy ziemi)
    const fallout = nuke && ground ? { len: 4500 * Math.pow(kt, 0.45), wid: 900 * Math.pow(kt, 0.35) } : null;

    return {
      nuke, ground, kt, Wtnt, Weff, cbrtW, hob, E, Eth, Y4pi, burn3, ignite,
      fbR, tfb, tpulse, craterR, scorchR, Htop, capR, tRise, radii, front, Rmax, fallout,
      tShockGlass: Ph.arrival(front, Math.max(Ph.radiusForP(Ph.TH.glass, cbrtW), hob + 1))
    };
  };
})();
