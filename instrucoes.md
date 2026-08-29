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

- Hoje
- Agora dentro de Hoje
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
- O header da tela Hoje deve aparecer em um box verde do design system, com a coluna direita na ordem hora, data por extenso com virgula e dia da semana. Na coluna esquerda, o rotulo deve ser "Sua meta de hoje:" e a meta deve vir na linha seguinte com peso medio, vinda da fonte de dados. A coluna esquerda deve ser estreita, usando 170px como referencia, mantendo respiro visivel entre ela e a coluna direita.
- A largura maxima da experiencia deve mirar o viewport real do S25 Ultra, usando o container `max-w-s25` de 380px para o conteudo principal e a bottom navigation. O aparelho tem largura fisica de 1440px, mas a interface do Chrome/Android trabalha em pixels CSS apos escala do dispositivo; por isso a referencia visual do app deve ser calibrada por viewport CSS, nao por pixels fisicos.
- O topo do app deve sempre ter respiro padrao antes do primeiro elemento, definido por `--app-top-space`. A distancia entre blocos/cards principais deve ser consistente e compacta, usando 12px como referencia visual.
- A fonte oficial do app deve ser Geist, usando suas variacoes de peso pelo carregamento `100..900`.

## Tela Principal - Hoje

A tela "Hoje" e a tela mais importante do sistema. Ela concentra a antiga tela Agora e a antiga tela Hoje em uma unica experiencia mobile.

Ela deve responder imediatamente:

- que horas sao;
- o que Yuri deveria estar fazendo;
- ate que horas;
- qual e a acao concreta dentro do bloco;
- qual e a proxima atividade;
- como esta o progresso do dia.
- quais sao os resultados prioritarios;
- qual e a rotina completa do dia.

Quando nao houver atividade planejada, o app deve respeitar o tempo livre. Ele nao deve tentar otimizar cada minuto do usuario.

No card principal de atividade atual, existe uma separacao conceitual entre contexto/bloco maior e atividade:

- O contexto/bloco maior aparece como categoria, por exemplo Michelin, Miray, Saude, Alimentacao ou Estudos.
- O titulo deve representar a atividade concreta dentro daquele contexto.
- A barra de progresso representa a atividade atual, nao necessariamente o bloco maior.
- O card nao deve exibir, por enquanto, o horario final do contexto/bloco maior; essa informacao ficou excessiva visualmente.
- A atividade atual pode ter `activityChecklist`, uma lista de itens concretos a executar naquela atividade.
- A barra de progresso de tempo da atividade deve aparecer acima do checklist, deixando claro primeiro o intervalo/tempo restante e depois a lista operacional do que executar.
- O card principal da tela Hoje deve permitir navegacao por gesto horizontal no mobile, com efeito de slideshow: durante o arraste, o card atual deve acompanhar o dedo e o card anterior/proximo deve aparecer vindo da lateral. Arrastar para a direita mostra a atividade anterior do dia; arrastar da direita para a esquerda mostra a proxima atividade. O checklist, itens adicionados e estado de conclusao devem sempre se aplicar a atividade que estiver em foco no card.
- No slideshow, cada atividade deve se comportar como um cartao completo: fundo, borda, raio e conteudo se movem juntos. O container externo funciona apenas como palco/clipe visual, sem parecer uma moldura fixa por onde o conteudo passa.
- Deve existir uma pequena distancia visual entre os cartoes do slideshow para evitar bordas grudadas durante o arraste.
- O card fechado deve ter altura suficiente para exibir o botao "Ver detalhes". Ao abrir detalhes, o proprio card pode expandir verticalmente; ao iniciar um gesto horizontal, detalhes abertos devem se contrair para preservar a fluidez do slide.
- Controles internos como botoes e inputs nao devem iniciar o gesto de slideshow, para preservar cliques como "Ver detalhes", adicionar item e marcar checklist.
- Os cards do slideshow da tela Hoje devem ter altura fixa e consistente entre atividade atual, anterior e proxima. O checklist tambem deve manter altura fixa mesmo quando nao houver itens, para evitar saltos visuais durante a navegacao.
- Textos estruturais do card, como categoria, titulo da atividade, horarios e status, devem permanecer em uma unica linha. Quando houver risco de quebra, a fonte do titulo deve diminuir ate caber. A excecao sao os textos das tasks do checklist, que podem quebrar linha dentro da area fixa do checklist.
- Quando o usuario tentar navegar por gesto para antes da primeira atividade ou depois da ultima atividade do dia, o card deve mostrar um feedback animado discreto indicando "Nada antes" ou "Nada depois".
- Quando `activityChecklist` nao existir, `nextAction` pode funcionar como fallback de item unico.
- O checklist deve exibir contador de itens concluidos no canto superior direito, alinhado com a palavra CHECKLIST. O texto de cada item deve poder quebrar linha para permitir leitura completa, sem truncamento.
- A area visual do checklist deve ter altura fixa para mostrar aproximadamente 3 itens por vez e usar rolagem interna. Itens concluidos ficam acima; itens pendentes ficam abaixo. Ao abrir a atividade, a rolagem deve iniciar no primeiro item pendente, permitindo rolar para cima para ver o que ja foi executado e para baixo para ver o que falta executar.
- Deve existir um controle para adicionar itens manualmente ao checklist da atividade atual.
- O card de atividade atual nao deve ter botao separado de concluir; o checklist deve concentrar a execucao da atividade.
- Itens do checklist podem ter flag `priority`. Enquanto estiverem pendentes, itens prioritarios aparecem no topo, preservando a ordem de entrada entre eles, e devem receber destaque por uma bolinha verde discreta no canto superior direito do item, sem contorno e sem pilula textual ocupando espaco. Itens sem prioridade aparecem depois, tambem preservando a ordem de entrada. Depois de concluidos, os itens nao precisam mais manter hierarquia de prioridade. O controle manual de prioridade deve usar icone de bandeira, sem texto.
- Os itens marcados e itens adicionados manualmente ao checklist da atividade devem persistir localmente no `localStorage`.
- Barras de rolagem internas, como a do checklist da atividade, devem usar visual discreto com trilho transparente e barra/setas no cinza escuro do background do app.

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
- `todayGoal`: meta principal exibida no header da tela Hoje.
- `projects`: projetos, progresso e acoes.
- `goals`: objetivos maiores.
- `habits`: habitos semanais.
- `finance`: resumo financeiro mensal.
- `financeHistory`: historico financeiro.
- `weekFocus`: foco da semana.
- `weekAreas`: progresso semanal por area.
- `monthView`: progresso mensal, conquistas e pontos de atencao.

