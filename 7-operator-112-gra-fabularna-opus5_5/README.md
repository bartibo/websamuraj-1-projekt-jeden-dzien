# Pod jedną żarówką

Gra fabularna w przeglądarce. Jesteś operatorem numeru alarmowego 112 na nocnej zmianie w Centrum Powiadamiania Ratunkowego w Kalnowie (fikcyjne miasto). O 23:41 przychodzi połączenie, w którym nikt nic nie mówi. Potem w kanale tekstowym pojawia się wiadomość od dziewczyny zamkniętej w piwnicy z jedną żarówką. Nie pamięta, kim jest, a na górze ktoś chodzi. Masz czat, bazy danych, mapę miasta i jeden radiowóz. Ona ma telefon z kończącą się baterią.

## Jak powstał

Dzień 7 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** wtorek, 27.10.2026, godz. 11:28
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 85 minut
- **Poprawki:** brak. Po prompcie nie było żadnej kolejnej wiadomości dotyczącej projektu (późniejsza prośba o wrzucenie na GitHub nie zmieniała kodu)
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz kompletną, interaktywną grę przeglądarkową symulującą interfejs czatu operatora numeru alarmowego 112 wraz z pełnym, rozgałęzionym scenariuszem fabularnym, w której zadaniem gracza jest zadawanie pytań i podejmowanie kluczowych decyzji podczas rozmowy z cierpiącą na amnezję dziewczyną zamkniętą w piwnicy z jedną żarówką, aby na podstawie odkrywanych poszlak ustalić jej tożsamość oraz lokalizację i uratować ją, zanim kontakt bezpowrotnie się urwie.
> Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Gra otworzy się w przeglądarce (Chrome, Edge, Firefox).
Nie trzeba niczego instalować ani budować. Działa też bez internetu (wtedy z czcionką systemową zamiast IBM Plex).
Na telefonie kolumny przełącza dolny pasek: Stan, Rozmowa, Narzędzia.

## Jak się gra

- **Rozmowa.** Pod czatem jest pięć kategorii pytań i poleceń: *Stan*, *Otoczenie*, *Dźwięki i zapachy*, *Ona* i *Polecenia*. Nowe pytania pojawiają się, gdy ona coś opisze albo gdy znajdziesz coś w bazach. Razem jest ich ponad 50.
- **Bateria.** Każda jej wiadomość i każda minuta zużywają baterię. Gdy spadnie do zera, kontakt się urywa. Polecenie przyciemnienia ekranu wyraźnie wydłuża rozmowę.
- **Jej stan.** Ma uraz głowy, jest jej zimno, a w 16. minucie zaczyna się atak astmy. Gdy panikuje, odpowiada chaotycznie i pytanie przepada. Możesz udzielać instrukcji (ucisk rany, pozycja przy duszności, nie zasypiać, okryć się) i ją uspokajać. Złe polecenie może jej zaszkodzić.
- **Światło.** Bez żarówki ona nic nie widzi, więc nie przeczyta ani licznika, ani napisu na bluzie. Ale gdy ktoś schodzi do piwnicy, ciemność może ją ocalić. Żarówka z czasem zaczyna mrugać i może się przepalić.
- **Poszlaki** (ponad 40, w pięciu grupach: miejsce, tożsamość, sprawca, zdrowie, wspomnienia) zbierają się po prawej. Szkic piwnicy po lewej uzupełnia się w miarę, jak ona opisuje otoczenie.
- **Mapa.** Poszlaki o otoczeniu dodają nakładki: pas wzdłuż torów (pociąg), zasięg zapachu słodowni, zasięg zegara na wieży kościoła i sektor stacji bazowej. Po kliknięciu budynku widać dane z ewidencji (rok budowy, ogrzewanie, piwnica, prąd) i to, ile poszlak do niego pasuje.
- **Bazy.** Lokalizacja AML/BTS, abonent numeru, KRS, ewidencja ludności (wyszukiwanie po nazwisku), baza osób zaginionych z filtrami, dyspozytor sieci energetycznej (adres licznika po numerze PPE), telefon do schroniska i do rodziny zaginionej. Każde zapytanie kosztuje minuty.
- **Służby.** Patrol możesz wysłać pod adres albo na rekonesans ulicy. Do tego karetka (ZRM), straż (PSP) i decyzja, czy jechać na sygnałach. Błędny adres to stracony czas, ale czasem też nowa informacja od sąsiadów.
- **Decyzje na czas.** Kiedy nad piwnicą słychać kroki albo sprawca wraca, masz kilkanaście sekund na decyzję (pasek odliczania, klawisze 1–4).
- **Presja czasu.** Gdy zwlekasz, zegar idzie dalej (1 minuta gry na 30 sekund). Można to wyłączyć na ekranie tytułowym, a decyzje dostają wtedy dwa razy więcej czasu.

