'use strict';
/* Start gry, pętla główna i obsługa wejścia (mysz, klawiatura, dotyk). */

(function () {
  const canvas = document.getElementById('game');
  UI.init(Game);
  Game.init(canvas);

  let last = performance.now();
  function frame(now) {
    // następna klatka zamówiona od razu – wyjątek w jednej klatce nie zatrzyma gry na zawsze
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    Game.update(dt);
    Game.render();
    UI.updateHUD();
  }
  requestAnimationFrame(frame);

  const setAim = e => {
    Game.mouse.x = e.clientX - Game.w / 2;
    Game.mouse.y = e.clientY - Game.h / 2;
  };
  const touches = new Set();

  canvas.addEventListener('pointerdown', e => {
    Sound.init();
    setAim(e);
    if (e.pointerType === 'touch') {
      touches.add(e.pointerId);
      if (touches.size >= 2) { Game.triggerEMP(); return; }
      Game.mouse.down = true;
      return;
    }
    if (e.button === 2) { e.preventDefault(); Game.triggerEMP(); return; }
    if (e.button === 0) Game.mouse.down = true;
  });
  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' && (!touches.has(e.pointerId) || touches.size > 1)) return;
    setAim(e);
  });
  const release = e => {
    if (e.pointerType === 'touch') {
      touches.delete(e.pointerId);
      if (touches.size === 0) Game.mouse.down = false;
      return;
    }
    if (e.button === 0 || e.type === 'pointercancel') Game.mouse.down = false;
  };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('keydown', e => {
    Sound.init();
    const k = e.code;
    if (k === 'Space') {
      e.preventDefault();
      if (!e.repeat) Game.triggerEMP();
    } else if (k === 'KeyP' || k === 'Escape') {
      if (Game.state === 'playing') Game.pause();
      else if (Game.state === 'paused') Game.resume();
      else if (UI.current === 'help') UI.action('back');
    } else if (k === 'KeyM') {
      Sound.toggleMute(); UI.updateSoundLabels();
    } else if (k === 'KeyN') {
      Sound.toggleMusic(); UI.updateSoundLabels();
    } else if (k === 'KeyF') {
      if (Game.state === 'playing' || Game.state === 'paused') UI.action('auto');
    } else if (k === 'Enter' || k === 'NumpadEnter') {
      if (e.repeat) return;
      if (Game.state === 'shop') UI.action('next');
      else if (Game.state === 'menu' && UI.current === 'menu') UI.action('play');
      else if (Game.state === 'gameover') UI.action('restart');
      else if (Game.state === 'won') UI.action('endless');
    } else if (Game.state === 'shop') {
      const proto = { KeyQ: 0, KeyW: 1, KeyE: 2 }[k];
      if (proto !== undefined) { Game.chooseProtocol(proto); return; }
      if (k === 'KeyR') { Game.rerollOffer(); return; }
      const m = /^(?:Digit|Numpad)(\d)$/.exec(k);
      if (m) {
        const u = UPGRADES[(parseInt(m[1], 10) + 9) % 10];
        if (u) Game.buy(u.id);
      }
    }
  });

  window.addEventListener('resize', () => Game.resize());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { Game.pause(); Sound.suspend(); } else Sound.resume();
  });
  window.addEventListener('blur', () => { Game.mouse.down = false; Game.pause(); });
})();
