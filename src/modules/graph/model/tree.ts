import { MAX_DEPTH, MAX_PER_COLUMN, ROOT_ID, ROOT_LANE, VISIBLE_COLUMNS } from '../constants';
import { columnSizes, treeColumns, treeLanes } from './selectors';
import type { TreeAction, TreeNode, TreeState } from '../types';

export const createInitialTree = (visibleColumns = VISIBLE_COLUMNS): TreeState => ({
  // Корень существовал «всегда» — его не анимируем
  nodes: { [ROOT_ID]: { id: ROOT_ID, depth: 0, children: [], bornAt: -Infinity, pitch: 0 } },
  nextId: 1,
  head: [ROOT_ID],
  headLanes: [ROOT_LANE],
  firstDepth: 0,
  visibleColumns,
});

/** Можно ли раскрыть узел: это лист, глубина не максимальная и в следующем столбце есть место для двух детей. */
export function canExpand(state: TreeState, id: string, sizes = columnSizes(state)): boolean {
  const target = state.nodes[id];
  if (!target || target.children.length > 0 || target.depth >= MAX_DEPTH) return false;
  // Уходящий столбец раскрывать нельзя
  if (target.depth < state.firstDepth) return false;
  return (sizes[target.depth + 1] ?? 0) + 2 <= MAX_PER_COLUMN;
}

/**
 * Раскрывает лист: добавляет ему двух детей X и Y. Возвращает исходное состояние, если раскрыть нельзя.
 * childIds передаются при проигрывании плана, чтобы id совпали с исходными.
 */
export function expandNode(state: TreeState, id: string, bornAt: number, childIds?: [string, string]): TreeState {
  if (!canExpand(state, id)) return state;
  const target = state.nodes[id];

  const [leftId, rightId] = childIds ?? [`n${state.nextId}`, `n${state.nextId + 1}`];
  const depth = target.depth + 1;

  return shiftWindow({
    ...state,
    nextId: state.nextId + 2,
    nodes: {
      ...state.nodes,
      [target.id]: { ...target, children: [leftId, rightId] },
      [leftId]: { id: leftId, depth, children: [], side: 'X', bornAt, pitch: target.pitch - 1 },
      [rightId]: { id: rightId, depth, children: [], side: 'Y', bornAt, pitch: target.pitch + 1 },
    },
  });
}

/**
 * Скользящее окно: если столбцов стало больше visibleColumns, сдвигаем firstDepth.
 * Столбец перед окном остаётся как уходящий (он плавно гаснет), всё, что левее, удаляется.
 * Так в памяти не больше visibleColumns + 1 столбца по MAX_PER_COLUMN узлов.
 */
function shiftWindow(state: TreeState): TreeState {
  const columns = treeColumns(state);
  const lastDepth = state.nodes[columns[columns.length - 1][0]].depth;
  const firstDepth = lastDepth - state.visibleColumns + 1;
  if (firstDepth <= state.firstDepth) return state;

  const headDepth = state.nodes[state.head[0]].depth;
  const kept = columns.slice(Math.max(firstDepth - 1 - headDepth, 0));
  const nodes: Record<string, TreeNode> = {};
  for (const id of kept.flat()) nodes[id] = state.nodes[id];
  const lanes = treeLanes(state);

  return { ...state, nodes, head: kept[0], headLanes: kept[0].map((id) => lanes[id]), firstDepth };
}

export function treeReducer(state: TreeState, action: TreeAction): TreeState {
  switch (action.type) {
    case 'reset':
      return createInitialTree(action.visibleColumns);
    case 'expand':
      return expandNode(state, action.id, action.at);
    case 'expandMany':
      return action.steps.reduce((tree, step) => expandNode(tree, step.id, action.at, step.children), state);
  }
}
