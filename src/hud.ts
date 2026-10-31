import type { Game } from './game';

export function formatScore(n: number): string {
  return String(n).padStart(5, '0');
}

export function formatRecord(n: number): string {
  return String(n);
}

// Um coração por vida restante.
export function heartCount(lives: number): number {
  return Math.max(0, lives);
}

// Passagens (as bolinhas) que ainda faltam coletar na fase atual.
export function passagens(game: Game): number {
  return game.maze.dotsRemaining;
}
