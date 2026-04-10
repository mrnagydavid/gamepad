import { useRef, useCallback, useEffect, useState } from 'preact/hooks';
import type { GameProps } from '../registry';
import { createState, placePiece, tick } from './engine';
import { computeLayout, computeGridSize, hitTestGrid, render as renderPipes, type Layout } from './renderer';
import { useGameLoop } from '../../shared/hooks/useGameLoop';
import { addScore, getHighScore } from '../../shared/storage/helpers';
import { Button } from '../../shared/ui/Button';
import { DIFFICULTY, type PipeDreamState } from './types';
import s from './pipedream.module.css';

export default function PipeDream({ onQuit }: GameProps) {
  const stateRef = useRef<PipeDreamState | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameStatus, setGameStatus] = useState<string>('countdown');
  const [highScore, setHighScore] = useState(0);
  const [highLevel, setHighLevel] = useState(0);
  const levelRef = useRef(1);
  const totalScoreRef = useRef(0);

  useEffect(() => {
    getHighScore('pipedream').then(setHighLevel);
    getHighScore('pipedream-score').then(setHighScore);
  }, []);

  // Canvas resize
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const resize = () => {
      const container = containerRef.current!;
      const canvas = canvasRef.current!;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctxRef.current = ctx;
      if (stateRef.current) {
        layoutRef.current = computeLayout(stateRef.current.cols, stateRef.current.rows, w, h);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useGameLoop(
    {
      update(dt: number) {
        if (!stateRef.current) return;
        const prev = stateRef.current.status;
        tick(stateRef.current, dt);
        if (stateRef.current.status !== prev) {
          setGameStatus(stateRef.current.status);
        }
        // Save highest level and score on game over
        if (stateRef.current.status === 'over' && prev !== 'over') {
          const lvl = stateRef.current.level;
          const sc = totalScoreRef.current + stateRef.current.score;
          getHighScore('pipedream').then((best) => {
            if (lvl > best) { addScore('pipedream', lvl); setHighLevel(lvl); }
          });
          getHighScore('pipedream-score').then((best) => {
            if (sc > best) { addScore('pipedream-score', sc); setHighScore(sc); }
          });
        }
      },
      render() {
        if (!stateRef.current || !ctxRef.current || !layoutRef.current) return;
        renderPipes(ctxRef.current, stateRef.current, layoutRef.current, totalScoreRef.current);
      },
    },
    false,
  );

  const startLevel = useCallback((level: number) => {
    if (!containerRef.current) return;
    // Accumulate score from previous level, or reset on restart
    if (level === 1) {
      totalScoreRef.current = 0;
    } else if (stateRef.current) {
      totalScoreRef.current += stateRef.current.score;
    }
    levelRef.current = level;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const { cols, rows } = computeGridSize(w, h, 48);
    stateRef.current = createState(cols, rows, DIFFICULTY, level);
    layoutRef.current = computeLayout(cols, rows, w, h);
    setGameStatus('countdown');
  }, []);

  // Start level 1 once container is measured
  useEffect(() => {
    requestAnimationFrame(() => startLevel(1));
  }, [startLevel]);

  const handleTap = useCallback(
    (x: number, y: number) => {
      const state = stateRef.current;
      const layout = layoutRef.current;
      if (!state || !layout) return;

      if (state.status === 'won' || state.status === 'over') return;

      const hit = hitTestGrid(x, y, layout, state.cols, state.rows);
      if (hit) {
        placePiece(state, hit[0], hit[1]);
      }
    },
    [startLevel],
  );

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      handleTap(e.clientX - rect.left, e.clientY - rect.top);
    },
    [handleTap],
  );

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = canvasRef.current!.getBoundingClientRect();
    touchStart.current = { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }, []);

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      if (touchStart.current) {
        handleTap(touchStart.current.x, touchStart.current.y);
        touchStart.current = null;
      }
    },
    [handleTap],
  );

  const onContextMenu = useCallback((e: Event) => e.preventDefault(), []);

  return (
    <div class={s.container}>
      <div class={s.canvasWrap} ref={containerRef}>
        <canvas
          ref={canvasRef}
          class={s.canvas}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onContextMenu={onContextMenu}
        />
        {(gameStatus === 'won' || gameStatus === 'over') && (
          <div class={s.endOverlay}>
            <Button
              onClick={() =>
                gameStatus === 'won'
                  ? startLevel(levelRef.current + 1)
                  : startLevel(1)
              }
            >
              {gameStatus === 'won' ? 'Next Level' : 'Retry'}
            </Button>
          </div>
        )}
      </div>
      <div class={s.bottomBar}>
        <Button variant="secondary" onClick={onQuit}>
          Back
        </Button>
        {(highLevel > 0 || highScore > 0) && (
          <span class={s.best}>
            {highLevel > 0 ? `Lv${highLevel}` : ''}{highLevel > 0 && highScore > 0 ? ' / ' : ''}{highScore > 0 ? `${highScore}pts` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
