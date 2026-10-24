// Nagrania do Kapibara Kombat: głosy kapibar, komentator i efekty walki (ElevenLabs).
// id pliku = klucz w paczce dźwięków gry. Warianty: <grupa>_<n>. Znaczniki [pained], [shouting]… to emocje, nie są czytane.
// Każdą kwestię sprawdzono Whisperem; kilka powtórzono, aż brzmiała po polsku (np. „Walczcie!” zamiast „Walcz!”).

export const GLOSY = {
  kapi: 'O2UdiCyCc2azQa3w3Oe6',   // Capy P03 Carl – luzacki, lekko zachrypnięty baryton
  yuzu: 'gbagUuRrRwhuz2EK2za0',   // Kiep – Danuta – głośna, wesoła, nadopiekuńcza mama
  cien: 'HZTGlpHr2OrSPYekXcvu',   // Kiep – Szymon – szybki, nakręcony młodzik
  bruno: 'cDfE6JcTHelZpi0NmGW9',  // Stan – ochrona (Capy) – głęboki, powolny, dramatyczny bas
  kom: 'eFMkPPotEpWgNAf5davo',    // Kiep – Redaktor – rozgorączkowany komentator sportowy
};

const POSTACIE = {
  kapi: {
    hitL: ['[pained] Au!', '[pained] Ała!', '[grunts] Uff!', '[pained] Ojej!'],
    hitH: ['[pained] Ała, boli!', '[pained] Aj, aj, moje pośladki!', '[pained] Moja opaska! Kupiłem ją na wyprzedaży!',
      '[pained] Aua! To nie było karate!', '[pained] Mój kręgosłup! Mój spokój!'],
    ko: ['[screams] Nieeee! Moja pomarańczaaa!', '[groaning] Odpocznę sobie... tutaj...'],
    atk: ['[shouting] Hja!', '[shouting] Kiaaa!', '[shouting] Pomarańcza!', '[shouting] Masz!'],
    super: ['[shouting] Pomarańczowy Wodospad!'],
    throw: ['[effort] Hop! I do wody!'],
    dizzy: ['[dizzy] Ile tu jest pomarańczy...?'],
    win: ['Pomarańcza dziennie trzyma przeciwnika z daleka.', 'Spokój. Woda. Karate.', 'Ukłoń się rzece, nie mnie.'],
  },
  yuzu: {
    hitL: ['[pained] Ojej!', '[pained] Auć!', '[pained] Ała!', '[gasps] Ach!'],
    hitH: ['[pained] Aj, aj, aj, moje pośladki!', '[pained] Ała, boli! Kto cię tak wychował?!', '[pained] Moja fryzura!',
      '[pained] Mój kręgosłup! Mam już swoje lata!', '[pained] Ała! Powiem twojej matce!'],
    ko: ['[screams] O Matko Kapibaro!', '[groaning] Idę się... wymoczyć...'],
    atk: ['[shouting] Masz, kochanie!', '[shouting] Do balii!', '[shouting] Hop!', '[shouting] Kąpiel!'],
    super: ['[shouting] Wielka Fala!'],
    throw: ['[effort] Do wody, urwisie!'],
    dizzy: ['[dizzy] Czy ktoś zakręcił gorącą wodę...?'],
    win: ['Ciepła kąpiel i wszystko przechodzi.', 'Następnym razem przynieś ręcznik.', 'Uspokój się, kochanie. Już po wszystkim.'],
  },
  cien: {
    hitL: ['[pained] Ał!', '[pained] Hej!', '[pained] Auć!', '[grunts] Hmpf!'],
    hitH: ['[pained] Ała, boli! Ninja też czują!', '[pained] Aj, aj, moje pośladki!', '[pained] Mój ogon! Chwila... nie mam ogona!',
      '[pained] To było nieuczciwe!', '[pained] Moja maska! Teraz wszyscy mnie widzą!'],
    ko: ['[screams] Nikt mnie nie widziaaał!', '[screams] Wracam do trzciiin!'],
    atk: ['[shouting] Hia!', '[shouting] Ciach!', '[shouting] Szu!', '[whispers] Za tobą.'],
    super: ['[shouting] Tysiąc Liści!'],
    throw: ['[effort] Hop! Lecisz!'],
    dizzy: ['[dizzy] Widzę... trzy... trzciny...'],
    win: ['[whispers] Nie widziałeś mnie. Nikt mnie nie widzi.', 'Trzcina się ugina, ale nie łamie.', 'Za wolno. Zdecydowanie za wolno.'],
  },
  bruno: {
    hitL: ['[grunts] Uf!', '[pained] Ała!', '[grunts] Hmpf!', '[pained] Au!'],
    hitH: ['[pained] Ała, boli! Mój brzuszek!', '[pained] Aj, aj, moje pośladki!', '[pained] Moja kanapka! Upadła mi kanapka!',
      '[pained] Auuu! Mama mówiła, żebym został kucharzem!', '[pained] Ała! To był mój obiad!'],
    ko: ['[screams] Nieeeee! Mój podwieczorek!', '[groaning] Zgłodniałem...'],
    atk: ['[shouting] Hyyyah!', '[shouting] Brzuch!', '[shouting] Dosukoi!', '[shouting] Uważaj!'],
    super: ['[shouting] Bomba z Trampoliny!'],
    throw: ['[effort] Hop! Na matę!'],
    dizzy: ['[dizzy] Czy to już pora na drzemkę...?'],
    win: ['Mniej gadania, więcej jedzenia.', 'Grawitacja to mój najlepszy przyjaciel.', 'Uważaj na brzuch. Wszyscy uważają na brzuch.'],
  },
};

