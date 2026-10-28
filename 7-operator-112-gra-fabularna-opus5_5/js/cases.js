'use strict';
/* =====================================================================
   Rejestr spraw. Każda sprawa leży w sprawy/<id>/ i ma te same pliki:
   data.js (fabuła), map.js (teren), sketch.js (szkic miejsca),
   story.js (obiekt CASE, narzędzia, zakończenia).
   Nowa sprawa = nowy folder + wpis tutaj.
   ===================================================================== */
const CASES = [
  { id: 'zarowka', no: '01', title: 'Pod jedną żarówką', short: 'Dziewczyna bez pamięci w piwnicy. Kalnów, 26.10, 23:41.',
    tagline: 'Nie pamięta, kim jest. Na górze ktoś chodzi.', place: 'Kalnów · piwnica', when: '26.10 · 23:41', length: '20–30 min', endings: 7 },
  { id: 'oddzial', no: '02', title: 'Oddział zamknięty', short: 'Noc Wszystkich Świętych w opuszczonym psychiatryku. Borek, 01.11, 00:47.', adult: true,
    tagline: 'Głośniki bez prądu znają jej imię.', place: 'Borek · dawny szpital', when: '01.11 · 00:47', length: '25–35 min', endings: 6 },
  { id: 'swit', no: '03', title: 'Przed świtem', short: 'Mężczyzna w aucie, gdzieś za miastem, nie chce dożyć świtu. Kalnów, 03.11, 06:04.', adult: true,
    tagline: 'Nie powie, gdzie jest. Chce tylko, żeby ktoś wiedział.', place: 'Lasy Gajowe · auto', when: '03.11 · 06:04', length: '25–35 min', endings: 6 },
];
const CASE_FILES = ['data.js', 'map.js', 'sketch.js', 'story.js'];
const caseEndingsKey = id => id === 'zarowka' ? 'pjz_endings_v1' : 'pjz_endings_' + id;

function caseIdFromUrl() {
  const q = new URLSearchParams(location.search).get('sprawa');
  return CASES.some(c => c.id === q) ? q : CASES[0].id;
}

/* skrypty sprawy ładowane po kolei; działa też z dysku (file://) */
function loadCase(id) {
  const files = CASE_FILES.map(f => `sprawy/${id}/${f}`);
  const next = () => {
    const f = files.shift();
    if (!f) { initApp(); return; }
    const s = document.createElement('script');
    s.src = f; s.onload = next;
    s.onerror = () => { document.body.insertAdjacentHTML('afterbegin', `<p style="color:#f66;padding:20px">Nie udało się wczytać pliku ${f}.</p>`); };
    document.body.appendChild(s);
  };
  next();
}
loadCase(caseIdFromUrl());
