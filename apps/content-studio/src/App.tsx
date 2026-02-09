import React from "react";
import type {
  AgeBand,
  ChainStep,
  Facet,
  LocalizedText,
  Node,
  QuestionChain,
  Relation,
  RelationType
} from "@lxp/schema";

const RELATION_TYPES: RelationType[] = ["part_of", "has_part", "compare_with", "related"];
const FACETS: Facet[] = ["what", "how", "in_life", "compare", "practice"];
const AGE_BANDS: AgeBand[] = ["child", "adult"];

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const slugify = (value: string): string => {
  return value.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9_]/g, "");
};

const makeBaseId = (title: string, prefix: string): string => {
  const slug = slugify(title);
  if (slug) return slug;
  return `${prefix}_${Date.now()}`;
};

const titleToId = (title: string): string => slugify(title);

const makeUniqueId = (base: string, existing: Set<string>): string => {
  if (!existing.has(base)) return base;
  let index = 2;
  let candidate = `${base}_${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `${base}_${index}`;
  }
  return candidate;
};

type MentionRow = {
  id: string;
  term: string;
  targetId: string;
};

type RelationRow = {
  id: string;
  type: RelationType;
  facet: Facet;
  to: string;
  label: string;
};

type DraftNode = {
  id: string;
  title: string;
  body: LocalizedText;
  bodyText: string;
  mentions: MentionRow[];
  relations: RelationRow[];
  isNew: boolean;
};

type DraftStep = {
  id: string;
  question: string;
  answers: Record<AgeBand, string>;
  mentions: MentionRow[];
};

type DraftChain = {
  id: string;
  title: string;
  topicNodeId: string;
  steps: DraftStep[];
  isNew: boolean;
};

type Mode = "nodes" | "chains";

const getBodyText = (body: LocalizedText, preferred = "zh"): string => {
  if (typeof body === "string") return body;
  if (body[preferred]) return body[preferred] ?? "";
  const first = Object.values(body)[0];
  return first ?? "";
};

const updateBody = (body: LocalizedText, next: string, preferred = "zh"): LocalizedText => {
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

const toMentionRows = (mentions: Record<string, string> | undefined): MentionRow[] => {
  return Object.entries(mentions ?? {}).map(([term, targetId]) => ({
    id: makeId(),
    term,
    targetId
  }));
};

const toRelationRows = (relations: Relation[]): RelationRow[] => {
  return relations.map((relation) => ({
    id: makeId(),
    type: relation.type,
    facet: relation.facet,
    to: relation.to,
    label: relation.label ?? ""
  }));
};

const toMentionRecord = (rows: MentionRow[]): Record<string, string> => {
  const record: Record<string, string> = {};
  rows.forEach((row) => {
    const term = row.term.trim();
    const target = row.targetId.trim();
    if (term && target) record[term] = target;
  });
  return record;
};

const toRelations = (rows: RelationRow[]): Relation[] => {
  return rows
    .filter((row) => row.to.trim().length > 0)
    .map((row) => ({
      type: row.type,
      facet: row.facet,
      to: row.to.trim(),
      label: row.label.trim() || undefined
    }));
};

const emptyDraftNode = (): DraftNode => ({
  id: "",
  title: "",
  body: "",
  bodyText: "",
  mentions: [],
  relations: [],
  isNew: true
});

const buildDraftNode = (node: Node): DraftNode => ({
  id: node.id,
  title: node.title,
  body: node.body,
  bodyText: getBodyText(node.body),
  mentions: toMentionRows(node.mentions),
  relations: toRelationRows(node.relations),
  isNew: false
});

const buildNode = (draft: DraftNode): Node => ({
  id: draft.id.trim(),
  title: draft.title.trim(),
  body: updateBody(draft.body, draft.bodyText),
  mentions: toMentionRecord(draft.mentions),
  relations: toRelations(draft.relations)
});

const buildDraftStep = (step: ChainStep): DraftStep => ({
  id: step.id,
  question: step.question,
  answers: {
    child: step.answers.child ?? "",
    adult: step.answers.adult ?? ""
  },
  mentions: toMentionRows(step.mentions)
});

const buildDraftChain = (chain: QuestionChain): DraftChain => ({
  id: chain.id,
  title: chain.title,
  topicNodeId: chain.topicNodeId,
  steps: chain.steps.map(buildDraftStep),
  isNew: false
});

const buildStepPayload = (step: DraftStep): ChainStep => ({
  id: step.id,
  question: step.question.trim(),
  answers: {
    child: step.answers.child.trim(),
    adult: step.answers.adult.trim()
  },
  mentions: toMentionRecord(step.mentions)
});

const buildChain = (draft: DraftChain): QuestionChain => ({
  id: draft.id.trim(),
  title: draft.title.trim(),
  topicNodeId: draft.topicNodeId.trim(),
  steps: draft.steps.map(buildStepPayload)
});

const createEmptyChain = (id: string, topicNodeId: string): DraftChain => ({
  id,
  title: "",
  topicNodeId,
  steps: [],
  isNew: true
});

const createStep = (id: string): DraftStep => ({
  id,
  question: "",
  answers: { child: "", adult: "" },
  mentions: []
});

const getNextStepId = (steps: DraftStep[]): string => {
  const existing = new Set(steps.map((step) => step.id));
  let index = steps.length + 1;
  while (existing.has(`step_${index}`)) {
    index += 1;
  }
  return `step_${index}`;
};

const isCjk = (value: string): boolean => /[\u4e00-\u9fff]/.test(value);

const meetsTermLength = (term: string): boolean => {
  const compact = term.replace(/\s+/g, "");
  if (!compact) return false;
  if (isCjk(compact)) return compact.length >= 2;
  return compact.length >= 3;
};

type MentionSuggestion = {
  term: string;
  targetId: string;
  targetTitle: string;
  index: number;
};

const buildMentionSuggestions = (
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
    const term = node.title.trim();
    if (!term) return;
    if (!meetsTermLength(term)) return;
    const termKey = term.toLowerCase();
    if (existingTerms.has(termKey)) return;
    const index = normalizedText.indexOf(termKey);
    if (index === -1) return;
    suggestions.push({ term, targetId: node.id, targetTitle: node.title, index });
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

const validateNodeDraft = (
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

const validateChainDraft = (
  draft: DraftChain,
  nodes: Node[]
): string[] => {
  const errors: string[] = [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const trimmedId = draft.id.trim();
  const trimmedTitle = draft.title.trim();
  const trimmedTopic = draft.topicNodeId.trim();

  if (!trimmedId) errors.push("Chain id is required.");
  if (!trimmedTitle) errors.push("Chain title is required.");
  if (!trimmedTopic) errors.push("Chain topicNodeId is required.");
  if (trimmedTopic && !nodeIds.has(trimmedTopic)) {
    errors.push(`Chain topicNodeId does not exist (${trimmedTopic}).`);
  }
  if (draft.steps.length === 0) errors.push("Chain must have at least one step.");

  draft.steps.forEach((step, index) => {
    const hasChild = Object.prototype.hasOwnProperty.call(step.answers, "child");
    const hasAdult = Object.prototype.hasOwnProperty.call(step.answers, "adult");
    if (!hasChild || !hasAdult) {
      errors.push(`Step #${index + 1} answers must include child and adult keys.`);
    }
  });

  return errors;
};

