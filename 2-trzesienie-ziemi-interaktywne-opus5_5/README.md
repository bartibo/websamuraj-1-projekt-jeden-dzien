# Sejsmo·Lab – interaktywny symulator trzęsień ziemi 3D

Nadmorskie miasto stoi na uskoku tektonicznym. Ustawiasz siłę trzęsienia i obserwujesz w 3D, co dzieje się z budynkami, ulicami, drzewami, samochodami i wybrzeżem.

## Jak powstał

Dzień 2 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** wtorek, 20.10.2026, godz. 10:01
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 75 minut
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz proszę interaktywną animacją 3D, w które gracz może testować różne wielkości trzesięnia ziemi w taki spośób by zobaczył efekt trzęsienia ziemi zależny od siły zjawiska.
> Ty podejmujsze wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekty. (Umieść go w folderze 2-trzesienie-ziemi-interaktywne-opus5_5)

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Strona otworzy się w przeglądarce (Chrome, Edge, Firefox, Safari).
Nie trzeba niczego instalować ani budować. Biblioteka Three.js leży w folderze `lib/`, więc symulator działa także bez internetu (bez sieci zmieni się tylko czcionka na systemową).

## Sterowanie

| Klawisz / gest | Działanie |
|---|---|
| **Spacja** | wywołaj trzęsienie (kolejne nakłada się na trwające) |
| ↑ / ↓ (z Shift) | magnituda ±0,1 (±0,5) |
| R | odbuduj miasto |
| 1–6 | widoki kamery: panorama, centrum, ulica, wybrzeże, z góry, fala (kamera leci za czołem tsunami) |
| T | pora dnia: dzień, zachód, noc |
| S | zwolnione tempo ×0,3 |
| C / K | kamera krąży / kamera drży razem z gruntem |
| A | wstrząsy wtórne wł./wył. |
| M | dźwięk |
| H | pomoc |
| Mysz | lewy przycisk – obrót, prawy (lub Shift) – przesuwanie, kółko – przybliżenie |
| Dotyk | jeden palec – obrót, dwa palce – przesuwanie i szczypanie |

Po najechaniu kursorem na budynek zobaczysz jego typ, wysokość, okres drgań, stan i odporność.

## Co możesz ustawić

- **Magnitudę** od 1,0 do 9,9. Każdy stopień więcej to 10× większa amplituda i ok. 32× więcej energii.
  Powyżej 9,5 (rekord: Valdivia 1960) symulator oznacza scenariusz jako **hipotetyczny** i mówi, czego by wymagał: pęknięcia uskoku dłuższego niż jakiekolwiek znane.
- **Głębokość ogniska** (2–100 km) i **odległość od epicentrum** (0–160 km).
- **Podłoże**:
  - skała tłumi drgania,
  - miękkie osady je wzmacniają, a przy silnym wstrząsie ulegają **upłynnieniu** (budynki zapadają się i przechylają, z gruntu tryska piasek).
