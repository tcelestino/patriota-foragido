import type { Game } from './game';
import type { Threat } from './threat';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, TILE_SIZE } from './layout';
import { levelConfig, type LevelConfig } from './levels';
import { COLS, FRUIT_POS, ROWS, type Maze } from './maze';
import { drawBonus, drawEnergizer, drawFugitivo, drawThreat, drawThreatCap, drawWeakThreat, type FugitivoPose } from './sprites';
import type { Vec } from './types';

// Coordenadas lógicas: COLS x ROWS tiles de 8 px. O canvas contém só o labirinto e os atores;
// HUD e mensagens ficam em HTML. Quem chama aplica a escala do layout no contexto.
const TILE = TILE_SIZE;
const SPRITE = 16;
const DYING_FRAMES = 90;
const STRIDE_FRAMES = 6;
const ENERGIZER_BLINK = 15;
const ENERGIZER_SPRITE = 15;
const FLASH_FRAMES = 14;
const FLASH_CYCLE = 28;
const LEVEL_BLINK = 12;
const CORNER = 3; // raio dos cantos convexos das paredes
const INSET = 0.5; // recuo das linhas para ficarem nítidas

const WALL_FILL = '#0c1544';
const WALL_EDGE = '#5a8dff';
const WALL_GLOW = 'rgba(70, 120, 255, 0.26)';
const WALL_FLASH = '#ffdf00';
const DOOR = '#ffdf00';
const DOT = '#fff1b8';
const POPUP = '#7df0ff';

// Caches: nada de canvas novo por frame.
type WallPaths = { fill: Path2D; edges: Path2D };
const wallCache = new WeakMap<Maze, WallPaths>();
const configCache = new Map<number, LevelConfig>(); // cresce um item por nível alcançado

function configFor(level: number): LevelConfig {
  let config = configCache.get(level);
  if (!config) {
    config = levelConfig(level);
    configCache.set(level, config);
  }
  return config;
}

// Centro, em px lógicos, de uma posição em tiles do labirinto.
function toPx(pos: Vec): Vec {
  return { x: pos.x * TILE, y: pos.y * TILE };
}

// Paredes: preenchimento com cantos convexos arredondados e contorno só nas faces voltadas
// para corredores (linhas e arcos recuados 0.5 px para ficarem nítidos).
function buildWalls(maze: Maze): WallPaths {
  const fill = new Path2D();
  const edges = new Path2D();
  const R = CORNER;
  const I = INSET;
  const isWall = (c: number, r: number): boolean => maze.tileAt(c, r) === 'wall';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isWall(c, r)) continue;
      const x = c * TILE;
      const y = r * TILE;
      const up = !isWall(c, r - 1);
      const down = !isWall(c, r + 1);
      const left = !isWall(c - 1, r);
      const right = !isWall(c + 1, r);
      const tl = up && left;
      const tr = up && right;
      const bl = down && left;
      const br = down && right;

      fill.moveTo(x + (tl ? R : 0), y);
      fill.lineTo(x + TILE - (tr ? R : 0), y);
      if (tr) fill.arcTo(x + TILE, y, x + TILE, y + R, R);
      fill.lineTo(x + TILE, y + TILE - (br ? R : 0));
      if (br) fill.arcTo(x + TILE, y + TILE, x + TILE - R, y + TILE, R);
      fill.lineTo(x + (bl ? R : 0), y + TILE);
      if (bl) fill.arcTo(x, y + TILE, x, y + TILE - R, R);
      fill.lineTo(x, y + (tl ? R : 0));
      if (tl) fill.arcTo(x, y, x + R, y, R);
      fill.closePath();

      if (up) {
        edges.moveTo(x + (tl ? R : 0), y + I);
        edges.lineTo(x + TILE - (tr ? R : 0), y + I);
      }
      if (down) {
        edges.moveTo(x + (bl ? R : 0), y + TILE - I);
        edges.lineTo(x + TILE - (br ? R : 0), y + TILE - I);
      }
      if (left) {
        edges.moveTo(x + I, y + (tl ? R : 0));
        edges.lineTo(x + I, y + TILE - (bl ? R : 0));
      }
      if (right) {
        edges.moveTo(x + TILE - I, y + (tr ? R : 0));
        edges.lineTo(x + TILE - I, y + TILE - (br ? R : 0));
      }
      if (tl) {
        edges.moveTo(x + I, y + R);
        edges.arc(x + R, y + R, R - I, Math.PI, 1.5 * Math.PI);
      }
      if (tr) {
        edges.moveTo(x + TILE - R, y + I);
        edges.arc(x + TILE - R, y + R, R - I, 1.5 * Math.PI, 2 * Math.PI);
      }
      if (br) {
        edges.moveTo(x + TILE - I, y + TILE - R);
        edges.arc(x + TILE - R, y + TILE - R, R - I, 0, 0.5 * Math.PI);
      }
      if (bl) {
        edges.moveTo(x + R, y + TILE - I);
        edges.arc(x + R, y + TILE - R, R - I, 0.5 * Math.PI, Math.PI);
      }
    }
  }
  return { fill, edges };
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const grad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  grad.addColorStop(0, '#070b24');
  grad.addColorStop(1, '#040616');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

