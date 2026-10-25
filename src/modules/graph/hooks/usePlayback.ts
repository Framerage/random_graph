import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch } from 'react';
import { playRow, resumeAudio, suspendAudio, unlockAudio } from '@/shared/audio';
import { LAG_COLUMNS, ROW_DELAY } from '../constants';
import { now, pauseClock, resumeClock } from '../model/clock';
import { soundColumns } from '../model/notes';
import type { Plan, TreeAction } from '../types';

/** Отложенное действие игры: at — момент по игровым часам, timer — текущий setTimeout. */
type Task = { at: number; fire: () => void; timer?: number };

const arm = (task: Task) => {
  task.timer = window.setTimeout(task.fire, task.at - now());
};
const disarm = (task: Task) => clearTimeout(task.timer);

/**
 * Проигрывание плана с нуля: рост дерева по столбцам и звук по расписанию.
 * startedAt — момент старта по игровым часам, пока план играет; иначе null.
 * На паузе таймеры снимаются, а при продолжении ставятся заново на остаток времени.
 */
export function usePlayback(dispatch: Dispatch<TreeAction>) {
  // Ещё не сработавшие задачи
  const tasksRef = useRef<Task[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const stop = useCallback(() => {
    tasksRef.current.forEach(disarm);
    tasksRef.current = [];
    resumeClock();
    resumeAudio();
    setIsPaused(false);
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
      const start = now();
      setStartedAt(start);

      const tasks: Task[] = [];
      const schedule = (delay: number, run: () => void) => {
        const task: Task = {
          at: start + delay,
          fire: () => {
            tasksRef.current = tasksRef.current.filter((t) => t !== task);
            run();
          },
        };
        tasks.push(task);
      };
      plan.forEach((steps, index) =>
        schedule(index * ROW_DELAY, () => dispatch({ type: 'expandMany', steps, at: now() })),
      );
      // Столбец d звучит, когда проходит центр зоны: музыка совпадает с моментом нажатия
      columns.forEach((notes, depth) => schedule((depth + LAG_COLUMNS) * ROW_DELAY, () => playRow(notes)));
      // Игра заканчивается, когда последний столбец проехал зону
      schedule((plan.length + LAG_COLUMNS + 1) * ROW_DELAY, () => setStartedAt(null));

      tasksRef.current = tasks;
      tasks.forEach(arm);
    },
    [stop, dispatch],
  );

  /** Пауза и продолжение: стоят часы, расписание, звук и CSS-анимации (их гасит data-paused на канвасе). */
  const togglePause = useCallback(() => {
    if (startedAt === null) return;
    if (isPaused) {
      resumeClock();
      resumeAudio();
      tasksRef.current.forEach(arm);
    } else {
      tasksRef.current.forEach(disarm);
      pauseClock();
      suspendAudio();
    }
    setIsPaused(!isPaused);
  }, [startedAt, isPaused]);

  return { startedAt, isPlaying: startedAt !== null, isPaused, play, stop, togglePause };
}
