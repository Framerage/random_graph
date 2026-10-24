import { GAP_X, GAP_Y, LANE_KEYS, NODE_SIZE, ROW_DELAY } from '@/entities/tree';

/** Коды клавиш дорожек: e.code не зависит от раскладки. */
export const LANE_CODES = LANE_KEYS.map((key) => `Key${key}`);
/** Через сколько столбцов после появления столбец доезжает до зоны. Новые столбцы появляются у правого края. */
export const LAG_COLUMNS = 5;
/** Ширина зоны в координатах графа: нота засчитывается, пока её центр между рамками. */
export const ZONE_WIDTH = 86;
/** Центр дорожек по вертикали в координатах графа — он держится в центре экрана. */
export const LANES_CENTER_Y = ((LANE_KEYS.length - 1) / 2) * GAP_Y + NODE_SIZE / 2;

/** Где зона в координатах графа через t мс после старта: столбец d проходит её центр в (d + LAG_COLUMNS) * ROW_DELAY. */
export const zoneX = (t: number) => (t / ROW_DELAY - LAG_COLUMNS) * GAP_X + NODE_SIZE / 2;
