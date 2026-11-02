# Iskrolandia

Kolorowy warsztat obwodów 3D dla dzieci (ok. 10 lat). Na planszy z kropkami buduje się obwody z baterii, żarówek, silniczków, wyłączników, przycisków, diod LED, brzęczyków i oporników, a fizyka pod spodem liczy prawdziwe prądy i napięcia. Trudne pojęcia pokazują dwie metafory: **prąd to wyścig iskierek** (im szybciej pędzą kosteczki po kablach, tym większy prąd), a **napięcie to wielkość klocka**, który każda iskierka wiezie (bateria go daje, żarówka zabiera). Do tego 12 misji z gwiazdkami, naklejki, odznaki odkrywcy, plansze do odblokowania i pomocnik Wolcik.

## Jak powstał

Dzień 11 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** poniedziałek, 02.11.2026, godz. 18:21
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 35 minut
- **Poprawki:** brak. Po prompcie nie było żadnej kolejnej wiadomości dotyczącej projektu (późniejsza prośba o wrzucenie na GitHub nie zmieniała kodu)
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz interaktywną, kolorową i bezpieczną aplikację edukacyjną 3D dla 10-latka, która w formie radosnej, gamifikowanej piaskownicy pozwala budować obwody z żarówkami, silniczkami i wyłącznikami, tłumaczy abstrakcyjne pojęcia fizyczne przez intuicyjne metafory wizualne (jak wyścigi i rozmiary klocków dla prądu i napięcia), oferuje zabawne misje z nagrodami oraz zapewnia pełną, wciągającą interakcję dotykową i myszką bez żadnych barier technologicznych.
> Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Strona otworzy się w przeglądarce (Chrome, Edge, Firefox, Safari).
Nie trzeba niczego instalować ani budować. Three.js leży w folderze `lib/`, a czcionki są systemowe, więc całość działa bez internetu.
Działa myszką, palcem (telefon, tablet) i klawiaturą. Na telefonie trzymanym pionowo plansza sama obraca się wzdłuż ekranu.

## Co jest w środku

**Piaskownica.** Wybierasz element z tacki na dole i dotykasz miejsca między dwiema kropkami (albo przeciągasz element prosto z tacki). Kable rysuje się, przeciągając palcem od kropki do kropki, nawet długie za jednym razem. Element postawiony na kablu zastępuje ten kawałek kabla. Dotknięcie elementu otwiera dymek z pomiarem na żywo: napięcie w klockach i woltach, prąd w iskierkach na sekundę i amperach, co się teraz dzieje i przyciski Odwróć, Kolor, Napraw, Usuń. Elementy można przesuwać, cofać ruchy (↶) i czyścić planszę. Plansza z piaskownicy zapisuje się sama.

**Elementy:**

| Element | Jak działa w Iskrolandii |
|---|---|
| Bateria 1,5 V | „winda” dla iskierek, każda daje 1 klocek; można je ustawiać jedna za drugą i odwracać |
| Żarówka | świeci tym jaśniej, im większe klocki do niej docierają; przy 4 bateriach się przepala (pyk!) |
| Silniczek | kręci śmigłem, szybciej przy większym napięciu, w drugą stronę po odwróceniu baterii |
| Wyłącznik | most zwodzony na torze, dźwignia w górze = przerwa |
| Przycisk | działa tylko, dopóki się go trzyma (jak dzwonek do drzwi) |
| Dioda LED | 5 kolorów, przepuszcza prąd w jedną stronę, potrzebuje 2 baterii i opornika, bez opornika się przepala |
| Brzęczyk | brzęczy (prawdziwym dźwiękiem) i wysyła fale |
| Opornik | wąska ścieżka, robi „korek” i chroni diodę |

**Metafory na planszy:**
- **Iskierki** to kosteczki jadące po każdym kablu i przez każdy element. Ich prędkość to prąd. Ich wielkość i kolor to napięcie: rosną, przejeżdżając nad baterią, maleją w żarówce, a do baterii wracają „pustymi wózkami”. W przerwanym obwodzie stoją w miejscu, a przy zwarciu pędzą czerwone.
- **Wieże klocków** (przycisk „Klocki”) stawiają na każdej kropce słupek z kolorowych klocków o wysokości napięcia w tym miejscu. 1 klocek = 1 bateria = 1,5 V.

**12 misji** (do 3 gwiazdek każda, mniej po podpowiedziach): pierwsze światełko, wyłącznik, wiatraczek i zmiana kierunku obrotów, turbo z dwiema bateriami, żarówki szeregowo i równolegle, dzwonek do drzwi, dioda z opornikiem, bramka I (sejf z dwoma kluczami), bramka LUB (dom z dwojgiem drzwi), znajdowanie zwarcia i wielki finał: instalacja w domku, w której lampka, wiatrak i dzwonek mają własne włączniki. Każda misja sprawdza obwód naprawdę (także wszystkie kombinacje wyłączników), a po wygranej wyjaśnia, co się stało.

