'use strict';
/* Interfejs: ekrany menu, wybór postaci i areny, lista ciosów, sterowanie, opcje, pauza, wyniki. */

const Settings = {
  wins: Store.get('wins', 2),
  time: Store.get('time', 99),
  cpu: Store.get('cpu', 1),
  finishers: Store.get('fin', true),
};

const $ = id => document.getElementById(id);

const KEYS_UP = ['ArrowUp', 'KeyW'], KEYS_DOWN = ['ArrowDown', 'KeyS'];
const KEYS_LEFT = ['ArrowLeft', 'KeyA'], KEYS_RIGHT = ['ArrowRight', 'KeyD'];
const KEYS_OK = ['Enter', 'Space', 'NumpadEnter', 'KeyT', 'KeyO', 'Numpad4'];
const KEYS_BACK = ['Escape', 'Backspace'];

function btnText(b) {
  if (b === 'P') return 'Ł';
  if (b === 'K') return 'K';
  return BTN_LABEL[b];
}

function specialInput(s) {
  if (s.motion === 'down') return `w powietrzu ↓+${btnText(s.btn)}`;
  return `${motionGlyph(s.motion)}+${btnText(s.btn)}` + (s.air === true ? ' (też w powietrzu)' : '');
}

// ten sam ruch przyciskiem specjalnym (ch.easy: n, f, b, d, airN, airD)
const EASY_GLYPH = { n: 'SP', f: '→+SP', b: '←+SP', d: '↓+SP' };
function easyInput(ch, s) {
  const e = ch.easy || {};
  const k = Object.keys(EASY_GLYPH).find(k => e[k] === s.id);
  if (k) return EASY_GLYPH[k];
  if (e.airD === s.id) return 'w powietrzu ↓+SP';
  return null;
}

