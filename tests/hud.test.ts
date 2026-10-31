import { expect, test } from 'vitest';
import { Game } from '../src/game';
import { formatRecord, formatScore, heartCount, passagens } from '../src/hud';

test('hud: formatScore com zeros a esquerda', () => {
  expect(formatScore(500)).toBe('00500');
  expect(formatScore(0)).toBe('00000');
  expect(formatScore(123450)).toBe('123450');
});

test('hud: formatRecord sem zeros', () => {
  expect(formatRecord(17950)).toBe('17950');
});

test('hud: heartCount', () => {
  expect(heartCount(3)).toBe(3);
  expect(heartCount(1)).toBe(1);
  expect(heartCount(0)).toBe(0);
});

test('hud: passagens', () => {
  expect(passagens(new Game())).toBe(274);
});
