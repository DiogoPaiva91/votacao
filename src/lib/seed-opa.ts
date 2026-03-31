import type { SupabaseClient } from '@supabase/supabase-js';

let seedInProgress = false;

export async function seedOpaProject(
  sb: SupabaseClient,
  userEmail: string,
  userName: string,
  userAvatar: string | null,
): Promise<boolean> {
  if (seedInProgress) return false;
  seedInProgress = true;
  try {
    return await _doSeed(sb, userEmail, userName, userAvatar);
  } finally {
    seedInProgress = false;
  }
}

interface SeedItem {
  title: string;
  sector: string;
  options: string[];
}

const SEED_ITEMS: SeedItem[] = [
  // ===== 12 ITENS OPA (posições 0-11) =====
  {
    title: 'Formulários OPA em papel',
    sector: 'OPA',
    options: [
      'Colaborador pegava o formulário impresso com o responsável da área, preenchia à mão no campo e entregava ao inspetor. Letra ilegível, campos em branco, rasuras que ninguém entendia.',
      'Formulários ficavam em uma pasta no escritório. O inspetor precisava ir buscar antes de sair a campo. Muitas vezes esquecia ou levava o modelo errado.',
      'Cada área tinha seu próprio modelo de formulário OPA, sem padrão. Uns tinham 10 campos, outros 25. Impossível consolidar dados.',
    ],
  },
  {
    title: 'Inspetor demorava para entregar o papel',
    sector: 'OPA',
    options: [
      'O inspetor acumulava formulários da semana inteira no bolso e entregava tudo na sexta-feira. Observações de segunda já estavam defasadas.',
      'Inspetor fazia a ronda de manhã, mas só passava no escritório no fim do turno. Se o turno era noturno, o papel ficava até o dia seguinte.',
      'O inspetor entregava o papel para o líder do turno, que esquecia de repassar. O formulário ficava dias em cima da mesa.',
    ],
  },
  {
    title: 'Papéis perdidos entre campo e escritório',
    sector: 'OPA',
    options: [
      'Formulários preenchidos no campo sumiam no caminho até o escritório. Vento, chuva, troca de turno — ninguém sabia onde estavam.',
      'Papéis eram guardados em uma gaveta "para lançar depois". A gaveta entupia e formulários antigos eram descartados sem lançamento.',
      'O papel passava por 3 pessoas antes de chegar ao responsável pelo lançamento. Em cada mão, risco de perder ou amassar.',
    ],
  },
  {
    title: 'Lançamento manual no Excel no dia seguinte',
    sector: 'OPA',
    options: [
      'O funcionário administrativo recebia os papéis e digitava tudo no Excel no dia seguinte. Erros de transcrição eram frequentes — trocava datas, nomes e tipos de ocorrência.',
      'O lançamento no Excel dependia de uma única pessoa. Quando ela faltava, os formulários acumulavam por dias sem lançamento.',
      'A planilha Excel era compartilhada na rede. Duas pessoas abriam ao mesmo tempo e uma sobrescrevia o trabalho da outra.',
    ],
  },
  {
    title: 'Dashboard feito manualmente',
    sector: 'OPA',
    options: [
      'Eu pegava os dados do Excel e montava o dashboard manualmente com gráficos e tabelas. Levava meio dia para consolidar uma semana de dados.',
      'O dashboard só ficava pronto no final do mês. Quando a gestão via os dados, as situações de risco já tinham semanas de atraso.',
      'Cada vez que alguém pedia um recorte diferente (por área, por tipo, por período), tinha que refazer o dashboard do zero.',
    ],
  },
  {
    title: 'Itens urgentes de alto risco com atraso',
    sector: 'OPA',
    options: [
      'Uma condição insegura grave era observada na segunda, mas só chegava à gestão na quinta depois de todo o ciclo papel→inspetor→escritório→Excel. Risco real de acidente.',
      'Quase acidentes ferroviários eram registrados no mesmo formulário que comportamentos simples. Não tinha como priorizar o urgente no meio de 50 papéis.',
      'O inspetor identificava risco alto, mas não tinha canal rápido para escalar. Ligava por rádio, ninguém registrava, e a informação se perdia.',
    ],
  },
  {
    title: 'Sem registro fotográfico',
    sector: 'OPA',
    options: [
      'As observações de condição insegura eram descritas por texto no papel. "Piso molhado perto da linha 2" — sem foto, sem GPS, sem evidência visual para a gestão.',
      'Quando o inspetor tirava foto com celular pessoal, as imagens ficavam perdidas no WhatsApp. Não tinha como vincular ao registro.',
      'Auditorias pediam evidências fotográficas das OPAs. Não existiam. A resposta era sempre "foi observado mas não temos foto".',
    ],
  },
  {
    title: 'Falta de padronização nos critérios',
    sector: 'OPA',
    options: [
      'Um inspetor classificava como "comportamento inseguro", outro classificava a mesma situação como "condição insegura". Não tinha critério unificado.',
      'A gravidade (alto, médio, baixo) era subjetiva. O mesmo cenário recebia gravidades diferentes dependendo de quem observava.',
      'Cada terminal (CCP, PCZ) tinha sua forma de registrar. Dados não eram comparáveis entre unidades.',
    ],
  },
  {
    title: 'Retrabalho e erros de transcrição',
    sector: 'OPA',
    options: [
      'O papel era preenchido no campo, depois digitado no Excel, depois copiado para um relatório Word. O mesmo dado era transcrito 3 vezes, com erro em cada etapa.',
      'Nomes de colaboradores eram escritos à mão com grafia errada. No Excel apareciam "João Silva", "Joao S.", "J. Silva" — impossível filtrar.',
      'Datas eram escritas de formas diferentes (01/03, 1-mar, 01.03.26). A planilha não conseguia ordenar cronologicamente.',
    ],
  },
  {
    title: 'Plano de ação sem acompanhamento',
    sector: 'OPA',
    options: [
      'Depois que a OPA era registrada, gerava-se um plano de ação em papel. Ninguém acompanhava se a ação foi executada. Ficava na gaveta.',
      'O plano de ação ia por e-mail para o responsável da área. Sem cobrança automática, sem prazo visível, sem escalação se atrasasse.',
      'A mesma condição insegura era observada mês após mês porque o plano de ação anterior nunca foi executado. Sem histórico, parecia sempre "nova".',
    ],
  },
  {
    title: 'Comunicação lenta entre áreas',
    sector: 'OPA',
    options: [
      'O QSSMA identificava risco na área operacional, mas a informação levava dias para chegar ao gerente da operação. Via papel, via e-mail, via reunião.',
      'Achados de segurança no turno da noite só eram comunicados na reunião da manhã seguinte. Horas de exposição ao risco sem ação.',
      'Cada área só via as próprias OPAs. Não existia visão consolidada. Um risco sistêmico que afetava 3 áreas ninguém percebia.',
    ],
  },
  {
    title: 'Histórico de observações inacessível',
    sector: 'OPA',
    options: [
      'Precisava consultar uma OPA de 6 meses atrás? Tinha que abrir gavetas de arquivo morto, procurar pasta por pasta. Às vezes nem encontrava.',
      'A planilha Excel do ano anterior foi corrompida. Perdemos todo o histórico de observações de 2024 sem backup.',
      'Para responder auditoria externa sobre tendências de segurança, levava 2 semanas para compilar dados de diferentes planilhas e pastas.',
    ],
  },

  // ===== 12 ITENS DE OUTROS SETORES (posições 12-23) =====
  {
    title: 'Treinamento era só presencial',
    sector: 'Portal Treinamentos / EAD',
    options: [
      'Todo treinamento era presencial com instrutor. Para treinar 200 colaboradores em 3 turnos, levava semanas de logística e parada operacional.',
      'Maquinistas de turno noturno tinham que vir de dia para o treinamento. Deslocamento, hora extra, cansaço — e ainda precisavam operar à noite.',
      'Reciclagens e provas mensais eram em papel. Corrigir 150 provas manualmente levava dias. Resultados chegavam semanas depois.',
    ],
  },
  {
    title: 'Controle de documentos em Word e pasta de rede',
    sector: 'Gestão de Documentos',
    options: [
      'Procedimentos operacionais ficavam em pastas na rede. Ninguém sabia qual era a versão vigente. Colaboradores seguiam procedimento desatualizado.',
      'A aprovação de um documento era por e-mail. O gestor respondia "aprovado", mas o e-mail se perdia. Sem trilha de auditoria.',
      'Documentos eram impressos e distribuídos. Quando havia revisão, as cópias antigas continuavam circulando. Instrução errada em campo.',
    ],
  },
  {
    title: 'Inspeções QSSMA em papel',
    sector: 'Inspeção QSSMA',
    options: [
      'Inspeções de frente de trabalho usavam checklist impresso. O inspetor marcava "conforme/não conforme" com caneta e entregava no fim do dia.',
      'O IDS (Índice de Desenvolvimento de Segurança) era calculado manualmente a partir de formulários. Uma inspeção levava 3 dias até virar indicador.',
      'Inspeções ambientais de contratadas eram em papel. A contratada entregava o formulário preenchido — sem como verificar se realmente inspecionou.',
    ],
  },
  {
    title: 'Relatórios de turno manuscritos',
    sector: 'CCP - Controle Operacional',
    options: [
      'O líder de turno anotava chegadas e partidas de trens em uma lousa física. Quando limpava a lousa, os dados do turno anterior sumiam.',
      'Previsão vs. chegada real era registrada em caderno. Para saber o desempenho da semana, alguém tinha que folhear 7 páginas e somar manualmente.',
      'Restrições e anomalias ferroviárias eram comunicadas por rádio e anotadas em papel. Sem registro digital, sem timestamp preciso.',
    ],
  },
  {
    title: 'Controle de EPIs em caderno',
    sector: 'Segurança do Trabalho',
    options: [
      'A entrega de EPIs era registrada em um caderno com assinatura. Para saber se um colaborador estava com EPI vencido, tinha que folhear centenas de páginas.',
      'Não havia alerta de vencimento. O capacete vencia e ninguém sabia até a próxima inspeção encontrar o problema.',
      'A requisição de EPI novo era por formulário de papel. Passava por 3 aprovações antes de chegar ao almoxarifado. Colaborador ficava dias sem equipamento.',
    ],
  },
  {
    title: 'Manutenção sem ordem de serviço digital',
    sector: 'Engenharia / Manutenção',
    options: [
      'Ordens de serviço de manutenção de locomotivas eram em papel. O mecânico preenchia, entregava ao supervisor, que entregava ao planejador. Ciclo de dias.',
      'Histórico de manutenção de uma locomotiva ficava em pastas físicas. Para saber quantas vezes a 9618 foi parada, pesquisa manual de horas.',
      'Peças de reposição eram solicitadas por rádio ou bilhete. Sem rastreio, a peça sumia no caminho ou era entregue para a locomotiva errada.',
    ],
  },
  {
    title: 'Escalas em planilha compartilhada',
    sector: 'RH / Escala',
    options: [
      'Escalas dos 3 turnos eram montadas em Excel compartilhado. Dois gestores editavam ao mesmo tempo e sobreposições de turno passavam despercebidas.',
      'Trocas de turno eram combinadas informalmente entre colaboradores. O gestor só descobria a mudança quando o turno começava com pessoa diferente.',
      'Não havia visão consolidada de cobertura. Um turno ficava com 2 pessoas e outro com 8, sem que ninguém percebesse a tempo.',
    ],
  },
  {
    title: 'SOS Patrimonial por telefone',
    sector: 'SOS Patrimonial',
    options: [
      'Solicitações de segurança patrimonial eram por ligação ou rádio. Sem registro formal, sem protocolo, sem rastreio de atendimento.',
      'O vigilante anotava ocorrências em um caderno de portaria. Quando o caderno acabava, trocavam por outro e o antigo ia para o arquivo morto.',
      'Escoltas de trem eram coordenadas por rádio. Se a comunicação falhava, o trem passava sem escolta pela área de risco.',
    ],
  },
  {
    title: 'Auditorias com checklists impressos',
    sector: 'Painel Terminais',
    options: [
      'Auditorias de terminal usavam checklist impresso de 5 páginas. Depois da auditoria, alguém digitava tudo. Resultados levavam semanas.',
      'Anomalias encontradas na auditoria geravam plano de ação em papel. Sem sistema, a mesma anomalia aparecia na auditoria seguinte sem correção.',
      'Calendário de auditorias era em planilha. Sem lembrete automático, auditorias atrasavam e só percebiam quando o auditor externo cobrava.',
    ],
  },
  {
    title: 'Gestão de terceiros por e-mail',
    sector: 'Suprimentos / Contratos',
    options: [
      'Controle de contratos e obrigações de terceiros era por e-mail e planilha. Prazos venciam sem ninguém perceber. Multas contratuais evitáveis.',
      'Documentação de contratadas (NR, ASO, EPIs) era cobrada por e-mail. Sem checklist automático, contratada entrava no site com documentação vencida.',
      'Notas fiscais de fornecedores eram aprovadas por e-mail em cadeia. Uma aprovação esquecida travava o pagamento por semanas.',
    ],
  },
  {
    title: 'Indicadores operacionais manuais',
    sector: 'CCP / MRS',
    options: [
      'Indicadores de giro de locomotiva eram calculados manualmente no Excel. O analista passava 2 dias por mês consolidando dados de cadernos e rádio.',
      'Tempo de descarga, formação de vazios e partida eram registrados em pontos diferentes. Consolidar o ciclo completo era um quebra-cabeça.',
      'Vagões recusados por avaria eram anotados em papel. O motivo da recusa variava conforme quem anotava — sem padronização, sem estatística confiável.',
    ],
  },
  {
    title: 'Abastecimento registrado em caderno',
    sector: 'Abastecimento',
    options: [
      'Litros de diesel abastecidos na locomotiva eram registrados em caderno pelo operador. Nota fiscal era guardada em pasta separada. Cruzar os dois era um pesadelo.',
      'Não havia controle em tempo real de consumo. Só no fechamento mensal descobriam divergência entre litros comprados e litros registrados.',
      'Areia e lubrificantes eram controlados informalmente. O almoxarifado não sabia quanto tinha em estoque até fazer contagem física.',
    ],
  },
];

