import {
  type Cell, type PieceType, type Direction, type PipeDreamState, type Difficulty,
  PIECE_CONNECTIONS, ALL_PIECES, QUEUE_SIZE, CROSS_BONUS, levelParams,
} from './types';

function randomPiece(): PieceType {
  return ALL_PIECES[Math.floor(Math.random() * ALL_PIECES.length)];
}

function randomPieceConnecting(dir: Direction): PieceType {
  const fitting = ALL_PIECES.filter((p) =>
    PIECE_CONNECTIONS[p].some(([a, b]) => a === dir || b === dir),
  );
  return fitting[Math.floor(Math.random() * fitting.length)];
}

function queuePiece(state: PipeDreamState): PieceType {
  if (state.flowHead && state.difficulty.helpfulBias > 0 && Math.random() < state.difficulty.helpfulBias) {
    return randomPieceConnecting(state.flowHead.enterDir);
  }
  return randomPiece();
}

function opposite(dir: Direction): Direction {
  const map: Record<Direction, Direction> = {
    top: 'bottom', bottom: 'top', left: 'right', right: 'left',
  };
  return map[dir];
}

function neighbor(r: number, c: number, dir: Direction): { r: number; c: number } {
  switch (dir) {
    case 'top':    return { r: r - 1, c };
    case 'bottom': return { r: r + 1, c };
    case 'left':   return { r, c: c - 1 };
    case 'right':  return { r, c: c + 1 };
  }
}

function emptyCell(): Cell {
  return { piece: null, filledPaths: [], filling: false, fillProgress: 0, enterDir: null, blocked: false };
}

export function createState(cols: number, rows: number, diff: Difficulty, level = 1): PipeDreamState {
  const grid: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) row.push(emptyCell());
    grid.push(row);
  }

  // Source: random cell on a random edge
  const edge = Math.floor(Math.random() * 4);
  let sourceRow: number, sourceCol: number, sourceDir: Direction;
  switch (edge) {
    case 0:
      sourceRow = 0;
      sourceCol = 1 + Math.floor(Math.random() * (cols - 2));
      sourceDir = 'bottom';
      break;
    case 1:
      sourceRow = rows - 1;
      sourceCol = 1 + Math.floor(Math.random() * (cols - 2));
      sourceDir = 'top';
      break;
    case 2:
      sourceCol = 0;
      sourceRow = 1 + Math.floor(Math.random() * (rows - 2));
      sourceDir = 'right';
      break;
    default:
      sourceCol = cols - 1;
      sourceRow = 1 + Math.floor(Math.random() * (rows - 2));
      sourceDir = 'left';
      break;
  }

  // Place blocked cells for higher levels, keeping a clear zone around the source
  const { targetPipes, blockedCount } = levelParams(level);
  const SAFE_DIST = 3; // Manhattan distance from source that must stay clear
  const candidates: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dist = Math.abs(r - sourceRow) + Math.abs(c - sourceCol);
      if (dist < SAFE_DIST) continue;
      candidates.push([r, c]);
    }
  }
  // Shuffle and pick
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (let i = 0; i < Math.min(blockedCount, candidates.length); i++) {
    const [br, bc] = candidates[i];
    grid[br][bc].blocked = true;
  }

  // First queue piece connects to source entry direction
  const entryDir = opposite(sourceDir);
  const queue: PieceType[] = [];
  queue.push(randomPieceConnecting(entryDir));
  for (let i = 1; i < QUEUE_SIZE; i++) queue.push(randomPiece());

  // Speed scales slightly with level
  const levelSpeedBonus = (level - 1) * 30;
  const flowInterval = Math.max(diff.minFlowInterval, diff.initialFlowInterval - levelSpeedBonus);

  return {
    grid,
    cols,
    rows,
    queue,
    sourceCol,
    sourceRow,
    sourceDir,
    flowHead: null,
    flowTimer: 0,
    flowInterval,
    flowTiles: 0,
    score: 0,
    status: 'countdown',
    countdownMs: diff.countdownMs,
    elapsedMs: 0,
    difficulty: diff,
    level,
    targetPipes,
  };
}

