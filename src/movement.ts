import { COLS, TUNNEL_ROW } from './maze';
import { DIR_VEC, type Dir, type Vec } from './types';

export type Actor = { pos: Vec; dir: Dir };

export const BASE_SPEED = 0.1578;

const EPS = 1e-9;

export function tileOf(pos: Vec): Vec {
  return { x: Math.floor(pos.x), y: Math.floor(pos.y) };
}

export function atTileCenter(pos: Vec, eps = 0.0001): boolean {
  const t = tileOf(pos);
  return Math.abs(pos.x - (t.x + 0.5)) <= eps && Math.abs(pos.y - (t.y + 0.5)) <= eps;
}

function neighborFree(tile: Vec, dir: Dir, canEnter: (c: number, r: number) => boolean): boolean {
  const v = DIR_VEC[dir];
  return canEnter(tile.x + v.x, tile.y + v.y);
}

// Próximo centro de tile estritamente à frente na coordenada p, no sentido sign (+1/-1).
function nextCenter(p: number, sign: number): number {
  return sign > 0 ? Math.floor(p - 0.5) + 1.5 : Math.ceil(p - 0.5) - 0.5;
}

function wrapTunnel(pos: Vec): void {
  if (Math.floor(pos.y) !== TUNNEL_ROW) return;
  if (pos.x < -0.5) pos.x += COLS + 1;
  else if (pos.x > COLS + 0.5) pos.x -= COLS + 1;
}

/**
 * Move o ator `speed` tiles neste frame.
 * Regras:
 * - O deslocamento é dividido em segmentos que terminam em centros de tile, então nenhum centro é pulado.
 * - chooseDir é chamado uma vez a cada centro alcançado durante o movimento, com o tile desse centro.
 *   Não é chamado para o tile inicial se o caminho à frente estiver livre.
 * - A direção retornada (inclusive a oposta) só é aplicada se canEnter permitir o vizinho;
 *   o resto do deslocamento do frame segue na nova direção.
 * - Se a direção atual leva a um tile bloqueado, o ator para exatamente no centro. Enquanto parado,
 *   chooseDir é chamado a cada frame (mesmo tile) e o ator retoma se receber direção válida
 *   ou se o chamador mudar actor.dir para uma direção livre.
 * - Wrap só na linha TUNNEL_ROW: x < -0.5 soma COLS + 1; x > COLS + 0.5 subtrai COLS + 1.
 *   Tiles fora do labirinto nessa linha precisam ser liberados por canEnter (responsabilidade do chamador).
 */
export function advance(
  actor: Actor,
  speed: number,
  chooseDir: (tile: Vec, current: Dir) => Dir | null,
  canEnter: (c: number, r: number) => boolean,
): void {
  const pos = actor.pos;

  // Mantém o alinhamento ao centro do tile no eixo perpendicular ao movimento.
  if (DIR_VEC[actor.dir].x !== 0) pos.y = Math.floor(pos.y) + 0.5;
  else pos.x = Math.floor(pos.x) + 0.5;

  if (atTileCenter(pos)) {
    const tile = tileOf(pos);
    if (!neighborFree(tile, actor.dir, canEnter)) {
      pos.x = tile.x + 0.5;
      pos.y = tile.y + 0.5;
      const chosen = chooseDir(tile, actor.dir);
      if (chosen === null || !neighborFree(tile, chosen, canEnter)) return;
      actor.dir = chosen;
    }
  }

  let remaining = speed;
  while (remaining > EPS) {
    const v = DIR_VEC[actor.dir];
    const horizontal = v.x !== 0;
    const sign = horizontal ? v.x : v.y;
    const p = horizontal ? pos.x : pos.y;
    const center = nextCenter(p, sign);
    const dist = Math.abs(center - p);

    if (remaining < dist) {
      if (horizontal) pos.x += sign * remaining;
      else pos.y += sign * remaining;
      wrapTunnel(pos);
      return;
    }

    if (horizontal) pos.x = center;
    else pos.y = center;
    remaining -= dist;

    const tile = tileOf(pos);
    const chosen = chooseDir(tile, actor.dir);
    if (chosen !== null && neighborFree(tile, chosen, canEnter)) {
      actor.dir = chosen;
    } else if (!neighborFree(tile, actor.dir, canEnter)) {
      return;
    }
  }
}
