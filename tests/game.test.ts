import { describe, expect, test, vi } from 'vitest';
import { Game } from '../src/game';
import type { Threat } from '../src/threat';
import { COLS, ROWS, START } from '../src/maze';
import type { Dir, ThreatName } from '../src/types';

function makeGame(opts: { highScore?: number } = {}): Game {
  return new Game({ random: () => 0, ...opts });
}

function steps(game: Game, n: number): void {
  for (let i = 0; i < n; i++) game.step();
}

// Avança os 120 frames de 'ready'.
function play(game: Game): void {
  steps(game, 120);
  expect(game.phase).toBe('playing');
}

function stepUntil(game: Game, cond: () => boolean, limit = 600): void {
  for (let i = 0; i < limit; i++) {
    if (cond()) return;
    game.step();
  }
  if (!cond()) throw new Error('condição não atingida');
}

function threat(game: Game, name: ThreatName): Threat {
  const g = game.threats.find((x) => x.name === name);
  if (!g) throw new Error(`fantasma ${name} não encontrado`);
  return g;
}

function placePac(game: Game, x: number, y: number, dir: Dir): void {
  game.fugitivo.actor.pos = { x, y };
  game.fugitivo.actor.dir = dir;
}

// Fugitivo parado no início olhando para a parede de cima: não come nada.
function parkPac(game: Game): void {
  placePac(game, START.fugitivo.x, START.fugitivo.y, 'up');
}

// Come o energizer inferior esquerdo (1,23); Fugitivo fica parado nesse tile.
function eatLeftEnergizer(game: Game): void {
  game.maze.eat(2, 23);
  placePac(game, 2.5, 23.5, 'left');
  stepUntil(game, () => game.frightFramesLeft > 0);
}

function tileCenter(game: Game): { x: number; y: number } {
  return { x: Math.floor(game.fugitivo.actor.pos.x) + 0.5, y: Math.floor(game.fugitivo.actor.pos.y) + 0.5 };
}

function toRoaming(g: Threat, x: number, y: number): void {
  g.mode = 'scatter';
  g.actor.pos = { x, y };
}

