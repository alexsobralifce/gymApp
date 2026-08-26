#!/usr/bin/env bash
#
# dev.sh — inicia backend (Fastify :3333) e frontend (Vite :5173) juntos.
# Uso: ./dev.sh   (ou: npm run dev)
#
set -euo pipefail

cd "$(dirname "$0")"

# ─── Cores ───────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  C_API=$'\033[1;34m'   # azul
  C_WEB=$'\033[1;35m'   # magenta
  C_INFO=$'\033[1;33m'  # amarelo
  C_OK=$'\033[1;32m'    # verde
  C_OFF=$'\033[0m'
else
  C_API=""; C_WEB=""; C_INFO=""; C_OK=""; C_OFF=""
fi

prefixo() { # prefixo <cor> <label> — lê stdin, escreve com prefixo
  while IFS= read -r linha; do printf '%s[%s]%s %s\n' "$1" "$2" "$C_OFF" "$linha"; done
}

echo "${C_OK}▶ GymApp — ambiente de desenvolvimento${C_OFF}"

# ─── Dependências (Postgres + Redis via Docker) ──────────────────────────────
if command -v docker >/dev/null 2>&1 && [ -f docker-compose.yml ]; then
  if ! docker compose ps --status running 2>/dev/null | grep -qE 'postgres|redis'; then
    echo "${C_INFO}⚠ Subindo Postgres e Redis via docker compose...${C_OFF}"
    docker compose up -d postgres redis || echo "${C_INFO}⚠ Não foi possível subir os containers — a API pode falhar ao conectar.${C_OFF}"
    sleep 2
  else
    echo "${C_OK}✓ Postgres e Redis já estão rodando${C_OFF}"
  fi
else
  echo "${C_INFO}⚠ Docker indisponível — assumindo Postgres (:5432) e Redis (:6379) já rodando.${C_OFF}"
fi

# ─── Cleanup garantido ───────────────────────────────────────────────────────
PIDS=()
cleanup() {
  echo ""
  echo "${C_INFO}■ Encerrando processos...${C_OFF}"
  for pid in "${PIDS[@]:-}"; do
    # mata primeiro os filhos (node/vite gerados pelo npm), depois o wrapper
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# ─── Processos ───────────────────────────────────────────────────────────────
npm run dev:api  2>&1 | prefixo "$C_API" "api" &
PIDS+=($!)
npm run dev:web  2>&1 | prefixo "$C_WEB" "web" &
PIDS+=($!)

echo "${C_OK}✓ API em http://localhost:3333 · Web em http://localhost:5173 (Ctrl+C para parar)${C_OFF}"

# Loop de vigilância portátil (bash 3.2 do macOS não tem `wait -n`):
# se qualquer um dos dois processos morrer, encerra o outro e sai.
while :; do
  for pid in "${PIDS[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "${C_INFO}⚠ Um dos processos terminou (pid $pid). Encerrando tudo.${C_OFF}"
      exit 1
    fi
  done
  sleep 2
done
