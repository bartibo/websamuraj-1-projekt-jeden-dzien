# Epicentrum

Symulator wybuchów na makiecie miasta 3D. Do wyboru 13 ładunków (a po rozwoju także port w Bejrucie, meteor czelabiński, 12 uderzeń z kosmosu od katastrofy tunguskiej po Chicxulub i własny ładunek), od **laski dynamitu** (200 g trotylu), przez granat, pocisk czołgowy, pięć rodzajów rakiet i bombę MOAB, po broń jądrową: mini-atomówkę Davy Crockett, bombę z Hiroszimy, głowicę rakiety międzykontynentalnej i **Car-bombę** (50 Mt). Car-bomba jest 250 miliardów razy silniejsza od dynamitu, więc jedna makieta musi działać w skali od centymetrów do setek kilometrów. Fala uderzeniowa liczona fizycznie wybija szyby okno po oknie, burzy budynki, przewraca drzewa i samochody, a błysk wybuchu jądrowego podpala miasto, zanim fala w ogóle do niego dotrze.

## Jak powstał

Dzień 12 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** wtorek, 03.11.2026, godz. 07:48
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 50 minut
- **Poprawki:** brak. Po prompcie nie było żadnej kolejnej wiadomości dotyczącej projektu (późniejsza prośba o wrzucenie na GitHub nie zmieniała kodu)
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz symulator wybuchów różnych przedmiotów od dynamitu, przez granat, pocisk czołgowy, rakietę (różne typy) oraz małą bombę atomową i największą bombę wodorową (car bomba) - wybuch w środowisku miasta 3D a efekty wybuchów widoczne na budynkach makiety miasta i okolic. 
> Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Strona otworzy się w przeglądarce (najlepiej Chrome lub Edge z kartą graficzną).
Nie trzeba niczego instalować ani budować. Three.js leży w folderze `lib/`, a dźwięki są syntezowane na żywo, więc całość działa bez internetu.

## Co jest w środku

**Makieta.** Miasto o średnicy ok. 6 km: śródmieście z wieżowcami i biurowcami, kwartały kamienic z podwórzami, osiedla bloków, domki jednorodzinne, strefa przemysłowa z halami, kominami i zbiornikami, wieża telewizyjna, parki, rzeka z mostami, ok. 3 tys. zaparkowanych samochodów i tysiące drzew. Dookoła okolica do 400 km: pola, lasy (prawdziwe drzewa do 9 km od centrum), jeziora, autostrady, wsie z kościołami, wzgórza i góry na horyzoncie. Razem ok. 20 tys. budynków i 60 tys. drzew.

**Arsenał:**

| Ładunek | Równoważnik TNT | Jak dociera do celu |
|---|---|---|
| Laska dynamitu | 200 g | lont się pali 3 s, iskry |
| Granat odłamkowy | 180 g | rzucony łukiem, toczy się, setki odłamków |
| Pocisk czołgowy 120 mm | 3 kg | czołg na ulicy celuje i strzela (zwolnione tempo) |
| Granatnik RPG | 0,7 kg | rakieta z dymem, głowica kumulacyjna |
| Rakieta z drona | 9 kg | nadlatuje z wysokości ponad kilometra |
| Salwa rakiet | 20 × 6,4 kg | 20 rakiet spada w rozrzucie, jedna po drugiej |
| Pocisk manewrujący | 450 kg | lot nisko nad dachami, wznoszenie i nurkowanie |
| Rakieta balistyczna | 480 kg | spada prawie pionowo z prędkością Mach 6 |
| Bomba MOAB | 11 t | zrzut z samolotu |
| Mini-atomówka Davy Crockett | 20 t | wystrzał z działa bezodrzutowego |
| Little Boy (Hiroszima) | 15 kt | spada z wysokości, wybuch 580 m nad ziemią |
| Głowica ICBM | 475 kt (1, 3 albo 8 głowic) | świecące głowice wchodzą w atmosferę jedna po drugiej, w rozrzucie wokół celu |
| Car-bomba | 50 Mt | opada na spadochronie, wybuch na 4 km |
| Port w Bejrucie (2020) | 0,8 kt | pożar magazynu i fajerwerków, potem detonacja saletry |
| Meteor czelabiński (2013) | 500 kt | wejście w atmosferę pod kątem 18°, rozbłysk 27 km nad ziemią |
| Własny ładunek | 100 g – 100 Mt | skrzynka z zapalnikiem albo bomba jądrowa o dowolnej wysokości wybuchu |

