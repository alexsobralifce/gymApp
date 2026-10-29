import { Link, useNavigate } from 'react-router-dom'
import { useSeo } from '../lib/seo'
import { EMAIL_SUPORTE } from '../config/contato'
import { ChevronLeftIcon } from '../components/icons/Icon'
import { EndorfinappLogo } from '../components/branding/EndorfinappLogo'

import { useT } from '../i18n'
export default function PoliticaPrivacidade() {
  const { t, idioma } = useT()
  const navigate = useNavigate()

  useSeo({
    title: t('Política de Privacidade | ENDORFINAPP'),
    description: t('Como o ENDORFINAPP coleta, usa e protege seus dados, em conformidade com a LGPD.'),
    path: idioma === 'en' ? '/en/privacy-policy' : '/politica-privacidade',
  })

  function handleVoltar() {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-16">
        <button
          onClick={handleVoltar}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text cursor-pointer"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          {t('Voltar')}
        </button>

        <div className="mb-8 flex items-center gap-3">
          <EndorfinappLogo variant="horizontal" iconSize={28} size={14} showSlogan={false} />
        </div>

        <h1 className="mb-1 text-2xl font-bold text-text">{t('Política de Privacidade')}</h1>
        <p className="mb-8 text-xs text-text-muted">{t('Última atualização: 28 de agosto de 2026')}</p>

        <div className="space-y-6 text-sm leading-relaxed text-text-muted">
          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('1. Quem somos')}</h2>
            <p>
              {t('A ENDORFINAPP é um aplicativo de gerenciamento de treinos, avaliação física e rede social fitness. Esta política explica como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('2. Dados que coletamos')}</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-text">{t('Dados de cadastro')}</strong>{t(': nome, e-mail, telefone (WhatsApp), senha (criptografada), foto de perfil')}</li>
              <li><strong className="text-text">{t('Dados físicos e de saúde')}</strong>{t(': data de nascimento, sexo, peso, altura, medidas corporais, percentual de gordura, massa magra, respostas de triagem PAR-Q+ e resultados de avaliações físicas (informados voluntariamente)')}</li>
              <li><strong className="text-text">{t('Dados de treinamento')}</strong>{t(': treinos criados, séries executadas, cargas, repetições, avaliações de dificuldade e histórico de execução')}</li>
              <li><strong className="text-text">{t('Dados de uso')}</strong>{t(': cliques, páginas acessadas, tempo de uso e interações no feed social')}</li>
              <li><strong className="text-text">{t('Dados técnicos')}</strong>{t(': identificador do dispositivo para notificações push, endereço IP e tipo de navegador')}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('3. Como usamos seus dados')}</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t('Fornecer e operar o serviço: criação e execução de treinos, avaliação física, evolução mensal e correlações')}</li>
              <li>{t('Prescrição de treinos por inteligência artificial e recomendação de planos')}</li>
              <li>{t('Envio de notificações push (lembretes de treino, mensagens motivacionais, novidades) conforme suas preferências')}</li>
              <li>{t('Funcionamento do feed social, amizades e clubes')}</li>
              <li>{t('Melhoria do produto por meio de análises agregadas e pseudonimizadas')}</li>
              <li>{t('Cobrança de assinaturas via Google Play (processamento realizado pelo Google)')}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('4. Bases legais (LGPD)')}</h2>
            <p className="mb-2">{t('Tratamos seus dados com base em:')}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-text">{t('Consentimento')}</strong>{t(': dados físicos, de saúde e de treinamento (coleta opcional e por livre escolha)')}</li>
              <li><strong className="text-text">{t('Execução de contrato')}</strong>{t(': dados necessários à prestação do serviço')}</li>
              <li><strong className="text-text">{t('Interesse legítimo')}</strong>{t(': melhoria do produto e prevenção de fraudes')}</li>
              <li><strong className="text-text">{t('Obrigação legal')}</strong>{t(': quando exigido por lei ou autoridade competente')}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('5. Compartilhamento de dados')}</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-text">{t('Google Play')}</strong>{t(': processamento de pagamentos de assinaturas')}</li>
              <li><strong className="text-text">{t('Provedores de infraestrutura')}</strong>{t(': hospedagem (Railway), banco de dados e filas (PostgreSQL/Redis) e envio de e-mails/notificações')}</li>
              <li><strong className="text-text">{t('Analytics')}</strong>{t(': provedor de medição de uso (PostHog) para estatísticas agregadas e pseudonimizadas de navegação, quando habilitado')}</li>
              <li><strong className="text-text">{t('Contagem de visitas do site e do blog')}</strong>{t(': registramos, de forma anônima, quais páginas públicas foram vistas, de onde veio o visitante (por exemplo, buscador ou rede social) e o tipo de aparelho. Usamos um identificador aleatório guardado no seu navegador, sem cookies, sem endereço IP e sem dados pessoais, apenas para saber o que é mais lido')}</li>
              <li><strong className="text-text">{t('Outros usuários')}</strong>{t(': apenas os dados que você escolher publicar no feed social, clubes e perfil')}</li>
            </ul>
            <p className="mt-2">{t('Não vendemos nem alugamos seus dados pessoais a terceiros.')}</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('6. Segurança')}</h2>
            <p>
              {t('Utilizamos criptografia em trânsito (HTTPS/TLS), senhas com hash segura (bcrypt), tokens de autenticação com expiração e controle de acesso por perfil de usuário. O acesso a dados confidenciais é restrito e monitorado.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('7. Seus direitos (LGPD)')}</h2>
            <p className="mb-2">{t('Você pode, a qualquer momento, exercer os seguintes direitos:')}</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t('Confirmar a existência de tratamento de dados')}</li>
              <li>{t('Acessar seus dados pessoais')}</li>
              <li>{t('Corrigir dados incompletos, inexatos ou desatualizados')}</li>
              <li>{t('Anonimizar, bloquear ou eliminar dados desnecessários')}</li>
              <li>{t('Revogar o consentimento')}</li>
              <li>{t('Solicitar a portabilidade dos dados')}</li>
              <li>{t('Solicitar a exclusão da conta e dos dados associados (pelo e-mail abaixo; passo a passo na página Exclusão de Dados)')}</li>
            </ul>
            <p className="mt-2">
              {t('Controles práticos estão disponíveis na página Privacidade do aplicativo (menu Meu Perfil) e no cadastro. Para solicitações adicionais, fale conosco pelo e-mail abaixo.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('8. Retenção de dados')}</h2>
            <p>
              {t('Mantemos seus dados apenas pelo tempo necessário às finalidades descritas ou conforme exigido por lei. Históricos de treino e avaliações podem ser retidos para acompanhamento evolutivo. Você pode solicitar a exclusão da conta e dos dados associados pelo e-mail de contato abaixo; após a solicitação, os dados pessoais são removidos ou anonimizados, exceto quando a retenção for exigida legalmente.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('9. Menores de 13 anos')}</h2>
            <p>
              {t('O aplicativo não é direcionado a menores de 13 anos e não coletamos intencionalmente dados pessoais de crianças. Se identificarmos esse cenário, os dados serão excluídos.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('10. Contato e DPO')}</h2>
            <p>
              {t('Dúvidas, reclamações ou solicitações sobre seus dados podem ser enviadas para:')}
            </p>
            <p className="mt-2 rounded-xl border border-border bg-surface-card p-3">
              {t('E-mail:')} <strong className="text-text">{EMAIL_SUPORTE}</strong>
              <br />
              {t('Assunto:')} <strong className="text-text">{t('LGPD / Privacidade')}</strong>
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('11. Alterações nesta política')}</h2>
            <p>
              {t('Esta política pode ser atualizada periodicamente. A data da última revisão está no topo desta página. Alterações relevantes serão comunicadas pelo aplicativo ou por e-mail.')}
            </p>
          </section>

          <div className="pt-4 text-center">
            <Link to="/" className="text-sm font-bold text-primary hover:underline">
              {t('Voltar para a ENDORFINAPP')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}