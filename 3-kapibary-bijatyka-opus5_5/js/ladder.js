'use strict';
/* Bagienne Mistrzostwa: turniej jednego gracza. Trzech rywali na kolejnych arenach (komputer Łatwy, Średni,
   Trudny), a w finale Złota wersja twojej kapibary na poziomie Mistrz. Punkty, powtórka przegranej walki
   i medal na karcie postaci za wygrany turniej. */

const LADDER_ENDINGS = {
  kapi: 'Kapitan Kapi wraca nad Amazonkę ze złotym pasem. Rzeka kłania mu się teraz jeszcze niżej.',
  yuzu: 'Mama Yuzu wiesza złoty pas nad balią. Od dziś kąpiel dla mistrzów jest za darmo.',
  cien: 'Cień Trzciny odebrał złoty pas i zniknął. Nikt nie widział, jak wychodził z areny.',
  bruno: 'Gruby Bruno świętuje mistrzostwo podwójnym obiadem. I deserem. I drugim deserem.',
};

// Odmiana wyglądu: futro przemieszane z kolorem (Złoty boss, druga kapibara w walce lustrzanej)
const ALT_LOOKS = new Map();
function altLook(L, tint, k) {
  const key = L.fur + tint + k;
  if (ALT_LOOKS.has(key)) return ALT_LOOKS.get(key);
  const a = Object.assign({}, L);
  for (const c of ['fur', 'furDark', 'furBack', 'belly']) if (typeof L[c] === 'string') a[c] = mixColor(L[c], tint, k);
  ALT_LOOKS.set(key, a);
  return a;
}

