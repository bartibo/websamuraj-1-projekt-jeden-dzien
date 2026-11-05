# Jednogłośnie

Aplikacja do szybkiego rozstrzygania grupowych dylematów: **co jemy?** i **co oglądamy?** Jedno kliknięcie zakłada pokój, link (albo kod QR) idzie do znajomych, a każdy na swoim telefonie przesuwa karty jak w aplikacji randkowej: w prawo – chętnie, w lewo – nie. Gdy **wszyscy** w pokoju polubią tę samą propozycję, u wszystkich naraz pojawia się ekran „Jednogłośnie!” z konfetti.

Nie trzeba się rejestrować ani niczego instalować. Pokój nie ma własnego serwera – działa przez dwa publiczne serwery MQTT, a wszystko, co tam trafia, jest zaszyfrowane kluczem zapisanym w samym linku.

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
- **„Dostosuj pokój”** – filtry (tylko wege, bez ostrego, na wynos, do zrobienia w domu; gatunki filmów, do 2 godzin, tylko polskie), liczba kart (15 / 25 / 40 / wszystkie), dorzucenie własnych propozycji, **kiedy ogłaszamy dopasowanie** (wszyscy na tak albo wszyscy oprócz jednej osoby) i **czas na decyzję** (bez limitu, 2, 5 albo 10 minut).

**Otwarte z pliku (`file://`):** link dla znajomych prowadzi do wersji online tej samej aplikacji (`projekty.vibemaster.pl/14-…`). Pokój jest wspólny, bo żyje na serwerach MQTT, a nie na tym komputerze. W oknie zaproszenia jest też przycisk **„Otwórz kartę jako druga osoba (test)”** – otwiera pokój w nowej karcie jako ktoś inny, żeby sprawdzić całość na jednym komputerze. Szyfrowanie wymaga bezpiecznej strony (`https://` albo plik z dysku); zwykłe `http://` po adresie IP w sieci domowej nie połączy się z innymi i aplikacja o tym mówi.

## Jak to działa

1. **Pokój jednym kliknięciem.** Losowy identyfikator (16 znaków) trafia do adresu: `index.html#p=k3x9…`. Ten adres jest zaproszeniem i zarazem kluczem do pokoju.
2. **Dołączanie.** Kto otworzy link, widzi „🦊 Głodny Bóbr zaprasza do wyboru”, ma wylosowany zabawny pseudonim z emoji (przymiotnik zgadza się z rodzajem zwierzęcia: „Leniwa Wydra”, „Sprytny Szop”) i jeden przycisk „Dołączam i przesuwam”.
3. **Przesuwanie.** Kartę można przeciągnąć palcem lub myszą (z pieczątką TAK!/NIE, rzutem zależnym od prędkości gestu i obrotem zależnym od miejsca chwytu), kliknąć ✕ / ♥ albo użyć strzałek ← →. Przycisk ↺ (lub Backspace) cofa ostatni ruch. **Dotknięcie karty** (albo ⓘ, albo spacja) pokazuje jej drugą stronę: pełny opis, cechy i linki – zwiastun, Filmweb, „gdzie obejrzeć”, przepis, „w pobliżu”.
4. **Co polubili inni, trafia do Ciebie szybciej.** Każdy dostaje karty w innej, losowej kolejności, ale propozycje, które ktoś już polubił, wskakują na początek talii z plakietką „🔥 2 osoby na tak” albo „🔥 Wszyscy poza Tobą na tak!”. Dzięki temu zgoda pojawia się zwykle po kilku kartach, a nie na końcu talii. Karta, którą właśnie oglądasz, nigdy nie podmienia się pod palcem.
5. **Dorzucanie w trakcie.** Przycisk **„＋ Dorzuć”** pod kartami: każdy może dodać do 10 własnych propozycji („🥟 Pierogarnia na rogu”). Trafiają do talii wszystkich z podpisem „Dorzuca: 🦊 Ania”, a autor jest od razu na „tak”, więc inni widzą je na początku.
6. **Dopasowanie.** Propozycja polubiona przez wszystkie osoby w pokoju (co najmniej dwie) od razu wywołuje u każdego pełnoekranowe „Jednogłośnie!”: konfetti z emoji zwycięzcy, fanfara, wibracja, awatary całej ekipy i przydatne linki (dla jedzenia: Mapy Google w pobliżu, z dostawą, przepis; dla filmu: JustWatch – gdzie obejrzeć, zwiastun, Filmweb). Można szukać dalej – kolejne dopasowania zbierają się pod 🏆 w nagłówku.
7. **Wszyscy oprócz jednej osoby.** W tym trybie (do wyboru przy zakładaniu) wystarczy, że na „tak” są wszyscy poza jedną osobą, a każdy obejrzał kartę – ekran mówi wtedy „Prawie jednogłośnie!”. Za to każdy ma jedno **weto ⛔** (przycisk z lewej albo klawisz W): zawetowana propozycja nie wygra, nawet gdy reszta jest na tak.
8. **Czas na decyzję.** Odliczanie (⏱ pod kartami) startuje, gdy do pokoju dołączy druga osoba. Gdy czas minie bez dopasowania, u wszystkich naraz pojawia się „Wybrane!” – propozycja z największym poparciem.
9. **Koniec talii bez zgody.** Ranking „Najbliżej zgody”, lista osób, które jeszcze przesuwają (z informacją, kto jest poza pokojem), oraz wyjścia:
   - **Druga szansa** – wracają karty odrzucone przez Ciebie, które ktoś inny lubi;
   - **Niech zdecyduje los** – losowanie spośród propozycji z największym poparciem. Wynik trafia do pokoju, więc ekran „Los zdecydował!” pojawia się u wszystkich naraz, z tą samą propozycją. Gdy ktoś jeszcze przesuwa, aplikacja pyta, czy losować już teraz.
