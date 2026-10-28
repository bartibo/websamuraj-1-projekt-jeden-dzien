'use strict';
/* =====================================================================
   Gdzie mgła ma zęby – silnik gry
   ===================================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const d6 = () => rnd(1, 6);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function plural(n, one, few, many) {
  if (n === 1) return one;
  const a = n % 10, b = n % 100;
  return a >= 2 && a <= 4 && !(b >= 12 && b <= 14) ? few : many;
}

const SAVE_KEY = 'gmz_save_v1';
const END_KEY = 'gmz_endings_v1';
const SET_KEY = 'gmz_settings_v1';
const PHASES = ['świt', 'dzień', 'zmierzch', 'noc'];
const TORCH_STEPS = 6;

const SET = { sound: true, fast: false, calm: false };
let S = null;
let mainView = null, titleView = null, endView = null;
let busy = false;

/* =====================================================================
   STAN
   ===================================================================== */
function newState(bgId, name) {
  const B = BACKGROUNDS[bgId];
  return {
    v: 1, bg: bgId, name, node: null, loc: null, prevLoc: null, after: null,
    hp: B.hp, hpMax: B.hp, rozum: 100, znamie: 8, silver: B.silver,
    base: { ...B.st }, mods: {}, weapon: { ...B.weapon },
    inv: { ...B.inv }, flags: {}, seen: {}, lore: [], loreSeen: [],
    day: 1, t: 1, light: 0, litNow: false, ward: 0, vision: 0, safeTravel: 0,
    kills: 0, evCount: {}, petaEver: {}, steps: 0,
    combat: null, fxq: [], riddle: 0,
  };
}

/* ---------- pomocnicze dla fabuły ---------- */
function F(f) { return !!(S && S.flags[f]); }
function setF(f) { S.flags[f] = true; }
function unF(f) { delete S.flags[f]; }
function has(id, n = 1) { return !!S && (S.inv[id] || 0) >= n; }
function know(id) { return !!S && S.lore.includes(id); }
function phaseIdx() { return Math.floor(S.t / 4) % 4; }
function night() { return phaseIdx() === 3; }
function lit() { return S.litNow || S.light > 0; }
function petaCount() { return ['zelazo', 'nic', 'grzechotka'].filter(i => has(i)).length; }
function fx(text, kind = '') { S.fxq.push({ text, kind }); }
function toastFx(text) { fx(text, 'good'); }

function give(id, n = 1) {
  S.inv[id] = (S.inv[id] || 0) + n;
  if (ITEMS[id] && ITEMS[id].peto) S.petaEver[id] = true;
  fx(`Zdobyto: ${ITEMS[id].n}${n > 1 ? ' ×' + n : ''}`, 'item');
}
function take(id, n = 1) {
  if (!S.inv[id]) return;
  S.inv[id] -= n;
  if (S.inv[id] <= 0) delete S.inv[id];
  fx(`Ubyło: ${ITEMS[id].n}`, 'lose');
}
function hp(d) {
  const old = S.hp; S.hp = clamp(S.hp + d, 0, S.hpMax);
  const r = S.hp - old; if (!r) return;
  fx(`${r > 0 ? '+' : '−'}${Math.abs(r)} Zdrowie`, r > 0 ? 'good' : 'bad');
  if (r < 0) { Snd.sfx.hurt(); mainView && mainView.hit(); }
}
function rozum(d) {
  const old = S.rozum; S.rozum = clamp(S.rozum + d, 0, 100);
  const r = S.rozum - old; if (!r) return;
  fx(`${r > 0 ? '+' : '−'}${Math.abs(r)} Rozum`, r > 0 ? 'good' : 'mind');
  if (r <= -6) Snd.sfx.whisper(0.8);
}
function znamie(d) {
  const old = S.znamie; S.znamie = clamp(S.znamie + d, 0, 100);
  const r = S.znamie - old; if (!r) return;
  fx(`${r > 0 ? '+' : '−'}${Math.abs(r)} Znamię`, r > 0 ? 'mark' : 'good');
}
function srebro(d) {
  S.silver = Math.max(0, S.silver + d);
  fx(`${d > 0 ? '+' : '−'}${Math.abs(d)} srebra`, d > 0 ? 'item' : 'lose');
}
function learn(id, quiet) {
  if (!LORE[id] || S.lore.includes(id)) return;
  S.lore.push(id);
  if (id === 'piesn2' && !S.lore.includes('piesn1')) S.lore.push('piesn1');
  if (!quiet) fx(`Nowa wiedza: ${LORE[id].t}`, 'lore');
  $('#lore-new').hidden = false;
}
function equip(id) { S.weapon = { ...WEAPONS[id] }; fx(`Broń: ${S.weapon.n}`, 'item'); }
function st(k) {
  let v = S.base[k] + (S.mods[k] || 0);
  for (const id in S.inv) { const b = ITEMS[id] && ITEMS[id].bonus; if (b && b[k]) v += b[k]; }
  if (S.znamie >= 50) { if (k === 'sil') v += 1; if (k === 'wol') v -= 1; }
  if (S.rozum < 30 && k === 'czu') v -= 1;
  return v;
}
function tick(n = 1) {
  for (let i = 0; i < n; i++) {
    S.t++; S.steps++;
    if (S.t >= 16) { S.t = 0; S.day++; if (S.day <= 3) fx(`Świta dzień ${S.day}.`, ''); }
  }
}
function restUntilDawn(village) {
  S.t = 0; S.day++;
  if (village) { hp(S.hpMax); rozum(15); }
  if (S.day <= 3) fx(`Świta dzień ${S.day}.`, '');
}
function whisperHurt(n) {
  let k = 1;
  if (has('krzyzyk')) k -= 0.25;
  if (has('kaptorga')) k -= 0.25;
  if (has('mlotek')) k -= 0.2;
  if (S.ward > 0) k -= 0.4;
  rozum(-Math.max(1, Math.round(n * Math.max(0.2, k))));
  Snd.sfx.whisper(1);
}
function stepDown() { whisperHurt(4); znamie(4); }
function hubOf(loc) { return loc === 'mszaniec' ? 'msz' : loc; }

/* =====================================================================
   PRZEJŚCIA MIĘDZY WĘZŁAMI
   ===================================================================== */
function resolveId(id) { return typeof id === 'function' ? id() : id; }

