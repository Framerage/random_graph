import type { PlayerStats as Stats } from '../../types';
import styles from './PlayerStats.module.scss';

type PlayerStatsProps = { stats: Stats; onClear: () => void };

const formatDate = (at: number) =>
  new Date(at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Статистика игрока за всё время: когда последний раз прошёл игру, сколько попыток и промахов. */
export function PlayerStats({ stats, onClear }: PlayerStatsProps) {
  const handleClear = () => {
    if (window.confirm('Очистить статистику? Уровень тоже начнётся с 1-го.')) onClear();
  };

  return (
    <div className={styles.stats}>
      <div className={styles.title}>Статистика</div>
      игра пройдена: <b>{stats.completedAt === null ? '—' : formatDate(stats.completedAt)}</b>
      <br />
      попыток: <b>{stats.attempts}</b>
      <br />
      промахов: <b>{stats.misses}</b>
      <button type="button" className={styles.clear} onClick={handleClear}>
        Очистить
      </button>
    </div>
  );
}
