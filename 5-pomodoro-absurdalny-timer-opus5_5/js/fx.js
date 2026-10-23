'use strict';
/* Efekty interfejsu: komunikaty (toasty), konfetti, okna dialogowe, przełączanie ekranów. */

A.ui = (() => {
  const toasts = $('#toasts');

  // Komunikat w rogu. buttons: [{label, fn}] – zamyka się po kliknięciu
  function toast(title, text, opt = {}) {
    const t = el('div', 'toast ' + (opt.kind || ''));
    t.innerHTML = `<b>${esc(title)}</b><p>${esc(text)}</p>`;
    if (opt.buttons) {
      const row = el('div', 'toast-btns');
      opt.buttons.forEach(b => {
        const btn = el('button', 'btn tiny', esc(b.label));
        btn.addEventListener('click', () => { b.fn && b.fn(); close(); });
        row.appendChild(btn);
      });
      t.appendChild(row);
    }
    toasts.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    let closed = false;
    function close() {
      if (closed) return; closed = true;
      t.classList.remove('in'); t.classList.add('out');
      setTimeout(() => t.remove(), 400);
    }
    if (opt.ttl !== 0) setTimeout(close, opt.ttl || 7000);
    if (!opt.buttons) t.addEventListener('click', close);
    while (toasts.children.length > 4) toasts.firstChild.remove();
    return close;
  }

  // Okno dialogowe. buttons: [{label, cls, fn, keep}]
  const ovl = $('#ovl-dialog'), dlg = $('#dialog');
  let onEsc = null;
  function dialog(html, buttons, opt = {}) {
    dlg.className = 'dialog paper ' + (opt.cls || '');
    dlg.innerHTML = html;
    if (buttons && buttons.length) {
      const row = el('div', 'dialog-btns');
      buttons.forEach(b => {
        const btn = el('button', 'btn ' + (b.cls || ''), b.label);
        btn.addEventListener('click', () => { A.audio.sfx.click(); if (!b.keep) closeDialog(); b.fn && b.fn(); });
        row.appendChild(btn);
      });
      dlg.appendChild(row);
    }
    ovl.hidden = false;
    onEsc = opt.onEsc || null;
    const first = dlg.querySelector('.dialog-btns .btn');
    if (first) first.focus();
    return dlg;
  }
  function closeDialog() { ovl.hidden = true; dlg.innerHTML = ''; onEsc = null; }
  function dialogOpen() { return !ovl.hidden; }
  ovl.addEventListener('click', e => { if (e.target === ovl) { const f = onEsc; closeDialog(); f && f(); } });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && dialogOpen()) { const f = onEsc; closeDialog(); f && f(); e.stopPropagation(); }
  }, true);

  function screen(id) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
    document.body.dataset.screen = id;
    window.scrollTo(0, 0);
  }

  /* ---------- Konfetti ---------- */
  const cv = $('#confetti'), g = cv.getContext('2d');
  let parts = [], running = false;
  const EMO = ['🍅', '🎉', '🐌', '⏰', '🥟', '🏆', '✨', '🐈'];
  const COLS = ['#e5432f', '#e7b33a', '#3c8d4a', '#3a7bd5', '#9b59b6', '#ff8fb1', '#fff'];
  function confetti(n = 160) {
    const W = innerWidth, H = innerHeight;
    for (let i = 0; i < n; i++) {
      const emo = chance(0.18);
      parts.push({
        x: W / 2 + rand(-W * 0.1, W * 0.1), y: H * 0.55,
        vx: rand(-900, 900), vy: rand(-1300, -500), r: rand(0, TAU), vr: rand(-10, 10),
        s: emo ? rand(22, 36) : rand(6, 12), c: pick(COLS), e: emo ? pick(EMO) : null, life: rand(3, 5),
      });
    }
    if (!running) { running = true; requestAnimationFrame(loop); }
  }
  let last = 0;
  function loop(ts) {
    const dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = innerWidth, H = innerHeight;
    if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    parts = parts.filter(p => p.life > 0 && p.y < H + 60);
    for (const p of parts) {
      p.life -= dt; p.vy += 1400 * dt; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r);
      g.globalAlpha = Math.min(1, p.life);
      if (p.e) { g.font = `${p.s}px "Segoe UI Emoji","Apple Color Emoji",sans-serif`; g.textAlign = 'center'; g.fillText(p.e, 0, 0); }
      else { g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); }
      g.restore();
    }
    if (parts.length) requestAnimationFrame(loop);
    else { running = false; last = 0; g.clearRect(0, 0, W, H); }
  }

  // Liczenie w górę dla liczb w raporcie
  function countUp(node, to, fmtFn, dur = 1600) {
    const t0 = performance.now();
    function step(now) {
      const k = Math.min(1, (now - t0) / dur);
      node.innerHTML = fmtFn(to * easeOut(k));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  return { toast, dialog, closeDialog, dialogOpen, screen, confetti, countUp };
})();