function go(id) {
  id = resolveId(id);
  if (!id) return;
  if (id === '@after') { const to = S.after || S.loc; S.loc = to; S.visited = S.visited || {}; id = hubOf(to); }
  if (id.startsWith('@zak')) return showEnding(id.slice(1));
  const n = NODES[id];
  if (!n) { console.error('Brak węzła:', id); return; }
  S.node = id;
  if (n.loc) S.loc = n.loc;
  S.visited = S.visited || {}; if (S.loc) S.visited[S.loc] = 1;
  if (S.ward > 0) S.ward--;
  // światło
  if (n.dark) {
    if (S.light <= 0 && has('pochodnia') && has('krzesiwo')) { S.inv.pochodnia--; if (!S.inv.pochodnia) delete S.inv.pochodnia; S.light = TORCH_STEPS; fx('Zapalasz nową pochodnię', ''); }
    if (S.light > 0) { S.litNow = true; S.light--; if (S.light === 0) fx('Pochodnia dopala się', 'lose'); }
    else { S.litNow = false; rozum(-4); fx('Ciemność', 'mind'); }
  } else S.litNow = false;
  if (!S.seen[id] && n.first) n.first();
  if (n.on) n.on();
  if (n.end) return showEnding(n.end);
  const fate = checkFate(n);
  if (fate) return showEnding(fate);
  render(n);
  S.seen[id] = (S.seen[id] || 0) + 1;
  save();
}

function checkFate(n) {
  if (S.hp <= 0) return S.znamie >= 50 ? 'zak_wilk' : 'zak_smierc';
  if (S.rozum <= 0) return 'zak_obled';
  if (S.znamie >= 100) return 'zak_pasterz';
  if (S.day > 3 && !(n && n.wk)) return 'zak_mgla';
  return null;
}

function travel(to) {
  const from = S.loc;
  S.prevLoc = from;
  tick(1);
  if (night()) rozum(-2);
  S.after = to;
  let ev = null;
  if (S.safeTravel > 0) S.safeTravel--;
  else {
    const danger = Math.max(LOCS[from].danger, LOCS[to].danger);
    let p = 0.12 + danger * 0.07 + (night() ? 0.15 : 0) + (S.rozum < 50 ? 0.1 : 0) + (F('dziecko_idzie') ? 0.15 : 0);
    if (S.bg === 'lowca') p *= 0.6;
    if (from === 'mszaniec' || to === 'mszaniec') p *= 0.4;
    if (Math.random() < p) ev = pickEvent();
  }
  Snd.sfx.page();
  if (ev) { S.evCount[ev] = (S.evCount[ev] || 0) + 1; go(ev); }
  else { S.loc = to; go(hubOf(to)); }
}

function pickEvent() {
  const pool = EVENTS.filter(e => e.if() && (S.evCount[e.id] || 0) < (e.id === 'ev_placz' ? 3 : 2));
  if (!pool.length) return null;
  let sum = pool.reduce((a, e) => a + e.w, 0), r = Math.random() * sum;
  for (const e of pool) { r -= e.w; if (r <= 0) return e.id; }
  return pool[0].id;
}

/* =====================================================================
   RENDEROWANIE WĘZŁA
   ===================================================================== */
function evalText(n) { return typeof n.text === 'function' ? n.text() : n.text; }

function glitchHTML(html) {
  if (S.rozum >= 45) return html;
  const p = (45 - S.rozum) / 45 * 0.07;
  return html.split(/(<[^>]+>)/).map(seg => {
    if (seg.startsWith('<')) return seg;
    return seg.replace(/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{5,}/g, w => Math.random() < p ? `<span class="gl" data-g="${pick(GLITCH_WORDS)}">${w}</span>` : w);
  }).join('');
}

function fmtParas(txt) {
  return String(txt).split(/\n\n+/).map(p => {
    p = p.replace(/~([^~]+)~/g, '<span class="szept">$1</span>');
    const cls = /^–\s/.test(p) ? 'dlg' : /^<span class="szept">.*<\/span>$/.test(p.trim()) ? 'whisper-line' : '';
    return `<p class="${cls}">${p}</p>`;
  });
}

function render(n) {
  $('#game').classList.remove('combat');
  const title = n.title || (LOCS[S.loc] && n.loc ? LOCS[S.loc].n : (n.loc ? '' : 'W drodze')) || '—';
  $('#tb-loc').textContent = title;
  $('#tb-time').textContent = `Dzień ${Math.min(S.day, 3)} · ${PHASES[phaseIdx()]}`;

  let paras = fmtParas(evalText(n) || '');
  // szepty wtrącone
  if (S.rozum < 65 && Math.random() < (65 - S.rozum) / 65 * 0.9) {
    const w = S.znamie >= 40 && Math.random() < 0.5 ? pick(HUNGER_WHISPERS) : pick(WHISPERS);
    paras.splice(1 + Math.floor(Math.random() * paras.length), 0, `<p class="whisper-line"><span class="szept">…${w}…</span></p>`);
    Snd.sfx.whisper(0.6);
  }
  // wizje po lulku
  if (S.vision > 0 && S.loc && VISIONS[S.loc] && n.loc) {
    paras.push(`<p class="wizja">${pick(VISIONS[S.loc])}</p>`);
    S.vision--;
  }
  let html = paras.map(glitchHTML).join('');
  if (S.fxq.length) html += `<div class="fx">${S.fxq.map(f => `<span class="chip ${f.kind}">${esc(f.text)}</span>`).join('')}</div>`;
  S.fxq = [];
  const story = $('#story');
  story.innerHTML = html;
  story.classList.remove('instant');
  story.classList.toggle('fast', SET.fast);
  $$('#story > *').forEach((el, i) => el.style.animationDelay = (i * (SET.fast ? 0.06 : 0.32)) + 's');
  story.scrollTop = 0;
  $('.story-col').scrollTop = 0;

  renderChoices(n);
  renderSide();
  updateScene(n);
  updateMood(n);
}

function choiceList(n) {
  const out = [];
  for (const c of n.ch || []) {
    if (c.if && !c.if()) continue;
    if (c.hunger && S.znamie < c.hunger) continue;
    out.push(c);
  }
  if (n.hub) {
    const L = LOCS[S.loc];
    const open = !n.hubIf || n.hubIf();
    if (L && !(S.loc === 'mszaniec' && !F('zlecenie'))) {
      if (open) for (const a of L.adj) out.push({ t: `Idź: ${LOCS[a].n}`, sub: LOCS[a].d, travel: a });
      else if (S.prevLoc && L.adj.includes(S.prevLoc)) out.push({ t: `Wycofaj się powoli: ${LOCS[S.prevLoc].n}`, travel: S.prevLoc });
      else out.push({ t: `Wycofaj się powoli: ${LOCS[L.adj[0]].n}`, travel: L.adj[0] });
    }
  }
  if (S.rozum < 30 && !n.end && Math.random() < 0.7) out.splice(rnd(0, out.length), 0, { t: pick(['Posłuchaj go.', 'Pozwól mu mówić.', 'Otwórz usta.']), fake: true });
  return out;
}

