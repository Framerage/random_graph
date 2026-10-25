import { describe, expect, it } from 'vitest';
import { MAX_DEPTH, MAX_PER_COLUMN, ROOT_ID, ROOT_LANE, VISIBLE_COLUMNS } from '../constants';
import type { TreeState } from '../types';
import { canExpand, createInitialTree, expandNode, treeReducer } from './tree';

/** Цепочка: раскрываем ядро, затем каждый раз левого ребёнка — по два узла на столбец. */
function chain(depth: number) {
  let tree = createInitialTree();
  let id = ROOT_ID;
  for (let d = 0; d < depth; d++) {
    tree = expandNode(tree, id, 0);
    id = tree.nodes[id].children[0];
  }
  return { tree, leaf: id };
}

const depths = (tree: TreeState) => new Set(Object.values(tree.nodes).map((node) => node.depth));

describe('createInitialTree', () => {
  it('содержит только ядро', () => {
    const tree = createInitialTree();
    expect(Object.keys(tree.nodes)).toEqual([ROOT_ID]);
    expect(tree.nodes[ROOT_ID]).toMatchObject({ depth: 0, pitch: 0, children: [] });
    expect(tree.head).toEqual([ROOT_ID]);
    expect(tree.headLanes).toEqual([ROOT_LANE]);
    expect(tree.firstDepth).toBe(0);
  });
});

describe('expandNode', () => {
  it('добавляет детей X и Y: шаг лада вниз и вверх', () => {
    const tree = expandNode(createInitialTree(), ROOT_ID, 5);
    expect(tree.nodes[ROOT_ID].children).toEqual(['n1', 'n2']);
    expect(tree.nodes.n1).toMatchObject({ depth: 1, side: 'X', pitch: -1, bornAt: 5, children: [] });
    expect(tree.nodes.n2).toMatchObject({ depth: 1, side: 'Y', pitch: 1, bornAt: 5, children: [] });
    expect(tree.nextId).toBe(3);
  });

  it('берёт переданные id детей', () => {
    const tree = expandNode(createInitialTree(), ROOT_ID, 0, ['a', 'b']);
    expect(tree.nodes[ROOT_ID].children).toEqual(['a', 'b']);
    expect(tree.nodes.a.side).toBe('X');
  });

  it('не меняет состояние, если раскрыть нельзя', () => {
    const tree = expandNode(createInitialTree(), ROOT_ID, 0);
    expect(expandNode(tree, ROOT_ID, 0)).toBe(tree);
    expect(expandNode(tree, 'missing', 0)).toBe(tree);
  });

  it('не мутирует исходное состояние', () => {
    const initial = createInitialTree();
    expandNode(initial, ROOT_ID, 0);
    expect(initial.nodes[ROOT_ID].children).toEqual([]);
    expect(Object.keys(initial.nodes)).toHaveLength(1);
  });
});

describe('canExpand', () => {
  it('нельзя раскрыть не лист', () => {
    expect(canExpand(expandNode(createInitialTree(), ROOT_ID, 0), ROOT_ID)).toBe(false);
  });

  it('нельзя, если в следующем столбце нет места для двух детей', () => {
    // Столбец 2 заполнен целиком: n3..n6. Раскрываем двоих из них — столбец 3 тоже полон.
    let tree = createInitialTree();
    for (const id of [ROOT_ID, 'n1', 'n2', 'n3', 'n4']) tree = expandNode(tree, id, 0);
    expect(MAX_PER_COLUMN).toBe(4);
    expect(canExpand(tree, 'n5')).toBe(false);
    expect(canExpand(tree, 'n6')).toBe(false);
    expect(canExpand(tree, 'n7')).toBe(true);
  });

  it('нельзя раскрыть лист на максимальной глубине', () => {
    const { tree, leaf } = chain(MAX_DEPTH);
    expect(tree.nodes[leaf].depth).toBe(MAX_DEPTH);
    expect(canExpand(tree, leaf)).toBe(false);
  });
});

describe('скользящее окно', () => {
  const depth = Math.min(VISIBLE_COLUMNS + 5, MAX_DEPTH);
  const { tree } = chain(depth);
  const firstDepth = Math.max(0, depth - VISIBLE_COLUMNS + 1);

  it('сдвигает первый видимый столбец', () => {
    expect(tree.firstDepth).toBe(firstDepth);
  });

  it('хранит видимые столбцы и один уходящий', () => {
    const stored = depths(tree);
    expect(Math.min(...stored)).toBe(Math.max(0, firstDepth - 1));
    expect(Math.max(...stored)).toBe(depth);
    expect(stored.size).toBeLessThanOrEqual(VISIBLE_COLUMNS + 1);
  });

  it('уходящий столбец раскрыть нельзя', () => {
    const exitingLeaf = Object.values(tree.nodes).find(
      (node) => node.depth === tree.firstDepth - 1 && node.children.length === 0,
    );
    expect(exitingLeaf).toBeDefined();
    expect(canExpand(tree, exitingLeaf!.id)).toBe(false);
  });

  it('head — самый левый хранимый столбец', () => {
    const minDepth = Math.min(...depths(tree));
    expect(tree.head.every((id) => tree.nodes[id].depth === minDepth)).toBe(true);
    expect(tree.headLanes).toHaveLength(tree.head.length);
  });
});

describe('treeReducer', () => {
  it('reset возвращает к ядру', () => {
    const { tree } = chain(3);
    expect(treeReducer(tree, { type: 'reset' })).toEqual(createInitialTree());
  });

  it('expandMany применяет шаги по порядку', () => {
    const tree = treeReducer(createInitialTree(), {
      type: 'expandMany',
      steps: [{ id: ROOT_ID, children: ['a', 'b'] }],
      at: 7,
    });
    expect(tree.nodes.a.bornAt).toBe(7);
    expect(tree.nodes.b.bornAt).toBe(7);
  });
});
