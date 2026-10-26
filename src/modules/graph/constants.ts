import type { LevelConfig, PlayerStats, Score } from './types';

/* ===== Дерево ===== */

export const NODE_SIZE = 56;
/** Расстояние между узлами внутри столбца. Расстояние между столбцами задаёт уровень (LEVELS). */
export const GAP_Y = 84;
export const MAX_DEPTH = 25;
/**
 * Сколько столбцов хранится в памяти по умолчанию — для плана и тестов; в игре окно задаёт уровень.
 * Когда появляется новый столбец сверх лимита, самый левый гаснет, а следующий за ним удаляется насовсем.
 */
export const VISIBLE_COLUMNS = 10;
/** Сколько узлов помещается в один столбец. Дети появляются парами, поэтому раскрыть в столбце можно не больше двух узлов. */
export const MAX_PER_COLUMN = 4;
/** Дорожки сверху вниз: у каждой своя клавиша. Узел столбца всегда стоит на одной из них. */
export const LANE_KEYS = ['W', 'A', 'S', 'D'];
/** Ядро стоит между дорожками A и S. */
export const ROOT_LANE = 1.5;

/** Сколько «проявляется» узел, когда до него дотянулась ветка, мс. Сколько растёт сама ветка, задаёт уровень (rowDelay). */
export const NODE_APPEAR = 250;

export const ROOT_ID = 'n0';

/* ===== Игра: камера едет вправо, ноты проходят через зону попадания в центре экрана ===== */

/** Коды клавиш дорожек: e.code не зависит от раскладки. */
export const LANE_CODES = LANE_KEYS.map((key) => `Key${key}`);
/** Клавиша паузы и продолжения. */
export const PAUSE_CODE = 'Space';
/**
 * Уровни: [ширина зоны, шаг столбцов, подготовка в столбцах, темп в мс на столбец].
 * Зона всегда уже шага — в ней только один столбец. Темп подобран так, чтобы на экране
 * ноты ехали примерно с одной скоростью: где столбцов на экране меньше, там медленнее.
 */
const LEVEL_TABLE: [number, number, number, number][] = [
  [315, 350, 3, 800],
  [190, 250, 4, 700],
  [160, 250, 4, 650],
  [100, 195, 5, 550],
  [64, 160, 6, 500],
];
export const LEVELS: LevelConfig[] = LEVEL_TABLE.map(([zoneWidth, gapX, lagColumns, rowDelay]) => ({
  zoneWidth,
  gapX,
  lagColumns,
  rowDelay,
  // Слева от зоны видно столько же столбцов, сколько справа
  visibleColumns: 2 * lagColumns,
}));
export const LEVELS_COUNT = LEVELS.length;
/** Конфиг уровня по номеру с 1. */
export const levelConfig = (level: number) => LEVELS[level - 1];
/** Сколько попаданий нужно, чтобы пройти уровень. */
export const HITS_TO_WIN = 20;
/** Центр дорожек по вертикали в координатах графа — он держится в центре экрана. */
export const LANES_CENTER_Y = ((LANE_KEYS.length - 1) / 2) * GAP_Y + NODE_SIZE / 2;

/** Где зона в координатах графа через t мс после старта: столбец d проходит её центр в (d + lagColumns) * rowDelay. */
export const zoneX = (t: number, { gapX, lagColumns, rowDelay }: LevelConfig) =>
  (t / rowDelay - lagColumns) * gapX + NODE_SIZE / 2;

export const EMPTY_SCORE: Score = { hits: 0, misses: 0, wrong: 0 };

/* ===== Статистика игрока ===== */

export const STATS_KEY = 'random-graph:stats';
export const EMPTY_STATS: PlayerStats = { level: 1, attempts: 0, misses: 0, completedAt: null };
