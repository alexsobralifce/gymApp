import { Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'
import { completarDias } from './AcessoService.js'

const FUSO = 'America/Sao_Paulo'
const DIA_MS = 86_400_000

// ─── Funções puras (testadas em tests/unit/UsoService.test.ts) ────────────────

const CAMINHOS_FIXOS = new Set(['/', '/planos', '/register', '/politica-privacidade', '/app-para-personal-trainer', '/software-para-academia', '/app-de-treino', '/blog'])

/** Só páginas públicas indexáveis são contadas (evita lixo e URLs arbitrárias no banco). */
export function caminhoPermitido(caminho: string): boolean {
  return CAMINHOS_FIXOS.has(caminho) || /^\/blog\/[a-z0-9]+(-[a-z0-9]+)*$/.test(caminho)
}

export function ehBot(userAgent: string | undefined): boolean {
  return !userAgent || /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|curl|wget|python-requests|node-fetch/i.test(userAgent)
}

export function classificarDispositivo(userAgent: string | undefined): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent ?? ''
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablet'
  if (/mobi|iphone|android/i.test(ua)) return 'mobile'
  return 'desktop'
}

const REDES: Array<[RegExp, string]> = [
  [/(^|\.)instagram\.com$|(^|\.)l\.instagram\.com$/, 'instagram'],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)l\.facebook\.com$/, 'facebook'],
  [/(^|\.)whatsapp\.com$|(^|\.)wa\.me$/, 'whatsapp'],
  [/(^|\.)t\.co$|(^|\.)twitter\.com$|(^|\.)x\.com$/, 'x'],
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, 'linkedin'],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'youtube'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)google\.[a-z.]+$|(^|\.)bing\.com$|(^|\.)duckduckgo\.com$|(^|\.)yahoo\.com$|(^|\.)ecosia\.org$|(^|\.)yandex\.[a-z.]+$|(^|\.)brave\.com$/, 'busca'],
]

/** Origem do visitante: utm_source > host do referrer (agrupado) > "direto". Mesmo site = "interno". */
export function classificarOrigem(referrer: string | undefined | null, hostDoSite: string, utmSource?: string | null): string {
  const utm = utmSource?.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30)
  if (utm) return utm
  if (!referrer) return 'direto'
  let host: string
  try {
    host = new URL(referrer).hostname.toLowerCase()
  } catch {
    return 'direto'
  }
  if (host === hostDoSite || host === `www.${hostDoSite}`) return 'interno'
  for (const [regex, nome] of REDES) if (regex.test(host)) return nome
  return host.replace(/^www\./, '').slice(0, 60)
}

export type Situacao = 'ATIVO' | 'EM_RISCO' | 'PAROU' | 'NUNCA_USOU'

/**
 * Situação de uso. Alunos: contam as séries registradas (uso de verdade). Demais papéis: último acesso.
 * ATIVO <= 14 dias; EM_RISCO <= 30 dias; PAROU acima disso; NUNCA_USOU sem nenhum registro.
 */
