import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { GAMES, type GameMeta } from '../games/registry';
import { Button } from '../shared/ui/Button';
import s from './home.module.css';

interface HomeProps {
  onLaunch: (id: string) => void;
}

export function Home({ onLaunch }: HomeProps) {
  const [labels, setLabels] = useState<Record<string, string | null>>({});
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const homeRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  const loadLabels = useCallback(async () => {
    const entries: Record<string, string | null> = {};
    for (const g of GAMES) {
      entries[g.id] = g.bestLabel ? await g.bestLabel() : null;
    }
    setLabels(entries);
  }, []);

  useEffect(() => { loadLabels(); }, [loadLabels]);

  // Pull-to-refresh gesture
  useEffect(() => {
    const el = homeRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
      } else {
        touchStartY.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY.current === null || refreshing) return;
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) {
        e.preventDefault();
        setPullY(Math.min(120, dy * 0.4));
      }
    };

    const onTouchEnd = () => {
      if (pullY > 60 && !refreshing) {
        setRefreshing(true);
        setPullY(40);
        window.location.reload();
      } else {
        setPullY(0);
      }
      touchStartY.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullY, refreshing, loadLabels]);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  return (
    <div class={s.home} ref={homeRef}>
      {pullY > 0 && (
        <div class={s.pullIndicator} style={{ height: `${pullY}px` }}>
          <span class={refreshing ? s.pullSpinner : s.pullArrow}>
            {refreshing ? '...' : pullY > 60 ? '\u2191' : '\u2193'}
          </span>
        </div>
      )}
      <header class={s.header}>
        <h1 class={s.title}>GamePad</h1>
      </header>

      <div class={s.grid}>
        {GAMES.length === 0 && (
          <p class={s.empty}>Games coming soon...</p>
        )}
        {GAMES.map((game) => (
          <div
            key={game.id}
            class={s.card}
            style={{ borderColor: game.color }}
            onClick={() => onLaunch(game.id)}
          >
            {game.thumbnail && <Thumbnail draw={game.thumbnail} />}
            <span class={s.cardTitle}>{game.title}</span>
            {labels[game.id] && (
              <span class={s.cardScore}>{labels[game.id]}</span>
            )}
          </div>
        ))}
      </div>

      {installPrompt && (
        <div class={s.install}>
          <Button variant="secondary" onClick={handleInstall}>
            Install App
          </Button>
        </div>
      )}
    </div>
  );
}

const THUMB_W = 140;
const THUMB_H = 90;

function Thumbnail({ draw }: { draw: GameMeta['thumbnail'] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !draw) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = THUMB_W * dpr;
    canvas.height = THUMB_H * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    draw(ctx, THUMB_W, THUMB_H);
  }, [draw]);

  return (
    <canvas
      ref={ref}
      class={s.thumb}
      style={{ width: `${THUMB_W}px`, height: `${THUMB_H}px` }}
    />
  );
}
