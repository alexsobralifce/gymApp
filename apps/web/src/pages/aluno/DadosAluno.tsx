import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import type { PerfilAluno, Academia } from '../../types/api'
import { SkeletonCard } from '../../components/ui/LoadingSpinner'
import ConfirmModal from '../../components/ui/ConfirmModal'
import {
  UserCircleIcon,
  RulerIcon,
  Building2Icon,
  KeyIcon,
  ShieldIcon,
} from '../../components/icons/Icon'

function calcularIMC(pesoKg: number | null | undefined, alturaCm: number | null | undefined): number | null {
  if (!pesoKg || !alturaCm || alturaCm <= 0) return null
  return parseFloat((pesoKg / ((alturaCm / 100) ** 2)).toFixed(1))
}

function classificarIMC(imc: number): { label: string; cor: string } {
  if (imc < 18.5) return { label: 'Abaixo do peso', cor: 'text-blue-400 border-blue-500/30 bg-blue-500/10' }
  if (imc < 25) return { label: 'Peso ideal', cor: 'text-green-400 border-green-500/30 bg-green-500/10' }
  if (imc < 30) return { label: 'Sobrepeso', cor: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' }
  if (imc < 35) return { label: 'Obesidade grau I', cor: 'text-orange-400 border-orange-500/30 bg-orange-500/10' }
  return { label: 'Obesidade grau II/III', cor: 'text-red-400 border-red-500/30 bg-red-500/10' }
}

export default function DadosAluno() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const fetchUser = useAuthStore((s) => s.fetchUser)

  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<PerfilAluno | null>(null)
  const [academias, setAcademias] = useState<Academia[]>([])

  // Formulário 1: Dados Pessoais
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [salvandoPessoais, setSalvandoPessoais] = useState(false)
  const [feedbackPessoais, setFeedbackPessoais] = useState<string | null>(null)

  // Formulário 2: Dados Físicos
  const [pesoKg, setPesoKg] = useState<string>('')
  const [alturaCm, setAlturaCm] = useState<string>('')
  const [dataNascimento, setDataNascimento] = useState<string>('')
  const [sexo, setSexo] = useState<'MASCULINO' | 'FEMININO' | ''>('')
  const [salvandoFisicos, setSalvandoFisicos] = useState(false)
  const [feedbackFisicos, setFeedbackFisicos] = useState<string | null>(null)

  // Modais de Vínculo
  const [trocandoAcademia, setTrocandoAcademia] = useState(false)
  const [novaAcademiaId, setNovaAcademiaId] = useState('')
  const [salvandoAcademia, setSalvandoAcademia] = useState(false)
  const [modalSairAcademia, setModalSairAcademia] = useState(false)

  const [modalAutogestao, setModalAutogestao] = useState(false)
  const [salvandoProfessor, setSalvandoProfessor] = useState(false)

  const [feedbackGeral, setFeedbackGeral] = useState<string | null>(null)

  useEffect(() => {
    async function carregar() {
      try {
        const [pData, aData] = await Promise.all([
          api.getPerfilAluno(),
          api.getAcademias().catch(() => [] as Academia[]),
        ])
        setPerfil(pData)
        setAcademias(aData.filter((a) => a.status === 'ATIVO'))

        // Preencher formulários
        const usuarioNome = pData.usuario?.nome || user?.nome || ''
        const usuarioTel = pData.usuario?.telefone || user?.telefone || ''
        setNome(usuarioNome)
        setTelefone(usuarioTel)

        if (pData.peso_kg) setPesoKg(String(pData.peso_kg))
        if (pData.altura_cm) setAlturaCm(String(pData.altura_cm))
        if (pData.data_nascimento) setDataNascimento(pData.data_nascimento.slice(0, 10))
        if (pData.sexo) setSexo(pData.sexo)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [user])

  // IMC em tempo real
  const pNum = parseFloat(pesoKg)
  const aNum = parseFloat(alturaCm)
  const imcCalculado = calcularIMC(isNaN(pNum) ? null : pNum, isNaN(aNum) ? null : aNum)
  const imcBadge = imcCalculado ? classificarIMC(imcCalculado) : null

  async function handleSalvarPessoais(e: React.FormEvent) {
    e.preventDefault()
    setFeedbackPessoais(null)
    setSalvandoPessoais(true)
    try {
      await api.updateMe({ nome, telefone })
      await fetchUser()
      setFeedbackPessoais('Informações pessoais atualizadas com sucesso!')
      setTimeout(() => setFeedbackPessoais(null), 3000)
    } catch {
      setFeedbackPessoais('Erro ao atualizar informações pessoais.')
    } finally {
      setSalvandoPessoais(false)
    }
  }

  async function handleSalvarFisicos(e: React.FormEvent) {
    e.preventDefault()
    setFeedbackFisicos(null)
    setSalvandoFisicos(true)
    try {
      const updated = await api.criarPerfilAluno({
        dataNascimento: dataNascimento || undefined,
        pesoKg: pNum || undefined,
        alturaCm: aNum || undefined,
        sexo: sexo || undefined,
      }) as PerfilAluno
      setPerfil(updated)
      setFeedbackFisicos('Dados físicos atualizados!')
      setTimeout(() => setFeedbackFisicos(null), 3000)
    } catch {
      setFeedbackFisicos('Erro ao salvar dados físicos.')
    } finally {
      setSalvandoFisicos(false)
    }
  }

  async function handleTrocarAcademia() {
    if (!novaAcademiaId) return
    setSalvandoAcademia(true)
    try {
      await api.vincularAcademiaAluno(novaAcademiaId)
      const pData = await api.getPerfilAluno()
      setPerfil(pData)
      setTrocandoAcademia(false)
      setFeedbackGeral('Academia atualizada com sucesso!')
      setTimeout(() => setFeedbackGeral(null), 3000)
    } catch {
      setFeedbackGeral('Erro ao trocar de academia.')
    } finally {
      setSalvandoAcademia(false)
    }
  }

  async function handleSairAcademia() {
    try {
      await api.desvincularAcademiaAluno()
      const pData = await api.getPerfilAluno()
      setPerfil(pData)
      setModalSairAcademia(false)
      setFeedbackGeral('Você foi desvinculado da academia.')
      setTimeout(() => setFeedbackGeral(null), 3000)
    } catch {
      setFeedbackGeral('Erro ao desvincular da academia.')
    }
  }

  async function handleConfirmarAutogestao() {
    setSalvandoProfessor(true)
    try {
      const pData = await api.atualizarProfessorAluno(null)
      setPerfil(pData)
      setModalAutogestao(false)
      setFeedbackGeral('Você agora está no modo autogestão! Seus treinos foram mantidos.')
      setTimeout(() => setFeedbackGeral(null), 4000)
    } catch {
      setFeedbackGeral('Erro ao mudar para autogestão.')
    } finally {
      setSalvandoProfessor(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-xl mx-auto space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-xl mx-auto w-full space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-text">Dados do Aluno</h1>
        <p className="text-xs text-text-muted">Gerencie suas informações cadastrais, corporais e vínculos</p>
      </div>

      {feedbackGeral && (
        <div className={`rounded-xl p-3 text-sm text-center font-medium ${
          feedbackGeral.includes('Erro') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-success/10 text-success border border-success/20'
        }`}>
          {feedbackGeral}
        </div>
      )}

      {/* 1. Dados Pessoais */}
      <div className="bg-surface-card border border-surface-input rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-surface-input pb-3">
          <UserCircleIcon className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">Dados Pessoais</h2>
        </div>

        {feedbackPessoais && (
          <div className={`rounded-xl p-2.5 text-xs text-center font-medium ${
            feedbackPessoais.includes('Erro') ? 'bg-red-500/10 text-red-400' : 'bg-success/10 text-success'
          }`}>
            {feedbackPessoais}
          </div>
        )}

        <form onSubmit={handleSalvarPessoais} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Nome Completo</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-xl border border-surface-input bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">E-mail (Cadastro)</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full rounded-xl border border-surface-input bg-surface/50 px-3.5 py-2.5 text-sm text-text-muted cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Telefone / WhatsApp</label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full rounded-xl border border-surface-input bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
              placeholder="(11) 99999-9999"
            />
          </div>

          <button
            type="submit"
            disabled={salvandoPessoais}
            className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {salvandoPessoais ? 'Salvando...' : 'Salvar Informações Pessoais'}
          </button>
        </form>
      </div>

      {/* 2. Perfil Físico & IMC */}
      <div className="bg-surface-card border border-surface-input rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-surface-input pb-3">
          <RulerIcon className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">Dados Físicos & IMC</h2>
        </div>

        {feedbackFisicos && (
          <div className={`rounded-xl p-2.5 text-xs text-center font-medium ${
            feedbackFisicos.includes('Erro') ? 'bg-red-500/10 text-red-400' : 'bg-success/10 text-success'
          }`}>
            {feedbackFisicos}
          </div>
        )}

        <form onSubmit={handleSalvarFisicos} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                min="20"
                max="300"
                value={pesoKg}
                onChange={(e) => setPesoKg(e.target.value)}
                className="w-full rounded-xl border border-surface-input bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
                placeholder="ex: 75.5"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Altura (cm)</label>
              <input
                type="number"
                min="50"
                max="250"
                value={alturaCm}
                onChange={(e) => setAlturaCm(e.target.value)}
                className="w-full rounded-xl border border-surface-input bg-surface px-3.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none"
                placeholder="ex: 175"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Nascimento</label>
              <input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full rounded-xl border border-surface-input bg-surface px-3 py-2 text-xs text-text focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Sexo Biológico</label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value as any)}
                className="w-full rounded-xl border border-surface-input bg-surface px-3 py-2.5 text-xs text-text focus:border-primary focus:outline-none"
              >
                <option value="">Selecione</option>
                <option value="MASCULINO">Masculino</option>
                <option value="FEMININO">Feminino</option>
              </select>
            </div>
          </div>

          {/* IMC Card em tempo real */}
          {imcCalculado !== null && imcBadge && (
            <div className={`rounded-xl border p-3 flex items-center justify-between ${imcBadge.cor}`}>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">IMC Calculado</p>
                <p className="text-xl font-black">{imcCalculado}</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-black/20">
                {imcBadge.label}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={salvandoFisicos}
            className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-white shadow-md hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {salvandoFisicos ? 'Salvando...' : 'Salvar Dados Físicos'}
          </button>
        </form>
      </div>

      {/* 3. Vínculos: Academia e Professor */}
      <div className="bg-surface-card border border-surface-input rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-surface-input pb-3">
          <Building2Icon className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-text uppercase tracking-wider">Academia & Professor</h2>
        </div>

        {/* Academia */}
        <div className="rounded-xl bg-surface p-3.5 border border-surface-input space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase">Academia Atual</span>
            {perfil?.academia ? (
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                {perfil.academia.nome}
              </span>
            ) : (
              <span className="text-xs font-semibold text-text-muted bg-surface-input px-2 py-0.5 rounded-full">
                Sem academia
              </span>
            )}
          </div>

          {trocandoAcademia ? (
            <div className="pt-2 space-y-2">
              <select
                value={novaAcademiaId}
                onChange={(e) => setNovaAcademiaId(e.target.value)}
                className="w-full rounded-xl border border-surface-input bg-surface-card px-3 py-2 text-xs text-text focus:border-primary focus:outline-none"
              >
                <option value="">Selecione uma academia...</option>
                {academias.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleTrocarAcademia}
                  disabled={salvandoAcademia || !novaAcademiaId}
                  className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-bold text-white hover:brightness-110 transition-all disabled:opacity-40"
                >
                  {salvandoAcademia ? 'Salvando...' : 'Confirmar Troca'}
                </button>
                <button
                  type="button"
                  onClick={() => setTrocandoAcademia(false)}
                  className="rounded-lg bg-surface-input px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTrocandoAcademia(true)}
                className="flex-1 rounded-lg border border-surface-input bg-surface-card py-1.5 text-xs font-semibold text-text hover:bg-surface-input transition-all"
              >
                Trocar Academia
              </button>
              {perfil?.academia && (
                <button
                  type="button"
                  onClick={() => setModalSairAcademia(true)}
                  className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-all"
                >
                  Sair
                </button>
              )}
            </div>
          )}
        </div>

        {/* Professor / Autogestão */}
        <div className="rounded-xl bg-surface p-3.5 border border-surface-input space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted uppercase">Treinador / Modo</span>
            {perfil?.professor ? (
              <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                {perfil.professor.usuario?.nome || 'Com Professor'}
              </span>
            ) : (
              <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                Autogestão Ativa
              </span>
            )}
          </div>

          <p className="text-[11px] text-text-muted leading-relaxed">
            {perfil?.professor
              ? 'Seu professor envia fichas personalizadas, mas você também pode criar e editar seus treinos.'
              : 'Você está no modo autogestão. Você cria e gerencia 100% das suas fichas de treino.'}
          </p>

          {perfil?.professor && (
            <button
              type="button"
              onClick={() => setModalAutogestao(true)}
              className="mt-1 w-full rounded-lg border border-yellow-500/20 bg-yellow-500/5 py-1.5 text-xs font-semibold text-yellow-400 hover:bg-yellow-500/10 transition-all cursor-pointer"
            >
              Mudar para Autogestão (Remover Professor)
            </button>
          )}
        </div>
      </div>

      {/* 4. Segurança e Privacidade */}
      <div className="bg-surface-card border border-surface-input rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Conta & Privacidade</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate('/alterar-senha')}
            className="flex items-center justify-center gap-2 rounded-xl border border-surface-input bg-surface p-3 text-xs font-semibold text-text hover:bg-surface-input transition-all cursor-pointer"
          >
            <KeyIcon className="h-4 w-4 text-text-muted" />
            Alterar Senha
          </button>
          <button
            type="button"
            onClick={() => navigate('/privacidade')}
            className="flex items-center justify-center gap-2 rounded-xl border border-surface-input bg-surface p-3 text-xs font-semibold text-text hover:bg-surface-input transition-all cursor-pointer"
          >
            <ShieldIcon className="h-4 w-4 text-text-muted" />
            Privacidade
          </button>
        </div>
      </div>

      {/* Modal Confirmação: Sair da Academia */}
      <ConfirmModal
        open={modalSairAcademia}
        title="Sair da Academia?"
        message="Você será desvinculado da academia atual. Poderá se vincular a outra a qualquer momento."
        onConfirm={handleSairAcademia}
        onCancel={() => setModalSairAcademia(false)}
      />

      {/* Modal Confirmação: Mudar para Autogestão */}
      <ConfirmModal
        open={modalAutogestao}
        title="Mudar para Autogestão?"
        message="Você desvinculará seu professor atual. Todos os treinos que você possui serão mantidos na sua conta para que você possa continuar usando e editando."
        onConfirm={handleConfirmarAutogestao}
        onCancel={() => setModalAutogestao(false)}
        loading={salvandoProfessor}
      />
    </div>
  )
}
