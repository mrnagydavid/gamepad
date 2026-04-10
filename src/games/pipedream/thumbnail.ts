/** Decorative Pipe Dream thumbnail for the home screen. */

const CELL_BG = '#142233';
const GRID_LINE = '#1b2838';
const PIPE = '#3a7ca5';
const PIPE_BORDER = '#2c5f7a';
const FLOW = '#7fdbca';
const SOURCE = '#e5c07b';

// Simplified board: H=horizontal, V=vertical, 1-4=curves(tr,rb,bl,lt), X=cross, .=empty
const BOARD = [
  ['.', '.', '4', 'H', '3', '.', '.'],
  ['.', '.', 'V', '.', 'V', '.', '.'],
  ['.', '1', 'X', 'H', '2', '.', '.'],
  ['.', 'V', '.', '.', '.', '.', '.'],
  ['.', '1', 'H', 'H', '3', '.', '.'],
];

const PIECE_MAP: Record<string, [string, string][]> = {
  H: [['left', 'right']],
  V: [['top', 'bottom']],
  '1': [['top', 'right']],
  '2': [['right', 'bottom']],
  '3': [['bottom', 'left']],
  '4': [['left', 'top']],
  X: [['left', 'right'], ['top', 'bottom']],
};

// Which cells have flow
const FLOW_CELLS = new Set(['1,2', '2,2', '2,3', '2,4', '3,1', '3,2', '4,1']);

export function drawThumbnail(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cols = BOARD[0].length;
  const rows = BOARD.length;
  const cell = Math.floor(Math.min(w / cols, h / rows));
  const ox = Math.floor((w - cell * cols) / 2);
  const oy = Math.floor((h - cell * rows) / 2);
  const pw = cell * 0.3;
  const half = pw / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * cell;
      const y = oy + r * cell;
      ctx.fillStyle = CELL_BG;
      ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = GRID_LINE;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cell, cell);

      const v = BOARD[r][c];
      if (v === '.') continue;

      const cx = x + cell / 2;
      const cy = y + cell / 2;
      const conns = PIECE_MAP[v];
      const hasFlow = FLOW_CELLS.has(`${r},${c}`);

      for (const [a, b] of conns) {
        drawSeg(ctx, cx, cy, cell, half, a as any, PIPE, PIPE_BORDER);
        drawSeg(ctx, cx, cy, cell, half, b as any, PIPE, PIPE_BORDER);
        ctx.fillStyle = PIPE;
        ctx.fillRect(cx - half, cy - half, pw, pw);
        if (hasFlow) {
          const fh = half * 0.5;
          ctx.fillStyle = FLOW;
          drawSeg(ctx, cx, cy, cell, fh, a as any, FLOW, FLOW);
          drawSeg(ctx, cx, cy, cell, fh, b as any, FLOW, FLOW);
          ctx.fillRect(cx - fh, cy - fh, fh * 2, fh * 2);
        }
      }
    }
  }

  // Source marker
  const sx = ox + 2 * cell + cell / 2;
  const sy = oy;
  ctx.fillStyle = SOURCE;
  ctx.beginPath();
  ctx.moveTo(sx, sy - cell * 0.15);
  ctx.lineTo(sx - cell * 0.15, sy);
  ctx.lineTo(sx + cell * 0.15, sy);
  ctx.closePath();
  ctx.fill();
}

function drawSeg(
  ctx: CanvasRenderingContext2D, cx: number, cy: number,
  size: number, half: number, dir: string, fill: string, stroke: string,
) {
  const seg = size / 2;
  let sx: number, sy: number, sw: number, sh: number;
  switch (dir) {
    case 'top':    sx = cx - half; sy = cy - seg; sw = half * 2; sh = seg; break;
    case 'bottom': sx = cx - half; sy = cy; sw = half * 2; sh = seg; break;
    case 'left':   sx = cx - seg; sy = cy - half; sw = seg; sh = half * 2; break;
    default:       sx = cx; sy = cy - half; sw = seg; sh = half * 2; break;
  }
  ctx.fillStyle = fill;
  ctx.fillRect(sx, sy, sw, sh);
}
