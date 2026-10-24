'use strict';
/* Walka: rundy, czas, kolizje i trafienia, pociski, kamera, wykończenia oraz HUD. */

const WALL_L = 40, WALL_R = STAGE_W - 40, MAX_SEP = 880;
const MOTION_K = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.25 : 1;

function overlap(a, b) { return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]; }

const PRAISE = [[14, 'KAPIBARALNIE!!!', '#ff5df0', 'pr_kapibaralnie'], [10, 'BAGIENNIE!', '#7ff6ff', 'pr_bagiennie'],
  [7, 'KAPITALNIE!', '#ffd23f', 'pr_kapitalnie'], [5, 'ŚWIETNIE!', '#9dff7a', 'pr_swietnie'], [3, 'NIEŹLE!', '#ffffff', 'pr_niezle']];
// luźne komentarze po mocnych ciosach (nagrania kom_react_*)
const REACTIONS = ['react_1', 'react_2', 'react_3', 'react_4', 'react_5', 'react_8'];
const ROUND_WORDS = ['pierwsza', 'druga', 'trzecia', 'czwarta', 'piąta', 'szósta', 'siódma', 'ósma', 'dziewiąta'];

class Projectile {
  constructor(owner, d, g) {
    const sc = owner.look.scale;
    this.owner = owner; this.d = d; this.kind = d.kind; this.dir = owner.facing;
    this.x = g.clampX(owner.x + owner.facing * d.x * sc);
    this.y = d.kind === 'geyser' ? d.y : owner.y + d.y * sc;
    this.vx = d.vx; this.vy = d.vy || 0; this.w = d.w; this.h = d.h;
    this.hit = d.hit; this.lastHit = d.lastHit; this.hits = d.hits || 1; this.interval = d.interval || 0;
    this.cool = 0; this.life = d.life || 260; this.t = 0; this.limit = d.limit; this.active = d.active;
    this.carry = d.carry; this.super = d.super; this.dead = false;
  }
  box() { return [this.x - this.w / 2, this.y - this.h / 2, this.x + this.w / 2, this.y + this.h / 2]; }
  isActive() { return !this.active || (this.t >= this.active[0] && this.t <= this.active[1]); }
  currentHit() { return this.hits === 1 && this.lastHit ? this.lastHit : this.hit; }
}

class Game {
  // opts: { chars, ctrls, stage, mode: 'versus'|'cpu'|'training'|'demo', winsNeeded, time, onEnd }
  constructor(opts) {
    this.opts = opts;
    this.mode = opts.mode;
    this.frame = 0;
    this.fx = new FX();
    this.projectiles = [];
    this.stageDef = opts.stage;
    this.stage = new Stage(opts.stage);
    this.fighters = [];
    const vr = opts.variants || [];
    this.fighters.push(new Fighter(this, 0, opts.chars[0], opts.ctrls[0], vr[0]));
    this.fighters.push(new Fighter(this, 1, opts.chars[1], opts.ctrls[1], vr[1]));
    this.cam = { x: STAGE_W / 2, zoom: 1.3, lift: 0, shake: 0 };
    this.winsNeeded = opts.winsNeeded || 2;
    this.roundTime = opts.time === undefined ? 99 : opts.time;
    this.round = 0;
    this.hitstop = 0; this.superFreeze = 0; this.slow = 0; this.slowAcc = 0;
    this.flash = null; this.ann = null; this.combo = [null, null];
    this.finishWindow = null; this.cine = null;
    this.showBoxes = Store.get('boxes', false);
    this.training = this.mode === 'training' ? { infMeter: true, lastCombo: null, dummyIdle: 0 } : null;
    this.phase = 'intro'; this.phaseT = 0;
    this.result = null; this.over = false;
    this.startRound();
  }

  // ---------------- rundy ----------------
  startRound() {
    this.round++;
    const [a, b] = this.fighters;
    a.reset(STAGE_W / 2 - 210, 1);
    b.reset(STAGE_W / 2 + 210, -1);
    this.projectiles.length = 0;
    this.fx.clear();
    this.cam.x = STAGE_W / 2; this.cam.lift = 0;
    this.timer = this.roundTime;
    this.timerF = 0;
    this.finishWindow = null; this.cine = null;
    this.roundWinner = null;
    this.phase = 'intro'; this.phaseT = 0;
    this.combo = [null, null];
    if (this.mode === 'training' || this.mode === 'demo') this.phaseT = 80;
    // legenda klawiszy w pierwszej rundzie: intro i pierwsze 6 s walki
    this.legendT = this.round === 1 && this.mode !== 'demo' ? 105 + 360 : 0;
  }

  setPhase(p) { this.phase = p; this.phaseT = 0; }

  isFinalRound() { return this.fighters.every(f => f.wins === this.winsNeeded - 1); }

  updatePhase() {
    const [a, b] = this.fighters;
    this.phaseT++;
    switch (this.phase) {
      case 'intro':
        if (this.phaseT === 20) {
          const fin = this.isFinalRound();
          this.announce(fin ? 'RUNDA FINAŁOWA' : `RUNDA ${this.round}`, null, '#ffffff', 70);
          Voice.line(fin ? 'rfinal' : 'r' + this.round, fin ? 'Runda finałowa!' : `Runda ${ROUND_WORDS[this.round - 1] || this.round}!`);
          this.sfx('gong');
        }
        if (this.phaseT === 92) {
          this.announce('WALCZ!', null, '#ffd23f', 45, 1.3);
          if (this.mode !== 'training') Voice.line('fight', 'Walcz!', { pitch: 0.7, rate: 1.1 });
        }
        if (this.phaseT >= 105) {
          this.fighters.forEach(f => { if (f.state === 'intro') f.toNeutral(); });
          this.setPhase('fight');
        }
        break;
      case 'fight':
        if (this.roundTime > 0 && this.mode !== 'training') {
          if (++this.timerF >= 60) {
            this.timerF = 0; this.timer--;
            if (this.timer <= 0) this.timeUp();
          }
        }
        break;
      case 'ko': {
        const loser = this.roundLoser;
        const winner = this.roundWinner;
        const settled = !loser || loser.state === 'ko' || loser.state === 'knockdown';
        if (settled && this.phaseT > 60 && winner && winner.state !== 'win' && (winner.state === 'neutral' || winner.state === 'land')) {
          winner.setState('win'); winner.move = null; winner.vx = 0;
          if (this.phaseT > 60 && !this.winSaid) this.sayWinner(winner);
        }
        if (settled && this.phaseT > 230) this.endRound();
        break;
      }
      case 'timeup':
        if (this.phaseT === 100) {
          const w = this.roundWinner;
          if (w) { w.setState('win'); w.move = null; this.sayWinner(w); }
          else { this.announce('REMIS', null, '#ffffff', 90); Voice.line('draw', 'Remis!'); }
        }
        if (this.phaseT > 220) this.endRound();
        break;
      case 'finishPending': {
        const l = this.finishWindow.loser, w = this.finishWindow.winner;
        if (l.state === 'dizzy' && this.phaseT > 30) {
          this.finishWindow.active = true; this.finishWindow.t = 0;
          if (w.state === 'win') w.toNeutral();
          const txt = l.ch.she ? 'DOKOŃCZ JĄ!' : 'DOKOŃCZ GO!';
          this.announce(txt, null, '#ff4d4d', 110, 1.1);
          Voice.line(l.ch.she ? 'finishHer' : 'finishHim', l.ch.she ? 'Dokończ ją!' : 'Dokończ go!', { pitch: 0.5, rate: 0.95 });
          this.setPhase('finish');
        }
        break;
      }
      case 'finish': {
        const fw = this.finishWindow;
        if (!fw) break;
        if (fw.t === 75) CapyVoice.say(fw.loser, 'dizzy');
        if (++fw.t > 420) {
          const l = fw.loser;
          this.finishWindow = null;
          l.setState('airhit'); l.airborne = true; l.vy = 3; l.vx = 0; l.y = 1;
          this.sfx('fall');
          this.setPhase('ko');
        }
        break;
      }
      case 'cine':
        this.updateCine();
        break;
      case 'cineEnd':
        if (this.phaseT === 140) this.sayWinner(this.roundWinner);
        if (this.phaseT > 290) this.endRound();
        break;
    }
  }

