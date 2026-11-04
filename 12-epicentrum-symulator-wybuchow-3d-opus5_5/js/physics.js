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
  // lambda: droga tłumienia w powietrzu (przejrzystość): ok. 80 km w czystym powietrzu, kilka km we mgle
  Ph.thermal = (d, Y4pi, lambda) => (Y4pi > 0 ? Y4pi * Math.exp(-d / (lambda || LAMBDA)) / (d * d) : 0);
  Ph.radiusForQ = function (q, Y4pi, lambda) {
    if (Y4pi <= 0) return 0;
    let lo = 1, hi = 2e6;
    for (let i = 0; i < 80; i++) {
      const mid = Math.sqrt(lo * hi);
      if (Ph.thermal(mid, Y4pi, lambda) > q) lo = mid; else hi = mid;
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
    const cosmic = !!w.cosmic;             // rozbłysk ciała kosmicznego: żar i fala, bez promieniowania i opadu
    const impact = !!w.impact;             // uderzenie planetoidy w ziemię: krater, wyrzut skał, wstrząs
    const ground = impact ? true : nuke ? !!opts.ground && !cosmic : true;
    const kt = nuke ? w.kt : w.tnt / 1e6;
    const Wtnt = nuke ? w.kt * 1e6 : w.tnt;      // kg TNT
    const hob = impact ? 1 : nuke ? (ground ? Math.max(1, (w.groundHob || 1)) : w.hob) : (opts.hob || 0);
    // Efektywna masa dla fali uderzeniowej: odbicie od ziemi (i fala Macha dla wybuchów w powietrzu)
    const Weff = nuke ? Wtnt * (ground ? 0.9 : 2.2) : Wtnt * (w.shaped ? 1.2 : 1.8);
    const cbrtW = Math.cbrt(Weff);
    const E = Wtnt * 4.184e6;                     // energia całkowita, J
    // uderzenie: tylko ok. 0,3% energii świeci (Collins i in. 2005), reszta idzie w krater, wyrzut i falę
    const Eth = impact ? E * 0.006 : nuke ? E * (cosmic ? 0.3 : 0.35) * (ground ? 0.7 : 1) : 0;
    const Y4pi = Eth / (4 * Math.PI);
    const ktS = Math.max(kt, 1);
    const burn3 = Ph.TH.burn3 * Math.pow(ktS / 15, 0.08);
    const ignite = Ph.TH.ignite * Math.pow(ktS / 15, 0.08);

    let fbR, tfb;
    if (impact) { fbR = 0.002 * Math.cbrt(E); tfb = Math.max(0.25, fbR / 4000); }
    else if (nuke) { fbR = 62 * Math.pow(kt, 0.4); tfb = 0.9 * Math.pow(kt, 0.25); }
    else { fbR = 1.93 * Math.pow(Wtnt, 0.32) * (w.fireMul || 1); tfb = Math.max(0.05, 0.12 * Math.pow(Wtnt, 0.25)); }
    const tpulse = impact ? tfb * 3 : nuke ? tfb * 1.3 : tfb;

    let craterR = 0, cr = null;
    if (impact) {
      cr = craterModel(w.craterD);
      craterR = cr.R;
    } else if (nuke) {
      if (ground) craterR = 25 * Math.cbrt(kt);
      else if (fbR > hob) craterR = 0; // kula ognia dotyka ziemi – szkliwienie, bez dużego krateru
    } else {
      craterR = (w.crater || 0.9) * Math.cbrt(Wtnt);
      if (hob > 0.5) craterR = 0;
    }
    const scorchR = nuke ? 0 : fbR * 2.6;

    // Chmura / słup dymu
    let Htop, capR, tRise;
    if (impact) {
      // pióropusz pary i pyłu nad kraterem
      Htop = Math.min(5500 * Math.pow(kt, 0.23), 120000);
      capR = Math.max(Htop * 0.62, craterR * 1.4);
      tRise = Math.min(150 * Math.pow(kt, 0.12), 900);
    } else if (cosmic) {
      Htop = hob + fbR * 2.5;
      capR = fbR * 1.2;
      tRise = 150 * Math.pow(kt, 0.12);
    } else if (nuke) {
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
    const lambda = opts.lambda || LAMBDA;
    const rQ = (q) => slantToGround(Ph.radiusForQ(q, Y4pi, lambda));
    const radii = {
      fireball: slantToGround(fbR) || 0,
      fireballAir: fbR,
      heavy: rP(Ph.TH.heavy),
      moderate: rP(Ph.TH.moderate),
      light: rP(14),          // 14 kPa: poważne uszkodzenia domów
      glass: rP(Ph.TH.glass),
      glass3: rP(3),
      burn3: rQ(burn3),
      burn1: rQ(Ph.TH.burn1),
      ignite: rQ(ignite),
      rad: nuke && !cosmic ? slantToGround(720 * Math.pow(kt, 0.19)) : 0,
      frag: w.frag ? w.frag : 0
    };
    const Rmax = Math.min(Math.max(Ph.radiusForP(1.2, cbrtW), fbR * 3, 10) * 1.05, 4e6);
    const front = Ph.buildFront(cbrtW, Rmax);

    // Opad promieniotwórczy (tylko wybuch przy ziemi)
    const fallout = nuke && ground && !cosmic ? { len: 4500 * Math.pow(kt, 0.45), wid: 900 * Math.pow(kt, 0.35) } : null;

    return {
      nuke, cosmic, impact, cr, ground, kt, lambda, Wtnt, Weff, cbrtW, hob, E, Eth, Y4pi, burn3, ignite,
      fbR, tfb, tpulse, craterR, scorchR, Htop, capR, tRise, radii, front, Rmax, fallout,
      // magnituda wstrząsu (Schultz i Gault, wg Collinsa i in. 2005)
      mag: impact ? 0.67 * Math.log10(E) - 5.87 : 0,
      // dalej niż na skraj makiety (400 km) fala nie jest oglądana
      tShockGlass: Ph.arrival(front, Math.min(Math.max(Ph.radiusForP(Ph.TH.glass, cbrtW), hob + 1), 400000))
    };
  };

  // Krater uderzeniowy: wymiary lejów i czasy (Melosh; Collins i in. 2005; Pike)
  //  type 0: prosty (misa), 1: złożony z centralnym wzniesieniem, 2: z pierścieniem szczytów
  function craterModel(Dm) {
    const R = Dm / 2, Dkm = Dm / 1000;
    const type = Dm < 4000 ? 0 : Dm < 40000 ? 1 : 2;
    const Rt = R * (type === 0 ? 0.8 : type === 1 ? 0.62 : 0.53);   // lej przejściowy
    const dT = 0.65 * Rt;                                              // jego głębokość (ok. 1/3 średnicy)
    const dF = type === 0 ? 0.36 * R : 250 * Math.pow(Dkm, 0.4);       // głębokość końcowa
    const hRim = type === 0 ? 0.072 * R : 36 * Math.pow(Dkm, 0.4);     // wysokość wału
    const tEx = 0.8 * Math.sqrt(2 * Rt / 9.81);                        // czas wykopu
    const tCol = type === 0 ? 0.6 * tEx : 1.6 * tEx;                   // osuwanie się ścian, wypiętrzenie dna
    return {
      R, D: Dm, type, Rt, dT, dF, hRim, lipT: hRim * 1.3, tEx, tCol, tForm: tEx + tCol,
      Hover: type === 2 ? 0.3 * dT : type === 1 ? 0.15 * dT : 0, cover: 1.7,
      melt: 0.35 + 0.65 * Math.min(1, Dkm / 20)
    };
  }
  Ph.craterModel = craterModel;
  // Stan krateru po czasie t: parametry profilu (te same co w shaderze)
  Ph.craterState = function (cr, t, out) {
    const aT = cr.Rt / cr.R;
    const o = out || {};
    o.upH = 0; o.upW = 0.15; o.blend = 0;
    if (t < cr.tEx) {
      const x = Math.max(t, 0) / cr.tEx, k = Math.pow(x, 0.4);
      o.a = Math.max(1e-3, aT * k); o.d = cr.dT * k; o.lip = cr.lipT * Math.sqrt(x); o.rim = o.a;
    } else {
      const tau = Math.min(1, (t - cr.tEx) / cr.tCol);
      o.a = aT; o.d = cr.dT; o.lip = cr.lipT;
      o.blend = tau * tau * (3 - 2 * tau);
      if (cr.type > 0 && tau < 1) {
        const tt = Math.min(1, tau * 1.15);
        o.upH = (cr.Hover + cr.dT) * Math.pow(Math.sin(Math.PI * tt), 1.5);
        o.upW = cr.type === 2 ? 0.12 + 0.3 * tau : 0.1 + 0.08 * tau;
      }
      o.rim = aT + (1 - aT) * o.blend;
    }
    // wyrzucone skały spadają coraz dalej (lot balistyczny)
    o.ej = Math.min(7, o.rim + 9.81 * t * t / (2 * cr.R));
    o.glow = cr.melt * Math.exp(-Math.max(0, t) / (cr.tForm * 4)) * Math.min(1, Math.max(0, t) / (cr.tEx * 0.3 + 1e-3));
    return o;
  };
  function ej(rho, r0, cov) {
    if (rho <= r0) return 1;
    const c = Math.pow(r0 / cov, 3);
    return Math.max(0, (Math.pow(r0 / rho, 3) - c) / (1 - c));
  }
  function step4(s) { const x = s * 4, f = x - Math.floor(x); const t = Math.min(1, Math.max(0, (f - 0.65) / 0.35)); return (Math.floor(x) + t * t * (3 - 2 * t)) / 4; }
  // Wysokość względem pierwotnego terenu w odległości rho = r / R (identyczna z GLSL w shaders.js)
  Ph.craterH = function (cr, s, rho) {
    const cov = cr.cover;
    if (rho >= cov) return 0;
    const x = rho / s.a;
    const hT = x < 1 ? -s.d + (s.d + s.lip) * x * x : s.lip * ej(x, 1, cov / s.a);
    const dF = cr.dF, hr = cr.hRim;
    let hF;
    if (rho >= 1) hF = hr * ej(rho, 1, cov);
    else if (cr.type === 0) hF = -dF + (dF + hr) * rho * rho;
    else {
      const rf = cr.type === 1 ? 0.55 : 0.6;
      if (rho < rf) {
        hF = -dF;
        if (cr.type === 1) hF += 0.55 * dF * Math.exp(-Math.pow(rho / 0.13, 2));
        else hF += 0.4 * dF * Math.exp(-Math.pow((rho - 0.45) / 0.07, 2));
      } else {
        const q = (rho - rf) / (1 - rf);
        const st = q + (step4(q) - q) * 0.35;
        hF = -dF + (dF + hr) * Math.pow(st, 1.4);
      }
    }
    let h = hT + (hF - hT) * s.blend;
    h += s.upH * Math.exp(-Math.pow(rho / Math.max(s.upW, 1e-3), 2));
    const e = Math.min(1, Math.max(0, (rho - cov * 0.94) / (cov * 0.06)));
    return h * (1 - e * e * (3 - 2 * e));
  };
})();
