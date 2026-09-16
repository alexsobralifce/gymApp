#!/usr/bin/env bash
#
# aplicar-fix-exercicios-producao.sh
#
# Roda o script de correção de nomes/textos em inglês (rename-exercicios-en-pt.ts)
# direto contra o banco de PRODUÇÃO, usando a URL PÚBLICA do Postgres do Railway.
#
# Por que a URL pública e não `railway run`?
#   `railway run` injeta a DATABASE_URL do jeito que o serviço da API a usa,
#   que é a URL PRIVADA (postgres.railway.internal) — só alcançável de dentro
#   da rede do Railway. Rodando deste computador, isso nunca conecta.
#
# Onde achar a URL pública:
#   Painel Railway → projeto gymApp → serviço Postgres → aba "Connect"
#   → "Postgres Connection URL" em "Public Network"
#   (ou aba "Variables" → variável DATABASE_PUBLIC_URL)
#
# Uso:
#   cd apps/api
#   DATABASE_URL="postgresql://usuario:senha@algo.proxy.rlwy.net:PORTA/railway" \
#     bash prisma/aplicar-fix-exercicios-producao.sh
#
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Faltou a DATABASE_URL pública. Rode assim:"
  echo ""
  echo '   DATABASE_URL="postgresql://usuario:senha@algo.proxy.rlwy.net:PORTA/railway" \'
  echo "     bash prisma/aplicar-fix-exercicios-producao.sh"
  echo ""
  echo "Onde achar: painel Railway → projeto gymApp → serviço Postgres → aba"
  echo "\"Connect\" → \"Postgres Connection URL\" em \"Public Network\"."
  exit 1
fi

if [[ "$DATABASE_URL" == *".railway.internal"* ]]; then
  echo "❌ Essa é a URL PRIVADA (${DATABASE_URL})."
  echo "   Ela só funciona de dentro da rede do Railway, não do seu computador."
  echo "   Use a URL pública (aba \"Connect\" do serviço Postgres, \"Public Network\")."
  exit 1
fi

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
npx tsx prisma/rename-exercicios-en-pt.ts

echo ""
echo "✅ Concluído."
