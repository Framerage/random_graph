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
/** Расстояние между столбцами (уровнями дерева). */
const GAP_X = 130;
/** Расстояние между узлами внутри столбца. */
const GAP_Y = 84;
const MAX_DEPTH = 30;
/**
 * Сколько столбцов видно и хранится в памяти. Когда появляется новый столбец сверх лимита,
 * самый левый гаснет, а следующий за ним удаляется из состояния насовсем.
 */
const VISIBLE_COLUMNS = 10;
/** Сколько узлов помещается в один столбец. Дети появляются парами, поэтому раскрыть в столбце можно не больше двух узлов. */
const MAX_PER_COLUMN = 4;

/**
 * bornAt — момент появления узла (performance.now()), от него считается анимация роста ветки.
 * pitch — ступень лада: у корня 0, ветка X — шаг вниз, ветка Y — шаг вверх.
 */
type TreeNode = { id: string; depth: number; children: string[]; side?: 'X' | 'Y'; bornAt: number; pitch: number };
/** Одно раскрытие: какой узел раскрыли и какие id получили его дети. */
type PlanStep = { id: string; children: [string, string] };
/** План роста по столбцам: plan[d] — раскрытия узлов глубины d. */
type Plan = PlanStep[][];
/**
 * head — самый левый хранимый столбец по порядку сверху вниз. Его родителей уже нет в памяти,
 * поэтому порядок нельзя вывести из дерева и мы его запоминаем.
 * firstDepth — глубина первого видимого столбца. Столбец перед ним (если есть) — уходящий: он гаснет.
 * log — история раскрытий для «Переиграть». Ноды из неё не восстанавливаются, это только id: два шага на столбец.
 */
type TreeState = {
  nodes: Record<string, TreeNode>;
  nextId: number;
  head: string[];
  firstDepth: number;
  log: Plan;
};
type TreeAction =
  | { type: 'expand'; id: string; at: number }
  | { type: 'reset' }
  | { type: 'expandMany'; steps: PlanStep[]; at: number };

/** Сколько растёт ветка к новому узлу, мс. Столбцы при Random идут один за другим с тем же шагом. */
const ROW_DELAY = 500;
/** Сколько «проявляется» узел, когда до него дотянулась ветка, мс. */
const NODE_APPEAR = 250;

const ROOT_ID = 'n0';

const createInitialTree = (): TreeState => ({
  // Корень существовал «всегда» — его не анимируем
  nodes: { [ROOT_ID]: { id: ROOT_ID, depth: 0, children: [], bornAt: -Infinity, pitch: 0 } },
  nextId: 1,
  head: [ROOT_ID],
  firstDepth: 0,
  log: [],
});

/** Сколько узлов в каждом столбце: индекс — глубина. */
function columnSizes(state: TreeState): number[] {
  const sizes: number[] = [];
  for (const node of Object.values(state.nodes)) sizes[node.depth] = (sizes[node.depth] ?? 0) + 1;
  return sizes;
}

/** Можно ли раскрыть узел: это лист, глубина не максимальная и в следующем столбце есть место для двух детей. */
function canExpand(state: TreeState, id: string, sizes = columnSizes(state)): boolean {
  const target = state.nodes[id];
  if (!target || target.children.length > 0 || target.depth >= MAX_DEPTH) return false;
  // Уходящий столбец раскрывать нельзя
  if (target.depth < state.firstDepth) return false;
  return (sizes[target.depth + 1] ?? 0) + 2 <= MAX_PER_COLUMN;
}

/**
 * Раскрывает лист: добавляет ему двух детей X и Y. Возвращает исходное состояние, если раскрыть нельзя.
 * childIds передаются при проигрывании плана, чтобы id совпали с исходными.
 */
function expandNode(state: TreeState, id: string, bornAt: number, childIds?: [string, string]): TreeState {
  if (!canExpand(state, id)) return state;
  const target = state.nodes[id];

  const [leftId, rightId] = childIds ?? [`n${state.nextId}`, `n${state.nextId + 1}`];
  const depth = target.depth + 1;
  const log = [...state.log];
  log[target.depth] = [...(log[target.depth] ?? []), { id, children: [leftId, rightId] }];

  return shiftWindow({
    ...state,
    nextId: state.nextId + 2,
    log,
    nodes: {
      ...state.nodes,
      [target.id]: { ...target, children: [leftId, rightId] },
      [leftId]: { id: leftId, depth, children: [], side: 'X', bornAt, pitch: target.pitch - 1 },
      [rightId]: { id: rightId, depth, children: [], side: 'Y', bornAt, pitch: target.pitch + 1 },
    },
  });
}

