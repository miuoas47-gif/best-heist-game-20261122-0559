// Vaultbreak — The Midnight Heist
// A top-down heist game: plan the approach, dodge patrolling guards and
// sweeping security cameras, grab the loot, crack the safe, and reach the
// getaway. Three levels, an alarm system, sneaking, and a scored run.
// Written fresh for the make.fun "Make the best heist game" bounty.
"use strict";

const TILE = 40;
const COLS = 24;
const ROWS = 15;
const VIEW_W = 960;
const VIEW_H = 600;

// ---------------------------------------------------------------- levels
// Map legend: # wall, . floor, P player start, E getaway exit,
// L painting (500), D diamond (1500), S safe (2000, hold E to crack),
// K keycard (needed to crack the safe on level 2),
// G guard spawn, C camera mount.
const LEVELS = [
  {
    name: "THE GALLERY",
    sub: "Lift the paintings. Don't wake the museum.",
    par: 75,
    theme: { floorA: "#2b2118", floorB: "#271e15", wall: "#4a3423", wallTop: "#6b4c30", accent: "#ffd76a", bg: "#14100a" },
    map: [
      "########################",
      "#P.....#......#........#",
      "#......#..L...#....G...#",
      "#..G...#......#...C....#",
      "#......#......#........#",
      "###.####..######.####..#",
      "#.......#.......#......#",
      "#...L.......L......D...#",
      "#.......#.......#......#",
      "###.#####.#######.###..#",
      "#......#......#........#",
      "#..G...#..C...#....L...#",
      "#......#......#........#",
      "#......#......#.....E..#",
      "########################",
    ],
    guards: [
      { x: 3, y: 3, waypoints: [[3, 1], [3, 13]], speed: 62 },
      { x: 19, y: 2, waypoints: [[16, 2], [22, 2]], speed: 58 },
      { x: 3, y: 11, waypoints: [[3, 9], [3, 13]], speed: 66 },
    ],
    cameras: [
      { x: 19, y: 3, base: -Math.PI / 2, sweep: 1.15, speed: 0.55, range: 205 },
      { x: 10, y: 11, base: Math.PI / 2, sweep: 1.05, speed: 0.65, range: 195 },
    ],
  },
  {
    name: "THE VAULT FLOOR",
    sub: "The safe needs the manager's keycard. Find it first.",
    par: 95,
    theme: { floorA: "#1d2836", floorB: "#1a2431", wall: "#33465c", wallTop: "#4a6484", accent: "#7ce7ff", bg: "#0a1018" },
    map: [
      "########################",
      "#P.....#......#........#",
      "#..K...#..G...#....L...#",
      "#......#......#........#",
      "#..G...#......#....C...#",
      "###.####..######.####..#",
      "#.......#.......#......#",
      "#...L.......S......D...#",
      "#.......#.......#......#",
      "###.#####.#######.###..#",
      "#......#......#........#",
      "#..G...#..C...#....L...#",
      "#......#......#........#",
      "#......#......#.....E..#",
      "########################",
    ],
    guards: [
      { x: 11, y: 2, waypoints: [[9, 2], [13, 2]], speed: 72 },
      { x: 3, y: 4, waypoints: [[3, 1], [3, 5]], speed: 68 },
      { x: 3, y: 11, waypoints: [[3, 9], [3, 13]], speed: 76 },
    ],
    cameras: [
      { x: 19, y: 4, base: -Math.PI / 2, sweep: 1.2, speed: 0.7, range: 210 },
      { x: 10, y: 11, base: Math.PI / 2, sweep: 1.1, speed: 0.8, range: 200 },
    ],
  },
  {
    name: "THE ROOFTOP",
    sub: "One last score. Four guards, three cameras, no mistakes.",
    par: 110,
    theme: { floorA: "#261d38", floorB: "#221a32", wall: "#3d2f5c", wallTop: "#584a7d", accent: "#ff8fd8", bg: "#0e0a18" },
    map: [
      "########################",
      "#P.....#......#........#",
      "#......#..G...#....L...#",
      "#..G...#......#....C...#",
      "#......#......#........#",
      "###.####..######.####..#",
      "#.......#.......#......#",
      "#...L.......S......D..G#",
      "#.......#.......#......#",
      "###.#####.#######.###..#",
      "#......#......#....C...#",
      "#..G...#..C...#....L...#",
      "#......#......#........#",
      "#......#......#.....E..#",
      "########################",
    ],
    guards: [
      { x: 11, y: 2, waypoints: [[9, 2], [13, 2]], speed: 84 },
      { x: 3, y: 3, waypoints: [[3, 1], [3, 4]], speed: 80 },
      { x: 3, y: 11, waypoints: [[3, 10], [3, 13]], speed: 88 },
      { x: 21, y: 7, waypoints: [[17, 7], [22, 7]], speed: 82 },
    ],
    cameras: [
      { x: 20, y: 3, base: -Math.PI / 2, sweep: 1.25, speed: 0.85, range: 215 },
      { x: 19, y: 10, base: Math.PI / 2, sweep: 1.15, speed: 0.9, range: 205 },
      { x: 10, y: 11, base: 0, sweep: 1.0, speed: 0.95, range: 200 },
    ],
  },
];

