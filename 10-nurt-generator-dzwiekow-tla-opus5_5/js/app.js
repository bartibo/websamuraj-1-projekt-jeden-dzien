/* =====================================================================
   Nurt – interfejs: suwak energii, mikser, odtwarzanie, sesje,
   nagrywanie MP3, skróty
   ===================================================================== */
'use strict';
(function (N) {
  const U = N.util;
  const $ = id => document.getElementById(id);
  const el = {
    energy: $('energy'), volume: $('volume'), play: $('btn-play'), status: $('status'),
    zone: $('zone-name'), hint: $('zone-hint'), ticks: $('ticks'), mixview: $('mixview'),
    timer: $('btn-timer'), timerLabel: $('timer-label'), info: $('info'), infoBtn: $('btn-info'),
    infoClose: $('info-close'), mixer: $('mixer'), mixerBtn: $('btn-mixer'), mixerBody: $('mixer-body'),
    mixerBadge: $('mixer-badge'), mixerClose: $('mixer-close'), mixerAuto: $('mixer-auto'), mixerRandom: $('mixer-random'),
    exportBtn: $('btn-export'), exportLabel: $('btn-export').querySelector('span'), exp: $('export'),
    expClose: $('export-close'), exWhat: $('ex-what'), exLen: $('ex-len'), exFade: $('ex-fade'), exMeta: $('ex-meta'),
    exProgress: $('ex-progress'), exBar: $('ex-bar'), exStatus: $('ex-status'), exGo: $('ex-go'), exSave: $('ex-save'),
    exShape: $('ex-shape'), exCurve: $('ex-curve'),
    ss: $('session'), ssClose: $('session-close'), ssPlan: $('ss-plan'), ssOpt: $('ss-opt'), ssOptLabel: $('ss-opt-label'),
    ssHint: $('ss-hint'), ssCurve: $('ss-curve'), ssGo: $('ss-go'), toast: $('toast')
  };
  const PLANS = N.arc.PLANS, SHAPES = N.arc.SHAPES;
  const STORE = 'nurt.v1';
  const CONTROLS = [].concat(...N.mix.SECTIONS.map(sec => sec.controls));
  const EX_LENGTHS = [3, 5, 10, 20, 30];
  const EX_FADES = [
    { name: 'krótkie', fadeIn: 4, fadeOut: 6 },
    { name: 'łagodne', fadeIn: 15, fadeOut: 25 },
    { name: 'bardzo długie', fadeIn: 40, fadeOut: 60 }
  ];
  const KBPS = 192;

  // ---------- stan zapamiętany na tym urządzeniu ----------
  const saved = (() => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } })();
  const state = {
    energy: U.clamp(saved.energy == null ? 50 : +saved.energy || 0, 0, 100),
    volume: U.clamp(saved.volume == null ? 70 : +saved.volume, 0, 100),
    manual: {},
    playing: false, starting: false, zone: null
  };
  // Sesja: wybrany plan i jego wariant oraz stan biegnącego planu (czas liczy się tylko podczas grania)
  const sess = {
    plan: 0, opts: { free: 0, focus: 0, rise: 1, sleep: 1 },
    started: false, ended: false, done: false, t: 0, phase: null, ramp: null, music: 1, fading: false, target: 50
  };
  {
    const pi = PLANS.findIndex(p => p.id === saved.plan);
    if (pi >= 0) sess.plan = pi;
    else if ([25, 50, 90].includes(saved.timer)) sess.opts.free = PLANS[0].options.indexOf(saved.timer); // zapis sprzed planów
    const so = saved.planOpts || {};
    PLANS.forEach(p => { if (Number.isInteger(so[p.id]) && so[p.id] >= 0 && so[p.id] < p.options.length) sess.opts[p.id] = so[p.id]; });
  }
  if (saved.manual && typeof saved.manual === 'object') {
    CONTROLS.forEach(c => { if (c.id in saved.manual) state.manual[c.id] = U.clamp(+saved.manual[c.id] || 0, 0, 1); });
  }
  const ex = {
    len: EX_LENGTHS.includes(saved.exLen) ? saved.exLen : 10,
    fade: U.clamp(saved.exFade == null ? 1 : +saved.exFade || 0, 0, EX_FADES.length - 1),
    shape: Math.max(0, SHAPES.findIndex(s => s.id === saved.exShape)),
    busy: false, cancel: false, url: null
  };
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        energy: +state.energy.toFixed(1), volume: state.volume,
        plan: PLANS[sess.plan].id, planOpts: sess.opts,
        manual: state.manual, exLen: ex.len, exFade: ex.fade, exShape: SHAPES[ex.shape].id
      }));
    } catch (e) { /* tryb prywatny */ }
  }
  const mixNow = () => N.mix.at(state.energy / 100, state.manual, sess.music);
  const isCustom = () => Object.keys(state.manual).length > 0;

  const visual = N.createVisual($('flow'));
  let ctx = null, engine = null, ticker = null, suspendTimer = null, endTimer = null;

  // ---------- budowa UI ----------
  N.mix.ZONES.forEach((z, i) => {
    const b = document.createElement('button');
    b.className = 'tick';
    b.type = 'button';
    b.textContent = z.tick;
    b.style.setProperty('--p', z.center / 100);
    b.title = `${z.name} (${i + 1})`;
    b.addEventListener('click', () => { glideTo(z.center); ensureStarted(); });
    el.ticks.appendChild(b);
  });
  // Paski „Teraz słychać” prowadzą do swojego suwaka w mikserze
  const BAR_TO_CONTROL = { lofi: 'keys', beat: 'drums' };
  const bars = N.mix.GROUPS.map(gr => {
    const m = document.createElement('button');
    m.type = 'button';
    m.className = 'm' + (gr.extra ? ' extra' : '');
    m.title = gr.name.replace('\n', ' ') + ': ustaw w mikserze';
    m.innerHTML = `<div class="bar"><i></i></div><span>${gr.name}</span>`;
    m.addEventListener('click', () => openMixer(BAR_TO_CONTROL[gr.id] || gr.id));
    el.mixview.appendChild(m);
    return { gr, m, i: m.querySelector('i') };
  });

  // ---------- energia ----------
  let raf = 0;
  function setEnergy(v, fromUser) {
    state.energy = U.clamp(v, 0, 100);
    if (fromUser !== 'slider') el.energy.value = state.energy;
    if (fromUser !== 'arc') onUserEnergy();
    const e = state.energy / 100;
    visual.setEnergy(e);
    const [r, g, b] = N.mix.color(e);
    document.documentElement.style.setProperty('--accent', `${r} ${g} ${b}`);

    const z = N.mix.zone(e);
    if (z !== state.zone) {
      const first = !state.zone;
      state.zone = z;
      const swap = () => {
        el.zone.textContent = z.name;
        el.hint.textContent = z.hint;
        el.zone.classList.remove('swap');
        el.hint.classList.remove('swap');
      };
      if (first) swap();
      else {
        el.zone.classList.add('swap');
        el.hint.classList.add('swap');
        clearTimeout(setEnergy.t);
        setEnergy.t = setTimeout(swap, 220);
      }
      [...el.ticks.children].forEach((t, i) => t.classList.toggle('active', N.mix.ZONES[i] === z));
      updateTitle();
      updateMediaSession();
    }
    el.energy.setAttribute('aria-valuetext', `${Math.round(state.energy)} z 100 – ${z.name}`);
    refreshMix();
  }

  /** Nowy miks (energia + ręczne suwaki) do silnika, pasków, miksera i opisu. */
  function refreshMix() {
    const mix = mixNow();
    if (engine) engine.apply(mix);
    bars.forEach(({ gr, m, i }) => {
      const v = gr.get(mix);
      i.style.transform = `scaleY(${Math.min(1, v * 1.05).toFixed(3)})`;
      m.classList.toggle('off', v < 0.04);
    });
    updateMixer(mix);
    if (state.playing) el.status.textContent = describe(mix);
    if (el.exp.open && !ex.busy) updateExportInfo();
    clearTimeout(refreshMix.s);
    refreshMix.s = setTimeout(save, 400);
  }

  function describe(mix) {
    const parts = N.mix.GROUPS.map(g => ({ p: g.phrase, v: g.get(mix) }))
      .filter(x => x.v > 0.22).sort((a, b) => b.v - a.v).slice(0, 3).map(x => x.p);
    const tempo = mix.drums > 0.1 ? ` · ${Math.round(mix.bpm)} BPM` : '';
    const own = isCustom() ? ' · własny miks' : '';
    if (!parts.length) return isCustom() ? 'Prawie cisza. Podgłośnij coś w mikserze.' : '';
    const txt = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' i ' + parts[parts.length - 1] : parts[0];
    return txt.charAt(0).toUpperCase() + txt.slice(1) + tempo + own;
  }

  // ---------- mikser ----------
  const rows = {};
  N.mix.SECTIONS.forEach(sec => {
    const h = document.createElement('h3');
    h.textContent = sec.name;
    el.mixerBody.appendChild(h);
    sec.controls.forEach(c => {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<label for="mx-${c.id}"><i class="pin" aria-hidden="true"></i>${c.name}${c.isNew ? ' <em>nowe</em>' : ''}</label>` +
        `<output for="mx-${c.id}"></output>` +
        `<button type="button" class="reset" title="Wróć do energii" aria-label="${c.name}: wróć do energii">↺</button>` +
        `<input type="range" id="mx-${c.id}" min="0" max="100" step="1">`;
      const input = row.querySelector('input'), out = row.querySelector('output');
      input.addEventListener('input', () => {
        state.manual[c.id] = +input.value / 100;
        refreshMix();
      });
      input.addEventListener('pointerdown', ensureStarted);
      row.querySelector('.reset').addEventListener('click', () => {
        delete state.manual[c.id];
        refreshMix();
      });
      el.mixerBody.appendChild(row);
      rows[c.id] = { c, row, input, out };
    });
  });

  function updateMixer(mix) {
    for (const id in rows) {
      const { c, row, input, out } = rows[id];
      const v = Math.round(mix[id] * 100);
      if (+input.value !== v) input.value = v;
      input.style.setProperty('--v', v + '%');
      const txt = c.fmt ? c.fmt(mix) : v + ' %';
      out.textContent = txt;
      input.setAttribute('aria-valuetext', txt);
      row.classList.toggle('pinned', id in state.manual);
    }
    const n = Object.keys(state.manual).length;
    el.mixerBadge.hidden = !n;
    el.mixerBadge.textContent = n;
    el.mixerAuto.disabled = !n;
  }

  function openMixer(focusId) {
    clearTimeout(openMixer.t);
    el.mixer.hidden = false;
    el.mixerBtn.setAttribute('aria-expanded', 'true');
    el.mixerBtn.classList.add('on');
    requestAnimationFrame(() => {
      el.mixer.classList.add('open');
      document.body.classList.add('mixer-open');
      const r = rows[focusId];
      if (!r) return;
      r.row.scrollIntoView({ block: 'nearest' });
      r.input.focus({ preventScroll: true });
      r.row.classList.remove('flash');
      void r.row.offsetWidth;
      r.row.classList.add('flash');
    });
  }
  function closeMixer() {
    el.mixer.classList.remove('open');
    document.body.classList.remove('mixer-open');
    el.mixerBtn.setAttribute('aria-expanded', 'false');
    el.mixerBtn.classList.remove('on');
    if (el.mixer.contains(document.activeElement)) el.mixerBtn.focus();
    openMixer.t = setTimeout(() => { el.mixer.hidden = true; }, 320);
  }
  const mixerOpen = () => el.mixer.classList.contains('open');

  /** Losowy, ale sensowny miks: 1–3 dźwięki otoczenia i muzyka z wylosowanej energii. */
  function randomMix() {
    const m = {};
    const amb = ['brown', 'pink', 'rain', 'wind', 'waves', 'fire', 'birds', 'cafe'];
    const on = amb.slice().sort(() => Math.random() - 0.5).slice(0, U.randi(1, 3));
    amb.forEach(k => { m[k] = on.includes(k) ? +U.rand(0.25, 0.85).toFixed(2) : 0; });
    const base = N.mix.at(U.rand(0, 1));
    const music = ['pad', 'keys', 'bass', 'melody', 'drums', 'vinyl'];
    const silent = U.chance(0.15);
    music.forEach(k => { m[k] = silent && k !== 'vinyl' ? 0 : +U.clamp(base[k] * U.rand(0.6, 1.25), 0, 1).toFixed(2); });
    m.tempo = +base.tempo.toFixed(2);
    m.busy = +base.busy.toFixed(2);
    m.bright = +U.rand(0.15, 0.85).toFixed(2);
    m.space = +U.rand(0.3, 0.8).toFixed(2);
    state.manual = m;
    refreshMix();
    ensureStarted();
  }

  // ---------- nagrywanie MP3 ----------
  const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const fmtMB = bytes => (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB';
  /**
   * Grupa przycisków „jeden z wielu”. `items()` może się zmieniać (wtedy rebuild()),
   * `set(i)` zwraca false, gdy wyboru nie wolno teraz zmienić.
   */
  function segmented(box, items, get, set, after) {
    const pickIt = i => { if (set(i) === false) return false; api.paint(); after(); return true; };
    const api = {
      rebuild() {
        box.textContent = '';
        items().forEach((label, i) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('role', 'radio');
          b.textContent = label;
          b.addEventListener('click', () => pickIt(i));
          box.appendChild(b);
        });
        api.paint();
      },
      paint() {
        [...box.children].forEach((b, i) => {
          b.setAttribute('aria-checked', String(i === get()));
          b.tabIndex = i === get() ? 0 : -1;
        });
      }
    };
    box.addEventListener('keydown', ev => {
      const d = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      ev.preventDefault();
      if (pickIt(U.clamp(get() + d, 0, box.children.length - 1))) box.children[get()].focus();
    });
    api.rebuild();
    return api;
  }
  const exChanged = () => { updateExportInfo(); save(); };
  segmented(el.exLen, () => EX_LENGTHS.map(m => m + ' min'), () => EX_LENGTHS.indexOf(ex.len),
    i => { if (ex.busy) return false; ex.len = EX_LENGTHS[i]; }, exChanged);
  segmented(el.exFade, () => EX_FADES.map(f => f.name), () => ex.fade,
    i => { if (ex.busy) return false; ex.fade = i; }, exChanged);
  segmented(el.exShape, () => SHAPES.map(s => s.name), () => ex.shape,
    i => { if (ex.busy) return false; ex.shape = i; }, exChanged);

  /**
   * Podgląd przebiegu w czasie: pole – głośność, linia – energia, kreski – muzyka.
   * `at(t)` zwraca { e, music, vol } dla t w sekundach od 0 do T.
   */
  function drawCurve(svg, at, T, endLabel) {
    const W = 300, H = 64, n = 150, pts = [];
    for (let i = 0; i <= n; i++) pts.push(at(T * i / n));
    const x = i => (i / n * W).toFixed(1), y = v => (H - 4 - v * (H - 10)).toFixed(1);
    const line = key => pts.map((p, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(p[key])).join('');
    const area = 'M0 ' + H + pts.map((p, i) => 'L' + x(i) + ' ' + (H - p.vol * (H - 2)).toFixed(1)).join('') + 'L' + W + ' ' + H + 'Z';
    const music = pts.some(p => p.music < 0.999);
    const mins = T / 60;
    svg.innerHTML =
      `<path class="c-vol" d="${area}"/>` +
      (music ? `<path class="c-music" d="${line('music')}"/>` : '') +
      `<path class="c-e" d="${line('e')}"/>`;
    svg.nextElementSibling.innerHTML = '<span>0</span><span class="c-key"><i class="k-e"></i>energia' +
      (music ? ' <i class="k-music"></i>muzyka' : '') + ' <i class="k-vol"></i>głośność</span>' +
      `<span>${endLabel || (Number.isInteger(mins) ? mins : mins.toFixed(1).replace('.', ',')) + ' min'}</span>`;
  }

  function updateExportInfo() {
    const f = EX_FADES[ex.fade], shape = SHAPES[ex.shape], T = ex.len * 60, e0 = state.energy / 100;
    drawCurve(el.exCurve, t => {
      const a = N.arc.shape(shape.id, t, T, e0);
      const vol = t < f.fadeIn ? U.smooth(t / f.fadeIn) : t > T - f.fadeOut ? U.smooth((T - t) / f.fadeOut) : 1;
      return { e: a.e, music: a.music, vol };
    }, T);
    const desc = describe(N.mix.at(e0, state.manual)).replace(' · własny miks', '');
    el.exWhat.textContent = state.zone.name + (isCustom() ? ' z własnym miksem' : '') + (desc ? ` (${desc.charAt(0).toLowerCase() + desc.slice(1)})` : '');
    el.exMeta.textContent = `Przebieg: ${shape.hint}. MP3 ${KBPS} kb/s, stereo · ok. ${fmtMB(ex.len * 60 * KBPS * 125)} · wchodzi przez ${f.fadeIn} s, cichnie przez ${f.fadeOut} s`;
  }

  function openExport() {
    if (!ex.busy) updateExportInfo();
    if (!el.exp.open) el.exp.showModal();
  }

  const slug = txt => txt.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  async function record() {
    if (ex.busy) { ex.cancel = true; el.exStatus.textContent = 'Przerywam…'; return; }
    const f = EX_FADES[ex.fade], minutes = ex.len, seconds = minutes * 60, shape = SHAPES[ex.shape];
    const e0 = state.energy / 100, manual = Object.assign({}, state.manual);
    const name = state.zone.name + (isCustom() ? ' · własny miks' : '') + (shape.id !== 'flat' ? ' · ' + shape.name : '');
    const file = `nurt-${slug(state.zone.name)}${isCustom() ? '-wlasny-miks' : ''}${shape.id !== 'flat' ? '-' + slug(shape.name) : ''}-${minutes}-min.mp3`;
    ex.busy = true; ex.cancel = false;
    el.exp.classList.add('busy');
    el.exProgress.hidden = false;
    el.exSave.hidden = true;
    el.exGo.textContent = 'Przerwij';
    el.exBar.style.width = '0%';
    el.exStatus.textContent = 'Stroję instrumenty…';
    const t0 = performance.now();
    let renderStart = 0;
    const onProgress = (phase, k) => {
      let p;
      if (phase === 'render') {
        if (!renderStart && k > 0) renderStart = performance.now();
        p = k * 0.9;
        let eta = '';
        if (k > 0.04) {
          const left = (performance.now() - renderStart) / 1000 * (1 - k) / k * 1.08 + seconds / 50;
          eta = left > 90 ? ` · zostało ok. ${Math.round(left / 60)} min` : left > 15 ? ` · zostało ok. ${Math.round(left / 5) * 5} s` : ' · zaraz koniec';
        }
        el.exStatus.textContent = `Komponuję i nagrywam: ${fmtTime(k * seconds)} z ${fmtTime(seconds)}${eta}`;
      } else {
        p = 0.9 + k * 0.1;
        el.exStatus.textContent = `Koduję MP3… ${Math.round(k * 100)} %`;
      }
      el.exBar.style.width = (p * 100).toFixed(1) + '%';
      el.exportLabel.textContent = Math.floor(p * 100) + ' %';
    };
    let blob = null, err = null;
    try {
      blob = await N.recordMp3({
        seconds, fadeIn: f.fadeIn, fadeOut: f.fadeOut, kbps: KBPS,
        mixAt: t => { const a = N.arc.shape(shape.id, t, seconds, e0); return N.mix.at(a.e, manual, a.music); },
        title: `Nurt · ${name} · ${minutes} min`,
        onProgress, isCancelled: () => ex.cancel
      });
    } catch (e) {
      err = e;
    }
    ex.busy = false;
    el.exp.classList.remove('busy');
    el.exGo.textContent = 'Nagraj MP3';
    el.exportLabel.textContent = 'MP3';
    if (err) {
      el.exBar.style.width = '0%';
      el.exStatus.textContent = err instanceof RangeError || /memory|allocat/i.test(err.message)
        ? 'Zabrakło pamięci na tak długie nagranie. Wybierz krótsze.'
        : 'Nie udało się nagrać: ' + err.message;
      return;
    }
    if (!blob) {
      el.exProgress.hidden = true;
      return;
    }
    if (ex.url) URL.revokeObjectURL(ex.url);
    ex.url = URL.createObjectURL(blob);
    el.exSave.href = ex.url;
    el.exSave.download = file;
    el.exSave.hidden = false;
    el.exGo.textContent = 'Nagraj kolejny';
    const took = (performance.now() - t0) / 1000;
    el.exStatus.textContent = `Gotowe: ${file} (${fmtMB(blob.size)}) trafił do pobranych. Nagranie trwało ${took > 90 ? Math.round(took / 60) + ' min' : Math.round(took) + ' s'}.`;
    el.exSave.click();
  }

  /** Płynny przejazd suwaka (kliknięcie strefy, klawisze 1–5). */
  function glideTo(target) {
    cancelAnimationFrame(raf);
    const from = state.energy, t0 = performance.now(), dur = 900;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur);
      const ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      setEnergy(from + (target - from) * ease);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // ---------- dźwięk ----------
  function startTicker() {
    const tick = () => { if (engine && ctx.state === 'running') engine.schedule(ctx.currentTime + 0.6); };
    // Worker tyka równo także w karcie w tle (zwykłe setInterval bywa tam dławione)
    try {
      const src = 'let id=0;onmessage=e=>{clearInterval(id);if(e.data)id=setInterval(()=>postMessage(0),e.data)}';
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      w.onmessage = tick;
      w.postMessage(50);
      ticker = w;
    } catch (e) {
      ticker = { id: setInterval(tick, 50) };
    }
    tick();
  }

  function ensureStarted() {
    if (state.playing || state.starting) return;
    play();
  }

  function play() {
    clearTimeout(suspendTimer);
    clearTimeout(endTimer);
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { el.status.textContent = 'Ta przeglądarka nie obsługuje Web Audio. Spróbuj Chrome, Edge, Firefox albo Safari.'; return; }
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* tylko Safari */ }
      ctx = new AC({ latencyHint: 'playback' });
      state.starting = true;
      el.play.classList.add('loading');
      el.status.textContent = 'Stroję instrumenty…';
      // chwila na odświeżenie ekranu, potem liczenie szumów i pogłosu
      setTimeout(() => {
        engine = N.createEngine(ctx);
        engine.apply(mixNow(), true);
        engine.setVolume(state.volume / 100, true);
        engine.start();
        startTicker();
        state.starting = false;
        el.play.classList.remove('loading');
        resume();
      }, 30);
      return;
    }
    resume();
  }

  function resume() {
    state.playing = true;
    ctx.resume().then(() => {
      if (!state.playing) return;
      engine.schedule(ctx.currentTime + 0.6);
      engine.fadeTo(1, 1.6);
    });
    if (!sess.started || sess.ended) startPlan();
    else sess.fading = false; // wyciszanie zasypiania ruszy od nowa z czasem, który został
    visual.setPlaying(true);
    el.play.classList.add('on');
    el.play.setAttribute('aria-label', 'Pauza');
    el.status.textContent = describe(mixNow());
    updateTitle();
    updateTimerLabel();
    try { navigator.mediaSession.playbackState = 'playing'; } catch (e) { /* brak */ }
  }

  function pause(msg) {
    if (!state.playing) return;
    state.playing = false;
    engine.fadeTo(0, 0.45);
    clearTimeout(suspendTimer);
    suspendTimer = setTimeout(() => { if (!state.playing) ctx.suspend(); }, 600);
    visual.setPlaying(false);
    el.play.classList.remove('on');
    el.play.setAttribute('aria-label', 'Odtwarzaj');
    el.status.textContent = msg || 'Pauza. Spacja albo przycisk – i płyniemy dalej.';
    updateTitle();
    updateTimerLabel();
    try { navigator.mediaSession.playbackState = 'paused'; } catch (e) { /* brak */ }
  }

  function toggle() {
    if (state.starting) return;
    if (state.playing) pause(); else play();
  }

  // ---------- sesja: plan, który prowadzi energię w czasie ----------
  const planDef = () => PLANS[sess.plan];
  const planOpt = () => planDef().options[sess.opts[planDef().id]];
  const fmtClock = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  /** Plan rusza od zera: przy pierwszym graniu, po zakończeniu albo po „Zacznij”. */
  function startPlan() {
    const d = planDef(), opt = planOpt();
    clearTimeout(endTimer);
    Object.assign(sess, { started: true, ended: false, done: false, t: 0, phase: null, ramp: null, music: 1, fading: false, target: state.energy });
    if (d.id === 'focus') sess.phase = 'work';
    if (d.id === 'rise') {
      const from = Math.min(N.arc.LOW * 100, sess.target);
      sess.ramp = { from, to: sess.target, t0: 0, dur: opt * 60 };
      setEnergy(from, 'arc');
    } else if (d.id === 'sleep') {
      // energia schodzi do zera w 60% czasu (tak samo jak w N.arc.sleep)
      sess.ramp = { from: sess.target, to: 0, t0: 0, dur: opt * 60 * 0.6 };
    }
    refreshMix();
    updateTimerLabel();
  }

  /** Ręczny ruch energii: przejście planu się kończy, a w pracy nowa wartość staje się celem. */
  function onUserEnergy() {
    if (sess.ramp && sess.started) {
      sess.ramp = null;
      if (planDef().id === 'rise') sess.done = true;
    }
    if (planDef().id === 'focus' && sess.phase !== 'break') sess.target = state.energy;
  }

  let lastTick = performance.now();
  setInterval(() => {
    const now = performance.now(), dt = Math.min(5, (now - lastTick) / 1000);
    lastTick = now;
    if (!state.playing || !sess.started || sess.ended) return;
    sess.t += dt;
    const d = planDef(), opt = planOpt();
    if (d.id === 'free') {
      if (opt && sess.t >= opt * 60) return endSession();
    } else if (d.id === 'focus') {
      const ph = N.arc.focusPhase(sess.t, opt);
      if (ph.phase !== sess.phase) {
        const brk = ph.phase === 'break';
        engine.chime(brk ? 'end' : 'work');
        sess.ramp = { from: state.energy, to: brk ? Math.min(N.arc.LOW * 100, sess.target) : sess.target, t0: sess.t, dur: N.arc.RAMP };
        toast(brk ? `Przerwa ${opt[1]} min. Odejdź od ekranu, tło się uspokaja.` : `Runda ${ph.round + 1}. Wracamy do pracy.`);
      }
      sess.phase = ph.phase;
    } else if (d.id === 'sleep') {
      const L = opt * 60, k = sess.t / L;
      sess.music = N.arc.sleep(k, 0).music;
      if (k >= 0.8 && !sess.fading) { sess.fading = true; engine.fadeTo(0, Math.max(1, L - sess.t)); }
      if (sess.t >= L) {
        sess.ended = true;
        pause(`Dobranoc. Tło ucichło po ${opt} minutach.`);
        // po ciszy suwak wraca tam, skąd zasypianie ruszyło
        sess.music = 1;
        setEnergy(sess.target, 'arc');
        el.status.textContent = `Dobranoc. Tło ucichło po ${opt} minutach.`;
        return;
      }
      if (!sess.ramp) refreshMix();
    }
    if (sess.ramp) {
      const r = sess.ramp, k = (sess.t - r.t0) / r.dur;
      setEnergy(U.lerp(r.from, r.to, U.smooth(k)), 'arc');
      if (k >= 1) {
        sess.ramp = null;
        if (d.id === 'rise') { sess.done = true; toast('Rozkręcone. Gra dalej bez limitu.'); }
      }
    }
    updateTimerLabel();
  }, 500);

  function updateTimerLabel() {
    const d = planDef(), opt = planOpt();
    const live = sess.started && !sess.ended;
    let txt, on = true;
    if (d.id === 'free') {
      on = opt > 0;
      txt = !opt ? 'bez limitu' : live && sess.t > 0 ? fmtClock(opt * 60 - sess.t) : opt + ' min';
    } else if (d.id === 'focus') {
      if (live) {
        const ph = N.arc.focusPhase(sess.t, opt);
        txt = (ph.phase === 'work' ? 'Praca ' : 'Przerwa ') + fmtClock(ph.left);
      } else txt = `${opt[0]} + ${opt[1]} min`;
    } else if (d.id === 'rise') {
      if (live && sess.done) { txt = 'bez limitu'; on = false; }
      else txt = 'Rozruch ' + (live && sess.ramp ? fmtClock(sess.ramp.dur - sess.t) : opt + ' min');
    } else {
      txt = 'Sen ' + (live ? fmtClock(opt * 60 - sess.t) : opt + ' min');
    }
    el.timerLabel.textContent = txt;
    el.timer.classList.toggle('on', on);
  }

  function endSession() {
    sess.ended = true;
    engine.fadeTo(0, 12);
    el.status.textContent = 'Koniec sesji. Wyciszam…';
    updateTimerLabel();
    clearTimeout(endTimer);
    endTimer = setTimeout(() => {
      if (!state.playing) return;
      engine.chime();
      pause(`Sesja ${planOpt()} min zakończona. Dobra robota – zrób przerwę.`);
      clearTimeout(suspendTimer);
      suspendTimer = setTimeout(() => { if (!state.playing) ctx.suspend(); }, 4500);
    }, 12500);
  }

  // okno sesji: wybór planu z podglądem przebiegu, rusza dopiero po „Zacznij”
  const pick = { plan: 0, opts: {} };
  const pickedDef = () => PLANS[pick.plan];
  const ssPlan = segmented(el.ssPlan, () => PLANS.map(p => p.name), () => pick.plan, i => { pick.plan = i; }, paintSession);
  const ssOpt = segmented(el.ssOpt, () => pickedDef().options.map(pickedDef().label), () => pick.opts[pickedDef().id],
    i => { pick.opts[pickedDef().id] = i; }, paintSession);
  function paintSession() {
    const d = pickedDef(), opt = d.options[pick.opts[d.id]], e0 = state.energy / 100;
    if (ssOpt.shown !== d.id) { ssOpt.shown = d.id; ssOpt.rebuild(); }
    el.ssHint.textContent = d.hint;
    el.ssOptLabel.textContent = d.id === 'focus' ? 'Praca + przerwa' : 'Długość';
    const low = Math.min(N.arc.LOW, e0);
    let T, at, end;
    if (d.id === 'free') {
      T = (opt || 60) * 60;
      at = t => ({ e: e0, music: 1, vol: opt ? 1 - U.smooth((t - (T - 12)) / 12) : 1 });
      end = opt ? null : 'bez końca';
    } else if (d.id === 'focus') {
      T = 2 * (opt[0] + opt[1]) * 60;
      at = t => {
        const ph = N.arc.focusPhase(t, opt), k = U.smooth(ph.into / N.arc.RAMP);
        const e = ph.phase === 'break' ? U.lerp(e0, low, k) : ph.round ? U.lerp(low, e0, k) : e0;
        return { e, music: 1, vol: 1 };
      };
      end = '2 rundy';
    } else if (d.id === 'rise') {
      T = opt * 60 * 1.5;
      at = t => ({ e: U.lerp(low, e0, U.smooth(t / (opt * 60))), music: 1, vol: 1 });
    } else {
      T = opt * 60;
      at = t => { const a = N.arc.sleep(t / T, e0); return { e: a.e, music: a.music, vol: 1 - U.smooth((t / T - 0.8) / 0.2) }; };
    }
    drawCurve(el.ssCurve, at, T, end);
    const same = pick.plan === sess.plan && pick.opts[d.id] === sess.opts[d.id] && sess.started && !sess.ended;
    el.ssGo.textContent = same ? 'Zacznij od nowa' : state.playing ? 'Przełącz na ten plan' : 'Zacznij';
  }
  function openSession() {
    pick.plan = sess.plan;
    pick.opts = Object.assign({}, sess.opts);
    ssPlan.paint();
    ssOpt.shown = null;
    paintSession();
    if (!el.ss.open) el.ss.showModal();
  }
  function goSession() {
    sess.plan = pick.plan;
    sess.opts = Object.assign({}, pick.opts);
    save();
    el.ss.close();
    if (state.playing) startPlan();
    else { sess.started = false; updateTimerLabel(); ensureStarted(); }
  }

  // krótka wiadomość na dole ekranu
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    requestAnimationFrame(() => el.toast.classList.add('in'));
    clearTimeout(toast.t);
    toast.t = setTimeout(() => {
      el.toast.classList.remove('in');
      toast.t = setTimeout(() => { el.toast.hidden = true; }, 400);
    }, 4200);
  }

  // ---------- tytuł karty i sterowanie multimediami ----------
  function updateTitle() {
    if (!state.zone) return;
    document.title = (state.playing ? '▶ ' : '') + state.zone.name + ' · Nurt';
  }
  function updateMediaSession() {
    if (!('mediaSession' in navigator) || !state.zone || typeof MediaMetadata === 'undefined') return;
    try { navigator.mediaSession.metadata = new MediaMetadata({ title: state.zone.name, artist: 'Nurt', album: 'tło do pracy' }); } catch (e) { /* brak */ }
  }
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', () => { if (!state.playing) play(); });
      navigator.mediaSession.setActionHandler('pause', () => pause());
    } catch (e) { /* brak */ }
  }

  // ---------- poziom dźwięku dla wizualizacji ----------
  let td = null;
  (function meter() {
    if (engine && state.playing) {
      if (!td) td = new Float32Array(engine.analyser.fftSize);
      engine.analyser.getFloatTimeDomainData(td);
      let s = 0;
      for (let i = 0; i < td.length; i += 2) s += td[i] * td[i];
      visual.setLevel(Math.min(1, Math.sqrt(s / (td.length / 2)) * 5));
    } else visual.setLevel(0);
    requestAnimationFrame(meter);
  })();

  // ---------- zdarzenia ----------
  el.energy.addEventListener('input', () => { cancelAnimationFrame(raf); setEnergy(+el.energy.value, 'slider'); });
  el.energy.addEventListener('pointerdown', ensureStarted);
  el.energy.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight' || ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
      ev.preventDefault();
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') return nudgeVolume(ev.key === 'ArrowUp' ? 5 : -5);
      nudgeEnergy((ev.key === 'ArrowRight' ? 1 : -1) * (ev.shiftKey ? 10 : 2));
    }
  });
  function nudgeEnergy(d) { cancelAnimationFrame(raf); setEnergy(state.energy + d); }

  function setVolume(v) {
    state.volume = U.clamp(Math.round(v), 0, 100);
    el.volume.value = state.volume;
    el.volume.style.setProperty('--v', state.volume + '%');
    if (engine) engine.setVolume(state.volume / 100);
    save();
  }
  function nudgeVolume(d) { setVolume(state.volume + d); }
  el.volume.addEventListener('input', () => setVolume(+el.volume.value));

  el.mixerBtn.addEventListener('click', () => (mixerOpen() ? closeMixer() : openMixer()));
  el.mixerClose.addEventListener('click', closeMixer);
  el.mixerAuto.addEventListener('click', () => { state.manual = {}; refreshMix(); });
  el.mixerRandom.addEventListener('click', randomMix);
  el.exportBtn.addEventListener('click', openExport);
  el.exGo.addEventListener('click', record);
  el.expClose.addEventListener('click', () => el.exp.close());
  el.exp.addEventListener('click', ev => { if (ev.target === el.exp) el.exp.close(); });

  el.play.addEventListener('click', toggle);
  el.timer.addEventListener('click', openSession);
  el.ssGo.addEventListener('click', goSession);
  el.ssClose.addEventListener('click', () => el.ss.close());
  el.ss.addEventListener('click', ev => { if (ev.target === el.ss) el.ss.close(); });
  el.infoBtn.addEventListener('click', () => el.info.showModal());
  el.infoClose.addEventListener('click', () => el.info.close());
  el.info.addEventListener('click', ev => { if (ev.target === el.info) el.info.close(); });

  document.addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (el.info.open && ev.key !== '?') return;
    if (el.exp.open || el.ss.open) return;
    if (ev.key === 'Escape' && mixerOpen()) { closeMixer(); return; }
    // na każdym suwaku strzałki należą do niego
    const onSlider = document.activeElement && document.activeElement.type === 'range';
    const k = ev.key;
    if (k === ' ' || k === 'k' || k === 'K') {
      ev.preventDefault();
      if (document.activeElement && document.activeElement.blur && document.activeElement !== el.energy) document.activeElement.blur();
      toggle();
    } else if (!onSlider && (k === 'ArrowLeft' || k === 'ArrowRight')) {
      ev.preventDefault();
      nudgeEnergy((k === 'ArrowRight' ? 1 : -1) * (ev.shiftKey ? 10 : 2));
    } else if (!onSlider && (k === 'ArrowUp' || k === 'ArrowDown')) {
      ev.preventDefault();
      nudgeVolume(k === 'ArrowUp' ? 5 : -5);
    } else if (k >= '1' && k <= '5') {
      glideTo(N.mix.ZONES[+k - 1].center);
    } else if (k === 't' || k === 'T') {
      ev.preventDefault();
      openSession();
    } else if (k === 'm' || k === 'M') {
      mixerOpen() ? closeMixer() : openMixer();
    } else if (k === 'n' || k === 'N') {
      ev.preventDefault();
      openExport();
    } else if (k === '?') {
      el.info.open ? el.info.close() : el.info.showModal();
    }
  });

  // ---------- start ----------
  setVolume(state.volume);
  setEnergy(state.energy);
  updateTimerLabel();
})(window.Nurt);
