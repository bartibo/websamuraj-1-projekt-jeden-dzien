'use strict';
/* Model fal sejsmicznych: fala P, fala S, fale powierzchniowe Rayleigha i Love'a,
   wstrząsy wtórne oraz tsunami. Fale rozchodzą się kołowo od (wirtualnego) epicentrum,
   więc każdy budynek trzęsie się trochę inaczej. */

const Quake = {
  time: 0,
  events: [],
  center: { x: 0, z: -60 },
  E: { x: 0, z: -60 },
  Dv: 300,
  dirFrom: { x: 0, z: 1 },
  res: 1,
  sMin: 0,
  n: 0,
  T: null,
  tsunami: null,
  peakI: 1,
  nowI: 1,
  lastParams: null,
  aftershocks: true,

  init() {
    const N = 1700;
    this.T = {
      dl: new Float32Array(N), dt: new Float32Array(N), dy: new Float32Array(N),
      al: new Float32Array(N), at: new Float32Array(N), ay: new Float32Array(N)
    };
    this.cap = N;
  },

  /* Parametry „prognozy” dla danych ustawień (bez uruchamiania). */
  forecast(p) {
    const I = Seis.mmi(p.M, p.dist, p.depth, p.soil);
    const pga = Seis.pgaG(I);
    const R = Math.sqrt(p.dist * p.dist + p.depth * p.depth);
    return {
      I, pga, R,
      tP: R / 6.0,
      tS: R / 3.5,
      energy: Seis.energyJ(p.M),
      perYear: Seis.perYear(p.M),
      rupture: Seis.ruptureKm(p.M),
      durReal: Seis.durationReal(p.M) * Seis.SOIL[p.soil].dur,
      tsunamiH: Seis.tsunamiHeight(p.M, p.depth, p.dist, p.sea),
      tsunamiMin: p.sea ? Math.max(2, (p.dist * 1000) / 200 / 60) : 0
    };
  },

  makeEvent(p, t0, kind) {
    const soil = Seis.SOIL[p.soil];
    const I = Seis.mmi(p.M, p.dist, p.depth, p.soil);
    const pga = Seis.pgaG(I);
    const A = Seis.visAmp(pga);
    const R = Math.max(4, Math.sqrt(p.dist * p.dist + p.depth * p.depth));
    const M = p.M;
    const fS = U.lerp(3.0, 0.85, U.clamp((M - 2) / 7, 0, 1)) * soil.freq;
    const dur = (1.4 + 2.3 * Math.max(0, M - 2.5)) * soil.dur;
    const surfW = M < 5 ? 0 : U.clamp((M - 5) / 2.5, 0, 1) * U.clamp((75 - p.depth) / 50, 0.25, 1);
    const gapReal = R * (1 / 3.5 - 1 / 6.0);
    const gap = U.clamp(gapReal * 0.45, 0.45, 4.5);
    const cP = 150;
    const lead = 0.35 + Math.min(this.Dv, 420) / cP;
    const fR = U.lerp(0.62, 0.3, U.clamp((M - 5) / 4.5, 0, 1)) * soil.freq;
    const mkPh = (o, freqs, weights) => {
      o.om = freqs.map(f => 2 * Math.PI * f);
      o.w = weights;
      o.ph = freqs.map(() => Math.random() * 6.283);
      o.ph2 = freqs.map(() => Math.random() * 6.283);
      o.bp = Math.random() * 6.283;
      o.end = o.dur + o.decay * 6;
      return o;
    };
    const tPa = lead;
    const tSa = lead + gap;
    const phases = [
      mkPh({ name: 'P', c: cP, tArr: tPa, amp: A * 0.28, rise: 0.08, dur: gap + dur * 0.25, decay: 1.2 + dur * 0.05, l: 1, t: 0.15, y: 0.55, beat: 0.2 },
        [fS * 2.3, fS * 3.7, fS * 5.4], [1, 0.5, 0.25]),
      mkPh({ name: 'S', c: 80, tArr: tSa, amp: A, rise: 0.2 + dur * 0.02, dur: dur, decay: 1.0 + dur * 0.12, l: 0.35, t: 1, y: 0.22, beat: 0.3 },
        [fS, fS * 1.55, fS * 2.35], [1, 0.5, 0.28]),
      mkPh({ name: 'R', c: 42, tArr: tSa + 0.8 + gap * 0.4, amp: A * 1.15 * surfW, rise: 1.0, dur: dur * 0.85, decay: 2.5 + dur * 0.1, l: 0.6, t: 0, y: 1, beat: 0.15, ell: true },
        [fR, fR * 1.45], [1, 0.35]),
      mkPh({ name: 'L', c: 55, tArr: tSa + 0.5 + gap * 0.3, amp: A * 0.8 * surfW, rise: 0.8, dur: dur * 0.8, decay: 2.2 + dur * 0.1, l: 0, t: 1, y: 0, beat: 0.2 },
        [fR * 1.3, fR * 2.1], [1, 0.3])
    ].filter(ph => ph.amp > 1e-5);
    const end = Math.max(...phases.map(ph => ph.tArr + ph.end + 330 / ph.c));
    const calm = Math.max(...phases.map(ph => ph.tArr + ph.dur + ph.decay * 1.5 + 150 / ph.c));
    return {
      kind, M, depth: p.depth, dist: p.dist, soil: p.soil, sea: p.sea,
      I, pga, A, fS, dur, t0, phases, surfW, gapReal, gap, tPa, tSa,
      strongEnd: t0 + tSa + dur, end: t0 + end, calmAt: t0 + calm, label: kind === 'main' ? 'Wstrząs główny' : 'Wstrząs wtórny'
    };
  },

  /* Uruchomienie trzęsienia. Jeśli poprzednie wciąż trwa, nowe nakłada się na nie. */
  trigger(p) {
    this.lastParams = Object.assign({}, p);
    const busy = this.events.length > 0;
    if (!busy) {
      this.time = 0;
      this.peakI = 1;
      // kierunek, z którego nadchodzą fale
      let ang;
      if (p.sea) ang = U.rand(-0.5, 0.5);                       // od morza (+z)
      else ang = U.pick([Math.PI, Math.PI * 0.5, -Math.PI * 0.5, Math.PI * 0.75, -Math.PI * 0.75]) + U.rand(-0.3, 0.3);
      this.dirFrom = { x: Math.sin(ang), z: Math.cos(ang) };
      this.Dv = 70 + p.dist * 22;
      this.E = { x: this.center.x + this.dirFrom.x * this.Dv, z: this.center.z + this.dirFrom.z * this.Dv };
      this.sMin = Math.max(0, this.Dv - 800);
      this.n = Math.min(this.cap, Math.ceil((this.Dv + 800 - this.sMin) / this.res) + 2);
    }
    const t0 = this.time;
    const ev = this.makeEvent(p, t0, 'main');
    this.events.push(ev);
    // wstrząsy wtórne
    if (this.aftershocks && p.M >= 5.5) {
      const n = p.M >= 8 ? 3 : p.M >= 6.8 ? 2 : 1;
      let tt = ev.calmAt + U.rand(3, 7);
      for (let i = 0; i < n; i++) {
        const q = Object.assign({}, p, { M: Math.max(3, p.M - U.rand(1.1, 2.1)), depth: p.depth * U.rand(0.7, 1.2), dist: Math.max(0, p.dist + U.rand(-5, 5)) });
        const a = this.makeEvent(q, tt, 'after');
        a.pending = true;
        this.events.push(a);
        tt = a.calmAt + U.rand(4, 9);
      }
    }
    // tsunami
    const H = Seis.tsunamiHeight(p.M, p.depth, p.dist, p.sea);
    if (H > 0.3 && !this.tsunami) {
      this.tsunami = new Tsunami(H, ev.t0 + ev.tSa + ev.dur * 0.6, p.dist);
    }
    return ev;
  },

  /* czy któryś wstrząs właśnie trwa (bez czekających wstrząsów wtórnych) */
  get shakingNow() {
    return this.events.some(ev => this.time >= ev.t0 && this.time < ev.calmAt);
  },

  get active() {
    return this.events.length > 0 || (this.tsunami && !this.tsunami.done);
  },

  stopAll() {
    this.events.length = 0;
    this.tsunami = null;
    this.nowI = 1;
  },

  update(dt) {
    if (!this.active) {
      this.nowI = 1;
      return;
    }
    this.time += dt;
    const t = this.time;
    for (const ev of this.events) {
      if (ev.pending && t >= ev.t0) {
        ev.pending = false;
        if (this.onEvent) this.onEvent(ev);
      }
    }
    this.events = this.events.filter(ev => t < ev.end);
    if (this.tsunami) {
      this.tsunami.update(t);
      if (this.tsunami.done && this.events.length === 0) this.tsunami = null;
    }
    this.computeTable();
    // intensywność w centrum miasta
    let I = 1;
    for (const ev of this.events) I = Math.max(I, this.IeffEvent(ev, this.Dv));
    this.nowI = I;
    this.peakI = Math.max(this.peakI, I);
  },

  computeTable() {
    const T = this.T, n = this.n, res = this.res, sMin = this.sMin;
    T.dl.fill(0, 0, n); T.dt.fill(0, 0, n); T.dy.fill(0, 0, n);
    T.al.fill(0, 0, n); T.at.fill(0, 0, n); T.ay.fill(0, 0, n);
    const Dv = this.Dv;
    for (const ev of this.events) {
      const te = this.time - ev.t0;
      if (te <= 0) continue;
      for (const ph of ev.phases) {
        // zakres indeksów, w którym faza jest aktywna: 0 < τ < end
        // τ = te - tArr - (s - Dv)/c  ->  s = Dv + c (te - tArr - τ)
        const sHi = Dv + ph.c * (te - ph.tArr);
        const sLo = Dv + ph.c * (te - ph.tArr - ph.end);
        let i0 = Math.max(0, Math.floor((sLo - sMin) / res));
        let i1 = Math.min(n - 1, Math.ceil((sHi - sMin) / res));
        if (i1 < i0) continue;
        const om = ph.om, w = ph.w, p1 = ph.ph, p2 = ph.ph2, nh = om.length;
        for (let i = i0; i <= i1; i++) {
          const s = sMin + i * res;
          const tau = te - ph.tArr - (s - Dv) / ph.c;
          if (tau <= 0) continue;
          const env = this.env(ph, tau) * ph.amp;
          if (env < 1e-6) continue;
          let s1 = 0, s2 = 0, a1 = 0, a2 = 0, c1 = 0, ac1 = 0;
          for (let k = 0; k < nh; k++) {
            const o = om[k];
            const x1 = Math.sin(o * tau + p1[k]) * w[k];
            const x2 = Math.sin(o * tau + p2[k]) * w[k];
            s1 += x1; s2 += x2;
            a1 -= x1 * o * o; a2 -= x2 * o * o;
            if (ph.ell) {
              const y1 = Math.cos(o * tau + p1[k]) * w[k];
              c1 += y1; ac1 -= y1 * o * o;
            }
          }
          if (ph.ell) {
            // Rayleigh: ruch eliptyczny w płaszczyźnie pionowej
            T.dy[i] += env * ph.y * s1; T.ay[i] += env * ph.y * a1;
            T.dl[i] += env * ph.l * c1; T.al[i] += env * ph.l * ac1;
          } else {
            T.dl[i] += env * ph.l * s1; T.al[i] += env * ph.l * a1;
            T.dt[i] += env * ph.t * s2; T.at[i] += env * ph.t * a2;
            T.dy[i] += env * ph.y * (s1 + s2) * 0.5; T.ay[i] += env * ph.y * (a1 + a2) * 0.5;
          }
        }
      }
    }
  },

  env(ph, tau) {
    if (tau <= 0 || tau > ph.end) return 0;
    let e = 1 - Math.exp(-tau / ph.rise);
    if (tau > ph.dur) e *= Math.exp(-(tau - ph.dur) / ph.decay);
    e *= 1 - ph.beat + ph.beat * (0.5 + 0.5 * Math.sin(tau * 1.7 + ph.bp) * Math.sin(tau * 0.63 + ph.bp * 2));
    return e;
  },

  /* Chwilowa intensywność (MMI) wywołana danym wstrząsem w odległości s od epicentrum. */
  IeffEvent(ev, s) {
    const te = this.time - ev.t0;
    if (te <= 0) return 1;
    let sum = 0;
    for (const ph of ev.phases) {
      const tau = te - ph.tArr - (s - this.Dv) / ph.c;
      const e = this.env(ph, tau) * (ph.amp / ev.A) * (ph.name === 'P' ? 0.55 : ph.name === 'L' ? 0.8 : 1);
      sum += e * e;
    }
    const lvl = Math.min(1.12, Math.sqrt(sum));
    if (lvl < 1e-4) return 1;
    return U.clamp(ev.I + 3.66 * Math.log10(lvl), 1, 12);
  },

  distFromE(x, z) {
    const dx = x - this.E.x, dz = z - this.E.z;
    return Math.sqrt(dx * dx + dz * dz);
  },

  /* Próbka ruchu gruntu w punkcie (x,z). out: dx,dy,dz (m), ax,ay,az (m/s²), I (MMI teraz). */
  sample(x, z, out, withI) {
    out.dx = out.dy = out.dz = out.ax = out.ay = out.az = 0;
    out.I = 1;
    if (this.events.length === 0) return out;
    const ex = x - this.E.x, ez = z - this.E.z;
    const s = Math.sqrt(ex * ex + ez * ez) || 1;
    const rx = ex / s, rz = ez / s;
    const f = (s - this.sMin) / this.res;
    const i = Math.floor(f);
    const cr = Math.hypot(x - this.center.x, z - this.center.z);
    const tp = cr < 380 ? 1 : 1 - U.smooth(380, 720, cr);
    if (i >= 0 && i < this.n - 1 && tp > 0) {
      const k = (f - i), T = this.T;
      const dl = T.dl[i] + (T.dl[i + 1] - T.dl[i]) * k;
      const dt = T.dt[i] + (T.dt[i + 1] - T.dt[i]) * k;
      const al = T.al[i] + (T.al[i + 1] - T.al[i]) * k;
      const at = T.at[i] + (T.at[i + 1] - T.at[i]) * k;
      out.dy = T.dy[i] + (T.dy[i + 1] - T.dy[i]) * k;
      out.ay = T.ay[i] + (T.ay[i + 1] - T.ay[i]) * k;
      out.dx = rx * dl - rz * dt;
      out.dz = rz * dl + rx * dt;
      out.ax = rx * al - rz * at;
      out.az = rz * al + rx * at;
      if (tp < 1) { out.dx *= tp; out.dy *= tp; out.dz *= tp; out.ax *= tp; out.ay *= tp; out.az *= tp; }
    }
    if (withI) {
      let I = 1;
      for (const ev of this.events) I = Math.max(I, this.IeffEvent(ev, s));
      out.I = I;
    }
    return out;
  },

  /* Tylko przemieszczenie pionowe – szybka ścieżka dla siatki terenu. */
  dyAt(s) {
    const f = (s - this.sMin) / this.res;
    const i = Math.floor(f);
    if (i < 0 || i >= this.n - 1) return 0;
    const k = f - i, T = this.T.dy;
    return T[i] + (T[i + 1] - T[i]) * k;
  },

  /* Sygnał „sejsmometru” w centrum miasta – składowe znormalizowane. */
  station() {
    const r = { v: 0, h: 0, P: 0, S: 0, Surf: 0 };
    const t = this.time;
    for (const ev of this.events) {
      const te = t - ev.t0;
      if (te <= 0) continue;
      const L = Math.pow((ev.I - 1) / 11, 1.15) * 0.92 + 0.02;
      for (const ph of ev.phases) {
        const tau = te - ph.tArr;
        if (tau <= 0) continue;
        const e = this.env(ph, tau) * (ph.amp / ev.A);
        if (e < 1e-5) continue;
        let s1 = 0, s2 = 0;
        for (let k = 0; k < ph.om.length; k++) {
          s1 += Math.sin(ph.om[k] * tau + ph.ph[k]) * ph.w[k];
          s2 += Math.sin(ph.om[k] * tau + ph.ph2[k]) * ph.w[k];
        }
        const val = e * L * 0.6;
        r.v += val * (ph.name === 'P' ? s1 * 1.0 : ph.name === 'R' ? s1 : s2 * 0.5);
        r.h += val * s2;
        if (ph.name === 'P') r.P = Math.max(r.P, e);
        else if (ph.name === 'S') r.S = Math.max(r.S, e);
        else r.Surf = Math.max(r.Surf, e);
      }
    }
    return r;
  },

  /* Faza trzęsienia do wyświetlenia w interfejsie */
  phaseLabel() {
    // tsunami w toku jest ważniejsze niż wstrząsy wtórne (o nich mówią komunikaty)
    if (this.tsunami && !this.tsunami.done && this.tsunami.tau >= 0) return this.tsunami.label();
    if (this.events.length === 0) {
      if (this.tsunami && !this.tsunami.done) return this.tsunami.label();
      return null;
    }
    const t = this.time;
    let best = null;
    for (const ev of this.events) {
      const te = t - ev.t0;
      if (te < 0) continue;
      if (!best || ev.t0 > best.t0) best = ev;
    }
    if (!best) {
      const nxt = this.events.find(e => e.pending);
      if (this.tsunami && !this.tsunami.done && this.tsunami.started(t)) return this.tsunami.label();
      return nxt ? 'Cisza przed wstrząsem wtórnym…' : null;
    }
    const te = t - best.t0;
    const pre = best.kind === 'after' ? 'Wstrząs wtórny · ' : '';
    if (te < best.tPa) return pre + 'Fale biegną od epicentrum…';
    if (te < best.tSa) return pre + 'Fala P (podłużna) – pierwsze drgania';
    if (te < best.tSa + best.dur * 0.9) {
      const surf = best.surfW > 0.2 && te > best.tSa + 1 + best.gap * 0.4;
      return pre + (surf ? 'Fale S i powierzchniowe – najsilniejsze wstrząsy' : 'Fala S (poprzeczna) – najsilniejsze wstrząsy');
    }
    if (this.tsunami && !this.tsunami.done && this.tsunami.started(t)) return this.tsunami.label();
    return pre + 'Wygasanie drgań';
  }
};

