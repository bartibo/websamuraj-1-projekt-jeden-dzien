# Retorta

Wirtualne laboratorium chemiczne dla ucznia (szkoła podstawowa i liceum). Na stole stoją zlewki, probówki, kolba i tygiel, na półce jest 80 odczynników: kwasy, zasady, sole, metale, tlenki, wskaźniki i substancje organiczne. Wszystko można ze sobą mieszać, ogrzewać, chłodzić, spalać i przelewać, a silnik chemiczny liczy, co naprawdę by się stało: jakie jony są w roztworze, co się wytrąci, jaki gaz się wydzieli, jakie będzie pH i temperatura. Do tego 58 zadań w 8 rozdziałach (z quizem za gwiazdkę), zagadki detektywa z tajemniczymi probówkami, księga 198 odkryć i układ okresowy.

## Jak powstał

Dzień 16 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** poniedziałek, 09.11.2026, godz. 18:45
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 45 minut
- **Poprawki:** brak. Po prompcie nie było żadnej kolejnej wiadomości dotyczącej projektu (późniejsza prośba o wrzucenie na GitHub nie zmieniała kodu)
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz aplikację, która pozwala uczniowi uuczyć się przedmiotu Chemia poprzez eksperymentowanie z różnymi substancjami i składnikami i która wykonać dziesiątki zadań oraz daje możliwość zabawy poprzez sanbox (mieszanie czy łączenie różnych substancji) Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Strona otworzy się w przeglądarce (Chrome, Edge, Firefox, Safari). Nie trzeba niczego instalować ani budować, nie są potrzebne biblioteki ani internet. Działa myszką, palcem i klawiaturą. Postęp (gwiazdki, odkrycia) zapisuje się w przeglądarce.

## Co jest w środku

**Piaskownica.** Zaznacz naczynie, wybierz porcję (kropla, 1, 5 lub 20 cm³ albo szczypta, 1, 3 lub 10 g) i kliknij odczynnik, albo przeciągnij go prosto na naczynie. Pod każdym naczyniem: palnik, łaźnia lodowa, mieszanie bagietką, rurka do odprowadzania gazu do innego naczynia, przelewanie, wylewanie. Na dole narzędzia badawcze:

| Narzędzie | Do czego |
|---|---|
| Żarzące się łuczywko | rozbłyska w tlenie |
| Płonące łuczywko | „pyk” w wodorze, gaśnie w CO₂, zapala etanol |
| Papierek wskaźnikowy | pH cieczy albo gaz nad naczyniem (amoniak, gazy kwasowe) |
| Woda wapienna | mętnieje od CO₂ |
| Nos | zapach amoniaku, siarkowodoru, SO₂, octu, estru, alkoholu… (z pouczeniem, jak wąchać) |
| Słomka | dmuchanie CO₂ z oddechu (przytrzymaj) |
| Drucik | próba płomieniowa: Na, K, Li, Ca, Sr, Ba, Cu |

Czas można zatrzymać i przyspieszyć do ×10 (przydaje się przy ogrzewaniu i odparowywaniu).

**Po prawej** widać skład zaznaczonego naczynia (kationy, aniony, cząsteczki, osady, w mmol i mol/dm³), temperaturę, pH na skali, gazy nad cieczą, **widok cząsteczkowy** (jony i cząsteczki pływające w wodzie, sieć krystaliczna osadów) i **dziennik obserwacji**, w którym każde zjawisko ma opis i równanie reakcji (cząsteczkowe albo jonowe skrócone).

**58 zadań w 8 rozdziałach:**

