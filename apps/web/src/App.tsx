import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { useNotifications } from './hooks/useNotifications'
import AppShell from './components/layout/AppShell'
import LoadingSpinner from './components/ui/LoadingSpinner'
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import AlunoDashboard from './pages/aluno/Dashboard'
import AlunoTreinoInicio from './pages/aluno/TreinoInicio'
import AlunoTreinoExecucao from './pages/aluno/TreinoExecucao'
import AlunoTreinoConclusao from './pages/aluno/TreinoConclusao'
import AlunoMedidas from './pages/aluno/Medidas'
import AlunoEvolucao from './pages/aluno/Evolucao'
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
import AcademiaDashboard from './pages/academia/Dashboard'
import AcademiaProfessores from './pages/academia/Professores'
import AcademiaAlunos from './pages/academia/Alunos'
import AcademiaCriarTreino from './pages/academia/CriarTreinoAcademia'
import AcademiaTreinos from './pages/academia/Treinos'
import AlunoMeusTreinos from './pages/aluno/MeusTreinos'
import AlunoCriarTreino from './pages/aluno/CriarTreinoAluno'
import TreinoIA from './pages/aluno/TreinoIA'
import AlunoDados from './pages/aluno/DadosAluno'
import BibliotecaPlanos from './pages/aluno/BibliotecaPlanos'
import AlunoMural from './pages/aluno/Mural'
import AlunoAmizades from './pages/aluno/Amizades'
import AlunoPrivacidade from './pages/aluno/Privacidade'
import AlunoClubes from './pages/aluno/Clubes'
import WelcomeCards from './pages/aluno/WelcomeCards'
import AlterarSenha from './pages/auth/AlterarSenha'

export default function App() {
  useNotifications()
  const { user, fetchUser } = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetchUser().finally(() => setReady(true))
  }, [])

  if (!ready) return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
          G
        </div>
        <LoadingSpinner size="md" />
        <p className="text-sm text-text-muted">Carregando...</p>
      </div>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />

      {!user && <Route index element={<Landing />} />}

      {user?.role === 'ALUNO' && (
        <>
          <Route path="welcome" element={<WelcomeCards />} />
          <Route element={<AppShell />}>
          <Route index element={<AlunoDashboard />} />
          <Route path="meus-treinos" element={<AlunoMeusTreinos />} />
          <Route path="biblioteca-planos" element={<BibliotecaPlanos />} />
          <Route path="dados" element={<AlunoDados />} />
          <Route path="treino/novo" element={<AlunoCriarTreino />} />
          <Route path="treino/:id/editar" element={<AlunoCriarTreino />} />
          <Route path="treino/ia" element={<TreinoIA />} />
          <Route path="treino/:id/inicio" element={<AlunoTreinoInicio />} />
          <Route path="treino/:id/execucao" element={<AlunoTreinoExecucao />} />
          <Route path="treino/:id/conclusao" element={<AlunoTreinoConclusao />} />
          <Route path="medidas" element={<AlunoMedidas />} />
          <Route path="evolucao" element={<AlunoEvolucao />} />
          <Route path="mural" element={<AlunoMural />} />
          <Route path="amizades" element={<AlunoAmizades />} />
          <Route path="privacidade" element={<AlunoPrivacidade />} />
          <Route path="clubes" element={<AlunoClubes />} />
          <Route path="alterar-senha" element={<AlterarSenha />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
        </>
      )}

      {user?.role === 'PROFESSOR' && (
        <Route element={<AppShell />}>
          <Route index element={<ProfessorDashboard />} />
          <Route path="treinos" element={<ProfessorTreinos />} />
          <Route path="alunos/:alunoId/correlacoes" element={<ProfessorAlunoCorrelacoes />} />
          <Route path="treinos/criar" element={<ProfessorCriarTreino />} />
          <Route path="exercicios/criar" element={<ProfessorCriarExercicio />} />
          <Route path="academias" element={<ProfessorAcademias />} />
          <Route path="alunos/vincular" element={<ProfessorVincularAluno />} />
          <Route path="fichas" element={<ProfessorFichas />} />
          <Route path="alterar-senha" element={<AlterarSenha />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      )}

      {user?.role === 'ROOT' && (
        <Route element={<AppShell />}>
          <Route index element={<RootPainel />} />
          <Route path="vinculos" element={<RootVinculos />} />
          <Route path="usuarios" element={<RootUsuarios />} />
          <Route path="social" element={<RootSocial />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      )}

      {user?.role === 'ACADEMIA' && (
        <Route element={<AppShell />}>
          <Route index element={<AcademiaDashboard />} />
          <Route path="treinos" element={<AcademiaTreinos />} />
          <Route path="professores" element={<AcademiaProfessores />} />
          <Route path="alunos" element={<AcademiaAlunos />} />
          <Route path="treinos/criar" element={<AcademiaCriarTreino />} />
          <Route path="alterar-senha" element={<AlterarSenha />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      )}

      <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
    </Routes>
  )
}
