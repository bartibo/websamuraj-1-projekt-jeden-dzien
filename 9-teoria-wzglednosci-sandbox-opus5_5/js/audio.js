/* =====================================================================
   Gumowy czas – tykanie zegarów (Web Audio, bez plików)
   Każdy zegar ma inny ton, więc dylatację czasu słychać.
   ===================================================================== */
'use strict';
(function (R) {
  const A = {
    ctx: null, on: true, master: null, noise: null,
    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { return; }
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.05);
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    },
    /** kind: 'a' (twój zegar), 'b', 'c' – różne barwy. */
    tick(kind, loud) {
      if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;
      const freq = kind === 'a' ? 3200 : kind === 'b' ? 1700 : 1050;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 9;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime((loud || 1) * (kind === 'a' ? 0.55 : 0.8), t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      src.connect(bp); bp.connect(g); g.connect(this.master);
      // krótki ton nadaje tyknięciu „metaliczny” charakter
      const o = this.ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = freq * 0.5;
      const og = this.ctx.createGain();
      og.gain.setValueAtTime(0.0001, t);
      og.gain.exponentialRampToValueAtTime(0.05 * (loud || 1), t + 0.003);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(og); og.connect(this.master);
      src.start(t); o.start(t); o.stop(t + 0.07);
    },
    /** Delikatny „ping” po wykonaniu zadania. */
    chime() {
      if (!this.on || !this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;
      [660, 880, 1320].forEach((f, i) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.09 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.5);
        o.connect(g); g.connect(this.master);
        o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.55);
      });
    }
  };
  R.audio = A;
})(window.Rel);
