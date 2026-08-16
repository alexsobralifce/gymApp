# GymApp Agent Instruction & Documentation Guidelines (AGENTS.md)

Este arquivo serve como base de conhecimento para qualquer assistente de IA/LLM operando neste repositório. Resume arquitetura, regras de negócio, modelo de dados, casos de uso e padrões de código do ecossistema **GymApp** — também conhecido como **ENDORFINAPP**.

---

## 0. Instrução Obrigatória

1. **Leitura de Skills**: Antes de executar qualquer comando, ler todas as skills dentro de `.agent/skills/`. Só prossiga com comandos ou edições após carregar e considerar o conteúdo dessas skills.
2. **Atualização Contínua**: Sempre que modificações no sistema acrescentarem novos requisitos, modelos ou regras de negócio, o arquivo `AGENTS.md` deve ser atualizado para manter a base de conhecimento sincronizada.

---

## 1. Visão Geral do Sistema

O **GymApp (ENDORFINAPP)** é uma plataforma multi-tenant completa de gerenciamento de academias, prescrição de treinos, avaliação física, acompanhamento evolutivo baseado em dados científicos e rede social fitness. Atende 4 perfis de usuário: **Aluno**, **Professor** (Personal Trainer), **Academia** e **Root** (Admin).

### Tech Stack
- **Estrutura**: Monorepo NPM (`workspaces: ["apps/*", "packages/*"]`)
- **Backend (`apps/api`)**: Fastify (TypeScript) + Prisma ORM + PostgreSQL + Redis & BullMQ (Workers de segundo plano)
- **Frontend (`apps/web`)**: React 19 (TypeScript) + Vite 8 + Tailwind CSS v4 + Zustand 5 + React Router 7 + Recharts + Lucide Icons
- **Mobile**: PWA como app instalável com comportamento nativo (sem pull-to-refresh, sem zoom, sem menus de navegador). Código preparado para Capacitor como opção futura dentro de `apps/web`
- **Landing Page**: Projeto separado em `LandingPage/` (Vite + React + Tailwind)
- **Marca**: **ENDORFINAPP** — slogan "A Química do Crescimento" — logotipo ECG + Raio em verde neon

### Origem dos Dados de Exercícios
- **963 exercícios** sincronizados do site https://www.gifdotreino.com
- Script `apps/api/prisma/sync-gifdotreino.ts` — crawla API paginada, baixa descrições PT, faz upsert no banco
- Executado automaticamente no startup do Railway via `apps/api/railway-start.sh`
- Cada exercício tem: nome PT, GIF animado, thumbnail, descrição completa, passos de execução, grupo muscular e equipamento inferidos

### Arquitetura do Backend (Clean Architecture)
```
apps/api/src/
├── presentation/http/routes/  # Fastify route handlers (auth, aluno, professor, academia, treino, root, social, planos, avaliacao)
├── presentation/middlewares/  # jwtAuth, errorHandler
├── application/usecases/      # Casos de uso (Auth, Treino, PrescricaoIA, Correlacao, Gamification, Avaliacao, Planos, Academia)
├── application/workers/       # Gym workers (inatividade, treino-em-aberto, correlacao, mensagens motivacionais)
├── domain/entities/           # TreinoStateMachine
├── domain/errors/             # AppError + subclasses
├── infrastructure/            # Prisma client, Redis, push notifications (Expo + Web), email, storage
├── jobs/social/               # Social workers (fanout, notify-friends, award-badges, update-xp, queues)
├── modules/social/            # Social modules (feed, friendships, clubs, privacy, upload routes)
└── shared/                    # Env config, event bus
```

---

## 1.5. Levantamento de Requisitos do Sistema

### Requisitos Funcionais (RF)

- **RF01 - Autenticação Multi-Role & OAuth**: Cadastro e login divididos em 4 níveis de acesso: `ROOT`, `ACADEMIA`, `PROFESSOR` e `ALUNO`. Suporta login tradicional (e-mail/senha) e autenticação social via Google OAuth (`google_id`). Senha com validação de complexidade (8+ chars, maiúscula, minúscula, número, especial). JWT access token (15min) + refresh token (7d) rotacionado.

- **RF02 - Onboarding e Wizard do Aluno**: Cadastro guiado em 3 passos: Dados Básicos (nome, email, senha, WhatsApp, role), Dados Físicos (data nascimento, peso, altura, sexo) com validação inline debounce 400ms, e Vínculo (academia ativa ou autogestão). Inclui checkbox de consentimento LGPD para feed social.

- **RF03 - Painel de Boas-Vindas (Welcome) + Onboarding Popup**: Tela standalone pós-cadastro com 3 cards explicativos. Conteúdo adaptado: "Aceitar Treino" (aluno com professor) vs "Criar Treino" (autogestão). Controlado por `localStorage` (`gymapp_welcome_seen`). Após o primeiro login no Dashboard, um popup modal (`OnboardingPopup`) aparece para ALUNO e PROFESSOR com links diretos para criar treinos e acessar a documentação, controlado por `localStorage` (`gymapp_onboarding_seen`).

- **RF04 - Gestão de Fichas de Treino & Construtor Mobile-First**:
  - **Professor/Academia**: Criar, editar, excluir e enviar treinos para alunos. Clonagem individual ou em lote para múltiplos alunos. Marcar fichas como templates reutilizáveis.
  - **Aluno**: Criar treinos próprios em autogestão, editar ou excluir treinos salvos (mesmo recebidos de professores, sem apagar histórico de execução).
  - **Experiência Mobile-First com Drawer & Didática PT-BR**: Construtor fluido com Biblioteca de Exercícios em Bottom-Sheet Drawer (`ExerciseLibraryDrawer`), busca instantânea com `useDeferredValue`, botões touch com área mínima de 44px, feedback visual de exercícios já adicionados, reordenação simplificada e inputs numéricos otimizados (`type="tel" inputMode="numeric"`). Modal de prévia didática (`ExercisePreviewModal`) com GIF animado, nome 100% em português, músculos primários/secundários trabalhados, passo a passo numerado de execução (`passos_pt`), explicação conceitual (`descricao_pt`) e dicas de segurança/performance (`dica`).

- **RF05 - Máquina de Estados de Execução**: Transição rígida `CADASTRADO → ENVIADO → ACEITO → EM_ABERTO → EM_EXECUCAO → CONCLUIDO`. Permite cancelamento/abandono `EM_EXECUCAO → ACEITO` com limpeza de sessão e reset do cronômetro. Toda transição inválida → `InvalidStateTransitionError`. Reciclagem automática `CONCLUIDO → ACEITO` pós-finalização. Log imutável append-only em `treino_historico`.

- **RF06 - Execução e Monitoramento de Treino**: Cronômetro com tempo decorrido, campos de carga/repetição por série, coach marks direcionais na primeira execução (`gymapp_first_workout_done`), modal de confirmação ao sair com cancelamento e reset do cronômetro (`POST /treinos/:id/cancelar`), conclusão em lote por exercício ("✓ Concluir Exercício"), modal de avaliação de dificuldade (Fácil/Moderado/Intenso/Muito Intenso), tela de conclusão com troféu e mensagem motivacional. Vibração + notificação local ao fechar/minimizar o app com treino em andamento (`EM_EXECUCAO`), com debounce de 8s (não vibra em bloqueios breves de tela) — hook `useIncompleteWorkoutReminder`.


- **RF07 - Prescrição e Geração por IA**: Assistente de IA em 5 etapas (Objetivo → Nível & Dias → Grupos Musculares → Restrições → Resultado). Algoritmo de scoring/ranking por objetivo, nível, dias, cobertura de grupos musculares e split preferido. Suporte a múltiplos planos complementares (Push+Pull+Legs). Substituição automática de exercícios por restrições via `alternativo_id`.

- **RF28 - Categorização de Grupos Musculares (12 Categorias Visual Mobile-First)**: Grade interativa em 12 categorias canônicas (ABDOMINAL, AERÓBICO, ANTEBRAÇO, BÍCEPS, COSTAS, GLÚTEO, OMBRO, PANTURRILHA, PEITORAL, PERNAS, TRAPÉZIO, TRÍCEPS) com ícones vetoriais em layout mobile-first de 3 colunas (`MuscleCategoryGrid`), organizando os +900 exercícios e GIFs.

- **RF08 - Limite Rígido de Treinos IA**: Máximo **7 treinos gerados por IA por mês** por aluno. Validação em nível de banco (`criado_por_ia: true`). Reset automático dia 1 de cada mês.

- **RF09 - Dashboard de Evolução Mensal**:
  - Frequência de treinos vs meta semanal
  - Volume total (kg) e variação percentual vs mês anterior
  - Duração total e média (minutos) por sessão
  - Maior carga do mês com comparação vs mês anterior
  - Gráficos de Peso Corporal e IMC (Recharts)
  - Correlações de Pearson r (peso×volume, BF×volume, massa magra×volume)
  - Cache de 30 dias com botão "Recalcular"

- **RF10 - Análise Científica & Mensagens Motivacionais**: Sistema de rotação circular de mensagens científicas baseadas em pesquisas (Sports Medicine, JAMA, The Lancet). Workers enviam push notifications com título, resumo e link para estudo.

- **RF11 - Feed Social & Notificações**: Feed interativo com paginação por cursor composto (`data+id`). Compartilhamento automático de início/fim de treino, recordes e conquistas. Curtidas e comentários (280 chars). Badge de atividade recente via polling de 30s. Fanout de posts para amigos via worker BullMQ.

