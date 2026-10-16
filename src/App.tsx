import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, FormEvent } from 'react';
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
  getSmoothStepPath,
  useReactFlow,
} from '@xyflow/react';
import type { Edge, EdgeProps, EdgeTypes, Node, NodeProps, NodeTypes } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import styles from './app.module.scss';
import { isMuted, playRow, setMuted, unlockAudio } from './sound';
import type { SoundNote } from './sound';

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

/**
 * bornAt — момент появления узла (performance.now()), от него считается анимация роста ветки.
 * pitch — ступень лада: у корня 0, ветка X — шаг вниз, ветка Y — шаг вверх.
 */
type TreeNode = { id: string; depth: number; children: string[]; side?: 'X' | 'Y'; bornAt: number; pitch: number };
type TreeState = { nodes: Record<string, TreeNode>; nextId: number };
type TreeAction =
  | { type: 'expand'; id: string; at: number }
  | { type: 'reset' }
  | { type: 'expandMany'; ids: string[]; at: number };

/** Сколько растёт ветка к новому узлу, мс. Строки при Random идут одна за другой с тем же шагом. */
const ROW_DELAY = 500;
/** Сколько «проявляется» узел, когда до него дотянулась ветка, мс. */
const NODE_APPEAR = 250;

const ROOT_ID = 'n0';

const createInitialTree = (): TreeState => ({
  // Корень существовал «всегда» — его не анимируем
  nodes: { [ROOT_ID]: { id: ROOT_ID, depth: 0, children: [], bornAt: -Infinity, pitch: 0 } },
  nextId: 1,
});

/** Раскрывает лист: добавляет ему двух детей X и Y. Возвращает исходное состояние, если раскрыть нельзя. */
function expandNode(state: TreeState, id: string, bornAt: number): TreeState {
  const target = state.nodes[id];
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
      [leftId]: { id: leftId, depth, children: [], side: 'X', bornAt, pitch: target.pitch - 1 },
      [rightId]: { id: rightId, depth, children: [], side: 'Y', bornAt, pitch: target.pitch + 1 },
    },
  };
}

/** Случайное целое от min до max включительно. */
const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** Перемешивание Фишера — Йетса, возвращает новый массив. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Строит план случайного дерева: для каждой строки список id узлов, которые надо раскрыть.
 * На каждой строке выбираем, сколько узлов активировать: от 1 до числа узлов в строке.
 * Затем берём столько разных случайных узлов. Их дети образуют следующую строку.
 *
 * id детей детерминированы порядком раскрытия, поэтому план, проигранный по шагам
 * на чистом дереве, даст ровно те же id, что и здесь при симуляции.
 */
function createRandomPlan(): string[][] {
  let tree = createInitialTree();
  let row = [ROOT_ID];
  const plan: string[][] = [];

  for (let depth = 0; depth < MAX_DEPTH && row.length > 0; depth++) {
    const activeCount = randomInt(1, row.length);
    const pickedSet = new Set(shuffle(row).slice(0, activeCount));
    // Идём по строке слева направо, чтобы новые id тоже шли слева направо
    const picked = row.filter((id) => pickedSet.has(id));

    const nextRow: string[] = [];
    for (const id of picked) {
      tree = expandNode(tree, id, 0);
      nextRow.push(...tree.nodes[id].children);
    }
    plan.push(picked);
    row = nextRow;
  }

  return plan;
}

/**
 * Превращает готовое дерево обратно в план по строкам, чтобы его можно было проиграть заново.
 * У дерева, собранного кликами, id идут в порядке кликов, а план раскрывает строку за строкой,
 * поэтому id пересчитываем так, как их выдаст проигрывание на чистом дереве.
 */
