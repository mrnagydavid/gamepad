import { useRef, useCallback, useEffect, useState } from 'preact/hooks';
import type { GameProps } from '../registry';
import { createState, adjustAngle, adjustPower, fire, tick } from './engine';
import { render as renderGame } from './renderer';
import { useGameLoop } from '../../shared/hooks/useGameLoop';
import { saveSettings, loadSettings, addScore, getBestTime } from '../../shared/storage/helpers';
import { Button } from '../../shared/ui/Button';
import { ANGLE_STEP, POWER_STEP, type BangState, type GameMode } from './types';
import s from './bangbang.module.css';

interface WinRecord {
  wins1p: number;
  wins2p: number;
}

export default function BangBang({ onQuit }: GameProps) {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gamePhase, setGamePhase] = useState('aiming');
  const [, setTick] = useState(0); // force re-render for controls
  const stateRef = useRef<BangState | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [record, setRecord] = useState<WinRecord>({ wins1p: 0, wins2p: 0 });
  const [bestShots, setBestShots] = useState(0);

  useEffect(() => {
    loadSettings<WinRecord>('bangbang').then((r) => {
      if (r) setRecord(r);
    });
    getBestTime('bangbang-shots').then(setBestShots);
  }, []);

  const startGame = useCallback((mode: GameMode) => {
    setGameMode(mode);
    setGamePhase('aiming');
  }, []);

  // Init state once we have a container + mode
  useEffect(() => {
    if (!gameMode || !containerRef.current) return;
    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      stateRef.current = createState(w, h, gameMode);
      setGamePhase('aiming');
      setTick((n) => n + 1);
    });
  }, [gameMode]);

  // Canvas resize
  useEffect(() => {
    if (!gameMode || !canvasRef.current || !containerRef.current) return;
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
    };
    doResize();
    window.addEventListener('resize', doResize);
    return () => window.removeEventListener('resize', doResize);
  }, [gameMode]);

  // Game loop
  useGameLoop(
    gameMode
      ? {
          update(dt: number) {
            const st = stateRef.current;
            if (!st) return;
            const prevPhase = st.phase;
            tick(st, dt);
            if (st.phase !== prevPhase) {
              setGamePhase(st.phase);
            }
            // Update controls display during CPU think
            if (st.phase === 'aiming' && st.cpuThink) {
              setTick((n) => n + 1);
            }
            // Record win + best shots
            if (st.phase === 'gameover' && prevPhase !== 'gameover' && st.winner !== null) {
              const winnerPlayer = st.players[st.winner!];
              const isHumanWin = !winnerPlayer.isCpu;
              loadSettings<WinRecord>('bangbang').then((r) => {
                const rec = r ?? { wins1p: 0, wins2p: 0 };
                if (st.mode === '1p' && isHumanWin) rec.wins1p++;
                if (st.mode === '2p') rec.wins2p++;
                saveSettings('bangbang', rec);
                setRecord(rec);
              });
              if (isHumanWin) {
                const shots = st.shots[st.winner!];
                getBestTime('bangbang-shots').then((prev) => {
                  if (prev === 0 || shots < prev) {
                    addScore('bangbang-shots', shots);
                    setBestShots(shots);
                  }
                });
              }
            }
          },
          render() {
            if (!stateRef.current || !ctxRef.current) return;
            renderGame(ctxRef.current, stateRef.current);
          },
        }
      : null,
    !gameMode,
  );

  const handleAngle = useCallback((delta: number) => {
    if (stateRef.current) {
      adjustAngle(stateRef.current, delta);
      setTick((n) => n + 1);
    }
  }, []);

  const handlePower = useCallback((delta: number) => {
    if (stateRef.current) {
      adjustPower(stateRef.current, delta);
      setTick((n) => n + 1);
    }
  }, []);

  const handleFire = useCallback(() => {
    if (stateRef.current) fire(stateRef.current);
  }, []);

  const handlePlayAgain = useCallback(() => {
    if (!containerRef.current || !gameMode) return;
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    stateRef.current = createState(w, h, gameMode);
    setGamePhase('aiming');
  }, [gameMode]);

  // Mode selection
  if (!gameMode) {
    return (
      <div class={s.menu}>
        <h2 class={s.title}>Bang! Bang!</h2>
        <div class={s.modeList}>
          <Button onClick={() => startGame('1p')}>1 Player</Button>
          <Button onClick={() => startGame('2p')}>2 Players</Button>
        </div>
        <Button variant="secondary" onClick={onQuit}>Back</Button>
      </div>
    );
  }

  const st = stateRef.current;
  const currentP = st ? st.players[st.currentPlayer] : null;
  const isHumanAiming = gamePhase === 'aiming' && currentP && !currentP.isCpu;

  return (
    <div class={s.container}>
      <div class={s.canvasWrap} ref={containerRef}>
        <canvas ref={canvasRef} class={s.canvas} />
        {gamePhase === 'gameover' && (
          <div class={s.passOverlay}>
            <Button onClick={handlePlayAgain}>Play Again</Button>
          </div>
        )}
      </div>
      <div class={s.controls}>
        {isHumanAiming ? (
          <div class={s.controlRow}>
            <div class={s.group}>
              <RepeatButton onAction={() => handleAngle(-ANGLE_STEP)}>-</RepeatButton>
              <span class={s.readout}>{currentP!.angle}°</span>
              <RepeatButton onAction={() => handleAngle(ANGLE_STEP)}>+</RepeatButton>
            </div>
            <div class={s.group}>
              <RepeatButton onAction={() => handlePower(-POWER_STEP)}>-</RepeatButton>
              <span class={s.readout}>{currentP!.power}</span>
              <RepeatButton onAction={() => handlePower(POWER_STEP)}>+</RepeatButton>
            </div>
            <Button onClick={handleFire}>FIRE</Button>
          </div>
        ) : (
          <span class={s.status}>
            {gamePhase === 'aiming' && currentP?.isCpu ? 'CPU aiming...' : ''}
            {gamePhase === 'firing' ? 'Watch the shot!' : ''}
            {gamePhase === 'exploding' ? 'BOOM!' : ''}
          </span>
        )}
      </div>
      <div class={s.bottomBar}>
        <Button variant="secondary" onClick={() => setGameMode(null)}>Back</Button>
        {bestShots > 0 && <span class={s.best}>Best: {bestShots} shots</span>}
      </div>
    </div>
  );
}

const REPEAT_DELAY = 350; // ms before repeat starts
const REPEAT_INTERVAL = 80; // ms between repeats

/** Button that fires on press and repeats while held. */
function RepeatButton({ onAction, children, ...rest }: { onAction: () => void; children: any } & Record<string, any>) {
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current !== null) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (intervalRef.current !== null) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const start = useCallback(() => {
    onAction();
    stop();
    timerRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(onAction, REPEAT_INTERVAL);
    }, REPEAT_DELAY);
  }, [onAction, stop]);

  useEffect(() => stop, [stop]);

  return (
    <Button
      variant="secondary"
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={(e: TouchEvent) => { e.preventDefault(); start(); }}
      onTouchEnd={stop}
      onTouchCancel={stop}
      {...rest}
    >
      {children}
    </Button>
  );
}
