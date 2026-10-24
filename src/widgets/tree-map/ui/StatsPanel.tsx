import { MAX_DEPTH } from '@/entities/tree';
import type { Score } from '@/features/rhythm-game';
import styles from './TreeMap.module.scss';

type StatsPanelProps = { nodeCount: number; depth: number; score: Score; isPlaying: boolean };

export function StatsPanel({ nodeCount, depth, score, isPlaying }: StatsPanelProps) {
  const played = score.hits + score.misses + score.wrong > 0;

  return (
    <div className={styles.stats}>
      узлов: <b>{nodeCount}</b>
      <br />
      глубина: <b>{depth}</b> / {MAX_DEPTH}
      {(isPlaying || played) && (
        <>
          <br />
          попал: <b className={styles.statHit}>{score.hits}</b> · пропустил: <b>{score.misses}</b> · мимо:{' '}
          <b>{score.wrong}</b>
        </>
      )}
    </div>
  );
}
