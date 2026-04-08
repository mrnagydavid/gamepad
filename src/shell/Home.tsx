import { useEffect, useState } from 'preact/hooks';
import { GAMES } from '../games/registry';
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
          >
            <span class={s.cardTitle}>{game.title}</span>
            {scores[game.id] ? (
              <span class={s.cardScore}>Best: {scores[game.id]}</span>
            ) : null}
            <Button onClick={() => onLaunch(game.id)}>Play</Button>
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
