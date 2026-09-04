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

Na tela Projetos, a hierarquia operacional deve ser:

Area
-> Frente
-> Projeto
-> Tarefa

Areas iniciais: Michelin, Miray e Estudos. Saude fica em aba propria e nao deve entrar como area principal de projetos por enquanto. A Frente representa uma camada macro dentro da area, como Data-Driven na Michelin, Conteudo Inteligente ou Produto na Miray, e Produto/Lideranca/Tecnologia nos Estudos. O Projeto representa uma iniciativa concreta, como Dashboard RQE, Robo Instagram, Estruturacao Miray ou Curso de Produto. Tarefas podem pertencer diretamente a uma Frente quando forem acoes soltas, sem exigir a criacao de um projeto artificial.

A pagina Projetos nao deve abrir com um header textual generico do tipo "Projetos / X areas / Y projetos", pois isso agrega pouco. Esse espaco superior deve ser preservado como um cartao visual; por enquanto fica vazio, e depois pode receber imagem e metricas mais uteis como numero de frentes e projetos. Os botoes de troca de area devem ter largura fixa igual entre si, mas compacta o suficiente para nao parecerem esticados. Ao filtrar uma area, nao deve haver um box extra repetindo o nome da area; as frentes aparecem diretamente como blocos. Cada frente deve mostrar primeiro seu nome, depois tarefas soltas da frente em pilulas, depois projetos ligados a ela dentro de boxes/cartoes. A frente nao deve exibir titulo "FRENTE" nem barra de progresso propria por enquanto.
Na aba Projetos, a navegacao superior deve ter quatro entradas encaixadas na largura total: Michelin, Miray, Estudos e Pessoal. A entrada Pessoal deve ser um botao quadrado com icone de usuario e, por enquanto, representa as notas de alivio/coisas pessoais.
Na listagem de projetos dentro de uma Frente, os cards de projeto devem ser compactos e acionaveis, mantendo altura enxuta: titulo do projeto com hierarquia visual maior e, logo abaixo, pilula pequena de prazo relativo no formato "Faltam X dias". O contador de tarefas abertas deve ficar no extremo direito do card, em um bloco quadrado/arredondado maior, ocupando a altura interna do box respeitando os respiros. Nao devem mostrar barra de progresso, percentual, seta interna, `health`/`No prazo` nem `nextAction` como subtitulo.
Na tela Projetos, as tarefas diretas de uma Frente devem aparecer em um box proprio, com checklist, limite visual de aproximadamente 3 tarefas e rolagem interna quando passar disso. Se todas as tarefas visiveis da Frente estiverem concluidas, o box deve mostrar um botao de fechar no canto superior direito para esconder aquele bloco; nesse estado, o contador "0 abertas" nao deve aparecer. Se surgir uma tarefa aberta, o bloco volta a aparecer.
Ao entrar na pagina detalhada de uma Frente (`/projetos/frentes/:frontId`), a tela funciona como final do funil e deve mostrar todas as tarefas daquela Frente, inclusive as ja executadas em dias anteriores. A regra operacional de esconder tarefas concluidas antes de hoje vale para telas de execucao/leitura rapida, nao para essa visao historica e detalhada da Frente.
Na pagina detalhada de uma Frente, a lista de tarefas deve ficar dentro de um box interno proprio, para dar parede visual a lista e deixar a rolagem natural. A criacao de tarefa nessa tela nao deve acontecer inline: o botao "+ Adicionar tarefa" abre um popup/modal com campo de texto maior e configuracoes detalhadas como tarefa rapida, data de aparicao e recorrencia.
Na pagina detalhada de uma Frente, a frente tambem deve ter status proprio e editavel entre "Em andamento", "Concluído" e "Arquivado", persistido localmente por `frontId` no MVP. Esse status nao deve depender do status dos projetos filhos.
Na pagina detalhada de uma Frente, a secao de Projetos deve usar exatamente o mesmo padrao visual dos cards de projeto da tela Projetos, para manter consistencia entre listagem e aprofundamento.
Na pagina detalhada de um Projeto (`/projetos/:projectId`), a hierarquia deve ser: topo com pilula de prazo relativo ("Faltam X dias") e pilula de status atual, depois objetivo e depois historico de tarefas. Nao deve existir bloco "Marco Atual", barra de progresso, percentual ou health nessa tela. O status do projeto pode ser alterado localmente entre "Em andamento", "Concluído" e "Arquivado", permitindo finalizar o projeto no MVP.
Na pagina detalhada de um Projeto (`/projetos/:projectId`), o bloco de tarefas tambem deve se chamar "HISTÓRICO DE TAREFAS" e usar o mesmo padrao visual da pagina detalhada da Frente: box interno para a lista, altura maxima com rolagem, todas as tarefas do projeto visiveis independentemente da data de conclusao e botao "+ Adicionar tarefa" abrindo popup/modal de criacao detalhada.
Dentro de cada area, cada frente deve exibir tarefas abertas da propria frente como checklist clicavel. Se nao houver nenhuma tarefa aberta, a secao de tarefas nao aparece. A area de tarefas cresce conforme houver 1, 2 ou 3 tarefas abertas; acima disso, deve manter uma altura maxima fixa comum e usar rolagem interna.
Cada frente deve ter uma seta discreta no canto superior direito, alinhada ao nome da frente, usando o mesmo simbolo visual dos cards de projeto. Clicar nessa seta, ou em qualquer area do card da frente que nao seja o bloco de projetos/controles internos, deve abrir a pagina de aprofundamento da frente em `/projetos/frentes/$frontId`.
A pagina de aprofundamento da frente deve permitir adicionar novas tasks diretamente naquela frente usando o `fatherId` da propria frente, marcar tasks como concluidas, exibir descricao da frente e reservar espaco para outras informacoes importantes que serao definidas depois. Por ser uma pagina detalhada, deve permitir criar tasks com mais granularidade que a Home/card rapido: titulo, flag `quick`, data de aparicao (`visibleFrom`) e recorrencia.
Em projetos/frentes, contadores de tarefas devem priorizar tarefas abertas, nao "feitas de total". Como projetos podem durar meses e acumular mais de 100 tasks, o numero acionavel para Yuri e o estoque pendente atual.
Encerrar, reabrir ou gerenciar estado de frentes nao deve acontecer diretamente na pagina Projetos, para evitar encerramentos acidentais em uma tela de leitura. Essa acao deve ficar para uma futura tela de gerenciamento. A pagina Projetos deve exibir apenas a leitura operacional das frentes ativas, sem pilula "Frente ativa" e sem botao de filtro.
Na tela Hoje, nao deve existir um atalho global solto para criar task. A criacao operacional acontece dentro do card da atividade em foco, porque ali o contexto ja esta definido. Ao adicionar um item no card de uma atividade/projeto, ele pertence naturalmente aquele contexto. Tarefas de projetos que nao foram trabalhados hoje devem ser adicionadas pela tela do proprio projeto, em "PROXIMAS ACOES".

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
- O header da tela Hoje deve aparecer em um box verde do design system, com a coluna direita na ordem hora, data por extenso com virgula e dia da semana. A saudacao e a data/hora ficam na linha superior. O rotulo "Sua meta de hoje:" deve ficar separado da meta em si, com respiro compacto abaixo da data/hora para nao parecer deslocado para baixo. A meta deve ocupar a largura total do header como elemento clicavel em formato de box/pilula sem borda, semelhante a tasks e habitos, com destaque verde/brilho sutil sem artefatos de linha, check de concluir/desconcluir e persistencia local. O circulo do check da meta deve usar um preenchimento translucido/brilhado no mesmo espirito dos marcadores de dia do Foco da Semana, evitando borda dura quando estiver pendente.
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
- navegar entre atividade anterior, tempo livre e proxima atividade pelo card principal;
- quais habitos estao sendo construidos;
- qual e a rotina completa do dia.

