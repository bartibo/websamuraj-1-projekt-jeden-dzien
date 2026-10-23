# Absurdoro

Timer pomodoro z Ministerstwa Czasu Nadmiernie Mierzonego. Odlicza czas na 12 absurdalnych sposobów, które same się zmieniają w trakcie zadania. Gąsienica zjada pomidora, kot zrzuca rzeczy ze stołu, a ślimak ściga się z leniwcem i kamieniem. Zegar Dalego topi się z każdą minutą, a foton leci przez Układ Słoneczny. Na koniec przychodzi raport z faktami, w które trudno uwierzyć.

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

### 2. Zadanie w toku: 12 sposobów odliczania

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

## Struktura

```
index.html            – ekrany: wniosek, zadanie w toku, raport; nakładki
css/style.css         – wygląd
js/util.js            – losowanie, liczby i odmiana po polsku, liczby słownie, rzymskie, Morse, zapis
js/data.js            – jednostki, liczniki świata, reakcje analizatora, komunikaty, nagrody, jury
js/audio.js           – efekty dźwiękowe (Web Audio) i lektor
js/modes/*.js         – 12 sposobów odliczania (każdy w osobnym pliku)
js/fx.js              – komunikaty, okna, konfetti, przełączanie ekranów
js/creator.js         – Formularz A-38, analizator, rozpatrywanie wniosku i decyzja
js/session.js         – odliczanie, zmiana sposobów, kontrole, pauza, ostatnie 10 sekund
js/finale.js          – raport końcowy i koniec przerwy
js/app.js             – kolejka, archiwum, ustawienia, start
```
