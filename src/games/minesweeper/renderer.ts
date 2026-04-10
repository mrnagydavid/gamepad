import type { MinesweeperState } from './types';

const NUM_COLORS = [
  '',          // 0 — never drawn
  '#5b86e5',  // 1 blue
  '#4caf50',  // 2 green
  '#e53935',  // 3 red
  '#1a237e',  // 4 dark blue
  '#880e4f',  // 5 maroon
  '#00897b',  // 6 teal
  '#212121',  // 7 black
  '#757575',  // 8 grey
];

const COLOR_HIDDEN = '#5c6370';
const COLOR_HIDDEN_BORDER_LIGHT = '#7a8394';
const COLOR_HIDDEN_BORDER_DARK = '#3e4452';
const COLOR_REVEALED = '#2c313a';
const COLOR_REVEALED_BORDER = '#383e4a';
const COLOR_FLAG = '#e5c07b';
const COLOR_QUESTION = '#61afef';
const COLOR_MINE = '#e06c75';
const COLOR_BG = '#1a1a2e';
const COLOR_HUD_TEXT = '#c8c8d0';
const COLOR_HUD_DIM = '#6b6b80';
const COLOR_ACCENT = '#53d8fb';

export interface Layout {
  cellSize: number;
  gridX: number;    // top-left x of grid in world space
  gridY: number;    // top-left y of grid in world space
  hudH: number;     // height of HUD bar (screen space, not affected by camera)
  width: number;
  height: number;
  needsCamera: boolean; // true when grid is too large to fit at min cell size
}

export interface Camera {
  x: number;  // translation offset in world px
  y: number;
  zoom: number;
}

const MIN_CELL_SIZE = 44;


export function computeLayout(
  cols: number,
  rows: number,
  canvasW: number,
  canvasH: number,
): Layout {
  const hudH = 48;
  const availW = canvasW - 8;
  const availH = canvasH - hudH - 8;
  const fitSize = Math.floor(Math.min(availW / cols, availH / rows));
  const cellSize = Math.max(fitSize, MIN_CELL_SIZE);
  const needsCamera = cellSize > fitSize;
  const gridW = cellSize * cols;
  const gridH = cellSize * rows;
  // Always center the grid in world space
  const gridX = Math.floor((canvasW - gridW) / 2);
  const gridY = hudH + Math.floor((canvasH - hudH - gridH) / 2);
  return { cellSize, gridX, gridY, hudH, width: canvasW, height: canvasH, needsCamera };
}

export function defaultCamera(): Camera {
  return { x: 0, y: 0, zoom: 1 };
}

export function clampCameraWithGrid(
  cam: Camera,
  layout: Layout,
  cols: number,
  rows: number,
): Camera {
  const z = cam.zoom;
  const gridW = layout.cellSize * cols;
  const gridH = layout.cellSize * rows;
  const viewW = layout.width / z;
  const viewH = (layout.height - layout.hudH) / z;

  // X axis: left edge of grid at left edge of screen → cam.x = -gridX
  //         right edge of grid at right edge of screen → cam.x = viewW - gridX - gridW
  const maxX = -layout.gridX;
  const minX = viewW - layout.gridX - gridW;
  const clampedX = minX >= maxX ? 0 : Math.min(maxX, Math.max(minX, cam.x));

  // Y axis: top edge of grid at top of viewport → cam.y = hudH - gridY
  //         bottom edge of grid at bottom of viewport → cam.y = viewH + hudH - gridY - gridH
  const maxY = layout.hudH - layout.gridY;
  const minY = viewH + layout.hudH - layout.gridY - gridH;
  const clampedY = minY >= maxY ? 0 : Math.min(maxY, Math.max(minY, cam.y));

  return { x: clampedX, y: clampedY, zoom: z };
}

/** Convert screen pixel coords to world coords accounting for camera. */
export function screenToWorld(sx: number, sy: number, cam: Camera, hudH: number): { wx: number; wy: number } {
  return {
    wx: (sx / cam.zoom) - cam.x,
    wy: ((sy - hudH) / cam.zoom) - cam.y + hudH,
  };
}

/** Convert world coords to grid (row, col) or null if outside grid. */
export function hitTest(
  screenX: number,
  screenY: number,
  layout: Layout,
  cols: number,
  rows: number,
  cam: Camera,
): [number, number] | null {
  // HUD is in screen space — don't transform clicks there
  if (screenY < layout.hudH) return null;
  const { wx, wy } = screenToWorld(screenX, screenY, cam, layout.hudH);
  const gc = Math.floor((wx - layout.gridX) / layout.cellSize);
  const gr = Math.floor((wy - layout.gridY) / layout.cellSize);
  if (gc < 0 || gc >= cols || gr < 0 || gr >= rows) return null;
  return [gr, gc];
}

