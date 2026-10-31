import { describe, expect, test } from 'vitest';
import { CENTER_COL, COLS, DOOR_TILES, FRUIT_POS, Maze, NO_UP_TILES, ROWS, START, TUNNEL_ROW, TUNNEL_SLOW_COLS } from '../src/maze';

describe('Maze', () => {
  test('dimensões 32x31', () => {
    const m = new Maze();
    expect(COLS).toBe(32);
    expect(ROWS).toBe(31);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        expect(['wall', 'dot', 'energizer', 'empty', 'door']).toContain(m.tileAt(c, r));
      }
    }
  });

  test('274 pontos no total', () => expect(new Maze().dotsRemaining).toBe(274));

  test('4 energizers', () => {
    const m = new Maze();
    let n = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (m.tileAt(c, r) === 'energizer') n++;
    expect(n).toBe(4);
  });

  test('eat remove e decrementa', () => {
    const m = new Maze();
    expect(m.eat(1, 1)).toBe('dot');
    expect(m.eat(1, 1)).toBeNull();
    expect(m.dotsRemaining).toBe(273);
    expect(m.dotsEaten).toBe(1);
  });

  test('eat energizer conta como comido', () => {
    const m = new Maze();
    expect(m.eat(1, 3)).toBe('energizer');
    expect(m.tileAt(1, 3)).toBe('empty');
    expect(m.dotsRemaining).toBe(273);
  });

  test('porta só para fantasma', () => {
    const m = new Maze();
    expect(m.isWalkable(15, 12, false)).toBe(false);
    expect(m.isWalkable(15, 12, true)).toBe(true);
  });

  test('parede nunca walkable', () => expect(new Maze().isWalkable(0, 0, true)).toBe(false));

  test('túnel: colunas fora do labirinto na linha 14 são walkable', () => {
    const m = new Maze();
    expect(m.isWalkable(-1, TUNNEL_ROW, false)).toBe(true);
    expect(m.isWalkable(COLS, TUNNEL_ROW, false)).toBe(true);
    expect(m.isWalkable(-1, 5, false)).toBe(false);
  });

  test('reset restaura pontos', () => {
    const m = new Maze();
    m.eat(1, 1);
    m.reset();
    expect(m.dotsRemaining).toBe(274);
    expect(m.dotsEaten).toBe(0);
    expect(m.tileAt(1, 1)).toBe('dot');
  });

  test('constantes', () => {
    expect(CENTER_COL).toBe(15);
    expect(TUNNEL_SLOW_COLS).toEqual({ left: 5, right: 26 });
    expect(NO_UP_TILES).toEqual([
      { x: 14, y: 11 },
      { x: 17, y: 11 },
      { x: 14, y: 23 },
      { x: 17, y: 23 },
    ]);
    expect(DOOR_TILES).toEqual([{ x: 15, y: 12 }, { x: 16, y: 12 }]);
    expect(START.fugitivo).toEqual({ x: 15.5, y: 23.5 });
    expect(START.delegado).toEqual({ x: 15.5, y: 11.5 });
    expect(START.agente).toEqual({ x: 15.5, y: 14.5 });
    expect(START.perito).toEqual({ x: 13.5, y: 14.5 });
    expect(START.estagiario).toEqual({ x: 17.5, y: 14.5 });
    expect(FRUIT_POS).toEqual({ x: 15.5, y: 17.5 });
  });

  test('labirinto é simétrico na horizontal', () => {
    const m = new Maze();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS / 2; c++) {
        expect(m.tileAt(c, r), `(${c}, ${r})`).toBe(m.tileAt(COLS - 1 - c, r));
      }
    }
  });

  test('todos os votos são alcançáveis a partir da posição do Eleitor', () => {
    const m = new Maze();
    const seen = new Set<string>();
    const stack: [number, number][] = [[Math.floor(START.fugitivo.x), Math.floor(START.fugitivo.y)]];
    while (stack.length > 0) {
      const [c, r] = stack.pop() as [number, number];
      const key = `${c},${r}`;
      if (seen.has(key) || !m.isWalkable(c, r, false) || c < 0 || c >= COLS) continue;
      seen.add(key);
      stack.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = m.tileAt(c, r);
        if (t === 'dot' || t === 'energizer') expect(seen.has(`${c},${r}`), `voto isolado em (${c}, ${r})`).toBe(true);
      }
    }
  });
});
