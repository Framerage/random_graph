import { LoginForm } from '@/features/auth';
import styles from './LoginPage.module.scss';

export function LoginPage() {
  return (
    <main className={styles.login}>
      <LoginForm />
    </main>
  );
}
