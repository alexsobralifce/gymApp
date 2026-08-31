import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { useNotifications } from './hooks/useNotifications'
import { useCapacitorTheme } from './hooks/useCapacitorTheme'
// DESATIVADO: cobrança — acesso livre. Reativar: descomentar.
// import { useSubscriptionStore } from './stores/subscription'
import AppShell from './components/layout/AppShell'
import LoadingSpinner from './components/ui/LoadingSpinner'
import { PWAInstallPrompt } from './components/ui/PWAInstallPrompt'
import NotificationPrompt from './components/ui/NotificationPrompt'
import { OnboardingPermissionsModal } from './components/ui/OnboardingPermissionsModal'
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import PoliticaPrivacidade from './pages/PoliticaPrivacidade'
import GoogleCallback from './pages/auth/GoogleCallback'
import AlunoDashboard from './pages/aluno/Dashboard'
import AlunoTreinoInicio from './pages/aluno/TreinoInicio'
import AlunoTreinoExecucao from './pages/aluno/TreinoExecucao'
import AlunoTreinoConclusao from './pages/aluno/TreinoConclusao'
import AlunoMedidas from './pages/aluno/Medidas'
import AlunoEvolucao from './pages/aluno/Evolucao'
import HistoricoExercicio from './pages/aluno/HistoricoExercicio'
import ProfessorDashboard from './pages/professor/Dashboard'
import ProfessorAlunoCorrelacoes from './pages/professor/AlunoCorrelacoes'
import ProfessorCriarTreino from './pages/professor/CriarTreino'
import ProfessorTreinos from './pages/professor/Treinos'
import ProfessorCriarExercicio from './pages/professor/CriarExercicio'
import ProfessorAcademias from './pages/professor/Academias'
import ProfessorVincularAluno from './pages/professor/VincularAluno'
import ProfessorFichas from './pages/professor/Fichas'
import RootPainel from './pages/root/Painel'
import RootVinculos from './pages/root/Vinculos'
import RootUsuarios from './pages/root/Usuarios'
import RootSocial from './pages/root/Social'
import RootAvaliacoesSistema from './pages/root/AvaliacoesSistema'
import AcademiaDashboard from './pages/academia/Dashboard'
import AcademiaProfessores from './pages/academia/Professores'
import AcademiaAlunos from './pages/academia/Alunos'
import AcademiaCriarTreino from './pages/academia/CriarTreinoAcademia'
import AcademiaTreinos from './pages/academia/Treinos'
import AlunoMeusTreinos from './pages/aluno/MeusTreinos'
import AlunoCriarTreino from './pages/aluno/CriarTreinoAluno'
import TreinoIA from './pages/aluno/TreinoIA'
import AlunoDados from './pages/aluno/DadosAluno'
import AlunoWearables from './pages/aluno/Wearables'
import BibliotecaPlanos from './pages/aluno/BibliotecaPlanos'
import AlunoMural from './pages/aluno/Mural'
import AlunoAmizades from './pages/aluno/Amizades'
import AlunoPrivacidade from './pages/aluno/Privacidade'
import AlunoPreferenciasNotificacao from './pages/aluno/PreferenciasNotificacao'
import AlunoClubes from './pages/aluno/Clubes'
import Parceiros from './pages/aluno/Parceiros'
import WelcomeCards from './pages/aluno/WelcomeCards'
import Noticias from './pages/aluno/Noticias'
import ClubeFeed from './pages/aluno/ClubeFeed'
import AlterarSenha from './pages/auth/AlterarSenha'
import Avaliacoes from './pages/avaliacoes/Avaliacoes'
import Documentacao from './pages/Documentacao'
// DESATIVADO: cobrança — acesso livre. Reativar: descomentar.
// import Paywall from './pages/paywall/Paywall'
// import Beneficios from './pages/aluno/Beneficios'
// import PremiumWrapper from './components/ui/PremiumWrapper'

import { EndorfinappIcon } from './components/branding'

