import { useCallback, useEffect, useState } from 'react';
import { EMPTY_STATS } from '../constants';
import { readStats, writeStats } from '../model/stats';

/** Статистика игрока: читается из localStorage при монтировании и пишется туда при каждом изменении. */
export function usePlayerStats() {
  const [stats, setStats] = useState(readStats);

  useEffect(() => writeStats(stats), [stats]);

  const clear = useCallback(() => setStats(EMPTY_STATS), []);

  return { stats, update: setStats, clear };
}
