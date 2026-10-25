import { getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { cx } from '@/shared/lib';
import { ROW_DELAY } from '../../constants';
import type { GrowEdge } from '../../types';
import { useGrowStyle } from '../../hooks/useGrowStyle';
import styles from './GrowEdge.module.scss';

/** Ветка, которая «прорастает» от родителя к ребёнку за ROW_DELAY. */
export function GrowEdgeView({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<GrowEdge>) {
  const growStyle = useGrowStyle(data?.bornAt ?? -Infinity, 0, ROW_DELAY);
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  // pathLength=1 нормирует длину пути: dash-анимация не зависит от реальной длины ветки
  return (
    <path
      className={cx('react-flow__edge-path', styles.growEdge, data?.exiting && styles.edgeExit)}
      d={path}
      pathLength={1}
      style={{ stroke: '#2a7f8e', strokeWidth: 1.5, ...growStyle }}
    />
  );
}
