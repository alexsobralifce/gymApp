import { useAuthStore } from '../stores/auth'

interface DocItem {
  titulo: string
  descricao: string
  rota?: string
}

const CONTEUDO_ALUNO: { secao: string; itens: DocItem[] }[] = [
  {
    secao: 'Seus Dados e Perfil',
    itens: [
      { titulo: 'Alterar dados pessoais', descricao: 'Nome, telefone, e-mail e foto de perfil são alterados em "Meu Perfil" no menu.', rota: '/dados' },
      { titulo: 'Dados físicos', descricao: 'Peso, altura, data de nascimento e sexo também ficam em "Meu Perfil".', rota: '/dados' },
      { titulo: 'Senha', descricao: 'Troque sua senha em "Alterar Senha" (menu do avatar).', rota: '/alterar-senha' },
      { titulo: 'Privacidade (LGPD)', descricao: 'Controle quem vê seus posts e se você pode ser encontrado por e-mail em "Privacidade".', rota: '/privacidade' },
    ],
  },
  {
    secao: 'Treinos',
    itens: [
      { titulo: 'Meus Treinos', descricao: 'Lista de todos os seus treinos, com status (aguardando, aceito, em execução, concluído).', rota: '/meus-treinos' },
      { titulo: 'Criar treino manualmente', descricao: 'Monte sua própria ficha em "Criar Treino" dentro de Meus Treinos.', rota: '/treino/novo' },
      { titulo: 'Treino por IA', descricao: 'Assistente de IA monta seu treino em 5 passos: objetivo, nível, grupos musculares e restrições.', rota: '/treino/ia' },
      { titulo: 'Biblioteca de Planos', descricao: 'Adote planos científicos prontos (hipertrofia, força, emagrecimento, saúde).', rota: '/biblioteca-planos' },
      { titulo: 'Executar treino', descricao: 'Toque no treino em "Meus Treinos" → "Iniciar" e registre séries, cargas e repetições.', rota: '/meus-treinos' },
    ],
  },
  {
    secao: 'Mural Social e Amigos',
    itens: [
      { titulo: 'Mural', descricao: 'Feed com treinos de amigos e de toda a rede. Curtir, comentar e ver fotos.', rota: '/mural' },
      { titulo: 'Encontrar amigos por e-mail', descricao: 'Em "Amigos" (menu Mural), toque em "Adicionar amigo" e digite o e-mail da pessoa.', rota: '/amizades' },
      { titulo: 'Amigos da academia', descricao: 'Colegas da mesma academia aparecem no painel lateral para você seguir direto.', rota: '/mural' },
    ],
  },
  {
    secao: 'Evolução e Saúde',
    itens: [
      { titulo: 'Medidas', descricao: 'Registre peso e medidas corporais ao longo do tempo.', rota: '/medidas' },
      { titulo: 'Evolução', descricao: 'Gráficos de frequência, volume, duração e correlações mensais.', rota: '/evolucao' },
      { titulo: 'Clubes', descricao: 'Participe do clube da sua academia, acumule XP e dispute o leaderboard.', rota: '/clubes' },
      { titulo: 'Parceiros', descricao: 'Descontos exclusivos em suplementação, vestuário e nutrição.', rota: '/parceiros' },
    ],
  },
]

const CONTEUDO_PROFESSOR: { secao: string; itens: DocItem[] }[] = [
  {
    secao: 'Montar e Enviar Treino',
    itens: [
      { titulo: 'Criar treino', descricao: 'Menu "Treino" → "Criar Treino". Monte a ficha com exercícios, séries, repetições e carga sugerida.', rota: '/treinos/criar' },
      { titulo: 'Enviar treino ao aluno', descricao: 'Na lista de treinos ("Treino" → "Listar Treinos"), escolha "Enviar" e selecione o aluno. O aluno recebe e aceita.', rota: '/treinos' },
      { titulo: 'Fichas em lote', descricao: 'Envie a mesma ficha para vários alunos de uma vez em "Fichas".', rota: '/fichas' },
      { titulo: 'Templates', descricao: 'Marque um treino como template para reutilizar depois em "Fichas".', rota: '/fichas' },
    ],
  },
  {
    secao: 'Alunos e Avaliação',
    itens: [
      { titulo: 'Vincular aluno', descricao: 'Adicione um aluno ao seu time em "Vincular Aluno".', rota: '/alunos/vincular' },
      { titulo: 'Acompanhar evolução', descricao: 'Abra um aluno no dashboard para ver evolução, correlações e histórico de execuções.', rota: '/' },
      { titulo: 'Avaliação Física', descricao: 'Registre avaliações (PAR-Q+, composição corporal, VO2max) e gere laudo.', rota: '/avaliacoes' },
    ],
  },
  {
    secao: 'Perfil e Academias',
    itens: [
      { titulo: 'Meu Perfil', descricao: 'Seus dados, CREF e foto.', rota: '/dados' },
      { titulo: 'Academias', descricao: 'Vincule-se a academias e acompanhe a aprovação do vínculo.', rota: '/academias' },
      { titulo: 'Exercícios', descricao: 'Catálogo de exercícios com filtros; também é possível criar novos.', rota: '/exercicios/criar' },
    ],
  },
]

