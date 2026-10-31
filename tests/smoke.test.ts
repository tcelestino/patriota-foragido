import { OPPOSITE, DIR_VEC } from '../src/types';

test('OPPOSITE inverte e DIR_VEC é consistente', () => {
  expect(OPPOSITE.up).toBe('down');
  expect(DIR_VEC.left).toEqual({ x: -1, y: 0 });
});
