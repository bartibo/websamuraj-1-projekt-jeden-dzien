'use strict';
/* Komputerowy przeciwnik. Naciska te same „klawisze” co człowiek: kolejkuje kierunki i przyciski,
   więc ciosy specjalne wykonuje prawdziwymi ruchami. Poziomy 0–3: Łatwy, Średni, Trudny, Mistrz. */

const AI_LEVELS = ['Łatwy', 'Średni', 'Trudny', 'Mistrz'];
const AI_TUNE = {
  react: [26, 16, 10, 5],
  block: [0.2, 0.5, 0.75, 0.92],
  aa: [0.12, 0.35, 0.65, 0.9],
  punish: [0.15, 0.4, 0.7, 0.92],
  drop: [0.35, 0.18, 0.07, 0.02],
  tech: [0.05, 0.25, 0.55, 0.8],
  breaker: [0, 0.006, 0.02, 0.04],
  finisher: [0.35, 0.6, 0.85, 1],
};

const MOTION_STEPS = {
  qcf: [2, 3, 6], qcb: [2, 1, 4], dp: [6, 2, 3], bf: [4, 4, 6], dd: [2, 5, 2], qcf2: [2, 3, 6, 2, 3, 6], down: [2],
};

class CpuController {
  constructor(level) {
    this.level = level; this.human = false;
    this.q = []; this.dir = 5; this.cool = 30; this.pressQ = [];
  }

  // ---- budowanie kolejki ----
  push(dir, frames = 1, btn = null) { this.q.push({ dir, frames, btn }); }
  wait(n) { this.push(5, n); }
  until(fn, max, dir = 5) { this.q.push({ dir, until: fn, frames: max }); }
  confirm() { this.q.push({ confirm: true, frames: 26 }); }

  normal(id) {
    const [st, btn] = id.split('.');
    if (st === 'j') {
      this.until((me, opp) => me.airborne && (me.vy < 6 || Math.abs(me.x - opp.x) < 120), 40);
      this.push(5, 1, btn);
      return;
    }
    const dir = st === 'c' ? 2 : st === 'f' ? 6 : st === 'b' ? 4 : 5;
    this.push(dir, 1, btn);
  }

  motion(name, btn) {
    const steps = MOTION_STEPS[name];
    steps.forEach((d, i) => this.push(d, i === steps.length - 1 ? 1 : 2, i === steps.length - 1 ? btn : null));
  }

  token(tok, me) {
    if (tok === 'jump') { this.push(9, 4); this.q.push({ check: m => m.airborne || m.state === 'prejump', frames: 1 }); return; }
    if (tok === 'super') { this.motion('qcf2', 'HP'); return; }
    if (tok === 'land') { this.until(m => !m.airborne && (m.state === 'neutral' || m.state === 'land'), 50); return; }
    if (tok.startsWith('sp:')) {
      const [, id, btn] = tok.split(':');
      const sp = me.ch.specials.find(s => s.id === id);
      if (sp) this.motion(sp.motion, btn);
      return;
    }
    this.normal(tok);
  }

  combo(list, me) {
    list.forEach((tok, i) => {
      if (tok === 'super' && me.meter < SUPER_COST) return;
      this.token(tok, me);
      if (i < list.length - 1 && tok !== 'jump' && tok !== 'land') this.confirm();
    });
  }

  // Nadchodzący cios albo pocisk: { move, proj, dir } (dir 1 – blok nisko, 4 – blok stojąc) albo null
  threat(me, opp, g) {
    const dist = Math.abs(opp.x - me.x);
    const move = opp.state === 'move' && opp.move.hits.length && opp.mf <= opp.move.lastActive && dist < 300;
    const proj = g.projectiles.find(p => p.owner === opp && Math.abs(p.x - me.x) < 330 && sign(me.x - p.x) === p.dir);
    if (!move && !proj) return null;
    const low = move && opp.move.hits.some(h => h.guard === 'low') || proj && proj.hit.guard === 'low';
    const high = move && opp.move.hits.some(h => h.guard === 'high');
    return { move, proj, dir: low && !high ? 1 : 4 };
  }

  // Czujność między decyzjami: atak zauważony w czasie odliczania – blok po czasie reakcji poziomu
  watch(me, opp, g) {
    if (me.state !== 'neutral') { this.seen = false; return; }
    const th = this.threat(me, opp, g);
    if (!th) { this.seen = false; return; }
    if (this.seen) return;
    this.seen = true;
    if (!chance(AI_TUNE.block[this.level])) return;
    const r = AI_TUNE.react[this.level];
    this.wait(randInt(r >> 2, r >> 1));
    this.push(th.dir, 16);
    this.cool = 0;
  }

