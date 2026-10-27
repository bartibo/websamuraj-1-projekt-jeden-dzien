# Pod jedną żarówką

Gra fabularna w przeglądarce. Jesteś operatorem numeru alarmowego 112 na nocnej zmianie w Centrum Powiadamiania Ratunkowego w Kalnowie (fikcyjne miasto). O 23:41 przychodzi połączenie, w którym nikt nic nie mówi. Potem w kanale tekstowym pojawia się wiadomość od dziewczyny zamkniętej w piwnicy z jedną żarówką. Nie pamięta, kim jest, a na górze ktoś chodzi. Masz czat, bazy danych, mapę miasta i jeden radiowóz. Ona ma telefon z kończącą się baterią.

Gra ma teraz dwie sprawy, wybierane na ekranie tytułowym:

| # | Sprawa | O czym |
|---|--------|--------|
| 01 | **Pod jedną żarówką** | Dziewczyna bez pamięci zamknięta w piwnicy. Kalnów, 26.10, 23:41. |
| 02 | **Oddział zamknięty** (18+) | Noc Wszystkich Świętych w opuszczonym szpitalu psychiatrycznym w Borku. 01.11, 00:47. |

Silnik (czat, czas, bateria, bazy, tablica poszlak, mapa, dysponowanie, raport) jest wspólny, a każda sprawa leży w osobnym folderze `sprawy/`. Kolejne sprawy dodaje się bez ruszania silnika.

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

Kliknij dwa razy plik **`index.html`**. Gra otworzy się w przeglądarce (Chrome, Edge, Firefox). Po planszach startowych naciśnij dowolny klawisz, a w menu wybierz „Nowy dyżur” i sprawę. Można też wejść od razu w konkretną sprawę: `index.html?sprawa=zarowka` albo `index.html?sprawa=oddzial`. Druga sprawa wymaga potwierdzenia, że masz 18 lat.
Nie trzeba niczego instalować ani budować. Działa też bez internetu (wtedy z czcionką systemową zamiast IBM Plex).
Na telefonie kolumny przełącza dolny pasek: Stan, Rozmowa, Narzędzia.

## Jak się gra

- **Rozmowa.** Pod czatem jest pięć kategorii pytań i poleceń: *Stan*, *Otoczenie*, *Dźwięki i zapachy*, *Ona* i *Polecenia*. Nowe pytania pojawiają się, gdy ona coś opisze albo gdy znajdziesz coś w bazach. Razem jest ich ponad 50.
- **Bateria.** Każda jej wiadomość i każda minuta zużywają baterię. Gdy spadnie do zera, kontakt się urywa. Polecenie przyciemnienia ekranu wyraźnie wydłuża rozmowę.
- **Jej stan.** Ma uraz głowy, jest jej zimno, a w 16. minucie zaczyna się atak astmy. Gdy panikuje, odpowiada chaotycznie i pytanie przepada. Możesz udzielać instrukcji (ucisk rany, pozycja przy duszności, nie zasypiać, okryć się) i ją uspokajać. Złe polecenie może jej zaszkodzić.
- **Światło.** Bez żarówki ona nic nie widzi, więc nie przeczyta ani licznika, ani napisu na bluzie. Ale gdy ktoś schodzi do piwnicy, ciemność może ją ocalić. Żarówka z czasem zaczyna mrugać i może się przepalić.
- **Poszlaki** (ponad 45, w pięciu grupach: miejsce, tożsamość, sprawca, zdrowie, wspomnienia) zbierają się po prawej. Przy każdej jest „↳ w rozmowie”, które przewija czat do miejsca, gdzie padła. Szkic piwnicy po lewej uzupełnia się w miarę, jak ona opisuje otoczenie.
- **Tablica poszlak.** Zaznacz dwie poszlaki, które według ciebie się łączą, i kliknij „Połącz”. Trafne połączenie daje wniosek (dziewięć do odkrycia), a niektóre wnioski zawężają adres na mapie. Pomyłka nic nie kosztuje. W zakładce „Karta” jest też notatnik operatora.
- **Pamięć i strach.** Pytania o wspomnienia działają dopiero, gdy ona trochę się uspokoi. W panice pytania bez znacznika „uspokaja” mogą przepaść, a konsola to pokazuje.
- **Mapa.** Poszlaki o otoczeniu dodają nakładki: pas wzdłuż torów (pociąg), zasięg zapachu słodowni, zasięg zegara na wieży kościoła i sektor stacji bazowej. Po kliknięciu budynku widać dane z ewidencji (rok budowy, ogrzewanie, piwnica, prąd) i to, ile poszlak do niego pasuje. Pod mapą jest ranking budynków, a gdy zostaje jeden pasujący, konsola podaje go jako prawdopodobny adres.
- **Bazy.** Lokalizacja AML/BTS, abonent numeru, KRS, ewidencja ludności (wyszukiwanie po nazwisku), baza osób zaginionych z filtrami, dyspozytor sieci energetycznej (liczniki pasujące do numeru PPE), telefon do schroniska i do rodziny zaginionej. Każde zapytanie kosztuje minuty.
- **Służby.** Patrol możesz wysłać pod adres albo na rekonesans ulicy. Do tego karetka (ZRM), straż (PSP) i decyzja, czy jechać na sygnałach. Błędny adres to stracony czas, ale czasem też nowa informacja od sąsiadów. Bez podstaw w zebranych poszlakach patrol nie wyważy drzwi, nawet pod właściwym adresem.
- **Decyzje na czas.** Kiedy nad piwnicą słychać kroki albo sprawca wraca, masz kilkanaście sekund na decyzję (alarm na całym ekranie, odliczanie, klawisze 1–4). Na telefonie gra sama przełącza wtedy na rozmowę.
- **Presja czasu.** Gdy zwlekasz, zegar idzie dalej (1 minuta gry na 30 sekund, sekundy widać przy zegarze). Można to wyłączyć na ekranie tytułowym, a decyzje dostają wtedy dwa razy więcej czasu. Gdy patrol jest w drodze, można po prostu czekać z nią minutę.
- **Klawiatura.** 1–9 wybiera pytanie, strzałki zmieniają kategorię, spacja odbiera połączenie.

