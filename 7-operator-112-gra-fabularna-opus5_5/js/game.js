'use strict';
/* =====================================================================
   Pod jedną żarówką – silnik gry
   ===================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => String(s).toLowerCase().replace(/ł/g, 'l').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

const SET = { sound: true, pressure: true, fast: false };
const START_MIN = 23 * 60 + 41;          // 26.10.2026, 23:41
const PHONE = '+48 607 413 220';
const INCIDENT = 'KAL/2026/10/26/1187';
const HQ = [241, 652];
const ENDINGS_KEY = 'pjz_endings_v1';
const SET_KEY = 'pjz_settings_v1';

let S = null;

function newState() {
  return {
    t: 0, battery: 42, health: 64, stress: 80, bulb: 'on',
    perp: 'home', perpSuspicious: false, perpReturnAt: 48, perpMoveAt: null, perpFate: null,
    alarm: false, alarmAt: 0, moved: false, movedAt: 0, rain: false, asthma: false,
    clues: new Set(), clueOrder: [], flags: new Set(), asked: {}, fired: new Set(), pending: [],
    candidate: null, candidateRejected: {}, identity: false,
    contact: 'active', lostAt: null, lostReason: null,
    order: null, zrmSent: false, rescued: false, rescueT: null, escaped: false, escapeT: null,
    mistakes: [], goods: [], bubbles: 0, questions: 0, lastHer: '',
    warned: {}, idleReal: 0, idlePings: 0, busy: false, lockEvents: false, decision: null,
    phase: 'ring', over: false, defer: null,
    seenQ: new Set(), seenClues: new Set(), toolsUsed: {},
    ui: { qcat: 'stan', tab: 'poszlaki', selBuilding: null, layers: {}, mcol: 'center',
          dispatch: { target: '', zrm: true, psp: false, sirens: false },
          results: [], radio: [], mf: { age: '', hair: '', period: '', city: '', kw: '' }, ewidQ: '' },
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
  toast(`${CLUE_CATS[CLUES[id].cat].icon} Nowa poszlaka: <b>${esc(CLUES[id].title)}</b>`, CLUES[id].cat);
  sfx('clue');
  renderAll();
}
function flushDefer() { const d = S.defer || []; S.defer = null; d.forEach(clue); }

function fmtClock(t) {
  const m = START_MIN + Math.floor(t + 1e-6);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function fmtDur(t) { const s = Math.round(t * 60); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
function streetName(id) { const s = STREETS.find(x => x.id === id); return s ? s.name : '?'; }
function onSlodowa(o) { return o && (o.street === 'slodowa' || (o.target && o.target.startsWith('slodowa'))); }
function policeOnStreet(id) {
  const o = S.order;
  if (!o || (o.status !== 'na_miejscu' && o.status !== 'wolny') || !o.onStreet) return false;
  return id ? o.onStreet === id : true;
}
function hasEvidence() {
  return ['adres_ppe', 'potwierdzony', 'swiatlo', 'ewid_marek', 'ewid_henryk', 'sasiedzi', 'sasiadka'].some(has);
}

/* =====================================================================
   CZAT
   ===================================================================== */
function addBubble(kind, text, extra) {
  const chat = $('#chat');
  const d = document.createElement('div');
  d.className = 'msg ' + kind;
  const time = `<span class="tm">${fmtClock(S.t)}</span>`;
  if (kind === 'sys') d.innerHTML = `<span class="sys-t">${esc(text)}</span>${time}`;
  else if (kind === 'radio') d.innerHTML = `<span class="who">📻 ${esc(extra || 'Patrol 0-7')}</span><span class="b">${esc(text)}</span>${time}`;
  else d.innerHTML = `<span class="b">${esc(text)}</span>${time}`;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d;
}
function showTyping(on) {
  let t = $('#typing');
  if (on && !t) {
    t = document.createElement('div'); t.id = 'typing'; t.className = 'msg her typing';
    t.innerHTML = '<span class="b"><i></i><i></i><i></i></span>';
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
    S.battery = Math.max(0, S.battery - 0.32 * (has('dim') ? 0.55 : 1) * dt);
    if (S.battery <= 0) S.pending.push(() => loseContact('bateria'));
    for (const th of [15, 10, 5]) {
      if (S.battery <= th && !S.warned[th]) {
        S.warned[th] = true;
        S.pending.push(async () => {
          await sys(`Telemetria: bateria urządzenia rozmówcy ${th}%.`);
          if (S.contact === 'active') await her([th === 5 ? 'zaraz mi padnie telefon. prosze. szybciej' : th === 10 ? 'telefon pokazuje 10%' : 'bateria się kończy. 15%']);
        });
      }
    }
  }
  if (!S.rescued && !S.escaped && S.contact !== 'lost') {
    let hd = 0.35;
    if (S.asthma) hd += 0.9 * (has('oddech_instr') ? 0.5 : 1) * (S.stress > 80 ? 1.4 : 1);
    if (!has('cieplo') && S.t > 25) hd += 0.2;
    if (S.rain && !has('cieplo')) hd += 0.15;
    if (!has('czuwa') && S.health < 35) hd += 0.3;
    S.health = Math.max(0, S.health - hd * dt);
    if (S.health <= 0) S.pending.push(() => loseContact('omdlenie'));
    S.stress = clamp(S.stress + (S.stress > 60 ? -0.25 : 0.1) * dt, 0, 100);
  }
}

const ANY_CONTACT = new Set(['wyjazd', 'wywozi', 'syreny', 'polnoc', 'powrot', 'alarm_dom', 'alarm_powrot']);

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
        if (!ANY_CONTACT.has(ev.id)) {
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
    box.innerHTML = `<div class="d-head"><span class="d-tag">${timer ? 'DECYZJA' : 'WYBÓR'}</span><b>${esc(cfg.title)}</b></div>
      <p>${esc(cfg.text || '')}</p>
      <div class="d-opts">${opts.map((o, i) => `<button class="d-opt" data-i="${i}"><span class="k">${i + 1}</span>${esc(o.label)}</button>`).join('')}</div>
      ${timer ? '<div class="d-timer"><i></i></div>' : ''}`;
    box.hidden = false;
    $('#composer').classList.add('deciding');
    if (timer) sfx('alarm');
    let done = false, iv = null;
    const t0 = performance.now();
    const finish = async (fn) => {
      if (done) return; done = true;
      clearInterval(iv); box.hidden = true; $('#composer').classList.remove('deciding');
      S.decision = null; S.idleReal = 0;
      try { await fn(); } catch (e) { console.error(e); }
      renderAll(); resolve();
    };
    box.querySelectorAll('.d-opt').forEach(b => b.addEventListener('click', () => finish(() => opts[+b.dataset.i].run())));
    S.decision.key = n => { if (opts[n - 1]) finish(() => opts[n - 1].run()); };
    if (timer) {
      const bar = box.querySelector('.d-timer i');
      iv = setInterval(() => {
        const k = 1 - (performance.now() - t0) / (timer * 1000);
        bar.style.width = Math.max(0, k * 100) + '%';
        if (k < 0.35) bar.classList.add('low');
        if (k <= 0) finish(() => cfg.onTimeout ? cfg.onTimeout() : null);
      }, 100);
    }
    renderQuestions();
  });
}

/* =====================================================================
   AKCJE GRACZA
   ===================================================================== */
