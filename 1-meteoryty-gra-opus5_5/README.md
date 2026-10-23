# Tarcza Ziemi

Gra przeglądarkowa: z każdej strony nadlatują meteoryty, a Ty bronisz Ziemi działem orbitalnym, tarczą energetyczną, impulsem EMP i satelitami obronnymi.

## Jak powstał

Dzień 1 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** poniedziałek, 19.10.2026, godz. 21:20
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 35 minut
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz proszę grę w któej gracz ma za zadanie obronić ziemię przed spadającymi metorytami. Ty podejmujsze wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekty. (Umieść go w folderze 1-meteoryty-gra-opus5_5)

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Gra otworzy się w przeglądarce (Chrome, Edge, Firefox, Safari).
Nie trzeba niczego instalować ani budować. Działa też na telefonie i tablecie (sterowanie dotykiem).

> Czcionki ładują się z Google Fonts. Bez internetu gra działa tak samo, tylko z czcionką systemową.

## Sterowanie

| Klawisz | Działanie |
|---|---|
| Mysz | celowanie |
| Lewy przycisk (przytrzymaj) | ogień ciągły |
| Prawy przycisk / Spacja | Impuls EMP – fala uderzeniowa wokół planety |
| F | auto-ogień (zapamiętywany) |
| P / Esc | pauza |
| M / N | dźwięk / muzyka |
| 1–0, Enter | zakupy w sklepie (0 = naprawa), następna fala |
| Q / W / E, R | wybór protokołu obrony, ponowne losowanie |
| Dotyk | przytrzymaj palec, aby strzelać; dwa palce = EMP |

## Co jest w grze

- **Nieskończone fale** z rosnącą trudnością, a co 5. fala nadlatuje **Planetoida** (boss z paskiem życia), która wyrzuca z siebie odłamki. Co druga planetoida to **Bliźnięta**: dwie mniejsze z przeciwnych stron.
- **Wydarzenia fal** od fali 3: deszcz kapsuł, rój Perseidów, ostrzał salwami, pole żelaza, niestabilny rój, burza słoneczna, deszcz komet, dwa fronty. Sklep zapowiada wydarzenie następnej fali.
- **Protokoły obrony**: po falach 2, 4, 7, 10, 14, 18 (i dalej co 4) wybierasz 1 z 3 kart na resztę gry, najwyżej 4. Każda ma plus i minus, np. Działo szynowe, Reakcja łańcuchowa, Tarcza zwierciadlana, Kriopociski, Rój. Ofertę można przelosować za kredyty.
- **6 rodzajów meteorytów**:
  - skalne, które rozpadają się na mniejsze,
  - szybkie odłamki,
  - pancerne żelazne,
  - wybuchowe, które wywołują reakcje łańcuchowe,
  - komety, które rozpadają się na lód,
  - Planetoida.
- **Tarcza** pochłania uderzenia i sama się regeneruje. Gdy padnie, obrywa planeta, a na jej powierzchni zostają żarzące się kratery.
- **Combo i mnożnik punktów** (do ×5) za szybkie, następujące po sobie zestrzelenia.
- **Bonusy** w kapsułach (trzeba je zestrzelić): szał ognia, salwa, spowolnienie czasu, odnowienie tarczy, bomba orbitalna, naprawa planety.
- **Sklep między falami** z 9 ulepszeniami: obrażenia, szybkostrzelność, wielolufowość, przebicie, pociski samonaprowadzające, tarcza, regeneracja, satelity obronne i EMP, plus naprawa planety. Moc działa i szybkostrzelność można podkręcać ponad 10. poziom, coraz drożej.
- Premia za falę bez uszkodzeń planety. Ekipy naprawcze odbudowują planetę między falami.
- Rekord i najdalsza fala są zapisywane w przeglądarce. Ekran końca gry podaje, co zadało ostatni cios, i podpowiada, co zmienić.
- Pauza ma przełączniki auto-ognia i wstrząsów ekranu. Przy systemowym „ograniczeniu ruchu” wstrząsy i błyski są domyślnie wyłączone.
- Ziemia jest generowana proceduralnie i obraca się: ma kontynenty, chmury, światła miast po nocnej stronie i atmosferę.
- Dźwięk i muzyka są syntezowane na żywo przez Web Audio, bez plików audio.

## Struktura

```
index.html        – strona gry i ekrany interfejsu
css/style.css     – wygląd interfejsu i HUD
js/util.js        – matematyka, szum proceduralny, zapis
js/data.js        – meteoryty, ulepszenia, bonusy, ikony
js/audio.js       – efekty dźwiękowe i muzyka
js/planet.js      – renderer obracającej się Ziemi
js/background.js  – kosmiczne tło
js/fx.js          – cząsteczki, grafika meteorytów
js/game.js        – logika gry i rysowanie świata
js/ui.js          – menu, HUD, sklep
js/main.js        – pętla gry i sterowanie
```

## Rozwój po eksperymencie

23.10.2026 grę oceniło czterech agentów z [`.claude/agents/`](../.claude/agents/): design, UX, wydajność i rozwój produktu. Wdrożone poprawki:

- **Rozgrywka:** protokoły obrony, wydarzenia fal, Bliźnięta, łagodniejsza pierwsza planetoida (800 HP, wolniejsza) z limitem uderzenia, wykładniczy wzrost wytrzymałości meteorytów od fali 8, meteoryty wypchnięte za ekran wracają (koniec z czekaniem na niewidoczny cel), podpowiedzi sterowania i EMP.
- **Wygląd:** Oxanium uzupełnia polskie znaki w krojach Orbitron, HUD na telefonie bez nakładania się, przyklejona stopka sklepu i pomocy, naprawa w stopce sklepu (siatka 3×3), fokus klawiatury, większe strzałki ostrzegawcze.
- **Wydajność:** pauza rysuje obraz raz, planeta przeliczana co 3. klatkę, gwiazdy rysowane kubełkami, limit cząsteczek zależny od jakości, czcionki nie blokują startu, dźwięk wstrzymany w ukrytej karcie, wyjątek w klatce nie zatrzymuje pętli.
