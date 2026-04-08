/** Touch gesture recognizer: swipe (4 directions), tap, long-press. */

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

export interface TouchGestureCallbacks {
  onSwipe?: (dir: SwipeDirection) => void;
  onTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
}

export interface TouchConfig {
  swipeThreshold: number;    // min px to count as swipe (default 30)
  longPressDelay: number;    // ms to trigger long-press (default 500)
}

export class TouchGestureRecognizer {
  private config: TouchConfig;
  private callbacks: TouchGestureCallbacks;
  private el: HTMLElement;

  private startX = 0;
  private startY = 0;
  private startTime = 0;
  private longPressTimer: number | null = null;
  private moved = false;

  constructor(
    el: HTMLElement,
    callbacks: TouchGestureCallbacks,
    config: Partial<TouchConfig> = {},
  ) {
    this.el = el;
    this.callbacks = callbacks;
    this.config = { swipeThreshold: 30, longPressDelay: 500, ...config };
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
  }

  start(): void {
    this.el.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.el.addEventListener('touchend', this.onTouchEnd);
  }

  stop(): void {
    this.el.removeEventListener('touchstart', this.onTouchStart);
    this.el.removeEventListener('touchmove', this.onTouchMove);
    this.el.removeEventListener('touchend', this.onTouchEnd);
    this.clearLongPress();
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const t = e.touches[0];
    this.startX = t.clientX;
    this.startY = t.clientY;
    this.startTime = Date.now();
    this.moved = false;

    this.longPressTimer = window.setTimeout(() => {
      if (!this.moved) {
        this.callbacks.onLongPress?.(this.startX, this.startY);
      }
    }, this.config.longPressDelay);
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - this.startX;
    const dy = t.clientY - this.startY;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      this.moved = true;
      this.clearLongPress();
    }
  }

  private onTouchEnd(_e: TouchEvent): void {
    this.clearLongPress();
    const dt = Date.now() - this.startTime;
    const endTouch = _e.changedTouches[0];
    const dx = endTouch.clientX - this.startX;
    const dy = endTouch.clientY - this.startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const threshold = this.config.swipeThreshold;

    if (absDx > threshold || absDy > threshold) {
      // Swipe
      if (absDx > absDy) {
        this.callbacks.onSwipe?.(dx > 0 ? 'right' : 'left');
      } else {
        this.callbacks.onSwipe?.(dy > 0 ? 'down' : 'up');
      }
    } else if (!this.moved && dt < this.config.longPressDelay) {
      // Tap
      this.callbacks.onTap?.(this.startX, this.startY);
    }
  }

  private clearLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }
}
