import { describe, expect, test } from 'vitest';
import { levelConfig } from '../src/levels';
import { ModeTimer } from '../src/modeTimer';

describe('ModeTimer', () => {
  test('nível 1: scatter 420 frames, depois chase', () => {
    const t = new ModeTimer(levelConfig(1).modeSchedule);
    for (let i = 0; i < 419; i++) expect(t.update()).toBeNull();
    expect(t.mode).toBe('scatter');
    expect(t.update()).toBe('reversed');
    expect(t.mode).toBe('chase');
  });

  test('alterna de volta para scatter após chase', () => {
    const t = new ModeTimer([2, 3, Infinity]);
    expect([t.update(), t.update()]).toEqual([null, 'reversed']);
    expect([t.update(), t.update(), t.update()]).toEqual([null, null, 'reversed']);
    expect(t.mode).toBe('scatter');
  });

  test('pausado não avança', () => {
    const t = new ModeTimer([10, Infinity]);
    t.pause();
    for (let i = 0; i < 1000; i++) expect(t.update()).toBeNull();
    expect(t.mode).toBe('scatter');
    t.resume();
    for (let i = 0; i < 9; i++) expect(t.update()).toBeNull();
    expect(t.update()).toBe('reversed');
    expect(t.mode).toBe('chase');
  });

  test('último item Infinity fica em chase', () => {
    const t = new ModeTimer([1, Infinity]);
    expect(t.update()).toBe('reversed');
    for (let i = 0; i < 100000; i++) expect(t.update()).toBeNull();
    expect(t.mode).toBe('chase');
  });

  test('fase de 1 frame troca exatamente em um frame', () => {
    const t = new ModeTimer([1, 1, Infinity]);
    expect(t.update()).toBe('reversed');
    expect(t.mode).toBe('chase');
    expect(t.update()).toBe('reversed');
    expect(t.mode).toBe('scatter');
  });

  test('agenda completa do nível 1 termina em chase permanente', () => {
    const t = new ModeTimer(levelConfig(1).modeSchedule);
    let flips = 0;
    for (let i = 0; i < 10000; i++) if (t.update() === 'reversed') flips++;
    expect(flips).toBe(7);
    expect(t.mode).toBe('chase');
  });
});