async function _doSeed(
  sb: SupabaseClient,
  userEmail: string,
  userName: string,
  userAvatar: string | null,
): Promise<boolean> {
  // Check if already exists
  const { data: existing } = await sb
    .from('projects')
    .select('id')
    .eq('name', 'Caos Fase 1')
    .limit(1);

  if (existing && existing.length > 0) return false;

  // 1. Create project
  const { data: project, error: projErr } = await sb
    .from('projects')
    .insert({
      name: 'Caos Fase 1',
      description:
        'Votação de como era na era analógica. Vote no exemplo mais representativo do caos antes da transformação digital.',
      status: 'draft',
      max_voters: 3,
      created_by_email: userEmail,
      created_by_name: userName,
      created_by_avatar: userAvatar,
    })
    .select()
    .single();

  if (projErr || !project) {
    console.error('Failed to seed Caos Fase 1 project:', projErr);
    return false;
  }

  // 2. Add owner as member
  await sb.from('project_members').insert({
    project_id: project.id,
    user_email: userEmail,
    user_name: userName,
    user_avatar: userAvatar,
    role: 'owner',
  });

  // 3. Insert 24 voting items + 72 options
  for (let i = 0; i < SEED_ITEMS.length; i++) {
    const item = SEED_ITEMS[i];

    const { data: votingItem, error: itemErr } = await sb
      .from('voting_items')
      .insert({
        project_id: project.id,
        title: item.title,
        description: `${item.sector} — Escolha o exemplo mais representativo do caos analógico`,
        type: 'single_choice',
        position: i,
        max_winners: 1,
      })
      .select()
      .single();

    if (itemErr || !votingItem) {
      console.error(`Failed to create voting item ${item.title}:`, itemErr);
      continue;
    }

    const optionsToInsert = item.options.map((desc, j) => ({
      item_id: votingItem.id,
      project_id: project.id,
      label: `Opção ${String.fromCharCode(65 + j)}`,
      description: desc,
      position: j,
    }));

    const { error: optErr } = await sb.from('voting_options').insert(optionsToInsert);
    if (optErr) {
      console.error(`Failed to create options for ${item.title}:`, optErr);
    }
  }

  return true;
}
