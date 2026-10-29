/* =====================================================================
   Gumowy czas – zsynchronizowane zegary
   Każdy zegar całkuje swój czas własny: dτ = tempo · dt. Spóźnienie
   (dt − dτ) sumujemy osobno, żeby nie gubić nanosekund przy latach.
   ===================================================================== */
'use strict';
(function (R) {
  const F = R.fmt;

  class Clock {
    constructor(def) {
      this.def = def;            // { id, name, sub, color, tint }
      this.lag = 0;              // ile sekund zegar został w tyle za twoim
      this.rate = 1;
      this.delta = 0;
      this.tickPhase = 0;
      this.ticks = 0;
      this.pulse = 0;
      this.el = null;
    }
    reset() { this.lag = 0; this.tickPhase = 0; this.ticks = 0; this.pulse = 0; }

    /** Zwraca true, gdy zegar właśnie tyknął (raz na jego sekundę pokazu). */
    advance(dtSim, dtReal, rate, delta) {
      this.rate = rate; this.delta = delta;
      this.lag += delta * dtSim;
      this.pulse = Math.max(0, this.pulse - dtReal * 2.5);
      const before = Math.floor(this.tickPhase);
      this.tickPhase += rate * dtReal;
      if (Math.floor(this.tickPhase) > before) { this.ticks++; this.pulse = 1; return true; }
      return false;
    }

    mount(parent) {
      const d = this.def;
      const el = document.createElement('div');
      el.className = 'clock';
      el.style.setProperty('--c', d.color);
      el.innerHTML =
        '<div class="clock-face-wrap"><canvas class="clock-face" aria-hidden="true"></canvas></div>' +
        '<div class="clock-info">' +
          '<div class="clock-name"><i></i>' + d.name + '</div>' +
          '<div class="clock-sub"></div>' +
          '<div class="clock-time mono">00:00:00,00</div>' +
          '<div class="clock-rate"></div>' +
        '</div>';
      parent.appendChild(el);
      this.el = el;
      this.cv = el.querySelector('canvas');
      this.subEl = el.querySelector('.clock-sub');
      this.timeEl = el.querySelector('.clock-time');
      this.rateEl = el.querySelector('.clock-rate');
      this.subEl.textContent = d.sub || '';
    }

    setSub(text) { if (this.subEl && this.subEl.textContent !== text) this.subEl.textContent = text; }

    /** Odświeża tekst (rzadziej niż tarczę). */
    updateText(T, timescale) {
      if (!this.el) return;
      const tau = T - this.lag;
      this.timeEl.textContent = F.clock(tau);
      let r;
      if (this.delta === 0) r = '<b>tempo ×1</b> · punkt odniesienia';
      else r = '<b>tempo ' + F.rate(this.rate, this.delta) + '</b> · ' + F.slower(this.rate);
      if (this.rateEl._last !== r) { this.rateEl.innerHTML = r; this.rateEl._last = r; }
    }

    draw(T, opts) {
      const cv = this.cv;
      if (!cv) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = cv.clientWidth || 120;
      if (cv.width !== Math.round(size * dpr)) { cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr); }
      const ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2, cy = size / 2, rad = size / 2 - 7;
      const col = this.def.color;
      const tint = this.def.tint ? R.phys.shiftColor(this.rate) : null;

      // poświata tyknięcia i tło tarczy
      const glow = ctx.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad * 1.1);
      if (tint) {
        glow.addColorStop(0, 'rgba(' + tint.join(',') + ',' + (0.10 + 0.25 * this.pulse) + ')');
        glow.addColorStop(1, 'rgba(' + tint.join(',') + ',0.02)');
      } else {
        glow.addColorStop(0, 'rgba(255,255,255,' + (0.05 + 0.08 * this.pulse) + ')');
        glow.addColorStop(1, 'rgba(255,255,255,0.01)');
      }
      ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0f1f'; ctx.fill();
      ctx.fillStyle = glow; ctx.fill();

      // pierścień tempa: pełny okrąg = czas płynie jak u ciebie
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath(); ctx.arc(cx, cy, rad + 3, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = col;
      ctx.shadowColor = col; ctx.shadowBlur = 6 + 10 * this.pulse;
      const ang = Math.max(this.rate, 0.004) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(cx, cy, rad + 3, -Math.PI / 2, -Math.PI / 2 + ang); ctx.stroke();
      ctx.shadowBlur = 0;

      // podziałka
      for (let i = 0; i < 60; i++) {
        const a = i / 60 * Math.PI * 2;
        const big = i % 5 === 0;
        const r1 = rad - (big ? 9 : 5), r2 = rad - 2;
        ctx.strokeStyle = big ? 'rgba(230,236,255,0.75)' : 'rgba(230,236,255,0.25)';
        ctx.lineWidth = big ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(a) * r1, cy - Math.cos(a) * r1);
        ctx.lineTo(cx + Math.sin(a) * r2, cy - Math.cos(a) * r2);
        ctx.stroke();
      }
      if (size > 100) {
        ctx.fillStyle = 'rgba(230,236,255,0.6)';
        ctx.font = '600 ' + Math.round(size * 0.09) + 'px "Space Grotesk", system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        [[12, 0], [3, 1], [6, 2], [9, 3]].forEach(([n, k]) => {
          const a = k * Math.PI / 2, rr = rad - 19;
          ctx.fillText(String(n), cx + Math.sin(a) * rr, cy - Math.cos(a) * rr);
        });
      }

      // wskazówki (czas własny tego zegara)
      const tau = Math.max(0, T - this.lag);
      const ts = opts.timescale;
      const sec = tau % 60, min = (tau / 60) % 60, hr = (tau / 3600) % 12;
      const hand = (frac, len, w, color) => {
        const a = frac * Math.PI * 2;
        ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - Math.sin(a) * len * 0.16, cy + Math.cos(a) * len * 0.16);
        ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len);
        ctx.stroke();
      };
      if (ts < 86400 * 30) hand(hr / 12, rad * 0.48, 4, '#e6ecff');
      if (ts < 86400) hand(min / 60, rad * 0.7, 3, '#e6ecff');
      if (ts < 600) hand(sec / 60, rad * 0.82, 1.6, col);
      if (ts >= 86400 * 30) {
        // przy latach na sekundę wskazówki migają – zamiast nich licznik dni
        const days = Math.floor(tau / 86400) % 365;
        ctx.strokeStyle = col; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, rad * 0.55, -Math.PI / 2, -Math.PI / 2 + days / 365 * Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(230,236,255,0.8)';
        ctx.font = '600 ' + Math.round(size * 0.1) + 'px "JetBrains Mono", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(F.num(Math.floor(tau / R.phys.YEAR), 0), cx, cy - 4);
        ctx.font = Math.round(size * 0.07) + 'px "Space Grotesk", sans-serif';
        ctx.fillText('lat', cx, cy + size * 0.09);
      }
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  R.Clock = Clock;
})(window.Rel);
