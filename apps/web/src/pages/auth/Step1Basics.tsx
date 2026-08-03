import { formatPhone } from '../../lib/phone'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import FormField from '../../components/ui/FormField'

interface Step1BasicsProps {
  nome: string
  setNome: (v: string) => void
  email: string
  setEmail: (v: string) => void
  senha: string
  setSenha: (v: string) => void
  telefone: string
  setTelefone: (v: string) => void
  role: string
  setRole: (v: string) => void
}

export default function Step1Basics({
  nome, setNome, email, setEmail, senha, setSenha,
  telefone, setTelefone, role, setRole,
}: Step1BasicsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField label="Nome completo" htmlFor="nome">
        <Input
          id="nome" type="text" placeholder="Nome completo" value={nome}
          onChange={(e) => setNome(e.target.value)}
          required minLength={2}
        />
      </FormField>
      <FormField label="Email" htmlFor="email">
        <Input
          id="email" type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </FormField>
      <FormField label="Senha" htmlFor="senha">
        <Input
          id="senha" type="password" placeholder="Senha (mínimo 8 caracteres)" value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required minLength={8}
        />
      </FormField>
      <FormField label="WhatsApp (opcional)" htmlFor="whatsapp">
        <Input
          id="whatsapp" type="tel" placeholder="WhatsApp (opcional)" value={telefone}
          onChange={(e) => setTelefone(formatPhone(e.target.value))}
          maxLength={16}
        />
      </FormField>
      <div className="md:col-span-2">
        <FormField label="Tipo de conta" htmlFor="role">
          <Select
            id="role" value={role} onChange={(e) => setRole(e.target.value)}
          >
            <option value="ALUNO">Aluno</option>
            <option value="PROFESSOR">Professor</option>
            <option value="ACADEMIA">Academia</option>
          </Select>
        </FormField>
      </div>
    </div>
  )
}
