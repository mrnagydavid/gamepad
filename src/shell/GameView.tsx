import { useState, useEffect } from 'preact/hooks';
import type { ComponentType } from 'preact';
import type { GameMeta, GameProps } from '../games/registry';

interface GameViewProps {
  meta: GameMeta;
  onQuit: () => void;
}

export function GameView({ meta, onQuit }: GameViewProps) {
  const [GameComponent, setGameComponent] = useState<ComponentType<GameProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    meta.component().then((mod) => {
      if (!cancelled) setGameComponent(() => mod.default);
    });
    return () => { cancelled = true; };
  }, [meta]);

  if (!GameComponent) {
    return <div style={{ color: 'var(--color-text-dim)', padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-pixel)', fontSize: '0.6rem' }}>Loading...</div>;
  }

  return <GameComponent onQuit={onQuit} />;
}
