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
  aliasesText: string;
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
  summary: { child: string; adult: string };
  check: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: { child: string; adult: string };
  } | null;
};

type DraftChain = {
  id: string;
  title: string;
  topicNodeId: string;
  steps: DraftStep[];
  goal: { child: string; adult: string };
  isNew: boolean;
};

type Mode = "nodes" | "chains";

type LintLevel = "error" | "warn";

type LintIssue = {
  level: LintLevel;
  code: string;
  message: string;
  nodeId?: string;
  chainId?: string;
  path?: string;
  suggestions?: string[];
};

type LintResult = {
  errors: LintIssue[];
  warnings: LintIssue[];
};

type LintApiResponse = {
  ok?: boolean;
  format?: "text" | "json";
  code?: number;
  stdout?: string;
  stderr?: string;
  error?: string;
  missingDist?: boolean;
};

const classNames = (...values: Array<string | undefined | false>) => {
  const next = values.filter(Boolean).join(" ");
  return next.length > 0 ? next : undefined;
};

const buildLintTargetKey = (scope: "node" | "chain", id: string, path = ""): string => {
  return `${scope}:${id}:${encodeURIComponent(path)}`;
};

const buildLintFallbackPaths = (path: string, topPath: string): string[] => {
  const next: string[] = [];
  if (path) {
    next.push(path);
  }

  const stepMatch = path.match(/^steps\[(\d+)\](?:\.(.+))?$/);
  if (stepMatch) {
    const stepIndex = stepMatch[1];
    const tail = stepMatch[2] ?? "";
    if (tail.startsWith("mentions[")) {
      next.push(`steps[${stepIndex}].mentions`);
    }
    next.push(`steps[${stepIndex}]`);
  }

  const relationMatch = path.match(/^relations\[(\d+)\](?:\.(.+))?$/);
  if (relationMatch) {
    next.push(`relations[${relationMatch[1]}]`);
  }

  if (/^mentions\[/.test(path)) {
    next.push("mentions");
  }

  next.push(topPath);
  return Array.from(new Set(next));
};

const buildNodeMentionPath = (term: string): string => {
  return `mentions[${JSON.stringify(term)}]`;
};

const buildChainMentionPath = (index: number, term: string): string => {
  return `steps[${index}].mentions[${JSON.stringify(term)}]`;
};

const formatLintMessage = (issue: LintIssue): string => {
  return issue.message.replace(/^\[(ERROR|WARN)\]\s+/, "").trim();
};

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

const normalizeAliases = (input: string): string[] => {
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

const emptyDraftNode = (): DraftNode => ({
  id: "",
  title: "",
  aliasesText: "",
  body: "",
  bodyText: "",
  mentions: [],
  relations: [],
  isNew: true
});

const buildDraftNode = (node: Node): DraftNode => ({
  id: node.id,
  title: node.title,
  aliasesText: (node.aliases ?? []).join("\n"),
  body: node.body,
  bodyText: getBodyText(node.body),
  mentions: toMentionRows(node.mentions),
  relations: toRelationRows(node.relations),
  isNew: false
});

const buildNode = (draft: DraftNode): Node => {
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

const buildDraftStep = (step: ChainStep): DraftStep => ({
  id: step.id,
  question: step.question,
  answers: {
    child: step.answers.child ?? "",
    adult: step.answers.adult ?? ""
  },
  mentions: toMentionRows(step.mentions),
  summary: {
    child: step.summary?.child ?? "",
    adult: step.summary?.adult ?? ""
  },
  check: step.check
    ? {
        question: step.check.question ?? "",
        options: [...step.check.options],
        answerIndex: step.check.answerIndex ?? 0,
        explanation: {
          child: step.check.explanation?.child ?? "",
          adult: step.check.explanation?.adult ?? ""
        }
      }
    : null
});

const buildDraftChain = (chain: QuestionChain): DraftChain => ({
  id: chain.id,
  title: chain.title,
  topicNodeId: chain.topicNodeId,
  goal: {
    child: chain.goal?.child ?? "",
    adult: chain.goal?.adult ?? ""
  },
  steps: chain.steps.map(buildDraftStep),
  isNew: false
});

const buildStepPayload = (step: DraftStep): ChainStep => {
  const summaryChild = step.summary.child.trim();
  const summaryAdult = step.summary.adult.trim();
  const summary =
    summaryChild || summaryAdult ? { child: summaryChild, adult: summaryAdult } : undefined;
  const check =
    step.check === null
      ? undefined
      : {
          question: step.check.question.trim(),
          options: step.check.options.map((option) => option.trim()),
          answerIndex: step.check.answerIndex,
          explanation: {
            child: step.check.explanation.child.trim(),
            adult: step.check.explanation.adult.trim()
          }
        };

  return {
    id: step.id,
    question: step.question.trim(),
    answers: {
      child: step.answers.child.trim(),
      adult: step.answers.adult.trim()
    },
    mentions: toMentionRecord(step.mentions),
    ...(summary ? { summary } : {}),
    ...(check ? { check } : {})
  };
};

const buildChain = (draft: DraftChain): QuestionChain => {
  const goalChild = draft.goal.child.trim();
  const goalAdult = draft.goal.adult.trim();
  const goal = goalChild || goalAdult ? { child: goalChild, adult: goalAdult } : undefined;

  return {
    id: draft.id.trim(),
    title: draft.title.trim(),
    topicNodeId: draft.topicNodeId.trim(),
    steps: draft.steps.map(buildStepPayload),
    ...(goal ? { goal } : {})
  };
};

const createEmptyChain = (id: string, topicNodeId: string): DraftChain => ({
  id,
  title: "",
  topicNodeId,
  steps: [],
  goal: { child: "", adult: "" },
  isNew: true
});

const createStep = (id: string): DraftStep => ({
  id,
  question: "",
  answers: { child: "", adult: "" },
  mentions: [],
  summary: { child: "", adult: "" },
  check: null
});

const DEFAULT_CHAIN_STEP_TEMPLATES = [
  { key: "what", question: "是什么（What）", hint: "<补充核心定义>" },
  { key: "parts", question: "结构/组成（Parts）", hint: "<拆解关键要素>" },
  { key: "how", question: "怎么工作（How）", hint: "<解释机制或方法>" },
  { key: "in_life", question: "生活中的表现（In life）", hint: "<举例应用场景>" },
  { key: "compare_practice", question: "对比/实践（Compare/Practice）", hint: "<对比并给出练习>" }
];

const buildTemplateAnswer = (hint: string): string => {
  return `（占位）请补充回答。\n提示：${hint}`;
};

const createTemplateStep = (index: number): DraftStep => {
  const template = DEFAULT_CHAIN_STEP_TEMPLATES[index] ?? DEFAULT_CHAIN_STEP_TEMPLATES[0];
  return {
    id: `step_${index + 1}`,
    question: template.question,
    answers: {
      child: buildTemplateAnswer(template.hint),
      adult: buildTemplateAnswer(template.hint)
    },
    mentions: [],
    summary: { child: "", adult: "" },
    check: null
  };
};

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

const getNodeTerms = (node: Node): string[] => {
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

const runContentLint = async (format: "text" | "json"): Promise<LintApiResponse> => {
  const response = await fetch(`/api/lint?format=${format}`, { method: "POST" });
  const payload = (await response.json().catch(() => null)) as LintApiResponse | null;
  if (!response.ok) {
    if (payload) {
      return { ...payload, ok: false };
    }
    const message = await response.text();
    throw new Error(message || "Failed to run lint");
  }
  if (!payload) {
    throw new Error("Failed to parse lint response");
  }
  return { ...payload, ok: true };
};

const runContentLintBuild = async (): Promise<LintApiResponse> => {
  const response = await fetch("/api/lint/build", { method: "POST" });
  const payload = (await response.json().catch(() => null)) as LintApiResponse | null;
  if (!response.ok) {
    if (payload) {
      return { ...payload, ok: false };
    }
    const message = await response.text();
    throw new Error(message || "Failed to build linter");
  }
  if (!payload) {
    throw new Error("Failed to parse build response");
  }
  return { ...payload, ok: true };
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
  const [lintStatus, setLintStatus] = React.useState<string>("");
  const [lintNeedsBuild, setLintNeedsBuild] = React.useState(false);
  const [lintResult, setLintResult] = React.useState<LintResult>({
    errors: [],
    warnings: []
  });
  const [lintFocusTarget, setLintFocusTarget] = React.useState("");
  const lintTargetRefs = React.useRef<Map<string, HTMLElement>>(new Map());
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

  const lintIssues = React.useMemo(() => {
    return [...lintResult.errors, ...lintResult.warnings];
  }, [lintResult.errors, lintResult.warnings]);

  const lintIssuesByTarget = React.useMemo(() => {
    const map = new Map<string, LintIssue[]>();
    lintIssues.forEach((issue) => {
      const key = issue.nodeId
        ? buildLintTargetKey("node", issue.nodeId, issue.path ?? "")
        : issue.chainId
          ? buildLintTargetKey("chain", issue.chainId, issue.path ?? "")
          : null;
      if (!key) return;
      const current = map.get(key);
      if (current) {
        current.push(issue);
      } else {
        map.set(key, [issue]);
      }
    });
    return map;
  }, [lintIssues]);

  const getLintIssuesForTarget = (key: string): LintIssue[] => {
    return lintIssuesByTarget.get(key) ?? [];
  };

  const registerLintTarget = React.useCallback(
    (key: string) => (node: HTMLElement | null) => {
      if (!key) return;
      const map = lintTargetRefs.current;
      if (node) {
        map.set(key, node);
      } else {
        map.delete(key);
      }
    },
    []
  );

  const resolveLintTargetKey = React.useCallback((issue: LintIssue): string => {
    if (!issue.nodeId && !issue.chainId) return "";
    const scope: "node" | "chain" = issue.nodeId ? "node" : "chain";
    const id = issue.nodeId ?? issue.chainId ?? "";
    const topPath = scope === "node" ? "title" : "topicNodeId";
    const paths = buildLintFallbackPaths(issue.path ?? "", topPath);
    for (const candidate of paths) {
      const key = buildLintTargetKey(scope, id, candidate);
      if (lintTargetRefs.current.has(key)) {
        return key;
      }
    }
    return buildLintTargetKey(scope, id, paths[0] ?? topPath);
  }, []);

  const parseLintResult = (payload: LintApiResponse): LintResult | null => {
    if (payload.format !== "json" || !payload.stdout) {
      return null;
    }
    try {
      const parsed = JSON.parse(payload.stdout) as LintResult;
      if (!Array.isArray(parsed.errors) || !Array.isArray(parsed.warnings)) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  };

  const runLintAndUpdate = async (source: "manual" | "auto") => {
    try {
      setLintStatus(source === "auto" ? "自动 lint 中..." : "运行中...");
      setLintNeedsBuild(false);
      const payload = await runContentLint("json");
      if (!payload.ok) {
        if (payload.missingDist) {
          setLintStatus("Content linter 未构建，请先 build。");
          setLintNeedsBuild(true);
          return;
        }
        setLintStatus(`Lint failed: ${payload.error ?? "Unknown error"}`);
        return;
      }
      const parsed = parseLintResult(payload);
      if (!parsed) {
        setLintStatus("Lint 输出解析失败");
        return;
      }
      setLintResult(parsed);
      const code = payload.code ?? 0;
      setLintStatus(code === 0 ? "Lint passed" : `Lint failed (code ${code})`);
    } catch (error) {
      setLintStatus(`Lint failed: ${String(error)}`);
    }
  };

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
      void runLintAndUpdate("auto");
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
      void runLintAndUpdate("auto");
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
    next.steps = DEFAULT_CHAIN_STEP_TEMPLATES.map((_, index) => createTemplateStep(index));
    setChainDraft(next);
    setSelectedChainId("");
    setChainErrors([]);
    setStatus("新链路已创建");
  };

  const handleLint = async () => {
    await runLintAndUpdate("manual");
  };

  const handleBuildLinter = async () => {
    try {
      setLintStatus("正在构建 content-linter...");
      const payload = await runContentLintBuild();
      if (!payload.ok) {
        setLintStatus(`Build failed: ${payload.error ?? "Unknown error"}`);
        return;
      }
      const code = payload.code ?? 0;
      setLintStatus(code === 0 ? "Build completed." : `Build failed (code ${code})`);
      if (code === 0) {
        setLintNeedsBuild(false);
      }
    } catch (error) {
      setLintStatus(`Build failed: ${String(error)}`);
    }
  };

  const focusLintTarget = React.useCallback(
    (issue: LintIssue) => {
      const key = resolveLintTargetKey(issue);
      if (!key) return;
      const target =
        lintTargetRefs.current.get(key) ??
        document.querySelector(`[data-lint-target="${key}"]`);
      if (!target) return;

      setLintFocusTarget(key);
      if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.focus?.();
      }

      window.setTimeout(() => {
        setLintFocusTarget((current) => (current === key ? "" : current));
      }, 1500);
    },
    [resolveLintTargetKey]
  );

  const handleLintIssueClick = (issue: LintIssue) => {
    if (issue.nodeId) {
      setMode("nodes");
      setSelectedId(issue.nodeId);
    } else if (issue.chainId) {
      setMode("chains");
      setSelectedChainId(issue.chainId);
    }

    window.setTimeout(() => {
      focusLintTarget(issue);
    }, 80);
  };

  const nodeOptions = nodes.map((node) => ({ id: node.id, title: node.title }));
  const nodeSuggestions = React.useMemo(() => {
    return buildMentionSuggestions(draft.bodyText, nodes, draft.mentions, draft.id).slice(0, 10);
  }, [draft.bodyText, draft.mentions, draft.id, nodes]);

  const nodeIdTarget = buildLintTargetKey("node", draft.id, "id");
  const nodeTitleTarget = buildLintTargetKey("node", draft.id, "title");
  const nodeBodyTarget = buildLintTargetKey("node", draft.id, "body");
  const nodeMentionsTarget = buildLintTargetKey("node", draft.id, "mentions");
  const chainIdTarget = buildLintTargetKey("chain", chainDraft.id, "id");
  const chainTitleTarget = buildLintTargetKey("chain", chainDraft.id, "title");
  const chainTopicTarget = buildLintTargetKey("chain", chainDraft.id, "topicNodeId");

  const nodeIdIssues = getLintIssuesForTarget(nodeIdTarget);
  const nodeTitleIssues = getLintIssuesForTarget(nodeTitleTarget);
  const nodeBodyIssues = getLintIssuesForTarget(nodeBodyTarget);
  const chainIdIssues = getLintIssuesForTarget(chainIdTarget);
  const chainTitleIssues = getLintIssuesForTarget(chainTitleTarget);
  const chainTopicIssues = getLintIssuesForTarget(chainTopicTarget);
  const facetCoverage = React.useMemo(() => {
    const counts = new Map<Facet, number>();
    FACETS.forEach((facet) => counts.set(facet, 0));
    draft.relations.forEach((relation) => {
      counts.set(relation.facet, (counts.get(relation.facet) ?? 0) + 1);
    });
    return counts;
  }, [draft.relations]);
  const relationTypeCoverage = React.useMemo(() => {
    const counts = new Map<RelationType, number>();
    RELATION_TYPES.forEach((type) => counts.set(type, 0));
    draft.relations.forEach((relation) => {
      counts.set(relation.type, (counts.get(relation.type) ?? 0) + 1);
    });
    return counts;
  }, [draft.relations]);
  const chainStats = React.useMemo(() => {
    const stepCount = chainDraft.steps.length;
    const mentionCount = chainDraft.steps.reduce((sum, step) => sum + step.mentions.length, 0);
    const missingMentionSteps = chainDraft.steps
      .map((step, index) => ({ id: step.id, index, count: step.mentions.length }))
      .filter((step) => step.count === 0);
    return { stepCount, mentionCount, missingMentionSteps };
  }, [chainDraft.steps]);

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
                  data-lint-target={nodeIdTarget}
                  ref={registerLintTarget(nodeIdTarget)}
                  className={classNames(
                    nodeIdIssues.length > 0 && "input--error",
                    lintFocusTarget === nodeIdTarget && "input--lint-focus"
                  )}
                  onChange={(event) => setDraft({ ...draft, id: event.target.value })}
                />
                {draft.isNew && <span className="form__hint">未保存</span>}
                {nodeIdIssues.length > 0 && (
                  <span className="form__hint form__hint--error">
                    {formatLintMessage(nodeIdIssues[0])}
                  </span>
                )}
              </label>
              <label>
                <span>Title</span>
                <input
                  value={draft.title}
                  data-lint-target={nodeTitleTarget}
                  ref={registerLintTarget(nodeTitleTarget)}
                  className={classNames(
                    nodeTitleIssues.length > 0 && "input--error",
                    lintFocusTarget === nodeTitleTarget && "input--lint-focus"
                  )}
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
                {nodeTitleIssues.length > 0 && (
                  <span className="form__hint form__hint--error">
                    {formatLintMessage(nodeTitleIssues[0])}
                  </span>
                )}
              </label>
              <label>
                <span>Aliases</span>
                <textarea
                  rows={3}
                  placeholder="One alias per line"
                  value={draft.aliasesText}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      aliasesText: event.target.value
                    })
                  }
                />
              </label>
              <label>
                <span>Body</span>
                <textarea
                  rows={6}
                  value={draft.bodyText}
                  data-lint-target={nodeBodyTarget}
                  ref={registerLintTarget(nodeBodyTarget)}
                  className={classNames(
                    nodeBodyIssues.length > 0 && "input--error",
                    lintFocusTarget === nodeBodyTarget && "input--lint-focus"
                  )}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      bodyText: event.target.value,
                      body: updateBody(draft.body, event.target.value)
                    })
                  }
                />
                {nodeBodyIssues.length > 0 && (
                  <span className="form__hint form__hint--error">
                    {formatLintMessage(nodeBodyIssues[0])}
                  </span>
                )}
              </label>

              <div className="form__section">
                <div className="form__section-header">
                  <h3>Coverage</h3>
                </div>
                <div className="coverage">
                  {FACETS.map((facet) => {
                    const count = facetCoverage.get(facet) ?? 0;
                    return (
                      <div
                        key={facet}
                        className={classNames(
                          "coverage__item",
                          count === 0 && "coverage__item--missing"
                        )}
                      >
                        <span>{facet}</span>
                        <span>
                          {count} {count === 0 ? "(missing)" : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="coverage coverage--types">
                  {RELATION_TYPES.map((type) => {
                    const count = relationTypeCoverage.get(type) ?? 0;
                    return (
                      <div key={type} className="coverage__item coverage__item--compact">
                        <span>{type}</span>
                        <span>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className={classNames(
                  "form__section",
                  lintFocusTarget === nodeMentionsTarget && "lint-focus"
                )}
                data-lint-target={nodeMentionsTarget}
                ref={registerLintTarget(nodeMentionsTarget)}
                tabIndex={-1}
              >
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
                    {draft.mentions.map((row) => {
                      const mentionPath = row.term ? buildNodeMentionPath(row.term) : "";
                      const mentionTarget = buildLintTargetKey("node", draft.id, mentionPath);
                      const mentionIssues = mentionPath
                        ? getLintIssuesForTarget(mentionTarget)
                        : [];
                      return (
                        <React.Fragment key={row.id}>
                          <div className="grid__row">
                            <input
                              placeholder="Term"
                              value={row.term}
                              className={classNames(
                                mentionIssues.length > 0 && "input--error",
                                lintFocusTarget === mentionTarget && "input--lint-focus"
                              )}
                              onChange={(event) => {
                                setDraft({
                                  ...draft,
                                  mentions: draft.mentions.map((item) =>
                                    item.id === row.id
                                      ? { ...item, term: event.target.value }
                                      : item
                                  )
                                });
                              }}
                            />
                            <input
                              list="node-ids"
                              placeholder="Target node id"
                              value={row.targetId}
                              data-lint-target={mentionPath ? mentionTarget : undefined}
                              ref={mentionPath ? registerLintTarget(mentionTarget) : undefined}
                              className={classNames(
                                mentionIssues.length > 0 && "input--error",
                                lintFocusTarget === mentionTarget && "input--lint-focus"
                              )}
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
                          {mentionIssues.length > 0 && (
                            <span className="form__hint form__hint--error">
                              {formatLintMessage(mentionIssues[0])}
                            </span>
                          )}
                        </React.Fragment>
                      );
                    })}
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
                    {draft.relations.map((row, index) => {
                      const relationRowTarget = buildLintTargetKey(
                        "node",
                        draft.id,
                        `relations[${index}]`
                      );
                      const typeTarget = buildLintTargetKey(
                        "node",
                        draft.id,
                        `relations[${index}].type`
                      );
                      const facetTarget = buildLintTargetKey(
                        "node",
                        draft.id,
                        `relations[${index}].facet`
                      );
                      const toTarget = buildLintTargetKey(
                        "node",
                        draft.id,
                        `relations[${index}].to`
                      );
                      const relationIssues = [
                        ...getLintIssuesForTarget(typeTarget),
                        ...getLintIssuesForTarget(facetTarget),
                        ...getLintIssuesForTarget(toTarget)
                      ];
                      return (
                        <React.Fragment key={row.id}>
                          <div
                            className={classNames(
                              "grid__row",
                              lintFocusTarget === relationRowTarget && "lint-focus"
                            )}
                            data-lint-target={relationRowTarget}
                            ref={registerLintTarget(relationRowTarget)}
                            tabIndex={-1}
                          >
                            <select
                              value={row.type}
                              data-lint-target={typeTarget}
                              ref={registerLintTarget(typeTarget)}
                              className={classNames(
                                getLintIssuesForTarget(typeTarget).length > 0 && "input--error",
                                lintFocusTarget === typeTarget && "input--lint-focus"
                              )}
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
                              data-lint-target={facetTarget}
                              ref={registerLintTarget(facetTarget)}
                              className={classNames(
                                getLintIssuesForTarget(facetTarget).length > 0 && "input--error",
                                lintFocusTarget === facetTarget && "input--lint-focus"
                              )}
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
                              data-lint-target={toTarget}
                              ref={registerLintTarget(toTarget)}
                              className={classNames(
                                getLintIssuesForTarget(toTarget).length > 0 && "input--error",
                                lintFocusTarget === toTarget && "input--lint-focus"
                              )}
                              onChange={(event) => {
                                setDraft({
                                  ...draft,
                                  relations: draft.relations.map((item) =>
                                    item.id === row.id
                                      ? { ...item, to: event.target.value }
                                      : item
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
                          {relationIssues.length > 0 && (
                            <span className="form__hint form__hint--error">
                              {formatLintMessage(relationIssues[0])}
                            </span>
                          )}
                        </React.Fragment>
                      );
                    })}
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
                  data-lint-target={chainIdTarget}
                  ref={registerLintTarget(chainIdTarget)}
                  className={classNames(
                    chainIdIssues.length > 0 && "input--error",
                    lintFocusTarget === chainIdTarget && "input--lint-focus"
                  )}
                  onChange={(event) =>
                    setChainDraft({ ...chainDraft, id: event.target.value })
                  }
                />
                {chainIdIssues.length > 0 && (
                  <span className="form__hint form__hint--error">
                    {formatLintMessage(chainIdIssues[0])}
                  </span>
                )}
              </label>
              <label>
                <span>Title</span>
                <input
                  value={chainDraft.title}
                  data-lint-target={chainTitleTarget}
                  ref={registerLintTarget(chainTitleTarget)}
                  className={classNames(
                    chainTitleIssues.length > 0 && "input--error",
                    lintFocusTarget === chainTitleTarget && "input--lint-focus"
                  )}
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
                {chainTitleIssues.length > 0 && (
                  <span className="form__hint form__hint--error">
                    {formatLintMessage(chainTitleIssues[0])}
                  </span>
                )}
              </label>
              <label>
                <span>Topic Node</span>
                <input
                  list="node-ids"
                  placeholder="topicNodeId"
                  value={chainDraft.topicNodeId}
                  data-lint-target={chainTopicTarget}
                  ref={registerLintTarget(chainTopicTarget)}
                  className={classNames(
                    !chainDraft.topicNodeId.trim() && "input--error",
                    chainTopicIssues.length > 0 && "input--error",
                    lintFocusTarget === chainTopicTarget && "input--lint-focus"
                  )}
                  onChange={(event) =>
                    setChainDraft({ ...chainDraft, topicNodeId: event.target.value })
                  }
                />
                {!chainDraft.topicNodeId.trim() && (
                  <span className="form__hint form__hint--error">Topic node 不能为空</span>
                )}
                {chainTopicIssues.length > 0 && (
                  <span className="form__hint form__hint--error">
                    {formatLintMessage(chainTopicIssues[0])}
                  </span>
                )}
              </label>

              <div className="form__section">
                <div className="form__section-header">
                  <h3>Goal</h3>
                </div>
                <div className="grid grid--answers">
                  {AGE_BANDS.map((age) => (
                    <label key={`goal-${age}`}>
                      <span>Goal ({age})</span>
                      <textarea
                        rows={2}
                        value={chainDraft.goal[age]}
                        onChange={(event) =>
                          setChainDraft({
                            ...chainDraft,
                            goal: { ...chainDraft.goal, [age]: event.target.value }
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="form__section">
                <div className="form__section-header">
                  <h3>Chain stats</h3>
                </div>
                <div className="coverage">
                  <div className="coverage__item coverage__item--compact">
                    <span>steps</span>
                    <span>{chainStats.stepCount}</span>
                  </div>
                  <div className="coverage__item coverage__item--compact">
                    <span>mentions</span>
                    <span>{chainStats.mentionCount}</span>
                  </div>
                </div>
                {chainStats.missingMentionSteps.length > 0 && (
                  <div className="coverage coverage--missing">
                    {chainStats.missingMentionSteps.map((step) => (
                      <div key={step.id} className="coverage__item coverage__item--missing">
                        <span>{step.id}</span>
                        <span>mentions missing</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                      const stepTarget = buildLintTargetKey(
                        "chain",
                        chainDraft.id,
                        `steps[${index}]`
                      );
                      const questionTarget = buildLintTargetKey(
                        "chain",
                        chainDraft.id,
                        `steps[${index}].question`
                      );
                      const answerTarget = (age: AgeBand) =>
                        buildLintTargetKey(
                          "chain",
                          chainDraft.id,
                          `steps[${index}].answers.${age}`
                        );
                      const stepMentionsTarget = buildLintTargetKey(
                        "chain",
                        chainDraft.id,
                        `steps[${index}].mentions`
                      );
                      const stepSuggestions = buildMentionSuggestions(
                        `${step.answers.child}\n${step.answers.adult}`,
                        nodes,
                        step.mentions
                      ).slice(0, 10);
                      return (
                        <div
                          key={step.id}
                          className={classNames(
                            "step-card",
                            lintFocusTarget === stepTarget && "lint-focus"
                          )}
                          data-lint-target={stepTarget}
                          ref={registerLintTarget(stepTarget)}
                          tabIndex={-1}
                        >
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
                              data-lint-target={questionTarget}
                              ref={registerLintTarget(questionTarget)}
                              className={classNames(
                                getLintIssuesForTarget(questionTarget).length > 0 && "input--error",
                                lintFocusTarget === questionTarget && "input--lint-focus"
                              )}
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
                            {getLintIssuesForTarget(questionTarget).length > 0 && (
                              <span className="form__hint form__hint--error">
                                {formatLintMessage(getLintIssuesForTarget(questionTarget)[0])}
                              </span>
                            )}
                          </label>
                          <div className="grid grid--answers">
                            {AGE_BANDS.map((age) => (
                              <label key={age}>
                                <span>Answer ({age})</span>
                                <textarea
                                  rows={3}
                                  value={step.answers[age]}
                                  data-lint-target={answerTarget(age)}
                                  ref={registerLintTarget(answerTarget(age))}
                                  className={classNames(
                                    getLintIssuesForTarget(answerTarget(age)).length > 0 &&
                                      "input--error",
                                    lintFocusTarget === answerTarget(age) && "input--lint-focus"
                                  )}
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
                                {getLintIssuesForTarget(answerTarget(age)).length > 0 && (
                                  <span className="form__hint form__hint--error">
                                    {formatLintMessage(
                                      getLintIssuesForTarget(answerTarget(age))[0]
                                    )}
                                  </span>
                                )}
                              </label>
                            ))}
                          </div>
                          <div className="form__section">
                            <div className="form__section-header">
                              <h4>Summary</h4>
                            </div>
                            <div className="grid grid--answers">
                              {AGE_BANDS.map((age) => (
                                <label key={`summary-${step.id}-${age}`}>
                                  <span>Summary ({age})</span>
                                  <textarea
                                    rows={2}
                                    value={step.summary[age]}
                                    onChange={(event) =>
                                      setChainDraft({
                                        ...chainDraft,
                                        steps: chainDraft.steps.map((item) =>
                                          item.id === step.id
                                            ? {
                                                ...item,
                                                summary: {
                                                  ...item.summary,
                                                  [age]: event.target.value
                                                }
                                              }
                                            : item
                                        )
                                      })
                                    }
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="form__section">
                            <div className="form__section-header">
                              <h4>Quick Check</h4>
                              {step.check ? (
                                <button
                                  type="button"
                                  className="button button--ghost"
                                  onClick={() =>
                                    setChainDraft({
                                      ...chainDraft,
                                      steps: chainDraft.steps.map((item) =>
                                        item.id === step.id ? { ...item, check: null } : item
                                      )
                                    })
                                  }
                                >
                                  Remove
                                </button>
                              ) : (
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
                                              check: {
                                                question: "",
                                                options: ["", ""],
                                                answerIndex: 0,
                                                explanation: { child: "", adult: "" }
                                              }
                                            }
                                          : item
                                      )
                                    })
                                  }
                                >
                                  Add
                                </button>
                              )}
                            </div>
                            {step.check ? (
                              <>
                                <label>
                                  <span>Question</span>
                                  <input
                                    value={step.check.question}
                                    onChange={(event) =>
                                      setChainDraft({
                                        ...chainDraft,
                                        steps: chainDraft.steps.map((item) =>
                                          item.id === step.id
                                            ? {
                                                ...item,
                                                check: {
                                                  ...item.check,
                                                  question: event.target.value
                                                }
                                              }
                                            : item
                                        )
                                      })
                                    }
                                  />
                                </label>
                                <div className="grid">
                                  {step.check.options.map((option, optionIndex) => (
                                    <div key={`${step.id}-opt-${optionIndex}`} className="grid__row">
                                      <input
                                        type="radio"
                                        name={`answer-${step.id}`}
                                        checked={step.check?.answerIndex === optionIndex}
                                        onChange={() =>
                                          setChainDraft({
                                            ...chainDraft,
                                            steps: chainDraft.steps.map((item) =>
                                              item.id === step.id
                                                ? {
                                                    ...item,
                                                    check: {
                                                      ...item.check,
                                                      answerIndex: optionIndex
                                                    }
                                                  }
                                                : item
                                            )
                                          })
                                        }
                                      />
                                      <input
                                        placeholder={`Option ${optionIndex + 1}`}
                                        value={option}
                                        onChange={(event) =>
                                          setChainDraft({
                                            ...chainDraft,
                                            steps: chainDraft.steps.map((item) =>
                                              item.id === step.id
                                                ? {
                                                    ...item,
                                                    check: {
                                                      ...item.check,
                                                      options: item.check.options.map(
                                                        (value, index) =>
                                                          index === optionIndex
                                                            ? event.target.value
                                                            : value
                                                      )
                                                    }
                                                  }
                                                : item
                                            )
                                          })
                                        }
                                      />
                                      <button
                                        type="button"
                                        className="button button--ghost"
                                        disabled={step.check.options.length <= 2}
                                        onClick={() =>
                                          setChainDraft({
                                            ...chainDraft,
                                            steps: chainDraft.steps.map((item) => {
                                              if (item.id !== step.id || !item.check) return item;
                                              const nextOptions = item.check.options.filter(
                                                (_, index) => index !== optionIndex
                                              );
                                              let nextAnswerIndex = item.check.answerIndex;
                                              if (optionIndex === nextAnswerIndex) {
                                                nextAnswerIndex = 0;
                                              } else if (optionIndex < nextAnswerIndex) {
                                                nextAnswerIndex -= 1;
                                              }
                                              return {
                                                ...item,
                                                check: {
                                                  ...item.check,
                                                  options: nextOptions,
                                                  answerIndex: nextAnswerIndex
                                                }
                                              };
                                            })
                                          })
                                        }
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
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
                                              check: {
                                                ...item.check,
                                                options: [...item.check.options, ""]
                                              }
                                            }
                                          : item
                                      )
                                    })
                                  }
                                >
                                  Add Option
                                </button>
                                <div className="grid grid--answers">
                                  {AGE_BANDS.map((age) => (
                                    <label key={`explain-${step.id}-${age}`}>
                                      <span>Explanation ({age})</span>
                                      <textarea
                                        rows={2}
                                        value={step.check.explanation[age]}
                                        onChange={(event) =>
                                          setChainDraft({
                                            ...chainDraft,
                                            steps: chainDraft.steps.map((item) =>
                                              item.id === step.id
                                                ? {
                                                    ...item,
                                                    check: {
                                                      ...item.check,
                                                      explanation: {
                                                        ...item.check.explanation,
                                                        [age]: event.target.value
                                                      }
                                                    }
                                                  }
                                                : item
                                            )
                                          })
                                        }
                                      />
                                    </label>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="form__empty">No quick check</p>
                            )}
                          </div>
                        <div
                          className={classNames(
                            "form__section",
                            lintFocusTarget === stepMentionsTarget && "lint-focus"
                          )}
                          data-lint-target={stepMentionsTarget}
                          ref={registerLintTarget(stepMentionsTarget)}
                          tabIndex={-1}
                        >
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
                              {step.mentions.map((row) => {
                                const mentionPath = row.term
                                  ? buildChainMentionPath(index, row.term)
                                  : "";
                                const mentionTarget = buildLintTargetKey(
                                  "chain",
                                  chainDraft.id,
                                  mentionPath
                                );
                                const mentionIssues = mentionPath
                                  ? getLintIssuesForTarget(mentionTarget)
                                  : [];
                                return (
                                  <React.Fragment key={row.id}>
                                    <div className="grid__row">
                                      <input
                                        placeholder="Term"
                                        value={row.term}
                                        className={classNames(
                                          mentionIssues.length > 0 && "input--error",
                                          lintFocusTarget === mentionTarget && "input--lint-focus"
                                        )}
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
                                        data-lint-target={mentionPath ? mentionTarget : undefined}
                                        ref={
                                          mentionPath
                                            ? registerLintTarget(mentionTarget)
                                            : undefined
                                        }
                                        className={classNames(
                                          mentionIssues.length > 0 && "input--error",
                                          lintFocusTarget === mentionTarget && "input--lint-focus"
                                        )}
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
                                    {mentionIssues.length > 0 && (
                                      <span className="form__hint form__hint--error">
                                        {formatLintMessage(mentionIssues[0])}
                                      </span>
                                    )}
                                  </React.Fragment>
                                );
                              })}
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
            <h2>Lint Results</h2>
            <button type="button" className="button" onClick={handleLint}>
              Run content lint
            </button>
          </div>
          <div className="lint__summary">
            <span className="lint__badge lint__badge--error">
              Errors {lintResult.errors.length}
            </span>
            <span className="lint__badge lint__badge--warn">
              Warnings {lintResult.warnings.length}
            </span>
          </div>
          <p className="panel__status">{lintStatus}</p>
          {lintNeedsBuild && (
            <div className="lint__build">
              <p className="form__hint form__hint--error">
                Content linter 未构建。请先执行 `pnpm -r build`，或点击按钮构建。
              </p>
              <button type="button" className="button button--ghost" onClick={handleBuildLinter}>
                Build linter
              </button>
            </div>
          )}
          {lintIssues.length === 0 ? (
            <p className="form__empty">No lint issues.</p>
          ) : (
            <div className="lint__list">
              {lintIssues.map((issue, index) => {
                const scope = issue.nodeId
                  ? `node:${issue.nodeId}`
                  : issue.chainId
                    ? `chain:${issue.chainId}`
                    : "content";
                const key = `${issue.code}-${issue.path ?? ""}-${index}`;
                return (
                  <button
                    key={key}
                    type="button"
                    className={classNames(
                      "lint__item",
                      issue.level === "error" ? "lint__item--error" : "lint__item--warn"
                    )}
                    onClick={() => handleLintIssueClick(issue)}
                  >
                    <div className="lint__item-header">
                      <strong>{scope}</strong>
                      {issue.path && <span>{issue.path}</span>}
                    </div>
                    <span className="lint__item-message">{formatLintMessage(issue)}</span>
                    {issue.suggestions && issue.suggestions.length > 0 && (
                      <span className="lint__item-suggestions">
                        suggest: {issue.suggestions.join(", ")}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
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
