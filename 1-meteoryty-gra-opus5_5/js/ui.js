'use strict';
/* Warstwa DOM: ekrany menu, HUD, sklep z ulepszeniami, komunikaty. */

const UI = {
  init(game) {
    this.g = game;
    this.cache = {};
    this.current = null;
    this.touch = !!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches);
    const $ = id => document.getElementById(id);
    this.$ = $;
    this.screens = {
      menu: $('screen-menu'), help: $('screen-help'), pause: $('screen-pause'),
      shop: $('screen-shop'), over: $('screen-over'),
    };
    this.hud = $('hud');
    this.el = {};
    for (const id of ['hud-score', 'hud-wave', 'hud-credits', 'hud-combo', 'hud-combo-n', 'hud-mult', 'hud-combo-bar',
      'hud-wave-bar', 'hud-left', 'hud-hp', 'hud-hp-t', 'bar-hp', 'hud-sh', 'hud-sh-t', 'bar-sh', 'emp-btn',
      'hud-boss', 'hud-boss-bar', 'hud-boss-name', 'hud-auto', 'hud-event', 'hud-protos',
      'fx-rapid', 'fx-spread', 'fx-slow']) this.el[id] = $(id);
    this.fxBars = {};
    for (const k of ['rapid', 'spread', 'slow']) this.fxBars[k] = this.el['fx-' + k].querySelector('i');

    document.addEventListener('click', e => {
      const el = e.target.closest('[data-action]');
      if (!el) return;
      el.blur();
      Sound.init();
      this.action(el.dataset.action, el);
    });
    document.addEventListener('mouseover', e => {
      const b = e.target.closest && e.target.closest('.btn, .up-card, .proto-card');
      if (b && b !== this.hovered) Sound.hover();
      this.hovered = b || null;
    });
    this.$('pause-icon').innerHTML = ICONS.pause;
    this.updateSoundLabels();
    this.updateBest();
  },

  show(name) {
    this.current = name;
    for (const k in this.screens) this.screens[k].classList.toggle('active', k === name);
    const st = this.g.state;
    this.hud.classList.toggle('visible', st === 'playing' || st === 'dying' || st === 'paused');
    document.body.classList.toggle('in-game', st === 'playing');
    if (name === 'help') this.buildHelp();
    if (name === 'pause') this.$('pause-protos').innerHTML = this.protoList();
  },

  // Aktywne protokoły jako lista chipów (pauza, koniec gry)
  protoList(ids = [...this.g.mods]) {
    if (!ids.length) return '';
    return ids.map(id => {
      const P = PROTOCOLS.find(p => p.id === id);
      return `<span class="proto-chip" title="${P.plus} · ${P.minus}">${ICONS[P.icon]}${P.name}</span>`;
    }).join('');
  },

  action(a, el) {
    const g = this.g;
    switch (a) {
      case 'play':
      case 'restart':
        Sound.click();
        g.newGame();
        break;
      case 'help': Sound.click(); this.show('help'); break;
      case 'back': Sound.click(); this.show('menu'); break;
      case 'sound': Sound.toggleMute(); this.updateSoundLabels(); Sound.click(); break;
      case 'music': Sound.toggleMusic(); this.updateSoundLabels(); Sound.click(); break;
      case 'pause': g.pause(); break;
      case 'resume': Sound.click(); g.resume(); break;
      case 'menu': Sound.click(); g.toMenu(); break;
      case 'next':
        // najpierw wybór protokołu – inaczej łatwo go przeoczyć
        if (g.offer) { Sound.deny(); this.denyCard('protos'); break; }
        Sound.click(); g.nextWave(); break;
      case 'buy': g.buy(el.dataset.id); break;
      case 'proto': g.chooseProtocol(+el.dataset.i); break;
      case 'reroll': g.rerollOffer(); break;
      case 'auto':
        g.autoFire = !g.autoFire; Store.set('tz_auto', g.autoFire); this.updateSoundLabels();
        if (g.state === 'playing') this.callout(g.autoFire ? 'AUTO-OGIEŃ: WŁ.' : 'AUTO-OGIEŃ: WYŁ.', '94,242,255');
        break;
      case 'shake': g.shakeOn = !g.shakeOn; Store.set('tz_shake', g.shakeOn); this.updateSoundLabels(); Sound.click(); break;
      case 'emp': g.triggerEMP(); break;
    }
  },

  updateSoundLabels() {
    document.querySelectorAll('[data-sound-label]').forEach(b => { b.textContent = 'Dźwięk: ' + (Sound.muted ? 'wył.' : 'wł.'); });
    document.querySelectorAll('[data-music-label]').forEach(b => { b.textContent = 'Muzyka: ' + (Sound.musicOn ? 'wł.' : 'wył.'); });
    if (!this.g) return;
    document.querySelectorAll('[data-auto-label]').forEach(b => { b.textContent = 'Auto-ogień: ' + (this.g.autoFire ? 'wł.' : 'wył.'); });
    document.querySelectorAll('[data-shake-label]').forEach(b => { b.textContent = 'Wstrząsy: ' + (this.g.shakeOn ? 'wł.' : 'wył.'); });
  },

  updateBest() {
    this.$('menu-best').textContent = formatNum(Store.get('tz_best', 0));
    this.$('menu-wave').textContent = Store.get('tz_bestwave', 0);
  },

  banner(title, sub, cls = '', ev = '') {
    const b = this.$('banner');
    this.$('banner-title').textContent = title;
    this.$('banner-sub').textContent = sub;
    this.$('banner-ev').textContent = ev;
    b.className = '';
    void b.offsetWidth;
    b.className = 'show ' + cls;
  },

  callout(text, color = '255,255,255', big = false) {
    const box = this.$('callouts');
    const c = document.createElement('div');
    c.className = 'callout' + (big ? ' big' : '');
    c.textContent = text;
    c.style.setProperty('--c', color);
    box.appendChild(c);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => c.remove(), 1900);
  },

  /* ---------- HUD (aktualizowany co klatkę, DOM zmieniany tylko przy zmianie wartości) ---------- */
  txt(id, v) {
    if (this.cache[id] !== v) { this.cache[id] = v; this.el[id].textContent = v; }
  },
  css(id, prop, v) {
    const k = id + '|' + prop;
    if (this.cache[k] === v) return;
    this.cache[k] = v;
    if (prop.startsWith('--')) this.el[id].style.setProperty(prop, v);
    else this.el[id].style[prop] = v;
  },
  cls(id, c, on) {
    const k = id + '#' + c;
    if (this.cache[k] === on) return;
    this.cache[k] = on;
    this.el[id].classList.toggle(c, on);
  },
  bar(el, key, v) {
    const s = `scaleX(${v.toFixed(3)})`;
    if (this.cache[key] !== s) { this.cache[key] = s; el.style.transform = s; }
  },

  updateHUD() {
    const g = this.g;
    if (!this.hud.classList.contains('visible')) return;
    this.txt('hud-score', formatNum(g.score));
    this.txt('hud-wave', String(g.wave));
    this.txt('hud-credits', formatNum(g.credits));

    const hp = clamp(g.hp / g.maxHp, 0, 1);
    this.css('hud-hp', 'transform', `scaleX(${hp.toFixed(3)})`);
    this.txt('hud-hp-t', String(Math.ceil(g.hp)));
    this.cls('bar-hp', 'low', hp < 0.3);
    const sh = g.shieldMax ? clamp(g.shield / g.shieldMax, 0, 1) : 0;
    this.css('hud-sh', 'transform', `scaleX(${sh.toFixed(3)})`);
    this.txt('hud-sh-t', String(Math.floor(g.shield)));
    this.cls('bar-sh', 'down', g.shield < 1);

    this.cls('hud-combo', 'show', g.combo >= 3);
    this.txt('hud-combo-n', String(g.combo));
    this.txt('hud-mult', '×' + fmt1(g.multiplier));
    this.css('hud-combo-bar', 'transform', `scaleX(${clamp(g.comboTimer / g.comboTime, 0, 1).toFixed(3)})`);

    const total = g.waveTotal || 1;
    const p = clamp((total - g.spawnQueue.length) / total, 0, 1);
    this.css('hud-wave-bar', 'transform', `scaleX(${p.toFixed(3)})`);
    this.txt('hud-left', `Wrogie obiekty: ${g.spawnQueue.length + g.meteors.length}`);
    this.txt('hud-event', g.event ? g.event.name : '');
    const mk = [...g.mods].join();
    if (this.cache.mods !== mk) {
      this.cache.mods = mk;
      this.el['hud-protos'].innerHTML = [...g.mods].map(id => {
        const P = PROTOCOLS.find(p => p.id === id);
        return `<i title="${P.name}">${ICONS[P.icon]}</i>`;
      }).join('');
    }

    const ep = g.empTimer > 0 ? 1 - g.empTimer / g.empCd : 1;
    this.css('emp-btn', '--p', ep.toFixed(3));
    this.cls('emp-btn', 'ready', g.empTimer <= 0);

    for (const k of ['rapid', 'spread', 'slow']) {
      const v = g.effects[k];
      this.cls('fx-' + k, 'on', v > 0);
      if (v > 0) this.bar(this.fxBars[k], 'fxb-' + k, v / POWERUPS[k].dur);
    }

    const boss = g.boss && !g.boss.dead ? g.boss : null;
    this.cls('hud-boss', 'show', !!boss);
    if (boss) {
      this.css('hud-boss-bar', 'transform', `scaleX(${clamp(g.bossFrac(), 0, 1).toFixed(3)})`);
      this.txt('hud-boss-name', '⚠ ' + g.bossName);
    }
    this.cls('hud-auto', 'on', g.autoFire);
  },

  /* ---------- sklep ---------- */
  showShop(sum) {
    this.$('shop-title').textContent = `Fala ${sum.wave} odparta`;
    this.$('shop-stats').innerHTML = `
      <div><span>Zniszczone</span><b>${sum.kills}</b></div>
      <div><span>Celność</span><b>${Math.round(sum.acc * 100)}%</b></div>
      <div><span>Premia za falę</span><b>+${formatNum(sum.bonus)} ¢</b></div>
      <div class="${sum.perfect ? 'perfect' : 'hurt'}"><span>${sum.perfect ? 'Perfekcyjna obrona' : 'Uszkodzenia planety'}</span><b>${sum.perfect ? '+60% ¢' : '−' + Math.ceil(sum.damage)}</b></div>`;
    this.$('shop-heal').textContent = sum.heal > 0 ? `Ekipy naprawcze odbudowały +${Math.ceil(sum.heal)} pkt` : '';
    const nw = sum.wave + 1;
    const warn = nw % 5 === 0;
    const nt = this.$('shop-next');
    const ev = this.g.nextEvent;
    nt.classList.toggle('danger', warn);
    nt.classList.toggle('event', !!ev);
    nt.innerHTML = warn ? `Następnie: fala ${nw} — wykryto ${(nw / 5) % 2 === 0 ? 'BLIŹNIĘTA' : 'PLANETOIDĘ'}!`
      : ev ? `Następnie: fala ${nw} — <b>${ev.name}</b>: ${ev.desc}`
      : `Następnie: fala ${nw}${WAVE_INTRO[nw] ? ' — ' + WAVE_INTRO[nw].toLowerCase() : ''}`;
    this.renderShop();
    this.show('shop');
  },

  renderShop() {
    const g = this.g;
    this.$('shop-credits').textContent = formatNum(g.credits);
    this.$('shop-planet').textContent = `${Math.ceil(g.hp)} / ${g.maxHp}`;
    this.$('shop-shield').textContent = `${Math.floor(g.shieldMax)}`;
    this.$('shop-mods').innerHTML = g.mods.size ? 'Protokoły: ' + this.protoList() : '';
    // Naprawa to usługa, nie ulepszenie – siedzi w stopce obok „Następnej fali”
    this.$('upgrade-grid').innerHTML = UPGRADES.map((u, i) => {
      if (u.id === 'repair') return '';
      const lvl = g.up[u.id], maxed = lvl >= u.max, cost = u.cost(lvl);
      const poor = !maxed && g.credits < cost;
      const np = u.pips || u.max, over = lvl - np;
      const pips = `<div class="pips">${Array.from({ length: np }, (_, k) => `<i class="${k < lvl ? 'on' : ''}"></i>`).join('')}${over > 0 ? `<em>+${over}</em>` : ''}</div>`;
      const stat = maxed ? 'Poziom maksymalny' : u.stat(g, lvl);
      return `<button class="up-card${maxed ? ' maxed' : ''}${poor ? ' poor' : ''}" data-action="buy" data-id="${u.id}">
        <div class="up-icon">${ICONS[u.id]}</div>
        <div class="up-body">
          <div class="up-name"><span>${u.name}</span><kbd>${(i + 1) % 10}</kbd></div>
          <div class="up-desc">${u.desc}</div>
          <div class="up-stat">${stat}</div>
          ${pips}
        </div>
        <div class="up-cost">${maxed ? '✓' : formatNum(cost) + '<small>¢</small>'}</div>
      </button>`;
    }).join('');
    const R = UPGRADES.find(u => u.id === 'repair'), rc = R.cost(g.up.repair);
    const full = g.hp >= g.maxHp;
    const rb = this.$('repair-btn');
    rb.classList.toggle('poor', full || g.credits < rc);
    rb.innerHTML = full ? 'Planeta w pełni sprawna' : `${ICONS.repair}Naprawa +25 · ${formatNum(rc)}¢ <kbd>0</kbd>`;
    // Oferta protokołów: wybór 1 z 3 (Q/W/E), ponowne losowanie za kredyty (R)
    const box = this.$('shop-protos');
    box.classList.toggle('show', !!g.offer);
    this.$('next-btn').classList.toggle('locked', !!g.offer);
    if (g.offer) {
      const rr = g.rerollCost;
      box.innerHTML = `<div class="proto-head"><span class="kicker">Wybierz protokół obrony · na resztę gry (${g.mods.size + 1}/${PROTOCOL_MAX})</span>
          <button class="btn reroll${g.credits < rr ? ' poor' : ''}" data-action="reroll" data-id="reroll">Losuj ponownie · ${formatNum(rr)}¢ <kbd>R</kbd></button></div>
        <div class="proto-grid">${g.offer.map((P, i) => `<button class="proto-card" data-action="proto" data-i="${i}">
          <div class="up-icon">${ICONS[P.icon]}</div>
          <div class="up-body">
            <div class="up-name"><span>${P.name}</span><kbd>${'QWE'[i]}</kbd></div>
            <div class="proto-plus">+ ${P.plus}</div>
            <div class="proto-minus">− ${P.minus}</div>
          </div></button>`).join('')}</div>`;
    } else box.innerHTML = '';
  },

  denyCard(id) {
    const c = id === 'protos' ? this.$('shop-protos') : document.querySelector(`[data-id="${id}"]`);
    if (!c) return;
    c.classList.remove('deny');
    void c.offsetWidth;
    c.classList.add('deny');
  },

  /* ---------- koniec gry ---------- */
  showGameOver(d) {
    this.$('over-title').textContent = d.record ? 'Nowy rekord!' : 'Ziemia upadła';
    this.$('over-title').classList.toggle('record', d.record);
    const kick = this.$('over-kicker');
    kick.textContent = d.record ? 'Rekord obrony' : 'Transmisja przerwana';
    kick.classList.toggle('gold-text', d.record);
    kick.classList.toggle('danger-text', !d.record);
    // przetrwane fale = pełne fale przed tą, w której padła planeta
    const n = d.wave - 1;
    const word = n === 1 ? 'falę' : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'fale' : 'fal';
    this.$('over-sub').textContent = n > 0 ? `Ludzkość przetrwała ${n} ${word} bombardowania.` : 'Ziemia padła już w pierwszej fali.';
    const CAUSE = {
      boss: ['planetoida', 'Planetoidę trzeba zestrzelić, zanim dotrze do tarczy – postaw na Moc działa i Szybkostrzelność.'],
      fast: ['szybki odłamek', 'Szybkie odłamki łatwiej złapać z Naprowadzaniem i satelitami.'],
      iron: ['meteoryt żelazny', 'Żelazne mają dużo życia – pomaga Moc działa i Przebicie.'],
      volatile: ['meteoryt wybuchowy', 'Wybuchowe zestrzeliwuj z daleka – ich eksplozja rani sąsiadów.'],
      comet: ['kometa', 'Komety są szybkie – większa tarcza daje czas na reakcję.'],
      ice: ['lodowy odłamek', 'Rozbita kometa sypie lodem – EMP czyści okolice planety.'],
    };
    const c = CAUSE[d.lastHit] || ['meteoryt skalny', 'Mocniejsza tarcza i regeneracja dają czas na reakcję. Nie zapominaj o EMP.'];
    this.$('over-cause').innerHTML = `Ostatni cios: <b>${c[0]}</b>. ${c[1]}${d.mods.length ? `<span class="over-mods">${this.protoList(d.mods)}</span>` : ''}`;
    this.$('over-score').textContent = formatNum(d.score);
    this.$('over-stats').innerHTML = `
      <div><span>Fala</span><b>${d.wave}</b></div>
      <div><span>Zestrzelone</span><b>${formatNum(d.kills)}</b></div>
      <div><span>Celność</span><b>${Math.round(d.acc * 100)}%</b></div>
      <div><span>Najwyższe combo</span><b>${d.maxCombo}</b></div>
      <div><span>Planetoidy</span><b>${d.bosses}</b></div>
      <div><span>Perfekcyjne fale</span><b>${d.perfect}</b></div>`;
    this.$('over-best').textContent = formatNum(d.best);
    this.show('over');
    this.updateBest();
  },

  /* ---------- odprawa (pomoc) ---------- */
  buildHelp() {
    if (this.helpBuilt) return;
    this.helpBuilt = true;
    const thumb = (type, r) => {
      const art = MeteorArt.make(type, r);
      return `<img src="${art.canvas.toDataURL()}" alt="">`;
    };
    const list = [['rock', 2], ['fast', 0], ['iron', 2], ['volatile', 1], ['comet', 1], ['boss', 0]];
    this.$('threat-list').innerHTML = list.map(([t]) => {
      const T = METEOR_TYPES[t];
      return `<li><span class="thumb">${thumb(t, 20)}</span><div><b style="color:${T.color}">${T.name}</b><small>${T.desc}</small></div></li>`;
    }).join('');
    this.$('bonus-list').innerHTML = Object.entries(POWERUPS).map(([k, P]) => {
      const c = document.createElement('canvas');
      c.width = c.height = 48;
      const g = c.getContext('2d');
      g.translate(24, 24);
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3;
        if (i) g.lineTo(Math.cos(a) * 20, Math.sin(a) * 20); else g.moveTo(20, 0);
      }
      g.closePath();
      g.fillStyle = 'rgba(8,16,28,0.9)'; g.fill();
      g.strokeStyle = g.fillStyle = `rgb(${P.color})`;
      g.lineWidth = 2.5; g.stroke();
      g.lineCap = 'round'; g.lineJoin = 'round';
      drawPowerIcon(g, k, 10);
      return `<li><span class="thumb"><img src="${c.toDataURL()}" alt=""></span><div><b style="color:rgb(${P.color})">${P.name}</b><small>${P.desc}</small></div></li>`;
    }).join('');
  },
};
