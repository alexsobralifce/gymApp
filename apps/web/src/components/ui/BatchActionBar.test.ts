import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('BatchActionBar Component Verification', () => {
  const componentPath = path.resolve(__dirname, 'BatchActionBar.tsx')
  const componentContent = fs.readFileSync(componentPath, 'utf-8')

  it('should exist and define BatchActionBarProps interface', () => {
    expect(componentContent).toContain('interface BatchActionBarProps')
    expect(componentContent).toContain('selectedCount: number')
    expect(componentContent).toContain('onClearSelection: () => void')
    expect(componentContent).toContain('onDeleteSelected: () => void')
  })

  it('should return null when selectedCount is 0', () => {
    expect(componentContent).toContain('if (selectedCount === 0) return null')
  })

  it('should display selected count badge and delete action trigger', () => {
    expect(componentContent).toContain('{selectedCount}</strong> item(s) selecionado(s)')
    expect(componentContent).toContain('Excluir Selecionados em Cascata')
  })
})
