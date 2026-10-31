/* =====================================================================
   Nurt – surowce dźwiękowe liczone w przeglądarce
   Szumy (biały, różowy, brązowy), deszcz, trzaski winylu i kominka,
   grzmoty i odpowiedź impulsowa pogłosu. Zero plików, zero nagrań.
   ===================================================================== */
'use strict';
(function (N) {
  const B = N.buffers = {};
  const rnd = N.util.random;

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
        for (let i = 0; i < tmp.length; i++) tmp[i] = rnd() * 2 - 1;
      } else if (type === 'pink') {
        // filtr Paula Kelleta: -3 dB na oktawę
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < tmp.length; i++) {
          const w = rnd() * 2 - 1;
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
          last = (last + 0.02 * (rnd() * 2 - 1)) / 1.02;
          tmp[i] = last * 3.5;
        }
      }
      loopify(tmp, buf.getChannelData(c), len, fade);
    }
    return buf;
  };

  /**
   * Deszcz: tysiące drobnych uderzeń kropli na sekundę. Każde to krótki trzask szumu
   * z własną barwą (jedne głuche, inne jaśniejsze) i siłą: większość ledwo słychać,
   * nieliczne są wyraźne. Tak wygląda prawdziwy deszcz na spektrogramie: ziarnista
   * mgiełka w paśmie ok. 300 Hz–2 kHz, a nie gładki szum ani dzwoniące krople.
   */
  B.rainPatter = function (ctx, seconds, perSecond) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let k = Math.floor(seconds * perSecond); k > 0; k--) {
        const start = Math.floor(rnd() * len);
        const amp = 0.03 + Math.pow(rnd(), 5) * 0.9;               // większość cicha, nieliczne mocne
        const tau = (0.4 + Math.pow(rnd(), 2) * 3.5) * 1e-3 * sr;  // zanik 0,4–3,9 ms
        const color = 0.05 + rnd() * 0.4;                           // filtr: od głuchego do jasnego
        const dec = Math.exp(-1 / tau);
        let lp = 0, lp2 = 0, env = amp;
        for (let j = 0, m = Math.floor(tau * 4); j < m; j++) {
          lp += color * ((rnd() * 2 - 1) - lp);
          lp2 += color * (lp - lp2);
          d[(start + j) % len] += lp2 * env;
          env *= dec;
        }
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
        lp += 0.2 * ((rnd() * 2 - 1) - lp);
        d[i] = lp * 0.035;
      }
      const n = Math.floor(seconds * 16);
      for (let k = 0; k < n; k++) {
        const s = Math.floor(rnd() * len);
        const big = rnd() < 0.06;
        const a = big ? 0.5 + rnd() * 0.4 : 0.06 + Math.pow(rnd(), 4) * 0.4;
        const width = big ? 3 + rnd() * 6 : 1 + rnd() * 2.5;
        const sign = rnd() < 0.5 ? -1 : 1;
        const m = Math.floor(width * 6);
        for (let j = 0; j < m; j++) {
          d[(s + j) % len] += sign * a * Math.exp(-j / width) * (j % 2 ? -0.55 : 1);
        }
      }
    }
    return buf;
  };

  /** Kominek: serie drobnych trzasków (pękające drewno), rzadkie strzały żywicy i syk gazu. */
  B.fire = function (ctx, seconds) {
    const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
    const buf = ctx.createBuffer(2, len, sr);
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    // syk: wysoki szum, który powoli faluje
    let hp = 0, prev = 0;
    for (let i = 0; i < len; i++) {
      const w = rnd() * 2 - 1;
      hp = 0.6 * (hp + w - prev);
      prev = w;
      const v = hp * 0.012 * (0.6 + 0.4 * Math.sin(i / sr * 0.9) * Math.sin(i / sr * 0.37 + 1));
      L[i] += v;
      R[i] += v * 0.9;
    }
    function click(start, amp, width, p) {
      const gl = Math.cos(p * Math.PI / 2), gr = Math.sin(p * Math.PI / 2);
      const m = Math.floor(width * 7);
      let lp = 0;
      for (let j = 0; j < m; j++) {
        lp += 0.55 * ((rnd() * 2 - 1) - lp);
        const v = (rnd() * 2 - 1 - lp) * amp * Math.exp(-j / width);
        const idx = (start + j) % len;
        L[idx] += v * gl;
        R[idx] += v * gr;
      }
    }
    // serie: drewno pęka po kilka razy w krótkich odstępach
    const bursts = Math.floor(seconds * 2.2);
    for (let k = 0; k < bursts; k++) {
      let t = Math.floor(rnd() * len);
      const n = 2 + Math.floor(Math.pow(rnd(), 2) * 14);
      const p = rnd(), base = 0.05 + Math.pow(rnd(), 2) * 0.3;
      for (let c = 0; c < n; c++) {
        click(t, base * (0.4 + rnd() * 0.8), 2 + rnd() * 10, U01(p + (rnd() - 0.5) * 0.15));
        t += Math.floor(sr * (0.004 + Math.pow(rnd(), 2) * 0.09));
      }
    }
    // strzały żywicy: głośniejsze, z krótkim dźwięcznym ogonem
    const pops = Math.floor(seconds * 0.5);
    for (let k = 0; k < pops; k++) {
      const start = Math.floor(rnd() * len), p = rnd();
      click(start, 0.5 + rnd() * 0.3, 18 + rnd() * 20, p);
      const f = 900 + rnd() * 1600, tau = 0.006 + rnd() * 0.01;
      const gl = Math.cos(p * Math.PI / 2), gr = Math.sin(p * Math.PI / 2);
      for (let j = 0, n = Math.floor(tau * 6 * sr); j < n; j++) {
        const v = Math.sin(2 * Math.PI * f * j / sr) * Math.exp(-j / sr / tau) * 0.25;
        const idx = (start + j) % len;
        L[idx] += v * gl;
        R[idx] += v * gr;
      }
    }
    return buf;
  };
  const U01 = v => Math.min(1, Math.max(0, v));

  /**
   * Grzmot z modelu kanału błyskawicy. Kanał to kręta droga z ok. tysiąca odcinków od ziemi
   * do chmury, z odgałęzieniami i odcinkiem w poziomie wewnątrz chmury. Każdy odcinek wysyła
   * krótką falę uderzeniową w kształcie litery N, która dociera do słuchacza tym później,
   * im odcinek jest dalej. Odcinki ustawione w poprzek kierunku słuchania grzmią mocniej,
   * więc grzmot przetacza się seriami uderzeń. Bliskie odcinki dają krótkie fale (trzask),
   * dalekie długie i wygładzone (pomruk). Echa od terenu i chmur przedłużają przetaczanie.
   * D – odległość uderzenia w metrach.
   */
  B.thunder = function (ctx, D) {
    // grzmot ma prawie całą energię nisko, więc wystarczy rzadsze próbkowanie (szybciej liczyć);
    // bliski potrzebuje więcej, bo zaczyna się trzaskiem. Przeglądarka sama przelicza przy graniu.
    const sr = D < 1500 ? 22050 : 11025, C = 343, MAX = 24;
    const segs = [];
    const az = (rnd() * 2 - 1) * 1.1;                    // kierunek uderzenia względem słuchacza
    let x = D * Math.sin(az), y = D * Math.cos(az), z = 0;
    let ux = 0, uy = 0, uz = 1;
    // Krętość na dwóch skalach: kanał biegnie prosto przez kilkadziesiąt do kilkuset metrów,
    // ostro skręca, a po drodze drobno się wije. Prosty kawałek w poprzek słuchacza
    // wysyła wszystkie fale naraz, i to jest „klaśnięcie” w przetaczającym się grzmocie.
    let mx = 0, my = 0, mz = 1, straight = 0;
    function walk(n, bx, by, bz, stop) {
      for (let i = 0; i < n; i++) {
        const l = 0.5 + 12 * rnd() * rnd();               // odcinki 0,5–12,5 m, najczęściej krótkie
        if (straight <= 0) {
          const nx = (rnd() * 2 - 1) + bx * 1.2, ny = (rnd() * 2 - 1) + by * 1.2, nz = (rnd() * 2 - 1) + bz * 1.2;
          const k = 1 / Math.hypot(nx, ny, nz);
          mx = nx * k; my = ny * k; mz = nz * k;
          straight = 40 + 260 * rnd();
        }
        straight -= l;
        let nx = mx + (rnd() * 2 - 1) * 0.45, ny = my + (rnd() * 2 - 1) * 0.45, nz = mz + (rnd() * 2 - 1) * 0.45;
        const k = 1 / Math.hypot(nx, ny, nz);
        ux = nx * k; uy = ny * k; uz = nz * k;
        segs.push({ x: x + ux * l / 2, y: y + uy * l / 2, z: z + uz * l / 2, l, ux, uy, uz });
        x += ux * l; y += uy * l; z += uz * l;
        if (stop && stop()) return;
      }
    }
    const H = 2500 + rnd() * 2000;
    const trunk = [];
    walk(8000, 0, 0, 0.9, () => { if (rnd() < 0.01) trunk.push([x, y, z]); return z >= H; });
    // w chmurze: długi kanał w poziomie, 3–9 km, czasem skręcający
    for (let k = 0; k < 3; k++) {
      const ha = rnd() * Math.PI * 2;
      walk(Math.floor(400 + rnd() * 800), Math.cos(ha) * 0.9, Math.sin(ha) * 0.9, 0, null);
    }
    // odgałęzienia w dół i na boki
    for (let b = 0; b < 3 + Math.floor(rnd() * 5) && trunk.length; b++) {
      [x, y, z] = trunk[Math.floor(rnd() * trunk.length)];
      const ba = rnd() * Math.PI * 2;
      walk(Math.floor(60 + rnd() * 250), Math.cos(ba) * 0.6, Math.sin(ba) * 0.6, -0.5, () => z < 0);
    }
    let rmin = Infinity;
    for (const s of segs) { s.r = Math.hypot(s.x, s.y, s.z); if (s.r < rmin) rmin = s.r; }
    const len = Math.floor(sr * MAX);
    const buf = ctx.createBuffer(2, len, sr);
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let peak = 0, end = 0;
    for (const s of segs) {
      const t0 = Math.floor((s.r - rmin) / C * sr);
      const T = Math.max(4, Math.floor((0.6 + 0.3 * s.l) * 1e-3 * sr * (1 + s.r / 5000)));
      // czoło fali tępieje z odległością: blisko trzask, daleko miękkie uderzenie
      const rise = Math.max(1, Math.min(T / 3, Math.floor((0.1 + s.r * 0.0004) * 1e-3 * sr)));
      end = Math.max(end, t0 + T);
      if (t0 + T >= len) continue;
      // odcinek w poprzek kierunku słuchania grzmi najmocniej
      const vx = s.x / s.r, vy = s.y / s.r, vz = s.z / s.r;
      const cx = s.uy * vz - s.uz * vy, cy = s.uz * vx - s.ux * vz, cz = s.ux * vy - s.uy * vx;
      const side = cx * cx + cy * cy + cz * cz;
      const a = s.l * (0.04 + side * side) / s.r * (0.6 + 0.8 * rnd());
      const pan = Math.max(-1, Math.min(1, s.x / (Math.hypot(s.x, s.y) + 1) * 0.9));
      const gl = Math.cos((pan + 1) * Math.PI / 4) * a, gr = Math.sin((pan + 1) * Math.PI / 4) * a;
      for (let j = 0; j < T; j++) {
        // fala N: szybko w górę, równy spadek, szybki powrót do zera
        const v = (1 - 2 * j / T) * Math.min(1, j / rise, (T - j) / rise);
        L[t0 + j] += v * gl;
        R[t0 + j] += v * gr;
      }
    }
    // ostatnie, najdalsze odcinki w chmurze słabną, więc grzmot wygasa, a nie urywa się
    for (let i = Math.floor(end * 0.6); i < end; i++) {
      const k = 1 - (i - end * 0.6) / (end * 0.4), g = k * k * (3 - 2 * k);
      L[i] *= g;
      R[i] *= g;
    }
    // echa od wzgórz, lasu i chmur: coraz później, ciszej i ciemniej
    const dryL = L.slice(), dryR = R.slice();
    for (let e = 0, n = 3 + Math.floor(rnd() * 4); e < n; e++) {
      const delay = Math.floor(sr * (0.3 + rnd() * 4.5)), g = 0.12 + rnd() * 0.3, c = 0.15 + rnd() * 0.3;
      const fromL = rnd() < 0.5;
      let lpL = 0, lpR = 0;
      for (let i = 0; i < end && i + delay < len; i++) {
        lpL += c * ((fromL ? dryL : dryR)[i] - lpL);
        lpR += c * ((fromL ? dryR : dryL)[i] - lpR);
        L[i + delay] += lpL * g;
        R[i + delay] += lpR * g;
      }
    }
    for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
    const g = peak > 0 ? 0.9 / peak : 0;
    for (let i = 0; i < len; i++) { L[i] *= g; R[i] *= g; }
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
        lp += a * ((rnd() * 2 - 1) - lp);
        d[i] = lp * Math.pow(1 - t, decay);
      }
      // kilka wczesnych odbić
      for (let k = 0; k < 8; k++) {
        const i = Math.floor(sr * (0.008 + rnd() * 0.06));
        d[i] += (rnd() < 0.5 ? -1 : 1) * (0.5 - k * 0.05);
      }
    }
    return buf;
  };
})(window.Nurt);