const CONTEUDO_ACADEMIA: { secao: string; itens: DocItem[] }[] = [
  {
    secao: 'Gestão',
    itens: [
      { titulo: 'Professores', descricao: 'Gerencie professores vinculados e autorize novos.', rota: '/professores' },
      { titulo: 'Alunos', descricao: 'Liste alunos da academia e atribua professores.', rota: '/alunos' },
      { titulo: 'Treinos', descricao: 'Crie fichas para os alunos da academia e envie em lote.', rota: '/treinos' },
      { titulo: 'Avaliação Física', descricao: 'Registre avaliações dos alunos.', rota: '/avaliacoes' },
    ],
  },
  {
    secao: 'Perfil',
    itens: [
      { titulo: 'Meu Perfil', descricao: 'Dados da academia e usuário.', rota: '/dados' },
    ],
  },
]

const CONTEUDO_ROOT: { secao: string; itens: DocItem[] }[] = [
  {
    secao: 'Administração',
    itens: [
      { titulo: 'Painel Global', descricao: 'Visão geral de academias, professores e alunos.', rota: '/' },
      { titulo: 'Vínculos Pendentes', descricao: 'Aprove ou rejeite vínculos de professores com academias.', rota: '/vinculos' },
      { titulo: 'Gerenciar Plataforma', descricao: 'CRUD de usuários, ativação, reset de senha.', rota: '/usuarios' },
      { titulo: 'Moderação Social', descricao: 'Exclua posts, gerencie clubes e amizades.', rota: '/social' },
    ],
  },
]

function Card({ secao, itens }: { secao: string; itens: DocItem[] }) {
  return (
    <section className="rounded-2xl bg-surface-card border border-surface-input p-4 space-y-3">
      <h2 className="text-sm font-bold text-text uppercase tracking-wider">{secao}</h2>
      <div className="space-y-2.5">
        {itens.map((item) => (
          <div key={item.titulo} className="rounded-xl bg-surface border border-surface-input p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-text">{item.titulo}</p>
              {item.rota && (
                <a href={item.rota} className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors">
                  Abrir →
                </a>
              )}
            </div>
            <p className="mt-1 text-xs text-text-muted leading-relaxed">{item.descricao}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Documentacao() {
  const user = useAuthStore((s) => s.user)

  let conteudo = CONTEUDO_ALUNO
  let titulo = 'Guia do Aluno'
  let introducao =
    'Aqui você descobre onde alterar seus dados, cadastrar e executar treinos, e encontrar amigos no mural social.'

  if (user?.role === 'PROFESSOR') {
    conteudo = CONTEUDO_PROFESSOR
    titulo = 'Guia do Professor'
    introducao =
      'Monte e envie treinos aos seus alunos, acompanhe a evolução e gerencie avaliações físicas.'
  } else if (user?.role === 'ACADEMIA') {
    conteudo = CONTEUDO_ACADEMIA
    titulo = 'Guia da Academia'
    introducao = 'Gerencie professores, alunos e treinos da sua academia.'
  } else if (user?.role === 'ROOT') {
    conteudo = CONTEUDO_ROOT
    titulo = 'Guia do Root'
    introducao = 'Administração da plataforma: vínculos, usuários e moderação social.'
  }

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-4">
      <div className="rounded-2xl gradient-card border border-surface-input p-5 space-y-1">
        <h1 className="text-xl font-bold text-text">{titulo}</h1>
        <p className="text-sm text-text-muted leading-relaxed">{introducao}</p>
        <p className="text-[11px] text-text-muted pt-1">
          Sequência recomendada: comece pelo <strong>Meu Perfil</strong> (dados e foto), depois{' '}
          <strong>Treinos</strong>, e por fim o <strong>Mural/Amigos</strong> para interagir com a rede.
        </p>
      </div>

      {conteudo.map((sec) => (
        <Card key={sec.secao} secao={sec.secao} itens={sec.itens} />
      ))}
    </div>
  )
}