function chanceOf(stat, dc) {
  const need = dc - st(stat);
  let ok = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === 12 || (a + b !== 2 && a + b >= need)) ok++;
  return Math.round(ok / 36 * 100);
}

let currentChoices = [];
function renderChoices(n) {
  const box = $('#choices');
  currentChoices = choiceList(n);
  box.innerHTML = currentChoices.map((c, i) => {
    let label = typeof c.t === 'function' ? c.t() : c.t;
    let tags = '';
    if (c.test) { const dc = resolveId(c.test.dc); tags += `<span class="tag test">${STATS[c.test.s]} ${dc} · ${chanceOf(c.test.s, dc)}%</span>`; }
    if (c.fight) tags += `<span class="tag fight">walka</span>`;
    if (c.travel) tags += `<span class="tag go">droga</span>`;
    if (c.cost) tags += `<span class="tag go">czas</span>`;
    if (c.hunger) tags += `<span class="tag hunger">głód</span>`;
    const flick = S.rozum < 30 && !c.fake && Math.random() < 0.22;
    const inner = flick ? `<span class="lbl">${esc(label)}</span><span class="alt">${esc(pick(FAKE_CHOICES))}</span>` : `<span class="lbl">${label}</span>`;
    return `<button class="ch${c.fake ? ' fake' : ''}${flick ? ' flick' : ''}${c.travel ? ' travel' : ''}" data-i="${i}"><b class="num">${i + 1}</b><span class="txt">${inner}${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</span>${tags}</button>`;
  }).join('');
  $$('#choices .ch').forEach(b => b.addEventListener('click', () => choose(+b.dataset.i)));
}

function choose(i) {
  if (busy) return;
  const c = currentChoices[i];
  if (!c) return;
  Snd.init(); Snd.sfx.click();
  if (S.combat) return combatAct(c.act);
  if (c.fake) {
    rozum(-4); znamie(4); Snd.sfx.whisper(1);
    const fate = checkFate(NODES[S.node]); if (fate) return showEnding(fate);
    return render(NODES[S.node]);
  }
  if (c.travel) return travel(c.travel);
  if (c.cost) tick(c.cost);
  if (c.do) c.do();
  if (c.test) return doTest(c.test);
  if (c.fight) return startFight(c.fight);
  if (c.end) return showEnding(c.end);
  go(c.go);
}

/* =====================================================================
   PRÓBY: dwie kości + cecha
   ===================================================================== */
function doTest(t) {
  const dc = resolveId(t.dc), mod = st(t.s);
  const a = d6(), b = d6(), sum = a + b + mod;
  const ok = a + b === 12 || (a + b !== 2 && sum >= dc);
  showDice(STATS[t.s], a, b, mod, dc, ok, () => {
    if (ok) { t.okDo && t.okDo(); go(t.ok); } else { t.noDo && t.noDo(); go(t.no); }
  });
}

function showDice(label, a, b, mod, dc, ok, done) {
  busy = true;
  const ov = $('#dice'); ov.hidden = false; ov.classList.remove('ok', 'no');
  $('#dice-label').textContent = label;
  $('#dice-dc').textContent = dc;
  $('#die-mod').textContent = (mod >= 0 ? '+' : '') + mod;
  $('#dice-res').textContent = '';
  $('#dice-sum').textContent = '…';
  Snd.sfx.dice();
  const d1 = $('#die1'), d2 = $('#die2');
  const rollT = SET.fast ? 220 : 750;
  const t0 = performance.now();
  let finished = false;
  const finish = () => {
    if (finished) return; finished = true;
    d1.textContent = a; d2.textContent = b;
    d1.classList.remove('roll'); d2.classList.remove('roll');
    $('#dice-sum').textContent = a + b + mod;
    $('#dice-res').textContent = a + b === 12 ? 'Szczęście sprzyja!' : a + b === 2 ? 'Bogowie odwrócili wzrok' : ok ? 'Udało się' : 'Nie udało się';
    ov.classList.add(ok ? 'ok' : 'no');
    ok ? Snd.sfx.success() : Snd.sfx.fail();
    setTimeout(() => { ov.hidden = true; busy = false; done(); }, SET.fast ? 450 : 1050);
  };
  d1.classList.add('roll'); d2.classList.add('roll');
  const spin = () => {
    if (finished) return;
    if (performance.now() - t0 > rollT) return finish();
    d1.textContent = d6(); d2.textContent = d6();
    setTimeout(spin, 60);
  };
  spin();
  ov.onclick = finish;
}

/* =====================================================================
   WALKA
   ===================================================================== */
function startFight(f) {
  let e = resolveId(f.e);
  const queue = Array.isArray(e) ? [...e] : [e];
  S.combat = { queue, e: null, win: f.win, flee: f.flee, dispel: f.dispel, log: [], def: 0, horn: false, stun: 0, round: 0 };
  nextEnemy();
  Snd.sfx.drum();
  renderCombat();
}

function zyrHp() {
  const p = F('peta_polozone') ? 3 : petaCount();
  return Math.max(12, 40 - p * 6 - (F('idol') ? 6 : 0) - (F('radogost') ? 4 : 0));
}

function nextEnemy() {
  const id = S.combat.queue.shift();
  const E = ENEMIES[id];
  const hpv = id === 'zyr' ? zyrHp() : E.hp;
  S.combat.e = { id, ...E, hp: hpv, max: hpv };
  clog(`<b>${E.n}.</b> ${E.intro}`, 'intro');
  if (id === 'zyr') Snd.sfx.roar();
}

function clog(t, cls = '') { S.combat.log.push({ t, cls }); if (S.combat.log.length > 9) S.combat.log.shift(); }