  sayWinner(w) {
    this.winSaid = true;
    const perfect = w.hp >= w.maxHp;
    this.announce(`${w.name.toUpperCase()} WYGRYWA!`, perfect ? 'PERFEKCYJNIE!' : null, w.ch.color, 150, 0.85);
    Voice.line('win_' + w.ch.id, perfect ? `${w.ch.name} wygrywa! Perfekcyjnie!` : `${w.ch.name} wygrywa!`, { then: perfect ? 'perfect' : null });
    if (this.mode !== 'demo') this.sfx('fanfare');
  }

  timeUp() {
    const [a, b] = this.fighters;
    this.announce('CZAS!', null, '#ffd23f', 80, 1.2);
    Voice.line('timeup', 'Koniec czasu!');
    this.roundWinner = a.hp > b.hp ? a : b.hp > a.hp ? b : null;
    this.roundLoser = this.roundWinner ? this.roundWinner.opp : null;
    if (this.roundWinner) this.roundWinner.wins++;
    this.fighters.forEach(f => { if (f.state === 'neutral' || f.state === 'block') f.vx = 0; });
    this.setPhase('timeup');
  }

  endRound() {
    this.winSaid = false;
    const w = this.fighters.find(f => f.wins >= this.winsNeeded);
    if (w) {
      this.over = true;
      this.setPhase('over');
      this.result = { winner: w, loser: w.opp, finisher: this.lastFinisher || null };
      if (this.opts.onEnd) this.opts.onEnd(this.result);
      return;
    }
    if (this.round >= 9) {
      const best = this.fighters[0].wins >= this.fighters[1].wins ? this.fighters[0] : this.fighters[1];
      best.wins = this.winsNeeded;
      return this.endRound();
    }
    this.startRound();
  }

  onKO(d, a) {
    if (this.mode === 'training') { d.hp = 1; return; }
    if (this.phase === 'finish') {
      this.finishWindow = null;
      d.koPending = true;
      this.slow = 60;
      this.setPhase('ko');
      return;
    }
    if (this.phase !== 'fight') return;
    d.koPending = true;
    const bothDown = a.hp <= 0;
    this.slow = 80;
    this.shake(14);
    this.sfx('ko');
    this.announce('K.O.', null, '#ff3b3b', 110, 1.6);
    Voice.line('ko', 'Nokaut!', { pitch: 0.5, rate: 0.9 });
    CapyVoice.say(d, 'ko');
    this.stage.hype(80);
    this.crowd('crowd', true);
    if (bothDown) {
      this.roundWinner = null; this.roundLoser = null;
      this.setPhase('ko');
      return;
    }
    a.wins++;
    this.roundWinner = a; this.roundLoser = d;
    const decisive = a.wins >= this.winsNeeded && this.opts.finishers !== false && this.mode !== 'demo';
    if (decisive) {
      this.finishWindow = { winner: a, loser: d, active: false, t: 0 };
      this.setPhase('finishPending');
    } else this.setPhase('ko');
  }

  startFinisher(w, fin) {
    const l = w.opp;
    this.finishWindow = null;
    this.cine = { fin, t: 0, w, l, d: {} };
    this.lastFinisher = fin;
    for (const f of [w, l]) {
      f.setState('cine'); f.move = null; f.vx = 0; f.vy = 0; f.airborne = false; f.y = 0; f.hidden = false;
      f.forcePose = clonePose(STANCE); f.trail.length = 0;
    }
    w.autoFace(); l.autoFace();
    this.projectiles.length = 0;
    this.flashScreen('#000000', 0.6);
    this.sfx('gong');
    this.setPhase('cine');
  }

  updateCine() {
    const c = this.cine;
    c.fin.run(this, c);
    c.t++;
    if (c.t >= c.fin.dur) {
      this.announce(c.fin.title, c.fin.name.toUpperCase(), c.fin.id === 'friend' ? '#ff8fd0' : '#ff3b3b', 150, 1.3);
      Voice.line(c.fin.id === 'friend' ? 'friendship' : 'fatality', c.fin.id === 'friend' ? 'Kapiprzyjaźń!' : 'Kapibality!', { pitch: 0.45, rate: 0.85 });
      this.sfx('ko');
      this.crowd('crowd', true);
      this.setPhase('cineEnd');
    }
  }

  // ---------------- główny krok ----------------
  inputLocked() {
    const p = this.phase;
    return p === 'intro' || p === 'over' || p === 'cine' || p === 'cineEnd' || p === 'timeup' ||
      (p === 'ko' && this.phaseT > 20);
  }

  step() {
    this.ticks = (this.ticks || 0) + 1;   // prawdziwe kroki, także w zamrożeniu (frame wtedy stoi)
    const locked = this.inputLocked();
    this.fighters.forEach(f => f.readInput(locked || f.state === 'win' || (this.phase === 'finishPending' || this.phase === 'finish') && f.koPending));
    this.stage.update(this);
    if (this.flash) { this.flash.a -= 0.04; if (this.flash.a <= 0) this.flash = null; }
    if (this.ann) this.ann.t++;
    if (this.cam.shake > 0) this.cam.shake *= 0.86;
    if (this.cam.shake < 0.3) this.cam.shake = 0;

    if (this.superFreeze > 0) {
      this.superFreeze--;
      this.superOwner.updatePose();
      this.fx.update();
      this.updateCamera();
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop--;
      this.fighters.forEach(f => { if (f.state === 'hit' || f.state === 'airhit' || f.state === 'block') f.shakeT = this.hitstop; });
      this.fx.update();
      return;
    }
    this.fighters.forEach(f => { f.shakeT = 0; });
    this.frame++;
    if (this.legendT > 0) this.legendT--;
    if (this.phase !== 'cine') this.fighters.forEach(f => f.update());
    else this.fighters.forEach(f => { f.t++; f.sf++; });
    this.updateProjectiles();
    if (this.phase !== 'cine') {
      this.pushApart();
      this.clampPositions();
      this.checkHits();
    }
    this.fighters.forEach(f => f.updatePose());
    this.updatePhase();
    this.updateCombos();
    if (this.training) this.updateTraining();
    this.fx.update();
    this.updateCamera();
  }