**Meteoryty** (osobna zakładka, od najmniejszego krateru do największego; energie to szacunki):

| Uderzenie | Kiedy | Krater | Równoważnik TNT |
|---|---|---|---|
| Katastrofa tunguska | 1908 | brak, rozbłysk 8 km nad ziemią | 12 Mt |
| Krater Barringera (Arizona) | ok. 50 tys. lat temu | 1,2 km, misa | ok. 10 Mt |
| Lonar (Indie) | ok. 570 tys. lat temu | 1,9 km, w bazalcie | ok. 40 Mt |
| Pingualuit (Kanada) | ok. 1,4 mln lat temu | 3,4 km | ok. 300 Mt |
| Bosumtwi (Ghana) | ok. 1,07 mln lat temu | 10,5 km, centralne wzniesienie | ok. 11 tys. Mt |
| Ries (Bawaria) | ok. 14,8 mln lat temu | 24 km | ok. 150 tys. Mt |
| Zatoka Chesapeake (USA) | ok. 35,5 mln lat temu | ok. 40 km | ok. 800 tys. Mt |
| Siljan (Szwecja) | ok. 380 mln lat temu | ok. 52 km, pierścień szczytów | ok. 1,9 mln Mt |
| Morokweng (RPA) | ok. 145 mln lat temu | ok. 70 km | ok. 4,9 mln Mt |
| Manicouagan (Kanada) | ok. 214 mln lat temu | ok. 85 km | ok. 9 mln Mt |
| Popigaj (Syberia) | ok. 35,7 mln lat temu | ok. 100 km | ok. 15 mln Mt |
| Chicxulub (Jukatan) | 66 mln lat temu | ok. 180 km | ok. 100 mln Mt |

Bomby jądrowe można zdetonować w powietrzu (na historycznej wysokości) albo przy ziemi: wtedy fala sięga mniej daleko, ale powstaje krater i strefa opadu promieniotwórczego niesiona wiatrem.

**Wybór celu.** Kliknięcie w ulicę, dach, ścianę, las albo wieś ustawia cel. Po wybraniu broni kamera sama dobiera kadr: przy dynamicie stoi kilka metrów od laski, przy Car-bombie oddala się na 100 km.

**Co widać po wybuchu:**
- kula ognia, która przy wybuchach jądrowych wznosi się i zamienia w grzyb (cząsteczki krążą w pierścieniu wirowym, rośnie trzon i podstawa z pyłu),
- czoło fali uderzeniowej jako przezroczysta kopuła, ściana pyłu przy ziemi i chmura kondensacyjna (chmura Wilsona),
- szyby pękają okno po oknie dokładnie tam, dokąd doszła fala, a odłamki granatu dziurawią fasady,
- budynki zapadają się, przechylają i sypią gruzem w zależności od konstrukcji, a w wysokich budynkach mocna fala wyrywa fragmenty fasady,
- samochody są odrzucane i lądują na boku albo na dachu,
- drzewa padają promieniście od wybuchu (jak w Tunguskiej puszczy w 1908 r.), z daleka widać powalone i spalone lasy,
- żar wybuchu jądrowego zwęgla ściany zwrócone ku kuli ognia i trawę, budynki płoną od dołu, a nocą żarzą się pogorzeliska,
- leje, osmalenia, zeszklona ziemia pod kulą ognia Car-bomby,
- błysk oślepia ekran i rozświetla niebo, nocą miasto gaśnie (zanik zasilania).

**Czas.** Tempo dobiera się samo: wybuch dynamitu trwa ułamek sekundy, więc pokazuje się w zwolnieniu 20 razy, a grzyb Car-bomby rośnie 9 minut, więc pokazuje się w przyspieszeniu ok. 25 razy. Na pasku na dole można to przestawić (pauza, 0,05×, ¼×, 1×, 5×, 25×). **Huk słychać dopiero wtedy, gdy fala dotrze do kamery**, więc przy dużych wybuchach najpierw jest błysk, a dźwięk przychodzi po kilku sekundach.

**Panele.** Po prawej zasięgi skutków (rysowane też na makiecie jako pierścienie z podpisami) i raport na żywo: zawalone i uszkodzone budynki, szyby, pożary, drzewa, samochody i szacunkowe ofiary wśród mieszkańców makiety. Po najechaniu kursorem na dowolne miejsce widać odległość od epicentrum, nadciśnienie, czas dotarcia fali i jej skutek. Pora dnia: dzień, zmierzch, noc.