function combatActions() {
  const c = S.combat, e = c.e, A = [];
  A.push({ t: `Uderz – ${S.weapon.n}`, act: 'atak', tag: `${STATS[S.weapon.st]} · ${chanceHit(st(S.weapon.st), e.def)}%` });
  A.push({ t: 'Cios z osłoną', act: 'oslona', tag: `−2 do trafienia, +3 obrony` });
  A.push({ t: 'Obrona', act: 'obrona', tag: '+5 obrony' });
  if (S.light > 0 || has('pochodnia')) A.push({ t: 'Pchnij pochodnią', act: 'ogien', tag: e.beast || e.fireWeak ? 'ogień ×2' : 'ogień' });
  if (has('sol')) A.push({ t: 'Sypnij solą', act: 'sol', tag: e.spirit ? 'rani upiory' : 'na upiory' });
  if (has('rog') && !c.horn) A.push({ t: 'Zadmij w róg', act: 'rog', tag: e.beast ? 'płoszy zwierzęta' : 'ogłusza' });
  if (S.znamie >= 25) A.push({ t: 'Głód', act: 'glod', tag: '+znamię, leczy', cls: 'hunger' });
  if (S.rozum < 75 || e.illusion) A.push({ t: 'Przejrzyj przez mgłę', act: 'przejrzyj', tag: `Wola · ${chanceOf('wol', 10)}%` });
  for (const id of ['chleb', 'mieso', 'bylica', 'miod']) if (has(id)) A.push({ t: { chleb: 'Zjedz chleb', mieso: 'Zjedz mięso', bylica: 'Przeżuj bylicę', miod: 'Pociągnij miodu' }[id], act: 'item:' + id, tag: 'tura' });
  if (c.flee && !e.god) A.push({ t: 'Uciekaj', act: 'ucieczka', tag: `Zręczność · ${chanceOf('zre', 9)}%` });
  if (e.god) A.push({ t: 'Uciekaj w górę gardzieli', act: 'ucieczka', tag: `Zręczność · ${chanceOf('zre', 10)}%` });
  return A;
}

function chanceHit(mod, def) {
  let ok = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === 12 || (a + b !== 2 && a + b + mod >= def)) ok++;
  return Math.round(ok / 36 * 100);
}

function renderCombat() {
  const c = S.combat, e = c.e;
  $('#game').classList.add('combat');
  $('#tb-loc').textContent = 'Walka: ' + e.n;
  const pdef = 9 + st('zre');
  $('#story').innerHTML = `<div class="clog">${c.log.map(l => `<p class="${l.cls}">${glitchHTML(l.t)}</p>`).join('')}</div>
    <p class="cstat">Twoja obrona: <b>${pdef}</b> · obrona wroga: <b>${e.def}</b>${e.spirit ? ' · <i>upiór</i>' : ''}${e.beast ? ' · <i>zwierzę</i>' : ''}</p>`;
  $('#story').classList.add('instant');
  if (S.fxq.length) { $('#story').insertAdjacentHTML('beforeend', `<div class="fx">${S.fxq.map(f => `<span class="chip ${f.kind}">${esc(f.text)}</span>`).join('')}</div>`); S.fxq = []; }
  const A = combatActions();
  currentChoices = A;
  $('#choices').innerHTML = A.map((a, i) => `<button class="ch combat-ch ${a.cls || ''}" data-i="${i}"><b class="num">${i + 1}</b><span class="txt"><span class="lbl">${a.t}</span></span><span class="tag">${a.tag}</span></button>`).join('');
  $$('#choices .ch').forEach(b => b.addEventListener('click', () => choose(+b.dataset.i)));
  const eb = $('#enemy-bar'); eb.hidden = false;
  $('#enemy-name').textContent = e.n;
  $('#enemy-hp').style.width = Math.max(0, e.hp / e.max * 100) + '%';
  renderSide();
  const n = NODES[S.node];
  mainView.set({ ...sceneSpec(n), enemy: e.fig, fig: null });
  updateMood(n, true);
  const sc = $('.story-col'); sc.scrollTop = 0;
}

function attackRoll(mod, def, dmg, label) {
  const e = S.combat.e, a = d6(), b = d6(), sum = a + b + mod;
  const crit = a + b === 12, hit = crit || (a + b !== 2 && sum >= def);
  if (hit) {
    const dd = crit ? Math.round(dmg * 1.5) + 1 : dmg;
    e.hp -= dd;
    clog(`${label}: <span class="roll">${a}+${b}+${mod}=${sum}</span> – ${crit ? '<b>potężne trafienie!</b> ' : 'trafiasz, '}<b>${dd}</b> obrażeń.`, 'you');
    Snd.sfx.hit(); mainView.hit('255,235,210');
    return dd;
  }
  clog(`${label}: <span class="roll">${a}+${b}+${mod}=${sum}</span> – chybiasz.`, 'you miss');
  return 0;
}

function combatAct(act) {
  const c = S.combat, e = c.e;
  c.def = 0; c.round++;
  let enemyActs = true;
  const end = k => { endFight(k); return true; };
  if (act === 'atak') attackRoll(st(S.weapon.st), e.def, S.weapon.dmg + rnd(0, 2), 'Uderzasz');
  else if (act === 'oslona') { attackRoll(st(S.weapon.st) - 2, e.def, S.weapon.dmg + rnd(0, 1), 'Tniesz ostrożnie'); c.def = 3; }
  else if (act === 'obrona') { c.def = 5; clog('Zasłaniasz się i łapiesz oddech.', 'you'); hp(1); }
  else if (act === 'ogien') {
    if (S.light <= 0) { take('pochodnia'); S.light = TORCH_STEPS; }
    S.light = Math.max(0, S.light - 2);
    const mult = e.beast || e.fireWeak ? 2 : 1;
    const dd = attackRoll(st('zre'), e.def - 1, rnd(3, 5) * mult, 'Pchasz pochodnią');
    if (dd && e.beast) clog('Zwierzę skowyczy i cofa się przed ogniem.', 'you');
  } else if (act === 'sol') {
    take('sol');
    if (e.spirit) { const dd = rnd(7, 10); e.hp -= dd; clog(`Sypiesz solą. ${e.n} wyje, a sól wżera się w niego jak ogień: <b>${dd}</b> obrażeń.`, 'you'); mainView.hit('255,255,255'); }
    else { const dd = rnd(1, 2); e.hp -= dd; clog(`Sól sypie się w oczy, ale niewiele więcej: ${dd}.`, 'you miss'); }
  } else if (act === 'rog') {
    c.horn = true; Snd.sfx.horn();
    if (e.beast) { clog('Róg Dziwisza ryczy w mgle starym, pasterskim głosem. Zwierzę kładzie uszy i ucieka.', 'you'); return end('win'); }
    c.stun = 2; clog(`Róg ryczy. ${e.n} zatacza się, ogłuszony.`, 'you');
  } else if (act === 'glod') {
    const dd = attackRoll(st('sil') + 2, e.def, S.weapon.dmg + 3, 'Rzucasz się z zębami');
    if (dd) { hp(Math.ceil(dd / 2)); }
    znamie(5);
    clog('<span class="szept">…dobrze… smacznie…</span>', 'whisper');
  } else if (act === 'przejrzyj') {
    const a = d6(), b = d6(), sum = a + b + st('wol'), ok = a + b === 12 || (a + b !== 2 && sum >= 10);
    if (ok && e.illusion) { clog(`Przejrzyj: <span class="roll">${a}+${b}+${st('wol')}=${sum}</span>. Mgła w twojej głowie się rozdziera.`, 'you'); return end('dispel'); }
    if (ok) { clog(`Przejrzyj: <span class="roll">${sum}</span>. Patrzysz uważnie. To jest prawdziwe. Bardzo prawdziwe.`, 'you miss'); rozum(-2); }
    else { clog(`Przejrzyj: <span class="roll">${sum}</span>. Nie umiesz oddzielić tego, co jest, od tego, co widzisz.`, 'you miss'); rozum(-3); }
  } else if (act.startsWith('item:')) {
    const id = act.slice(5); useConsumable(id); clog(`Używasz: ${ITEMS[id].n}.`, 'you');
  } else if (act === 'ucieczka') {
    const dc = e.god ? 10 : 9, a = d6(), b = d6(), sum = a + b + st('zre');
    if (a + b === 12 || (a + b !== 2 && sum >= dc)) { clog('Uciekasz.', 'you'); return end('flee'); }
    clog(`Ucieczka: <span class="roll">${sum}</span> – droga zamknięta!`, 'you miss');
  }

  if (e.hp <= 0) {
    clog(`<b>${e.n}</b> pada.`, 'win');
    if (c.queue.length) { nextEnemy(); enemyActs = false; }
    else return end('win');
  }
  if (enemyActs) enemyTurn();
  const fate = checkFate(NODES[S.node]);
  if (fate) { S.combat = null; $('#enemy-bar').hidden = true; return showEnding(fate); }
  renderCombat();
}

