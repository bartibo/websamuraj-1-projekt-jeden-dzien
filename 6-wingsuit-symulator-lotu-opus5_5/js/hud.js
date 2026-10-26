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
        'windArrow', 'windVal', 'marker', 'markerLbl', 'markerDist', 'markerDy', 'warn', 'hint', 'popups', 'toast', 'heart', 'spdBar', 'phaseLbl',
        'combo', 'comboVal', 'comboK', 'comboCalm', 'delta', 'fpv']) this.el[id] = $(id);
      this.cache = {};
      this.v = new THREE.Vector3();
      this.toastT = 0;
    }

    set(id, txt) { if (this.cache[id] !== txt) { this.cache[id] = txt; this.el[id].textContent = txt; } }
    style(id, prop, val) { const k = id + '.' + prop; if (this.cache[k] !== val) { this.cache[k] = val; this.el[id].style[prop] = val; } }
    cls(id, c, on) { const k = id + '#' + c; if (this.cache[k] !== on) { this.cache[k] = on; this.el[id].classList.toggle(c, on); } }

    show(on) { this.cls('hud', 'on', on); }

    update(s, camera, dt) {
      // co klatkę: to, co jest przyklejone do obrazu 3D, i ostrzeżenie
      this.cls('warn', 'on', s.warn > 0.15);
      this._marker(s.target, camera, s.reach);
      this._fpv(s.fpv, camera);
      if (this.toastT > 0) { this.toastT -= dt; if (this.toastT <= 0) this.cls('toast', 'on', false); }
      if (s.full === false) return;
      const kmh = Math.round(s.kmh);
      this.set('spd', String(kmh));
      this.style('spdBar', 'transform', `scaleX(${clamp(kmh / 400, 0, 1).toFixed(3)})`);
      this.cls('spdBar', 'hot', kmh > 280);
      this.cls('spdBar', 'slow', !!s.slow);
      this.cls('spd', 'slow', !!s.slow);
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
      // seria przy skale: pula punktów, mnożnik za długość i pasek „odbij od ściany, żeby zaliczyć”
      const on = s.combo > 0;
      this.cls('combo', 'on', on);
      if (on) {
        this.set('comboVal', '+' + fmt(Math.round(s.combo)));
        this.set('comboK', '×' + fmt(1 + Math.min(2, s.comboT / 4), 1));
        this.style('comboCalm', 'transform', `scaleX(${clamp(s.calm / 1.2, 0, 1).toFixed(3)})`);
      }
      if (s.delta != null) {
        this.set('delta', `${s.delta >= 0 ? '▲ +' : '▼ −'}${fmt(Math.abs(s.delta))} vs rekord`);
        this.cls('delta', 'up', s.delta >= 0);
      }
      this.cls('delta', 'on', s.delta != null);
      // komunikat w dole ekranu
      let hint = s.hint || '';
      if (hint && document.body.classList.contains('touch')) {
        hint = hint.replace('SPACJA', 'ROZŁÓŻ').replace('F – SPADOCHRON', 'SPADOCHRON').replace('F – otwórz', 'SPADOCHRON – otwórz')
          .replace('W/S – nurkuj / podciągaj · A/D – skręt', 'gałka: nurkowanie, podciąganie, skręt').replace('nurkuj (W)', 'gałka w górę')
          .replace('A/D – skręt', 'gałka w bok – skręt').replace('S – hamowanie', 'w dół – hamowanie').replace('S – HAMUJ', 'gałka w dół – HAMUJ');
      }
      this.set('hint', hint);
      this.cls('hint', 'on', !!s.hint);
      this.cls('hint', 'alert', /ZA WOLNO|ZARAZ ZIEMIA|HAMUJ/.test(s.hint || ''));
      this.cls('hint', 'go', /dolecisz/.test(s.hint || ''));
    }

    // celownik toru lotu: gdzie będzie pilot za 2 s
    _fpv(fl, camera) {
      if (!fl) { this.cls('fpv', 'on', false); return; }
      const v = this.v.copy(fl.pos).addScaledVector(fl.vel, 2).project(camera);
      const ok = v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95;
      this.cls('fpv', 'on', ok);
      if (ok) this.el.fpv.style.transform = `translate(${((v.x * 0.5 + 0.5) * window.innerWidth).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * window.innerHeight).toFixed(1)}px)`;
    }

    _marker(tg, camera, reach) {
      const m = this.el.marker;
      if (!tg) { this.cls('marker', 'on', false); return; }
      this.cls('marker', 'on', true);
      // lądowisko: zielone, gdy spadochron otwarty teraz doleci, czerwone, gdy już nie doleci
      this.cls('marker', 'reach', !!(tg.land && reach && reach.ok));
      this.cls('marker', 'short', !!(tg.land && reach && !reach.ok && !reach.high));
      const v = this.v.set(tg.x, tg.y, tg.z).project(camera);
      const behind = v.z > 1;
      let x = v.x, y = v.y;
      if (behind) { x = -x; y = -y; }
      const off = behind || Math.abs(x) > 0.92 || Math.abs(y) > 0.88;
      if (off) {
        const a = Math.atan2(y, x);
        const k = 1 / Math.max(Math.abs(Math.cos(a)) / 0.82, Math.abs(Math.sin(a)) / 0.66);
        x = Math.cos(a) * k; y = Math.sin(a) * k;
        m.style.setProperty('--rot', `${(-a * 180 / Math.PI + 90).toFixed(1)}deg`);
      }
      this.cls('marker', 'edge', off);
      const W = window.innerWidth, H = window.innerHeight;
      m.style.transform = `translate(${((x * 0.5 + 0.5) * W).toFixed(1)}px, ${((-y * 0.5 + 0.5) * H).toFixed(1)}px)`;
      this.set('markerLbl', tg.label);
      // odległość co 5 m – tekst nie zmienia się w każdej klatce
      this.set('markerDist', `${fmt(Math.round(tg.dist / 5) * 5)} m`);
      const dy = tg.gate && Math.abs(tg.dy) > 8 ? `${tg.dy > 0 ? '↑' : '↓'} ${fmt(Math.round(Math.abs(tg.dy) / 2) * 2)} m` : '';
      this.set('markerDy', dy);
      this.cls('marker', 'below', y < -0.2);
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
