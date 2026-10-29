import { Link, useNavigate } from 'react-router-dom'
import { useSeo } from '../lib/seo'
import { EMAIL_SUPORTE } from '../config/contato'
import { ChevronLeftIcon } from '../components/icons/Icon'
import { EndorfinappLogo } from '../components/branding/EndorfinappLogo'

import { useT } from '../i18n'
export default function TermosDeUso() {
  const { t } = useT()
  const navigate = useNavigate()

  useSeo({
    title: t('Termos de Uso | ENDORFINAPP'),
    description: t('Regras de uso do ENDORFINAPP: cadastro, assinaturas, conduta no app e responsabilidades.'),
    path: '/termos-de-uso',
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

        <h1 className="mb-1 text-2xl font-bold text-text">{t('Termos de Uso')}</h1>
        <p className="mb-8 text-xs text-text-muted">{t('Última atualização: 28 de outubro de 2026')}</p>

        <div className="space-y-6 text-sm leading-relaxed text-text-muted">
          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('1. Aceitação')}</h2>
            <p>
              {t('Ao criar uma conta ou usar o ENDORFINAPP (site, aplicativo instalado e recursos associados), você concorda com estes Termos de Uso e com a nossa Política de Privacidade. Se não concordar, não utilize o serviço.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('2. O serviço')}</h2>
            <p>
              {t('O ENDORFINAPP oferece ferramentas de gerenciamento de treinos, registro de evolução física, prescrição de treinos com apoio de inteligência artificial, feed social, amizades e clubes. Algumas funções dependem de conexão com a internet e podem mudar ao longo do tempo.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('3. Cadastro e conta')}</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>{t('Você deve informar dados verdadeiros e mantê-los atualizados.')}</li>
              <li>{t('Você é responsável pela guarda da sua senha e por tudo que for feito na sua conta.')}</li>
              <li>{t('O uso é pessoal. Não é permitido compartilhar a conta com terceiros.')}</li>
              <li>{t('É necessário ter pelo menos 13 anos. Menores de 18 anos devem usar o serviço com a ciência de um responsável.')}</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('4. Assinaturas e pagamentos')}</h2>
            <p>
              {t('Os planos pagos são cobrados pela Google Play, nas condições dessa loja. O cancelamento e o reembolso seguem as regras da Google Play. O acesso aos recursos pagos é mantido enquanto a assinatura estiver ativa.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('5. Saúde e orientação física')}</h2>
            <p>
              {t('Os treinos, medidas e recomendações do ENDORFINAPP, inclusive os gerados por inteligência artificial, têm caráter informativo e não substituem avaliação médica ou de profissional de educação física. Antes de iniciar ou alterar um programa de exercícios, consulte um médico, sobretudo se tiver condições de saúde. Você é responsável por executar os exercícios com segurança e pode interromper a atividade a qualquer momento.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('6. Conduta no app e no feed social')}</h2>
            <p>{t('Ao usar o ENDORFINAPP, você não deve:')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>{t('publicar conteúdo ofensivo, discriminatório, sexual, violento ou ilegal;')}</li>
              <li>{t('se passar por outra pessoa ou academia, ou falsificar informações;')}</li>
              <li>{t('assediar, ameaçar ou expor dados de outros usuários;')}</li>
              <li>{t('tentar acessar contas, dados ou sistemas que não são seus, ou prejudicar o funcionamento do serviço;')}</li>
              <li>{t('copiar, revender ou explorar o serviço sem autorização.')}</li>
            </ul>
            <p className="mt-2">
              {t('Podemos remover conteúdos e suspender contas que violem estas regras.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('7. Conteúdo do usuário')}</h2>
            <p>
              {t('Você continua dono do conteúdo que publica (fotos, textos e posts). Ao publicá-lo, concede ao ENDORFINAPP licença não exclusiva para exibi-lo dentro do serviço, pelo tempo em que ele estiver publicado. Você pode remover suas publicações a qualquer momento.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('8. Propriedade intelectual')}</h2>
            <p>
              {t('Marca, logotipo, design, textos e código do ENDORFINAPP são protegidos por lei. Seu uso fora das finalidades deste serviço não é permitido sem autorização prévia por escrito.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('9. Disponibilidade e alterações')}</h2>
            <p>
              {t('Buscamos manter o serviço disponível, mas podemos interrompê-lo para manutenção ou melhorias. Estes termos podem ser atualizados; a data da última revisão está no topo desta página, e alterações relevantes serão comunicadas pelo aplicativo ou por e-mail.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('10. Encerramento da conta')}</h2>
            <p>
              {t('Você pode encerrar sua conta a qualquer momento, pelo aplicativo ou pelo e-mail de contato. Podemos suspender ou encerrar contas que descumpram estes termos. Os seus dados são tratados conforme a Política de Privacidade.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('11. Limitação de responsabilidade')}</h2>
            <p>
              {t('Na extensão permitida pela lei, o ENDORFINAPP não responde por danos indiretos, lucros cessantes ou lesões decorrentes de exercícios executados sem orientação adequada, por indisponibilidade do serviço ou por conteúdo publicado por outros usuários.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('12. Lei aplicável e foro')}</h2>
            <p>
              {t('Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca do domicílio do consumidor para resolver eventuais disputas, nos termos do Código de Defesa do Consumidor.')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-text">{t('13. Contato')}</h2>
            <p>
              {t('Dúvidas sobre estes termos podem ser enviadas para')} <a className="text-primary hover:underline" href={`mailto:${EMAIL_SUPORTE}`}>{EMAIL_SUPORTE}</a>.
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