## Rozwój po eksperymencie

03.11.2026 projekt ocenili czterej agenci (`ocena-ux`, `ocena-design`, `ocena-optymalizacja`, `rozwoj-produktu`) na komputerze i telefonie. Wnioski: UX 6,5/10, wygląd 6,5/10 (interfejs 7,5, efekty 5,5), wydajność 5/10. Kula ognia wyglądała jak twarda bryła, grzyb jak łososiowa wata, dym MOAB jak atrament, fala Car-bomby jak bańka mydlana, a wybite szyby zamieniały wieżowce w czarne monolity. Pierwsze strzały w domyślnym miejscu dawały w raporcie same zera, bomb jądrowych nie było widać na liście, Car-bomba niszczyła miasto pod białym błyskiem, a na telefonie wybuch chował się za panelem. Drzewa liczyły w każdym wierzchołku wszystkie wybuchy, więc po salwie było 18–20 kl/s. Wdrożone zmiany:

- **Nowe możliwości:**
  - **Świadek** (`O`): kamera staje na ulicy albo dachu na wysokości oczu i patrzy na cel. Panel pokazuje odliczanie do fali, nadciśnienie, żar i to, co grozi człowiekowi w tym miejscu. Fala przychodzi z hukiem, wstrząsem i pyłem przelatującym przez kadr, a wzrok sam podnosi się za grzybem.
  - **Laboratorium:** własny ładunek chemiczny (100 g – 1 kt) albo jądrowy (10 t – 100 Mt) z suwakiem wysokości wybuchu i zaznaczoną wysokością optymalną. Karta podaje, do czego ten wybuch jest podobny.
  - **Katastrofy i kosmos:** port w Bejrucie z białą kopułą kondensacji i rudym dymem, meteor czelabiński (rozbłysk tak wysoko, że do ziemi dochodzi fala wybijająca tylko szyby, po ok. 2 minutach) i katastrofa tunguska (las powalony na kilkunastu kilometrach). Wybuchy kosmiczne nie mają promieniowania, opadu ani grzyba.
  - **Warunki:** wiatr (cisza, słaby, silny, 8 kierunków) niesie dym, grzyb, opad i pożary. Mgła ogranicza widoczność i tłumi żar wybuchu jądrowego.
  - **Powtórka** (`Z`), **zdjęcie kadru** do pliku PNG i **link do scenariusza** (broń, cel, wysokość, pora dnia, pogoda w adresie).
  - **Karta „Co dalej?”** po wygaśnięciu fali: jeszcze raz, jako świadek, silniejszy ładunek, inne miejsce.
  - **Skutki, które trwają:** pożary przechodzą na sąsiednie budynki (łatwiej z wiatrem i między domami), raport liczy je osobno. Prąd gaśnie tylko tam, dokąd doszła niszcząca fala, potem kaskadą dalej. Zawalone budynki zostawiają hałdy gruzu w kolorze ścian.
- **Efekty:**
  - Obraz przechodzi przez własną obróbkę (`js/post.js`): poświata jasnych miejsc, załamanie światła na czole fali uderzeniowej, drgające gorące powietrze nad kulą ognia, promienie światła od błysku, lekka aberracja przy wstrząsie, winieta. Wygładzanie krawędzi robi bufor z MSAA.
  - Kula ognia kłębiasta, z miękkim brzegiem, poświatą i migoczącymi płomieniami na obrzeżu. Grzyb ma światłocień, ciemny spód, żar tylko we wnętrzu, cieńszy trzon u góry, czapę kondensacyjną i podświetlenie od pożarów nocą. Dym wybuchów konwencjonalnych jest szary w dwóch odcieniach. Płonące odłamki ciągną smugi ognia i dymu.
  - Kopuła fali gaśnie po wyjściu z kuli ognia, a zamiast niej po ziemi biegnie jasny pas pyłu. Za wybitymi szybami widać wnętrza, a części szyb są popękane. Okna płonących budynków migoczą, nad nimi osiada sadza, płomienie buchają też z fasad.
  - Łuna pożarów: płonące kwartały oświetlają ulice, ściany i dym od dołu. Noc jest jaśniejsza, więc widać, jak gaśnie miasto.
