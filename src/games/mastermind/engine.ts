import {
  type Color, type MastermindState, type Feedback,
  COLORS, SECRET_LENGTH,
} from './types';

export function createState(): MastermindState {
  const secret: Color[] = [];
  for (let i = 0; i < SECRET_LENGTH; i++) {
    secret.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
  }
  return {
    secret,
    guesses: [],
    activeGuess: [null, null, null, null],
    status: 'playing',
  };
}

export function placePeg(state: MastermindState, slot: number, color: Color): void {
  if (state.status !== 'playing') return;
  if (slot < 0 || slot >= SECRET_LENGTH) return;
  state.activeGuess[slot] = color;
}

export function clearPeg(state: MastermindState, slot: number): void {
  if (state.status !== 'playing') return;
  if (slot < 0 || slot >= SECRET_LENGTH) return;
  state.activeGuess[slot] = null;
}

export function isGuessComplete(state: MastermindState): boolean {
  return state.activeGuess.every((c) => c !== null);
}

export function computeFeedback(secret: Color[], guess: Color[]): Feedback {
  let white = 0;
  let black = 0;
  const secretCounts: Partial<Record<Color, number>> = {};
  const guessCounts: Partial<Record<Color, number>> = {};

  for (let i = 0; i < SECRET_LENGTH; i++) {
    if (secret[i] === guess[i]) {
      white++;
    } else {
      secretCounts[secret[i]] = (secretCounts[secret[i]] ?? 0) + 1;
      guessCounts[guess[i]] = (guessCounts[guess[i]] ?? 0) + 1;
    }
  }

  for (const color of COLORS) {
    black += Math.min(secretCounts[color] ?? 0, guessCounts[color] ?? 0);
  }

  return { white, black };
}

export function submitGuess(state: MastermindState): void {
  if (state.status !== 'playing') return;
  if (!isGuessComplete(state)) return;

  const pegs = state.activeGuess.filter((c): c is Color => c !== null);
  if (pegs.length !== SECRET_LENGTH) return;

  const feedback = computeFeedback(state.secret, pegs);
  state.guesses.push({ pegs, feedback });
  state.activeGuess = [null, null, null, null];

  if (feedback.white === SECRET_LENGTH) {
    state.status = 'won';
  }
}
