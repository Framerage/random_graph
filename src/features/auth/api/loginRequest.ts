import { sleep } from '@/shared/lib';
import { VALID_LOGIN, VALID_PASSWORD } from '../config';

export type Credentials = { login: string; password: string };

export async function loginRequest({ login, password }: Credentials): Promise<string> {
  await sleep(500);
  if (login.trim() === VALID_LOGIN && password === VALID_PASSWORD) return login.trim();
  throw new Error('Неверный логин или пароль');
}
