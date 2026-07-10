import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { useNotifications } from './hooks/useNotifications'
import AlunoShell from './components/layout/AlunoShell'
import ProfessorShell from './components/layout/ProfessorShell'
import AdminShell from './components/layout/AdminShell'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import AlunoDashboard from './pages/aluno/Dashboard'
import AlunoTreinoInicio from './pages/aluno/TreinoInicio'
import AlunoTreinoExecucao from './pages/aluno/TreinoExecucao'
import AlunoTreinoConclusao from './pages/aluno/TreinoConclusao'
import AlunoMedidas from './pages/aluno/Medidas'
import AlunoEvolucao from './pages/aluno/Evolucao'
import AlunoEstudo from './pages/aluno/Estudo'
import ProfessorDashboard from './pages/professor/Dashboard'
import ProfessorAlunoCorrelacoes from './pages/professor/AlunoCorrelacoes'
import ProfessorCriarTreino from './pages/professor/CriarTreino'
import ProfessorCriarExercicio from './pages/professor/CriarExercicio'
import ProfessorAcademias from './pages/professor/Academias'
import ProfessorVincularAluno from './pages/professor/VincularAluno'
import RootPainel from './pages/root/Painel'
import RootVinculos from './pages/root/Vinculos'
import AcademiaDashboard from './pages/academia/Dashboard'
import AcademiaProfessores from './pages/academia/Professores'
import AcademiaAlunos from './pages/academia/Alunos'

export default function App() {
  useNotifications()
  const { user, fetchUser } = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    fetchUser().finally(() => setReady(true))
  }, [])

  if (!ready) return <div className="flex h-screen items-center justify-center bg-surface text-text">Carregando...</div>

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />

      {user?.role === 'ALUNO' && (
        <Route element={<AlunoShell />}>
          <Route index element={<AlunoDashboard />} />
          <Route path="treino/:id/inicio" element={<AlunoTreinoInicio />} />
          <Route path="treino/:id/execucao" element={<AlunoTreinoExecucao />} />
          <Route path="treino/:id/conclusao" element={<AlunoTreinoConclusao />} />
          <Route path="medidas" element={<AlunoMedidas />} />
          <Route path="evolucao" element={<AlunoEvolucao />} />
          <Route path="estudo" element={<AlunoEstudo />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      )}

      {user?.role === 'PROFESSOR' && (
        <Route element={<ProfessorShell />}>
          <Route index element={<ProfessorDashboard />} />
          <Route path="alunos/:alunoId/correlacoes" element={<ProfessorAlunoCorrelacoes />} />
          <Route path="treinos/criar" element={<ProfessorCriarTreino />} />
          <Route path="exercicios/criar" element={<ProfessorCriarExercicio />} />
          <Route path="academias" element={<ProfessorAcademias />} />
          <Route path="alunos/vincular" element={<ProfessorVincularAluno />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      )}

      {user?.role === 'ROOT' && (
        <Route element={<AdminShell />}>
          <Route index element={<RootPainel />} />
          <Route path="vinculos" element={<RootVinculos />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      )}

      {user?.role === 'ACADEMIA' && (
        <Route element={<AdminShell />}>
          <Route index element={<AcademiaDashboard />} />
          <Route path="professores" element={<AcademiaProfessores />} />
          <Route path="alunos" element={<AcademiaAlunos />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      )}

      <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
    </Routes>
  )
}
