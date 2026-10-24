import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { cx } from '@/shared/lib';
import { NODE_APPEAR, ROW_DELAY } from '../config';
import type { OrbNode } from '../model/types';
import { useGrowStyle } from './useGrowStyle';
import styles from './OrbNode.module.scss';

export function OrbNodeView({ data }: NodeProps<OrbNode>) {
  // Узел проявляется, когда до него дотянулась ветка
  const growStyle = useGrowStyle(data.bornAt, ROW_DELAY, NODE_APPEAR);
  const className = cx(
    styles.orb,
    styles.orbAppear,
    data.leaf && styles.orbLeaf,
    data.root && styles.orbRoot,
    (data.maxed || data.blocked) && styles.orbMax,
    data.note && styles.orbNote,
    data.judge === 'hit' && styles.orbHit,
    data.judge === 'miss' && styles.orbMiss,
    data.exiting && styles.orbExit,
  );

  return (
    <div className={className} style={growStyle}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}
