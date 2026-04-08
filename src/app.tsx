import { useState, useEffect, useCallback } from 'preact/hooks';
import { Home } from './shell/Home';
import { GameView } from './shell/GameView';
import { GAMES } from './games/registry';

export function App() {
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  // Sync with hash
  useEffect(() => {
    const onHash = () => {
      const id = location.hash.replace('#', '');
      setActiveGameId(GAMES.find((g) => g.id === id) ? id : null);
    };
    window.addEventListener('hashchange', onHash);
    onHash();
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const launch = useCallback((id: string) => {
    location.hash = id;
  }, []);

  const quit = useCallback(() => {
    location.hash = '';
  }, []);

  if (activeGameId) {
    const meta = GAMES.find((g) => g.id === activeGameId)!;
    return <GameView meta={meta} onQuit={quit} />;
  }

  return <Home onLaunch={launch} />;
}
