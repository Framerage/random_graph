import { useCallback, useMemo, useReducer, useState } from 'react';
import { Background, BackgroundVariant, Controls, Panel, ReactFlow } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { playRow, unlockAudio } from '@/shared/audio';
import { Button, SoundToggle } from '@/shared/components';
import { levelConfig } from '../../constants';
import { useAutoFit } from '../../hooks/useAutoFit';
import { usePauseHotkey } from '../../hooks/usePauseHotkey';
import { usePlayback } from '../../hooks/usePlayback';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { useRhythmGame } from '../../hooks/useRhythmGame';
import { buildGraph } from '../../model/buildGraph';
import { now } from '../../model/clock';
import { nodeNote } from '../../model/notes';
import { createRandomPlan } from '../../model/plan';
import { treeDepth } from '../../model/selectors';
import { withAttempt, withMisses, withWin } from '../../model/stats';
import { canExpand, createInitialTree, treeReducer } from '../../model/tree';
import type { LevelResult as Result } from '../../types';
import { HitZone } from '../HitZone/HitZone';
import { LevelResult } from '../LevelResult/LevelResult';
import { PlayerStats } from '../PlayerStats/PlayerStats';
import { StatsPanel } from '../StatsPanel/StatsPanel';
import { edgeTypes, nodeTypes } from './flowTypes';
import styles from './GraphCanvas.module.scss';

/** Канвас дерева с игрой. Нужен контекст ReactFlowProvider. */
export function GraphCanvas() {
  const { stats, update: updateStats, clear: clearStats } = usePlayerStats();
  // Уровень текущей или последней попытки; null — ещё не играли, тогда показываем сохранённый
  const [activeLevel, setActiveLevel] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const level = activeLevel ?? stats.level;
  // Шаг столбцов, окно, подготовка и темп — от уровня; вне игры дерево раскладывается и растёт так же
  const config = levelConfig(level);

  const [tree, dispatch] = useReducer(treeReducer, config.visibleColumns, createInitialTree);
  // config — элемент LEVELS, ссылка стабильна, пока не сменился уровень
  const graph = useMemo(() => buildGraph(tree, config), [tree, config]);

  const { startedAt, isPlaying, isPaused, play, stop, pause, togglePause } = usePlayback(dispatch);

  /** Набрано нужное число попаданий: замораживаем игру и переходим на следующий уровень в статистике. */
  const handleWin = useCallback(() => {
    pause();
    setResult({ kind: 'won', level });
    updateStats((s) => withWin(s, Date.now()));
  }, [pause, level, updateStats]);

  const handleMiss = useCallback((count: number) => updateStats((s) => withMisses(s, count)), [updateStats]);

  const {
    nodes,
    score,
    flash,
    zoom,
    reset: resetGame,
  } = useRhythmGame(graph.nodes, startedAt, isPaused, { level: config, onMiss: handleMiss, onWin: handleWin });
  useAutoFit(graph.nodes, !isPlaying);
  // На экране итога пауза не снимается: игра стоит до выбора следующего шага
  usePauseHotkey(togglePause, isPlaying && !result);

  /** Сбрасывает дерево и проигрывает случайный план уровня с нуля: рост, звук и игра. */
  const startLevel = useCallback(
    (next: number) => {
      resetGame();
      setResult(null);
      setActiveLevel(next);
      updateStats((s) => withAttempt(s, next));
      // План доиграл, а попаданий не хватило — победа раньше поставила бы игру на паузу
      play(createRandomPlan(), levelConfig(next), () => setResult({ kind: 'lost', level: next }));
    },
    [resetGame, updateStats, play],
  );

  const handleRandom = useCallback(() => startLevel(level), [startLevel, level]);
  const handleContinue = useCallback(() => startLevel(stats.level), [startLevel, stats.level]);
  const handleRestart = useCallback(() => startLevel(1), [startLevel]);

  const handleReset = useCallback(() => {
    stop();
    resetGame();
    setResult(null);
    setActiveLevel(null);
    updateStats((s) => ({ ...s, level: 1 }));
    dispatch({ type: 'reset', visibleColumns: levelConfig(1).visibleColumns });
  }, [stop, resetGame, updateStats]);

  const handleClearStats = useCallback(() => {
    clearStats();
    if (!isPlaying) setActiveLevel(null);
  }, [clearStats, isPlaying]);

  const handleNodeClick = useCallback(
    (_: unknown, node: Node) => {
      // Во время игры клики блокируем: ручное раскрытие вмешалось бы в план
      if (isPlaying || !canExpand(tree, node.id)) return;
      unlockAudio();
      playRow([nodeNote(tree.nodes[node.id])]);
      dispatch({ type: 'expand', id: node.id, at: now() });
    },
    [isPlaying, tree],
  );

  return (
    <ReactFlow
      className={styles.flow}
      // Режим игры читают стили узлов: ярко горят только ноты
      data-mode={isPlaying ? 'game' : undefined}
      // На паузе стили замораживают CSS-анимации роста
      data-paused={isPaused ? '' : undefined}
      colorMode="dark"
      nodes={nodes}
      edges={graph.edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={handleNodeClick}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag={!isPlaying}
      zoomOnScroll={!isPlaying}
      zoomOnDoubleClick={!isPlaying}
      minZoom={0.05}
      maxZoom={1.5}
      onlyRenderVisibleElements
      fitView
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#1c2638" />
      <Controls showInteractive={false} />

      {isPlaying && <HitZone width={config.zoneWidth} zoom={zoom} flash={flash} />}

      <Panel position="top-left">
        <StatsPanel
          nodeCount={graph.nodes.filter((node) => !node.data.exiting).length}
          depth={treeDepth(tree)}
          level={level}
          score={score}
          isPlaying={isPlaying}
        />
      </Panel>
      <Panel position="top-right" className={styles.side}>
        <div className={styles.actions}>
          {/* Повторное нажатие во время отрисовки начинает уровень заново */}
          <Button onClick={handleRandom}>{isPlaying ? 'Играю...' : 'Random'}</Button>
          <Button variant="ghost" onClick={togglePause} disabled={!isPlaying || Boolean(result)} title="Пробел">
            {isPaused ? 'Продолжить' : 'Пауза'}
          </Button>
          <Button variant="ghost" onClick={handleReset}>
            Сбросить
          </Button>
          <SoundToggle />
        </div>
        <PlayerStats stats={stats} onClear={handleClearStats} />
      </Panel>

      {result && (
        <LevelResult result={result} hits={score.hits} onContinue={handleContinue} onRestart={handleRestart} />
      )}
    </ReactFlow>
  );
}
