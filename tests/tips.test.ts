import { expect, test } from 'vitest';
import { TIPS, tipForLevel } from '../src/tips';

test('tips: uma dica por fase, voltando ao início depois da última', () => {
  expect(tipForLevel(1)).toBe(TIPS[0]);
  expect(tipForLevel(2)).toBe(TIPS[1]);
  expect(tipForLevel(TIPS.length)).toBe(TIPS[TIPS.length - 1]);
  expect(tipForLevel(TIPS.length + 1)).toBe(TIPS[0]);
});

test('tips: níveis inválidos não quebram', () => {
  expect(tipForLevel(0)).toBe(TIPS[0]);
  expect(tipForLevel(-3)).toBe(TIPS[0]);
});

test('tips: textos não vazios e sem emoji', () => {
  for (const t of TIPS) {
    expect(t.length).toBeGreaterThan(20);
    expect(t).not.toMatch(/\p{Extended_Pictographic}/u);
  }
});
