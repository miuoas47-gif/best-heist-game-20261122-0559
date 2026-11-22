// Vaultbreak: The Midnight Heist — hand-in program (Node 22, standard library only).
//
// Stages the entry for the grader: mirrors the repository's game/ and screenshots/
// into the output directory, then writes the dossier the judge reads, produced by
// the vendored make.fun library. Deterministic: no clock, no randomness, no
// arguments; exits 0 on success. Outside the grader, MAKEFUN_OUTPUT_DIR stands
// in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root: the directory this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// Where the staged entry goes: /output in the grader, overridable locally.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps (competition gate.json): only text_max_bytes shapes the
// dossier bytes; the rest refuse an entry the scorer would refuse.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

/** Mirror one top-level tree (game/ or screenshots/) into the output directory. */
function stageTree(name: string): void {
  const source = join(repoRoot, name);
  const target = join(outputDir, name);
  mkdirSync(target, { recursive: true });
  if (existsSync(source)) cpSync(source, target, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
for (const tree of ['game', 'screenshots']) stageTree(tree);

// buildDossier reads the staged game/ and screenshots/ from the output dir and
// returns the dossier bytes exactly as the scorer recomputes them.
const dossier = buildDossier(outputDir, dossierCaps);
writeFileSync(join(outputDir, 'dossier.json'), dossier);
