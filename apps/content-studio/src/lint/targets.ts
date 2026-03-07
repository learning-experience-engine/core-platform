import type { LintIssue } from "./types";

export const buildLintTargetKey = (scope: "node" | "chain", id: string, path = ""): string => {
  return `${scope}:${id}:${encodeURIComponent(path)}`;
};

export const buildLintFallbackPaths = (path: string, topPath: string): string[] => {
  const next: string[] = [];
  if (path) {
    next.push(path);
  }

  const stepMatch = path.match(/^steps\[(\d+)\](?:\.(.+))?$/);
  if (stepMatch) {
    const stepIndex = stepMatch[1];
    const tail = stepMatch[2] ?? "";
    if (tail.startsWith("mentions[")) {
      next.push(`steps[${stepIndex}].mentions`);
    }
    next.push(`steps[${stepIndex}]`);
  }

  const relationMatch = path.match(/^relations\[(\d+)\](?:\.(.+))?$/);
  if (relationMatch) {
    next.push(`relations[${relationMatch[1]}]`);
  }

  if (/^mentions\[/.test(path)) {
    next.push("mentions");
  }

  next.push(topPath);
  return Array.from(new Set(next));
};

export const buildNodeMentionPath = (term: string): string => {
  return `mentions[${JSON.stringify(term)}]`;
};

export const buildChainMentionPath = (index: number, term: string): string => {
  return `steps[${index}].mentions[${JSON.stringify(term)}]`;
};

export const formatLintMessage = (issue: LintIssue): string => {
  return issue.message.replace(/^\[(ERROR|WARN)\]\s+/, "").trim();
};
