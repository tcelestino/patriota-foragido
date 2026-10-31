import { describe, expect, test } from 'vitest';
import { FRUIT_POINTS, levelConfig } from '../src/levels';

describe('levelConfig', () => {
  test('nível 1 valores', () => {
    const c = levelConfig(1);
    expect(c.pacSpeed).toBe(0.8);
    expect(c.threatSpeed).toBe(0.75);
    expect(c.frightSeconds).toBe(6);
    expect(c.elroy1Dots).toBe(20);
    expect(c.fruit).toBe('cherry');
  });

  test('nível 1 velocidades completas', () => {
    const c = levelConfig(1);
    expect(c).toMatchObject({
      pacFrightSpeed: 0.9, threatFrightSpeed: 0.5, tunnelSpeed: 0.4,
      elroy1Dots: 20, elroy1Speed: 0.8, elroy2Dots: 10, elroy2Speed: 0.85,
      frightFlashes: 5, idleReleaseSeconds: 4,
    });
  });

  test('nível 2 velocidades completas', () => {
    const c = levelConfig(2);
    expect(c).toMatchObject({
      pacSpeed: 0.9, pacFrightSpeed: 0.95, threatSpeed: 0.85, threatFrightSpeed: 0.55,
      tunnelSpeed: 0.45, elroy1Dots: 30, elroy1Speed: 0.9, elroy2Dots: 15, elroy2Speed: 0.95,
      frightSeconds: 5,
    });
  });

  test('nível 5 velocidades completas', () => {
    const c = levelConfig(5);
    expect(c).toMatchObject({
      pacSpeed: 1, pacFrightSpeed: 1, threatSpeed: 0.95, threatFrightSpeed: 0.6,
      tunnelSpeed: 0.5, elroy1Dots: 40, elroy1Speed: 1, elroy2Dots: 20, elroy2Speed: 1.05,
      frightSeconds: 2, idleReleaseSeconds: 3,
    });
  });

  test('nível 21+ velocidades', () => {
    for (const lvl of [21, 50]) {
      const c = levelConfig(lvl);
      expect(c).toMatchObject({
        pacSpeed: 0.9, pacFrightSpeed: 0.9, threatSpeed: 0.95, threatFrightSpeed: 0.95,
        tunnelSpeed: 0.5, elroy1Dots: 40, elroy1Speed: 1, elroy2Dots: 20, elroy2Speed: 1.05,
        frightSeconds: 0, frightFlashes: 0, fruit: 'key',
      });
    }
  });

  test('frightSeconds por nível', () => {
    const expected = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1, 0, 0];
    expected.forEach((s, i) => expect(levelConfig(i + 1).frightSeconds).toBe(s));
  });

  test('nível 17 e 19+ sem frightened', () => {
    expect(levelConfig(17).frightSeconds).toBe(0);
    expect(levelConfig(25).frightSeconds).toBe(0);
    expect(levelConfig(17).frightFlashes).toBe(0);
  });

  test('frightFlashes', () => {
    expect(levelConfig(1).frightFlashes).toBe(5);
    expect(levelConfig(3).frightFlashes).toBe(5);
    expect(levelConfig(4).frightFlashes).toBe(5);
    expect(levelConfig(5).frightFlashes).toBe(3);
    expect(levelConfig(9).frightFlashes).toBe(3);
    expect(levelConfig(19).frightFlashes).toBe(0);
  });

  test('fruta por nível', () => {
    const map: Record<number, string> = { 1: 'cherry', 2: 'strawberry', 3: 'orange', 4: 'orange', 5: 'apple', 6: 'apple', 7: 'melon', 8: 'melon', 9: 'galaxian', 10: 'galaxian', 11: 'bell', 12: 'bell', 13: 'key', 20: 'key' };
    for (const [l, f] of Object.entries(map)) expect(levelConfig(Number(l)).fruit).toBe(f);
  });

  test('releaseDots por nível', () => {
    expect(levelConfig(1).releaseDots).toEqual({ agente: 0, perito: 30, estagiario: 60 });
    expect(levelConfig(2).releaseDots).toEqual({ agente: 0, perito: 0, estagiario: 50 });
    expect(levelConfig(3).releaseDots).toEqual({ agente: 0, perito: 0, estagiario: 0 });
    expect(levelConfig(9).releaseDots).toEqual({ agente: 0, perito: 0, estagiario: 0 });
  });

  test('idleReleaseSeconds', () => {
    expect(levelConfig(4).idleReleaseSeconds).toBe(4);
    expect(levelConfig(5).idleReleaseSeconds).toBe(3);
  });

  test('modeSchedule em frames', () => {
    expect(levelConfig(1).modeSchedule).toEqual([420, 1200, 420, 1200, 300, 1200, 300, Infinity]);
    expect(levelConfig(2).modeSchedule).toEqual([420, 1200, 420, 1200, 300, 61980, 1, Infinity]);
    expect(levelConfig(4).modeSchedule).toEqual([420, 1200, 420, 1200, 300, 61980, 1, Infinity]);
    expect(levelConfig(5).modeSchedule).toEqual([300, 1200, 300, 1200, 300, 62220, 1, Infinity]);
    expect(levelConfig(30).modeSchedule).toEqual([300, 1200, 300, 1200, 300, 62220, 1, Infinity]);
  });

  test('retorna objeto novo a cada chamada', () => {
    const a = levelConfig(1);
    a.modeSchedule[0] = 1;
    a.releaseDots.perito = 99;
    expect(levelConfig(1).modeSchedule[0]).toBe(420);
    expect(levelConfig(1).releaseDots.perito).toBe(30);
  });

  test('nível inválido lança erro', () => {
    expect(() => levelConfig(0)).toThrow(/nível/);
    expect(() => levelConfig(-1)).toThrow();
    expect(() => levelConfig(1.5)).toThrow();
    expect(() => levelConfig(NaN)).toThrow();
  });

  test('FRUIT_POINTS', () => {
    expect(FRUIT_POINTS).toEqual({ cherry: 100, strawberry: 300, orange: 500, apple: 700, melon: 1000, galaxian: 2000, bell: 3000, key: 5000 });
  });
});