function enemyTurn() {
  const c = S.combat, e = c.e;
  if (c.stun > 0) { c.stun--; clog(`${e.n} nie może się pozbierać.`, 'foe miss'); return; }
  if (e.god) whisperHurt(3);
  if (e.atk === 0 && !e.rz) { clog(pick(e.miss), 'foe miss'); return; }
  const pdef = 9 + st('zre') + c.def;
  const a = d6(), b = d6(), sum = a + b + e.atk;
  if (a + b === 12 || (a + b !== 2 && sum >= pdef)) {
    const dd = rnd(e.dmg[0], e.dmg[1]);
    clog(`${pick(e.hit)} <span class="roll">${sum} vs ${pdef}</span>${dd ? ` <b>−${dd}</b>` : ''}`, 'foe');
    if (dd) hp(-dd);
    if (e.rz) whisperHurt(e.rz);
    if (e.god) znamie(3);
  } else clog(`${pick(e.miss)} <span class="roll">${sum} vs ${pdef}</span>`, 'foe miss');
}

function endFight(kind) {
  const c = S.combat;
  if (kind === 'win') S.kills++;
  const target = kind === 'win' ? c.win : kind === 'flee' ? c.flee : (c.dispel || c.win);
  S.combat = null;
  $('#enemy-bar').hidden = true;
  $('#game').classList.remove('combat');
  go(target);
}

/* =====================================================================
   PRZEDMIOTY
   ===================================================================== */
function useConsumable(id) {
  const it = ITEMS[id];
  if (!it || !has(id)) return;
  if (it.use === 'eat') { take(id); hp(it.heal); }
  else if (it.use === 'drink') { take(id); rozum(10); hp(1); }
  else if (it.use === 'chew') { take(id); rozum(15); S.ward = 5; }
  else if (it.use === 'lulek') { take(id); hp(S.hpMax); rozum(-18); znamie(2); setF('lulek_pity'); S.vision = 4; learn('lulek'); }
  else if (it.use === 'light') {
    if (S.light > 0) { fx('Pochodnia jeszcze płonie', ''); return; }
    take(id); S.light = TORCH_STEPS; fx('Pochodnia płonie', 'good');
  }
}

let invSel = null;
function renderInv() {
  const box = $('#inv');
  const ids = Object.keys(S.inv).filter(k => S.inv[k] > 0);
  const order = ['zelazo', 'nic', 'grzechotka', 'pochodnia', 'krzesiwo', 'chleb', 'mieso', 'miod', 'bylica', 'sol', 'lulek', 'lina', 'kij', 'wstazka', 'rog', 'kiel', 'krzyzyk', 'kaptorga', 'mlotek'];
  ids.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  box.innerHTML = ids.map(id => `<button class="item${ITEMS[id].peto ? ' peto' : ''}${invSel === id ? ' sel' : ''}" data-id="${id}" title="${esc(ITEMS[id].n)}">
      <svg viewBox="0 0 24 24"><path d="${ICONS[id] || ICONS.kij}"/></svg>${S.inv[id] > 1 ? `<i>${S.inv[id]}</i>` : ''}</button>`).join('')
    + (ids.length ? '' : '<p class="hint">Pusto.</p>');
  let det = '';
  if (invSel && has(invSel)) {
    const it = ITEMS[invSel];
    const usable = it.use && !S.combat && !busy;
    det = `<div class="inv-detail"><b>${esc(it.n)}</b><p>${esc(it.d)}</p>${usable ? `<button class="btn small" id="inv-use">${{ eat: 'Zjedz', drink: 'Wypij', chew: 'Przeżuj', lulek: 'Wypij wywar', light: 'Zapal' }[it.use]}</button>` : ''}</div>`;
  }
  box.insertAdjacentHTML('beforeend', det);
  $$('#inv .item').forEach(b => b.addEventListener('click', () => { invSel = invSel === b.dataset.id ? null : b.dataset.id; renderInv(); }));
  const u = $('#inv-use');
  if (u) u.addEventListener('click', () => {
    Snd.init();
    useConsumable(invSel);
    const msgs = S.fxq.map(f => f.text).join(' · '); S.fxq = [];
    toast(msgs || 'Gotowe');
    if (!has(invSel)) invSel = null;
    const fate = checkFate(NODES[S.node]);
    if (fate) return showEnding(fate);
    renderSide(); save();
    mainView.set(sceneSpec(NODES[S.node]));
  });
}

/* =====================================================================
   PANEL BOCZNY
   ===================================================================== */
