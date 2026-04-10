/** Pipe piece types. Curves are named by which two sides they connect. */
export type PieceType =
  | 'horizontal'  // left ↔ right
  | 'vertical'    // top ↔ bottom
  | 'curve_tr'    // top ↔ right
  | 'curve_rb'    // right ↔ bottom
  | 'curve_bl'    // bottom ↔ left
  | 'curve_lt'    // left ↔ top
  | 'cross';      // two independent paths: left↔right AND top↔bottom

export type Direction = 'top' | 'right' | 'bottom' | 'left';

/** Which sides a piece connects. Cross has two independent pairs. */
export const PIECE_CONNECTIONS: Record<PieceType, [Direction, Direction][]> = {
  horizontal: [['left', 'right']],
  vertical:   [['top', 'bottom']],
  curve_tr:   [['top', 'right']],
  curve_rb:   [['right', 'bottom']],
  curve_bl:   [['bottom', 'left']],
  curve_lt:   [['left', 'top']],
  cross:      [['left', 'right'], ['top', 'bottom']],
};

export const ALL_PIECES: PieceType[] = [
  'horizontal', 'vertical',
  'curve_tr', 'curve_rb', 'curve_bl', 'curve_lt',
  'cross',
];

export interface Cell {
  piece: PieceType | null;
  /** Which connection paths are filled with flow (indices into PIECE_CONNECTIONS). */
  filledPaths: boolean[];
  /** Is the flow currently entering/filling this cell? */
  filling: boolean;
  fillProgress: number; // 0-1, for animation
  /** Direction flow entered this cell from (for fill animation). */
  enterDir: Direction | null;
  /** Blocked cell — cannot place pipes here. */
  blocked: boolean;
}

export type GameStatus = 'countdown' | 'playing' | 'won' | 'over';

export interface Difficulty {
  label: string;
  initialFlowInterval: number;
  minFlowInterval: number;
  speedupTiles: number;
  speedupAmount: number;
  countdownMs: number;
  /** 0-1: chance that a queue piece is biased toward the flow head direction. */
  helpfulBias: number;
}

export const DIFFICULTY: Difficulty = {
  label: 'Standard',
  initialFlowInterval: 1700,
  minFlowInterval: 400,
  speedupTiles: 2,
  speedupAmount: 60,
  countdownMs: 4000,
  helpfulBias: 0.1,
};

export interface PipeDreamState {
  grid: Cell[][];
  cols: number;
  rows: number;
  queue: PieceType[];
  sourceCol: number;
  sourceRow: number;
  sourceDir: Direction;
  flowHead: { r: number; c: number; enterDir: Direction } | null;
  flowTimer: number;
  flowInterval: number;
  flowTiles: number;
  score: number;
  status: GameStatus;
  countdownMs: number;
  elapsedMs: number;
  difficulty: Difficulty;
  level: number;
  targetPipes: number;  // minimum pipes to pass
}

/** Compute level parameters. */
export function levelParams(level: number): { targetPipes: number; blockedCount: number } {
  const targetPipes = 5 + level * 3;
  const blockedCount = Math.max(0, Math.floor((level - 1) * 2));
  return { targetPipes, blockedCount };
}

export const TARGET_CELL_SIZE = 48;
export const MIN_COLS = 5;
export const MIN_ROWS = 6;
export const QUEUE_SIZE = 5;
export const CROSS_BONUS = 2;
