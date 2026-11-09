/* Retorta – interfejs aplikacji */
'use strict';
(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const liczba = (x, d) => (x).toFixed(d === undefined ? 1 : d).replace('.', ',');
  const Rys = R.Rys;

  /* ---------- stan i zapis ---------- */
  const ST = { widok: 'start', dawka: 2, kat: 'wszystko', szukaj: '', speed: 1, tryb: 'piaskownica', zad: null, zadStart: 0, hint: 0, cele: [], mapa: null, prob: 0, koniec: false, tryb2: null, wszystkie: false, cichy: false };
  const KLUCZ = 'retorta-postep-v1';
  let P = { gw: {}, odk: {}, dzwiek: true, pomoc: false };
  try { const s = JSON.parse(localStorage.getItem(KLUCZ) || 'null'); if (s) P = Object.assign(P, s); } catch (e) { }
  const zapisz = () => { try { localStorage.setItem(KLUCZ, JSON.stringify(P)); } catch (e) { } };
  R.Snd.wlaczony = P.dzwiek !== false;

  /* ---------- toasty i obserwacje ---------- */
  function toast(txt, typ, ms) {
    const t = h('div', 'toast ' + (typ || ''), txt); $('#toasty').appendChild(t);
    setTimeout(() => { t.classList.add('znika'); setTimeout(() => t.remove(), 400); }, ms || 3800);
    while ($('#toasty').children.length > 4) $('#toasty').firstChild.remove();
  }
  let obsTimer = null;
  function obserwacja(txt, eq, zle) {
    const box = $('#obserwacja'); box.innerHTML = '';
    const o = h('div', 'obs' + (zle ? ' zle' : ''), esc(txt) + (eq ? `<span class="rw">${R.fmtEq(eq)}</span>` : ''));
    box.appendChild(o);
    clearTimeout(obsTimer);
    obsTimer = setTimeout(() => { o.classList.add('znika'); }, Math.max(4500, txt.length * 55));
  }
  function wpis(v, txt, eq, typ) {
    const ol = $('#dziennik'); const p = ol.querySelector('.puste'); if (p) p.remove();
    const i = R.naczynia.indexOf(v);
    const li = h('li', typ || '', `<span class="lit">${i >= 0 ? String.fromCharCode(65 + i) : '·'}</span>${esc(txt)}${eq ? `<span class="rw">${R.fmtEq(eq)}</span>` : ''}`);
    ol.prepend(li);
    while (ol.children.length > 90) ol.lastChild.remove();
  }
  function pustyDziennik() { $('#dziennik').innerHTML = '<li class="puste">Tu pojawią się Twoje obserwacje i równania reakcji. Dodaj coś do naczynia!</li>'; }

  /* ---------- zdarzenia z silnika ---------- */
  const DZW = { 'osad:': 'plop', 'test:pyk': 'pyk', 'r:spalanie:Mg': 'blysk', 'r:Na-woda': 'syk', 'r:K-woda': 'wybuch', 'r:Li-woda': 'syk', 'r:slon': 'wybuch', 'r:pryskanie': 'blad', 'r:waz': 'syk', 'r:spalanie': 'zapal', 'r:zloty-deszcz': 'odkrycie', 'r:zegar': 'ding', 'r:lustro': 'szklo' };
  R.onEvent = function (ev, v, pokaz) {
    const o = R.ODKI[ev.key];
    if (o && !P.odk[ev.key]) {
      P.odk[ev.key] = Date.now(); zapisz(); liczniki();
      toast(`✨ <b>Nowe odkrycie!</b><br>${esc(o.n)}`, 'odk', 4200); R.Snd.graj('odkrycie');
    }
    if (!pokaz || ST.cichy) return;
    const zle = ev.key === 'r:pryskanie';
    wpis(v, ev.txt, ev.eq, zle ? 'zle' : '');
    if (ST.widok === 'lab') obserwacja(ev.txt, ev.eq, zle);
    for (const k in DZW) if (ev.key.startsWith(k)) { R.Snd.graj(DZW[k]); break; }
  };

  /* ---------- widoki ---------- */
  function pokaz(w) {
    ST.widok = w;
    document.body.classList.toggle('lab', w === 'lab');
    $$('.widok').forEach(s => s.classList.toggle('aktywny', s.id === 'w-' + w));
    $$('#nawigacja button').forEach(b => b.classList.toggle('on', b.dataset.widok === w));
    if (w === 'zadania') renderZadania();
    if (w === 'ksiega') renderKsiega();
    if (w === 'uklad') renderUklad();
    if (w === 'lab') { requestAnimationFrame(() => { Rys.resize(); }); if (!P.pomoc) { P.pomoc = true; zapisz(); setTimeout(pomoc, 300); } }
  }
  $$('#nawigacja button').forEach(b => b.onclick = () => { R.Snd.init(); if (b.dataset.widok === 'lab' && !R.naczynia.length) piaskownica(); else pokaz(b.dataset.widok); });
  $('#logo').onclick = () => pokaz('start');
  $('#startZadania').onclick = () => { R.Snd.init(); pokaz('zadania'); };
  $('#startLab').onclick = () => { R.Snd.init(); piaskownica(); };
  $('#bDzwiek').onclick = () => { R.Snd.init(); R.Snd.wlaczony = !R.Snd.wlaczony; P.dzwiek = R.Snd.wlaczony; zapisz(); $('#bDzwiek').textContent = R.Snd.wlaczony ? '🔊' : '🔇'; };
  $('#bDzwiek').textContent = R.Snd.wlaczony ? '🔊' : '🔇';
  $('#bPomoc').onclick = pomoc;

  function liczniki() {
    const gw = Object.values(P.gw).reduce((s, x) => s + x, 0);
    $('#lGwiazdki').textContent = gw;
    const odk = R.ODKRYCIA.filter(o => P.odk[o.key]).length;
    $('#lOdkrycia').textContent = `${odk}/${R.ODKRYCIA.length}`;
    const zrob = R.ZADANIA.filter(z => P.gw[z.id]).length;
    $('#startPostep').textContent = `${zrob} / ${R.ZADANIA.length}`;
    const c = $$('.cechy b'); c[0].textContent = R.REAG.filter(r => !r.ukryty).length; c[1].textContent = R.ZADANIA.length; c[2].textContent = R.ODKRYCIA.length; c[3].textContent = R.EL.length;
  }

  /* ---------- modal ---------- */
  function modal(html, opcje) {
    const m = $('#modal'); m.querySelector('.tresc').innerHTML = html; m.hidden = false;
    const zam = () => { m.hidden = true; if (opcje && opcje.onClose) opcje.onClose(); };
    m.querySelector('.zamknij').onclick = zam;
    m.onclick = e => { if (e.target === m && !(opcje && opcje.trwaly)) zam(); };
    m.querySelector('.zamknij').hidden = !!(opcje && opcje.bezZamkniecia);
    return m.querySelector('.tresc');
  }
  const zamknijModal = () => { $('#modal').hidden = true; };
  function pomoc() {
    modal(`<h2>Jak korzystać z laboratorium</h2>
      <ol class="pomoc-kroki">
        <li><b>Zaznacz naczynie</b> – kliknij je na stole (zielona ramka) albo naciśnij <kbd>1</kbd>–<kbd>5</kbd>.</li>
        <li><b>Wybierz porcję</b> pod półką, a potem <b>kliknij odczynnik</b> – trafi do zaznaczonego naczynia. Możesz też przeciągnąć go prosto na wybrane naczynie.</li>
        <li>Pod każdym naczyniem: 🔥 palnik, 🧊 łaźnia lodowa, 🥄 mieszanie, 🔗 rurka do gazu, ⤵ przelewanie, 🗑 wylewanie.</li>
        <li>Na dole masz <b>narzędzia badawcze</b>: łuczywka, papierek wskaźnikowy, wodę wapienną, nos, słomkę i drucik do próby płomieniowej.</li>
        <li>Czekanie na wrzenie się dłuży? Użyj <b>⏩×10</b>. <kbd>Spacja</kbd> to pauza.</li>
        <li>Po prawej widzisz <b>skład naczynia</b>, temperaturę, pH, <b>widok cząsteczkowy</b> i <b>dziennik</b> z równaniami reakcji.</li>
      </ol>
      <p>Wszystkie reakcje liczy silnik chemiczny – możesz łączyć odczynniki dowolnie, nie tylko tak jak w zadaniach. Każde nowe zjawisko trafia do Księgi odkryć.</p>
      <div class="stopka"><button class="btn glowny" id="pomocOk">Do dzieła!</button></div>`);
    $('#pomocOk').onclick = zamknijModal;
  }

  /* ---------- laboratorium: przygotowanie ---------- */
  function ustawLab(typy) {
    R.naczynia.length = 0; Rys.stan = {};
    typy.forEach(t => R.naczynia.push(new R.Naczynie(t)));
    Rys.wybrany = 0; ST.tryb2 = null; $('#baner').hidden = true;
    pustyDziennik(); $('#obserwacja').innerHTML = '';
    renderKontrolki(); renderPolka();
  }
  function piaskownica() {
    ST.tryb = 'piaskownica'; ST.zad = null; ST.mapa = null;
    $('#kartaZadania').hidden = true;
    ustawLab(['zlewka', 'probowka', 'probowka', 'tygiel']);
    $('#wszystkieWrap').hidden = true;
    pokaz('lab');
  }

  /* ---------- półka ---------- */
  function listaReag() {
    if (ST.tryb === 'zadanie' && ST.zad) {
      const z = ST.zad;
      const ids = [...(z.reag || [])];
      if (!(z.tajne || []).includes('woda') && !ids.includes('woda')) ids.unshift('woda');
      let lista = ids.map(id => R.REAGI[id]).filter(Boolean);
      if (ST.mapa) lista = Object.keys(ST.mapa).map(l => ({ id: 'X' + l, n: 'Roztwór ' + l, f: '?', cat: 'inne', kind: 'r', col: '#e9eef6', tajny: true, real: R.REAGI[ST.mapa[l]], opis: 'Tajemniczy, bezbarwny roztwór z zamazaną etykietą. Zbadaj go!' })).concat(lista);
      if (ST.wszystkie && !ST.mapa) R.REAG.forEach(r => { if (!r.ukryty && !lista.includes(r)) lista.push(r); });
      return lista;
    }
    return R.REAG.filter(r => !r.ukryty);
  }
  function hazHTML(r) { const S = { zraca: '⚗', tox: '☠', utl: 'O', palny: '🔥', srod: '🐟', szk: '!', zdr: '✱' }; return (r.haz || []).length ? `<span class="haz">${r.haz.map(x => `<i title="${R.HAZ[x][0]}"><span>${S[x]}</span></i>`).join('')}</span>` : ''; }
  function renderPolka() {
    const kat = $('#kategorie'); kat.innerHTML = '';
    const lista = listaReag();
    const kats = R.KATEGORIE.filter(([k]) => k === 'wszystko' || lista.some(r => r.cat === k));
    if (!kats.find(k => k[0] === ST.kat)) ST.kat = 'wszystko';
    kats.forEach(([k, n]) => { const b = h('button', ST.kat === k ? 'on' : '', n); b.onclick = () => { ST.kat = k; renderPolka(); }; kat.appendChild(b); });
    const L = $('#listaOdcz'); L.innerHTML = '';
    const q = ST.szukaj.trim().toLowerCase();
    lista.filter(r => (ST.kat === 'wszystko' || r.cat === ST.kat) && (!q || r.n.toLowerCase().includes(q) || (r.f || '').toLowerCase().includes(q))).forEach(r => {
      const b = h('div', 'odcz' + (r.tajny ? ' tajny' : ''));
      b.setAttribute('role', 'button'); b.tabIndex = 0; b.draggable = true;
      const kind = r.kind === 's' ? 's' : r.kind === 'm' ? 'm' : r.kind === 'w' ? 'w' : 'r';
      b.innerHTML = `<span class="but ${kind}" style="background:${r.col}"></span><div><div class="nm">${esc(r.n)}</div><div class="wz">${r.f && r.f !== '?' ? `<span>${R.fmt(r.f)}</span>` : (r.tajny ? '<span>?</span>' : '')}${r.stez ? `<span>${esc(r.stez)}</span>` : ''}${hazHTML(r)}</div></div><button class="info" title="Informacje" aria-label="Informacje">i</button>`;
      b.onclick = e => { if (e.target.closest('.info')) { infoOdcz(r); return; } R.Snd.init(); dodajOdczynnik(r, Rys.wybrany); };
      b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dodajOdczynnik(r, Rys.wybrany); } };
      b.ondragstart = e => { e.dataTransfer.setData('text/plain', r.id); e.dataTransfer.effectAllowed = 'copy'; };
      L.appendChild(b);
    });
    if (!L.children.length) L.innerHTML = '<p style="color:var(--przyg);padding:10px">Nic nie znaleziono.</p>';
    const D = $('#dawki'); D.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const b = h('button', ST.dawka === i ? 'on' : '', `<b>${R.DAWKI.r[i][1]}</b>${R.DAWKI.s[i][1]}`);
      b.onclick = () => { ST.dawka = i; renderPolka(); }; D.appendChild(b);
    }
  }
  $('#szukaj').oninput = e => { ST.szukaj = e.target.value; renderPolka(); };
  $('#wszystkieOdcz').onchange = e => { ST.wszystkie = e.target.checked; renderPolka(); };
  function znajdzReag(id) { return listaReag().find(r => r.id === id) || R.REAGI[id]; }
  function infoOdcz(r) {
    if (r.tajny) { modal(`<h2>${esc(r.n)}</h2><p>${esc(r.opis)}</p><p>Etykieta jest zamazana. Użyj wskaźników, odczynników i narzędzi, żeby ustalić, co to za substancja.</p>`); return; }
    const forma = { r: 'roztwór wodny', s: 'ciało stałe', m: 'metal', w: 'wskaźnik (krople)', o: 'ciecz niemieszająca się z wodą', e: 'ciecz', k: 'stężony kwas' }[r.kind];
    const M = r.s ? R.M(r.s) : (r.f ? R.masa(r.f) : 0);
    modal(`<h2>${esc(r.n)}</h2>
      <p style="font-size:20px;margin:0 0 8px">${r.f ? R.fmt(r.f) : ''}</p>
      <p>${esc(r.opis || '')}</p>
      <table class="ei-tab"><tr><td>Postać</td><td>${forma}</td></tr>${r.stez ? `<tr><td>Stężenie</td><td>${esc(r.stez)}</td></tr>` : ''}${M ? `<tr><td>Masa molowa</td><td>${liczba(M, 2)} g/mol</td></tr>` : ''}${r.ind ? `<tr><td>Barwy</td><td>${esc(R.IND[r.ind].zakres)}</td></tr>` : ''}</table>
      ${(r.haz || []).length ? `<h4>Zagrożenia (piktogramy GHS)</h4><div class="info-haz">${r.haz.map(x => `<div>${hazHTML({ haz: [x] })} <b>${R.HAZ[x][0]}</b> – ${R.HAZ[x][1]}</div>`).join('')}</div>` : '<p>Bez szczególnych zagrożeń.</p>'}`);
  }

  /* ---------- dodawanie odczynników ---------- */
  function dodajOdczynnik(r, vi) {
    const v = R.naczynia[vi];
    if (!v) { toast('Najpierw postaw naczynie przyciskiem „＋ Naczynie”.', 'warn'); return; }
    const real = r.real || r;
    const msg = R.dodaj(v, real, ST.dawka);
    const stale = real.kind === 's' || real.kind === 'm';
    Rys.nalej(v, real.kind === 'w' ? '#ffffff' : (r.tajny ? '#e9eef6' : real.col), stale);
    R.Snd.graj(stale ? 'sypnij' : (ST.dawka === 0 || real.kind === 'w') ? 'kropla' : 'nalej');
    if (msg) { toast(msg, 'warn', 6000); if (msg.startsWith('NIEBEZP')) { obserwacja(msg, null, true); R.Snd.graj('blad'); } }
    R.emit(v, 'akcja:dodaj:' + real.id, null, null);
    Rys.wybrany = vi; renderKontrolki();
  }
  const cv = $('#cv');
  cv.addEventListener('dragover', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); Rys.hover = Rys.trafienie(e.clientX - r.left, e.clientY - r.top); });
  cv.addEventListener('dragleave', () => { Rys.hover = -1; });
  cv.addEventListener('drop', e => {
    e.preventDefault(); const r = cv.getBoundingClientRect(); const i = Rys.trafienie(e.clientX - r.left, e.clientY - r.top); Rys.hover = -1;
    const id = e.dataTransfer.getData('text/plain'); const reag = znajdzReag(id);
    if (i >= 0 && reag) { R.Snd.init(); dodajOdczynnik(reag, i); }
  });
  cv.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); Rys.hover = Rys.trafienie(e.clientX - r.left, e.clientY - r.top); cv.style.cursor = Rys.hover >= 0 ? 'pointer' : 'default'; });
  cv.addEventListener('pointerleave', () => Rys.hover = -1);
  cv.addEventListener('click', e => {
    R.Snd.init();
    const r = cv.getBoundingClientRect(); const i = Rys.trafienie(e.clientX - r.left, e.clientY - r.top);
    if (i < 0) return;
    if (ST.tryb2) { celTrybu2(i); return; }
    Rys.wybrany = i; renderKontrolki(); R.Snd.graj('klik');
  });

  /* ---------- kontrolki naczyń ---------- */
  function renderKontrolki() {
    const K = $('#kontrolki'); K.innerHTML = '';
    R.naczynia.forEach((v, i) => {
      const g = h('div', 'kn' + (i === Rys.wybrany ? ' wyb' : ''));
      const btn = (ik, tyt, cls, fn) => { const b = h('button', cls || '', ik); b.title = tyt; b.setAttribute('aria-label', tyt); b.onclick = e => { e.stopPropagation(); R.Snd.init(); fn(b); }; g.appendChild(b); return b; };
      btn('🔥', 'Palnik: zapal / zgaś', v.burner ? 'on' : '', () => { v.burner = !v.burner; if (v.burner) { v.ice = false; R.emit(v, 'akcja:palnik', null, null); R.Snd.graj('zapal'); } else R.Snd.graj('zgas'); renderKontrolki(); });
      btn('🧊', 'Łaźnia lodowa', 'lod' + (v.ice ? ' on' : ''), () => { v.ice = !v.ice; if (v.ice) v.burner = false; renderKontrolki(); });
      btn('🥄', 'Mieszaj bagietką', '', () => { v.stir = 3; R.emit(v, 'akcja:mieszaj', null, null); R.Snd.graj('szklo'); });
      btn('🔗', v.tube != null ? 'Odłącz rurkę' : 'Rurka: poprowadź gaz z tego naczynia do innego', 'rur' + (v.tube != null ? ' on' : ''), () => {
        if (v.tube != null) { v.tube = null; renderKontrolki(); return; }
        if (R.naczynia.length < 2) { toast('Potrzebujesz co najmniej dwóch naczyń.', 'warn'); return; }
        tryb2('rurka', v, 'Kliknij naczynie, do którego ma płynąć gaz');
      });
      btn('⤵', 'Przelej / przesyp zawartość do innego naczynia', '', () => {
        if (R.naczynia.length < 2) { toast('Potrzebujesz co najmniej dwóch naczyń.', 'warn'); return; }
        tryb2('przelej', v, 'Kliknij naczynie, do którego chcesz przelać');
      });
      btn('🗑', 'Wylej zawartość i umyj naczynie', '', () => { R.wylej(v); Rys.stan[v.id] = null; R.Snd.graj('nalej'); });
      btn('✕', 'Zabierz naczynie ze stołu', '', () => {
        R.naczynia.forEach(x => { if (x.tube === v.id) x.tube = null; });
        R.naczynia.splice(i, 1); if (Rys.wybrany >= R.naczynia.length) Rys.wybrany = Math.max(0, R.naczynia.length - 1); renderKontrolki();
      });
      g.onclick = () => { Rys.wybrany = i; renderKontrolki(); };
      K.appendChild(g);
    });
    if (!R.naczynia.length) K.innerHTML = '<div class="kn" style="color:var(--przyg);font-size:13px;padding:10px">Brak naczyń na stole.</div>';
  }
  function tryb2(typ, src, txt) {
    ST.tryb2 = { typ, src };
    const b = $('#baner'); b.hidden = false; b.innerHTML = `${txt} <button>Anuluj</button>`;
    b.querySelector('button').onclick = () => { ST.tryb2 = null; b.hidden = true; };
  }
  function celTrybu2(i) {
    const { typ, src } = ST.tryb2; const cel = R.naczynia[i];
    ST.tryb2 = null; $('#baner').hidden = true;
    if (cel === src) { toast('Wybierz inne naczynie.', 'warn'); return; }
    if (typ === 'rurka') { src.tube = cel.id; toast(`🔗 Gaz z naczynia ${String.fromCharCode(65 + R.naczynia.indexOf(src))} popłynie rurką do naczynia ${String.fromCharCode(65 + i)}.`, 'ok'); }
    else { const m = R.przelej(src, cel); if (m) toast(m, m.startsWith('Przelano') ? '' : 'warn'); else { R.Snd.graj('nalej'); Rys.nalej(cel, '#cfe8ff', false); } Rys.wybrany = i; }
    renderKontrolki();
  }

  /* ---------- narzędzia ---------- */
  const EF = { zarzace: 'zarzace', plonace: 'plonace', papierek: 'papierek', wapienna: 'wapienna', nos: 'nos' };
  $$('#narzedzia .narz').forEach(b => {
    const n = b.dataset.n;
    if (n === 'slomka') {
      let int = null;
      const start = e => { e.preventDefault(); R.Snd.init(); const v = R.naczynia[Rys.wybrany]; if (!v) return; const m = R.dmuchnij(v, 0.00004); if (m) { toast(m, 'warn'); return; } Rys.narzedzie(v, 'slomka'); R.Snd.graj('dmuch'); b.classList.add('trzym'); int = setInterval(() => { const w = R.naczynia[Rys.wybrany]; if (!w) return; R.dmuchnij(w, 0.000015); Rys.narzedzie(w, 'slomka'); if (Math.random() < 0.3) R.Snd.graj('dmuch'); }, 250); };
      const stop = () => { clearInterval(int); int = null; b.classList.remove('trzym'); };
      b.addEventListener('pointerdown', start); b.addEventListener('pointerup', stop); b.addEventListener('pointerleave', stop); b.addEventListener('pointercancel', stop);
      return;
    }
    b.onclick = () => {
      R.Snd.init();
      const v = R.naczynia[Rys.wybrany]; if (!v) { toast('Najpierw zaznacz naczynie.', 'warn'); return; }
      if (n === 'drucik') {
        ST.cichy = true; const r = R.probaPlomienia(v); ST.cichy = false;
        Rys.narzedzie(v, 'plomien', { kol: r.kol }); R.Snd.graj('zapal');
        obserwacja(r.txt); wpis(v, r.txt, null, 'test'); return;
      }
      ST.cichy = true; const r = R.test(v, n); ST.cichy = false;
      Rys.narzedzie(v, r.efekt === 'pyk' ? 'plonace' : r.efekt === 'wapienna0' ? 'wapienna0' : EF[n], { efekt: r.efekt, kol: r.kol });
      R.Snd.graj(r.efekt === 'pyk' ? 'pyk' : r.efekt === 'gasnie' ? 'zgas' : r.efekt === 'rozblysk' ? 'zapal' : 'klik');
      obserwacja(r.txt, r.eq); wpis(v, r.txt, r.eq, 'test');
    };
  });
  $$('.czas button').forEach(b => b.onclick = () => { ST.speed = +b.dataset.s; $$('.czas button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#bDodajN').onclick = e => { e.stopPropagation(); $('#menuN').hidden = !$('#menuN').hidden; };
  document.addEventListener('click', e => { if (!e.target.closest('.dodajN')) $('#menuN').hidden = true; });
  $$('#menuN button').forEach(b => b.onclick = () => {
    $('#menuN').hidden = true;
    if (R.naczynia.length >= 5) { toast('Na stole mieści się najwyżej 5 naczyń.', 'warn'); return; }
    R.naczynia.push(new R.Naczynie(b.dataset.t)); Rys.wybrany = R.naczynia.length - 1; renderKontrolki(); R.Snd.graj('szklo');
  });
  $('#bWyczysc').onclick = () => { R.naczynia.forEach(v => { R.wylej(v); Rys.stan[v.id] = null; }); R.Snd.graj('nalej'); };
  $('#bCzyscDz').onclick = pustyDziennik;
  document.addEventListener('keydown', e => {
    if (ST.widok !== 'lab' || e.target.matches('input, select, textarea') || !$('#modal').hidden) return;
    if (e.key >= '1' && e.key <= '5' && R.naczynia[+e.key - 1]) { Rys.wybrany = +e.key - 1; renderKontrolki(); }
    else if (e.key === ' ') { e.preventDefault(); const b = ST.speed === 0 ? $$('.czas button')[1] : $$('.czas button')[0]; b.click(); }
    else if (e.key === 'Escape' && ST.tryb2) { ST.tryb2 = null; $('#baner').hidden = true; }
  });

  /* ---------- inspektor ---------- */
  function fmtIl(n) { const mm = n * 1000; return mm >= 100 ? Math.round(mm) + ' mmol' : mm >= 1 ? liczba(mm, 1) + ' mmol' : mm >= 0.01 ? liczba(mm, 2) + ' mmol' : (mm * 1000 < 1 ? '< 0,001 mmol' : liczba(mm * 1000, 1) + ' µmol'); }
  function fmtC(c) { return c >= 0.1 ? liczba(c, 2) : c >= 0.001 ? liczba(c, 3) : c.toExponential(1).replace('.', ','); }
  function renderInspektor() {
    const box = $('#insNaczynie'); const v = R.naczynia[Rys.wybrany];
    if (!v) { box.innerHTML = '<p style="color:var(--przyg)">Brak zaznaczonego naczynia.</p>'; return; }
    const op = (ST.zad && ST.zad.opcje) || {};
    const lit = String.fromCharCode(65 + Rys.wybrany);
    const obj = v.liq + v.oil;
    let html = `<div class="in-tyt"><h3>${lit} · ${R.VT[v.typ].n}</h3></div>
      <div class="miary"><div class="miara"><small>Temperatura</small><b style="color:${v.T > 60 ? '#ff8a66' : v.T < 12 ? '#7cc8ff' : 'inherit'}">${Math.round(v.T)} °C</b></div>
      <div class="miara"><small>Ciecz</small><b>${obj < 0.05 ? (obj > 0 ? '< 0,1' : '0') : liczba(obj, obj < 10 ? 1 : 0)} cm³</b></div>
      <div class="miara"><small>pH</small><b>${op.bezPH ? '🔒' : v.pH === null ? '–' : liczba(v.pH, 1)}</b></div></div>`;
    if (!op.bezPH && v.pH !== null) {
      const p = Math.max(0, Math.min(14, v.pH));
      html += `<div class="phbar"><i style="left:${p / 14 * 100}%"></i></div><div class="phskala"><span>0 kwasowy</span><span>7 obojętny</span><span>zasadowy 14</span></div>`;
    } else if (op.bezPH) html += `<div class="phskala" style="justify-content:flex-start">pH-metr wyłączony w tym zadaniu – użyj wskaźników albo papierka.</div>`;
    const gazy = Object.keys(v.head).filter(g => v.head[g] > 1.5e-5 && R.GAZ[g] && g !== 'H2O');
    if (gazy.length && !op.ukryj) html += `<div class="gazy">${gazy.map(g => `<span title="${esc(R.GAZ[g].opis)}">💨 ${R.fmt(g)} nad cieczą</span>`).join('')}</div>`;
    if (op.ukryj) html += `<div class="zamek">🔍 <b>Jesteś detektywem!</b> Skład naczyń jest ukryty. Wnioskuj z tego, co widzisz: barw, osadów, gazów, zapachów i płomieni.<br><br><button class="btn maly" id="bOdp">🕵️ Podaj odpowiedź</button></div>`;
    else {
      const sk = R.sklad(v); const gr = { kat: [], an: [], mol: [], wsk: [], sol: [] };
      sk.forEach(x => gr[x.typ].push(x));
      const wiersz = x => `<div class="sk"><div><span class="f">${R.fmt(x.f || x.sp)}</span> <span class="n">${esc(x.nazwa)}</span></div><div class="il">${x.typ === 'sol' ? (x.g >= 0.01 ? liczba(x.g, 2) + ' g' : liczba(x.g * 1000, 1) + ' mg') : x.typ === 'wsk' ? Math.round(x.n) + ' kr.' : fmtIl(x.n) + (x.c ? ` · ${fmtC(x.c)} M` : '')}</div></div>`;
      const sek = (t, a) => a.length ? `<h4>${t}</h4>` + a.sort((p, q) => q.n - p.n).map(wiersz).join('') : '';
      const wodaW = v.liq > 0.05 ? `<div class="sk"><div><span class="f">H<sub>2</sub>O</span> <span class="n">woda (rozpuszczalnik)</span></div><div class="il">${liczba(Math.max(0, v.liq - v.etoh), 1)} cm³</div></div>` : '';
      const olejW = v.oil > 0.01 ? `<div class="sk"><div><span class="f">olej</span> <span class="n">${v.emul > 0.5 ? 'emulsja' : 'warstwa na wierzchu'}</span></div><div class="il">${liczba(v.oil, 1)} cm³</div></div>` : '';
      const tresc = sek('Kationy', gr.kat) + sek('Aniony', gr.an) + sek('Cząsteczki', gr.mol) + sek('Wskaźniki', gr.wsk) + sek('Ciała stałe i osady', gr.sol);
      html += `<div class="sklad">${wodaW || olejW || tresc ? '<h4>Rozpuszczalnik</h4>' + (wodaW + olejW || '<div class="sk"><span class="n">brak – naczynie suche</span></div>') + tresc : '<p style="color:var(--przyg);font-size:13px">Naczynie jest puste. Kliknij odczynnik na półce, aby go dodać.</p>'}</div>`;
    }
    box.innerHTML = html;
    const bo = $('#bOdp'); if (bo) bo.onclick = odpowiedz;
    $('#sekMikro').style.display = op.ukryj ? 'none' : '';
  }

  /* ---------- zadania: lista ---------- */
  function gwiazdkiHTML(n, max) { let s = ''; for (let i = 0; i < (max || 3); i++) s += i < n ? '⭐' : '<span class="pusta">⭐</span>'; return s; }
  function renderZadania() {
    const box = $('#listaZadan'); box.innerHTML = '';
    R.ROZDZIALY.forEach(rz => {
      const zs = R.ZADANIA.filter(z => z.r === rz.id);
      const zgw = zs.reduce((s, z) => s + (P.gw[z.id] || 0), 0);
      const d = h('div', 'rozdz');
      d.innerHTML = `<div class="rozdz-tyt"><span class="ik">${rz.ik}</span><div><h3>${rz.n}</h3><p>${rz.opis}</p></div><span class="postep">⭐ ${zgw} / ${zs.length * 3}</span></div>`;
      const g = h('div', 'siatka-zad');
      zs.forEach(z => {
        const b = h('button', 'zad' + (P.gw[z.id] ? ' zrob' : ''), `<span class="nr">Zadanie ${z.nr}${z.tajne ? ' · zagadka' : ''}</span><span class="t">${esc(z.t)}</span><span class="gw">${gwiazdkiHTML(P.gw[z.id] || 0)}</span>`);
        b.onclick = () => { R.Snd.init(); startZadanie(z); };
        g.appendChild(b);
      });
      d.appendChild(g); box.appendChild(d);
    });
  }

  /* ---------- zadania: przebieg ---------- */
  function tasuj(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
  function startZadanie(z) {
    ST.tryb = 'zadanie'; ST.zad = z; ST.hint = 0; ST.prob = 0; ST.koniec = false; ST.wszystkie = false; $('#wszystkieOdcz').checked = false;
    ST.mapa = null;
    if (z.tajne) { const l = tasuj(z.tajne); ST.mapa = {}; l.forEach((id, i) => ST.mapa[String.fromCharCode(65 + i)] = id); }
    ST.cele = (z.cele || []).map(() => false);
    ST.kat = 'wszystko'; ST.szukaj = ''; $('#szukaj').value = '';
    ustawLab(z.nacz);
    ST.zadStart = performance.now();
    $('#wszystkieWrap').hidden = !!z.tajne;
    renderKarta(); pokaz('lab');
  }
  function renderKarta() {
    const k = $('#kartaZadania'); const z = ST.zad;
    if (!z) { k.hidden = true; return; }
    k.hidden = false;
    const rz = R.ROZDZIALY.find(r => r.id === z.r);
    const wsk = z.wsk && ST.hint > 0 ? z.wsk.slice(0, ST.hint).map(x => `💡 ${esc(x)}`).join('<br>') : '';
    k.innerHTML = `<div class="kz-gora"><span class="ik">${rz.ik}</span><div><small>Zadanie ${z.nr} · ${rz.n}</small><h3>${esc(z.t)}</h3></div>
      <div class="akcje">${z.wsk && ST.hint < z.wsk.length ? '<button class="btn maly" id="kzHint">💡 Podpowiedź</button>' : ''}${z.tajne ? '<button class="btn maly glowny" id="kzOdp">🕵️ Odpowiedz</button>' : ''}<button class="btn maly" id="kzRestart" title="Zacznij od nowa">↺</button><button class="btn maly" id="kzZwin" title="Zwiń/rozwiń">▾</button><button class="btn maly" id="kzWyjdz">Lista zadań</button></div></div>
      <p class="kz-op">${esc(z.op)}</p>
      ${z.cele ? `<ul class="kz-cele">${z.cele.map((c, i) => `<li class="${ST.cele[i] ? 'ok' : ''}">${esc(c[0])}</li>`).join('')}</ul>` : ''}
      ${wsk ? `<div class="kz-wsk">${wsk}</div>` : ''}`;
    const hb = $('#kzHint'); if (hb) hb.onclick = () => { ST.hint++; renderKarta(); };
    const ob = $('#kzOdp'); if (ob) ob.onclick = odpowiedz;
    $('#kzRestart').onclick = () => startZadanie(z);
    $('#kzWyjdz').onclick = () => pokaz('zadania');
    $('#kzZwin').onclick = () => k.classList.toggle('zwin');
  }
  function ctxZad() {
    const t0 = ST.zadStart; const evs = R.log.filter(e => e.real >= t0);
    const pasuje = (e, key) => key.endsWith('*') ? e.key.startsWith(key.slice(0, -1)) : e.key === key;
    return {
      vs: R.naczynia,
      ev: (key, pred) => evs.some(e => pasuje(e, key) && (!pred || pred(e.data || {}))),
      evs: key => evs.filter(e => pasuje(e, key)),
      ile: pref => new Set(evs.filter(e => e.key.startsWith(pref)).map(e => e.key)).size,
      ind: (v, i) => { if (!v.aq['w:' + i] || v.pH === null) return null; const k = R.IND[i].kol(v.pH); return k ? k[0] : 'bezbarwny'; }
    };
  }
  function sprawdzZadanie() {
    const z = ST.zad; if (!z || ST.koniec || !z.cele) return;
    const c = ctxZad();
    if (z.porazka && z.porazka(c)) {
      ST.koniec = true;
      setTimeout(() => {
        modal(`<h2>⚠️ Ups – kwas prysnął!</h2><p>W prawdziwej pracowni mogłoby się to skończyć poparzeniem. Zapamiętaj: <b>„Pamiętaj, chemiku młody, wlewaj zawsze kwas do wody”</b>.</p><div class="stopka"><button class="btn glowny" id="pzOd">↺ Spróbuj jeszcze raz</button></div>`, { trwaly: true });
        $('#pzOd').onclick = () => { zamknijModal(); startZadanie(z); };
      }, 900);
      return;
    }
    let zm = false;
    z.cele.forEach((cl, i) => { if (!ST.cele[i]) { let ok = false; try { ok = !!cl[1](c); } catch (e) { } if (ok) { ST.cele[i] = true; zm = true; R.Snd.graj('ding'); toast('✔ ' + esc(cl[0]), 'ok', 2600); } } });
    if (zm) renderKarta();
    if (ST.cele.every(Boolean)) { ST.koniec = true; setTimeout(() => ukonczone(), 1200); }
  }
  function ukonczone(trafione) {
    const z = ST.zad;
    let gw = 1 + (ST.hint === 0 ? 1 : 0);
    R.Snd.graj('sukces');
    const zapiszGw = n => { if ((P.gw[z.id] || 0) < n) { P.gw[z.id] = n; zapisz(); } liczniki(); };
    const nast = R.ZADANIA[R.ZADANIA.indexOf(z) + 1];
    const stopka = `<div class="stopka"><button class="btn" id="ukLab">Zostań w laboratorium</button><button class="btn" id="ukLista">Lista zadań</button>${nast ? `<button class="btn glowny" id="ukDalej">Dalej: ${esc(nast.t)} →</button>` : ''}</div>`;
    const podpnij = () => {
      $('#ukLab').onclick = () => { zamknijModal(); };
      $('#ukLista').onclick = () => { zamknijModal(); pokaz('zadania'); };
      const d = $('#ukDalej'); if (d) d.onclick = () => { zamknijModal(); startZadanie(nast); };
    };
    if (z.tajne) {
      gw += ST.prob <= 1 ? 1 : 0; zapiszGw(gw);
      modal(`<h2>🕵️ Zagadka rozwiązana!</h2><div class="gw-duze">${gwiazdkiHTML(gw).replace(/⭐/g, '<span>⭐</span>')}</div><p class="wyj">${esc(z.wyj)}</p>${stopka}`);
      podpnij(); return;
    }
    const q = z.quiz;
    const opcje = q ? tasuj(q[1].map((t, i) => ({ t, ok: i === 0 }))) : [];
    modal(`<h2>🎉 Zadanie wykonane!</h2><div class="gw-duze" id="ukGw">${gwiazdkiHTML(gw).replace(/⭐/g, '<span>⭐</span>')}</div>
      <p class="wyj">${esc(z.wyj)}</p>
      ${q ? `<div class="quiz"><h4>❓ Pytanie za gwiazdkę: ${esc(q[0])}</h4><div class="opcje">${opcje.map((o, i) => `<button data-i="${i}">${esc(o.t)}</button>`).join('')}</div></div>` : ''}
      <div id="ukStopka" ${q ? 'hidden' : ''}>${stopka}</div>`);
    if (!q) { zapiszGw(gw); podpnij(); return; }
    zapiszGw(gw);
    $$('.quiz .opcje button').forEach(b => b.onclick = () => {
      const o = opcje[+b.dataset.i];
      $$('.quiz .opcje button').forEach((x, i) => { x.disabled = true; if (opcje[i].ok) x.classList.add('dobra'); });
      if (o.ok) { gw++; R.Snd.graj('odkrycie'); } else { b.classList.add('zla'); R.Snd.graj('blad'); }
      zapiszGw(gw);
      $('#ukGw').innerHTML = gwiazdkiHTML(gw).replace(/⭐/g, '<span>⭐</span>');
      $('#ukStopka').hidden = false; podpnij();
    });
  }
  function odpowiedz() {
    const z = ST.zad; if (!z || !z.tajne) return;
    const kand = z.tajne.map(id => R.REAGI[id]);
    const litery = Object.keys(ST.mapa);
    const t = modal(`<h2>🕵️ Co jest w roztworach?</h2><p>Przypisz każdemu roztworowi substancję. Każda występuje dokładnie raz.</p>
      ${litery.map(l => `<div class="odp-wiersz"><b>Roztwór ${l}</b><select data-l="${l}"><option value="">– wybierz –</option>${kand.map(r => `<option value="${r.id}">${esc(r.n)}</option>`).join('')}</select></div>`).join('')}
      <p id="odpWynik"></p><div class="stopka"><button class="btn" id="odpAnul">Badam dalej</button><button class="btn glowny" id="odpOk">Sprawdź</button></div>`);
    $('#odpAnul').onclick = zamknijModal;
    $('#odpOk').onclick = () => {
      const sel = [...t.querySelectorAll('select')];
      if (sel.some(s => !s.value)) { $('#odpWynik').textContent = 'Uzupełnij wszystkie pola.'; return; }
      ST.prob++;
      const dobre = sel.filter(s => ST.mapa[s.dataset.l] === s.value).length;
      if (dobre === sel.length) { ST.koniec = true; zamknijModal(); setTimeout(() => ukonczone(), 200); }
      else { R.Snd.graj('blad'); $('#odpWynik').innerHTML = `<b style="color:var(--czer)">Poprawnie: ${dobre} z ${sel.length}.</b> Zbadaj roztwory jeszcze raz i spróbuj ponownie.`; }
    };
  }

  /* ---------- księga odkryć ---------- */
  function renderKsiega() {
    const box = $('#ksiega'); box.innerHTML = '';
    R.KAT_ODK.forEach(([k, n, ik]) => {
      const lst = R.ODKRYCIA.filter(o => o.kat === k);
      const ile = lst.filter(o => P.odk[o.key]).length;
      const d = h('div', 'ks-kat');
      d.innerHTML = `<h3>${ik} ${n} <small>${ile} / ${lst.length}</small><span class="pasek"><i style="width:${ile / lst.length * 100}%"></i></span></h3>`;
      const g = h('div', 'ks-siatka');
      lst.forEach(o => {
        const ma = !!P.odk[o.key];
        const kol = o.kol ? `background:${o.kol}` : 'background:rgba(255,255,255,0.07)';
        const c = h('div', 'ks' + (ma ? '' : ' zakryte'), `<span class="kol" style="${kol}">${o.kol ? '' : (ma ? (o.ik || '✓') : '?')}</span><div><div class="nm">${ma ? esc(o.n) : '???'}</div><div class="h">${ma ? (o.opis ? esc(o.opis) : '') : '💡 ' + esc(o.hint)}</div></div>`);
        g.appendChild(c);
      });
      d.appendChild(g); box.appendChild(d);
    });
  }

  /* ---------- układ okresowy ---------- */
  let elWyb = 'Na';
  function renderUklad() {
    const box = $('#uklad'); if (box.children.length) { pokazEl(elWyb); return; }
    const siatka = {};
    R.EL.forEach(e => siatka[e.wiersz + '-' + e.kol] = e);
    for (let w = 1; w <= 10; w++) {
      if (w === 8) { box.appendChild(h('div', 'przerwa')); continue; }
      for (let k = 1; k <= 18; k++) {
        const e = siatka[w + '-' + k];
        if (!e) {
          if ((w === 6 || w === 7) && k === 3) { const m = h('div', 'el znacznik', w === 6 ? '57–71' : '89–103'); box.appendChild(m); continue; }
          if (w >= 9 && k <= 2) { box.appendChild(h('div', 'el pusty')); continue; }
          box.appendChild(h('div', 'el pusty')); continue;
        }
        const b = h('button', 'el', `<span class="z">${e.z}</span><b>${e.sym}</b><small>${e.n}</small>`);
        b.style.background = R.KAT[e.kat][1]; b.dataset.s = e.sym; b.title = `${e.n} (${e.sym})`;
        b.onclick = () => pokazEl(e.sym);
        box.appendChild(b);
      }
    }
    const lg = $('#legenda'); lg.innerHTML = Object.values(R.KAT).map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('');
    pokazEl(elWyb);
  }
  function powloki(z) { const cap = [2, 8, 8, 2]; const out = []; let r = z; for (const c of cap) { if (r <= 0) break; out.push(Math.min(c, r)); r -= c; } return out; }
  function pokazEl(sym) {
    elWyb = sym; const e = R.ELS[sym];
    $$('#uklad .el').forEach(b => b.classList.toggle('on', b.dataset.s === sym));
    const re = new RegExp(sym + '(?![a-z])');
    const reag = R.REAG.filter(r => !r.ukryty && r.f && re.test(r.f));
    let bohr = '';
    if (e.z <= 20) {
      const pw = powloki(e.z); const R0 = 14;
      bohr = `<svg viewBox="-80 -80 160 160" width="150" height="150" style="display:block;margin:6px auto">` + `<circle r="${R0 - 4}" fill="${R.KAT[e.kat][1]}"/><text y="4" text-anchor="middle" font-size="10" font-weight="800" fill="#10192a">${e.sym}</text>` +
        pw.map((n, i) => { const rr = R0 + 14 * (i + 1); let s = `<circle r="${rr}" fill="none" stroke="rgba(200,220,255,.3)"/>`; for (let j = 0; j < n; j++) { const a = j / n * Math.PI * 2 - Math.PI / 2; s += `<circle cx="${Math.cos(a) * rr}" cy="${Math.sin(a) * rr}" r="3.4" fill="#5ef2c0"/>`; } return s; }).join('') + '</svg>';
      bohr += `<p style="text-align:center;margin:0;color:var(--przyg);font-size:13px">Powłoki: ${powloki(e.z).map((n, i) => 'KLMN'[i] + n).join(' · ')}</p>`;
    }
    $('#elInfo').innerHTML = `<div class="ei-gora"><div class="ei-sym" style="background:${R.KAT[e.kat][1]}"><span>${e.z}</span><b>${e.sym}</b><span>${liczba(e.m, e.m > 200 ? 0 : 2)}</span></div><div><h3>${e.n}</h3><span style="color:var(--przyg)">${R.KAT[e.kat][0]}</span></div></div>
      <table class="ei-tab"><tr><td>Liczba atomowa</td><td>${e.z}</td></tr><tr><td>Masa atomowa</td><td>${liczba(e.m, 3)} u</td></tr><tr><td>Okres</td><td>${e.okres}</td></tr><tr><td>Grupa</td><td>${e.gr || (e.kat === 'l' ? '3 (lantanowce)' : '3 (aktynowce)')}</td></tr><tr><td>Stan w 20 °C</td><td>${e.stan}</td></tr><tr><td>Protony / elektrony</td><td>${e.z} / ${e.z}</td></tr></table>
      ${bohr}
      <h4 style="margin:12px 0 6px">Na półce w laboratorium</h4>${reag.length ? `<div class="ei-reag">${reag.map(r => `<span>${R.fmt(r.f)} – ${esc(r.n)}</span>`).join('')}</div>` : '<p style="color:var(--przyg);font-size:13px">Brak odczynników z tym pierwiastkiem.</p>'}`;
  }

  /* ---------- pętla ---------- */
  let ost = performance.now(), tIns = 0, tZad = 0;
  function petla(t) {
    const dt = Math.min(0.05, (t - ost) / 1000); ost = t;
    if (ST.widok === 'lab') {
      if (ST.speed > 0) R.krok(dt * ST.speed);
      Rys.rysuj(dt);
      tIns += dt; tZad += dt;
      if (tIns > 0.25) { tIns = 0; renderInspektor(); }
      const v = R.naczynia[Rys.wybrany];
      if (!(ST.zad && ST.zad.opcje && ST.zad.opcje.ukryj)) R.Mikro.rysuj($('#mikro'), v, dt);
      if (tZad > 0.4) { tZad = 0; sprawdzZadanie(); }
      let bul = 0, pal = 0; R.naczynia.forEach(x => { bul += x.bub * 30 + x.bubIn * 20 + x.steam * 0.6; if (x.burner) pal += 0.07; });
      R.Snd.poziomy(Math.min(0.2, bul), pal);
    } else R.Snd.poziomy(0, 0);
    requestAnimationFrame(petla);
  }
  window.addEventListener('resize', () => Rys.resize());
  Rys.init(cv);
  liczniki();
  pustyDziennik();
  requestAnimationFrame(petla);
  window.RetortaApp = { ST, startZadanie, piaskownica, pokaz, dodajOdczynnik };
})();
