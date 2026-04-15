import {
  type BangState, type Player, type GameMode, type CpuThink,
  GRAVITY, WIND_FACTOR, POWER_SCALE,
  BARREL_LEN, PROJECTILE_R,
  CRATER_RADIUS, CRATER_DEPTH,
  MAX_HP, ANGLE_MIN, ANGLE_MAX, POWER_MIN, POWER_MAX, HIT_RADIUS,
  CPU_THINK_MS, EXPLOSION_MS, SWITCH_MS,
  TERRAIN_MIN, TERRAIN_MAX, CANNON_MARGIN, FLAT_ZONE, TRAIL_LEN,
} from './types';

// --- Terrain generation ---

function generateTerrain(w: number, h: number): number[] {
  const t = new Array<number>(w).fill(0);
  t[0] = h * (TERRAIN_MIN + Math.random() * (TERRAIN_MAX - TERRAIN_MIN));
  t[w - 1] = h * (TERRAIN_MIN + Math.random() * (TERRAIN_MAX - TERRAIN_MIN));

  // Midpoint displacement
  const roughness = 0.45;
  const stack: [number, number][] = [[0, w - 1]];
  while (stack.length > 0) {
    const [l, r] = stack.pop()!;
    if (r - l <= 1) continue;
    const mid = Math.floor((l + r) / 2);
    const spread = ((r - l) / w) * h * roughness;
    t[mid] = (t[l] + t[r]) / 2 + (Math.random() - 0.5) * spread;
    stack.push([l, mid], [mid, r]);
  }

  // Smoothing (2 passes, 5px kernel)
  for (let pass = 0; pass < 2; pass++) {
    const copy = t.slice();
    for (let x = 2; x < w - 2; x++) {
      t[x] = (copy[x - 2] + copy[x - 1] + copy[x] + copy[x + 1] + copy[x + 2]) / 5;
    }
  }

  // Flatten cannon zones
  flattenZone(t, CANNON_MARGIN - FLAT_ZONE / 2, CANNON_MARGIN + FLAT_ZONE / 2);
  flattenZone(t, w - CANNON_MARGIN - FLAT_ZONE / 2, w - CANNON_MARGIN + FLAT_ZONE / 2);

  // Clamp
  const minY = h * 0.15;
  const maxY = h * 0.85;
  for (let x = 0; x < w; x++) {
    t[x] = Math.max(minY, Math.min(maxY, t[x]));
  }

  return t;
}

function flattenZone(t: number[], left: number, right: number): void {
  const l = Math.max(0, Math.floor(left));
  const r = Math.min(t.length - 1, Math.floor(right));
  let sum = 0;
  for (let x = l; x <= r; x++) sum += t[x];
  const avg = sum / (r - l + 1);
  for (let x = l; x <= r; x++) t[x] = avg;

  // Blend edges
  const blend = 10;
  for (let i = 1; i <= blend && l - i >= 0; i++) {
    const frac = i / (blend + 1);
    t[l - i] = t[l - i] * frac + avg * (1 - frac);
  }
  for (let i = 1; i <= blend && r + i < t.length; i++) {
    const frac = i / (blend + 1);
    t[r + i] = t[r + i] * frac + avg * (1 - frac);
  }
}

// --- State ---

export function createState(canvasW: number, canvasH: number, mode: GameMode): BangState {
  const terrain = generateTerrain(canvasW, canvasH);

  const p0x = CANNON_MARGIN;
  const p1x = canvasW - CANNON_MARGIN;

  const players: [Player, Player] = [
    { id: 0, x: p0x, cannonY: terrain[p0x], hp: MAX_HP, angle: 45, power: 50, isCpu: false },
    { id: 1, x: p1x, cannonY: terrain[p1x], hp: MAX_HP, angle: 45, power: 50, isCpu: mode === '1p' },
  ];

  return {
    terrain,
    players,
    currentPlayer: 0,
    phase: 'aiming',
    projectile: null,
    explosion: null,
    wind: (Math.random() - 0.5) * 2,
    mode,
    cpuThink: null,
    winner: null,
    shots: [0, 0],
    switchTimer: 0,
    canvasW,
    canvasH,
  };
}

// --- Actions ---

