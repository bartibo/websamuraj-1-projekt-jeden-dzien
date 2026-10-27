'use strict';
/* =====================================================================
   Ekran startowy: plansze, „naciśnij klawisz”, menu, wybór sprawy,
   odprawa, wczytywanie i logowanie do systemu. Tło: key art z ruchem
   kamery, kurz na canvasie, ziarno filmu i muzyka z audio.js.
   ===================================================================== */
const FE_KEY = 'pjz_fe';          // sessionStorage: ekran do pokazania po przeładowaniu ze zmianą sprawy
const BOOT_KEY = 'pjz_boot';      // sessionStorage: plansze startowe już były
const LAST_KEY = 'pjz_last_case'; // localStorage: ostatnio rozpoczęta sprawa

const TIPS = [
  'Każda jej wiadomość zużywa baterię. Zanim zapytasz, zastanów się, czy odpowiedź coś zmieni.',
  'Spanikowana rozmówczyni odpowiada chaotycznie. Uspokojenie jej to też praca nad lokalizacją.',
  'Zaznacz na tablicy dwie poszlaki, które według ciebie się łączą. Pomyłka nic nie kosztuje.',
  'Wysłanie patrolu na ślepo kosztuje minuty. Najpierw zawęź mapę do jednego budynku.',
  'Bazy danych i telefony kosztują czas gry, ale nie baterię jej telefonu.',
  'Decyzja na czas nie czeka. Brak wyboru też jest wyborem.',
  'Przy każdej poszlace jest odnośnik do miejsca w rozmowie, w którym padła.',
  'Notatnik w zakładce Karta przydaje się, gdy poszlak robi się dużo.',
  'Syreny płoszą sprawcę. Czasem to dobrze, czasem nie.',
];
const FEED = [
  [34, 'Kalnów, ul. Lipowa', 'upadek z drabiny, uraz głowy', 'ZRM zadysponowany'],
  [29, 'DK 46, km 112', 'zderzenie dwóch samochodów', 'PSP, ZRM, Policja'],
  [23, 'os. Słoneczne', 'awantura domowa', 'przekazano Policji'],
  [18, 'Kalnów, ul. Kolejowa', 'zapach gazu na klatce schodowej', 'PSP w drodze'],
  [13, 'Borek, ul. Cmentarna', 'światło w oknach zamkniętego szpitala', 'bez dysponowania'],
  [8, 'Kalnów, ul. Polna', 'dziecko, gorączka 40°C', 'porada lekarza dyżurnego'],
  [3, 'numer zastrzeżony', 'połączenie bez głosu, 0:41', 'oddzwonienie: brak odpowiedzi'],
];
const HINTS = {
  boot: [['Esc', 'Pomiń']],
  menu: [['↑↓', 'Wybierz'], ['Enter', 'Zatwierdź'], ['Esc', 'Wstecz']],
  cases: [['←→', 'Sprawa'], ['Enter', 'Wybierz'], ['Esc', 'Menu']],
  brief: [['↑↓', 'Wybierz'], ['Enter', 'Zatwierdź'], ['Esc', 'Sprawy']],
};

const gotEndings = id => { try { return JSON.parse(localStorage.getItem(caseEndingsKey(id)) || '[]'); } catch (e) { return []; } };
const endingsTotal = c => c.id === CASE.id ? Object.keys(ENDINGS).length : c.endings;
const casesWord = n => n === 1 ? 'sprawa' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'sprawy' : 'spraw';

