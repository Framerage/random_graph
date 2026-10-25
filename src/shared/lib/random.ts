/** Случайное целое от min до max включительно. */
export const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Перемешивание Фишера — Йетса, возвращает новый массив. */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
