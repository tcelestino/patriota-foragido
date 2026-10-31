import { expect, test } from 'vitest';
import { bannerFor, gameOverMessage, levelLabel, pauseLabel, screenFor } from '../src/screens';

test('screens: screenFor', () => {
  expect(screenFor('ready', false)).toBe('start');
  expect(screenFor('playing', true)).toBe('none');
  expect(screenFor('gameOver', true)).toBe('gameOver');
});

test('screens: bannerFor', () => {
  expect(bannerFor('ready', true)).toBe('PRONTO!');
  expect(bannerFor('ready', false)).toBe('');
  expect(bannerFor('paused', true)).toBe('PAUSADO');
  expect(bannerFor('playing', true)).toBe('');
});

test('screens: mensagem de fim de jogo', () => {
  expect(gameOverMessage(500)).toContain('Fez 500 pontos.');
});

test('screens: pauseLabel', () => {
  expect(pauseLabel('paused')).toBe('RETOMAR');
  expect(pauseLabel('playing')).toBe('PAUSAR');
});

test('screens: levelLabel', () => {
  expect(levelLabel(1)).toBe('FASE 1');
  expect(levelLabel(12)).toBe('FASE 12');
});
