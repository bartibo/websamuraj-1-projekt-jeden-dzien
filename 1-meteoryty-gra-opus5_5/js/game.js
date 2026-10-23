'use strict';
/* Rdzeń gry: stan, fale, meteoryty, pociski, tarcza, drony, bonusy i rysowanie świata.
   Układ współrzędnych świata: środek Ziemi = (0, 0). */

const PLANET_SEED = 4217;
const COMBO_TIME = 2.4;

const Game = {
  state: 'menu',
  demo: true,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.planet = new Planet(PLANET_SEED);
    this.bg = new Background();
    this.fx = new ParticleSystem();
    this.mouse = { x: 0, y: -300, sx: 0, sy: 0, down: false };
    this.autoFire = Store.get('tz_auto', false);
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.shakeOn = Store.get('tz_shake', !reduce);
    this.empUsed = Store.get('tz_emp', false);
    this.mods = new Set(); this.event = null; this.nextEvent = null; this.offer = null;
    this.time = 0; this.dt = 0; this.shake = 0; this.flash = 0; this.dmgFlash = 0;
    this.turretAngle = -Math.PI / 2; this.recoil = 0;
    this.effects = { rapid: 0, spread: 0, slow: 0 };
    this.up = this.freshUpgrades();
    this.stats = { kills: 0, shots: 0, hits: 0, bosses: 0, perfect: 0 };
    this.drones = []; this.droneAngle = 0;
    this.fxQuality = 1; this.avgDt = 1 / 60;
    this.hp = 100; this.maxHp = 100; this.shield = 30;
    this.resetWorld();
    this.resize();
    this.toMenu();
    UI.updateSoundLabels();
  },

  freshUpgrades() {
    const u = {};
    for (const d of UPGRADES) u[d.id] = 0;
    return u;
  },

  /* ---------- statystyki pochodne ---------- */
  calcDmg(l) { return 10 * (1 + 0.25 * l); },
  // ponad 10. poziom szybkostrzelność rośnie już tylko liniowo
  calcRate(l) { return 4 * Math.pow(1.15, Math.min(l, 10)) * (1 + 0.05 * Math.max(l - 10, 0)); },
  calcShield(l) { return 30 + 25 * l; },
  calcRegen(l) { return 2.5 + 1.5 * l; },
  calcEmpCd(l) { return 20 * Math.pow(0.85, l); },
  // Protokoły (this.mods) i wydarzenie fali (this.event) modyfikują statystyki pochodne
  has(id) { return this.mods.has(id); },
  get dmg() {
    return this.calcDmg(this.up.dmg) * (this.has('rail') ? 2.6 : 1) * (this.has('glass') ? 1.6 : 1) * (this.has('cryo') ? 0.8 : 1);
  },
  get fireRate() {
    return this.calcRate(this.up.rate) * (this.effects.rapid > 0 ? 2.2 : 1) * (this.has('rail') ? 0.5 : 1) * (this.has('swarm') ? 0.85 : 1);
  },
  get shots() { return 1 + this.up.multi + (this.effects.spread > 0 ? 2 : 0); },
  get pierce() { return this.up.pierce + (this.has('rail') ? 2 : 0); },
  get shieldMax() {
    return this.calcShield(this.up.shield) * (this.has('chain') ? 0.8 : 1) * (this.has('scrap') ? 0.7 : 1) * (this.has('glass') ? 0.5 : 1);
  },
  get shieldRegen() {
    if (this.event && this.event.noRegen) return 0;
    return this.calcRegen(this.up.regen) * (this.has('mirror') ? 0.6 : 1);
  },
  get empCd() { return this.calcEmpCd(this.up.emp) * (this.event && this.event.emp || 1); },
  get empRadius() { return 250 * (1 + 0.15 * this.up.emp) * this.scale * (this.has('overload') ? 0.75 : 1); },
  get comboTime() { return this.has('cascade') ? 4 : COMBO_TIME; },
  get droneCount() { return this.has('swarm') ? Math.max(2, this.up.drone * 2) : this.up.drone; },
  // Od 8. fali wytrzymałość rośnie wykładniczo – gra bez końca, ale ulepszenia w końcu przestają wystarczać
  get hpMul() {
    if (this.demo) return 1;
    return (1 + (this.wave - 1) * 0.12) * Math.pow(1.12, Math.max(this.wave - 8, 0));
  },
  get baseSpeed() {
    const n = Math.max(this.wave - 1, 0);
    return (this.demo ? 85 : 56) * this.scale * (1 + Math.min(n, 24) * 0.04 + Math.max(n - 24, 0) * 0.03);
  },
  get multiplier() { return 1 + Math.min(this.has('cascade') ? 6 : 4, Math.floor(this.combo / 8) * 0.5); },

  /* ---------- rozmiar ekranu ---------- */
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth, h = window.innerHeight;
    this.dpr = dpr; this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    const oldScale = this.scale;
    this.scale = clamp(Math.min(w, h) / 850, 0.5, 1.25);
    this.R = 84 * this.scale;
    this.Rs = this.R + 20 * this.scale;
    this.GM = 64 * this.R * this.R;
    this.farDist = Math.hypot(w, h) * 0.9 + 200;
    this.planet.setSize(this.R, dpr);
    this.bg.resize(w, h);
    this.makeShieldArt();
    this.makeVignettes();
    this.pausedDrawn = false;
    if (oldScale && oldScale !== this.scale) {
      const k = this.scale / oldScale;
      MeteorArt.clear();
      for (const m of this.meteors) {
        m.r *= k; m.x *= k; m.y *= k;
        m.art = MeteorArt.get(m.type, m.r);
      }
    }
  },

  makeShieldArt() {
    const Rs = this.Rs, S = Rs + 4, dpr = this.dpr;
    const c = document.createElement('canvas');
    c.width = c.height = Math.ceil(S * 2 * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.translate(S, S);
    g.save();
    g.beginPath(); g.arc(0, 0, Rs, 0, TAU); g.clip();
    const hs = 7 * this.scale + 2, hw = Math.sqrt(3) * hs, vh = 1.5 * hs;
    g.strokeStyle = 'rgba(140,245,255,1)';
    g.lineWidth = 1;
    const rows = Math.ceil(Rs / vh) + 1, cols = Math.ceil(Rs / hw) + 1;
    for (let row = -rows; row <= rows; row++) {
      for (let col = -cols; col <= cols; col++) {
        const cx = col * hw + (row & 1 ? hw / 2 : 0), cy = row * vh;
        g.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = Math.PI / 6 + k * Math.PI / 3;
          const px = cx + Math.cos(a) * hs * 0.9, py = cy + Math.sin(a) * hs * 0.9;
          if (k) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.closePath();
        g.stroke();
      }
    }
    g.fillStyle = 'rgba(60,200,255,0.25)';
    g.fillRect(-S, -S, S * 2, S * 2);
    g.globalCompositeOperation = 'destination-in';
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, Rs);
    grd.addColorStop(0, 'rgba(0,0,0,0.05)');
    grd.addColorStop(0.72, 'rgba(0,0,0,0.2)');
    grd.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = grd;
    g.fillRect(-S, -S, S * 2, S * 2);
    g.restore();
    g.strokeStyle = 'rgba(150,250,255,0.9)';
    g.lineWidth = 1.6;
    g.beginPath(); g.arc(0, 0, Rs, 0, TAU); g.stroke();
    this.shieldArt = c;
  },

  makeVignettes() {
    const mk = (rgb, inner) => {
      const c = document.createElement('canvas');
      const w = Math.ceil(this.w / 3), h = Math.ceil(this.h / 3);
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      const r = Math.hypot(w, h) / 2;
      const grd = g.createRadialGradient(w / 2, h / 2, r * inner, w / 2, h / 2, r);
      grd.addColorStop(0, `rgba(${rgb},0)`);
      grd.addColorStop(1, `rgba(${rgb},1)`);
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      return c;
    };
    this.vig = { dark: mk('0,0,0', 0.5), red: mk('255,30,40', 0.35), blue: mk('60,150,255', 0.4) };
  },

  /* ---------- przebieg gry ---------- */
  resetWorld() {
    this.meteors = []; this.bullets = []; this.powerups = []; this.shockwaves = [];
    this.blasts = []; this.shieldHits = []; this.spawnQueue = [];
    this.boss = null;
    if (this.fx) this.fx.clear();
  },

  toMenu() {
    this.state = 'menu';
    this.demo = true;
    this.resetWorld();
    this.wave = 1;
    this.up = this.freshUpgrades();
    this.up.drone = 3;
    this.mods.clear(); this.event = null; this.nextEvent = null; this.offer = null;
    this.effects = { rapid: 0, spread: 0, slow: 0 };
    this.hp = 100; this.shield = this.shieldMax; this.combo = 0; this.empTimer = 0;
    this.slowmo = 0; this.flash = 0; this.dmgFlash = 0;
    this.planet.reset();
    this.syncDrones();
    this.demoTimer = 0.8;
    Sound.setIntensity(0);
    UI.updateBest();
    UI.show('menu');
  },

  newGame() {
    this.demo = false;
    this.resetWorld();
    this.up = this.freshUpgrades();
    this.effects = { rapid: 0, spread: 0, slow: 0 };
    this.hp = 100; this.maxHp = 100;
    this.shield = this.shieldMax; this.shieldDelay = 0;
    this.score = 0; this.credits = 0; this.wave = 0;
    this.combo = 0; this.comboTimer = 0; this.maxCombo = 0;
    this.stats = { kills: 0, shots: 0, hits: 0, bosses: 0, perfect: 0 };
    this.mods.clear(); this.event = null; this.nextEvent = null; this.offer = null; this.rerolls = 0;
    this.lastHit = null; this.empHintWave = 0;
    this.empTimer = 0; this.fireTimer = 0; this.slowmo = 0; this.flash = 0; this.dmgFlash = 0;
    this.planet.reset();
    this.syncDrones();
    this.startWave();
    UI.show(null);
  },

  buildWave(n) {
    const events = [];
    const boss = n % 5 === 0;
    const E = this.event || {};
    const count = Math.min(110, Math.round((6 + n * 2.6 + n * n * 0.04) * (boss ? 0.55 : 1) * (E.count || 1)));
    const duration = Math.min(14 + n * 1.6, 45);
    const weights = [['rock', 10]];
    if (n >= 2) weights.push(['fast', 2 + n * 0.5]);
    if (n >= 3) weights.push(['iron', 1.2 + n * 0.3]);
    if (n >= 4) weights.push(['volatile', 1.5 + n * 0.25]);
    if (n >= 6) weights.push(['comet', 1 + n * 0.2]);
    for (const k in E.weights || {}) {
      const w = weights.find(e => e[0] === k);
      if (w) w[1] += E.weights[k]; else weights.push([k, E.weights[k]]);
    }
    // kierunek nalotu: jeden sektor nieba (Perseidy) albo dwa przeciwne fronty
    const base = rand(0, TAU);
    const aim = type => E.fronts ? base + (Math.random() < 0.5 ? 0 : Math.PI) + rand(-0.45, 0.45)
      : E.sector && type === 'fast' ? base + rand(-E.sector, E.sector) : undefined;
    let i = 0;
    while (i < count) {
      const t = 0.8 + (i / count) * duration + rand(-0.6, 0.6);
      if ((n >= 3 || E.volley) && Math.random() < 0.1 + n * 0.01 + (E.volley || 0)) {
        // salwa z jednego kierunku
        const k = randInt(3, 4 + Math.floor(n / 4));
        const ang = E.fronts ? aim() : rand(0, TAU);
        for (let j = 0; j < k; j++) {
          const fast = n >= 2 && Math.random() < 0.5;
          events.push({ t: t + j * 0.22, type: fast ? 'fast' : 'rock', size: fast ? 0 : randInt(0, 1), angle: ang + rand(-0.18, 0.18) });
        }
        i += Math.ceil(k / 2);
      } else {
        const type = weightedPick(weights);
        let size = 0;
        if (type === 'rock') size = weightedPick([[0, 25], [1, 40], [2, 35]]);
        else if (type === 'iron') size = Math.random() < 0.55 ? 1 : 2;
        else if (type === 'volatile' || type === 'comet') size = 1;
        events.push({ t, type, size, angle: aim(type) });
        i++;
      }
    }
    if (boss) {
      // co druga planetoida to Bliźnięta: dwie mniejsze z przeciwnych stron
      if ((n / 5) % 2 === 0) {
        const a = rand(0, TAU);
        events.push({ t: 3.5, type: 'boss', size: 0, angle: a, k: 0.72 }, { t: 3.5, type: 'boss', size: 0, angle: a + Math.PI, k: 0.72 });
      } else events.push({ t: 3.5, type: 'boss', size: 0 });
    }
    events.sort((a, b) => a.t - b.t);
    return events;
  },

  startWave() {
    this.wave++;
    this.event = this.nextEvent; this.nextEvent = null; this.offer = null;
    this.spawnQueue = this.buildWave(this.wave);
    this.waveTotal = this.spawnQueue.length;
    this.waveTime = 0; this.waveDamage = 0; this.waveKills = 0; this.waveClear = 0;
    this.waveShots = this.stats.shots; this.waveHits = this.stats.hits;
    this.state = 'playing';
    const isBoss = this.wave % 5 === 0;
    let sub = isBoss ? ((this.wave / 5) % 2 === 0 ? 'Uwaga: nadlatują Bliźnięta – dwie planetoidy!' : 'Uwaga: nadlatuje planetoida!')
      : (WAVE_INTRO[this.wave] || pick(WAVE_FLAVOR));
    if (this.wave === 1 && UI.touch) sub = 'Przytrzymaj palec, by strzelać · dwa palce – EMP';
    UI.banner(`FALA ${this.wave}`, sub, isBoss ? 'danger' : '', this.event ? `${this.event.name}: ${this.event.desc}` : '');
    Sound.wave();
    Sound.setIntensity(1);
  },

  endWave() {
    this.state = 'shop';
    const perfect = this.waveDamage <= 0;
    let bonus = 40 + this.wave * 15;
    let scoreBonus = this.wave * 100;
    if (perfect) {
      bonus += Math.round(bonus * 0.6);
      scoreBonus += 300 * this.wave;
      this.stats.perfect++;
    }
    this.credits += bonus;
    this.score += scoreBonus;
    const heal = Math.min(10, this.maxHp - this.hp);
    this.hp += heal;
    this.shield = this.shieldMax;
    this.effects = { rapid: 0, spread: 0, slow: 0 };
    this.powerups = []; this.bullets = []; this.boss = null;
    this.combo = 0; this.comboTimer = 0;
    this.mouse.down = false;
    this.nextEvent = this.pickEvent(this.wave + 1);
    const w = this.wave;
    if (this.mods.size < PROTOCOL_MAX && (PROTOCOL_WAVES.includes(w) || (w > 18 && (w - 18) % 4 === 0))) this.offer = this.rollOffer();
    Sound.clear();
    Sound.setIntensity(0);
    const shots = this.stats.shots - this.waveShots, hits = this.stats.hits - this.waveHits;
    UI.showShop({
      wave: this.wave, kills: this.waveKills, acc: shots ? hits / shots : 0,
      bonus, scoreBonus, perfect, damage: this.waveDamage, heal,
    });
  },

  nextWave() {
    if (this.state !== 'shop') return;
    this.startWave();
    UI.show(null);
  },

  pickEvent(n) {
    if (n < 3 || n % 5 === 0) return null;
    const list = WAVE_EVENTS.filter(e => e.from <= n && (!this.event || e.id !== this.event.id));
    return list.length ? pick(list) : null;
  },

  rollOffer() {
    const pool = PROTOCOLS.filter(p => !this.mods.has(p.id));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 3);
  },
  get rerollCost() { return 100 + 50 * this.rerolls; },

  chooseProtocol(i) {
    if (this.state !== 'shop' || !this.offer || !this.offer[i]) return;
    const P = this.offer[i];
    this.mods.add(P.id);
    this.offer = null;
    this.shield = this.shieldMax;
    this.syncDrones();
    Sound.powerup();
    UI.renderShop();
  },

  rerollOffer() {
    if (this.state !== 'shop' || !this.offer) return;
    const cost = this.rerollCost;
    if (this.credits < cost) { Sound.deny(); UI.denyCard('reroll'); return; }
    this.credits -= cost;
    this.rerolls++;
    this.offer = this.rollOffer();
    Sound.buy();
    UI.renderShop();
  },

  buy(id) {
    if (this.state !== 'shop') return;
    const def = UPGRADES.find(u => u.id === id);
    if (!def) return;
    const lvl = this.up[id], cost = def.cost(lvl);
    if (lvl >= def.max || this.credits < cost || (id === 'repair' && this.hp >= this.maxHp)) {
      Sound.deny();
      UI.denyCard(id);
      return;
    }
    this.credits -= cost;
    this.up[id]++;
    if (id === 'repair') this.hp = Math.min(this.maxHp, this.hp + 25);
    if (id === 'shield') this.shield = this.shieldMax;
    if (id === 'drone') this.syncDrones();
    Sound.buy();
    UI.renderShop();
  },

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.pausedDrawn = false;
    this.mouse.down = false;
    UI.show('pause');
  },
  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    UI.show(null);
  },

  startDying() {
    this.state = 'dying';
    this.dyingTimer = 0; this.dyingBoom = 0;
    this.spawnQueue = [];
    this.drones = [];
    this.boss = null;
    this.mouse.down = false;
    this.shield = 0;
    Sound.gameOver();
    Sound.setIntensity(0);
    UI.show(null);
  },

  gameOver() {
    this.state = 'gameover';
    const best = Store.get('tz_best', 0), bestWave = Store.get('tz_bestwave', 0);
    const record = this.score > best;
    if (record) Store.set('tz_best', this.score);
    if (this.wave > bestWave) Store.set('tz_bestwave', this.wave);
    UI.showGameOver({
      lastHit: this.lastHit, mods: [...this.mods],
      score: this.score, wave: this.wave, kills: this.stats.kills,
      acc: this.stats.shots ? this.stats.hits / this.stats.shots : 0,
      maxCombo: this.maxCombo, bosses: this.stats.bosses, perfect: this.stats.perfect,
      record, best: Math.max(best, this.score),
    });
  },

  /* ---------- tworzenie obiektów ---------- */
  makeMeteor(type, size, x, y, vx, vy, k = 1) {
    const T = METEOR_TYPES[type];
    const r = T.radius[size] * this.scale * k;
    const hp = T.hp[size] * this.hpMul * k * k;
    return {
      type, T, size, x, y, vx, vy, r, hp, maxHp: hp,
      rot: rand(0, TAU), vr: rand(-1, 1) * T.spin * (22 / T.radius[size]),
      flash: 0, heat: 0, trailAcc: 0, age: 0, pulse: rand(0, TAU), spit: 3, cryo: 0,
      impactDmg: T.impact[size] * k * (this.demo ? 1 : 1 + this.wave * 0.03 + Math.max(this.wave - 15, 0) * 0.05),
      art: MeteorArt.get(type, r), dead: false,
    };
  },

  spawnMeteor(ev) {
    const T = METEOR_TYPES[ev.type];
    const ang = ev.angle !== undefined ? ev.angle : rand(0, TAU);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const r = T.radius[ev.size] * this.scale * (ev.k || 1);
    const hw = this.w / 2 + 40 + r, hh = this.h / 2 + 40 + r;
    const k = Math.min(hw / Math.max(Math.abs(ca), 1e-4), hh / Math.max(Math.abs(sa), 1e-4));
    const x = ca * k, y = sa * k;
    const off = rand(-0.8, 0.8) * this.R;
    let dx = -sa * off - x, dy = ca * off - y;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl; dy /= dl;
    const sp = this.baseSpeed * T.speed * SIZE_SPEED[ev.size] * rand(0.85, 1.15);
    const m = this.makeMeteor(ev.type, ev.size, x, y, dx * sp, dy * sp, ev.k);
    this.meteors.push(m);
    if (ev.type === 'boss') {
      const twin = !!ev.k;
      this.bossMaxSum = (this.boss && !this.boss.dead ? this.bossMaxSum : 0) + m.maxHp;
      this.boss = m;
      this.bossName = twin ? 'Bliźnięta' : 'Planetoida';
      Sound.boss();
      Sound.setIntensity(2);
      UI.callout(twin ? 'BLIŹNIĘTA NA KURSIE KOLIZYJNYM' : 'PLANETOIDA NA KURSIE KOLIZYJNYM', '255,90,90', true);
    }
    return m;
  },

  spawnPowerup(x, y) {
    if (this.powerups.length >= 8) return;
    const entries = Object.keys(POWERUPS).map(k => [k, k === 'repair' && this.hp < 50 ? POWERUPS[k].w * 2.5 : POWERUPS[k].w]);
    const type = weightedPick(entries);
    const a = rand(0, TAU), sp = rand(18, 45) * this.scale;
    const hw = this.w / 2 - 40, hh = this.h / 2 - 40;
    this.powerups.push({
      x: clamp(x, -hw, hw), y: clamp(y, -hh, hh), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      type, P: POWERUPS[type], life: 12, t: 0, r: 15 * Math.max(this.scale, 0.85), dead: false,
    });
  },

  syncDrones() {
    this.drones = [];
    for (let i = 0; i < this.droneCount; i++) this.drones.push({ cd: rand(0.2, 0.8), aim: 0, x: 0, y: 0, blink: rand(0, TAU) });
  },

  shieldActive() {
    return this.shield >= 1 && (this.state === 'playing' || this.state === 'paused' || this.demo);
  },

  /* ---------- aktualizacja ---------- */
  update(rawDt) {
    if (this.state === 'paused') return;
    this.time += rawDt;
    this.avgDt = lerp(this.avgDt, rawDt, 0.05);
    this.fxQuality = this.avgDt > 0.028 ? 0.5 : this.avgDt > 0.021 ? 0.75 : 1;
    this.fx.cap = 2400 * this.fxQuality;

    let ts = 1;
    if (this.slowmo > 0) { this.slowmo -= rawDt; ts = 0.3; }
    if (this.state === 'dying') ts = 0.45;
    const dt = rawDt * ts;
    const mdt = this.effects.slow > 0 ? dt * 0.4 : dt;
    this.dt = dt;
    this.rawDt = rawDt;

    this.shake = Math.min(30, this.shake) * Math.exp(-rawDt * 7);
    if (this.shake < 0.05) this.shake = 0;
    this.flash = Math.max(0, this.flash - rawDt * 1.5);
    this.dmgFlash = Math.max(0, this.dmgFlash - rawDt * 1.8);
    this.recoil = Math.max(0, this.recoil - dt * 10);
    const mk = Math.min(1, rawDt * 3);
    this.mouse.sx = lerp(this.mouse.sx, this.mouse.x, mk);
    this.mouse.sy = lerp(this.mouse.sy, this.mouse.y, mk);
    if (this.demo) this.turretAngle += dt * 0.35;
    else if (this.state === 'playing') this.turretAngle = Math.atan2(this.mouse.y, this.mouse.x);

    for (let i = this.shieldHits.length - 1; i >= 0; i--) {
      this.shieldHits[i].life -= dt;
      if (this.shieldHits[i].life <= 0) this.shieldHits.splice(i, 1);
    }
    this.fx.update(dt);
    this.updateDrones(dt);
    if (this.state === 'shop') return;

    if (this.state === 'menu') this.updateDemo(dt);
    else if (this.state !== 'gameover') this.updateGame(dt);
    this.updateBullets(dt);
    this.updateMeteors(mdt);
    this.updatePowerups(dt);
    this.updateShockwaves(dt);
    this.updateBlasts(dt);
  },

  updateDemo(dt) {
    this.demoTimer -= dt;
    if (this.demoTimer <= 0 && this.meteors.length < 10) {
      this.demoTimer = rand(0.8, 1.7);
      const type = weightedPick([['rock', 5], ['iron', 1], ['volatile', 1], ['comet', 1.2], ['fast', 1]]);
      const size = type === 'rock' ? randInt(0, 2) : type === 'iron' ? randInt(1, 2) : type === 'fast' ? 0 : 1;
      this.spawnMeteor({ type, size });
    }
  },

  updateGame(dt) {
    const E = this.effects;
    for (const k in E) if (E[k] > 0) E[k] = Math.max(0, E[k] - dt);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    this.empTimer = Math.max(0, this.empTimer - dt);

    if (this.state === 'playing' && !this.empUsed && this.empTimer <= 0 && this.empHintWave !== this.wave && this.waveTime > 4) {
      const r2 = this.empRadius * this.empRadius;
      let near = 0;
      for (const m of this.meteors) if (m.x * m.x + m.y * m.y < r2) near++;
      if (near >= 3) {
        this.empHintWave = this.wave;
        UI.callout(UI.touch ? 'DWA PALCE – IMPULS EMP!' : 'SPACJA – IMPULS EMP!', '94,242,255', true);
      }
    }

    if (this.state === 'playing') {
      if (this.shieldDelay > 0) this.shieldDelay -= dt;
      else if (this.shield < this.shieldMax) this.shield = Math.min(this.shieldMax, this.shield + this.shieldRegen * dt);

      this.waveTime += dt;
      while (this.spawnQueue.length && this.spawnQueue[0].t <= this.waveTime) this.spawnMeteor(this.spawnQueue.shift());

      if (this.mouse.down || this.autoFire) {
        this.fireTimer -= dt;
        let guard = 0;
        while (this.fireTimer <= 0 && guard++ < 4) {
          this.firePlayer();
          this.fireTimer += 1 / this.fireRate;
        }
      } else {
        this.fireTimer = Math.max(0, this.fireTimer - dt);
      }

      if (!this.spawnQueue.length && !this.meteors.length && !this.blasts.length) {
        this.waveClear += dt;
        if (this.waveClear > 1.4) this.endWave();
      } else this.waveClear = 0;
    } else if (this.state === 'dying') {
      this.dyingTimer += this.rawDt;
      this.planet.doom = Math.min(1, this.dyingTimer / 2.6);
      this.dyingBoom -= this.rawDt;
      if (this.dyingBoom <= 0) {
        this.dyingBoom = rand(0.06, 0.16);
        const a = rand(0, TAU), d = Math.sqrt(Math.random()) * this.R * 0.95;
        this.explode(Math.cos(a) * d, Math.sin(a) * d, rand(10, 28) * this.scale, 'planet');
        if (Math.random() < 0.5) this.planet.addImpact(a, rand(0.5, 1.5));
        Sound.explode(1.4);
        this.shake += 3;
      }
      if (this.dyingTimer > 3.1) {
        this.flash = 1;
        this.shake += 20;
        this.explode(0, 0, this.R * 1.2, 'planet', 2);
        this.gameOver();
      }
    }
  },

  firePlayer() {
    const a0 = this.turretAngle, n = this.shots;
    const step = this.effects.spread > 0 ? 0.13 : 0.075;
    const mr = this.R + 20 * this.scale;
    const mx = Math.cos(a0) * mr, my = Math.sin(a0) * mr;
    const sp = 980 * Math.max(this.scale, 0.7);
    const dmg = this.dmg;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i - (n - 1) / 2) * step;
      this.bullets.push({
        x: mx, y: my, px: mx, py: my, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        dmg, pierce: this.pierce, homing: this.up.homing, kind: 'p', life: 1.6, hit: null, counted: false, dead: false,
      });
    }
    this.stats.shots += n;
    this.recoil = 1;
    this.fx.add({ k: 'glow', x: mx, y: my, life: 0.08, s: 16 * this.scale, c: this.effects.rapid > 0 ? '255,220,120' : '120,240,255', a: 0.9 });
    Sound.shoot();
  },

  triggerEMP() {
    if (this.state !== 'playing') return;
    if (this.empTimer > 0) { Sound.deny(); return; }
    this.empTimer = this.empCd;
    if (!this.empUsed) { this.empUsed = true; Store.set('tz_emp', true); }
    this.addShockwave(this.empRadius, 55 * (1 + 0.25 * this.up.dmg) * Math.max(1, this.hpMul * 0.8), 170 * this.scale, '94,242,255');
    Sound.emp();
    this.shake += 5;
    this.flash = Math.max(this.flash, 0.12);
  },

  addShockwave(maxR, dmg, push, color, speed) {
    this.shockwaves.push({ r: this.R, maxR, dmg, push, color, speed: speed || 700 * this.scale, hit: new Set(), dead: false });
    this.fx.add({ k: 'glow', x: 0, y: 0, life: 0.5, s: this.R * 3, c: color, a: 0.8 });
    this.fx.add({ k: 'ring', x: 0, y: 0, life: 0.6, r0: this.R, r1: this.R * 1.8, s: 6, c: color, a: 0.9 });
  },

  damageMeteor(m, dmg) {
    if (m.dead) return;
    m.hp -= dmg;
    m.flash = 0.1;
    if (m.hp <= 0) this.killMeteor(m);
  },

  killMeteor(m) {
    if (m.dead) return;
    m.dead = true;
    const T = m.T, s = m.size, sc = this.scale;
    this.explode(m.x, m.y, m.r, T.palette, m.type === 'boss' ? 2.5 : 1);
    Sound.explode(m.r / (22 * sc));

    if (!this.demo) {
      this.combo++;
      this.comboTimer = this.comboTime;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      if (this.combo % 8 === 0) {
        Sound.combo(this.combo / 8);
        UI.callout(`COMBO ×${fmt1(this.multiplier)}`, '255,215,100');
      }
      const mult = this.multiplier;
      const pts = Math.round(T.score[s] * mult * (1 + (this.wave - 1) * 0.05));
      this.score += pts;
      this.credits += T.credits[s] * (this.has('scrap') ? 1.6 : 1) * (this.event && this.event.credits || 1);
      this.stats.kills++;
      this.waveKills++;
      this.floatText(m.x, m.y - m.r * 0.6, '+' + formatNum(pts), mult > 1 ? '255,220,120' : '220,240,255',
        m.type === 'boss' ? 30 : 12 + Math.min(m.r / sc * 0.18, 7));
      if (m.type === 'boss') { this.spawnPowerup(m.x - 20, m.y); this.spawnPowerup(m.x + 20, m.y); }
      else if (Math.random() < (T.drop || 0.05) * (this.event && this.event.drop || 1)) this.spawnPowerup(m.x, m.y);
      if (this.has('overload')) this.empTimer = Math.max(0, this.empTimer - 0.4);
      // Reakcja łańcuchowa: część zestrzeleń wybucha (ale wybuch nie odpala kolejnych – bez lawiny)
      if (this.has('chain') && !this.inBlast && m.type !== 'boss' && Math.random() < 0.2) {
        this.blasts.push({ x: m.x, y: m.y, r: 75 * sc, dmg: 30 * this.hpMul, t: 0.05, dead: false });
      }
    }

    // rozpad na odłamki
    if (m.type === 'rock' && s > 0) this.splitMeteor(m, 'rock', s - 1, 2, 0.55);
    else if (m.type === 'comet') this.splitMeteor(m, 'ice', 0, 4, 0.4);
    else if (m.type === 'boss') {
      this.splitMeteor(m, 'rock', 1, 3, 0.6);
      this.splitMeteor(m, 'iron', 1, 2, 1.2);
    }
    if (T.blast) {
      this.blasts.push({ x: m.x, y: m.y, r: T.blast * sc, dmg: 45 * this.hpMul, t: 0.07, dead: false });
    }
    if (m.type === 'boss') {
      this.slowmo = 1.2;
      this.shake += 25;
      this.flash = 0.6;
      if (!this.demo) {
        this.stats.bosses++;
        const twinLeft = this.meteors.some(o => o !== m && o.type === 'boss' && !o.dead);
        UI.callout(twinLeft ? 'JEDNA Z BLIŹNIĄT ZNISZCZONA!' : this.bossName === 'Bliźnięta' ? 'BLIŹNIĘTA ZNISZCZONE!' : 'PLANETOIDA ZNISZCZONA!', '255,200,90', true);
        Sound.clear();
        if (!twinLeft) Sound.setIntensity(1);
      }
    }
  },

  splitMeteor(m, type, size, count, spread) {
    const sp = Math.max(Math.hypot(m.vx, m.vy), this.baseSpeed);
    const base = Math.atan2(m.vy, m.vx);
    const px = -Math.sin(base), py = Math.cos(base);
    for (let i = 0; i < count; i++) {
      const o = i - (count - 1) / 2;
      const a = base + o * spread + rand(-0.15, 0.15);
      const c = this.makeMeteor(type, size, m.x + px * o * m.r * 0.7, m.y + py * o * m.r * 0.7,
        Math.cos(a) * sp * rand(0.9, 1.1), Math.sin(a) * sp * rand(0.9, 1.1));
      this.meteors.push(c);
    }
  },

  explode(x, y, r, palName, intensity = 1) {
    const P = PALETTES[palName] || PALETTES.rock, fx = this.fx;
    const n = Math.min(8 + r * 0.9, 50) * intensity * this.fxQuality;
    fx.add({ k: 'glow', x, y, life: 0.3, s: r * 3.2, c: P.glow, a: 1 });
    fx.add({ k: 'glow', x, y, life: 0.12, s: r * 1.5, c: '255,255,255', a: 0.9 });
    fx.add({ k: 'ring', x, y, life: 0.5, r0: r * 0.4, r1: r * 2.6, s: 3, c: P.spark, a: 0.7 });
    const spk = 0.6 + r / 40;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(50, 260) * spk;
      fx.add({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.25, 0.7), s: rand(1, 2.2), c: P.spark, len: 0.045, drag: 2.5 });
    }
    for (let i = 0; i < n * 0.35; i++) {
      const a = rand(0, TAU), sp = rand(8, 45);
      fx.add({ k: 'smoke', x: x + rand(-r, r) * 0.4, y: y + rand(-r, r) * 0.4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.9, 1.8), s: r * rand(0.35, 0.6), grow: 1.6, c: P.smoke, a: 0.5, drag: 1.5 });
    }
    for (let i = 0; i < n * 0.3; i++) {
      const a = rand(0, TAU), sp = rand(40, 190) * spk;
      fx.add({ k: 'debris', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.6, 1.3),
        s: rand(1.5, 3.5) * (0.6 + r / 35), c: P.debris, rot: rand(0, TAU), vr: rand(-10, 10), drag: 1.2 });
    }
    for (let i = 0; i < n * 0.25; i++) {
      const a = rand(0, TAU), sp = rand(30, 140) * spk;
      fx.add({ k: 'glow', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.9), s: rand(3, 6), c: P.glow, a: 0.9, drag: 2 });
    }
  },

  updateDrones(dt) {
    if (!this.drones.length) return;
    this.droneAngle += dt * 0.45;
    const orbit = this.R + 62 * this.scale, n = this.drones.length;
    const range2 = Math.pow(430 * this.scale, 2);
    const hw = this.w / 2, hh = this.h / 2;
    const canShoot = this.state === 'playing' || this.state === 'menu';
    for (let i = 0; i < n; i++) {
      const d = this.drones[i];
      const a = this.droneAngle + i * TAU / n;
      d.x = Math.cos(a) * orbit; d.y = Math.sin(a) * orbit;
      d.cd -= dt;
      let best = null, bd = range2;
      if (canShoot) {
        for (const m of this.meteors) {
          if (m.dead || Math.abs(m.x) > hw || Math.abs(m.y) > hh) continue;
          const d2 = (m.x - d.x) * (m.x - d.x) + (m.y - d.y) * (m.y - d.y);
          if (d2 < bd) { bd = d2; best = m; }
        }
      }
      if (best) {
        const sp = 820 * Math.max(this.scale, 0.7), t = Math.sqrt(bd) / sp;
        const tx = best.x + best.vx * t, ty = best.y + best.vy * t;
        const want = Math.atan2(ty - d.y, tx - d.x);
        d.aim += angleDiff(d.aim, want) * Math.min(1, dt * 12);
        if (d.cd <= 0 && Math.abs(angleDiff(d.aim, want)) < 0.3) {
          d.cd = 1 / 1.7;
          this.bullets.push({
            x: d.x, y: d.y, px: d.x, py: d.y, vx: Math.cos(d.aim) * sp, vy: Math.sin(d.aim) * sp,
            dmg: this.dmg * 0.6 * (this.has('swarm') ? 0.5 : 1), pierce: 0, homing: 0, kind: 'd', life: 1.2, hit: null, dead: false,
          });
          this.fx.add({ k: 'glow', x: d.x + Math.cos(d.aim) * 10 * this.scale, y: d.y + Math.sin(d.aim) * 10 * this.scale, life: 0.08, s: 10 * this.scale, c: '140,255,160', a: 0.9 });
          if (!this.demo) Sound.droneShot();
        }
      } else {
        d.aim += angleDiff(d.aim, a) * Math.min(1, dt * 2);
      }
    }
  },

  updateBullets(dt) {
    const hw = this.w / 2 + 40, hh = this.h / 2 + 40, ms = this.meteors;
    const homingRange2 = Math.pow(400 * this.scale, 2);
    for (const b of this.bullets) {
      if (b.homing && ms.length) {
        const sp = Math.hypot(b.vx, b.vy), ux = b.vx / sp, uy = b.vy / sp;
        let best = null, bd = homingRange2;
        for (const m of ms) {
          if (m.dead) continue;
          const dx = m.x - b.x, dy = m.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 > bd || dx * ux + dy * uy <= 0) continue;
          bd = d2; best = m;
        }
        if (best) {
          const want = Math.atan2(best.y - b.y, best.x - b.x), cur = Math.atan2(b.vy, b.vx);
          const turn = b.homing * 3.2 * dt;
          const na = cur + clamp(angleDiff(cur, want), -turn, turn);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
      }
      b.px = b.x; b.py = b.y;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -hw || b.x > hw || b.y < -hh || b.y > hh) { b.dead = true; continue; }

      for (const m of ms) {
        if (m.dead) continue;
        const rr = m.r + 3;
        if (segDist2(b.px, b.py, b.x, b.y, m.x, m.y) > rr * rr) continue;
        if (b.hit && b.hit.has(m)) continue;
        if (b.kind === 'p' && !b.counted) { b.counted = true; this.stats.hits++; }
        const P = PALETTES[m.T.palette], sp = Math.hypot(b.vx, b.vy) || 1;
        const ux = b.vx / sp, uy = b.vy / sp;
        const back = Math.atan2(-uy, -ux);
        for (let i = 0; i < 4 * this.fxQuality + 1; i++) {
          const a = back + rand(-0.9, 0.9), s2 = rand(60, 220);
          this.fx.add({ k: 'spark', x: b.x, y: b.y, vx: Math.cos(a) * s2, vy: Math.sin(a) * s2, life: rand(0.15, 0.35), s: 1.3, c: P.spark, len: 0.035, drag: 3 });
        }
        this.fx.add({ k: 'glow', x: b.x, y: b.y, life: 0.12, s: 9 * this.scale, c: P.glow, a: 0.9 });
        if (m.type !== 'boss') {
          // odrzut z limitem – przy mocnym dziale nie wystrzeliwuje meteorytów daleko za ekran
          const kb = Math.min(b.dmg * 1.2, 40 * this.scale) / Math.max(1, Math.pow(m.r / (13 * this.scale), 2));
          m.vx += ux * kb; m.vy += uy * kb;
        }
        Sound.hit();
        if (this.has('cryo')) m.cryo = 1.5;
        this.damageMeteor(m, b.dmg);
        if (b.pierce > 0) {
          b.pierce--;
          (b.hit || (b.hit = new Set())).add(m);
        } else { b.dead = true; break; }
      }
      if (b.dead || b.kind !== 'p') continue;
      for (const p of this.powerups) {
        if (p.dead) continue;
        const rr = p.r + 5;
        if (segDist2(b.px, b.py, b.x, b.y, p.x, p.y) < rr * rr) {
          this.collectPowerup(p);
          b.dead = true;
          break;
        }
      }
    }
    this.bullets = this.bullets.filter(b => !b.dead);
  },

  updateMeteors(dt) {
    const R = this.R, hw = this.w / 2, hh = this.h / 2;
    const shieldUp = this.shieldActive();
    const back = -0.5 * this.baseSpeed;
    for (const m of this.meteors) {
      if (m.dead) continue;
      // Kriopociski spowalniają trafiony meteoryt
      if (m.cryo > 0) m.cryo -= dt;
      const mdt = m.cryo > 0 ? dt * 0.55 : dt;
      let d = Math.hypot(m.x, m.y) || 1;
      const ux = m.x / d, uy = m.y / d;
      const a = this.GM / Math.max(d * d, R * R);
      m.vx -= ux * a * mdt; m.vy -= uy * a * mdt;
      // tłumienie ruchu stycznego – meteoryt nie wejdzie na stałą orbitę
      const vr = m.vx * ux + m.vy * uy;
      const tx = m.vx - vr * ux, ty = m.vy - vr * uy, damp = 0.25 * mdt;
      m.vx -= tx * damp; m.vy -= ty * damp;
      // wypchnięty za krawędź (odrzut, EMP) zawraca, zamiast odlatywać w pustkę i wstrzymywać koniec fali
      const off = Math.abs(m.x) > hw || Math.abs(m.y) > hh;
      m.off = off ? (m.off || 0) + dt : 0;
      if (m.off > 5) {
        // za długo poza kadrem – prosto na planetę
        m.vx = ux * back * 2.4; m.vy = uy * back * 2.4;
      } else if (off && vr > back * 0.5) {
        const k = Math.min(1, 2.5 * dt);
        m.vx += ux * (back - vr) * k; m.vy += uy * (back - vr) * k;
      }
      m.x += m.vx * mdt; m.y += m.vy * mdt;
      m.rot += m.vr * mdt;
      if (m.flash > 0) m.flash -= dt;
      m.age += dt;
      d = Math.hypot(m.x, m.y);
      m.heat = smoothstep(R * 3.4, R * 1.25, d);
      this.emitTrail(m, dt);

      if (m.type === 'boss' && !this.demo && this.state === 'playing') {
        m.spit -= dt;
        const onScreen = Math.abs(m.x) < hw - m.r * 0.5 && Math.abs(m.y) < hh - m.r * 0.5;
        if (m.spit <= 0 && onScreen) {
          m.spit = Math.max(1.6, 3.2 - this.wave * 0.08);
          const sa = Math.atan2(-m.y, -m.x) + rand(-0.6, 0.6), sp = this.baseSpeed * 1.5;
          this.meteors.push(this.makeMeteor('rock', 0, m.x + Math.cos(sa) * m.r, m.y + Math.sin(sa) * m.r, Math.cos(sa) * sp, Math.sin(sa) * sp));
          this.fx.add({ k: 'glow', x: m.x + Math.cos(sa) * m.r, y: m.y + Math.sin(sa) * m.r, life: 0.4, s: 30 * this.scale, c: '255,120,40', a: 0.9 });
        }
      }
      if (d > this.farDist) { m.dead = true; continue; }
      const hitR = shieldUp ? this.Rs + m.r * 0.55 : R + m.r * 0.3;
      if (d < hitR) this.meteorImpact(m);
    }
    this.meteors = this.meteors.filter(m => !m.dead);
    if (this.boss && this.boss.dead) this.boss = this.meteors.find(m => m.type === 'boss') || null;
  },

  // Łączne życie planetoid na ekranie (Bliźnięta mają wspólny pasek)
  bossFrac() {
    let hp = 0;
    for (const m of this.meteors) if (m.type === 'boss' && !m.dead) hp += Math.max(0, m.hp);
    return this.bossMaxSum ? hp / this.bossMaxSum : 0;
  },

  emitTrail(m, dt) {
    const kind = m.T.trail;
    if (this.fx.items.length > this.fx.cap * 0.6) { m.trailAcc = 0; return; }
    m.trailAcc += dt * this.fxQuality;
    const interval = kind === 'comet' ? 0.012 : kind === 'fire' ? 0.018 : kind === 'boss' ? 0.02 : kind === 'ember' ? 0.035 : kind === 'frost' ? 0.03 : 0.06;
    let guard = 0;
    while (m.trailAcc > interval && guard++ < 5) {
      m.trailAcc -= interval;
      const sp = Math.hypot(m.vx, m.vy) || 1, bx = -m.vx / sp, by = -m.vy / sp;
      const ox = m.x + bx * m.r * 0.6 + rand(-0.35, 0.35) * m.r, oy = m.y + by * m.r * 0.6 + rand(-0.35, 0.35) * m.r;
      const fx = this.fx;
      switch (kind) {
        case 'dust':
          fx.add({ k: 'smoke', x: ox, y: oy, vx: bx * 20 + rand(-8, 8), vy: by * 20 + rand(-8, 8), life: rand(0.5, 0.9), s: m.r * rand(0.25, 0.45), grow: 1.2, c: '95,85,80', a: 0.2, drag: 1 });
          break;
        case 'fire':
          fx.add({ k: 'glow', x: ox, y: oy, vx: bx * 40, vy: by * 40, life: 0.35, s: m.r * rand(0.9, 1.4), c: '255,100,60', a: 0.7 });
          break;
        case 'ember':
          fx.add({ k: 'glow', x: ox, y: oy, vx: bx * 30 + rand(-20, 20), vy: by * 30 + rand(-20, 20), life: rand(0.4, 0.7), s: rand(2.5, 5), c: '255,150,40', a: 1, drag: 1 });
          if (Math.random() < 0.4) fx.add({ k: 'smoke', x: ox, y: oy, vx: bx * 15, vy: by * 15, life: 0.8, s: m.r * 0.35, grow: 1.3, c: '70,45,35', a: 0.25 });
          break;
        case 'comet':
          fx.add({ k: 'glow', x: ox, y: oy, vx: bx * rand(40, 90) + rand(-10, 10), vy: by * rand(40, 90) + rand(-10, 10), life: rand(0.6, 1.1), s: m.r * rand(0.7, 1.3), c: '140,215,255', a: 0.55, grow: 0.5 });
          if (Math.random() < 0.3) fx.add({ k: 'glow', x: ox, y: oy, vx: bx * 60, vy: by * 60, life: 0.5, s: 3, c: '255,255,255', a: 1 });
          break;
        case 'frost':
          fx.add({ k: 'glow', x: ox, y: oy, vx: bx * 30, vy: by * 30, life: 0.4, s: m.r * 0.8, c: '170,230,255', a: 0.5 });
          break;
        case 'boss':
          fx.add({ k: 'smoke', x: ox, y: oy, vx: bx * 25 + rand(-10, 10), vy: by * 25 + rand(-10, 10), life: rand(1, 1.6), s: m.r * rand(0.3, 0.5), grow: 1.4, c: '60,42,36', a: 0.3 });
          fx.add({ k: 'glow', x: ox, y: oy, vx: bx * 40 + rand(-30, 30), vy: by * 40 + rand(-30, 30), life: rand(0.4, 0.8), s: rand(3, 7), c: '255,110,40', a: 1, drag: 1 });
          break;
      }
      if (m.heat > 0.05) {
        fx.add({ k: 'glow', x: m.x + bx * m.r * 0.5, y: m.y + by * m.r * 0.5, vx: bx * 60 + rand(-15, 15), vy: by * 60 + rand(-15, 15),
          life: rand(0.25, 0.45), s: m.r * (0.6 + m.heat * 0.9), c: '255,120,40', a: m.heat * 0.85 });
      }
    }
  },

  meteorImpact(m) {
    m.dead = true;
    const ang = Math.atan2(m.y, m.x), ca = Math.cos(ang), sa = Math.sin(ang);
    const power = m.r / (22 * this.scale);
    // planetoida przy pełnej tarczy nie zabija jednym uderzeniem
    const dmg = m.type === 'boss' ? Math.min(m.impactDmg, this.shieldMax + 40) : m.impactDmg;
    if (this.shieldActive()) {
      this.explode(ca * this.Rs, sa * this.Rs, m.r * 0.9, 'shield');
      this.shieldHits.push({ a: ang, life: 0.7, max: 0.7, p: Math.min(1, 0.45 + power * 0.3) });
      Sound.shieldHit();
      this.shake += 3 + power * 2;
      if (!this.demo) {
        this.shield -= dmg;
        this.shieldDelay = 2.5;
        if (this.has('cascade')) { this.combo = 0; this.comboTimer = 0; }
        if (this.has('mirror')) this.mirrorShots(ca * this.Rs, sa * this.Rs, m);
        if (this.shield < 1) {
          const over = Math.max(0, -this.shield);
          this.shield = 0;
          this.shieldBreak();
          if (over > 0) {
            this.planet.addImpact(ang, power * 0.5);
            this.hurtPlanet(over, ang, m.type);
          }
        }
      }
      return;
    }
    const x = ca * this.R, y = sa * this.R;
    this.explode(x, y, m.r * 1.3, 'planet', 1.4);
    for (let i = 0; i < 6; i++) {
      this.fx.add({ k: 'glow', x: x + rand(-6, 6), y: y + rand(-6, 6), vx: ca * rand(10, 40), vy: sa * rand(10, 40), life: rand(0.8, 1.6), s: m.r * rand(0.5, 0.9), c: '255,120,30', a: 0.8, drag: 1 });
    }
    this.planet.addImpact(ang, power);
    this.shake += 6 + power * 6;
    Sound.impact();
    if (this.state === 'playing') this.hurtPlanet(dmg, ang, m.type);
  },

  // Tarcza zwierciadlana: odbite uderzenie wraca jako 3 pociski w najbliższe cele
  mirrorShots(x, y, src) {
    const near = this.meteors.filter(o => !o.dead && o !== src)
      .sort((a, b) => (a.x - x) ** 2 + (a.y - y) ** 2 - (b.x - x) ** 2 - (b.y - y) ** 2).slice(0, 3);
    const sp = 820 * Math.max(this.scale, 0.7);
    for (const t of near) {
      const tt = Math.hypot(t.x - x, t.y - y) / sp;
      const a = Math.atan2(t.y + t.vy * tt - y, t.x + t.vx * tt - x);
      this.bullets.push({ x, y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        dmg: this.dmg * 0.8, pierce: 0, homing: 0, kind: 'd', life: 1.2, hit: null, dead: false });
    }
  },

  hurtPlanet(dmg, ang, src) {
    this.hp -= dmg;
    this.lastHit = src || this.lastHit;
    this.waveDamage += dmg;
    this.dmgFlash = Math.min(1, 0.35 + dmg / 25);
    this.combo = 0; this.comboTimer = 0;
    this.floatText(Math.cos(ang) * (this.R + 34 * this.scale), Math.sin(ang) * (this.R + 34 * this.scale), '−' + Math.ceil(dmg), '255,90,90', 17);
    if (this.hp <= 0) {
      this.hp = 0;
      this.startDying();
    }
  },

  shieldBreak() {
    Sound.shieldDown();
    this.fx.add({ k: 'ring', x: 0, y: 0, life: 0.7, r0: this.Rs, r1: this.Rs * 1.6, s: 5, c: '94,242,255', a: 1 });
    for (let i = 0; i < 40; i++) {
      const a = rand(0, TAU), sp = rand(60, 200);
      this.fx.add({ k: 'spark', x: Math.cos(a) * this.Rs, y: Math.sin(a) * this.Rs, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.7), s: 1.5, c: '150,250,255', len: 0.04, drag: 2 });
    }
    if (!this.demo && this.state === 'playing') UI.callout('TARCZA PADŁA!', '94,242,255');
  },

  collectPowerup(p) {
    p.dead = true;
    const P = p.P;
    switch (p.type) {
      case 'rapid': this.effects.rapid = P.dur; break;
      case 'spread': this.effects.spread = P.dur; break;
      case 'slow': this.effects.slow = P.dur; break;
      case 'shield': this.shield = this.shieldMax; this.shieldDelay = 0; break;
      case 'repair': this.hp = Math.min(this.maxHp, this.hp + 15); break;
      case 'nuke':
        this.addShockwave(Math.hypot(this.w, this.h) / 2 + 120, 260 * this.hpMul, 260 * this.scale, '255,130,80', 950 * this.scale);
        this.flash = 0.8;
        this.shake += 14;
        Sound.nuke();
        break;
    }
    this.fx.add({ k: 'ring', x: p.x, y: p.y, life: 0.5, r0: p.r, r1: p.r * 4, s: 4, c: P.color, a: 1 });
    this.fx.add({ k: 'glow', x: p.x, y: p.y, life: 0.4, s: p.r * 5, c: P.color, a: 1 });
    UI.callout(P.name, P.color);
    Sound.powerup();
  },

  updatePowerups(dt) {
    const hw = this.w / 2 - 30, hh = this.h / 2 - 30, keep = this.Rs + 40 * this.scale;
    for (const p of this.powerups) {
      p.t += dt; p.life -= dt;
      if (p.life <= 0) {
        p.dead = true;
        this.fx.add({ k: 'ring', x: p.x, y: p.y, life: 0.3, r0: p.r, r1: p.r * 0.2, s: 2, c: p.P.color, a: 0.8 });
        continue;
      }
      const d = Math.hypot(p.x, p.y) || 1;
      if (d < keep) { p.vx += p.x / d * 120 * dt; p.vy += p.y / d * 120 * dt; }
      const f = Math.max(0, 1 - 0.3 * dt);
      p.vx *= f; p.vy *= f;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < -hw || p.x > hw) { p.vx = -p.vx; p.x = clamp(p.x, -hw, hw); }
      if (p.y < -hh || p.y > hh) { p.vy = -p.vy; p.y = clamp(p.y, -hh, hh); }
    }
    this.powerups = this.powerups.filter(p => !p.dead);
  },

  updateShockwaves(dt) {
    for (const s of this.shockwaves) {
      s.r += s.speed * dt;
      for (const m of this.meteors) {
        if (m.dead || s.hit.has(m)) continue;
        const d = Math.hypot(m.x, m.y) || 1;
        if (d - m.r < s.r) {
          s.hit.add(m);
          const k = 1 - (s.r / s.maxR) * 0.5;
          if (m.type !== 'boss') { m.vx += m.x / d * s.push * k; m.vy += m.y / d * s.push * k; }
          this.fx.add({ k: 'glow', x: m.x, y: m.y, life: 0.25, s: m.r * 2, c: s.color, a: 0.8 });
          this.damageMeteor(m, s.dmg);
        }
      }
      if (s.r >= s.maxR) s.dead = true;
    }
    this.shockwaves = this.shockwaves.filter(s => !s.dead);
  },

  // Pływające liczby trzymane w kadrze – przy krawędzi nie są ucinane
  floatText(x, y, str, color, size, life) {
    const hw = this.w / 2, hh = this.h / 2;
    this.fx.text(clamp(x, -hw + 50, hw - 50), clamp(y, -hh + 90, hh - 60), str, color, size, life);
  },

  updateBlasts(dt) {
    this.inBlast = true;
    for (const b of this.blasts) {
      b.t -= dt;
      if (b.t > 0 || b.dead) continue;
      b.dead = true;
      this.explode(b.x, b.y, b.r * 0.45, 'volatile', 1.3);
      this.fx.add({ k: 'ring', x: b.x, y: b.y, life: 0.45, r0: 10, r1: b.r, s: 5, c: '255,170,60', a: 0.9 });
      this.fx.add({ k: 'glow', x: b.x, y: b.y, life: 0.35, s: b.r * 1.2, c: '255,140,40', a: 0.7 });
      this.shake += 4;
      Sound.explode(1.8);
      for (const m of this.meteors) {
        if (m.dead) continue;
        if (Math.hypot(m.x - b.x, m.y - b.y) < b.r + m.r) this.damageMeteor(m, b.dmg);
      }
    }
    this.inBlast = false;
    this.blasts = this.blasts.filter(b => !b.dead);
  },

  /* ---------- rysowanie ---------- */
  render() {
    // w pauzie obraz stoi – wystarczy narysować go raz
    if (this.state === 'paused') {
      if (this.pausedDrawn) return;
      this.pausedDrawn = true;
    }
    const ctx = this.ctx, w = this.w, h = this.h;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const paused = this.state === 'paused';
    this.bg.draw(ctx, this.time, this.mouse.sx * 0.03, this.mouse.sy * 0.03, paused ? 0 : this.rawDt || 0);
    if (!paused) this.planet.render(this.dt);

    const shake = this.shakeOn ? this.shake : 0;
    const sx = shake ? rand(-1, 1) * shake : 0, sy = shake ? rand(-1, 1) * shake : 0;
    ctx.save();
    ctx.translate(w / 2 + sx, h / 2 + sy);
    this.fx.drawNormal(ctx);
    this.drawPlanet(ctx);
    if (this.drones.length) this.drawDrones(ctx);
    if (this.state !== 'dying' && this.state !== 'gameover') this.drawTurret(ctx);
    this.drawMeteors(ctx);
    this.drawShield(ctx);
    this.drawPowerups(ctx);
    this.drawBullets(ctx);
    this.fx.drawAdditive(ctx);
    this.drawShockwaves(ctx);
    this.fx.drawTexts(ctx);
    if (!this.demo && this.state !== 'gameover') this.drawIndicators(ctx);
    if (this.state === 'playing') this.drawReticle(ctx);
    ctx.restore();
    this.drawOverlay(ctx);
  },

  drawPlanet(ctx) {
    const R = this.R, doom = this.planet.doom;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, R * 0.85, 0, 0, R * 1.5);
    const c1 = doom > 0 ? `${Math.round(lerp(80, 255, doom))},${Math.round(lerp(160, 70, doom))},${Math.round(lerp(255, 30, doom))}` : '80,160,255';
    g.addColorStop(0, `rgba(${c1},0.5)`);
    g.addColorStop(0.3, `rgba(${c1},0.16)`);
    g.addColorStop(1, `rgba(${c1},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.5, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.planet.canvas, -R, -R, R * 2, R * 2);
  },

  drawTurret(ctx) {
    const R = this.R, s = this.scale, rec = this.recoil * 4 * s;
    const barrels = Math.min(1 + this.up.multi, 5);
    ctx.save();
    ctx.rotate(this.turretAngle);
    const bw = 3.2 * s, gap = 4.2 * s;
    for (let i = 0; i < barrels; i++) {
      const o = (i - (barrels - 1) / 2) * gap;
      ctx.fillStyle = '#9fb6cc';
      ctx.fillRect(R - 2 * s - rec, o - bw / 2, 21 * s, bw);
      ctx.fillStyle = this.effects.rapid > 0 ? '#ffe08a' : '#8ff6ff';
      ctx.fillRect(R + 16 * s - rec, o - bw / 2, 3 * s, bw);
    }
    ctx.fillStyle = '#22334a';
    ctx.strokeStyle = 'rgba(120,240,255,0.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(R - 2 * s, 0, (9 + barrels * 0.8) * s, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.8;
    const gs = 12 * s;
    ctx.drawImage(SpriteCache.glow('94,242,255'), R + 2 * s - gs, -gs, gs * 2, gs * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  },

  drawDrones(ctx) {
    const s = this.scale, orbit = this.R + 62 * s;
    ctx.strokeStyle = 'rgba(140,255,170,0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 9]);
    ctx.beginPath(); ctx.arc(0, 0, orbit, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    for (const d of this.drones) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.aim);
      ctx.fillStyle = '#1d3b6e';
      ctx.strokeStyle = '#6fb6ff';
      ctx.lineWidth = 1;
      ctx.fillRect(-4 * s, -14 * s, 8 * s, 7 * s); ctx.strokeRect(-4 * s, -14 * s, 8 * s, 7 * s);
      ctx.fillRect(-4 * s, 7 * s, 8 * s, 7 * s); ctx.strokeRect(-4 * s, 7 * s, 8 * s, 7 * s);
      ctx.fillStyle = '#8a9bb0';
      ctx.fillRect(-1 * s, -7 * s, 2 * s, 14 * s);
      ctx.fillStyle = '#b8ffc6';
      ctx.fillRect(3 * s, -1.5 * s, 8 * s, 3 * s);
      ctx.fillStyle = '#dbe6f2';
      ctx.beginPath(); ctx.arc(0, 0, 5 * s, 0, TAU); ctx.fill();
      ctx.restore();
      if (Math.sin(this.time * 4 + d.blink) > 0.5) {
        ctx.globalCompositeOperation = 'lighter';
        const gs = 7 * s;
        ctx.drawImage(SpriteCache.glow('120,255,140'), d.x - gs, d.y - gs, gs * 2, gs * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  },

  drawMeteors(ctx) {
    const t = this.time;
    for (const m of this.meteors) {
      const art = m.art, hs = art.half;
      if (m.type === 'volatile' || m.type === 'boss' || m.type === 'comet') {
        ctx.globalCompositeOperation = 'lighter';
        const pul = m.type === 'volatile' ? 0.55 + 0.45 * Math.sin(t * 8 + m.pulse) : 0.65;
        ctx.globalAlpha = pul * (m.type === 'boss' ? 0.55 : 0.7);
        const s = m.r * (m.type === 'comet' ? 2.6 : 2.2);
        ctx.drawImage(SpriteCache.glow(m.type === 'comet' ? '140,210,255' : '255,120,30'), m.x - s, m.y - s, s * 2, s * 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.rot);
      ctx.drawImage(art.canvas, -hs, -hs, hs * 2, hs * 2);
      if (m.cryo > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, m.cryo * 2) * 0.35;
        ctx.drawImage(art.white, -hs, -hs, hs * 2, hs * 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      if (m.flash > 0) {
        ctx.globalAlpha = Math.min(1, m.flash * 10) * 0.75;
        ctx.drawImage(art.white, -hs, -hs, hs * 2, hs * 2);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
      if (m.heat > 0.02) {
        const d = Math.hypot(m.x, m.y) || 1;
        const lx = m.x - m.x / d * m.r * 0.55, ly = m.y - m.y / d * m.r * 0.55;
        const s = m.r * (1.2 + m.heat * 1.6);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = m.heat * 0.85;
        ctx.drawImage(SpriteCache.glow('255,140,50'), lx - s, ly - s, s * 2, s * 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      if (m.type !== 'boss' && m.maxHp >= 60 && m.hp < m.maxHp) {
        const bw = m.r * 1.4, by = m.y - m.r - 8;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(m.x - bw / 2 - 1, by - 1, bw + 2, 5);
        ctx.fillStyle = m.type === 'iron' ? '#cfe3ff' : '#ffb070';
        ctx.fillRect(m.x - bw / 2, by, bw * Math.max(0, m.hp / m.maxHp), 3);
      }
    }
  },

  drawShield(ctx) {
    const active = this.shieldActive() || this.state === 'shop';
    if (!active && !this.shieldHits.length) return;
    const frac = this.demo ? 1 : clamp(this.shield / this.shieldMax, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (active) {
      let a = 0.22 + 0.45 * frac;
      if (frac < 0.3) a *= 0.6 + 0.4 * Math.random();
      ctx.globalAlpha = a;
      const S = this.Rs + 4;
      ctx.rotate(this.time * 0.04);
      ctx.drawImage(this.shieldArt, -S, -S, S * 2, S * 2);
      ctx.rotate(-this.time * 0.04);
    }
    ctx.strokeStyle = '#a5fcff';
    ctx.lineCap = 'round';
    for (const hh of this.shieldHits) {
      const k = hh.life / hh.max;
      ctx.globalAlpha = k * hh.p;
      ctx.lineWidth = (3 + 5 * k) * this.scale;
      ctx.beginPath(); ctx.arc(0, 0, this.Rs, hh.a - 0.45, hh.a + 0.45); ctx.stroke();
      const gs = 45 * k * this.scale;
      ctx.drawImage(SpriteCache.glow('120,240,255'), Math.cos(hh.a) * this.Rs - gs, Math.sin(hh.a) * this.Rs - gs, gs * 2, gs * 2);
    }
    ctx.restore();
  },

  drawPowerups(ctx) {
    for (const p of this.powerups) {
      if (p.life < 3 && Math.sin(p.t * 22) < 0) continue;
      const r = p.r * (1 + Math.sin(p.t * 5) * 0.06);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.6;
      ctx.drawImage(SpriteCache.glow(p.P.color), -r * 3, -r * 3, r * 6, r * 6);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.rotate(p.t * 0.8);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3;
        if (k) ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(8,16,28,0.85)';
      ctx.fill();
      ctx.strokeStyle = `rgb(${p.P.color})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.rotate(-p.t * 0.8);
      ctx.setLineDash([3, 5]);
      ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(0, 0, r * 1.45, p.t * 2, p.t * 2 + TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = ctx.strokeStyle = `rgb(${p.P.color})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawPowerIcon(ctx, p.type, r * 0.5);
      ctx.restore();
    }
  },

  drawBullets(ctx) {
    if (!this.bullets.length) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const pc = this.effects.rapid > 0 ? '255,215,110' : '100,235,255';
    const groups = [['p', pc, 4.5], ['d', '120,255,150', 3.5]];
    for (const [kind, col, lw] of groups) {
      ctx.beginPath();
      let any = false;
      for (const b of this.bullets) {
        if (b.kind !== kind) continue;
        any = true;
        ctx.moveTo(b.x - b.vx * 0.028, b.y - b.vy * 0.028);
        ctx.lineTo(b.x, b.y);
      }
      if (!any) continue;
      ctx.strokeStyle = `rgba(${col},0.4)`;
      ctx.lineWidth = lw * Math.max(this.scale, 0.7);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(235,255,255,0.95)';
      ctx.lineWidth = 1.6 * Math.max(this.scale, 0.7);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  },

  drawShockwaves(ctx) {
    if (!this.shockwaves.length) return;
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.shockwaves) {
      const k = 1 - s.r / s.maxR;
      ctx.strokeStyle = `rgba(${s.color},${0.85 * k})`;
      ctx.lineWidth = 3 + 7 * k;
      ctx.beginPath(); ctx.arc(0, 0, s.r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(${s.color},${0.35 * k})`;
      ctx.lineWidth = 14 * k + 2;
      ctx.beginPath(); ctx.arc(0, 0, s.r * 0.93, 0, TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  },

  drawIndicators(ctx) {
    const hw = this.w / 2, hh = this.h / 2, pad = 18;
    for (const m of this.meteors) {
      if (Math.abs(m.x) < hw + m.r * 0.3 && Math.abs(m.y) < hh + m.r * 0.3) continue;
      const a = Math.atan2(m.y, m.x), ca = Math.cos(a), sa = Math.sin(a);
      const k = Math.min((hw - pad) / Math.max(Math.abs(ca), 1e-4), (hh - pad) / Math.max(Math.abs(sa), 1e-4));
      const over = Math.hypot(m.x, m.y) - k;
      const alpha = clamp(1 - over / 500, 0.25, 0.95);
      const size = m.type === 'boss' ? 22 : m.size === 2 ? 13 : 10;
      ctx.save();
      ctx.translate(ca * k, sa * k);
      ctx.rotate(a);
      ctx.globalAlpha = alpha * (0.7 + 0.3 * Math.sin(this.time * 8));
      ctx.fillStyle = m.T.color;
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(-size * 0.7, size * 0.8);
      ctx.lineTo(-size * 0.3, 0);
      ctx.lineTo(-size * 0.7, -size * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  drawReticle(ctx) {
    const { x, y } = this.mouse, t = this.time;
    const mr = this.R + 20 * this.scale;
    ctx.strokeStyle = 'rgba(94,242,255,0.13)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    ctx.moveTo(Math.cos(this.turretAngle) * mr, Math.sin(this.turretAngle) * mr);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(x, y);
    const firing = this.mouse.down || this.autoFire;
    const r = 11 + (firing ? Math.sin(t * 40) * 1.2 : 0);
    ctx.strokeStyle = firing ? 'rgba(255,230,140,0.95)' : 'rgba(120,240,255,0.95)';
    ctx.lineWidth = 1.6;
    ctx.rotate(t * 1.5);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, r, i * Math.PI / 2 + 0.3, i * Math.PI / 2 + Math.PI / 2 - 0.3);
      ctx.stroke();
    }
    ctx.rotate(-t * 1.5);
    ctx.beginPath();
    ctx.moveTo(-r - 6, 0); ctx.lineTo(-r + 3, 0);
    ctx.moveTo(r + 6, 0); ctx.lineTo(r - 3, 0);
    ctx.moveTo(0, -r - 6); ctx.lineTo(0, -r + 3);
    ctx.moveTo(0, r + 6); ctx.lineTo(0, r - 3);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, TAU); ctx.fill();
    ctx.restore();
  },

  drawOverlay(ctx) {
    const w = this.w, h = this.h;
    ctx.globalAlpha = 0.7;
    ctx.drawImage(this.vig.dark, 0, 0, w, h);
    const lowHp = !this.demo && this.state === 'playing' && this.hp < 30;
    let red = this.dmgFlash * 0.8;
    if (lowHp) red = Math.max(red, (0.25 + 0.2 * Math.sin(this.time * 6)) * (1 - this.hp / 30) + 0.1);
    if (this.state === 'dying') red = Math.max(red, 0.5);
    if (red > 0.01) { ctx.globalAlpha = Math.min(1, red); ctx.drawImage(this.vig.red, 0, 0, w, h); }
    if (this.effects.slow > 0) { ctx.globalAlpha = 0.55 * Math.min(1, this.effects.slow); ctx.drawImage(this.vig.blue, 0, 0, w, h); }
    if (this.flash > 0.01) {
      ctx.globalAlpha = Math.min(1, this.flash) * (this.shakeOn ? 0.6 : 0.15);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;
  },
};
