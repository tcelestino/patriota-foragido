import { describe, expect, test } from 'vitest';
import { Game } from '../src/game';
import { fugitivoPose } from '../src/render';

describe('fugitivoPose', () => {
  test('jogando, os passos alternam com o passar dos quadros', () => {
    const game = new Game({ random: () => 0 });
    game.phase = 'playing';
    game.fugitivo.stopped = false;
    expect(fugitivoPose(game, 0).stride).not.toBe(fugitivoPose(game, 6).stride);
    expect(fugitivoPose(game, 0).fall).toBe(0);
  });

  test('pausado durante o jogo, os passos congelam', () => {
    const game = new Game({ random: () => 0 });
    game.phase = 'playing';
    game.fugitivo.stopped = false;
    game.pause();
    expect(game.displayPhase).toBe('playing');
    expect(fugitivoPose(game, 0)).toEqual(fugitivoPose(game, 6));
  });

  test('parado na parede, fica em pé', () => {
    const game = new Game({ random: () => 0 });
    game.phase = 'playing';
    game.fugitivo.stopped = true;
    expect(fugitivoPose(game, 0)).toEqual({ stride: 0, fall: 0 });
  });
});
