import { describe, expect, it } from 'vitest';
import { GAP_X, NODE_SIZE, ZONE_WIDTH } from '../constants';
import type { OrbNode } from '../types';
import { addJudges, applyJudges, noteInZone, passedNotes } from './judge';

const orb = (id: string, depth: number, lane: number, note = true): OrbNode => ({
  id,
  type: 'orb',
  position: { x: depth * GAP_X, y: 0 },
  data: { label: '', lane, note, leaf: !note, root: false, maxed: false, blocked: false, exiting: false, bornAt: 0 },
});

/** Центр столбца depth: в этот момент его ноты ровно в середине зоны. */
const columnX = (depth: number) => depth * GAP_X + NODE_SIZE / 2;

const a = orb('a', 0, 0);
const b = orb('b', 2, 1);
const leaf = orb('leaf', 0, 2, false);
const nodes = [a, b, leaf];

describe('passedNotes', () => {
  it('ноты, чей центр левее зоны, кроме листьев и уже засчитанных', () => {
    const x = columnX(0) + ZONE_WIDTH / 2 + 1;
    expect(passedNotes(nodes, {}, x)).toEqual(['a']);
    expect(passedNotes(nodes, { a: 'hit' }, x)).toEqual([]);
  });

  it('нота на границе зоны ещё не пропущена', () => {
    expect(passedNotes(nodes, {}, columnX(0) + ZONE_WIDTH / 2)).toEqual([]);
  });
});

describe('noteInZone', () => {
  it('находит ноту своей дорожки в пределах зоны', () => {
    expect(noteInZone(nodes, {}, 1, columnX(2))).toBe(b);
    expect(noteInZone(nodes, {}, 1, columnX(2) + ZONE_WIDTH / 2)).toBe(b);
  });

  it('не находит чужую дорожку, ноту вне зоны и засчитанную', () => {
    expect(noteInZone(nodes, {}, 0, columnX(2))).toBeUndefined();
    expect(noteInZone(nodes, {}, 1, columnX(2) + ZONE_WIDTH / 2 + 1)).toBeUndefined();
    expect(noteInZone(nodes, { b: 'miss' }, 1, columnX(2))).toBeUndefined();
  });
});

describe('addJudges', () => {
  it('добавляет результаты и забывает узлы, ушедшие из окна', () => {
    const prev = { gone: 'hit', a: 'miss' } as const;
    expect(addJudges(prev, nodes, ['b'], 'hit')).toEqual({ a: 'miss', b: 'hit' });
    expect(prev).toEqual({ gone: 'hit', a: 'miss' });
  });
});

describe('applyJudges', () => {
  it('проставляет результат, остальные узлы не копирует', () => {
    const [judgedA, sameB] = applyJudges([a, b], { a: 'hit' });
    expect(judgedA.data.judge).toBe('hit');
    expect(a.data.judge).toBeUndefined();
    expect(sameB).toBe(b);
  });
});
