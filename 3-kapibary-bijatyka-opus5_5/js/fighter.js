'use strict';
/* Wojownik: odczyt sterowania, stany, wykonywanie ciosów, łańcuchy combo, fizyka i rysowanie. */

const GRAV = 0.8;
const SUPER_COST = 200, BREAK_COST = 100, METER_MAX = 300;
const JUGGLE_MAX = 10;
const MIRROR = { 1: 3, 2: 2, 3: 1, 4: 6, 5: 5, 6: 4, 7: 9, 8: 8, 9: 7 };
const NO_INPUT = { l: false, r: false, u: false, d: false, press: [], hold: {} };

// Błysk trafienia: rozjaśnione kolory liczone raz (ctx.filter kosztował osobną warstwę na cały canvas)
const FLASH_LOOK = new WeakMap();
function flashLook(L) {
  let b = FLASH_LOOK.get(L);
  if (b) return b;
  b = Object.assign({}, L);
  for (const k of ['fur', 'furDark', 'furBack', 'belly', 'paw', 'nose', 'upperArm', 'forearm', 'thigh', 'shin', 'wrist']) {
    if (typeof L[k] === 'string' && L[k][0] === '#') b[k] = shade(L[k], 0.55);
  }
  FLASH_LOOK.set(L, b);
  return b;
}

// Sekwencja rzutu po udanym chwycie
const THROW_SEQ = defMove({
  id: 'throwSeq', name: 'Bagienny rzut', type: 'throw', str: 9, total: 46, cancel: false,
  poses: K(STANCE, [[0, POSES.grab], [10, POSES.lift], [20, POSES.lift], [26, POSES.toss], [46]]),
  tick(me, opp, g, f) {
    const v = me.mv.victim; if (!v || v.state !== 'held') return;
    const back = me.mv.back ? -1 : 1;
    if (f <= 24) {
      const k = easeInOut(clamp(f / 22, 0, 1));
      const dx = back > 0 ? lerp(78, 40, k) : lerp(78, -60, k);
      const dy = Math.sin(k * Math.PI * (back > 0 ? 0.5 : 1)) * 110 + k * (back > 0 ? 20 : 10);
      g.place(v, me, dx, dy, mkPose({ rot: -k * (back > 0 ? 120 : 200) }, POSES.airHit));
      if (f === 8) g.sfx('grab');
    }
    if (f === 24) g.releaseHeld(v, me, { dmg: THROW.grab.dmg, launch: [6.5 * back, 7], lvl: 'H' });
  },
});

class Fighter {
  // variant: { tint, k, name?, hpMul? } – inny kolor futra (Złoty boss turnieju, walka lustrzana)
  constructor(g, idx, ch, ctrl, variant) {
    this.g = g; this.idx = idx; this.ch = ch; this.ctrl = ctrl;
    this.look = variant ? altLook(ch.look, variant.tint, variant.k) : ch.look;
    this.name = (variant && variant.name) || ch.name;
    this.maxHp = Math.round(ch.hp * ((variant && variant.hpMul) || 1));
    this.meter = 0; this.wins = 0;
    this.normals = Object.assign({}, NORMALS, ch.normals || {});
    this.specials = ch.specials.map(s => {
      const o = Object.assign({}, s);
      o.mk = { L: s.make('L'), H: s.make('H') };
      if (s.makeAir) o.mkAir = { L: s.makeAir('L'), H: s.makeAir('H') };
      return o;
    });
    // ↓↘→ sprawdzane przed →↓↘: rzut kulą w marszu (→ jeszcze w historii) nie może wyjść jako podbródkowy
    this.specials.sort((a, b) => (a.motion === 'qcf' ? 0 : 1) - (b.motion === 'qcf' ? 0 : 1));
    this.superMove = ch.superMove();
    this.stats = { maxCombo: 0, dmg: 0, specials: 0, supers: 0, blocked: 0, throws: 0 };
    this.reset(0, 1);
  }

