import { useState, useMemo } from 'react'
import { useAuthStore } from '../stores/auth'
import { ChevronRightIcon } from '../components/icons/Icon'

interface DocItem {
  titulo: string
  descricao: string
  rota?: string
  passos?: string[]
}

interface DocSection {
  secao: string
  icone: string
  itens: DocItem[]
}

// ─── ALUNO ────────────────────────────────────────────────────────────────────

const CONTEUDO_ALUNO: DocSection[] = [
  {
    secao: 'Seus Dados e Perfil',
    icone: '👤',
    itens: [
      {
        titulo: 'Alterar dados pessoais',
        descricao: 'Nome, telefone e foto de perfil ficam no menu "Meu Perfil". Sua foto aparece no cabeçalho, nos posts e nos clubes. Formatos aceitos: JPG, PNG, GIF, WebP — máximo 5 MB.',
        rota: '/dados',
        passos: ['Abra o menu lateral', 'Toque em "Meu Perfil"', 'Altere nome, telefone ou foto', 'Salve as alterações'],
      },
      {
        titulo: 'Dados físicos e IMC',
        descricao: 'Peso, altura, data de nascimento e sexo também ficam em "Meu Perfil". O IMC é calculado automaticamente com barra visual e classificação OMS. Mantenha esses dados atualizados para gráficos precisos.',
        rota: '/dados',
        passos: ['Vá em "Meu Perfil"', 'Role até "Dados Físicos"', 'Preencha peso (kg) e altura (cm)', 'O IMC atualiza automaticamente'],
      },
      {
        titulo: 'Privacidade (LGPD)',
        descricao: 'Três controles independentes: quem vê seus posts (Amigos/Público/Privado), se pode ser encontrado por e-mail, e consentimento do Feed Social.',
        rota: '/privacidade',
        passos: ['Menu lateral → "Privacidade"', 'Escolha a visibilidade padrão', 'Ative/desative busca por e-mail', 'Salve'],
      },
      {
        titulo: 'Alterar senha',
        descricao: 'Mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.',
        rota: '/alterar-senha',
        passos: ['Toque no seu avatar (canto superior direito)', 'Selecione "Alterar Senha"', 'Digite a senha atual e a nova', 'Confirme'],
      },
    ],
  },
  {
    secao: 'Criar Treino',
    icone: '🏋️',
    itens: [
      {
        titulo: 'Criar manualmente',
        descricao: 'Monte sua ficha escolhendo exercícios da biblioteca com 963 opções. Use filtros por grupo muscular e equipamento. Defina séries, repetições e carga sugerida.',
        rota: '/treino/novo',
        passos: ['Menu → "Meus Treinos"', 'Toque em "Criar Treino"', 'Dê um nome ao treino', 'Adicione exercícios com o botão +', 'Defina séries e repetições', 'Salve o treino'],
      },
      {
        titulo: 'Treino por IA (5 passos)',
        descricao: 'Assistente monta seu treino automaticamente. Você define objetivo, nível, frequência, grupos musculares e restrições. A IA gera o plano ideal e substitui exercícios incompatíveis. Limite: 7 por mês.',
        rota: '/treino/ia',
        passos: ['① Objetivo: hipertrofia, força, emagrecimento ou saúde', '② Nível + quantos dias/semana', '③ Grupos musculares (ou atalhos: Full Body, Push/Pull/Legs)', '④ Restrições: joelho, lombar, ombro, punho, costas', '⑤ Resultado — adote com 1 clique'],
      },
      {
        titulo: 'Biblioteca de Planos',
        descricao: 'Planos prontos modelados por objetivo, nível e sexo. Filtre, escolha e adote com 1 clique — os treinos são criados automaticamente.',
        rota: '/biblioteca-planos',
        passos: ['Menu → "Biblioteca de Planos"', 'Filtre por objetivo, nível e split', 'Toque em um plano para ver os detalhes', 'Toque em "Adotar Plano"'],
      },
      {
        titulo: 'Receber treino do professor',
        descricao: 'Se você tem professor, ele envia fichas pra você. O treino aparece em "Meus Treinos" como "Enviado". Aceite para começar ou recuse.',
        rota: '/meus-treinos',
        passos: ['Acesse "Meus Treinos"', 'Veja treinos com status "Enviado"', 'Toque em "Aceitar" ou "Recusar"'],
      },
    ],
  },
  {
    secao: 'Executar Treino',
    icone: '▶️',
    itens: [
      {
        titulo: 'Iniciar e usar o cronômetro',
        descricao: 'O cronômetro começa automaticamente ao iniciar. Se você sair e voltar, o tempo é preservado — só zera ao finalizar.',
        rota: '/meus-treinos',
        passos: ['"Meus Treinos" → encontre o treino', 'Toque em "Iniciar"', 'O cronômetro começa a contar', 'Veja o tempo no topo da tela'],
      },
      {
        titulo: 'Registrar séries',
        descricao: 'Para cada exercício, preencha carga (kg) e repetições. Os campos vêm pré-preenchidos com sua última carga. Toque no GIF para ver a execução em tela cheia.',
        passos: ['Veja o exercício atual com GIF animado', 'Preencha carga e repetições para cada série', '✓ verde confirma cada série registrada'],
      },
      {
        titulo: 'Concluir exercício em lote',
        descricao: 'Se você faz todas as séries iguais, use o botão "✓ Concluir Exercício". Ele registra todas as séries pendentes de uma vez.',
        passos: ['Preencha os valores nos campos de série', 'Toque em "✓ Concluir Exercício" no topo do card', 'Todas as séries são registradas juntas'],
      },
      {
        titulo: 'Finalizar e avaliar dificuldade',
        descricao: 'Ao concluir, veja a tela de troféu e avalie: Fácil, Moderado, Intenso ou Muito Intenso. O treino recicla automaticamente para a próxima execução.',
        passos: ['Termine todos os exercícios', 'Toque em "Finalizar Treino"', 'Veja a tela de conclusão com troféu', 'Avalie a dificuldade do treino'],
      },
    ],
  },
  {
    secao: 'Feed Social',
    icone: '📱',
    itens: [
      {
        titulo: 'Como funciona',
        descricao: 'Quando você inicia ou conclui um treino, um post é criado automaticamente (se sua visibilidade não for Privado). Seus amigos veem e podem curtir e comentar.',
        rota: '/feed',
        passos: ['Acesse "Feed Social" no menu', 'Veja posts de treinos da sua rede', 'Toque em ❤️ para curtir', 'Toque em 💬 para comentar (280 chars)'],
      },
      {
        titulo: 'Adicionar foto ao post',
        descricao: 'Após iniciar ou concluir um treino, adicione uma foto. Formatos aceitos: JPG, PNG, GIF, WebP. A foto aparece no feed e no feed do clube.',
        passos: ['No card do seu post recém-criado', 'Toque em "Adicionar foto"', 'Selecione a imagem', 'A foto aparece no feed'],
      },
      {
        titulo: 'Controle de privacidade',
        descricao: 'Visibilidade padrão em "Privacidade": ① Amigos — só seus amigos veem. ② Público — toda a rede vê. ③ Privado — nada é publicado.',
        rota: '/privacidade',
      },
    ],
  },
  {
    secao: 'Amigos e Academia',
    icone: '🤝',
    itens: [
      {
        titulo: 'Adicionar amigos por e-mail',
        descricao: 'Busque amigos pelo e-mail. O sistema nunca revela se o e-mail existe — apenas envia a solicitação se a conta for encontrada.',
        rota: '/amizades',
        passos: ['Menu → "Amigos"', 'Toque em "Adicionar amigo"', 'Digite o e-mail da pessoa', 'Aguarde ela aceitar'],
      },
      {
        titulo: 'Colegas da academia',
        descricao: 'No painel lateral direito (desktop) ou no drawer mobile, veja colegas da mesma academia que você ainda não segue. Toque em "Seguir" para conectar.',
        passos: ['Olhe o painel lateral direito', 'Veja "Colegas da Academia"', 'Toque em "Seguir" nos que quiser conectar'],
      },
    ],
  },
  {
    secao: 'Clubes e Gamificação',
    icone: '🏆',
    itens: [
      {
        titulo: 'Clube da academia (automático)',
        descricao: 'Se você tem academia, entra automaticamente no clube dela. Veja o feed do clube com treinos dos membros, lista de participantes e leaderboard.',
        rota: '/clubes',
        passos: ['Menu → "Clubes"', 'Veja o clube da sua academia', 'Toque para abrir o feed do clube'],
      },
      {
        titulo: 'Clubes temáticos',
        descricao: 'Crie ou entre em clubes independentes com código de convite. Ideal para grupos de treino e desafios entre amigos.',
        rota: '/clubes',
        passos: ['Em "Clubes", role até "Descobrir Clubes"', 'Toque em "Entrar" e insira o código', 'Ou toque em "Criar Clube" para começar um novo'],
      },
      {
        titulo: 'Sistema de XP',
        descricao: 'Cada treino dá XP: 100 base + bônus de volume (kg/100) + bônus de duração (min × 0.5). Streak de 3+ dias seguidos dobra com 1.5×.',
        passos: ['Conclua treinos regularmente', 'Acumule XP no clube', 'Mantenha streaks de dias consecutivos para bônus', 'Veja sua posição no leaderboard'],
      },
    ],
  },
  {
    secao: 'Evolução e Saúde',
    icone: '📈',
    itens: [
      {
        titulo: 'Medidas corporais',
        descricao: 'Registre peso, % gordura e massa magra. IMC automático com classificação OMS. Tabela histórica completa.',
        rota: '/medidas',
        passos: ['Menu → "Medidas"', 'Toque em "Nova Medida"', 'Preencha peso, %BF e massa magra', 'Veja o histórico na tabela'],
      },
      {
        titulo: 'Dashboard de Evolução Mensal',
        descricao: 'Frequência, volume total (kg), duração, maior carga, gráficos de peso e IMC. Cache de 30 dias com botão "Recalcular".',
        rota: '/evolucao',
        passos: ['Menu → "Evolução"', 'Veja frequência vs meta semanal', 'Volume total com variação % vs mês anterior', 'Gráficos Recharts de peso e IMC'],
      },
      {
        titulo: 'Correlações de Pearson',
        descricao: 'Relação estatística entre seu treino e seu corpo: peso × volume, %BF × volume, massa magra × volume. Valores positivos = relação direta.',
        rota: '/evolucao',
      },
      {
        titulo: 'Parceiros',
        descricao: 'Descontos exclusivos em suplementação, vestuário e nutrição.',
        rota: '/parceiros',
      },
    ],
  },
]

