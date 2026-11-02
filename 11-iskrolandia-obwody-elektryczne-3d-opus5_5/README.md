# Iskrolandia

Kolorowy warsztat obwodów 3D dla dzieci (ok. 10 lat). Na planszy z kropkami buduje się obwody z baterii, żarówek, silniczków, wyłączników, przycisków, diod LED, brzęczyków, oporników, ściemniaczy i stolika badacza, a fizyka pod spodem liczy prawdziwe prądy i napięcia. Trudne pojęcia pokazują dwie metafory: **prąd to wyścig iskierek** (im szybciej pędzą kosteczki po kablach, tym większy prąd), a **napięcie to wielkość klocka**, który każda iskierka wiezie (bateria go daje, żarówka zabiera). Wolcik-detektyw tłumaczy, **dlaczego** coś w obwodzie dziecka działa albo nie, i pokazuje przyczynę na planszy. Do tego 12 misji z gwiazdkami, Laboratorium z 14 eksperymentami „zgadnij – sprawdź – zrozum”, zagadki z własnego obwodu, miernik, naklejki, odznaki i plansze do odblokowania.

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
Nie trzeba niczego instalować ani budować. Three.js leży w folderze `lib/`, a czcionka Nunito w `css/fonts/`, więc całość działa bez internetu.
Działa myszką, palcem (telefon, tablet) i klawiaturą. Na telefonie są osobne układy dla trzymania pionowo i poziomo, a plansza sama dopasowuje się do wolnego miejsca między kartami.

## Co jest w środku

**Piaskownica.** Wybierasz element z tacki na dole i dotykasz miejsca między dwiema kropkami (albo przeciągasz element prosto z tacki). Kable rysuje się, przeciągając palcem od kropki do kropki, nawet długie za jednym razem. Element postawiony na kablu zastępuje ten kawałek kabla. Dotknięcie elementu otwiera dymek z pomiarem na żywo: napięcie w klockach i woltach, prąd w iskierkach na sekundę i amperach, wyjaśnienie „dlaczego” i przyciski Odwróć, Kolor, Napraw, Usuń, Więcej (lekcja o tym elemencie). Elementy można przesuwać, cofać ruchy (↶) i czyścić planszę. Plansza z piaskownicy zapisuje się sama.

**Wolcik-detektyw.** Dymek każdego elementu mówi, *dlaczego* jest tak, jak jest, w tym konkretnym obwodzie, a przyczyna miga na planszy: wykrzyknik tam, gdzie tor się urywa, pomarańczowa ramka na kablu robiącym skrót, na wyłączonym wyłączniku albo na baterii odwróconej przeciw drugiej. Mówi też, z czym żarówka dzieli klocek (szeregowo), że ma własny tor (równolegle), czym steruje wyłącznik i ile iskierek jechałoby bez opornika. Dotknięcie Wolcika daje przegląd całej planszy, a znak „?” przy nim oznacza, że coś nie działa. Wolcik sprawdza obwód „na próbę”: liczy kopię planszy z jedną zmianą (włączony wyłącznik, odwrócona bateria, zabrany kabel) i patrzy, co by pomogło.

**Laboratorium.** 14 eksperymentów według schematu, którym pracują naukowcy: najpierw **zgadnij** (np. „Co się stanie z żarówką, jeśli odwrócisz baterię?”), potem **sprawdź** (zrób to sam albo „Zrób to za mnie”), na koniec **zrozum** (wynik i wyjaśnienie). Eksperymenty celują w typowe błędne przekonania: żarówka „zjada” prąd, odwrócona bateria zgasi żarówkę, szeregowo i równolegle świeci tak samo. Każda lekcja „Jak działa prąd?” ma przycisk „Wypróbuj na planszy”, a okno wygranej misji prowadzi do pasującego eksperymentu.

**Zagadki Wolcika.** W piaskownicy przycisk ❓ układa pytanie „co się stanie, jeśli…” z obwodu, który dziecko samo zbudowało, a wynik przelicza prawdziwa fizyka. Częściej wybiera pytania z zaskoczeniem („tak samo”, „jaśniej”, „w drugą stronę”). Po zagadce można przywrócić obwód.

