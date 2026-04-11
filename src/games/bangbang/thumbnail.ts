/** Decorative Bang! Bang! thumbnail for the home screen. */

const SKY_TOP = '#0a1628';
const SKY_BOT = '#1a3a5c';
const TERRAIN = '#2d5a27';
const P0 = '#e06c75';
const P1 = '#61afef';
const PROJ = '#e5c07b';

export function drawThumbnail(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Sky
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, SKY_BOT);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Terrain — simple hills
  const terrainY = (x: number) =>
    h * 0.6 + Math.sin(x / w * Math.PI * 2) * h * 0.1 - Math.sin(x / w * Math.PI * 0.8) * h * 0.05;

  ctx.fillStyle = TERRAIN;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 2) {
    ctx.lineTo(x, terrainY(x));
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  // Left cannon
  const lx = w * 0.15;
  const ly = terrainY(lx);
  ctx.fillStyle = P0;
  ctx.fillRect(lx - 5, ly - 4, 10, 4);
  ctx.strokeStyle = P0;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(lx, ly - 2);
  ctx.lineTo(lx + 12, ly - 12);
  ctx.stroke();

  // Right cannon
  const rx = w * 0.85;
  const ry = terrainY(rx);
  ctx.fillStyle = P1;
  ctx.fillRect(rx - 5, ry - 4, 10, 4);
  ctx.strokeStyle = P1;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(rx, ry - 2);
  ctx.lineTo(rx - 12, ry - 12);
  ctx.stroke();

  // Projectile arc
  ctx.strokeStyle = PROJ;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  for (let t = 0; t <= 1; t += 0.02) {
    const x = lx + 12 + (rx - 12 - lx - 12) * t;
    const y = ly - 12 - Math.sin(t * Math.PI) * h * 0.35;
    if (t === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Explosion at right
  const ex = rx - 8;
  const ey = ry - 6;
  ctx.fillStyle = 'rgba(255,150,30,0.7)';
  ctx.beginPath();
  ctx.arc(ex, ey, 6, 0, Math.PI * 2);
  ctx.fill();
}
