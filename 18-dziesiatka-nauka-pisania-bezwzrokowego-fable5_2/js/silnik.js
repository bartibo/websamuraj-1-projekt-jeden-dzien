/* Dziesiątka – silnik: sesja pisania (pomiar) i generator ćwiczeń */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const DZ = G.DZ;

  const los = a => a[Math.floor(Math.random() * a.length)];
  const tasuj = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const jestLitera = c => /^[a-ząćęłńóśźż]$/.test(c);
  const jestWielka = c => /^[A-ZĄĆĘŁŃÓŚŹŻ]$/.test(c);
  const jestCyfra = c => /^[0-9]$/.test(c);
  const wielka = w => w[0].toUpperCase() + w.slice(1);
  DZ.narz = { los, tasuj, jestLitera, jestWielka, jestCyfra };

  /* =====================================================================
     Sesja pisania – czysta logika, bez DOM
     tryb 'blokuj'   – kursor stoi, dopóki nie trafisz we właściwy klawisz
     tryb 'swobodny' – błędny znak zostaje, można cofać Backspace
     ===================================================================== */
  class Sesja {
    constructor(tekst, tryb) {
      this.tekst = [...tekst];
      this.tryb = tryb === 'swobodny' ? 'swobodny' : 'blokuj';
      const n = this.tekst.length;
      this.poz = 0;
      this.stan = new Uint8Array(n);      // 0 – nietknięty, 1 – dobrze, 2 – źle, 3 – dobrze po pomyłce
      this.probowane = new Uint8Array(n);
      this.blad = false;                  // (blokuj) bieżący znak ma już pomyłkę
      this.uderzenia = 0; this.trafne = 0; this.pozBledne = 0;
      this.probki = [];                   // { ch, ok, ms } – pierwsza próba każdego znaku
      this.pomylki = [];                  // [oczekiwany, wpisany]
      this.tStart = null; this.tOst = null; this.aktywny = 0;
      this.koniec = n === 0;
    }
    get oczekiwany() { return this.tekst[this.poz]; }
    wpisz(ch, t) {
      if (this.koniec) return null;
      const ocz = this.tekst[this.poz];
      let dt = null;
      if (this.tStart === null) this.tStart = t;
      else { dt = t - this.tOst; this.aktywny += Math.min(dt, 4000); }
      this.tOst = t;
      this.uderzenia++;
      const ok = ch === ocz;
      const ms = dt !== null && dt <= 3000 ? dt : null;
      if (this.tryb === 'blokuj') {
        if (ok) {
          this.trafne++;
          if (!this.blad) { this.probki.push({ ch: ocz, ok: true, ms }); this.stan[this.poz] = 1; }
          else this.stan[this.poz] = 3;
          this.blad = false; this.poz++;
        } else if (!this.blad) {
          this.blad = true; this.pozBledne++;
          this.probki.push({ ch: ocz, ok: false, ms: null });
          this.pomylki.push([ocz, ch]);
        }
      } else {
        if (ok) this.trafne++;
        if (!this.probowane[this.poz]) {
          this.probowane[this.poz] = 1;
          this.probki.push({ ch: ocz, ok, ms: ok ? ms : null });
          if (!ok) this.pomylki.push([ocz, ch]);
        }
        this.stan[this.poz] = ok ? 1 : 2;
        this.poz++;
      }
      if (this.poz >= this.tekst.length) this.koniec = true;
      return { ok, koniec: this.koniec };
    }
    cofnij() {
      if (this.tryb !== 'swobodny' || this.poz === 0 || this.koniec) return false;
      this.poz--; this.stan[this.poz] = 0;
      return true;
    }
    wynik(czasMs) {
      const ms = Math.max(czasMs != null ? czasMs : this.aktywny, 1);
      const blokuj = this.tryb === 'blokuj';
      let poprawne = 0, zostalo = 0;
      for (let i = 0; i < this.poz; i++) { if (this.stan[i] === 1 || this.stan[i] === 3) poprawne++; else if (this.stan[i] === 2) zostalo++; }
      const proby = this.poz + (this.blad ? 1 : 0);
      const dok = blokuj ? (proby ? 1 - this.pozBledne / proby : 1) : (this.uderzenia ? this.trafne / this.uderzenia : 1);
      const zle = {};
      for (const p of this.probki) if (!p.ok) zle[p.ch] = (zle[p.ch] || 0) + 1;
      return {
        znaki: this.poz, poprawne, zostalo,
        bledy: blokuj ? this.pozBledne : this.uderzenia - this.trafne,
        dok: Math.max(0, dok),
        znMin: ms >= 1500 ? poprawne / (ms / 60000) : 0,
        ms, zle, ukonczone: this.koniec
      };
    }
  }
  DZ.Sesja = Sesja;

  /* =====================================================================
     Generator ćwiczeń
     ===================================================================== */
  const gen = DZ.gen = {};
  const WULG = ['kurw', 'kurew', 'chuj', 'huj', 'pizd', 'jeb', 'dup', 'cip', 'kutas', 'pierd', 'sra', 'gown', 'gówn', 'fiut',
    'suk', 'szmat', 'dziw', 'cwel', 'peda', 'ciot', 'debil', 'idiot', 'cyc', 'kupa', 'siks', 'siur', 'sik', 'fuck', 'shit', 'sex', 'seks', 'gej', 'les'];
  const czysty = w => !WULG.some(x => w.includes(x));

  const pamiec = new Map();
  const klucz = (zbior, dop) => [...zbior].sort().join('') + '|' + dop;

  // Słowa ze słownika złożone wyłącznie z dozwolonych liter
  gen.slowa = function (dozw, min) {
    min = min || 2;
    const k = klucz(dozw, 's' + min);
    if (!pamiec.has(k)) pamiec.set(k, DZ.SLOWNIK.filter(w => w.length >= min && [...w].every(c => dozw.has(c))));
    return pamiec.get(k);
  };

  // Łańcuch przejść litera → litera zbudowany ze słownika (tylko dozwolone litery)
  function lancuch(dozw) {
    const k = klucz(dozw, 'l');
    if (pamiec.has(k)) return pamiec.get(k);
    const start = {}, przej = {};
    for (const w of DZ.SLOWNIK) {
      let poprz = null;
      for (const ch of w) {
        if (!dozw.has(ch)) { poprz = null; continue; }
        if (poprz === null) start[ch] = (start[ch] || 0) + 1;
        else { const m = przej[poprz] = przej[poprz] || {}; m[ch] = (m[ch] || 0) + 1; }
        poprz = ch;
      }
    }
    const l = { start, przej };
    pamiec.set(k, l);
    return l;
  }
  function losWazony(mapa) {
    let suma = 0; for (const k in mapa) suma += mapa[k];
    if (!suma) return null;
    let r = Math.random() * suma;
    for (const k in mapa) { r -= mapa[k]; if (r <= 0) return k; }
    return null;
  }
  // Pseudosłowo: brzmi mniej więcej po polsku, zawiera przynajmniej jedną z liter „nowe”
  function pseudo(litery, dozw, dl, nowe) {
    const l = lancuch(dozw);
    for (let proba = 0; proba < 12; proba++) {
      let ch = (Math.random() < 0.85 && losWazony(l.start)) || los(litery);
      let w = ch;
      while (w.length < dl) {
        let n = (Math.random() < 0.9 && l.przej[ch] && losWazony(l.przej[ch])) || los(litery);
        if (w.length >= 2 && n === w[w.length - 1] && n === w[w.length - 2]) n = los(litery);
        w += n; ch = n;
      }
      if (nowe && nowe.length && ![...w].some(c => nowe.includes(c))) {
        const i = Math.floor(Math.random() * w.length);
        w = w.slice(0, i) + los(nowe) + w.slice(i + 1);
      }
      if (czysty(w)) return w;
    }
    return los(nowe && nowe.length ? nowe : litery).repeat(2);
  }
  gen.pseudo = pseudo;

  function zloz(daj, cel) {
    const out = []; let dl = 0, ost = '', straz = 0;
    while (dl < cel && straz++ < 600) {
      const w = daj(out.length);
      if (!w || w === ost) continue;
      out.push(w); dl += w.length + 1; ost = w;
    }
    return out.join(' ');
  }

  // Znaki dostępne po lekcji o danym indeksie (bez spacji)
  gen.dozwolone = function (idx) {
    const s = new Set();
    for (let i = 0; i <= idx && i < DZ.LEKCJE.length; i++) for (const c of DZ.LEKCJE[i].nowe) s.add(c);
    return s;
  };
  gen.wszystkie = () => gen.dozwolone(DZ.LEKCJE.length - 1);

  /* ----- krok 1: suchy dryl nowych klawiszy ----- */
  function drylNowe(nowe, dozw, cel) {
    const grupy = nowe.map(c => {
      const z = DZ.ZNAK[c];
      if (z.alt && !z.shift) { const b = DZ.BAZA[c]; return [b + c, c + b, c + c, b + c + b, c + b + c]; }
      if (jestWielka(c)) { const m = c.toLowerCase(); return [c + m, c + m + m, c + m, m + c + m]; }
      const dom = DZ.DOM[z.p];
      if (dom && dom !== c && dozw.has(dom) && !z.shift) return [dom + c + dom, c + c + c, dom + c, c + dom, c + dom + c];
      if (z.shift && dom && dozw.has(dom)) return [c, c + c, dom + c, c, c + c + c];
      return [c + c + c, c + c, c, c + c + c, c + c];
    });
    const out = [];
    const rund = Math.max(...grupy.map(g => g.length));
    for (let r = 0; r < rund; r++) for (const g of (nowe.length > 4 ? tasuj(grupy) : grupy)) if (g[r]) out.push(g[r]);
    if (nowe.length >= 2 && nowe.length <= 4 && !nowe.some(jestWielka)) {
      for (let i = 0; i < nowe.length; i++) {
        const a = nowe[i], b = nowe[(i + 1) % nowe.length];
        out.push(a + b, b + a, a + a + b, b + b + a, a + b + a, b + a + b);
      }
    }
    let t = out.join(' ');
    while (t.length < cel * 0.75) t += ' ' + tasuj(out).join(' ');
    if (t.length > cel * 1.25) t = t.slice(0, t.lastIndexOf(' ', Math.round(cel * 1.2)));
    return t;
  }

  /* ----- doklejanie interpunkcji i symboli do słów ----- */
  function ozdob(w, w2, z, dozw) {
    switch (z) {
      case '-': case '/': case '@': case '_': return w + z + w2;
      case '+': case '=': case '&': return w + ' ' + z + ' ' + w2;
      case '"': case "'": return z + w + z;
      case '(': case ')': return dozw.has('(') && dozw.has(')') ? '(' + w + ')' : w + z;
      case '#': return z + w;
      case '%': { const c = [...dozw].filter(jestCyfra); return (c.length ? los(c) + los(c) : w) + z; }
      default: return w + z;
    }
  }
  function ozdobTekst(tekst, znaki, gestosc, dozw) {
    const sl = tekst.split(' ');
    const out = [];
    for (let i = 0; i < sl.length; i++) {
      if (Math.random() < gestosc) {
        const z = los(znaki);
        const lacznik = '-/@_+=&'.includes(z);
        out.push(ozdob(sl[i], lacznik && sl[i + 1] ? sl[i + 1] : sl[i], z, dozw));
        if (lacznik && sl[i + 1]) i++;
      } else out.push(sl[i]);
    }
    return out.join(' ');
  }

  /* ----- materiał: litery ----- */
  function literyTekst(dozw, nl, poziom, cel) {
    const L = [...dozw].filter(jestLitera);
    const D = new Set(L);
    const ogonki = nl.length > 0 && nl.every(c => DZ.BAZA[c]);
    const wszystkie = gen.slowa(D, 2).filter(w => poziom < 3 ? w.length <= 7 : true);
    const zNowa = nl.length ? wszystkie.filter(w => [...w].some(c => nl.includes(c))) : wszystkie;
    const reszta = wszystkie.filter(w => !zNowa.includes(w));
    const samogloski = L.some(c => 'aąeęioóuy'.includes(c));
    const dlPseudo = () => (L.length <= 4 || !samogloski) ? 2 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3) + (poziom > 1 ? 1 : 0);
    if (poziom === 1 && !ogonki) return zloz(() => pseudo(L, D, dlPseudo(), nl), cel);
    if (poziom === 1) {
      const krotkie = zNowa.filter(w => w.length <= 5);
      if (krotkie.length >= 6) return zloz(() => los(krotkie), cel);
    }
    if (zNowa.length >= 6) return zloz(() => (reszta.length && Math.random() < 0.3) ? los(reszta) : los(zNowa), cel);
    if (wszystkie.length >= 3) return zloz(() => Math.random() < 0.5 ? los(zNowa.length ? zNowa : wszystkie) : pseudo(L, D, dlPseudo(), nl), cel);
    return zloz(() => pseudo(L, D, dlPseudo(), nl), cel);
  }

  /* ----- materiał: wielkie litery ----- */
  function wielkieTekst(dozw, nw, poziom, cel) {
    const D = new Set([...dozw].filter(jestLitera));
    const ok = w => [...w].every(c => dozw.has(c));
    const nazwy = [...DZ.IMIONA, ...DZ.MIASTA].filter(w => nw.includes(w[0]) && ok(w));
    const male = gen.slowa(D, 2).filter(w => w.length <= (poziom === 1 ? 5 : 8));
    const pocz = male.filter(w => w.length >= 3 && nw.includes(w[0].toUpperCase())).map(wielka);
    const pula = [...nazwy, ...nazwy, ...pocz];
    if (!pula.length) return zloz(() => los(nw) + los(nw).toLowerCase(), cel);
    if (poziom === 1) return zloz(() => los(pula), cel);
    return zloz(i => i % 2 === 0 || !male.length ? los(pula) : los(male), cel);
  }

  /* ----- materiał: cyfry ----- */
  function liczba(cyfry, nowe, dl) {
    let s = '';
    for (let i = 0; i < dl; i++) s += los(cyfry);
    if (nowe.length && ![...s].some(c => nowe.includes(c))) { const i = Math.floor(Math.random() * dl); s = s.slice(0, i) + los(nowe) + s.slice(i + 1); }
    if (s.length > 1 && s[0] === '0') { const bezZera = cyfry.filter(c => c !== '0'); if (bezZera.length) s = los(bezZera) + s.slice(1); }
    return s;
  }
  function cyfryTekst(dozw, nc, poziom, cel) {
    const C = [...dozw].filter(jestCyfra);
    const D = new Set([...dozw].filter(jestLitera));
    const male = gen.slowa(D, 3).filter(w => w.length <= 7);
    const n = dl => liczba(C, nc, dl);
    if (poziom === 1) return zloz(() => n(1 + Math.floor(Math.random() * 3)), cel);
    const formaty = [() => n(2), () => n(3), () => n(4), () => n(1)];
    if (poziom >= 3) {
      if (dozw.has('.')) formaty.push(() => n(2) + '.' + n(2));
      if (dozw.has(':')) formaty.push(() => n(2) + ':' + n(2));
      if (dozw.has(',')) formaty.push(() => n(2) + ',' + n(2));
      if (dozw.has('-')) formaty.push(() => n(2) + '-' + n(3));
    }
    return zloz(i => i % 2 === 0 ? los(formaty)() : los(male), cel);
  }

  /* ----- materiał: zdania ----- */
  function pulaZdan(dozw, zawiera) {
    return [...DZ.ZDANIA, ...DZ.PRZYSLOWIA].filter(z => {
      let ma = !zawiera;
      for (const c of z) { if (c === ' ') continue; if (!dozw.has(c)) return false; if (zawiera && zawiera.includes(c)) ma = true; }
      return ma;
    });
  }
  function zdaniaTekst(dozw, cel, zawiera, minPula) {
    const pula = pulaZdan(dozw, zawiera);
    if (pula.length < (minPula || 4)) return null;
    const out = []; let dl = 0;
    for (const z of tasuj(pula)) { if (dl >= cel) break; if (dl + z.length > cel * 1.35 && out.length) continue; out.push(z); dl += z.length + 1; }
    return out.join(' ');
  }
  gen.zdania = (cel, dozw) => zdaniaTekst(dozw || gen.wszystkie(), cel || 220, null, 1);

  /* ----- materiał: interpunkcja i symbole ----- */
  function interTekst(dozw, ni, poziom, cel, etap) {
    const D = new Set([...dozw].filter(jestLitera));
    const male = gen.slowa(D, 2).filter(w => w.length <= 6);
    if (poziom >= 2) {
      const z = zdaniaTekst(dozw, cel, ni, 5);
      if (z) return z;
      if (etap === 5) {
        const fr = DZ.FRAGMENTY.filter(f => [...f].every(c => c === ' ' || dozw.has(c)) && [...f].some(c => ni.includes(c)));
        if (fr.length >= 5) return zloz(i => i % 3 === 2 ? los(male) : los(fr), cel);
      }
    }
    return ozdobTekst(zloz(() => los(male), cel), ni, poziom === 1 ? 0.75 : 0.5, dozw);
  }

  function tekstLekcji(lek, dozw, nowe, poziom, cel) {
    const nl = nowe.filter(jestLitera), nw = nowe.filter(jestWielka), nc = nowe.filter(jestCyfra);
    const ni = nowe.filter(c => !jestLitera(c) && !jestWielka(c) && !jestCyfra(c));
    if (nw.length) return wielkieTekst(dozw, nw, poziom, cel);
    if (nc.length) return cyfryTekst(dozw, nc, poziom, cel);
    if (nl.length) { const t = literyTekst(dozw, nl, poziom, cel); return ni.length ? ozdobTekst(t, ni, 0.3, dozw) : t; }
    return interTekst(dozw, ni, poziom, cel, lek.etap);
  }

  function akapit(cel) {
    const t = los(DZ.TEKSTY);
    const zd = t.match(/[^.!?]+[.!?]+\s*/g) || [t];
    let out = '';
    for (const z of zd) { if (out.length >= cel) break; out += z; }
    return out.trim();
  }
  gen.akapit = akapit;

  /* ----- kroki lekcji ----- */
  gen.kroki = function (idx) {
    const lek = DZ.LEKCJE[idx];
    const dozw = gen.dozwolone(idx);
    const nowe = [...lek.nowe];
    const k = (nazwa, opis, tekst, podp) => ({ nazwa, opis, tekst, podp: podp !== false });

    if (lek.typ === 'powtorka') {
      const etapowe = DZ.LEKCJE.filter(l => l.etap === lek.etap).flatMap(l => [...l.nowe]).filter(jestLitera);
      return [
        k('Rozgrzewka', 'Układy liter z całego etapu', () => literyTekst(dozw, etapowe, 1, 90)),
        k('Słowa', 'Prawdziwe słowa z poznanych liter', () => literyTekst(dozw, etapowe, 2, 110)),
        k('Dłuższe słowa', 'Trzymaj równe tempo', () => literyTekst(dozw, [], 3, 130)),
        k('Bez podpowiedzi', 'Klawiatura nie pokazuje już następnego klawisza', () => literyTekst(dozw, etapowe, 3, 130), false)
      ];
    }
    if (lek.typ === 'zdania') {
      const z = cel => zdaniaTekst(dozw, cel, null, 1) || literyTekst(dozw, [], 3, cel);
      return [
        k('Krótkie zdania', 'Wielka litera, kropka, przecinek', () => z(110)),
        k('Więcej zdań', 'Pisz całymi słowami', () => z(150)),
        k('Bez podpowiedzi', 'Klawiatura nie pokazuje już następnego klawisza', () => z(170), false)
      ];
    }
    if (lek.typ === 'egzamin') {
      const mix = () => {
        const fr = tasuj(DZ.FRAGMENTY).slice(0, 5), zd = tasuj(pulaZdan(dozw)).slice(0, 3);
        return tasuj([...fr, ...zd]).join(' ');
      };
      return [
        k('Tekst ciągły', 'Pełny akapit z polskimi znakami', () => akapit(280)),
        k('Cyfry i symbole', 'Adresy, liczby, nawiasy i zdania', mix),
        k('Bez podpowiedzi', 'Ostatnia prosta: akapit bez wskazywania klawiszy', () => akapit(320), false)
      ];
    }
    return [
      k('Nowe klawisze', 'Powoli. Wyczuj drogę palca tam i z powrotem', () => drylNowe(nowe, dozw, 76)),
      k('Połączenia', 'Nowe klawisze razem z tymi, które już znasz', () => tekstLekcji(lek, dozw, nowe, 1, 90)),
      k('Słowa', 'Prawdziwy materiał z poznanych klawiszy', () => tekstLekcji(lek, dozw, nowe, 2, 110)),
      k('Bez podpowiedzi', 'Klawiatura nie pokazuje już następnego klawisza', () => tekstLekcji(lek, dozw, nowe, 3, 120), false)
    ];
  };

  /* ----- tryby treningu ----- */
  // Trening inteligentny: słowa losowane z wagą zależną od słabych liter
  gen.adaptacyjny = function (litery, wagi, cel, fokus) {
    const D = new Set(litery);
    const slowa = gen.slowa(D, 2);
    const waga = w => { let s = 0; for (const c of w) s += wagi[c] || 1; s /= w.length; return s * s * s; };
    if (slowa.length < 25) return zloz(() => slowa.length && Math.random() < 0.4 ? los(slowa) : pseudo(litery, D, 2 + Math.floor(Math.random() * 3), fokus), cel);
    const kum = []; let suma = 0;
    for (const w of slowa) { suma += waga(w); kum.push(suma); }
    const wybierz = () => {
      const r = Math.random() * suma; let a = 0, b = kum.length - 1;
      while (a < b) { const m = (a + b) >> 1; if (kum[m] < r) a = m + 1; else b = m; }
      return slowa[a];
    };
    return zloz(() => Math.random() < 0.12 && fokus && fokus.length ? pseudo(litery, D, 3 + Math.floor(Math.random() * 3), fokus) : wybierz(), cel);
  };
  gen.czeste = (n, cel) => { const p = DZ.CZESTE.slice(0, n); return zloz(() => los(p), cel || 200); };
  gen.polskie = cel => { const p = DZ.SLOWNIK.filter(w => /[ąćęłńóśźż]/.test(w) && w.length >= 3); return zloz(() => los(p), cel || 200); };
  gen.dwuznaki = cel => { const p = DZ.SLOWNIK.filter(w => /sz|cz|rz|ch|dz|dź|dż/.test(w)); return zloz(() => los(p), cel || 200); };
  gen.wielkie = cel => {
    const nazwy = [...DZ.IMIONA, ...DZ.MIASTA];
    const zd = pulaZdan(gen.wszystkie()).filter(z => /[?!:"-]/.test(z));
    return zloz(i => i % 4 === 3 ? los(zd) : los(nazwy), cel || 200);
  };
  gen.cyfry = cel => {
    const C = [...'0123456789'], n = dl => liczba(C, [], dl);
    const f = [() => n(2), () => n(3), () => n(4), () => n(1), () => n(2) + '.' + n(2) + '.20' + n(2), () => n(2) + ':' + n(2), () => n(2) + ',' + n(2) + ' zł',
      () => n(3) + ' ' + n(3) + ' ' + n(3), () => n(2) + '-' + n(3), () => n(2) + '%', () => n(1) + ' + ' + n(1) + ' = ' + n(2)];
    return zloz(() => los(f)(), cel || 170);
  };
  gen.symbole = cel => zloz(i => i % 4 === 3 ? los(DZ.CZESTE.slice(40, 200)) : los(DZ.FRAGMENTY), cel || 180);
  gen.test = minuty => { let t = ''; for (const a of tasuj(DZ.TEKSTY)) { t += (t ? ' ' : '') + a; if (t.length >= minuty * 750) break; } return t; };

  // Własny tekst użytkownika → tylko znaki, które da się wpisać
  gen.normalizuj = function (s) {
    s = String(s || '').replace(/[„”“«»]/g, '"').replace(/[’‘`´]/g, "'").replace(/[–—−]/g, '-').replace(/…/g, '...')
      .replace(/[\s ]+/g, ' ').trim();
    let out = '';
    for (const c of s) if (DZ.ZNAK[c]) out += c;
    return out.replace(/ +/g, ' ').slice(0, 20000);
  };
  gen.porcja = function (tekst, od, cel) {
    if (od >= tekst.length) od = 0;
    let do_ = Math.min(tekst.length, od + cel);
    if (do_ < tekst.length) { const sp = tekst.lastIndexOf(' ', do_); if (sp > od + 40) do_ = sp; }
    return { tekst: tekst.slice(od, do_).trim(), nast: do_ >= tekst.length ? 0 : do_ + 1 };
  };
})();
