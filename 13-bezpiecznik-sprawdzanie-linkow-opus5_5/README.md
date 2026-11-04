# Bezpiecznik

Sprawdzacz podejrzanych linków dla osób, które nie znają się na komputerach. Na ekranie jest tylko jedno duże pole. Wklejasz do niego link z SMS-a albo e-maila (albo całą wiadomość, link Bezpiecznik znajdzie sam), a po 1–3 sekundach cały ekran robi się **jaskrawozielony** („BEZPIECZNY”) albo **jaskrawoczerwony** („OSZUSTWO! Nie klikaj w ten link”). Przy czerwonym wyniku są powody opisane prostymi słowami i trzy kroki, co zrobić dalej (m.in. bezpłatne przesłanie SMS-a na numer 8080 do CERT Polska).

Aplikacja ma dwa kolory: zielony i czerwony. Reszta jest czarno-biała (w trybie ciemnym odwrócona).

> **To projekt pokazowy.** Wyniki mogą być niedokładne: zielony nie gwarantuje, że link jest bezpieczny, a czerwony nie przesądza, że to oszustwo. Bazy oszustów nie znają stron założonych przed chwilą, a Bezpiecznik widzi tylko adres i treść wiadomości, nie samą stronę. Ta informacja jest też na ekranie startowym i drobnym druczkiem na ekranie wyniku.

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
| [Lista Ostrzeżeń CERT Polska](https://cert.pl/lista-ostrzezen/) | ok. 125 tys. domen oszustów podszywających się pod polskie firmy i urzędy (w porcjach, patrz „Rozwój po eksperymencie”) |
| [OpenPhish](https://openphish.com) – darmowa lista | aktualne adresy stron wyłudzających dane |
| [Phishing.Database](https://github.com/Phishing-Database/Phishing.Database) | ok. 390 tys. aktywnych domen oszustów (w porcjach) |
| RDAP (rejestry domen: NASK dla .pl, Verisign dla .com/.net, pozostałe według spisu IANA, w ostateczności rdap.org) | data rejestracji domeny; strona sprzed mniej niż 30 dni to czerwony alarm |

**Sztuczki oszustów sprawdzane na urządzeniu:**

- podszywanie się pod ok. 50 marek, pod które najczęściej podszywają się oszuści w Polsce (InPost, Allegro, OLX, Poczta Polska, DPD, DHL, banki, BLIK, mObywatel i gov.pl, PGE, Vinted, Netflix, Apple, Microsoft, Meta…), np. `inpost.pl-doplata.top`, `mobywatel-gov.info`;
- literówki i cyfry zamiast liter (`santnader.pl`, `alegro`, `4llegro.pl`), także zamiana sąsiednich liter;
- podrobione litery z cyrylicy i greki (punycode `xn--…` jest dekodowany i pokazywany);
- skrócone linki (bit.ly, tinyurl i ok. 60 innych), adres IP zamiast nazwy, adres schowany za `@`, pliki `.apk`/`.exe`, ukryty kod `javascript:`;
- słabsze sygnały, które liczą się dopiero razem: końcówki lubiane przez oszustów (`.top`, `.xyz`, `.click`, `.shop`…), słowa-wabiki („dopłata”, „paczka”, „weryfikacja”, „login”…), darmowy hosting, wiele myślników i członów, brak https, nietypowy port, młoda domena.

**Werdykt:** jeden mocny sygnał albo kilka słabszych naraz (≥ 2 punkty) daje czerwony ekran, tak samo jak znany schemat oszustwa w treści wiadomości. Zielony pojawia się tylko wtedy, gdy odpowiedział filtr Cloudflare i przynajmniej jedna duża lista (CERT albo Phishing.Database) i nic nie znalazły. Jeśli nie udało się nic sprawdzić (np. brak internetu), ekran też jest czerwony („Nie klikaj – nie udało się sprawdzić”) z przyciskiem „Spróbuj ponownie”. Ok. 150 znanych polskich i światowych serwisów jest na liście zaufanych.

**Prywatność:** nic nie jest zapisywane. Na zewnątrz trafia tylko nazwa strony (zapytanie DNS i RDAP), nigdy cały link. Z list CERT i Phishing.Database strona pobiera tylko porcję o numerze ze skrótu nazwy (jedną z 1024, więc numer nie zdradza adresu) i porównuje ją na urządzeniu. Lista OpenPhish (kilkanaście KB) pobiera się w całości. Treść wiadomości jest czytana tylko na urządzeniu.

## Rozwój po eksperymencie

04.11.2026 projekt ocenili czterej agenci (`ocena-ux`, `ocena-design`, `ocena-optymalizacja`, `rozwoj-produktu`) na komputerze i telefonie, z prawdziwym internetem i na ok. 700 adresach (prawdziwe serwisy, świeże domeny z listy CERT Polska, OpenPhish, całe wiadomości). Wnioski: wygląd 8/10, UX 6/10 (forma 9, trafność 5), wydajność 5/10. Najgroźniejsze były zielone ekrany dla oszustw „na dziecko” i próśb o BLIK z prawdziwym linkiem (wa.me, facebook.com), połowa oszustw z pierwszych godzin po wpisie do CERT, fałszywe „OSZUSTWO!” na prawdziwych serwisach (Mój TAURON, InPost Pay, dhl24.com.pl, „w drodze.Do” w SMS-ie InPostu) i 3,7 MB listy pobierane przy każdym otwarciu (na telefonie do 2 s zamrożenia). Wdrożone zmiany:

- **Lista Ostrzeżeń CERT Polska i małe porcje list.** CERT nie wysyła nagłówka CORS, więc przeglądarka nie może pobrać listy wprost. Automat GitHub Actions (`.github/workflows/bezpiecznik-dane.yml`, skrypt `.github/scripts/bezpiecznik_dane.py`) co godzinę pobiera listy CERT i Phishing.Database, dzieli je na 1024 porcje według skrótu FNV-1a nazwy i odkłada na gałąź `bezpiecznik-dane` (zawsze jeden commit, historia nie rośnie). Strona pobiera z `raw.githubusercontent.com` tylko porcję, w której może być sprawdzana domena (ok. 7 KB), więc nie ściąga 3,7 MB, nie trzyma w pamięci 390 tys. napisów, a z zapytania nie da się odczytać, jaki adres sprawdzasz. Gdy porcje są nieosiągalne, zapasem jest pełna lista Phishing.Database. W „Co sprawdziliśmy” widać godzinę aktualizacji listy.
- **Treść wiadomości.** Wklejony SMS albo e-mail jest czytany pod kątem 9 znanych schematów: „na dziecko” (nowy numer + mamo/tato/WhatsApp), prośba o kod BLIK, o dane karty lub PIN, instalacja AnyDesk/TeamViewer, fałszywa blokada konta, „bezpieczne konto”, inwestycja z gwarantowanym zyskiem, fałszywa wygrana, płatne numery 70x. Każdy schemat wymaga kilku rzeczy naraz i pomija ostrzeżenia banków („nigdy nie podawaj kodu BLIK”), więc zwykłe wiadomości nie dają alarmu. Działa też dla wiadomości bez linku.
- **Trafność.** Słowa w środku zdania („w drodze.Do”, „m.in.”) nie są brane za adresy, gdy w wiadomości jest prawdziwy link. Dopisane oficjalne domeny (InPost Pay, Mój TAURON, Pekao BH, Lidl, cała końcówka `.dhl`), nowe marki i hostingi z listy CERT (ALDI, PKO Biznes, lovable.app), wyjątki literówek (finance, gogle, allegra). Phishing.Database nie oskarża oficjalnych domen marek, a przy stronach działających od lat jest tylko sygnałem. Linki do rozmów z nieznajomym (wa.me, t.me) i formularze na darmowych usługach liczą się mocniej. Zielony ekran wymaga odpowiedzi Cloudflare i przynajmniej jednej dużej listy. Skrócony link ma napis „Nie klikaj!” zamiast „Oszustwo!”, a nieznana strona „Nie znaleźliśmy oszustwa” zamiast „Ten link jest w porządku”. Wiek domeny spoza .pl/.com/.net według spisu rejestrów IANA (rdap.org często odpowiadał „za dużo zapytań”), wynik zapamiętany w sesji, czekanie najwyżej 2,5 s.
- **Na telefonie:** instalacja jako aplikacja (manifest, ikony, praca bez sieci dla samej strony) i **„Udostępnij → Bezpiecznik”** na Androidzie: wiadomość trafia od razu do sprawdzenia, bez kopiowania. Na czerwonym ekranie przyciski **„Zgłoś SMS do CERT (8080)”** (gotowy SMS z treścią) i **„Ostrzeż rodzinę”** (domena zapisana tak, żeby nie dała się kliknąć). Gest Wstecz zamyka wynik zamiast strony, a „Sprawdź inny link” jest przyklejony do dołu ekranu.
- **Wygląd i dostępność:** czerwień `#e00000` (biały tekst ma kontrast 5:1), widoczna ramka fokusu na wszystkich przyciskach, najpierw „Co teraz zrobić?”, potem dwa najważniejsze powody i reszta po kliknięciu, osobna ikona ze znakiem zapytania dla „nie udało się sprawdzić”, krzyżyki zamiast kropek na czerwonym, rysowane znaczki w tabeli, większe przyciski przykładów, luźniejsze litery w nagłówkach, `inert` i `aria-modal` na ekranie wyniku, ogłoszenie „Sprawdzam link” dla czytników ekranu, podpowiedź przy pytaniu o schowek.
- **Wydajność i niezawodność:** krój Archivo we własnych plikach (zawieszone Google Fonts blokowały stronę), limit czasu obejmuje całą odpowiedź, kontrola formatu list (pusty plik albo zmiana formatu nie daje już zielonego), przerwa minuty po nieudanym pobraniu, jeden pomiar przy dopasowaniu nagłówka zamiast pętli, usypianie dźwięku. Link „← Wszystkie projekty” i tagi `og:`.

## Dla osób nietechnicznych

- Przycisk **„Wklej link”** sam pobiera link ze schowka. Gdy przeglądarka na to nie pozwala, pojawia się podpowiedź („Przytrzymaj palec w polu i wybierz Wklej” albo „Ctrl+V”).
- Sprawdzanie rusza samo zaraz po wklejeniu.
- Wynik zajmuje cały ekran: ogromny napis, ikona, nazwa strony, krótkie powody. Na telefonie towarzyszy mu wibracja i krótki dźwięk.
- Duże litery i przyciski, pełna obsługa klawiaturą (Enter sprawdza, Esc wraca), odczyt przez czytniki ekranu, tryb ciemny, ograniczony ruch dla osób, które go wyłączyły.

## Technika

- HTML, CSS i JavaScript bez budowania i bez bibliotek. Krój Archivo we własnych plikach (licencja OFL).
- Zwykłe skrypty zamiast modułów ES, żeby strona działała z `file://`.
- Wszystkie źródła mają nagłówek `Access-Control-Allow-Origin: *`, więc nie potrzeba serwera ani pośrednika.
- Każde zapytanie ma limit czasu obejmujący całą odpowiedź (DNS 4,5 s, porcja listy 6 s, wiek domeny najwyżej 2,5 s). Wynik przychodzi zwykle w 1–3 s.

## Struktura

```
index.html            – trzy ekrany: pole, „Sprawdzam…”, wynik na cały ekran
css/style.css         – wygląd (czerń i biel + jaskrawa zieleń i czerwień), wersja na telefon, tryb ciemny
css/fonts/            – krój Archivo (latin, latin-ext) i licencja OFL
js/dane.js            – marki i ich prawdziwe domeny, zaufane serwisy, skracacze, darmowe hostingi, końcówki, słowa-wabiki, schematy oszustw w treści
js/analiza.js         – wyłuskiwanie linków, rozbiór adresu, punycode, sztuczki oszustów, treść wiadomości, porcje list, zapytania do źródeł, werdykt
js/app.js             – interfejs: schowek, kroki sprawdzania, wynik, zgłoszenie i ostrzeżenie, udostępnianie, instalacja, dźwięk i wibracja
manifest.webmanifest  – aplikacja na telefon i cel „Udostępnij”
sw.js                 – praca bez sieci dla samej strony
ikony/                – ikony aplikacji

../.github/workflows/bezpiecznik-dane.yml – co godzinę: listy CERT i Phishing.Database w 1024 porcjach na gałęzi bezpiecznik-dane
../.github/scripts/bezpiecznik_dane.py    – skrypt, który buduje porcje
```
