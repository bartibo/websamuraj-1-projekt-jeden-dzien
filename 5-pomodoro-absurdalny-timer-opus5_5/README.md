# Absurdoro

Timer pomodoro z Ministerstwa Czasu Nadmiernie Mierzonego. Odlicza czas na 13 absurdalnych sposobów, które same się zmieniają w trakcie zadania. Gąsienica zjada pomidora, kot zrzuca rzeczy ze stołu, babcia lepi pierogi, a ślimak ściga się z leniwcem i kamieniem. Zegar Dalego topi się z każdą minutą, a foton leci przez Układ Słoneczny. Na koniec przychodzi raport z faktami, w które trudno uwierzyć. Ministerstwo prowadzi Twoją teczkę: pamięta poprzednie zadania i odpowiedzi z kontroli, awansuje Cię i przysyła oceny pocztą.

## Jak powstał

Dzień 5 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** piątek, 23.10.2026, godz. 10:29
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 30 minut
- **Poprawki:** brak. Po prompcie nie było żadnej kolejnej wiadomości dotyczącej projektu (późniejsza prośba o wrzucenie na GitHub nie zmieniała kodu)
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz proszę aplikację typu pomodoro, która w zabawny wręcz absurdalny sposób odlicza czas zadania na wiele sposobów by nie było nudno i użytkownik tworzac zadania, będąc w jego trakcie oraz po zakończeniu miał poczucie szkoku i niedowierzania w śmiesznych znaczeniu.
> Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Aplikacja otworzy się w przeglądarce (Chrome, Edge, Firefox).
Nie trzeba niczego instalować ani budować.

> Czcionki ładują się z Google Fonts. Bez internetu wszystko działa tak samo, tylko z czcionką systemową.

## Trzy etapy

### 1. Wniosek (Formularz A-38)

- **Nazwa zadania**: na bieżąco komentuje ją Analizator Zadań (wersja beta od 2009 r.). Rozpoznaje ok. 30 rodzajów zadań: maile, raporty, sprzątanie, naukę, Excela, spotkania, programowanie, pranie i inne. Podaje też szansę powodzenia (±100%), ryzyko prokrastynacji, trudność w pierogach, aurę zadania i zalecany napój.
- **Czas trwania**: 1–120 minut, z gotowymi wyborami („Jajko na miękko”, „Klasyczny pomidor”, „Kolejka w urzędzie”…). Obok widać, ile to w innych jednostkach, np. 25 minut ≈ 750 000 machnięć skrzydeł komara albo 0,0000000000000034 wieku Wszechświata.
- **Powód**, **przerwa po zadaniu** i **poziom absurdu** (od „Łagodny” do „Kosmiczny horror”).
- Po złożeniu wniosek przechodzi przez urząd: synchronizacja z zegarem atomowym, konsultacja z kapibarą i kolejka do okienka nr 3 (można ją pominąć za pieroga). Na końcu dostajesz **decyzję administracyjną** z pieczątką i patronem zadania.

### 2. Zadanie w toku: 13 sposobów odliczania

| Sposób | Co się dzieje |
|---|---|
| 🧮 Przelicznik Absurdalny | Pozostały czas w ponad 35 jednostkach: mrugnięcia, czasy Plancka, kadencje Sejmu, rosoły babci, „Grzegorze Brzęczyszczykiewicze” |
| 🍅 Pomidor Przemijania | Gąsienica Grażyna zjada pomidora kęs po kęsie, a pomidor coraz bardziej się martwi |
| 🐌 Wielki Wyścig Ślimaka | Ślimak Zbigniew wpada na metę dokładnie z końcem zadania; jest komentator i kibice |
| 🐈 Kot i Stół | Każdy przedmiot na stole to kawałek czasu. Kot patrzy w kamerę i go zrzuca |
| 🚆 Tablica Odjazdów | Tablica z klapkami, zadanie jako pociąg, gong i komunikaty dworcowe czytane przez lektora |
| 💾 Kopiowanie Zadania | Okno kopiowania z prawdziwym paskiem postępu i szacunkiem typu „17 lat… 3 sekundy… do czwartku” |
| ⚔️ Walka z Bossem | Zadanie ma tyle HP, ile zostało sekund. Są combo, krytyczne trafienia i fazy bossa |
| 🫠 Zegar Dalego | Zegar pokazuje pozostały czas i topi się proporcjonalnie do upływu |
| 📜 Zaświadczenie Urzędowe | Pozostały czas słownie, rzymsko, binarnie, Morse’em, na palcach, w tuzinach i kreskami |
| 🌍 Tymczasem na Świecie | Liczniki od startu: urodziny, wymienione komórki, pioruny, e-maile, wzrost włosów, ucieczka Księżyca |
| ☄️ Wyścig Fotonu | Foton wystrzelony ze Słońca na starcie zadania leci obok kolejnych planet |
| 📈 Giełda Produktywności | Indeks WIG-POMIDOR z nagłówkami i paskiem notowań; sesja zamyka się z końcem zadania |
| 🥟 Babcia Lepi Pierogi | Babcia Halina lepi jednego pieroga na każdy kawałek czasu i pyta, czy jadłeś. Ostatni pieróg jest gotowy z końcem zadania |

