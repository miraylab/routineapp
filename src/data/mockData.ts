/**
 * Camada de dados sintéticos do YURI OS.
 * Estruturada para ser trocada futuramente por uma API (Sheets/Calendar/etc.)
 * sem alterar componentes: tudo é consumido via hooks em src/lib/store.tsx.
 */

export type Category =
  | "Michelin"
  | "Trabalho"
  | "Miray"
  | "Saúde"
  | "Alimentação"
  | "Estudos"
  | "Rotina"
  | "Pessoal"
  | "Tempo livre";

export interface ScheduleBlock {
  id: string;
  dayOfWeek: number; // 0 = domingo ... 6 = sábado
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  blockEndTime?: string; // fim do contexto/bloco maior da rotina
  cardType?: "activity" | "routine";
  category: Category;
  title: string;
  subtitle?: string;
  description?: string;
  nextAction?: string;
  activityChecklist?: ActivityChecklistItemSeed[];
  routineItems?: string[];
  routineReviewLabel?: string;
  expectedResult?: string;
  projectId?: string;
  taskId?: string;
}

export type ActivityChecklistItemSeed = string | { title: string; priority?: boolean };

export interface Task {
  id: string;
  title: string;
  fatherId: string;
  quick?: boolean;
  visibleFrom?: string;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  dueDate?: string; // data de conclusao; vazio = aberta
}

export interface ProjectAction {
  id: string;
  title: string;
  quick?: boolean;
  visibleFrom?: string;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  dueDate?: string; // data de conclusao; vazio = aberta
  note?: string;
}

export interface Project {
  id: string;
  title: string;
  category: Category;
  frontId: string;
  frontTitle: string;
  objective: string;
  progress: number;
  status: ProjectStatus;
  health: "No prazo" | "Atenção" | "Atrasado";
  nextMilestone: string;
  nextAction: string;
  deadline: string;
  actions: ProjectAction[];
}

export type ProjectStatus = "Em andamento" | "Concluído" | "Arquivado";

export interface Goal {
  id: string;
  area: string;
  title: string;
  horizon: "Longo prazo";
  progress: number;
  quarter: string[];
  relatedProjects: string[];
}

export interface WeekMilestone {
  id: string;
  title: string;
  dayLabel: string;
  date?: string;
  detail?: string;
}

export interface Habit {
  id: string;
  title: string;
  unit?: string;
  weeklyTarget: number;
  weeklyCompleted: number;
  note?: string;
}

export interface DailyHabit {
  id: string;
  title: string;
  streakDays?: number;
  daysOfWeek?: number[];
}

export interface FinanceMonth {
  month: string;
  income: number;
  fixedExpenses: number;
  variableExpenses: number;
  variableBudget: number;
  leisure: number;
  leisureBudget: number;
  investments: number;
  available: number;
}

/* ----------------------------- AGENDA SEMANAL ---------------------------- */

const b = (
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  category: Category,
  title: string,
  extra: Partial<ScheduleBlock> = {},
): ScheduleBlock => ({
  id: `${dayOfWeek}-${startTime}-${title}`.toLowerCase().replace(/\s+/g, "-"),
  dayOfWeek,
  startTime,
  endTime,
  category,
  title,
  ...extra,
});

const workMorning = (d: number) =>
  b(d, "08:30", "12:00", "Michelin", "Revisar dashboard RQE", {
    blockEndTime: "17:00",
    description: "Análises e entregas do time de dados.",
    nextAction: "Fechar a análise de retenção do trimestre.",
    projectId: "dashboard-rqe",
    activityChecklist: [
      { title: "Mandar email X", priority: true },
      "Validar dados carregados no dashboard",
      "Revisar filtros principais",
      "Registrar pendências para o time",
    ],
  });

const workAfternoon = (d: number) =>
  b(d, "12:40", "17:00", "Michelin", "Executar entregas do time", {
    blockEndTime: "17:00",
    description: "Reuniões, revisões e entregas.",
    nextAction: "Revisar o documento de discovery com o time.",
    projectId: "dashboard-rqe",
    activityChecklist: [
      { title: "Enviar status rápido para o time", priority: true },
      "Responder mensagens prioritárias",
      "Atualizar entregas em andamento",
      "Separar próximos bloqueios",
    ],
  });

const lunch = (d: number) =>
  b(d, "12:00", "12:40", "Alimentação", "Almoço", {
    cardType: "routine",
    routineReviewLabel: "Aderência",
    routineItems: [
      "Prato base com proteína",
      "Legumes ou salada",
      "Carboidrato na porção planejada",
      "Sem sobremesa fora do plano",
    ],
  });
