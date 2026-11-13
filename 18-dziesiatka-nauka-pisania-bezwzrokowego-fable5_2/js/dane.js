/* Dziesiątka – dane: palce, układ klawiatury, lekcje, słownik, zdania i teksty */
(function () {
  'use strict';
  const G = typeof window !== 'undefined' ? window : globalThis;
  const DZ = G.DZ = G.DZ || {};

  /* ---------- Palce ---------- */
  // 0–3 lewa ręka (mały → wskazujący), 4 lewy kciuk, 5 prawy kciuk, 6–9 prawa ręka (wskazujący → mały)
  DZ.PALCE = [
    { nazwa: 'lewy mały', dop: 'lewym małym', reka: 'L' },
    { nazwa: 'lewy serdeczny', dop: 'lewym serdecznym', reka: 'L' },
    { nazwa: 'lewy środkowy', dop: 'lewym środkowym', reka: 'L' },
    { nazwa: 'lewy wskazujący', dop: 'lewym wskazującym', reka: 'L' },
    { nazwa: 'lewy kciuk', dop: 'lewym kciukiem', reka: 'L' },
    { nazwa: 'prawy kciuk', dop: 'prawym kciukiem', reka: 'P' },
    { nazwa: 'prawy wskazujący', dop: 'prawym wskazującym', reka: 'P' },
    { nazwa: 'prawy środkowy', dop: 'prawym środkowym', reka: 'P' },
    { nazwa: 'prawy serdeczny', dop: 'prawym serdecznym', reka: 'P' },
    { nazwa: 'prawy mały', dop: 'prawym małym', reka: 'P' }
  ];
  // Klawisz „domowy” każdego palca
  DZ.DOM = { 0: 'a', 1: 's', 2: 'd', 3: 'f', 6: 'j', 7: 'k', 8: 'l', 9: ';' };

  /* ---------- Układ klawiatury (polski programisty, QWERTY) ---------- */
  const KODY = { '`': 'Backquote', '-': 'Minus', '=': 'Equal', '[': 'BracketLeft', ']': 'BracketRight', '\\': 'Backslash', ';': 'Semicolon', "'": 'Quote', ',': 'Comma', '.': 'Period', '/': 'Slash' };
  const kod = z => /[a-z]/.test(z) ? 'Key' + z.toUpperCase() : /[0-9]/.test(z) ? 'Digit' + z : KODY[z];
  const zwykle = (male, duze, palce) => [...male].map((m, i) => ({ kod: kod(m), m, d: duze[i], p: +palce[i], w: 1 }));
  const spec = (k, etykieta, w, p) => ({ kod: k, etykieta, w, p, spec: true });

  DZ.UKLAD = [
    [...zwykle('`1234567890-=', '~!@#$%^&*()_+', '0012336678999'), spec('Backspace', '⌫', 2, 9)],
    [spec('Tab', 'Tab', 1.5, 0), ...zwykle('qwertyuiop[]\\', 'QWERTYUIOP{}|', '0123366789999')],
    [spec('CapsLock', 'Caps', 1.75, 0), ...zwykle("asdfghjkl;'", 'ASDFGHJKL:"', '01233667899'), spec('Enter', 'Enter', 2.25, 9)],
    [spec('ShiftLeft', 'Shift', 2.25, 0), ...zwykle('zxcvbnm,./', 'ZXCVBNM<>?', '0123366789'), spec('ShiftRight', 'Shift', 2.75, 9)],
    [spec('ControlLeft', 'Ctrl', 1.25, null), spec('MetaLeft', 'Win', 1.25, null), spec('AltLeft', 'Alt', 1.25, null),
      spec('Space', '', 6.25, 4), spec('AltRight', 'Alt', 1.25, 5), spec('MetaRight', 'Win', 1.25, null),
      spec('ContextMenu', '☰', 1.25, null), spec('ControlRight', 'Ctrl', 1.25, null)]
  ];

  DZ.ALTGR = { a: 'ą', c: 'ć', e: 'ę', l: 'ł', n: 'ń', o: 'ó', s: 'ś', x: 'ź', z: 'ż' };
  DZ.BAZA = {};
  for (const [b, p] of Object.entries(DZ.ALTGR)) { DZ.BAZA[p] = b; DZ.BAZA[p.toUpperCase()] = b.toUpperCase(); }

  // ZNAK[znak] = { kod, shift, alt, p }  ·  KLAWISZ[kod] = opis klawisza
  DZ.ZNAK = {}; DZ.KLAWISZ = {};
  for (const rzad of DZ.UKLAD) for (const k of rzad) {
    DZ.KLAWISZ[k.kod] = k;
    if (k.spec) continue;
    DZ.ZNAK[k.m] = { kod: k.kod, shift: false, alt: false, p: k.p };
    DZ.ZNAK[k.d] = { kod: k.kod, shift: true, alt: false, p: k.p };
    const pl = DZ.ALTGR[k.m];
    if (pl) {
      k.pl = pl;
      DZ.ZNAK[pl] = { kod: k.kod, shift: false, alt: true, p: k.p };
      DZ.ZNAK[pl.toUpperCase()] = { kod: k.kod, shift: true, alt: true, p: k.p };
    }
  }
  DZ.ZNAK[' '] = { kod: 'Space', shift: false, alt: false, p: 4 };

  DZ.LITERY = 'aąbcćdeęfghijklłmnńoóprsśtuwyzźż';      // 32 litery polskiego alfabetu
  DZ.LITERY_WSZYSTKIE = DZ.LITERY + 'qvx';              // + litery spoza alfabetu

  /* ---------- Kurs ---------- */
  DZ.ETAPY = [
    { nazwa: 'Rząd podstawowy', opis: 'Osiem klawiszy, na których palce odpoczywają. Stąd wyruszasz i tu zawsze wracasz.' },
    { nazwa: 'Rząd górny', opis: 'Palce sięgają w górę i wracają do bazy. Tu mieszka większość samogłosek.' },
    { nazwa: 'Rząd dolny', opis: 'Ruch w dół. Po tym etapie znasz wszystkie litery bez ogonków.' },
    { nazwa: 'Wielkie litery i interpunkcja', opis: 'Shift przeciwną ręką, kropki, przecinki i pierwsze pełne zdania.' },
    { nazwa: 'Polskie znaki', opis: 'Prawy Alt pod prawym kciukiem: ą, ć, ę, ł, ń, ó, ś, ź, ż.' },
    { nazwa: 'Cyfry i symbole', opis: 'Górny rząd cyfr, nawiasy, małpa i reszta znaków. Na koniec egzamin.' }
  ];

  const L = (id, etap, tytul, nowe, rada, typ) => ({ id, etap, tytul, nowe, rada, typ: typ || 'klawisze' });
  DZ.LEKCJE = [
    L('fj', 0, 'F i J: palce wskazujące', 'fj', 'Wyczuj palcami wskazującymi małe wypustki na klawiszach F i J. To Twoja baza. Spację naciskaj kciukiem, a wzrok trzymaj na ekranie – klawiatura poniżej pokaże, gdzie jest każdy klawisz.'),
    L('dk', 0, 'D i K: palce środkowe', 'dk', 'Palce środkowe leżą tuż obok wskazujących: lewy na D, prawy na K. Pozostałe palce nie odrywają się od swoich klawiszy.'),
    L('sl', 0, 'S i L: palce serdeczne', 'sl', 'Lewy serdeczny na S, prawy na L. Te palce są mniej samodzielne niż wskazujące, więc daj im czas i nie przyspieszaj na siłę.'),
    L('a;', 0, 'A i średnik: małe palce', 'a;', 'Lewy mały palec na A, prawy na średniku. Teraz każdy z ośmiu palców ma swoje miejsce: A S D F oraz J K L ;.'),
    L('gh', 0, 'G i H: sięgamy do środka', 'gh', 'Po G sięga lewy wskazujący (z F w prawo), po H prawy wskazujący (z J w lewo). Po naciśnięciu palec od razu wraca na wypustkę.'),
    L('p1', 0, 'Powtórka: cały rząd podstawowy', '', 'Wszystkie klawisze rzędu podstawowego razem. Pisz powoli i równo – jak metronom. Nie zerkaj na dłonie, nawet jeśli korci.', 'powtorka'),

    L('ei', 1, 'E i I: środkowe w górę', 'ei', 'E naciska lewy środkowy (z D w górę), I prawy środkowy (z K w górę). Palec idzie w górę i lekko w lewo, a potem wraca na miejsce.'),
    L('ru', 1, 'R i U: wskazujące w górę', 'ru', 'R to lewy wskazujący (nad F), U to prawy wskazujący (nad J). Reszta dłoni zostaje nad rzędem podstawowym.'),
    L('ty', 1, 'T i Y: w górę i do środka', 'ty', 'T (lewy wskazujący) i Y (prawy wskazujący) to dłuższe sięgnięcie w górę i do środka klawiatury. Y lubi uciekać – nie spiesz się.'),
    L('ow', 1, 'O i W: serdeczne w górę', 'ow', 'O naciska prawy serdeczny (nad L), W lewy serdeczny (nad S). Jeśli palec serdeczny ciągnie za sobą mały, to normalne – z czasem się rozdzielą.'),
    L('pq', 1, 'P i Q: małe palce w górę', 'pq', 'P to prawy mały palec, Q lewy mały. Q w polszczyźnie jest rzadkie, ale przyda się w adresach i obcych słowach.'),
    L('p2', 1, 'Powtórka: dwa rzędy', '', 'Rząd podstawowy i górny razem. Znasz już ponad połowę liter i wszystkie najczęstsze samogłoski.', 'powtorka'),

    L('nm', 2, 'N i M: prawy wskazujący w dół', 'nm', 'N leży w dół i w lewo od J, M w dół i lekko w prawo. Oba należą do prawego palca wskazującego.'),
    L('vb', 2, 'V i B: lewy wskazujący w dół', 'vb', 'V leży tuż pod F, B dalej w prawo – to najdalszy klawisz lewego wskazującego. V jest rzadkie, B bardzo częste.'),
    L('c,', 2, 'C i przecinek: środkowe w dół', 'c,', 'C naciska lewy środkowy (w dół od D), przecinek prawy środkowy (w dół od K). Po przecinku zawsze stawiaj spację.'),
    L('x.', 2, 'X i kropka: serdeczne w dół', 'x.', 'X to lewy serdeczny, kropka prawy serdeczny. Po kropce spacja, tak jak po przecinku.'),
    L('z', 2, 'Z: lewy mały palec w dół', 'z', 'Z leży w dół od A. W polszczyźnie Z jest wszędzie: sz, cz, rz, dz. Warto je dobrze opanować.'),
    L('p3', 2, 'Powtórka: wszystkie litery', '', 'Trzy rzędy i całe podstawowe abecadło. Od teraz możesz pisać prawdziwe słowa bez ogonków.', 'powtorka'),

    L('sl1', 3, 'Lewy Shift: wielkie litery prawej ręki', 'YUIOPHJKLNM', 'Wielką literę piszesz dwiema rękami. Gdy literę naciska prawa ręka, lewy mały palec przytrzymuje lewy Shift. Najpierw Shift, potem litera, i obie ręce wracają do bazy.'),
    L('sl2', 3, 'Prawy Shift: wielkie litery lewej ręki', 'QWERTASDFGZXCVB', 'Teraz odwrotnie: literę naciska lewa ręka, a prawy mały palec przytrzymuje prawy Shift. Nigdy nie rób Shiftu i litery tą samą ręką.'),
    L('zd1', 3, 'Pierwsze zdania', '', 'Wielka litera na początku, kropka na końcu, przecinki w środku. Pisz całymi słowami i nie zatrzymuj się po każdej literze.', 'zdania'),
    L('?!', 3, 'Pytajnik i wykrzyknik', '?!', 'Pytajnik to lewy Shift i klawisz obok prawego Shiftu (prawy mały palec). Wykrzyknik to prawy Shift i jedynka (lewy mały palec sięga daleko w górę).'),
    L('-:"', 3, 'Myślnik, dwukropek i cudzysłów', '-:"', 'Myślnik leży w rzędzie cyfr, na prawo od zera – sięga po niego prawy mały palec. Dwukropek to Shift i średnik, cudzysłów to Shift i klawisz obok średnika.'),

    L('ąę', 4, 'Ą i Ę', 'ąę', 'Prawy kciuk przytrzymuje prawy Alt (tuż obok spacji), a lewa ręka naciska A lub E. Kciuk puszcza Alt od razu po literze.'),
    L('ść', 4, 'Ś i Ć', 'ść', 'Prawy Alt z S daje Ś, z C daje Ć. Ruch kciuka jest ten sam, zmienia się tylko palec lewej ręki.'),
    L('żź', 4, 'Ż i Ź', 'żź', 'Ż to prawy Alt i Z, a Ź to prawy Alt i X. Łatwo je pomylić: „żaba” ma kropkę i jest na Z, „źrebak” ma kreskę i jest na X.'),
    L('łóń', 4, 'Ł, Ó i Ń', 'łóń', 'Tu litera i Alt są po tej samej stronie: prawy kciuk trzyma Alt, a prawa ręka naciska L, O albo N. Dłoń lekko się rozciąga – to w porządku.'),
    L('pl2', 4, 'Wielkie polskie litery', 'ŁŚŻĆŹÓ', 'Trzy klawisze naraz: Shift, prawy Alt i litera. Najczęściej przyda się Ł, Ś i Ż na początku zdań i nazw.'),
    L('zd2', 4, 'Polskie zdania', '', 'Pełne polskie zdania i przysłowia. Znasz już wszystkie litery – teraz liczy się płynność.', 'zdania'),

    L('15', 5, 'Cyfry 1–5: lewa ręka', '12345', 'Rząd cyfr jest daleko, więc dłoń lekko się unosi. 1 – mały palec, 2 – serdeczny, 3 – środkowy, 4 i 5 – wskazujący. Po cyfrze wróć na rząd podstawowy.'),
    L('60', 5, 'Cyfry 6–0: prawa ręka', '67890', '6 i 7 – prawy wskazujący, 8 – środkowy, 9 – serdeczny, 0 – mały palec. Szóstka jest najdalej – sięgaj spokojnie.'),
    L('(@', 5, 'Nawiasy, małpa i ukośnik', '()@/', 'Nawiasy to Shift z 9 i 0. Małpa to Shift i 2. Ukośnik leży obok prawego Shiftu i nie wymaga Shiftu.'),
    L('+%', 5, 'Plus, równa się, procent i reszta', '+=%_#', 'Równa się leży na prawo od myślnika, plus to ten sam klawisz z Shiftem. Procent to Shift i 5, podkreślnik to Shift i myślnik, a krzyżyk to Shift i 3.'),
    L('egz', 5, 'Egzamin końcowy', '', 'Wszystko naraz: litery, ogonki, wielkie litery, interpunkcja i cyfry. Bez pośpiechu – liczy się czysty tekst.', 'egzamin')
  ];

  /* ---------- Słownik ---------- */
  // Najczęstsze słowa (mniej więcej według częstości)
  DZ.CZESTE = (`i w nie na z to się że do jest o jak a po co tak ale za od tego już czy tylko jego przez ma tym go był może dla
jej ten ich być bardzo jeszcze by mnie mi tam kiedy też przy są sobie pan tu więc gdy teraz ja ci nas nawet lub pod które było jako
bez tej on ze który niż coś nic ona jednak te mu nad wszystko jeśli mój tych potem wtedy u aby mam gdzie raz jestem dlaczego bo no
ktoś także będzie zawsze dobrze można były kto sam nigdy ty we my przed wiem trzeba żeby czas chyba dwa roku lat jeden właśnie ją
nim miał nam im pani cię wie tutaj chce nasz razem trochę oni była albo człowiek życie świat praca dom ludzie rok sprawa miejsce
strona ręka słowo oko głowa droga dziecko kraj miasto woda ziemia głos twarz drzwi matka ojciec kobieta rzecz noc sposób koniec
prawda chwila godzina tydzień miesiąc serce myśl pytanie problem część światło dzień nowy stary dobry mały duży wielki pierwszy
ostatni inny każdy cały sama swoje moje twoje nasze wasze tyle kilka wiele mało dużo więcej mniej bardziej prawie około między
podczas według wśród obok wokół dzięki mimo oprócz zamiast ponieważ dlatego chociaż ani oraz czyli zatem natomiast wreszcie nagle
znowu ciągle często rzadko czasem zwykle dawno niedawno wcześnie późno dziś jutro wczoraj rano wieczorem stąd dokąd skąd kiedyś
nigdzie wszędzie gdzieś jakoś jakiś jakaś jakie taki taka takie ta tamten która czyj mam masz mamy macie mają jesteś jesteśmy będę
będziesz będziemy mogę możesz możemy chcę chcesz chcemy wiesz wiemy idę idziesz idzie idziemy robię robisz robi robimy mówię mówisz
mówi mówimy piszę piszesz pisze piszemy czytam czytasz czyta czytamy lubię lubisz lubi lubimy widzę widzisz widzi widzimy myślę
myślisz myśli myślimy znam znasz zna znamy daj weź chodź zobacz powiedz napisz spróbuj pamiętaj uważaj poczekaj byli miała mieli
zrobił zrobiła poszedł poszła wrócił wróciła`).split(/\s+/).filter(Boolean);

  const RESZTA = `mieć móc chcieć wiedzieć mówić robić iść dać wziąć widzieć myśleć stać znać lubić pisać czytać jeść pić spać grać biec
jechać nieść kupić sprzedać otworzyć zamknąć zacząć skończyć pytać odpowiadać słuchać patrzeć szukać znaleźć czekać pracować uczyć
pamiętać zapomnieć rozumieć pomagać prosić dziękować kochać śmiać płakać śpiewać tańczyć gotować sprzątać mieszkać wracać wychodzić
wchodzić siedzieć leżeć wstać biegać pływać latać rysować malować budować naprawiać liczyć mierzyć ważyć płacić dzwonić wysłać
odebrać spotkać powiedzieć zrobić zobaczyć usłyszeć poczuć dotknąć trzymać puścić rzucić złapać nosić ciągnąć pchać ćwiczyć
kot pies koń krowa koza owca kura kogut kaczka gęś ptak ryba mysz lis wilk niedźwiedź zając jeleń sowa orzeł bocian wróbel jaskółka
motyl pszczoła mrówka pająk żaba wąż żółw jeż wiewiórka słoń lew tygrys małpa żyrafa zebra foka delfin rekin drzewo las liść kwiat
trawa krzak korzeń gałąź sosna dąb brzoza klon róża tulipan mak słońce księżyc gwiazda niebo chmura deszcz śnieg wiatr burza mgła
tęcza mróz lód rzeka jezioro morze góra dolina pole łąka wyspa plaża brzeg kamień piasek ogień powietrze wiosna lato jesień zima
styczeń luty marzec kwiecień maj czerwiec lipiec sierpień wrzesień październik listopad grudzień poniedziałek wtorek środa czwartek
piątek sobota niedziela południe wieczór północ minuta sekunda kwadrans
mieszkanie pokój kuchnia łazienka sypialnia salon okno ściana podłoga sufit dach schody piwnica strych ogród balkon stół krzesło
łóżko szafa półka biurko fotel kanapa lampa dywan lustro obraz zegar klucz zamek kubek talerz łyżka widelec nóż garnek patelnia
szklanka butelka czajnik lodówka pralka piekarnik zlew kran ręcznik mydło szczotka grzebień poduszka koc kołdra firanka wazon
chleb bułka masło ser mleko jajko mięso szynka kiełbasa zupa ziemniak ryż makaron kasza sałata pomidor ogórek cebula czosnek
marchew kapusta burak papryka groszek fasola jabłko gruszka śliwka wiśnia truskawka malina jagoda cytryna pomarańcza banan
winogrono arbuz orzech miód cukier sól pieprz mąka olej ocet sok herbata kawa kakao ciasto tort lody czekolada cukierek obiad
śniadanie kolacja deser pierogi naleśnik kanapka sernik rosół
mama tata brat siostra babcia dziadek syn córka wujek ciocia kuzyn mąż żona rodzina przyjaciel kolega sąsiad gość chłopiec
dziewczyna mężczyzna nauczyciel uczeń student lekarz kierowca kucharz kelner sprzedawca rolnik żołnierz policjant strażak pilot
marynarz malarz muzyk aktor pisarz dziennikarz inżynier programista stolarz piekarz listonosz ogrodnik trener
włosy ucho nos usta ząb język szyja ramię dłoń palec kciuk łokieć nadgarstek plecy brzuch noga kolano stopa skóra kość krew
wieś ulica most plac rynek park szkoła sklep apteka szpital kościół kino teatr muzeum bank poczta dworzec lotnisko port hotel
restauracja kawiarnia biuro fabryka samochód autobus tramwaj pociąg rower samolot statek łódź taksówka metro bilet walizka plecak
mapa peron tory stacja skrzyżowanie chodnik
książka zeszyt długopis ołówek kartka papier tablica lekcja zadanie odpowiedź ocena egzamin nauka wiedza zdanie litera cyfra
liczba komputer klawiatura klawisz ekran myszka telefon internet program plik folder hasło wiadomość tekst zdjęcie film muzyka
piosenka gra zabawa sport piłka mecz drużyna bramka zwycięstwo trening rekord wynik tempo rytm
miłość przyjaźń radość smutek strach gniew nadzieja wiara szczęście zdrowie siła spokój cisza hałas kłamstwo błąd sukces porażka
cel plan pomysł marzenie sen pamięć uwaga zmiana początek środek powód skutek różnica przykład historia przyszłość przeszłość
natura kultura sztuka pieniądze cena wartość nawyk postęp cierpliwość dokładność szybkość
zły ładny brzydki wysoki niski długi krótki szeroki wąski gruby cienki ciężki lekki szybki wolny mocny słaby twardy miękki ciepły
zimny gorący chłodny suchy mokry czysty brudny jasny ciemny głośny cichy pełny pusty młody świeży słodki gorzki kwaśny słony ostry
tani drogi bogaty biedny mądry wesoły smutny miły spokojny ciekawy nudny ważny prosty trudny łatwy możliwy prawdziwy gotowy zajęty
otwarty zamknięty biały czarny czerwony zielony niebieski żółty brązowy szary różowy fioletowy pomarańczowy złoty srebrny
szybko wolno źle ładnie cicho głośno jasno ciemno ciepło zimno blisko daleko wysoko nisko prosto łatwo trudno mocno lekko osobno
naprawdę oczywiście pewnie raczej zupełnie całkiem dokładnie spokojnie powoli natychmiast zaraz wkrótce równo płynnie
zero trzy cztery pięć sześć siedem osiem dziewięć dziesięć sto tysiąc drugi trzeci połowa para
szyba szum szept szczyt płaszcz barszcz czapka oczy przerwa grzyb mucha ruch dzwon dźwięk dżem jeżdżę chrząszcz źródło źrebak
ćma świeca ślad śmiech ścieżka żart życzenie łapa łoś łuk ósmy ósemka gżegżółka pięść gwóźdź kość nić sieć ość paź wieś miś ryś
jak dla las sad dal hak gad jad gaj daj sala gala hala fala lada saga kasa alga gafa laska klasa flaga skala kajak salsa lala aha
lek klej kij liga figa aleja deska idea fale sale hale lisek kisiel alejka sklej siej dalej ile ale lisie deski laski kleik
rak rura fura rada radar rasa ruda gruda druk kurs dres ulga kula hura kra gra skra drugi druga rura kurka
tak tata styl ryk rysa syty kredyt tyle lata litera stara stary sytuacja ustawa dusza gitara kitel talia tulipany
okno oko woda sowa kowal worek rowek towar sto stok sok kok rok krok skok lot los losy tor tory port sport sort tort torty
pole pora pokaz poker piorun papier popis puls spis spokoju papuga pusty pusta opis opera opieka
noc nos nosy nuta mina mama mak maska masa moda mur mury mit most motor monety minuta rano ranek rama remont
baza bar bal balon bok bank banan buda but buty bieg biuro barwa brama bramka brat broda bukiet bilet obiad obraz obok dobra
cena cel cela cud cuda cyrk cytat koc kocyk noce owoce praca racja walec palec taniec koniec
auto auta autor euro ekran ekipa era etap etat fakt farba film firma forma fotel futro
zupa zima zamek zegar zysk zakup zadanie zasada zabawa zebra zero ziarno znak zapach zakaz zawody wiza faza waza koza
ogon ogrody okres osoba owad owoc opona order oliwa orkiestra ulica urlop uwaga ucho udany
hotel herb humor huta hala halo hymn historia wynik wyraz wybory wyspa wygoda wykres
jutro jeden jedna jazda jezioro jagody kajaki kajuta bajka fajka lejek olej klej raj kraj maj gaj
warto wzrok wzory wstyd wstaw wolny wolna wolne wiatry wieczory wioska widok winda wino wina wiara
dach duch ruch mech pech fach strach zapach brzuch groch orzech
miasto miasta mosty lasy domy koty psy okna pola morza rzeki drogi lata dni noce godziny minuty
mamy macie znamy znacie gramy gracie damy dacie wiemy wiecie jemy jecie robimy idziemy mamy
kolor kolory kolej koleje kolano kolacja komin konik kosz koszyk korek korona kontakt konto koperta kopia
talerz talent tablet taras tarcza temat teren termin test tekst teatr tempo torba towar tramwaj trasa trawa
wazon wagon walka walizka wanna wapno warta wesele wata weranda wiadro widelec wniosek
rower rodzina rozmowa rozum rura rynek rysunek rzeka robot rola rondo
lampa las lato lekarz lekcja lina linia lis list lista litera lody lotnisko lustro
bardzo dobry dobra dobre mocny mocna mocne prosty prosta proste pewny pewna pewne
kiedy tutaj teraz razem zawsze nigdy czasem potem zaraz dzisiaj wczoraj nawet tylko jeszcze znowu prawie bardzo
pisanie palce klawisze dokument notatka wersja projekt zadania raport spotkanie zakupy rachunek paragon umowa podpis
taxi fax box extra max mix lux xero index
veto vat video villa via vip volt nova viva quiz quad aqua quasi
poranek wieczorem latem zimowy letni morski nocny dzienny roczny stary nowy mocno jasno wolno szybko czysto pewnie`;

  const czysc = s => s.replace(/\?/g, '').toLowerCase();
  DZ.SLOWNIK = [...new Set([...DZ.CZESTE, ...RESZTA.split(/\s+/).map(czysc).filter(Boolean)])];

  DZ.IMIONA = `Adam Agata Ala Alicja Ania Antek Basia Bartek Celina Czarek Daria Darek Ela Ewa Filip Franek Gosia Hania Hubert Iga
Igor Jan Jola Julia Kasia Karol Kuba Lena Leon Magda Marek Marta Natalia Norbert Ola Olek Piotr Paula Robert Renata Sara Szymon
Tomek Tosia Ula Wiktor Wojtek Zosia Zenon Hela Irena Jurek Kinga Lidka Maja Nina Oskar Patryk Kamil Monika Iwona Jacek Urszula
Edyta Dorota Wanda Zbyszek Bogdan Cezary Fabian Gabriela Xawery Violetta Quentin Yvonne Tadek Stefan Roman Emil Daniel
Łukasz Łucja Żaneta Świętosław Ścibor Żaklina`.split(/\s+/);
  DZ.MIASTA = `Warszawa Lublin Katowice Gdynia Radom Kielce Olsztyn Opole Zakopane Sopot Koszalin Legnica Sanok Hel Jarocin Krosno
Mielec Nysa Ostrowiec Pruszcz Rybnik Siedlce Tczew Ustka Wadowice Zgierz Bytom Cieszyn Dukla Frombork Gniezno Iława Kutno
Malbork Tychy Kraków Łódź Wrocław Poznań Gdańsk Szczecin Bydgoszcz Białystok Toruń Rzeszów Płock Elbląg Tarnów Zamość Żywiec
Świnoujście Łomża Łeba Żory Śrem Ćmielów`.split(/\s+/);

  /* ---------- Zdania (tylko znaki, które da się wpisać z klawiatury) ---------- */
  DZ.ZDANIA = [
    // bez polskich znaków – do pierwszych lekcji ze zdaniami
    'Ala ma kota, a kot ma mleko.', 'Jutro rano jedziemy nad morze.', 'Tomek lubi zupy i makaron.', 'To jest nasz nowy dom.',
    'Kot pije mleko, a pies biega po ogrodzie.', 'Mama kupi chleb, ser i pomidory.', 'W lipcu lecimy do Rzymu.',
    'Marek gra na gitarze od roku.', 'Ewa pisze list do babci.', 'Dzisiaj pada deszcz i wieje wiatr.',
    'Nasz pies biega po parku i szczeka na ptaki.', 'Kasia czyta gazety w tramwaju.', 'Na stole stoi wazon z kwiatami.',
    'Dziadek opowiada stare historie o lesie.', 'Autobus do Krakowa jest pusty.', 'Zimna woda z cytryny i lodu gasi pragnienie.',
    'Adam naprawia stary rower taty.', 'Podaj mi ten zeszyt i czerwony pisak.', 'Lubimy spacery po lesie, po parku i nad jeziorem.',
    'Wieczorem gramy w karty i szachy.', 'Ola ma trzy koty i jednego psa.', 'Babcia piecze ciasto z rodzynkami.',
    'Na obiad jest zupa pomidorowa i ryba.', 'Stary zegar w kuchni tyka cicho i powoli.', 'Po pracy idziemy do kina na nowy film.',
    'Dobry plan to podstawa sukcesu.', 'Nauka pisania wymaga czasu i spokoju.', 'Trening czyni mistrza.',
    'Nie patrz na klawisze, patrz na ekran.', 'Rano pijemy sok i jemy kanapki z serem.', 'Statek odbija od brzegu i znika we mgle.',
    'Pilot spokojnie prowadzi samolot nad chmurami.', 'Kierowca autobusu zna wszystkie ulice w centrum.',
    'W ogrodzie kwitnie bez i pachnie trawa.', 'Wiatr porusza firanki w otwartym oknie.', 'Sklep na rogu ulicy prowadzi pan Karol.',
    'Zosia rysuje dom, drzewo i kolorowy parasol.', 'Kelner niesie herbaty i sernik do stolika przy oknie.',
    'Mecz trwa od godziny, a wynik jest bez zmian.', 'Poranek nad jeziorem jest cichy i spokojny.', 'Nowy komputer pracuje szybko i cicho.',
    'Listonosz przynosi paczki i listy przed obiadem.', 'Opowiedz mi o swojej pracy i planach na lato.',
    'Czerwony tramwaj jedzie wolno przez most.', 'Kupujemy bilety na koncert w parku.', 'Sowa siedzi na dachu i patrzy na pole.',
    'Marta ma dzisiaj urodziny i piecze tort z kremem.', 'Wracaj palcami na swoje miejsce.', 'Pisz wolno, ale bez przerw.',
    'Kto pisze spokojnie, ten pisze szybko.', 'Wzrok na ekranie, palce na klawiszach.', 'Jeden kwadrans dziennie to dobry start.',
    // pytajnik i wykrzyknik
    'Czy masz dzisiaj czas?', 'Kto zamyka drzwi?', 'Co jemy na obiad?', 'Gdzie jest moja czapka?', 'Kiedy wracasz do domu?',
    'Ile kosztuje ten rower?', 'Dlaczego nie odbierasz telefonu?', 'Uwaga, schody!', 'Brawo, to dobry wynik!',
    'Nie patrz na klawisze!', 'Dobra robota, tak trzymaj!', 'Stop, wracamy do bazy!', 'Jaki mamy dzisiaj plan?',
    'Hura, mamy nowy rekord!', 'Czy to na pewno dobry adres?', 'Ale pogoda, prawda?',
    // myślnik, dwukropek, cudzysłów
    'Trening jest prosty - siadasz i piszesz.', 'Dom to nie budynek - dom to ludzie.', 'To auto ma kolor zielono-niebieski.',
    'Prosty przepis: makaron, pomidory, czosnek i oliwa.', 'Tata pyta: "Kto idzie na spacer?"', 'Na drzwiach wisi kartka: "Zaraz wracam".',
    'Trener powtarza: "Najpierw technika, potem tempo".', 'Plan dnia: praca, obiad, spacer i trening.', 'Wynik jest jasny - wygrywa spokojny.',
    'Na kartce: chleb, mleko i jajka.',
    // z polskimi znakami
    'Dziś świeci słońce, więc idziemy na długi spacer.', 'Żółta łódź płynie wolno po spokojnym jeziorze.',
    'Pchnąć w tę łódź jeża lub ośm skrzyń fig.', 'Zażółć gęślą jaźń.', 'Mój brat uczy się grać na skrzypcach.',
    'Wieczorem obejrzymy film i zjemy pizzę.', 'Książka leży na półce obok starego zegara.',
    'Czy mógłbyś zamknąć okno, bo robi się chłodno?', 'Świeże bułki pachną w całej kuchni.',
    'Jutro wstanę wcześniej i pójdę pobiegać.', 'Źrebak biega po łące za swoją matką.', 'Dźwięk dzwonów niesie się nad miastem.',
    'Każdy dzień to nowa szansa, żeby nauczyć się czegoś ciekawego.', 'Pociąg do Gdańska odjeżdża z peronu trzeciego.',
    'Gżegżółka to dawna nazwa kukułki.', 'W czasie suszy szosa sucha.', 'Chrząszcz brzmi w trzcinie w Szczebrzeszynie.',
    'Stół z powyłamywanymi nogami.', 'Król Karol kupił królowej Karolinie korale koloru koralowego.',
    'Czy tata czyta cytaty Tacyta?', 'Cześć, co u ciebie słychać?', 'Dziękuję bardzo, wszystko w porządku.',
    'Przepraszam, która jest godzina?', 'Proszę usiąść i chwilę poczekać.', 'Ile kosztuje bilet do Wrocławia?',
    'Lubię zapach kawy o poranku.', 'Na łące kwitną maki, chabry i rumianki.', 'Śnieg skrzypi pod butami, a mróz szczypie w policzki.',
    'Wiosną ptaki wracają z ciepłych krajów.', 'Moja siostra mieszka w Łodzi i pracuje w szkole.',
    'Ćma krąży wokół lampy na werandzie.', 'Mały żółw powoli idzie w stronę wody.', 'Pamiętaj: najpierw dokładność, potem szybkość.',
    'Nie patrz na dłonie - one znają drogę.', 'Wróć palcami na rząd podstawowy po każdym słowie.',
    'Pisz równo i spokojnie, w rytmie miarowych kroków.', 'Błąd to nie porażka, tylko wskazówka, co ćwiczyć.',
    'Łatwiej biec, gdy zna się drogę na pamięć.', 'Zmęczone oczy odpoczną, gdy spojrzysz w dal.',
    'Prosta postawa i luźne ramiona to połowa sukcesu.', 'Zielona herbata, cytryna i miód pomagają na chłód.',
    'Sąsiad z góry codziennie ćwiczy grę na pianinie.', 'Tę książkę przeczytałam w jeden wieczór.',
    'Wąska ścieżka prowadzi przez las aż do rzeki.', 'Będę ćwiczyć codziennie, choćby przez kwadrans.',
    'Mąka, jajka, mleko i szczypta soli - tyle trzeba na naleśniki.', 'Zdążę na autobus, jeśli wyjdę za pięć minut.',
    'Kończę pracę o szesnastej i wracam do domu.', 'Idę do sklepu po mąkę i kaszę.', 'Mam zimne ręce, więc piję herbatę.',
    'Gęsi idą gęsiego.', 'Idą gęsi, a za nimi kaczki.', 'Mogę i chcę pisać czysto.', 'Będę pisać bez patrzenia na klawisze.', 'Mąż ma wąsy, a wąż ma zęby.',
    'Ręka rękę myje.', 'Piszę coraz pewniej i coraz czyściej.', 'Ćwiczę codziennie, więc robię postępy.',
    'Ścieżka przez las jest dziś sucha.', 'Część gości już wyszła, reszta jeszcze tańczy.', 'Różowe róże rosną przy starej wieży.',
    'Żaba siedzi na liściu i patrzy na księżyc.', 'Źródło bije u stóp góry.',
    'Może morze pomoże, a może nie pomoże.', 'Leży Jerzy na wieży i nie wierzy, że na drugiej wieży leży drugi Jerzy.'
  ];

  DZ.PRZYSLOWIA = [
    'Bez pracy nie ma kołaczy.', 'Co ma wisieć, nie utonie.', 'Gdzie kucharek sześć, tam nie ma co jeść.',
    'Kto rano wstaje, temu Pan Bóg daje.', 'Lepszy wróbel w garści niż gołąb na dachu.', 'Nie chwal dnia przed zachodem słońca.',
    'Nie od razu Kraków zbudowano.', 'Co dwie głowy, to nie jedna.', 'Darowanemu koniowi w zęby się nie zagląda.',
    'Jak sobie pościelesz, tak się wyśpisz.', 'Kropla drąży skałę.', 'Mądry Polak po szkodzie.',
    'Nie ma tego złego, co by na dobre nie wyszło.', 'Ćwiczenie czyni mistrza.', 'Czego Jaś się nie nauczy, tego Jan nie będzie umiał.',
    'Co się odwlecze, to nie uciecze.', 'Gdy kota nie ma, myszy harcują.', 'Kto pyta, nie błądzi.', 'Lepiej późno niż wcale.',
    'Apetyt rośnie w miarę jedzenia.', 'Cicha woda brzegi rwie.', 'Fortuna kołem się toczy.', 'Grosz do grosza, a będzie kokosza.',
    'Jaka praca, taka płaca.', 'Każdy jest kowalem swojego losu.', 'Kto pod kim dołki kopie, ten sam w nie wpada.',
    'Co kraj, to obyczaj.', 'Nie wszystko złoto, co się świeci.', 'Prawdziwych przyjaciół poznaje się w biedzie.',
    'Śpiesz się powoli.', 'Trafiło się ślepej kurze ziarno.', 'W zdrowym ciele zdrowy duch.',
    'Wszędzie dobrze, ale w domu najlepiej.', 'Z dużej chmury mały deszcz.', 'Co nagle, to po diable.', 'Dla chcącego nic trudnego.',
    'Pierwsze koty za płoty.', 'Mowa jest srebrem, a milczenie złotem.', 'Nie taki diabeł straszny, jak go malują.',
    'Niedaleko pada jabłko od jabłoni.', 'Punkt widzenia zależy od punktu siedzenia.', 'Gość w dom, Bóg w dom.',
    'Jedna jaskółka wiosny nie czyni.', 'Komu w drogę, temu czas.', 'Im dalej w las, tym więcej drzew.',
    'Kwiecień plecień, bo przeplata trochę zimy, trochę lata.', 'Na dwoje babka wróżyła.', 'Praktyka czyni mistrza.',
    'Uderz w stół, a nożyce się odezwą.', 'Lepiej zapobiegać, niż leczyć.', 'Kto się czubi, ten się lubi.', 'Czas to pieniądz.',
    'Co za dużo, to niezdrowo.', 'Nie mów hop, póki nie przeskoczysz.', 'Raz na wozie, raz pod wozem.',
    'Tonący brzytwy się chwyta.', 'Strach ma wielkie oczy.', 'Zgoda buduje, niezgoda rujnuje.', 'Jak cię widzą, tak cię piszą.',
    'Bez ryzyka nie ma zysku.', 'Koniec wieńczy dzieło.', 'Trening czyni mistrza.'
  ];

  /* ---------- Teksty do testów ---------- */
  DZ.TEKSTY = [
    'Pisanie bezwzrokowe to umiejętność, która zostaje z człowiekiem na całe życie. Na początku palce błądzą, a każde słowo wymaga skupienia. Po kilku tygodniach coś się jednak zmienia: przestajesz myśleć o klawiszach i zaczynasz myśleć o treści. Tekst pojawia się na ekranie niemal tak szybko, jak układa się w głowie. To właśnie ten moment jest nagrodą za cierpliwość.',
    'Poranek w górach zaczyna się od ciszy. Mgła leży jeszcze w dolinie, a szczyty powoli łapią pierwsze promienie słońca. W schronisku pachnie kawą i świeżym chlebem. Ktoś pakuje plecak, ktoś inny sprawdza mapę i prognozę pogody. Za godzinę na szlaku zrobi się gwarno, ale teraz słychać tylko wiatr i potok płynący między kamieniami.',
    'Dobra herbata wymaga czasu. Najpierw trzeba zagotować świeżą wodę i chwilę odczekać, żeby nie była zbyt gorąca. Potem wsypać liście do ogrzanego czajniczka i zalać je spokojnym ruchem. Kilka minut cierpliwości wystarczy, żeby napar nabrał koloru i zapachu. Pośpiech niczego tu nie przyspieszy, a może wszystko zepsuć. Podobnie jest z nauką nowych rzeczy.',
    'Stara biblioteka na rogu ulicy pamięta czasy, kiedy książki zamawiało się na papierowych rewersach. Dziś katalog jest w komputerze, ale zapach papieru i skrzypienie podłogi zostały takie same. W czytelni siedzą studenci, emeryci i dzieci po lekcjach. Każdy szuka czegoś innego: wiedzy, spokoju albo po prostu ciepłego miejsca w deszczowe popołudnie.',
    'Nawyk powstaje z powtórzeń. Kiedy robisz coś pierwszy raz, mózg musi pilnować każdego ruchu. Za setnym razem ruch wykonuje się niemal sam, a uwaga może zająć się czymś innym. Dlatego krótki trening każdego dnia daje więcej niż jedna długa sesja w tygodniu. Liczy się regularność, a nie wysiłek ponad siły. Piętnaście minut dziennie potrafi zdziałać cuda.',
    'Rynek w małym miasteczku budzi się wcześnie. Sprzedawcy rozkładają skrzynki z jabłkami, pomidorami i świeżym koperkiem. Piekarz wystawia kosze z bułkami, a obok ktoś sprzedaje miód z własnej pasieki. Stali klienci znają się od lat, więc zakupy trwają dłużej, niż powinny. Trzeba przecież zapytać o zdrowie, pogodę i o to, co słychać u wnuków.',
    'Rower to prosty wynalazek, który wciąż trudno pobić. Nie potrzebuje paliwa, nie stoi w korkach i mieści się w przedpokoju. Wystarczy trochę powietrza w oponach i odrobina smaru na łańcuchu. Jazda do pracy zajmuje często tyle samo czasu co samochodem, a po drodze można zobaczyć miasto z zupełnie innej strony. No i nikt nie narzeka na brak ruchu.',
    'Jesień przychodzi po cichu. Najpierw poranki robią się chłodniejsze, potem liście klonów zmieniają kolor na żółty i czerwony. W parku pachnie wilgotną ziemią, a pod nogami szeleszczą kasztany. Dni są krótsze, więc wieczorem chętniej sięgamy po koc, książkę i kubek czegoś ciepłego. To dobra pora, żeby zwolnić i nadrobić zaległości w czytaniu.',
    'Dobry stolarz najpierw mierzy, a dopiero potem tnie. Zna swoje narzędzia tak dobrze, że nie musi na nie patrzeć. Dłonie same wiedzą, jak prowadzić strug i gdzie przyłożyć dłuto. Taka pewność nie bierze się z talentu, tylko z tysięcy spokojnych powtórzeń. Z klawiaturą jest podobnie: najpierw dokładność, potem płynność, a szybkość przychodzi na końcu sama.',
    'Wieczorem port powoli cichnie. Kutry wracają z połowu, mewy krążą nad nabrzeżem, a rybacy rozplątują sieci. Latarnia morska zapala światło, które widać z daleka. Turyści siadają na ławkach i patrzą, jak słońce chowa się za horyzontem. Morze zmienia kolor z niebieskiego na złoty, potem na granatowy. Jutro wszystko zacznie się od nowa.',
    'List pisany ręcznie ma w sobie coś, czego nie zastąpi żadna wiadomość w telefonie. Widać w nim pośpiech albo spokój, wahanie albo pewność. Mimo to większość słów zapisujemy dziś na klawiaturze. Warto więc robić to wygodnie i bez wysiłku. Kiedy palce znają drogę, pisanie przestaje być przeszkodą i znów staje się rozmową.',
    'Kuchnia babci była najważniejszym miejscem w domu. Na piecu zawsze stał garnek z zupą, a na parapecie rosły zioła w glinianych doniczkach. Babcia nie używała wagi ani przepisów. Wszystko odmierzała na oko i jakimś cudem zawsze wychodziło idealnie. Dziś próbuję odtworzyć jej pierogi i wciąż czegoś mi brakuje. Może po prostu jej cierpliwości.',
    'Muzyk ćwiczy gamy, sportowiec rozgrzewkę, a osoba ucząca się pisania proste układy liter. Te ćwiczenia bywają nudne, ale budują fundament. Bez nich trudniejsze utwory brzmią nierówno, a szybkie teksty pełne są pomyłek. Dlatego nie warto przeskakiwać etapów. Lepiej napisać wolno i czysto, niż szybko i z błędami, które potem trzeba poprawiać.',
    'Las po deszczu pachnie najpiękniej. Krople wody wiszą na igłach sosen i błyszczą w słońcu jak szkło. Mech jest miękki i ciemnozielony, a między paprociami pojawiają się pierwsze grzyby. Gdzieś wysoko stuka dzięcioł. Wystarczy stanąć na chwilę bez ruchu, żeby usłyszeć, ile życia kryje się w tej pozornej ciszy.',
    'Podróż pociągiem ma swój rytm. Koła stukają równo, za oknem przesuwają się pola, lasy i małe stacje. Można czytać, patrzeć w dal albo po prostu nic nie robić. Nikt nie wymaga od pasażera pośpiechu. Dopiero na dworcu docelowym wraca gwar i zegar znów zaczyna rządzić dniem. Może dlatego tak wielu ludzi lubi długie trasy.',
    'Programista spędza przy klawiaturze większość dnia. Pisze kod, wiadomości, notatki i dokumentację. Każda literówka może oznaczać błąd, którego szukanie zajmie godzinę. Nic dziwnego, że doświadczone osoby dbają o technikę pisania tak samo, jak o wygodne krzesło. Dobre nawyki oszczędzają czas, nadgarstki i nerwy.',
    'Zima w mieście bywa szara, ale ma też swoje uroki. Po pierwszym śniegu ulice na chwilę cichną, a światła latarni odbijają się w białych dachach. Dzieci ciągną sanki na górkę w parku, dorośli narzekają na korki. W kawiarniach paruje gorąca czekolada. Wystarczy ciepły szalik i dobre buty, żeby spacer w mroźny wieczór stał się przyjemnością.',
    'Ogród uczy cierpliwości. Nasiona wsadzone do ziemi w kwietniu długo nie dają znaku życia. Potem pojawia się pierwszy listek, drugi, trzeci, a w lipcu trudno uwierzyć, że to ta sama grządka. Nie da się przyspieszyć wzrostu, można tylko podlewać, pielić i czekać. Każda umiejętność rośnie w ten sam sposób: powoli, ale pewnie.',
    'Dobre miejsce do pracy nie musi być duże. Wystarczy stabilne biurko, krzesło z oparciem i ekran ustawiony na wysokości oczu. Łokcie powinny być zgięte mniej więcej pod kątem prostym, a nadgarstki unosić się lekko nad klawiaturą. Co pół godziny warto wstać, rozprostować plecy i spojrzeć w dal. Ciało odwdzięczy się za taką troskę.',
    'Na targu staroci można znaleźć wszystko. Zegarki, które od dawna nie chodzą, porcelanowe filiżanki bez spodków, mapy krajów, których już nie ma. Stara maszyna do pisania stoi między lampą a patefonem. Jej klawisze stawiają opór i głośno stukają, ale układ liter jest ten sam co w nowym laptopie. Pewne rzeczy zmieniają się wolniej, niż myślimy.'
  ];

  /* ---------- Fragmenty z cyframi i symbolami ---------- */
  DZ.FRAGMENTY = [
    'ola@example.com', 'jan.nowak@example.org', 'biuro@example.com', 'kontakt@example.pl', '(tak)', '(nie)', '(patrz strona 12)',
    '(wersja 2)', 'tak/nie', 'km/h', 'i/lub', '1/2', '3/4', '24/7', '50%', '100%', '20% rabatu', '7% w skali roku', '2+2=4',
    '3+4=7', '10+15=25', 'a+b=c', 'x=10', 'y=2x+1', 'plik_nowy', 'moje_notatki', 'wersja_2', 'raport_2024', '#praca', '#nauka',
    '#trening', '#1', 'pokój 12 (parter)', 'tel. 123 456 789', 'kod 00-950', 'godz. 15:30', 'sala 204', 'strona 7/20',
    '(10%)', '5+5=10', '@ola', 'cena: 49,99', 'razem = 120', 'zadanie_1', '#lista (3/5)', '90% + 10% = 100%'
  ];

  DZ.POZIOMY = [
    { od: 0, nazwa: 'Początki' }, { od: 80, nazwa: 'Rozruch' }, { od: 120, nazwa: 'Sprawne palce' },
    { od: 160, nazwa: 'Biegłość' }, { od: 220, nazwa: 'Szybkie pisanie' }, { od: 300, nazwa: 'Mistrzostwo' }
  ];
})();
