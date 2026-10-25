import { ReactFlowProvider } from '@xyflow/react';
import { GraphCanvas } from '../../components/GraphCanvas/GraphCanvas';
import styles from './GraphPage.module.scss';

export function GraphPage() {
  return (
    <div className={styles.page}>
      <ReactFlowProvider>
        <GraphCanvas />
      </ReactFlowProvider>
    </div>
  );
}