10. **Nowa runda z tą ekipą.** Po dopasowaniu (albo losowaniu) przycisk **„🔁 Nowa runda”** zakłada kolejny pokój – np. po obiedzie film. Wszyscy z obecnego pokoju dostają zaproszenie u góry ekranu i dołączają jednym kliknięciem, bez wysyłania nowego linku.

**Kto się liczy do zgody:** każda osoba, która dołączyła. Kto zamknie stronę, od razu (najpóźniej po ok. 45 s) dostaje status „poza pokojem” i można go **usunąć z głosowania** – w panelu osób (kliknięcie awatarów) albo wprost na ekranie końca talii – żeby dopasowanie na niego nie czekało. Usunięcie nie kasuje głosów: gdy ta osoba wróci (np. odblokuje telefon), zobaczy „Wracam do głosowania” i jednym kliknięciem wraca ze wszystkimi swoimi głosami. Usuniętą osobę można też przywrócić z panelu osób. Kto dołączy później, dostaje na początek talii to, co inni już lubią, a wcześniejsze dopasowania nie znikają – w 🏆 są oznaczone ⏳ „czeka na nowe osoby”.

## Propozycje

- **Obiad – 46 dań:** od pierogów, schabowego i żurku w chlebie, przez ramen, pho, bibimbap, curry i chaczapuri, po burgera, tacos, gofry na obiad i „gotujemy razem w domu”. Każde z emoji, kuchnią, opisem i cechami (wege, ostro, szybko, na wynos…).
- **Film – 107 filmów:** klasyki i hity różnych gatunków (komedie, dramaty, sci-fi, animacje, horrory, romanse, kryminały, fantasy, westerny), nowości z lat 2024–2025 („Diuna: Część druga”, „Konklawe”, „Dziki robot”, „Flow”, „Grzesznicy”, „Jedna bitwa po drugiej”) i 15 polskich: „Miś”, „Rejs”, „Sami swoi”, „Seksmisja”, „Kiler”, „Psy”, „Chłopaki nie płaczą”, „Dzień świra”, „Pianista”, „Sala samobójców”, „Ida”, „Bogowie”, „Zimna wojna”, „Boże Ciało”, „Chłopi”. Karta wygląda jak plakat: rok, tytuł, gatunek, czas trwania, reżyseria, opis. Bez okładek z internetu – każdy „plakat” jest rysowany z kolorów i emoji.
- **Własna lista:** do 60 pozycji, z dowolnym pytaniem jako tytułem pokoju.

