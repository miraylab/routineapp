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
  dailyHabits as dailyHabitsSeed,
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
  weekMilestones,
  type DailyHabit,
  type Project,
  type Task,
} from "@/data/mockData";
import { getCurrentActivity, toMinutes } from "@/lib/schedule";

const STORAGE_KEY = "yuri-os.state.v1";
const HYDRATION_CLOCK_FALLBACK = new Date(0);

interface PersistedState {
  doneTasks: string[];
  todayGoalDone: boolean;
  doneDailyHabits: Record<string, string[]>;
  dailyJournal: Record<string, string>;
  dailyJournalEntries: Record<string, DailyJournalEntry[]>;
  extraTasks: Task[];
  doneBlocks: string[];
  doneActivityChecklistItems: string[];
  extraActivityChecklistItems: Record<string, { id: string; title: string; priority?: boolean }[]>;
  projectActions: Record<string, string[]>; // projectId -> action ids toggled
  extraActions: Record<string, { id: string; title: string }[]>;
  doneKeyResults: string[];
  doneWeekMilestones: string[];
  simulation: { enabled: boolean; dayOfWeek: number; time: string };
}

interface DailyJournalEntry {
  id: string;
  time: string;
  text: string;
  createdAt: string;
}

const initialState: PersistedState = {
  doneTasks: tasksSeed.filter((t) => t.status === "done").map((t) => t.id),
  todayGoalDone: false,
  doneDailyHabits: {},
  dailyJournal: {},
  dailyJournalEntries: {},
  extraTasks: [],
  doneBlocks: [],
  doneActivityChecklistItems: [],
  extraActivityChecklistItems: {},
  projectActions: {},
  extraActions: {},
  doneKeyResults: weekFocus.keyResults.filter((k) => k.done).map((k) => k.id),
  doneWeekMilestones: [],
  simulation: { enabled: false, dayOfWeek: 1, time: "19:42" },
};

type StoreValue = ReturnType<typeof useStoreValue>;

function useStoreValue() {
  const [state, setState] = useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [realNow, setRealNow] = useState(HYDRATION_CLOCK_FALLBACK);

  // hidratação a partir do localStorage (apenas melhora o protótipo)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...JSON.parse(raw) });
    } catch {
      /* ignora */
    }
    setRealNow(new Date());
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
    const updateClock = () => setRealNow(new Date());
    updateClock();
    const id = window.setInterval(updateClock, 20000);
    return () => window.clearInterval(id);
  }, []);

  const sim = state.simulation;
  const dayOfWeek = sim.enabled ? sim.dayOfWeek : realNow.getDay();
  const nowMinutes = sim.enabled
    ? toMinutes(sim.time)
    : realNow.getHours() * 60 + realNow.getMinutes();
  const todayKey = useMemo(() => toDateKey(realNow), [realNow]);

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

  const dailyHabits: DailyHabit[] = useMemo(
    () =>
      dailyHabitsSeed.filter((habit) => !habit.daysOfWeek || habit.daysOfWeek.includes(dayOfWeek)),
    [dayOfWeek],
  );

  const doneDailyHabitsToday = useMemo(
    () => state.doneDailyHabits?.[todayKey] ?? [],
    [state.doneDailyHabits, todayKey],
  );
  const dailyJournalEntries = state.dailyJournalEntries?.[todayKey] ?? [];

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const toggleTask = useCallback(
    (id: string) => setState((s) => ({ ...s, doneTasks: toggleId(s.doneTasks, id) })),
    [],
  );

  const toggleTodayGoal = useCallback(
    () => setState((s) => ({ ...s, todayGoalDone: !s.todayGoalDone })),
    [],
  );

  const toggleDailyHabit = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        doneDailyHabits: {
          ...(s.doneDailyHabits ?? {}),
          [todayKey]: toggleId(s.doneDailyHabits?.[todayKey] ?? [], id),
        },
      })),
    [todayKey],
  );

  const addDailyJournalEntry = useCallback(
    (text: string, time: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setState((s) => ({
        ...s,
        dailyJournalEntries: {
          ...(s.dailyJournalEntries ?? {}),
          [todayKey]: [
            ...(s.dailyJournalEntries?.[todayKey] ?? []),
            {
              id: `journal-${Date.now()}`,
              time,
              text: trimmed,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }));
    },
    [todayKey],
  );

  const toggleBlock = useCallback(
    (id: string) => setState((s) => ({ ...s, doneBlocks: toggleId(s.doneBlocks, id) })),
    [],
  );

  const toggleActivityChecklistItem = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        doneActivityChecklistItems: toggleId(s.doneActivityChecklistItems ?? [], id),
      })),
    [],
  );

  const addActivityChecklistItem = useCallback(
    (activityId: string, title: string, priority = false) => {
      const id = `${activityId}:extra:${Date.now()}`;
      setState((s) => ({
        ...s,
        extraActivityChecklistItems: {
          ...s.extraActivityChecklistItems,
          [activityId]: [
            ...(s.extraActivityChecklistItems?.[activityId] ?? []),
            { id, title, priority },
          ],
        },
      }));
    },
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

  const toggleWeekMilestone = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        doneWeekMilestones: toggleId(s.doneWeekMilestones ?? [], id),
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

  const blockDone = useCallback((id: string) => state.doneBlocks.includes(id), [state.doneBlocks]);

  const activityChecklistItemDone = useCallback(
    (id: string) => (state.doneActivityChecklistItems ?? []).includes(id),
    [state.doneActivityChecklistItems],
  );

  const dailyHabitDone = useCallback(
    (id: string) => doneDailyHabitsToday.includes(id),
    [doneDailyHabitsToday],
  );

  const weekMilestoneDone = useCallback(
    (id: string) => (state.doneWeekMilestones ?? []).includes(id),
    [state.doneWeekMilestones],
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
    dailyHabits,
    dailyJournalEntries,
    finance,
    financeHistory,
    todayGoal,
    todayGoalDone: state.todayGoalDone,
    monthView,
    weekAreas,
    weekFocus,
    weekMilestones,
    simulation: state.simulation,
    blockDone,
    activityChecklistItemDone,
    dailyHabitDone,
    weekMilestoneDone,
    extraActivityChecklistItems: state.extraActivityChecklistItems ?? {},
    toggleTask,
    toggleTodayGoal,
    toggleDailyHabit,
    toggleBlock,
    toggleActivityChecklistItem,
    addActivityChecklistItem,
    toggleKeyResult,
    toggleWeekMilestone,
    toggleProjectAction,
    addProjectAction,
    addTask,
    addDailyJournalEntry,
    setSimulation,
    resetState,
  };
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de StoreProvider");
  return ctx;
}