const sleep = (d: number) => b(d, "21:30", "23:30", "Rotina", "Sono");

const strengthRoutine = (focus: string) => ({
  cardType: "routine" as const,
  routineReviewLabel: "Nota do treino",
  routineItems: [
    "Aquecimento e mobilidade",
    focus,
    "Exercício principal com carga controlada",
    "Acessórios do treino",
    "Alongamento rápido no fim",
  ],
});

const runningRoutine = (focus: string) => ({
  cardType: "routine" as const,
  routineReviewLabel: "Nota do treino",
  routineItems: ["Aquecimento leve", focus, "Desaceleração", "Alongamento rápido no fim"],
});

export const schedule: ScheduleBlock[] = [
  // Segunda
  b(1, "05:20", "05:55", "Rotina", "Preparação", {
    description: "Água, alongamento e revisão do dia.",
  }),
  b(1, "06:10", "07:00", "Estudos", "Curso de Produto", {
    subtitle: "Módulo 4",
    description: "Aula 2 · Descoberta de problemas.",
    nextAction: "Assistir a aula 2 e registrar 3 anotações.",
    projectId: "curso-produto",
  }),
  b(1, "07:00", "08:20", "Saúde", "Musculação", {
    subtitle: "Treino A · Peito e tríceps",
    description: "Treino de força, 5 exercícios.",
    nextAction: "Supino 4x8 com carga progressiva.",
    ...strengthRoutine("Peito e tríceps"),
  }),
  workMorning(1),
  lunch(1),
  workAfternoon(1),
  b(1, "17:00", "18:30", "Estudos", "Leitura / deslocamento", {
    description: "Leitura de 'Inspired' no trajeto.",
  }),
  b(1, "19:30", "20:45", "Miray", "Construção de produto", {
    subtitle: "Robô Instagram",
    description: "Testar geração de pautas do Instagram.",
    nextAction: "Rodar o fluxo com o novo posicionamento editorial.",
    expectedResult: "Gerar ao menos 10 pautas e selecionar 3 utilizáveis.",
    projectId: "robo-instagram",
    taskId: "t3",
  }),
  b(1, "20:45", "21:30", "Rotina", "Preparação para dormir"),
  sleep(1),

  // Terça
  b(2, "05:00", "05:55", "Rotina", "Preparação"),
  b(2, "06:10", "07:00", "Estudos", "Curso de Produto", {
    subtitle: "Módulo 4",
    nextAction: "Aula 3 · Métricas de produto.",
    projectId: "curso-produto",
  }),
  b(2, "07:00", "08:30", "Pessoal", "Margem estratégica", {
    description: "Espaço para pensar, escrever e decidir.",
  }),
  workMorning(2),
  lunch(2),
  workAfternoon(2),
  b(2, "17:00", "18:30", "Estudos", "Leitura"),
  b(2, "18:40", "19:30", "Saúde", "Corrida", {
    subtitle: "6 km em ritmo leve",
    ...runningRoutine("6 km em ritmo leve"),
  }),
  sleep(2),

  // Quarta (semelhante à segunda)
  b(3, "05:20", "05:55", "Rotina", "Preparação"),
  b(3, "06:10", "07:00", "Estudos", "Curso de Produto", {
    subtitle: "Módulo 4",
    projectId: "curso-produto",
  }),
  b(3, "07:00", "08:20", "Saúde", "Musculação", {
    subtitle: "Treino B · Costas e bíceps",
    ...strengthRoutine("Costas e bíceps"),
  }),
  workMorning(3),
  lunch(3),
  workAfternoon(3),
  b(3, "17:00", "18:30", "Estudos", "Leitura / deslocamento"),
  b(3, "19:30", "20:45", "Miray", "Construção de produto", {
    subtitle: "Estruturação Miray",
    nextAction: "Mapear opções de produto escalável.",
    projectId: "miray-estrutura",
  }),
  sleep(3),

  // Quinta (semelhante à terça)
  b(4, "05:00", "05:55", "Rotina", "Preparação"),
  b(4, "06:10", "07:00", "Estudos", "Curso de Produto", {
    projectId: "curso-produto",
  }),
  b(4, "07:00", "08:30", "Pessoal", "Margem estratégica"),
  workMorning(4),
  lunch(4),
  workAfternoon(4),
  b(4, "17:00", "18:30", "Estudos", "Leitura"),
  b(4, "18:40", "19:30", "Saúde", "Corrida", {
    subtitle: "Intervalado",
    ...runningRoutine("Blocos intervalados"),
  }),
  sleep(4),

  // Sexta
  b(5, "05:20", "05:55", "Rotina", "Preparação"),
  b(5, "06:10", "07:00", "Saúde", "Musculação", {
    subtitle: "Treino C · Pernas",
    ...strengthRoutine("Pernas"),
  }),
  workMorning(5),
  lunch(5),
  workAfternoon(5),
  b(5, "17:00", "18:30", "Pessoal", "Encerramento da semana", {
    description: "Revisar entregas e limpar pendências.",
  }),
  sleep(5),

  // Sábado
  b(6, "07:00", "08:00", "Saúde", "Corrida", {
    subtitle: "10 km longão",
    ...runningRoutine("10 km longão"),
  }),
  b(6, "08:00", "11:00", "Estudos", "Inglês", {
    description: "Aula e conversação.",
  }),
  b(6, "14:00", "17:00", "Miray", "Bloco Miray", {
    blockEndTime: "17:00",
    subtitle: "Robô Instagram",
    nextAction: "Produzir o primeiro carrossel.",
    activityChecklist: [
      { title: "Separar referência visual principal", priority: true },
      "Escolher o tema do carrossel",
      "Escrever a primeira versão",
      "Separar pontos para revisão",
    ],
    projectId: "robo-instagram",
  }),

  // Domingo
  b(0, "08:00", "09:20", "Saúde", "Musculação", {
    subtitle: "Treino full body",
    ...strengthRoutine("Full body"),
  }),
  b(0, "17:00", "18:00", "Pessoal", "Planejamento da semana", {
    description: "Definir foco, resultados e blocos da semana.",
    nextAction: "Escolher o foco único da próxima semana.",
  }),
];

