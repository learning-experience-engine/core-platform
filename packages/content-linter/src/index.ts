import type { Node, QuestionChain, Relation } from "@lxp/schema";

const RELATION_TYPES = ["part_of", "has_part", "compare_with", "related"] as const;
const RELATION_FACETS = ["what", "how", "in_life", "compare", "practice"] as const;

export type LintMessage = {
  level: "error" | "warn";
  code: string;
  message: string;
  nodeId?: string;
  chainId?: string;
  path?: string;
  suggestions?: string[];
};

export type LintResult = {
  errors: LintMessage[];
  warnings: LintMessage[];
};

const isValidType = (value: string): value is Relation["type"] => {
  return (RELATION_TYPES as readonly string[]).includes(value);
};

const isValidFacet = (value: string): value is Relation["facet"] => {
  return (RELATION_FACETS as readonly string[]).includes(value);
};

const suggestNodeIds = (nodeIds: string[], limit = 6): string[] => {
  if (nodeIds.length === 0) return [];
  return nodeIds.slice(0, limit);
};

const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
};

const suggestSimilarIds = (target: string, nodeIds: string[], limit = 3): string[] => {
  if (!target || nodeIds.length === 0) return [];
  const scored = nodeIds.map((id) => ({ id, score: levenshtein(target, id) }));
  scored.sort((a, b) => a.score - b.score);
  const threshold = Math.max(2, Math.floor(target.length / 2));
  const matches = scored.filter((item) => item.score <= threshold).slice(0, limit);
  if (matches.length === 0) return [];
  return matches.map((item) => item.id);
};

const isCjk = (value: string): boolean => /[\u4e00-\u9fff]/.test(value);

const isAliasTooShort = (alias: string): boolean => {
  const compact = alias.replace(/\s+/g, "");
  if (!compact) return false;
  if (isCjk(compact)) return compact.length < 2;
  return compact.length < 3;
};

export const lintNodes = (nodes: Node[]): LintResult => {
  const errors: LintMessage[] = [];
  const warnings: LintMessage[] = [];
  const nodesById = new Map<string, Node>();
  const nodeIds = nodes.map((node) => node.id);

  for (const node of nodes) {
    if (nodesById.has(node.id)) {
      errors.push({
        level: "error",
        code: "NODE_DUPLICATE_ID",
        nodeId: node.id,
        path: "id",
        message: `[ERROR] node=${node.id} duplicate id`
      });
      continue;
    }
    nodesById.set(node.id, node);
  }

  for (const node of nodes) {
    const titleKey = node.title.trim().toLowerCase();
    const seenAliases = new Set<string>();
    const aliases = node.aliases ?? [];

    aliases.forEach((alias, index) => {
      const trimmed = alias.trim();
      if (!trimmed) {
        errors.push({
          level: "error",
          code: "NODE_ALIAS_EMPTY",
          nodeId: node.id,
          path: `aliases[${index}]`,
          message: `[ERROR] node=${node.id} alias[${index}] empty`
        });
        return;
      }
      const aliasKey = trimmed.toLowerCase();
      if (aliasKey === titleKey) {
        warnings.push({
          level: "warn",
          code: "NODE_ALIAS_MATCH_TITLE",
          nodeId: node.id,
          path: `aliases[${index}]`,
          message: `[WARN]  node=${node.id} alias="${trimmed}" matches title`
        });
      }
      if (seenAliases.has(aliasKey)) {
        warnings.push({
          level: "warn",
          code: "NODE_ALIAS_DUPLICATE",
          nodeId: node.id,
          path: `aliases[${index}]`,
          message: `[WARN]  node=${node.id} alias="${trimmed}" duplicate`
        });
      } else {
        seenAliases.add(aliasKey);
      }
      if (isAliasTooShort(trimmed)) {
        warnings.push({
          level: "warn",
          code: "NODE_ALIAS_TOO_SHORT",
          nodeId: node.id,
          path: `aliases[${index}]`,
          message: `[WARN]  node=${node.id} alias="${trimmed}" too short`
        });
      }
    });

    if (node.relations.length === 0) {
      warnings.push({
        level: "warn",
        code: "NODE_RELATIONS_EMPTY",
        nodeId: node.id,
        path: "relations",
        message: `[WARN]  node=${node.id} has 0 relations`
      });
    }

    node.relations.forEach((relation, index) => {
      if (!nodesById.has(relation.to)) {
        const suggestions = suggestSimilarIds(relation.to, nodeIds);
        const suggestionText =
          suggestions.length > 0 ? ` (suggest: ${suggestions.join(", ")})` : "";
        errors.push({
          level: "error",
          code: "RELATION_TO_NOT_FOUND",
          nodeId: node.id,
          path: `relations[${index}].to`,
          suggestions,
          message: `[ERROR] node=${node.id} relation[${index}].to=${relation.to} not found${suggestionText}`
        });
      }

      if (!isValidType(relation.type)) {
        errors.push({
          level: "error",
          code: "RELATION_TYPE_INVALID",
          nodeId: node.id,
          path: `relations[${index}].type`,
          message: `[ERROR] node=${node.id} relation[${index}].type=${relation.type} invalid`
        });
      }

      if (!isValidFacet(relation.facet)) {
        errors.push({
          level: "error",
          code: "RELATION_FACET_INVALID",
          nodeId: node.id,
          path: `relations[${index}].facet`,
          message: `[ERROR] node=${node.id} relation[${index}].facet=${relation.facet} invalid`
        });
      }
    });

    const mentions = node.mentions ?? {};
    for (const [term, targetId] of Object.entries(mentions)) {
      if (!nodesById.has(targetId)) {
        const suggestions = suggestNodeIds(nodeIds);
        const suggestionText =
          suggestions.length > 0 ? ` (suggest: ${suggestions.join(", ")})` : "";
        errors.push({
          level: "error",
          code: "NODE_MENTION_NOT_FOUND",
          nodeId: node.id,
          path: `mentions["${term}"]`,
          suggestions,
          message: `[ERROR] node=${node.id} mention term="${term}" -> nodeId="${targetId}" not found${suggestionText}`
        });
      }
    }
  }

  return { errors, warnings };
};

