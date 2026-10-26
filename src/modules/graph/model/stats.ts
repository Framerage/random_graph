import { EMPTY_STATS, LEVELS_COUNT, STATS_KEY } from '../constants';
import type { PlayerStats } from '../types';

const isCount = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0;

/** Статистика из сырой строки localStorage; битые или чужие данные дают пустую статистику. */
export function parseStats(raw: string | null): PlayerStats {
  if (!raw) return EMPTY_STATS;
  try {
    const value = JSON.parse(raw) as Partial<PlayerStats>;
    const { level, attempts, misses, completedAt } = value;
    if (!isCount(level) || level < 1 || level > LEVELS_COUNT || !isCount(attempts) || !isCount(misses)) {
      return EMPTY_STATS;
    }
    return { level, attempts, misses, completedAt: typeof completedAt === 'number' ? completedAt : null };
  } catch {
    return EMPTY_STATS;
  }
}

export function readStats(): PlayerStats {
  try {
    return parseStats(localStorage.getItem(STATS_KEY));
  } catch {
    return EMPTY_STATS;
  }
}

export function writeStats(stats: PlayerStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* localStorage может быть недоступен — не критично */
  }
}

/** Старт попытки уровня level. */
export const withAttempt = (stats: PlayerStats, level: number): PlayerStats => ({
  ...stats,
  level,
  attempts: stats.attempts + 1,
});

export const withMisses = (stats: PlayerStats, count: number): PlayerStats => ({
  ...stats,
  misses: stats.misses + count,
});

/** Уровень пройден: продолжаем со следующего, а после последнего — заново с первого и запоминаем дату. */
export const withWin = (stats: PlayerStats, at: number): PlayerStats =>
  stats.level < LEVELS_COUNT ? { ...stats, level: stats.level + 1 } : { ...stats, level: 1, completedAt: at };
