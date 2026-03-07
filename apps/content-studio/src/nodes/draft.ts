import type { LocalizedText, Node, Relation } from "@lxp/schema";
import type { DraftNode, MentionRow, RelationRow } from "../types";
import { makeId } from "../utils/ids";

export const getBodyText = (body: LocalizedText, preferred = "zh"): string => {
  if (typeof body === "string") return body;
  if (body[preferred]) return body[preferred] ?? "";
  const first = Object.values(body)[0];
  return first ?? "";
};

export const updateBody = (body: LocalizedText, next: string, preferred = "zh"): LocalizedText => {
  if (typeof body === "string") return next;
  if (body[preferred] !== undefined) {
    return { ...body, [preferred]: next };
  }
  const [firstKey] = Object.keys(body);
  if (firstKey) {
    return { ...body, [firstKey]: next };
  }
  return { [preferred]: next };
};

export const toMentionRows = (mentions: Record<string, string> | undefined): MentionRow[] => {
  return Object.entries(mentions ?? {}).map(([term, targetId]) => ({
    id: makeId(),
    term,
    targetId
  }));
};

export const toRelationRows = (relations: Relation[]): RelationRow[] => {
  return relations.map((relation) => ({
    id: makeId(),
    type: relation.type,
    facet: relation.facet,
    to: relation.to,
    label: relation.label ?? ""
  }));
};

export const toMentionRecord = (rows: MentionRow[]): Record<string, string> => {
  const record: Record<string, string> = {};
  rows.forEach((row) => {
    const term = row.term.trim();
    const target = row.targetId.trim();
    if (term && target) record[term] = target;
  });
  return record;
};

export const toRelations = (rows: RelationRow[]): Relation[] => {
  return rows
    .filter((row) => row.to.trim().length > 0)
    .map((row) => ({
      type: row.type,
      facet: row.facet,
      to: row.to.trim(),
      label: row.label.trim() || undefined
    }));
};

export const normalizeAliases = (input: string): string[] => {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const seen = new Set<string>();
  const result: string[] = [];
  lines.forEach((alias) => {
    const key = alias.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(alias);
  });
  return result;
};

export const emptyDraftNode = (): DraftNode => ({
  id: "",
  title: "",
  aliasesText: "",
  body: "",
  bodyText: "",
  mentions: [],
  relations: [],
  isNew: true
});

export const buildDraftNode = (node: Node): DraftNode => ({
  id: node.id,
  title: node.title,
  aliasesText: (node.aliases ?? []).join("\n"),
  body: node.body,
  bodyText: getBodyText(node.body),
  mentions: toMentionRows(node.mentions),
  relations: toRelationRows(node.relations),
  isNew: false
});

export const buildNode = (draft: DraftNode): Node => {
  const aliases = normalizeAliases(draft.aliasesText);
  return {
    id: draft.id.trim(),
    title: draft.title.trim(),
    ...(aliases.length > 0 ? { aliases } : {}),
    body: updateBody(draft.body, draft.bodyText),
    mentions: toMentionRecord(draft.mentions),
    relations: toRelations(draft.relations)
  };
};

