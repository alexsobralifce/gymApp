import { Link, useNavigate } from 'react-router-dom'
import { useSeo } from '../lib/seo'
import { EMAIL_SUPORTE } from '../config/contato'
import { ChevronLeftIcon } from '../components/icons/Icon'
import { EndorfinappLogo } from '../components/branding/EndorfinappLogo'

import { useT } from '../i18n'
export default function ExclusaoDados() {
  const { t } = useT()
  const navigate = useNavigate()

  useSeo({
    title: t('Exclusão de Dados | ENDORFINAPP'),
    description: t('Como pedir a exclusão da sua conta e dos seus dados pessoais no ENDORFINAPP.'),
    path: '/exclusao-de-dados',
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

        <h1 className="mb-1 text-2xl font-bold text-text">{t('Exclusão de Dados')}</h1>
        <p className="mb-8 text-xs text-text-muted">{t('Última atualização: 29 de outubro de 2026')}</p>

        <div className="space-y-6 text-sm leading-relaxed text-text-muted">
          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('1. Como pedir a exclusão')}</h2>
            <p>
              {t('Você pode pedir a exclusão da sua conta e dos dados pessoais associados a ela a qualquer momento. Para isso, envie um e-mail para')}{' '}
              <a className="text-primary hover:underline" href={`mailto:${EMAIL_SUPORTE}?subject=${encodeURIComponent(t('Pedido de exclusão de dados'))}`}>{EMAIL_SUPORTE}</a>{' '}
              {t('com o assunto "Pedido de exclusão de dados" e, no corpo da mensagem:')}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t('o nome e o e-mail usados no cadastro;')}</li>
              <li>{t('a confirmação de que você é o titular da conta;')}</li>
              <li>{t('se quer apenas a exclusão da conta ou também a exclusão de todos os dados associados.')}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('2. Como confirmamos a sua identidade')}</h2>
            <p>
              {t('Respondemos pelo mesmo e-mail do cadastro. Podemos pedir uma confirmação adicional para proteger a sua conta contra pedidos feitos por terceiros.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('3. O que é excluído')}</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t('dados de cadastro: nome, e-mail, telefone e foto de perfil;')}</li>
              <li>{t('dados físicos e de saúde: medidas corporais, avaliações físicas e respostas de triagem;')}</li>
              <li>{t('dados de treinamento: treinos, fichas e histórico de execução;')}</li>
              <li>{t('publicações, comentários, amizades e participação em clubes do feed social;')}</li>
              <li>{t('identificadores usados para notificações push.')}</li>
            </ul>
            <p className="mt-2">
              {t('Algumas informações podem ser mantidas quando a lei exigir, por exemplo registros de cobrança e fiscais, e pelo tempo que a lei determinar. Depois disso, elas são eliminadas ou anonimizadas.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('4. Prazo')}</h2>
            <p>
              {t('Respondemos ao pedido e concluímos a exclusão dentro dos prazos previstos na Lei Geral de Proteção de Dados (LGPD).')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('5. Assinaturas ativas')}</h2>
            <p>
              {t('A exclusão da conta não cancela automaticamente uma assinatura paga feita pela Google Play. Cancele a assinatura na própria Google Play antes de pedir a exclusão, para não ser cobrado novamente.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('6. Mais informações')}</h2>
            <p>
              {t('Para entender quais dados coletamos e como os usamos, veja a')}{' '}
              <Link className="text-primary hover:underline" to="/politica-privacidade">{t('Política de Privacidade')}</Link>.
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