- **RF12 - Gestão de Colegas de Academia**: Painel lateral (`AcademySidebar`) listando alunos da mesma academia não seguidos, com botão "Seguir". Visível em telas XL+ e no drawer mobile.

- **RF13 - Gestão de Clubes e Leaderboard**: Clubes vinculados a academias (1:1) ou temáticos. Membros acumulam XP semanal. Reset anual de XP. Leaderboard top 20. Feed do Clube (`/clubes/:id`), listagem de membros com avatar, adesão e saída de clubes, criação de clubes temáticos. Worker de badges (ex: "Primeiros 10 Treinos").

- **RF14 - Aprovação de Vínculos em Duas Camadas**: Professor → Academia (aprovação Academia) → Root (aprovação final). Status: `PENDENTE_ACADEMIA → PENDENTE_ROOT → ATIVO | REJEITADO | REMOVIDO`.

- **RF15 - Identidade Visual & Slogan**: Marca **ENDORFINAPP**, slogan **"A Química do Crescimento"**, símbolo ECG + Raio em verde neon. 3 temas dinâmicos (Lima & Navy, Vermelho & Carvão, Violeta & Grafite) × 2 modos (Day/Night).

- **RF16 - Redirecionamento Obrigatório de Logoff**: Ao fazer logoff ou receber 401, redireciona para Landing Page raiz (`/`).

- **RF17 - Avaliação Física Integrada (PAR-Q+ / Antropometria / Composição Corporal / Cardio / Neuro)**:
  - Triagem PAR-Q+ e risco cardíaco (BAIXO/MODERADO/ALTO)
  - Antropometria: IMC (OMS), RCQ, perímetros
  - Composição corporal: Protocolos Jackson-Pollock 7 dobras, 3 dobras e Guedes
  - Cálculo de densidade corporal, % gordura (Siri), massa gorda e massa magra
  - Classificação de % gordura por sexo (Essencial/Atleta/Bom/Normal/Elevado)
  - Teste de Cooper para VO₂max
  - Estimativa de 1RM (fórmula de Brzycki)
  - Zonas de frequência cardíaca (Karvonen)
  - Avaliação postural, flexibilidade (Banco de Wells), neuromotora
  - Geração automática de laudo em markdown com referências bibliográficas
  - Prescrição de treino baseada nos resultados da avaliação
  - Comparação entre avaliações (deltas de peso, IMC, % gordura, massa magra, VO₂max)

- **RF18 - Biblioteca de Planos Científicos**: Planos de treino modelados por objetivo (HIpertrofia/Força/Emagrecimento/Saúde), nível (Iniciante/Intermediário/Avançado), sexo-alvo, dias por semana e split. Sessões com exercícios, séries, reps, restrições incompatíveis e exercícios alternativos. API de recomendação, filtro e adoção com criação automática de treinos.

- **RF19 - Gamificação e Sistema de XP**: Cálculo de XP por treino concluído (base + volume bonus + duração bonus + streak multiplier). Streak tracking por dias consecutivos. Atualização de XP nos clubes com reset anual. Sistema de badges com worker dedicado.

- **RF20 - Upload de Mídia e Fotos**: Upload de avatar (`POST /auth/avatar`) e fotos do feed (`POST /social/upload/foto`). Validação de magic bytes (JPG, PNG, GIF, WebP) para segurança. Servidas via rotas estáticas Fastify com cache `max-age=86400`. Helper `resolveMediaUrl()` no frontend. Fotos de perfil exibidas no Header, PostCard, AcademySidebar.

- **RF21 - Workers de Segundo Plano (BullMQ + Redis)**:
  - **Inatividade (10min)**: Notifica aluno e professor quando treino fica ocioso
  - **Treino longo (60min)**: Avisa quando sessão ultrapassa 1 hora
  - **Treino em aberto (23:30)**: Marca treinos não iniciados como `EM_ABERTO`
  - **Mensagens Motivacionais**: Envio circular de mensagens científicas com push
  - **Correlação de Desempenho**: Cálculo assíncrono de Pearson r
  - **Social Fanout**: Cria posts no feed quando treino inicia/conclui
  - **Social Notify**: Push notification para até 50 amigos
  - **Award Badges**: Concede badges por conquistas
  - **Update XP**: Atualiza XP semanal nos clubes

- **RF22 - Verificação de E-mail e Google OAuth**: Suporte a `email_verified`, `email_verify_code` com expiração. Login e Cadastro social via Google (`POST /auth/google`) presentes em todas as telas de autenticação (`Login.tsx`, `RegisterWizard.tsx`), com fallback robusto e detecção de novo usuário (`isNew`).

- **RF23 - Notícias Científicas de Saúde e Treino**: Módulo `NoticiasService` com extração contínua e rica de feeds RSS do Google News em PT-BR (exercícios, musculação, longevidade, endorfina, nutrição), decodificação de entidades HTML, remoção de lixo, associação de capas temáticas de alta resolução do Unsplash, paginação e sincronização sob demanda via `POST /noticias/refresh`. Interface em formato de revista digital com filtros de categoria, busca instantânea e skeletons.

- **RF24 - Clube de Parceiros/Vantagens**: Vitrine de parceiros do ecossistema com descontos exclusivos em suplementação, vestuário, nutrição. Promoções destacadas com links externos.

- **RF25 - Smartwatches & Integração com Dispositivos (Open Wearables)**: Sincronização contínua a cada 30 segundos ao longo do dia para consolidação da FC Média diária (fidelidade aos dados reais recebidos do relógio) e acúmulo incremental das calorias ativas do dia (`00:00:00` a `23:59:59`) com base nas medidas vitais cadastradas (peso, altura, idade/nascimento, sexo) e treinos executados. Telemetria de alta frequência a cada 5 segundos durante treinos ativos (`EM_EXECUCAO`) com cálculo contínuo de FC Média da sessão, FC Máxima e gasto calórico em tempo real (Keytel et al.). Painel `WearableConnectCard`, guias `HuaweiBridgeGuide` e diagnóstico em `DebugOverlay`.

- **RF26 - PWA & Onboarding de Permissões**: PWA como via principal de instalação a partir do site, com modal inicial de permissões (`OnboardingPermissionsModal`) pós-login/cadastro solicitando autorização de push notifications e guiando a instalação tanto no Android/Chrome (`promptInstall`) quanto no iOS/Safari (passo a passo de Adicionar à Tela de Início). Polimento de app nativo: `overscroll-behavior: none`, `user-select: none`, `touch-action: manipulation`.

- **RF27 - Root Admin & Moderação Social**: Painel Root com visão global (academias ativas/pendentes, professores, alunos). CRUD de usuários com busca, filtro, ativação/desativação e reset de senha. Moderação de feed social (excluir posts, gerenciar clubes e amizades). Aprovação/rejeição de academias e vínculos.

- **RF28 - Privacidade e Consentimento LGPD**: Três controles independentes: `visibilidadePadrao` (AMIGOS/PUBLICO/PRIVADO), `permiteBuscaEmail`, `consentiuFeedSocial`. Posts com visibilidade PRIVADO não são criados no feed. Busca por email nunca revela se o email existe.

#### Requisitos Não-Funcionais (RNF)

- **RNF01 - Isolamento Multi-Tenant**: Segregacao de dados entre alunos, professores e academias via `professor_id`, `academia_id` e `tenantId`.
- **RNF02 - Processamento Assíncrono**: Filas BullMQ com Redis para jobs de segundo plano (cálculos, pushes, fanout).
- **RNF03 - Responsividade & Customização Estética**: TailwindCSS v4 com 3 temas × 2 modos (6 combinações). Drawer mobile, sidebar desktop, AcademySidebar XL+.
- **RNF04 - Otimização de Imagens e Headers**: URLs absolutas, rotas dedicadas para uploads, cache `max-age=86400`.
- **RNF05 - SEO e Semântica**: HTML5 semântico, IDs exclusivos para testes.
- **RNF06 - Autenticação JWT com Refresh**: Access token 15min + refresh token **30d** com rotação. Auto-refresh em 401 no frontend. Sem limite de inatividade no servidor — sessão sobrevive a longos períodos em background. Tokens **não** são removidos em falhas de rede (offline) — apenas em expiração definitiva. Logout só via botão "Sair" explícito.
- **RNF07 - Limite de Upload**: 5MB máximo via `@fastify/multipart`.
- **RNF08 - CORS e Segurança**: Helmet com CSP configurado, CORS com origens permitidas (Railway, localhost, Capacitor, endorfinapp.com, endorfinapp.com.br). Preflight handler explícito para `OPTIONS /auth/*`.
- **RNF09 - Rate Limiting**: `@fastify/rate-limit` aplicado por rota: login/reset-password 3 req/min, register/change-password 5 req/min, verify-email/resend-code/refresh 10 req/min, treinos IA 10 req/hora, root reset-password 3 req/min.
- **RNF10 - Magic Bytes Validation**: Uploads de imagem validam magic bytes (JPG, PNG, GIF, WebP) antes de salvar, prevenindo arquivos maliciosos com MIME forjado.
- **RNF11 - Complexidade de Senha**: Mínimo 8 caracteres, exigindo ao menos 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial. Validado no register e change-password.
- **RNF12 - Polimento PWA (Comportamento de App Nativo)**: CSS global (`overscroll-behavior-y: none`, `user-select: none`, `-webkit-touch-callout: none`, `touch-action: manipulation`) elimina gestos de navegador no PWA instalado. `beforeunload` nativo removido da tela de execução. Diálogos `window.confirm` substituídos por `ConfirmModal` estilizado.
- **RNF13 - Resiliência de Sessão Offline**: `refreshTokens()` distingue falha de rede de expiração real — tokens preservados offline. `fetchUser()` só limpa tokens em erro 401 real. `useIdleLogout` não redireciona mais — apenas heartbeat.

