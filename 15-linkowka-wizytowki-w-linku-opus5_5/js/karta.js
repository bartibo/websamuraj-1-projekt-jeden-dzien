/* Linkówka – rysowanie wizytówki z danych.
 * Dane przychodzą z adresu, czyli od kogokolwiek, więc:
 * – tekst wstawiamy wyłącznie przez textContent,
 * – linki przepuszczamy przez bezpiecznyUrl() (tylko http/https),
 * – kolor akcentu musi być #rrggbb, motyw i status to liczby z zakresu.
 */
'use strict';

const Karta = (() => {
  const MOTYWY = [
    { id: 'papier',   nazwa: 'Papier',   akcent: '#c2410c', bg: '#f3eee4', ink: '#1d1a16', font: "'Fraunces', Georgia, serif",     opis: 'redakcyjny, ciepły' },
    { id: 'atrament', nazwa: 'Atrament', akcent: '#a3e635', bg: '#0c0f14', ink: '#eef1f6', font: "'Space Grotesk', system-ui",     opis: 'ciemny, z poświatą' },
    { id: 'brutal',   nazwa: 'Brutal',   akcent: '#ff5c8a', bg: '#f2ecdf', ink: '#111111', font: "'Space Grotesk', system-ui",     opis: 'grube ramki, odwaga' },
    { id: 'mgielka',  nazwa: 'Mgiełka',  akcent: '#7c3aed', bg: '#f4f1fa', ink: '#1f1b2d', font: "'Instrument Serif', Georgia, serif", opis: 'szkło i pastele' },
    { id: 'terminal', nazwa: 'Terminal', akcent: '#4ade80', bg: '#090c0a', ink: '#d4e2d7', font: "'JetBrains Mono', monospace",    opis: 'dla ludzi od kodu' },
    { id: 'raster',   nazwa: 'Raster',   akcent: '#e11d2a', bg: '#ffffff', ink: '#0a0a0a', font: "'Inter', system-ui",             opis: 'szwajcarska siatka' },
  ];

  const STATUSY = [null, 'Przyjmuję zlecenia', 'Wolne terminy wkrótce', 'Grafik pełny'];

  /* ---------- kolory ---------- */
  const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const lum = (h) => {
    const [r, g, b] = rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const kontrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mieszaj = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };

  /** Akcent do tekstu: przyciemniony/rozjaśniony tak, żeby dało się go czytać na tle motywu. */
  function akcentDoTekstu(akcent, tlo) {
    const ciemneTlo = lum(tlo) < 0.2;
    const cel = ciemneTlo ? '#ffffff' : '#000000';
    const prog = ciemneTlo ? 4.5 : 3.6;
    let c = akcent;
    for (let i = 1; i <= 10 && kontrast(c, tlo) < prog; i++) c = mieszaj(akcent, cel, i * 0.08);
    return c;
  }
  const naAkcencie = (akcent) => (kontrast(akcent, '#ffffff') >= kontrast(akcent, '#111111') * 0.82 ? '#ffffff' : '#111111');

  /* ---------- adresy ---------- */
  function bezpiecznyUrl(u) {
    if (!u || typeof u !== 'string') return null;
    let s = u.trim();
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
    try {
      const url = new URL(s);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      if (!url.hostname.includes('.') && url.hostname !== 'localhost') return null;
      return url;
    } catch (e) { return null; }
  }
  const domena = (url) => url.hostname.replace(/^www\./, '');

  const PLATFORMY = [
    [/(^|\.)linkedin\.com$/, 'LinkedIn', 'in'],
    [/(^|\.)github\.com$/, 'GitHub', 'GH'],
    [/(^|\.)gitlab\.com$/, 'GitLab', 'GL'],
    [/(^|\.)behance\.net$/, 'Behance', 'Bē'],
    [/(^|\.)dribbble\.com$/, 'Dribbble', 'Dr'],
    [/(^|\.)instagram\.com$/, 'Instagram', 'IG'],
    [/(^|\.)(x|twitter)\.com$/, 'X', 'X'],
    [/(^|\.)(youtube\.com|youtu\.be)$/, 'YouTube', 'YT'],
    [/(^|\.)facebook\.com$/, 'Facebook', 'f'],
    [/(^|\.)tiktok\.com$/, 'TikTok', 'TT'],
    [/(^|\.)vimeo\.com$/, 'Vimeo', 'Vi'],
    [/(^|\.)medium\.com$/, 'Medium', 'M'],
    [/(^|\.)substack\.com$/, 'Substack', 'S'],
    [/(^|\.)figma\.com$/, 'Figma', 'Fi'],
    [/(^|\.)artstation\.com$/, 'ArtStation', 'AS'],
    [/(^|\.)bsky\.app$/, 'Bluesky', 'Bs'],
    [/(^|\.)threads\.(net|com)$/, 'Threads', '@'],
    [/(^|\.)pinterest\.[a-z.]+$/, 'Pinterest', 'P'],
    [/(^|\.)useme\.com$/, 'Useme', 'U'],
    [/(^|\.)upwork\.com$/, 'Upwork', 'Up'],
    [/(^|\.)fiverr\.com$/, 'Fiverr', 'Fv'],
    [/(^|\.)calendly\.com$/, 'Calendly', 'Ca'],
    [/(^|\.)cal\.com$/, 'Cal.com', 'Ca'],
    [/(^|\.)t\.me$/, 'Telegram', 'Tg'],
    [/(^|\.)wa\.me$/, 'WhatsApp', 'WA'],
    [/(^|\.)soundcloud\.com$/, 'SoundCloud', 'SC'],
    [/(^|\.)spotify\.com$/, 'Spotify', 'Sp'],
    [/(^|\.)codepen\.io$/, 'CodePen', 'CP'],
    [/(^|\.)stackoverflow\.com$/, 'Stack Overflow', 'SO'],
    [/(^|\.)goldenline\.pl$/, 'GoldenLine', 'GL'],
  ];

  function platforma(u) {
    const url = bezpiecznyUrl(u);
    if (!url) return null;
    const host = url.hostname.toLowerCase();
    const sciezka = url.pathname.split('/').filter(Boolean);
    for (const [re, nazwa, znak] of PLATFORMY) {
      if (re.test(host)) {
        let uchwyt = sciezka[0] || '';
        if (['in', 'company', 'u', 'user', 'c', 'channel', 'profile'].includes(uchwyt) && sciezka[1]) uchwyt = sciezka[1];
        if (/substack\.com$/.test(host) && host.split('.').length > 2) uchwyt = host.split('.')[0];
        uchwyt = decodeURIComponentBezpiecznie(uchwyt).replace(/^@/, '');
        return { nazwa, znak, opis: uchwyt ? '@' + uchwyt : domena(url), url };
      }
    }
    const reszta = url.pathname.length > 1 ? url.pathname.replace(/\/$/, '') : '';
    return { nazwa: 'Strona', znak: null, opis: domena(url) + reszta, url };
  }
  function decodeURIComponentBezpiecznie(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

  /* ---------- DOM ---------- */
  function el(tag, klasa, tekst) {
    const e = document.createElement(tag);
    if (klasa) e.className = klasa;
    if (tekst != null) e.textContent = tekst;
    return e;
  }
  const IKONY = {
    strzalka: '<path d="M7 17 17 7M8 7h9v9"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    tel: '<path d="M5 4h3.5l2 5-2.5 1.5a11 11 0 0 0 5.5 5.5l1.5-2.5 5 2V19a2 2 0 0 1-2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    pobierz: '<path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/>',
    kopiuj: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    glob: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    ok: '<path d="m5 12 5 5 9-10"/>',
  };
  function ikona(nazwa) {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'ik');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = IKONY[nazwa]; // stałe z kodu, nigdy dane z linku
    return s;
  }
  function link(url, klasa) {
    const a = el('a', klasa);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }

  function inicjaly(imie) {
    const slowa = (imie || '').trim().split(/\s+/).filter(Boolean);
    if (!slowa.length) return '?';
    const lit = (s) => Array.from(s)[0] || '';
    return (lit(slowa[0]) + (slowa.length > 1 ? lit(slowa[slowa.length - 1]) : '')).toUpperCase();
  }

  function telHref(tel) {
    const cyfry = tel.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
    return cyfry.replace(/\D/g, '').length >= 5 ? 'tel:' + cyfry : null;
  }
  // Bez znaków, które rozbiłyby adres mailto: (?, &, #, przecinek, średnik)
  const emailOk = (e) => /^[^\s@<>()"?&#,;:]+@[^\s@<>()"?&#,;:]+\.[^\s@<>()"?&#,;:.]{2,}$/.test(e);

  /* ---------- status zależny od daty ---------- */
  const fmtDzien = (dni, zRokiem) => Kod.naDate(dni).toLocaleDateString('pl-PL',
    zRokiem ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const STARY_STATUS = 120; // po tylu dniach „Przyjmuję zlecenia” z linku nie jest już pewne

  /** Status na dziś: ten z linku, przeliczony przez datę „wolne od” i wiek wizytówki. */
  function statusNaDzis(d, teraz = Kod.dzis()) {
    let s = d.status;
    if (!s) return null;
    const od = d.wolneOd | 0;
    if ((s === 2 || s === 3) && od > 0) {
      if (od <= teraz) s = 1; // termin minął – wizytówka sama przechodzi na „Przyjmuję zlecenia”
      else {
        const kiedy = fmtDzien(od, Kod.naDate(od).getUTCFullYear() !== Kod.naDate(teraz).getUTCFullYear());
        return { klasa: 's' + s, tekst: s === 2 ? 'Wolne terminy od ' + kiedy : 'Grafik pełny do ' + kiedy };
      }
    }
    // Stary link bez daty, która by go potwierdzała: zamiast zielonej kropki uczciwe „zapytaj”
    const wiek = d.wydano ? teraz - Math.max(d.wydano, od) : 0;
    if (wiek > STARY_STATUS) return { klasa: 's0', tekst: 'Zapytaj o wolne terminy' };
    return { klasa: 's' + s, tekst: STATUSY[s] };
  }

  /* ---------- vCard ---------- */
  function vcard(d, linkWizytowki) {
    const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
    const slowa = d.imie.trim().split(/\s+/);
    const nazwisko = slowa.length > 1 ? slowa.pop() : '';
    const w = ['BEGIN:VCARD', 'VERSION:3.0', `N:${esc(nazwisko)};${esc(slowa.join(' '))};;;`, `FN:${esc(d.imie.trim())}`];
    if (d.rola) w.push(`TITLE:${esc(d.rola)}`);
    if (emailOk(d.email)) w.push(`EMAIL;TYPE=INTERNET:${esc(d.email)}`);
    const th = telHref(d.tel || '');
    if (th) w.push(`TEL;TYPE=CELL:${th.slice(4)}`);
    const miasto = d.miasto.split(/\s+[·|•–-]\s+/)[0].trim(); // „Wrocław · zdalnie” → „Wrocław”
    if (miasto) w.push(`ADR;TYPE=WORK:;;;${esc(miasto)};;;`);
    if (linkWizytowki) w.push(`URL;TYPE=WORK:${linkWizytowki}`);
    d.linki.forEach((u) => { const url = bezpiecznyUrl(u); if (url) w.push(`URL:${url.href}`); });
    const awUrl = /^https?:\/\//i.test(d.awatar) ? bezpiecznyUrl(d.awatar) : null;
    if (awUrl) w.push(`PHOTO;VALUE=URI:${awUrl.href}`);
    if (d.bio) w.push(`NOTE:${esc(d.bio)}`);
    if (d.wydano) w.push(`REV:${Kod.doIso(d.wydano).replace(/-/g, '')}`);
    w.push('END:VCARD');
    // RFC 6350: linia ma najwyżej 75 bajtów, ciąg dalszy zaczyna się spacją (link wizytówki ma ~1000 znaków)
    const enc = new TextEncoder();
    const zawin = (linia) => {
      const czesci = [];
      let biez = '', bajty = 0;
      for (const z of linia) {
        const n = enc.encode(z).length;
        if (bajty + n > (czesci.length ? 74 : 75)) { czesci.push(biez); biez = ''; bajty = 0; }
        biez += z; bajty += n;
      }
      czesci.push(biez);
      return czesci.join('\r\n ');
    };
    return w.map(zawin).join('\r\n') + '\r\n';
  }
  function pobierzVcard(d, linkWizytowki) {
    const blob = new Blob([vcard(d, linkWizytowki)], { type: 'text/vcard;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (d.imie.trim() || 'kontakt').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-') + '.vcf';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function kopiujTekst(tekst) {
    try { await navigator.clipboard.writeText(tekst); return true; } catch (e) {
      const ta = el('textarea');
      ta.value = tekst;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0;left:-9999px';
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
      return ok;
    }
  }
  const toast = (t) => { if (window.pokazToast) window.pokazToast(t); };

  /* ---------- wizytówka ---------- */
  let nrKarty = 0; // unikalne nazwy pól formularza zapytania (podgląd i karta mogą istnieć naraz)

  /** Przewija do elementu – także wewnątrz przeskalowanego podglądu w kreatorze. */
  function przewinDo(cel) {
    const sc = cel.closest('.pg-scroll');
    if (sc) {
      sc.scrollTo({ top: sc.scrollTop + cel.getBoundingClientRect().top - sc.getBoundingClientRect().top - 8, behavior: 'smooth' });
    } else {
      cel.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }

  /** Twarda spacja przed „·”, żeby kropka nie zostawała sama na końcu linii. */
  const nbsp = (s) => s.replace(/ ([·|•–]) /g, ' $1 ');

  /**
   * @param d dane (format z Kod.pusty())
   * @param opcje { anim, link, linkTworzenia, linkEdycji, podglad, atrapy: { bio, projekty } }
   */
  function narysuj(d, opcje = {}) {
    const m = MOTYWY[d.motyw] || MOTYWY[0];
    const akcent = /^#[0-9a-f]{6}$/i.test(d.akcent) ? d.akcent : m.akcent;
    const atrapy = opcje.atrapy || {};
    const id = 'wz' + ++nrKarty;
    const root = el('article', 'wz');
    root.dataset.motyw = m.id;
    root.style.setProperty('--acc', akcent);
    root.style.setProperty('--acc-ink', akcentDoTekstu(akcent, m.bg));
    root.style.setProperty('--on-acc', naAkcencie(akcent));
    // Najdłuższy człon imienia steruje wielkością nagłówka, żeby nazwisko nie łamało się w środku.
    // „Grzybowska-Szczepańska” może złamać się po łączniku, więc liczy się każda część osobno.
    const najdluzsze = Math.max(0, ...d.imie.trim().split(/[\s-]+/).map((w) => Array.from(w).length));
    root.style.setProperty('--dl', Math.max(8, najdluzsze));
    if (opcje.anim) root.classList.add('wz-anim');

    let krok = 0;
    const wejdz = (e) => { e.classList.add('wz-a'); e.style.setProperty('--d', krok++); return e; };
    const atrapa = (e, czy) => { if (czy) { e.classList.add('wz-atrapa'); e.setAttribute('aria-hidden', 'true'); } return e; };

    const tlo = el('div', 'wz-tlo');
    tlo.setAttribute('aria-hidden', 'true');
    tlo.append(el('i'), el('i'), el('i'));
    root.append(tlo);

    const wn = el('div', 'wz-in');
    root.append(wn);

    /* --- nagłówek --- */
    const hero = el('header', 'wz-hero');
    wn.append(hero);

    const gora = el('div', 'wz-gora');
    const status = statusNaDzis(d);
    if (status) {
      const st = el('span', 'wz-status ' + status.klasa);
      st.append(el('i'), document.createTextNode(status.tekst));
      gora.append(st);
    }
    if (d.miasto.trim()) {
      const mi = el('span', 'wz-miasto');
      mi.append(ikona('pin'), document.createTextNode(d.miasto.trim()));
      gora.append(mi);
    }
    if (gora.childNodes.length) hero.append(wejdz(gora));

    hero.append(wejdz(awatar(d)));

    const h1 = el('h1', 'wz-imie');
    const slowa = d.imie.trim().split(/\s+/).filter(Boolean);
    if (slowa.length > 1) {
      h1.append(document.createTextNode(slowa.slice(0, -1).join(' ') + ' '), el('em', null, slowa[slowa.length - 1]));
    } else {
      h1.textContent = d.imie.trim();
    }
    hero.append(wejdz(h1));

    if (d.rola.trim()) hero.append(wejdz(el('p', 'wz-rola', nbsp(d.rola.trim()))));

    if (d.bio.trim()) {
      const bio = el('div', 'wz-bio');
      d.bio.trim().split(/\n+/).forEach((akapit) => bio.append(el('p', null, akapit)));
      hero.append(wejdz(atrapa(bio, atrapy.bio)));
    }

    const email = emailOk(d.email.trim()) ? d.email.trim() : '';
    const th = telHref(d.tel || '');
    const pakiety = (d.pakiety || []).filter((p) => p.nazwa.trim());
    const brief = email || th ? el('section', 'wz-sek wz-brief') : null;

    const cta = el('div', 'wz-cta');
    if (brief) {
      // „Napisz do mnie” prowadzi do krótkiego formularza, który składa gotową wiadomość
      const b = el('button', 'wz-btn gl');
      b.type = 'button';
      b.append(ikona('mail'), document.createTextNode(email ? 'Napisz do mnie' : 'Zapytaj o termin'));
      b.addEventListener('click', () => {
        przewinDo(brief);
        const pierwszy = brief.querySelector('input, textarea');
        if (pierwszy && !opcje.podglad) setTimeout(() => pierwszy.focus({ preventScroll: true }), 450);
      });
      cta.append(b);
    }
    if (th) {
      const a = el('a', 'wz-btn' + (cta.childNodes.length ? '' : ' gl'));
      a.href = th;
      a.append(ikona('tel'), document.createTextNode('Zadzwoń'));
      cta.append(a);
    }
    if (d.imie.trim() && (email || th)) {
      const b = el('button', 'wz-btn');
      b.type = 'button';
      b.append(ikona('pobierz'), document.createTextNode('Zapisz kontakt'));
      b.addEventListener('click', () => { pobierzVcard(d, opcje.link); toast('Pobrano wizytówkę .vcf – otwórz ją, by dodać kontakt'); });
      cta.append(b);
    }
    if (cta.childNodes.length) hero.append(wejdz(cta));

    if (d.stawka.trim()) {
      const st = el('p', 'wz-stawka');
      st.append(document.createTextNode('Stawka: '), el('b', null, d.stawka.trim()));
      hero.append(wejdz(st));
    }

    /* --- projekty --- */
    const projekty = d.projekty.filter((p) => p.tytul.trim() || p.url.trim() || p.opis.trim());
    if (projekty.length) {
      const sek = el('section', 'wz-sek wz-projekty');
      sek.append(naglowek(projekty.length === 1 ? 'Wybrany projekt' : 'Wybrane projekty', projekty.length));
      const ol = el('ol', 'wz-pr-lista');
      projekty.forEach((p, i) => {
        const url = bezpiecznyUrl(p.url);
        const li = el('li');
        const box = url ? link(url.href, 'wz-pr klik') : el('div', 'wz-pr');
        box.append(el('span', 'wz-pr-nr', String(i + 1).padStart(2, '0')));
        const tx = el('span', 'wz-pr-tx');
        tx.append(el('span', 'wz-pr-t', p.tytul.trim() || (url ? domena(url) : 'Projekt')));
        if (p.opis.trim()) tx.append(el('span', 'wz-pr-o', p.opis.trim()));
        box.append(tx);
        const meta = el('span', 'wz-pr-meta');
        if (p.tag.trim()) meta.append(el('span', 'wz-pr-tag', p.tag.trim()));
        if (url) {
          const dom = el('span', 'wz-pr-dom', domena(url));
          dom.append(ikona('strzalka'));
          meta.append(dom);
        }
        if (meta.childNodes.length) box.append(meta);
        li.append(box);
        ol.append(li);
      });
      sek.append(ol);
      wn.append(wejdz(atrapa(sek, atrapy.projekty)));
    }

    /* --- opinia klienta --- */
    if (d.opinia && d.opinia.cytat.trim()) {
      const fig = el('figure', 'wz-sek wz-opinia');
      const bq = el('blockquote');
      bq.append(el('p', null, d.opinia.cytat.trim()));
      fig.append(bq);
      if (d.opinia.autor.trim()) fig.append(el('figcaption', null, d.opinia.autor.trim()));
      wn.append(wejdz(fig));
    }

    /* --- oferta --- */
    if (pakiety.length) {
      const sek = el('section', 'wz-sek wz-oferta');
      sek.append(naglowek('Oferta', pakiety.length));
      const ol = el('ol', 'wz-pr-lista');
      pakiety.forEach((p, i) => {
        const li = el('li');
        const box = el(brief ? 'button' : 'div', brief ? 'wz-pr klik' : 'wz-pr');
        if (brief) {
          box.type = 'button';
          box.setAttribute('aria-label', 'Zapytaj o: ' + p.nazwa.trim());
          box.addEventListener('click', () => {
            const r = brief.querySelector(`input[name="${id}-usl"][value="${i}"]`);
            if (r) r.checked = true;
            przewinDo(brief);
          });
        }
        box.append(el('span', 'wz-pr-nr', String(i + 1).padStart(2, '0')));
        const tx = el('span', 'wz-pr-tx');
        tx.append(el('span', 'wz-pr-t', p.nazwa.trim()));
        if (p.czas.trim()) tx.append(el('span', 'wz-pr-o', p.czas.trim()));
        box.append(tx);
        const meta = el('span', 'wz-pr-meta');
        if (p.cena.trim()) meta.append(el('span', 'wz-pr-cena', p.cena.trim()));
        if (brief) {
          const z = el('span', 'wz-pr-dom', 'Zapytaj');
          z.append(ikona('strzalka'));
          meta.append(z);
        }
        if (meta.childNodes.length) box.append(meta);
        li.append(box);
        ol.append(li);
      });
      sek.append(ol);
      wn.append(wejdz(sek));
    }

    /* --- zapytanie: składa gotową wiadomość, bez serwera --- */
    if (brief) {
      brief.append(naglowek(email ? 'Zapytaj o wycenę' : 'Zapytanie', null));
      const f = el('form', 'wz-brief-f');
      f.noValidate = true;
      f.append(el('p', 'wz-brief-wst', email
        ? 'Zaznacz, co pasuje, a ja ułożę z tego wiadomość. Otworzy się Twój program pocztowy – wystarczy kliknąć „Wyślij”.'
        : 'Zaznacz, co pasuje, a ja ułożę z tego wiadomość do skopiowania. Wyślij ją SMS-em albo przeczytaj przez telefon.'));

      const grupa = (tytul, nazwa, opcjeGrupy) => {
        const fs = el('fieldset', 'wz-grupa');
        fs.append(el('legend', null, tytul));
        const ch = el('div', 'wz-chipy');
        opcjeGrupy.forEach((o, i) => {
          const l = el('label', 'wz-chip');
          const r = el('input');
          r.type = 'radio';
          r.name = id + '-' + nazwa;
          r.value = String(i);
          l.append(r, el('span', null, o));
          ch.append(l);
        });
        fs.append(ch);
        f.append(fs);
        return opcjeGrupy;
      };
      const uslugi = pakiety.length ? grupa('Co Cię interesuje', 'usl', pakiety.map((p) => p.nazwa.trim()).concat('Coś innego')) : null;
      const budzety = grupa('Budżet', 'bud', ['do 2 tys. zł', '2–10 tys. zł', '10–30 tys. zł', 'powyżej 30 tys. zł', 'jeszcze nie wiem']);
      const terminy = grupa('Kiedy', 'ter', ['jak najszybciej', 'w ciągu miesiąca', 'w ciągu kwartału', 'bez pośpiechu']);

      const pl = el('label', 'wz-pole');
      pl.append(el('span', null, 'O projekcie'));
      const ta = el('textarea');
      ta.rows = 3;
      ta.maxLength = 900;
      ta.placeholder = 'Kilka zdań: czego potrzebujesz, dla kogo i co ma się zmienić.';
      pl.append(ta);
      f.append(pl);

      const wybrane = (nazwa, lista) => {
        const r = f.querySelector(`input[name="${id}-${nazwa}"]:checked`);
        return r && lista ? lista[+r.value] : '';
      };
      const tresc = () => {
        const usl = wybrane('usl', uslugi);
        const linie = ['Dzień dobry,', ''];
        linie.push(ta.value.trim() || 'chciał(a)bym zapytać o współpracę.');
        linie.push('');
        if (usl) linie.push('Usługa: ' + usl);
        const bud = wybrane('bud', budzety);
        if (bud) linie.push('Budżet: ' + bud);
        const ter = wybrane('ter', terminy);
        if (ter) linie.push('Termin: ' + ter);
        linie.push('', 'Pozdrawiam');
        return { temat: usl && usl !== 'Coś innego' ? 'Zapytanie: ' + usl : 'Zapytanie o współpracę', tekst: linie.join('\n').replace(/\n{3,}/g, '\n\n') };
      };

      const akcje = el('div', 'wz-cta');
      if (email) {
        const b = el('button', 'wz-btn gl');
        b.type = 'submit';
        b.append(ikona('mail'), document.createTextNode('Przygotuj wiadomość'));
        akcje.append(b);
      }
      const kop = el('button', 'wz-btn' + (email ? '' : ' gl'));
      kop.type = 'button';
      kop.append(ikona('kopiuj'), document.createTextNode(email ? 'Kopiuj treść' : 'Kopiuj zapytanie'));
      kop.addEventListener('click', async () => {
        const t = tresc();
        const ok = await kopiujTekst(t.tekst);
        toast(ok ? (email ? 'Skopiowano. Wklej do maila na ' + email : 'Skopiowano. Wyślij SMS-em na ' + d.tel.trim()) : 'Nie udało się skopiować');
      });
      akcje.append(kop);
      f.append(akcje);
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        if (opcje.podglad) { toast('W podglądzie nic się nie wysyła. Klient zobaczy tu gotowego maila do Ciebie'); return; }
        const t = tresc();
        location.href = 'mailto:' + email + '?subject=' + encodeURIComponent(t.temat) + '&body=' + encodeURIComponent(t.tekst);
      });
      brief.append(f);
      wn.append(wejdz(brief));
    }

    /* --- kontakt --- */
    const kontakty = [];
    if (email) kontakty.push({ href: 'mailto:' + email, etykieta: 'E-mail', tekst: email, ik: 'mail', kopiuj: email });
    if (th) kontakty.push({ href: th, etykieta: 'Telefon', tekst: d.tel.trim(), ik: 'tel', kopiuj: d.tel.trim() });
    d.linki.forEach((u) => {
      const p = platforma(u);
      if (p) kontakty.push({ href: p.url.href, etykieta: p.nazwa, tekst: p.opis, znak: p.znak, ik: p.znak ? null : 'glob', zewn: true });
    });
    if (kontakty.length) {
      const sek = el('section', 'wz-sek wz-kontakt-sek');
      sek.append(naglowek('Kontakt', kontakty.length));
      const ul = el('ul', 'wz-kontakt');
      kontakty.forEach((k) => {
        const li = el('li', 'wz-k');
        const a = k.zewn ? link(k.href, 'wz-k-a') : el('a', 'wz-k-a');
        if (!k.zewn) a.href = k.href;
        const ik = el('span', 'wz-k-ik');
        if (k.znak) ik.textContent = k.znak; else ik.append(ikona(k.ik));
        const tx = el('span', 'wz-k-tx');
        tx.append(el('small', null, k.etykieta), el('span', null, k.tekst));
        a.append(ik, tx);
        if (k.zewn) a.append(ikona('strzalka'));
        li.append(a);
        if (k.kopiuj) {
          const b = el('button', 'wz-k-kop');
          b.type = 'button';
          b.title = 'Kopiuj';
          b.setAttribute('aria-label', 'Kopiuj: ' + k.tekst);
          b.append(ikona('kopiuj'));
          b.addEventListener('click', async () => {
            const ok = await kopiujTekst(k.kopiuj);
            toast(ok ? 'Skopiowano: ' + k.kopiuj : 'Nie udało się skopiować');
            if (ok) { b.replaceChildren(ikona('ok')); setTimeout(() => b.replaceChildren(ikona('kopiuj')), 1600); }
          });
          li.append(b);
        }
        ul.append(li);
      });
      sek.append(ul);
      wn.append(wejdz(sek));
    }

    /* --- stopka --- */
    const stopka = el('footer', 'wz-stopka');
    const info = el('p');
    info.textContent = (d.wydano ? 'Aktualne na ' + fmtDzien(d.wydano, true) + '. ' : '') + 'Ta strona nie ma serwera ani bazy danych – mieści się w całości w swoim linku.';
    stopka.append(info);
    const lk = el('p', 'wz-stopka-l');
    if (opcje.linkEdycji) {
      const e = el('a', null, 'Edytuj w kreatorze');
      e.href = opcje.linkEdycji;
      e.title = 'Otwiera kreator z tymi danymi. Zmiany dają nowy link, ten zostaje bez zmian';
      lk.append(e);
    }
    const z = el('a', null, 'Zrób własną wizytówkę →');
    z.href = opcje.linkTworzenia || './';
    lk.append(z);
    stopka.append(lk);
    wn.append(wejdz(stopka));

    return root;
  }

  function naglowek(tekst, liczba) {
    const h2 = el('h2', 'wz-h2');
    h2.append(el('span', null, tekst));
    if (liczba != null) h2.append(el('span', 'wz-h2-n', String(liczba).padStart(2, '0')));
    return h2;
  }

  // Emoji (także złożone, np. 🧑‍💻) albo najwyżej 3 litery; resztę zastępują inicjały.
  const EMOJI = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|‍|️|\p{Emoji_Modifier}|\s)+$/u;
  const grafemy = (s, n) => (typeof Intl !== 'undefined' && Intl.Segmenter
    ? Array.from(new Intl.Segmenter('pl', { granularity: 'grapheme' }).segment(s), (x) => x.segment).slice(0, n).join('')
    : Array.from(s).slice(0, n * 2).join(''));
  function awatar(d) {
    const box = el('div', 'wz-av');
    const a = (d.awatar || '').trim();
    const zdjecie = /^https?:\/\//i.test(a) ? bezpiecznyUrl(a) : null;
    if (zdjecie) {
      const img = el('img');
      img.alt = d.imie.trim() || 'Zdjęcie';
      img.referrerPolicy = 'no-referrer';
      img.decoding = 'async';
      img.src = zdjecie.href;
      img.addEventListener('error', () => { img.remove(); box.classList.remove('foto'); box.classList.add('ini'); box.textContent = inicjaly(d.imie); });
      box.classList.add('foto');
      box.append(img);
    } else if (a && EMOJI.test(a)) {
      box.classList.add('emoji');
      box.textContent = grafemy(a.replace(/\s+/g, ''), 2);
    } else if (a && /^\p{L}{1,3}$/u.test(a)) {
      box.classList.add('ini');
      box.textContent = a.toUpperCase();
    } else {
      box.classList.add('ini');
      box.textContent = inicjaly(d.imie);
    }
    box.setAttribute('aria-hidden', zdjecie ? 'false' : 'true');
    return box;
  }

  return { MOTYWY, STATUSY, narysuj, platforma, kopiujTekst, bezpiecznyUrl, emailOk, telHref, statusNaDzis, akcentDoTekstu };
})();