Quando nao houver atividade planejada, o app deve respeitar o tempo livre. Ele nao deve tentar otimizar cada minuto do usuario.

No card principal de atividade atual, existe uma separacao conceitual entre contexto/bloco maior e atividade:

- O contexto/bloco maior aparece como categoria, por exemplo Michelin, Miray, Saude, Alimentacao ou Estudos.
- O titulo deve representar a atividade concreta dentro daquele contexto.
- A barra de progresso representa a atividade atual, nao necessariamente o bloco maior.
- O card nao deve exibir, por enquanto, o horario final do contexto/bloco maior; essa informacao ficou excessiva visualmente.
- A atividade atual pode ter `activityChecklist`, uma lista de itens concretos a executar naquela atividade.
- A barra de progresso de tempo da atividade deve aparecer acima do checklist, deixando claro primeiro o intervalo/tempo restante e depois a lista operacional do que executar.
- O card principal da tela Hoje deve permitir navegacao por gesto horizontal no mobile, com efeito de carrossel real: os cartoes anterior, atual e proximo devem existir lado a lado em um unico trilho horizontal, e o trilho inteiro deve deslizar. Durante o arraste, o card atual acompanha o dedo e o card anterior/proximo aparece vindo da lateral como parte do mesmo trilho, nao como uma sobreposicao independente. Arrastar para a direita mostra a atividade anterior do dia; arrastar da direita para a esquerda mostra a proxima atividade. O checklist, itens adicionados e estado de conclusao devem sempre se aplicar a atividade que estiver em foco no card.
- Durante o gesto de slideshow, o card deve seguir diretamente a velocidade do dedo/mouse. Ao soltar, a animacao de assentamento deve ser lenta, suave e fluida, completando a troca ou retornando ao centro sem salto brusco; a duracao de referencia atual e 1200ms com easing macio `cubic-bezier(0.16,1,0.3,1)`.
- Ao finalizar um gesto valido de slideshow, a transicao deve trocar para o card real no mesmo ponto visual onde o preview estava e animar esse card ate o centro. Evitar trocar o preview simplificado pelo card real apenas no fim da animacao, pois isso gera piscada/salto visual.
- Periodos sem atividade tambem devem aparecer como cartao de tempo livre dentro do mesmo slideshow, permitindo navegar para a atividade anterior e para a proxima. O tempo livre deve usar exatamente a mesma estrutura visual dos outros cartoes, incluindo categoria, titulo, horario, barra de progresso, checklist fixo e formulario de adicao. O texto do cartao livre deve ser categoria "TEMPO LIVRE" e titulo "Aproveite seu tempo"; nesse cartao, o bloco de checklist deve se chamar "NOTAS DE ALÍVIO". A barra de progresso deve medir o intervalo livre atual ate a proxima atividade do dia; se nao houver proxima atividade, deve ir ate 21:30, horario de dormir. Ao sair do tempo livre para uma atividade vizinha, o gesto inverso deve voltar para o cartao de tempo livre antes de seguir para outros blocos.
- O tempo livre deve entrar no carrossel pela ordem temporal do dia. Tempos livres intermediarios nao precisam aparecer quando nao estiverem ativos. O tempo livre final do dia, porem, deve aparecer sempre como ultimo cartao antes de dormir, terminando em 21:30, mesmo quando uma atividade ainda estiver em andamento. A unica excecao e quando alguma atividade/compromisso ja termina em 21:30 ou depois; nesse caso nao ha cartao livre final. Se houver compromisso das 21:30 em diante, o tempo livre pode aparecer antes dele, sem ser o ultimo absoluto do carrossel. O id do cartao de tempo livre deve ser estavel dentro da janela livre para que notas adicionadas nao mudem de lugar conforme o minuto atual avanca.
- A tela Hoje deve ter um botao flutuante verde, quadrado com bordas arredondadas, fixo no canto inferior direito acima da navegacao. Ao clicar, ele abre um pequeno compositor para adicionar uma nova nota de alivio no cartao de tempo livre. Essa nota deve persistir localmente como item extra das "NOTAS DE ALÍVIO".
- No slideshow, cada atividade deve se comportar como um cartao completo: fundo, borda, raio e conteudo se movem juntos. O container externo funciona apenas como palco/clipe visual, sem parecer uma moldura fixa por onde o conteudo passa. O trilho deve renderizar os cartoes reais anterior, atual e proximo, com a mesma estrutura visual e dados operacionais, para evitar a troca brusca entre uma previa generica e o card completo ao final do gesto. Depois que o swipe termina, a troca de indice e o reset do `translateX` do trilho devem acontecer sem transicao visivel, em um reset invisivel, para nao parecer que o mesmo cartao recarregou ou deslizou de novo.
- O card principal passa a ter tres tipos conceituais no MVP: tempo livre, atividade e rotina. Atividade se mantem como o card operacional completo com checklist, prioridade e adicao manual de itens. Rotina representa compromissos recorrentes como academia/corrida e alimentacao; ela nao deve ter checklist editavel nem formulario de adicionar itens. Em vez disso, mostra uma lista fixa do que compoe aquela rotina e uma avaliacao local do dia. A escala deve ser `X 1 2 3 4 5`, onde `X` equivale a 0/sem treino ou sem execucao, com o rotulo pequeno "AVALIAÇÃO" abaixo. Para Saude, o box operacional deve se chamar "TREINO"; para Alimentacao, "REFEIÇÃO".
- Cards de Estudos devem funcionar como acompanhamento de material estudado: o checklist representa capitulos, aulas ou modulos, e o usuario marca o que concluiu. Nesses cards, nao deve existir formulario de adicionar novo item ao checklist; no lugar, deve existir um campo para comentar o que aprendeu naquela sessao e um botao de microfone para gravar audio. As entradas de aprendizado devem persistir localmente vinculadas ao id da atividade, aceitando texto e audio em data URL enquanto o Supabase Storage ainda nao estiver implementado.
- Deve existir uma pequena distancia visual entre os cartoes do slideshow para evitar bordas grudadas durante o arraste.
- O card principal deve ter altura fixa suficiente para comportar cabecalho, pill de prazo quando existir, horario, progresso, box operacional e indicador de bolinhas sem cortar conteudo. As bolinhas devem ficar sempre cravadas na parte inferior do card, na mesma altura entre todos os cartoes.
- O botao/box "VER DETALHES" foi removido dos cartoes de atividade. A unica informacao de detalhe que deve aparecer no card, quando existir, e a pill de prazo/entrega do projeto, posicionada entre o titulo da atividade/projeto e a parte de horario. Quando a pill existir, ela deve ter respiro proprio e pode empurrar os blocos abaixo levemente; o unico bloco que se adapta diminuindo/crescendo e o checklist/box operacional, que deve preencher todo o espaco vertical disponivel antes das bolinhas.
- Controles internos como botoes e inputs nao devem iniciar o gesto de slideshow, para preservar cliques como adicionar item, marcar checklist e avaliar rotina.
- Os cards do slideshow da tela Hoje devem ter altura fixa e consistente entre atividade atual, anterior e proxima. O checklist tambem deve manter altura fixa mesmo quando nao houver itens, para evitar saltos visuais durante a navegacao.
- Textos estruturais do card, como categoria, titulo da atividade, horarios e status, devem permanecer em uma unica linha. Quando houver risco de quebra, a fonte do titulo deve diminuir ate caber. A excecao sao os textos das tasks do checklist, que podem quebrar linha dentro da area fixa do checklist.
- Quando o usuario tentar navegar por gesto para antes da primeira atividade ou depois da ultima atividade do dia, o card deve mostrar um feedback animado discreto indicando "Nada antes" ou "Nada depois".
- Quando `activityChecklist` nao existir, `nextAction` pode funcionar como fallback de item unico.
- O checklist deve exibir contador de itens abertos no canto superior direito, alinhado com a palavra CHECKLIST. O texto de cada item deve poder quebrar linha para permitir leitura completa, sem truncamento.
- A area visual do checklist deve ter altura fixa e usar rolagem interna. Itens pendentes aparecem primeiro e itens concluidos aparecem no final. Ao abrir a atividade, a rolagem deve iniciar no primeiro item pendente, permitindo rolar pela lista conforme necessario.
- Deve existir um controle para adicionar itens manualmente ao checklist da atividade atual.
- O card de atividade atual nao deve ter botao separado de concluir; o checklist deve concentrar a execucao da atividade.
- Itens do checklist podem ter flag `priority`. Enquanto estiverem pendentes, itens prioritarios aparecem no topo, preservando a ordem de entrada entre eles, e devem receber destaque por uma bolinha verde discreta no canto superior direito do item, sem contorno e sem pilula textual ocupando espaco. Itens sem prioridade aparecem depois, tambem preservando a ordem de entrada. Depois de concluidos, os itens nao precisam mais manter hierarquia de prioridade. O controle manual de prioridade deve usar icone de bandeira, sem texto.
- A flag `priority` em itens de checklist representa, na pratica, tasks rapidas de menos de 5 minutos. A tela Hoje deve ter um box global "TAREFAS RÁPIDAS" logo abaixo do header e antes do card principal, que aparece quando houver itens `priority` ou tasks `quick` visiveis no dia, independentemente do bloco atual. Ao concluir uma tarefa rapida, ela deve permanecer visivel e riscada se tiver sido executada hoje; so desaparece quando sua conclusao for anterior ao dia atual. A ideia e ajudar Yuri a tirar micro pendencias da frente rapidamente sem perder o registro do que ja resolveu hoje.
- Quando todas as tarefas rapidas visiveis estiverem concluidas, o box de Tarefas Rapidas deve exibir um icone de fechar no canto superior direito. Ao clicar, o box some ate que surja uma nova tarefa rapida pendente; nesse caso ele volta automaticamente.
- Ao concluir itens de checklist, o app deve salvar timestamp de conclusao. Itens finalizados devem continuar visiveis quando tiverem sido concluidos no dia atual; tarefas finalizadas antes de hoje nao precisam aparecer no checklist operacional.
- Em todos os checklists atuais e futuros, itens concluidos que ainda estiverem visiveis devem ir para o final da fila. A ordem operacional e sempre: pendentes primeiro, concluidos depois.
- Os itens marcados e itens adicionados manualmente ao checklist da atividade devem persistir localmente no `localStorage`.
- Por ser mobile first, rolagens internas devem preservar o gesto natural de arrastar/rolar, mas sem exibir barras visuais de rolagem. A utilidade `app-scrollbar` deve esconder a barra mantendo o scroll funcional.
- O box global de Tarefas Rapidas na Home deve ter altura maxima fixa, mostrando aproximadamente tres itens; acima disso, usa rolagem interna.
- A tela Hoje nao deve mais exibir blocos separados de "PROXIMO", o bloco de progresso "HOJE" nem o bloco "ROTINA"; essas informacoes foram absorvidas pelo card principal/slideshow.
- Na parte inferior do card principal deve existir um indicador compacto de posicao em formato de bolinhas pequenas, com respiro consistente em relacao ao box anterior no estado fechado e expandido. A quantidade de bolinhas cinzas representa a quantidade de atividades/compromissos do dia. Verde sempre indica apenas o card selecionado/visivel; portanto so pode haver um indicador verde por vez. Pela posicao do indicador verde, deve ficar claro quantas atividades ja passaram e quantas ainda vem depois.
- O cartao que representa a atividade em andamento no horario atual deve ter mais destaque que cartoes passados/futuros, mas sem virar um bloco verde. Usar um realce sutil: borda primaria um pouco mais grossa, baixa opacidade e sombra/halo discreto, mantendo o fundo escuro do card. Apenas esse card em andamento deve ter a palavra "AGORA" e a pilula de status em verde; em cartoes anteriores/futuros esses artefatos devem ficar em cinza.
- O formato comprido indica o que esta em andamento no horario atual, como se a bolinha tivesse sido esticada para os lados sem perder as bordas arredondadas. Se a atividade em andamento nao for o card selecionado, ela deve ficar comprida em cinza; se tambem for o card selecionado, deve ficar comprida em verde.
- Preenchido indica compromisso/atividade; vazado indica tempo livre. Quando o estado atual em foco for "Tempo livre", ele nao deve aparecer como compromisso cinza. Deve entrar na posicao temporal correta como uma bolinha/pilula extra vazada, usando contorno verde quando selecionado e contorno cinza quando nao selecionado.
- O antigo bloco "RESULTADOS DE HOJE" passa a ser "CONSTRUÇÃO DE HÁBITOS". No MVP ele deve mostrar apenas a lista de habitos esperados para o dia atual, cada item como texto simples em formato de checklist. Cada item tambem deve ter, na lateral direita, um quadrado pequeno com bordas arredondadas e contador central de dias consecutivos aplicando aquele habito. Ao marcar o habito do dia como feito, o contador visual deve aumentar em 1; ao desmarcar, volta ao valor base. O contador superior do bloco deve mostrar quantos habitos ainda estao abertos, nao "feitos de total". Nao deve haver botao para adicionar habito nessa tela; no lugar dele existe um botao "BLOCO DE NOTAS" destacado visualmente, que abre um campo de texto com botao de envio e um botao de microfone para registrar audio. Cada envio deve virar uma entrada separada na tabela/lista de notas daquele dia, com horario, para permitir varios registros ao longo do dia. No MVP, audios do bloco de notas persistem localmente como data URL ate a integracao futura com Supabase Storage.
- A tela Hoje tambem deve trazer, abaixo da construcao de habitos, uma leitura de semana compacta. O bloco "FOCO DA SEMANA" nao deve ser checklist e o container externo deve ser verde como o header do topo, por ser uma area de destaque. Dentro dele, os marcos importantes da semana aparecem em cartoes horizontais/linhas empilhadas. Cada card deve usar o mesmo efeito de brilho/gradiente da pilula da meta do dia, com o dia curto como marcador discreto a esquerda e o marco em texto claro. O texto do marco nao deve truncar; o card cresce verticalmente para caber o conteudo. Ao clicar, a linha expande e mostra o detalhamento; abaixo da descricao deve aparecer um botao para marcar/desmarcar o marco, persistindo localmente. Antes de concluir, o botao deve dizer "CONCLUIR" e ter maior destaque; depois de concluido, deve dizer "CONCLUÍDO", ficar visualmente mais discreto, riscar o texto do marco como nas tasks e fechar automaticamente a pilula expandida ao clicar. Abaixo dele entra "VISÃO DOS DIAS", reaproveitando a leitura de agenda semanal com rolagem funcional sem barra visual.

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
- `dailyHabits`: habitos simples do dia usados no bloco "CONSTRUÇÃO DE HÁBITOS" da tela Hoje. No MVP os mocks incluem "Beber 4L de água", "Alimentação Saudável", "Leitura" e "Treino", alem de `streakDays` para simular o contador base de dias consecutivos antes do check de hoje.
- `dailyJournalEntries`: entradas locais do bloco de notas, organizadas por data, simulando a tabela que futuramente podera vir de uma planilha.
- `doneWeekMilestones`: marcos semanais marcados localmente como executados.
- `finance`: resumo financeiro mensal.
- `financeHistory`: historico financeiro.
- `weekFocus`: foco da semana.
- `weekMilestones`: marcos importantes da semana exibidos na tela Hoje como linhas expansíveis com dia curto, marco, data opcional e detalhamento.
- `weekAreas`: progresso semanal por area.
- `monthView`: progresso mensal, conquistas e pontos de atencao.

