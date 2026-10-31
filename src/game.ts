import { Threat, type ThreatUpdateContext } from './threat';
import { FRUIT_POINTS, levelConfig, type FruitKind, type LevelConfig } from './levels';
import { FRUIT_POS, Maze } from './maze';
import { ModeTimer } from './modeTimer';
import { tileOf } from './movement';
import { Fugitivo } from './fugitivo';
import type { Dir, ThreatName, Vec } from './types';

export type Phase = 'ready' | 'playing' | 'dying' | 'levelComplete' | 'gameOver' | 'paused';

export type Popup = { text: string; pos: Vec; framesLeft: number };

const FPS = 60;
const READY_FRAMES = 120;
const DYING_FRAMES = 90;
const LEVEL_COMPLETE_FRAMES = 120;
const THREAT_EAT_FREEZE_FRAMES = 30;
const POPUP_FRAMES = 60;
const FRUIT_FRAMES = 570;
const FRUIT_DOTS = [70, 170];
const DOT_POINTS = 10;
const ENERGIZER_POINTS = 50;
const THREAT_POINTS = [200, 400, 800, 1600];
const EXTRA_LIFE_SCORE = 10000;
const START_LIVES = 3;
const THREAT_NAMES: ThreatName[] = ['delegado', 'agente', 'perito', 'estagiario'];
const RELEASE_ORDER = ['agente', 'perito', 'estagiario'] as const;

function sameTile(a: Vec, b: Vec): boolean {
  return a.x === b.x && a.y === b.y;
}

export class Game {
  phase: Phase = 'ready';
  level = 1;
  score = 0;
  highScore: number;
  lives = START_LIVES;
  maze = new Maze();
  fugitivo = new Fugitivo();
  threats: Threat[] = THREAT_NAMES.map((name) => new Threat(name));
  fruit: { kind: FruitKind; visible: boolean } = { kind: 'cherry', visible: false };
  frightFramesLeft = 0;
  threatsEatenThisFright = 0;
  popups: Popup[] = [];
  modeTimer: ModeTimer;

  private readonly random: () => number;
  private phaseFrames = READY_FRAMES;
  private freezeFrames = 0;
  private fruitFramesLeft = 0;
  private idleFrames = 0;
  private resumePhase: Phase | null = null;
  private extraLifeGiven = false;
  private cachedConfig: { level: number; config: LevelConfig } | null = null;

  constructor(opts: { random?: () => number; highScore?: number } = {}) {
    this.random = opts.random ?? Math.random;
    this.highScore = opts.highScore ?? 0;
    this.modeTimer = new ModeTimer(this.config.modeSchedule);
    this.fruit.kind = this.config.fruit;
  }

  // Frames restantes da fase atual ('ready', 'dying', 'levelComplete'); usado pelo render.
  get phaseFramesLeft(): number {
    return this.phaseFrames;
  }

  // Fase real do jogo: durante a pausa, a fase em que ele foi pausado.
  get displayPhase(): Phase {
    return this.phase === 'paused' ? (this.resumePhase ?? 'playing') : this.phase;
  }

  // Recalculado só quando `level` muda.
  private get config(): LevelConfig {
    if (this.cachedConfig?.level !== this.level) {
      this.cachedConfig = { level: this.level, config: levelConfig(this.level) };
    }
    return this.cachedConfig.config;
  }

  step(): void {
    if (this.phase === 'paused' || this.phase === 'gameOver') return;
    this.tickPopups();
    switch (this.phase) {
      case 'ready':
        if (--this.phaseFrames <= 0) this.phase = 'playing';
        return;
      case 'dying':
        if (--this.phaseFrames <= 0) this.loseLife();
        return;
      case 'levelComplete':
        if (--this.phaseFrames <= 0) this.nextLevel();
        return;
      case 'playing':
        return this.stepPlaying();
    }
  }

  setDirection(dir: Dir): void {
    if (this.phase === 'playing' || this.phase === 'ready') this.fugitivo.setDesired(dir);
  }

  // Pausa em qualquer fase, exceto 'gameOver'; guarda a fase para retomar depois.
  pause(): void {
    if (this.phase === 'paused' || this.phase === 'gameOver') return;
    this.resumePhase = this.phase;
    this.phase = 'paused';
  }

  togglePause(): void {
    if (this.phase === 'paused') {
      this.phase = this.resumePhase ?? 'playing';
      this.resumePhase = null;
    } else {
      this.pause();
    }
  }

  restart(): void {
    this.level = 1;
    this.score = 0;
    this.lives = START_LIVES;
    this.extraLifeGiven = false;
    this.popups = [];
    this.resumePhase = null;
    this.startLevel();
  }

  private stepPlaying(): void {
    if (this.freezeFrames > 0) {
      this.freezeFrames--;
      return;
    }
    this.tickFruit();
    const config = this.config;
    const speed = this.frightFramesLeft > 0 ? config.pacFrightSpeed : config.pacSpeed;
    const { ate } = this.fugitivo.update(this.maze, speed);
    this.processFood(ate);
    if (this.maze.dotsRemaining === 0) {
      this.phase = 'levelComplete';
      this.phaseFrames = LEVEL_COMPLETE_FRAMES;
      return;
    }
    this.checkFruit();
    this.tickFright();
    if (this.modeTimer.update() === 'reversed') {
      for (const g of this.threats) g.reverse();
    }
    this.releaseThreats();
    const ctx = this.threatContext();
    for (const g of this.threats) g.update(ctx);
    this.checkThreatCollisions();
  }

