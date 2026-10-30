/* =====================================================================
   Nurt – natura: wiatr, fale morza, kominek i ptaki
   Energia ich nie włącza, dokłada się je w mikserze. Jak reszta Nurtu
   nic tu nie jest nagrane: wiatr i fale to szum przepuszczony przez
   filtry, które wędrują po losowych celach (więc nic się nie zapętla),
   kominek to bufor trzasków nad ciepłym pomrukiem płomieni, a ptaki
   to kilka „gatunków” wylosowanych na sesję, każdy ze swoim śpiewem.
   ===================================================================== */
'use strict';
(function (N) {
  const U = N.util;

  N.createNature = function (E) {
    const ctx = E.ctx, B = E.buffers;
    const gains = { wind: U.gain(ctx, 0), waves: U.gain(ctx, 0), fire: U.gain(ctx, 0), birds: U.gain(ctx, 0) };
    for (const k in gains) gains[k].connect(E.bus);
    gains.wind.connect(U.gain(ctx, 0.1)).connect(E.reverbIn);
    gains.birds.connect(U.gain(ctx, 0.45)).connect(E.reverbIn);
    gains.fire.connect(U.gain(ctx, 0.08)).connect(E.reverbIn);
    // Warstwa powstaje dopiero, gdy pierwszy raz zabrzmi, więc wyciszona nic nie kosztuje
    const src = (buf, off) => { const s = U.loop(ctx, buf, off); s.start(ctx.currentTime, s.offset0); return s; };
    let gusts, whistle, whistleG, nextWhistle = 0;
    let waves;
    let roar, nextRoar = 0;
    const build = {
      // ---------- wiatr: dwa podmuchy po bokach i cichy świst ----------
      wind() {
        gusts = [-0.55, 0.55].map((pan, i) => {
          const bp = U.filter(ctx, 'bandpass', 500, 1.2);
          const g = U.gain(ctx, 0.3);
          src(B.pink, 2.2 + i * 3.7).connect(bp).connect(g).connect(U.panner(ctx, pan)).connect(gains.wind);
          return { bp, g, next: 0 };
        });
        whistle = U.filter(ctx, 'bandpass', 1400, 14);
        whistleG = U.gain(ctx, 0);
        src(B.white, 1.1).connect(whistle).connect(whistleG).connect(gains.wind);
      },
      // ---------- fale: przypływ szumu, załamanie i syczące cofanie ----------
      waves() {
        waves = [-0.35, 0.35].map((pan, i) => {
          const lp = U.filter(ctx, 'lowpass', 400, 0.4);
          const g = U.gain(ctx, 0.1);
          src(B.pink, 6.1 + i * 2.3).connect(lp);
          src(B.brown, 1.7 + i * 4.4).connect(U.gain(ctx, 0.8)).connect(lp);
          lp.connect(g).connect(U.panner(ctx, pan)).connect(gains.waves);
          return { lp, g, next: 0 };
        });
        // morze w oddali: stały, ciemny szum pod falami
        src(B.brown, 8.3).connect(U.filter(ctx, 'lowpass', 300, 0.5)).connect(U.gain(ctx, 0.35)).connect(gains.waves);
      },
      // ---------- kominek: trzaski i pomruk płomieni ----------
      fire() {
        src(B.fire, U.rand(0, 10)).connect(U.filter(ctx, 'highpass', 260, 0.5))
          .connect(U.filter(ctx, 'lowpass', 7000, 0.5)).connect(gains.fire);
        roar = U.gain(ctx, 0.5);
        src(B.brown, 4.9).connect(U.filter(ctx, 'lowpass', 220, 0.7)).connect(roar).connect(gains.fire);
      }
    };
    const built = {};
    const ready = k => { if (!built[k]) { build[k](); built[k] = true; } };

    // ---------- ptaki ----------
    // Na sesję losuje się kilka gatunków, więc te same ptaki wracają ze swoim śpiewem
    const birdOut = U.filter(ctx, 'lowpass', 7500, 0.5);
    birdOut.connect(U.filter(ctx, 'highpass', 900, 0.5)).connect(gains.birds);
    const species = Array.from({ length: U.randi(3, 4) }, () => ({
      kind: U.pick(['chirp', 'chirp', 'whistle', 'trill']),
      f: U.rand(2400, 5200),
      pan: U.rand(-0.8, 0.8),
      dist: U.rand(0.35, 1),
      notes: U.randi(3, 7),
      gap: U.rand(0.07, 0.15)
    }));
    let nextBird = 0;

    function tone(t, f0, f1, dur, amp, pan, vib) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(amp, t + Math.min(0.012, dur * 0.3));
      env.gain.setTargetAtTime(0, t + dur * 0.55, dur * 0.18);
      if (vib) {
        const v = ctx.createOscillator(); v.frequency.value = vib;
        v.connect(U.gain(ctx, f0 * 0.03)).connect(o.frequency);
        v.start(t); v.stop(t + dur + 0.1);
      }
      o.connect(env).connect(U.panner(ctx, pan)).connect(birdOut);
      o.start(t); o.stop(t + dur + 0.1);
    }

    function song(sp, t) {
      const a = 0.05 + 0.12 * sp.dist;
      const pan = U.clamp(sp.pan + U.rand(-0.1, 0.1), -1, 1);
      if (sp.kind === 'chirp') {
        for (let i = 0; i < sp.notes + U.randi(-1, 1); i++) {
          const f = sp.f * U.rand(0.95, 1.05);
          tone(t, f, f * U.rand(0.62, 0.75), U.rand(0.04, 0.08), a * U.rand(0.7, 1), pan);
          t += sp.gap * U.rand(0.85, 1.2);
        }
      } else if (sp.kind === 'whistle') {
        for (let i = 0; i < U.randi(2, 3); i++) {
          const f = sp.f * 0.6 * U.pick([1, 1.12, 1.26, 0.89]);
          tone(t, f, f * U.pick([1.18, 0.86, 1.06]), U.rand(0.18, 0.36), a * 0.8, pan, 7);
          t += U.rand(0.3, 0.5);
        }
      } else {
        const n = U.randi(12, 26), f = sp.f * 1.15;
        for (let i = 0; i < n; i++) {
          tone(t, f, f * 0.8, 0.022, a * 0.6 * (1 - 0.5 * i / n), pan);
          t += 0.034;
        }
      }
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
              const d = U.rand(1.5, 4.5);
              gu.bp.frequency.setTargetAtTime(U.rand(260, 950), gu.next, d * 0.45);
              gu.bp.Q.setTargetAtTime(U.rand(0.8, 2.6), gu.next, d * 0.5);
              gu.g.gain.setTargetAtTime(Math.pow(U.rand(0.25, 1), 1.5) * 0.7, gu.next, d * 0.4);
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
              w.g.gain.setTargetAtTime(peak * 0.75, t, swell * 0.35);
              w.lp.frequency.setTargetAtTime(U.rand(900, 1500), t, swell * 0.4);
              // załamanie: krótki rozbłysk jasności, potem syczące cofanie się wody
              w.g.gain.setTargetAtTime(peak, t + swell, 0.15);
              w.lp.frequency.setTargetAtTime(U.rand(2600, 4200), t + swell, 0.12);
              w.g.gain.setTargetAtTime(0.12, t + swell + 0.5, wash * 0.35);
              w.lp.frequency.setTargetAtTime(U.rand(350, 550), t + swell + 0.5, wash * 0.4);
              w.next = t + swell + wash + U.rand(0, 2);
            }
          });
        }

        if (level.fire > 0.01) {
          ready('fire');
          if (nextRoar < now) nextRoar = now;
          while (nextRoar < until) {
            roar.gain.setTargetAtTime(U.rand(0.3, 0.75), nextRoar, 0.6);
            nextRoar += U.rand(0.8, 2.5);
          }
        }

        if (level.birds > 0.01) {
          if (nextBird < now) nextBird = now + U.rand(0.3, 2);
          while (nextBird < until) {
            song(U.pick(species), nextBird);
            nextBird += U.rand(1.2, 5) / (0.25 + level.birds);
          }
        } else nextBird = 0;
      }
    };
  };
})(window.Nurt);