const LOOT_VALUE = { L: 500, D: 1500, S: 2000 };
const LOOT_NAME = { L: "Painting", D: "Diamond", S: "Safe contents" };

// ---------------------------------------------------------------- helpers
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}
function tileCenter(tx, ty) { return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 }; }

// ---------------------------------------------------------------- audio
let audioCtx = null;
let muted = false;
function beep(freq, dur, type, vol, when) {
  if (muted) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime + (when || 0);
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (e) { /* audio is best-effort */ }
}
function sfx(name) {
  if (name === "pickup") { beep(660, 0.09, "sine", 0.14); beep(990, 0.12, "sine", 0.12, 0.07); }
  else if (name === "keycard") { beep(520, 0.08, "square", 0.07); beep(780, 0.1, "square", 0.07, 0.08); }
  else if (name === "crack") { beep(180, 0.15, "sawtooth", 0.08); beep(1200, 0.2, "sine", 0.12, 0.1); }
  else if (name === "alarm") { beep(220, 0.18, "sawtooth", 0.1); }
  else if (name === "busted") { beep(320, 0.25, "sawtooth", 0.12); beep(180, 0.4, "sawtooth", 0.12, 0.22); }
  else if (name === "win") { [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.16, "sine", 0.13, i * 0.11)); }
  else if (name === "click") { beep(440, 0.05, "sine", 0.08); }
}

// ---------------------------------------------------------------- game state
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const ovTitle = document.getElementById("ov-title");
const ovSub = document.getElementById("ov-sub");
const ovBody = document.getElementById("ov-body");
const ovButtons = document.getElementById("ov-buttons");
const ovHint = document.getElementById("ov-hint");
const toastEl = document.getElementById("toast");

const hudLevel = document.getElementById("hud-level");
const hudLoot = document.getElementById("hud-loot");
const hudScore = document.getElementById("hud-score");
const hudTime = document.getElementById("hud-time");
const hudKeycard = document.getElementById("hud-keycard");
const alarmFill = document.getElementById("alarm-fill");

let screen = "title"; // title | playing | paused | levelComplete | busted | complete
let levelIndex = 0;
let level = null; // parsed level
let player = null;
let guards = [];
let cameras = [];
let loots = [];
let particles = [];
let floaters = [];
let keys = {};
let alarm = 0;
let peakAlarm = 0;
let levelTime = 0;
let totalScore = 0;
let levelScore = 0;
let hasKeycard = false;
let exitActive = false;
let bustedReason = "";
let levelStats = [];
let toastTimer = null;
let alarmBeepAt = 0;
let bestScore = 0;
try { bestScore = parseInt(localStorage.getItem("vaultbreak-best") || "0", 10) || 0; } catch (e) { bestScore = 0; }

function parseLevel(def) {
  const grid = def.map.map((row) => row.split(""));
  const parsed = { def, grid, start: { x: 60, y: 60 }, exit: null, lootSpots: [] };
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const c = (grid[y] && grid[y][x]) || "#";
      if (c === "P") { parsed.start = tileCenter(x, y); grid[y][x] = "."; }
      else if (c === "E") { parsed.exit = tileCenter(x, y); grid[y][x] = "."; }
      else if (c === "L" || c === "D" || c === "S" || c === "K") {
        parsed.lootSpots.push({ kind: c, x, y });
        grid[y][x] = ".";
      } else if (c === "G" || c === "C") { grid[y][x] = "."; }
    }
  }
  return parsed;
}

function isSolidTile(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return level.grid[ty][tx] === "#";
}
function isSolidPx(x, y) { return isSolidTile(Math.floor(x / TILE), Math.floor(y / TILE)); }

