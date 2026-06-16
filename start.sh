#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# SmartTiffin — startup script
#
# Starts both the backend API server and the React frontend concurrently.
#
# Ports:
#   8080  →  Backend (Express API, proxied at /api)
#   8081  →  Frontend (React + Vite, proxied at /)
#
# Usage:
#   bash start.sh          # normal start
#   PORT=... bash start.sh # override is ignored; ports are hard-coded per service
#
# To start services individually:
#   PORT=8080 pnpm --filter @workspace/backend run dev
#   PORT=8081 BASE_PATH=/ pnpm --filter @workspace/frontend run dev
# ─────────────────────────────────────────────────────────────────────────────

set -e

# Kill any stale processes holding our ports (clean restart safety)
fuser -k 8080/tcp 2>/dev/null || true
fuser -k 8081/tcp 2>/dev/null || true
sleep 0.5

echo "[start] Starting backend on port 8080..."
PORT=8080 pnpm --filter @workspace/backend run dev &
BACKEND_PID=$!

echo "[start] Starting frontend on port 8081..."
PORT=8081 BASE_PATH=/ pnpm --filter @workspace/frontend run dev &
FRONTEND_PID=$!

# Propagate Stop signal cleanly to both child processes
cleanup() {
  echo "[start] Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
}
trap cleanup SIGTERM SIGINT EXIT

wait "$BACKEND_PID" "$FRONTEND_PID"
