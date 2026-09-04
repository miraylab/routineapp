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
  weekAreas,
  weekFocus,
  weekMilestones,
  type DailyHabit,
  type Project,
  type ProjectStatus,
  type ScheduleBlock,
  type Task,
} from "@/data/mockData";
import { getCurrentActivity, toMinutes } from "@/lib/schedule";
import {
  createSupabaseFront,
  createSupabaseProject,
  createSupabaseTask,
  fetchSupabaseProjectData,
  formatShortDeadlineToDate,
  isSupabaseProjectsConfigured,
  isNumericId,
  updateSupabaseFront,
  updateSupabaseProject,
  updateSupabaseTaskDone,
  type CreateProjectInput,
  type SupabaseProjectData,
} from "@/lib/supabaseProjects";

const STORAGE_KEY = "yuri-os.state.v1";
const HYDRATION_CLOCK_FALLBACK = new Date(0);

export interface ManagedFront {
  id: string;
  area: Category;
  title: string;
  objective: string;
  status: ProjectStatus;
}

interface PersistedState {
  doneTasks: string[]; // legado/local: alterna dueDate em tasks baseadas nos mocks
  doneDailyHabits: Record<string, string[]>;
  dailyJournal: Record<string, string>;
  dailyJournalEntries: Record<string, DailyJournalEntry[]>;
  extraTasks: Task[];
  doneBlocks: string[];
  doneActivityChecklistItems: string[];
  doneActivityChecklistItemAt: Record<string, string>;
  extraActivityChecklistItems: Record<string, { id: string; title: string; priority?: boolean }[]>;
  activityLearningEntries: Record<string, ActivityLearningEntry[]>;
  routineRatings: Record<string, Record<string, number>>;
  projectStatuses: Record<string, ProjectStatus>;
  frontStatuses: Record<string, ProjectStatus>;
  extraFronts: ManagedFront[];
  frontObjectives: Record<string, string>;
  projectObjectives: Record<string, string>;
  projectDeadlines: Record<string, string>;
  extraProjects: Project[];
  projectActions: Record<string, string[]>; // projectId -> action ids toggled
  extraActions: Record<
    string,
    {
      id: string;
      title: string;
      quick?: boolean;
      visibleFrom?: string;
      recurrence?: "none" | "daily" | "weekly" | "monthly";
      dueDate?: string;
      note?: string;
    }[]
  >;
  doneKeyResults: string[];
  doneWeekMilestones: string[];
  simulation: { enabled: boolean; dayOfWeek: number; time: string };
}

interface DailyJournalEntry {
  id: string;
  time: string;
  text: string;
  type?: "text" | "audio";
  audioDataUrl?: string;
  mimeType?: string;
  createdAt: string;
}

interface ActivityLearningEntry {
  id: string;
  activityId: string;
  time: string;
  text: string;
  type?: "text" | "audio";
  audioDataUrl?: string;
  mimeType?: string;
  createdAt: string;
}

const initialState: PersistedState = {
  doneTasks: [],
  doneDailyHabits: {},
  dailyJournal: {},
  dailyJournalEntries: {},
  extraTasks: [],
  doneBlocks: [],
  doneActivityChecklistItems: [],
  doneActivityChecklistItemAt: {},
  extraActivityChecklistItems: {},
  activityLearningEntries: {},
  routineRatings: {},
  projectStatuses: {},
  frontStatuses: {},
  extraFronts: [],
  frontObjectives: {},
  projectObjectives: {},
  projectDeadlines: {},
  extraProjects: [],
  projectActions: {},
  extraActions: {},
  doneKeyResults: weekFocus.keyResults.filter((k) => k.done).map((k) => k.id),
  doneWeekMilestones: [],
  simulation: { enabled: false, dayOfWeek: 1, time: "19:42" },
};

type StoreValue = ReturnType<typeof useStoreValue>;