**Miernik.** Przeciągnięcie od kropki do kropki (albo dotknięcie elementu) pokazuje napięcie między dwoma punktami w klockach i woltach. Najważniejsze odkrycie: na wyłączonym wyłączniku jest cały klocek, czyli napięcie jest, a prądu brak.

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
| Ściemniacz | ścieżka zwężana suwakiem (0–10 Ω): żarówka płynnie przygasa, silniczek zwalnia |
| Stolik badacza | sprawdza 10 przedmiotów: klucz, spinacz, śrubka i łyżka przewodzą, ołówek (grafit) i słona woda słabo, a kaczuszka, pałeczki, papier i miś to izolatory; dotknięcie zmienia przedmiot |

**Metafory na planszy:**
- **Iskierki** to kosteczki jadące po każdym kablu i przez każdy element. Ich prędkość to prąd. Ich wielkość i kolor to napięcie: rosną, przejeżdżając nad baterią, maleją w żarówce, a do baterii wracają „pustymi wózkami”. W przerwanym obwodzie stoją w miejscu, a przy zwarciu pędzą czerwone.
- **Wieże klocków** (przycisk „Klocki”) stawiają na każdej kropce słupek z kolorowych klocków o wysokości napięcia w tym miejscu. 1 klocek = 1 bateria = 1,5 V.

**12 misji** (do 3 gwiazdek każda, mniej po podpowiedziach): pierwsze światełko, wyłącznik, wiatraczek i zmiana kierunku obrotów, turbo z dwiema bateriami, żarówki szeregowo i równolegle, dzwonek do drzwi, dioda z opornikiem, bramka I (sejf z dwoma kluczami), bramka LUB (dom z dwojgiem drzwi), znajdowanie zwarcia i wielki finał: instalacja w domku, w której lampka, wiatrak i dzwonek mają własne włączniki. Każda misja sprawdza obwód naprawdę (także wszystkie kombinacje wyłączników), a po wygranej wyjaśnia, co się stało.

**Nagrody:** naklejki z misji, 15 odznak odkrywcy (np. 5 żarówek naraz, tęcza z trzech diod, orkiestra, wieża mocy z 4 baterii, przepalona żarówka, Mierniczy, Badacz materiałów, Jasnowidz za 5 trafnych przewidywań, Mały naukowiec, Profesor), 5 plansz w różnych kolorach odblokowywanych gwiazdkami. Konfetti, fanfary i tańczący Wolcik.

**„Jak działa prąd?”** to 8 animowanych kart: obwód jako tor wyścigowy, prąd, napięcie, żarówka zabierająca klocki, opór, szeregowo i równolegle, dioda jako bramka w jedną stronę oraz zwarcie i zasady bezpieczeństwa (tylko baterie, nigdy gniazdko).

**Wolcik** to iskierka-pomocnik w rogu ekranu: wita w misjach, podpowiada, ostrzega przed zwarciem, tłumaczy przepalenia i odwróconą diodę, a oczami śledzi kursor. Każdy jego dymek można odsłuchać przyciskiem 🔊 (syntezator mowy przeglądarki), dla dzieci, które jeszcze wolno czytają.

## Rozwój po eksperymencie

02.11.2026 (wieczorem) projekt ocenili czterej agenci (`ocena-ux`, `ocena-design`, `ocena-optymalizacja`, `rozwoj-produktu`) na komputerze i telefonie. Wnioski: na komputerze dobrze (UX 8/10, wygląd ok. 7,5/10), ale na telefonie słabo (UX 6/10, wygląd pionowo ok. 4/10, poziomo ok. 3/10). Plansza zajmowała 17% ekranu, kropki były co 24 px, a karta misji, dymki i toasty ją zasłaniały. W poziomie przyciski Cofnij i Wyczyść były poza ekranem, a tacki nie dało się przewinąć palcem. Do tego aplikacja mówiła, *co* się dzieje, ale nie *dlaczego*, a przy skrócie podawała nieprawdę („iskierki nie przejeżdżają”). Wdrożone zmiany:

- **Wyjaśnianie:** Wolcik-detektyw (`js/explain.js`) w dymku każdego elementu i po dotknięciu Wolcika, ze znacznikami przyczyny na planszy; darmowa pierwsza podpowiedź w misji (detektyw), dopiero tekstowa kosztuje gwiazdkę; link „Więcej” z dymka do lekcji; wyjaśnienie napięcia na wyłączonym wyłączniku.
- **Eksperymentowanie:** Laboratorium z 14 eksperymentami „zgadnij – sprawdź – zrozum” powiązanymi z lekcjami i misjami, zagadki z własnego obwodu w piaskownicy, miernik napięcia między dowolnymi punktami, ściemniacz z suwakiem, stolik badacza z 10 przedmiotami (przewodniki i izolatory), 5 nowych odznak.
- **Telefon pionowo:** kamera kadruje planszę do wolnego miejsca i patrzy bardziej z góry, karta misji zwija się do paska z następnym celem i kropkami postępu (miga na zielono przy ✔), przyciski widoku tworzą dolny rząd z menu „⋯”, tacka ma dwa rzędy i mieści wszystkie 14 narzędzi bez przewijania, dymek elementu to dolny panel, a plansza przesuwa się nad niego, żeby znaczniki były widoczne.
- **Telefon poziomo:** osobny układ z tacką w kolumnie z lewej, przyciskami i Wolcikiem z prawej, niższym paskiem i oknami bez przewijania (lekcja w dwóch kolumnach).
- **Dotyk:** wyłączniki, przyciski i stolik działają w każdym narzędziu poza gumką; stuknięcie elementu w trybie Kabel otwiera dymek; po wyczerpaniu elementów w misji wraca Rączka; tackę przewija się palcem, a element wyciąga ruchem w stronę planszy; dwa palce przesuwają i przybliżają, podwójne stuknięcie wyśrodkowuje; dotknięcie planszy chowa przemijający dymek; wibracja przy stawianiu i pstrykaniu (Android).
- **Wygląd:** naklejki diody były schowane pod płytką (kierunku nie było widać), teraz są nad nią, a bateria i dioda mają czerwony pierścień przy plusie i granatowy przy minusie oraz wyraźny biały plus. Kable nie mają już kolorów iskierek (żółty, pomarańczowy). Iskierki w elementach są mniejsze, a „puste wózki” niebieskoszare. Żarówka świeci mocniej i rzuca plamę światła na matę. Po włączeniu Klocków kamera schodzi niżej, a iskierki bledną. Poprawione: ucięty napis w lekcji 3, kontrast drobnych napisów, mapa misji w dwóch kolumnach, ikona misji 2, ekran startowy z widoczną planszą 3D i czterema wejściami, krój Nunito.
- **Misje:** w misji 2 punkt „wyłączony – ciemno” nie zalicza się sam; okno wygranej pojawia się po 2,2 s, żeby było widać efekt; ważne wskazówki po akcji nie giną.
- **Inne:** dźwięk cichnie, gdy karta jest w tle; `prefers-reduced-motion`; cele dotyku min. 44 px; link „← Wszystkie projekty”; tagi `og:` (bez obrazka); naprawiony stan elementów po cofnięciu ruchu i zwalnianie materiałów; szybsza klatka (ok. 25% przy 78 elementach) i samoczynne obniżanie rozdzielczości na słabym telefonie.

## Bezpieczeństwo

- Brak internetu, reklam, kont, zakupów i linków na zewnątrz. Postęp zapisuje się tylko na tym urządzeniu (localStorage).
- Zwarcie i przepalanie są „bezpieczną porażką”: bateria czerwienieje i dymi, Wolcik tłumaczy, czym grozi to w prawdziwym życiu, a przepaloną żarówkę naprawia się jednym dotknięciem.
- Okienko „Dla rodziców” opisuje, czego uczy aplikacja, i pozwala wyzerować postęp.

## Sterowanie