/* --------------------------------- TAREFAS -------------------------------- */

export const tasks: Task[] = [
  {
    id: "t1",
    title: "Finalizar análise de retenção",
    fatherId: "michelin.michelin-data-driven",
    dueDate: "2026-08-30",
  },
  {
    id: "t2",
    title: "Completar aula 4 do curso",
    fatherId: "estudos.estudos-produto.curso-produto",
    dueDate: "2026-08-30",
  },
  {
    id: "t3",
    title: "Testar geração de pautas",
    fatherId: "miray.miray-conteudo.robo-instagram",
  },
  {
    id: "t4",
    title: "Conferir atualização dos indicadores RQE",
    fatherId: "michelin.michelin-data-driven",
  },
  {
    id: "t5",
    title: "Enviar resumo dos desvios para o time",
    fatherId: "michelin.michelin-data-driven",
    quick: true,
  },
  {
    id: "t6",
    title: "Validar regra de cálculo do painel mensal",
    fatherId: "michelin.michelin-data-driven",
  },
  {
    id: "t7",
    title: "Separar dúvidas para a próxima reunião",
    fatherId: "michelin.michelin-data-driven",
    quick: true,
  },
];

/* -------------------------------- PROJETOS -------------------------------- */

export const projects: Project[] = [
  {
    id: "dashboard-rqe",
    title: "Dashboard RQE",
    category: "Michelin",
    frontId: "michelin-data-driven",
    frontTitle: "Data-Driven",
    objective: "Melhorar a leitura dos indicadores de RQE e reduzir fricção nas decisões do time.",
    progress: 54,
    status: "Em andamento",
    health: "No prazo",
    nextMilestone: "Revisão executiva do dashboard",
    nextAction: "Validar dados carregados no dashboard",
    deadline: "18 set",
    actions: [
      { id: "rqe-a1", title: "Revisar filtros principais", dueDate: "2026-08-30" },
      { id: "rqe-a2", title: "Validar dados carregados" },
      { id: "rqe-a3", title: "Registrar pendências para o time" },
      { id: "rqe-a4", title: "Preparar visão executiva" },
    ],
  },
  {
    id: "robo-instagram",
    title: "Robô Instagram",
    category: "Miray",
    frontId: "miray-conteudo",
    frontTitle: "Conteúdo Inteligente",
    objective:
      "Criar um sistema capaz de gerar conteúdo autoral consistente sobre negócios inteligentes.",
    progress: 65,
    status: "Em andamento",
    health: "No prazo",
    nextMilestone: "Primeiro carrossel publicado",
    nextAction: "Testar prompt editorial",
    deadline: "12 set",
    actions: [
      { id: "a1", title: "Definir posicionamento", dueDate: "2026-08-30" },
      { id: "a2", title: "Definir ICP", dueDate: "2026-08-30" },
      { id: "a3", title: "Criar linha editorial", dueDate: "2026-08-30" },
      { id: "a4", title: "Atualizar prompt do robô" },
      { id: "a5", title: "Gerar 10 pautas" },
      { id: "a6", title: "Selecionar 3 pautas" },
      { id: "a7", title: "Criar primeiro carrossel" },
    ],
  },
  {
    id: "curso-produto",
    title: "Curso de Produto",
    category: "Estudos",
    frontId: "estudos-produto",
    frontTitle: "Produto",
    objective: "Construir repertório sólido em descoberta, métricas e estratégia de produto.",
    progress: 42,
    status: "Em andamento",
    health: "No prazo",
    nextMilestone: "Concluir o módulo 4",
    nextAction: "Módulo 4 · Aula 2",
    deadline: "30 set",
    actions: [
      { id: "b1", title: "Módulo 1 · Fundamentos", dueDate: "2026-08-30" },
      { id: "b2", title: "Módulo 2 · Discovery", dueDate: "2026-08-30" },
      { id: "b3", title: "Módulo 3 · Priorização", dueDate: "2026-08-30" },
      { id: "b4", title: "Módulo 4 · Métricas" },
      { id: "b5", title: "Módulo 5 · Estratégia" },
      { id: "b6", title: "Projeto final" },
    ],
  },
  {
    id: "miray-estrutura",
    title: "Estruturação Miray",
    category: "Miray",
    frontId: "miray-produto",
    frontTitle: "Produto",
    objective: "Transformar a Miray em uma operação orientada a produtos escaláveis.",
    progress: 28,
    status: "Em andamento",
    health: "Atenção",
    nextMilestone: "Definir primeiro produto escalável",
    nextAction: "Mapear 3 formatos de oferta",
    deadline: "30 out",
    actions: [
      { id: "c1", title: "Diagnóstico da operação atual", dueDate: "2026-08-30" },
      { id: "c2", title: "Definir tese de posicionamento", dueDate: "2026-08-30" },
      { id: "c3", title: "Mapear 3 formatos de oferta" },
      { id: "c4", title: "Validar preço com 5 conversas" },
      { id: "c5", title: "Desenhar processo comercial" },
    ],
  },
];

