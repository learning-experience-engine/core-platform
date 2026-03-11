import type { Domain, Node, QuestionChain } from "@lxp/schema";
import type { ScenarioMatch, SearchOptions, SearchResult } from "@lxp/core";

type SearchResponse = {
  ok: boolean;
  query: string;
  results: SearchResult[];
};

type ScenarioMatchResponse = {
  ok: boolean;
  query: string;
  results: ScenarioMatch[];
};

const ensureOk = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response;
};

export const fetchNodes = async (): Promise<Node[]> => {
  const response = await ensureOk(await fetch("/api/nodes"));
  return (await response.json()) as Node[];
};

export const fetchChains = async (): Promise<QuestionChain[]> => {
  const response = await ensureOk(await fetch("/api/chains"));
  return (await response.json()) as QuestionChain[];
};

export const fetchDomains = async (): Promise<Domain[]> => {
  const response = await ensureOk(await fetch("/api/domains"));
  return (await response.json()) as Domain[];
};

export const fetchSearchResults = async (
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> => {
  const params = new URLSearchParams();
  params.set("q", query);
  if (options.limit) params.set("limit", String(options.limit));
  if (options.topicNodeId) params.set("topicNodeId", options.topicNodeId);
  if (options.domainId) params.set("domainId", options.domainId);
  options.kinds?.forEach((kind) => params.append("kind", kind));

  const response = await ensureOk(await fetch(`/api/search?${params.toString()}`));
  const payload = (await response.json()) as SearchResponse;
  return payload.results;
};

export const fetchScenarioMatches = async (
  query: string,
  limit = 5,
  domainId?: string
): Promise<ScenarioMatch[]> => {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("limit", String(limit));
  if (domainId) params.set("domainId", domainId);

  const response = await ensureOk(await fetch(`/api/scenario-match?${params.toString()}`));
  const payload = (await response.json()) as ScenarioMatchResponse;
  return payload.results;
};