---

## 2. Modelo de Dados (Prisma Schema)

### Enums
```
Role:               ROOT | ACADEMIA | PROFESSOR | ALUNO
AcademiaStatus:     PENDENTE | ATIVO | REJEITADO
Sexo:               MASCULINO | FEMININO
VinculoStatus:      PENDENTE_ACADEMIA | PENDENTE_ROOT | ATIVO | REJEITADO | REMOVIDO
TreinoStatus:       CADASTRADO | ENVIADO | ACEITO | RECUSADO | EM_ABERTO | EM_EXECUCAO | CONCLUIDO
TreinoAtor:         ALUNO | PROFESSOR | ACADEMIA | SISTEMA
NotificacaoTipo:    PROFESSOR_ATRIBUIDO | NOVO_TREINO
FriendshipStatus:   PENDENTE | ACEITO | BLOQUEADO
PostTipo:           TREINO_INICIADO | TREINO_CONCLUIDO | RECORDE_PESSOAL | BADGE_CONQUISTADO | DESAFIO_COMPLETO
Visibilidade:       AMIGOS | PUBLICO | PRIVADO
ClubTipo:           ACADEMIA | TEMATICO
AvaliacaoStatus:    RASCUNHO | CONCLUIDA
RiscoCardiaco:      BAIXO | MODERADO | ALTO
```

### Usuario (`usuarios`)
`id (cuid), email (unique), senha_hash?, nome, role, telefone?, foto_url?, ativo, google_id? (unique), email_verified, email_verify_code?, email_verify_code_expira?, expo_push_token?, web_push_subscription? (Json), ultima_atividade_em?, proxima_noticia_em?, criado_em, atualizado_em`
- Relacionamentos: academia (1:1), aluno (1:1), professor (1:1), refreshTokens[], avaliacoesAvalidadas[], noticiasEnviadas[]

### RefreshToken (`refresh_tokens`)
`id, token (unique), usuario_id, expira_em, criado_em`

### Academia (`academias`)
`id (cuid), usuario_id (unique FK), nome, cnpj (unique), status, max_professores (default 20), rejeitado_motivo?, criado_em, atualizado_em`
- Relacionamentos: usuario, alunos[], professores[] (ProfessorAcademia M:N)

### Professor (`professores`)
`id (cuid), usuario_id (unique FK), cref?, criado_em, atualizado_em`
- Relacionamentos: usuario, academias[] (ProfessorAcademia M:N), alunos[]

### ProfessorAcademia (`professor_academia`) — Vínculo M:N com aprovação 2 camadas
`id (cuid), professor_id, academia_id, status (VinculoStatus), criado_em, atualizado_em`
- `@@unique([professor_id, academia_id])`
- Status: `PENDENTE_ACADEMIA → PENDENTE_ROOT → ATIVO | REJEITADO | REMOVIDO`

### Aluno (`alunos`)
`id (cuid), usuario_id (unique FK), professor_id?, academia_id?, data_nascimento?, peso_kg?, altura_cm?, sexo (Sexo?), objetivo_treino?, nivel_treino?, restricoes (String[]), visibilidade_padrao (Visibilidade, default AMIGOS), permite_busca_email (Boolean, default true), consentiu_feed_social_em?, criado_em, atualizado_em`
- `professor_id = null` → autogestão
- `academia_id = null` → sem academia
- Relacionamentos: usuario, professor?, academia?, treinos[], medidas[], notificacoes[], correlacao?, avaliacoes[], mensagensEnviadas[]

### Treino (`treinos`)
`id (cuid), aluno_id, nome, dias_semana (Int[]), status (TreinoStatus), is_template (Boolean, default false), criado_por_ia (Boolean, default false), avaliacao_dificuldade?, iniciado_em?, finalizado_em?, notificado_inatividade_em?, notificado_longo_em?, notificado_concluir_em?, ultima_atividade_em?, criado_em, atualizado_em`
- Máquina de estados: CADASTRADO → ENVIADO → ACEITO → EM_ABERTO → EM_EXECUCAO → CONCLUIDO
- Relacionamentos: aluno, exercicios[] (TreinoExercicio), historico[], execucoes[]

### TreinoHistorico (`treino_historico`) — Append-only
`id (cuid), treino_id, status_anterior, status_novo, ator_id, ator_tipo, timestamp, duracao_segundos?`

### Exercicio (`exercicios`)
`id (cuid), nome, maquina?, dica?, imagem_url?, gif_url?, descricao_pt?, passos_pt (String[]), musculo_alvo?, musculos_secundarios (String[]), nivel?, grupo_muscular?, equipamento?, criado_em, atualizado_em`
- 963 exercícios sincronizados do GifDoTreino

### TreinoExercicio (`treino_exercicios`)
`id (cuid), treino_id, exercicio_id, ordem, series, repeticoes, carga_sugerida_kg?`
- `@@unique([treino_id, ordem])`

### ExecucaoExercicio (`execucao_exercicios`) — Registro real de série executada
`id (cuid), treino_id, exercicio_id, serie_numero, repeticoes, carga_kg, registrado_em`

### MedidaCorporal (`medidas_corporais`)
`id (cuid), aluno_id, peso_kg?, altura_cm?, percentual_bf?, massa_magra_kg?, imc? (calculado), data, observacao?`

### Notificacao (`notificacoes`)
`id (cuid), aluno_id, tipo, mensagem, dados? (Json), lida (default false), criado_em`

### MensagemMotivacional (`mensagens_motivacionais`)
`id (cuid), titulo, resumo, url_estudo, criado_em`

### MensagemMotivacionalEnviada (`mensagens_motivacionais_enviadas`) — Controle de rotação circular
`id (cuid), aluno_id, mensagem_id, enviada_em`

### Noticia (`noticias`) — Engine de notícias (RSS Google News)
`id (cuid), titulo, resumo, url (unique), fonte?, imagem_url?, criado_em`
- Sincronizadas pelo worker `news-fetch` (a cada 6h) via RSS do Google News em PT-BR

### NoticiaEnviada (`noticias_enviadas`) — Controle de rotação circular por usuário
`id (cuid), usuario_id, noticia_id, enviada_em` — `@@unique([usuario_id, noticia_id])`
- `proxima_noticia_em` no Usuario agenda o próximo envio (aleatório 1–7 dias)

### CorrelacaoDesempenho (`correlacoes_desempenho`) — Cache de correlações
`id (cuid), aluno_id (unique FK), peso_volume_r?, bf_volume_r?, massa_magra_volume_r?, volume_semanal (Json), pontos (Json), calculado_em`

### Modelos de Wearables & Smartwatches (`wearable_*`)
- **WearableIntegracao (`wearable_integracoes`)**: `id (cuid), aluno_id, provedor, user_id_ext, access_token_enc?, refresh_token_enc?, token_expira_em?, ativo (default true), criado_em, atualizado_em` — `@@unique([aluno_id, provedor])`
- **WearableEvento (`wearable_eventos`)**: `id (cuid), aluno_id, provedor, tipo, payload_raw (Json), processado (default false), erro_msg?, recebido_em` — índice `[aluno_id, recebido_em]`

### Modelos Sociais (`social_*`)
- **SocialFriendship (`social_friendships`)**: `id, aluno_id, amigo_id, status (FriendshipStatus), criado_em` — `@@unique([aluno_id, amigo_id])`, índice `[amigo_id, status]`
- **SocialPost (`social_posts`)**: `id, aluno_id, treino_id?, clube_id?, autor_nome, autor_foto_url?, grupo_muscular_resumo?, academia_nome?, tipo (PostTipo), visibilidade (Visibilidade), midia_url?, curtidas_count, comentarios_count, criado_em` — índices `[aluno_id, criado_em]`, `[clube_id, criado_em]`, `[visibilidade, criado_em]`, unique `[treino_id, aluno_id, tipo]`
- **SocialLike (`social_likes`)**: `id, post_id, aluno_id` — `@@unique([post_id, aluno_id])`, índice `[post_id]`
- **SocialComment (`social_comments`)**: `id, post_id, aluno_id, autor_nome, texto (VarChar 280), criado_em` — índice `[post_id, criado_em]`
- **SocialClub (`social_clubs`)**: `id, academia_id? (unique), nome, tipo (ClubTipo: ACADEMIA|TEMATICO), criado_em`
- **SocialClubMember (`social_club_members`)**: `id, clube_id, aluno_id, xp_semana (Int, default 0), xp_reset_ano (Int, default 2026), criado_em` — `@@unique([clube_id, aluno_id])`, índice `[clube_id, xp_semana]`

### Modelos da Biblioteca de Planos (`planos_*`)
- **PlanoBiblioteca (`planos_biblioteca`)**: `id (cuid), codigo (unique), nome, descricao?, objetivo, nivel, sexo_alvo (MASCULINO|FEMININO|AMBOS), dias_por_semana, split_tipo, ativo, criado_em`
- **PlanoSessao (`plano_sessoes`)**: `id (cuid), plano_id, nome, dia_label, ordem` — Cascade delete
- **PlanoSessaoExercicio (`plano_sessao_exercicios`)**: `id (cuid), sessao_id, exercicio_id, ordem, tipo, series, repeticoes_min, repeticoes_max, carga_sugerida_kg?, restricoes_incompativeis (String[]), alternativo_id?` — `@@unique([sessao_id, ordem])`, Cascade delete