1. Pierwsze kroki w pracowni: roztwór, rozpuszczanie, wrzenie, odparowanie, emulsja, roztwór nasycony i krystalizacja saletry.
2. Kwasy, zasady i wskaźniki: fenoloftaleina, lakmus, tęcza z czerwonej kapusty, zobojętnianie, idealne pH 7 (bez pH-metru), mocny i słaby kwas, kwaśny deszcz ze spalonej siarki, oddech zakwaszający wodę.
3. Reakcje strąceniowe: AgCl, Cu(OH)₂ i CuO, złoty deszcz PbI₂, BaSO₄ kontra BaCO₃, dwa wodorotlenki żelaza, galeria osadów, amfoteryczny glin, lazurowy kompleks miedzi, krwawa reakcja Fe³⁺ z rodankiem.
4. Gazy: wulkan z sody i octu, zestaw z rurką do wody wapiennej, mętnienie i klarowanie wody wapiennej, wodór, tlen, amoniak, siarkowodór z syntezy FeS.
5. Metale: szereg aktywności, miedziowanie, srebrne drzewko, sód na wodzie, spalanie magnezu i tlenek zasadowy, glin w zasadzie, miedź w kwasie azotowym(V).
6. Energia i szybkość reakcji: ogrzewacz i okład chłodzący, pasta do zębów dla słonia, znikający krzyżyk (temperatura a szybkość), katalizator i enzym katalaza z ziemniaka, czarny wąż z cukru, bezpieczne rozcieńczanie kwasu, prażenie CuSO₄·5H₂O i KMnO₄.
7. Chemia życia: skrobia i jod, próby Trommera i Tollensa (lustro srebrne), białko (denaturacja, reakcja biuretowa i ksantoproteinowa), estryfikacja, kameleon chemiczny, zegar jodowy.
8. Chemiczny detektyw: 6 zagadek z losowo pomieszanymi probówkami (kwas, zasada czy woda; trzy sole sodu; płomienie; halogenki; białe wodorotlenki Al, Zn, Mg; cukry i skrobia). Skład i pH-metr są wtedy ukryte.

Każde zadanie ma listę celów sprawdzanych na żywo, podpowiedzi, wyjaśnienie po wykonaniu i pytanie quizowe. Gwiazdki: za wykonanie, bez podpowiedzi i za dobrą odpowiedź w quizie (w zagadkach: za trafienie za pierwszym razem). Zadania nie zamykają półki: zaznaczając „pokaż wszystkie odczynniki”, można eksperymentować dalej.

**Księga odkryć** zbiera 198 zjawisk: 50 osadów, 10 gazów, 25 barw wskaźników, 7 barw płomieni i 106 reakcji, testów i zjawisk. Zakryte karty podpowiadają, czego spróbować.

**Układ okresowy** ma 118 pierwiastków z polskimi nazwami, masami, kategoriami i stanem skupienia, model powłok dla pierwszych 20 i listę odczynników z półki, które zawierają dany pierwiastek.

## Silnik chemiczny

Naczynie przechowuje ilości substancji w molach: jony i cząsteczki w roztworze, ciała stałe (z informacją, ile jest w zawiesinie, a ile opadło), gazy nad cieczą, objętość wody, etanolu i oleju, temperaturę. W każdym kroku (0,05 s czasu symulacji):

