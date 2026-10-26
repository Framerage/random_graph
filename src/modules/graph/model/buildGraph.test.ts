import { describe, expect, it } from 'vitest';
import { GAP_Y, LANE_KEYS, ROOT_ID, ROOT_LANE } from '../constants';
import { buildGraph } from './buildGraph';
import { createInitialTree, expandNode } from './tree';

/** Шаг столбцов и темп в тестах. */
const GAP_X = 160;
const LAYOUT = { gapX: GAP_X, rowDelay: 500 };

const grow = (ids: string[], at = 0) => ids.reduce((t, id) => expandNode(t, id, at), createInitialTree());
const byId = (ids: string[]) =>
  Object.fromEntries(buildGraph(grow(ids), LAYOUT).nodes.map((node) => [node.id, node]));

describe('buildGraph', () => {
  it('ядро — CORE на средней линии, без рёбер', () => {
    const { nodes, edges } = buildGraph(createInitialTree(), LAYOUT);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].position).toEqual({ x: 0, y: ROOT_LANE * GAP_Y });
    expect(nodes[0].data).toMatchObject({ label: 'CORE', root: true, leaf: true, note: false });
    expect(edges).toEqual([]);
  });

  it('столбец по глубине, строка по дорожке, подпись — клавиша дорожки', () => {
    const nodes = byId([ROOT_ID]);
    expect(nodes.n1.position).toEqual({ x: GAP_X, y: 1 * GAP_Y });
    expect(nodes.n1.data.label).toBe(LANE_KEYS[1]);
    expect(nodes.n2.data.label).toBe(LANE_KEYS[2]);
  });

  it('нота — раскрытый узел, кроме ядра', () => {
    const nodes = byId([ROOT_ID, 'n1']);
    expect(nodes[ROOT_ID].data.note).toBe(false);
    expect(nodes.n1.data.note).toBe(true);
    expect(nodes.n2.data.note).toBe(false);
  });

  it('лист без места для детей помечен blocked', () => {
    const nodes = byId([ROOT_ID, 'n1', 'n2', 'n3', 'n4']);
    expect(nodes.n5.data.blocked).toBe(true);
    expect(nodes.n7.data.blocked).toBe(false);
  });

  it('ребро на каждого ребёнка, с моментом его появления', () => {
    const { edges } = buildGraph(grow([ROOT_ID], 42), LAYOUT);
    expect(edges.map((edge) => edge.id)).toEqual([`e-${ROOT_ID}-n1`, `e-${ROOT_ID}-n2`]);
    expect(edges.every((edge) => edge.data?.bornAt === 42 && !edge.data.exiting)).toBe(true);
    expect(edges.every((edge) => edge.data?.rowDelay === LAYOUT.rowDelay)).toBe(true);
  });
});
