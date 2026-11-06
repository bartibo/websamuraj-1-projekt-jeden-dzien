# Linkówka

Kreator jednostronicowych wizytówek dla freelancerów, **bez bazy danych i bez serwera**. Wypełniasz kilka pól: imię, krótkie bio, trzy najlepsze projekty i kontakt. Dostajesz estetyczną, responsywną stronę i link, w którym ta strona jest zapisana w całości. Wysyłasz go klientowi, wklejasz w stopkę maila albo pokazujesz jako kod QR.

Online: **[projekty.vibemaster.pl/15-linkowka-wizytowki-w-linku-opus5_5](https://projekty.vibemaster.pl/15-linkowka-wizytowki-w-linku-opus5_5/)**

## Co doszło po eksperymencie

Wersja z jednego promptu leży w [jeden-prompt](https://github.com/bartibo/jeden-prompt/tree/main/15-linkowka-wizytowki-w-linku-opus5_5). Tutaj doszło:

- **Zapytanie o wycenę.** „Napisz do mnie” prowadzi do krótkiego formularza na wizytówce: usługa, budżet, termin i kilka zdań. Wizytówka składa z tego gotowego maila (`mailto:` z tematem i treścią) albo, gdy jest tylko telefon, tekst do skopiowania i wysłania SMS-em. Nic nie przechodzi przez serwer.
- **Oferta i opinia.** Do trzech usług z ceną i czasem realizacji. Kliknięcie usługi zaznacza ją w formularzu zapytania. Do tego jedno zdanie od klienta z podpisem.
- **Status, który się nie starzeje.** Link zapisuje dzień, w którym powstał. „Wolne terminy od…” / „Grafik pełny do…” z datą po jej minięciu samo zmienia się w „Przyjmuję zlecenia”. Po 4 miesiącach bez nowego linku zielona kropka zmienia się w „Zapytaj o wolne terminy”. W stopce jest „Aktualne na 6 listopada 2026”.
- **Wysyłka bez długiego adresu.** „Kopiuj jako hiperłącze” wkleja się w Gmailu, Outlooku czy Slacku jako „Imię – rola”. „Stopka maila” daje gotowy podpis z linkiem. „Wydrukuj wizytówki” robi arkusz A4 z pięcioma wizytówkami 85×55 mm: z przodu imię i kontakt, z tyłu kod QR, wystarczy wyciąć i złożyć.
- **Kreator.** Cofanie po „Wypełnij przykładem” i „Wyczyść”. „Edytuj w kreatorze” nie kasuje szkicu (przycisk „Przywróć szkic”). Podpowiedzi pod polami, które nie trafią na wizytówkę (e-mail bez domeny, za krótki telefon, `@nazwa` zamiast adresu profilu), i ostrzeżenie, gdy na wizytówce nie ma żadnego kontaktu. Wyblakłe sekcje z przykładu w podglądzie, dopóki nie wpiszesz własnych. Panel z linkiem nie ucieka z ekranu, a na telefonie podgląd otwiera się na cały ekran i zamyka przyciskiem Wstecz. Motywy i kolory obsługują strzałki, a podgląd pamięta wybór Telefon/Komputer.
- **Wygląd.** Na telefonie pływające przyciski QR i Udostępnij to same ikony, chowają się przy czytaniu i mają styl motywu. Główny przycisk na pełną szerokość, reszta równo po pół. Ciemniejsze szarości (kontrast AA), ciemniejszy pomarańczowy przycisk w kreatorze, poprawione detale motywów (Brutal, Raster, Atrament, Terminal). Długie ciągi bez spacji nie rozpychają karty, podwójne nazwisko nie zmniejsza imienia o połowę.
- **Wydajność.** Pulsująca kropka statusu animuje `transform`, a nie `box-shadow`, więc nie przerysowuje strony 60 razy na sekundę. Mgiełka nie liczy rozmycia `blur(70px)` w każdej klatce. Wizytówka pobiera tylko fonty swojego motywu (Brutal i Terminal ok. 40 KB zamiast ~170 KB), Fraunces waży o połowę mniej, a generator kodów QR ładuje się dopiero przy pierwszym użyciu.
- **Poprawki.** Plik `.vcf` ma linie zawinięte zgodnie z RFC 6350, samo miasto w adresie i datę `REV`. Emoji w awatarze tak, przypadkowy tekst nie (zamiast niego inicjały). Okno QR podaje minimalny rozmiar wydruku. Link z pliku `file://` prowadzi do projekty.vibemaster.pl.

Stare linki z wersji z jednego promptu działają bez zmian: nowe pola dopisują się na końcu zapisu.

## Jak powstał

Dzień 15 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** piątek, 06.11.2026, godz. 10:54
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 20 minut
- **Poprawki:** brak. Po prompcie nie było żadnej kolejnej wiadomości dotyczącej projektu (późniejsza prośba o wrzucenie na GitHub nie zmieniała kodu)
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz ultraszybki i pozbawiony bazy danych kreator jednostronicowych wizytówek dla freelancerów, w którym użytkownik po prostu wypełnia kilka pól formularza – wpisując swoje imię, krótkie bio, trzy linki do najlepszych projektów oraz dane kontaktowe – a narzędzie generuje z tego estetyczną, responsywną stronę internetową zakodowaną bezpośrednio w unikalnym adresie URL, gotowym do natychmiastowego udostępnienia. Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Nic nie trzeba instalować ani budować.

- **„Wypełnij przykładem”** wczytuje gotową wizytówkę. Każde kolejne kliknięcie pokazuje następną z sześciu przykładowych osób, każdą w innym motywie.
- Po prawej stronie widać **podgląd na żywo** (przełącznik „Telefon” / „Komputer”) i **Twój link** z przyciskami: Kopiuj link, Otwórz, Kod QR, Udostępnij, a pod nimi Kopiuj jako hiperłącze, Stopka maila i Wydrukuj wizytówki.
- Na telefonie na dole ekranu jest pasek z przyciskami „Podgląd” (podgląd na cały ekran) i „Kopiuj link”.

**Otwarte z pliku (`file://`):** link do skopiowania prowadzi do wersji online (`projekty.vibemaster.pl/15-…`), bo adres `file:///C:/…` nie działa u nikogo poza Twoim komputerem. Przycisk „Otwórz” pokazuje wizytówkę z lokalnego pliku.

## Co jest w formularzu

1. **Kim jesteś:** imię i nazwisko (jedyne wymagane pole), czym się zajmujesz, miasto, bio (do 360 znaków, Enter robi nowy akapit), dostępność (Przyjmuję zlecenia / Wolne terminy wkrótce / Grafik pełny, z pulsującą kropką i opcjonalną datą), stawka, awatar (emoji, do 3 liter albo link do zdjęcia, np. `https://github.com/login.png`).
2. **Trzy najlepsze projekty:** nazwa, link, opis efektu i etykieta (np. „Branding · 2025”).
3. **Oferta i opinia (opcjonalnie):** do trzech usług (nazwa, cena, czas lub zakres) i jedno zdanie od klienta z podpisem.
4. **Kontakt:** e-mail, telefon i do czterech profili. Platformę aplikacja rozpoznaje sama (LinkedIn, GitHub, Behance, Dribbble, Instagram, X, YouTube, Vimeo, Bluesky, Calendly i ok. 20 innych).
5. **Wygląd:** sześć motywów i kolor akcentu (12 gotowych albo dowolny własny).

| Motyw | Charakter |
| --- | --- |
| Papier | redakcyjny, ciepły papier z ziarnem, szeryfowy Fraunces, nazwisko kursywą |
| Atrament | ciemny, poświata w kolorze akcentu, delikatna siatka |
| Brutal | neobrutalizm: grube ramki, twarde cienie, przekrzywiony awatar |
| Mgiełka | pastelowe, pływające plamy światła, karty z matowego szkła |
| Terminal | monospace, linie jak na monitorze CRT, migający kursor |
| Raster | szwajcarska typografia, ogromne nazwisko, czerwony pas |

## Co ma gotowa wizytówka

- duże imię i nazwisko, rola, bio, status dostępności (przeliczany według daty) i lokalizacja,
- przyciski **Napisz do mnie** (prowadzi do formularza zapytania), **Zadzwoń** i **Zapisz kontakt**. Ten ostatni pobiera plik `.vcf`, który dodaje osobę do kontaktów w telefonie,
- trzy projekty jako klikalne karty (na szerokim ekranie jako wiersze lub kafelki, zależnie od motywu),
- opinię klienta i ofertę (usługa, cena, czas),
- **Zapytaj o wycenę**: usługa, budżet, termin, opis → gotowy mail albo tekst do skopiowania,
- kontakt z przyciskami kopiowania e-maila i telefonu,
- pływające przyciski **Kod QR** (do pokazania na spotkaniu albo na wydruku) i **Udostępnij**,
- w stopce datę aktualności i **„Edytuj w kreatorze”**: otwiera kreator wypełniony danymi z linku.

Układ dopasowuje się do szerokości (container queries), więc podgląd „Telefon” w kreatorze wygląda dokładnie jak prawdziwy telefon.

## Jak dane mieszczą się w linku

1. Formularz zamienia się w zwartą tablicę: same wartości, bez nazw pól, bez `https://` i bez pustych końcówek. Pola dodane po pierwszej wersji (data powstania linku, „wolne od”, oferta, opinia) idą na koniec tablicy, więc stare linki odczytują się bez zmian.
2. Tablica jako JSON przechodzi przez **deflate** (wbudowane w przeglądarkę `CompressionStream`) i zapis **base64url**.
3. Wynik trafia za `#w` w adresie: `…/index.html#w1VVLBahsxEP2V…`. Pierwszy znak to wersja zapisu (`1` – skompresowany, `0` – bez kompresji, jeśli tak wychodzi krócej).

Typowa wizytówka to **800–1200 znaków** linku (przykłady: od ok. 800 do 1150, najdłuższy ma ofertę i opinię). Kreator pokazuje długość na bieżąco, ostrzega powyżej 2800 znaków (tyle mieści kod QR) i powyżej 4000. Część po `#` nie jest wysyłana do żadnego serwera, więc dane widzi tylko ten, kto dostanie link.

## Bezpieczeństwo

Link może przygotować każdy, więc wizytówka traktuje jego zawartość jak niezaufane dane:

- tekst trafia na stronę wyłącznie jako tekst (`textContent`), nigdy jako HTML,
- linki przechodzą tylko z protokołem `http`/`https`, więc `javascript:` i podobne odpadają,
- kolor akcentu musi mieć postać `#rrggbb`, motyw i status to liczby z zakresu, długość każdego pola jest przycinana,
- zdjęcie awatara ładuje się bez nagłówka `Referer`,
- uszkodzony lub ucięty link pokazuje czytelny komunikat zamiast pustej strony.

Sprawdzone w Chrome: link z `<img onerror>` w imieniu i `javascript:` w adresach projektu, profilu i awatara nie wykonał żadnego skryptu.

## Ograniczenia

- Podgląd linku w komunikatorach (miniatura z tytułem) jest ogólny, a nie spersonalizowany, bo bez serwera nie da się wygenerować znaczników Open Graph dla każdej wizytówki. Dlatego jest „Kopiuj jako hiperłącze”: tam, gdzie wklejanie obsługuje formatowanie, link ma podpis z imieniem.
- Formularz zapytania otwiera program pocztowy klienta (`mailto:`). Gdy klient go nie ma, zostaje „Kopiuj treść”.
- Zdjęcie trzeba podać jako adres, bo plik graficzny nie zmieściłby się w linku.
- Zmiana wizytówki oznacza nowy link („Edytuj kopię” → poprawki → nowy adres). Stare linki działają dalej i pokazują starą wersję.
- Wymagana przeglądarka z `CompressionStream` / `DecompressionStream` (`deflate-raw`): Chrome/Edge 103+, Firefox 113+, Safari 16.4+.
- Fonty ładują się z Google Fonts w tle, wizytówka tylko te ze swojego motywu. Bez internetu strona działa na fontach systemowych.

## Pliki

```
index.html        kreator i wizytówka w jednym pliku (tryb wybiera adres: #w… = wizytówka)
css/karta.css     wygląd wizytówki i sześć motywów
css/edytor.css    kreator, okna QR i stopki maila, arkusz do druku, tryb wizytówki
js/kod.js         pakowanie danych, kompresja deflate, base64url, daty
js/karta.js       rysowanie wizytówki, status według daty, zapytanie o wycenę, platformy, vCard
js/przyklady.js   sześć przykładowych wizytówek (fikcyjne osoby, domeny .example)
js/app.js         kreator, podgląd, link, QR, hiperłącze, stopka, druk, wersja robocza
lib/qrcode.js     generator kodów QR (Kazuhiko Arase, licencja MIT), ładowany przy pierwszym użyciu
```

Wersja robocza formularza zapisuje się w `localStorage` tej przeglądarki, żeby nic nie przepadło po odświeżeniu strony. Przykładowe osoby i firmy są zmyślone, ich adresy leżą w zarezerwowanej domenie `.example`.
