# Gumowy czas

Interaktywna piaskownica szczególnej i ogólnej teorii względności dla kogoś, kto nie ma pojęcia o fizyce. Dwa suwaki: **prędkość statku** (od samochodu do 99,9999995 % prędkości światła) i **masa źródła grawitacji** (od Księżyca przez Słońce, białego karła i gwiazdę neutronową po czarną dziurę). Na zsynchronizowanych zegarach widać, jak czas zaczyna płynąć różnie, a animacje pokazują dylatację czasu, skrócenie Lorentza i zakrzywienie czasoprzestrzeni względem nieruchomego obserwatora.

## Jak powstał

Dzień 9 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** czwartek, 29.10.2026, godz. 09:41
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 30 minut
- **Poprawki:** brak. Po prompcie nie było żadnej kolejnej wiadomości dotyczącej projektu (późniejsza prośba o wrzucenie na GitHub nie zmieniała kodu)
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz interaktywny sandbox edukacyjny wizualizujący szczególną i ogólną teorię względności, w którym użytkownik, nie mający pojęcia o fizyce, za pomocą intuicyjnych suwaków może w czasie rzeczywistym manipulować prędkością poruszającego się obiektu (zbliżając się do prędkości światła) oraz masą źródła grawitacji (od planety po czarną dziurę), aby bezpośrednio obserwować i porównywać na zsynchronizowanych zegarach oraz dynamicznych animacjach wynikającą z tych zmian dylatację czasu, skrócenie Lorentza oraz zakrzywienie czasoprzestrzeni względem nieruchomego obserwatora.
> Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Strona otworzy się w przeglądarce (Chrome, Edge, Firefox, Safari).
Nie trzeba niczego instalować ani budować. Działa też bez internetu (wtedy z czcionką systemową).
Tykanie zegarów jest syntezowane na żywo, a każdy zegar ma inny dźwięk, więc dylatację czasu słychać.

## Trzy tryby

**1. Prędkość (szczególna teoria względności)**
- Statek „Kopernik” przelatuje obok ciebie. Im szybciej leci, tym bardziej jest spłaszczony w kierunku ruchu. Przerywany obrys pokazuje jego długość w spoczynku, a pod spodem jedzie jego linijka, którą możesz porównać ze swoją.
- W statku tyka **zegar świetlny**: błysk odbija się między dwoma lusterkami. Ty widzisz, że błysk na statku leci zygzakiem, czyli po dłuższej drodze. A że światło ma zawsze tę samą prędkość, tyknięcia na statku trwają dłużej. Ten sam zegar stoi obok ciebie, więc liczniki tyknięć rozjeżdżają się na oczach.
- **Widok z kokpitu**: tak niebo widzi pilot. Gwiazdy zbiegają się przed dziobem (aberracja światła), z przodu robią się niebieskie i jasne, za plecami czerwone i ciemne (efekt Dopplera).
- Gotowe prędkości: samochód, samolot, ISS, sonda Parker, ½ c, 87 % c (czas płynie dokładnie 2 razy wolniej), 99 % c, mion z promieniowania kosmicznego, 99,99 % c i proton w LHC.
- Do tego lot do Proximy Centauri: ile minie na Ziemi, a o ile postarzeje się załoga.

**2. Grawitacja (ogólna teoria względności)**
- Gumowa płachta czasoprzestrzeni w 3D, ugięta przez ciało w środku (Księżyc, Ziemia, Jowisz, Słońce, Syriusz B, gwiazda neutronowa, czarna dziura o masie 10 Słońc, Sagittarius A*). Suwak masy przechodzi płynnie między nimi.
- Kolor siatki pokazuje, jak mocno zwalnia czas: od chłodnego błękitu po rozżarzoną biel przy horyzoncie zdarzeń.
- Zegar B można postawić na powierzchni albo dowolnie wysoko (od ułamka milimetra nad powierzchnią do 100 promieni ciała). Co swoją sekundę wysyła błysk do ciebie. Błyski czerwienieją, wspinając się z grawitacyjnego dołka (przesunięcie ku czerwieni), i docierają do ciebie rzadziej.
- Płachtę można obracać myszą lub palcem i przybliżać kółkiem.

**3. Razem**
- Statek krąży na swobodnej orbicie albo wisi na silnikach. Jego zegar zwalnia z dwóch powodów naraz: przez grawitację i przez prędkość. Trzy zegary: twój (daleko), na powierzchni i na statku.
- Scenariusze: **satelita GPS** (zegar śpieszy się względem Ziemi o 38,5 µs na dobę, tak jak w rzeczywistości), **ISS** (spóźnia się, astronauci starzeją się wolniej), orbita wokół gwiazdy neutronowej, najniższa stabilna orbita czarnej dziury i **„Interstellar”** (godzina na statku to ok. 7 lat u ciebie).

