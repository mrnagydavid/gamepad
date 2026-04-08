import { useRef, useEffect } from 'preact/hooks';

/** Returns a ref to attach to a <canvas> element and provides the 2D context via callback.
 *  Handles DPR scaling so drawing code can use CSS-pixel coordinates. */
export function useCanvas(
  onContext: ((ctx: CanvasRenderingContext2D) => void) | null,
  width: number,
  height: number,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onContext) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    onContext(ctx);
  }, [onContext, width, height]);

  return canvasRef;
}
