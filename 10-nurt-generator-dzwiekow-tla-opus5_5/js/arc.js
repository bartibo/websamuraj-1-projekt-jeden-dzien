/* =====================================================================
   Nurt – łuk, czyli energia zmieniająca się w czasie
   Plany sesji na żywo (skupienie z przerwami, rozruch, zasypianie)
   i przebiegi nagrywanego utworu (stały, fala, rozruch, do snu).
   Wszystko to czyste funkcje czasu: dla danej chwili zwracają energię
   i to, ile zostaje z muzyki. Interfejs tylko je odpytuje.
   ===================================================================== */
'use strict';
(function (N) {
  const U = N.util;
  const LOW = 0.08;    // energia przerwy i początku rozruchu: głęboki spokój
  const RAMP = 20;     // tyle sekund trwa przejście między pracą a przerwą

  N.arc = {
    LOW,
    RAMP,

    /** Plany sesji na żywo. `options` to warianty długości, `label` – jak je pokazać. */
    PLANS: [
      {
        id: 'free', name: 'Swobodnie',
        hint: 'Gra tak, jak ustawisz. Możesz wybrać długość: na końcu tło łagodnie cichnie i odzywa się dzwonek.',
        options: [0, 25, 50, 90], label: m => (m ? m + ' min' : 'bez limitu')
      },
      {
        id: 'focus', name: 'Skupienie',
        hint: 'Praca i przerwa na zmianę, aż zatrzymasz. W przerwie tło samo schodzi do wyciszenia, a dzwonek ogłasza każdą zmianę. W czasie pracy energia jest ta z suwaka.',
        options: [[25, 5], [50, 10], [90, 15]], label: o => `${o[0]} + ${o[1]} min`
      },
      {
        id: 'rise', name: 'Rozruch',
        hint: 'Zaczyna od głębokiego spokoju i przez wybrany czas powoli rozkręca się do energii ustawionej na suwaku. Potem gra dalej bez limitu.',
        options: [10, 20, 30], label: m => m + ' min'
      },
      {
        id: 'sleep', name: 'Zasypianie',
        hint: 'Energia opada, muzyka po kolei znika, zostaje samo tło: szum, deszcz albo fale. Na końcu ono też cichnie. Bez dzwonka.',
        options: [20, 30, 45, 60], label: m => m + ' min'
      }
    ],

    /** Przebiegi nagrania. `loop` – czy pasuje do pętli bez szwu (koniec = początek). */
    SHAPES: [
      { id: 'flat', name: 'stały', hint: 'cały czas ten sam nastrój', loop: true },
      { id: 'wave', name: 'fala', hint: 'energia wolno faluje wokół ustawionej', loop: true },
      { id: 'rise', name: 'rozruch', hint: 'zaczyna spokojnie i rozkręca się do ustawionej energii' },
      { id: 'sleep', name: 'do snu', hint: 'energia opada, muzyka znika, zostaje samo tło' }
    ],

    /**
     * Przebieg nagrania w chwili t (s) utworu długości T (s), dla energii e0.
     * Zwraca { e, music }: energię i mnożnik warstw muzyki (0–1).
     */
    shape(id, t, T, e0) {
      const k = U.clamp(t / T, 0, 1);
      if (id === 'wave') {
        // pełne okresy po 4–6 minut, więc początek i koniec są w tym samym miejscu fali
        const cycles = Math.max(1, Math.round(T / 300));
        return { e: U.clamp(e0 + 0.2 * Math.sin(2 * Math.PI * cycles * k), 0, 1), music: 1 };
      }
      if (id === 'rise') {
        const low = Math.min(LOW, e0);
        return { e: U.lerp(low, e0, U.smooth(k / 0.45)), music: 1 };
      }
      if (id === 'sleep') return this.sleep(k, e0);
      return { e: e0, music: 1 };
    },

    /** Zasypianie (k = postęp 0–1): energia do zera w 60%, muzyka znika między 15 a 70%. */
    sleep(k, e0) {
      return { e: U.lerp(e0, 0, U.smooth(k / 0.6)), music: 1 - U.smooth((k - 0.15) / 0.55) };
    },

    /**
     * Skupienie: faza w chwili t (s od startu planu) dla rytmu [praca, przerwa] w minutach.
     * Zwraca { phase: 'work'|'break', round, left (s do końca fazy), into (s od początku fazy) }.
     */
    focusPhase(t, opt) {
      const work = opt[0] * 60, brk = opt[1] * 60, cycle = work + brk;
      const round = Math.floor(t / cycle), tc = t - round * cycle;
      return tc < work
        ? { phase: 'work', round, left: work - tc, into: tc }
        : { phase: 'break', round, left: cycle - tc, into: tc - work };
    }
  };
})(window.Nurt);
