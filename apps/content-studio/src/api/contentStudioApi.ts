import type { Node, QuestionChain } from "@lxp/schema";
import type { LintApiResponse } from "../lint/types";

export const fetchNodes = async (): Promise<Node[]> => {
  const response = await fetch("/api/nodes");
  if (!response.ok) {
    throw new Error(`Failed to load nodes: ${response.status}`);
  }
  return (await response.json()) as Node[];
};

export const fetchChains = async (): Promise<QuestionChain[]> => {
  const response = await fetch("/api/chains");
  if (!response.ok) {
    throw new Error(`Failed to load chains: ${response.status}`);
  }
  return (await response.json()) as QuestionChain[];
};

export const saveNode = async (node: Node): Promise<void> => {
  const response = await fetch("/api/nodes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ node })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to save node");
  }
};

export const saveChain = async (chain: QuestionChain): Promise<void> => {
  const response = await fetch("/api/chains", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chain })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to save chain");
  }
};

export const runContentLint = async (format: "text" | "json"): Promise<LintApiResponse> => {
  const response = await fetch(`/api/lint?format=${format}`, { method: "POST" });
  const payload = (await response.json().catch(() => null)) as LintApiResponse | null;
  if (!response.ok) {
    if (payload) {
      return { ...payload, ok: false };
    }
    const message = await response.text();
    throw new Error(message || "Failed to run lint");
  }
  if (!payload) {
    throw new Error("Failed to parse lint response");
  }
  return { ...payload, ok: true };
};

export const runContentLintBuild = async (): Promise<LintApiResponse> => {
  const response = await fetch("/api/lint/build", { method: "POST" });
  const payload = (await response.json().catch(() => null)) as LintApiResponse | null;
  if (!response.ok) {
    if (payload) {
      return { ...payload, ok: false };
    }
    const message = await response.text();
    throw new Error(message || "Failed to build linter");
  }
  if (!payload) {
    throw new Error("Failed to parse build response");
  }
  return { ...payload, ok: true };
};