  // Zwolnione tempo po nokaucie: część klatek jest pomijana
  tick() {
    if (this.slow > 0) {
      this.slow--;
      this.slowAcc += 0.35;
      if (this.slowAcc < 1) { this.stage.update(this); return; }
      this.slowAcc -= 1;
    }
    this.step();
  }

  // ---------------- kolizje ----------------
  pushApart() {
    const [a, b] = this.fighters;
    if (a.passThrough || b.passThrough || a.state === 'held' || b.state === 'held' || a.hidden || b.hidden) return;
    if (!(a.y < b.y + 140 && b.y < a.y + 140)) return;
    const minD = a.pushWidth() + b.pushWidth();
    const dx = b.x - a.x;
    if (Math.abs(dx) >= minD) return;
    const dir = dx !== 0 ? sign(dx) : -a.facing || 1;
    const ov = minD - Math.abs(dx);
    let ka = 0.5, kb = 0.5;
    if (a.airborne && !b.airborne) { ka = 1; kb = 0; } else if (b.airborne && !a.airborne) { ka = 0; kb = 1; }
    a.x -= dir * ov * ka; b.x += dir * ov * kb;
    for (const [f, o] of [[a, b], [b, a]]) {
      if (f.x < WALL_L) { o.x += WALL_L - f.x; f.x = WALL_L; }
      if (f.x > WALL_R) { o.x -= f.x - WALL_R; f.x = WALL_R; }
    }
  }

  clampPositions() {
    const [a, b] = this.fighters;
    for (const f of this.fighters) {
      if (f.state === 'held') continue;
      f.x = clamp(f.x, WALL_L, WALL_R);
    }
    if (a.state === 'held' || b.state === 'held') return;
    const sep = b.x - a.x;
    if (Math.abs(sep) > MAX_SEP) {
      const ex = Math.abs(sep) - MAX_SEP;
      const dirA = -sign(sep), dirB = sign(sep);
      const movA = sign(a.vx) === dirA, movB = sign(b.vx) === dirB;
      if (movA && !movB) a.x -= dirA * ex;
      else if (movB && !movA) b.x -= dirB * ex;
      else { a.x -= dirA * ex / 2; b.x -= dirB * ex / 2; }
    }
  }

  clampX(x) { return clamp(x, WALL_L + 20, WALL_R - 20); }

  nearWall(f, dir) { return dir > 0 ? f.x >= WALL_R - 8 : f.x <= WALL_L + 8; }

  checkHits() {
    const pending = [];
    for (const a of this.fighters) {
      if (a.state !== 'move') continue;
      const d = a.opp, m = a.move;
      if (m.grab && a.mf >= m.grab.f[0] && a.mf <= m.grab.f[1] && !a.mv.grabbed) {
        if (this.canGrab(a, d, m.grab)) {
          a.mv.grabbed = true;
          if (m.onGrab) m.onGrab(a, d, this); else this.startThrow(a, d);
          continue;
        }
      }
      const act = a.activeHits();
      if (!act || !act.length) continue;
      const hb = d.hurtboxes();
      if (!hb.length) continue;
      for (const i of act) {
        const h = m.hits[i];
        if (h.groundOnly && d.airborne) continue;
        const box = a.worldBox(h.box);
        const hurt = hb.find(b => overlap(box, b));
        if (!hurt) continue;
        a.hitUsed[i] = true;
        pending.push([a, d, h, box, hurt]);
        break;
      }
    }
    for (const [a, d, h, box, hurt] of pending) this.resolveHit(a, d, h, box, null, hurt);
  }

  canGrab(a, d, gr) {
    if (d.airborne || d.isInvul() || d.hidden) return false;
    const okStates = ['neutral', 'move', 'land', 'dash', 'prejump', 'dizzy'];
    if (!okStates.includes(d.state)) return false;
    if (d.state === 'move' && d.move.type === 'throw') return false;
    const reach = gr.range * a.look.scale + (d.pushWidth() - 42);
    return Math.abs(d.x - a.x) <= reach;
  }

  startThrow(a, d) {
    const back = a.throwBack;
    a.startMove(THROW_SEQ);
    a.mv.victim = d; a.mv.back = back; a.mv.grabbed = true;
    this.hold(d, a);
    d.techWindow = 9;
    a.stats.throws++;
    this.sfx('grab');
    CapyVoice.say(a, 'throw', 0.8);
  }

  hold(v, holder, pose) {
    v.setState('held');
    v.heldBy = holder; v.move = null; v.vx = 0; v.vy = 0;
    v.heldPose = pose || POSES.airHit; v.snap = true;
    v.techWindow = 0; v.crouching = false; v.passThrough = false; v.hidden = false;
  }

  place(v, holder, dx, dy, pose) {
    v.x = holder.x + holder.facing * dx * holder.look.scale;
    v.y = dy;
    v.facing = -holder.facing;
    if (pose) v.heldPose = pose;
  }

  releaseHeld(v, holder, o) {
    if (v.state !== 'held') return;
    v.heldBy = null;
    const dmg = this.scaleDamage(v, o.dmg, o.lvl === 'S');
    this.applyDamage(holder, v, dmg);
    v.setState('airhit');
    v.airborne = true;
    v.y = Math.max(v.y, 1);
    v.vx = o.launch[0] * holder.facing; v.vy = o.launch[1];
    v.snap = true; v.flash = 4;
    this.fx.hitSpark(v.x, -v.y - 90, o.lvl, holder.facing);
    this.sfx(o.lvl === 'L' ? 'hitL' : o.lvl === 'M' ? 'hitM' : 'hitH');
    this.shake(o.lvl === 'S' ? 10 : 6);
    Sfx.squeak(v.look.voice * 1.3, 0.16, 0.14);
    if (v.hp <= 0) this.onKO(v, holder);
  }

  directDamage(a, d, dmg, lvl) {
    const v = this.scaleDamage(d, dmg, lvl === 'S');
    this.applyDamage(a, d, v);
    if (d.hp <= 0 && d.state === 'held') d.hp = 0;
    this.fx.hitSpark(d.x + rand(-30, 30), -d.y - rand(60, 150), lvl, a.facing);
    d.flash = 3;
  }

