export type Score = { hits: number; misses: number; wrong: number };
export const EMPTY_SCORE: Score = { hits: 0, misses: 0, wrong: 0 };
/** Вспышка дорожки в зоне после нажатия; at нужен как key, чтобы анимация перезапускалась. */
export type Flash = { lane: number; ok: boolean; at: number };
