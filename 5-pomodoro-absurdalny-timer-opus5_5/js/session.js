'use strict';
/* Sesja: odliczanie, rotacja sposobów, komunikaty, kontrole, pauza, końcowe 10 sekund. */

A.session = (() => {
  const stage = $('#stage'), bar = $('#run-bar'), real = $('#run-real');
  const rotLabel = $('#rot-label'), rotBar = $('#rot-bar'), veil = $('#paused-veil');
  const menu = $('#mode-menu'), f10 = $('#final10'), f10n = $('#f10-num'), f10s = $('#f10-sub');

  let S = null;              // zapisany stan sesji
  let list = [], idx = 0, inst = null, pinned = false, rotT = 0;
  let raf = 0, lastTs = 0, evT = 0, nextEv = 60, lastSec = -1, lastF10 = 0, titleT = 0, titleAlt = false;
  let controlOpen = false, controlClose = null, controlTimer = 0, ending = false, dossierSaid = false;
  const events = bagStored('events', A.EVENTS);
  const controls = bagStored('controls', A.CONTROLS);
  const breakEvents = bagStored('breakEvents', A.BREAK_EVENTS);
  const breakTips = bagStored('breakTips', A.BREAK_TIPS);

  function level() { return A.LEVELS[(S.task.level || 3) - 1]; }
  function save() { store.set('session', S); }

  function modesFor(kind) {
    const on = A.settings.modes || {};
    let m = A.MODES.filter(x => on[x.id] !== false);
    if (kind === 'break') m = m.filter(x => x.breakOk);
    return m.length ? m : A.MODES.filter(x => kind !== 'break' || x.breakOk);
  }

  function state() {
    const paused = S.pausedRemain != null;
    const remaining = paused ? S.pausedRemain : Math.max(0, (S.endAt - Date.now()) / 1000);
    const elapsed = Math.max(0, S.total - remaining);
    return { total: S.total, remaining, elapsed, p: clamp(elapsed / S.total, 0, 1), paused, task: S.task, kind: S.kind };
  }

  /* ---------- Start i wznowienie ---------- */

  function start(task, kind = 'work', resume = null) {
    A.audio.ensure();
    const total = (kind === 'break' ? task.brk : task.min) * 60;
    S = resume || { task, kind, total, endAt: Date.now() + total * 1000, pausedRemain: null, startedAt: Date.now(), pauses: 0, controls: 0, modeId: null, pinned: false, log: [] };
    S.log = S.log || [];
    save();
    ending = false; lastSec = -1; lastF10 = 0; controlOpen = false; dossierSaid = !!resume;
    document.body.dataset.kind = S.kind;
    document.body.dataset.level = S.task.level;
    const today = A.app.todayCount();
    $('#run-kind').textContent = S.kind === 'break' ? `PRZERWA (ZATWIERDZONA) · 🍅 dziś: ${today}` : `ZADANIE W TOKU · sygn. ${S.task.sig || 'ABS/—'} · 🍅 dziś: ${today}`;
    $('#run-name').textContent = S.kind === 'break' ? breakTips() : S.task.name;
    $('#b-done').textContent = S.kind === 'break' ? '☕ Koniec przerwy' : '✓ Skończone';
    $('#b-quit').hidden = S.kind === 'break';
    if (S.kind === 'work') A.dossier.markStart();
    A.ui.screen('scr-run');
    list = shuffle(modesFor(S.kind));
    const at = list.findIndex(m => m.id === S.modeId);
    pinned = !!S.pinned;
    mount(at >= 0 ? at : 0, true);
    evT = 0; nextEv = nextEventIn();
    setPausedUI();
    if (!resume) {
      if (S.kind === 'work') {
        A.audio.sfx.gong();
        const nm = S.task.name, sess = S;
        setTimeout(() => { if (S === sess) A.audio.say(`Zadanie ${nm}. Czas start. Ministerstwo trzyma kciuki.`); }, 900);
        A.ui.toast('CZAS RUSZYŁ', `Zadanie „${S.task.name}” oficjalnie trwa. Patron: ${S.task.patron ? S.task.patron.name : 'nieznany'}.`);
      } else {
        A.audio.sfx.slurp();
        A.ui.toast('PRZERWA', 'Przerwa zatwierdzona. Wolno odpoczywać. To polecenie służbowe.');
      }
      askNotify();
    }
    cancelAnimationFrame(raf); lastTs = 0;
    raf = requestAnimationFrame(loop);
  }

  function resumeIfAny() {
    const saved = store.get('session', null);
    if (!saved || !saved.task) return false;
    S = saved;
    const s = state();
    if (s.remaining <= 0) { S = saved; finish('done', true); return true; }
    start(saved.task, saved.kind, saved);
    A.ui.toast('WZNOWIONO', 'Zadanie trwało dalej, gdy Cię nie było. Czas nie czeka. Nigdy nie czekał.');
    return true;
  }

  function askNotify() {
    if (!A.settings.notify || !('Notification' in window)) return;
    if (Notification.permission === 'default') { try { Notification.requestPermission(); } catch (e) { /* stara przeglądarka */ } }
  }

  /* ---------- Sposoby odliczania ---------- */

  function mount(i, quiet) {
    if (inst) { try { inst.destroy(); } catch (e) { console.error(e); } inst = null; }
    stage.innerHTML = '';
    idx = (i + list.length) % list.length;
    const m = list[idx];
    const host = el('div', 'mode-host mode-' + m.id);
    stage.appendChild(host);
    try { inst = m.create(host, state()); } catch (e) { console.error(e); inst = null; }
    host.classList.add('enter');
    $('#mode-icon').textContent = m.icon;
    $('#mode-name').textContent = m.name;
    $('#mode-tag').textContent = m.tagline;
    S.modeId = m.id; save();
    rotT = 0; lastTs = 0;
    renderMenu();
    if (!quiet) A.audio.sfx.whoosh();
  }
  function nextMode(d) { mount(idx + d); }
  function setPin(v) {
    pinned = v; S.pinned = v; save();
    $('#b-pin').classList.toggle('on', v);
    $('#b-pin').title = v ? 'Odepnij – sposoby znów będą się zmieniać (P)' : 'Zostań przy tym sposobie (P)';
  }
  function renderMenu() {
    menu.innerHTML = '<h3>Wybierz sposób odliczania</h3>' + list.map((m, i) =>
      `<button class="mm-item ${i === idx ? 'on' : ''}" data-i="${i}"><span>${m.icon}</span><b>${esc(m.name)}</b><small>${esc(m.tagline)}</small></button>`).join('');
    $$('.mm-item', menu).forEach(b => b.addEventListener('click', () => { mount(+b.dataset.i); setPin(true); menu.hidden = true; }));
    setPin(pinned);
  }

  /* ---------- Komunikaty i kontrole ---------- */

  function nextEventIn() {
    const L = level();
    return L.event ? L.event * rand(0.7, 1.3) : Infinity;
  }
  function fireEvent(s) {
    const L = +S.task.level;
    // Przerwa: tylko łagodne komunikaty, bez kontroli i bez psucia ekranu
    if (S.kind === 'break') {
      const [title, text] = breakEvents();
      A.audio.sfx.ding();
      A.ui.toast(title, text);
      return;
    }
    const fromFile = !dossierSaid && chance(0.6) ? A.dossier.sessionLine(S.task) : null;
    if (fromFile) {
      dossierSaid = true;
      A.audio.sfx.stamp();
      A.ui.toast(fromFile[0], fromFile[1], { ttl: 11000 });
    } else if (L >= 3 && !controlOpen && s.remaining > 40 && chance(0.3)) {
      controlOpen = true;
      const c = controls();
      L >= 4 ? A.audio.sfx.siren() : A.audio.sfx.ding();
      const at = s.elapsed;
      controlClose = A.ui.toast('🚨 ' + c.t, c.q, {
        kind: 'control', ttl: 20000,
        buttons: c.a.map(([label, reply]) => ({ label, fn: () => {
          controlOpen = false; clearTimeout(controlTimer);
          if (!S) return;
          S.controls++; S.log.push({ t: at, k: 'control', q: c.q, a: label }); save();
          A.dossier.noteAnswer(c.q, label);
          A.audio.sfx.stamp();
          A.ui.toast('PROTOKÓŁ', reply);
        } })),
      });
      controlTimer = setTimeout(() => {
        if (!controlOpen || !S) return;
        controlOpen = false; controlClose();
        S.log.push({ t: at, k: 'control', q: c.q, a: '(brak odpowiedzi)' }); save();
        A.ui.toast('PROTOKÓŁ', 'Inspektor odszedł bez odpowiedzi. Zanotował coś w zeszycie. Pewnie nic ważnego.');
      }, 19000);
    } else {
      const [title, text] = events()(s);
      A.audio.sfx.ding();
      A.ui.toast(title, text);
    }
    if (L >= 5) {
      document.body.classList.add('glitch');
      setTimeout(() => document.body.classList.remove('glitch'), 1100);
    }
  }

  /* ---------- Pętla ---------- */

  // Oszczędzanie energii: scena rysowana do 30 razy na sekundę, w pauzie i pod menu raz na sekundę
  function loop(ts) {
    if (!S) return;
    raf = requestAnimationFrame(loop);
    const s = state();
    const minGap = s.paused || !menu.hidden ? 1000 : A.settings.eco ? 1000 / 30 - 2 : 0;
    if (lastTs && ts - lastTs < minGap && !(s.remaining <= 0 && !s.paused)) return;
    const dt = Math.min(0.1, (ts - (lastTs || ts)) / 1000);
    lastTs = ts;
    if (inst) { try { inst.frame(s, dt); } catch (e) { console.error(e); inst = null; } }
    tickUI(s, dt);
    if (s.remaining <= 0 && !s.paused) { cancelAnimationFrame(raf); finish('done'); }
  }

  function tickUI(s, dt) {
    setText(real, mmss(s.remaining));
    // paski przez transform – bez przeliczania układu strony
    const bw = `scaleX(${s.p.toFixed(4)})`;
    if (bar.style.transform !== bw) bar.style.transform = bw;
    const sec = Math.ceil(s.remaining);
    if (sec !== lastSec) {
      if (lastSec > 0 && !s.paused) (sec % 2 ? A.audio.sfx.tick : A.audio.sfx.tock)();
      lastSec = sec;
    }
    // rotacja
    const L = level();
    if (pinned) { setText(rotLabel, '📌 przypięty – bez zmian'); rotBar.style.transform = 'scaleX(0)'; }
    else {
      if (!s.paused && s.remaining > 11) rotT += dt;
      setText(rotLabel, `następny sposób za ${Math.max(0, Math.ceil(L.rotate - rotT))} s`);
      const rw = `scaleX(${Math.min(1, rotT / L.rotate).toFixed(3)})`;
      if (rotBar.style.transform !== rw) rotBar.style.transform = rw;
      if (rotT >= L.rotate) nextMode(1);
    }
    // komunikaty
    if (!s.paused && s.remaining > 15 && s.elapsed > 20) {
      evT += dt;
      if (evT >= nextEv) { evT = 0; nextEv = nextEventIn(); fireEvent(s); }
    }
    // ostatnie 10 sekund
    if (S.total >= 20 && !s.paused && s.remaining <= 10 && s.remaining > 0) {
      const n = Math.ceil(s.remaining);
      if (n !== lastF10) {
        lastF10 = n;
        const [big, sub] = A.FINAL_COUNT[n] ? pick(A.FINAL_COUNT[n]) : [String(n), ''];
        f10.hidden = false;
        f10n.textContent = big; f10s.textContent = `${n} – ${sub}`;
        f10n.className = 'f10-num' + (/\p{Extended_Pictographic}/u.test(big) ? ' emoji' : /^[−·\s]+$/.test(big) ? ' morse' : '');
        void f10n.offsetWidth; f10n.classList.add('pop');
        A.audio.sfx.count(n);
        if (n === 5) A.audio.say('Pięć!', { rate: 1.2 });
        if (+S.task.level >= 4) { document.body.classList.remove('quake'); void document.body.offsetWidth; document.body.classList.add('quake'); }
      }
    } else if (!f10.hidden && (s.paused || s.remaining > 10)) f10.hidden = true;
    // tytuł karty
    titleT += dt;
    if (titleT > 3.5) { titleT = 0; titleAlt = !titleAlt; }
    updateTitle(s);
  }

  function updateTitle(s) {
    const pre = s.paused ? '⏸ ' : S.kind === 'break' ? '☕ ' : '🍅 ';
    // Czas zawsze na początku, żeby był widoczny na wąskiej karcie
    const title = titleAlt && !s.paused
      ? `${pre}${mmss(s.remaining)} · ${fmtInt(s.remaining / 3.5)} ${plural(Math.round(s.remaining / 3.5), 'mrugnięcie', 'mrugnięcia', 'mrugnięć')}`
      : `${pre}${mmss(s.remaining)} · ${S.kind === 'break' ? 'przerwa' : S.task.name}`;
    if (document.title !== title) document.title = title;
  }

  // W ukrytej karcie requestAnimationFrame stoi – pilnujemy końca zegarem.
  // Pojedynczy setTimeout na koniec nie podlega dławieniu interwałów w tle.
  let endTimer = 0;
  document.addEventListener('visibilitychange', () => {
    clearTimeout(endTimer);
    if (!document.hidden || !S || ending || S.pausedRemain != null) return;
    endTimer = setTimeout(() => { if (S && !ending && state().remaining <= 0) finish('done'); }, Math.max(0, S.endAt - Date.now()) + 50);
  });
  setInterval(() => {
    if (!S || ending) return;
    const s = state();
    if (document.hidden) {
      updateTitle(s);
      if (s.remaining <= 0 && !s.paused) finish('done');
    }
  }, 1000);

  /* ---------- Sterowanie ---------- */

  function setPausedUI() {
    const p = S.pausedRemain != null;
    veil.hidden = !p;
    $('#b-pause').textContent = p ? '▶ Wznów' : '⏸ Pauza';
    document.body.classList.toggle('is-paused', p);
  }
  function togglePause() {
    if (!S || ending) return;
    if (S.pausedRemain != null) {
      S.endAt = Date.now() + S.pausedRemain * 1000;
      S.pausedRemain = null;
      A.audio.sfx.pop();
      A.ui.toast('WZNOWIONO', pick(['Czas znów płynie. Jakby nic się nie stało.', 'Pauza zakończona. Ślimak Zbigniew odetchnął z ulgą.', 'Wracamy. Wszechświat nawet nie zauważył.']));
    } else {
      S.pausedRemain = state().remaining;
      S.pauses++;
      S.log.push({ t: S.total - S.pausedRemain, k: 'pause' });
      A.audio.sfx.sad();
    }
    save(); setPausedUI();
  }

  function askDone() {
    if (!S || ending) return;
    const s = state();
    if (S.kind === 'break') return finish('early');
    A.ui.dialog(`
      <h2>Wniosek o przedterminowe zakończenie</h2>
      <p>Zostało jeszcze <b>${mmss(s.remaining)}</b>. Czy zadanie „<b>${esc(S.task.name)}</b>” jest naprawdę skończone?</p>
      <p class="small">Fałszywe oświadczenie grozi rozczarowaniem Ślimaka Zbigniewa.</p>`,
    [{ label: '✓ Tak, przysięgam na pomidora', cls: 'primary', fn: () => finish('early') }, { label: 'Jednak nie', fn: () => {} }]);
  }
  function askQuit() {
    if (!S || ending) return;
    A.ui.dialog(`
      <h2>Kapitulacja?</h2>
      <p>${S.kind === 'break' ? 'Rezygnujesz z przerwy? Ministerstwo jest w szoku. Nikt nigdy nie rezygnował z przerwy.' : 'Zadanie zostanie oznaczone jako <b>porzucone</b>. Kot Prezes już szykuje się, by zrzucić je ze stołu.'}</p>`,
    [{ label: S.kind === 'break' ? 'Tak, wracam do pracy' : '🏳️ Tak, poddaję się', cls: 'danger', fn: () => finish('quit') }, { label: 'Walczę dalej', cls: 'primary', fn: () => {} }]);
  }

  /* ---------- Koniec ---------- */

  function finish(outcome, whileAway) {
    if (!S || ending) return;
    ending = true;
    cancelAnimationFrame(raf);
    const s = state();
    if (inst) { try { inst.destroy(); } catch (e) { /* nic */ } inst = null; }
    stage.innerHTML = '';
    f10.hidden = true; menu.hidden = true; veil.hidden = true;
    document.body.classList.remove('is-paused', 'quake', 'glitch');
    if (A.ui.dialogOpen()) A.ui.closeDialog();
    // Komunikaty z zadania nie przechodzą na raport
    clearTimeout(controlTimer); controlOpen = false;
    A.ui.clearToasts();
    $('#b-quit').hidden = false;
    store.del('session');
    const done = S;
    S = null;
    document.title = 'Absurdoro – zadanie zakończone';
    const elapsed = outcome === 'done' ? done.total : s.elapsed;
    if (document.hidden && A.settings.notify && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(done.kind === 'break' ? 'Koniec przerwy!' : 'Zadanie zakończone!', {
          body: done.kind === 'break' ? 'Przerwa minęła. Kapibara wstaje z leżaka.' : `„${done.task.name}” – Ślimak Zbigniew dotarł do mety. Niewiarygodne.`,
        });
      } catch (e) { /* bez powiadomień */ }
    }
    if (done.kind === 'break') { A.finale.breakOver(done, outcome); return; }
    const entry = {
      id: done.task.id, name: done.task.name, min: done.task.min, sec: Math.round(elapsed), at: Date.now(),
      outcome, pauses: done.pauses, controls: done.controls, level: done.task.level, reason: done.task.reason, sig: done.task.sig,
    };
    const rankBefore = A.dossier.rankIndex();
    A.app.record(entry);
    // Spiżarnia: pieróg za każde rozpoczęte 5 minut pracy
    entry.pierogi = outcome === 'quit' ? 0 : Math.max(1, Math.round(elapsed / 300));
    if (entry.pierogi) A.dossier.addPierogi(entry.pierogi);
    A.dossier.queueMail(entry);
    A.finale.show(entry, done.task, whileAway, { log: done.log || [], total: done.total, promoted: A.dossier.rankIndex() > rankBefore });
  }

  /* ---------- Klawisze i przyciski ---------- */

  $('#b-prev').addEventListener('click', () => nextMode(-1));
  $('#b-next').addEventListener('click', () => nextMode(1));
  $('#b-pin').addEventListener('click', () => { setPin(!pinned); A.audio.sfx.click(); });
  $('#b-modes').addEventListener('click', () => { menu.hidden = !menu.hidden; A.audio.sfx.click(); });
  $('#b-pause').addEventListener('click', togglePause);
  $('#b-done').addEventListener('click', askDone);
  $('#b-quit').addEventListener('click', askQuit);
  menu.addEventListener('click', e => { if (e.target === menu) menu.hidden = true; });
  // Telefon: przesunięcie palcem w bok zmienia sposób odliczania
  let touch0 = null;
  stage.addEventListener('touchstart', e => { touch0 = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } : null; }, { passive: true });
  stage.addEventListener('touchend', e => {
    if (!touch0 || !S) return;
    const dx = e.changedTouches[0].clientX - touch0.x, dy = e.changedTouches[0].clientY - touch0.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - touch0.t < 600) nextMode(dx < 0 ? 1 : -1);
    touch0 = null;
  }, { passive: true });
  document.addEventListener('keydown', e => {
    if (!S || ending || A.ui.dialogOpen() || document.body.dataset.screen !== 'scr-run') return;
    if (e.target.closest && e.target.closest('input,select,textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); togglePause(); }
    else if (e.key === 'ArrowRight') nextMode(1);
    else if (e.key === 'ArrowLeft') nextMode(-1);
    else if (e.key === 'p' || e.key === 'P') setPin(!pinned);
    else if (e.key === 'm' || e.key === 'M') menu.hidden = !menu.hidden;
    else if (e.key === 'Escape') menu.hidden = true;
  });

  return { start, resumeIfAny, active: () => !!S };
})();
