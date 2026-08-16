# ENDORFINAPP — Guia Completo de Funcionalidades

## A Química do Crescimento

**ENDORFINAPP** é uma plataforma fitness completa que conecta alunos, personal trainers e academias em um só ecossistema. Combinamos gestão de treinos, avaliação física científica, análise evolutiva, prescrição por inteligência artificial e rede social fitness — tudo em uma interface moderna, responsiva e personalizável.

---

## Índice

1. [Para Alunos](#1-para-alunos)
2. [Para Personal Trainers / Professores](#2-para-personal-trainers--professores)
3. [Para Academias](#3-para-academias)
4. [Para Administradores (Root)](#4-para-administradores-root)
5. [Funcionalidades Transversais](#5-funcionalidades-transversais)
6. [Diferenciais Competitivos](#6-diferenciais-competitivos)

---

## 1. Para Alunos

### 1.1 Cadastro e Onboarding Inteligente
- Cadastro guiado em **3 passos**: dados básicos, perfil físico com validação em tempo real, e vínculo com academia ou modo autogestão
- **Senha segura**: mínimo 8 caracteres, exigindo maiúscula, minúscula, número e caractere especial
- **Verificação de e-mail** com código enviado no cadastro
- Tela de boas-vindas interativa com explicações dos benefícios da plataforma
- Coach marks na primeira execução de treino: timer, registro de séries e finalização
- Login tradicional (e-mail/senha) ou **Google OAuth**

### 1.2 Gestão de Treinos
- **Crie seus próprios treinos** mesmo tendo um professor vinculado (autogestão)
- **Edite e exclua** treinos salvos sem perder o histórico de execuções anteriores
- **Receba treinos** de professores e aceite ou recuse
- **Inicie, execute e finalize** treinos com cronômetro embutido
- **Avaliação de dificuldade** ao finalizar: Fácil, Moderado, Intenso ou Muito Intenso
- **Conclusão em lote**: finalize todas as séries de um exercício com um clique
- **Reciclagem automática**: treinos concluídos voltam automaticamente para "Aceito", prontos para nova execução

### 1.3 Prescrição por Inteligência Artificial
- **Assistente IA em 5 etapas**: Objetivo → Nível & Dias → Grupos Musculares → Restrições → Resultado
- Selecione grupos musculares específicos ou use atalhos rápidos: Full Body, Push, Pull, Legs, Upper, Lower
- Informe **restrições médicas** (joelho, lombar, ombro, punho, costas) e a IA substitui exercícios automaticamente
- Algoritmo inteligente de scoring que ranqueia planos por: objetivo, nível, frequência semanal, cobertura muscular e split preferido
- Pode gerar programas complementares (ex: Push + Pull + Legs) para treinos completos
- **Limite de 7 treinos IA por mês** com reset automático no dia 1

### 1.4 Execução de Treino
- **Cronômetro** com display expansível e gráfico circular
- **Barra de progresso** visual com percentual de séries concluídas
- **GIFs animados** dos exercícios (963 exercícios com demonstração visual)
- Toque no thumbnail para ver o GIF em **tela cheia** com instruções de execução
- Registro de **carga (kg) e repetições** por série com valores pré-preenchidos
- **Confirmação visual**: círculo verde com checkmark para séries registradas
- **Badge "OK"** no card do exercício quando todas as séries estão completas
- **Modal de confirmação** ao sair para evitar perda de progresso acidental
- **Notificações inteligentes**: alerta após 10min de inatividade e após 1 hora de treino

### 1.5 Medidas e Evolução
- Registro de **peso, altura, percentual de gordura e massa magra**
- **IMC calculado automaticamente** com classificação OMS e barra de escala visual
- Tabela histórica completa de todas as medições
- **Gráficos Recharts** de peso corporal e IMC ao longo do tempo
- **Dashboard Mensal de Evolução**:
  - Frequência de treinos no mês com meta semanal
  - Volume total de peso levantado (kg) com variação percentual
  - Duração total e média das sessões
  - Maior carga alcançada no mês com comparação ao mês anterior
- **Correlações Estatísticas de Pearson**: entenda a relação entre seu volume de treino e variações de peso, % gordura e massa magra
- Cache inteligente de 30 dias com botão "Recalcular"

### 1.6 Feed Social
- **Feed Social**: compartilhamento automático de treinos iniciados e concluídos
- **Curtidas e comentários** (limite de 280 caracteres)
- **Sistema de amizades**: encontre amigos por email e conecte-se
- **Colegas de academia**: painel lateral com alunos da mesma academia para seguir
- **Badge de atividade**: indicador de novidades no feed com atualização a cada 30s
- **Upload de fotos** nos posts do feed (com validação de segurança de arquivos)
- Notificações **push** quando amigos iniciam ou concluem treinos
- **Controle de privacidade**: posts públicos, só para amigos ou modo invisível (PRIVADO)

### 1.7 Clubes e Gamificação
- **Clubes de academia**: vinculados automaticamente — entre, veja o ranking e interaja
- **Clubes temáticos**: crie ou entre em clubes independentes com código de convite
- **Feed do clube**: veja os treinos dos membros em uma timeline dedicada (`/clubes/:id`)
- **Lista de membros**: veja quem participa com avatar e nome, entre ou saia de clubes
- **Sistema de XP**: ganhe pontos por treinos concluídos (bônus por volume, duração e sequência de dias)
- **Streak tracking**: bônus de 50% para sequências de 3+ dias consecutivos
- **Leaderboard**: ranking top 20 do clube por XP semanal
- **Badges**: conquistas automáticas (ex: "Primeiros 10 Treinos") com compartilhamento no feed
- **Reset anual** de XP para novas temporadas

### 1.8 Biblioteca de Planos Científicos
- Acesse uma biblioteca de planos de treino modelados cientificamente por objetivo, nível e sexo
- Planos para hipertrofia, força, emagrecimento e saúde
- Níveis iniciante, intermediário e avançado
- Visualize sessões, exercícios com séries e repetições, e adote planos com 1 clique

### 1.9 Dados Pessoais e Perfil
- Alteração de nome, telefone e foto de perfil
- Upload de avatar com rota dedicada e cache otimizado
- Troca ou remoção de vínculo com academia
- Vinculação ou desvinculação de professor
- Alteração de senha
- Configurações de privacidade independentes

### 1.10 Parceiros e Vantagens
- Vitrine de parceiros do ecossistema fitness
- Descontos exclusivos em suplementação, vestuário e serviços de nutrição
- Promoções destacadas com acesso facilitado

### 1.11 Saúde e Dispositivos
- Integração com **Google Health Connect**
- Guia de conexão com **Huawei Health**
- **Sincronização com smartwatch**
- **PWA**: instale como aplicativo no celular ou computador
- **Capacitor**: compatível com lojas Android e iOS
- **Tela ligada** durante o treino (KeepAwake)

### 1.12 Avaliação e Feedback
- **Avaliação do sistema** após o primeiro treino: card com nota de 1 a 5 estrelas
- Perguntas rápidas sobre usabilidade: criar/encontrar treino, navegação, execução e recomendação
- **Campo livre** para mensagem ou reporte de bug
- Menu **"Avaliar o App"** disponível a qualquer momento para reavaliar

---

## 2. Para Personal Trainers / Professores

### 2.1 Gestão Completa de Alunos
- Dashboard com visão de todos os alunos vinculados e status dos treinos
- Acompanhamento individualizado com cards de progresso
- Visualização de **correlações estatísticas** de evolução de cada aluno
- **Histórico detalhado de execuções**: veja data, duração, exercícios, séries, cargas e repetições
- Acesse as **medidas corporais** e gráficos de evolução dos alunos

### 2.2 Prescrição de Treinos
- **Criação de fichas** com interface rica: busca na biblioteca de 963 exercícios com GIFs
- **Filtros avançados** por grupo muscular (10 opções) e equipamento (7 opções)
- **Múltiplas fichas por vez**: crie treinos A, B, C em abas simultâneas
- **Envio automático** para o aluno ao salvar
- **Templates reutilizáveis**: marque treinos como template e reutilize com 1 clique
- **Clonagem individual**: copie treinos existentes para outros alunos
- **Clonagem em lote**: selecione múltiplos alunos e clone o mesmo treino para todos em transação única
- **Edição e exclusão** de treinos a qualquer momento
- **Criação de exercícios personalizados** na biblioteca

### 2.3 Avaliação Física Completa
Avaliação integrada baseada em evidências científicas com:

- **Triagem PAR-Q+** e classificação de **risco cardíaco** (baixo/moderado/alto)
- **Antropometria completa**: peso, estatura, IMC (classificação OMS), RCQ, perímetros
- **Composição corporal por dobras cutâneas**:
  - Protocolo **Jackson-Pollock 7 dobras** (padrão ouro)
  - Protocolo **Jackson-Pollock 3 dobras** (masculino e feminino)
  - Protocolo **Guedes**
  - Equação de **Siri** para percentual de gordura
  - Classificação por sexo: Essencial, Atleta, Bom, Normal, Elevado
- **Teste de Cooper** (12 min) para VO₂max
- **Estimativa de 1RM** pela fórmula de Brzycki
- **Zonas de frequência cardíaca** pelo método Karvonen
- Avaliação **postural**, de **flexibilidade** (Banco de Wells) e **neuromotora**
- **Laudo automático em markdown** com referências bibliográficas de revistas científicas (Sports Medicine, JAMA, The Lancet)
- **Prescrição automática** de treino baseada nos resultados da avaliação
- **Comparação entre avaliações**: deltas de peso, IMC, % gordura, massa magra, VO₂max

### 2.4 Dashboard do Professor
- Quantidade de alunos atendidos
- Treinos ativos, em andamento e concluídos
- Cards individuais por aluno com status dos treinos
- Links rápidos para evolução e correlações de cada aluno

### 2.5 Gestão de Academias
- Solicite vínculo com academias
- Acompanhe status das solicitações (pendente academia → pendente root → ativo)
- Gerencie múltiplos vínculos simultâneos
- Aprovação em duas camadas para segurança

---

## 3. Para Academias

### 3.1 Cadastro e Aprovação
- Cadastro com nome e CNPJ
- Aprovação pelo Root para garantir conformidade
- Definição de limite de professores na unidade

### 3.2 Gestão de Professores
- Liste todos os professores vinculados
- **Autorize** novos professores na academia
- **Remova** professores da unidade

### 3.3 Gestão de Alunos
- Liste todos os alunos associados à academia
- **Atribua professores** a cada aluno
- Acompanhe o crescimento da base

### 3.4 Gestão de Treinos
- Criação e envio de treinos para alunos
- Clonagem, templates e edição com as mesmas ferramentas dos professores
- Criação de fichas em lote

### 3.5 Dashboard da Academia
- Nome, CNPJ e status da academia
- Total de professores e alunos
- Professores pendentes de autorização
- Visão consolidada da operação

### 3.6 Clube da Academia
- Clube automático vinculado à academia
- Leaderboard interno para engajamento dos alunos
- Gamificação para aumentar frequência e retenção

---

## 4. Para Administradores (Root)

### 4.1 Painel Global
- Visão geral do sistema: total de academias ativas, pendentes, professores e alunos
- Métricas em tempo real para tomada de decisão

### 4.2 Gestão de Academias
- **Aprovação ou rejeição** de cadastros de academias
- Definição de limite de professores por academia
- Alteração de status (ativo/rejeitado)
- Edição e exclusão de academias

### 4.3 Gestão de Vínculos
- Visão de todos os vínculos professor-academia pendentes
- **Aprovação final** em duas camadas

### 4.4 Gestão de Usuários
- Lista completa de usuários com busca, filtro por perfil e status
- **Ativação e desativação** de contas
- **Reset de senha**
- CRUD completo de alunos, professores e academias

### 4.5 Moderação Social
- Visualização do feed social completo
- **Exclusão de posts** inapropriados
- **Gestão de clubes**: criar, editar e excluir
- **Gestão de amizades**: visualização e moderação

### 4.6 Avaliações do App
- **Painel de avaliações do sistema**: nota média geral e por pergunta (criar treino, navegação, execução, recomendação)
- Lista completa de avaliações com nome do aluno, nota, respostas e mensagem de feedback/bug

---

## 5. Funcionalidades Transversais

### 5.1 Design System Personalizável
- **3 temas de cores**: Lima & Navy, Vermelho & Carvão, Violeta & Grafite
- **2 modos**: Dia (claro) e Noite (escuro)
- **6 combinações** únicas aplicadas em tempo real
- Marca registrada **ENDORFINAPP** com slogan e identidade visual próprias
- Animações CSS suaves: fade-in, slide-up, modal-pop com efeito spring

### 5.2 Segurança e Privacidade
- **Isolamento multi-tenant**: professores só veem seus alunos, academias só veem seus membros
- **Senha forte**: mínimo 8 caracteres, exige maiúscula, minúscula, número e caractere especial
- **Verificação de e-mail**: código enviado no cadastro, obrigatório para login
- **JWT com refresh token rotacionado** (15min + 7d)
- **Auto-refresh** automático no frontend sem perda de sessão
- **Redirecionamento obrigatório** ao expirar sessão
- **Helmet** com Content Security Policy configurada
- **CORS** com origens controladas e preflight handler explícito
- **Rate limiting** por rota: 3-10 req/min (auth), 10 req/hora (IA)
- **Validação de uploads**: magic bytes (JPG, PNG, GIF, WebP) previnem arquivos maliciosos
- **LGPD**: consentimento explícito para feed social

### 5.3 Notificações Push
- **Dual-channel**: push nativo (Expo) + push web (Web Push API)
- Notificações de novo treino recebido
- Alertas de inatividade durante treino
- Lembrete de treino programado
- Atividade de amigos no feed
- Mensagens motivacionais científicas
- Conquistas e badges desbloqueadas

### 5.4 Workers e Processamento em Segundo Plano
- Monitoramento de inatividade em treinos (10min)
- Alerta de treinos longos (60min)
- Marcação automática de treinos como "Em Aberto" (23:30 diário)
- Cálculo assíncrono de correlações de desempenho
- Envio de mensagens motivacionais com rotação circular
- Fanout de posts sociais
- Concessão de badges

### 5.5 Performance e Escalabilidade
- **Redis + BullMQ** para filas de processamento assíncrono
- **Prisma ORM** com PostgreSQL para consultas eficientes
- **Cache de 30 dias** para correlações de desempenho
- **Otimização de imagens**: cache agressivo (max-age=86400)
- **Monorepo** NPM para gerenciamento eficiente de dependências
- **TypeScript** em toda a base de código
- **Swagger/OpenAPI** para documentação automática da API

### 5.6 Compatibilidade Multi-plataforma
- **Web** (responsive design)
- **Mobile** via Capacitor (Android e iOS)
- **PWA** (instalação como aplicativo)
- **Notificações push** tanto mobile quanto web

---

## 6. Diferenciais Competitivos

### Para Alunos
| Diferencial | Benefício |
|-------------|-----------|
| **963 exercícios com GIF** | Veja a execução correta de cada exercício antes de fazer |
| **IA que entende restrições** | Treino adaptado a joelho, lombar, ombro, etc. |
| **Rede social fitness** | Motivação através de amigos e clubes com feed dedicado |
| **Análise científica** | Correlações de Pearson mostram o que realmente funciona |
| **Autogestão + Professor** | Tenha um personal trainer mas também crie seus treinos |
| **Gamificação** | XP, badges, streak, leaderboard para manter consistência |

### Para Personal Trainers
| Diferencial | Benefício |
|-------------|-----------|
| **Avaliação física completa** | Da triagem PAR-Q+ ao laudo com referências científicas |
| **Protocolos validados** | Jackson-Pollock, Guedes, Cooper, Brzycki, Karvonen |
| **Correlações por aluno** | Dados objetivos para ajustar treinos |
| **Templates e clonagem em lote** | Economize horas na criação de fichas |
| **Histórico de execuções** | Veja exatamente o que o aluno fez em cada treino |
| **Notificações de inatividade** | Saiba quando seu aluno está "enrolando" no treino |

### Para Academias
| Diferencial | Benefício |
|-------------|-----------|
| **Plataforma white-label** | Sua marca, sua identidade visual |
| **Clube da academia** | Engajamento e retenção de alunos |
| **Gestão unificada** | Professores, alunos e treinos em um lugar |
| **Aprovação em 2 camadas** | Segurança e controle sobre quem atende na sua academia |

---

## Especificações Técnicas

| Componente | Tecnologia |
|------------|-----------|
| Backend | Node.js 20+, Fastify, TypeScript, Prisma ORM |
| Banco de Dados | PostgreSQL |
| Cache/Filas | Redis + BullMQ |
| Frontend Web | React 19, Vite 8, Tailwind CSS 4, Zustand 5, React Router 7 |
| Gráficos | Recharts |
| Mobile | Capacitor (Android + iOS) |
| Autenticação | JWT + Google OAuth |
| Notificações | Expo Push + Web Push API |
| Deploy | Railway (auto-deploy via GitHub) |
| Landing Page | Vite + React + Tailwind (endorfinapp.com) |

---

*Documento gerado em 31/07/2026. Para informações técnicas detalhadas, consulte o arquivo `AGENTS.md` na raiz do repositório.*