function renderSide() {
  $('#pc-name').textContent = S.name;
  $('#pc-bg').textContent = BACKGROUNDS[S.bg].full;
  $('#v-hp').textContent = `${S.hp}/${S.hpMax}`;
  $('#v-rz').textContent = S.rozum;
  $('#v-zn').textContent = S.znamie;
  $('#b-hp').style.width = (S.hp / S.hpMax * 100) + '%';
  $('#b-rz').style.width = S.rozum + '%';
  $('#b-zn').style.width = S.znamie + '%';
  $('#mh-hp').style.width = (S.hp / S.hpMax * 100) + '%'; $('#mh-rz').style.width = S.rozum + '%'; $('#mh-zn').style.width = S.znamie + '%';
  const mad = 100 - S.rozum, god = S.znamie;
  $('#bs-mad').style.width = mad + '%';
  $('#bs-god').style.width = god + '%';
  const gap = 100 - mad - god;
  const you = $('#bs-you');
  you.style.left = (mad + Math.max(0, gap) / 2) + '%';
  you.classList.toggle('lost', gap <= 0);
  $('#bs-note').textContent = gap <= 0 ? 'granica się zatarła' : gap < 30 ? 'granica cienka' : '';
  document.body.classList.toggle('blurred', gap <= 0);
  $('#stats').innerHTML = Object.keys(STATS).map(k => { const v = st(k), b = S.base[k]; return `<div class="stat${v > b ? ' up' : v < b ? ' down' : ''}"><small>${STATS[k]}</small><b>${v}</b></div>`; }).join('');
  $('#pc-weapon').textContent = `${S.weapon.n} (${S.weapon.dmg}, ${STATS[S.weapon.st]})`;
  $('#pc-light').textContent = S.light > 0 ? `płonie · ${S.light} ${plural(S.light, 'krok', 'kroki', 'kroków')}` : has('pochodnia') ? `zgaszone · pochodnie: ${S.inv.pochodnia}` : 'brak';
  $('#pc-silver').textContent = `${S.silver} ${plural(S.silver, 'dirham', 'dirhamy', 'dirhamów')}`;
  renderInv();
  renderMap();
  renderLore();
}

function renderLore() {
  const box = $('#lore');
  if (!S.lore.length) { box.innerHTML = '<p class="hint">Jeszcze nic nie wiesz. To się zmieni.</p>'; return; }
  const ids = S.lore.filter(id => !(id === 'piesn1' && S.lore.includes('piesn2')));
  box.innerHTML = ids.slice().reverse().map(id => `<div class="lore-e${S.loreSeen.includes(id) ? '' : ' new'}"><h4>${LORE[id].t}</h4><p>${LORE[id].x}</p></div>`).join('');
}

function renderMap() {
  const known = new Set();
  const V = S.visited || {};
  for (const k in V) { known.add(k); for (const a of LOCS[k].adj) known.add(a); }
  if (S.loc) known.add(S.loc);
  const n = NODES[S.node] || {};
  const canTravel = n.hub && !S.combat && !(S.loc === 'mszaniec' && !F('zlecenie')) && (!n.hubIf || n.hubIf());
  const R = (() => { let a = 9; return () => (a = (a * 9301 + 49297) % 233280) / 233280; })();
  let bark = '';
  for (let i = 0; i < 70; i++) { const x = R() * 600, y = R() * 460, w = 6 + R() * 26; bark += `<path d="M${x} ${y}h${w}" stroke="#2a241c" stroke-opacity="${0.15 + R() * 0.35}" stroke-width="${1 + R() * 2.4}" stroke-linecap="round"/>`; }
  let paths = '';
  const done = new Set();
  for (const k in LOCS) for (const a of LOCS[k].adj) {
    const key = [k, a].sort().join('-'); if (done.has(key)) continue; done.add(key);
    if (!known.has(k) || !known.has(a)) continue;
    const A = LOCS[k], B = LOCS[a], vis = V[k] && V[a];
    const mx = (A.x + B.x) / 2 + (A.y - B.y) * 0.08, my = (A.y + B.y) / 2 + (B.x - A.x) * 0.08;
    paths += `<path d="M${A.x} ${A.y}Q${mx} ${my} ${B.x} ${B.y}" class="mpath${vis ? ' vis' : ''}"/>`;
  }
  const glyph = {
    mszaniec: 'M-9 4h18v-8l-9-7-9 7z', skraj: 'M-6 -2a6 6 0 1 1 12 0v4h-12zM-2 -2h.1M2 -2h.1M0 2v8',
    gaj: 'M-3 10v-20h6v20M-3 -6h6M-3 0h6', bagno: 'M-10 0q2.5-3 5 0t5 0 5 0 5 0M-10 5q2.5-3 5 0t5 0 5 0 5 0',
    jar: 'M-10 -6l6 14 4-8 4 8 6-14', krag: 'M-9 6v-8M-4 6v-11M1 6v-11M6 6v-8M-11 6h22',
    oboz: 'M-9 7l9-14 9 14zM0 -7v14', kurhany: 'M-12 7q6-12 12 0M-2 7q7-16 14 0',
  };
  let nodes = '';
  for (const k in LOCS) {
    if (!known.has(k)) continue;
    const L = LOCS[k], vis = V[k], here = S.loc === k;
    const adj = canTravel && LOCS[S.loc] && LOCS[S.loc].adj.includes(k);
    nodes += `<g class="mnode${vis ? ' vis' : ''}${here ? ' here' : ''}${adj ? ' adj' : ''}" data-loc="${k}" transform="translate(${L.x} ${L.y})">
      <circle r="17"/><path d="${glyph[k]}" class="mg"/>
      <text y="34">${vis || adj ? L.n : '???'}</text>${here ? '<circle r="24" class="ring"/>' : ''}</g>`;
  }
  $('#map').innerHTML = `<svg viewBox="0 0 600 460" class="mapsvg"><rect width="600" height="460" rx="14" class="bark"/>${bark}
    <text x="300" y="34" class="mtitle">Uroczysko</text><path d="M560 400l0-30m0 0l-6 10m6-10l6 10" class="rose"/><text x="560" y="422" class="mn">pn.</text>
    ${paths}${nodes}</svg>`;
  $$('#map .mnode.adj').forEach(g => g.addEventListener('click', () => { if (busy) return; Snd.init(); travel(g.dataset.loc); }));
  $('#map-hint').textContent = canTravel ? 'Kliknij sąsiednie miejsce, by tam pójść. Droga zajmuje czas.' : 'Podróżować możesz, gdy stoisz na rozdrożu danego miejsca.';
}

/* =====================================================================
   SCENA I NASTRÓJ
   ===================================================================== */