async function act(fn, auto) {
  if (!S || S.busy || S.over || S.decision) return;
  S.busy = true;
  if (!auto) S.idleReal = 0;
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
    let msgs = [], consumed = true;
    S.defer = [];
    if (S.stress >= 90 && !q.calm && Math.random() < 0.45) {
      msgs = [pick(PANIC)]; consumed = false; dS(-3);
    } else if (q.light && S.bulb !== 'on' && !has('zapalniczka')) {
      msgs = [pick(DARK)]; consumed = false;
    } else {
      if (q.light && S.bulb !== 'on') msgs.push('zapalam zapalniczkę. trochę widać');
      msgs = msgs.concat(q.run() || []);
    }
    if (consumed) S.asked[q.id] = S.t;
    await her(msgs);
    flushDefer();
    if (consumed && q.after && S.contact === 'active') await q.after();
    await advance(q.cost || 1);
  });
}

/* ---------- start rozmowy ---------- */
function answerCall() {
  act(async () => {
    S.phase = 'call';
    AUDIO.ambience();
    renderAll();
    await sys(`Połączenie 112 przyjęte · ${PHONE} · ${fmtClock(0)}`);
    await opSay('112, Centrum Powiadamiania Ratunkowego. Słucham?');
    await wait(900);
    await sys('Kanał głosowy: brak mowy. Słychać przyspieszony oddech i szum.');
    await opSay('Halo? Proszę się odezwać.');
    await wait(900);
    await sys('Rozmówca przerwał połączenie głosowe. Przyszła wiadomość w kanale tekstowym 112.');
    await her(['pomocy', 'jestem zamknięta w piwnicy', 'nie mogę mówić głośno. ktoś jest na górze', 'i nie wiem kim jestem. nic nie pamiętam']);
    await sys('Kanał tekstowy aktywny. AML: brak pozycji GPS. Telemetria baterii: 42%.');
    await decide({
      title: 'Pierwsza odpowiedź', text: 'Od pierwszego zdania zależy, czy ona ci zaufa.', timer: null,
      options: [
        { label: 'Jestem z tobą i pomogę ci. Czy jesteś teraz bezpieczna? Czy ktoś jest blisko?', async run() {
            await opSay('Jestem z tobą i pomogę ci. Czy jesteś teraz bezpieczna? Czy ktoś jest blisko?');
            flag('zagrozenie'); dS(-8); good('Spokojne otwarcie rozmowy, pytanie o zagrożenie');
            await her(['on jest na górze. chyba. słyszę telewizor', 'drzwi są zamknięte od zewnątrz', 'dobrze że ktoś odpisał']); } },
        { label: 'Gdzie dokładnie jesteś? Podaj adres albo cokolwiek, co widzisz.', async run() {
            await opSay('Gdzie dokładnie jesteś? Podaj adres albo cokolwiek, co widzisz.');
            dS(+4); S.defer = [];
            clue('piwnica');
            await her(['nie wiem!! piszę że nie wiem', 'piwnica. jedna żarówka. ceglane ściany']); flushDefer(); } },
        { label: 'Spokojnie. Jak się nazywasz? Ile masz lat?', async run() {
            await opSay('Spokojnie. Jak się nazywasz? Ile masz lat?');
            dS(+7);
            await her(['nie wiem. nie pamiętam. to jest najgorsze', 'chyba jestem młoda?']); } },
      ],
    });
    await advance(1);
    $('#hint').hidden = false;
  });
}

/* =====================================================================
   NARZĘDZIA (BAZY)
   ===================================================================== */
const TOOLS = [
  { id: 'aml', name: 'Lokalizacja AML / BTS', desc: 'Pozycja z telefonu (AML) i stacja bazowa, do której jest zalogowany.', cost: 2, once: true,
    async run() { clue('bts'); return 'AML: brak współrzędnych GPS (telefon nie ma pozycji, prawdopodobnie jest pod ziemią).\nBTS: stacja KAL-04, sektor 15°–75° (północny wschód), szacowany zasięg do 1,2 km.\nNa mapie dodano nakładkę sektora.'; } },
  { id: 'hlr', name: 'Abonent numeru', desc: 'Zapytanie do operatora sieci komórkowej: na kogo jest zarejestrowany numer.', cost: 3, once: true,
    async run() { clue('sim'); return `Numer ${PHONE}.\nAbonent: FUNDACJA PSIA PRZYSTAŃ, ul. Polna 40, Kalnów (umowa firmowa, 3 karty SIM).\nUżytkownik karty: nie wskazano.`; } },
  { id: 'krs', name: 'Rejestr fundacji (KRS)', desc: 'Kto zarządza organizacją.', cost: 1, once: true,
    avail: () => has('sim') || has('bluza'), lock: 'Odblokuje się, gdy pojawi się nazwa jakiejś organizacji.',
    async run() { clue('krs'); return 'Fundacja „Psia Przystań”, KRS 0000412377, siedziba: ul. Polna 40, Kalnów (schronisko dla zwierząt).\nZarząd: Marek WRÓBEL – prezes zarządu.\nFundator: Henryk WRÓBEL (zm. 2024).'; } },
  { id: 'ewid', name: 'Ewidencja ludności', desc: 'Wyszukiwanie osoby po imieniu i nazwisku: adres zameldowania, nieruchomości, pojazdy.', cost: 1, input: true },
  { id: 'zag', name: 'Baza osób zaginionych', desc: 'Aktywne zgłoszenia zaginięć z województwa. Filtrowanie nic nie kosztuje.', cost: 0, form: true },
  { id: 'ppe', name: 'Dyspozytor sieci energetycznej', desc: 'Pod jakim adresem jest zamontowany licznik o danym numerze PPE.', cost: 4, once: true,
    avail: () => has('licznik'), lock: 'Potrzebny numer licznika (PPE).',
    async run() { clue('adres_ppe'); return 'ENERPOL Dystrybucja, dyżurny dyspozytor:\nPPE 590 543 017 004 417 781 – ul. Słodowa 14, 64-100 Kalnów, budynek jednorodzinny.\nOdbiorca: Henryk Wróbel (umowa niezaktualizowana). Wniosek o zmianę odbiorcy na Marka Wróbla: w toku.\nOstatni odczyt: 09.2026.'; } },
  { id: 'schron', name: 'Telefon: schronisko „Psia Przystań”', desc: 'Całodobowy numer dyżurny schroniska.', cost: 3, once: true,
    avail: () => has('sim') || has('bluza') || has('krs'), lock: 'Odblokuje się, gdy będzie wiadomo, co łączy ją albo telefon ze schroniskiem.',
    async run() {
      let out = 'Odbiera stróż nocny, pan Zdzisław: „Numer służbowy? To telefon kierownika, pana Marka Wróbla. Coś się stało? Mogę do niego zaraz zadzwonić, on wszystko wyjaśni”.';
      await decide({
        title: 'Stróż chce zadzwonić do kierownika', text: 'Co mu odpowiadasz?', timer: null,
        options: [
          { label: 'Proszę do nikogo nie dzwonić. To sprawa policyjna.', async run() {
              clue('straznik'); good('Nie zaalarmowano sprawcy');
              out += '\n\nTy: „Proszę do nikogo nie dzwonić”.\nStróż: „Rozumiem, nikomu nie powiem. Pan Marek ma owczarka, Bastka, wszędzie go wozi. Mieszka na Ogrodowej, ale ostatnio remontuje dom po ojcu, gdzieś przy browarze”.'; } },
          { label: 'Dobrze, niech pan do niego zadzwoni i poprosi o kontakt z CPR.', async run() {
              S.alarm = true; S.alarmAt = S.t; mistake('Sprawca zaalarmowany przez telefon do schroniska');
              out += '\n\nTy: „Niech pan zadzwoni”.\nPo minucie stróż oddzwania: „Pan Marek mówi, że zgubił telefon i sam się odezwie”. Nie odzywa się.'; } },
        ],
      });
      return out;
    } },
  { id: 'rodzina', name: 'Telefon: osoba zgłaszająca zaginięcie', desc: 'Rozmowa z rodziną kandydatki wybranej w bazie zaginionych.', cost: 3,
    avail: () => !!S.candidate && !S.toolsUsed['rodzina_' + S.candidate.id], lock: 'Najpierw wybierz kandydatkę w bazie osób zaginionych.',
    async run() {
      const c = S.candidate;
      S.toolsUsed['rodzina_' + c.id] = true;
      if (c.id !== 'maja') { S.candidateRejected[c.id] = true; return `${c.reporter}: ${c.call}`; }
      clue('siostra'); clue('astma'); flag('siostra_rozmowa');
      let out = 'Aleksandra Sikorska odbiera po pierwszym sygnale. Mówi szybko, łamiącym się głosem: „Majka od roku jest wolontariuszką w Psiej Przystani. Ostatnio mówiła, że kierownik, pan Marek, coś ukrywa z psami. W niedzielę wieczorem pojechała tam zrobić zdjęcia. Jej telefon wyłączył się o 20:03. Ona ma astmę! Nosi inhalator w takiej małej kieszonce przy rękawie bluzy”.';
      const det = ['tatuaz', 'bransoletka', 'bluza', 'wlosy', 'twarz', 'bilet'].filter(has);
      if (det.length >= 2 && !S.identity) {
        S.identity = true; clue('tozsamosc'); good('Tożsamość potwierdzona przez rodzinę');
        out += `\n\nOpisujesz to, co wiesz (${det.map(d => CLUES[d].title.toLowerCase()).join(', ')}). Po drugiej stronie słychać płacz: „To ona. Bransoletkę M & O zrobiłam jej sama, na osiemnastkę. To Majka!”.`;
      } else if (!S.identity) {
        out += '\n\n„Proszę mi powiedzieć cokolwiek! Jakie ma włosy? Czy ma tatuaż?” Wiesz za mało, żeby to potwierdzić.';
      }
      out += '\n\nOla na koniec: „Proszę jej powiedzieć, że Fasola na nią czeka”.';
      return out;
    } },
];

