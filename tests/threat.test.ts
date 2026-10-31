import { describe, expect, test } from 'vitest';
import { Threat, type ThreatUpdateContext } from '../src/threat';
import { levelConfig } from '../src/levels';
import { Maze, START } from '../src/maze';
import { BASE_SPEED } from '../src/movement';

function makeCtx(extra: Partial<ThreatUpdateContext> = {}): ThreatUpdateContext {
  return {
    maze: new Maze(),
    level: levelConfig(1),
    globalMode: 'scatter',
    pac: { tile: { x: 13, y: 23 }, dir: 'left' },
    delegadoTile: { x: 13, y: 11 },
    dotsRemaining: 200,
    random: () => 0,
    ...extra,
  };
}

function run(threat: Threat, ctx: ThreatUpdateContext, frames: number): void {
  for (let i = 0; i < frames; i++) threat.update(ctx);
}

// Roda até o modo sair de `mode`, com limite de segurança.
function runWhile(threat: Threat, ctx: ThreatUpdateContext, mode: Threat['mode'], limit = 3000): number {
  let frames = 0;
  while (threat.mode === mode && frames < limit) {
    threat.update(ctx);
    frames++;
  }
  if (frames >= limit) throw new Error(`fantasma preso no modo ${mode}`);
  return frames;
}

function place(threat: Threat, x: number, y: number, dir: Threat['actor']['dir']): void {
  threat.actor.pos = { x, y };
  threat.actor.dir = dir;
}

