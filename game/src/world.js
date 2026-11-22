// Velvet Vault — the heist simulation: one fixed-step world per level.
// The thief moves, guards patrol and chase, cameras sweep, the alarm climbs while the
// thief is seen and drains while hidden. Loot, the keycard, the safe and the getaway
// are all in here; the renderer only paints this state, and the audio only listens to it.

import { TILE, COLS, ROWS, STEP, THIEF, SIGHT, GUARD, SAFE, SCORE } from './config.js';

export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_KEYCARD = 2;
export const EVENT_CRACK = 4;
export const EVENT_SPOTTED = 8;
export const EVENT_BUSTED = 16;
export const EVENT_COMPLETE = 32;
export const EVENT_SAFE_DENIED = 64;

const TAU = Math.PI * 2;

function tileCentre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function createWorld(level) {
  const grid = level.map.map((row) => [...row]);
  let state = null;

  function isWallTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
    return grid[ty][tx] === '#';
  }

  /** True when a circle of `radius` at (x, y) overlaps any wall tile. */
  function hitsWall(x, y, radius) {
    const x0 = Math.floor((x - radius) / TILE);
    const x1 = Math.floor((x + radius) / TILE);
    const y0 = Math.floor((y - radius) / TILE);
    const y1 = Math.floor((y + radius) / TILE);
    for (let ty = y0; ty <= y1; ty += 1) {
      for (let tx = x0; tx <= x1; tx += 1) {
        if (!isWallTile(tx, ty)) continue;
        const cx = clamp(x, tx * TILE, tx * TILE + TILE);
        const cy = clamp(y, ty * TILE, ty * TILE + TILE);
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < radius * radius) return true;
      }
    }
    return false;
  }

  /** Line of sight: sample the ray; a wall tile anywhere along it blocks the view. */
  function lineOfSight(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / 8));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      if (isWallTile(Math.floor((x1 + dx * t) / TILE), Math.floor((y1 + dy * t) / TILE))) return false;
    }
    return true;
  }

  /** Move a circle with wall sliding, axis by axis. */
  function slideMove(body, dx, dy, radius) {
    const nx = body.x + dx;
    if (!hitsWall(nx, body.y, radius)) body.x = nx;
    const ny = body.y + dy;
    if (!hitsWall(body.x, ny, radius)) body.y = ny;
  }

  function scanFor(entity, range, halfAngle) {
    const dx = state.player.x - entity.x;
    const dy = state.player.y - entity.y;
    const dist = Math.hypot(dx, dy);
    if (dist > range) return 0;
    const bearing = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(bearing, entity.angle)) > halfAngle) return 0;
    if (!lineOfSight(entity.x, entity.y, state.player.x, state.player.y)) return 0;
    return 1 - dist / (range * 1.25);
  }

  function reset() {
    const loot = [];
    let start = { x: 60, y: 60 };
    let keycard = null;
    let safe = null;
    let exit = null;
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        const c = tileCentre(tx, ty);
        if (grid[ty][tx] === 'P') start = c;
        else if (grid[ty][tx] === 'L') loot.push({ x: c.x, y: c.y, taken: false, kind: level.lootKind, bob: (tx * 7 + ty * 13) % 10 });
        else if (grid[ty][tx] === 'K') keycard = { x: c.x, y: c.y, taken: false };
        else if (grid[ty][tx] === 'S') safe = { x: c.x, y: c.y, cracked: false, progress: 0 };
        else if (grid[ty][tx] === 'E') exit = { x: c.x, y: c.y, active: false };
      }
    }
    state = {
      level,
      time: 0,
      alarm: 0,
      score: 0,
      lootTaken: 0,
      lootTotal: loot.length,
      hasKeycard: false,
      safeCracked: false,
      finished: false,
      busted: false,
      bustedBy: null,
      attemptsLeft: state ? state.attemptsLeft : 3,
      player: {
        x: start.x, y: start.y, angle: 0, moving: false,
        sneaking: false, running: false, speed: 0,
      },
      guards: level.guards.map((g) => {
        const points = g.waypoints.map(([tx, ty]) => tileCentre(tx, ty));
        return {
          points, index: 0, x: points[0].x, y: points[0].y,
          angle: 0, alert: 0, chasing: false, chaseTime: 0,
          investigate: null, speed: g.speed ?? GUARD.patrolSpeed,
          spotted: false, pause: 0,
        };
      }),
      cameras: level.cameras.map((c) => {
        const p = tileCentre(c.tx, c.ty);
        return {
          x: p.x, y: p.y, base: c.angle, sweep: c.sweep, speed: c.speed,
          range: c.range ?? SIGHT.cameraRange, angle: c.angle, phase: (c.tx * 3 + c.ty * 5) % 6,
          spotted: false,
        };
      }),
      loot, keycard, safe, exit,
      sparks: [],
      noisePulse: 0,
      message: '',
      messageTime: 0,
    };
  }

  /** One fixed step. `input` is {mx, my, run, sneak, interact, target} — see input.js. */
  function step(dt, input) {
    if (state.finished || state.busted) return EVENT_NONE;
    let events = EVENT_NONE;
    const p = state.player;
    state.time += dt;

    // --- the thief moves (keys, or a mouse click-to-move target) ---
    let mx = input.mx;
    let my = input.my;
    if ((mx === 0 && my === 0) && input.target) {
      const dx = input.target.x - p.x;
      const dy = input.target.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 10) {
        mx = dx / d;
        my = dy / d;
      } else {
        input.target = null;
      }
    }
    const len = Math.hypot(mx, my);
    if (len > 0) {
      mx /= len;
      my /= len;
    }
    p.sneaking = Boolean(input.sneak) && len > 0;
    p.running = Boolean(input.run) && len > 0 && !p.sneaking;
    p.speed = len === 0 ? 0 : p.sneaking ? THIEF.sneakSpeed : p.running ? THIEF.runSpeed : THIEF.walkSpeed;
    p.moving = len > 0;
    if (p.moving) p.angle = Math.atan2(my, mx);
    slideMove(p, mx * p.speed * dt, my * p.speed * dt, THIEF.radius);

    // Running is loud: guards nearby turn to investigate the noise.
    state.noisePulse = Math.max(0, state.noisePulse - dt);
    if (p.running && p.moving) {
      state.noisePulse = 0.12;
      for (const g of state.guards) {
        if (g.chasing) continue;
        const d = Math.hypot(g.x - p.x, g.y - p.y);
        if (d < THIEF.noiseRadius) g.investigate = { x: p.x, y: p.y };
      }
    }

    // --- cameras sweep and watch ---
    let seen = false;
    for (const cam of state.cameras) {
      cam.angle = cam.base + cam.sweep * Math.sin(state.time * cam.speed + cam.phase);
      const strength = scanFor(cam, cam.range, SIGHT.cameraHalfAngle);
      cam.spotted = strength > 0;
      if (strength > 0) {
        seen = true;
        const factor = p.sneaking ? SIGHT.sneakFactor : p.running ? SIGHT.runFactor : 1;
        state.alarm += SIGHT.cameraRate * factor * strength * dt;
      }
    }

    // --- guards patrol, investigate, chase and catch ---
    for (const g of state.guards) {
      const strength = scanFor(g, SIGHT.guardRange, SIGHT.guardHalfAngle);
      g.spotted = strength > 0;
      if (strength > 0) {
        seen = true;
        g.alert = clamp(g.alert + dt * 1.6, 0, 1);
        const factor = p.sneaking ? SIGHT.sneakFactor : p.running ? SIGHT.runFactor : 1;
        state.alarm += SIGHT.guardRate * factor * strength * dt;
        if (g.alert >= GUARD.chaseThreshold && !g.chasing) {
          g.chasing = true;
          g.chaseTime = GUARD.chaseSeconds;
          g.investigate = null;
        }
      } else {
        g.alert = clamp(g.alert - dt * 0.25, 0, 1);
      }

      if (g.chasing) {
        g.chaseTime -= dt;
        const dx = p.x - g.x;
        const dy = p.y - g.y;
        const d = Math.hypot(dx, dy);
        if (d > 1) {
          g.angle = Math.atan2(dy, dx);
          slideMove(g, (dx / d) * GUARD.chaseSpeed * dt, (dy / d) * GUARD.chaseSpeed * dt, GUARD.radius);
        }
        if (d < GUARD.catchDistance) {
          state.busted = true;
          state.bustedBy = 'caught';
          return events | EVENT_BUSTED;
        }
        if (g.chaseTime <= 0 || (g.alert < 0.15 && !g.spotted)) {
          g.chasing = false;
          g.investigate = null;
        }
      } else if (g.investigate) {
        const dx = g.investigate.x - g.x;
        const dy = g.investigate.y - g.y;
        const d = Math.hypot(dx, dy);
        if (d < 14) {
          g.investigate = null;
          g.pause = 1.2;
        } else {
          g.angle = Math.atan2(dy, dx);
          slideMove(g, (dx / d) * g.speed * 1.4 * dt, (dy / d) * g.speed * 1.4 * dt, GUARD.radius);
        }
      } else if (g.pause > 0) {
        g.pause -= dt;
      } else {
        const target = g.points[(g.index + 1) % g.points.length];
        const dx = target.x - g.x;
        const dy = target.y - g.y;
        const d = Math.hypot(dx, dy);
        if (d < 8) {
          g.index = (g.index + 1) % g.points.length;
        } else {
          g.angle = Math.atan2(dy, dx);
          slideMove(g, (dx / d) * g.speed * dt, (dy / d) * g.speed * dt, GUARD.radius);
        }
      }
    }

    // --- the alarm drains while nobody sees the thief ---
    if (!seen) state.alarm = Math.max(0, state.alarm - SIGHT.decayPerSecond * dt);
    if (state.alarm >= 100) {
      state.alarm = 100;
      state.busted = true;
      state.bustedBy = 'alarm';
      return events | EVENT_BUSTED;
    }
    if (seen && state.alarm > 25 && !state.spottedLatch) {
      state.spottedLatch = true;
      events |= EVENT_SPOTTED;
    }
    if (!seen) state.spottedLatch = false;

    // --- loot, keycard, safe ---
    for (const item of state.loot) {
      if (item.taken) continue;
      if (Math.hypot(item.x - p.x, item.y - p.y) < 32) {
        item.taken = true;
        state.lootTaken += 1;
        state.score += SCORE.lootPoints;
        events |= EVENT_LOOT;
        state.sparks.push({ x: item.x, y: item.y, life: 0.6, max: 0.6 });
      }
    }
    if (state.keycard && !state.keycard.taken && Math.hypot(state.keycard.x - p.x, state.keycard.y - p.y) < 32) {
      state.keycard.taken = true;
      state.hasKeycard = true;
      state.score += SAFE.keycardBonus;
      events |= EVENT_KEYCARD;
      state.sparks.push({ x: state.keycard.x, y: state.keycard.y, life: 0.6, max: 0.6 });
    }
    if (state.safe && !state.safe.cracked) {
      const d = Math.hypot(state.safe.x - p.x, state.safe.y - p.y);
      if (d < 62 && input.interact) {
        if (!state.hasKeycard) {
          if (!state.safe.deniedLatch) {
            state.safe.deniedLatch = true;
            events |= EVENT_SAFE_DENIED;
            state.message = 'Locked — find the keycard first';
            state.messageTime = 2.5;
          }
        } else {
          state.safe.progress += dt;
          if (state.safe.progress >= SAFE.crackSeconds) {
            state.safe.cracked = true;
            state.safeCracked = true;
            state.score += SAFE.bonusPoints;
            events |= EVENT_CRACK;
            state.sparks.push({ x: state.safe.x, y: state.safe.y, life: 0.9, max: 0.9 });
          }
        }
      } else {
        state.safe.deniedLatch = false;
        state.safe.progress = Math.max(0, state.safe.progress - dt * 0.5);
      }
    }

    // --- the getaway ---
    if (state.lootTaken === state.lootTotal) state.exit.active = true;
    if (state.exit.active && Math.hypot(state.exit.x - p.x, state.exit.y - p.y) < 36) {
      const timeBonus = Math.max(0, Math.round((level.par - state.time) * SCORE.timeBonusPerSecond));
      const alarmPenalty = Math.round(state.alarm * SCORE.alarmPenaltyPerPoint);
      state.score += timeBonus - alarmPenalty;
      state.timeBonus = timeBonus;
      state.alarmPenalty = alarmPenalty;
      state.finished = true;
      return events | EVENT_COMPLETE;
    }

    if (state.messageTime > 0) state.messageTime -= dt;
    for (const s of state.sparks) s.life -= dt;
    state.sparks = state.sparks.filter((s) => s.life > 0);
    return events;
  }

  reset();
  return {
    get state() {
      return state;
    },
    level,
    isWallTile,
    reset,
    step,
    STEP,
  };
}
