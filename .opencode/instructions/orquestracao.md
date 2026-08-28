# Política de Orquestração (obrigatória)

Toda solicitação de implementação no GymApp segue o workflow **deepwork**:

## Quando ativar
- Qualquer mudança que toque 2+ arquivos, backend+frontend, schema/rotas, ou envolva decisão de arquitetura.
- Mudanças triviais (1 arquivo, mecânica) podem ir direto, mas SEMPRE com gate do Oracle ao final.

## Fluxo padrão
1. **Orquestrador** (eu, o agente principal) carrega o skill `deepwork` e cria `.slim/deepwork/<slug>.md` com plano de fases e gates.
2. **Librarian** pesquisa fatos (arquivo:linha) quando for preciso contexto confirmado.
3. **Designer** projeta/implementa UI quando a fase for visual — sua entrega vira intenção aceita.
4. **Oracle** revisa como gate após cada fase: veredito APROVADO/REPROVADO com achados bloqueantes vs recomendações.
5. **Fixer** aplica remedições mecânicas aprovadas e roda build/test/lint.
6. Final: validação completa (build + testes + fluxo principal) e resumo.

## Regras
- Nunca pular gate Oracle em mudanças de backend, schema ou auth.
- Atualizar `AGENTS.md` quando regras/modelos novos forem acrescentados.
- Seguir o AGENTS.md: ler skills de `.agent/skills/` antes de comandos/edições; 100% PT-BR nos modelos de domínio; sem comentários de código desnecessários.