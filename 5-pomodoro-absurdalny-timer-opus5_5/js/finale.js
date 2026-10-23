'use strict';
/* Raport końcowy: fakty, od których opada szczęka, porównania, odznaczenia i werdykt jury. */

A.finale = (() => {
  const scr = $('#scr-final');

  const LIGHT_MARKS = [
    ['Księżyca', 384400], ['Wenus (w największym zbliżeniu)', 38e6], ['Marsa (w największym zbliżeniu)', 54.6e6],
    ['Słońca', 149.6e6], ['Jowisza (w największym zbliżeniu)', 588e6], ['Saturna', 1.2e9], ['Urana', 2.6e9], ['Neptuna', 4.3e9],
  ];

  // acc – biernik („trwało 1 minutę”)
  function durWords(sec, acc) {
    sec = Math.round(sec);
    const m = Math.floor(sec / 60), s = sec % 60;
    const parts = [];
    if (m) parts.push(`${m} ${plural(m, acc ? 'minutę' : 'minuta', 'minuty', 'minut')}`);
    if (s || !m) parts.push(`${s} ${plural(s, acc ? 'sekundę' : 'sekunda', 'sekundy', 'sekund')}`);
    return parts.join(' i ');
  }

  function comparisons(d) {
    const km = d * 299792;
    let mark = null;
    for (const m of LIGHT_MARKS) if (km > m[1]) mark = m;
    const out = [];
    out.push(['💡', `Światło przeleciało <b>${fmt(km / 1e6, 1)} mln km</b>${mark ? ` – dalej niż do ${mark[0]}` : ''}.`]);
    out.push(['🐆', `Gepard przebiegłby <b>${fmt(d / 3600 * 110, 1)} km</b> (gdyby chciał, a nie chce).`]);
    out.push(['🦥', `Leniwiec przeszedłby <b>${fmt(d / 3600 * 240, 1)} m</b>, z czego połowę w złą stronę.`]);
    out.push(['🐌', `Ślimak Zbigniew pokonał <b>${fmt(d * 0.1, 1)} cm</b> i nadal o tym opowiada.`]);
    out.push(['🥚', `Dałoby się ugotować <b>${fmt(d / 240, 1)}</b> jajka na miękko, jedno po drugim.`]);
    out.push(['👵', `To <b>${fmt(d / 10800 * 100, 1)}%</b> czasu gotowania porządnego rosołu babci.`]);
    out.push(['⏳', `To <b>${fmt(d / (78 * 31557600) * 100, 6)}%</b> przeciętnego ludzkiego życia. Wykorzystane!`]);
    out.push(['🦕', `To <b>${fmt(d / (300000 * 31557600) * 100)}%</b> historii ludzkości.`]);
    out.push(['🌌', `To <b>${fmt(d / (13.8e9 * 31557600) * 100)}%</b> wieku Wszechświata. Mało, ale Twoje.`]);
    return out;
  }

  function awards(entry) {
    const a = [];
    if (entry.outcome === 'done' && !entry.pauses) a.push(['⚡', 'Medal „Bez Pauzy”', 'pauza? jaka pauza?']);
    if (entry.pauses >= 3) a.push(['⏸️', 'Order Mistrza Pauzy', `za ${entry.pauses} ${plural(entry.pauses, 'pauzę', 'pauzy', 'pauz')} z rzędu`]);
    if (entry.controls > 0) a.push(['🚨', 'Certyfikat Przetrwania Kontroli', `${entry.controls} ${plural(entry.controls, 'kontrola', 'kontrole', 'kontroli')}, zero mandatów`]);
    if (entry.outcome === 'early') a.push(['🚀', 'Odznaka Przedterminowa', 'skończone przed czasem – w urzędzie nikt w to nie wierzy']);
    if (entry.outcome === 'quit') a.push(['🏳️', 'Order Szczerości', 'za odwagę przyznania się. To też się liczy.']);
    if (+entry.level === 5) a.push(['👁️', 'Odznaka Kosmicznego Horroru', 'za przetrwanie najwyższego poziomu absurdu']);
    if (entry.min >= 60) a.push(['🏔️', 'Order Długiego Dystansu', 'ponad godzina skupienia. Kanapa płacze.']);
    if (entry.min <= 2) a.push(['🐜', 'Mikromedal', 'za zadanie mniejsze niż mrówka. Ale za to jakie!']);
    const rest = shuffle(A.AWARDS);
    while (a.length < 4) a.push(rest.pop());
    return a.slice(0, 5);
  }

  function jury() {
    return A.JUDGES.map(([name, scoreFn, lines]) => ({ name, score: scoreFn(), line: pick(lines) }));
  }

  function show(entry, task, whileAway) {
    const d = Math.max(1, entry.sec);
    const quit = entry.outcome === 'quit', early = entry.outcome === 'early';
    const headline = quit ? 'ZADANIE<br>PORZUCONE' : early ? 'ZAKOŃCZONE<br>PRZED CZASEM' : 'ZADANIE<br>ZAKOŃCZONE';
    const stamp = quit ? 'PORZUCONO (Z GODNOŚCIĄ)' : early ? 'PRZED CZASEM?!' : pick(A.STAMPS);
    const planned = entry.min * 60;
    let shock;
    if (quit) shock = `Trwało ${durWords(d, true)}. Pozostałe ${durWords(planned - d)} zwraca się do Skarbu Czasu Państwa.`;
    else if (early) shock = `Trwało ${durWords(d, true)} zamiast ${entry.min} ${plural(entry.min, 'minuty', 'minut', 'minut')}. Zaoszczędzono ${durWords(planned - d, true)}. Ministerstwo nie wie, co z nimi zrobić.`;
    else shock = `Trwało dokładnie ${durWords(d, true)}. Tyle, ile zaplanowano. W historii planowania zdarzyło się to dotąd ${randInt(3, 11)} razy.`;

    const must = ['cells', 'universe', 'hair', 'orbit', 'sunmass', 'births'];
    const extra = shuffle(A.WORLD.filter(w => !must.includes(w.id))).slice(0, 3);
    const facts = [...must.map(id => A.WORLD.find(w => w.id === id)), ...extra];
    const J = jury();
    const scored = J.filter(j => !isNaN(j.score));
    const avg = scored.reduce((a, j) => a + j.score, 0) / scored.length;
    const aw = awards(entry);
    const brk = task.brk;
    const nextQ = A.app.peekQueue();

    scr.innerHTML = `
      <div class="final-wrap">
        <div class="final-hero ${quit ? 'quit' : ''}">
          <div class="fh-kicker">RAPORT KOŃCOWY · sygn. ${esc(entry.sig || 'ABS/—')} · ${new Date(entry.at).toLocaleString('pl-PL')}</div>
          <h1>${headline}</h1>
          <p class="fh-task">„${esc(entry.name)}”</p>
          <div class="stamp huge">${esc(stamp)}</div>
          ${whileAway ? '<p class="fh-away">Zadanie skończyło się, gdy Cię nie było. Zegar odliczał zupełnie sam. Był bardzo dzielny.</p>' : ''}
        </div>
        <p class="final-shock">${shock}</p>

        <h2 class="sec-h">Niewiarygodne, ale prawdziwe. W tym czasie:</h2>
        <div class="facts">${facts.map((f, i) => `<div class="fact" style="--i:${i}"><span class="fact-ic">${f.icon}</span><p data-f="${f.id}"></p></div>`).join('')}</div>
        <p class="tiny-note">Dane orientacyjne, liczone ze średnich światowych. Szok – w pełni prawdziwy.</p>

        <h2 class="sec-h">Dla porównania</h2>
        <ul class="compare">${comparisons(d).map(([ic, t]) => `<li><span>${ic}</span><p>${t}</p></li>`).join('')}</ul>

        <h2 class="sec-h">Odznaczenia państwowe</h2>
        <div class="awards">${aw.map(([ic, n, why], i) => `<div class="award" style="--i:${i}"><div class="medal">${ic}</div><b>${esc(n)}</b><small>${esc(why)}</small></div>`).join('')}</div>

        <h2 class="sec-h">Werdykt jury</h2>
        <div class="jury">${J.map((j, i) => `<div class="judge" style="--i:${i}"><div class="score">${isNaN(j.score) ? '—' : fmt(j.score, 1)}</div><div><b>${esc(j.name)}</b><small>${esc(j.line)}</small></div></div>`).join('')}
          <div class="judge avg"><div class="score">${fmt(avg, 1)}</div><div><b>Średnia</b><small>bez Ministerstwa, które ocenę doręczy pocztą</small></div></div>
        </div>

        <div class="final-actions">
          ${!quit && brk ? `<button class="btn big primary" data-a="break">☕ Przerwa (${brk} min)</button>` : ''}
          ${nextQ ? `<button class="btn big ${!quit && brk ? '' : 'primary'}" data-a="queue">▶ Następne z kolejki: „${esc(nextQ.name)}”</button>` : ''}
          <button class="btn ${(!quit && brk) || nextQ ? '' : 'big primary'}" data-a="again">🔁 Jeszcze raz to samo</button>
          <button class="btn" data-a="new">➕ Nowe zadanie</button>
          <button class="btn" data-a="print">🖨️ Drukuj dyplom</button>
          <button class="btn" data-a="copy">📋 Kopiuj raport</button>
        </div>
      </div>`;

    A.ui.screen('scr-final');
    facts.forEach(f => A.ui.countUp($(`[data-f="${f.id}"]`, scr), d * f.rate, v => f.txt(v), 2200));
    bindActions(task, entry, facts, d);

    if (quit) {
      A.audio.sfx.sad();
      setTimeout(() => A.audio.say('Zadanie porzucone. Z godnością.'), 600);
    } else {
      A.audio.sfx.boom();
      setTimeout(() => { A.audio.sfx.fanfare(); A.ui.confetti(220); }, 250);
      setTimeout(() => A.audio.sfx.horn(), 1700);
      setTimeout(() => A.audio.say(early ? 'Zadanie zakończone przed czasem. Niewiarygodne.' : 'Zadanie zakończone. Niewiarygodne, ale prawdziwe.'), 2000);
      setTimeout(() => A.ui.confetti(120), 1400);
    }
    setTimeout(() => $('.stamp.huge', scr) && $('.stamp.huge', scr).classList.add('slam'), 500);
    setTimeout(() => A.audio.sfx.stamp(), 650);
  }

  function bindActions(task, entry, facts, d) {
    $$('[data-a]', scr).forEach(b => b.addEventListener('click', () => {
      A.audio.sfx.click();
      const a = b.dataset.a;
      if (a === 'break') A.session.start(task, 'break');
      else if (a === 'queue') A.app.startFromQueue();
      else if (a === 'again') {
        const t = Object.assign({}, task, { id: Date.now().toString(36) });
        A.creator.process(t, x => A.session.start(x), () => A.app.home());
      }
      else if (a === 'new') A.app.home();
      else if (a === 'print') window.print();
      else if (a === 'copy') copyReport(entry, facts, d);
    }));
  }

  function copyReport(entry, facts, d) {
    const tmp = el('div');
    const lines = [
      `ABSURDORO – RAPORT KOŃCOWY (${entry.sig || 'ABS'})`,
      `Zadanie: „${entry.name}”, czas: ${durWords(d)}.`,
      'W tym czasie:',
      ...facts.map(f => { tmp.innerHTML = f.txt(d * f.rate); return '• ' + tmp.textContent; }),
      'Niewiarygodne, ale prawdziwe.',
    ];
    const txt = lines.join('\n');
    const ok = () => A.ui.toast('SKOPIOWANO', 'Raport w schowku. Pochwal się. Albo nie – Ministerstwo i tak wie.');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, () => fallbackCopy(txt, ok));
    else fallbackCopy(txt, ok);
  }
  function fallbackCopy(txt, ok) {
    const ta = el('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); ok(); } catch (e) { A.ui.toast('UPS', 'Schowek odmówił współpracy.'); }
    ta.remove();
  }

  function breakOver(done, outcome) {
    const d = Math.max(1, done.total - (outcome === 'done' ? 0 : (done.pausedRemain != null ? done.pausedRemain : Math.max(0, (done.endAt - Date.now()) / 1000))));
    const nextQ = A.app.peekQueue();
    scr.innerHTML = `
      <div class="final-wrap break-end">
        <div class="final-hero">
          <div class="fh-kicker">PRZERWA ${outcome === 'done' ? 'ZAKOŃCZONA ZGODNIE Z PLANEM' : 'PRZERWANA (?!)'}</div>
          <h1>KONIEC<br>PRZERWY</h1>
          <p class="fh-task">Kapibara wstaje z leżaka. Herbata wypita. Pora wracać.</p>
          <div class="stamp huge">ODPOCZĘTO</div>
        </div>
        <ul class="compare">
          <li><span>💇</span><p>W czasie przerwy Twoje włosy urosły łącznie o <b>${fmt(d * 0.0405, 2)} cm</b>. Wszystkie naraz.</p></li>
          <li><span>❤️</span><p>Serce uderzyło <b>${fmtInt(d * 70 / 60)}</b> razy, w większości spokojnie.</p></li>
          <li><span>🌍</span><p>Ziemia przeleciała <b>${fmtInt(d * 29.78)} km</b>. Bez żadnego wysiłku z Twojej strony. Idealna przerwa.</p></li>
        </ul>
        <div class="final-actions">
          ${nextQ ? `<button class="btn big primary" data-b="queue">▶ Następne z kolejki: „${esc(nextQ.name)}”</button>` : ''}
          <button class="btn big ${nextQ ? '' : 'primary'}" data-b="again">🔁 Powtórz „${esc(done.task.name)}”</button>
          <button class="btn" data-b="new">➕ Nowe zadanie</button>
        </div>
      </div>`;
    A.ui.screen('scr-final');
    A.audio.sfx.gongDown();
    setTimeout(() => A.audio.say('Koniec przerwy. Kapibara wstaje z leżaka.'), 1300);
    setTimeout(() => $('.stamp.huge', scr).classList.add('slam'), 400);
    $$('[data-b]', scr).forEach(b => b.addEventListener('click', () => {
      A.audio.sfx.click();
      if (b.dataset.b === 'queue') A.app.startFromQueue();
      else if (b.dataset.b === 'again') {
        const t = Object.assign({}, done.task, { id: Date.now().toString(36) });
        A.creator.process(t, x => A.session.start(x), () => A.app.home());
      } else A.app.home();
    }));
  }

  return { show, breakOver, durWords };
})();
