'use strict';
/* =====================================================================
   Operator 112 – silnik gry wspólny dla wszystkich spraw.
   Sprawa (sprawy/<id>/) dostarcza dane (CLUES, QUESTIONS, EVENTS,
   BUILDINGS…), narzędzia (TOOLS), mapę, szkic i obiekt CASE z hookami.
   ===================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => String(s).toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const SET = { sound: true, pressure: true, fast: false };
const SET_KEY = 'pjz_settings_v1';
const endingsKey = () => CASE.id === 'zarowka' ? 'pjz_endings_v1' : 'pjz_endings_' + CASE.id;

let S = null;

function newState() {
  return {
    t: 0, battery: CASE.battery, health: CASE.health, stress: CASE.stress, bulb: CASE.bulb,
    clues: new Set(), clueOrder: [], flags: new Set(), asked: {}, fired: new Set(), pending: [],
    candidate: null, candidateRejected: {}, identity: false,
    contact: 'active', lostAt: null, lostReason: null,
    order: null, zrmSent: false, rescued: false, rescueT: null, escaped: false, escapeT: null,
    mistakes: [], goods: [], bubbles: 0, questions: 0, lastHer: '',
    warned: {}, idleReal: 0, idlePings: 0, busy: false, lockEvents: false, decision: null,
    phase: 'ring', over: false, defer: null,
    seenQ: new Set(), shownQ: new Set(), seenClues: new Set(), toolsUsed: {},
    msgSeq: 0, stampMin: -1, stampSec: 0, clueAnchor: {}, protoAt: {}, tips: {}, unread: 0,
    linkSel: [], linkTried: new Set(),
    ui: { qcat: 'stan', tab: 'poszlaki', selBuilding: null, layers: {}, mcol: 'center', notes: '',
          dispatch: { target: '', zrm: true, psp: false, sirens: false },
          results: [], radio: [], mf: { age: '', hair: '', period: '', city: '', kw: '' }, q: {} },
    ...CASE.state(),
  };
}

/* ---------- pomocnicze API dla danych ---------- */
function has(id) { return S.clues.has(id) || S.flags.has(id); }
function flag(id) { S.flags.add(id); }
function asked(id) { return id in S.asked; }
function dS(n) { S.stress = clamp(S.stress + n, 0, 100); }
function dH(n) { S.health = clamp(S.health + n, 0, 100); }
function dB(n) { S.battery = clamp(S.battery + n * (has('dim') ? 0.8 : 1), 0, 100); }
function mistake(t) { if (!S.mistakes.includes(t)) S.mistakes.push(t); }
function good(t) { if (!S.goods.includes(t)) S.goods.push(t); }
function clue(id) {
  if (!CLUES[id] || S.clues.has(id)) return;
  if (S.defer) { if (!S.defer.includes(id)) S.defer.push(id); return; }
  S.clues.add(id); S.clueOrder.push({ id, t: S.t });
  const last = [...$('#chat').children].reverse().find(e => e.id && !e.classList.contains('typing'));
  if (last) S.clueAnchor[id] = last.id;
  toast(`${CLUE_CATS[CLUES[id].cat].icon} ${CLUES[id].cat === 'wniosek' ? 'Wniosek' : 'Nowa poszlaka'}: <b>${esc(CLUES[id].title)}</b>`, CLUES[id].cat);
  sfx('clue');
  renderAll();
}
function flushDefer() { const d = S.defer || []; S.defer = null; d.forEach(clue); }

