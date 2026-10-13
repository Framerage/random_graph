import { useCallback, useEffect, useMemo, useReducer, useState, useSyncExternalStore } from 'react';
import type { FormEvent } from 'react';
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import type { Edge, Node, NodeProps, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import styles from './app.module.scss';

/* ========================================================================
 * Auth (фейковый API + TanStack Query)
 * ===================================================================== */

const SESSION_KEY = 'cyber-map:session';
const VALID_LOGIN = 'cuci';
const VALID_PASSWORD = '1313';

type Credentials = { login: string; password: string };

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function readSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSession(value: string | null) {
  try {
    if (value) localStorage.setItem(SESSION_KEY, value);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* localStorage может быть недоступен — не критично */
  }
}

async function loginRequest({ login, password }: Credentials): Promise<string> {
  await sleep(500);
  if (login.trim() === VALID_LOGIN && password === VALID_PASSWORD) return login.trim();
  throw new Error('Неверный логин или пароль');
}

function useSession() {
  return useQuery<string | null>({
    queryKey: ['session'],
    queryFn: readSession,
    initialData: readSession,
    staleTime: Infinity,
  });
}

function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, Credentials>({
    mutationFn: loginRequest,
    onSuccess: (user) => {
      writeSession(user);
      queryClient.setQueryData(['session'], user);
      navigate('/map');
    },
  });
}

function useLogout() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    writeSession(null);
    queryClient.setQueryData(['session'], null);
    navigate('/login');
  }, [queryClient]);
}

/* ========================================================================
 * Мини-роутер на hash (две страницы — отдельная библиотека не нужна)
 * ===================================================================== */

function subscribeToHash(callback: () => void) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

const getPath = () => window.location.hash.replace(/^#/, '') || '/';

function navigate(path: string) {
  window.location.hash = path;
}

function Router() {
  const path = useSyncExternalStore(subscribeToHash, getPath);
  const { data: user } = useSession();

  // Синхронизируем URL с состоянием авторизации
  useEffect(() => {
    if (!user && path !== '/login') navigate('/login');
    if (user && path !== '/map') navigate('/map');
  }, [user, path]);

  return user ? <MapPage user={user} /> : <LoginPage />;
}

/* ========================================================================
 * Страница логина
 * ===================================================================== */

function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const { mutate, isPending, error } = useLogin();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    mutate({ login, password });
  };

  return (
    <main className={styles.login}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <p className={styles.brand}> Random graph</p>
        <h1 className={styles.title}>Авторизация</h1>

        <label className={styles.field}>
          <span>Логин</span>
          <input
            className={styles.input}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span>Пароль</span>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <p className={styles.error}>{error.message}</p>}

        <button
          className={`${styles.btn} ${styles.btnBlock}`}
          type="submit"
          disabled={isPending || !login || !password}
        >
          {isPending ? 'Проверка...' : 'Войти'}
        </button>

        <p className={styles.hint}>Тестовый доступ: cuci / 1313</p>
      </form>
    </main>
  );
}

/* ========================================================================
 * Дерево узлов: состояние + раскладка
 * ===================================================================== */

const NODE_SIZE = 56;
const GAP_X = 84;
const GAP_Y = 110;
const MAX_DEPTH = 9; // 2^9 = 512 листьев максимум — граф остаётся лёгким

type TreeNode = { id: string; depth: number; children: string[]; side?: 'X' | 'Y' };
type TreeState = { nodes: Record<string, TreeNode>; nextId: number };
type TreeAction = { type: 'expand'; id: string } | { type: 'reset' };

const ROOT_ID = 'n0';

const createInitialTree = (): TreeState => ({
  nodes: { [ROOT_ID]: { id: ROOT_ID, depth: 0, children: [] } },
  nextId: 1,
});

function treeReducer(state: TreeState, action: TreeAction): TreeState {
  if (action.type === 'reset') return createInitialTree();

  const target = state.nodes[action.id];
  // Раскрываем только листья и только до максимальной глубины
  if (!target || target.children.length > 0 || target.depth >= MAX_DEPTH) return state;

  const leftId = `n${state.nextId}`;
  const rightId = `n${state.nextId + 1}`;
  const depth = target.depth + 1;

  return {
    nextId: state.nextId + 2,
    nodes: {
      ...state.nodes,
      [target.id]: { ...target, children: [leftId, rightId] },
      [leftId]: { id: leftId, depth, children: [], side: 'X' },
      [rightId]: { id: rightId, depth, children: [], side: 'Y' },
    },
  };
}

