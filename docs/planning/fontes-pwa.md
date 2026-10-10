# Fontes para o artigo "app próprio para academia / PWA"

Levantadas em 2026-10-10. Todas são de empresas ou fornecedores de ferramentas, não de estudo independente. Citar como "segundo estudos de caso publicados pelo Google (web.dev)" e nunca prometer o mesmo resultado ao leitor.

## PWA instalável e engajamento
- Rakuten 24 (um mês, contra o fluxo anterior de web móvel): +450% retenção, +310% frequência de visitas, +200% conversão, +150% vendas por cliente. https://web.dev/case-studies/rakuten-24
- Weekendesk: instalados converteram 2,5x mais. https://web.dev/articles/drive-business-success
- Correlação, não causalidade: quem instala já tende a ser mais engajado.
- Medir instalações com o evento `appinstalled` e o modo `standalone` (mesma fonte).

## Push e instalação no iPhone
- Push no iOS só em sites instalados na Tela de Início, desde o iOS 16.4 (março de 2023). Exige manifest com `display: standalone`, service worker e permissão pedida por ação do usuário. https://pushpad.xyz/blog/ios-special-requirements-for-web-push-notifications e https://www.braze.com/resources/articles/mobile-web-push-is-now-supported-on-safari
- Sem banner automático de instalação no iOS: mostrar instrução "Compartilhar → Adicionar à Tela de Início".
- Armazenamento do PWA instalado é separado do Safari (novo login).
- NÃO USAR até conferir nas notas da Apple: Safari 18.4 (Declarative Web Push, Wake Lock) e iOS 26 (sites da Tela de Início abrem como web app por padrão).

## Abandono de apps nativos
- Sem dado confiável de "nunca abrem o app depois de baixar": não usar essa estatística.
- Retenção no dia 30: 1,2% a 5% na maioria das categorias; mais de 90% abandonam em 30 dias. Médias gerais, não de fitness. https://www.braze.com/resources/articles/mobile-app-retention

## Medições próprias (EndorfinApp, build de 2026-10-10)
- Primeiro carregamento (JS + CSS do index.html), com gzip: ~268 KB (954 KB sem compressão). CSS: 20 KB gzip.
- Fontes (5 .woff2): ~165 KB somadas, nem todas carregam em toda tela.
- Precache do service worker: só a página inicial, offline.html, manifest e ícones.
- Não usar o tamanho do `dist` (7,2 MB): inclui o APK e imagens do blog.
- Play Store, consulta de 2026-10-10 (prints do usuário, Android): Befit: Plano e Treino Academia 58 MB, 4,9, 1 mi+ downloads; Personal Virtual 2,6 MB, 4,8, 1 mi+; MFIT Personal 4,4 (22 mil avaliações), 1 mi+, atualizado em 23/04/2026, 49 MB (informado pelo usuário). São apps de treino ao consumidor, não de gestão de academia. Tamanho da loja = download, varia por aparelho.
- Tecnofit Gestão 2.0 (app para gestores, não para alunos), App Store, consulta de 2026-10-10: 77,4 MB, versão 1.1.0 (leitura da página); a busca indicou 78 MB. O valor de 92,7 MB informado antes NÃO se confirmou. Exigência de iOS: fontes divergem (14.0 na busca, 15.0 na página), então não citar. https://apps.apple.com/us/app/-/id6612039534
- Valores de APK em sites alternativos NÃO citar: não são fonte oficial.
- Pendente: tamanho do app para alunos da Tecnofit e cronometragem QR code → primeiro treino.