/**
 * Скользящее окно: если столбцов стало больше VISIBLE_COLUMNS, сдвигаем firstDepth.
 * Столбец перед окном остаётся как уходящий (он плавно гаснет), всё, что левее, удаляется.
 * Так в памяти не больше VISIBLE_COLUMNS + 1 столбца, то есть не больше 44 узлов.
 */
function shiftWindow(state: TreeState): TreeState {
  const columns = treeColumns(state);
  const lastDepth = state.nodes[columns[columns.length - 1][0]].depth;
  const firstDepth = lastDepth - VISIBLE_COLUMNS + 1;
  if (firstDepth <= state.firstDepth) return state;

  const headDepth = state.nodes[state.head[0]].depth;
  const kept = columns.slice(Math.max(firstDepth - 1 - headDepth, 0));
  const nodes: Record<string, TreeNode> = {};
  for (const id of kept.flat()) nodes[id] = state.nodes[id];

  return { ...state, nodes, head: kept[0], firstDepth };
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
 * Строит план случайного дерева: для каждого столбца список раскрытий.
 * В каждом столбце выбираем, сколько узлов активировать: от 1 до числа узлов в столбце,
 * но не больше MAX_PER_COLUMN / 2, чтобы следующий столбец уместил всех детей.
 * Затем берём столько разных случайных узлов. Их дети образуют следующий столбец.
 * Дерево при этом симулируется целиком, с тем же скользящим окном, а план — это его log.
 */
function createRandomPlan(): Plan {
  let tree = createInitialTree();
  let row = [ROOT_ID];

  for (let depth = 0; depth < MAX_DEPTH && row.length > 0; depth++) {
    const activeCount = randomInt(1, Math.min(row.length, MAX_PER_COLUMN / 2));
    const pickedSet = new Set(shuffle(row).slice(0, activeCount));
    // Идём по столбцу сверху вниз, чтобы новые id тоже шли сверху вниз
    const picked = row.filter((id) => pickedSet.has(id));

    const nextRow: string[] = [];
    for (const id of picked) {
      tree = expandNode(tree, id, 0);
      nextRow.push(...tree.nodes[id].children);
    }
    row = nextRow;
  }

  return tree.log;
}

function treeReducer(state: TreeState, action: TreeAction): TreeState {
  switch (action.type) {
    case 'reset':
      return createInitialTree();
    case 'expand':
      return expandNode(state, action.id, action.at);
    case 'expandMany':
      return action.steps.reduce((tree, step) => expandNode(tree, step.id, action.at, step.children), state);
  }
}

/**
 * maxed — лист на максимальной глубине; blocked — лист, для детей которого нет места в следующем столбце;
 * exiting — узел уходящего столбца, он гаснет и при следующем сдвиге окна удаляется.
 */
type OrbData = {
  label: string;
  leaf: boolean;
  root: boolean;
  maxed: boolean;
  blocked: boolean;
  exiting: boolean;
  bornAt: number;
};
type OrbNode = Node<OrbData, 'orb'>;
type GrowEdgeData = { bornAt: number; exiting: boolean };
type GrowEdge = Edge<GrowEdgeData, 'grow'>;

/**
 * Хранимые столбцы дерева, каждый сверху вниз: обход в ширину от head. Дети идут в порядке
 * своих родителей, поэтому ветки между соседними столбцами не пересекаются.
 */
function treeColumns(tree: TreeState): string[][] {
  const columns: string[][] = [];
  let column = tree.head;
  while (column.length > 0) {
    columns.push(column);
    column = column.flatMap((id) => tree.nodes[id].children);
  }
  return columns;
}

/** Раскладка слева направо: столбец = уровень дерева, узлы столбца центрированы по вертикали. */
function buildGraph(tree: TreeState): { nodes: OrbNode[]; edges: GrowEdge[] } {
  const nodes: OrbNode[] = [];
  const edges: GrowEdge[] = [];
  const sizes = columnSizes(tree);

  treeColumns(tree).forEach((column) =>
    column.forEach((id, index) => {
      const node = tree.nodes[id];
      const leaf = node.children.length === 0;
      const maxed = leaf && node.depth >= MAX_DEPTH;
      const exiting = node.depth < tree.firstDepth;
      nodes.push({
        id,
        type: 'orb',
        position: { x: node.depth * GAP_X, y: (index - (column.length - 1) / 2) * GAP_Y },
        width: NODE_SIZE,
        height: NODE_SIZE,
        data: {
          label: node.side ?? 'CORE',
          leaf,
          root: id === ROOT_ID,
          maxed,
          blocked: leaf && !maxed && !exiting && !canExpand(tree, id, sizes),
          exiting,
          bornAt: node.bornAt,
        },
      });
    }),
  );

  for (const node of Object.values(tree.nodes)) {
    for (const childId of node.children) {
      edges.push({
        id: `e-${node.id}-${childId}`,
        source: node.id,
        target: childId,
        type: 'grow',
        data: { bornAt: tree.nodes[childId].bornAt, exiting: node.depth < tree.firstDepth },
      });
    }
  }

  return { nodes, edges };
}

/** Ноты одного столбца сверху вниз. */
function columnNotes(tree: TreeState, column: string[]): SoundNote[] {
  return column.map((id) => {
    const { pitch, depth } = tree.nodes[id];
    return { pitch, depth, accent: depth >= MAX_DEPTH };
  });
}

/**
 * Ноты плана по столбцам: столбец d звучит, когда проявляются узлы глубины d.
 * Итоговое дерево помнит только последние столбцы, поэтому ноты снимаем по ходу симуляции:
 * после каждого шага плана новый столбец — последний.
 */
function soundColumns(plan: Plan): SoundNote[][] {
  let tree = createInitialTree();
  const columns = [columnNotes(tree, tree.head)];
  for (const steps of plan) {
    tree = treeReducer(tree, { type: 'expandMany', steps, at: 0 });
    columns.push(columnNotes(tree, treeColumns(tree).at(-1)!));
  }
  return columns;
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
    (data.maxed || data.blocked) && styles.orbMax,
    data.exiting && styles.orbExit,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} style={growStyle}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Right} isConnectable={false} />
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
      className={`react-flow__edge-path ${styles.growEdge} ${data?.exiting ? styles.edgeExit : ''}`}
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

  // После каждого изменения графа плавно вписываем в экран видимое окно (без уходящего столбца)
  useEffect(() => {
    const visible = graph.nodes.filter((node) => !node.data.exiting);
    const timer = setTimeout(() => fitView({ nodes: visible, duration: 300, padding: 0.25, maxZoom: 1.1 }), 40);
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
  const playPlan = useCallback((plan: Plan) => {
    stopAnimation();
    dispatch({ type: 'reset' });

    // План считается заранее, а столбцы дорисовываются по одному: ветки столбца растут
    // ROW_DELAY мс, и как только они дотянулись до детей, начинает расти следующий столбец.
    // Первый столбец тоже идёт через таймер, чтобы сброс успел отрисоваться отдельно
    // и узлы с теми же id смонтировались заново (иначе анимация не запустится).
    // План известен заранее — по нему раскладываем ноты по столбцам
    const columns = soundColumns(plan);
    unlockAudio();
    setIsAnimating(true);
    timersRef.current = plan.map((steps, index) =>
      window.setTimeout(() => dispatch({ type: 'expandMany', steps, at: performance.now() }), index * ROW_DELAY),
    );
    // Узлы глубины d проявляются ровно в d * ROW_DELAY — в этот момент и звучит их столбец
    columns.forEach((notes, depth) =>
      timersRef.current.push(window.setTimeout(() => playRow(notes), depth * ROW_DELAY)),
    );
    timersRef.current.push(window.setTimeout(() => setIsAnimating(false), plan.length * ROW_DELAY));
  }, [stopAnimation]);

  const handleRandom = useCallback(() => playPlan(createRandomPlan()), [playPlan]);

  // Переигрывает всю историю роста с ядра — и случайную, и собранную кликами
  const handleReplay = useCallback(() => playPlan(tree.log), [playPlan, tree]);

  const handleReset = useCallback(() => {
    stopAnimation();
    dispatch({ type: 'reset' });
  }, [stopAnimation]);

  const handleNodeClick = useCallback(
    (_: unknown, node: Node) => {
      // Во время анимации клики блокируем: ручное раскрытие вмешалось бы в план
      if (isAnimating || !canExpand(tree, node.id)) return;
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
          узлов: <b>{graph.nodes.filter((node) => !node.data.exiting).length}</b>
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
          disabled={isAnimating || tree.log.length === 0}
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
