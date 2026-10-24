'use strict';
/* Statki wroga i bossy: zachowanie (ai z METEOR_TYPES) i ich efekty.
   Dopina metody do obiektu Game, więc ładowany jest po game.js
   (defineProperties, a nie Object.assign – gettery mają zostać getterami). */

Object.defineProperties(Game, Object.getOwnPropertyDescriptors({
  // promienie, na których krążą statki: orbita bliska (Łowcy, boss) i stanowisko przy krawędzi ekranu
  get nearOrbit() { return clamp(Math.min(this.w, this.h) / 2 - 115 * this.scale, this.R * 2.3, this.R * 4.2); },
  get station() { return Math.max(this.R * 2.6, Math.min(this.w, this.h) / 2 - 60 * this.scale); },

  updateAI(m, mdt, dt) {
    switch (m.T.ai) {
      case 'boss': return this.updateShip(m, mdt, dt);
      case 'hunter': return this.updateHunter(m, mdt, dt);
      case 'bomber': return this.updateBomber(m, mdt, dt);
      case 'kamikaze': return this.updateKamikaze(m, mdt, dt);
      case 'gunship': return this.updateGunship(m, mdt, dt);
      case 'minelayer': return this.updateMinelayer(m, mdt, dt);
      case 'carrier': return this.updateCarrier(m, mdt, dt);
      case 'swarmer': return this.updateSwarmer(m, mdt, dt);
      case 'escort': return this.updateEscort(m, mdt, dt);
      case 'missile': return this.updateMissile(m, mdt, dt);
    }
  },

  get aiActive() { return !this.demo && this.state === 'playing'; },

  // wspólne: ruch, obrót (dziobem w kierunku lotu albo do planety), błysk, wiek, płomień silnika
  shipTick(m, mdt, dt, face) {
    m.x += m.vx * mdt; m.y += m.vy * mdt;
    const want = face === 'planet' ? Math.atan2(-m.y, -m.x) : Math.atan2(m.vy, m.vx);
    m.rot += angleDiff(m.rot, want) * Math.min(1, dt * 6);
    if (m.flash > 0) m.flash -= dt;
    m.age += dt;
    m.heat = 0;
    if (m.T.hull && Math.random() < 0.45 * this.fxQuality) {
      const bx = m.x - Math.cos(m.rot) * m.r * 1.05, by = m.y - Math.sin(m.rot) * m.r * 1.05;
      this.fx.add({ k: 'glow', x: bx, y: by, vx: -Math.cos(m.rot) * 40, vy: -Math.sin(m.rot) * 40, life: rand(0.15, 0.3), s: m.r * 0.5, c: enemySpec(m.type).accent, a: 0.7 });
    }
  },

  // dojazd do punktu z ograniczoną prędkością
  steerTo(m, tx, ty, vmax, dt, gain = 1.4) {
    let vx = (tx - m.x) * gain, vy = (ty - m.y) * gain;
    const v = Math.hypot(vx, vy);
    if (v > vmax) { vx *= vmax / v; vy *= vmax / v; }
    const k = Math.min(1, dt * 3);
    m.vx += (vx - m.vx) * k; m.vy += (vy - m.vy) * k;
  },

  enemyBolt(x, y, ang, speedMul, k, color) {
    const sp = this.baseSpeed * speedMul;
    this.meteors.push(this.makeMeteor('bolt', 0, x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, k));
    this.fx.add({ k: 'glow', x, y, life: 0.2, s: 18 * this.scale, c: color || '90,255,120', a: 1 });
  },

  /* ---------- Łowca: krąży po bliskiej orbicie i strzela w planetę ---------- */
  updateHunter(m, mdt, dt) {
    const d = Math.hypot(m.x, m.y) || 1, ux = m.x / d, uy = m.y / d;
    const orbit = this.nearOrbit, sp = this.baseSpeed * m.T.speed;
    if (!m.orbiting) {
      const k = Math.min(1, dt * 2);
      m.vx += (-ux * sp - m.vx) * k; m.vy += (-uy * sp - m.vy) * k;
      if (d <= orbit) m.orbiting = true;
    } else {
      const t = sp * 0.55 * m.dir, corr = (orbit - d) * 1.5;
      m.vx = -uy * t + ux * corr; m.vy = ux * t + uy * corr;
      if (this.aiActive && (m.fire -= dt) <= 0) {
        m.fire = Math.max(1.2, 2.5 - this.wave * 0.03);
        this.enemyBolt(m.x - ux * m.r, m.y - uy * m.r, Math.atan2(-uy, -ux), METEOR_TYPES.bolt.speed, 1);
        Sound.alienShot();
      }
    }
    m.x += m.vx * mdt; m.y += m.vy * mdt;
    m.rot = Math.sin(m.age * 2) * 0.15;
    if (m.flash > 0) m.flash -= dt;
    m.age += dt;
    m.heat = 0;
    this.emitTrail(m, dt);
  },

  /* ---------- Bombowiec: przeloty bokiem planety, zrzuca bomby ---------- */
  updateBomber(m, mdt, dt) {
    const hw = this.w / 2, hh = this.h / 2;
    if (!m.leg) {
      const a = Math.atan2(m.y, m.x);
      const off = (Math.random() < 0.5 ? -1 : 1) * rand(this.R * 2.6, Math.max(this.R * 2.8, Math.min(hw, hh) * 0.65));
      const tx = -Math.sin(a) * off, ty = Math.cos(a) * off;
      const dx = tx - m.x, dy = ty - m.y, l = Math.hypot(dx, dy) || 1, sp = this.baseSpeed * m.T.speed;
      m.vx = dx / l * sp; m.vy = dy / l * sp;
      m.leg = 1; m.seen = false; m.fire = 0.8;
    }
    this.shipTick(m, mdt, dt);
    const inside = Math.abs(m.x) < hw - m.r && Math.abs(m.y) < hh - m.r;
    if (inside) m.seen = true;
    // przeleciał – zawraca na kolejny przelot
    if (m.seen && (Math.abs(m.x) > hw + 60 || Math.abs(m.y) > hh + 60)) m.leg = 0;
    if (this.aiActive && inside && (m.fire -= dt) <= 0) {
      m.fire = Math.max(0.75, 1.5 - this.wave * 0.012);
      const d = Math.hypot(m.x, m.y) || 1, sp = this.baseSpeed * 0.55;
      this.meteors.push(this.makeMeteor('bomb', 0, m.x, m.y, -m.x / d * sp, -m.y / d * sp));
    }
  },

  /* ---------- Kamikadze: rozpędza się prosto na planetę ---------- */
  updateKamikaze(m, mdt, dt) {
    const sp = this.baseSpeed * Math.min(3.2, m.T.speed + m.age * 0.45);
    const weave = Math.sin(m.age * 6 + m.pulse) * 0.35 * Math.max(0, 1 - m.age * 0.3);
    const a = Math.atan2(-m.y, -m.x) + weave;
    m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp;
    this.shipTick(m, mdt, dt);
    this.emitTrail(m, dt);
  },

  /* ---------- Kanonierka: stanowisko przy krawędzi, szybkie strzały zapowiadane błyskiem ---------- */
  updateGunship(m, mdt, dt) {
    if (m.slot === undefined) { m.slot = Math.atan2(m.y, m.x); m.moveT = rand(7, 10); m.fire = rand(1.2, 2); }
    const st = this.station, tx = Math.cos(m.slot) * st, ty = Math.sin(m.slot) * st;
    this.steerTo(m, tx, ty, this.baseSpeed * m.T.speed * 1.3, dt);
    this.shipTick(m, mdt, dt, 'planet');
    if (!this.aiActive || Math.hypot(tx - m.x, ty - m.y) > 40 * this.scale) { m.charge = 0; return; }
    m.fire -= dt;
    m.charge = m.fire < 0.5 ? 1 - Math.max(0, m.fire) / 0.5 : 0;
    if (m.fire <= 0) {
      m.fire = Math.max(1.3, 2.6 - this.wave * 0.02);
      const a = Math.atan2(-m.y, -m.x);
      this.enemyBolt(m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r, a, 3.2, 0.9, '216,255,106');
      Sound.alienShot();
    }
    if ((m.moveT -= dt) <= 0) { m.moveT = rand(7, 10); m.slot += (Math.random() < 0.5 ? -1 : 1) * rand(0.5, 1); }
  },

  /* ---------- Stawiacz min: krąży między orbitą a krawędzią i zostawia miny ---------- */
  updateMinelayer(m, mdt, dt) {
    const d = Math.hypot(m.x, m.y) || 1, ux = m.x / d, uy = m.y / d;
    const orbit = (this.nearOrbit + this.station) / 2, sp = this.baseSpeed * m.T.speed;
    if (!m.orbiting) {
      this.steerTo(m, ux * orbit, uy * orbit, sp * 1.4, dt);
      if (Math.abs(d - orbit) < 20 * this.scale) m.orbiting = true;
    } else {
      const t = sp * 0.6 * m.dir, corr = (orbit - d) * 1.5;
      m.vx = -uy * t + ux * corr; m.vy = ux * t + uy * corr;
      if (this.aiActive && (m.fire -= dt) <= 0) {
        m.fire = Math.max(1.6, 2.8 - this.wave * 0.02);
        const ms = this.baseSpeed * 0.4;
        this.meteors.push(this.makeMeteor('mine', 0, m.x, m.y, -ux * ms, -uy * ms));
      }
    }
    this.shipTick(m, mdt, dt);
  },

  /* ---------- Nosiciel: stoi daleko i wypuszcza roje myśliwców ---------- */
  updateCarrier(m, mdt, dt) {
    if (m.slot === undefined) { m.slot = Math.atan2(m.y, m.x); m.fire = 2; }
    m.slot += 0.05 * m.dir * dt;
    const st = this.station * 0.92;
    this.steerTo(m, Math.cos(m.slot) * st, Math.sin(m.slot) * st, this.baseSpeed * m.T.speed * 1.4, dt);
    this.shipTick(m, mdt, dt, 'planet');
    if (!this.aiActive || (m.fire -= dt) > 0) return;
    m.fire = Math.max(2.2, 3.6 - this.wave * 0.02);
    if (this.meteors.filter(o => o.type === 'swarmer' && !o.dead).length >= 15) return;
    for (let i = 0; i < 3; i++) {
      const a = m.rot + (i - 1) * 1.3;
      const sp = this.baseSpeed;
      const s = this.makeMeteor('swarmer', 0, m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r, Math.cos(a) * sp, Math.sin(a) * sp);
      s.rot = a;
      this.meteors.push(s);
    }
    this.fx.add({ k: 'ring', x: m.x, y: m.y, life: 0.4, r0: m.r * 0.5, r1: m.r * 1.6, s: 3, c: '196,139,255', a: 0.9 });
  },

  /* ---------- Myśliwiec roju i rakieta: skręcają w stronę planety ---------- */
  homeIn(m, dt, turn, sp, weave) {
    const want = Math.atan2(-m.y, -m.x) + weave;
    const cur = Math.atan2(m.vy, m.vx);
    const na = cur + clamp(angleDiff(cur, want), -turn * dt, turn * dt);
    m.vx = Math.cos(na) * sp; m.vy = Math.sin(na) * sp;
  },
  updateSwarmer(m, mdt, dt) {
    this.homeIn(m, dt, 4, this.baseSpeed * m.T.speed, Math.sin(m.age * 7 + m.pulse) * 0.5);
    this.shipTick(m, mdt, dt);
    this.emitTrail(m, dt);
  },
  updateMissile(m, mdt, dt) {
    this.homeIn(m, dt, 2.4, this.baseSpeed * Math.min(2.8, m.T.speed + m.age * 0.35), 0);
    this.shipTick(m, mdt, dt);
    if (Math.random() < 0.7 * this.fxQuality) this.fx.add({ k: 'smoke', x: m.x, y: m.y, vx: rand(-8, 8), vy: rand(-8, 8), life: rand(0.4, 0.7), s: 3 * this.scale, grow: 1.4, c: '120,110,100', a: 0.35 });
  },

  /* ---------- Osłonowiec: nakłada tarcze energetyczne na meteoryty w pobliżu ---------- */
  updateEscort(m, mdt, dt) {
    const d = Math.hypot(m.x, m.y) || 1, ux = m.x / d, uy = m.y / d;
    const orbit = this.station * 0.8, sp = this.baseSpeed * m.T.speed;
    if (!m.orbiting) {
      this.steerTo(m, ux * orbit, uy * orbit, sp * 1.4, dt);
      if (Math.abs(d - orbit) < 20 * this.scale) m.orbiting = true;
    } else {
      const t = sp * 0.45 * m.dir, corr = (orbit - d) * 1.5;
      m.vx = -uy * t + ux * corr; m.vy = ux * t + uy * corr;
    }
    this.shipTick(m, mdt, dt);
    if (m.links) for (const l of m.links) l.life -= dt;
    if (!this.aiActive || (m.fire -= dt) > 0) return;
    m.fire = 3;
    const r2 = (200 * this.scale) ** 2;
    m.links = [];
    for (const o of this.meteors) {
      if (o.dead || o === m || o.T.ai || o.isBoss || o.T.radius[o.size] < 9) continue;
      if ((o.x - m.x) ** 2 + (o.y - m.y) ** 2 > r2) continue;
      if (!o.eshMax || o.escorted) {
        o.eshMax = o.esh = Math.max(o.esh, o.maxHp * 0.6);
        o.eshRegen = 0.001; o.escorted = true;
        m.links.push({ o, life: 0.6 });
      }
    }
    if (m.links.length) this.fx.add({ k: 'ring', x: m.x, y: m.y, life: 0.5, r0: m.r, r1: 200 * this.scale, s: 2, c: '127,233,255', a: 0.6 });
  },

  /* ======================= BOSS ======================= */
  // Statek-boss na koniec fali – każdy inny (BossGen.spec). Wchodzi przez portal przy krawędzi ekranu.
  spawnShip() {
    const spec = BossGen.spec(this.wave), s = this.scale;
    const a = rand(0, TAU), ca = Math.cos(a), sa = Math.sin(a);
    const r = spec.size * s;
    const hw = this.w / 2 - r - 24, hh = this.h / 2 - r - 24;
    const k = Math.max(this.R * 3, Math.min(hw / Math.max(Math.abs(ca), 1e-4), hh / Math.max(Math.abs(sa), 1e-4)));
    const m = this.makeMeteor('ship', 0, ca * k, sa * k, 0, 0);
    m.r = r;
    m.hp = m.maxHp = spec.hp * this.hpMul * this.diff.boss / this.diff.hp;
    m.art = ShipArt.get(spec, r);
    m.spec = spec;
    m.isBoss = true;
    m.rot = a + Math.PI;
    m.pts = 1500 + this.wave * 150;
    m.cr = 50 + this.wave * 8;
    m.home = a;
    m.warp = 0.9; m.phase = 1; m.gun = 0;
    // zdolności z przesuniętym startem, żeby nie odpalały naraz
    m.abil = spec.abilities.filter(id => id !== 'shield').map((id, i) => {
      const d = BOSS_ABILITIES.find(x => x.id === id);
      return { id, p: d.p, t: 2 + i * 1.2 };
    });
    if (spec.abilities.includes('shield')) { m.eshMax = m.esh = m.maxHp * 0.3; m.eshRegen = 0.12; }
    this.meteors.push(m);
    this.bossMaxSum = (this.boss && !this.boss.dead ? this.bossMaxSum : 0) + m.maxHp;
    this.boss = m;
    this.bossName = spec.name;
    // portal
    this.fx.add({ k: 'glow', x: m.x, y: m.y, life: 0.8, s: r * 5, c: spec.accent, a: 1 });
    for (let i = 0; i < 3; i++) this.fx.add({ k: 'ring', x: m.x, y: m.y, life: 0.6 + i * 0.2, r0: r * 3, r1: r * 0.3, s: 4, c: spec.accent, a: 0.9 });
    this.flash = Math.max(this.flash, 0.15);
    Sound.boss();
    Sound.emp();
    Sound.setIntensity(2);
    UI.banner(spec.final ? 'FINAŁ' : 'BOSS', spec.name, 'danger', BossGen.abilityNames(spec).join(' · '));
    return m;
  },

  // pocisk z kolejnej wieżyczki bossa (pozycje luf z grafiki statku); pierwsze fale – słabsze pociski
  bossBolt(m, ang, k = 1.2) {
    k *= this.wave < 4 ? 0.7 : this.wave < 8 ? 0.9 : 1.15;
    const g = m.art.guns[m.gun++ % m.art.guns.length], c = Math.cos(m.rot), s = Math.sin(m.rot);
    const x = m.x + g[0] * c - g[1] * s, y = m.y + g[0] * s + g[1] * c;
    this.enemyBolt(x, y, ang, METEOR_TYPES.bolt.speed, k, m.spec.accent);
  },

  // Uderzenie, które nie jest meteorytem (laser bossa): tarcza, a gdy padnie – planeta
  strikePlanet(ang, dmg, src) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    if (this.shieldActive()) {
      this.explode(ca * this.Rs, sa * this.Rs, 26 * this.scale, 'shield', 1.4);
      this.shieldHits.push({ a: ang, life: 0.9, max: 0.9, p: 1 });
      Sound.shieldHit();
      this.shake += 8;
      this.shield -= dmg;
      this.shieldDelay = 2.5;
      if (this.shield < 1) {
        const over = Math.max(0, -this.shield);
        this.shield = 0;
        this.shieldBreak();
        if (over > 0) { this.planet.addImpact(ang, 1); this.hurtPlanet(over, ang, src); }
      }
      return;
    }
    this.explode(ca * this.R, sa * this.R, 30 * this.scale, 'planet', 1.5);
    this.planet.addImpact(ang, 1.5);
    this.shake += 12;
    Sound.impact();
    this.hurtPlanet(dmg, ang, src);
  },

  // Ruch, fazy i zdolności statku-bossa
  updateShip(m, mdt, dt) {
    const S = m.spec;
    const d = Math.hypot(m.x, m.y) || 1, ux = m.x / d, uy = m.y / d;
    // orbita tak, by cały kadłub mieścił się nad dolnym paskiem HUD
    const orbit = clamp(Math.min(this.w, this.h) / 2 - 110 * this.scale - m.r, this.R * 2.5, this.R * 4.4);
    if (m.warp > 0) m.warp -= dt;
    if (m.dying > 0) return this.bossDying(m, dt);
    if (!m.orbiting) {
      this.steerTo(m, ux * orbit, uy * orbit, this.baseSpeed * 1.2, dt);
      if (Math.abs(d - orbit) < 12 * this.scale) { m.orbiting = true; m.home = Math.atan2(m.y, m.x); }
    } else if (m.beam) {
      m.vx *= 0.9; m.vy *= 0.9;
    } else {
      const ang = Math.atan2(m.y, m.x), rage = m.phase === 3 ? 1.5 : 1;
      let target;
      if (S.move === 'orbit') target = ang + 0.25 * m.dir * rage;
      else if (S.move === 'strafe') target = m.home + Math.sin(m.age * 0.45 * rage) * 1.1;
      else target = m.home + Math.sin(m.age * 0.8) * 0.3;
      this.steerTo(m, Math.cos(target) * orbit, Math.sin(target) * orbit, this.baseSpeed * 0.9 * rage, dt, 1.5);
    }
    m.x += m.vx * mdt; m.y += m.vy * mdt;
    m.rot += angleDiff(m.rot, Math.atan2(-m.y, -m.x)) * Math.min(1, dt * 4);
    if (m.flash > 0) m.flash -= dt;
    if (m.beamFx > 0) m.beamFx -= dt;
    m.age += dt;
    m.heat = 0;
    // silniki, a przy uszkodzeniach dym i iskry z kadłuba
    const q = this.fxQuality, hurt = 1 - m.hp / m.maxHp;
    if (Math.random() < 0.6 * q) {
      const bx = m.x - Math.cos(m.rot) * m.r, by = m.y - Math.sin(m.rot) * m.r;
      this.fx.add({ k: 'glow', x: bx + rand(-4, 4), y: by + rand(-4, 4), vx: -Math.cos(m.rot) * 50, vy: -Math.sin(m.rot) * 50, life: rand(0.25, 0.45), s: m.r * 0.45, c: S.accent, a: 0.7 });
    }
    if (Math.random() < hurt * 0.8 * q) {
      const a = rand(0, TAU), rr = m.r * rand(0.2, 0.7), x = m.x + Math.cos(a) * rr, y = m.y + Math.sin(a) * rr;
      this.fx.add({ k: 'smoke', x, y, vx: rand(-15, 15), vy: rand(-15, 15), life: rand(0.6, 1.1), s: m.r * rand(0.15, 0.3), grow: 1.5, c: '55,50,55', a: 0.45 });
      if (m.phase === 3 && Math.random() < 0.5) this.fx.add({ k: 'glow', x, y, vx: rand(-30, 30), vy: rand(-30, 30), life: rand(0.2, 0.4), s: rand(4, 9), c: '255,120,40', a: 1, drag: 1 });
    }
    if (!this.aiActive || !m.orbiting || m.warp > 0) return;

    this.bossPhases(m);
    // laser oblężniczy: ładowanie da się przerwać, zadając dość obrażeń
    if (m.beam) {
      m.beam.t -= dt;
      if (m.beam.taken >= m.beam.need) {
        m.beam = null;
        UI.callout('LASER PRZERWANY!', '120,240,255', true);
        this.fx.add({ k: 'ring', x: m.x, y: m.y, life: 0.5, r0: m.r * 0.5, r1: m.r * 2.5, s: 5, c: '120,240,255', a: 1 });
        Sound.shieldDown();
      } else if (m.beam.t <= 0) {
        const ang = Math.atan2(m.y, m.x);
        m.beam = null; m.beamFx = 0.4; m.beamAng = ang;
        this.strikePlanet(ang, Math.min(20 + this.wave * 1.1, this.shieldMax * 0.9 + 20), 'ship');
        Sound.nuke();
      }
      return;
    }
    if (m.salvoN > 0 && (m.salvoT -= dt) <= 0) {
      m.salvoN--; m.salvoT = 0.14;
      this.bossBolt(m, Math.atan2(-m.y, -m.x) + rand(-0.06, 0.06));
      Sound.alienShot();
    }
    if (m.streamT > 0) {
      m.streamT -= dt;
      if ((m.streamCd -= dt) <= 0) {
        m.streamCd = 0.11;
        this.bossBolt(m, Math.atan2(-m.y, -m.x) + Math.sin(m.age * 5) * 0.45, 1);
        Sound.alienShot();
      }
    }
    // pierwsze bossy (fale 1–7) strzelają rzadziej, później coraz szybciej; w szale o 40% szybciej
    const pace = this.diff.pace * (m.phase === 3 ? 0.6 : 1) * (1 + Math.max(0, 8 - this.wave) * 0.1) * (1 - Math.min(0.35, this.wave * 0.004));
    for (const ab of m.abil) {
      if ((ab.t -= dt) > 0) continue;
      ab.t = ab.p * pace;
      this.shipAbility(m, ab.id);
    }
  },

  // fazy: 66% – salwa i (od fali 5) dodatkowa zdolność, 33% – szał (szybciej, kolejna zdolność)
  bossPhases(m) {
    const f = m.hp / m.maxHp;
    const next = m.phase === 1 && f < 0.66 ? 2 : m.phase === 2 && f < 0.33 ? 3 : 0;
    if (!next) return;
    m.phase = next;
    let add = null;
    if (this.wave >= 5) {
      // tylko zdolności już odblokowane na tej fali
      const have = new Set(m.abil.map(a => a.id).concat('shield'));
      const extra = BOSS_ABILITIES.filter(a => a.from <= this.wave && !have.has(a.id));
      if (extra.length) { add = pick(extra); m.abil.push({ id: add.id, p: add.p, t: 1.5 }); }
    }
    const toP = Math.atan2(-m.y, -m.x), k = Math.min(9, 3 + Math.floor(this.wave / 8) * 2);
    for (let i = 0; i < k; i++) this.bossBolt(m, toP + (i - (k - 1) / 2) * 0.12);
    this.fx.add({ k: 'ring', x: m.x, y: m.y, life: 0.7, r0: m.r, r1: m.r * 3.2, s: 6, c: next === 3 ? '255,70,70' : m.spec.accent, a: 1 });
    this.shake += 6;
    UI.callout(next === 3 ? m.spec.name.toUpperCase() + ' WPADA W SZAŁ!' : 'FAZA 2' + (add ? ': ' + add.name.toUpperCase() : ''), next === 3 ? '255,90,90' : '255,200,120', true);
    Sound.boss();
  },

  // śmierć bossa: seria wybuchów na kadłubie, potem wielka eksplozja
  bossDying(m, dt) {
    m.dying -= dt;
    m.vx *= 0.96; m.vy *= 0.96;
    m.x += m.vx * dt; m.y += m.vy * dt;
    m.rot += dt * 0.6;
    m.flash = 0.05;
    if ((m.boomT = (m.boomT || 0) - dt) <= 0) {
      m.boomT = rand(0.07, 0.14);
      const a = rand(0, TAU), rr = m.r * rand(0, 0.85);
      this.explode(m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr, m.r * rand(0.25, 0.5), 'ship', 0.8);
      Sound.explode(1.2);
      this.shake += 2.5;
    }
    if (m.dying <= 0) { m.dying = 0; this.killMeteor(m); }
  },

  shipAbility(m, id) {
    const toP = Math.atan2(-m.y, -m.x), n = this.wave;
    switch (id) {
      case 'salvo': m.salvoN = (n < 5 ? 3 : 4) + Math.floor(n / 20); m.salvoT = 0; break;
      case 'fan': {
        const k = 5 + Math.floor(n / 15);
        for (let i = 0; i < k; i++) this.bossBolt(m, toP + (i - (k - 1) / 2) * 0.15);
        Sound.alienShot();
        break;
      }
      case 'drop': {
        const pool = ['rock'];
        if (n >= 3) pool.push('iron', 'comet');
        if (n >= 5) pool.push('volatile');
        if (n >= 9) pool.push('zig');
        if (n >= 15) pool.push('cluster');
        const k = 3 + Math.floor(n / 15), sp = this.baseSpeed * 0.9;
        for (let i = 0; i < k; i++) {
          const type = pick(pool), size = type === 'cluster' ? 2 : 1;
          const a = toP + rand(-0.4, 0.4);
          this.meteors.push(this.makeMeteor(type, size, m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r, Math.cos(a) * sp, Math.sin(a) * sp));
        }
        this.fx.add({ k: 'ring', x: m.x, y: m.y, life: 0.4, r0: m.r * 0.6, r1: m.r * 1.6, s: 4, c: m.spec.accent, a: 0.9 });
        break;
      }
      case 'fighters': {
        if (this.meteors.filter(o => o.type === 'hunter' && !o.dead).length >= Math.min(5, 2 + Math.floor(this.wave / 10))) break;
        for (let i = 0; i < 2; i++) {
          const a = m.rot + Math.PI / 2 * (i ? 1 : -1);
          const f = this.makeMeteor('hunter', 1, m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r, 0, 0, 0.7);
          f.pts = 80; f.cr = 6;
          this.meteors.push(f);
        }
        UI.callout('MYŚLIWCE!', '140,255,150');
        break;
      }
      case 'mines': {
        const sp = this.baseSpeed * 0.45;
        const half = 1 + Math.floor(n / 25);
        for (let i = -half; i <= half; i++) {
          const a = toP + i * 0.45;
          this.meteors.push(this.makeMeteor('mine', 0, m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r, Math.cos(a) * sp, Math.sin(a) * sp));
        }
        break;
      }
      case 'beam':
        m.beam = { t: 1.8, taken: 0, need: m.maxHp * 0.06 };
        UI.callout('LASER ŁADUJE SIĘ – PRZERWIJ GO OGNIEM!', '255,90,90', true);
        break;
      case 'stream': m.streamT = 2.2; m.streamCd = 0; break;
      case 'missiles': {
        const k = 2 + Math.floor(n / 20), sp = this.baseSpeed * 1.1;
        for (let i = 0; i < k; i++) {
          const side = i % 2 ? 1 : -1, a = m.rot + side * (Math.PI / 2 + rand(0, 0.5));
          const r = this.makeMeteor('missile', 0, m.x + Math.cos(a) * m.r, m.y + Math.sin(a) * m.r, Math.cos(a) * sp, Math.sin(a) * sp);
          r.rot = a;
          this.meteors.push(r);
        }
        Sound.rocket();
        break;
      }
      case 'escort': {
        if (this.meteors.filter(o => o.type === 'gunship' && !o.dead).length >= 4) break;
        for (let i = 0; i < 2; i++) {
          const a = m.rot + Math.PI / 2 * (i ? 1 : -1);
          const e = this.makeMeteor('gunship', 1, m.x + Math.cos(a) * m.r * 1.5, m.y + Math.sin(a) * m.r * 1.5, 0, 0);
          e.slot = Math.atan2(m.y, m.x) + (i ? 0.7 : -0.7);
          this.meteors.push(e);
        }
        UI.callout('ESKORTA!', '216,255,106');
        break;
      }
      case 'blink': {
        const orbitR = Math.hypot(m.x, m.y), a = Math.atan2(m.y, m.x) + (Math.random() < 0.5 ? -1 : 1) * rand(1.2, 2.4);
        this.fx.add({ k: 'ring', x: m.x, y: m.y, life: 0.4, r0: m.r * 1.5, r1: m.r * 0.2, s: 4, c: m.spec.accent, a: 1 });
        m.x = Math.cos(a) * orbitR; m.y = Math.sin(a) * orbitR; m.vx = m.vy = 0; m.home = a;
        m.rot = a + Math.PI;
        this.fx.add({ k: 'ring', x: m.x, y: m.y, life: 0.5, r0: m.r * 0.2, r1: m.r * 2, s: 5, c: m.spec.accent, a: 1 });
        Sound.emp();
        break;
      }
    }
  },

  /* ---------- efekty rysowane nad statkami ---------- */
  drawEnemyFx(ctx) {
    const sc = Math.max(this.scale, 0.7);
    for (const m of this.meteors) {
      if (m.type === 'gunship' && m.charge > 0) {
        // błysk przed strzałem kanonierki
        const a = Math.atan2(-m.y, -m.x), x = m.x + Math.cos(a) * m.r, y = m.y + Math.sin(a) * m.r;
        const gs = (6 + m.charge * 16) * sc;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 + 0.5 * m.charge;
        ctx.drawImage(SpriteCache.glow('216,255,106'), x - gs, y - gs, gs * 2, gs * 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      } else if (m.type === 'escort' && m.links) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#7fe9ff';
        ctx.lineWidth = 1.5 * sc;
        for (const l of m.links) {
          if (l.life <= 0 || l.o.dead) continue;
          ctx.globalAlpha = l.life / 0.6;
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(l.o.x, l.o.y); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  },
}));
