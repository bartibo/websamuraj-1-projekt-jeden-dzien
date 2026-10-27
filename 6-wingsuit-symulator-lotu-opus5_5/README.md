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

Kliknij dwa razy plik **`index.html`**. Gra otworzy się w przeglądarce (Chrome, Edge, Firefox). Na ekranie tytułowym naciśnij dowolny klawisz (na telefonie dotknij ekranu), a w menu wybierz „Skacz” albo „Wybierz skok”.
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

| Pogoda | Co się dzieje | Punkty |
|---|---|---|
| Słońce | czyste niebo, cienie gór, świetna widoczność | ×1 |
| Złota godzina | nisko stojące słońce, długie cienie, ciepłe światło | ×1,05 |
| Mgła i chmury | gęsta mgła w dolinach i chmury, przez które się przelatuje (ekran na chwilę bieleje) | ×1,25 |
| Burza | ulewa, pioruny z grzmotem po kilku sekundach, porywy wiatru i mocne turbulencje | ×1,4 |
| Śnieżyca | zawieja, śnieg na skałach, zimny boczny wiatr | ×1,3 |
| Noc z zorzą | księżyc w pełni, gwiazdy, Droga Mleczna i zorza polarna | ×1,2 |

Siłę wiatru (0–20 m/s), jego kierunek (czołowy, z boku, w plecy) i turbulencje ustawiasz suwakami. Wiatr naprawdę znosi pilota, a pod czaszą przy silnym wietrze czołowym można nawet lecieć do tyłu.

## Co daje adrenalinę

- **Model lotu**: siła nośna i opór zależą od kąta natarcia, a przechył skręca tor lotu. Skręt w dużym przechyle kosztuje wysokość. Nurkowanie daje prędkość, którą potem zamieniasz z powrotem na wysokość. Przy zbyt małej prędkości kombinezon traci nośność. Doskonałość lotu wynosi ok. 2,8 przy ok. 230 km/h, jak w prawdziwym wingsuicie.
- **Punkty za bliskość**: mnożnik rośnie, im bliżej skał, wody i drzew lecisz (do ok. ×8). Bliski przelot („BLISKO!”, „O WŁOS!”) daje premię, a przy kilku metrach od skały czas na moment zwalnia.
- **Seria przy skale**: punkty zdobyte przy ścianie nie trafiają od razu do wyniku, tylko do serii pod licznikiem. Zaliczasz ją, odbijając od skały na ponad sekundę (albo otwierając spadochron). Im dłuższa seria, tym większy mnożnik, do ×3. Uderzenie zabiera całą niezaliczoną serię. Zaliczyć teraz czy jeszcze docisnąć – to główna decyzja w locie.
- **Bramki** stoją przy ścianach i schodzą coraz niżej, więc trasa prowadzi blisko skały. Premia rośnie z serią, za przelot pod mostem lub przez skalne okno jest +3000 pkt. Przy ominięciu gra mówi, czy było za wysoko, za nisko czy obok.
- **Wrażenie prędkości**: rozmycie promieniste, aberracja na brzegach, kąt widzenia rosnący z prędkością, drżenie kamery, smugi pyłu, deszczu i śniegu przelatujące obok, łopot kombinezonu i szum wiatru rosnący z prędkością.
- **Adrenalina**: tętno pilota (słychać serce), czerwień na brzegach ekranu i piszczący wysokościomierz oraz napis „WYCIĄGAJ!”, gdy do ziemi zostały ok. 2 sekundy.
- **Lądowanie** w kole lądowiska daje do +4000 pkt. Znacznik LĄDOWISKO robi się zielony, gdy spadochron otwarty w tej chwili doniesie Cię do koła, i czerwony, gdy już nie doniesie. Pod czaszą wysoko nad ziemią czas płynie szybciej. Można też wylądować w terenie, w wodzie albo na drzewie. Uderzenie kończy lot, zabiera 30% punktów i całą niezaliczoną serię, a ekran wyników mówi, co poszło nie tak.
- **Duch rekordu**: półprzezroczysty niebieski pilot powtarza Twój najlepszy lot w tym miejscu, a przy każdej bramce widać, ile prowadzisz albo tracisz.
- **Gwiazdki**: za każde miejsce w każdej pogodzie trzy do zdobycia (lądowanie w kole; most lub okno i 80% bramek; dość długi lot przy ścianie albo przelot bliżej niż 3 m), razem 54.
- **Powtórka**: po locie zaczyna się od najlepszego momentu (najbliższy przelot, most, okno albo uderzenie) w zwolnionym tempie, z kamery stojącej przy torze lotu, a potem leci cała.
- Rekordy, gwiazdki i duchy zapisują się w przeglądarce.

## Technika

