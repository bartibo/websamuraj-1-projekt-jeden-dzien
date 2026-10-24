'use strict';
/* Interfejs: parametry, prognoza, dane na żywo, raport szkód, podpowiedzi. */

const $ = id => document.getElementById(id);

const UI = {
  params: { M: 6.6, depth: 12, dist: 8, soil: 'stiff', sea: false },
  liveShown: false,
  reportPending: false,
  lastDom: 0,

  init() {
    // scenariusze
    const sc = $('scenarios');
    SCENARIOS.forEach((s, i) => {
      const b = document.createElement('button');
      b.innerHTML = `<b>${s.label}</b><small>${s.sub}</small>`;
      b.style.setProperty('--c', Seis.magClass(s.M).color);
      b.dataset.i = i;
      b.onclick = () => { this.apply(s); this.markScenario(i); $('historic').value = ''; $('histNote').hidden = true; Sound.click(); };
      sc.appendChild(b);
    });
    const hs = $('historic');
    const grp = (label) => { const g = document.createElement('optgroup'); g.label = label; hs.appendChild(g); return g; };
    const gReal = grp('Zarejestrowane'), gHypo = grp('Hipotetyczne');
    HISTORIC.forEach((h, i) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = h.hypo ? `${h.label} · M ${U.fmt(h.M, 1)}` : `${h.label} ${h.year} · M ${U.fmt(h.M, 1)}`;
      (h.hypo ? gHypo : gReal).appendChild(o);
    });
    hs.onchange = () => {
      const h = HISTORIC[hs.value];
      if (!h) { $('histNote').hidden = true; return; }
      this.apply(h);
      this.markScenario(-1);
      const n = $('histNote');
      n.hidden = false;
      n.innerHTML = `<b>${h.hypo ? h.label : h.label + ', ' + h.year}</b> · M ${U.fmt(h.M, 1)}<br>${h.note}<br><small style="color:var(--muted)">Parametry są dobrane w przybliżeniu dla naszego modelowego miasta.</small>`;
    };

    // suwaki
    const bind = (id, key, fmt) => {
      const el = $(id);
      el.addEventListener('input', () => {
        this.params[key] = parseFloat(el.value);
        this.markScenario(-1);
        this.refresh();
      });
      el.addEventListener('dblclick', () => {});
      return el;
    };
    bind('mag', 'M');
    bind('depth', 'depth');
    bind('dist', 'dist');
    $('wall').addEventListener('input', () => {
      Flood.setWall(parseFloat($('wall').value));
      this.refresh();
    });
    for (const b of document.querySelectorAll('#soilSeg button')) {
      b.onclick = () => { this.params.soil = b.dataset.soil; this.markScenario(-1); this.refresh(); Sound.click(); };
    }
    for (const b of document.querySelectorAll('#seaSeg button')) {
      b.onclick = () => { this.params.sea = b.dataset.sea === '1'; this.markScenario(-1); this.refresh(); Sound.click(); };
    }
    for (const b of document.querySelectorAll('#todSeg button')) b.onclick = () => { Main.setTOD(b.dataset.tod); Sound.click(); };
    for (const b of document.querySelectorAll('#viewSeg button')) b.onclick = () => { Main.view(+b.dataset.view); Sound.click(); };
    $('go').onclick = () => Main.trigger();
    $('rebuild').onclick = () => Main.rebuild();
    $('tSlow').onclick = () => Main.toggle('slow');
    $('tAuto').onclick = () => Main.toggle('auto');
    $('tShake').onclick = () => Main.toggle('shake');
    $('tSound').onclick = () => Main.toggle('sound');
    $('tAfter').onclick = () => Main.toggle('after');
    $('tHelp').onclick = () => this.help(true);
    $('helpClose').onclick = () => this.help(false);
    $('help').onclick = e => { if (e.target.id === 'help') this.help(false); };
    $('reportClose').onclick = () => { $('report').hidden = true; };
    $('panelToggle').onclick = () => { $('panel').classList.toggle('open'); $('info').classList.remove('open'); };
    $('infoToggle').onclick = () => { $('info').classList.toggle('open'); $('panel').classList.remove('open'); };

    // skala Mercallego na dole
    const bar = $('mmiBar');
    this.cells = [];
    for (let i = 1; i <= 12; i++) {
      const c = document.createElement('div');
      c.className = 'cell';
      c.textContent = U.roman(i);
      c.style.background = MMI[i].color;
      c.style.setProperty('--c', MMI[i].color);
      c.title = `${U.roman(i)} – ${MMI[i].name}`;
      bar.appendChild(c);
      this.cells.push(c);
    }
    this.apply(this.params);
    this.markScenario(3);
  },

  apply(p) {
    Object.assign(this.params, { M: p.M, depth: p.depth, dist: p.dist, soil: p.soil || 'stiff', sea: !!p.sea });
    $('mag').value = this.params.M;
    $('depth').value = this.params.depth;
    $('dist').value = this.params.dist;
    this.refresh();
  },

  markScenario(i) {
    document.querySelectorAll('#scenarios button').forEach((b, k) => b.classList.toggle('on', k === i));
  },

  refresh() {
    const p = this.params;
    const mc = Seis.magClass(p.M);
    document.documentElement.style.setProperty('--accent', mc.color);
    $('magVal').textContent = U.fmt(p.M, 1);
    $('magClass').textContent = mc.name;
    const hypo = p.M > Seis.M_RECORD;
    $('magHint').innerHTML = hypo
      ? '<b>Scenariusz hipotetyczny.</b> Silniejszego trzęsienia nigdy nie zarejestrowano. Rekord to Valdivia (Chile) 1960, M 9,5.'
      : 'Każdy stopień więcej to <b>10×</b> większe drgania i ok. <b>32×</b> więcej energii.';
    $('depthVal').textContent = `${p.depth} km`;
    $('distVal').textContent = `${p.dist} km`;
    const fill = (el, min, max) => {
      const t = (el.value - min) / (max - min) * 100;
      el.style.setProperty('--track', `linear-gradient(90deg, var(--accent) ${t}%, rgba(255,255,255,0.14) ${t}%)`);
    };
    fill($('depth'), 2, 100);
    fill($('dist'), 0, 160);
    fill($('wall'), 0, 15);
    const wallH = Flood.wallH || 0;
    $('wallVal').textContent = wallH > 0 ? `${wallH} m` : 'brak';
    document.querySelectorAll('#soilSeg button').forEach(b => b.classList.toggle('on', b.dataset.soil === p.soil));
    document.querySelectorAll('#seaSeg button').forEach(b => b.classList.toggle('on', (b.dataset.sea === '1') === p.sea));

    const f = Quake.forecast(p);
    this.fc = f;
    const I = Math.round(f.I);
    const m = MMI[U.clamp(I, 1, 12)];
    const box = $('fcMMI');
    box.style.setProperty('--mmi', m.color);
    box.querySelector('b').textContent = U.roman(I);
    box.querySelector('.mmi-name').textContent = m.name;
    $('fcText').textContent = m.text;
    $('fcPGA').innerHTML = `${U.fmt(f.pga, f.pga < 0.1 ? 3 : 2)} g<small>${U.fmt(f.pga * 9.81, 2)} m/s²</small>`;
    const tnt = f.energy / 4.184e9;
    const hiro = f.energy / 6.3e13;
    $('fcEnergy').innerHTML = `${this.tntText(tnt)}<small>${hiro >= 1 ? '≈ ' + U.fmtBig(hiro) + '× bomba z Hiroszimy' : '≈ ' + U.fmt(hiro * 100, hiro * 100 < 1 ? 3 : 1) + '% bomby z Hiroszimy'}</small>`;
    $('fcRupture').innerHTML = (f.rupture < 1 ? `≈ ${U.fmt(f.rupture * 1000, 0)} m` : `≈ ${U.fmt(f.rupture, f.rupture < 10 ? 1 : 0)} km`)
      + (f.rupture > 1600 ? '<small>dłuższe niż każde znane pęknięcie (Sumatra 2004: ok. 1500 km)</small>' : '');
    $('fcDur').textContent = f.durReal < 60 ? `≈ ${U.fmt(f.durReal, 0)} s` : `≈ ${U.fmt(f.durReal / 60, 1)} min`;
    $('fcWaves').innerHTML = `${U.fmt(f.tP, 1)} s / ${U.fmt(f.tS, 1)} s<small>na ostrzeżenie: ${U.fmt(f.tS - f.tP, 1)} s</small>`;
    const py = f.perYear;
    $('fcYear').innerHTML = hypo ? 'nigdy nie zarejestrowano<small>rekord: M 9,5 w 1960 r.</small>'
      : py >= 1 ? `≈ ${U.fmtBig(py)} razy w roku` : `raz na ≈ ${U.fmtBig(1 / py)} lat`;
    const row = $('fcTsuRow');
    if (p.sea) {
      row.hidden = false;
      row.classList.toggle('warn', f.tsunamiH > 0.3);
      const wallTxt = wallH > 0 ? (f.tsunamiH > wallH + World.G0 - 0.8 ? ` · falochron ${wallH} m: woda się przeleje` : ` · falochron ${wallH} m powinien wystarczyć`) : '';
      $('fcTsu').innerHTML = f.tsunamiH > 0.3
        ? `fala ≈ ${U.fmt(f.tsunamiH, 1)} m<small>dotrze po ≈ ${U.fmt(f.tsunamiMin, 0)} min, kilka fal${wallTxt}</small>`
        : (p.M >= 6.9 ? 'mało prawdopodobne<small>ognisko zbyt głęboko</small>' : 'brak<small>potrzeba M ≥ 7</small>');
    } else row.hidden = true;
    this.cells.forEach((c, i) => c.classList.toggle('fc', i + 1 === I));
  },

  tntText(t) {
    if (t < 1) return `≈ ${U.fmt(t * 1000, t * 1000 < 10 ? 1 : 0)} kg TNT`;
    if (t < 1000) return `≈ ${U.fmt(t, t < 10 ? 1 : 0)} t TNT`;
    if (t < 1e6) return `≈ ${U.fmt(t / 1000, t < 1e4 ? 1 : 0)} kt TNT`;
    if (t < 1e9) return `≈ ${U.fmt(t / 1e6, t < 1e7 ? 1 : 0)} Mt TNT`;
    return `≈ ${U.fmt(t / 1e9, 1)} Gt TNT`;
  },

  setToggle(id, on, label) {
    const b = $(id);
    b.classList.toggle('on', on);
    if (id === 'tAfter') { b.textContent = (on ? '✓ ' : '✕ ') + 'Wstrząsy wtórne'; b.classList.toggle('off', !on); }
    if (id === 'tSound') b.textContent = on ? '🔊' : '🔇';
    void label;
  },

  setTOD(k) {
    document.querySelectorAll('#todSeg button').forEach(b => b.classList.toggle('on', b.dataset.tod === k));
  },

  help(on) { $('help').hidden = !on; },

  toast(msg, kind) {
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.textContent = msg;
    const box = $('toasts');
    box.appendChild(t);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => t.classList.add('out'), 3600);
    setTimeout(() => t.remove(), 4200);
  },

  banner(text, sub, color) {
    const b = $('banner');
    b.hidden = false;
    b.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`;
    b.style.color = color || '#fff';
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
  },

  startLive(ev) {
    $('live').hidden = false;
    if (!ev || ev.kind !== 'after') $('report').hidden = true;
    this.liveShown = true;
    this.reportPending = true;
    this.quietT = 0;
    this.startStats = City.stats();
    $('fcTitle').textContent = 'Prognoza dla miasta';
    $('go').classList.add('shaking');
    void ev;
  },

  /* aktualizacja co klatkę (DOM odświeżany ~12 razy na sekundę) */
  update(dt, now) {
    const I = Quake.events.length ? Quake.nowI : 1;
    const Ir = Math.round(I);
    this.cells.forEach((c, i) => c.classList.toggle('lit', Quake.events.length > 0 && i + 1 <= Ir && I > 1.05));
    if (now - this.lastDom < 80) return;
    this.lastDom = now;
    const pga = Quake.events.length ? Seis.pgaG(I) * (I > 1.05 ? 1 : 0) : 0;
    $('seismoAmp').textContent = `PGA ${U.fmt(pga, 3)} g`;
    if (this.liveShown) {
      $('liveTime').textContent = `${U.fmt(Quake.time, 1)} s`;
      const ph = Quake.phaseLabel();
      $('livePhase').textContent = ph || 'Spokój';
      const li = $('liveI');
      li.textContent = U.roman(Ir);
      li.style.color = MMI[U.clamp(Ir, 1, 12)].color;
      $('livePGA').textContent = `${U.fmt(pga, 2)} g`;
      $('liveCol').textContent = City.buildings.filter(b => b.collapsed).length;
      // koniec – raport
      const calm = !Quake.shakingNow && !(Quake.tsunami && !Quake.tsunami.done);
      if (calm) {
        $('go').classList.remove('shaking');
        this.quietT += 0.08;
        const settling = City.buildings.some(b => b.mode === 'pancake' || b.mode === 'topple') ||
          FX.bodies.list.some(b => !b.sleep && b.opts.kind === 'seg' && (b.age || 0) < 12);
        if (this.quietT > 1.2 && !settling && this.reportPending) {
          this.reportPending = false;
          this.liveShown = false;
          $('live').hidden = true;
          this.showReport();
        }
      } else this.quietT = 0;
    }
  },

  showReport() {
    const st = City.stats();
    const p = Quake.lastParams || this.params;
    const peak = Main.peakI;
    const Ip = Math.round(peak);
    $('report').hidden = false;
    $('info').classList.add('open');
    $('repTitle').innerHTML = `M ${U.fmt(p.M, 1)} · maks. intensywność <span style="color:${MMI[Ip].color}">${U.roman(Ip)}</span>`;
    const seg = (n, col) => `<i style="width:${(n / st.total * 100).toFixed(2)}%;background:${col}"></i>`;
    $('repBar').innerHTML = seg(st.ok, '#6ee7a0') + seg(st.light, '#ffd23f') + seg(st.heavy, '#ff9330') + seg(st.collapsed, '#ff4b4b');
    const order = ['masonry', 'belfry', 'house', 'panel', 'office', 'tower'];
    let rows = '';
    for (const k of order) {
      const t = st.byType[k];
      if (!t) continue;
      const s = (n, col) => `<i style="width:${(n / t.total * 100).toFixed(1)}%;background:${col}"></i>`;
      rows += `<tr><td>${BTYPES[k].short[0].toUpperCase() + BTYPES[k].short.slice(1)} <small style="color:var(--muted)">×${t.total}</small></td>`
        + `<td><div class="mini">${s(t.ok, '#6ee7a0')}${s(t.light, '#ffd23f')}${s(t.heavy, '#ff9330')}${s(t.collapsed, '#ff4b4b')}</div></td></tr>`;
    }
    $('repTable').innerHTML = rows;
    const ex = [];
    ex.push(['Budynki zawalone', `${st.collapsed} z ${st.total}`]);
    ex.push(['Poważnie uszkodzone', st.heavy]);
    if (st.treesDown) ex.push(['Przewrócone drzewa', st.treesDown]);
    if (st.lampsDown) ex.push(['Przewrócone latarnie', st.lampsDown]);
    ex.push(['Zasilanie', City.blackout ? 'awaria sieci' : 'działa']);
    if (FX.fires.length) ex.push(['Pożary', FX.fires.length]);
    if (FX.cracks.list.length) ex.push(['Szczeliny w gruncie', FX.cracks.list.length]);
    if (Main.lastTsunami) {
      const fs = Flood.stats;
      ex.push(['Tsunami – woda w mieście', fs.maxDepthCity > 0.05 ? `do ${U.fmt(fs.maxDepthCity, 1)} m` : 'nie dotarła']);
      if (fs.inland > 5) ex.push(['Zasięg zalewu', `${U.fmt(fs.inland, 0)} m od brzegu`]);
      if (fs.maxSpeed > 0.5) ex.push(['Najszybszy nurt w mieście', `${U.fmt(fs.maxSpeed, 1)} m/s (${U.fmt(fs.maxSpeed * 3.6, 0)} km/h)`]);
      ex.push(['Fale tsunami', Main.lastTsunami.crests.length]);
      if (Flood.wallH > 0) ex.push([`Falochron ${Flood.wallH} m`, fs.breached ? `przerwany w ${fs.breached} miejscach` : fs.overtopped ? 'woda się przelała' : 'zatrzymał wodę']);
      const wb = City.buildings.filter(b => b.byWater).length;
      if (wb) ex.push(['Budynki zniszczone przez wodę', wb]);
      const boats = Debris.stranded();
      if (boats) ex.push(['Łodzie wyrzucone na ląd', boats]);
    }
    if (st.carsMoved) ex.push(['Auta porwane przez wodę', st.carsMoved]);
    $('repExtra').innerHTML = ex.map(([a, b]) => `<li>${a}<b>${b}</b></li>`).join('');
    $('repComment').textContent = this.comment(st, peak);
    Main.lastTsunami = null;
  },

  comment(st, I) {
    const bt = st.byType;
    const ts = Main.lastTsunami, fs = Flood.stats;
    if (ts) {
      const byWater = City.buildings.filter(b => b.byWater).length;
      if (Flood.wallH > 0 && !fs.overtopped && fs.maxDepthCity < 0.3)
        return `Falochron o wysokości ${Flood.wallH} m zatrzymał tsunami – miasto ucierpiało tylko od wstrząsu. Tak w 2011 r. ochroniła się japońska wioska Fudai za wałem wysokim na 15,5 m.`;
      if (Flood.wallH > 0 && fs.overtopped)
        return `Woda przelała się przez ${Flood.wallH}-metrowy falochron${fs.breached ? ' i przerwała go' : ''}. Tak było w Japonii w 2011 r.: wiele falochronów okazało się za niskich na falę, która przyszła.`;
      if (byWater > 0)
        return `Najwięcej szkód zrobiła woda, nie wstrząs. Tsunami wdarło się ${U.fmt(fs.inland, 0)} m w głąb lądu: porwało lekkie domy, zburzyło kamienice, a auta i łodzie zostawiło na ulicach. Żelbetowe bloki w większości przetrwały.`;
      if (fs.maxDepthCity > 0.3)
        return 'Tsunami zalało nadbrzeżne ulice i porwało auta, ale budynki wytrzymały napór wody. Nawet pół metra płynącej wody przewraca człowieka.';
    }
    const masCol = bt.masonry ? bt.masonry.collapsed : 0;
    const towerOk = bt.tower && bt.tower.collapsed === 0;
    if (I < 2) return 'Wstrząs zarejestrowały tylko sejsmografy. Takich mikrowstrząsów na świecie jest wiele tysięcy dziennie.';
    if (I < 4) return 'Część mieszkańców poczuła lekkie drżenie, a lampy się zakołysały. Nic się nie stało.';
    if (st.light + st.heavy + st.collapsed === 0) return 'Wszyscy poczuli wstrząs, ale budynki przetrwały bez szkód. Gdzieniegdzie pękły szyby i spadły przedmioty z półek.';
    if (st.collapsed === 0) return 'Pojawiły się pęknięcia, odpadł tynk i spadły kominy, ale żaden budynek się nie zawalił. Najbardziej ucierpiały stare kamienice.';
    if (towerOk && masCol > 0) return 'Kamienice z niezbrojonej cegły zawaliły się pierwsze. Wieżowiec z tłumikiem masowym mocno się kołysał, ale przetrwał. Tak działa nowoczesne budownictwo antysejsmiczne.';
    if (st.collapsed > st.total * 0.6) return 'Katastrofa: większość miasta leży w gruzach. Przy takich wstrząsach przetrwać mogą tylko konstrukcje projektowane na ekstremalne obciążenia.';
    return 'Poważne zniszczenia. Najwięcej zawaleń jest wśród budynków murowanych i prefabrykowanych, a ocalałe konstrukcje wymagają ekspertyz.';
  },

  /* podpowiedź po najechaniu na budynek */
  tooltip(b, x, y) {
    const t = $('tooltip');
    if (!b) { t.hidden = true; return; }
    const s = b.stateText();
    const res = Math.round(b.Icol);
    t.hidden = false;
    t.innerHTML = `<b>${b.name}</b><small>${b.floors} ${b.floors === 1 ? 'kondygnacja' : b.floors < 5 ? 'kondygnacje' : 'kondygnacji'} · ${U.fmt(b.H, 0)} m · okres drgań ${U.fmt(2 * Math.PI / b.omega, 2)} s</small>`
      + `<span class="st" style="color:${s.c}">● ${s.t}</span>`
      + `<small>${b.T.desc}</small><small style="margin-top:4px">Zawali się przy intensywności ok. <b style="color:${MMI[U.clamp(res, 1, 12)].color}">${U.roman(res)}</b></small>`;
    const w = t.offsetWidth, h = t.offsetHeight;
    let px = x + 16, py = y + 16;
    if (px + w > window.innerWidth - 8) px = x - w - 12;
    if (py + h > window.innerHeight - 8) py = y - h - 12;
    t.style.left = px + 'px';
    t.style.top = py + 'px';
  }
};
