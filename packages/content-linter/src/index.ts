import type { Node, Relation } from "@lxp/schema";

const RELATION_TYPES = ["part_of", "has_part", "compare_with", "related"] as const;
const RELATION_FACETS = ["what", "how", "in_life", "compare", "practice"] as const;

export type LintMessage = {
  level: "error" | "warn";
  message: string;
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

export const lintNodes = (nodes: Node[]): LintResult => {
  const errors: LintMessage[] = [];
  const warnings: LintMessage[] = [];
  const nodesById = new Map<string, Node>();

  for (const node of nodes) {
    if (nodesById.has(node.id)) {
      errors.push({
        level: "error",
        message: `[ERROR] node=${node.id} duplicate id`
      });
      continue;
    }
    nodesById.set(node.id, node);
  }

  for (const node of nodes) {
    if (node.relations.length === 0) {
      warnings.push({
        level: "warn",
        message: `[WARN]  node=${node.id} has 0 relations`
      });
    }

    node.relations.forEach((relation, index) => {
      if (!nodesById.has(relation.to)) {
        errors.push({
          level: "error",
          message: `[ERROR] node=${node.id} relation[${index}].to=${relation.to} not found`
        });
      }

      if (!isValidType(relation.type)) {
        errors.push({
          level: "error",
          message: `[ERROR] node=${node.id} relation[${index}].type=${relation.type} invalid`
        });
      }

      if (!isValidFacet(relation.facet)) {
        errors.push({
          level: "error",
          message: `[ERROR] node=${node.id} relation[${index}].facet=${relation.facet} invalid`
        });
      }
    });

    const mentions = node.mentions ?? {};
    for (const [term, targetId] of Object.entries(mentions)) {
      if (!nodesById.has(targetId)) {
        errors.push({
          level: "error",
          message: `[ERROR] node=${node.id} mention term="${term}" -> nodeId="${targetId}" not found`
        });
      }
    }
  }

  return { errors, warnings };
};

export const formatMessages = (result: LintResult): string[] => {
  return [...result.errors, ...result.warnings].map((item) => item.message);
};
