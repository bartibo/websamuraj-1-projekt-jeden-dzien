/* Bezpiecznik – silnik analizy linku.
   1) wyłuskanie linków z wklejonego tekstu (nawet całego SMS-a),
   2) rozbiór adresu (domena, właściciel domeny, końcówka, punycode),
   3) sztuczki oszustów sprawdzane na miejscu (podszywanie się pod marki, literówki, skracacze, IP, pliki .apk…),
   4) darmowe zewnętrzne źródła: Cloudflare DNS z filtrem złośliwych stron (1.1.1.2), OpenPhish,
      Phishing.Database (listy porównywane na urządzeniu) i RDAP (data rejestracji domeny),
   5) werdykt: zielony albo czerwony. */
(function (BZ) {
  'use strict';

  /* ---------- źródła zewnętrzne ---------- */
  const ZRODLA = {
    cloudflare: 'https://security.cloudflare-dns.com/dns-query',
    openphish: 'https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt',
    phishdb: 'https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-domains-ACTIVE.txt',
    rdap: 'https://rdap.org/domain/'
  };
  BZ.ZRODLA = ZRODLA;

  function pobierz(url, opcje = {}, ms = 6000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, Object.assign({ signal: ctrl.signal, cache: 'default', referrerPolicy: 'no-referrer' }, opcje))
      .finally(() => clearTimeout(t));
  }

  /* Listy oszustw pobieramy raz, w tle, zaraz po otwarciu strony. Porównanie odbywa się na urządzeniu,
     więc wklejony link nie trafia do nikogo poza zapytaniem DNS o samą nazwę domeny. */
  const listy = { openphish: null, phishdb: null };

  function zaladujOpenPhish() {
    if (!listy.openphish) {
      listy.openphish = pobierz(ZRODLA.openphish, {}, 15000)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(txt => {
          const adresy = [], hosty = new Set();
          for (const linia of txt.split('\n')) {
            const s = linia.trim();
            if (!s) continue;
            try {
              const u = new URL(s);
              const h = u.hostname.replace(/^www\./, '').replace(/\.$/, '');
              adresy.push(normalizujAdres(u));
              hosty.add(h);
            } catch (e) { /* pomijamy śmieci */ }
          }
          return { adresy, hosty, ile: adresy.length };
        })
        .catch(() => { listy.openphish = null; return null; });
    }
    return listy.openphish;
  }

  function zaladujPhishDb() {
    if (!listy.phishdb) {
      listy.phishdb = pobierz(ZRODLA.phishdb, {}, 45000)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.text(); })
        .then(txt => {
          const zb = new Set();
          let i = 0, n = txt.length;
          while (i < n) {
            let j = txt.indexOf('\n', i);
            if (j < 0) j = n;
            const s = txt.slice(i, j).trim();
            if (s && s[0] !== '#') zb.add(s.toLowerCase());
            i = j + 1;
          }
          return { hosty: zb, ile: zb.size };
        })
        .catch(() => { listy.phishdb = null; return null; });
    }
    return listy.phishdb;
  }

  BZ.zacznijPobieracListy = function () {
    zaladujOpenPhish();
    zaladujPhishDb();
  };

  /* Czekamy na listę najwyżej do podanego terminu – jeśli jeszcze się nie pobrała, idziemy dalej bez niej. */
  function zTerminem(obietnica, ms) {
    return Promise.race([obietnica, new Promise(res => setTimeout(() => res('czas'), ms))]);
  }

  /* ---------- pomocnicze: tekst ---------- */
  const bezOgonkow = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L');

  /* Litery z innych alfabetów udające łacińskie (cyrylica, greka) i ich łacińskie odpowiedniki. */
  const UDAWANE = {
    'а': 'a', 'в': 'b', 'е': 'e', 'ё': 'e', 'к': 'k', 'м': 'm', 'н': 'h', 'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y', 'х': 'x',
    'і': 'i', 'ї': 'i', 'ј': 'j', 'ѕ': 's', 'ԁ': 'd', 'ӏ': 'l', 'ո': 'n', 'ս': 'u', 'ɡ': 'g', 'ɩ': 'i', 'ⅼ': 'l',
    'α': 'a', 'β': 'b', 'ε': 'e', 'η': 'n', 'ι': 'i', 'κ': 'k', 'ν': 'v', 'ο': 'o', 'ρ': 'p', 'τ': 't', 'υ': 'u', 'χ': 'x', 'ω': 'w'
  };
  function szkielet(s) {
    let w = '';
    for (const ch of bezOgonkow(s.toLowerCase())) w += UDAWANE[ch] || ch;
    return w;
  }

  /* Warianty z cyframi zamiast liter (4llegr0 → allegro, rn → m). */
  function warianty(s) {
    const zb = new Set([s]);
    const a = s.replace(/0/g, 'o').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/8/g, 'b').replace(/9/g, 'g').replace(/@/g, 'a');
    zb.add(a.replace(/1/g, 'l'));
    zb.add(a.replace(/1/g, 'i'));
    for (const x of [...zb]) { zb.add(x.replace(/rn/g, 'm').replace(/vv/g, 'w')); zb.add(x.replace(/ii/g, 'u')); }
    return [...zb];
  }

  /* Odległość edycyjna z zamianą sąsiednich liter (alegro, inpots). */
  function odleglosc(a, b) {
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 9;
    const d = [];
    for (let i = 0; i <= m; i++) { d[i] = [i]; }
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const k = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + k);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[m][n];
  }

  /* Dekoder punycode (RFC 3492) – pokazuje, co naprawdę kryje się za „xn--…”. */
  function punycode(wejscie) {
    const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700;
    const adapt = (delta, ile, pierwszy) => {
      let k = 0;
      delta = pierwszy ? Math.floor(delta / damp) : delta >> 1;
      delta += Math.floor(delta / ile);
      for (; delta > ((base - tMin) * tMax) >> 1; k += base) delta = Math.floor(delta / (base - tMin));
      return Math.floor(k + (base - tMin + 1) * delta / (delta + skew));
    };
    const wyj = [];
    let i = 0, n = 128, bias = 72;
    let podst = wejscie.lastIndexOf('-');
    if (podst < 0) podst = 0;
    for (let j = 0; j < podst; j++) wyj.push(wejscie.charCodeAt(j));
    for (let idx = podst > 0 ? podst + 1 : 0; idx < wejscie.length;) {
      const stare = i;
      for (let w = 1, k = base; ; k += base) {
        if (idx >= wejscie.length) throw new Error('punycode');
        const c = wejscie.charCodeAt(idx++);
        const cyfra = c >= 48 && c <= 57 ? c - 22 : c >= 65 && c <= 90 ? c - 65 : c >= 97 && c <= 122 ? c - 97 : base;
        if (cyfra >= base) throw new Error('punycode');
        i += cyfra * w;
        const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
        if (cyfra < t) break;
        w *= base - t;
      }
      const dl = wyj.length + 1;
      bias = adapt(i - stare, dl, stare === 0);
      n += Math.floor(i / dl);
      i %= dl;
      wyj.splice(i++, 0, n);
    }
    return String.fromCodePoint(...wyj);
  }
  const hostCzytelny = (host) => host.split('.').map(l => {
    if (!l.startsWith('xn--')) return l;
    try { return punycode(l.slice(4)); } catch (e) { return l; }
  }).join('.');

  /* ---------- wyłuskanie linków z tekstu ---------- */
  function wygladaJakDomena(tok) {
    const m = tok.toLowerCase().match(/^([a-z0-9¡-￿]([a-z0-9¡-￿-]*[a-z0-9¡-￿])?\.)+([a-z¡-￿]{2,24})(:\d+)?([/?#].*)?$/i);
    if (!m) return false;
    const tld = m[3].toLowerCase();
    if (BZ.NIE_ADRESY.has(tok.toLowerCase())) return false;
    return tld.length === 2 || BZ.KONCOWKI_OGOLNE.has(tld) || /[^\x00-\x7f]/.test(tld);
  }

  BZ.znajdzLinki = function (tekst) {
    const wynik = [];
    const surowy = (tekst || '').trim();
    if (!surowy) return wynik;
    // ukryty kod zamiast adresu strony
    if (/^\s*(javascript|data|vbscript|file):/i.test(surowy)) return [surowy];
    const tokeny = surowy.replace(/[<>"'`«»„”“]/g, ' ').split(/\s+/);
    for (let t of tokeny) {
      t = t.replace(/^[(\[{]+/, '').replace(/[.,;:!?)\]}…]+$/, '');
      if (!t) continue;
      const mSchemat = t.match(/(https?:\/\/|hxxps?:\/\/|www\.)\S+/i);
      if (mSchemat) {
        let s = mSchemat[0].replace(/^hxxp/i, 'http');
        wynik.push(s);
      } else if (!t.includes('@') && wygladaJakDomena(t)) {
        wynik.push(t);
      }
      if (wynik.length >= 5) break;
    }
    return [...new Set(wynik)];
  };

  /* ---------- rozbiór adresu ---------- */
  function wlasciciel(host) {
    const czesci = host.split('.');
    // darmowe hostingi: właścicielem jest subdomena (ktos.github.io)
    for (let k = Math.min(czesci.length, 4); k >= 2; k--) {
      const suf = czesci.slice(-k).join('.');
      if (BZ.DARMOWE_HOSTINGI.has(suf)) {
        return { domena: czesci.length > k ? czesci.slice(-(k + 1)).join('.') : suf, hosting: suf, koncowka: czesci[czesci.length - 1] };
      }
    }
    const dwie = czesci.slice(-2).join('.');
    if (czesci.length >= 3 && BZ.SUFIKSY2.has(dwie)) {
      return { domena: czesci.slice(-3).join('.'), hosting: null, koncowka: dwie };
    }
    return { domena: dwie, hosting: null, koncowka: czesci[czesci.length - 1] };
  }

  BZ.rozbierz = function (kandydat) {
    let s = kandydat.trim();
    if (/^(javascript|data|vbscript|file):/i.test(s)) {
      return { ok: true, ukrytyKod: true, wejscie: s, host: '', czytelny: s.slice(0, 40) };
    }
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = 'http://' + s;
    let u;
    try { u = new URL(s); } catch (e) { return { ok: false }; }
    if (!/^https?:$/.test(u.protocol)) return { ok: false };
    const host = u.hostname.toLowerCase().replace(/\.$/, '');
    if (!host || (!host.includes('.') && !host.startsWith('['))) return { ok: false };
    const ip = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[');
    const info = {
      ok: true, wejscie: kandydat, url: u, host, ip,
      czytelny: ip ? host : hostCzytelny(host),
      https: u.protocol === 'https:',
      port: u.port,
      sciezka: (() => { try { return decodeURIComponent(u.pathname + u.search + u.hash); } catch (e) { return u.pathname + u.search + u.hash; } })()
    };
    if (!ip) {
      const w = wlasciciel(host);
      info.domena = w.domena;
      info.hosting = w.hosting;
      info.koncowka = w.koncowka;
      info.domenaCzytelna = hostCzytelny(w.domena);
      const bezWww = host.replace(/^www\./, '');
      info.zaufana = !w.hosting && !BZ.WSPOLNE_ADRESY.has(bezWww) && (BZ.ZAUFANE.has(w.domena) || /(^|\.)gov\.pl$/.test(host));
    }
    return info;
  };

  function normalizujAdres(u) {
    let s = (u.hostname.replace(/^www\./, '') + u.pathname + u.search).toLowerCase();
    return s.replace(/\/+$/, '');
  }

  /* ---------- sztuczki oszustów sprawdzane na miejscu ---------- */
  function czyOficjalna(marka, info) {
    const d = info.domena, h = info.host;
    if (marka.oficjalne.includes(d) || marka.oficjalne.some(o => h === o || h.endsWith('.' + o))) return true;
    if (marka.gov && (/(^|\.)gov\.pl$/.test(h) || /(^|\.)gov(\.[a-z]{2,3})?$/.test(h))) return true;
    if (marka.krajowe && !info.hosting) {
      const etykieta = d.split('.')[0];
      const reszta = d.slice(etykieta.length + 1);
      const nazwy = [...(marka.ciagi || []), ...(marka.slowa || [])];
      if (nazwy.includes(etykieta) && BZ.KONCOWKI_MAREK.has(reszta)) return true;
      if (marka.glowna.split('.')[0] === etykieta && BZ.KONCOWKI_MAREK.has(reszta)) return true;
    }
    return false;
  }

  function wykryjMarke(info) {
    // część adresu bez końcówki (inpost.pl-dopłata.top → „inpost.pl-dopłata”)
    const sk = szkielet(info.czytelny);
    const kon = info.hosting ? '' : info.koncowka;
    const rdzen = kon && sk.endsWith('.' + kon) ? sk.slice(0, -(kon.length + 1)) : sk;
    const rdzenZbity = rdzen.replace(/[^a-z0-9]/g, '');
    const czlony = rdzen.split(/[.\-_]+/).filter(Boolean);
    const zbite = warianty(rdzenZbity);
    const czlonyW = new Set(czlony.flatMap(warianty));
    const trafienia = [];
    for (const m of BZ.MARKI) {
      let mocne = false, slabe = false;
      for (const c of (m.ciagi || [])) {
        if (zbite.some(z => z.includes(c))) { if ((m.slabe || []).includes(c)) slabe = true; else mocne = true; }
      }
      for (const w of (m.slowa || [])) {
        if (czlonyW.has(w)) { if ((m.slabe || []).includes(w)) slabe = true; else mocne = true; }
      }
      if ((mocne || slabe) && !czyOficjalna(m, info)) trafienia.push({ marka: m, mocne });
    }
    return trafienia;
  }

  const WYJATKI_LITEROWEK = new Set(['revolt', 'minted', 'impost', 'googly', 'goggles', 'amazone', 'santana', 'bincance', 'meta', 'netfix']);
  function wykryjLiterowke(info) {
    const sk = szkielet(info.czytelny);
    const kon = info.hosting ? '' : info.koncowka;
    const rdzen = kon && sk.endsWith('.' + kon) ? sk.slice(0, -(kon.length + 1)) : sk;
    const czlony = new Set(rdzen.split(/[.\-_]+/).filter(c => c.length >= 5));
    czlony.add(rdzen.split('.').pop().replace(/[^a-z0-9]/g, ''));
    for (const c of czlony) {
      if (WYJATKI_LITEROWEK.has(c)) continue;
      for (const wariant of warianty(c)) {
        for (const m of BZ.MARKI) {
          for (const wzor of (m.literowki || [])) {
            if (wariant === wzor) continue;
            const prog = wzor.length >= 9 ? 2 : wzor.length >= 6 ? 1 : 0;
            if (prog && odleglosc(wariant, wzor) <= prog && !czyOficjalna(m, info)) return { marka: m, czlon: c };
          }
        }
      }
    }
    return null;
  }

  function mieszaneAlfabety(info) {
    for (const l of info.czytelny.split('.')) {
      const lac = /[a-z]/i.test(l);
      if (lac && (/\p{Script=Cyrillic}/u.test(l) || /\p{Script=Greek}/u.test(l))) return true;
      if (/\p{Script=Cyrillic}/u.test(l) && /^[а-яё0-9-]*$/i.test(l) && szkielet(l) !== l && /^[a-z0-9-]+$/.test(szkielet(l)) && BZ.MARKI.some(m => (m.literowki || m.ciagi || []).includes(szkielet(l)))) return true;
    }
    return false;
  }

  BZ.sztuczki = function (info) {
    const twarde = [], miekkie = [];
    const dodaj = (punkty, tekst, klucz) => miekkie.push({ punkty, tekst, klucz });

    if (info.ukrytyKod) {
      twarde.push('To nie jest zwykły link do strony, tylko ukryty kod, który może coś uruchomić na Twoim urządzeniu.');
      return { twarde, miekkie };
    }
    if (info.url.username || info.url.password) {
      twarde.push(`Link ukrywa prawdziwy adres za znakiem „@”. Naprawdę prowadzi do: ${info.czytelny}.`);
    }
    if (info.ip) {
      twarde.push('Zamiast nazwy strony link zawiera same cyfry (adres IP). Prawdziwe firmy i urzędy tak nie robią.');
    }
    const bezWww = info.host.replace(/^www\./, '');
    if (!info.ip && (BZ.SKRACACZE.has(bezWww) || BZ.SKRACACZE.has(info.domena))) {
      twarde.push(`To skrócony link (${bezWww}). Ukrywa prawdziwy adres strony, więc nie wiadomo, dokąd naprawdę prowadzi. Oszuści używają ich bardzo często.`);
    }
    const plik = (info.url.pathname.toLowerCase().match(/\.([a-z0-9]{2,12})$/) || [])[1];
    if (plik && BZ.PLIKI_PROGRAMOW.includes(plik)) {
      twarde.push(`Link pobiera plik programu (.${plik}). Tak oszuści instalują wirusy, które przejmują telefon i kradną pieniądze z konta.`);
    }
    if (info.ip) return { twarde, miekkie };

    if (mieszaneAlfabety(info)) {
      twarde.push('W adresie są podrobione litery (np. rosyjskie „а” zamiast naszego „a”), żeby wyglądał jak prawdziwy.');
    }

    if (!info.zaufana) {
      const marki = wykryjMarke(info);
      const mocna = marki.find(t => t.mocne);
      if (mocna) {
        const m = mocna.marka;
        twarde.push(`Strona udaje markę „${m.nazwa}”, ale wcale do niej nie należy. Prawdziwy adres to ${m.glowna}.`);
      } else if (marki.length) {
        dodaj(1.5, `W adresie pojawia się nazwa „${marki[0].marka.nazwa}”, ale strona do tej firmy nie należy.`, 'marka');
      }
      if (!mocna) {
        const lit = wykryjLiterowke(info);
        if (lit) twarde.push(`Adres łudząco przypomina ${lit.marka.glowna}, ale różni się literą („${lit.czlon}”). To podróbka.`);
      }

      const kon = info.koncowka.split('.').pop();
      if (BZ.BARDZO_PODEJRZANE_KONCOWKI.has(kon)) dodaj(1.5, `Końcówka adresu „.${kon}” jest ulubioną końcówką oszustów: tania i prawie niepilnowana.`, 'koncowka');
      else if (BZ.PODEJRZANE_KONCOWKI.has(kon)) dodaj(1, `Nietypowa końcówka adresu „.${kon}”, często używana przez oszustów.`, 'koncowka');

      const hostTekst = bezOgonkow(info.czytelny.toLowerCase());
      const sciezkaTekst = bezOgonkow(info.sciezka.toLowerCase());
      const wHoscie = [], wSciezce = [];
      for (const [wzor, slowo] of BZ.WABIKI) {
        if (hostTekst.includes(wzor)) wHoscie.push(slowo);
        else if (sciezkaTekst.includes(wzor)) wSciezce.push(slowo);
      }
      if (wHoscie.length) dodaj(wHoscie.length >= 2 ? 1.5 : 1, `W nazwie strony są słowa-wabiki: ${wHoscie.slice(0, 3).map(s => '„' + s + '”').join(', ')}.`, 'wabiki');
      if (wSciezce.length) dodaj(wSciezce.length >= 2 ? 1 : 0.5, `W linku są słowa-wabiki: ${wSciezce.slice(0, 3).map(s => '„' + s + '”').join(', ')}.`, 'wabiki2');

      // nazwa marki schowana w dalszej części linku (strona.top/inpost/…)
      if (!marki.length) {
        const sc = sciezkaTekst.replace(/[^a-z0-9]/g, '');
        const wSc = BZ.MARKI.find(m => (m.ciagi || []).some(c => !(m.slabe || []).includes(c) && c.length >= 5 && sc.includes(c)) && !czyOficjalna(m, info));
        if (wSc) dodaj(1, `W linku pojawia się nazwa „${wSc.nazwa}”, choć strona do tej firmy nie należy.`, 'marka2');
      }

      if (info.hosting || BZ.WSPOLNE_ADRESY.has(bezWww)) {
        dodaj(1, 'Strona stoi na darmowej usłudze, na której każdy może w minutę postawić własną stronę.', 'hosting');
      }
      if (/xn--/.test(info.host) && !twarde.length) dodaj(0.5, `Adres zawiera nietypowe znaki (naprawdę wygląda tak: ${info.czytelny}).`, 'puny');
      const etykieta = info.domenaCzytelna.split('.')[0];
      const myslniki = (etykieta.match(/-/g) || []).length;
      if (myslniki >= 3) dodaj(1, 'Nazwa strony jest poszatkowana myślnikami – typowe dla podróbek.', 'myslniki');
      else if (myslniki === 2) dodaj(0.5, 'Nazwa strony ma kilka myślników – częste u podróbek.', 'myslniki');
      const poziomy = info.host.split('.').length - info.domena.split('.').length - (info.host.startsWith('www.') ? 1 : 0);
      if (poziomy >= 3) dodaj(1, 'Adres jest nienaturalnie długi i poskładany z wielu członów, żeby zmylić czytającego.', 'poziomy');
      if (info.host.length > 45) dodaj(0.5, 'Nazwa strony jest bardzo długa.', 'dlugi');
      if (/\d{4,}/.test(etykieta) || /[bcdfghjklmnpqrstvwxz]{6,}/.test(etykieta)) dodaj(0.5, 'Nazwa strony wygląda na przypadkowy ciąg znaków.', 'losowa');
      if (info.port && info.port !== '80' && info.port !== '443') dodaj(1, `W adresie jest nietypowy numer portu (:${info.port}).`, 'port');
      if (!info.https) dodaj(0.5, 'Połączenie nie jest szyfrowane (brak „https”).', 'http');
      if ((info.url.href.match(/%[0-9a-f]{2}/gi) || []).length > 10) dodaj(0.5, 'Link zawiera mnóstwo zakodowanych znaków, które ukrywają jego treść.', 'kody');
    }
    return { twarde, miekkie };
  };

  /* ---------- zapytania do źródeł zewnętrznych ---------- */
  async function zapytajCloudflare(host) {
    try {
      const r = await pobierz(`${ZRODLA.cloudflare}?name=${encodeURIComponent(host)}&type=A`, { headers: { accept: 'application/dns-json' } }, 6000);
      if (!r.ok) return { stan: 'blad' };
      const j = await r.json();
      const odp = j.Answer || [];
      const komentarz = (j.Comment || []).join(' ');
      if (odp.some(a => a.data === '0.0.0.0' || a.data === '::') || /EDE\((15|16|17)\)/.test(komentarz)) return { stan: 'blok' };
      if (j.Status === 3) return { stan: 'brak' };
      if (j.Status === 0) return { stan: 'ok' };
      return { stan: 'blad' };
    } catch (e) { return { stan: 'blad' }; }
  }

  async function zapytajRdap(domena) {
    try {
      // najpopularniejsze rejestry pytamy wprost (szybciej i bez limitu pośrednika), resztę przez rdap.org
      const kon = domena.split('.').pop();
      const adres = kon === 'pl' ? 'https://rdap.dns.pl/domain/'
        : (kon === 'com' || kon === 'net') ? `https://rdap.verisign.com/${kon}/v1/domain/`
          : ZRODLA.rdap;
      const r = await pobierz(adres + encodeURIComponent(domena), { headers: { accept: 'application/rdap+json, application/json' } }, 7000);
      if (!r.ok) return { stan: 'brak' };
      const j = await r.json();
      const ev = (j.events || []).find(e => e.eventAction === 'registration');
      if (!ev || !ev.eventDate) return { stan: 'brak' };
      const data = new Date(ev.eventDate);
      if (isNaN(data)) return { stan: 'brak' };
      return { stan: 'ok', data, dni: Math.floor((Date.now() - data.getTime()) / 86400000) };
    } catch (e) { return { stan: 'brak' }; }
  }

  function hostyDoSprawdzenia(info) {
    // host i jego „rodzice” aż do domeny właściciela (a.b.zla.pl → a.b.zla.pl, b.zla.pl, zla.pl)
    if (info.ip) return [info.host];
    const wynik = [];
    const czesci = info.host.replace(/^www\./, '').split('.');
    const dlWl = info.domena.split('.').length;
    for (let k = czesci.length; k >= dlWl; k--) {
      const h = czesci.slice(-k).join('.');
      if (BZ.WSPOLNE_ADRESY.has(h) || BZ.DARMOWE_HOSTINGI.has(h)) continue;
      wynik.push(h);
    }
    return wynik;
  }

  function sprawdzOpenPhish(lista, info) {
    if (!lista) return null;
    const adres = normalizujAdres(info.url);
    if (lista.adresy.some(a => adres === a || (a.length > 12 && adres.startsWith(a)) || (adres.length > 12 && a.startsWith(adres) && adres.includes('/')))) return true;
    if (info.zaufana) return false;
    return hostyDoSprawdzenia(info).some(h => lista.hosty.has(h));
  }

  function sprawdzPhishDb(lista, info) {
    if (!lista) return null;
    if (info.zaufana) return false;
    return hostyDoSprawdzenia(info).some(h => lista.hosty.has(h));
  }

  const ile = (n) => n.toLocaleString('pl-PL');
  function wiekSlownie(dni) {
    if (dni <= 0) return 'dzisiaj';
    if (dni === 1) return 'wczoraj';
    if (dni < 60) return `zaledwie ${dni} dni temu`;
    const mies = Math.round(dni / 30);
    return `${mies} ${mies < 5 ? 'miesiące' : 'miesięcy'} temu`;
  }

  /* ---------- pełne sprawdzenie jednego linku ---------- */
  BZ.sprawdzLink = async function (kandydat, krok = () => {}) {
    const info = BZ.rozbierz(kandydat);
    if (!info.ok) return null;
    const { twarde, miekkie } = BZ.sztuczki(info);
    krok('sztuczki', twarde.length ? 'zle' : 'ok');

    const szczegoly = [];
    let cf = { stan: 'pominiete' }, op = null, pd = null, rd = { stan: 'pominiete' };

    if (!info.ukrytyKod) {
      const listaOp = zaladujOpenPhish(), listaPd = zaladujPhishDb();
      const zadania = [];
      if (info.ip) krok('cloudflare', 'pominiete');
      else zadania.push(zapytajCloudflare(info.host).then(w => { cf = w; krok('cloudflare', w.stan === 'blok' ? 'zle' : w.stan === 'blad' ? 'pominiete' : 'ok'); }));
      zadania.push(zTerminem(listaOp, 8000).then(l => {
        const lista = l && l !== 'czas' ? l : null;
        op = { lista, wynik: sprawdzOpenPhish(lista, info) };
        krok('openphish', op.wynik ? 'zle' : lista ? 'ok' : 'pominiete');
      }));
      zadania.push(zTerminem(listaPd, 9000).then(l => {
        const lista = l && l !== 'czas' ? l : null;
        pd = { lista, wynik: sprawdzPhishDb(lista, info) };
        krok('phishdb', pd.wynik ? 'zle' : lista ? 'ok' : 'pominiete');
      }));
      if (!info.ip && !info.zaufana && !info.hosting && !BZ.WSPOLNE_ADRESY.has(info.host.replace(/^www\./, ''))) {
        zadania.push(zapytajRdap(info.domena).then(w => {
          rd = w;
          krok('wiek', w.stan === 'ok' ? (w.dni < 30 ? 'zle' : 'ok') : 'pominiete');
        }));
      } else {
        krok('wiek', info.zaufana ? 'ok' : 'pominiete');
      }
      await Promise.all(zadania);
    }

    /* zbieramy powody */
    if (cf.stan === 'blok') twarde.unshift('Cloudflare, firma chroniąca miliony stron, zna ten adres jako złośliwy i blokuje go.');
    if (op && op.wynik) twarde.unshift('Adres jest na liście OpenPhish – światowej bazie stron wyłudzających dane i pieniądze.');
    if (pd && pd.wynik) twarde.unshift(`Adres jest w bazie Phishing.Database, w której jest ${ile(pd.lista.ile)} znanych stron oszustów.`);
    if (cf.stan === 'brak' && !info.zaufana) twarde.push('Taka strona nie istnieje albo została już zamknięta. Tak zwykle kończą strony oszustów – link z wiadomości i tak jest podejrzany.');
    if (rd.stan === 'ok') {
      if (rd.dni < 30) twarde.push(`Strona powstała ${wiekSlownie(rd.dni)}. Oszuści zakładają nowe strony co kilka dni, bo stare szybko trafiają na czarne listy.`);
      else if (rd.dni < 180) miekkie.push({ punkty: 1, tekst: `Strona jest bardzo młoda – powstała ${wiekSlownie(rd.dni)}.`, klucz: 'wiek' });
    }

    const punkty = miekkie.reduce((s, m) => s + m.punkty, 0);
    const podstawySprawdzone = cf.stan === 'ok' || cf.stan === 'brak' || cf.stan === 'blok' || (op && op.lista && pd && pd.lista);

    let werdykt;
    if (twarde.length) werdykt = 'oszustwo';
    else if (punkty >= 2) werdykt = 'podejrzany';
    else if (info.zaufana) werdykt = 'bezpieczny';
    else if (!podstawySprawdzone) werdykt = 'nieznany';
    else werdykt = 'bezpieczny';

    /* tabela „co sprawdziliśmy” */
    szczegoly.push({ nazwa: 'Cloudflare (filtr złośliwych stron 1.1.1.2)', stan: cf.stan === 'blok' ? 'zle' : cf.stan === 'blad' || cf.stan === 'pominiete' ? 'pominiete' : 'ok',
      opis: cf.stan === 'blok' ? 'zablokowana jako niebezpieczna' : cf.stan === 'brak' ? 'strona nie istnieje' : cf.stan === 'ok' ? 'nie jest na czarnej liście' : 'brak odpowiedzi' });
    szczegoly.push({ nazwa: 'OpenPhish (światowa baza wyłudzeń)', stan: !op || !op.lista ? 'pominiete' : op.wynik ? 'zle' : 'ok',
      opis: !op || !op.lista ? 'nie udało się pobrać' : op.wynik ? 'jest na liście' : `brak wśród ${ile(op.lista.ile)} zgłoszeń` });
    szczegoly.push({ nazwa: 'Phishing.Database', stan: !pd || !pd.lista ? 'pominiete' : pd.wynik ? 'zle' : 'ok',
      opis: !pd || !pd.lista ? 'nie udało się pobrać' : pd.wynik ? 'jest w bazie' : `brak wśród ${ile(pd.lista.ile)} stron` });
    szczegoly.push({ nazwa: 'Wiek strony (rejestr domen RDAP)', stan: rd.stan === 'ok' ? (rd.dni < 30 ? 'zle' : rd.dni < 180 ? 'uwaga' : 'ok') : info.zaufana ? 'ok' : 'pominiete',
      opis: rd.stan === 'ok' ? `zarejestrowana ${rd.data.toLocaleDateString('pl-PL')}` : info.zaufana ? 'znana, sprawdzona strona' : 'rejestr nie podaje daty' });
    szczegoly.push({ nazwa: 'Sztuczki oszustów (podróbki marek, literówki, skracacze, pliki…)', stan: twarde.length && !twarde.every(t => /Cloudflare|OpenPhish|Phishing\.Database|nie istnieje|powstała/.test(t)) ? 'zle' : punkty >= 1 ? 'uwaga' : 'ok',
      opis: punkty >= 1 ? `podejrzane sygnały: ${miekkie.length}` : 'nic nie znaleziono' });

    return {
      werdykt, info, twarde, miekkie, punkty, szczegoly,
      domena: info.ukrytyKod ? 'ukryty kod' : (info.ip ? info.host : info.czytelny.replace(/^www\./, '')),
      marka: info.zaufana ? (BZ.MARKI.find(m => czyOficjalna(m, info)) || null) : null,
      zrodla: { cf, op, pd, rd }
    };
  };

  /* Do testów w konsoli. */
  BZ._test = { punycode, szkielet, warianty, odleglosc, wlasciciel, wykryjMarke, wykryjLiterowke };

})(window.BZ);
