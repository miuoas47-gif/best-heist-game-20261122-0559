// Velvet Vault — keyboard and mouse. WASD or arrows to move, Shift to run, C to sneak,
// E (held) to crack the safe, P to pause, M to mute, Space/Enter to confirm.
// A mouse click on the floor sets a walk target; a click anywhere confirms on menus.
// Every pressed action is queued once per keydown so menus never double-fire.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RETRY = 4;
export const ACTION_MUTE = 8;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  KeyC: 'sneak',
  KeyE: 'interact',
};

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;
  let target = null;

  function toGamePoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * FIELD.width,
      y: ((clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'Enter') {
      queued |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      queued |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      queued |= ACTION_RETRY;
    } else if (event.code === 'KeyM') {
      queued |= ACTION_MUTE;
    }
    const name = KEYMAP[event.code];
    if (name) {
      held.add(name);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    const name = KEYMAP[event.code];
    if (name) held.delete(name);
  });
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('pointerdown', (event) => {
    queued |= ACTION_CONFIRM;
    target = toGamePoint(event.clientX, event.clientY);
  });

  function direction() {
    let mx = 0;
    let my = 0;
    if (held.has('left')) mx -= 1;
    if (held.has('right')) mx += 1;
    if (held.has('up')) my -= 1;
    if (held.has('down')) my += 1;
    return { mx, my };
  }

  return {
    read() {
      const { mx, my } = direction();
      return {
        mx, my,
        run: held.has('run'),
        sneak: held.has('sneak'),
        interact: held.has('interact'),
        target,
      };
    },
    clearTarget() {
      target = null;
    },
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
  };
}