function useTool(id) {
  const tool = TOOLS.find(t => t.id === id);
  if (!tool) return;
  act(async () => {
    await sys(`🔎 ${tool.name}: zapytanie wysłane.`);
    S.toolsUsed[id] = true;
    await toolProgress(tool);
    S.defer = [];
    const res = await tool.run();
    flushDefer();
    addResult(tool.name, res);
    await sys(`✔ ${tool.name}: wynik w zakładce „Bazy”.`);
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
}

function ewidSearch(q) {
  const n = norm(q);
  if (!n) return;
  act(async () => {
    await sys(`🔎 Ewidencja ludności: „${q}”.`);
    await toolProgress({ name: 'Ewidencja ludności', cost: 1 });
    let hit = REGISTRY.find(r => r.keys.includes(n)) || REGISTRY.find(r => r.keys.some(k => k.includes(' ') && n.includes(k)));
    let text;
    if (hit) {
      text = hit.text;
      S.defer = [];
      if (hit.clue) [].concat(hit.clue).forEach(clue);
      flushDefer();
    } else text = n.split(' ').length < 2 ? `Brak jednoznacznego wyniku dla „${q}”. Podaj imię i nazwisko (albo samo nazwisko, jeśli jest rzadkie).` : `Brak osoby „${q}” zameldowanej w powiecie kalnowskim.`;
    addResult(`Ewidencja: ${q}`, text);
    await advance(1);
  });
}

function missingResults() {
  const f = S.ui.mf, now = new Date('2026-10-26T23:41:00');
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
      const hay = norm([m.name, m.features, m.clothes, m.notes, m.eyes].join(' '));
      const words = norm(f.kw).split(' ').filter(Boolean);
      const stem = w => w.length > 4 ? w.slice(0, w.length - 1) : w;
      if (!words.every(w => hay.includes(stem(w)))) return false;
    }
    return true;
  });
}
function setCandidate(id) {
  act(async () => {
    const m = MISSING.find(x => x.id === id);
    S.candidate = m;
    await sys(`Kandydatka do weryfikacji: ${m.name}, ${m.age} l. Zapytaj ją o to (zakładka „Ona”) albo zadzwoń do zgłaszającego.`);
  });
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
    const from = prev ? (policePos() || HQ) : HQ;
    const tp = targetPoint(tg);
    let eta;
    if (prev && prev.status !== 'jedzie' && prev.onStreet && prev.onStreet === tg.street) eta = 1;
    else if (prev) eta = 1.5 + Math.hypot(tp[0] - from[0], tp[1] - from[1]) / 130;
    else eta = 2.5 + Math.hypot(tp[0] - HQ[0], tp[1] - HQ[1]) / 130;
    if (d.sirens) eta *= 0.8;
    eta = Math.max(1, Math.round(eta * 2) / 2);
    S.order = { ...tg, zrm: d.zrm, psp: d.psp, sirens: d.sirens, start: S.t, eta: S.t + eta, from, status: 'jedzie', onStreet: null };
    if (d.zrm) S.zrmSent = true;
    const units = ['Policja (patrol 0-7)'].concat(d.zrm ? ['ZRM K-03'] : [], d.psp ? ['PSP JRG-1'] : []).join(', ');
    await sys(`🚓 Zadysponowano: ${units} → ${tg.label}${d.sirens ? ', na sygnałach' : ', bez sygnałów'}.`);
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
    if (o.street === 'slodowa' && S.contact === 'active') await sys('Patrol stoi na Słodowej. W zakładce „Polecenia” możesz poprosić ją o sygnał światłem.');
    return;
  }
  o.onStreet = o.street;
  const b = BUILDINGS.find(x => x.id === o.target);
  if (b.id !== 'slodowa14') {
    await radio(b.report);
    if (b.clue) clue(b.clue);
    mistake(`Patrol pod błędnym adresem: ${b.addr}`);
    o.status = 'wolny';
    await radio('Patrol 0-7 wolny, czekam na dyspozycje.');
    return;
  }
  await arriveCorrect();
}

