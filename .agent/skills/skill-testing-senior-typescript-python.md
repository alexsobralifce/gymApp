---
name: senior-qa-production-readiness
description: >
  Skill de engenharia de testes para atuar como dev sênior especialista em QA em
  projetos TypeScript e Python. Usar sempre que o objetivo for encontrar bugs
  (simples a complexos), validar cobertura real de comportamento (não só de
  linhas), e decidir com evidência se um sistema está pronto para produção.
version: 1.0
last_updated: 2026-09-02
---

# Skill: Testes Modernos para Produção (TypeScript + Python)

## Propósito

Atuar como um dev sênior de QA/testing que combina múltiplas camadas de teste
para descobrir bugs — dos triviais (input inválido, off-by-one, null/undefined)
aos complexos (race conditions, contratos de API quebrados, regressões de
performance, falhas sob carga, vulnerabilidades de segurança) — e emitir um
veredito objetivo de **pronto/não pronto para produção**, com evidências.

Esta skill não trata "coverage alto" como sinônimo de qualidade. Trata como
sinal de qualidade real: mutação sobrevivente baixa, contratos verificados,
propriedades formais testadas, comportamento sob falha conhecido, e
observabilidade ligada ao pipeline de teste.

---

## 1. Mentalidade antes da ferramenta

Antes de escrever qualquer teste, classificar o código por risco (técnica
usada por times maduros em 2026):

- **Core** — funcionalidade que não pode quebrar (pagamento, autenticação, cálculo de nota/preço).
- **Risky** — área que o time já sabe ser frágil ou complexa.
- **Sensível a configuração** — comportamento muda por env/flag/tenant.
- **Recém-corrigida** — bug fixado recentemente (alto risco de regressão).
- **Crônica** — módulo que já quebrou várias vezes no passado.

Investir desproporcionalmente mais testes (e mutation testing) nessas áreas
em vez de distribuir esforço igualmente por todo o código [web:1].

**Regra de ouro:** cobertura de linha é métrica de vaidade isolada. 80% de
cobertura com asserts fracos (`expect(result).toBeDefined()`) não pega quase
nada. Sempre parear cobertura com **mutation score** [web:4].

---

## 2. A pirâmide certa para cada tipo de código

Não existe uma pirâmide universal. Usar o formato conforme a natureza do
sistema [web:4][web:10]:

| Tipo de sistema | Formato recomendado | Proporção 2026 |
|---|---|---|
| Backend com lógica de negócio pesada (cálculos, regras, motor de regras) | Pirâmide clássica | Muitos unitários, poucos e2e |
| Frontend / serviços que só integram (glue code, BFFs, orquestração de APIs) | Trophy (Kent C. Dodds) — foco em integração | Mais integração, unitário e e2e como suporte |
| Heurística geral usada por times full-stack | Mista | ~70% unit / 20% integração / 10% e2e [web:10] |

---

## 3. Stack de ferramentas por linguagem

### TypeScript / JavaScript

| Camada | Ferramenta padrão 2026 | Por quê |
|---|---|---|
| Unit / integração | **Vitest** | Substituiu o Jest como padrão em projetos novos: 5–10x mais rápido, config compartilhada com Vite, paralelismo nativo [web:9][web:10] |
| Componente (React/Vue) | **Testing Library** sobre Vitest | Mais simples que Playwright Component Testing para a maioria dos times [web:8] |
| E2E | **Playwright** | Superou Cypress: multi-browser real, auto-wait reduz flakiness, sharding nativo em CI [web:4][web:14] |
| Mutation testing | **Stryker** | Mede se os testes realmente matam mutantes, não só cobrem linhas [web:4] |
| Contrato de API | **Pact / PactFlow** | Consumer-driven contracts entre serviços [web:16][web:22] |
| Lint/tipos como gate | `tsc --noEmit` + `eslint` com `typescript-eslint` estrito | Bug barato de pegar antes mesmo do teste rodar [web:15] |
| Segurança de dependências | Snyk, Dependabot, `npm audit` | Bloqueia vulnerabilidade conhecida antes do merge [web:4] |

Legado com Jest não precisa ser reescrito de uma vez: a API do Vitest é
compatível o suficiente para migração incremental, rodando os dois runners
lado a lado durante a transição [web:8].

### Python

