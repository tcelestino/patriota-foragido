import { describe, expect, test } from 'vitest';
import { Maze, COLS } from '../src/maze';
import type { Dir, Vec } from '../src/types';
import { advance, atTileCenter, BASE_SPEED, tileOf, type Actor } from '../src/movement';

const maze = new Maze();
const canEnter = (c: number, r: number): boolean => maze.isWalkable(c, r, false);
const never = (): Dir | null => null;

function run(actor: Actor, speed: number, frames: number, choose: (tile: Vec, current: Dir) => Dir | null = never): void {
  for (let i = 0; i < frames; i++) advance(actor, speed, choose, canEnter);
}

describe('utilitários', () => {
  test('BASE_SPEED', () => expect(BASE_SPEED).toBe(0.1578));

  test('tileOf usa floor', () => {
    expect(tileOf({ x: 3.99, y: 0.01 })).toEqual({ x: 3, y: 0 });
    expect(tileOf({ x: -0.4, y: 14.5 })).toEqual({ x: -1, y: 14 });
  });

  test('atTileCenter', () => {
    expect(atTileCenter({ x: 1.5, y: 2.5 })).toBe(true);
    expect(atTileCenter({ x: 1.50001, y: 2.5 })).toBe(true);
    expect(atTileCenter({ x: 1.6, y: 2.5 })).toBe(false);
    expect(atTileCenter({ x: 1.6, y: 2.5 }, 0.2)).toBe(true);
  });
});

