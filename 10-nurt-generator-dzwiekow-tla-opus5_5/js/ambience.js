/* =====================================================================
   Nurt – burza, świerszcze i pociąg
   Jak natura: tylko z miksera, syntezowane na żywo, a każda warstwa
   powstaje dopiero przy pierwszym użyciu.
   Burza to ulewa z porywami wiatru i grzmoty z modelu kanału błyskawicy:
   bliski zaczyna się trzaskiem, daleki tylko się toczy. Świerszcze to czyste tony cięte na impulsy,
   każdy owad w swoim rytmie. Pociąg to stukot kół na stykach szyn
   (dwa wózki wagonu: „ta-dam… ta-dam”) nad szumem toczenia.
   ===================================================================== */
'use strict';
(function (N) {
  const U = N.util;

  // dodatnia połówka sinusa do sześcianu: krótki impuls, potem cisza
  const PULSE = Float32Array.from({ length: 256 }, (_, k) => Math.pow(Math.max(0, k / 255 * 2 - 1), 3));

  N.createAmbience = function (E) {
    const ctx = E.ctx, B = E.buffers;
    const gains = { storm: U.gain(ctx, 0), crickets: U.gain(ctx, 0), train: U.gain(ctx, 0) };
    for (const k in gains) gains[k].connect(E.bus);
    gains.storm.connect(U.gain(ctx, 0.5)).connect(E.reverbIn);
    gains.crickets.connect(U.gain(ctx, 0.12)).connect(E.reverbIn);
    gains.train.connect(U.gain(ctx, 0.05)).connect(E.reverbIn);
    const src = (buf, off) => { const s = U.loop(ctx, buf, off); s.start(ctx.currentTime, s.offset0); return s; };
    const level = { storm: 0, crickets: 0, train: 0 };
    let running = false;

    // ---------- burza ----------
    // Ulewa z porywami wiatru, a nad nią grzmoty liczone z modelu kanału błyskawicy
    // (B.thunder): każdy jest inny, bliski zaczyna się trzaskiem, daleki tylko się toczy.
    let downpour, gustBp, gustG, nextThunder = 0, nextGust = 0;
    function thunder(t) {
      const r = U.random();
      const D = r < 0.25 ? U.rand(300, 1200) : r < 0.7 ? U.rand(1200, 4000) : U.rand(4000, 11000);
      const s = ctx.createBufferSource();
      s.buffer = N.buffers.thunder(ctx, D);
      // powietrze tłumi wysokie tony tym mocniej, im grzmot dalej
      const lp = U.filter(ctx, 'lowpass', 2500 + 9000 / (1 + D / 1000), 0.5);
      const g = U.gain(ctx, Math.min(1, Math.sqrt(900 / (D + 600))));
      s.connect(lp).connect(g).connect(gains.storm);
      s.start(Math.max(t, ctx.currentTime));
      return s.buffer.duration;
    }
    // ---------- świerszcze ----------
    let crickets;
    function makeCricket(i) {
      const trill = i === 0 || U.chance(0.25);       // długi tryl (jak świerszcz drzewny) albo krótkie ćwierknięcia
      const dist = U.rand(0.35, 1);
      const o = ctx.createOscillator();
      o.frequency.value = trill ? U.rand(2800, 3600) : U.rand(3900, 5200);
      // impulsy: sinus podniesiony do potęgi, więc między nimi jest cisza
      const lfo = ctx.createOscillator();
      lfo.frequency.value = trill ? U.rand(38, 55) : U.rand(24, 34);
      const shaper = ctx.createWaveShaper();
      shaper.curve = PULSE;
      const pulse = U.gain(ctx, 0);
      lfo.connect(shaper).connect(pulse.gain);
      const gate = U.gain(ctx, 0);
      const out = U.filter(ctx, 'lowpass', 4000 + 5000 * dist, 0.5);
      o.connect(pulse).connect(gate).connect(out).connect(U.panner(ctx, U.rand(-0.85, 0.85))).connect(gains.crickets);
      o.start(ctx.currentTime);
      lfo.start(ctx.currentTime);
      return { trill, gate, amp: 0.05 + 0.1 * dist, pulses: U.randi(3, 5), rate: lfo.frequency.value, period: U.rand(0.38, 0.7), next: 0 };
    }

    // ---------- pociąg ----------
    let rumble, roar, speed = 24, speedTarget = 24, nextJoint = 0, nextSpeed = 0;
    function clack(t, a, pan) {
      const s = ctx.createBufferSource();
      s.buffer = B.white;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a * 1.8, t + 0.002);
      g.gain.setTargetAtTime(0, t + 0.004, 0.026);
      // głuche uderzenie koła, drewniany klekot wagonu i cichy metaliczny dźwięk szyny
      const thump = U.filter(ctx, 'bandpass', U.rand(170, 240), 1.1);
      const clatter = U.filter(ctx, 'bandpass', U.rand(600, 820), 1.6);
      const ring = U.filter(ctx, 'bandpass', U.rand(2300, 2900), 6);
      const p = U.panner(ctx, pan);
      s.connect(thump).connect(g);
      s.connect(clatter).connect(U.gain(ctx, 0.55)).connect(g);
      s.connect(ring).connect(U.gain(ctx, 0.12)).connect(g);
      g.connect(p).connect(gains.train);
      s.start(t, U.rand(0, B.white.duration - 0.5));
      s.stop(t + 0.25);
    }

    const build = {
      storm() {
        // ulewa: ta sama tekstura kropli co deszcz, ale wolniej (cięższe krople) i gęściej
        downpour = U.gain(ctx, 0.25);
        const heavy = src(B.patter, 2.1);
        heavy.playbackRate.value = 0.78;
        heavy.connect(U.filter(ctx, 'highpass', 150, 0.6)).connect(U.filter(ctx, 'lowpass', 2400, 0.5)).connect(downpour);
        src(B.pink, 7.3).connect(U.filter(ctx, 'bandpass', 800, 0.5)).connect(U.gain(ctx, 0.12)).connect(downpour);
        downpour.connect(gains.storm);
        // porywy wiatru niosące deszcz
        gustBp = U.filter(ctx, 'bandpass', 500, 1);
        gustG = U.gain(ctx, 0.1);
        src(B.pink, 1.9).connect(gustBp).connect(U.filter(ctx, 'lowpass', 1800, 0.5)).connect(gustG).connect(gains.storm);
        // daleki pomruk nieba między grzmotami
        src(B.brown, 3.9).connect(U.filter(ctx, 'lowpass', 90, 0.7)).connect(U.gain(ctx, 0.12)).connect(gains.storm);
      },
      crickets() {
        crickets = Array.from({ length: U.randi(4, 6) }, (_, i) => makeCricket(i));
      },
      train() {
        // szum toczenia: niski pomruk wagonu i jaśniejszy szum kół i powietrza
        rumble = U.gain(ctx, 0.5);
        src(B.brown, 7.7).connect(U.filter(ctx, 'lowpass', 150, 0.7)).connect(rumble).connect(gains.train);
        roar = U.gain(ctx, 0.12);
        src(B.pink, 5.3).connect(U.filter(ctx, 'bandpass', 420, 0.8)).connect(roar).connect(gains.train);
        src(B.pink, 8.8).connect(U.filter(ctx, 'bandpass', 2600, 1.2)).connect(U.gain(ctx, 0.025)).connect(gains.train);
      }
    };
    const built = {};
    const ready = k => { if (!built[k]) { build[k](); built[k] = true; } };

    return {
      gains,
      start() { running = true; },
      setParams(m) {
        level.storm = m.storm; level.crickets = m.crickets; level.train = m.train;
      },
      schedule(until) {
        if (!running) return;
        const now = ctx.currentTime;

        if (level.storm > 0.01) {
          ready('storm');
          if (!nextThunder || nextThunder < now - 30) nextThunder = now + U.rand(1.5, 4);
          while (nextThunder < until) {
            thunder(nextThunder);
            nextThunder += U.rand(8, 28) / (0.4 + level.storm);
          }
          if (nextGust < now) nextGust = now;
          while (nextGust < until) {
            const d = U.rand(1.5, 4.5), g = Math.pow(U.random(), 1.5);
            gustBp.frequency.setTargetAtTime(U.rand(300, 900), nextGust, d * 0.4);
            gustG.gain.setTargetAtTime(0.02 + 0.15 * g, nextGust, d * 0.35);
            downpour.gain.setTargetAtTime(0.2 + 0.12 * g, nextGust, d * 0.4); // w porywie deszcz zacina mocniej
            nextGust += d;
          }
        } else nextThunder = 0;

        if (level.crickets > 0.01) {
          ready('crickets');
          for (const c of crickets) {
            if (c.next < now) c.next = now + U.rand(0, 0.6);
            while (c.next < until) {
              const t = c.next;
              if (c.trill) {
                const len = U.rand(2, 7);
                c.gate.gain.setTargetAtTime(c.amp, t, 0.08);
                c.gate.gain.setTargetAtTime(0, t + len, 0.12);
                c.next = t + len + U.rand(0.4, 2.2);
              } else {
                const len = c.pulses / c.rate;
                c.gate.gain.setTargetAtTime(c.amp, t, 0.004);
                c.gate.gain.setTargetAtTime(0, t + len, 0.006);
                // świerszcz czasem milknie na chwilę
                c.next = t + (U.chance(0.06) ? U.rand(1.5, 5) : c.period * U.rand(0.92, 1.08));
              }
            }
          }
        }

        if (level.train > 0.01) {
          ready('train');
          if (nextSpeed < now) nextSpeed = now;
          while (nextSpeed < until) {
            if (U.chance(0.3)) speedTarget = U.rand(18, 30);   // m/s, czyli ok. 65–110 km/h
            nextSpeed += U.rand(8, 20);
          }
          if (nextJoint < now) nextJoint = now + 0.1;
          while (nextJoint < until) {
            speed += (speedTarget - speed) * 0.04;
            const t = nextJoint, v = speed, a = 0.5 + 0.3 * (v - 18) / 12;
            // styk szyn co 25 m: przedni wózek (dwie osie co 2,5 m), potem tylny 17,5 m dalej
            clack(t, a * U.rand(0.85, 1), -0.25);
            clack(t + 2.5 / v, a * U.rand(0.7, 0.9), -0.25);
            clack(t + 17.5 / v, a * U.rand(0.55, 0.75), 0.25);
            clack(t + 20 / v, a * U.rand(0.45, 0.65), 0.25);
            const sway = U.rand(0.85, 1.15);
            rumble.gain.setTargetAtTime(0.3 * sway * (0.7 + 0.3 * v / 30), t, 0.6);
            roar.gain.setTargetAtTime(0.1 * (0.6 + 0.4 * v / 30), t, 0.6);
            nextJoint = t + 25 / v * U.rand(0.99, 1.01);
          }
        }
      }
    };
  };
})(window.Nurt);