| Camada | Ferramenta padrão 2026 | Por quê |
|---|---|---|
| Unit / fixtures | **pytest** | Padrão de fato; parametrize, fixtures, plugins maduros |
| Property-based testing | **Hypothesis** | Em vez de fixar exemplos, define propriedades e a lib gera centenas de casos-limite automaticamente — pega bugs que exemplos manuais nunca cobririam [web:18] |
| Contrato de API a partir de OpenAPI | **Schemathesis** (construído sobre Hypothesis) | Lê o schema OpenAPI/GraphQL, deriva o domínio de entrada válido e inválido, e faz fuzzing estrutural contra os endpoints reais [web:18][web:20] |
| Mutation testing | **mutmut** ou **cosmic-ray** | Equivalente Python ao Stryker |
| Tipagem estática | **Pyright** ou **mypy** em modo estrito | Pega bugs de tipo antes de rodar um teste sequer [web:15] |
| Contrato entre serviços | **Pact-python** | Mesma lógica de consumer-driven contract do lado Python [web:22] |
| Segurança de código | **Bandit**, **Semgrep** | SAST focado em padrões inseguros específicos de Python |

---

## 4. As camadas modernas que substituem "só escrever mais teste unitário"

### 4.1 Property-based testing (a arma contra bugs complexos)

Em vez de `assert soma(2, 3) == 5`, declarar uma propriedade que deve valer
para qualquer entrada válida, por exemplo "somar e depois subtrair o mesmo
valor sempre retorna o valor original". A ferramenta (Hypothesis em Python,
`fast-check` em TypeScript) gera automaticamente centenas de casos, incluindo
extremos (`0`, negativo, `NaN`, string vazia, unicode, valores enormes) que um
humano dificilmente pensaria em escrever manualmente [web:18].

Usar property-based testing prioritariamente em:
- Parsers e serializadores (JSON, CSV, datas).
- Funções matemáticas/financeiras (arredondamento, conversão de moeda).
- Validação de input de formulário/API.
- Qualquer função pura com regra de negócio complexa.

### 4.2 Mutation testing (a arma contra "teste que não testa nada")

Ferramentas como Stryker (TS/JS) e mutmut (Python) alteram automaticamente o
código-fonte (trocam `>` por `>=`, `+` por `-`, removem uma linha) e rodam a
suíte de testes contra cada mutação. Se os testes continuam passando com o
código quebrado, isso é um **mutante sobrevivente** — evidência de que aquele
trecho não está de fato protegido, mesmo que "coberto" [web:4].

Isso é hoje considerado obrigatório para testes gerados por IA (Claude Code,
Cursor etc.), porque esses testes tendem a ser sintaticamente plausíveis mas
sem asserts que realmente capturam a lógica [web:4].

**Meta prática:** rodar mutation testing localmente só nos módulos críticos
(risco alto) e via CI noturno no restante — rodar em todo commit é caro
demais para a maioria dos times [web:4].

### 4.3 Contract testing (a arma contra "quebrou a integração entre serviços")

Quando dois serviços (ou frontend/backend) se comunicam, testes de integração
tradicionais exigem subir ambos os lados — lento e frágil. Contract testing
resolve isso com um contrato assinado:

1. O **consumidor** define, em teste, exatamente as requisições que faz e a
   resposta mínima que espera. Isso gera um arquivo de "pact" (JSON) [web:22].
2. O **provedor** roda esse pact contra sua própria implementação real e
   verifica que cumpre o que foi prometido, sem o consumidor precisar estar
   no ar [web:16][web:22].
3. Um **Pact Broker** centraliza os contratos e bloqueia deploy se um lado
   quebrar a promessa do outro.

Para APIs com schema OpenAPI, **Schemathesis** cumpre um papel similar de
forma automática: gera fuzzing estrutural a partir do schema e verifica se a
API responde conforme o contrato declarado, incluindo casos que violam o
schema de propósito [web:18][web:20].

### 4.4 Segurança como teste, não como auditoria anual

Segurança entrou no pipeline como gate obrigatório, não como checklist
esporádico [web:15]:

- **SAST** (análise estática) — Semgrep, SonarQube, `eslint-plugin-security`,
  Bandit — roda no código-fonte a cada commit/PR, sem precisar da app no ar.
- **SCA** (composição de dependências) — Snyk, Dependabot, `npm audit`,
  `pip-audit` — detecta CVE conhecida em bibliotecas de terceiros.
- **DAST** (dinâmico) — OWASP ZAP baseline scan contra ambiente de staging,
  bloqueando o pipeline se achar vulnerabilidade de severidade alta [web:19][web:21].
- Regra prática de gate: falha de severidade alta em SAST/DAST **bloqueia o
  merge ou o deploy**, não vira só um ticket para "ver depois" [web:21][web:25].

### 4.5 Testes de carga e performance como gate, não como projeto à parte

Usar k6 ou Artillery para afirmar, de forma automatizada, algo como "p95 de
latência não pode regredir além de um limiar" na esteira de merge para main,
não apenas em um teste manual isolado antes de um lançamento grande [web:4].

