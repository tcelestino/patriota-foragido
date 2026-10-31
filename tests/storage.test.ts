import { afterEach, beforeEach, expect, test, vi } from 'vitest';

type Storage_ = typeof import('../src/storage');
let storage: Storage_;

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  storage = await import('../src/storage');
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('storage: salva e le', () => {
  expect(storage.loadHighScore()).toBe(0);
  storage.saveHighScore(1200);
  expect(storage.loadHighScore()).toBe(1200);
  expect(localStorage.getItem('patriota-foragido:high-score')).toBe('1200');
});

test('storage: valor invalido vira 0', () => {
  localStorage.setItem('patriota-foragido:high-score', 'abc');
  expect(storage.loadHighScore()).toBe(0);
  localStorage.setItem('patriota-foragido:high-score', '-5');
  expect(storage.loadHighScore()).toBe(0);
});

test('storage: localStorage lancando excecao nao propaga e mantem em memoria', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('denied');
  });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied');
  });
  expect(() => storage.saveHighScore(500)).not.toThrow();
  expect(storage.loadHighScore()).toBe(500);
});