async function arriveCorrect() {
  const o = S.order;
  if (S.moved) {
    if (S.t - S.movedAt <= 3) {
      await radio('Spod czternastki rusza biały bus bez świateł! Blokujemy go radiowozem…');
      await radio('Kierowca zatrzymany: Marek Wróbel. W przestrzeni ładunkowej młoda kobieta, związana, przytomna!');
      S.perp = 'arrested'; S.perpFate = 'arrested';
      await rescue();
      return;
    }
    await radio('Słodowa 14: furtka otwarta, dom pusty. W piwnicy żarówka na kablu, stara kurtka, ślady krwi na schodach. Nikogo. Na podjeździe brak busa.');
    o.status = 'wolny'; S.emptyHouse = true;
    await sys('Sprawca zdążył ją wywieźć. Zgłoszenie przekazano do wydziału kryminalnego.');
    S.pending.push(() => finish());
    return;
  }
  if (S.perp === 'home' || S.perp === 'basement') {
    await radio('Słodowa 14: drzwi otworzył mężczyzna, ok. 45 lat, spokojny. Twierdzi, że mieszka sam i nikogo tu nie ma. W tle szczeka owczarek.');
    await decide({
      title: 'Patrol pod Słodową 14', text: 'Mężczyzna wszystkiemu zaprzecza. Co robisz?', timer: null,
      options: [
        { label: 'Poproś ją, żeby krzyczała i stukała w rurę.', show: () => S.contact === 'active', async run() {
            await opSay('Policja jest pod drzwiami! Krzycz i stukaj w rurę, ile masz siły!');
            await her(['POMOCY!!! JESTEM TUTAJ!!!', 'stukam stukam stukam']);
            await radio('Słyszymy krzyk z piwnicy! Wchodzimy!');
            await radio('Mężczyzna próbował zatrzasnąć drzwi, obezwładniony. Schodzimy do piwnicy.');
            good('Potwierdzenie obecności sygnałem dźwiękowym');
            S.perp = 'arrested'; S.perpFate = 'arrested';
            await rescue(); } },
        { label: 'Wejście siłowe. Biorę to na siebie.', async run() {
            await radio('Przyjąłem, wchodzimy.');
            await radio('Mężczyzna obezwładniony. Drzwi do piwnicy zamknięte na zasuwę… otwieramy.');
            if (hasEvidence()) good('Uzasadnione wejście siłowe');
            S.perp = 'arrested'; S.perpFate = 'arrested';
            await rescue(); } },
        { label: 'Wycofajcie się, sprawdzimy to inaczej.', async run() {
            await radio('Przyjąłem, odjeżdżamy.');
            mistake('Wycofanie patrolu spod właściwego adresu');
            o.status = 'wolny';
            S.perp = 'home'; S.alarm = true; S.alarmAt = S.t; S.fired.delete('alarm_dom'); } },
      ],
    });
    return;
  }
  let rep = 'Słodowa 14: dom ciemny, nikt nie otwiera. Za bramą duży czarny owczarek.';
  if (S.bulb === 'on') rep += ' W piwnicznym okienku słabe światło.';
  await radio(rep);
  await decide({
    title: 'Patrol pod Słodową 14', text: 'Nikt nie otwiera. Decyzja należy do ciebie.', timer: null,
    options: [
      { label: 'Niech da znak: krzyk i stukanie.', show: () => S.contact === 'active', async run() {
          await opSay('Policja jest przed domem! Krzycz i stukaj w rurę!');
          await her(['JESTEM TUTAJ!!! POMOCY!!!']);
          await radio('Słyszymy ją! Wchodzimy!');
          good('Potwierdzenie obecności sygnałem dźwiękowym');
          await enterHouse(); } },
      { label: 'Wejście siłowe, natychmiast.', async run() {
          await radio('Przyjąłem, wchodzimy.');
          if (hasEvidence()) good('Uzasadnione wejście siłowe');
          await enterHouse(); } },
    ],
  });
}

async function enterHouse() {
  if (S.order.psp) await radio('Strażacy otwierają drzwi narzędziem hydraulicznym. Mamy wejście.', 'JRG-1');
  else { await radio('Drzwi antywłamaniowe, wyważamy. To potrwa.'); await advance(2); }
  await rescue();
  if (S.perp === 'away') {
    await decide({
      title: 'Sprawca może wrócić', text: 'Właściciel domu, prawdopodobnie sprawca, jest poza domem. Zostawić nieoznakowany radiowóz w pobliżu?', timer: null,
      options: [
        { label: 'Tak, zasadzka przy domu.', async run() {
            await radio('Przyjąłem. Gasimy światła, stoimy za rogiem.');
            await wait(1600);
            await radio('Podjeżdża biały Ducato… Kierowca zatrzymany: Marek Wróbel. Na siedzeniu pasażera owczarek i torba z taśmą.');
            S.perp = 'arrested'; S.perpFate = 'arrested'; good('Zasadzka na sprawcę'); } },
        { label: 'Nie, wszyscy zostają przy poszkodowanej.', async run() {
            await radio('Przyjąłem.'); S.perpFate = 'fled'; } },
      ],
    });
  } else if (S.perp === 'fled') S.perpFate = 'fled';
}

async function rescue() {
  S.rescued = true; S.rescueT = S.t;
  if (S.order) S.order.status = 'zakonczone';
  if (S.contact === 'active') {
    await her(['ktoś jest za drzwiami', 'światło latarki!!', S.identity ? 'wołają moje imię. MAJA. to ja!!' : 'krzyczą „policja”', 'otwierają']);
    await her(['…', 'dziękuję. dziękuję. dziękuję']);
  }
  const who = S.identity ? 'Maja Sikorska, 19 lat' : 'Młoda kobieta NN, ok. 20 lat';
  const state = S.lostReason === 'omdlenie' ? 'nieprzytomna, oddycha' : 'przytomna, uraz głowy, wychłodzona' + (S.asthma ? ', duszność' : '');
  await radio(`Mamy ją! ${who}, ${state}.`);
  if (S.zrmSent) await radio('ZRM K-03 na miejscu, przejmujemy poszkodowaną.', 'ZRM K-03');
  else {
    mistake('Brak ZRM na miejscu: poszkodowana z urazem głowy czekała na karetkę');
    await radio('Potrzebny ZRM! Nie ma tu zespołu.');
    await sys('Zadysponowano ZRM K-03. Dojazd 8 min.');
  }
  if (S.contact === 'active') await opSay(S.identity ? 'Jesteś bezpieczna, Maju. Już po wszystkim.' : 'Jesteś bezpieczna. Już po wszystkim.');
  sfx('win');
  S.phase = 'done';
}

async function rescueByEscape() {
  S.rescued = true; S.rescueT = S.t;
  if (S.order && S.order.status !== 'wolny' && onSlodowa(S.order)) await radio('Widzimy ją! Dziewczyna na ulicy przed dwunastką, przejmujemy.');
  else {
    S.order = { target: 'slodowa14', street: 'slodowa', mode: 'adres', zrm: true, psp: false, sirens: true, start: S.t, eta: S.t + 5, from: HQ, status: 'zakonczone', onStreet: 'slodowa' };
    S.zrmSent = true;
    await sys('🚓 Zadysponowano Policję i ZRM na ul. Słodową 14, na sygnałach (adres podała rozmówczyni).');
  }
  await her(['sąsiadka otworzyła. pani w szlafroku', 'okryła mnie kocem. dzwoni po was', 'syreny. słyszę syreny']);
  await advance(3);
  await radio('Słodowa 14: mężczyzna z rozciętym czołem na schodach do piwnicy, zatrzymany. Poszkodowana u sąsiadów, ZRM ją przejmuje.');
  S.perp = 'arrested'; S.perpFate = 'arrested';
  await opSay('Jesteś bezpieczna. Zostań z sąsiadką, ratownicy już są.');
  sfx('win');
  S.phase = 'done';
}

async function blinkResult() {
  await wait(700);
  if (policeOnStreet('slodowa') && S.bulb !== 'dead') {
    await radio('Widzimy! Okienko piwnicy pod Słodową 14 mrugnęło trzy razy. Potwierdzam adres!');
    clue('potwierdzony'); good('Potwierdzenie adresu sygnałem świetlnym');
    S.ui.dispatch.target = 'b:slodowa14';
    await sys('Adres potwierdzony. Zadysponuj patrol bezpośrednio na ul. Słodową 14 (zakładka „Służby”), będą w minutę.');
  } else if (S.order && S.order.onStreet) {
    await radio(`Nic nie widzimy. Na ${streetName(S.order.onStreet).replace('ul. ', 'ulicy ')} wszystkie piwnice ciemne.`);
  }
}

/* =====================================================================
   KONIEC
   ===================================================================== */
