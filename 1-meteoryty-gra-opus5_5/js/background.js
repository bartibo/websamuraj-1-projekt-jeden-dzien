'use strict';
/* Tło: mgławice, Droga Mleczna, poświata Słońca, migoczące gwiazdy z paralaksą i spadające gwiazdy. */

class Background {
  static get LEVELS() { return 8; }

  resize(w, h) {
    this.w = w; this.h = h;
    const sc = 0.5;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * 1.1 * sc); c.height = Math.ceil(h * 1.1 * sc);
    const g = c.getContext('2d');
    const cw = c.width, ch = c.height, md = Math.max(cw, ch);
    const rng = mulberry32(77);

    const base = g.createLinearGradient(0, 0, cw, ch);
    base.addColorStop(0, '#060818'); base.addColorStop(0.5, '#02030a'); base.addColorStop(1, '#05040f');
    g.fillStyle = base; g.fillRect(0, 0, cw, ch);

    g.globalCompositeOperation = 'lighter';
    const cols = ['80,40,160', '20,80,170', '150,30,110', '20,120,150', '100,30,170', '30,60,140'];
    for (let i = 0; i < 10; i++) {
      const x = rng() * cw, y = rng() * ch, r = md * (0.15 + rng() * 0.4);
      const col = cols[i % cols.length];
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(${col},${0.08 + rng() * 0.1})`);
      grd.addColorStop(0.5, `rgba(${col},${0.03 + rng() * 0.04})`);
      grd.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = grd; g.fillRect(0, 0, cw, ch);
    }
    // Droga Mleczna
    g.save();
    g.translate(cw / 2, ch / 2); g.rotate(-0.45);
    const band = g.createLinearGradient(0, -md * 0.18, 0, md * 0.18);
    band.addColorStop(0, 'rgba(120,130,200,0)'); band.addColorStop(0.5, 'rgba(150,150,220,0.07)'); band.addColorStop(1, 'rgba(120,130,200,0)');
    g.fillStyle = band; g.fillRect(-md, -md * 0.18, md * 2, md * 0.36);
    const gauss = () => (rng() + rng() + rng() + rng() - 2) / 2;
    const bandStars = Math.round(cw * ch / 90);
    for (let i = 0; i < bandStars; i++) {
      g.fillStyle = `rgba(210,215,255,${rng() * 0.4})`;
      g.fillRect((rng() - 0.5) * md * 1.8, gauss() * md * 0.12, 1, 1);
    }
    g.restore();
    // Słońce poza kadrem, lewy górny róg (zgodnie z oświetleniem planety)
    const sun = g.createRadialGradient(-cw * 0.08, -ch * 0.12, 0, -cw * 0.08, -ch * 0.12, md * 0.75);
    sun.addColorStop(0, 'rgba(255,225,180,0.35)');
    sun.addColorStop(0.25, 'rgba(255,190,140,0.10)');
    sun.addColorStop(1, 'rgba(255,170,120,0)');
    g.fillStyle = sun; g.fillRect(0, 0, cw, ch);
    // Drobny pył gwiezdny
    const dust = Math.round(cw * ch / 140);
    for (let i = 0; i < dust; i++) {
      g.fillStyle = `rgba(255,255,255,${0.08 + rng() * 0.35})`;
      g.fillRect(rng() * cw, rng() * ch, 1, 1);
    }
    this.neb = c;

    // Gwiazdy pogrupowane po odcieniu; jasność kwantowana do LEVELS poziomów, żeby rysować kubełkami
    // (kilkadziesiąt zmian stanu canvasu na klatkę zamiast kilkuset)
    this.stars = [];
    const n = Math.round(w * h / 3200);
    this.tints = ['255,255,255', '200,220,255', '255,232,205', '180,200,255'];
    for (let i = 0; i < n; i++) {
      const big = Math.random() < 0.08;
      const ti = (Math.random() * this.tints.length) | 0;
      this.stars.push({
        x: Math.random() * w, y: Math.random() * h, z: rand(0.25, 1),
        s: big ? rand(1.5, 2.3) : rand(0.6, 1.3), big,
        ph: rand(0, TAU), sp: rand(0.6, 3), ti,
      });
    }
    this.stars.sort((a, b) => a.ti - b.ti);
    this.lvl = new Uint8Array(n); this.sx = new Float32Array(n); this.sy = new Float32Array(n);
    this.shooting = [];
    this.shootTimer = rand(2, 5);
  }

  draw(ctx, t, px, py, dt) {
    const w = this.w, h = this.h;
    ctx.drawImage(this.neb, -w * 0.05 - px * 0.4, -h * 0.05 - py * 0.4, w * 1.1, h * 1.1);

    const st = this.stars, n = st.length, L = Background.LEVELS, lvl = this.lvl, SX = this.sx, SY = this.sy;
    for (let i = 0; i < n; i++) {
      const s = st[i];
      let x = (s.x - px * s.z * 1.5) % w; if (x < 0) x += w;
      let y = (s.y - py * s.z * 1.5) % h; if (y < 0) y += h;
      const a = (0.55 + 0.45 * Math.sin(t * s.sp + s.ph)) * (0.4 + 0.6 * s.z);
      SX[i] = x; SY[i] = y;
      lvl[i] = Math.min(L - 1, (a * L) | 0);
    }
    for (let i0 = 0; i0 < n;) {
      const ti = st[i0].ti;
      let i1 = i0;
      while (i1 < n && st[i1].ti === ti) i1++;
      ctx.fillStyle = `rgb(${this.tints[ti]})`;
      for (let l = 0; l < L; l++) {
        ctx.globalAlpha = (l + 0.5) / L;
        for (let i = i0; i < i1; i++) if (lvl[i] === l) ctx.fillRect(SX[i], SY[i], st[i].s, st[i].s);
      }
      i0 = i1;
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const s = st[i];
      if (!s.big) continue;
      ctx.globalAlpha = (lvl[i] + 0.5) / L * 0.5;
      const gs = s.s * 5;
      ctx.drawImage(SpriteCache.glow(this.tints[s.ti]), SX[i] - gs + s.s / 2, SY[i] - gs + s.s / 2, gs * 2, gs * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Spadające gwiazdy w tle
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = rand(3, 8);
      const a = rand(0.3, 0.9) + (Math.random() < 0.5 ? 0 : Math.PI / 2);
      const sp = rand(600, 1000);
      this.shooting.push({ x: rand(0, w), y: rand(0, h * 0.6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.5, 0.9), age: 0 });
    }
    ctx.lineCap = 'round';
    for (let i = this.shooting.length - 1; i >= 0; i--) {
      const s = this.shooting[i];
      s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.age >= s.life) { this.shooting.splice(i, 1); continue; }
      const k = 1 - s.age / s.life;
      const grd = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.12, s.y - s.vy * 0.12);
      grd.addColorStop(0, `rgba(255,255,255,${0.7 * k})`);
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = grd; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.12, s.y - s.vy * 0.12); ctx.stroke();
    }
  }
}
