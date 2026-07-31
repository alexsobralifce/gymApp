import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Remove seed_aluno Students Script Verification', () => {
  const scriptPath = path.resolve(__dirname, '../../prisma/remove-seed-alunos.ts')
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8')

  const railwayStartPath = path.resolve(__dirname, '../../railway-start.sh')
  const railwayStartContent = fs.readFileSync(railwayStartPath, 'utf-8')

  it('should define removeSeedAlunos targeting email prefix seed_aluno', () => {
    expect(scriptContent).toContain("prefix = 'seed_aluno'")
    expect(scriptContent).toContain('Role.ALUNO')
    expect(scriptContent).toContain('startsWith: prefix')
  })

  it('should handle cascade deletion of workouts, social records, and student profiles', () => {
    expect(scriptContent).toContain('tx.execucaoExercicio.deleteMany')
    expect(scriptContent).toContain('tx.treino.deleteMany')
    expect(scriptContent).toContain('tx.medidaCorporal.deleteMany')
    expect(scriptContent).toContain('tx.socialPost.deleteMany')
    expect(scriptContent).toContain('tx.aluno.deleteMany')
    expect(scriptContent).toContain('tx.usuario.deleteMany')
  })

  it('should execute remove-seed-alunos.ts in railway-start.sh', () => {
    expect(railwayStartContent).toContain('npx tsx prisma/remove-seed-alunos.ts')
  })
})
