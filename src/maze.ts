import type { Vec } from './types';

export const COLS = 32;
export const ROWS = 31;

export type Tile = 'wall' | 'dot' | 'energizer' | 'empty' | 'door';

const LAYOUT: string[] = [
  '################################',
  '#..............##..............#',
  '#.####.###.###.##.###.###.####.#',
  '#o####.###.###.##.###.###.####o#',
  '#.####.###.###.##.###.###.####.#',
  '#..............................#',
  '#.####.####.########.####.####.#',
  '#.####.####.########.####.####.#',
  '#......####....##....####......#',
  '######.####### ## #######.######',
  '     #.####### ## #######.#     ',
  '     #.####          ####.#     ',
  '     #.#### ###--### ####.#     ',
  '######.#### #      # ####.######',
  '      .     #      #     .      ',
  '######.#### #      # ####.######',
  '     #.#### ######## ####.#     ',
  '     #.####          ####.#     ',
  '     #.#### ######## ####.#     ',
  '######.#### ######## ####.######',
  '#..............##..............#',
  '#.####.#######.##.#######.####.#',
  '#.####.#######.##.#######.####.#',
  '#o..##.........  .........##..o#',
  '###.##.####.########.####.##.###',
  '###.##.####.########.####.##.###',
  '#......####....##....####......#',
  '#.#########.##.##.##.#########.#',
  '#.#########.##.##.##.#########.#',
  '#..............................#',
  '################################',
];

export const TUNNEL_ROW = 14;
// O labirinto é simétrico: a porta da casa fica nas duas colunas centrais.
export const CENTER_COL = COLS / 2 - 1; // 15: coluna central esquerda
export const TUNNEL_SLOW_COLS = { left: 5, right: COLS - 1 - 5 };

export const NO_UP_TILES: Vec[] = [
  { x: CENTER_COL - 1, y: 11 },
  { x: CENTER_COL + 2, y: 11 },
  { x: CENTER_COL - 1, y: 23 },
  { x: CENTER_COL + 2, y: 23 },
];

export const START = {
  fugitivo: { x: CENTER_COL + 0.5, y: 23.5 },
  delegado: { x: CENTER_COL + 0.5, y: 11.5 },
  agente: { x: CENTER_COL + 0.5, y: 14.5 },
  perito: { x: CENTER_COL - 1.5, y: 14.5 },
  estagiario: { x: CENTER_COL + 2.5, y: 14.5 },
};

export const DOOR_TILES: Vec[] = [
  { x: CENTER_COL, y: 12 },
  { x: CENTER_COL + 1, y: 12 },
];

// Onde aparece o bônus cívico, logo abaixo da casa das ameaças.
export const FRUIT_POS: Vec = { x: CENTER_COL + 0.5, y: 17.5 };

const CHAR_TILE: Record<string, Tile> = {
  '#': 'wall',
  '.': 'dot',
  o: 'energizer',
  '-': 'door',
  ' ': 'empty',
};

function parseLayout(): Tile[][] {
  return LAYOUT.map((line, r) => {
    if (line.length !== COLS) throw new Error(`Linha ${r} do labirinto tem ${line.length} colunas (esperado ${COLS})`);
    return [...line].map((ch, c) => {
      const tile = CHAR_TILE[ch];
      if (!tile) throw new Error(`Caractere inválido '${ch}' em (${c}, ${r})`);
      return tile;
    });
  });
}

export class Maze {
  private tiles: Tile[][] = [];
  dotsRemaining = 0;
  dotsEaten = 0;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.tiles = parseLayout();
    this.dotsEaten = 0;
    this.dotsRemaining = this.tiles.flat().filter((t) => t === 'dot' || t === 'energizer').length;
  }

  tileAt(c: number, r: number): Tile {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 'empty';
    return this.tiles[r][c];
  }

  isWalkable(c: number, r: number, forThreat: boolean): boolean {
    if (r === TUNNEL_ROW && (c < 0 || c >= COLS)) return true;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    const tile = this.tiles[r][c];
    if (tile === 'wall') return false;
    if (tile === 'door') return forThreat;
    return true;
  }

  eat(c: number, r: number): 'dot' | 'energizer' | null {
    const tile = this.tileAt(c, r);
    if (tile !== 'dot' && tile !== 'energizer') return null;
    this.tiles[r][c] = 'empty';
    this.dotsRemaining--;
    this.dotsEaten++;
    return tile;
  }
}