### Modelos de Avaliação Física (`avaliacao_fisicas`)
- **AvaliacaoFisica (`avaliacoes_fisicas`)**: `id (cuid), aluno_id, avaliador_id, data, status (AvaliacaoStatus), parq_positivo, risco_cardiaco (RiscoCardiaco), liberado_teste_max, anamnese_json? (Json), pas?, pad?, fc_repouso?, peso_kg?, estatura_m?, imc?, rcq?, perimetros_cm? (Json), protocolo_dobras?, soma_dobras_mm?, densidade_corporal?, percentual_gordura?, massa_gorda_kg?, massa_magra_kg?, classificacao_gc?, postural_json? (Json), flexibilidade_json? (Json), cardio_json? (Json), neuro_json? (Json), laudo_markdown?, prescricao_json? (Json), criado_em, atualizado_em` — índices `[aluno_id]`, `[avaliador_id]`

### Modelo de Avaliação do Sistema (`avaliacoes_sistema`)
- **AvaliacaoSistema (`avaliacoes_sistema`)**: `id (cuid), aluno_id, nota (Int 1-5), respostas (Json), mensagem?, criado_em` — `@@index([aluno_id])`, Cascade delete. Avaliação pós-treino do sistema (NPS/nota + questionário `criar_treino`/`navegacao`/`execucao`/`recomendacao`). Sem constraint de unicidade — múltiplos envios permitidos via menu.

---

## 3. Regras de Negócio Detalhadas

### 3.1 Treino — Máquina de Estados & Execução

Estados: `CADASTRADO → ENVIADO → ACEITO → EM_ABERTO → EM_EXECUCAO → CONCLUIDO`

| De | Para | Ator | Condição |
|---|---|---|---|
| `CADASTRADO` | `ENVIADO` | `PROFESSOR`, `SISTEMA` | Professor envia ou migração automática |
| `CADASTRADO` | `ACEITO` | `ALUNO` | Autogestão apenas |
| `ENVIADO` | `ACEITO`, `RECUSADO` | `ALUNO` | Aluno responde |
| `ACEITO` | `EM_EXECUCAO`, `EM_ABERTO` | `ALUNO`, `SISTEMA` | Inicia ou worker marca pendente |
| `EM_ABERTO` | `EM_EXECUCAO` | `ALUNO` | Retoma treino |
| `EM_EXECUCAO` | `CONCLUIDO` | `ALUNO` | Finaliza |
| `CONCLUIDO` | `ACEITO` | `SISTEMA` | Reciclagem automática |

#### Validações e Retomada de Sessão
- Registro de séries via `POST /treinos/:id/execucoes` restrito a `status = EM_EXECUCAO`.
- Retomada de sessão preserva `iniciado_em` e timer (não reseta).
- Isolamento de execuções por sessão via `execucoesDaSessao(iniciadoEm)`.
- Botão "Voltar" em `TreinoInicio` e modal de confirmação `ConfirmModal` (z-40) ao clicar em "Sair".
- Filtro de biblioteca com mapeamento de aliases para equipamentos (`exerciseFilters.ts`).
- Conclusão em lote por exercício: botão "✓ Concluir Exercício" registra todas as séries pendentes de uma vez.
- Reciclagem automática ao finalizar: `CONCLUIDO → ACEITO`, limpando `iniciado_em`/`finalizado_em`.
- Detecção de **primeiro treino** (`POST /treinos/:id/finalizar` → `primeiroTreino: boolean`): conta registros em `treino_historico` com `status_novo = CONCLUIDO` vinculados a treinos do aluno ANTES da conclusão atual. Se 0 conclusões anteriores → `true`. Não usa `treinos.status` (recicla `CONCLUIDO → ACEITO`).

#### Notificações de Sessão (Workers)
- **10min ocioso**: Push para aluno + professor com URL de retomada.
- **60min longo**: Push "Treino longo demais" (1 vez por sessão).
- **23:30 diário**: Treinos `ACEITO` do dia viram `EM_ABERTO`, professor é notificado.

#### Lembrete por Vibração ao Fechar App (Treino em Andamento)
- Hook `useIncompleteWorkoutReminder` no `TreinoExecucao` escuta `visibilitychange → hidden` com debounce de 8s (cancelado ao voltar visível — bloqueio breve de tela não dispara) e `pagehide` (fechamento imediato).
- Quando dispara: `navigator.vibrate` (Android) + `registration.showNotification` com `vibrate` e link direto para `/treino/:id/execucao` (retomada).
- Suprimido durante finalização (`avaliando` ou `showAvaliacao`). Uma vez por ocultação.
- Rede de segurança: worker `inatividade-30min` já envia push com vibração para treino ocioso há 10min.

#### Clonar Treino
- `POST /treinos/:id/clonar` — clone para 1 aluno. Copia nome, dias_semana, exercícios. Status `CADASTRADO`.
- `POST /treinos/:id/clonar-lote` — clone para múltiplos alunos em transação.
- Tenant check duplo (fonte e destino).
- Auto-envio após clone no frontend.

#### Template de Treino
- `POST /treinos/:id/marcar-template` — toggle `is_template` (PROFESSOR/ACADEMIA)
- `GET /professores/templates` — lista treinos com `is_template = true`
- Dropdown "Criar a partir de Template" pré-popula exercícios, séries e reps
- Badge "Template" + botão toggle + modal "Clonar em Lote" com multi-seleção

#### Dashboard de Evolução Mensal
- `GET /alunos/evolucao/mensal` — frequência, volume, duração, maior carga, variação percentual
- Divisão em 4 semanas (S1-S4) com volume semanal
- Meta semanal configurável (default 3 treinos/semana)
- Cargas semanais por exercício

### 3.2 Aluno — Regras de Negócio

#### Perfil (A1-A4)
- `POST /alunos/perfil` — upsert. Cria `MedidaCorporal` automática se peso+altura fornecidos
- `GET /alunos/perfil` retorna perfil completo com professor, academia, sexo e dados do usuário

#### Cadastro (Wizard de 3 passos)
- Passo 1: nome, email, senha, WhatsApp, role
- Passo 2: data nascimento, peso (20-500kg), altura (50-250cm), sexo — validação inline debounce 400ms, checkbox consentimento social
- Passo 3: dropdown academias ativas + "Autogestão (sem academia)"
- Barra de progresso visual (`StepIndicator`) com 3 círculos numerados

#### Onboarding / Boas-Vindas
- Rota `/welcome` — standalone (sem AppShell)
- 3 cards: Aceitar/Criar Treino, Registrar Execução, Ver Evolução
- Controlado por `localStorage` (`gymapp_welcome_seen`)

#### Coach Marks na Execução
- 3 tooltips sequenciais na primeira execução: Timer, Série, Finalizar
- Overlay semi-transparente, tooltip com seta, botão "Próximo"/"Entendi"
- Controlado por `localStorage` (`gymapp_first_workout_done`)

#### Dados do Aluno, Upload de Avatar & Gestão de Vínculos
- Rota `/dados` para alteração de dados pessoais, upload de foto (`POST /auth/avatar`), dados físicos com recálculo visual de IMC, troca/remoção de academia (`DELETE /alunos/academia`), gestão de professor/autogestão (`PATCH /alunos/professor`).

#### Gestão Própria & Edição de Treinos pelo Aluno
- Aluno pode criar treinos próprios (`POST /treinos/autogestao`) mesmo se tiver professor.
- **Professor** também pode criar treinos próprios via autogestão (roteiro `/treinos/autogestao`, rotas de execução e tenant checks aceitam role PROFESSOR). Internamente, um registro self de `alunos` é criado sob demanda (chaveado por `usuario_id`, com `professor_id = null`), mantendo `treinos.aluno_id` obrigatório — sem mudança de schema.
- Edição de treino salvo: `PATCH /treinos/:id` via `CriarTreinoAluno` em modo edit.
- Exclusão de treinos que possui (`DELETE /treinos/:id`).
- Edição não apaga histórico de execução nem altera status.

#### Prescrição IA com Grupos Musculares
- Wizard `/treino/ia` em 5 passos: Objetivo → Nível & Dias → Grupos Musculares → Restrições → Resultado.
- Atalhos de split (FULL_BODY, PUSH, PULL, LEGS, UPPER, LOWER) + chips multi-select.
- Algoritmo de scoring: objetivo (+20), nível (+15), dias exatos (+30), split preferido (+25), cobertura de grupos (+40), penalidade por restrições (-8 por incompatibilidade sem alternativa).
- Pode retornar múltiplos planos complementares.
- Geração por grupos musculares: busca exercícios no banco, ordena por equipamento (iniciantes preferem máquinas), limita por tempo disponível.

#### Limite de Treinos IA
- Máximo 7 treinos `criado_por_ia = true` por mês por aluno.
- Verificação em nível de banco no ato de criação.

#### Conclusão em Lote por Exercício
- Botão "✓ Concluir Exercício" registra todas as séries pendentes do exercício de uma vez.
- Usa valores informados nos inputs ou defaults (carga sugerida / repetições do treino).

### 3.3 Módulo Social, Amizades e Mídia

#### Amizades
- `POST /social/amizades/solicitar` — por email (proteção: nunca revela se email existe)
- `POST /social/amizades/solicitar-por-id` — por ID (para colegas de academia)
- `PATCH /social/amizades/:id/responder` — ACEITAR ou RECUSAR (recusar deleta)
- `GET /social/amizades` — lista amigos aceitos (bidirecional)
- `DELETE /social/amizades/:id` — desfazer (qualquer lado)

