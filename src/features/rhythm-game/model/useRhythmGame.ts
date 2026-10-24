import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { GAP_X, GAP_Y, LANE_KEYS, NODE_SIZE } from '@/entities/tree';
import type { Judge, OrbNode } from '@/entities/tree';
import { LAG_COLUMNS, LANE_CODES, LANES_CENTER_Y, ZONE_WIDTH, zoneX } from '../config';
import { EMPTY_SCORE } from './types';
import type { Flash, Score } from './types';

/**
 * Игра: камера едет вправо, ноты проходят через зону попадания в центре экрана.
 * startedAt — момент старта (performance.now()), null — игра не идёт.
 * Возвращает узлы с проставленными результатами, счёт и масштаб камеры в игре.
 */
export function useRhythmGame(nodes: OrbNode[], startedAt: number | null) {
  const { setViewport } = useReactFlow();
  const isPlaying = startedAt !== null;

  // Результаты по нотам. Ref — для обработчиков, стейт — для отрисовки.
  const judgesRef = useRef<Record<string, Judge>>({});
  const [judges, setJudges] = useState<Record<string, Judge>>({});
  const [score, setScore] = useState<Score>(EMPTY_SCORE);
  const [flash, setFlash] = useState<Flash | null>(null);
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const judgeNotes = useCallback((ids: string[], judge: Judge) => {
    if (ids.length === 0) return;
    // Заодно выкидываем результаты узлов, которые окно уже удалило: память не растёт
    const alive = new Set(nodesRef.current.map((node) => node.id));
    const next: Record<string, Judge> = {};
    for (const [id, value] of Object.entries(judgesRef.current)) if (alive.has(id)) next[id] = value;
    for (const id of ids) next[id] = judge;
    judgesRef.current = next;
    setJudges(next);
    setScore((s) => (judge === 'hit' ? { ...s, hits: s.hits + ids.length } : { ...s, misses: s.misses + ids.length }));
  }, []);

  const judgedNodes = useMemo(
    () => nodes.map((node) => (judges[node.id] ? { ...node, data: { ...node.data, judge: judges[node.id] } } : node)),
    [nodes, judges],
  );

  // Масштаб в игре: по ширине помещается окно от зоны до нового столбца в обе стороны, по высоте — все дорожки
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  const zoom = Math.min(width / ((2 * LAG_COLUMNS + 1) * GAP_X), height / ((LANE_KEYS.length + 1.5) * GAP_Y), 1.2);

  // Игровой цикл: каждый кадр двигаем камеру с постоянной скоростью и засчитываем промахи
  // по нотам, которые уже проехали зону
  useEffect(() => {
    if (startedAt === null) return;
    let frame = 0;
    const tick = () => {
      const x = zoneX(performance.now() - startedAt);
      setViewport({ x: width / 2 - x * zoom, y: height / 2 - LANES_CENTER_Y * zoom, zoom });
      const passed = nodesRef.current.filter(
        (node) =>
          node.data.note && !judgesRef.current[node.id] && node.position.x + NODE_SIZE / 2 < x - ZONE_WIDTH / 2,
      );
      judgeNotes(
        passed.map((node) => node.id),
        'miss',
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [startedAt, width, height, zoom, setViewport, judgeNotes]);

  // Клавиши W A S D: попал, если на этой дорожке в зоне есть нота
  useEffect(() => {
    if (startedAt === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const lane = LANE_CODES.indexOf(event.code);
      if (lane < 0 || event.repeat) return;
      event.preventDefault();
      const x = zoneX(performance.now() - startedAt);
      const target = nodesRef.current.find(
        (node) =>
          node.data.note &&
          node.data.lane === lane &&
          !judgesRef.current[node.id] &&
          Math.abs(node.position.x + NODE_SIZE / 2 - x) <= ZONE_WIDTH / 2,
      );
      if (target) judgeNotes([target.id], 'hit');
      else setScore((s) => ({ ...s, wrong: s.wrong + 1 }));
      setFlash({ lane, ok: Boolean(target), at: performance.now() });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startedAt, judgeNotes]);

  const reset = useCallback(() => {
    judgesRef.current = {};
    setJudges({});
    setScore(EMPTY_SCORE);
    setFlash(null);
  }, []);

  return { nodes: judgedNodes, score, flash, zoom, isPlaying, reset };
}