const FRONT = {
  cur: null, panel: null, art: null, artOn: 'a', audioOk: false, afterPress: 'menu',
  mx: 0, my: 0, sx: 0, sy: 0, parts: [], fxRun: false, moveT: 0, feedI: 0,

  init() {
    const meta = CASES.find(c => c.id === CASE.id);
    document.title = `${meta.title} – Operator 112`;
    document.body.dataset.case = CASE.id;
    this.bindSettings();
    this.renderBrief(); this.renderCases(); this.renderMenu();

    const intro = $('#intro');
    document.addEventListener('keydown', e => this.onKey(e));
    intro.addEventListener('click', e => this.onClick(e));
    intro.addEventListener('mousemove', e => { this.mx = e.clientX / innerWidth - 0.5; this.my = e.clientY / innerHeight - 0.5; });
    // najechanie myszą = zaznaczenie, jak w menu na padzie
    intro.addEventListener('mouseover', e => {
      const el = e.target.closest('.fe-item, .fe-card:not(.locked), .fe-cta, .fe-backlink, .fe-x, .fa-go');
      if (el && document.activeElement !== el && matchMedia('(hover: hover)').matches) el.focus({ preventScroll: true });
    });
    intro.addEventListener('focusin', e => {
      const el = e.target;
      if (!el.matches('.fe-item, .fe-card, .fe-cta, .fe-backlink, .fe-x, .fa-go, input')) return;
      const now = performance.now();
      if (now - this.moveT > 50) sfx('ui_move');
      this.moveT = now;
      if (el.matches('.fe-card[data-case]')) this.setArt(`sprawy/${el.dataset.case}/intro.jpg`);
    });
    $$('#fe-nav .fe-item').forEach(b => b.onclick = () => this.nav(b.dataset.go));
    $$('[data-back]').forEach(b => b.onclick = e => { e.stopPropagation(); this.back(); });
    $('#btn-start').onclick = e => { e.stopPropagation(); this.login(); };
    $('#set-adult').onchange = () => this.gate();

    setInterval(() => this.tickClock(), 1000); this.tickClock();
    setInterval(() => this.tickFeed(), 4800); this.tickFeed();
    this.applyFx();

    const flag = sessionStorage.getItem(FE_KEY);
    sessionStorage.removeItem(FE_KEY);
    if (new URLSearchParams(location.search).has('sprawa')) this.afterPress = 'brief';
    if (flag === 'brief') this.show('load');
    else if (flag === 'archive') { this.show('menu'); this.openPanel('archive'); }
    else if (!sessionStorage.getItem(BOOT_KEY)) this.show('boot');
    else this.show('press');
    requestAnimationFrame(() => requestAnimationFrame(() => intro.classList.add('ready')));
  },

  /* powrót z raportu końcowego */
  reenter() {
    $('#intro').hidden = false;
    this.renderBrief(); this.renderCases(); this.renderMenu();
    this.show('menu');
    this.music(); this.fxStart();
  },

  bindSettings() {
    const save = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch (e) { } };
    $('#set-music').checked = SET.music; $('#set-fx').checked = SET.fx;
    $('#set-sound').addEventListener('change', () => this.music());
    $('#set-music').onchange = e => { SET.music = e.target.checked; save(); this.music(); };
    $('#set-fx').onchange = e => { SET.fx = e.target.checked; save(); this.applyFx(); };
  },

  applyFx() {
    $('#intro').classList.toggle('nofx', !SET.fx);
    if (SET.fx) this.fxStart();
    else { $('.fe-bg').style.transform = ''; const c = $('#fe-fx'); c.getContext('2d').clearRect(0, 0, c.width, c.height); }
  },

  unlockAudio() {
    AUDIO.init(); AUDIO.setOn(SET.sound);
    this.audioOk = true;
    this.music();
  },
  music() {
    if (!this.audioOk) return;
    AUDIO.menuMusic(SET.sound && SET.music && !$('#intro').hidden && this.cur !== 'login');
  },

  /* ---------- przełączanie ekranów ---------- */
  show(id) {
    const prev = this.cur;
    this.cur = id;
    $('#intro').dataset.fe = id;
    $$('.fe-screen').forEach(s => s.classList.toggle('on', s.id === 'fe-' + id));
    this.setArt(id === 'boot' ? null : id === 'brief' || id === 'load' ? CASE.intro.image : 'img/keyart.jpg');
    if (id !== 'menu') this.closePanel(true);
    this.renderHints();
    if (prev && prev !== 'boot' && prev !== 'press' && id !== 'load') sfx('whoosh');
    if (id === 'boot') this.boot();
    if (id === 'load') this.load();
    if (id === 'menu') { this.renderMenu(); this.tickFeed(); }
    setTimeout(() => this.focusFirst(), 80);
  },

  setArt(src) {
    const url = src ? `url("${new URL(src, location.href).href}")` : 'none';
    if (url === this.art) return;
    this.art = url;
    const next = this.artOn === 'a' ? 'b' : 'a';
    $('#fe-art-' + next).style.backgroundImage = url;
    $('#fe-art-' + next).classList.add('on');
    $('#fe-art-' + this.artOn).classList.remove('on');
    this.artOn = next;
  },

  boot() {
    sessionStorage.setItem(BOOT_KEY, '1');
    const steps = [['#boot-0', 300, 2600], ['#boot-1', 3000, 3400]];
    this.bootT = steps.map(([sel, at, d]) => setTimeout(() => { const el = $(sel); el.style.setProperty('--d', d + 'ms'); el.classList.add('on'); }, at));
    this.bootT.push(setTimeout(() => this.skipBoot(), 6500));
  },
  skipBoot() {
    if (this.cur !== 'boot') return;
    (this.bootT || []).forEach(clearTimeout);
    $$('.boot-card').forEach(c => c.classList.remove('on'));
    this.show('press');
  },

  pressed() {
    this.unlockAudio();
    sfx('braam');
    const intro = $('#intro');
    intro.classList.remove('hit'); void intro.offsetWidth; intro.classList.add('hit');
    this.show(this.afterPress);
  },

  load() {
    const meta = CASES.find(c => c.id === CASE.id);
    $('#load-no').textContent = `Wczytywanie · sprawa ${meta.no}`;
    $('#load-title').textContent = meta.title;
    $('#load-tip').textContent = pick(TIPS);
    $('#load-press').hidden = true;
    this.loadReady = false;
    const bar = $('#load-bar');
    bar.style.transition = 'none'; bar.style.width = '0';
    void bar.offsetWidth;
    bar.style.transition = 'width 1.8s cubic-bezier(.3,.1,.2,1)'; bar.style.width = '100%';
    clearTimeout(this.loadT);
    this.loadT = setTimeout(() => { this.loadReady = true; $('#load-press').hidden = false; }, 1900);
  },

  /* ---------- menu ---------- */
  nav(go) {
    if (go === 'continue') { sfx('ui_ok'); this.pickCase(this.lastCase()); return; }
    if (go === 'cases') { sfx('ui_ok'); this.show('cases'); return; }
    if (this.panel === go) { this.closePanel(); return; }
    this.openPanel(go);
  },
  lastCase() {
    let id = null;
    try { id = localStorage.getItem(LAST_KEY); } catch (e) { }
    return CASES.some(c => c.id === id) ? id : null;
  },
  renderMenu() {
    const last = this.lastCase(), c = CASES.find(x => x.id === last);
    $('#fe-continue').hidden = !c;
    if (c) $('#fe-continue-sub').textContent = `Sprawa ${c.no} · ${c.title}`;
    const got = CASES.reduce((n, x) => n + gotEndings(x.id).length, 0), tot = CASES.reduce((n, x) => n + endingsTotal(x), 0);
    $('#fe-archive-sub').textContent = `Odkryte zakończenia: ${got}/${tot}`;
  },
  openPanel(name) {
    sfx('ui_ok');
    this.panel = name;
    $('#fe-panel').hidden = false;
    $('#intro').classList.add('panel-open');
    $$('#fe-panel .fp').forEach(p => p.hidden = p.id !== 'fp-' + name);
    $$('#fe-nav .fe-item').forEach(b => b.classList.toggle('act', b.dataset.go === name));
    if (name === 'archive') this.renderArchive();
    $('#fe-panel').scrollTop = 0;
    // na telefonie panel zasłania menu, więc fokus idzie do panelu; na komputerze zostaje w menu
    if (innerWidth <= 760 || name === 'settings') setTimeout(() => (this.list()[0] || $('#fe-panel .fe-x')).focus({ preventScroll: true }), 60);
  },
  closePanel(silent) {
    if (!this.panel) return;
    const was = this.panel;
    this.panel = null;
    $('#fe-panel').hidden = true;
    $('#intro').classList.remove('panel-open');
    $$('#fe-nav .fe-item').forEach(b => b.classList.remove('act'));
    if (!silent) { sfx('ui_back'); const b = $(`#fe-nav [data-go="${was}"]`); if (b) b.focus({ preventScroll: true }); }
  },
  renderArchive() {
    $('#fe-archive').innerHTML = CASES.map(c => {
      const got = gotEndings(c.id), tot = endingsTotal(c), here = c.id === CASE.id;
      const list = here ? `<ul class="fa-list">${Object.entries(ENDINGS).map(([k, en]) => got.includes(k)
        ? `<li class="got">${esc(en.title)}</li>` : '<li class="lock">Nieodkryte zakończenie</li>').join('')}</ul>`
        : `<button class="fa-go" data-case="${c.id}">Pokaż zakończenia tej sprawy ›</button>`;
      return `<section class="fa-case"><header><small>Sprawa ${c.no}</small><b>${esc(c.title)}</b><span>${got.length}/${tot}</span></header>
        <div class="fc-prog"><i style="width:${got.length / tot * 100}%"></i></div>${list}</section>`;
    }).join('');
    $$('#fe-archive .fa-go').forEach(b => b.onclick = () => this.go(b.dataset.case, 'archive'));
  },

  /* ---------- wybór sprawy ---------- */
  renderCases() {
    const next = String(CASES.length + 1).padStart(2, '0');
    $('#fe-cards').innerHTML = CASES.map(c => {
      const got = gotEndings(c.id).length, tot = endingsTotal(c);
      return `<button class="fe-card${c.adult ? ' adult' : ''}" data-case="${c.id}" style="--art:url('${new URL(`sprawy/${c.id}/intro.jpg`, location.href).href}')">
        <span class="fc-art"></span><span class="fc-no">${c.no}</span>${c.adult ? '<span class="fc-18">18+</span>' : ''}
        <span class="fc-body"><small>Sprawa ${c.no}</small><b>${esc(c.title)}</b><em>${esc(c.tagline)}</em>
          <span class="fc-meta"><span>${esc(c.place)}</span><span>${esc(c.when)}</span><span>${esc(c.length)}</span></span>
          <span class="fc-prog"><i style="width:${got / tot * 100}%"></i></span>
          <span class="fc-end">Zakończenia ${got}/${tot}${got === tot ? ' · komplet' : ''}</span></span></button>`;
    }).join('') + `<div class="fe-card locked" aria-hidden="true"><span class="fc-art"></span><span class="fc-no">${next}</span>
      <span class="fc-body"><small>Sprawa ${next}</small><b>Wkrótce</b><em>Kolejne zgłoszenie czeka już w kolejce.</em></span></div>`;
    $$('#fe-cards .fe-card[data-case]').forEach(b => b.onclick = () => { sfx('ui_ok'); this.pickCase(b.dataset.case); });
  },
  pickCase(id) {
    if (id === CASE.id) this.show('brief');
    else this.go(id, 'brief');
  },
  /* inna sprawa = inne pliki fabuły, więc przeładowanie strony z ekranem wczytywania */
  go(id, screen) {
    sessionStorage.setItem(FE_KEY, screen);
    sfx('whoosh');
    AUDIO.menuMusic(false);
    $('#intro').classList.add('leaving');
    setTimeout(() => { location.search = '?sprawa=' + id; }, 450);
  },

  /* ---------- odprawa ---------- */
  renderBrief() {
    const I = CASE.intro, meta = CASES.find(c => c.id === CASE.id), got = gotEndings(CASE.id), tot = Object.keys(ENDINGS).length;
    $('#brief-no').innerHTML = meta.no + (meta.adult ? '<i>18+</i>' : '');
    $('#intro-kicker').textContent = I.kicker;
    $('#intro-title').textContent = meta.title;
    $('#intro-lead').innerHTML = I.lead.map(p => `<p class="intro-lead">${p}</p>`).join('');
    $('#brief-meta').innerHTML = [['Dyżur', I.shift.split(' · ')[0]], ['Miejsce', meta.place], ['Czas gry', meta.length], ['Zakończenia', `${got.length}/${tot}`]]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
    $('#intro-warn').textContent = I.warn;
    $('#intro-endings').innerHTML = got.length ? 'Odkryte: ' + got.map(k => esc(ENDINGS[k].title)).join(' · ') : '';
    $('#age-gate').hidden = !meta.adult;
    this.gate();
  },
  gate() {
    const meta = CASES.find(c => c.id === CASE.id);
    $('#btn-start').disabled = !!meta.adult && !$('#set-adult').checked;
  },

  /* logowanie do systemu, potem konsola */
  login() {
    if ($('#btn-start').disabled) return;
    try { localStorage.setItem(LAST_KEY, CASE.id); } catch (e) { }
    this.unlockAudio();
    this.cur = 'login';
    AUDIO.menuMusic(false);
    sfx('ui_ok');
    const lines = ['SWD PRM 4.2 · Centrum Powiadamiania Ratunkowego Kalnów', '',
      'uwierzytelnianie operatora OP-03 ........ OK', 'zestaw słuchawkowy, stanowisko 03 ....... OK',
      'łącze 112, kanał tekstowy ............... OK', 'mapa i ewidencja ........................ OK', '',
      `dyżur ${CASE.intro.shift}`, 'kolejka zgłoszeń: 0 oczekujących', '', '> zalogowano'];
    const box = $('#fe-login'), log = $('#fe-login-log');
    box.hidden = false; log.textContent = '';
    let i = 0, over = false;
    const done = () => {
      if (over) return;
      over = true; clearTimeout(this.loginT);
      box.classList.add('out');
      setTimeout(() => { box.hidden = true; box.classList.remove('out'); this.loginDone = null; startGame(); }, 350);
    };
    const step = () => {
      if (i >= lines.length) { this.loginT = setTimeout(done, 650); return; }
      log.textContent += lines[i++] + '\n';
      if (lines[i - 1]) sfx('tick');
      this.loginT = setTimeout(step, lines[i - 1] ? 150 : 60);
    };
    this.loginDone = done;
    step();
  },

  /* ---------- sterowanie ---------- */
  back() {
    if (this.cur === 'menu' && this.panel) { this.closePanel(); return; }
    const to = { menu: 'press', cases: 'menu', brief: 'cases' }[this.cur];
    if (!to) return;
    sfx('ui_back');
    this.show(to);
  },
  list() {
    const vis = el => !el.closest('[hidden]') && el.offsetParent !== null;
    let sel;
    if (this.cur === 'menu') sel = this.panel ? '#fe-panel .fp:not([hidden]) input, #fe-panel .fp:not([hidden]) button' : '#fe-nav .fe-item';
    else if (this.cur === 'cases') sel = '#fe-cards .fe-card[data-case]';
    else if (this.cur === 'brief') sel = '#fe-brief input, #fe-brief .fe-cta, #fe-brief .fe-backlink';
    return sel ? $$(sel).filter(vis) : [];
  },
  focusFirst() {
    if (!['menu', 'cases', 'brief'].includes(this.cur) || $('#intro').hidden) return;
    if (this.cur === 'menu' && this.panel) return;
    if (!matchMedia('(hover: hover)').matches && this.cur !== 'menu') return; // na dotyku bez sztucznego fokusu
    let el = this.list()[0];
    if (this.cur === 'cases') el = $(`#fe-cards [data-case="${CASE.id}"]`) || el;
    if (this.cur === 'brief') el = $('#btn-start').disabled ? $('#set-adult') : $('#btn-start');
    if (el && matchMedia('(hover: hover)').matches) el.focus({ preventScroll: true });
  },
  move(dir) {
    const L = this.list();
    if (!L.length) return;
    const i = L.indexOf(document.activeElement);
    const el = L[i < 0 ? 0 : (i + dir + L.length) % L.length];
    el.focus({ preventScroll: false });
  },
  onKey(e) {
    if ($('#intro').hidden || e.ctrlKey || e.altKey || e.metaKey) return;
    const k = e.key;
    if (this.cur === 'login') { if (this.loginDone) this.loginDone(); return; }
    if (this.cur === 'boot') { this.skipBoot(); return; }
    if (this.cur === 'press') { if (!['Shift', 'Tab', 'CapsLock'].includes(k)) { e.preventDefault(); this.pressed(); } return; }
    if (this.cur === 'load') { if (this.loadReady) { e.preventDefault(); this.unlockAudio(); this.show('brief'); } return; }
    if (!this.audioOk) this.unlockAudio();
    if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); this.back(); return; }
    const vertical = this.cur !== 'cases';
    const dir = { ArrowDown: vertical ? 1 : 0, ArrowUp: vertical ? -1 : 0, ArrowRight: vertical ? 0 : 1, ArrowLeft: vertical ? 0 : -1 }[k];
    if (dir) { e.preventDefault(); this.move(dir); return; }
    if (k === 'ArrowRight' && this.cur === 'menu' && !this.panel) { const a = document.activeElement; if (a && a.dataset.go) { e.preventDefault(); a.click(); } return; }
    if (k === 'ArrowLeft' && this.cur === 'menu' && this.panel) { e.preventDefault(); this.closePanel(); return; }
    if (k === 'Enter') {
      const a = document.activeElement;
      if (a && a.type === 'checkbox') { e.preventDefault(); a.click(); }
      else if (!a || a === document.body || !$('#intro').contains(a)) { e.preventDefault(); this.focusFirst(); }
    }
  },
  onClick(e) {
    if (this.cur === 'login') { if (this.loginDone) this.loginDone(); return; }
    if (this.cur === 'boot') { this.skipBoot(); return; }
    if (this.cur === 'press') { this.pressed(); return; }
    if (this.cur === 'load') { if (this.loadReady) { this.unlockAudio(); this.show('brief'); } return; }
    if (!this.audioOk) this.unlockAudio();
    // klik w puste tło menu zamyka panel
    if (this.cur === 'menu' && this.panel && !e.target.closest('.fe-panel, .fe-nav')) this.closePanel();
  },

  renderHints() {
    const keys = (HINTS[this.cur] || []).map(([k, t]) => `<span><kbd>${k}</kbd>${t}</span>`).join('');
    $('#fe-hints').innerHTML = `<span>wersja 1.3 · ${CASES.length} ${casesWord(CASES.length)}</span><span class="fh-keys">${keys}</span>`;
  },

  /* ---------- żywe tło: zegar, kolejka zgłoszeń, kurz ---------- */
  tickClock() {
    if ($('#intro').hidden) return;
    const d = new Date();
    $('#fe-clock').textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
  },
  tickFeed() {
    if ($('#intro').hidden || this.cur !== 'menu') return;
    const [ago, where, what, status] = FEED[this.feedI++ % FEED.length];
    const t = new Date(Date.now() - ago * 60000), hm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
    const p = $('#fe-feed-line');
    p.classList.add('out');
    setTimeout(() => { p.innerHTML = `${hm} · <b>${esc(where)}</b><br>${esc(what)} · ${esc(status)}`; p.classList.remove('out'); }, 400);
  },
  fxStart() {
    if (this.fxRun || !SET.fx || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.fxRun = true;
    requestAnimationFrame(() => this.fxTick());
  },
  fxTick() {
    if ($('#intro').hidden || !SET.fx) { this.fxRun = false; return; }
    const c = $('#fe-fx'), dpr = Math.min(1.5, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) {
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      const n = W < 700 ? 34 : 70;
      this.parts = Array.from({ length: n }, () => {
        const z = 0.3 + Math.random() * 0.9;
        return { x: Math.random() * W, y: Math.random() * H, z, r: 0.5 + z * 1.6, vx: (Math.random() - 0.5) * 0.12 * z, vy: -(0.04 + Math.random() * 0.16) * z, a: 0.06 + Math.random() * 0.22, ph: Math.random() * 6.3 };
      });
    }
    this.sx += (this.mx - this.sx) * 0.04; this.sy += (this.my - this.sy) * 0.04;
    $('.fe-bg').style.transform = `translate3d(${(-this.sx * 26).toFixed(1)}px, ${(-this.sy * 16).toFixed(1)}px, 0)`;
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    for (const p of this.parts) {
      p.x += p.vx; p.y += p.vy; p.ph += 0.012;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      const x = p.x - this.sx * 60 * p.z, y = p.y - this.sy * 36 * p.z;
      g.fillStyle = `rgba(255,214,165,${(p.a * (0.6 + 0.4 * Math.sin(p.ph))).toFixed(3)})`;
      g.beginPath(); g.arc(x, y, p.r, 0, 6.283); g.fill();
    }
    requestAnimationFrame(() => this.fxTick());
  },
};
