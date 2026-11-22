// Lanterns of Lowtide — entrypoint (Node 22, standard library only).
// Hands the game in: copies game/ and screenshots/ from beside this file to
// /output (or MAKEFUN_OUTPUT_DIR outside the grader) and writes
// /output/dossier.json with the kit's buildDossier. Runs twice in the
// grader and must write identical bytes both times, so nothing here depends
// on time, randomness or the environment beyond the output directory.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  throw new Error(`Lanterns of Lowtide main.ts: ${message}`);
}

function checkGameTree() {
  const gameDir = join(here, 'game');
  if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
  const shots = join(here, 'screenshots');
  if (existsSync(shots)) {
    const files = readdirSync(shots).filter((f) => !f.startsWith('.'));
    if (files.length < 3 || files.length > 4) fail(`expected 3 or 4 screenshots, found ${files.length}`);
    for (const f of files) {
      const size = statSync(join(shots, f)).size;
      if (size > 262144) fail(`screenshot ${f} is ${size} bytes, over the 256 KiB cap`);
    }
  }
}

checkGameTree();

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
