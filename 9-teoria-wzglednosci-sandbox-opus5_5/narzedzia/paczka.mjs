// node paczka.mjs  – raw/*.mp3 → obcięta cisza, wyrównana głośność, mono mp3 → ../audio/<id>.mp3 (potrzebny ffmpeg w PATH)
// Pliki mp3 gra element <audio>, więc działają też po otwarciu index.html z dysku (file://).
import { readdirSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { KWESTIE } from './przepis.mjs';

const RAW = fileURLToPath(new URL('./raw/', import.meta.url));
const OUT = fileURLToPath(new URL('../audio/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const ff = (args) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-y', ...args], { encoding: 'utf8' });
const trim = 'silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.02,areverse,' +
  'silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.08,areverse';

let suma = 0;
for (const f of readdirSync(RAW).filter(f => f.endsWith('.mp3')).sort()) {
  const id = f.slice(0, -4), sfx = id.startsWith('sfx_');
  const tmp = RAW + id + '.wav';
  ff(['-v', 'error', '-i', RAW + f, '-af', trim, '-ac', '1', tmp]);
  const det = ff(['-i', tmp, '-af', 'volumedetect', '-f', 'null', '-']).stderr;
  const mean = +det.match(/mean_volume: (-?[\d.]+)/)[1], max = +det.match(/max_volume: (-?[\d.]+)/)[1];
  // mowa: średnio −19 dB; efekty: −20 dB (ciszej niż głos); szczyt nie wyżej niż −1 dB
  const gain = Math.min((sfx ? -20 : -19) - mean, -1 - max);
  const dur = +ff(['-i', tmp, '-f', 'null', '-']).stderr.match(/time=(\d+):(\d+):([\d.]+)/).slice(1).reduce((a, v, i) => a + v * [3600, 60, 1][i], 0);
  const af = `volume=${gain.toFixed(1)}dB,afade=t=in:d=0.01,afade=t=out:st=${Math.max(0, dur - 0.06).toFixed(3)}:d=0.06`;
  const mp3 = OUT + id + '.mp3';
  ff(['-v', 'error', '-i', tmp, '-af', af, '-ac', '1', '-ar', sfx ? '44100' : '24000', '-b:a', sfx ? '64k' : '48k', mp3]);
  const kb = statSync(mp3).size / 1024;
  suma += kb;
  console.log(id.padEnd(18), dur.toFixed(2) + 's', 'zysk', gain.toFixed(1), 'dB', kb.toFixed(1) + ' KB');
}
console.log('razem', suma.toFixed(0), 'KB');

// teksty do dymka Tika: te same co w nagraniach, bez znaczników emocji
const teksty = Object.fromEntries(Object.entries(KWESTIE).map(([id, t]) => [id, t.replace(/\[[^\]]*\]\s*/g, '').trim()]));
writeFileSync(OUT + 'kwestie.js', '/* Kwestie Tika (z narzedzia/przepis.mjs, generuje narzedzia/paczka.mjs). */\n' +
  'window.TIK_KWESTIE = ' + JSON.stringify(teksty, null, 1) + ';\n');
console.log('teksty →', OUT + 'kwestie.js');
