#!/bin/bash
# Start backend and frontend concurrently with correct env vars
PORT=8080 pnpm --filter @workspace/backend run dev &
BACKEND_PID=$!

PORT=8081 BASE_PATH=/ pnpm --filter @workspace/frontend run dev &
FRONTEND_PID=$!

# Forward SIGTERM to both children
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" SIGTERM SIGINT

wait $BACKEND_PID $FRONTEND_PID
