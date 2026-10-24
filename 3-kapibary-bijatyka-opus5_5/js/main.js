'use strict';
/* Start, pętla gry ze stałym krokiem 60 Hz i rysowanie z dopasowaniem do okna. */

const canvas = $('game');
const ctx = canvas.getContext('2d');

const App = {
  game: null, demo: null, lastFight: null, endWait: 0,

  makeCtrl(p, mode, cpu) {
    if (p === 0) return new KeyboardController(0);
    if (mode === 'versus') return new KeyboardController(1);
    if (mode === 'cpu') return new CpuController(cpu);
    return new DummyController();
  },

  startFight(cfg) {
    this.lastFight = cfg;
    const stage = STAGES[cfg.stage];
    // walka lustrzana: druga kapibara w innym kolorze futra, żeby było wiadomo, która jest która
    const variants = cfg.variants || [null, cfg.chars[0] === cfg.chars[1] ? { tint: '#5b7fb8', k: 0.38 } : null];
    this.game = new Game({
      mode: cfg.mode,
      chars: [CHARACTERS[cfg.chars[0]], CHARACTERS[cfg.chars[1]]],
      ctrls: [this.makeCtrl(0, cfg.mode, cfg.cpu), this.makeCtrl(1, cfg.mode, cfg.cpu)],
      variants,
      stage,
      winsNeeded: Settings.wins,
      time: Settings.time,
      finishers: Settings.finishers,
      onEnd: () => { this.endWait = 150; },
    });
    this.demo = null;
    this.endWait = 0;
    UI.prev = [];
    UI.show('fight');
    Sfx.muted = false;
    Music.play(stage.music);
  },

  quit() {
    this.game = null;
    UI.prev = [];
    UI.show('menu');
  },

  ensureDemo() {
    if (this.game || this.demo) return;
    const a = randInt(0, CHARACTERS.length - 1);
    let b = randInt(0, CHARACTERS.length - 2); if (b >= a) b++;
    this.demo = new Game({
      mode: 'demo',
      chars: [CHARACTERS[a], CHARACTERS[b]],
      ctrls: [new CpuController(2), new CpuController(2)],
      stage: pick(STAGES), winsNeeded: 1, time: 60, finishers: false,
      onEnd: () => { this.demoEnd = 120; },
    });
  },

  step() {
    const g = this.game;
    UI.t++;
    if (g) {
      if (UI.screen === 'fight' || UI.screen === 'results') { snapshot(g); g.tick(); }
      if (g.over && this.endWait > 0 && --this.endWait === 0) {
        if (this.lastFight.ladder) Ladder.onEnd(g.result, g); else UI.showResults(g.result, g);
      }
    } else if (this.demo) {
      snapshot(this.demo);
      Sfx.muted = true;          // walka pokazowa w tle menu jest niema, menu nie
      this.demo.tick();
      Sfx.muted = false;
      if (this.demo.over && --this.demoEnd <= 0) { this.demo = null; this.ensureDemo(); }
    }
  },
};

// ---------------- interpolacja ----------------
// Symulacja ma stały krok 60 Hz, a ekran odświeża się w swoim tempie (59, 75, 144 Hz…). Obraz pokazuje
// pozycje pomiędzy dwoma ostatnimi krokami, więc ruch nie szarpie, gdy kroki nie trafiają równo w klatki.
function snapshot(g) {
  for (const f of g.fighters) { f.px = f.x; f.py = f.y; }
  for (const p of g.projectiles) { p.px = p.x; p.py = p.y; }
  const c = g.cam; c.px = c.x; c.pzoom = c.zoom; c.plift = c.lift;
}

function interpolated(g, a, fn) {
  const saved = [];
  const mix = (o, k, pk) => { if (o[pk] === undefined) return; saved.push([o, k, o[k]]); o[k] = lerp(o[pk], o[k], a); };
  for (const f of g.fighters) if (Math.abs(f.x - f.px) < 200) { mix(f, 'x', 'px'); mix(f, 'y', 'py'); }
  for (const p of g.projectiles) { mix(p, 'x', 'px'); mix(p, 'y', 'py'); }
  mix(g.cam, 'x', 'px'); mix(g.cam, 'zoom', 'pzoom'); mix(g.cam, 'lift', 'plift');
  fn();
  for (let i = saved.length - 1; i >= 0; i--) saved[i][0][saved[i][1]] = saved[i][2];
}

function resize() {
  // walka pokazowa w menu leży pod rozmyciem – pół rozdzielczości wystarcza, a karta graficzna pracuje 2–3 razy mniej
  const k = App.game ? 1 : 0.5;
  const dpr = Math.min(2, window.devicePixelRatio || 1) * k;
  const w = Math.round(window.innerWidth * dpr), h = Math.round(window.innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}

function render(alpha) {
  resize();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const g = App.game || App.demo;
  if (g) {
    // walka mieści się w oknie; tło menu (bez HUD-u) wypełnia cały ekran, także telefon w pionie
    const S = (App.game ? Math.min : Math.max)(canvas.width / VW, canvas.height / VH);
    const ox = (canvas.width - VW * S) / 2, oy = (canvas.height - VH * S) / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(ox, oy, VW * S, VH * S); ctx.clip();
    interpolated(g, alpha, () => g.render(ctx, S, ox, oy, g !== App.demo));
    ctx.restore();
  }
}

let last = performance.now(), acc = 0, frozenKey = null;
const STEP = 1000 / FPS;
function loop(now) {
  acc += Math.min(120, now - last);
  last = now;
  Pads.poll(UI.screen);
  for (const code of Keys.takeMenu()) UI.key(code);
  let n = 0;
  while (acc >= STEP && n < 5) { acc -= STEP; App.step(); Keys.endStep(); n++; }
  if (n === 5) acc = 0;
  // pauza i ekrany otwarte z pauzy: obraz pod spodem stoi, więc rysujemy go raz (i po zmianie rozmiaru okna)
  const frozen = App.game && UI.screen !== 'fight' && UI.screen !== 'results';
  const key = innerWidth + 'x' + innerHeight;
  if (!frozen || frozenKey !== key) render(frozen ? 1 : acc / STEP);
  frozenKey = frozen ? key : null;
  UI.frame();
  requestAnimationFrame(loop);
}

// Nagrania z ElevenLabs (1,7 MB) – dopiero po narysowaniu strony, żeby nie opóźniały startu
function loadSounds() {
  const s = document.createElement('script');
  s.src = 'audio/dzwieki.js';
  s.onload = () => Rec.load();
  document.body.appendChild(s);
}

Keys.init();
Voice.init();
window.addEventListener('pointerdown', () => Sfx.unlock());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (UI.screen === 'fight') UI.pause();
    if (Sfx.ctx) Sfx.ctx.suspend();      // zawieszony dźwięk zatrzymuje też kolejkowanie muzyki
  } else if (Sfx.ctx) Sfx.ctx.resume();
});
// Alt+Tab, kliknięcie poza oknem: klawisze i tak przestają docierać, więc walka staje
window.addEventListener('blur', () => { if (UI.screen === 'fight') UI.pause(); });
UI.init();
App.ensureDemo();
requestAnimationFrame(loop);
window.addEventListener('load', () => setTimeout(loadSounds, 50));
