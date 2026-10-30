/* =====================================================================
   Nurt – interfejs: suwak energii, odtwarzanie, sesje, skróty
   ===================================================================== */
'use strict';
(function (N) {
  const U = N.util;
  const $ = id => document.getElementById(id);
  const el = {
    energy: $('energy'), volume: $('volume'), play: $('btn-play'), status: $('status'),
    zone: $('zone-name'), hint: $('zone-hint'), ticks: $('ticks'), mixview: $('mixview'),
    timer: $('btn-timer'), timerLabel: $('timer-label'), info: $('info'), infoBtn: $('btn-info'),
    infoClose: $('info-close')
  };
  const TIMERS = [0, 25, 50, 90];
  const STORE = 'nurt.v1';

  // ---------- stan zapamiętany na tym urządzeniu ----------
  const saved = (() => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } })();
  const state = {
    energy: U.clamp(saved.energy == null ? 50 : +saved.energy || 0, 0, 100),
    volume: U.clamp(saved.volume == null ? 70 : +saved.volume, 0, 100),
    timerIdx: TIMERS.includes(saved.timer) ? TIMERS.indexOf(saved.timer) : 0,
    playing: false, starting: false, remaining: 0, zone: null
  };
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ energy: +state.energy.toFixed(1), volume: state.volume, timer: TIMERS[state.timerIdx] })); } catch (e) { /* tryb prywatny */ }
  }

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
  const bars = N.mix.GROUPS.map(gr => {
    const m = document.createElement('div');
    m.className = 'm';
    m.innerHTML = `<div class="bar"><i></i></div><span>${gr.name}</span>`;
    el.mixview.appendChild(m);
    return { gr, m, i: m.querySelector('i') };
  });

  // ---------- energia ----------
  let raf = 0;
  function setEnergy(v, fromUser) {
    state.energy = U.clamp(v, 0, 100);
    if (fromUser !== 'slider') el.energy.value = state.energy;
    const e = state.energy / 100;
    const mix = N.mix.at(e);
    if (engine) engine.apply(mix);
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

    bars.forEach(({ gr, m, i }) => {
      const v = gr.get(mix);
      i.style.transform = `scaleY(${Math.min(1, v * 1.05).toFixed(3)})`;
      m.classList.toggle('off', v < 0.04);
    });
    if (state.playing) el.status.textContent = describe(mix);
    clearTimeout(setEnergy.s);
    setEnergy.s = setTimeout(save, 400);
  }

  function describe(mix) {
    const parts = N.mix.GROUPS.map(g => ({ p: g.phrase, v: g.get(mix) }))
      .filter(x => x.v > 0.22).sort((a, b) => b.v - a.v).slice(0, 3).map(x => x.p);
    const tempo = mix.drums > 0.1 ? ` · ${Math.round(mix.bpm)} BPM` : '';
    if (!parts.length) return '';
    const txt = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' i ' + parts[parts.length - 1] : parts[0];
    return txt.charAt(0).toUpperCase() + txt.slice(1) + tempo;
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
        engine.apply(N.mix.at(state.energy / 100), true);
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
    if (TIMERS[state.timerIdx] && state.remaining <= 0) state.remaining = TIMERS[state.timerIdx] * 60;
    visual.setPlaying(true);
    el.play.classList.add('on');
    el.play.setAttribute('aria-label', 'Pauza');
    el.status.textContent = describe(N.mix.at(state.energy / 100));
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

  // ---------- sesja z wyciszeniem ----------
  function updateTimerLabel() {
    const mins = TIMERS[state.timerIdx];
    el.timer.classList.toggle('on', mins > 0);
    if (!mins) { el.timerLabel.textContent = 'bez limitu'; return; }
    if (state.remaining > 0 && (state.playing || state.remaining < mins * 60)) {
      const s = Math.ceil(state.remaining);
      el.timerLabel.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    } else el.timerLabel.textContent = `${mins} min`;
  }
  function cycleTimer() {
    state.timerIdx = (state.timerIdx + 1) % TIMERS.length;
    state.remaining = TIMERS[state.timerIdx] * 60;
    updateTimerLabel();
    save();
  }
  let lastSec = performance.now();
  setInterval(() => {
    const now = performance.now(), dt = (now - lastSec) / 1000;
    lastSec = now;
    if (!state.playing || !TIMERS[state.timerIdx] || state.remaining <= 0) return;
    state.remaining -= dt;
    if (state.remaining <= 0) endSession();
    updateTimerLabel();
  }, 1000);

  function endSession() {
    state.remaining = 0;
    engine.fadeTo(0, 12);
    el.status.textContent = 'Koniec sesji. Wyciszam…';
    clearTimeout(endTimer);
    endTimer = setTimeout(() => {
      if (!state.playing) return;
      engine.chime();
      pause(`Sesja ${TIMERS[state.timerIdx]} min zakończona. Dobra robota – zrób przerwę.`);
      clearTimeout(suspendTimer);
      suspendTimer = setTimeout(() => { if (!state.playing) ctx.suspend(); }, 4500);
    }, 12500);
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

  el.play.addEventListener('click', toggle);
  el.timer.addEventListener('click', cycleTimer);
  el.infoBtn.addEventListener('click', () => el.info.showModal());
  el.infoClose.addEventListener('click', () => el.info.close());
  el.info.addEventListener('click', ev => { if (ev.target === el.info) el.info.close(); });

  document.addEventListener('keydown', ev => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (el.info.open && ev.key !== '?') return;
    const onSlider = document.activeElement === el.energy;
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
      cycleTimer();
    } else if (k === '?') {
      el.info.open ? el.info.close() : el.info.showModal();
    }
  });

  // ---------- start ----------
  setVolume(state.volume);
  state.remaining = TIMERS[state.timerIdx] * 60;
  setEnergy(state.energy);
  updateTimerLabel();
})(window.Nurt);