export function adjustAngle(state: BangState, delta: number): void {
  if (state.phase !== 'aiming') return;
  const p = state.players[state.currentPlayer];
  if (p.isCpu) return;
  p.angle = Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, p.angle + delta));
}

export function adjustPower(state: BangState, delta: number): void {
  if (state.phase !== 'aiming') return;
  const p = state.players[state.currentPlayer];
  if (p.isCpu) return;
  p.power = Math.max(POWER_MIN, Math.min(POWER_MAX, p.power + delta));
}

export function fire(state: BangState): void {
  if (state.phase !== 'aiming') return;
  const p = state.players[state.currentPlayer];
  if (p.isCpu) return;
  doFire(state);
}

function doFire(state: BangState): void {
  const p = state.players[state.currentPlayer];
  const dir = p.id === 0 ? 1 : -1;
  const rad = (p.angle * Math.PI) / 180;
  const vx = Math.cos(rad) * p.power * POWER_SCALE * dir;
  const vy = -Math.sin(rad) * p.power * POWER_SCALE;

  // Start projectile at barrel tip
  const startX = p.x + Math.cos(rad) * BARREL_LEN * dir;
  const startY = p.cannonY - Math.sin(rad) * BARREL_LEN;

  state.projectile = { x: startX, y: startY, vx, vy, trail: [] };
  state.shots[state.currentPlayer]++;
  state.phase = 'firing';
}

// --- CPU AI ---

function computeCpuShot(state: BangState): { angle: number; power: number } {
  const cpu = state.players[state.currentPlayer];
  const enemy = state.players[state.currentPlayer === 0 ? 1 : 0];
  const dir = cpu.id === 0 ? 1 : -1;

  let bestAngle = 45;
  let bestPower = 50;
  let bestDist = Infinity;

  // Brute-force search under current wind — finer grid than before
  for (let a = 10; a <= 80; a += 1) {
    for (let pw = 20; pw <= 95; pw += 2) {
      const rad = (a * Math.PI) / 180;
      let x = cpu.x + Math.cos(rad) * BARREL_LEN * dir;
      let y = cpu.cannonY - Math.sin(rad) * BARREL_LEN;
      let vx = Math.cos(rad) * pw * POWER_SCALE * dir;
      let vy = -Math.sin(rad) * pw * POWER_SCALE;

      for (let i = 0; i < 600; i++) {
        x += vx;
        y += vy;
        vy += GRAVITY;
        vx += state.wind * WIND_FACTOR;

        if (x < 0 || x >= state.canvasW || y > state.canvasH) break;
        const tx = Math.round(x);
        if (tx >= 0 && tx < state.terrain.length && y >= state.terrain[tx]) {
          const dist = Math.abs(x - enemy.x);
          if (dist < bestDist) {
            bestDist = dist;
            bestAngle = a;
            bestPower = pw;
          }
          break;
        }
      }
    }
  }

  // Error shrinks with shots fired — first shot is a rangefinder, later shots dial in.
  // Shot count resets each new game (createState zeroes `shots`).
  const shotsFired = state.shots[cpu.id];
  const angleErr = Math.max(2, 12 - shotsFired * 3);  // 12 → 9 → 6 → 3 → 2
  const powerErr = Math.max(3, 15 - shotsFired * 4);  // 15 → 11 → 7 → 3
  bestAngle += (Math.random() - 0.5) * angleErr * 2;
  bestPower += (Math.random() - 0.5) * powerErr * 2;
  bestAngle = Math.max(ANGLE_MIN, Math.min(ANGLE_MAX, Math.round(bestAngle)));
  bestPower = Math.max(POWER_MIN, Math.min(POWER_MAX, Math.round(bestPower)));

  return { angle: bestAngle, power: bestPower };
}

