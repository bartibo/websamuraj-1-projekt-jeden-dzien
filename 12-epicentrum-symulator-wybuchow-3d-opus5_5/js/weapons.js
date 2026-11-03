// Arsenał: dane broni, opisy i sposób dostarczenia ładunku
(function () {
  const W = EP.weapons = [
    {
      id: 'dynamit', name: 'Laska dynamitu', short: 'Dynamit', group: 'conv', tnt: 0.2, crater: 0.55,
      delivery: 'fuse', icon: 'dyn',
      facts: [['Masa', '≈ 190 g'], ['Ładunek', 'nitrogliceryna w ziemi okrzemkowej'], ['Zapalnik', 'lont, ok. 1 cm/s']],
      desc: 'Wynalazek Alfreda Nobla z 1867 roku. Nitroglicerynę wchłoniętą przez porowatą ziemię okrzemkową można było wreszcie bezpiecznie przenosić. Jedna laska rozbija szyby w pobliskich oknach i zostawia płytki lej, ale budynku nie przewróci.'
    },
    {
      id: 'granat', name: 'Granat odłamkowy', short: 'Granat', group: 'conv', tnt: 0.18, crater: 0.45, frag: 15,
      delivery: 'throw', icon: 'gren',
      facts: [['Masa', '≈ 400 g'], ['Ładunek', '180 g kompozycji B'], ['Zapalnik', 'opóźniony, 4–5 s'], ['Odłamki', 'skuteczne do ok. 15 m']],
      desc: 'Siła samego wybuchu jest podobna do laski dynamitu, ale stalowy korpus rozpada się na setki odłamków lecących z prędkością ponad 1 km/s. To one, a nie fala uderzeniowa, są głównym zagrożeniem: dziurawią fasady i wybijają szyby kilkanaście metrów dalej.'
    },
    {
      id: 'czolg', name: 'Pocisk czołgowy 120 mm', short: 'Pocisk czołgowy', group: 'conv', tnt: 3, crater: 0.8,
      delivery: 'tank', icon: 'shell',
      facts: [['Kaliber', '120 mm, odłamkowo-burzący'], ['Ładunek', '≈ 3 kg materiału wybuchowego'], ['Prędkość', '≈ 900 m/s']],
      desc: 'Czołg wystrzeliwuje pocisk z odległości kilkuset metrów. Pocisk przelatuje tę drogę w ułamku sekundy, więc symulacja pokazuje strzał w zwolnionym tempie. Trafienie w ścianę wybija w niej wyrwę i wszystkie szyby w okolicy.'
    },
    {
      id: 'rpg', name: 'Granatnik przeciwpancerny RPG', short: 'Rakieta RPG', group: 'conv', tnt: 0.7, crater: 0.6, shaped: true,
      delivery: 'rpg', icon: 'rpg',
      facts: [['Głowica', 'kumulacyjna 85 mm'], ['Ładunek', '≈ 0,7 kg'], ['Prędkość', '≈ 120–300 m/s'], ['Przebijalność', '≈ 30 cm stali']],
      desc: 'Rakietowy granat z głowicą kumulacyjną. Wybuch formuje strumień metalu, który przebija pancerz, więc energia leci głównie do przodu, a fala uderzeniowa na boki jest słaba. Na budynku zostawia dziurę, ale nie burzy go.'
    },
    {
      id: 'hellfire', name: 'Pocisk rakietowy z drona', short: 'Rakieta z drona', group: 'conv', tnt: 9, crater: 0.85,
      delivery: 'drone', icon: 'missile',
      facts: [['Typ', 'powietrze–ziemia, kierowany laserowo'], ['Głowica', '≈ 9 kg'], ['Prędkość', '≈ 450 m/s'], ['Zasięg', 'do 8 km']],
      desc: 'Lekki pocisk kierowany odpalany z drona lub śmigłowca z wysokości kilku kilometrów. Zaprojektowany do precyzyjnego niszczenia pojazdu lub pojedynczego pomieszczenia, więc zniszczenia ograniczają się do kilkudziesięciu metrów.'
    },
    {
      id: 'grad', name: 'Salwa rakiet artyleryjskich', short: 'Salwa rakiet', group: 'conv', tnt: 6.4, crater: 0.9, salvo: 20,
      delivery: 'salvo', icon: 'salvo',
      facts: [['Wyrzutnia', 'wieloprowadnicowa 122 mm'], ['Rakiet w salwie', '20 (pół salwy)'], ['Głowica', '≈ 6,4 kg każda'], ['Rozrzut', 'kilkaset metrów']],
      desc: 'Niekierowane rakiety wystrzeliwane seriami z odległości kilkunastu kilometrów. Pojedyncza nie jest silna, ale spadają w dużym rozrzucie, jedna po drugiej, więc rażą całą dzielnicę naraz. Dokładność jest niewielka, to broń obszarowa.'
    },
    {
      id: 'tomahawk', name: 'Pocisk manewrujący', short: 'Pocisk manewrujący', group: 'conv', tnt: 450, crater: 0.9,
      delivery: 'cruise', icon: 'cruise',
      facts: [['Lot', 'nisko nad ziemią, ok. 880 km/h'], ['Głowica', '≈ 450 kg'], ['Zasięg', 'ponad 1500 km']],
      desc: 'Pocisk z silnikiem odrzutowym leci jak mały bezzałogowy samolot, kilkadziesiąt metrów nad ziemią, żeby ukryć się przed radarami. Tuż przed celem wznosi się i nurkuje. Głowica tej wielkości zawala budynek mieszkalny i wybija szyby w promieniu kilkuset metrów.'
    },
    {
      id: 'iskander', name: 'Rakieta balistyczna krótkiego zasięgu', short: 'Rakieta balistyczna', group: 'conv', tnt: 480, crater: 1.1,
      delivery: 'ballistic', icon: 'ballistic',
      facts: [['Prędkość w końcowej fazie', '≈ 2 km/s (Mach 6)'], ['Głowica', '≈ 480 kg'], ['Zasięg', 'do 500 km']],
      desc: 'Rakieta wylatuje ponad atmosferę i spada na cel prawie pionowo, kilka razy szybciej niż dźwięk. Huk przelotu dociera dopiero po wybuchu. Przy takiej prędkości głowica wbija się w ziemię i zostawia głęboki lej.'
    },
    {
      id: 'moab', name: 'Bomba lotnicza MOAB', short: 'MOAB', group: 'conv', tnt: 11000, crater: 0.5, groundHob: 2,
      delivery: 'bombfall', icon: 'bomb',
      facts: [['Masa', '9,8 t'], ['Ładunek', '8,5 t mieszaniny H6'], ['Równoważnik', '≈ 11 t TNT'], ['Długość', '9,2 m']],
      desc: 'Najsilniejsza bomba konwencjonalna użyta bojowo (2017). Zrzucana z samolotu transportowego, wybucha tuż nad ziemią. Burzy kwartał budynków, a słup dymu sięga kilkuset metrów. Mimo to jest ok. 1400 razy słabsza od bomby z Hiroszimy.'
    },
    {
      id: 'davy', name: 'Mini-atomówka Davy Crockett', short: 'Mini-atomówka', group: 'nuke', kt: 0.02, hob: 12, groundHob: 2,
      delivery: 'recoilless', icon: 'mini',
      facts: [['Głowica', 'W54, 23 kg'], ['Moc', '10–20 t TNT'], ['Zasięg działa', '2–4 km'], ['Lata', '1961–1971']],
      desc: 'Najmniejsza broń jądrowa w historii: głowica wielkości arbuza wystrzeliwana z działa bezodrzutowego przez trzyosobową obsługę. Fala uderzeniowa przypomina kilka bomb MOAB, a najgroźniejsze jest promieniowanie: śmiertelna dawka sięga ok. 350 m, dalej niż zniszczenia.'
    },
    {
      id: 'littleboy', name: 'Bomba atomowa „Little Boy”', short: 'Little Boy (Hiroszima)', group: 'nuke', kt: 15, hob: 580, groundHob: 2,
      delivery: 'bombhigh', icon: 'nuke',
      facts: [['Data', '6 sierpnia 1945, Hiroszima'], ['Moc', '≈ 15 kt TNT'], ['Wysokość wybuchu', '580 m'], ['Masa', '4,4 t, uran-235']],
      desc: 'Pierwsza bomba atomowa użyta w wojnie. Zdetonowana 580 m nad miastem: kula ognia miała ok. 370 m średnicy, a fala uderzeniowa zrównała z ziemią prawie wszystko w promieniu 1,5 km. Pożary wywołane błyskiem wybuchły, zanim dotarła fala.'
    },
    {
      id: 'w88', name: 'Głowica rakiety międzykontynentalnej', short: 'Głowica ICBM', group: 'nuke', kt: 475, hob: 1800, groundHob: 2,
      delivery: 'reentry', icon: 'icbm',
      facts: [['Typ', 'termojądrowa, z okrętu podwodnego'], ['Moc', '≈ 475 kt TNT'], ['Prędkość', '≈ 6 km/s przy wejściu w atmosferę'], ['Rakieta', 'nosi do 8–14 takich głowic']],
      desc: 'Współczesna głowica strategiczna, 30 razy silniejsza od bomby z Hiroszimy, a przy tym mniejsza od człowieka. Spada z przestrzeni kosmicznej w świecącym od gorąca stożku. Jedna wystarcza, żeby zniszczyć duże miasto.'
    },
    {
      id: 'car', name: 'Car-bomba (AN602)', short: 'Car-bomba', group: 'nuke', kt: 50000, hob: 4000, groundHob: 4,
      delivery: 'parachute', icon: 'tsar',
      facts: [['Data', '30 października 1961, Nowa Ziemia'], ['Moc', '≈ 50 Mt TNT'], ['Wysokość wybuchu', '4000 m'], ['Masa', '27 t, spadochron 800 kg']],
      desc: 'Najpotężniejszy wybuch wywołany przez człowieka, 3300 razy silniejszy od bomby z Hiroszimy. Bombę zrzucono na spadochronie, by samolot zdążył uciec. Kula ognia miała 8 km średnicy, grzyb urósł do 67 km, a szyby pękały w odległości 900 km.'
    }
  ];

  W.byId = (id) => W.find((w) => w.id === id);

  // Proste ikony SVG (sylwetki)
  const ic = {
    dyn: '<rect x="20" y="8" width="16" height="44" rx="4" fill="#d8402f"/><rect x="20" y="22" width="16" height="6" fill="#f2d16b"/><path d="M28 8 C28 2 36 2 40 4" stroke="#caa" stroke-width="2.5" fill="none"/><circle cx="41" cy="4" r="3.5" fill="#ffd34d"/>',
    gren: '<ellipse cx="30" cy="36" rx="14" ry="17" fill="#5f7a3a"/><path d="M18 30h24M18 40h24M30 19v34" stroke="#3f5326" stroke-width="2"/><rect x="25" y="12" width="10" height="8" rx="2" fill="#8b8f86"/><path d="M35 14 L46 26" stroke="#b8bcb2" stroke-width="3"/><circle cx="22" cy="12" r="4" stroke="#c9c9c9" stroke-width="2" fill="none"/>',
    shell: '<path d="M22 54V24 Q30 4 38 24V54z" fill="#b89b5e"/><rect x="21" y="44" width="18" height="4" fill="#8a6d3c"/><path d="M22 24 Q30 4 38 24z" fill="#6f7d46"/>',
    rpg: '<path d="M27 6 Q30 2 33 6 L35 22 H25z" fill="#6c7552"/><rect x="25" y="22" width="10" height="8" fill="#55603d"/><rect x="28" y="30" width="4" height="18" fill="#3c4228"/><path d="M28 46 L22 56 H38 L32 46z" fill="#3c4228"/>',
    missile: '<rect x="27" y="10" width="6" height="40" rx="3" fill="#cfd3d6"/><path d="M27 12 Q30 4 33 12z" fill="#e6c34d"/><path d="M27 20 L20 26 H27z M33 20 L40 26 H33z M27 44 L20 52 H27z M33 44 L40 52 H33z" fill="#9aa1a6"/>',
    salvo: '<g fill="#c6b48a"><rect x="12" y="16" width="5" height="34" rx="2.5"/><rect x="22" y="10" width="5" height="34" rx="2.5"/><rect x="32" y="14" width="5" height="34" rx="2.5"/><rect x="42" y="8" width="5" height="34" rx="2.5"/></g><g fill="#ff9e3d"><circle cx="14.5" cy="54" r="2.5"/><circle cx="24.5" cy="48" r="2.5"/><circle cx="34.5" cy="52" r="2.5"/><circle cx="44.5" cy="46" r="2.5"/></g>',
    cruise: '<rect x="8" y="27" width="44" height="7" rx="3.5" fill="#d7d9dc"/><path d="M52 27 Q58 30.5 52 34z" fill="#f2f2f2"/><path d="M26 30 L18 44 H22 L32 30z" fill="#9aa1a6"/><path d="M10 27 L6 18 H11 L15 27z" fill="#9aa1a6"/>',
    ballistic: '<path d="M30 4 Q36 14 36 24 V48 H24 V24 Q24 14 30 4z" fill="#d9dccf"/><path d="M24 40 L17 52 H24z M36 40 L43 52 H36z" fill="#7f8a6d"/><rect x="24" y="22" width="12" height="4" fill="#8b2d24"/><path d="M26 48 L30 58 L34 48z" fill="#ff9e3d"/>',
    bomb: '<ellipse cx="30" cy="28" rx="11" ry="20" fill="#5c6a52"/><rect x="25" y="46" width="10" height="6" fill="#4b5743"/><path d="M19 50 H41 M19 56 H41 M22 50 V56 M30 50 V56 M38 50 V56" stroke="#6f7c66" stroke-width="2.5"/><rect x="19" y="20" width="22" height="3" fill="#d8b64a"/>',
    mini: '<ellipse cx="30" cy="30" rx="13" ry="16" fill="#9aa27e"/><rect x="27" y="44" width="6" height="12" fill="#6f7656"/><path d="M22 52 L38 52" stroke="#6f7656" stroke-width="4"/><circle cx="30" cy="28" r="6" fill="none" stroke="#ffd34d" stroke-width="2.5"/><path d="M30 22 v12 M24 28 h12" stroke="#ffd34d" stroke-width="2.5"/>',
    nuke: '<path d="M30 8 C46 8 48 18 44 24 C52 24 52 34 44 34 H16 C8 34 8 24 16 24 C12 18 14 8 30 8z" fill="#f0a24a"/><path d="M25 34 Q27 46 22 56 H38 Q33 46 35 34z" fill="#c9784a"/><ellipse cx="30" cy="56" rx="16" ry="3" fill="#8a5a3c"/>',
    icbm: '<path d="M30 4 L38 30 Q30 36 22 30z" fill="#ffd9a0"/><path d="M30 4 L34 30 Q30 33 26 30z" fill="#fff4dc"/><path d="M26 33 L30 58 L34 33" fill="#ff8a3d" opacity=".75"/>',
    tsar: '<path d="M30 6 C50 6 54 16 50 22 C58 23 58 32 50 33 H10 C2 32 2 23 10 22 C6 16 10 6 30 6z" fill="#ff7a3d"/><path d="M30 10 C42 10 44 16 42 20 H18 C16 16 18 10 30 10z" fill="#ffc46b"/><path d="M24 33 Q26 46 20 56 H40 Q34 46 36 33z" fill="#d06a3a"/><ellipse cx="30" cy="56" rx="20" ry="3.5" fill="#8a4a2c"/>'
  };
  W.icon = (w) => '<svg viewBox="0 0 60 60" aria-hidden="true">' + (ic[w.icon] || '') + '</svg>';
})();