No futuro, os mocks poderao ser substituidos por uma API, Google Sheets, Google Calendar ou outra fonte. Isso deve acontecer sem reconstruir todo o frontend.

Dados mockados especificos para desenvolvimento local podem ficar em `src/data/mock/`. Esses mocks existem para facilitar trabalho visual e funcional no Codex quando uma API externa estiver indisponivel localmente. Em producao, a aplicacao deve priorizar dados reais vindos das rotas server-side, APIs e futuramente planilhas; mocks locais nao devem mascarar falhas de integracao no deploy.

Estrutura base de tarefas:

- Toda task, independentemente de ter sido criada no card de uma atividade, em Projetos ou futuramente por planilha/API, deve convergir para o mesmo contrato simples: `id`, `title`, `fatherId`, `quick`, `visibleFrom`, `recurrence` e `dueDate`.
- `id` identifica a task em si e deve permanecer simples/unico, sem carregar a hierarquia inteira.
- `fatherId` representa onde a task mora. Ele concatena os ids da hierarquia em formato de caminho, por exemplo `michelin.michelin-data-driven.dashboard-rqe`, `miray.miray-conteudo.robo-instagram`, `estudos.estudos-produto.curso-produto` ou apenas `pessoal` quando for uma task solta sem projeto.
- `quick` substitui a ideia antiga de prioridade numerica para tarefas globais: quando `true`, significa tarefa rapida de menos de 5 minutos. Visualmente, uma task `quick` nao deve ser representada por texto ou pill `<5min>` dentro das listas. O padrao visual e uma bolinha verde discreta, centralizada verticalmente no lado direito do item, igual ao padrao da Home.
- `visibleFrom` define a partir de quando a tarefa pode aparecer na experiencia operacional.
- `recurrence` guarda a recorrencia quando existir.
- `dueDate` significa exclusivamente data de conclusao/completude. Se estiver vazio, a tarefa ainda esta aberta. Se estiver preenchido, a tarefa foi realizada naquela data. `dueDate` nao deve ser usado como prazo, data de execucao ou data de vencimento.
- Regra geral de visibilidade: uma task concluida so desaparece das telas operacionais quando `dueDate` for diferente de hoje. Se `dueDate` for igual a hoje, ela continua aparecendo na tela, marcada/riscada. Isso vale para todas as telas e comportamentos que listam tasks ou proximas acoes.
- A task base nao deve ter `deadline`. Prazos podem existir no nivel de projeto/marco/entrega, mas nao entram na estrutura simples da task no MVP.
- A estrutura de Estudos deve ser: Area `Estudos`; Frentes `Aula`, `Leitura` e `Inglês`; Projeto como nome do livro, curso ou material; Task como capitulo, aula ou modulo. Blocos do Google Calendar como `Estudos - Video` devem apontar naturalmente para a frente `Aula`; blocos como `Estudos - Leitura` apontam para a frente `Leitura`.
- A tela Hoje deve obter os blocos de tempo pela rota interna `/api/routine/week`, que consulta a agenda Google `ROTINA` no servidor e normaliza eventos para `ScheduleBlock`. Variaveis server-side esperadas: `ROUTINE_CALENDAR_ID` e `GOOGLE_CALENDAR_API_KEY`; enquanto o ID da agenda ROTINA pode ficar fixo/publico por nao ser segredo, a API key deve ficar apenas no servidor. Agenda, projetos e tasks nao devem ter fallback para mocks: se a fonte real nao carregar, a interface deve ficar vazia nessa parte para evidenciar a falha.

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
- protecao contra mismatch de hidratacao: telas que dependem de data/hora reais devem renderizar uma base neutra ate o store hidratar no cliente, evitando que SSR e navegador mostrem minutos/datas diferentes no primeiro paint;
- modo demonstracao configuravel com dia e horario simulados;
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

