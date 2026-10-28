'use strict';
/* Teczka Petenta: Ministerstwo pamięta. Kartoteka, poczta z oceną, ranga urzędowa i spiżarnia pierogów. */

A.dossier = (() => {
  const D = Object.assign({ firstAt: 0, mail: [], answers: [], pierogi: 0 }, store.get('dossier', {}));
  function save() { store.set('dossier', D); }

  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const day = t => new Date(t).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
  const hm = t => new Date(t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  const OUTCOME = { done: 'wykonane', early: 'przed czasem', quit: 'porzucone z godnością' };
  function history() { return A.app ? A.app.history() : []; }
  function doneCount(h = history()) { return h.filter(x => x.outcome !== 'quit').length; }

  /* ---------- Ranga ---------- */

  function rankIndex(count = doneCount()) {
    let i = 0;
    A.RANKS.forEach((r, k) => { if (count >= r.at) i = k; });
    return i;
  }
  function rank(count) { return A.RANKS[rankIndex(count)]; }
  function nextRank(count = doneCount()) { return A.RANKS[rankIndex(count) + 1] || null; }

  /* ---------- Kartoteka: co urząd wie o wnioskodawcy ---------- */

  function context(task) {
    const h = history();
    const name = norm(task.name);
    const same = h.filter(x => norm(x.name) === name);
    const now = new Date();
    const today = h.filter(x => new Date(x.at).toDateString() === now.toDateString());
    let streak = 0;
    for (const x of h) { if (x.outcome === 'quit') break; streak++; }
    return { h, count: h.length, same, today: today.length, last: h[0] || null, streak, hour: now.getHours(), quits: h.filter(x => x.outcome === 'quit').length };
  }

  // Jedna linijka do decyzji administracyjnej
  function certLine(task) {
    const c = context(task);
    const opts = [];
    if (!c.count) return 'Nowy wnioskodawca. Zakładamy teczkę. Teczka jest pusta i pachnie nowością.';
    if (c.same.length) {
      const prev = c.same[0];
      opts.push(c.same.length === 1
        ? `„${task.name}” po raz drugi. Poprzednio ${day(prev.at)}: ${OUTCOME[prev.outcome]}. Urząd liczy na ciąg dalszy.`
        : `„${task.name}” po raz ${c.same.length + 1}. Zadanie ma już własną szafkę w archiwum.`);
    }
    if (c.last && c.last.outcome === 'quit') opts.push(`Poprzedni wniosek („${c.last.name}”) porzucony z godnością. Godność odnotowano. Wniosek też.`);
    if (c.today >= 3) opts.push(`To ${c.today + 1}. wniosek dzisiaj. Pan Kazimierz zakłada drugi segregator.`);
    if (c.streak >= 3) opts.push(`${c.streak} zadań z rzędu bez porzucenia. Na korytarzu szepczą o Panu/Pani.`);
    if (c.hour >= 22 || c.hour < 5) opts.push('Wniosek złożony w nocy. Urząd zamknięty, ale dla Pana/Pani otworzyliśmy okienko. Babcia Halina pyta, czemu nie śpisz.');
    else if (c.hour < 7) opts.push('Wniosek przed 7:00. Pan Kazimierz przyszedł w kapciach.');
    if (!opts.length) opts.push(`Wnioskodawca znany urzędowi. Wniosek nr ${c.count + 1}. Ostatni: „${c.last.name}” (${OUTCOME[c.last.outcome]}, ${day(c.last.at)}).`);
    return pick(opts);
  }

  // Komunikat „Z akt sprawy” w trakcie zadania (najwyżej jeden na sesję)
  function sessionLine(task) {
    const c = context(task);
    if (!c.count) return null;
    const opts = [];
    if (D.answers.length) {
      const a = pick(D.answers);
      opts.push(`Pan Kazimierz przegląda Pana/Pani teczkę. W protokole z ${day(a.at)} na pytanie „${a.q}” zapisano odpowiedź „${a.a}”. Kazimierz westchnął.`);
    }
    if (c.quits) opts.push(`W teczce ${c.quits} ${plural(c.quits, 'porzucone zadanie', 'porzucone zadania', 'porzuconych zadań')}. Pan Kazimierz przekłada je do segregatora „Z godnością”.`);
    const sec = c.h.reduce((s, x) => s + (x.sec || 0), 0);
    if (sec > 600) opts.push(`Łącznie spędził(-a) Pan/Pani u nas ${A.finale.durWords(sec, true)}. W tym czasie dałoby się ugotować ${fmtInt(sec / 240)} ${plural(Math.round(sec / 240), 'jajko', 'jajka', 'jajek')} na miękko.`);
    if (c.same.length) opts.push(`Archiwum zgłasza: zadanie „${task.name}” było już ${c.same.length} ${plural(c.same.length, 'raz', 'razy', 'razy')}. Ślimak Zbigniew zna już trasę na pamięć.`);
    return opts.length ? ['Z AKT SPRAWY', pick(opts)] : null;
  }

  // Odpowiedzi z kontroli trafiają do teczki
  function noteAnswer(q, a) {
    D.answers.unshift({ q, a, at: Date.now() });
    D.answers = D.answers.slice(0, 20);
    save();
  }

  /* ---------- Poczta: ocena Ministerstwa przychodzi po czasie ---------- */

  const WHY = [
    'za staranność', 'za odwagę', 'za liczbę liter w nazwie zadania', 'z powodu pełni Księżyca', 'bo komisja była po obiedzie',
    'za równe marginesy', 'odjęto 2 punkty za brak pieczątki', 'dodano 1 punkt za pieroga', 'komisja nie pamięta, ale tak czuje',
    'za wytrwałość, punkt ujemny za pośpiech', 'zgodnie z tabelą ocen z 1987 roku', 'kapibara była za, kot przeciw',
  ];
  function queueMail(entry) {
    D.mail.push({ name: entry.name, at: entry.at, score: entry.outcome === 'quit' ? randInt(1, 6) : randInt(4, 10), why: pick(WHY) });
    D.mail = D.mail.slice(-5);
    save();
  }
  // Dostarcza jeden list, jeśli od zadania minęła co najmniej minuta
  function deliverMail() {
    const i = D.mail.findIndex(m => Date.now() - m.at > 60000);
    if (i < 0) return;
    const m = D.mail.splice(i, 1)[0];
    save();
    setTimeout(() => {
      A.audio.sfx.ding();
      A.ui.toast('📬 PRZYSZŁA POCZTA', `Ocena Ministerstwa za zadanie „${m.name}” z ${day(m.at)}, ${hm(m.at)}: ${m.score}/10. Uzasadnienie: ${m.why}. Odwołanie nie przysługuje.`, { kind: 'mail', ttl: 14000 });
    }, 1200);
  }

  /* ---------- Spiżarnia pierogów ---------- */

  function pierogi() { return D.pierogi; }
  function addPierogi(n) { D.pierogi += n; save(); }
  // Łapówka: można zejść poniżej zera („na kredyt u babci”)
  function spendPieroga() { D.pierogi -= 1; save(); return D.pierogi; }

  /* ---------- Od pierwszego wniosku ---------- */

  function markStart() { if (!D.firstAt) { D.firstAt = Date.now(); save(); } }
  function sinceFirst() {
    if (!D.firstAt) return '';
    const sec = (Date.now() - D.firstAt) / 1000;
    const moon = sec * 3.8e4 / 31557600; // µm
    return `Odkąd korzysta Pan/Pani z usług Ministerstwa (od ${day(D.firstAt)}), Księżyc oddalił się od Ziemi o <b>${moon >= 1000 ? fmt(moon / 1000, 2) + ' mm' : fmt(moon, 1) + ' µm'}</b>. Ministerstwo nie twierdzi, że to Pana/Pani wina.`;
  }

  return { rank, rankIndex, nextRank, doneCount, certLine, sessionLine, noteAnswer, queueMail, deliverMail, pierogi, addPierogi, spendPieroga, markStart, sinceFirst, context };
})();
