import { Button } from '@/shared/components';
import { HITS_TO_WIN, LEVELS_COUNT } from '../../constants';
import type { LevelResult as Result } from '../../types';
import styles from './LevelResult.module.scss';

/** onContinue — следующий уровень после победы или тот же после проигрыша; onRestart — с первого уровня. */
type LevelResultProps = { result: Result; hits: number; onContinue: () => void; onRestart: () => void };

/** Итог уровня поверх канваса: поздравление или «не хватило» и что делать дальше. */
export function LevelResult({ result, hits, onContinue, onRestart }: LevelResultProps) {
  const { kind, level } = result;
  const last = level === LEVELS_COUNT;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        {kind === 'won' ? (
          <>
            <h2 className={styles.titleWon}>{last ? 'Игра пройдена!' : `Уровень ${level} пройден!`}</h2>
            <p className={styles.text}>
              {last ? `Все ${LEVELS_COUNT} уровней позади, поздравляю!` : `${HITS_TO_WIN} попаданий — так держать.`}
            </p>
            <div className={styles.actions}>
              {last ? (
                <Button onClick={onRestart}>Начать с 1-го уровня</Button>
              ) : (
                <Button onClick={onContinue}>Уровень {level + 1}</Button>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className={styles.titleLost}>Уровень {level} не пройден</h2>
            <p className={styles.text}>
              Не хватило попаданий: {hits} / {HITS_TO_WIN}
            </p>
            <div className={styles.actions}>
              <Button onClick={onContinue}>Ещё раз</Button>
              {level > 1 && (
                <Button variant="ghost" onClick={onRestart}>
                  Начать с 1-го уровня
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
