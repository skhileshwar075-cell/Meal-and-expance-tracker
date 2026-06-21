const { rmSync } = require("node:fs");
const { exit } = require("node:process");

const lockFiles = ["package-lock.json", "yarn.lock"];
for (const file of lockFiles) {
  rmSync(file, { force: true, recursive: true });
}

const userAgent = process.env.npm_config_user_agent || process.env.npm_execpath || "";
if (!/\bpnpm\b|pnpm\//.test(userAgent)) {
  console.error("Use pnpm instead");
  exit(1);
}
