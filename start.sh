#!/bin/bash
set -e

# Kill any stale processes on our ports before starting
fuser -k 8080/tcp 2>/dev/null || true
fuser -k 8081/tcp 2>/dev/null || true
sleep 0.5

# Start backend
PORT=8080 pnpm --filter @workspace/backend run dev &
BACKEND_PID=$!

# Start frontend
PORT=8081 BASE_PATH=/ pnpm --filter @workspace/frontend run dev &
FRONTEND_PID=$!

# Forward SIGTERM/SIGINT to both children so Stop works cleanly
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; wait $BACKEND_PID $FRONTEND_PID 2>/dev/null" SIGTERM SIGINT EXIT

wait $BACKEND_PID $FRONTEND_PID
