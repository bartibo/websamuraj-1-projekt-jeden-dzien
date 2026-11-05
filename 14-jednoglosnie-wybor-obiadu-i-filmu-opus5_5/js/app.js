/* Jednogłośnie – logika aplikacji: ekrany, pokój, głosy, dopasowania, wirtualni znajomi. */
(function () {
  'use strict';

  const ONLINE = 'https://projekty.vibemaster.pl/14-jednoglosnie-wybor-obiadu-i-filmu-opus5_5/';
  const { OBIADY, FILMY, GATUNKI, EMOJI_AWATARY, losujPseudonim } = window.DANE;
  const POLSKIE = new Set(['f-dzienswira', 'f-mis', 'f-seksmisja', 'f-bozecialo', 'f-pianista', 'f-psy', 'f-chlopaki',
    'f-kiler', 'f-rejs', 'f-samiswoi', 'f-zimnawojna', 'f-ida', 'f-bogowie', 'f-chlopi', 'f-salasamobojcow']);
  const LIMITY = [0, 120, 300, 600];
  const MAX_DOD = 10;
  const RODZAJE = {
    obiad: { tytul: 'Co jemy?', emoji: '🍽️', zach: 'Pomóż wybrać, co jemy! Przesuwaj propozycje w prawo albo w lewo:' },
    film: { tytul: 'Co oglądamy?', emoji: '🍿', zach: 'Pomóż wybrać film na wieczór! Przesuwaj propozycje w prawo albo w lewo:' },
    wlasne: { tytul: 'Co wybieramy?', emoji: '💡', zach: 'Pomóż nam wybrać! Przesuwaj propozycje w prawo albo w lewo:' },
  };
  const BOTY = [
    { pid: 'botania', name: 'Ania', emoji: '🦊', za: 1500 },
    { pid: 'botkuba', name: 'Kuba', emoji: '🐻', za: 4200 },
    { pid: 'botzosia', name: 'Zosia', emoji: '🐼', za: 7400 },
  ];
  const PID_RE = /^[a-z0-9]{4,16}$/;
  const ROOM_RE = /^[a-z0-9-]{6,24}$/;
  const ITEM_RE = /^[ofw]-[a-z0-9-]{1,24}$/;
  const ALFABET = 'abcdefghjkmnpqrstuvwxyz23456789';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  /* ---------- drobiazgi ---------- */
  function losId(n) {
    const a = crypto.getRandomValues(new Uint8Array(n));
    return [...a].map(x => ALFABET[x % ALFABET.length]).join('');
  }
  function mieszaj(a, rnd) {
    rnd = rnd || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function hash(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function odm(n, f) {
    if (n === 1) return f[0];
    const d = n % 10, s = n % 100;
    return (d >= 2 && d <= 4 && !(s >= 12 && s <= 14)) ? f[1] : f[2];
  }
  const OSOBA = ['osoba', 'osoby', 'osób'];
  const PROP = ['propozycja', 'propozycje', 'propozycji'];
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function txt(s, max) { return typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : ''; }
  function num(n, a, b) { return typeof n === 'number' && isFinite(n) ? Math.max(a, Math.min(b, n)) : 0; }

  function ls(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null');
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  /* W trybie testowym (#…&test=1) tożsamość żyje tylko w tej karcie – można udawać drugą osobę. */
  function idStore(k, v) {
    if (!hashParams().test) return ls(k, v);
    try {
      if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null');
      if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  function hashParams() {
    const o = {};
    for (const part of location.hash.replace(/^#/, '').split('&')) {
      const [k, v] = part.split('=');
      if (k) o[decodeURIComponent(k)] = decodeURIComponent(v || '1');
    }
    return o;
  }
  function profil() {
    if (hashParams().test) return losujPseudonim();
    let p = ls('jg:profil');
    if (!p || !p.name) { p = losujPseudonim(); ls('jg:profil', p); }
    return p;
  }

  /* ---------- dźwięk ---------- */
  let ac = null;
  let dzwiekOn = ls('jg:dzwiek') !== false;
  function ton(f, t0, dl, typ, gl, f2) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = typ || 'sine';
    o.frequency.setValueAtTime(f, ac.currentTime + t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, ac.currentTime + t0 + dl);
    g.gain.setValueAtTime(0.0001, ac.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(gl || 0.15, ac.currentTime + t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t0 + dl);
    o.connect(g).connect(ac.destination);
    o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + dl + 0.05);
  }
  function dzwiek(r) {
    if (!dzwiekOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      if (r === 'tak') { ton(620, 0, 0.09, 'sine', 0.12, 760); ton(930, 0.06, 0.12, 'sine', 0.1); }
      else if (r === 'nie') { ton(260, 0, 0.14, 'triangle', 0.12, 170); }
      else if (r === 'wejscie') { ton(520, 0, 0.1, 'sine', 0.07); ton(780, 0.08, 0.14, 'sine', 0.07); }
      else if (r === 'cofnij') { ton(500, 0, 0.12, 'sine', 0.08, 330); }
      else if (r === 'dopasowanie') {
        [523, 659, 784, 1047, 1319].forEach((f, i) => ton(f, i * 0.09, 0.5, 'triangle', 0.13));
        [1047, 1319, 1568].forEach(f => ton(f, 0.5, 0.9, 'sine', 0.06));
        ton(130, 0, 0.6, 'sine', 0.18, 65);
      }
    } catch (e) { /* bez dźwięku */ }
  }
  function wibruj(w) { try { if (navigator.vibrate) navigator.vibrate(w); } catch (e) {} }

  /* ---------- toasty ---------- */
  function toast(t) {
    const box = $('#toasty');
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = t;
    box.appendChild(d);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => d.classList.add('znika'), 3000);
    setTimeout(() => d.remove(), 3500);
  }

  /* ---------- walidacja danych z sieci ---------- */
  function czystyItem(i) {
    if (!i || typeof i !== 'object' || typeof i.id !== 'string' || !ITEM_RE.test(i.id)) return null;
    const o = { id: i.id, n: txt(i.n, 80) || '?', e: txt(i.e, 16), h: num(i.h, 0, 360) };
    if (i.id[0] === 'o') { o.k = txt(i.k, 40); o.o = txt(i.o, 240); o.t = Array.isArray(i.t) ? i.t.slice(0, 5).map(x => txt(x, 20)).filter(Boolean) : []; }
    if (i.id[0] === 'f') { o.r = num(i.r, 0, 3000); o.g = txt(i.g, 20); o.m = num(i.m, 0, 999); o.d = txt(i.d, 80); o.o = txt(i.o, 240); }
    if (i.id[0] === 'w' && i.a) o.a = txt(i.a, 44);
    return o;
  }
  function czystyPokoj(v) {
    if (!v || !RODZAJE[v.kind] || !Array.isArray(v.items)) return null;
    const ids = new Set(), items = [];
    for (const x of v.items.slice(0, 160)) { const i = czystyItem(x); if (i && !ids.has(i.id)) { ids.add(i.id); items.push(i); } }
    if (items.length < 2) return null;
    return {
      kind: v.kind, title: txt(v.title, 60) || RODZAJE[v.kind].tytul, items,
      host: typeof v.host === 'string' ? v.host.slice(0, 16) : '', created: num(v.created, 0, 1e14),
      demo: v.demo && typeof v.demo.sekret === 'string' ? { sekret: v.demo.sekret.slice(0, 30) } : null,
      prog: v.prog === 'bez1' ? 'bez1' : 'wszyscy',
      limit: LIMITY.includes(v.limit) ? v.limit : 0,
    };
  }
  function czystaOsoba(v) {
    if (!v || typeof v !== 'object') return null;
    const votes = {};
    if (v.votes && typeof v.votes === 'object') {
      let n = 0;
      for (const k of Object.keys(v.votes)) {
        if (++n > 400) break;
        if (ITEM_RE.test(k) && (v.votes[k] === 1 || v.votes[k] === 0 || v.votes[k] === 2)) votes[k] = v.votes[k];
      }
    }
    return { name: txt(v.name, 24) || 'Ktoś', emoji: txt(v.emoji, 16) || '🙂', votes, joined: num(v.joined, 0, 1e14) || Date.now(), rev: v.rev };
  }

  /** Propozycje dorzucone w trakcie przez jedną osobę (klucz „dod/<osoba>”). */
  function czysteDod(pid, v) {
    if (!v || !Array.isArray(v.items)) return [];
    const out = [];
    for (const x of v.items.slice(0, MAX_DOD)) {
      const i = czystyItem(x);
      if (i && i.id.startsWith('w-' + pid + '-')) out.push(i);
    }
    return out;
  }
  function czystaDecyzja(v) {
    if (!v || typeof v.id !== 'string' || !ITEM_RE.test(v.id)) return null;
    return { id: v.id, powod: v.powod === 'czas' ? 'czas' : 'los', by: typeof v.by === 'string' ? v.by.slice(0, 16) : '', rev: v.rev };
  }
  function czysteNast(v) {
    if (!v || typeof v.id !== 'string' || !ROOM_RE.test(v.id)) return null;
    return { id: v.id, title: txt(v.title, 60) || 'Nowa runda', name: txt(v.name, 24) || 'Ktoś', emoji: txt(v.emoji, 16) || '🙂', by: typeof v.by === 'string' ? v.by.slice(0, 16) : '' };
  }

  /* ================= STAN ================= */
  let S = null;
  const kolejkaDop = [];
  const stos = new Karty.Stos($('#stos'), { onSwipe: (id, v) => glosuj(id, v), linki: (i) => linkiDla(i) });

  function nowyStan(id) {
    return {
      id, room: null, items: new Map(), me: null,
      peers: new Map(), online: new Map(), kicked: new Set(),
      lacze: null, porzadek: new Map(), top: null, historia: [], tryb: 'normal', drugaZrobione: new Set(),
      ogloszone: new Set(ls('jg:ogl:' + id) || []), znani: new Set(), wyniki: [], ekran: '', wejscie: 0,
      timery: [], boty: null, polaczenie: { ok: 0, razem: 0, lokalnie: false }, startPol: Date.now(),
      lista: [], dod: new Map(), czekajace: [], decyzja: null, nast: null, powrot: false, auto: false,
    };
  }

  function zamknijPokoj() {
    kolejkaDop.length = 0;
    $('#dopasowanie').hidden = true;
    $('#dopasowanie').classList.remove('widoczne');
    if (!S) return;
    for (const t of S.timery) clearInterval(t);
    if (S.boty) clearInterval(S.boty);
    if (S.lacze) S.lacze.stop();
    stos.wyczysc();
    S = null;
  }

  function pokazEkran(n) {
    for (const e of ['start', 'dolacz', 'pokoj']) $('#ekran-' + e).hidden = e !== n;
    document.body.dataset.ekran = n;
    if (S) S.ekran = n;
    window.scrollTo(0, 0);
  }

  /* ---------- router ---------- */
  function trasa() {
    const p = hashParams();
    zamknijDialogi();
    if (p.p && ROOM_RE.test(p.p)) {
      if (S && S.id === p.p) return;
      otworzPokoj(p.p);
    } else {
      zamknijPokoj();
      pokazStart();
    }
  }
  window.addEventListener('hashchange', trasa);

  /** Zapisuje klucz w pokoju i od razu przetwarza go u siebie (jak wiadomość z sieci). */
  function zapisz(k, v) {
    if (!S || !S.lacze) return null;
    const out = S.lacze.put(k, v);
    onPut(k, out, 'ja');
    return out;
  }

  function linkDoPokoju(id) {
    const base = location.protocol === 'file:' ? ONLINE : location.origin + location.pathname;
    return base + '#p=' + id;
  }

  /* ================= START ================= */
  function pokazStart() {
    pokazEkran('start');
    document.title = 'Jednogłośnie – co jemy, co oglądamy?';
    $('#opis-obiad').textContent = OBIADY.length + ' dań z całego świata';
    $('#opis-film').textContent = FILMY.length + ' filmów na wieczór';
    const lista = (ls('jg:pokoje') || []).filter(r => r && ROOM_RE.test(r.id));
    $('#ostatnie').hidden = !lista.length;
    $('#lista-ostatnich').innerHTML = lista.slice(0, 6).map(r => {
      const kiedy = new Date(r.ts);
      const dzis = new Date().toDateString() === kiedy.toDateString();
      const czas = dzis ? 'dziś, ' + kiedy.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : kiedy.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
      return `<li><a href="#p=${esc(r.id)}"><span class="ost-emoji">${esc((RODZAJE[r.kind] || RODZAJE.wlasne).emoji)}</span><span class="ost-tytul">${esc(r.title)}</span><span class="ost-czas">${esc(czas)}</span><span class="ost-strz" aria-hidden="true">→</span></a></li>`;
    }).join('');
  }

  $$('.kafel').forEach(b => b.addEventListener('click', () => zalozPokoj({ rodzaj: b.dataset.rodzaj })));
  $('#btn-demo').addEventListener('click', () => zalozPokoj({ rodzaj: 'obiad', demo: true }));
  $('#btn-wlasne').addEventListener('click', () => otworzDostosuj('wlasne'));
  $('#btn-dostosuj').addEventListener('click', () => otworzDostosuj('obiad'));

  /* ---------- tworzenie pokoju ---------- */
  function parsujWlasne(tekst) {
    const seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter('pl', { granularity: 'grapheme' }) : null;
    const wynik = [], byly = new Set();
    for (let linia of String(tekst || '').split(/\n|;/)) {
      linia = txt(linia.replace(/^[-*•\d.)\s]+(?=\S)/, ''), 80);
      if (!linia || byly.has(linia.toLowerCase())) continue;
      byly.add(linia.toLowerCase());
      let e = '', n = linia;
      if (/^\p{Extended_Pictographic}/u.test(linia)) {
        const pierwszy = seg ? [...seg.segment(linia)][0].segment : linia.slice(0, 2);
        e = pierwszy; n = linia.slice(pierwszy.length).trim() || linia;
      }
      wynik.push({ id: 'w-' + (wynik.length + 1), n, e: e || '', h: hash(n) % 360 });
      if (wynik.length >= 60) break;
    }
    return wynik;
  }

  function pulaZFiltrow(rodzaj, f) {
    if (rodzaj === 'obiad') {
      return OBIADY.filter(i =>
        (!f.wege || i.t.includes('wege') || i.t.includes('da się wege')) &&
        (!f['bez-ostrego'] || !i.t.includes('ostro')) &&
        (!f['na wynos'] || i.t.includes('na wynos') || i.t.includes('szybko')) &&
        (!f.domowo || i.t.includes('domowo')));
    }
    if (rodzaj === 'film') {
      return FILMY.filter(i =>
        (!f.gatunki || f.gatunki.includes(i.g)) &&
        (!f.krotki || i.m <= 120) &&
        (!f.polskie || POLSKIE.has(i.id)));
    }
    return [];
  }

  function zalozPokoj(o) {
    const rodzaj = o.rodzaj;
    let pula = mieszaj(pulaZFiltrow(rodzaj, o.filtry || {}).slice());
    const liczba = o.liczba || 25;
    const wlasne = o.wlasne || [];
    let items = pula.slice(0, Math.max(0, liczba)).map(i => Object.assign({}, i)).concat(wlasne);
    items = mieszaj(items);
    if (items.length < 2) { toast('Potrzeba co najmniej dwóch propozycji.'); return false; }

    // 16 znaków z 31 = ok. 79 bitów – z identyfikatora powstaje też klucz szyfrujący pokój
    const id = (o.demo ? 'demo-' : '') + losId(o.demo ? 8 : 16);
    const pr = profil();
    const me = { pid: losId(8), name: pr.name, emoji: pr.emoji };
    const room = {
      v: 2, kind: rodzaj, title: txt(o.tytul, 60) || RODZAJE[rodzaj].tytul, items,
      host: me.pid, created: Date.now(),
      prog: o.prog === 'bez1' ? 'bez1' : 'wszyscy', limit: LIMITY.includes(o.limit) ? o.limit : 0,
    };
    if (o.demo) room.demo = { sekret: items[Math.floor(Math.random() * Math.min(items.length, 12))].id };

    // nowa runda: wszyscy z obecnego pokoju dostają zaproszenie do nowego
    const runda = !!(o.runda && S && S.me && S.room && !S.room.demo);
    if (runda) zapisz('nast', { id, title: room.title, kind: rodzaj, by: S.me.pid, name: S.me.name, emoji: S.me.emoji });

    zamknijPokoj();
    S = nowyStan(id);
    S.me = me;
    idStore('jg:ja:' + id, me);
    S.lacze = utworzLacze(id, !!o.demo);
    S.lacze.start(me.pid);
    const r = S.lacze.put('room', room);
    ustawPokoj(r);
    publikujMnie();
    history.pushState(null, '', '#p=' + id);
    wejdz();
    if (o.demo) toast('Tryb próbny: Ania, Kuba i Zosia zaraz dołączą i będą przesuwać razem z Tobą.');
    else if (runda) toast('Nowa runda! Ekipa z poprzedniego pokoju dostała zaproszenie.');
    else setTimeout(() => otworzZapros(), 380);
    return true;
  }

  /* ================= POKÓJ ================= */
  function utworzLacze(id, lokalnie) {
    return new Lacze(id, {
      lokalnie,
      onPut: onPut,
      onHb: onHb,
      onStatus: (st) => { if (S) { S.polaczenie = st; rysujPolaczenie(); } },
    });
  }

  const MSG_POWROT = 'Ktoś usunął Cię z głosowania, bo wyglądało, że Cię nie ma. Twoje głosy są zachowane – wróć jednym kliknięciem.';

  function otworzPokoj(id) {
    zamknijPokoj();
    S = nowyStan(id);
    const hp = hashParams();
    S.auto = !!hp.auto;
    if (hp.auto) history.replaceState(null, '', '#p=' + id + (hp.test ? '&test=1' : ''));
    const zap = idStore('jg:ja:' + id);
    if (zap && PID_RE.test(zap.pid)) S.me = { pid: zap.pid, name: txt(zap.name, 24) || 'Ktoś', emoji: txt(zap.emoji, 16) || '🙂' };
    S.lacze = utworzLacze(id, id.startsWith('demo-'));
    S.lacze.start(S.me ? S.me.pid : null);
    if (S.me && !S.kicked.has(S.me.pid)) wejdz();
    else if (S.me) { S.powrot = true; pokazDolacz(MSG_POWROT); }
    else pokazDolacz();
  }

  function ustawPokoj(v) {
    const r = czystyPokoj(v);
    if (!r) return;
    const nowe = !S.room || S.room.items.length !== r.items.length;
    S.room = r;
    przeliczListe();
    if (nowe) budujPorzadek();
  }

  /** Lista wszystkich propozycji: z pokoju + dorzucone w trakcie przez uczestników. */
  function przeliczListe() {
    if (!S.room) return;
    const zPokoju = new Set(S.room.items.map(i => i.id));
    const extra = [];
    for (const pid of [...S.dod.keys()].sort()) for (const i of S.dod.get(pid)) if (!zPokoju.has(i.id)) extra.push(i);
    S.lista = S.room.items.concat(extra);
    S.items = new Map(S.lista.map(i => [i.id, i]));
  }

  function onPut(k, v, zrodlo) {
    if (!S) return;
    if (k === 'room') {
      ustawPokoj(v);
      if (S.ekran === 'dolacz') rysujDolacz();
      else if (S.ekran === 'pokoj') { if (S.room && S.room.demo && !S.boty) uruchomBoty(); zmiana(); }
      return;
    }
    if (k === 'decyzja') {
      S.decyzja = czystaDecyzja(v);
      zmiana();
      return;
    }
    if (k === 'nast') {
      const n = czysteNast(v);
      if (!n || n.id === S.id) return;
      S.nast = n;
      const odInnych = !S.me || n.by !== S.me.pid;
      if (odInnych && zrodlo !== 'ja' && zrodlo !== 'pamiec' && S.ekran === 'pokoj') {
        toast(`${n.emoji} ${n.name} zaprasza do nowej rundy: ${n.title}`);
        dzwiek('wejscie');
      }
      odswiezRunde();
      zmiana();
      return;
    }
    const pid = k.slice(k.indexOf('/') + 1);
    if (k.startsWith('wyl/')) {
      const wyl = !(v && v.wyl === 0);
      if (wyl) S.kicked.add(pid); else S.kicked.delete(pid);
      if (wyl && S.me && pid === S.me.pid && S.ekran === 'pokoj' && zrodlo !== 'ja') { wyrzucony(); return; }
      if (S.ekran === 'dolacz') rysujDolacz(); else zmiana();
      return;
    }
    if (k.startsWith('dod/')) {
      const przed = S.lista.length;
      S.dod.set(pid, czysteDod(pid, v));
      przeliczListe();
      if (S.lista.length > przed && zrodlo !== 'ja' && zrodlo !== 'pamiec' && S.ekran === 'pokoj') toast('✨ Ktoś dorzucił propozycję – jest już w Twojej talii');
      if (S.ekran === 'dolacz') rysujDolacz(); else zmiana();
      return;
    }
    if (k.startsWith('p/')) {
      const p = czystaOsoba(v);
      if (!p) return;
      const bylo = S.peers.get(pid);
      if (S.me && pid === S.me.pid && bylo && bylo.rev >= p.rev) return;
      S.peers.set(pid, p);
      const obcy = !S.me || pid !== S.me.pid;
      if (obcy && S.ekran === 'pokoj' && !S.kicked.has(pid)) {
        if (!S.znani.has(pid) && (Date.now() - S.wejscie > 2500 || zrodlo === 'bot') && zrodlo !== 'pamiec') {
          toast(`${p.emoji} ${p.name} – jest w pokoju`);
          dzwiek('wejscie');
        }
        const n = S.room ? S.lista.length : 0;
        if (bylo && n && ileGlosow(bylo) < n && ileGlosow(p) >= n) toast(`${p.emoji} ${p.name} – wszystko przejrzane`);
      }
      S.znani.add(pid);
      if (S.ekran === 'dolacz') rysujDolacz(); else zmiana();
    }
  }

  function onHb(pid, v) {
    if (!S || !PID_RE.test(pid)) return;
    if (S.me && pid === S.me.pid) return;
    if (v.off) S.online.delete(pid); else S.online.set(pid, Date.now());
    if (v.ask && S.me && S.ekran === 'pokoj' && Date.now() - (S.ostOdp || 0) > 2500) {
      S.ostOdp = Date.now();
      setTimeout(() => S && S.lacze.hb({}), 200 + Math.random() * 600);
    }
    zmianaLekka();
  }

  function ileGlosow(p) { return S.room ? S.lista.reduce((s, i) => s + (p.votes[i.id] !== undefined ? 1 : 0), 0) : 0; }
  function ileTak(p) { return S.room ? S.lista.reduce((s, i) => s + (p.votes[i.id] === 1 ? 1 : 0), 0) : 0; }
  function jestOnline(pid) {
    if (S.me && pid === S.me.pid) return true;
    if (pid.startsWith('bot') && S.room && S.room.demo) return true;
    const t = S.online.get(pid);
    return !!t && Date.now() - t < 40000;
  }
  function uczestnicy() {
    return [...S.peers.entries()]
      .filter(([pid]) => !S.kicked.has(pid))
      .map(([pid, p]) => Object.assign({ pid }, p))
      .sort((a, b) => a.joined - b.joined);
  }
  function mojeGlosy() { const p = S.me && S.peers.get(S.me.pid); return p ? p.votes : {}; }
  function liczTak(id, bezMnie) {
    let n = 0;
    for (const u of uczestnicy()) {
      if (bezMnie && S.me && u.pid === S.me.pid) continue;
      if (u.votes[id] === 1) n++;
    }
    return n;
  }

  function budujPorzadek() {
    S.porzadek = new Map();
    if (!S.room) return;
    const ids = mieszaj(S.lista.map(i => i.id), rng(hash(S.id + ':' + (S.me ? S.me.pid : 'x'))));
    ids.forEach((id, i) => S.porzadek.set(id, i));
  }

  function publikujMnie(zmienGlosy) {
    if (!S || !S.me) return;
    const stare = S.peers.get(S.me.pid);
    const v = {
      name: S.me.name, emoji: S.me.emoji,
      votes: zmienGlosy || (stare ? stare.votes : {}),
      joined: stare ? stare.joined : Date.now(),
    };
    const out = S.lacze.put('p/' + S.me.pid, v);
    S.peers.set(S.me.pid, czystaOsoba(out));
  }

  function wejdz() {
    pokazEkran('pokoj');
    S.wejscie = Date.now();
    S.lacze.ustawPid(S.me.pid);
    budujPorzadek();
    if (S.peers.has(S.me.pid)) publikujMnie(S.peers.get(S.me.pid).votes);
    else if (S.room) publikujMnie();
    else {
      // pokój jeszcze się nie wczytał – nie nadpisujmy pustymi głosami tego, co może już być na serwerze
      setTimeout(() => { if (S && S.me && !S.peers.has(S.me.pid)) { publikujMnie(); zmiana(); } }, 6000);
    }
    for (const pid of S.peers.keys()) S.znani.add(pid);
    S.lacze.hb({ ask: 1 });
    S.timery.push(setInterval(() => S && S.lacze.hb({}), 12000));
    S.timery.push(setInterval(() => S && zmianaLekka(), 5000));
    S.timery.push(setInterval(() => S && rysujCzas(), 1000));
    if (S.room && S.room.demo) uruchomBoty();
    zmiana();
  }

  function dodajDoOstatnich() {
    if (!S.room || S.room.demo) return;
    const lista = (ls('jg:pokoje') || []).filter(r => r && r.id !== S.id);
    lista.unshift({ id: S.id, title: S.room.title, kind: S.room.kind, ts: Date.now() });
    ls('jg:pokoje', lista.slice(0, 8));
  }

  /* ---------- odświeżanie widoku ---------- */
  let rafZmiana = 0;
  function zmiana() {
    if (rafZmiana) return;
    rafZmiana = requestAnimationFrame(() => {
      rafZmiana = 0;
      if (!S || S.ekran !== 'pokoj') return;
      if (S.room && !S.dodany) { S.dodany = true; dodajDoOstatnich(); }
      rysujPasek();
      rysujStos();
      sprawdzDopasowania();
      if ($('#arkusz-osoby').open) rysujOsoby();
      if ($('#arkusz-wyniki').open) rysujWyniki();
    });
  }
  function zmianaLekka() {
    if (!S || S.ekran !== 'pokoj') return;
    rysujPasek();
    if ($('#arkusz-osoby').open) rysujOsoby();
    if (S.room && !$('#koniec').hidden && !kandydaci().length) rysujKoniec();
  }

  function rysujPolaczenie() {
    if (!S) return;
    const el = $('#polaczenie');
    const st = S.polaczenie;
    let klasa = '', tekst = '';
    const teraz = S.me ? uczestnicy().filter(u => jestOnline(u.pid)).length : 0;
    if (S.room && S.room.demo) { klasa = 'demo'; tekst = 'tryb próbny · wirtualni znajomi'; }
    else if (st.bezSzyfru) { klasa = 'brak'; tekst = 'otwórz przez https – bez tego pokój nie połączy się z innymi'; }
    else if (st.ok > 0) { klasa = 'ok'; tekst = `${teraz} ${odm(teraz, OSOBA)} na żywo`; }
    else if (Date.now() - S.startPol < 10000) { klasa = 'laczy'; tekst = 'łączę z serwerami…'; }
    else { klasa = 'brak'; tekst = 'brak połączenia – próbuję dalej'; }
    el.className = 'polaczenie ' + klasa;
    el.querySelector('span').textContent = tekst;
  }

  function rysujPasek() {
    if (!S.room) { $('#pokoj-tytul').textContent = 'Pokój'; rysujPolaczenie(); return; }
    $('#pokoj-tytul').textContent = S.room.title;
    document.title = S.room.title + ' – Jednogłośnie';
    const u = uczestnicy();
    const n = S.lista.length;
    const ile = innerWidth < 430 ? (u.length > 4 ? 3 : 4) : 5;
    const html = u.slice(0, ile).map(p => {
      const pr = Math.round(100 * ileGlosow(p) / n);
      return `<span class="awatar${jestOnline(p.pid) ? ' jest' : ''}${S.me && p.pid === S.me.pid ? ' ja' : ''}" style="--p:${pr}" title="${esc(p.name)} – ${pr}%">${esc(p.emoji)}</span>`;
    }).join('') + (u.length > ile ? `<span class="awatar wiecej">+${u.length - ile}</span>` : '');
    const aw = $('#awatary');
    if (aw.innerHTML !== html) aw.innerHTML = html;
    $('#btn-osoby').setAttribute('aria-label', `Osoby w pokoju: ${u.length}`);
    const nast = S.nast && (!S.me || S.nast.by !== S.me.pid) ? S.nast : null;
    $('#nast').hidden = !nast;
    if (nast) $('#nast-tekst').innerHTML = `${esc(nast.emoji)} ${esc(nast.name)} zaprasza do nowej rundy: <b>${esc(nast.title)}</b> – dołącz →`;
    $('#zacheta').hidden = !(u.length < 2 && !S.room.demo) || !!nast;
    $('#btn-zapros').hidden = !!S.room.demo;
    const ileW = new Set(S.wyniki.map(i => i.id).concat(S.czekajace.map(i => i.id), S.decyzja ? [S.decyzja.id] : [])).size;
    $('#btn-wyniki').hidden = !ileW;
    $('#liczba-wynikow').textContent = String(ileW);
    rysujPolaczenie();
    rysujCzas();
  }

  function kandydaci() {
    if (!S.room) return [];
    const my = mojeGlosy();
    let lista;
    if (S.tryb === 'druga') lista = S.lista.filter(i => my[i.id] === 0 && liczTak(i.id, true) > 0 && !S.drugaZrobione.has(i.id));
    else lista = S.lista.filter(i => my[i.id] === undefined);
    const ile = new Map(lista.map(i => [i.id, liczTak(i.id, true)]));
    return lista.map(i => i.id).sort((a, b) => (ile.get(b) - ile.get(a)) || (por(a) - por(b)));
  }
  /** Losowa (dla każdego inna) kolejność; propozycje dorzucone później dostają miejsce wyliczone z identyfikatora. */
  function por(id) {
    return S.porzadek.has(id) ? S.porzadek.get(id) : 1000 + hash(id + (S.me ? S.me.pid : '')) % 1000;
  }

  function stosIds() {
    const k = kandydaci();
    if (S.top && k.includes(S.top)) return [S.top].concat(k.filter(x => x !== S.top).slice(0, 2));
    S.top = k[0] || null;
    return k.slice(0, 3);
  }

  function goraco(id) {
    const n = liczTak(id, true);
    if (!n) return null;
    const u = uczestnicy().length;
    if (u >= 2 && n === u - 1) return u === 2 ? '🔥 Druga osoba jest na tak!' : `🔥 Wszyscy poza Tobą na tak!`;
    return `🔥 ${n} ${odm(n, OSOBA)} na tak`;
  }

  function rysujStos() {
    const kon = $('#koniec');
    if (!S.room) {
      stos.ustaw([], S.items);
      kon.hidden = false;
      kon.innerHTML = '<div class="koniec-karta"><div class="kolko-ladowania" aria-hidden="true"></div><p>Łączę z pokojem…</p></div>';
      ustawPrzyciski(false);
      return;
    }
    const ids = stosIds();
    stos.ustaw(ids, S.items, goraco);
    const my = mojeGlosy();
    const n = S.lista.length;
    const ocen = S.lista.reduce((s, i) => s + (my[i.id] !== undefined ? 1 : 0), 0);
    if (S.tryb === 'druga') {
      const zostalo = kandydaci().length;
      $('#licznik').innerHTML = `<b>Druga szansa</b> · ${zostalo} ${odm(zostalo, ['karta', 'karty', 'kart'])} <button type="button" class="btn-tekst" id="druga-koniec">zakończ</button>`;
      $('#druga-koniec').onclick = () => { S.tryb = 'normal'; S.top = null; zmiana(); };
    } else {
      $('#licznik').innerHTML = `<span class="pasek-postepu" style="--p:${Math.round(100 * ocen / n)}"></span> ${ocen} / ${n}`;
    }
    ustawPrzyciski(ids.length > 0);
    $('#btn-cofnij').disabled = !S.historia.length;
    const weto = S.room.prog === 'bez1';
    $('#btn-weto').hidden = !weto;
    $('#btn-weto').disabled = !ids.length || Object.values(my).includes(2);
    $('#btn-dorzuc').hidden = !S.me;
    rysujCzas();
    if (ids.length) { kon.hidden = true; kon.innerHTML = ''; }
    else rysujKoniec();
  }

  function ustawPrzyciski(on) {
    $('#btn-tak').disabled = !on;
    $('#btn-nie').disabled = !on;
    $('#podpowiedz').hidden = !on;
  }

  function ranking() {
    const u = uczestnicy();
    return S.lista.map(i => ({ i, n: u.reduce((s, p) => s + (p.votes[i.id] === 1 ? 1 : 0), 0), weto: u.some(p => p.votes[i.id] === 2) }))
      .filter(x => x.n > 0 && !x.weto)
      .sort((a, b) => b.n - a.n || (hash(S.id + a.i.id) - hash(S.id + b.i.id)));
  }

  function drugaSzansaIle() {
    const my = mojeGlosy();
    return S.lista.filter(i => my[i.id] === 0 && liczTak(i.id, true) > 0 && !S.drugaZrobione.has(i.id)).length;
  }

  function rysujKoniec() {
    const kon = $('#koniec');
    kon.hidden = false;
    const u = uczestnicy();
    const n = S.lista.length;
    const czekamy = u.filter(p => ileGlosow(p) < n);
    const rank = ranking().slice(0, 5);
    const druga = drugaSzansaIle();
    const wyn = S.wyniki;
    const dec = S.decyzja && S.items.get(S.decyzja.id);
    let h = '<div class="koniec-karta">';
    if (wyn.length) {
      h += `<p class="duze-emoji" aria-hidden="true">🏆</p><h2>${wyn.length === 1 ? 'Macie zwycięzcę!' : 'Macie ' + wyn.length + ' dopasowania!'}</h2><div class="koniec-wyniki">`;
      h += wyn.map(i => `<button type="button" class="wynik-btn" data-wynik="${esc(i.id)}"><span>${esc(i.e || '💡')}</span>${esc(i.n)}</button>`).join('');
      h += '</div>';
    } else if (dec) {
      h += `<p class="duze-emoji" aria-hidden="true">${S.decyzja.powod === 'czas' ? '⏱️' : '🎲'}</p><h2>${S.decyzja.powod === 'czas' ? 'Czas minął – wybrane!' : 'Los zdecydował!'}</h2><div class="koniec-wyniki">`;
      h += `<button type="button" class="wynik-btn" data-decyzja="1"><span>${esc(dec.e || '💡')}</span>${esc(dec.n)}</button></div>`;
    } else if (S.tryb === 'druga') {
      h += '<p class="duze-emoji" aria-hidden="true">🔁</p><h2>Druga szansa za Tobą</h2>';
    } else {
      h += '<p class="duze-emoji" aria-hidden="true">✨</p><h2>Wszystko przejrzane</h2>';
    }
    if (S.czekajace.length) {
      h += `<p class="czekajace">⏳ ${S.czekajace.map(i => `<b>${esc(i.e || '💡')} ${esc(i.n)}</b>`).join(', ')} – było dopasowanie, czeka teraz na ocenę osób, które dołączyły później.</p>`;
    }
    if (u.length < 2) {
      h += '<p>Dopasowanie pojawi się, gdy dołączy ktoś jeszcze i polubi to samo co Ty.</p>';
    } else if (czekamy.length) {
      h += `<p class="czekamy">Czekamy jeszcze na: ${czekamy.map(p => {
        const on = jestOnline(p.pid);
        return `<span class="czekamy-os${on ? '' : ' poza'}">${esc(p.emoji)} ${esc(p.name)} <small>${ileGlosow(p)}/${n}${on ? '' : ' · poza pokojem'}</small>${!on && !S.room.demo ? ` <button type="button" class="btn-tekst" data-usun="${esc(p.pid)}">usuń z głosowania</button>` : ''}</span>`;
      }).join(' ')}</p>`;
    } else if (!wyn.length && !dec) {
      h += '<p>Wszyscy przejrzeli wszystko i nie ma propozycji, na którą zgodzili się wszyscy. Spróbujcie drugiej szansy albo niech zdecyduje los.</p>';
    }
    if (rank.length && u.length >= 2) {
      h += '<h3>Najbliżej zgody</h3><ol class="ranking">' + rank.map(x =>
        `<li><span class="r-emoji">${esc(x.i.e || '💡')}</span><span class="r-nazwa">${esc(x.i.n)}</span><span class="r-pasek" style="--p:${Math.round(100 * x.n / u.length)}"></span><span class="r-ile">${x.n}/${u.length}</span></li>`).join('') + '</ol>';
    }
    h += '<div class="koniec-przyciski">';
    if (druga) h += `<button type="button" class="btn btn-glowny" data-akcja="druga">🔁 Druga szansa (${druga})</button>`;
    if (!wyn.length && !dec && u.length >= 2 && rank.length) h += '<button type="button" class="btn btn-jasny" data-akcja="los">🎲 Niech zdecyduje los</button>';
    if (S.me) h += `<button type="button" class="btn btn-ciemny" data-akcja="dorzuc">＋ Dorzuć propozycję</button>`;
    if (!S.room.demo) {
      if ((wyn.length || dec) && !(S.nast && S.me && S.nast.by !== S.me.pid)) h += '<button type="button" class="btn btn-ciemny" data-akcja="runda">🔁 Nowa runda z tą ekipą</button>';
      h += '<button type="button" class="btn btn-ciemny" data-akcja="zapros">＋ Zaproś kogoś</button>';
    } else h += '<a class="btn btn-ciemny" href="#">Załóż prawdziwy pokój</a>';
    h += '</div></div>';
    if (kon.innerHTML !== h) kon.innerHTML = h;
  }
  $('#koniec').addEventListener('click', (e) => {
    const t = e.target.closest('[data-akcja], [data-wynik], [data-decyzja], [data-usun]');
    if (!t || !S) return;
    if (t.dataset.wynik) return pokazDopasowanie(S.items.get(t.dataset.wynik));
    if (t.dataset.decyzja) return S.decyzja && pokazDopasowanie(S.items.get(S.decyzja.id), S.decyzja.powod);
    if (t.dataset.usun) return usunOsobe(t.dataset.usun);
    const a = t.dataset.akcja;
    if (a === 'druga') { S.tryb = 'druga'; S.top = null; zmiana(); toast('Propozycje, które Ty odrzucasz, a ktoś inny lubi. Może jednak?'); }
    else if (a === 'los') losuj();
    else if (a === 'dorzuc') otworzDorzuc();
    else if (a === 'runda') otworzDostosuj(S.room.kind, true);
    else if (a === 'zapros') otworzZapros();
  });

  /* ---------- głosowanie ---------- */
  function glosuj(id, v) {
    if (!S || !S.me) return;
    const my = mojeGlosy();
    S.historia.push({ id, prev: my[id], v, tryb: S.tryb });
    if (S.historia.length > 60) S.historia.shift();
    if (S.tryb === 'druga') S.drugaZrobione.add(id);
    const nowe = Object.assign({}, my, { [id]: v });
    S.top = null;
    publikujMnie(nowe);
    dzwiek(v === 1 ? 'tak' : 'nie');
    wibruj(v === 1 ? 12 : v === 2 ? [20, 40, 20] : 6);
    if (v === 2) toast('⛔ Weto użyte – ta propozycja już nie wygra.');
    zmiana();
  }

  function cofnij() {
    if (!S || !S.historia.length) return;
    const h = S.historia.pop();
    const nowe = Object.assign({}, mojeGlosy());
    if (h.prev === undefined) delete nowe[h.id]; else nowe[h.id] = h.prev;
    if (h.tryb === 'druga') S.drugaZrobione.delete(h.id);
    S.tryb = h.tryb;
    S.top = h.id;
    publikujMnie(nowe);
    dzwiek('cofnij');
    rysujStos();
    stos.wroc(h.id, h.v ? 1 : -1);
    zmiana();
  }

  $('#btn-tak').addEventListener('click', () => stos.rzuc(1));
  $('#btn-nie').addEventListener('click', () => stos.rzuc(-1));
  $('#btn-cofnij').addEventListener('click', cofnij);
  $('#btn-weto').addEventListener('click', () => {
    if (!S || !S.room || S.room.prog !== 'bez1' || Object.values(mojeGlosy()).includes(2)) return;
    stos.rzuc(-1, null, 0, 0, 2);
  });
  document.addEventListener('keydown', (e) => {
    if (!S || S.ekran !== 'pokoj') return;
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (!$('#dopasowanie').hidden) { if (e.key === 'Escape') zamknijDopasowanie(); return; }
    if (document.querySelector('dialog[open]')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); stos.rzuc(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); stos.rzuc(-1); }
    else if (e.key === 'Backspace' || (e.key === 'z' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); cofnij(); }
    else if (e.key === ' ' && !(e.target.closest && e.target.closest('button, a'))) { e.preventDefault(); stos.odwroc(); }
    else if ((e.key === 'w' || e.key === 'W') && !$('#btn-weto').hidden && !$('#btn-weto').disabled) { e.preventDefault(); $('#btn-weto').click(); }
  });

  /* ---------- dopasowania ---------- */
  function stanPozycji(i, u) {
    let tak = 0, weto = false, brak = 0;
    for (const p of u) {
      const g = p.votes[i.id];
      if (g === 1) tak++; else if (g === 2) weto = true; else if (g === undefined) brak++;
    }
    return { tak, weto, brak };
  }
  /** Ile osób musi być na „tak”: wszyscy albo (tryb „oprócz jednej”) wszyscy minus jedna, ale min. 2. */
  function potrzeba(n) { return S.room && S.room.prog === 'bez1' ? Math.max(2, n - 1) : n; }
  /** Czy propozycja jest dopasowaniem. `brakJakoTak` – czy mogłaby nim być, gdyby brakujący powiedzieli „tak”. */
  function zgoda(i, u, brakJakoTak) {
    if (u.length < 2) return false;
    const st = stanPozycji(i, u);
    if (st.weto) return false;
    if (st.brak && !brakJakoTak) return false;
    return st.tak + (brakJakoTak ? st.brak : 0) >= potrzeba(u.length);
  }

  function sprawdzDopasowania() {
    if (!S.room) return;
    const u = uczestnicy();
    const stare = S.wyniki.map(i => i.id).join() + '|' + S.czekajace.map(i => i.id).join();
    S.wyniki = u.length < 2 ? [] : S.lista.filter(i => zgoda(i, u));
    // ogłoszone wcześniej, ale teraz czekają na ocenę osób, które dołączyły później
    S.czekajace = u.length < 2 ? [] : S.lista.filter(i => S.ogloszone.has(i.id) && !S.wyniki.includes(i) && zgoda(i, u, true));
    if (S.wyniki.map(i => i.id).join() + '|' + S.czekajace.map(i => i.id).join() !== stare) { rysujPasek(); if (!kandydaci().length) rysujKoniec(); }
    const nowe = S.wyniki.filter(i => !S.ogloszone.has(i.id));
    if (nowe.length) {
      nowe.forEach(i => S.ogloszone.add(i.id));
      ls('jg:ogl:' + S.id, [...S.ogloszone]);
      if ($('#dopasowanie').hidden) pokazDopasowanie(nowe.shift());
      kolejkaDop.push(...nowe.map(item => ({ item })));
    }
    // wspólna decyzja (los albo koniec czasu) – pokazuje się u wszystkich naraz
    if (S.decyzja && S.items.has(S.decyzja.id)) {
      const klucz = 'dec:' + S.decyzja.rev;
      if (!S.ogloszone.has(klucz)) {
        S.ogloszone.add(klucz);
        ls('jg:ogl:' + S.id, [...S.ogloszone]);
        const item = S.items.get(S.decyzja.id);
        if ($('#dopasowanie').hidden) pokazDopasowanie(item, S.decyzja.powod);
        else kolejkaDop.push({ item, tryb: S.decyzja.powod });
      }
    }
  }

  function linkiDla(item) {
    const q = encodeURIComponent(item.n);
    if (item.id[0] === 'o') return [
      ['📍 Znajdź w pobliżu', 'https://www.google.com/maps/search/?api=1&query=' + q],
      ['🛵 Z dostawą', 'https://www.google.com/search?q=' + encodeURIComponent(item.n + ' dostawa')],
      ['📖 Przepis', 'https://www.google.com/search?q=' + encodeURIComponent(item.n + ' przepis')],
    ];
    if (item.id[0] === 'f') return [
      ['▶️ Gdzie obejrzeć', 'https://www.justwatch.com/pl/wyszukiwanie?q=' + q],
      ['🎞️ Zwiastun', 'https://www.youtube.com/results?search_query=' + encodeURIComponent(item.n + ' ' + (item.r || '') + ' zwiastun')],
      ['⭐ Filmweb', 'https://www.filmweb.pl/search?q=' + q],
    ];
    return [['🔎 Poszukaj w sieci', 'https://www.google.com/search?q=' + q]];
  }

  /** tryb: brak – dopasowanie, 'los' – zdecydował los, 'czas' – minął czas na decyzję. */
  function pokazDopasowanie(item, tryb) {
    if (!item) return;
    zamknijDialogi();
    const u = uczestnicy();
    const ov = $('#dopasowanie');
    const los = !!tryb;
    const st = stanPozycji(item, u);
    const prawie = !los && st.tak < u.length;
    ov.dataset.los = los ? '1' : '';
    $('#dop-nad').textContent = tryb === 'czas' ? 'Czas minął!' : los ? 'Remis? Już nie.' : 'Mamy to!';
    $('#dop-napis').textContent = tryb === 'czas' ? 'Wybrane!' : los ? 'Los zdecydował!' : prawie ? 'Prawie jednogłośnie!' : 'Jednogłośnie!';
    const k = $('#dop-karta');
    k.innerHTML = '';
    k.appendChild(Karty.tresc(item));
    $('#dop-kto').textContent = tryb === 'czas'
      ? `Najwięcej osób na tak: ${st.tak} na ${u.length}. Każdy w pokoju widzi ten wynik.`
      : los ? `Spośród propozycji z największym poparciem los wybrał tę. Każdy w pokoju widzi ten sam wynik.`
      : prawie ? `${st.tak} na ${u.length} na tak – w tym pokoju tyle wystarczy.`
      : `${u.length} na ${u.length} – cała ekipa na tak.`;
    $('#dop-awatary').innerHTML = u.map((p, i) => `<span class="dop-aw" style="--i:${i}" title="${esc(p.name)}">${esc(p.emoji)}<i aria-hidden="true">${p.votes[item.id] === 1 ? '❤️' : los ? '🎲' : '🤷'}</i></span>`).join('');
    odswiezRunde();
    $('#dop-linki').innerHTML = linkiDla(item).map(([t, h]) => `<a class="btn btn-ciemny" href="${esc(h)}" target="_blank" rel="noopener">${esc(t)}</a>`).join('');
    $('#dop-udostepnij').onclick = () => {
      const tekst = `${los ? '🎲 Los zdecydował' : '🎉 Jednogłośnie'}: ${item.e ? item.e + ' ' : ''}${item.n}! (${S.room.title})`;
      if (navigator.share) navigator.share({ title: 'Jednogłośnie', text: tekst }).catch(() => {});
      else kopiuj(tekst).then(() => toast('Skopiowano – wklej znajomym.'));
    };
    ov.hidden = false;
    requestAnimationFrame(() => ov.classList.add('widoczne'));
    $('#dop-dalej').focus({ preventScroll: true });
    dzwiek('dopasowanie');
    wibruj([30, 60, 30, 60, 120]);
    konfetti(item.e);
    $('#dop-napis').setAttribute('aria-live', 'assertive');
  }

  function zamknijDopasowanie() {
    const ov = $('#dopasowanie');
    ov.classList.remove('widoczne');
    setTimeout(() => {
      ov.hidden = true; zatrzymajKonfetti();
      const nast = kolejkaDop.shift();
      if (nast && S && (nast.tryb || S.wyniki.some(i => i.id === nast.item.id))) setTimeout(() => pokazDopasowanie(nast.item, nast.tryb), 350);
    }, 280);
  }
  $('#dop-dalej').addEventListener('click', zamknijDopasowanie);

  /** Przycisk rundy: „dołącz do nowej rundy” (gdy ktoś już ją założył) albo „nowa runda z tą ekipą”. */
  function odswiezRunde() {
    const b = $('#dop-runda');
    if (!S || !S.room || S.room.demo) { b.hidden = true; return; }
    b.hidden = false;
    const cudza = S.nast && (!S.me || S.nast.by !== S.me.pid);
    b.innerHTML = cudza ? `<span aria-hidden="true">🔁</span> Dołącz: ${esc(S.nast.title)}` : '<span aria-hidden="true">🔁</span> Nowa runda';
    b.title = cudza ? 'Ktoś już założył nową rundę – dołącz jednym kliknięciem' : 'Nowy pokój z tą samą ekipą – wszyscy dostaną zaproszenie';
  }
  $('#dop-runda').addEventListener('click', () => {
    if (!S) return;
    const cudza = S.nast && (!S.me || S.nast.by !== S.me.pid);
    if (cudza) { przejdzDoRundy(); return; }
    zamknijDopasowanie();
    setTimeout(() => otworzDostosuj(S.room.kind, true), 320);
  });
  function przejdzDoRundy() {
    if (!S || !S.nast) return;
    location.hash = '#p=' + S.nast.id + '&auto=1';
  }
  $('#nast').addEventListener('click', przejdzDoRundy);

  /** Zwycięzca losowania / końca czasu: największe poparcie, remis rozstrzyga skrót identyfikatora pokoju. */
  function wybierzZwyciezce() {
    const r = ranking();
    const klucz = (id) => hash(S.id + '#' + id);
    if (r.length) {
      const max = r[0].n;
      return r.filter(x => x.n === max).sort((a, b) => klucz(a.i.id) - klucz(b.i.id))[0].i;
    }
    const u = uczestnicy();
    return S.lista.filter(i => !u.some(p => p.votes[i.id] === 2)).sort((a, b) => klucz(a.id) - klucz(b.id))[0] || null;
  }

  function losuj() {
    if (!S || !S.me || S.decyzja) return;
    const n = S.lista.length;
    const czekamy = uczestnicy().filter(p => ileGlosow(p) < n);
    if (czekamy.length && !confirm(`Jeszcze przesuwa: ${czekamy.map(p => p.name).join(', ')}. Losować już teraz? Wynik zobaczy cały pokój.`)) return;
    const it = wybierzZwyciezce();
    if (it) zapisz('decyzja', { id: it.id, powod: 'los', by: S.me.pid });
  }

  /* ---------- czas na decyzję ---------- */
  /** Odliczanie startuje, gdy w pokoju jest druga osoba (czas jej dołączenia – taki sam u wszystkich). */
  function startCzasu() {
    const j = [...S.peers.values()].map(p => p.joined).sort((a, b) => a - b);
    return j.length >= 2 ? j[1] : 0;
  }
  function mmss(sek) { return Math.floor(sek / 60) + ':' + String(sek % 60).padStart(2, '0'); }
  function rysujCzas() {
    const el = $('#czas');
    if (!S || !S.room || !S.room.limit) { el.hidden = true; return; }
    el.hidden = false;
    const st = startCzasu();
    if (!st) { el.className = 'czas'; el.textContent = `⏱ ${mmss(S.room.limit)} · start, gdy ktoś dołączy`; return; }
    const zostalo = Math.max(0, st + S.room.limit * 1000 - Date.now());
    const sek = Math.ceil(zostalo / 1000);
    el.className = 'czas' + (zostalo && zostalo < 30000 ? ' malo' : '') + (!zostalo ? ' po' : '');
    el.textContent = zostalo ? `⏱ ${mmss(sek)}` : (S.wyniki.length ? '⏱ czas minął · macie dopasowanie' : '⏱ czas minął');
    if (!zostalo) koniecCzasu(st);
  }
  function koniecCzasu(st) {
    if (S.decyzja || S.wyniki.length || !S.me || S.czasWyslany) return;
    // decyzję ogłasza zakładający; jeśli go nie ma, po chwili zrobi to ktokolwiek
    const po = Date.now() - (st + S.room.limit * 1000);
    if (S.me.pid !== S.room.host && po < 6000 + hash(S.me.pid) % 4000) return;
    S.czasWyslany = true;
    const it = wybierzZwyciezce();
    if (it) zapisz('decyzja', { id: it.id, powod: 'czas', by: S.me.pid });
  }

  /* ---------- konfetti ---------- */
  let konf = null;
  function konfetti(emoji) {
    const c = $('#konfetti');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    const x = c.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const kolory = ['#ff5f6d', '#ffc371', '#2ee59d', '#7c5cff', '#4cc9f0', '#ffffff', '#ff9f1c'];
    const cz = [];
    const W = innerWidth, H = innerHeight;
    for (let i = 0; i < 220; i++) {
      const lewa = i % 2 === 0;
      cz.push({
        x: lewa ? -10 : W + 10, y: H * (0.55 + Math.random() * 0.3),
        vx: (lewa ? 1 : -1) * (4 + Math.random() * 9), vy: -(9 + Math.random() * 11),
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
        w: 6 + Math.random() * 8, h: 4 + Math.random() * 6,
        k: kolory[i % kolory.length], e: emoji && i % 9 === 0 ? emoji : null, t: Math.random() * 6,
      });
    }
    const t0 = performance.now();
    zatrzymajKonfetti();
    const krok = (t) => {
      x.clearRect(0, 0, W, H);
      let zywe = 0;
      for (const p of cz) {
        p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy; p.r += p.vr; p.t += 0.1;
        if (p.y > H + 40) continue;
        zywe++;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r);
        if (p.e) { x.font = '26px serif'; x.fillText(p.e, -13, 9); }
        else { x.fillStyle = p.k; x.scale(1, Math.cos(p.t)); x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
        x.restore();
      }
      if (zywe && t - t0 < 7000) konf = requestAnimationFrame(krok);
      else x.clearRect(0, 0, W, H);
    };
    konf = requestAnimationFrame(krok);
  }
  function zatrzymajKonfetti() { if (konf) cancelAnimationFrame(konf); konf = null; }

  /* ================= DOŁĄCZANIE ================= */
  let wybraneEmoji = '';
  function pokazDolacz(komunikat) {
    pokazEkran('dolacz');
    const pr = S && S.me && S.powrot ? S.me : profil();
    $('#dolacz-imie').value = pr.name;
    wybraneEmoji = pr.emoji;
    $('#dolacz-emoji').textContent = wybraneEmoji;
    const k = $('#dolacz-komunikat');
    k.hidden = !komunikat; k.textContent = komunikat || '';
    clearTimeout(pokazDolacz.t);
    pokazDolacz.t = setTimeout(() => { if (S && S.ekran === 'dolacz' && !S.room) { $('#dolacz-szukam').hidden = true; $('#dolacz-brak').hidden = false; } }, 14000);
    rysujDolacz();
  }

  function rysujDolacz() {
    const jest = !!S.room;
    $('#dolacz-szukam').hidden = jest || !$('#dolacz-brak').hidden;
    if (jest) $('#dolacz-brak').hidden = true;
    $('#dolacz-form').hidden = !jest;
    if (!jest) {
      $('#dolacz-szukam-tekst').textContent = S.polaczenie.ok ? 'Szukam pokoju…' : 'Łączę z pokojem…';
      return;
    }
    const r = S.room;
    const u = uczestnicy();
    const host = S.peers.get(r.host);
    document.title = r.title + ' – zaproszenie – Jednogłośnie';
    $('#dolacz-zaproszenie').textContent = host ? `${host.emoji} ${host.name} zaprasza do wyboru` : 'Zaproszenie do wspólnego wyboru';
    $('#dolacz-tytul').textContent = r.title;
    const rodz = r.kind === 'obiad' ? 'obiad' : r.kind === 'film' ? 'film' : 'własna lista';
    const n = S.lista.length;
    $('#dolacz-info').textContent = [
      `${n} ${odm(n, PROP)}`, rodz,
      u.length ? u.length + ' ' + odm(u.length, OSOBA) + ' w pokoju' : 'możesz być pierwszą osobą',
      r.prog === 'bez1' ? 'wystarczą wszyscy oprócz jednej osoby' : '',
      r.limit ? `⏱ ${r.limit / 60} min na decyzję` : '',
    ].filter(Boolean).join(' · ');
    $('#dolacz-osoby').innerHTML = u.slice(0, 8).map(p => `<span class="awatar duzy" title="${esc(p.name)}">${esc(p.emoji)}</span>`).join('');
    $('#dolacz-btn').textContent = S.powrot ? 'Wracam do głosowania' : 'Dołączam i przesuwam';
    // nowa runda z tą samą ekipą – dołączamy sami, bez klikania
    if (S.auto && !S.powrot) { S.auto = false; setTimeout(() => { if (S && S.ekran === 'dolacz' && S.room) $('#dolacz-form').requestSubmit(); }, 250); }
  }

  function siatkaEmoji(box, onWybor) {
    if (!box.hidden) { box.hidden = true; return; }
    box.innerHTML = EMOJI_AWATARY.map(e => `<button type="button" data-e="${esc(e)}">${esc(e)}</button>`).join('');
    box.hidden = false;
    box.onclick = (ev) => {
      const b = ev.target.closest('[data-e]');
      if (!b) return;
      onWybor(b.dataset.e);
      box.hidden = true;
    };
  }
  $('#dolacz-emoji').addEventListener('click', () => siatkaEmoji($('#dolacz-emoji-siatka'), (e) => { wybraneEmoji = e; $('#dolacz-emoji').textContent = e; }));
  $('#dolacz-kostka').addEventListener('click', () => {
    const p = losujPseudonim();
    $('#dolacz-imie').value = p.name; wybraneEmoji = p.emoji; $('#dolacz-emoji').textContent = p.emoji;
  });
  $('#dolacz-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!S || !S.room) return;
    const name = txt($('#dolacz-imie').value, 24) || losujPseudonim().name;
    if (S.me && S.powrot) {
      // powrót po usunięciu z głosowania – ta sama tożsamość, te same głosy
      S.me.name = name; S.me.emoji = wybraneEmoji || S.me.emoji;
      idStore('jg:ja:' + S.id, S.me);
      S.powrot = false;
      S.lacze.ustawPid(S.me.pid);
      zapisz('wyl/' + S.me.pid, { wyl: 0, by: S.me.pid });
      wejdz();
      toast('Wracasz do głosowania – z poprzednimi głosami.');
      return;
    }
    S.me = { pid: losId(8), name, emoji: wybraneEmoji || '🙂' };
    if (!hashParams().test) ls('jg:profil', { name, emoji: S.me.emoji });
    idStore('jg:ja:' + S.id, S.me);
    S.lacze.ustawPid(S.me.pid);
    publikujMnie({});
    wejdz();
    toast('Jesteś w pokoju. Przesuwaj!');
  });

  function wyrzucony() {
    S.powrot = true;
    S.historia = [];
    stos.wyczysc();
    zamknijDialogi();
    pokazDolacz(MSG_POWROT);
  }

  /* ================= ZAPROSZENIE ================= */
  function kopiuj(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).catch(() => kopiujStaro(t));
    return Promise.resolve(kopiujStaro(t));
  }
  function kopiujStaro(t) {
    const a = document.createElement('textarea');
    a.value = t; a.style.position = 'fixed'; a.style.opacity = '0';
    document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); } catch (e) {}
    a.remove();
  }

  function qrSvg(tekst) {
    if (typeof qrcode !== 'function') return '';
    const q = qrcode(0, 'M');
    q.addData(tekst);
    q.make();
    const n = q.getModuleCount(), m = 2;
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + m} ${y + m}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n + 2 * m} ${n + 2 * m}" shape-rendering="crispEdges" aria-hidden="true"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#120f1d"/></svg>`;
  }

  function otworzZapros() {
    if (!S || !S.room) return;
    const link = linkDoPokoju(S.id);
    const zach = RODZAJE[S.room.kind].zach + (S.room.kind === 'wlasne' ? ' „' + S.room.title + '”' : '');
    $('#zapros-link').value = link;
    $('#zapros-wa').href = 'https://wa.me/?text=' + encodeURIComponent(zach + ' ' + link);
    $('#zapros-sms').href = 'sms:?&body=' + encodeURIComponent(zach + ' ' + link);
    $('#zapros-mail').href = 'mailto:?subject=' + encodeURIComponent(S.room.title + ' – Jednogłośnie') + '&body=' + encodeURIComponent(zach + '\n\n' + link);
    $('#zapros-share').hidden = !navigator.share;
    $('#zapros-share').onclick = () => navigator.share({ title: S.room.title + ' – Jednogłośnie', text: zach, url: link }).catch(() => {});
    $('#zapros-qr').innerHTML = qrSvg(link);
    $('#zapros-plik').hidden = location.protocol !== 'file:';
    $('#zapros-kopiuj').textContent = 'Kopiuj';
    otworzDialog($('#arkusz-zapros'));
  }
  $('#btn-zapros').addEventListener('click', otworzZapros);
  $('#zacheta').addEventListener('click', otworzZapros);
  $('#zapros-kopiuj').addEventListener('click', () => {
    kopiuj($('#zapros-link').value).then(() => { $('#zapros-kopiuj').textContent = 'Skopiowano ✓'; toast('Link skopiowany – wklej go znajomym.'); });
  });
  $('#zapros-link').addEventListener('focus', (e) => e.target.select());
  $('#zapros-test').addEventListener('click', () => {
    window.open(location.href.split('#')[0] + '#p=' + S.id + '&test=1', '_blank');
  });

  /* ================= OSOBY ================= */
  function rysujOsoby() {
    if (!S || !S.room) return;
    const u = uczestnicy();
    const n = S.lista.length;
    $('#osoby-tytul').textContent = `W pokoju: ${u.length} ${odm(u.length, OSOBA)}`;
    const html = u.map(p => {
      const ja = S.me && p.pid === S.me.pid;
      const on = jestOnline(p.pid);
      const g = ileGlosow(p);
      return `<li class="osoba${on ? ' jest' : ''}">
        <span class="awatar duzy${on ? ' jest' : ''}">${esc(p.emoji)}</span>
        <span class="osoba-tekst"><b>${esc(p.name)}${ja ? ' <small>(Ty)</small>' : ''}${p.pid === S.room.host ? ' <small class="zal">zakłada pokój</small>' : ''}</b>
        <span class="osoba-postep"><i style="--p:${Math.round(100 * g / n)}"></i></span>
        <small>${g}/${n} ocenionych · ${on ? 'teraz w pokoju' : 'poza pokojem'}</small></span>
        ${!ja && !on && !(S.room.demo) ? `<button type="button" class="btn-tekst" data-usun="${esc(p.pid)}">Usuń z głosowania</button>` : ''}
      </li>`;
    }).join('') + [...S.peers.entries()].filter(([pid]) => S.kicked.has(pid) && !(S.me && pid === S.me.pid)).map(([pid, p]) => {
      const w = S.lacze.get('wyl/' + pid);
      const sam = w && w.by === pid;
      return `<li class="osoba poza-glosowaniem">
        <span class="awatar duzy">${esc(p.emoji)}</span>
        <span class="osoba-tekst"><b>${esc(p.name)}</b><small>${sam ? 'wychodzi z pokoju' : 'usunięte z głosowania'} · głosy się nie liczą</small></span>
        ${sam ? '' : `<button type="button" class="btn-tekst" data-przywroc="${esc(pid)}">Przywróć</button>`}
      </li>`;
    }).join('');
    const ul = $('#osoby-lista');
    if (ul.innerHTML !== html) ul.innerHTML = html;
  }
  function usunOsobe(pid) {
    if (!S || !S.me) return;
    const p = S.peers.get(pid);
    if (!p) return;
    if (!confirm(`Usunąć ${p.emoji} ${p.name} z głosowania? Dopasowanie nie będzie już czekać na tę osobę. Gdy wróci, jednym kliknięciem odzyska swoje głosy.`)) return;
    zapisz('wyl/' + pid, { wyl: 1, by: S.me.pid });
  }
  $('#osoby-lista').addEventListener('click', (e) => {
    const b = e.target.closest('[data-usun], [data-przywroc]');
    if (!b || !S || !S.me) return;
    if (b.dataset.usun) usunOsobe(b.dataset.usun);
    else zapisz('wyl/' + b.dataset.przywroc, { wyl: 0, by: S.me.pid });
  });
  $('#btn-osoby').addEventListener('click', () => {
    if (!S || !S.me) return;
    $('#ja-imie').value = S.me.name;
    $('#ja-emoji').textContent = S.me.emoji;
    $('#ja-emoji-siatka').hidden = true;
    $('#dzwiek').checked = dzwiekOn;
    rysujOsoby();
    otworzDialog($('#arkusz-osoby'));
  });
  function zmienMnie(name, emoji) {
    if (!S || !S.me) return;
    if (name != null) S.me.name = txt(name, 24) || S.me.name;
    if (emoji) S.me.emoji = emoji;
    idStore('jg:ja:' + S.id, S.me);
    if (!hashParams().test) ls('jg:profil', { name: S.me.name, emoji: S.me.emoji });
    publikujMnie();
    zmiana();
  }
  let tImie = 0;
  $('#ja-imie').addEventListener('input', (e) => { clearTimeout(tImie); tImie = setTimeout(() => zmienMnie(e.target.value), 400); });
  $('#ja-emoji').addEventListener('click', () => siatkaEmoji($('#ja-emoji-siatka'), (e) => { $('#ja-emoji').textContent = e; zmienMnie(null, e); }));
  $('#ja-kostka').addEventListener('click', () => { const p = losujPseudonim(); $('#ja-imie').value = p.name; $('#ja-emoji').textContent = p.emoji; zmienMnie(p.name, p.emoji); });
  $('#dzwiek').addEventListener('change', (e) => { dzwiekOn = e.target.checked; ls('jg:dzwiek', dzwiekOn); if (dzwiekOn) dzwiek('tak'); });
  $('#btn-wyjdz').addEventListener('click', () => {
    if (!confirm('Wyjść z pokoju? Twoje głosy przestaną się liczyć.')) return;
    S.lacze.put('wyl/' + S.me.pid, { wyl: 1, by: S.me.pid });
    idStore('jg:ja:' + S.id, null);
    const lista = (ls('jg:pokoje') || []).filter(r => r && r.id !== S.id);
    ls('jg:pokoje', lista);
    zamknijDialogi();
    setTimeout(() => { location.hash = ''; }, 150);
  });

  /* ================= WYNIKI ================= */
  function rysujWyniki() {
    const w = S.wyniki;
    const u = uczestnicy();
    const dec = S.decyzja && S.items.get(S.decyzja.id);
    $('#wyniki-tytul').textContent = w.length > 1 ? `Dopasowania: ${w.length}` : w.length ? 'Dopasowanie' : 'Wyniki';
    let h = '';
    if (dec) h += `<p class="etykieta">${S.decyzja.powod === 'czas' ? '⏱️ Po czasie wybrane' : '🎲 Los zdecydował'}</p><div class="koniec-wyniki"><button type="button" class="wynik-btn" data-decyzja="1"><span>${esc(dec.e || '💡')}</span>${esc(dec.n)}</button></div>`;
    if (w.length) h += (dec ? '<p class="etykieta">Jednogłośnie</p>' : '') + '<div class="koniec-wyniki">' + w.map(i => `<button type="button" class="wynik-btn" data-wynik="${esc(i.id)}"><span>${esc(i.e || '💡')}</span>${esc(i.n)}</button>`).join('') + '</div>';
    if (S.czekajace.length) {
      h += '<p class="etykieta">⏳ Czekają na nowe osoby</p><ul class="czekajace-lista">' + S.czekajace.map(i => {
        const kto = u.filter(p => p.votes[i.id] === undefined).map(p => esc(p.emoji + ' ' + p.name)).join(', ');
        return `<li><b>${esc(i.e || '💡')} ${esc(i.n)}</b><small>było dopasowanie · jeszcze nie ocenia: ${kto}</small></li>`;
      }).join('') + '</ul>';
    }
    $('#wyniki-tresc').innerHTML = h + '<p class="male">Dotknij, żeby zobaczyć szczegóły i linki.</p>';
  }
  $('#btn-wyniki').addEventListener('click', () => { rysujWyniki(); otworzDialog($('#arkusz-wyniki')); });
  $('#wyniki-tresc').addEventListener('click', (e) => {
    const b = e.target.closest('[data-wynik], [data-decyzja]');
    if (!b) return;
    if (b.dataset.decyzja) pokazDopasowanie(S.items.get(S.decyzja.id), S.decyzja.powod);
    else pokazDopasowanie(S.items.get(b.dataset.wynik));
  });

  /* ================= DORZUĆ PROPOZYCJĘ ================= */
  function mojeDod() { return (S && S.me && S.dod.get(S.me.pid)) || []; }
  function otworzDorzuc() {
    if (!S || !S.me || !S.room) return;
    rysujDorzuc();
    otworzDialog($('#arkusz-dorzuc'));
    setTimeout(() => $('#dorzuc-pole').focus(), 60);
  }
  function rysujDorzuc() {
    const m = mojeDod();
    const zostalo = MAX_DOD - m.length;
    $('#dorzuc-info').textContent = zostalo > 0 ? `Możesz dorzucić jeszcze ${zostalo}. Emoji na początku trafi na kartę.` : 'To już 10 Twoich propozycji – więcej się nie zmieści.';
    $('#dorzuc-form button').disabled = zostalo <= 0;
    $('#dorzuc-lista').innerHTML = m.map(i => `<li><span>${esc(i.e || '💡')}</span>${esc(i.n)}</li>`).join('');
  }
  $('#btn-dorzuc').addEventListener('click', otworzDorzuc);
  $('#dorzuc-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!S || !S.me || !S.room) return;
    const [it] = parsujWlasne($('#dorzuc-pole').value);
    if (!it) { $('#dorzuc-pole').focus(); return; }
    if (S.lista.some(i => i.n.toLowerCase() === it.n.toLowerCase())) { toast('Taka propozycja już jest w talii.'); return; }
    const m = mojeDod();
    if (m.length >= MAX_DOD) return;
    const nowy = { id: `w-${S.me.pid}-${m.length + 1}`, n: it.n, e: it.e, h: it.h, a: `${S.me.emoji} ${S.me.name}` };
    zapisz('dod/' + S.me.pid, { items: m.concat(nowy) });
    // kto dorzuca, ten od razu jest na „tak” – dzięki temu inni dostaną ją na początek talii
    publikujMnie(Object.assign({}, mojeGlosy(), { [nowy.id]: 1 }));
    $('#dorzuc-pole').value = '';
    rysujDorzuc();
    toast('Dodane – inni zobaczą ją na początku talii.');
    zmiana();
  });

  /* ================= DOSTOSUJ ================= */
  let zakladka = 'obiad';
  $('#filtry-gatunki').innerHTML = GATUNKI.map(g => `<label class="chip"><input type="checkbox" value="${esc(g)}" checked><span>${esc(g)}</span></label>`).join('');
  let dostosujRunda = false;
  function otworzDostosuj(z, runda) {
    dostosujRunda = !!runda;
    $('#dostosuj-tytul').textContent = runda ? 'Nowa runda z tą ekipą' : 'Nowy pokój';
    $('#dostosuj-runda-info').hidden = !runda;
    $('#dostosuj-zaloz').textContent = runda ? 'Zaczynamy nową rundę' : 'Załóż pokój';
    ustawZakladke(RODZAJE[z] ? z : 'obiad');
    otworzDialog($('#arkusz-dostosuj'));
  }
  function ustawZakladke(z) {
    zakladka = z;
    $$('[data-zakladka]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.zakladka === z)));
    $$('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== z);
    $('#wlasne-etykieta').innerHTML = z === 'wlasne'
      ? 'Propozycje <span class="male">(każda w osobnej linii, emoji na początku – opcjonalnie)</span>'
      : 'Dorzuć własne propozycje <span class="male">(każda w osobnej linii, opcjonalnie)</span>';
    $('#wlasne-lista').placeholder = z === 'film' ? '🎄 Ten świąteczny, który zawsze oglądamy\nCoś z Netflixa, byle krótkiego' : z === 'wlasne' ? '🏔️ Zakopane\n🌊 Hel\n🏰 Kraków\n🌲 Bieszczady' : '🍝 Spaghetti od mamy\nBar mleczny na rogu\nResztki z lodówki';
    $('#liczba-wiersz').hidden = z === 'wlasne';
    podsumuj();
  }
  $$('[data-zakladka]').forEach(b => b.addEventListener('click', () => ustawZakladke(b.dataset.zakladka)));
  $('#gatunki-wszystkie').addEventListener('click', () => {
    const boxy = $$('#filtry-gatunki input');
    const wszystkie = boxy.every(b => b.checked);
    boxy.forEach(b => b.checked = !wszystkie);
    $('#gatunki-wszystkie').textContent = wszystkie ? 'zaznacz wszystkie' : 'odznacz wszystkie';
    podsumuj();
  });
  $('#arkusz-dostosuj').addEventListener('input', podsumuj);
  function opcjeDostosuj() {
    const o = { rodzaj: zakladka, wlasne: parsujWlasne($('#wlasne-lista').value), filtry: {} };
    if (zakladka === 'obiad') $$('#filtry-obiad input').forEach(b => { if (b.checked) o.filtry[b.value] = true; });
    if (zakladka === 'film') {
      o.filtry.gatunki = $$('#filtry-gatunki input').filter(b => b.checked).map(b => b.value);
      o.filtry.krotki = $('#film-krotki').checked;
      o.filtry.polskie = $('#film-polskie').checked;
    }
    o.liczba = zakladka === 'wlasne' ? 0 : Number(($('[name=liczba]:checked') || {}).value || 25);
    o.prog = (($('[name=prog]:checked') || {}).value) === 'bez1' ? 'bez1' : 'wszyscy';
    o.limit = Number(($('[name=limit]:checked') || {}).value || 0);
    if (zakladka === 'wlasne') o.tytul = $('#wlasne-tytul').value || 'Co wybieramy?';
    return o;
  }
  function podsumuj() {
    const o = opcjeDostosuj();
    const pula = pulaZFiltrow(o.rodzaj, o.filtry).length;
    const z = Math.min(pula, o.liczba);
    const razem = z + o.wlasne.length;
    let t;
    if (o.rodzaj === 'wlasne') t = razem < 2 ? 'Wpisz co najmniej dwie propozycje.' : `${razem} ${odm(razem, PROP)} do przesuwania.`;
    else t = `W puli ${pula} ${odm(pula, PROP)}` + (o.wlasne.length ? ` + ${o.wlasne.length} ${odm(o.wlasne.length, ['własna', 'własne', 'własnych'])}` : '') + ` → każdy oceni ${razem}.`;
    if (o.prog === 'bez1') t += ' Każdy ma jedno weto ⛔ – blokuje propozycję, nawet gdy reszta jest na tak.';
    if (o.limit) t += ` Po ${o.limit / 60} min wygrywa propozycja z największym poparciem.`;
    $('#dostosuj-podsumowanie').textContent = t;
    $('#dostosuj-zaloz').disabled = razem < 2;
  }
  $('#dostosuj-zaloz').addEventListener('click', () => {
    const o = opcjeDostosuj();
    o.runda = dostosujRunda;
    $('#arkusz-dostosuj').close();
    if (zalozPokoj(o)) { $('#wlasne-lista').value = ''; $('#wlasne-tytul').value = ''; }
  });

  /* ---------- dialogi ---------- */
  function otworzDialog(d) {
    zamknijDialogi();
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }
  function zamknijDialogi() { $$('dialog[open]').forEach(d => d.close ? d.close() : d.removeAttribute('open')); }
  $$('dialog').forEach(d => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  /* ================= WIRTUALNI ZNAJOMI (tryb próbny) ================= */
  function uruchomBoty() {
    if (S.boty || !S.room || !S.room.demo) return;
    const start = S.room.created || Date.now();
    const stanBota = BOTY.map(b => ({
      b, nast: 0, rnd: rng(hash(S.id + b.pid)),
      porz: new Map(mieszaj(S.room.items.map(i => i.id), rng(hash(b.pid + S.id))).map((id, i) => [id, i])),
    }));
    S.boty = setInterval(() => {
      if (!S || !S.room) return;
      const teraz = Date.now();
      let cos = false;
      for (const s of stanBota) {
        const { b } = s;
        if (S.kicked.has(b.pid)) continue;
        let p = S.peers.get(b.pid);
        if (!p) {
          if (teraz - start < b.za) continue;
          const v = S.lacze.put('p/' + b.pid, { name: b.name, emoji: b.emoji, votes: {}, joined: teraz }, true);
          onPut('p/' + b.pid, v, 'bot');
          s.nast = teraz + 1200 + s.rnd() * 1000;
          continue;
        }
        if (teraz < s.nast) continue;
        const wolne = S.lista.filter(i => p.votes[i.id] === undefined);
        if (!wolne.length) continue;
        const ile = (id) => uczestnicy().reduce((n, u) => n + (u.pid !== b.pid && u.votes[id] === 1 ? 1 : 0), 0);
        const pz = (id) => s.porz.has(id) ? s.porz.get(id) : 999;
        wolne.sort((a, c) => (ile(c.id) - ile(a.id)) || (pz(a.id) - pz(c.id)));
        const it = wolne[0];
        const ja = mojeGlosy()[it.id] === 1;
        const szansa = it.id === S.room.demo.sekret ? 1 : ja ? 0.62 : 0.3;
        const glosy = Object.assign({}, p.votes, { [it.id]: s.rnd() < szansa ? 1 : 0 });
        const v = S.lacze.put('p/' + b.pid, { name: b.name, emoji: b.emoji, votes: glosy, joined: p.joined }, true);
        S.peers.set(b.pid, czystaOsoba(v));
        s.nast = teraz + 650 + s.rnd() * 1700;
        cos = true;
      }
      if (cos) zmiana();
    }, 250);
  }

  /* ---------- start ---------- */
  window.addEventListener('pagehide', () => { if (S && S.lacze && S.me) S.lacze.hb({ off: 1 }); });
  /* Po odblokowaniu telefonu / powrocie do karty / odzyskaniu sieci: łączymy od razu, bez czekania na kolejną próbę. */
  function obudz() {
    if (!S || !S.lacze) return;
    S.lacze.obudz();
    if (S.me) S.lacze.hb({ ask: 1 });
    zmianaLekka();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') obudz(); });
  window.addEventListener('online', obudz);
  window.addEventListener('pageshow', (e) => { if (e.persisted) obudz(); });
  trasa();
})();
