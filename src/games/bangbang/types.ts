export type TurnPhase = 'aiming' | 'firing' | 'exploding' | 'switching' | 'gameover';
export type GameMode = '1p' | '2p';

export interface Player {
  id: 0 | 1;
  x: number;
  cannonY: number;
  hp: number;
  angle: number;
  power: number;
  isCpu: boolean;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
}

export interface Explosion {
  x: number;
  y: number;
  timer: number;
  duration: number;
}

export interface CpuThink {
  targetAngle: number;
  targetPower: number;
  startAngle: number;
  startPower: number;
  elapsed: number;
  duration: number;
}

export interface BangState {
  terrain: number[];
  players: [Player, Player];
  currentPlayer: 0 | 1;
  phase: TurnPhase;
  projectile: Projectile | null;
  explosion: Explosion | null;
  wind: number;
  mode: GameMode;
  cpuThink: CpuThink | null;
  winner: 0 | 1 | null;
  shots: [number, number]; // shots fired per player
  switchTimer: number;
  canvasW: number;
  canvasH: number;
}

// Physics
export const GRAVITY = 0.15;
export const WIND_FACTOR = 0.06;
export const POWER_SCALE = 0.14;

// Cannon
export const CANNON_W = 20;
export const CANNON_H = 12;
export const BARREL_LEN = 22;
export const PROJECTILE_R = 3;

// Crater
export const CRATER_RADIUS = 35;
export const CRATER_DEPTH = 30;

// Gameplay
export const MAX_HP = 3;
export const ANGLE_MIN = 0;
export const ANGLE_MAX = 90;
export const ANGLE_STEP = 1;
export const POWER_MIN = 10;
export const POWER_MAX = 100;
export const POWER_STEP = 2;
export const HIT_RADIUS = 25;

// Timing
export const CPU_THINK_MS = 1200;
export const EXPLOSION_MS = 400;
export const SWITCH_MS = 600;

// Terrain generation
export const TERRAIN_MIN = 0.3;
export const TERRAIN_MAX = 0.6;
export const CANNON_MARGIN = 50;
export const FLAT_ZONE = 50;
export const TRAIL_LEN = 20;