// ─── PROFESSOR ────────────────────────────────────────────────────────────────

const CONTEUDO_PROFESSOR: DocSection[] = [
  {
    secao: 'Treinos e Fichas',
    icone: '📋',
    itens: [
      {
        titulo: 'Criar ficha de treino',
        descricao: 'Monte fichas com exercícios da biblioteca (963 opções, GIF animado). Filtre por grupo muscular (10 opções) e equipamento (7 opções). Crie múltiplas fichas em abas — ideal para Treino A, B, C de uma vez.',
        rota: '/treinos/criar',
        passos: ['Menu → "Treino" → "Criar Treino"', 'Dê um nome e selecione os dias da semana', 'Adicione exercícios com os filtros', 'Defina séries, repetições e carga sugerida', 'Salve — o treino vai para sua lista'],
      },
      {
        titulo: 'Enviar para o aluno',
        descricao: 'Na lista de treinos, escolha "Enviar" e selecione o aluno. Ele recebe notificação e pode aceitar ou recusar.',
        rota: '/treinos',
        passos: ['"Treino" → "Listar Treinos"', 'Toque em "Enviar" no treino desejado', 'Selecione o aluno na lista', 'O aluno recebe o treino como "Enviado"'],
      },
      {
        titulo: 'Clonagem (individual e em lote)',
        descricao: 'Clone um treino para 1 aluno ou para múltiplos de uma vez. O clone copia nome, dias e exercícios. Após o clone, os treinos são enviados automaticamente.',
        rota: '/treinos',
        passos: ['Na lista de treinos, toque em "Clonar"', 'Escolha "Individual" e selecione 1 aluno', 'Ou "Em Lote" e marque vários alunos', 'Os treinos são copiados e enviados'],
      },
      {
        titulo: 'Templates e Fichas em lote',
        descricao: 'Marque treinos como template para reutilizar. A tela "Fichas" permite criar e enviar múltiplos treinos simultaneamente.',
        rota: '/fichas',
        passos: ['Toque em "Marcar como Template" no treino', 'Acesse "Fichas" para ver templates', 'Crie fichas para dias diferentes em abas', 'Salve — todas são enviadas juntas'],
      },
    ],
  },
  {
    secao: 'Alunos',
    icone: '👥',
    itens: [
      {
        titulo: 'Vincular aluno',
        descricao: 'Adicione alunos ao seu quadro. Eles devem estar cadastrados na plataforma.',
        rota: '/alunos/vincular',
        passos: ['Menu → "Vincular Aluno"', 'Digite o e-mail do aluno', 'Confirme o vínculo'],
      },
      {
        titulo: 'Acompanhar evolução',
        descricao: 'Cada aluno no dashboard mostra correlações estatísticas, evolução mensal, histórico detalhado de execuções e medidas corporais.',
        passos: ['No Dashboard, toque no card do aluno', 'Veja correlações Pearson', 'Acesse histórico de execuções', 'Confira medidas e evolução mensal'],
      },
    ],
  },
  {
    secao: 'Avaliação Física',
    icone: '🩺',
    itens: [
      {
        titulo: 'Criar avaliação completa',
        descricao: 'PAR-Q+ (7 perguntas), sinais vitais, antropometria, composição corporal (Jackson-Pollock 7 ou 3 dobras, Guedes, Siri), VO₂max (Cooper), 1RM (Brzycki), zonas de FC (Karvonen), postural e flexibilidade.',
        rota: '/avaliacoes',
        passos: ['Menu → "Avaliação Física"', 'Toque em "Nova Avaliação"', 'Preencha PAR-Q+, antropometria e dobras', 'O sistema calcula % gordura, VO₂max e 1RM'],
      },
      {
        titulo: 'Laudo e prescrição',
        descricao: 'Gere laudo em markdown com 7 seções e referências científicas. Prescrição automática de treino baseada nos resultados.',
        rota: '/avaliacoes',
        passos: ['Abra a avaliação concluída', 'Toque em "Gerar Laudo"', 'Veja o laudo com referências', 'Toque em "Prescrição" para gerar treino'],
      },
    ],
  },
  {
    secao: 'Academias e Perfil',
    icone: '🏢',
    itens: [
      {
        titulo: 'Vincular-se a academias',
        descricao: 'Solicite vínculo. Aprovação em 2 etapas: Academia → Root. Acompanhe o status em "Academias".',
        rota: '/academias',
        passos: ['Menu → "Academias"', 'Veja a lista de academias', 'Toque em "Vincular-se"', 'Acompanhe o status: Pendente Academia → Pendente Root → Ativo'],
      },
      {
        titulo: 'Catálogo de exercícios',
        descricao: '963 exercícios com GIF, filtros por grupo e equipamento. Crie exercícios personalizados se necessário.',
        rota: '/exercicios/criar',
      },
    ],
  },
]

