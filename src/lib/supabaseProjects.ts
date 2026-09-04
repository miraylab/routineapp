import {
  type Category,
  type Project,
  type ProjectAction,
  type ProjectStatus,
  type Task,
} from "@/data/mockData";
import { getSupabaseAccessToken } from "@/lib/supabaseAuth";

const SUPABASE_REST_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const STATUS_VALUES: ProjectStatus[] = ["Em andamento", "Concluído", "Arquivado"];

interface AreaRow {
  id: number;
  title: string;
  sort_order: number;
  active: boolean | null;
}

interface FrontRow {
  id: number;
  area_id: number;
  title: string;
  objective: string | null;
  status: string;
  sort_order: number;
  active: boolean | null;
  completed_at: string | null;
}

interface ProjectRow {
  id: number;
  area_id: number;
  front_id: number;
  title: string;
  objective: string | null;
  status: string;
  deadline: string | null;
  sort_order: number;
  active: boolean | null;
  completed_at: string | null;
}

interface TaskRow {
  id: number;
  area_id: number;
  front_id: number | null;
  project_id: number | null;
  title: string;
  quick: boolean;
  visible_from: string;
  recurrence: Task["recurrence"];
  due_date: string | null;
  created_at: string;
}

export interface SupabaseProjectData {
  fronts: SupabaseManagedFront[];
  projects: Project[];
  tasks: Task[];
  frontStatuses: Record<string, ProjectStatus>;
}

export interface SupabaseManagedFront {
  id: string;
  area: Category;
  title: string;
  objective: string;
  status: ProjectStatus;
}

export interface CreateProjectInput {
  category: Category;
  frontId: string;
  frontTitle: string;
  title: string;
  objective?: string;
  deadline?: string;
}

export function isSupabaseProjectsConfigured() {
  return Boolean(SUPABASE_REST_URL && SUPABASE_ANON_KEY);
}

export async function fetchSupabaseProjectData(
  accessToken?: string,
): Promise<SupabaseProjectData | null> {
  if (!isSupabaseProjectsConfigured()) return null;

  const [areas, fronts, projects, tasks] = await Promise.all([
    supabaseGet<AreaRow>(
      "areas",
      "select=id,title,sort_order,active&order=sort_order.asc",
      accessToken,
    ),
    supabaseGet<FrontRow>(
      "fronts",
      "select=id,area_id,title,objective,status,sort_order,active,completed_at&order=sort_order.asc",
      accessToken,
    ),
    supabaseGet<ProjectRow>(
      "projects",
      "select=id,area_id,front_id,title,objective,status,deadline,sort_order,active,completed_at&order=sort_order.asc",
      accessToken,
    ),
    supabaseGet<TaskRow>(
      "tasks",
      "select=id,area_id,front_id,project_id,title,quick,visible_from,recurrence,due_date,created_at&order=created_at.desc",
      accessToken,
    ),
  ]);

  const activeAreas = areas.filter((area) => area.active !== false);
  const activeFronts = fronts.filter((front) => front.active !== false);
  const activeProjects = projects.filter((project) => project.active !== false);
  const areaById = new Map(activeAreas.map((area) => [area.id, area]));
  const frontById = new Map(activeFronts.map((front) => [front.id, front]));
  const actionsByProject = groupProjectActions(tasks);
  const mappedFronts = activeFronts.map((front) => mapFront(front, areaById));
  const frontTasks = tasks
    .filter((task) => task.front_id && !task.project_id)
    .map((task) => mapTask(task, areaById));
  const mappedProjects = activeProjects.map((project) =>
    mapProject(project, areaById, frontById, actionsByProject.get(project.id) ?? []),
  );

  if (mappedFronts.length === 0 && mappedProjects.length === 0 && frontTasks.length === 0) {
    return null;
  }

  return {
    fronts: mappedFronts,
    projects: mappedProjects,
    tasks: frontTasks,
    frontStatuses: Object.fromEntries(
      activeFronts.map((front) => [String(front.id), normalizeStatus(front.status)]),
    ),
  };
}