Em tarefas e proximas acoes de projeto, a conclusao deve ser derivada da presenca de `dueDate`: vazio significa aberta, preenchido significa concluida na data informada. A lista local `doneTasks` permanece apenas como mecanismo legado/local para alternar visualmente a conclusao dos mocks, mas o contrato de dados deve continuar sendo `dueDate`.

O app esta em transicao dos mocks para Supabase e Google Calendar. Agenda, projetos e tasks ja devem depender exclusivamente das fontes reais; os mocks permanecem apenas para partes ainda nao migradas, como metas, habitos, marcos semanais e visoes analiticas.

## Rotas Atuais

- `/`: Hoje, com contexto atual em slideshow, indicador compacto de posicao do dia e construcao de habitos
- `/hoje`: rota legada da timeline do dia, mantida temporariamente ate decidirmos remover ou redirecionar
- `/semana`: rota/tela antiga de semana, removida da navegacao principal porque o foco semanal foi absorvido pela tela Hoje
- `/projetos`: lista de projetos
- `/projetos/frentes/$frontId`: detalhe/aprofundamento de uma frente, com descricao, tarefas da frente e projetos ligados
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
- Projetos (`/projetos`)
- Financeiro (`/financeiro`)
- Saude (`/habitos`)
- Mais (`/mais`)

