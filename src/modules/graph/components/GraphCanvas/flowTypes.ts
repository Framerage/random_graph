import type { EdgeTypes, NodeTypes } from '@xyflow/react';
import { GrowEdgeView } from '../GrowEdge/GrowEdge';
import { OrbNodeView } from '../OrbNode/OrbNode';

// Объявлено вне компонента, чтобы ссылка была стабильной
export const nodeTypes: NodeTypes = { orb: OrbNodeView };
export const edgeTypes: EdgeTypes = { grow: GrowEdgeView };
