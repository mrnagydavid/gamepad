export type Color = 'black' | 'white' | 'red' | 'yellow' | 'green' | 'blue';

export const COLORS: Color[] = ['black', 'white', 'red', 'yellow', 'green', 'blue'];

/** CSS fill per color. */
export const COLOR_FILL: Record<Color, string> = {
  black: '#1a1a1a',
  white: '#f0f0f0',
  red: '#e06c75',
  yellow: '#e5c07b',
  green: '#4caf50',
  blue: '#5b86e5',
};

export const SECRET_LENGTH = 4;
export const CLASSIC_LIMIT = 10;

export interface Feedback {
  white: number;
  black: number;
}

export interface Guess {
  pegs: Color[];
  feedback: Feedback;
}

export type GameStatus = 'playing' | 'won';

export interface MastermindState {
  secret: Color[];
  guesses: Guess[];
  activeGuess: (Color | null)[];
  status: GameStatus;
}