## Fabuła i rozgałęzienia

Do celu prowadzi kilka niezależnych dróg i żadna nie jest jedyną słuszną:

- **Adres:** licznik prądu z częściowo zdrapanym numerem PPE, który dyspozytor energii zawęża do trzech domów, a resztę robią mapa albo inicjały na słoikach; albo numer telefonu (lub SMS do „Marka” na ekranie blokady), potem fundacja, KRS, prezes i jego nieruchomości w ewidencji; albo zawężanie obszaru na mapie (tory, zapach słodu, dzwon o północy, sektor sieci, ogrzewanie węglem, dom jednorodzinny, prąd); albo rekonesans ulicy i poproszenie jej, żeby mrugała żarówką.
- **Tożsamość:** opis wyglądu (włosy, tatuaż, bransoletka, bluza, bilet), filtry bazy zaginionych, wybór kandydatki i weryfikacja: pytanie jej samej albo telefon do rodziny (gdy wiesz za mało, możesz oddzwonić z nowymi szczegółami).
- **Pułapki:** telefon do schroniska może zaalarmować sprawcę. Polecenie krzyku, gdy on jest w domu, ściąga go na dół. Syreny go płoszą. Butelka na półce nie zawiera wody. Patrol wycofany spod właściwych drzwi to jeden z najgorszych błędów.
- **Sprawca** ma własny plan dnia: o północy wyjeżdża, potem wraca, a zaalarmowany chce ją wywieźć.

**Siedem zakończeń:** Światło w okienku · Ucieczka w noc · Pacjentka NN · Schodami w górę · Po drugiej stronie ciszy · Zgłoszenie bez adresu · Z kim piszesz?
Na końcu jest karta zdarzenia: ocena od S do F, statystyki, dobre decyzje, błędy (także te z braku reakcji), co umknęło, chronologia zgłoszenia, pieczątka „zamknięte” albo „otwarte” i kolekcja odkrytych zakończeń (zapisywana w przeglądarce).

Gra porusza temat uprowadzenia, przemocy (bez drastycznych opisów), urazu i strachu. Miasto Kalnów, osoby, firmy i instytucje są zmyślone.

## Sprawa 2: Oddział zamknięty (18+)

Noc z 31 października na 1 listopada. Cmentarz w Borku pod Kalnowem świeci tysiącami zniczy, a za jego murem stoi szpital psychiatryczny zamknięty w 1998 roku. Troje urbexerów, Kinga, Dawid i Szymek, weszło tam o północy z transmisją na żywo. O 00:47 Kinga pisze do 112. Schowała się w jakiejś sali i nie wie, w którym budynku jest, bo biegła po ciemku tunelami. Z głośników, które od lat nie mają prądu, spokojny głos „przyjmuje pacjentów na oddział”. Zna jej imię.

