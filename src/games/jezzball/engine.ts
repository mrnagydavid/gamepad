import {
  type Cell, type Ball, type JezzState, type Axis,
  TARGET_CELL_SIZE, MIN_COLS, MIN_ROWS, BALL_SPEED, WALL_GROWTH_MS,
  TARGET_PERCENT, LIVES_PER_LEVEL, HUD_H, BALL_RADIUS_RATIO,
} from './types';

export function computeGridSize(canvasW: number, canvasH: number): { cols: number; rows: number; cellSize: number } {
  const availH = canvasH - HUD_H;
  let cellSize = TARGET_CELL_SIZE;
  let cols = Math.max(MIN_COLS, Math.floor(canvasW / cellSize));
  let rows = Math.max(MIN_ROWS, Math.floor(availH / cellSize));
  // Re-tune cellSize so the grid roughly fits
  const cs = Math.min(Math.floor(canvasW / cols), Math.floor(availH / rows));
  cellSize = Math.max(10, cs);
  cols = Math.max(MIN_COLS, Math.floor(canvasW / cellSize));
  rows = Math.max(MIN_ROWS, Math.floor(availH / cellSize));
  return { cols, rows, cellSize };
}

function emptyGrid(cols: number, rows: number): Cell[][] {
  const g: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      const border = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
      row.push(border ? 'border' : 'empty');
    }
    g.push(row);
  }
  return g;
}

export function createState(canvasW: number, canvasH: number, level: number): JezzState {
  const { cols, rows, cellSize } = computeGridSize(canvasW, canvasH);
  const grid = emptyGrid(cols, rows);

  // Spawn balls
  const balls: Ball[] = [];
  const interiorPad = 2 * cellSize;
  const minX = cellSize + interiorPad;
  const maxX = (cols - 1) * cellSize - interiorPad;
  const minY = cellSize + interiorPad;
  const maxY = (rows - 1) * cellSize - interiorPad;
  const ballCount = level + 1;
  for (let i = 0; i < ballCount; i++) {
    balls.push({
      x: minX + Math.random() * (maxX - minX),
      y: minY + Math.random() * (maxY - minY),
      vx: (Math.random() < 0.5 ? -1 : 1) * BALL_SPEED,
      vy: (Math.random() < 0.5 ? -1 : 1) * BALL_SPEED,
    });
  }

  const totalCells = (cols - 2) * (rows - 2);

  return {
    grid, cols, rows, cellSize,
    balls,
    growing: null,
    level,
    lives: LIVES_PER_LEVEL,
    capturedCount: 0,
    totalCells,
    percent: 0,
    score: 0,
    status: 'playing',
    canvasW,
    canvasH,
    hasStartedWall: false,
  };
}

/** Start building a wall. Returns true if successful. */
export function startWall(state: JezzState, row: number, col: number, axis: Axis): boolean {
  if (state.status !== 'playing') return false;
  if (state.growing) return false;
  if (row < 1 || row >= state.rows - 1 || col < 1 || col >= state.cols - 1) return false;
  if (state.grid[row][col] !== 'empty') return false;

  state.grid[row][col] = 'growing';
  const origin = axis === 'h' ? col : row;
  state.growing = {
    originRow: row, originCol: col, axis,
    leftEnd: origin, rightEnd: origin,
    leftDone: false, rightDone: false,
    growthTimer: WALL_GROWTH_MS,
  };
  state.hasStartedWall = true;
  return true;
}

/** Resolve the currently growing wall using the classic Jezzball rule:
 *  only anchored sides are kept (from origin up to the barrier). Unanchored
 *  sides are discarded. If neither side anchored, the whole wall is removed. */
function resolveGrowing(state: JezzState): void {
  const g = state.growing;
  if (!g) return;

  const anyAnchored = g.leftDone || g.rightDone;
  const originR = g.originRow;
  const originC = g.originCol;

  const keepSide = (r: number, c: number, anchored: boolean) => {
    if (state.grid[r][c] !== 'growing') return;
    state.grid[r][c] = anchored ? 'wall' : 'empty';
  };

  if (g.axis === 'h') {
    for (let c = g.leftEnd; c < originC; c++) keepSide(originR, c, g.leftDone);
    for (let c = originC + 1; c <= g.rightEnd; c++) keepSide(originR, c, g.rightDone);
  } else {
    for (let r = g.leftEnd; r < originR; r++) keepSide(r, originC, g.leftDone);
    for (let r = originR + 1; r <= g.rightEnd; r++) keepSide(r, originC, g.rightDone);
  }

  // Origin: kept if anything was anchored, discarded otherwise
  if (state.grid[originR][originC] === 'growing') {
    state.grid[originR][originC] = anyAnchored ? 'wall' : 'empty';
  }

  state.growing = null;
}