No futuro, os mocks poderao ser substituidos por uma API, Google Sheets, Google Calendar ou outra fonte. Isso deve acontecer sem reconstruir todo o frontend.

Dados mockados especificos para desenvolvimento local podem ficar em `src/data/mock/`. Esses mocks existem para facilitar trabalho visual e funcional no Codex quando uma API externa estiver indisponivel localmente. Em producao, a aplicacao deve priorizar dados reais vindos das rotas server-side, APIs e futuramente planilhas; mocks locais nao devem mascarar falhas de integracao no deploy.

## Integracoes Externas

- Intervals.icu foi iniciado como integracao server-side para leitura de dados de saude vindos do fluxo Huawei Watch -> Huawei Health -> Health Sync -> Intervals.icu -> Yuri OS.
- A API key do Intervals.icu nunca deve ir para o frontend, bundle, logs, resposta JSON ou GitHub.
- Durante o MVP, os endpoints internos de saude podem ficar publicos, mas devem expor apenas dados normalizados necessarios para a interface. A chave do Intervals.icu deve continuar somente no servidor.
- Variaveis obrigatorias no servidor: `INTERVALS_API_KEY` e `INTERVALS_ATHLETE_ID`. No deploy Cloudflare/Nitro, essas variaveis devem ser cadastradas como secrets/bindings do ambiente publicado; no desenvolvimento local, podem ficar em `.env.local`.
- A integracao server-side deve ler credenciais tanto de `process.env` quanto do objeto `env` recebido pelo runtime do deploy, para funcionar localmente e no servidor publicado.
- Endpoints internos criados para validacao: `/api/health/today` para JSON normalizado, `/api/health/recent` para os ultimos 10 dias e `/api/health/debug` para inspecionar campos reais retornados sem credenciais.
- O endpoint `/api/health/debug` retorna dados brutos de saude e deve ficar restrito ao desenvolvimento; em producao, so habilitar temporariamente com `HEALTH_DEBUG_ENABLED=true`.
- A aba Habitos / Saude consome `/api/health/recent` sem polling para exibir apenas data, passos e horas de sono. O numero principal dos cards deve ser sempre do dia atual, enquanto o grafico mostra a evolucao dos ultimos 10 dias, incluindo hoje. As metas de MVP estao mockadas no frontend: 6.000 passos por dia e 8h de sono por dia. Cada card deve mostrar uma barra de progresso abaixo do numero principal indicando o andamento ate a meta do dia. Os graficos de saude devem ficar compactos na parte superior direita do card, usando 10 colunas finas com cantos arredondados, barras proximas entre si e sem labels visiveis no eixo X. Colunas de dias que atingiram a meta devem usar o verde principal; colunas de dias abaixo da meta devem usar um tom vermelho/rosa compativel com o design. Por enquanto, a interface deve ignorar os demais campos do Intervals.icu.
- Durante desenvolvimento local, se `/api/health/recent` falhar, a tela de Saude pode carregar `src/data/mock/health.ts` como fallback visual. Esse fallback deve ser condicionado a `import.meta.env.DEV` e nao deve substituir dados reais em producao.

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

- `/`: Hoje, com contexto de agora, progresso, resultados prioritarios e timeline do dia
- `/hoje`: rota legada da timeline do dia, mantida temporariamente ate decidirmos remover ou redirecionar
- `/semana`: foco semanal, resultados-chave e visao dos dias
- `/projetos`: lista de projetos
- `/projetos/$projectId`: detalhe de projeto
- `/mais`: hub secundario
- `/objetivos`: objetivos maiores
- `/habitos`: habitos e saude
- `/financeiro`: visao financeira gerencial
- `/mes`: visao mensal
- `/configuracoes`: modo demonstracao e reset local

## Navegacao Principal

A bottom navigation mobile deve priorizar cinco entradas principais:

- Hoje (`/`)
- Semana (`/semana`)
- Financeiro (`/financeiro`)
- Saude (`/habitos`)
- Mais (`/mais`)

A entrada Mais deve funcionar como acesso secundario para Projetos, Objetivos, Mes e Configuracoes, sem repetir telas que ja estao no menu inferior. Financeiro deve usar icone de carteira no menu principal.

## Componentes Principais

- `CurrentActivityCard`: card central de contexto atual dentro da tela Hoje.
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
