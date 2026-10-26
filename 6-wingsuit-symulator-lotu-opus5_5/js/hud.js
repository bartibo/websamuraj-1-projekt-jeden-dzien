/* Na Krawędzi – HUD: prędkość, wysokość, bliskość skał, punkty, adrenalina, znacznik celu, komunikaty */
(function (root) {
  'use strict';
  const WS = root.WS;
  const { clamp, fmt } = WS.U;
  const $ = (id) => document.getElementById(id);

  class HUD {
    constructor() {
      this.el = {};
      for (const id of ['hud', 'spd', 'vspd', 'glide', 'agl', 'alt', 'proxFill', 'proxVal', 'score', 'mult', 'gates', 'ftime', 'adrFill', 'bpm', 'gforce',
        'windArrow', 'windVal', 'marker', 'markerLbl', 'markerDist', 'warn', 'hint', 'popups', 'toast', 'heart', 'spdBar', 'phaseLbl']) this.el[id] = $(id);
      this.cache = {};
      this.v = new THREE.Vector3();
      this.toastT = 0;
    }

    set(id, txt) { if (this.cache[id] !== txt) { this.cache[id] = txt; this.el[id].textContent = txt; } }
    style(id, prop, val) { const k = id + '.' + prop; if (this.cache[k] !== val) { this.cache[k] = val; this.el[id].style[prop] = val; } }
    cls(id, c, on) { const k = id + '#' + c; if (this.cache[k] !== on) { this.cache[k] = on; this.el[id].classList.toggle(c, on); } }

    show(on) { this.cls('hud', 'on', on); }

    update(s, camera, dt) {
      const kmh = Math.round(s.kmh);
      this.set('spd', String(kmh));
      this.style('spdBar', 'transform', `scaleX(${clamp(kmh / 400, 0, 1).toFixed(3)})`);
      this.cls('spdBar', 'hot', kmh > 280);
      this.set('vspd', `↓ ${Math.max(0, Math.round(-s.vy * 3.6))} km/h`);
      this.set('glide', s.glide > 0 && s.glide < 20 ? `doskonałość ${fmt(s.glide, 1)}` : 'doskonałość –');
      const agl = Math.max(0, s.agl);
      this.set('agl', agl < 100 ? fmt(agl, agl < 10 ? 1 : 0) : fmt(Math.round(agl)));
      this.set('alt', `${fmt(Math.round(s.alt))} m n.p.m.`);
      const pf = clamp(s.pf, 0, 1);
      this.style('proxFill', 'transform', `scaleY(${pf.toFixed(3)})`);
      this.set('proxVal', s.prox < 99 ? `${fmt(s.prox, s.prox < 10 ? 1 : 0)} m` : '–');
      this.cls('proxFill', 'hot', pf > 0.7);
      this.set('score', fmt(Math.round(s.score)));
      this.set('mult', `×${fmt(s.mult, 1)}`);
      this.cls('mult', 'hot', s.mult > 3);
      this.set('gates', s.gatesTotal ? `${s.gatesOk}/${s.gatesTotal}` : '–');
      const t = Math.max(0, s.time);
      this.set('ftime', `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`);
      this.style('adrFill', 'transform', `scaleX(${clamp(s.adr, 0, 1).toFixed(3)})`);
      this.set('bpm', `${Math.round(70 + s.adr * 110)}`);
      this.style('heart', 'animationDuration', `${(60 / (70 + s.adr * 110)).toFixed(2)}s`);
      this.set('gforce', `${fmt(s.g, 1)} g`);
      this.style('windArrow', 'transform', `rotate(${Math.round(s.windRel)}deg)`);
      this.set('windVal', `${Math.round(s.windSpd)} m/s`);
      this.set('phaseLbl', s.phaseLbl || '');
      // ostrzeżenie
      this.cls('warn', 'on', s.warn > 0.15);
      // znacznik celu
      this._marker(s.target, camera);
      // komunikat w dole ekranu
      let hint = s.hint || '';
      if (hint && document.body.classList.contains('touch')) hint = hint.replace('SPACJA', 'ROZŁÓŻ').replace('F – otwórz', 'SPADOCHRON – otwórz').replace('W/S – nurkuj / podciągaj · A/D – skręt', 'gałka: nurkowanie, podciąganie, skręt').replace('A/D – skręt · S – hamowanie', 'gałka w bok – skręt · w dół – hamowanie');
      this.set('hint', hint);
      this.cls('hint', 'on', !!s.hint);
      if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.cls('toast', 'on', false); }
    }

    _marker(tg, camera) {
      const m = this.el.marker;
      if (!tg) { this.cls('marker', 'on', false); return; }
      this.cls('marker', 'on', true);
      const v = this.v.set(tg.x, tg.y, tg.z).project(camera);
      const behind = v.z > 1;
      let x = v.x, y = v.y;
      if (behind) { x = -x; y = -y; }
      const off = behind || Math.abs(x) > 0.92 || Math.abs(y) > 0.88;
      if (off) {
        const a = Math.atan2(y, x);
        const k = 1 / Math.max(Math.abs(Math.cos(a)) / 0.9, Math.abs(Math.sin(a)) / 0.82);
        x = Math.cos(a) * k; y = Math.sin(a) * k;
        m.style.setProperty('--rot', `${(-a * 180 / Math.PI + 90).toFixed(1)}deg`);
      }
      this.cls('marker', 'edge', off);
      const W = window.innerWidth, H = window.innerHeight;
      m.style.transform = `translate(${((x * 0.5 + 0.5) * W).toFixed(1)}px, ${((-y * 0.5 + 0.5) * H).toFixed(1)}px)`;
      this.set('markerLbl', tg.label);
      this.set('markerDist', `${fmt(Math.round(tg.dist))} m`);
      this.cls('marker', 'special', !!tg.special);
    }

    popup(text, sub, kind) {
      const d = document.createElement('div');
      d.className = 'pop ' + (kind || '');
      d.innerHTML = `<b>${text}</b>${sub ? `<span>${sub}</span>` : ''}`;
      this.el.popups.appendChild(d);
      setTimeout(() => d.remove(), 2200);
      while (this.el.popups.children.length > 4) this.el.popups.firstChild.remove();
    }

    toast(text) {
      this.el.toast.textContent = text;
      this.cls('toast', 'on', true);
      this.cache['toast#on'] = true;
      this.el.toast.classList.add('on');
      this.toastT = 1.6;
    }
  }

  WS.HUD = HUD;
})(window);