export interface OverflowIndicators {
  fadeEdges?: boolean;
  minimap?: boolean;
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: MinesweeperState,
  layout: Layout,
  cam: Camera = defaultCamera(),
  indicators: OverflowIndicators = {},
): void {
  const { cellSize, gridX, gridY, width, height, hudH } = layout;
  const { grid, cols, rows, totalMines, flagCount, elapsedMs, status } = state;

  // Background
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, width, height);

  // --- Grid (camera-transformed) ---
  ctx.save();
  // Clip to grid area (below HUD)
  ctx.beginPath();
  ctx.rect(0, hudH, width, height - hudH);
  ctx.clip();
  // Apply camera: scale then translate
  ctx.translate(0, hudH);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(cam.x, cam.y);
  ctx.translate(0, -hudH);

  const bevel = Math.max(2, Math.floor(cellSize / 8));

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      const x = gridX + c * cellSize;
      const y = gridY + r * cellSize;

      if (cell.visual === 'revealed') {
        ctx.fillStyle = COLOR_REVEALED;
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = COLOR_REVEALED_BORDER;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);

        if (cell.mine) {
          // Draw mine
          drawMine(ctx, x, y, cellSize);
        } else if (cell.adjacent > 0) {
          // Draw number
          const numSize = Math.max(8, cellSize * 0.5);
          ctx.font = `bold ${numSize}px "Press Start 2P", monospace`;
          ctx.fillStyle = NUM_COLORS[cell.adjacent];
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(cell.adjacent), x + cellSize / 2, y + cellSize / 2 + 1);
        }
      } else {
        // Hidden / flagged / question — draw raised cell
        ctx.fillStyle = COLOR_HIDDEN;
        ctx.fillRect(x, y, cellSize, cellSize);
        // Light bevel (top + left)
        ctx.fillStyle = COLOR_HIDDEN_BORDER_LIGHT;
        ctx.fillRect(x, y, cellSize, bevel);
        ctx.fillRect(x, y, bevel, cellSize);
        // Dark bevel (bottom + right)
        ctx.fillStyle = COLOR_HIDDEN_BORDER_DARK;
        ctx.fillRect(x, y + cellSize - bevel, cellSize, bevel);
        ctx.fillRect(x + cellSize - bevel, y, bevel, cellSize);

        if (cell.visual === 'flagged') {
          drawFlag(ctx, x, y, cellSize);
        } else if (cell.visual === 'question') {
          const qSize = Math.max(8, cellSize * 0.5);
          ctx.font = `bold ${qSize}px "Press Start 2P", monospace`;
          ctx.fillStyle = COLOR_QUESTION;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', x + cellSize / 2, y + cellSize / 2 + 1);
        }
      }
    }
  }

  ctx.restore(); // end camera transform

  // --- HUD (screen space, drawn on top) ---
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, width, hudH);
  const fontSize = Math.max(10, Math.min(16, hudH * 0.35));
  const emojiSize = Math.round(fontSize * 1.6);
  const hudY = hudH / 2;

  // Mine counter (left): emoji + number
  const remaining = totalMines - flagCount;
  ctx.font = `${emojiSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('💣', 8, hudY);
  ctx.font = `${fontSize}px "Press Start 2P", monospace`;
  ctx.fillStyle = COLOR_HUD_TEXT;
  ctx.fillText(`${remaining}`, 8 + emojiSize + 6, hudY);

  // Smiley (center)
  const smiley = status === 'won' ? '😎' : status === 'lost' ? '💀' : '🙂';
  ctx.font = `${emojiSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(smiley, width / 2, hudY);

  // Timer (right)
  const seconds = Math.floor(elapsedMs / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  ctx.font = `${fontSize}px "Press Start 2P", monospace`;
  ctx.fillStyle = COLOR_HUD_TEXT;
  ctx.textAlign = 'right';
  ctx.fillText(`${mm}:${ss}`, width - 8, hudY);

  // --- Overflow indicators (screen space, below HUD) ---
  if (layout.needsCamera) {
    // Compute which edges have hidden content
    // World→screen: sx = (wx + cam.x) * zoom;  sy = (wy - hudH + cam.y) * zoom + hudH
    const gridL = (gridX + cam.x) * cam.zoom;
    const gridR = (gridX + cellSize * cols + cam.x) * cam.zoom;
    const gridT = (gridY - hudH + cam.y) * cam.zoom + hudH;
    const gridB = (gridY + cellSize * rows - hudH + cam.y) * cam.zoom + hudH;
    const clipL = gridL < 0;
    const clipR = gridR > width;
    const clipT = gridT < hudH;
    const clipB = gridB > height;

    if (indicators.fadeEdges) {
      const fadeW = 30;
      if (clipL) {
        const g = ctx.createLinearGradient(0, 0, fadeW, 0);
        g.addColorStop(0, 'rgba(26,26,46,0.85)');
        g.addColorStop(1, 'rgba(26,26,46,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, hudH, fadeW, height - hudH);
      }
      if (clipR) {
        const g = ctx.createLinearGradient(width - fadeW, 0, width, 0);
        g.addColorStop(0, 'rgba(26,26,46,0)');
        g.addColorStop(1, 'rgba(26,26,46,0.85)');
        ctx.fillStyle = g;
        ctx.fillRect(width - fadeW, hudH, fadeW, height - hudH);
      }
      if (clipT) {
        const g = ctx.createLinearGradient(0, hudH, 0, hudH + fadeW);
        g.addColorStop(0, 'rgba(26,26,46,0.85)');
        g.addColorStop(1, 'rgba(26,26,46,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, hudH, width, fadeW);
      }
      if (clipB) {
        const g = ctx.createLinearGradient(0, height - fadeW, 0, height);
        g.addColorStop(0, 'rgba(26,26,46,0)');
        g.addColorStop(1, 'rgba(26,26,46,0.85)');
        ctx.fillStyle = g;
        ctx.fillRect(0, height - fadeW, width, fadeW);
      }
    }

    if (indicators.minimap) {
      const mmMaxW = 60;
      const mmMaxH = 40;
      const mmMargin = 8;
      const gridTotalW = cellSize * cols;
      const gridTotalH = cellSize * rows;
      const mmScale = Math.min(mmMaxW / gridTotalW, mmMaxH / gridTotalH);
      const mmW = gridTotalW * mmScale;
      const mmH = gridTotalH * mmScale;
      const mmX = width - mmW - mmMargin;
      const mmY = hudH + mmMargin;

      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(mmX - 1, mmY - 1, mmW + 2, mmH + 2);

      // Grid cells (simplified: just hidden vs revealed)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c];
          ctx.fillStyle = cell.visual === 'revealed' ? '#3e4452' :
                          cell.visual === 'flagged' ? COLOR_FLAG : '#5c6370';
          ctx.fillRect(
            mmX + c * mmScale * cellSize,
            mmY + r * mmScale * cellSize,
            Math.ceil(mmScale * cellSize),
            Math.ceil(mmScale * cellSize),
          );
        }
      }

      // Viewport rectangle
      const vpL = Math.max(0, (-cam.x - gridX) * mmScale);
      const vpT = Math.max(0, (-(cam.y) - (gridY - hudH)) * mmScale);
      const vpW = Math.min(mmW - vpL, (width / cam.zoom) * mmScale);
      const vpH = Math.min(mmH - vpT, ((height - hudH) / cam.zoom) * mmScale);
      ctx.strokeStyle = COLOR_ACCENT;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mmX + vpL, mmY + vpT, vpW, vpH);
    }
  }

  // Game over overlay (screen space)
  if (status === 'won' || status === 'lost') {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, hudH, width, height - hudH);
    const bigSize = Math.max(12, Math.min(28, width * 0.07));
    ctx.font = `${bigSize}px "Press Start 2P", monospace`;
    ctx.fillStyle = status === 'won' ? '#4caf50' : COLOR_MINE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = width / 2;
    const cy = hudH + (height - hudH) / 2;
    ctx.fillText(status === 'won' ? 'YOU WIN!' : 'GAME OVER', cx, cy);
    ctx.font = `${Math.floor(bigSize * 0.5)}px "Press Start 2P", monospace`;
    ctx.fillStyle = COLOR_HUD_DIM;
    ctx.fillText('Tap to restart', cx, cy + bigSize * 1.5);
  }
}

function drawMine(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.25;
  ctx.fillStyle = COLOR_MINE;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Spikes
  ctx.strokeStyle = COLOR_MINE;
  ctx.lineWidth = Math.max(1, size * 0.08);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r * 0.5, cy + Math.sin(angle) * r * 0.5);
    ctx.lineTo(cx + Math.cos(angle) * r * 1.6, cy + Math.sin(angle) * r * 1.6);
    ctx.stroke();
  }
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  const cx = x + size / 2;
  const base = y + size * 0.75;
  const top = y + size * 0.2;
  // Pole
  ctx.strokeStyle = COLOR_HUD_TEXT;
  ctx.lineWidth = Math.max(1, size * 0.07);
  ctx.beginPath();
  ctx.moveTo(cx, base);
  ctx.lineTo(cx, top);
  ctx.stroke();
  // Flag triangle
  ctx.fillStyle = COLOR_FLAG;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(cx + size * 0.28, top + size * 0.15);
  ctx.lineTo(cx, top + size * 0.3);
  ctx.closePath();
  ctx.fill();
}
