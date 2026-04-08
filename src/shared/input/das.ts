/** DAS (Delayed Auto Shift) engine for keyboard input.
 *  Tracks keydown/keyup manually, ignores browser key repeat. */

export interface DASConfig {
  delay: number;  // ms before auto-repeat starts (default 133)
  arr: number;    // ms between auto-repeat ticks (default 33)
}

type ActionCallback = () => void;

interface KeyState {
  held: boolean;
  dasTimer: number | null;
  arrInterval: number | null;
}

export class DASEngine {
  private config: DASConfig;
  private actions = new Map<string, ActionCallback>();
  private keys = new Map<string, KeyState>();
  private boundDown: (e: KeyboardEvent) => void;
  private boundUp: (e: KeyboardEvent) => void;

  constructor(config: Partial<DASConfig> = {}) {
    this.config = { delay: 133, arr: 33, ...config };
    this.boundDown = this.onKeyDown.bind(this);
    this.boundUp = this.onKeyUp.bind(this);
  }

  onAction(code: string, callback: ActionCallback): void {
    this.actions.set(code, callback);
  }

  start(): void {
    window.addEventListener('keydown', this.boundDown);
    window.addEventListener('keyup', this.boundUp);
  }

  stop(): void {
    window.removeEventListener('keydown', this.boundDown);
    window.removeEventListener('keyup', this.boundUp);
    this.clearAll();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return; // ignore browser repeat entirely

    const cb = this.actions.get(e.code);
    if (!cb) return;

    e.preventDefault();
    cb(); // fire immediately on first press

    const state: KeyState = {
      held: true,
      dasTimer: window.setTimeout(() => {
        state.arrInterval = window.setInterval(cb, this.config.arr);
      }, this.config.delay),
      arrInterval: null,
    };
    this.keys.set(e.code, state);
  }

  private onKeyUp(e: KeyboardEvent): void {
    const state = this.keys.get(e.code);
    if (!state) return;

    if (state.dasTimer !== null) clearTimeout(state.dasTimer);
    if (state.arrInterval !== null) clearInterval(state.arrInterval);
    this.keys.delete(e.code);
  }

  private clearAll(): void {
    for (const state of this.keys.values()) {
      if (state.dasTimer !== null) clearTimeout(state.dasTimer);
      if (state.arrInterval !== null) clearInterval(state.arrInterval);
    }
    this.keys.clear();
  }
}
