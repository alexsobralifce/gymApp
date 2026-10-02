import { AcessoTipo, Role } from '@prisma/client'
import { prisma } from '../../../infrastructure/database/prisma.js'

const FUSO = 'America/Sao_Paulo'

/** Registra um login. Nunca derruba o login se a contagem falhar. */
export async function registrarLogin(usuarioId: string, role: Role, metodo: 'senha' | 'google'): Promise<void> {
  try {
    await prisma.acessoEvento.create({ data: { tipo: AcessoTipo.LOGIN, usuario_id: usuarioId, role, metodo } })
  } catch {
    /* métrica é secundária */
  }
}

/** Registra uma visita à landing. O visitorId é aleatório do navegador (sem IP nem dados pessoais). */
export async function registrarVisitaLanding(visitorId: string): Promise<void> {
  await prisma.acessoEvento.create({ data: { tipo: AcessoTipo.VISITA_LANDING, visitor_id: visitorId } })
}

interface LinhaDia {
  dia: string
  visitas: bigint
  visitantes: bigint
  logins: bigint
  usuarios: bigint
}

/** Preenche com zero os dias sem evento, do mais antigo ao mais recente (no fuso de São Paulo). */
export function completarDias<T extends { dia: string }>(
  linhas: T[],
  dias: number,
  vazio: Omit<T, 'dia'>,
  hoje = new Date(),
): T[] {
  const porDia = new Map(linhas.map((l) => [l.dia, l]))
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO })
  const out: T[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const dia = fmt.format(new Date(hoje.getTime() - i * 86_400_000))
    out.push(porDia.get(dia) ?? ({ dia, ...vazio } as T))
  }
  return out
}

export async function resumoAcessos(dias: number) {
  const desde = new Date(Date.now() - dias * 86_400_000)

  const [totais, porDiaRaw, loginsPorRole] = await Promise.all([
    prisma.$queryRaw<{ visitas: bigint; visitantes: bigint; logins: bigint; usuarios: bigint }[]>`
      SELECT
        COUNT(*) FILTER (WHERE tipo = 'VISITA_LANDING') AS visitas,
        COUNT(DISTINCT visitor_id) FILTER (WHERE tipo = 'VISITA_LANDING') AS visitantes,
        COUNT(*) FILTER (WHERE tipo = 'LOGIN') AS logins,
        COUNT(DISTINCT usuario_id) FILTER (WHERE tipo = 'LOGIN') AS usuarios
      FROM acesso_eventos WHERE criado_em >= ${desde}`,
    prisma.$queryRaw<LinhaDia[]>`
      SELECT to_char(criado_em AT TIME ZONE ${FUSO}, 'YYYY-MM-DD') AS dia,
        COUNT(*) FILTER (WHERE tipo = 'VISITA_LANDING') AS visitas,
        COUNT(DISTINCT visitor_id) FILTER (WHERE tipo = 'VISITA_LANDING') AS visitantes,
        COUNT(*) FILTER (WHERE tipo = 'LOGIN') AS logins,
        COUNT(DISTINCT usuario_id) FILTER (WHERE tipo = 'LOGIN') AS usuarios
      FROM acesso_eventos WHERE criado_em >= ${desde}
      GROUP BY 1 ORDER BY 1`,
    prisma.acessoEvento.groupBy({
      by: ['role'],
      where: { tipo: AcessoTipo.LOGIN, criado_em: { gte: desde } },
      _count: { _all: true },
    }),
  ])

  const [totalGeral] = await Promise.all([
    prisma.acessoEvento.groupBy({ by: ['tipo'], _count: { _all: true } }),
  ])
  const geral = (t: AcessoTipo) => totalGeral.find((x) => x.tipo === t)?._count._all ?? 0

  const t = totais[0]
  const serie = completarDias(
    porDiaRaw.map((l) => ({
      dia: l.dia,
      visitas: Number(l.visitas),
      visitantes: Number(l.visitantes),
      logins: Number(l.logins),
      usuarios: Number(l.usuarios),
    })),
    dias,
    { visitas: 0, visitantes: 0, logins: 0, usuarios: 0 },
  )

  return {
    periodoDias: dias,
    periodo: {
      visitas: Number(t?.visitas ?? 0),
      visitantesUnicos: Number(t?.visitantes ?? 0),
      logins: Number(t?.logins ?? 0),
      usuariosUnicos: Number(t?.usuarios ?? 0),
    },
    hoje: serie[serie.length - 1],
    totalGeral: { visitas: geral(AcessoTipo.VISITA_LANDING), logins: geral(AcessoTipo.LOGIN) },
    loginsPorRole: loginsPorRole.map((r) => ({ role: r.role, total: r._count._all })),
    serie,
  }
}
