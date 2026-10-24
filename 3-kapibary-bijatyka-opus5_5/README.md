# Kapibara Kombat

Bijatyka w stylu Street Fightera i Mortal Kombat, w której walczą kapibary. Dwóch graczy gra na jednej klawiaturze. Każda kapibara ma ponad 20 ruchów: ciosy podstawowe, ciosy specjalne, super cios i wykończenie. Do tego dochodzą combosy w łańcuchach i w powietrzu.

## Jak powstał

Dzień 3 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** środa, 21.10.2026, godz. 11:42
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 60 minut
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz proszę grę typu street fighter / mortal kombat w której dwie kapybary walczą między sobą, a gracze grają na jednej klawaiturze i mają bardzo dużo ciosów i combo do wykorzsytania.
> Ty podejmujsze wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekty. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wczesniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Gra otworzy się w przeglądarce (Chrome, Edge, Firefox).
Nie trzeba niczego instalować ani budować.

> Czcionki ładują się z Google Fonts. Bez internetu gra działa tak samo, tylko z czcionką systemową.

## Sterowanie

| | Gracz 1 (lewa strona) | Gracz 2 (prawa strona) |
|---|---|---|
| Ruch, skok, kucanie | `W` `A` `S` `D` | strzałki |
| **LŁ** – lekka łapa | `T` | `O` lub `Num4` |
| **MŁ** – mocna łapa | `Y` | `P` lub `Num5` |
| **LK** – lekkie kopnięcie | `G` | `L` lub `Num1` |
| **MK** – mocne kopnięcie | `H` | `;` lub `Num2` |
| **SP** – cios specjalny (łatwe sterowanie) | `U` | `[` lub `Num6` |
| Pauza | `Esc` | `Esc` |

Kierunki liczą się względem postaci: „→” to zawsze „do rywala”. **Blok** to trzymanie kierunku od rywala. Stojąc blokujesz ciosy z góry i średnie, a kucając niskie i średnie.

**Łatwe sterowanie:** przycisk SP sam albo z kierunkiem (`→`, `←`, `↓`) wykonuje ruch specjalny postaci bez kręcenia kierunków, zawsze w mocnej wersji. Lista ciosów pokazuje przy każdym ruchu jego łatwy odpowiednik.

**Pady:** pierwszy pad steruje graczem 1, drugi graczem 2. Krzyżak albo lewa gałka to ruch, X/□ – LŁ, Y/△ – MŁ, A/✕ – LK, B/○ – MK, RB – SP, LB – rzut, RT – MŁ+MK, Start – pauza.

> Wiele klawiatur nie rejestruje więcej niż 3–4 klawiszy naraz. Jeśli jakiś cios „nie wchodzi”, gracz 2 może użyć klawiatury numerycznej albo obaj gracze padów.

## Tryby

- **Walka 2 graczy** – obaj gracze na jednej klawiaturze.
- **Walka z komputerem** – 4 poziomy: Łatwy, Średni, Trudny, Mistrz. Komputer wykonuje te same ruchy co człowiek, łącznie z combosami i wykończeniami.
- **Bagienne Mistrzostwa** – turniej dla jednego gracza:
  - trzech rywali na kolejnych arenach (komputer Łatwy, Średni, Trudny),
  - w finale Złota wersja twojej kapibary na poziomie Mistrz,
  - punkty za obrażenia, combo, perfekcyjne rundy i wykończenia,
  - po porażce można powtórzyć walkę,
  - wygrany turniej daje medal na karcie postaci.
- **Trening**:
  - manekin może stać, kucać, skakać, blokować albo walczyć,
  - życie się odnawia, a pasek super może być bez limitu,
  - widać licznik ostatniego combo i historię wciśniętych kierunków,
  - można włączyć podgląd hitboxów.

  Klawisze: `1` – tryb manekina, `2` – hitboxy, `3` – reset pozycji, `4` – pasek super.
- W tle menu toczy się pokazowa walka dwóch kapibar sterowanych przez komputer.

## Kapibary

