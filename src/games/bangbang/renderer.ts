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
    const t = explosion.timer / explosion.duration;
    const r = 30 * t;
    const grad = ctx.createRadialGradient(explosion.x, explosion.y, 0, explosion.x, explosion.y, r);
    grad.addColorStop(0, `rgba(255, 200, 50, ${1 - t})`);
    grad.addColorStop(0.5, `rgba(255, 100, 30, ${0.8 - t * 0.8})`);
    grad.addColorStop(1, 'rgba(255, 50, 20, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, r, 0, Math.PI * 2);
    ctx.fill();
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

  // --- Turn indicator text ---
  if (phase === 'aiming') {
    const p = players[currentPlayer];
    const label = p.isCpu ? 'CPU thinking...' : `Player ${currentPlayer + 1}'s turn`;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = HUD_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, w / 2, h - 16);
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
