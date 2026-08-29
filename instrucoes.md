# Instrucoes do Projeto - Yuri OS

Este arquivo e o centro de controle e documentacao viva do Yuri OS.

Sempre que houver uma mudanca relevante no produto, arquitetura, fluxo, dados, rotas, componentes ou estrategia de deploy, este arquivo deve ser auditado e atualizado quando necessario.

## Historia do App

O Yuri OS nasceu como uma primeira versao criada no Lovable. O Lovable foi usado apenas para gerar a base inicial do produto, com telas, componentes, dados sinteticos e estrutura mobile first.

A partir de agora, o projeto sera evoluido de forma independente no Codex, localmente, em parceria entre Yuri e Codex. O Lovable deve ser tratado apenas como origem historica, nao como ferramenta ativa de edicao, publicacao ou manutencao.

O objetivo inicial nao e criar mais uma lista de tarefas. O Yuri OS deve funcionar como um painel operacional da vida, capaz de responder com clareza:

"O que eu deveria estar fazendo agora e como isso se conecta com o que quero alcancar?"

## Visao do Produto

O produto conecta diferentes niveis da vida e da rotina:

- Agora
- Hoje
- Semana
- Mes
- Projetos
- Objetivos
- Habitos / Saude
- Financeiro

A hierarquia conceitual principal e:

Grandes objetivos
-> objetivos de curto e medio prazo
-> projetos
-> tarefas e proximas acoes
-> blocos de tempo
-> o que fazer agora

O diferencial central e o contexto temporal. A aplicacao deve saber o dia, a hora e o minuto atuais, e usar isso para identificar qual atividade deveria estar acontecendo naquele momento.

## Principio de UX

Mobile first e prioridade absoluta.

O app deve ser usado principalmente no celular, com uma experiencia simples, rapida e clara. Toda decisao de interface deve priorizar:

- leitura imediata;
- poucos elementos por tela;
- hierarquia visual forte;
- botoes com bom alvo de toque;
- bottom navigation;
- uso confortavel com uma mao;
- cards objetivos;
- nada de dashboard desktop pesado.

Desktop e apenas uma adaptacao, nao o foco principal.

## Decisoes de Design

- Blocos, cards e containers principais devem usar raio visual fixo de 15px. Esta decisao substitui os cantos muito arredondados da versao inicial e deve ser preservada nas novas telas.
- O header da tela Agora deve aparecer em um box verde do design system, com a data acima da hora e a meta do dia vinda da fonte de dados.

## Tela Principal - Agora

A tela "Agora" e a tela mais importante do sistema.

Ela deve responder imediatamente:

- que horas sao;
- o que Yuri deveria estar fazendo;
- ate que horas;
- qual e a acao concreta dentro do bloco;
- qual e a proxima atividade;
- como esta o progresso do dia.

Quando nao houver atividade planejada, o app deve respeitar o tempo livre. Ele nao deve tentar otimizar cada minuto do usuario.

## Stack Atual

Estado investigado em 2026-08-29:

- React 19
- TypeScript
- TanStack Start
- TanStack Router
- Vite
- Tailwind CSS 4
- Radix UI / componentes estilo shadcn
- lucide-react
- Recharts
- date-fns
- estado local com React Context
- persistencia em localStorage
- dados sinteticos em arquivo local
- PWA basico via manifest

Observacao: o projeto ainda possui rastros tecnicos do Lovable, especialmente na configuracao do Vite, scripts auxiliares e arquivos de erro. Eles devem ser removidos ou substituidos com cuidado, apenas depois de entender o impacto no build e no runtime.

## Estrutura Atual

Principais areas do projeto:

- `src/routes`: paginas e rotas TanStack.
- `src/components/yuri`: componentes especificos do produto.
- `src/components/ui`: componentes genericos de UI.
- `src/data/mockData.ts`: dados sinteticos, tipos e estruturas principais.
- `src/lib/store.tsx`: estado global, localStorage e contexto temporal.
- `src/lib/schedule.ts`: funcoes de horario, agenda e atividade atual.
- `src/styles.css`: design system, tokens e utilitarios Tailwind.
- `public/manifest.webmanifest`: configuracao PWA basica.

## Dados

Hoje os dados sao sinteticos e ficam em `src/data/mockData.ts`.

Principais estruturas:

- `schedule`: blocos de rotina por dia da semana.
- `tasks`: prioridades e tarefas.
- `todayGoal`: meta principal exibida no header da tela Agora.
- `projects`: projetos, progresso e acoes.
- `goals`: objetivos maiores.
- `habits`: habitos semanais.
- `finance`: resumo financeiro mensal.
- `financeHistory`: historico financeiro.
- `weekFocus`: foco da semana.
- `weekAreas`: progresso semanal por area.
- `monthView`: progresso mensal, conquistas e pontos de atencao.

No futuro, os mocks poderao ser substituidos por uma API, Google Sheets, Google Calendar ou outra fonte. Isso deve acontecer sem reconstruir todo o frontend.

