/* ========================================================================
 * Игровые часы: идут как performance.now(), но стоят на паузе.
 * По ним считаются рост веток (bornAt), положение зоны и расписание столбцов,
 * поэтому после паузы всё продолжается с того же места, а не перескакивает вперёд.
 * ===================================================================== */

/** Сколько всего простояли на паузе, мс. */
let pausedTotal = 0;
/** Когда встали на паузу (performance.now()), null — часы идут. */
let pausedAt: number | null = null;

export const now = () => (pausedAt ?? performance.now()) - pausedTotal;

export function pauseClock() {
  if (pausedAt === null) pausedAt = performance.now();
}

export function resumeClock() {
  if (pausedAt === null) return;
  pausedTotal += performance.now() - pausedAt;
  pausedAt = null;
}