describe('Threat', () => {
  test('delegado começa fora da casa indo à esquerda', () => {
    const delegado = new Threat('delegado');
    expect(delegado.actor.pos).toEqual(START.delegado);
    expect(delegado.actor.dir).toBe('left');
    expect(delegado.mode).toBe('scatter');
    expect(delegado.frightened).toBe(false);
  });

  test('agente, perito e estagiario começam na casa', () => {
    for (const name of ['agente', 'perito', 'estagiario'] as const) {
      const g = new Threat(name);
      expect(g.mode).toBe('house');
      expect(g.actor.pos).toEqual(START[name]);
    }
  });

  test('release só afeta fantasma na casa', () => {
    const delegado = new Threat('delegado');
    delegado.release();
    expect(delegado.mode).toBe('scatter');
    const agente = new Threat('agente');
    agente.release();
    expect(agente.mode).toBe('leaving');
  });

  test('perito quica na casa até release e depois sai pela porta', () => {
    const perito = new Threat('perito');
    const ctx = makeCtx({ globalMode: 'chase' });
    const ys = new Set<number>();
    for (let i = 0; i < 600; i++) {
      perito.update(ctx);
      expect(perito.actor.pos.y).toBeGreaterThanOrEqual(13.5);
      expect(perito.actor.pos.y).toBeLessThanOrEqual(15.5);
      expect(perito.actor.pos.x).toBe(13.5);
      ys.add(Math.round(perito.actor.pos.y * 10));
    }
    expect(perito.mode).toBe('house');
    expect(ys.has(135)).toBe(true);
    expect(ys.has(155)).toBe(true);

    perito.release();
    runWhile(perito, ctx, 'leaving');
    expect(perito.actor.pos.x).toBeCloseTo(15.5);
    expect(perito.actor.pos.y).toBeLessThan(11.6);
    expect(perito.actor.dir).toBe('left');
    expect(perito.mode).toBe('chase');
  });

  test('velocidade de túnel reduz', () => {
    const ctx = makeCtx();
    const inTunnel = new Threat('delegado');
    place(inTunnel, 3.5, 14.5, 'left');
    const outside = new Threat('delegado');
    place(outside, 10.5, 5.5, 'left');
    inTunnel.update(ctx);
    outside.update(ctx);
    expect(3.5 - inTunnel.actor.pos.x).toBeCloseTo(ctx.level.tunnelSpeed * BASE_SPEED, 6);
    expect(10.5 - outside.actor.pos.x).toBeCloseTo(ctx.level.threatSpeed * BASE_SPEED, 6);
  });

  test('modo segue o modo global em scatter/chase', () => {
    const delegado = new Threat('delegado');
    delegado.update(makeCtx({ globalMode: 'chase' }));
    expect(delegado.mode).toBe('chase');
  });

  test('reverse inverte direção no próximo centro', () => {
    const delegado = new Threat('delegado');
    const ctx = makeCtx();
    place(delegado, 10.6, 5.5, 'left');
    delegado.reverse();
    expect(delegado.actor.dir).toBe('left');
    run(delegado, ctx, 2);
    expect(delegado.actor.dir).toBe('right');
  });

  test('frighten inverte direção, usa velocidade frightened e random', () => {
    const ctx = makeCtx();
    const delegado = new Threat('delegado');
    place(delegado, 3.3, 5.5, 'right');
    delegado.frighten();
    expect(delegado.frightened).toBe(true);
    expect(delegado.mode).toBe('frightened');

    delegado.update(ctx);
    expect(delegado.actor.pos.x - 3.3).toBeCloseTo(ctx.level.threatFrightSpeed * BASE_SPEED, 6);
    run(delegado, ctx, 3);
    expect(delegado.actor.dir).toBe('left');

    // Junção (6,5) indo à esquerda: candidatos up, left, down.
    // Começa indo à direita antes de 7.5: inverte em (7,5) e sorteia em (6,5).
    const choose = (random: () => number): string => {
      const g = new Threat('delegado');
      place(g, 7.45, 5.5, 'right');
      g.frighten();
      run(g, makeCtx({ random }), 16);
      return g.actor.dir;
    };
    expect(choose(() => 0)).toBe('up');
    expect(choose(() => 0.99)).toBe('down');
  });

  test('frighten ignora fantasma em eyes', () => {
    const delegado = new Threat('delegado');
    delegado.eat();
    delegado.frighten();
    expect(delegado.mode).toBe('eyes');
    expect(delegado.frightened).toBe(false);
  });

  test('frighten na casa só marca a flag e continua quicando', () => {
    const agente = new Threat('agente');
    const ctx = makeCtx();
    agente.frighten();
    expect(agente.frightened).toBe(true);
    expect(agente.mode).toBe('house');
    const y0 = agente.actor.pos.y;
    agente.update(ctx);
    expect(agente.actor.pos.y).toBeCloseTo(y0 - 0.5 * BASE_SPEED, 6);
    expect(agente.actor.pos.x).toBe(START.agente.x);
  });

  test('endFright limpa a flag e volta ao modo global', () => {
    const delegado = new Threat('delegado');
    delegado.update(makeCtx({ globalMode: 'chase' }));
    delegado.frighten();
    delegado.endFright();
    expect(delegado.frightened).toBe(false);
    expect(delegado.mode).toBe('chase');

    const agente = new Threat('agente');
    agente.frighten();
    agente.endFright();
    expect(agente.frightened).toBe(false);
    expect(agente.mode).toBe('house');
  });

  test('eat -> eyes volta à casa e sai', () => {
    const delegado = new Threat('delegado');
    const ctx = makeCtx({ globalMode: 'chase' });
    place(delegado, 6.5, 5.5, 'left');
    delegado.frighten();
    delegado.eat();
    expect(delegado.mode).toBe('eyes');
    expect(delegado.frightened).toBe(false);

    let maxY = 0;
    let frames = 0;
    while (delegado.mode === 'eyes' && frames < 3000) {
      delegado.update(ctx);
      maxY = Math.max(maxY, delegado.actor.pos.y);
      frames++;
    }
    expect(delegado.mode).toBe('leaving');
    expect(delegado.actor.pos).toEqual({ x: 15.5, y: 14.5 });
    expect(maxY).toBeCloseTo(14.5);

    runWhile(delegado, ctx, 'leaving');
    expect(delegado.mode).toBe('chase');
    expect(delegado.frightened).toBe(false);
    expect(delegado.actor.pos.y).toBeCloseTo(11.5);
    expect(delegado.actor.dir).toBe('left');
  });

  test('eyes são rápidos (2x base)', () => {
    const delegado = new Threat('delegado');
    place(delegado, 10.5, 5.5, 'left');
    delegado.eat();
    delegado.update(makeCtx());
    const moved = Math.abs(delegado.actor.pos.x - 10.5) + Math.abs(delegado.actor.pos.y - 5.5);
    expect(moved).toBeCloseTo(2 * BASE_SPEED, 6);
  });

  test('elroy: delegado ganha velocidade com 20 pontos restantes no nível 1', () => {
    const speedWith = (dotsRemaining: number, name: 'delegado' | 'agente' = 'delegado'): number => {
      const g = new Threat(name);
      g.mode = 'scatter';
      place(g, 10.5, 5.5, 'left');
      g.update(makeCtx({ dotsRemaining }));
      return 10.5 - g.actor.pos.x;
    };
    expect(speedWith(200)).toBeCloseTo(0.75 * BASE_SPEED, 6);
    expect(speedWith(20)).toBeCloseTo(0.8 * BASE_SPEED, 6);
    expect(speedWith(10)).toBeCloseTo(0.85 * BASE_SPEED, 6);
    expect(speedWith(10, 'agente')).toBeCloseTo(0.75 * BASE_SPEED, 6);
  });

  test('elroy: delegado persegue o fugitivo mesmo em scatter', () => {
    const pickAt = (dotsRemaining: number): string => {
      const g = new Threat('delegado');
      place(g, 6.55, 5.5, 'left');
      g.update(makeCtx({ dotsRemaining, pac: { tile: { x: 6, y: 20 }, dir: 'left' } }));
      return g.actor.dir;
    };
    expect(pickAt(200)).toBe('up');
    expect(pickAt(20)).toBe('down');
  });

  test('reverse em house/leaving/eyes é ignorado', () => {
    const ctx = makeCtx();

    const perito = new Threat('perito');
    perito.reverse();
    perito.update(ctx);
    perito.release();
    perito.reverse();
    runWhile(perito, ctx, 'leaving');
    run(perito, ctx, 15);
    expect(perito.actor.dir).toBe('left');

    const delegado = new Threat('delegado');
    place(delegado, 6.5, 5.5, 'left');
    delegado.eat();
    delegado.reverse();
    runWhile(delegado, ctx, 'eyes');
    runWhile(delegado, ctx, 'leaving');
    run(delegado, ctx, 15);
    expect(delegado.actor.dir).toBe('left');
  });
});
