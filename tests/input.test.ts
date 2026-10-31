import { describe, expect, test, vi } from 'vitest';
import { bindInput } from '../src/input';

function setup() {
  const target = document.createElement('div');
  const handlers = { onDir: vi.fn(), onPause: vi.fn(), onStart: vi.fn() };
  const unbind = bindInput(target, handlers);
  return { target, handlers, unbind };
}

function key(target: EventTarget, k: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key: k, cancelable: true, ...init });
  target.dispatchEvent(e);
  return e;
}

function touch(target: EventTarget, type: string, x: number, y: number): void {
  const e = new Event(type, { cancelable: true });
  const list = [{ clientX: x, clientY: y }];
  Object.defineProperty(e, 'changedTouches', { value: list });
  Object.defineProperty(e, 'touches', { value: list });
  target.dispatchEvent(e);
}

function swipe(target: EventTarget, dx: number, dy: number): void {
  touch(target, 'touchstart', 100, 100);
  touch(target, 'touchend', 100 + dx, 100 + dy);
}

describe('bindInput', () => {
  test('setas e WASD chamam onDir com a direção correta', () => {
    const { target, handlers } = setup();
    const cases: [string, string][] = [
      ['ArrowUp', 'up'],
      ['ArrowDown', 'down'],
      ['ArrowLeft', 'left'],
      ['ArrowRight', 'right'],
      ['w', 'up'],
      ['A', 'left'],
      ['s', 'down'],
      ['D', 'right'],
    ];
    for (const [k, dir] of cases) {
      handlers.onDir.mockClear();
      const e = key(target, k);
      expect(handlers.onDir).toHaveBeenCalledWith(dir);
      expect(e.defaultPrevented).toBe(true);
    }
  });

  test('P e Escape chamam onPause; Enter e espaço chamam onStart', () => {
    const { target, handlers } = setup();
    key(target, 'p');
    key(target, 'P');
    key(target, 'Escape');
    expect(handlers.onPause).toHaveBeenCalledTimes(3);
    key(target, 'Enter');
    key(target, ' ');
    expect(handlers.onStart).toHaveBeenCalledTimes(2);
  });

  test('teclas com modificador ou desconhecidas são ignoradas', () => {
    const { target, handlers } = setup();
    const e = key(target, 'ArrowUp', { ctrlKey: true });
    key(target, 'w', { metaKey: true });
    key(target, 'p', { altKey: true });
    const other = key(target, 'x');
    expect(handlers.onDir).not.toHaveBeenCalled();
    expect(handlers.onPause).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
    expect(other.defaultPrevented).toBe(false);
  });

  test('keydown sem key não lança e não chama handlers', () => {
    const { target, handlers } = setup();
    expect(() => target.dispatchEvent(new KeyboardEvent('keydown'))).not.toThrow();
    expect(() => target.dispatchEvent(new KeyboardEvent('keydown', { key: '' }))).not.toThrow();
    expect(handlers.onDir).not.toHaveBeenCalled();
    expect(handlers.onPause).not.toHaveBeenCalled();
    expect(handlers.onStart).not.toHaveBeenCalled();
  });

  test('pausa com repeat é ignorada; direção com repeat continua funcionando', () => {
    const { target, handlers } = setup();
    key(target, 'p', { repeat: true });
    key(target, 'Escape', { repeat: true });
    expect(handlers.onPause).not.toHaveBeenCalled();
    key(target, 'p');
    expect(handlers.onPause).toHaveBeenCalledTimes(1);
    key(target, 'ArrowUp', { repeat: true });
    expect(handlers.onDir).toHaveBeenCalledWith('up');
  });

  test('swipe >= 24px chama onDir no eixo dominante; < 24px é toque', () => {
    const { target, handlers } = setup();
    swipe(target, 24, 5);
    expect(handlers.onDir).toHaveBeenLastCalledWith('right');
    swipe(target, -30, 10);
    expect(handlers.onDir).toHaveBeenLastCalledWith('left');
    swipe(target, 3, 40);
    expect(handlers.onDir).toHaveBeenLastCalledWith('down');
    swipe(target, 3, -40);
    expect(handlers.onDir).toHaveBeenLastCalledWith('up');
    expect(handlers.onDir).toHaveBeenCalledTimes(4);
    expect(handlers.onStart).not.toHaveBeenCalled();

    swipe(target, 23, 0);
    expect(handlers.onDir).toHaveBeenCalledTimes(4);
    expect(handlers.onStart).toHaveBeenCalledTimes(1);
  });

  test('empate entre eixos favorece o horizontal', () => {
    const { target, handlers } = setup();
    swipe(target, 30, 30);
    expect(handlers.onDir).toHaveBeenCalledWith('right');
  });

  test('touchend sem touchstart é ignorado', () => {
    const { target, handlers } = setup();
    touch(target, 'touchend', 10, 10);
    expect(handlers.onStart).not.toHaveBeenCalled();
    expect(handlers.onDir).not.toHaveBeenCalled();
  });

  test('unbind remove todos os listeners', () => {
    const { target, handlers, unbind } = setup();
    unbind();
    key(target, 'ArrowUp');
    key(target, 'p');
    key(target, 'Enter');
    swipe(target, 50, 0);
    swipe(target, 0, 0);
    expect(handlers.onDir).not.toHaveBeenCalled();
    expect(handlers.onPause).not.toHaveBeenCalled();
    expect(handlers.onStart).not.toHaveBeenCalled();
  });
});