function fmtClock(t) {
  const m = CASE.start + Math.floor(t + 1e-6);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function fmtDur(t) { const s = Math.round(t * 60); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function streetName(id) { const s = STREETS.find(x => x.id === id); return s ? s.name : '?'; }
function policeOnStreet(id) {
  const o = S.order;
  if (!o || (o.status !== 'na_miejscu' && o.status !== 'wolny') || !o.onStreet) return false;
  return id ? o.onStreet === id : true;
}
/* co wiadomo o miejscu: 'confirmed', 'probable' albo null (ocenia sprawa) */
function addrLevel() { return CASE.addrLevel(); }
function hasEvidence() { return !!addrLevel(); }
function lightOk() { return S.bulb === 'on' || !!(CASE.altLight && CASE.altLight()); }

/* =====================================================================
   CZAT
   ===================================================================== */
/* znacznik czasu z sekundami: w obrębie minuty gry sekundy rosną z każdą wiadomością */
function stamp() {
  const m = Math.floor(S.t + 1e-6);
  if (m !== S.stampMin) { S.stampMin = m; S.stampSec = 2 + Math.floor(Math.random() * 6); }
  else S.stampSec = Math.min(59, S.stampSec + 2 + Math.floor(Math.random() * 5));
  return `${fmtClock(S.t)}:${String(S.stampSec).padStart(2, '0')}`;
}
const WHO = { her: 'ZGŁ', op: 'OP-03', sys: 'SYS', radio: 'RAD', pa: 'GŁOŚNIK' };
function addBubble(kind, text, extra) {
  const chat = $('#chat');
  const d = document.createElement('div');
  d.className = 'msg ' + kind;
  d.id = 'm' + (++S.msgSeq);
  const base = kind.split(' ')[0];
  const who = kind.includes('perp') ? '???' : kind.includes('mem') ? 'ZGŁ ✦' : base === 'radio' ? (extra || 'P 0-7') : WHO[base];
  const head = `<span class="mh"><span class="tm">${stamp()}</span><span class="who">${esc(who)}</span></span>`;
  if (kind === 'sys') d.innerHTML = `${head}<span class="sys-t">${esc(text)}</span>`;
  else d.innerHTML = `${head}<span class="b">${esc(text)}</span>`;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  if (base === 'her' || base === 'radio' || base === 'pa') {
    const c = $('.col-center'); c.classList.remove('ping'); void c.offsetWidth; c.classList.add('ping');
    if (window.innerWidth < 980 && S.ui.mcol !== 'center') { S.unread++; renderTabs(); }
  }
  return d;
}
function showTyping(on) {
  let t = $('#typing');
  if (on && !t) {
    t = document.createElement('div'); t.id = 'typing'; t.className = 'msg her typing';
    t.innerHTML = '<span class="mh"><span class="tm">··:··:··</span><span class="who">ZGŁ</span></span><span class="b">pisze<i></i></span>';
    $('#chat').appendChild(t); $('#chat').scrollTop = 1e9;
  } else if (!on && t) t.remove();
  $('#chat-status').textContent = on ? 'pisze…' : statusLine();
  $('#chat-status').classList.toggle('typing', on);
}
function typeDelay(txt) { return clamp(450 + txt.length * 26, 650, 2600) * (SET.fast ? 0.45 : 1); }

async function her(list) {
  for (const it of list) {
    if (S.contact !== 'active' || S.over) return false;
    const isMem = typeof it === 'object' && it.mem;
    const txt = typeof it === 'string' ? it : it.mem;
    showTyping(true); sfx('type');
    await wait(typeDelay(txt));
    showTyping(false);
    if (S.contact !== 'active') return false;
    const cost = 0.24 * (has('dim') ? 0.6 : 1);
    if (S.battery - cost <= 0) {
      S.battery = 0;
      addBubble('her', txt.slice(0, Math.max(3, Math.floor(txt.length * 0.4))) + '…');
      S.lastHer = txt;
      await loseContact('bateria');
      return false;
    }
    S.battery -= cost; S.bubbles++; S.lastHer = txt;
    addBubble(isMem ? 'her mem' : 'her', txt); sfx('in');
    renderStatus();
  }
  return true;
}
async function perpSays(list) {
  for (const t of list) {
    showTyping(true); await wait(typeDelay(t) * 1.4); showTyping(false);
    addBubble('her perp', t); sfx('in');
    await wait(500);
  }
}
/* komunikat z głośnika słyszany w tle rozmowy */
async function announce(text) { addBubble('pa', text); sfx('pa'); await wait(SET.fast ? 1000 : 2400); }
async function opSay(text) { addBubble('op', text); sfx('out'); await wait(350); }
async function sys(text) { addBubble('sys', text); sfx('sys'); await wait(SET.fast ? 250 : 550); }
async function radio(text, who) {
  addBubble('radio', text, who); sfx('radio');
  S.ui.radio.unshift({ t: S.t, who: who || 'Patrol 0-7', text });
  renderDispatch();
  await wait(SET.fast ? 600 : 1300);
}

function toast(html, cat) {
  const box = $('#toasts');
  const d = document.createElement('div');
  d.className = 'toast ' + (cat || '');
  d.innerHTML = html;
  box.appendChild(d);
  const all = box.querySelectorAll('.toast:not(.out)');
  if (all.length > 3) all[0].remove();
  setTimeout(() => d.classList.add('out'), 3600);
  setTimeout(() => d.remove(), 4200);
}
function shake() { document.body.classList.add('shake'); setTimeout(() => document.body.classList.remove('shake'), 1600); }

/* =====================================================================
   CZAS, ZDARZENIA
   ===================================================================== */
async function advance(mins) {
  let left = mins;
  while (left > 1e-4 && !S.over) {
    const dt = Math.min(1, left); left -= dt;
    S.t += dt; tick(dt);
    await processEvents();
  }
  renderAll();
}

function tick(dt) {
  if (S.contact !== 'lost' && S.battery > 0) {
    S.battery = Math.max(0, S.battery - (0.32 * (has('dim') ? 0.55 : 1) + (CASE.batteryDrain ? CASE.batteryDrain() : 0)) * dt);
    if (S.battery <= 0) S.pending.push(() => loseContact('bateria'));
    for (const th of [15, 10, 5]) {
      if (S.battery <= th && !S.warned[th] && !S.rescued && !S.escaped) {
        S.warned[th] = true;
        S.pending.push(async () => {
          await sys(`Telemetria: bateria urządzenia rozmówcy ${th}%.`);
          if (S.contact === 'active') await her([th === 5 ? 'zaraz mi padnie telefon. prosze. szybciej' : th === 10 ? 'telefon pokazuje 10%' : 'bateria się kończy. 15%']);
        });
      }
    }
  }
  if (!S.rescued && !S.escaped && S.contact !== 'lost') {
    const hd = CASE.healthDrain(dt);
    S.health = Math.max(0, S.health - hd * dt);
    if (S.health <= 0) S.pending.push(() => loseContact('omdlenie'));
    S.stress = clamp(S.stress + (S.stress > 60 ? -0.25 : 0.1) * dt, 0, 100);
  }
}

async function processEvents() {
  if (S.lockEvents || S.over) return;
  S.lockEvents = true;
  try {
    for (let guard = 0; guard < 10 && !S.over; guard++) {
      let fired = false;
      while (S.pending.length && !S.over) { const fn = S.pending.shift(); await fn(); fired = true; }
      if (S.order && S.order.status === 'jedzie' && S.t >= S.order.eta && !S.rescued) { await arrive(); fired = true; }
      for (const ev of EVENTS) {
        if (S.over) break;
        if (S.fired.has(ev.id)) continue;
        let ok = false;
        try { ok = ev.when(); } catch (e) { ok = false; }
        if (!ok) continue;
        if (!CASE.anyContact.includes(ev.id)) {
          if (S.contact === 'paused') continue;
          if (S.contact === 'lost' || S.rescued || S.escaped) { S.fired.add(ev.id); continue; }
        }
        S.fired.add(ev.id);
        await ev.run();
        fired = true;
        renderAll();
      }
      if (!fired) break;
    }
  } finally { S.lockEvents = false; }
}

async function pauseContact(mins) {
  S.contact = 'paused'; renderAll();
  await sys('Rozmówczyni ukryła telefon. Nie wysyłaj teraz wiadomości.');
  await wait(SET.fast ? 600 : 1600);
  await advance(mins);
  if (S.contact === 'paused') S.contact = 'active';
  renderAll();
}

async function loseContact(reason) {
  if (S.contact === 'lost') return;
  S.contact = 'lost'; S.lostAt = S.t; S.lostReason = reason;
  showTyping(false); sfx('lost');
  const txt = {
    bateria: 'Urządzenie rozmówcy niedostępne: rozładowana bateria.',
    omdlenie: 'Rozmówczyni od kilku minut nie odpowiada. Telefon nadal jest zalogowany w sieci.',
    sprawca: 'Kanał zamknięty po stronie rozmówcy. Urządzenie wyłączone.',
  }[reason];
  await sys('■ KONTAKT UTRACONY. ' + txt);
  if (!S.rescued && !S.escaped) await sys('Nadal możesz korzystać z baz i mapy oraz dysponować służby. Liczy się każda minuta.');
  renderAll();
}

/* =====================================================================
   DECYZJE
   ===================================================================== */
function decide(cfg) {
  return new Promise(resolve => {
    S.decision = cfg;
    const box = $('#decision');
    const opts = cfg.options.filter(o => !o.show || o.show());
    let timer = cfg.timer ? cfg.timer * (SET.pressure ? 1 : 2) : null;
    box.className = 'decision ' + (timer ? 'alarm' : 'choice');
    box.innerHTML = `<div class="d-head"><span class="d-tag">${timer ? '!! ALARM · DECYZJA OPERATORA' : 'WYBÓR OPERATORA'}</span>${timer ? `<span class="d-count">${timer.toFixed(1)}</span>` : ''}</div>
      <b class="d-title">${esc(cfg.title)}</b>
      <p>${esc(cfg.text || '')}</p>
      <div class="d-opts">${opts.map((o, i) => `<button class="d-opt" data-i="${i}"><span class="k">${i + 1}</span>${esc(o.label)}</button>`).join('')}</div>
      ${timer ? '<div class="d-timer"><i></i></div>' : ''}`;
    box.hidden = false;
    $('#composer').classList.add('deciding');
    if (timer) { sfx('alarm'); document.body.classList.add('deciding'); }
    // na telefonie decyzja musi być widoczna, nawet jeśli gracz jest w narzędziach
    if (S.ui.mcol !== 'center') { S.ui.mcol = 'center'; renderTabs(); }
    let done = false, iv = null;
    let last = performance.now(), elapsed = 0; // przy karcie w tle odliczanie stoi
    const finish = async (fn) => {
      if (done) return; done = true;
      clearInterval(iv); box.hidden = true; $('#composer').classList.remove('deciding'); document.body.classList.remove('deciding');
      S.decision = null; S.idleReal = 0;
      try { await fn(); } catch (e) { console.error(e); }
      renderAll(); resolve();
    };
    box.querySelectorAll('.d-opt').forEach(b => b.addEventListener('click', () => finish(() => opts[+b.dataset.i].run())));
    S.decision.key = n => { if (opts[n - 1]) finish(() => opts[n - 1].run()); };
    if (timer) {
      const bar = box.querySelector('.d-timer i'), cnt = box.querySelector('.d-count');
      let lastS = Math.ceil(timer);
      iv = setInterval(() => {
        const now = performance.now(); if (!document.hidden) elapsed += now - last; last = now;
        const k = 1 - elapsed / (timer * 1000);
        bar.style.width = Math.max(0, k * 100) + '%';
        cnt.textContent = Math.max(0, k * timer).toFixed(1);
        const s = Math.ceil(k * timer);
        if (s < lastS) { lastS = s; if (s <= 5 && s > 0) sfx('tick'); }
        if (k < 0.35) { bar.classList.add('low'); box.classList.add('low'); }
        if (k <= 0) finish(() => cfg.onTimeout ? cfg.onTimeout() : null);
      }, 100);
    }
    renderQuestions();
  });
}

/* =====================================================================
   AKCJE GRACZA
   ===================================================================== */
function markShown() { S.shownQ.forEach(id => S.seenQ.add(id)); S.shownQ.clear(); }
async function act(fn, auto) {
  if (!S || S.busy || S.over || S.decision) return;
  S.busy = true;
  if (!auto) { S.idleReal = 0; markShown(); }
  renderAll();
  try { await fn(); } catch (e) { console.error(e); }
  S.busy = false;
  renderAll();
  checkAutoEnd();
}

function availableQs() {
  return QUESTIONS.filter(q => {
    let a = true;
    try { a = q.avail ? !!q.avail() : true; } catch (e) { a = false; }
    if (!a) return false;
    if (q.id in S.asked) return q.repeat ? S.t - S.asked[q.id] >= q.repeat : false;
    return true;
  });
}

function ask(q) {
  act(async () => {
    if (S.contact !== 'active') return;
    const text = typeof q.text === 'function' ? q.text() : q.text;
    await opSay(text);
    S.questions++;
    if (S.questions >= 3) $('#hint').hidden = true;
    let msgs = [], consumed = true, tip = null;
    S.defer = [];
    if (S.stress >= 90 && !q.calm && Math.random() < 0.45) {
      msgs = [pick(PANIC)]; consumed = false; dS(-3);
      tip = ['panika', 'Panika: pytanie przepadło. Najpierw ją uspokój (opcje oznaczone „uspokaja”), potem pytaj dalej.'];
    } else if (q.memory && S.stress >= 85) {
      msgs = [pick(BLANK)]; consumed = false;
      tip = ['blank', 'Przy tak silnym strachu wspomnienia się blokują. Uspokój ją i zapytaj jeszcze raz.'];
    } else if (q.light && !lightOk()) {
      msgs = [pick(DARK)]; consumed = false;
    } else {
      if (q.light && S.bulb !== 'on') msgs.push(CASE.altLightMsg);
      msgs = msgs.concat(q.run() || []);
    }
    if (consumed) S.asked[q.id] = S.t;
    await her(msgs);
    flushDefer();
    if (tip && (S.tips[tip[0]] || 0) < 2 && S.contact === 'active') { S.tips[tip[0]] = (S.tips[tip[0]] || 0) + 1; await sys(tip[1]); }
    if (consumed && q.after && S.contact === 'active') await q.after();
    await advance(consumed ? (q.cost || 1) : 0.5);
  });
}

/* ---------- start rozmowy ---------- */
function answerCall() {
  act(async () => {
    S.phase = 'call';
    AUDIO.ambience();
    renderAll();
    await sys(`Połączenie 112 przyjęte · ${CASE.phone} · ${fmtClock(0)}`);
    await CASE.opening();
    await advance(1);
    $('#hint').hidden = false;
  });
}

/* =====================================================================
   NARZĘDZIA (BAZY)
   ===================================================================== */
/* TOOLS definiuje sprawa (sprawy/<id>/story.js) */
function useTool(id) {
  const tool = TOOLS.find(t => t.id === id);
  if (!tool) return;
  act(async () => {
    await sys(`▸ ZAPYTANIE · ${tool.name}`);
    S.toolsUsed[id] = true;
    await toolProgress(tool);
    S.defer = [];
    const res = await tool.run();
    flushDefer();
    addResult(tool.name, res);
    await sys(`◂ WYNIK · ${tool.name} → zakładka „Bazy”`);
    await advance(tool.cost);
  });
}
async function toolProgress(tool) {
  const p = $('#tool-progress');
  p.hidden = false; p.querySelector('span').textContent = `${tool.name}… (${tool.cost} min)`;
  const bar = p.querySelector('i'); bar.style.transition = 'none'; bar.style.width = '0%';
  await wait(30); bar.style.transition = `width ${SET.fast ? 0.6 : 1.4}s linear`; bar.style.width = '100%';
  await wait(SET.fast ? 650 : 1450);
  p.hidden = true;
}
function addResult(title, text) {
  S.ui.results.unshift({ t: S.t, title, text });
  renderTools();
  // nowy wynik jest pod listą narzędzi: pokaż go od razu
  const r = $('#results .res'); if (r && S.ui.tab === 'bazy') { r.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); r.classList.add('fresh'); }
}

function toolSearch(id, q) {
  const tool = TOOLS.find(t => t.id === id), n = norm(q);
  if (!tool || !n) return;
  act(async () => {
    await sys(`▸ ZAPYTANIE · ${tool.name}: „${q}”.`);
    await toolProgress(tool);
    // dopasowanie odporne na odmianę i literówki na końcu: „Wróbla”, „M. Wróbel”, „wrobel marek”
    const toks = n.split(' ');
    const pm = (a, b) => a.length >= 4 && a.slice(0, 4) === b.slice(0, 4) && Math.abs(a.length - b.length) <= 3;
    let hit = null, best = 0;
    for (const r of tool.registry()) for (const k of r.keys) {
      const kt = k.split(' ');
      if (kt.every(x => toks.some(t => pm(t, x))) && kt.length > best) { hit = r; best = kt.length; }
    }
    let text;
    if (hit) {
      text = typeof hit.text === 'function' ? hit.text() : hit.text;
      S.defer = [];
      if (hit.clue) [].concat(hit.clue).forEach(clue);
      if (hit.flag) flag(hit.flag);
      flushDefer();
    } else text = tool.miss(q, n);
    addResult(`${tool.short || tool.name}: ${q}`, text);
    await advance(tool.cost);
  });
}
function ewidSearch(q) { toolSearch('ewid', q); }

function missingResults() {
  const f = S.ui.mf, [dd, mm, yy] = CASE.date.split('.'), now = new Date(`${yy}-${mm}-${dd}T00:00:00`);
  now.setMinutes(CASE.start);
  return MISSING.filter(m => {
    if (f.age === 'u18' && !(m.age < 18)) return false;
    if (f.age === '18' && !(m.age >= 18 && m.age <= 25)) return false;
    if (f.age === '26' && !(m.age >= 26 && m.age <= 40)) return false;
    if (f.age === '41' && !(m.age > 40)) return false;
    if (f.hair === 'rude' && !m.hair.startsWith('rude')) return false;
    if (f.hair === 'blond' && !m.hair.includes('blond')) return false;
    if (f.hair === 'ciemne' && m.hair !== 'ciemne') return false;
    if (f.hair === 'siwe' && m.hair !== 'siwe') return false;
    if (f.city && m.city !== f.city) return false;
    if (f.period) {
      const days = (now - new Date(m.since + 'T12:00:00')) / 864e5;
      if (days > +f.period) return false;
    }
    if (f.kw) {
      const hay = norm([m.name, m.features, m.clothes, m.notes, 'oczy ' + m.eyes, 'wlosy ' + m.hair].join(' '));
      const words = norm(f.kw).split(' ').filter(w => w.length > 2);
      const stem = w => w.length >= 4 ? w.slice(0, Math.max(3, w.length - 2)) : w; // łapa / łapy / łapka
      if (!words.every(w => hay.includes(stem(w)))) return false;
    }
    return true;
  }).sort((a, b) => a.name.split(' ').pop().localeCompare(b.name.split(' ').pop(), 'pl'));
}
function setCandidate(id) {
  act(async () => {
    const m = MISSING.find(x => x.id === id);
    S.candidate = m;
    await CASE.onCandidate(m);
  });
}

/* ---------- łączenie poszlak ---------- */
function findLink(x, y) {
  return LINKS.find(l => (l.a === x && l.b.includes(y)) || (l.a === y && l.b.includes(x)));
}
function toggleLinkSel(id) {
  const s = S.linkSel;
  if (s.includes(id)) s.splice(s.indexOf(id), 1);
  else { s.push(id); if (s.length > 2) s.shift(); }
  renderClues();
}
function connectClues() {
  const [x, y] = S.linkSel;
  if (!x || !y) return;
  const key = [x, y].sort().join('+');
  const l = findLink(x, y);
  S.linkSel = [];
  if (l && !S.clues.has(l.out)) {
    sfx('link');
    clue(l.out);
    good('Wniosek: ' + CLUES[l.out].title);
  } else if (l) {
    toast(`∴ Ten wniosek już masz: <b>${esc(CLUES[l.out].title)}</b>`, 'wniosek');
  } else {
    S.linkTried.add(key);
    toast(`Nie widzisz związku między „${esc(CLUES[x].title)}” a „${esc(CLUES[y].title)}”.`, 'nolink');
  }
  renderAll();
}

/* =====================================================================
   DYSPONOWANIE SŁUŻB
   ===================================================================== */
function parseTarget(v) {
  if (!v) return null;
  const [k, id] = v.split(':');
  if (k === 'b') { const b = BUILDINGS.find(x => x.id === id); return { target: id, street: b.street, mode: 'adres', label: b.addr }; }
  return { target: null, street: id, mode: 'rekon', label: 'rekonesans: ' + streetName(id) };
}

function doDispatch() {
  const d = S.ui.dispatch;
  const tg = parseTarget(d.target);
  if (!tg || S.rescued || S.escaped) return;
  act(async () => {
    const prev = S.order;
    const HQ = CASE.hq, from = prev ? (policePos() || HQ) : HQ;
    const tp = targetPoint(tg);
    let eta;
    if (prev && prev.status !== 'jedzie' && prev.onStreet && prev.onStreet === tg.street) eta = 1;
    else if (prev) eta = 1.5 + Math.hypot(tp[0] - from[0], tp[1] - from[1]) / (CASE.etaScale || 130);
    else eta = CASE.etaFirst + Math.hypot(tp[0] - HQ[0], tp[1] - HQ[1]) / (CASE.etaScale || 130);
    if (d.sirens) eta *= 0.8;
    eta = Math.max(1, Math.round(eta * 2) / 2);
    S.order = { ...tg, zrm: d.zrm, psp: d.psp, sirens: d.sirens, start: S.t, eta: S.t + eta, from, status: 'jedzie', onStreet: null,
      blind: tg.target === CASE.target && !hasEvidence() };
    if (d.zrm) S.zrmSent = true;
    if (CASE.onDispatch) CASE.onDispatch(S.order);
    const units = ['Policja (patrol 0-7)'].concat(d.zrm ? ['ZRM K-03'] : [], d.psp ? ['PSP JRG-1'] : []).join(', ');
    await sys(`▸ DYSPOZYCJA · ${units} → ${tg.label}${d.sirens ? ', na sygnałach' : ', bez sygnałów'}.`);
    await radio(`Patrol 0-7, przyjąłem. ${tg.mode === 'rekon' ? 'Jedziemy na ' + streetName(tg.street) + ', obserwujemy.' : 'Jedziemy na ' + tg.label + '.'} Dojazd ok. ${String(eta).replace('.', ',')} min.`);
    S.ui.tab = 'sluzby';
    await advance(0.5);
  });
}

async function arrive() {
  const o = S.order;
  o.status = 'na_miejscu';
  if (o.mode === 'rekon') {
    o.onStreet = o.street;
    S.defer = [];
    const rep = RECON[o.street] ? RECON[o.street]() : 'Nic podejrzanego. Czekamy na dyspozycje.';
    await radio(rep);
    flushDefer();
    if (CASE.onRecon) await CASE.onRecon(o.street);
    return;
  }
  o.onStreet = o.street;
  const b = BUILDINGS.find(x => x.id === o.target);
  if (await CASE.arrive(b)) return;
  await radio(typeof b.report === 'function' ? b.report() : b.report);
  if (b.clue) clue(b.clue);
  if (!b.noMistake) mistake(`Patrol pod błędnym adresem: ${b.addr}`);
  o.status = 'wolny';
  await radio('Patrol 0-7 wolny, czekam na dyspozycje.');
}

/* =====================================================================
   KONIEC
   ===================================================================== */
function checkAutoEnd() {
  if (!S || S.over) return;
  if (S.contact === 'lost' && !S.rescued && !S.escaped && S.t >= S.lostAt + 30 && !(S.order && S.order.status === 'jedzie')) finish();
}

function scoreOf(code) {
  let p = 0;
  const saved = S.rescued || S.escaped;
  if (S.rescued && !S.escaped) p += 35;
  if (S.escaped) p += 25;
  if (saved) p += clamp(22 - Math.max(0, S.rescueT - CASE.parTime) * 0.6, 0, 22);
  p += CASE.scoreExtra();
  if (S.zrmSent) p += 3;
  if (has('dim')) p += 2;
  const loc = Object.keys(CLUES).length;
  p += (S.clues.size / loc) * 8;
  p -= S.mistakes.length * 6;
  if (!saved) p = Math.min(p, 22);
  return Math.round(clamp(p, 0, 100));
}
function gradeOf(p) {
  if (p >= 88) return ['S', 'Operator, o którym się opowiada na szkoleniach'];
  if (p >= 74) return ['A', 'Spokój, metoda, refleks'];
  if (p >= 58) return ['B', 'Dobra robota, ale było blisko'];
  if (p >= 42) return ['C', 'Udało się, choć częściowo szczęściem'];
  if (p >= 24) return ['D', 'Zabrakło czasu i pomysłów'];
  return ['F', 'Ta noc zostanie z tobą na długo'];
}

function finish() {
  if (S.over) return;
  S.over = true; S.busy = false;
  if (!S.order && !S.escaped) mistake('Nie zadysponowano policji');
  if (CASE.finalMistakes) CASE.finalMistakes();
  const code = CASE.endingCode(), E = ENDINGS[code];
  let got = [];
  try { got = JSON.parse(localStorage.getItem(endingsKey()) || '[]'); } catch (e) { }
  if (!got.includes(code)) got.push(code);
  try { localStorage.setItem(endingsKey(), JSON.stringify(got)); } catch (e) { }
  const pts = scoreOf(code), [g, gl] = gradeOf(pts);
  const total = Object.keys(CLUES).length;
  // „Co umknęło”: najpierw to, czego zabrakło do celu, pomijając cele już osiągnięte (kolejność ustala sprawa)
  const prio = c => CASE.missedPrio(c);
  const missed = Object.keys(CLUES).filter(id => CLUES[id].hint && !S.clues.has(id) && prio(CLUES[id].cat) < 9)
    .sort((a, b) => prio(CLUES[a].cat) - prio(CLUES[b].cat)).slice(0, 4);
  const saveT = (S.rescued || S.escaped) ? fmtDur(S.rescueT) : '—';
  const chrono = [{ t: 0, l: 'Przyjęcie zgłoszenia, kanał tekstowy' }]
    .concat(S.clueOrder.filter(c => CASE.chronoCats.includes(CLUES[c.id].cat)).map(c => ({ t: c.t, l: CLUES[c.id].title })))
    .concat(S.lostAt != null ? [{ t: S.lostAt, l: 'Utrata kontaktu z rozmówczynią', bad: true }] : [])
    .concat(S.rescueT != null ? [{ t: S.rescueT, l: S.escaped ? 'Rozmówczyni wydostała się sama' : 'Poszkodowana odnaleziona', ok: true }] : [])
    .concat(CASE.chronoExtra ? CASE.chronoExtra() : [])
    .sort((a, b) => a.t - b.t);
  const closed = E.tone !== 'bad';
  sfx(E.tone === 'bad' ? 'bad' : 'win');
  $('#ending-inner').innerHTML = `
    <div class="end-top ${E.tone}">
      <div class="end-kicker">Karta zdarzenia nr ${CASE.incident} · CPR Kalnów · stanowisko 03</div>
      <h1>${esc(E.title)}</h1>
      <div class="end-sub">${esc(E.sub)}</div>
      <div class="stamp ${closed ? 'ok' : 'open'}">${closed ? 'ZAMKNIĘTE<small>' + fmtClock(S.t) + '</small>' : 'OTWARTE<small>przekazano KPP</small>'}</div>
    </div>
    <div class="end-body">
      <div class="end-story">${CASE.epilogue(code)}</div>
      <aside class="end-side">
        <div class="grade g-${g}"><small>Ocena pracy operatora</small><b>${g}</b><span>${pts} / 100</span><em>${esc(gl)}</em></div>
        <dl class="stats">
          <dt>Czas do uratowania</dt><dd>${saveT}</dd>
          <dt>Czas zgłoszenia</dt><dd>${fmtDur(S.t)}</dd>
          <dt>Twoje wiadomości</dt><dd>${S.questions}</dd>
          <dt>Jej wiadomości</dt><dd>${S.bubbles}</dd>
          <dt>Poszlaki</dt><dd>${S.clues.size} / ${total}</dd>
          <dt>Bateria na końcu</dt><dd>${Math.round(S.battery)}%</dd>
          ${CASE.stats().map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}
        </dl>
      </aside>
    </div>
    <div class="end-cols">
      <section><h3>Dobre decyzje</h3>${S.goods.length ? '<ul>' + S.goods.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : '<p class="muted">Brak.</p>'}</section>
      <section><h3>Błędy</h3>${S.mistakes.length ? '<ul class="bad">' + S.mistakes.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : (S.rescued || S.escaped ? '<p class="muted">Ani jednego. Szacunek.</p>' : '<p class="muted">Nie popełniłeś wyraźnego błędu, ale zabrakło czasu. Zobacz „Co umknęło”.</p>')}</section>
      <section><h3>${E.tone === 'good' ? 'Inne tropy' : 'Co umknęło'}</h3>${missed.length ? '<ul class="hint">' + missed.map(id => `<li>${esc(CLUES[id].hint)}</li>`).join('') + '</ul>' : '<p class="muted">Wszystkie kluczowe poszlaki znalezione.</p>'}</section>
    </div>
    <div class="end-chrono"><h3>Chronologia zgłoszenia</h3><ol>${chrono.map(c => `<li class="${c.ok ? 'ok' : c.bad ? 'bad' : ''}"><time>${fmtClock(c.t)}</time><span>${esc(c.l)}</span></li>`).join('')}</ol></div>
    <div class="end-collection"><h3>Zakończenia (${got.length}/${Object.keys(ENDINGS).length})</h3><div class="endings-row">
      ${Object.keys(ENDINGS).map(k => `<div class="end-slot ${got.includes(k) ? 'got ' + ENDINGS[k].tone : ''} ${k === code ? 'now' : ''}"><b>${got.includes(k) ? esc(ENDINGS[k].title) : '???'}</b><span>${got.includes(k) ? esc(ENDINGS[k].sub) : 'nieodkryte'}</span></div>`).join('')}
    </div></div>
    <div class="end-actions"><button class="btn primary" id="btn-again">Nowy dyżur</button><button class="btn ghost" id="btn-title">Ekran tytułowy</button></div>`;
  $('#app').hidden = true; $('#ending').hidden = false; window.scrollTo(0, 0); $('#ending').scrollTop = 0;
  $('#btn-again').onclick = () => startGame();
  $('#btn-title').onclick = () => { $('#ending').hidden = true; $('#intro').hidden = false; renderIntro(); };
}

/* =====================================================================
   RENDER
   ===================================================================== */
function statusLine() {
  if (!S) return '';
  if (S.contact === 'lost') return 'kontakt utracony';
  if (S.contact === 'paused') return 'telefon ukryty';
  if (S.rescued || S.escaped) return 'bezpieczna';
  return 'kanał tekstowy 112 · aktywny';
}
function renderAll() {
  if (!S) return;
  renderStatus(); renderQuestions(); renderClues(); updateMap(); renderMapCard(); updateSketch();
  renderTools(); renderDispatch(); renderCard(); renderTabs();
}

function renderStatusBar() {
  const sb = $('#statusbar');
  if (!sb) return;
  const c = S.contact, o = S.order;
  const ch = S.phase === 'ring' ? '<b class="amb">● DZWONI</b>' : c === 'lost' ? '<b class="alr">■ UTRACONY</b>' : c === 'paused' ? '<b class="amb">‖ CISZA</b>' : (S.rescued || S.escaped) ? '<b class="ok">● ZAKOŃCZONY</b>' : '<b class="ok">● AKTYWNY</b>';
  const pat = !o ? 'W BAZIE' : o.status === 'jedzie' ? `JEDZIE · ETA ${Math.max(0, Math.ceil(o.eta - S.t))} MIN` : o.status === 'na_miejscu' ? 'NA MIEJSCU' : o.status === 'wolny' ? 'WOLNY' : 'ZAKOŃCZ.';
  const items = [
    `KANAŁ: SMS-112 ${ch}`,
    ...CASE.statusItems(),
    `P 0-7: <b class="${o && o.status === 'jedzie' ? 'amb' : ''}">${pat}</b>`,
    `ZRM K-03: <b>${S.zrmSent ? 'ZADYSP.' : 'W BAZIE'}</b>`,
    `<span class="rec">● REC</span>`,
    `STAN. 03 · SWD-PRM 4.2.1`,
  ];
  sb.innerHTML = items.map(x => `<span>${x}</span>`).join('');
  $('#tb-kwal').textContent = CASE.kwal();
}
function bar(id, v, cls) { const b = $(id); b.style.width = clamp(v, 0, 100) + '%'; b.className = cls || ''; }
function renderStatus() {
  $('#clock').textContent = fmtClock(S.t);
  if (S.busy) $('#clock-s').textContent = ':00';
  renderStatusBar();
  $('#clock-date').textContent = (CASE.start + S.t) >= 24 * 60 ? CASE.nextDate : CASE.date;
  $('#call-time').textContent = 'T+' + fmtDur(S.t);
  const bt = S.battery;
  $('#bat-val').textContent = Math.max(0, Math.round(bt)) + '%';
  bar('#bat-bar', bt * (100 / CASE.battery), bt <= 10 ? 'crit' : bt <= 18 ? 'warn' : '');
  $('#chat-bat').innerHTML = `<span>T+${fmtDur(S.t)}</span> · BAT ${String(Math.max(0, Math.round(bt))).padStart(2, '0')}%`;
  $('#chat-bat').classList.toggle('crit', bt <= 10);
  $('#chat-bat').classList.toggle('warn', bt <= 18 && bt > 10);
  const lb = $('#lowbat');
  lb.hidden = !(bt <= 15 && S.contact === 'active');
  lb.classList.toggle('crit', bt <= 8);
  lb.innerHTML = `▲ NISKI POZIOM BATERII<span class="xtra"> URZĄDZENIA ZGŁASZAJĄCEGO</span> · ${Math.max(0, Math.round(bt))}%${has('dim') ? '' : ' · ekran nieprzyciemniony'}`;
  const knownH = CASE.healthKnown();
  $('#hp-val').textContent = knownH ? (S.health >= 60 ? 'stabilny' : S.health >= 35 ? 'pogarsza się' : S.health > 0 ? 'ciężki' : 'brak kontaktu') : 'nieznany';
  bar('#hp-bar', knownH ? S.health : 0, S.health < 35 ? 'crit' : S.health < 60 ? 'warn' : '');
  $('#st-val').textContent = S.stress >= 90 ? 'panika' : S.stress >= 70 ? 'silny lęk' : S.stress >= 45 ? 'lęk' : 'względny spokój';
  bar('#st-bar', S.stress, S.stress >= 90 ? 'crit' : S.stress >= 70 ? 'warn' : 'calm');
  $('#sig').className = 'sig s' + (S.contact === 'lost' ? 0 : S.t > 40 ? 2 : 3);
  const name = CASE.callerName();
  $('#caller-name').textContent = name;
  $('#chat-title').textContent = name;
  $('#caller-num').textContent = CASE.callerNum();
  const al = addrLevel();
  $('#caller-loc').textContent = CASE.locText(al, candidates());
  $('#caller-loc').className = al ? 'loc-' + al : '';
  for (const [k, ok] of CASE.protocol()) if (ok && S.protoAt[k] == null) S.protoAt[k] = S.t;
  if (!$('#typing')) $('#chat-status').textContent = statusLine();
  $('#chat-bulb').className = 'bulb-ico ' + (S.bulb === 'on' ? 'on' : S.bulb === 'dead' ? 'dead' : 'off');
  document.body.classList.toggle('lost', S.contact === 'lost');
  document.body.classList.toggle('dark-bulb', S.bulb !== 'on');
}

function renderQuestions() {
  const tabs = $('#cat-tabs'), list = $('#qlist');
  const avail = availableQs();
  const ringing = S.phase === 'ring';
  $('#composer').classList.toggle('ringing', ringing);
  if (ringing) {
    tabs.innerHTML = '';
    list.innerHTML = `<div class="incoming"><span class="in-l">▶ POŁĄCZENIE PRZYCHODZĄCE</span><span>LINIA 112/03</span><span>ANI ${CASE.phone}</span><span>AML: oczekiwanie…</span></div>
      <button class="answer" id="btn-answer">ODBIERZ <kbd>SPACJA</kbd></button>`;
    $('#btn-answer').onclick = () => { $('#btn-answer').disabled = true; answerCall(); };
    return;
  }
  const lostBox = $('#lostbox');
  if (S.contact === 'lost' || S.phase === 'done') {
    lostBox.hidden = false;
    if (S.phase === 'done' || S.rescued || S.escaped) {
      lostBox.innerHTML = `<b>Poszkodowana bezpieczna.</b><p>Służby przejęły działania na miejscu. Możesz zamknąć zgłoszenie i zobaczyć raport.</p>
        <div class="lb-btns"><button class="btn primary" id="lb-end" ${S.busy || S.decision ? 'disabled' : ''}>Zamknij zgłoszenie i zobacz raport</button></div>`;
    } else {
      const enRoute = S.order && S.order.status === 'jedzie';
      const left = Math.max(0, Math.ceil(S.lostAt + 30 - S.t));
      lostBox.innerHTML = `<b>Kontakt utracony.</b><p>Ona już nie odpisze. Nadal możesz sprawdzać bazy, analizować mapę i dysponować służby.${enRoute ? '' : ` Bez wysłanego patrolu zgłoszenie zamknie się samo za ok. ${left} min.`}</p>
        <div class="lb-btns">${enRoute ? `<button class="btn primary" id="lb-wait">Czekaj na raport patrolu (${Math.max(1, Math.ceil(S.order.eta - S.t))} min)</button>` : '<button class="btn" id="lb-wait1">Czekaj 2 minuty</button>'}
        <button class="btn ghost" id="lb-end">Zamknij zgłoszenie</button></div>`;
    }
    const dis = S.busy || !!S.decision;
    lostBox.querySelectorAll('button').forEach(b => b.disabled = dis);
    const w = $('#lb-wait'); if (w) w.onclick = () => act(() => advance(Math.max(0.5, S.order.eta - S.t + 0.01)));
    const w1 = $('#lb-wait1'); if (w1) w1.onclick = () => act(() => advance(2));
    const e = $('#lb-end'); if (e) e.onclick = () => finish();
  } else lostBox.hidden = true;
  if (S.contact === 'lost' || S.phase === 'done') { tabs.innerHTML = ''; list.innerHTML = ''; $('#hint').hidden = true; return; }

  const counts = {};
  for (const c in Q_CATS) counts[c] = avail.filter(q => q.cat === c && !S.seenQ.has(q.id)).length;
  tabs.innerHTML = Object.keys(Q_CATS).map(c => `<button class="ct ${S.ui.qcat === c ? 'on' : ''}" data-c="${c}">${Q_CATS[c]}${counts[c] && S.ui.qcat !== c ? `<i>${counts[c]}</i>` : ''}</button>`).join('');
  tabs.querySelectorAll('.ct').forEach(b => b.onclick = () => { markShown(); S.ui.qcat = b.dataset.c; renderQuestions(); });
  // nowe pytania na górze; „nowe” znika dopiero po następnej akcji gracza albo zmianie kategorii
  const qs = avail.filter(q => q.cat === S.ui.qcat).sort((a, b) => S.seenQ.has(a.id) - S.seenQ.has(b.id));
  const disabled = S.busy || S.contact !== 'active' || !!S.decision;
  const o = S.order;
  const wait = o && o.status === 'jedzie' && S.contact === 'active'
    ? `<div class="waitrow"><span>▸ Patrol 0-7 w drodze · ETA ${Math.max(1, Math.ceil(o.eta - S.t))} min</span><button class="btn small" id="q-wait" ${disabled ? 'disabled' : ''}>Czekaj z nią 1 min</button></div>` : '';
  const panic = S.stress >= 90 && S.contact === 'active' ? '<div class="panicrow">● PANIKA · pytania bez znacznika „uspokaja” mogą przepaść. Najpierw ją uspokój.</div>' : '';
  list.innerHTML = wait + panic + (qs.length ? qs.map((q, i) => {
    const text = typeof q.text === 'function' ? q.text() : q.text;
    const tags = [];
    const blind = q.light && !lightOk();
    if (!S.seenQ.has(q.id)) tags.push('<em class="new">nowe</em>');
    if (q.light && S.bulb !== 'on') tags.push(`<em class="dark">${blind ? 'najpierw światło' : esc(CASE.altLightName)}</em>`);
    if (q.calm) tags.push('<em class="calm">uspokaja</em>');
    if (q.memory) tags.push('<em class="mem">wspomnienie</em>');
    return `<button class="q ${blind ? 'blind' : ''}" data-id="${q.id}" ${disabled || blind ? 'disabled' : ''}><kbd>${i < 9 ? i + 1 : ''}</kbd><span>${esc(text)}</span>${tags.join('')}</button>`;
  }).join('') : '<div class="qempty">W tej kategorii nie ma teraz nic do zapytania. Nowe pytania pojawiają się razem z nowymi informacjami.</div>');
  list.querySelectorAll('.q').forEach(b => b.onclick = () => { const q = QUESTIONS.find(x => x.id === b.dataset.id); ask(q); });
  const qw = $('#q-wait'); if (qw) qw.onclick = () => act(() => advance(1));
  if (!S.decision) qs.forEach(q => S.shownQ.add(q.id));
  $('#composer').classList.toggle('paused', S.contact === 'paused');
}

function renderClues() {
  const box = $('#clues'), bar = $('#linkbar');
  if (!S.clues.size) { box.innerHTML = '<p class="muted pad">Na razie nic. Poszlaki pojawią się tu, gdy ona coś opisze albo gdy coś znajdziesz w bazach.</p>'; bar.hidden = true; return; }
  let html = '';
  for (const c in CLUE_CATS) {
    const ids = S.clueOrder.filter(x => CLUES[x.id].cat === c);
    if (!ids.length) continue;
    html += `<h4 class="cc cc-${c}">${CLUE_CATS[c].icon} ${CLUE_CATS[c].name} <span>${ids.length}</span></h4>`;
    html += ids.slice().reverse().map(x => {
      const C = CLUES[x.id], sel = S.linkSel.includes(x.id);
      return `<div class="clue cc-${c} ${S.seenClues.has(x.id) ? '' : 'fresh'} ${sel ? 'sel' : ''}" data-clue="${x.id}">
        <div class="ct-h"><button class="pin" data-pick="${x.id}" title="Zaznacz do połączenia">${sel ? '◆' : '◇'}</button><b>${esc(C.title)}</b><span>${fmtClock(x.t)}</span></div>
        <p>${esc(C.text)}</p>
        <div class="ct-f">${C.geo ? `<span class="geo">na mapie: ${esc(GEO[C.geo].label)}</span>` : '<span></span>'}${S.clueAnchor[x.id] ? `<button class="jump" data-jump="${S.clueAnchor[x.id]}">↳ w rozmowie</button>` : ''}</div></div>`;
    }).join('');
  }
  box.innerHTML = html;
  box.querySelectorAll('[data-pick]').forEach(b => b.onclick = e => { e.stopPropagation(); toggleLinkSel(b.dataset.pick); });
  box.querySelectorAll('.clue').forEach(d => d.onclick = e => { if (!e.target.closest('button')) toggleLinkSel(d.dataset.clue); });
  box.querySelectorAll('[data-jump]').forEach(b => b.onclick = e => { e.stopPropagation(); jumpToMsg(b.dataset.jump); });
  // pasek łączenia
  const n = S.linkSel.length, dis = S.busy || S.over;
  bar.hidden = false;
  bar.innerHTML = n === 2
    ? `<span>Połącz: <b>${esc(CLUES[S.linkSel[0]].title)}</b> + <b>${esc(CLUES[S.linkSel[1]].title)}</b></span><button class="btn small primary" id="lk-go" ${dis ? 'disabled' : ''}>Połącz ∴</button><button class="btn small ghost" id="lk-x">✕</button>`
    : `<span>${n ? `Wybrano: <b>${esc(CLUES[S.linkSel[0]].title)}</b>. Zaznacz drugą poszlakę.` : 'Tablica: zaznacz ◇ dwie poszlaki, które według ciebie coś łączy, i wyciągnij wniosek.'}</span>${n ? '<button class="btn small ghost" id="lk-x">✕</button>' : ''}`;
  const go = $('#lk-go'); if (go) go.onclick = connectClues;
  const lx = $('#lk-x'); if (lx) lx.onclick = () => { S.linkSel = []; renderClues(); };
  if (S.ui.tab === 'poszlaki') S.clueOrder.forEach(x => S.seenClues.add(x.id));
}
function jumpToMsg(id) {
  const m = document.getElementById(id);
  if (!m) return;
  if (window.innerWidth < 980) { S.ui.mcol = 'center'; renderTabs(); }
  m.scrollIntoView({ block: 'center', behavior: 'smooth' });
  m.classList.remove('hl'); void m.offsetWidth; m.classList.add('hl');
}

function onMapBuilding(id) { S.ui.selBuilding = id; updateMap(); renderMapCard(); }
function renderMapCard() {
  const box = $('#map-card');
  const b = BUILDINGS.find(x => x.id === S.ui.selBuilding);
  if (!b) { box.innerHTML = `<p class="muted">${CASE.labels.mapHint}</p>`; return; }
  const ms = buildingMatches(b);
  const ok = ms.filter(m => m.ok).length;
  const st = STREETS.find(s => s.id === b.street);
  const dis = S.rescued || S.escaped || S.over;
  box.innerHTML = `<div class="mc-h"><b>${esc(b.addr)}</b>${ms.length ? `<span class="fit ${ok === ms.length ? 'all' : ''}">pasuje ${ok}/${ms.length}</span>` : ''}</div>
    <div class="mc-d">${CASE.buildingInfo(b)}</div>
    <div class="mc-n">${esc(b.note)}</div>
    ${ms.length ? '<ul class="mc-m">' + ms.map(m => `<li class="${m.ok ? 'ok' : 'no'}">${m.ok ? '✓' : '✗'} ${esc(GEO[m.geo].label)} <span>(${esc(CLUES[m.clue].title)})</span></li>`).join('') + '</ul>' : ''}
    <div class="mc-b"><button class="btn small primary" id="mc-go" ${dis ? 'disabled' : ''}>${CASE.labels.go}</button>
    ${st && st.recon ? `<button class="btn small" id="mc-rec" ${dis ? 'disabled' : ''}>${CASE.labels.reconBtn}: ${esc(st.name)}</button>` : ''}</div>`;
  const go = $('#mc-go'); if (go) go.onclick = () => { S.ui.dispatch.target = 'b:' + b.id; setTab('sluzby'); };
  const rc = $('#mc-rec'); if (rc) rc.onclick = () => { S.ui.dispatch.target = 's:' + b.street; setTab('sluzby'); };
}

function renderTools() {
  const box = $('#tools');
  if (!box) return;
  const dis = S.busy || !!S.decision || S.over || S.phase === 'ring';
  let html = '';
  for (const t of TOOLS) {
    const av = !t.avail || t.avail();
    const used = t.once && S.toolsUsed[t.id];
    if (t.input) {
      html += `<div class="tool ${!av ? 'locked' : ''}"><div class="tl-h"><b>${t.name}</b><span class="cost">⏱ ${t.cost} min / zapytanie</span></div><p>${t.desc}</p>
        ${!av ? `<div class="lock">[ZABLOK.] ${t.lock || ''}</div>` : `<form class="tl-f" data-form="${t.id}"><input data-k="q-${t.id}" placeholder="${esc(t.placeholder || '')}" value="${esc(S.ui.q[t.id] || '')}" autocomplete="off"><button class="btn small" ${dis ? 'disabled' : ''}>Szukaj</button></form>`}</div>`;
      continue;
    }
    if (t.form) {
      const f = S.ui.mf, res = missingResults();
      const sel = (k, opts) => `<select data-k="${k}">${opts.map(([v, l]) => `<option value="${v}" ${f[k] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
      html += `<div class="tool wide"><div class="tl-h"><b>${t.name}</b><span class="cost">bez kosztu czasu</span></div><p>${t.desc}</p>
        <div class="mf">${sel('age', [['', 'wiek: dowolny'], ['u18', 'do 17 lat'], ['18', '18–25 lat'], ['26', '26–40 lat'], ['41', 'powyżej 40']])}
        ${sel('hair', [['', 'włosy: dowolne'], ['rude', 'rude'], ['blond', 'blond'], ['ciemne', 'ciemne'], ['siwe', 'siwe']])}
        ${sel('period', [['', 'zaginięcie: kiedykolwiek'], ['3', 'ostatnie 3 dni'], ['14', 'ostatnie 14 dni'], ['60', 'ostatnie 60 dni']])}
        ${sel('city', [['', 'miejscowość: dowolna'], ['Kalnów', 'Kalnów']])}
        <input data-k="kw" placeholder="znaki szczególne, ubiór, słowo…" value="${esc(f.kw)}" autocomplete="off"></div>
        <div class="mres"><div class="mres-n">Wyniki: ${res.length}</div>${res.map(m => `<div class="mr ${S.candidate && S.candidate.id === m.id ? 'cand' : ''} ${S.candidateRejected[m.id] ? 'rej' : ''}">
          <div class="mr-h"><b>${esc(m.name)}</b>, ${m.age} l. · ${esc(m.city)} · od ${m.since.split('-').reverse().join('.')}</div>
          <div class="mr-d">włosy: ${esc(m.hair)}, oczy: ${esc(m.eyes)}, ${m.height} cm · ${esc(m.features)}</div>
          <div class="mr-d">${esc(m.clothes)}. ${esc(m.notes)}</div>
          <div class="mr-d muted">Zgłaszający: ${esc(m.reporter)}</div>
          ${S.candidateRejected[m.id] ? `<div class="mr-x">${CASE.labels.rejected}</div>` : (S.candidate && S.candidate.id === m.id) ? `<div class="mr-c">${CASE.labels.chosen}</div>` : `<button class="btn small" data-cand="${m.id}" ${dis ? 'disabled' : ''}>${CASE.labels.candidate}</button>`}
        </div>`).join('')}</div></div>`;
      continue;
    }
    html += `<div class="tool ${!av ? 'locked' : ''} ${used ? 'used' : ''}"><div class="tl-h"><b>${t.name}</b><span class="cost">⏱ ${t.cost} min</span></div>
      <p>${t.desc}${t.extra ? t.extra() : ''}</p>
      ${!av ? `<div class="lock">[ZABLOK.] ${t.lock || ''}</div>` : used ? '<div class="done">✔ wykonano</div>' : `<button class="btn small" data-tool="${t.id}" ${dis || S.contact === 'paused' && false ? 'disabled' : ''}>Wykonaj</button>`}</div>`;
  }
  // zachowaj fokus pola tekstowego
  const act0 = document.activeElement, actK = act0 && (act0.id || act0.dataset.k), pos = act0 && act0.selectionStart;
  box.innerHTML = html;
  if (actK) { const e = box.querySelector(`[data-k="${actK}"]`); if (e && e.tagName === 'INPUT') { e.focus(); try { e.setSelectionRange(pos, pos); } catch (x) { } } }
  box.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => useTool(b.dataset.tool));
  box.querySelectorAll('[data-cand]').forEach(b => b.onclick = () => setCandidate(b.dataset.cand));
  box.querySelectorAll('.mf select').forEach(s => s.onchange = () => { S.ui.mf[s.dataset.k] = s.value; renderTools(); });
  const kw = box.querySelector('.mf input');
  if (kw) kw.oninput = () => { S.ui.mf.kw = kw.value; clearTimeout(kw._t); kw._t = setTimeout(renderTools, 250); };
  box.querySelectorAll('form[data-form]').forEach(f => {
    const inp = f.querySelector('input');
    inp.oninput = e => S.ui.q[f.dataset.form] = e.target.value;
    f.onsubmit = e => { e.preventDefault(); toolSearch(f.dataset.form, inp.value); };
  });
  const rbox = $('#results');
  rbox.innerHTML = S.ui.results.length ? S.ui.results.map(r => `<div class="res"><div class="res-h"><b>${esc(r.title)}</b><span>${fmtClock(r.t)}</span></div><pre>${esc(r.text)}</pre></div>`).join('') : '<p class="muted">Tu pojawią się wyniki zapytań.</p>';
}

function renderDispatch() {
  const box = $('#dispatch');
  if (!box || !S) return;
  const d = S.ui.dispatch, o = S.order;
  const dis = S.busy || !!S.decision || S.over || S.rescued || S.escaped || S.phase === 'ring';
  const optB = BUILDINGS.map(b => `<option value="b:${b.id}" ${d.target === 'b:' + b.id ? 'selected' : ''}>${esc(b.addr)}</option>`).join('');
  const optS = STREETS.filter(s => s.recon).map(s => `<option value="s:${s.id}" ${d.target === 's:' + s.id ? 'selected' : ''}>${esc(s.name)} (${CASE.labels.reconShort || 'rekonesans'})</option>`).join('');
  let status = '<span class="muted">w bazie, KPP Kalnów</span>';
  if (o) {
    const lbl = o.mode === 'rekon' ? 'rekonesans: ' + streetName(o.street) : BUILDINGS.find(b => b.id === o.target).addr;
    status = o.status === 'jedzie' ? `▸ jedzie: ${esc(lbl)} · ETA ${Math.max(0, Math.ceil(o.eta - S.t))} min`
      : o.status === 'na_miejscu' ? `● na miejscu: ${esc(lbl)}`
      : o.status === 'wolny' ? `‖ wolny, ${esc(streetName(o.onStreet))}` : '■ działania zakończone';
  }
  const act0 = document.activeElement && document.activeElement.closest && document.activeElement.closest('#dispatch');
  if (act0 && document.activeElement.tagName === 'SELECT') return; // nie psuj otwartej listy
  box.innerHTML = `<label class="fl">Cel<select id="d-target" ${dis ? 'disabled' : ''}><option value="">${CASE.labels.pick}</option><optgroup label="${CASE.labels.target}">${optB}</optgroup><optgroup label="${CASE.labels.recon}">${optS}</optgroup></select></label>
    <div class="units"><label><input type="checkbox" checked disabled> Policja – patrol 0-7</label>
      <label><input type="checkbox" id="d-zrm" ${d.zrm ? 'checked' : ''} ${dis ? 'disabled' : ''}> ZRM – karetka</label>
      <label><input type="checkbox" id="d-psp" ${d.psp ? 'checked' : ''} ${dis ? 'disabled' : ''}> PSP – otwarcie drzwi</label></div>
    <div class="units"><label><input type="radio" name="sig" id="d-quiet" ${!d.sirens ? 'checked' : ''} ${dis ? 'disabled' : ''}> dyskretnie, bez sygnałów</label>
      <label><input type="radio" name="sig" id="d-loud" ${d.sirens ? 'checked' : ''} ${dis ? 'disabled' : ''}> na sygnałach (o ok. 20% szybciej)</label></div>
    <button class="btn primary wide" id="d-go" ${dis || !d.target ? 'disabled' : ''}>${o && o.status !== 'zakonczone' ? 'Zmień dyspozycję' : 'Zadysponuj'}</button>
    <div class="ustat"><b>Patrol 0-7:</b> ${status}</div>
    <div class="ustat"><b>ZRM K-03:</b> ${S.zrmSent ? (S.rescued ? 'przy poszkodowanej' : 'w drodze / w gotowości') : '<span class="muted">w bazie</span>'}</div>`;
  $('#d-target').onchange = e => { d.target = e.target.value; renderDispatch(); };
  $('#d-zrm').onchange = e => d.zrm = e.target.checked;
  $('#d-psp').onchange = e => d.psp = e.target.checked;
  $('#d-quiet').onchange = () => d.sirens = false;
  $('#d-loud').onchange = () => d.sirens = true;
  $('#d-go').onclick = doDispatch;
  $('#radio-log').innerHTML = S.ui.radio.length ? S.ui.radio.map(r => `<div class="rl"><span>${fmtClock(r.t)} · ${esc(r.who)}</span>${esc(r.text)}</div>`).join('') : '<p class="muted">Cisza w eterze.</p>';
}

function renderCard() {
  const box = $('#card');
  if (!box) return;
  $('#protocol').innerHTML = CASE.protocol().map(([l, ok]) => `<li class="${ok ? 'ok' : ''}"><span class="pb">${ok ? '[X]' : '[ ]'}</span>${l}<time>${ok && S.protoAt[l] != null ? fmtClock(S.protoAt[l]) : ''}</time></li>`).join('');
  const rows = [['Nr zgłoszenia', CASE.incident], ['Przyjęto', `${CASE.date}, ${fmtClock(0)} · kanał tekstowy`]].concat(CASE.card());
  box.innerHTML = `<dl class="kz">${rows.map(([k, v, raw]) => `<dt>${esc(k)}</dt><dd>${raw ? v : esc(v)}</dd>`).join('')}</dl>`;
  const nb = $('#notes');
  if (nb && document.activeElement !== nb && nb.value !== S.ui.notes) nb.value = S.ui.notes;
}

function setTab(t) { S.ui.tab = t; renderTabs(); if (t === 'poszlaki') renderClues(); if (window.innerWidth < 980) { S.ui.mcol = 'right'; renderTabs(); } }
function renderTabs() {
  const fresh = S.clueOrder.filter(x => !S.seenClues.has(x.id)).length;
  $$('#tool-tabs button').forEach(b => {
    b.classList.toggle('on', b.dataset.tab === S.ui.tab);
    const i = b.querySelector('i');
    if (b.dataset.tab === 'poszlaki') { i.textContent = fresh || ''; i.hidden = !fresh; }
  });
  $$('.tabpane').forEach(p => p.hidden = p.id !== 'tab-' + S.ui.tab);
  $$('#mnav button').forEach(b => b.classList.toggle('on', b.dataset.col === S.ui.mcol));
  document.body.dataset.mcol = S.ui.mcol;
  const mb = $('#mnav [data-col="right"] i');
  if (mb) { mb.textContent = fresh || ''; mb.hidden = !fresh; }
  if (S.ui.mcol === 'center') S.unread = 0;
  const mc = $('#mnav [data-col="center"] i');
  if (mc) { mc.textContent = S.unread || ''; mc.hidden = !S.unread; }
}

/* =====================================================================
   START
   ===================================================================== */
function startGame() {
  S = newState();
  AUDIO.init(); AUDIO.setOn(SET.sound);
  $('#intro').hidden = true; $('#ending').hidden = true; $('#app').hidden = false;
  $('#chat').innerHTML = '';
  $('#hint').hidden = true;
  $('#notes').value = '';
  $('#tab-mapa').classList.remove('expanded');
  $('#decision').hidden = true;
  $('#composer').classList.remove('deciding');
  document.body.className = 'case-' + CASE.id;
  buildMap($('#map'));
  buildSketch($('#sketch'));
  $('#incident-no').textContent = CASE.incident;
  $('.map-bar span').textContent = CASE.mapTitle;
  addBubble('sys', 'Nocna zmiana, stanowisko 3. Kolejka zgłoszeń pusta.');
  renderAll();
  setTimeout(() => { if (S.phase === 'ring') { addBubble('sys', 'Połączenie przychodzące na numer 112…'); sfx('ring'); } }, 1600);
  clearInterval(window._ringIv);
  window._ringIv = setInterval(() => { if (S && S.phase === 'ring') sfx('ring'); else clearInterval(window._ringIv); }, 3200);
}

/* ekran tytułowy: wybór sprawy, opis sprawy, zakończenia, bramka 18+ */
function renderIntro() {
  const I = CASE.intro, meta = CASES.find(c => c.id === CASE.id);
  document.title = `${meta.title} – gra operatora numeru 112`;
  document.body.dataset.case = CASE.id;
  $('#case-tabs').innerHTML = CASES.map(c => `<a class="case-tab ${c.id === CASE.id ? 'on' : ''}" href="?sprawa=${c.id}">
    <span class="ct-no">SPRAWA ${c.no}${c.adult ? ' <i>18+</i>' : ''}</span><b>${esc(c.title)}</b><small>${esc(c.short)}</small></a>`).join('');
  $('#intro-visual').innerHTML = I.visual;
  $('#intro-kicker').textContent = I.kicker;
  $('#intro-title').textContent = meta.title;
  $('#intro-lead').innerHTML = I.lead.map(p => `<p class="intro-lead">${p}</p>`).join('');
  $('#intro-shift').textContent = I.shift;
  $('#intro-warn').textContent = I.warn;
  $('#intro').style.setProperty('--intro-img', I.image ? `url("${new URL(I.image, location.href).href}")` : 'none');
  let got = [];
  try { got = JSON.parse(localStorage.getItem(endingsKey()) || '[]'); } catch (e) { }
  $('#intro-endings').innerHTML = `Odkryte zakończenia: <b>${got.length}/${Object.keys(ENDINGS).length}</b>` + (got.length ? ' · ' + got.map(k => esc(ENDINGS[k].title)).join(' · ') : '');
  $('#age-gate').hidden = !meta.adult;
  const gate = () => { $('#btn-start').disabled = !!meta.adult && !$('#set-adult').checked; };
  $('#set-adult').onchange = gate; gate();
}

/* sekundy zegara: przy presji czasu minuta gry mija w 30 s, więc sekundy gry biegną dwa razy szybciej */
function renderSeconds() {
  const el = $('#clock-s');
  if (!el || !S) return;
  if (S.busy || S.decision) return;
  const run = SET.pressure && S.phase !== 'ring' && S.phase !== 'done' && !S.over;
  el.textContent = ':' + String(run ? (S.idleReal % 30) * 2 : 0).padStart(2, '0');
  el.parentElement.classList.toggle('frozen', !run);
}
setInterval(() => {
  if (!S || S.over || S.phase === 'ring') return;
  AUDIO.heartbeat(S.stress);
  if (S.busy || S.decision || document.hidden || S.phase === 'done' || !$('#help').hidden) { renderSeconds(); return; }
  S.idleReal++;
  renderSeconds();
  if (S.contact === 'active' && S.idleReal === 45 && S.idlePings < 3) {
    act(async () => { S.idlePings++; dS(+5); await her([pick(['jesteś tam?', 'halo?? jesteś?', 'prosze odpisz', 'nie zostawiaj mnie'])]); }, true);
    return;
  }
  if (SET.pressure && S.idleReal % 30 === 0) act(() => advance(1), true);
}, 1000);

document.addEventListener('keydown', e => {
  if (!S || S.over || $('#app').hidden) return;
  if (document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  if (S.decision && S.decision.key) { if (/^[1-4]$/.test(e.key)) S.decision.key(+e.key); return; }
  if (S.phase === 'ring' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); const b = $('#btn-answer'); if (b && !b.disabled) b.click(); return; }
  // 1–9: pytanie z bieżącej kategorii, ←/→: kategorie
  if (/^[1-9]$/.test(e.key)) { const b = $$('#qlist .q')[+e.key - 1]; if (b && !b.disabled) b.click(); return; }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const cats = Object.keys(Q_CATS), i = cats.indexOf(S.ui.qcat);
    S.ui.qcat = cats[(i + (e.key === 'ArrowRight' ? 1 : cats.length - 1)) % cats.length]; renderQuestions();
  }
});

