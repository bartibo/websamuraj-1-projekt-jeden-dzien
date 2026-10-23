'use strict';
/* Ekran wniosku: formularz A-38, analizator zadań, przeliczenia, rozpatrywanie wniosku i decyzja. */

A.creator = (() => {
  const nameIn = $('#f-name'), minIn = $('#f-min'), minOut = $('#f-min-out'), levelIn = $('#f-level');
  const reasonIn = $('#f-reason'), breakIn = $('#f-break');
  const anOut = $('#an-out'), anMet = $('#an-metrics');
  const cvTitle = $('#cv-title'), cvList = $('#cv-list');
  let cvPick = [], anTimer = 0, lastAn = '';

  /* ---------- Analizator ---------- */

  function metrics(name, min) {
    const low = name.trim().toLowerCase();
    const r = mulberry32(hashStr(low + '|' + min));
    const kw = A.KEYWORDS.filter(([re]) => re.test(low)).length;
    return {
      success: clamp(55 + r() * 44 + (min <= 25 ? 4 : -min * 0.05), 3, 99.9),
      procr: clamp(r() * 60 + min * 0.35 + kw * 7, 3, 99),
      diff: 1 + Math.floor(r() * 5),
      aura: A.AURAS[Math.floor(r() * A.AURAS.length)],
      drink: A.DRINKS[Math.floor(r() * A.DRINKS.length)],
      patron: A.PATRONS[Math.floor(r() * A.PATRONS.length)],
      seed: hashStr(low + '|' + min),
    };
  }

  function comments(name, min) {
    const n = name.trim(), low = n.toLowerCase();
    const lines = [];
    if (!n) lines.push('Czekam na nazwę zadania. Kursor czeka. Wszechświat czeka.');
    else {
      for (const [re, txt] of A.KEYWORDS) if (re.test(low)) { lines.push(txt); if (lines.length >= 2) break; }
      if (n.length > 3 && n === n.toUpperCase() && /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(n)) lines.push('WYKRYTO KRZYK. Zadanie otrzymuje priorytet „NA WCZORAJ”.');
      if (/!/.test(n)) lines.push('Wykrzyknik zwiększa motywację o 3%. Dwa wykrzykniki – o 3%. Tak to działa.');
      if (/\?/.test(n)) lines.push('Zadanie ze znakiem zapytania. Nawet zadanie nie wie, o co w nim chodzi.');
      if (/\d/.test(n)) lines.push('Liczby w nazwie. Matematyka patrzy z niepokojem.');
      if (n.length > 45) lines.push('Nazwa dłuższa niż niektóre umowy najmu. Szanujemy szczegółowość.');
      if (n.length <= 3) lines.push('Krótko i treściwie. Podejrzanie treściwie.');
      if (!lines.length) lines.push(A.ANALYZER_GENERIC[hashStr(low) % A.ANALYZER_GENERIC.length]);
    }
    if (min <= 2) lines.push('Zadanie krótsze niż kolejka do mikrofalówki. Odważnie.');
    else if (min === 25) lines.push('Klasyczne 25 minut. Francesco Cirillo, wynalazca pomodoro, byłby dumny. Albo zdziwiony.');
    else if (min >= 90) lines.push('Ponad półtorej godziny. Zalecamy prowiant i list pożegnalny do kanapy.');
    else if (min === 47) lines.push('47 minut. Dokładnie tyle co kolejka w urzędzie. Przypadek? Nie sądzimy.');
    return lines;
  }

  function renderAnalysis(immediate) {
    const name = nameIn.value, min = +minIn.value;
    const key = name.trim().toLowerCase() + '|' + min;
    if (key === lastAn) return;
    lastAn = key;
    clearTimeout(anTimer);
    anOut.innerHTML = '<p class="an-busy">Analizuję<span>.</span><span>.</span><span>.</span></p>';
    anTimer = setTimeout(() => {
      anOut.innerHTML = comments(name, min).map(l => `<p>› ${esc(l)}</p>`).join('');
      if (!name.trim()) { anMet.innerHTML = ''; return; }
      const m = metrics(name, min);
      anMet.innerHTML = `
        <div class="met"><span>Szansa powodzenia</span><i><em style="width:${m.success}%"></em></i><b>${fmt(m.success, 1)}% <small>(±100%)</small></b></div>
        <div class="met"><span>Ryzyko prokrastynacji</span><i class="warn"><em style="width:${m.procr}%"></em></i><b>${fmt(m.procr, 0)}%</b></div>
        <div class="met"><span>Trudność</span><b class="wide">${'🥟'.repeat(m.diff)}<small> ${m.diff}/5 pierogów</small></b></div>
        <div class="met"><span>Aura zadania</span><b class="wide">${esc(m.aura)}</b></div>
        <div class="met"><span>Zalecany napój</span><b class="wide">${esc(m.drink)}</b></div>`;
    }, immediate ? 0 : 420);
  }

  /* ---------- Czas i przeliczenia ---------- */

  function rollConvert() {
    cvPick = shuffle(A.CONVERT.map((_, i) => i)).slice(0, 5);
    renderConvert();
  }
  function renderConvert() {
    const min = +minIn.value;
    minOut.innerHTML = `<b>${min}</b> ${plural(min, 'minuta', 'minuty', 'minut')}`;
    cvTitle.textContent = `${min} ${plural(min, 'minuta', 'minuty', 'minut')} to także:`;
    cvList.innerHTML = cvPick.map(i => `<li>${A.CONVERT[i](min)}</li>`).join('');
    $$('.preset', $('#presets')).forEach(b => b.classList.toggle('on', +b.dataset.min === min));
  }

  function renderLevel() {
    const L = A.LEVELS[+levelIn.value - 1];
    $('#level-name').textContent = L.name;
    $('#level-desc').textContent = L.desc;
    document.body.dataset.level = levelIn.value;
  }

  function readTask() {
    const name = nameIn.value.trim();
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name, min: +minIn.value, reason: reasonIn.value, brk: +breakIn.value, level: +levelIn.value,
    };
  }

  function nudgeName() {
    nameIn.focus();
    nameIn.classList.remove('shake'); void nameIn.offsetWidth; nameIn.classList.add('shake');
    A.ui.toast('ODMOWA', 'Wniosek bez nazwy zadania nie może zostać rozpatrzony. Nawet „nic” jest jakąś nazwą.', { kind: 'bad' });
    A.audio.sfx.sad();
  }

  /* ---------- Rozpatrywanie wniosku ---------- */

  const STEPS = [
    ['Weryfikacja tożsamości zadania', 'zadanie jest tym, za kogo się podaje'],
    ['Synchronizacja z zegarem atomowym', 'różnica 0,000000001 s, wybaczono'],
    ['Konsultacja z kapibarą', 'kapibara nie ma zastrzeżeń'],
    ['Przekupywanie Greenwich drobnymi', 'przyjęto 2 zł i guzik'],
    ['Ostrzenie wskazówek', 'naostrzone, uwaga na palce'],
    ['Liczenie ziaren w klepsydrze', 'wyszło 4 812 309, w przybliżeniu'],
    ['Sprawdzanie, czy czas płynie', 'płynie, potwierdzono'],
    ['Dezynfekcja minut', 'minuty czyste'],
    ['Pytanie babci o zdanie', 'babcia mówi, żeby najpierw zjeść'],
    ['Kalibracja czasoprzestrzeni', 'wszystko się zakrzywia prawidłowo'],
  ];

  function process(task, onStart, onBack) {
    const ovl = $('#ovl-process'), steps = $('#steps'), cert = $('#cert');
    steps.innerHTML = ''; cert.hidden = true; cert.innerHTML = '';
    steps.hidden = false;
    $('.process h2', ovl).textContent = 'Rozpatrywanie wniosku…';
    ovl.hidden = false;
    const chosen = shuffle(STEPS).slice(0, 4);
    const queueNo = randInt(31, 77);
    const list = [...chosen.map(s => ({ t: s[0], r: s[1] })),
      { t: `Oczekiwanie w kolejce do okienka nr 3`, r: '', queue: true },
      { t: 'Przybijanie pieczątki', r: 'BUM' }];
    let i = 0, cancelled = false, skip = false;
    const skipBtn = el('button', 'btn tiny skip', '🥟 Pomiń kolejkę (łapówka: 1 pieróg)');
    skipBtn.type = 'button';
    skipBtn.addEventListener('click', () => { skip = true; skipBtn.remove(); A.audio.sfx.pop(); });
    steps.after(skipBtn);

    function next() {
      if (cancelled) return;
      if (i >= list.length) { skipBtn.remove(); return showCert(); }
      const st = list[i++];
      const li = el('li', 'step', `<span class="st-t">${esc(st.t)}</span><span class="st-r">…</span>`);
      steps.appendChild(li);
      A.audio.sfx.type();
      if (st.queue && !skip) {
        let served = queueNo - randInt(5, 9);
        const r = $('.st-r', li);
        const tick = () => {
          if (cancelled) return;
          if (skip) served = queueNo;
          r.textContent = `Twój numer: ${queueNo}, obsługiwany: ${served}`;
          if (served >= queueNo) { li.classList.add('ok'); r.textContent = `numer ${queueNo} – zapraszamy!`; A.audio.sfx.ding(); setTimeout(next, 300); return; }
          served++;
          setTimeout(tick, skip ? 40 : 260);
        };
        tick();
        return;
      }
      setTimeout(() => {
        li.classList.add('ok');
        $('.st-r', li).textContent = st.queue ? 'ominięto (pieróg przyjęty)' : st.r;
        if (st.r === 'BUM') A.audio.sfx.stamp(); else A.audio.sfx.blip();
        setTimeout(next, skip ? 60 : 160);
      }, skip ? 80 : rand(320, 560));
    }

    function showCert() {
      const m = metrics(task.name, task.min);
      task.patron = m.patron; task.success = m.success; task.procr = m.procr; task.aura = m.aura; task.drink = m.drink;
      task.sig = `ABS/${new Date().getFullYear()}/${String(m.seed % 90000 + 10000)}`;
      const unit = pick(A.UNITS.filter(u => u.sec > 0.01 && u.sec < 3600 && u.sec !== 60 && u.sec !== 1));
      const v = task.min * 60 / unit.sec;
      $('.process h2', ovl).textContent = 'Decyzja administracyjna';
      steps.hidden = true;
      cert.hidden = false;
      cert.innerHTML = `
        <div class="cert-head">DECYZJA nr ${esc(task.sig)}<small>${new Date().toLocaleString('pl-PL')}</small></div>
        <p>Po rozpatrzeniu wniosku o przydział czasu Ministerstwo postanawia <b>przyznać</b>:</p>
        <div class="cert-big">${task.min} ${plural(task.min, 'minutę', 'minuty', 'minut')}</div>
        <div class="cert-eq">czyli ${qty(v, unit.forms)}</div>
        <table>
          <tr><th>Zadanie</th><td>${esc(task.name)}</td></tr>
          <tr><th>Powód</th><td>${esc(task.reason)}</td></tr>
          <tr><th>Patron zadania</th><td>${esc(m.patron.name)} <small>– ${esc(m.patron.role)}</small></td></tr>
          <tr><th>Szansa powodzenia</th><td>${fmt(m.success, 1)}% <small>(margines błędu: tak)</small></td></tr>
          <tr><th>Poziom absurdu</th><td>${task.level}/5 – ${esc(A.LEVELS[task.level - 1].name)}</td></tr>
          <tr><th>Przerwa po zadaniu</th><td>${task.brk ? task.brk + ' min' : 'brak (z własnej woli)'}</td></tr>
        </table>
        <div class="stamp big">ZATWIERDZONO</div>
        <div class="cert-btns">
          <button type="button" class="btn big primary" id="cert-start">▶ Start! Czas rusza</button>
          <button type="button" class="btn" id="cert-back">Wycofaj wniosek</button>
        </div>`;
      A.audio.sfx.stamp();
      const startBtn = $('#cert-start');
      startBtn.focus();
      startBtn.addEventListener('click', () => { ovl.hidden = true; onStart(task); });
      $('#cert-back').addEventListener('click', () => {
        ovl.hidden = true; A.audio.sfx.sad();
        A.ui.toast('WNIOSEK WYCOFANY', 'Odnotowano w aktach. Pan Kazimierz westchnął.');
        onBack && onBack();
      });
    }
    next();
    return () => { cancelled = true; };
  }

  /* ---------- Inicjalizacja ---------- */

  function init() {
    $('#form-no').textContent = 'Nr ' + String(randInt(100000, 999999));
    A.PRESETS.forEach(p => {
      const b = el('button', 'preset', `<b>${esc(p.label)}</b><small>${esc(p.sub)}</small>`);
      b.type = 'button'; b.dataset.min = p.min;
      b.addEventListener('click', () => { minIn.value = p.min; A.audio.sfx.click(); renderConvert(); renderAnalysis(); });
      $('#presets').appendChild(b);
    });
    A.REASONS.forEach(r => reasonIn.appendChild(new Option(r, r)));
    reasonIn.selectedIndex = randInt(0, A.REASONS.length - 1);
    const last = store.get('lastForm', null);
    if (last) { minIn.value = last.min || 25; levelIn.value = last.level || 4; breakIn.value = last.brk != null ? last.brk : 5; }
    minIn.addEventListener('input', () => { renderConvert(); renderAnalysis(); });
    levelIn.addEventListener('input', renderLevel);
    nameIn.addEventListener('input', () => renderAnalysis());
    $('#cv-roll').addEventListener('click', () => { A.audio.sfx.pop(); rollConvert(); });
    rollConvert();
    renderLevel();
    renderAnalysis(true);

    $('#form').addEventListener('submit', e => {
      e.preventDefault();
      A.audio.ensure();
      const task = readTask();
      if (!task.name) return nudgeName();
      store.set('lastForm', { min: task.min, level: task.level, brk: task.brk });
      process(task, t => A.session.start(t));
    });
    nameIn.addEventListener('invalid', e => { e.preventDefault(); nudgeName(); });
    $('#b-queue').addEventListener('click', () => {
      A.audio.ensure();
      const task = readTask();
      if (!task.name) return nudgeName();
      A.app.addToQueue(task);
      nameIn.value = ''; lastAn = ''; renderAnalysis(true);
      A.audio.sfx.stamp();
      A.ui.toast('DODANO DO KOLEJKI', `„${task.name}” czeka w kolejce. Grzecznie, jak w urzędzie.`);
    });
  }

  function fill(task) {
    nameIn.value = task.name; minIn.value = task.min; levelIn.value = task.level; breakIn.value = task.brk;
    if ([...reasonIn.options].some(o => o.value === task.reason)) reasonIn.value = task.reason;
    renderConvert(); renderLevel(); renderAnalysis(true);
  }

  return { init, process, fill, metrics };
})();
