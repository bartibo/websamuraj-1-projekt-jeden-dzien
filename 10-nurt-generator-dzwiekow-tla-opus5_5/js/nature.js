/* =====================================================================
   Nurt – natura: wiatr, fale morza, kominek i ptaki
   Energia ich nie włącza, dokłada się je w mikserze. Jak reszta Nurtu
   nic tu nie jest nagrane: wiatr i fale to szum przepuszczony przez
   filtry, które wędrują po losowych celach (więc nic się nie zapętla),
   kominek to bufor trzasków nad cichym oddechem płomieni, a ptaki
   to kilka „gatunków” wylosowanych na sesję, każdy ze swoją frazą.
   ===================================================================== */
'use strict';
(function (N) {
  const U = N.util;

  // Kształty przebiegu wysokości sylaby ptaka (k = 0…1 → mnożnik częstotliwości)
  const CONTOURS = {
    down: k => 1 - 0.32 * k,
    up: k => 0.78 + 0.3 * k,
    hook: k => 1 + 0.22 * Math.sin(Math.PI * k) - 0.12 * k,   // w górę i opada
    dip: k => 1 - 0.18 * Math.sin(Math.PI * k),
    slide: k => 1.18 - 0.4 * k * k,                            // szybkie zjechanie na końcu
    flat: () => 1
  };
  const CURVE = 24;
  // gładka obwiednia głośności sylaby (sin² z krótszym wejściem niż wyjściem). Gęsta,
  // bo przeglądarka łączy punkty prostymi, a każde ostre kolanko to cichy trzask w całym paśmie.
  const ENV_N = 160;
  const ENV = Float32Array.from({ length: ENV_N }, (_, i) => {
    const k = i / (ENV_N - 1);
    return Math.pow(Math.sin(Math.PI * Math.pow(k, 0.7)), 2);
  });

  N.createNature = function (E) {
    const ctx = E.ctx, B = E.buffers;
    const gains = { wind: U.gain(ctx, 0), waves: U.gain(ctx, 0), fire: U.gain(ctx, 0), birds: U.gain(ctx, 0) };
    for (const k in gains) gains[k].connect(E.bus);
    gains.wind.connect(U.gain(ctx, 0.1)).connect(E.reverbIn);
    gains.birds.connect(U.gain(ctx, 0.22)).connect(E.reverbIn);
    gains.fire.connect(U.gain(ctx, 0.08)).connect(E.reverbIn);
    // Warstwa powstaje dopiero, gdy pierwszy raz zabrzmi, więc wyciszona nic nie kosztuje
    const src = (buf, off) => { const s = U.loop(ctx, buf, off); s.start(ctx.currentTime, s.offset0); return s; };
    let gusts, body, whistle, whistleG, nextWhistle = 0;
    let waves;
    let roar, nextRoar = 0;
    const build = {
      // ---------- wiatr: dwa podmuchy po bokach, niski pomruk i cichy świst ----------
      wind() {
        gusts = [-0.55, 0.55].map((pan, i) => {
          const bp = U.filter(ctx, 'bandpass', 500, 1.2);
          const g = U.gain(ctx, 0.3);
          src(B.pink, 2.2 + i * 3.7).connect(bp).connect(U.filter(ctx, 'lowpass', 2600, 0.5))
            .connect(g).connect(U.panner(ctx, pan)).connect(gains.wind);
          return { bp, g, next: 0 };
        });
        // ciało wiatru: niski szum, który rośnie razem z podmuchami
        body = U.gain(ctx, 0.15);
        src(B.brown, 6.6).connect(U.filter(ctx, 'lowpass', 170, 0.6)).connect(body).connect(gains.wind);
        whistle = U.filter(ctx, 'bandpass', 1400, 14);
        whistleG = U.gain(ctx, 0);
        src(B.white, 1.1).connect(whistle).connect(whistleG).connect(gains.wind);
      },
      // ---------- fale: przypływ, załamanie i syczące cofanie się piany ----------
      waves() {
        waves = [-0.35, 0.35].map((pan, i) => {
          const lp = U.filter(ctx, 'lowpass', 400, 0.4);
          const g = U.gain(ctx, 0.1);
          const out = U.panner(ctx, pan);
          src(B.pink, 6.1 + i * 2.3).connect(lp);
          src(B.brown, 1.7 + i * 4.4).connect(U.gain(ctx, 0.8)).connect(lp);
          lp.connect(g).connect(out).connect(gains.waves);
          // piana: jasny syk, który zostaje, gdy niski szum wody już opada
          const foam = U.gain(ctx, 0);
          src(B.white, 0.7 + i * 1.9).connect(U.filter(ctx, 'highpass', 2200, 0.5))
            .connect(U.filter(ctx, 'lowpass', 9000, 0.5)).connect(foam).connect(out);
          return { lp, g, foam, next: 0 };
        });
        // morze w oddali: stały, ciemny szum pod falami
        src(B.brown, 8.3).connect(U.filter(ctx, 'lowpass', 300, 0.5)).connect(U.gain(ctx, 0.35)).connect(gains.waves);
      },
      // ---------- kominek: trzaski nad cichym oddechem płomieni ----------
      fire() {
        src(B.fire, U.rand(0, 10)).connect(U.filter(ctx, 'highpass', 260, 0.5))
          .connect(U.filter(ctx, 'lowpass', 7000, 0.5)).connect(gains.fire);
        roar = U.gain(ctx, 0.25);
        src(B.brown, 4.9).connect(U.filter(ctx, 'lowpass', 260, 0.7)).connect(roar).connect(gains.fire);
      }
    };
    const built = {};
    const ready = k => { if (!built[k]) { build[k](); built[k] = true; } };

    // ---------- ptaki ----------
    // Na sesję losuje się kilka gatunków. Każdy ma swoją frazę złożoną z kilku sylab
    // (kształt przebiegu wysokości, długość, tryl, alikwot) i powtarza ją z drobnymi zmianami.
    // Czasem z innej strony odpowiada mu drugi ptak tego samego gatunku.
    const birdOut = U.filter(ctx, 'lowpass', 9000, 0.5);
    birdOut.connect(U.filter(ctx, 'highpass', 1100, 0.5)).connect(gains.birds);

    function syllable(kind) {
      const long = kind === 'whistle';
      return {
        contour: U.pick(Object.keys(CONTOURS)),
        depth: U.rand(0.5, 1.4),
        dur: long ? U.rand(0.18, 0.4) : kind === 'trill' ? U.rand(0.02, 0.035) : U.rand(0.035, 0.13),
        ratio: U.rand(0.82, 1.22),                         // wysokość względem głosu gatunku
        trill: !long && U.chance(0.25) ? U.rand(28, 55) : 0, // szybkie drganie wysokości
        harm: U.chance(0.45) ? U.rand(0.06, 0.18) : 0       // drugi alikwot: pełniejsza barwa
      };
    }
    function makeSpecies() {
      const kind = U.pick(['song', 'song', 'song', 'trill', 'whistle', 'call']);
      const syl = Array.from({ length: kind === 'song' ? U.randi(2, 4) : 1 }, () => syllable(kind));
      // fraza pieśni: każda sylaba powtórzona kilka razy, np. A A A B B C
      const phrase = [];
      if (kind === 'song') syl.forEach((_, i) => { for (let n = U.randi(1, 4); n > 0; n--) phrase.push(i); });
      return {
        kind, syl, phrase,
        f: kind === 'whistle' ? U.rand(1500, 3000) : U.rand(2600, 5400),
        pan: U.rand(-0.8, 0.8),
        dist: U.rand(0.35, 1),
        gap: U.rand(0.04, 0.12),
        drift: U.pick([1, 1, 0.97, 1.03, 0.95])             // jak fraza schodzi lub wspina się w górę
      };
    }
    const species = Array.from({ length: U.randi(3, 4) }, makeSpecies);
    let nextBird = 0;

    function note(t, f, s, amp, pan) {
      const dur = s.dur * U.rand(0.9, 1.1);
      const curve = new Float32Array(CURVE);
      for (let i = 0; i < CURVE; i++) curve[i] = f * (1 + (CONTOURS[s.contour](i / (CURVE - 1)) - 1) * s.depth);
      const env = ctx.createGain();
      env.gain.value = 0;
      env.gain.setValueCurveAtTime(ENV.map(v => v * amp), t, dur);
      env.connect(U.panner(ctx, pan)).connect(birdOut);
      const oscs = [];
      [[1, 1], [2, s.harm]].forEach(([mult, a]) => {
        if (!a) return;
        const o = ctx.createOscillator();
        o.frequency.setValueCurveAtTime(curve.map(v => v * mult), t, dur);
        if (a === 1) o.connect(env);
        else o.connect(U.gain(ctx, a)).connect(env);
        oscs.push(o);
      });
      if (s.trill) {
        const v = ctx.createOscillator();
        v.frequency.value = s.trill;
        const vg = U.gain(ctx, f * 0.05);
        v.connect(vg);
        oscs.forEach(o => vg.connect(o.frequency));
        oscs.push(v);
      }
      oscs.forEach(o => { o.start(t); o.stop(t + dur + 0.02); });
      return dur;
    }

    /** Jedna fraza gatunku od chwili t. Zwraca czas jej końca. */
    function song(sp, t, pan, dist) {
      const a = 0.05 + 0.12 * dist;
      let f = sp.f * U.rand(0.97, 1.03);
      const play = (s, amp) => { t += note(t, f * s.ratio, s, amp, pan); };
      if (sp.kind === 'song') {
        sp.phrase.forEach((i, n) => {
          if (n && sp.phrase[n - 1] !== i) t += sp.gap * 1.6;  // dłuższy oddech przy zmianie sylaby
          play(sp.syl[i], a * U.rand(0.75, 1));
          t += sp.gap * U.rand(0.8, 1.2);
          f *= sp.drift;
        });
      } else if (sp.kind === 'trill') {
        const n = U.randi(10, 24);
        for (let i = 0; i < n; i++) {
          play(sp.syl[0], a * 0.7 * (0.6 + 0.4 * Math.sin(Math.PI * (i + 1) / (n + 1))));
          t += 0.012;
          f *= sp.drift === 1 ? 0.995 : sp.drift;
        }
      } else if (sp.kind === 'whistle') {
        for (let i = U.randi(2, 3); i > 0; i--) {
          play(sp.syl[0], a * 0.85);
          t += U.rand(0.18, 0.35);
          f *= U.pick([1, 1.12, 0.89, 1.26]);
        }
      } else {
        // krótkie wołanie, raz albo dwa
        for (let i = U.randi(1, 2); i > 0; i--) { play(sp.syl[0], a); t += U.rand(0.12, 0.25); }
      }
      return t;
    }

    let level = { wind: 0, waves: 0, fire: 0, birds: 0 };
    let running = false;

    return {
      gains,
      start() {
        running = true;
      },
      setParams(m) {
        level = { wind: m.wind, waves: m.waves, fire: m.fire, birds: m.birds };
      },
      schedule(until) {
        if (!running) return;
        const now = ctx.currentTime;

        if (level.wind > 0.01) {
          ready('wind');
          for (const gu of gusts) {
            if (gu.next < now) gu.next = now;
            while (gu.next < until) {
              const d = U.rand(1.5, 4.5), g = Math.pow(U.rand(0.12, 1), 1.6) * 0.8;
              gu.bp.frequency.setTargetAtTime(U.rand(220, 900), gu.next, d * 0.45);
              gu.bp.Q.setTargetAtTime(U.rand(0.7, 2.4), gu.next, d * 0.5);
              gu.g.gain.setTargetAtTime(g, gu.next, d * 0.4);
              body.gain.setTargetAtTime(0.08 + 0.3 * g, gu.next, d * 0.5);
              gu.next += d;
            }
          }
          if (nextWhistle < now) nextWhistle = now;
          while (nextWhistle < until) {
            const d = U.rand(2, 6);
            whistle.frequency.setTargetAtTime(U.rand(900, 2000), nextWhistle, d * 0.4);
            whistleG.gain.setTargetAtTime(U.chance(0.35) ? U.rand(0.04, 0.12) : 0, nextWhistle, d * 0.3);
            nextWhistle += d;
          }
        }

        if (level.waves > 0.01) {
          ready('waves');
          waves.forEach((w, i) => {
            if (w.next < now) w.next = now + i * U.rand(2, 4);
            while (w.next < until) {
              const t = w.next, swell = U.rand(2.5, 4.5), wash = U.rand(3.5, 6.5), peak = U.rand(0.6, 1);
              const brk = t + swell;
              w.g.gain.setTargetAtTime(peak * 0.7, t, swell * 0.35);
              w.lp.frequency.setTargetAtTime(U.rand(800, 1300), t, swell * 0.4);
              // załamanie: jasność i głośność rosną w ułamku sekundy, nie skokiem
              w.g.gain.setTargetAtTime(peak, brk, 0.32);
              w.lp.frequency.setTargetAtTime(U.rand(2400, 3800), brk, 0.3);
              w.g.gain.setTargetAtTime(0.12, brk + 0.9, wash * 0.3);
              w.lp.frequency.setTargetAtTime(U.rand(350, 550), brk + 0.9, wash * 0.35);
              // piana syczy dłużej niż szum wody i drobno się iskrzy
              const foam = peak * 0.16;
              w.foam.gain.setTargetAtTime(foam, brk + 0.25, 0.35);
              for (let x = brk + 1.2; x < brk + wash; x += 0.11) {
                const fall = Math.exp(-(x - brk - 1.2) / (wash * 0.45));
                w.foam.gain.setTargetAtTime(foam * fall * U.rand(0.55, 1), x, 0.04);
              }
              w.foam.gain.setTargetAtTime(0, brk + wash, 0.6);
              w.next = brk + wash + U.rand(0, 2);
            }
          });
        }

        if (level.fire > 0.01) {
          ready('fire');
          if (nextRoar < now) nextRoar = now;
          while (nextRoar < until) {
            roar.gain.setTargetAtTime(U.rand(0.14, 0.38), nextRoar, 0.6);
            nextRoar += U.rand(0.8, 2.5);
          }
        }

        if (level.birds > 0.01) {
          if (nextBird < now) nextBird = now + U.rand(0.3, 2);
          while (nextBird < until) {
            const sp = U.pick(species);
            const end = song(sp, nextBird, U.clamp(sp.pan + U.rand(-0.1, 0.1), -1, 1), sp.dist);
            // odpowiedź z drugiej strony, trochę dalej
            if (U.chance(0.3)) song(sp, end + U.rand(0.5, 1.6), U.clamp(-sp.pan + U.rand(-0.2, 0.2), -1, 1), sp.dist * U.rand(0.5, 0.85));
            nextBird = Math.max(nextBird + U.rand(1.2, 5) / (0.25 + level.birds), end + 0.3);
          }
        } else nextBird = 0;
      }
    };
  };
})(window.Nurt);