- **Cel:** ustalić pawilon, piętro i salę Kingi, odnaleźć Dawida, zanim o 01:30 zacznie się „zabieg”, i wysłać patrol, zanim sprawca przyjdzie po nią.
- **Latarka zamiast żarówki.** Bez latarki ona nic nie zobaczy, a latarka zjada baterię i świeci pod drzwiami.
- **Teren zamiast miasta.** Mapa to plan szpitala: pawilony A–E, kotłownia z agregatem, wieża ciśnień, prosektorium, kaplica, tunele i cmentarz pełen zniczy. Patrol przeszukuje budynki, a wiedza o piętrze skraca przeszukanie z 4 minut do 1.
- **Drogi do celu:** AML i widok z okna (znicze na wschodzie, wieża ciśnień po lewej, piętro z tunelem) zawężają mapę do jednego pawilonu. Opaska szpitalna „Oddz. III, sala 12” razem z archiwalnymi planami też wskazuje pawilon C. Graffiti z korytarza można znaleźć na forum urbexowym, a patrol pod murem cmentarza zobaczy sygnał latarką. Portiernia stróża skrywa listę przyjęć.
- **Dawid:** zapis transmisji z serwisu streamingowego, relacja Szymka, komunikat z głośnika, światło w piwnicznych okienkach i kabel od agregatu prowadzą do izolatek w pawilonie D.
- **Sprawca:** właściciel terenu, telefon do ochrony („pan Edmund, był tu sanitariuszem”), ewidencja, wcześniejsze zgłoszenia z Borku i baza zaginionych sprzed lat. Telefon do ochrony z prośbą o zawiadomienie stróża przyspiesza wszystko.
- **Decyzje na czas:** ktoś sprawdza klamki, a potem staje pod jej drzwiami. Barykada, plan ukrycia, noga od krzesła albo blef, że policja już jest. Syreny płoszą sprawcę, dyskretny dojazd pozwala go zatrzymać.
- **Sześć zakończeń:** Wypisani · Jedno łóżko puste · Ku światłom zniczy · Izolatka numer 2 · Cisza nocna · Nowa pacjentka.

Sprawa zawiera martwe ciała, przemoc, porwanie i sceny grozy, bez drastycznych opisów. Szpital, Borek, osoby i firmy są zmyślone.

## Technika

- Czysty HTML, CSS i JavaScript, bez bibliotek i bez budowania.
- Mapa miasta i szkic piwnicy to SVG generowane w kodzie (skala mapy 1 px = 2 m). Nakładki poszlak liczą odległości od torów, słodowni i wieży oraz sektor anteny.
- Cały dźwięk jest syntezowany na żywo przez Web Audio: sygnał połączenia, piknięcia wiadomości, radio, pociąg, dwanaście uderzeń zegara, kroki, auto, deszcz i bicie serca przy dużym strachu.
- Silnik zdarzeń działa na czasie gry: każde pytanie to minuta, zapytania do baz to 1–4 minuty, a zdarzenia (kroki, pociąg, północ, wyjazd i powrót sprawcy, deszcz, przepalenie żarówki) uruchamiają się o swojej porze albo po spełnieniu warunków.

## Struktura

```
index.html          – ekran startowy (plansze, menu, wybór sprawy, odprawa), konsola operatora, pomoc, raport końcowy
img/keyart.jpg      – tło menu: operator przy stanowisku w deszczową noc (Nano Banana)
img/og.jpg          – obraz do udostępniania
css/style.css       – wygląd konsoli, czatu, mapy, szkicu i raportu (też elementy spraw)
js/game.js          – silnik wspólny: czas, bateria, stan, zdarzenia, decyzje, narzędzia, tablica poszlak, dysponowanie, raport
js/map.js           – część wspólna mapy: dopasowanie budynków do poszlak, radiowóz, legenda
js/audio.js         – syntezowany dźwięk
js/cases.js         – rejestr spraw (z danymi do kart wyboru) i wczytywanie plików wybranej sprawy
js/front.js         – ekran startowy: przełączanie ekranów, sterowanie klawiaturą, archiwum zakończeń, kurz i ruch tła, logowanie
sprawy/zarowka/     – sprawa 1: data.js, story.js, map.js (Kalnów), sketch.js (piwnica), intro.jpg
sprawy/oddzial/     – sprawa 2: data.js, story.js, map.js (szpital w Borku), sketch.js (sala 12), intro.jpg
```

### Jak dodać nową sprawę

