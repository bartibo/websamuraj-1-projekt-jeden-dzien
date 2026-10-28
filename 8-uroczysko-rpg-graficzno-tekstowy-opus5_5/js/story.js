'use strict';
/* =====================================================================
   Gdzie mgła ma zęby – fabuła
   Węzeł: loc, sc (scena), fig (postać), dark (wymaga światła), wk (wielki kurhan),
          hub (dokleja drogi), text, first (raz), on (za każdym razem), ch (wybory), end
   Wybór: t, go, if, do, test {s, dc, ok, no, okDo, noDo}, fight {e, win, flee, dispel}, cost, end
   Pomocnicze funkcje (F, setF, has, give, take, hp, rozum, znamie, srebro, learn,
   know, tick, st, bg, night…) definiuje game.js.
   ===================================================================== */

const P = (...a) => a.filter(Boolean).join('\n\n');
const PHASE_TXT = (a) => a[phaseIdx()];

const NODES = {

/* ============================== PROLOG ============================== */

prolog1: {
  sc: 'puszcza', fig: 'wilk', title: 'Puszcza, trzecia noc drogi',
  text: () => P(
    `Trzecią noc idziesz przez puszczę i trzecią noc idzie z tobą mgła.`,
    { wareg: `Szedłeś szlakiem od Ładogi na południe, z mieczem, który niejednemu kupcowi uratował towar, a niejednemu go odebrał. Posłaniec z Mszańca znalazł cię w karczmie przy brodzie i położył na stole garść srebra.`,
      moraw: `Odkąd książę, któremu służyłeś, przyjął chrzest i kazał ci zawiesić na szyi drewniany krzyżyk, nigdzie nie zagrzałeś miejsca. Posłaniec z Mszańca nie pytał, w co wierzysz. Pytał tylko, czy się boisz.`,
      lowca: `Puszcza jest twoim domem od dziecka, ale tej części nie znasz. Nikt jej nie zna. Od pokoleń ludzie ją obchodzą. Posłaniec z Mszańca szukał kogoś, kto umie chodzić po lesie. Znalazł ciebie.` }[S.bg],
    `Wczoraj o zmierzchu wyszedł z mgły wilk. Duży, siwy, z bielmem na lewym oku. Nie warczał. Podszedł, chwycił cię zębami za przedramię – nie mocno, nie tak, jak chwyta się zdobycz, tylko tak, jak chwyta się coś, co się chce zapamiętać – i odszedł między drzewa, zanim zdążyłeś dobyć broni.`,
    `Rana nie krwawi. Pulsuje ciepło, jakby ktoś trzymał na niej dłoń.`,
    `Przed tobą, w szarym świetle przedświtu, majaczy częstokół. Mszaniec. Osada, do której wezwano cię za srebro, bo – jak mówił posłaniec – „nikt z naszych już tam nie pójdzie”.`),
  first: () => learn('rana', true),
  ch: [{ t: 'Podejdź do bramy', go: 'prolog2' }],
},

prolog2: {
  loc: 'mszaniec', sc: 'osada', fig: 'straznik', title: 'Brama Mszańca',
  text: () => P(
    `Brama otwiera się, zanim zdążysz zastukać. Chłopak z włócznią – za młody na tę włócznię i za blady na swój wiek – patrzy ci najpierw w twarz, potem na ręce, potem w mgłę za twoimi plecami.`,
    `– Najemnik? – pyta. – Ten od srebra?`,
    `Kiwasz głową. – ${S.name} – mówisz. Chłopak cofa się, robiąc ci miejsce, ale nie odwraca się do puszczy plecami. W Mszańcu, jak się okaże, nikt się już do niej nie odwraca plecami.`,
    `– Starosta Bogumił czeka. – Przełyka ślinę. – Od trzech dni czeka na kogokolwiek.`),
  ch: [{ t: 'Wejdź do osady', go: 'msz' }],
},

/* ============================== MSZANIEC ============================== */

msz: {
  loc: 'mszaniec', sc: 'osada', hub: true,
  text: () => P(
    PHASE_TXT([
      `Mszaniec budzi się powoli i bez ochoty. Dym z dachów kładzie się nisko, jakby bał się iść w górę, tam, gdzie wisi mgła. Kilkanaście chat, chram z rzeźbionym szczytem, studnia, częstokół. Za częstokołem, z trzech stron, puszcza.`,
      `W południe Mszaniec wygląda prawie zwyczajnie: ktoś rąbie drwa, ktoś niesie wodę, ktoś łata dach. Tylko nikt nie śpiewa i nikt nie patrzy w stronę puszczy.`,
      `O zmierzchu ludzie zamykają się w chatach. Na progach sypią sól i popiół, a na drzwiach rysują węglem znaki, których sens zna już tylko Dobrawa.`,
      `Nocą Mszaniec to tylko kilka żarzących się szpar w okiennicach. Mgła wchodzi między chaty i nie wychodzi. Przy chramie płonie ognisko, a przy nim siedzi chłopak z bramy i nie śpi.`]),
    S.day === 2 && `Rano, przy studni, ludzie mówią szeptem, że w nocy zniknął kowal Ostoja. Drzwi kuźni stały otworem, a na progu, w popiele, który sam sypał, zostały ślady bosych stóp. Za dużych. I z za wieloma palcami.`,
    S.day === 3 && `Tej nocy zniknęło dwoje: stara Wierzchosława i jej wnuk. Ludzie stoją w grupkach i milkną, kiedy przechodzisz. Ktoś spluwa przez ramię. Rana na przedramieniu mówi ci, że została jedna noc. Nie wiesz, skąd to wiesz.`,
    S.znamie >= 45 && `Psy we wsi szczekają, kiedy przechodzisz. Potem nagle milkną, kładą uszy po sobie i odwracają łby.`,
    F('wiszka_w_domu') && `Spod chaty Miry dobiega cienki głos, nucący piosenkę o trzech.`,
    !F('zlecenie') && `Chłopak z bramy pokazuje ci włócznią największą chatę. – Starosta – mówi tylko.`),
  ch: [
    { t: () => F('zlecenie') ? 'Chata starosty Bogumiła' : 'Idź do starosty Bogumiła', go: () => F('zlecenie') ? 'starosta' : 'starosta1' },
    { t: 'Chata zielarki Dobrawy, na samym skraju osady', go: () => S.seen.dobrawa1 ? 'dobrawa' : 'dobrawa1' },
    { t: 'Mira, matka zaginionej dziewczynki', if: () => F('o_wiszce'), go: () => S.seen.mira1 ? 'mira' : 'mira1' },
    { t: 'Odprowadź Wiszkę do matki', if: () => F('wiszka_z_toba'), go: 'mira_powrot' },
    { t: () => S.day >= 3 ? 'Ognisko przy chramie – prześpij się do świtu (to ostatnia noc)' : 'Ognisko przy chramie – prześpij się do świtu', go: 'msz_sen' },
    { t: 'Odejdź z Mszańca na dobre', if: () => F('zlecenie'), go: 'odejscie' },
  ],
},

msz_sen: {
  loc: 'mszaniec', sc: 'ognisko',
  on: () => {
    const nightmare = S.znamie >= 25;
    S.tmpDream = nightmare;
    restUntilDawn(true);
    if (nightmare) { rozum(-6); znamie(3); }
  },
  text: () => S.tmpDream ? P(
    `Kładziesz się przy ognisku, owinięty płaszczem. Zasypiasz szybko. Za szybko.`,
    `Śni ci się, że jesteś mgłą. Że wchodzisz przez szpary w okiennicach, sączysz się po klepiskach, nachylasz nad śpiącymi i wąchasz ich oddechy. Ciepłe. Słodkie. Jedno dziecko otwiera oczy i patrzy prosto na ciebie, i nie krzyczy, tylko się uśmiecha, jakby cię poznało.`,
    `Budzisz się o świcie z ustami pełnymi śliny. Chłopak z bramy siedzi po drugiej stronie ogniska i patrzy na ciebie, ściskając włócznię.`,
    `– Mówiłeś przez sen – mówi. – Nie po naszemu.`
  ) : P(
    `Kładziesz się przy ognisku, owinięty płaszczem. Chłopak z bramy dorzuca drew i milczy, ty też milczysz. Mgła stoi za kręgiem światła jak stado, które czeka, aż pasterz zaśnie.`,
    `Śpisz bez snów. W tym miejscu to najlepsze, co mogło cię spotkać.`,
    `Budzi cię zimny, szary świt.`),
  ch: [{ t: 'Wstań', go: 'msz' }],
},

odejscie: {
  loc: 'mszaniec', sc: 'osada',
  text: () => P(
    `Stoisz przy bramie, z tobołkiem na plecach. Za tobą Mszaniec, przed tobą droga na wschód, wąska i błotnista, ale prowadząca daleko od puszczy.`,
    `Nikt cię nie zatrzyma. Najemnik bierze srebro za robotę i nikt nie może mu kazać umrzeć za cudzą wieś.`,
    F('srebro_umarlych') && `Sakiewka jest ciężka od srebra umarłych. Chyba trochę cieplejsza, niż powinna być.`),
  ch: [
    { t: 'Odejdź. Niech sami radzą sobie z mgłą.', end: 'zak_droga' },
    { t: 'Nie. Jeszcze nie.', go: 'msz' },
  ],
},

/* ----------------------------- starosta ----------------------------- */

starosta1: {
  loc: 'mszaniec', sc: 'chata', fig: 'starzec', title: 'Chata starosty',
  text: () => S.seen.starosta1 ? P(
    `Bogumił czeka na twoją odpowiedź. Trzydzieści dirhamów. Dziesięć teraz, dwadzieścia, kiedy mgła się podniesie.`
  ) : P(
    `Chata starosty jest największa w osadzie i najbardziej pusta. Bogumił siedzi przy wygasłym palenisku, w kożuchu, choć nie jest zimno. Kiedyś musiał być silnym mężczyzną. Teraz wygląda, jakby coś wyjadło go od środka i zostawiło tylko skórę na kościach i siwą brodę.`,
    `– Przyszedłeś – mówi. – Dobrze. Siadaj.`,
    `Opowiada krótko, jak ktoś, kto powtarzał to sobie wiele razy. Sześć nocy temu, w wigilię Dziadów, kiedy granica między światami jest najcieńsza, ktoś wszedł na uroczysko. Zwalił Czworolicego, co stał w gaju od czasów pradziadów. Ściął święty dąb. Rozkopał kurhany.`,
    `– Następnego ranka przyszła mgła. Od tamtej pory się nie podnosi. Potem zaczęli znikać ludzie. Najpierw pastuch Dziwisz, ze stadem. Potem mała Wiszka, córka wdowy Miry. Żerca Radogost poszedł na uroczysko, żeby, jak mówił, „zawiązać, co rozwiązano”. Nie wrócił.`,
    `Patrzy na ciebie wyblakłymi oczami.`,
    `– Trzydzieści srebrnych dirhamów. Arabskie, dobre, niepiłowane. Dziesięć teraz, dwadzieścia, jak wrócisz i powiesz mi, że mgła się podniesie.`),
  first: () => { learn('uroczysko'); setF('o_wiszce'); },
  ch: [
    { t: 'Przyjmij zlecenie', go: 'starosta_zgoda', do: () => { setF('zlecenie'); srebro(10); } },
    { t: 'Targuj się: za takie ryzyko trzydzieści dirhamów to mało', if: () => !F('targ'), do: () => setF('targ'),
      test: { s: 'wol', dc: 9, ok: 'starosta_targ_ok', no: 'starosta_targ_no' } },
    { t: 'Kto to zrobił? Kto rozkopał kurhany?', if: () => !S.seen.starosta_kto, go: 'starosta_kto' },
  ],
},

starosta_targ_ok: {
  loc: 'mszaniec', sc: 'chata', fig: 'starzec',
  text: `Bogumił patrzy na ciebie długo. Potem wstaje, z trudem, idzie do skrzyni w kącie i wraca z garścią monet.\n\n– Piętnaście teraz – mówi. – I dwadzieścia potem. Więcej nie mam. Przysięgam na Czworolicego. Na tego, który leży w błocie.`,
  ch: [{ t: 'Przyjmij zlecenie', go: 'starosta_zgoda', do: () => { setF('zlecenie'); srebro(15); } }],
},

starosta_targ_no: {
  loc: 'mszaniec', sc: 'chata', fig: 'starzec',
  text: `– Trzydzieści – powtarza Bogumił bezbarwnym głosem. – Nie mam więcej. A ty nie masz dokąd iść, najemniku. Widziałem, jak patrzyłeś na swoją rękę.`,
  ch: [
    { t: 'Przyjmij zlecenie', go: 'starosta_zgoda', do: () => { setF('zlecenie'); srebro(10); } },
    { t: 'Kto to zrobił? Kto rozkopał kurhany?', if: () => !S.seen.starosta_kto, go: 'starosta_kto' },
  ],
},

starosta_kto: {
  loc: 'mszaniec', sc: 'chata', fig: 'starzec',
  text: `– Obcy – mówi Bogumił. Za szybko. – Wędrowni. Kto by inny. Swój by tam nie poszedł, swój wie, co tam śpi.\n\nPatrzy w wygasłe palenisko. Ręce mu drżą.`,
  ch: [
    { t: 'Naciśnij go. Widzisz, że kłamie.', test: { s: 'czu', dc: 8, ok: 'starosta_przyznanie', no: 'starosta_milczy' } },
    { t: 'Odpuść', go: () => F('zlecenie') ? 'starosta' : 'starosta1' },
  ],
},

starosta_milczy: {
  loc: 'mszaniec', sc: 'chata', fig: 'starzec',
  text: `Bogumił zaciska usta i nic więcej nie mówi. Może kłamie. Może tylko się boi. W tej chacie trudno odróżnić jedno od drugiego.`,
  ch: [{ t: 'Dalej', go: () => F('zlecenie') ? 'starosta' : 'starosta1' }],
},

starosta_przyznanie: {
  loc: 'mszaniec', sc: 'chata', fig: 'starzec',
  text: P(
    `Bogumił długo milczy. Potem mówi do paleniska, nie do ciebie.`,
    `– Mój syn. Sulisław. Głupi chłopak, ale mój. Przyszli tu Waregowie, pięciu, z łopatami i workami na srebro. Ich wódz, Hrodgar, mówił, że w kurhanach leży srebro umarłych, a umarłym srebro na nic. Sulisław poszedł z nimi, bo znał drogę. Wszyscy w Mszańcu znają drogę. Tylko nikt nią nie chodzi.`,
    `– Nie wrócił. Żaden z nich nie wrócił.`,
    `Podnosi wzrok. W oczach ma coś gorszego niż strach: wstyd.`,
    `– Jeśli go znajdziesz… żywego czy nie… powiedz mi. Dołożę dziesięć dirhamów.`),
  first: () => { learn('kopacze'); setF('o_sulislawie'); },
  ch: [{ t: 'Dalej', go: () => F('zlecenie') ? 'starosta' : 'starosta1' }],
},

starosta_zgoda: {
  loc: 'mszaniec', sc: 'chata', fig: 'starzec',
  text: P(
    `Bogumił kiwa głową, jakby nie spodziewał się niczego innego. Albo jakby było mu już wszystko jedno.`,
    `– Idź do Dobrawy, zanim wyjdziesz za płot – mówi. – Zielarka. Mieszka na skraju. Wie więcej niż ja, tylko mówi mniej. I weź ode mnie światło. Tam, dokąd idziesz, będzie ciemno.`),
  ch: [{ t: 'Dalej', go: 'starosta' }],
},

starosta: {
  loc: 'mszaniec', sc: 'chata', fig: 'starzec', title: 'Chata starosty',
  text: () => P(
    `Bogumił siedzi tam, gdzie go zostawiłeś. Chyba w ogóle się nie rusza.`,
    F('sulislaw_uratowany') && !F('sulislaw_zgloszony') && `Zza zasłony w kącie słychać czyjś płytki, nierówny oddech.`,
    F('sulislaw_zgloszony') && F('sulislaw_uratowany') && `Sulisław leży w kącie, pod kożuchem, i patrzy w sufit. Od czasu do czasu coś mamrocze. Bogumił nie spuszcza z niego oczu.`),
  ch: [
    { t: 'Poproś o pochodnie i chleb na drogę', if: () => !F('dary_starosty'), go: 'starosta',
      do: () => { setF('dary_starosty'); give('pochodnia', 3); give('chleb', 1); } },
    { t: 'Co wiesz o uroczysku?', go: 'starosta_uroczysko' },
    { t: 'Kto rozkopał kurhany?', if: () => !F('o_sulislawie') && !S.seen.starosta_kto, go: 'starosta_kto' },
    { t: 'Pokaż mu kij runiczny Hrodgara', if: () => has('kij') && !S.seen.starosta_runy, go: 'starosta_runy' },
    { t: 'Powiedz mu, że Sulisław żyje', if: () => F('sulislaw_uratowany') && !F('sulislaw_zgloszony'), go: 'starosta_syn' },
    { t: 'Powiedz mu, że Sulisław nie żyje', if: () => F('sulislaw_martwy') && !F('sulislaw_zgloszony'), go: 'starosta_syn_martwy' },
    { t: 'Wyjdź', go: 'msz' },
  ],
},

starosta_uroczysko: {
  loc: 'mszaniec', sc: 'chata', fig: 'starzec',
  text: P(
    `– Za płotem z czaszek zaczyna się uroczysko – mówi Bogumił. – Prosto, na północ, jest gaj, gdzie stał Czworolicy. Za gajem, na wzgórzu, krąg kamieni, gdzie dziady palili ognie. Jeszcze dalej na północ pole kurhanów: trzy małe i jeden wielki.`,
    `– Na zachód Wilczy Jar. Tam nie chodź, chyba że musisz. Na wschód Topielisko, a za nim polana pod starym dębem, gdzie ci obcy rozbili obóz. – Wzrusza ramionami. – Tyle wiem ja. Więcej wie Dobrawa. Dobrawa zawsze wie więcej, niż mówi.`),
  ch: [{ t: 'Dalej', go: 'starosta' }],
},

starosta_runy: {
  loc: 'mszaniec', sc: 'chata', fig: 'starzec',
  text: () => P(
    `Bogumił bierze kij do rąk ostrożnie, jakby był gorący. Nie umie czytać run. Nikt w Mszańcu nie umie. Ale gładzi palcem znaki, jeden po drugim.`,
    know('runy') ? `Powtarzasz mu, co tam stoi. Gdy dochodzisz do „chłopak ze wsi uciekł przez bagno”, starzec zamyka oczy i długo ich nie otwiera.` :
      `– Dobrawa ci to przeczyta – mówi w końcu. – Ona zna znaki obcych. Ona zna wszystko, co nie powinno być znane.`),
  ch: [{ t: 'Dalej', go: 'starosta' }],
},

starosta_syn: {
  loc: 'mszaniec', sc: 'chata', fig: 'starzec',
  text: P(
    `– Wiem – mówi Bogumił. – Przybiegł przedwczoraj. To znaczy… przybiegł dziś w nocy. Nie wiem już, które dni są które.`,
    `Wstaje, podchodzi do ciebie i nagle, niezgrabnie, obejmuje cię. Pachnie starym kożuchem i dymem.`,
    `– Nie mówi nic do rzeczy. Śmieje się przez sen. Ale żyje. – Wciska ci w dłoń monety. – Dziesięć. Jak obiecałem. I niech cię bogowie strzegą, ci, co jeszcze zostali.`),
  first: () => { setF('sulislaw_zgloszony'); srebro(10); rozum(5); },
  ch: [{ t: 'Dalej', go: 'starosta' }],
},

starosta_syn_martwy: {
  loc: 'mszaniec', sc: 'chata', fig: 'starzec',
  text: P(
    `Bogumił słucha, nie przerywając. Kiedy kończysz, kiwa głową, raz, drugi, trzeci, jakby potwierdzał coś, co wiedział od dawna.`,
    `– Bagno – mówi. – Bagno zawsze bierze najmłodszych.`,
    `Podaje ci pięć monet. Nie patrzy na ciebie. – Za to, że mi powiedziałeś. Wolę wiedzieć.`),
  first: () => { setF('sulislaw_zgloszony'); srebro(5); rozum(-4); },
  ch: [{ t: 'Dalej', go: 'starosta' }],
},

/* ----------------------------- Dobrawa ----------------------------- */

dobrawa1: {
  loc: 'mszaniec', sc: 'chata', fig: 'starucha', title: 'Chata Dobrawy',
  text: P(
    `Chata Dobrawy stoi tak blisko lasu, że korzenie najbliższej sosny podnoszą jej próg. W środku jest ciepło i ciasno od ziół: bylica, piołun, dziurawiec, lulek i wiązki czegoś, czego nie umiesz nazwać.`,
    `Stara kobieta siedzi przy ogniu i nie odwraca się, kiedy wchodzisz.`,
    `– Pachniesz wilkiem – mówi. – I czymś starszym od wilka. Pokaż rękę.`,
    `Nie pytasz, skąd wie. Podwijasz rękaw. Dobrawa odwraca się wreszcie i widzisz, że jedno jej oko jest zdrowe i czarne, a drugie mleczne, zasnute bielmem. Zupełnie jak u tamtego wilka.`,
    `Ogląda ranę długo. Dotyka jej palcem, a ty czujesz ten dotyk gdzieś głęboko, za mostkiem.`,
    `– Pasterz cię naznaczył – mówi cicho. – Jeszcze zanim tu przyszedłeś. Ciekawe. Bardzo ciekawe.`),
  ch: [
    { t: 'Kto to jest Pasterz?', go: 'dobrawa_pasterz' },
    { t: 'Możesz to wyleczyć?', go: 'dobrawa_rana' },
    { t: 'Co masz na sprzedaż?', go: 'dobrawa_handel' },
    { t: 'Wyjdź', go: 'msz' },
  ],
},

dobrawa: {
  loc: 'mszaniec', sc: 'chata', fig: 'starucha', title: 'Chata Dobrawy',
  text: () => P(
    `Dobrawa miesza coś w garnku nad ogniem. Nie podnosi głowy. – No? – pyta.`,
    S.znamie >= 50 && `Kiedy podchodzisz bliżej, odsuwa się. Niewiele, ledwie o pół kroku. Ale się odsuwa.`),
  ch: [
    { t: 'Kto to jest Pasterz?', if: () => !know('pasterz'), go: 'dobrawa_pasterz' },
    { t: 'Jak brzmi jego imię?', if: () => know('pasterz') && !S.seen.dobrawa_imie, go: 'dobrawa_imie' },
    { t: 'Możesz wyleczyć moją rękę?', if: () => !F('lulek_dany'), go: 'dobrawa_rana' },
    { t: 'Pokaż jej kij runiczny', if: () => has('kij') && !know('runy'), go: 'dobrawa_runy' },
    { t: 'Pokaż jej pęta, które zdobyłeś', if: () => petaCount() > 0 && !S.seen.dobrawa_peta, go: 'dobrawa_peta' },
    { t: 'Opowiedz jej, co się stało w dziupli', if: () => F('wiszka_zabita') && !S.seen.dobrawa_wina, go: 'dobrawa_wina' },
    { t: 'Co masz na sprzedaż?', go: 'dobrawa_handel' },
    { t: 'Wyjdź', go: 'msz' },
  ],
},

dobrawa_pasterz: {
  loc: 'mszaniec', sc: 'chata', fig: 'starucha',
  text: P(
    `– Ludzie z Mszańca myślą, że uroczysko jest święte, bo mieszkają tam bogowie. – Dobrawa rzuca w ogień garść suchych ziół. Dym robi się słodki i ciężki. – Głupcy. Uroczysko jest święte, bo tam trzymamy kogoś, kto był tu przed bogami.`,
    `Mówi, że nie ma on imienia, które wolno wymówić. Starzy nazywali go Pasterzem Mgły, bo mgła jest jego stadem, a my trawą, na której to stado się pasie. Że jest głodem, który nauczył się myśleć. I że trzy kurhany na północy to nie groby, tylko pęta: troje ludzi, którzy dawno temu poszli pod ziemię z własnej woli, żeby go trzymać.`,
    `– Wojownik, Matka i Dziecko. Żelazo, nić i… zabawka. Każde coś tam ze sobą zabrało. – Uśmiecha się krzywo. – A teraz przyszli jacyś z łopatami i ruszyli pęta. Wielki kopiec za nimi też otworzyli. Więc on się przeciąga, budzi i jest głodny.`,
    `– Żeby go zawiązać, trzeba zebrać pęta, zanieść je w dół, do serca, i wypowiedzieć tam jego imię. I dać mu coś, czego się już nie odbierze. Tak mówią stare pieśni. – Wzrusza ramionami. – Pieśni lubią kłamać.`),
  first: () => { learn('pasterz'); learn('peta'); },
  ch: [
    { t: 'Jak brzmi jego imię?', go: 'dobrawa_imie' },
    { t: 'Dalej', go: 'dobrawa' },
  ],
},

dobrawa_imie: {
  loc: 'mszaniec', sc: 'chata', fig: 'starucha',
  text: P(
    `– Imienia się nie mówi. – Dobrawa patrzy na ciebie mlecznym okiem. – Jak powiem, on usłyszy, że ktoś go woła, i przyjdzie sprawdzić, kto.`,
    `– Ale wiem, gdzie je wyryto. W wielkim kopcu, w korytarzu z kości. Ostatni żerca, który tam zszedł przed Radogostem, wydrapał je na ścianie, żeby następny nie musiał szukać. Nisko, przy ziemi. Weź światło, najemniku. Dużo światła.`),
  first: () => { learn('gdzie_imie'); setF('wie_gdzie_imie'); },
  ch: [{ t: 'Dalej', go: 'dobrawa' }],
},

dobrawa_rana: {
  loc: 'mszaniec', sc: 'chata', fig: 'starucha',
  text: P(
    `– Wyleczyć? Nie. To nie jest rana od zębów, choć zęby ją zrobiły. – Sięga na półkę po gliniany dzbanuszek zatkany woskiem. – Ale mogę ci dać to.`,
    `– Wywar z lulka czarnego. Zabija gorączkę, zrasta skórę, odpędza ból. Za to otwiera oczy na to, czego nie powinieneś widzieć. Jedni widzą prawdę. Inni widzą to, czego się boją. – Stawia dzbanuszek przed tobą. – Nie wiem, którzy mają gorzej.`),
  ch: [
    { t: 'Weź wywar', go: 'dobrawa', do: () => { setF('lulek_dany'); give('lulek'); learn('lulek'); } },
    { t: 'Nie trzeba. Poradzę sobie.', go: 'dobrawa', do: () => setF('lulek_dany') },
  ],
},

dobrawa_runy: {
  loc: 'mszaniec', sc: 'chata', fig: 'starucha',
  text: P(
    `Dobrawa obraca kij w palcach i czyta, poruszając ustami. Znaki Północy zna – nie pytasz skąd.`,
    `Kiedy kończy, odkłada kij na stół, jakby był brudny.`,
    `– Hrodgar – mówi. – Głupi, odważny i chciwy. Najgorsze połączenie. Ale jedno zrobił dobrze: napisał, gdzie jest dziewczynka.`),
  first: () => { learn('runy'); setF('wie_dziupla'); },
  ch: [{ t: 'Dalej', go: 'dobrawa' }],
},

dobrawa_peta: {
  loc: 'mszaniec', sc: 'chata', fig: 'starucha',
  text: () => P(
    `Kładziesz przed nią to, co wyniosłeś z kurhanów. Dobrawa nie dotyka ich. Patrzy tylko i oddycha coraz płycej.`,
    petaCount() === 3 ? `– Wszystkie trzy – szepcze. – Wszystkie trzy. Nie myślałam, że jeszcze to zobaczę.` : `– ${petaCount() === 1 ? 'Jedno' : 'Dwa'} z trzech. Potrzebujesz wszystkich, najemniku. Inaczej sznur będzie za krótki.`,
    `– Słuchaj uważnie, bo drugi raz nie powiem. Na dole, w sercu, są trzy gniazda. Tam, gdzie pęta były, zanim je wyrwano. Połóż je tam. Potem imię. Potem dar.`,
    `Milknie. Patrzy na ciebie zdrowym okiem i widzisz w nim coś, czego się nie spodziewałeś: żal.`,
    `– Darem jest ktoś, kto zostanie. Zawsze tak było. Pieśni mówią o tym ładnie, ale tak było zawsze.`,
    `Wsuwa ci w dłoń wiązkę bylicy. – Na drogę. Na dole będziesz jej potrzebował.`),
  first: () => { learn('rytual'); give('bylica'); },
  ch: [{ t: 'Dalej', go: 'dobrawa' }],
},

dobrawa_wina: {
  loc: 'mszaniec', sc: 'chata', fig: 'starucha',
  text: P(
    `Mówisz. Plączesz się. Mówisz o czymś z długimi kończynami, bez twarzy, o skrzeku, o wstążce na mchu. Dobrawa słucha i nic nie mówi, aż skończysz.`,
    `– W mgle nikt nie jest tym, kim jest – mówi w końcu. – Może to była ona. Może nie. Pasterz lubi pokazywać ludziom to, czego się boją, i patrzeć, co zrobią.`,
    `– Nie mów Mirze. – Odwraca się do ognia. – Niech plecie tę swoją wstążkę. Niech ma chociaż to.`),
  first: () => rozum(-6),
  ch: [{ t: 'Dalej', go: 'dobrawa' }],
},

dobrawa_handel: {
  loc: 'mszaniec', sc: 'chata', fig: 'starucha', title: 'Chata Dobrawy',
  text: () => P(
    `Dobrawa wysypuje na stół woreczki i wiązki. – Srebro za ziele – mówi. – Ziele za życie. Uczciwa wymiana.`,
    `Masz ${S.silver} ${plural(S.silver, 'dirhama', 'dirhamy', 'dirhamów')}.`),
  ch: [
    { t: 'Bylica (3 srebra) – na szepty i strach', if: () => S.silver >= 3, go: 'dobrawa_handel', do: () => { srebro(-3); give('bylica'); } },
    { t: 'Sól (3 srebra) – na upiory', if: () => S.silver >= 3, go: 'dobrawa_handel', do: () => { srebro(-3); give('sol'); } },
    { t: 'Pochodnia (2 srebra)', if: () => S.silver >= 2, go: 'dobrawa_handel', do: () => { srebro(-2); give('pochodnia'); } },
    { t: 'Chleb (1 srebro)', if: () => S.silver >= 1, go: 'dobrawa_handel', do: () => { srebro(-1); give('chleb'); } },
    { t: 'Miód pitny (3 srebra)', if: () => S.silver >= 3, go: 'dobrawa_handel', do: () => { srebro(-3); give('miod'); } },
    { t: 'Wywar z lulka (6 srebra)', if: () => S.silver >= 6 && F('lulek_dany'), go: 'dobrawa_handel', do: () => { srebro(-6); give('lulek'); learn('lulek'); } },
    { t: 'Wystarczy', go: 'dobrawa' },
  ],
},

/* ------------------------------- Mira ------------------------------- */

mira1: {
  loc: 'mszaniec', sc: 'chata', fig: 'kobieta', title: 'Chata Miry',
  text: P(
    `Mira jest młoda, ale włosy ma siwe przy skroniach. Posiwiała, jak mówią sąsiadki, w ciągu jednej nocy. Siedzi na progu chaty i plecie z czerwonej wełny długą wstążkę. Plecie ją, odkąd Wiszka zniknęła, i nie przestaje.`,
    `– Wiszka ma taką samą – mówi, nie patrząc na ciebie. – Czerwoną wstążkę we włosach. Ma osiem lat. Rude włosy, piegi. Poszła na skraj lasu po jeżyny, w biały dzień, śpiewając. Zawsze śpiewa. Piosenkę o trzech, co ją babki dzieciom śpiewają.`,
    `Nuci ci ją, cicho, łamiącym się głosem:`,
    `<i>Śpi wojak z żelazem, śpi matka przy kądzieli,<br>śpi dzieciątko z grzechotką, by tamten nie wstał z pościeli…</i>`,
    `– Dalej nie pamiętam. Wiszka pamięta całą. – Podnosi na ciebie oczy. – Znajdziesz ją?`),
  first: () => learn('piesn1'),
  ch: [
    { t: 'Obiecaj, że jej poszukasz', go: 'msz', do: () => { setF('obietnica'); rozum(4); } },
    { t: '– Niczego nie obiecuję. Ale będę patrzył.', go: 'msz' },
  ],
},

mira: {
  loc: 'mszaniec', sc: 'chata', fig: 'kobieta', title: 'Chata Miry',
  on: () => { if (F('wiszka_zabita') && !F('mira_wina')) { setF('mira_wina'); rozum(-6); } },
  text: () => F('wiszka_w_domu') ? P(
    `Mira siedzi na progu z Wiszką na kolanach i czesze jej rude włosy. Obie mają we włosach czerwone wstążki. Kiedy cię widzą, Wiszka macha do ciebie. Mira tylko się uśmiecha. Nie musi nic mówić.`
  ) : F('wiszka_zabita') ? P(
    `Mira wciąż plecie wstążkę. Pyta cię, czy coś wiesz. Odpowiadasz, że szukasz.`,
    `Nie możesz spojrzeć jej w oczy.`
  ) : P(
    `Mira plecie wstążkę. Wstążka jest już tak długa, że zwija się u jej stóp jak czerwony wąż.`,
    `– Szukasz jej? – pyta. Nie czeka na odpowiedź.`),
  ch: [{ t: 'Odejdź', go: 'msz' }],
},

mira_powrot: {
  loc: 'mszaniec', sc: 'chata', fig: 'kobieta', title: 'Chata Miry',
  text: P(
    `Wiszka puszcza twoją rękę dziesięć kroków przed chatą i biegnie.`,
    `Mira podnosi głowę znad wstążki. Przez chwilę nie rusza się wcale, jakby bała się, że jeśli się poruszy, to wszystko rozwieje się jak mgła. Potem wstążka spada jej z kolan i Mira krzyczy. Nie słowa – po prostu krzyczy, i biegnie, i obie upadają w błoto, i żadna z nich się tym nie przejmuje.`,
    `Stoisz z boku. Najemnicy nie są od takich chwil.`,
    `Później, kiedy Wiszka śpi już w chacie, Mira podchodzi do ciebie i zdejmuje z szyi małą srebrną puszeczkę na rzemieniu – kaptorgę, w której noszą zioła na złe duchy.`,
    `– To po mężu – mówi. – Chroniła go, póki jej nie zdjął. Ty jej nie zdejmuj.`),
  first: () => { unF('wiszka_z_toba'); setF('wiszka_w_domu'); give('kaptorga'); rozum(25); znamie(-5); },
  ch: [{ t: 'Dalej', go: 'msz' }],
},

/* ============================== SKRAJ ============================== */

skraj: {
  loc: 'skraj', sc: 'skraj', hub: true,
  text: () => S.seen.skraj ? P(
    `Płot z czaszek. Mgła za nim stoi tak samo jak wtedy, gdy przyszedłeś tu pierwszy raz: biała, gęsta, nieruchoma.`,
    night() && `Nocą wydaje ci się, że czaszki odwracają się za tobą, kiedy przechodzisz.`
  ) : P(
    `Ścieżka z Mszańca kończy się nagle, jakby ktoś ją uciął nożem. Dalej stoi płot.`,
    `Nie płot z desek. Płot z pali, a na każdym palu czaszka: końska, turza, niedźwiedzia, wilcza. Stare, zielone od mchu, wbite tu przez ludzi, którzy wiedzieli, po co to robią. Za płotem mgła stoi jak ściana – gęsta, biała i nieruchoma, choć wieje wiatr.`,
    `Na jednym z pali, z boku, czaszka jest mała. Ludzka. I świeża.`,
    `Gdy przechodzisz między palami, mgła rozstępuje się przed tobą bez szmeru. Jakby czekała.`),
  first: () => rozum(-3),
  ch: [
    { t: 'Obejrzyj ślady na ścieżce', if: () => !F('slady_skraj'), do: () => setF('slady_skraj'),
      test: { s: 'czu', dc: 8, ok: 'skraj_slady_ok', no: 'skraj_slady_no' } },
    { t: 'Obejrzyj małą czaszkę', if: () => !S.seen.skraj_czaszka, go: 'skraj_czaszka' },
    { t: 'Zostaw na palu kawałek chleba dla tego, kto tu pilnuje', if: () => has('chleb') && !F('ofiara_skraj'), go: 'skraj_ofiara',
      do: () => { take('chleb'); setF('ofiara_skraj'); } },
  ],
},

skraj_slady_ok: {
  loc: 'skraj', sc: 'skraj',
  text: P(
    `Ślady mają już sześć dni, ale są głębokie: koleiny ciężkiego wozu, okute buty, coś ciągniętego po ziemi. Pięciu ludzi, może sześciu. Prowadzą na północny wschód, omijając gaj od strony bagna. Ktoś znał drogę i nie chciał wchodzić w święte miejsce frontowymi drzwiami.`,
    `Między śladami butów biegną inne: małe, bose, lekkie. Dziecięce. Te są nowsze.`),
  first: () => { setF('slady_wiszki'); },
  ch: [{ t: 'Dalej', go: 'skraj' }],
},

skraj_slady_no: {
  loc: 'skraj', sc: 'skraj',
  text: `Mgła zjada ślady szybciej, niż je czytasz. Widzisz tylko koleiny wozu: ktoś wjechał tu z ciężarem i nie wyjechał.`,
  ch: [{ t: 'Dalej', go: 'skraj' }],
},

skraj_czaszka: {
  loc: 'skraj', sc: 'skraj',
  text: () => P(
    `Czaszka jest niewielka, wielkości pięści. Nie dziecięca – za stara, za szeroka w szczęce. Dorosła, ale jakby ktoś ją… ścisnął. Na kości są ślady zębów. Drobnych, gęstych i za licznych, żeby należały do jednego pyska.`,
    S.rozum < 70 ? `~Dziwisz. Pastuch. Nie poznajesz go? On ciebie poznaje.~` : `Odkładasz ją na pal. Ostrożnie, jakby mogła się obrazić.`),
  first: () => rozum(-4),
  ch: [{ t: 'Dalej', go: 'skraj' }],
},

skraj_ofiara: {
  loc: 'skraj', sc: 'skraj', fig: 'borowy',
  text: P(
    `Wciskasz kawałek chleba w szczelinę pala, pod końską czaszką. Kiedy się odwracasz, między drzewami, na granicy mgły, stoi niski starzec z brodą z mchu i patrzy na ciebie oczami jak dwie krople żywicy.`,
    `Mrugasz – i nie ma go. Chleba też nie ma.`,
    `Ale robi ci się lżej. Jakby ktoś zdjął ci z karku dłoń, której istnienia nawet nie zauważyłeś.`),
  first: () => { rozum(8); setF('borowy'); S.safeTravel = (S.safeTravel || 0) + 2; },
  ch: [{ t: 'Dalej', go: 'skraj' }],
},

/* ============================== GAJ ============================== */

gaj: {
  loc: 'gaj', sc: 'gaj', hub: true,
  text: () => S.seen.gaj ? P(
    F('idol') ? `Czworolicy stoi znów, krzywo, podparty kamieniami. Mgła trzyma się od niego o kilka kroków.` : `Czworolicy leży w błocie. Ta jedna nietknięta twarz patrzy na północ.`,
    `Pień świętego dębu wciąż sączy czerwienią.`,
    night() && `Nocą wydaje ci się, że twarz Czworolicego obraca się powoli w twoją stronę.`
  ) : P(
    `Gaj był kiedyś piękny. Widać to nawet teraz: w tym, jak stoją drzewa, w ścieżce wydeptanej przez pokolenia, w kamieniach ułożonych w krąg wokół miejsca, gdzie stał bóg.`,
    `Czworolicy leży w błocie. Dębowy słup wyższy od trzech ludzi, rzeźbiony w cztery twarze patrzące na cztery strony świata. Ktoś go podciął, zwalił i odarł z ofiar: na ziemi walają się potłuczone gliniane miski, zbutwiałe wieńce, rozsypane ziarno.`,
    `Obok stoi pień świętego dębu, ścięty równo, siekierą. Słoje na pniu są ciemne i lepkie. Pień wciąż… sączy. Czerwonym sokiem, gęstym jak krew.`,
    !F('wstazka_wzieta') && `Na niskiej gałęzi, na wysokości dziecięcej ręki, trzepocze czerwona wełniana wstążka.`),
  ch: [
    { t: 'Obejrzyj Czworolicego', if: () => !F('idol_obejrzany'), do: () => setF('idol_obejrzany'),
      test: { s: 'czu', dc: 9, ok: 'gaj_idol_ok', no: 'gaj_idol_no' } },
    { t: 'Podnieś Czworolicego', if: () => !F('idol'), cost: 1,
      test: { s: 'sil', dc: 11, ok: 'gaj_podniesiony', no: 'gaj_za_ciezki' } },
    { t: 'Zdejmij wstążkę z gałęzi', if: () => !F('wstazka_wzieta'), go: 'gaj_wstazka', do: () => { setF('wstazka_wzieta'); give('wstazka'); } },
    { t: 'Wylej miód przed bogiem jako ofiarę', if: () => has('miod') && !F('ofiara_gaj'), go: 'gaj_ofiara', do: () => { take('miod'); setF('ofiara_gaj'); } },
    { t: 'Zliż czerwony sok z pnia', hunger: 25, if: () => !F('sok'), go: 'gaj_sok', do: () => setF('sok') },
  ],
},

gaj_idol_ok: {
  loc: 'gaj', sc: 'gaj',
  text: P(
    `Trzy twarze Czworolicego ktoś zeskrobał siekierą do gołego drewna. Czwarta, ta, która patrzyła na północ, w stronę kurhanów, została nietknięta, jakby ten, kto rąbał, bał się jej dotknąć.`,
    `Pod nią wyrzeźbiono rząd znaków: trzy kopce, a pod nimi czwarty, większy. Z wielkiego wychodzi coś na kształt jelenia albo człowieka z porożem, a wokół niego oczy. Dziesiątki wyrytych dłutem oczu. Trzy małe kopce połączono z wielkim liniami, jak sznurami.`,
    `~Sznury można przeciąć.~`),
  first: () => { learn('peta'); },
  ch: [{ t: 'Dalej', go: 'gaj' }],
},

gaj_idol_no: {
  loc: 'gaj', sc: 'gaj',
  text: `Twarze Czworolicego są zeskrobane siekierą. Pod błotem coś jeszcze jest wyrzeźbione, ale mgła i brud nie pozwalają ci tego odczytać.`,
  ch: [{ t: 'Dalej', go: 'gaj' }],
},

gaj_podniesiony: {
  loc: 'gaj', sc: 'gaj',
  text: P(
    `Wbijasz ramię pod słup, zapierasz się nogami w błoto i pchasz, aż robi ci się czerwono przed oczami. Czworolicy podnosi się powoli, z mlaśnięciem błota, i staje – krzywo, ale staje. Podpierasz go kamieniami.`,
    `Przez chwilę nic się nie dzieje. Potem przez gaj przechodzi wiatr, pierwszy raz, odkąd tu wszedłeś, i mgła cofa się o kilka kroków. Daleko na północy coś wydaje dźwięk, jakby ktoś na drugim końcu świata syknął przez zęby.`),
  first: () => { setF('idol'); rozum(15); znamie(-8); },
  ch: [{ t: 'Dalej', go: 'gaj' }],
},

gaj_za_ciezki: {
  loc: 'gaj', sc: 'gaj',
  text: `Słup ani drgnie. Zostawiasz w błocie ślady butów i trochę skóry z dłoni. Może później, z większą siłą. Albo z czyjąś pomocą, której tu nie znajdziesz.`,
  first: () => hp(-2),
  ch: [{ t: 'Dalej', go: 'gaj' }],
},

gaj_wstazka: {
  loc: 'gaj', sc: 'gaj',
  text: P(
    `Wełna jest wilgotna i pachnie dymem z domowego paleniska. Wiszka tu była.`,
    `Pod gałęzią, w miękkiej ziemi, widać ślady małych bosych stóp. Biegną na wschód, w stronę obozu obcych.`),
  first: () => setF('slady_wiszki'),
  ch: [{ t: 'Dalej', go: 'gaj' }],
},

gaj_ofiara: {
  loc: 'gaj', sc: 'gaj',
  text: `Wylewasz miód na ziemię przed Czworolicym, tak jak robiła twoja matka przed domowym ołtarzykiem, kiedy byłeś mały. Słodki zapach miesza się z zapachem zgnilizny. Ziemia pije go chciwie. Coś w tobie się uspokaja.`,
  first: () => { rozum(12); znamie(-4); },
  ch: [{ t: 'Dalej', go: 'gaj' }],
},

gaj_sok: {
  loc: 'gaj', sc: 'gaj',
  text: P(
    `Klękasz przy pniu. Sok jest ciepły. Smakuje jak krew i jak miód, i jak coś, czego nie jadłeś od dziecka, a za czym tęskniłeś całe życie.`,
    `Rana na przedramieniu przestaje boleć. Zaczyna się… cieszyć.`),
  first: () => { hp(8); znamie(10); },
  ch: [{ t: 'Wstań', go: 'gaj' }],
},

/* ============================== BAGNO ============================== */

bagno: {
  loc: 'bagno', sc: 'bagno', hub: true,
  text: () => S.seen.bagno ? P(
    `Kładka z omszałych bali. Czarna woda. Martwe olchy.`,
    !F('topielec_done') && `Trup kopacza wciąż unosi się na wodzie, twarzą w dół. Sakiewka na jego pasie połyskuje.`,
    !F('sul_done') && `Przy przewróconej olszy Sulisław wciąż szepcze. Bagno trzyma go po pierś.`,
    night() && `Nad wodą tańczą bladozielone ogniki.`
  ) : P(
    `Topielisko zaczyna się niepostrzeżenie. Najpierw mech pod stopami robi się miękki, potem chlupie, a potem ścieżkę zastępuje kładka z omszałych bali położonych na czarnej wodzie. Z wody sterczą martwe olchy. Mgła leży tu tak nisko, że brodzisz w niej po kolana jak w mleku.`,
    `Pięćdziesiąt kroków od kładki unosi się na wodzie człowiek, twarzą w dół. Na jego pasie, w świetle, którego tu właściwie nie ma, połyskuje sakiewka.`,
    `A dalej, przy przewróconej olszy, coś się porusza. Głowa. Ktoś tkwi w bagnie po pierś i szepcze.`),
  ch: [
    { t: 'Podejdź do szepczącego', if: () => !F('sul_done'), go: 'bag_sulislaw' },
    { t: 'Sięgnij po sakiewkę topielca', if: () => !F('topielec_done'), go: 'bag_topielec' },
    { t: 'Idź za błędnymi ognikami', if: () => night() && !F('ogniki_bagno'), do: () => setF('ogniki_bagno'), cost: 1,
      test: { s: 'czu', dc: 9, ok: 'bag_ogniki_ok', no: 'bag_ogniki_no' } },
  ],
},

bag_sulislaw: {
  loc: 'bagno', sc: 'bagno', fig: 'sulislaw',
  text: () => S.seen.bag_sulislaw ? P(
    `Sulisław zapadł się głębiej. Bagno sięga mu już do szyi. Wciąż szepcze, ale coraz ciszej.`
  ) : P(
    `To młody mężczyzna, rudawy, z rzadką brodą. Bagno trzyma go po pierś i powoli, bardzo powoli, wciąga głębiej. Usta poruszają mu się bez przerwy.`,
    `– …nie kopcie, nie kopcie wielkiego, Hrodgar, on oddycha, słyszysz, ziemia oddycha… – Podnosi na ciebie nieprzytomne oczy. – Ty też go słyszysz? Ty… ty pachniesz tak jak on.`,
    `To Sulisław. Syn starosty.`),
  first: () => setF('o_sulislawie'),
  ch: [
    { t: 'Wyciągnij go liną', if: () => has('lina'), go: 'bag_sul_uratowany' },
    { t: 'Wyciągnij go gołymi rękami', test: { s: 'sil', dc: () => F('sul_glebiej') ? 12 : 10, ok: 'bag_sul_uratowany', no: 'bag_sul_utonal' } },
    { t: 'Zapytaj, co się stało, zanim cokolwiek zrobisz', if: () => !F('sul_glebiej'), go: 'bag_sul_pytanie' },
    { t: 'Zostaw go. Bagno już go ma.', go: 'bag_sul_zostawiony' },
  ],
},

bag_sul_pytanie: {
  loc: 'bagno', sc: 'bagno', fig: 'sulislaw',
  text: P(
    `– Hrodgar mówił: srebro – szepcze Sulisław, szybko, jakby się bał, że nie zdąży. – Kopaliśmy kopiec wojownika. Bjorn wszedł pierwszy i… nie wyszedł. Jego śmiech wyszedł. Sam. Potem Hrodgar kazał kopać wielki. Kopaliśmy dwa dni, a ziemia była coraz cieplejsza.`,
    `– Dziewczynka? Mała z Mszańca, Wiszka. Przyszła za nami, śpiewała. Hrodgar chciał ją odesłać, ale uciekła, schowała się w dziupli starego dębu przy obozie. A ja… ja uciekłem tędy. I bagno…`,
    `Mówiąc, zapada się. Bagno sięga mu już do obojczyków.`),
  first: () => { learn('kopacze'); setF('wie_dziupla'); setF('sul_glebiej'); },
  ch: [
    { t: 'Wyciągnij go liną', if: () => has('lina'), go: 'bag_sul_uratowany' },
    { t: 'Wyciągnij go gołymi rękami', test: { s: 'sil', dc: 12, ok: 'bag_sul_uratowany', no: 'bag_sul_utonal' } },
    { t: 'Zostaw go', go: 'bag_sul_zostawiony' },
  ],
},

bag_sul_uratowany: {
  loc: 'bagno', sc: 'bagno',
  text: P(
    `Bagno puszcza go niechętnie, z długim, mlaszczącym westchnieniem. Sulisław leży na kładce, trzęsie się i płacze.`,
    `Potem, zanim zdążysz go zatrzymać, zrywa się i biegnie, potykając się, w stronę Mszańca. Krzyczy coś przez ramię. Brzmi to jak: „Dziupla! Stary dąb przy obozie!”`),
  first: () => { setF('sul_done'); setF('sulislaw_uratowany'); setF('wie_dziupla'); learn('kopacze'); rozum(8); },
  ch: [{ t: 'Dalej', go: 'bagno' }],
},

bag_sul_utonal: {
  loc: 'bagno', sc: 'bagno',
  text: P(
    `Chwytasz go pod pachy i ciągniesz. Bagno ciągnie mocniej. Przez chwilę walczysz z nim jak z żywym stworzeniem, czujesz, jak coś pod powierzchnią obejmuje nogi Sulisława i nie chce puścić.`,
    `Potem jego głowa znika pod czarną wodą. Ostatnie, co widzisz, to jego oczy. Spokojne. Prawie wdzięczne.`),
  first: () => { setF('sul_done'); setF('sulislaw_martwy'); rozum(-12); hp(-2); },
  ch: [{ t: 'Dalej', go: 'bagno' }],
},

bag_sul_zostawiony: {
  loc: 'bagno', sc: 'bagno',
  text: `Odchodzisz. Szept za twoimi plecami cichnie, cichnie i milknie. Nie oglądasz się. Wiesz, że gdybyś się obejrzał, nie zobaczyłbyś już głowy nad wodą.`,
  first: () => { setF('sul_done'); setF('sulislaw_martwy'); rozum(-10); znamie(4); },
  ch: [{ t: 'Dalej', go: 'bagno' }],
},

bag_topielec: {
  loc: 'bagno', sc: 'bagno', fig: 'topielec',
  text: P(
    `Kładka ugina się pod tobą, woda chlupie między balami. Przyklękasz na skraju i sięgasz po pas trupa.`,
    `Kiedy twoje palce dotykają sakiewki, trup obraca się na plecy. Ma otwarte oczy, białe jak u ryby, i uśmiecha się szeroko, bardzo szeroko, aż do uszu.`),
  ch: [
    { t: 'Walcz', fight: { e: 'topielec', win: 'bag_topielec_wygrana', flee: 'bagno' } },
    { t: 'Puść sakiewkę i uciekaj na brzeg', test: { s: 'zre', dc: 8, ok: 'bagno', no: 'bag_topielec_chwyt' } },
  ],
},

bag_topielec_chwyt: {
  loc: 'bagno', sc: 'bagno', fig: 'topielec',
  text: `Nie zdążasz. Zimne palce zaciskają się na twojej kostce.`,
  ch: [{ t: 'Walcz', fight: { e: 'topielec', win: 'bag_topielec_wygrana', flee: 'bagno' } }],
},

bag_topielec_wygrana: {
  loc: 'bagno', sc: 'bagno',
  text: P(
    `Topielec zapada się w czarną wodę, wciąż uśmiechnięty. Woda zamyka się nad nim bez jednej zmarszczki.`,
    `Sakiewka została na kładce: dwanaście dirhamów i garść siekanego srebra. Monety są zimne i trochę śliskie.`),
  first: () => { setF('topielec_done'); srebro(12); },
  ch: [{ t: 'Dalej', go: 'bagno' }],
},

bag_ogniki_ok: {
  loc: 'bagno', sc: 'bagno',
  text: P(
    `Ogniki prowadzą cię przez bagno ścieżką, której nie widać w dzień: kępa, korzeń, kamień, znowu kępa. Na końcu, na suchej wysepce, stoi pochylony słupek z wyrzeźbioną twarzą. Pod nim ktoś zostawił zawiniątko.`,
    `Bylica, woreczek soli, pochodnia. I gliniana tabliczka z odciśniętą dłonią. Radogost musiał tu być, zanim zszedł pod ziemię. Zostawił to dla kogoś, kto przyjdzie po nim.`),
  first: () => { give('bylica'); give('sol'); give('pochodnia'); },
  ch: [{ t: 'Wróć na kładkę', go: 'bagno' }],
},

bag_ogniki_no: {
  loc: 'bagno', sc: 'bagno',
  text: `Ogniki tańczą coraz dalej, a ty idziesz za nimi, coraz głębiej w czarną wodę, aż nagle gasną wszystkie naraz. Stoisz po pas w bagnie, w zupełnej ciemności, i słyszysz chichot. Wydostanie się zabiera ci długie godziny.`,
  first: () => { hp(-3); rozum(-6); tick(1); },
  ch: [{ t: 'Dalej', go: 'bagno' }],
},

/* ============================== WILCZY JAR ============================== */

jar: {
  loc: 'jar', sc: 'jar', hub: true,
  fig: () => F('jar_done') ? (F('wilczyca_martwa') ? null : 'wilki_spokojne') : 'wilczyca',
  text: () => F('jar_done') ? P(
    F('wilczyca_martwa') ? `Wilczy Jar jest cichy. Ciało Wilczej Matki leży tam, gdzie padła. Reszta stada uciekła i już nie wróciła.` :
      `Wilki leżą na zboczach. Kiedy przechodzisz, podnoszą łby i patrzą. Nie atakują. Uznały cię za swego albo za kogoś, komu należy się szacunek.`
  ) : P(
    `Wilczy Jar to rozcięcie w ziemi, jakby ktoś rozorał puszczę pazurem. Strome zbocza, korzenie zwisające jak włosy, a na dnie strumień, który nie szumi, tylko szepcze. I kości. Wszędzie kości, owcze, krowie, kozie. Całe stado.`,
    `Wilki są tutaj. Nie widzisz ich, ale wiesz. Czujesz ich tak, jak czuje się na karku czyjś wzrok.`,
    `Potem jeden z cieni na zboczu wstaje. Jest większy, niż wilk ma prawo być, siwy, z bielmem na lewym oku. Za nim wstają inne.`),
  ch: [
    { t: 'Dobądź broni', if: () => !F('jar_done'), fight: { e: ['wilk', 'wilk', 'wilczyca'], win: 'jar_wygrana', flee: 'skraj' } },
    { t: 'Rzuć im suszone mięso', if: () => !F('jar_done') && has('mieso'), go: 'jar_mieso', do: () => take('mieso') },
    { t: 'Stój spokojnie i pokaż jej ranę', if: () => !F('jar_done'),
      test: { s: 'wol', dc: () => S.znamie >= 20 ? 6 : 8, ok: 'jar_wilczyca', no: 'jar_atak' } },
    { t: 'Przeszukaj legowisko na końcu jaru', if: () => F('jar_done') && !F('legowisko'), go: 'jar_legowisko', do: () => setF('legowisko') },
  ],
  hubIf: () => F('jar_done'),
},

jar_atak: {
  loc: 'jar', sc: 'jar', fig: 'wilczyca',
  text: `Wilczyca patrzy na twoją rękę, potem na ciebie. Wącha powietrze. Coś jej się nie podoba – może strach, który czuje, może to, że nie klęknąłeś. Kładzie uszy po sobie. Stado rusza.`,
  ch: [{ t: 'Walcz', fight: { e: ['wilk', 'wilk', 'wilczyca'], win: 'jar_wygrana', flee: 'skraj' } }],
},

jar_wilczyca: {
  loc: 'jar', sc: 'jar', fig: 'wilczyca',
  text: P(
    `Podwijasz rękaw. Wilczyca podchodzi wolno, z łbem nisko. Wącha ranę. Potem liże ją raz, szorstkim, gorącym językiem, i coś w tobie odpowiada na to drżeniem, którego się wstydzisz.`,
    `Odchodzi. Kiedy patrzysz na miejsce, gdzie stała, leży tam kieł. Długi, żółty, z dziurką wywierconą u nasady, jakby czekał na rzemień.`,
    `~Teraz jesteś w stadzie.~`),
  first: () => { setF('jar_done'); setF('kiel'); give('kiel'); znamie(8); },
  ch: [{ t: 'Dalej', go: 'jar' }],
},

jar_mieso: {
  loc: 'jar', sc: 'jar', fig: 'wilczyca',
  text: `Rzucasz mięso. Wilki nie rzucają się na nie. Czekają, aż wilczyca podejdzie, powącha i odwróci łeb na znak zgody. Dopiero wtedy jedzą. Ona przez cały czas patrzy na ciebie.`,
  first: () => setF('jar_done'),
  ch: [{ t: 'Dalej', go: 'jar' }],
},

jar_wygrana: {
  loc: 'jar', sc: 'jar',
  text: P(
    `Wilczyca pada ostatnia. Kiedy umiera, patrzy na ciebie zdrowym okiem, a ty masz wrażenie, że jest… rozczarowana. Reszta stada ucieka z jękiem w górę zbocza.`,
    `Wyłamujesz jej kieł. Długi, żółty. Ktoś kiedyś wywiercił w nim dziurkę na rzemień. Nie chcesz wiedzieć kto.`),
  first: () => { setF('jar_done'); setF('wilczyca_martwa'); give('kiel'); rozum(-5); },
  ch: [{ t: 'Dalej', go: 'jar' }],
},

jar_legowisko: {
  loc: 'jar', sc: 'jar',
  text: P(
    `Na końcu jaru, pod nawisem korzeni, jest legowisko. Pośrodku leży to, co zostało z pastucha Dziwisza: kożuch, kij i róg pasterski na rzemieniu. Nic więcej. Ani jednej kości.`,
    `Kożuch jest pusty, ale ułożony tak, jakby ktoś wciąż w nim leżał, zwinięty, z kolanami pod brodą.`,
    `Zabierasz róg. Kiedy odchodzisz, kożuch – jesteś tego prawie pewien – przewraca się na drugi bok.`),
  first: () => { give('rog'); rozum(-6); },
  ch: [{ t: 'Dalej', go: 'jar' }],
},

/* ============================== KRĄG ============================== */

krag: {
  loc: 'krag', sc: 'krag', hub: true,
  text: () => S.seen.krag ? P(
    `Dziewięć kamieni pochylonych do środka. Płaski głaz z czarnymi rowkami. Pod ziemią oddech, wolny i głęboki.`,
    night() && `Nocą kamienie wyglądają jak zęby.`
  ) : P(
    `Na wzgórzu, gdzie drzewa rzedną, stoi dziewięć kamieni. Szare, wyższe od człowieka, pochylone do środka, jakby się nad czymś naradzały. Pośrodku leży płaski głaz z wyżłobionymi rowkami. Rowki są czarne. Przy kamieniach rośnie bylica, jedyna zieleń w całej tej szarości.`,
    `Gdy wchodzisz w krąg, mgła zostaje na zewnątrz. Słyszysz własny oddech, bardzo głośno.`,
    `A potem słyszysz drugi oddech. Wolniejszy. Głębszy. Dochodzi spod ziemi, spod twoich stóp, spod całego wzgórza, a ziemia unosi się lekko w jego rytmie.`,
    `~…przyszedłeś…~`),
  first: () => { whisperHurt(8); znamie(3); },
  ch: [
    { t: 'Zbierz bylicę spod kamieni', if: () => !F('bylica_krag'), go: 'krag', do: () => { setF('bylica_krag'); give('bylica', 2); } },
    { t: 'Odczytaj znaki na kamieniach', if: () => !F('krag_znaki'), do: () => setF('krag_znaki'),
      test: { s: 'czu', dc: 9, ok: 'krag_znaki_ok', no: 'krag_znaki_no' } },
    { t: 'Połóż się na głazie i zaśnij. Niech przyjdzie sen.', if: () => !F('krag_sen'), go: 'krag_sen', do: () => setF('krag_sen') },
    { t: 'Natnij dłoń i daj kamieniom krwi', hunger: 30, if: () => !F('krag_krew'), go: 'krag_krew', do: () => setF('krag_krew') },
  ],
},

krag_znaki_ok: {
  loc: 'krag', sc: 'krag',
  text: P(
    `Bardzo dawno temu ktoś wyrył na kamieniach proste obrazki, a ktoś później – pewnie kolejni żercy – poprawiał je, kiedy deszcz je zacierał. Czytasz je jak opowieść.`,
    `Wojownik kładzie się w ziemi z żelazem. Matka kładzie się z nicią. Dziecko z zabawką. Ziemia zamyka się nad nimi. Pod nimi, głębiej, coś z porożem i oczami zostaje związane trzema sznurami.`,
    `Na ostatnim kamieniu człowiek schodzi w głąb wielkiego kopca. Niesie trzy przedmioty i ma wyryte wielkie, otwarte usta. Mówi coś. Imię. A obok niego drugi człowiek się kładzie. Tak jak tamci troje.`,
    `~Czwarty sznur. Zawsze musi być czwarty.~`),
  first: () => learn('rytual'),
  ch: [{ t: 'Dalej', go: 'krag' }],
},

krag_znaki_no: {
  loc: 'krag', sc: 'krag',
  text: `Znaki są stare, zatarte, porośnięte porostem. Widzisz kopce, sznury, coś z porożem. Reszta to dla ciebie tylko rysy w kamieniu. Kiedy patrzysz na nie za długo, zaczynają się poruszać.`,
  first: () => rozum(-3),
  ch: [{ t: 'Dalej', go: 'krag' }],
},

krag_sen: {
  loc: 'krag', sc: 'krag',
  on: () => { tick(4); },
  text: P(
    `Kładziesz się na głazie. Kamień jest ciepły, choć powinien być zimny. Rowki pod twoimi plecami pasują do ciała, jakby ktoś je wyżłobił na twoją miarę.`,
    `Zasypiasz.`,
    `Śnisz, że jesteś bardzo stary i bardzo głodny. Że leżysz w ciemności od tysiąca zim i słuchasz kroków nad głową. Kroki są smaczne. Głosy są smaczne. Ktoś kiedyś cię nazwał. Pierwszy człowiek, który cię zobaczył, krzyknął, a ten krzyk stał się twoim imieniem.`,
    `<b>Żyr.</b>`,
    `Budzisz się z tym słowem w ustach. Smakuje jak krew. Słońce przesunęło się po niebie. Spałeś długo.`),
  first: () => { learn('imie'); znamie(12); rozum(-15); },
  ch: [{ t: 'Wstań', go: 'krag' }],
},

krag_krew: {
  loc: 'krag', sc: 'krag',
  text: P(
    `Przeciągasz ostrzem po dłoni i przyciskasz ją do głazu. Krew spływa w czarne rowki i znika w nich, jakby kamień ją wypił.`,
    `Oddech pod ziemią przyspiesza. Czujesz, jak coś wlewa się w twoje mięśnie: ciepłe, ciężkie, silne. Ręce przestają ci drżeć. Pierwszy raz od wielu dni nie jesteś zmęczony.`,
    `~Dobrze. Teraz jesteśmy krewnymi.~`),
  first: () => { hp(-5); znamie(12); S.mods.sil = (S.mods.sil || 0) + 1; toastFx('+1 Siła (na stałe)'); },
  ch: [{ t: 'Dalej', go: 'krag' }],
},

/* ============================== OBÓZ ============================== */

oboz: {
  loc: 'oboz', sc: 'oboz', hub: true,
  text: () => S.seen.oboz ? P(
    `Obóz kopaczy: rozdarte namioty, przechylony wóz, wygasłe ognisko. Stary dąb z czarną dziuplą.`,
    F('wiszka_czeka') && `Z dziupli patrzy na ciebie para przestraszonych oczu. Wiszka czeka, jak jej kazałeś.`,
    F('wiszka_zabita') && `Na mchu pod dębem leży czerwona wstążka. Nie podnosisz jej.`
  ) : P(
    `Obóz kopaczy stał na polanie pod starym, wypróchniałym dębem. Albo raczej stał: dwa namioty z natłuszczonej skóry leżą rozdarte, ognisko wygasło dawno temu i nikt go już nie rozpali. Wóz stoi przechylony, z jednym kołem w błocie. Na wozie skrzynia, przykryta płachtą. Wokół poniewierają się łopaty, kilofy, worki.`,
    `Nie ma ciał. Nie ma krwi. Jest tylko cisza i dziwny zapach, słodki jak przejrzałe owoce.`,
    `W dębie, na wysokości twojej piersi, czernieje wielka dziupla.`),
  ch: [
    { t: 'Przeszukaj namioty', if: () => !F('namioty'), go: 'oboz_namioty', do: () => setF('namioty') },
    { t: 'Zajrzyj pod płachtę na wozie', if: () => !F('skrzynia'), go: 'oboz_skrzynia' },
    { t: 'Zajrzyj do dziupli', if: () => !F('wiszka_done') && (F('wie_dziupla') || F('slady_wiszki')), go: () => S.rozum < 30 ? 'wiszka_mgla' : 'wiszka_jest' },
    { t: 'Zajrzyj do dziupli', if: () => !F('wiszka_done') && !F('wie_dziupla') && !F('slady_wiszki') && !F('dziupla_proba'), do: () => setF('dziupla_proba'),
      test: { s: 'czu', dc: 9, ok: () => S.rozum < 30 ? 'wiszka_mgla' : 'wiszka_jest', no: 'oboz_dziupla_nic' } },
    { t: 'Zabierz Wiszkę do domu', if: () => F('wiszka_czeka'), go: 'wiszka_odprowadz' },
    { t: 'Rozpal ogień i prześpij się do świtu', go: 'oboz_sen' },
  ],
},

oboz_dziupla_nic: {
  loc: 'oboz', sc: 'oboz',
  text: () => P(
    `W dziupli jest tylko próchno i ciemność. I zapach – mleka, potu, strachu. Ktoś tu był niedawno, a może wciąż jest, wciśnięty gdzieś głębiej, gdzie nie sięgasz wzrokiem.`,
    `Coś ci umyka. Gdybyś wiedział, czego szukać…`),
  ch: [{ t: 'Dalej', go: 'oboz' }],
},

oboz_namioty: {
  loc: 'oboz', sc: 'oboz',
  text: () => P(
    `W namiotach jest wszystko, co zostawia się w pośpiechu: koce, buty, misy z resztkami kaszy pokrytej pleśnią. Znajdujesz zwój konopnej liny, dwie pochodnie, paski suszonego mięsa.`,
    `I kij. Leszczynowy, długi na łokieć, pokryty od góry do dołu runami Północy. Wyryto je w pośpiechu, nierówno, głęboko.`,
    S.bg === 'wareg' ? `Czytasz je bez trudu. To mowa twojego ojca.\n\n„Hrodgar ryje dla tego, kto przyjdzie. Ziemia tu oddycha. Bjorn wszedł do kopca wojownika i nie wyszedł, wyszedł tylko jego śmiech. Dziewczynka ze wsi przyszła za nami i schowała się w dziupli, nie gońcie jej, tylko ona jest tu czysta. Chłopak ze wsi uciekł przez bagno. Ja schodzę do wielkiego. Srebro jest tam. Albo on. Jeśli nie wrócę, spalcie obóz.”` :
      `Nie umiesz czytać run. Ktoś w Mszańcu może umieć.`),
  first: () => { give('lina'); give('pochodnia', 2); give('mieso', 2); give('kij'); if (S.bg === 'wareg') { learn('runy'); setF('wie_dziupla'); } },
  ch: [{ t: 'Dalej', go: 'oboz' }],
},

oboz_skrzynia: {
  loc: 'oboz', sc: 'oboz',
  text: P(
    `Pod płachtą jest skrzynia, a w skrzyni srebro. Dużo srebra. Arabskie dirhamy, siekane bransolety, frankijskie denary, sprzączki, pierścienie. Srebro umarłych. Hrodgar musiał wynieść to z kopca wojownika, zanim… zanim cokolwiek.`,
    `Kiedy na nie patrzysz, wydaje ci się, że monety lekko parują w chłodzie, jak coś żywego.`),
  ch: [
    { t: 'Weź srebro', go: 'oboz', do: () => { setF('skrzynia'); setF('srebro_umarlych'); srebro(40); znamie(10); } },
    { t: 'Zostaw je. To nie twoje.', go: 'oboz', do: () => { setF('skrzynia'); rozum(3); } },
  ],
},

oboz_sen: {
  loc: 'oboz', sc: 'oboz',
  on: () => {
    const R = Math.random();
    S.tmpAmbush = R < (F('kiel') ? 0.15 : 0.4);
    restUntilDawn(false);
    if (!S.tmpAmbush) { hp(6); rozum(4); }
  },
  text: () => S.tmpAmbush ? P(
    `Rozpalasz ogień z resztek drewna kopaczy i zasypiasz przy nim, z bronią pod ręką.`,
    `Budzi cię cisza. Ogień zgasł. Wokół polany, w mgle, stoją cienie i patrzą. Ktoś oddycha ci prosto w kark.`
  ) : P(
    `Rozpalasz ogień z resztek drewna kopaczy i zasypiasz przy nim, z bronią pod ręką.`,
    `Śpisz źle, ale śpisz. Dwa razy budzisz się, bo coś chodzi wokół polany, i dwa razy to coś odchodzi. O świcie ogień jeszcze się żarzy.`),
  ch: [
    { t: 'Walcz', if: () => S.tmpAmbush, fight: { e: () => S.rozum < 50 ? 'zjawa' : 'wilk', win: 'oboz', flee: 'oboz', dispel: 'oboz' } },
    { t: 'Wstań', if: () => !S.tmpAmbush, go: 'oboz' },
  ],
},

/* ----------------------------- Wiszka ----------------------------- */

wiszka_jest: {
  loc: 'oboz', sc: 'oboz', fig: 'dziecko',
  text: P(
    `W dziupli, zwinięta w kłębek jak zwierzątko, siedzi dziewczynka. Rude włosy, piegi, we włosach jedna czerwona wstążka. Jest brudna, chuda i trzęsie się, ale żyje.`,
    `Kiedy cię widzi, krzyczy. Potem zakrywa sobie usta obiema dłońmi, jakby krzyk był czymś, za co ją ukarzą.`,
    `– Nie jesteś nim – szepcze przez palce. – Nie jesteś nim? On ma takie same oczy jak ty.`),
  ch: [
    { t: 'Pokaż jej drugą wstążkę, tę z gaju', if: () => has('wstazka'), go: 'wiszka_ufa' },
    { t: '– Twoja mama czeka. Mira. Plecie dla ciebie wstążkę.', if: () => F('obietnica'), go: 'wiszka_ufa' },
    { t: 'Uspokój ją łagodnie', test: { s: 'wol', dc: 9, ok: 'wiszka_ufa', no: 'wiszka_strach' } },
  ],
},

wiszka_strach: {
  loc: 'oboz', sc: 'oboz', fig: 'dziecko',
  text: `Wiszka cofa się w głąb dziupli, dalej, niż powinno być miejsce, i zatyka uszy. Kręci głową. Nie wyjdzie, przynajmniej nie teraz i nie do ciebie. Może później. Może kiedy będziesz miał coś, co pozna.`,
  ch: [{ t: 'Zostaw ją na razie', go: 'oboz' }],
},

wiszka_ufa: {
  loc: 'oboz', sc: 'oboz', fig: 'dziecko',
  text: P(
    `Wiszka patrzy na ciebie długo. Potem wysuwa się z dziupli, ostrożnie, i chwyta cię za rękaw. Mocno. Nie puszcza.`,
    `Mówi szybko, cicho, połykając słowa. Że Hrodgar był dobry, dał jej placka, ale potem zaczął mówić dwoma głosami. Że ziemia w nocy oddycha. Że ona śpiewa, kiedy się boi, bo piosenka pomaga.`,
    `Śpiewa ci ją. Całą.`,
    `<i>Śpi wojak z żelazem, śpi matka przy kądzieli,<br>śpi dzieciątko z grzechotką, by tamten nie wstał z pościeli.<br>Wojakowi się pokłoń, nie bierz mu miecza siłą,<br>matce odpowiedz mądrze, co było, co się śniło.<br>Dzieciątku daj coś w zamian, za darmo nic nie bierz,<br>a imię powiedz w sercu, gdzie ciemność jak zwierz.<br>A kto pęta zawiąże, ten zostanie przy kopcu –<br>lulaj, lulaj, dziecino, śpij spokojnie przy ojcu.</i>`),
  first: () => { learn('piesn2'); rozum(10); },
  ch: [
    { t: 'Odprowadź ją do Mszańca, od razu', go: 'wiszka_odprowadz' },
    { t: '– Schowaj się z powrotem i czekaj. Wrócę po ciebie.', go: 'oboz', do: () => { setF('wiszka_czeka'); setF('wiszka_done'); } },
  ],
},

wiszka_odprowadz: {
  loc: 'oboz', sc: 'puszcza', fig: 'dziecko', title: 'Droga do Mszańca',
  on: () => { tick(2); },
  text: `Prowadzisz ją przez puszczę za rękę. Wiszka nie płacze. Śpiewa cicho, w kółko, piosenkę o trzech, a mgła – chyba ci się wydaje – rozstępuje się przed nią odrobinę szerzej niż przed tobą. Droga zajmuje wiele godzin.`,
  ch: [{ t: 'Do Mszańca', go: 'mira_powrot', do: () => { setF('wiszka_done'); unF('wiszka_czeka'); setF('wiszka_z_toba'); S.loc = 'mszaniec'; } }],
},

wiszka_mgla: {
  loc: 'oboz', sc: 'oboz', fig: 'mgielnica',
  text: P(
    `W dziupli coś jest. Coś małego, zwiniętego, z długimi, cienkimi kończynami, za długimi, i z włosami, które poruszają się, choć nie ma wiatru, rudymi jak rdza, jak sok na pniu w gaju. Odwraca do ciebie twarz, a ta twarz jest gładka. Bez oczu. Tylko usta.`,
    `Usta się otwierają. Wydobywa się z nich wysoki, cienki skrzek. Albo krzyk.`,
    `~Zabij to, zanim to zje ciebie. Szybko. Szybko.~`),
  ch: [
    { t: 'Zabij to', fight: { e: 'mgielnica', win: 'wiszka_zabita', flee: 'oboz', dispel: 'wiszka_jest' } },
    { t: 'Przejrzyj przez mgłę. To nie może być prawda.', test: { s: 'wol', dc: 10, ok: 'wiszka_przejrzane', no: 'wiszka_mgla_2' } },
    { t: 'Odejdź. Zostaw to w spokoju.', go: 'oboz' },
  ],
},

wiszka_mgla_2: {
  loc: 'oboz', sc: 'oboz', fig: 'mgielnica',
  text: `Zaciskasz powieki i otwierasz je znowu. Stworzenie wciąż tam jest. Jeszcze bliżej. Skrzeczy coś, co brzmi prawie jak słowa, prawie jak „mamo”, ale przecież stwory nie mówią „mamo”.\n\n~Szybko.~`,
  first: () => rozum(-5),
  ch: [
    { t: 'Zabij to', fight: { e: 'mgielnica', win: 'wiszka_zabita', flee: 'oboz', dispel: 'wiszka_jest' } },
    { t: 'Odejdź', go: 'oboz' },
  ],
},

wiszka_przejrzane: {
  loc: 'oboz', sc: 'oboz', fig: 'dziecko',
  text: `Mgła w twojej głowie rozdziera się jak stare płótno. W dziupli siedzi dziewczynka. Ruda, piegowata, przerażona, z dłońmi na ustach. Patrzyła na ciebie przez cały czas.\n\nRobi ci się słabo, kiedy pomyślisz, co mogłeś zrobić.`,
  first: () => rozum(6),
  ch: [{ t: 'Dalej', go: 'wiszka_jest' }],
},

wiszka_zabita: {
  loc: 'oboz', sc: 'oboz',
  text: P(
    `Kiedy mgła opada, na mchu pod dębem nie ma żadnego potwora. Jest tylko czerwona wełniana wstążka, kilka rudych włosów i cisza, bardzo głęboka.`,
    `Mówisz sobie, że to była Mgielnica. Że wróg. Że w tej puszczy nic nie jest tym, czym się wydaje. Mówisz to sobie wiele razy.`,
    `~Dobrze. Bardzo dobrze. Smakowało?~`),
  first: () => { setF('wiszka_zabita'); setF('wiszka_done'); rozum(-22); znamie(18); },
  ch: [{ t: 'Odejdź spod dębu', go: 'oboz' }],
},

/* ============================== POLE KURHANÓW ============================== */

kurhany: {
  loc: 'kurhany', sc: 'kurhany', hub: true,
  text: () => S.seen.kurhany ? P(
    `Pole kurhanów. Trzy kopce w rzędzie, a za nimi wielki, z ciemnym wykopem w boku, z którego bucha ciepła para.`,
    petaCount() > 0 && `Masz ${petaCount()} z trzech pęt.`,
    !lit() && !has('pochodnia') && `Nie masz światła. W kurhanach będzie ciemno jak w grobie. Bo to są groby.`
  ) : P(
    `Pole kurhanów otwiera się nagle, gdy wychodzisz spomiędzy drzew: szeroka, łysa przestrzeń porośnięta tylko siwą trawą. Trzy kopce stoją w rzędzie. Wschodni, najwyższy z trzech, jest rozkopany od boku. Zachodni, nietknięty, zamyka u podstawy wielki kamień. Środkowy jest maleńki, nie większy od stogu siana.`,
    `A za nimi, tam, gdzie mgła jest najgęstsza, wznosi się czwarty. Wielki. Jak wzgórze. Jak grzbiet czegoś, co śpi pod ziemią z głową na łapach. W jego boku czernieje świeży wykop.`,
    `Z wykopu bucha para. Ciepła. Regularnie, w rytmie wolnego oddechu.`),
  first: () => rozum(-4),
  ch: [
    { t: 'Kurhan wschodni, wojownika (rozkopany)', if: () => !has('zelazo') && !F('zelazo_oddane'), go: 'kw1' },
    { t: 'Kurhan zachodni, zamknięty kamieniem', if: () => !has('nic'), go: () => F('km_open') ? 'km1' : 'km0' },
    { t: 'Kurhan środkowy, maleńki', if: () => !has('grzechotka'), go: 'kd1' },
    { t: 'Wielki Kurhan: wykop w jego boku', go: 'wk_wrota' },
  ],
},

/* ----------------------------- wojownik ----------------------------- */

kw1: {
  loc: 'kurhany', sc: 'kurhan', variant: 'kw1', dark: true, title: 'Kurhan wojownika',
  text: () => P(
    `Korytarz wykopany przez kopaczy jest niski, byle jak podparty drągami. Ziemia na ścianach jest wilgotna i ciepła jak skóra.`,
    !F('bjorn') ? `W połowie drogi ktoś leży. Wareg, sądząc po brodzie zaplecionej w warkocze. Bjorn, który wszedł pierwszy. Leży na plecach i się uśmiecha. Uśmiech sięga mu niemal do uszu. Oczu nie ma – nie są wydłubane, po prostu ich nie ma, jakby skóra zarosła mu oczodoły.` :
      `Bjorn leży tam, gdzie go zostawiłeś. Wciąż się uśmiecha.`,
    `Z głębi korytarza bije chłód grobu.`),
  ch: [
    { t: 'Przeszukaj Bjorna', if: () => !F('bjorn'), go: 'kw1', do: () => { setF('bjorn'); give('pochodnia'); srebro(6); rozum(-5); } },
    { t: 'Idź dalej, do komory', go: 'kw2' },
    { t: 'Wyjdź na zewnątrz', go: 'kurhany' },
  ],
},

kw2: {
  loc: 'kurhany', sc: 'kurhan', variant: 'kw2', dark: true, fig: 'szkielet', title: 'Komora wojownika',
  text: P(
    `Komora grobowa jest okrągła, sklepiona kamieniami. Na środku, na posłaniu z końskich czaszek, leży wojownik. Kości ma brązowe, stare jak sama puszcza, a na nich resztki kolczugi, jakiej nikt w tej części świata nie umiałby dziś wykuć. W kościstych dłoniach, na piersi, trzyma miecz. Żelazo jest czarne i nietknięte przez rdzę.`,
    `Kopacze zabrali stąd wszystko. Wszystko poza mieczem.`,
    `Kiedy podnosisz światło, cień wojownika na ścianie nie leży. Stoi.`),
  ch: [
    { t: 'Pokłoń się wojownikowi i poproś o żelazo', test: { s: 'wol', dc: () => know('piesn2') ? 7 : 9, ok: 'kw_dar', no: 'kw_upior' } },
    { t: 'Złóż mu w ofierze pięć dirhamów i pokłoń się', if: () => S.silver >= 5, do: () => srebro(-5),
      test: { s: 'wol', dc: 6, ok: 'kw_dar', no: 'kw_upior' } },
    { t: 'Weź miecz siłą', go: 'kw_upior' },
    { t: 'Wycofaj się', go: 'kurhany' },
  ],
},

kw_upior: {
  loc: 'kurhany', sc: 'kurhan', variant: 'kw2', dark: true, fig: 'wojownik',
  text: `Kości drgają. Stukają o siebie końskie czaszki. Wojownik siada, potem wstaje, z chrzęstem, z jękiem kolczugi, i w jego oczodołach zapala się zimne, błękitne światło. Miecz unosi się w kościstej dłoni.`,
  ch: [{ t: 'Walcz', fight: { e: 'upior', win: 'kw_wygrana', flee: 'kurhany' } }],
},

kw_dar: {
  loc: 'kurhany', sc: 'kurhan', variant: 'kw2', dark: true, fig: 'szkielet',
  text: P(
    `Kłaniasz się nisko, do ziemi, tak jak kłaniano się kiedyś książętom. I czekasz.`,
    `Kościste palce się rozluźniają. Nie spadają, tylko powoli się rozluźniają, jakby ktoś bardzo zmęczony puszczał coś, co trzymał zbyt długo. Cień na ścianie kiwa głową i kładzie się z powrotem.`,
    `Bierzesz żelazo. Jest ciężkie, cięższe, niż powinno.`,
    `~Weź, ale nie zgub. Trzymałem je dłużej, niż ty żyjesz.~`),
  first: () => { give('zelazo'); rozum(5); },
  ch: [{ t: 'Wyjdź z kurhanu', go: 'kurhany' }],
},

kw_wygrana: {
  loc: 'kurhany', sc: 'kurhan', variant: 'kw2', dark: true,
  text: `Upiór rozsypuje się w proch, kości grzechocą po końskich czaszkach. Żelazo leży na ziemi. Kiedy je podnosisz, jest zimne jak lód i przez chwilę słyszysz krzyk. Nie bólu, tylko gniewu. Wojownik ci go nie dał. Sam je wziąłeś.`,
  first: () => { give('zelazo'); znamie(5); },
  ch: [{ t: 'Wyjdź z kurhanu', go: 'kurhany' }],
},

/* ----------------------------- matka ----------------------------- */

km0: {
  loc: 'kurhany', sc: 'kurhany', title: 'Kurhan zachodni',
  text: P(
    `Zachodni kurhan jest zamknięty. U podstawy, tam, gdzie powinno być wejście, leży kamień, płaski, ciężki, porośnięty porostem. Kopacze go nie ruszyli. Widać wokół ślady łopat, jakby próbowali i zrezygnowali. Albo jakby coś ich zniechęciło.`,
    `Na kamieniu ktoś wyrył wrzeciono.`),
  ch: [
    { t: 'Zaśpiewaj piosenkę o trzech', if: () => know('piesn2'), go: 'km_piesn' },
    { t: 'Odsuń kamień', test: { s: 'sil', dc: 12, ok: 'km_odsuniety', no: 'km0_no' } },
    { t: 'Poszukaj innego wejścia', if: () => !F('km_szukal'), do: () => setF('km_szukal'), test: { s: 'czu', dc: 9, ok: 'km_nora', no: 'km0_nic' } },
    { t: 'Odejdź', go: 'kurhany' },
  ],
},

km0_no: {
  loc: 'kurhany', sc: 'kurhany',
  text: `Kamień ani drgnie. Napinasz się, aż coś trzaska ci w plecach. Z wnętrza kurhanu dochodzi cichy, suchy śmiech, jak szelest liści.`,
  first: () => hp(-3),
  ch: [{ t: 'Dalej', go: 'km0' }],
},

km0_nic: {
  loc: 'kurhany', sc: 'kurhany',
  text: `Obchodzisz kurhan dwa razy. Trawa, kamienie, korzenie. Nic.`,
  ch: [{ t: 'Dalej', go: 'km0' }],
},

km_piesn: {
  loc: 'kurhany', sc: 'kurhany',
  text: `Śpiewasz. Głos masz chrapliwy, nieprzywykły do śpiewu, ale słowa pamiętasz. Kiedy dochodzisz do „matka przy kądzieli”, kamień drży. Kiedy kończysz, odsuwa się sam, ciężko, ze zgrzytem, jakby ktoś po drugiej stronie pchnął go plecami.`,
  first: () => setF('km_open'),
  ch: [{ t: 'Wejdź', go: 'km1' }],
},

km_odsuniety: {
  loc: 'kurhany', sc: 'kurhany',
  text: `Kamień ustępuje z jękiem. Za nim ciemność i zapach starej wełny.`,
  first: () => setF('km_open'),
  ch: [{ t: 'Wejdź', go: 'km1' }],
},

km_nora: {
  loc: 'kurhany', sc: 'kurhany',
  text: `Od północy, pod kępą jałowca, znajdujesz lisią norę wyrytą w zboczu kurhanu. Za ciasną dla człowieka, a jednak się przeciskasz. Ziemia sypie ci się do ust, korzenie drapią po twarzy, a przez chwilę, która trwa bardzo długo, nie możesz ruszyć się ani w przód, ani w tył.`,
  first: () => { setF('km_open'); rozum(-6); },
  ch: [{ t: 'Przeciśnij się dalej', go: 'km1' }],
},

km1: {
  loc: 'kurhany', sc: 'kurhan', variant: 'km1', dark: true, title: 'Kurhan Matki',
  text: P(
    `Wewnątrz kurhanu wszystko jest w niciach.`,
    `Zwisają z sufitu, oplatają korzenie, przecinają powietrze w poprzek korytarza na wysokości gardła. Szare, cienkie, mocne jak cięciwa. Gdy je trącasz, wydają cichy dźwięk, jak struny gęśli.`),
  ch: [
    { t: 'Przeciskaj się ostrożnie między nićmi', test: { s: 'zre', dc: 9, ok: 'km2', no: 'km1_ciecie' } },
    { t: 'Przepal nici pochodnią', if: () => lit(), go: 'km2', do: () => { setF('matka_gniew'); S.light = Math.max(0, S.light - 2); } },
    { t: 'Wycofaj się', go: 'kurhany' },
  ],
},

km1_ciecie: {
  loc: 'kurhany', sc: 'kurhan', variant: 'km1', dark: true,
  text: `Nić tnie cię w policzek, druga w dłoń, trzecia przesuwa się po szyi tak lekko, że czujesz to dopiero, gdy po kołnierzu spływa ci ciepło. Przechodzisz. Krwawiąc, ale przechodzisz.`,
  first: () => hp(-4),
  ch: [{ t: 'Dalej', go: 'km2' }],
},

km2: {
  loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka', title: 'Komora Matki',
  on: () => { S.riddle = 0; },
  text: () => P(
    `W komorze siedzi kobieta. A raczej to, co z niej zostało: wyschnięta skóra na kościach, długie siwe włosy sięgające ziemi i dłonie, które się poruszają. Przędą. Wrzeciono obraca się w kościstych palcach, a nić biegnie w górę, w ciemność, gdzie łączy się z tysiącem innych.`,
    `Głowa obraca się ku tobie. Skrzypi jak stare drzwi.`,
    F('matka_gniew') ? `– Paliłeś moje nici – mówi Matka głosem jak szelest suchych liści. – Paliłeś. Niegrzeczny gość. Odpowiesz mi na trzy zagadki, a jeśli pomylisz się choć raz, zostaniesz tu ze mną na zawsze.` :
      `– Gość – mówi Matka głosem jak szelest suchych liści. – Dawno nie było gości. Tamci z łopatami nie weszli. Bali się. Ty się nie boisz? Boisz się. Dobrze. Strach to rozum.`,
    `– Chcesz nici. Wszyscy chcą nici. Trzy zagadki, gościu. Odpowiesz, dostaniesz. Nie odpowiesz, zostaniesz i będziesz przędła ze mną.`),
  ch: [
    { t: '– Pytaj, Matko.', go: 'km_z1' },
    { t: 'Wycofaj się', go: 'kurhany' },
  ],
},

km_z1: {
  loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: `– Pierwsza. Co było pierwsze w tej puszczy, zanim wyrosło pierwsze drzewo i zanim przyszedł pierwszy człowiek?`,
  ch: [
    { t: '– Drzewo.', go: 'km_z1_zle' },
    { t: '– Bogowie.', go: 'km_z1_zle' },
    { t: '– Głód.', go: 'km_z1_dobrze', do: () => S.riddle++ },
    { t: '– Woda.', go: 'km_z1_zle' },
  ],
},
km_z1_dobrze: { loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: `– Głód – powtarza Matka i kiwa głową, skrzypiąc. – Głód był pierwszy. Drzewa przyszły, żeby było co jeść. Ludzie przyszli, żeby było kogo jeść. Dobrze.`,
  ch: [{ t: 'Dalej', go: 'km_z2' }] },
km_z1_zle: { loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: `– Nie – mówi Matka. Nici wokół ciebie napinają się z brzękiem i jedna przecina ci skórę na karku. – Głód. Zawsze najpierw był głód.`,
  first: () => { hp(-3); rozum(-6); },
  ch: [{ t: 'Dalej', go: 'km_z2' }] },

km_z2: {
  loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: `– Druga. Im więcej z niej bierzesz, tym większa się robi. Co to?`,
  ch: [
    { t: '– Mgła.', go: 'km_z2_zle' },
    { t: '– Głód.', go: 'km_z2_glod' },
    { t: '– Jama.', go: 'km_z2_dobrze', do: () => S.riddle++ },
  ],
},
km_z2_dobrze: { loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: `– Jama. – Matka chichocze. – Jama, dół, grób. Tamci z łopatami brali i brali, i jama rosła. Aż urosła tak, że wyszedł z niej on.`,
  ch: [{ t: 'Dalej', go: 'km_z3' }] },
km_z2_glod: { loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: `– Nie. – Nić tnie cię w policzek. – Głód rośnie, kiedy mu dajesz, a nie kiedy od niego bierzesz. Zapamiętaj to, gościu. Na dole ci się przyda.`,
  first: () => { hp(-3); rozum(-6); },
  ch: [{ t: 'Dalej', go: 'km_z3' }] },
km_z2_zle: { loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: `– Nie. – Nici zaciskają się na twoim nadgarstku, aż drętwieją ci palce. – Jama. Dół. Grób.`,
  first: () => { hp(-3); rozum(-6); },
  ch: [{ t: 'Dalej', go: 'km_z3' }] },

km_z3: {
  loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: `– Trzecia, ostatnia. Należy do ciebie, a inni używają tego częściej niż ty. Co to?`,
  ch: [
    { t: '– Mój miecz.', go: 'km_z3_zle' },
    { t: '– Mój cień.', go: 'km_z3_zle' },
    { t: '– Moje imię.', go: 'km_z3_dobrze', do: () => S.riddle++ },
    { t: '– Moja krew.', go: 'km_z3_zle' },
  ],
},
km_z3_dobrze: { loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: `– Imię. – Wrzeciono się zatrzymuje. – Pamiętaj, gościu: kto zna imię, ten może zawołać. I ten może zamknąć.`,
  ch: [{ t: 'Dalej', go: () => S.riddle >= (F('matka_gniew') ? 3 : 2) ? 'km_dar' : 'km_porazka' }] },
km_z3_zle: { loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: `– Nie. Imię. Twoje imię. Ludzie wołają cię nim częściej niż ty sam siebie. A on woła cię nim najczęściej.`,
  first: () => { hp(-3); rozum(-6); },
  ch: [{ t: 'Dalej', go: () => S.riddle >= (F('matka_gniew') ? 3 : 2) ? 'km_dar' : 'km_porazka' }] },

km_dar: {
  loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: P(
    `Matka przestaje prząść. Odgryza nić – zębami, bo nożyc nie ma – i nawija ją na kawałek kości. Podaje ci ją. Nić jest szara, ciepła i bardzo lekka.`,
    `~Związałam nią coś większego niż ty. Zwiąż i ty.~`,
    `– Idź już, gościu. Zanim przyjdzie mi ochota cię zatrzymać.`),
  first: () => give('nic'),
  ch: [{ t: 'Wyjdź z kurhanu', go: 'kurhany' }],
},

km_porazka: {
  loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: `– Za mało – mówi Matka, a nici wokół ciebie napinają się z brzękiem, setki, tysiące, ze wszystkich stron. – Zostaniesz. Będziesz prząść.`,
  ch: [
    { t: 'Walcz z nićmi', fight: { e: 'nici', win: 'km_nici_wygrana', flee: 'kurhany' } },
    { t: 'Uciekaj', test: { s: 'zre', dc: 9, ok: 'kurhany', no: 'km_porazka_2' } },
  ],
},

km_porazka_2: {
  loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: `Nici oplatają ci nogi. Padasz.`,
  first: () => hp(-3),
  ch: [{ t: 'Walcz', fight: { e: 'nici', win: 'km_nici_wygrana', flee: 'kurhany' } }],
},

km_nici_wygrana: {
  loc: 'kurhany', sc: 'kurhan', variant: 'km2', dark: true, fig: 'matka',
  text: `Ostatnie nici opadają, przecięte, spalone, poszarpane. Matka patrzy na ciebie długo, przekrzywiając głowę.\n\n– Silny – mówi wreszcie. – Głupi, ale silny. Weź. I tak nikt inny nie przyjdzie.\n\nRzuca ci pod nogi kawałek kości z nawiniętą szarą nicią.`,
  first: () => { give('nic'); znamie(5); },
  ch: [{ t: 'Wyjdź z kurhanu', go: 'kurhany' }],
},

/* ----------------------------- dziecko ----------------------------- */

kd1: {
  loc: 'kurhany', sc: 'kurhan', variant: 'kd', dark: true, title: 'Kurhan Dziecka',
  text: P(
    `Środkowy kurhan jest tak mały, że musisz wejść na czworakach. Komora w środku nie jest większa od kołyski. Na posłaniu z mchu, który nie zgnił przez setki lat, leżą małe kości, ułożone na boku, z kolanami pod brodą. Jak śpiące dziecko.`,
    `Kości trzymają w dłoniach grzechotkę. Glinianą, w kształcie ptaszka, z kamyczkami w środku.`,
    `Na ścianach, w glinie, odciśnięte są dłonie. Małe. Dziesiątki małych dłoni. Niektóre wyglądają na świeże.`),
  ch: [
    { t: 'Zaśpiewaj kołysankę z piosenki o trzech', if: () => know('piesn2'), go: 'kd_kolysanka' },
    { t: 'Połóż w zamian wstążkę', if: () => has('wstazka'), go: 'kd_wymiana', do: () => take('wstazka') },
    { t: 'Połóż w zamian chleb', if: () => has('chleb'), go: 'kd_wymiana', do: () => take('chleb') },
    { t: 'Połóż w zamian kieł Wilczej Matki', if: () => has('kiel'), go: 'kd_wymiana', do: () => take('kiel') },
    { t: 'Połóż w zamian róg pasterski', if: () => has('rog'), go: 'kd_wymiana', do: () => take('rog') },
    { t: 'Po prostu weź grzechotkę', go: 'kd_wziete' },
    { t: 'Wycofaj się', go: 'kurhany' },
  ],
},

kd_kolysanka: {
  loc: 'kurhany', sc: 'kurhan', variant: 'kd', dark: true,
  text: P(
    `Śpiewasz cicho, tak cicho, jak tylko umiesz. <i>Lulaj, lulaj, dziecino, śpij spokojnie przy ojcu.</i>`,
    `Coś w ciemności wzdycha, długo i z ulgą, jak dziecko, które wreszcie zasnęło. Kościane palce rozluźniają się same. Bierzesz grzechotkę. Nie grzechocze.`),
  first: () => { give('grzechotka'); rozum(8); },
  ch: [{ t: 'Wyjdź z kurhanu', go: 'kurhany' }],
},

kd_wymiana: {
  loc: 'kurhany', sc: 'kurhan', variant: 'kd', dark: true,
  text: `Kładziesz dar w małych dłoniach. Przez chwilę nic się nie dzieje, a potem kości… nie, to tylko złudzenie światła… palce zaciskają się na darze i luzują chwyt na grzechotce. Bierzesz ją. Gdzieś bardzo blisko, przy samym twoim uchu, ktoś chichocze, cicho i z zadowoleniem.`,
  first: () => give('grzechotka'),
  ch: [{ t: 'Wyjdź z kurhanu', go: 'kurhany' }],
},

kd_wziete: {
  loc: 'kurhany', sc: 'kurhan', variant: 'kd', dark: true,
  text: `Wyjmujesz grzechotkę z kościanych palców. Łatwo, za łatwo. Grzechocze w twojej dłoni, choć nią nie potrząsasz. Gdzieś za tobą, w korytarzu, którego przecież nie ma, ktoś cichutko zaczyna płakać.\n\nPłacz idzie za tobą, kiedy wychodzisz.`,
  first: () => { give('grzechotka'); setF('dziecko_idzie'); rozum(-12); },
  ch: [{ t: 'Wyjdź z kurhanu', go: 'kurhany' }],
},

/* ============================== WIELKI KURHAN ============================== */

wk_wrota: {
  loc: 'kurhany', sc: 'wrota', wk: true, title: 'Wrota Wielkiego Kurhanu',
  fig: () => F('hrodgar_done') ? null : 'hrodgar',
  text: () => F('hrodgar_done') ? P(
    `Wykop w boku Wielkiego Kurhanu. Schody wycięte w ziemi prowadzą w dół, w ciemność, z której wychodzi ciepły oddech. Wdech. Wydech.`
  ) : P(
    `Wykop prowadzi w głąb Wielkiego Kurhanu stromo, schodami wyciętymi w ziemi. Kopacze pracowali tu w pośpiechu i w strachu, widać to po krzywych podporach i porzuconych narzędziach. Z dołu falami wychodzi ciepłe powietrze: wdech, wydech.`,
    `Przy wejściu ktoś stoi. Wysoki, barczysty, z toporem w dłoni i z brodą zaplecioną w dwa warkocze. Hrodgar. Stoi do ciebie plecami i patrzy w dół, w ciemność.`,
    `– Kopałem po srebro – mówi, nie odwracając się. Głos ma zdarty, jakby krzyczał przez wiele dni. – Wykopałem głód.`,
    `Odwraca się. Jego twarz jest twarzą tylko w połowie. Drugą połowę porasta coś, co wygląda jak kora, jak korzenie, jak setki maleńkich, mrugających oczu.`),
  ch: [
    { t: 'Walcz', if: () => !F('hrodgar_done'), fight: { e: 'hrodgar', win: 'wk_hrodgar_wygrana', flee: 'kurhany' } },
    { t: 'Przemów do niego w mowie Północy', if: () => !F('hrodgar_done') && S.bg === 'wareg', test: { s: 'wol', dc: 8, ok: 'wk_hrodgar_mowa', no: 'wk_hrodgar_atak' } },
    { t: 'Pokaż mu jego kij runiczny', if: () => !F('hrodgar_done') && has('kij') && S.bg !== 'wareg', test: { s: 'wol', dc: 10, ok: 'wk_hrodgar_mowa', no: 'wk_hrodgar_atak' } },
    { t: 'Prześliźnij się obok niego w ciemność', if: () => !F('hrodgar_done'), test: { s: 'zre', dc: 11, ok: 'wk_kosci', no: 'wk_hrodgar_atak', okDo: () => { setF('hrodgar_done'); setF('hrodgar_ominiety'); } } },
    { t: 'Zejdź w dół', if: () => F('hrodgar_done'), go: 'wk_kosci' },
    { t: 'Wróć na pole kurhanów', go: 'kurhany' },
  ],
},

wk_hrodgar_atak: {
  loc: 'kurhany', sc: 'wrota', wk: true, fig: 'hrodgar',
  text: `Hrodgar ryczy, a w jego ryku słychać dwa głosy: jeden ludzki, zrozpaczony, i drugi, głęboki, zadowolony. Topór unosi się nad jego głową.`,
  ch: [{ t: 'Walcz', fight: { e: 'hrodgar', win: 'wk_hrodgar_wygrana', flee: 'kurhany' } }],
},

wk_hrodgar_mowa: {
  loc: 'kurhany', sc: 'wrota', wk: true, fig: 'hrodgar',
  text: () => P(
    S.bg === 'wareg' ? `– Hrodgarze, synu Eirika – mówisz w jego języku, w języku zimnych fiordów i dymu z długich domów. – Wróć. Twoja łódź czeka.` :
      `Podnosisz kij runiczny, tak żeby widział znaki. Jego znaki. „Hrodgar ryje dla tego, kto przyjdzie.”`,
    `Coś w jego oczach – w tym jednym, ludzkim oku – drga. Topór opada. Hrodgar osuwa się na kolana, ciężko, jak ścięte drzewo.`,
    `– Brat – mówi. – Zabij mnie, bracie. Sam już nie mogę. On mi nie pozwala.`),
  ch: [{ t: 'Zrób to szybko', go: 'wk_hrodgar_laska' }],
},

wk_hrodgar_laska: {
  loc: 'kurhany', sc: 'wrota', wk: true,
  text: P(
    `Robisz to szybko. Tak, jak się to robi dla przyjaciela.`,
    `Hrodgar wzdycha z ulgą. Oczy na jego twarzy gasną jedno po drugim, aż zostaje tylko jedno, ludzkie, szare, i ono też się zamyka.`,
    `– Nie słuchaj go – szepcze na końcu – kiedy zacznie mówić twoim głosem.`,
    `Jego topór leży obok. Dobry, ciężki, frankijskiej roboty.`),
  first: () => { setF('hrodgar_done'); rozum(6); },
  ch: [
    { t: 'Weź topór Hrodgara (obrażenia 7, Siła)', if: () => S.weapon.n !== 'Topór Hrodgara', go: 'wk_wrota', do: () => equip('topor_hrodgara') },
    { t: 'Zostaw topór', go: 'wk_wrota' },
  ],
},

wk_hrodgar_wygrana: {
  loc: 'kurhany', sc: 'wrota', wk: true,
  text: P(
    `Hrodgar pada na kolana, potem na twarz. Oczy na jego policzku mrugają jeszcze przez chwilę, szybko, w panice, a potem gasną.`,
    `– Nie słuchaj go – charczy, zanim umrze – kiedy zacznie mówić twoim głosem.`,
    `Jego topór leży obok. Dobry, ciężki, frankijskiej roboty.`),
  first: () => { setF('hrodgar_done'); },
  ch: [
    { t: 'Weź topór Hrodgara (obrażenia 7, Siła)', if: () => S.weapon.n !== 'Topór Hrodgara', go: 'wk_wrota', do: () => equip('topor_hrodgara') },
    { t: 'Zostaw topór', go: 'wk_wrota' },
  ],
},

wk_kosci: {
  loc: 'kurhany', sc: 'kosci', dark: true, wk: true, title: 'Korytarz z kości',
  first: () => whisperHurt(8),
  on: () => { if (S.seen.wk_kosci) whisperHurt(3); },
  text: () => S.seen.wk_kosci ? P(
    `Korytarz z kości. Ściany oddychają. Szepty wciąż tu są, cierpliwe.`,
    `W lewo – komora, z której dobiega jęk. W dół – gardziel i czerwona poświata.`
  ) : P(
    `Korytarz za wykopem nie jest dziełem kopaczy. Jest stary. Starszy niż kurhany, starszy niż płot z czaszek. Ściany zbudowano z kości ułożonych ciasno, jedna przy drugiej, jak cegły: ludzkich, zwierzęcych i takich, których nie umiesz rozpoznać. Między kośćmi przerastają korzenie. Wszystko lekko, rytmicznie drga.`,
    `Tutaj zaczynają się szepty. Nie słowa – raczej to, co jest przed słowami. Głód, który próbuje mówić twoim językiem i jeszcze nie bardzo umie.`,
    `Korytarz się rozwidla. W lewo, gdzie korzenie gęstnieją i skąd dobiega jęk. I w dół, stromo, w gardziel, z której bije czerwonawa poświata.`),
  ch: [
    { t: 'Szukaj imienia na ścianach, nisko, przy ziemi', if: () => !know('imie'),
      test: { s: 'czu', dc: () => (F('wie_gdzie_imie') ? 7 : 10) + (lit() ? 0 : 3), ok: 'wk_imie_ok', no: 'wk_imie_no' } },
    { t: 'W lewo, ku jękom', go: 'wk_zerca' },
    { t: 'W dół, w gardziel', go: 'g1' },
    { t: 'Wróć na powierzchnię', go: 'wk_wrota' },
  ],
},

wk_imie_ok: {
  loc: 'kurhany', sc: 'kosci', dark: true, wk: true,
  text: P(
    `Znajdujesz je nisko, przy samej ziemi, wydrapane w kości czymś ostrym. Może paznokciem. Trzy znaki, które nie są runami ani żadnym pismem, jakie znasz, a jednak umiesz je odczytać, bo – i tego boisz się najbardziej – znasz je od zawsze.`,
    `Ż. Y. R.`,
    `<b>Żyr.</b>`,
    `Kiedy czytasz to imię w myślach, cały korytarz na chwilę wstrzymuje oddech.`),
  first: () => { learn('imie'); znamie(5); },
  ch: [{ t: 'Dalej', go: 'wk_kosci' }],
},

wk_imie_no: {
  loc: 'kurhany', sc: 'kosci', dark: true, wk: true,
  text: `Kości, kości, korzenie, kości. Rysy, które mogą być znakami, a mogą być śladami zębów. Im dłużej patrzysz, tym bardziej ściany patrzą na ciebie.`,
  first: () => rozum(-5),
  ch: [{ t: 'Dalej', go: 'wk_kosci' }],
},

wk_zerca: {
  loc: 'kurhany', sc: 'zerca', dark: true, wk: true, title: 'Komora żercy',
  fig: () => F('zerca_done') ? null : 'zerca',
  text: () => F('zerca_done') ? P(
    F('radogost') ? `Pusta sieć korzeni, rozdarta tam, gdzie wisiał Radogost.` : `Radogost wisi w sieci korzeni, spokojny. Już nie mówi żadnym głosem.`
  ) : P(
    `Komora po lewej jest pełna korzeni. Zwisają z sufitu, wyrastają ze ścian, splatają się w gęstą, żywą sieć. W jej środku wisi człowiek, wrośnięty w nią jak mucha w pajęczynę. Stary, w białej, ubłoconej szacie, z siwymi włosami do pasa. Korzenie wchodzą mu w ramiona, w plecy, w kark. Oczy ma zamknięte.`,
    `Żerca Radogost.`,
    `Otwiera usta. Mówi dwoma głosami naraz: jednym starczym, słabym, i drugim – głębokim, ciepłym, łagodnym, który brzmi trochę jak głos twojej matki, a trochę jak twój własny.`,
    S.rozum >= 40 ?
      `– Najemniku – mówi stary głos, przebijając się przez tamten. – Nie słuchaj… jego. Słuchaj mnie, póki mogę. Trzy pęta. Imię. Dar. Darem jest życie, które zostaje na dole. Ktoś musi zostać. Zawsze ktoś musi. Ja miałem zostać, ale on… nie chce mnie wziąć. Woli mnie trzymać, żebym mówił. Uwolnij mnie, a pójdę z tobą do serca i zostanę. Albo zabij. Tylko nie zostawiaj mnie tak.` :
      `– Najemniku – mówi ciepły głos, a stary tylko jęczy pod spodem. – Nie trzeba żadnych pęt. To bajki dla dzieci. Wystarczy, że zejdziesz na dół i uklękniesz. On jest dobry. Jest głodny, ale dobry. Zejdź. Zejdź. Zejdź.\n\n– …kłamie… – jęczy stary głos, ledwie słyszalnie. – …kłamie…`),
  first: () => { if (S.rozum >= 40) learn('rytual'); },
  ch: [
    { t: 'Odetnij go od korzeni', if: () => !F('zerca_done'), test: { s: 'sil', dc: 10, ok: 'wk_zerca_wolny', no: 'wk_zerca_ciezko' } },
    { t: 'Skróć jego męki', if: () => !F('zerca_done'), go: 'wk_zerca_smierc' },
    { t: 'Wróć do korytarza', go: 'wk_kosci' },
  ],
},

wk_zerca_ciezko: {
  loc: 'kurhany', sc: 'zerca', dark: true, wk: true, fig: 'zerca',
  text: `Korzenie są twarde jak żelazo. Tniesz, szarpiesz, a one oplatają ci nadgarstki i ciągną do siebie, jakby chciały, żebyś zawisł obok żercy. Wyrywasz się w ostatniej chwili.`,
  first: () => { hp(-4); rozum(-4); },
  ch: [
    { t: 'Spróbuj jeszcze raz', test: { s: 'sil', dc: 10, ok: 'wk_zerca_wolny', no: 'wk_zerca_ciezko2' } },
    { t: 'Skróć jego męki', go: 'wk_zerca_smierc' },
    { t: 'Wróć do korytarza', go: 'wk_kosci' },
  ],
},

wk_zerca_ciezko2: {
  loc: 'kurhany', sc: 'zerca', dark: true, wk: true, fig: 'zerca',
  text: `Korzenie znowu cię odpychają, a potem odrastają szybciej, niż je tniesz.`,
  first: () => { hp(-4); rozum(-4); },
  ch: [
    { t: 'Spróbuj jeszcze raz', test: { s: 'sil', dc: 9, ok: 'wk_zerca_wolny', no: 'wk_zerca_ciezko2' } },
    { t: 'Skróć jego męki', go: 'wk_zerca_smierc' },
    { t: 'Wróć do korytarza', go: 'wk_kosci' },
  ],
},

wk_zerca_wolny: {
  loc: 'kurhany', sc: 'zerca', dark: true, wk: true, fig: 'zerca_wolny',
  text: () => P(
    `Korzenie pękają z dźwiękiem łamanych kości. Radogost spada ci w ramiona, lekki jak dziecko. Jest ślepy – oczy, kiedy je otwiera, są białe, bez źrenic. Ale się uśmiecha.`,
    `– Dobrze – mówi. Już tylko jednym głosem. – Teraz pójdę z tobą na dół. Kiedy przyjdzie czas, będę wiedział, co zrobić.`,
    !know('imie') && `– Imię… – dodaje po chwili. – Znam je. Ale nie wymówię go tutaj. Wymówię je w sercu, kiedy pęta będą na miejscu.`),
  first: () => { setF('zerca_done'); setF('radogost'); hp(-2); rozum(6); },
  ch: [{ t: 'Wróć do korytarza', go: 'wk_kosci' }],
},

wk_zerca_smierc: {
  loc: 'kurhany', sc: 'zerca', dark: true, wk: true,
  text: () => P(
    `Robisz to szybko. Radogost wzdycha z ulgą, a ciepły głos – ten drugi – krzyczy z wściekłości tak, że sypie się ziemia z sufitu.`,
    !know('imie') ? `Ostatnim tchnieniem, już tylko swoim własnym głosem, żerca szepcze ci do ucha jedno słowo. Imię. Smakuje jak krew.\n\n<b>Żyr.</b>` : `– Dziękuję – mówi tylko.`),
  first: () => { setF('zerca_done'); setF('radogost_martwy'); rozum(-8); znamie(4); learn('imie'); },
  ch: [{ t: 'Wróć do korytarza', go: 'wk_kosci' }],
},

/* ----------------------------- gardziel: siedem kroków ----------------------------- */

g1: { loc: 'kurhany', sc: 'gardziel', depth: 1, wk: true, title: 'Gardziel · krok pierwszy',
  on: () => stepDown(),
  text: `Gardziel opada stromo. Ściany nie są już z kości, tylko z czegoś gładkiego, wilgotnego i ciepłego. Z dołu bije czerwonawa poświata. Światło pochodni nie jest ci już potrzebne, a po chwili przestaje być nawet przyjemne.\n\n~Krok.~`,
  ch: [{ t: 'Krok w dół', go: 'g2' }, { t: 'Zawróć', go: 'wk_kosci' }] },

g2: { loc: 'kurhany', sc: 'gardziel', depth: 2, wk: true, title: 'Gardziel · krok drugi',
  on: () => stepDown(),
  text: () => `Drugi krok. Ściany drżą w rytm oddechu, który jest teraz bardzo głośny. Słyszysz w nim słowa. Twoje imię.\n\n~${S.name}. ${S.name}. Wiedzieliśmy, że przyjdziesz.~`,
  ch: [{ t: 'Krok w dół', go: 'g3' }, { t: 'Zawróć', go: 'wk_kosci' }] },

g3: { loc: 'kurhany', sc: 'gardziel', depth: 3, wk: true, title: 'Gardziel · krok trzeci',
  on: () => stepDown(),
  text: () => P(
    `Trzeci krok. Mijasz ludzi. Stoją przy ścianach, w niszach, z zamkniętymi oczami: pastuch Dziwisz, kowal Ostoja, Bjorn z uśmiechem do uszu i inni, starsi, w strojach, jakich nikt nie nosi od stu lat. Oddychają razem ze ścianami.`,
    S.day >= 3 && `Jest wśród nich stara kobieta i chłopiec, trzymający ją za rękę.`,
    F('dziecko_idzie') && `Za tobą drepczą małe stopy. Nie odwracasz się.`),
  ch: [{ t: 'Krok w dół', go: 'g4' }, { t: 'Zawróć', go: 'wk_kosci', do: () => rozum(-4) }] },

g4: { loc: 'kurhany', sc: 'gardziel', depth: 4, wk: true, title: 'Gardziel · krok czwarty',
  on: () => stepDown(),
  text: () => F('wiszka_zabita') ?
    `Czwarty krok. Słyszysz śpiew. Piosenkę o trzech, cienkim dziecięcym głosem. Śpiewa ją ktoś, kogo zabiłeś. Albo kogo nie zabiłeś. Już nie pamiętasz, co widziałeś tamtego dnia pod dębem, a może nigdy nie wiedziałeś.` :
    `Czwarty krok. Przypominasz sobie dom. Nie ten, który miałeś, tylko ten, którego nigdy nie miałeś: ciepły, pełny, z wielkim stołem i miskami parującej kaszy. Ktoś woła cię na obiad. Głos twojej matki. Twoja matka nie żyje od dwudziestu zim.`,
  ch: [{ t: 'Krok w dół', go: 'g5' }, { t: 'Zawróć (on idzie za tobą)', go: 'wk_kosci', do: () => rozum(-8) }] },

g5: { loc: 'kurhany', sc: 'gardziel', depth: 5, wk: true, title: 'Gardziel · krok piąty',
  on: () => stepDown(),
  text: `Piąty krok. Nie wiesz już, czy idziesz w dół, czy to on idzie w górę, do ciebie. Rana na przedramieniu otwiera się – bez bólu – i patrzy. Ma źrenicę.`,
  ch: [{ t: 'Krok w dół', go: 'g6' }, { t: 'Zawróć (on idzie za tobą)', go: 'wk_kosci', do: () => rozum(-10) }] },

g6: { loc: 'kurhany', sc: 'gardziel', depth: 6, wk: true, title: 'Gardziel · krok szósty',
  on: () => stepDown(),
  text: () => P(
    `Szósty krok.`,
    `~Jesteś głodny. Zawsze byłeś. Pamiętasz, jak zabiłeś pierwszego człowieka? Byłeś wtedy taki… pełny.~`,
    `Nie pamiętasz. A może pamiętasz.`,
    F('radogost') && `Radogost ściska twoje ramię kościstymi palcami. – Nie słuchaj – szepcze. – Licz kroki. Jeszcze jeden.`),
  ch: [{ t: 'Krok w dół', go: 'g7' }, { t: 'Zawróć (on idzie za tobą)', go: 'wk_kosci', do: () => rozum(-12) }] },

g7: { loc: 'kurhany', sc: 'gardziel', depth: 7, wk: true, title: 'Gardziel · krok siódmy',
  on: () => stepDown(),
  text: `Siódmy krok. Gardziel się kończy. Przed tobą otwiera się przestrzeń, której nie powinno tu być.`,
  ch: [{ t: 'Wejdź do serca', go: 'serce' }] },

/* ----------------------------- serce ----------------------------- */

serce: {
  loc: 'kurhany', sc: 'serce', fig: 'pasterz', wk: true, title: 'Serce Wielkiego Kurhanu',
  text: () => S.seen.serce ? P(
    `Pasterz czeka. Setki oczu w porożu mrugają cierpliwie. Mgła oddycha.`,
    `~No?~`
  ) : P(
    `Serce Wielkiego Kurhanu jest ogromne. Większe niż cały kopiec na górze, większe niż Mszaniec, większe, niż powinno być cokolwiek pod ziemią. Sklepienie ginie w ciemności, a ściany, jeśli w ogóle są tu jakieś ściany, oddychają.`,
    `Pośrodku stoi Pasterz.`,
    `Nie ma kształtu, a jednak go widzisz: wysoka, chuda postać z mgły, z porożem rozgałęzionym jak korona martwego dębu. W porożu, na każdej gałęzi, mrugają oczy. Setki oczu. Niektóre znasz: szare oczy pastucha, niebieskie oczy Bjorna, jedno ludzkie oko Hrodgara.`,
    `U jego stóp, w ziemi, widzisz trzy wyrwy, trzy puste gniazda, z których zwisają zerwane sznury. Tam były pęta.`,
    `~Witaj w domu.~`,
    `Głos jest wszędzie. Jest w tobie.`,
    `~Mogę ci dać to, czego zawsze chciałeś. Już nigdy nie będziesz głodny. Bo to ty będziesz głodem.~`,
    F('radogost') && `Radogost stoi obok ciebie, ślepy, wsparty na twoim ramieniu. – Już blisko – mówi.`),
  ch: [
    { t: 'Połóż trzy pęta w gniazdach', if: () => petaCount() === 3, go: 'serce_peta' },
    { t: () => `Połóż pęta, które masz (${petaCount()} z 3)`, if: () => petaCount() > 0 && petaCount() < 3 && !F('serce_brak'), go: 'serce_brak', do: () => setF('serce_brak') },
    { t: 'Walcz z nim', fight: { e: 'zyr', win: '@zak_bogobojca', flee: 'serce_ucieczka' } },
    { t: 'Uklęknij', end: 'zak_pasterz' },
    { t: '– To nie jest prawdziwe. To wywar. To gorączka.', if: () => F('lulek_pity') && !F('serce_nie'), do: () => setF('serce_nie'),
      test: { s: 'wol', dc: 11, ok: '@zak_goraczka', no: 'serce_nie' } },
    { t: 'Uciekaj!', go: 'serce_ucieczka' },
  ],
},

serce_nie: {
  loc: 'kurhany', sc: 'serce', fig: 'pasterz', wk: true,
  text: `– To nie jest prawdziwe – mówisz.\n\n~Nie?~ – pyta Pasterz, i dotyka cię. Tylko trochę. Ból jest bardzo prawdziwy. Krew z nosa jest bardzo prawdziwa. Twój krzyk odbija się od ścian, których nie ma, bardzo, bardzo prawdziwie.`,
  first: () => { rozum(-20); hp(-4); },
  ch: [{ t: 'Dalej', go: 'serce' }],
},

serce_brak: {
  loc: 'kurhany', sc: 'serce', fig: 'pasterz', wk: true,
  text: `Kładziesz w gniazdach to, co masz. Zerwane sznury drgają, unoszą się, chwytają pęta… i opadają. Za mało. Sznur bez wszystkich trzech węzłów to tylko sznur.\n\nPasterz śmieje się twoim głosem, długo, serdecznie.\n\n~Wróć, kiedy będziesz miał wszystko. Poczekam. Ja zawsze czekam.~`,
  first: () => { rozum(-12); },
  ch: [{ t: 'Dalej', go: 'serce' }],
},

serce_ucieczka: {
  loc: 'kurhany', sc: 'gardziel', depth: 4, wk: true, title: 'Gardziel',
  text: `Uciekasz. Gardziel ciągnie się w górę dłużej, niż szła w dół, a za tobą coś się śmieje i nie spieszy.\n\n~Wrócisz. Wszyscy wracają.~`,
  first: () => rozum(-12),
  on: () => { if (S.seen.serce_ucieczka) rozum(-8); },
  ch: [{ t: 'Do korytarza z kości', go: 'wk_kosci' }],
},

serce_peta: {
  loc: 'kurhany', sc: 'serce', fig: 'pasterz', wk: true,
  text: P(
    `Kładziesz żelazo w pierwszym gnieździe, nić w drugim, grzechotkę w trzecim.`,
    `Zerwane sznury podrywają się jak węże i oplatają je, zaciskają się, napinają. Pasterz drga. Setki oczu mrużą się jednocześnie.`,
    `~To nic. Bez imienia to nic.~`),
  first: () => { take('zelazo'); take('nic'); take('grzechotka'); setF('peta_polozone'); },
  ch: [
    { t: '– Żyr – powiedz jego imię', if: () => know('imie'), go: 'serce_imie' },
    { t: 'Niech Radogost wypowie imię', if: () => F('radogost') && !know('imie'), go: 'serce_imie_radogost' },
    { t: 'Krzycz cokolwiek, jakiekolwiek imię', if: () => !know('imie') && !F('radogost'), go: 'serce_bez_imienia' },
  ],
},

serce_bez_imienia: {
  loc: 'kurhany', sc: 'serce', fig: 'pasterz', wk: true,
  text: `Krzyczysz imiona bogów, które znasz. Peruna. Welesa. Swarożyca. Chrystusa. Twojej matki. Swoje.\n\nŻadne nie jest tym właściwym. Sznury opadają. Pasterz przeciąga się, leniwie, jak kot.\n\n~Blisko. Bardzo blisko. Ale nie.~`,
  first: () => { rozum(-20); },
  ch: [
    { t: 'Walcz z nim', fight: { e: 'zyr', win: '@zak_bogobojca', flee: 'serce_ucieczka' } },
    { t: 'Uklęknij', end: 'zak_pasterz' },
    { t: 'Uciekaj!', go: 'serce_ucieczka' },
  ],
},

serce_imie_radogost: {
  loc: 'kurhany', sc: 'serce', fig: 'pasterz', wk: true,
  text: `Radogost prostuje się. Pierwszy raz od dawna stoi bez twojej pomocy. Unosi ślepą twarz ku porożu i mówi – cicho, wyraźnie, tak jak mówi się imię kogoś, kogo zna się bardzo długo:\n\n– <b>Żyr.</b>`,
  first: () => learn('imie'),
  ch: [{ t: 'Dalej', go: 'serce_imie' }],
},

serce_imie: {
  loc: 'kurhany', sc: 'serce', fig: 'pasterz', wk: true,
  text: P(
    `Imię uderza w serce kurhanu jak kamień w taflę wody. Całe wnętrze krzyczy.`,
    `Sznury napinają się. Pasterz kurczy się, maleje, wciągany w głąb ziemi, wyje setką gardeł. Ale nie znika. Jeszcze nie. Trzy pęta trzymają, ale między nimi zostało puste miejsce. Czwarte.`,
    `~Ktoś musi zostać~ – mówi Pasterz twoim głosem, i ma rację, i to jest najgorsze.`),
  first: () => znamie(-15),
  ch: [
    { t: 'Radogost zostaje', if: () => F('radogost'), end: 'zak_peta' },
    { t: 'Ty zostajesz', end: 'zak_czwarte' },
    { t: 'Nikt nie zostaje. Uciekaj, póki trzyma.', end: 'zak_niedomkniete' },
  ],
},

/* ============================== ZDARZENIA W DRODZE ============================== */

ev_wilki: {
  sc: 'puszcza', fig: 'wilk', title: 'W drodze',
  text: `Z mgły wychodzą dwa wilki. Chude, szare, z jasnymi oczami. Nie warczą. Patrzą na ciebie tak, jak patrzy się na coś, co już się zjadło, tylko jeszcze nie zaczęło.`,
  ch: [
    { t: 'Walcz', fight: { e: 'wilk', win: 'ev_wilki_po', flee: '@after' } },
    { t: 'Rzuć im suszone mięso', if: () => has('mieso'), go: '@after', do: () => take('mieso') },
    { t: 'Zadmij w róg', if: () => has('rog'), go: 'ev_wilki_rog' },
    { t: 'Uciekaj między drzewa', test: { s: 'zre', dc: 9, ok: '@after', no: 'ev_wilki_dogonily' } },
  ],
},
ev_wilki_rog: { sc: 'puszcza', title: 'W drodze',
  text: `Róg Dziwisza ryczy w mgle głosem, którego się nie spodziewałeś: niskim, starym, pasterskim. Wilki kładą uszy i odchodzą, oglądając się na ciebie, jakby przypomniały sobie, kto tu jest pasterzem.`,
  ch: [{ t: 'Idź dalej', go: '@after' }] },
ev_wilki_dogonily: { sc: 'puszcza', fig: 'wilk', title: 'W drodze',
  text: `Potykasz się o korzeń. Wilk jest już przy tobie.`,
  ch: [{ t: 'Walcz', fight: { e: 'wilk', win: 'ev_wilki_po', flee: '@after' } }] },
ev_wilki_po: { sc: 'puszcza', title: 'W drodze',
  text: `Drugi wilk patrzy na martwego towarzysza, potem na ciebie, i znika w mgle bez dźwięku.`,
  ch: [{ t: 'Idź dalej', go: '@after' }] },

ev_ogniki: {
  sc: 'mgla', title: 'W drodze',
  text: `Między drzewami zapalają się bladozielone światełka, jedno, dwa, siedem, i kołyszą się, jakby ktoś niósł latarnie. Wzywają. Wyraźnie wzywają.`,
  ch: [
    { t: 'Idź za ognikami', cost: 1, test: { s: 'czu', dc: 9, ok: 'ev_ogniki_ok', no: 'ev_ogniki_no' } },
    { t: 'Nie zbaczaj ze ścieżki', go: '@after' },
  ],
},
ev_ogniki_ok: { sc: 'mgla', title: 'W drodze',
  text: `Ogniki prowadzą cię do starego, zawalonego szałasu, a potem gasną, jakby zrobiły, co miały zrobić. W środku leży zawiniątko owinięte w korę: pochodnia i wiązka bylicy. Ktoś tu nocował przed tobą. Nie wrócił po swoje rzeczy.`,
  first: () => { give('pochodnia'); give('bylica'); },
  ch: [{ t: 'Idź dalej', go: '@after' }] },
ev_ogniki_no: { sc: 'mgla', title: 'W drodze',
  text: `Idziesz za ognikami, aż orientujesz się, że od dłuższego czasu kręcisz się w kółko wokół tej samej spróchniałej brzozy. Ogniki gasną. Ktoś chichocze. Wracasz na ścieżkę, zmęczony i zły.`,
  first: () => { rozum(-6); tick(1); },
  ch: [{ t: 'Idź dalej', go: '@after' }] },

ev_glos: {
  sc: 'mgla', title: 'W drodze',
  text: () => `Ktoś cię woła. Po imieniu – po twoim prawdziwym imieniu, nie po „${S.name}”. Głosem twojej matki. Zza drzew, z lewej, całkiem blisko.\n\n– Chodź do domu, syneczku. Kasza stygnie.`,
  ch: [
    { t: 'Idź na głos', go: 'ev_glos_idz' },
    { t: 'Zatkaj uszy i idź dalej', test: { s: 'wol', dc: 8, ok: '@after', no: 'ev_glos_slaby' } },
  ],
},
ev_glos_idz: { sc: 'mgla', title: 'W drodze',
  text: `Idziesz. Głos jest coraz bliżej, coraz cieplejszy. Za ostatnim drzewem jest polana, a na polanie krąg grzybów, a w kręgu – ślady twoich własnych butów, setki, wydeptane w kółko, jakbyś chodził tu od wielu dni.\n\nGłos milknie. Nie wiesz, jak długo tu stałeś.`,
  first: () => { rozum(-10); tick(1); },
  ch: [{ t: 'Wróć na ścieżkę', go: '@after' }] },
ev_glos_slaby: { sc: 'mgla', title: 'W drodze',
  text: `Zatykasz uszy, ale głos jest w środku. Idziesz dalej ze łzami na twarzy, których nie umiesz wytłumaczyć.`,
  first: () => rozum(-6),
  ch: [{ t: 'Idź dalej', go: '@after' }] },

ev_kruki: {
  sc: 'puszcza', fig: 'kruki', title: 'W drodze',
  text: () => P(
    `Na martwej sośnie siedzi dziewięć kruków. Patrzą na ciebie, wszystkie naraz, przekrzywiając łby. Kiedy przechodzisz, jeden z nich mówi ludzkim głosem, chrapliwie:`,
    `– ${pick(['Trzy pęta. Trzy pęta. Kto czwarty?', 'Głodny. Głodny. Głodny.', 'Nie odwracaj się, najemniku.', 'Lulaj, lulaj.'])}`,
    `Potem wszystkie odlatują naraz, bez jednego krakania.`),
  first: () => rozum(-2),
  ch: [{ t: 'Idź dalej', go: '@after' }],
},

ev_borowy: {
  sc: 'puszcza', fig: 'borowy', title: 'W drodze',
  text: `Na pniu przy ścieżce siedzi niski starzec z brodą z mchu i oczami jak krople żywicy. Wyciąga do ciebie dłoń, pomarszczoną jak kora.\n\n– Chlebka – mówi. – Głodny jestem. Nie tak jak on. Zwyczajnie.`,
  ch: [
    { t: 'Daj mu chleb', if: () => has('chleb'), go: 'ev_borowy_dar', do: () => take('chleb') },
    { t: 'Nie mam nic dla ciebie, dziadku', go: 'ev_borowy_nie' },
  ],
},
ev_borowy_dar: { sc: 'puszcza', fig: 'borowy', title: 'W drodze',
  text: `Starzec je powoli, z namaszczeniem. Potem ociera brodę i patrzy na ciebie.\n\n– Pęta są trzy, a sznur ma cztery końce – mówi. – Zapamiętaj. I chodź skrótem, ja ci drogę przytrzymam.\n\nMrugasz – nie ma go. Ścieżka przed tobą jest prostsza, niż była.`,
  first: () => { rozum(10); setF('borowy'); S.safeTravel = (S.safeTravel || 0) + 3; },
  ch: [{ t: 'Idź dalej', go: '@after' }] },
ev_borowy_nie: { sc: 'puszcza', title: 'W drodze',
  text: `Starzec wzrusza ramionami i znika. Ścieżka, którą szedłeś, nagle prowadzi gdzie indziej. Błądzisz.`,
  first: () => tick(1),
  ch: [{ t: 'Idź dalej', go: '@after' }] },

ev_dzik: {
  sc: 'puszcza', fig: 'dzik', title: 'W drodze',
  text: `Krzaki trzeszczą. Na ścieżkę wychodzi odyniec – ogromny, z oczami jak węgle, z szablami żółtymi od starości. Z pyska bucha mu para. Ryje ziemię i patrzy na ciebie.`,
  ch: [
    { t: 'Walcz', fight: { e: 'dzik', win: 'ev_dzik_po', flee: '@after' } },
    { t: 'Wdrap się na drzewo', test: { s: 'zre', dc: 9, ok: 'ev_dzik_drzewo', no: 'ev_dzik_atak' } },
    { t: 'Zadmij w róg', if: () => has('rog'), go: 'ev_wilki_rog' },
  ],
},
ev_dzik_drzewo: { sc: 'puszcza', title: 'W drodze',
  text: `Siedzisz na gałęzi, aż odyniec się znudzi. Trwa to długo. Bardzo długo.`,
  first: () => tick(1),
  ch: [{ t: 'Zejdź i idź dalej', go: '@after' }] },
ev_dzik_atak: { sc: 'puszcza', fig: 'dzik', title: 'W drodze',
  text: `Gałąź łamie się pod tobą. Odyniec już szarżuje.`,
  ch: [{ t: 'Walcz', fight: { e: 'dzik', win: 'ev_dzik_po', flee: '@after' } }] },
ev_dzik_po: { sc: 'puszcza', title: 'W drodze',
  text: `Odyniec pada. Odcinasz pas mięsa – świeże, ciemne, pachnie żelazem.`,
  first: () => give('mieso', 2),
  ch: [{ t: 'Idź dalej', go: '@after' }] },

ev_trup: {
  sc: 'puszcza', fig: 'trup', title: 'W drodze',
  text: `Pod sosną siedzi martwy Wareg. Jeden z kopaczy. Plecami do pnia, z rękami na kolanach, jakby przysiadł odpocząć. Twarz ma spokojną. Usta pełne ziemi.`,
  ch: [
    { t: 'Przeszukaj go', go: 'ev_trup_lup', do: () => { give('pochodnia'); srebro(4); rozum(-3); } },
    { t: 'Zostaw go w spokoju', go: '@after' },
  ],
},
ev_trup_lup: { sc: 'puszcza', fig: 'trup', title: 'W drodze',
  text: `Pochodnia, kilka monet. Kiedy wstajesz, wydaje ci się, że trup przełknął ślinę.`,
  ch: [{ t: 'Idź dalej', go: '@after' }] },

ev_zjawa: {
  sc: 'mgla', fig: 'zjawa', title: 'W drodze',
  text: `Między drzewami ktoś stoi. Wysoki, w płaszczu, z bronią u pasa. Odwraca głowę w twoją stronę.\n\nTo ty.\n\nUśmiecha się do ciebie twoimi ustami, tylko szerzej.`,
  ch: [
    { t: 'Walcz z nim', fight: { e: 'zjawa', win: 'ev_zjawa_po', flee: '@after', dispel: 'ev_zjawa_dispel' } },
    { t: 'Przejrzyj przez mgłę', test: { s: 'wol', dc: 9, ok: 'ev_zjawa_dispel', no: 'ev_zjawa_dotyk' } },
  ],
},
ev_zjawa_po: { sc: 'mgla', title: 'W drodze',
  text: `Twój cień rozwiewa się pod ciosem jak dym. Nie było go. Nigdy go nie było. A jednak na twoim ostrzu jest krew. Twoja.`,
  first: () => { rozum(-5); hp(-2); },
  ch: [{ t: 'Idź dalej', go: '@after' }] },
ev_zjawa_dispel: { sc: 'mgla', title: 'W drodze',
  text: `Mrugasz. Między drzewami stoi tylko spróchniały pień, z grubsza kształtem przypominający człowieka. Nikogo nie ma. Śmiejesz się, trochę za głośno.`,
  first: () => rozum(4),
  ch: [{ t: 'Idź dalej', go: '@after' }] },
ev_zjawa_dotyk: { sc: 'mgla', fig: 'zjawa', title: 'W drodze',
  text: `Nie możesz oderwać od niego wzroku. Podchodzi i dotyka twojego czoła palcem, a ty przypominasz sobie wszystko, co kiedykolwiek zrobiłeś złego. Wszystko naraz.`,
  first: () => rozum(-10),
  ch: [{ t: 'Idź dalej', go: '@after' }] },

ev_placz: {
  sc: 'mgla', fig: 'dziecko_cien', title: 'W drodze',
  text: `Za tobą płacze dziecko. Cicho, uparcie, krok w krok. Grzechotka w twoim tobołku grzechocze do wtóru.`,
  ch: [
    { t: 'Odwróć się', go: 'ev_placz_odwroc' },
    { t: 'Nie odwracaj się. Idź dalej.', go: '@after', do: () => rozum(-4) },
  ],
},
ev_placz_odwroc: { sc: 'mgla', title: 'W drodze',
  text: `Odwracasz się. Nikogo. Tylko na mokrej ziemi, tuż za twoimi śladami, odciśnięte są małe, bose stopy.\n\nPłacz cichnie. Na chwilę.`,
  first: () => rozum(-8),
  ch: [{ t: 'Idź dalej', go: '@after' }] },

ev_mgla: {
  sc: 'mgla', title: 'W drodze',
  text: `Mgła gęstnieje tak, że nie widzisz własnych dłoni. Ścieżka znika. Drzewa znikają. Zostajesz tylko ty, twój oddech i coś, co oddycha razem z tobą, trochę za plecami, trochę z lewej.`,
  first: () => { rozum(-3); tick(1); },
  ch: [{ t: 'Idź po omacku', go: '@after' }],
},

};

