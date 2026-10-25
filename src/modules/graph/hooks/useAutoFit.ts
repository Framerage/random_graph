import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { OrbNode } from '../types';

/**
 * После каждого изменения графа плавно вписывает в экран видимое окно (без уходящего столбца).
 * Выключается на время игры: там камерой управляет игровой цикл.
 */
export function useAutoFit(nodes: OrbNode[], enabled: boolean) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!enabled) return;
    const visible = nodes.filter((node) => !node.data.exiting);
    const timer = setTimeout(() => fitView({ nodes: visible, duration: 300, padding: 0.25, maxZoom: 1.1 }), 40);
    return () => clearTimeout(timer);
  }, [nodes, fitView, enabled]);
}
