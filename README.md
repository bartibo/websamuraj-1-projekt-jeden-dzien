# websamuraj – 1 projekt, jeden dzień

Rozwijane wersje projektów z eksperymentu **1 prompt, 1 zdanie**.

Oryginały, czyli to, co powstało z jednego zdania bez żadnych poprawek, leżą w publicznym repo [bartibo/jeden-prompt](https://github.com/bartibo/jeden-prompt). Tam się ich nie zmienia. Tutaj każdy projekt startuje jako dokładna kopia oryginału i jest dalej rozwijany.

Autor: Bartłomiej Borowczyk · [vibemaster.pl](https://vibemaster.pl)

Strona z projektami: **[projekty.vibemaster.pl](https://projekty.vibemaster.pl)** (GitHub Pages z gałęzi `main`, plik [`index.html`](index.html), grafiki w [`galeria/`](galeria/)).

## Projekty

| # | Projekt | Oryginał z jednego promptu |
| --- | --- | --- |
| 1 | [Tarcza Ziemi](1-meteoryty-gra-opus5_5/) | [jeden-prompt/1-meteoryty-gra-opus5_5](https://github.com/bartibo/jeden-prompt/tree/main/1-meteoryty-gra-opus5_5) |
| 2 | [Sejsmo·Lab](2-trzesienie-ziemi-interaktywne-opus5_5/) | [jeden-prompt/2-trzesienie-ziemi-interaktywne-opus5_5](https://github.com/bartibo/jeden-prompt/tree/main/2-trzesienie-ziemi-interaktywne-opus5_5) |
| 3 | [Kapibara Kombat](3-kapibary-bijatyka-opus5_5/) | [jeden-prompt/3-kapibary-bijatyka-opus5_5](https://github.com/bartibo/jeden-prompt/tree/main/3-kapibary-bijatyka-opus5_5) |
| 4 | [Oczami innych](4-zaburzenia-wzroku-symulator-opus5_5/) | [jeden-prompt/4-zaburzenia-wzroku-symulator-opus5_5](https://github.com/bartibo/jeden-prompt/tree/main/4-zaburzenia-wzroku-symulator-opus5_5) |
| 5 | [Absurdoro](5-pomodoro-absurdalny-timer-opus5_5/) | [jeden-prompt/5-pomodoro-absurdalny-timer-opus5_5](https://github.com/bartibo/jeden-prompt/tree/main/5-pomodoro-absurdalny-timer-opus5_5) |

## Jak to działa

- Nowy projekt powstaje w repo `jeden-prompt`. Po commicie jego folder kopiuje się tutaj automatycznie, z osobnym commitem „Import z jeden-prompt”.
- Ten commit to punkt startowy. `git log` albo `git diff` od niego pokazuje, co zmieniło się po eksperymencie.
- Folderów, które już tu są, kopiowanie nigdy nie nadpisuje.

## Jak uruchomić

Na [projekty.vibemaster.pl](https://projekty.vibemaster.pl) albo lokalnie: wejdź do folderu projektu i kliknij dwa razy `index.html`.

Nowy projekt na stronie: skopiuj w `index.html` jedną sekcję `<section class="proj">`, zmień teksty i dodaj zrzut `galeria/projekt-N.jpg` (1920×1080) oraz `galeria/projekt-N-960.jpg`.

## Agenci oceniający

W [`.claude/agents/`](.claude/agents/) są czterej agenci Claude Code do oceny projektów webowych: `ocena-design` (wygląd i interfejs), `ocena-ux` (jak się gra i korzysta), `ocena-optymalizacja` (szybkość i zasoby) oraz `rozwoj-produktu` (co dodać, nie zmieniając głównej idei). Nie mają przypiętego modelu, więc zawsze używają domyślnego. Wysiłek: `high`.
