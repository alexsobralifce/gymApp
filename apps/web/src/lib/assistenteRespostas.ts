/**
 * Base de conhecimento do Assistente de Ajuda (UX-014).
 *
 * Assistente 100% baseado em regras: normaliza a pergunta (minúsculas, sem
 * acentos) e pontua cada entrada pela quantidade de chaves contidas no texto.
 * Não há chamadas externas, APIs de LLM ou dependências novas — zero custo e
 * zero envio de dados para fora do aparelho.
 *
 * Limite de atuação: o assistente orienta sobre COMO USAR o app. Ele NÃO dá
 * orientação de treino nem conselhos de saúde — isso fica com o professor.
 */

export interface AssistenteAcao {
  label: string
  rota: string
}

export interface AssistenteResposta {
  id: string
  chaves: string[]
  resposta: string
  acao?: AssistenteAcao
}

export const FALLBACK_ASSISTENTE: AssistenteResposta = {
  id: 'fallback',
  chaves: [],
  resposta:
    'Não encontrei essa resposta. Sou um assistente automático de navegação do app — não dou orientação de treino nem conselhos de saúde. Para dúvidas sobre como usar o app, consulte a Documentação. Para orientação de treino, fale com seu professor.',
  acao: { label: 'Abrir Documentação', rota: '/documentacao' },
}

