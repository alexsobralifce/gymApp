import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Set ROOT User Script Verification', () => {
  const scriptPath = path.resolve(__dirname, '../../prisma/set-root-user.ts')
  const scriptContent = fs.readFileSync(scriptPath, 'utf-8')

  const seedPath = path.resolve(__dirname, '../../prisma/seed.ts')
  const seedContent = fs.readFileSync(seedPath, 'utf-8')

  const railwayStartPath = path.resolve(__dirname, '../../railway-start.sh')
  const railwayStartContent = fs.readFileSync(railwayStartPath, 'utf-8')

  it('should define setRootUser for target email alexandresobral2004@gmail.com', () => {
    expect(scriptContent).toContain('alexandresobral2004@gmail.com')
    expect(scriptContent).toContain('Role.ROOT')
    expect(scriptContent).toContain('email_verified: true')
    expect(scriptContent).toContain('ativo: true')
  })

  it('should include alexandresobral2004@gmail.com in seed.ts', () => {
    expect(seedContent).toContain('alexandresobral2004@gmail.com')
    expect(seedContent).toContain('Role.ROOT')
  })

  it('should execute set-root-user.ts in railway-start.sh', () => {
    expect(railwayStartContent).toContain('npx tsx prisma/set-root-user.ts')
  })
})