### 4.6 Shift-right: testar depois que já está em produção

Shift-left (testar cedo) deixou de ser suficiente sozinho. Times maduros
complementam com shift-right [web:7][web:13]:

- **Canary releases / dark launches** — expor a mudança para uma fatia
  pequena de tráfego real antes do rollout total.
- **Synthetic monitoring + RUM** (real user monitoring) — simular jornadas
  críticas continuamente em produção e medir experiência real do usuário.
- **Observabilidade como input de teste** — correlacionar traces e métricas
  de produção com a suíte de testes, e usar incidentes reais para alimentar
  uma biblioteca viva de cenários de teste [web:12][web:13].

---

## 5. Pipeline de CI/CD recomendado (gate por estágio)

Estruturar o pipeline em camadas de custo crescente, falhando rápido nas
camadas baratas antes de gastar tempo nas caras [web:4]:

1. **Em cada push:** lint, type-check (`tsc`/Pyright/mypy), testes unitários
   apenas dos módulos afetados (test impact analysis), SAST leve, SCA.
2. **Em cada PR:** testes de integração completos, contract tests contra o
   Pact Broker / mock provider, scan de acessibilidade (axe-core), suíte
   Playwright completa em paralelo (sharding).
3. **No merge para main:** deploy em ambiente efêmero/staging, smoke e2e,
   gate de performance (k6/Artillery) checando regressão de p95, DAST
   baseline (ZAP).
4. **Noturno:** mutation testing completo, e2e em todos os browsers/devices,
   auditoria de dependências, experimentos de chaos engineering em ambiente
   não produtivo [web:4].

**Sobre flakiness:** teste instável custa em média 6–8 horas por engenheiro
por semana quando ignorado. A prática correta é quarentenar o teste flaky
imediatamente (remover do gate, abrir ticket) em vez de mascarar com retry
automático — retry esconde o sintoma sem corrigir a causa [web:4].

---

## 6. Checklist de "pronto para produção"

Considerar o sistema apto para produção somente quando todos os itens abaixo
forem verdadeiros, com evidência (não opinião):

- Lint e type-check em modo estrito passam sem exceções suprimidas.
- Cobertura de linha existe, mas a decisão real usa **mutation score** nas
  áreas classificadas como Core/Risky — sem mutante sobrevivente relevante
  ali [web:4].
- Toda função pura de regra de negócio crítica (cálculo, parsing, validação)
  tem ao menos um teste baseado em propriedades (Hypothesis/fast-check), não
  só exemplos fixos [web:18].
- Toda integração entre serviços tem contrato verificado (Pact) ou
  fuzzing de schema (Schemathesis) rodando no pipeline, não só teste manual
  de "funcionou no Postman" [web:16][web:18].
- SAST, SCA e DAST rodam automaticamente e bloqueiam merge/deploy em
  severidade alta — não são checklist manual pós-fato [web:19][web:21].
- Existe gate de performance automatizado (latência p95) comparando a
  branch atual contra a baseline de produção [web:4].
- Testes flaky estão zerados ou explicitamente quarentenados com ticket
  aberto — não escondidos atrás de retry [web:4].
- Existe plano de shift-right: pelo menos canary/rollback automático e
  monitoramento sintético da jornada crítica pós-deploy [web:7][web:13].
- Métrica de **defect escape rate** (bugs achados em produção vs. achados
  antes) é acompanhada como indicador principal de qualidade do processo,
  não só "quantos testes passaram" [web:6].

---

## 7. Como aplicar esta skill num code review ou PR

Ao revisar código como o dev sênior desta skill, seguir esta sequência
mental, nesta ordem de prioridade:

1. Esse código toca uma área Core/Risky/Crônica? Se sim, exigir mutation
   testing e property-based testing antes de aprovar, não só teste de
   exemplo feliz.
2. Os testes existentes realmente falhariam se a lógica quebrasse (checar
   mentalmente 2–3 mutações óbvias) ou só "passam por passar"?
3. Se há integração entre serviços/times, existe contrato formalizado
   (Pact/Schemathesis) ou é um acordo verbal frágil?
4. Alguma dependência nova entrou sem passar por SCA?
5. Existe cenário de falha testado (timeout, erro 500 de dependência, dado
   nulo/corrompido), não só o caminho feliz?
6. Se isso quebrar em produção, existe alarme/observabilidade que avisa
   antes do usuário reportar?

Se a resposta for "não" em qualquer um desses pontos numa área Core, o
veredito é **não pronto para produção**, independente da cobertura de linha
reportada.
