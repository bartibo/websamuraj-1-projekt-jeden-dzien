/* =====================================================================
   Nurt – gotowe miksy i link do miksu
   Gotowy miks to energia i kilka suwaków z miksera. Dźwięki otoczenia,
   których w nim nie wymieniono, milkną. Muzyka bez wpisu płynie za
   energią. Link zapisuje to samo w adresie strony (po znaku #), a link
   do utworu dodatkowo długość, wejście, przebieg i ziarno nagrania.
   ===================================================================== */
'use strict';
(function (N) {
  const U = N.util;
  const AMBIENT = N.mix.SECTIONS[0].controls.map(c => c.id);
  const CONTROL_IDS = [].concat(...N.mix.SECTIONS.map(s => s.controls.map(c => c.id)));

  N.presets = {
    AMBIENT,
    BUILTIN: [
      { id: 'deep', name: 'Głęboka praca', energy: 18, mix: { brown: 0.8, pink: 0.25, pad: 0.35, keys: 0.15, melody: 0, vinyl: 0 } },
      { id: 'fireplace', name: 'Kominek w deszczu', energy: 26, mix: { rain: 0.55, fire: 0.6, brown: 0.15, vinyl: 0.2 } },
      { id: 'beach', name: 'Plaża o świcie', energy: 14, mix: { waves: 0.7, birds: 0.3, wind: 0.2, pad: 0.45, keys: 0.2, vinyl: 0 } },
      { id: 'forest', name: 'Las rano', energy: 32, mix: { birds: 0.6, wind: 0.3, pink: 0.08, drums: 0, vinyl: 0.1 } },
      { id: 'cafe-night', name: 'Nocna kawiarnia', energy: 62, mix: { cafe: 0.55, rain: 0.45, vinyl: 0.6, bright: 0.3, tempo: 0.3 } }
    ],

    /** Ręczne suwaki gotowego miksu: otoczenie spoza listy milknie. */
    manualOf(p) {
      const m = {};
      AMBIENT.forEach(k => { m[k] = 0; });
      return Object.assign(m, p.mix);
    },

    same(a, b) {
      const ka = Object.keys(a), kb = Object.keys(b);
      return ka.length === kb.length && ka.every(k => k in b && Math.abs(a[k] - b[k]) < 0.006);
    },

    /** Część adresu po #: energia, ręczne suwaki i (dla utworu) ustawienia nagrania. */
    encode({ energy, manual, track }) {
      const q = new URLSearchParams();
      q.set('e', Math.round(energy));
      for (const k of CONTROL_IDS) if (k in manual) q.set(k, Math.round(manual[k] * 100));
      if (track) {
        q.set('min', track.minutes);
        q.set('fade', track.fade);
        q.set('shape', track.shape);
        q.set('seed', track.seed);
      }
      return q.toString();
    },

    /** Odczyt linku. Zwraca null, gdy to nie link do miksu. */
    decode(hash) {
      const q = new URLSearchParams(String(hash || '').replace(/^#/, ''));
      if (!q.has('e')) return null;
      const energy = U.clamp(+q.get('e') || 0, 0, 100);
      const manual = {};
      for (const k of CONTROL_IDS) if (q.has(k)) manual[k] = U.clamp((+q.get(k) || 0) / 100, 0, 1);
      let track = null;
      if (q.has('seed')) {
        track = {
          minutes: +q.get('min') || 0,
          fade: q.get('fade') || '',
          shape: q.get('shape') || 'flat',
          seed: U.cleanSeed(q.get('seed'))
        };
        if (!track.seed) track = null;
      }
      return { energy, manual, track };
    }
  };
})(window.Nurt);