#### Feed / Mural Social
- Eventos de treino disparam workers: fanout-post → notify-friends
- Tipos de post: TREINO_INICIADO, TREINO_CONCLUIDO, RECORDE_PESSOAL, BADGE_CONQUISTADO, DESAFIO_COMPLETO
- Se visibilidade = PRIVADO, nenhum post é criado
- Paginação por cursor composto (`criado_em` + `id`)
- Badge de atividade via polling de 30s

#### Upload de Fotos
- `POST /auth/avatar` — upload para `public/uploads/avatars/`
- `POST /social/upload/foto` — upload para `public/uploads/feed/:year/:month/`
- Rotas estáticas: `GET /uploads/avatars/:filename`, `GET /uploads/feed/:year/:month/:filename`
- Cache configurado: `public, max-age=86400`
- Helper frontend: `resolveMediaUrl()` em `src/lib/media.ts`

#### Clubes
- `ACADEMIA` — vinculado 1:1 a uma academia. Membros entram automaticamente.
- `TEMATICO` — clubes independentes com código de convite.
- Leaderboard top 20 por XP semanal.
- XP ganho por treino concluído (base + bônus).
- Feed do clube (`/clubes/:id`): posts dos treinos dos membros.
- Listagem de membros com avatar, adesão e saída de clubes.

### 3.4 Avaliação Física (PAR-Q+ / Antropometria / Composição)

#### Criação de Avaliação
- `POST /avaliacoes` — cria avaliação completa com cálculos automáticos:
  - IMC e RCQ calculados a partir de peso, estatura, cintura e quadril
  - Protocolos de dobras cutâneas: Jackson-Pollock 7 dobras, 3 dobras (masculino/feminino), Guedes
  - Equação de Siri para % gordura a partir da densidade corporal
  - Classificação OMS de IMC
  - Classificação de % gordura por sexo (Essencial, Atleta, Bom, Normal, Elevado)
- VO₂max estimado pelo Teste de Cooper (12 min)
- FC máx (Tanaka: 208 - 0.7×idade) e zonas cardíacas (Karvonen com FC repouso)
- 1RM estimado pela fórmula de Brzycki

#### Laudo e Prescrição
- Geração de laudo integrado em markdown com 7 seções:
  1. Triagem PAR-Q+
  2. Sinais Vitais
  3. Composição Corporal
  4. Capacidade Cardiorrespiratória (VO₂max)
  5. Força Neuromuscular (1RM)
  6. Flexibilidade
  7. Metas SMART
- Prescrição automática de treino baseada nos resultados
- Comparação entre duas avaliações com cálculo de deltas

### 3.5 Gamificação

#### Cálculo de XP
- `BASE_XP = 100` por treino concluído
- `volumeBonus = totalKg / 100`
- `durationBonus = durationMin * 0.5`
- `streakMultiplier = 1.5` se streak >= 3 dias consecutivos
- `total = (BASE_XP + volumeBonus + durationBonus) * streakMultiplier`
- XP acumulado no clube da academia (se houver)
- Reset anual de XP

#### Badges
- Worker `award-badges` verifica conquistas ao finalizar treino
- Badge "Primeiros 10 Treinos" — concede 1 vez (idempotente)
- Cria post no feed com `tipo: BADGE_CONQUISTADO`

### 3.6 Design System & Temas Dinâmicos

Design system baseado em **variáveis CSS customizadas** (`--color-*`) em `apps/web/src/index.css`, gerenciadas pela store `useThemeStore` em `apps/web/src/stores/theme.ts`.

#### Fontes
| Variável | Família | Uso |
|---|---|---|
| `--font-sans` | `DM Sans` + `Inter` (fallback) | Corpo e interface geral |
| *(headings)* | `Barlow Condensed` | Títulos e badges |

#### Estrutura de Temas
- **3 Marcas (brand)**: `lime` | `red` | `violet`
- **3 opções de modo**: `auto` | `day` | `night` → efetivo sempre `day` ou `night` no DOM
- **Auto**: só horário local (claro 06h–18h, escuro 18h–06h) — **não** segue dark mode do SO
- **Dia / Noite**: forçam fundo claro / escuro 24h
- **6 combinações de cor** via `data-theme` × `data-mode` no DOM
- **Persistência**: `localStorage` (`gymapp_theme`, `gymapp_mode`)

#### Cascata de tema (mobile = desktop)
- Tokens **somente** em `html[data-mode="day|night"]` e `html[data-theme][data-mode]` — **nunca** em `:root` + night juntos.
- `html, body { background-color: var(--color-surface); color: var(--color-text); }` (viewport-independente).
- Sem media query de layout alterando cor. Dia = fundo claro; Noite = fundo escuro.
- Doc completa: `docs/sistema-de-temas-e-modo-auto.md`

#### Paleta 1: Lima & Navy (`data-theme="lime"`)
| Token | Night | Day |
|---|---|---|
| `--color-primary` | `#B8F000` | `#6B9A00` |
| `--color-primary-dark` | `#8FCC00` | `#557A00` |
| `--color-primary-hover` | `#C8FF33` | `#7BB000` |
| `--color-primary-active` | `#A3D900` | `#5C8500` |
| `--color-primary-light` | `#D4F56A` | `#A3D930` |
| `--color-primary-foreground` | `#000000` | `#FFFFFF` |
| `--color-surface` | `#0A1628` | `#FFFFFF` |
| `--color-surface-card` | `#122040` | `#F4F6F9` |
| `--color-surface-input` | `#1A2D52` | `#EEF1F5` |
| `--color-text` | `#F7F9FC` | `#0A1628` |
| `--color-text-muted` | `#B8C5D9` | `#4A5A72` |
| `--color-text-disabled` | `#6B7A94` | `#8A96A8` |
| `--color-border` | `#2A3F66` | `#E2E5EB` |
| `--color-ring` | `#B8F000` | `#6B9A00` |

---

#### Paleta 2: Vermelho & Carvão (`data-theme="red"`)

| Token | Night | Day |
|---|---|---|
| `--color-primary` | `#FF4D4D` | `#DC2626` |
| `--color-primary-dark` | `#E02020` | `#B91C1C` |
| `--color-primary-hover` | `#FF6B6B` | `#EF4444` |
| `--color-primary-active` | `#F03333` | `#C41E1E` |
| `--color-primary-light` | `#FF8A8A` | `#F87171` |
| `--color-primary-foreground` | `#FFFFFF` | `#FFFFFF` |
| `--color-surface` | `#0F0F0F` | `#FFFFFF` |
| `--color-surface-card` | `#1C1C1C` | `#F5F5F6` |
| `--color-surface-input` | `#2C2C2C` | `#EEEFF1` |
| `--color-text` | `#FAFAFA` | `#141414` |
| `--color-text-muted` | `#C8C8C8` | `#4A4A4A` |
| `--color-text-disabled` | `#6E6E6E` | `#949494` |
| `--color-accent` | `#FBBF24` | `#D97706` |
| `--color-border` | `#3A3A3A` | `#E4E5E8` |
| `--color-ring` | `#FF4D4D` | `#DC2626` |

#### Paleta 3: Violeta & Grafite (`data-theme="violet"`)
| Token | Night | Day |
|---|---|---|
| `--color-primary` | `#A78BFA` | `#B794F6` |
| `--color-primary-dark` | `#8B5CF6` | `#9F7AEA` |
| `--color-primary-hover` | `#C4B5FD` | `#C4B5FD` |
| `--color-primary-active` | `#9F7AEA` | `#A78BFA` |
| `--color-primary-light` | `#DDD6FE` | `#DDD6FE` |
| `--color-primary-foreground` | `#000000` | `#000000` |
| `--color-surface` | `#0C0C0E` | `#FFFFFF` |
| `--color-surface-card` | `#16161A` | `#F5F5F8` |
| `--color-surface-input` | `#222228` | `#EEEFF3` |
| `--color-text` | `#FAFAFC` | `#12121A` |
| `--color-text-muted` | `#B8B8C8` | `#42425A` |
| `--color-text-disabled` | `#6B6B7B` | `#7E7E96` |
| `--color-accent` | `#C6FF33` | `#65A30D` |
| `--color-border` | `#33333A` | `#E0E0EA` |
| `--color-ring` | `#A78BFA` | `#B794F6` |

#### Tokens Semânticos Comuns
| Token | Night | Day |
|---|---|---|
| `--color-destructive` | `#FF6B6B` | `#DC2626` |
| `--color-destructive-foreground` | `#FFFFFF` | `#FFFFFF` |
| `--color-success` | `#34D399` | `#059669` |
| `--color-warning` | `#FBBF24` | `#D97706` |
| `--color-info` | `#60A5FA` | — |
| `--color-white` | `#FFFFFF` | `#FFFFFF` |

#### Glassmorphism
`--color-glass-bg` (fundo blur), `--color-menu-hover`, `--color-menu-border`

#### Utilitários CSS (`@utility`)
`glass`, `gradient-primary`, `gradient-card`, `gradient-hero`, `gradient-accent`, `scrollbar-hide`, `safe-bottom`, `safe-top`, `safe-top-margin`

#### Animações
`fade-in` (0.3s), `slide-up` (0.4s cubic-bezier), `slide-down` (0.3s), `slide-right` (0.3s), `modal-pop` (0.35s spring), `pulse-soft` (2s), `scale-in` (0.2s)

---

## 4. Rotas da API (Fastify)

