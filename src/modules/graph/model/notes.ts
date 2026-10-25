import type { SoundNote } from '@/shared/audio';
import { MAX_DEPTH } from '../constants';
import { treeColumns } from './selectors';
import { createInitialTree, treeReducer } from './tree';
import type { Plan, TreeNode, TreeState } from '../types';

/** Нота одного узла. */
export function nodeNote({ pitch, depth }: TreeNode): SoundNote {
  return { pitch, depth, accent: depth >= MAX_DEPTH };
}

/** Ноты одного столбца сверху вниз. */
function columnNotes(tree: TreeState, column: string[]): SoundNote[] {
  return column.map((id) => nodeNote(tree.nodes[id]));
}

/**
 * Ноты плана по столбцам: столбец d звучит, когда проявляются узлы глубины d.
 * Итоговое дерево помнит только последние столбцы, поэтому ноты снимаем по ходу симуляции:
 * после каждого шага плана новый столбец — последний.
 */
export function soundColumns(plan: Plan): SoundNote[][] {
  let tree = createInitialTree();
  const columns = [columnNotes(tree, tree.head)];
  for (const steps of plan) {
    tree = treeReducer(tree, { type: 'expandMany', steps, at: 0 });
    columns.push(columnNotes(tree, treeColumns(tree).at(-1)!));
  }
  return columns;
}
