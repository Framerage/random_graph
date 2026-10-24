import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/shared/ui';
import { VALID_LOGIN, VALID_PASSWORD } from '../config';
import { useLogin } from '../model/hooks';
import styles from './LoginForm.module.scss';

export function LoginForm() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const { mutate, isPending, error } = useLogin();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutate({ login, password });
  };

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <p className={styles.brand}> Random graph</p>
      <h1 className={styles.title}>Авторизация</h1>

      <label className={styles.field}>
        <span>Логин</span>
        <input
          className={styles.input}
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoComplete="username"
          autoFocus
        />
      </label>

      <label className={styles.field}>
        <span>Пароль</span>
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </label>

      {error && <p className={styles.error}>{error.message}</p>}

      <Button type="submit" block disabled={isPending || !login || !password}>
        {isPending ? 'Проверка...' : 'Войти'}
      </Button>

      <p className={styles.hint}>
        Тестовый доступ: {VALID_LOGIN} / {VALID_PASSWORD}
      </p>
    </form>
  );
}