- **Obsługa:**
  - Na starcie MOAB nad kwartałem kamienic, więc pierwszy strzał daje wyraźne skutki. Arsenał ma zakładki (konwencjonalne, jądrowe, katastrofy, laboratorium), więc wszystko widać bez przewijania.
  - Podgląd przed strzałem liczy zawalenia tą samą funkcją co wynik. Szyby liczą się także od najbliższej ściany.
  - Przy wielkich wybuchach jądrowych fala przechodzi przez miasto co najmniej kilka sekund, a błysk z daleka jest słabszy. Kamera szuka kąta, z którego wieżowce nie zasłaniają wybuchu, i nie kręci się bez końca.
  - Telefon: panel zwija się po odpaleniu, kadr przesuwa się nad panel, osobny układ poziomy, większe przyciski, lżejsze tła. Etykiety pierścieni rozłożone pod różnymi kątami, kula ognia na biało. Ikony SVG, fokus klawiatury, ciemne paski przewijania.
  - Odbudowa w trakcie lotu sprząta pocisk. Ustawienia (pora dnia, dźwięk, pierścienie, kamera, pogoda) zostają w przeglądarce. `prefers-reduced-motion` słabszy błysk i bez wstrząsu. Car-bomba ma klawisz `]`, a Backspace nie burzy już miasta. Link „← Wszystkie projekty”, tagi `og:` (obrazek `galeria/projekt-12.jpg` dojdzie razem ze stroną główną).
- **Wydajność:** drzewa liczą stan raz na wybuch na procesorze, a shader odtwarza tylko przewracanie w rytm czoła fali. Prostsze bryły drzew w kaflach 2 km z odrzucaniem poza kadrem i cieniem. Cień przeliczany tylko, gdy coś się rusza. Zakończone wybuchy liczą falę tylko w zasięgu kilku kPa, a dalekie sloty są pomijane. Shadery efektów kompilują się przy starcie, modele pocisków zwalniają geometrię. Rozdzielczość sama się obniża na słabym sprzęcie. Po salwie 60 kl/s zamiast 18–20 (RTX 5060 Ti, 1600×900).

## Rozwój po eksperymencie: runda 2

03.11.2026, trzy rzeczy, których brakowało po pierwszej rundzie:

- **Rozpad budynków piętro po piętrze.** Wysoki budynek (ponad ok. 26 m) po zawaleniu składa się od góry skokami, coraz szybciej, jak przy swobodnym spadku: wieżowiec 300 m pada ok. 11 s. Przy każdym piętrze z obrysu buchają kłęby pyłu i odpadają płyty elewacji, a elewacja stoi do końca, z poszarpanym frontem gruzu schodzącym od góry. Na koniec fala pyłu rozlewa się nisko ulicami, najszybciej wzdłuż nich.
- **Kilka głowic z jednej rakiety (MIRV).** Głowica ICBM ma przełącznik 1 / 3 / 8. Głowice spadają jedna po drugiej w rozrzucie wzdłuż kierunku nadlotu, punkty celowania widać na makiecie jako czerwone kółka, a raport sumuje skutki wszystkich. Przy kilku grzybach naraz każdy dostaje mniej cząstek, żeby starczyło dla wszystkich.
- **Porównanie dwóch ładunków.** W panelu zasięgów (albo klawiszem `C`) wybiera się drugi ładunek. Jego zasięgi rysują się kropkami wokół tego samego celu, z podpisami, a tabela pokazuje oba ładunki obok siebie: szyby, domy, zawalenia, ciężkie zniszczenia, oparzenia, kula ognia, obszar zawaleń i ile razy jeden jest silniejszy. Porównanie trafia też do linku.

## Rozwój po eksperymencie: runda 3

04.11.2026, dwie rzeczy:

- **12 uderzeń meteorytów, od Tunguski po Chicxulub.** Nowa zakładka „Meteoryty”. Planetoida wpada w atmosferę w prawdziwej skali (od 50 m do 11 km), a po uderzeniu krater powstaje na oczach: najpierw głęboki lej (ok. 1/3 średnicy) z kurtyną skał wylatujących pod kątem ok. 45°, potem ściany osuwają się tarasami, a w dużych kraterach dno wystrzeliwuje ponad teren i opada w centralne wzniesienie (Bosumtwi, Ries) albo pierścień szczytów (Siljan, Chicxulub). Budynki w leju znikają, tuż za wałem zasypują je wyrzucone skały, a skały spadające coraz dalej zostawiają jasne promieniste smugi. Na dnie żarzą się stopione skały. Wstrząs (magnituda do ok. 10) dociera przed falą w powietrzu, z pomrukiem i drżeniem kamery. Panel podaje średnicę i głębokość krateru, czas powstawania, magnitudę i to, ile razy uderzenie jest silniejsze od Car-bomby. Katastrofa tunguska przeszła do tej zakładki, a w „Katastrofach” zostały Bejrut i Czelabińsk.
- **Bieg świadkiem po ulicach.** W widoku świadka `W` `A` `S` `D` albo strzałki to bieg (5 m/s), `Shift` to sprint (8,5 m/s), na telefonie joystick w rogu ekranu. Świadek omija budynki, nie wchodzi do rzeki (poza mostami), wchodzi tylko na niskie stopnie, spada z dachu, gdy zejdzie z krawędzi albo budynek pod nim się zawali, i zjeżdża do krateru. Słychać kroki, głowa lekko się kołysze. Odliczanie do fali liczy się na bieżąco z miejsca, w którym świadek jest, a gdy biegnie, czas płynie najwyżej normalnie, więc ucieczkę przed falą widać uczciwie.
- Poprawka: zakładki arsenału naprawdę chowają ładunki z innych grup (wcześniej lista pokazywała wszystkie).

## Fizyka

- **Nadciśnienie**: wzór Kinneya–Grahama w funkcji odległości skalowanej Z = R / W^(1/3) (skalowanie Hopkinsona–Cranza). Wybuchy przy ziemi mają masę zwiększoną o odbicie od gruntu, a jądrowe w powietrzu także o wzmocnienie fali Macha (wynik zgodny z tablicami dla Hiroszimy: 35 kPa ok. 1,3 km od epicentrum).
- **Prędkość czoła fali** z równań Rankine'a–Hugoniota, scałkowana do tablicy czasu dotarcia: blisko wybuchu fala biegnie kilka razy szybciej niż dźwięk, daleko zwalnia do 343 m/s.
- **Promieniowanie cieplne**: 35% energii wybuchu jądrowego, słabnące z kwadratem odległości i pochłaniane przez powietrze, z progami oparzeń i zapłonu.
- **Kula ognia, krater, chmura, promieniowanie początkowe**: przybliżenia skalowania z „The Effects of Nuclear Weapons” (Glasstone i Dolan) i pomiarów wybuchów konwencjonalnych.
- **Wytrzymałość**: każdy typ budynku ma własne progi (np. dom ok. 30 kPa do zawalenia, blok ok. 70 kPa, wieżowiec ze stali ok. 115 kPa), a szyby pękają przy 3–9 kPa. Nadciśnienie działające na budynek to mediana z pięciu punktów jego bryły, więc mały ładunek przy wielkim wieżowcu nie przewróci go, tylko zniszczy fasadę.

- **Wybuchy kosmiczne** (Czelabińsk, Tunguska): 30% energii jako żar, fala jak przy wybuchu w powietrzu, bez promieniowania i opadu.
- **Pogoda**: przejrzystość powietrza zmienia drogę tłumienia żaru (80 km w czystym powietrzu, 22 km w zamgleniu, 5 km we mgle). Wiatr wydłuża albo skraca strefę opadu i niesie pożary.
- **Uderzenia planetoid** (Melosh, „Impact Cratering”; Collins, Melosh i Marcus 2005, Earth Impact Effects Program): kula ognia ok. 0,002 · E^(1/3) m, świeci tylko ok. 0,3% energii. Lej przejściowy ma głębokość ok. 1/3 średnicy i powstaje w ok. 0,8 · √(D/g) s, potem przez ok. 1,6 tego czasu zapada się do kształtu końcowego. Kratery poniżej 4 km zostają misą (głębokość ok. 0,18 średnicy), większe mają płaskie dno ok. 0,25 · D^0,4 km i centralne wzniesienie, a powyżej 40 km pierścień szczytów. Magnituda wstrząsu M = 0,67 · log E − 5,87, słabnąca z odległością. Fala w powietrzu jak przy wybuchu przy ziemi o tej samej energii. Profil krateru liczy ta sama funkcja na procesorze (chodzenie, wybór celu, gruz) i w shaderze.
- **Wysokość optymalna** własnego ładunku: ok. 215 m × (moc w kt)^(1/3), czyli wysokość, przy której fala 35 kPa obejmuje największy obszar.