/* wołane przez js/cases.js po wczytaniu plików sprawy */
function initApp() {
  try { Object.assign(SET, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) { }
  $('#set-sound').checked = SET.sound; $('#set-pressure').checked = SET.pressure; $('#set-fast').checked = SET.fast;
  const saveSet = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch (e) { } };
  $('#set-sound').onchange = e => { SET.sound = e.target.checked; AUDIO.setOn(SET.sound); saveSet(); };
  $('#set-pressure').onchange = e => { SET.pressure = e.target.checked; saveSet(); };
  $('#set-fast').onchange = e => { SET.fast = e.target.checked; saveSet(); };
  $('#btn-start').onclick = startGame;
  $('#btn-sound').onclick = () => { SET.sound = !SET.sound; AUDIO.setOn(SET.sound); $('#btn-sound').textContent = SET.sound ? 'SND' : 'MUTE'; saveSet(); };
  $('#btn-help').onclick = () => $('#help').hidden = false;
  $('#notes').oninput = e => { if (S) S.ui.notes = e.target.value; };
  $('#help-close').onclick = () => $('#help').hidden = true;
  $('#help').onclick = e => { if (e.target.id === 'help') $('#help').hidden = true; };
  $$('#tool-tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  $$('#mnav button').forEach(b => b.onclick = () => { S.ui.mcol = b.dataset.col; renderTabs(); if (b.dataset.col === 'center') $('#chat').scrollTop = 1e9; });
  $('#btn-map-expand').onclick = () => { $('#tab-mapa').classList.toggle('expanded'); $('#btn-map-expand').textContent = $('#tab-mapa').classList.contains('expanded') ? '✕ Zamknij' : '⤢ Powiększ'; };
  $('#btn-sound').textContent = SET.sound ? 'SND' : 'MUTE';
  renderIntro();
}
