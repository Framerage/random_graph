import { SESSION_KEY } from '../constants';

export function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function writeSession(value: string | null) {
  try {
    if (value) localStorage.setItem(SESSION_KEY, value);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* localStorage может быть недоступен — не критично */
  }
}
