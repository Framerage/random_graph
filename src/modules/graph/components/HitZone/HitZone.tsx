import { GAP_Y, LANE_KEYS, ZONE_WIDTH } from '../../constants';
import type { Flash } from '../../types';
import styles from './HitZone.module.scss';

type HitZoneProps = { zoom: number; flash: Flash | null };

/** Зона попадания в центре экрана: по строке на дорожку, вспышка после нажатия. */
export function HitZone({ zoom, flash }: HitZoneProps) {
  return (
    <div className={styles.zone} style={{ width: ZONE_WIDTH * zoom, height: LANE_KEYS.length * GAP_Y * zoom }}>
      {LANE_KEYS.map((key, lane) => (
        <div key={key} className={styles.lane}>
          <span className={styles.key}>{key}</span>
          {flash?.lane === lane && <span key={flash.at} className={flash.ok ? styles.flashHit : styles.flashMiss} />}
        </div>
      ))}
    </div>
  );
}