1. Skopiuj folder jednej ze spraw do `sprawy/<id>/`.
2. `data.js`: poszlaki (`CLUES`), wnioski (`LINKS`), kategorie pytań i pytania (`Q_CATS`, `QUESTIONS`), zdarzenia w czasie (`EVENTS`), budynki i trasy (`BUILDINGS`, `STREETS`, `RECON`), bazy (`MISSING`, `REGISTRY`) i zakończenia (`ENDINGS`).
3. `story.js`: obiekt `CASE` (godzina, telefon, bateria, opis na ekran tytułowy, hooki: początek rozmowy, przybycie patrolu, karta, procedura, kod zakończenia, epilogi) i lista narzędzi `TOOLS`.
4. `map.js`: ograniczenia z poszlak (`GEO`), rysunek terenu (`buildMap`) i nakładki. `sketch.js`: szkic miejsca.
5. Dopisz sprawę do `CASES` w `js/cases.js` (z opisem na kartę: `tagline`, `place`, `when`, `length`, `endings`). Karta „Wkrótce” przesunie się sama.

## Rozwój po eksperymencie

27.10.2026 grę przeanalizowano pod kątem fabuły, klimatu i wygody gry, a dwóch agentów z [`.claude/agents/`](../.claude/agents/) oceniło design i UX. Główne wnioski: konsola wyglądała jak komunikator, a nie system dyspozytorski; licznik prądu był kluczem, który otwierał adres w 8 minut i robił z mapy dodatek; na telefonie decyzje na czas mogły przepaść niezauważone; adres zapamiętany z poprzedniej gry wystarczał do wygranej. Wdrożone poprawki:

- **Fabuła i spójność:**
  - wszystko dzieje się tego samego wieczoru (bilet 18:12, telefon Mai gaśnie 20:03, paragon 21:40, rozmowa 23:41), a nie 28 godzin wcześniej,
  - wiadomo, skąd ma telefon sprawcy: leżał obok niej na posadzce (a on potem „zgubił telefon”),
  - zna kolor swoich włosów, bo widzi kosmyk, a nie dlatego, że pamięta, jak wygląda,
  - nowe zdarzenie: o 00:05 na ekranie blokady wyskakuje SMS do „Marka” od wspólnika, który podnosi stawkę i daje nowy trop,
  - stróż schroniska, zapytany po północy, widział, jak kierownik ładował klatki do busa,
  - poprawione drobiazgi w zakończeniach (numer domu, powtórzenia, daty).
- **Śledztwo:**
  - numer PPE jest częściowo zdrapany, dystrybutor podaje trzy liczniki, a właściwy dom wskazuje mapa albo inicjały „H.W.” na słoikach,
  - tablica poszlak: łączenie dwóch faktów w jeden z dziewięciu wniosków, niektóre zawężają mapę,
  - dedukcja adresu z mapy: ranking budynków i „prawdopodobnie ul. Słodowa 14”, gdy zostaje jeden,
  - pamięć blokuje się przy silnym strachu, więc uspokajanie ma znaczenie dla śledztwa, nie tylko dla zdrowia,
  - bez podstaw w poszlakach patrol nie wyważy drzwi (koniec z wygraną z pamięci poprzedniej gry),
  - wyszukiwarki rozumieją odmianę („łapa” znajduje „łapy”, „M. Wróbla” znajduje Wróblów), baza zaginionych nie pokazuje już Mai jako pierwszej,
  - można oddzwonić do siostry, gdy za pierwszym razem zabrakło szczegółów,
  - raport liczy też błędy zaniechania (przegapiona decyzja, hałas przy liczniku, nieoszczędzana bateria), a „Co umknęło” pokazuje najpierw to, czego zabrakło do celu.
- **Klimat konsoli:**
  - prostokątne kształty, nagłówki paneli jak listwy systemu, segmentowane paski, wersaliki w mono,
  - czat jako transkrypcja kanału SMS-112 z godziną co do sekundy i znacznikiem nadawcy (ZGŁ, OP-03, SYS, RAD),
  - priorytet P1, kwalifikacja (art. 189 kk), status „w toku” i dolny pasek stanu systemu (kanał, AML, BTS, patrol, ZRM, nagrywanie),
  - połączenie przychodzące jako wiersz kolejki z numerem ANI,
  - decyzja na czas jako alarm na całym ekranie: czerwona winieta, wygaszone boczne kolumny, odliczanie co do dziesiątej sekundy, tyknięcia przez ostatnie 5 sekund,
  - pasek ostrzeżenia o niskiej baterii, ciemniejszy czat, gdy w piwnicy nie ma światła, subtelne ziarno monitora,
  - ekran tytułowy jako logowanie do SWD i tło z piwnicą, karta zdarzenia z pieczątką i chronologią.
