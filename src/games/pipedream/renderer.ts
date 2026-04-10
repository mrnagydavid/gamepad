import {
  type PipeDreamState, type PieceType, type Direction,
  PIECE_CONNECTIONS, QUEUE_SIZE, TARGET_CELL_SIZE, MIN_COLS, MIN_ROWS,
} from './types';

const BG = '#0d1b2a';
const GRID_LINE = '#1b2838';
const CELL_BG = '#142233';
const PIPE_COLOR = '#3a7ca5';
const PIPE_BORDER = '#2c5f7a';
const FLOW_COLOR = '#7fdbca';
const FLOW_GLOW = 'rgba(127, 219, 202, 0.3)';
const SOURCE_COLOR = '#e5c07b';
const HUD_TEXT = '#c8c8d0';
const HUD_DIM = '#6b6b80';
const QUEUE_BG = '#16213e';
const COUNTDOWN_COLOR = '#e94560';
const NEXT_HIGHLIGHT = '#e5c07b';

export interface Layout {
  cellSize: number;
  gridX: number;
  gridY: number;
  queueY: number;      // Y position of horizontal queue row
  queueCellSize: number;
  hudH: number;
  queueH: number;      // height of queue strip
  width: number;
  height: number;
}

/** Compute how many cols/rows fit the viewport. */
export function computeGridSize(w: number, h: number, hudH: number): { cols: number; rows: number } {
  const queueH = TARGET_CELL_SIZE + 16;
  const availW = w - 8;
  const availH = h - hudH - queueH - 8;
  const cols = Math.max(MIN_COLS, Math.floor(availW / TARGET_CELL_SIZE));
  const rows = Math.max(MIN_ROWS, Math.floor(availH / TARGET_CELL_SIZE));
  return { cols, rows };
}

export function computeLayout(cols: number, rows: number, w: number, h: number): Layout {
  const hudH = 48;
  const queueH = TARGET_CELL_SIZE + 16;
  const availW = w - 8;
  const availH = h - hudH - queueH - 8;
  const cellSize = Math.floor(Math.min(availW / cols, availH / rows));
  const gridW = cellSize * cols;
  const gridH = cellSize * rows;
  const gridX = Math.floor((w - gridW) / 2);
  const gridY = hudH + queueH + Math.floor((availH - gridH) / 2) + 4;
  const queueCellSize = Math.min(cellSize, Math.floor(queueH - 12));
  const queueY = hudH + Math.floor((queueH - queueCellSize) / 2);
  return { cellSize, gridX, gridY, queueY, queueCellSize, hudH, queueH, width: w, height: h };
}

export function hitTestGrid(
  x: number, y: number, layout: Layout, cols: number, rows: number,
): [number, number] | null {
  const gc = Math.floor((x - layout.gridX) / layout.cellSize);
  const gr = Math.floor((y - layout.gridY) / layout.cellSize);
  if (gc < 0 || gc >= cols || gr < 0 || gr >= rows) return null;
  return [gr, gc];
}