function checkAutoEnd() {
  if (!S || S.over) return;
  if (S.contact === 'lost' && !S.rescued && !S.escaped && S.t >= S.lostAt + 30 && !(S.order && S.order.status === 'jedzie')) finish();
}

function endingCode() {
  if (S.escaped) return 'E4';
  if (S.rescued) {
    if (S.lostAt != null && S.lostAt < S.rescueT) return 'E5';
    if (!S.identity) return 'E3';
    return S.perpFate === 'arrested' ? 'E1' : 'E2';
  }
  return (S.lostReason === 'sprawca' || S.moved) ? 'E7' : 'E6';
}

function scoreOf(code) {
  let p = 0;
  const saved = S.rescued || S.escaped;
  if (S.rescued && !S.escaped) p += 35;
  if (S.escaped) p += 25;
  if (saved) p += clamp(22 - Math.max(0, S.rescueT - 22) * 0.6, 0, 22);
  if (S.identity) p += 14;
  if (S.perpFate === 'arrested') p += 9;
  const med = ['ucisk', 'czuwa', 'oddech_instr', 'inhalator', 'cieplo', 'butelka'].filter(f => has(f) && !(f === 'butelka' && S.mistakes.some(m => m.includes('rozpuszczalnik')))).length;
  p += med * 1.5;
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

function epilogue(code) {
  const clk = fmtClock(S.rescueT != null ? S.rescueT : S.t);
  const heal = 'W szpitalu lekarze stwierdzają wstrząśnienie mózgu. Pamięć wraca falami: najpierw Fasola, potem naleśniki Oli, na końcu schody. Gdy tylko otwiera oczy, Maja pyta o Fasolę. Potem pyta, kto był po drugiej stronie czatu.';
  const dogs = 'Dwa dni później w garażu za schroniskiem Psia Przystań policja i inspektorzy weterynarii znajdują 41 psów w klatkach ustawionych jedna na drugiej, tak jak na zdjęciach, które Maja zrobiła w niedzielę wieczorem, zanim kierownik ją przyłapał.';
  const perpLine = S.perpFate === 'arrested'
    ? 'Marek Wróbel słyszy zarzuty pozbawienia wolności, spowodowania uszczerbku na zdrowiu i znęcania się nad zwierzętami.'
    : 'Marek Wróbel odjechał białym busem, zanim ktokolwiek zdążył go zatrzymać. Szukano go przez trzy dni i znaleziono w domku letniskowym nad zalewem, z laptopem pełnym ogłoszeń „szczeniaki rasowe, tanio”.';
  const P = a => a.map(x => `<p>${x}</p>`).join('');
  switch (code) {
    case 'E1': return P([`${clk}. Patrol 0-7 wyprowadza z piwnicy przy ul. Słodowej 14 dziewiętnastoletnią Maję Sikorską. Marek Wróbel siedzi skuty w radiowozie, a za bramą wciąż szczeka jego owczarek Bastek.`, dogs + ' ' + perpLine, heal]);
    case 'E2': return P([`${clk}. Patrol 0-7 wyprowadza z piwnicy przy ul. Słodowej 14 Maję Sikorską, owiniętą w koc. Dom jest pusty, a na podjeździe zostały świeże ślady opon.`, perpLine + ' ' + dogs, heal]);
    case 'E3': return P([`${clk}. Patrol wynosi z piwnicy przy ul. Słodowej 14 dziewczynę owiniętą w koc. W karcie przyjęcia na SOR ktoś wpisuje: „NN, kobieta, ok. 20 lat, uraz głowy, niepamięć”.`,
      'Przez resztę nocy dziewczyna z opaską NN na ręku patrzy w sufit i próbuje sobie przypomnieć własne imię. Dopiero rano policjant przegląda bazę zaginionych i znajduje zgłoszenie z niedzieli. Aleksandra Sikorska przyjeżdża do szpitala w kapciach. Przez te kilka godzin Maja była nikim.',
      perpLine]);
    case 'E4': return P(['Rura trafiła go w skroń. Maja wybiegła w deszcz i zastukała do sąsiadki. Patrol znalazł Marka Wróbla na schodach do piwnicy: oszołomionego, z rozciętym czołem i z kluczykami do busa w dłoni.',
      'Zadziałało, ale mogło się skończyć zupełnie inaczej. Na szkoleniach w CPR ta rozmowa będzie omawiana jeszcze długo: dobrze, że miała rurę, i źle, że musiała jej użyć.',
      S.identity ? heal : 'Do szpitala trafia jako „NN”. Kim jest, ustalono dopiero rano.']);
    case 'E5': {
      const how = {
        bateria: 'Kiedy patrol wyważa drzwi do piwnicy, telefon leży na betonie z czarnym ekranem. Dziewczyna siedzi skulona pod półką ze słoikami i powtarza, że przecież pisała i że ktoś obiecał.',
        omdlenie: 'Patrol znajduje ją nieprzytomną pod półką ze słoikami. Oddycha płytko i ze świstem. Lekarz z SOR powie potem, że kwadrans później byłoby za późno.',
        sprawca: 'Telefonu nie ma, bo zabrał go sprawca. Ona siedzi w ciemności, z taśmą na nadgarstkach. Patrol zdążył, zanim zdążył ją wywieźć.',
      }[S.lostReason] || '';
      return P([how, `Zgłoszenie zamknięto o ${clk}. W rubryce „kontakt z rozmówcą” wpisano „utracony”, a w rubryce „rezultat” – „odnaleziona żywa”.`,
        S.identity ? heal : 'Kim jest, ustalono dopiero rano, po zgłoszeniu zaginięcia z niedzieli.', perpLine]);
    }
    case 'E6': {
      const notes = S.clueOrder.filter(c => CLUES[c.id].cat === 'miejsce').map(c => CLUES[c.id].title.toLowerCase());
      return P([`Ostatnia wiadomość w kanale: „${esc(S.lastHer || '…')}”. Potem już tylko cisza.`,
        `Karta zgłoszenia nr ${INCIDENT} trafia do wydziału kryminalnego razem z twoimi notatkami${notes.length ? ': ' + esc(notes.join('; ')) : '. Notatek o miejscu jest bardzo mało'}.`,
        'Patrole do rana pukają do kolejnych domów i schodzą do kolejnych piwnic. Gdzieś pod jedną żarówką ktoś wciąż czeka.',
        '<b>To zgłoszenie pozostaje otwarte.</b>']);
    }
    case 'E7': return P(['Ostatnie dwie wiadomości w kanale nie są od niej: „kto to”, „z kim piszesz”.',
      S.emptyHouse ? 'W piwnicy przy Słodowej 14 została żarówka na kablu, kurtka robocza i ślady krwi na schodach. Busa nie ma.' : 'Nikt nie wie, gdzie jest ta piwnica. Telefon fundacji Psia Przystań już się nie loguje do sieci.',
      'Sprawa trafia do wydziału kryminalnego. Rano listy gończe, ogłoszenia, psy tropiące. Biały bus mógł pojechać w każdą stronę.',
      '<b>To zgłoszenie pozostaje otwarte.</b>']);
  }
  return '';
}

function finish() {
  if (S.over) return;
  S.over = true; S.busy = false;
  const code = endingCode(), E = ENDINGS[code];
  let got = [];
  try { got = JSON.parse(localStorage.getItem(ENDINGS_KEY) || '[]'); } catch (e) { }
  if (!got.includes(code)) got.push(code);
  try { localStorage.setItem(ENDINGS_KEY, JSON.stringify(got)); } catch (e) { }
  const pts = scoreOf(code), [g, gl] = gradeOf(pts);
  const total = Object.keys(CLUES).length;
  const missed = Object.keys(CLUES).filter(id => CLUES[id].hint && !S.clues.has(id) && !(S.identity && CLUES[id].cat === 'tozsamosc')).slice(0, 4);
  const saveT = (S.rescued || S.escaped) ? fmtDur(S.rescueT) : '—';
  sfx(E.tone === 'bad' ? 'bad' : 'win');
  $('#ending-inner').innerHTML = `
    <div class="end-top ${E.tone}">
      <div class="end-kicker">Raport ze zdarzenia nr ${INCIDENT}</div>
      <h1>${esc(E.title)}</h1>
      <div class="end-sub">${esc(E.sub)}</div>
    </div>
    <div class="end-body">
      <div class="end-story">${epilogue(code)}</div>
      <aside class="end-side">
        <div class="grade g-${g}"><b>${g}</b><span>${pts} / 100</span><em>${esc(gl)}</em></div>
        <dl class="stats">
          <dt>Czas do uratowania</dt><dd>${saveT}</dd>
          <dt>Czas zgłoszenia</dt><dd>${fmtDur(S.t)}</dd>
          <dt>Twoje wiadomości</dt><dd>${S.questions}</dd>
          <dt>Jej wiadomości</dt><dd>${S.bubbles}</dd>
          <dt>Poszlaki</dt><dd>${S.clues.size} / ${total}</dd>
          <dt>Bateria na końcu</dt><dd>${Math.round(S.battery)}%</dd>
          <dt>Tożsamość</dt><dd>${S.identity ? 'ustalona' : 'nieustalona'}</dd>
          <dt>Sprawca</dt><dd>${S.perpFate === 'arrested' ? 'zatrzymany' : (S.rescued || S.escaped) ? 'zbiegł' : 'nieznany'}</dd>
        </dl>
      </aside>
    </div>
    <div class="end-cols">
      <section><h3>Dobre decyzje</h3>${S.goods.length ? '<ul>' + S.goods.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : '<p class="muted">Brak.</p>'}</section>
      <section><h3>Błędy</h3>${S.mistakes.length ? '<ul class="bad">' + S.mistakes.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : '<p class="muted">Ani jednego. Szacunek.</p>'}</section>
      <section><h3>Co umknęło</h3>${missed.length ? '<ul class="hint">' + missed.map(id => `<li>${esc(CLUES[id].hint)}</li>`).join('') + '</ul>' : '<p class="muted">Wszystkie kluczowe poszlaki znalezione.</p>'}</section>
    </div>
    <div class="end-collection"><h3>Zakończenia (${got.length}/7)</h3><div class="endings-row">
      ${Object.keys(ENDINGS).map(k => `<div class="end-slot ${got.includes(k) ? 'got ' + ENDINGS[k].tone : ''} ${k === code ? 'now' : ''}"><b>${got.includes(k) ? esc(ENDINGS[k].title) : '???'}</b><span>${got.includes(k) ? esc(ENDINGS[k].sub) : 'nieodkryte'}</span></div>`).join('')}
    </div></div>
    <div class="end-actions"><button class="btn primary" id="btn-again">Nowy dyżur</button><button class="btn ghost" id="btn-title">Ekran tytułowy</button></div>`;
  $('#app').hidden = true; $('#ending').hidden = false; window.scrollTo(0, 0); $('#ending').scrollTop = 0;
  $('#btn-again').onclick = () => startGame();
  $('#btn-title').onclick = () => { $('#ending').hidden = true; $('#intro').hidden = false; renderIntroEndings(); };
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

function bar(id, v, cls) { const b = $(id); b.style.width = clamp(v, 0, 100) + '%'; b.className = cls || ''; }
function renderStatus() {
  $('#clock').textContent = fmtClock(S.t);
  $('#clock-date').textContent = (START_MIN + S.t) >= 24 * 60 ? '27.10.2026' : '26.10.2026';
  $('#call-time').textContent = fmtDur(S.t);
  const bt = S.battery;
  $('#bat-val').textContent = Math.max(0, Math.round(bt)) + '%';
  bar('#bat-bar', bt * (100 / 42), bt <= 10 ? 'crit' : bt <= 18 ? 'warn' : '');
  $('#chat-bat').textContent = '🔋 ' + Math.max(0, Math.round(bt)) + '%';
  $('#chat-bat').classList.toggle('crit', bt <= 10);
  const knownH = has('glowa');
  $('#hp-val').textContent = knownH ? (S.health >= 60 ? 'stabilny' : S.health >= 35 ? 'pogarsza się' : S.health > 0 ? 'ciężki' : 'brak kontaktu') : 'nieznany';
  bar('#hp-bar', knownH ? S.health : 0, S.health < 35 ? 'crit' : S.health < 60 ? 'warn' : '');
  $('#st-val').textContent = S.stress >= 90 ? 'panika' : S.stress >= 70 ? 'silny lęk' : S.stress >= 45 ? 'lęk' : 'względny spokój';
  bar('#st-bar', S.stress, S.stress >= 90 ? 'crit' : S.stress >= 70 ? 'warn' : 'calm');
  $('#sig').className = 'sig s' + (S.contact === 'lost' ? 0 : S.t > 40 ? 2 : 3);
  const name = S.identity ? 'Maja Sikorska' : (has('majka') ? '„Majka”?' : 'NN · kobieta');
  $('#caller-name').textContent = name;
  $('#chat-title').textContent = name;
  $('#caller-num').textContent = PHONE + (has('sim') ? ' · Fundacja Psia Przystań' : '');
  let loc = 'nieustalona';
  if (has('potwierdzony') || has('adres_ppe')) loc = 'ul. Słodowa 14 (potwierdzona)';
  else if (has('ewid_marek') || has('ewid_henryk') || has('sasiadka') || has('sasiedzi') || has('swiatlo')) loc = 'prawdopodobnie ul. Słodowa 14';
  else if (has('bts')) loc = 'sektor NE, KAL-04 (~1,2 km)';
  $('#caller-loc').textContent = loc;
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
    list.innerHTML = '<button class="answer" id="btn-answer"><span class="ph">☎</span> Odbierz połączenie 112</button>';
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
  tabs.querySelectorAll('.ct').forEach(b => b.onclick = () => { S.ui.qcat = b.dataset.c; renderQuestions(); });
  const qs = avail.filter(q => q.cat === S.ui.qcat);
  const disabled = S.busy || S.contact !== 'active' || !!S.decision;
  list.innerHTML = qs.length ? qs.map(q => {
    const text = typeof q.text === 'function' ? q.text() : q.text;
    const tags = [];
    if (!S.seenQ.has(q.id)) tags.push('<em class="new">nowe</em>');
    if (q.light && S.bulb !== 'on') tags.push(`<em class="dark">${has('zapalniczka') ? 'zapalniczka' : 'potrzeba światła'}</em>`);
    if (q.calm) tags.push('<em class="calm">uspokaja</em>');
    return `<button class="q" data-id="${q.id}" ${disabled ? 'disabled' : ''}><span>${esc(text)}</span>${tags.join('')}</button>`;
  }).join('') : '<div class="qempty">W tej kategorii nie ma teraz nic do zapytania. Nowe pytania pojawiają się razem z nowymi informacjami.</div>';
  list.querySelectorAll('.q').forEach(b => b.onclick = () => { const q = QUESTIONS.find(x => x.id === b.dataset.id); ask(q); });
  if (!S.decision) qs.forEach(q => S.seenQ.add(q.id));
  $('#composer').classList.toggle('paused', S.contact === 'paused');
}

function renderClues() {
  const box = $('#clues');
  if (!S.clues.size) { box.innerHTML = '<p class="muted pad">Na razie nic. Poszlaki pojawią się tu, gdy ona coś opisze albo gdy coś znajdziesz w bazach.</p>'; return; }
  let html = '';
  for (const c in CLUE_CATS) {
    const ids = S.clueOrder.filter(x => CLUES[x.id].cat === c);
    if (!ids.length) continue;
    html += `<h4 class="cc cc-${c}">${CLUE_CATS[c].icon} ${CLUE_CATS[c].name} <span>${ids.length}</span></h4>`;
    html += ids.slice().reverse().map(x => `<div class="clue cc-${c} ${S.seenClues.has(x.id) ? '' : 'fresh'}"><div class="ct-h"><b>${esc(CLUES[x.id].title)}</b><span>${fmtClock(x.t)}</span></div><p>${esc(CLUES[x.id].text)}</p>${CLUES[x.id].geo ? `<div class="geo">na mapie: ${esc(GEO[CLUES[x.id].geo].label)}</div>` : ''}</div>`).join('');
  }
  box.innerHTML = html;
  if (S.ui.tab === 'poszlaki') S.clueOrder.forEach(x => S.seenClues.add(x.id));
}

function onMapBuilding(id) { S.ui.selBuilding = id; updateMap(); renderMapCard(); }
function renderMapCard() {
  const box = $('#map-card');
  const b = BUILDINGS.find(x => x.id === S.ui.selBuilding);
  if (!b) { box.innerHTML = '<p class="muted">Kliknij budynek z numerem, żeby zobaczyć dane z ewidencji i sprawdzić, czy pasuje do poszlak.</p>'; return; }
  const ms = buildingMatches(b);
  const ok = ms.filter(m => m.ok).length;
  const typeName = { dom: 'dom jednorodzinny', kamienica: 'kamienica', blok: 'blok mieszkalny', obiekt: 'obiekt użytkowy' }[b.type];
  const st = STREETS.find(s => s.id === b.street);
  const dis = S.rescued || S.escaped || S.over;
  box.innerHTML = `<div class="mc-h"><b>${esc(b.addr)}</b>${ms.length ? `<span class="fit ${ok === ms.length ? 'all' : ''}">pasuje ${ok}/${ms.length}</span>` : ''}</div>
    <div class="mc-d">${typeName}, ${b.year} r. · ogrzewanie: ${esc(b.heating)} · piwnica: ${b.basement ? 'tak' : 'nie'} · prąd: ${b.power ? 'tak' : 'nie'}</div>
    <div class="mc-n">${esc(b.note)}</div>
    ${ms.length ? '<ul class="mc-m">' + ms.map(m => `<li class="${m.ok ? 'ok' : 'no'}">${m.ok ? '✓' : '✗'} ${esc(GEO[m.geo].label)} <span>(${esc(CLUES[m.clue].title)})</span></li>`).join('') + '</ul>' : ''}
    <div class="mc-b"><button class="btn small primary" id="mc-go" ${dis ? 'disabled' : ''}>Wyślij patrol pod ten adres</button>
    ${st && st.recon ? `<button class="btn small" id="mc-rec" ${dis ? 'disabled' : ''}>Rekonesans: ${esc(st.name)}</button>` : ''}</div>`;
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
      html += `<div class="tool"><div class="tl-h"><b>${t.name}</b><span class="cost">⏱ ${t.cost} min / zapytanie</span></div><p>${t.desc}</p>
        <form class="tl-f" id="ewid-form"><input id="ewid-q" placeholder="np. imię i nazwisko" value="${esc(S.ui.ewidQ)}" autocomplete="off"><button class="btn small" ${dis ? 'disabled' : ''}>Szukaj</button></form></div>`;
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
          ${S.candidateRejected[m.id] ? '<div class="mr-x">wykluczona</div>' : (S.candidate && S.candidate.id === m.id) ? '<div class="mr-c">● wybrana kandydatka</div>' : `<button class="btn small" data-cand="${m.id}" ${dis ? 'disabled' : ''}>Wybierz jako kandydatkę</button>`}
        </div>`).join('')}</div></div>`;
      continue;
    }
    html += `<div class="tool ${!av ? 'locked' : ''} ${used ? 'used' : ''}"><div class="tl-h"><b>${t.name}</b><span class="cost">⏱ ${t.cost} min</span></div>
      <p>${t.desc}${t.id === 'rodzina' && S.candidate ? ` <b>Kandydatka: ${esc(S.candidate.name)}</b> (${esc(S.candidate.reporter)}).` : ''}</p>
      ${!av ? `<div class="lock">🔒 ${t.lock || ''}</div>` : used ? '<div class="done">✔ wykonano</div>' : `<button class="btn small" data-tool="${t.id}" ${dis || S.contact === 'paused' && false ? 'disabled' : ''}>Wykonaj</button>`}</div>`;
  }
  // zachowaj fokus pola tekstowego
  const act0 = document.activeElement, actK = act0 && (act0.id || act0.dataset.k), pos = act0 && act0.selectionStart;
  box.innerHTML = html;
  if (actK) { const e = actK === 'ewid-q' ? $('#ewid-q') : box.querySelector(`[data-k="${actK}"]`); if (e && e.tagName === 'INPUT') { e.focus(); try { e.setSelectionRange(pos, pos); } catch (x) { } } }
  box.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => useTool(b.dataset.tool));
  box.querySelectorAll('[data-cand]').forEach(b => b.onclick = () => setCandidate(b.dataset.cand));
  box.querySelectorAll('.mf select').forEach(s => s.onchange = () => { S.ui.mf[s.dataset.k] = s.value; renderTools(); });
  const kw = box.querySelector('.mf input');
  if (kw) kw.oninput = () => { S.ui.mf.kw = kw.value; clearTimeout(kw._t); kw._t = setTimeout(renderTools, 250); };
  const ef = $('#ewid-form');
  if (ef) { $('#ewid-q').oninput = e => S.ui.ewidQ = e.target.value; ef.onsubmit = e => { e.preventDefault(); ewidSearch($('#ewid-q').value); }; }
  const rbox = $('#results');
  rbox.innerHTML = S.ui.results.length ? S.ui.results.map(r => `<div class="res"><div class="res-h"><b>${esc(r.title)}</b><span>${fmtClock(r.t)}</span></div><pre>${esc(r.text)}</pre></div>`).join('') : '<p class="muted">Tu pojawią się wyniki zapytań.</p>';
}

