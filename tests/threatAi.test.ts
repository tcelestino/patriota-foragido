import { describe, expect, test } from 'vitest';
import { SCATTER_TARGET, chaseTarget, pickDirection, type ChaseContext } from '../src/threatAi';
import { Maze } from '../src/maze';
import type { Dir, Vec } from '../src/types';

function ctx(pacTile: Vec, pacDir: Dir, extra: Partial<ChaseContext> = {}): ChaseContext {
  return { pacTile, pacDir, delegadoTile: { x: 1, y: 1 }, threatTile: { x: 1, y: 1 }, ...extra };
}

describe('SCATTER_TARGET', () => {
  test('cantos', () => {
    expect(SCATTER_TARGET).toEqual({
      delegado: { x: 29, y: -3 },
      agente: { x: 2, y: -3 },
      perito: { x: 31, y: 31 },
      estagiario: { x: 0, y: 31 },
    });
  });
});

describe('chaseTarget', () => {
  test('delegado mira no fugitivo', () => {
    expect(chaseTarget('delegado', ctx({ x: 10, y: 20 }, 'left'))).toEqual({ x: 10, y: 20 });
  });

  test('agente 4 à frente; pacDir up também 4 à esquerda', () => {
    expect(chaseTarget('agente', ctx({ x: 10, y: 20 }, 'right'))).toEqual({ x: 14, y: 20 });
    expect(chaseTarget('agente', ctx({ x: 10, y: 20 }, 'up'))).toEqual({ x: 6, y: 16 });
  });

  test('agente com pacDir left e down', () => {
    expect(chaseTarget('agente', ctx({ x: 10, y: 20 }, 'left'))).toEqual({ x: 6, y: 20 });
    expect(chaseTarget('agente', ctx({ x: 10, y: 20 }, 'down'))).toEqual({ x: 10, y: 24 });
  });

  test('perito: vetor delegado->(pac+2) dobrado', () => {
    const c = ctx({ x: 10, y: 20 }, 'right', { delegadoTile: { x: 8, y: 18 } });
    expect(chaseTarget('perito', c)).toEqual({ x: 16, y: 22 });
  });

  test('perito com pacDir down e up (bug do up)', () => {
    const down = ctx({ x: 10, y: 20 }, 'down', { delegadoTile: { x: 8, y: 18 } });
    expect(chaseTarget('perito', down)).toEqual({ x: 12, y: 26 });
    const up = ctx({ x: 10, y: 20 }, 'up', { delegadoTile: { x: 8, y: 18 } });
    // pivô {8,18}; vetor 0 => alvo {8,18}
    expect(chaseTarget('perito', up)).toEqual({ x: 8, y: 18 });
  });

  test('estagiario longe persegue, perto vai ao canto', () => {
    const pac = { x: 10, y: 20 };
    expect(chaseTarget('estagiario', ctx(pac, 'left', { threatTile: { x: 10, y: 11 } }))).toEqual(pac);
    expect(chaseTarget('estagiario', ctx(pac, 'left', { threatTile: { x: 10, y: 15 } }))).toEqual({ x: 0, y: 31 });
  });

  test('estagiario exatamente a distância 8 vai ao canto', () => {
    const pac = { x: 10, y: 20 };
    expect(chaseTarget('estagiario', ctx(pac, 'left', { threatTile: { x: 10, y: 12 } }))).toEqual({ x: 0, y: 31 });
  });
});

describe('pickDirection', () => {
  const maze = new Maze();
  const opts = { frightened: false };

  test('não reverte: corredor reto continua', () => {
    // (1,5) em corredor horizontal; alvo atrás (à esquerda) mas current right
    expect(pickDirection(maze, { x: 6, y: 5 }, 'right', { x: 0, y: 5 }, opts)).not.toBe('left');
    expect(pickDirection(maze, { x: 3, y: 5 }, 'right', { x: 0, y: 5 }, opts)).toBe('right');
  });

  test('empate resolvido por up,left,down,right', () => {
    expect(pickDirection(maze, { x: 1, y: 5 }, 'right', { x: 1, y: 5 }, opts)).toBe('up');
    expect(pickDirection(maze, { x: 1, y: 5 }, 'right', { x: 2, y: 6 }, opts)).toBe('down');
  });

  test('menor distância ao quadrado vence', () => {
    expect(pickDirection(maze, { x: 1, y: 5 }, 'right', { x: 1, y: 9 }, opts)).toBe('down');
  });

  test('NO_UP_TILES proíbe subir; frightened permite', () => {
    const t = { x: 14, y: 11 };
    const target = { x: 14, y: 0 };
    expect(pickDirection(maze, t, 'left', target, opts)).toBe('left');
    expect(pickDirection(maze, t, 'left', target, { frightened: true, random: () => 0 })).toBe('up');
  });

  test('porta é tratada como parede', () => {
    // (15,11): descer levaria à porta; alvo dentro da casa
    expect(pickDirection(maze, { x: 15, y: 11 }, 'left', { x: 15, y: 14 }, opts)).toBe('left');
  });

  test('frightened usa random injetado de forma determinística', () => {
    const t = { x: 1, y: 5 };
    // current right => candidatos: up, down, right
    expect(pickDirection(maze, t, 'right', t, { frightened: true, random: () => 0 })).toBe('up');
    expect(pickDirection(maze, t, 'right', t, { frightened: true, random: () => 0.5 })).toBe('down');
    expect(pickDirection(maze, t, 'right', t, { frightened: true, random: () => 0.99 })).toBe('right');
  });

  test('túnel fora da grade não lança', () => {
    expect(pickDirection(maze, { x: 0, y: 14 }, 'left', { x: 5, y: 5 }, opts)).toBe('left');
    expect(pickDirection(maze, { x: 31, y: 14 }, 'right', { x: 5, y: 5 }, opts)).toBe('right');
  });

  test('beco sem saída recua para o oposto', () => {
    const closed = { isWalkable: () => false } as unknown as Maze;
    expect(pickDirection(closed, { x: 3, y: 3 }, 'right', { x: 0, y: 0 }, opts)).toBe('left');
  });
});