## Rozwój po eksperymencie

05.11.2026 (wieczorem) projekt został przeanalizowany (cały kod) i przetestowany w Chrome na telefonie (320, 360 i 390 px) i komputerze, z prawdziwymi serwerami MQTT i kilkoma osobami w jednym pokoju. Synchronizacja była szybka (dołączenie ok. 1 s, dopasowanie u wszystkich naraz), ale znalazły się poważne problemy: ekran dołączania był szerszy niż telefon (karta ucięta, przewijanie w bok – a to pierwszy ekran każdego zaproszonego), jedna subskrypcja `jednoglosnie/v1/#` pokazywała wszystkie pokoje z identyfikatorami i listami propozycji (każdy mógł wejść, wyrzucić kogoś albo podmienić pokój), osoba z zablokowanym telefonem po usunięciu z głosowania traciła wszystkie głosy, a „Niech zdecyduje los” działało tylko u osoby, która kliknęła. Wdrożone zmiany:

- **Szyfrowanie end-to-end.** Z identyfikatora pokoju (tylko w linku, po `#`, więc nie trafia do żadnego serwera) powstaje nazwa tematu (skrót SHA-256) i klucz AES-GCM. Broker widzi losowy temat i szyfrogramy; podsłuch z gwiazdką w teście: 104 wiadomości, zero jawnego tekstu. Bez klucza nie da się podrobić wiadomości, a w środku szyfrogramu jest nazwa klucza, więc nie da się przenieść cudzej wiadomości pod inny temat. Identyfikator ma 16 znaków (ok. 79 bitów), protokół `jednoglosnie/v2/`.
- **Telefon w kieszeni.** Klient MQTT wykrywa martwe połączenie (brak odpowiedzi na PING) i łączy od nowa; po odblokowaniu telefonu, powrocie do karty i odzyskaniu internetu łączy się od razu, bez czekania do 15 s. Po każdym połączeniu wysyła „jestem”, więc nowa osoba jest widoczna na żywo od razu, a nie po 12 s. Usunięcie z głosowania nie kasuje głosów – powrót jednym kliknięciem, a usuniętą osobę można przywrócić.
- **Wspólne decyzje:** los i koniec czasu są zapisywane w pokoju, więc wynik pojawia się u wszystkich naraz i jest taki sam.
- **Nowe:** dorzucanie propozycji w trakcie, nowa runda z tą samą ekipą (automatyczne dołączenie), czas na decyzję, tryb „wszyscy oprócz jednej osoby” z wetem, druga strona karty ze szczegółami i linkami, 35 nowych filmów.
- **UX:** ekran dołączania mieści się na każdym telefonie; nakładka „Jednogłośnie!” nie prześwituje (przyciemnienie i rozmycie tła); krótszy status w nagłówku („2 osoby na żywo”), który nie jest już ucinany obok 🏆; na końcu talii widać, kto jest poza pokojem, i można go od razu usunąć z głosowania; dopasowanie nie znika z 🏆, gdy ktoś dołącza później; na Windows nie ma flag-liter („IT WŁOCHY”) – zostaje sama nazwa kraju; obrazek podglądu linku (`og:image`, `galeria/projekt-14.jpg`) i link „← Wszystkie projekty”; link z pliku prowadzi do tej wersji (`projekty.vibemaster.pl`), a nie do oryginału.

## Synchronizacja bez serwera

Pokój to zbiór kilku wiadomości: opis pokoju (`room`), stan każdej osoby (`p/<id>` – pseudonim, emoji, „tak”/„nie”/weto), propozycje dorzucone w trakcie (`dod/<id>`), usunięcia i powroty (`wyl/<id>`), wspólna decyzja losu lub czasu (`decyzja`), zaproszenie do nowej rundy (`nast`) i „bicie serca” (`hb/<id>` co 12 s – kto jest teraz w pokoju). Każda wiadomość idzie naraz:

| Kanał | Po co |
|---|---|
| `wss://broker.emqx.io:8084/mqtt` (EMQX) | publiczny broker MQTT; wiadomości „retained”, więc kto wejdzie później, od razu dostaje cały stan pokoju |
| `wss://broker.hivemq.com:8884/mqtt` (HiveMQ) | drugi, niezależny broker – jak jeden nie działa, pokój działa przez drugi; po każdym połączeniu uczestnicy odświeżają u brokera cały znany stan, więc zgubione wiadomości wracają |
| `BroadcastChannel` | inne karty tej samej przeglądarki, także bez internetu |
| `localStorage` | odświeżenie strony niczego nie gubi; ogłoszone dopasowania nie wyskakują drugi raz |

Przy konflikcie wygrywa wiadomość z wyższym numerem wersji. Każda osoba zapisuje głównie swój własny stan, więc nie ma sporów o to, kto co kliknął. Klient MQTT 3.1.1 (CONNECT z „ostatnią wolą”, SUBSCRIBE, PUBLISH, PING z wykrywaniem martwego połączenia, automatyczne wznawianie) jest napisany od zera, bez bibliotek. Wszystko, co przychodzi z sieci, jest odszyfrowywane, sprawdzane (typy, długości, dozwolone identyfikatory) i wstawiane jako tekst, nie jako HTML.

**Prywatność:** na publiczne serwery trafiają wyłącznie szyfrogramy. Bez linku nie da się odczytać ani listy propozycji, ani pseudonimów, ani głosów. Serwer widzi tylko, że jakiś temat istnieje, ile ma kluczy (czyli mniej więcej ile osób) i kiedy przychodzą wiadomości. Kto ma link, jest w pokoju – link warto więc wysyłać tylko tym, którzy mają głosować.

## Technika

- HTML, CSS i JavaScript bez budowania. Zwykłe skrypty zamiast modułów ES, żeby strona działała z `file://`.
- Szyfrowanie: Web Crypto (SHA-256, AES-GCM z losowym IV dla każdej wiadomości).
- Jedyna biblioteka: generator kodów QR [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (Kazuhiko Arase, licencja MIT), dołączony lokalnie w `lib/`.
- Krój Bricolage Grotesque z Google Fonts (bez internetu zastępuje go krój systemowy).
- Typografia kart liczona w jednostkach kontenera (`cqw`), więc ta sama karta skaluje się w stosie, na telefonie i na ekranie dopasowania.
- Dźwięki syntezowane na żywo w Web Audio (bez plików), wyłączane w panelu osób. Konfetti na `<canvas>`.
- Pełna obsługa klawiaturą (← → tak/nie, Backspace cofnij, spacja szczegóły, W weto), ruch ograniczony dla osób, które go wyłączyły w systemie.

## Struktura

```
index.html      – ekrany: start, dołączanie, pokój; okna: zaproszenie, osoby, wyniki, dorzucanie, nowy pokój / nowa runda; nakładka dopasowania
css/style.css   – wygląd: ciemny motyw, kafle, karty-plakaty, szczegóły kart, pieczątki, arkusze, konfetti, wersja na telefon
js/mqtt.js      – minimalny klient MQTT 3.1.1 po WebSocket (z wykrywaniem martwego połączenia)
js/lacze.js     – łącze pokoju: szyfrowanie, dwa brokery + BroadcastChannel + pamięć, scalanie po wersji
js/dane.js      – 46 dań, 107 filmów, gatunki, generator pseudonimów z odmianą
js/karty.js     – wygląd kart (przód i szczegóły) i stos z gestami (przeciąganie, rzut, cofanie, weto)
js/app.js       – logika: tworzenie i dołączanie, kolejność kart, głosy, dopasowania, próg i weto, czas, wspólny los, dorzucanie, nowa runda, wirtualni znajomi
lib/qrcode.js   – generator kodów QR (MIT)
../galeria/projekt-14.jpg – obrazek podglądu linku (og:image)
```
