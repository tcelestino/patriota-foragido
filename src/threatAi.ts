import { COLS, DOOR_TILES, NO_UP_TILES, ROWS, type Maze } from './maze';
import { DIR_VEC, OPPOSITE, type Dir, type ThreatName, type Vec } from './types';

export const SCATTER_TARGET: Record<ThreatName, Vec> = {
  delegado: { x: COLS - 3, y: -3 },
  agente: { x: 2, y: -3 },
  perito: { x: COLS - 1, y: ROWS },
  estagiario: { x: 0, y: ROWS },
};

export type ChaseContext = { pacTile: Vec; pacDir: Dir; delegadoTile: Vec; threatTile: Vec };

const ESTAGIARIO_RADIUS = 8;
const DIR_ORDER: Dir[] = ['up', 'left', 'down', 'right'];

// Tile à frente do fugitivo; reproduz o bug original: olhando para cima, também desloca à esquerda.
function ahead(pacTile: Vec, pacDir: Dir, tiles: number): Vec {
  const v = DIR_VEC[pacDir];
  const x = pacTile.x + v.x * tiles + (pacDir === 'up' ? -tiles : 0);
  return { x, y: pacTile.y + v.y * tiles };
}

export function chaseTarget(name: ThreatName, ctx: ChaseContext): Vec {
  switch (name) {
    case 'delegado':
      return { ...ctx.pacTile };
    case 'agente':
      return ahead(ctx.pacTile, ctx.pacDir, 4);
    case 'perito': {
      const pivot = ahead(ctx.pacTile, ctx.pacDir, 2);
      return {
        x: ctx.delegadoTile.x + (pivot.x - ctx.delegadoTile.x) * 2,
        y: ctx.delegadoTile.y + (pivot.y - ctx.delegadoTile.y) * 2,
      };
    }
    case 'estagiario': {
      const dx = ctx.threatTile.x - ctx.pacTile.x;
      const dy = ctx.threatTile.y - ctx.pacTile.y;
      return dx * dx + dy * dy > ESTAGIARIO_RADIUS * ESTAGIARIO_RADIUS ? { ...ctx.pacTile } : { ...SCATTER_TARGET.estagiario };
    }
  }
}

function isDoor(c: number, r: number): boolean {
  return DOOR_TILES.some((d) => d.x === c && d.y === r);
}

export function pickDirection(
  maze: Maze,
  tile: Vec,
  current: Dir,
  target: Vec,
  opts: { random?: () => number; frightened: boolean },
): Dir {
  const noUp = !opts.frightened && NO_UP_TILES.some((t) => t.x === tile.x && t.y === tile.y);
  const candidates = DIR_ORDER.filter((dir) => {
    if (dir === OPPOSITE[current]) return false;
    if (dir === 'up' && noUp) return false;
    const c = tile.x + DIR_VEC[dir].x;
    const r = tile.y + DIR_VEC[dir].y;
    return maze.isWalkable(c, r, true) && !isDoor(c, r);
  });

  if (candidates.length === 0) return OPPOSITE[current];

  if (opts.frightened) {
    const random = opts.random ?? Math.random;
    return candidates[Math.floor(random() * candidates.length)];
  }

  let best = candidates[0];
  let bestDist = Infinity;
  for (const dir of candidates) {
    const dx = tile.x + DIR_VEC[dir].x - target.x;
    const dy = tile.y + DIR_VEC[dir].y - target.y;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      best = dir;
      bestDist = dist;
    }
  }
  return best;
}