  reset(x, facing) {
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0; this.facing = facing;
    this.hp = this.maxHp; this.redHp = this.maxHp; this.redDelay = 0;
    this.state = 'intro'; this.sf = 0;
    this.move = null; this.mf = 0; this.mv = {};
    this.stun = 0; this.crouching = false; this.guarding = false;
    this.airborne = false; this.airActs = 0; this.jumpDir = 0;
    this.hist = [{ d: 5, t: this.g.frame }]; this.btnBuf = [];
    this.inp = { h: 0, v: 0, fwd: 0, d: 5, hold: {}, press: [] };
    this.comboHits = 0; this.comboDmg = 0; this.juggle = 0; this.gbPending = false; this.gbUsed = false;
    this.chainCount = 0; this.chainUsed = new Set();
    this.contact = false; this.contactHit = false; this.hitUsed = [];
    this.invul = 0; this.flash = 0; this.hidden = false; this.passThrough = false;
    this.koPending = false; this.ko = false;
    this.heldBy = null; this.heldPose = null; this.techWindow = 0;
    this.forcePose = null; this.extraScale = null;
    this.hurtPose = POSES.hurtHigh;
    this.pose = clonePose(this.ch.introPose || STANCE);
    this.tmpPose = clonePose(STANCE);
    this.t = 0; this.blink = 0; this.nextBlink = randInt(90, 240);
    this.walkPh = 0; this.trail = []; this.shakeT = 0;
    this.dashReq = null; this.lastAttacker = null;
    this.lowSaid = false;
  }

  get opp() { return this.g.fighters[1 - this.idx]; }

  setState(s) { this.state = s; this.sf = 0; }

  setFacing(f) {
    if (f === this.facing) return;
    this.facing = f;
    for (const h of this.hist) h.d = MIRROR[h.d];
    this.inp.fwd = this.inp.h * f;
    this.inp.d = MIRROR[this.inp.d];
  }

  autoFace() {
    const dx = this.opp.x - this.x;
    if (Math.abs(dx) > 3) this.setFacing(dx > 0 ? 1 : -1);
  }

  // ---------------- wejście ----------------
  readInput(locked) {
    const raw = locked ? NO_INPUT : this.ctrl.poll(this, this.opp, this.g);
    const h = (raw.r ? 1 : 0) - (raw.l ? 1 : 0);
    const v = raw.u && !raw.d ? 1 : raw.d && !raw.u ? -1 : 0;
    const fwd = h * this.facing;
    const d = 5 + fwd + 3 * v;
    this.inp = { h, v, fwd, d, hold: raw.hold, press: raw.press };
    const now = this.g.frame;
    const last = this.hist[this.hist.length - 1];
    if (last.d !== d) {
      this.hist.push({ d, t: now });
      if (this.hist.length > 40) this.hist.shift();
      const n = this.hist.length;
      if ((d === 6 || d === 4) && n >= 3) {
        const a = this.hist[n - 3], b = this.hist[n - 2];
        if (a.d === d && b.d === 5 && now - b.t <= 10 && b.t - a.t <= 14) this.dashReq = { dir: d === 6 ? 1 : -1, t: now };
      }
    }
    // rt – prawdziwy krok (biegnie też w zamrożeniu po trafieniu), do sprawdzania przycisków wciśniętych naraz
    for (const b of raw.press) this.btnBuf.push({ b, t: now, rt: this.g.ticks });
    while (this.btnBuf.length && now - this.btnBuf[0].t > 6) this.btnBuf.shift();
  }

  has(b) { return this.btnBuf.some(e => e.b === b); }

  // dwa przyciski naraz: oba w buforze i wciśnięte najwyżej 4 prawdziwe kroki od siebie
  pair(a, b) {
    const ea = this.btnBuf.filter(e => e.b === a), eb = this.btnBuf.filter(e => e.b === b);
    return ea.some(x => eb.some(y => Math.abs(x.rt - y.rt) <= 4));
  }

  // przycisk b wciśnięty najwyżej 4 prawdziwe kroki od przycisku, którym zaczął się bieżący cios
  near(b) { return this.btnBuf.some(e => e.b === b && Math.abs(e.rt - this.btnRT) <= 4); }

