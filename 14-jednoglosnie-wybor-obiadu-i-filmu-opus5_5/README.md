# Jednogłośnie

Aplikacja do szybkiego rozstrzygania grupowych dylematów: **co jemy?** i **co oglądamy?** Jedno kliknięcie zakłada pokój, link (albo kod QR) idzie do znajomych, a każdy na swoim telefonie przesuwa karty jak w aplikacji randkowej: w prawo – chętnie, w lewo – nie. Gdy **wszyscy** w pokoju polubią tę samą propozycję, u wszystkich naraz pojawia się ekran „Jednogłośnie!” z konfetti.

Nie trzeba się rejestrować ani niczego instalować. Pokój nie ma własnego serwera – działa przez dwa publiczne serwery MQTT.

## Jak powstał

Dzień 14 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** czwartek, 05.11.2026, godz. 19:36
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 35 minut
- **Poprawki:** brak. Po prompcie nie było żadnej kolejnej wiadomości dotyczącej projektu (późniejsza prośba o wrzucenie na GitHub nie zmieniała kodu)
- **Prompt** (dosłownie, z oryginalną pisownią):

> Zaprojektuj działającą bez rejestracji aplikację internetową do błyskawicznego rozwiązywania grupowych dylematów obiadowych lub filmowych, która pozwala założyć pokój jednym kliknięciem, wygenerować unikalny link dla znajomych, a następnie umożliwia każdemu uczestnikowi szybkie ocenianie proponowanych opcji w stylu interfejsu Tindera aż do momentu, gdy system natychmiast ogłosi wspólne dopasowanie wszystkich osób. Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Do zabawy z innymi potrzebny jest internet.

- **„Co jemy?”** albo **„Co oglądamy?”** – pokój powstaje od razu i otwiera się okno zaproszenia (link, WhatsApp, SMS, e-mail, kod QR, systemowe „Udostępnij”).
- **„Wypróbuj z wirtualnymi znajomymi”** – pokój próbny bez internetu: po chwili dołączają Ania, Kuba i Zosia i przesuwają razem z Tobą. Dobre do sprawdzenia, jak wygląda dopasowanie, gdy nikogo nie ma pod ręką.
- **„Własne propozycje”** – dowolne pytanie („Gdzie jedziemy na weekend?”) i własna lista, każda propozycja w osobnej linii, emoji na początku linii trafia na kartę.
- **„Dostosuj pokój”** – filtry (tylko wege, bez ostrego, na wynos, do zrobienia w domu; gatunki filmów, do 2 godzin, tylko polskie), liczba kart (15 / 25 / 40 / wszystkie) i dorzucenie własnych propozycji.

**Otwarte z pliku (`file://`):** link dla znajomych prowadzi do wersji online tej samej aplikacji (`1prompt1zdanie.vibemaster.pl/14-…`). Pokój jest wspólny, bo żyje na serwerach MQTT, a nie na tym komputerze. W oknie zaproszenia jest też przycisk **„Otwórz kartę jako druga osoba (test)”** – otwiera pokój w nowej karcie jako ktoś inny, żeby sprawdzić całość na jednym komputerze.

## Jak to działa

1. **Pokój jednym kliknięciem.** Losowy identyfikator (10 znaków) trafia do adresu: `index.html#p=k3x9…`. Ten adres jest zaproszeniem.
2. **Dołączanie.** Kto otworzy link, widzi „🦊 Głodny Bóbr zaprasza do wyboru”, ma wylosowany zabawny pseudonim z emoji (przymiotnik zgadza się z rodzajem zwierzęcia: „Leniwa Wydra”, „Sprytny Szop”) i jeden przycisk „Dołączam i przesuwam”.
3. **Przesuwanie.** Kartę można przeciągnąć palcem lub myszą (z pieczątką TAK!/NIE, rzutem zależnym od prędkości gestu i obrotem zależnym od miejsca chwytu), kliknąć ✕ / ♥ albo użyć strzałek ← →. Przycisk ↺ (lub Backspace) cofa ostatni ruch.
4. **Co polubili inni, trafia do Ciebie szybciej.** Każdy dostaje karty w innej, losowej kolejności, ale propozycje, które ktoś już polubił, wskakują na początek talii z plakietką „🔥 2 osoby na tak” albo „🔥 Wszyscy poza Tobą na tak!”. Dzięki temu zgoda pojawia się zwykle po kilku kartach, a nie na końcu talii. Karta, którą właśnie oglądasz, nigdy nie podmienia się pod palcem.
5. **Dopasowanie.** Propozycja polubiona przez wszystkie osoby w pokoju (co najmniej dwie) od razu wywołuje u każdego pełnoekranowe „Jednogłośnie!”: konfetti z emoji zwycięzcy, fanfara, wibracja, awatary całej ekipy i przydatne linki (dla jedzenia: Mapy Google w pobliżu, z dostawą, przepis; dla filmu: JustWatch – gdzie obejrzeć, zwiastun, Filmweb). Można szukać dalej – kolejne dopasowania zbierają się pod 🏆 w nagłówku.
6. **Koniec talii bez zgody.** Ranking „Najbliżej zgody”, lista osób, które jeszcze przesuwają, oraz dwa wyjścia:
   - **Druga szansa** – wracają karty odrzucone przez Ciebie, które ktoś inny lubi;
   - **Niech zdecyduje los** – losowanie spośród propozycji z największym poparciem. Los jest wyliczany z identyfikatora pokoju, więc każdy w pokoju dostaje ten sam wynik.