  techThrow(holder, victim) {
    for (const [f, o] of [[holder, victim], [victim, holder]]) {
      f.move = null; f.setState('block'); f.stun = 16; f.heldBy = null;
      f.vx = sign(f.x - o.x || -f.facing) * 8; f.y = 0; f.airborne = false;
    }
    this.fx.text((holder.x + victim.x) / 2, -230, 'WYRWANIE!', '#8fd8ff', 30);
    this.sfx('tech');
    CapyVoice.stop(holder);
    Voice.line('tech');
  }

  instantHit(me, h) {
    const d = me.opp, box = me.worldBox(h.box);
    const hurt = d.hurtboxes().find(b => overlap(box, b));
    if (hurt) this.resolveHit(me, d, h, box, null, hurt);
  }

  scaleDamage(d, dmg, isSuper) {
    const n = d.comboHits;
    const k = n < 2 ? 1 : Math.max(isSuper ? 0.5 : 0.3, 1 - 0.1 * (n - 1));
    return dmg * k;
  }

  applyDamage(a, d, dmg) {
    dmg = Math.max(1, Math.round(dmg));
    d.hp = Math.max(0, d.hp - dmg);
    d.redDelay = 40;
    d.comboHits++;
    d.comboDmg += dmg;
    a.stats.dmg += dmg;
    a.meter = Math.min(METER_MAX, a.meter + dmg * 0.5);
    d.meter = Math.min(METER_MAX, d.meter + dmg * 0.3);
    if (d.comboHits >= 2) {
      this.combo[a.idx] = { n: d.comboHits, dmg: d.comboDmg, t: 0, live: true };
      a.stats.maxCombo = Math.max(a.stats.maxCombo, d.comboHits);
    }
    if (this.training && a.idx === 0) this.training.lastCombo = { n: d.comboHits, dmg: d.comboDmg };
  }

  guardOk(guard, d) {
    if (guard === 'unblock') return false;
    const crouch = d.inp.v < 0;
    if (guard === 'low') return crouch;
    if (guard === 'high') return !crouch;
    return true;
  }

  resolveHit(a, d, h, box, proj, hurt) {
    const src = proj ? proj.x - proj.dir * 20 : a.x;
    let dir = sign(d.x - src) || (proj ? proj.dir : a.facing);
    const cx = clamp((box[0] + box[2]) / 2, hurt[0], hurt[2]);
    const cy = clamp((box[1] + box[3]) / 2, hurt[1], hurt[3]);
    const special = proj || a.move && (a.move.type === 'special' || a.move.type === 'super');

    // pancerz (jeden cios przyjęty bez zatrzymania)
    if (!proj && d.state === 'move' && d.move.armor && d.mf >= d.move.armor[0] && d.mf <= d.move.armor[1] && !d.mv.armorUsed) {
      d.mv.armorUsed = true;
      this.applyDamage(a, d, h.dmg * 0.5);
      d.comboHits = 0;
      d.flash = 8;
      this.hitstop = 8;
      this.sfx('armor');
      this.fx.hitSpark(cx, -cy, 'M', dir, ['#ffffff', '#ffd23f', '#ff8a2a']);
      a.contact = true;
      if (h.onContact) h.onContact(a, d, this, true);
      return;
    }

    if (this.guardOk(h.guard, d) && d.canBlockFrom(src) && d.state !== 'dizzy') {
      d.move = null;
      d.setState('block');
      d.stun = h.bs;
      d.crouching = d.inp.v < 0;
      d.vx = dir * h.kb * 0.9;
      if (special) {
        const chip = h.chip !== undefined ? h.chip : Math.round(h.dmg * 0.15);
        d.hp = Math.max(0, d.hp - chip);
        d.redDelay = 30;
        if (d.hp <= 0) { this.applyDamage(a, d, 0); d.setState('airhit'); d.airborne = true; d.vy = 9; d.vx = dir * 4; this.onKO(d, a); }
      }
      a.meter = Math.min(METER_MAX, a.meter + h.dmg * 0.2);
      d.meter = Math.min(METER_MAX, d.meter + h.dmg * 0.35);
      if (!proj && this.nearWall(d, dir)) a.vx = -dir * h.kb * 0.8;
      this.hitstop = proj ? 4 : 6;
      this.sfx('block');
      this.fx.blockSpark(cx, -cy, dir);
      if (!proj || a.state === 'move' && a.move.proj) a.contact = true;
      d.stats.blocked++;
      if (h.onContact) h.onContact(a, d, this, true);
      return;
    }

    const counter = d.state === 'move' && d.move.type !== 'throw' && d.mf <= d.move.lastActive;
    const isSuper = proj ? !!proj.super : a.move && a.move.type === 'super';
    const dmg = this.scaleDamage(d, h.dmg * (counter ? 1.2 : 1), isSuper);
    if (h.dmg > 0) this.applyDamage(a, d, dmg);

    let L = h.launch;
    if (!L && (d.airborne || d.state === 'airhit')) L = h.airLaunch || [2, 6];
    if (!L && h.kd) L = [2.5, 5];
    if (d.hp <= 0 && !L) L = [4, 9];
    if (d.state === 'dizzy' && !L) L = [4, 9];
    d.move = null; d.passThrough = false; d.hidden = false; d.heldBy = null;
    if (L) {
      d.setState('airhit');
      d.airborne = true;
      d.vx = L[0] * dir; d.vy = L[1];
      if (d.y <= 0) d.y = 1;
      if (d.comboHits > 1 || L[1] < 6) d.juggle += h.jp;
      if (h.gb && !d.gbUsed) { d.gbPending = true; d.gbUsed = true; }
    } else {
      d.setState('hit');
      d.stun = h.hs + (counter ? 4 : 0);
      d.vx = dir * h.kb;
      d.crouching = d.inp.v < 0 && !d.airborne;
      d.hurtPose = d.crouching ? POSES.hurtCr : (cy - d.y > 105 * d.look.scale ? POSES.hurtHigh : POSES.hurtLow);
      if (!proj && this.nearWall(d, dir)) a.vx = -dir * h.kb * 0.9;
    }
    d.snap = true;
    d.flash = 3;
    if (proj && proj.carry) d.vx = proj.vx * proj.dir;

    const hs = { L: 7, M: 10, H: 13, S: 12 }[h.lvl];
    this.hitstop = proj ? Math.round(hs * 0.7) : hs;
    this.fx.hitSpark(cx, -cy, h.lvl, dir);
    this.sfx(h.lvl === 'L' ? 'hitL' : h.lvl === 'M' ? 'hitM' : 'hitH');
    const big = h.lvl === 'H' || h.lvl === 'S' || !!L;
    if (h.lvl === 'H' || h.lvl === 'S') this.shake(h.lvl === 'S' ? 8 : 5);
    if (h.dmg > 0 && d.hp > 0) this.hurtVoice(d, big);
    if (counter) {
      this.fx.text(d.x, -d.y - 230 * d.look.scale, 'KONTRA!', '#ff6b6b', 30); this.sfx('counter');
      if (chance(0.35)) Voice.line('counter', null, { ifQuiet: true });
    }
    if (h.lvl === 'S' || d.comboHits >= 6) { this.stage.hype(30); this.crowd(d.comboHits >= 6 ? 'crowdOoh' : 'crowd'); }
    if (big && h.dmg > 0 && this.mode !== 'training' && this.frame - (this.reactF || -999) > 420 && chance(0.18)) {
      this.reactF = this.frame;
      Voice.line(pick(REACTIONS), null, { ifQuiet: true });
    }
    if (d.hp > 0 && d.hp < d.maxHp * 0.15 && !d.lowSaid && this.mode !== 'training') {
      d.lowSaid = true;
      Voice.line('react_7', null, { ifQuiet: true });
    }
    if (!proj && a.airborne && a.move && a.move.air && L && L[1] > 0) { a.vy = Math.max(a.vy, 4); d.vy = Math.max(L[1], a.vy + 1); d.vx = dir * 1.6; }
    if (!proj) { a.contact = true; a.contactHit = true; a.contactF = a.contactF || this.frame; }
    else if (a.state === 'move' && a.move.proj) { a.contact = true; }
    if (h.onContact) h.onContact(a, d, this, false);
    if (d.hp <= 0) this.onKO(d, a);
  }