// ─── ACADEMIA ─────────────────────────────────────────────────────────────────

const CONTEUDO_ACADEMIA: DocSection[] = [
  {
    secao: 'Gestão de Professores',
    icone: '👨‍🏫',
    itens: [
      {
        titulo: 'Autorizar professores',
        descricao: 'Professores solicitam vínculo → status "Pendente Academia". Você aprova ou rejeita. Depois o Root faz a aprovação final.',
        rota: '/professores',
        passos: ['Menu → "Professores"', 'Veja os pendentes', 'Toque em "Autorizar" ou "Rejeitar"'],
      },
      {
        titulo: 'Limite de professores',
        descricao: 'Cada academia tem um limite (padrão: 20). Se atingir, o Root precisa aumentar o limite.',
        rota: '/professores',
      },
    ],
  },
  {
    secao: 'Gestão de Alunos',
    icone: '👥',
    itens: [
      {
        titulo: 'Listar e atribuir professor',
        descricao: 'Veja todos os alunos da academia. Atribua um professor vinculado a cada aluno.',
        rota: '/alunos',
        passos: ['Menu → "Alunos"', 'Encontre o aluno na lista', 'Toque em "Atribuir Professor"', 'Selecione o professor'],
      },
    ],
  },
  {
    secao: 'Treinos e Clube',
    icone: '🏋️',
    itens: [
      {
        titulo: 'Criar e enviar treinos',
        descricao: 'Mesmas ferramentas do professor: criar fichas, clonar em lote, templates, enviar para alunos.',
        rota: '/treinos/criar',
      },
      {
        titulo: 'Clube automático',
        descricao: 'Sua academia tem um clube 1:1. Alunos entram automaticamente. Use para engajamento e retenção via XP e leaderboard.',
        rota: '/clubes',
      },
    ],
  },
]

