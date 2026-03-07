import type { Node } from "@lxp/schema";
import type { DraftNode } from "../types";

export const validateNodeDraft = (
  draft: DraftNode,
  nodes: Node[],
  selectedId: string
): string[] => {
  const errors: string[] = [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const trimmedId = draft.id.trim();
  const trimmedTitle = draft.title.trim();

  if (!trimmedId) errors.push("Node id is required.");
  if (!trimmedTitle) errors.push("Node title is required.");

  const existing = nodes.find((node) => node.id === trimmedId);
  if (existing && existing.id !== selectedId) {
    errors.push(`Node id must be unique (duplicate: ${trimmedId}).`);
  }

  draft.relations.forEach((relation, index) => {
    const target = relation.to.trim();
    if (!target) {
      errors.push(`Relation #${index + 1} target is required.`);
      return;
    }
    if (!nodeIds.has(target)) {
      errors.push(`Relation #${index + 1} target does not exist (${target}).`);
    }
  });

  return errors;
};
