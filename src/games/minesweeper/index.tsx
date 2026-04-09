import { useState, useRef, useCallback, useEffect } from 'preact/hooks';
import type { GameProps } from '../registry';
import { DIFFICULTIES } from './types';
import { createState, reveal, toggleFlag, tick } from './engine';
import {
  computeLayout, hitTest, render as renderGrid,
  defaultCamera, clampCameraWithGrid,
  type Layout, type Camera,
} from './renderer';
import { useGameLoop } from '../../shared/hooks/useGameLoop';
import { addScore, getBestTime } from '../../shared/storage/helpers';
import { Button } from '../../shared/ui/Button';
import type { MinesweeperState } from './types';
import s from './minesweeper.module.css';

export default function Minesweeper({ onQuit }: GameProps) {
  const [diffKey, setDiffKey] = useState<string | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const stateRef = useRef<MinesweeperState | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameStatus, setGameStatus] = useState<string>('idle');
  const camRef = useRef<Camera>(defaultCamera());

  // Touch gesture state
  const touchState = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    moved: boolean;
    panning: boolean;
    lastX: number;
    lastY: number;
    // pinch
    pinching: boolean;
    initialDist: number;
    initialZoom: number;
    longPressTimer: number | null;
  } | null>(null);

  useEffect(() => {
    if (diffKey) {
      getBestTime(`minesweeper-${diffKey}`).then((v) => setBestTime(v || null));
    }
  }, [diffKey, gameStatus]);

  const startGame = useCallback((key: string) => {
    setDiffKey(key);
    stateRef.current = createState(DIFFICULTIES[key]);
    camRef.current = defaultCamera();
    setGameStatus('idle');
  }, []);

  // Resize canvas
  useEffect(() => {
    if (!diffKey || !canvasRef.current || !containerRef.current) return;
    const diff = DIFFICULTIES[diffKey];
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
      layoutRef.current = computeLayout(diff.cols, diff.rows, w, h);
      camRef.current = clampCameraWithGrid(camRef.current, layoutRef.current, diff.cols, diff.rows);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [diffKey]);

  // Game loop
  const loopCallbacks = diffKey
    ? {
        update(dt: number) {
          if (stateRef.current) tick(stateRef.current, dt);
        },
        render() {
          if (!stateRef.current || !ctxRef.current || !layoutRef.current) return;
          renderGrid(ctxRef.current, stateRef.current, layoutRef.current, camRef.current, {
            fadeEdges: true,
            minimap: true,
          });
        },
      }
    : null;

  useGameLoop(loopCallbacks, !diffKey);

  const handleAction = useCallback(
    (px: number, py: number, isLongPress: boolean) => {
      const state = stateRef.current;
      const layout = layoutRef.current;
      if (!state || !layout || !diffKey) return;

      // Smiley tap (screen space)
      const smileyX = layout.width / 2;
      const smileyY = layout.hudH / 2;
      if (Math.abs(px - smileyX) < 20 && Math.abs(py - smileyY) < 20) {
        startGame(diffKey);
        return;
      }

      // Game over — tap anywhere to restart
      if (state.status === 'won' || state.status === 'lost') {
        startGame(diffKey);
        return;
      }

      const hit = hitTest(px, py, layout, state.cols, state.rows, camRef.current);
      if (!hit) return;
      const [r, c] = hit;

      if (isLongPress) {
        toggleFlag(state, r, c);
      } else {
        reveal(state, r, c);
      }

      const nowStatus = state.status as string;
      if (nowStatus === 'won') {
        const timeScore = Math.floor(state.elapsedMs / 1000);
        getBestTime(`minesweeper-${diffKey}`).then((prev) => {
          if (prev === 0 || timeScore < prev) {
            addScore(`minesweeper-${diffKey}`, timeScore);
          }
        });
      }
      setGameStatus(nowStatus);
    },
    [diffKey, gameStatus, startGame],
  );

  // --- Touch handlers: tap / long-press / pan / pinch ---

  const clearLPTimer = () => {
    const ts = touchState.current;
    if (ts?.longPressTimer != null) {
      clearTimeout(ts.longPressTimer);
      ts.longPressTimer = null;
    }
  };

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvasRef.current!.getBoundingClientRect();

      if (e.touches.length === 2) {
        // Start pinch
        clearLPTimer();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        if (touchState.current) {
          touchState.current.pinching = true;
          touchState.current.initialDist = dist;
          touchState.current.initialZoom = camRef.current.zoom;
          touchState.current.moved = true;
        }
        return;
      }

      const t = e.touches[0];
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;

      const ts = {
        startX: x, startY: y, startTime: Date.now(),
        moved: false, panning: false,
        lastX: x, lastY: y,
        pinching: false, initialDist: 0, initialZoom: 1,
        longPressTimer: null as number | null,
      };

      ts.longPressTimer = window.setTimeout(() => {
        if (!ts.moved) {
          handleAction(x, y, true);
        }
      }, 400);

      touchState.current = ts;
    },
    [handleAction],
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const ts = touchState.current;
      const layout = layoutRef.current;
      const state = stateRef.current;
      if (!ts || !layout || !state) return;
      const rect = canvasRef.current!.getBoundingClientRect();

      // Pinch zoom
      if (e.touches.length === 2 && ts.pinching) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const newZoom = Math.min(3, Math.max(0.5, ts.initialZoom * (dist / ts.initialDist)));
        camRef.current = clampCameraWithGrid(
          { ...camRef.current, zoom: newZoom },
          layout, state.cols, state.rows,
        );
        return;
      }

      const t = e.touches[0];
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;
      const dx = x - ts.startX;
      const dy = y - ts.startY;

      if (!ts.moved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        ts.moved = true;
        ts.panning = true;
        clearLPTimer();
      }

      if (ts.panning && layout.needsCamera) {
        const moveDx = x - ts.lastX;
        const moveDy = y - ts.lastY;
        camRef.current = clampCameraWithGrid(
          {
            ...camRef.current,
            x: camRef.current.x + moveDx / camRef.current.zoom,
            y: camRef.current.y + moveDy / camRef.current.zoom,
          },
          layout, state.cols, state.rows,
        );
      }
      ts.lastX = x;
      ts.lastY = y;
    },
    [],
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.preventDefault();
      const ts = touchState.current;
      if (!ts) return;
      clearLPTimer();

      // If fingers remaining, ignore (partial lift during pinch)
      if (e.touches.length > 0) return;

      if (!ts.moved) {
        const dt = Date.now() - ts.startTime;
        if (dt < 400) {
          handleAction(ts.startX, ts.startY, false);
        }
      }
      touchState.current = null;
    },
    [handleAction],
  );

  // Mouse (desktop)
  const mouseDrag = useRef<{ lastX: number; lastY: number } | null>(null);

  const onMouseDown = useCallback(
    (e: MouseEvent) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const layout = layoutRef.current;
      const state = stateRef.current;

      // If outside the grid and camera is active, start panning
      if (layout?.needsCamera && state) {
        const hit = hitTest(x, y, layout, state.cols, state.rows, camRef.current);
        if (!hit && y > layout.hudH) {
          mouseDrag.current = { lastX: e.clientX, lastY: e.clientY };
          return;
        }
      }

      handleAction(x, y, e.button === 2);
    },
    [handleAction],
  );

  const onMouseMove = useCallback((e: MouseEvent) => {
    const drag = mouseDrag.current;
    const layout = layoutRef.current;
    const state = stateRef.current;
    if (!drag || !layout || !state) return;

    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;

    camRef.current = clampCameraWithGrid(
      {
        ...camRef.current,
        x: camRef.current.x + dx / camRef.current.zoom,
        y: camRef.current.y + dy / camRef.current.zoom,
      },
      layout, state.cols, state.rows,
    );
  }, []);

  const onMouseUp = useCallback(() => {
    mouseDrag.current = null;
  }, []);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const layout = layoutRef.current;
      const state = stateRef.current;
      if (!layout?.needsCamera || !state) return;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.min(3, Math.max(0.5, camRef.current.zoom * delta));
      camRef.current = clampCameraWithGrid(
        { ...camRef.current, zoom: newZoom },
        layout, state.cols, state.rows,
      );
    },
    [],
  );

  const onContextMenu = useCallback((e: Event) => e.preventDefault(), []);

  // Difficulty selector
  if (!diffKey) {
    return (
      <div class={s.menu}>
        <h2 class={s.title}>Minesweeper</h2>
        <div class={s.diffList}>
          {Object.entries(DIFFICULTIES).map(([key, diff]) => (
            <Button key={key} onClick={() => startGame(key)}>
              {diff.label} ({diff.cols}x{diff.rows})
            </Button>
          ))}
        </div>
        <Button variant="secondary" onClick={onQuit}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div class={s.container}>
      <div class={s.canvasWrap} ref={containerRef}>
        <canvas
          ref={canvasRef}
          class={s.canvas}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          onContextMenu={onContextMenu}
        />
      </div>
      <div class={s.bottomBar}>
        <Button variant="secondary" onClick={() => setDiffKey(null)}>
          Back
        </Button>
        {bestTime !== null && (
          <span class={s.best}>
            Best: {String(Math.floor(bestTime / 60)).padStart(2, '0')}:
            {String(bestTime % 60).padStart(2, '0')}
          </span>
        )}
      </div>
    </div>
  );
}