| | |
|---|---|
| Dotknięcie / klik | postaw element, pstryknij wyłącznikiem (w każdym narzędziu poza gumką), zmień przedmiot na stoliku, otwórz dymek |
| Przytrzymanie | wciśnij przycisk |
| Przeciąganie | rysuj kable, przesuwaj elementy, mierz napięcie; po pustej planszy obraca widok |
| Tacka | dotknięcie wybiera narzędzie; przeciągnięcie w stronę planszy wyciąga element, a wzdłuż tacki ją przewija |
| Dwa palce | szczypanie przybliża, przesuwanie przesuwa planszę; podwójne stuknięcie wyśrodkowuje |
| Mysz | prawy przycisk obraca, środkowy przesuwa, kółko przybliża |
| Klawisze | `1`–`0` narzędzia, `Ctrl+Z` cofnij, `R` odwróć, `Delete` usuń, `Esc` zamknij |

## Fizyka

Obwód liczony jest przy każdej zmianie metodą potencjałów węzłowych (prawo Ohma i prawa Kirchhoffa, eliminacja Gaussa):

- bateria: 1,5 V z oporem wewnętrznym 0,2 Ω (dlatego zwarcie daje duży, ale skończony prąd ok. 7 A),
- żarówka 5 Ω (przepala się powyżej 5 V), silniczek 4 Ω, brzęczyk 15 Ω, opornik 50 Ω, ściemniacz 0,05–10 Ω, kable i zamknięte wyłączniki 0,01 Ω,
- stolik badacza: metal 0,05 Ω, ołówek 8 Ω, słona woda 12 Ω, izolator to przerwa w torze,
- dioda LED: napięcie progowe 1,8 V, przewodzi tylko w jedną stronę (iteracyjne dobieranie stanów), przepala się powyżej 80 mA,
- napięcie pokazywane w klockach liczone jest od najniższego punktu danego obwodu.

Uproszczenie: iskierki płyną umownym kierunkiem prądu, od plusa do minusa (elektrony w drucie płyną odwrotnie, co wyjaśnia okienko dla rodziców).

## Technika

- HTML, CSS i JavaScript bez budowania, Three.js r159 (w `lib/`) do grafiki 3D z cieniami i odbiciami.
- Wszystkie modele elementów są budowane w kodzie (bez plików 3D), iskierki i wieże klocków to instancjonowane siatki.
- Kamera kadruje planszę do wolnego prostokąta sceny (bez kart, paska i dolnego panelu) i sama wybiera orientację planszy oraz kąt patrzenia (na telefonie pionowo bardziej z góry).
- Wydajność: nieruchome części modeli mają zamrożone macierze, cienie przeliczają się po zmianie planszy i co trzecią klatkę, rozmiar sceny jest zapamiętany (bez odczytów układu strony co klatkę). Gdy telefon długo nie nadąża (poniżej ok. 36 kl/s), rozdzielczość sama spada. Materiały usuniętych elementów są zwalniane.
- Czcionka Nunito (SIL Open Font License, `css/fonts/OFL.txt`).
- Dźwięki (pstryknięcia, brzęczyk, buczenie silniczka, fanfary, „pyk”) syntezowane na żywo w Web Audio, bez plików.

## Struktura

```
index.html        – układ: pasek, plansza, tacka, ekrany startowy, misji, nagród i lekcji
css/style.css     – wygląd i układy na telefon (pionowo i poziomo)
css/fonts/        – Nunito (woff2) i licencja OFL
lib/three.min.js  – Three.js r159
js/circuit.js     – plansza, solver obwodu, materiały stolika, odmiana liczebników
js/explain.js     – Wolcik-detektyw: „dlaczego działa / nie działa” i znaczniki na planszy
js/lab.js         – Laboratorium (14 eksperymentów) i generator zagadek z obwodu dziecka
js/pieces.js      – modele 3D elementów i ich animacje
js/scene.js       – scena, kamera i kadrowanie, iskierki, wieże klocków, znaczniki, sondy miernika, efekty
js/missions.js    – misje i ich sprawdzanie, lekcje, odznaki, plansze
js/audio.js       – dźwięki i czytanie na głos
js/ui.js          – Wolcik, dymki, okna, konfetti, ikony
js/app.js         – stan, narzędzia, dotyk i mysz, miernik, zagadki, nagrody, zapis
```
