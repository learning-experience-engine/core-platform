import React from "react";
import type { Facet, Node, QuestionChain, RelationType } from "@lxp/schema";
import { DEFAULT_CHAIN_STEP_TEMPLATES, FACETS, RELATION_TYPES } from "./constants";
import { ContentListPanel } from "./components/ContentListPanel";
import { LintSidebar } from "./components/LintSidebar";
import { NodeEditor } from "./nodes/components/NodeEditor";
import { ChainEditor } from "./chains/components/ChainEditor";
import {
  buildChain,
  buildDraftChain,
  createEmptyChain,
  createTemplateStep
} from "./chains/draft";
import { validateChainDraft } from "./chains/validation";
import {
  fetchChains,
  fetchNodes,
  runContentLint,
  runContentLintBuild,
  saveChain,
  saveNode
} from "./api/contentStudioApi";
import { parseLintResult } from "./lint/parsing";
import { buildLintFallbackPaths, buildLintTargetKey } from "./lint/targets";
import type { LintIssue, LintResult } from "./lint/types";
import { buildDraftNode, buildNode, emptyDraftNode } from "./nodes/draft";
import { buildMentionSuggestions } from "./nodes/mentions";
import { validateNodeDraft } from "./nodes/validation";
import type { DraftChain, DraftNode, Mode } from "./types";
import { makeBaseId, makeUniqueId } from "./utils/ids";

const App: React.FC = () => {
  const [mode, setMode] = React.useState<Mode>("nodes");
  const [nodes, setNodes] = React.useState<Node[]>([]);
  const [chains, setChains] = React.useState<QuestionChain[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>("");
  const [selectedChainId, setSelectedChainId] = React.useState<string>("");
  const [draft, setDraft] = React.useState<DraftNode>(() => emptyDraftNode());
  const [chainDraft, setChainDraft] = React.useState<DraftChain>(() => createEmptyChain("", ""));
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
      return node.id.toLowerCase().includes(keyword) || node.title.toLowerCase().includes(keyword);
    });
  }, [nodes, search]);

  const filteredChains = React.useMemo(() => {
    const keyword = chainSearch.trim().toLowerCase();
    if (!keyword) return chains;
    return chains.filter((chain) => {
      return (
        chain.id.toLowerCase().includes(keyword) || chain.title.toLowerCase().includes(keyword)
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

  const nodeSuggestions = React.useMemo(() => {
    return buildMentionSuggestions(draft.bodyText, nodes, draft.mentions, draft.id).slice(0, 10);
  }, [draft.bodyText, draft.mentions, draft.id, nodes]);

  const nodeOptions = nodes.map((node) => ({ id: node.id, title: node.title }));

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
          <button
            type="button"
            className="button"
            onClick={mode === "nodes" ? handleSave : handleSaveChain}
          >
            Save
          </button>
        </div>
      </header>

      <main className="studio__main">
        <ContentListPanel
          mode={mode}
          filteredNodes={filtered}
          filteredChains={filteredChains}
          selectedId={selectedId}
          selectedChainId={selectedChainId}
          search={search}
          chainSearch={chainSearch}
          onSearchChange={setSearch}
          onChainSearchChange={setChainSearch}
          onSelectNode={setSelectedId}
          onSelectChain={setSelectedChainId}
          onNewNode={handleNew}
          onNewChain={handleNewChain}
        />

        <section className="studio__panel studio__panel--editor">
          <div className="panel__header">
            <h2>Editor</h2>
            <span className="panel__status">{status}</span>
          </div>

          {mode === "nodes" ? (
            <NodeEditor
              draft={draft}
              nodes={nodes}
              nodeErrors={nodeErrors}
              lintFocusTarget={lintFocusTarget}
              nodeSuggestions={nodeSuggestions}
              facetCoverage={facetCoverage}
              relationTypeCoverage={relationTypeCoverage}
              getLintIssuesForTarget={getLintIssuesForTarget}
              registerLintTarget={registerLintTarget}
              onDraftChange={setDraft}
            />
          ) : (
            <ChainEditor
              draft={chainDraft}
              chains={chains}
              nodes={nodes}
              chainErrors={chainErrors}
              lintFocusTarget={lintFocusTarget}
              chainStats={chainStats}
              getLintIssuesForTarget={getLintIssuesForTarget}
              registerLintTarget={registerLintTarget}
              onDraftChange={setChainDraft}
            />
          )}
        </section>

        <LintSidebar
          lintResult={lintResult}
          lintIssues={lintIssues}
          lintStatus={lintStatus}
          lintNeedsBuild={lintNeedsBuild}
          onRunLint={() => {
            void runLintAndUpdate("manual");
          }}
          onBuildLinter={() => {
            void handleBuildLinter();
          }}
          onIssueClick={handleLintIssueClick}
        />
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