Uproszczenia: budynki nie zasłaniają się przed falą, nie ma skutków długofalowych. Liczby ofiar to szacunek dla ludzi w budynkach makiety. Ziemia jest płaska, więc przy największych uderzeniach zasięgi w panelu (tysiące kilometrów) wychodzą daleko poza makietę i nie uwzględniają krzywizny Ziemi. Uderzenia w morze (Chicxulub, Chesapeake) trafiają tu w ląd, bez tsunami.

## Sterowanie

| | |
|---|---|
| Klik | wybór celu |
| Przeciąganie | obrót kamery |
| Prawy przycisk / Shift + przeciąganie | przesuwanie |
| Kółko / szczypanie | przybliżanie |
| `1`–`0`, `-`, `=`, `]` | wybór broni |
| `Spacja` | odpal |
| `P` | pauza |
| `R` / `F` / `T` | pierścienie zasięgów / kamera filmowa / pora dnia |
| `O` | świadek: kliknij ulicę albo dach, przeciągaj, żeby się rozglądać, kółkiem przybliżaj |
| `W` `A` `S` `D` / strzałki | bieg świadka (`Shift`: sprint, na telefonie joystick) |
| `Z` | powtórka: odbudowa i ten sam wybuch jeszcze raz |
| `C` | porównanie: kolejny ładunek do porównania (i wyłączenie) |
| `Delete` | odbudowa miasta |
| `Esc` | wyjście z widoku świadka |

## Technika

- HTML, CSS i JavaScript bez budowania, Three.js r159 (w `lib/`).
- Miasto, drzewa i samochody to siatki instancjonowane. Uszkodzenia szyb, wyrwy w fasadach, zwęglenia, osmalenia i kratery liczy shader na podstawie 32 „slotów wybuchów” (środek, promień czoła fali, moc, czas), dzięki czemu każdy piksel sam wie, jakie nadciśnienie do niego dotarło. Drzewa przewraca shader wierzchołków (także w cieniach).
- Dym, ogień i grzyb to instancjonowane billboardy sortowane kubełkowo, gruz to fizyczne bryły z odbiciami.
- Zakres skal od 5 cm do 400 km obsługuje dynamiczna płaszczyzna bliska i daleka kamery, mgła i cienie dopasowane do odległości.
- Dźwięki (huk zależny od mocy i odległości, echo, grzmot, lont, gwizd bomby, silnik rakiety, wystrzał, szkło, gruz, pożary, zapalnik, trzask fajerwerków) syntezowane w Web Audio, bez plików.
- Scena renderuje się do bufora HDR z MSAA, potem przechodzi przez poświatę (5 poziomów rozmycia), soczewki czół fal i drgania powietrza rzutowane na ekran oraz promienie od błysku. Bez WebGL2 rysuje się wprost na ekran jak wcześniej.
- Drzewa mają atrybut instancji ze slotem wybuchu, odległością i docelowym przewróceniem, więc shader nie przechodzi po wszystkich wybuchach. Łuna pożarów to tekstura 64×64 (kwartał na teksel), z której czytają ziemia, budynki i dym.

## Struktura

```
index.html        – układ: pasek, arsenał, zasięgi i raport, pasek czasu, okna
css/style.css     – wygląd i wersja na mniejsze ekrany
lib/three.min.js  – Three.js r159
js/util.js        – losowanie z ziarnem, szum, formatowanie liczb
js/physics.js     – nadciśnienie, czoło fali, ciepło, kula ognia, krater, chmura
js/weapons.js     – arsenał: dane, opisy, ikony
js/shaders.js     – sloty wybuchów i shadery ziemi, budynków, drzew
js/world.js       – renderer, niebo, teren z okolicą, mapa pokrycia, pory dnia
js/post.js        – obróbka obrazu: poświata, czoło fali, gorące powietrze, promienie
js/city.js        – generowanie miasta i wsi, skutki wybuchów, hałdy gruzu, pożary, ofiary
js/fx.js          – cząsteczki, kula ognia, fala, pył, grzyb, gruz, pożary
js/delivery.js    – modele pocisków, meteory, magazyn w Bejrucie i ich lot do celu
js/impact.js      – kratery uderzeniowe: siatka i profil w czasie, kurtyna skał, fala pyłu, wstrząs
js/audio.js       – dźwięk
js/camera.js      – kamera orbitalna i filmowa
js/app.js         – pętla, odpalanie, tempo czasu, świadek i jego bieg, pogoda, powtórka, link, interfejs
```
