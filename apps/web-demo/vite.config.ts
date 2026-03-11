import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { listChains, listNodes, loadExampleDomains, matchScenarios, searchContent } from "@lxp/core";

const contentApi = (): Plugin => ({
  name: "web-demo-content-api",
  configureServer(server) {
    server.middlewares.use("/api/nodes", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(listNodes()));
    });

    server.middlewares.use("/api/chains", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(listChains()));
    });

    server.middlewares.use("/api/domains", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(loadExampleDomains()));
    });

    server.middlewares.use("/api/search", (req, res) => {
      if (req.method !== "GET") {
        res.statusCode = 405;
        res.end("Method not allowed");
        return;
      }

      try {
        const url = new URL(req.url ?? "", "http://localhost");
        const query = url.searchParams.get("q") ?? "";
        const topicNodeId = url.searchParams.get("topicNodeId") ?? undefined;
        const domainId = url.searchParams.get("domainId") ?? undefined;
        const kinds = url.searchParams
          .getAll("kind")
          .flatMap((value) => value.split(","))
          .map((value) => value.trim())
          .filter((value): value is "node" | "chain" => value === "node" || value === "chain");
        const limitValue = Number(url.searchParams.get("limit") ?? "");
        const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : undefined;

        const results = searchContent(query, {
          kinds: kinds.length > 0 ? kinds : undefined,
          topicNodeId,
          domainId,
          limit
        });

        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            ok: true,
            query,
            filters: {
              kinds: kinds.length > 0 ? kinds : undefined,
              topicNodeId,
              domainId,
              limit
            },
            results
          })
        );
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: String(error) }));
      }
    });

    server.middlewares.use("/api/scenario-match", (req, res) => {
      if (req.method !== "GET") {
        res.statusCode = 405;
        res.end("Method not allowed");
        return;
      }

      try {
        const url = new URL(req.url ?? "", "http://localhost");
        const query = url.searchParams.get("q") ?? "";
        const limitValue = Number(url.searchParams.get("limit") ?? "");
        const domainId = url.searchParams.get("domainId") ?? undefined;
        const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : undefined;
        const results = matchScenarios(query, { limit, domainId });

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, query, filters: { domainId, limit }, results }));
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: String(error) }));
      }
    });
  }
});

export default defineConfig({
  plugins: [react(), contentApi()],
  server: {
    port: 5173
  }
});
