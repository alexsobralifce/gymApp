---
description: "Chama uma tool no servidor MCP LangChain Orchestrator. Uso: /mcp-tool <nome> '<args>'"
agent: build
model: deepseek-v4-flash
---

Execute a tool `$1` no servidor MCP LangChain Orchestrator com os argumentos `$2` usando:

```bash
node /Users/alexandrerocha/orquestrador-mcp/client.mjs call '$1' '$2' 2>/tmp/mcp-err.log
```

Se o segundo argumento (`$2`) não for fornecido, passe `{}` como argumento.

Apresente o resultado da tool de forma clara. Se houver erro, explique o que aconteceu.