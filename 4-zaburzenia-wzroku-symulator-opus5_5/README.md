# Oczami innych

Interaktywny symulator zaburzeń wzroku. Pokazuje, jak widzą świat osoby z krótkowzrocznością, nadwzrocznością, astygmatyzmem, starczowzrocznością, zezem, daltonizmem, zaćmą, jaskrą, AMD i jeszcze kilkunastoma innymi zaburzeniami, i tłumaczy, skąd się biorą.

Symulacja nie nakłada zwykłego filtra „rozmycie”. Każdy piksel sceny ma znaną odległość od oka, a rozmycie liczy się z prawdziwej optyki: średnicy źrenicy, wady w dioptriach i tego, na co oko akurat patrzy. Dlatego krótkowidz widzi ostro telefon w dłoni, a autobus już nie, astygmatyk widzi smugi na latarniach, a mroczek w AMD przesuwa się razem ze wzrokiem.

## Jak powstał

Dzień 4 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** czwartek, 22.10.2026, godz. 18:01
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 70 minut
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz proszę aplikację, która będzie pokazywała i wyjaśniała w jaki sposób świat widzą osoby z różnymi zaburzeniami wzroku np krótkowidze, dalekowidze, osoby z zezem, osoby z astygmatyzmem, daltonizmem i innymi nie wymienionymi.
> Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Aplikacja otworzy się w przeglądarce (Chrome, Edge, Firefox, Safari). Nie trzeba niczego instalować ani budować.

Potrzebna jest przeglądarka z WebGL2 (każda aktualna). Czcionki ładują się z Google Fonts. Bez internetu wszystko działa tak samo, tylko z czcionką systemową.

## Jak się tym bawić

- **Wybierz zaburzenie** z listy po lewej. Suwakami w panelu po prawej ustawisz nasilenie, wiek, rodzaj.
- **Ruszaj kursorem po scenie.** Oko patrzy tam, gdzie kursor, i po ułamku sekundy ustawia ostrość (akomoduje), ale tylko w zakresie swoich możliwości. W lewym górnym rogu widać, na co patrzysz, na jaką odległość oko ostrzy, przybliżoną ostrość wzroku i wysiłek oka. Gdy kursor jest poza sceną, oko samo rozgląda się po ciekawych miejscach.
- **Porównaj** (`C`) – przeciągana granica: po lewej zdrowe oko, po prawej oko z zaburzeniem. Przytrzymanie `H` pokazuje na chwilę zdrowe oko na całym ekranie.
- **Korekcja / leczenie** (`K`) – okulary, okulary do czytania, operacja zaćmy, twarde soczewki przy stożku rogówki, pryzmaty przy zezie, sztuczne łzy…
- **Łącz kilka zaburzeń** – np. starczowzroczność + zaćma + jaskra jednocześnie.
- **Quiz** – 10 rund: patrzysz oczami kogoś z losowym zaburzeniem i zgadujesz, co to jest.
- **Własne zdjęcie albo kamera** – zdjęcie można też przeciągnąć na scenę. Obraz zostaje w przeglądarce.
- Ustawienia trafiają do adresu strony, więc link prowadzi dokładnie do tego widoku.

Skróty: `C` porównanie, `K` okulary/leczenie, `Spacja` mrugnięcie, `H` zdrowe oko, `↑` `↓` poprzednie/następne zaburzenie, `1`–`7` sceny, `F` pełny ekran.

## Zaburzenia

| Grupa | Zaburzenia |
| --- | --- |
| Wady refrakcji | krótkowzroczność, nadwzroczność (z wiekiem i zmęczeniem akomodacji), astygmatyzm (cylinder i oś), starczowzroczność |
| Ustawienie i ruchy oczu | zez (zbieżny, rozbieżny, pionowy; podwójne widzenie albo tłumienie), niedowidzenie („leniwe oko”), oczopląs (skokowy, wahadłowy; nabyty albo wrodzony) |
| Widzenie barw | deuteranopia/deuteranomalia, protanopia/protanomalia, tritanopia/tritanomalia, achromatopsja |
| Choroby oczu | zaćma, jaskra, zwyrodnienie plamki (AMD, sucha i wysiękowa), retinopatia cukrzycowa, barwnikowe zwyrodnienie siatkówki, odwarstwienie siatkówki, stożek rogówki, zespół suchego oka |
| Mózg i inne | męty ciała szklistego, aura migrenowa, śnieg optyczny, niedowidzenie połowicze (po udarze), światłowstręt, ślepota zmierzchowa |

