#!/usr/bin/env bash
#
# resolver-migracao-drift.sh
#
# Marca a migração 20260916140000_biblioteca_planos_e_ajustes_pendentes
# como JÁ APLICADA em produção, sem executar o SQL dela.
#
# Por quê: a produção já tem essas tabelas/colunas (Biblioteca de Planos,
# alunos.nivel_treino/objetivo_treino/restricoes, exercicios.nivel, etc.)
# porque alguém rodou `prisma db push` direto no banco em algum momento,
# sem gerar a migração correspondente. Essa migração foi criada agora só
# pra registrar formalmente no histórico o que já existe — rodá-la de
# verdade (`migrate deploy`) contra produção quebraria com "already exists".
#
# IMPORTANTE: rode isso ANTES do próximo deploy da API. Sem isso, o
# próximo `prisma migrate deploy` (que roda automaticamente no deploy,
# via railway-start.sh) vai falhar tentando recriar tabelas que já existem.
#
# Uso:
#   cd apps/api
#   DATABASE_URL='postgresql://usuario:senha@algo.proxy.rlwy.net:PORTA/railway' \
#     bash prisma/resolver-migracao-drift.sh
#
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

MIGRATION="20260916140000_biblioteca_planos_e_ajustes_pendentes"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Faltou a DATABASE_URL pública. Rode assim:"
  echo ""
  echo '   DATABASE_URL="postgresql://usuario:senha@algo.proxy.rlwy.net:PORTA/railway" \'
  echo "     bash prisma/resolver-migracao-drift.sh"
  echo ""
  echo "Onde achar: painel Railway → projeto gymApp → serviço Postgres → aba"
  echo "\"Connect\" → \"Postgres Connection URL\" em \"Public Network\"."
  exit 1
fi

if [[ "$DATABASE_URL" == *".railway.internal"* ]]; then
  echo "❌ Essa é a URL PRIVADA. Use a URL pública (aba Connect, Public Network)."
  exit 1
fi

# ─── Garante Node 20+ ────────────────────────────────────────────────────
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
echo "⚠️  Isso vai marcar a migração \"$MIGRATION\""
echo "   como já aplicada na tabela de controle _prisma_migrations do banco"
echo "   de PRODUÇÃO — SEM rodar o SQL dela (as tabelas já existem lá)."
echo "   É seguro e não altera nenhum dado, só o histórico de migrações."
read -r -p "Confirma? [y/N] " resposta
if [[ ! "$resposta" =~ ^[Yy]$ ]]; then
  echo "Cancelado."
  exit 1
fi

echo ""
echo "🚀 Marcando migração como resolvida..."
npx prisma migrate resolve --applied "$MIGRATION"

echo ""
echo "✅ Concluído. Confira com:"
echo "   DATABASE_URL='...' npx prisma migrate status"