function sceneSpec(n) {
  const k = n.sc || (LOCS[S.loc] && LOCS[S.loc].sc) || 'mgla';
  let fogAmt = 0.55;
  if (k === 'osada' || k === 'ognisko') fogAmt = 0.42;
  if (k === 'skraj' || k === 'mgla') fogAmt = 0.8;
  if (k === 'kurhany' || k === 'bagno') fogAmt = 0.75;
  if (k === 'chata') fogAmt = 0;
  if (k === 'gardziel' || k === 'serce') fogAmt = 0.35;
  if (F('idol') && k === 'gaj') fogAmt = 0.3;
  const flagsKey = k === 'gaj' ? `${F('idol')}${F('wstazka_wzieta')}` : k === 'bagno' ? `${F('topielec_done')}${F('sul_done')}` : k === 'serce' ? `${F('peta_polozone')}` : k === 'kurhan' ? `${has('grzechotka')}` : '';
  return {
    k, variant: n.variant, depth: n.depth, dark: !!n.dark, tod: phaseIdx(), lit: !!n.dark && S.litNow,
    fig: resolveId(n.fig) || null, rozum: S.rozum, znamie: S.znamie, fogAmt, flagsKey, enemy: null,
  };
}
function updateScene(n) {
  $('#enemy-bar').hidden = true;
  mainView.set(sceneSpec(n));
}
function updateMood(n, combat) {
  const k = (n.sc || (LOCS[S.loc] && LOCS[S.loc].sc) || 'mgla'), tod = phaseIdx();
  const m = { wind: 0.5, drone: 0.25, fire: 0, drip: 0, birds: 0, owls: 0, village: 0, deep: 0 };
  const forest = ['puszcza', 'mgla', 'skraj', 'gaj', 'bagno', 'jar', 'krag', 'oboz', 'kurhany'];
  if (k === 'osada') Object.assign(m, { wind: 0.35, village: tod < 2 ? 1 : 0.4, birds: tod < 2 ? 0.4 : 0, owls: tod === 3 ? 0.6 : 0, drone: 0.12 });
  else if (k === 'chata') Object.assign(m, { wind: 0.1, fire: 1, village: 0.35, drone: 0.08 });
  else if (k === 'ognisko') Object.assign(m, { wind: 0.3, fire: 1, owls: 0.7, drone: 0.15 });
  else if (forest.includes(k)) Object.assign(m, { wind: 0.65, birds: tod < 3 ? 0.8 : 0, owls: tod === 3 ? 1 : 0.15, drone: k === 'kurhany' ? 0.5 : 0.3, deep: k === 'kurhany' ? 0.3 : 0 });
  else if (k === 'kurhan' || k === 'kosci' || k === 'zerca') Object.assign(m, { wind: 0.05, drip: 1, drone: 0.6, deep: 0.45 });
  else if (k === 'wrota') Object.assign(m, { wind: 0.4, drone: 0.6, deep: 0.55 });
  else if (k === 'gardziel') Object.assign(m, { wind: 0, drone: 0.9, deep: 0.7 + (n.depth || 0) * 0.04, drip: 0.3 });
  else if (k === 'serce') Object.assign(m, { wind: 0, drone: 1, deep: 1 });
  m.whisper = S.rozum < 70 ? (70 - S.rozum) / 70 : 0;
  if (k === 'kosci' || k === 'gardziel' || k === 'serce') m.whisper = Math.max(m.whisper, 0.5);
  m.heart = Math.max(S.rozum < 35 ? (35 - S.rozum) / 35 : 0, S.hp < S.hpMax * 0.3 ? 0.7 : 0, combat ? 0.35 : 0);
  m.red = S.znamie / 100;
  if (combat) m.drone = Math.max(m.drone, 0.6);
  Snd.setMood(m);
}

/* =====================================================================
   ZAKOŃCZENIA
   ===================================================================== */
function getEndings() { try { return JSON.parse(localStorage.getItem(END_KEY) || '[]'); } catch { return []; } }
function showEnding(id) {
  const E = ENDINGS[id];
  const got = getEndings();
  if (!got.includes(id)) { got.push(id); try { localStorage.setItem(END_KEY, JSON.stringify(got)); } catch { } }
  try { localStorage.removeItem(SAVE_KEY); } catch { }
  busy = false;
  const text = ENDING_TEXT[id] ? ENDING_TEXT[id]() : '';
  $('#end-title').textContent = E.t;
  $('#end-sub').textContent = E.sub;
  $('#end-text').innerHTML = fmtParas(text).join('');
  $$('#end-text > p').forEach((p, i) => p.style.animationDelay = (0.6 + i * 0.5) + 's');
  const peta = Object.keys(S.petaEver).length;
  $('#end-stats').innerHTML = [
    ['Dzień', Math.min(S.day, 4)], ['Pokonani', S.kills], ['Pęta', `${peta}/3`],
    ['Wiedza', `${S.lore.filter(l => l !== 'piesn1' || !S.lore.includes('piesn2')).length}/${Object.keys(LORE).length - 1}`],
    ['Rozum', S.rozum], ['Znamię', S.znamie],
  ].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join('');
  $('#end-list').innerHTML = `<h4>Odkryte zakończenia: ${got.length}/${ENDING_ORDER.length}</h4>` + ENDING_ORDER.map(k => `<span class="${got.includes(k) ? 'got' : ''}${k === id ? ' cur' : ''}">${got.includes(k) ? ENDINGS[k].t : '???'}</span>`).join('');
  show('ending');
  const tone = E.tone;
  endView.set({ k: E.sc, tod: tone === 'dawn' ? 0 : tone === 'mist' ? 1 : tone === 'red' ? 2 : 3, fig: id === 'zak_wilk' ? 'wilczyca' : (id === 'zak_pasterz' || id === 'zak_czwarte') ? 'pasterz' : id === 'zak_goraczka' ? 'starucha' : null, rozum: id === 'zak_obled' ? 10 : 100, znamie: tone === 'red' ? 70 : 0, fogAmt: tone === 'dawn' ? 0.35 : 0.8, dark: false });
  Snd.setMood({ wind: 0.4, drone: tone === 'dawn' ? 0.1 : 0.5, fire: id === 'zak_goraczka' ? 0.8 : 0, drip: 0, birds: tone === 'dawn' ? 1 : 0, owls: 0, village: tone === 'dawn' ? 0.6 : 0, deep: tone === 'red' || tone === 'dark' ? 0.6 : 0, whisper: id === 'zak_obled' ? 0.8 : 0, heart: 0, red: tone === 'red' ? 0.6 : 0 });
  renderTitleEndings();
}