- Teren powstaje proceduralnie z funkcji wysokości (szum simplex, granie, tarasy). Dno doliny jest liczone jako zapas pod lotem wzorcowym, więc każdą trasę da się przelecieć. Bramki stawia lot wzorcowy, a potem autopilot przelatuje trasę i dopasowuje wysokość obręczy, które minął (sprawdzone w testach: autopilot zalicza wszystkie bramki i ląduje na wszystkich trzech trasach).
- Wokół pilota jest 81 kawałków terenu z oczkiem 4 m, które doczytują się w trakcie lotu. Dalej są dwa pierścienie z grubszą siatką aż po horyzont (ok. 35 km). Cienie gór od słońca są wyliczane dla każdego wierzchołka.
- Shadery są własne: skała, trawa, śnieg i mokre skały, mgła wysokościowa z poświatą słońca, woda z odbiciem nieba, niebo z chmurami, gwiazdami i zorzą, chmury do przelotu oraz opady jako smugi pędu.
- Cały dźwięk jest syntezowany na żywo przez Web Audio, bez plików audio.
- Jakość grafiki ma cztery poziomy (niska, średnia, wysoka, ultra). W trybie „auto” gra rozpoznaje sprzęt (nazwa karty graficznej z WebGL, liczba wątków procesora, pamięć, telefon czy komputer), a potem przez kilka sekund mierzy płynność lotu pokazowego w menu. Gdy jest za wolno, schodzi poziom niżej i zapamiętuje wynik dla tej karty.
- W trakcie gry rozdzielczość renderu dopasowuje się sama w granicach poziomu: gdy klatek jest za mało, spada, a gdy znów jest płynnie, wraca.

## Struktura

```
index.html        – strona gry: ekran tytułowy, menu główne, wybór skoku, ustawienia, HUD, ładowanie, pauza, wyniki, sterowanie dotykiem
css/style.css     – wygląd interfejsu
lib/three.min.js  – Three.js r159
js/util.js        – matematyka, szum simplex, losowość, zapis w przeglądarce
js/data.js        – miejsca skoków i warunki pogodowe (też siła poświaty i promieni słońca)
js/quality.js     – poziomy jakości grafiki i rozpoznanie sprzętu
js/world.js       – funkcja wysokości terenu, trasa, bramki, most, łuk, lądowisko, drzewa, kolizje
js/physics.js     – model lotu kombinezonu i spadochronu, autopilot, lot wzorcowy pod bramki
js/env.js         – oświetlenie, mgła, wspólne kawałki shaderów
js/terrain.js     – siatki terenu, kolory podłoża, cienie, drzewa, woda
js/sky.js         – niebo, słońce/księżyc, chmury, gwiazdy, zorza, chmury do przelotu
js/weather.js     – wiatr z porywami i turbulencją, opady, pioruny
js/props.js       – bramki, most linowy, skalny łuk, lądowisko z rękawem, miejsce wyskoku
js/pilot.js       – pilot w kombinezonie, czasza spadochronu, smugi dymu
js/ghost.js       – duch rekordu: zapis najlepszego lotu i odtwarzanie go obok pilota
js/camera.js      – kamery i drżenie
js/post.js        – obróbka obrazu (rozmycie, aberracja, winieta, poświata, promienie słońca, odblaski obiektywu)
js/audio.js       – syntezowany dźwięk
js/hud.js         – HUD i komunikaty
js/game.js        – przebieg lotu, punkty, lądowanie, wypadek, powtórka
js/main.js        – start, ekrany menu, jakość grafiki, pętla gry, sterowanie
```

## Rozwój po eksperymencie

26.10.2026 grę oceniło czterech agentów z [`.claude/agents/`](../.claude/agents/): design, UX, wydajność i rozwój produktu. Główny wniosek: bramki trzymały gracza 80–600 m nad ziemią, a punkty płynęły za lot przy skale, więc przez większość lotu mnożnik wynosił ×1,0. Wdrożone poprawki:

- **Rozgrywka:**
  - seria przy skale z zaliczaniem (odbij od ściany, zanim coś pójdzie nie tak) i mnożnikiem do ×3,
  - bramki przy ścianach, schodzące coraz niżej; pierwsza na wysokości swobodnego lotu, żeby pierwszym zdarzeniem był sukces; autopilot przelatuje trasę i dopasowuje obręcze,
  - duch rekordu i międzyczasy na bramkach („+830 vs rekord”),
  - 3 gwiazdki za każde miejsce w każdej pogodzie, mnożnik punktów za trudną pogodę,
  - powtórka od najlepszego momentu, w zwolnionym tempie, z kamery przy torze lotu.
- **Sterowanie:**
  - skręt ok. 25°/s zamiast 9°/s (przechył obraca tor lotu bez utraty prędkości),
  - pełne podciągnięcie kończy się tuż przed przeciągnięciem.
- **Informacja zwrotna:**
  - celownik toru lotu, różnica wysokości przy znaczniku celu,
  - znacznik lądowiska zielony, gdy spadochron otwarty teraz doleci do koła,
  - podpowiedź „ZA WOLNO”, przyczyna ominięcia bramki („za wysoko o 12 m”),
  - na ekranie wyników przyczyna wypadku i wskazówka,
  - przyspieszony czas pod czaszą,
  - dokładniejsza odległość od skały, mostu i drzew.
