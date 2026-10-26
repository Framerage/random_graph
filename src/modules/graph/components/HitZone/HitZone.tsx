import { GAP_Y, LANE_KEYS } from '../../constants';
import type { Flash } from '../../types';
import styles from './HitZone.module.scss';

/** width — ширина зоны уровня в координатах графа. */
type HitZoneProps = { width: number; zoom: number; flash: Flash | null };

/** Зона попадания в центре экрана: по строке на дорожку, вспышка после нажатия. */
export function HitZone({ width, zoom, flash }: HitZoneProps) {
  return (
    <div className={styles.zone} style={{ width: width * zoom, height: LANE_KEYS.length * GAP_Y * zoom }}>
      {LANE_KEYS.map((key, lane) => (
        <div key={key} className={styles.lane}>
          <span className={styles.key}>{key}</span>
          {flash?.lane === lane && <span key={flash.at} className={flash.ok ? styles.flashHit : styles.flashMiss} />}
        </div>
      ))}
    </div>
  );
}