  // ---------------- akcje ----------------
  // poziom: 0 – neutralnie na ziemi, 'air' – w powietrzu, 1 – anulowanie ciosu naziemnego,
  // 1.5 – anulowanie ciosu w powietrzu, 2 – anulowanie ciosu specjalnego (tylko super)
  tryActions(level) {
    if (!this.btnBuf.length) return false;
    const g = this.g, now = g.frame, air = this.airborne;
    const has = b => this.has(b);

    if (g.finishWindow && g.finishWindow.active && g.finishWindow.winner === this && !air && level === 0) {
      for (const fin of this.ch.finishers.concat(FRIENDSHIP)) {
        if (has(fin.btn) && matchMotion(this.hist, fin.motion, now) &&
          (!fin.range || Math.abs(this.x - this.opp.x) <= fin.range)) {
          this.btnBuf.length = 0;
          g.startFinisher(this, fin);
          return true;
        }
      }
    }

    if (!air && level !== 1.5 && this.meter >= SUPER_COST) {
      if (this.pair('HP', 'HK') || ((has('LP') || has('HP')) && matchMotion(this.hist, 'qcf2', now))) {
        this.doSuper();
        return true;
      }
    }
    if (level === 2) return false;

    // przycisk specjalny: ruch wybrany kierunkiem, zawsze w mocnej wersji
    if (has('SP') && this.ch.easy) {
      const e = this.ch.easy, inp = this.inp;
      const id = air ? (inp.v < 0 ? e.airD : e.airN)
        : inp.v < 0 ? e.d : inp.fwd > 0 ? e.f : inp.fwd < 0 ? e.b : e.n;
      const s = id && this.specials.find(x => x.id === id);
      if (s && (air ? s.air : s.air !== 'only') && (!s.can || s.can(this))) {
        this.startMove(air && s.mkAir ? s.mkAir.H : s.mk.H);
        this.stats.specials++;
        return true;
      }
    }

    for (const s of this.specials) {
      if (s.air === 'only' && !air) continue;
      if (!s.air && air) continue;
      if (level === 1.5 && !s.air) continue;
      const btns = s.btn === 'P' ? ['HP', 'LP'] : s.btn === 'K' ? ['HK', 'LK'] : [s.btn];
      const b = btns.find(has);
      if (!b) continue;
      if (s.motion === 'down' ? this.inp.v >= 0 : !matchMotion(this.hist, s.motion, now)) continue;
      if (s.can && !s.can(this)) continue;
      const str = b[0] === 'H' ? 'H' : 'L';
      this.startMove(air && s.mkAir ? s.mkAir[str] : s.mk[str]);
      this.stats.specials++;
      return true;
    }

    if (!air && level === 0 && this.pair('LP', 'LK')) {
      this.throwBack = this.inp.fwd < 0;
      this.startMove(THROW);
      return true;
    }

    const b = this.btnBuf[this.btnBuf.length - 1].b;
    let id;
    if (air) id = 'j.' + b;
    else if (this.inp.v < 0) id = 'c.' + b;
    else if (b === 'HP' && this.inp.fwd > 0) id = 'f.HP';
    else if (b === 'HK' && this.inp.fwd < 0) id = 'b.HK';
    else id = 's.' + b;
    const m = this.normals[id];
    if (!m) return false;
    if (level === 1 || level === 1.5) { if (!this.canChain(m)) return false; }
    else if (level === 'air' && this.airActs <= 0) return false;
    this.startMove(m);
    return true;
  }

  canChain(m) {
    const cur = this.move;
    if (!cur || m.type !== 'normal' || !!m.air !== !!cur.air) return false;
    if (m.str > cur.str) return !this.chainUsed.has(m);
    if (m.btn === cur.btn && m.str <= 2) return this.chainCount < 2;
    return false;
  }