- **Ciepło:** palnik, łaźnia lodowa i stygnięcie (prawo Newtona), pojemność cieplna wody, szkła i ciał stałych, wrzenie przy stałej temperaturze, odparowanie do sucha i krystalizacja, ciepła reakcji i rozpuszczania (zobojętnianie 57 kJ/mol, NaOH, CaCl₂ i CaO grzeją, NH₄NO₃ i KNO₃ chłodzą, rozcieńczanie stężonego H₂SO₄).
- **Reakcje jonowe (natychmiastowe):** zobojętnianie, protonowanie słabych zasad i kwasów (NH₃, CH₃COO⁻, CO₃²⁻, HCO₃⁻, S²⁻), strącanie z tabeli 50 par jon–jon (z rozpuszczalnością dla soli trudno rozpuszczalnych, np. Ca(OH)₂, CaSO₄, PbI₂ i PbCl₂ zależnie od temperatury), roztwarzanie osadów w kwasach, amfoteryczność Al(OH)₃ i Zn(OH)₂, kompleksy amoniakalne Cu, Zn i Ag, Fe(SCN)²⁺, chromian i dichromian, redoks KMnO₄ z H₂O₂ i Fe²⁺, jod z tiosiarczanem, Cu²⁺ z jodkami.
- **Reakcje powolne (kinetyka):** metale z wodą, kwasami i zasadami według szeregu aktywności, wypieranie metali z roztworów, tlenki metali z wodą i kwasami, węglany i siarczki z kwasami, rozkład H₂O₂ z katalizatorami, zegar jodowy, siarka z tiosiarczanu, kameleon, próby Trommera i Tollensa, białka, estryfikacja, zwęglanie cukru, utlenianie Fe(OH)₂ tlenem z powietrza, rozkłady termiczne, synteza FeS, spalanie w tyglu. Szybkość rośnie z temperaturą (ok. 2× na 10 °C), mieszaniem i ilością ciała stałego.
- **Rozpuszczanie i krystalizacja:** dane rozpuszczalności (g/100 g wody od 0 do 100 °C) dla 17 soli i cukrów, więc roztwór może być nasycony, a po ochłodzeniu wypadają kryształy.
- **pH** liczone z nadmiaru mocnego kwasu lub zasady (z autodysocjacją wody), a w roztworach buforowych i słabych elektrolitów ze stałych pKa (kwas octowy, NH₄⁺/NH₃, CO₂/HCO₃⁻/CO₃²⁻, hydroliza soli Fe³⁺, Al³⁺, Cu²⁺…). Barwy 6 wskaźników zależą od pH.
- **Gazy** wydzielają się jako pęcherzyki, gromadzą nad cieczą (to je wykrywają łuczywka, papierek i nos) albo płyną rurką do innego naczynia, gdzie się rozpuszczają (CO₂ w wodzie wapiennej, SO₂ w wodzie, NH₃…).

Model jest uproszczony (np. stałe szybkości są dobrane tak, żeby doświadczenia trwały sekundy, a nie minuty), ale jakościowo i stechiometrycznie zgodny z tym, co uczeń zobaczy w pracowni.

## Bezpieczeństwo

Przy odczynnikach są piktogramy zagrożeń GHS i opisy. Aplikacja pokazuje też to, czego nie robi się w szkole: wlanie wody do stężonego kwasu kończy się pryskaniem i lekcją „wlewaj zawsze kwas do wody”, większy kawałek sodu wywołuje ostrzeżenie, a przy siarkowodorze, związkach ołowiu, baru i chromu są informacje o toksyczności.

## Technika

- HTML, CSS i JavaScript bez budowania i bez bibliotek; grafika stołu i widoku cząsteczkowego rysowana na `<canvas>`.
- Dźwięki (nalewanie, sypanie, bulgotanie, szum palnika, „pyk”, błysk magnezu, fanfary) syntezowane na żywo w Web Audio, bez plików.
- Działa offline; postęp w `localStorage`.

## Struktura

```
index.html        – układ: start, zadania, laboratorium, księga odkryć, układ okresowy
css/style.css     – wygląd, wersja na tablet i telefon
js/dane.js        – pierwiastki, jony, substancje stałe, tabela strąceń, wskaźniki, płomienie, gazy, odczynniki
js/silnik.js      – naczynia, ciepło, reakcje jonowe i powolne, rozpuszczalność, pH, gazy, testy, barwy
js/rysowanie.js   – stół laboratoryjny (szkło, ciecze, osady, pęcherzyki, piana, płomienie, dym) i widok cząsteczkowy
js/zadania.js     – księga odkryć i 58 zadań z celami, podpowiedziami, wyjaśnieniami i quizami
js/dzwiek.js      – dźwięki
js/app.js         – interfejs: półka, narzędzia, inspektor, dziennik, zadania, księga, układ okresowy
```
