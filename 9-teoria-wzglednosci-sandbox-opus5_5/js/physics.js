/* =====================================================================
   Gumowy czas – fizyka i formatowanie liczb
   Szczególna teoria względności (prędkość) i metryka Schwarzschilda
   (grawitacja nieobracającego się ciała). Wszystkie liczby na zegarach
   pochodzą stąd i są dokładne; animacje bywają nie w skali.
   ===================================================================== */
'use strict';
window.Rel = window.Rel || {};

(function (R) {
  const C = 299792458;            // m/s
  const G = 6.6743e-11;           // m³/(kg·s²)
  const MSUN = 1.98847e30;        // kg
  const MEARTH = 5.9722e24;       // kg
  const DAY = 86400;
  const YEAR = 365.25 * DAY;
  const LY = C * YEAR;            // rok świetlny w metrach
  const PROXIMA_LY = 4.2465;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rsOf = M => 2 * G * M / (C * C);   // promień Schwarzschilda

  /* ---------------- źródła grawitacji (rosnąca masa) ---------------- */
  const BODIES = [
    { id: 'moon', name: 'Księżyc', short: 'Księżyc', kind: 'moon', M: 7.342e22, R: 1.7374e6,
      blurb: 'Mały i lekki: jego grawitacja ledwo muska czas.' },
    { id: 'earth', name: 'Ziemia', short: 'Ziemia', kind: 'earth', M: MEARTH, R: 6.371e6,
      blurb: 'Nasza planeta. Efekt jest maleńki, ale satelity GPS muszą go uwzględniać.' },
    { id: 'jupiter', name: 'Jowisz', short: 'Jowisz', kind: 'jupiter', M: 1.8982e27, R: 6.9911e7,
      blurb: 'Największa planeta Układu Słonecznego, 318 razy cięższa od Ziemi.' },
    { id: 'sun', name: 'Słońce', short: 'Słońce', kind: 'sun', M: MSUN, R: 6.957e8,
      blurb: 'Zwykła gwiazda. 333 tysiące razy cięższa od Ziemi, ale rozdęta i rzadka.' },
    { id: 'wd', name: 'Biały karzeł (Syriusz B)', short: 'Syriusz B', kind: 'wd', M: 1.018 * MSUN, R: 5.84e6,
      blurb: 'Wypalona gwiazda: masa Słońca ściśnięta do rozmiaru Ziemi. Łyżeczka waży tonę.' },
    { id: 'ns', name: 'Gwiazda neutronowa', short: 'Gw. neutronowa', kind: 'ns', M: 2.08 * MSUN, R: 1.24e4,
      blurb: 'Dwa Słońca ściśnięte w kulę wielkości miasta (średnica ok. 25 km). Łyżeczka waży miliard ton.' },
    { id: 'bh', name: 'Czarna dziura', short: 'Czarna dziura', kind: 'bh', M: 10 * MSUN, R: 0,
      blurb: 'Tyle masy w tak małym miejscu, że nawet światło nie może uciec spod horyzontu zdarzeń.' },
    { id: 'smbh', name: 'Supermasywna czarna dziura (Sgr A*)', short: 'Sgr A*', kind: 'bh', M: 4.3e6 * MSUN, R: 0,
      blurb: 'Olbrzym w środku naszej Galaktyki: 4,3 miliona mas Słońca.' }
  ];
  BODIES.forEach(b => { b.rs = rsOf(b.M); if (b.kind === 'bh') b.R = b.rs; });

  // Granica Buchdahla: ciało bardziej zwarte niż rs/R = 8/9 nie może istnieć
  const BUCHDAHL = 8 / 9;

  /** Ciało dla położenia suwaka masy t ∈ [0, BODIES.length-1]. Między
   *  wzorcami masa i promień zmieniają się logarytmicznie. */
  function bodyAt(t) {
    const n = BODIES.length;
    t = clamp(t, 0, n - 1);
    const i = Math.min(Math.floor(t), n - 2);
    const f = t - i;
    const a = BODIES[i], b = BODIES[i + 1];
    const M = Math.exp(lerp(Math.log(a.M), Math.log(b.M), f));
    const rs = rsOf(M);
    let Rr, bh = false;
    if (a.kind === 'bh' && b.kind === 'bh') { Rr = rs; bh = true; }
    else if (b.kind === 'bh' && f > 1 - 1e-6) { Rr = rs; bh = true; }
    else Rr = Math.exp(lerp(Math.log(a.R), Math.log(b.R), f));
    const c = bh ? 1 : rs / Rr;
    const near = f < 0.5 ? a : b;
    const exact = Math.min(f, 1 - f) < 0.035 || (a.kind === 'bh' && b.kind === 'bh' && near === a && f < 0.035);
    return {
      t, M, R: Rr, rs, c, bh, kind: near.kind, near, from: a, to: b, f, exact,
      impossible: !bh && c > BUCHDAHL,
      deltaSurf: bh ? 1 : c / (1 + Math.sqrt(1 - c)) // 1 - tempo na powierzchni
    };
  }
  function sliderOfBody(id) { return BODIES.findIndex(b => b.id === id); }

  /* --------------------------- prędkość --------------------------- */
  // Suwak x ∈ [0,1]. Odcinkami liniowo w g = log10(β/(1-β)):
  //   [0, XA]   β od 0 do 1e-7 (do ~30 m/s),
  //   [XA, XB]  g od -7 do -1 (codzienne prędkości → 9% c),
  //   [XB, 1]   g od -1 do 8,3 (9% c → 99,9999995% c, dalej niż protony w LHC).
  const XA = 0.04, XB = 0.30, GA = -7, GB = -1, GC = 8.3;

  function speedState(beta, omb) {
    if (omb === undefined) omb = 1 - beta;
    const inv = Math.sqrt(Math.max(omb * (1 + beta), 0)); // 1/γ = tempo zegara
    return { beta, omb, gamma: 1 / inv, rate: inv, delta: beta * beta / (1 + inv) };
  }
  function speedFromG(g) {
    const t = Math.pow(10, g);
    return speedState(t / (1 + t), 1 / (1 + t));
  }
  function speedFromSlider(x) {
    if (x <= 0) return speedState(0, 1);
    if (x < XA) return speedState(1e-7 * x / XA);
    if (x < XB) return speedFromG(GA + (GB - GA) * (x - XA) / (XB - XA));
    return speedFromG(GB + (GC - GB) * (clamp(x, 0, 1) - XB) / (1 - XB));
  }
  function sliderFromSpeed(beta, omb) {
    if (beta <= 0) return 0;
    if (omb === undefined) omb = 1 - beta;
    if (beta < 1e-7) return XA * beta / 1e-7;
    const g = Math.log10(beta / omb);
    if (g < GB) return XA + (XB - XA) * (g - GA) / (GB - GA);
    return clamp(XB + (1 - XB) * (g - GB) / (GC - GB), 0, 1);
  }

  /* --------------------------- grawitacja -------------------------- */
  // Wysokość nad powierzchnią (lub horyzontem) w promieniach ciała:
  // h = 10^(-10 + 12u), u ∈ [0,1] → od 1e-10 R do 100 R.
  const H_MIN = -10, H_SPAN = 12;
  const hFromSlider = u => Math.pow(10, H_MIN + H_SPAN * clamp(u, 0, 1));
  const sliderFromH = h => clamp((Math.log10(Math.max(h, 1e-10)) - H_MIN) / H_SPAN, 0, 1);

  /** Zegar spoczywający na wysokości h (w promieniach) nad ciałem. */
  function gravAt(body, h) {
    const x = body.c / (1 + h);                           // rs / r
    const omx = body.bh ? h / (1 + h) : (1 + h - body.c) / (1 + h);
    const rate = Math.sqrt(Math.max(omx, 0));
    return { x, omx, rate, delta: x / (1 + rate), r: body.R * (1 + h), h };
  }

  /** Swobodna orbita kołowa na wysokości h. Prędkość mierzona przez
   *  nieruchomego obserwatora w tym miejscu: β² = rs / (2(r - rs)). */
  function orbitAt(body, h) {
    const g = gravAt(body, h);
    if (g.x >= 2 / 3) return { possible: false, stable: false, sp: speedState(0, 1) };
    const beta = Math.sqrt(g.x / (2 * g.omx));
    return { possible: true, stable: g.x <= 1 / 3 + 1e-12, sp: speedState(beta) };
  }

  /** Złożenie: grawitacja i ruch. */
  function combine(gr, sp) {
    return { rate: gr.rate * sp.rate, delta: gr.delta + sp.delta - gr.delta * sp.delta };
  }

  /* -------------------------- formatowanie ------------------------- */
  const nfCache = {};
  function nf(min, max) {
    const k = min + ':' + max;
    return nfCache[k] || (nfCache[k] = new Intl.NumberFormat('pl-PL', { minimumFractionDigits: min, maximumFractionDigits: max }));
  }
  const sfCache = {};
  function sf(sig) {
    return sfCache[sig] || (sfCache[sig] = new Intl.NumberFormat('pl-PL', { maximumSignificantDigits: sig }));
  }
  const fmtNum = (x, max = 2, min = 0) => nf(min, max).format(x);
  const fmtSig = (x, sig = 3) => sf(sig).format(x);
  const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const sup = n => String(n).split('').map(ch => SUP[ch] || ch).join('');
  function fmtSci(x, sig = 2) {
    if (x === 0) return '0';
    const e = Math.floor(Math.log10(Math.abs(x)));
    let m = x / Math.pow(10, e);
    if (Math.abs(m) >= 9.995 && sig <= 3) { m /= 10; return fmtSig(m, sig) + ' × 10' + sup(e + 1); }
    if (e >= -2 && e <= 3) return fmtSig(x, sig);
    return fmtSig(m, sig) + ' × 10' + sup(e);
  }

  // Polska odmiana: 1 rok, 2–4 lata, 5+ lat; ułamki: „roku”
  function plural(n, one, few, many, frac) {
    if (!Number.isInteger(n)) return frac || few;
    const a = Math.abs(n) % 100, b = a % 10;
    if (n === 1) return one;
    if (b >= 2 && b <= 4 && !(a >= 12 && a <= 14)) return few;
    return many;
  }
  const yearsWord = n => plural(n, 'rok', 'lata', 'lat', 'roku');
  const daysWord = n => plural(n, 'dzień', 'dni', 'dni', 'dnia');

  function fmtYears(y) {
    if (y >= 1e9) return fmtSig(y / 1e9, 3) + ' mld lat';
    if (y >= 1e6) return fmtSig(y / 1e6, 3) + ' mln lat';
    if (y >= 1e4) return fmtNum(Math.round(y), 0) + ' lat';
    const v = y >= 100 ? Math.round(y) : Math.round(y * 10) / 10;
    return fmtNum(v, 1) + ' ' + yearsWord(v);
  }

  /** Czas trwania (sekundy) zrozumiałym językiem: od femtosekund po miliardy lat. */
  function fmtDur(s) {
    const a = Math.abs(s);
    if (!isFinite(a)) return 'nieskończenie długo';
    if (a === 0) return '0 s';
    if (a < 1e-15) return 'mniej niż 1 fs';
    if (a < 1e-12) return fmtSig(a * 1e15, 3) + ' fs';
    if (a < 1e-9) return fmtSig(a * 1e12, 3) + ' ps';
    if (a < 1e-6) return fmtSig(a * 1e9, 3) + ' ns';
    if (a < 1e-3) return fmtSig(a * 1e6, 3) + ' µs';
    if (a < 1) return fmtSig(a * 1e3, 3) + ' ms';
    if (a < 60) return fmtNum(a, a < 10 ? 2 : 1) + ' s';
    if (a < 3600) { const m = Math.floor(a / 60), ss = Math.floor(a % 60); return m + ' min' + (ss ? ' ' + ss + ' s' : ''); }
    if (a < DAY) { const h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60); return h + ' h' + (m ? ' ' + m + ' min' : ''); }
    if (a < 2 * YEAR) { const d = Math.floor(a / DAY), h = Math.floor((a % DAY) / 3600); return d + ' ' + daysWord(d) + (h ? ' ' + h + ' h' : ''); }
    return fmtYears(a / YEAR);
  }

  /** Cyfrowy odczyt zegara. */
  function fmtClock(sec) {
    if (sec < 0) sec = 0;
    const y = Math.floor(sec / YEAR);
    let rest = sec - y * YEAR;
    const d = Math.floor(rest / DAY); rest -= d * DAY;
    const h = Math.floor(rest / 3600); rest -= h * 3600;
    const m = Math.floor(rest / 60); rest -= m * 60;
    const s = Math.floor(rest);
    const cs = Math.floor((rest - s) * 100);
    const p2 = v => (v < 10 ? '0' : '') + v;
    let out = p2(h) + ':' + p2(m) + ':' + p2(s) + ',' + p2(cs);
    if (d || y) out = d + ' d  ' + out;
    if (y) out = fmtNum(y, 0) + ' ' + yearsWord(y) + '  ' + out;
    return out;
  }

  /** Długość w metrach. */
  function fmtLen(m) {
    const a = Math.abs(m);
    if (a === 0) return '0 m';
    if (a < 1e-15) return fmtSci(a, 2) + ' m';
    if (a < 1e-12) return fmtSig(a * 1e15, 3) + ' fm';
    if (a < 1e-9) return fmtSig(a * 1e12, 3) + ' pm';
    if (a < 1e-6) return fmtSig(a * 1e9, 3) + ' nm';
    if (a < 1e-3) return fmtSig(a * 1e6, 3) + ' µm';
    if (a < 0.01) return fmtSig(a * 1e3, 3) + ' mm';
    if (a < 1) return fmtSig(a * 100, 3) + ' cm';
    if (a < 1000) return fmtSig(a, 3) + ' m';
    if (a < 1e9) return fmtNum(a / 1000, a < 1e4 ? 1 : 0) + ' km';
    if (a < 1e12) return fmtSig(a / 1e9, 3) + ' mln km';
    return fmtSig(a / 1e12, 3) + ' mld km';
  }

  /** Masa: porównanie z Ziemią albo Słońcem. */
  function fmtMass(M) {
    if (M < 0.5 * MEARTH) return fmtSig(M / MEARTH, 2) + ' masy Ziemi';
    if (M < 2e28) return fmtSig(M / MEARTH, 3) + ' × masa Ziemi';
    const s = M / MSUN;
    if (s >= 1e6) return fmtSig(s / 1e6, 3) + ' mln × masa Słońca';
    return fmtSig(s, 3) + ' × masa Słońca';
  }

  /** Prędkość jako ułamek c: tyle dziewiątek, ile trzeba. */
  function fmtPercentC(sp) {
    const p = sp.beta * 100;
    if (sp.beta === 0) return '0 %';
    if (sp.beta < 1e-4) return fmtSig(p, 2) + ' %';
    if (sp.beta < 0.99) return fmtNum(p, p < 10 ? 2 : 1) + ' %';
    const nines = Math.ceil(-Math.log10(sp.omb)) ;
    const digits = clamp(nines, 1, 9);
    return fmtNum(100 - sp.omb * 100, digits) + ' %';
  }
  function fmtSpeedAbs(sp) {
    const v = sp.beta * C;
    if (v < 1000) return fmtNum(v * 3.6, v * 3.6 < 100 ? 1 : 0) + ' km/h';
    return fmtNum(v / 1000, v < 1e5 ? 2 : 0) + ' km/s';
  }

  /** Tempo zegara: krótko i czytelnie. */
  function fmtRate(rate, delta) {
    if (delta === 0) return '×1';
    if (delta < 1e-4) return '×(1 − ' + fmtSci(delta, 2) + ')';
    if (rate < 1e-3) return '×' + fmtSci(rate, 2);
    return '×' + fmtNum(rate, rate > 0.999 ? 5 : rate > 0.99 ? 4 : 3);
  }
  /** „Ile razy wolniej”. */
  function fmtSlower(rate) {
    const k = 1 / rate;
    if (k < 1.0005) return 'prawie tak samo';
    if (k < 10) return fmtNum(k, 2) + '× wolniej';
    if (k < 1e6) return fmtNum(k, 0) + '× wolniej';
    return fmtSci(k, 2) + '× wolniej';
  }

  // Kolor światła zegara przesuniętego ku czerwieni (tempo 1 → biało-błękitny)
  const SHIFT = [
    [0, [200, 236, 255]], [-0.05, [235, 245, 255]], [-0.15, [255, 236, 190]], [-0.35, [255, 190, 100]],
    [-0.7, [255, 120, 60]], [-1.3, [235, 60, 45]], [-2.2, [160, 25, 30]], [-3.5, [70, 8, 14]]
  ];
  function shiftColor(rate) {
    const l = Math.log10(Math.max(rate, 1e-6));
    for (let i = 0; i < SHIFT.length - 1; i++) {
      const [la, ca] = SHIFT[i], [lb, cb] = SHIFT[i + 1];
      if (l <= la && l >= lb) {
        const t = (la - l) / (la - lb);
        return [Math.round(lerp(ca[0], cb[0], t)), Math.round(lerp(ca[1], cb[1], t)), Math.round(lerp(ca[2], cb[2], t))];
      }
    }
    return l > 0 ? SHIFT[0][1].slice() : SHIFT[SHIFT.length - 1][1].slice();
  }

  // Barwa ciała doskonale czarnego o temperaturze T (przybliżenie T. Hellanda)
  function kelvinRGB(T) {
    const t = clamp(T, 1000, 40000) / 100;
    let r, g, b;
    if (t <= 66) r = 255; else r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    if (t <= 66) g = 99.4708025861 * Math.log(t) - 161.1195681661; else g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    if (t >= 66) b = 255; else if (t <= 19) b = 0; else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
    return [clamp(r, 0, 255) | 0, clamp(g, 0, 255) | 0, clamp(b, 0, 255) | 0];
  }

  // Siła efektu grawitacji w skali 0..1 (logarytmicznie: 10⁻¹² → 0, 1 → 1)
  const strength = delta => clamp((Math.log10(Math.max(delta, 1e-14)) + 12) / 12, 0, 1);

  R.phys = {
    C, G, MSUN, MEARTH, DAY, YEAR, LY, PROXIMA_LY, BODIES, BUCHDAHL,
    clamp, lerp, rsOf, bodyAt, sliderOfBody,
    speedState, speedFromSlider, sliderFromSpeed,
    hFromSlider, sliderFromH, gravAt, orbitAt, combine, strength,
    shiftColor, kelvinRGB
  };
  R.fmt = { num: fmtNum, sig: fmtSig, sci: fmtSci, sup, dur: fmtDur, clock: fmtClock, len: fmtLen, mass: fmtMass,
    years: fmtYears, pct: fmtPercentC, speed: fmtSpeedAbs, rate: fmtRate, slower: fmtSlower, plural, daysWord, yearsWord };
})(window.Rel);
