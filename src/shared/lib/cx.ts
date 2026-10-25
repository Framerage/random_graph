/** Склеивает классы, пропуская ложные значения. */
export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');
