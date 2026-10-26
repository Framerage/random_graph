import { GAP_Y, LANE_KEYS, MAX_DEPTH, NODE_SIZE, ROOT_ID } from '../constants';
import { columnSizes, treeColumns, treeLanes } from './selectors';
import { canExpand } from './tree';
import type { GrowEdge, LevelConfig, OrbNode, TreeState } from '../types';

/**
 * Раскладка слева направо с шагом уровня: столбец = уровень дерева, по вертикали узел стоит на своей дорожке.
 * Темп уровня уходит в данные узлов и рёбер — по нему идут анимации роста.
 */
export function buildGraph(
  tree: TreeState,
  { gapX, rowDelay }: Pick<LevelConfig, 'gapX' | 'rowDelay'>,
): { nodes: OrbNode[]; edges: GrowEdge[] } {
  const nodes: OrbNode[] = [];
  const edges: GrowEdge[] = [];
  const sizes = columnSizes(tree);
  const lanes = treeLanes(tree);

  treeColumns(tree).forEach((column) =>
    column.forEach((id) => {
      const node = tree.nodes[id];
      const leaf = node.children.length === 0;
      const maxed = leaf && node.depth >= MAX_DEPTH;
      const exiting = node.depth < tree.firstDepth;
      const root = id === ROOT_ID;
      const lane = lanes[id];
      nodes.push({
        id,
        type: 'orb',
        position: { x: node.depth * gapX, y: lane * GAP_Y },
        width: NODE_SIZE,
        height: NODE_SIZE,
        data: {
          label: root ? 'CORE' : LANE_KEYS[lane],
          lane,
          note: !root && !leaf,
          leaf,
          root,
          maxed,
          blocked: leaf && !maxed && !exiting && !canExpand(tree, id, sizes),
          exiting,
          bornAt: node.bornAt,
          rowDelay,
        },
      });
    }),
  );

  for (const node of Object.values(tree.nodes)) {
    for (const childId of node.children) {
      edges.push({
        id: `e-${node.id}-${childId}`,
        source: node.id,
        target: childId,
        type: 'grow',
        data: { bornAt: tree.nodes[childId].bornAt, exiting: node.depth < tree.firstDepth, rowDelay },
      });
    }
  }

  return { nodes, edges };
}