function renderDispatch() {
  const box = $('#dispatch');
  if (!box || !S) return;
  const d = S.ui.dispatch, o = S.order;
  const dis = S.busy || !!S.decision || S.over || S.rescued || S.escaped || S.phase === 'ring';
  const optB = BUILDINGS.map(b => `<option value="b:${b.id}" ${d.target === 'b:' + b.id ? 'selected' : ''}>${esc(b.addr)}</option>`).join('');
  const optS = STREETS.filter(s => s.recon).map(s => `<option value="s:${s.id}" ${d.target === 's:' + s.id ? 'selected' : ''}>${esc(s.name)} (rekonesans)</option>`).join('');
  let status = '<span class="muted">w bazie, KPP Kalnów</span>';
  if (o) {
    const lbl = o.mode === 'rekon' ? 'rekonesans: ' + streetName(o.street) : BUILDINGS.find(b => b.id === o.target).addr;
    status = o.status === 'jedzie' ? `🚓 jedzie: ${esc(lbl)} · ETA ${Math.max(0, Math.ceil(o.eta - S.t))} min`
      : o.status === 'na_miejscu' ? `📍 na miejscu: ${esc(lbl)}`
      : o.status === 'wolny' ? `⏸ wolny, ${esc(streetName(o.onStreet))}` : '✔ działania zakończone';
  }
  const act0 = document.activeElement && document.activeElement.closest && document.activeElement.closest('#dispatch');
  if (act0 && document.activeElement.tagName === 'SELECT') return; // nie psuj otwartej listy
  box.innerHTML = `<label class="fl">Cel<select id="d-target" ${dis ? 'disabled' : ''}><option value="">— wybierz adres albo ulicę —</option><optgroup label="Interwencja pod adresem">${optB}</optgroup><optgroup label="Rekonesans ulicy (obserwacja z radiowozu)">${optS}</optgroup></select></label>
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
  const proto = [
    ['Lokalizacja przybliżona', has('bts') || has('pociag') || has('slod') || has('dzwon')],
    ['Lokalizacja dokładna', has('adres_ppe') || has('potwierdzony') || S.rescued],
    ['Co się stało', has('schody') || has('zagrozenie')],
    ['Stan poszkodowanej', has('glowa')],
    ['Zagrożenie na miejscu', has('zagrozenie')],
    ['Tożsamość', S.identity],
    ['Sprawca ustalony', has('krs') || has('ewid_marek') || has('straznik') || has('siostra')],
    ['Policja zadysponowana', !!S.order],
    ['ZRM zadysponowany', S.zrmSent],
  ];
  $('#protocol').innerHTML = proto.map(([l, ok]) => `<li class="${ok ? 'ok' : ''}">${ok ? '✓' : '○'} ${l}</li>`).join('');
  const perp = has('ewid_marek') || has('straznik') || has('siostra') ? 'prawdopodobnie Marek Wróbel (prezes fundacji)' : has('krs') ? 'możliwy związek: Marek Wróbel?' : has('glos') ? 'mężczyzna, spokojny głos' : 'nieznany';
  const health = [has('glowa') && 'uraz głowy, niepamięć', has('oddech') && 'duszność (astma?)', has('zimno') && 'wychłodzenie', has('rozpuszczalnik') && S.mistakes.some(m => m.includes('rozpuszczalnik')) && 'oparzenie chemiczne jamy ustnej'].filter(Boolean).join('; ') || '—';
  const ident = S.identity ? 'Maja Sikorska, ur. 2007, ul. Kasztanowa 3/7' : [has('wlosy') && 'rude włosy', has('twarz') && 'ok. 18–22 l.', has('tatuaz') && 'tatuaż łapki', has('bransoletka') && 'bransoletka M&O', has('bluza') && 'bluza Psia Przystań', has('majka') && 'imię: Majka?'].filter(Boolean).join(', ') || 'NN';
  box.innerHTML = `<dl class="kz">
    <dt>Nr zgłoszenia</dt><dd>${INCIDENT}</dd>
    <dt>Przyjęto</dt><dd>26.10.2026, 23:41 · kanał tekstowy</dd>
    <dt>Telefon</dt><dd>${PHONE}${has('sim') ? '<br>abonent: Fundacja Psia Przystań' : ''}</dd>
    <dt>Rodzaj</dt><dd>${has('schody') || has('zagrozenie') ? 'pozbawienie wolności (art. 189 kk), osoba ranna' : 'do ustalenia'}</dd>
    <dt>Poszkodowana</dt><dd>${esc(ident)}</dd>
    <dt>Stan</dt><dd>${esc(health)}</dd>
    <dt>Miejsce</dt><dd>${esc($('#caller-loc').textContent)}</dd>
    <dt>Sprawca</dt><dd>${esc(perp)}</dd>
    <dt>Kandydatka</dt><dd>${S.candidate ? esc(S.candidate.name) + (S.identity ? ' ✓' : ' (do weryfikacji)') : '—'}</dd>
  </dl>`;
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
  $('#decision').hidden = true;
  $('#composer').classList.remove('deciding');
  document.body.className = '';
  buildMap($('#map'));
  buildSketch($('#sketch'));
  $('#incident-no').textContent = INCIDENT;
  addBubble('sys', 'Nocna zmiana, stanowisko 3. Kolejka zgłoszeń pusta.');
  renderAll();
  setTimeout(() => { if (S.phase === 'ring') { addBubble('sys', 'Połączenie przychodzące na numer 112…'); sfx('ring'); } }, 1600);
  clearInterval(window._ringIv);
  window._ringIv = setInterval(() => { if (S && S.phase === 'ring') sfx('ring'); else clearInterval(window._ringIv); }, 3200);
}

function renderIntroEndings() {
  let got = [];
  try { got = JSON.parse(localStorage.getItem(ENDINGS_KEY) || '[]'); } catch (e) { }
  $('#intro-endings').innerHTML = `Odkryte zakończenia: <b>${got.length}/7</b>` + (got.length ? ' · ' + got.map(k => esc(ENDINGS[k].title)).join(' · ') : '');
}

setInterval(() => {
  if (!S || S.over || S.phase === 'ring') return;
  AUDIO.heartbeat(S.stress);
  if (S.busy || S.decision || document.hidden || S.phase === 'done') return;
  S.idleReal++;
  if (S.contact === 'active' && S.idleReal === 45 && S.idlePings < 3) {
    act(async () => { S.idlePings++; dS(+5); await her([pick(['jesteś tam?', 'halo?? jesteś?', 'prosze odpisz', 'nie zostawiaj mnie'])]); }, true);
    return;
  }
  if (SET.pressure && S.idleReal % 30 === 0) act(() => advance(1), true);
}, 1000);

document.addEventListener('keydown', e => {
  if (!S || !S.decision || !S.decision.key) return;
  if (/^[1-4]$/.test(e.key) && !(document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))) S.decision.key(+e.key);
});

window.addEventListener('DOMContentLoaded', () => {
  try { Object.assign(SET, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) { }
  $('#set-sound').checked = SET.sound; $('#set-pressure').checked = SET.pressure; $('#set-fast').checked = SET.fast;
  const saveSet = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch (e) { } };
  $('#set-sound').onchange = e => { SET.sound = e.target.checked; AUDIO.setOn(SET.sound); saveSet(); };
  $('#set-pressure').onchange = e => { SET.pressure = e.target.checked; saveSet(); };
  $('#set-fast').onchange = e => { SET.fast = e.target.checked; saveSet(); };
  $('#btn-start').onclick = startGame;
  $('#btn-sound').onclick = () => { SET.sound = !SET.sound; AUDIO.setOn(SET.sound); $('#btn-sound').textContent = SET.sound ? '🔊' : '🔇'; saveSet(); };
  $('#btn-help').onclick = () => $('#help').hidden = false;
  $('#help-close').onclick = () => $('#help').hidden = true;
  $('#help').onclick = e => { if (e.target.id === 'help') $('#help').hidden = true; };
  $$('#tool-tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  $$('#mnav button').forEach(b => b.onclick = () => { S.ui.mcol = b.dataset.col; renderTabs(); });
  $('#btn-map-expand').onclick = () => { $('#tab-mapa').classList.toggle('expanded'); $('#btn-map-expand').textContent = $('#tab-mapa').classList.contains('expanded') ? '✕ Zamknij' : '⤢ Powiększ'; };
  $('#btn-sound').textContent = SET.sound ? '🔊' : '🔇';
  renderIntroEndings();
});
