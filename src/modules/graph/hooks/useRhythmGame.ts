import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { EMPTY_SCORE, GAP_X, GAP_Y, LAG_COLUMNS, LANE_CODES, LANE_KEYS, LANES_CENTER_Y, zoneX } from '../constants';
import { now } from '../model/clock';
import { addJudges, applyJudges, noteInZone, passedNotes } from '../model/judge';
import type { Flash, Judge, Judges, OrbNode, Score } from '../types';

/**
 * Игра: камера едет вправо, ноты проходят через зону попадания в центре экрана.
 * startedAt — момент старта по игровым часам, null — игра не идёт.
 * На паузе (paused) камера стоит, промахи не засчитываются, клавиши не слушаются.
 * Возвращает узлы с проставленными результатами, счёт и масштаб камеры в игре.
 */
export function useRhythmGame(nodes: OrbNode[], startedAt: number | null, paused: boolean) {
  const { setViewport } = useReactFlow();

  // Результаты по нотам. Ref — чтобы в пределах одного кадра не засчитать ноту дважды, стейт — для отрисовки.
  const judgesRef = useRef<Judges>({});
  const [judges, setJudges] = useState<Judges>({});
  const [score, setScore] = useState<Score>(EMPTY_SCORE);
  const [flash, setFlash] = useState<Flash | null>(null);

  const judgedNodes = useMemo(() => applyJudges(nodes, judges), [nodes, judges]);

  // Масштаб в игре: по ширине помещается окно от зоны до нового столбца в обе стороны, по высоте — все дорожки
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  const zoom = Math.min(width / ((2 * LAG_COLUMNS + 1) * GAP_X), height / ((LANE_KEYS.length + 1.5) * GAP_Y), 1.2);

  const judgeNotes = (ids: string[], judge: Judge) => {
    if (ids.length === 0) return;
    judgesRef.current = addJudges(judgesRef.current, nodes, ids, judge);
    setJudges(judgesRef.current);
    setScore((s) => (judge === 'hit' ? { ...s, hits: s.hits + ids.length } : { ...s, misses: s.misses + ids.length }));
  };

  // Effect Events видят свежие узлы, размеры и startedAt, поэтому цикл и слушатель
  // не пересоздаются ни на каждый новый столбец, ни на ресайз — только при старте и паузе.

  /** Кадр игры: двигаем камеру с постоянной скоростью и засчитываем промахи по нотам, которые проехали зону. */
  const onFrame = useEffectEvent(() => {
    if (startedAt === null) return;
    const x = zoneX(now() - startedAt);
    setViewport({ x: width / 2 - x * zoom, y: height / 2 - LANES_CENTER_Y * zoom, zoom });
    judgeNotes(passedNotes(nodes, judgesRef.current, x), 'miss');
  });

  /** Клавиши W A S D: попал, если на этой дорожке в зоне есть нота. */
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const lane = LANE_CODES.indexOf(event.code);
    if (startedAt === null || lane < 0 || event.repeat) return;
    event.preventDefault();
    const target = noteInZone(nodes, judgesRef.current, lane, zoneX(now() - startedAt));
    if (target) judgeNotes([target.id], 'hit');
    else setScore((s) => ({ ...s, wrong: s.wrong + 1 }));
    setFlash({ lane, ok: Boolean(target), at: performance.now() });
  });

  const running = startedAt !== null && !paused;

  useEffect(() => {
    if (!running) return;
    let frame = requestAnimationFrame(function tick() {
      onFrame();
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const controller = new AbortController();
    window.addEventListener('keydown', (event) => onKeyDown(event), { signal: controller.signal });
    return () => controller.abort();
  }, [running]);

  const reset = useCallback(() => {
    judgesRef.current = {};
    setJudges({});
    setScore(EMPTY_SCORE);
    setFlash(null);
  }, []);

  return { nodes: judgedNodes, score, flash, zoom, reset };
}