describe('Game', () => {
  test('estado inicial: ready, nível 1, 3 vidas, 4 fantasmas', () => {
    const game = makeGame();
    expect(game.phase).toBe('ready');
    expect(game.level).toBe(1);
    expect(game.lives).toBe(3);
    expect(game.score).toBe(0);
    expect(game.threats.map((g) => g.name)).toEqual(['delegado', 'agente', 'perito', 'estagiario']);
    expect(game.fruit).toEqual({ kind: 'cherry', visible: false });
    steps(game, 119);
    expect(game.phase).toBe('ready');
    game.step();
    expect(game.phase).toBe('playing');
  });

  test('pontuação: dot 10, energizer 50', () => {
    const game = makeGame();
    play(game);
    stepUntil(game, () => game.score > 0);
    expect(game.score).toBe(10);
    eatLeftEnergizer(game);
    expect(game.score).toBe(60);
  });

  test('vida extra única aos 10000', () => {
    const game = makeGame();
    play(game);
    game.score = 9990;
    stepUntil(game, () => game.score >= 10000);
    expect(game.lives).toBe(4);
    stepUntil(game, () => game.score >= 10010);
    expect(game.lives).toBe(4);
  });

  test('highScore acompanha a pontuação e é mantido no restart', () => {
    const game = makeGame({ highScore: 15 });
    expect(game.highScore).toBe(15);
    play(game);
    stepUntil(game, () => game.score === 10);
    expect(game.highScore).toBe(15);
    stepUntil(game, () => game.score === 20);
    expect(game.highScore).toBe(20);
    game.restart();
    expect(game.score).toBe(0);
    expect(game.level).toBe(1);
    expect(game.lives).toBe(3);
    expect(game.phase).toBe('ready');
    expect(game.highScore).toBe(20);
  });

  test('energizer frightens fantasmas e pausa ModeTimer', () => {
    const game = makeGame();
    const pause = vi.spyOn(game.modeTimer, 'pause');
    const resume = vi.spyOn(game.modeTimer, 'resume');
    play(game);
    eatLeftEnergizer(game);
    expect(pause).toHaveBeenCalled();
    expect(game.frightFramesLeft).toBeGreaterThan(350);
    expect(game.threatsEatenThisFright).toBe(0);
    expect(threat(game, 'delegado').mode).toBe('frightened');
    for (const g of game.threats) expect(g.frightened).toBe(true);

    game.frightFramesLeft = 1;
    game.step();
    expect(game.frightFramesLeft).toBe(0);
    expect(resume).toHaveBeenCalled();
    for (const g of game.threats) expect(g.frightened).toBe(false);
    expect(threat(game, 'delegado').mode).not.toBe('frightened');
  });

  test('energizer durante frightened reinicia o contador', () => {
    const game = makeGame();
    play(game);
    eatLeftEnergizer(game);
    game.frightFramesLeft = 30;
    game.threatsEatenThisFright = 2;
    placePac(game, 29.5, 23.5, 'right');
    stepUntil(game, () => game.frightFramesLeft > 30);
    expect(game.frightFramesLeft).toBeGreaterThan(350);
    expect(game.threatsEatenThisFright).toBe(0);
  });

  test('combo 200,400,800,1600 por energizer', () => {
    const game = makeGame();
    play(game);
    eatLeftEnergizer(game);
    const gains: number[] = [];
    for (const g of game.threats) {
      toRoaming(g, 1.5, 23.5);
      g.frighten();
      const before = game.score;
      game.step();
      gains.push(game.score - before);
      expect(g.mode).toBe('eyes');
      steps(game, 30);
    }
    expect(gains).toEqual([200, 400, 800, 1600]);

    placePac(game, 29.5, 23.5, 'right');
    stepUntil(game, () => game.threatsEatenThisFright === 0);
    const agente = threat(game, 'agente');
    toRoaming(agente, 30.5, 23.5);
    agente.frighten();
    const before = game.score;
    game.step();
    expect(game.score - before).toBe(200);
  });

  test('fantasma frightened comido vira eyes e some o susto só nele', () => {
    const game = makeGame();
    play(game);
    eatLeftEnergizer(game);
    const delegado = threat(game, 'delegado');
    delegado.actor.pos = { x: 1.5, y: 23.5 };
    game.step();
    expect(delegado.mode).toBe('eyes');
    expect(delegado.frightened).toBe(false);
    for (const g of game.threats.filter((x) => x !== delegado)) expect(g.frightened).toBe(true);
    expect(game.popups).toHaveLength(1);
    expect(game.popups[0]).toMatchObject({ text: '200', framesLeft: 60 });
  });

  test('comer fantasma congela o jogo 30 frames', () => {
    const game = makeGame();
    play(game);
    eatLeftEnergizer(game);
    const delegado = threat(game, 'delegado');
    delegado.actor.pos = { x: 1.5, y: 23.5 };
    game.step();
    const fright = game.frightFramesLeft;
    const eyesPos = { ...delegado.actor.pos };
    steps(game, 30);
    expect(game.frightFramesLeft).toBe(fright);
    expect(delegado.actor.pos).toEqual(eyesPos);
    game.step();
    expect(game.frightFramesLeft).toBe(fright - 1);
  });

  test('popups expiram após 60 frames', () => {
    const game = makeGame();
    play(game);
    eatLeftEnergizer(game);
    threat(game, 'delegado').actor.pos = { x: 1.5, y: 23.5 };
    game.step();
    expect(game.popups).toHaveLength(1);
    steps(game, 59);
    expect(game.popups).toHaveLength(1);
    expect(game.popups[0].framesLeft).toBe(1);
    game.step();
    expect(game.popups).toHaveLength(0);
  });

  test('colisão com fantasma em eyes ou na casa é inofensiva', () => {
    const game = makeGame();
    play(game);
    parkPac(game);
    const delegado = threat(game, 'delegado');
    delegado.eat();
    delegado.actor.pos = { ...START.fugitivo };
    game.step();
    expect(game.phase).toBe('playing');
    expect(game.lives).toBe(3);
  });

  test('colisão com fantasma normal: dying -> ready com vidas-1', () => {
    const game = makeGame();
    play(game);
    stepUntil(game, () => game.score >= 30);
    const eaten = game.maze.dotsEaten;
    const pacTile = { x: Math.floor(game.fugitivo.actor.pos.x), y: Math.floor(game.fugitivo.actor.pos.y) };
    const delegado = threat(game, 'delegado');
    delegado.actor.pos = { x: pacTile.x + 0.5, y: pacTile.y + 0.5 };
    game.step();
    expect(game.phase).toBe('dying');
    steps(game, 89);
    expect(game.phase).toBe('dying');
    expect(game.lives).toBe(3);
    game.step();
    expect(game.phase).toBe('ready');
    expect(game.lives).toBe(2);
    expect(game.fugitivo.actor.pos).toEqual(START.fugitivo);
    expect(delegado.actor.pos).toEqual(START.delegado);
    expect(threat(game, 'agente').mode).toBe('house');
    expect(game.maze.dotsEaten).toBe(eaten);
    expect(game.score).toBeGreaterThanOrEqual(30);
    play(game);
  });

  test('fantasma saindo da casa sem susto é letal', () => {
    const game = makeGame();
    play(game);
    parkPac(game);
    const agente = threat(game, 'agente');
    agente.mode = 'leaving';
    agente.actor.pos = { ...START.fugitivo };
    game.step();
    expect(game.phase).toBe('dying');
  });

  test('sem vidas: gameOver', () => {
    const game = makeGame();
    play(game);
    parkPac(game);
    game.lives = 1;
    threat(game, 'delegado').actor.pos = { ...START.fugitivo };
    game.step();
    steps(game, 90);
    expect(game.phase).toBe('gameOver');
    expect(game.lives).toBe(0);
    const score = game.score;
    steps(game, 200);
    expect(game.phase).toBe('gameOver');
    expect(game.score).toBe(score);
  });

  test('fruta aparece com 70 e 170 pontos comidos e vale FRUIT_POINTS', () => {
    const game = makeGame();
    play(game);
    game.maze.dotsEaten = 69;
    stepUntil(game, () => game.maze.dotsEaten === 70);
    expect(game.fruit.visible).toBe(true);
    const score = game.score;
    placePac(game, 15.5, 17.5, 'up');
    game.step();
    expect(game.score).toBe(score + 100);
    expect(game.fruit.visible).toBe(false);
    expect(game.popups).toEqual([{ text: '100', pos: { x: 15.5, y: 17.5 }, framesLeft: 60 }]);

    placePac(game, START.fugitivo.x, START.fugitivo.y, 'left');
    game.maze.dotsEaten = 169;
    stepUntil(game, () => game.maze.dotsEaten === 170);
    expect(game.fruit.visible).toBe(true);
  });

  test('fruta some após 570 frames', () => {
    const game = makeGame();
    play(game);
    game.maze.dotsEaten = 69;
    stepUntil(game, () => game.maze.dotsEaten === 70);
    parkPac(game);
    // Mantém as ameaças presas na casa: o teste mede só o tempo de vida do bônus.
    for (const g of game.threats) {
      g.mode = 'house';
      vi.spyOn(g, 'release').mockImplementation(() => {});
    }
    steps(game, 569);
    expect(game.fruit.visible).toBe(true);
    game.step();
    expect(game.fruit.visible).toBe(false);
  });

  test('liberação: perito após 30 pontos no nível 1; estagiario após 60', () => {
    const game = makeGame();
    play(game);
    parkPac(game);
    game.step();
    expect(threat(game, 'agente').mode).toBe('leaving');
    expect(threat(game, 'perito').mode).toBe('house');
    game.maze.dotsEaten = 29;
    game.step();
    expect(threat(game, 'perito').mode).toBe('house');
    game.maze.dotsEaten = 30;
    game.step();
    expect(threat(game, 'perito').mode).toBe('leaving');
    expect(threat(game, 'estagiario').mode).toBe('house');
    game.maze.dotsEaten = 60;
    game.step();
    expect(threat(game, 'estagiario').mode).toBe('leaving');
  });

  test('liberação por ociosidade após 4 s no nível 1', () => {
    const game = makeGame();
    play(game);
    parkPac(game);
    steps(game, 239);
    expect(threat(game, 'perito').mode).toBe('house');
    game.step();
    expect(threat(game, 'perito').mode).toBe('leaving');
    expect(threat(game, 'estagiario').mode).toBe('house');
    steps(game, 240);
    expect(threat(game, 'estagiario').mode).toBe('leaving');
  });

  test('limpar labirinto avança nível e restaura pontos', () => {
    const game = makeGame();
    play(game);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === 23 && c === 12) continue;
        game.maze.eat(c, r);
      }
    }
    expect(game.maze.dotsRemaining).toBe(1);
    stepUntil(game, () => game.phase === 'levelComplete');
    steps(game, 119);
    expect(game.phase).toBe('levelComplete');
    game.step();
    expect(game.phase).toBe('ready');
    expect(game.level).toBe(2);
    expect(game.maze.dotsRemaining).toBe(274);
    expect(game.fruit.kind).toBe('strawberry');
    expect(game.fugitivo.actor.pos).toEqual(START.fugitivo);
  });

  test('nível 21: energizer não assusta', () => {
    const game = makeGame();
    const pause = vi.spyOn(game.modeTimer, 'pause');
    game.level = 21;
    play(game);
    game.maze.eat(2, 23);
    placePac(game, 2.5, 23.5, 'left');
    stepUntil(game, () => game.score >= 50);
    expect(game.score).toBe(50);
    expect(game.frightFramesLeft).toBe(0);
    for (const g of game.threats) expect(g.frightened).toBe(false);
    expect(pause).not.toHaveBeenCalled();
  });

  test('nível 21: energizer reverte todos os fantasmas mesmo sem susto', () => {
    const game = makeGame();
    game.level = 21;
    play(game);
    const spies = game.threats.map((g) => vi.spyOn(g, 'reverse'));
    game.maze.eat(2, 23);
    placePac(game, 2.5, 23.5, 'left');
    stepUntil(game, () => game.score >= 50);
    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
    expect(game.frightFramesLeft).toBe(0);
    for (const g of game.threats) expect(g.frightened).toBe(false);
  });

  test('pausa não avança estado', () => {
    const game = makeGame();
    play(game);
    game.togglePause();
    expect(game.phase).toBe('paused');
    const pos = { ...game.fugitivo.actor.pos };
    const delegadoPos = { ...threat(game, 'delegado').actor.pos };
    steps(game, 100);
    expect(game.fugitivo.actor.pos).toEqual(pos);
    expect(threat(game, 'delegado').actor.pos).toEqual(delegadoPos);
    expect(game.phase).toBe('paused');
    game.togglePause();
    expect(game.phase).toBe('playing');
  });

  test('pausa em ready preserva phaseFramesLeft e retoma em ready', () => {
    const game = makeGame();
    steps(game, 20);
    game.pause();
    expect(game.phase).toBe('paused');
    steps(game, 50);
    expect(game.phaseFramesLeft).toBe(100);
    game.togglePause();
    expect(game.phase).toBe('ready');
    expect(game.phaseFramesLeft).toBe(100);
  });

  test('pausa em dying preserva phaseFramesLeft e retoma em dying', () => {
    const game = makeGame();
    play(game);
    parkPac(game);
    const agente = threat(game, 'agente');
    agente.mode = 'leaving';
    agente.actor.pos = { ...START.fugitivo };
    game.step();
    expect(game.phase).toBe('dying');
    steps(game, 10);
    const left = game.phaseFramesLeft;
    game.pause();
    steps(game, 200);
    expect(game.phase).toBe('paused');
    expect(game.phaseFramesLeft).toBe(left);
    game.togglePause();
    expect(game.phase).toBe('dying');
    expect(game.lives).toBe(3);
  });

  test('pausa em levelComplete preserva phaseFramesLeft e retoma em levelComplete', () => {
    const game = makeGame();
    play(game);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === 23 && c === 12) continue;
        game.maze.eat(c, r);
      }
    }
    stepUntil(game, () => game.phase === 'levelComplete');
    steps(game, 5);
    const left = game.phaseFramesLeft;
    game.pause();
    steps(game, 300);
    expect(game.phaseFramesLeft).toBe(left);
    game.togglePause();
    expect(game.phase).toBe('levelComplete');
    expect(game.level).toBe(1);
  });

  test('pausa em gameOver é ignorada', () => {
    const game = makeGame();
    play(game);
    parkPac(game);
    game.lives = 1;
    const agente = threat(game, 'agente');
    agente.mode = 'leaving';
    agente.actor.pos = { ...START.fugitivo };
    stepUntil(game, () => game.phase === 'gameOver');
    game.pause();
    expect(game.phase).toBe('gameOver');
    game.togglePause();
    expect(game.phase).toBe('gameOver');
  });

  test('pause é idempotente e não perde a fase de retomada', () => {
    const game = makeGame();
    play(game);
    game.pause();
    game.pause();
    expect(game.phase).toBe('paused');
    game.togglePause();
    expect(game.phase).toBe('playing');
  });

  function killPac(game: Game): void {
    parkPac(game);
    const agente = threat(game, 'agente');
    agente.mode = 'leaving';
    agente.actor.pos = { ...START.fugitivo };
    game.step();
    expect(game.phase).toBe('dying');
  }

  test('pausa durante dying: displayPhase fica dying e volta a coincidir com phase', () => {
    const game = makeGame();
    play(game);
    killPac(game);
    game.pause();
    expect(game.phase).toBe('paused');
    expect(game.displayPhase).toBe('dying');
    game.togglePause();
    expect(game.displayPhase).toBe(game.phase);
  });

  test('displayPhase === phase fora de pausa', () => {
    const game = makeGame();
    expect(game.displayPhase).toBe(game.phase);
    play(game);
    expect(game.displayPhase).toBe('playing');
  });

  test('restart durante pausa volta a ready com estado zerado e highScore mantido', () => {
    const game = makeGame({ highScore: 500 });
    play(game);
    stepUntil(game, () => game.score >= 30);
    game.lives = 1;
    game.pause();
    game.restart();
    expect(game.phase).toBe('ready');
    expect(game.displayPhase).toBe('ready');
    expect(game.score).toBe(0);
    expect(game.lives).toBe(3);
    expect(game.level).toBe(1);
    expect(game.maze.dotsRemaining).toBe(274);
    expect(game.popups).toEqual([]);
    expect(game.highScore).toBe(500);
  });

  test('restart em gameOver leva a ready', () => {
    const game = makeGame();
    play(game);
    game.lives = 1;
    killPac(game);
    stepUntil(game, () => game.phase === 'gameOver');
    game.restart();
    expect(game.phase).toBe('ready');
    expect(game.displayPhase).toBe('ready');
  });

  test('restart em dying leva a ready', () => {
    const game = makeGame();
    play(game);
    killPac(game);
    game.restart();
    expect(game.phase).toBe('ready');
    expect(game.displayPhase).toBe('ready');
  });

  test('morte durante o susto zera susto e combo', () => {
    const game = makeGame();
    play(game);
    eatLeftEnergizer(game);
    expect(game.frightFramesLeft).toBeGreaterThan(0);
    const delegado = threat(game, 'delegado');
    delegado.endFright();
    delegado.mode = 'chase';
    const pacTile = tileCenter(game);
    delegado.actor.pos = pacTile;
    game.step();
    expect(game.phase).toBe('dying');
    stepUntil(game, () => game.phase === 'ready');
    expect(game.lives).toBe(2);
    expect(game.frightFramesLeft).toBe(0);
    expect(game.threatsEatenThisFright).toBe(0);
    for (const g of game.threats) expect(g.frightened).toBe(false);
    // Timer novo e não pausado: o primeiro modo (scatter, 7 s) termina em 420 chamadas.
    expect(game.modeTimer.mode).toBe('scatter');
    for (let i = 0; i < 419; i++) expect(game.modeTimer.update()).toBeNull();
    expect(game.modeTimer.update()).toBe('reversed');
    expect(game.modeTimer.mode).toBe('chase');
  });

  test('novo nível zera dotsEaten e contadores de liberação', () => {
    const game = makeGame();
    play(game);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === 23 && c === 12) continue;
        game.maze.eat(c, r);
      }
    }
    stepUntil(game, () => game.phase === 'levelComplete');
    stepUntil(game, () => game.phase === 'ready');
    expect(game.level).toBe(2);
    expect(game.maze.dotsEaten).toBe(0);
    play(game);
    parkPac(game);
    game.step();
    expect(threat(game, 'perito').mode).toBe('leaving');
    game.maze.dotsEaten = 49;
    game.step();
    expect(threat(game, 'estagiario').mode).toBe('house');
    game.maze.dotsEaten = 50;
    game.step();
    expect(threat(game, 'estagiario').mode).toBe('leaving');
  });

  test('setDirection repassa ao fugitivo em ready e playing', () => {
    const game = makeGame();
    game.setDirection('right');
    expect(game.fugitivo.desired).toBe('right');
    play(game);
    game.setDirection('down');
    expect(game.fugitivo.desired).toBe('down');
    game.togglePause();
    game.setDirection('up');
    expect(game.fugitivo.desired).toBe('down');
  });

  test('phaseFramesLeft expõe o contador da fase e decresce a cada passo', () => {
    const game = makeGame();
    expect(game.phase).toBe('ready');
    expect(game.phaseFramesLeft).toBe(120);
    game.step();
    expect(game.phaseFramesLeft).toBe(119);
  });
});
