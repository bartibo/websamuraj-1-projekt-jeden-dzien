# Odbijanka

Gra paletkowa w przeglądarce. Odbijasz piłkę, nie przepuszczasz ani jednej. Możesz zagrać z komputerem (trzy poziomy), z drugim graczem na jednej klawiaturze albo sam ze sobą, walcząc z własnym rekordem i jego duchem.

## Jak powstała

Dzień 17 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** wtorek, 10.11.2026, godz. 09:38
- **Model:** Claude Haiku 5.5 (`claude-haiku-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 10 min (szacunek z zapisu sesji)
- **Poprawki:** brak. Po prompcie nie było żadnej kolejnej wiadomości dotyczącej projektu (późniejsza prośba o wrzucenie na GitHub nie zmieniała kodu)
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz grę typu paddel, która będzie wciągająca dla gracza i w której będzie on mógł rywalizować sam ze sobą albo z graczem-komputerem. Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Gra otworzy się w przeglądarce (Chrome, Edge, Firefox, Safari).
Nie trzeba niczego instalować ani budować. Działa też na telefonie i tablecie (sterowanie dotykiem).

> Czcionki ładują się z Google Fonts. Bez internetu gra działa tak samo, tylko z czcionką systemową.

## Tryby

| Tryb | Opis |
|---|---|
| **Ty vs komputer** | Mecz do 3, 7 lub 11 punktów. Komputer ma trzy poziomy: łatwy, normalny i trudny. |
| **Dwóch graczy** | Ta sama klawiatura: gracz 1 używa W/S, gracz 2 strzałek. Mecz do 3, 7 lub 11 punktów. |
| **Sam ze sobą** | Jedna paletka, trzy życia, bez końca. Każde odbicie to punkt. Najlepsza seria zostaje zapisana, a jej **duch** (biała, przerywana paletka) pokazuje, jak wyglądała, i informuje, czy w tej chwili prowadzisz. |

## Sterowanie

| Klawisz | Działanie |
|---|---|
| W / S (lub ↑ / ↓ w trybach z jednym graczem) | ruch paletki |
| ↑ / ↓ (gracz 2 w trybie dwóch graczy) | ruch prawej paletki |
| Mysz / dotyk | paletka podąża za kursorem lub palcem (w trybie dwóch graczy: lewa połowa – gracz 1, prawa – gracz 2) |
| P / Esc | pauza |
| M | dźwięk wł. / wył. |
| Enter | start, rewanż albo wznowienie z pauzy |

## Co jest w grze

- **Kąt odbicia zależy od miejsca trafienia.** Uderzenie krawędzią paletki wysyła piłkę pod ostrym kątem, środkiem – płasko.
- **Piłka przyspiesza z każdym odbiciem**, aż do maksymalnej prędkości. Im dłuższa wymiana, tym trudniej.
- **Cztery power-upy** (kolorowe kółka na boisku, zbiera je ten, kto ostatnio odbił piłkę):
  - **L – Długa paletka** – paletka jest dłuższa przez 9 s.
  - **T – Tarcza** – blokuje jedną piłkę na twojej linii bramkowej przez 14 s.
  - **x2 – Dodatkowa piłka** – na boisku pojawia się druga (lub trzecia) piłka.
  - **S – Spowolnienie** – piłki zwalniają na 5 s.
- **Odliczanie 3-2-1** przed każdym startem piłki.
- **Dźwięki są syntezowane w przeglądarce** (Web Audio), bez plików audio.
- **Zapis w przeglądarce:** ustawienia trybu i rekord solo są zapamiętywane w `localStorage` na tym urządzeniu.

## Struktura projektu

```
index.html          menu, pauza, ekran końca i kontener planszy
css/style.css       wygląd: neon, nakładki, przyciski, responsywność
js/dzwiek.js        dźwięki (Web Audio)
js/ai.js            komputerowy przeciwnik: przewidywanie toru piłki i poziomy trudności
js/gra.js           logika rozgrywki: piłki, paletki, kolizje, punkty, power-upy, duch
js/rysowanie.js     rysowanie planszy na canvasie
js/app.js           pętla gry, menu, klawiatura, mysz, dotyk, zapis
```

Skrypty ładują się zwykłymi tagami `<script>` (bez modułów ES), więc gra działa też z dysku, bez serwera.