  startMove(m) {
    const prev = this.state === 'move' ? this.move : null;
    const chain = prev && prev.type === 'normal' && m.type === 'normal';
    this.chainCount = chain ? this.chainCount + 1 : 0;
    if (!chain) this.chainUsed = new Set();
    this.chainUsed.add(m);
    // chwila wciśnięcia przycisku tego ciosu: rzut i skrót super liczą się od niej, a nie od startu ciosu z bufora
    const pressed = this.btnBuf.filter(e => e.b === m.btn).pop();
    this.btnRT = pressed ? pressed.rt : this.g.ticks;
    this.contactF = 0;
    this.move = m; this.mf = -1; this.mv = {};
    this.moveSerial = (this.moveSerial || 0) + 1;
    this.setState('move');
    this.contact = false; this.contactHit = false;
    this.hitUsed = m.hits.map(() => false);
    this.crouching = !!m.crouch;
    this.passThrough = false;
    if (!m.air && !this.airborne) this.vx = 0;
    if (m.air && m.type === 'normal') this.airActs--;
    this.btnBuf.length = 0;
    this.trail.length = 0;
    if (m.type === 'super') CapyVoice.say(this, 'super');
    else if (m.type === 'special' && !CapyVoice.say(this, 'atk', 0.45)) Sfx.squeak(this.look.voice * rand(0.95, 1.1), 0.12, 0.12);
    if (m.onStart) m.onStart(this, this.opp, this.g);
  }

  doSuper() {
    this.meter -= SUPER_COST;
    this.stats.supers++;
    this.startMove(this.superMove);
    this.g.superFlash(this);
  }

  doBreaker() {
    this.meter -= BREAK_COST;
    this.airborne = this.y > 0;
    this.comboHits = 0; this.juggle = 0;
    this.startMove(BREAKER);
    this.g.breakerFx(this);
  }

  doJump(superJ) {
    this.move = null;
    this.setState('air');
    this.airborne = true;
    this.airActs = 1;
    this.vy = this.ch.jumpV * (superJ ? 1.12 : 1);
    this.vx = this.jumpDir * this.ch.jumpX * this.facing * (superJ ? 0.75 : 1);
    this.superJ = !!superJ;
    this.g.sfx('jump');
    this.g.fx.dust(this.x, 0, 5, 0);
  }

  superJump() {
    this.jumpDir = this.inp.fwd > 0 ? 1 : this.inp.fwd < 0 ? -1 : 0;
    this.doJump(true);
  }

  endMove() {
    const m = this.move;
    this.move = null;
    this.chainCount = 0;
    this.passThrough = false;
    this.hidden = false;
    if (this.airborne) { this.setState('air'); if (m && m.type !== 'normal') this.airActs = 0; }
    else this.toNeutral();
  }

  toNeutral() {
    this.setState('neutral');
    this.move = null;
    this.comboHits = 0; this.comboDmg = 0; this.juggle = 0; this.gbUsed = false; this.gbPending = false;
    this.passThrough = false; this.hidden = false;
  }

  isInvul() {
    if (this.invul > 0) return true;
    const s = this.state;
    if (s === 'knockdown' || s === 'getup' || s === 'ko' || s === 'win' || s === 'intro' || s === 'cine' || s === 'held') return true;
    if (s === 'airhit' && this.juggle >= JUGGLE_MAX) return true;
    if (s === 'move' && this.move.invul && this.mf >= this.move.invul[0] && this.mf <= this.move.invul[1]) return true;
    if (s === 'dash' && this.dashDir < 0 && this.sf < 8) return true;
    return false;
  }

  canBlockFrom(srcX) {
    const s = this.state;
    if (this.airborne) return false;
    if (!(s === 'neutral' || s === 'block' || s === 'land' || s === 'dash' && this.sf > 6)) return false;
    let away = sign(this.x - srcX);
    if (away === 0) away = -this.facing;
    return this.inp.h === away;
  }

