#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Node, QuestionChain } from "@lxp/schema";
import { formatMessages, lintChains, lintNodes } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultPath = path.resolve(__dirname, "../../../content/examples/nodes.json");
const defaultChainPath = path.resolve(__dirname, "../../../content/examples/chains.json");

const readNodes = async (inputPath: string): Promise<Node[]> => {
  const raw = await fs.readFile(inputPath, "utf-8");
  const parsed = JSON.parse(raw) as Node[];
  return parsed;
};

const readChains = async (inputPath: string): Promise<QuestionChain[]> => {
  const raw = await fs.readFile(inputPath, "utf-8");
  const parsed = JSON.parse(raw) as QuestionChain[];
  return parsed;
};

const run = async (): Promise<number> => {
  const targetPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : defaultPath;
  const chainPath = process.argv[3]
    ? path.resolve(process.cwd(), process.argv[3])
    : defaultChainPath;

  try {
    const nodes = await readNodes(targetPath);
    const chains = await readChains(chainPath);
    const nodeResult = lintNodes(nodes);
    const chainResult = lintChains(chains, nodes);
    const result = {
      errors: [...nodeResult.errors, ...chainResult.errors],
      warnings: [...nodeResult.warnings, ...chainResult.warnings]
    };
    const lines = formatMessages(result);

    if (lines.length > 0) {
      for (const line of lines) {
        if (line.startsWith("[ERROR]")) {
          console.error(line);
        } else {
          console.warn(line);
        }
      }
    }

    return result.errors.length > 0 ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] failed to lint content: ${message}`);
    return 1;
  }
};

run().then((code) => {
  process.exitCode = code;
});
