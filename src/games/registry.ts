import type { ComponentType } from 'preact';

export interface GameMeta {
  id: string;
  title: string;
  color: string; // accent color for the card
  component: () => Promise<{ default: ComponentType<GameProps> }>;
}

export interface GameProps {
  onQuit: () => void;
}

/** Master game list — games are added here as they're built. */
export const GAMES: GameMeta[] = [
  // Step 1: Minesweeper will be registered here
];
