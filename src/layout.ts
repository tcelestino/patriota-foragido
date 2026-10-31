import { COLS, ROWS } from './maze';

// Cada tile do labirinto tem 8 px lógicos.
export const TILE_SIZE = 8;
export const LOGICAL_WIDTH = COLS * TILE_SIZE;
export const LOGICAL_HEIGHT = ROWS * TILE_SIZE;

export interface Layout {
  cssWidth: number;
  cssHeight: number;
  pixelWidth: number;
  pixelHeight: number;
  scale: number;
}

// Os personagens e as paredes são vetoriais, então o campo cresce com qualquer escala
// (não só as inteiras) e ocupa o máximo do espaço disponível.
// `scale` é quantos pixels físicos do buffer correspondem a um pixel lógico.
export function computeLayout(viewportW: number, viewportH: number, dpr: number): Layout {
  const fit = Math.max(0.1, Math.min((viewportW * dpr) / LOGICAL_WIDTH, (viewportH * dpr) / LOGICAL_HEIGHT));
  const pixelWidth = Math.max(1, Math.floor(LOGICAL_WIDTH * fit));
  const pixelHeight = Math.max(1, Math.floor(LOGICAL_HEIGHT * fit));
  return { cssWidth: pixelWidth / dpr, cssHeight: pixelHeight / dpr, pixelWidth, pixelHeight, scale: fit };
}