A entrada Mais deve funcionar como acesso secundario para Objetivos, Mes e Configuracoes, sem repetir telas que ja estao no menu inferior. Financeiro deve usar icone de carteira no menu principal. Saude deve usar o icone HeartPlus. A tela Semana nao deve aparecer na bottom navigation; Projetos ocupa esse lugar e deve usar um icone simples de pasta.
Hoje deve usar um icone que represente gestao e execucao do dia, nao apenas passagem de hora; a referencia atual e `SquareCheckBig`.

## Componentes Principais

- `CurrentActivityCard`: card central de contexto atual dentro da tela Hoje.
- `TimelineItem`: item da rota legada de rotina em `/hoje`.
- `PriorityItem`: item em formato de checklist reutilizado no bloco de construcao de habitos.
- `ProjectCard`: resumo de projeto.
- `GoalCard`: objetivo maior.
- `HabitTracker`: acompanhamento simples de habitos.
- `FinanceSummary`: resumo financeiro.
- `BottomNavigation`: navegacao principal mobile.
- `PageHeader`: cabecalho padrao das telas.
- `ProgressBar` e `StatusBadge`: elementos visuais reutilizaveis.

## Regras da Tela Hoje

- O botao flutuante verde de adicionar nota deve existir sempre na tela Hoje, independentemente de existir um cartao de tempo livre ativo/visivel naquele momento.
- Os cartoes de atividade da tela Hoje devem usar a granularidade do bloco de tempo para filtrar tasks. Um bloco com apenas Area, como `Michelin`, mostra tasks daquele escopo inteiro; um bloco com Frente, como `Michelin · Operação`, mostra tasks daquela frente; um bloco com Projeto, como `Michelin · Data-Driven · Dashboard RQE`, mostra apenas tasks daquele projeto. A rotina base futura pode vir do Google Calendar somente como blocos de tempo; Supabase continua sendo a fonte de areas, frentes, projetos, tasks, notas e historico. O caminho da task deve aparecer em texto secundario dentro do checklist do cartao para indicar de onde ela veio.
- Esse botao adiciona uma entrada nas Notas de Alivio e deve permitir marcar a flag de tarefa rapida. Quando a flag estiver ativa, a nota tambem entra no box global de Tarefas Rapidas; quando estiver inativa, fica apenas dentro das Notas de Alivio.
- Quando um cartao de tempo livre aparecer, ele deve mostrar as Notas de Alivio globais junto com eventuais notas especificas daquele periodo.
- Tarefas rapidas concluidas hoje continuam visiveis riscadas; tarefas concluidas antes de hoje deixam de aparecer nas listas operacionais.
- Cartoes ligados a Saude/Alimentacao, como musculacao, corrida e refeicoes, nao devem exibir area de Ver Detalhes. Esses cards devem focar na lista operacional/avaliacao daquela rotina.
- Nas paginas de detalhe de projeto, as pilulas de prazo e status ficam fora do box de objetivo, na mesma linha: prazo a esquerda e status a direita, com tamanho suficiente para leitura mobile. Nas paginas de detalhe de frente, o status tambem fica fora do box de descricao.
- A conexao com Supabase para Projetos nao deve usar fallback para mocks. A camada `src/lib/supabaseProjects.ts` le `areas`, `fronts`, `projects` e `tasks` via REST usando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; se nao houver dados ou se a chamada falhar, a tela deve refletir a ausencia de dados reais.
- As telas de gerenciamento de projetos ja possuem entradas para evoluir cadastros via app: um botao `+` discreto no card superior da pagina Projetos para adicionar Frente, lapis para editar objetivo da Frente, `+ Adicionar Projeto` dentro da Frente, e lapis no Projeto para editar objetivo e deadline.
- Na pagina Projetos, cada card de Frente deve manter a leitura limpa: as acoes de criar `tarefa` e `projeto` ficam em um unico botao `+` no header da frente, ao lado da seta de aprofundamento. O box de `TAREFAS` aparece apenas quando houver tarefas visiveis para listar.
- Controles internos dos cards de Frente, como `+`, dropdowns, inputs e dialogs, nao devem disparar a navegacao do card. Ao sair de paginas de detalhe de Frente ou Projeto pelo botao voltar do header, o destino deve ser a pagina principal de Projetos com a area correta selecionada e a Frente correspondente em foco.
- As acoes principais de gerenciamento escrevem no Supabase quando o registro possui ID numerico vindo do banco: criar frente, editar objetivo/status da frente, criar projeto, editar objetivo/deadline/status do projeto, criar tarefa de frente/projeto e concluir/reabrir tarefa. Registros legados/mock nao devem gerar novos fallbacks locais silenciosos.
- O app agora possui login simples com Supabase Auth em `src/lib/supabaseAuth.tsx`. A sessao fica salva no navegador, e as chamadas REST do modulo de projetos passam a enviar o `access_token` do usuario logado no header `Authorization`, permitindo usar policies RLS com `user_id = auth.uid()`.
- Com Supabase configurado, a tela Projetos deve aguardar a sessao autenticada para buscar dados remotos e nao deve criar fallback visual de `Notas de alivio` dentro da propria pagina. Isso evita mascarar falhas de RLS/token como se apenas a area Pessoal existisse.

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
- Alguns estados locais ainda usam nomes legados como `doneTasks`, mesmo que a semantica nova de tarefas seja baseada em `dueDate` como data de conclusao.
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
