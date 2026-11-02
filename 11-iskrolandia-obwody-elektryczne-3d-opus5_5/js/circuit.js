// Model planszy i rozwiązywanie obwodu (analiza węzłowa, prawo Ohma i Kirchhoffa)
window.Iskry = window.Iskry || {};
(function () {
  const C = Iskry.circuit = {};

  C.COLS = 10;
  C.ROWS = 7;

  // Parametry elementów (zabawkowe, ale fizycznie spójne)
  C.TYPES = {
    wire:     { name: 'Kabel',      R: 0.01 },
    battery:  { name: 'Bateria',    V: 1.5, r: 0.2 },
    bulb:     { name: 'Żarówka',    R: 5, burnV: 5.0 },
    motor:    { name: 'Silniczek',  R: 4 },
    switch:   { name: 'Wyłącznik',  R: 0.01 },
    button:   { name: 'Przycisk',   R: 0.01 },
    led:      { name: 'Dioda LED',  Vf: 1.8, Rs: 8, Imax: 0.08 },
    buzzer:   { name: 'Brzęczyk',   R: 15 },
    resistor: { name: 'Opornik',    R: 50 },
  };
  C.SHORT_I = 2.5;          // prąd baterii, od którego mówimy o zwarciu
  C.BLOCK_V = 1.5;          // 1 klocek = 1 bateria = 1,5 V
  C.SPARKS_PER_A = 50;      // „iskierek na sekundę” na 1 amper

  C.node = (c, r) => r * C.COLS + c;
  C.cr = n => ({ c: n % C.COLS, r: Math.floor(n / C.COLS) });
  C.edgeKey = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  C.adjacent = (a, b) => {
    const p = C.cr(a), q = C.cr(b);
    return Math.abs(p.c - q.c) + Math.abs(p.r - q.r) === 1;
  };
  C.inside = (c, r) => c >= 0 && r >= 0 && c < C.COLS && r < C.ROWS;

  // Najbliższa krawędź siatki dla współrzędnych ułamkowych (fc, fr)
  C.nearestEdge = function (fc, fr) {
    let best = null;
    // pozioma
    let c = Math.floor(fc), r = Math.round(fr);
    c = Math.max(0, Math.min(C.COLS - 2, c));
    r = Math.max(0, Math.min(C.ROWS - 1, r));
    const dh = Math.abs(fr - r) + Math.max(0, Math.abs(fc - (c + 0.5)) - 0.5);
    best = { a: C.node(c, r), b: C.node(c + 1, r), d: dh };
    // pionowa
    let c2 = Math.round(fc), r2 = Math.floor(fr);
    c2 = Math.max(0, Math.min(C.COLS - 1, c2));
    r2 = Math.max(0, Math.min(C.ROWS - 2, r2));
    const dv = Math.abs(fc - c2) + Math.max(0, Math.abs(fr - (r2 + 0.5)) - 0.5);
    if (dv < dh) best = { a: C.node(c2, r2), b: C.node(c2, r2 + 1), d: dv };
    return best;
  };

  C.nearestNode = function (fc, fr) {
    const c = Math.max(0, Math.min(C.COLS - 1, Math.round(fc)));
    const r = Math.max(0, Math.min(C.ROWS - 1, Math.round(fr)));
    return { n: C.node(c, r), d: Math.hypot(fc - c, fr - r) };
  };

  function gauss(A, b) {
    const n = b.length;
    for (let i = 0; i < n; i++) {
      let m = i;
      for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k;
      if (m !== i) { const t = A[i]; A[i] = A[m]; A[m] = t; const tb = b[i]; b[i] = b[m]; b[m] = tb; }
      const piv = A[i][i];
      if (Math.abs(piv) < 1e-18) continue;
      for (let k = i + 1; k < n; k++) {
        const f = A[k][i] / piv;
        if (f === 0) continue;
        const rowK = A[k], rowI = A[i];
        for (let j = i; j < n; j++) rowK[j] -= f * rowI[j];
        b[k] -= f * b[i];
      }
    }
    const x = new Float64Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
      x[i] = Math.abs(A[i][i]) < 1e-18 ? 0 : s / A[i][i];
    }
    return x;
  }

  const isInput = p => p.type === 'switch' || p.type === 'button';

  // Czy element przewodzi (bez względu na kierunek) – do grupowania na „wyspy”
  function conducts(p, ov) {
    if (p.burnt) return false;
    if (isInput(p)) return !!(p.id in ov ? ov[p.id] : p.on);
    return true;
  }

  // Rozwiązuje obwód. ov = { idPrzełącznika: true/false } – nadpisanie stanów (do sprawdzania misji)
  C.solve = function (pieces, ov) {
    ov = ov || {};
    const T = C.TYPES;
    const idx = new Map();
    const nodes = [];
    for (const p of pieces) {
      if (!idx.has(p.a)) { idx.set(p.a, nodes.length); nodes.push(p.a); }
      if (!idx.has(p.b)) { idx.set(p.b, nodes.length); nodes.push(p.b); }
    }
    const N = nodes.length;
    const ledOn = {};
    let v = new Float64Array(N);

    for (let iter = 0; iter < 30 && N > 0; iter++) {
      const G = [];
      for (let i = 0; i < N; i++) { G.push(new Float64Array(N)); G[i][i] = 1e-9; }
      const I = new Float64Array(N);
      const stamp = (a, b, g) => {
        a = idx.get(a); b = idx.get(b);
        G[a][a] += g; G[b][b] += g; G[a][b] -= g; G[b][a] -= g;
      };
      const src = (from, to, i) => { I[idx.get(to)] += i; I[idx.get(from)] -= i; };

      for (const p of pieces) {
        if (p.burnt) continue;
        const t = T[p.type];
        if (p.type === 'battery') { stamp(p.a, p.b, 1 / t.r); src(p.a, p.b, t.V / t.r); }
        else if (isInput(p)) { if (conducts(p, ov)) stamp(p.a, p.b, 1 / t.R); }
        else if (p.type === 'led') {
          if (ledOn[p.id]) { const g = 1 / t.Rs; stamp(p.a, p.b, g); src(p.b, p.a, g * t.Vf); }
          else stamp(p.a, p.b, 1e-6);
        } else stamp(p.a, p.b, 1 / t.R);
      }
      v = gauss(G, I);

      let changed = false;
      for (const p of pieces) {
        if (p.type !== 'led' || p.burnt) continue;
        const vd = v[idx.get(p.a)] - v[idx.get(p.b)];
        const on = ledOn[p.id] ? vd - T.led.Vf > -1e-9 : vd > T.led.Vf;
        if (on !== !!ledOn[p.id]) { ledOn[p.id] = on; changed = true; }
      }
      if (!changed) break;
    }

    // wyspy połączonych elementów; napięcie liczone od najniższego punktu wyspy
    const parent = nodes.map((_, i) => i);
    const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (const p of pieces) if (conducts(p, ov)) parent[find(idx.get(p.a))] = find(idx.get(p.b));
    const minV = {}, hasBat = {};
    nodes.forEach((n, i) => {
      const r = find(i);
      minV[r] = r in minV ? Math.min(minV[r], v[i]) : v[i];
    });
    for (const p of pieces) if (p.type === 'battery' && !p.burnt) hasBat[find(idx.get(p.a))] = true;

    const nodeV = new Map();
    nodes.forEach((n, i) => {
      const r = find(i);
      nodeV.set(n, hasBat[r] ? Math.max(0, v[i] - minV[r]) : 0);
    });

    const out = { nodeV, pieces: {}, short: false, shortIds: [], island: n => find(idx.get(n)) };
    const raw = n => v[idx.get(n)];
    for (const p of pieces) {
      const t = T[p.type];
      const vd = raw(p.a) - raw(p.b);
      let I = 0;
      if (!p.burnt) {
        if (p.type === 'battery') I = (t.V - (raw(p.b) - raw(p.a))) / t.r;
        else if (isInput(p)) I = conducts(p, ov) ? vd / t.R : 0;
        else if (p.type === 'led') I = ledOn[p.id] ? (vd - t.Vf) / t.Rs : 0;
        else I = vd / t.R;
      }
      if (Math.abs(I) < 1e-6) I = 0;
      const r = { I, vd, Va: nodeV.get(p.a), Vb: nodeV.get(p.b), closed: conducts(p, ov) };
      switch (p.type) {
        case 'battery':
          r.short = Math.abs(I) > C.SHORT_I;
          if (r.short) { out.short = true; out.shortIds.push(p.id); }
          break;
        case 'bulb':
          r.glow = p.burnt ? 0 : Math.min(1.6, Math.abs(vd) / 3);
          r.on = r.glow >= 0.13;
          r.burnNow = !p.burnt && Math.abs(vd) > t.burnV;
          break;
        case 'motor':
          r.speed = p.burnt ? 0 : vd / 1.5;
          r.on = Math.abs(vd) > 0.3;
          break;
        case 'buzzer':
          r.level = Math.min(1.5, Math.abs(vd) / 3);
          r.on = Math.abs(vd) > 0.8;
          break;
        case 'led':
          r.glow = Math.min(1.5, Math.max(0, I) / 0.03);
          r.on = I > 0.004;
          r.burnNow = !p.burnt && I > t.Imax;
          r.reverse = !p.burnt && vd < -t.Vf;
          r.tooSmall = !p.burnt && vd > 0.3 && vd <= t.Vf && !r.on;
          break;
      }
      out.pieces[p.id] = r;
    }
    return out;
  };

  // Wszystkie kombinacje stanów wyłączników i przycisków (do sprawdzania układów logicznych)
  C.combos = function (pieces, fn) {
    const inputs = pieces.filter(isInput).slice(0, 5);
    const results = [];
    const total = 1 << inputs.length;
    for (let m = 0; m < total; m++) {
      const ov = {};
      inputs.forEach((p, i) => { ov[p.id] = !!(m & (1 << i)); });
      results.push(fn(C.solve(pieces, ov), ov, inputs));
    }
    return results;
  };

  C.isInput = isInput;

  // Polska odmiana liczebników
  C.plural = function (n, one, few, many) {
    if (n === 1) return one;
    const d = n % 10, h = n % 100;
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return few;
    return many;
  };
  C.fmt = (x, d) => x.toFixed(d === undefined ? 1 : d).replace('.', ',');

  C.blocksText = function (V) {
    const b = Math.abs(V) / C.BLOCK_V;
    if (b < 0.05) return '0 klocków';
    const r = Math.round(b * 10) / 10;
    if (Number.isInteger(r)) return r + ' ' + C.plural(r, 'klocek', 'klocki', 'klocków');
    return C.fmt(r) + ' klocka';
  };
  C.sparksText = function (I) {
    const n = Math.round(Math.abs(I) * C.SPARKS_PER_A);
    if (Math.abs(I) > 0 && n === 0) return 'mniej niż 1 iskierka/s';
    return n + ' ' + C.plural(n, 'iskierka', 'iskierki', 'iskierek') + '/s';
  };
})();