function planFromTree(source: TreeState): string[][] {
  let tree = createInitialTree();
  const idMap: Record<string, string> = { [ROOT_ID]: ROOT_ID };
  let row = [ROOT_ID]; // id исходного дерева, слева направо
  const plan: string[][] = [];

  while (row.length > 0) {
    const picked = row.filter((id) => source.nodes[id].children.length > 0);
    if (picked.length === 0) break;

    const nextRow: string[] = [];
    for (const id of picked) {
      tree = expandNode(tree, idMap[id], 0);
      const children = source.nodes[id].children;
      tree.nodes[idMap[id]].children.forEach((newId, i) => (idMap[children[i]] = newId));
      nextRow.push(...children);
    }
    plan.push(picked.map((id) => idMap[id]));
    row = nextRow;
  }

  return plan;
}

function treeReducer(state: TreeState, action: TreeAction): TreeState {
  switch (action.type) {
    case 'reset':
      return createInitialTree();
    case 'expand':
      return expandNode(state, action.id, action.at);
    case 'expandMany':
      return action.ids.reduce((tree, id) => expandNode(tree, id, action.at), state);
  }
}

type OrbData = { label: string; leaf: boolean; root: boolean; maxed: boolean; bornAt: number };
type OrbNode = Node<OrbData, 'orb'>;
type GrowEdgeData = { bornAt: number };
type GrowEdge = Edge<GrowEdgeData, 'grow'>;

/** Классическая раскладка дерева: листья по порядку слева направо, родитель — над центром детей. */
function buildGraph(tree: TreeState): { nodes: OrbNode[]; edges: GrowEdge[] } {
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
  const edges: GrowEdge[] = [];

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
        bornAt: node.bornAt,
      },
    });
    for (const childId of node.children) {
      edges.push({
        id: `e-${node.id}-${childId}`,
        source: node.id,
        target: childId,
        type: 'grow',
        data: { bornAt: tree.nodes[childId].bornAt },
      });
    }
  }

  return { nodes, edges };
}

/** Ноты дерева по строкам: строка d звучит, когда проявляются узлы глубины d. Внутри строки — слева направо. */
function soundRows(tree: TreeState): SoundNote[][] {
  const rows: SoundNote[][] = [];
  const sorted = [...buildGraph(tree).nodes].sort((a, b) => a.position.x - b.position.x);
  for (const node of sorted) {
    const { pitch, depth } = tree.nodes[node.id];
    (rows[depth] ??= []).push({ pitch, depth, accent: node.data.maxed });
  }
  return rows;
}

/* ========================================================================
 * Кастомные узел и ветка
 * ===================================================================== */

/**
 * Стиль анимации, «замороженный» на момент монтирования.
 * Узлы и ветки перемонтируются (onlyRenderVisibleElements, панорамирование),
 * поэтому анимация не стартует с нуля, а продолжается с того места, где должна быть
 * по bornAt. Если она уже закончилась — просто выключаем её.
 */
function useGrowStyle(bornAt: number, delay: number, duration: number): CSSProperties {
  const [style] = useState<CSSProperties>(() => {
    const elapsed = performance.now() - bornAt;
    if (elapsed >= delay + duration) return { animation: 'none' };
    return { animationDelay: `${delay - elapsed}ms`, animationDuration: `${duration}ms` };
  });
  return style;
}

function OrbNodeView({ data }: NodeProps<OrbNode>) {
  // Узел проявляется, когда до него дотянулась ветка
  const growStyle = useGrowStyle(data.bornAt, ROW_DELAY, NODE_APPEAR);
  const className = [
    styles.orb,
    styles.orbAppear,
    data.leaf && styles.orbLeaf,
    data.root && styles.orbRoot,
    data.maxed && styles.orbMax,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} style={growStyle}>
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}