  // ---------------- aktualizacja ----------------
  update() {
    const g = this.g;
    this.t++;
    if (this.invul > 0) this.invul--;
    if (this.flash > 0) this.flash--;
    if (--this.nextBlink <= 0) { this.blink = 7; this.nextBlink = randInt(120, 300); }
    if (this.blink > 0) this.blink--;
    this.sf++;
    if (this.redDelay > 0) this.redDelay--;
    else if (this.redHp > this.hp) this.redHp = Math.max(this.hp, this.redHp - 6);

    switch (this.state) {
      case 'neutral': this.updateNeutral(); break;
      case 'prejump': if (this.sf >= 4) this.doJump(false); break;
      case 'air': this.tryActions('air'); break;
      case 'land':
        if (--this.stun <= 0) { this.toNeutral(); this.updateNeutral(); }
        break;
      case 'dash': {
        const dur = this.dashDir > 0 ? 17 : 20;
        const k = 1 - this.sf / dur;
        this.vx = this.dashDir * this.facing * (this.dashDir > 0 ? 10.5 : 9) * Math.max(0, k);
        if (this.sf % 4 === 0) g.fx.dust(this.x - this.dashDir * this.facing * 20, 0, 1, -this.dashDir * this.facing);
        if (this.sf >= dur) this.toNeutral();
        break;
      }
      case 'move': this.updateMove(); break;
      case 'hit':
        this.vx *= 0.88;
        if (this.tryBreaker()) break;
        if (--this.stun <= 0) this.toNeutral();
        break;
      case 'block':
        this.vx *= 0.88;
        this.crouching = this.inp.v < 0;
        if (--this.stun <= 0) this.toNeutral();
        break;
      case 'airhit':
        this.tryBreaker();
        break;
      case 'knockdown':
        this.vx *= 0.8;
        if (this.koPending) {
          if (g.finishWindow && g.finishWindow.loser === this) {
            if (this.sf >= 40) this.setState('getup');
          } else if (this.sf >= 2) { this.setState('ko'); this.ko = true; }
        } else if (this.sf >= 34) this.setState('getup');
        break;
      case 'getup':
        if (this.sf >= 22) {
          if (this.koPending && g.finishWindow) { this.setState('dizzy'); }
          else { this.toNeutral(); this.invul = 3; }
        }
        break;
      case 'held':
        if (this.techWindow > 0) {
          this.techWindow--;
          if (this.pair('LP', 'LK') && this.heldBy) g.techThrow(this.heldBy, this);
        }
        break;
      case 'dizzy': this.vx *= 0.8; break;
    }
    this.physics();
  }

  tryBreaker() {
    if (this.meter >= BREAK_COST && this.pair('HP', 'HK') && this.comboHits >= 2 && !this.koPending) {
      this.doBreaker();
      return true;
    }
    return false;
  }

  updateNeutral() {
    this.autoFace();
    this.guarding = false;
    if (this.tryActions(0)) return;
    const inp = this.inp;
    if (inp.v > 0) { this.jumpDir = inp.fwd; this.setState('prejump'); this.vx = 0; return; }
    this.crouching = inp.v < 0;
    if (this.crouching) {
      this.vx = 0;
      this.guarding = inp.fwd < 0 && this.threatened();
      return;
    }
    const finishing = this.g.finishWindow && this.g.finishWindow.active;   // ←← w Kapiprzyjaźni to nie odskok
    if (this.dashReq && this.g.frame - this.dashReq.t <= 3 && !finishing) {
      this.dashDir = this.dashReq.dir * (this.dashReq.dir === inp.fwd ? 1 : 1);
      this.dashReq = null;
      this.setState('dash');
      this.g.sfx('dash');
      if (this.dashDir < 0) { this.airborne = true; this.vy = 4; }
      return;
    }
    let wv = 0;
    if (inp.fwd > 0) wv = this.ch.walkF;
    else if (inp.fwd < 0) wv = -this.ch.walkB;
    if (inp.fwd < 0 && this.threatened()) { this.guarding = true; wv = 0; }
    this.vx = wv * this.facing;
    this.walkPh += wv * 0.09;
  }

  threatened() {
    const o = this.opp, dx = Math.abs(o.x - this.x);
    if (o.state === 'move' && o.move.hits.length && dx < 340 && o.mf <= o.move.lastActive) return true;
    return this.g.projectiles.some(p => p.owner === o && Math.abs(p.x - this.x) < 300);
  }

