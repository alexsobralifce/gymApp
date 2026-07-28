interface HuaweiBridgeGuideProps {
  platform: 'ios' | 'android' | 'web' | null
}

function HuaweiBridgeGuide({ platform }: HuaweiBridgeGuideProps) {
  if (platform === 'ios') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔄</span>
          <p className="text-xs font-bold text-text">
            Configure a sincronizacao Huawei Health com o Apple Health
          </p>
        </div>

        <ol className="space-y-2 pl-1">
          <li className="flex items-start gap-2 text-xs text-text-muted">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary mt-0.5">
              1
            </span>
            Abra o app <strong className="text-text">Huawei Saude</strong> no iPhone
          </li>
          <li className="flex items-start gap-2 text-xs text-text-muted">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary mt-0.5">
              2
            </span>
            Va em <strong className="text-text">Perfil</strong> &gt;{' '}
            <strong className="text-text">Gerenciamento de dados</strong>
          </li>
          <li className="flex items-start gap-2 text-xs text-text-muted">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary mt-0.5">
              3
            </span>
            Ative <strong className="text-text">Sincronizar com o Apple Health</strong>
          </li>
          <li className="flex items-start gap-2 text-xs text-text-muted">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary mt-0.5">
              4
            </span>
            Aguarde alguns minutos e volte ao app para ver seus dados
          </li>
        </ol>

        <p className="rounded-lg bg-surface-input px-3 py-2 text-xs text-text-muted">
          Os dados do seu relogio Huawei serao sincronizados com o Apple Health
          e o ENDORFINAPP podera ler frequencia cardiaca e calorias diretamente.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">🔄</span>
        <p className="text-xs font-bold text-text">
          Configure a ponte Huawei Health com o Health Connect
        </p>
      </div>

      <ol className="space-y-2 pl-1">
        <li className="flex items-start gap-2 text-xs text-text-muted">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary mt-0.5">
            1
          </span>
          Instale o app <strong className="text-text">Health Sync</strong> na Play Store
        </li>
        <li className="flex items-start gap-2 text-xs text-text-muted">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary mt-0.5">
            2
          </span>
          No Health Sync, defina <strong className="text-text">Huawei Health</strong> como
          origem
        </li>
        <li className="flex items-start gap-2 text-xs text-text-muted">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary mt-0.5">
            3
          </span>
          Defina <strong className="text-text">Health Connect</strong> como destino
        </li>
        <li className="flex items-start gap-2 text-xs text-text-muted">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary mt-0.5">
            4
          </span>
          Inicie a sincronizacao e aguarde. Depois volte ao app.
        </li>
      </ol>

      <p className="rounded-lg bg-surface-input px-3 py-2 text-xs text-text-muted">
        O Health Sync e uma ponte que transfere os dados do Huawei Health para o Health Connect.
        Depois de configurado, o ENDORFINAPP le frequencia cardiaca e calorias normalmente.
      </p>
    </div>
  )
}

export default HuaweiBridgeGuide
