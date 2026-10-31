import type { Dir } from './types';

export type InputHandlers = {
  onDir(d: Dir): void;
  onPause(): void;
  onStart(): void;
};

const SWIPE_THRESHOLD_PX = 24;

const DIR_KEYS: Record<string, Dir> = {
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
};

const PAUSE_KEYS = new Set(['p', 'escape']);
const START_KEYS = new Set(['enter', ' ']);

type Point = { x: number; y: number };

function firstPoint(e: Event): Point | null {
  const list = (e as TouchEvent).changedTouches;
  const t = list?.[0];
  return t ? { x: t.clientX, y: t.clientY } : null;
}

export function bindInput(target: EventTarget, handlers: InputHandlers): () => void {
  let touchStart: Point | null = null;

  const onKeyDown = (e: Event): void => {
    const ev = e as KeyboardEvent;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (!ev.key) return;
    const key = ev.key.toLowerCase();
    const dir = DIR_KEYS[key];
    if (dir) {
      ev.preventDefault();
      handlers.onDir(dir);
    } else if (PAUSE_KEYS.has(key)) {
      ev.preventDefault();
      if (!ev.repeat) handlers.onPause();
    } else if (START_KEYS.has(key)) {
      ev.preventDefault();
      handlers.onStart();
    }
  };

  const onTouchStart = (e: Event): void => {
    touchStart = firstPoint(e);
  };

  const onTouchEnd = (e: Event): void => {
    const start = touchStart;
    const end = firstPoint(e);
    touchStart = null;
    if (!start || !end) return;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD_PX) {
      handlers.onStart();
    } else if (Math.abs(dx) >= Math.abs(dy)) {
      handlers.onDir(dx > 0 ? 'right' : 'left');
    } else {
      handlers.onDir(dy > 0 ? 'down' : 'up');
    }
  };

  const onTouchCancel = (): void => {
    touchStart = null;
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('touchstart', onTouchStart);
  target.addEventListener('touchend', onTouchEnd);
  target.addEventListener('touchcancel', onTouchCancel);

  return () => {
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('touchstart', onTouchStart);
    target.removeEventListener('touchend', onTouchEnd);
    target.removeEventListener('touchcancel', onTouchCancel);
  };
}
