export interface PaginaSeoDados {
  caminho: string
  title: string
  description: string
  h1: string
  lead: string
  publico: string
  beneficios: Array<{ titulo: string; texto: string }>
  passos: Array<{ titulo: string; texto: string }>
  faqs: Array<{ q: string; a: string }>
  cta: string
}

export const PAGINAS_SEO: PaginaSeoDados[] = [
  {
    caminho: '/app-para-personal-trainer',
    title: 'App para Personal Trainer: fichas e acompanhamento de alunos | ENDORFINAPP',
    description:
      'Monte fichas de treino, envie ao aluno e acompanhe a evolução em um só app. Templates reutilizáveis e gestão de alunos para personal trainers.',
    h1: 'App para personal trainer: monte fichas e acompanhe seus alunos',
    lead: 'Crie treinos, envie para o aluno aceitar e veja a execução e a evolução dele, sem planilhas nem mensagens soltas.',
    publico: 'Personal trainer',
    beneficios: [
      { titulo: 'Fichas prontas para enviar', texto: 'Monte o treino com séries, repetições e carga sugerida e envie ao aluno. Ele aceita ou recusa, e você acompanha o status.' },
      { titulo: 'Reaproveite treinos', texto: 'Clone um treino para vários alunos de uma vez e ajuste só o que for diferente.' },
      { titulo: 'Evolução do aluno', texto: 'Acompanhe medidas corporais, calendário de treinos e a relação entre volume e composição corporal.' },
      { titulo: 'Avaliações físicas', texto: 'Registre avaliações dos alunos e consulte o histórico em um só lugar.' },
      { titulo: 'Exercícios com demonstração', texto: 'A biblioteca traz GIF animado e passos em português, e você pode cadastrar exercícios próprios.' },
      { titulo: 'Vínculo com academias', texto: 'Solicite vínculo com academias e atenda os alunos delas dentro do mesmo app.' },
    ],
    passos: [
      { titulo: 'Crie sua conta', texto: 'Cadastre-se como professor e vincule seus alunos.' },
      { titulo: 'Monte e envie a ficha', texto: 'Escolha os exercícios, defina os dias da semana e envie.' },
      { titulo: 'Acompanhe a execução', texto: 'Veja o que foi concluído e como o aluno está evoluindo.' },
    ],
    faqs: [
      { q: 'Preciso ter uma academia para usar?', a: 'Não. O professor pode atender os próprios alunos sem vínculo com academia. O vínculo é opcional.' },
      { q: 'O aluno precisa instalar algum aplicativo?', a: 'Não. O ENDORFINAPP funciona no navegador do celular e pode ser instalado na tela inicial como PWA.' },
      { q: 'Posso usar o mesmo treino para vários alunos?', a: 'Sim. Você clona um treino e envia para vários alunos de uma vez.' },
      { q: 'Quanto custa?', a: 'Veja os valores atuais na página de planos. Há opção de teste grátis.' },
    ],
    cta: 'Criar conta de professor',
  },
  {
    caminho: '/software-para-academia',
    title: 'Software para Academia: gestão de alunos e professores | ENDORFINAPP',
    description:
      'Gerencie alunos, professores e treinos da sua academia em um só sistema. Aprove professores, vincule alunos e divulgue promoções no app.',
    h1: 'Software para academia: alunos, professores e treinos em um só lugar',
    lead: 'Tenha visão de quem treina na sua academia, quem acompanha cada aluno e quais treinos estão em andamento.',
    publico: 'Academia',
    beneficios: [
      { titulo: 'Gestão de alunos', texto: 'Veja os alunos da academia, o professor responsável por cada um e os treinos cadastrados.' },
      { titulo: 'Controle de professores', texto: 'Aprove ou desabilite professores vinculados à academia.' },
      { titulo: 'Vínculo aluno–professor', texto: 'Defina quem acompanha cada aluno, individualmente ou em lote.' },
      { titulo: 'Treinos da academia', texto: 'Consulte e crie treinos para os alunos direto do painel.' },
      { titulo: 'Promoções para o aluno', texto: 'Publique uma vitrine de promoções que aparece para o aluno ao abrir o app.' },
      { titulo: 'Sua marca no app', texto: 'Use o logo da academia e fortaleça a identidade nos cartões de treino compartilhados.' },
    ],
    passos: [
      { titulo: 'Cadastre a academia', texto: 'Crie a conta e envie os dados para aprovação.' },
      { titulo: 'Vincule professores e alunos', texto: 'Aprove os professores e organize quem acompanha quem.' },
      { titulo: 'Acompanhe e comunique', texto: 'Veja os treinos em andamento e divulgue promoções.' },
    ],
    faqs: [
      { q: 'Os alunos precisam de conta?', a: 'Sim. Cada aluno cria a própria conta e se vincula à academia.' },
      { q: 'Posso ter vários professores?', a: 'Sim. Os professores solicitam vínculo e a academia aprova.' },
      { q: 'O sistema funciona no celular?', a: 'Sim. É um app web responsivo, sem instalação obrigatória.' },
      { q: 'Quanto custa?', a: 'Veja os planos para academia na página de planos. Há opção de teste grátis.' },
    ],
    cta: 'Cadastrar minha academia',
  },
  {
    caminho: '/app-de-treino',
    title: 'App de Treino com execução guiada e evolução | ENDORFINAPP',
    description:
      'Monte seu treino ou use planos prontos, execute com GIF e passos em português e acompanhe sua evolução. Sozinho, com professor ou academia.',
    h1: 'App de treino com execução guiada e acompanhamento da sua evolução',
    lead: 'Monte seus próprios treinos ou use um plano pronto, registre carga e repetições série a série e veja seu progresso.',
    publico: 'Aluno',
    beneficios: [
      { titulo: 'Execução guiada', texto: 'Cada exercício com GIF animado e passos em português, e registro de carga e repetições.' },
      { titulo: 'Planos prontos', texto: 'Biblioteca de planos por nível de experiência, como Push, Pull e Legs, para adotar com um clique.' },
      { titulo: 'Treine sem depender de ninguém', texto: 'Crie e edite seus treinos do zero. Professor e academia são opcionais.' },
      { titulo: 'Evolução em gráficos', texto: 'Medidas corporais, calendário de treinos e histórico por exercício.' },
      { titulo: 'Cuidado com dores', texto: 'Informe dores como ombro, joelho ou lombar para o sistema evitar exercícios incompatíveis.' },
      { titulo: 'Rede social fitness', texto: 'Compartilhe treinos concluídos, adicione amigos e participe de clubes.' },
    ],
    passos: [
      { titulo: 'Crie sua conta', texto: 'Cadastre-se como aluno em poucos passos.' },
      { titulo: 'Escolha ou monte o treino', texto: 'Use um plano da biblioteca ou crie o seu.' },
      { titulo: 'Execute e acompanhe', texto: 'Siga o treino guiado e veja sua evolução ao longo do tempo.' },
    ],
    faqs: [
      { q: 'Preciso de professor ou academia?', a: 'Não. Há o modo autogestão, em que você cria e executa seus treinos sozinho.' },
      { q: 'Os exercícios têm demonstração?', a: 'Sim. Cada exercício tem GIF animado e passos de execução em português.' },
      { q: 'Funciona no celular?', a: 'Sim. Funciona no navegador do celular e pode ser instalado na tela inicial.' },
      { q: 'Posso treinar com um professor?', a: 'Sim. O professor envia fichas para você aceitar e acompanha sua evolução.' },
    ],
    cta: 'Criar conta grátis',
  },
]