| Postać | Styl | Ciosy specjalne | Super (2 paski) | Kapibality |
|---|---|---|---|---|
| **Kapitan Kapi** – karateka z czerwoną opaską | wszechstronny | Pomarańczowa Kula `↓↘→+Ł`, Wznosząca Łapa `→↓↘+Ł`, Wiatrak Kapibary `↓↙←+K`, Bomba z Kąpieli `↓↓+K` | Pomarańczowy Wodospad | Owocowa Lawina `→↓→+MŁ` |
| **Mama Yuzu** – właścicielka onsenu | strefowa | Fala z Balii `↓↘→+Ł` (nisko), Gejzer `↓↙←+Ł`, Ręcznikowy Bicz `→↓↘+Ł`, Ślizg na Mydle `←→+K` | Wielka Fala (tsunami) | Wieczny Relaks `↓→↓+LK` |
| **Cień Trzciny** – ninja z bagien | szybki | Liść-Shuriken `↓↘→+Ł` (też w powietrzu), Teleport `↓↓+Ł`, Żurawi Kopniak `→↓↘+K`, Szarża Cienia `←→+Ł`, Nurkujący Kopniak (w powietrzu `↓+MK`) | Tysiąc Liści | Kapi-Maki `←→←+LŁ` |
| **Gruby Bruno** – sumita | zapaśnik | Bagienny Suplex `↓↓+Ł` (chwyt), Brzuchowa Szarża `←→+Ł` (pancerz), Młyn Łap `→↓↘+Ł`, Bagienne Tupnięcie `↓↓+K`, Lecący Brzuch `↓↘→+K` | Bomba z Trampoliny | Na Księżyc `↓↓↓+MŁ` |

Ł oznacza dowolną łapę, a K dowolne kopnięcie. Wersja z mocnym przyciskiem jest szybsza, dalsza albo mocniejsza.

## Ciosy wspólne i zasady combo

- 12 ciosów podstawowych: stojąc, kucając i w powietrzu.
- Ciosy z kierunkiem:
  - Główka z rozpędu `→+MŁ` – cios z góry,
  - Kopniak z półobrotu `←+MK` – odrzuca rywala.
- Rzut `LŁ+LK` z bliska. Z `←` rzuca za siebie. Rzut można przerwać, wciskając `LŁ+LK` zaraz po złapaniu.
- Doskok `→→` i odskok `←←`.
- **Łańcuchy**: po trafieniu lub bloku możesz od razu wejść w mocniejszy cios (LŁ → LK → MŁ → MK). Lekkie ciosy można powtarzać.
- Każdy cios naziemny można przerwać ciosem specjalnym, a cios specjalny super ciosem.
- **Wyrzut** `↓+MŁ`, a po nim `↑`, daje super skok i combo w powietrzu. Latający kopniak w combo odbija rywala od ziemi, więc da się dalej bić.
- **Super cios** kosztuje 2 paski: `↓↘→↓↘→+Ł` albo skrót `MŁ+MK`.
- **Przerywnik** kosztuje 1 pasek: `MŁ+MK` w trakcie obrywania wyrywa się z combo.
- Kontry (+20% obrażeń), osłabianie długich combo i limit żonglerki w powietrzu pilnują, żeby walka była uczciwa.
- **Wykończenia**: po ostatniej rundzie pojawia się napis „DOKOŃCZ GO!”. Wtedy można wykonać Kapibality postaci albo wspólną **Kapiprzyjaźń** `←←↓+LK`.

Pełna lista ciosów z przykładowymi combosami jest w menu **Lista ciosów** i w pauzie.

## Areny

- **Bagna Pantanalu** – zachód słońca, rzeka z kajmanem, kapibary-kibice z ptakami na głowach.
- **Gorące Źródła Yuzu** – zimowa noc, śnieg, latarnie, kibice wylegujący się w onsenie z owocami yuzu na głowach.
- **Dojo w Bambusach** – letnie popołudnie, chorągwie i spadające liście.

Kibice zrywają się z miejsc po mocnych ciosach i superach.

## Opcje

Opcje są zapisywane w przeglądarce:

- rundy do zwycięstwa (1–3),
- czas rundy (60 s, 99 s albo bez limitu),
- poziom komputera,
- wykończenia,
- efekty dźwiękowe, muzyka, komentator i głosy kapibar,
- hitboxy,
- pełny ekran.

Muzyka jest syntezowana na żywo przez Web Audio, a do każdej areny gra osobny utwór. Głosy i odgłosy walki zostały nagrane w ElevenLabs (paczka `audio/dzwieki.js`, 143 nagrania, 1,7 MB, ładowana po starcie strony):