  updateMove() {
    const m = this.move, g = this.g, opp = this.opp;
    this.mf++;
    const f = this.mf;
    if (f <= 3 && m.type === 'normal' && !m.air && !this.airborne) {
      if ((m.btn === 'LP' && this.near('LK')) || (m.btn === 'LK' && this.near('LP'))) {
        this.throwBack = this.inp.fwd < 0;
        this.startMove(THROW);
        this.mf = 0;
        return;
      }
      if (((m.btn === 'HP' && this.near('HK')) || (m.btn === 'HK' && this.near('HP'))) && this.meter >= SUPER_COST) {
        this.doSuper();
        return;
      }
    }
    if (this.contact && !this.mv.noCancel) {
      if (m.type === 'normal' && m.cancel) {
        if (this.tryActions(m.air ? 1.5 : 1)) return;
        // ↑ wciśnięte w czasie zamrożenia po trafieniu też się liczy (historia kierunków od chwili kontaktu)
        const up = this.inp.v > 0 || this.hist.some(h => h.d >= 7 && h.t >= this.contactF);
        if (m.jc && this.contactHit && up && !this.airborne) { this.superJump(); return; }
      } else if (m.type === 'special' && m.superCancel !== false) {
        if (this.tryActions(2)) return;
      }
    }
    const total = this.mv.total || m.total;
    if (f >= total && !(m.type !== 'normal' && this.airborne && !m.endInAir)) { this.endMove(); return; }
    for (const v of m.vel) if (v[0] === f) {
      this.vx = v[1] * this.facing;
      if (v[2] !== undefined) { this.vy = v[2]; if (v[2] > 0) this.airborne = true; }
    }
    for (const s of m.sfx) if (s[0] === f) g.sfx(s[1]);
    if (m.proj) for (const pr of m.proj) if (pr.f === f) g.spawnProj(this, pr);
    if (m.tick) m.tick(this, opp, g, f);
    if (m.trail && f % 2 === 0) {
      this.trail.push({ x: this.x, y: this.y, facing: this.facing, pose: clonePose(this.pose), life: 12 });
    }
  }

  // ---------------- fizyka ----------------
  physics() {
    const s = this.state;
    if (s === 'held' || s === 'cine') return;
    const m = s === 'move' ? this.move : null;
    if (this.airborne) {
      let gr = GRAV;
      if (s === 'airhit') gr *= 1 + this.juggle * 0.05;
      if (m && m.grav !== undefined) gr *= typeof m.grav === 'function' ? m.grav(this, this.mf) : m.grav;
      this.vy -= gr;
      this.x += this.vx;
      this.y += this.vy;
      if (this.y <= 0) { this.y = 0; this.land(); }
    } else {
      this.x += this.vx;
      if (s === 'move') this.vx *= m.fric !== undefined ? m.fric : 0.82;
    }
  }

  land() {
    const g = this.g;
    this.y = 0; this.vy = 0; this.airborne = false;
    switch (this.state) {
      case 'air': case 'dash':
        if (this.state === 'dash') break;
        this.setState('land'); this.stun = 3; this.vx = 0;
        g.fx.dust(this.x, 0, 4, 0); g.sfx('land');
        break;
      case 'move': {
        const m = this.move;
        if (m.onLand) {
          m.onLand(this, this.opp, g);
          if (this.state !== 'move' || this.move !== m) break;
        }
        this.move = null; this.passThrough = false; this.hidden = false;
        this.setState('land');
        this.stun = m.landLag !== undefined ? m.landLag : (m.air ? 4 : 8);
        this.vx = 0;
        g.fx.dust(this.x, 0, 4, 0); g.sfx('land');
        break;
      }
      case 'airhit':
        if (this.gbPending) {
          this.gbPending = false;
          this.vy = 9; this.vx *= 0.5; this.airborne = true;
          g.fx.dust(this.x, 0, 14, 0); g.shake(7); g.sfx('fall');
          g.fx.shock(this.x, 0, '#e8d3a8');
          break;
        }
        this.setState('knockdown'); this.vx *= 0.3;
        g.fx.dust(this.x, 0, 12, 0); g.shake(4); g.sfx('fall');
        break;
    }
  }

