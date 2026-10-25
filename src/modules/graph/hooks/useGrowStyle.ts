import { useState } from 'react';
import type { CSSProperties } from 'react';
import { now } from '../model/clock';

/**
 * Стиль анимации, «замороженный» на момент монтирования.
 * Узлы и ветки перемонтируются (onlyRenderVisibleElements, панорамирование),
 * поэтому анимация не стартует с нуля, а продолжается с того места, где должна быть
 * по bornAt. Если она уже закончилась — просто выключаем её.
 * Время — игровое: паузы в него не входят.
 */
export function useGrowStyle(bornAt: number, delay: number, duration: number): CSSProperties {
  const [style] = useState<CSSProperties>(() => {
    const elapsed = now() - bornAt;
    if (elapsed >= delay + duration) return { animation: 'none' };
    return { animationDelay: `${delay - elapsed}ms`, animationDuration: `${duration}ms` };
  });
  return style;
}
