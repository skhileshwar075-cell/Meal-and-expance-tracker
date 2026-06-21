import { spawn } from "node:child_process";

const env = {
  ...process.env,
  NODE_ENV: "development",
  PORT: process.env.PORT || "8080",
};

const pnpmPath = process.env.npm_execpath || "pnpm";
const command = `${pnpmPath} exec -- tsx src/index.ts`;
const child = spawn(command, {
  env,
  stdio: "inherit",
  shell: true,
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
