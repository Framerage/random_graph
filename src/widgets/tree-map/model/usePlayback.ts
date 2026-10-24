import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { ROW_DELAY, soundColumns } from '@/entities/tree';
import type { Plan, TreeAction } from '@/entities/tree';
import { LAG_COLUMNS } from '@/features/rhythm-game';
import { playRow, unlockAudio } from '@/shared/audio';

/**
 * Проигрывание плана с нуля: рост дерева по столбцам и звук по таймерам.
 * startedAt — момент старта (performance.now()), пока план играет; иначе null.
 */
export function usePlayback(dispatch: Dispatch<TreeAction>) {
  const timersRef = useRef<number[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const stop = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setStartedAt(null);
  }, []);

  // Чистим таймеры при уходе со страницы
  useEffect(() => stop, [stop]);

  const play = useCallback(
    (plan: Plan) => {
      stop();
      dispatch({ type: 'reset' });

      // План считается заранее, а столбцы дорисовываются по одному: ветки столбца растут
      // ROW_DELAY мс, и как только они дотянулись до детей, начинает расти следующий столбец.
      // Первый столбец тоже идёт через таймер, чтобы сброс успел отрисоваться отдельно
      // и узлы с теми же id смонтировались заново (иначе анимация не запустится).
      // План известен заранее — по нему раскладываем ноты по столбцам
      const columns = soundColumns(plan);
      unlockAudio();
      setStartedAt(performance.now());
      timersRef.current = plan.map((steps, index) =>
        window.setTimeout(() => dispatch({ type: 'expandMany', steps, at: performance.now() }), index * ROW_DELAY),
      );
      // Столбец d звучит, когда проходит центр зоны: музыка совпадает с моментом нажатия
      columns.forEach((notes, depth) =>
        timersRef.current.push(window.setTimeout(() => playRow(notes), (depth + LAG_COLUMNS) * ROW_DELAY)),
      );
      // Игра заканчивается, когда последний столбец проехал зону
      timersRef.current.push(window.setTimeout(() => setStartedAt(null), (plan.length + LAG_COLUMNS + 1) * ROW_DELAY));
    },
    [stop, dispatch],
  );

  return { startedAt, isPlaying: startedAt !== null, play, stop };
}