/** Ветка, которая «прорастает» от родителя к ребёнку за ROW_DELAY. */
function GrowEdgeView({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<GrowEdge>) {
  const growStyle = useGrowStyle(data?.bornAt ?? -Infinity, 0, ROW_DELAY);
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  // pathLength=1 нормирует длину пути: dash-анимация не зависит от реальной длины ветки
  return (
    <path
      className={`react-flow__edge-path ${styles.growEdge}`}
      d={path}
      pathLength={1}
      style={{ stroke: '#2a7f8e', strokeWidth: 1.5, ...growStyle }}
    />
  );
}

// Объявлено вне компонента, чтобы ссылка была стабильной
const nodeTypes: NodeTypes = { orb: OrbNodeView };
const edgeTypes: EdgeTypes = { grow: GrowEdgeView };

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

  // Таймеры анимации Random и флаг, что она идёт
  const timersRef = useRef<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const stopAnimation = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setIsAnimating(false);
  }, []);

  // Чистим таймеры при уходе со страницы
  useEffect(() => stopAnimation, [stopAnimation]);

  /** Сбрасывает дерево и проигрывает план с нуля: анимация роста + звук. */
  const playPlan = useCallback((plan: string[][]) => {
    stopAnimation();
    dispatch({ type: 'reset' });

    // План считается заранее, а строки дорисовываются по одной: ветки строки растут
    // ROW_DELAY мс, и как только они дотянулись до детей, начинает расти следующая строка.
    // Первая строка тоже идёт через таймер, чтобы сброс успел отрисоваться отдельно
    // и узлы с теми же id смонтировались заново (иначе анимация не запустится).
    // Итоговое дерево известно заранее — по нему раскладываем ноты по строкам
    const rows = soundRows(
      plan.reduce((tree, ids) => treeReducer(tree, { type: 'expandMany', ids, at: 0 }), createInitialTree()),
    );
    unlockAudio();
    setIsAnimating(true);
    timersRef.current = plan.map((ids, index) =>
      window.setTimeout(() => dispatch({ type: 'expandMany', ids, at: performance.now() }), index * ROW_DELAY),
    );
    // Узлы глубины d проявляются ровно в d * ROW_DELAY — в этот момент и звучит их строка
    rows.forEach((notes, depth) =>
      timersRef.current.push(window.setTimeout(() => playRow(notes), depth * ROW_DELAY)),
    );
    timersRef.current.push(window.setTimeout(() => setIsAnimating(false), plan.length * ROW_DELAY));
  }, [stopAnimation]);

  const handleRandom = useCallback(() => playPlan(createRandomPlan()), [playPlan]);

  // Переигрывает то дерево, что сейчас на экране, — и случайное, и собранное кликами
  const handleReplay = useCallback(() => playPlan(planFromTree(tree)), [playPlan, tree]);

  const handleReset = useCallback(() => {
    stopAnimation();
    dispatch({ type: 'reset' });
  }, [stopAnimation]);

  const handleNodeClick = useCallback(
    (_: unknown, node: Node) => {
      // Во время анимации клики блокируем: ручное раскрытие сдвинуло бы id и сломало план
      if (isAnimating) return;
      const clicked = tree.nodes[node.id];
      unlockAudio();
      playRow([{ pitch: clicked.pitch, depth: clicked.depth }]);
      dispatch({ type: 'expand', id: node.id, at: performance.now() });
    },
    [isAnimating, tree],
  );

  // Состояние кнопки берём из модуля звука: он живёт дольше компонента (например, после выхода и входа)
  const [soundOn, setSoundOn] = useState(() => !isMuted());
  const toggleSound = () => {
    setMuted(soundOn);
    setSoundOn(!soundOn);
  };

  const depthMax = Math.max(...Object.values(tree.nodes).map((n) => n.depth));

  return (
    <ReactFlow
      className={styles.flow}
      colorMode="dark"
      nodes={graph.nodes}
      edges={graph.edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
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
      <Panel position="top-right" className={styles.panelActions}>
        {/* Повторное нажатие во время отрисовки начинает новое дерево */}
        <button className={styles.btn} onClick={handleRandom}>
          {isAnimating ? 'Рисую...' : 'Random'}
        </button>
        <button
          className={`${styles.btn} ${styles.btnGhost}`}
          onClick={handleReplay}
          disabled={isAnimating || tree.nodes[ROOT_ID].children.length === 0}
        >
          Переиграть
        </button>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={handleReset}>
          Сбросить
        </button>
        <button
          className={`${styles.btn} ${styles.btnGhost}`}
          onClick={toggleSound}
          title={soundOn ? 'Выключить звук' : 'Включить звук'}
        >
          {soundOn ? '🔊' : '🔇'}
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
