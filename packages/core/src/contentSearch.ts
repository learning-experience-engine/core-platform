import type { LocalizedText, Node, QuestionChain } from "@lxp/schema";
import { loadExampleChains, loadExampleDomains, loadExamples } from "./examples.js";

export type SearchResultKind = "node" | "chain";

export type SearchOptions = {
  kinds?: SearchResultKind[];
  limit?: number;
  topicNodeId?: string;
  domainId?: string;
};

export type SearchResult = {
  kind: SearchResultKind;
  id: string;
  title: string;
  excerpt: string;
  score: number;
  topicNodeId?: string;
};

const DEFAULT_LIMIT = 8;

const normalize = (value: string): string => value.trim().toLowerCase();

const tokenize = (value: string): string[] => {
  return Array.from(new Set(normalize(value).split(/\s+/).filter(Boolean)));
};

const flattenLocalizedText = (value?: LocalizedText): string => {
  if (!value) return "";
  return typeof value === "string" ? value : Object.values(value).join(" ");
};

const trimExcerpt = (value: string): string => value.replace(/\s+/g, " ").trim();

const isTopicInDomain = (topicNodeId: string, domainId?: string): boolean => {
  if (!domainId) return true;
  const domain = loadExampleDomains().find((item) => item.id === domainId);
  return domain ? domain.topicNodeIds.includes(topicNodeId) : false;
};

const buildExcerpt = (candidates: string[], query: string): string => {
  const normalizedQuery = normalize(query);
  for (const candidate of candidates) {
    const text = trimExcerpt(candidate);
    if (!text) continue;
    const source = text.toLowerCase();
    const index = source.indexOf(normalizedQuery);
    if (index >= 0) {
      const start = Math.max(0, index - 20);
      const end = Math.min(text.length, index + normalizedQuery.length + 40);
      const prefix = start > 0 ? "…" : "";
      const suffix = end < text.length ? "…" : "";
      return `${prefix}${text.slice(start, end)}${suffix}`;
    }
  }

  return trimExcerpt(candidates.find((candidate) => trimExcerpt(candidate)) ?? "");
};

const scoreText = (source: string, query: string, tokens: string[], weights: {
  exact: number;
  startsWith: number;
  includes: number;
  token: number;
}): number => {
  const normalizedSource = normalize(source);
  if (!normalizedSource) return 0;

  let score = 0;
  if (normalizedSource === query) score += weights.exact;
  else if (normalizedSource.startsWith(query)) score += weights.startsWith;
  else if (normalizedSource.includes(query)) score += weights.includes;

  tokens.forEach((token) => {
    if (token !== query && normalizedSource.includes(token)) {
      score += weights.token;
    }
  });

  return score;
};

const scoreNode = (node: Node, query: string, tokens: string[]): number => {
  const body = flattenLocalizedText(node.body);
  let score = 0;

  score += scoreText(node.id, query, tokens, { exact: 220, startsWith: 120, includes: 80, token: 8 });
  score += scoreText(node.title, query, tokens, { exact: 260, startsWith: 130, includes: 85, token: 10 });
  score += scoreText(body, query, tokens, { exact: 0, startsWith: 0, includes: 35, token: 4 });

  node.aliases?.forEach((alias) => {
    score += scoreText(alias, query, tokens, { exact: 220, startsWith: 120, includes: 80, token: 8 });
  });

  Object.keys(node.mentions).forEach((mention) => {
    score += scoreText(mention, query, tokens, { exact: 0, startsWith: 0, includes: 20, token: 3 });
  });

  return score;
};

const scoreChain = (chain: QuestionChain, query: string, tokens: string[]): number => {
  let score = 0;
  const goals = [flattenLocalizedText(chain.goal?.child), flattenLocalizedText(chain.goal?.adult)];

  score += scoreText(chain.id, query, tokens, { exact: 120, startsWith: 90, includes: 70, token: 8 });
  score += scoreText(chain.title, query, tokens, { exact: 150, startsWith: 110, includes: 85, token: 10 });
  goals.forEach((goal) => {
    score += scoreText(goal, query, tokens, { exact: 0, startsWith: 0, includes: 30, token: 4 });
  });

  chain.steps.forEach((step) => {
    score += scoreText(step.question, query, tokens, { exact: 0, startsWith: 0, includes: 24, token: 4 });
    score += scoreText(flattenLocalizedText(step.summary?.child), query, tokens, {
      exact: 0,
      startsWith: 0,
      includes: 16,
      token: 2
    });
    score += scoreText(flattenLocalizedText(step.summary?.adult), query, tokens, {
      exact: 0,
      startsWith: 0,
      includes: 16,
      token: 2
    });
  });

  return score;
};

export const listNodes = (): Node[] => loadExamples();

export const listChains = (): QuestionChain[] => loadExampleChains();

export const getNode = (id: string): Node | undefined => {
  return listNodes().find((node) => node.id === id);
};

export const getChain = (id: string): QuestionChain | undefined => {
  return listChains().find((chain) => chain.id === id);
};

export const searchContent = (rawQuery: string, options: SearchOptions = {}): SearchResult[] => {
  const query = normalize(rawQuery);
  if (!query) return [];

  const kinds = new Set(options.kinds ?? ["node", "chain"]);
  const tokens = tokenize(rawQuery);
  const results: SearchResult[] = [];

  if (kinds.has("node")) {
    listNodes().forEach((node) => {
      if (!isTopicInDomain(node.id, options.domainId)) return;
      const score = scoreNode(node, query, tokens);
      if (score === 0) return;
      results.push({
        kind: "node",
        id: node.id,
        title: node.title,
        excerpt: buildExcerpt([flattenLocalizedText(node.body), ...(node.aliases ?? [])], query),
        score
      });
    });
  }

  if (kinds.has("chain")) {
    listChains().forEach((chain) => {
      if (options.topicNodeId && chain.topicNodeId !== options.topicNodeId) return;
      if (!isTopicInDomain(chain.topicNodeId, options.domainId)) return;
      const score = scoreChain(chain, query, tokens);
      if (score === 0) return;
      results.push({
        kind: "chain",
        id: chain.id,
        title: chain.title,
        topicNodeId: chain.topicNodeId,
        excerpt: buildExcerpt(
          [
            flattenLocalizedText(chain.goal?.child),
            flattenLocalizedText(chain.goal?.adult),
            ...chain.steps.map((step) => step.question)
          ],
          query
        ),
        score
      });
    });
  }

  const limit = options.limit ?? DEFAULT_LIMIT;
  return results
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.kind !== right.kind) return left.kind.localeCompare(right.kind);
      return left.title.localeCompare(right.title, "zh-Hans-CN");
    })
    .slice(0, limit);
};