  // ---------------- pociski ----------------
  spawnProj(owner, d) { this.projectiles.push(new Projectile(owner, d, this)); }
  hasProj(owner, limit) { return this.projectiles.some(p => p.owner === owner && p.limit === limit && !p.dead); }

  updateProjectiles() {
    const ps = this.projectiles;
    for (const p of ps) {
      p.t++;
      if (p.cool > 0) p.cool--;
      p.x += p.vx * p.dir; p.y += p.vy;
      this.projFx(p);
      if (p.t > p.life || p.x < -150 || p.x > STAGE_W + 150) p.dead = true;
      if (p.vy < 0 && p.y <= 0) { p.dead = true; this.fx.leaves(p.x, 0, 6, 3); }
    }
    // zderzenia pocisków
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j];
      if (a.dead || b.dead || a.owner === b.owner || !a.isActive() || !b.isActive()) continue;
      if (a.kind === 'geyser' || b.kind === 'geyser') continue;
      if (!overlap(a.box(), b.box())) continue;
      const x = (a.x + b.x) / 2, y = -(a.y + b.y) / 2;
      if (a.super && !b.super) b.dead = true;
      else if (b.super && !a.super) a.dead = true;
      else { a.hits--; b.hits--; if (a.hits <= 0) a.dead = true; if (b.hits <= 0) b.dead = true; }
      this.fx.hitSpark(x, y, 'M', 1, ['#ffffff', '#ffe08a', '#8fdcff']);
      this.sfx('hitM');
    }
    // trafienia
    for (const p of ps) {
      if (p.dead || p.cool > 0 || !p.isActive()) continue;
      const d = p.owner.opp;
      const hb = d.hurtboxes();
      const box = p.box();
      const hurt = hb.find(b => overlap(box, b));
      if (!hurt) continue;
      this.resolveHit(p.owner, d, p.currentHit(), box, p, hurt);
      p.hits--; p.cool = p.interval;
      if (p.hits <= 0) { p.dead = true; this.projDeathFx(p); }
    }
    for (let i = ps.length - 1; i >= 0; i--) if (ps[i].dead) ps.splice(i, 1);
  }

  projFx(p) {
    const fx = this.fx;
    switch (p.kind) {
      case 'wave': if (p.t % 3 === 0) fx.add({ type: 'drop', x: p.x - p.dir * 30, y: -rand(20, 50), vx: -p.dir * rand(0, 2), vy: -rand(1, 3), g: 0.35, life: 18, size: 3, color: '#cdefff' }); break;
      case 'tsunami': if (p.t % 2 === 0) fx.add({ type: 'drop', x: p.x + p.dir * rand(0, 80), y: -rand(250, 300), vx: p.dir * rand(1, 4), vy: -rand(1, 4), g: 0.35, life: 30, size: rand(3, 6), color: '#e9fbff' }, true); break;
      case 'megaOrange': if (p.t % 2 === 0) fx.juice(p.x - p.dir * 50, -p.y, 2, -p.dir); break;
      case 'orange': if (p.t % 5 === 0) fx.juice(p.x - p.dir * 16, -p.y, 1, -p.dir); break;
      case 'geyser':
        if (p.t === p.active[0]) { this.sfx('splash'); this.shake(4); }
        if (p.isActive() && p.t % 2 === 0) fx.add({ type: 'drop', x: p.x + rand(-30, 30), y: -rand(200, 290), vx: rand(-3, 3), vy: -rand(2, 5), g: 0.4, life: 26, size: rand(3, 6), color: '#e9fbff' }, true);
        if (p.t < p.active[0] && p.t % 5 === 0) this.sfx('bubble');
        break;
    }
  }

  projDeathFx(p) {
    if (p.kind === 'orange' || p.kind === 'megaOrange') this.fx.juice(p.x, -p.y, 18, -p.dir);
    else if (p.kind === 'shuriken') this.fx.leaves(p.x, -p.y, 8, 4);
    else if (p.kind !== 'geyser') this.fx.splash(p.x, -p.y, 14, 0.8);
  }

  // ---------------- efekty globalne ----------------
  sfx(name) { Sfx.play(name); }

  // Krzyk trafionej kapibary: mocny cios – zabawna kwestia, lekki – krótkie „au!”, a bez nagrania pisk
  hurtVoice(d, big) {
    const said = big ? CapyVoice.say(d, 'hitH', 0.5) || CapyVoice.say(d, 'hitL', 0.4) : CapyVoice.say(d, 'hitL', 0.22);
    if (!said && big && chance(0.5)) Sfx.squeak(d.look.voice * 1.35, 0.15, 0.13);
  }

  // Doping kibiców (nagranie), najwyżej co 2,5 s; force – nokaut i wykończenie
  crowd(name, force) {
    if (!Sfx.ok() || this.mode === 'training') return;
    if (!force && this.frame - (this.crowdF || -999) < 150) return;
    this.crowdF = this.frame;
    Rec.play(name, Sfx.sfxGain, force ? 0.75 : 0.5);
  }
  // przy ustawieniu systemu „ogranicz ruch” wstrząsy i błyski są cztery razy słabsze
  shake(n) { this.cam.shake = Math.max(this.cam.shake, n * MOTION_K); }
  flashScreen(color, a) { this.flash = { color, a: a * MOTION_K }; }

  announce(text, sub, color = '#fff', dur = 90, size = 1) {
    this.ann = { text, sub, color, dur, t: 0, size };
  }

  superFlash(f) {
    this.superFreeze = 44;
    this.superOwner = f;
    this.sfx('super');
    this.stage.hype(50);
    this.fx.add({ type: 'ring', x: f.x, y: -f.y - 110, size: 20, grow: 14, life: 26, color: f.ch.color }, true);
    this.fx.text(f.x, -f.y - 270 * f.look.scale, f.superMove.name.toUpperCase(), f.ch.color, 34);
    this.crowd('crowd');
  }

  breakerFx(f) {
    this.hitstop = 10;
    this.flashScreen('#ffffff', 0.5);
    this.fx.add({ type: 'ring', x: f.x, y: -f.y - 100, size: 20, grow: 16, life: 22, color: '#7ff6ff' }, true);
    this.fx.text(f.x, -f.y - 250, 'PRZERYWNIK!', '#7ff6ff', 34);
    this.sfx('breaker');
    Voice.line('breaker');
  }

  updateCombos() {
    for (let i = 0; i < 2; i++) {
      const c = this.combo[i];
      if (!c) continue;
      const d = this.fighters[1 - i];
      if (c.live && d.comboHits === 0) {
        c.live = false; c.t = 0;
        for (const [n, word, col, key] of PRAISE) if (c.n >= n) {
          c.praise = { word, col };
          if (n >= 5) Voice.line(key, word.toLowerCase().replace(/!/g, '') + '!', { pitch: 0.7, rate: 1.1 });
          break;
        }
      }
      if (!c.live && ++c.t > 90) this.combo[i] = null;
    }
  }

  updateTraining() {
    const tr = this.training;
    const [p, d] = this.fighters;
    if (tr.infMeter) p.meter = METER_MAX;
    d.meter = METER_MAX;
    if (d.state === 'neutral' || d.state === 'air' || d.state === 'block') tr.dummyIdle++;
    else tr.dummyIdle = 0;
    if (tr.dummyIdle > 50) { d.hp = d.maxHp; d.redHp = d.maxHp; p.hp = p.maxHp; p.redHp = p.maxHp; }
  }

  // ---------------- kamera ----------------
  updateCamera() {
    const [a, b] = this.fighters;
    const cam = this.cam;
    let tx = (a.x + b.x) / 2;
    const sep = Math.abs(a.x - b.x);
    let zt = lerp(1.36, 1.22, clamp((sep - 160) / 560, 0, 1));
    if (this.superFreeze > 0) { zt += 0.14; tx = lerp(tx, this.superOwner.x, 0.4); }
    if (this.phase === 'cine') { zt = 1.32; tx = (this.cine.w.x + this.cine.l.x) / 2; }
    cam.zoom += (zt - cam.zoom) * 0.08;
    const half = VW / 2 / cam.zoom;
    tx = clamp(tx, half, STAGE_W - half);
    cam.x += (tx - cam.x) * 0.16;
    let maxY = 0;
    if (this.phase !== 'cine') for (const f of this.fighters) if (f.y < 700) maxY = Math.max(maxY, f.y);
    const lt = clamp((maxY - 140) * 0.7, 0, 170);
    cam.lift += (lt - cam.lift) * 0.12;
  }

  // ---------------- rysowanie ----------------
  render(ctx, S, ox, oy, hud = true) {
    const cam = this.cam;
    const shx = cam.shake ? rand(-1, 1) * cam.shake : 0, shy = cam.shake ? rand(-1, 1) * cam.shake * 0.6 : 0;
    ctx.setTransform(S, 0, 0, S, ox + shx * S, oy + shy * S);
    this.stage.drawBack(ctx, cam, this);
    if (this.superFreeze > 0) {
      const k = Math.min(1, this.superFreeze / 10, (44 - this.superFreeze) / 6);
      ctx.fillStyle = `rgba(10,5,25,${0.6 * k})`;
      ctx.fillRect(-50, -50, VW + 100, VH + 100);
      this.drawSuperLines(ctx, k);
    }

    ctx.save();
    ctx.translate(VW / 2, GROUND_SY + cam.lift);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, 0);
    for (const f of this.fighters) {
      if (f.hidden || f.y > 900) continue;
      const k = Math.max(0.3, 1 - f.y / 450);
      ctx.fillStyle = `rgba(0,0,0,${0.32 * k})`;
      ctx.beginPath(); ctx.ellipse(f.x, 2, 62 * f.look.girth * f.look.scale * k, 12 * k, 0, 0, TAU); ctx.fill();
    }
    this.fx.draw(ctx, false);
    if (this.cine && this.cine.fin.draw) this.cine.fin.draw(ctx, this, this.cine, 'back');
    const order = this.fighters.slice().sort((p, q) => this.drawPriority(p) - this.drawPriority(q));
    for (const f of order) f.draw(ctx);
    for (const p of this.projectiles) PROJ_DRAW[p.kind](ctx, p);
    if (this.cine && this.cine.fin.draw) this.cine.fin.draw(ctx, this, this.cine, 'front');
    this.fx.draw(ctx, true);
    if (this.showBoxes) this.drawBoxes(ctx);
    ctx.restore();

    this.stage.drawFront(ctx, cam);
    ctx.setTransform(S, 0, 0, S, ox, oy);
    if (this.cine && this.cine.fin.screen) this.cine.fin.screen(ctx, this, this.cine);
    if (this.flash) { ctx.fillStyle = rgba(this.flash.color, clamp(this.flash.a, 0, 1)); ctx.fillRect(0, 0, VW, VH); }
    if (hud) this.drawHUD(ctx);
    this.drawAnnounce(ctx);
  }

  drawPriority(f) {
    if (f.state === 'move') return 3;
    if (f.state === 'held') return 2;
    if (f.state === 'hit' || f.state === 'airhit' || f.state === 'knockdown' || f.state === 'ko') return 0;
    return 1 + f.idx * 0.1;
  }

  drawSuperLines(ctx, k) {
    const f = this.superOwner, cam = this.cam;
    const cx = VW / 2 + (f.x - cam.x) * cam.zoom, cy = GROUND_SY + cam.lift - (f.y + 110) * cam.zoom;
    ctx.save();
    ctx.globalAlpha = 0.5 * k;
    ctx.strokeStyle = f.ch.color; ctx.lineWidth = 3;
    const r = mulberry32((this.superFreeze / 3) | 0);
    for (let i = 0; i < 40; i++) {
      const a = r() * TAU, r0 = 80 + r() * 60, r1 = 700;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
    }
    ctx.restore();
  }

  drawBoxes(ctx) {
    ctx.lineWidth = 2;
    for (const f of this.fighters) {
      ctx.strokeStyle = 'rgba(80,255,120,0.9)';
      for (const b of f.hurtboxes()) ctx.strokeRect(b[0], -b[3], b[2] - b[0], b[3] - b[1]);
      const act = f.activeHits();
      if (act) {
        ctx.strokeStyle = 'rgba(255,60,60,0.95)';
        for (const i of act) { const b = f.worldBox(f.move.hits[i].box); ctx.strokeRect(b[0], -b[3], b[2] - b[0], b[3] - b[1]); }
      }
      if (f.state === 'move' && f.move.grab) {
        ctx.strokeStyle = 'rgba(255,220,60,0.9)';
        const r = f.move.grab.range * f.look.scale;
        ctx.strokeRect(Math.min(f.x, f.x + f.facing * r), -150, r, 140);
      }
      ctx.strokeStyle = 'rgba(80,160,255,0.8)';
      const pw = f.pushWidth();
      ctx.strokeRect(f.x - pw, -f.y - 8, pw * 2, 8);
    }
    ctx.strokeStyle = 'rgba(255,60,60,0.95)';
    for (const p of this.projectiles) if (p.isActive()) { const b = p.box(); ctx.strokeRect(b[0], -b[3], b[2] - b[0], b[3] - b[1]); }
  }

  drawAnnounce(ctx) {
    const a = this.ann;
    if (!a || a.t > a.dur) return;
    const t = a.t;
    const k = t < 10 ? easeOutBack(t / 10) : 1;
    const alpha = t > a.dur - 15 ? (a.dur - t) / 15 : 1;
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.translate(VW / 2, VH * 0.4);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = "92px 'Titan One', 'Arial Black', sans-serif";
    // długie napisy (np. „ZŁOTY KAPITAN KAPI WYGRYWA!”) zmniejszone tak, żeby zmieściły się na ekranie
    const fit = Math.min(1, (VW - 90) / (ctx.measureText(a.text).width * a.size));
    ctx.scale(k * a.size * fit, k * a.size * fit);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 16; ctx.strokeStyle = '#1b0f08'; ctx.strokeText(a.text, 0, 0);
    const g = ctx.createLinearGradient(0, -46, 0, 46);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, a.color); g.addColorStop(1, shade(a.color, -0.35));
    ctx.fillStyle = g; ctx.fillText(a.text, 0, 0);
    if (a.sub) {
      ctx.font = "44px 'Titan One', 'Arial Black', sans-serif";
      ctx.lineWidth = 10; ctx.strokeText(a.sub, 0, 78);
      ctx.fillStyle = '#ffffff'; ctx.fillText(a.sub, 0, 78);
    }
    ctx.restore();
  }

  drawHUD(ctx) {
    const [a, b] = this.fighters;
    this.drawBar(ctx, a, 0);
    this.drawBar(ctx, b, 1);
    // zegar
    ctx.save();
    ctx.translate(VW / 2, 54);
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU);
    ctx.fillStyle = 'rgba(20,12,8,0.85)'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#ffd23f'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = "40px 'Titan One', sans-serif";
    ctx.fillStyle = this.timer <= 10 && this.roundTime > 0 && this.mode !== 'training' ? '#ff5d5d' : '#ffffff';
    ctx.fillText(this.roundTime > 0 && this.mode !== 'training' ? String(Math.max(0, this.timer)) : '∞', 0, 3);
    ctx.restore();

    for (let i = 0; i < 2; i++) {
      const c = this.combo[i];
      if (!c || c.n < 2) continue;
      const x = i === 0 ? 70 : VW - 70;
      const al = c.live ? 1 : clamp(1 - c.t / 90, 0, 1);
      ctx.save();
      ctx.globalAlpha = al;
      ctx.textAlign = i === 0 ? 'left' : 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      // po obu stronach „3 CIOSY”: liczba, potem słowo; po prawej całość dosunięta do krawędzi
      const word = plural(c.n, 'CIOS', 'CIOSY', 'CIOSÓW');
      ctx.font = "26px 'Titan One', sans-serif";
      const ww = ctx.measureText(word).width;
      ctx.font = "64px 'Titan One', sans-serif";
      const w = ctx.measureText(String(c.n)).width;
      const nx = i === 0 ? x : x - ww - 10 - w;
      ctx.textAlign = 'left';
      ctx.lineWidth = 10; ctx.strokeStyle = '#1b0f08';
      ctx.strokeText(String(c.n), nx, 260);
      ctx.fillStyle = '#ffd23f'; ctx.fillText(String(c.n), nx, 260);
      ctx.font = "26px 'Titan One', sans-serif";
      ctx.lineWidth = 7; ctx.strokeText(word, nx + w + 10, 252);
      ctx.fillStyle = '#ffffff'; ctx.fillText(word, nx + w + 10, 252);
      ctx.textAlign = i === 0 ? 'left' : 'right';
      ctx.font = "20px 'Rubik', sans-serif";
      ctx.lineWidth = 5; ctx.strokeText(`${c.dmg} obrażeń`, x, 288);
      ctx.fillStyle = '#ffb3b3'; ctx.fillText(`${c.dmg} obrażeń`, x, 288);
      if (c.praise) {
        ctx.font = "30px 'Titan One', sans-serif";
        ctx.lineWidth = 7; ctx.strokeText(c.praise.word, x, 326);
        ctx.fillStyle = c.praise.col; ctx.fillText(c.praise.word, x, 326);
      }
      ctx.restore();
    }

    if (this.training) this.drawTraining(ctx);
    if (this.legendT > 0) this.drawLegend(ctx);
  }

  drawLegend(ctx) {
    const al = clamp(this.legendT / 40, 0, 1);
    ctx.save();
    ctx.globalAlpha = al;
    ctx.font = "16px 'Rubik', sans-serif";
    ctx.textBaseline = 'middle';
    this.fighters.forEach((f, i) => {
      if (!f.ctrl.human) return;
      const k = b => keyName(BINDINGS[i][b][0]);
      const txt = `${k('LP')} łapa · ${k('HP')} mocna łapa · ${k('LK')} kopnięcie · ${k('HK')} mocne · ${k('SP')} + kierunek – cios specjalny`;
      const w = ctx.measureText(txt).width + 28, x = i === 0 ? 36 : VW - 36 - w, y = VH - 62;
      rrect(ctx, x, y - 15, w, 30, 10);
      ctx.fillStyle = 'rgba(15,10,6,0.78)'; ctx.fill();
      ctx.fillStyle = '#ffe9b0'; ctx.textAlign = 'left';
      ctx.fillText(txt, x + 14, y + 1);
    });
    ctx.restore();
  }

  drawBar(ctx, f, side) {
    const W = 480, H = 26, y = 36;
    const x0 = side === 0 ? VW / 2 - 52 - W : VW / 2 + 52;
    const dirX = side === 0 ? -1 : 1;
    // portret
    const px = side === 0 ? 48 : VW - 48;
    ctx.save();
    ctx.beginPath(); ctx.arc(px, 54, 38, 0, TAU);
    ctx.fillStyle = shade(f.ch.color, -0.55); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = f.ch.color; ctx.stroke();
    ctx.clip();
    drawCapyHead(ctx, f.look, px - (side === 0 ? 6 : -6), 66, 0.5, side === 1, { eye: f.hp / f.maxHp < 0.25 ? 3 : 0, t: f.t });
    ctx.restore();
    // pasek życia
    ctx.save();
    rrect(ctx, x0 - 4, y - 4, W + 8, H + 8, 8);
    ctx.fillStyle = 'rgba(20,12,8,0.85)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.stroke();
    const k = f.hp / f.maxHp, kr = f.redHp / f.maxHp;
    const anchor = side === 0 ? x0 + W : x0;
    ctx.fillStyle = '#d23a2e';
    ctx.fillRect(side === 0 ? anchor - W * kr : anchor, y, W * kr, H);
    const g = ctx.createLinearGradient(0, y, 0, y + H);
    const col = k > 0.5 ? ['#fff27a', '#ffc21f'] : k > 0.25 ? ['#ffd36a', '#ff8a1f'] : ['#ff9a7a', '#ff3b2f'];
    g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
    ctx.fillStyle = g;
    ctx.fillRect(side === 0 ? anchor - W * k : anchor, y, W * k, H);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(side === 0 ? anchor - W * k : anchor, y + 2, W * k, 5);
    ctx.restore();
    // imię
    ctx.font = "24px 'Titan One', sans-serif";
    ctx.textAlign = side === 0 ? 'left' : 'right'; ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 5; ctx.strokeStyle = '#1b0f08'; ctx.lineJoin = 'round';
    const nx = side === 0 ? x0 : x0 + W;
    const label = f.name.toUpperCase() + (f.ctrl.human ? '' : ' · CPU');
    ctx.strokeText(label, nx, y + H + 28);
    ctx.fillStyle = '#ffffff'; ctx.fillText(label, nx, y + H + 28);
    // wygrane rundy
    for (let i = 0; i < this.winsNeeded; i++) {
      const ox = side === 0 ? x0 + W - 14 - i * 30 : x0 + 14 + i * 30;
      const oy = y + H + 20;
      if (i < f.wins) drawOrange(ctx, ox, oy, 11, 0);
      else { ctx.beginPath(); ctx.arc(ox, oy, 10, 0, TAU); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.stroke(); }
    }
    // pasek super (pod linią ziemi, żeby nie zasłaniał stóp)
    const MW = 300, MH = 14, my = VH - 22;
    const mx0 = side === 0 ? 40 : VW - 40 - MW;
    rrect(ctx, mx0 - 3, my - 3, MW + 6, MH + 6, 6);
    ctx.fillStyle = 'rgba(20,12,8,0.85)'; ctx.fill();
    const bars = f.meter / 100;
    for (let i = 0; i < 3; i++) {
      const seg = clamp(bars - i, 0, 1);
      const sx = side === 0 ? mx0 + i * MW / 3 : mx0 + MW - (i + 1) * MW / 3;
      const sw = MW / 3 - 4;
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(sx + 2, my, sw, MH);
      const full = seg >= 1;
      ctx.fillStyle = full ? (f.meter >= SUPER_COST && (f.t >> 3) % 2 ? '#7ff6ff' : '#3fc7ff') : '#2a6f99';
      if (side === 0) ctx.fillRect(sx + 2, my, sw * seg, MH);
      else ctx.fillRect(sx + 2 + sw * (1 - seg), my, sw * seg, MH);
    }
    ctx.font = "20px 'Titan One', sans-serif";
    ctx.textAlign = side === 0 ? 'left' : 'right';
    ctx.lineWidth = 5; ctx.strokeStyle = '#1b0f08';
    const tx = side === 0 ? mx0 : mx0 + MW;
    const ml = f.meter >= SUPER_COST ? 'SUPER GOTOWY!' : `SUPER ${Math.floor(bars)}/3`;
    ctx.strokeText(ml, tx, my - 8);
    ctx.fillStyle = f.meter >= SUPER_COST ? '#7ff6ff' : '#cfe8ff'; ctx.fillText(ml, tx, my - 8);
  }

  drawTraining(ctx) {
    const tr = this.training, d = this.fighters[1];
    ctx.save();
    rrect(ctx, VW / 2 - 230, 104, 460, 66, 12);
    ctx.fillStyle = 'rgba(15,10,6,0.72)'; ctx.fill();
    ctx.font = "17px 'Rubik', sans-serif";
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffe9b0';
    const dm = d.ctrl instanceof CpuController ? DUMMY_MODES[4] : DUMMY_MODES[d.ctrl.mode];
    ctx.fillText(`TRENING · manekin: ${dm} · ostatnie combo: ${tr.lastCombo ? `${tr.lastCombo.n} ${plural(tr.lastCombo.n, 'cios', 'ciosy', 'ciosów')}, ${tr.lastCombo.dmg} obr.` : '—'}`, VW / 2, 130);
    ctx.fillStyle = '#c9d8e8';
    ctx.font = "15px 'Rubik', sans-serif";
    ctx.fillText(`1 – tryb manekina · 2 – hitboxy (${this.showBoxes ? 'wł.' : 'wył.'}) · 3 – reset · 4 – super bez limitu (${tr.infMeter ? 'wł.' : 'wył.'})`, VW / 2, 156);
    ctx.restore();
    // historia wejść gracza 1
    const p = this.fighters[0];
    const hist = p.hist.slice(-12);
    ctx.save();
    rrect(ctx, 28, 300, 40, 334, 10);
    ctx.fillStyle = 'rgba(15,10,6,0.6)'; ctx.fill();
    ctx.font = "bold 24px 'Segoe UI Symbol', 'Rubik', sans-serif";
    ctx.textAlign = 'center';
    hist.forEach((h, i) => {
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.65 * (i + 1) / hist.length})`;
      ctx.fillText(DIR_GLYPH[h.d] || '', 48, 620 - (hist.length - 1 - i) * 26);
    });
    ctx.restore();
  }

  // obsługa klawiszy trybu treningu
  trainingKey(code) {
    if (!this.training) return;
    const d = this.fighters[1];
    if (code === 'Digit1') {
      if (d.ctrl instanceof CpuController) { d.ctrl = this.dummyCtrl; d.ctrl.mode = 0; }
      else if (d.ctrl.mode < 3) d.ctrl.mode++;
      else { this.dummyCtrl = d.ctrl; d.ctrl = new CpuController(1); }
      Sfx.play('move');
    }
    if (code === 'Digit2') { this.showBoxes = !this.showBoxes; Store.set('boxes', this.showBoxes); Sfx.play('move'); }
    if (code === 'Digit3') {
      const [a, b] = this.fighters;
      a.reset(STAGE_W / 2 - 210, 1); b.reset(STAGE_W / 2 + 210, -1);
      a.toNeutral(); b.toNeutral();
      this.projectiles.length = 0;
      Sfx.play('confirm');
    }
    if (code === 'Digit4') { this.training.infMeter = !this.training.infMeter; Sfx.play('move'); }
  }
}