Przy każdym zaburzeniu są: opis tego, jak chory widzi świat, przyczyny, częstość, leczenie, ciekawostka, uwagi o samej symulacji i animowany schemat oka (bieg promieni, czopki, droga wzrokowa albo przekrój z zaznaczoną zmianą).

## Sceny

- **Ulica w dzień** i **Ulica nocą** – telefon w dłoni, przystanek z rozkładem jazdy, owoce przed sklepem, sygnalizator, autobus, wieża z zegarem; nocą latarnie, reflektory i neony.
- **Targ warzywny** – mnóstwo czerwieni i zieleni do testowania daltonizmu, lista zakupów w dłoni.
- **Gabinet okulisty** – tablica Snellena na 5 m z liniami ostrości od 0,1 do 1,0 i karta do czytania z bliska.
- **Tablice barwne** – tablice w stylu Ishihary generowane w przeglądarce, z kluczem odpowiedzi.
- **Kamera** i **Twoje zdjęcie** – z suwakiem odległości.

## Jak działa symulacja

1. **Scena z mapą głębi.** Sceny są rysowane w Canvas 2D jednocześnie na dwóch płótnach: kolorowym i „danych” (odległość w dioptriach, świecenie, nazwa obiektu). Płaszczyzny w perspektywie (jezdnia, podłoga, ściany) dostają dokładny gradient głębi.
2. **Optyka oka (WebGL2).** Dla każdego piksela liczony jest krążek rozproszenia: `źrenica × |odległość w dioptriach − ostrość oka|` w przestrzeni liniowej HDR. Astygmatyzm zmienia krążek w elipsę (dwa południki z różnym niedoostrzeniem), stożek rogówki dodaje komę i obrazy-duchy. Rozmyte bliskie przedmioty poprawnie „rozlewają się” na tło.
3. **Akomodacja.** Oko ustawia ostrość na obiekt pod wzrokiem, z opóźnieniem ok. 0,2 s, w zakresie zależnym od wieku (krzywa Duane’a) i wady. Okulary przesuwają ten zakres. Przy nadwzroczności duży wysiłek powoduje falowanie ostrości.
4. **Rozpraszanie światła.** Rozmyta kopia obrazu daje poświaty przy zaćmie i światłowstręcie, a także „wypełnienie” ubytków pola widzenia.
5. **Siatkówka i mózg.** Barwy według modelu Machado i in. (2009), ubytki pola widzenia, mroczki, męty i wylewy liczone względem punktu patrzenia, metamorfopsje, aura z zygzakiem gęstniejącym przy centrum, śnieg optyczny, powieki przy mrugnięciu i mrużeniu oczu.

Symulacja jest edukacyjna i uproszczona: nie służy do diagnozy, a prawdziwe widzenie każdej osoby jest inne.

## Struktura

```
index.html            – strona: lista zaburzeń, scena, panel opisu, quiz, okna
css/style.css         – wygląd (ciemny motyw, układ dla komputera i telefonu)
js/painter.js         – rysowanie sceny naraz w kolorze i w mapie danych (głębia, świecenie, obiekty)
js/scenes/ulica.js    – ulica w dzień i nocą
js/scenes/targ.js     – targ warzywny
js/scenes/gabinet.js  – gabinet okulisty z tablicą Snellena
js/scenes/tablice.js  – tablice barwne w stylu Ishihary
js/sim.js             – model widzenia: akomodacja wg wieku, macierze daltonizmu, łączenie efektów
js/conditions.js      – katalog zaburzeń: parametry, efekty, korekcja, opisy
js/renderer.js        – potok WebGL2: optyka oka, rozpraszanie, siatkówka i mózg
js/diagram.js         – animowane schematy oka
js/ui.js              – interfejs, HUD, quiz
js/main.js            – stan aplikacji, wzrok, kamera i zdjęcia, pętla renderowania
```
