# Gdzie mgła ma zęby

Graficzno-tekstowy RPG grozy w przeglądarce. IX wiek, słowiańska puszcza przed Dziadami. Jesteś najemnikiem wynajętym przez osadę Mszaniec, bo nikt z miejscowych nie chce już wejść na uroczysko. Ktoś zwalił tam Czworolicego, ściął święty dąb i rozkopał kurhany. Od tamtej pory mgła się nie podnosi, a ludzie znikają. Ty masz broń, trochę światła i ranę po ugryzieniu wilka z bielmem na oku, która nie chce się zagoić. Im głębiej schodzisz w kurhany, tym trudniej odróżnić obłęd od prastarego, drapieżnego bóstwa, które się tam budzi.

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

## Technika

- Czysty HTML, CSS i JavaScript, bez bibliotek i bez budowania.
- Grafika to sceny malowane w kodzie na canvasie: każde miejsce ma statyczne tło generowane z ziarna (las, częstokół, kurhany, krąg kamieni, wnętrza grobów, gardziel) i warstwę żywą, czyli przesuwającą się mgłę, ogień, dym, parę z kurhanu, ogniki nad bagnem i postacie. Paleta zmienia się z porą dnia (świt, dzień, zmierzch, noc ze słońcem albo księżycem).
- Efekty obłędu i znamienia działają na całym obrazie: falowanie, oczy w ciemności, czerwień pulsująca w rytm serca, światło pochodni w grobach. Po bokach sceny jest rozmyta poświata z jej kolorów.
- Cały dźwięk jest syntezowany przez Web Audio: wiatr, bordun, który obniża się wraz ze znamieniem, trzask ognia, krople w kurhanach, kruki, sowa, szepty, bicie serca, bęben w walce, róg i gęśle w osadzie.
- Fabuła to ponad 160 węzłów z warunkami, próbami, walkami i efektami. Silnik pilnuje czasu, światła, ekwipunku, wiedzy i losowych spotkań w drodze.

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
