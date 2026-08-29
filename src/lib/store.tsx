import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  finance,
  financeHistory,
  goals,
  habits,
  monthView,
  projects as projectsSeed,
  schedule,
  tasks as tasksSeed,
  todayGoal,
  weekAreas,
  weekFocus,
  type Project,
  type Task,
} from "@/data/mockData";
import { getCurrentActivity, toMinutes } from "@/lib/schedule";

const STORAGE_KEY = "yuri-os.state.v1";

interface PersistedState {
  doneTasks: string[];
  extraTasks: Task[];
  doneBlocks: string[];
  projectActions: Record<string, string[]>; // projectId -> action ids toggled
  extraActions: Record<string, { id: string; title: string }[]>;
  doneKeyResults: string[];
  simulation: { enabled: boolean; dayOfWeek: number; time: string };
}

const initialState: PersistedState = {
  doneTasks: tasksSeed.filter((t) => t.status === "done").map((t) => t.id),
  extraTasks: [],
  doneBlocks: [],
  projectActions: {},
  extraActions: {},
  doneKeyResults: weekFocus.keyResults.filter((k) => k.done).map((k) => k.id),
  simulation: { enabled: false, dayOfWeek: 1, time: "19:42" },
};

interface StoreValue extends ReturnType<typeof useStoreValue> {}

function useStoreValue() {
  const [state, setState] = useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [tick, setTick] = useState(0);

  // hidratação a partir do localStorage (apenas melhora o protótipo)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...JSON.parse(raw) });
    } catch {
      /* ignora */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignora */
    }
  }, [state, hydrated]);

  // relógio: atualiza a cada 20s (suficiente para precisão de minuto)
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 20000);
    return () => window.clearInterval(id);
  }, []);

  const realNow = useMemo(() => new Date(), [tick, hydrated]);

  const sim = state.simulation;
  const dayOfWeek = sim.enabled ? sim.dayOfWeek : realNow.getDay();
  const nowMinutes = sim.enabled
    ? toMinutes(sim.time)
    : realNow.getHours() * 60 + realNow.getMinutes();

  const context = useMemo(
    () => getCurrentActivity(schedule, dayOfWeek, nowMinutes),
    [dayOfWeek, nowMinutes],
  );

  const tasks: Task[] = useMemo(
    () =>
      [...tasksSeed, ...state.extraTasks].map((t) => ({
        ...t,
        status: state.doneTasks.includes(t.id) ? "done" : "todo",
      })),
    [state.extraTasks, state.doneTasks],
  );

  const projects: Project[] = useMemo(
    () =>
      projectsSeed.map((p) => {
        const toggled = state.projectActions[p.id] ?? [];
        const extra = (state.extraActions[p.id] ?? []).map((a) => ({
          ...a,
          done: toggled.includes(a.id),
        }));
        const actions = [
          ...p.actions.map((a) => ({
            ...a,
            done: toggled.includes(a.id) ? !a.done : a.done,
          })),
          ...extra,
        ];
        // O progresso base vem do mock; interações locais apenas o ajustam,
        // mantendo consistência com as visões de semana/mês.
        const seedDone = p.actions.filter((a) => a.done).length;
        const done = actions.filter((a) => a.done).length;
        const step = 100 / Math.max(actions.length, 1);
        const progress = Math.max(
          0,
          Math.min(100, Math.round(p.progress + (done - seedDone) * step)),
        );
        return { ...p, actions, progress };
      }),
    [state.projectActions, state.extraActions],
  );

  const keyResults = useMemo(
    () =>
      weekFocus.keyResults.map((k) => ({
        ...k,
        done: state.doneKeyResults.includes(k.id),
      })),
    [state.doneKeyResults],
  );

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const toggleTask = useCallback(
    (id: string) =>
      setState((s) => ({ ...s, doneTasks: toggleId(s.doneTasks, id) })),
    [],
  );

  const toggleBlock = useCallback(
    (id: string) =>
      setState((s) => ({ ...s, doneBlocks: toggleId(s.doneBlocks, id) })),
    [],
  );

  const toggleKeyResult = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        doneKeyResults: toggleId(s.doneKeyResults, id),
      })),
    [],
  );

  const toggleProjectAction = useCallback(
    (projectId: string, actionId: string) =>
      setState((s) => ({
        ...s,
        projectActions: {
          ...s.projectActions,
          [projectId]: toggleId(s.projectActions[projectId] ?? [], actionId),
        },
      })),
    [],
  );

  const addProjectAction = useCallback((projectId: string, title: string) => {
    const id = `x-${Date.now()}`;
    setState((s) => ({
      ...s,
      extraActions: {
        ...s.extraActions,
        [projectId]: [...(s.extraActions[projectId] ?? []), { id, title }],
      },
    }));
  }, []);

  const addTask = useCallback((title: string) => {
    setState((s) => ({
      ...s,
      extraTasks: [
        ...s.extraTasks,
        {
          id: `t-${Date.now()}`,
          title,
          category: "Pessoal",
          status: "todo",
          priority: 4,
          dueDate: "hoje",
        },
      ],
    }));
  }, []);

  const setSimulation = useCallback(
    (next: Partial<PersistedState["simulation"]>) =>
      setState((s) => ({ ...s, simulation: { ...s.simulation, ...next } })),
    [],
  );

  const resetState = useCallback(() => setState(initialState), []);

  const blockDone = useCallback(
    (id: string) => state.doneBlocks.includes(id),
    [state.doneBlocks],
  );

  return {
    hydrated,
    realNow,
    dayOfWeek,
    nowMinutes,
    context,
    tasks,
    projects,
    keyResults,
    goals,
    habits,
    finance,
    financeHistory,
    todayGoal,
    monthView,
    weekAreas,
    weekFocus,
    simulation: state.simulation,
    blockDone,
    toggleTask,
    toggleBlock,
    toggleKeyResult,
    toggleProjectAction,
    addProjectAction,
    addTask,
    setSimulation,
    resetState,
  };
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de StoreProvider");
  return ctx;
}
