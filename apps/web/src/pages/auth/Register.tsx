import { useSeo } from '../../lib/seo'
import RegisterWizard from './RegisterWizard'

export default function Register() {
  useSeo({
    title: 'Criar conta grátis | ENDORFINAPP',
    description: 'Cadastre-se no ENDORFINAPP como aluno, personal ou academia e comece a montar e acompanhar treinos.',
    path: '/register',
  })
  return <RegisterWizard />
}
