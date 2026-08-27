# ENDORFINAPP — Android TWA (Trusted Web Activity)

Este diretório contém a infraestrutura e os artefatos necessários para gerar o pacote oficial Android (`.aab` e `.apk`) do **ENDORFINAPP** para publicação na **Google Play Store**.

---

## 1. Identificação do Aplicativo

| Atributo | Valor |
|---|---|
| **Nome do App** | ENDORFINAPP |
| **Package ID** | `com.endorfinapp.app` |
| **Domínio PWA** | `https://endorfinapp.com` |
| **Start URL** | `/?source=twa` |
| **Orientação** | Retrato (`portrait`) |
| **Cor de Fundo / Splash** | `#0B1220` (Navy Dark) |

---

## 2. Assinatura e Keystore de Produção

O keystore oficial foi gerado com RSA de 4096 bits e validade até 2054:

- **Arquivo**: `packages/twa/keystore/endorfinapp-release.keystore`
- **Alias**: `endorfinapp`
- **Senha da Chave / Store**: `endorfinapp2026`
- **Fingerprint SHA-256 (Produção)**:
  `B0:74:2C:44:9A:9B:BB:74:5E:DE:85:9B:45:36:90:83:CC:70:E7:15:2A:6C:A7:C3:57:C0:22:1E:E0:9A:57:63`
- **Fingerprint SHA-256 (Debug Local)**:
  `E2:F8:81:22:18:40:D7:4E:42:0D:97:C8:01:DB:14:49:D0:15:F0:EE:E9:30:DF:2F:4C:B1:5A:5A:19:8E:A1:9C`

> [!IMPORTANT]
> Ambos os fingerprints estão registrados em `/.well-known/assetlinks.json` no backend e no frontend, garantindo que a barra de navegação do navegador seja ocultada automaticamente tanto em builds de desenvolvimento quanto no app instalado pela Google Play.

---

## 3. Como Gerar o Pacote (.aab / .apk)

### Pré-requisitos
1. **Node.js** v18+
2. **Java JDK** 17+
3. **Android SDK** (localizado em `~/Library/Android/sdk` no macOS)
4. Instalar o Bubblewrap CLI globalmente:
   ```bash
   npm install -g @bubblewrap/cli
   ```

### Passo a Passo de Compilação

1. Navegue até a pasta `packages/twa`:
   ```bash
   cd packages/twa
   ```

2. Gere os arquivos do projeto Android nativo a partir do `twa-manifest.json`:
   ```bash
   bubblewrap update
   ```

3. Construa o Android App Bundle (`.aab`) assinado para a Google Play:
   ```bash
   bubblewrap build
   ```
   *Quando solicitado, confirme a senha do keystore (`endorfinapp2026`).*

4. O arquivo final `app-release-signed.aab` será gerado na raiz da pasta `packages/twa/`.

---

## 4. Checklist para Publicação na Google Play Console

1. **Conta Google Play Developer**: Faça login em [play.google.com/console](https://play.google.com/console).
2. **Criar Aplicativo**:
   - Nome: `ENDORFINAPP — A Química do Crescimento`
   - Idioma padrão: `Português (Brasil)`
   - Tipo: `Aplicativo` / `Gratuito`
3. **Google Play App Signing**:
   - Ative o "Play App Signing". Se a Google gerar uma nova chave de assinatura na nuvem, copie o fingerprint SHA-256 gerado pelo Google Play e adicione em `apps/api/src/app.ts` e `apps/web/public/.well-known/assetlinks.json`.
4. **Upload do Pacote**:
   - Vá em **Produção** > **Criar novo lançamento** e envie o arquivo `app-release-signed.aab`.
5. **Classificação de Conteúdo & Privacidade**:
   - Categoria: `Saúde e Boa Forma`
   - Política de Privacidade: URL pública do site (`https://endorfinapp.com/privacidade`)
6. **Capturas de Tela (Screenshots)**:
   - Envie pelo menos 2 capturas de tela do app no formato vertical (ex: 1080×1920 ou 1080×2400).
