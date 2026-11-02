// Interfejs: Wolcik, dymki, okna, konfetti, ikony
window.Iskry = window.Iskry || {};
(function () {
  const U = Iskry.ui = {};
  const $ = id => document.getElementById(id);
  U.$ = $;

  U.ICONS = {
    hand: '<text x="24" y="35" font-size="28" text-anchor="middle">✋</text>',
    wire: '<path d="M7 34 C14 6, 34 6, 41 34" stroke="#ff4d5e" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="7" cy="36" r="4.5" fill="#b9c2d0"/><circle cx="41" cy="36" r="4.5" fill="#b9c2d0"/>',
    erase: '<text x="24" y="35" font-size="28" text-anchor="middle">🧽</text>',
    battery: '<rect x="6" y="16" width="30" height="16" rx="4" fill="#3a6df0"/><rect x="28" y="16" width="9" height="16" rx="3" fill="#ff9f1c"/><rect x="37" y="20" width="4" height="8" rx="1" fill="#f5c451"/><text x="17" y="28" font-size="9" fill="#fff" font-weight="900" text-anchor="middle">1,5V</text>',
    bulb: '<circle cx="24" cy="18" r="12" fill="#fff3a8" stroke="#e0b330" stroke-width="2"/><path d="M19 19 q2.5-6 5 0 q2.5 6 5 0" stroke="#d9822b" stroke-width="2" fill="none"/><rect x="18" y="29" width="12" height="9" rx="2" fill="#9aa3b5"/><rect x="15" y="38" width="18" height="5" rx="2" fill="#2f9e6e"/>',
    motor: '<rect x="14" y="22" width="20" height="19" rx="4" fill="#c8ced8"/><rect x="14" y="20" width="20" height="6" rx="2" fill="#ff7a45"/><rect x="23" y="12" width="2" height="9" fill="#888"/><ellipse cx="14" cy="11" rx="10" ry="3.2" fill="#ff4d5e"/><ellipse cx="34" cy="11" rx="10" ry="3.2" fill="#3d8bff"/><circle cx="24" cy="11" r="3.5" fill="#ffd23f"/>',
    switch: '<rect x="5" y="31" width="38" height="8" rx="3" fill="#2ec4b6"/><circle cx="12" cy="28" r="4" fill="#9aa3b5"/><rect x="34" y="24" width="4" height="8" fill="#9aa3b5"/><line x1="12" y1="28" x2="35" y2="12" stroke="#9aa3b5" stroke-width="4" stroke-linecap="round"/><circle cx="36" cy="11" r="5" fill="#ff4d5e"/>',
    button: '<rect x="7" y="31" width="34" height="9" rx="4" fill="#2d3142"/><rect x="14" y="20" width="20" height="13" rx="4" fill="#ff3d6e"/><ellipse cx="24" cy="20" rx="10" ry="5" fill="#ff7397"/>',
    led: '<circle cx="24" cy="22" r="15" fill="#ff3b3b" opacity=".18"/><path d="M16 22 a8 8 0 0 1 16 0 v10 h-16z" fill="#ff3b3b"/><rect x="14" y="31" width="20" height="4" rx="1" fill="#ff7b7b"/><rect x="18" y="35" width="2.5" height="9" fill="#999"/><rect x="27.5" y="35" width="2.5" height="7" fill="#999"/>',
    buzzer: '<ellipse cx="22" cy="32" rx="15" ry="6" fill="#23262f"/><rect x="7" y="20" width="30" height="12" fill="#23262f"/><ellipse cx="22" cy="20" rx="15" ry="6" fill="#3a3e4a"/><circle cx="22" cy="20" r="3" fill="#000"/><path d="M39 9 q4 4 0 8 M35 5 q8 8 0 16" stroke="#ffc93c" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
    resistor: '<line x1="3" y1="24" x2="45" y2="24" stroke="#999" stroke-width="3"/><rect x="11" y="16" width="26" height="16" rx="7" fill="#e8c99b"/><rect x="16" y="16" width="3" height="16" fill="#2ecc71"/><rect x="22" y="16" width="3" height="16" fill="#222"/><rect x="30" y="16" width="3" height="16" fill="#d4af37"/>',
  };
  U.icon = (k, cls) => `<svg class="${cls || 'ico'}" viewBox="0 0 48 48" aria-hidden="true">${U.ICONS[k] || ''}</svg>`;

  // ---------- Wolcik ----------
  let sayTimer = null, sayText = '', readAloud = false;
  U.setReadAloud = v => { readAloud = v; };
  U.say = function (text, opt) {
    opt = opt || {};
    const box = $('say');
    sayText = text.replace(/<[^>]+>/g, '');
    $('sayText').innerHTML = text;
    box.hidden = false;
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
    U.mood(opt.mood || 'happy');
    clearTimeout(sayTimer);
    $('sayOk').hidden = !opt.stay;
    if (!opt.stay) {
      const ms = opt.ms || Math.min(14000, 3500 + sayText.length * 55);
      sayTimer = setTimeout(U.hush, ms);
    }
    if (readAloud && opt.read !== false) Iskry.audio.speak(sayText);
  };
  U.hush = function () {
    clearTimeout(sayTimer);
    $('say').hidden = true;
    U.mood('happy');
  };
  U.mood = function (m) {
    const w = $('wolcik');
    w.className = 'm-' + m;
  };
  U.dance = function () {
    const w = $('wolcik');
    w.classList.add('dance');
    setTimeout(() => w.classList.remove('dance'), 2400);
  };
  U.initMascot = function () {
    $('sayRead').onclick = () => Iskry.audio.speak(sayText);
    $('sayOk').onclick = () => U.hush();
    $('wolcik').onclick = () => { if (U.onMascot) U.onMascot(); };
    // oczy śledzą wskaźnik
    window.addEventListener('pointermove', e => {
      const r = $('wolcik').getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      document.querySelectorAll('.w-pupil').forEach((p, i) => {
        p.setAttribute('cx', (i ? 74 : 46) + (dx / d) * 3.5);
        p.setAttribute('cy', 66 + (dy / d) * 4);
      });
    });
  };

  // ---------- toasty ----------
  U.toast = function (html, cls) {
    const t = document.createElement('div');
    t.className = 'toast ' + (cls || '');
    t.innerHTML = html;
    $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 3600);
    setTimeout(() => t.remove(), 4200);
  };

  // ---------- ekrany i okna ----------
  U.show = function (id) { $(id).hidden = false; requestAnimationFrame(() => $(id).classList.add('open')); };
  U.hide = function (id) { $(id).classList.remove('open'); $(id).hidden = true; };
  U.modal = function (html, buttons, opt) {
    const box = $('modalBox');
    box.className = 'panel modal-panel ' + ((opt && opt.cls) || '');
    box.innerHTML = html + '<div class="modal-btns"></div>';
    const bw = box.querySelector('.modal-btns');
    (buttons || [{ label: 'OK' }]).forEach(b => {
      const el = document.createElement('button');
      el.className = 'mbtn ' + (b.cls || '');
      el.innerHTML = b.label;
      el.onclick = () => { Iskry.audio.sfx('ui'); U.hide('modal'); if (b.fn) b.fn(); };
      bw.appendChild(el);
    });
    U.show('modal');
  };

  // ---------- konfetti ----------
  let conf = [], confOn = false;
  U.confetti = function (n) {
    const cv = $('confetti');
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ['#ffe14d', '#ff9f1c', '#ff4d6d', '#a970ff', '#3db2ff', '#2ecc71'];
    for (let i = 0; i < (n || 160); i++) {
      conf.push({
        x: innerWidth / 2 + (Math.random() - 0.5) * innerWidth * 0.3, y: innerHeight * 0.45,
        vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 18 - 6, r: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4, s: 6 + Math.random() * 8, c: cols[i % cols.length], life: 1,
      });
    }
    if (!confOn) { confOn = true; requestAnimationFrame(stepConf); }
  };
  function stepConf() {
    const cv = $('confetti'), g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    conf = conf.filter(p => p.y < cv.height + 40 && p.life > 0);
    for (const p of conf) {
      p.vy += 0.45; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.004;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r);
      g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      g.restore();
    }
    if (conf.length) requestAnimationFrame(stepConf);
    else { confOn = false; g.clearRect(0, 0, cv.width, cv.height); }
  }

  // ---------- lekcje ----------
  let lsIdx = 0;
  U.openLessons = function (i) {
    lsIdx = i || 0;
    renderLesson();
    U.show('lessons');
  };
  function renderLesson() {
    const L = Iskry.LESSONS;
    const l = L[lsIdx];
    $('lsTitle').textContent = (lsIdx + 1) + '. ' + l.title;
    $('lsSvg').innerHTML = l.svg;
    $('lsText').innerHTML = l.text;
    $('lsDots').innerHTML = L.map((_, i) => `<i class="${i === lsIdx ? 'on' : ''}"></i>`).join('');
    $('lsPrev').disabled = lsIdx === 0;
    $('lsNext').textContent = lsIdx === L.length - 1 ? '✓' : '▶';
    if (readAloud) Iskry.audio.speak(l.title + '. ' + l.text.replace(/<[^>]+>/g, ''));
  }
  U.initLessons = function () {
    $('lsPrev').onclick = () => { if (lsIdx > 0) { lsIdx--; Iskry.audio.sfx('ui'); renderLesson(); } };
    $('lsNext').onclick = () => {
      Iskry.audio.sfx('ui');
      if (lsIdx < Iskry.LESSONS.length - 1) { lsIdx++; renderLesson(); } else { U.hide('lessons'); Iskry.audio.stopSpeak(); }
    };
    $('lsRead').onclick = () => { const l = Iskry.LESSONS[lsIdx]; Iskry.audio.speak(l.title + '. ' + l.text.replace(/<[^>]+>/g, '')); };
  };
})();
