import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Feed Social Navigation & Routes Verification', () => {
  const appTsxPath = path.resolve(__dirname, 'App.tsx')
  const appTsxContent = fs.readFileSync(appTsxPath, 'utf-8')

  const appShellPath = path.resolve(__dirname, 'components/layout/AppShell.tsx')
  const appShellContent = fs.readFileSync(appShellPath, 'utf-8')

  const dashboardPath = path.resolve(__dirname, 'pages/aluno/Dashboard.tsx')
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8')

  const muralPath = path.resolve(__dirname, 'pages/aluno/Mural.tsx')
  const muralContent = fs.readFileSync(muralPath, 'utf-8')

  it('should define route /feed and redirect /mural to /feed in App.tsx', () => {
    expect(appTsxContent).toContain('<Route path="feed" element={<AlunoMural />} />')
    expect(appTsxContent).toContain('<Route path="mural" element={<Navigate to="/feed" replace />} />')
  })

  it('should configure Feed Social nav items and bottom tabs in AppShell.tsx', () => {
    expect(appShellContent).toContain("{ to: '/feed', label: 'Feed Social', icon: <MessageCircleIcon className=\"h-5 w-5\" /> }")
    expect(appShellContent).toContain("{ to: '/feed', label: 'Feed Social', icon: MessageCircleIcon }")
  })

  it('should link to /feed with label Feed Social in Dashboard.tsx', () => {
    expect(dashboardContent).toContain("onClick={() => navigate('/feed')}")
    expect(dashboardContent).toContain('Feed Social')
  })

  it('should render page title Feed Social in Mural.tsx', () => {
    expect(muralContent).toContain('<h1 className="text-lg font-bold text-text">Feed Social</h1>')
  })
})