  // ---- decyzje ----
  think(me, opp, g) {
    const L = this.level, T = AI_TUNE, ch = me.ch;
    const dx = opp.x - me.x, dist = Math.abs(dx);

    if (g.finishWindow && g.finishWindow.active) {
      if (g.finishWindow.winner !== me) return;
      const fins = ch.finishers.concat(FRIENDSHIP);
      if (!this.finTried && chance(T.finisher[L])) {
        this.finTried = true;
        const fin = chance(0.8) ? fins[0] : fins[fins.length - 1];
        if (fin.range && dist > fin.range - 30) { this.push(6, 20); }
        this.wait(4);
        fin.motion.forEach(d => this.push(d === 'n' ? 5 : d, 3));
        this.push(5, 1, fin.btn);
        return;
      }
      if (dist > 120) this.push(6, 10); else this.normal('s.HP');
      this.cool = 30;
      return;
    }

    if (me.state !== 'neutral') return;

    const th = this.threat(me, opp, g);
    if (th && chance(T.block[L])) {
      if (th.proj && !th.move && L >= 1 && chance(0.25) && dist < 500) { this.push(9, 3); this.wait(10); this.normal('j.HK'); return; }
      this.push(th.dir, 16);
      return;
    }

    if ((opp.state === 'air' || opp.state === 'move' && opp.airborne) && dist < 250 && opp.y > 30 && chance(T.aa[L])) {
      if (chance(0.6) && ch.antiAir) this.token(ch.antiAir, me);
      else this.normal('c.HP');
      return;
    }

    if (opp.state === 'move' && opp.mf > opp.move.lastActive && dist < 180 && chance(T.punish[L])) {
      this.combo(pick(ch.aiCombos), me);
      return;
    }
    if ((opp.state === 'land' || opp.state === 'getup') && dist < 160 && chance(T.punish[L] * 0.6)) {
      this.combo(pick(ch.aiCombos), me);
      return;
    }

    const r = Math.random();
    if (dist > 430) {
      if (r < 0.38 && ch.zoning) this.token(pick(ch.zoning), me);
      else if (r < 0.7) this.push(6, randInt(15, 35));
      else if (r < 0.85) { this.push(6, 1); this.push(5, 2); this.push(6, 1); this.wait(14); }
      else { this.push(9, 3); this.normal('j.HK'); this.confirm(); this.normal('s.HP'); }
    } else if (dist > 180) {
      if (r < 0.3) this.push(6, randInt(10, 22));
      else if (r < 0.45) { this.push(6, 1); this.push(5, 2); this.push(6, 1); this.wait(10); }
      else if (r < 0.62) { this.push(9, 3); this.normal(chance(0.5) ? 'j.HK' : 'j.HP'); this.confirm(); this.combo(pick(ch.aiCombos), me); }
      else if (r < 0.78 && ch.zoning) this.token(pick(ch.zoning), me);
      else if (r < 0.88 && dist < 240) this.normal('c.HK');
      else this.push(4, randInt(10, 20));
    } else {
      if (r < 0.5) this.combo(pick(ch.aiCombos), me);
      else if (r < 0.62 && dist < 110) { if (ch.cmdGrab && chance(0.6)) this.token(ch.cmdGrab, me); else { this.push(5, 1, 'LP'); this.push(5, 1, 'LK'); } }
      else if (r < 0.7 && me.meter >= SUPER_COST) this.combo(['s.HP', 'super'], me);
      else if (r < 0.8) this.push(4, randInt(12, 24));
      else if (r < 0.88) { this.push(4, 1); this.push(5, 2); this.push(4, 1); this.wait(16); }
      else if (r < 0.94) this.normal('f.HP');
      else this.normal('c.LK');
    }
  }

  poll(me, opp, g) {
    const out = { l: false, r: false, u: false, d: false, press: [], hold: {} };
    if (!g.phase || g.phase === 'intro' || g.phase === 'over') return out;
    const L = this.level;

    if (me.state === 'held' && me.techWindow > 0 && chance(AI_TUNE.tech[L] / 6)) out.press.push('LP', 'LK');
    if ((me.state === 'hit' || me.state === 'airhit') && me.comboHits >= 3 && me.meter >= BREAK_COST && chance(AI_TUNE.breaker[L])) out.press.push('HP', 'HK');
    if (me.state === 'hit' || me.state === 'airhit' || me.state === 'knockdown') { this.q.length = 0; this.dir = 5; }

    if (!this.q.length) {
      if (this.cool > 0) { this.cool--; this.watch(me, opp, g); }
      else {
        this.think(me, opp, g);
        this.cool = randInt(AI_TUNE.react[L] >> 1, AI_TUNE.react[L]);
      }
    }

    // w trakcie zamrożenia klatek (trafienie, super) trzymamy kierunek i nic nie naciskamy
    if (g.hitstop > 0 || g.superFreeze > 0) return this.dirOut(out, this.lastDir || 5, me);

    let dir = 5;
    const step = this.q[0];
    if (step) {
      if (step.check) {
        this.q.shift();
        if (!step.check(me)) this.q.length = 0;
      } else if (step.confirm) {
        dir = this.lastDir || 5;
        if (me.state === 'move' && me.contact && me.moveSerial !== this.confirmed) {
          this.confirmed = me.moveSerial; this.q.shift();
          if (chance(AI_TUNE.drop[L])) this.q.length = 0;
        }
        else if (me.state !== 'move' && me.state !== 'prejump' && !(me.state === 'air' && me.airborne)) this.q.length = 0;
        else if (--step.frames <= 0) this.q.length = 0;
      } else if (step.until) {
        dir = step.dir;
        if (step.until(me, opp) || --step.frames <= 0) this.q.shift();
      } else {
        dir = step.dir;
        if (step.btn && !step.pressed) { out.press.push(step.btn); step.pressed = true; }
        if (--step.frames <= 0) this.q.shift();
      }
    }
    this.lastDir = dir;
    return this.dirOut(out, dir, me);
  }

  dirOut(out, dir, me) {
    const fwd = dir === 6 || dir === 9 || dir === 3 ? 1 : dir === 4 || dir === 7 || dir === 1 ? -1 : 0;
    const h = fwd * me.facing;
    out.r = h > 0; out.l = h < 0; out.u = dir >= 7; out.d = dir <= 3;
    return out;
  }
}
