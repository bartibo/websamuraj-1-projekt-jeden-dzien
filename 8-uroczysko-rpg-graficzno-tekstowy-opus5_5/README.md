# Gdzie mgła ma zęby

Graficzno-tekstowy RPG grozy w przeglądarce. IX wiek, słowiańska puszcza tuż po Dziadach. Jesteś najemnikiem wynajętym przez osadę Mszaniec, bo nikt z miejscowych nie chce już wejść na uroczysko. Ktoś zwalił tam Czworolicego, ściął święty dąb i rozkopał kurhany. Od tamtej pory mgła się nie podnosi, a ludzie znikają. Ty masz broń, trochę światła i ranę po ugryzieniu wilka z bielmem na oku, która nie chce się zagoić. Im głębiej schodzisz w kurhany, tym trudniej odróżnić obłęd od prastarego, drapieżnego bóstwa, które się tam budzi.

## Jak powstał

Dzień 8 eksperymentu [1 prompt, 1 zdanie](../README.md): jeden prompt, zero poprawek.

- **Data:** środa, 28.10.2026, godz. 12:41
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`) w Claude Code
- **Czas pracy modelu:** ok. 65 minut
- **Poprawki:** brak. Po prompcie nie było żadnej kolejnej wiadomości dotyczącej projektu (późniejsza prośba o wrzucenie na GitHub nie zmieniała kodu)
- **Prompt** (dosłownie, z oryginalną pisownią):

> Stwórz graifczono-tekstowego RPG-a w którym gracz wciela się w najemnika badającego zbezczeszczone uroczysko w spowitej mgłą, IX-wiecznej puszczy słowiańskiej, gdzie granica między obłędem a prastarym, drapieżnym bóstwem zaciera się z każdym krokiem w głąb zapomnianych kurhanów.
> Ty podejmujesz wszystkie decyzje. Projekt ma być super i dać się odpalić w przeglądarce. O nic mnie nie pytaj tylko stwórz gotowy projekt. Umieść go w folderze dedykowanym i nazwij go zgodnie z konwencją nazewnictwa stosowaną we wcześniejszych projektach.

## Jak uruchomić

Kliknij dwa razy plik **`index.html`**. Gra otworzy się w przeglądarce (Chrome, Edge, Firefox).
Nie trzeba niczego instalować ani budować. Działa też bez internetu (wtedy z czcionką systemową).
Najlepiej grać ze słuchawkami: cały dźwięk powstaje na żywo w przeglądarce.

## Jak się gra

- **Postać.** Na początku wybierasz najemnika: Warega (silny, czyta runy, zna mowę Północy), Morawianina (silna wola, krzyżyk osłabia szepty) albo Łowcę (zręczny i czujny, rzadziej trafia na złe spotkania w drodze). Każdy ma inne cechy, zdrowie, broń i ekwipunek.
- **Próby.** Rzucasz dwiema kośćmi i dodajesz cechę: Siłę, Zręczność, Czujność albo Wolę. Przy każdej próbie widać trudność i szansę powodzenia.
- **Trzy wskaźniki.** *Zdrowie* spada w walce. *Rozum* zabierają szepty, ciemność i to, co widzisz. *Znamię* rośnie, im bliżej jesteś bóstwa: przy jego jedzeniu, przelewaniu krwi i schodzeniu w głąb. Pasek „granicy” pokazuje, jak obłęd i bóstwo zbliżają się do siebie. Gdy się zetkną, gra zaczyna się mylić.
- **Obłęd.** Przy niskim rozumie obraz faluje, w ciemności otwierają się oczy, słowa w tekście podmieniają się na inne, między zdaniami pojawiają się szepty, a wśród opcji wyboru wyskakują podszepty Pasterza. Niektórzy wrogowie mogą być złudzeniem (pomaga „Przejrzyj przez mgłę”), a niektóre złudzenia są kimś prawdziwym.
- **Znamię.** Daje siłę (cios „Głód”, który leczy, dodatkowe wybory, krwawa ofiara w kręgu kamieni), ale przybliża cię do Pasterza. Przy stu się nim stajesz.
- **Światło.** W kurhanach potrzebujesz pochodni. Każda starcza na sześć kroków w ciemności. Bez światła tracisz rozum i trudniej ci cokolwiek znaleźć.
- **Czas.** Masz trzy dni. Każda droga między miejscami trwa, a co noc ktoś w Mszańcu znika. Sen przy ognisku leczy, ale przybliża koniec.
- **Mapa** na korze brzozy odsłania się, gdy idziesz dalej. W drodze zdarzają się spotkania: wilki, błędne ogniki, głos matki, borowy, odyniec, kruki, twój własny cień.
- **Walka** jest turowa: cios, cios z osłoną, obrona, pochodnia (zwierzęta boją się ognia), sól (na upiory), róg pasterski, jedzenie i zioła, ucieczka.
- **Tobołek i wiedza.** Przedmioty można obejrzeć i użyć (chleb, miód, bylica, wywar z lulka). Zakładka „Wiedza” zbiera to, czego się dowiedziałeś: legendy, runy, pieśń i imię.

Sterowanie: klawisze 1–9 wybierają opcje, spacja przyspiesza tekst, M wycisza dźwięk, Esc otwiera menu. Gra zapisuje się sama przy każdym kroku. W ustawieniach można włączyć szybki tekst i łagodniejsze efekty (mniej falowania obrazu).

## Świat i rozgałęzienia

Osiem miejsc: osada Mszaniec, płot z czaszek na skraju uroczyska, zbezczeszczony gaj, Topielisko, Wilczy Jar, Kamienny Krąg, obóz kopaczy pod starym dębem i pole kurhanów. Pod polem leżą trzy małe kurhany (Wojownika, Matki i Dziecka) oraz Wielki Kurhan: wrota, korytarz z kości, komora żercy i gardziel, w którą schodzi się siedmioma krokami.

Prawie każdą przeszkodę da się pokonać na kilka sposobów:

- miecz Wojownika można zdobyć walką z upiorem albo pokłonem i ofiarą,
- do kurhanu Matki można wejść siłą, lisią norą albo piosenką, a w środku czekają trzy zagadki,
- grzechotkę Dziecka da się wziąć za darmo (ale wtedy coś za tobą idzie), wymienić albo wyśpiewać kołysanką,
- imię bóstwa poznasz ze ściany w korytarzu kości, ze snu na kamiennym ołtarzu albo od umierającego żercy,
- przy Wilczej Matce możesz walczyć, rzucić mięso albo pokazać jej ranę,
- syna starosty możesz wyciągnąć z bagna liną, gołymi rękami albo zostawić,
- zaginioną dziewczynkę możesz odnaleźć i odprowadzić do matki. Jeśli jednak twój rozum będzie wtedy zbyt słaby, możesz zobaczyć w niej coś zupełnie innego.

**Jedenaście zakończeń:** Pęta · Czwarte pęto · Niedomknięte · Bogobójca · Nowy Pasterz · Gorączka · Mgła w głowie · Pożarty · Biały wilk · Mgła w Mszańcu · Droga na wschód.
Odkryte zakończenia zapisują się w przeglądarce i widać je na ekranie tytułowym.

Gra porusza tematy śmierci, obłędu, przemocy i zaginięcia dziecka (bez drastycznych opisów). Osada Mszaniec, jej mieszkańcy i bóstwo Pasterza Mgły są zmyślone.

## Rozwój po eksperymencie

28.10.2026 grę oceniło czterech agentów z [`.claude/agents/`](../.claude/agents/): design (6,5/10), UX (7,5/10), wydajność (7/10) i rozwój produktu. Główny wniosek: proza i klimat są mocne, ale finał to siedem jednakowych kliknięć „Krok w dół”, wybory słabo wracają w zakończeniach, a dobre zakończenia dało się zablokować jednym ruchem. Do tego postacie były prostymi sylwetkami (topielec miał uśmiech jak emotka, wilk wyglądał jak kot), a ekran tytułowy był ciemny i cichy. Wdrożone poprawki:

- **Ekran powitalny:**
  - bramka „Załóż słuchawki”, a po kliknięciu wiatr, bordun i daleki wilczy skowyt,
  - wilczyca z bielmem stoi w kadrze i śledzi kursor okiem, mgła i las przesuwają się lekko za myszą,
  - najechanie na słowo „obłędem” pokazuje falowanie i oczy w ciemności, a na „bogiem” czerwień i niższy bordun,
  - zamiast listy zakończeń rząd jedenastu kopców; nieodkryte mają zagadkową podpowiedź („Lulek otwiera oczy. Czasem je zamyka”),
  - po „Wyrusz do Mszańca” najpierw ugryzienie: czerwony błysk i uderzenie serca, a dopiero potem prolog.
- **Historia:**
  - **Pasterz cię zna.** W gardzieli na każdym kroku wypomina czyn z tej wędrówki („Chłopak w bagnie szeptał do końca. Twoje imię”, „Srebro w twojej sakiewce jest ciepłe. To moje ciepło”). Można mu odpowiedzieć próbą Woli: sukces osłabia go na finał, porażka dodaje znamienia.
  - **Głos, który mówi twoim głosem.** Przy słabym rozumie w sercu kurhanu są dwie identyczne opcje „Żyr – powiedz jego imię”, a jedną z nich wypowiada Pasterz. Kto usłyszał ostrzeżenie Hrodgara, słyszy też echo.
  - **Dobrawa.** Bielmo zielarki i wilczycy to nie przypadek. Kto pokaże jej kieł, usłyszy, dlaczego ugryzienie wybrało właśnie jego, i może poprosić, żeby zeszła z nim na dół (nowy wariant zakończenia „Pęta”). Kto zabije Wilczą Matkę, zastanie Dobrawę martwą, z pustym rzemieniem na szyi.
  - **Granica, która kłamie.** Przy rozumie poniżej 35 Pasterz dopisuje do Wiedzy kłamstwa, które wyglądają jak prawda („Pęta wystarczą dwa”, „Imię brzmi Weles”). Gdy obłęd zrówna się ze znamieniem, zamiast szans widać „?%”. Na rozdrożach pojawia się droga „Dom”, do chaty matki, która nie żyje od dwudziestu zim. W zakładce Wiedza można kłamstwa przejrzeć (bylica albo próba Woli), a zakończenie mówi, w ile z nich uwierzyłeś.
  - **Noce mają twarze.** O świcie mgła zabiera pierwszą osobę, którą uratowałeś, jeśli nikt jej nie strzegł: Wiszkę z posłania albo Sulisława, który odchodzi boso w stronę lasu. Wiszce można oddać na noc kaptorgę od Miry, Sulisława chroni podniesiony Czworolicy, a całą osadę czuwanie do świtu pod chatą Miry. Zabrani stoją potem w niszach gardzieli, a zawiązane pęta oddają ich o świcie.
  - **Pamięć mgły.** Gra prowadzi kronikę wędrówek. Następna zaczyna się „rok później”: posłaniec w prologu wspomina poprzedniego najemnika zależnie od tego, jak skończył (biały wilk z blizną, szaleniec liczący pale, zwrotka w piosence), a Pasterz w gardzieli pamięta jego smak. Na ekranie tytułowym rośnie piosenka o trzech.
  - **Osobne sceny dla postaci.** Wareg może odmówić nad Bjornem słowa Północy: duch zdradza mu ostrzeżenie, a rozmowa z Hrodgarem idzie łatwiej. Morawianin staje w gaju przed Czworolicym i wybiera, czy zawiesić na nim swój krzyżyk. Łowca czyta ślady w Wilczym Jarze i odkrywa, dokąd prowadzą tropy wilczycy (a ślady na skraju odczytuje bez próby). Pasterz i pieśń na koniec pamiętają te sceny.
  - **Czas ma cenę.** Kto dotrze na bagno dopiero drugiego dnia, nie zastanie Sulisława żywego. Starosta mówi o tym wprost.
  - **Zakończenia pamiętają wybory.** Losy Wiszki, Sulisława, srebra umarłych, Czworolicego i obietnicy danej Mirze wracają w większości zakończeń.
  - poprawki ciągłości (kiedy ugryzł wilk, „po Dziadach”, kowal w gardzieli dopiero od 2. dnia, Hrodgar ominięty po cichu dalej stoi przy wrotach) i języka; mniej powtórzonych motywów, jedno zdanie o Welesie.
- **Ekran zakończenia:**
  - **„Zwrotka, której jeszcze nikt nie śpiewał”**, czyli piosenka o trzech dopisana z twoich decyzji („…i Ulf z Północy, co przyszedł tu po srebro, / co dziecko z dziupli wyniósł i oddał je matce…”),
  - lista „Co po tobie zostało” z losami postaci (nieodkryte jako „???”), a przy złym końcu „Co cię zgubiło” z ostatnimi stratami,
  - przyciski „Wróć przed Wielki Kurhan” (punkt kontrolny), „Zapisz kartę” (obraz 1200×630) i „Kopiuj pieśń”.
- **Interakcja i błędy:**
  - po położeniu pęt bez znajomości imienia można wrócić z imieniem; wcześniej trzy dobre zakończenia znikały do końca gry,
  - sen ostatniej nocy wymaga potwierdzenia, a sen w obozie trzeciego dnia jest ukryty,
  - fałszywe opcje obłędu pojawiają się tylko na końcu listy i raz na miejsce, więc odruchowa „1” już nie zabija,
  - nieudane próby kosztują za każdym razem, rozmowy w tej samej komorze nie zjadają pochodni, drugie zejście gardzielą kosztuje połowę,
  - Głód przeciw Pasterzowi jest droższy i słabiej leczy, a bez pęt bóg ma mocniejszą obronę (wcześniej Głód wygrywał finał w 99%); wilczyca, upiór i Hrodgar biją mocniej,
  - krótkie wyjaśnienie przy pierwszej zmianie rozumu, znamienia, przy pierwszej ciemności i przy pierwszych opcjach „głód”,
  - na telefonie nowe miejsce zaczyna się od obrazu i początku tekstu, pasek górny jest przypięty, a wskaźniki na scenie mają liczby.
- **Interfejs:** w pasku górnym trzy znaczniki dni i pora dnia, wybory mieszczą się bez przewijania na typowych ekranach, czytelna mapa ze znacznikiem „tu jesteś”, poprawione podmiany słów w obłędzie, obsługa klawiatury i kontrast. Karty postaci mają portrety, a na telefonie są zwinięte.
- **Grafika:**
  - nowe sylwetki ludzi (tunika, zwężone kończyny, dłonie), płaszcze z fałdami i stopami, kaptur Dobrawy, twarze o ton jaśniejsze od sylwetki, portrety trzech postaci o wspólnej anatomii (łowca w kapturze, z łukiem i kołczanem), upiór z żebrami, wilk z długim pyskiem i grzywą, topielec z rozwartą paszczą zamiast uśmiechu,
  - obwiednia światła i poświata za postaciami, więc nie giną w ciemności,
  - trzy różne chaty: starosta przy wygasłym palenisku, Dobrawa z kotłem, Mira z krosnem i czerwoną wstążką,
  - kilka postaci w jednej scenie: Mira z Wiszką, Sulisław pod kożuchem u starosty, cień wilczycy na ścianie przy wyznaniu Dobrawy, żerca i Dobrawa obok Pasterza w sercu kurhanu, matka z córką w zakończeniu,
  - gardziel z fałdami, połyskiem i zębami w równych rzędach; każde spotkanie w drodze ma własny las; ciemniejsza paleta dnia; miękki dym zamiast białych kół.
- **Wydajność:** ekran tytułowy i sceny obłędu zużywają 2–3 razy mniej CPU i GPU (animacje CSS bez przemalowywania tekstu, mgły generowane raz na kolor, płótno rysowane tylko, gdy jest widoczne), dźwięk usypia po wyciszeniu i w karcie w tle, a błąd w rysowaniu nie gasi już grafiki do przeładowania strony.

## Technika

- Czysty HTML, CSS i JavaScript, bez bibliotek i bez budowania.
- Grafika to sceny malowane w kodzie na canvasie: każde miejsce ma statyczne tło generowane z ziarna (las, częstokół, kurhany, krąg kamieni, wnętrza grobów, gardziel) i warstwę żywą, czyli przesuwającą się mgłę, ogień, dym, parę z kurhanu, ogniki nad bagnem i postacie. Paleta zmienia się z porą dnia (świt, dzień, zmierzch, noc ze słońcem albo księżycem).
- Efekty obłędu i znamienia działają na całym obrazie: falowanie, oczy w ciemności, czerwień pulsująca w rytm serca, światło pochodni w grobach. Po bokach sceny jest rozmyta poświata z jej kolorów.
- Cały dźwięk jest syntezowany przez Web Audio: wiatr, bordun, który obniża się wraz ze znamieniem, trzask ognia, krople w kurhanach, kruki, sowa, szepty, bicie serca, bęben w walce, róg i gęśle w osadzie.
- Fabuła to ponad 180 węzłów z warunkami, próbami, walkami i efektami. Silnik pilnuje czasu, światła, ekwipunku, wiedzy i losowych spotkań w drodze.

## Struktura

```
index.html      – ekran tytułowy, tworzenie postaci, gra, kości, menu, zakończenie
css/style.css   – wygląd
js/data.js      – postacie, miejsca, przedmioty i ikony, przeciwnicy, wiedza, zakończenia, szepty, wizje
js/story.js     – fabuła: wszystkie węzły, zdarzenia w drodze, teksty zakończeń
js/scene.js     – malarz scen i postaci na canvasie, mgła i efekty obłędu
js/audio.js     – syntezowany dźwięk
js/game.js      – silnik: stan, próby, walka, podróże, światło, czas, zapis, interfejs, mapa
```
