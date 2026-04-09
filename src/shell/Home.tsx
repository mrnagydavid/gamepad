import { useEffect, useRef, useState } from 'preact/hooks';
import { GAMES, type GameMeta } from '../games/registry';
import { getHighScore } from '../shared/storage/helpers';
import { Button } from '../shared/ui/Button';
import s from './home.module.css';

interface HomeProps {
  onLaunch: (id: string) => void;
}

export function Home({ onLaunch }: HomeProps) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const entries: Record<string, number> = {};
      for (const g of GAMES) {
        entries[g.id] = await getHighScore(g.id);
      }
      setScores(entries);
    })();
  }, []);

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
    <div class={s.home}>
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
            {scores[game.id] ? (
              <span class={s.cardScore}>Best: {scores[game.id]}</span>
            ) : null}
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