type OrbData = { label: string; leaf: boolean; root: boolean; maxed: boolean };
type OrbNode = Node<OrbData, 'orb'>;

/** Классическая раскладка дерева: листья по порядку слева направо, родитель — над центром детей. */
function buildGraph(tree: TreeState): { nodes: OrbNode[]; edges: Edge[] } {
  const xs: Record<string, number> = {};
  let leafIndex = 0;

  const walk = (id: string): number => {
    const node = tree.nodes[id];
    let x: number;
    if (node.children.length === 0) {
      x = leafIndex++ * GAP_X;
    } else {
      const childXs = node.children.map(walk);
      x = (childXs[0] + childXs[childXs.length - 1]) / 2;
    }
    xs[id] = x;
    return x;
  };
  walk(ROOT_ID);

  const nodes: OrbNode[] = [];
  const edges: Edge[] = [];

  for (const node of Object.values(tree.nodes)) {
    const leaf = node.children.length === 0;
    nodes.push({
      id: node.id,
      type: 'orb',
      position: { x: xs[node.id], y: node.depth * GAP_Y },
      width: NODE_SIZE,
      height: NODE_SIZE,
      data: {
        label: node.side ?? 'CORE',
        leaf,
        root: node.id === ROOT_ID,
        maxed: leaf && node.depth >= MAX_DEPTH,
      },
    });
    for (const childId of node.children) {
      edges.push({
        id: `e-${node.id}-${childId}`,
        source: node.id,
        target: childId,
        type: 'smoothstep',
        style: { stroke: '#2a7f8e', strokeWidth: 1.5 },
      });
    }
  }

  return { nodes, edges };
}

/* ========================================================================
 * Кастомный узел
 * ===================================================================== */

function OrbNodeView({ data }: NodeProps<OrbNode>) {
  const className = [
    styles.orb,
    data.leaf && styles.orbLeaf,
    data.root && styles.orbRoot,
    data.maxed && styles.orbMax,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}

// Объявлено вне компонента, чтобы ссылка была стабильной
const nodeTypes: NodeTypes = { orb: OrbNodeView };

/* ========================================================================
 * Страница карты
 * ===================================================================== */

function MapCanvas() {
  const [tree, dispatch] = useReducer(treeReducer, undefined, createInitialTree);
  const { fitView } = useReactFlow();
  const graph = useMemo(() => buildGraph(tree), [tree]);

  // После каждого изменения графа плавно вписываем его в экран
  useEffect(() => {
    const timer = setTimeout(() => fitView({ duration: 300, padding: 0.25, maxZoom: 1.1 }), 40);
    return () => clearTimeout(timer);
  }, [graph, fitView]);

  const handleNodeClick = useCallback((_: unknown, node: Node) => {
    dispatch({ type: 'expand', id: node.id });
  }, []);

  const depthMax = Math.max(...Object.values(tree.nodes).map((n) => n.depth));

  return (
    <ReactFlow
      className={styles.flow}
      colorMode="dark"
      nodes={graph.nodes}
      edges={graph.edges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      minZoom={0.05}
      maxZoom={1.5}
      onlyRenderVisibleElements
      fitView
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#1c2638" />
      <Controls showInteractive={false} />
      <Panel position="top-left">
        <div className={styles.stats}>
          узлов: <b>{graph.nodes.length}</b>
          <br />
          глубина: <b>{depthMax}</b> / {MAX_DEPTH}
        </div>
      </Panel>
      <Panel position="top-right">
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => dispatch({ type: 'reset' })}>
          Сбросить
        </button>
      </Panel>
    </ReactFlow>
  );
}

function MapPage({ user }: { user: string }) {
  const logout = useLogout();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.brand}>// net.map</p>
        <div className={styles.headerRight}>
          <span className={styles.user}>user: {user}</span>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={logout}>
            Выйти
          </button>
        </div>
      </header>
      <div className={styles.canvas}>
        <ReactFlowProvider>
          <MapCanvas />
        </ReactFlowProvider>
      </div>
    </div>
  );
}

/* ========================================================================
 * Root
 * ===================================================================== */

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}
