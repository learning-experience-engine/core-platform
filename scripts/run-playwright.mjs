import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceDir = resolve(scriptDir, "..");
const playwrightCliPath = resolve(workspaceDir, "node_modules/@playwright/test/cli.js");
const playwrightConfigPath = resolve(workspaceDir, "playwright.config.ts");
const rawArgs = process.argv.slice(2);
const separatorIndex = rawArgs.indexOf("--");
const forwardedArgs =
  separatorIndex === -1
    ? rawArgs
    : [...rawArgs.slice(0, separatorIndex), ...rawArgs.slice(separatorIndex + 1)];

const child = spawn(
  process.execPath,
  [playwrightCliPath, "test", "--config", playwrightConfigPath, ...forwardedArgs],
  {
    cwd: workspaceDir,
    stdio: "inherit"
  }
);

child.on("error", (error) => {
  console.error("Failed to start Playwright runner.");
  console.error(error);
  process.exit(1);
});

child.on("close", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
