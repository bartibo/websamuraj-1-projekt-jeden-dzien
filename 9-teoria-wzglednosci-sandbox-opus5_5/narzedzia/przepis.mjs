// Kwestie przewodnika Tika i efekty dźwiękowe (ElevenLabs).
// id = nazwa pliku w audio/ i klucz w js/guide.js (tam ten sam tekst idzie do dymka, bez znaczników emocji).
// Znaczniki [excited], [curious]… to wskazówki dla modelu, nie są czytane.

export const GLOS = 'p7syq836inJ5ZDtRt6RX';   // Tobiasz – bajki dla dzieci po polsku (głos profesjonalny)
export const MODEL = 'eleven_v4';

export const KWESTIE = {
  // ekran powitalny (po kliknięciu Tika)
  witaj: '[excited] Cześć! Jestem Tik, zegar, który lubi się spieszyć. Wiesz, że czas umie się rozciągać jak guma? Wybierz przygodę i sprawdźmy to razem!',

  // Prędkość
  sp_start: 'To rakieta Kopernik. W środku błysk światła odbija się w górę i w dół jak piłeczka. Każde odbicie to jedno tyknięcie zegara. [excited] Rozpędź rakietę suwakiem!',
  sp_wolno: 'Samochód, samolot, a nawet stacja kosmiczna są dla światła strasznie powolne. Czas w nich też zwalnia, ale tak troszeczkę, że zauważą to tylko najdokładniejsze zegary atomowe.',
  sp_zygzak: '[curious] Patrz na żółtą smugę! Ty widzisz, że błysk w rakiecie leci zygzakiem, czyli dłuższą drogą. A światło nigdy nie przyspiesza. Dłuższa droga, ta sama prędkość… więc każde tyknięcie trwa dłużej. Czas w rakiecie zwalnia!',
  sp_pol: '[amazed] Ojej! Teraz w rakiecie czas płynie dwa razy wolniej niż u ciebie. I spójrz na rakietę: zrobiła się o połowę krótsza! Ale tylko dla ciebie. Załoga nie zauważa niczego dziwnego.',
  sp_99: '[excited] Dziewięćdziesiąt dziewięć procent prędkości światła! Kiedy u ciebie mija cała godzina, w rakiecie mija tylko osiem i pół minuty. Załoga starzeje się wolniej!',
  sp_limit: 'Coraz bliżej, ale prędkości światła nie dogonisz nigdy. Każdy kolejny kawałek wymaga coraz więcej energii. To najwyższe ograniczenie prędkości we Wszechświecie!',
  sp_kokpit: 'Tak widzi pilot! Gwiazdy zbiegają się przed nosem rakiety i robią się niebieskie, a za plecami czerwienieją. Jak krople deszczu, które przy biegu lecą ci prosto w twarz.',
  sp_bliznieta: 'Mam pomysł! Wyślijmy jedną z bliźniaczek w podróż tą rakietą. Kliknij przycisk z bliźniaczkami pod suwakiem.',

  // Podróż bliźniaczek
  bl_start: 'Ola zostaje na Ziemi, a jej siostra bliźniaczka Ala leci w kosmos. Na Ziemi minie dwadzieścia lat. [excited] Uwaga… start!',
  bl_duza: '[amazed] Ala wróciła dużo młodsza od swojej bliźniaczki! W pędzącej rakiecie czas płynął wolniej. To nie bajka, tak naprawdę działa świat.',
  bl_mala: 'Ala jest trochę młodsza od siostry. Rozpędź rakietę jeszcze bliżej prędkości światła, a różnica będzie dużo większa!',
  bl_zero: 'Przy takiej prędkości bliźniaczki są prawie w tym samym wieku. Różnica jest tak malutka, że jej nie widać. Rozpędź rakietę i spróbuj jeszcze raz!',

  // Grawitacja
  gr_start: 'Ta siatka to czasoprzestrzeń. Gwiazda ugina ją jak ciężka kula trampolinę. [excited] Dotknij siatki, żeby rzucić kulkę, a suwakiem zmieniaj masę!',
  gr_kulka: '[curious] Widzisz? Nikt kulki nie ciągnie. Ona po prostu toczy się po wygiętej siatce i dlatego krąży wokół środka. Tak Einstein wyjaśnił grawitację!',
  gr_czas: 'A teraz najdziwniejsze: im głębiej w dołku, tym wolniej płynie czas. Pokazuje to kolor siatki. Niebieski to prawie normalnie, a biały to czas, który prawie stoi.',
  gr_ziemia: 'Nawet Ziemia spowalnia czas. Zegar w piwnicy chodzi odrobinkę wolniej niż na dachu. Różnicę wyczują tylko najdokładniejsze zegary na świecie.',
  gr_slonce: 'Słońce jest ponad trzysta tysięcy razy cięższe od Ziemi. Ale jest też ogromne, więc jego masa jest rozłożona i czas przy nim zwalnia tylko troszkę.',
  gr_karzel: 'Biały karzeł waży mniej więcej tyle co Słońce, a jest mały jak Ziemia. Im ciaśniej upchana masa, tym głębszy dołek i tym mocniej zwalnia czas.',
  gr_neutron: '[amazed] Gwiazda neutronowa! Łyżeczka jej materii ważyłaby miliard ton, tyle co spora góra. Przy niej czas płynie już wyraźnie wolniej.',
  gr_dziura: '[amazed] Czarna dziura! Ugina czasoprzestrzeń tak mocno, że nawet światło nie może z niej uciec. Spróbuj wrzucić do niej kulkę!',
  gr_sgr: 'To Sagittarius A gwiazdka, czarna dziura w samym środku naszej Galaktyki. Jest ponad cztery miliony razy cięższa od Słońca!',
  gr_stop: '[whispers] Zegar B prawie stanął! Jego błyski docierają do ciebie bardzo rzadko i są czerwone, jakby zmęczyły się wspinaczką z głębokiego dołka.',
  gr_polknieta: 'Am! Czarna dziura połknęła kulkę. Z jej wnętrza nic już nie wróci, nawet światło.',

  // Razem
  ra_start: 'Teraz rakieta krąży wokół gwiazdy neutronowej. Jej zegar zwalnia z dwóch powodów naraz: bo pędzi i bo siedzi w grawitacyjnym dołku. Wypróbuj też satelitę GPS!',
  ra_gps: '[excited] Satelity GPS! Ich zegary śpieszą się o trzydzieści osiem milionowych części sekundy na dobę. Bez poprawek Einsteina nawigacja w telefonie myliłaby się o ponad dziesięć kilometrów każdego dnia!',
  ra_iss: 'Na stacji kosmicznej wygrywa prędkość. Astronauci starzeją się odrobinę wolniej niż my. Po pół roku są młodsi o mniej więcej pięć tysięcznych sekundy.',
  ra_dziura: 'Tak blisko czarnej dziury rakieta musi pędzić z ogromną prędkością, żeby nie spaść. Tu oba efekty są naprawdę wielkie!',
  ra_interstellar: '[amazed] Jak w filmie Interstellar! Tak blisko ogromnej czarnej dziury jedna godzina na statku to aż siedem lat na Ziemi.',

  // nagrody za zadania
  brawo_1: '[excited] Brawo! Zadanie wykonane!',
  brawo_2: '[excited] Super, udało ci się!',
  brawo_3: '[excited] Tak trzymać! Einstein byłby dumny!'
};

// [id, opis, długość w s]
export const EFEKTY = [
  ['start', 'playful cartoon rocket launch: quick rising whoosh with magical sparkles, short and bright, no music', 2.2],
  ['powrot', 'cartoon rocket landing: descending whoosh, soft bump, then a short happy magical chime, no music', 2.6],
  ['kulka', 'a small glass marble dropped onto a stretched rubber trampoline, soft gentle boing, single sound', 0.8],
  ['am', 'funny cartoon gulp swallow with a short deep wobbly whoosh, single sound', 1.0],
  ['brawo', 'short cheerful magical success sparkle chime, ascending, single sound', 1.3]
];
