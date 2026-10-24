// node paczka.mjs [wyj.js]  – raw/*.mp3 → obcięta cisza, wyrównana głośność, mono mp3 → jeden plik JS z base64
// (domyślnie ../audio/dzwieki.js; potrzebny ffmpeg w PATH)
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('./', import.meta.url));
const RAW = DIR + 'raw/', OUT = DIR + 'gotowe/';
mkdirSync(OUT, { recursive: true });
const wyj = process.argv[2] || fileURLToPath(new URL('../audio/dzwieki.js', import.meta.url));

const ff = (args) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-y', ...args], { encoding: 'utf8' });
const trim = 'silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.01,areverse,' +
  'silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.03,areverse';

const paczka = {};
let suma = 0;
for (const f of readdirSync(RAW).filter(f => f.endsWith('.mp3')).sort()) {
  const id = f.slice(0, -4), sfx = id.startsWith('sfx_'), key = sfx ? id.slice(4) : id;
  const tmp = OUT + id + '.wav';
  ff(['-v', 'error', '-i', RAW + f, '-af', trim, '-ac', '1', tmp]);
  const det = ff(['-i', tmp, '-af', 'volumedetect', '-f', 'null', '-']).stderr;
  const mean = +det.match(/mean_volume: (-?[\d.]+)/)[1], max = +det.match(/max_volume: (-?[\d.]+)/)[1];
  // mowa: średnio −19 dB; efekty: −17 dB; szczyt nie wyżej niż −1 dB
  const gain = Math.min((sfx ? -17 : -19) - mean, -1 - max);
  const dur = +ff(['-i', tmp, '-f', 'null', '-']).stderr.match(/time=(\d+):(\d+):([\d.]+)/).slice(1).reduce((a, v, i) => a + v * [3600, 60, 1][i], 0);
  const fade = `volume=${gain.toFixed(1)}dB,afade=t=out:st=${Math.max(0, dur - 0.03).toFixed(3)}:d=0.03`;
  const mp3 = OUT + key + '.mp3';
  ff(['-v', 'error', '-i', tmp, '-af', fade, '-ac', '1', '-ar', sfx ? '44100' : '24000', '-b:a', sfx ? '64k' : '40k', mp3]);
  const b = readFileSync(mp3);
  paczka[key] = b.toString('base64');
  suma += b.length;
  console.log(key.padEnd(22), dur.toFixed(2) + 's', 'zysk', gain.toFixed(1), 'dB', (b.length / 1024).toFixed(1) + ' KB');
}
const js = '/* Nagrania z ElevenLabs: głosy kapibar, komentator i efekty walki (mp3 w base64, działa też z file://). */\n' +
  'window.KAPI_DZWIEKI = ' + JSON.stringify(paczka).replace(/","/g, '",\n"') + ';\n';
writeFileSync(wyj, js);
console.log('plików', Object.keys(paczka).length, 'mp3 razem', (suma / 1024).toFixed(0), 'KB, paczka', (js.length / 1024).toFixed(0), 'KB');