/* Pula zdarzeń w drodze: waga, warunek */
const EVENTS = [
  { id: 'ev_wilki', w: 3, if: () => !F('kiel') && !F('wilczyca_martwa') && S.znamie < 50 },
  { id: 'ev_ogniki', w: 2, if: () => night() || S.rozum < 70 },
  { id: 'ev_glos', w: 2, if: () => S.rozum < 85 },
  { id: 'ev_kruki', w: 2, if: () => !night() },
  { id: 'ev_borowy', w: 2, if: () => !F('borowy') && has('chleb') },
  { id: 'ev_dzik', w: 2, if: () => true },
  { id: 'ev_trup', w: 2, if: () => true },
  { id: 'ev_zjawa', w: 3, if: () => S.rozum < 50 },
  { id: 'ev_placz', w: 4, if: () => F('dziecko_idzie') },
  { id: 'ev_mgla', w: 2, if: () => true },
];

/* =====================================================================
   Teksty zakończeń (funkcje, bo zależą od przebiegu gry)
   ===================================================================== */
const ENDING_TEXT = {
  zak_peta: () => P(
    `Radogost puszcza twoje ramię.`,
    `– Idź – mówi. – Na górze świta. Słyszę, jak budzą się ptaki.`,
    `Wchodzi w ciemność bez wahania, z uśmiechem, jak ktoś, kto wraca do domu po bardzo długiej drodze. Korzenie przyjmują go łagodnie, jak ręce. Czwarty sznur napina się i trzyma. Pasterz krzyczy wszystkimi oczami naraz, a potem oczy gasną, jedno po drugim, aż zostaje tylko ciemność. Zwyczajna. Ziemna. Cicha.`,
    `Wychodzisz z kurhanu o świcie. Mgła się podnosi. Pierwszy raz od tylu dni widzisz nad puszczą niebo – blade, jesienne, piękne.`,
    villageEpilogue(),
    `Odchodzisz na wschód. Rana na przedramieniu zasklepia się w ciągu tygodnia i zostaje po niej tylko jasna blizna.`,
    S.znamie >= 50 ? `Czasem, w mgliste poranki, budzisz się głodny. Bardzo głodny. I wtedy blizna mruga.` : `Czasem, w mgliste poranki, blizna mruga.`),

  zak_czwarte: () => P(
    `– Ja – mówisz.`,
    `To najłatwiejsze słowo, jakie kiedykolwiek wypowiedziałeś.`,
    F('radogost') && `Radogost łapie cię za rękę, ślepy, przerażony, ale ty już się kładziesz.`,
    `Ziemia jest ciepła. Korzenie oplatają cię delikatnie, jakbyś był czymś cennym. Czwarty sznur napina się i trzyma. Pasterz wyje – długo, coraz ciszej, coraz dalej – aż zostaje tylko oddech ziemi i twój własny, i po chwili nie umiesz już ich od siebie odróżnić.`,
    `Nie umierasz. Po prostu przestajesz się spieszyć.`,
    `Na górze mgła się podnosi. W Mszańcu przez następne sto lat matki będą śpiewać dzieciom piosenkę, w której jest o jedną zwrotkę więcej:`,
    `<i>Śpi wojak z żelazem, śpi matka przy kądzieli,<br>śpi dzieciątko z grzechotką i najemnik zza kniei,<br>co przyszedł tu po srebro, a został w ciemnej ziemi,<br>by tamten już nie wstał, nie wstał z pościeli.</i>`,
    F('wiszka_w_domu') && `Najgłośniej śpiewa ją Wiszka. Potem jej córki. Potem córki jej córek.`,
    `Nikt nie zna twojego imienia. Ty też już go nie pamiętasz. To nic. Masz czas. Masz bardzo dużo czasu.`),

  zak_niedomkniete: () => P(
    `Uciekasz.`,
    `Gardziel ciągnie się w górę bez końca, siedem kroków, siedemdziesiąt, siedemset, a za tobą Pasterz szarpie się w więzach i krzyczy twoim głosem, głosem twojej matki, głosem dziecka. Pęta trzymają. Bez czwartego sznura trzeszczą, ale trzymają.`,
    `Wychodzisz na powierzchnię. Mgła się podnosi – nie cała, nie od razu, ale się podnosi.`,
    `Dobrawa, kiedy jej o tym mówisz, długo milczy.`,
    `– Na jedno pokolenie – mówi w końcu. – Może dwa. Potem sznury się przetrą i ktoś będzie musiał zejść.`,
    `Patrzy na ciebie zdrowym okiem, a potem tym drugim, mlecznym.`,
    `– Wiesz, kto.`,
    `Wiesz. Odchodzisz z Mszańca z pełną sakiewką i przekonaniem, że jesteś wolny. Przez trzydzieści lat wierzysz w to prawie zawsze. A potem, pewnej jesieni, już jako stary człowiek, budzisz się w nocy, bo ktoś cię woła.`,
    `Z daleka. Z dołu. Twoim imieniem.`),

  zak_bogobojca: () => P(
    `Pasterz pada.`,
    `Nie tak, jak padają ludzie albo zwierzęta: rozpada się, rozwiewa, rozsypuje w mgłę, a mgła w nic. Setki oczu gasną w porożu jak iskry nad ogniskiem. Serce kurhanu przestaje oddychać.`,
    `Stoisz sam w wielkiej, pustej jamie pod ziemią i słyszysz tylko własny oddech. Ciężki. Głęboki. Głodny.`,
    `Wychodzisz na powierzchnię. Mgła się podnosi. W Mszańcu witają cię jak bohatera, Bogumił płaci, ile obiecał, i jeszcze trochę, a Dobrawa patrzy na ciebie długo i nic nie mówi. Wyjeżdżasz następnego dnia.`,
    `Dopiero w drodze zaczynasz zauważać. Psy kładą uszy, kiedy przechodzisz. Ptaki milkną. Jesz za trzech i wciąż jesteś głodny. W nocy śnią ci się ciepłe domy pełne śpiących ludzi i budzisz się z ustami pełnymi śliny.`,
    `A kiedy pochylasz się nad wodą, żeby się napić, za twoim odbiciem, w mgle, ktoś ma poroże.`,
    `Czy można zabić głód? Można mu tylko zmienić dom.`),

  zak_pasterz: () => P(
    `Klękasz.`,
    `To nie boli. Wszyscy mówili, że będzie bolało, a to nie boli wcale. Mgła wchodzi w ciebie przez usta, przez oczy, przez ranę na przedramieniu, która otwiera się szeroko jak drzwi do domu. Setki oczu w porożu mrugają z czułością.`,
    `~Dobrze. Bardzo dobrze. Teraz już nigdy nie będziesz głodny.~`,
    `I to prawda. Jesteś głodem, więc nie możesz być głodny. Jesteś mgłą, więc nie możesz zabłądzić. Jesteś wszędzie: w korzeniach, w bagnie, w Wilczym Jarze, w każdej szparze w okiennicach Mszańca.`,
    `Pierwszej nocy znika Bogumił. Drugiej – Dobrawa, która jedna wiedziała, że tak się skończy, i nawet nie zamknęła drzwi. Trzeciej…`,
    `Jesteś bardzo, bardzo szczęśliwy.`,
    `A daleko, za trzema puszczami, idzie najemnik, którego jeszcze nie znasz. Wyślesz po niego wilka.`),

  zak_goraczka: () => P(
    `– To nie jest prawdziwe – mówisz, i coś w tobie, coś bardzo upartego, w to wierzy.`,
    `Pasterz przekrzywia głowę. Setki oczu mrugają nierówno, jak u kogoś, kto nie rozumie żartu.`,
    `A potem…`,
    `…potem jest sufit z okopconych belek i zapach ziół. Bylica, piołun, lulek. Leżysz na posłaniu w chacie Dobrawy, spocony, słaby jak dziecko. Rękę masz obwiązaną płótnem.`,
    `– Trzy dni – mówi Dobrawa, nie odwracając się od ognia. – Trzy dni bredziłeś. Chłopcy znaleźli cię pod płotem z czaszek, w gorączce, z ręką spuchniętą jak kłoda. Wilk cię ugryzł, a rana się zaogniła. Lulek wyciągnął z ciebie truciznę, ale nagadałeś się przy tym… O kurhanach. O dziadach. O jakimś Pasterzu.`,
    `Śmieje się krótko.`,
    `– Nigdzie nie byłeś, najemniku. Za oknem świeci słońce. Wypijesz rosół, a za dwa dni ruszysz w drogę.`,
    `Za oknem rzeczywiście świeci słońce. Nie ma mgły.`,
    `Kiedy Dobrawa wychodzi po wodę, otwierasz zaciśniętą pięść, którą – zdajesz sobie sprawę – trzymasz zaciśniętą od chwili przebudzenia.`,
    has('grzechotka') ? `W dłoni masz glinianą grzechotkę w kształcie ptaszka. Grzechocze cicho, choć nią nie potrząsasz.` :
      has('nic') ? `Wokół palców masz owiniętą szarą, ciepłą nić.` :
      `Pod paznokciami masz ziemię. Czarną, tłustą, ciepłą ziemię z kurhanu.`),

  zak_obled: () => P(
    `Coś w tobie pęka – cicho, prawie przyjemnie, jak lód na kałuży pod butem.`,
    `Potem jest już tylko mgła. Idziesz w niej i nie wiesz, dokąd ani jak długo. Rozmawiasz z kimś, kto idzie obok i ma twój głos. Śmiejecie się razem. Czasem jesz coś, czego nie pamiętasz.`,
    `Drwale z Mszańca znajdują cię wiosną. Chodzisz w kółko wokół płotu z czaszek, boso, w podartym płaszczu, i liczysz pale. Za każdym razem wychodzi ci inna liczba. Kiedy próbują cię zabrać, gryziesz.`,
    `Dobrawa każe zostawić cię w spokoju.`,
    `– On już nie jest tutaj – mówi. – Ale nie jest też tam. Stoi na granicy. Niech stoi. Ktoś musi.`,
    `Mówisz dwoma głosami. Jeden prosi o pomoc. Drugi o jedzenie.`),

  zak_smierc: () => P(
    `Padasz.`,
    `Ziemia jest miękka i ciepła i trochę się porusza, jakby oddychała. Mgła nachyla się nad tobą jak matka nad kołyską. Ktoś nuci – cicho, fałszywie – piosenkę o trzech.`,
    `Nie boli. To najdziwniejsze: wcale nie boli.`,
    `Ostatnie, co widzisz, to poroże. Wielkie, rozgałęzione jak korona martwego dębu, a na nim setki oczu. Jedno miejsce jest puste i czeka.`,
    `Potem już nie musisz patrzeć. Patrzysz stamtąd.`),

  zak_wilk: () => P(
    `Padasz. Umierasz – czujesz to wyraźnie, tak jak czuje się zimną wodę.`,
    `A potem wstajesz.`,
    `Na czterech łapach. Świat jest szary i pachnie tysiącem rzeczy, których nigdy nie umiałeś nazwać. Lewym okiem widzisz tylko biel – mleczną, gęstą, jak mgła. Prawym widzisz wszystko.`,
    `Stado czeka na ciebie na skraju lasu. Kładzie uszy po sobie.`,
    `Jesienią, trzy noce drogi od Mszańca, spotkasz wędrowca. Najemnika z bronią i pustą sakiewką, który idzie po srebro w stronę puszczy. Wyjdziesz z mgły i podejdziesz do niego bez warczenia.`,
    `I ugryziesz go – nie mocno, nie tak, jak chwyta się zdobycz – tylko tak, jak chwyta się coś, co się chce zapamiętać.`),

  zak_mgla: () => P(
    `Trzeciej nocy mgła wchodzi do Mszańca na dobre.`,
    `Nie ma krzyku. Nie ma walki. Rano przez otwartą bramę wiatr przewiewa pustą osadę: drzwi chat uchylone, garnki na wygasłych paleniskach, w chacie Miry niedokończona czerwona wstążka. Na progach leży sól i popiół, nietknięte. Nie pomogły.`,
    `Gdziekolwiek jesteś, czujesz to. Rana na przedramieniu jest ciepła i syta.`,
    `Z puszczy dobiega dźwięk, jakby ktoś bardzo duży, gdzieś bardzo głęboko, westchnął z zadowoleniem i przewrócił się na drugi bok.`,
    `Prześpi teraz długo. Może sto lat. A kiedy się obudzi, znowu będzie głodny.`),

  zak_droga: () => P(
    `Wychodzisz przez bramę Mszańca i nie oglądasz się za siebie.`,
    `Chłopak z włócznią patrzy, jak odchodzisz, i nic nie mówi. Nikt nic nie mówi. Ludzie w Mszańcu nauczyli się już niczego nie oczekiwać.`,
    F('srebro_umarlych') ?
      `Sakiewka jest ciężka od srebra umarłych. Ciąży bardziej, niż powinna. Każdej nocy budzisz się, bo wydaje ci się, że monety szepczą – i każdej nocy jest ich trochę mniej. Nie wiesz, gdzie znikają. Wiesz tylko, że za każdym razem, gdy znika jedna, gdzieś w puszczy znika ktoś.` :
      `Masz ${S.silver} ${plural(S.silver, 'dirhama', 'dirhamy', 'dirhamów')}. Najemnik bierze srebro za robotę, a tej roboty nie skończyłeś. Mówisz sobie, że żadne srebro nie jest warte tego, co leży pod kurhanami. To prawda. Nie pomaga.`,
    `Mszaniec znika za tobą w mgle. Nigdy się nie dowiesz, co się z nim stało.`,
    `To znaczy: dowiesz się. Każdej nocy, we śnie, przez resztę życia.`),
};

function villageEpilogue() {
  const p = [];
  p.push(`W Mszańcu ludzie wychodzą z chat i patrzą w niebo, jakby nigdy go nie widzieli.`);
  if (F('wiszka_w_domu')) p.push(`Wiszka siedzi Mirze na kolanach i śpiewa piosenkę o trzech. Teraz, mówi, trzeba będzie dopisać zwrotkę o żercy.`);
  else if (F('wiszka_zabita')) p.push(`Mira wciąż plecie czerwoną wstążkę. Nie patrzysz jej w oczy. Nikt w Mszańcu nie wie, co się stało w dziupli pod dębem. Ty też nie. To znaczy – nie chcesz wiedzieć.`);
  else p.push(`Mira wciąż czeka przy progu z czerwoną wstążką. Może Wiszka jeszcze wróci, teraz, kiedy mgła odeszła. Może.`);
  if (F('sulislaw_uratowany')) p.push(`Bogumił obejmuje cię jak syna, choć swojego syna znowu ma przy sobie.`);
  p.push(`Starosta płaci ci dwadzieścia dirhamów. Liczysz je dwa razy. Wszystkie są.`);
  return p.join('\n\n');
}
