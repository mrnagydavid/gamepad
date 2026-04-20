import { useRef, useState, useEffect, useCallback } from 'preact/hooks';
import type { GameProps } from '../registry';
import { createState, placePeg, isGuessComplete, submitGuess } from './engine';
import { addScore, getBestTime } from '../../shared/storage/helpers';
import { Button } from '../../shared/ui/Button';
import {
  COLORS, COLOR_FILL, SECRET_LENGTH, CLASSIC_LIMIT,
  type Color, type MastermindState,
} from './types';
import s from './mastermind.module.css';

export default function Mastermind({ onQuit }: GameProps) {
  const stateRef = useRef<MastermindState | null>(null);
  if (stateRef.current === null) stateRef.current = createState();
  const boardRef = useRef<HTMLDivElement>(null);
  const [, forceUpdate] = useState(0);
  const [pickerSlot, setPickerSlot] = useState<number | null>(0);
  const [bestGuesses, setBestGuesses] = useState(0);
  const [scrolledFromTop, setScrolledFromTop] = useState(false);

  const rerender = useCallback(() => forceUpdate((n) => n + 1), []);

  useEffect(() => {
    getBestTime('mastermind').then(setBestGuesses);
  }, []);

  // Auto-scroll board to bottom when a new guess is added
  useEffect(() => {
    if (boardRef.current) {
      boardRef.current.scrollTop = boardRef.current.scrollHeight;
    }
  }, [stateRef.current?.guesses.length]);

  const onBoardScroll = useCallback(() => {
    const el = boardRef.current;
    if (!el) return;
    setScrolledFromTop(el.scrollTop > 4);
  }, []);

  const handleSlotClick = useCallback((slot: number) => {
    const st = stateRef.current;
    if (!st || st.status !== 'playing') return;
    setPickerSlot(slot);
  }, []);

  const handlePickColor = useCallback((color: Color) => {
    const st = stateRef.current;
    if (!st || pickerSlot === null) return;
    placePeg(st, pickerSlot, color);
    // Auto-advance to the next empty slot, if any
    const next = st.activeGuess.findIndex((c) => c === null);
    setPickerSlot(next === -1 ? null : next);
    rerender();
  }, [pickerSlot, rerender]);

  const handleSubmit = useCallback(() => {
    const st = stateRef.current;
    if (!st || !isGuessComplete(st)) return;
    const prevGuesses = st.guesses.length;
    submitGuess(st);
    if (st.status === 'won') {
      const count = st.guesses.length;
      getBestTime('mastermind').then((best) => {
        if (best === 0 || count < best) {
          addScore('mastermind', count);
          setBestGuesses(count);
        }
      });
    }
    if (st.guesses.length > prevGuesses) {
      // Reset picker to first slot of the fresh active row
      setPickerSlot(st.status === 'playing' ? 0 : null);
      rerender();
    }
  }, [rerender]);

  const handleNewGame = useCallback(() => {
    stateRef.current = createState();
    setPickerSlot(0);
    rerender();
  }, [rerender]);

  const st = stateRef.current;
  if (!st) return null;

  return (
    <div class={s.container}>
      {/* Scrollable board: secret on top, history oldest-first, newest at bottom */}
      <div class={s.boardWrap}>
        {scrolledFromTop && <div class={s.boardFadeTop} />}
        <div class={s.board} ref={boardRef} onScroll={onBoardScroll}>
        <div class={s.secretRow}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              class={s.peg}
              style={{
                background: st.status === 'won' ? COLOR_FILL[st.secret[i]] : '#3e4452',
                borderColor: st.status === 'won' ? '#222' : '#2a2f3a',
              }}
            />
          ))}
        </div>
        <div class={s.secretDivider} />

        {st.guesses.map((g, idx) => {
          const guessNumber = idx + 1;
          const showMarker =
            guessNumber === CLASSIC_LIMIT + 1 && st.guesses.length > CLASSIC_LIMIT;
          return (
            <div key={`row-${guessNumber}`} class={s.historyWrap}>
              {showMarker && (
                <div class={s.classicMarker}>
                  <span class={s.classicMarkerText}>Classic game ends here</span>
                </div>
              )}
              <div class={s.historyRow}>
                <span class={s.guessNum}>{guessNumber}</span>
                <div class={s.pegGroup}>
                  {g.pegs.map((c, i) => (
                    <div
                      key={i}
                      class={s.peg}
                      style={{ background: COLOR_FILL[c], borderColor: '#222' }}
                    />
                  ))}
                </div>
                <FeedbackPins white={g.feedback.white} black={g.feedback.black} />
              </div>
            </div>
          );
        })}
      </div>
      </div>

      {/* Active guess row */}
      {st.status === 'playing' && (
        <div class={s.activeRow}>
          <div class={s.pegGroup}>
            {[0, 1, 2, 3].map((i) => {
              const c = st.activeGuess[i];
              const isPickerOpenHere = pickerSlot === i;
              return (
                <button
                  key={i}
                  class={`${s.peg} ${s.activePeg} ${isPickerOpenHere ? s.activePegOpen : ''}`}
                  style={{
                    background: c ? COLOR_FILL[c] : '#2a2f3a',
                    borderColor: isPickerOpenHere ? 'var(--color-accent)' : (c ? '#222' : '#3e4452'),
                  }}
                  onClick={() => handleSlotClick(i)}
                />
              );
            })}
          </div>
          {isGuessComplete(st) ? (
            <Button onClick={handleSubmit}>Guess</Button>
          ) : (
            <Button variant="secondary" class={s.disabledBtn} onClick={() => {}}>
              Guess
            </Button>
          )}
        </div>
      )}

      {/* Persistent color picker — below the active row */}
      {st.status === 'playing' && (
        <div class={`${s.pickerRow} ${pickerSlot === null ? s.pickerDimmed : ''}`}>
          {COLORS.map((c) => (
            <button
              key={c}
              class={s.pickerSwatch}
              style={{ background: COLOR_FILL[c] }}
              onClick={() => handlePickColor(c)}
              disabled={pickerSlot === null}
            />
          ))}
        </div>
      )}

      {/* Won overlay */}
      {st.status === 'won' && (
        <div class={s.overlay}>
          <div class={s.overlayTitle}>You cracked it!</div>
          <div class={s.overlaySub}>{st.guesses.length} guesses</div>
          <Button onClick={handleNewGame}>Play Again</Button>
        </div>
      )}

      <div class={s.bottomBar}>
        <Button variant="secondary" onClick={onQuit}>Back</Button>
        {bestGuesses > 0 && <span class={s.best}>Best: {bestGuesses} guesses</span>}
      </div>
    </div>
  );
}

function FeedbackPins({ white, black }: { white: number; black: number }) {
  const pins: ('white' | 'black' | 'empty')[] = [];
  for (let i = 0; i < white; i++) pins.push('white');
  for (let i = 0; i < black; i++) pins.push('black');
  while (pins.length < SECRET_LENGTH) pins.push('empty');

  return (
    <div class={s.feedback}>
      {pins.map((p, i) =>
        p === 'empty' ? (
          <div key={i} class={s.pinEmpty} />
        ) : (
          <div
            key={i}
            class={s.pin}
            style={{
              background: p === 'white' ? '#f0f0f0' : '#1a1a1a',
              borderColor: '#555',
            }}
          />
        ),
      )}
    </div>
  );
}
