export type FruitKind = 'cherry' | 'strawberry' | 'orange' | 'apple' | 'melon' | 'galaxian' | 'bell' | 'key';

export type LevelConfig = {
  pacSpeed: number;
  pacFrightSpeed: number;
  threatSpeed: number;
  threatFrightSpeed: number;
  tunnelSpeed: number;
  elroy1Dots: number;
  elroy1Speed: number;
  elroy2Dots: number;
  elroy2Speed: number;
  frightSeconds: number;
  frightFlashes: number;
  modeSchedule: number[];
  fruit: FruitKind;
  releaseDots: { agente: number; perito: number; estagiario: number };
  idleReleaseSeconds: number;
};

export const FRUIT_POINTS: Record<FruitKind, number> = {
  cherry: 100,
  strawberry: 300,
  orange: 500,
  apple: 700,
  melon: 1000,
  galaxian: 2000,
  bell: 3000,
  key: 5000,
};

const FPS = 60;

// Índice 0 = nível 1; níveis acima de 19 usam 0.
const FRIGHT_SECONDS = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1];

type Speeds = Pick<
  LevelConfig,
  | 'pacSpeed' | 'pacFrightSpeed' | 'threatSpeed' | 'threatFrightSpeed' | 'tunnelSpeed'
  | 'elroy1Dots' | 'elroy1Speed' | 'elroy2Dots' | 'elroy2Speed'
>;

function speedsFor(level: number): Speeds {
  if (level === 1) {
    return { pacSpeed: 0.8, pacFrightSpeed: 0.9, threatSpeed: 0.75, threatFrightSpeed: 0.5, tunnelSpeed: 0.4, elroy1Dots: 20, elroy1Speed: 0.8, elroy2Dots: 10, elroy2Speed: 0.85 };
  }
  if (level <= 4) {
    return { pacSpeed: 0.9, pacFrightSpeed: 0.95, threatSpeed: 0.85, threatFrightSpeed: 0.55, tunnelSpeed: 0.45, elroy1Dots: 30, elroy1Speed: 0.9, elroy2Dots: 15, elroy2Speed: 0.95 };
  }
  if (level <= 20) {
    return { pacSpeed: 1, pacFrightSpeed: 1, threatSpeed: 0.95, threatFrightSpeed: 0.6, tunnelSpeed: 0.5, elroy1Dots: 40, elroy1Speed: 1, elroy2Dots: 20, elroy2Speed: 1.05 };
  }
  return { pacSpeed: 0.9, pacFrightSpeed: 0.9, threatSpeed: 0.95, threatFrightSpeed: 0.95, tunnelSpeed: 0.5, elroy1Dots: 40, elroy1Speed: 1, elroy2Dots: 20, elroy2Speed: 1.05 };
}

function frightFlashesFor(frightSeconds: number): number {
  if (frightSeconds >= 3) return 5;
  if (frightSeconds >= 1) return 3;
  return 0;
}

function fruitFor(level: number): FruitKind {
  if (level === 1) return 'cherry';
  if (level === 2) return 'strawberry';
  if (level <= 4) return 'orange';
  if (level <= 6) return 'apple';
  if (level <= 8) return 'melon';
  if (level <= 10) return 'galaxian';
  if (level <= 12) return 'bell';
  return 'key';
}

function scheduleFor(level: number): number[] {
  if (level === 1) return [7, 20, 7, 20, 5, 20, 5, Infinity].map((s) => s * FPS);
  // 1 frame (1/60 s) na última fase de scatter; Infinity * 60 continua Infinity.
  if (level <= 4) return [7 * FPS, 20 * FPS, 7 * FPS, 20 * FPS, 5 * FPS, 1033 * FPS, 1, Infinity];
  return [5 * FPS, 20 * FPS, 5 * FPS, 20 * FPS, 5 * FPS, 1037 * FPS, 1, Infinity];
}

function releaseDotsFor(level: number): LevelConfig['releaseDots'] {
  if (level === 1) return { agente: 0, perito: 30, estagiario: 60 };
  if (level === 2) return { agente: 0, perito: 0, estagiario: 50 };
  return { agente: 0, perito: 0, estagiario: 0 };
}

export function levelConfig(level: number): LevelConfig {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error(`levelConfig: nível inválido (${String(level)}); esperado inteiro >= 1`);
  }
  const frightSeconds = FRIGHT_SECONDS[level - 1] ?? 0;
  return {
    ...speedsFor(level),
    frightSeconds,
    frightFlashes: frightFlashesFor(frightSeconds),
    modeSchedule: scheduleFor(level),
    fruit: fruitFor(level),
    releaseDots: releaseDotsFor(level),
    idleReleaseSeconds: level <= 4 ? 4 : 3,
  };
}
