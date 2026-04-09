import type { Cell, MinesweeperState, Difficulty } from './types';

export function createState(diff: Difficulty): MinesweeperState {
  const grid: Cell[][] = [];
  for (let r = 0; r < diff.rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < diff.cols; c++) {
      row.push({ mine: false, adjacent: 0, visual: 'hidden' });
    }
    grid.push(row);
  }
  return {
    grid,
    cols: diff.cols,
    rows: diff.rows,
    totalMines: diff.mines,
    status: 'idle',
    flagCount: 0,
    elapsedMs: 0,
    firstClick: true,
  };
}

function neighbours(r: number, c: number, rows: number, cols: number): [number, number][] {
  const out: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push([nr, nc]);
    }
  }
  return out;
}

/** Place mines, guaranteeing the clicked cell + its 8 neighbours are mine-free. */
function placeMines(state: MinesweeperState, safeR: number, safeC: number): void {
  const safeSet = new Set<string>();
  safeSet.add(`${safeR},${safeC}`);
  for (const [nr, nc] of neighbours(safeR, safeC, state.rows, state.cols)) {
    safeSet.add(`${nr},${nc}`);
  }

  const candidates: [number, number][] = [];
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (!safeSet.has(`${r},${c}`)) candidates.push([r, c]);
    }
  }

  // Fisher-Yates shuffle, pick first N
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (let i = 0; i < state.totalMines; i++) {
    const [r, c] = candidates[i];
    state.grid[r][c].mine = true;
  }

  // Compute adjacency counts
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.grid[r][c].mine) continue;
      let count = 0;
      for (const [nr, nc] of neighbours(r, c, state.rows, state.cols)) {
        if (state.grid[nr][nc].mine) count++;
      }
      state.grid[r][c].adjacent = count;
    }
  }
}

/** Flood-fill reveal from (r,c). */
function floodReveal(state: MinesweeperState, r: number, c: number): void {
  const stack: [number, number][] = [[r, c]];
  while (stack.length > 0) {
    const [cr, cc] = stack.pop()!;
    const cell = state.grid[cr][cc];
    if (cell.visual === 'revealed') continue;
    if (cell.visual === 'flagged' || cell.visual === 'question') continue;
    cell.visual = 'revealed';
    if (cell.adjacent === 0 && !cell.mine) {
      for (const [nr, nc] of neighbours(cr, cc, state.rows, state.cols)) {
        if (state.grid[nr][nc].visual !== 'revealed') {
          stack.push([nr, nc]);
        }
      }
    }
  }
}

function checkWin(state: MinesweeperState): boolean {
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.grid[r][c];
      if (!cell.mine && cell.visual !== 'revealed') return false;
    }
  }
  return true;
}

/** Reveal all mines (on loss). */
function revealMines(state: MinesweeperState): void {
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.grid[r][c].mine) {
        state.grid[r][c].visual = 'revealed';
      }
    }
  }
}

export function reveal(state: MinesweeperState, r: number, c: number): MinesweeperState {
  if (state.status === 'won' || state.status === 'lost') return state;
  const cell = state.grid[r][c];
  if (cell.visual === 'flagged' || cell.visual === 'question') return state;
  if (cell.visual === 'revealed') return state;

  if (state.firstClick) {
    placeMines(state, r, c);
    state.firstClick = false;
    state.status = 'playing';
  }

  if (cell.mine) {
    revealMines(state);
    state.status = 'lost';
    return state;
  }

  floodReveal(state, r, c);

  if (checkWin(state)) {
    state.status = 'won';
  }

  return state;
}

export function toggleFlag(state: MinesweeperState, r: number, c: number): MinesweeperState {
  if (state.status === 'won' || state.status === 'lost') return state;
  if (state.firstClick) return state; // can't flag before first reveal
  const cell = state.grid[r][c];
  if (cell.visual === 'revealed') return state;

  if (cell.visual === 'hidden') {
    cell.visual = 'flagged';
    state.flagCount++;
  } else if (cell.visual === 'flagged') {
    cell.visual = 'question';
    state.flagCount--;
  } else {
    cell.visual = 'hidden';
  }

  return state;
}

export function tick(state: MinesweeperState, dtMs: number): MinesweeperState {
  if (state.status === 'playing') {
    state.elapsedMs += dtMs;
  }
  return state;
}