const KOMENTATOR = {
  title: '[excited] Kapibara Kombat!',
  choose: '[excited] Wybierz kapibarę!',
  r1: '[excited] Runda pierwsza!', r2: '[excited] Runda druga!', r3: '[excited] Runda trzecia!',
  r4: '[excited] Runda czwarta!', r5: '[excited] Runda piąta!', rfinal: '[excited] Runda finałowa!',
  fight: '[shouting] Walczcie!',
  ko: '[shouting] Nokaut!',
  timeup: '[excited] Koniec czasu!',
  draw: '[excited] Remis!',
  finishHim: '[shouting] Dokończ go!', finishHer: '[shouting] Dokończ ją!',
  fatality: '[shouting] Kapibality!', friendship: '[excited] Kapiprzyjaźń!', // fatality z eleven_v3 (v4 mówi „Kapibarity”)
  perfect: '[excited] Perfekcyjnie!',
  win_kapi: '[excited] Kapitan Kapi wygrywa!', win_yuzu: '[excited] Mama Yuzu wygrywa!',
  win_cien: '[excited] Cień Trzciny wygrywa!', win_bruno: '[excited] Gruby Bruno wygrywa!',
  name_kapi: '[excited] Kapitan Kapi!', name_yuzu: '[excited] Mama Yuzu!', name_cien: '[excited] Cień Trzciny!', name_bruno: '[excited] Gruby Bruno!',
  pr_kapibaralnie: '[shouting] Kapibaralnie!', pr_bagiennie: '[excited] Bagiennie!', pr_kapitalnie: '[excited] Kapitalnie!',
  pr_swietnie: '[excited] Świetnie!', pr_niezle: 'Nieźle!',
  counter: '[excited] Kontra!', breaker: '[excited] Przerywnik!', tech: '[excited] Wyrwanie!',
  react_1: '[laughs] Ała, to musiało zaboleć!', react_2: '[excited] Co za cios!', react_3: '[excited] Prosto w futerko!',
  react_4: '[excited] Tego nie było w podręczniku!', react_5: '[excited] Ojojoj!', react_6: '[excited] Jakie combo!',
  react_7: '[excited] Ostatkiem sił!', react_8: '[laughs] Ktoś tu dziś nie zje kolacji!',
};

// Model inny niż eleven_v4 (v4 czytał „Kapibality” jako „Kapibarity”)
export const MODEL = { kom_fatality: 'eleven_v3' };

// Efekty walki (ElevenLabs Sound Effects). [id, opis, długość s]
// hitL_2 i grab wyszły dwa razy prawie ciche, więc ich nie ma (gra używa wtedy syntezy)
export const EFEKTY = [
  ['hitL_1', 'light quick punch hit on a furry animal, short soft thwack, cartoon fighting game', 0.5],
  ['hitM_1', 'solid meaty punch impact, fighting game hit, punchy', 0.6],
  ['hitM_2', 'solid kick impact thud, fighting game hit', 0.6],
  ['hitH_1', 'heavy powerful punch impact with deep bass boom, fighting game critical hit', 0.9],
  ['hitH_2', 'heavy kick smash impact with crunch and bass, fighting game', 0.9],
  ['block', 'loud punch blocked by a forearm guard, solid thud with leather smack, fighting game block', 0.6],
  ['swingL', 'fast light whoosh of a quick punch, martial arts swing', 0.5],
  ['swingH', 'heavy strong whoosh of a big kick swing', 0.6],
  ['fall', 'heavy body falling onto wet muddy ground, thud with small splash', 1.0],
  ['ko', 'dramatic knockout impact, huge boom with reverb tail, fighting game KO', 2.0],
  ['gong', 'single deep gong hit with long ring, martial arts round start', 2.5],
  ['slam', 'huge heavy body slam on the ground, earth shaking thud and rumble', 1.2],
  ['splash', 'big water splash', 1.0],
  ['super', 'anime power up charge, rising energy whoosh with sparkle, super move start', 1.3],
  ['teleport', 'magical poof with leaves rustling, ninja teleport', 0.8],
  ['counter', 'sharp punch impact with a bright ding, counter hit', 0.7],
  ['crowd', 'small crowd of excited animals cheering and whistling, short', 2.0],
  ['crowdOoh', 'small crowd going oooh in sympathy after a painful hit', 1.6],
];

export function nagrania() {
  const out = [];
  for (const [ch, grupy] of Object.entries(POSTACIE))
    for (const [g, linie] of Object.entries(grupy))
      linie.forEach((t, i) => out.push({ id: `${ch}_${g}_${i + 1}`, glos: GLOSY[ch], tekst: t, rodzaj: g }));
  for (const [id, t] of Object.entries(KOMENTATOR)) out.push({ id: `kom_${id}`, glos: GLOSY.kom, tekst: t, rodzaj: 'kom' });
  return out;
}