- **Wygoda:**
  - nowe pytania na górze listy, a znacznik „nowe” znika dopiero po kolejnej akcji,
  - pytania wymagające światła są zablokowane, gdy jest ciemno (zamiast zabierać minutę i baterię),
  - „Czekaj z nią 1 min”, gdy patrol jest w drodze,
  - najwyżej 3 komunikaty o poszlakach naraz, w kolumnie czatu,
  - odliczanie decyzji stoi, gdy karta przeglądarki jest w tle, a czas gry stoi przy otwartej pomocy,
  - obsługa „ogranicz ruch” w systemie.
- **Telefon:**
  - decyzja na czas sama przełącza na rozmowę, licznik nieprzeczytanych wiadomości na przycisku „Rozmowa”,
  - kategorie pytań w jednym przewijanym rzędzie, bez stałej podpowiedzi, bez poziomego przewijania ekranu tytułowego.
- **Druga sprawa i wspólny silnik (27.10.2026, druga część dnia):**
  - silnik rozdzielony od fabuły: sprawy w `sprawy/<id>/`, rejestr w `js/cases.js`, wybór sprawy na ekranie tytułowym, osobna kolekcja zakończeń dla każdej sprawy,
  - nowa sprawa 18+ „Oddział zamknięty”: 38 poszlak, 5 wniosków, 39 pytań i poleceń, 16 zdarzeń, 9 budynków na planie szpitala, 8 narzędzi (m.in. zapis transmisji na żywo, archiwalne plany, forum urbexowe, ochrona terenu), 6 zakończeń,
  - komunikaty z głośnika jako osobny typ wiadomości, latarka zużywająca baterię, nowe dźwięki (głośnik, agregat, klamka, pukanie, krzyk przez rury),
  - bramka 18+ na ekranie tytułowym, tło z korytarzem szpitala (Nano Banana).
  - poprawki po teście drugiej sprawy przez agenta UX: patrol wysłany bez żadnej poszlaki przeszukuje pawilon 9 min i obniża ocenę, sprawca słyszy nadjeżdżający radiowóz i rusza po nią (kulminacja nie omija szybkiego gracza), poprawiona orientacja widoku z okna (wieża po lewej, kaplica po prawej), wyjaśnienie porażki przy ukryciu bez barykady, spójniejsze teksty (agregat, numery sal, prosektorium, opatrunek), jej „zabieg” nie przed jego, przewijanie do nowego wyniku w bazach, krótsze zakładki na telefonie.
- **Ekran startowy jak w grach AAA (27.10.2026, wieczór):**
  - plansze startowe (studio, „najlepiej w słuchawkach”), ekran „naciśnij dowolny klawisz” z logo, linią EKG i uderzeniem dźwięku,
  - menu główne na tle key artu z ruchem kamery, odblaskiem koguta, kurzem i ziarnem filmu; pasek stanowiska z zegarem i „na żywo” kolejka zgłoszeń CPR,
  - Kontynuuj (ostatnia sprawa), Nowy dyżur, Archiwum zakończeń, Jak grać, Ustawienia (w tym muzyka i efekty ekranu), Autorzy,
  - wybór sprawy na kartach z grafiką i postępem zakończeń, odprawa przed dyżurem, ekran wczytywania ze wskazówką i sekwencja logowania do systemu,
  - muzyka menu syntezowana na żywo: deszcz, dron, pianino z echem i trzaski radiostacji,
  - pełne sterowanie klawiaturą (strzałki, Enter, Esc) z podpowiedziami u dołu ekranu, układ na telefon w pionie i w poziomie.
- **Gra na telefonie (27.10.2026, po teście dotykiem w obu sprawach):**
  - decyzje przewijają się nad dolnym paskiem, a odliczanie jest zawsze na górze; w trakcie decyzji na czas nie da się uciec do innych kolumn,
  - powiadomienia (nowa poszlaka, wniosek, pomyłka na tablicy) są widoczne także w Narzędziach, a trafiony wniosek przewija się na środek,
  - czat trzyma się ostatniej wiadomości mimo zmiany wysokości panelu pytań, a gdy czytasz starsze, pojawia się pasek „nowe wiadomości”,
  - „Wyślij patrol” z karty budynku od razu wypełnia formularz służb (poprawka działa też na komputerze),
  - powiększona mapa ma podwójną skalę z przesuwaniem i ustawia się na wybranym budynku,
  - po wyszukiwaniu w bazach klawiatura się zamyka i widać wynik; pola tekstowe mają 16 px, więc iOS nie przybliża ekranu,
  - większe cele dotyku (kategorie, pytania, zakładki, przyciski, ranking budynków), marginesy na notch i pasek gestów,
  - nowy układ w poziomie: czat po lewej, pytania i decyzje po prawej, nawigacja w pasku z boku.
