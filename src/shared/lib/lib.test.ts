import { afterEach, describe, expect, it, vi } from 'vitest';
import { cx } from './cx';
import { randomInt, shuffle } from './random';

afterEach(() => vi.restoreAllMocks());

describe('cx', () => {
  it('склеивает классы и пропускает ложные значения', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
  });
});

describe('randomInt', () => {
  it('включает обе границы', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(randomInt(3, 7)).toBe(3);
    vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    expect(randomInt(3, 7)).toBe(7);
  });

  it('не выходит за границы', () => {
    for (let i = 0; i < 500; i++) {
      const value = randomInt(-2, 2);
      expect(value).toBeGreaterThanOrEqual(-2);
      expect(value).toBeLessThanOrEqual(2);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});

describe('shuffle', () => {
  it('возвращает перестановку и не трогает исходный массив', () => {
    const items = [1, 2, 3, 4, 5];
    const result = shuffle(items);
    expect(result).not.toBe(items);
    expect(items).toEqual([1, 2, 3, 4, 5]);
    expect(result.toSorted()).toEqual(items);
  });
});
