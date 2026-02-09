import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import type { IncomingMessage } from "node:http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const nodesPath = path.join(repoRoot, "content", "examples", "nodes.json");
const chainsPath = path.join(repoRoot, "content", "examples", "chains.json");

const readBody = (req: IncomingMessage) => {
  return new Promise<string>((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
};

const jsonApi = (): Plugin => ({
  name: "content-studio-api",
  configureServer(server) {
    const register = (
      route: string,
      filePath: string,
      key: "node" | "chain",
      label: string
    ) => {
      server.middlewares.use(route, async (req, res) => {
        if (!req.url || (req.method !== "GET" && req.method !== "PUT")) {
          res.statusCode = 405;
          res.end("Method not allowed");
          return;
        }

        if (req.method === "GET") {
          try {
            const raw = await fs.readFile(filePath, "utf-8");
            res.setHeader("Content-Type", "application/json");
            res.end(raw);
          } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(error) }));
          }
          return;
        }

        try {
          const body = await readBody(req);
          const payload = JSON.parse(body) as Record<string, Record<string, unknown>>;
          const raw = await fs.readFile(filePath, "utf-8");
          const items = JSON.parse(raw) as Array<Record<string, unknown>>;
          const incoming = payload[key];
          const incomingId = String(incoming?.id ?? "");

          if (!incoming || !incomingId) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: `Missing ${label}.id` }));
            return;
          }

          const next = items.map((item) => (item.id === incomingId ? incoming : item));
          if (!next.some((item) => item.id === incomingId)) {
            next.push(incoming);
          }

          await fs.writeFile(filePath, JSON.stringify(next, null, 2) + "\n", "utf-8");
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: String(error) }));
        }
      });
    };

    register("/api/nodes", nodesPath, "node", "node");
    register("/api/chains", chainsPath, "chain", "chain");

    server.middlewares.use("/api/lint", async (req, res) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.end("Method not allowed");
        return;
      }

      try {
        const url = new URL(req.url ?? "", "http://localhost");
        const format = url.searchParams.get("format") === "json" ? "json" : "text";
        const distPath = path.join(repoRoot, "packages", "content-linter", "dist", "cli.js");
        try {
          await fs.access(distPath);
        } catch {
          res.statusCode = 409;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              ok: false,
              missingDist: true,
              error: "Content linter dist not found. Run pnpm -r build once."
            })
          );
          return;
        }

        const output = await new Promise<{ stdout: string; stderr: string; code: number }>(
          (resolve) => {
            const child = spawn(
              "pnpm",
              [
                "-s",
                "--filter",
                "@lxp/content-linter",
                "lint",
                "--",
                "--format",
                format,
                nodesPath,
                chainsPath
              ],
              { cwd: repoRoot }
            );
            let stdout = "";
            let stderr = "";
            child.stdout.on("data", (chunk) => {
              stdout += String(chunk);
            });
            child.stderr.on("data", (chunk) => {
              stderr += String(chunk);
            });
            child.on("close", (code) => {
              resolve({ stdout, stderr, code: code ?? 0 });
            });
          }
        );

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, format, ...output }));
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: String(error) }));
      }
    });

    server.middlewares.use("/api/lint/build", async (req, res) => {
      if (req.method !== "POST") {
        res.statusCode = 405;
        res.end("Method not allowed");
        return;
      }

      try {
        const output = await new Promise<{ stdout: string; stderr: string; code: number }>(
          (resolve) => {
            const child = spawn(
              "pnpm",
              ["--filter", "@lxp/content-linter", "build"],
              { cwd: repoRoot }
            );
            let stdout = "";
            let stderr = "";
            child.stdout.on("data", (chunk) => {
              stdout += String(chunk);
            });
            child.stderr.on("data", (chunk) => {
              stderr += String(chunk);
            });
            child.on("close", (code) => {
              resolve({ stdout, stderr, code: code ?? 0 });
            });
          }
        );

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, ...output }));
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: String(error) }));
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), jsonApi()],
  server: {
    port: 5174
  }
});
