import { useState, useEffect } from 'react'
import { api } from '../../api/client'
import type { Exercicio } from '../../types/api'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import FormField from '../../components/ui/FormField'

export default function ProfessorCriarExercicio() {
  const [exercicios, setExercicios] = useState<Exercicio[]>([])
  const [loading, setLoading] = useState(true)

  const [nome, setNome] = useState('')
  const [maquina, setMaquina] = useState('')
  const [dica, setDica] = useState('')
  const [imagemUrl, setImagemUrl] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    api.getExercicios().then(setExercicios).finally(() => setLoading(false))
  }, [])

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    const ex = await api.criarExercicio({
      nome,
      maquina: maquina || undefined,
      dica: dica || undefined,
      imagemUrl: imagemUrl || undefined,
    })
    setExercicios([ex, ...exercicios])
    setNome('')
    setMaquina('')
    setDica('')
    setImagemUrl('')
    setFeedback('Exercício criado!')
    setTimeout(() => setFeedback(null), 2000)
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="mb-6 text-xl font-bold text-text">Biblioteca de Exercícios</h1>

      {/* Formulário de criação */}
      <div className="mb-6 rounded-lg bg-surface-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-muted">Novo Exercício</h2>
        {feedback && <p className="mb-2 text-sm text-success">{feedback}</p>}
        <form onSubmit={handleCriar} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Nome do exercício" htmlFor="ex-nome">
            <Input id="ex-nome" type="text" placeholder="Nome do exercício" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </FormField>
          <FormField label="Máquina (opcional)" htmlFor="ex-maquina">
            <Input id="ex-maquina" type="text" placeholder="Máquina (opcional)" value={maquina} onChange={(e) => setMaquina(e.target.value)} />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="Dica de execução (opcional)" htmlFor="ex-dica">
              <Textarea id="ex-dica" placeholder="Dica de execução (opcional)" value={dica} onChange={(e) => setDica(e.target.value)} rows={2} />
            </FormField>
          </div>
          <div className="md:col-span-2">
            <FormField label="URL da imagem (opcional)" htmlFor="ex-imagem">
              <Input id="ex-imagem" type="url" placeholder="URL da imagem (opcional)" value={imagemUrl} onChange={(e) => setImagemUrl(e.target.value)} />
            </FormField>
          </div>
          <button type="submit" disabled={!nome}
            className="md:col-span-2 w-full rounded bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-40">Criar</button>
        </form>
      </div>

      {/* Lista */}
      <h2 className="mb-3 text-sm font-semibold text-text-muted">{exercicios.length} exercícios</h2>
      {loading ? (
        <p className="text-text-muted text-sm">Carregando...</p>
      ) : (
        <div className="space-y-2">
          {exercicios.map((e) => (
            <div key={e.id} className="rounded bg-surface-card p-3">
              <div className="flex items-start gap-3">
                {e.imagem_url && (
                  <img src={e.imagem_url} alt={e.nome} className="h-12 w-12 rounded object-cover" />
                )}
                <div>
                  <h3 className="text-sm font-medium text-text">{e.nome}</h3>
                  {e.maquina && <p className="text-xs text-text-muted">{e.maquina}</p>}
                  {e.dica && <p className="mt-1 text-xs text-text-muted italic">{e.dica}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