export default function App() {
  useNotifications()
  useCapacitorTheme()
  const { user, fetchUser } = useAuthStore()
  // DESATIVADO: cobrança — acesso livre. Reativar: descomentar.
  // const fetchLicenca = useSubscriptionStore((s) => s.fetchLicenca)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetchUser().finally(() => setReady(true))
  }, [])

  // DESATIVADO: cobrança — acesso livre. Reativar: descomentar.
  /* useEffect(() => {
    if (user) {
      fetchLicenca()
    }
  }, [user]) */

  if (!ready) return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <EndorfinappIcon size={48} />
        <LoadingSpinner size="md" />
        <p className="text-sm text-text-muted">Carregando...</p>
      </div>
    </div>
  )

  return (
    <>
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />

      {!user && <Route index element={<Landing />} />}

      {user?.role === 'ALUNO' && (
        <>
          <Route path="welcome" element={<WelcomeCards />} />
          {/* DESATIVADO: cobrança — acesso livre. Reativar: descomentar. */}
          {/* <Route path="paywall" element={<Paywall />} /> */}
          {/* <Route path="beneficios" element={<Beneficios />} /> */}
          <Route element={<AppShell />}>
          <Route index element={<AlunoDashboard />} />
          <Route path="meus-treinos" element={<AlunoMeusTreinos />} />
          <Route path="biblioteca-planos" element={<BibliotecaPlanos />} />
          {/* DESATIVADO: cobrança — acesso livre. Reativar: descomentar. */}
          {/* <Route path="biblioteca-planos" element={<PremiumWrapper feature="PLANOS" featureName="Biblioteca de Planos"><BibliotecaPlanos /></PremiumWrapper>} /> */}
          <Route path="dados" element={<AlunoDados />} />
          <Route path="wearables" element={<AlunoWearables />} />
          <Route path="treino/novo" element={<AlunoCriarTreino />} />
          <Route path="treino/:id/editar" element={<AlunoCriarTreino />} />
          <Route path="treino/ia" element={<TreinoIA />} />
          {/* DESATIVADO: cobrança — acesso livre. Reativar: descomentar. */}
          {/* <Route path="treino/ia" element={<PremiumWrapper feature="IA" featureName="Treino por IA"><TreinoIA /></PremiumWrapper>} /> */}
          <Route path="treino/:id/inicio" element={<AlunoTreinoInicio />} />
          <Route path="treino/:id/execucao" element={<AlunoTreinoExecucao />} />
          <Route path="treino/:id/conclusao" element={<AlunoTreinoConclusao />} />
          <Route path="documentacao" element={<Documentacao />} />
          <Route path="medidas" element={<AlunoMedidas />} />
          <Route path="evolucao" element={<AlunoEvolucao />} />
          {/* DESATIVADO: cobrança — acesso livre. Reativar: descomentar. */}
          {/* <Route path="evolucao" element={<PremiumWrapper feature="CORRELACOES" featureName="Evolução Avançada"><AlunoEvolucao /></PremiumWrapper>} /> */}
          <Route path="exercicios/:exercicioId/historico" element={<HistoricoExercicio />} />
          <Route path="feed" element={<AlunoMural />} />
          <Route path="mural" element={<Navigate to="/feed" replace />} />
          <Route path="amizades" element={<AlunoAmizades />} />
          <Route path="privacidade" element={<AlunoPrivacidade />} />
          <Route path="notificacoes/preferencias" element={<AlunoPreferenciasNotificacao />} />
          <Route path="clubes" element={<AlunoClubes />} />
          {/* DESATIVADO: cobrança — acesso livre. Reativar: descomentar. */}
          {/* <Route path="clubes" element={<PremiumWrapper feature="CLUBES" featureName="Clubes"><AlunoClubes /></PremiumWrapper>} /> */}
          <Route path="clubes/:id" element={<ClubeFeed />} />
          <Route path="parceiros" element={<Parceiros />} />
          <Route path="noticias" element={<Noticias />} />
          <Route path="alterar-senha" element={<AlterarSenha />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
        </>
      )}

      {user?.role === 'PROFESSOR' && (
        <>
          {/* DESATIVADO: cobrança — acesso livre. Reativar: descomentar. */}
          {/* <Route path="paywall" element={<Paywall />} /> */}
          <Route element={<AppShell />}>
          <Route index element={<ProfessorDashboard />} />
          <Route path="treinos" element={<ProfessorTreinos />} />
          <Route path="alunos/:alunoId/evolucao" element={<ProfessorAlunoCorrelacoes />} />
          <Route path="documentacao" element={<Documentacao />} />
          <Route path="alunos/:alunoId/correlacoes" element={<ProfessorAlunoCorrelacoes />} />
          <Route path="treinos/criar" element={<ProfessorCriarTreino />} />
          <Route path="exercicios/criar" element={<ProfessorCriarExercicio />} />
          <Route path="academias" element={<ProfessorAcademias />} />
          <Route path="alunos/vincular" element={<ProfessorVincularAluno />} />
          <Route path="fichas" element={<ProfessorFichas />} />
          <Route path="avaliacoes" element={<Avaliacoes />} />
          {/* DESATIVADO: cobrança — acesso livre. Reativar: descomentar. */}
          {/* <Route path="avaliacoes" element={<PremiumWrapper feature="AVALIACOES" featureName="Avaliações Físicas"><Avaliacoes /></PremiumWrapper>} /> */}
          <Route path="dados" element={<AlunoDados />} />
          <Route path="privacidade" element={<AlunoPrivacidade />} />
          <Route path="alterar-senha" element={<AlterarSenha />} />
          <Route path="meus-treinos" element={<AlunoMeusTreinos />} />
          <Route path="treino/novo" element={<AlunoCriarTreino />} />
          <Route path="treino/:id/editar" element={<AlunoCriarTreino />} />
          <Route path="treino/:id/inicio" element={<AlunoTreinoInicio />} />
          <Route path="treino/:id/execucao" element={<AlunoTreinoExecucao />} />
          <Route path="treino/:id/conclusao" element={<AlunoTreinoConclusao />} />
          <Route path="noticias" element={<Noticias />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
        </>
      )}

      {(user?.role === 'ROOT' || user?.admin) && (
        <Route element={<AppShell />}>
          <Route index element={<RootPainel />} />
          <Route path="vinculos" element={<RootVinculos />} />
          <Route path="documentacao" element={<Documentacao />} />
          <Route path="usuarios" element={<RootUsuarios />} />
          <Route path="avaliacoes" element={<Avaliacoes />} />
          <Route path="avaliacoes-sistema" element={<RootAvaliacoesSistema />} />
          <Route path="social" element={<RootSocial />} />
          <Route path="dados" element={<AlunoDados />} />
          <Route path="privacidade" element={<AlunoPrivacidade />} />
          <Route path="alterar-senha" element={<AlterarSenha />} />
          <Route path="noticias" element={<Noticias />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      )}

      {user?.role === 'ACADEMIA' && (
        <Route element={<AppShell />}>
          <Route index element={<AcademiaDashboard />} />
          <Route path="treinos" element={<AcademiaTreinos />} />
          <Route path="documentacao" element={<Documentacao />} />
          <Route path="professores" element={<AcademiaProfessores />} />
          <Route path="alunos" element={<AcademiaAlunos />} />
          <Route path="treinos/criar" element={<AcademiaCriarTreino />} />
          <Route path="avaliacoes" element={<Avaliacoes />} />
          <Route path="dados" element={<AlunoDados />} />
          <Route path="privacidade" element={<AlunoPrivacidade />} />
          <Route path="alterar-senha" element={<AlterarSenha />} />
          <Route path="noticias" element={<Noticias />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <OnboardingPermissionsModal />
    <PWAInstallPrompt />
    {user && <NotificationPrompt />}
    </>
  )
}
