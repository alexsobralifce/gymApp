# Guia do Usuario -- GymApp

Este documento explica como usar o GymApp do inicio ao fim: cadastro, treinos, medidas, evolucao, rede social e sistema de pontuacao.

---

## Indice

1. [Perfis de Usuario](#1-perfis-de-usuario)
2. [Cadastro e Onboarding](#2-cadastro-e-onboarding)
3. [App de Treino](#3-app-de-treino)
   - [Criar Treino (Autogestao)](#31-criar-treino-autogestao)
   - [Criar Treino (Professor para Aluno)](#32-criar-treino-professor-para-aluno)
   - [Templates e Clonagem](#33-templates-e-clonagem)
   - [Executar um Treino](#34-executar-um-treino)
   - [Maquina de Estados do Treino](#35-maquina-de-estados-do-treino)
4. [Medidas e Evolucao](#4-medidas-e-evolucao)
5. [Rede Social](#5-rede-social)
   - [Amizades](#51-amizades)
   - [Feed / Mural](#52-feed--mural)
   - [Privacidade](#53-privacidade)
   - [Clubes](#54-clubes)
6. [Sistema de Pontuacao](#6-sistema-de-pontuacao)
   - [Conquistas (Badges)](#61-conquistas-badges)
   - [XP e Leaderboard](#62-xp-e-leaderboard)
7. [Resumo das Rotas da API](#7-resumo-das-rotas-da-api)

---

## 1. Perfis de Usuario

| Perfil | Descricao |
|--------|-----------|
| **ALUNO** | Pessoa que treina. Pode estar vinculado a um professor ou treinar sozinho (autogestao). |
| **PROFESSOR** | Cria e envia fichas de treino para alunos. Gerencia templates, academias e acompanha evolucao. |
| **ACADEMIA** | Administra professores e alunos dentro da sua academia. Aprova vinculos de professores. |
| **ROOT** | Super administrador da plataforma. Aprova academias, gerencia vinculos globais. |

---

## 2. Cadastro e Onboarding

O cadastro usa um **wizard de 3 passos**:

### Passo 1 -- Dados Basicos
- Nome, email, senha, WhatsApp, role (ALUNO/PROFESSOR/ACADEMIA)

### Passo 2 -- Perfil Fisico (apenas ALUNO)
- Data de nascimento, peso (20-500 kg), altura (50-250 cm), sexo (MASCULINO/FEMININO)
- Validacao inline com debounce de 400ms
- **Checkbox de consentimento social**: "Desejo que meus amigos vejam quando eu treino" -- controla se seus treinos aparecem no feed social

### Passo 3 -- Academia/Autogestao (apenas ALUNO)
- Dropdown com academias ativas + opcao "Autogestao (sem academia)"
- Alunos em autogestao criam seus proprios treinos sem professor

### Pos-cadastro
- Redireciona para `/welcome` -- tela de boas-vindas com 3 cards explicativos
- Controlado por `localStorage` (`gymapp_welcome_seen`) -- aparece apenas no primeiro login
- Alunos com professor veem: "Aceitar Treino", "Registrar Execucao", "Ver Evolucao"
- Alunos em autogestao veem: "Criar Treino", "Registrar Execucao", "Ver Evolucao"

---

## 3. App de Treino

### 3.1 Criar Treino (Autogestao)

Alunos sem professor podem criar seus proprios treinos.

**Fluxo:**
1. No Dashboard, va em "Meus Treinos"
2. Se nao houver treinos, o botao "Criar Treino" aparece no estado vazio
3. Monte seu treino: nome, dias da semana, exercicios
4. O treino e criado com status `ACEITO` -- pode ser iniciado imediatamente

**Regras:**
- Aluno com professor nao pode usar autogestao (erro `TenantAccessError`)
- Rota: `POST /treinos/autogestao`

### 3.2 Criar Treino (Professor para Aluno)

Professores montam fichas e enviam para os alunos.

**Fluxo:**
1. Acesse `/treinos/criar?alunoId=XYZ`
2. Selecione a academia (se tiver vinculo com varias)
3. Selecione o aluno de destino
4. Opcional: escolha um template para pre-preencher
5. Configure as fichas:
   - Nome da ficha (ex: "Treino A -- Peito e Triceps")
   - Dias da semana (Dom a Sab, botoes toggle)
   - Adicione exercicios da biblioteca (963 exercicios com GIFs)
     - Filtre por grupo muscular (10 opcoes) ou equipamento (7 opcoes)
     - Cada exercicio mostra: ordem, series, repeticoes, carga sugerida
     - Reordene com botoes de subir/descer
   - Crie multiplas fichas de uma vez (abas A, B, C...)
6. Clique em "Salvar" -- as fichas sao criadas e **enviadas automaticamente** ao aluno

**O aluno recebe:**
- Notificacao no Dashboard: modal "Nova Ficha de Treino!"
- Botoes: "Ver Treinos" ou "Depois"
- No MeusTreinos: botoes "Recusar" / "Aceitar Ficha"

### 3.3 Templates e Clonagem

**Template:**
- Um treino comum com a flag `is_template = true`
- Professor marca/desmarca via botao "Template" na listagem de treinos
- Aparece no dropdown "Criar a partir de Template" ao criar novo treino
- Ao selecionar, preenche automaticamente nome, dias e exercicios com series/reps

**Clonar para 1 aluno:**
- No `/treinos`, botao "Clonar" abre modal com dropdown de alunos
- Copia nome, dias e exercicios do treino original
- O clone e enviado automaticamente ao aluno

**Clonar em lote:**
- Exclusivo para treinos marcados como template
- Modal "Clonar em Lote" com busca, checkboxes e contador de selecionados
- Cria 1 treino por aluno em uma unica transacao
- Todos sao enviados automaticamente

### 3.4 Executar um Treino

O fluxo de execucao tem 3 telas.

#### Tela 1: Inicio (`/treino/:id/inicio`)

- Nome do treino, dias da semana em badges
- Estatisticas: total de exercicios, total de series, duracao (zerada)
- Preview dos primeiros 5 exercicios
- Botao **"Comecar Treino"** -- transita status para `EM_EXECUCAO`

#### Tela 2: Execucao (`/treino/:id/execucao`)

**Barra superior fixa:**
- Botao voltar
- Nome do treino
- Contador de series concluidas (ex: "6/12 series")
- **Timer** (MM:SS) -- toque para expandir com grafico circular

**Barra de progresso:**
- Linha horizontal que preenche conforme as series sao concluidas

**Coach Marks (apenas na primeira execucao):**
- 3 tooltips sequenciais com overlay:
  1. Timer: "O timer registra quanto tempo voce leva. Toque para expandir."
  2. Serie: "Preencha a carga e repeticoes. Toque em ✓ para confirmar."
  3. Finalizar: "Ao concluir todas as series, finalize o treino aqui."
- Controlado por `localStorage` (`gymapp_first_workout_done`) -- nunca repete

**Cards de exercicios:**
- Cada card mostra: GIF animado (toque para ampliar), numero, nome, grupo muscular
- Badge "OK" verde quando todas as series estao registradas
- **Linhas de serie**: uma por serie, com campos para carga (kg) e repeticoes
- Valores pre-preenchidos da carga sugerida e repeticoes padrao
- Botao ✓ (vermelho) para confirmar cada serie
- Apos confirmado: circulo verde com checkmark, campos desabilitados

**Modal do GIF:**
- Toque no thumbnail do exercicio para ver GIF em tela cheia
- Mostra: nome, grupo muscular, equipamento, instrucoes de execucao

**Botao "Finalizar Treino":**
- Fixo no rodape
- Abre modal de avaliacao de dificuldade:
  - Facil, Moderado, Intenso, Muito Intenso
  - Opcao "Pular avaliacao"

**Botao "Sair":**
- Pequeno, no canto
- Confirma: "Sair do treino? O progresso sera perdido."

#### Tela 3: Conclusao (`/treino/:id/conclusao`)

- Icone de trofeu verde
- "Treino Concluido!"
- Duracao total (ex: "45min 12s")
- Mensagem motivacional aleatoria
- Botoes: "Voltar para o Inicio" / "Ver Minha Evolucao"

**Comportamento pos-conclusao:**
- O treino recicla automaticamente (`CONCLUIDO → ACEITO`)
- `iniciado_em` e `finalizado_em` sao limpos
- O aluno pode fazer o mesmo treino novamente

### 3.5 Maquina de Estados do Treino

| De | Para | Quem | Quando |
|---|---|---|---|
| `CADASTRADO` | `ENVIADO` | Professor/Sistema | Professor envia ficha |
| `CADASTRADO` | `ACEITO` | Aluno | Autogestao (criacao direta) |
| `ENVIADO` | `ACEITO` | Aluno | Aluno aceita a ficha |
| `ENVIADO` | `RECUSADO` | Aluno | Aluno recusa a ficha |
| `ACEITO` | `EM_EXECUCAO` | Aluno | Inicia o treino |
| `ACEITO` | `EM_ABERTO` | Sistema | Worker de inatividade (30min) |
| `EM_ABERTO` | `EM_EXECUCAO` | Aluno | Retoma treino pendente |
| `EM_EXECUCAO` | `CONCLUIDO` | Aluno | Finaliza o treino |
| `CONCLUIDO` | `ACEITO` | Sistema | Reciclagem automatica |

Transicoes invalidas lancam `InvalidStateTransitionError`. Toda transicao e registrada em `treino_historico`.

---

## 4. Medidas e Evolucao

### Medidas (`/medidas`)

**Registrar medida corporal:**
- Peso (kg), Altura (cm), % Gordura (BF), Massa Magra (kg)
- Observacao opcional
- IMC calculado automaticamente
- Cria uma entrada em `medidas_corporais`

**Visualizacao:**
- Card de IMC com valor, classificacao OMS e barra de escala visual
- Tabela historica com todas as medicoes registradas
- Editar medicoes existentes
- Tabela de referencia OMS com categorias coloridas

### Evolucao (`/evolucao`)

**Graficos Recharts:**
- Linha do tempo de peso (kg) -- requer 2+ medicoes
- Linha do tempo de IMC

**Correlacao de Desempenho:**
- Coeficiente de Pearson entre volume de treino semanal e:
  - Variacao de peso
  - Variacao de % gordura corporal
  - Variacao de massa magra
- Interpretacao automatica:
  - r >= 0.7: correlacao forte
  - r >= 0.5: correlacao moderada
  - r >= 0.3: correlacao fraca
  - r < 0.3: desprezivel
- Cache de 30 dias -- botao "Recalcular" quando desatualizado

**Visao do professor:**
- Acessa correlacoes de qualquer aluno vinculado
- Lista de volume semanal (kg total + dias de treino)
- Pontos detalhados com delta de peso, BF e volume acumulado

---

## 5. Rede Social

A rede social do GymApp permite que alunos compartilhem sua jornada de treinos com amigos, participem de clubes e compitam em leaderboards.

### 5.1 Amizades

**Como funciona:**
- Alunos se conectam via **busca por email**
- O email do amigo deve estar cadastrado no GymApp com role `ALUNO`
- O amigo precisa ter `permite_busca_email = true` (ativado por padrao)
- Voce nao pode adicionar a si mesmo

**Solicitar amizade:**
```
POST /social/amizades/solicitar
Body: { "email": "amigo@email.com" }
```
- Por privacidade, a resposta e sempre "Solicitacao enviada se o e-mail corresponder a um usuario valido" -- o sistema nunca revela se o email existe ou nao

**Responder solicitacao:**
```
PATCH /social/amizades/:id/responder
Body: { "acao": "ACEITAR" | "RECUSAR" }
```
- `ACEITAR` → status muda para `ACEITO`, a amizade fica ativa
- `RECUSAR` → a solicitacao e **deletada** completamente

**Listar amigos:**
```
GET /social/amizades
Resposta: [{ id, nome, fotoUrl }]
```
- Retorna apenas amizades com status `ACEITO`
- Busca nas duas direcoes (voce enviou ou recebeu)

**Desfazer amizade:**
```
DELETE /social/amizades/:id
```
- Qualquer lado pode desfazer

### 5.2 Feed / Mural

O feed mostra a atividade de treino dos seus amigos e posts publicos.

**O que aparece no feed:**

| Evento | Tipo de Post | Quando |
|--------|-------------|--------|
| Treino iniciado | `TREINO_INICIADO` | Aluno clica "Comecar Treino" |
| Treino concluido | `TREINO_CONCLUIDO` | Aluno clica "Finalizar Treino" |
| Recorde pessoal | `RECORDE_PESSOAL` | *(em breve)* |
| Conquista desbloqueada | `BADGE_CONQUISTADO` | Aluno ganha um badge |

**Como funciona:**
1. Quando um aluno inicia ou conclui um treino, um **evento** e disparado internamente
2. Um worker BullMQ (`fanout-post`) cria um post no banco de dados
3. Se a visibilidade do aluno for `PRIVADO`, o post **nao e criado**
4. Outro worker (`notify-friends`) envia push notifications para ate 50 amigos
5. Os amigos veem o post no feed e recebem notificacao no celular/web

**Ver o feed:**
```
GET /social/mural?cursor=&limit=20
```
- Paginacao por cursor (ID do ultimo post visto)
- Retorna posts de amigos (visibilidade `AMIGOS` ou `PUBLICO`) + posts `PUBLICO` de qualquer aluno
- Maximo 50 posts por pagina

**Curtir um post:**
```
POST /social/mural/:postId/curtir
```
- Contador atomico de curtidas
- Uma curtida por aluno por post (tentativas duplicadas sao ignoradas)

**Descurtir:**
```
DELETE /social/mural/:postId/curtir
```

**Comentar:**
```
POST /social/mural/:postId/comentar
Body: { "texto": "Bora treinar juntos!" }
```
- Maximo 280 caracteres
- Nome do autor e salvo junto ao comentario

**Ver comentarios:**
```
GET /social/mural/:postId/comentarios?cursor=&limit=20
```
- Paginacao por cursor, ordenado do mais recente

**Notificacoes push:**
- Quando um amigo inicia ou conclui um treino, voce recebe:
  - Mobile (Expo): "Amigo treinando!" / "{nome} iniciou/concluiu um treino!"
  - Web (Push API): mesma mensagem

### 5.3 Privacidade

Tres configuracoes independentes controlam sua presenca social:

| Configuracao | Descricao | Padrao |
|-------------|-----------|--------|
| `visibilidadePadrao` | Quem ve seus posts no feed | `AMIGOS` |
| `permiteBuscaEmail` | Permite que outros te encontrem por email | `true` |
| `consentiuFeedSocial` | Consentimento LGPD para aparecer no feed | `false` (marcado no cadastro) |

**Opcoes de visibilidade:**
- `AMIGOS` -- apenas amigos veem seus posts (comportamento padrao)
- `PUBLICO` -- qualquer aluno pode ver
- `PRIVADO` -- **nenhum post e criado** (voce fica invisivel no feed)

**Atualizar privacidade:**
```
PATCH /alunos/privacidade
Body: { "visibilidadePadrao": "PUBLICO", "permiteBuscaEmail": false }
```

### 5.4 Clubes

Clubes agrupam alunos por academia ou tema.

**Tipos de clube:**
- `ACADEMIA` -- vinculado 1:1 a uma academia. Alunos entram automaticamente ao se vincular a academia.
- `TEMATICO` -- clubes independentes (ex: "Marombeiros do CrossFit") *(planejado)*

**Ver clube:**
```
GET /social/clubes/:id
Resposta: { nome, tipo, totalMembros }
```

**Leaderboard do clube:**
```
GET /social/clubes/:id/leaderboard
Resposta: top 20 membros ordenados por XP semanal
```

---

## 6. Sistema de Pontuacao

### 6.1 Conquistas (Badges)

Badges sao conquistas desbloqueadas automaticamente conforme voce treina.

**Badge disponivel: "Primeiros 10 Treinos"**
- Desbloqueado ao concluir 10 treinos (status `CONCLUIDO`)
- Um post e criado no feed com `tipo: BADGE_CONQUISTADO` e `autor: Sistema`
- Seus amigos veem a conquista no feed
- **Idempotente**: o badge so e concedido uma vez (upsert por chave unica)

**Como funciona:**
1. Ao finalizar um treino, o evento `treino.concluido` dispara
2. O worker `award-badges` conta quantos treinos `CONCLUIDO` voce tem
3. Se >= 10, cria o post de conquista

**Proximos badges (planejados):**
- Recordes pessoais (levantar mais peso que o recorde anterior)
- Sequencia de dias consecutivos treinando
- Desafios completados

### 6.2 XP e Leaderboard

**Estrutura:**
- Cada membro de clube tem `xp_semana` (XP semanal)
- O leaderboard mostra o top 20 por XP da semana

**Estado atual:**
- A infraestrutura de filas BullMQ, modelo de dados e query do leaderboard estao prontos
- O worker que **calcula e atribui XP** ainda nao esta implementado
- O XP semanal permanece em 0 ate a implementacao do worker

**Funcionamento planejado:**
- XP ganho por acao: iniciar treino, concluir treino, bater recorde, ganhar badge
- Reset semanal do XP (via worker agendado)
- Leaderboard visivel na pagina do clube

---

## 7. Resumo das Rotas da API

### Treinos

| Metodo | Rota | Descricao | Perfil |
|--------|------|-----------|--------|
| POST | `/treinos` | Criar treino | PROFESSOR |
| POST | `/treinos/autogestao` | Criar treino (autogestao) | ALUNO |
| POST | `/treinos/:id/enviar` | Enviar ao aluno | PROFESSOR |
| PATCH | `/treinos/:id/responder` | Aceitar/recusar | ALUNO |
| POST | `/treinos/:id/iniciar` | Iniciar execucao | ALUNO |
| POST | `/treinos/:id/execucoes` | Registrar serie | ALUNO |
| POST | `/treinos/:id/finalizar` | Finalizar treino | ALUNO |
| POST | `/treinos/:id/clonar` | Clonar para 1 aluno | PROF/ACAD |
| POST | `/treinos/:id/clonar-lote` | Clonar para N alunos | PROF/ACAD |
| POST | `/treinos/:id/marcar-template` | Toggle template | PROF/ACAD |
| GET | `/treinos/:id` | Detalhe do treino | auth |
| DELETE | `/treinos/:id` | Remover | PROF/ACAD |

### Aluno

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/alunos/perfil` | Criar/atualizar perfil |
| GET | `/alunos/perfil` | Ver perfil |
| GET | `/alunos/treinos` | Listar treinos |
| GET/POST/PATCH | `/alunos/medidas[/:id]` | CRUD medidas |
| GET/POST | `/alunos/correlacoes` | Ver/calcular correlacoes |
| PATCH | `/alunos/academia` | Vincular a academia |

### Social

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/social/amizades/solicitar` | Solicitar amizade por email |
| PATCH | `/social/amizades/:id/responder` | Aceitar/recusar solicitacao |
| GET | `/social/amizades` | Listar amigos |
| DELETE | `/social/amizades/:id` | Desfazer amizade |
| GET | `/social/mural` | Feed com paginacao |
| POST | `/social/mural/:postId/curtir` | Curtir post |
| DELETE | `/social/mural/:postId/curtir` | Descurtir |
| POST | `/social/mural/:postId/comentar` | Comentar (max 280 chars) |
| GET | `/social/mural/:postId/comentarios` | Listar comentarios |
| PATCH | `/alunos/privacidade` | Atualizar privacidade |
| GET | `/alunos/privacidade` | Ver privacidade |
| GET | `/social/clubes/:id` | Detalhe do clube |
| GET | `/social/clubes/:id/leaderboard` | Top 20 por XP semanal |

---

*Documento gerado em 17/07/2026. Para duvidas tecnicas, consulte o `AGENTS.md` na raiz do repositorio.*
