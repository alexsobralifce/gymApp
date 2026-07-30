import { prisma } from '../../../infrastructure/database/prisma.js'
import { NotFoundError, ValidationError, ForbiddenError } from '../../../domain/errors/AppError.js'
import { ClubMemberRole } from '@prisma/client'

const MAX_CLUBES_CRIADOS = 5

function gerarCodigoConvite(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let codigo = ''
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return codigo
}

export class ClubService {
  static async criar(alunoId: string, nome: string, descricao?: string) {
    const clubsCriados = await prisma.socialClubMember.count({
      where: { aluno_id: alunoId, role: ClubMemberRole.CRIADOR },
    })
    if (clubsCriados >= MAX_CLUBES_CRIADOS) {
      throw new ValidationError(`Você pode criar no máximo ${MAX_CLUBES_CRIADOS} clubes.`)
    }

    const club = await prisma.socialClub.create({
      data: {
        nome,
        descricao: descricao || null,
        tipo: 'TEMATICO',
        codigo_convite: gerarCodigoConvite(),
      },
    })

    await prisma.socialClubMember.create({
      data: {
        clube_id: club.id,
        aluno_id: alunoId,
        role: ClubMemberRole.CRIADOR,
      },
    })

    return club
  }

  static async listar(alunoId: string) {
    const memberships = await prisma.socialClubMember.findMany({
      where: { aluno_id: alunoId },
      select: { clube_id: true, role: true },
    })
    const meusClubeIds = memberships.map((m) => m.clube_id)
    const roleMap = new Map(memberships.map((m) => [m.clube_id, m.role]))

    const meus = await prisma.socialClub.findMany({
      where: { id: { in: meusClubeIds } },
      include: { _count: { select: { membros: true } } },
    })

    const disponiveis = await prisma.socialClub.findMany({
      where: {
        id: { notIn: meusClubeIds },
        tipo: 'TEMATICO',
      },
      include: { _count: { select: { membros: true } } },
    })

    return {
      meus: meus.map((c) => ({
        id: c.id,
        nome: c.nome,
        descricao: c.descricao,
        tipo: c.tipo,
        codigo_convite: c.codigo_convite,
        totalMembros: c._count.membros,
        role: roleMap.get(c.id),
      })),
      disponiveis: disponiveis.map((c) => ({
        id: c.id,
        nome: c.nome,
        descricao: c.descricao,
        tipo: c.tipo,
        totalMembros: c._count.membros,
      })),
    }
  }

  static async entrar(alunoId: string, clubeId: string, codigoConvite?: string) {
    const club = await prisma.socialClub.findUnique({ where: { id: clubeId } })
    if (!club) throw new NotFoundError('Clube')

    if (club.codigo_convite) {
      if (!codigoConvite || codigoConvite !== club.codigo_convite) {
        throw new ValidationError('Código de convite inválido.')
      }
    }

    const existing = await prisma.socialClubMember.findUnique({
      where: { clube_id_aluno_id: { clube_id: clubeId, aluno_id: alunoId } },
    })
    if (existing) throw new ValidationError('Você já é membro deste clube.')

    await prisma.socialClubMember.create({
      data: { clube_id: clubeId, aluno_id: alunoId },
    })

    return { message: 'Entrou no clube com sucesso.' }
  }

  static async sair(alunoId: string, clubeId: string) {
    const member = await prisma.socialClubMember.findUnique({
      where: { clube_id_aluno_id: { clube_id: clubeId, aluno_id: alunoId } },
    })
    if (!member) throw new NotFoundError('Membro do clube')
    if (member.role === ClubMemberRole.CRIADOR) {
      throw new ValidationError('O criador não pode sair do clube. Transfira a propriedade ou exclua o clube.')
    }

    await prisma.socialClubMember.delete({
      where: { clube_id_aluno_id: { clube_id: clubeId, aluno_id: alunoId } },
    })

    return { message: 'Saiu do clube com sucesso.' }
  }

  static async listarMembros(clubeId: string) {
    const membros = await prisma.socialClubMember.findMany({
      where: { clube_id: clubeId },
      orderBy: { xp_semana: 'desc' },
    })

    const alunos = await prisma.aluno.findMany({
      where: { id: { in: membros.map((m) => m.aluno_id) } },
      include: { usuario: { select: { nome: true, foto_url: true } } },
    })

    return membros.map((m) => {
      const a = alunos.find((al) => al.id === m.aluno_id)
      return {
        alunoId: m.aluno_id,
        nome: a?.usuario.nome ?? '',
        fotoUrl: a?.usuario.foto_url ?? null,
        xpSemana: m.xp_semana,
        role: m.role,
      }
    })
  }

  static async feed(clubeId: string, alunoId: string, cursor?: string, limit = 20) {
    const member = await prisma.socialClubMember.findUnique({
      where: { clube_id_aluno_id: { clube_id: clubeId, aluno_id: alunoId } },
    })
    if (!member) throw new ForbiddenError('Você não é membro deste clube.')

    const cursorWhere: Record<string, unknown> = {}
    if (cursor) {
      const [cursorDate, cursorId] = cursor.split('|')
      cursorWhere.OR = [
        { criado_em: { lt: new Date(cursorDate) } },
        { criado_em: { equals: new Date(cursorDate) }, id: { lt: cursorId } },
      ]
    }

    const posts = await prisma.socialPost.findMany({
      where: {
        ...cursorWhere,
        clube_id: clubeId,
        visibilidade: { not: 'PRIVADO' },
      },
      orderBy: [{ criado_em: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    })

    const hasMore = posts.length > limit
    const items = hasMore ? posts.slice(0, limit) : posts
    const lastPost = items[items.length - 1]
    const nextCursor = hasMore && lastPost ? `${lastPost.criado_em.toISOString()}|${lastPost.id}` : null

    return { items, nextCursor }
  }
}