const fetchNodes = async (): Promise<Node[]> => {
  const response = await fetch("/api/nodes");
  if (!response.ok) {
    throw new Error(`Failed to load nodes: ${response.status}`);
  }
  return (await response.json()) as Node[];
};

const fetchChains = async (): Promise<QuestionChain[]> => {
  const response = await fetch("/api/chains");
  if (!response.ok) {
    throw new Error(`Failed to load chains: ${response.status}`);
  }
  return (await response.json()) as QuestionChain[];
};

const saveNode = async (node: Node): Promise<void> => {
  const response = await fetch("/api/nodes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ node })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to save node");
  }
};

const saveChain = async (chain: QuestionChain): Promise<void> => {
  const response = await fetch("/api/chains", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chain })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to save chain");
  }
};

const runLint = async () => {
  const response = await fetch("/api/lint", { method: "POST" });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Failed to run lint");
  }
  return (await response.json()) as { stdout: string; stderr: string; code: number };
};

const App: React.FC = () => {
  const [mode, setMode] = React.useState<Mode>("nodes");
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [chains, setChains] = React.useState<QuestionChain[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [selectedChainId, setSelectedChainId] = React.useState<string>("");
  const [draft, setDraft] = React.useState<DraftNode>(() => emptyDraftNode());
  const [chainDraft, setChainDraft] = React.useState<DraftChain>(() =>
    createEmptyChain("", "")
  );
  const [search, setSearch] = React.useState("");
  const [chainSearch, setChainSearch] = React.useState("");
  const [status, setStatus] = React.useState<string>("");
  const [lintOutput, setLintOutput] = React.useState<string>("");
  const [lintStatus, setLintStatus] = React.useState<string>("");
  const [nodeErrors, setNodeErrors] = React.useState<string[]>([]);
  const [chainErrors, setChainErrors] = React.useState<string[]>([]);

  React.useEffect(() => {
    Promise.all([fetchNodes(), fetchChains()])
      .then(([nodeData, chainData]) => {
        setNodes(nodeData);
        setChains(chainData);
        if (nodeData.length > 0) {
          setSelectedId(nodeData[0].id);
          setDraft(buildDraftNode(nodeData[0]));
        }
        if (chainData.length > 0) {
          setSelectedChainId(chainData[0].id);
          setChainDraft(buildDraftChain(chainData[0]));
        }
      })
      .catch((error) => {
        setStatus(`加载失败: ${String(error)}`);
      });
  }, []);

  React.useEffect(() => {
    const node = nodes.find((item) => item.id === selectedId);
    if (node) {
      setDraft(buildDraftNode(node));
      setNodeErrors([]);
    }
  }, [nodes, selectedId]);

  React.useEffect(() => {
    const chain = chains.find((item) => item.id === selectedChainId);
    if (chain) {
      setChainDraft(buildDraftChain(chain));
      setChainErrors([]);
    }
  }, [chains, selectedChainId]);

  const filtered = React.useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return nodes;
    return nodes.filter((node) => {
      return (
        node.id.toLowerCase().includes(keyword) ||
        node.title.toLowerCase().includes(keyword)
      );
    });
  }, [nodes, search]);

  const filteredChains = React.useMemo(() => {
    const keyword = chainSearch.trim().toLowerCase();
    if (!keyword) return chains;
    return chains.filter((chain) => {
      return (
        chain.id.toLowerCase().includes(keyword) ||
        chain.title.toLowerCase().includes(keyword)
      );
    });
  }, [chains, chainSearch]);

  const handleSave = async () => {
    try {
      const errors = validateNodeDraft(draft, nodes, selectedId);
      if (errors.length > 0) {
        setNodeErrors(errors);
        setStatus("保存失败: 表单校验未通过");
        return;
      }
      setNodeErrors([]);
      setStatus("保存中...");
      const payload = buildNode(draft);
      await saveNode(payload);
      const updated = await fetchNodes();
      setNodes(updated);
      setSelectedId(payload.id);
      setStatus(`已保存: ${payload.id}`);
    } catch (error) {
      setStatus(`保存失败: ${String(error)}`);
    }
  };

  const handleSaveChain = async () => {
    try {
      const errors = validateChainDraft(chainDraft, nodes);
      if (errors.length > 0) {
        setChainErrors(errors);
        setStatus("保存失败: 表单校验未通过");
        return;
      }
      setChainErrors([]);
      setStatus("保存中...");
      const payload = buildChain(chainDraft);
      if (chainDraft.isNew && chains.some((chain) => chain.id === payload.id)) {
        setStatus(`保存失败: chain.id 已存在 (${payload.id})`);
        return;
      }
      await saveChain(payload);
      const updated = await fetchChains();
      setChains(updated);
      setSelectedChainId(payload.id);
      setStatus(`已保存: ${payload.id}`);
    } catch (error) {
      setStatus(`保存失败: ${String(error)}`);
    }
  };

  const handleNew = () => {
    const existing = new Set(nodes.map((node) => node.id));
    const base = makeBaseId("", "node");
    const next = emptyDraftNode();
    next.id = makeUniqueId(base, existing);
    setDraft(next);
    setSelectedId("");
    setNodeErrors([]);
    setStatus("新节点已创建");
  };

  const handleNewChain = () => {
    const existing = new Set(chains.map((chain) => chain.id));
    const base = makeBaseId("", "chain");
    const id = makeUniqueId(base, existing);
    const topicNodeId = selectedId ? selectedId : "";
    const next = createEmptyChain(id, topicNodeId);
    next.steps = [createStep("step_1")];
    setChainDraft(next);
    setSelectedChainId("");
    setChainErrors([]);
    setStatus("新链路已创建");
  };

  const handleLint = async () => {
    try {
      setLintStatus("运行中...");
      const result = await runLint();
      const lines = [result.stdout, result.stderr].filter(Boolean).join("\n");
      setLintOutput(lines || "No lint output.");
      setLintStatus(result.code === 0 ? "Lint passed" : `Lint failed (code ${result.code})`);
    } catch (error) {
      setLintStatus(`Lint failed: ${String(error)}`);
    }
  };

  const nodeOptions = nodes.map((node) => ({ id: node.id, title: node.title }));
  const nodeSuggestions = React.useMemo(() => {
    return buildMentionSuggestions(draft.bodyText, nodes, draft.mentions, draft.id).slice(0, 10);
  }, [draft.bodyText, draft.mentions, draft.id, nodes]);

  return (
    <div className="studio">
      <header className="studio__header">
        <div>
          <p className="studio__eyebrow">Content Studio</p>
          <h1>{mode === "nodes" ? "节点编辑台" : "问题链编辑台"}</h1>
          <p className="studio__sub">
            {mode === "nodes"
              ? "直接编辑 `content/examples/nodes.json`"
              : "直接编辑 `content/examples/chains.json`"}
          </p>
        </div>
        <div className="studio__actions">
          <div className="mode-toggle" role="tablist" aria-label="Edit mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "nodes"}
              className={`mode-toggle__button${mode === "nodes" ? " is-active" : ""}`}
              onClick={() => setMode("nodes")}
            >
              Nodes
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "chains"}
              className={`mode-toggle__button${mode === "chains" ? " is-active" : ""}`}
              onClick={() => setMode("chains")}
            >
              Chains
            </button>
          </div>
          {mode === "nodes" ? (
            <>
              <button type="button" className="button" onClick={handleSave}>
                Save
              </button>
            </>
          ) : (
            <>
              <button type="button" className="button" onClick={handleSaveChain}>
                Save
              </button>
            </>
          )}
        </div>
      </header>

      <main className="studio__main">
        <aside className="studio__panel studio__panel--list">
          <div className="panel__header">
            <h2>{mode === "nodes" ? "Nodes" : "Chains"}</h2>
            <span className="panel__badge">
              {mode === "nodes" ? filtered.length : filteredChains.length}
            </span>
          </div>
          <input
            className="panel__search"
            placeholder={mode === "nodes" ? "Search by id or title" : "Search by id or title"}
            value={mode === "nodes" ? search : chainSearch}
            onChange={(event) =>
              mode === "nodes"
                ? setSearch(event.target.value)
                : setChainSearch(event.target.value)
            }
          />
          <div className="panel__actions">
            {mode === "nodes" ? (
              <button type="button" className="button button--ghost" onClick={handleNew}>
                New Node
              </button>
            ) : (
              <button type="button" className="button button--ghost" onClick={handleNewChain}>
                New Chain
              </button>
            )}
          </div>
          <div className="panel__list">
            {mode === "nodes"
              ? filtered.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className={`node-row${node.id === selectedId ? " is-active" : ""}`}
                    onClick={() => setSelectedId(node.id)}
                  >
                    <div>
                      <strong>{node.title}</strong>
                      <span>{node.id}</span>
                    </div>
                  </button>
                ))
              : filteredChains.map((chain) => (
                  <button
                    key={chain.id}
                    type="button"
                    className={`node-row${chain.id === selectedChainId ? " is-active" : ""}`}
                    onClick={() => setSelectedChainId(chain.id)}
                  >
                    <div>
                      <strong>{chain.title}</strong>
                      <span>{chain.id}</span>
                    </div>
                  </button>
                ))}
          </div>
        </aside>

        <section className="studio__panel studio__panel--editor">
          <div className="panel__header">
            <h2>Editor</h2>
            <span className="panel__status">{status}</span>
          </div>

          {mode === "nodes" ? (
            <div className="form">
              {nodeErrors.length > 0 && (
                <div className="form__errors">
                  <strong>请先修正以下问题：</strong>
                  <ul>
                    {nodeErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <label>
                <span>ID</span>
                <input
                  value={draft.id}
                  onChange={(event) => setDraft({ ...draft, id: event.target.value })}
                />
                {draft.isNew && <span className="form__hint">未保存</span>}
              </label>
              <label>
                <span>Title</span>
                <input
                  value={draft.title}
                  onChange={(event) => {
                    const nextTitle = event.target.value;
                    let nextId = draft.id;
                    if (draft.isNew) {
                      const baseFromTitle = titleToId(nextTitle);
                      const shouldUpdate =
                        !draft.id ||
                        draft.id.startsWith("node_") ||
                        draft.id === titleToId(draft.title);
                      if (baseFromTitle && shouldUpdate) {
                        const existing = new Set(nodes.map((node) => node.id));
                        nextId = makeUniqueId(baseFromTitle, existing);
                      }
                    }
                    setDraft({ ...draft, title: nextTitle, id: nextId });
                  }}
                />
              </label>
              <label>
                <span>Body</span>
                <textarea
                  rows={6}
                  value={draft.bodyText}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      bodyText: event.target.value,
                      body: updateBody(draft.body, event.target.value)
                    })
                  }
                />
              </label>

              <div className="form__section">
                <div className="form__section-header">
                  <h3>Mentions</h3>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        mentions: [...draft.mentions, { id: makeId(), term: "", targetId: "" }]
                      })
                    }
                  >
                    Add
                  </button>
                </div>
                {draft.mentions.length === 0 ? (
                  <p className="form__empty">No mentions</p>
                ) : (
                  <div className="grid">
                    {draft.mentions.map((row) => (
                      <div key={row.id} className="grid__row">
                        <input
                          placeholder="Term"
                          value={row.term}
                          onChange={(event) => {
                            setDraft({
                              ...draft,
                              mentions: draft.mentions.map((item) =>
                                item.id === row.id ? { ...item, term: event.target.value } : item
                              )
                            });
                          }}
                        />
                        <input
                          list="node-ids"
                          placeholder="Target node id"
                          value={row.targetId}
                          onChange={(event) => {
                            setDraft({
                              ...draft,
                              mentions: draft.mentions.map((item) =>
                                item.id === row.id
                                  ? { ...item, targetId: event.target.value }
                                  : item
                              )
                            });
                          }}
                        />
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              mentions: draft.mentions.filter((item) => item.id !== row.id)
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form__section">
                <div className="form__section-header">
                  <h3>Mention Suggestions</h3>
                </div>
                {nodeSuggestions.length === 0 ? (
                  <p className="form__empty">No suggestions</p>
                ) : (
                  <div className="suggestion-list">
                    {nodeSuggestions.map((suggestion) => (
                      <div key={`${suggestion.term}-${suggestion.targetId}`} className="suggestion">
                        <div>
                          <strong>{suggestion.term}</strong>
                          <span>→ {suggestion.targetTitle}</span>
                        </div>
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              mentions: [
                                ...draft.mentions,
                                {
                                  id: makeId(),
                                  term: suggestion.term,
                                  targetId: suggestion.targetId
                                }
                              ]
                            })
                          }
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form__section">
                <div className="form__section-header">
                  <h3>Relations</h3>
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        relations: [
                          ...draft.relations,
                          {
                            id: makeId(),
                            type: "related",
                            facet: "what",
                            to: "",
                            label: ""
                          }
                        ]
                      })
                    }
                  >
                    Add
                  </button>
                </div>
                {draft.relations.length === 0 ? (
                  <p className="form__empty">No relations</p>
                ) : (
                  <div className="grid grid--relations">
                    {draft.relations.map((row) => (
                      <div key={row.id} className="grid__row">
                        <select
                          value={row.type}
                          onChange={(event) => {
                            setDraft({
                              ...draft,
                              relations: draft.relations.map((item) =>
                                item.id === row.id
                                  ? { ...item, type: event.target.value as RelationType }
                                  : item
                              )
                            });
                          }}
                        >
                          {RELATION_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                        <select
                          value={row.facet}
                          onChange={(event) => {
                            setDraft({
                              ...draft,
                              relations: draft.relations.map((item) =>
                                item.id === row.id
                                  ? { ...item, facet: event.target.value as Facet }
                                  : item
                              )
                            });
                          }}
                        >
                          {FACETS.map((facet) => (
                            <option key={facet} value={facet}>
                              {facet}
                            </option>
                          ))}
                        </select>
                        <input
                          list="node-ids"
                          placeholder="Target node id"
                          value={row.to}
                          onChange={(event) => {
                            setDraft({
                              ...draft,
                              relations: draft.relations.map((item) =>
                                item.id === row.id ? { ...item, to: event.target.value } : item
                              )
                            });
                          }}
                        />
                        <input
                          placeholder="Label (optional)"
                          value={row.label}
                          onChange={(event) => {
                            setDraft({
                              ...draft,
                              relations: draft.relations.map((item) =>
                                item.id === row.id
                                  ? { ...item, label: event.target.value }
                                  : item
                              )
                            });
                          }}
                        />
                        <button
                          type="button"
                          className="button button--ghost"
                          onClick={() =>
                            setDraft({
                              ...draft,
                              relations: draft.relations.filter((item) => item.id !== row.id)
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="form">
              {chainErrors.length > 0 && (
                <div className="form__errors">
                  <strong>请先修正以下问题：</strong>
                  <ul>
                    {chainErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <label>
                <span>Chain ID</span>
                <input
                  value={chainDraft.id}
                  readOnly={!chainDraft.isNew}
                  onChange={(event) =>
                    setChainDraft({ ...chainDraft, id: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Title</span>
                <input
                  value={chainDraft.title}
                  onChange={(event) => {
                    const nextTitle = event.target.value;
                    let nextId = chainDraft.id;
                    if (chainDraft.isNew) {
                      const baseFromTitle = titleToId(nextTitle);
                      const shouldUpdate =
                        !chainDraft.id ||
                        chainDraft.id.startsWith("chain_") ||
                        chainDraft.id === titleToId(chainDraft.title);
                      if (baseFromTitle && shouldUpdate) {
                        const existing = new Set(chains.map((chain) => chain.id));
                        nextId = makeUniqueId(baseFromTitle, existing);
                      }
                    }
                    setChainDraft({ ...chainDraft, title: nextTitle, id: nextId });
                  }}
                />
              </label>
              <label>
                <span>Topic Node</span>
                <input
                  list="node-ids"
                  placeholder="topicNodeId"
                  value={chainDraft.topicNodeId}
                  className={!chainDraft.topicNodeId.trim() ? "input--error" : undefined}
                  onChange={(event) =>
                    setChainDraft({ ...chainDraft, topicNodeId: event.target.value })
                  }
                />
                {!chainDraft.topicNodeId.trim() && (
                  <span className="form__hint form__hint--error">Topic node 不能为空</span>
                )}
              </label>

              <div className="form__section">
                <div className="form__section-header">
                  <h3>Steps</h3>
                  <button
                    type="button"
                  className="button button--ghost"
                  onClick={() =>
                    setChainDraft({
                      ...chainDraft,
                      steps: [...chainDraft.steps, createStep(getNextStepId(chainDraft.steps))]
                    })
                  }
                >
                    Add Step
                  </button>
                </div>
                {chainDraft.steps.length === 0 ? (
                  <p className="form__empty">No steps</p>
                ) : (
                  <div className="step-list">
                    {chainDraft.steps.map((step, index) => {
                      const stepSuggestions = buildMentionSuggestions(
                        `${step.answers.child}\n${step.answers.adult}`,
                        nodes,
                        step.mentions
                      ).slice(0, 10);
                      return (
                        <div key={step.id} className="step-card">
                        <div className="step-card__header">
                          <div>
                            <strong>{step.id}</strong>
                            <span>Step {index + 1}</span>
                          </div>
                          <button
                            type="button"
                            className="button button--ghost"
                            onClick={() =>
                              setChainDraft({
                                ...chainDraft,
                                steps: chainDraft.steps.filter((item) => item.id !== step.id)
                              })
                            }
                          >
                            Remove Step
                          </button>
                        </div>
                        <label>
                          <span>Step ID</span>
                          <input value={step.id} readOnly />
                        </label>
                        <label>
                          <span>Question</span>
                          <textarea
                            rows={3}
                            value={step.question}
                            onChange={(event) => {
                              setChainDraft({
                                ...chainDraft,
                                steps: chainDraft.steps.map((item) =>
                                  item.id === step.id
                                    ? { ...item, question: event.target.value }
                                    : item
                                )
                              });
                            }}
                          />
                        </label>
                        <div className="grid grid--answers">
                          {AGE_BANDS.map((age) => (
                            <label key={age}>
                              <span>Answer ({age})</span>
                              <textarea
                                rows={3}
                                value={step.answers[age]}
                                onChange={(event) => {
                                  setChainDraft({
                                    ...chainDraft,
                                    steps: chainDraft.steps.map((item) =>
                                      item.id === step.id
                                        ? {
                                            ...item,
                                            answers: {
                                              ...item.answers,
                                              [age]: event.target.value
                                            }
                                          }
                                        : item
                                    )
                                  });
                                }}
                              />
                            </label>
                          ))}
                        </div>
                        <div className="form__section">
                          <div className="form__section-header">
                            <h4>Mention Suggestions</h4>
                          </div>
                          {stepSuggestions.length === 0 ? (
                            <p className="form__empty">No suggestions</p>
                          ) : (
                            <div className="suggestion-list">
                              {stepSuggestions.map((suggestion) => (
                                <div
                                  key={`${step.id}-${suggestion.term}-${suggestion.targetId}`}
                                  className="suggestion"
                                >
                                  <div>
                                    <strong>{suggestion.term}</strong>
                                    <span>→ {suggestion.targetTitle}</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="button button--ghost"
                                    onClick={() =>
                                      setChainDraft({
                                        ...chainDraft,
                                        steps: chainDraft.steps.map((item) =>
                                          item.id === step.id
                                            ? {
                                                ...item,
                                                mentions: [
                                                  ...item.mentions,
                                                  {
                                                    id: makeId(),
                                                    term: suggestion.term,
                                                    targetId: suggestion.targetId
                                                  }
                                                ]
                                              }
                                            : item
                                        )
                                      })
                                    }
                                  >
                                    Add
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="form__section">
                          <div className="form__section-header">
                            <h4>Mentions</h4>
                            <button
                              type="button"
                              className="button button--ghost"
                              onClick={() =>
                                setChainDraft({
                                  ...chainDraft,
                                  steps: chainDraft.steps.map((item) =>
                                    item.id === step.id
                                      ? {
                                          ...item,
                                          mentions: [
                                            ...item.mentions,
                                            { id: makeId(), term: "", targetId: "" }
                                          ]
                                        }
                                      : item
                                  )
                                })
                              }
                            >
                              Add
                            </button>
                          </div>
                          {step.mentions.length === 0 ? (
                            <p className="form__empty">No mentions</p>
                          ) : (
                            <div className="grid">
                              {step.mentions.map((row) => (
                                <div key={row.id} className="grid__row">
                                  <input
                                    placeholder="Term"
                                    value={row.term}
                                    onChange={(event) => {
                                      setChainDraft({
                                        ...chainDraft,
                                        steps: chainDraft.steps.map((item) =>
                                          item.id === step.id
                                            ? {
                                                ...item,
                                                mentions: item.mentions.map((mention) =>
                                                  mention.id === row.id
                                                    ? { ...mention, term: event.target.value }
                                                    : mention
                                                )
                                              }
                                            : item
                                        )
                                      });
                                    }}
                                  />
                                  <input
                                    list="node-ids"
                                    placeholder="Target node id"
                                    value={row.targetId}
                                    onChange={(event) => {
                                      setChainDraft({
                                        ...chainDraft,
                                        steps: chainDraft.steps.map((item) =>
                                          item.id === step.id
                                            ? {
                                                ...item,
                                                mentions: item.mentions.map((mention) =>
                                                  mention.id === row.id
                                                    ? {
                                                        ...mention,
                                                        targetId: event.target.value
                                                      }
                                                    : mention
                                                )
                                              }
                                            : item
                                        )
                                      });
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="button button--ghost"
                                    onClick={() =>
                                      setChainDraft({
                                        ...chainDraft,
                                        steps: chainDraft.steps.map((item) =>
                                          item.id === step.id
                                            ? {
                                                ...item,
                                                mentions: item.mentions.filter(
                                                  (mention) => mention.id !== row.id
                                                )
                                              }
                                            : item
                                        )
                                      })
                                    }
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="studio__panel studio__panel--lint">
          <div className="panel__header">
            <h2>Content lint</h2>
            <button type="button" className="button" onClick={handleLint}>
              Run content lint
            </button>
          </div>
          <p className="panel__status">{lintStatus}</p>
          <pre className="panel__output">{lintOutput}</pre>
        </aside>
      </main>

      <datalist id="node-ids">
        {nodeOptions.map((node) => (
          <option key={node.id} value={node.id}>
            {node.title}
          </option>
        ))}
      </datalist>
    </div>
  );
};

export default App;
