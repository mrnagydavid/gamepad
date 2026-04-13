export type Cell = 'empty' | 'border' | 'wall' | 'captured' | 'growing';

export type Axis = 'h' | 'v';
export type GameStatus = 'playing' | 'levelclear' | 'gameover';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GrowingWall {
  originRow: number;
  originCol: number;
  axis: Axis;
  /** Extent on each side; for 'h' these are col indices, for 'v' row indices. */
  leftEnd: number;
  rightEnd: number;
  leftDone: boolean;
  rightDone: boolean;
  growthTimer: number;
}

export interface JezzState {
  grid: Cell[][];
  cols: number;
  rows: number;
  cellSize: number;
  balls: Ball[];
  growing: GrowingWall | null;
  level: number;
  lives: number;
  capturedCount: number;
  totalCells: number;
  percent: number;
  status: GameStatus;
  canvasW: number;
  canvasH: number;
}

// Sizing
export const TARGET_CELL_SIZE = 18;
export const MIN_COLS = 14;
export const MIN_ROWS = 18;

// Gameplay
export const BALL_RADIUS_RATIO = 0.4; // fraction of cellSize
export const BALL_SPEED = 1.2;
export const WALL_GROWTH_MS = 80;
export const TARGET_PERCENT = 0.75;
export const LIVES_PER_LEVEL = 3;
export const SWIPE_THRESHOLD = 8;
export const HUD_H = 32;
