# Plano de Seed Comprehensive — Teste do Sistema

## Objetivo

Popular o banco com dados realistas e diversos para testar todos os modulos do GymApp: treinos, medidas, evolucao, rede social e pontuacao.

---

## 1. Estrutura Geral

| Entidade | Quantidade | Detalhes |
|----------|-----------|----------|
| Academias | 5 | Ativas, com usuarios ACADEMIA e clubes sociais |
| Professores | 50 | 10 por academia, todos com vinculo ATIVO |
| Alunos | 200 | 160 vinculados a academias (80 c/ professor, 80 autogestao na academia), 40 puramente autogestao |
| Treinos | ~400 | 1-3 por aluno, cobrindo todos os status e divisoes |
| Execucoes (series) | ~1.500 | Series registradas para treinos CONCLUIDO/EM_EXECUCAO |
| Medidas | ~200 | 1-3 medicoes por aluno (amostra) |
| Amizades | ~500 | Intra-academia (densa) + cross-academia (esparsa) |
| Posts sociais | ~300 | TREINO_INICIADO, TREINO_CONCLUIDO, BADGE_CONQUISTADO |
| Curtidas | ~400 | Alunos curtindo posts de amigos |
| Comentarios | ~150 | Comentarios motivacionais |
| Clubes | 5 | 1 por academia, membros automaticos |

---

## 2. Academias (5)

| Nome | Email Admin | Alunos | Professores |
|------|-------------|--------|-------------|
| Iron Body Fitness | academia1@gymapp.com | 32 | 10 |
| PowerFit Academy | academia2@gymapp.com | 32 | 10 |
| Elite Training Center | academia3@gymapp.com | 32 | 10 |
| VivaFit Studio | academia4@gymapp.com | 32 | 10 |
| MaxForma Gym | academia5@gymapp.com | 32 | 10 |

Cada academia gera um `SocialClub` automaticamente.

---

## 3. Professores (50)

- 10 por academia, nomes realistas PT-BR
- Email: `prof_{academia}_{n}@gymapp.com`
- Senha: `Professor@123`
- CREF: `CREF-{id}/BR`
- Vinculo `ProfessorAcademia` com status `ATIVO`

---

## 4. Alunos (200)

### Distribuicao

| Grupo | Qtd | Academia | Professor | Descricao |
|-------|-----|----------|-----------|-----------|
| Grupo A | 80 | Sim | Sim | Alunos com professor ativo — recebem fichas |
| Grupo B | 80 | Sim | Nao | Autogestao dentro da academia — criam proprios treinos |
| Grupo C | 40 | Nao | Nao | Autogestao pura — sem academia nem professor |

### Diversidade de Perfil

- **Sexo**: ~55% MASCULINO, ~45% FEMININO
- **Idade**: 18 a 65 anos, distribuicao normal centrada em 30
- **Peso**: 50 a 120 kg (homens 65-110, mulheres 50-85)
- **Altura**: 150 a 200 cm (homens 165-195, mulheres 150-180)
- **Visibilidade**: ~60% AMIGOS, ~30% PUBLICO, ~10% PRIVADO
- **Busca por email**: ~80% true, ~20% false
- **Consentimento social**: ~70% sim, ~30% nao

### Nomenclatura

Emails: `aluno_{n}@gymapp.com` (n de 1 a 200)
Senha: `Aluno@123`
Nomes: combinacao de ~100 nomes + ~80 sobrenomes PT-BR

---

## 5. Treinos (~400)

### Distribuicao por Status

| Status | % | Qtd aprox | Significado |
|--------|---|-----------|-------------|
| CADASTRADO | 10% | 40 | Professor montou, ainda nao enviou |
| ENVIADO | 8% | 32 | Aguardando resposta do aluno |
| ACEITO | 25% | 100 | Pronto para iniciar |
| EM_EXECUCAO | 7% | 28 | Em andamento (com algumas series feitas) |
| CONCLUIDO | 50% | 200 | Finalizado (reciclado para ACEITO) |