### Auth (`/auth`)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Criar usuário |
| POST | `/auth/login` | Login → tokens |
| POST | `/auth/refresh` | Renovar tokens |
| POST | `/auth/logout` | Invalidar refresh |
| GET | `/auth/me` | Dados do usuário |
| PATCH | `/auth/me` | Atualizar nome, telefone, fotoUrl, push tokens |
| POST | `/auth/avatar` | Upload de foto de avatar |
| POST | `/auth/change-password` | Alterar senha |
| POST | `/auth/google` | Login via Google OAuth |
| POST | `/auth/verify-email` | Verificar email com código |
| POST | `/auth/resend-code` | Reenviar código de verificação |
| POST | `/auth/mudar-para-professor` | Upgrade de ALUNO para PROFESSOR |

### Uploads (`/uploads`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/uploads/avatars/:filename` | Servir avatar |
| GET | `/uploads/feed/:year/:month/:filename` | Servir foto do feed |

### Health Check (`/health`) — público (sem autenticação)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Diagnóstico completo: `status` (ok/degraded/error), `timestamp`, `uptime`, `version` (package.json), `checks` (vapid, database via `SELECT 1`, redis via ping descartável, workers social com nomes das filas e gym com `available` `boolean`/`'unknown'` — `redisDisponivel` não é exportado de `gymWorkers.ts`). Nunca retorna 500 — cada check é isolado em try/catch. `error` se DB falhou; `degraded` se VAPID/Redis/workers falharam |

### Aluno (`/alunos`) — role ALUNO
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/alunos/perfil` | Upsert perfil |
| GET | `/alunos/perfil` | Perfil + professor + academia |
| GET | `/alunos/treinos` | Todos os treinos |
| GET | `/alunos/treinos/historico-dias?mes=` | Calendário mensal |
| GET/POST/PATCH | `/alunos/medidas[/:id]` | CRUD medidas corporais |
| GET/POST | `/alunos/correlacoes` | Cache + recálculo de correlações |
| GET | `/alunos/evolucao/mensal?mes=` | Dashboard de evolução mensal |
| PATCH | `/alunos/academia` | Vincular academia |
| DELETE | `/alunos/academia` | Desvincular academia |
| PATCH | `/alunos/professor` | Vincular/desvincular professor |
| GET | `/alunos/academia/colegas` | Listar colegas da mesma academia |
| GET/POST | `/alunos/notificacoes[/visualizar]` | Listar/marcar lidas |
| GET/PATCH | `/alunos/privacidade` | Ver/atualizar configurações de privacidade |

### Social (`/social`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/social/mural` | Feed social paginado (cursor) |
| GET | `/social/mural/atividade` | Badge de atividade recente |
| POST | `/social/mural/:postId/curtir` | Curtir post |
| DELETE | `/social/mural/:postId/curtir` | Descurtir |
| POST | `/social/mural/:postId/comentar` | Comentar (max 280 chars) |
| GET | `/social/mural/:postId/comentarios` | Listar comentários (cursor) |
| PATCH | `/social/mural/:postId/foto` | Adicionar foto ao post |
| GET | `/social/mural/meu-ultimo-post` | Último post do usuário |
| POST | `/social/amizades/solicitar` | Solicitar amizade por email |
| POST | `/social/amizades/solicitar-por-id` | Solicitar amizade por ID |
| PATCH | `/social/amizades/:id/responder` | Aceitar/recusar |
| GET | `/social/amizades` | Listar amigos |
| GET | `/social/amizades/pendentes` | Solicitações pendentes |
| DELETE | `/social/amizades/:id` | Desfazer amizade |
| GET | `/social/clubes/:id` | Detalhe do clube |
| GET | `/social/clubes/:id/leaderboard` | Top 20 XP semanal |
| GET | `/social/clubes/:id/membros` | Listar membros do clube |
| POST | `/social/upload/foto` | Upload de foto para o feed |

### Professor (`/professores`) — role PROFESSOR
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/professores/perfil` | Upsert perfil (CREF) |
| POST/GET/DELETE | `/professores/vincular[/:academiaId]` | Vínculo academia |
| GET/DELETE | `/professores/vinculos[/:academiaId]` | Listar/remover vínculos |
| POST/GET | `/professores/alunos` | Vincular/listar alunos |
| GET | `/professores/dashboard` | Dashboard alunos + treinos |
| GET/POST | `/professores/fichas` | Listar/criar fichas em lote |
| GET | `/professores/exercicios` | Listar com filtros (grupo_muscular, equipamento, nivel, busca) |
| GET | `/professores/templates` | Listar templates do professor |
| GET | `/professores/workoutx/exercicios` | Busca externa WorkoutX |
| GET | `/professores/alunos/:alunoId/correlacoes` | Correlações do aluno |
| GET | `/professores/alunos/:alunoId/evolucao/mensal` | Evolução mensal do aluno |
| GET | `/professores/alunos/:alunoId/historico-execucoes` | Histórico detalhado de execuções |
| GET | `/professores/alunos/:alunoId/medidas` | Medidas do aluno |

### Academia (`/academias`) — role ACADEMIA
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/academias` | Lista pública (ATIVO) |
| POST | `/academias` | Cadastrar |
| GET | `/academias/dashboard` | Dashboard |
| GET/POST/DELETE | `/academias/professores[/:id]` | Gestão professores |
| POST | `/academias/professores/:id/autorizar` | Autorizar professor |
| GET | `/academias/alunos` | Listar (?resumo=true) |
| PATCH | `/academias/alunos/:id/professor` | Atribuir professor |
| POST | `/academias/fichas` | Criar fichas em lote |

### Treino (`/treinos`)
| Método | Rota | Descrição | Role |
|--------|------|-----------|------|
| POST | `/treinos` | Criar | PROFESSOR |
| POST | `/treinos/autogestao` | Criar (autogestão) | ALUNO, PROFESSOR |
| GET/POST | `/treinos/exercicios` | Listar/criar exercício | auth/PROF |
| POST | `/treinos/:id/enviar` | Enviar ao aluno | PROFESSOR |
| PATCH | `/treinos/:id/responder` | Aceitar/recusar | ALUNO |
| POST | `/treinos/:id/iniciar` | Iniciar execução | ALUNO, PROFESSOR |
| POST | `/treinos/:id/execucoes` | Registrar série | ALUNO, PROFESSOR |
| POST | `/treinos/:id/finalizar` | Finalizar + avaliar dificuldade | ALUNO, PROFESSOR |
| GET | `/treinos/:id` | Detalhe + últimas cargas | auth |
| PATCH | `/treinos/:id` | Editar | PROF/ACAD/ALUNO |
| DELETE | `/treinos/:id` | Remover | PROF/ACAD/ALUNO |
| POST | `/treinos/:id/clonar` | Clonar p/ 1 aluno | PROF/ACAD |
| POST | `/treinos/:id/clonar-lote` | Clonar p/ múltiplos | PROF/ACAD |
| POST | `/treinos/:id/marcar-template` | Toggle is_template | PROF/ACAD |

### Treino IA (`/treinos/ia`)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/treinos/ia/gerar` | Classificar grupo + gerar treino por scoring |
| POST | `/treinos/ia/gerar-e-salvar` | Adotar plano(s) e criar treinos |

### Planos (`/planos`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/planos` | Listar planos (filtros: objetivo, nivel, sexo, splitTipo) |
| GET | `/planos/recomendados` | Planos recomendados para o aluno |
| GET | `/planos/:id` | Detalhe do plano com sessões e exercícios |
| POST | `/planos/:id/adotar` | Adotar plano → cria treinos para o aluno |

### Avaliação Física (`/avaliacoes`)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/avaliacoes` | Criar avaliação completa (PAR-Q+, antropometria, composição, cardio, neuro) |
| POST | `/avaliacoes/sistema` | Criar avaliação pós-treino do sistema (role ALUNO): `nota` 1-5, `respostas` (criar_treino/navegacao/execucao/recomendacao 1-5), `mensagem?` → `{ id }` |
| GET | `/avaliacoes/aluno/:alunoId` | Listar avaliações do aluno |
| GET | `/avaliacoes/:id` | Obter avaliação por ID |
| PATCH | `/avaliacoes/:id` | Editar avaliação |
| DELETE | `/avaliacoes/:id` | Remover avaliação |
| POST | `/avaliacoes/:id/laudo` | Gerar laudo em markdown |
| POST | `/avaliacoes/:id/prescricao` | Gerar prescrição de treino |
| GET | `/avaliacoes/comparar` | Comparar duas avaliações (query: atualId, anteriorId) |
| GET | `/avaliacoes` | Listar todas as avaliações do usuário logado |

### Root (`/root`)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/root/painel` | Visão global (academias, professores, alunos) |
| GET | `/root/academias` | Lista paginada de academias |
| PUT | `/root/academias/:id` | Editar academia |
| DELETE | `/root/academias/:id` | Excluir academia |
| PATCH | `/root/academias/:id/aprovacao` | Aprovar/rejeitar academia |
| PATCH | `/root/academias/:id/status` | Alterar status (ATIVO/REJEITADO) |
| PATCH | `/root/academias/:id/limite-professores` | Definir limite de professores |
| GET | `/root/vinculos` | Vínculos pendentes (paginado) |
| PATCH | `/root/vinculos/:id/aprovacao` | Aprovar/rejeitar vínculo |
| GET | `/root/usuarios` | Usuários (paginado, busca, filtro) |
| PATCH | `/root/usuarios/:id/status` | Ativar/desativar |
| POST | `/root/usuarios/:id/reset-password` | Resetar senha |
| GET | `/root/professores` | Lista paginada de professores |
| PUT | `/root/professores/:id` | Editar professor |
| DELETE | `/root/professores/:id` | Excluir professor |
| GET | `/root/alunos` | Lista paginada de alunos |
| PUT | `/root/alunos/:id` | Editar aluno |
| DELETE | `/root/alunos/:id` | Excluir aluno |
| GET | `/root/social/mural` | Feed social (moderação) |
| DELETE | `/root/social/mural/:postId` | Excluir post |
| GET | `/root/social/clubes` | Clubes (moderação) |
| POST | `/root/social/clubes` | Criar clube |
| DELETE | `/root/social/clubes/:id` | Excluir clube |
| GET | `/root/social/amizades` | Amizades (moderação) |
| GET | `/root/avaliacoes-sistema` | Lista avaliações pós-treino do sistema com dados do aluno (ordenado por `criado_em` desc) |

