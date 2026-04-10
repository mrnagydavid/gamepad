import { useRef, useCallback, useEffect, useState } from 'preact/hooks';
import type { GameProps } from '../registry';
import { createState, placePiece, tick } from './engine';
import { computeLayout, computeGridSize, hitTestGrid, render as renderPipes, type Layout } from './renderer';
import { useGameLoop } from '../../shared/hooks/useGameLoop';
import { addScore, getHighScore } from '../../shared/storage/helpers';
import { Button } from '../../shared/ui/Button';
import type { PipeDreamState } from './types';
import s from './pipedream.module.css';

export default function PipeDream({ onQuit }: GameProps) {
  const stateRef = useRef<PipeDreamState | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameStatus, setGameStatus] = useState<string>('countdown');
  const [highScore, setHighScore] = useState(0);

  const startGame = useCallback(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const { cols, rows } = computeGridSize(w, h, 48);
    stateRef.current = createState(cols, rows);
    layoutRef.current = computeLayout(cols, rows, w, h);
    setGameStatus('countdown');
  }, []);

  useEffect(() => {
    startGame();
    getHighScore('pipedream').then(setHighScore);
  }, [startGame]);

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
        if (stateRef.current.status === 'over' && prev !== 'over') {
          const sc = stateRef.current.score;
          getHighScore('pipedream').then((best) => {
            if (sc > best) {
              addScore('pipedream', sc);
              setHighScore(sc);
            }
          });
        }
      },
      render() {
        if (!stateRef.current || !ctxRef.current || !layoutRef.current) return;
        renderPipes(ctxRef.current, stateRef.current, layoutRef.current);
      },
    },
    false,
  );

  const handleTap = useCallback(
    (x: number, y: number) => {
      const state = stateRef.current;
      const layout = layoutRef.current;
      if (!state || !layout) return;

      if (state.status === 'over') {
        startGame();
        return;
      }

      const hit = hitTestGrid(x, y, layout, state.cols, state.rows);
      if (hit) {
        placePiece(state, hit[0], hit[1]);
      }
    },
    [startGame],
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
      </div>
      <div class={s.bottomBar}>
        <Button variant="secondary" onClick={onQuit}>
          Back
        </Button>
        {highScore > 0 && <span class={s.best}>Best: {highScore}</span>}
      </div>
    </div>
  );
}