// Line of sight: sample along the segment, blocked by any wall tile.
function hasLOS(ax, ay, bx, by) {
  const d = dist(ax, ay, bx, by);
  const steps = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolidPx(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

function startLevel(idx) {
  levelIndex = idx;
  const def = LEVELS[idx];
  level = parseLevel(def);
  player = {
    x: level.start.x, y: level.start.y, r: 13,
    angle: 0, moving: false, sneaking: false, noise: 0,
  };
  guards = def.guards.map((g) => {
    const p = tileCenter(g.x, g.y);
    return {
      x: p.x, y: p.y, r: 13, speed: g.speed,
      waypoints: g.waypoints.map((w) => tileCenter(w[0], w[1])),
      wp: 0, pause: 0, angle: 0, seen: 0,
      mode: "patrol", lastSeen: null, lookAt: 0, stuck: 0, lx: p.x, ly: p.y,
    };
  });
  cameras = def.cameras.map((c) => {
    const p = tileCenter(c.x, c.y);
    return { x: p.x, y: p.y, base: c.base, sweep: c.sweep, speed: c.speed, range: c.range, t: Math.random() * 6, seen: 0 };
  });
  loots = level.lootSpots.map((s) => {
    const p = tileCenter(s.x, s.y);
    return { kind: s.kind, x: p.x, y: p.y, taken: false, crack: 0, bob: Math.random() * 6 };
  });
  particles = [];
  floaters = [];
  alarm = 0;
  peakAlarm = 0;
  levelTime = 0;
  levelScore = 0;
  hasKeycard = false;
  exitActive = false;
  bustedReason = "";
  screen = "playing";
  overlay.classList.add("hidden");
  updateHUD();
}

function lootRemaining() { return loots.filter((l) => !l.taken).length; }
function lootTotal() { return loots.length; }

function showToast(msg, ms) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms || 2200);
}

function spawnParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 130;
    particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 2 + Math.random() * 3 });
  }
}
function addFloater(x, y, text, color) { floaters.push({ x, y, text, color: color || "#ffd76a", life: 1.2 }); }

// ------------------------------------------------------------ movement
function moveCircle(ent, dx, dy) {
  const r = ent.r;
  let nx = ent.x + dx;
  if (!isSolidPx(nx + Math.sign(dx) * r, ent.y - r + 2) &&
      !isSolidPx(nx + Math.sign(dx) * r, ent.y) &&
      !isSolidPx(nx + Math.sign(dx) * r, ent.y + r - 2)) {
    ent.x = nx;
  }
  let ny = ent.y + dy;
  if (!isSolidPx(ent.x - r + 2, ny + Math.sign(dy) * r) &&
      !isSolidPx(ent.x, ny + Math.sign(dy) * r) &&
      !isSolidPx(ent.x + r - 2, ny + Math.sign(dy) * r)) {
    ent.y = ny;
  }
}

// ------------------------------------------------------------ detection
function canSee(viewer, range, fov, px, py) {
  const d = dist(viewer.x, viewer.y, px, py);
  if (d > range) return 0;
  const ang = Math.atan2(py - viewer.y, px - viewer.x);
  if (Math.abs(angleDiff(ang, viewer.angle)) > fov / 2) return 0;
  if (!hasLOS(viewer.x, viewer.y, px, py)) return 0;
  return 1 - (d / range) * 0.55; // closer = seen faster
}

function updateGuard(g, dt) {
  const px = player.x, py = player.y;
  const vis = canSee(g, 175, 1.25, px, py);
  const rate = vis > 0 ? (player.sneaking ? 30 : 62) * vis : 0;
  if (vis > 0) {
    g.seen = clamp(g.seen + rate * dt, 0, 100);
    if (g.seen > 55) { g.mode = "chase"; g.lastSeen = { x: px, y: py }; }
    else if (g.seen > 18 && g.mode === "patrol") { g.mode = "suspicious"; g.lastSeen = { x: px, y: py }; }
  } else {
    g.seen = clamp(g.seen - 26 * dt, 0, 100);
    if (g.mode === "chase" && g.seen <= 0) { g.mode = "suspicious"; g.lastSeen = { x: g.x, y: g.y }; g.lookAt = 1.4; }
  }
  // Noise: running nearby draws a patrol guard's attention.
  if (g.mode === "patrol" && player.moving && !player.sneaking) {
    const nd = dist(g.x, g.y, px, py);
    if (nd < 95 && hasLOS(g.x, g.y, px, py)) { g.mode = "suspicious"; g.lastSeen = { x: px, y: py }; }
  }

  if (g.mode === "patrol") {
    if (g.pause > 0) { g.pause -= dt; }
    else {
      const t = g.waypoints[g.wp];
      const d = dist(g.x, g.y, t.x, t.y);
      if (d < 6) { g.wp = (g.wp + 1) % g.waypoints.length; g.pause = 0.7; }
      else {
        const a = Math.atan2(t.y - g.y, t.x - g.x);
        g.angle = a;
        moveCircle(g, Math.cos(a) * g.speed * dt, Math.sin(a) * g.speed * dt);
      }
    }
  } else if (g.mode === "suspicious") {
    const t = g.lastSeen || { x: g.x, y: g.y };
    const d = dist(g.x, g.y, t.x, t.y);
    if (d > 10) {
      const a = Math.atan2(t.y - g.y, t.x - g.x);
      g.angle = a;
      moveCircle(g, Math.cos(a) * g.speed * 1.25 * dt, Math.sin(a) * g.speed * 1.25 * dt);
    } else if (g.lookAt > 0) {
      g.lookAt -= dt;
      g.angle += dt * 1.8;
    } else { g.mode = "patrol"; }
  } else if (g.mode === "chase") {
    const a = Math.atan2(py - g.y, px - g.x);
    g.angle = a;
    const ox = g.x, oy = g.y;
    moveCircle(g, Math.cos(a) * g.speed * 2.35 * dt, Math.sin(a) * g.speed * 2.35 * dt);
    if (dist(g.x, g.y, ox, oy) < 1.5) { g.stuck += dt; if (g.stuck > 1.1) { g.mode = "suspicious"; g.stuck = 0; } }
    else g.stuck = 0;
    if (dist(g.x, g.y, px, py) < 26) { bust("A guard grabbed you in the dark."); }
  }
}

