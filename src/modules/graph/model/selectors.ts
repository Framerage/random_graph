import { MAX_PER_COLUMN } from '../constants';
import type { TreeState } from '../types';

/** Сколько узлов в каждом столбце: индекс — глубина. */
export function columnSizes(state: TreeState): number[] {
  const sizes: number[] = [];
  for (const node of Object.values(state.nodes)) sizes[node.depth] = (sizes[node.depth] ?? 0) + 1;
  return sizes;
}

/**
 * Хранимые столбцы дерева, каждый сверху вниз: обход в ширину от head. Дети идут в порядке
 * своих родителей, поэтому ветки между соседними столбцами не пересекаются.
 */
export function treeColumns(tree: TreeState): string[][] {
  const columns: string[][] = [];
  let column = tree.head;
  while (column.length > 0) {
    columns.push(column);
    column = column.flatMap((id) => tree.nodes[id].children);
  }
  return columns;
}

/**
 * Дорожка каждого узла. Полный столбец занимает все четыре дорожки по порядку.
 * Столбец из двух узлов — это дети одного родителя: они встают на две соседние дорожки рядом с ним.
 */
export function treeLanes(tree: TreeState): Record<string, number> {
  const lanes: Record<string, number> = {};
  tree.head.forEach((id, i) => (lanes[id] = tree.headLanes[i]));
  const columns = treeColumns(tree);

  for (let i = 1; i < columns.length; i++) {
    const column = columns[i];
    if (column.length === MAX_PER_COLUMN) {
      column.forEach((id, lane) => (lanes[id] = lane));
      continue;
    }
    const parent = columns[i - 1].find((id) => tree.nodes[id].children.length > 0)!;
    const start = Math.min(Math.max(Math.round(lanes[parent] - 0.5), 0), MAX_PER_COLUMN - 2);
    column.forEach((id, k) => (lanes[id] = start + k));
  }
  return lanes;
}

/** Самая большая глубина среди хранимых узлов. */
export const treeDepth = (tree: TreeState) => Math.max(...Object.values(tree.nodes).map((n) => n.depth));