function drawMaze(ctx: CanvasRenderingContext2D, game: Game): void {
  let walls = wallCache.get(game.maze);
  if (!walls) {
    walls = buildWalls(game.maze);
    wallCache.set(game.maze, walls);
  }
  const flash = game.displayPhase === 'levelComplete' && Math.floor(game.phaseFramesLeft / LEVEL_BLINK) % 2 === 1;
  ctx.fillStyle = WALL_FILL;
  ctx.fill(walls.fill);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = flash ? 'rgba(255, 223, 0, 0.35)' : WALL_GLOW;
  ctx.lineWidth = 3;
  ctx.stroke(walls.edges);
  ctx.strokeStyle = flash ? WALL_FLASH : WALL_EDGE;
  ctx.lineWidth = 1;
  ctx.stroke(walls.edges);
  ctx.lineCap = 'butt';
}

function drawDots(ctx: CanvasRenderingContext2D, game: Game, frame: number, energizer: CanvasImageSource | null): void {
  const energizerOn = Math.floor(frame / ENERGIZER_BLINK) % 2 === 0;
  const glow = 0.5 + 0.5 * Math.sin(frame / 9);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = game.maze.tileAt(c, r);
      if (tile === 'wall' || tile === 'empty') continue;
      const x = c * TILE + TILE / 2;
      const y = r * TILE + TILE / 2;
      if (tile === 'dot') {
        ctx.fillStyle = DOT;
        ctx.beginPath();
        ctx.arc(x, y, 1.15, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === 'energizer') {
        if (energizerOn) drawEnergizer(ctx, energizer, x, y, ENERGIZER_SPRITE, glow);
      } else if (tile === 'door') {
        ctx.fillStyle = DOOR;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x - TILE / 2, y - 1, TILE, 2);
        ctx.globalAlpha = 1;
      }
    }
  }
}

// Pose do Fugitivo: passos alternados enquanto anda, parado quando encosta na parede ou na pausa,
// e queda progressiva ao ser pego.
export function fugitivoPose(game: Game, frame: number): FugitivoPose {
  if (game.displayPhase === 'dying') return { stride: 0, fall: 1 - game.phaseFramesLeft / DYING_FRAMES };
  if (game.displayPhase === 'ready' || game.displayPhase === 'levelComplete') return { stride: 0, fall: 0 };
  // Fase real: pausado em 'playing' os passos congelam.
  if (game.phase === 'playing' && !game.fugitivo.stopped) {
    return { stride: Math.floor(frame / STRIDE_FRAMES) % 2 === 0 ? 1 : 2, fall: 0 };
  }
  return { stride: 0, fall: 0 };
}

function drawFugitivoActor(ctx: CanvasRenderingContext2D, game: Game, frame: number): void {
  if (game.displayPhase === 'gameOver') return;
  const p = toPx(game.fugitivo.actor.pos);
  drawFugitivo(ctx, p.x, p.y, SPRITE, game.fugitivo.actor.dir, fugitivoPose(game, frame));
}

function frightFlashLight(game: Game): boolean {
  const flashFrames = configFor(game.level).frightFlashes * FLASH_CYCLE;
  const left = game.frightFramesLeft;
  return left > 0 && left <= flashFrames && Math.floor(left / FLASH_FRAMES) % 2 === 0;
}

function drawThreatActor(ctx: CanvasRenderingContext2D, g: Threat, frame: number, flashLight: boolean): void {
  const p = toPx(g.actor.pos);
  if (g.mode === 'eyes') {
    drawThreatCap(ctx, p.x, p.y, g.actor.dir);
    return;
  }
  if (g.frightened) {
    drawWeakThreat(ctx, p.x, p.y, frame, flashLight);
    return;
  }
  drawThreat(ctx, g.name, p.x, p.y, g.actor.dir, frame);
}

function drawThreats(ctx: CanvasRenderingContext2D, game: Game, frame: number): void {
  if (game.displayPhase === 'dying' || game.displayPhase === 'levelComplete' || game.displayPhase === 'gameOver') return;
  const flashLight = frightFlashLight(game);
  for (const g of game.threats) drawThreatActor(ctx, g, frame, flashLight);
}

function drawBonusItem(ctx: CanvasRenderingContext2D, game: Game): void {
  if (!game.fruit.visible || game.displayPhase === 'gameOver') return;
  const p = toPx(FRUIT_POS);
  drawBonus(ctx, game.fruit.kind, p.x, p.y);
}

function drawPopups(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.font = 'bold 6px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = POPUP;
  for (const popup of game.popups) {
    const p = toPx(popup.pos);
    ctx.fillText(popup.text, p.x, p.y);
  }
}

export function render(
  ctx: CanvasRenderingContext2D,
  game: Game,
  frame: number,
  energizer: CanvasImageSource | null = null,
): void {
  ctx.imageSmoothingEnabled = true;
  ctx.textBaseline = 'middle';
  drawBackground(ctx);
  drawMaze(ctx, game);
  drawDots(ctx, game, frame, energizer);
  drawBonusItem(ctx, game);
  drawFugitivoActor(ctx, game, frame);
  drawThreats(ctx, game, frame);
  drawPopups(ctx, game);
}