/** Cancel growing wall (user action). */
export function cancelWall(state: JezzState): void {
  if (!state.growing) return;
  resolveGrowing(state);
  captureRegions(state);
}

function solidifyGrowing(state: JezzState): void {
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.grid[r][c] === 'growing') state.grid[r][c] = 'wall';
    }
  }
}

/** A ball hit a growing wall cell. Resolve with the same anchor rule as cancel,
 *  and lose a life. Anchored sides stay; unanchored sides (including the hit side) are lost. */
function killWall(state: JezzState): void {
  if (!state.growing) return;
  resolveGrowing(state);
  captureRegions(state);

  state.lives--;
  if (state.lives <= 0) {
    state.status = 'gameover';
  }
}

function advanceGrowth(state: JezzState): void {
  const g = state.growing;
  if (!g) return;
  g.growthTimer -= WALL_GROWTH_MS; // we'll pass an amount per tick below
  // This function is called when growthTimer reaches 0. Each call advances by one cell per side.
  // We recompute ends here.
  const r = g.originRow;
  const c = g.originCol;

  if (g.axis === 'h') {
    if (!g.rightDone) {
      const nextC = g.rightEnd + 1;
      if (nextC >= state.cols - 1) {
        g.rightDone = true;
      } else {
        const cell = state.grid[r][nextC];
        if (cell === 'border' || cell === 'wall' || cell === 'captured') {
          g.rightDone = true;
        } else {
          state.grid[r][nextC] = 'growing';
          g.rightEnd = nextC;
        }
      }
    }
    if (!g.leftDone) {
      const nextC = g.leftEnd - 1;
      if (nextC < 1) {
        g.leftDone = true;
      } else {
        const cell = state.grid[r][nextC];
        if (cell === 'border' || cell === 'wall' || cell === 'captured') {
          g.leftDone = true;
        } else {
          state.grid[r][nextC] = 'growing';
          g.leftEnd = nextC;
        }
      }
    }
  } else {
    if (!g.rightDone) {
      const nextR = g.rightEnd + 1;
      if (nextR >= state.rows - 1) {
        g.rightDone = true;
      } else {
        const cell = state.grid[nextR][c];
        if (cell === 'border' || cell === 'wall' || cell === 'captured') {
          g.rightDone = true;
        } else {
          state.grid[nextR][c] = 'growing';
          g.rightEnd = nextR;
        }
      }
    }
    if (!g.leftDone) {
      const nextR = g.leftEnd - 1;
      if (nextR < 1) {
        g.leftDone = true;
      } else {
        const cell = state.grid[nextR][c];
        if (cell === 'border' || cell === 'wall' || cell === 'captured') {
          g.leftDone = true;
        } else {
          state.grid[nextR][c] = 'growing';
          g.leftEnd = nextR;
        }
      }
    }
  }

  if (g.leftDone && g.rightDone) {
    solidifyGrowing(state);
    state.growing = null;
    captureRegions(state);
  } else {
    g.growthTimer = WALL_GROWTH_MS;
  }
}