## Co jeszcze jest

- **Zsynchronizowane zegary**: startują razem, każdy całkuje swój własny czas. Pokazują czas, tempo, spóźnienie w ujęciu na dobę i to, ile już się rozjechały. Pierścień wokół tarczy pokazuje tempo (pełny okrąg = jak twój zegar). Tempo pokazu można przełączyć od „1 s = 1 s” do „1 s = 1 rok”.
- **Mapa efektu**: wykres, na którym widać, gdzie jesteś. Przy prędkości efekt prawie nie istnieje i wybucha dopiero przy samej prędkości światła. Przy grawitacji widać spóźnienie na dobę w zależności od wysokości, a w trybie „Razem” wysokość, na której zegar satelity idzie tak samo jak na Ziemi.
- **„Co tu się dzieje?”**: objaśnienia zwykłym językiem, które zmieniają się razem z suwakami, plus rozwijane „dlaczego”.
- **10 zadań** (np. „skróć statek o połowę”, „prawie zatrzymaj czas”, „odtwórz GPS”), zapisywanych w przeglądarce.
- **To dzieje się naprawdę**: 11 prawdziwych doświadczeń i odkryć (GPS, miony, zegary w samolotach z 1971 r., zegary optyczne NIST, Pound–Rebka, LHC, ISS, Eddington 1919, zdjęcia czarnych dziur, LIGO).
- **Słowniczek** pojęć bez wzorów.

Klawisze: `1` `2` `3` tryby, `spacja` pauza, `R` synchronizacja zegarów, `M` dźwięk, `V` widok z kokpitu, strzałki na suwaku (z `Shift` szybciej).

## Fizyka

Liczby na zegarach są dokładne:

- ruch: tempo zegara = √(1 − v²/c²) (czynnik Lorentza γ), skrócenie długości o ten sam czynnik,
- grawitacja: metryka Schwarzschilda, tempo zegara w spoczynku = √(1 − rₛ/r),
- swobodna orbita kołowa: prędkość lokalna v²/c² = rₛ / (2(r − rₛ)), orbity istnieją powyżej 1,5 rₛ, stabilne od 3 rₛ,
- oba efekty składają się przez mnożenie temp,
- widok z kokpitu: wzory na aberrację i relatywistyczny efekt Dopplera, barwa gwiazd z temperatury ciała doskonale czarnego.

Małe różnice (np. 10⁻¹⁵) liczone są bez utraty dokładności, więc nawet przy samochodzie widać prawdziwe femtosekundy.

Animacje nie są w skali: odległości na płachcie są ściśnięte logarytmicznie, a głębokość lejka wzmocniona, żeby było widać i Księżyc, i czarną dziurę. Kształt lejka odpowiada zwalnianiu czasu. Czarne dziury są nieobracające się (Schwarzschild), dlatego scenariusz „Interstellar” wisi na silnikach, a nie krąży.

## Technika

- Czysty HTML, CSS i JavaScript, bez bibliotek i bez budowania.
- Płachta czasoprzestrzeni to własny rzut perspektywiczny 3D na canvasie 2D (siatka 30 × 48 czworokątów sortowanych wg głębokości), z ciałami malowanymi w kodzie (Ziemia z kontynentami, pasy Jowisza, Słońce, pulsar z wiązkami, czarna dziura z dyskiem akrecyjnym i sferą fotonową).
- Dźwięk tykania syntezowany przez Web Audio.

## Struktura

```
index.html          – układ strony, wprowadzenie, słowniczek
css/style.css       – wygląd
js/physics.js       – wzory, ciała niebieskie, mapowanie suwaków, formatowanie liczb po polsku
js/clocks.js        – zegary analogowe i całkowanie czasu własnego
js/scene-speed.js   – statek, zegar świetlny, linijki, widok z kokpitu
js/scene-sheet.js   – płachta czasoprzestrzeni 3D, ciała, błyski, orbita statku
js/chart.js         – wykres „Mapa efektu”
js/audio.js         – tykanie
js/content.js       – gotowe ustawienia, scenariusze, zadania, ciekawostki, słowniczek, objaśnienia
js/app.js           – stan, suwaki, objaśnienia na żywo, zadania, pętla animacji
```
