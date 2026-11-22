// Velvet Vault — everything the eye sees: the floor plan, the vision cones, the crew,
// the HUD with its alarm meter, and every screen (title, pause, busted, getaway, win).
// It paints only what the world state holds, so a staged screenshot is the real game.

import { TILE, COLS, ROWS, FIELD, FONT, PALETTES, GUARD, SIGHT, SAFE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_LEVEL = 'level';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = Math.round(FIELD.width * scale);
    canvas.height = Math.round(FIELD.height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  fit();
  window.addEventListener('resize', fit);

  function drawCone(x, y, angle, range, halfAngle, fill) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawLootIcon(x, y, kind, size, glow) {
    const s = size / 2;
    ctx.save();
    ctx.translate(x, y);
    if (glow) {
      ctx.beginPath();
      ctx.arc(0, 0, s + 8 + Math.sin(performance.now() / 300 + x) * 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 215, 106, 0.16)';
      ctx.fill();
    }
    if (kind === 'painting') {
      ctx.fillStyle = '#8a6b2f';
      ctx.fillRect(-s, -s * 0.8, s * 2, s * 1.6);
      ctx.fillStyle = '#3f6db3';
      ctx.fillRect(-s + 3, -s * 0.8 + 3, s * 2 - 6, s * 1.6 - 6);
      ctx.fillStyle = '#e8b64c';
      ctx.beginPath();
      ctx.arc(0, -1, s * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c4a72';
      ctx.fillRect(-s + 4, s * 0.3, s * 2 - 8, 3);
    } else if (kind === 'gold') {
      ctx.fillStyle = '#8a6b2f';
      for (let i = -1; i <= 1; i += 1) {
        ctx.fillRect(i * s * 0.7 - s * 0.32, -s * 0.5 + (i === 0 ? -4 : 2), s * 0.64, s * 0.5);
      }
      ctx.fillStyle = '#ffd76a';
      for (let i = -1; i <= 1; i += 1) {
        ctx.fillRect(i * s * 0.7 - s * 0.28, -s * 0.5 + (i === 0 ? -4 : 2) + 2, s * 0.56, s * 0.5 - 2);
      }
    } else {
      ctx.fillStyle = '#8ef2ff';
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.8, -s * 0.2);
      ctx.lineTo(s * 0.5, s * 0.8);
      ctx.lineTo(-s * 0.5, s * 0.8);
      ctx.lineTo(-s * 0.8, -s * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.8, -s * 0.2);
      ctx.lineTo(s * 0.8, -s * 0.2);
      ctx.moveTo(0, -s);
      ctx.lineTo(0, s * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFloor(state, pal) {
    const grid = state.level.map;
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        const ch = grid[ty][tx];
        const x = tx * TILE;
        const y = ty * TILE;
        if (ch === '#') continue;
        ctx.fillStyle = (tx + ty) % 2 === 0 ? pal.floorA : pal.floorB;
        ctx.fillRect(x, y, TILE, TILE);
        if (ch === ',') {
          ctx.fillStyle = pal.carpet;
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          ctx.strokeStyle = pal.carpetTrim;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 5, y + 5, TILE - 10, TILE - 10);
        }
        // faint tile grout
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
    }
  }

  function drawWalls(state, pal) {
    const grid = state.level.map;
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        if (grid[ty][tx] !== '#') continue;
        const x = tx * TILE;
        const y = ty * TILE;
        ctx.fillStyle = pal.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = pal.wallTop;
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y + 5, TILE, 2);
      }
    }
  }

  function drawCones(state, pal) {
    for (const cam of state.cameras) {
      drawCone(cam.x, cam.y, cam.angle, cam.range, SIGHT.cameraHalfAngle, cam.spotted ? pal.coneAlert : pal.cone);
    }
    for (const g of state.guards) {
      const fill = g.chasing ? pal.coneAlert : g.alert > 0.3 ? pal.coneAlert : pal.cone;
      drawCone(g.x, g.y, g.angle, SIGHT.guardRange, SIGHT.guardHalfAngle, fill);
    }
  }

  function drawGuard(g, pal) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.beginPath();
    ctx.arc(0, 0, GUARD.radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = g.chasing ? '#ff5a4a' : 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, GUARD.radius, 0, Math.PI * 2);
    ctx.fillStyle = pal.guard;
    ctx.fill();
    ctx.rotate(g.angle);
    ctx.fillStyle = pal.guardTrim;
    ctx.beginPath();
    ctx.moveTo(GUARD.radius + 6, 0);
    ctx.lineTo(GUARD.radius - 6, -7);
    ctx.lineTo(GUARD.radius - 6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.beginPath();
    ctx.arc(4, -4, 2.2, 0, Math.PI * 2);
    ctx.arc(4, 4, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (g.alert > 0.05) {
      const w = 34;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(g.x - w / 2, g.y - GUARD.radius - 14, w, 5);
      ctx.fillStyle = g.chasing ? '#ff5a4a' : '#ffd76a';
      ctx.fillRect(g.x - w / 2, g.y - GUARD.radius - 14, w * g.alert, 5);
    }
  }

  function drawCamera(cam, pal) {
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#20242e';
    ctx.fill();
    ctx.rotate(cam.angle);
    ctx.fillStyle = cam.spotted ? '#ff5a4a' : pal.camera;
    ctx.fillRect(0, -5, 20, 10);
    ctx.beginPath();
    ctx.arc(20, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = cam.spotted ? '#ff2e1e' : '#ff8a7a';
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(p, pal) {
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.moving) {
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill();
    }
    ctx.rotate(p.angle);
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-12, -13);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-12, 13);
    ctx.closePath();
    ctx.fillStyle = '#2e3a55';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fillStyle = pal.player;
    ctx.fill();
    ctx.fillStyle = pal.playerTrim;
    ctx.beginPath();
    ctx.arc(5, -3, 3, 0, Math.PI * 2);
    ctx.arc(5, 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.fillRect(8, -2, 6, 4);
    ctx.restore();
    if (p.sneaking) {
      ctx.strokeStyle = 'rgba(127, 212, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawHud(state, extra, pal) {
    const pad = 14;
    ctx.fillStyle = pal.panel;
    ctx.fillRect(0, 0, FIELD.width, 52);
    ctx.fillStyle = pal.hud;
    ctx.font = `700 17px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.level.name, pad, 27);
    ctx.font = `600 14px ${FONT}`;
    ctx.fillStyle = pal.hudDim;
    ctx.fillText(`LOOT ${state.lootTaken}/${state.lootTotal}`, 330, 27);
    if (state.hasKeycard) {
      ctx.fillStyle = '#8ef2ff';
      ctx.fillText('KEYCARD', 430, 27);
    }
    if (state.safeCracked) {
      ctx.fillStyle = '#ffd76a';
      ctx.fillText('SAFE CRACKED', 530, 27);
    }
    // alarm meter, centre
    const meterX = 700;
    const meterW = 240;
    ctx.fillStyle = pal.hudDim;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('ALARM', meterX - 10, 27);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(meterX, 17, meterW, 18);
    const alarmFrac = state.alarm / 100;
    ctx.fillStyle = alarmFrac < 0.5 ? '#e8b64c' : alarmFrac < 0.8 ? '#e07a2e' : '#e05246';
    ctx.fillRect(meterX, 17, meterW * alarmFrac, 18);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(meterX, 17, meterW, 18);
    ctx.fillStyle = pal.hud;
    ctx.textAlign = 'left';
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText(`${Math.round(state.alarm)}%`, meterX + meterW + 10, 27);
    ctx.textAlign = 'right';
    ctx.fillText(`TIME ${formatTime(state.time)}`, FIELD.width - 150, 27);
    ctx.fillText(`SCORE ${state.score}`, FIELD.width - pad, 27);
    // bottom hint bar
    ctx.fillStyle = pal.panel;
    ctx.fillRect(0, FIELD.height - 34, FIELD.width, 34);
    ctx.fillStyle = pal.hudDim;
    ctx.font = `600 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('WASD / arrows — move    ·    SHIFT — run (loud)    ·    C — sneak    ·    E — crack the safe (hold)    ·    Click — walk there    ·    P — pause    ·    M — mute', FIELD.width / 2, FIELD.height - 17);
    if (state.messageTime > 0 && state.message) {
      ctx.fillStyle = pal.panel;
      const w = ctx.measureText(state.message).width + 36;
      ctx.fillRect((FIELD.width - w) / 2, FIELD.height - 84, w, 32);
      ctx.fillStyle = '#ffd76a';
      ctx.font = `700 15px ${FONT}`;
      ctx.fillText(state.message, FIELD.width / 2, FIELD.height - 68);
    }
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(8, 8, 16, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent;
    ctx.font = `800 64px ${FONT}`;
    ctx.fillText(title, FIELD.width / 2, 250);
    ctx.fillStyle = '#f2ede4';
    ctx.font = `600 20px ${FONT}`;
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, 330 + i * 34);
    });
  }

  function draw(state, screen, extra) {
    const pal = PALETTES[state.level.palette];
    ctx.fillStyle = pal.floorA;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawFloor(state, pal);
    drawCones(state, pal);
    // loot, keycard, safe, exit
    for (const item of state.loot) {
      if (!item.taken) drawLootIcon(item.x, item.y, item.kind, 30, true);
    }
    if (state.keycard && !state.keycard.taken) {
      const k = state.keycard;
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.rotate(Math.sin(performance.now() / 400) * 0.15);
      ctx.fillStyle = '#8ef2ff';
      ctx.fillRect(-13, -8, 26, 16);
      ctx.fillStyle = '#123';
      ctx.fillRect(-9, -4, 10, 3);
      ctx.fillRect(-9, 2, 14, 3);
      ctx.restore();
    }
    if (state.safe) {
      const s = state.safe;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.fillStyle = s.cracked ? '#58d68d' : pal.safe;
      ctx.fillRect(-20, -18, 40, 36);
      ctx.strokeStyle = '#20242e';
      ctx.lineWidth = 2;
      ctx.strokeRect(-20, -18, 40, 36);
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#20242e';
      ctx.fill();
      ctx.strokeStyle = s.cracked ? '#58d68d' : '#ffd76a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(7, -5);
      ctx.stroke();
      if (!s.cracked && s.progress > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-22, -30, 44, 7);
        ctx.fillStyle = '#ffd76a';
        ctx.fillRect(-22, -30, 44 * (s.progress / SAFE.crackSeconds), 7);
      }
      ctx.restore();
    }
    if (state.exit) {
      const e = state.exit;
      const pulse = 0.6 + Math.sin(performance.now() / 280) * 0.25;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.fillStyle = e.active ? `rgba(88, 214, 141, ${0.25 * pulse + 0.15})` : 'rgba(255,255,255,0.07)';
      ctx.fill();
      ctx.strokeStyle = e.active ? '#58d68d' : '#8b93a3';
      ctx.lineWidth = 3;
      ctx.strokeRect(-18, -18, 36, 36);
      ctx.fillStyle = e.active ? '#58d68d' : '#8b93a3';
      ctx.font = `800 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.active ? 'EXIT' : 'LOCK', 0, 1);
      ctx.restore();
    }
    drawWalls(state, pal);
    for (const cam of state.cameras) drawCamera(cam, pal);
    for (const g of state.guards) drawGuard(g, pal);
    drawPlayer(state.player, pal);
    for (const s of state.sparks) {
      ctx.fillStyle = `rgba(255, 215, 106, ${Math.max(0, s.life / s.max)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 26 * (1 - s.life / s.max) + 6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, extra, pal);

    if (screen === SCREEN_TITLE) {
      overlay('VELVET VAULT', [
        'A top-down heist in three jobs: the Gallery, the Vault Floor, the Rooftop.',
        'Dodge the guards and the cameras. Grab every loot. Crack the safe.',
        'Reach the glowing exit before the alarm hits 100%.',
        '',
        'Press SPACE or click to start  ·  Best total: ' + (extra.best || 0),
      ], '#e8b64c');
    } else if (screen === SCREEN_PAUSED) {
      overlay('PAUSED', ['Press P or SPACE to keep the heist going.'], '#e8b64c');
    } else if (screen === SCREEN_BUSTED) {
      overlay('BUSTED!', [
        state.bustedBy === 'caught' ? 'A guard grabbed you in the open.' : 'The alarm hit 100% — the whole building woke up.',
        `Attempts left on this job: ${extra.attemptsLeft}`,
        'Press R to run it back.',
      ], '#e05246');
    } else if (screen === SCREEN_LEVEL) {
      overlay('CLEAN GETAWAY!', [
        `${state.level.name} — loot ${state.lootTaken}/${state.lootTotal}${state.safeCracked ? ' · safe cracked' : ''}`,
        `Time bonus +${state.timeBonus || 0}   ·   Alarm penalty −${state.alarmPenalty || 0}`,
        `Level score ${state.score}   ·   Total ${extra.totalScore}`,
        'Press SPACE for the next job.',
      ], '#58d68d');
    } else if (screen === SCREEN_WIN) {
      overlay('THE PERFECT HEIST', [
        'All three jobs done. The crew retires rich.',
        `Total score ${extra.totalScore}   ·   Best ${extra.best}`,
        'Press SPACE to run it all again.',
      ], '#58d68d');
    } else if (screen === SCREEN_OVER) {
      overlay('THE CREW WALKS', [
        'Out of attempts. The vaults keep their secrets — this time.',
        `Total score ${extra.totalScore}`,
        'Press SPACE to start over.',
      ], '#e05246');
    }
  }

  return { draw, fit };
}