**Nagrody:** naklejki z misji, 10 odznak odkrywcy za eksperymenty w piaskownicy (np. 5 żarówek naraz, tęcza z trzech diod, orkiestra, wieża mocy z 4 baterii, przepalona żarówka), 5 plansz w różnych kolorach odblokowywanych gwiazdkami. Konfetti, fanfary i tańczący Wolcik.

**„Jak działa prąd?”** to 8 animowanych kart: obwód jako tor wyścigowy, prąd, napięcie, żarówka zabierająca klocki, opór, szeregowo i równolegle, dioda jako bramka w jedną stronę oraz zwarcie i zasady bezpieczeństwa (tylko baterie, nigdy gniazdko).

**Wolcik** to iskierka-pomocnik w rogu ekranu: wita w misjach, podpowiada, ostrzega przed zwarciem, tłumaczy przepalenia i odwróconą diodę, a oczami śledzi kursor. Każdy jego dymek można odsłuchać przyciskiem 🔊 (syntezator mowy przeglądarki), dla dzieci, które jeszcze wolno czytają.

## Bezpieczeństwo

- Brak internetu, reklam, kont, zakupów i linków na zewnątrz. Postęp zapisuje się tylko na tym urządzeniu (localStorage).
- Zwarcie i przepalanie są „bezpieczną porażką”: bateria czerwienieje i dymi, Wolcik tłumaczy, czym grozi to w prawdziwym życiu, a przepaloną żarówkę naprawia się jednym dotknięciem.
- Okienko „Dla rodziców” opisuje, czego uczy aplikacja, i pozwala wyzerować postęp.

## Sterowanie

| | |
|---|---|
| Dotknięcie / klik | postaw element, pstryknij wyłącznikiem, otwórz dymek |
| Przytrzymanie | wciśnij przycisk |
| Przeciąganie | rysuj kable, przesuwaj elementy, wyciągaj elementy z tacki; po pustej planszy obraca widok |
| Dwa palce / prawy przycisk myszy | obrót planszy; szczypanie i kółko myszy przybliżają |
| Klawisze | `1`–`0` narzędzia, `Ctrl+Z` cofnij, `R` odwróć, `Delete` usuń, `Esc` zamknij |

## Fizyka

Obwód liczony jest przy każdej zmianie metodą potencjałów węzłowych (prawo Ohma i prawa Kirchhoffa, eliminacja Gaussa):

- bateria: 1,5 V z oporem wewnętrznym 0,2 Ω (dlatego zwarcie daje duży, ale skończony prąd ok. 7 A),
- żarówka 5 Ω (przepala się powyżej 5 V), silniczek 4 Ω, brzęczyk 15 Ω, opornik 50 Ω, kable i zamknięte wyłączniki 0,01 Ω,
- dioda LED: napięcie progowe 1,8 V, przewodzi tylko w jedną stronę (iteracyjne dobieranie stanów), przepala się powyżej 80 mA,
- napięcie pokazywane w klockach liczone jest od najniższego punktu danego obwodu.

Uproszczenie: iskierki płyną umownym kierunkiem prądu, od plusa do minusa (elektrony w drucie płyną odwrotnie, co wyjaśnia okienko dla rodziców).

## Technika

- HTML, CSS i JavaScript bez budowania, Three.js r159 (w `lib/`) do grafiki 3D z cieniami i odbiciami.
- Wszystkie modele elementów są budowane w kodzie (bez plików 3D), iskierki i wieże klocków to instancjonowane siatki.
- Dźwięki (pstryknięcia, brzęczyk, buczenie silniczka, fanfary, „pyk”) syntezowane na żywo w Web Audio, bez plików.

## Struktura

```
index.html        – układ: pasek, plansza, tacka, ekrany startowy, misji, nagród i lekcji
css/style.css     – wygląd i wersja na telefon
lib/three.min.js  – Three.js r159
js/circuit.js     – plansza, solver obwodu, odmiana liczebników
js/pieces.js      – modele 3D elementów i ich animacje
js/scene.js       – scena, kamera, iskierki, wieże klocków, efekty, wskazywanie
js/missions.js    – misje i ich sprawdzanie, lekcje, odznaki, plansze
js/audio.js       – dźwięki i czytanie na głos
js/ui.js          – Wolcik, dymki, okna, konfetti, ikony
js/app.js         – stan, narzędzia, dotyk i mysz, nagrody, zapis
```
