# Dziesiątka

Kurs bezwzrokowego pisania na klawiaturze dla kogoś, kto dziś pisze dwoma palcami i patrzy na klawisze. Prowadzi od klawiszy F i J do pełnej klawiatury z polskimi znakami, cyframi i symbolami, a potem pomaga dojść do szybkiego i czystego pisania: 34 lekcje w 6 etapach, klawiatura ekranowa z kolorami palców i dłońmi, trening dobierany pod najsłabsze litery, testy prędkości, statystyki każdego klawisza i gra na rozluźnienie.

## Jak powstał

Dzień 18 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** czwartek, 12.11.2026, godz. 22:01 (11.11 to święto, więc dzień 17 i 18 dzieli wolny dzień)
- **Model:** Claude Fable 5.2 (`claude-fable-5-2`) w Claude Code
- **Czas pracy modelu:** ok. 40 minut. Pracował w dwóch podejściach po ok. 20 minut (czwartek wieczorem do 22:21 i piątek rano 07:12–07:31). Przerwa nocna i czekanie na autora nie są wliczone; liczone z zapisu sesji, a nie jako odstęp od początku do końca
- **Poprawki:** brak. Po prompcie padły tylko dwie wiadomości „kontynuuj” (wznowienie przerwanej pracy), bez żadnych uwag do projektu. Późniejsza prośba o commit nie zmieniała kodu aplikacji
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz aplikacje do nauki bezwrzokowego pisania na klawiaturze, która pozwoli komuś kto pisze dwoma palcami i patrzy na klawiaturę przejść na szybkie bezwrokowe i obarczone niskim poziomem błędów pisanie na klawiaturze komputerowej. Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Strona otworzy się w przeglądarce (Chrome, Edge, Firefox, Safari). Nie trzeba niczego instalować ani budować, nie są potrzebne biblioteki ani internet. Potrzebna jest fizyczna klawiatura z układem „Polski (programisty)”, czyli standardowym w Polsce. Postępy zapisują się w przeglądarce.

## Jak to uczy

Pisanie dwoma palcami opiera się na wzroku, pisanie bezwzrokowe na pamięci ruchowej. Aplikacja pilnuje więc trzech rzeczy:

1. **Wzrok zostaje na ekranie.** Klawiatura na ekranie pokazuje następny klawisz i palec, którym trzeba go nacisnąć (także Shift przeciwną ręką i prawy Alt przy polskich znakach). Po pomyłce na czerwono zapala się klawisz, w który faktycznie trafił palec, więc można się poprawić bez zerkania w dół.
2. **Dokładność przed prędkością.** W nauce kursor domyślnie czeka na właściwy klawisz, krok lekcji wymaga 90% trafień za pierwszym razem, a gwiazdki są za dokładność (95% i 98%), nie za tempo.
3. **Podpowiedzi znikają stopniowo.** Każda lekcja kończy się krokiem bez wskazywania klawiszy, klawiaturę można przełączyć na same kolory albo ukryć, a testy zawsze odbywają się bez podpowiedzi.

Przy pierwszym uruchomieniu aplikacja proponuje minutowy pomiar „po staremu”. Ten punkt startowy widać potem na wykresie prędkości i w wynikach testów.

## Co jest w środku

**Dziś.** Plan dnia w trzech krokach (rozgrzewka, kolejna lekcja, pomiar), pierścień celu dziennego, seria dni, prędkość i dokładność z ostatnich ćwiczeń, litery do poprawy.

**Kurs: 34 lekcje w 6 etapach.**

| Etap | Lekcje |
|---|---|
| 1. Rząd podstawowy | F J, D K, S L, A ;, G H, powtórka |
| 2. Rząd górny | E I, R U, T Y, O W, P Q, powtórka |
| 3. Rząd dolny | N M, V B, C i przecinek, X i kropka, Z, powtórka wszystkich liter |
| 4. Wielkie litery i interpunkcja | lewy Shift, prawy Shift, pierwsze zdania, ? !, - : " |
| 5. Polskie znaki | ą ę, ś ć, ż ź, ł ó ń, wielkie polskie litery, polskie zdania |
| 6. Cyfry i symbole | 1–5, 6–0, ( ) @ /, + = % _ #, egzamin końcowy |

Lekcja z nowymi klawiszami ma cztery kroki: suchy dryl nowych klawiszy z klawiszem „domowym” tego samego palca, połączenia z poznanymi wcześniej literami, prawdziwe słowa i krok bez podpowiedzi. Teksty są za każdym razem losowane, więc lekcji nie da się wykuć na pamięć.

