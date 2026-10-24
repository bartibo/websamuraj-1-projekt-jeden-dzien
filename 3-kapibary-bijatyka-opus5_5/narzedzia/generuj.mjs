// Nagrania z ElevenLabs według przepis.mjs → narzedzia/raw/<id>.mp3 (pomija gotowe). Potem: node paczka.mjs
// node generuj.mjs [--tylko prefiks] [--wymus]
// Klucz: zmienna ELEVENLABS_API_KEY albo plik .env wskazany w ELEVENLABS_ENV (domyślnie .env projektu wideo autora).
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { nagrania, EFEKTY, MODEL } from './przepis.mjs';

const ENV = process.env.ELEVENLABS_ENV || 'F:/Project_wideo/_producent_marketingu_wideo/heygen/5_kapybary-awatary/.env';
const KEY = process.env.ELEVENLABS_API_KEY ||
  readFileSync(ENV, 'utf8').match(/^ELEVENLABS_API_KEY\s*=\s*(.+)$/m)[1].trim().replace(/^['"]|['"]$/g, '');
const args = process.argv.slice(2);
const tylko = args.includes('--tylko') ? args[args.indexOf('--tylko') + 1] : '';
const wymus = args.includes('--wymus');
const RAW = fileURLToPath(new URL('./raw/', import.meta.url));
mkdirSync(RAW, { recursive: true });

async function post(url, body) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { method: 'POST', headers: { 'xi-api-key': KEY, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) return { buf: Buffer.from(await r.arrayBuffer()), cost: r.headers.get('character-cost') };
    const t = await r.text();
    if (r.status === 429 || r.status >= 500) { await new Promise(s => setTimeout(s, 3000 * (i + 1))); continue; }
    throw new Error(`${r.status} ${t.slice(0, 300)}`);
  }
  throw new Error('za dużo prób');
}

const zadania = [];
for (const n of nagrania()) zadania.push({ id: n.id, run: () => post(`https://api.elevenlabs.io/v1/text-to-speech/${n.glos}?output_format=mp3_44100_128`, {
  text: n.tekst, model_id: MODEL[n.id] || 'eleven_v4', language_code: 'pl',
  voice_settings: { stability: n.rodzaj === 'win' || n.rodzaj === 'kom' ? 0.45 : 0.3, similarity_boost: 0.8, style: 0.6 } }) });
for (const [id, opis, dl] of EFEKTY) zadania.push({ id: 'sfx_' + id, run: () => post('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
  text: opis, duration_seconds: dl, prompt_influence: 0.6 }) });

const lista = zadania.filter(z => (!tylko || z.id.startsWith(tylko)) && (wymus || !existsSync(RAW + z.id + '.mp3')));
console.log('do zrobienia:', lista.length);
let i = 0, zle = 0;
async function worker() {
  while (i < lista.length) {
    const z = lista[i++];
    try {
      const { buf, cost } = await z.run();
      writeFileSync(RAW + z.id + '.mp3', buf);
      appendFileSync(RAW + '../koszty.log', `${z.id}\t${cost || ''}\n`);
      process.stdout.write('.');
    } catch (e) { zle++; console.log('\n' + z.id, e.message); }
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
console.log('\ngotowe, błędy:', zle);