---

## 5. Estrutura do Frontend (`apps/web/src`)

### Páginas por Role
| Role | Página | Rota | Arquivo |
|------|--------|------|---------|
| `*` | Landing | `/` | `pages/Landing.tsx` |
| `*` | Login | `/login` | `pages/auth/Login.tsx` |
| `*` | Registro (wizard) | `/register` | `pages/auth/Register.tsx` → `RegisterWizard.tsx` |
| `*` | Alterar Senha | `/alterar-senha` | `pages/auth/AlterarSenha.tsx` |
| `*` | Dados Pessoais | `/dados` | `pages/aluno/DadosAluno.tsx` |
| `*` | Privacidade | `/privacidade` | `pages/aluno/Privacidade.tsx` |
| `*` | Documentação | `/documentacao` | `pages/Documentacao.tsx` |
| `ALUNO` | Boas-Vindas | `/welcome` | `pages/aluno/WelcomeCards.tsx` |
| `ALUNO` | Dashboard | `/` | `pages/aluno/Dashboard.tsx` |
| `ALUNO` | Meus Treinos | `/meus-treinos` | `pages/aluno/MeusTreinos.tsx` |
| `ALUNO` | Criar Treino | `/treino/novo` | `pages/aluno/CriarTreinoAluno.tsx` |
| `ALUNO` | Editar Treino | `/treino/:id/editar` | `pages/aluno/CriarTreinoAluno.tsx` (modo edit) |
| `ALUNO` | Prescrição IA | `/treino/ia` | `pages/aluno/TreinoIA.tsx` |
| `ALUNO` | Início do Treino | `/treino/:id/inicio` | `pages/aluno/TreinoInicio.tsx` |
| `ALUNO` | Execução | `/treino/:id/execucao` | `pages/aluno/TreinoExecucao.tsx` |
| `ALUNO` | Conclusão | `/treino/:id/conclusao` | `pages/aluno/TreinoConclusao.tsx` |
| `ALUNO` | Medidas | `/medidas` | `pages/aluno/Medidas.tsx` |
| `ALUNO` | Evolução | `/evolucao` | `pages/aluno/Evolucao.tsx` |
| `ALUNO` | Feed Social | `/feed` (redireciona `/mural`) | `pages/aluno/Mural.tsx` |
| `ALUNO` | Amizades | `/amizades` | `pages/aluno/Amizades.tsx` |
| `ALUNO` | Clubes | `/clubes` | `pages/aluno/Clubes.tsx` |
| `ALUNO` | Feed do Clube | `/clubes/:id` | `pages/aluno/ClubeFeed.tsx` |
| `ALUNO` | Biblioteca de Planos | `/biblioteca-planos` | `pages/aluno/BibliotecaPlanos.tsx` |
| `ALUNO` | Parceiros | `/parceiros` | `pages/aluno/Parceiros.tsx` |
| `ALUNO` | Estudo | `/estudo` | `pages/aluno/Estudo.tsx` |
| `PROFESSOR` | Dashboard | `/` | `pages/professor/Dashboard.tsx` |
| `PROFESSOR` | Treinos | `/treinos` | `pages/professor/Treinos.tsx` |
| `PROFESSOR` | Criar Treino | `/treinos/criar` | `pages/professor/CriarTreino.tsx` |
| `PROFESSOR` | Fichas | `/fichas` | `pages/professor/Fichas.tsx` |
| `PROFESSOR` | Criar Exercício | `/exercicios/criar` | `pages/professor/CriarExercicio.tsx` |
| `PROFESSOR` | Academias | `/academias` | `pages/professor/Academias.tsx` |
| `PROFESSOR` | Vincular Aluno | `/alunos/vincular` | `pages/professor/VincularAluno.tsx` |
| `PROFESSOR` | Correlações | `/alunos/:alunoId/correlacoes` | `pages/professor/AlunoCorrelacoes.tsx` |
| `PROFESSOR` | Evolução Aluno | `/alunos/:alunoId/evolucao` | `pages/professor/AlunoCorrelacoes.tsx` |
| `PROFESSOR` | Avaliações Físicas | `/avaliacoes` | `pages/avaliacoes/Avaliacoes.tsx` |
| `ACADEMIA` | Dashboard | `/` | `pages/academia/Dashboard.tsx` |
| `ACADEMIA` | Professores | `/professores` | `pages/academia/Professores.tsx` |
| `ACADEMIA` | Alunos | `/alunos` | `pages/academia/Alunos.tsx` |
| `ACADEMIA` | Treinos | `/treinos` | `pages/academia/Treinos.tsx` |
| `ACADEMIA` | Criar Treino | `/treinos/criar` | `pages/academia/CriarTreinoAcademia.tsx` |
| `ACADEMIA` | Avaliações Físicas | `/avaliacoes` | `pages/avaliacoes/Avaliacoes.tsx` |
| `ROOT` | Painel | `/` | `pages/root/Painel.tsx` |
| `ROOT` | Vínculos | `/vinculos` | `pages/root/Vinculos.tsx` |
| `ROOT` | Usuários | `/usuarios` | `pages/root/Usuarios.tsx` |
| `ROOT` | Moderação Social | `/social` | `pages/root/Social.tsx` |
| `ROOT` | Avaliações | `/avaliacoes` | `pages/avaliacoes/Avaliacoes.tsx` |
| `ROOT` | Avaliações do App | `/avaliacoes-sistema` | `pages/root/AvaliacoesSistema.tsx` |

### Componentes Compartilhados
| Componente | Arquivo | Responsabilidade |
|------------|---------|-----------------|
| `AppShell` | `components/layout/AppShell.tsx` | Layout com sidebar, seletor de tema, drawer mobile, AcademySidebar |
| `ProtectedRoute` | `components/ProtectedRoute.tsx` | Proteção de rotas por role |
| `AcademySidebar` | `components/social/AcademySidebar.tsx` | Painel de colegas da academia (botão Seguir) |
| `PostCard` | `components/social/PostCard.tsx` | Card de post social com curtir, comentar, foto |
| `PostPhotoUpload` | `components/social/PostPhotoUpload.tsx` | Upload de foto no post |
| `FriendRequestCard` | `components/social/FriendRequestCard.tsx` | Card de solicitação de amizade |
| `CoachMark` | `components/ui/CoachMark.tsx` | Tooltips de onboarding (hook + overlay) |
| `ConfirmModal` | `components/ui/ConfirmModal.tsx` | Modal de confirmação (z-40) |
| `OnboardingPopup` | `components/ui/OnboardingPopup.tsx` | Popup de onboarding pós-login para ALUNO e PROFESSOR |
| `StarRating` | `components/ui/StarRating.tsx` | Estrelas de avaliação 1-5 (acessível, fill condicional) |
| `SistemaAvaliacaoModal` | `components/avaliacao/SistemaAvaliacaoModal.tsx` | Modal de avaliação do sistema (nota 1-5 + perguntas 1-5 + texto livre) |
| `EmptyState` | `components/ui/EmptyState.tsx` | Estado vazio: ícone, título, descrição, CTA |
| `Toast` | `components/ui/Toast.tsx` | Feedback de sucesso/erro |
| `StatusBadge` | `components/ui/StatusBadge.tsx` | Badge com 7 variantes + helpers |
| `LoadingSpinner` | `components/ui/LoadingSpinner.tsx` | Spinner + SkeletonCard + SkeletonText |
| `Icon` | `components/icons/Icon.tsx` | 20+ ícones SVG inline |
| `ImageWithFallback` | `components/ui/ImageWithFallback.tsx` | Imagem com fallback |
| `DebugOverlay` | `components/ui/DebugOverlay.tsx` | Overlay de debug para desenvolvimento |
| `OfflinePreloadBadge` | `components/ui/OfflinePreloadBadge.tsx` | Badge de conteúdo pré-carregado offline |
| `PWAInstallPrompt` | `components/ui/PWAInstallPrompt.tsx` | Prompt de instalação como PWA |
| `EndorfinappIcon` | `components/branding/EndorfinappIcon.tsx` | Ícone da marca (ECG + Raio) |
| `EndorfinappWordmark` | `components/branding/EndorfinappWordmark.tsx` | Logotipo texto |
| `EndorfinappLogo` | `components/branding/EndorfinappLogo.tsx` | Logo completo |
| `HealthConnectCard` | `components/health/HealthConnectCard.tsx` | Integração Google Health Connect |
| `HuaweiBridgeGuide` | `components/health/HuaweiBridgeGuide.tsx` | Integração Huawei Health |
| `WatchSyncButton` | `components/health/WatchSyncButton.tsx` | Sincronização com smartwatch |

### Stores (Zustand)
| Store | Arquivo | Responsabilidade |
|-------|---------|-----------------|
| `useAuthStore` | `stores/auth.ts` | Auth: login, register, logout, fetchUser, avatar, push |
| `useTrainingStore` | `stores/training.ts` | Sessão de treino: iniciar, registrar, finalizar, timer |
| `useThemeStore` | `stores/theme.ts` | Tema visual: 3 paletas × 2 modos |