- **Wygoda:**
  - pauza po utracie fokusu, wyciszenie dźwięku w ukrytej karcie,
  - opcja „spokojna kamera” (domyślnie przy „ogranicz ruch” w systemie),
  - menu w tle pokazuje ujęcia filmowe zamiast ściany z bliska.
- **Wygląd:**
  - skała z rzeźbą światła, spękaniami i żłobieniami, warstwy piaskowca liczone na pikselu,
  - spokojniejsza zieleń, chłodna noc,
  - miękka poświata bramek i przygaszone dalsze bramki,
  - most z grubymi linami, nieregularny skalny łuk, spadochron z wyraźnymi komorami,
  - piorun jako jasna wstęga, błysk bez spłaszczania kadru, szerszy i miękki dym.
- **Interfejs:**
  - ikony pogody w SVG zamiast emoji,
  - czytelniejszy HUD na jasnym tle, wyraźne „WYCIĄGAJ!”,
  - układ na telefon w poziomie i w pionie, przewijane wyniki z przyciskami zawsze pod ręką,
  - kontrast przycisków, obramowanie fokusu.
- **Wydajność:**
  - obróbka obrazu z liczbą próbek zależną od rozmycia, bez MSAA na słabszym sprzęcie,
  - automatyczna jakość nie liczy klatek ładowania i przywraca rozdzielczość,
  - liczby HUD odświeżane 15 razy na sekundę, buforowane formatowanie liczb,
  - cienie terenu liczone na rzadszej siatce, drzewa budowane porcjami,
  - zwalniane tekstury mostu i materiał wody.

## Ekran startowy i grafika (27.10.2026)

Druga prośba po eksperymencie: ładne menu startowe, dopracowana grafika i automatyczne rozpoznawanie, czy sprzęt udźwignie najwyższą jakość.

- **Ekran startowy:**
  - tytuł na tle lotu pokazowego, z kinowymi pasami kadru, połyskiem na logo i napisem „naciśnij dowolny klawisz”. Za pierwszym razem pod logo widać postęp budowy gór, a świat wyłania się z ciemności,
  - menu główne: Skacz (od razu, z ostatnimi ustawieniami), Wybierz skok, Ustawienia, Sterowanie. Obsługa myszą, klawiaturą (strzałki, Enter, Esc) i padem (krzyżak, A, B),
  - w rogu podpis jak w filmie: miejsce, pogoda, prędkość i wysokość pilota z lotu pokazowego,
  - liczba gwiazdek i najlepszy wynik w menu, osobne ekrany ustawień i sterowania, w pauzie przycisk „Menu główne”.
- **Jakość grafiki** (Ustawienia → Grafika: Auto, Niska, Średnia, Wysoka, Ultra):
  - ekran ustawień pokazuje rozpoznaną kartę, ocenę sprzętu, włączone efekty i rozdzielczość renderu,
  - opcjonalny licznik klatek,
  - Ultra renderuje gęściej niż ekran (do ×2, z limitem megapikseli), ma gęstszy teren (oczko 3 m) i szczegóły do 1100 m wokół pilota.
- **Nowe efekty od średniej jakości:**
  - poświata jasnych miejsc (słońce, śnieg, odblaski na wodzie, piorun, zorza),
  - od wysokiej: promienie słońca przez szczeliny w chmurach i graniach oraz odblaski obiektywu (gwiazdka, pierścień, pozioma smuga), widoczne tylko, gdy słońce nie jest zasłonięte.
- **Skały i teren od wysokiej jakości:**
  - ściany zbudowane z bloków: każdy ma swój odcień i nachylenie, między nimi są rysy. W Dolomitach to pionowe filary, w kanionie poziome płyty piaskowca,
  - zagłębienia (żleby, rysy, podnóża ścian) są ciemniejsze, a grzbiety jaśniejsze,
  - światło rozproszone z kierunkiem, więc rzeźbę widać też w cieniu,
  - połysk i iskrzenie śniegu, drobne nierówności trawy i piargu, dokładniejsze świerki i krzewy, chmury z jasnymi brzegami pod słońce i mniejsza, ostrzejsza tarcza słońca.
- **Poprawki dla wszystkich poziomów:**
  - mgła ma kolor nieba w danym kierunku, więc dalekie góry nie odcinają się na horyzoncie jasną „ścianą”,
  - gładszy szum w shaderach, bez kanciastych „kafli”, które wyglądały na skałach jak cyfrowe moro,
  - miękkie przejście w jasnych miejscach zamiast obcinania do bieli,
  - napisy z lotu pokazowego nie przechodzą już do prawdziwego lotu.
- Na RTX 5060 Ti tryb auto wybiera Ultra, a gra trzyma 60 kl/s przy renderze 2400×1350.
