import { DEFAULT_ROOT_ID, loadExamples } from "@lxp/core";
import type { AgeBand } from "@lxp/schema";

const DEFAULT_STACK = [DEFAULT_ROOT_ID];
const DEFAULT_CHAIN = {
  chainId: "",
  stepIndex: 0,
  age: "child" as AgeBand
};

const compressConsecutive = (ids: string[]): string[] => {
  const result: string[] = [];
  ids.forEach((id) => {
    if (result[result.length - 1] !== id) {
      result.push(id);
    }
  });
  return result;
};

const getValidIds = (): Set<string> => {
  const nodes = loadExamples();
  return new Set(nodes.map((node) => node.id));
};

export const parseStackFromLocation = (locationSearch: string): string[] => {
  const params = new URLSearchParams(locationSearch);
  const raw = params.get("stack");
  if (!raw) return [...DEFAULT_STACK];

  const validIds = getValidIds();
  const filtered = raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id && validIds.has(id));

  const compressed = compressConsecutive(filtered);
  return compressed.length ? compressed : [...DEFAULT_STACK];
};

export type ParsedChainState = {
  chainId: string;
  stepIndex: number;
  age: AgeBand;
};

const parseAge = (value: string | null): AgeBand => {
  if (value === "adult") return "adult";
  return "child";
};

export const parseChainFromLocation = (
  locationSearch: string,
  validChains: Set<string>
): ParsedChainState => {
  const params = new URLSearchParams(locationSearch);
  const chainId = params.get("chain")?.trim() ?? "";
  if (!chainId || !validChains.has(chainId)) {
    return { ...DEFAULT_CHAIN };
  }

  const stepParam = params.get("step");
  const stepIndex = stepParam ? Number.parseInt(stepParam, 10) : 0;
  return {
    chainId,
    stepIndex: Number.isFinite(stepIndex) ? stepIndex : 0,
    age: parseAge(params.get("age"))
  };
};

export const formatSearch = (
  stack: string[],
  chain: ParsedChainState | undefined,
  currentSearch: string = window.location.search
): string => {
  const params = new URLSearchParams(currentSearch);
  params.set("stack", stack.join(","));
  if (chain && chain.chainId) {
    params.set("chain", chain.chainId);
    params.set("step", String(chain.stepIndex));
    params.set("age", chain.age);
  } else {
    params.delete("chain");
    params.delete("step");
    params.delete("age");
  }
  const next = params.toString();
  return next ? `?${next}` : "";
};
