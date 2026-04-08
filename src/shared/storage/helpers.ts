import { db, type Score } from './db';

export async function addScore(game: string, score: number): Promise<void> {
  await db.scores.add({ game, score, date: new Date().toISOString() });
}

export async function getTopScores(game: string, limit = 5): Promise<Score[]> {
  return db.scores
    .where('game')
    .equals(game)
    .reverse()
    .sortBy('score')
    .then((scores) => scores.slice(0, limit));
}

export async function getHighScore(game: string): Promise<number> {
  const top = await getTopScores(game, 1);
  return top[0]?.score ?? 0;
}

export async function saveState<T>(game: string, payload: T): Promise<void> {
  await db.state.put({ game, payload });
}

export async function loadState<T>(game: string): Promise<T | null> {
  const entry = await db.state.get(game);
  return (entry?.payload as T) ?? null;
}

export async function clearState(game: string): Promise<void> {
  await db.state.delete(game);
}

export async function saveSettings<T>(game: string, payload: T): Promise<void> {
  await db.settings.put({ game, payload });
}

export async function loadSettings<T>(game: string): Promise<T | null> {
  const entry = await db.settings.get(game);
  return (entry?.payload as T) ?? null;
}
