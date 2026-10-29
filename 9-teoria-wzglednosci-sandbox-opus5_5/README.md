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

Klawisze: `1` `2` `3` tryby, `spacja` pauza, `R` synchronizacja zegarów, `M` tykanie, `T` głos Tika, `V` widok z kokpitu, strzałki na suwaku (z `Shift` szybciej).

## Rozwój po eksperymencie

29.10.2026 projekt przeanalizowano pod kątem dziecka, które ma zrozumieć, czym w teorii Einsteina są czas, grawitacja i prędkość. Wnioski: fizyka i liczby były dokładne, ale strona mówiła językiem dorosłego popularyzatora. Ekran startowy miał trzy kolumny instrukcji, objaśnienia były gęste, a nic nie prowadziło za rękę. Zadania potrafiły zaliczyć się same (np. „Odtwórz GPS” po samym wejściu w tryb „Razem”). Wdrożone zmiany:

- **Ekran powitalny:** pełnoekranowa ilustracja (Nano Banana) z rakietą krążącą w lejku czasoprzestrzeni, tytuł, jedno zdanie („Czas umie się rozciągać jak guma. Sprawdź, jak to zrobić!”) i dwa duże wejścia: **Pędź jak światło** i **Ugnij czas** (plus link „jedno i drugie naraz”). Tik na ilustracji ma dymek „Kliknij mnie!” i wita się głosem. Zegary ruszają dopiero po wyborze przygody. Link „← Projekty” prowadzi do strony z projektami.
- **Przewodnik Tik:** zegar-maskotka (4 miny z Nano Banana: macha, tłumaczy, dziwi się, zasypia, gdy czas staje). Mówi głosem z ElevenLabs (32 kwestie, głos „Tobiasz – bajki dla dzieci”). Tekst pojawia się w dymku, a słowa podświetlają się w rytm nagrania, więc dziecko może czytać razem z nim. Odzywa się, gdy coś się wydarzy:
  - na start każdego trybu,
  - gdy suwak się zatrzyma na progu: najpierw „dlaczego” (błysk leci zygzakiem, dłuższa droga, ta sama prędkość światła), potem „2 razy wolniej i o połowę krótsza”, 99 % c i granica prędkości światła,
  - przy każdym ciele niebieskim, przy zegarze, który prawie stanął, w widoku z kokpitu i przy scenariuszach (GPS, ISS, czarna dziura, „Interstellar”),
  - z pochwałą po zadaniu.
  Tykanie zegarów cichnie, gdy Tik mówi. Głos można wyłączyć (przycisk z dymkiem albo klawisz `T`), wtedy zostaje sam dymek. Na telefonie dymek jest przy dolnej krawędzi ekranu, bo suwaki leżą pod sceną.
- **Podróż bliźniaczek (paradoks bliźniąt):** bliźniaczka Ala leci rakietą z prędkością z suwaka, a Ola zostaje na Ziemi. Ala wraca, gdy na Ziemi minie 20 lat. Rakieta leci do gwiazdy i z powrotem, a liczniki lat i portrety (po 4 wieki każdej siostry, Nano Banana) zmieniają się na oczach. Przy 87 % c Ola ma 30 lat, a Ala 20. Przy samochodzie różnica to ułamek mikrosekundy.
- **Kulki na płachcie:** dotknięcie siatki rzuca kulkę, która toczy się po zboczu lejka i krąży wokół środka, a przez lekkie tarcie po spirali opada w dół (jak moneta w lejku na monety). Gdy zmienisz masę, kulki od razu czują nowy kształt. Czarna dziura je połyka. To jest analogia z trampoliną, którą dziecko może samo sprawdzić.
- **Objaśnienia:** każdy tryb ma na górze najważniejszą myśl w jednym zdaniu (np. „Im szybciej coś pędzi, tym wolniej płynie dla niego czas”). Szczegóły z liczbami zostały dla dociekliwych.
- **Zadania:** dwa nowe („Wyślij Alę tak, by wróciła co najmniej 10 lat młodsza”, „Wrzuć kulkę do czarnej dziury”). Zadania zaliczają się dopiero po własnym ruchu w danym trybie.
- **Zachęty:** rakieta startuje z miejsca (wcześniej od razu leciała 80 % c), a gałka suwaka pulsuje, dopóki nikt jej nie ruszy. Po „2 razy wolniej” Tik podsuwa podróż bliźniaczek, a jej przycisk pulsuje.
- Tagi `og:` z obrazkiem do podglądu linku, efekty dźwiękowe z ElevenLabs (start i lądowanie rakiety, kulka, „am!” czarnej dziury).

Tego samego dnia agent `ocena-ux` przeklikał projekt na komputerze i telefonie oczami dziecka. Ocena: 7/10. Ekran powitalny, Tik, kulki i bliźniaczki naprawdę wciągają, ale najważniejszy moment nauki w zwykłej zabawie prawie nie występował. Poprawki:

- **Suwak prędkości pod dziecko:** 90 % toru prowadzi do 99,99 % c, a 87 % c wypada w 44 % toru. Wcześniej połowa toru to było 97,8 % c i statek szybko robił się kreską. Ostatnie 10 % toru zostało dla skrajnych prędkości (przycisk „Proton w LHC” dalej działa).
- **„87 % c” to dokładnie γ = 2** (`√3/2`), więc zaliczają się zadania „o połowę” i „10 lat młodsza”. Wcześniej wychodziło 1,99999997.
- **Tik mówi we właściwym momencie:**
  - reaguje na przekroczenie progów, nie na wąskie okna;
  - po skończonej kwestii mówi następną, jeśli stan już na nią zasługuje (zygzak → „2 razy wolniej” → bliźniaczki);
  - ruch dziecka może przerwać powitanie trybu, ale nie wyjaśnienie;
  - zaległa reakcja z poprzedniego trybu nie przerywa powitania nowego;
  - po kwestii dymek zwija się po 3,5 s.
- **Zadania:**
  - zaliczają się po zatrzymaniu suwaka, a nie w trakcie przeciągania;
  - najbliższe niezrobione zadanie trybu wisi w panelu sterowania z podpowiedzią po kliknięciu.
- **Grawitacja i „Razem” startują od gwiazdy neutronowej.** Lejek i różnica zegarów są widoczne od razu, a nie płaska Ziemia z nanosekundami.
- **Słowa zamiast notacji naukowej:**
  - na scenie zamiast „tempo ×(1 − 7 × 10⁻¹⁰)” jest „czas płynie 1,41× wolniej” albo „prawie tak samo”;
  - w HUD prędkości „czas w rakiecie: 2× wolniej” zamiast γ.
- **Telefon i tablet:**
  - suwaki zaraz pod sceną (wcześniej ponad 1000 px niżej);
  - scena niższa;
  - dymek Tika u góry ekranu, żeby nie zasłaniał suwaka;
  - podróż bliźniaczek na cały ekran;
  - palcem po scenie da się przewijać stronę (płachta obraca się poziomo).
- **Krótsze kwestie:** powitanie trybu prędkości ma 11 s zamiast 15 s. Powitania grawitacji i „Razem” mówią o gwieździe neutronowej.

Obrazy i nagrania są w plikach (`img/`, `audio/`), więc działają też po otwarciu `index.html` z dysku. Nagrania odtwarza element `<audio>`. Gdy pliku nie ma, Tik po prostu pokazuje dymek.

### Jak zmienić kwestie Tika

Teksty są w [`narzedzia/przepis.mjs`](narzedzia/przepis.mjs) (tam też identyfikator głosu). Potem:

```sh
node narzedzia/generuj.mjs [--tylko sp_] [--wymus]   # nagrania z ElevenLabs → narzedzia/raw/ (pomija gotowe)
node narzedzia/paczka.mjs                             # cisza obcięta, głośność wyrównana → audio/*.mp3 i audio/kwestie.js
```

`audio/kwestie.js` (tekst do dymka) powstaje z tego samego przepisu, więc napis zawsze zgadza się z nagraniem.

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
- Ilustracje: Nano Banana 2.1 (Google, przez Vertex AI). Głos Tika i efekty: ElevenLabs (`eleven_v4`), każda kwestia sprawdzona Whisperem.

## Struktura

```
index.html          – układ strony, ekran powitalny, słowniczek
css/style.css       – wygląd
js/physics.js       – wzory, ciała niebieskie, mapowanie suwaków, formatowanie liczb po polsku
js/clocks.js        – zegary analogowe i całkowanie czasu własnego
js/scene-speed.js   – statek, zegar świetlny, linijki, widok z kokpitu
js/scene-sheet.js   – płachta czasoprzestrzeni 3D, ciała, błyski, orbita statku
js/chart.js         – wykres „Mapa efektu”
js/audio.js         – tykanie
js/content.js       – gotowe ustawienia, scenariusze, zadania, ciekawostki, słowniczek, objaśnienia
js/guide.js         – przewodnik Tik: dymek, głos, podświetlanie słów, efekty dźwiękowe
js/twins.js         – podróż bliźniaczek (paradoks bliźniąt)
js/app.js           – stan, suwaki, ekran powitalny, reakcje Tika, objaśnienia, zadania, pętla animacji
img/                – ilustracja powitalna, Tik (4 miny), portrety bliźniaczek
audio/              – kwestie Tika i efekty (mp3), kwestie.js (tekst do dymka)
narzedzia/          – przepis kwestii, generator ElevenLabs i obróbka nagrań
```
