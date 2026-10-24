import type { Edge, Node } from '@xyflow/react';

/**
 * bornAt — момент появления узла (performance.now()), от него считается анимация роста ветки.
 * pitch — ступень лада: у корня 0, ветка X — шаг вниз, ветка Y — шаг вверх.
 */
export type TreeNode = { id: string; depth: number; children: string[]; side?: 'X' | 'Y'; bornAt: number; pitch: number };
/** Одно раскрытие: какой узел раскрыли и какие id получили его дети. */
export type PlanStep = { id: string; children: [string, string] };
/** План роста по столбцам: plan[d] — раскрытия узлов глубины d. */
export type Plan = PlanStep[][];
/**
 * head — самый левый хранимый столбец по порядку сверху вниз. Его родителей уже нет в памяти,
 * поэтому порядок нельзя вывести из дерева и мы его запоминаем.
 * firstDepth — глубина первого видимого столбца. Столбец перед ним (если есть) — уходящий: он гаснет.
 * headLanes — дорожки узлов head: их тоже нельзя вывести без родителей.
 * log — история раскрытий для «Переиграть». Ноды из неё не восстанавливаются, это только id: два шага на столбец.
 */
export type TreeState = {
  nodes: Record<string, TreeNode>;
  nextId: number;
  head: string[];
  headLanes: number[];
  firstDepth: number;
  log: Plan;
};
export type TreeAction =
  | { type: 'expand'; id: string; at: number }
  | { type: 'reset' }
  | { type: 'expandMany'; steps: PlanStep[]; at: number };

/** Результат по ноте в игре. */
export type Judge = 'hit' | 'miss';

/**
 * maxed — лист на максимальной глубине; blocked — лист, для детей которого нет места в следующем столбце;
 * exiting — узел уходящего столбца, он гаснет и при следующем сдвиге окна удаляется.
 * note — нота игры: узел, от которого ветка идёт дальше (корень не в счёт); judge — попал по ней игрок или нет.
 */
export type OrbData = {
  label: string;
  lane: number;
  note: boolean;
  judge?: Judge;
  leaf: boolean;
  root: boolean;
  maxed: boolean;
  blocked: boolean;
  exiting: boolean;
  bornAt: number;
};
export type OrbNode = Node<OrbData, 'orb'>;
export type GrowEdgeData = { bornAt: number; exiting: boolean };
export type GrowEdge = Edge<GrowEdgeData, 'grow'>;
