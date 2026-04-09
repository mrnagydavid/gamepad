export type CellVisual = 'hidden' | 'revealed' | 'flagged' | 'question';

export interface Cell {
  mine: boolean;
  adjacent: number;   // 0-8, count of neighbouring mines
  visual: CellVisual;
}

export interface Difficulty {
  label: string;
  cols: number;
  rows: number;
  mines: number;
  landscape?: boolean;
}

export const DIFFICULTIES: Record<string, Difficulty> = {
  easy:   { label: 'Easy',   cols: 9,  rows: 9,  mines: 10 },
  medium: { label: 'Medium', cols: 16, rows: 16, mines: 40 },
  hard:   { label: 'Hard',   cols: 30, rows: 16, mines: 99, landscape: true },
};

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export interface MinesweeperState {
  grid: Cell[][];
  cols: number;
  rows: number;
  totalMines: number;
  status: GameStatus;
  flagCount: number;
  elapsedMs: number;
  firstClick: boolean; // true = mines not yet placed
}
