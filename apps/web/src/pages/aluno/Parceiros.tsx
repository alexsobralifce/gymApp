import { Building2Icon } from '../../components/icons/Icon'

interface Partner {
  id: string
  logo: string
  name: string
  category: string
  description: string
  discount?: string
  ctaLabel: string
  ctaUrl: string
  featured?: boolean
  badgeColor?: string
}

const PARTNERS: Partner[] = [
  {
    id: 'vitaforce',
    logo: '💊',
    name: 'VitaForce Suplementos',
    category: 'Suplementação',
    description: 'Whey Protein, Creatina e pré-treinos premium. A melhor qualidade para seus ganhos.',
    discount: '15% OFF com ENDORFINAPP',
    ctaLabel: 'Ver Oferta',
    ctaUrl: '#',
    featured: true,
    badgeColor: 'bg-primary/20 text-primary',
  },
  {
    id: 'motiongear',
    logo: '👟',
    name: 'MotionGear Brasil',
    category: 'Vestuário Fitness',
    description: 'Roupas de compressão, tênis de treino e acessórios projetados para máxima performance.',
    discount: 'Frete Grátis',
    ctaLabel: 'Ver Coleção',
    ctaUrl: '#',
    featured: true,
    badgeColor: 'bg-blue-500/20 text-blue-500',
  },
  {
    id: 'nutriplan',
    logo: '🥗',
    name: 'NutriPlan Pro',
    category: 'Nutrição & Dieta',
    description: 'App de plano alimentar personalizado com nutricionistas reais para acompanhar sua evolução.',
    discount: '1º Mês Grátis',
    ctaLabel: 'Começar Agora',
    ctaUrl: '#',
    badgeColor: 'bg-green-500/20 text-green-500',
  },
  {
    id: 'fisioactive',
    logo: '🏥',
    name: 'FisioActive Clínica',
    category: 'Saúde & Fisioterapia',
    description: 'Avaliação funcional, reabilitação avançada e prevenção de lesões para atletas e iniciantes.',
    ctaLabel: 'Agendar Consulta',
    ctaUrl: '#',
    badgeColor: 'bg-red-500/20 text-red-500',
  },
  {
    id: 'pulsetrack',
    logo: '⌚',
    name: 'PulseTrack Wearables',
    category: 'Tecnologia Fitness',
    description: 'Smartbands e monitores cardíacos inteligentes perfeitamente integrados ao EndorfinApp.',
    discount: '10% OFF no Boleto',
    ctaLabel: 'Conhecer Produtos',
    ctaUrl: '#',
    badgeColor: 'bg-purple-500/20 text-purple-500',
  },
  {
    id: 'recoverx',
    logo: '🛁',
    name: 'RecoverX SPA',
    category: 'Recuperação',
    description: 'Crioterapia, massagem esportiva, botas de compressão pneumática e imersão em gelo.',
    ctaLabel: 'Ver Serviços',
    ctaUrl: '#',
    badgeColor: 'bg-cyan-500/20 text-cyan-500',
  },
]

export default function Parceiros() {
  return (
    <div className="flex h-full flex-col p-4 md:p-6 lg:p-8 space-y-8 animate-fade-in pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-text flex items-center gap-3">
          <span className="text-3xl">🤝</span> Parceiros EndorfinApp
        </h1>
        <p className="text-sm md:text-base text-text-muted">
          Uma seleção exclusiva de marcas, produtos e serviços para acelerar os seus resultados.
          Descontos e vantagens especiais para os nossos alunos.
        </p>
      </div>

      {/* Grid de Parceiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {PARTNERS.map((partner) => (
          <div
            key={partner.id}
            className={`flex flex-col rounded-2xl bg-surface-card border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
              partner.featured
                ? 'border-primary ring-1 ring-primary/20 shadow-primary/5'
                : 'border-surface-input hover:border-primary/50'
            }`}
          >
            <div className="p-5 flex-1 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-surface text-2xl border border-surface-input shadow-sm">
                  {partner.logo}
                </div>
                {partner.featured && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary border border-primary/20">
                    DESTAQUE
                  </span>
                )}
              </div>

              <div>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold mb-2 ${partner.badgeColor || 'bg-secondary text-text'}`}>
                  {partner.category}
                </span>
                <h3 className="text-lg font-bold text-text">{partner.name}</h3>
                <p className="mt-2 text-sm text-text-muted line-clamp-3">
                  {partner.description}
                </p>
              </div>

              {partner.discount && (
                <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-bold text-success bg-success/5 p-3 rounded-xl border border-success/10">
                  <span className="text-base">🎁</span> {partner.discount}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-surface-input bg-surface-card rounded-b-2xl">
              <a
                href={partner.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all active:scale-95 ${
                  partner.featured
                    ? 'bg-primary text-primary-foreground hover:brightness-110 shadow-md shadow-primary/20'
                    : 'bg-surface-input text-text hover:bg-surface-input/80'
                }`}
              >
                {partner.ctaLabel}
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* CTA para novos parceiros */}
      <div className="mt-8 rounded-3xl bg-gradient-to-br from-surface-card to-surface-input border border-surface-input p-6 md:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        {/* Background visual effect */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-2 max-w-lg text-center sm:text-left">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <Building2Icon className="h-6 w-6 text-primary" />
            <h3 className="text-lg md:text-xl font-bold text-text">Quer ser um parceiro?</h3>
          </div>
          <p className="text-sm text-text-muted">
            Divulgue sua marca, produto ou serviço fitness para nossa comunidade. 
            Entre em contato para discutirmos oportunidades.
          </p>
        </div>
        
        <a
          href="https://wa.me/5588993573809?text=Olá!%20Gostaria%20de%20saber%20mais%20sobre%20parcerias%20no%20EndorfinApp."
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 shrink-0 whitespace-nowrap rounded-xl bg-surface border border-surface-input px-6 py-3 text-sm font-bold text-text hover:border-primary/50 hover:text-primary transition-all active:scale-95 shadow-sm"
        >
          Falar com Comercial
        </a>
      </div>
    </div>
  )
}
