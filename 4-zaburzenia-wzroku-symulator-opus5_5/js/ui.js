/* ui.js – interfejs: lista zaburzeń, panel opisu z suwakami i schematem oka, pasek narzędzi, HUD, quiz. */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = (v, d) => v.toFixed(d).replace('.', ',');
  let A, S;
  let infoFor = null;          // dla jakiego zaburzenia zbudowano panel
  let diagramCv = null;
  let toastT = 0;

  function fmtDist(m) {
    if (!isFinite(m) || m > 900) return 'bardzo daleko';
    if (m < 1) return Math.round(m * 100) + ' cm';
    if (m < 10) return num(m, 1) + ' m';
    return Math.round(m) + ' m';
  }

  /* ---------------- lista zaburzeń ---------------- */
  function buildList() {
    const q = $('search').value.trim().toLowerCase();
    const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
    const nq = norm(q);
    const box = $('cond-list');
    box.innerHTML = '';
    let any = false;
    for (const cat of CATEGORIES) {
      const items = CONDITIONS.filter(c => c.cat === cat.id && (!nq || norm(c.name + ' ' + c.alt + ' ' + c.tagline).includes(nq)));
      if (!items.length) continue;
      any = true;
      const h = document.createElement('div');
      h.className = 'cat-title'; h.textContent = cat.name;
      box.appendChild(h);
      for (const c of items) {
        const b = document.createElement('button');
        b.className = 'cond'; b.dataset.id = c.id;
        b.innerHTML = `<span class="cond-ico">${c.icon}</span><span class="cond-name"><b>${esc(c.name)}</b><small>${esc(c.alt)}</small></span>${c.id !== 'healthy' ? '<span class="cond-check">✓</span>' : ''}`;
        b.addEventListener('click', () => { A.selectCondition(c.id); $('sidebar').classList.remove('open'); });
        box.appendChild(b);
      }
    }
    if (!any) box.innerHTML = '<div class="empty">Nic nie znaleziono. Spróbuj innego słowa.</div>';
    markList();
  }
  function markList() {
    document.querySelectorAll('.cond').forEach(b => {
      const id = b.dataset.id;
      const quiz = S.mode === 'quiz';   // w quizie lista nie może zdradzać odpowiedzi
      b.classList.toggle('sel', !quiz && id === S.selected);
      b.classList.toggle('active', !quiz && (S.active.includes(id) || (id === 'healthy' && !S.active.length)));
    });
    $('sidebar').classList.toggle('combine', S.combine);
    $('combine').checked = S.combine;
  }
  function visibleConditionIds() { return Array.from(document.querySelectorAll('.cond')).map(b => b.dataset.id); }

  /* ---------------- sceny ---------------- */
  function sceneButtons() {
    return A.SCENE_LIST.map(s => ({ id: s.id, name: s.name, icon: s.icon, desc: s.desc }))
      .concat([{ id: 'camera', name: 'Kamera', icon: '📷', desc: 'Twój obraz z kamery' }, { id: 'photo', name: 'Twoje zdjęcie', icon: '🖼️', desc: 'Wczytaj albo przeciągnij zdjęcie' }]);
  }
  const SHORT = { 'ulica-dzien': 'Ulica', 'ulica-noc': 'Noc', targ: 'Targ', gabinet: 'Gabinet', tablice: 'Tablice', camera: 'Kamera', photo: 'Zdjęcie' };
  function buildScenes() {
    const box = $('scenes');
    box.innerHTML = '';
    sceneButtons().forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'scene-btn'; b.dataset.id = s.id; b.title = (s.desc || s.name) + (i < 9 ? ` (${i + 1})` : '');
      b.innerHTML = `<span class="ico">${s.icon}</span><span class="lbl">${esc(SHORT[s.id] || s.name)}</span>`;
      b.addEventListener('click', () => A.setScene(s.id));
      box.appendChild(b);
    });
  }
  function markScenes() {
    const cur = S.source === 'scene' ? S.sceneId : S.source;
    document.querySelectorAll('.scene-btn').forEach(b => b.classList.toggle('on', b.dataset.id === cur));
  }

  /* ---------------- panel opisu ---------------- */
  function buildInfo() {
    const info = $('info');
    if (S.mode === 'quiz') { buildQuizInfo(); return; }
    const c = A.COND.get(S.selected) || A.COND.get('healthy');
    const st = A.paramsFor(c.id);
    const isActive = c.id === 'healthy' || S.active.includes(c.id);
    const I = c.info;
    const keepScroll = infoFor === c.id ? info.scrollTop : 0;
    infoFor = c.id;
    let h = `<div class="info-head"><div class="info-ico">${c.icon}</div><div><h2>${esc(c.name)}</h2><p class="alt">${esc(c.alt)}</p></div></div>
      <p class="tagline">${esc(c.tagline)}</p>`;
    if (I.warn) h += `<div class="warn">⚠️ ${esc(I.warn)}</div>`;
    if (c.params.length || c.correction) {
      h += '<div class="controls">';
      if (!isActive) h += `<p class="no-ctrl">To zaburzenie nie jest teraz włączone. <button class="btn" id="activate">Włącz</button></p>`;
      for (const d of c.params) {
        const v = st.params[d.k];
        if (d.type === 'range') {
          h += `<div class="ctrl"><div class="ctrl-top"><label for="p-${d.k}">${esc(d.label)}</label><output id="o-${d.k}">${esc(d.fmt(v))}</output></div>
            <input type="range" id="p-${d.k}" data-k="${d.k}" min="${d.min}" max="${d.max}" step="${d.step}" value="${v}"></div>`;
        } else {
          h += `<div class="ctrl"><div class="ctrl-top"><label>${esc(d.label)}</label></div><div class="seg" data-k="${d.k}">` +
            d.options.map(o => `<button data-v="${esc(o.v)}" class="${o.v === v ? 'on' : ''}">${esc(o.label)}</button>`).join('') + '</div></div>';
        }
      }
      if (c.correction) {
        h += `<button class="correct-btn ${st.corrected ? 'on' : ''}" id="corr"><span>👓</span><span>${esc(st.corrected ? c.correction.on : c.correction.label)}</span><span class="tg"></span></button>`;
      }
      h += '</div>';
    }
    h += `<div class="diagram"><canvas id="diagram"></canvas><div class="diagram-cap"><span>Schemat oka</span><span id="diag-cap"></span></div></div>`;
    const sug = (c.scenes || []).filter(id => A.SCENE_LIST.some(s => s.id === id));
    if (sug.length) {
      h += `<div class="sec"><h3><i>🎬</i>Najlepiej widać w scenach</h3><div class="scene-sug">` +
        sug.map(id => { const s = A.SCENE_LIST.find(x => x.id === id); return `<button data-scene="${id}" class="${S.source === 'scene' && S.sceneId === id ? 'on' : ''}">${s.icon} ${esc(s.name)}</button>`; }).join('') + '</div></div>';
    }
    h += sec('👁️', 'Jak widzi świat', I.sees);
    h += sec('🧬', 'Skąd się bierze', I.why);
    h += sec('👥', 'Kogo dotyczy', I.who);
    h += sec('💊', c.id === 'healthy' ? 'Jak dbać o wzrok' : 'Leczenie i korekcja', I.help);
    h += `<div class="sec fact"><h3>💡 Ciekawostka</h3><p>${esc(I.fact)}</p></div>`;
    h += `<div class="sec simnote"><h3><i>🧪</i>O tej symulacji</h3><p>${esc(I.sim)}</p></div>`;
    if (I.tryIt && I.tryIt.length) h += `<div class="sec"><h3><i>🎯</i>Spróbuj</h3><ul class="try">${I.tryIt.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
    h += platesHtml();
    info.innerHTML = h;
    info.scrollTop = keepScroll;

    info.querySelectorAll('input[type=range]').forEach(inp => {
      paintRange(inp);
      inp.addEventListener('input', () => {
        const k = inp.dataset.k, d = c.params.find(x => x.k === k);
        const v = parseFloat(inp.value);
        paintRange(inp);
        $('o-' + k).textContent = d.fmt(v);
        if (!S.active.includes(c.id) && c.id !== 'healthy') A.selectCondition(c.id);
        A.setParam(c.id, k, v);
      });
    });
    info.querySelectorAll('.seg').forEach(seg => {
      seg.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        if (!S.active.includes(c.id)) A.selectCondition(c.id);
        A.setParam(c.id, seg.dataset.k, b.dataset.v);
      });
    });
    const corr = $('corr');
    if (corr) corr.addEventListener('click', () => { if (!S.active.includes(c.id)) A.selectCondition(c.id); A.toggleCorrection(c.id); });
    const act = $('activate');
    if (act) act.addEventListener('click', () => A.selectCondition(c.id));
    info.querySelectorAll('[data-scene]').forEach(b => b.addEventListener('click', () => A.setScene(b.dataset.scene)));
    bindPlates();
    diagramCv = $('diagram');
  }
  function sec(icon, title, text) { return text ? `<div class="sec"><h3><i>${icon}</i>${esc(title)}</h3><p>${esc(text)}</p></div>` : ''; }
  function paintRange(inp) {
    const p = (inp.value - inp.min) / (inp.max - inp.min) * 100;
    inp.style.setProperty('--p', p + '%');
  }
  function platesHtml() {
    const sc = A.sceneMeta();
    if (S.source !== 'scene' || !sc.plates || !sc.plates.length) return '';
    return `<div class="sec"><h3><i>🔢</i>Klucz do tablic barwnych</h3><p style="color:var(--muted);font-size:13px">Najpierw spróbuj odczytać liczby, potem kliknij, żeby odsłonić odpowiedź.</p><div class="plates">` +
      sc.plates.map((p, i) => `<div class="plate"><b>Tablica ${i + 1}</b> · ${esc(p.type)}<br>Odpowiedź: <span class="ans">${esc(p.answer)}</span>${p.note ? `<br><small>${esc(p.note)}</small>` : ''}</div>`).join('') + '</div></div>';
  }
  function bindPlates() { document.querySelectorAll('.plate .ans').forEach(a => a.addEventListener('click', () => a.classList.toggle('show'))); }

  function refreshDynamic() { buildChips(); }

  /* ---------------- chipy aktywnych zaburzeń ---------------- */
  function buildChips() {
    const box = $('active-chips');
    box.innerHTML = '';
    if (S.mode === 'quiz') return;
    if (!S.active.length) {
      box.innerHTML = `<span class="chip chip-only">👁️ Zdrowe oko</span>`;
      return;
    }
    for (const id of S.active) {
      const c = A.COND.get(id), st = A.paramsFor(id);
      const main = c.params[0];
      const val = main && main.type === 'range' ? ' · ' + main.fmt(st.params[main.k]) : '';
      const el = document.createElement('span');
      el.className = 'chip' + (st.corrected ? ' corr' : '');
      el.innerHTML = `${c.icon} ${esc(c.name)}<span style="color:var(--muted);font-weight:500">${esc(val)}</span>${st.corrected ? ' <span style="color:var(--accent)">👓</span>' : ''}<button title="Wyłącz" aria-label="Wyłącz ${esc(c.name)}">×</button>`;
      el.querySelector('button').addEventListener('click', e => { e.stopPropagation(); A.removeCondition(id); });
      box.appendChild(el);
    }
  }

  /* ---------------- pasek narzędzi ---------------- */
  function refreshTools() {
    const sel = A.COND.get(S.selected);
    const corrBtn = $('t-correct');
    const canCorr = sel && sel.correction && S.active.includes(sel.id) && !(S.mode === 'quiz' && !Q.answered);
    corrBtn.disabled = !canCorr;
    const st = sel && A.paramsFor(sel.id);
    corrBtn.classList.toggle('on', !!(canCorr && st.corrected));
    corrBtn.querySelector('em').textContent = S.mode === 'quiz' && !Q.answered ? 'Korekcja' : (sel && sel.correction ? sel.correction.label : 'Brak korekcji');
    corrBtn.title = sel && sel.correction ? 'Korekcja lub leczenie (K)' : 'Tego zaburzenia nie da się skorygować okularami';
    $('t-compare').classList.toggle('on', S.compare);
    $('t-auto').classList.toggle('on', S.autoLook);
    const V = A.activeEntries();
    const hasDry = V.some(e => e.cond.id === 'dryeye');
    $('t-blink').hidden = !hasDry;
    const hasField = V.some(e => ['glaucoma', 'rp', 'hemianopia', 'amd', 'detachment', 'migraine'].includes(e.cond.id));
    $('t-field').hidden = !hasField;
    $('t-field').classList.toggle('on', S.fieldStyle > 0);
    $('t-field').querySelector('em').textContent = S.fieldStyle > 0 ? 'Ubytki: czarne' : 'Ubytki: realistyczne';
    $('split').hidden = !S.compare;
    const names = S.active.map(id => A.COND.get(id).name);
    $('split-r').textContent = S.mode === 'quiz' && !Q.answered ? 'Tajemnicze oko' : (names.length ? names.join(' + ') : 'Zdrowe oko');
    placeSplit();
    const src = S.source !== 'scene';
    $('source-bar').hidden = !src;
    $('src-change').hidden = S.source !== 'photo';
    document.querySelectorAll('.modes button').forEach(b => b.classList.toggle('on', b.dataset.mode === S.mode));
    document.body.classList.toggle('quiz-mode', S.mode === 'quiz');
  }
  function placeSplit() {
    const x = (S.split * 100) + '%';
    const sp = $('split');
    sp.querySelector('.split-line').style.left = x;
    sp.querySelector('.split-knob').style.left = x;
    sp.querySelector('.split-l').style.right = `calc(${100 - S.split * 100}% + 12px)`;
    sp.querySelector('.split-r').style.left = `calc(${x} + 12px)`;
  }

  /* odległość dla kamery i zdjęć: suwak logarytmiczny 0,25 m – 50 m */
  const distFromSlider = v => 0.25 * Math.pow(200, v / 100);
  const sliderFromDist = d => Math.log(d / 0.25) / Math.log(200) * 100;
  function syncSrcDist() {
    const inp = $('src-dist');
    inp.value = sliderFromDist(S.srcDist);
    paintRange(inp);
    $('src-dist-out').textContent = fmtDist(S.srcDist);
  }

  /* ---------------- HUD ---------------- */
  function updateHud(live, meta) {
    const tgt = live.target || {};
    $('h-target').textContent = tgt.name || (meta && meta.name) || '–';
    $('h-dist').textContent = tgt.dist ? fmtDist(tgt.dist) : '';
    const f = live.focus;
    let ft;
    if (f < -0.05) ft = 'dalej niż nieskończoność';
    else if (f < 0.02) ft = 'w dal (∞)';
    else ft = fmtDist(1 / f);
    const sharp = Math.abs(live.targetD - f) < 0.12;
    $('h-focus').textContent = ft + (sharp ? '' : ' ✕');
    $('h-focus').style.color = sharp ? '' : 'var(--amber)';
    const v = live.visus;
    $('h-visus').textContent = '≈ ' + (v >= 0.95 ? '1,0' : num(Math.max(0.02, v), v < 0.1 ? 2 : 1));
    $('h-visus').style.color = v > 0.7 ? '' : v > 0.3 ? 'var(--amber)' : 'var(--red)';
    const e = live.effort || 0;
    const bar = $('h-effort');
    bar.style.width = Math.round(e * 100) + '%';
    bar.style.backgroundPosition = '0 0';
  }

  /* ---------------- schemat oka ---------------- */
  function drawDiagram(live, t) {
    if (!diagramCv || !window.EyeDiagram || !diagramCv.isConnected) return;
    if (S.mode === 'quiz' && !Q.answered) return;
    const c = A.COND.get(S.selected) || A.COND.get('healthy');
    const st = A.paramsFor(c.id);
    const active = S.active.includes(c.id);
    const tdist = live.target && live.target.dist ? live.target.dist : Infinity;
    let d;
    try {
      d = c.diagram(st.params, active && st.corrected, { accom: active ? (live.accom || 0) : Math.min(live.targetD || 0, 10), targetDist: tdist, V: live.V });
      EyeDiagram.draw(diagramCv, d.type, d.p, t);
    } catch (e) { console.warn('Schemat', e); diagramCv = null; return; }
    const cap = $('diag-cap');
    if (cap && d.type === 'refraction') cap.textContent = 'patrzysz na: ' + fmtDist(tdist);
    else if (cap) cap.textContent = '';
  }

  /* ---------------- quiz ---------------- */
  const Q = { round: 0, total: 10, score: 0, order: [], options: [], answered: false, saved: null, picked: null };
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function startQuiz() {
    Q.saved = { active: S.active.slice(), selected: S.selected, combine: S.combine, store: JSON.parse(JSON.stringify(S.store)), source: S.source, sceneId: S.sceneId, compare: S.compare };
    const pool = CONDITIONS.filter(c => c.id !== 'healthy').map(c => c.id);
    Q.order = shuffle(pool.slice()).slice(0, Q.total);
    Q.round = 0; Q.score = 0;
    S.mode = 'quiz'; S.combine = false; S.compare = false;
    nextRound();
  }
  function nextRound() {
    const id = Q.order[Q.round];
    const c = A.COND.get(id);
    const st = A.paramsFor(id);
    for (const d of c.params) {
      if (d.type === 'range') {
        const x = d.def + (Math.random() * 0.45) * (d.max - d.def);
        st.params[d.k] = Math.round(x / d.step) * d.step;
      } else st.params[d.k] = d.def;
    }
    st.corrected = false;
    S.active = [id]; S.selected = id;
    const pool = CONDITIONS.filter(x => x.id !== 'healthy' && x.id !== id);
    const same = shuffle(pool.filter(x => x.cat === c.cat)).slice(0, 1);
    const rest = shuffle(pool.filter(x => !same.includes(x))).slice(0, 3 - same.length);
    Q.options = shuffle([c].concat(same, rest));
    Q.answered = false; Q.picked = null;
    A.resetFx();
    const scene = (c.scenes || []).find(s => A.SCENE_LIST.some(x => x.id === s)) || A.SCENE_LIST[0].id;
    if (S.source !== 'scene' || S.sceneId !== scene) A.setScene(scene); else refresh();
  }
  function answer(id) {
    if (Q.answered) return;
    Q.answered = true; Q.picked = id;
    if (id === Q.order[Q.round]) Q.score++;
    refresh();
  }
  function exitQuiz() {
    const sv = Q.saved;
    S.mode = 'sim';
    if (sv) {
      S.active = sv.active; S.selected = sv.selected; S.combine = sv.combine; S.store = sv.store; S.compare = sv.compare;
      if (sv.source === 'scene' && sv.sceneId !== S.sceneId) { A.setScene(sv.sceneId); return; }
    }
    refresh();
    A.saveHash();
  }
  function renderQuiz() {
    const box = $('quiz');
    if (S.mode !== 'quiz') { box.hidden = true; return; }
    box.hidden = false;
    if (Q.round >= Q.total) {
      const msg = Q.score >= 9 ? 'Mistrzostwo! Patrzysz jak okulista.' : Q.score >= 6 ? 'Bardzo dobrze! Masz oko do szczegółów.' : Q.score >= 3 ? 'Nieźle. Zajrzyj do opisów, wiele wad wygląda podobnie.' : 'Te zaburzenia naprawdę bywają do siebie podobne. Spróbuj jeszcze raz.';
      box.innerHTML = `<div class="quiz-top"><span>Quiz zakończony</span></div><div class="quiz-score">${Q.score} / ${Q.total}</div><p class="quiz-res">${msg}</p>
        <div class="quiz-actions"><button class="btn" id="q-exit">Wróć do symulatora</button><button class="btn primary" id="q-again">Zagraj jeszcze raz</button></div>`;
      $('q-exit').onclick = exitQuiz;
      $('q-again').onclick = () => { exitQuiz(); startQuiz(); };
      return;
    }
    const correct = Q.order[Q.round];
    const c = A.COND.get(correct);
    let h = `<div class="quiz-top"><span>Pytanie <b>${Q.round + 1}</b> z ${Q.total}</span><span>Wynik: <b>${Q.score}</b></span></div>
      <h3>Jak widzi ta osoba?</h3><div class="quiz-opts">`;
    for (const o of Q.options) {
      let cls = '';
      if (Q.answered) { if (o.id === correct) cls = 'ok'; else if (o.id === Q.picked) cls = 'bad'; }
      h += `<button data-id="${o.id}" class="${cls}" ${Q.answered ? 'disabled' : ''}>${o.icon} ${esc(o.name)}</button>`;
    }
    h += '</div>';
    if (Q.answered) {
      const ok = Q.picked === correct;
      h += `<p class="quiz-res">${ok ? '✅ <b>Dobrze!</b>' : '❌ <b>Nie tym razem.</b>'} To ${esc(c.name.toLowerCase())}: ${esc(c.tagline)}</p>
        <div class="quiz-actions"><button class="btn" id="q-exit">Zakończ</button><button class="btn primary" id="q-next">${Q.round + 1 < Q.total ? 'Następne pytanie' : 'Zobacz wynik'}</button></div>`;
    } else {
      h += `<div class="quiz-actions"><button class="btn" id="q-exit">Zakończ quiz</button></div>`;
    }
    box.innerHTML = h;
    box.querySelectorAll('.quiz-opts button').forEach(b => b.addEventListener('click', () => answer(b.dataset.id)));
    $('q-exit').onclick = exitQuiz;
    const nx = $('q-next');
    if (nx) nx.onclick = () => { Q.round++; if (Q.round < Q.total) nextRound(); else refresh(); };
  }
  function buildQuizInfo() {
    const info = $('info');
    infoFor = null;
    if (Q.answered && Q.round < Q.total) {
      const c = A.COND.get(Q.order[Q.round]);
      info.innerHTML = `<div class="info-head"><div class="info-ico">${c.icon}</div><div><h2>${esc(c.name)}</h2><p class="alt">${esc(c.alt)}</p></div></div>
        <p class="tagline">${esc(c.tagline)}</p>
        <div class="diagram"><canvas id="diagram"></canvas><div class="diagram-cap"><span>Schemat oka</span><span id="diag-cap"></span></div></div>` +
        sec('👁️', 'Jak widzi świat', c.info.sees) + sec('🧬', 'Skąd się bierze', c.info.why) +
        `<div class="sec fact"><h3>💡 Ciekawostka</h3><p>${esc(c.info.fact)}</p></div>`;
      diagramCv = $('diagram');
    } else {
      info.innerHTML = `<div class="info-head"><div class="info-ico">❓</div><div><h2>Quiz</h2><p class="alt">10 pytań, zgadnij zaburzenie</p></div></div>
        <p class="tagline">Patrzysz oczami osoby z jakimś zaburzeniem wzroku. Rozejrzyj się po scenie i zgadnij, co to jest.</p>
        <div class="sec"><h3><i>🔍</i>Podpowiedzi</h3><ul class="try">
          <li>Najedź na rzeczy bliskie i dalekie. Niektóre wady widać tylko z bliska albo tylko w dali.</li>
          <li>Ubytki pola widzenia idą za wzrokiem. Rusz kursorem i patrz, co znika.</li>
          <li>Przełącz scenę na nocną. Światła wiele zdradzają.</li>
          <li>Włącz „Porównaj”, żeby zobaczyć obok zdrowe oko.</li>
          <li>Kolory sprawdzisz na targu i na tablicach barwnych.</li>
        </ul></div>`;
      diagramCv = null;
    }
  }

  /* ---------------- okna ---------------- */
  function closeModals() { $('about').hidden = true; if (!$('intro').hidden) $('intro').hidden = true; if (S.mode === 'about') S.mode = 'sim'; refreshTools(); }
  function toast(msg, ms) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, ms || 3200);
  }
  function placeQuiz() {
    const q = $('quiz'), narrow = window.innerWidth <= 820;
    const want = narrow ? document.querySelector('.stage') : $('viewer');
    if (q.parentElement !== want) {
      if (narrow) want.insertBefore(q, document.querySelector('.toolbar'));
      else want.appendChild(q);
    }
  }

  /* ---------------- odświeżanie ---------------- */
  function refresh() {
    markList();
    markScenes();
    buildInfo();
    buildChips();
    refreshTools();
    renderQuiz();
  }

  function init(app) {
    A = app; S = app.S;
    buildList();
    buildScenes();
    $('search').addEventListener('input', buildList);
    $('combine').addEventListener('change', e => A.setCombine(e.target.checked));
    $('t-compare').addEventListener('click', () => A.setCompare(!S.compare));
    $('t-correct').addEventListener('click', () => A.toggleCorrection());
    $('t-blink').addEventListener('click', () => A.blink());
    $('t-auto').addEventListener('click', () => A.setAutoLook(!S.autoLook));
    $('t-field').addEventListener('click', () => A.setFieldStyle(S.fieldStyle > 0 ? 0 : 1));
    $('btn-fs').addEventListener('click', () => A.toggleFullscreen());
    $('btn-list').addEventListener('click', () => $('sidebar').classList.toggle('open'));
    $('brand').addEventListener('click', e => { e.preventDefault(); if (S.mode === 'quiz') exitQuiz(); A.selectCondition('healthy'); });
    $('src-dist').addEventListener('input', e => { const d = distFromSlider(+e.target.value); paintRange(e.target); $('src-dist-out').textContent = fmtDist(d); A.setSrcDist(d); });
    $('src-change').addEventListener('click', () => A.pickPhoto());
    document.querySelectorAll('.modes button').forEach(b => b.addEventListener('click', () => {
      const m = b.dataset.mode;
      if (m === 'about') { $('about').hidden = false; return; }
      if (m === 'quiz' && S.mode !== 'quiz') startQuiz();
      else if (m === 'sim' && S.mode === 'quiz') exitQuiz();
    }));
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModals));
    $('about').addEventListener('click', e => { if (e.target === $('about')) closeModals(); });
    document.addEventListener('click', e => {
      const sb = $('sidebar');
      if (sb.classList.contains('open') && !e.target.closest('#sidebar, #btn-list')) sb.classList.remove('open');
    });
    let seen = false;
    try { seen = localStorage.getItem('oczami-intro') === '1'; } catch (e) { /* brak dostępu */ }
    if (!seen && !location.hash) $('intro').hidden = false;
    $('intro-go').addEventListener('click', () => {
      $('intro').hidden = true;
      try { localStorage.setItem('oczami-intro', '1'); } catch (e) { /* brak dostępu */ }
    });
    syncSrcDist();
    placeQuiz();
    refresh();
  }

  function onSceneDrawn() {
    if (!A) return;
    markScenes();
    // klucz do tablic zależy od sceny
    if (S.mode === 'sim') buildInfo();
  }

  window.UI = {
    init, refresh, refreshDynamic, updateHud, drawDiagram, toast, onSceneDrawn, sceneButtons, visibleConditionIds,
    placeSplit, placeQuiz, closeModals, syncSrcDist
  };
})();
