import type { ComponentType } from 'preact';
import { drawThumbnail as minesweeperThumb } from './minesweeper/thumbnail';
import { drawThumbnail as pipedreamThumb } from './pipedream/thumbnail';

export interface GameMeta {
  id: string;
  title: string;
  color: string; // accent color for the card
  component: () => Promise<{ default: ComponentType<GameProps> }>;
  /** Draw a small decorative thumbnail onto a canvas. */
  thumbnail?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

export interface GameProps {
  onQuit: () => void;
}

/** Master game list — games are added here as they're built. */
export const GAMES: GameMeta[] = [
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    color: '#e94560',
    component: () => import('./minesweeper/index'),
    thumbnail: minesweeperThumb,
  },
  {
    id: 'pipedream',
    title: 'Pipe Dream',
    color: '#7fdbca',
    component: () => import('./pipedream/index'),
    thumbnail: pipedreamThumb,
  },
];
