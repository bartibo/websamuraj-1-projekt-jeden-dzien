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
      delivery: 'reentry', icon: 'icbm', mirvOpts: [1, 3, 8],
      facts: [['Typ', 'termojądrowa, z okrętu podwodnego'], ['Moc', '≈ 475 kt TNT'], ['Prędkość', '≈ 6 km/s przy wejściu w atmosferę'], ['Rakieta', 'nosi do 8–14 takich głowic']],
      desc: 'Współczesna głowica strategiczna, 30 razy silniejsza od bomby z Hiroszimy, a przy tym mniejsza od człowieka. Spada z przestrzeni kosmicznej w świecącym od gorąca stożku. Jedna wystarcza, żeby zniszczyć duże miasto.'
    },
    {
      id: 'car', name: 'Car-bomba (AN602)', short: 'Car-bomba', group: 'nuke', kt: 50000, hob: 4000, groundHob: 4,
      delivery: 'parachute', icon: 'tsar',
      facts: [['Data', '30 października 1961, Nowa Ziemia'], ['Moc', '≈ 50 Mt TNT'], ['Wysokość wybuchu', '4000 m'], ['Masa', '27 t, spadochron 800 kg']],
      desc: 'Najpotężniejszy wybuch wywołany przez człowieka, 3300 razy silniejszy od bomby z Hiroszimy. Bombę zrzucono na spadochronie, by samolot zdążył uciec. Kula ognia miała 8 km średnicy, grzyb urósł do 67 km, a szyby pękały w odległości 900 km.'
    },
    {
      id: 'bejrut', name: 'Wybuch w porcie w Bejrucie', short: 'Port w Bejrucie', group: 'hist', tnt: 800000, crater: 0.68, groundHob: 3,
      delivery: 'warehouse', icon: 'warehouse', wilson: true, cloudCol: [0.56, 0.3, 0.2],
      facts: [['Data', '4 sierpnia 2020, Liban'], ['Ładunek', '2750 t saletry amonowej'], ['Równoważnik', '0,5–1,1 kt TNT (tu 0,8 kt)'], ['Lej', 'ok. 140 m średnicy']],
      desc: 'Jeden z najsilniejszych wybuchów niejądrowych w historii. Saletra amonowa leżała latami w portowym magazynie. Najpierw wybuchł pożar i składowane obok fajerwerki, po kilkudziesięciu sekundach zdetonował cały ładunek. Falę otoczyła biała kopuła kondensacji, szyby pękały w większości miasta, a rudy dym to tlenki azotu.'
    },
    {
      id: 'czelabinsk', name: 'Meteor czelabiński', short: 'Meteor czelabiński', group: 'hist', kt: 500, hob: 27000, cosmic: true,
      delivery: 'meteor', entry: 18, speed: 19000, icon: 'meteor',
      facts: [['Data', '15 lutego 2013, Rosja'], ['Obiekt', 'kamienna planetoida, ok. 19 m'], ['Prędkość', '≈ 19 km/s'], ['Rozpad', '25–30 km nad ziemią'], ['Moc', '≈ 400–500 kt TNT']],
      desc: 'Planetoida weszła w atmosferę pod małym kątem i rozpadła się ok. 27 km nad ziemią, rozbłyskując jaśniej niż Słońce. Energia była 30 razy większa niż w Hiroszimie, ale do ziemi doszła już słaba fala: po ok. 2 minutach wybiła szyby w tysiącach budynków, a szkło zraniło ok. 1500 osób. Naprawdę rozbłysk nastąpił ok. 40 km od miasta, tu nad wskazanym celem.'
    },
    // ---------- UDERZENIA Z KOSMOSU: od Tunguski po Chicxulub (od najmniejszego krateru) ----------
    // Energie: szacunki skalowane średnicą krateru (Barringer ok. 10 Mt, Chicxulub ok. 100 mln Mt).
    {
      id: 'tunguska', name: 'Katastrofa tunguska', short: 'Tunguska', group: 'impact', kt: 12000, hob: 8000, cosmic: true,
      delivery: 'meteor', entry: 35, speed: 15000, icon: 'tunguska', era: '1908',
      facts: [['Data', '30 czerwca 1908, Syberia'], ['Obiekt', 'planetoida lub kometa, 50–60 m'], ['Wysokość wybuchu', '5–10 km'], ['Moc', '3–15 Mt TNT (tu 12 Mt)'], ['Krater', 'brak, rozbłysk w powietrzu'], ['Skutki', '2150 km² powalonej tajgi']],
      desc: 'Ciało kosmiczne eksplodowało kilka kilometrów nad tajgą i nie doleciało do ziemi, więc nie zostawiło krateru. Fala powaliła ok. 80 milionów drzew ułożonych promieniście od epicentrum, a żar podpalił las. Huk słyszano 1000 km dalej. Nad miastem zniszczyłby wszystko w promieniu kilkunastu kilometrów.'
    },
    {
      id: 'barringer', name: 'Krater Barringera (Meteor Crater)', short: 'Krater Barringera', group: 'impact', kt: 1e4, cosmic: true, impact: true,
      craterD: 1200, dia: 50, speed: 12800, entry: 45, iron: true, delivery: 'meteor', icon: 'crater', era: '50 tys. lat temu',
      facts: [['Kiedy', 'ok. 50 tys. lat temu, Arizona (USA)'], ['Planetoida', 'żelazna, ok. 50 m'], ['Prędkość', 'ok. 13 km/s'], ['Krater', '1,2 km średnicy, 170 m głębokości'], ['Moc', 'ok. 10 Mt TNT']],
      desc: 'Najlepiej zachowany krater uderzeniowy na Ziemi. Żelazna bryła wielkości kamienicy przeleciała przez atmosferę prawie w całości i w kilka sekund wyrzuciła ok. 175 mln ton skał, a wał wokół krateru do dziś wznosi się 45 m nad równiną. Właśnie tu udowodniono, że takie kratery robią ciała z kosmosu, a nie wulkany.'
    },
    {
      id: 'lonar', name: 'Krater Lonar', short: 'Lonar', group: 'impact', kt: 4e4, cosmic: true, impact: true,
      craterD: 1880, dia: 80, speed: 20000, entry: 40, delivery: 'meteor', icon: 'crater', era: '570 tys. lat temu',
      facts: [['Kiedy', 'ok. 570 tys. lat temu, Indie'], ['Planetoida', 'kamienna, ok. 80 m (szac.)'], ['Krater', '1,9 km w bazalcie, 150 m głębokości'], ['Moc', 'ok. 40 Mt TNT (szac.)']],
      desc: 'Jeden z niewielu kraterów wybitych w bazalcie, takim samym jak na Księżycu i Marsie, więc badają go planetolodzy. Na dnie leży słone, zasadowe jezioro, które w 2020 r. w kilka dni zabarwiło się na różowo od mikroorganizmów. Uderzenie było prawie tak silne jak Car-bomba.'
    },
    {
      id: 'pingualuit', name: 'Krater Pingualuit', short: 'Pingualuit', group: 'impact', kt: 3e5, cosmic: true, impact: true,
      craterD: 3440, dia: 160, speed: 20000, entry: 45, delivery: 'meteor', icon: 'crater', era: '1,4 mln lat temu',
      facts: [['Kiedy', 'ok. 1,4 mln lat temu, Kanada'], ['Planetoida', 'ok. 160 m (szac.)'], ['Krater', '3,4 km, jezioro głębokie na 267 m'], ['Moc', 'ok. 300 Mt TNT (szac.)']],
      desc: 'Prawie idealnie okrągły krater w granicie kanadyjskiej tundry. Wypełnia go jezioro zasilane tylko deszczem i śniegiem, z wodą tak przejrzystą, że widać na 35 m w głąb. Inuici nazywają je Kryształowym Okiem Nunaviku. Lądolód przesuwał się nad nim wiele razy, a krater przetrwał.'
    },
    {
      id: 'bosumtwi', name: 'Krater Bosumtwi', short: 'Bosumtwi', group: 'impact', kt: 1.1e7, cosmic: true, impact: true,
      craterD: 10500, dia: 500, speed: 20000, entry: 30, delivery: 'meteor', icon: 'crater', era: '1,07 mln lat temu',
      facts: [['Kiedy', 'ok. 1,07 mln lat temu, Ghana'], ['Planetoida', 'ok. 0,5 km (szac.)'], ['Krater', '10,5 km, z centralnym wzniesieniem'], ['Moc', 'ok. 11 tys. Mt TNT (szac.)']],
      desc: 'Krater w lasach Ghany z jedynym naturalnym jeziorem w kraju, świętym dla ludu Aszanti. To już krater złożony: ściany osunęły się tarasami, a środek dna się wypiętrzył. Stopione skały spadły jako szkliste krople (tektyty) aż na terenie dzisiejszego Wybrzeża Kości Słoniowej. Całe miasto z makiety zmieściłoby się w nim z zapasem.'
    },
    {
      id: 'ries', name: 'Krater Ries', short: 'Ries', group: 'impact', kt: 1.5e8, cosmic: true, impact: true,
      craterD: 24000, dia: 1300, speed: 20000, entry: 40, delivery: 'meteor', icon: 'crater', era: '14,8 mln lat temu',
      facts: [['Kiedy', 'ok. 14,8 mln lat temu, Bawaria'], ['Planetoida', 'ok. 1,3 km (szac.)'], ['Krater', '24 km, w środku miasto Nördlingen'], ['Moc', 'ok. 150 tys. Mt TNT (szac.)']],
      desc: 'W kraterze stoi dziś średniowieczne Nördlingen, a jego kościół zbudowano z suewitu, skały powstałej w uderzeniu, pełnej drobniutkich diamentów. Stopione skały poleciały ponad 200 km na wschód i spadły w Czechach jako zielone szkło: mołdawity. Przed lotem na Księżyc trenowali tu astronauci misji Apollo 14.'
    },
    {
      id: 'chesapeake', name: 'Krater zatoki Chesapeake', short: 'Chesapeake', group: 'impact', kt: 8e8, cosmic: true, impact: true,
      craterD: 40000, dia: 2200, speed: 20000, entry: 45, delivery: 'meteor', icon: 'crater', era: '35,5 mln lat temu',
      facts: [['Kiedy', 'ok. 35,5 mln lat temu, USA'], ['Planetoida', 'ok. 2–3 km'], ['Krater', 'ok. 40 km, pod zatoką Chesapeake'], ['Moc', 'ok. 800 tys. Mt TNT (szac.)']],
      desc: 'Planetoida spadła do płytkiego morza u wybrzeży dzisiejszej Wirginii, a krater odkryto dopiero w latach 90., zakopany pod osadami zatoki. Do dziś wpływa na życie regionu: rzeki skręcają wzdłuż jego brzegu, a pod ziemią zostało słone morze sprzed milionów lat. Tutaj uderzenie trafia w ląd.'
    },
    {
      id: 'siljan', name: 'Pierścień Siljan', short: 'Siljan', group: 'impact', kt: 1.9e9, cosmic: true, impact: true,
      craterD: 52000, dia: 3000, speed: 20000, entry: 45, delivery: 'meteor', icon: 'crater', era: '380 mln lat temu',
      facts: [['Kiedy', 'ok. 380 mln lat temu (dewon), Szwecja'], ['Planetoida', 'ok. 3–4 km'], ['Krater', 'ok. 52 km, największy w Europie'], ['Moc', 'ok. 1,9 mln Mt TNT (szac.)']],
      desc: 'Największy krater w Europie, w szwedzkiej Dalarnie. Przez prawie 380 mln lat erozja zdarła jego wał, a po kraterze został pierścień jezior wokół wyniesionego środka, widoczny z kosmosu. Uderzenie przypadło na dewon, gdy pierwsze czworonogi wychodziły z wody na ląd.'
    },
    {
      id: 'morokweng', name: 'Krater Morokweng', short: 'Morokweng', group: 'impact', kt: 4.9e9, cosmic: true, impact: true,
      craterD: 70000, dia: 4000, speed: 20000, entry: 45, delivery: 'meteor', icon: 'crater', era: '145 mln lat temu',
      facts: [['Kiedy', 'ok. 145 mln lat temu (koniec jury), RPA'], ['Planetoida', 'ok. 4–5 km'], ['Krater', 'ok. 70 km, pod piaskami Kalahari'], ['Moc', 'ok. 4,9 mln Mt TNT (szac.)']],
      desc: 'Krater ukryty pod piaskami Kalahari, znany tylko z wierceń i pomiarów grawitacji. W 2006 r. w rdzeniu z głębokości ok. 770 m znaleziono kawałek samej planetoidy, 25 cm skały, która przetrwała uderzenie. To niezwykła rzadkość: zwykle ciało kosmiczne prawie całe odparowuje.'
    },
    {
      id: 'manicouagan', name: 'Krater Manicouagan', short: 'Manicouagan', group: 'impact', kt: 9e9, cosmic: true, impact: true,
      craterD: 85000, dia: 5000, speed: 20000, entry: 45, delivery: 'meteor', icon: 'crater', era: '214 mln lat temu',
      facts: [['Kiedy', 'ok. 214 mln lat temu (trias), Kanada'], ['Planetoida', 'ok. 5 km'], ['Krater', 'ok. 85 km, z pierścieniem jeziora'], ['Moc', 'ok. 9 mln Mt TNT (szac.)']],
      desc: '„Oko Quebecu”: pierścień jeziora o średnicy 70 km otacza wyspę René-Levasseur, wypiętrzone dno krateru. Z orbity wygląda jak tarcza strzelnicza. Planetoida spadła w triasie, gdy żyły pierwsze dinozaury, a wszystkie lądy tworzyły jeszcze jeden kontynent, Pangeę.'
    },
    {
      id: 'popigai', name: 'Krater Popigaj', short: 'Popigaj', group: 'impact', kt: 1.5e10, cosmic: true, impact: true,
      craterD: 100000, dia: 6000, speed: 20000, entry: 45, delivery: 'meteor', icon: 'crater', era: '35,7 mln lat temu',
      facts: [['Kiedy', 'ok. 35,7 mln lat temu, Syberia'], ['Planetoida', 'ok. 5–8 km'], ['Krater', 'ok. 100 km, z pierścieniem szczytów'], ['Moc', 'ok. 15 mln Mt TNT (szac.)']],
      desc: 'Uderzenie w skały z grafitem w ułamku sekundy zamieniło go w diamenty. Pod syberyjską tajgą leżą ich biliony karatów, więcej niż we wszystkich kopalniach świata, choć są za drobne na biżuterię. Popigaj i Chesapeake powstały w odstępie zaledwie kilkuset tysięcy lat.'
    },
    {
      id: 'chicxulub', name: 'Chicxulub: koniec dinozaurów', short: 'Chicxulub', group: 'impact', kt: 1e11, cosmic: true, impact: true,
      craterD: 180000, dia: 11000, speed: 20000, entry: 60, delivery: 'meteor', icon: 'dino', era: '66 mln lat temu',
      facts: [['Kiedy', '66 mln lat temu, Jukatan (Meksyk)'], ['Planetoida', 'ok. 10 km, pod kątem ok. 60°'], ['Prędkość', 'ok. 20 km/s'], ['Krater', 'ok. 180 km, z pierścieniem szczytów'], ['Moc', 'ok. 100 mln Mt TNT'], ['Skutki', 'wymarło ok. 75% gatunków']],
      desc: 'Planetoida większa, niż Mount Everest jest wysoki, uderzyła w płytkie morze. W kilka minut powstał lej głęboki na ok. 30 km, a jego dno wystrzeliło wyżej niż Himalaje i opadło, tworząc pierścień szczytów. Wyrzucone skały wracały z kosmosu jako rozżarzone meteory i podpalały lasy na całym świecie, a pył i sadza zasłoniły Słońce na lata. Zginęły wszystkie dinozaury poza ptakami.'
    },
    {
      id: 'custom', name: 'Własny ładunek', short: 'Własny ładunek', group: 'custom', custom: true, icon: 'custom',
      ck: 'chem', clog: 3, chob: -1, crater: 0.9, groundHob: 2, facts: [], desc: ''
    }
  ];

  // Własny ładunek: moc z suwaka (log10 kg TNT), rodzaj i wysokość wybuchu
  const REF = [
    [0.2, 'laska dynamitu'], [3, 'pocisk czołgowy'], [450, 'pocisk manewrujący'], [11000, 'bomba MOAB'],
    [8e5, 'wybuch w Bejrucie'], [1.5e7, 'bomba z Hiroszimy'], [2.1e7, 'bomba z Nagasaki'], [4.75e8, 'głowica ICBM'],
    [5e8, 'meteor czelabiński'], [1.2e10, 'katastrofa tunguska'], [1.5e10, 'Castle Bravo (największy test USA)'], [5e10, 'Car-bomba']
  ];
  W.optHob = (kt) => Math.round(215 * Math.cbrt(kt));
  W.applyCustom = function (w) {
    const kg = Math.pow(10, w.clog);
    const nuke = w.ck === 'nuke';
    delete w.kt; delete w.tnt; delete w.hob;
    if (nuke) {
      w.kt = kg / 1e6;
      w.hob = w.chob < 0 ? W.optHob(w.kt) : w.chob;
      w.delivery = 'nukedrop';
    } else {
      w.tnt = kg;
      w.delivery = 'charge';
    }
    w.group = 'custom';
    let best = REF[0], bd = 1e9;
    for (const r of REF) { const d = Math.abs(Math.log10(r[0] / kg)); if (d < bd) { bd = d; best = r; } }
    const ratio = kg / best[0];
    const k = ratio > 1 ? ratio : 1 / ratio;
    const near = bd < 0.04 ? 'tyle co ' + best[1] : EP.util.num(k, k < 10 ? 1 : 0) + '× ' + (ratio > 1 ? 'więcej' : 'mniej') + ' niż ' + best[1];
    w.facts = [['Rodzaj', nuke ? 'jądrowy' : 'chemiczny (trotyl)'], ['Porównanie', near]];
    if (nuke) w.facts.push(['Wysokość', w.hob < 5 ? 'przy ziemi' : EP.util.dist(w.hob) + (w.chob < 0 ? ' (optymalna)' : '')]);
    w.desc = nuke
      ? 'Ustaw dowolną moc i wysokość wybuchu. Wysokość optymalna to taka, przy której fala o nadciśnieniu ok. 35 kPa obejmuje największy obszar. Wybuch przy ziemi daje krater i opad promieniotwórczy.'
      : 'Ustaw dowolną masę trotylu, od petardy po kilotonę. Wybuchy chemiczne nie dają błysku cieplnego ani promieniowania, ich siłą jest sama fala uderzeniowa i odłamki.';
  };
  W.applyCustom(W[W.length - 1]);

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
    warehouse: '<path d="M8 30 L30 16 L52 30 V54 H8z" fill="#8b8f86"/><rect x="14" y="36" width="32" height="18" fill="#5d615a"/><path d="M14 40H46M14 45H46M14 50H46" stroke="#73776f" stroke-width="1.5"/><path d="M40 16 Q36 8 42 4 Q40 10 46 10 Q50 14 44 18z" fill="#ff8a3d"/><circle cx="24" cy="10" r="5" fill="#b07a62" opacity=".8"/><circle cx="31" cy="7" r="4" fill="#c49478" opacity=".7"/>',
    meteor: '<path d="M10 8 L40 40" stroke="#ffd9a0" stroke-width="6" stroke-linecap="round" opacity=".45"/><path d="M18 14 L40 40" stroke="#fff4dc" stroke-width="3" stroke-linecap="round"/><circle cx="42" cy="42" r="8" fill="#fff4dc"/><circle cx="42" cy="42" r="12" fill="#ffb347" opacity=".35"/>',
    tunguska: '<g stroke="#7a5a3a" stroke-width="3" stroke-linecap="round"><path d="M30 46 L10 52"/><path d="M30 46 L50 52"/><path d="M30 46 L14 38"/><path d="M30 46 L46 38"/><path d="M30 46 L30 30"/></g><circle cx="30" cy="16" r="9" fill="#ffd9a0"/><circle cx="30" cy="16" r="14" fill="#ff9e3d" opacity=".3"/>',
    crater: '<ellipse cx="30" cy="42" rx="25" ry="10" fill="#8a6f52"/><ellipse cx="30" cy="42" rx="17" ry="6.5" fill="#3b2f26"/><ellipse cx="30" cy="44" rx="10" ry="3.2" fill="#ff7a2a" opacity=".85"/><path d="M8 6 L24 30" stroke="#ffd9a0" stroke-width="5" stroke-linecap="round" opacity=".5"/><circle cx="25" cy="31" r="4.5" fill="#fff4dc"/>',
    dino: '<path d="M8 6 L22 22" stroke="#ffd9a0" stroke-width="5" stroke-linecap="round" opacity=".5"/><circle cx="23" cy="23" r="5" fill="#fff4dc"/><circle cx="23" cy="23" r="9" fill="#ff9e3d" opacity=".3"/><path d="M6 50 C10 42 20 40 28 41 C31 34 34 25 40 21 C43 19 47 21 45 24 C41 27 39 34 38 42 C44 43 50 46 56 52 C50 50 44 48 39 48 L39 55 H35 V49 H27 V55 H23 V48 C17 48 11 50 6 50z" fill="#8c9a62"/>',
    custom: '<circle cx="30" cy="30" r="20" fill="none" stroke="#9aa3ad" stroke-width="3"/><path d="M30 30 L42 18" stroke="#ffd23f" stroke-width="4" stroke-linecap="round"/><circle cx="30" cy="30" r="4" fill="#ffd23f"/><path d="M14 38 A18 18 0 0 1 14 22" stroke="#4dc6ff" stroke-width="3" fill="none"/><path d="M46 22 A18 18 0 0 1 46 38" stroke="#ff3b30" stroke-width="3" fill="none"/>',
    tsar: '<path d="M30 6 C50 6 54 16 50 22 C58 23 58 32 50 33 H10 C2 32 2 23 10 22 C6 16 10 6 30 6z" fill="#ff7a3d"/><path d="M30 10 C42 10 44 16 42 20 H18 C16 16 18 10 30 10z" fill="#ffc46b"/><path d="M24 33 Q26 46 20 56 H40 Q34 46 36 33z" fill="#d06a3a"/><ellipse cx="30" cy="56" rx="20" ry="3.5" fill="#8a4a2c"/>'
  };
  W.icon = (w) => '<svg viewBox="0 0 60 60" aria-hidden="true">' + (ic[w.icon] || '') + '</svg>';
})();
