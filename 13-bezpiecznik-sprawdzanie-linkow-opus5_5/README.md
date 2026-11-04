# Bezpiecznik

Sprawdzacz podejrzanych linków dla osób, które nie znają się na komputerach. Na ekranie jest tylko jedno duże pole. Wklejasz do niego link z SMS-a albo e-maila (albo całą wiadomość, link Bezpiecznik znajdzie sam), a po 1–3 sekundach cały ekran robi się **jaskrawozielony** („BEZPIECZNY”) albo **jaskrawoczerwony** („OSZUSTWO! Nie klikaj w ten link”). Przy czerwonym wyniku są powody opisane prostymi słowami i trzy kroki, co zrobić dalej (m.in. bezpłatne przesłanie SMS-a na numer 8080 do CERT Polska).

Aplikacja ma dwa kolory: zielony i czerwony. Reszta jest czarno-biała (w trybie ciemnym odwrócona).

## Jak powstał

Dzień 13 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** środa, 04.11.2026, godz. 10:36
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 20 minut
- **Poprawki:** brak. Po prompcie nie było żadnej kolejnej wiadomości dotyczącej projektu (późniejsza prośba o wrzucenie na GitHub nie zmieniała kodu)
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz skrajnie prostą, dwukolorową aplikację internetową dla osób nietechnicznych, która posiada tylko jedno duże pole do wklejenia podejrzanego linku z wiadomości SMS lub e-mail i po automatycznej analizie przez darmowe zewnętrzne API natychmiast wyświetla pełnoekranowy, jednoznaczny komunikat: jaskrawozielony oznaczający pełne bezpieczeństwo lub jaskrawoczerwony ostrzegający przed oszustwem.
> Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Nie trzeba niczego instalować, logować się ani podawać klucza API. Do sprawdzania potrzebny jest internet.

Na dole strony są dwa przykłady: „bezpieczny” i „oszustwo”. Link można też podać w adresie strony: `index.html#link=https://przyklad.pl`.

## Co sprawdza

**Darmowe zewnętrzne źródła (bez klucza, prosto z przeglądarki):**

| Źródło | Co daje |
|---|---|
| Cloudflare DNS 1.1.1.2 (`security.cloudflare-dns.com`) | filtr złośliwych stron i wyłudzeń; zablokowana domena zwraca `0.0.0.0`; przy okazji widać, czy strona w ogóle istnieje |
| [OpenPhish](https://openphish.com) – darmowa lista | aktualne adresy stron wyłudzających dane |
| [Phishing.Database](https://github.com/Phishing-Database/Phishing.Database) | ok. 390 tys. aktywnych domen oszustów |
| RDAP (rejestry domen: NASK dla .pl, Verisign dla .com/.net, reszta przez rdap.org) | data rejestracji domeny; strona sprzed mniej niż 30 dni to czerwony alarm |

**Sztuczki oszustów sprawdzane na urządzeniu:**

- podszywanie się pod ok. 50 marek, pod które najczęściej podszywają się oszuści w Polsce (InPost, Allegro, OLX, Poczta Polska, DPD, DHL, banki, BLIK, mObywatel i gov.pl, PGE, Vinted, Netflix, Apple, Microsoft, Meta…), np. `inpost.pl-doplata.top`, `mobywatel-gov.info`;
- literówki i cyfry zamiast liter (`santnader.pl`, `alegro`, `4llegro.pl`), także zamiana sąsiednich liter;
- podrobione litery z cyrylicy i greki (punycode `xn--…` jest dekodowany i pokazywany);
- skrócone linki (bit.ly, tinyurl i ok. 60 innych), adres IP zamiast nazwy, adres schowany za `@`, pliki `.apk`/`.exe`, ukryty kod `javascript:`;
- słabsze sygnały, które liczą się dopiero razem: końcówki lubiane przez oszustów (`.top`, `.xyz`, `.click`, `.shop`…), słowa-wabiki („dopłata”, „paczka”, „weryfikacja”, „login”…), darmowy hosting, wiele myślników i członów, brak https, nietypowy port, młoda domena.

**Werdykt:** jeden mocny sygnał albo kilka słabszych naraz (≥ 2 punkty) daje czerwony ekran. Zielony pojawia się tylko wtedy, gdy przynajmniej filtr Cloudflare albo obie listy zdążyły odpowiedzieć i nic nie znalazły. Jeśli nie udało się nic sprawdzić (np. brak internetu), ekran też jest czerwony („Nie klikaj – nie udało się sprawdzić”) z przyciskiem „Spróbuj ponownie”. Ok. 150 znanych polskich i światowych serwisów jest na liście zaufanych.

**Prywatność:** nic nie jest zapisywane. Na zewnątrz trafia tylko nazwa strony (zapytanie DNS i RDAP), nigdy cały link. Listy oszustów pobierają się w tle zaraz po otwarciu strony i są porównywane na urządzeniu.

## Dla osób nietechnicznych

- Przycisk **„Wklej link”** sam pobiera link ze schowka. Gdy przeglądarka na to nie pozwala, pojawia się podpowiedź („Przytrzymaj palec w polu i wybierz Wklej” albo „Ctrl+V”).
- Sprawdzanie rusza samo zaraz po wklejeniu.
- Wynik zajmuje cały ekran: ogromny napis, ikona, nazwa strony, krótkie powody. Na telefonie towarzyszy mu wibracja i krótki dźwięk.
- Duże litery i przyciski, pełna obsługa klawiaturą (Enter sprawdza, Esc wraca), odczyt przez czytniki ekranu, tryb ciemny, ograniczony ruch dla osób, które go wyłączyły.

## Technika

- HTML, CSS i JavaScript bez budowania i bez bibliotek. Krój Archivo z Google Fonts (bez internetu zastępuje go krój systemowy).
- Zwykłe skrypty zamiast modułów ES, żeby strona działała z `file://`.
- Wszystkie źródła mają nagłówek `Access-Control-Allow-Origin: *`, więc nie potrzeba serwera ani pośrednika.
- Każde zapytanie ma limit czasu (DNS 6 s, RDAP 7 s, listy 8–9 s). Wynik przychodzi zwykle w 1–3 s.

## Struktura

```
index.html       – trzy ekrany: pole, „Sprawdzam…”, wynik na cały ekran
css/style.css    – wygląd (czerń i biel + jaskrawa zieleń i czerwień), wersja na telefon, tryb ciemny
js/dane.js       – marki i ich prawdziwe domeny, zaufane serwisy, skracacze, darmowe hostingi, końcówki, słowa-wabiki
js/analiza.js    – wyłuskiwanie linków z tekstu, rozbiór adresu, punycode, sztuczki oszustów, zapytania do źródeł, werdykt
js/app.js        – interfejs: schowek, kroki sprawdzania, pełnoekranowy wynik, dźwięk i wibracja
```