// ─── ROOT ─────────────────────────────────────────────────────────────────────

const CONTEUDO_ROOT: DocSection[] = [
  {
    secao: 'Painel Global',
    icone: '📊',
    itens: [
      {
        titulo: 'Métricas da plataforma',
        descricao: 'Total de academias ativas e pendentes, total de professores e alunos. Visão em tempo real para monitorar o ecossistema.',
        rota: '/',
      },
    ],
  },
  {
    secao: 'Academias',
    icone: '🏢',
    itens: [
      {
        titulo: 'Aprovar/rejeitar cadastros',
        descricao: 'Academias pendentes precisam de aprovação. Verifique nome e CNPJ, aprove ou rejeite.',
        rota: '/usuarios',
        passos: ['"Gerenciar Plataforma" → aba "Academias"', 'Encontre a academia pendente', 'Toque em "Aprovar" ou "Rejeitar"'],
      },
      {
        titulo: 'Definir limite de professores',
        descricao: 'Cada academia tem um limite de professores. Aumente ou reduza por academia.',
        rota: '/usuarios',
      },
    ],
  },
  {
    secao: 'Vínculos',
    icone: '🔗',
    itens: [
      {
        titulo: 'Aprovação final',
        descricao: 'Após a academia aprovar, o vínculo professor-academia chega pra você. Aprove ou rejeite. Filtre por status.',
        rota: '/vinculos',
        passos: ['Menu → "Vínculos Pendentes"', 'Filtre por "PENDENTE_ROOT"', 'Revise e aprove ou rejeite cada um'],
      },
    ],
  },
  {
    secao: 'Usuários',
    icone: '👤',
    itens: [
      {
        titulo: 'Buscar e gerenciar',
        descricao: 'Três abas: Academias, Professores, Alunos. Busca por nome/e-mail, paginação de 20 itens.',
        rota: '/usuarios',
      },
      {
        titulo: 'Ativar/desativar e resetar senha',
        descricao: 'Desative contas para suspender acesso (não apaga dados). Resete senhas se o usuário perder o acesso. Não pode desativar/resetar outro Root.',
        rota: '/usuarios',
      },
      {
        titulo: 'Conceder Admin Global',
        descricao: 'Qualquer usuário pode virar Admin Global. Acessa todos os menus Root mantendo seu role original. Botão "Tornar Admin" / "Admin" na lista de usuários.',
        rota: '/usuarios',
        passos: ['"Gerenciar Plataforma" → escolha a aba', 'Encontre o usuário', 'Toque em "Tornar Admin"', 'Para remover, toque em "Admin" novamente'],
      },
    ],
  },
  {
    secao: 'Moderação Social',
    icone: '🛡️',
    itens: [
      {
        titulo: 'Feed, clubes e amizades',
        descricao: 'Três abas: exclua posts inapropriados, gerencie clubes (criar/excluir), e visualize amizades.',
        rota: '/social',
        passos: ['Menu → "Moderação Social"', 'Abas: Feed Social, Clubes, Amizades', 'Exclua posts ou clubes conforme necessário'],
      },
    ],
  },
]

