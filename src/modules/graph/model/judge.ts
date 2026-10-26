import { NODE_SIZE } from '../constants';
import type { Judge, Judges, OrbNode } from '../types';

/** Центр узла по горизонтали в координатах графа. */
const centerX = (node: OrbNode) => node.position.x + NODE_SIZE / 2;

const isOpenNote = (node: OrbNode, judges: Judges) => node.data.note && !judges[node.id];

/** id нот без результата, которые уже проехали зону шириной width с центром в x. */
export function passedNotes(nodes: OrbNode[], judges: Judges, x: number, width: number): string[] {
  return nodes.filter((node) => isOpenNote(node, judges) && centerX(node) < x - width / 2).map((node) => node.id);
}

/** Нота без результата на дорожке lane, которая сейчас в зоне шириной width с центром в x. */
export function noteInZone(nodes: OrbNode[], judges: Judges, lane: number, x: number, width: number): OrbNode | undefined {
  return nodes.find(
    (node) => isOpenNote(node, judges) && node.data.lane === lane && Math.abs(centerX(node) - x) <= width / 2,
  );
}

/**
 * Новые результаты: ids получают judge, а старые остаются только у узлов, которые ещё в окне, —
 * так результаты не копятся бесконечно.
 */
export function addJudges(judges: Judges, nodes: OrbNode[], ids: string[], judge: Judge): Judges {
  const alive = new Set(nodes.map((node) => node.id));
  const next: Judges = Object.fromEntries(Object.entries(judges).filter(([id]) => alive.has(id)));
  for (const id of ids) next[id] = judge;
  return next;
}

/** Узлы с проставленным результатом. Узлы без результата возвращаются как есть, без копии. */
export function applyJudges(nodes: OrbNode[], judges: Judges): OrbNode[] {
  return nodes.map((node) => (judges[node.id] ? { ...node, data: { ...node.data, judge: judges[node.id] } } : node));
}