export async function createSupabaseFront(
  area: Category,
  title: string,
  objective: string,
): Promise<SupabaseManagedFront> {
  const [row] = await supabasePost<FrontRow>("fronts", {
    area_id: categoryToAreaId(area),
    title,
    objective,
    status: "Em andamento",
    active: true,
  });

  return mapFront(row, new Map([[row.area_id, { id: row.area_id, title: area, sort_order: 0, active: true }]]));
}

export async function updateSupabaseFront(
  frontId: string,
  values: Partial<Pick<FrontRow, "objective" | "status">>,
) {
  if (!isNumericId(frontId)) return false;
  await supabasePatch("fronts", `id=eq.${frontId}`, values);
  return true;
}

export async function createSupabaseProject(input: CreateProjectInput): Promise<Project> {
  const [row] = await supabasePost<ProjectRow>("projects", {
    area_id: categoryToAreaId(input.category),
    front_id: Number(input.frontId),
    title: input.title,
    objective: input.objective ?? "",
    status: "Em andamento",
    deadline: input.deadline || null,
    active: true,
  });

  return mapProject(
    row,
    new Map([[row.area_id, { id: row.area_id, title: input.category, sort_order: 0, active: true }]]),
    new Map([
      [
        row.front_id,
        {
          id: row.front_id,
          area_id: row.area_id,
          title: input.frontTitle,
          objective: null,
          status: "Em andamento",
          sort_order: 0,
          active: true,
          completed_at: null,
        },
      ],
    ]),
    [],
  );
}

export async function updateSupabaseProject(
  projectId: string,
  values: Partial<Pick<ProjectRow, "objective" | "deadline" | "status">>,
) {
  if (!isNumericId(projectId)) return false;
  await supabasePatch("projects", `id=eq.${projectId}`, values);
  return true;
}

export async function createSupabaseTask(input: {
  area: Category;
  frontId?: string;
  projectId?: string;
  title: string;
  quick?: boolean;
  visibleFrom?: string;
  recurrence?: Task["recurrence"];
}): Promise<Task | ProjectAction> {
  const [row] = await supabasePost<TaskRow>("tasks", {
    area_id: categoryToAreaId(input.area),
    front_id: input.frontId && isNumericId(input.frontId) ? Number(input.frontId) : null,
    project_id: input.projectId && isNumericId(input.projectId) ? Number(input.projectId) : null,
    title: input.title,
    quick: Boolean(input.quick),
    visible_from: input.visibleFrom || currentDateKey(),
    recurrence: input.recurrence ?? "none",
    due_date: null,
  });

  if (row.project_id) return mapProjectAction(row);

  return mapTask(
    row,
    new Map([[row.area_id, { id: row.area_id, title: input.area, sort_order: 0, active: true }]]),
  );
}

export async function updateSupabaseTaskDone(taskId: string, dueDate: string | null) {
  if (!isNumericId(taskId)) return false;
  await supabasePatch("tasks", `id=eq.${taskId}`, { due_date: dueDate });
  return true;
}

