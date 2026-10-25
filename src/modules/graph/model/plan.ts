import { randomInt, shuffle } from '@/shared/lib';
import { MAX_DEPTH, MAX_PER_COLUMN, ROOT_ID } from '../constants';
import { createInitialTree, expandNode } from './tree';
import type { Plan, PlanStep } from '../types';

/**
 * Строит план случайного дерева: для каждого столбца список раскрытий.
 * В каждом столбце выбираем, сколько узлов активировать: от 1 до числа узлов в столбце,
 * но не больше MAX_PER_COLUMN / 2, чтобы следующий столбец уместил всех детей.
 * Затем берём столько разных случайных узлов. Их дети образуют следующий столбец.
 * Дерево при этом симулируется с тем же скользящим окном, а раскрытия записываются в план.
 */
export function createRandomPlan(): Plan {
  let tree = createInitialTree();
  let row = [ROOT_ID];
  const plan: Plan = [];

  for (let depth = 0; depth < MAX_DEPTH && row.length > 0; depth++) {
    const activeCount = randomInt(1, Math.min(row.length, MAX_PER_COLUMN / 2));
    const pickedSet = new Set(shuffle(row).slice(0, activeCount));
    // Идём по столбцу сверху вниз, чтобы новые id тоже шли сверху вниз
    const picked = row.filter((id) => pickedSet.has(id));

    const steps: PlanStep[] = [];
    const nextRow: string[] = [];
    for (const id of picked) {
      tree = expandNode(tree, id, 0);
      const [left, right] = tree.nodes[id].children;
      steps.push({ id, children: [left, right] });
      nextRow.push(left, right);
    }
    plan.push(steps);
    row = nextRow;
  }

  return plan;
}