function useStoreValue(accessToken?: string) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [remoteProjectData, setRemoteProjectData] = useState<SupabaseProjectData | null>(null);
  const [remoteSchedule, setRemoteSchedule] = useState<ScheduleBlock[] | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [realNow, setRealNow] = useState(HYDRATION_CLOCK_FALLBACK);

  // hidratação a partir do localStorage (apenas melhora o protótipo)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        const legacyDoneItems = parsed.doneActivityChecklistItems ?? [];
        const doneAt = parsed.doneActivityChecklistItemAt ?? {};
        const migratedDoneAt = legacyDoneItems.reduce<Record<string, string>>(
          (acc, id) => ({
            ...acc,
            [id]: acc[id] ?? new Date().toISOString(),
          }),
          { ...doneAt },
        );
        setState({ ...initialState, ...parsed, doneActivityChecklistItemAt: migratedDoneAt });
      }
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

  useEffect(() => {
    if (isSupabaseProjectsConfigured() && !accessToken) return;

    let active = true;

    fetchSupabaseProjectData(accessToken)
      .then((data) => {
        if (active) setRemoteProjectData(data);
      })
      .catch((error) => {
        console.warn("Supabase project data unavailable", error);
        if (active) setRemoteProjectData(null);
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  const sim = state.simulation;
  const dayOfWeek = sim.enabled ? sim.dayOfWeek : realNow.getDay();
  const nowMinutes = sim.enabled
    ? toMinutes(sim.time)
    : realNow.getHours() * 60 + realNow.getMinutes();
  const todayKey = useMemo(() => toDateKey(realNow), [realNow]);

  useEffect(() => {
    if (!hydrated) return;

    let active = true;

    fetch(`/api/routine/week?start=${encodeURIComponent(todayKey)}&days=8`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Routine calendar: ${response.status}`);
        return (await response.json()) as { blocks?: ScheduleBlock[] };
      })
      .then((data) => {
        if (active) setRemoteSchedule(data.blocks ?? []);
      })
      .catch((error) => {
        console.warn("Routine calendar unavailable", error);
        if (active) setRemoteSchedule([]);
      });

    return () => {
      active = false;
    };
  }, [hydrated, todayKey]);

  const scheduleBlocks = useMemo(
    () => remoteSchedule ?? [],
    [remoteSchedule],
  );

  const context = useMemo(
    () => getCurrentActivity(scheduleBlocks, dayOfWeek, nowMinutes, sim.enabled ? undefined : todayKey),
    [dayOfWeek, nowMinutes, scheduleBlocks, sim.enabled, todayKey],
  );

  const baseProjectSeeds = remoteProjectData?.projects ?? [];
  const baseTaskSeeds = remoteProjectData?.tasks ?? [];

  const tasks: Task[] = useMemo(
    () =>
      baseTaskSeeds.map((t) => {
        const baseDone = Boolean(t.dueDate);
        const toggled = state.doneTasks.includes(t.id);
        const done = toggled ? !baseDone : baseDone;

        return {
          ...t,
          fatherId: t.fatherId ?? "pessoal",
          visibleFrom: t.visibleFrom ?? todayKey,
          dueDate: done ? (t.dueDate ?? todayKey) : undefined,
        };
      }),
    [baseTaskSeeds, state.doneTasks, todayKey],
  );

  const projects: Project[] = useMemo(
    () =>
      baseProjectSeeds.map((p) => {
        const toggled = state.projectActions[p.id] ?? [];
        const actions = [
          ...p.actions.map((a) => {
            const baseDone = Boolean(a.dueDate);
            const done = toggled.includes(a.id) ? !baseDone : baseDone;
            return {
              ...a,
              visibleFrom: a.visibleFrom ?? todayKey,
              dueDate: done ? (a.dueDate ?? todayKey) : undefined,
            };
          }),
        ];
        // O progresso base vem do mock; interações locais apenas o ajustam,
        // mantendo consistência com as visões de semana/mês.
        const seedDone = p.actions.filter((a) => Boolean(a.dueDate)).length;
        const done = actions.filter((a) => Boolean(a.dueDate)).length;
        const step = 100 / Math.max(actions.length, 1);
        const progress = Math.max(
          0,
          Math.min(100, Math.round(p.progress + (done - seedDone) * step)),
        );
        return {
          ...p,
          objective: state.projectObjectives[p.id] ?? p.objective,
          deadline: state.projectDeadlines[p.id] ?? p.deadline,
          actions,
          progress,
          status: state.projectStatuses[p.id] ?? p.status,
        };
      }),
    [
      baseProjectSeeds,
      state.projectActions,
      state.projectStatuses,
      state.projectObjectives,
      state.projectDeadlines,
      todayKey,
    ],
  );

  const fronts: ManagedFront[] = useMemo(() => {
    const map = new Map<string, ManagedFront>();

    projects.forEach((project) => {
      if (!map.has(project.frontId)) {
        map.set(project.frontId, {
          id: project.frontId,
          area: project.category,
          title: project.frontTitle,
          objective:
            state.frontObjectives[project.frontId] ??
            `Frente para organizar iniciativas, tarefas soltas e projetos ligados a ${project.frontTitle}.`,
          status: state.frontStatuses[project.frontId] ?? "Em andamento",
        });
      }
    });

    tasks.forEach((task) => {
      const father = parseFatherId(task.fatherId);
      if (!father.frontId || map.has(father.frontId)) return;
      map.set(father.frontId, {
        id: father.frontId,
        area: formatArea(father.areaId) as Category,
        title: formatFatherSegment(father.frontId),
        objective:
          state.frontObjectives[father.frontId] ??
          "Frente operacional para agrupar tarefas soltas e próximos movimentos.",
        status: state.frontStatuses[father.frontId] ?? "Em andamento",
      });
    });

    remoteProjectData?.fronts.forEach((front) => {
      map.set(front.id, {
        ...front,
        objective: state.frontObjectives[front.id] ?? front.objective,
        status: state.frontStatuses[front.id] ?? front.status,
      });
    });

    return Array.from(map.values());
  }, [projects, remoteProjectData?.fronts, state.frontObjectives, state.frontStatuses, tasks]);

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
  const routineRatingsToday = state.routineRatings?.[todayKey] ?? {};

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const toggleTask = useCallback(
    (id: string) => {
      const task = tasks.find((item) => item.id === id);
      const nextDueDate = task?.dueDate ? null : todayKey;

      setState((s) => ({ ...s, doneTasks: toggleId(s.doneTasks, id) }));
      setRemoteProjectData((data) =>
        data
          ? {
              ...data,
              tasks: data.tasks.map((item) =>
                item.id === id ? { ...item, dueDate: nextDueDate ?? undefined } : item,
              ),
            }
          : data,
      );
      void updateSupabaseTaskDone(id, nextDueDate).catch((error) =>
        console.warn("Supabase task update failed after optimistic update", error),
      );
    },
    [tasks, todayKey],
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
              type: "text",
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }));
    },
    [todayKey],
  );

  const addDailyJournalAudioEntry = useCallback(
    (audioDataUrl: string, mimeType: string, time: string) => {
      if (!audioDataUrl) return;
      setState((s) => ({
        ...s,
        dailyJournalEntries: {
          ...(s.dailyJournalEntries ?? {}),
          [todayKey]: [
            ...(s.dailyJournalEntries?.[todayKey] ?? []),
            {
              id: `journal-audio-${Date.now()}`,
              time,
              text: "Audio do bloco de notas",
              type: "audio",
              audioDataUrl,
              mimeType,
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
      setState((s) => {
        const isDone = (s.doneActivityChecklistItems ?? []).includes(id);
        const nextDoneAt = { ...(s.doneActivityChecklistItemAt ?? {}) };
        if (isDone) {
          delete nextDoneAt[id];
        } else {
          nextDoneAt[id] = new Date().toISOString();
        }

        return {
          ...s,
          doneActivityChecklistItems: toggleId(s.doneActivityChecklistItems ?? [], id),
          doneActivityChecklistItemAt: nextDoneAt,
        };
      }),
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

  const addActivityLearningEntry = useCallback(
    (activityId: string, text: string, time: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setState((s) => ({
        ...s,
        activityLearningEntries: {
          ...(s.activityLearningEntries ?? {}),
          [activityId]: [
            ...(s.activityLearningEntries?.[activityId] ?? []),
            {
              id: `${activityId}:learning:${Date.now()}`,
              activityId,
              time,
              text: trimmed,
              type: "text",
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }));
    },
    [],
  );

  const addActivityLearningAudioEntry = useCallback(
    (activityId: string, audioDataUrl: string, mimeType: string, time: string) => {
      if (!audioDataUrl) return;
      setState((s) => ({
        ...s,
        activityLearningEntries: {
          ...(s.activityLearningEntries ?? {}),
          [activityId]: [
            ...(s.activityLearningEntries?.[activityId] ?? []),
            {
              id: `${activityId}:learning-audio:${Date.now()}`,
              activityId,
              time,
              text: "Audio de aprendizado",
              type: "audio",
              audioDataUrl,
              mimeType,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }));
    },
    [],
  );

  const setRoutineRating = useCallback(
    (activityId: string, rating: number) =>
      setState((s) => ({
        ...s,
        routineRatings: {
          ...(s.routineRatings ?? {}),
          [todayKey]: {
            ...(s.routineRatings?.[todayKey] ?? {}),
            [activityId]: rating,
          },
        },
      })),
    [todayKey],
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
    (projectId: string, actionId: string) => {
      const action = projects
        .find((project) => project.id === projectId)
        ?.actions.find((item) => item.id === actionId);
      const nextDueDate = action?.dueDate ? null : todayKey;

      setState((s) => ({
        ...s,
        projectActions: {
          ...s.projectActions,
          [projectId]: toggleId(s.projectActions[projectId] ?? [], actionId),
        },
      }));
      setRemoteProjectData((data) =>
        data
          ? {
              ...data,
              projects: data.projects.map((project) =>
                project.id === projectId
                  ? {
                      ...project,
                      actions: project.actions.map((item) =>
                        item.id === actionId ? { ...item, dueDate: nextDueDate ?? undefined } : item,
                      ),
                    }
                  : project,
              ),
            }
          : data,
      );
      void updateSupabaseTaskDone(actionId, nextDueDate).catch((error) =>
        console.warn("Supabase project action update failed after optimistic update", error),
      );
    },
    [projects, todayKey],
  );

  const setProjectStatus = useCallback(
    (projectId: string, status: ProjectStatus) => {
      setState((s) => ({
        ...s,
        projectStatuses: {
          ...(s.projectStatuses ?? {}),
          [projectId]: status,
        },
      }));
      setRemoteProjectData((data) =>
        data
          ? {
              ...data,
              projects: data.projects.map((project) =>
                project.id === projectId ? { ...project, status } : project,
              ),
            }
          : data,
      );
      void updateSupabaseProject(projectId, { status }).catch((error) =>
        console.warn("Supabase project status update failed after optimistic update", error),
      );
    },
    [],
  );

  const setFrontStatus = useCallback(
    (frontId: string, status: ProjectStatus) => {
      setState((s) => ({
        ...s,
        frontStatuses: {
          ...(s.frontStatuses ?? {}),
          [frontId]: status,
        },
      }));
      setRemoteProjectData((data) =>
        data
          ? {
              ...data,
              fronts: data.fronts.map((front) =>
                front.id === frontId ? { ...front, status } : front,
              ),
              frontStatuses: { ...data.frontStatuses, [frontId]: status },
            }
          : data,
      );
      void updateSupabaseFront(frontId, { status }).catch((error) =>
        console.warn("Supabase front status update failed after optimistic update", error),
      );
    },
    [],
  );

  const addFront = useCallback(
    (area: Category, title: string, objective = "") => {
      const trimmed = title.trim();
      if (!trimmed) return false;
      const duplicated = fronts.some(
        (front) => front.area === area && toFatherSegment(front.title) === toFatherSegment(trimmed),
      );
      if (duplicated) {
        console.warn("Supabase front create skipped: duplicated front path", { area, title: trimmed });
        return false;
      }
      const finalObjective =
        objective.trim() || "Frente operacional para agrupar tarefas soltas e próximos movimentos.";

      void createSupabaseFront(area, trimmed, finalObjective)
        .then((front) => {
          setRemoteProjectData((data) => ({
            fronts: [...(data?.fronts ?? []), front],
            projects: data?.projects ?? [],
            tasks: data?.tasks ?? [],
            frontStatuses: { ...(data?.frontStatuses ?? {}), [front.id]: front.status },
          }));
        })
        .catch((error) => {
          console.warn("Supabase front create failed", error);
        });
      return true;
    },
    [fronts],
  );

  const updateFrontObjective = useCallback(
    (frontId: string, objective: string) => {
      const trimmed = objective.trim();
      setState((s) => ({
        ...s,
        frontObjectives: {
          ...(s.frontObjectives ?? {}),
          [frontId]: trimmed,
        },
      }));
      setRemoteProjectData((data) =>
        data
          ? {
              ...data,
              fronts: data.fronts.map((front) =>
                front.id === frontId ? { ...front, objective: trimmed } : front,
              ),
            }
          : data,
      );
      void updateSupabaseFront(frontId, { objective: trimmed }).catch((error) =>
        console.warn("Supabase front objective update failed after optimistic update", error),
      );
    },
    [],
  );

  const updateProjectDetails = useCallback(
    (projectId: string, details: { objective?: string; deadline?: string }) => {
      const objective = details.objective?.trim();
      const deadline = details.deadline === undefined ? undefined : formatDateInputToShort(details.deadline);
      setState((s) => ({
        ...s,
        projectObjectives:
          objective === undefined
            ? s.projectObjectives
            : {
                ...(s.projectObjectives ?? {}),
                [projectId]: objective,
              },
        projectDeadlines:
          deadline === undefined
            ? s.projectDeadlines
            : {
                ...(s.projectDeadlines ?? {}),
                [projectId]: deadline,
              },
      }));
      setRemoteProjectData((data) =>
        data
          ? {
              ...data,
              projects: data.projects.map((project) =>
                project.id === projectId
                  ? {
                      ...project,
                      objective: objective ?? project.objective,
                      deadline: deadline ?? project.deadline,
                    }
                  : project,
              ),
            }
          : data,
      );
      void updateSupabaseProject(projectId, {
        ...(objective === undefined ? {} : { objective }),
        ...(details.deadline === undefined ? {} : { deadline: details.deadline || null }),
      }).catch((error) =>
        console.warn("Supabase project details update failed after optimistic update", error),
      );
    },
    [],
  );

  const addProject = useCallback(
    (input: CreateProjectInput) => {
      const title = input.title.trim();
      if (!title) return false;
      const duplicated = projects.some(
        (project) =>
          project.frontId === input.frontId &&
          toFatherSegment(project.title) === toFatherSegment(title),
      );
      if (duplicated) {
        console.warn("Supabase project create skipped: duplicated project path", {
          frontId: input.frontId,
          title,
        });
        return false;
      }
      const remoteInput = {
        ...input,
        title,
        objective: input.objective?.trim() ?? "",
      };

      if (isNumericId(input.frontId)) {
        void createSupabaseProject(remoteInput)
          .then((project) => {
            setRemoteProjectData((data) => ({
              fronts: data?.fronts ?? [],
              projects: [...(data?.projects ?? []), project],
              tasks: data?.tasks ?? [],
              frontStatuses: data?.frontStatuses ?? {},
            }));
          })
          .catch((error) => {
            console.warn("Supabase project create failed", error);
          });
        return true;
      }

      console.warn("Supabase project create skipped: front id is not persisted", input.frontId);
      return false;
    },
    [projects],
  );

  const addProjectAction = useCallback(
    (
      projectId: string,
      title: string,
      options: {
        quick?: boolean;
        visibleFrom?: string;
        recurrence?: "none" | "daily" | "weekly" | "monthly";
        dueDate?: string;
        note?: string;
      } = {},
    ) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const project = projects.find((item) => item.id === projectId);
      if (project && isNumericId(project.id) && isNumericId(project.frontId)) {
        void createSupabaseTask({
          area: project.category,
          frontId: project.frontId,
          projectId: project.id,
          title: trimmed,
          quick: options.quick,
          visibleFrom: options.visibleFrom ?? todayKey,
          recurrence: options.recurrence ?? "none",
        })
          .then((action) => {
            setRemoteProjectData((data) =>
              data
                ? {
                    ...data,
                    projects: data.projects.map((item) =>
                      item.id === project.id
                        ? { ...item, actions: [...item.actions, action] }
                        : item,
                    ),
                  }
                : data,
            );
          })
          .catch((error) => {
            console.warn("Supabase project action create failed", error);
          });
        return;
      }

      console.warn("Supabase project action create skipped: project/front id is not persisted", projectId);
    },
    [projects, todayKey],
  );

  const addTask = useCallback(
    (
      title: string,
      fatherId = "pessoal",
      options: {
        quick?: boolean;
        visibleFrom?: string;
        recurrence?: "none" | "daily" | "weekly" | "monthly";
      } = {},
    ) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const father = parseFatherId(fatherId);
      const front = fronts.find((item) => item.id === father.frontId);

      if (front && isNumericId(front.id)) {
        void createSupabaseTask({
          area: front.area,
          frontId: front.id,
          title: trimmed,
          quick: options.quick,
          visibleFrom: options.visibleFrom ?? todayKey,
          recurrence: options.recurrence ?? "none",
        })
          .then((task) => {
            setRemoteProjectData((data) =>
              data
                ? {
                    ...data,
                    tasks: [...data.tasks, task as Task],
                  }
                : data,
            );
          })
          .catch((error) => {
            console.warn("Supabase task create failed", error);
          });
        return;
      }

      console.warn("Supabase task create skipped: front id is not persisted", fatherId);
    },
    [fronts, todayKey],
  );

  const materializeScheduleScope = useCallback(
    (block: ScheduleBlock) => {
      const area = normalizeScopeArea(block.scope?.area ?? block.category);
      const frontTitle = block.scope?.front?.trim();
      const projectTitle = block.scope?.project?.trim();

      if (!frontTitle && !projectTitle) return Promise.resolve();

      return (async () => {
        let front = frontTitle
          ? fronts.find(
              (item) =>
                item.area === area &&
                toFatherSegment(item.title) === toFatherSegment(frontTitle),
            )
          : undefined;

        if (!front && frontTitle) {
          const alreadyQueuedFront = fronts.some(
            (item) =>
              item.area === area &&
              toFatherSegment(item.title) === toFatherSegment(frontTitle),
          );
          if (alreadyQueuedFront) return;

          front = await createSupabaseFront(
            area,
            frontTitle,
            "Estrutura criada a partir da agenda ROTINA.",
          );
          const createdFront = front;
          setRemoteProjectData((data) => ({
            fronts: [...(data?.fronts ?? []), createdFront],
            projects: data?.projects ?? [],
            tasks: data?.tasks ?? [],
            frontStatuses: {
              ...(data?.frontStatuses ?? {}),
              [createdFront.id]: createdFront.status,
            },
          }));
        }

        if (!projectTitle || !front || !isNumericId(front.id)) return;

        const existingProject = projects.find(
          (project) =>
            project.category === area &&
            project.frontId === front.id &&
            toFatherSegment(project.title) === toFatherSegment(projectTitle),
        );
        if (existingProject) return;

        const project = await createSupabaseProject({
          category: area,
          frontId: front.id,
          frontTitle: front.title,
          title: projectTitle,
          objective: "Projeto criado a partir da agenda ROTINA.",
        });

        setRemoteProjectData((data) => ({
          fronts: data?.fronts ?? (front ? [front] : []),
          projects: [...(data?.projects ?? []), project],
          tasks: data?.tasks ?? [],
          frontStatuses: data?.frontStatuses ?? {},
        }));
      })().catch((error) => {
        console.warn("Supabase schedule scope materialization failed", error);
        throw error;
      });
    },
    [fronts, projects],
  );

  const setSimulation = useCallback(
    (next: Partial<PersistedState["simulation"]>) =>
      setState((s) => ({ ...s, simulation: { ...s.simulation, ...next } })),
    [],
  );

  const resetState = useCallback(() => setState(initialState), []);

  const blockDone = useCallback((id: string) => state.doneBlocks.includes(id), [state.doneBlocks]);

  const activityChecklistItemDone = useCallback(
    (id: string) =>
      (state.doneActivityChecklistItems ?? []).includes(id) ||
      Boolean(state.doneActivityChecklistItemAt?.[id]),
    [state.doneActivityChecklistItemAt, state.doneActivityChecklistItems],
  );

  const activityChecklistItemCompletedAt = useCallback(
    (id: string) => state.doneActivityChecklistItemAt?.[id],
    [state.doneActivityChecklistItemAt],
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
    todayKey,
    dayOfWeek,
    nowMinutes,
    context,
    scheduleBlocks,
    tasks,
    projects,
    fronts,
    keyResults,
    goals,
    habits,
    dailyHabits,
    dailyJournalEntries,
    routineRatingsToday,
    finance,
    financeHistory,
    monthView,
    weekAreas,
    weekFocus,
    weekMilestones,
    simulation: state.simulation,
    frontStatuses: { ...(remoteProjectData?.frontStatuses ?? {}), ...(state.frontStatuses ?? {}) },
    blockDone,
    activityChecklistItemDone,
    activityChecklistItemCompletedAt,
    dailyHabitDone,
    weekMilestoneDone,
    extraActivityChecklistItems: state.extraActivityChecklistItems ?? {},
    toggleTask,
    toggleDailyHabit,
    toggleBlock,
    toggleActivityChecklistItem,
    addActivityChecklistItem,
    addActivityLearningEntry,
    addActivityLearningAudioEntry,
    setRoutineRating,
    toggleKeyResult,
    toggleWeekMilestone,
    toggleProjectAction,
    setProjectStatus,
    setFrontStatus,
    addFront,
    updateFrontObjective,
    updateProjectDetails,
    addProject,
    addProjectAction,
    addTask,
    materializeScheduleScope,
    addDailyJournalEntry,
    addDailyJournalAudioEntry,
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

function parseFatherId(fatherId: string) {
  const [areaId, frontId, projectId] = fatherId.split(".");
  return { areaId, frontId, projectId };
}

function formatFatherSegment(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatArea(value: string | undefined): Category {
  if (value === "michelin") return "Michelin";
  if (value === "miray") return "Miray";
  if (value === "estudos") return "Estudos";
  if (value === "pessoal") return "Pessoal";
  return "Pessoal";
}

function normalizeScopeArea(value: string | undefined): Category {
  const normalized = toFatherSegment(value ?? "");
  if (normalized === "michelin") return "Michelin";
  if (normalized === "miray") return "Miray";
  if (normalized === "estudos") return "Estudos";
  if (normalized === "pessoal") return "Pessoal";
  if (normalized === "saude") return "Saúde";
  if (normalized === "alimentacao") return "Alimentação";
  return formatArea(normalized);
}

function toFatherSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatDateInputToShort(value: string) {
  if (!value) return "";
  const [, month, day] = value.split("-").map(Number);
  if (!month || !day) return value;
  return `${day} ${SHORT_MONTHS[month - 1] ?? ""}`.trim();
}

const SHORT_MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({
  children,
  accessToken,
}: {
  children: ReactNode;
  accessToken?: string;
}) {
  const value = useStoreValue(accessToken);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore precisa estar dentro de StoreProvider");
  return ctx;
}
