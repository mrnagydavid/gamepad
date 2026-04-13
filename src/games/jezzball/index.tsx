import { useRef, useCallback, useEffect, useState } from 'preact/hooks';
import type { GameProps } from '../registry';
import { createState, startWall, cancelWall, tick } from './engine';
import { computeLayout, hitTestGrid, render as renderGame, type Layout } from './renderer';
import { useGameLoop } from '../../shared/hooks/useGameLoop';
import { addScore, getHighScore } from '../../shared/storage/helpers';
import { Button } from '../../shared/ui/Button';
import { SWIPE_THRESHOLD, type Axis, type JezzState } from './types';
import s from './jezzball.module.css';

export default function Jezzball({ onQuit }: GameProps) {
  const stateRef = useRef<JezzState | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameStatus, setGameStatus] = useState<string>('playing');
  const [hintVisible, setHintVisible] = useState(true);
  const [highScore, setHighScore] = useState(0);
  const levelRef = useRef(1);
  const previewRef = useRef<{ row: number; col: number; axis: Axis } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; row: number; col: number; axis: Axis | null } | null>(null);

  useEffect(() => {
    getHighScore('jezzball').then(setHighScore);
  }, []);

  // Canvas resize
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    const doResize = () => {
      const el = containerRef.current!;
      const canvas = canvasRef.current!;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctxRef.current = ctx;
      if (stateRef.current) {
        layoutRef.current = computeLayout(stateRef.current, w, h);
      }
    };
    doResize();
    window.addEventListener('resize', doResize);
    return () => window.removeEventListener('resize', doResize);
  }, []);

  const startLevel = useCallback((level: number) => {
    if (!containerRef.current) return;
    levelRef.current = level;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    stateRef.current = createState(w, h, level);
    layoutRef.current = computeLayout(stateRef.current, w, h);
    setGameStatus('playing');
    setHintVisible(level === 1);
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => startLevel(1));
  }, [startLevel]);

  // Game loop
  useGameLoop(
    {
      update(dt: number) {
        const st = stateRef.current;
        if (!st) return;
        const prev = st.status;
        tick(st, dt);
        if (st.status !== prev) setGameStatus(st.status);
        if (st.status === 'gameover' && prev !== 'gameover') {
          const lvl = st.level;
          getHighScore('jezzball').then((best) => {
            if (lvl > best) {
              addScore('jezzball', lvl);
              setHighScore(lvl);
            }
          });
        }
      },
      render() {
        const st = stateRef.current;
        if (!st || !ctxRef.current || !layoutRef.current) return;
        renderGame(ctxRef.current, st, layoutRef.current, previewRef.current, performance.now());
      },
    },
    false,
  );

  // --- Input ---
  const getPoint = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ('touches' in e) {
      const t = e.touches[0] ?? (e as TouchEvent).changedTouches[0];
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    setHintVisible(false);
    const st = stateRef.current;
    const layout = layoutRef.current;
    if (!st || !layout || st.status !== 'playing') return;

    // If a wall is growing, tap anywhere cancels it
    if (st.growing) {
      cancelWall(st);
      return;
    }

    const { x, y } = getPoint(e);
    const hit = hitTestGrid(x, y, st, layout);
    if (!hit) return;
    if (st.grid[hit.row][hit.col] !== 'empty') return;
    dragRef.current = { startX: x, startY: y, row: hit.row, col: hit.col, axis: null };
  }, []);

  const onPointerMove = useCallback((e: MouseEvent | TouchEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    e.preventDefault();
    const { x, y } = getPoint(e);
    const dx = x - drag.startX;
    const dy = y - drag.startY;
    const dist = Math.hypot(dx, dy);
    if (dist >= SWIPE_THRESHOLD) {
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      previewRef.current = { row: drag.row, col: drag.col, axis: drag.axis };
    } else {
      previewRef.current = null;
    }
  }, []);

  const onPointerUp = useCallback((e: MouseEvent | TouchEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    previewRef.current = null;
    if (!drag) return;
    e.preventDefault();
    if (!drag.axis) return;
    const st = stateRef.current;
    if (!st) return;
    startWall(st, drag.row, drag.col, drag.axis);
  }, []);

  const onPointerCancel = useCallback(() => {
    dragRef.current = null;
    previewRef.current = null;
  }, []);

  return (
    <div class={s.container}>
      <div class={s.canvasWrap} ref={containerRef}>
        <canvas
          ref={canvasRef}
          class={s.canvas}
          onMouseDown={onPointerDown as any}
          onMouseMove={onPointerMove as any}
          onMouseUp={onPointerUp as any}
          onMouseLeave={onPointerCancel}
          onTouchStart={onPointerDown as any}
          onTouchMove={onPointerMove as any}
          onTouchEnd={onPointerUp as any}
          onTouchCancel={onPointerCancel}
          onContextMenu={(e: Event) => e.preventDefault()}
        />
        {hintVisible && gameStatus === 'playing' && (
          <div class={s.hintOverlay}>
            <div class={s.hintText}>Swipe ↕ or ↔</div>
          </div>
        )}
        {gameStatus === 'levelclear' && (
          <div class={s.overlay}>
            <div class={s.overlayText}>Level {levelRef.current} Clear!</div>
            <Button onClick={() => startLevel(levelRef.current + 1)}>Next Level</Button>
          </div>
        )}
        {gameStatus === 'gameover' && (
          <div class={s.overlay}>
            <div class={s.overlayText}>Game Over</div>
            <div class={s.overlaySub}>Reached level {levelRef.current}</div>
            <Button onClick={() => startLevel(1)}>Play Again</Button>
          </div>
        )}
      </div>
      <div class={s.bottomBar}>
        <Button variant="secondary" onClick={onQuit}>Back</Button>
        {highScore > 0 && <span class={s.best}>Best: Lv{highScore}</span>}
      </div>
    </div>
  );
}
