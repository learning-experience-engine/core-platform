import type { Node } from "@lxp/schema";
import type { MentionRow, MentionSuggestion } from "../types";

export const isCjk = (value: string): boolean => /[\u4e00-\u9fff]/.test(value);

export const meetsTermLength = (term: string): boolean => {
  const compact = term.replace(/\s+/g, "");
  if (!compact) return false;
  if (isCjk(compact)) return compact.length >= 2;
  return compact.length >= 3;
};

export const getNodeTerms = (node: Node): string[] => {
  const terms = [node.title, ...(node.aliases ?? [])];
  const seen = new Set<string>();
  const result: string[] = [];
  terms.forEach((term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  });
  return result;
};

export const buildMentionSuggestions = (
  text: string,
  nodes: Node[],
  existingMentions: MentionRow[],
  excludeNodeId?: string
): MentionSuggestion[] => {
  const normalizedText = text.toLowerCase();
  const existingTerms = new Set(
    existingMentions.map((mention) => mention.term.trim().toLowerCase()).filter(Boolean)
  );
  const suggestions: MentionSuggestion[] = [];

  nodes.forEach((node) => {
    if (excludeNodeId && node.id === excludeNodeId) return;
    const terms = getNodeTerms(node);
    terms.forEach((term) => {
      if (!meetsTermLength(term)) return;
      const termKey = term.toLowerCase();
      if (existingTerms.has(termKey)) return;
      const index = normalizedText.indexOf(termKey);
      if (index === -1) return;
      suggestions.push({ term, targetId: node.id, targetTitle: node.title, index });
    });
  });

  suggestions.sort((a, b) => {
    if (b.term.length !== a.term.length) return b.term.length - a.term.length;
    return a.index - b.index;
  });

  const seen = new Set<string>();
  return suggestions.filter((item) => {
    const key = `${item.term}__${item.targetId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
