import type { ReactNode } from 'react';
import { useLogout } from '@/modules/auth';
import { Button } from '@/shared/components';
import styles from './MainLayout.module.scss';

type MainLayoutProps = { user: string; children: ReactNode };

/** Каркас для авторизованных страниц: шапка с пользователем и выходом, ниже — страница модуля. */
export function MainLayout({ user, children }: MainLayoutProps) {
  const logout = useLogout();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.brand}>// net.map</p>
        <div className={styles.headerRight}>
          <span className={styles.user}>user: {user}</span>
          <Button variant="ghost" onClick={logout}>
            Выйти
          </Button>
        </div>
      </header>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
