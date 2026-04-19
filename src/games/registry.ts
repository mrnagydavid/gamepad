import type { ComponentType } from 'preact';
import { drawThumbnail as minesweeperThumb } from './minesweeper/thumbnail';
import { drawThumbnail as pipedreamThumb } from './pipedream/thumbnail';
import { drawThumbnail as bangbangThumb } from './bangbang/thumbnail';
import { drawThumbnail as jezzballThumb } from './jezzball/thumbnail';
import { drawThumbnail as mastermindThumb } from './mastermind/thumbnail';
import { getBestTime, getHighScore } from '../shared/storage/helpers';

export interface GameMeta {
  id: string;
  title: string;
  color: string; // accent color for the card
  component: () => Promise<{ default: ComponentType<GameProps> }>;
  /** Draw a small decorative thumbnail onto a canvas. */
  thumbnail?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  /** Fetch and format the best score for the home screen. Returns null if no score. */
  bestLabel?: () => Promise<string | null>;
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
    bestLabel: async () => {
      const t = await getBestTime('minesweeper-easy');
      if (!t) return null;
      const mm = String(Math.floor(t / 60)).padStart(2, '0');
      const ss = String(t % 60).padStart(2, '0');
      return `Best: ${mm}:${ss}`;
    },
  },
  {
    id: 'pipedream',
    title: 'Pipe Dream',
    color: '#7fdbca',
    component: () => import('./pipedream/index'),
    thumbnail: pipedreamThumb,
    bestLabel: async () => {
      const s = await getHighScore('pipedream');
      return s ? `Best: Lv${s}` : null;
    },
  },
  {
    id: 'bangbang',
    title: 'Bang! Bang!',
    color: '#f4a261',
    component: () => import('./bangbang/index'),
    thumbnail: bangbangThumb,
    bestLabel: async () => {
      const s = await getBestTime('bangbang-shots');
      return s ? `Best: ${s} shots` : null;
    },
  },
  {
    id: 'jezzball',
    title: 'Jezzball',
    color: '#53d8fb',
    component: () => import('./jezzball/index'),
    thumbnail: jezzballThumb,
    bestLabel: async () => {
      const s = await getHighScore('jezzball');
      return s ? `Best: ${s}` : null;
    },
  },
  {
    id: 'mastermind',
    title: 'Mastermind',
    color: '#a66cff',
    component: () => import('./mastermind/index'),
    thumbnail: mastermindThumb,
    bestLabel: async () => {
      const n = await getBestTime('mastermind');
      return n ? `Best: ${n} guesses` : null;
    },
  },
];