/* =====================================================================
   ZAPIS
   ===================================================================== */
function save() {
  if (!S || S.combat) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ ...S, fxq: [] })); } catch { }
}
function load() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s && s.v === 1 ? s : null; } catch { return null; }
}

/* =====================================================================
   EKRANY
   ===================================================================== */
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  if (titleView) titleView.active = id === 'title';
  if (endView) endView.active = id === 'ending';
  if (mainView) mainView.active = id === 'game';
}

let toastT = 0;
function toast(t) {
  const el = $('#toast'); el.textContent = t; el.hidden = false; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.hidden = true, 300); }, 2200);
}

function renderTitleEndings() {
  const got = getEndings();
  $('#title-endings').innerHTML = got.length ? `Odkryte zakończenia: <b>${got.length}/${ENDING_ORDER.length}</b> · ${got.map(k => ENDINGS[k].t).join(' · ')}` : '';
  $('#btn-continue').hidden = !load();
}

let chosenBg = 'wareg';
function buildCreate() {
  $('#bg-cards').innerHTML = Object.entries(BACKGROUNDS).map(([id, B]) => `
    <button class="bg-card${id === chosenBg ? ' sel' : ''}" data-bg="${id}">
      <h3>${B.n}</h3><div class="bg-full">${B.full}</div>
      <p>${B.d}</p>
      <div class="bg-stats">${Object.keys(STATS).map(k => `<span><small>${STATS[k]}</small><b>${B.st[k]}</b></span>`).join('')}</div>
      <div class="bg-meta">Zdrowie ${B.hp} · ${B.weapon.n} (${B.weapon.dmg})</div>
      <div class="bg-perk">${B.perk}</div>
    </button>`).join('');
  $$('.bg-card').forEach(c => c.addEventListener('click', () => {
    Snd.init(); Snd.sfx.click();
    const prevDefault = BACKGROUNDS[chosenBg].name;
    chosenBg = c.dataset.bg;
    $$('.bg-card').forEach(x => x.classList.toggle('sel', x === c));
    const inp = $('#in-name');
    if (!inp.value.trim() || inp.value.trim() === prevDefault) inp.value = BACKGROUNDS[chosenBg].name;
  }));
  $('#in-name').value = BACKGROUNDS[chosenBg].name;
}

function startNew() {
  const name = ($('#in-name').value.trim() || BACKGROUNDS[chosenBg].name).slice(0, 16);
  S = newState(chosenBg, name);
  invSel = null;
  $('#lore-new').hidden = true;
  show('game');
  go('prolog1');
}

function continueGame() {
  const s = load(); if (!s) return;
  S = s; S.fxq = []; S.combat = null;
  invSel = null;
  show('game');
  const id = S.node; S.seen[id] = Math.max(0, (S.seen[id] || 1) - 1);
  render(NODES[id]); S.seen[id]++;
}

function loadSettings() {
  try { Object.assign(SET, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch { }
  applySettings();
}
function applySettings() {
  ['sound', 'fast', 'calm'].forEach(k => { const a = $('#opt-' + k), b = $('#m-' + k); if (a) a.checked = SET[k]; if (b) b.checked = SET[k]; });
  Snd.setOn(SET.sound);
  Scene.setCalm(SET.calm);
  document.body.classList.toggle('calm', SET.calm);
  $('#btn-sound').classList.toggle('off', !SET.sound);
  try { localStorage.setItem(SET_KEY, JSON.stringify(SET)); } catch { }
}

/* =====================================================================
   START
   ===================================================================== */
function init() {
  mainView = Scene.view($('#scene'), { amb: $('#scene-amb') });
  titleView = Scene.view($('#title-bg'), { always: true });
  endView = Scene.view($('#ending-bg'), { always: true });
  titleView.set({ k: 'puszcza', tod: 2, fig: 'wilczyca', rozum: 100, znamie: 0, fogAmt: 0.7 });
  loadSettings();
  buildCreate();
  renderTitleEndings();
  show('title');

  $('#btn-new').addEventListener('click', () => { Snd.init(); Snd.sfx.click(); show('create'); Snd.setMood({ wind: 0.6, drone: 0.2, owls: 0.8 }); });
  $('#btn-continue').addEventListener('click', () => { Snd.init(); Snd.sfx.click(); continueGame(); });
  $('#btn-back').addEventListener('click', () => show('title'));
  $('#btn-go').addEventListener('click', () => { Snd.init(); Snd.sfx.click(); startNew(); });
  $('#in-name').addEventListener('keydown', e => { if (e.key === 'Enter') startNew(); });
  $('#btn-again').addEventListener('click', () => { buildCreate(); show('create'); });
  $('#btn-end-title').addEventListener('click', () => { renderTitleEndings(); show('title'); });

  const bindOpt = (id, k) => $(id).addEventListener('change', e => { SET[k] = e.target.checked; Snd.init(); applySettings(); });
  ['sound', 'fast', 'calm'].forEach(k => { bindOpt('#opt-' + k, k); bindOpt('#m-' + k, k); });
  $('#btn-sound').addEventListener('click', () => { SET.sound = !SET.sound; Snd.init(); applySettings(); });
  $('#btn-menu').addEventListener('click', () => { $('#menu').hidden = false; });
  $('#m-close').addEventListener('click', () => { $('#menu').hidden = true; });
  $('#m-title').addEventListener('click', () => { $('#menu').hidden = true; save(); renderTitleEndings(); show('title'); });

  $$('.tab').forEach(t => t.addEventListener('click', () => {
    $$('.tab').forEach(x => x.classList.toggle('active', x === t));
    $$('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + t.dataset.tab));
    if (t.dataset.tab === 'lore' && S) { $('#lore-new').hidden = true; setTimeout(() => { S.loreSeen = [...S.lore]; }, 1500); }
  }));

  $('#story').addEventListener('click', () => $('#story').classList.add('instant'));

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    const gameOn = $('#game').classList.contains('active');
    if (e.key === 'Escape') { if (gameOn) $('#menu').hidden = !$('#menu').hidden; return; }
    if (e.key === 'm' || e.key === 'M') { SET.sound = !SET.sound; Snd.init(); applySettings(); return; }
    if (!gameOn || !$('#menu').hidden) return;
    if (e.key === ' ') { e.preventDefault(); $('#story').classList.add('instant'); if (!$('#dice').hidden) $('#dice').click(); return; }
    const k = parseInt(e.key, 10);
    if (k >= 1 && k <= 9) { e.preventDefault(); choose(k - 1); }
  });
}

document.addEventListener('DOMContentLoaded', init);
