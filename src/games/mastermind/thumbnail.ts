/** Decorative Mastermind thumbnail. */

const BG = '#16213e';
const SURFACE = '#0f3460';
const SECRET = '#3e4452';
const BORDER = '#0a1628';

const COLORS = {
  red: '#e06c75',
  yellow: '#e5c07b',
  green: '#4caf50',
  blue: '#5b86e5',
  white: '#f0f0f0',
  black: '#1a1a1a',
};

export function drawThumbnail(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  const pegR = Math.min(w, h) * 0.07;
  const gap = pegR * 0.6;
  const rowH = pegR * 2.4;

  // 4 pegs per row
  const pegsWidth = 4 * (pegR * 2) + 3 * gap;
  const ox = (w - pegsWidth) / 2;

  const drawRow = (y: number, colors: string[], feedbackWhite: number, feedbackBlack: number) => {
    // Background plate
    ctx.fillStyle = SURFACE;
    const plateH = pegR * 2.2;
    ctx.fillRect(ox - 8, y - plateH / 2, pegsWidth + 16 + 32, plateH);

    // Pegs
    for (let i = 0; i < 4; i++) {
      const x = ox + pegR + i * (pegR * 2 + gap);
      ctx.fillStyle = colors[i];
      ctx.strokeStyle = BORDER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, pegR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Feedback pins (2x2)
    const pinR = pegR * 0.25;
    const pinStartX = ox + pegsWidth + 10;
    const pinGap = pinR * 0.7;
    const pins: string[] = [];
    for (let i = 0; i < feedbackWhite; i++) pins.push(COLORS.white);
    for (let i = 0; i < feedbackBlack; i++) pins.push(COLORS.black);
    while (pins.length < 4) pins.push('#2a2f3a');
    for (let i = 0; i < 4; i++) {
      const px = pinStartX + (i % 2) * (pinR * 2 + pinGap);
      const py = y - pinR - pinGap / 2 + Math.floor(i / 2) * (pinR * 2 + pinGap);
      ctx.fillStyle = pins[i];
      ctx.beginPath();
      ctx.arc(px, py, pinR, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Secret row (all grey)
  const secretY = rowH * 0.8;
  for (let i = 0; i < 4; i++) {
    const x = ox + pegR + i * (pegR * 2 + gap);
    ctx.fillStyle = SECRET;
    ctx.strokeStyle = BORDER;
    ctx.beginPath();
    ctx.arc(x, secretY, pegR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Guesses
  drawRow(secretY + rowH, [COLORS.red, COLORS.blue, COLORS.green, COLORS.yellow], 1, 1);
  drawRow(secretY + rowH * 2, [COLORS.green, COLORS.red, COLORS.yellow, COLORS.blue], 2, 1);
  drawRow(secretY + rowH * 3, [COLORS.yellow, COLORS.white, COLORS.red, COLORS.black], 0, 2);
}
