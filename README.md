# best-heist-game-20261122-0559

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/miuoas47-gif/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/miuoas47-gif/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

Vaultbreak — a top-down heist game: plan the approach, dodge patrolling guards and sweeping security cameras, crack the safe, grab the loot and reach the getaway van. Three levels, an alarm system, sneaking, and a deterministic verification run.

## Run it

```sh
node main.ts
# then open game/index.html in a desktop browser
```

`node main.ts` runs a deterministic verification pass (no arguments, exits 0): it proves every level is beatable with a breadth-first search, plans a loot route for each level, and writes `heist-report.json` plus copies of the screenshots into the output directory (`MAKEFUN_OUTPUT_DIR`, or `./out` by default). Two runs produce byte-identical output.

## How to play

- **WASD / Arrow keys** — move
- **Shift** — sneak (slower, harder to spot, silent)
- **E (hold)** — crack the safe
- **P** — pause · **M** — mute

Guards patrol fixed routes and chase you once they are sure they saw you. Cameras sweep back and forth and raise the alarm fast. Running makes noise guards can hear; sneaking keeps you a shadow. Grab every piece of loot — paintings, the diamond, the safe — then get to the glowing getaway pad. If the alarm hits 100%, the job is blown.

## The three jobs

1. **The Gallery** — lift the paintings and the diamond past three guards and two cameras.
2. **The Vault Floor** — the safe needs the manager's keycard. Find it first, then crack the safe.
3. **The Rooftop** — four guards, three cameras, one last score, no mistakes.

Score comes from loot value plus a time bonus against each level's par time, minus a penalty for the highest alarm you raised. Screenshots of the game running are in `screenshots/`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=6gvkzysc&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
