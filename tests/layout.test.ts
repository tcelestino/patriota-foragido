import { describe, expect, test } from 'vitest';
import { computeLayout, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../src/layout';

describe('computeLayout', () => {
  test('dimensões lógicas: 32x31 tiles de 8 px', () => {
    expect(LOGICAL_WIDTH).toBe(256);
    expect(LOGICAL_HEIGHT).toBe(248);
  });

  test('1920x1080 dpr 1 com folga em largura: limitado pela altura, escala fracionária', () => {
    const l = computeLayout(1500, 900, 1);
    const fit = 900 / 248;
    expect(l.scale).toBeCloseTo(fit);
    expect(l.pixelHeight).toBe(Math.floor(248 * fit));
    expect(l.cssHeight).toBeLessThanOrEqual(900);
    expect(l.cssWidth).toBeLessThanOrEqual(1500);
    // Ocupa quase toda a altura disponível (sem perder até 1/4 como na escala inteira).
    expect(l.cssHeight).toBeGreaterThan(895);
  });

  test('janela estreita: limitado pela largura', () => {
    const l = computeLayout(400, 900, 1);
    expect(l.scale).toBeCloseTo(400 / 256);
    expect(l.cssWidth).toBeLessThanOrEqual(400);
    expect(l.cssWidth).toBeGreaterThan(398);
    expect(l.cssHeight).toBeLessThan(400);
  });

  test('celular 390x844 dpr 3: buffer em pixels físicos, css = buffer / dpr', () => {
    const l = computeLayout(390, 844, 3);
    expect(l.scale).toBeCloseTo((390 * 3) / 256);
    expect(l.cssWidth).toBeCloseTo(l.pixelWidth / 3);
    expect(l.cssHeight).toBeCloseTo(l.pixelHeight / 3);
    expect(l.cssWidth).toBeLessThanOrEqual(390);
    expect(l.cssHeight).toBeLessThanOrEqual(844);
  });

  test('o buffer mantém a proporção do labirinto', () => {
    const l = computeLayout(1234, 777, 2);
    expect(l.pixelWidth / l.pixelHeight).toBeCloseTo(256 / 248, 1);
  });

  test('nunca devolve tamanho zero, mesmo em viewport minúscula', () => {
    const l = computeLayout(0, 0, 1);
    expect(l.pixelWidth).toBeGreaterThanOrEqual(1);
    expect(l.pixelHeight).toBeGreaterThanOrEqual(1);
    expect(l.scale).toBeGreaterThan(0);
  });
});
