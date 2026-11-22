// Velvet Vault — the staged scenes behind ?shot=cover|vault|title|rooftop.
// Each one plays the real rules forward from a fresh world: a scripted walk (the same
// steering the autopilot would use, tile waypoint by tile waypoint) drives the thief
// across the room, guards patrol, cameras sweep, and the frame is what that moment of
// a real heist looks like. The same seed always gives the same frame.

import { STEP, TILE, SCORE } from './config.js';
import { EVENT_BUSTED } from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

const DRIVE_MAX_STEPS = 3600;

function centre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

/** Steer the thief along tile waypoints with the real movement rules. */
function drive(world, waypoints, sneak) {
  let index = 0;
  for (let step = 0; step < DRIVE_MAX_STEPS; step += 1) {
    if (world.state.busted || world.state.finished) return false;
    const goal = centre(waypoints[index][0], waypoints[index][1]);
    const dx = goal.x - world.state.player.x;
    const dy = goal.y - world.state.player.y;
    if (Math.hypot(dx, dy) < 12) {
      index += 1;
      if (index >= waypoints.length) return true;
      continue;
    }
    const d = Math.hypot(dx, dy);
    const events = world.step(STEP, { mx: dx / d, my: dy / d, run: false, sneak, interact: false, target: null });
    if (events & EVENT_BUSTED) return false;
  }
  return false;
}

/** Try the walk; a busted run retries quieter, then falls back to standing the thief there. */
function stageWalk(world, waypoints, standAt) {
  for (const sneak of [false, true]) {
    world.reset();
    if (drive(world, waypoints, sneak)) return true;
  }
  world.reset();
  const spot = centre(standAt[0], standAt[1]);
  world.state.player.x = spot.x;
  world.state.player.y = spot.y;
  return false;
}

function idle(world, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    world.step(STEP, { mx: 0, my: 0, run: false, sneak: false, interact: false, target: null });
  }
}

/**
 * Set `world` (already the right level) to the named scene and return the screen to
 * draw over it and the best score to show. Names: cover, vault, title, rooftop.
 */
export function stageShot(name, world) {
  if (name === 'title') {
    world.reset();
    idle(world, 4);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'vault') {
    stageWalk(world, [
      [2, 18], [2, 17], [8, 17], [9, 17], [11, 17], [11, 15], [10, 15], [10, 14], [10, 11],
      [14, 11], [14, 10], [15, 10], [16, 10], [16, 12], [20, 12], [20, 11],
      [23, 11], [24, 11], [24, 17], [27, 17],
    ], [27, 17]);
    // The thief reached the safe with the keycard: hold E and crack it halfway.
    for (let i = 0; i < 1.8 / STEP; i += 1) {
      world.step(STEP, { mx: 0, my: 0, run: false, sneak: false, interact: true, target: null });
      if (world.state.busted) break;
    }
    if (!world.state.busted) world.state.alarm = 35;
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'rooftop') {
    stageWalk(world, [
      [2, 2], [2, 8], [13, 8], [13, 13], [25, 13], [25, 16], [28, 16], [28, 17],
    ], [28, 17]);
    if (!world.state.busted) {
      // The last diamonds sit off the walked route; the frame shows the getaway
      // with the full haul, so mark the haul complete and light the exit.
      for (const item of world.state.loot) item.taken = true;
      world.state.lootTaken = world.state.lootTotal;
      world.state.exit.active = true;
      world.state.alarm = 18;
      world.state.score = world.state.lootTotal * SCORE.lootPoints;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // cover: the gallery, mid-crossing — the thief slips up the west wing, through the
  // door and across the hall to the keycard, a guard's cone sweeping past, cameras
  // turning, paintings on the walls, alarm half up.
  stageWalk(world, [
    [2, 17], [2, 4], [8, 4], [9, 4], [9, 9], [16, 9],
  ], [16, 9]);
  if (!world.state.busted) world.state.alarm = 42;
  return { screen: SCREEN_PLAY, best: world.state.score };
}