function updateCamera(c, dt) {
  c.t += dt;
  c.angle = c.base + Math.sin(c.t * c.speed) * c.sweep;
  const vis = canSee(c, c.range, 0.95, player.x, player.y);
  if (vis > 0) {
    c.seen = clamp(c.seen + (player.sneaking ? 34 : 78) * vis * dt, 0, 100);
  } else {
    c.seen = clamp(c.seen - 30 * dt, 0, 100);
  }
}

// ------------------------------------------------------------ update
function update(dt) {
  if (screen !== "playing") return;
  levelTime += dt;

  // Player movement
  let mx = 0, my = 0;
  if (keys["arrowleft"] || keys["a"]) mx -= 1;
  if (keys["arrowright"] || keys["d"]) mx += 1;
  if (keys["arrowup"] || keys["w"]) my -= 1;
  if (keys["arrowdown"] || keys["s"]) my += 1;
  player.sneaking = !!(keys["shift"]);
  const speed = player.sneaking ? 88 : 158;
  player.moving = mx !== 0 || my !== 0;
  if (player.moving) {
    const len = Math.hypot(mx, my);
    const dx = (mx / len) * speed * dt;
    const dy = (my / len) * speed * dt;
    player.angle = Math.atan2(dy, dx);
    moveCircle(player, dx, dy);
  }

  // Guards and cameras
  let anySeen = false;
  let anyChase = false;
  let anyCamHot = false;
  for (const g of guards) {
    updateGuard(g, dt);
    if (g.seen > 0) anySeen = true;
    if (g.mode === "chase") anyChase = true;
  }
  for (const c of cameras) {
    updateCamera(c, dt);
    if (c.seen > 0) anySeen = true;
    if (c.seen > 35) anyCamHot = true;
  }
  // Alarm rises once per frame no matter how many watchers are on you,
  // so one bad moment is survivable and three is not an instant fail.
  if (anyChase) alarm = clamp(alarm + 30 * dt, 0, 100);
  if (anyCamHot) alarm = clamp(alarm + 34 * dt, 0, 100);
  if (anySeen) alarm = clamp(alarm + 6 * dt, 0, 100);
  else alarm = clamp(alarm - 5 * dt, 0, 100);
  peakAlarm = Math.max(peakAlarm, alarm);
  if (alarm >= 100) { bust("The alarm hit 100% — the building locked down."); return; }
  if (alarm > 70 && levelTime - alarmBeepAt > 0.9) { alarmBeepAt = levelTime; sfx("alarm"); }

  // Loot pickups
  for (const l of loots) {
    if (l.taken) continue;
    const d = dist(player.x, player.y, l.x, l.y);
    if (l.kind === "K") {
      if (d < 28) {
        l.taken = true; hasKeycard = true;
        addFloater(l.x, l.y - 18, "KEYCARD", "#7ce7ff");
        spawnParticles(l.x, l.y, "#7ce7ff", 14);
        sfx("keycard");
        showToast("Keycard acquired — the safe can be cracked now.");
      }
    } else if (l.kind === "S") {
      if (d < 40 && keys["e"]) {
        if (levelIndex === 1 && !hasKeycard) {
          showToast("LOCKED — this safe needs the manager's keycard.");
          l.crack = 0;
        } else {
          l.crack += dt / 2.5;
          if (Math.random() < 0.25) spawnParticles(l.x, l.y - 6, "#ffd76a", 1);
          if (l.crack >= 1) {
            l.taken = true; levelScore += LOOT_VALUE.S;
            addFloater(l.x, l.y - 18, "+2000 SAFE CRACKED", "#ffd76a");
            spawnParticles(l.x, l.y, "#ffd76a", 26);
            sfx("crack");
            showToast("Safe cracked! +2000");
          }
        }
      } else if (d >= 40) { l.crack = Math.max(0, l.crack - dt * 0.4); }
    } else {
      if (d < 28) {
        l.taken = true;
        const v = LOOT_VALUE[l.kind];
        levelScore += v;
        addFloater(l.x, l.y - 18, "+" + v + " " + LOOT_NAME[l.kind].toUpperCase(), "#ffd76a");
        spawnParticles(l.x, l.y, l.kind === "D" ? "#8ff5ff" : "#ffd76a", l.kind === "D" ? 22 : 14);
        sfx("pickup");
      }
    }
  }
  if (!exitActive && lootRemaining() === 0) {
    exitActive = true;
    showToast("All loot secured — get to the getaway!");
    sfx("win");
  }

  // Exit
  if (exitActive && level.exit && dist(player.x, player.y, level.exit.x, level.exit.y) < 34) {
    completeLevel();
    return;
  }

  // Particles and floaters
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt; }
  particles = particles.filter((p) => p.life > 0);
  for (const f of floaters) { f.y -= 26 * dt; f.life -= dt; }
  floaters = floaters.filter((f) => f.life > 0);

  updateHUD();
}