/* -------------------------------- OBJETIVOS ------------------------------- */

export const goals: Goal[] = [
  {
    id: "g-carreira",
    area: "Carreira",
    title: "Tornar-me um excelente líder na área de dados e analytics.",
    horizon: "Longo prazo",
    progress: 61,
    quarter: [
      "Liderar um projeto de ponta a ponta",
      "Estruturar rituais do time",
      "Publicar 1 estudo interno de impacto",
    ],
    relatedProjects: [],
  },
  {
    id: "g-negocio",
    area: "Negócio",
    title: "Construir uma empresa orientada a produtos escaláveis.",
    horizon: "Longo prazo",
    progress: 44,
    quarter: [
      "Colocar o Robô Instagram em funcionamento",
      "Definir o Produto 1",
      "Criar um processo comercial simples",
    ],
    relatedProjects: ["robo-instagram", "miray-estrutura"],
  },
  {
    id: "g-saude",
    area: "Saúde",
    title: "Manter força, condicionamento e rotina consistente.",
    horizon: "Longo prazo",
    progress: 78,
    quarter: [
      "4 treinos de força por semana",
      "Correr 10 km sem parar",
      "Média de sono acima de 7h30",
    ],
    relatedProjects: [],
  },
  {
    id: "g-conhecimento",
    area: "Conhecimento",
    title: "Construir repertório em produto, liderança e negócios.",
    horizon: "Longo prazo",
    progress: 53,
    quarter: ["Concluir o curso de produto", "Ler 3 livros de negócio", "Retomar o inglês semanal"],
    relatedProjects: ["curso-produto"],
  },
  {
    id: "g-financeiro",
    area: "Financeiro",
    title: "Aumentar patrimônio e segurança financeira.",
    horizon: "Longo prazo",
    progress: 66,
    quarter: ["Taxa de poupança acima de 25%", "Reserva de 8 meses", "Primeira receita da Miray"],
    relatedProjects: [],
  },
];

/* --------------------------------- HÁBITOS -------------------------------- */

