import { LoginForm } from '../../components/LoginForm/LoginForm';
import styles from './LoginPage.module.scss';

export function LoginPage() {
  return (
    <main className={styles.login}>
      <LoginForm />
    </main>
  );
}
