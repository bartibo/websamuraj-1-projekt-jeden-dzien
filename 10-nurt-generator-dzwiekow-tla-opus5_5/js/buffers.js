/* =====================================================================
   Nurt – surowce dźwiękowe liczone w przeglądarce
   Szumy (biały, różowy, brązowy), krople deszczu, trzaski winylu
   i odpowiedź impulsowa pogłosu. Zero plików, zero nagrań.
   ===================================================================== */
'use strict';
(function (N) {
  const B = N.buffers = {};

  // Koniec pętli przenika się z jej początkiem (równa moc), więc szew jest niesłyszalny
  function loopify(tmp, out, len, fade) {
    for (let i = 0; i < len; i++) out[i] = tmp[i];
    for (let i = 0; i < fade; i++) {
      const k = i / fade;
      out[i] = tmp[i] * Math.sqrt(k) + tmp[len + i] * Math.sqrt(1 - k);
    }
  }

  B.noise = function (ctx, type, seconds) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * seconds), fade = Math.floor(sr * 0.3);
    const buf = ctx.createBuffer(2, len, sr);
    const tmp = new Float32Array(len + fade);
    for (let c = 0; c < 2; c++) {
      if (type === 'white') {
        for (let i = 0; i < tmp.length; i++) tmp[i] = Math.random() * 2 - 1;
      } else if (type === 'pink') {
        // filtr Paula Kelleta: -3 dB na oktawę
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < tmp.length; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.0168980;
          tmp[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
          b6 = w * 0.115926;
        }
      } else {
        // brązowy: całkowany biały szum z lekkim „upływem”, -6 dB na oktawę
        let last = 0;
        for (let i = 0; i < tmp.length; i++) {
          last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
          tmp[i] = last * 3.5;
        }
      }
      loopify(tmp, buf.getChannelData(c), len, fade);
    }
    return buf;
  };

  /** Krople: krótki trzask uderzenia i pęcherzyk, którego ton rośnie (rezonans Minnaerta). */
  B.rainDrops = function (ctx, seconds) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(2, len, sr);
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    const count = Math.floor(seconds * 120);
    for (let k = 0; k < count; k++) {
      const start = Math.floor(Math.random() * len);
      const heavy = Math.random() < 0.07;
      const f0 = heavy ? 450 + Math.random() * 700 : 1300 + Math.random() * 3800;
      const tau = heavy ? 0.010 + Math.random() * 0.012 : 0.0018 + Math.random() * 0.0055;
      const amp = heavy ? 0.22 + Math.random() * 0.2 : 0.04 + Math.pow(Math.random(), 3) * 0.42;
      const p = Math.random();
      const gl = Math.cos(p * Math.PI / 2), gr = Math.sin(p * Math.PI / 2);
      const n = Math.floor(tau * 7 * sr);
      let ph = 0;
      for (let j = 0; j < n; j++) {
        const t = j / sr;
        const f = f0 * (1 + 1.1 * j / n);
        ph += 2 * Math.PI * f / sr;
        const v = Math.sin(ph) * Math.exp(-t / tau) * amp;
        const idx = (start + j) % len;
        L[idx] += v * gl;
        R[idx] += v * gr;
      }
      for (let j = 0; j < 20; j++) {
        const v = (Math.random() * 2 - 1) * amp * 0.5 * Math.exp(-j / 4);
        const idx = (start + j) % len;
        L[idx] += v * gl;
        R[idx] += v * gr;
      }
    }
    return buf;
  };

  /** Winyl: cichy szum powierzchni, drobne trzaski i rzadkie mocniejsze „pyknięcia”. */
  B.crackle = function (ctx, seconds) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += 0.2 * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * 0.035;
      }
      const n = Math.floor(seconds * 16);
      for (let k = 0; k < n; k++) {
        const s = Math.floor(Math.random() * len);
        const big = Math.random() < 0.06;
        const a = big ? 0.5 + Math.random() * 0.4 : 0.06 + Math.pow(Math.random(), 4) * 0.4;
        const width = big ? 3 + Math.random() * 6 : 1 + Math.random() * 2.5;
        const sign = Math.random() < 0.5 ? -1 : 1;
        const m = Math.floor(width * 6);
        for (let j = 0; j < m; j++) {
          d[(s + j) % len] += sign * a * Math.exp(-j / width) * (j % 2 ? -0.55 : 1);
        }
      }
    }
    return buf;
  };

  /** Pogłos „średniego pokoju”: ciemniejący z czasem, wykładniczo gasnący szum. */
  B.impulse = function (ctx, seconds, decay) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const a = 0.55 * (1 - t) + 0.03;
        lp += a * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * Math.pow(1 - t, decay);
      }
      // kilka wczesnych odbić
      for (let k = 0; k < 8; k++) {
        const i = Math.floor(sr * (0.008 + Math.random() * 0.06));
        d[i] += (Math.random() < 0.5 ? -1 : 1) * (0.5 - k * 0.05);
      }
    }
    return buf;
  };
})(window.Nurt);
