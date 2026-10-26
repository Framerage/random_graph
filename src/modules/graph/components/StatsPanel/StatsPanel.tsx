import { HITS_TO_WIN, LEVELS_COUNT, MAX_DEPTH } from '../../constants';
import type { Score } from '../../types';
import styles from './StatsPanel.module.scss';

type StatsPanelProps = { nodeCount: number; depth: number; level: number; score: Score; isPlaying: boolean };

export function StatsPanel({ nodeCount, depth, level, score, isPlaying }: StatsPanelProps) {
  const played = score.hits + score.misses + score.wrong > 0;

  return (
    <div className={styles.stats}>
      уровень: <b>{level}</b> / {LEVELS_COUNT}
      <br />
      узлов: <b>{nodeCount}</b>
      <br />
      глубина: <b>{depth}</b> / {MAX_DEPTH}
      {(isPlaying || played) && (
        <>
          <br />
          попал: <b className={styles.statHit}>{score.hits}</b> / {HITS_TO_WIN} · пропустил: <b>{score.misses}</b> ·
          мимо: <b>{score.wrong}</b>
        </>
      )}
    </div>
  );
}
