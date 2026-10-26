# Na Krawędzi

Symulator lotu w kombinezonie skrzydłowym (wingsuit) 3D w przeglądarce. Skaczesz z krawędzi skały i lecisz z prędkością 200–380 km/h kilka metrów od ścian żlebu, fiordu albo kanionu. Po drodze są bramki, wiszący most i skalne okno, a na końcu otwierasz spadochron i lądujesz w kole na lądowisku. Można też nie zdążyć.

## Jak powstał

Dzień 6 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** poniedziałek, 26.10.2026, godz. 13:10
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 55 minut
- **Poprawki:** brak. Po prompcie nie było żadnej kolejnej wiadomości dotyczącej projektu (późniejsza prośba o wrzucenie na GitHub nie zmieniała kodu)
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz proszę symulator 3D lotu swobodnego (wingsuit - kombineszon skrzydfłowy), która umożliwia lot w różnych warunkach pogodowych i pozwala odczuć graczowi szybkość i atrakcyjność takiego lotu oraz dostarczyć mu adrenaliny.
> Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Gra otworzy się w przeglądarce (Chrome, Edge, Firefox).
Nie trzeba niczego instalować ani budować. Three.js leży w folderze `lib/`, więc działa też bez internetu.
Na telefonie i tablecie pojawia się sterowanie dotykiem (gałka i przyciski).

> Czcionki ładują się z Google Fonts. Bez internetu gra działa tak samo, tylko z czcionką systemową.

## Sterowanie

| Klawisz | Działanie |
|---|---|
| Spacja | skok z krawędzi; w locie szeroko rozłożone ręce (więcej nośności, wolniej) |
| W / ↑ | nurkowanie: przyspieszasz i tracisz wysokość |
| S / ↓ | podciąganie: zwalniasz i na chwilę się wznosisz |
| A / D, ← / → | przechył i skręt |
| Shift | złożone ręce: szybkie nurkowanie (nawet ok. 380 km/h) |
| F | spadochron; pod czaszą A/D to skręt, a S hamowanie tuż nad ziemią |
| C | kamera: za plecami, na kasku, filmowa (przeloty z boku), dron z boku |
| H | dym ze stóp |
| Esc / P | pauza |
| R | nowy skok |
| M | dźwięk |
| Pad | lewa gałka: lot, RT: złożenie, LT: rozłożenie, A: skok, B: spadochron, Y: kamera |

## Miejsca skoku

- **Dolomity – Żleb Cieni**: wyskok z grani na 2600 m i kręty żleb z progiem skalnym (nagle pod tobą jest 160 m powietrza). Potem wąwóz szeroki na 80 m z wiszącym mostem z flagami modlitewnymi i lądowisko na hali.
- **Fiord – Ściana Trolli**: pionowa ściana granitu prosto nad wodą, potem przelot nad taflą fiordu, cieśnina z mostem i lądowanie na plaży.
- **Kanion – Czerwona Szczelina**: start z płaskowyżu, a potem coraz głębszy, kręty kanion z tarasami piaskowca. Jest w nim szczelina szeroka na ok. 55 m, skalne okno i most linowy.

## Warunki

Do wyboru jest sześć rodzajów pogody, które zmieniają światło, widoczność i sam lot:

| Pogoda | Co się dzieje |
|---|---|
| ☀ Słońce | czyste niebo, cienie gór, świetna widoczność |
| 🌅 Złota godzina | nisko stojące słońce, długie cienie, ciepłe światło |
| 🌫 Mgła i chmury | gęsta mgła w dolinach i chmury, przez które się przelatuje (ekran na chwilę bieleje) |
| ⛈ Burza | ulewa, pioruny z grzmotem po kilku sekundach, porywy wiatru i mocne turbulencje |
| ❄ Śnieżyca | zawieja, śnieg na skałach, zimny boczny wiatr |
| 🌌 Noc z zorzą | księżyc w pełni, gwiazdy, Droga Mleczna i zorza polarna |

Siłę wiatru (0–20 m/s), jego kierunek (czołowy, z boku, w plecy) i turbulencje ustawiasz suwakami. Wiatr naprawdę znosi pilota, a pod czaszą przy silnym wietrze czołowym można nawet lecieć do tyłu.

## Co daje adrenalinę

