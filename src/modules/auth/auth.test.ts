import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loginRequest } from './api/loginRequest';
import { SESSION_KEY, VALID_LOGIN, VALID_PASSWORD } from './constants';
import { readSession, writeSession } from './model/sessionStorage';

describe('loginRequest', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('пускает тестовую учётку и обрезает пробелы в логине', async () => {
    const result = loginRequest({ login: `  ${VALID_LOGIN} `, password: VALID_PASSWORD });
    await vi.advanceTimersByTimeAsync(500);
    await expect(result).resolves.toBe(VALID_LOGIN);
  });

  it('отказывает при неверном пароле', async () => {
    const result = expect(loginRequest({ login: VALID_LOGIN, password: 'wrong' })).rejects.toThrow(
      'Неверный логин или пароль',
    );
    await vi.advanceTimersByTimeAsync(500);
    await result;
  });
});

describe('sessionStorage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('сохраняет и удаляет сессию', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    });

    writeSession('cuci');
    expect(store.get(SESSION_KEY)).toBe('cuci');
    expect(readSession()).toBe('cuci');
    writeSession(null);
    expect(readSession()).toBeNull();
  });

  it('без доступного localStorage не падает', () => {
    const broken = () => {
      throw new Error('denied');
    };
    vi.stubGlobal('localStorage', { getItem: broken, setItem: broken, removeItem: broken });

    expect(readSession()).toBeNull();
    expect(() => writeSession('cuci')).not.toThrow();
  });
});
