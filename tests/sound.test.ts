import { afterEach, beforeEach, expect, test, vi } from 'vitest';

type Sound_ = typeof import('../src/sound');
let sound: Sound_;

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  sound = await import('../src/sound');
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('sound: padrao ligado', () => {
  expect(sound.loadSoundEnabled()).toBe(true);
});

test('sound: salva e le', () => {
  sound.saveSoundEnabled(false);
  expect(sound.loadSoundEnabled()).toBe(false);
  expect(localStorage.getItem('patriota-foragido:sound')).toBe('false');
});

test('sound: localStorage lancando excecao nao propaga e mantem em memoria', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('denied');
  });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('denied');
  });
  expect(() => sound.saveSoundEnabled(false)).not.toThrow();
  expect(sound.loadSoundEnabled()).toBe(false);
});

test('sound: soundLabel', () => {
  expect(sound.soundLabel(true)).toBe('SOM: LIGADO');
  expect(sound.soundLabel(false)).toBe('SOM: DESLIGADO');
});
