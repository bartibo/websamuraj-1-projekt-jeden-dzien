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

## Technika

- Czysty HTML, CSS i JavaScript, bez bibliotek i bez budowania.
- Mapa miasta i szkic piwnicy to SVG generowane w kodzie (skala mapy 1 px = 2 m). Nakładki poszlak liczą odległości od torów, słodowni i wieży oraz sektor anteny.
- Cały dźwięk jest syntezowany na żywo przez Web Audio: sygnał połączenia, piknięcia wiadomości, radio, pociąg, dwanaście uderzeń zegara, kroki, auto, deszcz i bicie serca przy dużym strachu.
- Silnik zdarzeń działa na czasie gry: każde pytanie to minuta, zapytania do baz to 1–4 minuty, a zdarzenia (kroki, pociąg, północ, wyjazd i powrót sprawcy, deszcz, przepalenie żarówki) uruchamiają się o swojej porze albo po spełnieniu warunków.

## Struktura

```
index.html      – ekran tytułowy, konsola operatora, pomoc, raport końcowy
img/            – tło ekranu tytułowego i obraz do udostępniania (wygenerowane w Nano Banana)
css/style.css   – wygląd konsoli, czatu, mapy, szkicu i raportu
js/data.js      – fabuła: poszlaki, wnioski i ich połączenia, pytania i odpowiedzi, zdarzenia, budynki, ulice, baza zaginionych, ewidencja, zakończenia
js/game.js      – silnik: czas, bateria, stan, zdarzenia, decyzje, narzędzia, dysponowanie, zakończenia, interfejs
js/map.js       – mapa Kalnowa w SVG, nakładki poszlak, dopasowanie budynków, radiowóz
js/sketch.js    – szkic piwnicy uzupełniany na podstawie relacji
js/audio.js     – syntezowany dźwięk
```

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
