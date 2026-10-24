import { randomInt, shuffle } from '@/shared/lib';
import { MAX_DEPTH, MAX_PER_COLUMN, ROOT_ID } from '../config';
import { createInitialTree, expandNode } from './tree';
import type { Plan } from './types';

/**
 * Строит план случайного дерева: для каждого столбца список раскрытий.
 * В каждом столбце выбираем, сколько узлов активировать: от 1 до числа узлов в столбце,
 * но не больше MAX_PER_COLUMN / 2, чтобы следующий столбец уместил всех детей.
 * Затем берём столько разных случайных узлов. Их дети образуют следующий столбец.
 * Дерево при этом симулируется целиком, с тем же скользящим окном, а план — это его log.
 */
export function createRandomPlan(): Plan {
  let tree = createInitialTree();
  let row = [ROOT_ID];

  for (let depth = 0; depth < MAX_DEPTH && row.length > 0; depth++) {
    const activeCount = randomInt(1, Math.min(row.length, MAX_PER_COLUMN / 2));
    const pickedSet = new Set(shuffle(row).slice(0, activeCount));
    // Идём по столбцу сверху вниз, чтобы новые id тоже шли сверху вниз
    const picked = row.filter((id) => pickedSet.has(id));

    const nextRow: string[] = [];
    for (const id of picked) {
      tree = expandNode(tree, id, 0);
      nextRow.push(...tree.nodes[id].children);
    }
    row = nextRow;
  }

  return tree.log;
}
