import type { Edge, Node } from '@xyflow/react';

/**
 * bornAt — момент появления узла по игровым часам (model/clock), от него считается анимация роста ветки.
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
 * visibleColumns — размер скользящего окна.
 */
export type TreeState = {
  nodes: Record<string, TreeNode>;
  nextId: number;
  head: string[];
  headLanes: number[];
  firstDepth: number;
  visibleColumns: number;
};
export type TreeAction =
  | { type: 'expand'; id: string; at: number }
  | { type: 'reset'; visibleColumns: number }
  | { type: 'expandMany'; steps: PlanStep[]; at: number };

/** Результат по ноте в игре. */
export type Judge = 'hit' | 'miss';
/** Результаты по нотам: id узла → результат. */
export type Judges = Record<string, Judge>;

/**
 * maxed — лист на максимальной глубине; blocked — лист, для детей которого нет места в следующем столбце;
 * exiting — узел уходящего столбца, он гаснет и при следующем сдвиге окна удаляется.
 * note — нота игры: узел, от которого ветка идёт дальше (корень не в счёт); judge — попал по ней игрок или нет.
 * rowDelay — темп уровня: узел проявляется, когда до него за это время дорастёт ветка.
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
  rowDelay: number;
};
export type OrbNode = Node<OrbData, 'orb'>;
export type GrowEdgeData = { bornAt: number; exiting: boolean; rowDelay: number };
export type GrowEdge = Edge<GrowEdgeData, 'grow'>;

/* ===== Игра ===== */

export type Score = { hits: number; misses: number; wrong: number };
/** Вспышка дорожки в зоне после нажатия; at нужен как key, чтобы анимация перезапускалась. */
export type Flash = { lane: number; ok: boolean; at: number };
/**
 * Настройки уровня в координатах графа. zoneWidth — ширина зоны; gapX — шаг столбцов;
 * lagColumns — через сколько столбцов новый столбец доезжает до зоны (подготовка);
 * visibleColumns — сколько столбцов хранится и видно, без уходящего;
 * rowDelay — темп: через сколько мс идёт следующий столбец, столько же растёт ветка.
 */
export type LevelConfig = {
  zoneWidth: number;
  gapX: number;
  lagColumns: number;
  visibleColumns: number;
  rowDelay: number;
};
/** Чем кончилась попытка уровня level (уровни с 1). */
export type LevelResult = { kind: 'won' | 'lost'; level: number };

/**
 * Статистика игрока, живёт в localStorage.
 * level — уровень, с которого продолжать; attempts — сколько раз стартовал уровень;
 * misses — все «пропустил» и «мимо»; completedAt — когда последний раз прошёл последний уровень.
 */
export type PlayerStats = { level: number; attempts: number; misses: number; completedAt: number | null };