const Ladder = {
  run: null,

  medals() { return Store.get('ladder', {}); },

  start(ci) {
    const others = CHARACTERS.map((_, i) => i).filter(i => i !== ci);
    for (let i = others.length - 1; i > 0; i--) { const j = randInt(0, i); [others[i], others[j]] = [others[j], others[i]]; }
    const ch = CHARACTERS[ci];
    this.run = {
      ci, i: 0, score: 0, tries: 1, last: null,
      steps: others.map((o, k) => ({ opp: o, cpu: k, stage: k % STAGES.length }))
        .concat([{ opp: ci, cpu: 3, stage: randInt(0, STAGES.length - 1), boss: true,
          variant: { tint: '#ffcf3f', k: 0.5, hpMul: 1.1, name: (ch.she ? 'Złota ' : 'Złoty ') + ch.name } }]),
    };
    this.show();
  },

  step() { return this.run.steps[this.run.i]; },

  fight() {
    const s = this.step();
    App.startFight({ mode: 'cpu', chars: [this.run.ci, s.opp], stage: s.stage, cpu: s.cpu, ladder: true,
      variants: [null, s.variant || null] });
  },

  onEnd(res, g) {
    const r = this.run, p = g.fighters[0], won = res.winner === p;
    if (won) {
      const pts = p.stats.dmg + 60 * p.stats.maxCombo + (p.hp >= p.maxHp ? 1000 : 0) + (res.finisher ? 800 : 0) + 500 * (r.i + 1);
      r.score += pts;
      r.last = { won: true, pts };
      r.i++;
      if (r.i >= r.steps.length) {
        const m = this.medals(), id = CHARACTERS[r.ci].id;
        r.best = !m[id] || r.score > m[id];
        if (r.best) { m[id] = r.score; Store.set('ladder', m); }
        r.done = true;
      }
    } else r.last = { won: false };
    App.game = null;
    this.show();
  },

  retry() { this.run.tries++; this.fight(); },

  show() {
    const r = this.run, me = CHARACTERS[r.ci];
    const rows = r.steps.map((s, k) => {
      const ch = CHARACTERS[s.opp], name = s.variant ? s.variant.name : ch.name;
      const st = k < r.i ? 'won' : k === r.i && !r.done ? 'now' : '';
      const lvl = s.boss ? 'FINAŁ · Mistrz' : `Walka ${k + 1} · ${AI_LEVELS[s.cpu]}`;
      return `<div class="lad-step ${st}"><canvas width="120" height="120" data-ch="${s.opp}" data-boss="${s.boss ? 1 : ''}"></canvas>
        <div><small>${lvl}</small><b>${name}</b><span>${STAGES[s.stage].name}</span></div>
        <i>${k < r.i ? '✔' : ''}</i></div>`;
    }).join('');
    let head, body, btns;
    if (r.done) {
      head = 'MISTRZ BAGIEN!';
      body = `<p class="lad-end">${LADDER_ENDINGS[me.id]}</p><p class="lad-score">Wynik: <b>${r.score}</b> pkt · próby: ${r.tries}${r.best ? ' · <b>nowy rekord!</b>' : ''}</p>`;
      btns = `<button class="btn" data-lad="again">Jeszcze raz</button><button class="btn" data-lad="quit">Menu</button>`;
    } else {
      const s = this.step(), rival = CHARACTERS[s.opp];
      const res = r.last ? (r.last.won ? `<p class="lad-res win">Wygrana! +${r.last.pts} pkt</p>` : '<p class="lad-res lose">Przegrana. Spróbuj jeszcze raz!</p>') : '';
      head = 'Bagienne Mistrzostwa';
      this.quoteI = randInt(0, rival.quotes.length - 1);
      body = `${res}<p class="lad-taunt"><b>${s.variant ? s.variant.name : rival.name}:</b> „${rival.quotes[this.quoteI]}”</p>
        <p class="lad-score">Twoja kapibara: <b>${me.name}</b> · punkty: <b>${r.score}</b></p>`;
      btns = r.last && !r.last.won
        ? `<button class="btn" data-lad="retry">Spróbuj ponownie</button><button class="btn" data-lad="quit">Wyjdź z turnieju</button>`
        : `<button class="btn" data-lad="fight">${s.boss ? 'Walcz w finale!' : 'Walcz!'}</button><button class="btn" data-lad="quit">Wyjdź z turnieju</button>`;
    }
    $('lad-body').innerHTML = `<h1 class="scr-title">${head}</h1><div class="lad-steps">${rows}</div>${body}<nav class="menu-list row">${btns}</nav>`;
    $('lad-body').querySelectorAll('[data-lad]').forEach(b => {
      b.addEventListener('click', () => { Sfx.unlock(); this.act(b.dataset.lad); });
      b.addEventListener('mousemove', () => UI.setFocusEl(b));
    });
    $('lad-body').querySelectorAll('canvas').forEach(c => {
      const ch = CHARACTERS[+c.dataset.ch];
      const L = c.dataset.boss ? altLook(ch.look, '#ffcf3f', 0.5) : ch.look;
      const x = c.getContext('2d');
      x.fillStyle = c.dataset.boss ? '#3a2a08' : shade(ch.color, -0.6);
      x.beginPath(); x.arc(60, 60, 58, 0, TAU); x.fill();
      drawCapyHead(x, L, 58, 74, 0.62, false, { t: 0 });
    });
    UI.prev = [];
    UI.show('ladder');
    if (r.done) { Music.play('victory'); Voice.line('win_' + me.id, `${me.name} wygrywa!`); }
    else {
      Music.play('menu');
      // rywal rzuca zaczepkę swoim głosem
      const rival = CHARACTERS[this.step().opp], qi = this.quoteI;
      setTimeout(() => { if (UI.screen === 'ladder' && CapyVoice.enabled && Sfx.ok()) Rec.play(`${rival.id}_win_${qi + 1}`, Sfx.voGain); }, 500);
    }
  },

  act(a) {
    Sfx.play('confirm');
    if (a === 'fight') this.fight();
    else if (a === 'retry') this.retry();
    else if (a === 'again') this.start(this.run.ci);
    else if (a === 'quit') { this.run = null; App.quit(); }
  },
};