### Hooks Customizados
| Hook | Arquivo | Responsabilidade |
|------|---------|-----------------|
| `useNotifications` | `hooks/useNotifications` | Notificações push |
| `useCapacitorTheme` | `hooks/useCapacitorTheme` | Tema nativo Capacitor |
| `useIncompleteWorkoutReminder` | `hooks/useIncompleteWorkoutReminder` | Vibração + notificação ao fechar app com treino ativo |
| `usePWAInstall` | `hooks/usePWAInstall` | Lógica de instalação PWA (beforeinstallprompt, iOS detect) |
| `useIdleLogout` | `hooks/useIdleLogout` | Heartbeat de atividade (anti-inatividade, sem redirecionar) |

### Helpers & Utilities (`apps/web/src/lib`)
- `media.ts`: `resolveMediaUrl()` para URLs absolutas de uploads
- `exerciseFilters.ts`: Normalização e aliases para filtros de equipamentos
- `debug.ts`: `debugLog()` para logging de desenvolvimento

### API Client (`src/api/client.ts`)
- Client centralizado com auto-refresh em 401, resiliente a offline (tokens preservados em falha de rede, removidos apenas em expiração real)
- Métodos: `get`, `post`, `patch`, `put`, `delete`
- Upload de FormData (avatar, fotos do feed)
- Suporte a CapacitorHttp (Android native HTTP)
- Debug logging via `debugLog`

### localStorage Keys
| Key | Uso |
|-----|-----|
| `gymapp_welcome_seen` | Boas-vindas já exibida |
| `gymapp_onboarding_seen` | Popup de onboarding pós-login já exibido |
| `gymapp_first_workout_done` | Coach marks já exibidas |
| `gymapp_system_evaluation_done` | Avaliação do sistema já exibida/enviada |
| `gymapp_theme` | Tema (red/lime/violet) |
| `gymapp_mode` | Modo (day/night) |
| `accessToken` | JWT access token |
| `refreshToken` | JWT refresh token |

---

## 6. Workers BullMQ (Background Jobs)

### Gym Workers (gymWorkers.ts)
| Fila | Worker | Agendamento | Descrição |
|------|--------|-------------|-----------|
| `inatividade-30min` | `handleInatividade30min` | A cada 2min | Notifica treinos ociosos (10min), longos (60min) e parados há 30min (lembrete "conclua", 1 push via `notificado_concluir_em`). Push dual (Expo + Web) para aluno e professor. |
| `treino-em-aberto` | `handleTreinoEmAberto` | Diário 23:30 | Marca treinos ACEITO do dia como EM_ABERTO. Notifica professor. |
| `mensagem-motivacional` | `handleMensagemMotivacional` | Sob demanda | Envia mensagem científica com rotação circular (reenvia tudo se esgotar). |
| `correlacao-desempenho` | `handleCorrelacaoDesempenho` | Sob demanda | Calcula correlações de Pearson assincronamente. |
| `news-fetch` | `handleNewsFetch` | A cada 6h | Busca RSS do Google News (exercício físico/endorfina/bem-estar), faz upsert em `noticias`. |
| `news-push` | `handleNewsPush` | A cada 30min | Lote de 20 usuários com push e `proxima_noticia_em <= now`; rotação circular de notícias não enviadas; agenda próximo envio em 1–7 dias. |

### Social Workers (jobs/social/)
| Fila | Worker | Descrição |
|------|--------|-----------|
| `social-fanout` | `handleFanoutPost` | Cria post no feed quando evento de treino ocorre |
| `social-notify` | `handleNotifyFriends` | Push notification para até 50 amigos |
| `social-badge` | `handleAwardBadges` | Concede badges (ex: 10 treinos) |
| `social-leaderboard` | `handleUpdateXp` | Atualiza XP semanal nos clubes |

---

## 7. Scripts e Sincronização

### Sincronização de Exercícios (`sync-gifdotreino.ts`)
- Crawla `GET /search_gifs.php` (963 exercícios, 49 páginas)
- Baixa descrições de `GET /Descrição/{nome}.txt`
- Parsing HTML → texto limpo, extrai passos de execução
- Infere `grupo_muscular` (16 pastas mapeadas), `equipamento`, `musculo_alvo`
- Upsert por nome no banco

### Seed de Planos (`seed-planos.ts`)
- Popula `planos_biblioteca` com planos modelos científicos

### Geração de Ícones do App (`generate-icons.mjs`)
- **Fonte de verdade**: `apps/web/public/app-icon.svg` — SVG 512×512, símbolo ECG+raio verde `#76FF03` sobre fundo preto `#0A0A0A`, mark dentro da zona segura maskable (66%)
- **Script**: `apps/web/scripts/generate-icons.mjs` — usa `sharp` (devDependency) para rasterizar o SVG de origem e gerar:
  - **PWA**: `icon-180.png`, `icon-192.png`, `icon-512.png` (full-bleed) e `icon-maskable-512.png` (símbolo dentro da zona segura 60%)
  - **Android**: mipmaps (`mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi`) em `capacitor-assets/android/` + adaptive icon (`ic_launcher_foreground.png` + `ic_launcher_background.png`)
  - **iOS**: `AppIcon.appiconset/` completo (15 tamanhos + `Contents.json`) em `capacitor-assets/ios/`
- **Execução**: `node apps/web/scripts/generate-icons.mjs` a partir de `apps/web/`
- **Git**: `capacitor-assets/` está no `.gitignore` (assets gerados); apenas o SVG fonte e o script são versionados
- **Manifest PWA**: `manifest.json` → background/theme `#0A0A0A`, ícones separados por propósito (`any` vs `maskable`)
- **iOS**: `apple-touch-icon` → `icon-180.png` (180×180)

### Deploy (Railway)
- Push para `origin/main` aciona deploy automático
- `railway-start.sh`: mkdir uploads → build → migrate → sync + translate + seed (background) → start
- API: `https://api-production-3360.up.railway.app`
- Web: `https://web-production-c2d3c.up.railway.app`
- Landing Page: `https://endorfinapp.com`

---

## 8. Documentação do Projeto

### Docs de Planejamento
| Arquivo | Conteúdo |
|---------|----------|
| `docs/planning/clubes-sociais-estudantes.md` | Plano para clubes de alunos: criação, convite, feed do clube, dashboard marketing mobile-first |
| `docs/planning/social-module-master-plan.md` | Plano mestre do módulo social |
| `docs/planning/social-frontend-plan.md` | Plano do frontend social |
| `docs/planning/documentacao-uso-menu.md` | Plano de documentação de uso e correção do mural/avatar |
| `docs/planning/editar-treino-e-ia-grupos-musculares.md` | Edição de treino e IA por grupos musculares |
| `docs/planning/onboarding-aluno.md` | Onboarding do aluno |
| `docs/planning/template-treino.md` | Templates de treino |
| `docs/planning/root-master-plan.md` | Plano do módulo Root |
| `docs/planning/seed-comprehensive-plan.md` | Seed de dados |
| `docs/planning/sync-gifdotreino.md` | Sincronização de exercícios |
| `docs/planning/landingpage-integration-plan.md` | Integração com Landing Page |
| `docs/planning/sexo-aluno-exercicios.md` | Sexo e filtros de exercícios |

### Docs de Marketing
| Arquivo | Conteúdo |
|---------|----------|
| `docs/FUNCIONALIDADES.md` | Guia completo de funcionalidades por perfil para marketing e stakeholders |
| `docs/user-guide.md` | Guia do usuário do sistema |
| `docs/funcionalidades-por-role.md` | Funcionalidades detalhadas por perfil (stakeholders, sem jargão técnico) |
| `docs/sistema-de-temas-e-modo-auto.md` | Documentação completa do design system de temas dinâmicos |
| `docs/renomeacao-feed-social.md` | Registro da migração /mural → /feed |

---

## 9. Comandos Úteis

```bash
npm run dev:api                        # Backend dev
npm run dev:web                        # Frontend dev
npm run build                          # Build todos workspaces
npm run lint --workspace=apps/web      # Lint (oxlint)
npm run test --workspace=apps/api      # Testes backend (vitest)
npx prisma generate --schema=apps/api/prisma/schema.prisma
npx prisma migrate dev --name <nome> --schema=apps/api/prisma/schema.prisma
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
npx prisma studio --schema=apps/api/prisma/schema.prisma
npx tsx apps/api/prisma/sync-gifdotreino.ts
npx tsx apps/api/prisma/seed-planos.ts
npx tsx apps/api/prisma/translate-exercises.ts
```

---

## 10. Dependências Principais

### Backend
`fastify`, `@fastify/cors`, `@fastify/helmet`, `@fastify/jwt`, `@fastify/multipart`, `@fastify/static`, `@fastify/swagger`, `@fastify/swagger-ui`, `@fastify/rate-limit`, `@prisma/client`, `prisma`, `bcryptjs`, `bullmq`, `ioredis`, `zod`, `nodemailer`, `web-push`, `expo-server-sdk`, `google-auth-library`, `tsx`

### Frontend
`react@19`, `react-dom@19`, `react-router-dom@7`, `zustand@5`, `recharts`, `tailwindcss@4`, `lucide-react`, `clsx`, `tailwind-merge`, `tw-animate-css`, `react-markdown`, `@react-oauth/google`, `@capgo/capacitor-keep-awake`, `vite@8`, `oxlint`