export function situacaoDoUsuario(
  u: { role: string; ultima_serie: Date | null; ultima_atividade_em: Date | null },
  agora = new Date(),
): Situacao {
  const ref = u.role === Role.ALUNO ? u.ultima_serie : u.ultima_atividade_em
  if (!ref) return 'NUNCA_USOU'
  const dias = (agora.getTime() - ref.getTime()) / DIA_MS
  if (dias <= 14) return 'ATIVO'
  if (dias <= 30) return 'EM_RISCO'
  return 'PAROU'
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// ─── Registro de visitas ──────────────────────────────────────────────────────

export async function registrarPagina(dados: { caminho: string; visitorId: string; origem: string; dispositivo: string }): Promise<void> {
  await prisma.paginaVisita.create({
    data: { caminho: dados.caminho, visitor_id: dados.visitorId, origem: dados.origem, dispositivo: dados.dispositivo },
  })
}

// ─── Acessos do site / blog ───────────────────────────────────────────────────

export async function resumoSite(dias: number) {
  const desde = new Date(Date.now() - dias * DIA_MS)

  const [totais, serieRaw, paginas, origens, dispositivos, cadastros, visitantesLanding] = await Promise.all([
    prisma.$queryRaw<{ views: bigint; visitantes: bigint }[]>`
      SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitantes FROM pagina_visitas WHERE criado_em >= ${desde}`,
    prisma.$queryRaw<{ dia: string; views: bigint; visitantes: bigint }[]>`
      SELECT to_char(criado_em AT TIME ZONE ${FUSO}, 'YYYY-MM-DD') AS dia, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitantes
      FROM pagina_visitas WHERE criado_em >= ${desde} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ caminho: string; views: bigint; visitantes: bigint }[]>`
      SELECT caminho, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitantes
      FROM pagina_visitas WHERE criado_em >= ${desde} GROUP BY caminho ORDER BY views DESC LIMIT 40`,
    prisma.$queryRaw<{ origem: string; visitantes: bigint }[]>`
      SELECT COALESCE(origem, 'direto') AS origem, COUNT(DISTINCT visitor_id) AS visitantes
      FROM pagina_visitas WHERE criado_em >= ${desde} AND COALESCE(origem, 'direto') <> 'interno' GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
    prisma.$queryRaw<{ dispositivo: string; visitantes: bigint }[]>`
      SELECT COALESCE(dispositivo, 'desktop') AS dispositivo, COUNT(DISTINCT visitor_id) AS visitantes
      FROM pagina_visitas WHERE criado_em >= ${desde} GROUP BY 1 ORDER BY 2 DESC`,
    prisma.usuario.count({ where: { criado_em: { gte: desde }, admin: false, role: { not: Role.ROOT } } }),
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(DISTINCT visitor_id) AS n FROM pagina_visitas WHERE criado_em >= ${desde} AND caminho = '/'`,
  ])

  const slugs = paginas.filter((p) => p.caminho.startsWith('/blog/')).map((p) => p.caminho.slice('/blog/'.length))
  const titulos = slugs.length
    ? await prisma.artigoBlog.findMany({ where: { slug: { in: slugs } }, select: { slug: true, titulo: true, tipo: true } })
    : []
  const infoArtigo = new Map(titulos.map((t) => [t.slug, t]))

  const t = totais[0]
  return {
    periodoDias: dias,
    totais: { visualizacoes: Number(t?.views ?? 0), visitantes: Number(t?.visitantes ?? 0) },
    serie: completarDias(
      serieRaw.map((l) => ({ dia: l.dia, visualizacoes: Number(l.views), visitantes: Number(l.visitantes) })),
      dias,
      { visualizacoes: 0, visitantes: 0 },
    ),
    paginas: paginas.map((p) => {
      const art = p.caminho.startsWith('/blog/') ? infoArtigo.get(p.caminho.slice('/blog/'.length)) : undefined
      return { caminho: p.caminho, titulo: art?.titulo ?? null, tipo: art?.tipo ?? null, visualizacoes: Number(p.views), visitantes: Number(p.visitantes) }
    }),
    origens: origens.map((o) => ({ origem: o.origem, visitantes: Number(o.visitantes) })),
    dispositivos: dispositivos.map((d) => ({ dispositivo: d.dispositivo, visitantes: Number(d.visitantes) })),
    conversao: { visitantesLanding: Number(visitantesLanding[0]?.n ?? 0), cadastros },
  }
}

// ─── Uso do app ───────────────────────────────────────────────────────────────

export async function resumoApp(dias: number) {
  const desde = new Date(Date.now() - dias * DIA_MS)
  const d1 = new Date(Date.now() - DIA_MS)
  const d7 = new Date(Date.now() - 7 * DIA_MS)
  const d30 = new Date(Date.now() - 30 * DIA_MS)
  const real = { admin: false, role: { not: Role.ROOT } } as const

  const treinaramDesde = (d: Date) =>
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(DISTINCT al.usuario_id) AS n FROM execucao_exercicios e
      JOIN treinos t ON t.id = e.treino_id JOIN alunos al ON al.id = t.aluno_id WHERE e.registrado_em >= ${d}`

  const [porPapel, novosPorPapel, acessaram, treinaram, dau, wau, mau, serieTreino, serieLogins, serieNovos, funil] = await Promise.all([
    prisma.usuario.groupBy({ by: ['role'], where: { ...real, ativo: true }, _count: { _all: true } }),
    prisma.usuario.groupBy({ by: ['role'], where: { ...real, criado_em: { gte: desde } }, _count: { _all: true } }),
    prisma.usuario.count({ where: { ...real, ultima_atividade_em: { gte: desde } } }),
    treinaramDesde(desde),
    treinaramDesde(d1),
    treinaramDesde(d7),
    treinaramDesde(d30),
    prisma.$queryRaw<{ dia: string; treinaram: bigint; series: bigint; treinos: bigint }[]>`
      SELECT to_char(e.registrado_em AT TIME ZONE ${FUSO}, 'YYYY-MM-DD') AS dia,
        COUNT(DISTINCT al.usuario_id) AS treinaram, COUNT(*) AS series, COUNT(DISTINCT e.treino_id) AS treinos
      FROM execucao_exercicios e JOIN treinos t ON t.id = e.treino_id JOIN alunos al ON al.id = t.aluno_id
      WHERE e.registrado_em >= ${desde} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ dia: string; logins: bigint }[]>`
      SELECT to_char(criado_em AT TIME ZONE ${FUSO}, 'YYYY-MM-DD') AS dia, COUNT(*) AS logins
      FROM acesso_eventos WHERE tipo = 'LOGIN' AND criado_em >= ${desde} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ dia: string; novos: bigint }[]>`
      SELECT to_char(criado_em AT TIME ZONE ${FUSO}, 'YYYY-MM-DD') AS dia, COUNT(*) AS novos
      FROM usuarios WHERE criado_em >= ${desde} AND admin = false AND role <> 'ROOT' GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ cadastrados: bigint; com_perfil: bigint; com_treino: bigint; com_serie: bigint; concluiu: bigint; voltou: bigint }[]>`
      SELECT
        (SELECT COUNT(*) FROM usuarios WHERE role = 'ALUNO' AND ativo = true AND admin = false) AS cadastrados,
        (SELECT COUNT(*) FROM alunos al JOIN usuarios u ON u.id = al.usuario_id WHERE u.ativo = true AND u.admin = false) AS com_perfil,
        (SELECT COUNT(DISTINCT t.aluno_id) FROM treinos t) AS com_treino,
        (SELECT COUNT(DISTINCT t.aluno_id) FROM execucao_exercicios e JOIN treinos t ON t.id = e.treino_id) AS com_serie,
        (SELECT COUNT(DISTINCT t.aluno_id) FROM treinos t WHERE t.finalizado_em IS NOT NULL) AS concluiu,
        (SELECT COUNT(*) FROM (
          SELECT t.aluno_id FROM execucao_exercicios e JOIN treinos t ON t.id = e.treino_id
          GROUP BY t.aluno_id HAVING COUNT(DISTINCT (e.registrado_em AT TIME ZONE ${FUSO})::date) >= 2) x) AS voltou`,
  ])

  const mapa = <T extends { dia: string }>(linhas: T[], f: (l: T) => Record<string, number>) => new Map(linhas.map((l) => [l.dia, f(l)]))
  const mT = mapa(serieTreino, (l) => ({ treinaram: Number(l.treinaram), series: Number(l.series), treinos: Number(l.treinos) }))
  const mL = mapa(serieLogins, (l) => ({ logins: Number(l.logins) }))
  const mN = mapa(serieNovos, (l) => ({ novos: Number(l.novos) }))
  const dias_ = completarDias([...new Set([...mT.keys(), ...mL.keys(), ...mN.keys()])].map((dia) => ({ dia })), dias, {})
  const serie = dias_.map(({ dia }) => ({
    dia,
    treinaram: mT.get(dia)?.treinaram ?? 0,
    series: mT.get(dia)?.series ?? 0,
    treinos: mT.get(dia)?.treinos ?? 0,
    logins: mL.get(dia)?.logins ?? 0,
    novos: mN.get(dia)?.novos ?? 0,
  }))

  const n = (r: { n: bigint }[]) => Number(r[0]?.n ?? 0)
  const f = funil[0]
  return {
    periodoDias: dias,
    usuariosPorPapel: porPapel.map((p) => ({ role: p.role, total: p._count._all })),
    novosPorPapel: novosPorPapel.map((p) => ({ role: p.role, total: p._count._all })),
    acessaramNoPeriodo: acessaram,
    treinaramNoPeriodo: n(treinaram),
    treinaram: { hoje: n(dau), semana: n(wau), mes: n(mau) },
    funilAlunos: [
      { etapa: 'Cadastrados como aluno', total: Number(f?.cadastrados ?? 0) },
      { etapa: 'Criaram o perfil', total: Number(f?.com_perfil ?? 0) },
      { etapa: 'Têm algum treino', total: Number(f?.com_treino ?? 0) },
      { etapa: 'Registraram alguma série', total: Number(f?.com_serie ?? 0) },
      { etapa: 'Concluíram um treino', total: Number(f?.concluiu ?? 0) },
      { etapa: 'Treinaram em 2 dias ou mais', total: Number(f?.voltou ?? 0) },
    ],
    serie,
  }
}

export interface FiltroUsuariosUso {
  dias: number
  busca?: string
  papel?: Role
  situacao?: Situacao
  page: number
  limit: number
}

export async function listarUsuariosUso(filtro: FiltroUsuariosUso) {
  const desde = new Date(Date.now() - filtro.dias * DIA_MS)
  const linhas = await prisma.$queryRaw<
    Array<{
      id: string; nome: string; email: string; role: Role; criado_em: Date; ultima_atividade_em: Date | null
      ultima_serie: Date | null; total_series: bigint | null; series_periodo: bigint | null; treinos_periodo: bigint | null; logins_periodo: bigint | null
    }>
  >`
    SELECT u.id, u.nome, u.email, u.role, u.criado_em, u.ultima_atividade_em,
      ex.ultima_serie, ex.total_series, ex.series_periodo, ex.treinos_periodo, lg.logins AS logins_periodo
    FROM usuarios u
    LEFT JOIN (
      SELECT al.usuario_id, MAX(e.registrado_em) AS ultima_serie, COUNT(*) AS total_series,
        COUNT(*) FILTER (WHERE e.registrado_em >= ${desde}) AS series_periodo,
        COUNT(DISTINCT e.treino_id) FILTER (WHERE e.registrado_em >= ${desde}) AS treinos_periodo
      FROM execucao_exercicios e JOIN treinos t ON t.id = e.treino_id JOIN alunos al ON al.id = t.aluno_id
      GROUP BY al.usuario_id
    ) ex ON ex.usuario_id = u.id
    LEFT JOIN (
      SELECT usuario_id, COUNT(*) AS logins FROM acesso_eventos WHERE tipo = 'LOGIN' AND criado_em >= ${desde} GROUP BY usuario_id
    ) lg ON lg.usuario_id = u.id
    WHERE u.ativo = true AND u.admin = false AND u.role <> 'ROOT'`

  const agora = new Date()
  const termo = filtro.busca ? semAcento(filtro.busca).trim() : ''
  const todos = linhas
    .filter((l) => !filtro.papel || l.role === filtro.papel)
    .filter((l) => !termo || semAcento(`${l.nome} ${l.email}`).includes(termo))
    .map((l) => ({
      id: l.id,
      nome: l.nome,
      email: l.email,
      role: l.role,
      criadoEm: l.criado_em,
      ultimoAcesso: l.ultima_atividade_em,
      ultimaSerie: l.ultima_serie,
      seriesPeriodo: Number(l.series_periodo ?? 0),
      treinosPeriodo: Number(l.treinos_periodo ?? 0),
      totalSeries: Number(l.total_series ?? 0),
      loginsPeriodo: Number(l.logins_periodo ?? 0),
      situacao: situacaoDoUsuario({ role: l.role, ultima_serie: l.ultima_serie, ultima_atividade_em: l.ultima_atividade_em }, agora),
    }))

  const contagem: Record<Situacao, number> = { ATIVO: 0, EM_RISCO: 0, PAROU: 0, NUNCA_USOU: 0 }
  for (const u of todos) contagem[u.situacao]++

  const ref = (u: (typeof todos)[number]) => Math.max(u.ultimaSerie?.getTime() ?? 0, u.ultimoAcesso?.getTime() ?? 0)
  const filtrados = todos
    .filter((u) => !filtro.situacao || u.situacao === filtro.situacao)
    .sort((a, b) => b.seriesPeriodo - a.seriesPeriodo || ref(b) - ref(a))

  const total = filtrados.length
  const inicio = (filtro.page - 1) * filtro.limit
  return {
    total,
    page: filtro.page,
    totalPages: Math.max(1, Math.ceil(total / filtro.limit)),
    contagem,
    itens: filtrados.slice(inicio, inicio + filtro.limit),
  }
}
