# Linkówka

Kreator jednostronicowych wizytówek dla freelancerów, **bez bazy danych i bez serwera**. Wypełniasz kilka pól: imię, krótkie bio, trzy najlepsze projekty i kontakt. Dostajesz estetyczną, responsywną stronę i link, w którym ta strona jest zapisana w całości. Wysyłasz go klientowi, wklejasz w stopkę maila albo pokazujesz jako kod QR.

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
- Po prawej stronie widać **podgląd na żywo** (przełącznik „Telefon” / „Komputer”) i **Twój link** z przyciskami: Kopiuj link, Otwórz, Kod QR, Udostępnij.
- Na telefonie podgląd jest pod formularzem, a na dole ekranu jest pasek z przyciskami „Podgląd” i „Kopiuj link”.

**Otwarte z pliku (`file://`):** link do skopiowania prowadzi do wersji online (`1prompt1zdanie.vibemaster.pl/15-…`), bo adres `file:///C:/…` nie działa u nikogo poza Twoim komputerem. Przycisk „Otwórz” pokazuje wizytówkę z lokalnego pliku.

## Co jest w formularzu

1. **Kim jesteś:** imię i nazwisko (jedyne wymagane pole), czym się zajmujesz, miasto, bio (do 360 znaków, Enter robi nowy akapit), dostępność (Przyjmuję zlecenia / Wolne terminy wkrótce / Grafik pełny, z pulsującą kropką), stawka, awatar (emoji, inicjały albo link do zdjęcia, np. `https://github.com/login.png`).
2. **Trzy najlepsze projekty:** nazwa, link, opis efektu i etykieta (np. „Branding · 2025”).
3. **Kontakt:** e-mail, telefon i do czterech profili. Platformę aplikacja rozpoznaje sama (LinkedIn, GitHub, Behance, Dribbble, Instagram, X, YouTube, Vimeo, Bluesky, Calendly i ok. 20 innych).
4. **Wygląd:** sześć motywów i kolor akcentu (12 gotowych albo dowolny własny).

| Motyw | Charakter |
| --- | --- |
| Papier | redakcyjny, ciepły papier z ziarnem, szeryfowy Fraunces, nazwisko kursywą |
| Atrament | ciemny, poświata w kolorze akcentu, delikatna siatka |
| Brutal | neobrutalizm: grube ramki, twarde cienie, przekrzywiony awatar |
| Mgiełka | pastelowe, pływające plamy światła, karty z matowego szkła |
| Terminal | monospace, linie jak na monitorze CRT, migający kursor |
| Raster | szwajcarska typografia, ogromne nazwisko, czerwony pas |

## Co ma gotowa wizytówka

- duże imię i nazwisko, rola, bio, status dostępności i lokalizacja,
- przyciski **Napisz do mnie** (mail z tematem „Zapytanie o współpracę”), **Zadzwoń** i **Zapisz kontakt**. Ten ostatni pobiera plik `.vcf`, który dodaje osobę do kontaktów w telefonie,
- trzy projekty jako klikalne karty (na szerokim ekranie jako wiersze lub kafelki, zależnie od motywu),
- kontakt z przyciskami kopiowania e-maila i telefonu,
- pływające przyciski **Kod QR** (do pokazania na spotkaniu albo na wydruku) i **Udostępnij**,
- w stopce **„Edytuj kopię”**: otwiera kreator wypełniony danymi z linku.

Układ dopasowuje się do szerokości (container queries), więc podgląd „Telefon” w kreatorze wygląda dokładnie jak prawdziwy telefon.

## Jak dane mieszczą się w linku

1. Formularz zamienia się w zwartą tablicę: same wartości, bez nazw pól, bez `https://` i bez pustych końcówek.
2. Tablica jako JSON przechodzi przez **deflate** (wbudowane w przeglądarkę `CompressionStream`) i zapis **base64url**.
3. Wynik trafia za `#w` w adresie: `…/index.html#w1VVLBahsxEP2V…`. Pierwszy znak to wersja zapisu (`1` – skompresowany, `0` – bez kompresji, jeśli tak wychodzi krócej).

Typowa wizytówka to **800–1000 znaków** linku (przykłady: od ok. 800 do 950). Kreator pokazuje długość na bieżąco i ostrzega powyżej 4000 znaków. Część po `#` nie jest wysyłana do żadnego serwera, więc dane widzi tylko ten, kto dostanie link.

## Bezpieczeństwo

Link może przygotować każdy, więc wizytówka traktuje jego zawartość jak niezaufane dane:

- tekst trafia na stronę wyłącznie jako tekst (`textContent`), nigdy jako HTML,
- linki przechodzą tylko z protokołem `http`/`https`, więc `javascript:` i podobne odpadają,
- kolor akcentu musi mieć postać `#rrggbb`, motyw i status to liczby z zakresu, długość każdego pola jest przycinana,
- zdjęcie awatara ładuje się bez nagłówka `Referer`,
- uszkodzony lub ucięty link pokazuje czytelny komunikat zamiast pustej strony.

Sprawdzone w Chrome: link z `<img onerror>` w imieniu i `javascript:` w adresach projektu, profilu i awatara nie wykonał żadnego skryptu.

## Ograniczenia

- Podgląd linku w komunikatorach (miniatura z tytułem) jest ogólny, a nie spersonalizowany, bo bez serwera nie da się wygenerować znaczników Open Graph dla każdej wizytówki.
- Zdjęcie trzeba podać jako adres, bo plik graficzny nie zmieściłby się w linku.
- Zmiana wizytówki oznacza nowy link („Edytuj kopię” → poprawki → nowy adres). Stare linki działają dalej i pokazują starą wersję.
- Wymagana przeglądarka z `CompressionStream` / `DecompressionStream` (`deflate-raw`): Chrome/Edge 103+, Firefox 113+, Safari 16.4+.
- Fonty ładują się z Google Fonts w tle. Bez internetu strona działa na fontach systemowych.

## Pliki

```
index.html        kreator i wizytówka w jednym pliku (tryb wybiera adres: #w… = wizytówka)
css/karta.css     wygląd wizytówki i sześć motywów
css/edytor.css    kreator, okno QR, tryb wizytówki
js/kod.js         pakowanie danych, kompresja deflate, base64url
js/karta.js       rysowanie wizytówki, rozpoznawanie platform, vCard
js/przyklady.js   sześć przykładowych wizytówek (fikcyjne osoby, domeny .example)
js/app.js         kreator, podgląd, link, QR, udostępnianie, wersja robocza
lib/qrcode.js     generator kodów QR (Kazuhiko Arase, licencja MIT)
```

Wersja robocza formularza zapisuje się w `localStorage` tej przeglądarki, żeby nic nie przepadło po odświeżeniu strony. Przykładowe osoby i firmy są zmyślone, ich adresy leżą w zarezerwowanej domenie `.example`.
