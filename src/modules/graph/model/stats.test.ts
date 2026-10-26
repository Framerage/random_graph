import { describe, expect, it } from 'vitest';
import { EMPTY_STATS, LEVELS_COUNT } from '../constants';
import { parseStats, withAttempt, withMisses, withWin } from './stats';

const stats = { level: 2, attempts: 3, misses: 10, completedAt: null };

describe('parseStats', () => {
  it('читает сохранённую статистику', () => {
    expect(parseStats(JSON.stringify(stats))).toEqual(stats);
    expect(parseStats(JSON.stringify({ ...stats, completedAt: 5 }))).toEqual({ ...stats, completedAt: 5 });
  });

  it('пусто, битый JSON и неверные поля дают пустую статистику', () => {
    expect(parseStats(null)).toEqual(EMPTY_STATS);
    expect(parseStats('{oops')).toEqual(EMPTY_STATS);
    expect(parseStats(JSON.stringify({ ...stats, level: 0 }))).toEqual(EMPTY_STATS);
    expect(parseStats(JSON.stringify({ ...stats, level: LEVELS_COUNT + 1 }))).toEqual(EMPTY_STATS);
    expect(parseStats(JSON.stringify({ ...stats, misses: -1 }))).toEqual(EMPTY_STATS);
  });
});

describe('обновления', () => {
  it('попытка ставит уровень и считает старт', () => {
    expect(withAttempt(stats, 1)).toEqual({ ...stats, level: 1, attempts: 4 });
  });

  it('промахи складываются', () => {
    expect(withMisses(stats, 2).misses).toBe(12);
  });

  it('победа ведёт на следующий уровень, после последнего — на первый с датой', () => {
    expect(withWin(stats, 7)).toEqual({ ...stats, level: 3 });
    expect(withWin({ ...stats, level: LEVELS_COUNT }, 7)).toEqual({ ...stats, level: 1, completedAt: 7 });
  });
});