  private processFood(ate: 'dot' | 'energizer' | null): void {
    if (ate === null) {
      this.idleFrames++;
      return;
    }
    this.idleFrames = 0;
    this.addScore(ate === 'dot' ? DOT_POINTS : ENERGIZER_POINTS);
    if (ate === 'energizer') this.energize();
    if (FRUIT_DOTS.includes(this.maze.dotsEaten)) {
      this.fruit.visible = true;
      this.fruitFramesLeft = FRUIT_FRAMES;
    }
  }

  private energize(): void {
    const seconds = this.config.frightSeconds;
    if (seconds <= 0) {
      // Sem susto, os fantasmas ainda invertem a direção.
      for (const g of this.threats) g.reverse();
      return;
    }
    for (const g of this.threats) {
      if (g.mode !== 'eyes') g.frighten();
    }
    this.frightFramesLeft = seconds * FPS;
    this.threatsEatenThisFright = 0;
    this.modeTimer.pause();
  }

  private tickFright(): void {
    if (this.frightFramesLeft <= 0) return;
    if (--this.frightFramesLeft > 0) return;
    for (const g of this.threats) g.endFright();
    this.modeTimer.resume();
  }

  private checkFruit(): void {
    if (!this.fruit.visible) return;
    if (sameTile(tileOf(this.fugitivo.actor.pos), tileOf(FRUIT_POS))) {
      const points = FRUIT_POINTS[this.fruit.kind];
      this.addScore(points);
      this.addPopup(String(points), FRUIT_POS);
      this.fruit.visible = false;
    }
  }

  private tickFruit(): void {
    if (this.fruit.visible && --this.fruitFramesLeft <= 0) this.fruit.visible = false;
  }

  private releaseThreats(): void {
    const config = this.config;
    const waiting = RELEASE_ORDER.filter((name) => this.threat(name).mode === 'house');
    for (const name of waiting) {
      if (this.maze.dotsEaten < config.releaseDots[name]) break;
      this.threat(name).release();
    }
    if (this.idleFrames >= config.idleReleaseSeconds * FPS) {
      this.idleFrames = 0;
      this.threats.find((g) => g.mode === 'house' && g.name !== 'delegado')?.release();
    }
  }

  private threatContext(): ThreatUpdateContext {
    return {
      maze: this.maze,
      level: this.config,
      globalMode: this.modeTimer.mode,
      pac: { tile: tileOf(this.fugitivo.actor.pos), dir: this.fugitivo.actor.dir },
      delegadoTile: tileOf(this.threat('delegado').actor.pos),
      dotsRemaining: this.maze.dotsRemaining,
      random: this.random,
    };
  }

  private checkThreatCollisions(): void {
    const pacTile = tileOf(this.fugitivo.actor.pos);
    for (const g of this.threats) {
      if (!sameTile(tileOf(g.actor.pos), pacTile)) continue;
      if (g.mode === 'house' || g.mode === 'eyes') continue;
      if (g.frightened) {
        if (g.mode !== 'leaving') this.eatThreat(g);
        continue;
      }
      this.phase = 'dying';
      this.phaseFrames = DYING_FRAMES;
      return;
    }
  }

  private eatThreat(g: Threat): void {
    const points = THREAT_POINTS[Math.min(this.threatsEatenThisFright, THREAT_POINTS.length - 1)];
    this.threatsEatenThisFright++;
    this.addScore(points);
    this.addPopup(String(points), g.actor.pos);
    g.eat();
    this.freezeFrames = THREAT_EAT_FREEZE_FRAMES;
  }

  private loseLife(): void {
    this.lives--;
    if (this.lives <= 0) {
      this.phase = 'gameOver';
      return;
    }
    this.resetPositions();
  }

  private nextLevel(): void {
    this.level++;
    this.startLevel();
  }

  private startLevel(): void {
    this.maze.reset();
    this.fruit.kind = this.config.fruit;
    this.resetPositions();
  }

  // Volta a 'ready' com atores nas posições iniciais; pontos comidos e contadores do nível são mantidos.
  private resetPositions(): void {
    this.fugitivo.reset();
    for (const g of this.threats) g.reset();
    this.modeTimer = new ModeTimer(this.config.modeSchedule);
    this.frightFramesLeft = 0;
    this.threatsEatenThisFright = 0;
    this.freezeFrames = 0;
    this.idleFrames = 0;
    this.fruit.visible = false;
    this.fruitFramesLeft = 0;
    this.phase = 'ready';
    this.phaseFrames = READY_FRAMES;
  }

  private addScore(points: number): void {
    this.score += points;
    if (!this.extraLifeGiven && this.score >= EXTRA_LIFE_SCORE) {
      this.extraLifeGiven = true;
      this.lives++;
    }
    if (this.score > this.highScore) this.highScore = this.score;
  }

  private addPopup(text: string, pos: Vec): void {
    this.popups.push({ text, pos: { ...pos }, framesLeft: POPUP_FRAMES });
  }

  private tickPopups(): void {
    for (const p of this.popups) p.framesLeft--;
    this.popups = this.popups.filter((p) => p.framesLeft > 0);
  }

  private threat(name: ThreatName): Threat {
    const g = this.threats.find((x) => x.name === name);
    if (!g) throw new Error(`Game: fantasma ${name} ausente`);
    return g;
  }
}