## Fabuła i rozgałęzienia

Do celu prowadzi kilka niezależnych dróg i żadna nie jest jedyną słuszną:

- **Adres:** licznik prądu, numer PPE i dyspozytor energii; albo numer telefonu, potem fundacja, KRS, prezes i jego nieruchomości w ewidencji; albo zawężanie obszaru na mapie (tory, zapach słodu, dzwon o północy, sektor sieci, ogrzewanie węglem, dom jednorodzinny, prąd); albo rekonesans ulicy i poproszenie jej, żeby mrugała żarówką.
- **Tożsamość:** opis wyglądu (włosy, tatuaż, bransoletka, bluza, bilet), filtry bazy zaginionych, wybór kandydatki i weryfikacja: pytanie jej samej albo telefon do rodziny.
- **Pułapki:** telefon do schroniska może zaalarmować sprawcę. Polecenie krzyku, gdy on jest w domu, ściąga go na dół. Syreny go płoszą. Butelka na półce nie zawiera wody. Patrol wycofany spod właściwych drzwi to jeden z najgorszych błędów.
- **Sprawca** ma własny plan dnia: o północy wyjeżdża, potem wraca, a zaalarmowany chce ją wywieźć.

**Siedem zakończeń:** Światło w okienku · Ucieczka w noc · Pacjentka NN · Schodami w górę · Po drugiej stronie ciszy · Zgłoszenie bez adresu · Z kim piszesz?
Na końcu jest raport ze zdarzenia: ocena od S do F, statystyki, dobre decyzje, błędy, podpowiedzi, co umknęło, i kolekcja odkrytych zakończeń (zapisywana w przeglądarce).

Gra porusza temat uprowadzenia, przemocy (bez drastycznych opisów), urazu i strachu. Miasto Kalnów, osoby, firmy i instytucje są zmyślone.

## Technika

- Czysty HTML, CSS i JavaScript, bez bibliotek i bez budowania.
- Mapa miasta i szkic piwnicy to SVG generowane w kodzie (skala mapy 1 px = 2 m). Nakładki poszlak liczą odległości od torów, słodowni i wieży oraz sektor anteny.
- Cały dźwięk jest syntezowany na żywo przez Web Audio: sygnał połączenia, piknięcia wiadomości, radio, pociąg, dwanaście uderzeń zegara, kroki, auto, deszcz i bicie serca przy dużym strachu.
- Silnik zdarzeń działa na czasie gry: każde pytanie to minuta, zapytania do baz to 1–4 minuty, a zdarzenia (kroki, pociąg, północ, wyjazd i powrót sprawcy, deszcz, przepalenie żarówki) uruchamiają się o swojej porze albo po spełnieniu warunków.

## Struktura

```
index.html      – ekran tytułowy, konsola operatora, pomoc, raport końcowy
css/style.css   – wygląd konsoli, czatu, mapy, szkicu i raportu
js/data.js      – fabuła: poszlaki, pytania i odpowiedzi, zdarzenia, budynki, ulice, baza zaginionych, ewidencja, zakończenia
js/game.js      – silnik: czas, bateria, stan, zdarzenia, decyzje, narzędzia, dysponowanie, zakończenia, interfejs
js/map.js       – mapa Kalnowa w SVG, nakładki poszlak, dopasowanie budynków, radiowóz
js/sketch.js    – szkic piwnicy uzupełniany na podstawie relacji
js/audio.js     – syntezowany dźwięk
```
