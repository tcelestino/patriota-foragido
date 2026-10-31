import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ENERGIZER_URL, loadEnergizer } from '../src/energizer';

// jsdom não carrega imagens: o Image falso dispara onload ou onerror conforme a URL.
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  set src(value: string) {
    queueMicrotask(() => (value.includes('nao-existe') ? this.onerror?.() : this.onload?.()));
  }
}

beforeEach(() => {
  vi.stubGlobal('Image', FakeImage);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('energizer: aponta para o PNG em public/assets', () => {
  expect(ENERGIZER_URL).toBe('/assets/bolas.png');
});

test('energizer: imagem válida resolve com o elemento', async () => {
  expect(await loadEnergizer('/assets/bolas.png')).toBeInstanceOf(FakeImage);
});

test('energizer: falha ao carregar resolve com null, sem rejeitar', async () => {
  expect(await loadEnergizer('/nao-existe.png')).toBeNull();
  expect(console.warn).toHaveBeenCalled();
});