function bust(reason) {
  if (screen !== "playing") return;
  bustedReason = reason;
  screen = "busted";
  sfx("busted");
  spawnParticles(player.x, player.y, "#ff5a4c", 30);
  showBusted();
}

function completeLevel() {
  const par = LEVELS[levelIndex].par;
  const timeBonus = Math.max(0, Math.round(par - levelTime)) * 15;
  const alarmPenalty = Math.round(peakAlarm) * 2;
  const gained = levelScore + timeBonus - alarmPenalty;
  totalScore += gained;
  levelStats.push({
    name: LEVELS[levelIndex].name,
    time: levelTime, loot: levelScore,
    timeBonus, alarmPenalty, gained, peakAlarm: Math.round(peakAlarm),
  });
  if (levelIndex + 1 < LEVELS.length) {
    screen = "levelComplete";
    sfx("win");
    showLevelComplete(gained, timeBonus, alarmPenalty);
  } else {
    screen = "complete";
    sfx("win");
    if (totalScore > bestScore) {
      bestScore = totalScore;
      try { localStorage.setItem("vaultbreak-best", String(bestScore)); } catch (e) {}
    }
    showComplete();
  }
  updateHUD();
}

// ------------------------------------------------------------ HUD / overlays
function updateHUD() {
  const def = LEVELS[levelIndex];
  hudLevel.textContent = "LEVEL " + (levelIndex + 1) + " · " + def.name;
  hudLoot.textContent = "LOOT " + (lootTotal() - lootRemaining()) + "/" + lootTotal();
  hudScore.textContent = "SCORE " + (screen === "playing" ? totalScore + levelScore : totalScore);
  hudTime.textContent = fmtTime(levelTime);
  hudKeycard.classList.toggle("hidden", !hasKeycard);
  alarmFill.style.width = Math.round(alarm) + "%";
  alarmFill.style.background = alarm > 70
    ? "linear-gradient(90deg,#e2574c,#ff2e1f)"
    : "linear-gradient(90deg,#e8b93c,#e2574c)";
}

function setOverlay(title, sub, bodyHTML, buttons, hint) {
  ovTitle.textContent = title;
  ovSub.textContent = sub || "";
  ovBody.innerHTML = bodyHTML || "";
  ovButtons.innerHTML = "";
  (buttons || []).forEach((b) => {
    const btn = document.createElement("button");
    btn.textContent = b.label;
    if (b.ghost) btn.className = "ghost";
    btn.addEventListener("click", () => { sfx("click"); b.fn(); });
    ovButtons.appendChild(btn);
  });
  ovHint.textContent = hint || "";
  overlay.classList.remove("hidden");
}

function showTitle() {
  screen = "title";
  levelIndex = 0;
  level = parseLevel(LEVELS[0]);
  setOverlay(
    "VAULTBREAK",
    "The Midnight Heist",
    "<p>You are the crew's inside hand. Three jobs, one night: slip past the " +
    "guards, stay out of the camera cones, lift every piece of loot, crack the " +
    "safe — then walk out to the getaway van like you own the place.</p>" +
    "<p>Guards patrol fixed routes and chase you when they are sure. Cameras sweep " +
    "and raise the alarm fast. Run loud and guards hear you; <b>sneak</b> and you " +
    "stay a shadow. If the alarm hits 100%, the job is blown.</p>" +
    "<p class=\"keys\"><b>WASD / Arrows</b> move &nbsp; <b>Shift</b> sneak &nbsp; " +
    "<b>E</b> crack safe (hold) &nbsp; <b>P</b> pause &nbsp; <b>M</b> mute</p>" +
    (bestScore > 0 ? "<p style=\"text-align:center;color:#ffd76a\">Best score: " + bestScore + "</p>" : ""),
    [
      { label: "START THE HEIST", fn: () => startLevel(0) },
      { label: "LEVEL 2 · VAULT FLOOR", ghost: true, fn: () => startLevel(1) },
      { label: "LEVEL 3 · ROOFTOP", ghost: true, fn: () => startLevel(2) },
    ],
    "Best played with keyboard · 3 levels · no account needed"
  );
}

