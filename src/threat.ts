import { chaseTarget, pickDirection, SCATTER_TARGET } from './threatAi';
import type { LevelConfig } from './levels';
import { CENTER_COL, DOOR_TILES, START, TUNNEL_ROW, TUNNEL_SLOW_COLS, type Maze } from './maze';
import { advance, BASE_SPEED, tileOf, type Actor } from './movement';
import { OPPOSITE, type Dir, type ThreatMode, type ThreatName, type Vec } from './types';

export type ThreatUpdateContext = {
  maze: Maze;
  level: LevelConfig;
  globalMode: 'scatter' | 'chase';
  pac: { tile: Vec; dir: Dir };
  delegadoTile: Vec;
  dotsRemaining: number;
  random: () => number;
};

const HOUSE_SPEED = 0.5 * BASE_SPEED;
const EYES_SPEED = 2 * BASE_SPEED;
const HOUSE_TOP = 13.5;
const HOUSE_BOTTOM = 15.5;
const HOUSE_CENTER_Y = 14.5;
const DOOR_X = CENTER_COL + 0.5;
const EXIT_Y = 11.5;
const EYES_TARGET: Vec = { x: CENTER_COL, y: 11 };

function isDoor(c: number, r: number): boolean {
  return DOOR_TILES.some((d) => d.x === c && d.y === r);
}

// Move `value` em direção a `goal` no máximo `step`.
function approach(value: number, goal: number, step: number): number {
  return Math.abs(goal - value) <= step ? goal : value + Math.sign(goal - value) * step;
}

export class Threat {
  readonly name: ThreatName;
  actor: Actor = { pos: { x: 0, y: 0 }, dir: 'left' };
  mode: ThreatMode = 'house';
  frightened = false;
  private pendingReverse = false;
  private descending = false;
  private globalMode: 'scatter' | 'chase' = 'scatter';

  constructor(name: ThreatName) {
    this.name = name;
    this.reset();
  }

  reset(): void {
    this.actor = { pos: { ...START[this.name] }, dir: this.name === 'delegado' ? 'left' : 'up' };
    this.mode = this.name === 'delegado' ? 'scatter' : 'house';
    this.frightened = false;
    this.pendingReverse = false;
    this.descending = false;
    this.globalMode = 'scatter';
  }

  release(): void {
    if (this.mode === 'house') this.mode = 'leaving';
  }

  reverse(): void {
    if (this.isRoaming()) this.pendingReverse = true;
  }

  frighten(): void {
    if (this.mode === 'eyes') return;
    this.frightened = true;
    if (!this.isRoaming()) return;
    this.mode = 'frightened';
    this.pendingReverse = true;
  }

  endFright(): void {
    this.frightened = false;
    if (this.mode === 'frightened') this.mode = this.globalMode;
  }

  eat(): void {
    this.mode = 'eyes';
    this.frightened = false;
    this.pendingReverse = false;
    this.descending = false;
  }

  update(ctx: ThreatUpdateContext): void {
    this.globalMode = ctx.globalMode;
    switch (this.mode) {
      case 'house':
        return this.bounce();
      case 'leaving':
        return this.leave();
      case 'eyes':
        return this.returnHome(ctx);
      case 'frightened':
        return this.roam(ctx, ctx.level.threatFrightSpeed, null);
      case 'scatter':
      case 'chase':
        this.mode = ctx.globalMode;
        return this.roam(ctx, this.roamSpeed(ctx), this.target(ctx));
    }
  }

  private isRoaming(): boolean {
    return this.mode === 'scatter' || this.mode === 'chase' || this.mode === 'frightened';
  }

  private bounce(): void {
    const pos = this.actor.pos;
    if (this.actor.dir !== 'up' && this.actor.dir !== 'down') this.actor.dir = 'up';
    pos.y = approach(pos.y, this.actor.dir === 'up' ? HOUSE_TOP : HOUSE_BOTTOM, HOUSE_SPEED);
    if (pos.y === HOUSE_TOP) this.actor.dir = 'down';
    else if (pos.y === HOUSE_BOTTOM) this.actor.dir = 'up';
  }

  private leave(): void {
    const pos = this.actor.pos;
    if (pos.x !== DOOR_X) {
      this.actor.dir = pos.x < DOOR_X ? 'right' : 'left';
      pos.x = approach(pos.x, DOOR_X, HOUSE_SPEED);
      return;
    }
    this.actor.dir = 'up';
    pos.y = approach(pos.y, EXIT_Y, HOUSE_SPEED);
    if (pos.y !== EXIT_Y) return;
    this.actor.dir = 'left';
    this.mode = this.frightened ? 'frightened' : this.globalMode;
  }

  private returnHome(ctx: ThreatUpdateContext): void {
    if (this.descending) return this.descend();
    const atDoor = (): boolean => this.actor.pos.x === DOOR_X && this.actor.pos.y === EXIT_Y;
    if (atDoor()) {
      this.descending = true;
      return this.descend();
    }
    advance(
      this.actor,
      EYES_SPEED,
      (tile, current) => pickDirection(ctx.maze, tile, current, EYES_TARGET, { frightened: false }),
      (c, r) => !atDoor() && this.canEnter(ctx.maze, c, r),
    );
  }

  private descend(): void {
    const pos = this.actor.pos;
    this.actor.dir = 'down';
    pos.y = approach(pos.y, HOUSE_CENTER_Y, EYES_SPEED);
    if (pos.y !== HOUSE_CENTER_Y) return;
    this.descending = false;
    this.mode = 'leaving';
  }

  // target null = movimento aleatório (frightened).
  private roam(ctx: ThreatUpdateContext, speed: number, target: Vec | null): void {
    const effective = this.inTunnel() ? ctx.level.tunnelSpeed : speed;
    advance(
      this.actor,
      effective * BASE_SPEED,
      (tile, current) => {
        if (this.pendingReverse) {
          this.pendingReverse = false;
          return OPPOSITE[current];
        }
        if (target === null) {
          return pickDirection(ctx.maze, tile, current, tile, { frightened: true, random: ctx.random });
        }
        return pickDirection(ctx.maze, tile, current, target, { frightened: false });
      },
      (c, r) => this.canEnter(ctx.maze, c, r),
    );
  }

  private canEnter(maze: Maze, c: number, r: number): boolean {
    return maze.isWalkable(c, r, true) && !isDoor(c, r);
  }

  private inTunnel(): boolean {
    const t = tileOf(this.actor.pos);
    return t.y === TUNNEL_ROW && (t.x <= TUNNEL_SLOW_COLS.left || t.x >= TUNNEL_SLOW_COLS.right);
  }

  private elroyActive(ctx: ThreatUpdateContext): boolean {
    return this.name === 'delegado' && ctx.dotsRemaining <= ctx.level.elroy1Dots;
  }

  private roamSpeed(ctx: ThreatUpdateContext): number {
    if (this.name === 'delegado' && ctx.dotsRemaining <= ctx.level.elroy2Dots) return ctx.level.elroy2Speed;
    if (this.elroyActive(ctx)) return ctx.level.elroy1Speed;
    return ctx.level.threatSpeed;
  }

  private target(ctx: ThreatUpdateContext): Vec {
    if (this.mode === 'scatter' && !this.elroyActive(ctx)) return SCATTER_TARGET[this.name];
    return chaseTarget(this.name, {
      pacTile: ctx.pac.tile,
      pacDir: ctx.pac.dir,
      delegadoTile: ctx.delegadoTile,
      threatTile: tileOf(this.actor.pos),
    });
  }
}