**Trening.** Dziewięć trybów: trening inteligentny, 200 najczęstszych słów, zdania i przysłowia, polskie znaki, dwuznaki (sz, cz, rz, ch, dz), wielkie litery z interpunkcją, cyfry, symbole i własny wklejony tekst (przepisywany po kawałku, z zapamiętaniem miejsca).

**Test.** 1, 2 albo 5 minut ciągłego tekstu z poprawianiem błędów. Wynik w znakach na minutę (albo w słowach na minutę), rekord, porównanie z punktem startowym, historia testów.

**Gra „Deszcz słów”.** Słowa spadają z nieba, trzeba je wpisać, zanim dotkną ziemi. Pięć żyć, rosnące tempo, rekord. Korzysta z liter poznanych w kursie albo z całego słownika.

**Statystyki.** Wykresy prędkości i dokładności z linią punktu startowego, mapa klawiatury (pomyłki albo czas reakcji każdego klawisza), odsetek pomyłek każdego palca, lista najczęstszych zamian („zamiast E wpisujesz R”), kalendarz regularności z 14 tygodni i tabela ćwiczeń.

**Poradnik.** Pozycja wyjściowa, który palec obsługuje który klawisz, pięć zasad, Shift i prawy Alt, postawa, sposoby na oduczenie się zerkania, plan na cztery tygodnie i częste pytania.

**Ustawienia.** Zachowanie po pomyłce, podpowiedzi klawiatury, dłonie, cel dzienny, docelowa prędkość, jednostka, rozmiar tekstu, motyw jasny i ciemny, dźwięki, odblokowanie wszystkich lekcji, kopia postępów do pliku i jej wczytanie. W ćwiczeniu można też włączyć metronom, który wybija równe tempo.

## Jak działa silnik

- **Pomiar.** Każde uderzenie jest porównywane z oczekiwanym znakiem. Dokładność to odsetek znaków trafionych za pierwszym razem, prędkość liczy tylko poprawne znaki. Z każdej przerwy do czasu ćwiczenia wlicza się najwyżej 4 sekundy, więc zamyślenie nie psuje wyniku (w teście czas biegnie bez przerw).
- **Statystyki klawiszy.** Dla każdego znaku aplikacja pamięta liczbę uderzeń, pomyłek, wygładzoną dokładność i wygładzony czas reakcji. Z tego liczy „pewność” litery: dokładność pomnożoną przez zbliżenie do docelowej prędkości.
- **Trening inteligentny.** Litery o najniższej pewności dostają większą wagę, a słowa ze słownika są losowane z prawdopodobieństwem zależnym od wag swoich liter. Trzy najsłabsze litery widać przed rundą i po niej.
- **Generator ćwiczeń.** Słownik ma 1343 polskie słowa, do tego 205 zdań i przysłów, 20 akapitów do testów oraz 142 imiona i nazwy miast. Do każdej lekcji generator wybiera tylko to, co da się napisać poznanymi klawiszami. Gdy prawdziwych słów jest za mało (pierwsze lekcje), tworzy pseudosłowa z łańcucha przejść między literami zbudowanego ze słownika, więc brzmią mniej więcej po polsku.
- **Rozpoznawanie znaków.** Aplikacja czyta znak wpisany przez system, więc polskie litery z prawym Altem działają tak jak w każdym innym programie. Ostrzega o włączonym Caps Locku i o układzie klawiatury innym niż „Polski (programisty)”.

## Technika

- HTML, CSS i JavaScript bez budowania i bez bibliotek; klawiatura i dłonie rysowane w HTML i SVG, wykresy w SVG.
- Dźwięki (stuknięcie klawisza, pomyłka, metronom, gwiazdki) syntezowane na żywo w Web Audio, bez plików.
- Działa offline; postępy w `localStorage`, nic nie jest wysyłane do internetu.
- Jasny i ciemny motyw, układ dopasowany do niskich ekranów laptopów i do telefonu (do samej nauki potrzebna jest jednak fizyczna klawiatura).

## Struktura

```
index.html         – układ: nawigacja, gra, poradnik, arena pisania
css/style.css      – wygląd, motywy, kolory palców, wersja na małe ekrany
js/dane.js         – palce, układ klawiatury, 34 lekcje, słownik, zdania, przysłowia, teksty testów
js/silnik.js       – sesja pisania (pomiar, błędy, czasy) i generator ćwiczeń
js/klawiatura.js   – klawiatura ekranowa, dłonie, mapa ciepła
js/dzwiek.js       – dźwięki
js/gra.js          – gra „Deszcz słów”
js/app.js          – widoki, postępy, kurs, trening, testy, statystyki, ustawienia
```