- **Komentator** – lektor, który zapowiada rundy, nokauty, wykończenia, zwycięzców, nazwy postaci i chwali combosy.
- **Kapibary** – każda ma swój głos i zabawne kwestie: „Ała, boli!”, „Aj, aj, moje pośladki!”, okrzyki przy ciosach specjalnych, nazwę super ciosu, krzyk przy nokaucie i cytat zwycięstwa.
- **Odgłosy walki** – trafienia, bloki, zamachy, upadki, gong, plusk i doping kibiców.

Gdy paczki nagrań nie ma, gra wraca do dźwięków syntezowanych i syntezy mowy przeglądarki.

## Struktura

```
index.html          – strona i ekrany menu
css/style.css       – wygląd interfejsu
js/util.js          – matematyka, kolory, zapis ustawień
js/input.js         – klawiatura, układy graczy, rozpoznawanie ruchów specjalnych
js/audio.js         – efekty, muzyka generowana na żywo, komentator
js/rig.js           – rysowanie kapibary (szkielet z IK), pozy i ich przejścia
js/fx.js            – iskry trafień, kurz, krople, liście, napisy
js/moves.js         – ciosy wspólne, rzut, przerywnik
js/fighter.js       – wojownik: stany, łańcuchy combo, fizyka
js/characters.js    – cztery kapibary, ich kostiumy, ciosy specjalne, supery i pociski
js/finishers.js     – Kapibality i Kapiprzyjaźń
js/stage.js         – areny z paralaksą, kibice, pogoda
js/ai.js            – przeciwnik komputerowy
js/game.js          – rundy, trafienia, kamera, HUD
js/ui.js            – menu, wybór postaci, lista ciosów, opcje, wyniki
js/ladder.js        – Bagienne Mistrzostwa (turniej), odmiany wyglądu
js/main.js          – pętla gry 60 kl./s z interpolacją obrazu i dopasowanie do okna
audio/dzwieki.js    – nagrania z ElevenLabs (mp3 w base64, działa też z file://)
```

## Rozwój po eksperymencie

24.10.2026 grę oceniło czterech agentów z [`.claude/agents/`](../.claude/agents/): design, UX, wydajność i rozwój produktu. Wdrożone poprawki:

- **Sterowanie:**
  - przycisk SP i obsługa padów,
  - Kula w marszu nie wychodzi już jako podbródkowy,
  - blok i kucanie nie odpalają przypadkiem szarży ani Bomby,
  - szybki łańcuch nie zjada paska super,
  - ↑ wciśnięte w czasie zamrożenia po wyrzucie daje super skok,
  - Kapiprzyjaźń nie zamienia się w odskok,
  - legenda klawiszy w pierwszej rundzie.
- **Płynność:** obraz interpolowany między krokami fizyki (koniec szarpnięć na monitorach 59, 75 i 144 Hz), pauza po Alt+Tab, Tab nie wynosi fokusu z gry.
- **Rozgrywka:**
  - Bagienne Mistrzostwa,
  - komputer broni się także między decyzjami: losowe walenie w klawisze nie wygrywa już ze Średnim za każdym razem,
  - balans: super Bruna 380 → 310 obrażeń, Cień 920 → 960 HP i mocniejsze Tysiąc Liści, super Kapiego trafia pełną serią z bliska,
  - inny kolor futra w walce lustrzanej.
- **Dźwięk:**
  - nagrania z ElevenLabs,
  - muzyka milknie w pauzie i w ukrytej karcie,
  - dźwięki menu i komentator przy wyborze postaci w ogóle działają (wcześniej wyciszało je tło menu),
  - pierwszy klawisz włącza dźwięk (wcześniej dopiero kliknięcie).
- **Wygląd:**
  - ekrany przewijają się na telefonie i niskich laptopach, tło menu wypełnia telefon w pionie,
  - bez zdublowanych i nakładających się napisów,
  - imiona w kolorze tekstu zamiast koloru, który mylił się z kolorem gracza,
  - pasek super pod stopami postaci, licznik combo gracza 2 czytany we właściwej kolejności,
  - przygaszeni kibice, jaśniejszy Cień na nocnej arenie, cała głowa w portretach,
  - wstrząsy i błyski przygaszone przy ustawieniu „ogranicz ruch”.
- **Wydajność:** pauza rysuje obraz raz, menu w połowie rozdzielczości pod rozmyciem, błysk trafienia bez `ctx.filter`, dźwięk wstrzymany w ukrytej karcie.