export const lintChains = (chains: QuestionChain[], nodes: Node[]): LintResult => {
  const errors: LintMessage[] = [];
  const warnings: LintMessage[] = [];
  const nodesById = new Set(nodes.map((node) => node.id));
  const nodeIds = nodes.map((node) => node.id);
  const chainIds = new Set<string>();

  for (const chain of chains) {
    if (chainIds.has(chain.id)) {
      errors.push({
        level: "error",
        code: "CHAIN_DUPLICATE_ID",
        chainId: chain.id,
        path: "id",
        message: `[ERROR] chain=${chain.id} duplicate id`
      });
      continue;
    }
    chainIds.add(chain.id);

    if (!nodesById.has(chain.topicNodeId)) {
      errors.push({
        level: "error",
        code: "CHAIN_TOPIC_NOT_FOUND",
        chainId: chain.id,
        path: "topicNodeId",
        message: `[ERROR] chain=${chain.id} topicNodeId=${chain.topicNodeId} not found`
      });
    }

    if (!chain.steps || chain.steps.length === 0) {
      errors.push({
        level: "error",
        code: "CHAIN_STEPS_EMPTY",
        chainId: chain.id,
        path: "steps",
        message: `[ERROR] chain=${chain.id} has 0 steps`
      });
      continue;
    }

    chain.steps.forEach((step, index) => {
      const answers = step.answers ?? ({} as Record<string, string>);
      if (!("child" in answers) || !("adult" in answers)) {
        errors.push({
          level: "error",
          code: "CHAIN_STEP_MISSING_ANSWERS",
          chainId: chain.id,
          path: `steps[${index}].answers`,
          message: `[ERROR] chain=${chain.id} step[${index}] missing child/adult answers`
        });
      }

      const mentions = step.mentions ?? {};
      for (const [term, targetId] of Object.entries(mentions)) {
        if (!nodesById.has(targetId)) {
          const suggestions = suggestNodeIds(nodeIds);
          const suggestionText =
            suggestions.length > 0 ? ` (suggest: ${suggestions.join(", ")})` : "";
          errors.push({
            level: "error",
            code: "CHAIN_STEP_MENTION_NOT_FOUND",
            chainId: chain.id,
            path: `steps[${index}].mentions["${term}"]`,
            suggestions,
            message: `[ERROR] chain=${chain.id} step[${index}] mention term="${term}" -> nodeId="${targetId}" not found${suggestionText}`
          });
        }
      }
    });
  }

  return { errors, warnings };
};

export const formatMessages = (result: LintResult): string[] => {
  return [...result.errors, ...result.warnings].map((item) => item.message);
};

export const formatJson = (result: LintResult): string => {
  return JSON.stringify({ errors: result.errors, warnings: result.warnings }, null, 2);
};
