import { describe, expect, test } from 'vitest';
import { COLS, Maze, START } from '../src/maze';
import { BASE_SPEED } from '../src/movement';
import { Fugitivo } from '../src/fugitivo';

type Ate = 'dot' | 'energizer' | null;

function place(p: Fugitivo, x: number, y: number, dir: 'up' | 'left' | 'down' | 'right'): void {
  p.actor.pos = { x, y };
  p.actor.dir = dir;
}

describe('Fugitivo', () => {
  test('começa em {15.5,23.5} indo à esquerda', () => {
    const p = new Fugitivo();
    expect(p.actor.pos).toEqual({ x: 15.5, y: 23.5 });
    expect(p.actor.pos).toEqual(START.fugitivo);
    expect(p.actor.dir).toBe('left');
    expect(p.desired).toBeNull();
    expect(p.stopped).toBe(false);
  });

  test('reset restaura o estado inicial', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    for (let i = 0; i < 20; i++) p.update(maze, 1);
    p.setDesired('up');
    p.reset();
    expect(p.actor.pos).toEqual(START.fugitivo);
    expect(p.actor.dir).toBe('left');
    expect(p.desired).toBeNull();
    expect(p.stopped).toBe(false);
  });

  test('reverso é imediato no meio do tile', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    p.update(maze, 1);
    const x = p.actor.pos.x;
    expect(x).toBeLessThan(15.5);
    p.setDesired('right');
    expect(p.actor.dir).toBe('right');
    p.update(maze, 1);
    expect(p.actor.pos.x).toBeGreaterThan(x);
  });

  test('reverso no meio do tile não come o tile cujo centro não foi alcançado', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    place(p, 14.8, 23.5, 'left');
    p.setDesired('right');
    for (let i = 0; i < 3; i++) expect(p.update(maze, 1).ate).toBeNull();
    expect(maze.tileAt(14, 23)).toBe('dot');
  });

  test('curva só no centro do tile e guarda input antecipado', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    // Tile 14 da linha 23 tem saída para cima; o centro está em x = 14.5.
    while (p.actor.pos.x > 14.5 + 3 * BASE_SPEED) p.update(maze, 1);
    p.setDesired('up');
    expect(p.actor.dir).toBe('left');
    let guard = 0;
    while (p.actor.dir === 'left' && guard++ < 20) {
      p.update(maze, 1);
      if (p.actor.dir === 'left') {
        expect(p.actor.pos.y).toBe(23.5);
        expect(p.actor.pos.x).toBeGreaterThanOrEqual(14.5 - 1e-9);
      }
    }
    expect(p.actor.dir).toBe('up');
    for (let i = 0; i < 5; i++) p.update(maze, 1);
    expect(p.actor.pos.x).toBe(14.5);
    expect(p.actor.pos.y).toBeLessThan(23.5);
  });

  test('input antecipado fica guardado por vários frames até a curva ser possível', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    p.setDesired('up'); // tile 15 não tem saída para cima
    p.update(maze, 1);
    p.update(maze, 1);
    expect(p.desired).toBe('up');
    expect(p.actor.dir).toBe('left');
    for (let i = 0; i < 12; i++) p.update(maze, 1);
    expect(p.actor.dir).toBe('up');
    expect(p.actor.pos.x).toBe(14.5);
    expect(p.desired).toBe('up');
  });

  test('para na parede e retoma quando input válido', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    for (let i = 0; i < 300; i++) p.update(maze, 1);
    expect(p.stopped).toBe(true);
    expect(p.actor.pos).toEqual({ x: 6.5, y: 23.5 });
    p.setDesired('up');
    p.update(maze, 1);
    expect(p.stopped).toBe(false);
    expect(p.actor.dir).toBe('up');
    expect(p.actor.pos.y).toBeLessThan(23.5);
  });

  test('parado na parede, direção inválida mantém parado', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    for (let i = 0; i < 300; i++) p.update(maze, 1);
    p.setDesired('left');
    p.update(maze, 1);
    expect(p.stopped).toBe(true);
    expect(p.actor.pos).toEqual({ x: 6.5, y: 23.5 });
  });

  test('parado na parede, reverso retoma imediatamente', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    for (let i = 0; i < 300; i++) p.update(maze, 1);
    p.setDesired('right');
    expect(p.stopped).toBe(false);
    p.update(maze, 1);
    expect(p.actor.pos.x).toBeGreaterThan(6.5);
  });

  test('come ponto: ate=dot, stallFrames=1, depois congela 1 frame', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    let r = p.update(maze, 1);
    let guard = 0;
    while (r.ate === null && guard++ < 20) r = p.update(maze, 1);
    expect(r).toEqual({ ate: 'dot', stallFrames: 1 });
    expect(maze.tileAt(14, 23)).toBe('empty');
    expect(p.actor.pos.x).toBeCloseTo(14.5, 0);
    const frozen = { ...p.actor.pos };
    expect(p.update(maze, 1)).toEqual({ ate: null, stallFrames: 0 });
    expect(p.actor.pos).toEqual(frozen);
    p.update(maze, 1);
    expect(p.actor.pos.x).toBeLessThan(frozen.x);
  });

  test('come energizer: stallFrames=3 e congela 3 frames', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    place(p, 3.5, 23.5, 'left');
    p.setDesired('up'); // sai para cima no tile 1 (linha 22, col 1 livre)
    const results: { ate: Ate; stallFrames: number }[] = [];
    let guard = 0;
    let r = p.update(maze, 1);
    while (r.ate !== 'energizer' && guard++ < 40) {
      results.push(r);
      r = p.update(maze, 1);
    }
    expect(r).toEqual({ ate: 'energizer', stallFrames: 3 });
    expect(maze.tileAt(1, 23)).toBe('empty');
    const frozen = { ...p.actor.pos };
    for (let i = 0; i < 3; i++) {
      expect(p.update(maze, 1)).toEqual({ ate: null, stallFrames: 0 });
      expect(p.actor.pos).toEqual(frozen);
    }
    p.update(maze, 1);
    expect(p.actor.pos.y).toBeLessThan(frozen.y);
  });

  test('cada ponto é comido exatamente uma vez, mesmo parando e retomando no mesmo tile', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    let dots = 0;
    for (let i = 0; i < 300; i++) if (p.update(maze, 1).ate === 'dot') dots++;
    expect(dots).toBe(9); // colunas 6 a 14 da linha 23
    expect(maze.dotsEaten).toBe(9);
    // Retoma para baixo e volta pelo centro do mesmo tile.
    p.setDesired('down');
    p.update(maze, 1);
    p.setDesired('up');
    let extra = 0;
    for (let i = 0; i < 2; i++) if (p.update(maze, 1).ate !== null) extra++; // cruza o centro de (6,23) de novo
    expect(extra).toBe(0);
    expect(maze.dotsEaten).toBe(9);
  });

  test('não entra na porta da casa', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    place(p, 15.5, 11.5, 'down'); // porta fica em (15,12)
    p.setDesired('down');
    for (let i = 0; i < 20; i++) p.update(maze, 1);
    expect(p.actor.pos).toEqual({ x: 15.5, y: 11.5 });
    expect(p.stopped).toBe(true);
  });

  test('wrap do túnel', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    place(p, 1.5, 14.5, 'left');
    let minX = Infinity;
    let maxX = -Infinity;
    expect(() => {
      for (let i = 0; i < 60; i++) {
        p.update(maze, 1);
        minX = Math.min(minX, p.actor.pos.x);
        maxX = Math.max(maxX, p.actor.pos.x);
      }
    }).not.toThrow();
    expect(minX).toBeLessThan(0);
    expect(maxX).toBeGreaterThan(COLS - 1);
    expect(p.actor.pos.y).toBe(14.5);
    expect(p.actor.dir).toBe('left');
  });

  test('speed é fração da velocidade base', () => {
    const maze = new Maze();
    const p = new Fugitivo();
    p.update(maze, 0.5);
    expect(START.fugitivo.x - p.actor.pos.x).toBeCloseTo(0.5 * BASE_SPEED, 9);
  });
});
