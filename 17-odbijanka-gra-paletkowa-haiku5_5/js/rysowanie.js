/* Odbijanka – rysowanie planszy na canvasie. Współrzędne świata: 960 × 600. */
(function () {
  'use strict';
  const G = window.Odbijanka;
  const W = G.W;
  const H = G.H;
  const KOLOR = G.KOLOR;
  const FONT_GLOWNY = "'Orbitron', 'Segoe UI', Arial, sans-serif";
  const FONT_TEKST = "'Inter', 'Segoe UI', Arial, sans-serif";

  function zaokraglony(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function tlo(ctx) {
    const g = ctx.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H / 2, W * 0.75);
    g.addColorStop(0, '#161b42');
    g.addColorStop(1, '#03040c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(110, 130, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y <= H; y += 40) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }

  function linie(ctx, g) {
    // krawędzie góra / dół
    ctx.fillStyle = 'rgba(63, 240, 255, 0.45)';
    ctx.fillRect(0, 0, W, 3);
    ctx.fillStyle = 'rgba(255, 90, 209, 0.45)';
    ctx.fillRect(0, H - 3, W, 3);

    // linia środkowa – zaczyna się pod tablicą wyników, żeby nie przecinała napisów
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 14]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 170);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 70, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // w solo prawa krawędź to ściana – podświetlona
    if (g.tryb === 'solo') {
      ctx.save();
      ctx.shadowColor = KOLOR[1];
      ctx.shadowBlur = 16;
      ctx.fillStyle = 'rgba(255, 90, 209, 0.7)';
      ctx.fillRect(W - 4, 0, 4, H);
      ctx.restore();
    }
  }

  function paletka(ctx, p, kolor) {
    ctx.save();
    ctx.shadowColor = kolor;
    ctx.shadowBlur = p.dlugaT > 0 ? 30 : 22;
    const g = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, kolor);
    g.addColorStop(1, kolor);
    ctx.fillStyle = g;
    zaokraglony(ctx, p.x, p.y, p.w, p.h, p.w / 2);
    ctx.fill();
    ctx.restore();
  }

  function tarcza(ctx, s, czas) {
    const x = s === 0 ? 10 : W - 10;
    const puls = 0.6 + 0.4 * Math.sin(czas * 8);
    ctx.save();
    ctx.shadowColor = G.POWERUPY.tarcza.kolor;
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(255, 209, 102, ' + (0.25 + 0.4 * puls).toFixed(3) + ')';
    ctx.fillRect(x - 3, 0, 6, H);
    ctx.restore();
  }

  // Cień paletki „ducha” – najlepsza poprzednia seria (tylko solo)
  function duchPaletki(ctx, g) {
    const d = g.duchStan();
    if (!d) return;
    const p = g.paletki[0];
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    zaokraglony(ctx, p.x, d.y, p.w, p.h, p.w / 2);
    ctx.stroke();
    ctx.restore();
  }

  function kulka(ctx, k) {
    const kolor = k.ost >= 0 ? KOLOR[k.ost] : '#ffffff';
    const n = k.slad.length;
    for (let i = 0; i < n; i++) {
      const s = k.slad[i];
      const a = (i + 1) / n;
      ctx.globalAlpha = a * 0.35;
      ctx.fillStyle = kolor;
      ctx.beginPath();
      ctx.arc(s.x, s.y, k.r * a * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.shadowColor = kolor;
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(k.x, k.y, k.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function orb(ctx, o, czas) {
    const def = G.POWERUPY[o.typ];
    const r = 15 + Math.sin(czas * 5 + o.faza) * 1.5;
    // przed zniknięciem miga
    const alfa = o.zycie < 2 && Math.floor(czas * 10) % 2 ? 0.3 : 1;
    ctx.save();
    ctx.globalAlpha = alfa;
    ctx.shadowColor = def.kolor;
    ctx.shadowBlur = 22;
    ctx.fillStyle = 'rgba(10, 12, 30, 0.92)';
    ctx.strokeStyle = def.kolor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = def.kolor;
    ctx.font = '700 15px ' + FONT_GLOWNY;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.ikona, o.x, o.y + 1);
    ctx.restore();
  }

  function czastki(ctx, lista) {
    for (const c of lista) {
      ctx.globalAlpha = Math.max(0, c.zycie / c.max);
      ctx.fillStyle = c.kolor;
      ctx.fillRect(c.x - c.s / 2, c.y - c.s / 2, c.s, c.s);
    }
    ctx.globalAlpha = 1;
  }

  function nazwyGraczy(g) {
    if (g.tryb === 'dwoch') return ['GRACZ 1', 'GRACZ 2'];
    if (g.tryb === 'ai') return ['TY', 'KOMPUTER'];
    return ['A', 'B'];
  }

  function wynikTablica(ctx, g) {
    ctx.save();
    ctx.textBaseline = 'alphabetic';

    if (g.tryb === 'solo') {
      // serca
      ctx.textAlign = 'left';
      ctx.font = '700 26px ' + FONT_GLOWNY;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < g.zycia ? '#ff4d6d' : 'rgba(255, 255, 255, 0.15)';
        ctx.fillText('♥', 34 + i * 32, 62);
      }

      // wynik główny
      ctx.textAlign = 'center';
      ctx.fillStyle = KOLOR[0];
      ctx.shadowColor = KOLOR[0];
      ctx.shadowBlur = 18;
      ctx.font = '800 64px ' + FONT_GLOWNY;
      ctx.fillText(String(g.trafienia), W / 2, 92);
      ctx.shadowBlur = 0;
      ctx.font = '600 13px ' + FONT_TEKST;
      ctx.fillStyle = 'rgba(233, 236, 255, 0.6)';
      ctx.fillText('ODBICIA', W / 2, 118);

      // rekord i duch po prawej
      const rekord = g.duch ? g.duch.wynik : 0;
      ctx.textAlign = 'right';
      ctx.font = '600 14px ' + FONT_TEKST;
      ctx.fillStyle = 'rgba(233, 236, 255, 0.75)';
      ctx.fillText('REKORD ' + rekord, W - 34, 52);

      const d = g.duchStan();
      if (d) {
        const prowadze = g.trafienia > d.w;
        ctx.fillStyle = prowadze ? '#58f7a3' : '#ff5ad1';
        ctx.fillText((prowadze ? 'PROWADZISZ' : 'DUCH PROWADZI') + ' · ' + d.w, W - 34, 74);
      }
    } else {
      const nazwy = nazwyGraczy(g);
      ctx.textAlign = 'center';
      ctx.font = '800 72px ' + FONT_GLOWNY;
      ctx.shadowBlur = 20;
      ctx.shadowColor = KOLOR[0];
      ctx.fillStyle = KOLOR[0];
      ctx.fillText(String(g.wynik[0]), W / 2 - 96, 102);
      ctx.shadowColor = KOLOR[1];
      ctx.fillStyle = KOLOR[1];
      ctx.fillText(String(g.wynik[1]), W / 2 + 96, 102);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(233, 236, 255, 0.5)';
      ctx.font = '700 26px ' + FONT_GLOWNY;
      ctx.fillText(':', W / 2, 96);

      ctx.font = '600 13px ' + FONT_TEKST;
      ctx.fillStyle = 'rgba(233, 236, 255, 0.6)';
      ctx.fillText(nazwy[0], W / 2 - 96, 128);
      ctx.fillText(nazwy[1], W / 2 + 96, 128);

      if (g.tryb === 'ai') {
        const poziom = G.POZIOMY_AI[g.poziom] ? G.POZIOMY_AI[g.poziom].nazwa : '';
        ctx.font = '600 12px ' + FONT_TEKST;
        ctx.fillStyle = 'rgba(233, 236, 255, 0.4)';
        ctx.fillText('poziom: ' + poziom + ' · mecz do ' + g.cel, W / 2, 150);
      } else if (g.tryb === 'dwoch') {
        ctx.font = '600 12px ' + FONT_TEKST;
        ctx.fillStyle = 'rgba(233, 236, 255, 0.4)';
        ctx.fillText('mecz do ' + g.cel, W / 2, 150);
      }
    }

    // aktywne power-upy każdej strony
    ctx.font = '700 13px ' + FONT_TEKST;
    const lewa = g.paletki[0];
    const prawa = g.paletki[1];
    wypiszStatusy(ctx, g, lewa, 40, 'left');
    if (g.tryb !== 'solo') wypiszStatusy(ctx, g, prawa, W - 40, 'right');
    if (g.spowolnienieT > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = G.POWERUPY.spowolnij.kolor;
      ctx.fillText('SPOWOLNIENIE ' + Math.ceil(g.spowolnienieT) + 's', W / 2, H - 22);
    }
    ctx.restore();
  }

  function wypiszStatusy(ctx, g, p, x, wyrownanie) {
    const linie = [];
    if (p.dlugaT > 0) linie.push({ t: G.POWERUPY.dluga.nazwa + ' ' + Math.ceil(p.dlugaT) + 's', c: G.POWERUPY.dluga.kolor });
    if (p.tarcza) linie.push({ t: G.POWERUPY.tarcza.nazwa + ' ' + Math.ceil(p.tarczaT) + 's', c: G.POWERUPY.tarcza.kolor });
    ctx.textAlign = wyrownanie;
    for (let i = 0; i < linie.length; i++) {
      ctx.fillStyle = linie[i].c;
      ctx.fillText(linie[i].t, x, H - 22 - i * 18);
    }
  }

  function komunikaty(ctx, g) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < g.komunikaty.length; i++) {
      const m = g.komunikaty[i];
      ctx.globalAlpha = Math.min(1, m.czas * 2);
      ctx.fillStyle = m.kolor;
      ctx.shadowColor = m.kolor;
      ctx.shadowBlur = 12;
      ctx.font = '700 17px ' + FONT_GLOWNY;
      ctx.fillText(m.tekst, W / 2, 178 + i * 28);
    }
    ctx.restore();
  }

  function odliczanieRys(ctx, g) {
    const n = Math.ceil(g.odliczanie);
    if (n <= 0) return;
    const ulamek = g.odliczanie - (n - 1);   // 1 → 0 w każdej sekundzie
    ctx.save();
    ctx.translate(W / 2, H / 2 + 36);
    ctx.scale(1 + 0.5 * ulamek, 1 + 0.5 * ulamek);
    ctx.globalAlpha = Math.min(1, 0.35 + ulamek * 1.2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 96px ' + FONT_GLOWNY;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(n), 0, 0);
    ctx.restore();
  }

  // Główna funkcja rysująca jedną klatkę. Canvas musi mieć już ustawioną skalę (setTransform).
  G.rysuj = function (ctx, g, czas) {
    ctx.save();
    if (g.wstrzas > 0) {
      const a = g.wstrzas;
      ctx.translate((Math.random() - 0.5) * a * 2, (Math.random() - 0.5) * a * 2);
    }

    tlo(ctx);
    linie(ctx, g);

    for (let s = 0; s < 2; s++) {
      const p = g.paletki[s];
      if (p.aktywna && p.tarcza) tarcza(ctx, s, czas);
    }
    if (g.tryb === 'solo') duchPaletki(ctx, g);

    for (const p of g.paletki) {
      if (p.aktywna) paletka(ctx, p, KOLOR[p.strona]);
    }

    for (const o of g.orby) orb(ctx, o, czas);
    for (const k of g.kulki) kulka(ctx, k);
    czastki(ctx, g.czastki);

    wynikTablica(ctx, g);
    komunikaty(ctx, g);
    if (g.stan === 'serwis') odliczanieRys(ctx, g);

    ctx.restore();
  };
})();
