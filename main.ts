// Vaultbreak — The Midnight Heist: deterministic verification entrypoint.
//
// The grader runs `node main.ts` with no arguments. This program:
//   1. reads the level maps out of game/game.js (single source of truth),
//   2. proves every level is beatable with a breadth-first search: every
//      loot item and the getaway exit are reachable from the player start,
//   3. plans a deterministic loot route for each level (nearest-first,
//      fixed tie-breaking, no randomness, no wall-clock time),
//   4. writes heist-report.json plus byte copies of screenshots/*.jpg into
//      the output directory (MAKEFUN_OUTPUT_DIR, or ./out by default).
//
// Everything here is deterministic: two runs on the same repository produce
// byte-identical outputs. No network, no randomness, no clock reads.
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT: string = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR: string = process.env.MAKEFUN_OUTPUT_DIR || path.join(ROOT, "out");
const GAME_JS: string = path.join(ROOT, "game", "game.js");
const SHOTS_DIR: string = path.join(ROOT, "screenshots");
const SEED: number = 20261122;
const VERSION: string = "vaultbreak-1.0.0";

const ROW_CHARS: RegExp = /^[#.PLDSKGCE]{24}$/;
const DIRS: Array<[number, number]> = [[1, 0], [0, 1], [-1, 0], [0, -1]];

interface LootSpot { kind: string; x: number; y: number }
interface LevelInfo {
  index: number;
  name: string;
  par: number;
  loot: LootSpot[];
  start: { x: number; y: number };
  exit: { x: number; y: number };
  solvable: boolean;
  route: Array<{ kind: string; to: [number, number]; steps: number }>;
  routeTiles: number;
}

function readLevels(): Array<{ name: string; par: number; rows: string[] }> {
  const src: string = fs.readFileSync(GAME_JS, "utf8");
  const names: string[] = [...src.matchAll(/name: "([A-Z ]+)"/g)].map((m) => m[1]);
  const pars: number[] = [...src.matchAll(/par: (\d+)/g)].map((m) => parseInt(m[1], 10));
  const rows: string[] = [...src.matchAll(/"([#.PLDSKGCE]{24})"/g)]
    .map((m) => m[1])
    .filter((r) => ROW_CHARS.test(r));
  if (names.length !== 3 || pars.length !== 3 || rows.length !== 45) {
    throw new Error(
      `unexpected level data in game.js: names=${names.length} pars=${pars.length} rows=${rows.length}`
    );
  }
  return names.map((name, i) => ({ name, par: pars[i], rows: rows.slice(i * 15, i * 15 + 15) }));
}

// Breadth-first search on the grid. Walls (#) are impassable; everything
// else (floor, loot, exit, spawns) is open. Returns the distance in tiles,
// or -1 when unreachable. Neighbour order is fixed, so ties are stable.
function bfs(rows: string[], from: [number, number], to: [number, number]): number {
  const seen: boolean[][] = rows.map((r) => r.split("").map(() => false));
  const queue: Array<[number, number, number]> = [[from[0], from[1], 0]];
  seen[from[1]][from[0]] = true;
  while (queue.length > 0) {
    const [x, y, d] = queue.shift() as [number, number, number];
    if (x === to[0] && y === to[1]) return d;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= 24 || ny >= 15) continue;
      if (seen[ny][nx] || rows[ny][nx] === "#") continue;
      seen[ny][nx] = true;
      queue.push([nx, ny, d + 1]);
    }
  }
  return -1;
}

function sha256(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function main(): void {
  const levels = readLevels();
  const reportLevels: LevelInfo[] = [];
  let allSolvable = true;

  for (let i = 0; i < levels.length; i++) {
    const { name, par, rows } = levels[i];
    let start: { x: number; y: number } | null = null;
    let exit: { x: number; y: number } | null = null;
    const loot: LootSpot[] = [];
    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 24; x++) {
        const c = rows[y][x];
        if (c === "P") start = { x, y };
        else if (c === "E") exit = { x, y };
        else if (c === "L" || c === "D" || c === "S" || c === "K") loot.push({ kind: c, x, y });
      }
    }
    if (!start || !exit) throw new Error(`level ${i + 1}: missing start or exit`);
    // The keycard is a tool, not loot: the route collects it first when present.
    const keycard = loot.find((l) => l.kind === "K") || null;
    const targets = loot.filter((l) => l.kind !== "K");
    const route: Array<{ kind: string; to: [number, number]; steps: number }> = [];
    let pos: [number, number] = [start.x, start.y];
    let routeTiles = 0;
    let solvable = true;
    const visit = (kind: string, tx: number, ty: number): void => {
      const d = bfs(rows, pos, [tx, ty]);
      if (d < 0) { solvable = false; return; }
      route.push({ kind, to: [tx, ty], steps: d });
      routeTiles += d;
      pos = [tx, ty];
    };
    if (keycard) visit("K", keycard.x, keycard.y);
    // Nearest-first over the remaining loot, ties broken by fixed list order.
    const remaining = [...targets];
    while (remaining.length > 0) {
      let best = 0;
      let bestD = Infinity;
      for (let j = 0; j < remaining.length; j++) {
        const d = bfs(rows, pos, [remaining[j].x, remaining[j].y]);
        if (d >= 0 && d < bestD) { bestD = d; best = j; }
      }
      if (bestD === Infinity) { solvable = false; break; }
      const next = remaining.splice(best, 1)[0];
      route.push({ kind: next.kind, to: [next.x, next.y], steps: bestD });
      routeTiles += bestD;
      pos = [next.x, next.y];
    }
    const exitD = bfs(rows, pos, [exit.x, exit.y]);
    if (exitD < 0) solvable = false;
    else { route.push({ kind: "E", to: [exit.x, exit.y], steps: exitD }); routeTiles += exitD; }
    if (!solvable) allSolvable = false;
    reportLevels.push({
      index: i + 1, name, par, loot, start, exit, solvable, route, routeTiles,
    });
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const shots: Array<{ file: string; bytes: number; sha256: string }> = [];
  if (fs.existsSync(SHOTS_DIR)) {
    const files = fs.readdirSync(SHOTS_DIR).filter((f) => f.toLowerCase().endsWith(".jpg")).sort();
    for (const f of files) {
      const src = path.join(SHOTS_DIR, f);
      const data = fs.readFileSync(src);
      fs.writeFileSync(path.join(OUT_DIR, f), data);
      shots.push({ file: f, bytes: data.length, sha256: sha256(src) });
    }
  }

  const report = {
    game: "Vaultbreak — The Midnight Heist",
    version: VERSION,
    seed: SEED,
    competition: "best-heist-game-20261122-0559",
    note: "Deterministic verification run: BFS solvability proof and loot route for every level, plus the game's screenshots.",
    levels: reportLevels,
    allSolvable,
    screenshots: shots,
    howToPlay: "Open game/index.html in a desktop browser. Move with WASD or arrow keys, hold Shift to sneak, hold E to crack a safe, grab every loot item, then reach the getaway.",
  };
  fs.writeFileSync(path.join(OUT_DIR, "heist-report.json"), JSON.stringify(report, null, 2) + "\n");

  const summary = `Vaultbreak ${VERSION}: ${reportLevels.length} levels, all solvable: ${allSolvable}, ` +
    `total route ${reportLevels.reduce((a, l) => a + l.routeTiles, 0)} tiles, ` +
    `${shots.length} screenshots copied to ${OUT_DIR}.`;
  console.log(summary);
  if (!allSolvable) {
    console.error("ERROR: at least one level is not solvable.");
    process.exit(1);
  }
}

main();