export function render(ctx: CanvasRenderingContext2D, state: PipeDreamState, layout: Layout): void {
  const { cellSize, gridX, gridY, queueY, queueCellSize, hudH, queueH, width, height } = layout;
  const { grid, cols, rows, queue, sourceRow, sourceCol, sourceDir, score, status, countdownMs, flowInterval } = state;

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  // --- Horizontal queue above grid ---
  const queueTotalW = QUEUE_SIZE * (queueCellSize + 8) - 8;
  const queueStartX = Math.floor((width - queueTotalW) / 2);
  ctx.fillStyle = QUEUE_BG;
  ctx.fillRect(queueStartX - 6, hudH + 2, queueTotalW + 12, queueH - 4);
  for (let i = 0; i < Math.min(queue.length, QUEUE_SIZE); i++) {
    const qx = queueStartX + i * (queueCellSize + 8);
    // Highlight next piece with yellow/orange border
    if (i === 0) {
      ctx.strokeStyle = NEXT_HIGHLIGHT;
      ctx.lineWidth = 3;
      ctx.strokeRect(qx - 3, queueY - 3, queueCellSize + 6, queueCellSize + 6);
    }
    drawPipe(ctx, qx, queueY, queueCellSize, queue[i], [], 0, null, false);
  }

  // Grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gridX + c * cellSize;
      const y = gridY + r * cellSize;

      ctx.fillStyle = CELL_BG;
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = GRID_LINE;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

      const cell = grid[r][c];
      if (cell.piece) {
        drawPipe(ctx, x, y, cellSize, cell.piece, cell.filledPaths, cell.fillProgress, cell.enterDir, cell.filling);
      }

      // Source arrow inside the cell
      if (r === sourceRow && c === sourceCol && !cell.piece) {
        drawSourceArrow(ctx, x, y, cellSize, sourceDir);
      }
    }
  }

  // --- HUD ---
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, hudH);
  const fontSize = Math.max(10, Math.min(16, hudH * 0.35));
  const hudMidY = hudH / 2;

  ctx.font = `${fontSize}px "Press Start 2P", monospace`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = HUD_TEXT;
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${score}`, 8, hudMidY);

  ctx.textAlign = 'right';
  ctx.fillStyle = HUD_DIM;
  const speed = Math.round((1 - (flowInterval - 400) / 1600) * 100);
  ctx.fillText(`Spd ${Math.min(100, speed)}%`, width - 8, hudMidY);

  // Waiting for first click
  if (status === 'countdown') {
    const countSize = Math.max(14, Math.min(24, cellSize * 0.5));
    ctx.font = `${countSize}px "Press Start 2P", monospace`;
    ctx.fillStyle = HUD_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = width / 2;
    const cy = gridY + (rows * cellSize) / 2;
    ctx.fillText('Place a pipe', cx, cy - countSize * 0.5);
    ctx.fillText('to start!', cx, cy + countSize);
  }

  // Countdown after first placement, before flow starts
  if (status === 'playing' && countdownMs > 0) {
    const secs = Math.ceil(countdownMs / 1000);
    const countSize = Math.max(14, Math.min(24, cellSize * 0.5));
    ctx.font = `${countSize}px "Press Start 2P", monospace`;
    ctx.fillStyle = COUNTDOWN_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = width / 2;
    const cy = gridY + (rows * cellSize) / 2;
    ctx.fillText(`Flow in ${secs}...`, cx, cy);
  }

  // Game over overlay
  if (status === 'over') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(gridX, gridY, cols * cellSize, rows * cellSize);
    const bigSize = Math.max(12, Math.min(28, width * 0.06));
    ctx.font = `${bigSize}px "Press Start 2P", monospace`;
    ctx.fillStyle = COUNTDOWN_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = gridX + (cols * cellSize) / 2;
    const cy = gridY + (rows * cellSize) / 2;
    ctx.fillText('GAME OVER', cx, cy - bigSize);
    ctx.fillStyle = HUD_TEXT;
    ctx.fillText(`Score: ${score}`, cx, cy + bigSize * 0.5);
    ctx.font = `${Math.floor(bigSize * 0.5)}px "Press Start 2P", monospace`;
    ctx.fillStyle = HUD_DIM;
    ctx.fillText('Tap to restart', cx, cy + bigSize * 2);
  }
}

// --- Pipe drawing ---

const PIPE_WIDTH_RATIO = 0.35;

function drawPipe(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  piece: PieceType,
  filledPaths: boolean[],
  fillProgress: number,
  enterDir: Direction | null,
  isFilling: boolean,
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const pw = size * PIPE_WIDTH_RATIO;
  const half = pw / 2;
  const conns = PIECE_CONNECTIONS[piece];

  // Pass 1: draw all pipe structure
  for (let i = 0; i < conns.length; i++) {
    const [a, b] = conns[i];
    drawSegment(ctx, cx, cy, size, half, a, PIPE_COLOR, PIPE_BORDER);
    drawSegment(ctx, cx, cy, size, half, b, PIPE_COLOR, PIPE_BORDER);
  }
  ctx.fillStyle = PIPE_COLOR;
  ctx.fillRect(cx - half, cy - half, pw, pw);
  ctx.strokeStyle = PIPE_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - half, cy - half, pw, pw);

  // Pass 2: draw all flow on top
  const flowW = pw * 0.5;
  const fh = flowW / 2;
  for (let i = 0; i < conns.length; i++) {
    const [a, b] = conns[i];
    const filled = filledPaths[i] === true;
    if (!filled) continue;

    ctx.shadowColor = FLOW_GLOW;
    ctx.shadowBlur = 6;

    const pathEnter = (enterDir && (a === enterDir || b === enterDir)) ? enterDir : a;
    const pathExit = pathEnter === a ? b : a;
    const isThisPathFilling = isFilling && enterDir === pathEnter;

    if (isThisPathFilling) {
      const p = fillProgress;
      if (p <= 0.5) {
        const t = p / 0.5;
        drawFlowPartial(ctx, cx, cy, size, fh, pathEnter, t, true);
        drawFlowHead(ctx, cx, cy, size, fh, pathEnter, t, true);
      } else {
        drawFlowSegment(ctx, cx, cy, size, fh, pathEnter);
        ctx.fillStyle = FLOW_COLOR;
        ctx.fillRect(cx - fh, cy - fh, flowW, flowW);
        const t = (p - 0.5) / 0.5;
        drawFlowPartial(ctx, cx, cy, size, fh, pathExit, t, false);
        drawFlowHead(ctx, cx, cy, size, fh, pathExit, t, false);
      }
    } else {
      drawFlowSegment(ctx, cx, cy, size, fh, a);
      drawFlowSegment(ctx, cx, cy, size, fh, b);
      ctx.fillStyle = FLOW_COLOR;
      ctx.fillRect(cx - fh, cy - fh, flowW, flowW);
    }

    ctx.shadowBlur = 0;
  }
}

/** Draw a rounded cap at the leading edge of the flow. */
function drawFlowHead(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number, fh: number,
  dir: Direction, t: number, fromEdge: boolean,
): void {
  if (t <= 0) return;
  const segLen = size / 2;
  let hx: number, hy: number;

  if (fromEdge) {
    // Front moves from edge toward center
    switch (dir) {
      case 'top':    hx = cx; hy = cy - segLen + segLen * t; break;
      case 'bottom': hx = cx; hy = cy + segLen - segLen * t; break;
      case 'left':   hx = cx - segLen + segLen * t; hy = cy; break;
      case 'right':  hx = cx + segLen - segLen * t; hy = cy; break;
    }
  } else {
    // Front moves from center toward edge
    switch (dir) {
      case 'top':    hx = cx; hy = cy - segLen * t; break;
      case 'bottom': hx = cx; hy = cy + segLen * t; break;
      case 'left':   hx = cx - segLen * t; hy = cy; break;
      case 'right':  hx = cx + segLen * t; hy = cy; break;
    }
  }

  ctx.fillStyle = FLOW_COLOR;
  ctx.beginPath();
  ctx.arc(hx!, hy!, fh, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlowSegment(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number, fh: number, dir: Direction,
): void {
  drawSegment(ctx, cx, cy, size, fh, dir, FLOW_COLOR, FLOW_COLOR);
}

function drawFlowPartial(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number, fh: number,
  dir: Direction, t: number, fromEdge: boolean,
): void {
  const segLen = size / 2;
  const fillLen = segLen * t;
  const fw = fh * 2;
  ctx.fillStyle = FLOW_COLOR;

  if (fromEdge) {
    switch (dir) {
      case 'top':    ctx.fillRect(cx - fh, cy - segLen, fw, fillLen); break;
      case 'bottom': ctx.fillRect(cx - fh, cy + segLen - fillLen, fw, fillLen); break;
      case 'left':   ctx.fillRect(cx - segLen, cy - fh, fillLen, fw); break;
      case 'right':  ctx.fillRect(cx + segLen - fillLen, cy - fh, fillLen, fw); break;
    }
  } else {
    switch (dir) {
      case 'top':    ctx.fillRect(cx - fh, cy - fillLen, fw, fillLen); break;
      case 'bottom': ctx.fillRect(cx - fh, cy, fw, fillLen); break;
      case 'left':   ctx.fillRect(cx - fillLen, cy - fh, fillLen, fw); break;
      case 'right':  ctx.fillRect(cx, cy - fh, fillLen, fw); break;
    }
  }
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number, half: number,
  dir: Direction,
  fill: string, stroke: string,
): void {
  const segLen = size / 2;
  let sx: number, sy: number, sw: number, sh: number;
  switch (dir) {
    case 'top':    sx = cx - half; sy = cy - segLen; sw = half * 2; sh = segLen; break;
    case 'bottom': sx = cx - half; sy = cy; sw = half * 2; sh = segLen; break;
    case 'left':   sx = cx - segLen; sy = cy - half; sw = segLen; sh = half * 2; break;
    case 'right':  sx = cx; sy = cy - half; sw = segLen; sh = half * 2; break;
  }
  ctx.fillStyle = fill;
  ctx.fillRect(sx!, sy!, sw!, sh!);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.strokeRect(sx! + 0.5, sy! + 0.5, sw! - 1, sh! - 1);
}

/** Draw arrow inside the source cell pointing in the flow direction. */
function drawSourceArrow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  dir: Direction,
): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const arrowLen = size * 0.25;
  const arrowW = size * 0.18;
  const shaftLen = size * 0.15;
  const shaftW = size * 0.06;
  const pad = size * 0.12; // padding from the entry edge

  ctx.fillStyle = SOURCE_COLOR;

  // Arrow placed near the entry edge (opposite of dir), pointing toward dir
  switch (dir) {
    case 'bottom': {
      // Flow enters from top, arrow near top edge pointing down
      const baseY = y + pad;
      const tipY = baseY + shaftLen + arrowLen;
      ctx.fillRect(cx - shaftW, baseY, shaftW * 2, shaftLen);
      ctx.beginPath();
      ctx.moveTo(cx, tipY);
      ctx.lineTo(cx - arrowW, baseY + shaftLen);
      ctx.lineTo(cx + arrowW, baseY + shaftLen);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'top': {
      // Flow enters from bottom, arrow near bottom edge pointing up
      const baseY = y + size - pad;
      const tipY = baseY - shaftLen - arrowLen;
      ctx.fillRect(cx - shaftW, baseY - shaftLen, shaftW * 2, shaftLen);
      ctx.beginPath();
      ctx.moveTo(cx, tipY);
      ctx.lineTo(cx - arrowW, baseY - shaftLen);
      ctx.lineTo(cx + arrowW, baseY - shaftLen);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'right': {
      // Flow enters from left, arrow near left edge pointing right
      const baseX = x + pad;
      const tipX = baseX + shaftLen + arrowLen;
      ctx.fillRect(baseX, cy - shaftW, shaftLen, shaftW * 2);
      ctx.beginPath();
      ctx.moveTo(tipX, cy);
      ctx.lineTo(baseX + shaftLen, cy - arrowW);
      ctx.lineTo(baseX + shaftLen, cy + arrowW);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'left': {
      // Flow enters from right, arrow near right edge pointing left
      const baseX = x + size - pad;
      const tipX = baseX - shaftLen - arrowLen;
      ctx.fillRect(baseX - shaftLen, cy - shaftW, shaftLen, shaftW * 2);
      ctx.beginPath();
      ctx.moveTo(tipX, cy);
      ctx.lineTo(baseX - shaftLen, cy - arrowW);
      ctx.lineTo(baseX - shaftLen, cy + arrowW);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}
