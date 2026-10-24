import { useLogout } from '@/features/auth';
import { Button } from '@/shared/ui';
import { TreeMap } from '@/widgets/tree-map';
import styles from './MapPage.module.scss';

export function MapPage({ user }: { user: string }) {
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
      <div className={styles.canvas}>
        <TreeMap />
      </div>
    </div>
  );
}