export const assistenteRespostas: AssistenteResposta[] = [
  {
    id: 'registrar-serie',
    chaves: [
      'registrar serie',
      'registro serie',
      'como registro',
      'anotar serie',
      'marcar serie',
      'registrar carga',
      'registrar execucao',
    ],
    resposta:
      'Durante a execução de um treino, cada exercício tem um campo para registrar a carga e as repetições de cada série — o app já sugere a última carga usada. O botão "✓ Concluir Exercício" registra todas as séries pendentes de uma vez. Se estiver sem internet, as séries ficam salvas no aparelho e sincronizam sozinhas quando a conexão voltar.',
    acao: { label: 'Ver meus treinos', rota: '/meus-treinos' },
  },
  {
    id: 'trocar-exercicio',
    chaves: [
      'trocar exercicio',
      'troca exercicio',
      'troco exercicio',
      'substituir exercicio',
      'trocar',
      'troco',
      'substituir',
    ],
    resposta:
      'Durante a execução, toque no botão "Trocar" do exercício: o app abre uma lista de alternativas do mesmo grupo muscular. As séries que você já registrou são preservadas. A troca fica disponível enquanto o treino estiver aceito, em aberto ou em execução.',
  },
  {
    id: 'meta-semanal',
    chaves: [
      'meta semanal',
      'meta de treino',
      'editar meta',
      'mudar meta',
      'meta da semana',
      'meta',
    ],
    resposta:
      'Sua meta semanal é a frequência de treinos que você quer manter por semana (de 1 a 7). Para editar, abra "Meu Perfil" e ajuste o campo de meta. O painel de evolução usa essa meta para comparar o seu desempenho.',
    acao: { label: 'Editar no Meu Perfil', rota: '/dados' },
  },
  {
    id: 'evolucao',
    chaves: ['evolucao', 'progresso', 'recorde', 'evolucao mensal', 'desempenho', 'meu progresso'],
    resposta:
      'Na tela "Evolução" você vê frequência de treinos, volume total, duração e maior carga do mês, com gráficos de peso e IMC. Para ver o histórico de um exercício específico, toque no nome dele na prévia do exercício (o modal com GIF e passo a passo) — ali aparece o histórico de cargas daquele movimento.',
    acao: { label: 'Ver minha evolução', rota: '/evolucao' },
  },
  {
    id: 'medidas',
    chaves: ['medidas', 'peso', 'imc', 'dobras', 'percentual de gordura', 'massa magra', 'massa'],
    resposta:
      'Suas medidas corporais — peso, altura, IMC, dobras e massa magra — ficam na tela "Medidas". Você pode adicionar uma nova medida a qualquer momento e acompanhar a evolução ao longo do tempo. O app organiza os seus dados, mas a interpretação deve ser feita com um profissional.',
    acao: { label: 'Abrir Medidas', rota: '/medidas' },
  },
  {
    id: 'offline',
    chaves: ['offline', 'modo offline', 'sem internet', 'sem conexao', 'sem sinal'],
    resposta:
      'O app funciona offline: séries registradas sem internet ficam em uma fila local no aparelho e são sincronizadas automaticamente quando a conexão voltar. Durante a execução você vê o status de sincronização. Se alguma série não puder ser enviada, ela fica registrada para revisão.',
  },
  {
    id: 'rpe',
    chaves: ['rpe', 'esforco', 'percepcao de esforco', 'escala de esforco', 'intensidade', 'muito intenso'],
    resposta:
      'A percepção de esforço é uma escala que indica o quanto o exercício foi difícil para você: Fácil, Moderado, Intenso ou Muito Intenso. Isso ajuda a acompanhar como cada sessão foi percebida ao longo das semanas — não é uma recomendação de treino. Para orientação de cargas e intensidade, converse com seu professor.',
  },
  {
    id: 'notificacoes',
    chaves: [
      'notificacao',
      'silenciar',
      'horario silencioso',
      'silencioso',
      'lembrete',
      'push',
      'alerta',
      'desativar notificacao',
      'parar de receber aviso',
    ],
    resposta:
      'Você controla tudo na tela "Preferências de Notificação": pode ativar ou desativar lembretes por tipo (treino, social, motivacional, conquistas) e definir um horário silencioso — nesse período nenhum aviso é enviado. As mudanças valem para os avisos do app.',
    acao: { label: 'Abrir preferências', rota: '/notificacoes/preferencias' },
  },
  {
    id: 'tema',
    chaves: [
      'tema',
      'modo escuro',
      'modo claro',
      'modo noturno',
      'cor do app',
      'mudar a cor',
      'troco o tema',
      'trocar o tema',
      'mudar o tema',
      'azul',
      'verde',
      'vermelho',
      'violeta',
      'roxo',
      'lima',
    ],
    resposta:
      'O tema e o modo (claro/escuro) ficam no menu do seu perfil, no canto superior direito: toque no avatar e escolha entre as cores (azul, lima, vermelho ou violeta) e o modo Auto, Dia ou Noite. A escolha fica salva neste aparelho.',
  },
  {
    id: 'retomada',
    chaves: [
      'retomada',
      'ferias',
      'voltei de ferias',
      'semana leve',
      'voltar a treinar',
      'voltei',
      'retorno',
      'tempo parado',
    ],
    resposta:
      'Se você ficou 14 dias ou mais sem treinar, o app oferece um retorno gradual: retomar o plano normal, gerar uma semana leve (com séries reduzidas) ou atualizar seu objetivo. Nada de culpa — a ideia é recomeçar no seu ritmo. Esse fluxo aparece no dashboard após uma ausência longa.',
  },
  {
    id: 'privacidade',
    chaves: ['privacidade', 'lgpd', 'meus dados', 'dados pessoais', 'exportar dados', 'excluir conta'],
    resposta:
      'Na tela "Privacidade" você controla quem vê seus posts, se pode ser encontrado por e-mail e se participa do feed social. A exportação dos seus dados fica na tela "Meus Dados" (Meu Perfil). Seus dados são seus.',
    acao: { label: 'Abrir Privacidade', rota: '/privacidade' },
  },
  {
    id: 'wearables',
    chaves: ['wearables', 'wearable', 'apple health', 'google fit', 'smartwatch', 'relogio', 'garmin', 'pulseira'],
    resposta:
      'A integração com Apple Health, Google Fit e outros dispositivos fica na tela "Wearables". Lá você conecta seu relógio ou app de saúde para acompanhar dados de atividade. A conexão é opcional e totalmente controlada por você.',
    acao: { label: 'Abrir Wearables', rota: '/wearables' },
  },
  FALLBACK_ASSISTENTE,
]

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Responde uma pergunta livre comparando as chaves normalizadas de cada
 * entrada com o texto normalizado. Pontua por quantidade de chaves contidas e
 * desempata pela soma dos tamanhos das chaves (mais específico vence). Sem
 * nenhuma correspondência, retorna a entrada fallback.
 */
export function responder(pergunta: string): AssistenteResposta {
  const texto = normalizar(pergunta)
  if (!texto) return FALLBACK_ASSISTENTE

  let melhor: AssistenteResposta | null = null
  let melhorScore = 0
  let melhorPeso = 0

  for (const entrada of assistenteRespostas) {
    if (entrada.chaves.length === 0) continue
    let score = 0
    let peso = 0
    for (const chave of entrada.chaves) {
      if (texto.includes(chave)) {
        score += 1
        peso += chave.length
      }
    }
    if (score > 0 && (score > melhorScore || (score === melhorScore && peso > melhorPeso))) {
      melhor = entrada
      melhorScore = score
      melhorPeso = peso
    }
  }

  return melhor ?? FALLBACK_ASSISTENTE
}