function showBusted() {
  setOverlay(
    "BUSTED",
    "The job is blown",
    "<p>" + bustedReason + "</p>" +
    "<p>Tip: watch the cones. Sneak (Shift) past cameras, wait for a guard's " +
    "back to turn, and never sprint within earshot.</p>",
    [
      { label: "RETRY LEVEL", fn: () => startLevel(levelIndex) },
      { label: "BACK TO TITLE", ghost: true, fn: () => showTitle() },
    ],
    "Alarm peaked at " + Math.round(peakAlarm) + "% · Loot kept: " + (lootTotal() - lootRemaining()) + "/" + lootTotal()
  );
}

function statRows(stats) {
  return stats.map((s) =>
    "<div class=\"stat-row\"><span>" + s.name + "</span><span>" + s.gained + " pts · " + fmtTime(s.time) + "</span></div>"
  ).join("");
}

function showLevelComplete(gained, timeBonus, alarmPenalty) {
  const next = LEVELS[levelIndex + 1];
  setOverlay(
    "CLEAN GETAWAY",
    LEVELS[levelIndex].name + " · cleared",
    "<div class=\"stat-row\"><span>Loot</span><span>+" + levelScore + "</span></div>" +
    "<div class=\"stat-row\"><span>Time bonus (par " + fmtTime(LEVELS[levelIndex].par) + ")</span><span>+" + timeBonus + "</span></div>" +
    "<div class=\"stat-row\"><span>Alarm penalty</span><span>−" + alarmPenalty + "</span></div>" +
    "<div class=\"stat-row\"><span>Level total</span><span>+" + gained + "</span></div>" +
    "<div class=\"stat-row\"><span>Running score</span><span>" + totalScore + "</span></div>",
    [
      { label: "NEXT: " + next.name, fn: () => startLevel(levelIndex + 1) },
      { label: "REPLAY LEVEL", ghost: true, fn: () => { totalScore -= gained; levelStats.pop(); startLevel(levelIndex); } },
    ],
    "Next job: " + next.sub
  );
}

function showComplete() {
  const totalTime = levelStats.reduce((a, s) => a + s.time, 0);
  setOverlay(
    "THE PERFECT HEIST",
    "All three jobs done. The crew eats tonight.",
    statRows(levelStats) +
    "<div class=\"stat-row\"><span>Total time</span><span>" + fmtTime(totalTime) + "</span></div>" +
    "<div class=\"stat-row\"><span>FINAL SCORE</span><span>" + totalScore + "</span></div>",
    [
      { label: "RUN IT AGAIN", fn: () => { totalScore = 0; levelStats = []; startLevel(0); } },
      { label: "BACK TO TITLE", ghost: true, fn: () => { totalScore = 0; levelStats = []; showTitle(); } },
    ],
    "Best score: " + bestScore
  );
}

