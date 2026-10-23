'use strict';
/* Aplikacja: ustawienia, kolejka zadań, archiwum, dorobek i start. */

A.settings = Object.assign({ sfx: true, tick: false, voice: true, notify: true, modes: {} }, store.get('settings', {}));

A.app = (() => {
  let queue = store.get('queue', []);
  let history = store.get('history', []);

  function applySettings() {
    A.audio.cfg.sfx = A.settings.sfx;
    A.audio.cfg.tick = A.settings.tick;
    A.audio.cfg.voice = A.settings.voice;
    store.set('settings', A.settings);
  }

  /* ---------- Kolejka ---------- */

  function saveQueue() { store.set('queue', queue); renderQueue(); }
  function addToQueue(task) { queue.push(task); saveQueue(); }
  function peekQueue() { return queue[0] || null; }
  function startFromQueue(i = 0) {
    const t = queue.splice(i, 1)[0];
    saveQueue();
    if (!t) return home();
    home();
    A.creator.process(t, x => A.session.start(x));
  }
  function renderQueue() {
    const ul = $('#queue');
    ul.innerHTML = queue.map((t, i) => `
      <li>
        <div><b>${esc(t.name)}</b><small>${t.min} min · ${esc(A.LEVELS[t.level - 1].name)}</small></div>
        <span class="q-btns">
          <button class="btn tiny" data-q="start" data-i="${i}" title="Zacznij">▶</button>
          <button class="btn tiny" data-q="edit" data-i="${i}" title="Przenieś do formularza">✎</button>
          <button class="btn tiny" data-q="del" data-i="${i}" title="Usuń">✕</button>
        </span>
      </li>`).join('');
    $('#queue-empty').hidden = queue.length > 0;
    $$('[data-q]', ul).forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i;
      A.audio.sfx.click();
      if (b.dataset.q === 'start') startFromQueue(i);
      else if (b.dataset.q === 'edit') { A.creator.fill(queue[i]); queue.splice(i, 1); saveQueue(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else { const t = queue.splice(i, 1)[0]; saveQueue(); A.ui.toast('USUNIĘTO', `„${t.name}” wykreślone z kolejki. Nikt nie będzie tęsknić.`); }
    }));
  }

  /* ---------- Archiwum i dorobek ---------- */

  function record(entry) {
    history.unshift(entry);
    history = history.slice(0, 300);
    store.set('history', history);
    renderTotals();
  }

  function totals() {
    const done = history.filter(h => h.outcome !== 'quit');
    const sec = history.reduce((a, h) => a + (h.sec || 0), 0);
    return { count: done.length, quit: history.length - done.length, sec };
  }

  function renderTotals() {
    const t = totals();
    const box = $('#totals');
    if (!history.length) {
      box.innerHTML = '<p class="empty">Jeszcze nic. Pierwsze zadanie zawsze jest najtrudniejsze. Drugie też, ale mniej.</p>';
      return;
    }
    const tot = t.sec;
    box.innerHTML = `
      <div class="tot-big"><b>${t.count}</b><span>${plural(t.count, 'zadanie ukończone', 'zadania ukończone', 'zadań ukończonych')}</span></div>
      <ul class="tot-list">
        <li>Łącznie <b>${A.finale.durWords(tot)}</b></li>
        <li>czyli <b>${fmt(tot / 240, 1)}</b> jajka na miękko</li>
        <li>albo <b>${fmt(tot / 355, 1)}</b> × „Bohemian Rhapsody”</li>
        <li>albo <b>${fmt(tot / (4 * 31557600))}</b> kadencji Sejmu</li>
        <li>Twoje włosy urosły w tym czasie o <b>${fmt(tot * 0.0405 / 100, 2)} m</b></li>
        ${t.quit ? `<li>Porzucone: <b>${t.quit}</b> (z godnością)</li>` : ''}
      </ul>`;
  }

  function showArchive() {
    const t = totals();
    const rows = history.slice(0, 60).map(h => `
      <tr class="${h.outcome}">
        <td>${new Date(h.at).toLocaleDateString('pl-PL')}<small>${new Date(h.at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</small></td>
        <td>${esc(h.name)}</td>
        <td>${mmss(h.sec)}</td>
        <td>${h.outcome === 'done' ? '✓ wykonane' : h.outcome === 'early' ? '🚀 przed czasem' : '🏳️ porzucone'}</td>
      </tr>`).join('');
    A.ui.dialog(`
      <h2>Archiwum Akt Zadaniowych</h2>
      <p class="small">Ukończone: <b>${t.count}</b> · porzucone: <b>${t.quit}</b> · łączny czas: <b>${A.finale.durWords(t.sec)}</b>, czyli ${fmt(t.sec * 299792 / 1e6, 0)} mln km lotu światła.</p>
      ${history.length ? `<div class="arch-wrap"><table class="arch"><thead><tr><th>Data</th><th>Zadanie</th><th>Czas</th><th>Wynik</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="empty">Archiwum puste. Pan Kazimierz nudzi się w pokoju 404.</p>'}`,
    [
      ...(history.length ? [{ label: '🗑️ Zniszczyć akta', cls: 'danger', fn: () => {
        A.ui.dialog('<h2>Zniszczyć akta?</h2><p>Całe archiwum zostanie zmielone w niszczarce. Tego nie da się cofnąć, nawet wnioskiem B-12.</p>', [
          { label: 'Tak, mielić', cls: 'danger', fn: () => { history = []; store.set('history', history); renderTotals(); A.audio.sfx.crash(); A.ui.toast('ZMIELONO', 'Akta zniszczone. Pan Kazimierz uronił łzę.'); } },
          { label: 'Nie', fn: showArchive },
        ]);
      } }] : []),
      { label: 'Zamknij', cls: 'primary' },
    ], { cls: 'wide' });
  }

  function showSettings() {
    const s = A.settings;
    const modes = A.MODES.map(m => `
      <label class="chk"><input type="checkbox" data-mode="${m.id}" ${s.modes[m.id] === false ? '' : 'checked'}> <span>${m.icon} ${esc(m.name)}</span></label>`).join('');
    const dlg = A.ui.dialog(`
      <h2>Ustawienia</h2>
      <div class="set-grid">
        <label class="chk"><input type="checkbox" id="s-sfx" ${s.sfx ? 'checked' : ''}> <span>🔊 Efekty dźwiękowe</span></label>
        <label class="chk"><input type="checkbox" id="s-tick" ${s.tick ? 'checked' : ''}> <span>⏱️ Tykanie zegara co sekundę</span></label>
        <label class="chk"><input type="checkbox" id="s-voice" ${s.voice ? 'checked' : ''}> <span>🗣️ Lektor (komunikaty dworcowe) ${A.audio.hasVoice() ? '' : '<small>– brak polskiego głosu w przeglądarce</small>'}</span></label>
        <label class="chk"><input type="checkbox" id="s-notify" ${s.notify ? 'checked' : ''}> <span>🔔 Powiadomienie, gdy zadanie skończy się w tle</span></label>
      </div>
      <h3>Sposoby odliczania</h3>
      <div class="set-modes">${modes}</div>
      <p class="small">Wyłączone sposoby nie pojawią się w trakcie zadania. Przynajmniej jeden musi zostać, inaczej zegar się obrazi.</p>`,
    [{ label: 'Zapisz', cls: 'primary', fn: () => {
      s.sfx = $('#s-sfx', dlg).checked; s.tick = $('#s-tick', dlg).checked;
      s.voice = $('#s-voice', dlg).checked; s.notify = $('#s-notify', dlg).checked;
      $$('[data-mode]', dlg).forEach(c => { s.modes[c.dataset.mode] = c.checked; });
      if (!A.MODES.some(m => s.modes[m.id] !== false)) { s.modes = {}; A.ui.toast('ZEGAR SIĘ OBRAZIŁ', 'Wyłączono wszystkie sposoby, więc włączyliśmy wszystkie z powrotem.'); }
      applySettings();
      A.ui.toast('ZAPISANO', 'Ustawienia przyjęte do akt.');
      if (s.notify && 'Notification' in window && Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) { /* nic */ } }
    } }, { label: 'Anuluj' }], { cls: 'wide' });
  }

  function home() {
    if (A.session.active()) return;
    document.title = 'Absurdoro – pomodoro, które mierzy czas wszystkim, tylko nie minutami';
    renderQueue(); renderTotals();
    A.ui.screen('scr-home');
  }

  function init() {
    applySettings();
    A.creator.init();
    $('#mode-list').innerHTML = A.MODES.map(m => `<li title="${esc(m.tagline)}"><span>${m.icon}</span>${esc(m.name)}</li>`).join('');
    renderQueue(); renderTotals();
    $('#b-archive').addEventListener('click', () => { A.audio.sfx.click(); showArchive(); });
    $('#b-settings').addEventListener('click', () => { A.audio.sfx.click(); showSettings(); });
    $('#logo').addEventListener('click', e => {
      e.preventDefault();
      if (A.session.active()) A.ui.toast('NIE TAK SZYBKO', 'Zadanie trwa. Aby wyjść, użyj „Skończone” albo „Poddaj się”.');
      else home();
    });
    document.body.dataset.screen = 'scr-home';
    if (!A.session.resumeIfAny()) $('#f-name').focus({ preventScroll: true });
  }

  return { init, addToQueue, peekQueue, startFromQueue, record, home };
})();

A.app.init();
