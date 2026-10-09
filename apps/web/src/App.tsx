import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
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
import QuemSomos from './pages/QuemSomos'
import Planos from './pages/planos/Planos'
import PaginaSeo from './pages/seo/PaginaSeo'
import BlogLista from './pages/blog/BlogLista'
import BlogArtigo from './pages/blog/BlogArtigo'
import { PAGINAS_SEO } from './pages/seo/paginasSeo'
const Checkout = lazy(() => import('./pages/billing/Checkout'))
const OnboardingPlano = lazy(() => import('./pages/auth/OnboardingPlano'))
import GoogleCallback from './pages/auth/GoogleCallback'
const AlunoDashboard = lazy(() => import('./pages/aluno/Dashboard'))
const AlunoTreinoInicio = lazy(() => import('./pages/aluno/TreinoInicio'))
const AlunoTreinoExecucao = lazy(() => import('./pages/aluno/TreinoExecucao'))
const AlunoTreinoConclusao = lazy(() => import('./pages/aluno/TreinoConclusao'))
const AlunoMedidas = lazy(() => import('./pages/aluno/Medidas'))
const AlunoEvolucao = lazy(() => import('./pages/aluno/Evolucao'))
const HistoricoExercicio = lazy(() => import('./pages/aluno/HistoricoExercicio'))
const ProfessorDashboard = lazy(() => import('./pages/professor/Dashboard'))
const ProfessorAlunoCorrelacoes = lazy(() => import('./pages/professor/AlunoCorrelacoes'))
const ProfessorCriarTreino = lazy(() => import('./pages/professor/CriarTreino'))
const ProfessorTreinos = lazy(() => import('./pages/professor/Treinos'))
const ProfessorCriarExercicio = lazy(() => import('./pages/professor/CriarExercicio'))
const ProfessorAcademias = lazy(() => import('./pages/professor/Academias'))
const ProfessorVincularAluno = lazy(() => import('./pages/professor/VincularAluno'))
const ProfessorFichas = lazy(() => import('./pages/professor/Fichas'))
const RootPainel = lazy(() => import('./pages/root/Painel'))
const RootVinculos = lazy(() => import('./pages/root/Vinculos'))
const RootUsuarios = lazy(() => import('./pages/root/Usuarios'))
const RootSocial = lazy(() => import('./pages/root/Social'))
const RootPublicacoes = lazy(() => import('./pages/root/Publicacoes'))
const RootAvaliacoesSistema = lazy(() => import('./pages/root/AvaliacoesSistema'))
const RootFinanceiro = lazy(() => import('./pages/root/Financeiro'))
const AcademiaDashboard = lazy(() => import('./pages/academia/Dashboard'))
const AcademiaProfessores = lazy(() => import('./pages/academia/Professores'))
const AcademiaAlunos = lazy(() => import('./pages/academia/Alunos'))
const AcademiaPromocoes = lazy(() => import('./pages/academia/Promocoes'))
const AcademiaCriarTreino = lazy(() => import('./pages/academia/CriarTreinoAcademia'))
const AcademiaTreinos = lazy(() => import('./pages/academia/Treinos'))
const AlunoMeusTreinos = lazy(() => import('./pages/aluno/MeusTreinos'))
const AlunoCriarTreino = lazy(() => import('./pages/aluno/CriarTreinoAluno'))
const AlunoDados = lazy(() => import('./pages/aluno/DadosAluno'))
const BibliotecaPlanos = lazy(() => import('./pages/aluno/BibliotecaPlanos'))
const AlunoMural = lazy(() => import('./pages/aluno/Mural'))
const AlunoAmizades = lazy(() => import('./pages/aluno/Amizades'))
const AlunoPrivacidade = lazy(() => import('./pages/aluno/Privacidade'))
const AlunoPreferenciasNotificacao = lazy(() => import('./pages/aluno/PreferenciasNotificacao'))
const AlunoClubes = lazy(() => import('./pages/aluno/Clubes'))
const Parceiros = lazy(() => import('./pages/aluno/Parceiros'))
const WelcomeCards = lazy(() => import('./pages/aluno/WelcomeCards'))
const Noticias = lazy(() => import('./pages/aluno/Noticias'))
const ClubeFeed = lazy(() => import('./pages/aluno/ClubeFeed'))
const AlterarSenha = lazy(() => import('./pages/auth/AlterarSenha'))
const Avaliacoes = lazy(() => import('./pages/avaliacoes/Avaliacoes'))
const Documentacao = lazy(() => import('./pages/Documentacao'))
// DESATIVADO: cobrança — acesso livre. Reativar: descomentar.
// import Paywall from './pages/paywall/Paywall'
// import Beneficios from './pages/aluno/Beneficios'
// import PremiumWrapper from './components/ui/PremiumWrapper'

