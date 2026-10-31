import { afterEach, expect, test, vi } from 'vitest';
import { PLANE_PALETTE, PLANE_ROWS, paintPlane } from '../src/plane';

afterEach(() => {
  vi.restoreAllMocks();
});

// Conta os pixels não transparentes do mapa.
function opaqueCount(): number {
  return PLANE_ROWS.join('').replace(/\./g, '').length;
}

test('PLANE_ROWS tem linhas de mesmo comprimento, 24 <= largura <= 48', () => {
  expect(PLANE_ROWS.length).toBeGreaterThan(0);
  const width = PLANE_ROWS[0].length;
  for (const row of PLANE_ROWS) expect(row.length).toBe(width);
  expect(width).toBeGreaterThanOrEqual(24);
  expect(width).toBeLessThanOrEqual(48);
});

test("todo caractere de PLANE_ROWS é '.' ou existe em PLANE_PALETTE", () => {
  for (const row of PLANE_ROWS) {
    for (const ch of row) {
      if (ch === '.') continue;
      expect(PLANE_PALETTE[ch], `caractere sem cor: ${ch}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  }
});

test('PLANE_PALETTE contém um tom vermelho (aviso de cancelado) usado ao menos uma vez em PLANE_ROWS', () => {
  const isRed = (hex: string): boolean => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r >= 200 && g <= 90 && b <= 90;
  };
  const redChars = Object.keys(PLANE_PALETTE).filter((ch) => isRed(PLANE_PALETTE[ch]));
  expect(redChars.length).toBeGreaterThan(0);
  const used = PLANE_ROWS.some((row) => redChars.some((ch) => row.includes(ch)));
  expect(used).toBe(true);
});

test('paintPlane com canvas e contexto stubados define width/height = cols*pixel, rows*pixel e chama fillRect uma vez por pixel não transparente', () => {
  const fillRect = vi.fn();
  const ctx = { fillRect, fillStyle: '', imageSmoothingEnabled: true } as unknown as CanvasRenderingContext2D;
  const canvas = { width: 0, height: 0, getContext: vi.fn(() => ctx) } as unknown as HTMLCanvasElement;
  const pixel = 4;

  paintPlane(canvas, pixel);

  expect(canvas.width).toBe(PLANE_ROWS[0].length * pixel);
  expect(canvas.height).toBe(PLANE_ROWS.length * pixel);
  expect(ctx.imageSmoothingEnabled).toBe(false);
  expect(fillRect).toHaveBeenCalledTimes(opaqueCount());
  expect(fillRect).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), pixel, pixel);
});

test('paintPlane lança erro descritivo quando o canvas não fornece contexto 2d', () => {
  const canvas = { width: 0, height: 0, getContext: vi.fn(() => null) } as unknown as HTMLCanvasElement;
  expect(() => paintPlane(canvas, 4)).toThrow(/contexto 2d/);
});
