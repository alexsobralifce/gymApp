import { describe, it, expect } from 'vitest'
import crypto from 'node:crypto'
import { montarPayloadIndexNow, lerContaDeServico, montarJwt, propriedade } from '../scripts/indexacaoLib.mjs'

describe('IndexNow', () => {
  it('monta URLs absolutas e o local da chave', () => {
    const p = montarPayloadIndexNow('https://exemplo.com/', 'abc', ['/', '/planos'])
    expect(p).toEqual({
      host: 'exemplo.com',
      key: 'abc',
      keyLocation: 'https://exemplo.com/abc.txt',
      urlList: ['https://exemplo.com', 'https://exemplo.com/planos'],
    })
  })
})

describe('conta de serviço Google', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
  const conta = { client_email: 'robo@proj.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string }

  it('aceita JSON puro e base64', () => {
    const json = JSON.stringify(conta)
    expect(lerContaDeServico(json)?.client_email).toBe(conta.client_email)
    expect(lerContaDeServico(Buffer.from(json).toString('base64'))?.client_email).toBe(conta.client_email)
    expect(lerContaDeServico(undefined)).toBeNull()
  })

  it('gera JWT RS256 com assinatura válida e escopo', () => {
    const jwt = montarJwt(conta, 'escopo-x', 1000)
    const [cab, corpo, assinatura] = jwt.split('.')
    const claims = JSON.parse(Buffer.from(corpo, 'base64url').toString())
    expect(claims).toMatchObject({ iss: conta.client_email, scope: 'escopo-x', iat: 1000, exp: 4600 })
    const ok = crypto.createVerify('RSA-SHA256').update(`${cab}.${corpo}`).verify(publicKey, assinatura, 'base64url')
    expect(ok).toBe(true)
  })

  it('propriedade termina com barra', () => {
    expect(propriedade('https://exemplo.com')).toBe('https://exemplo.com/')
  })
})