// ------------------------------------------------------------ rendering
function drawVisionCone(x, y, angle, fov, range, color) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - fov / 2, angle + fov / 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function render() {
  if (!level) return;
  const t = level.def.theme;
  ctx.fillStyle = t.bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Floor
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? t.floorA : t.floorB;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }

  // Exit pad
  if (level.exit) {
    const pulse = exitActive ? 0.55 + Math.sin(performance.now() / 240) * 0.25 : 0.18;
    ctx.fillStyle = exitActive ? "rgba(80,255,140," + pulse + ")" : "rgba(120,120,120,0.18)";
    ctx.fillRect(level.exit.x - 20, level.exit.y - 20, 40, 40);
    ctx.strokeStyle = exitActive ? "#50ff8c" : "#666";
    ctx.lineWidth = 2;
    ctx.strokeRect(level.exit.x - 20, level.exit.y - 20, 40, 40);
    ctx.fillStyle = exitActive ? "#50ff8c" : "#888";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GETAWAY", level.exit.x, level.exit.y + 3);
    if (exitActive) {
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("▼", level.exit.x, level.exit.y - 26);
    }
  }

  // Loot
  const now = performance.now() / 300;
  for (const l of loots) {
    if (l.taken) continue;
    const bob = Math.sin(now + l.bob) * 2;
    if (l.kind === "L") {
      ctx.fillStyle = "#8a6d2f";
      ctx.fillRect(l.x - 13, l.y - 10 + bob, 26, 20);
      ctx.fillStyle = "#c9a227";
      ctx.fillRect(l.x - 11, l.y - 8 + bob, 22, 16);
      ctx.fillStyle = "#5b8c5a";
      ctx.fillRect(l.x - 7, l.y - 5 + bob, 14, 10);
      ctx.fillStyle = "#e8d27a";
      ctx.beginPath(); ctx.arc(l.x + 5, l.y - 5 + bob, 3, 0, Math.PI * 2); ctx.fill();
    } else if (l.kind === "D") {
      ctx.save();
      ctx.translate(l.x, l.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#8ff5ff";
      ctx.fillRect(-9, -9, 18, 18);
      ctx.fillStyle = "#d8fbff";
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    } else if (l.kind === "S") {
      ctx.fillStyle = "#3a3f4a";
      ctx.fillRect(l.x - 14, l.y - 14, 28, 28);
      ctx.fillStyle = "#565d6b";
      ctx.fillRect(l.x - 11, l.y - 11, 22, 22);
      ctx.beginPath(); ctx.arc(l.x, l.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd76a"; ctx.fill();
      ctx.beginPath(); ctx.arc(l.x, l.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#222"; ctx.fill();
      if (l.crack > 0) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(l.x - 18, l.y - 24, 36, 6);
        ctx.fillStyle = "#ffd76a";
        ctx.fillRect(l.x - 18, l.y - 24, 36 * l.crack, 6);
      }
    } else if (l.kind === "K") {
      ctx.fillStyle = "#1c5f7a";
      ctx.fillRect(l.x - 11, l.y - 7 + bob, 22, 14);
      ctx.fillStyle = "#7ce7ff";
      ctx.fillRect(l.x - 11, l.y - 7 + bob, 22, 4);
      ctx.fillStyle = "#dff8ff";
      ctx.font = "bold 8px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("KEY", l.x, l.y + 5 + bob);
    }
  }

  // Walls (after floor, before actors)
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (level.grid[y][x] !== "#") continue;
      ctx.fillStyle = t.wall;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      ctx.fillStyle = t.wallTop;
      ctx.fillRect(x * TILE, y * TILE, TILE, 4);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(x * TILE, y * TILE + TILE - 3, TILE, 3);
    }
  }

  // Vision cones (under actors)
  for (const c of cameras) {
    drawVisionCone(c.x, c.y, c.angle, 0.95, c.range, c.seen > 35 ? "rgba(255,60,40,0.20)" : "rgba(255,190,60,0.13)");
  }
  for (const g of guards) {
    const alerted = g.mode === "chase";
    drawVisionCone(g.x, g.y, g.angle, 1.25, 175, alerted ? "rgba(255,60,40,0.22)" : g.seen > 0 ? "rgba(255,170,40,0.16)" : "rgba(255,210,90,0.10)");
  }

  // Cameras
  for (const c of cameras) {
    ctx.fillStyle = "#22242e";
    ctx.beginPath(); ctx.arc(c.x, c.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.seen > 35 ? "#ff3c28" : "#ffd76a";
    ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + Math.cos(c.angle) * 14, c.y + Math.sin(c.angle) * 14); ctx.stroke();
  }

  // Guards
  for (const g of guards) {
    ctx.fillStyle = g.mode === "chase" ? "#a11f16" : "#2c2f3a";
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = g.mode === "chase" ? "#ff6a55" : "#565d6b";
    ctx.lineWidth = 2;
    ctx.stroke();
    // cap brim + facing tick
    ctx.fillStyle = g.mode === "chase" ? "#ff6a55" : "#7a8194";
    ctx.beginPath(); ctx.arc(g.x + Math.cos(g.angle) * 9, g.y + Math.sin(g.angle) * 9, 4, 0, Math.PI * 2); ctx.fill();
    if (g.seen > 0) {
      ctx.fillStyle = g.seen > 55 ? "#ff3c28" : "#ffd76a";
      ctx.fillRect(g.x - 13, g.y - 24, 26 * (g.seen / 100), 4);
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.strokeRect(g.x - 13, g.y - 24, 26, 4);
    }
    if (g.mode === "chase") {
      ctx.fillStyle = "#ff3c28";
      ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("!", g.x, g.y - 28);
    }
  }

  // Player
  if (player) {
    const p = player;
    ctx.fillStyle = player.sneaking ? "rgba(20,90,80,0.25)" : "rgba(20,120,110,0.18)";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#14b8a6";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#0b6b60";
    ctx.lineWidth = 2;
    ctx.stroke();
    // hood + facing
    ctx.fillStyle = "#0b3b35";
    ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 6, p.y + Math.sin(p.angle) * 6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e8fffb";
    ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 8, p.y + Math.sin(p.angle) * 8, 2.5, 0, Math.PI * 2); ctx.fill();
    if (player.sneaking) {
      ctx.fillStyle = "#9df2e6";
      ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("SNEAK", p.x, p.y - 22);
    }
  }

  // Particles
  for (const pt of particles) {
    ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  // Floaters
  ctx.textAlign = "center";
  for (const f of floaters) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.fillStyle = f.color;
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  // Alarm vignette
  if (alarm > 25 && screen === "playing") {
    const a = (alarm - 25) / 75;
    const grad = ctx.createRadialGradient(480, 300, 220, 480, 300, 520);
    grad.addColorStop(0, "rgba(255,40,20,0)");
    grad.addColorStop(1, "rgba(255,40,20," + (a * 0.45).toFixed(3) + ")");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // Safe-crack prompt
  if (screen === "playing") {
    const safe = loots.find((l) => l.kind === "S" && !l.taken && dist(player.x, player.y, l.x, l.y) < 40);
    if (safe) {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      const label = levelIndex === 1 && !hasKeycard ? "LOCKED — NEED KEYCARD" : "HOLD  E  TO CRACK THE SAFE";
      ctx.font = "bold 13px sans-serif";
      const w = ctx.measureText(label).width + 20;
      ctx.fillRect(safe.x - w / 2, safe.y - 44, w, 22);
      ctx.fillStyle = levelIndex === 1 && !hasKeycard ? "#ff8a7a" : "#ffd76a";
      ctx.textAlign = "center";
      ctx.fillText(label, safe.x, safe.y - 29);
    }
  }
}

// ------------------------------------------------------------ main loop
let lastT = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  if (screen === "playing") update(dt);
  render();
  requestAnimationFrame(loop);
}

