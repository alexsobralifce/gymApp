import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import { ShieldIcon } from '../../components/icons/Icon'
import type { PrivacidadeSettings } from '../../types/api'

export default function Privacidade() {
  const [settings, setSettings] = useState<PrivacidadeSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    api.getPrivacidade()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    try {
      await api.updatePrivacidade({
        visibilidade_padrao: settings.visibilidade_padrao,
        permite_busca_email: settings.permite_busca_email,
      })
      setFeedback('Configuracoes salvas!')
      setTimeout(() => setFeedback(null), 2500)
    } catch {
      setFeedback('Erro ao salvar.')
      setTimeout(() => setFeedback(null), 2500)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-xl mx-auto w-full">
        <p className="text-sm text-text-muted">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <ShieldIcon className="h-6 w-6 text-primary" />
        <h1 className="text-lg font-bold text-text">Privacidade</h1>
      </div>

      {feedback && (
        <div className="rounded-xl bg-success/10 border border-success/20 p-3 text-sm text-success text-center animate-slide-up">
          {feedback}
        </div>
      )}

      {/* Visibilidade */}
      <div className="rounded-2xl bg-surface-card border border-surface-input p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text mb-1">Visibilidade padrao dos posts</h3>
          <p className="text-xs text-text-muted mb-3">Controla quem pode ver seus treinos no mural.</p>
          <div className="space-y-2">
            {[
              { value: 'PUBLICO', label: 'Publico', desc: 'Qualquer aluno pode ver' },
              { value: 'AMIGOS', label: 'Amigos', desc: 'Apenas seus amigos veem' },
              { value: 'PRIVADO', label: 'Privado', desc: 'Ninguem ve — voce fica invisivel' },
            ].map(({ value, label, desc }) => (
              <label
                key={value}
                className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all ${
                  settings?.visibilidade_padrao === value ? 'border-primary bg-primary/5' : 'border-surface-input hover:border-text-muted'
                }`}
              >
                <input
                  type="radio"
                  name="visibilidade"
                  value={value}
checked={settings?.visibilidade_padrao === value}
                    onChange={() => setSettings((s) => s ? { ...s, visibilidade_padrao: value as PrivacidadeSettings['visibilidade_padrao'] } : null)}
                  className="accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-text">{label}</p>
                  <p className="text-xs text-text-muted">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Busca por email */}
        <div className="pt-4 border-t border-surface-input">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text">Permitir busca por email</h3>
              <p className="text-xs text-text-muted">Outros alunos podem te encontrar pelo email para solicitar amizade.</p>
            </div>
            <button
              onClick={() => setSettings((s) => s ? { ...s, permite_busca_email: !s.permite_busca_email } : null)}
              className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                settings?.permite_busca_email ? 'bg-primary' : 'bg-surface-input'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  settings?.permite_busca_email ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl gradient-primary py-3 text-sm font-bold text-white hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
      >
        {saving ? 'Salvando...' : 'Salvar Configuracoes'}
      </button>
    </div>
  )
}
