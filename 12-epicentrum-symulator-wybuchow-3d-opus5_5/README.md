# Epicentrum

Symulator wybuchów na makiecie miasta 3D. Do wyboru 13 ładunków, od **laski dynamitu** (200 g trotylu), przez granat, pocisk czołgowy, pięć rodzajów rakiet i bombę MOAB, po broń jądrową: mini-atomówkę Davy Crockett, bombę z Hiroszimy, głowicę rakiety międzykontynentalnej i **Car-bombę** (50 Mt). Car-bomba jest 250 miliardów razy silniejsza od dynamitu, więc jedna makieta musi działać w skali od centymetrów do setek kilometrów. Fala uderzeniowa liczona fizycznie wybija szyby okno po oknie, burzy budynki, przewraca drzewa i samochody, a błysk wybuchu jądrowego podpala miasto, zanim fala w ogóle do niego dotrze.

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
| Głowica ICBM | 475 kt | świecąca głowica wchodzi w atmosferę |
| Car-bomba | 50 Mt | opada na spadochronie, wybuch na 4 km |

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

## Fizyka

- **Nadciśnienie**: wzór Kinneya–Grahama w funkcji odległości skalowanej Z = R / W^(1/3) (skalowanie Hopkinsona–Cranza). Wybuchy przy ziemi mają masę zwiększoną o odbicie od gruntu, a jądrowe w powietrzu także o wzmocnienie fali Macha (wynik zgodny z tablicami dla Hiroszimy: 35 kPa ok. 1,3 km od epicentrum).
- **Prędkość czoła fali** z równań Rankine'a–Hugoniota, scałkowana do tablicy czasu dotarcia: blisko wybuchu fala biegnie kilka razy szybciej niż dźwięk, daleko zwalnia do 343 m/s.
- **Promieniowanie cieplne**: 35% energii wybuchu jądrowego, słabnące z kwadratem odległości i pochłaniane przez powietrze, z progami oparzeń i zapłonu.
- **Kula ognia, krater, chmura, promieniowanie początkowe**: przybliżenia skalowania z „The Effects of Nuclear Weapons” (Glasstone i Dolan) i pomiarów wybuchów konwencjonalnych.
- **Wytrzymałość**: każdy typ budynku ma własne progi (np. dom ok. 30 kPa do zawalenia, blok ok. 70 kPa, wieżowiec ze stali ok. 115 kPa), a szyby pękają przy 3–9 kPa. Nadciśnienie działające na budynek to mediana z pięciu punktów jego bryły, więc mały ładunek przy wielkim wieżowcu nie przewróci go, tylko zniszczy fasadę.

Uproszczenia: budynki nie zasłaniają się przed falą, nie ma pogody wpływającej na zasięg ciepła ani skutków długofalowych. Liczby ofiar to szacunek dla ludzi w budynkach makiety.

## Sterowanie

| | |
|---|---|
| Klik | wybór celu |
| Przeciąganie | obrót kamery |
| Prawy przycisk / Shift + przeciąganie | przesuwanie |
| Kółko / szczypanie | przybliżanie |
| `1`–`0` | wybór broni |
| `Spacja` | odpal |
| `P` | pauza |
| `R` / `F` / `T` | pierścienie zasięgów / kamera filmowa / pora dnia |
| `Delete` | odbudowa miasta |

## Technika

- HTML, CSS i JavaScript bez budowania, Three.js r159 (w `lib/`).
- Miasto, drzewa i samochody to siatki instancjonowane. Uszkodzenia szyb, wyrwy w fasadach, zwęglenia, osmalenia i kratery liczy shader na podstawie 32 „slotów wybuchów” (środek, promień czoła fali, moc, czas), dzięki czemu każdy piksel sam wie, jakie nadciśnienie do niego dotarło. Drzewa przewraca shader wierzchołków (także w cieniach).
- Dym, ogień i grzyb to instancjonowane billboardy sortowane kubełkowo, gruz to fizyczne bryły z odbiciami.
- Zakres skal od 5 cm do 400 km obsługuje dynamiczna płaszczyzna bliska i daleka kamery, mgła i cienie dopasowane do odległości.
- Dźwięki (huk zależny od mocy i odległości, echo, grzmot, lont, gwizd bomby, silnik rakiety, wystrzał, szkło, gruz, pożary) syntezowane w Web Audio, bez plików.

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
js/city.js        – generowanie miasta i wsi, skutki wybuchów, ofiary
js/fx.js          – cząsteczki, kula ognia, fala, pył, grzyb, gruz, pożary
js/delivery.js    – modele pocisków i ich lot do celu
js/audio.js       – dźwięk
js/camera.js      – kamera orbitalna i filmowa
js/app.js         – pętla, odpalanie, tempo czasu, interfejs
```
