import { describe, expect, test, vi } from 'vitest';
import { Game } from '../src/game';
import { Session } from '../src/session';

function setup(): { game: Game; session: Session; resetClock: ReturnType<typeof vi.fn> } {
  const game = new Game({ random: () => 0, highScore: 500 });
  const resetClock = vi.fn();
  const session = new Session(game, resetClock);
  return { game, session, resetClock };
}

describe('Session', () => {
  test('togglePause antes de start é no-op: game.phase continua ready e resetClock não é chamado', () => {
    const { game, session, resetClock } = setup();
    session.togglePause();
    expect(game.phase).toBe('ready');
    expect(resetClock).not.toHaveBeenCalled();
  });

  test('start marca started e reseta o relógio uma vez', () => {
    const { session, resetClock } = setup();
    expect(session.started).toBe(false);
    session.start();
    expect(session.started).toBe(true);
    expect(resetClock).toHaveBeenCalledTimes(1);
  });

  test('primary antes de iniciar inicia', () => {
    const { session, resetClock } = setup();
    session.primary();
    expect(session.started).toBe(true);
    expect(resetClock).toHaveBeenCalledTimes(1);
  });

  test('primary em gameOver reinicia', () => {
    const { game, session } = setup();
    session.start();
    game.score = 120;
    game.phase = 'gameOver';
    session.primary();
    expect(game.phase).toBe('ready');
    expect(game.score).toBe(0);
  });

  test('primary pausado retoma', () => {
    const { game, session, resetClock } = setup();
    session.start();
    game.phase = 'playing';
    game.pause();
    resetClock.mockClear();
    session.primary();
    expect(game.phase).toBe('playing');
    expect(resetClock).toHaveBeenCalledTimes(1);
  });

  test('primary jogando não faz nada', () => {
    const { game, session, resetClock } = setup();
    session.start();
    game.phase = 'playing';
    resetClock.mockClear();
    session.primary();
    expect(game.phase).toBe('playing');
    expect(resetClock).not.toHaveBeenCalled();
  });

  test.each(['paused', 'gameOver', 'initial'] as const)(
    'restart a partir de %s deixa partida nova e preserva highScore',
    (from) => {
      const { game, session } = setup();
      if (from !== 'initial') {
        session.start();
        game.score = 90;
        game.lives = 1;
        if (from === 'paused') {
          game.phase = 'playing';
          game.pause();
        } else {
          game.phase = 'gameOver';
        }
      }
      session.restart();
      expect(session.started).toBe(true);
      expect(game.phase).toBe('ready');
      expect(game.score).toBe(0);
      expect(game.lives).toBe(3);
      expect(game.highScore).toBe(500);
    },
  );

  test('pauseForBackground antes de start não pausa mas reseta o relógio; depois de start pausa', () => {
    const { game, session, resetClock } = setup();
    session.pauseForBackground();
    expect(game.phase).toBe('ready');
    expect(resetClock).toHaveBeenCalledTimes(1);
    session.start();
    session.pauseForBackground();
    expect(game.phase).toBe('paused');
    expect(resetClock).toHaveBeenCalledTimes(3);
  });

  test('togglePause em gameOver é no-op', () => {
    const { game, session, resetClock } = setup();
    session.start();
    game.phase = 'gameOver';
    resetClock.mockClear();
    session.togglePause();
    expect(game.phase).toBe('gameOver');
    expect(resetClock).not.toHaveBeenCalled();
  });
});
