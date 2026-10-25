import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Часы хранят состояние на уровне модуля — на каждый тест грузим свежую копию
let clock: typeof import('./clock');
let realNow = 0;

beforeEach(async () => {
  realNow = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => realNow);
  vi.resetModules();
  clock = await import('./clock');
});

afterEach(() => vi.restoreAllMocks());

describe('игровые часы', () => {
  it('без паузы идут как performance.now()', () => {
    expect(clock.now()).toBe(1000);
    realNow = 1500;
    expect(clock.now()).toBe(1500);
  });

  it('на паузе стоят, после продолжения идут дальше без скачка', () => {
    clock.pauseClock();
    realNow = 3000;
    expect(clock.now()).toBe(1000);
    clock.resumeClock();
    expect(clock.now()).toBe(1000);
    realNow = 3500;
    expect(clock.now()).toBe(1500);
  });

  it('повторные pause и resume ничего не ломают', () => {
    clock.pauseClock();
    realNow = 2000;
    clock.pauseClock();
    realNow = 4000;
    clock.resumeClock();
    clock.resumeClock();
    expect(clock.now()).toBe(1000);
  });
});
