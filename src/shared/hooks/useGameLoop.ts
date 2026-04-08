import { useEffect, useRef, useCallback } from 'preact/hooks';

export interface GameLoopCallbacks {
  update: (dt: number) => void;
  render: () => void;
}

const FIXED_DT = 1000 / 60; // ~16.67ms fixed timestep

/** RAF loop with fixed-timestep accumulator. Handles pause/resume and visibility changes. */
export function useGameLoop(
  callbacks: GameLoopCallbacks | null,
  paused: boolean,
) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const rafRef = useRef<number>(0);
  const accRef = useRef(0);
  const lastRef = useRef(0);

  const loop = useCallback((now: number) => {
    const cb = cbRef.current;
    if (!cb) return;

    if (lastRef.current === 0) lastRef.current = now;
    const elapsed = Math.min(now - lastRef.current, 200); // clamp spiral
    lastRef.current = now;
    accRef.current += elapsed;

    while (accRef.current >= FIXED_DT) {
      cb.update(FIXED_DT);
      accRef.current -= FIXED_DT;
    }

    cb.render();
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    if (paused || !callbacks) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      lastRef.current = 0;
      accRef.current = 0;
      return;
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paused, callbacks, loop]);

  // Pause on tab hidden
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        lastRef.current = 0;
        accRef.current = 0;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
}
