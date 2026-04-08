import Dexie, { type Table } from 'dexie';

export interface Score {
  id?: number;
  game: string;
  score: number;
  date: string; // ISO date
}

export interface GameState {
  game: string;
  payload: unknown;
}

export interface GameSettings {
  game: string;
  payload: unknown;
}

class GamePadDB extends Dexie {
  scores!: Table<Score>;
  state!: Table<GameState>;
  settings!: Table<GameSettings>;

  constructor() {
    super('gamepad');
    this.version(1).stores({
      scores: '++id, game, score',
      state: '&game',
      settings: '&game',
    });
  }
}

export const db = new GamePadDB();
