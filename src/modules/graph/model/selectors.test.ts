import { describe, expect, it } from 'vitest';
import { ROOT_ID, ROOT_LANE } from '../constants';
import type { TreeState } from '../types';
import { columnSizes, treeColumns, treeDepth, treeLanes } from './selectors';
import { createInitialTree, expandNode } from './tree';

const grow = (ids: string[], tree: TreeState = createInitialTree()) =>
  ids.reduce((t, id) => expandNode(t, id, 0), tree);

describe('treeColumns / columnSizes / treeDepth', () => {
  it('столбцы идут сверху вниз в порядке родителей', () => {
    const tree = grow([ROOT_ID, 'n1', 'n2']);
    expect(treeColumns(tree)).toEqual([[ROOT_ID], ['n1', 'n2'], ['n3', 'n4', 'n5', 'n6']]);
    expect(columnSizes(tree)).toEqual([1, 2, 4]);
    expect(treeDepth(tree)).toBe(2);
  });
});

describe('treeLanes', () => {
  it('ядро стоит между дорожками, его дети — на двух соседних', () => {
    const lanes = treeLanes(grow([ROOT_ID]));
    expect(lanes[ROOT_ID]).toBe(ROOT_LANE);
    expect([lanes.n1, lanes.n2]).toEqual([1, 2]);
  });

  it('полный столбец занимает все дорожки по порядку', () => {
    const lanes = treeLanes(grow([ROOT_ID, 'n1', 'n2']));
    expect(['n3', 'n4', 'n5', 'n6'].map((id) => lanes[id])).toEqual([0, 1, 2, 3]);
  });

  it('пара детей встаёт рядом с родителем и не выходит за края', () => {
    const top = treeLanes(grow([ROOT_ID, 'n1', 'n2', 'n3']));
    expect([top.n7, top.n8]).toEqual([0, 1]);

    const bottom = treeLanes(grow([ROOT_ID, 'n1', 'n2', 'n6']));
    expect([bottom.n7, bottom.n8]).toEqual([2, 3]);
  });
});