Alunos do Grupo A (com professor): treinos via professor, status variados
Alunos do Grupo B e C (autogestao): treinos criados diretamente como ACEITO

### Divisoes de Treino

| Tipo | % | Nomes de exemplo |
|------|---|------------------|
| Push/Pull/Legs | 20% | "Treino A — Push", "Treino B — Pull", "Treino C — Legs" |
| Upper/Lower | 15% | "Treino A — Superiores", "Treino B — Inferiores" |
| Full Body | 15% | "Full Body — Seg/Qua/Sex" |
| Bro Split | 25% | "Peito e Triceps", "Costas e Biceps", "Pernas", "Ombros", "Bracos" |
| Strength | 10% | "Powerlifting — Agachamento", "Terra e Remada" |
| HIIT/Cardio | 10% | "HIIT — 30min", "Cardio + Core" |
| Template | 5% | Marcados com `is_template = true` |

### Estrutura de Cada Treino

- 4 a 8 exercicios
- 3 a 5 series por exercicio
- 6 a 15 repeticoes
- Carga sugerida: 5 a 120 kg (varia por exercicio e perfil)
- Dias da semana: 1 a 6 dias (mais comum: 3-4 dias)

### Exercicios por Grupo Muscular

Selecionados da biblioteca de 963 exercicios do GifDoTreino:

| Grupo | Exemplos |
|-------|----------|
| Peito | Supino reto, Crucifixo, Flexao, Peck deck |
| Costas | Remada curvada, Puxador frente, Barra fixa |
| Ombros | Desenvolvimento, Elevacao lateral, Face pull |
| Coxas | Agachamento, Leg press, Cadeira extensora |
| Biceps | Rosca direta, Rosca martelo, Rosca concentrada |
| Triceps | Triceps pulley, Frances, Fundos |
| Panturrilhas | Gemeos em pe, Gemeos sentado |
| Abdomen | Abdominal infra, Prancha, Russian twist |
| Cardio | Esteira, Bike, Caminhada |

---

## 6. Execucoes de Series (~1.500)

Para treinos `CONCLUIDO` e `EM_EXECUCAO`:
- 70% das series registradas (simula treino real)
- Carga: variacao de ±20% sobre a carga sugerida
- Repeticoes: variacao de ±3 sobre o padrao
- Datas espalhadas nos ultimos 90 dias

---

## 7. Medidas Corporais (~200)

Para ~70 alunos (amostra), criar 1-3 medicoes:

- **Peso**: variacao de ±3 kg entre medicoes
- **Altura**: fixa por aluno
- **% BF**: 8% a 35%, variacao de ±2% entre medicoes
- **Massa magra**: calculada proporcionalmente
- **IMC**: calculado automaticamente pelo backend
- Datas espacadas de 15-30 dias nos ultimos 90 dias

Suficiente para gerar correlacoes de Pearson.

---

## 8. Rede Social

### 8.1 Clubes (5)

1 por academia, tipo `ACADEMIA`:
- `academia_id` vinculado a academia
- `nome` = nome da academia

### 8.2 Membros de Clube (~160)

- Alunos do Grupo A e B (com academia) viram membros automaticamente
- `xp_semana`: valores aleatorios entre 0 e 500

### 8.3 Amizades (~500)

**Intra-academia (densa):**
- Cada aluno tem 3-8 amigos dentro da mesma academia
- ~60% de chance de dois alunos da mesma academia serem amigos
- Metade das solicitacoes `ACEITO`, metade `PENDENTE`

**Cross-academia (esparsa):**
- ~20 alunos tem 1-2 amigos em outras academias
- Simula conexoes entre academias diferentes

### 8.4 Posts Sociais (~300)

Para alunos com `consentiu_feed_social_em != null` e `visibilidade != PRIVADO`:

| Tipo | Qtd | Trigger simulado |
|------|-----|------------------|
| TREINO_INICIADO | 80 | Inicio de treino |
| TREINO_CONCLUIDO | 150 | Conclusao de treino |
| BADGE_CONQUISTADO | 20 | Badge "10 treinos" |
| RECORDE_PESSOAL | 30 | *(planejado, criado manualmente)* |

