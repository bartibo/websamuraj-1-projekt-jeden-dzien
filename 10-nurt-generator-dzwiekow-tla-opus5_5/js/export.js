/* =====================================================================
   Nurt – nagrywanie utworu do MP3
   Ten sam silnik co na żywo gra w OfflineAudioContext, czyli tak szybko,
   jak pozwala procesor, a nie w czasie rzeczywistym. Co sekundę nagrania
   renderowanie staje na chwilę, żeby dopisać kolejne takty i rozmowy.
   Na początku i końcu utworu jest łagodne wejście i wyjście. Gotowe
   nagranie jest wyrównywane do stałej głośności i kodowane do MP3
   (lamejs, ładowany dopiero przy pierwszym nagraniu). Nic nie wychodzi
   poza ten komputer.
   ===================================================================== */
'use strict';
(function (N) {
  const SR = 44100;
  const TARGET_RMS = Math.pow(10, -17 / 20);   // wyrównanie głośności
  const CEILING = Math.pow(10, -1 / 20);       // szczyty najwyżej -1 dBFS

  let lameLoading = null;
  function loadLame() {
    if (window.lamejs) return Promise.resolve();
    if (!lameLoading) {
      lameLoading = new Promise((ok, fail) => {
        const s = document.createElement('script');
        s.src = 'js/vendor/lame.min.js';
        s.onload = ok;
        s.onerror = () => { lameLoading = null; fail(new Error('Nie udało się wczytać kodera MP3.')); };
        document.head.appendChild(s);
      });
    }
    return lameLoading;
  }

  /** Krzywa wejścia: miękki start, który wolno nabiera głośności. */
  function fadeCurve(n, up) {
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = i / (n - 1);
      const s = 0.5 - 0.5 * Math.cos(Math.PI * (up ? x : 1 - x));
      c[i] = Math.pow(s, 1.6);
    }
    return c;
  }

  const wait = () => new Promise(r => setTimeout(r, 0));

  /** Prosty znacznik ID3v2.3 z tytułem i wykonawcą (UTF-16, więc polskie litery zostają). */
  function id3(tags) {
    const frames = [];
    for (const id in tags) {
      const txt = tags[id];
      const body = new Uint8Array(3 + txt.length * 2 + 2);
      body[0] = 1; body[1] = 0xff; body[2] = 0xfe;
      for (let i = 0; i < txt.length; i++) { const c = txt.charCodeAt(i); body[3 + i * 2] = c & 255; body[4 + i * 2] = c >> 8; }
      const f = new Uint8Array(10 + body.length);
      for (let i = 0; i < 4; i++) f[i] = id.charCodeAt(i);
      const n = body.length;
      f[4] = n >>> 24; f[5] = (n >>> 16) & 255; f[6] = (n >>> 8) & 255; f[7] = n & 255;
      f.set(body, 10);
      frames.push(f);
    }
    const size = frames.reduce((a, f) => a + f.length, 0);
    const out = new Uint8Array(10 + size);
    out.set([0x49, 0x44, 0x33, 3, 0, 0, (size >> 21) & 127, (size >> 14) & 127, (size >> 7) & 127, size & 127]);
    let o = 10;
    frames.forEach(f => { out.set(f, o); o += f.length; });
    return out;
  }

  /**
   * Nagraj utwór.
   * opts: seconds, fadeIn, fadeOut, mix (przepis z N.mix.at) albo mixAt(t) – przepis
   *       w chwili t (łuk utworu), seed (ziarno: to samo daje ten sam utwór), kbps, title,
   *       onProgress(faza, 0–1), isCancelled()
   * Zwraca Blob z MP3 albo null, gdy przerwano.
   */
  N.recordMp3 = async function (opts) {
    const { seconds, fadeIn, fadeOut, kbps = 192 } = opts;
    const mixAt = opts.mixAt || (() => opts.mix);
    const progress = opts.onProgress || (() => {});
    const cancelled = opts.isCancelled || (() => false);
    const lame = loadLame();

    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ctx = new OAC(2, Math.ceil(SR * seconds), SR);
    progress('render', 0);
    await wait();
    const E = N.createEngine(ctx, opts.seed);
    E.apply(mixAt(0), true);
    E.setVolume(0.8, true);
    E.fade.gain.setValueAtTime(0, 0);
    E.fade.gain.setValueCurveAtTime(fadeCurve(512, true), 0.05, fadeIn);
    E.fade.gain.setValueCurveAtTime(fadeCurve(512, false), seconds - fadeOut - 0.05, fadeOut);
    E.start();

    // Renderowanie staje co sekundę nagrania, żeby dopisać następne nuty
    const STEP = 1, AHEAD = 2.5;
    E.schedule(AHEAD);
    let stopped = false;
    if (typeof ctx.suspend === 'function') ctx.suspend(STEP).then(onStep);
    else E.schedule(seconds); // przeglądarka bez suspend(): wszystko zaplanowane z góry
    let resolveStop;
    const stop = new Promise(r => { resolveStop = r; });
    function onStep() {
      if (cancelled()) { stopped = true; resolveStop(null); return; } // bez resume: renderowanie zostaje porzucone
      const t = ctx.currentTime;
      if (opts.mixAt) E.apply(mixAt(t));
      E.schedule(t + AHEAD);
      progress('render', t / seconds);
      if (t + STEP < seconds) ctx.suspend(t + STEP).then(onStep);
      ctx.resume();
    }
    const buf = await Promise.race([ctx.startRendering(), stop]);
    if (!buf || stopped) return null;

    // Wyrównanie głośności: RMS liczony bez wejścia i wyjścia, szczyty pod sufitem
    progress('encode', 0);
    await wait();
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let sum = 0, cnt = 0, peak = 0;
    const a = Math.floor(SR * fadeIn), b = Math.max(a + 1, L.length - Math.floor(SR * fadeOut));
    for (let i = 0; i < L.length; i++) {
      const l = L[i], r = R[i];
      const m = Math.max(Math.abs(l), Math.abs(r));
      if (m > peak) peak = m;
      if (i >= a && i < b && (i & 3) === 0) { sum += l * l + r * r; cnt += 2; }
    }
    const rms = Math.sqrt(sum / Math.max(1, cnt)) || 1e-6;
    const gain = Math.min(TARGET_RMS / rms, CEILING / Math.max(peak, 1e-6));

    await lame;
    if (cancelled()) return null;
    const enc = new window.lamejs.Mp3Encoder(2, SR, kbps);
    const chunks = [id3({ TIT2: opts.title || 'Nurt', TPE1: 'Nurt', TALB: 'Nurt – tło do pracy', TCON: 'Ambient' })];
    const BLOCK = 1152 * 48;
    const l16 = new Int16Array(BLOCK), r16 = new Int16Array(BLOCK);
    let lastYield = performance.now();
    const dither = N.util.seeded('dither' + (opts.seed || ''));
    for (let i = 0; i < L.length; i += BLOCK) {
      const n = Math.min(BLOCK, L.length - i);
      for (let j = 0; j < n; j++) {
        // lekki szum TPDF zamiast twardego obcięcia do 16 bitów
        const d = (dither() - dither()) * 0.5;
        l16[j] = Math.max(-32768, Math.min(32767, Math.round(L[i + j] * gain * 32767 + d)));
        r16[j] = Math.max(-32768, Math.min(32767, Math.round(R[i + j] * gain * 32767 + d)));
      }
      const out = n === BLOCK ? enc.encodeBuffer(l16, r16) : enc.encodeBuffer(l16.subarray(0, n), r16.subarray(0, n));
      if (out.length) chunks.push(new Uint8Array(out));
      if (performance.now() - lastYield > 40) {
        progress('encode', i / L.length);
        await wait();
        lastYield = performance.now();
        if (cancelled()) return null;
      }
    }
    const tail = enc.flush();
    if (tail.length) chunks.push(new Uint8Array(tail));
    progress('encode', 1);
    return new Blob(chunks, { type: 'audio/mpeg' });
  };
})(window.Nurt);
