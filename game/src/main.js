// Velvet Vault — boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between seven screens: title, play, paused,
// busted, level complete, heist complete and game over.
//
// ?seed=N fixes the level dressing. ?shot=cover|vault|title|rooftop (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { STEP, BEST_KEY, ATTEMPTS } from './config.js';
import { LEVELS } from './levels.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_LOOT, EVENT_KEYCARD, EVENT_CRACK, EVENT_SPOTTED, EVENT_BUSTED, EVENT_COMPLETE, EVENT_SAFE_DENIED } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RETRY, ACTION_MUTE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_BUSTED, SCREEN_LEVEL, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
void createRandom(seed);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function shotWorld(name) {
  const levelIndex = name === 'vault' ? 1 : name === 'rooftop' ? 2 : 0;
  return createWorld(LEVELS[levelIndex]);
}

function runShot(name) {
  const world = shotWorld(name);
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { best: scene.best, totalScore: scene.best, attemptsLeft: ATTEMPTS });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let levelIndex = 0;
  let world = createWorld(LEVELS[levelIndex]);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let totalScore = 0;
  let accumulator = 0;
  let last = performance.now();
  let crackTick = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startHeist() {
    levelIndex = 0;
    totalScore = 0;
    world = createWorld(LEVELS[levelIndex]);
    screen = SCREEN_PLAY;
    announce(`Playing. ${LEVELS[0].name}.`);
  }

  function startLevel(index) {
    levelIndex = index;
    world = createWorld(LEVELS[levelIndex]);
    world.state.attemptsLeft = ATTEMPTS;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LEVELS[levelIndex].name}.`);
  }

  function endLevel() {
    totalScore += world.state.score;
    if (totalScore > best) {
      best = totalScore;
      saveBest(best);
    }
    if (levelIndex + 1 >= LEVELS.length) {
      screen = SCREEN_WIN;
      announce(`The perfect heist. Total score ${totalScore}.`);
    } else {
      screen = SCREEN_LEVEL;
      announce(`Clean getaway. Total score ${totalScore}.`);
    }
  }

  function bustLevel() {
    audio.stopSiren();
    const left = world.state.attemptsLeft - 1;
    world.state.attemptsLeft = left;
    if (left <= 0) {
      screen = SCREEN_OVER;
      announce('Out of attempts. The crew walks.');
    } else {
      screen = SCREEN_BUSTED;
      announce(`Busted. ${left} attempts left on this job.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM) audio.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startHeist();
    } else if (screen === SCREEN_LEVEL) {
      if (actions & ACTION_CONFIRM) startLevel(levelIndex + 1);
    } else if (screen === SCREEN_BUSTED) {
      if (actions & (ACTION_CONFIRM | ACTION_RETRY)) startLevel(levelIndex);
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function playEvents(events) {
    if (events & EVENT_LOOT) audio.loot();
    if (events & EVENT_KEYCARD) audio.keycard();
    if (events & EVENT_CRACK) audio.crackDone();
    if (events & EVENT_SPOTTED) audio.spotted();
    if (events & EVENT_SAFE_DENIED) audio.denied();
    if (events & EVENT_BUSTED) {
      audio.busted();
      bustLevel();
    } else if (events & EVENT_COMPLETE) {
      audio.getaway();
      audio.stopSiren();
      endLevel();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { mx: 0, my: 0, run: false, sneak: false, interact: false, target: null });
      return;
    }
    const reading = input.read();
    if (reading.interact && world.state.safe && !world.state.safe.cracked && world.state.hasKeycard) {
      crackTick += STEP;
      if (crackTick > 0.25) {
        crackTick = 0;
        audio.crackTick();
      }
    } else {
      crackTick = 0;
    }
    const events = world.step(STEP, reading);
    audio.sirenTick(world.state.alarm / 100);
    playEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, { best, totalScore, attemptsLeft: world.state.attemptsLeft });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Velvet Vault. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