// ─── COMPONENTE ────────────────────────────────────────────────────────────────

function AccordionSection({ secao, icone, itens, defaultOpen }: DocSection & { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <section className="rounded-2xl bg-surface-card border border-surface-input overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-input/30 transition-colors cursor-pointer"
      >
        <span className="text-lg">{icone}</span>
        <span className="flex-1 text-sm font-bold text-text uppercase tracking-wider">{secao}</span>
        <span className="text-xs text-text-muted">{itens.length} tópicos</span>
        {open ? (
          <svg className="h-4 w-4 text-text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        ) : (
          <ChevronRightIcon className="h-4 w-4 text-text-muted shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2.5 animate-[slide-down_0.2s_ease]">
          {itens.map((item, i) => (
            <div key={i} className="rounded-xl bg-surface border border-surface-input p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-text">{item.titulo}</p>
                {item.rota && (
                  <a
                    href={item.rota}
                    className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground hover:brightness-110 transition-all flex items-center gap-1"
                  >
                    Abrir →
                  </a>
                )}
              </div>
              <p className="mt-1.5 text-xs text-text-muted leading-relaxed">{item.descricao}</p>
              {item.passos && item.passos.length > 0 && (
                <div className="mt-2.5 space-y-1">
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Passo a passo:</p>
                  <ol className="space-y-0.5">
                    {item.passos.map((passo, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-text-muted">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {j + 1}
                        </span>
                        <span className="leading-relaxed">{passo}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default function Documentacao() {
  const user = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [expandirTudo, setExpandirTudo] = useState(false)

  let conteudo = CONTEUDO_ALUNO
  let titulo = 'Guia do Aluno'
  let introducao =
    'Tudo sobre a ENDORFINAPP: criar treinos, executar, interagir no feed, participar de clubes e acompanhar sua evolução.'

  if (user?.role === 'PROFESSOR') {
    conteudo = CONTEUDO_PROFESSOR
    titulo = 'Guia do Professor'
    introducao =
      'Montar e enviar treinos, fazer avaliações físicas, acompanhar correlações e gerenciar vínculos com academias.'
  } else if (user?.role === 'ACADEMIA') {
    conteudo = CONTEUDO_ACADEMIA
    titulo = 'Guia da Academia'
    introducao =
      'Gerenciar professores e alunos, criar treinos e usar o clube da academia para engajar seus alunos.'
  } else if (user?.role === 'ROOT' || user?.admin) {
    conteudo = CONTEUDO_ROOT
    titulo = 'Guia do Administrador'
    introducao =
      'Administração completa: academias, vínculos, usuários, moderação social e concessão de Admin Global.'
  }

  const filteredConteudo = useMemo(() => {
    if (!search.trim()) return conteudo
    const q = search.toLowerCase()
    return conteudo
      .map((sec) => ({
        ...sec,
        itens: sec.itens.filter(
          (item) =>
            item.titulo.toLowerCase().includes(q) ||
            item.descricao.toLowerCase().includes(q) ||
            item.passos?.some((p) => p.toLowerCase().includes(q)),
        ),
      }))
      .filter((sec) => sec.itens.length > 0)
  }, [conteudo, search])

  const hasResults = filteredConteudo.length > 0

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-4 safe-bottom">
      {/* Cabeçalho */}
      <div className="rounded-2xl gradient-card border border-surface-input p-5 space-y-3">
        <h1 className="text-xl font-bold text-text">{titulo}</h1>
        <p className="text-sm text-text-muted leading-relaxed">{introducao}</p>
        <div className="flex items-center gap-2 text-[11px] text-text-muted">
          <span className="rounded-full bg-surface-input px-2 py-0.5 font-semibold text-text">
            {user?.role || '---'}
          </span>
          {user?.admin && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 font-semibold text-primary">Admin Global</span>
          )}
        </div>

        {/* Busca */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            type="text"
            placeholder="Buscar tópicos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-surface-input bg-surface pl-9 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <button
            onClick={() => setExpandirTudo(!expandirTudo)}
            className="flex-1 rounded-lg border border-surface-input bg-surface px-3 py-2 text-xs font-medium text-text-muted hover:text-text transition-colors cursor-pointer"
          >
            {expandirTudo ? 'Recolher tudo' : 'Expandir tudo'}
          </button>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="rounded-lg border border-surface-input bg-surface px-3 py-2 text-xs font-medium text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              Limpar busca
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      {!hasResults ? (
        <div className="rounded-2xl bg-surface-card border border-surface-input p-8 text-center">
          <p className="text-sm text-text-muted">Nenhum tópico encontrado para &quot;{search}&quot;</p>
          <button onClick={() => setSearch('')} className="mt-2 text-xs text-primary font-medium cursor-pointer">
            Limpar busca
          </button>
        </div>
      ) : (
        filteredConteudo.map((sec, i) => (
          <AccordionSection key={i} {...sec} defaultOpen={expandirTudo || (i === 0)} />
        ))
      )}
    </div>
  )
}
