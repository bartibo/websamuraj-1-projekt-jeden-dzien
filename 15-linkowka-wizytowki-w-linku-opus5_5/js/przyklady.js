/* Przykładowe wizytówki (fikcyjne osoby, adresy w zarezerwowanej domenie .example).
 * Każda pokazuje inny motyw – „Wypełnij przykładem” przechodzi po kolei przez wszystkie. */
'use strict';

const PRZYKLADY = [
  {
    imie: 'Marta Wiśniewska', rola: 'Projektantka UX/UI i brandingu', miasto: 'Wrocław · zdalnie', status: 1, stawka: 'od 160 zł/h', awatar: '', motyw: 0, akcent: '',
    bio: 'Projektuję produkty cyfrowe, które ludzie rozumieją od pierwszego kliknięcia. Od 8 lat pomagam startupom i małym markom zamienić chaos w prosty, piękny interfejs.\nZaczynam od rozmowy z Twoimi klientami, kończę na gotowych makietach i systemie, który zespół rozwinie sam.',
    projekty: [
      { tytul: 'Ziarno – sieć kawiarni specialty', url: 'ziarno.example/case-study', opis: 'Identyfikacja, menu i sklep internetowy dla czterech kawiarni. Sprzedaż online +38% w kwartał.', tag: 'Branding · 2025' },
      { tytul: 'Kliniq – rezerwacja wizyt', url: 'kliniq.example', opis: 'Rezerwacja z siedmiu kroków skrócona do trzech. Porzuceń o 41% mniej.', tag: 'UX · aplikacja' },
      { tytul: 'Szlak Odry', url: 'szlakodry.example', opis: 'Przewodnik rowerowy offline z mapą i audio. 20 tys. pobrań w pierwsze lato.', tag: 'Produkt · 2024' },
    ],
    email: 'marta@ziarno.example', tel: '+48 123 456 789',
    linki: ['https://www.linkedin.com/in/przykladowy-profil-linkowka', 'https://dribbble.com/przyklad-linkowka', 'https://www.behance.net/przyklad-linkowka', ''],
  },
  {
    imie: 'Kuba Zieliński', rola: 'Front-end developer · React, Astro, TypeScript', miasto: 'Gdańsk', status: 2, stawka: 'wycena projektu w 48 h', awatar: '🧑‍💻', motyw: 1, akcent: '',
    bio: 'Buduję szybkie strony i aplikacje, które dostają 100/100 w Lighthouse i nie rozpadają się po roku. Lubię projekty, w których liczy się wydajność, dostępność i porządny kod.',
    projekty: [
      { tytul: 'Sklep Las Rzemiosła', url: 'lasrzemiosla.example', opis: 'Migracja sklepu na Astro: czas ładowania z 4,1 s do 0,7 s, konwersja +22%.', tag: 'E-commerce' },
      { tytul: 'Panel floty Trakto', url: 'trakto.example/demo', opis: 'Mapa 3000 pojazdów na żywo w przeglądarce, 60 klatek na sekundę na zwykłym laptopie.', tag: 'React · WebGL' },
      { tytul: 'tiny-forms', url: 'github.com/przyklad-linkowka/tiny-forms', opis: 'Biblioteka formularzy w 2 kB. 1,2 tys. gwiazdek na GitHubie.', tag: 'Open source' },
    ],
    email: 'kuba@trakto.example', tel: '',
    linki: ['https://github.com/przyklad-linkowka', 'https://www.linkedin.com/in/przykladowy-profil-linkowka', 'https://bsky.app/profile/przyklad-linkowka', ''],
  },
  {
    imie: 'Nina Dąbrowska', rola: 'Motion designerka i animatorka 2D', miasto: 'Łódź', status: 1, stawka: 'od 2 400 zł za 30 s animacji', awatar: '🎬', motyw: 2, akcent: '',
    bio: 'Ożywiam logotypy, explainery i reklamy do social mediów. Krótko, rytmicznie i tak, żeby nikt nie przewinął dalej.',
    projekty: [
      { tytul: 'Explainer dla Pszczoły Pay', url: 'pszczolapay.example/film', opis: 'Dziewięćdziesiąt sekund, które zastąpiły czterostronicowy regulamin. 1,1 mln wyświetleń.', tag: 'Animacja 2D' },
      { tytul: 'Ożywione logo Fala FM', url: 'falafm.example', opis: 'Pięć wariantów animacji logo na antenę, YouTube i ekrany w tramwajach.', tag: 'Motion branding' },
      { tytul: 'Seria Rolek „Szybki przepis”', url: 'instagram.com/przyklad-linkowka', opis: '40 krótkich filmów dla marki spożywczej. Średnio 9 s dłużej oglądane niż poprzednie.', tag: 'Social · 2025' },
    ],
    email: 'nina@falafm.example', tel: '+48 123 456 789',
    linki: ['https://vimeo.com/przyklad-linkowka', 'https://www.instagram.com/przyklad-linkowka', 'https://www.behance.net/przyklad-linkowka', ''],
  },
  {
    imie: 'Ola Kamińska', rola: 'Fotografka produktowa i reklamowa', miasto: 'Kraków · studio na Zabłociu', status: 1, stawka: 'pakiety od 900 zł', awatar: '📸', motyw: 3, akcent: '',
    bio: 'Fotografuję produkty tak, żeby chciało się je dotknąć. Kosmetyki, biżuteria, jedzenie i wszystko, co ma sprzedać się w sieci.\nWłasne studio, stylistka na miejscu, zdjęcia gotowe w 5 dni roboczych.',
    projekty: [
      { tytul: 'Kampania Mglisty Ogród', url: 'mglistyogrod.example', opis: 'Sesja do premiery linii kosmetyków naturalnych: packshoty, flat laye i zdjęcia w ruchu.', tag: 'Kosmetyki' },
      { tytul: 'Lookbook Srebrna Nić', url: 'srebrnanic.example/lookbook', opis: 'Biżuteria na modelkach i na kamieniach z Tatr. 60 zdjęć do sklepu i katalogu.', tag: 'Biżuteria' },
      { tytul: 'Menu Bistro Pod Lipą', url: 'podlipa.example', opis: 'Każde danie z karty w jednym świetle. Zamówienia przez aplikację +27%.', tag: 'Food · 2025' },
    ],
    email: 'ola@podlipa.example', tel: '+48 123 456 789',
    linki: ['https://www.instagram.com/przyklad-linkowka', 'https://www.pinterest.com/przyklad-linkowka', 'https://calendly.com/przyklad-linkowka', ''],
  },
  {
    imie: 'Tomek Wójcik', rola: 'DevOps i back-end · Go, Kubernetes', miasto: 'Poznań · zdalnie', status: 2, stawka: 'od 220 zł/h', awatar: '', motyw: 4, akcent: '',
    bio: 'Sprawiam, że serwery przestają dzwonić w nocy. Automatyzuję wdrożenia, tnę rachunki za chmurę i stawiam monitoring, który budzi tylko wtedy, gdy naprawdę trzeba.',
    projekty: [
      { tytul: 'Rachunek za chmurę −63%', url: 'grafit.example/blog/chmura', opis: 'Przeniesienie platformy SaaS z maszyn wirtualnych na Kubernetes z autoskalowaniem.', tag: 'AWS · K8s' },
      { tytul: 'Wdrożenie w 4 minuty', url: 'paczkomatik.example', opis: 'Pipeline CI/CD dla 30 mikroserwisów. Z dwóch wdrożeń w tygodniu na dwadzieścia dziennie.', tag: 'CI/CD' },
      { tytul: 'pgwatch-lite', url: 'github.com/przyklad-linkowka/pgwatch-lite', opis: 'Lekki monitoring PostgreSQL w jednym pliku binarnym.', tag: 'Go · open source' },
    ],
    email: 'tomek@grafit.example', tel: '',
    linki: ['https://github.com/przyklad-linkowka', 'https://gitlab.com/przyklad-linkowka', 'https://www.linkedin.com/in/przykladowy-profil-linkowka', ''],
  },
  {
    imie: 'Piotr Lewandowski', rola: 'Copywriter i strateg treści B2B', miasto: 'Warszawa', status: 3, stawka: 'od 1 800 zł za landing', awatar: '', motyw: 5, akcent: '',
    bio: 'Piszę teksty, które sprzedają usługi trudne do wytłumaczenia: oprogramowanie, finanse, przemysł. Krótkie zdania. Konkretne liczby. Zero „innowacyjnych rozwiązań”.',
    projekty: [
      { tytul: 'Landing Księgowa w Chmurze', url: 'ksiegowawchmurze.example', opis: 'Nowe nagłówki i struktura strony. Zapisy na wersję próbną +54% w test A/B.', tag: 'Landing · SaaS' },
      { tytul: 'Newsletter Hala 7', url: 'hala7.example/newsletter', opis: 'Cotygodniowy list do klientów hurtowni. 46% otwarć przy branżowej średniej 21%.', tag: 'E-mail' },
      { tytul: 'Język marki Betonix', url: 'betonix.example', opis: 'Słownik i zasady tonu dla firmy budowlanej: od ofert przetargowych po LinkedIn.', tag: 'Strategia · 2024' },
    ],
    email: 'piotr@hala7.example', tel: '+48 123 456 789',
    linki: ['https://www.linkedin.com/in/przykladowy-profil-linkowka', 'https://przyklad-linkowka.substack.com', '', ''],
  },
];