  // ---------------- skrzynki ----------------
  hurtboxes() {
    if (this.isInvul() || this.hidden) return [];
    const sc = this.look.scale, w = 38 * this.look.girth * sc, x = this.x, f = this.facing;
    const m = this.state === 'move' ? this.move : null;
    let h = 190 * sc;
    const low = this.crouching || (m && m.crouch) || (this.state === 'block' && this.crouching);
    if (low) h = 140 * sc;
    if (m && m.hurt) h = m.hurt * sc;
    if (this.state === 'airhit') return [[x - 60 * sc, this.y - 10, x + 60 * sc, this.y + 150 * sc]];
    const y0 = this.y + (this.airborne ? 12 : 0);
    const boxes = [[x - w, y0, x + w, y0 + h]];
    if (!low && !(m && m.hurt)) {
      const hx0 = x + f * 20 * sc, hx1 = x + f * 88 * sc;
      boxes.push([Math.min(hx0, hx1), y0 + 128 * sc, Math.max(hx0, hx1), y0 + 196 * sc]);
    }
    return boxes;
  }

  worldBox(b) {
    const sc = this.look.scale;
    const cx = this.x + this.facing * b[0] * sc, cy = this.y + b[1] * sc;
    const hw = b[2] * sc / 2, hh = b[3] * sc / 2;
    return [cx - hw, cy - hh, cx + hw, cy + hh];
  }

  activeHits() {
    if (this.state !== 'move') return null;
    const m = this.move, out = [];
    for (let i = 0; i < m.hits.length; i++) {
      const h = m.hits[i];
      if (this.hitUsed[i] || this.mf < h.f[0] || this.mf > h.f[1]) continue;
      if (h.cond && !h.cond(this, this.mf)) continue;
      out.push(i);
    }
    return out;
  }

  pushWidth() { return (this.state === 'knockdown' || this.state === 'ko' ? 30 : 42) * this.look.girth * this.look.scale; }

  // ---------------- pozy ----------------
  targetPose() {
    if (this.forcePose) return this.forcePose;
    const t = this.t, P = POSES, tp = this.tmpPose;
    switch (this.state) {
      case 'neutral': {
        if (this.crouching) {
          const b = this.guarding ? P.blockCr : P.crouch;
          lerpPose(b, b, 0, tp);
          tp.hy += Math.sin(t * 0.08) * 1.2;
          return tp;
        }
        if (this.guarding) return P.block;
        const base = this.ch.stance || STANCE;
        lerpPose(base, base, 0, tp);
        if (Math.abs(this.vx) > 0.1) {
          const ph = this.walkPh;
          tp.lF[0] += Math.sin(ph) * 16; tp.lF[1] = -Math.max(0, Math.cos(ph)) * 13;
          tp.lB[0] -= Math.sin(ph) * 16; tp.lB[1] = -Math.max(0, -Math.cos(ph)) * 13;
          tp.hy -= Math.abs(Math.sin(ph)) * 3;
          tp.torso += 4 * sign(this.vx * this.facing);
          tp.aF[1] += Math.sin(ph) * 4; tp.aB[1] -= Math.sin(ph) * 4;
        } else {
          const b = Math.sin(t * 0.075);
          tp.hy += b * 1.6; tp.torso += b * 1.2;
          tp.aF[1] += b * 2; tp.aB[1] += Math.sin(t * 0.075 + 1) * 2;
        }
        return tp;
      }
      case 'prejump': return P.preJump;
      case 'air': {
        const jv = this.ch.jumpV * (this.superJ ? 1.12 : 1);
        if (this.jumpDir !== 0) {
          const k = clamp((jv - this.vy) / (2 * jv), 0, 1);
          const r = easeInOut(clamp((k - 0.12) / 0.7, 0, 1));
          const tuckK = Math.sin(r * Math.PI);
          lerpPose(this.vy > 0 ? P.jumpUp : P.jumpFall, P.tuck, tuckK, tp);
          tp.rot = r * 360 * this.jumpDir;
          return tp;
        }
        return this.vy > 2 ? P.jumpUp : P.jumpFall;
      }
      case 'move':
        if (this.move.poseFn) return this.move.poseFn(this, this.mf, tp);
        return keyPose(this.move.poses, Math.max(0, this.mf), tp);
      case 'land': return P.land;
      case 'dash': return this.dashDir > 0 ? P.dashF : P.dashB;
      case 'hit': {
        if (this.stun < 5) { lerpPose(this.hurtPose, this.crouching ? P.crouch : STANCE, 1 - this.stun / 5, tp); return tp; }
        return this.hurtPose;
      }
      case 'block': return this.crouching ? P.blockCr : P.block;
      case 'airhit': {
        lerpPose(P.airHit, P.airHit, 0, tp);
        tp.rot = clamp(-30 - (12 - this.vy) * 4, -95, -10);
        return tp;
      }
      case 'knockdown': case 'ko': return P.lying;
      case 'getup': {
        const k = this.sf / 22;
        if (k < 0.5) lerpPose(P.lying, P.crouch, easeInOut(k * 2), tp);
        else lerpPose(P.crouch, STANCE, easeInOut(k * 2 - 1), tp);
        return tp;
      }
      case 'held': return this.heldPose || P.airHit;
      case 'dizzy': {
        lerpPose(P.dizzy, P.dizzy, 0, tp);
        tp.torso += Math.sin(t * 0.07) * 10; tp.hx += Math.sin(t * 0.07) * 6; tp.head += Math.sin(t * 0.11) * 12;
        return tp;
      }
      case 'win': return this.ch.winPoseFn ? this.ch.winPoseFn(this.sf, tp) : P.win;
      case 'intro': return this.ch.introPoseFn ? this.ch.introPoseFn(this.sf, tp) : STANCE;
    }
    return STANCE;
  }

