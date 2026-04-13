/** Decorative Jezzball thumbnail — matches game visuals. */

const BG = '#0d1117';
const BORDER = '#2d3748';
const BORDER_LIGHT = '#3d4758';
const WALL = '#7a8394';
const WALL_EDGE = '#5c6370';
const CAPTURED = '#53d8fb';
const CAPTURED_EDGE = '#3ba8c4';
const BALL = '#e06c75';
const BALL_HIGHLIGHT = '#ff9ca4';

export function drawThumbnail(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cols = 14;
  const rows = 9;
  const cs = Math.floor(Math.min(w / cols, h / rows));
  const ox = Math.floor((w - cs * cols) / 2);
  const oy = Math.floor((h - cs * rows) / 2);

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  // Borders
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        const x = ox + c * cs;
        const y = oy + r * cs;
        ctx.fillStyle = BORDER;
        ctx.fillRect(x, y, cs, cs);
        ctx.fillStyle = BORDER_LIGHT;
        ctx.fillRect(x, y, cs, 1);
        ctx.fillRect(x, y, 1, cs);
      }
    }
  }

  // Captured region (left side) — drawn cell-by-cell with grid edges visible
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < 5; c++) {
      const x = ox + c * cs;
      const y = oy + r * cs;
      ctx.fillStyle = CAPTURED;
      ctx.fillRect(x, y, cs, cs);
      ctx.strokeStyle = CAPTURED_EDGE;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
    }
  }

  // Vertical wall at col 5 (the completed divider between captured and empty)
  for (let r = 1; r < rows - 1; r++) {
    const x = ox + 5 * cs;
    const y = oy + r * cs;
    ctx.fillStyle = WALL;
    ctx.fillRect(x, y, cs, cs);
    ctx.strokeStyle = WALL_EDGE;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
  }

  // A horizontal wall being built — 3 cells of partial wall at row 4
  for (let c = 8; c <= 10; c++) {
    const x = ox + c * cs;
    const y = oy + 4 * cs;
    ctx.fillStyle = WALL;
    ctx.fillRect(x, y, cs, cs);
    ctx.strokeStyle = WALL_EDGE;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
  }

  // One ball in the empty region
  const radius = cs * 0.4;
  const bx = ox + 9 * cs + cs / 2;
  const by = oy + 2 * cs + cs / 2;
  ctx.fillStyle = BALL;
  ctx.beginPath();
  ctx.arc(bx, by, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BALL_HIGHLIGHT;
  ctx.beginPath();
  ctx.arc(bx - radius * 0.3, by - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
  ctx.fill();
}