describe('advance', () => {
  test('anda em linha reta sem desvio', () => {
    const a: Actor = { pos: { x: 1.5, y: 5.5 }, dir: 'right' };
    run(a, 0.1, 10);
    expect(a.pos.x).toBeCloseTo(2.5, 9);
    expect(a.pos.y).toBe(5.5);
    expect(a.dir).toBe('right');
  });

  test('para no centro do tile diante de parede', () => {
    // linha 1: coluna 13 é parede
    const a: Actor = { pos: { x: 10.5, y: 1.5 }, dir: 'right' };
    run(a, 0.25, 20);
    expect(a.pos.x).toBe(14.5);
    expect(a.pos.y).toBe(1.5);
  });

  test('vira na interseção quando chooseDir pede e tile é livre', () => {
    const calls: { tile: Vec; current: Dir }[] = [];
    const choose = (tile: Vec, current: Dir): Dir | null => {
      calls.push({ tile: { ...tile }, current });
      return tile.x === 6 && tile.y === 1 ? 'down' : null;
    };
    const a: Actor = { pos: { x: 4.5, y: 1.5 }, dir: 'right' };
    run(a, 0.3, 10, choose);
    expect(calls[0]).toEqual({ tile: { x: 5, y: 1 }, current: 'right' });
    expect(calls[1]).toEqual({ tile: { x: 6, y: 1 }, current: 'right' });
    expect(calls.filter((c) => c.tile.x === 6 && c.tile.y === 1)).toHaveLength(1);
    expect(a.dir).toBe('down');
    expect(a.pos.x).toBe(6.5);
    expect(a.pos.y).toBeGreaterThan(1.5);
  });

  test('resto do deslocamento do frame segue na nova direção', () => {
    const a: Actor = { pos: { x: 6.3, y: 1.5 }, dir: 'right' };
    advance(a, 0.3, () => 'down', canEnter);
    expect(a.dir).toBe('down');
    expect(a.pos.x).toBe(6.5);
    expect(a.pos.y).toBeCloseTo(1.6, 9);
  });

  test('direção bloqueada é ignorada', () => {
    // linha 1: acima (linha 0) é tudo parede
    const a: Actor = { pos: { x: 1.5, y: 1.5 }, dir: 'right' };
    run(a, 0.25, 8, () => 'up');
    expect(a.dir).toBe('right');
    expect(a.pos.x).toBeCloseTo(3.5, 9);
    expect(a.pos.y).toBe(1.5);
  });

  test('reversão é permitida no centro', () => {
    const a: Actor = { pos: { x: 3.3, y: 5.5 }, dir: 'right' };
    advance(a, 0.3, (_t, current) => (current === 'right' ? 'left' : null), canEnter);
    expect(a.dir).toBe('left');
    expect(a.pos.x).toBeCloseTo(3.4, 9);
  });

  test('wrap do túnel esquerda->direita e direita->esquerda', () => {
    const left: Actor = { pos: { x: -0.4, y: 14.5 }, dir: 'left' };
    advance(left, 0.2, never, canEnter);
    expect(left.pos.x).toBeCloseTo(COLS + 0.4, 9);
    expect(left.pos.y).toBe(14.5);

    const right: Actor = { pos: { x: COLS + 0.4, y: 14.5 }, dir: 'right' };
    advance(right, 0.2, never, canEnter);
    expect(right.pos.x).toBeCloseTo(-0.4, 9);
    expect(right.pos.y).toBe(14.5);
  });

  test('atravessa o túnel inteiro e volta ao labirinto', () => {
    const a: Actor = { pos: { x: 1.5, y: 14.5 }, dir: 'left' };
    run(a, BASE_SPEED, 30);
    expect(a.pos.x).toBeGreaterThan(20);
    expect(a.pos.x).toBeLessThan(COLS + 0.5);
    expect(a.dir).toBe('left');
  });

  test('wrap só acontece na linha do túnel', () => {
    const a: Actor = { pos: { x: -0.4, y: 5.5 }, dir: 'left' };
    advance(a, 0.2, never, () => true);
    expect(a.pos.x).toBeCloseTo(-0.6, 9);
  });

  test('velocidade alta não pula centro do tile', () => {
    const tiles: number[] = [];
    const choose = (tile: Vec): Dir | null => {
      tiles.push(tile.x);
      return null;
    };
    const a: Actor = { pos: { x: 1.5, y: 5.5 }, dir: 'right' };
    run(a, 0.3, 11, choose);
    expect(tiles).toEqual([2, 3, 4]);
    expect(a.pos.x).toBeCloseTo(4.8, 9);

    const b: Actor = { pos: { x: 1.5, y: 5.5 }, dir: 'right' };
    const fast: number[] = [];
    advance(b, 2.1, (tile) => {
      fast.push(tile.x);
      return null;
    }, canEnter);
    expect(fast).toEqual([2, 3]);
    expect(b.pos.x).toBeCloseTo(3.6, 9);
  });

  test('não chama chooseDir para o tile inicial quando o caminho está livre', () => {
    let n = 0;
    const a: Actor = { pos: { x: 1.5, y: 5.5 }, dir: 'right' };
    advance(a, 0.1, () => {
      n++;
      return null;
    }, canEnter);
    expect(n).toBe(0);
    expect(a.pos.x).toBeCloseTo(1.6, 9);
  });

  test('parado no centro chama chooseDir a cada frame e retoma quando há direção válida', () => {
    const a: Actor = { pos: { x: 14.5, y: 1.5 }, dir: 'right' };
    const calls: Vec[] = [];
    let answer: Dir | null = null;
    const choose = (tile: Vec): Dir | null => {
      calls.push({ ...tile });
      return answer;
    };
    advance(a, 0.2, choose, canEnter);
    advance(a, 0.2, choose, canEnter);
    expect(a.pos).toEqual({ x: 14.5, y: 1.5 });
    expect(calls).toEqual([
      { x: 14, y: 1 },
      { x: 14, y: 1 },
    ]);
    answer = 'up';
    advance(a, 0.2, choose, canEnter);
    expect(a.pos).toEqual({ x: 14.5, y: 1.5 });
    answer = 'left';
    advance(a, 0.2, choose, canEnter);
    expect(a.dir).toBe('left');
    expect(a.pos.x).toBeCloseTo(14.3, 9);
  });

  test('parado retoma quando o chamador muda actor.dir', () => {
    const a: Actor = { pos: { x: 14.5, y: 1.5 }, dir: 'right' };
    advance(a, 0.2, never, canEnter);
    expect(a.pos.x).toBe(14.5);
    a.dir = 'down';
    advance(a, 0.2, never, canEnter);
    expect(a.pos.x).toBe(14.5);
    expect(a.pos.y).toBeCloseTo(1.7, 9);
  });
});
