import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Remove seed_prof Professors Script Verification', () => {
  const scriptPath = path.resolve(__dirname, '../../prisma/remove-seed-professors.ts')
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8')

  it('should define removeSeedProfessors targeting email prefix seed_prof', () => {
    expect(scriptContent).toContain("prefix = 'seed_prof'")
    expect(scriptContent).toContain('Role.PROFESSOR')
    expect(scriptContent).toContain('startsWith: prefix')
  })

  it('should handle student dissociation by setting professor_id to null', () => {
    expect(scriptContent).toContain('tx.aluno.updateMany')
    expect(scriptContent).toContain('professor_id: null')
  })

  it('should delete ProfessorAcademia, Professor, and Usuario records in transaction', () => {
    expect(scriptContent).toContain('tx.professorAcademia.deleteMany')
    expect(scriptContent).toContain('tx.professor.deleteMany')
    expect(scriptContent).toContain('tx.usuario.deleteMany')
  })
})
