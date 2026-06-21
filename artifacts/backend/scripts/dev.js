import { spawn } from "node:child_process";

const env = {
  ...process.env,
  NODE_ENV: "development",
  PORT: process.env.PORT || "8080",
};

const pnpmPath = process.env.npm_execpath || "pnpm";
let execPath = pnpmPath;
let execArgs = ["exec", "--", "tsx", "src/index.ts"];

// If npm_execpath points to a JS file (e.g. npm-cli.js or pnpm.mjs), run it via Node
if (pnpmPath.endsWith(".js") || pnpmPath.endsWith(".mjs")) {
  execPath = process.execPath;
  execArgs = [pnpmPath, "exec", "--", "tsx", "src/index.ts"];
}

console.log(`Starting backend dev server: ${execPath} ${execArgs.join(" ")}`);
const child = spawn(execPath, execArgs, {
  env,
  stdio: "inherit",
  shell: false,
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
