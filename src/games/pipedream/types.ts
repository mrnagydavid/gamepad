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
}

export type GameStatus = 'countdown' | 'playing' | 'over';

export interface PipeDreamState {
  grid: Cell[][];
  cols: number;
  rows: number;
  queue: PieceType[];         // upcoming pieces, index 0 = next
  sourceCol: number;
  sourceRow: number;
  sourceDir: Direction;       // direction flow exits the source
  flowHead: { r: number; c: number; enterDir: Direction } | null;
  flowTimer: number;          // ms until next flow step
  flowInterval: number;       // ms between flow steps (decreases over time)
  flowTiles: number;          // tiles successfully flowed through
  score: number;
  status: GameStatus;
  countdownMs: number;        // ms remaining in countdown before flow starts
  elapsedMs: number;
}

export const TARGET_CELL_SIZE = 48;
export const MIN_COLS = 5;
export const MIN_ROWS = 6;
export const QUEUE_SIZE = 5;
export const COUNTDOWN_MS = 5000;
export const INITIAL_FLOW_INTERVAL = 2000;
export const MIN_FLOW_INTERVAL = 400;
export const FLOW_SPEEDUP_TILES = 5; // speed up every N tiles
export const FLOW_SPEEDUP_AMOUNT = 150; // ms faster each step
export const CROSS_BONUS = 2;  // score multiplier for cross pieces
