import { Maze, START } from './maze';
import { advance, BASE_SPEED, tileOf, type Actor } from './movement';
import { DIR_VEC, OPPOSITE, type Dir, type Vec } from './types';

export type FugitivoUpdate = { ate: 'dot' | 'energizer' | null; stallFrames: number };

const STALL_DOT = 1;
const STALL_ENERGIZER = 3;

export class Fugitivo {
  actor: Actor = { pos: { ...START.fugitivo }, dir: 'left' };
  desired: Dir | null = null;
  stopped = false;
  private stall = 0;
  private lastEatenTile: Vec | null = null;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.actor = { pos: { ...START.fugitivo }, dir: 'left' };
    this.desired = null;
    this.stopped = false;
    this.stall = 0;
    this.lastEatenTile = null;
  }

  setDesired(dir: Dir): void {
    this.desired = dir;
    // advance alinha o eixo transversal a cada frame, então só o reverso pode ser imediato;
    // curvas perpendiculares são feitas no centro do tile via chooseDir.
    if (dir === OPPOSITE[this.actor.dir]) {
      this.actor.dir = dir;
      this.stopped = false;
    }
  }

  update(maze: Maze, speed: number): FugitivoUpdate {
    if (this.stall > 0) {
      this.stall--;
      return { ate: null, stallFrames: 0 };
    }

    const prev = { ...this.actor.pos };
    const canEnter = (c: number, r: number): boolean => maze.isWalkable(c, r, false);
    const chooseDir = (tile: Vec, current: Dir): Dir => {
      const want = this.desired;
      if (want !== null) {
        const v = DIR_VEC[want];
        if (canEnter(tile.x + v.x, tile.y + v.y)) return want;
      }
      return current;
    };

    advance(this.actor, speed * BASE_SPEED, chooseDir, canEnter);

    const pos = this.actor.pos;
    this.stopped = pos.x === prev.x && pos.y === prev.y;

    const ate = this.eatIfCenterReached(maze, prev);
    if (ate === null) return { ate: null, stallFrames: 0 };
    this.stall = ate === 'dot' ? STALL_DOT : STALL_ENERGIZER;
    return { ate, stallFrames: this.stall };
  }

  // Come quando o segmento percorrido neste frame (prev -> pos) contém o centro do tile atual
  // (em ambos os eixos; no transversal o ator já está no centro). lastEatenTile evita comer duas
  // vezes o mesmo tile quando o ator fica parado ou parte do centro em frames seguintes.
  private eatIfCenterReached(maze: Maze, prev: Vec): 'dot' | 'energizer' | null {
    const pos = this.actor.pos;
    const tile = tileOf(pos);
    const cx = tile.x + 0.5;
    const cy = tile.y + 0.5;
    const crossed = (prev.x - cx) * (pos.x - cx) <= 0 && (prev.y - cy) * (pos.y - cy) <= 0;
    if (!crossed) return null;
    if (this.lastEatenTile && this.lastEatenTile.x === tile.x && this.lastEatenTile.y === tile.y) return null;
    this.lastEatenTile = tile;
    return maze.eat(tile.x, tile.y);
  }
}
