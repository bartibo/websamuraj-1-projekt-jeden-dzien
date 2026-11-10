/* Odbijanka – komputerowy przeciwnik. Przewiduje, gdzie piłka dotrze do jego paletki,
   i celowo popełnia drobne błędy zależne od poziomu. */
(function () {
  'use strict';
  const G = (window.Odbijanka = window.Odbijanka || {});

  // predkosc – px/s, blad – losowe przesunięcie celu (px), odswiez – co ile s liczy cel
  const POZIOMY = [
    { nazwa: 'Łatwy',    predkosc: 330, blad: 60, odswiez: 0.30 },
    { nazwa: 'Normalny', predkosc: 460, blad: 24, odswiez: 0.14 },
    { nazwa: 'Trudny',   predkosc: 690, blad: 6,  odswiez: 0.05 },
  ];

  // Y, w którym piłka dotrze do płaszczyzny x (z odbiciami od górnej i dolnej ściany).
  function przewidz(kulka, xCel, H) {
    const r = kulka.r;
    const t = (xCel - kulka.x) / kulka.vx;
    const surowe = (kulka.y - r) + kulka.vy * t;
    const L = H - 2 * r;
    const okres = 2 * L;
    let m = ((surowe % okres) + okres) % okres;
    if (m > L) m = okres - m;
    return m + r;
  }

  class Komputer {
    constructor(poziom) {
      this.ust = POZIOMY[poziom] || POZIOMY[1];
      this.zegar = 0;
      this.cel = null;
      this.przesuniecie = 0;
    }

    // Zwraca docelowe y ŚRODKA paletki. pal – paletka komputera, xPrzod – jej przednia krawędź.
    sterowanie(dt, kulki, pal, H, xPrzod) {
      this.zegar -= dt;
      if (this.zegar <= 0 || this.cel === null) {
        this.zegar = this.ust.odswiez;
        this.przesuniecie = (Math.random() * 2 - 1) * this.ust.blad;

        // najbliższa piłka lecąca w stronę tej paletki
        let najblizsza = null;
        for (const k of kulki) {
          const leci = pal.strona === 1 ? k.vx > 0 : k.vx < 0;
          if (!leci) continue;
          if (!najblizsza || Math.abs(xPrzod - k.x) < Math.abs(xPrzod - najblizsza.x)) najblizsza = k;
        }
        this.cel = najblizsza
          ? przewidz(najblizsza, xPrzod, H) + this.przesuniecie
          : H / 2 + this.przesuniecie * 0.5; // piłka odchodzi – wracamy na środek
      }
      return this.cel;
    }
  }

  G.Komputer = Komputer;
  G.POZIOMY_AI = POZIOMY;
})();
