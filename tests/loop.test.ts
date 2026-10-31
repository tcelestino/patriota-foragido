import { describe, expect, test } from 'vitest';
import { FixedLoop } from '../src/loop';

describe('FixedLoop', () => {
  test('primeiro tick so inicializa o relogio', () => {
    let n = 0;
    const loop = new FixedLoop(() => n++);
    loop.tick(1000);
    expect(n).toBe(0);
  });

  test('1000 ms reais => 60 steps', () => {
    let n = 0;
    const loop = new FixedLoop(() => n++);
    loop.tick(0);
    for (let i = 1; i <= 60; i++) loop.tick((i * 1000) / 60);
    expect(n).toBe(60);
  });

  test('limita delta de aba oculta (5 s) a 100 ms => <= 6 steps', () => {
    let n = 0;
    const loop = new FixedLoop(() => n++);
    loop.tick(0);
    loop.tick(5000);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(6);
  });

  test('reset faz o proximo tick ser inicializador', () => {
    let n = 0;
    const loop = new FixedLoop(() => n++);
    loop.tick(0);
    loop.reset();
    loop.tick(5000);
    expect(n).toBe(0);
    loop.tick(5000 + 1000 / 60);
    expect(n).toBe(1);
  });
});