/* Tsunami: harmonogram fal na granicy morskiej. Najpierw morze się cofa, potem przychodzi seria fal –
   druga bywa największa. Od granicy do brzegu i po mieście wodę prowadzi symulacja (flood.js).
   Czas tsunami (tau) liczymy w sekundach symulacji wody. */
class Tsunami {
  constructor(H, tStart, distKm) {
    this.H = H;
    this.t0 = tStart;
    this.distKm = distKm;
    const A = this.A = H * Flood.AMP;
    const D = this.D = Math.min(0.9 * A, 6.5);
    // [start, narastanie, utrzymanie, opadanie, amplituda]
    this.pulses = H >= 2.5 ? [
      [0, 5, 7, 6, -D], [11, 6, 8, 8, A * 0.85], [32, 6, 8, 6, -D * 0.6],
      [47, 6, 9, 9, A], [71, 6, 8, 6, -D * 0.5], [87, 6, 6, 8, A * 0.55]
    ] : [
      [0, 5, 7, 6, -D], [11, 6, 8, 8, A], [32, 6, 8, 6, -D * 0.5], [45, 6, 7, 8, A * 0.6]
    ];
    this.crests = this.pulses.filter(p => p[4] > 0).map(p => ({ s: p[0], e: p[0] + p[1] + p[2] + p[3], amp: p[4] }));
    const last = this.pulses[this.pulses.length - 1];
    this.tForce = last[0] + last[1] + last[2] + last[3];
    this.tau = -1;
    this.done = false;
  }
  started(t) { return t >= this.t0; }
  /* poziom morza na granicy obszaru symulacji */
  etaIn(tau) {
    let e = 0;
    for (const [s, r, h, f, a] of this.pulses) {
      if (tau <= s || tau >= s + r + h + f) continue;
      e += a * U.smooth(s, s + r, tau) * (1 - U.smooth(s + r + h, s + r + h + f, tau));
    }
    return e;
  }
  update(t) {
    this.tau = (t - this.t0) * Flood.SPEED;
    // po ostatniej fali kończymy alarm; woda spływa dalej w symulacji
    if (this.tau > this.tForce + Tsunami.TRAVEL + 22) this.done = true;
  }
  /* ile fal dotarło już do brzegu */
  wavesArrived() {
    let n = 0;
    for (const c of this.crests) if (this.tau >= c.s + Tsunami.TRAVEL) n++;
    return n;
  }
  label() {
    const tau = this.tau, n = this.crests.length, T = Tsunami.TRAVEL;
    if (tau < 0) return null;
    for (let k = n - 1; k >= 0; k--) {
      const c = this.crests[k];
      if (tau < c.s + T) continue;
      if (tau < c.e + T + 4) return k === 0 && tau < c.s + T + 5 ? '🌊 Tsunami uderza w wybrzeże' : `🌊 Fala ${k + 1} z ${n} zalewa miasto`;
      if (k < n - 1) return '⚠ Woda się cofa, ale to nie koniec – nadchodzi kolejna fala';
      return 'Woda spływa do morza';
    }
    return '⚠ Morze się cofa – nadchodzi tsunami!';
  }
  /* Morze poza obszarem symulacji: ta sama seria fal, przesunięta w czasie z odległością. */
  farTau(z) {
    const Z1 = Flood.Z1;
    return z > Z1 ? this.tau + (z - Z1) / Tsunami.C_FAR : this.tau - (Z1 - z) / Tsunami.C_NEAR;
  }
  farLevel(x, z) {
    if (this.tau < 0) return 0;
    const amp = z > Flood.Z1 ? 0.45 + 0.55 * Math.exp(-(z - Flood.Z1) / 700) : 1;
    return amp * this.etaIn(this.farTau(z)) * U.smooth(0, 5, this.tau);
  }
  farFoam(x, z) {
    const t = this.farTau(z);
    const e = this.etaIn(t);
    if (e <= 0) return 0;
    const rising = e > this.etaIn(t - 1.2);
    return U.smooth(0.3, 0.85, e / this.A) * (rising ? 0.9 : 0.3) * (0.6 + 0.4 * U.noise2(x * 0.05, z * 0.05 + this.tau));
  }
}
Tsunami.TRAVEL = 22;     // ile sekund (symulacji) fala płynie od granicy do brzegu
Tsunami.C_FAR = 40;
Tsunami.C_NEAR = 10;
