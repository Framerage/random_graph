import { useCallback, useMemo, useReducer } from 'react';
import { Background, BackgroundVariant, Controls, Panel, ReactFlow } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { playRow, unlockAudio } from '@/shared/audio';
import { Button, SoundToggle } from '@/shared/components';
import { useAutoFit } from '../../hooks/useAutoFit';
import { usePauseHotkey } from '../../hooks/usePauseHotkey';
import { usePlayback } from '../../hooks/usePlayback';
import { useRhythmGame } from '../../hooks/useRhythmGame';
import { buildGraph } from '../../model/buildGraph';
import { now } from '../../model/clock';
import { nodeNote } from '../../model/notes';
import { createRandomPlan } from '../../model/plan';
import { treeDepth } from '../../model/selectors';
import { canExpand, createInitialTree, treeReducer } from '../../model/tree';
import { HitZone } from '../HitZone/HitZone';
import { StatsPanel } from '../StatsPanel/StatsPanel';
import { edgeTypes, nodeTypes } from './flowTypes';
import styles from './GraphCanvas.module.scss';

/** Канвас дерева с игрой. Нужен контекст ReactFlowProvider. */
export function GraphCanvas() {
  const [tree, dispatch] = useReducer(treeReducer, undefined, createInitialTree);
  const graph = useMemo(() => buildGraph(tree), [tree]);

  const { startedAt, isPlaying, isPaused, play, stop, togglePause } = usePlayback(dispatch);
  const { nodes, score, flash, zoom, reset: resetGame } = useRhythmGame(graph.nodes, startedAt, isPaused);
  useAutoFit(graph.nodes, !isPlaying);
  usePauseHotkey(togglePause, isPlaying);

  /** Сбрасывает дерево и проигрывает случайный план с нуля: рост, звук и игра. */
  const handleRandom = useCallback(() => {
    resetGame();
    play(createRandomPlan());
  }, [resetGame, play]);

  const handleReset = useCallback(() => {
    stop();
    resetGame();
    dispatch({ type: 'reset' });
  }, [stop, resetGame]);

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

      {isPlaying && <HitZone zoom={zoom} flash={flash} />}

      <Panel position="top-left">
        <StatsPanel
          nodeCount={graph.nodes.filter((node) => !node.data.exiting).length}
          depth={treeDepth(tree)}
          score={score}
          isPlaying={isPlaying}
        />
      </Panel>
      <Panel position="top-right" className={styles.actions}>
        {/* Повторное нажатие во время отрисовки начинает новое дерево */}
        <Button onClick={handleRandom}>{isPlaying ? 'Играю...' : 'Random'}</Button>
        <Button variant="ghost" onClick={togglePause} disabled={!isPlaying} title="Пробел">
          {isPaused ? 'Продолжить' : 'Пауза'}
        </Button>
        <Button variant="ghost" onClick={handleReset}>
          Сбросить
        </Button>
        <SoundToggle />
      </Panel>
    </ReactFlow>
  );
}