**Kto się liczy do zgody:** każda osoba, która dołączyła. Kto zamknie stronę, od razu (najpóźniej po ok. 40 s) dostaje status „poza pokojem” i można go **usunąć z głosowania** (panel osób po kliknięciu awatarów), żeby dopasowanie na niego nie czekało. Kto dołączy później, dostaje na początek talii to, co inni już lubią.

## Propozycje

- **Obiad – 46 dań:** od pierogów, schabowego i żurku w chlebie, przez ramen, pho, bibimbap, curry i chaczapuri, po burgera, tacos, gofry na obiad i „gotujemy razem w domu”. Każde z emoji, kuchnią, opisem i cechami (wege, ostro, szybko, na wynos…).
- **Film – 72 filmy:** klasyki i hity różnych gatunków (komedie, dramaty, sci-fi, animacje, horrory, romanse, kryminały), w tym polskie: „Miś”, „Seksmisja”, „Dzień świra”, „Psy”, „Chłopaki nie płaczą”, „Pianista”, „Boże Ciało”. Karta wygląda jak plakat: rok, tytuł, gatunek, czas trwania, reżyseria, opis. Bez okładek z internetu – każdy „plakat” jest rysowany z kolorów i emoji.
- **Własna lista:** do 60 pozycji, z dowolnym pytaniem jako tytułem pokoju.

## Synchronizacja bez serwera

Pokój to zbiór kilku wiadomości: opis pokoju (`room`), stan każdej osoby (`p/<id>` – pseudonim, emoji, „tak”/„nie”), usunięcia (`wyl/<id>`) i „bicie serca” (`hb/<id>` co 12 s – kto jest teraz w pokoju). Każda wiadomość idzie naraz:

| Kanał | Po co |
|---|---|
| `wss://broker.emqx.io:8084/mqtt` (EMQX) | publiczny broker MQTT; wiadomości „retained”, więc kto wejdzie później, od razu dostaje cały stan pokoju |
| `wss://broker.hivemq.com:8884/mqtt` (HiveMQ) | drugi, niezależny broker – jak jeden nie działa, pokój działa przez drugi |
| `BroadcastChannel` | inne karty tej samej przeglądarki, także bez internetu |
| `localStorage` | odświeżenie strony niczego nie gubi; ogłoszone dopasowania nie wyskakują drugi raz |

Przy konflikcie wygrywa wiadomość z wyższym numerem wersji. Każda osoba zapisuje tylko swój własny stan, więc nie ma sporów o to, kto co kliknął. Klient MQTT 3.1.1 (CONNECT z „ostatnią wolą”, SUBSCRIBE, PUBLISH, PING, automatyczne wznawianie) jest napisany od zera w ok. 200 liniach, bez bibliotek. Wszystko, co przychodzi z sieci, jest sprawdzane (typy, długości, dozwolone identyfikatory) i wstawiane jako tekst, nie jako HTML.

**Prywatność:** na publiczne serwery trafiają tylko pseudonim, emoji, lista propozycji pokoju i Twoje „tak”/„nie”. Publiczne brokery są jawne – kto zna identyfikator pokoju, może go podejrzeć – dlatego nie należy tu wpisywać danych osobowych. Identyfikatora nie da się zgadnąć (31¹⁰ możliwości).

## Technika

- HTML, CSS i JavaScript bez budowania. Zwykłe skrypty zamiast modułów ES, żeby strona działała z `file://`.
- Jedyna biblioteka: generator kodów QR [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (Kazuhiko Arase, licencja MIT), dołączony lokalnie w `lib/`.
- Krój Bricolage Grotesque z Google Fonts (bez internetu zastępuje go krój systemowy).
- Typografia kart liczona w jednostkach kontenera (`cqw`), więc ta sama karta skaluje się w stosie, na telefonie i na ekranie dopasowania.
- Dźwięki syntezowane na żywo w Web Audio (bez plików), wyłączane w panelu osób. Konfetti na `<canvas>`.
- Pełna obsługa klawiaturą, ruch ograniczony dla osób, które go wyłączyły w systemie.

## Struktura

```
index.html      – ekrany: start, dołączanie, pokój; okna: zaproszenie, osoby, wyniki, nowy pokój; nakładka dopasowania
css/style.css   – wygląd: ciemny motyw, kafle, karty-plakaty, pieczątki, arkusze, konfetti, wersja na telefon
js/mqtt.js      – minimalny klient MQTT 3.1.1 po WebSocket
js/lacze.js     – łącze pokoju: dwa brokery + BroadcastChannel + pamięć, scalanie po wersji
js/dane.js      – 46 dań, 72 filmy, gatunki, generator pseudonimów z odmianą
js/karty.js     – wygląd kart i stos z gestami (przeciąganie, rzut, cofanie)
js/app.js       – logika: tworzenie i dołączanie, kolejność kart, głosy, dopasowania, druga szansa, losowanie, wirtualni znajomi
lib/qrcode.js   – generator kodów QR (MIT)
```