// ------------------------------------------------------------ input
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  keys[k] = true;
  if (k === "m") { muted = !muted; document.getElementById("btn-mute").textContent = muted ? "SOUND OFF" : "SOUND ON"; }
  if (k === "p" || k === "escape") {
    if (screen === "playing") { screen = "paused"; setOverlay("PAUSED", "", "<p>Take a breath. The guards are still on their rounds.</p>", [{ label: "RESUME", fn: () => { screen = "playing"; overlay.classList.add("hidden"); } }, { label: "RESTART LEVEL", ghost: true, fn: () => startLevel(levelIndex) }], ""); }
    else if (screen === "paused") { screen = "playing"; overlay.classList.add("hidden"); }
  }
  if (k === "enter" && screen === "title") startLevel(0);
});
window.addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
document.getElementById("btn-mute").addEventListener("click", () => {
  muted = !muted;
  document.getElementById("btn-mute").textContent = muted ? "SOUND OFF" : "SOUND ON";
});
document.getElementById("btn-pause").addEventListener("click", () => {
  if (screen === "playing") { screen = "paused"; setOverlay("PAUSED", "", "<p>Take a breath. The guards are still on their rounds.</p>", [{ label: "RESUME", fn: () => { screen = "playing"; overlay.classList.add("hidden"); } }, { label: "RESTART LEVEL", ghost: true, fn: () => startLevel(levelIndex) }], ""); }
});

// Debug / automation hooks (used by the entry's own screenshot runs).
window.HEIST = {
  version: "vaultbreak-1.0.0",
  startLevel: (i) => startLevel(i),
  setAlarm: (v) => { alarm = clamp(v, 0, 100); peakAlarm = Math.max(peakAlarm, alarm); updateHUD(); },
  alertGuards: () => { for (const g of guards) { g.mode = "chase"; g.seen = 100; g.lastSeen = { x: player.x, y: player.y }; } },
  teleport: (tx, ty) => { const p = tileCenter(tx, ty); player.x = p.x; player.y = p.y; },
  state: () => ({ screen, levelIndex, alarm: Math.round(alarm), lootLeft: lootRemaining(), score: totalScore + levelScore, px: Math.round(player ? player.x : 0), py: Math.round(player ? player.y : 0) }),
};

// Boot: show the title screen over a rendered level 1 backdrop.
level = parseLevel(LEVELS[0]);
player = { x: level.start.x, y: level.start.y, r: 13, angle: 0, moving: false, sneaking: false, noise: 0 };
guards = LEVELS[0].guards.map((g) => {
  const p = tileCenter(g.x, g.y);
  return { x: p.x, y: p.y, r: 13, speed: g.speed, waypoints: g.waypoints.map((w) => tileCenter(w[0], w[1])), wp: 0, pause: 0, angle: -Math.PI / 2, seen: 0, mode: "patrol", lastSeen: null, lookAt: 0, stuck: 0, lx: p.x, ly: p.y };
});
cameras = LEVELS[0].cameras.map((c) => {
  const p = tileCenter(c.x, c.y);
  return { x: p.x, y: p.y, base: c.base, sweep: c.sweep, speed: c.speed, range: c.range, t: 0, seen: 0, angle: c.base };
});
loots = level.lootSpots.map((s) => {
  const p = tileCenter(s.x, s.y);
  return { kind: s.kind, x: p.x, y: p.y, taken: false, crack: 0, bob: 0 };
});
showTitle();
requestAnimationFrame(loop);
