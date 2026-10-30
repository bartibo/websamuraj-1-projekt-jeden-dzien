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

- **Sesja z wyciszeniem**: bez limitu, 25, 50 albo 90 minut. Pod koniec dźwięk przez 12 s łagodnie cichnie i odzywa się miękki dzwonek.
- **Pamięć**: położenie suwaka, ręczny miks, głośność, długość sesji i ustawienia nagrywania zostają w przeglądarce (localStorage), więc po powrocie wszystko jest tak, jak było. Nic nie wychodzi poza komputer.
- **Tło**: wstęga płynących linii. Przy niskiej energii płynie wolno, szeroko i w chłodnych barwach, przy wysokiej przyspiesza, faluje drobniej i robi się ciepła. Oddycha razem z głośnością muzyki.
- Tytuł karty pokazuje strefę (`▶ Przepływ · Nurt`). Dźwięk gra też w karcie w tle, bo zegar planowania nut działa w Web Workerze.
- Szanuje ustawienie „ogranicz ruch” w systemie.

Klawisze: `spacja` graj/pauza, `←` `→` energia (z `Shift` szybciej), `1`–`5` skok do strefy, `↑` `↓` głośność, `T` sesja, `M` mikser, `N` nagraj MP3, `?` pomoc.

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

## Nic tu nie jest nagrane

Każdy dźwięk powstaje na żywo w Web Audio, więc projekt nie ma ani jednego pliku audio:

- **Szumy**: biały, różowy (filtr Paula Kelleta) i brązowy (całkowany biały) liczone do 10-sekundowych pętli, których koniec przenika się z początkiem (szew jest niesłyszalny).
- **Deszcz**: szelest z różowego szumu, pomruk z brązowego i ok. 1400 pojedynczych kropli. Każda kropla to trzask uderzenia i pęcherzyk powietrza, którego ton rośnie (rezonans Minnaerta). Do tego dwa bardzo wolne oscylatory robią podmuchy.
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
index.html        – układ strony i okno „Jak to działa”
css/style.css     – wygląd
js/util.js        – drobne narzędzia (losowanie, filtry, wzmacniacze)
js/buffers.js     – szumy, krople deszczu, trzaski winylu i kominka, odpowiedź impulsowa pogłosu
js/mix.js         – tabela energia → proporcje warstw, ręczne wartości z miksera, suwaki miksera, strefy, kolory
js/noise.js       – warstwy: brązowy szum, różowy szum, deszcz
js/lofi.js        – generatywne lo-fi: harmonia, instrumenty, sekwencer, taśma, winyl
js/cafe.js        – gwar kawiarni: rozmowy, naczynia, ekspres, młynek
js/nature.js      – wiatr, fale morza, kominek, ptaki
js/engine.js      – tor sygnału, poziomy warstw, pilnowanie głośności, kompresja, dzwonek końca sesji
js/export.js      – nagrywanie utworu offline, wejście i wyjście, wyrównanie głośności, MP3 z ID3
js/vendor/        – lamejs (koder MP3, LGPL) i jego licencja
js/visual.js      – tło z płynącą wstęgą linii
js/app.js         – suwak, mikser, odtwarzanie, sesje, nagrywanie, skróty, pamięć ustawień
```
