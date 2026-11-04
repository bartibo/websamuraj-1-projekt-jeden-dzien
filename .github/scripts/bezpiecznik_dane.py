"""Bezpiecznik: dane dla przeglądarki.

Pobiera listy domen oszustów (CERT Polska, Phishing.Database), łączy je i dzieli na 1024 porcje
według skrótu FNV-1a nazwy domeny. Strona pobiera przy sprawdzaniu tylko jedną porcję (ok. 7 KB po kompresji),
więc nie ściąga całych list i nie zdradza, jaki adres sprawdza.

Uruchamia go GitHub Actions (.github/workflows/bezpiecznik-dane.yml) co godzinę.
Wynik: katalog podany w argumencie, z plikami s/000.txt … s/3ff.txt i meta.json.
Linia porcji: "domena<TAB>źródła", gdzie źródła to litery: c = CERT Polska, p = Phishing.Database.
"""
import json
import os
import sys
import time
import urllib.request

ZRODLA = {
    'c': 'https://hole.cert.pl/domains/v2/domains.txt',
    'p': 'https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-domains-ACTIVE.txt',
}


PORCJE = 1024


def fnv1a(s: str) -> int:
    h = 0x811C9DC5
    for b in s.encode('utf-8'):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def pobierz(url: str) -> str:
    req = urllib.request.Request(url, headers={'User-Agent': 'bezpiecznik-dane (GitHub Actions)'})
    for proba in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:  # noqa: BLE001
            print(f'  błąd {url}: {e}', file=sys.stderr)
            time.sleep(5 * (proba + 1))
    raise RuntimeError(f'nie udało się pobrać {url}')


def main(wyj: str) -> None:
    domeny: dict[str, set[str]] = {}
    ile = {}
    for znak, url in ZRODLA.items():
        print(f'pobieram {url}')
        n = 0
        for linia in pobierz(url).splitlines():
            d = linia.strip().lower().rstrip('.')
            if not d or d.startswith('#') or ' ' in d or '.' not in d or len(d) > 253:
                continue
            if d.startswith('www.'):
                d = d[4:]
            domeny.setdefault(d, set()).add(znak)
            n += 1
        ile[znak] = n
        print(f'  {n} domen')
    if ile.get('c', 0) < 1000 and ile.get('p', 0) < 1000:
        raise RuntimeError('listy podejrzanie krótkie, nic nie zapisuję')

    porcje: list[list[str]] = [[] for _ in range(PORCJE)]
    for d, zr in domeny.items():
        porcje[fnv1a(d) % PORCJE].append(f"{d}\t{''.join(sorted(zr))}")
    os.makedirs(os.path.join(wyj, 's'), exist_ok=True)
    for i, p in enumerate(porcje):
        p.sort()
        with open(os.path.join(wyj, 's', f'{i:03x}.txt'), 'w', encoding='utf-8', newline='\n') as f:
            f.write('\n'.join(p) + '\n')
    meta = {'czas': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'cert': ile.get('c', 0), 'phishdb': ile.get('p', 0), 'razem': len(domeny), 'porcje': PORCJE}
    with open(os.path.join(wyj, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False)
    print(json.dumps(meta, ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'bezpiecznik-dane')
