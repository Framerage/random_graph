import { useCallback, useMemo, useReducer } from 'react';
import { Background, BackgroundVariant, Controls, Panel, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import {
  buildGraph,
  canExpand,
  createInitialTree,
  createRandomPlan,
  edgeTypes,
  nodeNote,
  nodeTypes,
  treeDepth,
  treeReducer,
} from '@/entities/tree';
import type { Plan } from '@/entities/tree';
import { HitZone, useRhythmGame } from '@/features/rhythm-game';
import { SoundToggle } from '@/features/sound-toggle';
import { playRow, unlockAudio } from '@/shared/audio';
import { Button } from '@/shared/ui';
import { useAutoFit } from '../model/useAutoFit';
import { usePlayback } from '../model/usePlayback';
import { StatsPanel } from './StatsPanel';
import styles from './TreeMap.module.scss';

function TreeMapCanvas() {
  const [tree, dispatch] = useReducer(treeReducer, undefined, createInitialTree);
  const graph = useMemo(() => buildGraph(tree), [tree]);

  const { startedAt, isPlaying, play, stop } = usePlayback(dispatch);
  const { nodes, score, flash, zoom, reset: resetGame } = useRhythmGame(graph.nodes, startedAt);
  useAutoFit(graph.nodes, !isPlaying);

  /** Сбрасывает дерево и проигрывает план с нуля: рост, звук и игра. */
  const playPlan = useCallback(
    (plan: Plan) => {
      resetGame();
      play(plan);
    },
    [resetGame, play],
  );

  const handleRandom = useCallback(() => playPlan(createRandomPlan()), [playPlan]);

  // Переигрывает всю историю роста с ядра — и случайную, и собранную кликами
  const handleReplay = useCallback(() => playPlan(tree.log), [playPlan, tree]);

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
      dispatch({ type: 'expand', id: node.id, at: performance.now() });
    },
    [isPlaying, tree],
  );

  return (
    <ReactFlow
      className={styles.flow}
      // Режим игры читают стили узлов: ярко горят только ноты
      data-mode={isPlaying ? 'game' : undefined}
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
        <Button variant="ghost" onClick={handleReplay} disabled={isPlaying || tree.log.length === 0}>
          Переиграть
        </Button>
        <Button variant="ghost" onClick={handleReset}>
          Сбросить
        </Button>
        <SoundToggle />
      </Panel>
    </ReactFlow>
  );
}

/** Карта дерева с игрой. Провайдер внутри: хукам канваса нужен контекст React Flow. */
export function TreeMap() {
  return (
    <ReactFlowProvider>
      <TreeMapCanvas />
    </ReactFlowProvider>
  );
}