async function supabaseGet<T>(
  table: string,
  query: string,
  accessToken?: string,
): Promise<T[]> {
  const response = await fetch(`${normalizeRestUrl(SUPABASE_REST_URL)}/${table}?${query}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken ?? getSupabaseAccessToken() ?? SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T[];
}

async function supabasePost<T>(table: string, body: Record<string, unknown>): Promise<T[]> {
  const response = await fetch(`${normalizeRestUrl(SUPABASE_REST_URL)}/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${getSupabaseAccessToken() ?? SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T[];
}

async function supabasePatch(
  table: string,
  filter: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${normalizeRestUrl(SUPABASE_REST_URL)}/${table}?${filter}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${getSupabaseAccessToken() ?? SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Supabase ${table}: ${response.status} ${response.statusText}`);
  }
}

function mapFront(front: FrontRow, areaById: Map<number, AreaRow>): SupabaseManagedFront {
  return {
    id: String(front.id),
    area: normalizeCategory(areaById.get(front.area_id)?.title, front.area_id),
    title: front.title,
    objective: front.objective ?? "",
    status: normalizeStatus(front.status),
  };
}

function groupProjectActions(tasks: TaskRow[]) {
  const grouped = new Map<number, ProjectAction[]>();

  tasks.forEach((task) => {
    if (!task.project_id) return;
    const action = mapProjectAction(task);
    grouped.set(task.project_id, [...(grouped.get(task.project_id) ?? []), action]);
  });

  return grouped;
}

function mapProject(
  project: ProjectRow,
  areaById: Map<number, AreaRow>,
  frontById: Map<number, FrontRow>,
  actions: ProjectAction[],
): Project {
  const area = normalizeCategory(areaById.get(project.area_id)?.title, project.area_id);
  const front = frontById.get(project.front_id);
  const doneActions = actions.filter((action) => action.dueDate).length;
  const progress = actions.length > 0 ? Math.round((doneActions / actions.length) * 100) : 0;

  return {
    id: String(project.id),
    title: project.title,
    category: area,
    frontId: String(project.front_id),
    frontTitle: front?.title ?? "Frente",
    objective: project.objective ?? "",
    progress,
    status: normalizeStatus(project.status),
    health: "No prazo",
    nextMilestone: "",
    nextAction: "",
    deadline: formatDeadlineForUi(project.deadline),
    actions,
  };
}

function mapProjectAction(task: TaskRow): ProjectAction {
  return {
    id: String(task.id),
    title: task.title,
    quick: task.quick,
    visibleFrom: task.visible_from,
    recurrence: task.recurrence,
    dueDate: task.due_date ?? undefined,
  };
}

function mapTask(task: TaskRow, areaById: Map<number, AreaRow>): Task {
  const area = normalizeCategory(areaById.get(task.area_id)?.title, task.area_id);
  const fatherId = [toFatherSegment(area), task.front_id, task.project_id]
    .filter((segment) => segment !== null && segment !== undefined)
    .join(".");

  return {
    id: String(task.id),
    title: task.title,
    fatherId,
    quick: task.quick,
    visibleFrom: task.visible_from,
    recurrence: task.recurrence,
    dueDate: task.due_date ?? undefined,
  };
}

function normalizeRestUrl(value: string | undefined) {
  const url = value?.trim().replace(/\/$/, "");
  if (!url) return "";
  return url.endsWith("/rest/v1") ? url : `${url}/rest/v1`;
}

function normalizeCategory(value: string | undefined, areaId?: number): Category {
  const title = value?.trim();
  if (
    title === "Michelin" ||
    title === "Miray" ||
    title === "Estudos" ||
    title === "Pessoal"
  ) {
    return title;
  }
  if (areaId === 1) return "Michelin";
  if (areaId === 2) return "Miray";
  if (areaId === 3) return "Estudos";
  if (areaId === 4) return "Pessoal";
  return "Pessoal";
}

function normalizeStatus(value: string): ProjectStatus {
  return STATUS_VALUES.includes(value as ProjectStatus) ? (value as ProjectStatus) : "Em andamento";
}

function formatDeadlineForUi(value: string | null) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${day} ${SHORT_MONTHS[month - 1] ?? ""}`.trim();
}

export function formatShortDeadlineToDate(value: string) {
  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})\s+([a-zç.]+)$/);
  if (!match) return value || null;

  const day = Number(match[1]);
  const month = SHORT_MONTHS.indexOf(match[2].replace(".", ""));
  if (!day || month < 0) return value || null;

  const year = new Date().getFullYear();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isNumericId(value: string | undefined) {
  return Boolean(value && /^\d+$/.test(value));
}

function categoryToAreaId(area: Category) {
  if (area === "Michelin") return 1;
  if (area === "Miray") return 2;
  if (area === "Estudos") return 3;
  if (area === "Pessoal") return 4;
  return 4;
}

function currentDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function toFatherSegment(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
