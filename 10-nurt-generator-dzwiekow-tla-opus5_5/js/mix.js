/* =====================================================================
   Nurt – jeden suwak, dziesięć warstw
   Tu zapisane jest, jak poziom energii (0–1) przekłada się na proporcje
   szumów, deszczu, ambientu, lo-fi i gwaru kawiarni. Między punktami
   kontrolnymi wartości przechodzą liniowo, a silnik dźwięku dodatkowo
   je wygładza, więc każde położenie suwaka brzmi inaczej i nic nie skacze.
   ===================================================================== */
'use strict';
(function (N) {
  // energia:      0    0.2   0.4   0.6   0.8   1
  const ANCHORS = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const TABLE = {
    brown:  [0.95, 0.60, 0.22, 0.06, 0.00, 0.00],  // głęboki szum, odcina świat
    pink:   [0.15, 0.42, 0.35, 0.16, 0.08, 0.04],  // jaśniejszy szum, „wentylator”
    rain:   [0.45, 0.65, 0.45, 0.20, 0.06, 0.00],  // deszcz za oknem
    pad:    [0.95, 0.70, 0.35, 0.15, 0.05, 0.00],  // ambientowe plamy akordów
    keys:   [0.30, 0.60, 0.85, 0.90, 0.85, 0.80],  // elektryczne pianino
    bass:   [0.00, 0.15, 0.60, 0.80, 0.85, 0.90],
    drums:  [0.00, 0.00, 0.30, 0.75, 0.90, 1.00],  // miękki bit
    melody: [0.00, 0.08, 0.40, 0.55, 0.60, 0.45],
    vinyl:  [0.10, 0.35, 0.55, 0.50, 0.45, 0.35],  // trzaski płyty
    cafe:   [0.00, 0.00, 0.08, 0.40, 0.75, 1.00]   // gwar kawiarni
  };

  function interp(arr, e) {
    if (e <= 0) return arr[0];
    if (e >= 1) return arr[arr.length - 1];
    let i = 0;
    while (e > ANCHORS[i + 1]) i++;
    const u = (e - ANCHORS[i]) / (ANCHORS[i + 1] - ANCHORS[i]);
    return arr[i] + (arr[i + 1] - arr[i]) * u;
  }

  // Kolor energii: indygo → błękit → mięta → złoto → pomarańcz → koral
  const COLORS = [
    [0.00, [108, 108, 240]],
    [0.25, [74, 163, 240]],
    [0.50, [63, 209, 176]],
    [0.70, [232, 195, 90]],
    [0.85, [245, 154, 79]],
    [1.00, [242, 98, 79]]
  ];

  N.mix = {
    LAYERS: Object.keys(TABLE),

    /** Pełny przepis miksu dla danej energii. */
    at(e) {
      e = N.util.clamp(e, 0, 1);
      const m = { energy: e };
      for (const k in TABLE) m[k] = interp(TABLE[k], e);
      m.bpm = 64 + 26 * e;                              // 64–90 uderzeń na minutę
      m.cutoff = 1500 * Math.pow(5600 / 1500, e);       // im wyżej, tym jaśniejsze lo-fi
      return m;
    },

    /** To, co widać w „Teraz słychać” – kilka warstw złożonych w czytelne grupy. */
    GROUPS: [
      { id: 'brown', name: 'Brązowy\nszum', phrase: 'brązowy szum', get: m => m.brown },
      { id: 'pink', name: 'Różowy\nszum', phrase: 'różowy szum', get: m => m.pink },
      { id: 'rain', name: 'Deszcz', phrase: 'deszcz za oknem', get: m => m.rain },
      { id: 'pad', name: 'Ambient', phrase: 'ambientowe tło', get: m => m.pad },
      { id: 'lofi', name: 'Lo-fi', phrase: 'lo-fi', get: m => Math.max(m.keys * 0.75, m.bass, m.melody) },
      { id: 'beat', name: 'Bit', phrase: 'miękki bit', get: m => m.drums },
      { id: 'cafe', name: 'Kawiarnia', phrase: 'gwar kawiarni', get: m => m.cafe }
    ],

    ZONES: [
      { from: 0.0, center: 10, name: 'Wyciszenie', tick: 'Wyciszenie', hint: 'czytanie, nauka do późna, spokojna głowa' },
      { from: 0.2, center: 30, name: 'Głębokie skupienie', tick: 'Skupienie', hint: 'pisanie, trudny kod, jedno zadanie naraz' },
      { from: 0.4, center: 50, name: 'Przepływ', tick: 'Przepływ', hint: 'praca w równym rytmie, projektowanie, analiza' },
      { from: 0.6, center: 70, name: 'Rozpęd', tick: 'Rozpęd', hint: 'kreatywne zadania, burza mózgów, szkice' },
      { from: 0.8, center: 90, name: 'Pełna moc', tick: 'Pełna moc', hint: 'maile, porządki, rutyna do odhaczenia' }
    ],

    zone(e) {
      let z = this.ZONES[0];
      for (const zz of this.ZONES) if (e >= zz.from - 1e-9) z = zz;
      return z;
    },

    color(e) {
      e = N.util.clamp(e, 0, 1);
      let i = 0;
      while (i < COLORS.length - 2 && e > COLORS[i + 1][0]) i++;
      const [a, ca] = COLORS[i], [b, cb] = COLORS[i + 1];
      const u = N.util.clamp((e - a) / (b - a), 0, 1);
      return ca.map((v, k) => Math.round(v + (cb[k] - v) * u));
    }
  };
})(window.Nurt);
