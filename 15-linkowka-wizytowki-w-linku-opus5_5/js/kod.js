/* Linkówka – kodowanie wizytówki w adresie URL.
 *
 * Dane → zwarta tablica (bez nazw pól, bez „https://”, bez pustych końcówek)
 * → JSON → UTF-8 → deflate-raw (CompressionStream wbudowany w przeglądarkę)
 * → base64url. Pierwszy znak to wersja zapisu:
 *   „1” – skompresowane, „0” – bez kompresji (gdy tak wychodzi krócej
 *   albo przeglądarka nie zna CompressionStream).
 * Całość ląduje za „#w” w adresie, więc nie trafia do żadnego serwera.
 */
'use strict';

const Kod = (() => {
  const LIMITY = { imie: 80, rola: 90, miasto: 70, bio: 480, stawka: 60, awatar: 400, tytul: 80, url: 400, opis: 200, tag: 60, email: 120, tel: 40 };
  const MAX_PROJ = 3;
  const MAX_LINKI = 4;
  const MOTYWY = 6;
  const STATUSY = 3;

  /* ---------- base64url ---------- */
  function doB64u(bajty) {
    let s = '';
    for (let i = 0; i < bajty.length; i += 0x8000) s += String.fromCharCode.apply(null, bajty.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function zB64u(tekst) {
    let s = tekst.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function przepusc(bajty, transformacja) {
    const strumien = new Blob([bajty]).stream().pipeThrough(transformacja);
    return new Uint8Array(await new Response(strumien).arrayBuffer());
  }

  /* ---------- skracanie adresów ---------- */
  const skroc = (u) => (u || '').trim().replace(/^https:\/\//i, '').replace(/\/$/, '');
  const rozwin = (u) => (!u ? '' : /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u);

  const pusteNaKoncu = (a) => {
    while (a.length) {
      const x = a[a.length - 1];
      if (x === '' || x === 0 || x == null || (Array.isArray(x) && !x.length)) a.pop();
      else break;
    }
    return a;
  };

  const S = (x, max) => (typeof x === 'string' ? x.slice(0, max) : '');
  const N = (x, max) => (Number.isInteger(x) && x >= 0 && x <= max ? x : 0);
  const t = (x) => (x || '').trim();

  /* ---------- obiekt ↔ tablica ---------- */
  function pusty() {
    return {
      imie: '', rola: '', miasto: '', bio: '', status: 0, stawka: '', awatar: '', motyw: 0, akcent: '',
      projekty: Array.from({ length: MAX_PROJ }, () => ({ tytul: '', url: '', opis: '', tag: '' })),
      email: '', tel: '', linki: Array.from({ length: MAX_LINKI }, () => ''),
    };
  }

  function spakuj(d) {
    return pusteNaKoncu([
      t(d.imie), t(d.rola), t(d.miasto), t(d.bio).replace(/\n{3,}/g, '\n\n'),
      d.status | 0, t(d.stawka), t(d.awatar), d.motyw | 0,
      (d.akcent || '').replace('#', '').toLowerCase(),
      d.projekty.map((p) => pusteNaKoncu([t(p.tytul), skroc(p.url), t(p.opis), t(p.tag)])).filter((a) => a.length),
      t(d.email), t(d.tel),
      d.linki.map(skroc).filter(Boolean),
    ]);
  }

  function rozpakuj(a) {
    if (!Array.isArray(a)) throw new Error('Zły format');
    const d = pusty();
    d.imie = S(a[0], LIMITY.imie);
    d.rola = S(a[1], LIMITY.rola);
    d.miasto = S(a[2], LIMITY.miasto);
    d.bio = S(a[3], LIMITY.bio);
    d.status = N(a[4], STATUSY);
    d.stawka = S(a[5], LIMITY.stawka);
    d.awatar = S(a[6], LIMITY.awatar);
    d.motyw = N(a[7], MOTYWY - 1);
    d.akcent = /^[0-9a-f]{6}$/i.test(a[8] || '') ? '#' + a[8].toLowerCase() : '';
    if (Array.isArray(a[9])) {
      a[9].filter(Array.isArray).slice(0, MAX_PROJ).forEach((p, i) => {
        d.projekty[i] = { tytul: S(p[0], LIMITY.tytul), url: rozwin(S(p[1], LIMITY.url)), opis: S(p[2], LIMITY.opis), tag: S(p[3], LIMITY.tag) };
      });
    }
    d.email = S(a[10], LIMITY.email);
    d.tel = S(a[11], LIMITY.tel);
    if (Array.isArray(a[12])) {
      a[12].slice(0, MAX_LINKI).forEach((u, i) => { d.linki[i] = rozwin(S(u, LIMITY.url)); });
    }
    return d;
  }

  /* ---------- publiczne API ---------- */
  async function zakoduj(d) {
    const json = JSON.stringify(spakuj(d));
    const surowe = new TextEncoder().encode(json);
    let ladunek = '0' + doB64u(surowe);
    let rozmiar = surowe.length;
    if (typeof CompressionStream === 'function') {
      try {
        const z = await przepusc(surowe, new CompressionStream('deflate-raw'));
        const kandydat = '1' + doB64u(z);
        if (kandydat.length < ladunek.length) { ladunek = kandydat; rozmiar = z.length; }
      } catch (e) { /* zostaje wersja bez kompresji */ }
    }
    return { ladunek, json: surowe.length, spakowane: rozmiar };
  }

  async function odkoduj(ladunek) {
    // Komunikatory potrafią dokleić kropkę albo nawias z końca zdania – odcinamy wszystko spoza base64url.
    let s = ladunek;
    try { s = decodeURIComponent(s); } catch (e) { /* zostaje surowy */ }
    const czysty = s.replace(/[^A-Za-z0-9_-]/g, '');
    const wersja = czysty[0];
    const bajty = zB64u(czysty.slice(1));
    let surowe;
    if (wersja === '1') {
      if (typeof DecompressionStream !== 'function') throw new Error('Przeglądarka nie umie rozpakować linku');
      surowe = await przepusc(bajty, new DecompressionStream('deflate-raw'));
    } else if (wersja === '0') {
      surowe = bajty;
    } else {
      throw new Error('Nieznana wersja linku');
    }
    return rozpakuj(JSON.parse(new TextDecoder().decode(surowe)));
  }

  return { zakoduj, odkoduj, pusty, rozwin, MAX_PROJ, MAX_LINKI };
})();