function initCpuThink(state: BangState): void {
  const p = state.players[state.currentPlayer];
  const shot = computeCpuShot(state);
  state.cpuThink = {
    targetAngle: shot.angle,
    targetPower: shot.power,
    startAngle: p.angle,
    startPower: p.power,
    elapsed: 0,
    duration: CPU_THINK_MS,
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// --- Crater ---

function carveCrater(state: BangState, impactX: number): void {
  const sigma = CRATER_RADIUS / 3;
  for (let x = Math.max(0, Math.floor(impactX - CRATER_RADIUS)); x <= Math.min(state.canvasW - 1, Math.ceil(impactX + CRATER_RADIUS)); x++) {
    const w = Math.exp(-((x - impactX) ** 2) / (2 * sigma * sigma));
    state.terrain[x] = Math.min(state.canvasH, state.terrain[x] + CRATER_DEPTH * w);
  }
  // Recalculate cannon Y
  for (const p of state.players) {
    p.cannonY = state.terrain[Math.round(p.x)];
  }
}

// --- Tick ---

export function tick(state: BangState, dtMs: number): void {
  if (state.phase === 'gameover') return;

  if (state.phase === 'aiming') {
    const p = state.players[state.currentPlayer];
    if (p.isCpu && state.cpuThink) {
      state.cpuThink.elapsed += dtMs;
      const t = Math.min(1, state.cpuThink.elapsed / state.cpuThink.duration);
      const e = easeInOutCubic(t);
      p.angle = Math.round(state.cpuThink.startAngle + (state.cpuThink.targetAngle - state.cpuThink.startAngle) * e);
      p.power = Math.round(state.cpuThink.startPower + (state.cpuThink.targetPower - state.cpuThink.startPower) * e);
      if (t >= 1) {
        state.cpuThink = null;
        doFire(state);
      }
    }
    return;
  }

  if (state.phase === 'firing') {
    const proj = state.projectile!;

    // Store trail
    proj.trail.push({ x: proj.x, y: proj.y });
    if (proj.trail.length > TRAIL_LEN) proj.trail.shift();

    proj.x += proj.vx;
    proj.y += proj.vy;
    proj.vy += GRAVITY;
    proj.vx += state.wind * WIND_FACTOR;

    // Out of bounds
    if (proj.x < 0 || proj.x >= state.canvasW || proj.y > state.canvasH + 50) {
      state.projectile = null;
      state.phase = 'switching';
      state.switchTimer = SWITCH_MS;
      return;
    }

    // Terrain collision
    const tx = Math.round(proj.x);
    if (tx >= 0 && tx < state.terrain.length && proj.y >= state.terrain[tx]) {
      // Check player hit
      for (const p of state.players) {
        if (Math.hypot(proj.x - p.x, proj.y - p.cannonY) < HIT_RADIUS) {
          p.hp = Math.max(0, p.hp - 1);
        }
      }

      carveCrater(state, proj.x);
      state.explosion = { x: proj.x, y: proj.y, timer: 0, duration: EXPLOSION_MS };
      state.projectile = null;
      state.phase = 'exploding';
    }

    // Direct cannon hit (projectile above terrain but within cannon hitbox)
    if (state.phase === 'firing') {
      for (const p of state.players) {
        if (Math.hypot(proj.x - p.x, proj.y - p.cannonY) < HIT_RADIUS * 0.7) {
          p.hp = Math.max(0, p.hp - 1);
          carveCrater(state, proj.x);
          state.explosion = { x: proj.x, y: proj.y, timer: 0, duration: EXPLOSION_MS };
          state.projectile = null;
          state.phase = 'exploding';
          break;
        }
      }
    }
    return;
  }

  if (state.phase === 'exploding') {
    state.explosion!.timer += dtMs;
    if (state.explosion!.timer >= state.explosion!.duration) {
      state.explosion = null;
      // Check for death
      for (const p of state.players) {
        if (p.hp <= 0) {
          state.winner = p.id === 0 ? 1 : 0;
          state.phase = 'gameover';
          return;
        }
      }
      state.phase = 'switching';
      state.switchTimer = SWITCH_MS;
    }
    return;
  }

  if (state.phase === 'switching') {
    state.switchTimer -= dtMs;
    if (state.switchTimer <= 0) {
      switchTurn(state);
    }
    return;
  }

}

function switchTurn(state: BangState): void {
  state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
  // New wind every full round (after both players have fired)
  if (state.currentPlayer === 0) {
    state.wind = (Math.random() - 0.5) * 2;
  }
  state.phase = 'aiming';
  const p = state.players[state.currentPlayer];
  if (p.isCpu) {
    initCpuThink(state);
  }
}
