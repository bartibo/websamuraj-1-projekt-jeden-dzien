/* =====================================================================
   Nurt – generatywne lo-fi
   Nic nie jest nagrane i nic się nie powtarza: progresje jazzowych
   akordów, elektryczne pianino (synteza FM), bas, miękki bit, krótkie
   frazy melodii i ambientowy pad są komponowane takt po takcie.
   Całość przechodzi przez „taśmę” (wow i flutter), lekkie nasycenie
   i filtr, a obok kręci się płyta z trzaskami.
   Energia zmienia tempo, gęstość akompaniamentu, wejście bitu i jasność.
   ===================================================================== */
'use strict';
(function (N) {
  const U = N.util;

  // Interwały od pryma akordu (prymę gra bas)
  const QUAL = {
    maj7: [0, 4, 7, 11], maj9: [4, 7, 11, 14], m7: [0, 3, 7, 10], m9: [3, 7, 10, 14],
    m11: [3, 7, 10, 17], d13: [4, 10, 14, 21], d7b9: [4, 7, 10, 13], sus: [5, 7, 10, 14],
    six9: [4, 7, 9, 14]
  };
  // Progresje w stopniach (półtony od toniki)
  const PROGS = [
    [[2, 'm9'], [7, 'd13'], [0, 'maj9'], [9, 'm9']],     // ii–V–I–vi
    [[5, 'maj9'], [4, 'm7'], [2, 'm9'], [0, 'maj7']],    // IV–iii–ii–I
    [[9, 'm9'], [5, 'maj9'], [0, 'maj9'], [7, 'sus']],
    [[0, 'maj9'], [9, 'd7b9'], [2, 'm9'], [7, 'd13']],   // I–VI7–ii–V
    [[5, 'maj9'], [5, 'm9'], [0, 'maj9'], [0, 'six9']],  // molowa subdominanta
    [[2, 'm11'], [7, 'd13'], [4, 'm7'], [9, 'm9']],
    [[0, 'maj9'], [4, 'm7'], [5, 'maj9'], [7, 'sus']]
  ];
  const PENTA = [0, 2, 4, 7, 9];

  // Wzory rytmiczne [krok szesnastkowy, długość w krokach, siła]
  const KEYS = {
    calm: [[[0, 16, 0.75]], [[0, 10, 0.75], [10, 6, 0.5]]],
    mid: [
      [[0, 6, 0.8], [6, 2, 0.5], [10, 6, 0.6]],
      [[0, 8, 0.75], [8, 8, 0.6]],
      [[0, 3, 0.8], [3, 5, 0.55], [10, 6, 0.6]]
    ],
    busy: [
      [[0, 3, 0.8], [3, 5, 0.55], [10, 2, 0.5], [12, 4, 0.6]],
      [[2, 4, 0.6], [6, 4, 0.55], [11, 5, 0.65]],
      [[0, 6, 0.8], [6, 2, 0.5], [10, 6, 0.6]],
      [[0, 2, 0.75], [3, 3, 0.6], [8, 2, 0.6], [11, 5, 0.6]]
    ]
  };
  // Bas: r – pryma, f – kwinta, o – oktawa, a – dźwięk prowadzący do następnego akordu
  const BASS = {
    slow: [[[0, 15, 0.9, 'r']]],
    mid: [
      [[0, 7, 0.95, 'r'], [10, 5, 0.75, 'r']],
      [[0, 6, 0.95, 'r'], [7, 3, 0.6, 'f'], [10, 6, 0.8, 'r']]
    ],
    busy: [
      [[0, 3, 0.95, 'r'], [3, 4, 0.55, 'r'], [8, 2, 0.7, 'f'], [10, 4, 0.8, 'r'], [14, 2, 0.6, 'a']],
      [[0, 6, 0.95, 'r'], [6, 2, 0.6, 'o'], [10, 4, 0.8, 'f'], [14, 2, 0.6, 'a']],
      [[0, 7, 0.95, 'r'], [10, 4, 0.8, 'r'], [14, 2, 0.6, 'a']]
    ]
  };
  const KICKS = [[0, 10], [0, 7, 10], [0, 10, 11], [0, 3, 10]];

  N.createLofi = function (E) {
    const ctx = E.ctx, B = E.buffers;

    // ---------- tor sygnału ----------
    const gains = {
      pad: U.gain(ctx, 0), keys: U.gain(ctx, 0), bass: U.gain(ctx, 0),
      drums: U.gain(ctx, 0), melody: U.gain(ctx, 0), vinyl: U.gain(ctx, 0)
    };
    const input = U.gain(ctx, 1);
    ['pad', 'keys', 'bass', 'drums', 'melody'].forEach(k => gains[k].connect(input));

    // taśma: modulowane opóźnienie = lekkie pływanie wysokości dźwięku
    const tape = ctx.createDelay(0.1);
    tape.delayTime.value = 0.02;
    const wow = ctx.createOscillator(); wow.frequency.value = 0.42;
    const flutter = ctx.createOscillator(); flutter.frequency.value = 6.1;
    wow.connect(U.gain(ctx, 0.0014)).connect(tape.delayTime);
    flutter.connect(U.gain(ctx, 0.00005)).connect(tape.delayTime);

    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = i / (curve.length - 1) * 2 - 1;
      curve[i] = Math.tanh(1.6 * x) / Math.tanh(1.6);
    }
    shaper.curve = curve;
    shaper.oversample = '2x';

    const tone = U.filter(ctx, 'lowpass', 3000, 0.6);
    const out = U.gain(ctx, 1);
    input.connect(tape).connect(shaper).connect(tone)
      .connect(U.filter(ctx, 'highpass', 38, 0.5)).connect(out);
    out.connect(E.bus);
    out.connect(U.gain(ctx, 0.16)).connect(E.reverbIn);
    gains.pad.connect(U.gain(ctx, 0.3)).connect(E.reverbIn);
    gains.melody.connect(U.gain(ctx, 0.35)).connect(E.reverbIn);

    // filtr padu z bardzo wolnym oddechem
    const padTone = U.filter(ctx, 'lowpass', 800, 0.7);
    padTone.connect(gains.pad);
    const breath = ctx.createOscillator(); breath.frequency.value = 0.07;
    breath.connect(U.gain(ctx, 220)).connect(padTone.frequency);

    const bassTone = U.filter(ctx, 'lowpass', 620, 0.8);
    bassTone.connect(gains.bass);

    // wspólne pozycje w panoramie (taniej niż osobny panner dla każdej nuty)
    const keyPans = [-0.3, -0.1, 0.12, 0.32].map(p => { const n = U.panner(ctx, p); n.connect(gains.keys); return n; });
    const hatPan = U.panner(ctx, 0.18);
    hatPan.connect(gains.drums);

    // płyta: trzaski omijają filtr „taśmy”
    const crackle = U.loop(ctx, B.crackle, 0);
    crackle.connect(U.filter(ctx, 'highpass', 700, 0.5))
      .connect(U.filter(ctx, 'lowpass', 9000, 0.5))
      .connect(gains.vinyl).connect(E.bus);

    // ---------- instrumenty ----------
    function stopLater(nodes, t) { nodes.forEach(n => n.stop(t)); }

    /** Elektryczne pianino: FM 1:1, jasny atak przechodzi w miękkie, okrągłe brzmienie. */
    function ep(t, midi, vel, dur) {
      const f = U.mtof(midi);
      const car = ctx.createOscillator(); car.frequency.value = f;
      const mod = ctx.createOscillator(); mod.frequency.value = f;
      const idx = ctx.createGain();
      idx.gain.setValueAtTime(f * (0.6 + vel * 1.4), t);
      idx.gain.exponentialRampToValueAtTime(f * 0.1, t + 0.6);
      mod.connect(idx).connect(car.frequency);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vel * 0.2, t + 0.006);
      env.gain.setTargetAtTime(vel * 0.075, t + 0.006, 0.4);
      env.gain.setTargetAtTime(0, t + dur, 0.16);
      car.connect(env).connect(U.pick(keyPans));
      car.start(t); mod.start(t);
      stopLater([car, mod], t + dur + 0.9);
    }

    function bassNote(t, midi, vel, dur) {
      const f = U.mtof(midi);
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const sub = ctx.createOscillator(); sub.frequency.value = f;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vel * 0.5, t + 0.012);
      env.gain.setTargetAtTime(vel * 0.32, t + 0.012, 0.35);
      env.gain.setTargetAtTime(0, t + dur, 0.06);
      o.connect(env); sub.connect(env);
      env.connect(bassTone);
      o.start(t); sub.start(t);
      stopLater([o, sub], t + dur + 0.6);
    }

    function padChord(t, notes, dur) {
      const env = ctx.createGain();
      const att = Math.min(2.2, dur * 0.5);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(1, t + att);
      env.gain.setValueAtTime(1, t + dur);
      env.gain.linearRampToValueAtTime(0, t + dur + 2.6);
      env.connect(padTone);
      const sides = [U.panner(ctx, -0.45), U.panner(ctx, 0.45)];
      sides.forEach(p => p.connect(env));
      const oscs = [];
      notes.forEach((m, i) => {
        [-7, 7].forEach((cents, side) => {
          const o = ctx.createOscillator();
          o.type = 'sawtooth';
          o.frequency.value = U.mtof(m);
          o.detune.value = cents + U.rand(-3, 3);
          o.connect(U.gain(ctx, i === 0 ? 0.07 : 0.05)).connect(sides[side]);
          o.start(t);
          oscs.push(o);
        });
      });
      stopLater(oscs, t + dur + 2.8);
    }

    function melodyNote(t, midi, vel, dur) {
      const f = U.mtof(midi);
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const s = ctx.createOscillator(); s.frequency.value = f * 2;
      const vib = ctx.createOscillator(); vib.frequency.value = 5.2;
      const vibAmt = ctx.createGain();
      vibAmt.gain.setValueAtTime(0, t);
      vibAmt.gain.linearRampToValueAtTime(f * 0.006, t + 0.35);
      vib.connect(vibAmt); vibAmt.connect(o.frequency); vibAmt.connect(s.frequency);
      const lp = U.filter(ctx, 'lowpass', 2600, 0.5);
      const sg = U.gain(ctx, 0.12);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(vel * 0.16, t + 0.04);
      env.gain.setTargetAtTime(vel * 0.1, t + 0.04, 0.3);
      env.gain.setTargetAtTime(0, t + dur, 0.12);
      o.connect(lp); s.connect(sg).connect(lp);
      lp.connect(env).connect(U.panner(ctx, U.rand(-0.2, 0.2))).connect(gains.melody);
      o.start(t); s.start(t); vib.start(t);
      stopLater([o, s, vib], t + dur + 0.9);
    }

    function noiseHit(t, dur) {
      const s = ctx.createBufferSource();
      s.buffer = B.white;
      s.start(t, Math.random() * (B.white.duration - 1));
      s.stop(t + dur);
      return s;
    }

    function kick(t, vel) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(135, t);
      o.frequency.exponentialRampToValueAtTime(52, t + 0.09);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      o.connect(g).connect(gains.drums);
      o.start(t); o.stop(t + 0.45);
    }

    function snare(t, vel) {
      const n = noiseHit(t, 0.3);
      const bp = U.filter(ctx, 'bandpass', 1800, 0.7);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vel * 0.55, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      n.connect(bp).connect(g).connect(gains.drums);
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(200, t);
      o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
      const og = ctx.createGain();
      og.gain.setValueAtTime(vel * 0.3, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(og).connect(gains.drums);
      o.start(t); o.stop(t + 0.12);
      g.connect(U.gain(ctx, 0.25)).connect(E.reverbIn);
    }

    function rim(t, vel) {
      const n = noiseHit(t, 0.08);
      const bp = U.filter(ctx, 'bandpass', 2400, 3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vel * 0.7, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      n.connect(bp).connect(g).connect(gains.drums);
      const o = ctx.createOscillator(); o.frequency.value = 1650;
      const og = ctx.createGain();
      og.gain.setValueAtTime(vel * 0.12, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
      o.connect(og).connect(gains.drums);
      o.start(t); o.stop(t + 0.05);
      g.connect(U.gain(ctx, 0.3)).connect(E.reverbIn);
    }

    function hat(t, vel, open) {
      const len = open ? 0.28 : 0.05;
      const n = noiseHit(t, len + 0.02);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vel * 0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      n.connect(U.filter(ctx, 'highpass', 7200, 0.7)).connect(g).connect(hatPan);
    }

    // ---------- harmonia ----------
    let key = U.pick([0, 2, 3, 5, 7, 8, 10]);
    let prog = U.pick(PROGS);
    let ci = 0, chordBars = 0, chordLen = 1, cycles = 0;

    function fold(n, lo) {
      const pc = ((n % 12) + 12) % 12;
      let m = lo - (lo % 12) + pc;
      if (m < lo) m += 12;
      return m;
    }
    function chordAt(i) {
      const [r, q] = prog[i % prog.length];
      const root = (key + r) % 12;
      const notes = QUAL[q].map(iv => fold(root + iv, 55)).sort((a, b) => a - b);
      let bass = 36 + root;
      if (bass > 43) bass -= 12;
      return { root, notes, bass };
    }
    function advanceChord() {
      ci++;
      if (ci % prog.length === 0) {
        ci = 0;
        cycles++;
        if (U.chance(0.45)) prog = U.pick(PROGS);
        if (cycles % 4 === 0 && U.chance(0.5)) key = (key + U.pick([5, 7, 2, 10])) % 12;
      }
    }
    function scaleNotes() {
      const out = [];
      for (let m = 64; m <= 84; m++) if (PENTA.includes(((m - key) % 12 + 12) % 12)) out.push(m);
      return out;
    }

    // ---------- sekwencer (planuje całe takty, zawsze trochę przed czasem) ----------
    let mix = N.mix.at(0.5);
    let barStart = 0, barNo = 0, kickPat = KICKS[0], breakdown = 0, melIdx = 6;
    let running = false;

    function playBar(t0, barDur) {
      const m = mix, e = m.energy;
      const sd = barDur / 16;
      const swing = 0.2;
      const at = s => t0 + s * sd + (s % 2 ? sd * swing : 0) + U.rand(-0.004, 0.004);

      if (chordBars >= chordLen) {
        advanceChord();
        chordBars = 0;
      }
      if (chordBars === 0) chordLen = e < 0.3 ? 2 : 1;
      const chord = chordAt(ci), next = chordAt(ci + 1);
      const firstBarOfChord = chordBars === 0;
      chordBars++;

      if (barNo % 8 === 0) {
        breakdown = (barNo > 0 && U.chance(0.22)) ? 2 : 0;
        kickPat = U.pick(KICKS);
      }

      // pad
      if (m.pad > 0.015 && firstBarOfChord) {
        padChord(t0, [chord.bass + 12].concat(chord.notes.slice(0, 3)), barDur * chordLen);
      }

      // pianino
      if (m.keys > 0.015) {
        if (e < 0.22) {
          // tryb ambientowy: pojedyncze, rozłożone dźwięki akordu oktawę wyżej
          const steps = U.pick([[0, 6, 10], [0, 8], [2, 7, 12], [0, 5, 9, 13]]);
          steps.forEach(s => ep(at(s), U.pick(chord.notes) + 12, U.rand(0.35, 0.6), sd * 10));
        } else {
          const pats = e < 0.42 ? KEYS.calm : e < 0.62 ? KEYS.mid : KEYS.busy;
          const pat = U.pick(pats);
          const strum = e < 0.5 ? 0.028 : 0.014;
          pat.forEach(([s, len, v]) => {
            chord.notes.forEach((n, i) => ep(at(s) + i * strum, n, v * U.rand(0.85, 1), len * sd * 0.92));
          });
        }
      }

      // bas
      if (m.bass > 0.015) {
        const pat = U.pick(e < 0.45 ? BASS.slow : e < 0.68 ? BASS.mid : BASS.busy);
        pat.forEach(([s, len, v, which]) => {
          let n = chord.bass;
          if (which === 'f') n = chord.bass + 7 > 47 ? chord.bass - 5 : chord.bass + 7;
          else if (which === 'o') n = chord.bass + 12;
          else if (which === 'a') n = next.bass + (U.chance(0.5) ? -1 : 2);
          bassNote(at(s), n, v, len * sd * 0.9);
        });
      }

      // bit
      if (m.drums > 0.015) {
        const fill = barNo % 8 === 7;
        if (breakdown === 0) {
          kickPat.forEach(s => { if (!(fill && s === 10)) kick(at(s), s === 0 ? 0.95 : 0.75); });
        }
        const back = e < 0.5 ? rim : snare;
        if (breakdown === 0 || barNo % 2 === 1) {
          back(at(4), 0.85);
          back(at(12), 0.9);
        }
        if (e > 0.7 && U.chance(0.35)) back(at(U.pick([7, 15])), 0.25);
        if (fill) { back(at(14), 0.35); back(at(15), 0.5); }
        const openAt = e > 0.6 && U.chance(0.25) ? 14 : -1;
        for (let s = 0; s < 16; s++) {
          if (s % 2 === 0) {
            if (s === openAt) hat(at(s), 0.5, true);
            else hat(at(s), (s % 4 === 0 ? 0.55 : 0.38) * U.rand(0.8, 1.1));
          } else if (e > 0.72 && U.chance(0.18)) {
            hat(at(s), 0.22);
          }
        }
      }

      // melodia: krótka fraza z pentatoniki, ruch głównie po sąsiednich dźwiękach
      if (m.melody > 0.03 && U.chance(0.18 + 0.4 * m.melody)) {
        const scale = scaleNotes();
        const all = [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14];
        const count = U.randi(3, 6);
        const steps = all.filter(() => U.chance(count / all.length)).slice(0, 6);
        steps.forEach((s, i) => {
          melIdx = U.clamp(melIdx + U.pick([-2, -1, -1, 0, 1, 1, 2]), 0, scale.length - 1);
          const nextS = i + 1 < steps.length ? steps[i + 1] : 16;
          const len = Math.min(4, nextS - s);
          melodyNote(at(s), scale[melIdx], U.rand(0.55, 0.85), len * sd * 0.95);
        });
      }

      if (breakdown > 0) breakdown--;
    }

    return {
      gains,
      start(t) {
        [wow, flutter, breath, crackle].forEach(n => n.start(t, n.offset0 || 0));
        barStart = t + 0.08;
        running = true;
      },
      setParams(m, immediate) {
        mix = m;
        const t = ctx.currentTime;
        const pf = 480 + 820 * m.energy;
        if (immediate) {
          tone.frequency.setValueAtTime(m.cutoff, t);
          padTone.frequency.setValueAtTime(pf, t);
        } else {
          tone.frequency.setTargetAtTime(m.cutoff, t, 0.8);
          padTone.frequency.setTargetAtTime(pf, t, 0.8);
        }
      },
      schedule(until) {
        if (!running) return;
        if (barStart < ctx.currentTime) barStart = ctx.currentTime + 0.05; // po uśpieniu karty
        while (barStart < until) {
          const barDur = 240 / mix.bpm;
          playBar(barStart, barDur);
          barStart += barDur;
          barNo++;
        }
      }
    };
  };
})(window.Nurt);