Do tego:

- komunikaty Ministerstwa i niespodziewane **kontrole** („Czy w ciągu ostatniej minuty patrzył(-a) Pan/Pani w telefon?”). Ich częstotliwość zależy od poziomu absurdu.
- **ostatnie 10 sekund** na pełnym ekranie, każda liczba podana inaczej: „DZIESIĘĆ”, „IX”, „1000” binarnie, 7 ślimaków…
- na poziomie „Kosmiczny horror” ekran czasem się psuje,
- prawdziwy czas jest zawsze widoczny w rogu („po ludzku”), a tytuł karty na zmianę pokazuje minuty i mrugnięcia.

### 3. Raport końcowy

- duży napis, pieczątka, konfetti, fanfary i lektor,
- **„Niewiarygodne, ale prawdziwe”**: co się wydarzyło w czasie zadania. Przykład dla 25 minut:
  - Twoje ciało wymieniło ok. 5,7 mld komórek,
  - wszystkie włosy razem urosły o ok. 60 cm,
  - Słońce zamieniło w energię ok. 6,4 mld ton materii,
  - promień obserwowalnego Wszechświata urósł o ok. 1,5 mld km,
- porównania (gepard, leniwiec, jajka na miękko, procent wieku Wszechświata),
- odznaczenia państwowe i werdykt jury (Kapibara Hortensja, Ślimak Zbigniew, Babcia Halina, Kot Prezes, Ministerstwo Czasu, Duch Kopernika),
- przyciski: przerwa, następne zadanie z kolejki, powtórka, druk dyplomu, kopiowanie raportu.

Osobne raporty dostają zadania zakończone przed czasem („Zaoszczędzono 7 minut. Ministerstwo nie wie, co z nimi zrobić.”) i porzucone („Porzucono (z godnością)”).

## Sterowanie w trakcie zadania

| Klawisz | Działanie |
|---|---|
| `Spacja` | pauza / wznowienie |
| `←` `→` | poprzedni / następny sposób odliczania |
| `P` | przypnij bieżący sposób (koniec automatycznych zmian) |
| `M` | lista wszystkich sposobów |

## Pozostałe funkcje

- **Kolejka zadań**: przycisk „+ Do kolejki”, a potem start, edycja albo usunięcie zadania z listy.
- **Archiwum Akt Zadaniowych**: historia zadań i łączny czas w jajkach na miękko i kadencjach Sejmu.
- **Ustawienia**: efekty dźwiękowe, tykanie, lektor, powiadomienia, włączanie i wyłączanie poszczególnych sposobów.
- Zadanie liczy się dalej po zamknięciu karty i wraca po ponownym otwarciu strony. Gdy skończy się w tle, przeglądarka pokaże powiadomienie.
- Dźwięki są syntezowane na żywo (Web Audio), bez plików audio. Lektor korzysta z polskiego głosu przeglądarki, jeśli jest dostępny.
- Wszystko zostaje w przeglądarce (localStorage).

Liczniki świata to średnie orientacyjne (np. 4,3 narodzin na sekundę, 3,8 mln wymienianych komórek ciała na sekundę). Pierogi liczone są metodą „na babcię”.

## Rozwój po eksperymencie

27.10.2026 aplikację oceniło czterech agentów z [`.claude/agents/`](../.claude/agents/): design, UX, wydajność i rozwój produktu. Główny wniosek: pierwsza sesja bawi, ale od drugiej teksty zaczynają się powtarzać, bo Ministerstwo niczego nie pamięta. Do tego domyślny poziom zmieniał sposób odliczania co 28 s i stukał co sekundę, a Zegar Dalego i konfetti mocno obciążały komputer. Wdrożone poprawki:

- **Teczka Petenta (Ministerstwo pamięta):**
  - w decyzji jest wiersz „Kartoteka”, np. „«Odpisać na maile» po raz 3. Zadanie ma już własną szafkę w archiwum” albo „Wniosek złożony w nocy. Babcia Halina pyta, czemu nie śpisz”,
  - raz na zadanie przychodzi komunikat „Z akt sprawy”, który cytuje Twoje odpowiedzi z dawnych kontroli („W protokole z 24.10 zapisano odpowiedź «W lodówce». Kazimierz westchnął”),
  - ocena Ministerstwa, obiecana „pocztą”, naprawdę przychodzi przy następnej wizycie („📬 PRZYSZŁA POCZTA: 6/10. Uzasadnienie: za równe marginesy”),
  - w „Twoim dorobku” widać, o ile od pierwszego wniosku oddalił się Księżyc.
