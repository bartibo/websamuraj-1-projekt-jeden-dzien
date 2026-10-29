/* =====================================================================
   Gumowy czas – przewodnik Tik
   Zegar-maskotka, który mówi (nagrania z ElevenLabs) i pokazuje tekst
   w dymku. Słowa podświetlają się w rytm nagrania, żeby dziecko mogło
   czytać razem z Tikiem. Bez głosu dymek wisi tyle, ile trwa czytanie.
   ===================================================================== */
'use strict';
(function (R) {
  const TEXT = window.TIK_KWESTIE || {};
  const MOOD = { tik: 'img/tik.webp', mowi: 'img/tik-mowi.webp', wow: 'img/tik-wow.webp', sen: 'img/tik-sen.webp' };
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* tryb prywatny */ } }
  };

  const G = {
    voice: LS.get('gc-glos') !== '0',
    said: new Set(),
    cur: null,
    onStart: null, onEnd: null,
    get speaking() { return !!this.cur && !this.cur.done; }
  };

  let box, img, txt, words = [], audio = null, hideTimer = 0, raf = 0;
  const sfx = {};

  function build(stage) {
    box = document.createElement('div');
    box.className = 'tik collapsed';
    box.innerHTML =
      '<button class="tik-face" type="button" aria-label="Tik: powtórz ostatnią podpowiedź"><img alt="" src="' + MOOD.tik + '"></button>' +
      '<div class="tik-bubble" role="status" aria-live="polite"><p class="tik-text"></p>' +
      '<div class="tik-tools"><button type="button" class="tik-again" title="Powtórz">↻ Powtórz</button>' +
      '<button type="button" class="tik-hide" title="Schowaj" aria-label="Schowaj dymek">×</button></div></div>';
    stage.appendChild(box);
    img = box.querySelector('img');
    txt = box.querySelector('.tik-text');
    box.querySelector('.tik-face').addEventListener('click', () => {
      if (G.cur) say(G.cur.id, { mood: G.cur.mood, force: true });
    });
    box.querySelector('.tik-again').addEventListener('click', () => { if (G.cur) say(G.cur.id, { mood: G.cur.mood, force: true }); });
    box.querySelector('.tik-hide').addEventListener('click', () => { stop(); collapse(); });
    Object.values(MOOD).forEach(src => { const i = new Image(); i.src = src; });
  }

  function collapse() { box.classList.add('collapsed'); box.classList.remove('talking'); }

  function stop() {
    clearTimeout(hideTimer); cancelAnimationFrame(raf);
    if (audio) { audio.onended = null; audio.pause(); audio = null; }
    if (G.cur && !G.cur.done) { G.cur.done = true; if (G.onEnd) G.onEnd(); }
  }

  /** Tik mówi kwestię id. opts: mood, force (powtórz, nawet jeśli już padła), then (id albo funkcja po skończeniu). */
  function say(id, opts) {
    opts = opts || {};
    const text = TEXT[id];
    if (!text || (!opts.force && G.said.has(id))) return false;
    G.said.add(id);
    stop();
    const cur = G.cur = { id, mood: opts.mood || 'mowi', then: opts.then, done: false };
    img.src = MOOD[cur.mood] || MOOD.mowi;
    txt.innerHTML = text.split(/\s+/).map(w => '<span>' + w + '</span>').join(' ');
    words = Array.from(txt.children);
    box.classList.remove('collapsed');
    box.classList.add('talking');
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
    if (G.onStart) G.onStart();

    const finish = () => {
      if (cur.done) return;
      cur.done = true;
      box.classList.remove('talking');
      words.forEach(w => w.classList.add('on'));
      if (G.onEnd) G.onEnd();
      const then = cur.then;
      if (then) { setTimeout(() => { if (G.cur === cur) typeof then === 'function' ? then() : say(then, { mood: 'mowi' }); }, 900); }
      hideTimer = setTimeout(() => { if (G.cur === cur) collapse(); }, 3500);
    };

    if (G.voice) {
      audio = new Audio('audio/' + id + '.mp3');
      audio.onended = finish;
      audio.onerror = () => readOnly(cur, text, finish);
      const p = audio.play();
      if (p && p.catch) p.catch(() => readOnly(cur, text, finish));
      // podświetlanie słów w rytm nagrania (proporcjonalnie do liczby liter)
      const lens = words.map(w => w.textContent.length + 1), total = lens.reduce((a, b) => a + b, 0);
      const step = () => {
        if (cur.done || !audio) return;
        if (audio.duration > 0) {
          let lim = audio.currentTime / audio.duration * total * 1.04, acc = 0;
          words.forEach((w, i) => { acc += lens[i]; w.classList.toggle('on', acc <= lim + 1); });
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    } else readOnly(cur, text, finish);
    return true;
  }

  function readOnly(cur, text, finish) {
    if (audio) { audio.onended = null; audio = null; }
    words.forEach(w => w.classList.add('on'));
    hideTimer = setTimeout(finish, 2500 + text.length * 55);
  }

  function setVoice(on) {
    G.voice = on; LS.set('gc-glos', on ? '1' : '0');
    if (!on && audio) { audio.pause(); if (G.cur) { const c = G.cur; readOnly(c, TEXT[c.id] || '', () => { c.done = true; collapse(); if (G.onEnd) G.onEnd(); }); } }
  }

  /** Krótki efekt dźwiękowy z ElevenLabs (start, powrot, kulka, am, brawo). */
  function play(name, vol) {
    if (!R.audio.on && !G.voice) return;
    let a = sfx[name];
    if (!a) { a = sfx[name] = new Audio('audio/sfx_' + name + '.mp3'); a.preload = 'auto'; }
    try {
      const n = a.paused ? a : a.cloneNode();
      n.volume = vol == null ? 0.8 : vol;
      n.currentTime = 0;
      const p = n.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) { /* bez dźwięku */ }
  }

  G.build = build; G.say = say; G.stop = stop; G.collapse = collapse; G.setVoice = setVoice; G.play = play;
  G.has = id => !!TEXT[id];
  R.guide = G;
})(window.Rel);
