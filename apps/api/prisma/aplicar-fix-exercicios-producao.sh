#!/usr/bin/env bash
#
# aplicar-fix-exercicios-producao.sh
#
# Roda o script de correção de nomes/textos em inglês (rename-exercicios-en-pt.ts)
# direto contra o banco de PRODUÇÃO do Railway, usando a sua própria sessão
# autenticada do Railway CLI (não usa nenhum token embutido no repo).
#
# Pré-requisitos:
#   - Estar logado no Railway CLI: `railway login`
#   - Ter acesso ao projeto gymApp no Railway
#
# Uso:
#   cd apps/api
#   bash prisma/aplicar-fix-exercicios-producao.sh
#
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

PROJECT_ID="354a43f7-6e31-4152-939f-74b59ddc28eb"
ENVIRONMENT_ID="73511a03-f4cb-47bf-8a5c-f2c0242aaef0"
SERVICE_ID="f94c779a-1cca-4a74-88d3-a9209adfd121"

# ─── Garante Node 20+ (tsx/vite/npm 11 quebram em Node 18) ──────────────────
# Baixa um Node portátil só se o Node do sistema for antigo. Não mexe no
# Node padrão da máquina — fica isolado em ~/.cache/gymapp-node20.
NODE_MAJOR="$(node -v 2>/dev/null | sed 's/^v//; s/\..*//' || echo 0)"
if [ "$NODE_MAJOR" -lt 20 ] 2>/dev/null; then
  CACHE_DIR="$HOME/.cache/gymapp-node20"
  if [ ! -x "$CACHE_DIR/bin/node" ]; then
    echo "⬇️  Node do sistema é v$(node -v 2>/dev/null || echo '?'), preciso de 20+. Baixando Node 20 portátil (uma vez só)..."
    mkdir -p "$CACHE_DIR"
    ARCH="$(uname -m)"
    JARCH="$([ "$ARCH" = "arm64" ] && echo arm64 || echo x64)"
    curl -fsSL -o /tmp/gymapp-node20.tar.gz "https://nodejs.org/dist/v20.18.1/node-v20.18.1-darwin-${JARCH}.tar.gz"
    tar -xzf /tmp/gymapp-node20.tar.gz --strip-components=1 -C "$CACHE_DIR"
    rm -f /tmp/gymapp-node20.tar.gz
  fi
  export PATH="$CACHE_DIR/bin:$PATH"
  echo "✅ Usando Node $(node -v) (portátil, isolado em $CACHE_DIR)"
fi

echo "🔗 Vinculando ao serviço da API no Railway (projeto gymApp, produção)..."
railway link --project "$PROJECT_ID" --environment "$ENVIRONMENT_ID" --service "$SERVICE_ID"

echo ""
echo "⚠️  Isso vai rodar contra o banco de PRODUÇÃO:"
echo "   - Renomeia 14 exercícios cujo nome está em inglês (Wall Sit, Pull Up, Superman, etc.)"
echo "   - Corrige 21 descrições com o texto corrompido 'desenvolvimentoão' -> 'pressão'"
echo "   - É idempotente: seguro rodar mais de uma vez"
read -r -p "Confirma que quer aplicar em produção agora? [y/N] " resposta
if [[ ! "$resposta" =~ ^[Yy]$ ]]; then
  echo "Cancelado."
  exit 1
fi

echo ""
echo "🚀 Rodando o script de correção contra o banco de produção..."
railway run npx tsx prisma/rename-exercicios-en-pt.ts

echo ""
echo "✅ Concluído."