- **Ranga urzędowa:** od Petenta przez Referenta ds. Pomidorów i Kierownika Okienka nr 3 aż do „Czasu we własnej osobie”. Awans ma „Akt nominacji” z pieczątką i przywilejem (np. kolejka VIP do okienka).
- **Decyzja z niespodzianką:** mniej więcej co druga decyzja nie jest zwykłym „przyznać”. Bywa odmowa („wniosek wypełniono długopisem w niewłaściwym odcieniu niebieskiego”), a po niej odwołanie rozpatrzone w 0,4 s. Bywa przyznanie warunkowe („nie wolno myśleć o słoniu”), sprawdzane w raporcie. Zdarza się pomyłka urzędnika („~~25 dni roboczych~~ 25 minut”) albo sprawa przekazana Kotu Prezesowi, który podpisuje łapą.
- **Pierogi jako waluta:** za pracę trafiają do spiżarni (1 za 5 minut). Pominięcie kolejki naprawdę kosztuje pieroga, a gdy spiżarnia jest pusta, można wziąć pieroga na kredyt u babci. Babcia pamięta.
- **Nowy sposób odliczania „Babcia Lepi Pierogi”.**
- **Raport:**
  - kronika zadania: co zrzucił kot, którą planetę minął foton, kiedy była pauza i co odpowiedziałeś inspektorowi,
  - jury ocenia przebieg: Kot Prezes daje tyle punktów, ile zrzucił przedmiotów, Babcia reaguje na porę dnia, Ślimak na długość zadania,
  - fakty i porównania są losowane z większej puli, pasek z przyciskami zostaje na dole ekranu.
- **Kontrole:** 16 pytań zamiast 4, każda odpowiedź ma własną reakcję inspektora i trafia do akt. Kontrola nie przychodzi w ostatnich 40 sekundach.
- **Więcej tekstów:** komunikaty, nagrody, kwestie jury i warianty ostatnich 10 sekund. Teksty losują się bez powtórek także między sesjami.
- **Przerwa:** bez kontroli i bez psucia ekranu, z łagodnymi komunikatami. Co czwarte pomodoro dnia daje długą przerwę (15 min). Po przerwie przycisk „Następne pomodoro” od razu pokazuje decyzję, bez kolejki w urzędzie. Licznik „🍅 dziś” jest na górze ekranu.
- **Mniej hałasu:** sposoby zmieniają się co 30–90 s zamiast 18–75 s, boss nie stuka co sekundę, tablica odjazdów nie terkocze, a lektor dworcowy zdąży się odezwać.
- **Wygląd:** poprawiony telefon (długie nazwy zadań, przewijane menu sposobów, układ poziomy, przesuwanie palcem między sposobami), pieczątki nie zasłaniają tekstu, pomidor pod koniec ma szypułkę na talerzu, a jego dymek łamie tekst. Kot ma portret w złotej ramie, kamień w wyścigu ma oczy, foton większe planety, kontrast kolorów spełnia WCAG.
- **Wydajność:**
  - Zegar Dalego 56 kl/s zamiast 28, a konfetti 57 kl/s zamiast 5,5,
  - przeliczenia układu strony spadły z ok. 120 do 1–2 na sekundę,
  - w pauzie i pod menu scena rysuje się raz na sekundę, a opcja „Oszczędzanie energii” (domyślnie włączona) ogranicza animacje do 30 kl/s,
  - dźwięk usypia się po 20 s ciszy.
- **Poprawki błędów:** komunikaty z zadania nie przechodzą na raport, zadanie kończy się punktualnie także w karcie w tle, a kot po powrocie z tła nie tłucze wszystkiego naraz z hukiem.

## Struktura

```
index.html            – ekrany: wniosek, zadanie w toku, raport; nakładki
css/style.css         – wygląd
js/util.js            – losowanie, liczby i odmiana po polsku, liczby słownie, rzymskie, Morse, zapis
js/data.js            – jednostki, liczniki świata, reakcje analizatora, komunikaty, nagrody, jury
js/audio.js           – efekty dźwiękowe (Web Audio) i lektor
js/modes/*.js         – 13 sposobów odliczania (każdy w osobnym pliku)
js/fx.js              – komunikaty, okna, konfetti, przełączanie ekranów
js/dossier.js         – Teczka Petenta: kartoteka, poczta z oceną, ranga, spiżarnia pierogów
js/creator.js         – Formularz A-38, analizator, rozpatrywanie wniosku i decyzja
js/session.js         – odliczanie, zmiana sposobów, kontrole, pauza, ostatnie 10 sekund
js/finale.js          – raport końcowy i koniec przerwy
js/app.js             – kolejka, archiwum, ustawienia, start
```
