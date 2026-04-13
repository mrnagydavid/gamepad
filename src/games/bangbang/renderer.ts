import {
  type BangState,
  CANNON_W, CANNON_H, BARREL_LEN, PROJECTILE_R, MAX_HP,
} from './types';

const SKY_TOP = '#0a1628';
const SKY_BOTTOM = '#1a3a5c';
const TERRAIN_TOP = '#2d5a27';
const TERRAIN_BOTTOM = '#4a3728';
const P0_COLOR = '#e06c75';
const P1_COLOR = '#61afef';
const PROJ_COLOR = '#e5c07b';
const HUD_TEXT = '#c8c8d0';
const HUD_DIM = '#6b6b80';
const HEART_FULL = '#e06c75';
const HEART_EMPTY = '#3e4452';
const WIND_COLOR = '#c8c8d0';

export function render(ctx: CanvasRenderingContext2D, state: BangState): void {
  const { terrain, players, currentPlayer, phase, projectile, explosion, wind, winner, canvasW: w, canvasH: h } = state;

  // --- Sky ---
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, SKY_TOP);
  skyGrad.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // --- Terrain ---
  const terrGrad = ctx.createLinearGradient(0, h * 0.3, 0, h);
  terrGrad.addColorStop(0, TERRAIN_TOP);
  terrGrad.addColorStop(1, TERRAIN_BOTTOM);
  ctx.fillStyle = terrGrad;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x < w; x++) {
    ctx.lineTo(x, terrain[x]);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Terrain edge line
  ctx.strokeStyle = '#3a7a34';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    if (x === 0) ctx.moveTo(x, terrain[x]);
    else ctx.lineTo(x, terrain[x]);
  }
  ctx.stroke();

  // --- Cannons ---
  for (const p of players) {
    const color = p.id === 0 ? P0_COLOR : P1_COLOR;
    const dir = p.id === 0 ? 1 : -1;
    const rad = (p.angle * Math.PI) / 180;

    if (p.hp <= 0) {
      // Ruin
      drawRuin(ctx, p.x, p.cannonY, color);
      continue;
    }

    // Barrel
    const bx = p.x + Math.cos(rad) * BARREL_LEN * dir;
    const by = p.cannonY - Math.sin(rad) * BARREL_LEN;
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.cannonY);
    ctx.lineTo(bx, by);
    ctx.stroke();

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(p.x - CANNON_W / 2, p.cannonY - CANNON_H, CANNON_W, CANNON_H);

    // Wheels
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(p.x - CANNON_W / 3, p.cannonY, 4, 0, Math.PI * 2);
    ctx.arc(p.x + CANNON_W / 3, p.cannonY, 4, 0, Math.PI * 2);
    ctx.fill();

    // HP hearts
    const heartY = p.cannonY - CANNON_H - 16;
    const heartStartX = p.x - (MAX_HP * 10) / 2;
    for (let i = 0; i < MAX_HP; i++) {
      ctx.fillStyle = i < p.hp ? HEART_FULL : HEART_EMPTY;
      drawHeart(ctx, heartStartX + i * 10 + 5, heartY, 4);
    }

    // Active indicator
    if (phase === 'aiming' && p.id === currentPlayer) {
      ctx.fillStyle = color;
      const arrowY = p.cannonY - CANNON_H - 28;
      ctx.beginPath();
      ctx.moveTo(p.x, arrowY + 6);
      ctx.lineTo(p.x - 5, arrowY);
      ctx.lineTo(p.x + 5, arrowY);
      ctx.closePath();
      ctx.fill();
    }
  }

  // --- Projectile + trail ---
  if (projectile && phase === 'firing') {
    // Trail
    for (let i = 0; i < projectile.trail.length; i++) {
      const t = projectile.trail[i];
      const alpha = (i / projectile.trail.length) * 0.6;
      const r = PROJECTILE_R * (i / projectile.trail.length) * 0.8;
      ctx.fillStyle = `rgba(229, 192, 123, ${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Projectile
    ctx.fillStyle = PROJ_COLOR;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, PROJECTILE_R, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Explosion ---
  if (explosion) {
    drawExplosion(ctx, explosion.x, explosion.y, explosion.timer / explosion.duration);
  }

  // --- Wind arrow ---
  const windX = w / 2;
  const windY = 20;
  const arrowLen = Math.abs(wind) * 40;
  const windDir = wind > 0 ? 1 : -1;
  if (arrowLen > 2) {
    ctx.strokeStyle = WIND_COLOR;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(windX - arrowLen * windDir, windY);
    ctx.lineTo(windX + arrowLen * windDir, windY);
    // Arrowhead
    ctx.lineTo(windX + arrowLen * windDir - 6 * windDir, windY - 5);
    ctx.moveTo(windX + arrowLen * windDir, windY);
    ctx.lineTo(windX + arrowLen * windDir - 6 * windDir, windY + 5);
    ctx.stroke();
  }
  ctx.font = '9px "Press Start 2P", monospace';
  ctx.fillStyle = HUD_DIM;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('WIND', windX, windY + 10);

  // --- Player labels ---
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle = P0_COLOR;
  ctx.textAlign = 'left';
  ctx.fillText('P1', 8, 8);
  ctx.fillStyle = P1_COLOR;
  ctx.textAlign = 'right';
  ctx.fillText(players[1].isCpu ? 'CPU' : 'P2', w - 8, 8);

  // --- Turn indicator text (humans only; CPU status shown in controls strip) ---
  if (phase === 'aiming') {
    const p = players[currentPlayer];
    if (!p.isCpu) {
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.fillStyle = HUD_TEXT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`Player ${currentPlayer + 1}'s turn`, w / 2, h - 16);
    }
  }

  // --- Game over overlay ---
  if (phase === 'gameover' && winner !== null) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, h);
    const bigSize = Math.max(12, Math.min(24, w * 0.04));
    ctx.font = `${bigSize}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = winner === 0 ? P0_COLOR : P1_COLOR;
    const winLabel = players[winner].isCpu ? 'CPU Wins!' : `Player ${winner + 1} Wins!`;
    ctx.fillText(winLabel, w / 2, h / 2 - bigSize);
    ctx.font = `${Math.floor(bigSize * 0.5)}px "Press Start 2P", monospace`;
    ctx.fillStyle = HUD_DIM;
    ctx.fillText('', w / 2, h / 2 + bigSize);
  }

}

/** Multi-layer explosion: flash, fireball, shockwave ring, debris spokes. */
function drawExplosion(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number): void {
  t = Math.max(0, Math.min(1, t));
  const peak = Math.min(1, t * 2); // quick rise
  const fade = 1 - t;

  // Initial flash (very brief)
  if (t < 0.15) {
    const fa = 1 - t / 0.15;
    ctx.fillStyle = `rgba(255, 255, 220, ${fa * 0.8})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 55 * peak, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main fireball
  const fbR = 18 + 22 * peak;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, fbR);
  grad.addColorStop(0, `rgba(255, 240, 180, ${fade})`);
  grad.addColorStop(0.4, `rgba(255, 160, 60, ${0.9 * fade})`);
  grad.addColorStop(0.8, `rgba(220, 70, 30, ${0.7 * fade})`);
  grad.addColorStop(1, 'rgba(100, 20, 10, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, fbR, 0, Math.PI * 2);
  ctx.fill();

  // Shockwave ring (expanding)
  const ringR = 10 + 60 * t;
  ctx.strokeStyle = `rgba(255, 220, 150, ${fade * 0.6})`;
  ctx.lineWidth = Math.max(1, 3 * fade);
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.stroke();

  // Debris spokes (8 radial lines)
  ctx.strokeStyle = `rgba(60, 40, 30, ${fade})`;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const spokeLen = 22 + 30 * t;
  const inner = 8 + 10 * t;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + t * 0.5;
    const x1 = cx + Math.cos(a) * inner;
    const y1 = cy + Math.sin(a) * inner;
    const x2 = cx + Math.cos(a) * spokeLen;
    const y2 = cy + Math.sin(a) * spokeLen;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

/** Destroyed cannon: broken tilted body, no barrel, charred debris. */
function drawRuin(ctx: CanvasRenderingContext2D, x: number, y: number, baseColor: string): void {
  const w = CANNON_W;

  // Dark ground scorch
  ctx.fillStyle = 'rgba(20, 10, 5, 0.5)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, w * 0.9, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tilted broken body (rotated rectangle, dimmed color)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25);
  ctx.fillStyle = '#3a3038';
  ctx.fillRect(-w / 2, -CANNON_H, w, CANNON_H);
  // Jagged top edge
  ctx.fillStyle = '#2a2228';
  ctx.beginPath();
  ctx.moveTo(-w / 2, -CANNON_H);
  ctx.lineTo(-w / 3, -CANNON_H - 3);
  ctx.lineTo(-w / 6, -CANNON_H + 1);
  ctx.lineTo(0, -CANNON_H - 4);
  ctx.lineTo(w / 6, -CANNON_H - 1);
  ctx.lineTo(w / 3, -CANNON_H - 3);
  ctx.lineTo(w / 2, -CANNON_H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Debris fragments with original color tint
  ctx.fillStyle = baseColor;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(x - w / 2 - 3, y - 2, 4, 3);
  ctx.fillRect(x + w / 2 - 2, y - 4, 3, 4);
  ctx.globalAlpha = 1;

  // Small smoke puff
  ctx.fillStyle = 'rgba(80, 70, 70, 0.5)';
  ctx.beginPath();
  ctx.arc(x, y - CANNON_H - 4, 4, 0, Math.PI * 2);
  ctx.arc(x - 3, y - CANNON_H - 7, 3, 0, Math.PI * 2);
  ctx.arc(x + 3, y - CANNON_H - 6, 3, 0, Math.PI * 2);
  ctx.fill();
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
