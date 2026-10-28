'use strict';
/* Raport końcowy: fakty, od których opada szczęka, kronika zadania, porównania, odznaczenia i werdykt jury. */

A.finale = (() => {
  const scr = $('#scr-final');

  const LIGHT_MARKS = [
    ['Księżyca', 384400], ['Wenus (w największym zbliżeniu)', 38e6], ['Marsa (w największym zbliżeniu)', 54.6e6],
    ['Słońca', 149.6e6], ['Jowisza (w największym zbliżeniu)', 588e6], ['Saturna', 1.2e9], ['Urana', 2.6e9], ['Neptuna', 4.3e9],
  ];

  // acc – biernik („trwało 1 minutę”)
  function durWords(sec, acc) {
    sec = Math.round(sec);
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    const parts = [];
    if (h) parts.push(`${h} ${plural(h, acc ? 'godzinę' : 'godzina', 'godziny', 'godzin')}`);
    if (m) parts.push(`${m} ${plural(m, acc ? 'minutę' : 'minuta', 'minuty', 'minut')}`);
    if (s || (!m && !h)) parts.push(`${s} ${plural(s, acc ? 'sekundę' : 'sekunda', 'sekundy', 'sekund')}`);
    return parts.join(' i ').replace(/ i (?=.* i )/, ', ');
  }

  // Porównania: światło zawsze, reszta losowana z puli
  const COMPARE = [
    d => ['🐆', `Gepard przebiegłby <b>${fmt(d / 3600 * 110, 1)} km</b> (gdyby chciał, a nie chce).`],
    d => ['🦥', `Leniwiec przeszedłby <b>${fmt(d / 3600 * 240, 1)} m</b>, z czego połowę w złą stronę.`],
    d => ['🐌', `Ślimak Zbigniew pokonał <b>${fmt(d * 0.1, 1)} cm</b> i nadal o tym opowiada.`],
    d => ['🥚', `Dałoby się ugotować <b>${qty(d / 240, ['jajko', 'jajka', 'jajek', 'jajka'], 1)}</b> na miękko, jedno po drugim.`],
    d => ['👵', `To <b>${fmt(d / 10800 * 100, 1)}%</b> czasu gotowania porządnego rosołu babci.`],
    d => ['⏳', `To <b>${fmt(d / (78 * 31557600) * 100, 6)}%</b> przeciętnego ludzkiego życia. Wykorzystane!`],
    d => ['🦕', `To <b>${fmt(d / (300000 * 31557600) * 100)}%</b> historii ludzkości.`],
    d => ['🌌', `To <b>${fmt(d / (13.8e9 * 31557600) * 100)}%</b> wieku Wszechświata. Mało, ale Twoje.`],
    d => ['🛰️', `Stacja ISS przeleciała <b>${fmtInt(d * 7.66)} km</b> i nikt na niej nie zauważył Twojego zadania.`],
    d => ['🦒', `Żyrafa śpi ok. 30 minut na dobę. Twoje zadanie to <b>${fmt(d / 1800 * 100, 0)}%</b> jej całego snu.`],
    d => ['🎸', `„Bohemian Rhapsody” zagrałoby <b>${qty(d / 355, ['raz', 'razy', 'razy', 'raza'], 1)}</b>. Z headbangingiem.`],
    d => ['🐝', `Pszczoła odwiedziłaby ok. <b>${fmtInt(d / 6)}</b> ${plural(Math.round(d / 6), 'kwiat', 'kwiaty', 'kwiatów')}. Bez kawy.`],
    d => ['🐦', `Koliber machnąłby skrzydłami <b>${fmtInt(d * 53)}</b> razy. Wciąż w tym samym miejscu, jak niektóre projekty.`],
    d => ['🧊', `Kostka lodu w szklance topiłaby się mniej więcej <b>${fmt(d / 1200, 1)}</b> raza. Albo raz, porządnie.`],
    d => ['📺', `Zmieściłoby się <b>${fmtInt(d / 30)}</b> reklam proszku do prania. Każdy pierze lepiej niż poprzedni.`],
    d => ['🚶', `Spacerem przeszedłbyś ok. <b>${fmt(d / 3600 * 5, 1)} km</b>. Do lodówki i z powrotem ${fmtInt(d / 3600 * 5000 / 16)} razy.`],
  ];
  function comparisons(d) {
    const km = d * 299792;
    let mark = null;
    for (const m of LIGHT_MARKS) if (km > m[1]) mark = m;
    return [['💡', `Światło przeleciało <b>${fmt(km / 1e6, 1)} mln km</b>${mark ? ` – dalej niż do ${mark[0]}` : ''}.`],
      ...shuffle(COMPARE).slice(0, 5).map(f => f(d))];
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

  /* ---------- Kronika: co działo się w trakcie, liczone z tego, co było na ekranie ---------- */

  function chronicle(entry, task, run) {
    const T = run.total || entry.min * 60, el = entry.sec;
    const ev = [];
    const add = (t, ic, txt, prio = 1) => { if (t <= el + 0.5) ev.push({ t, ic, txt, prio }); };
    // kot: ten sam plan co w trybie
    const kp = kotPlan(task, T);
    const dropped = kp.items.filter((_, i) => (i + 1) * kp.chunk <= el + 0.5);
    if (dropped.length) add(kp.chunk, '🐈', `Kot Prezes strącił ze stołu: ${dropped[0][0]} ${dropped[0][1]}. Bez żalu.`);
    if (dropped.length > 2) add(dropped.length * kp.chunk, '🐈', `Kot Prezes strącił: ${dropped[dropped.length - 1][0]} ${dropped[dropped.length - 1][1]}. Łącznie ${dropped.length} ${plural(dropped.length, 'przedmiot', 'przedmioty', 'przedmiotów')}.`);
    // foton
    const planets = A.PLANETS.filter(p => !p.belt && p.t <= el);
    const earth = A.PLANETS.find(p => p.name === 'Ziemia');
    if (earth.t <= el) add(earth.t, '☄️', 'Foton wystrzelony ze Słońca na starcie minął orbitę Ziemi. Bez przesiadek.');
    const farP = planets[planets.length - 1];
    if (farP && farP.name !== 'Ziemia') add(farP.t, '☄️', `Foton minął planetę ${farP.name}. Ministerstwo wysłało gratulacje, dotrą za ${mmss(farP.t)}.`);
    // pomidor, ślimak, boss
    add(T * 0.3, '🍅', 'Pomidor: „Hej! To był mój bok! Potrzebowałem go!”');
    add(T * 0.5, '🐌', 'Ślimak Zbigniew minął półmetek. Kamień nadal na starcie, bukmacherzy nadal na niego stawiają.');
    add(T * 0.5 + 1, '⚔️', 'Boss zadania się wkurzył i wszedł w drugą fazę.', 0);
    add(T * 0.9, '⚔️', 'Boss zaczął się pocić.');
    add(T * 0.96, '🍅', 'Pomidor: „Było pięknie. Pamiętaj mnie w sałatce”.', 0);
    // pauzy i kontrole – prawdziwe zdarzenia mają pierwszeństwo
    for (const l of run.log || []) {
      if (l.k === 'pause') add(l.t, '⏸️', 'Pauza. Czas stanął. Wszechświat leciał dalej.', 3);
      if (l.k === 'control') add(l.t, '🚨', `Kontrola: „${l.q}” Odpowiedź do protokołu: „${l.a}”.`, 4);
    }
    // wybieramy najciekawsze, ale w kolejności czasu
    const mid = ev.sort((a, b) => b.prio - a.prio || Math.random() - 0.5).slice(0, 6).sort((a, b) => a.t - b.t);
    const end = entry.outcome === 'quit' ? ['🏳️', 'Biała flaga. Zadanie porzucone z godnością.']
      : entry.outcome === 'early' ? ['🚀', 'Zgłoszono zakończenie przed czasem. Ślimak w szoku, nie dobiegł do mety.']
      : ['🏁', 'Koniec. Ślimak na mecie, pomidor zjedzony, kot usatysfakcjonowany.'];
    return [{ t: 0, ic: '📝', txt: `Decyzja doręczona, czas ruszył. Patron: ${task.patron ? task.patron.name : 'nieznany'}.` }, ...mid, { t: el, ic: end[0], txt: end[1] }];
  }

  function juryContext(entry, task, run) {
    const T = run.total || entry.min * 60;
    const kp = kotPlan(task, T);
    const dropped = kp.items.filter((_, i) => (i + 1) * kp.chunk <= entry.sec + 0.5).map(it => it[1]);
    const passed = A.PLANETS.filter(p => !p.belt && p.t <= entry.sec);
    return { quit: entry.outcome === 'quit', sec: entry.sec, pauses: entry.pauses, hour: new Date().getHours(), dropped, photon: passed.length ? passed[passed.length - 1].name : null };
  }
  function jury(ctx) {
    return A.JUDGES.map(([name, scoreFn, lineFn]) => ({ name, score: scoreFn(ctx), line: lineFn(ctx) }));
  }

  function show(entry, task, whileAway, run = {}) {
    const d = Math.max(1, entry.sec);
    const quit = entry.outcome === 'quit', early = entry.outcome === 'early';
    const headline = quit ? 'ZADANIE<br>PORZUCONE' : early ? 'ZAKOŃCZONE<br>PRZED CZASEM' : 'ZADANIE<br>ZAKOŃCZONE';
    const stamp = quit ? 'PORZUCONO (Z GODNOŚCIĄ)' : early ? 'PRZED CZASEM?!' : pick(A.STAMPS);
    const planned = entry.min * 60;
    let shock;
    if (quit) shock = `Trwało ${durWords(d, true)}. Pozostałe ${durWords(planned - d)} zwraca się do Skarbu Czasu Państwa.`;
    else if (early) shock = `Trwało ${durWords(d, true)} zamiast ${entry.min} ${plural(entry.min, 'minuty', 'minut', 'minut')}. Zaoszczędzono ${durWords(planned - d, true)}. Ministerstwo nie wie, co z nimi zrobić.`;
    else shock = pick([
      `Trwało dokładnie ${durWords(d, true)}. Tyle, ile zaplanowano. W historii planowania zdarzyło się to dotąd ${randInt(3, 11)} razy.`,
      `Trwało ${durWords(d, true)}, co do sekundy. Zegar atomowy w Braunschweigu prosi o autograf.`,
      `Zaplanowano ${durWords(planned, true)}. Wyszło ${durWords(d, true)}. Komisja sprawdzała trzy razy i nie znalazła błędu. Jest rozczarowana.`,
      `${durWords(d)} zgodnie z planem. Taki plan widziano ostatnio w 1998 roku, w Pcimiu.`,
    ]);

    const must = ['cells', 'universe'];
    const extra = shuffle(A.WORLD.filter(w => !must.includes(w.id))).slice(0, 4);
    const facts = [...must.map(id => A.WORLD.find(w => w.id === id)), ...extra];
    const ctx = juryContext(entry, task, run);
    const J = jury(ctx);
    const scored = J.filter(j => !isNaN(j.score));
    const avg = scored.reduce((a, j) => a + j.score, 0) / scored.length;
    const aw = awards(entry);
    const chron = chronicle(entry, task, run);
    // co czwarte ukończone dziś pomodoro – długa przerwa
    const today = A.app.todayCount();
    const longBreak = !quit && task.brk && today > 0 && today % 4 === 0;
    const brk = longBreak ? Math.max(15, task.brk) : task.brk;
    const nextQ = A.app.peekQueue();
    const rk = A.dossier.rank(), nx = A.dossier.nextRank();
    const count = A.dossier.doneCount();

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
        <div class="final-strip">
          <span>🏛️ Ranga: <b>${esc(rk.name)}</b>${nx ? ` <small>(do awansu: ${nx.at - count})</small>` : ''}</span>
          ${entry.pierogi ? `<span>🥟 Do spiżarni: <b>+${entry.pierogi}</b> ${plural(entry.pierogi, 'pieróg', 'pierogi', 'pierogów')}</span>` : ''}
          <span>🍅 Dziś: <b>${today}</b> ${plural(today, 'pomodoro', 'pomodoro', 'pomodoro')}</span>
        </div>
        ${task.cond && !quit ? `
        <div class="cond-check paper">
          <b>Kontrola warunku z decyzji</b>
          <p>Czas przyznano pod warunkiem: <i>${esc(task.cond)}</i>. Czy warunek został spełniony?</p>
          <div class="cond-btns">
            <button class="btn" data-c="yes">Tak, w całości</button>
            <button class="btn" data-c="no">Nie bardzo</button>
            <button class="btn" data-c="cat">Przeszkodził kot</button>
          </div>
        </div>` : ''}

        <h2 class="sec-h">Niewiarygodne, ale prawdziwe. W tym czasie:</h2>
        <div class="facts">${facts.map((f, i) => `<div class="fact" style="--i:${i}"><span class="fact-ic">${f.icon}</span><p data-f="${f.id}"></p></div>`).join('')}</div>
        <p class="tiny-note">Dane orientacyjne, liczone ze średnich światowych. Szok – w pełni prawdziwy.</p>

        <h2 class="sec-h">Kronika zadania</h2>
        <ol class="chron">${chron.map(c => `<li><time>${mmss(c.t)}</time><span>${c.ic}</span><p>${esc(c.txt)}</p></li>`).join('')}</ol>

        <h2 class="sec-h">Dla porównania</h2>
        <ul class="compare">${comparisons(d).map(([ic, t]) => `<li><span>${ic}</span><p>${t}</p></li>`).join('')}</ul>

        <h2 class="sec-h">Odznaczenia państwowe</h2>
        <div class="awards">${aw.map(([ic, n, why], i) => `<div class="award" style="--i:${i}"><div class="medal">${ic}</div><b>${esc(n)}</b><small>${esc(why)}</small></div>`).join('')}</div>

        <h2 class="sec-h">Werdykt jury</h2>
        <div class="jury">${J.map((j, i) => `<div class="judge" style="--i:${i}"><div class="score">${isNaN(j.score) ? '—' : fmt(j.score, 1)}</div><div><b>${esc(j.name)}</b><small>${esc(j.line)}</small></div></div>`).join('')}
          <div class="judge avg"><div class="score">${fmt(avg, 1)}</div><div><b>Średnia</b><small>bez Ministerstwa, które ocenę przyśle pocztą (naprawdę, wróć później)</small></div></div>
        </div>

        <div class="final-actions">
          ${!quit && brk ? `<button class="btn big primary" data-a="break">☕ ${longBreak ? `Długa przerwa (${brk} min) – czwarte pomodoro!` : `Przerwa (${brk} min)`}</button>` : ''}
          ${nextQ ? `<button class="btn big ${!quit && brk ? '' : 'primary'}" data-a="queue">▶ Następne z kolejki: „${esc(short(nextQ.name))}”</button>` : ''}
          <button class="btn ${(!quit && brk) || nextQ ? 'tiny' : 'big primary'}" data-a="again">🔁 Jeszcze raz to samo</button>
          <button class="btn tiny" data-a="new">➕ Nowe zadanie</button>
          <button class="btn tiny" data-a="print">🖨️ Drukuj dyplom</button>
          <button class="btn tiny" data-a="copy">📋 Kopiuj raport</button>
        </div>
      </div>`;

    A.ui.screen('scr-final');
    facts.forEach(f => A.ui.countUp($(`[data-f="${f.id}"]`, scr), d * f.rate, v => f.txt(v), 2200));
    bindActions(task, brk, entry, facts, d, chron);
    bindCondition(task);

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
    if (run.promoted) setTimeout(() => promotion(rk), 3200);
  }

  function short(s, n = 30) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  // Akt nominacji przy awansie
  function promotion(rk) {
    if (A.ui.dialogOpen() || document.body.dataset.screen !== 'scr-final') return;
    A.audio.sfx.fanfare();
    A.ui.confetti(160);
    A.ui.dialog(`
      <div class="nomination">
        <div class="cert-head">AKT NOMINACJI<small>${new Date().toLocaleString('pl-PL')}</small></div>
        <p>Ministerstwo Czasu Nadmiernie Mierzonego, w uznaniu zasług w mierzeniu czasu, niniejszym mianuje Pana/Panią na stanowisko:</p>
        <div class="cert-big">${esc(rk.name)}</div>
        ${rk.perk ? `<p class="nom-perk">Przywileje: ${esc(rk.perk)}</p>` : ''}
        <div class="stamp big">AWANS</div>
      </div>`, [{ label: 'Przyjmuję z godnością', cls: 'primary' }]);
    setTimeout(() => A.audio.sfx.stamp(), 300);
    A.audio.say('Gratulujemy awansu. ' + rk.name + '.');
  }

  function bindCondition(task) {
    const box = $('.cond-check', scr);
    if (!box) return;
    const R = {
      yes: ['WARUNEK SPEŁNIONY', 'Ministerstwo przyjmuje oświadczenie. Weryfikacja: na słowo honoru. Order Spełnionego Warunku w drodze.'],
      no: ['NAGANA (PAPIEROWA)', 'Wpisano naganę do akt. Nagana jest z papieru i nic nie robi. Ale jest.'],
      cat: ['WINA KOTA', 'Przyjęto wyjaśnienie. Kot Prezes otrzymuje naganę. Kot Prezes zrzucił naganę ze stołu.'],
    };
    $$('[data-c]', box).forEach(b => b.addEventListener('click', () => {
      const [st, txt] = R[b.dataset.c];
      A.audio.sfx.stamp();
      box.innerHTML = `<b>Kontrola warunku z decyzji</b><p>Warunek: <i>${esc(task.cond)}</i>. ${esc(txt)}</p><div class="stamp">${st}</div>`;
    }));
  }

  function bindActions(task, brk, entry, facts, d, chron) {
    $$('[data-a]', scr).forEach(b => b.addEventListener('click', () => {
      A.audio.sfx.click();
      const a = b.dataset.a;
      if (a === 'break') A.session.start(Object.assign({}, task, { brk, brkBase: task.brk }), 'break');
      else if (a === 'queue') A.app.startFromQueue(0, true);
      else if (a === 'again') again(task);
      else if (a === 'new') A.app.home();
      else if (a === 'print') window.print();
      else if (a === 'copy') copyReport(entry, facts, d, chron);
    }));
  }
  function again(task) {
    const t = Object.assign({}, task, { id: Date.now().toString(36) });
    A.creator.process(t, x => A.session.start(x), () => A.app.home(), { express: true });
  }

  function copyReport(entry, facts, d, chron) {
    const tmp = el('div');
    const lines = [
      `ABSURDORO – RAPORT KOŃCOWY (${entry.sig || 'ABS'})`,
      `Zadanie: „${entry.name}”, czas: ${durWords(d)}.`,
      'W tym czasie:',
      ...facts.map(f => { tmp.innerHTML = f.txt(d * f.rate); return '• ' + tmp.textContent; }),
      'Kronika:',
      ...chron.map(c => `${mmss(c.t)} ${c.ic} ${c.txt}`),
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

  const BREAK_FACTS = [
    d => ['💇', `W czasie przerwy Twoje włosy urosły łącznie o <b>${fmt(d * 0.0405, 2)} cm</b>. Wszystkie naraz.`],
    d => ['❤️', `Serce uderzyło <b>${fmtInt(d * 70 / 60)}</b> razy, w większości spokojnie.`],
    d => ['🌍', `Ziemia przeleciała <b>${fmtInt(d * 29.78)} km</b>. Bez żadnego wysiłku z Twojej strony. Idealna przerwa.`],
    d => ['🦥', `Leniwiec Bogdan w tym czasie przesunął się o <b>${fmt(d / 3600 * 240, 1)} m</b> i uważa to za intensywny dzień.`],
    d => ['☕', `Ludzkość wypiła <b>${fmtInt(d * 26000)}</b> filiżanek kawy. Twoja się nie liczy, bo jeszcze stygnie.`],
    d => ['🐈', `Koty na świecie przespały łącznie ok. <b>${fmtInt(d * 600e6 / 86400 * 14 / 24)}</b> godzin. Szacunkowo. Koty nie raportują.`],
    d => ['👁️', `Mrugnąłeś ok. <b>${fmtInt(d * 17 / 60)}</b> razy. Odpoczynek dla oczu: zaliczony.`],
  ];

  function breakOver(done, outcome) {
    const d = Math.max(1, done.total - (outcome === 'done' ? 0 : (done.pausedRemain != null ? done.pausedRemain : Math.max(0, (done.endAt - Date.now()) / 1000))));
    const nextQ = A.app.peekQueue();
    const task = Object.assign({}, done.task, { brk: done.task.brkBase != null ? done.task.brkBase : done.task.brk });
    scr.innerHTML = `
      <div class="final-wrap break-end">
        <div class="final-hero">
          <div class="fh-kicker">PRZERWA ${outcome === 'done' ? 'ZAKOŃCZONA ZGODNIE Z PLANEM' : 'SKRÓCONA Z WŁASNEJ WOLI (?!)'}</div>
          <h1>KONIEC<br>PRZERWY</h1>
          <p class="fh-task">${esc(pick(['Kapibara wstaje z leżaka. Herbata wypita. Pora wracać.', 'Leżak złożony. Kapibara macha na pożegnanie.', 'Pan Kazimierz dojadł kanapkę. Okienko znów otwarte.', 'Babcia mówi, że już wystarczy tego leżenia.']))}</p>
          <div class="stamp huge">ODPOCZĘTO</div>
        </div>
        <ul class="compare">${shuffle(BREAK_FACTS).slice(0, 3).map(f => f(d)).map(([ic, t]) => `<li><span>${ic}</span><p>${t}</p></li>`).join('')}</ul>
        <div class="final-actions">
          ${nextQ ? `<button class="btn big primary" data-b="queue">▶ Następne z kolejki: „${esc(short(nextQ.name))}”</button>` : ''}
          <button class="btn big ${nextQ ? '' : 'primary'}" data-b="again">▶ Następne pomodoro: „${esc(short(done.task.name))}”</button>
          <button class="btn" data-b="new">➕ Nowe zadanie</button>
        </div>
      </div>`;
    A.ui.screen('scr-final');
    A.audio.sfx.gongDown();
    setTimeout(() => A.audio.say('Koniec przerwy. Kapibara wstaje z leżaka.'), 1300);
    setTimeout(() => $('.stamp.huge', scr).classList.add('slam'), 400);
    $$('[data-b]', scr).forEach(b => b.addEventListener('click', () => {
      A.audio.sfx.click();
      if (b.dataset.b === 'queue') A.app.startFromQueue(0, true);
      else if (b.dataset.b === 'again') again(task);
      else A.app.home();
    }));
  }

  return { show, breakOver, durWords };
})();
