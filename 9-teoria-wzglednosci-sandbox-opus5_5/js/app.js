/* =====================================================================
   Gumowy czas – aplikacja: stan, suwaki, zegary, objaśnienia, zadania,
   pętla animacji.
   ===================================================================== */
'use strict';
(function (R) {
  const P = R.phys, F = R.fmt, K = R.content;
  const $ = s => document.querySelector(s);
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* tryb prywatny */ } }
  };
  const COL = { obs: '#5ee3ff', ship: '#ffb84d', grav: '#b98cff', surf: '#7ee08a' };
  const RE = 6.371e6;

  /* -------------------------------- stan -------------------------------- */
  const S = {
    mode: 'speed', view: 'side', paused: false, ts: 1, pulses: true, sound: LS.get('gc-sound') !== '0',
    speedX: P.sliderFromSpeed(0.8),
    massT: 1, hU: 0,
    b: { massT: 1, hU: P.sliderFromH(20200e3 / RE), orbit: true, speedX: 0 },
    flags: { sun: false, wd: false },
    done: {}
  };
  try { S.done = JSON.parse(LS.get('gc-zadania') || '{}') || {}; } catch (e) { S.done = {}; }
  K.bindState(S);
  R.audio.on = S.sound;

  const clocks = {
    speed: [
      new R.Clock({ name: 'Twój zegar', sub: 'nieruchomy obserwator', color: COL.obs, sound: 'a' }),
      new R.Clock({ name: 'Zegar na statku', color: COL.ship, sound: 'b' })
    ],
    gravity: [
      new R.Clock({ name: 'Twój zegar (A)', sub: 'daleko od źródła grawitacji', color: COL.obs, sound: 'a' }),
      new R.Clock({ name: 'Zegar B', color: COL.grav, tint: true, sound: 'c' })
    ],
    both: [
      new R.Clock({ name: 'Twój zegar (A)', sub: 'daleko i nieruchomo', color: COL.obs, sound: 'a' }),
      new R.Clock({ name: 'Na powierzchni', sub: 'stoi na gruncie', color: COL.surf, sound: 'c' }),
      new R.Clock({ name: 'Na statku', color: COL.ship, sound: 'b' })
    ]
  };
  const T = { speed: 0, gravity: 0, both: 0 };

  /* ----------------------------- wyliczenia ----------------------------- */
  function derive() {
    const d = {};
    d.sp = P.speedFromSlider(S.speedX);
    d.body = P.bodyAt(S.massT);
    d.h = P.hFromSlider(S.hU);
    d.gB = P.gravAt(d.body, d.h);
    d.bb = P.bodyAt(S.b.massT);
    d.hb = P.hFromSlider(S.b.hU);
    d.gS = P.gravAt(d.bb, d.hb);
    d.gSurf = P.gravAt(d.bb, 0);
    d.orbit = P.orbitAt(d.bb, d.hb);
    d.spB = S.b.orbit ? (d.orbit.possible ? d.orbit.sp : P.speedState(0, 1)) : P.speedFromSlider(S.b.speedX);
    d.tot = P.combine(d.gS, d.spB);
    d.vsSurf = d.bb.bh ? 0 : (d.gSurf.delta - d.tot.delta) / (1 - d.gSurf.delta); // >0: statek szybciej
    return d;
  }
  function clockRates(d) {
    if (S.mode === 'speed') return [[1, 0], [d.sp.rate, d.sp.delta]];
    if (S.mode === 'gravity') return [[1, 0], [d.gB.rate, d.gB.delta]];
    return [[1, 0], d.bb.bh ? [0, 1] : [d.gSurf.rate, d.gSurf.delta], [d.tot.rate, d.tot.delta]];
  }

  /* ------------------------------ pomocnicze ------------------------------ */
  const bodyName = b => b.exact ? b.near.name : b.bh ? 'Czarna dziura' : 'Obiekt pośredni: ' + b.from.short + ' → ' + b.to.short;
  function whereText(b, h, short) {
    const hm = h * b.R;
    if (hm < 1 || h < 1e-8) return (b.bh ? 'tuż nad horyzontem' : 'na samej powierzchni') + (short || !b.bh || hm < 1e-3 ? '' : ' (' + F.len(hm) + ')');
    return F.len(hm) + ' nad ' + (b.bh ? 'horyzontem' : 'powierzchnią');
  }
  function fmtGamma(sp) {
    if (sp.beta === 0) return '1';
    if (sp.delta < 1e-6) return '1 + ' + F.sci(sp.delta / sp.rate, 2);
    if (sp.gamma < 10) return F.num(sp.gamma, 4);
    if (sp.gamma < 1000) return F.num(sp.gamma, 1);
    return F.num(sp.gamma, 0);
  }
  const perDay = delta => F.dur(delta * P.DAY);
  function lenCompare(m) {
    if (m < 1e-15) return 'mniej niż rozmiar jądra atomu';
    if (m < 1e-10) return 'mniej niż średnica atomu';
    if (m < 1e-6) return 'to rozmiar cząsteczek i wirusów';
    if (m < 1e-4) return 'cieniej niż włos';
    if (m < 1e-2) return 'mniej więcej ziarenko piasku';
    return 'widać to gołym okiem';
  }
  function setRange(el, v) {
    el.value = v;
    const min = +el.min, max = +el.max;
    el.style.setProperty('--p', ((v - min) / (max - min) * 100).toFixed(2) + '%');
  }
  let dirty = true;
  const markDirty = () => { dirty = true; };

  function bindRange(el, onInput) {
    el.addEventListener('input', () => { const v = parseFloat(el.value); el.style.setProperty('--p', ((v - el.min) / (el.max - el.min) * 100).toFixed(2) + '%'); onInput(v); markDirty(); });
    el.addEventListener('keydown', e => {
      const keys = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 8, PageDown: -8 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      const min = +el.min, max = +el.max;
      const v = P.clamp(parseFloat(el.value) + (max - min) * (e.shiftKey ? 0.03 : 0.004) * keys[e.key], min, max);
      setRange(el, v); onInput(v); markDirty();
    });
  }

  /* ------------------------------ kontrolki ------------------------------ */
  const el = {
    spSlider: $('#sp-slider'), grMass: $('#gr-mass-slider'), grH: $('#gr-h-slider'),
    bMass: $('#b-mass-slider'), bH: $('#b-h-slider'), bSpeed: $('#b-speed-slider'), bOrbit: $('#b-orbit')
  };
  bindRange(el.spSlider, v => { S.speedX = v; });
  bindRange(el.grMass, v => { S.massT = v; });
  bindRange(el.grH, v => { S.hU = v; });
  bindRange(el.bMass, v => { S.b.massT = v; });
  bindRange(el.bH, v => { S.b.hU = v; });
  bindRange(el.bSpeed, v => { S.b.speedX = v; });
  el.bOrbit.addEventListener('change', () => {
    S.b.orbit = el.bOrbit.checked;
    if (!S.b.orbit) { const d = derive(); S.b.speedX = P.sliderFromSpeed(d.orbit.possible ? d.orbit.sp.beta : 0); }
    syncControls(); markDirty();
  });
  $('#gr-pulses').addEventListener('change', e => { S.pulses = e.target.checked; sheet.resetPulses(); });

  function chip(parent, label, title, onClick) {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.innerHTML = label;
    if (title) b.title = title;
    // gotowe ustawienie = nowy pomiar: zegary startują od zera, żeby różnica dotyczyła tylko tego ustawienia
    b.addEventListener('click', () => { onClick(); syncControls(); syncNow(); });
    parent.appendChild(b);
    return b;
  }
  const chipsSpeed = K.SPEED_PRESETS.map(p => {
    const b = chip($('#sp-presets'), p.label, p.title, () => { S.speedX = P.sliderFromSpeed(p.beta !== undefined ? p.beta : 1 - p.omb, p.omb); });
    b._x = P.sliderFromSpeed(p.beta !== undefined ? p.beta : 1 - p.omb, p.omb);
    return b;
  });
  K.SPEED_SCALE.forEach(s => {
    const x = P.sliderFromSpeed(s.beta !== undefined ? s.beta : 1 - s.omb, s.omb);
    const sp = document.createElement('span');
    sp.textContent = s.label; sp.style.left = (x * 100).toFixed(2) + '%';
    $('#sp-scale').appendChild(sp);
  });
  const chipsBody = P.BODIES.map((b, i) => {
    const c = chip($('#gr-presets'), '<span class="ico">' + K.BODY_ICONS[b.id] + '</span>' + b.short, b.name, () => { S.massT = i; });
    c._id = b.id; return c;
  });
  const chipsH = K.HEIGHT_PRESETS.map(p => {
    const c = chip($('#gr-h-presets'), p.label, p.title || '', () => { S.hU = P.sliderFromH(p.h); });
    c._u = P.sliderFromH(p.h); return c;
  });
  const chipsBodyB = P.BODIES.map((b, i) => {
    const c = chip($('#b-presets'), '<span class="ico">' + K.BODY_ICONS[b.id] + '</span>' + b.short, b.name, () => { S.b.massT = i; });
    c._id = b.id; return c;
  });
  const chipsScen = K.SCENARIOS.map(sc => {
    const c = chip($('#b-scen'), sc.label, sc.title || '', () => {
      S.b.massT = P.sliderOfBody(sc.body);
      S.b.hU = P.sliderFromH(sc.h);
      S.b.orbit = sc.orbit;
      if (sc.beta !== undefined) S.b.speedX = P.sliderFromSpeed(sc.beta);
      syncNow('both');
      toast('Scenariusz: ' + sc.label.replace(/^\S+\s/, '') + '. Zegary wystartowały od nowa.');
    });
    c._sc = sc; return c;
  });

  function syncControls() {
    setRange(el.spSlider, S.speedX);
    setRange(el.grMass, S.massT);
    setRange(el.grH, S.hU);
    setRange(el.bMass, S.b.massT);
    setRange(el.bH, S.b.hU);
    setRange(el.bSpeed, S.b.speedX);
    el.bOrbit.checked = S.b.orbit;
    el.bSpeed.disabled = S.b.orbit;
    $('#b-speed-wrap').classList.toggle('disabled', S.b.orbit);
  }

  /* -------------------------------- tryby -------------------------------- */
  function setMode(m) {
    S.mode = m;
    document.querySelectorAll('.tab').forEach(t => { const on = t.dataset.mode === m; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); });
    ['speed', 'gravity', 'both'].forEach(k => { $('#controls-' + k).hidden = k !== m; });
    $('#view-switch').hidden = m !== 'speed';
    $('#stage-hint').hidden = m === 'speed';
    document.body.dataset.mode = m;
    mountClocks();
    $('#explain-why').innerHTML = K.WHY[m];
    renderTasks();
    markDirty();
  }
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    setMode(t.dataset.mode);
    // na telefonie scena bywa daleko nad kontrolkami
    const r = $('#stage').getBoundingClientRect();
    if (r.bottom < 80 || r.top > window.innerHeight) $('#stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));

  function mountClocks() {
    const row = $('#clock-row');
    row.innerHTML = '';
    clocks[S.mode].forEach(c => c.mount(row));
    row.dataset.n = clocks[S.mode].length;
  }

  function syncNow(mode) {
    mode = mode || S.mode;
    T[mode] = 0;
    clocks[mode].forEach(c => c.reset());
    if (mode === 'speed') speed.reset();
    sheet.resetPulses();
    markDirty();
  }
  $('#btn-sync').addEventListener('click', () => { syncNow(); toast('Zegary zsynchronizowane: wszystkie startują od zera.'); });

  // widok z boku / z kokpitu
  document.querySelectorAll('#view-switch button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  function setView(v) {
    S.view = v;
    document.querySelectorAll('#view-switch button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
    markDirty();
  }

  // tempo pokazu, pauza, dźwięk
  $('#timescale').addEventListener('change', e => { S.ts = +e.target.value; markDirty(); });
  function setPaused(p) {
    S.paused = p;
    $('#btn-pause').innerHTML = p
      ? '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor"/></svg>';
    $('#btn-pause').classList.toggle('on', p);
    $('#paused-badge').hidden = !p;
  }
  $('#btn-pause').addEventListener('click', () => setPaused(!S.paused));
  function setSound(on, quiet) {
    S.sound = on; R.audio.on = on; LS.set('gc-sound', on ? '1' : '0');
    $('#btn-sound').classList.toggle('off', !on);
    if (on && !quiet) R.audio.init();
  }
  $('#btn-sound').addEventListener('click', () => setSound(!S.sound));

  /* ------------------------------ scena ------------------------------ */
  const cv = $('#scene'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  function resize() {
    const r = $('#stage').getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    markDirty();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe($('#stage'));
  window.addEventListener('resize', resize);
  resize();

  const speed = R.SpeedScene();
  const sheet = R.SheetScene();

  // kamera płachty: przeciąganie i kółko
  let dragging = null;
  cv.addEventListener('pointerdown', e => {
    if (S.mode === 'speed') return;
    dragging = { x: e.clientX, y: e.clientY };
    cv.setPointerCapture(e.pointerId);
    cv.classList.add('grabbing');
  });
  cv.addEventListener('pointermove', e => {
    if (!dragging) return;
    sheet.drag(e.clientX - dragging.x, e.clientY - dragging.y);
    dragging = { x: e.clientX, y: e.clientY };
  });
  const endDrag = () => { dragging = null; cv.classList.remove('grabbing'); };
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('wheel', e => { if (S.mode === 'speed') return; e.preventDefault(); sheet.zoom(e.deltaY); }, { passive: false });
  cv.addEventListener('dblclick', () => { if (S.mode !== 'speed') sheet.resetView(); });

  /* ------------------------------ teksty ------------------------------ */
  function setHTML(node, html) { if (node._h !== html) { node.innerHTML = html; node._h = html; } }

  function updateReadouts(d) {
    // prędkość
    $('#sp-pct').textContent = F.pct(d.sp);
    $('#sp-abs').textContent = d.sp.beta === 0 ? 'statek stoi' : F.speed(d.sp) + ' · gamma γ = ' + fmtGamma(d.sp);
    chipsSpeed.forEach(c => c.classList.toggle('on', Math.abs(c._x - S.speedX) < 1e-4));
    setHTML($('#sp-tiles'), tiles([
      ['Długość statku dla ciebie', F.len(100 * d.sp.rate), 'zamiast 100 m'],
      ['1 godzina u ciebie', F.dur(3600 * d.sp.rate), 'mija na statku'],
      ['Zegar statku idzie', F.slower(d.sp.rate), 'niż twój']
    ]));
    // grawitacja
    const b = d.body;
    $('#gr-name').innerHTML = '<span class="ico">' + K.BODY_ICONS[b.exact ? b.near.id : b.kind === 'bh' ? 'bh' : b.near.id] + '</span>' + bodyName(b);
    $('#gr-mass').textContent = F.mass(b.M) + ' · ' + (b.bh ? 'promień horyzontu ' : 'promień ') + F.len(b.R);
    $('#gr-h').textContent = whereText(b, d.h);
    chipsBody.forEach(c => c.classList.toggle('on', b.exact && b.near.id === c._id));
    chipsH.forEach(c => c.classList.toggle('on', Math.abs(c._u - S.hU) < 1e-4));
    chipsH[0].textContent = b.bh ? 'tuż nad horyzontem' : 'na powierzchni';
    setHTML($('#gr-tiles'), tiles([
      ['Tempo zegara B', F.rate(d.gB.rate, d.gB.delta), F.slower(d.gB.rate)],
      ['Spóźnienie na dobę', perDay(d.gB.delta), 'względem ciebie'],
      [b.bh ? 'Promień horyzontu' : 'Czarna dziura z tej masy', F.len(b.rs), b.bh ? 'promień Schwarzschilda' : 'miałaby taki promień']
    ]));
    // razem
    const bb = d.bb;
    $('#b-name').textContent = bodyName(bb);
    $('#b-h').textContent = whereText(bb, d.hb, true);
    $('#b-speed').textContent = d.spB.beta === 0 ? 'stoi' : F.speed(d.spB) + ' (' + F.pct(d.spB) + ' c)';
    chipsBodyB.forEach(c => c.classList.toggle('on', bb.exact && bb.near.id === c._id));
    chipsScen.forEach(c => {
      const sc = c._sc;
      c.classList.toggle('on', Math.abs(P.sliderOfBody(sc.body) - S.b.massT) < 1e-4 && Math.abs(P.sliderFromH(sc.h) - S.b.hU) < 1e-4 && sc.orbit === S.b.orbit);
    });
    const t3 = [
      ['Grawitacja spowalnia o', perDay(d.gS.delta), 'na dobę'],
      ['Prędkość spowalnia o', d.spB.beta === 0 ? '0 s' : perDay(d.spB.delta), 'na dobę']
    ];
    if (!bb.bh) t3.push(['Względem powierzchni', (d.vsSurf >= 0 ? '+' : '−') + perDay(Math.abs(d.vsSurf)), d.vsSurf >= 0 ? 'na dobę: śpieszy się' : 'na dobę: spóźnia się']);
    else t3.push(['Tempo zegara statku', F.rate(d.tot.rate, d.tot.delta), F.slower(d.tot.rate)]);
    setHTML($('#b-tiles'), tiles(t3));
  }
  function tiles(list) {
    return list.map(([k, v, s]) => '<div class="tile"><span>' + k + '</span><b>' + v + '</b><small>' + (s || '') + '</small></div>').join('');
  }

  function updateHud(d) {
    let h = '';
    if (S.mode === 'speed') {
      h = '<div class="hud-big">' + F.pct(d.sp) + ' <small>prędkości światła</small></div>' +
          '<div>' + (d.sp.beta === 0 ? 'statek stoi' : F.speed(d.sp)) + '</div>' +
          '<div>γ = ' + fmtGamma(d.sp) + '</div>';
      if (S.view === 'cockpit') h += '<div class="hud-note">Widok z kokpitu: 240° nieba w jednym kole</div>';
    } else if (S.mode === 'gravity') {
      h = '<div class="hud-big">' + bodyName(d.body) + '</div>' +
          '<div>' + F.mass(d.body.M) + '</div>' +
          '<div>zegar B: ' + whereText(d.body, d.h) + '</div>';
    } else {
      h = '<div class="hud-big">' + bodyName(d.bb) + '</div>' +
          '<div>statek: ' + whereText(d.bb, d.hb, true) + '</div>' +
          '<div>' + (d.spB.beta === 0 ? 'wisi na silnikach' : F.speed(d.spB) + ' · ' + F.pct(d.spB) + ' c') + '</div>';
    }
    setHTML($('#hud'), h);
    let lg;
    if (S.mode === 'speed') {
      lg = S.view === 'side'
        ? '<span><i class="sw zig"></i>droga błysku widziana przez ciebie</span><span><i class="sw dash"></i>statek w spoczynku (100 m)</span>'
        : '<span><i class="sw doppler"></i>przed dziobem światło niebieskie, za plecami czerwone</span>';
    } else {
      lg = '<span><i class="sw heat"></i>czas płynie: normalnie → wolniej</span>' +
           (S.mode === 'gravity' ? '<span><i class="sw pulse"></i>błyski: co sekundę zegara B</span>' : '<span><i class="sw orbit"></i>orbita statku</span>');
    }
    setHTML($('#legend'), lg);
  }

  function updateClockTexts(d) {
    const cl = clocks[S.mode];
    cl.forEach(c => c.updateText(T[S.mode], S.ts));
    let diff = '';
    if (S.mode === 'speed') {
      cl[1].setSub(d.sp.beta === 0 ? 'statek stoi' : 'leci z prędkością ' + F.pct(d.sp) + ' c');
      diff = d.sp.beta === 0 && cl[1].lag === 0
        ? 'Statek stoi, więc oba zegary idą równo. Przesuń suwak prędkości.'
        : 'Zegar statku spóźnia się o <b>' + F.dur(cl[1].lag) + '</b> względem twojego <span>(' + perDay(d.sp.delta) + ' na każdą dobę)</span>';
    } else if (S.mode === 'gravity') {
      cl[1].setSub(whereText(d.body, d.h, true) + ' · ' + (d.body.exact ? d.body.near.short : bodyName(d.body)));
      diff = 'Zegar B spóźnia się o <b>' + F.dur(cl[1].lag) + '</b> względem twojego <span>(' + perDay(d.gB.delta) + ' na każdą dobę)</span>';
    } else {
      cl[1].el.hidden = d.bb.bh;
      cl[2].setSub(d.spB.beta === 0 ? 'wisi: ' + whereText(d.bb, d.hb, true) : 'orbita: ' + whereText(d.bb, d.hb, true));
      diff = 'Statek spóźnia się o <b>' + F.dur(cl[2].lag) + '</b> względem ciebie';
      if (!d.bb.bh) {
        const ahead = cl[1].lag - cl[2].lag;
        diff += ' · względem zegara na powierzchni <b class="' + (ahead >= 0 ? 'plus' : 'minus') + '">' + (ahead >= 0 ? 'śpieszy się' : 'spóźnia się') + ' o ' + F.dur(Math.abs(ahead)) + '</b>';
      }
    }
    setHTML($('#clock-diff'), diff);
    const t = T[S.mode];
    $('#clocks-since').textContent = t < 0.5 ? 'wystartowały razem przed chwilą' : 'wystartowały razem ' + F.dur(t) + ' temu (według twojego zegara)';
  }

  /* ---------------------------- objaśnienia ---------------------------- */
  function explainSpeed(d) {
    const sp = d.sp;
    let h = '';
    if (sp.beta === 0) {
      h += '<p>Statek <b>stoi</b>. Jego zegar idzie dokładnie tak jak twój, a statek ma pełne 100 m długości. Przesuń suwak prędkości w prawo.</p>';
    } else if (sp.beta < 1e-3) {
      h += '<p>Statek leci z prędkością <b>' + F.speed(sp) + '</b>. Dla nas to szybko, ale to zaledwie <b>' + F.pct(sp) + '</b> prędkości światła. Efekty względności są, ale maleńkie:</p><ul>' +
        '<li><b>Czas:</b> zegar statku spóźnia się o <b>' + perDay(sp.delta) + '</b> na dobę. Na jedną sekundę różnicy trzeba by czekać <b>' + F.dur(1 / sp.delta) + '</b>.</li>' +
        '<li><b>Długość:</b> statek jest krótszy o <b>' + F.len(100 * sp.delta) + '</b>, ' + lenCompare(100 * sp.delta) + '.</li></ul>';
    } else {
      h += '<p>Statek leci z prędkością <b>' + F.pct(sp) + '</b> prędkości światła (' + F.speed(sp) + ').</p><ul>' +
        '<li><b>Dylatacja czasu:</b> gdy u ciebie mija <b>1 godzina</b>, na statku mija <b>' + F.dur(3600 * sp.rate) + '</b>. Zegar statku idzie ' + F.slower(sp.rate) + '.</li>' +
        '<li><b>Skrócenie Lorentza:</b> statek ma 100 m, ale ty mierzysz <b>' + F.len(100 * sp.rate) + '</b>. Spłaszcza się tylko w kierunku lotu, wysokość zostaje ta sama.</li></ul>';
    }
    if (sp.beta > 0) {
      const yE = P.PROXIMA_LY / sp.beta, yS = yE * sp.rate;
      h += '<p class="trip">🚀 Lot do Proximy Centauri (4,24 roku świetlnego): na Ziemi minie <b>' + F.years(yE) + '</b>, a załoga postarzeje się o <b>' + F.dur(yS * P.YEAR) + '</b>.</p>';
    }
    if (sp.beta > 0.3) h += '<p class="aside">Załoga nic dziwnego nie czuje: ich zegary tykają zwyczajnie, a statek ma 100 m. Za to dla nich to <i>ty</i> jesteś spłaszczony, a <i>twój</i> zegar idzie wolniej. Obie strony mają rację – na tym polega względność.</p>';
    if (sp.beta >= 0.9999) h += '<p class="aside">Bliżej już się prawie nie da. Każda kolejna „dziewiątka” po przecinku wymaga ogromnie więcej energii, a samej prędkości światła nie osiągnie nic, co ma masę.</p>';
    return h;
  }
  function explainGravity(d) {
    const b = d.body, g = d.gB;
    let h = '<p><b>' + bodyName(b) + '</b>: ' + F.mass(b.M) + ', ' + (b.bh ? 'promień horyzontu ' : 'promień ') + F.len(b.R) + '. ' +
      (b.exact ? b.near.blurb : 'Obiekt pośredni: suwak płynnie zmienia masę i rozmiar między prawdziwymi ciałami.') + '</p>';
    if (b.impossible) h += '<p class="warn">⚠️ Tak ściśnięty obiekt nie może istnieć. Żadna materia nie wytrzymałaby nacisku i całość zapadłaby się w czarną dziurę.</p>';
    h += '<p>Zegar B stoi <b>' + whereText(b, d.h) + '</b>.</p><ul>';
    if (g.delta < 1e-3) {
      h += '<li>Spóźnia się o <b>' + perDay(g.delta) + '</b> na dobę względem twojego zegara (daleko od źródła).</li>' +
           '<li>Na jedną sekundę różnicy trzeba by czekać <b>' + F.dur(1 / g.delta) + '</b>.</li>';
    } else {
      h += '<li>Gdy przy zegarze B mija <b>1 godzina</b>, u ciebie mija <b>' + F.dur(3600 / g.rate) + '</b>. Czas płynie tam ' + F.slower(g.rate) + '.</li>' +
           '<li>Światło z zegara B dociera do ciebie przesunięte ku czerwieni' + (g.rate < 0.3 ? ' i mocno osłabione' : '') + '.</li>';
    }
    h += '</ul>';
    if (b.bh && d.h < 0.01) h += '<p class="aside">To skraj horyzontu zdarzeń. Z daleka widzisz, jak zegar B prawie staje, a jego światło gaśnie w czerwieni. Gdyby opadł niżej, nigdy nie zobaczyłbyś, jak przekracza horyzont. A on sam przeleciałby przez niego, nie zauważając niczego szczególnego (jeśli przetrwałby siły pływowe).</p>';
    if (!b.bh) h += '<p class="aside">Gdyby tę masę ścisnąć do kuli o promieniu <b>' + F.len(b.rs) + '</b>, powstałaby czarna dziura.</p>';
    return h;
  }
  function explainBoth(d) {
    const b = d.bb, sp = d.spB;
    let move;
    if (S.b.orbit) move = d.orbit.possible ? 'krąży swobodnie (bez silników) z prędkością <b>' + F.speed(sp) + '</b>, czyli ' + F.pct(sp) + ' c,' : 'nie może tu krążyć, więc wisi na silnikach';
    else move = sp.beta === 0 ? 'wisi nieruchomo na silnikach' : 'leci na silnikach z prędkością <b>' + F.speed(sp) + '</b> (' + F.pct(sp) + ' c)';
    let h = '<p>Statek ' + move + ' ' + whereText(b, d.hb, true) + ' (' + bodyName(b) + ').</p>';
    if (S.b.orbit && !d.orbit.possible) h += '<p class="warn">⚠️ Tak blisko czarnej dziury orbit już nie ma: żeby krążyć, trzeba by lecieć szybciej niż światło.</p>';
    else if (S.b.orbit && !d.orbit.stable) h += '<p class="warn">⚠️ Ta orbita jest niestabilna: najmniejsze pchnięcie i statek spadnie w czarną dziurę albo odleci. Najniższa stabilna orbita leży 2 promienie horyzontu nad nim.</p>';
    h += '<ul><li><b>Grawitacja</b> spowalnia zegar statku o <b>' + perDay(d.gS.delta) + '</b> na dobę.</li>' +
      '<li><b>Prędkość</b> ' + (sp.beta === 0 ? 'nic nie dokłada, bo statek stoi.' : 'dokłada <b>' + perDay(sp.delta) + '</b> na dobę.') + '</li>';
    if (!b.bh) h += '<li>W porównaniu z zegarem <b>na powierzchni</b> zegar statku <b>' + (d.vsSurf >= 0 ? 'śpieszy się' : 'spóźnia się') + ' o ' + perDay(Math.abs(d.vsSurf)) + '</b> na dobę.</li>';
    if (d.tot.rate < 0.5) h += '<li>Gdy na statku mija <b>1 godzina</b>, u ciebie mija <b>' + F.dur(3600 / d.tot.rate) + '</b>.</li>';
    h += '</ul>';
    const earth = b.exact && b.near.id === 'earth' && S.b.orbit;
    if (earth && d.hb > 2.5 && d.hb < 4.5) h += '<p class="aside">🛰️ To przypadek satelitów GPS. Bez poprawki na teorię względności pozycja w nawigacji rozjeżdżałaby się o ok. <b>' + F.len(Math.abs(d.vsSurf) * P.DAY * P.C) + '</b> każdego dnia.</p>';
    if (earth && d.hb > 0.04 && d.hb < 0.1) h += '<p class="aside">🧑‍🚀 Na ISS wygrywa prędkość: astronauci starzeją się wolniej niż my, o ok. <b>' + F.dur(Math.abs(d.vsSurf) * P.YEAR) + '</b> na rok.</p>';
    if (b.exact && b.near.id === 'smbh' && d.tot.rate < 1e-4) h += '<p class="aside">🎬 W „Interstellar” planeta Millera krąży wokół szybko wirującej czarnej dziury, dzięki czemu może tam być i to bez silników. Tu czarna dziura się nie obraca, więc tak głęboko trzeba wisieć na (bardzo mocnych) silnikach.</p>';
    return h;
  }

  /* ------------------------------- wykres ------------------------------- */
  function updateChart(d) {
    const cvc = $('#chart');
    if (S.mode === 'speed') {
      $('#chart-title').textContent = 'Mapa efektu: tempo zegara i długość statku';
      $('#chart-note').textContent = 'Przez większość drogi do prędkości światła prawie nic się nie dzieje. Efekt wybucha dopiero na samym końcu: krzywa spada pionowo w dół. Ta sama krzywa opisuje tempo zegara i długość statku.';
      R.chart.drawSpeed(cvc, d.sp);
    } else if (S.mode === 'gravity') {
      const b = d.body;
      $('#chart-title').textContent = 'Mapa efektu: o ile zegar B spóźnia się na dobę';
      $('#chart-note').textContent = 'Obie osie są logarytmiczne: każdy szczebel w górę to efekt 1000 razy silniejszy. Im bliżej źródła, tym większe spóźnienie.' + (b.bh ? ' Przy samym horyzoncie zegar traci prawie całą dobę: prawie stoi.' : '');
      R.chart.drawHeight(cvc, {
        body: b,
        series: [{ fn: h => P.gravAt(b, h).delta, col: COL.grav, label: 'zegar w spoczynku na tej wysokości' }],
        point: { h: d.h, value: d.gB.delta, col: COL.grav, label: perDay(d.gB.delta) + ' na dobę' }
      });
    } else {
      const b = d.bb, spB = d.spB;
      $('#chart-title').textContent = 'Mapa efektu: spóźnienie na dobę (względem ciebie)';
      $('#chart-note').textContent = b.bh
        ? 'Pomarańczowa krzywa to statek, fioletowa to zegar stojący na tej samej wysokości. Różnica między nimi to wkład prędkości.'
        : 'Pomarańczowa krzywa to statek. Gdy leży pod zieloną linią (zegar na powierzchni), zegar statku śpieszy się względem powierzchni. Nad linią się spóźnia.';
      const fnShip = S.b.orbit
        ? h => { const o = P.orbitAt(b, h); return o.possible ? P.combine(P.gravAt(b, h), o.sp).delta : NaN; }
        : h => P.combine(P.gravAt(b, h), spB).delta;
      R.chart.drawHeight(cvc, {
        body: b,
        series: [
          { fn: h => P.gravAt(b, h).delta, col: COL.grav, label: 'zegar w spoczynku', width: 1.8, dash: [5, 4] },
          { fn: fnShip, col: COL.ship, label: S.b.orbit ? 'statek na swobodnej orbicie' : 'statek (ta sama prędkość)' }
        ],
        lines: b.bh ? null : [{ value: d.gSurf.delta, col: COL.surf, label: 'zegar na powierzchni' }],
        point: { h: d.hb, value: d.tot.delta, col: COL.ship, label: 'statek: ' + perDay(d.tot.delta) + ' na dobę' }
      });
    }
  }

  /* ------------------------------- zadania ------------------------------- */
  const MODE_NAMES = { speed: 'Prędkość', gravity: 'Grawitacja', both: 'Razem' };
  const openHints = {};
  function renderTasks() {
    const ol = $('#tasks');
    ol.innerHTML = '';
    let n = 0;
    K.TASKS.forEach(t => {
      const done = !!S.done[t.id];
      if (done) n++;
      const li = document.createElement('li');
      li.className = 'task' + (done ? ' done' : '') + (t.mode === S.mode ? ' here' : '');
      li.innerHTML = '<button type="button"><span class="check" aria-hidden="true"></span><span class="task-text">' + t.text + '</span><span class="task-mode m-' + t.mode + '">' + MODE_NAMES[t.mode] + '</span></button>' +
        '<div class="task-hint"' + (openHints[t.id] ? '' : ' hidden') + '>💡 ' + t.hint + '</div>';
      li.querySelector('button').addEventListener('click', () => {
        openHints[t.id] = !openHints[t.id];
        if (S.mode !== t.mode) setMode(t.mode); else renderTasks();
      });
      ol.appendChild(li);
    });
    $('#task-progress').textContent = n + '/' + K.TASKS.length;
  }
  function checkTasks(d) {
    if (S.mode === 'gravity' && d.body.exact && d.h < 0.01) {
      if (d.body.near.id === 'sun') S.flags.sun = true;
      if (d.body.near.id === 'wd') S.flags.wd = true;
    }
    let changed = false;
    K.TASKS.forEach(t => {
      if (S.done[t.id] || t.mode !== S.mode) return;
      let ok = false;
      try { ok = t.check(d, S.flags); } catch (e) { ok = false; }
      if (ok) {
        S.done[t.id] = true; changed = true;
        toast('✅ Zadanie wykonane: ' + t.text);
        R.audio.chime();
      }
    });
    if (changed) { LS.set('gc-zadania', JSON.stringify(S.done)); renderTasks(); }
  }

  /* ----------------------------- ciekawostki ----------------------------- */
  let factI = Math.floor(Math.random() * K.FACTS.length);
  function renderFact() {
    const f = K.FACTS[factI];
    $('#fact').innerHTML = '<h4>' + f.t + '</h4><p>' + f.b + '</p>' + (f.try ? '<p class="try">Sprawdź: ' + f.try + '</p>' : '');
    $('#fact-dots').innerHTML = K.FACTS.map((_, i) => '<i' + (i === factI ? ' class="on"' : '') + '></i>').join('');
  }
  $('#fact-prev').addEventListener('click', () => { factI = (factI + K.FACTS.length - 1) % K.FACTS.length; renderFact(); });
  $('#fact-next').addEventListener('click', () => { factI = (factI + 1) % K.FACTS.length; renderFact(); });

  /* -------------------------- modale i komunikaty -------------------------- */
  let toastTimer = 0;
  function toast(text) {
    const t = $('#toast');
    t.textContent = text; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3400);
  }
  function openModal(id) { $(id).hidden = false; }
  function closeModal(id) { $(id).hidden = true; }
  $('#glossary-list').innerHTML = K.GLOSSARY.map(([k, v]) => '<div class="gl-item"><dt>' + k + '</dt><dd>' + v + '</dd></div>').join('');
  $('#btn-glossary').addEventListener('click', () => openModal('#glossary'));
  $('#btn-help').addEventListener('click', () => { $('#intro-sound').checked = S.sound; openModal('#intro'); });
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m || e.target.hasAttribute('data-close')) m.hidden = true; });
  });
  $('#btn-start').addEventListener('click', () => {
    closeModal('#intro');
    LS.set('gc-intro', '1');
    setSound($('#intro-sound').checked);
  });
  // przeglądarki pozwalają na dźwięk dopiero po geście użytkownika
  window.addEventListener('pointerdown', () => { if (S.sound) R.audio.init(); }, { once: true });

  /* ------------------------------ klawiatura ------------------------------ */
  window.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'select' || tag === 'textarea') return;
    if (e.key === 'Escape') { document.querySelectorAll('.modal').forEach(m => { m.hidden = true; }); return; }
    if (!$('#intro').hidden) return;
    switch (e.key) {
      case '1': setMode('speed'); break;
      case '2': setMode('gravity'); break;
      case '3': setMode('both'); break;
      case ' ':
        if (tag === 'button') return;
        e.preventDefault(); setPaused(!S.paused); break;
      case 'r': case 'R': syncNow(); toast('Zegary zsynchronizowane.'); break;
      case 'm': case 'M': setSound(!S.sound); break;
      case 'v': case 'V': if (S.mode === 'speed') setView(S.view === 'side' ? 'cockpit' : 'side'); break;
      default: return;
    }
  });

  /* ------------------------------- pętla ------------------------------- */
  let last = performance.now(), textT = 0;
  function frame(now) {
    const dtReal = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    const dt = S.paused ? 0 : dtReal;
    const d = derive();

    // zegary
    const rates = clockRates(d);
    if (!S.paused) {
      T[S.mode] += dt * S.ts;
      clocks[S.mode].forEach((c, i) => {
        const [r, dl] = rates[i];
        if (c.advance(dt * S.ts, dt, r, dl) && !(S.mode === 'both' && i === 1 && d.bb.bh)) R.audio.tick(c.def.sound);
      });
    }

    // scena
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.mode === 'speed') {
      speed.update(dt, d.sp, W, H);
      speed.draw(ctx, W, H, d.sp, S.view);
    } else {
      const sIn = S.mode === 'gravity'
        ? { mode: 'gravity', body: d.body, hB: d.h, gB: d.gB, dtReal, pulses: S.pulses, clockPulse: clocks.gravity[1].pulse }
        : { mode: 'both', body: d.bb, hB: d.hb, gB: d.gS, sp: d.spB, tot: d.tot, dtReal };
      sheet.update(dt, sIn);
      sheet.draw(ctx, W, H, sIn);
    }
    clocks[S.mode].forEach(c => c.draw(T[S.mode] - 0, { timescale: S.ts }));

    textT += dtReal;
    if (dirty || textT > 0.1) {
      textT = 0;
      updateClockTexts(d);
      updateHud(d);
    }
    if (dirty) {
      updateReadouts(d);
      const ex = S.mode === 'speed' ? explainSpeed(d) : S.mode === 'gravity' ? explainGravity(d) : explainBoth(d);
      setHTML($('#explain-live'), ex);
      updateChart(d);
      dirty = false;
    }
    checkTasks(d);
    requestAnimationFrame(frame);
  }

  /* ------------------------------- start ------------------------------- */
  syncControls();
  setMode('speed');
  setSound(S.sound, true);
  renderFact();
  if (!LS.get('gc-intro')) openModal('#intro');
  let chartResize = 0;
  window.addEventListener('resize', () => { clearTimeout(chartResize); chartResize = setTimeout(markDirty, 120); });
  requestAnimationFrame(frame);
})(window.Rel);