export function placePiece(state: PipeDreamState, r: number, c: number): boolean {
  if (state.status === 'over' || state.status === 'won') return false;
  if (r < 0 || r >= state.rows || c < 0 || c >= state.cols) return false;

  const cell = state.grid[r][c];
  if (cell.blocked) return false;
  const hasFlow = cell.filledPaths.some(Boolean) || cell.filling;
  if (hasFlow) return false;

  cell.piece = state.queue.shift()!;
  cell.filledPaths = PIECE_CONNECTIONS[cell.piece].map(() => false);
  cell.filling = false;
  cell.fillProgress = 0;
  cell.enterDir = null;
  state.queue.push(queuePiece(state));

  if (state.status === 'countdown') {
    state.status = 'playing';
    state.countdownMs = state.difficulty.countdownMs;
    state.flowHead = {
      r: state.sourceRow,
      c: state.sourceCol,
      enterDir: opposite(state.sourceDir),
    };
  }

  return true;
}

function startFillNext(state: PipeDreamState): boolean {
  const head = state.flowHead;
  if (!head) return false;

  const { r, c, enterDir } = head;

  if (r < 0 || r >= state.rows || c < 0 || c >= state.cols) return false;

  const cell = state.grid[r][c];
  if (!cell.piece || cell.blocked) return false;

  const conns = PIECE_CONNECTIONS[cell.piece];
  const pathIdx = conns.findIndex(([a, b], idx) => {
    if (cell.filledPaths[idx]) return false;
    return a === enterDir || b === enterDir;
  });
  if (pathIdx === -1) return false;

  cell.filledPaths[pathIdx] = true;
  cell.filling = true;
  cell.fillProgress = 0;
  cell.enterDir = enterDir;

  state.flowTiles++;
  state.score += 1;

  if (state.flowTiles % state.difficulty.speedupTiles === 0) {
    state.flowInterval = Math.max(state.difficulty.minFlowInterval, state.flowInterval - state.difficulty.speedupAmount);
  }

  return true;
}

function finishCell(state: PipeDreamState, r: number, c: number): void {
  const cell = state.grid[r][c];
  if (!cell.piece || !cell.enterDir) return;

  const conns = PIECE_CONNECTIONS[cell.piece];
  const pathIdx = conns.findIndex(([a, b], idx) => {
    if (!cell.filledPaths[idx]) return false;
    return a === cell.enterDir || b === cell.enterDir;
  });
  if (pathIdx === -1) return;

  const [a, b] = conns[pathIdx];
  const exitDir = a === cell.enterDir ? b : a;
  const next = neighbor(r, c, exitDir);
  state.flowHead = { r: next.r, c: next.c, enterDir: opposite(exitDir) };
}

export function tick(state: PipeDreamState, dtMs: number): PipeDreamState {
  if (state.status === 'over' || state.status === 'won') return state;
  if (state.status === 'countdown') return state;

  state.elapsedMs += dtMs;

  if (state.countdownMs > 0) {
    state.countdownMs -= dtMs;
    return state;
  }

  // Start flow if not yet started
  if (!state.grid[state.sourceRow]?.[state.sourceCol]?.filling &&
      state.flowTiles === 0) {
    const ok = startFillNext(state);
    if (!ok) {
      state.status = state.flowTiles >= state.targetPipes ? 'won' : 'over';
    }
    return state;
  }

  let fillingCell: { r: number; c: number; cell: Cell } | null = null;
  for (let r = 0; r < state.rows && !fillingCell; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.grid[r][c].filling) {
        fillingCell = { r, c, cell: state.grid[r][c] };
        break;
      }
    }
  }

  if (fillingCell) {
    const { r, c, cell } = fillingCell;
    cell.fillProgress = Math.min(1, cell.fillProgress + dtMs / state.flowInterval);

    if (cell.fillProgress >= 1) {
      cell.filling = false;
      finishCell(state, r, c);
      const ok = startFillNext(state);
      if (!ok) {
        state.status = state.flowTiles >= state.targetPipes ? 'won' : 'over';
      }
    }
  }

  return state;
}
