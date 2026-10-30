/* =====================================================================
   Nurt – gwar kawiarni, w całości syntezowany
   Rozmowy: każdy „gość” to brzęczyk krtani przepuszczony przez filtry
   formantowe, które przeskakują między samogłoskami w rytmie sylab.
   Goście siedzą parami i mówią na zmianę, z intonacją zdań i pytań.
   Słów nie da się zrozumieć (i dobrze, nie rozpraszają), ale całość
   brzmi jak sala pełna ludzi. Do tego filiżanki, łyżeczki, ekspres
   z dyszą do mleka i młynek.
   ===================================================================== */
'use strict';
(function (N) {
  const U = N.util;
  // formanty F1/F2 samogłosek: a, e, i, o, u, y
  const VOWELS = [[800, 1250], [520, 1800], [300, 2300], [520, 920], [330, 800], [430, 1650]];
  const MAX_VOICES = 10;

  N.createCafe = function (E) {
    const ctx = E.ctx, B = E.buffers;
    const gains = { cafe: U.gain(ctx, 0) };
    const out = gains.cafe;
    out.connect(E.bus);
    out.connect(U.gain(ctx, 0.5)).connect(E.reverbIn);

    // sala: wszystko, co słychać z daleka, jest przyciemnione
    const room = U.gain(ctx, 1);
    room.connect(U.filter(ctx, 'lowpass', 2900, 0.5)).connect(out);
    const near = U.gain(ctx, 1); // naczynia i ekspres – jaśniejsze, bez filtra sali
    near.connect(out);

    const sources = [];

    // tło sali: szum głosów zlany w jedno
    const bedGain = U.gain(ctx, 0.3);
    const bed = U.loop(ctx, B.pink, 2.7);
    sources.push(bed);
    bed.connect(U.filter(ctx, 'bandpass', 560, 0.55)).connect(bedGain).connect(room);
    const bed2 = U.loop(ctx, B.brown, 5.1);
    sources.push(bed2);
    bed2.connect(U.filter(ctx, 'bandpass', 260, 0.8)).connect(U.gain(ctx, 0.35)).connect(room);

    // ---------- goście ----------
    // Gość „siada przy stoliku”, gdy gwar rośnie, i wychodzi, gdy cichnie –
    // dzięki temu przy niskiej energii kawiarnia nie zużywa procesora.
    function makeVoice(i, t) {
      const male = i % 2 === 0 ? U.chance(0.7) : U.chance(0.3);
      const close = U.rand(0.3, 1);
      const v = {
        idx: i, f0: male ? U.rand(95, 135) : U.rand(175, 235), fs: male ? 1 : 1.16,
        next: t + U.rand(0.2, 2.5), busyUntil: t
      };
      v.osc = ctx.createOscillator();
      v.osc.type = 'sawtooth';
      v.osc.frequency.value = v.f0;
      const srcG = U.gain(ctx, 0.6);
      v.osc.connect(srcG);
      v.f1 = U.filter(ctx, 'bandpass', 500, 6);
      v.f2 = U.filter(ctx, 'bandpass', 1500, 9);
      const f3 = U.filter(ctx, 'bandpass', 2700 * v.fs, 8);
      v.env = U.gain(ctx, 0);
      srcG.connect(v.f1).connect(U.gain(ctx, 1)).connect(v.env);
      srcG.connect(v.f2).connect(U.gain(ctx, 0.6)).connect(v.env);
      srcG.connect(f3).connect(U.gain(ctx, 0.25)).connect(v.env);
      // spółgłoski szumiące
      v.noise = U.loop(ctx, B.pink, U.rand(0, 9));
      v.nenv = U.gain(ctx, 0);
      v.noise.connect(U.filter(ctx, 'highpass', 3200, 0.7)).connect(v.nenv);
      const pan = U.panner(ctx, U.rand(-0.85, 0.85));
      v.env.connect(pan);
      v.nenv.connect(pan);
      v.out = U.gain(ctx, 0.3 + 0.7 * close);
      pan.connect(U.filter(ctx, 'lowpass', 1200 + 1700 * close, 0.5)).connect(v.out).connect(room);
      v.osc.start(t);
      v.noise.start(t, v.noise.offset0);
      v.osc.onended = () => v.out.disconnect();
      return v;
    }
    function retire(v, t) {
      v.env.gain.setTargetAtTime(0, t, 0.05);
      v.osc.stop(t + 0.5);
      v.noise.stop(t + 0.5);
    }
    const voices = new Array(MAX_VOICES).fill(null);

    function phrase(v, t) {
      const syl = U.randi(3, 13);
      const start = v.f0 * U.rand(1.0, 1.15);
      const question = U.chance(0.15);
      const end = v.f0 * (question ? U.rand(1.15, 1.3) : U.rand(0.8, 0.94));
      for (let s = 0; s < syl; s++) {
        const d = U.rand(0.11, 0.24);
        const [F1, F2] = U.pick(VOWELS);
        v.f1.frequency.setTargetAtTime(F1 * v.fs * U.rand(0.92, 1.08), t, 0.025);
        v.f2.frequency.setTargetAtTime(F2 * v.fs * U.rand(0.92, 1.08), t, 0.025);
        const k = s / Math.max(1, syl - 1);
        const f = U.lerp(start, end, question ? k * k : k) * U.rand(0.95, 1.05);
        v.osc.frequency.setTargetAtTime(f, t, 0.04);
        const amp = U.rand(0.5, 1) * (U.chance(0.25) ? 1 : 0.75);
        v.env.gain.setTargetAtTime(amp, t, 0.018);
        v.env.gain.setTargetAtTime(amp * 0.22, t + d * 0.72, 0.02);
        if (U.chance(0.3)) {
          v.nenv.gain.setTargetAtTime(0.5 * amp, t, 0.008);
          v.nenv.gain.setTargetAtTime(0, t + 0.045, 0.015);
        }
        t += d;
      }
      v.env.gain.setTargetAtTime(0, t, 0.05);
      return t;
    }

    // ---------- naczynia i ekspres ----------
    const CUP = [[1, 1, 1], [2.32, 0.5, 0.6], [4.25, 0.3, 0.4], [6.63, 0.15, 0.25]];
    function clink(t, vel, f, decay) {
      const g = U.gain(ctx, vel);
      g.connect(U.panner(ctx, U.rand(-0.8, 0.8))).connect(near);
      CUP.forEach(([r, a, dk]) => {
        const o = ctx.createOscillator();
        o.frequency.value = f * r * U.rand(0.995, 1.005);
        const e = ctx.createGain();
        e.gain.setValueAtTime(0, t);
        e.gain.linearRampToValueAtTime(a, t + 0.002);
        e.gain.exponentialRampToValueAtTime(0.0001, t + decay * dk);
        o.connect(e).connect(g);
        o.start(t);
        o.stop(t + decay + 0.05);
      });
    }
    function dishes(t) {
      const r = Math.random();
      if (r < 0.55) {
        clink(t, U.rand(0.04, 0.1), U.rand(1700, 3200), U.rand(0.25, 0.6));
      } else if (r < 0.85) {
        // mieszanie łyżeczką
        const n = U.randi(3, 7), f = U.rand(2800, 4200);
        for (let i = 0; i < n; i++) clink(t + i * U.rand(0.13, 0.2), U.rand(0.02, 0.05), f * U.rand(0.97, 1.03), 0.15);
      } else {
        // odstawiane talerze
        for (let i = 0; i < U.randi(2, 4); i++) clink(t + U.rand(0, 0.35), U.rand(0.03, 0.07), U.rand(900, 1700), U.rand(0.3, 0.7));
      }
    }
    function steam(t) {
      const dur = U.rand(3, 7);
      const n = ctx.createBufferSource();
      n.buffer = B.white;
      const e = ctx.createGain();
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(0.06, t + 0.5);
      for (let x = t + 0.6; x < t + dur; x += 0.11) e.gain.setTargetAtTime(U.rand(0.035, 0.075), x, 0.04);
      e.gain.setTargetAtTime(0, t + dur, 0.3);
      n.connect(U.filter(ctx, 'bandpass', U.rand(2800, 4200), 0.9)).connect(e)
        .connect(U.panner(ctx, U.rand(-0.6, 0.6))).connect(near);
      n.start(t, Math.random() * 3);
      n.stop(t + dur + 2);
    }
    function grinder(t) {
      const dur = U.rand(2.5, 4.5);
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(92, t);
      o.frequency.linearRampToValueAtTime(108, t + dur);
      const n = ctx.createBufferSource();
      n.buffer = B.white;
      const e = ctx.createGain();
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(0.05, t + 0.25);
      e.gain.setValueAtTime(0.05, t + dur);
      e.gain.linearRampToValueAtTime(0, t + dur + 0.4);
      o.connect(U.filter(ctx, 'bandpass', 1100, 1.4)).connect(e);
      n.connect(U.filter(ctx, 'bandpass', 1900, 1)).connect(U.gain(ctx, 0.6)).connect(e);
      e.connect(U.panner(ctx, U.rand(-0.6, 0.6))).connect(room);
      o.start(t); n.start(t, Math.random() * 3);
      o.stop(t + dur + 0.5); n.stop(t + dur + 0.5);
    }

    // ---------- planowanie ----------
    let density = 0, active = 0, running = false;
    let nextDish = 0, nextMachine = 0, nextBed = 0;

    return {
      gains,
      start(t) {
        sources.forEach(s => s.start(t, s.offset0 || 0));
        nextDish = t + U.rand(1, 3);
        nextMachine = t + U.rand(15, 40);
        nextBed = t;
        running = true;
      },
      setParams(m) {
        density = m.cafe;
        active = density > 0.02 ? Math.round(3 + 7 * density) : 0;
      },
      schedule(until) {
        if (!running) return;
        const now = ctx.currentTime;
        for (let i = 0; i < MAX_VOICES; i++) {
          let v = voices[i];
          if (i >= active) {
            if (v && now > v.busyUntil + 0.3) { retire(v, now); voices[i] = null; }
            continue;
          }
          if (!v) v = voices[i] = makeVoice(i, now);
          if (v.next < now) v.next = now + U.rand(0.05, 0.4);
          while (v.next < until) {
            const end = phrase(v, v.next);
            v.busyUntil = end;
            const p = voices[i ^ 1]; // goście siedzą parami i mówią na zmianę
            if (p && i < active && (i ^ 1) < active && U.chance(0.75)) {
              p.next = Math.max(p.next, end + U.rand(0.12, 0.6));
              v.next = end + U.rand(1.2, 4.5);
            } else {
              v.next = end + (U.chance(0.25) ? U.rand(3, 8) : U.rand(0.4, 2.2));
            }
          }
        }
        if (density > 0.02) {
          if (nextDish < now) nextDish = now + U.rand(0.2, 1);
          while (nextDish < until) {
            dishes(nextDish);
            nextDish += U.rand(1.2, 5.5) / (0.4 + density);
          }
        } else nextDish = now + U.rand(1, 3);
        if (density > 0.4) {
          while (nextMachine < until) {
            if (nextMachine >= now) (U.chance(0.65) ? steam : grinder)(nextMachine);
            nextMachine += U.rand(30, 85) / (0.5 + density);
          }
        } else nextMachine = Math.max(nextMachine, now + U.rand(8, 20));
        while (nextBed < until) {
          bedGain.gain.setTargetAtTime(U.rand(0.18, 0.36), Math.max(nextBed, now), 0.5);
          nextBed = Math.max(nextBed, now) + U.rand(0.6, 1.4);
        }
      }
    };
  };
})(window.Nurt);