/** Flood-fill and capture regions with no balls. */
export function captureRegions(state: JezzState): void {
  const visited: boolean[][] = [];
  for (let r = 0; r < state.rows; r++) visited.push(new Array(state.cols).fill(false));

  // Ball cells
  const ballCells: { r: number; c: number }[] = state.balls.map((b) => ({
    r: Math.floor(b.y / state.cellSize),
    c: Math.floor(b.x / state.cellSize),
  }));

  let captured = 0;
  for (let r = 1; r < state.rows - 1; r++) {
    for (let c = 1; c < state.cols - 1; c++) {
      if (visited[r][c]) continue;
      if (state.grid[r][c] !== 'empty') continue;

      // BFS flood
      const region: { r: number; c: number }[] = [];
      const stack: { r: number; c: number }[] = [{ r, c }];
      let hasBall = false;
      while (stack.length > 0) {
        const { r: cr, c: cc } = stack.pop()!;
        if (cr < 1 || cr >= state.rows - 1 || cc < 1 || cc >= state.cols - 1) continue;
        if (visited[cr][cc]) continue;
        if (state.grid[cr][cc] !== 'empty') continue;
        visited[cr][cc] = true;
        region.push({ r: cr, c: cc });

        for (const { r: br, c: bc } of ballCells) {
          if (br === cr && bc === cc) { hasBall = true; break; }
        }

        stack.push({ r: cr - 1, c: cc }, { r: cr + 1, c: cc }, { r: cr, c: cc - 1 }, { r: cr, c: cc + 1 });
      }

      if (!hasBall) {
        for (const { r: cr, c: cc } of region) {
          state.grid[cr][cc] = 'captured';
        }
      }
    }
  }

  // Count captured
  for (let r = 1; r < state.rows - 1; r++) {
    for (let c = 1; c < state.cols - 1; c++) {
      if (state.grid[r][c] === 'captured' || state.grid[r][c] === 'wall') captured++;
    }
  }

  // Award points for newly-captured cells (scaled by level)
  const delta = captured - state.capturedCount;
  if (delta > 0) {
    state.score += delta * state.level * 10;
  }

  state.capturedCount = captured;
  state.percent = captured / state.totalCells;
  if (state.percent >= TARGET_PERCENT && state.status === 'playing') {
    // Level clear bonus: extra points for percent over target and remaining lives
    const bonusPercent = Math.floor((state.percent - TARGET_PERCENT) * 100);
    state.score += state.level * 500 + bonusPercent * state.level * 20 + state.lives * 250;
    state.status = 'levelclear';
  }
}

function isSolidCell(state: JezzState, r: number, c: number): boolean {
  if (r < 0 || r >= state.rows || c < 0 || c >= state.cols) return true;
  const cell = state.grid[r][c];
  return cell === 'border' || cell === 'wall' || cell === 'captured' || cell === 'growing';
}

function updateBalls(state: JezzState): void {
  const cs = state.cellSize;
  const radius = cs * BALL_RADIUS_RATIO;

  for (const ball of state.balls) {
    // Move in sub-steps for safety with high velocities
    const steps = Math.ceil(Math.max(Math.abs(ball.vx), Math.abs(ball.vy)) / (radius * 0.5));
    const stepX = ball.vx / steps;
    const stepY = ball.vy / steps;

    for (let s = 0; s < steps; s++) {
      // Move x first, check collision
      ball.x += stepX;
      if (resolveAxisCollision(state, ball, radius, 'x')) {
        if (!state.growing) break;
      }

      ball.y += stepY;
      if (resolveAxisCollision(state, ball, radius, 'y')) {
        if (!state.growing) break;
      }
    }
  }
}

/** Check cells the ball overlaps. If a solid cell is hit, reflect and (if growing) kill head. Returns true if any hit. */
function resolveAxisCollision(state: JezzState, ball: { x: number; y: number; vx: number; vy: number }, radius: number, axis: 'x' | 'y'): boolean {
  const cs = state.cellSize;
  // Find overlapping cells
  const minC = Math.floor((ball.x - radius) / cs);
  const maxC = Math.floor((ball.x + radius) / cs);
  const minR = Math.floor((ball.y - radius) / cs);
  const maxR = Math.floor((ball.y + radius) / cs);

  let hitAny = false;

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (!isSolidCell(state, r, c)) continue;

      // Closest point on cell rect to ball center
      const cellX = c * cs;
      const cellY = r * cs;
      const closestX = Math.max(cellX, Math.min(ball.x, cellX + cs));
      const closestY = Math.max(cellY, Math.min(ball.y, cellY + cs));
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;
      if (dx * dx + dy * dy >= radius * radius) continue;

      // Hit a growing cell — destroy the whole wall; ball passes through, no reflection
      if (state.grid[r] && state.grid[r][c] === 'growing') {
        killWall(state);
        return true;
      }

      // Reflect based on axis
      if (axis === 'x') {
        if (ball.vx > 0) ball.x = cellX - radius - 0.01;
        else if (ball.vx < 0) ball.x = cellX + cs + radius + 0.01;
        ball.vx = -ball.vx;
      } else {
        if (ball.vy > 0) ball.y = cellY - radius - 0.01;
        else if (ball.vy < 0) ball.y = cellY + cs + radius + 0.01;
        ball.vy = -ball.vy;
      }
      hitAny = true;
    }
  }

  return hitAny;
}

export function tick(state: JezzState, dtMs: number): void {
  if (state.status !== 'playing') return;

  // Advance growth
  if (state.growing) {
    state.growing.growthTimer -= dtMs;
    while (state.growing && state.growing.growthTimer <= 0) {
      advanceGrowth(state);
    }
  }

  updateBalls(state);
}