- **Epicentrum pod lądem albo pod morzem.** Pod morzem, przy M ≥ 7, powstaje **tsunami**.
- **Falochron na plaży** od 0 do 15 m. Niższą falę zatrzyma, wyższa przeleje się przez koronę, a długi przelew potrafi mur przerwać.
- Gotowe scenariusze: od mikrowstrząsu do katastrofy, **8 historycznych trzęsień** (Northridge, Kobe, L'Aquila, Haiti, Turcja i Syria, Tōhoku, Sumatra, Valdivia) oraz hipotetyczne **megatrzęsienie M 9,9**.

## Co zobaczysz

- **Fale sejsmiczne** rozchodzą się kołowo od epicentrum:
  - najpierw szybka fala **P**,
  - potem silniejsza fala **S**,
  - przy dużych wstrząsach widać **fale powierzchniowe**: grunt faluje jak morze.
- **Budynki** każdego z 6 typów mają własny okres drgań i odporność:
  - domy,
  - kamienice z niezbrojonej cegły,
  - bloki z wielkiej płyty,
  - biurowce,
  - wieżowce z tłumikiem masowym (złota kula na szczycie porusza się w przeciwfazie),
  - wieża kościoła.

  Przy słabszych wstrząsach pękają szyby i spadają kominy. Przy silniejszych budynki się przechylają, a w końcu zapadają piętro po piętrze albo przewracają się w całości i rozpadają na bryły z fizyką.
- **Skutki w mieście**:
  - pył, gruz i szczeliny w gruncie,
  - osuwiska na zboczach,
  - pożary z dymem,
  - awaria sieci (miasto gaśnie),
  - przewrócone latarnie i drzewa,
  - kołyszące się auta z włączonymi alarmami.
- **Tsunami jako symulacja wody.** Przy brzegu i w mieście działa siatka płytkiej wody (ok. 3 × 3 m):
  - morze najpierw się cofa i odsłania mokre dno, łodzie osiadają na piasku,
  - potem przychodzi **seria fal** (przy dużych trzęsieniach trzy, druga największa); między nimi woda się cofa, a symulator ostrzega, żeby nie wracać na brzeg,
  - czoło fali to stroma ściana z pianą i bryzgami; woda płynie ulicami, omija budynki i rozbija się o nie,
  - woda z lądu jest brunatna od mułu i wynosi mętną smugę na morze,
  - nurt porywa łodzie, auta, drzewa, gruz i deski z rozbitych domów, a po zalaniu zostawia je na ulicach razem ze śladem mułu,
  - budynki niszczy napór wody (głębokość i prędkość nurtu): drewniane domy rozpadają się już przy ok. 2 m, kamienice się walą, żelbetowe bloki zwykle wytrzymują.
- **Sejsmogram na żywo** z oznaczonym nadejściem fal P i S oraz **skala Mercallego I–XII**, która zapala się w trakcie wstrząsu.
- **Prognoza przed wstrząsem**:
  - intensywność,
  - przyspieszenie gruntu,
  - energia (w tonach TNT i „bombach z Hiroszimy”),
  - długość pęknięcia uskoku,
  - czas na ostrzeżenie,
  - częstość takich wstrząsów na świecie.
- **Raport szkód po wstrząsie**: z podziałem na typy budynków i komentarzem. Po tsunami podaje też głębokość wody, zasięg zalewu, najszybszy nurt, liczbę fal, los falochronu i łodzie wyrzucone na ląd.
- **Dźwięk** jest syntezowany na żywo przez Web Audio, bez plików audio: dudnienie, trzaski, pękające szkło, syrena i szum fali.

## Model (w skrócie)

Intensywność w mieście liczy relacja Atkinson & Wald (2007), a przyspieszenie gruntu – odwrócone równanie Wald i in. (1999). Długość pęknięcia uskoku pochodzi z Wells & Coppersmith (1994). Ruch gruntu jest celowo przesadzony, żeby było go widać, a czas trwania zjawisk skrócony. To model edukacyjny, a nie prognoza.

Tsunami liczą równania płytkiej wody na siatce z przesuniętymi prędkościami: strumień z komórki „pod prąd”, unoszenie prędkości z nurtem, tarcie Manninga, otwarte granice morskie (warunek Flathera). Fala wchodzi na granicy morskiej według harmonogramu zależnego od wysokości fali z prognozy. Czas tsunami biegnie 2× szybciej niż rzeczywisty.

## Struktura

```
index.html        – strona i interfejs
css/style.css     – wygląd
lib/three.min.js  – Three.js r159 (lokalnie)
js/util.js        – matematyka, szum, wzory sejsmologiczne
js/data.js        – skala Mercallego, typy budynków, scenariusze, pory dnia
js/audio.js       – dźwięk (Web Audio)
js/quake.js       – fale P/S/powierzchniowe, wstrząsy wtórne, harmonogram fal tsunami
js/world.js       – niebo, światło, teren z teksturą ulic, morze
js/city.js        – plan miasta, budynki (drgania, uszkodzenia, zawalenia), drzewa, auta, latarnie
js/fx.js          – cząsteczki, gruz, bryły z fizyką, szczeliny, pożary
js/flood.js       – symulacja wody przy brzegu i w mieście, falochron, łodzie i szczątki
js/seismo.js      – sejsmogram
js/controls.js    – kamera orbitalna
js/ui.js          – panele, prognoza, raport
js/main.js        – start i pętla główna
```
