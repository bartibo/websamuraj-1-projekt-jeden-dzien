/* Odbijanka – logika rozgrywki: piłki, paletki, kolizje, punkty, power-upy, duch rekordu. */
(function () {
  'use strict';
  const G = (window.Odbijanka = window.Odbijanka || {});

  const W = 960;
  const H = 600;
  const PALETKA_W = 14;
  const PALETKA_H = 116;
  const MARGINES = 36;
  const PALETKA_PREDKOSC = 620;   // px/s – klawisze
  const PALETKA_MYSZ = 1.5;       // mnożnik prędkości przy celowaniu myszą / dotykiem
  const KULKA_R = 9;
  const V_START = 380;            // px/s – start meczu
  const V_SOLO = 340;             // px/s – start serii solo
  const V_MAX = 860;
  const PRZYSPIESZENIE = 1.03;    // mnożnik prędkości po każdym odbiciu
  const MAX_KULEK = 3;
  const KOLOR = ['#3ff0ff', '#ff5ad1'];

  G.W = W;
  G.H = H;
  G.KOLOR = KOLOR;
  G.POWERUPY = {
    dluga:     { ikona: 'L',  nazwa: 'Długa paletka',   kolor: '#58f7a3', czas: 9 },
    tarcza:    { ikona: 'T',  nazwa: 'Tarcza',          kolor: '#ffd166', czas: 14 },
    wiele:     { ikona: 'x2', nazwa: 'Dodatkowa piłka', kolor: '#ff6bd6', czas: 0 },
    spowolnij: { ikona: 'S',  nazwa: 'Spowolnienie',    kolor: '#7aa2ff', czas: 5 },
  };
  const TYPY_ORBOW = Object.keys(G.POWERUPY);

  function przytnij(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function losowy(a, b) { return a + Math.random() * (b - a); }

  function nowyPalet(strona) {
    return {
      strona,                       // 0 = lewa, 1 = prawa
      x: strona === 0 ? MARGINES : W - MARGINES - PALETKA_W,
      w: PALETKA_W,
      h: PALETKA_H,
      y: H / 2 - PALETKA_H / 2,     // górna krawędź
      dir: 0,                       // -1 / 0 / 1 – z klawiszy
      cel: null,                    // docelowe y środka – z myszy / dotyku
      ster: 'czlowiek',             // 'czlowiek' | 'ai'
      ai: null,
      aktywna: true,
      dlugaT: 0,
      tarcza: false,
      tarczaT: 0,
    };
  }

  function przodX(p) { return p.strona === 0 ? p.x + p.w : p.x; }

  function nowaKulka(x, y, vx, vy, v) {
    return { x, y, vx, vy, v, r: KULKA_R, ost: -1, slad: [] };
  }

  class Partia {
    // o.tryb: 'ai' | 'dwoch' | 'solo' | 'demo'
    constructor(o) {
      this.tryb = o.tryb;
      this.poziom = o.poziom === undefined ? 1 : o.poziom;
      this.cel = o.celPunktow || 7;
      this.duch = o.duch || null;   // zapis najlepszej serii solo (do wyświetlenia ducha)

      this.paletki = [nowyPalet(0), nowyPalet(1)];
      if (this.tryb === 'solo') this.paletki[1].aktywna = false;
      if (this.tryb === 'ai') {
        this.paletki[1].ster = 'ai';
        this.paletki[1].ai = new G.Komputer(this.poziom);
      }
      if (this.tryb === 'demo') {
        // tło menu: dwa komputery grają same ze sobą
        this.paletki[0].ster = 'ai';
        this.paletki[0].ai = new G.Komputer(0);
        this.paletki[1].ster = 'ai';
        this.paletki[1].ai = new G.Komputer(1);
      }

      this.wynik = [0, 0];
      this.trafienia = 0;           // tylko solo: liczba odbić
      this.zycia = 3;               // tylko solo
      this.czas = 0;                // czas aktywnej gry (s)
      this.kulki = [];
      this.orby = [];
      this.czastki = [];
      this.komunikaty = [];
      this.historia = [];           // tylko solo: próbki do ducha
      this.idxDucha = 0;
      this.zegarHistorii = 0;
      this.zegarOrba = losowy(6, 9);
      this.spowolnienieT = 0;
      this.wstrzas = 0;
      this.zwyciezca = -1;          // 0 / 1 w meczu, -1 w solo (koniec serii)
      this.stan = 'serwis';         // 'serwis' | 'gra' | 'koniec'

      this.serwuj(Math.random() < 0.5 ? 0 : 1);
    }

    // Nowa piłka na środku; leci w stronę gracza, który właśnie stracił punkt.
    serwuj(dlaKogo) {
      const v = this.tryb === 'solo' ? V_SOLO : V_START;
      const kierunek = dlaKogo === 0 ? -1 : 1;
      const kat = losowy(-0.35, 0.35);
      this.kulki = [nowaKulka(W / 2, H / 2, kierunek * v * Math.cos(kat), v * Math.sin(kat), v)];
      this.stan = 'serwis';
      this.odliczanie = 2.4;
      this.ostatniaSekunda = 4;
    }

    krok(dt) {
      if (this.stan === 'gra') this.czas += dt;

      for (const p of this.paletki) if (p.aktywna) this.ruchPaletki(p, dt);
      this.aktualizujEfekty(dt);

      if (this.stan === 'serwis') {
        this.odliczanie -= dt;
        const s = Math.ceil(this.odliczanie);
        if (this.odliczanie > 0 && s < this.ostatniaSekunda) {
          this.ostatniaSekunda = s;
          G.dzwiek.odliczanie(s);
        }
        if (this.odliczanie <= 0) {
          this.stan = 'gra';
          G.dzwiek.odliczanie(0);
        }
        return;
      }
      if (this.stan !== 'gra') return;

      if (this.tryb === 'solo') this.krokHistorii(dt);

      this.zegarOrba -= dt;
      if (this.zegarOrba <= 0) {
        this.zegarOrba = losowy(8, 12);
        if (this.orby.length < 2) this.spawnOrb();
      }

      // podział kroku: szybka piłka nie przeskoczy paletki
      const dtK = this.spowolnienieT > 0 ? dt * 0.6 : dt;
      const n = Math.max(1, Math.ceil(V_MAX * dtK / 6));
      const h = dtK / n;
      for (let i = 0; i < n && this.stan === 'gra'; i++) this.ruchKulek(h);
    }

    // ---------- paletki ----------
    ruchPaletki(p, dt) {
      const nowaH = PALETKA_H * (p.dlugaT > 0 ? 1.45 : 1);
      if (Math.abs(nowaH - p.h) > 0.01) {
        const srodek = p.y + p.h / 2;
        p.h = nowaH;
        p.y = srodek - p.h / 2;
      }

      if (p.ster === 'ai') {
        const cel = p.ai.sterowanie(dt, this.kulki, p, H, przodX(p));
        this.dazDo(p, cel, p.ai.ust.predkosc * dt);
      } else if (p.dir !== 0) {
        p.cel = null;
        p.y += p.dir * PALETKA_PREDKOSC * dt;
      } else if (p.cel !== null) {
        this.dazDo(p, p.cel, PALETKA_PREDKOSC * PALETKA_MYSZ * dt);
      }
      p.y = przytnij(p.y, 0, H - p.h);
    }

    dazDo(p, cel, krok) {
      const roznica = (cel - p.h / 2) - p.y;
      p.y += przytnij(roznica, -krok, krok);
    }

    // ---------- piłki ----------
    ruchKulek(dt) {
      for (let i = this.kulki.length - 1; i >= 0 && this.stan === 'gra'; i--) {
        const k = this.kulki[i];
        k.slad.push({ x: k.x, y: k.y });
        if (k.slad.length > 12) k.slad.shift();

        k.x += k.vx * dt;
        k.y += k.vy * dt;

        if (k.y - k.r < 0) { k.y = k.r; k.vy = Math.abs(k.vy); this.odbicieSciany(k); }
        else if (k.y + k.r > H) { k.y = H - k.r; k.vy = -Math.abs(k.vy); this.odbicieSciany(k); }

        if (this.tryb === 'solo' && k.x + k.r > W) {
          k.x = W - k.r;
          k.vx = -Math.abs(k.vx);
          this.odbicieSciany(k);
        }

        for (const p of this.paletki) if (p.aktywna) this.kolizjaPalet(k, p);

        if (k.x + k.r < 0) {
          if (this.paletki[0].tarcza) this.zbijTarcze(k, 0);
          else this.bramka(i, 0);
        } else if (k.x - k.r > W && this.tryb !== 'solo') {
          if (this.paletki[1].tarcza) this.zbijTarcze(k, 1);
          else this.bramka(i, 1);
        }

        if (this.stan === 'gra' && this.kulki.includes(k)) this.zbierzOrby(k);
      }
    }

    kolizjaPalet(k, p) {
      const przod = przodX(p);
      if (p.strona === 0) {
        if (k.vx >= 0 || k.x - k.r > przod || k.x + k.r < p.x) return;
      } else {
        if (k.vx <= 0 || k.x + k.r < przod || k.x - k.r > p.x + p.w) return;
      }
      if (k.y + k.r < p.y || k.y - k.r > p.y + p.h) return;

      k.x = p.strona === 0 ? przod + k.r : przod - k.r;

      // kąt zależy od miejsca trafienia: krawędź = ostre odbicie, środek = płasko
      const rel = przytnij((k.y - (p.y + p.h / 2)) / (p.h / 2), -1, 1);
      k.v = Math.min(V_MAX, k.v * PRZYSPIESZENIE);
      const kat = rel * 0.95 + losowy(-0.1, 0.1);   // drobna losowość – każda wymiana jest inna
      const znak = p.strona === 0 ? 1 : -1;
      k.vx = znak * k.v * Math.cos(kat);
      k.vy = k.v * Math.sin(kat);
      k.ost = p.strona;

      if (this.tryb === 'solo') this.trafienia++;
      G.dzwiek.odbicie(przytnij((k.v - V_START) / (V_MAX - V_START), 0, 1));
      this.iskry(k.x, k.y, KOLOR[p.strona], 12);
      this.wstrzas = Math.min(this.wstrzas + 1.5, 5);
    }

    odbicieSciany(k) {
      G.dzwiek.sciana();
      this.iskry(k.x, k.y, '#ffffff', 3);
    }

    zbijTarcze(k, s) {
      const p = this.paletki[s];
      p.tarcza = false;
      p.tarczaT = 0;
      if (s === 0) { k.x = k.r; k.vx = Math.abs(k.vx); }
      else { k.x = W - k.r; k.vx = -Math.abs(k.vx); }
      this.iskry(s === 0 ? 16 : W - 16, k.y, G.POWERUPY.tarcza.kolor, 30);
      this.komunikat('Tarcza obroniła!', G.POWERUPY.tarcza.kolor);
      G.dzwiek.tarcza();
      this.wstrzas = 4;
    }

    // Piłka wyleciała za bramkę strony `przegrany`.
    bramka(i, przegrany) {
      const k = this.kulki[i];
      this.kulki.splice(i, 1);
      this.iskry(przegrany === 0 ? 0 : W, k.y, KOLOR[przegrany], 40);
      this.wstrzas = 12;
      G.dzwiek.punkt();

      if (this.tryb === 'solo') {
        if (this.kulki.length > 0) return;      // zostały inne piłki
        this.zycia--;
        if (this.zycia <= 0) { this.koniec(-1); return; }
        this.komunikat('Strata życia', KOLOR[0]);
        this.serwuj(0);
        return;
      }

      const zdobywca = 1 - przegrany;
      this.wynik[zdobywca]++;
      if (this.wynik[zdobywca] >= this.cel) { this.koniec(zdobywca); return; }
      if (this.kulki.length > 0) return;
      this.serwuj(przegrany);
    }

    koniec(zw) {
      this.stan = 'koniec';
      this.zwyciezca = zw;
      this.kulki = [];
      this.wstrzas = 6;
      const przegrana = zw === -1 || (this.tryb === 'ai' && zw === 1);
      if (przegrana) G.dzwiek.przegrana();
      else G.dzwiek.wygrana();
      this.iskry(W / 2, H / 2, '#ffd166', 70);
    }

    // ---------- power-upy ----------
    spawnOrb() {
      this.orby.push({
        x: losowy(300, 660),
        y: losowy(90, H - 90),
        typ: TYPY_ORBOW[Math.floor(Math.random() * TYPY_ORBOW.length)],
        zycie: 12,
        faza: Math.random() * 6.28,
      });
    }

    zbierzOrby(k) {
      for (let j = this.orby.length - 1; j >= 0; j--) {
        const o = this.orby[j];
        const dx = k.x - o.x;
        const dy = k.y - o.y;
        const r = k.r + 16;
        if (dx * dx + dy * dy <= r * r) {
          this.orby.splice(j, 1);
          // power-up dostaje ten, kto ostatnio odbił piłkę
          const strona = this.tryb === 'solo' ? 0 : (k.ost >= 0 ? k.ost : (Math.random() < 0.5 ? 0 : 1));
          this.zbierz(o, strona, k);
        }
      }
    }

    zbierz(o, strona, k) {
      const p = this.paletki[strona];
      const def = G.POWERUPY[o.typ];
      if (o.typ === 'dluga') {
        p.dlugaT = def.czas;
      } else if (o.typ === 'tarcza') {
        p.tarcza = true;
        p.tarczaT = def.czas;
      } else if (o.typ === 'spowolnij') {
        this.spowolnienieT = def.czas;
      } else if (o.typ === 'wiele' && this.kulki.length < MAX_KULEK) {
        const v = k.v;
        const kat = losowy(-0.5, 0.5);
        const znak = Math.random() < 0.5 ? -1 : 1;
        const nk = nowaKulka(o.x, o.y, znak * v * Math.cos(kat), v * Math.sin(kat), v);
        nk.ost = strona;
        this.kulki.push(nk);
      }
      this.komunikat(def.nazwa, def.kolor);
      G.dzwiek.powerup();
      this.iskry(o.x, o.y, def.kolor, 26);
    }

    // ---------- efekty, czasy, cząsteczki ----------
    aktualizujEfekty(dt) {
      for (const p of this.paletki) {
        if (p.dlugaT > 0) p.dlugaT = Math.max(0, p.dlugaT - dt);
        if (p.tarcza) {
          p.tarczaT -= dt;
          if (p.tarczaT <= 0) { p.tarcza = false; p.tarczaT = 0; }
        }
      }
      if (this.spowolnienieT > 0) this.spowolnienieT = Math.max(0, this.spowolnienieT - dt);

      for (let i = this.orby.length - 1; i >= 0; i--) {
        this.orby[i].zycie -= dt;
        if (this.orby[i].zycie <= 0) this.orby.splice(i, 1);
      }

      for (let i = this.czastki.length - 1; i >= 0; i--) {
        const c = this.czastki[i];
        c.zycie -= dt;
        if (c.zycie <= 0) { this.czastki.splice(i, 1); continue; }
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        const tl = Math.exp(-3 * dt);
        c.vx *= tl;
        c.vy *= tl;
      }

      for (let i = this.komunikaty.length - 1; i >= 0; i--) {
        this.komunikaty[i].czas -= dt;
        if (this.komunikaty[i].czas <= 0) this.komunikaty.splice(i, 1);
      }

      this.wstrzas *= Math.exp(-7 * dt);
      if (this.wstrzas < 0.05) this.wstrzas = 0;
    }

    iskry(x, y, kolor, ile) {
      for (let i = 0; i < ile; i++) {
        if (this.czastki.length > 350) break;
        const a = Math.random() * Math.PI * 2;
        const v = losowy(90, 380);
        const z = losowy(0.35, 0.8);
        this.czastki.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, zycie: z, max: z, kolor, s: losowy(2, 5) });
      }
    }

    komunikat(tekst, kolor) {
      this.komunikaty.push({ tekst, kolor, czas: 1.8 });
      if (this.komunikaty.length > 3) this.komunikaty.shift();
    }

    // ---------- duch (solo) ----------
    krokHistorii(dt) {
      this.zegarHistorii -= dt;
      if (this.zegarHistorii <= 0) {
        this.zegarHistorii = 0.2;
        this.historia.push({
          t: Math.round(this.czas * 100) / 100,
          y: Math.round(this.paletki[0].y),
          w: this.trafienia,
        });
      }
    }

    // Stan najlepszej poprzedniej serii w tym samym momencie czasu.
    duchStan() {
      const h = this.duch && this.duch.historia;
      if (!h || !h.length) return null;
      while (this.idxDucha + 1 < h.length && h[this.idxDucha + 1].t <= this.czas) this.idxDucha++;
      return h[this.idxDucha];
    }
  }

  G.Partia = Partia;
})();