const UI = {
  screen: null, prev: [], focus: 0, sel: null, mlTab: 0, t: 0,

  init() {
    document.querySelectorAll('[data-act]').forEach(b => {
      b.addEventListener('click', () => { Sfx.unlock(); this.act(b.dataset.act); });
      // mousemove, nie mouseenter: przycisk pod ukrytym w walce kursorem nie łapie wyboru, gdy pojawia się pauza
      b.addEventListener('mousemove', () => this.setFocusEl(b));
    });
    $('scr-title').addEventListener('click', () => { Sfx.unlock(); this.go('menu'); this.greet(); });
    this.buildCards();
    this.buildStages();
    this.buildControls();
    this.show('title');
  },

  // ---------------- nawigacja ----------------
  show(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('show'));
    this.screen = name;
    this.shownAt = performance.now();
    const el = $('scr-' + name);
    if (el) el.classList.add('show');
    document.body.classList.toggle('in-menu', name !== 'fight');
    document.body.classList.toggle('in-fight', name === 'fight');
    this.focus = 0;
    this.updateFocus();
    if (name === 'menu' || name === 'title') { Music.play('menu'); App.ensureDemo(); }
  },

  go(name) { this.prev.push(this.screen); this.show(name); if (name === 'options') this.buildOptions(); if (name === 'movelist') this.buildMovelist(); },
  // komentator wita przy pierwszym wejściu do menu
  // (z opóźnieniem: dźwięk włącza się tym samym naciśnięciem, a nagrania potrzebują chwili na dekodowanie)
  greet() { if (!this.greeted) { this.greeted = true; setTimeout(() => Voice.line('title', 'Kapibara Kombat!'), 450); } },
  back() {
    const p = this.prev.pop() || 'menu';
    this.show(p);
    Sfx.play('back');
  },

  items() {
    const el = $('scr-' + this.screen);
    if (!el) return [];
    if (this.screen === 'select' && this.sel && this.sel.phase === 'stage') return [...el.querySelectorAll('.stage-card')];
    return [...el.querySelectorAll('.btn, .opt')];
  },
  updateFocus() {
    const it = this.items();
    it.forEach((e, i) => e.classList.toggle('focus', i === this.focus));
  },
  setFocusEl(el) {
    const i = this.items().indexOf(el);
    if (i >= 0 && i !== this.focus) { this.focus = i; this.updateFocus(); }
  },
  moveFocus(d) {
    const n = this.items().length;
    if (!n) return;
    this.focus = (this.focus + d + n) % n;
    this.updateFocus();
    Sfx.play('move');
  },

  toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => t.classList.remove('show'), 1800);
  },

  // ---------------- akcje przycisków ----------------
  act(a) {
    Sfx.play('confirm');
    switch (a) {
      case 'versus': case 'cpu': case 'training': case 'arcade': this.startSelect(a); break;
      case 'movelist': this.mlTab = 0; this.go('movelist'); break;
      case 'controls': this.go('controls'); break;
      case 'options': this.go('options'); break;
      case 'resume': this.resume(); break;
      case 'pmovelist': {
        const g = App.game;
        this.mlTab = g ? CHARACTERS.indexOf(g.fighters[0].ch) : 0;
        this.go('movelist');
        break;
      }
      case 'pcontrols': this.go('controls'); break;
      case 'restart': App.startFight(App.lastFight); break;
      case 'quit': App.quit(); break;
      case 'rematch': App.startFight(App.lastFight); break;
      case 'reselect': App.game = null; this.prev = ['menu']; this.startSelect(App.lastFight.mode); break;
    }
  },

  pause() {
    if (!App.game || App.game.over) return;
    this.prev = [];
    this.show('pause');
    Music.setPaused(true);
    Voice.stop();
    App.game.fighters.forEach(f => CapyVoice.stop(f));
  },
  resume() {
    this.prev = []; this.show('fight');
    Music.setPaused(false);
    Keys.hit.clear();   // klawisz, którym wznowiono, nie zadaje od razu ciosu
  },

  // ---------------- klawisze ----------------
  key(code) {
    const s = this.screen;
    const isUp = KEYS_UP.includes(code), isDown = KEYS_DOWN.includes(code);
    const isLeft = KEYS_LEFT.includes(code), isRight = KEYS_RIGHT.includes(code);
    let isOk = KEYS_OK.includes(code);
    const isBack = KEYS_BACK.includes(code);
    // Pauza i wyniki pojawiają się w środku walki, gdy obaj gracze jeszcze wciskają klawisze ciosów:
    // przez chwilę nic nie reagują, a zatwierdza tylko Enter lub Spacja
    if (s === 'ladder' && performance.now() - this.shownAt < 450) return;
    if (s === 'pause' || s === 'results') {
      if (performance.now() - this.shownAt < 450) return;
      isOk = code === 'Enter' || code === 'Space' || code === 'NumpadEnter';
    }

    if (s === 'title') { if (isOk || isBack || code.startsWith('Key')) { this.go('menu'); this.greet(); } return; }
    if (s === 'fight') {
      if (code === 'Escape') this.pause();
      else if (App.game && App.game.training) App.game.trainingKey(code);
      return;
    }
    if (s === 'select') return this.selectKey(code);
    if (s === 'movelist') {
      if (isLeft || isRight) { this.mlTab = (this.mlTab + (isRight ? 1 : -1) + CHARACTERS.length + 1) % (CHARACTERS.length + 1); this.buildMovelist(); Sfx.play('move'); }
      else if (isUp || isDown) $('ml-body').scrollBy({ top: isDown ? 140 : -140, behavior: 'smooth' });
      else if (isBack || isOk) this.back();
      return;
    }
    if (s === 'controls') { if (isBack || isOk) this.back(); return; }
    if (s === 'options') {
      if (isUp) this.moveFocus(-1);
      else if (isDown) this.moveFocus(1);
      else if (isLeft || isRight || isOk) this.changeOption(this.focus, isLeft ? -1 : 1);
      else if (isBack) this.back();
      return;
    }
    if (s === 'pause' && code === 'Escape') { this.resume(); return; }
    if (s === 'menu' && isBack) { this.show('title'); return; }
    if (isUp || (s === 'results' && isLeft)) this.moveFocus(-1);
    else if (isDown || (s === 'results' && isRight)) this.moveFocus(1);
    else if (isOk) { const el = this.items()[this.focus]; if (el) el.click(); }
  },

  // ---------------- wybór postaci ----------------
  buildCards() {
    const row = $('sel-cards');
    row.innerHTML = '';
    this.cardCanvases = CHARACTERS.map((ch, i) => {
      const d = document.createElement('div');
      d.className = 'sel-card';
      d.innerHTML = `<canvas width="300" height="340"></canvas><div class="nm">${ch.name}</div>`;
      d.addEventListener('click', () => this.selectClick(i));
      row.appendChild(d);
      return d;
    });
    ['sel-p1', 'sel-p2'].forEach(id => {
      $(id).innerHTML = `<canvas width="420" height="460"></canvas><div class="sel-info"></div>`;
    });
  },

  buildStages() {
    const row = $('stage-cards');
    row.innerHTML = '';
    const opts = STAGES.map((s, i) => ({ name: s.name, sub: s.sub, i })).concat([{ name: 'Losowa', sub: 'niech zdecyduje los', i: -1 }]);
    opts.forEach(o => {
      const d = document.createElement('div');
      d.className = 'stage-card';
      d.innerHTML = `<canvas width="440" height="248"></canvas><div>${o.name}<small>${o.sub}</small></div>`;
      d.addEventListener('click', () => { this.focus = opts.indexOf(o); this.updateFocus(); this.pickStage(); });
      d.addEventListener('mouseenter', () => { if (this.sel && this.sel.phase === 'stage') this.setFocusEl(d); });
      row.appendChild(d);
      const ctx = d.querySelector('canvas').getContext('2d');
      if (o.i >= 0) {
        const st = new Stage(STAGES[o.i]);
        st.t = 300;
        ctx.scale(440 / VW, 248 / VH);
        st.drawBack(ctx, { x: STAGE_W / 2, zoom: 1.3, lift: 0 }, null);
        ctx.setTransform(440 / VW, 0, 0, 248 / VH, 0, 0);
        st.drawFront(ctx, { x: STAGE_W / 2 });
      } else {
        const g = ctx.createLinearGradient(0, 0, 440, 248);
        g.addColorStop(0, '#3a1d0d'); g.addColorStop(1, '#7a3a12');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 440, 248);
        ctx.font = "120px 'Lilita One', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffd23f'; ctx.fillText('?', 220, 130);
      }
    });
  },

  startSelect(mode) {
    this.prev = ['menu'];
    this.sel = {
      mode, cur: [0, 1], done: [false, false], phase: 'chars',
      cpu: Settings.cpu,
    };
    $('sel-stage').hidden = true;
    $('sel-cards').style.display = '';
    this.show('select');
    this.updateSelect();
    Voice.line('choose', null, { ifQuiet: true });
  },

  selActive() {
    // który gracz teraz wybiera (dla trybu z komputerem i treningu obie postacie wybiera gracz 1)
    const s = this.sel;
    if (s.mode === 'versus') return null;
    return s.done[0] ? 1 : 0;
  },

  selectKey(code) {
    const s = this.sel;
    if (s.phase === 'stage') {
      if (KEYS_LEFT.includes(code) || KEYS_UP.includes(code)) this.moveFocus(-1);
      else if (KEYS_RIGHT.includes(code) || KEYS_DOWN.includes(code)) this.moveFocus(1);
      else if (KEYS_OK.includes(code)) this.pickStage();
      else if (KEYS_BACK.includes(code) || code === 'KeyG' || code === 'KeyL') {
        s.phase = 'chars'; s.done[1] = false;
        if (s.mode === 'versus') s.done[0] = s.done[0];
        $('sel-stage').hidden = true; $('sel-cards').style.display = '';
        this.updateSelect(); Sfx.play('back');
      }
      return;
    }
    const n = CHARACTERS.length;
    const move = (p, d) => { if (!s.done[p]) { s.cur[p] = (s.cur[p] + d + n) % n; Sfx.play('move'); this.updateSelect(); } };
    const ok = p => {
      if (s.done[p]) return;
      s.done[p] = true;
      Sfx.play('confirm');
      Sfx.squeak(CHARACTERS[s.cur[p]].look.voice, 0.18, 0.2);
      Voice.line('name_' + CHARACTERS[s.cur[p]].id, CHARACTERS[s.cur[p]].name, { pitch: 0.7, rate: 1.1 });
      this.updateSelect();
      if (s.mode === 'arcade') { setTimeout(() => Ladder.start(s.cur[0]), 350); return; }
      if (s.done[0] && s.done[1]) this.toStage();
    };
    const back = p => {
      if (s.done[p]) { s.done[p] = false; Sfx.play('back'); this.updateSelect(); return true; }
      return false;
    };

    if (s.mode === 'versus') {
      if (code === 'KeyA') move(0, -1);
      else if (code === 'KeyD') move(0, 1);
      else if (code === 'KeyT' || code === 'KeyY') ok(0);
      else if (code === 'KeyG' || code === 'KeyH') back(0);
      else if (code === 'ArrowLeft') move(1, -1);
      else if (code === 'ArrowRight') move(1, 1);
      else if (code === 'KeyO' || code === 'KeyP' || code === 'Numpad4') ok(1);
      else if (code === 'KeyL' || code === 'Semicolon' || code === 'Numpad1') back(1);
      else if (code === 'Enter' || code === 'Space') ok(s.done[0] ? 1 : 0);
      else if (code === 'Escape' || code === 'Backspace') { if (!back(1) && !back(0)) { this.prev = []; this.show('menu'); } }
      return;
    }
    const p = this.selActive();
    if (KEYS_LEFT.includes(code)) move(p, -1);
    else if (KEYS_RIGHT.includes(code)) move(p, 1);
    else if (p === 1 && s.mode === 'cpu' && (KEYS_UP.includes(code) || KEYS_DOWN.includes(code))) {
      s.cpu = clamp(s.cpu + (KEYS_UP.includes(code) ? 1 : -1), 0, 3);
      Settings.cpu = s.cpu; Store.set('cpu', s.cpu);
      Sfx.play('move'); this.updateSelect();
    } else if (KEYS_OK.includes(code) || code === 'KeyY') ok(p);
    else if (KEYS_BACK.includes(code) || code === 'KeyG') {
      if (!back(p === 1 && !s.done[1] ? 0 : p)) { this.prev = []; this.show('menu'); }
    }
  },

  selectClick(i) {
    const s = this.sel;
    if (!s || s.phase !== 'chars') return;
    const p = s.mode === 'versus' ? (s.done[0] ? 1 : 0) : this.selActive();
    if (s.done[p]) return;
    s.cur[p] = i;
    this.updateSelect();
    this.selectKey(p === 0 ? 'KeyT' : (s.mode === 'versus' ? 'KeyO' : 'Enter'));
  },

  toStage() {
    const s = this.sel;
    s.phase = 'stage';
    $('sel-stage').hidden = false;
    $('sel-cards').style.display = 'none';
    this.focus = STAGES.length;
    this.updateFocus();
    this.updateSelect();
  },

  pickStage() {
    const s = this.sel;
    const i = this.focus >= STAGES.length ? randInt(0, STAGES.length - 1) : this.focus;
    Sfx.play('confirm');
    App.startFight({ mode: s.mode, chars: [s.cur[0], s.cur[1]], stage: i, cpu: s.cpu });
  },

  updateSelect() {
    const s = this.sel, arcade = s.mode === 'arcade', medals = Ladder.medals();
    this.cardCanvases.forEach((d, i) => {
      d.classList.toggle('c1', s.cur[0] === i);
      d.classList.toggle('c2', !arcade && s.cur[1] === i);
      d.querySelectorAll('.tag, .medal').forEach(t => t.remove());
      if (s.cur[0] === i) d.insertAdjacentHTML('beforeend', '<span class="tag t1">1P</span>');
      if (!arcade && s.cur[1] === i) d.insertAdjacentHTML('beforeend', `<span class="tag t2">${s.mode === 'versus' ? '2P' : s.mode === 'cpu' ? 'CPU' : 'MAN'}</span>`);
      const m = medals[CHARACTERS[i].id];
      if (m) d.insertAdjacentHTML('beforeend', `<span class="medal" title="Bagienne Mistrzostwa wygrane: ${m} pkt">★</span>`);
    });
    // w turnieju wybiera tylko gracz 1, rywali losuje drabinka
    $('sel-p2').style.display = arcade ? 'none' : '';
    document.querySelector('.sel-vs').style.display = arcade ? 'none' : '';
    const who = [
      'GRACZ 1',
      s.mode === 'versus' ? 'GRACZ 2' : s.mode === 'cpu' ? 'KOMPUTER' : 'MANEKIN',
    ];
    [0, 1].forEach(p => {
      const ch = CHARACTERS[s.cur[p]];
      const panel = $(p === 0 ? 'sel-p1' : 'sel-p2');
      panel.className = `sel-panel p${p + 1}` + (s.done[p] ? ' ready' : '');
      const stars = '★'.repeat(ch.diff) + `<span class="off">${'★'.repeat(3 - ch.diff)}</span>`;
      panel.querySelector('.sel-info').innerHTML = `
        <div class="sel-who">${who[p]}</div>
        <div class="sel-name">${ch.name}</div>
        <div class="sel-sub">${ch.title}</div>
        <div class="sel-meta"><span>Styl: <b>${ch.style}</b></span> <span>· Trudność: <b>${stars}</b></span> <span>· Życie: <b>${ch.hp}</b></span></div>
        <div class="sel-desc">${ch.desc}</div>
        ${p === 1 && s.mode === 'cpu' ? `<div class="sel-cpu">Poziom komputera: <b>${AI_LEVELS[s.cpu]}</b> (↑/↓)</div>` : ''}
        ${s.done[p] ? '<div class="sel-ready">GOTOWY!</div>' : ''}`;
    });
    let hint;
    if (s.phase === 'stage') hint = '<kbd>←</kbd><kbd>→</kbd> arena · <kbd>Enter</kbd> walka! · <kbd>Esc</kbd> wróć';
    else if (s.mode === 'versus') hint = 'Gracz 1: <kbd>A</kbd><kbd>D</kbd> wybór, <kbd>T</kbd> zatwierdź, <kbd>G</kbd> cofnij · Gracz 2: <kbd>←</kbd><kbd>→</kbd> wybór, <kbd>O</kbd> zatwierdź, <kbd>L</kbd> cofnij';
    else hint = s.done[0] ? `Wybierz ${s.mode === 'cpu' ? 'przeciwnika' : 'manekina'}: <kbd>←</kbd><kbd>→</kbd>, <kbd>Enter</kbd> zatwierdź${s.mode === 'cpu' ? ', <kbd>↑</kbd><kbd>↓</kbd> poziom' : ''}, <kbd>Esc</kbd> cofnij` : '<kbd>←</kbd><kbd>→</kbd> wybór · <kbd>Enter</kbd> zatwierdź · <kbd>Esc</kbd> wróć';
    $('sel-hint').innerHTML = hint;
    $('sel-title').textContent = s.phase === 'stage' ? 'Gotowi do walki!' : s.mode === 'training' ? 'Trening – wybierz kapibary'
      : arcade ? 'Turniej – wybierz kapibarę' : 'Wybierz kapibarę';
  },

  // podgląd animowanych kapibar na ekranie wyboru i wyników (UI.t rośnie w kroku symulacji, 60 razy na sekundę
  // przy każdym odświeżaniu ekranu)
  frame() {
    if (this.screen === 'select' && this.sel) this.drawSelect();
    if (this.screen === 'results' && this.res) this.drawResult();
  },

  drawPreview(canvas, ch, flip, scale, pose) {
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.6, 10, canvas.width / 2, canvas.height * 0.6, canvas.width * 0.7);
    g.addColorStop(0, rgba(ch.color, 0.45)); g.addColorStop(1, rgba(ch.color, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2 - (flip ? -1 : 1) * 14 * scale, canvas.height - 18);
    ctx.scale(flip ? -scale : scale, scale);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 0, 70 * ch.look.girth, 12, 0, 0, TAU); ctx.fill();
    drawCapy(ctx, ch.look, pose, { t: this.t, blink: this.t % 200 < 8 });
  },

  idlePose(ch, t, phase) {
    const base = ch.stance || STANCE;
    const p = lerpPose(base, base, 0);
    const b = Math.sin(t * 0.075 + phase);
    p.hy += b * 1.6; p.torso += b * 1.2; p.aF[1] += b * 2;
    return p;
  },

  drawSelect() {
    const s = this.sel, t = this.t;
    this.cardCanvases.forEach((d, i) => {
      const ch = CHARACTERS[i];
      const hot = s.cur[0] === i || s.cur[1] === i;
      this.drawPreview(d.querySelector('canvas'), ch, false, 1.2, this.idlePose(ch, hot ? t * 1.6 : t, i));
    });
    [0, 1].forEach(p => {
      const ch = CHARACTERS[s.cur[p]];
      let pose = this.idlePose(ch, t, p);
      if (s.done[p]) {
        this.winT = this.winT || [0, 0];
        pose = ch.winPoseFn ? ch.winPoseFn(t % 400, clonePose(STANCE)) : POSES.win;
      }
      this.drawPreview($(p === 0 ? 'sel-p1' : 'sel-p2').querySelector('canvas'), ch, p === 1, 1.7, pose);
    });
  },

  // ---------------- lista ciosów ----------------
  buildMovelist() {
    const tabs = $('ml-tabs');
    tabs.innerHTML = '';
    CHARACTERS.concat([{ name: 'Wspólne ciosy' }]).forEach((ch, i) => {
      const b = document.createElement('button');
      b.className = 'tab' + (i === this.mlTab ? ' on' : '');
      b.textContent = ch.name;
      b.addEventListener('click', () => { this.mlTab = i; this.buildMovelist(); });
      tabs.appendChild(b);
    });
    $('ml-keys').innerHTML = this.keyLegend();
    const body = $('ml-body');
    body.scrollTop = 0;
    const row = (name, inp, desc, easy) => `<div class="ml-row"><div class="ml-name">${name}${desc ? `<span class="ml-desc">${desc}</span>` : ''}</div>` +
      `<div class="inp">${inp}${easy ? `<span class="easy">łatwo: ${easy}</span>` : ''}</div></div>`;
    if (this.mlTab >= CHARACTERS.length) {
      body.innerHTML = COMMON_MOVES.map(([title, rows]) => `<div class="ml-sec"><h3>${title}</h3>${rows.map(r => row(r[0], r[1])).join('')}</div>`).join('');
      return;
    }
    const ch = CHARACTERS[this.mlTab];
    const fin = ch.finishers[0], fr = FRIENDSHIP[0];
    body.innerHTML = `
      <div class="ml-sec"><h3 style="color:${ch.color}">${ch.name} – ciosy specjalne</h3>
        ${ch.specials.map(s => row(s.name, specialInput(s), s.desc, easyInput(ch, s))).join('')}
      </div>
      <div class="ml-sec"><h3>Super cios (2 paski)</h3>
        ${row(ch.superInfo.name, '↓↘→↓↘→+Ł', ch.superInfo.desc)}
        ${row('Skrót', 'MŁ+MK', 'gdy pasek super jest pełny w dwóch trzecich')}
      </div>
      <div class="ml-sec"><h3>Combosy do nauki</h3>
        ${ch.combos.map(c => row(c[0], c[1])).join('')}
      </div>
      <div class="ml-sec hl"><h3>Wykończenia (po napisie „Dokończ go/ją!”)</h3>
        ${row('Kapibality: ' + fin.name, `${fin.glyph}+${BTN_LABEL[fin.btn]}`, fin.range ? 'z bliska' : 'z każdej odległości')}
        ${row('Kapiprzyjaźń', `${fr.glyph}+${BTN_LABEL[fr.btn]}`, 'z każdej odległości')}
      </div>`;
  },

  keyLegend() {
    const k = (p, b) => BINDINGS[p][b].map(keyName).join('/');
    return `Gracz 1: LŁ <kbd>${k(0, 'LP')}</kbd> MŁ <kbd>${k(0, 'HP')}</kbd> LK <kbd>${k(0, 'LK')}</kbd> MK <kbd>${k(0, 'HK')}</kbd> SP <kbd>${k(0, 'SP')}</kbd> &nbsp;·&nbsp; Gracz 2: LŁ <kbd>${k(1, 'LP')}</kbd> MŁ <kbd>${k(1, 'HP')}</kbd> LK <kbd>${k(1, 'LK')}</kbd> MK <kbd>${k(1, 'HK')}</kbd> SP <kbd>${k(1, 'SP')}</kbd><br>Ł – dowolna łapa (mocniejsza = MŁ), K – dowolne kopnięcie, SP – przycisk specjalny: ruch specjalny bez kręcenia kierunków. Strzałki pokazują kierunki dla postaci zwróconej w prawo.`;
  },

  // ---------------- sterowanie ----------------
  buildControls() {
    const card = (p, title) => {
      const B = BINDINGS[p];
      const r = (label, keys) => `<div class="ctrl-row"><span>${label}</span><span>${keys.map(c => `<kbd>${keyName(c)}</kbd>`).join(' ')}</span></div>`;
      return `<div class="ctrl-card p${p + 1}"><h3>${title}</h3>
        ${r('Ruch', [...B.up, ...B.left, ...B.down, ...B.right])}
        ${r('LŁ – lekka łapa', B.LP)}
        ${r('MŁ – mocna łapa', B.HP)}
        ${r('LK – lekkie kopnięcie', B.LK)}
        ${r('MK – mocne kopnięcie', B.HK)}
        ${r('SP – cios specjalny (łatwy)', B.SP)}
        ${r('Pauza', ['Escape'])}</div>`;
    };
    $('ctrl-grid').innerHTML = card(0, 'Gracz 1 (lewa strona)') + card(1, 'Gracz 2 (prawa strona)');
  },

  refreshKeyLabels() { this.buildControls(); if (this.screen === 'movelist') this.buildMovelist(); },

  // ---------------- opcje ----------------
  optionDefs() {
    const onoff = v => v ? 'wł.' : 'wył.';
    return [
      { name: 'Rundy do zwycięstwa', val: () => Settings.wins, ch: d => { Settings.wins = clamp(Settings.wins + d, 1, 3); Store.set('wins', Settings.wins); } },
      { name: 'Czas rundy', val: () => Settings.time ? `${Settings.time} s` : '∞', ch: d => {
        const opts = [60, 99, 0]; let i = opts.indexOf(Settings.time); i = (i + d + 3) % 3; Settings.time = opts[i]; Store.set('time', Settings.time); } },
      { name: 'Poziom komputera', val: () => AI_LEVELS[Settings.cpu], ch: d => { Settings.cpu = clamp(Settings.cpu + d, 0, 3); Store.set('cpu', Settings.cpu); } },
      { name: 'Wykończenia (Kapibality)', val: () => onoff(Settings.finishers), ch: () => { Settings.finishers = !Settings.finishers; Store.set('fin', Settings.finishers); } },
      { name: 'Efekty dźwiękowe', val: () => onoff(Sfx.enabled), ch: () => Sfx.setEnabled(!Sfx.enabled) },
      { name: 'Muzyka', val: () => onoff(Music.enabled), ch: () => Music.setEnabled(!Music.enabled) },
      { name: 'Komentator (głos)', val: () => onoff(Voice.enabled), ch: () => { Voice.setEnabled(!Voice.enabled); if (Voice.enabled) Voice.line('title', 'Kapibara Kombat!'); } },
      { name: 'Głosy kapibar', val: () => onoff(CapyVoice.enabled), ch: () => {
        CapyVoice.setEnabled(!CapyVoice.enabled); if (CapyVoice.enabled) CapyVoice.say({ ch: pick(CHARACTERS) }, 'hitH'); } },
      { name: 'Pokazuj hitboxy', val: () => onoff(Store.get('boxes', false)), ch: () => Store.set('boxes', !Store.get('boxes', false)) },
      { name: 'Pełny ekran', val: () => document.fullscreenElement ? 'wł.' : 'wył.', ch: () => {
        if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); } },
    ];
  },

  buildOptions() {
    const list = $('opt-list');
    this.opts = this.optionDefs();
    list.innerHTML = '';
    this.opts.forEach((o, i) => {
      const d = document.createElement('div');
      d.className = 'opt';
      d.innerHTML = `<span>${o.name}</span><span class="val">${o.val()}</span>`;
      d.addEventListener('click', () => this.changeOption(i, 1));
      d.addEventListener('mouseenter', () => this.setFocusEl(d));
      list.appendChild(d);
    });
    this.updateFocus();
  },

  changeOption(i, d) {
    const o = this.opts && this.opts[i];
    if (!o) return;
    o.ch(d);
    Sfx.play('select');
    setTimeout(() => {
      document.querySelectorAll('#opt-list .opt .val').forEach((v, k) => { v.textContent = this.opts[k].val(); });
    }, 60);
  },

  // ---------------- wyniki ----------------
  showResults(res, game) {
    this.res = { ch: res.winner.ch, t: 0, t0: this.t };
    const w = res.winner, l = res.loser;
    $('res-name').textContent = w.name;
    const qi = randInt(0, w.ch.quotes.length - 1);
    $('res-quote').textContent = `„${w.ch.quotes[qi]}”` + (res.finisher ? ` – ${res.finisher.id === 'friend' ? 'Kapiprzyjaźń' : 'Kapibality'}: ${res.finisher.name}` : '');
    // zwycięzca mówi swój cytat (nagranie tej samej kwestii)
    setTimeout(() => { if (this.screen === 'results' && CapyVoice.enabled && Sfx.ok()) Rec.play(`${w.ch.id}_win_${qi + 1}`, Sfx.voGain); }, 700);
    const [a, b] = game.fighters;
    const rows = [
      ['Wygrane rundy', a.wins, b.wins],
      ['Zadane obrażenia', a.stats.dmg, b.stats.dmg],
      ['Najdłuższe combo', a.stats.maxCombo, b.stats.maxCombo],
      ['Ciosy specjalne', a.stats.specials, b.stats.specials],
      ['Super ciosy', a.stats.supers, b.stats.supers],
      ['Rzuty', a.stats.throws, b.stats.throws],
      ['Zablokowane ciosy', a.stats.blocked, b.stats.blocked],
    ];
    $('res-stats').innerHTML = `<tr><th></th><th style="color:${a.ch.color}">${a.name}</th><th style="color:${b.ch.color}">${b.name}</th></tr>` +
      rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('');
    this.prev = [];
    this.show('results');
    Music.play('victory');
  },

  drawResult() {
    const r = this.res;
    r.t = this.t - r.t0;
    const ch = r.ch;
    const pose = ch.winPoseFn ? ch.winPoseFn(r.t, clonePose(STANCE)) : POSES.win;
    this.drawPreview($('res-canvas'), ch, false, 1.45, pose);
  },
};