## Logica Temporal

A logica temporal atual esta em `src/lib/schedule.ts` e `src/lib/store.tsx`.

`schedule.ts` contem:

- conversao de horario `HH:MM` para minutos;
- formatacao de horarios e duracoes;
- nomes de dias e meses;
- saudacao conforme horario;
- filtro de blocos por dia;
- calculo da atividade atual, proxima atividade, atividades passadas, progresso e tempo restante.

`store.tsx` contem:

- leitura do horario real com `new Date()`;
- atualizacao periodica a cada 20 segundos;
- modo demonstracao com dia e horario simulados;
- chamada para `getCurrentActivity`.

## Estado e Persistencia

O estado local usa a chave `yuri-os.state.v1` no `localStorage`.

Atualmente sao persistidos:

- tarefas concluidas;
- tarefas extras;
- blocos concluidos;
- acoes de projeto marcadas/desmarcadas;
- acoes extras por projeto;
- resultados-chave concluidos;
- configuracao do modo demonstracao.

Nao existe backend, banco, login, autenticacao ou sincronizacao remota neste momento.

## Rotas Atuais

- `/`: Agora
- `/hoje`: timeline do dia e resultados prioritarios
- `/semana`: foco semanal, resultados-chave e visao dos dias
- `/projetos`: lista de projetos
- `/projetos/$projectId`: detalhe de projeto
- `/mais`: hub secundario
- `/objetivos`: objetivos maiores
- `/habitos`: habitos e saude
- `/financeiro`: visao financeira gerencial
- `/mes`: visao mensal
- `/configuracoes`: modo demonstracao e reset local

## Componentes Principais

- `CurrentActivityCard`: card central da tela Agora.
- `NextActivityCard`: proximas atividades.
- `DailyProgress`: progresso do dia.
- `TimelineItem`: item da rotina em Hoje.
- `PriorityItem`: tarefa prioritaria.
- `ProjectCard`: resumo de projeto.
- `GoalCard`: objetivo maior.
- `HabitTracker`: acompanhamento simples de habitos.
- `FinanceSummary`: resumo financeiro.
- `BottomNavigation`: navegacao principal mobile.
- `PageHeader`: cabecalho padrao das telas.
- `ProgressBar` e `StatusBadge`: elementos visuais reutilizaveis.

## Decisoes de Trabalho

1. Nao reescrever o projeto do zero.
2. Nao adicionar backend, banco, login ou IA sem pedido explicito.
3. Nao adicionar dependencias sem necessidade real.
4. Preservar a experiencia mobile first.
5. Manter dados, regras de negocio, componentes e paginas separados.
6. Antes de criar componente novo, verificar se ja existe algo reutilizavel.
7. Antes de mexer na navegacao, entender as rotas e a bottom navigation.
8. Antes de mexer nos dados, entender `mockData.ts` e `store.tsx`.
9. Antes de deploy, validar build local.
10. Toda mudanca relevante deve considerar se este arquivo precisa ser atualizado.

## Divida Tecnica Conhecida

- Ainda ha dependencia de configuracao Lovable.
- A pasta local investigada nao estava inicializada como repositorio Git.
- Nao havia `node_modules` instalado na investigacao inicial.
- Semana, mes e alguns textos temporais estao fixos nos mocks.
- `dueDate` de tarefas e texto livre, como `"hoje"`.
- Progresso semanal e mensal ainda nao deriva totalmente das interacoes reais.
- A agenda nao trata blocos que cruzam meia-noite.
- Algumas rotas consomem mocks diretamente em vez de passar sempre pelo store.

## Ritual de Auditoria Antes de Mudancas

Antes de qualquer mudanca relevante, revisar:

- se a mudanca respeita a visao do Yuri OS;
- se preserva mobile first;
- se altera dados, estado, rotas, componentes ou logica temporal;
- se existe componente reutilizavel;
- se os mocks atuais suportam a mudanca;
- se `store.tsx` ou `schedule.ts` precisam ser ajustados;
- se a mudanca cria nova divida tecnica;
- se este `instrucoes.md` precisa ser atualizado.

Depois de qualquer mudanca relevante, registrar neste arquivo:

- nova decisao importante;
- nova dependencia;
- nova rota;
- nova fonte de dados;
- mudanca na logica temporal;
- mudanca na persistencia;
- mudanca no fluxo de publicacao;
- problema conhecido que surgiu.

## Proximos Passos Recomendados

Prioridade atual:

1. Remover a dependencia ativa do Lovable de forma controlada.
2. Instalar dependencias e validar `dev`, `build` e `lint`.
3. Criar testes para a logica temporal em `schedule.ts`.
4. Centralizar consumo de dados via `store.tsx`.
5. Normalizar datas, semana atual e progresso derivado.

## Estado Atual do Projeto

O app esta em fase de prototipo funcional local, com boa base visual e conceitual. A prioridade agora e consolidar a independencia tecnica, preservar o que funciona e evoluir o produto por pequenas mudancas bem auditadas.