- **Model lotu**: siła nośna i opór zależą od kąta natarcia, a przechył skręca tor lotu. Skręt w dużym przechyle kosztuje wysokość. Nurkowanie daje prędkość, którą potem zamieniasz z powrotem na wysokość. Przy zbyt małej prędkości kombinezon traci nośność. Doskonałość lotu wynosi ok. 2,8 przy ok. 230 km/h, jak w prawdziwym wingsuicie.
- **Punkty za bliskość**: mnożnik rośnie, im bliżej skał, wody i drzew lecisz (do ok. ×8). Bliski przelot („BLISKO!”, „O WŁOS!”) daje premię, a przy kilku metrach od skały czas na moment zwalnia.
- **Bramki** z premią za serię, a za przelot pod mostem lub przez skalne okno +3000 pkt.
- **Wrażenie prędkości**: rozmycie promieniste, aberracja na brzegach, kąt widzenia rosnący z prędkością, drżenie kamery, smugi pyłu, deszczu i śniegu przelatujące obok, łopot kombinezonu i szum wiatru rosnący z prędkością.
- **Adrenalina**: tętno pilota (słychać serce), czerwień na brzegach ekranu i piszczący wysokościomierz oraz napis „WYCIĄGAJ!”, gdy do ziemi zostały ok. 2 sekundy.
- **Lądowanie** w kole lądowiska daje do +4000 pkt. Można też wylądować w terenie, w wodzie albo na drzewie. Uderzenie kończy lot i zabiera połowę punktów.
- **Powtórka**: po locie w tle leci powtórka z kamer filmowych.
- Rekordy dla każdego miejsca zapisują się w przeglądarce.

## Technika

- Teren powstaje proceduralnie z funkcji wysokości (szum simplex, granie, tarasy). Dno doliny jest liczone jako zapas pod lotem wzorcowym, więc każdą trasę da się przelecieć. Bramki stawia lot wzorcowy z autopilotem (sprawdzone w testach: autopilot dolatuje do lądowiska na wszystkich trzech trasach).
- Wokół pilota jest 81 kawałków terenu z oczkiem 4 m, które doczytują się w trakcie lotu. Dalej są dwa pierścienie z grubszą siatką aż po horyzont (ok. 35 km). Cienie gór od słońca są wyliczane dla każdego wierzchołka.
- Shadery są własne: skała, trawa, śnieg i mokre skały, mgła wysokościowa z poświatą słońca, woda z odbiciem nieba, niebo z chmurami, gwiazdami i zorzą, chmury do przelotu oraz opady jako smugi pędu.
- Cały dźwięk jest syntezowany na żywo przez Web Audio, bez plików audio.
- Jakość dostosowuje się sama: gdy klatek jest za mało, gra zmniejsza rozdzielczość renderu.

## Struktura

```
index.html        – strona gry: HUD, menu, ładowanie, pauza, wyniki, sterowanie dotykiem
css/style.css     – wygląd interfejsu
lib/three.min.js  – Three.js r159
js/util.js        – matematyka, szum simplex, losowość, zapis w przeglądarce
js/data.js        – miejsca skoków i warunki pogodowe
js/world.js       – funkcja wysokości terenu, trasa, bramki, most, łuk, lądowisko, drzewa, kolizje
js/physics.js     – model lotu kombinezonu i spadochronu, autopilot, lot wzorcowy pod bramki
js/env.js         – oświetlenie, mgła, wspólne kawałki shaderów
js/terrain.js     – siatki terenu, kolory podłoża, cienie, drzewa, woda
js/sky.js         – niebo, słońce/księżyc, chmury, gwiazdy, zorza, chmury do przelotu
js/weather.js     – wiatr z porywami i turbulencją, opady, pioruny
js/props.js       – bramki, most linowy, skalny łuk, lądowisko z rękawem, miejsce wyskoku
js/pilot.js       – pilot w kombinezonie, czasza spadochronu, smugi dymu
js/camera.js      – kamery i drżenie
js/post.js        – obróbka obrazu (rozmycie, aberracja, winieta, efekty)
js/audio.js       – syntezowany dźwięk
js/hud.js         – HUD i komunikaty
js/game.js        – przebieg lotu, punkty, lądowanie, wypadek, powtórka
js/main.js        – start, menu, pętla gry, sterowanie
```