import { EndorfinappIcon } from './components/branding'
import { api } from './api/client'
import { rastrearPagina } from './lib/paginaVisita'

export default function App() {
  useNotifications()
  useCapacitorTheme()
  const { user, fetchUser } = useAuthStore()
  // DESATIVADO: cobrança — acesso livre. Reativar: descomentar.
  // const fetchLicenca = useSubscriptionStore((s) => s.fetchLicenca)
  const [ready, setReady] = useState(false)
  const local = useLocation()

  // Contagem anônima das páginas públicas (landing, blog, produto); ignora o root para não inflar os números
  useEffect(() => {
    if (!ready || user?.role === 'ROOT' || user?.admin) return
    rastrearPagina(local.pathname, local.search, (d) => api.registrarPagina(d))
  }, [ready, local.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-surface"><LoadingSpinner size="md" /></div>}>
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
      <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
      <Route path="/quem-somos" element={<QuemSomos />} />
      <Route path="/planos" element={<Planos />} />
      <Route path="/blog" element={<BlogLista />} />
      <Route path="/blog/:slug" element={<BlogArtigo />} />
      {PAGINAS_SEO.map((p) => (
        <Route key={p.caminho} path={p.caminho} element={<PaginaSeo dados={p} />} />
      ))}
      <Route path="/auth/google/callback" element={<GoogleCallback />} />

      {!user && <Route index element={<Landing />} />}

      {user && (
        <Route element={<AppShell />}>
          <Route path="billing/checkout" element={<Checkout />} />
        </Route>
      )}

      {user && <Route path="onboarding/plano" element={<OnboardingPlano />} />}

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
          <Route path="treino/novo" element={<AlunoCriarTreino />} />
          <Route path="treino/:id/editar" element={<AlunoCriarTreino />} />
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
          {/* Professor tem a mesma liberdade de um aluno: treinar, evoluir e usar a rede social */}
          <Route path="biblioteca-planos" element={<BibliotecaPlanos />} />
          <Route path="medidas" element={<AlunoMedidas />} />
          <Route path="evolucao" element={<AlunoEvolucao />} />
          <Route path="exercicios/:exercicioId/historico" element={<HistoricoExercicio />} />
          <Route path="feed" element={<AlunoMural />} />
          <Route path="mural" element={<Navigate to="/feed" replace />} />
          <Route path="amizades" element={<AlunoAmizades />} />
          <Route path="clubes" element={<AlunoClubes />} />
          <Route path="clubes/:id" element={<ClubeFeed />} />
          <Route path="notificacoes/preferencias" element={<AlunoPreferenciasNotificacao />} />
          <Route path="parceiros" element={<Parceiros />} />
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
          <Route path="financeiro" element={<RootFinanceiro />} />
          <Route path="avaliacoes" element={<Avaliacoes />} />
          <Route path="avaliacoes-sistema" element={<RootAvaliacoesSistema />} />
          <Route path="social" element={<RootSocial />} />
          <Route path="publicacoes" element={<RootPublicacoes />} />
          <Route path="dados" element={<AlunoDados />} />
          <Route path="privacidade" element={<AlunoPrivacidade />} />
          <Route path="alterar-senha" element={<AlterarSenha />} />
          <Route path="noticias" element={<Noticias />} />
          <Route path="meus-treinos" element={<AlunoMeusTreinos />} />
          <Route path="treinos" element={<ProfessorTreinos />} />
          <Route path="treinos/criar" element={<ProfessorCriarTreino />} />
          <Route path="treino/novo" element={<AlunoCriarTreino />} />
          <Route path="treino/:id/editar" element={<AlunoCriarTreino />} />
          <Route path="biblioteca-planos" element={<BibliotecaPlanos />} />
          <Route path="treino/:id/inicio" element={<AlunoTreinoInicio />} />
          <Route path="treino/:id/execucao" element={<AlunoTreinoExecucao />} />
          <Route path="treino/:id/conclusao" element={<AlunoTreinoConclusao />} />
          <Route path="exercicios/:exercicioId/historico" element={<HistoricoExercicio />} />
          <Route path="medidas" element={<AlunoMedidas />} />
          <Route path="evolucao" element={<AlunoEvolucao />} />
          <Route path="feed" element={<AlunoMural />} />
          <Route path="amizades" element={<AlunoAmizades />} />
          <Route path="clubes" element={<AlunoClubes />} />
          <Route path="clubes/:id" element={<ClubeFeed />} />
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
          <Route path="promocoes" element={<AcademiaPromocoes />} />
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
    </Suspense>
    <OnboardingPermissionsModal />
    <PWAInstallPrompt />
    {user && <NotificationPrompt />}
    </>
  )
}
