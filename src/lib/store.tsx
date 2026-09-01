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
  type ProjectStatus,
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
  todayGoalDone: boolean;
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
  todayGoalDone: false,
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
        console.warn("Supabase project data fallback to mocks", error);
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

  const context = useMemo(
    () => getCurrentActivity(schedule, dayOfWeek, nowMinutes),
    [dayOfWeek, nowMinutes],
  );

  const useRemoteProjectSource = isSupabaseProjectsConfigured();
  const baseProjectSeeds = useRemoteProjectSource ? (remoteProjectData?.projects ?? []) : projectsSeed;
  const baseTaskSeeds = useRemoteProjectSource ? (remoteProjectData?.tasks ?? []) : tasksSeed;

  const tasks: Task[] = useMemo(
    () =>
      [...baseTaskSeeds, ...state.extraTasks].map((t) => {
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
    [baseTaskSeeds, state.extraTasks, state.doneTasks, todayKey],
  );

  const projects: Project[] = useMemo(
    () =>
      [...baseProjectSeeds, ...state.extraProjects].map((p) => {
        const toggled = state.projectActions[p.id] ?? [];
        const extra = (state.extraActions[p.id] ?? []).map((a) => {
          const baseDone = Boolean(a.dueDate);
          const done = toggled.includes(a.id) ? !baseDone : baseDone;
          return {
            ...a,
            visibleFrom: a.visibleFrom ?? todayKey,
            dueDate: done ? (a.dueDate ?? todayKey) : undefined,
          };
        });
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
          ...extra,
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
      state.extraProjects,
      state.projectActions,
      state.extraActions,
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

    state.extraFronts.forEach((front) => {
      map.set(front.id, {
        ...front,
        objective: state.frontObjectives[front.id] ?? front.objective,
        status: state.frontStatuses[front.id] ?? front.status,
      });
    });

    remoteProjectData?.fronts.forEach((front) => {
      map.set(front.id, {
        ...front,
        objective: state.frontObjectives[front.id] ?? front.objective,
        status: state.frontStatuses[front.id] ?? front.status,
      });
    });

    if (!useRemoteProjectSource && !map.has("pessoal-notas-de-alivio")) {
      map.set("pessoal-notas-de-alivio", {
        id: "pessoal-notas-de-alivio",
        area: "Pessoal",
        title: "Notas de alívio",
        objective: state.frontObjectives["pessoal-notas-de-alivio"] ?? "Espaço para capturar pendências pessoais e notas de alívio fora das frentes de trabalho.",
        status: state.frontStatuses["pessoal-notas-de-alivio"] ?? "Em andamento",
      });
    }

    return Array.from(map.values());
  }, [projects, remoteProjectData?.fronts, state.extraFronts, state.frontObjectives, state.frontStatuses, tasks, useRemoteProjectSource]);

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
        console.warn("Supabase task update fallback to local state", error),
      );
    },
    [tasks, todayKey],
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
        console.warn("Supabase project action update fallback to local state", error),
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
        console.warn("Supabase project status fallback to local state", error),
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
        console.warn("Supabase front status fallback to local state", error),
      );
    },
    [],
  );

  const addFront = useCallback(
    (area: Category, title: string, objective = "") => {
      const trimmed = title.trim();
      if (!trimmed) return;
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
          console.warn("Supabase front create fallback to local state", error);
          const id = `${toFatherSegment(area)}-${toFatherSegment(trimmed)}-${Date.now()}`;
          setState((s) => ({
            ...s,
            extraFronts: [
              ...(s.extraFronts ?? []),
              {
                id,
                area,
                title: trimmed,
                objective: finalObjective,
                status: "Em andamento",
              },
            ],
          }));
        });
    },
    [],
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
        console.warn("Supabase front objective fallback to local state", error),
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
      }).catch((error) => console.warn("Supabase project details fallback to local state", error));
    },
    [],
  );

  const addProject = useCallback(
    (input: CreateProjectInput) => {
      const title = input.title.trim();
      if (!title) return;
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
            console.warn("Supabase project create fallback to local state", error);
            addLocalProject(remoteInput);
          });
        return;
      }

      addLocalProject(remoteInput);

      function addLocalProject(localInput: CreateProjectInput) {
        const id = `${toFatherSegment(title)}-${Date.now()}`;
        const deadline = localInput.deadline ? formatDateInputToShort(localInput.deadline) : "";
        setState((s) => ({
          ...s,
          extraProjects: [
            ...(s.extraProjects ?? []),
            {
              id,
              title,
              category: localInput.category,
              frontId: localInput.frontId,
              frontTitle: localInput.frontTitle,
              objective: localInput.objective?.trim() ?? "",
              progress: 0,
              status: "Em andamento",
              health: "No prazo",
              nextMilestone: "",
              nextAction: "",
              deadline,
              actions: [],
            },
          ],
        }));
      }
    },
    [],
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
            console.warn("Supabase project action create fallback to local state", error);
            addLocalProjectAction();
          });
        return;
      }

      addLocalProjectAction();

      function addLocalProjectAction() {
        const id = `x-${Date.now()}`;
        setState((s) => ({
          ...s,
          extraActions: {
            ...s.extraActions,
            [projectId]: [
              ...(s.extraActions[projectId] ?? []),
              { id, title: trimmed, ...options, visibleFrom: options.visibleFrom ?? todayKey },
            ],
          },
        }));
      }
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
            console.warn("Supabase task create fallback to local state", error);
            addLocalTask();
          });
        return;
      }

      addLocalTask();

      function addLocalTask() {
        setState((s) => ({
          ...s,
          extraTasks: [
            ...s.extraTasks,
            {
              id: `t-${Date.now()}`,
              title: trimmed,
              fatherId,
              quick: options.quick,
              visibleFrom: options.visibleFrom ?? todayKey,
              recurrence: options.recurrence ?? "none",
            },
          ],
        }));
      }
    },
    [fronts, todayKey],
  );

  /*
   * Implementacoes legadas substituidas acima. Mantidas fora do fluxo por
   * historico de patch: nao adicionar novos callbacks abaixo deste ponto.
   */
  /*
  const addFront = useCallback(
    (area: Category, title: string, objective = "") => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const id = `${toFatherSegment(area)}-${toFatherSegment(trimmed)}-${Date.now()}`;
      setState((s) => ({
        ...s,
        extraFronts: [
          ...(s.extraFronts ?? []),
          {
            id,
            area,
            title: trimmed,
            objective: objective.trim() || "Frente operacional para agrupar tarefas soltas e próximos movimentos.",
            status: "Em andamento",
          },
        ],
      }));
    },
    [],
  );

  const updateFrontObjective = useCallback(
    (frontId: string, objective: string) =>
      setState((s) => ({
        ...s,
        frontObjectives: {
          ...(s.frontObjectives ?? {}),
          [frontId]: objective.trim(),
        },
      })),
    [],
  );

  const updateProjectDetails = useCallback(
    (projectId: string, details: { objective?: string; deadline?: string }) =>
      setState((s) => ({
        ...s,
        projectObjectives:
          details.objective === undefined
            ? s.projectObjectives
            : {
                ...(s.projectObjectives ?? {}),
                [projectId]: details.objective.trim(),
              },
        projectDeadlines:
          details.deadline === undefined
            ? s.projectDeadlines
            : {
                ...(s.projectDeadlines ?? {}),
                [projectId]: formatDateInputToShort(details.deadline),
              },
      })),
    [],
  );

  const addProject = useCallback(
    (input: {
      category: Category;
      frontId: string;
      frontTitle: string;
      title: string;
      objective?: string;
      deadline?: string;
    }) => {
      const title = input.title.trim();
      if (!title) return;
      const id = `${toFatherSegment(title)}-${Date.now()}`;
      const deadline = input.deadline ? formatDateInputToShort(input.deadline) : "";
      setState((s) => ({
        ...s,
        extraProjects: [
          ...(s.extraProjects ?? []),
          {
            id,
            title,
            category: input.category,
            frontId: input.frontId,
            frontTitle: input.frontTitle,
            objective: input.objective?.trim() ?? "",
            progress: 0,
            status: "Em andamento",
            health: "No prazo",
            nextMilestone: "",
            nextAction: "",
            deadline,
            actions: [],
          },
        ],
      }));
    },
    [],
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
      const id = `x-${Date.now()}`;
      setState((s) => ({
        ...s,
        extraActions: {
          ...s.extraActions,
          [projectId]: [...(s.extraActions[projectId] ?? []), { id, title, ...options }],
        },
      }));
    },
    [],
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
    setState((s) => ({
      ...s,
      extraTasks: [
        ...s.extraTasks,
        {
          id: `t-${Date.now()}`,
          title,
          fatherId,
          quick: options.quick,
          visibleFrom: options.visibleFrom ?? todayKey,
          recurrence: options.recurrence ?? "none",
        },
      ],
    }));
    },
    [todayKey],
  );
  */

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
    todayGoal,
    todayGoalDone: state.todayGoalDone,
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
    toggleTodayGoal,
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
