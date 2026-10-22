/* painter.js – rysuje scenę naraz na dwóch płótnach:
   • kolor  – to, co widzi zdrowe oko,
   • dane   – R: odległość jako √(dioptrie/4) (0 = nieskończoność, 255 = 25 cm; pierwiastek daje
              dokładność od kilkunastu kilometrów do 25 cm), G: świecenie (0..1, światła, ekrany),
              B: numer obiektu ×3+1 (odstępy chronią przed błędem o 1 na antyaliasowanych krawędziach).
   Scena rysuje zwykłym API Canvas 2D przez P.ctx. Każde wywołanie trafia na oba płótna,
   a na płótnie danych zamiast kolorów używany jest bieżący „materiał” (P.mat / P.matGrad).
   Ozdobniki bez głębi (poświaty, cienie, odblaski) rysuje się w P.decor(() => …) – tylko na kolorze. */
(function () {
  'use strict';

  const MAX_D = 4;                       // dioptrie odpowiadające wartości 255 (25 cm)
  const DRAW_METHODS = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText']);
  const COLOR_ONLY_METHODS = new Set(['clearRect', 'putImageData', 'getImageData', 'measureText', 'isPointInPath',
    'isPointInStroke', 'createLinearGradient', 'createRadialGradient', 'createConicGradient', 'createPattern',
    'createImageData', 'getTransform', 'getContextAttributes', 'getLineDash', 'drawFocusIfNeeded']);
  const COLOR_ONLY_PROPS = new Set(['fillStyle', 'strokeStyle', 'shadowBlur', 'shadowColor', 'shadowOffsetX',
    'shadowOffsetY', 'filter', 'globalCompositeOperation', 'imageSmoothingEnabled', 'imageSmoothingQuality']);

  function dioptersToByte(D) {
    if (!(D > 0)) return 0;
    return Math.max(0, Math.min(255, Math.round(255 * Math.sqrt(Math.min(1, D / MAX_D)))));
  }
  function distToByte(dist) {
    if (!(dist > 0) || !isFinite(dist)) return 0;
    return dioptersToByte(1 / dist);
  }
  const byteToDiopters = b => (b / 255) * (b / 255) * MAX_D;
  const MAX_IDS = 84;
  const idToByte = id => id ? id * 3 + 1 : 0;
  const byteToId = b => b < 2 ? 0 : Math.round((b - 1) / 3);

  class Painter {
    constructor(colorCanvas, dataCanvas) {
      this.colorCanvas = colorCanvas;
      this.dataCanvas = dataCanvas;
      this.c = colorCanvas.getContext('2d');
      this.d = dataCanvas.getContext('2d', { willReadFrequently: true });
      this.names = [null];
      this.nameIdx = new Map();
      this.nameDist = [];
      this._mat = 'rgb(0,0,0)';
      this._matDist = Infinity;
      this._decor = 0;
      this._dataOnly = 0;
      this._scratch = document.createElement('canvas');
      this.data = null;
      this.W = colorCanvas.width;
      this.H = colorCanvas.height;
      this.ctx = this._makeProxy();
    }

    /* Przygotowuje oba płótna do nowej sceny. */
    begin(W, H) {
      for (const cv of [this.colorCanvas, this.dataCanvas]) {
        if (cv.width !== W) cv.width = W;
        if (cv.height !== H) cv.height = H;
      }
      this.W = W; this.H = H;
      this.c.setTransform(1, 0, 0, 1, 0, 0);
      this.d.setTransform(1, 0, 0, 1, 0, 0);
      this.c.globalAlpha = 1; this.d.globalAlpha = 1;
      this.c.globalCompositeOperation = 'source-over';
      this.d.globalCompositeOperation = 'source-over';
      this.c.clearRect(0, 0, W, H);
      this.d.fillStyle = 'rgb(0,0,0)';
      this.d.fillRect(0, 0, W, H);
      this.d.imageSmoothingEnabled = true;
      this.names = [null];
      this.nameIdx = new Map();
      this.nameDist = [];
      this.data = null;
      this.mat(Infinity);
    }

    _id(name) {
      if (!name) return 0;
      let id = this.nameIdx.get(name);
      if (id === undefined) {
        if (this.names.length > MAX_IDS) return 0;
        id = this.names.length;
        this.names.push(name);
        this.nameIdx.set(name, id);
      }
      return id;
    }

    /* Materiał jednolity: odległość w metrach (Infinity = niebo), opts.em 0..1 (świecenie), opts.name. */
    mat(dist, opts) {
      const o = opts || {};
      const r = distToByte(dist);
      const g = Math.max(0, Math.min(255, Math.round((o.em || 0) * 255)));
      const b = idToByte(this._id(o.name));
      this._mat = `rgb(${r},${g},${b})`;
      this._matDist = dist;
      return this;
    }

    /* Materiał z liniowo zmienną głębią – płaszczyzny w perspektywie (podłoga, ściany, jezdnia).
       W perspektywie 1/odległość zmienia się liniowo na ekranie, więc gradient jest dokładny. */
    matGrad(x0, y0, dist0, x1, y1, dist1, opts) {
      const o = opts || {};
      const g = Math.max(0, Math.min(255, Math.round((o.em || 0) * 255)));
      const b = idToByte(this._id(o.name));
      const grad = this.d.createLinearGradient(x0, y0, x1, y1);
      // dioptrie mają się zmieniać liniowo, a zapis jest pierwiastkowy – stąd gęste przystanki
      const D0 = isFinite(dist0) && dist0 > 0 ? 1 / dist0 : 0, D1 = isFinite(dist1) && dist1 > 0 ? 1 / dist1 : 0;
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        grad.addColorStop(t, `rgb(${dioptersToByte(D0 + (D1 - D0) * t)},${g},${b})`);
      }
      this._mat = grad;
      this._matDist = Math.min(dist0, dist1);
      return this;
    }

    /* Rysowanie tylko na kolorze (poświaty, cienie, odblaski, mgła). */
    decor(fn) { this._decor++; try { fn(this.ctx); } finally { this._decor--; } }

    /* Rysowanie tylko na płótnie danych (niewidoczna głębia, rzadko potrzebne). */
    dataOnly(fn) { this._dataOnly++; try { fn(this.ctx); } finally { this._dataOnly--; } }

    /* Cała scena w jednej odległości – kamera i zdjęcia. */
    fillUniform(dist, name, em) {
      this.d.save();
      this.d.setTransform(1, 0, 0, 1, 0, 0);
      this.mat(dist, { name, em });
      this.d.fillStyle = this._mat;
      this.d.fillRect(0, 0, this.W, this.H);
      this.d.restore();
    }

    /* Po narysowaniu: zapamiętuje dane do szybkiego odczytu pod kursorem. */
    finish() {
      this.c.setTransform(1, 0, 0, 1, 0, 0);
      this.d.setTransform(1, 0, 0, 1, 0, 0);
      this.data = this.d.getImageData(0, 0, this.W, this.H).data;
      let mx = 0;
      for (let i = 0; i < this.data.length; i += 4 * 7) if (this.data[i] > mx) mx = this.data[i];
      this.maxDiopters = byteToDiopters(mx);   // najbliższy obiekt w scenie (do rozlewania się rozmytego pierwszego planu)
    }

    /* Odczyt w punkcie (u, v ∈ 0..1): { diopters, dist, em, name }.
       Szuka w małym otoczeniu najbliższego obiektu z nazwą, żeby krawędzie nie gubiły celu. */
    sample(u, v) {
      if (!this.data) return { diopters: 0, dist: Infinity, em: 0, name: null };
      const W = this.W, H = this.H;
      const x0 = Math.max(0, Math.min(W - 1, Math.round(u * (W - 1))));
      const y0 = Math.max(0, Math.min(H - 1, Math.round(v * (H - 1))));
      const i0 = (y0 * W + x0) * 4;
      const D = byteToDiopters(this.data[i0]);
      // nazwa: najczęstszy obiekt w małym oknie (krawędzie mieszają wartości), a gdy pusto – szersze szukanie
      const votes = new Map();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = x0 + dx, y = y0 + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const id = byteToId(this.data[(y * W + x) * 4 + 2]);
        if (id && this.names[id]) votes.set(id, (votes.get(id) || 0) + (dx || dy ? 1 : 1.5));
      }
      let best = 0, bv = 0;
      votes.forEach((v, id) => { if (v > bv) { bv = v; best = id; } });
      let name = this.names[best] || null;
      if (!name) {
        const rr = Math.max(2, Math.round(W / 400));
        outer: for (let r = 2; r <= rr; r++) {
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            const x = x0 + dx, y = y0 + dy;
            if (x < 0 || y < 0 || x >= W || y >= H) continue;
            const n = this.names[byteToId(this.data[(y * W + x) * 4 + 2])];
            if (n) { name = n; break outer; }
          }
        }
      }
      return { diopters: D, dist: D > 0.001 ? 1 / D : Infinity, em: this.data[i0 + 1] / 255, name };
    }

    _silhouette(args) {
      // drawImage na płótnie danych: sylwetka obrazka wypełniona bieżącym materiałem
      const img = args[0];
      if (this._mat instanceof CanvasGradient) {
        // materiał z gradientem: sylwetka na płótnie wielkości sceny z tą samą transformacją
        const t = this._scratchFull || (this._scratchFull = document.createElement('canvas'));
        if (t.width !== this.W) t.width = this.W;
        if (t.height !== this.H) t.height = this.H;
        const tc = t.getContext('2d');
        tc.setTransform(1, 0, 0, 1, 0, 0);
        tc.globalCompositeOperation = 'source-over';
        tc.clearRect(0, 0, t.width, t.height);
        tc.setTransform(this.d.getTransform());
        tc.drawImage.apply(tc, args);
        tc.globalCompositeOperation = 'source-in';
        tc.fillStyle = this._mat;
        tc.fillRect(-1e5, -1e5, 2e5, 2e5);
        this.d.save();
        this.d.setTransform(1, 0, 0, 1, 0, 0);
        this.d.drawImage(t, 0, 0);
        this.d.restore();
        return;
      }
      const w = img.width || img.videoWidth || 1, h = img.height || img.videoHeight || 1;
      const s = this._scratch;
      if (s.width !== w) s.width = w;
      if (s.height !== h) s.height = h;
      const sc = s.getContext('2d');
      sc.globalCompositeOperation = 'source-over';
      sc.clearRect(0, 0, w, h);
      sc.fillStyle = this._mat instanceof CanvasGradient ? '#000' : this._mat;
      sc.fillRect(0, 0, w, h);
      sc.globalCompositeOperation = 'destination-in';
      sc.drawImage(img, 0, 0);
      const a = Array.prototype.slice.call(args);
      a[0] = s;
      this.d.drawImage.apply(this.d, a);
    }

    _makeProxy() {
      const self = this;
      const c = this.c, d = this.d;
      const cache = new Map();
      return new Proxy({}, {
        get(_, prop) {
          if (prop === 'canvas') return c.canvas;
          const v = c[prop];
          if (typeof v !== 'function') return v;
          if (cache.has(prop)) return cache.get(prop);
          let fn;
          if (COLOR_ONLY_METHODS.has(prop)) {
            fn = (...a) => c[prop](...a);
          } else if (prop === 'drawImage') {
            fn = (...a) => {
              if (!self._dataOnly) c.drawImage(...a);
              if (!self._decor) self._silhouette(a);
            };
          } else if (DRAW_METHODS.has(prop)) {
            fn = (...a) => {
              if (!self._dataOnly) c[prop](...a);
              if (!self._decor) {
                d.fillStyle = self._mat;
                d.strokeStyle = self._mat;
                d[prop](...a);
              }
            };
          } else {
            // ścieżki, transformacje, save/restore, setLineDash… – zawsze na oba płótna
            fn = (...a) => { const r = c[prop](...a); d[prop](...a); return r; };
          }
          cache.set(prop, fn);
          return fn;
        },
        set(_, prop, value) {
          c[prop] = value;
          if (!COLOR_ONLY_PROPS.has(prop)) {
            try { d[prop] = value; } catch (e) { /* właściwość tylko koloru */ }
          }
          return true;
        }
      });
    }
  }

  Painter.MAX_D = MAX_D;
  window.Painter = Painter;
})();