- `visibilidade`: herda do `visibilidade_padrao` do aluno
- `autor_nome` e `autor_foto_url`: denormalizados do usuario
- `grupo_muscular_resumo`: extraido dos exercicios do treino referenciado
- `treino_id`: referencia ao treino que gerou o evento
- Datas nos ultimos 60 dias

### 8.5 Curtidas (~400)

- Alunos curtindo posts de amigos
- 1-3 curtidas por post (media)
- Sem duplicatas (`@@unique([post_id, aluno_id])`)

### 8.6 Comentarios (~150)

- 0-2 comentarios por post
- Textos motivacionais PT-BR:
  - "Bora treinar juntos! 💪"
  - "Excelente execucao! Continue assim!"
  - "Inspiracao pura! 🚀"
  - "Qual a divisao de hoje?"
  - "Foco, forca e fe! 🙏"
  - "Meta batida! Parabens!"
  - "Treino top! Resultados chegando..."
  - etc.

---

## 9. Templates de Treino (~10)

5 professores criam 2 templates cada:
- Templates marcados com `is_template = true`
- Diversos tipos (Push, Pull, Legs, Full Body, HIIT)
- Disponiveis no dropdown "Criar a partir de Template"

---

## 10. Cenarios de Teste Cobertos

| Cenario | Como testar |
|---------|-------------|
| Aluno recebe ficha do professor | Alunos Grupo A com treinos ENVIADO |
| Aluno aceita/recusa ficha | Botoes "Aceitar Ficha" / "Recusar" |
| Aluno inicia treino | Treinos ACEITO → EM_EXECUCAO |
| Aluno registra series | Campos carga/reps na tela de execucao |
| Aluno finaliza treino | Botao "Finalizar Treino" + avaliacao |
| Treino reciclado | CONCLUIDO → ACEITO automatico |
| Autogestao cria treino | Alunos Grupo B e C criam via `/treinos/autogestao` |
| Professor monta ficha | CriarTreino.tsx com exercicios da biblioteca |
| Professor usa template | Dropdown "Criar a partir de Template" |
| Professor clona treino | Botao "Clonar" → enviar para outro aluno |
| Professor clona em lote | Modal "Clonar em Lote" com multi-selecao |
| Medidas e IMC | Tela `/medidas` com historico e grafico IMC |
| Evolucao e graficos | Tela `/evolucao` com Recharts |
| Correlacao de Pearson | Tela `/evolucao` com coeficientes |
| Feed social | `GET /social/mural` com paginacao |
| Amizades | Solicitar, aceitar, listar, desfazer |
| Privacidade | Alunos PRIVADO nao aparecem no feed |
| Clubes e leaderboard | `GET /social/clubes/:id/leaderboard` |
| Badges | Posts de BADGE_CONQUISTADO no feed |
| Notificacoes push | Notificacao de novo treino + push social |
| Dashboard professor | Lista de alunos, status de treinos |
| Dashboard academia | Professores, alunos, metricas |
| Dashboard root | Painel global, aprovacoes |

---

## 11. Script

Arquivo: `apps/api/prisma/seed-comprehensive.ts`

Execucao:
```bash
npx tsx apps/api/prisma/seed-comprehensive.ts
```

O script:
1. Verifica se ja existem dados (idempotente via upsert/unique)
2. Cria academias, professores, alunos
3. Cria treinos e exercicios
4. Registra execucoes de series
5. Cria medidas corporais
6. Cria clubes e membros
7. Cria amizades
8. Cria posts, curtidas e comentarios
9. Exibe resumo final com contagem de registros criados

---

## 12. Credenciais de Teste

| Perfil | Email | Senha |
|--------|-------|-------|
| ROOT | root@gymapp.com | Root@12345 |
| ACADEMIA | academia{N}@gymapp.com | Academia@123 |
| PROFESSOR | prof_{academia}_{n}@gymapp.com | Professor@123 |
| ALUNO | aluno_{n}@gymapp.com | Aluno@123 |

Onde N = 1 a 5 (academias) e n = 1 a 32 (por academia).
