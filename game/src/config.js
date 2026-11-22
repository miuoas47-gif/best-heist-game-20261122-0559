// Velvet Vault — every tuning number and colour in one place.
// The playfield is a fixed 1280x800 logical area (32x20 tiles of 40px); the renderer scales
// it to the window, so no rule below depends on the screen size.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 20;
export const FIELD = { width: COLS * TILE, height: ROWS * TILE };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Player movement: walk is the default, run is fast and loud, sneak is slow and quiet. */
export const THIEF = {
  radius: 14,
  walkSpeed: 175,
  runSpeed: 295,
  sneakSpeed: 95,
  /** Guards hear running from this far away (pixels). */
  noiseRadius: 175,
};

/** How a guard or camera spots the thief: cone range, half-angle and alarm gained per second. */
export const SIGHT = {
  guardRange: 235,
  guardHalfAngle: 0.66,
  cameraRange: 265,
  cameraHalfAngle: 0.58,
  /** Alarm points per second while the thief stands in a guard's cone. */
  guardRate: 58,
  /** Alarm points per second while the thief stands in a camera's cone. */
  cameraRate: 42,
  /** Sneaking halves how fast the alarm climbs; running raises it 1.5x. */
  sneakFactor: 0.5,
  runFactor: 1.5,
  /** Alarm drains this fast per second while nobody sees the thief. */
  decayPerSecond: 7,
};

/** A guard that has spotted the thief chases at this speed for up to this long. */
export const GUARD = {
  radius: 15,
  patrolSpeed: 78,
  chaseSpeed: 205,
  chaseSeconds: 4.5,
  /** Catching the thief within this distance busts the heist. */
  catchDistance: 27,
  /** How sure a guard must be (0..1) before it gives chase. */
  chaseThreshold: 0.72,
};

/** Hold-to-crack the safe once the keycard is in hand. */
export const SAFE = {
  crackSeconds: 3.0,
  bonusPoints: 1000,
  keycardBonus: 150,
};

/** Points for each piece of loot, and the level-clear time bonus. */
export const SCORE = {
  lootPoints: 250,
  /** Time bonus per second under par, and alarm points lost per alarm point at the exit. */
  timeBonusPerSecond: 12,
  alarmPenaltyPerPoint: 2,
};

/** Attempts per level before the whole heist is over. */
export const ATTEMPTS = 3;

export const PALETTES = {
  gallery: {
    floorA: '#23202e', floorB: '#272435', wall: '#17141f', wallTop: '#3b3450',
    carpet: '#5a2e3a', carpetTrim: '#8a5a44', accent: '#e8b64c',
    cone: 'rgba(232, 182, 76, 0.20)', coneAlert: 'rgba(224, 82, 70, 0.30)',
    guard: '#c94f43', guardTrim: '#f2ede4', camera: '#9aa3b2', safe: '#7d8aa0',
    loot: '#ffd76a', exit: '#58d68d', player: '#7fd4ff', playerTrim: '#eaf6ff',
    hud: '#f2ede4', hudDim: '#9a93a8', panel: 'rgba(16, 13, 24, 0.86)',
  },
  vault: {
    floorA: '#1d2426', floorB: '#21282b', wall: '#101516', wallTop: '#37474a',
    carpet: '#234434', carpetTrim: '#c9a227', accent: '#c9a227',
    cone: 'rgba(201, 162, 39, 0.20)', coneAlert: 'rgba(224, 82, 70, 0.30)',
    guard: '#c94f43', guardTrim: '#f2ede4', camera: '#9aa3b2', safe: '#b8c4cc',
    loot: '#ffd76a', exit: '#58d68d', player: '#7fd4ff', playerTrim: '#eaf6ff',
    hud: '#eef2e8', hudDim: '#8b9a8f', panel: 'rgba(10, 15, 14, 0.86)',
  },
  rooftop: {
    floorA: '#191d2e', floorB: '#1c2136', wall: '#0e1120', wallTop: '#2e3a5e',
    carpet: '#2b3a55', carpetTrim: '#7fb2ff', accent: '#7fb2ff',
    cone: 'rgba(127, 178, 255, 0.22)', coneAlert: 'rgba(224, 82, 70, 0.32)',
    guard: '#d06048', guardTrim: '#f2ede4', camera: '#c7d2e8', safe: '#8b98b8',
    loot: '#8ef2ff', exit: '#58d68d', player: '#7fd4ff', playerTrim: '#eaf6ff',
    hud: '#e8ecf7', hudDim: '#8b93b5', panel: 'rgba(10, 12, 26, 0.88)',
  },
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best total is kept between visits (this browser only). */
export const BEST_KEY = 'velvet-vault.best';
