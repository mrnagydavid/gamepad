/** Draw a small decorative minesweeper grid for the home screen card. */

const HIDDEN = '#5c6370';
const HIDDEN_LIGHT = '#7a8394';
const HIDDEN_DARK = '#3e4452';
const REVEALED = '#2c313a';
const REVEALED_BORDER = '#383e4a';
const FLAG = '#e5c07b';
const MINE = '#e06c75';
const NUM_COLORS = ['', '#5b86e5', '#4caf50', '#e53935', '#1a237e'];

// Fixed decorative board (0 = hidden, 1-4 = revealed number, F = flag, M = mine)
// Mines at (1,1) and (0,2)=flagged. Numbers verified for all interior cells.
const BOARD = [
  ['1', '2', 'F', 'H', 'H', 'H', 'H', 'H'],
  ['1', 'M', '2', '1', 'H', 'H', 'H', 'H'],
  ['1', '1', '1', '1', 'H', 'H', 'F', 'H'],
  ['0', '0', '0', '1', 'H', 'H', 'H', 'H'],
  ['0', '0', '0', '0', '1', 'H', 'H', 'H'],
  ['0', '0', '0', '0', '1', 'H', 'H', 'H'],
];

export function drawThumbnail(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cols = BOARD[0].length;
  const rows = BOARD.length;
  const cell = Math.floor(Math.min(w / cols, h / rows));
  const ox = Math.floor((w - cell * cols) / 2);
  const oy = Math.floor((h - cell * rows) / 2);
  const bevel = Math.max(1, Math.floor(cell / 6));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const v = BOARD[r][c];
      const x = ox + c * cell;
      const y = oy + r * cell;

      if (v === 'H' || v === 'F') {
        ctx.fillStyle = HIDDEN;
        ctx.fillRect(x, y, cell, cell);
        ctx.fillStyle = HIDDEN_LIGHT;
        ctx.fillRect(x, y, cell, bevel);
        ctx.fillRect(x, y, bevel, cell);
        ctx.fillStyle = HIDDEN_DARK;
        ctx.fillRect(x, y + cell - bevel, cell, bevel);
        ctx.fillRect(x + cell - bevel, y, bevel, cell);
        if (v === 'F') {
          // Tiny flag
          const cx = x + cell / 2;
          ctx.fillStyle = FLAG;
          ctx.fillRect(cx - 1, y + cell * 0.25, 2, cell * 0.5);
          ctx.fillRect(cx, y + cell * 0.2, cell * 0.3, cell * 0.25);
        }
      } else {
        ctx.fillStyle = REVEALED;
        ctx.fillRect(x, y, cell, cell);
        ctx.strokeStyle = REVEALED_BORDER;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, cell, cell);
        const n = parseInt(v);
        if (v === 'M') {
          ctx.fillStyle = MINE;
          ctx.beginPath();
          ctx.arc(x + cell / 2, y + cell / 2, cell * 0.25, 0, Math.PI * 2);
          ctx.fill();
        } else if (n > 0) {
          const sz = Math.max(6, cell * 0.55);
          ctx.font = `bold ${sz}px "Press Start 2P", monospace`;
          ctx.fillStyle = NUM_COLORS[n] || '#c8c8d0';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(n), x + cell / 2, y + cell / 2 + 1);
        }
      }
    }
  }
}
