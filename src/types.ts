export type Dir = 'up' | 'left' | 'down' | 'right';
export type Vec = { x: number; y: number };
export type ThreatName = 'delegado' | 'agente' | 'perito' | 'estagiario';
export type ThreatMode = 'house' | 'leaving' | 'scatter' | 'chase' | 'frightened' | 'eyes';

export const DIR_VEC: Record<Dir, Vec> = {
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Record<Dir, Dir> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};