  updatePose() {
    const target = this.targetPose();
    const s = this.state;
    const k = this.snap ? 1 : s === 'move' ? 0.6 : s === 'hit' || s === 'airhit' || s === 'held' ? 0.7 : s === 'air' ? 0.5 : 0.35;
    this.snap = false;
    lerpPose(this.pose, target, k, this.pose);
    if (s === 'air' || s === 'move' && this.move.poseFn) this.pose.rot = target.rot;
    for (let i = this.trail.length - 1; i >= 0; i--) if (--this.trail[i].life <= 0) this.trail.splice(i, 1);
  }

  draw(ctx) {
    const L = this.look;
    for (const tr of this.trail) {
      ctx.save();
      ctx.globalAlpha = tr.life / 12 * 0.35;
      ctx.translate(tr.x, -tr.y);
      ctx.scale(tr.facing, 1);
      drawCapy(ctx, L, tr.pose, { t: this.t });
      ctx.restore();
    }
    if (this.hidden) return;
    ctx.save();
    let sx = 0;
    if (this.shakeT > 0) sx = (this.shakeT % 2 ? 1 : -1) * 4;
    ctx.translate(this.x + sx, -this.y);
    ctx.scale(this.facing, 1);
    if (this.extraScale) ctx.scale(this.extraScale[0], this.extraScale[1]);
    if (this.state === 'airhit' && this.juggle >= JUGGLE_MAX && this.t % 4 < 2) ctx.globalAlpha = 0.55;
    drawCapy(ctx, this.flash > 0 ? flashLook(L) : L, this.pose, { t: this.t, blink: this.blink > 0, vx: this.vx * this.facing });
    if (this.move && this.move.drawExtra && this.state === 'move') this.move.drawExtra(ctx, this, this.mf);
    ctx.restore();
    if (this.state === 'dizzy') this.drawDizzy(ctx);
  }

  drawDizzy(ctx) {
    const cx = this.x + this.facing * 30, cy = -this.y - 215 * this.look.scale;
    for (let i = 0; i < 3; i++) {
      const a = this.t * 0.08 + i * TAU / 3;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * 36, cy + Math.sin(a) * 10);
      ctx.rotate(this.t * 0.1);
      drawStar(ctx, 0, 0, 9, '#ffe66d');
      ctx.restore();
    }
  }
}
