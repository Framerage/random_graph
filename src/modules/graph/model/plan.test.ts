import { describe, expect, it } from 'vitest';
import { MAX_DEPTH, MAX_PER_COLUMN, VISIBLE_COLUMNS } from '../constants';
import { nodeNote, soundColumns } from './notes';
import { createRandomPlan } from './plan';
import { canExpand, createInitialTree, expandNode } from './tree';

const RUNS = 200;

describe('createRandomPlan', () => {
  it('доходит до максимальной глубины, в каждом столбце 1..MAX_PER_COLUMN/2 раскрытий', () => {
    for (let run = 0; run < RUNS; run++) {
      const plan = createRandomPlan();
      expect(plan).toHaveLength(MAX_DEPTH);
      for (const steps of plan) {
        expect(steps.length).toBeGreaterThanOrEqual(1);
        expect(steps.length).toBeLessThanOrEqual(MAX_PER_COLUMN / 2);
      }
    }
  });

  it('проигрывается шаг за шагом с теми же id, а память ограничена окном', () => {
    for (let run = 0; run < RUNS; run++) {
      let tree = createInitialTree();
      for (const steps of createRandomPlan()) {
        for (const step of steps) {
          expect(canExpand(tree, step.id)).toBe(true);
          tree = expandNode(tree, step.id, 0, step.children);
          expect(tree.nodes[step.id].children).toEqual(step.children);
        }
        expect(Object.keys(tree.nodes).length).toBeLessThanOrEqual((VISIBLE_COLUMNS + 1) * MAX_PER_COLUMN);
      }
    }
  });
});

describe('soundColumns', () => {
  it('по столбцу нот на каждый столбец плана плюс ядро', () => {
    const plan = createRandomPlan();
    const columns = soundColumns(plan);
    expect(columns).toHaveLength(plan.length + 1);
    expect(columns[0]).toEqual([{ pitch: 0, depth: 0, accent: false }]);
    plan.forEach((steps, depth) => {
      const next = columns[depth + 1];
      expect(next).toHaveLength(steps.length * 2);
      expect(next.every((note) => note.depth === depth + 1)).toBe(true);
    });
    // Последний столбец — на максимальной глубине: акцент
    expect(columns.at(-1)!.every((note) => note.accent)).toBe(true);
  });
});

describe('nodeNote', () => {
  it('акцент только на максимальной глубине', () => {
    const node = { id: 'x', children: [], bornAt: 0, pitch: 3 };
    expect(nodeNote({ ...node, depth: MAX_DEPTH - 1 })).toEqual({ pitch: 3, depth: MAX_DEPTH - 1, accent: false });
    expect(nodeNote({ ...node, depth: MAX_DEPTH }).accent).toBe(true);
  });
});
