import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('useNotifications — permissão só no gesto', () => {
  const src = fs.readFileSync(path.resolve(__dirname, 'useNotifications.ts'), 'utf-8')

  it('não pede permissão automaticamente no mount', () => {
    // requestPermission deve aparecer APENAS dentro de activatePush
    const mountEffect = src.slice(src.indexOf('export function useNotifications'))
    expect(mountEffect).not.toContain('requestPermission()')
  })

  it('activatePush pede permissão e assina', () => {
    expect(src).toContain('Notification.requestPermission()')
    expect(src).toContain('export async function activatePush')
  })

  it('usa debugLog para diagnóstico', () => {
    expect(src).toContain("from '../lib/debug'")
  })
})