export const habits: Habit[] = [
  { id: "h1", title: "Musculação", weeklyTarget: 4, weeklyCompleted: 3 },
  { id: "h2", title: "Corrida", weeklyTarget: 3, weeklyCompleted: 2 },
  {
    id: "h3",
    title: "Sono",
    weeklyTarget: 7,
    weeklyCompleted: 6,
    note: "Média 7h34",
  },
  { id: "h4", title: "Leitura", weeklyTarget: 5, weeklyCompleted: 4 },
  { id: "h5", title: "Curso", weeklyTarget: 5, weeklyCompleted: 3 },
];

export const dailyHabits: DailyHabit[] = [
  { id: "dh-agua-4l", title: "Beber 4L de água", streakDays: 12 },
  { id: "dh-alimentacao-saudavel", title: "Alimentação Saudável", streakDays: 5 },
  { id: "dh-leitura", title: "Leitura", streakDays: 3 },
  { id: "dh-treino", title: "Treino", streakDays: 2 },
];

/* ------------------------------- FINANCEIRO ------------------------------- */

export const finance: FinanceMonth = {
  month: "Setembro",
  income: 12400,
  fixedExpenses: 4200,
  variableExpenses: 2100,
  variableBudget: 2500,
  leisure: 530,
  leisureBudget: 800,
  investments: 3200,
  available: 1950,
};

export const financeHistory = [
  { month: "Abr", income: 11200, saved: 2400 },
  { month: "Mai", income: 11600, saved: 2650 },
  { month: "Jun", income: 11900, saved: 2500 },
  { month: "Jul", income: 12100, saved: 2900 },
  { month: "Ago", income: 12250, saved: 3050 },
  { month: "Set", income: 12400, saved: 3200 },
];

/* ---------------------------------- HOJE ---------------------------------- */

export const todayGoal = "Avançar o MVP do robô de conteúdo sem perder a rotina base.";

/* --------------------------------- SEMANA --------------------------------- */

export const weekFocus = {
  range: "31 ago — 06 set",
  title: "Finalizar o MVP do robô de conteúdo.",
  daysLeft: 4,
  keyResults: [
    { id: "kr1", title: "Novo posicionamento definido", done: true },
    { id: "kr2", title: "ICP definido", done: true },
    { id: "kr3", title: "Prompt editorial integrado", done: false },
    { id: "kr4", title: "Primeiro carrossel produzido", done: false },
  ],
};

export const weekMilestones: WeekMilestone[] = [
  {
    id: "wm-entrega-miray",
    title: "Entrega do planejamento Miray",
    dayLabel: "QUA",
    date: "02 set",
    detail:
      "Fechar foco da semana, blocos de execução e próximos entregáveis do MVP para destravar a rotina de produção.",
  },
  {
    id: "wm-dashboard-rqe",
    title: "Revisão do dashboard RQE",
    dayLabel: "QUI",
    date: "03 set",
    detail:
      "Validar principais leituras, pontos de atrito e próximos ajustes antes de avançar para a versão de apresentação.",
  },
  {
    id: "wm-viagem",
    title: "Organizar viagem para Belo Horizonte",
    dayLabel: "SÁB",
    date: "05 set",
    detail:
      "Separar horários, deslocamento e pendências pessoais para reduzir ruído antes do fim de semana.",
  },
];

export const weekAreas = [
  {
    id: "carreira",
    title: "Carreira",
    metrics: [{ label: "Resultados", done: 2, total: 3 }],
  },
  {
    id: "miray",
    title: "Miray",
    metrics: [{ label: "Resultados", done: 1, total: 3 }],
  },
  {
    id: "saude",
    title: "Saúde",
    metrics: [
      { label: "Musculação", done: 2, total: 4 },
      { label: "Corrida", done: 1, total: 3 },
    ],
  },
  {
    id: "estudos",
    title: "Estudos",
    metrics: [
      { label: "Produto", done: 3, total: 5 },
      { label: "Leitura", done: 2, total: 5 },
    ],
  },
];

/* ---------------------------------- MÊS ----------------------------------- */

export const monthView = {
  month: "Setembro",
  areas: [
    { title: "Carreira", progress: 78 },
    { title: "Miray", progress: 52 },
    { title: "Saúde", progress: 81 },
    { title: "Estudos", progress: 69 },
    { title: "Financeiro", progress: 87 },
  ],
  achievements: ["14 treinos realizados", "8 sessões de estudo", "Análise de retenção entregue"],
  attention: ["Estruturação Miray está 5 dias sem avanço."],
};
