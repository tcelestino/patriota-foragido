import type { Phase } from './game';

export type Screen = 'start' | 'none' | 'gameOver';

export function screenFor(phase: Phase, started: boolean): Screen {
  if (!started) return 'start';
  if (phase === 'gameOver') return 'gameOver';
  return 'none';
}

export function bannerFor(phase: Phase, started: boolean): string {
  if (started && phase === 'ready') return 'PRONTO!';
  if (phase === 'paused') return 'PAUSADO';
  return '';
}

export function gameOverMessage(score: number): string {
  return `Os agentes alcançaram você. Fez ${score} pontos. Tentar outra rota?`;
}

export function pauseLabel(phase: Phase): string {
  return phase === 'paused' ? 'RETOMAR' : 'PAUSAR';
}

export function levelLabel(level: number): string {
  return `FASE ${level}`;
}
