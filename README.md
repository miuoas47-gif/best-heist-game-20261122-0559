# Velvet Vault

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/miuoas47-gif/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/miuoas47-gif/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Velvet Vault** is a top-down heist game that runs in a desktop browser from static
files — no network, no installs, no assets to download. You are the thief. Three jobs
stand between you and retirement: the Gallery, the Vault Floor, and the Rooftop.

Each job is a single room you have to cross. Guards patrol with visible vision cones
and give chase when they spot you; security cameras sweep the floor; every second
spent in a cone pushes the alarm meter up, and at 100% the heist is busted. Grab every
piece of loot, find the keycard, hold **E** to crack the safe, then reach the glowing
getaway exit before the alarm catches you. Walk is quiet, **Shift** runs fast and loud,
**C** sneaks slow and silent — and a mouse click walks you where you point.

- **3 levels** with distinct themes: an art gallery (paintings), a bank vault floor
  (gold bars), a night rooftop (diamonds under searchlights)
- **Guards** with patrol routes, vision cones, alert meters, investigation and chase
- **Rotating security cameras** with sweeping vision cones
- **Alarm meter** that rises while you are seen and drains while you hide
- **Keycard-gated safe** to crack (hold-to-interact) plus a loot quota that unlocks
  the glowing getaway exit
- **Scoring** with a time bonus and an alarm penalty, 3 attempts per level
- **Synthesized WebAudio sound** — loot blips, safe-cracking ticks, a siren that
  swells with the alarm, a getaway arpeggio (M mutes)
- Title, pause, busted, level-complete, heist-complete and game-over screens

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` directly from any static file server. `main.ts` (Node 22+)
stages the entry for the make.fun grader:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Run (fast, loud — guards hear it) |
| C | Sneak (slow, silent, half the alarm gain) |
| E (hold) | Crack the safe (needs the keycard) |
| Click | Walk to that spot |
| P | Pause |
| M | Mute |
| Space / Enter | Start, continue, retry |

---

<sub>Entered on [make.fun](https://make.fun/?ref=6gvkzysc&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
