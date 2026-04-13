import { type JezzState, type Axis, HUD_H, BALL_RADIUS_RATIO } from './types';

const BG = '#0d1117';
const BORDER = '#2d3748';
const BORDER_LIGHT = '#3d4758';
const WALL = '#7a8394';
const WALL_EDGE = '#5c6370';
const CAPTURED = '#53d8fb';
const CAPTURED_EDGE = '#3ba8c4';
const GROWING = '#e5c07b';
const BALL_COLOR = '#e06c75';
const BALL_HIGHLIGHT = '#ff9ca4';
const HUD_TEXT = '#c8c8d0';
const HUD_DIM = '#6b6b80';
const HEART = '#e06c75';
const HEART_EMPTY = '#3e4452';
const PREVIEW = 'rgba(229,192,123,0.5)';

export interface Layout {
  width: number;
  height: number;
  gridX: number;
  gridY: number;
  cellSize: number;
  hudH: number;
}

export function computeLayout(state: JezzState, w: number, h: number): Layout {
  const gridW = state.cols * state.cellSize;
  const gridH = state.rows * state.cellSize;
  const gridX = Math.floor((w - gridW) / 2);
  const gridY = HUD_H + Math.floor((h - HUD_H - gridH) / 2);
  return { width: w, height: h, gridX, gridY, cellSize: state.cellSize, hudH: HUD_H };
}

export function hitTestGrid(px: number, py: number, state: JezzState, layout: Layout): { col: number; row: number } | null {
  const col = Math.floor((px - layout.gridX) / layout.cellSize);
  const row = Math.floor((py - layout.gridY) / layout.cellSize);
  if (col < 1 || col >= state.cols - 1 || row < 1 || row >= state.rows - 1) return null;
  return { col, row };
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: JezzState,
  layout: Layout,
  preview: { row: number; col: number; axis: Axis } | null,
  now: number,
): void {
  const { width: w, height: h, gridX, gridY, cellSize: cs, hudH } = layout;

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  // Grid cells
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const x = gridX + c * cs;
      const y = gridY + r * cs;
      const cell = state.grid[r][c];

      if (cell === 'empty') continue;

      if (cell === 'border') {
        ctx.fillStyle = BORDER;
        ctx.fillRect(x, y, cs, cs);
        ctx.fillStyle = BORDER_LIGHT;
        ctx.fillRect(x, y, cs, 1);
        ctx.fillRect(x, y, 1, cs);
      } else if (cell === 'wall') {
        ctx.fillStyle = WALL;
        ctx.fillRect(x, y, cs, cs);
        ctx.strokeStyle = WALL_EDGE;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
      } else if (cell === 'captured') {
        ctx.fillStyle = CAPTURED;
        ctx.fillRect(x, y, cs, cs);
        ctx.strokeStyle = CAPTURED_EDGE;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
      } else if (cell === 'growing') {
        // Pulse
        const pulse = 0.7 + 0.3 * Math.sin(now / 80);
        ctx.fillStyle = GROWING;
        ctx.globalAlpha = pulse;
        ctx.fillRect(x, y, cs, cs);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Growing wall head markers (blinking tips)
  if (state.growing) {
    const g = state.growing;
    const blink = 0.5 + 0.5 * Math.sin(now / 60);
    ctx.fillStyle = `rgba(255, 220, 120, ${blink})`;
    if (g.axis === 'h') {
      if (!g.leftDone) {
        const x = gridX + (g.leftEnd - 1) * cs;
        const y = gridY + g.originRow * cs;
        ctx.fillRect(x + cs / 4, y + cs / 4, cs / 2, cs / 2);
      }
      if (!g.rightDone) {
        const x = gridX + (g.rightEnd + 1) * cs;
        const y = gridY + g.originRow * cs;
        ctx.fillRect(x + cs / 4, y + cs / 4, cs / 2, cs / 2);
      }
    } else {
      if (!g.leftDone) {
        const x = gridX + g.originCol * cs;
        const y = gridY + (g.leftEnd - 1) * cs;
        ctx.fillRect(x + cs / 4, y + cs / 4, cs / 2, cs / 2);
      }
      if (!g.rightDone) {
        const x = gridX + g.originCol * cs;
        const y = gridY + (g.rightEnd + 1) * cs;
        ctx.fillRect(x + cs / 4, y + cs / 4, cs / 2, cs / 2);
      }
    }
  }

  // Preview (before committing a wall)
  if (preview) {
    const x = gridX + preview.col * cs;
    const y = gridY + preview.row * cs;
    ctx.strokeStyle = PREVIEW;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    if (preview.axis === 'h') {
      ctx.beginPath();
      ctx.moveTo(gridX + cs, y + cs / 2);
      ctx.lineTo(gridX + (state.cols - 1) * cs, y + cs / 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + cs / 2, gridY + cs);
      ctx.lineTo(x + cs / 2, gridY + (state.rows - 1) * cs);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Highlight origin
    ctx.fillStyle = PREVIEW;
    ctx.fillRect(x, y, cs, cs);
  }

  // Balls
  const radius = cs * BALL_RADIUS_RATIO;
  for (const ball of state.balls) {
    const bx = gridX + ball.x;
    const by = gridY + ball.y;
    ctx.fillStyle = BALL_COLOR;
    ctx.beginPath();
    ctx.arc(bx, by, radius, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = BALL_HIGHLIGHT;
    ctx.beginPath();
    ctx.arc(bx - radius * 0.3, by - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  // HUD
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, hudH);
  const fontSize = 11;
  ctx.font = `${fontSize}px "Press Start 2P", monospace`;
  ctx.textBaseline = 'middle';
  const hudY = hudH / 2;

  // Level (left)
  ctx.fillStyle = HUD_TEXT;
  ctx.textAlign = 'left';
  ctx.fillText(`Lv${state.level}`, 8, hudY);

  // Lives (center-left)
  const heartSize = 5;
  const heartsX = 70;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < state.lives ? HEART : HEART_EMPTY;
    drawHeart(ctx, heartsX + i * 14, hudY, heartSize);
  }

  // Percent (right)
  const pct = Math.floor(state.percent * 100);
  ctx.fillStyle = pct >= 75 ? CAPTURED : HUD_DIM;
  ctx.textAlign = 'right';
  ctx.fillText(`${pct}%`, w - 8, hudY);
}

function drawHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.4);
  ctx.bezierCurveTo(cx, cy - size * 0.2, cx - size, cy - size * 0.2, cx - size, cy + size * 0.2);
  ctx.bezierCurveTo(cx - size, cy + size * 0.6, cx, cy + size, cx, cy + size);
  ctx.bezierCurveTo(cx, cy + size, cx + size, cy + size * 0.6, cx + size, cy + size * 0.2);
  ctx.bezierCurveTo(cx + size, cy - size * 0.2, cx, cy - size * 0.2, cx, cy + size * 0.4);
  ctx.closePath();
  ctx.fill();
}
