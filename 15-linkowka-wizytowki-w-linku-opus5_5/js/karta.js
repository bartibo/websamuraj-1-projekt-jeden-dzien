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
    [/(^|\.)(x|twitter)\.com$/, 'X', '𝕏'],
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
    [/(^|\.)calendly\.com$/, 'Calendly', '📅'],
    [/(^|\.)cal\.com$/, 'Cal.com', '📅'],
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
  const emailOk = (e) => /^[^\s@<>()"]+@[^\s@<>()"]+\.[^\s@<>()"]{2,}$/.test(e);

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
    if (d.miasto) w.push(`ADR;TYPE=WORK:;;;${esc(d.miasto)};;;`);
    if (linkWizytowki) w.push(`URL;TYPE=Wizytówka:${linkWizytowki}`);
    d.linki.forEach((u) => { const url = bezpiecznyUrl(u); if (url) w.push(`URL:${url.href}`); });
    const awUrl = /^https?:\/\//i.test(d.awatar) ? bezpiecznyUrl(d.awatar) : null;
    if (awUrl) w.push(`PHOTO;VALUE=URI:${awUrl.href}`);
    if (d.bio) w.push(`NOTE:${esc(d.bio)}`);
    w.push('END:VCARD');
    return w.join('\r\n');
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
  /**
   * @param d dane (format z Kod.pusty())
   * @param opcje { anim, link, linkTworzenia, linkEdycji }
   */
  function narysuj(d, opcje = {}) {
    const m = MOTYWY[d.motyw] || MOTYWY[0];
    const akcent = /^#[0-9a-f]{6}$/i.test(d.akcent) ? d.akcent : m.akcent;
    const root = el('article', 'wz');
    root.dataset.motyw = m.id;
    root.style.setProperty('--acc', akcent);
    root.style.setProperty('--acc-ink', akcentDoTekstu(akcent, m.bg));
    root.style.setProperty('--on-acc', naAkcencie(akcent));
    // Najdłuższe słowo imienia steruje wielkością nagłówka, żeby nazwisko nie łamało się w środku
    const najdluzsze = Math.max(0, ...d.imie.trim().split(/\s+/).map((w) => Array.from(w).length));
    root.style.setProperty('--dl', Math.max(8, najdluzsze));
    if (opcje.anim) root.classList.add('wz-anim');

    let krok = 0;
    const wejdz = (e) => { e.classList.add('wz-a'); e.style.setProperty('--d', krok++); return e; };

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
    if (STATUSY[d.status]) {
      const st = el('span', 'wz-status s' + d.status);
      st.append(el('i'), document.createTextNode(STATUSY[d.status]));
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

    if (d.rola.trim()) hero.append(wejdz(el('p', 'wz-rola', d.rola.trim())));

    if (d.bio.trim()) {
      const bio = el('div', 'wz-bio');
      d.bio.trim().split(/\n+/).forEach((akapit) => bio.append(el('p', null, akapit)));
      hero.append(wejdz(bio));
    }

    const cta = el('div', 'wz-cta');
    if (emailOk(d.email.trim())) {
      const a = el('a', 'wz-btn gl');
      a.href = 'mailto:' + d.email.trim() + '?subject=' + encodeURIComponent('Zapytanie o współpracę');
      a.append(ikona('mail'), document.createTextNode('Napisz do mnie'));
      cta.append(a);
    }
    const th = telHref(d.tel || '');
    if (th) {
      const a = el('a', 'wz-btn' + (cta.childNodes.length ? '' : ' gl'));
      a.href = th;
      a.append(ikona('tel'), document.createTextNode('Zadzwoń'));
      cta.append(a);
    }
    if (d.imie.trim() && (emailOk(d.email.trim()) || th)) {
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
      const h2 = el('h2', 'wz-h2');
      h2.append(el('span', null, projekty.length === 1 ? 'Wybrany projekt' : 'Wybrane projekty'), el('span', 'wz-h2-n', String(projekty.length).padStart(2, '0')));
      sek.append(h2);
      const ol = el('ol', 'wz-pr-lista');
      projekty.forEach((p, i) => {
        const url = bezpiecznyUrl(p.url);
        const li = el('li');
        const box = url ? link(url.href, 'wz-pr') : el('div', 'wz-pr');
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
      wn.append(wejdz(sek));
    }

    /* --- kontakt --- */
    const kontakty = [];
    if (emailOk(d.email.trim())) kontakty.push({ typ: 'email', href: 'mailto:' + d.email.trim(), etykieta: 'E-mail', tekst: d.email.trim(), ik: 'mail', kopiuj: d.email.trim() });
    if (th) kontakty.push({ typ: 'tel', href: th, etykieta: 'Telefon', tekst: d.tel.trim(), ik: 'tel', kopiuj: d.tel.trim() });
    d.linki.forEach((u) => {
      const p = platforma(u);
      if (p) kontakty.push({ typ: 'link', href: p.url.href, etykieta: p.nazwa, tekst: p.opis, znak: p.znak, ik: p.znak ? null : 'glob', zewn: true });
    });
    if (kontakty.length) {
      const sek = el('section', 'wz-sek wz-kontakt-sek');
      const h2 = el('h2', 'wz-h2');
      h2.append(el('span', null, 'Kontakt'), el('span', 'wz-h2-n', String(kontakty.length).padStart(2, '0')));
      sek.append(h2);
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
    stopka.append(el('p', null, 'Ta strona nie ma serwera ani bazy danych – mieści się w całości w swoim linku.'));
    const lk = el('p', 'wz-stopka-l');
    if (opcje.linkEdycji) {
      const e = el('a', null, 'Edytuj kopię');
      e.href = opcje.linkEdycji;
      lk.append(e);
    }
    const z = el('a', null, 'Zrób własną wizytówkę →');
    z.href = opcje.linkTworzenia || './';
    lk.append(z);
    stopka.append(lk);
    wn.append(wejdz(stopka));

    return root;
  }

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
      img.addEventListener('error', () => { img.remove(); box.classList.add('ini'); box.textContent = inicjaly(d.imie); });
      box.classList.add('foto');
      box.append(img);
    } else if (a && !/[:/\\.]/.test(a)) { // emoji lub krótki tekst; coś, co wygląda na adres, zamienia się w inicjały
      box.classList.add('emoji');
      box.textContent = Array.from(a).slice(0, 4).join('');
    } else {
      box.classList.add('ini');
      box.textContent = inicjaly(d.imie);
    }
    box.setAttribute('aria-hidden', zdjecie ? 'false' : 'true');
    return box;
  }

  return { MOTYWY, STATUSY, narysuj, platforma, kopiujTekst, bezpiecznyUrl };
})();
