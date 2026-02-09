import { loadExamples } from "@lxp/core";

const DEFAULT_STACK = ["plant_cell"];

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

export const formatStackToSearch = (
  stack: string[],
  currentSearch: string = window.location.search
): string => {
  const params = new URLSearchParams(currentSearch);
  params.set("stack", stack.join(","));
  const next = params.toString();
  return next ? `?${next}` : "";
};
