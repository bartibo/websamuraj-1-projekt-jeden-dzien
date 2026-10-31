# Nurt

Minimalistyczny generator dźwięków tła do pracy. Nie ma tu miksera z dziesięcioma suwakami: jest **jeden suwak**, który mówi, ile energii umysłowej potrzebujesz. Nurt sam dobiera i płynnie przenika proporcje brązowego i różowego szumu, deszczu za oknem, ambientu, muzyki lo-fi i gwaru kawiarni. Działa od razu po kliknięciu, bez konta, bez reklam i bez internetu.

## Jak powstał

Dzień 10 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** piątek, 30.10.2026, godz. 23:41
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 25 minut
- **Poprawki:** brak. Po prompcie nie było żadnej kolejnej wiadomości dotyczącej projektu (późniejsza prośba o wrzucenie na GitHub nie zmieniała kodu)
- **Prompt** (dosłownie, z oryginalną pisownią):

> Zbuduj minimalistyczny generator dźwięków tła do pracy, który zamiast tradycyjnego miksowania pojedynczych odgłosów oferuje użytkownikowi tylko jeden intuicyjny suwak regulujący pożądany poziom energii umysłowej i na tej podstawie automatycznie, płynnie dobiera oraz miksuje odpowiednie proporcje szumów, muzyki lo-fi czy gwaru kawiarni, działając natychmiast bez konieczności zakładania konta.
> Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Strona otworzy się w przeglądarce (Chrome, Edge, Firefox, Safari). Kliknij ▶ albo przesuń suwak i gotowe.
Nie trzeba niczego instalować ani budować. Bez internetu działa tak samo, tylko z czcionką systemową.
Otwarty z serwera (np. [projekty.vibemaster.pl](https://projekty.vibemaster.pl/10-nurt-generator-dzwiekow-tla-opus5_5/)) Nurt zapisuje się też do pracy offline i da się go zainstalować jak aplikację.

## Jeden suwak

| Strefa | Do czego | Co słychać |
|---|---|---|
| **Wyciszenie** | czytanie, nauka do późna | głęboki brązowy szum, deszcz, ambientowe plamy akordów, pojedyncze dźwięki pianina |
| **Głębokie skupienie** | pisanie, trudny kod | jaśniejszy szum, gęstszy deszcz, akordy lo-fi, miękki bas, bez bitu |
| **Przepływ** | praca w równym rytmie | lo-fi ok. 77 BPM, delikatny bit na rimie, krótkie frazy melodii, daleki gwar |
| **Rozpęd** | kreatywne zadania | pełny bit, żywszy akompaniament, kawiarnia się zapełnia |
| **Pełna moc** | maile, porządki, rutyna | do 90 BPM, jasne brzmienie, pełna sala, syczący ekspres, dzwoniące łyżeczki |

Strefy to tylko podpisy. Suwak jest ciągły i każde położenie pomiędzy brzmi trochę inaczej. Z energią zmieniają się:

- **proporcje dziesięciu warstw** (tabela w `js/mix.js`),
- **tempo** lo-fi: 64–90 uderzeń na minutę,
- **jasność**: filtr „taśmy” otwiera się od 1,5 do 5,6 kHz,
- **gęstość akompaniamentu**: od rozłożonych pojedynczych dźwięków, przez długie akordy, po synkopowane granie z basem prowadzącym,
- **tempo harmonii**: przy niskiej energii akord trwa dwa takty, wyżej jeden,
- **bit**: najpierw cichy rim, potem werbel, hi-haty w szesnastkach i otwarte blachy,
- **liczba gości w kawiarni**: od 3 do 10 rozmawiających osób, a przy wysokiej energii także ekspres i młynek.

Wszystkie zmiany płyną ze stałą czasową ok. 0,7 s, więc nawet szarpnięcie suwakiem brzmi jak płynne przejście. Na dole ekranu „Teraz słychać” pokazuje bieżące proporcje, a pod przyciskiem jest opis słowny (np. „Lo-fi, miękki bit i deszcz za oknem · 77 BPM”).

## Co jeszcze

- **Sesje** (opis niżej, w rundzie 2): swobodnie (bez limitu, 25, 50 albo 90 minut z wyciszeniem i dzwonkiem na końcu), skupienie z przerwami, rozruch i zasypianie.
- **Pamięć**: położenie suwaka, ręczny miks, zapisane miksy, głośność, plan sesji i ustawienia nagrywania zostają w przeglądarce (localStorage), więc po powrocie wszystko jest tak, jak było. Nic nie wychodzi poza komputer.
- **Tło**: wstęga płynących linii. Przy niskiej energii płynie wolno, szeroko i w chłodnych barwach, przy wysokiej przyspiesza, faluje drobniej i robi się ciepła. Oddycha razem z głośnością muzyki.
- Tytuł karty pokazuje strefę (`▶ Przepływ · Nurt`). Dźwięk gra też w karcie w tle, bo zegar planowania nut działa w Web Workerze.
- Szanuje ustawienie „ogranicz ruch” w systemie.

Klawisze: `spacja` graj/pauza, `←` `→` energia (z `Shift` szybciej), `1`–`5` skok do strefy, `↑` `↓` głośność, `T` plan sesji, `M` mikser, `N` nagraj MP3, `?` pomoc. Działają też klawisze multimedialne (graj/pauza, następny i poprzedni zmieniają strefę).

## Rozwój po eksperymencie

31.10.2026 autor poprosił o dwie rzeczy: żeby dało się sterować wieloma suwakami, a nie tylko jednym, i żeby można było zapisać utwór do MP3, np. 10-minutowy, z łagodnym wejściem i wyjściem. Wdrożone zmiany:

- **Mikser** (przycisk „Mikser” albo `M`). Wysuwany panel: z prawej na komputerze, od dołu na telefonie. Ma 18 suwaków w trzech grupach:
  - *Otoczenie*: brązowy szum, różowy szum, deszcz, wiatr, fale morza, kominek, ptaki, kawiarnia,
  - *Muzyka*: ambient, pianino, bas, melodia, bit, winyl (wcześniej pianino, bas i melodia były widoczne tylko razem jako „Lo-fi”),
  - *Charakter*: tempo (56–100 BPM), jasność (filtr „taśmy” 1,5–5,6 kHz), gęstość gry (od rozłożonych dźwięków po synkopy i szesnastki hi-hatów) i przestrzeń (ilość pogłosu).

  Suwak energii dalej ustawia wszystko naraz, a suwaki w mikserze jadą razem z nim. Przesunięty ręcznie suwak zostaje tam, gdzie go zostawiono (świeci przy nim kropka, `↺` oddaje go energii). Przycisk na górze pokazuje, ile warstw jest ustawionych ręcznie. „Wszystko z energii” czyści ręczne ustawienia, a „Losuj miks” losuje 1–3 dźwięki otoczenia, muzykę z losowej energii, jasność i przestrzeń. Paski „Teraz słychać” są teraz przyciskami: kliknięcie otwiera mikser na tej warstwie. Ręczny miks zapamiętuje się razem z resztą ustawień.
- **Cztery nowe warstwy**, też syntezowane na żywo. Energia ich nie włącza, dokłada się je w mikserze:
  - *wiatr*: dwa pasma różowego szumu po bokach, których filtr, dobroć i głośność wędrują po losowych celach, plus rzadki świst,
  - *fale morza*: dwie fale na zmianę. Szum narasta, w chwili załamania błyska jasnością i syczy, cofając się. Pod spodem ciemny szum morza w oddali,
  - *kominek*: bufor serii drobnych trzasków pękającego drewna, strzałów żywicy z krótkim dźwięcznym ogonem i syku gazu, nad pomrukiem płomieni, który faluje,
  - *ptaki*: na sesję losują się 3–4 „gatunki” (ćwierkanie, gwizd z vibrato, trel), każdy z własną wysokością i miejscem w panoramie, więc te same ptaki wracają ze swoim śpiewem.

  Ich poziomy zmierzono tak jak resztę (RMS w `OfflineAudioContext`) i wyrównano do deszczu, a ptaki ustawiono ok. 6 dB ciszej. Warstwa powstaje dopiero przy pierwszym podgłośnieniu, więc wyciszona nie zużywa procesora.
- **Pilnowanie głośności ręcznego miksu.** Silnik zna zmierzoną głośność każdej warstwy. Jeśli ręczny miks jest głośniejszy niż miks z samej energii, całość jest ściszana do tego samego poziomu, więc podkręcenie kilku suwaków do końca nie przesterowuje dźwięku.
- **Nagraj MP3** (przycisk „MP3” albo `N`). Do wyboru długość (3, 5, 10, 20 lub 30 minut) i wejście z wyjściem: krótkie (4 s / 6 s), łagodne (15 s / 25 s) albo bardzo długie (40 s / 60 s). Nagrywany jest dokładnie ten miks, który jest ustawiony, łącznie z ręcznymi suwakami. Jak to działa:
  - ten sam silnik gra w `OfflineAudioContext`, czyli tak szybko, jak pozwala procesor. Co sekundę nagrania renderowanie staje na chwilę (`suspend`), żeby dopisać kolejne takty, rozmowy i fale,
  - wejście i wyjście to krzywa S podniesiona do potęgi 1,6, więc dźwięk wyłania się miękko i długo wybrzmiewa,
  - gotowe nagranie jest wyrównywane do −17 dB RMS (liczonego bez wejścia i wyjścia), a szczyty do najwyżej −1 dBFS,
  - koder [lamejs](https://github.com/zhuker/lamejs) (LGPL, plik w `js/vendor/`) ładuje się dopiero przy pierwszym nagraniu i koduje do MP3 192 kb/s stereo z lekkim ditherem, w kawałkach, więc strona nie zamiera,
  - plik dostaje znacznik ID3 z tytułem (np. „Nurt · Przepływ · 10 min”) i nazwę `nurt-przeplyw-10-min.mp3`,
  - postęp widać w okienku i na przycisku „MP3”, nagrywanie można przerwać, a w tym czasie Nurt dalej gra na żywo.

  Pomiar w Chrome: 3 minuty z falami, ptakami, kominkiem i wiatrem nagrały się w 79 s. Plik ma 3:00, 4,1 MB, równe −17,8 dB RMS w środku i −16,6 LUFS całości. Synteza idzie ok. 3,3–4× szybciej niż czas rzeczywisty przy średniej i pełnej energii, a ok. 6× przy niskiej, więc 10 minut to zwykle 2,5–4 minuty czekania. Nagranie 30-minutowe potrzebuje ok. 650 MB pamięci, więc na telefonie lepiej wybrać krótsze.

## Rozwój po eksperymencie: runda 2

Tego samego dnia (31.10.2026) autor zapytał, co jeszcze ulepszyć, i poprosił o wdrożenie wszystkich pięciu propozycji po kolei.

**1. Łuk: energia zmienia się w czasie.** Przycisk z zegarem (`T`) otwiera okno sesji z czterema planami i podglądem przebiegu (linia: energia, kreski: muzyka, pole: głośność):
- *Swobodnie*: jak dawniej, bez limitu albo 25, 50 lub 90 minut z wyciszeniem i dzwonkiem.
- *Skupienie*: praca i przerwa na zmianę (25 + 5, 50 + 10 albo 90 + 15 minut), aż do pauzy. Na przerwę energia w 20 s schodzi do wyciszenia, po przerwie wraca. Każdą zmianę ogłasza dzwonek (inny na przerwę, inny na powrót) i komunikat.
- *Rozruch*: start od głębokiego spokoju i powolne rozkręcanie (10, 20 albo 30 minut) do energii z suwaka, potem gra dalej bez limitu.
- *Zasypianie* (20–60 minut): energia schodzi do zera w 60% czasu, muzyka znika między 15 a 70%, a w ostatnich 20% cichnie też tło. Bez dzwonka, a po wszystkim suwak wraca tam, skąd zasypianie ruszyło.

Plan prowadzi suwak tylko w przejściach, a czas biegnie tylko podczas grania. Ręczne przesunięcie zawsze wygrywa: kończy bieżące przejście, a w czasie pracy staje się nową energią pracy. Przy nagrywaniu MP3 utwór dostaje **przebieg**: stały, fala (energia faluje ±20 wokół ustawionej, pełne okresy co ok. 5 minut), rozruch albo do snu.

**2. Miksy, link i ziarno.**
- Na górze miksera jest osiem gotowych miksów (m.in. „Kominek w deszczu”, „Plaża o świcie”, „Burza za oknem”, „Nocny pociąg”) i własne: „Zapisz obecny” zapamiętuje energię i suwaki pod nazwą (do 12 miksów).
- „Udostępnij” kopiuje link z miksem w adresie (`#e=26&rain=55&fire=60…`). Na telefonie otwiera systemowe „Udostępnij”.
- Każde nagranie ma **ziarno** (np. `K7QF2M`). Cała losowość silnika (szumy, nuty, rozmowy, fale, ptaki) idzie przez jeden generator z ziarnem, więc to samo ziarno i te same ustawienia dają ten sam utwór. Zmierzone: dwa rendery z tym samym ziarnem różnią się o −89 dB (szum zaokrągleń oscylatorów Chrome), z innym ziarnem o +2,7 dB, czyli to zupełnie inny utwór. Ziarno jest w nazwie pliku i w tytule ID3, a „Link do utworu” po nagraniu otwiera okno MP3 z kompletem ustawień.

**3. Telefon i aplikacja.**
- Manifest, ikony (zwykłe i maskowalna) i service worker. Pliki są pobierane najpierw z sieci, a bez niej z pamięci, łącznie z koderem MP3, więc po pierwszej wizycie Nurt działa w samolocie. Przycisk „Zainstaluj Nurt” w pomocy pojawia się, gdy przeglądarka na to pozwala.
- Razem z dźwiękiem gra prawie niesłyszalny element `<audio>` (szum ±1 bit). Dzięki temu przeglądarka traktuje stronę jak odtwarzacz: Media Session pokazuje strefę, plan i okładkę, a przyciski na ekranie blokady i klawisze multimedialne działają (następny i poprzedni zmieniają strefę). Po powrocie do karty przerwany dźwięk wznawia się sam.
- Sprawdzone w Chrome z emulacją telefonu: service worker przejmuje stronę, po odcięciu sieci strona się ładuje i gra, koder MP3 jest dostępny offline. Na prawdziwym iPhonie i Androidzie tego nie testowałem: granie przy zablokowanym ekranie zależy od przeglądarki i systemu.

**4. Naturalniejsze dźwięki.** Każdą warstwę natury wyrenderowałem osobno i obejrzałem na spektrogramie:
- *ptaki*: zamiast powtarzanego czystego tonu każdy gatunek ma frazę z 2–4 sylab o różnych przebiegach wysokości (opadający, wznoszący, haczyk, dołek, zjazd), czasem z trylem albo drugim alikwotem. Fraza schodzi lub wspina się, a w 30% przypadków odpowiada drugi ptak z innej strony. Pogłos jest dwa razy krótszy,
- *fale*: załamanie narasta w ok. 0,3 s zamiast skokiem, a osobny jasny syk piany zostaje, gdy niski szum wody już opada (jak na prawdziwej plaży),
- *wiatr*: ciemniejszy (filtr 2,6 kHz) i z niskim pomrukiem rosnącym razem z podmuchami,
- *kominek*: pomruk płomieni o połowę cichszy, więcej strzałów żywicy, więc słychać przede wszystkim trzaski.

Głośności przeliczyłem tak, żeby kalibracja względem deszczu się nie zmieniła.

**5. Pętla bez szwu i nowe tła.**
- *Pętla bez szwu* (w „Wejście i wyjście”): nagranie jest o 8 s dłuższe, a ten nadmiar przenika się z początkiem (równa moc), więc koniec płynnie przechodzi w początek. Pasuje do przebiegu stałego i fali. Pętle szumów mają teraz „nieokrągłe” długości (4,79–13,91 s), żeby w zakładce nie zgrywały się same ze sobą (zmierzone: pierwsze 10 s pętli szumów trzyma się ±0,4 dB mediany).
- Każde MP3 ma teraz ramkę **Info z rozszerzeniem LAME** z opóźnieniem kodera (576 próbek, zmierzone korelacją) i dopełnieniem końca. Dzięki niej odtwarzacze znają długość co do próbki i nie wstawiają ciszy na styku pętli. Sprawdzone ffmpeg: 3 minuty dekodują się do dokładnie 7 938 000 próbek, a skok na styku pętli mieści się w zwykłym zakresie różnic między sąsiednimi próbkami.
- *Burza*: ulewa z porywami wiatru i grzmoty co 8–28 s (gęściej przy wyższym suwaku), opis grzmotu niżej, w rundzie 3.
- *Świerszcze*: 4–6 owadów, każdy na swoim tonie 2,8–5,2 kHz. Czysty ton jest cięty na impulsy (oscylator, kształtownik i wzmacniacz, bez tworzenia węzłów na każdy impuls). Krótkie ćwierknięcia po 3–5 impulsów albo długi tryl jak u świerszcza drzewnego.
- *Pociąg*: stukot na stykach szyn co 25 m, czyli dwa wózki wagonu (osie co 2,5 m, tylny wózek 17,5 m dalej): „ta-dam… ta-dam”. Do tego szum toczenia i powolne zmiany prędkości (65–110 km/h), od których zależy rytm. Stuknięcia wystają ok. 21 dB ponad tło w paśmie 0,4–1,5 kHz.
- Nowe tła skalibrowane względem deszczu (−28,3 dB): burza −29, świerszcze −32, pociąg −28 dB RMS.

## Rozwój po eksperymencie: runda 3 – deszcz i burza z nagrań

Autor napisał, że deszcz nie brzmi jak deszcz, a burza jak burza. Nie słyszę dźwięku, więc zamiast zgadywać, porównałem syntezę z prawdziwymi nagraniami z Wikimedia Commons (4 nagrania deszczu, 4 grzmotów i 2 burz, użyte tylko do analizy, nie ma ich w projekcie). Dla każdego nagrania liczyłem widmo w pasmach tercjowych, impulsywność (kurtozę), liczbę wyraźnych uderzeń na sekundę i wahania głośności, a potem przebudowałem syntezę, aż liczby się zgadzały.

**Deszcz.** Stary deszcz miał za dużo basu (63–125 Hz o 10–25 dB za głośno), dołek na środku pasma, za jasną górę i 33 wyraźne „plumknięcia” na sekundę. Każde z nich to był wznoszący się ton pęcherzyka (rezonans Minnaerta), czyli bardziej krople w wiadrze niż deszcz. Na spektrogramach prawdziwego deszczu nie ma tonów, jest ziarnista mgiełka tysięcy uderzeń w paśmie 300 Hz–2 kHz i co jakiś czas szerokie „plaśnięcie” bliskiej kropli. Nowy deszcz:
- tekstura: 2600 drobnych uderzeń na sekundę w każdym kanale, każde to krótki trzask szumu (zanik 0,4–3,9 ms) z własną barwą i siłą, większość ledwo słyszalna, nieliczne wyraźne. Grają dwie kopie bufora, druga wolniej i z zamienionymi kanałami, więc wzór się nie powtarza,
- bliskie plaśnięcia: ok. 9 na sekundę w nieregularnych odstępach, planowane na bieżąco, więc nic nie wraca w pętli,
- cichy szum spływającej wody i odrobina dołu.

Po zmianie wszystkie pasma od 63 Hz do 12,5 kHz, impulsywność i liczba wyraźnych uderzeń mieszczą się w zakresie prawdziwych nagrań.

**Grzmot.** Stary grzmot był gładkim, niskim szumem: powyżej 125 Hz o 15–25 dB za cichym, bez przetoczeń. Nowy liczy się z modelu fizycznego (`B.thunder` w `js/buffers.js`), osobno dla każdego uderzenia:
- kanał błyskawicy to kręta droga od ziemi do chmury (2,5–4,5 km), z odgałęzieniami i 3–9 km kanału poziomo w chmurze. Krętość ma dwie skale: kanał biegnie prosto przez 40–300 m, ostro skręca i po drodze drobno się wije,
- każdy z kilku tysięcy odcinków wysyła falę uderzeniową w kształcie litery N, która dociera do słuchacza z opóźnieniem zależnym od odległości (343 m/s). Odcinek ustawiony w poprzek kierunku słuchania grzmi najmocniej, więc proste kawałki kanału dają „klaśnięcia”, a grzmot przetacza się seriami,
- blisko fala jest krótka i ostra (trzask rozdzieranego powietrza), daleko dłuższa i miękka. Powietrze dodatkowo tłumi wysokie tony z odległością,
- 3–6 ech od terenu i chmur przedłuża przetaczanie, a końcówka wygasa.

Odległość uderzenia losuje się od 300 m do 11 km. Grzmot liczy się w 15–60 ms (w niższym próbkowaniu, bo prawie cała jego energia jest nisko), więc nie zacina muzyki. Pomiar: widmo grzmotu z 2,5 km pokrywa się z nagraniami grzmotów w paśmie 63 Hz–2 kHz z dokładnością do kilku dB, bliski zaczyna się trzaskiem i wygasa przez ok. 15 s, a daleki toczy się 12–14 s. Impulsywność w paśmie 300 Hz–2 kHz (4–9) jest w zakresie nagrań (3–7).

**Burza** ma teraz też własną ulewę (ta sama tekstura kropli, wolniej, więc cięższe krople) i porywy wiatru, w których deszcz zacina mocniej, więc brzmi jak burza także bez osobnego suwaka deszczu.

## Nic tu nie jest nagrane

Każdy dźwięk powstaje na żywo w Web Audio, więc projekt nie ma ani jednego pliku audio:

- **Szumy**: biały, różowy (filtr Paula Kelleta) i brązowy (całkowany biały) liczone do kilkusekundowych pętli o „nieokrągłych” długościach, których koniec przenika się z początkiem (szew jest niesłyszalny).
- **Deszcz**: ziarnista tekstura tysięcy drobnych uderzeń kropli, bliskie plaśnięcia planowane na bieżąco, cichy szum wody i odrobina dołu, dobrane do widma prawdziwych nagrań (runda 3). Dwa bardzo wolne oscylatory robią podmuchy.
- **Lo-fi**: komponowane takt po takcie. 7 jazzowych progresji (m.in. ii–V–I–vi, molowa subdominanta), akordy nonowe i tercdecymowe w ciasnym układzie, co jakiś czas zmiana tonacji. Instrumenty:
  - elektryczne pianino: synteza FM 1:1 z gasnącym indeksem, jasny atak przechodzi w okrągły dźwięk,
  - bas: trójkąt i sinus,
  - pad: rozstrojone piły za filtrem, który wolno oddycha,
  - melodia: frazy z pentatoniki z opóźnionym vibrato,
  - perkusja: stopa z opadającym sinusem, werbel i rim z filtrowanego szumu, hi-haty.
  Rytm ma swing i drobne „ludzkie” przesunięcia. Co 8 taktów wybierany jest nowy wzór stopy, czasem bit na dwa takty milknie, a przed nową frazą jest przejście.
- **Taśma i płyta**: całe lo-fi przechodzi przez modulowane opóźnienie (wow 0,42 Hz i flutter 6 Hz, czyli lekkie pływanie wysokości), nasycenie tanh i filtr. Obok kręci się winyl z szumem powierzchni i trzaskami.
- **Kawiarnia**: każdy gość to brzęczyk krtani (piła) przepuszczony przez trzy filtry formantowe. Filtry przeskakują między samogłoskami a, e, i, o, u, y w rytmie sylab. Do tego intonacja zdań i pytań oraz szumiące spółgłoski. Goście siedzą parami i mówią na zmianę. Słów nie da się zrozumieć, więc mowa nie wciąga uwagi, a sala brzmi jak sala. Do tego:
  - filiżanki (cztery nieharmoniczne alikwoty ceramiki),
  - mieszanie łyżeczką i odstawiane talerze,
  - dysza do mleka w ekspresie,
  - młynek.
  Goście „siadają”, gdy gwar rośnie, i wychodzą, gdy cichnie, więc przy niskiej energii kawiarnia nie zużywa procesora.
- **Natura i reszta otoczenia**: wiatr, fale, kominek, ptaki, burza, świerszcze i pociąg (opis w rundach rozwoju wyżej).
- **Pogłos**: splot z odpowiedzią impulsową wygenerowaną w kodzie (ciemniejący, wykładniczo gasnący szum z wczesnymi odbiciami).
- **Master**: lekkie ściszenie przy wysokiej energii (do −2 dB), łagodna kompresja i limiter.

## Kalibracja

Poziomy warstw (`LEVEL` w `js/engine.js`) zostały zmierzone, nie zgadnięte. Silnik działa z każdym kontekstem audio, więc renderowałem go w `OfflineAudioContext` w Chrome i mierzyłem RMS oraz szczyty:

- każdej warstwy osobno,
- miksu w 9 punktach suwaka,
- 60-sekundowego przejazdu suwaka 0 → 100 → 0.

Wynik: cały zakres suwaka mieści się w ok. −16 … −19 dB RMS, a szczyty nie przekraczają −1 dB, więc zmiana energii zmienia charakter, a nie głośność. Przy pełnej energii synteza zajmuje ok. 1/3 czasu jednego rdzenia procesora (mierzone offline, razem z narzutem pomiaru).

## Struktura

```
index.html        – układ strony, okna: sesja, nagrywanie MP3, „Jak to działa”
manifest.webmanifest, icons/ – instalacja jako aplikacja
sw.js             – praca bez internetu (najpierw sieć, potem pamięć)
css/style.css     – wygląd
js/util.js        – drobne narzędzia (losowanie z ziarnem, filtry, wzmacniacze)
js/buffers.js     – szumy, krople deszczu, trzaski winylu i kominka, odpowiedź impulsowa pogłosu
js/mix.js         – tabela energia → proporcje warstw, ręczne wartości z miksera, suwaki miksera, strefy, kolory
js/arc.js         – plany sesji i przebiegi nagrania (energia i muzyka w funkcji czasu)
js/presets.js     – gotowe miksy, link do miksu i do utworu
js/noise.js       – warstwy: brązowy szum, różowy szum, deszcz
js/lofi.js        – generatywne lo-fi: harmonia, instrumenty, sekwencer, taśma, winyl
js/cafe.js        – gwar kawiarni: rozmowy, naczynia, ekspres, młynek
js/nature.js      – wiatr, fale morza, kominek, ptaki
js/ambience.js    – burza, świerszcze, pociąg
js/engine.js      – tor sygnału, poziomy warstw, pilnowanie głośności, kompresja, dzwonek końca sesji
js/export.js      – nagrywanie utworu offline, przebieg, pętla bez szwu, wyrównanie głośności, MP3 z ID3 i ramką Info
js/vendor/        – lamejs (koder MP3, LGPL) i jego licencja
js/visual.js      – tło z płynącą wstęgą linii
js/app.js         – suwak, mikser, miksy, odtwarzanie, plany sesji, nagrywanie, ekran blokady, skróty, pamięć
```
