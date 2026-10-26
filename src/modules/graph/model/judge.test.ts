import { describe, expect, it } from 'vitest';
import { LEVELS, NODE_SIZE } from '../constants';
import type { OrbNode } from '../types';
import { addJudges, applyJudges, noteInZone, passedNotes } from './judge';

/** Шаг столбцов в тестах. */
const GAP = 160;

const orb = (id: string, depth: number, lane: number, note = true): OrbNode => ({
  id,
  type: 'orb',
  position: { x: depth * GAP, y: 0 },
  data: { label: '', lane, note, leaf: !note, root: false, maxed: false, blocked: false, exiting: false, bornAt: 0, rowDelay: 500 },
});

/** Центр столбца depth: в этот момент его ноты ровно в середине зоны. */
const columnX = (depth: number) => depth * GAP + NODE_SIZE / 2;

/** Ширина зоны в тестах: уже шага столбцов, чтобы соседние столбцы в неё не попадали. */
const WIDTH = 100;

const a = orb('a', 0, 0);
const b = orb('b', 2, 1);
const leaf = orb('leaf', 0, 2, false);
const nodes = [a, b, leaf];

describe('passedNotes', () => {
  it('ноты, чей центр левее зоны, кроме листьев и уже засчитанных', () => {
    const x = columnX(0) + WIDTH / 2 + 1;
    expect(passedNotes(nodes, {}, x, WIDTH)).toEqual(['a']);
    expect(passedNotes(nodes, { a: 'hit' }, x, WIDTH)).toEqual([]);
  });

  it('нота на границе зоны ещё не пропущена', () => {
    expect(passedNotes(nodes, {}, columnX(0) + WIDTH / 2, WIDTH)).toEqual([]);
  });

  it('в широкой зоне та же нота ещё не пропущена', () => {
    expect(passedNotes(nodes, {}, columnX(0) + WIDTH / 2 + 1, WIDTH * 2)).toEqual([]);
  });
});

describe('noteInZone', () => {
  it('находит ноту своей дорожки в пределах зоны', () => {
    expect(noteInZone(nodes, {}, 1, columnX(2), WIDTH)).toBe(b);
    expect(noteInZone(nodes, {}, 1, columnX(2) + WIDTH / 2, WIDTH)).toBe(b);
  });

  it('не находит чужую дорожку, ноту вне зоны и засчитанную', () => {
    expect(noteInZone(nodes, {}, 0, columnX(2), WIDTH)).toBeUndefined();
    expect(noteInZone(nodes, {}, 1, columnX(2) + WIDTH / 2 + 1, WIDTH)).toBeUndefined();
    expect(noteInZone(nodes, { b: 'miss' }, 1, columnX(2), WIDTH)).toBeUndefined();
  });
});

describe('уровни', () => {
  it('зона вмещает ноду и уже шага: в ней не бывает двух столбцов', () => {
    for (const { zoneWidth, gapX } of LEVELS) {
      expect(zoneWidth).toBeGreaterThan(NODE_SIZE);
      expect(zoneWidth).toBeLessThan(gapX);
    }
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
