import { useEffect, useMemo, useReducer, useRef, useState, type ReactElement } from "react";
import {
  getNodeById,
  reduceCardStack,
  setStack,
  push,
  getTop,
  getPrev,
  getBreadcrumb,
  DEFAULT_ROOT_ID,
  reduceQuestionChain,
  type Node,
  type CardStackState,
  type QuestionChainState,
  type QuestionChainAction,
  type SearchResult,
  type QuestionChain,
  type ScenarioMatch,
  type Domain
} from "@lxp/core";
import { GraphMini, NodeCard, QuestionChainPanel } from "@lxp/renderer-web";
import "./styles.css";
import { formatSearch, parseChainFromLocation, parseStackFromLocation } from "./urlStack";
import type { Facet } from "@lxp/schema";
import { fetchChains, fetchDomains, fetchNodes, fetchScenarioMatches, fetchSearchResults } from "./contentApi";

const getTitle = (node: Node | undefined): string => node?.title ?? "Unknown";

const FACETS: Facet[] = ["what", "how", "in_life", "compare", "practice"];
const FACET_LABELS: Record<Facet, string> = {
  what: "是什么",
  how: "怎么实现",
  in_life: "生活体现",
  compare: "差异对比",
  practice: "动手实践"
};

type NeighborhoodPanelProps = {
  centerId: string;
  nodesById: Record<string, Node>;
  onNavigate?: (nodeId: string) => void;
};

type DemoPreset = {
  id: string;
  label: string;
  description: string;
  stack: string[];
  chainId?: string;
  stepIndex?: number;
  age?: "child" | "adult";
};

const getSearchResultMeta = (result: SearchResult): string => {
  if (result.kind === "node") return `Node · ${result.id}`;
  return `Chain · ${result.id}`;
};

const getScenarioMeta = (match: ScenarioMatch): string => {
  return `Topic · ${match.topicNodeId}${match.chainId ? ` · Chain ${match.chainId}` : ""}`;
};

const NeighborhoodPanel = ({ centerId, nodesById, onNavigate }: NeighborhoodPanelProps) => {
  const [facet, setFacet] = useReducer(
    (_: Facet | "all", next: Facet | "all") => next,
    "all"
  );
  const [view, setView] = useReducer(
    (_: "graph" | "list", next: "graph" | "list") => next,
    "graph"
  );

  return (
    <div className="neighborhood">
      <div className="neighborhood__controls">
        <div className="neighborhood__tabs" role="tablist" aria-label="Facet filter">
          {["all", ...FACETS].map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={facet === key}
              className={`neighborhood__tab${facet === key ? " is-active" : ""}`}
              onClick={() => setFacet(key as Facet | "all")}
            >
              {key === "all" ? "All" : FACET_LABELS[key as Facet]}
            </button>
          ))}
        </div>
        <div className="neighborhood__view" role="group" aria-label="View mode">
          <button
            type="button"
            className={`neighborhood__view-btn${view === "graph" ? " is-active" : ""}`}
            onClick={() => setView("graph")}
          >
            Graph view
          </button>
          <button
            type="button"
            className={`neighborhood__view-btn${view === "list" ? " is-active" : ""}`}
            onClick={() => setView("list")}
          >
            List view
          </button>
        </div>
      </div>
      <GraphMini centerId={centerId} nodesById={nodesById} facet={facet} view={view} onNavigate={onNavigate} />
    </div>
  );
};

export const App = (): ReactElement => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [chains, setChains] = useState<QuestionChain[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchStatus, setSearchStatus] = useState("");
  const [scenarioQuery, setScenarioQuery] = useState("");
  const [scenarioMatches, setScenarioMatches] = useState<ScenarioMatch[]>([]);
  const [scenarioStatus, setScenarioStatus] = useState("");
  const nodesById = useMemo(
    () => Object.fromEntries(nodes.map((node) => [node.id, node])),
    [nodes]
  );
  const chainsById = useMemo(
    () => Object.fromEntries(chains.map((chain) => [chain.id, chain])),
    [chains]
  );
  const chainsByTopic = useMemo(() => {
    const map = new Map<string, QuestionChain>();
    chains.forEach((chain) => {
      map.set(chain.topicNodeId, chain);
    });
    return map;
  }, [chains]);
  const [state, dispatch] = useReducer(
    reduceCardStack,
    { stack: ["plant_cell"] } satisfies CardStackState,
    () => ({ stack: parseStackFromLocation(window.location.search) })
  );
  const [chainState, chainDispatch] = useReducer(
    (current: QuestionChainState, action: QuestionChainAction) => {
      const nextChainId = action.type === "SET_CHAIN" ? action.chainId : current.chainId;
      const stepCount = chainsById[nextChainId]?.steps.length ?? 0;
      return reduceQuestionChain(current, action, { stepCount, defaultAge: "child" });
    },
    { chainId: "", stepIndex: 0, age: "child" } satisfies QuestionChainState,
    () => ({ chainId: "", stepIndex: 0, age: "child" } satisfies QuestionChainState)
  );
  const lastSearchRef = useRef<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchKind, setSearchKind] = useState<"all" | "node" | "chain">("all");
  const [searchDomain, setSearchDomain] = useState<string>("all");
  const selectedDomain = domains.find((domain) => domain.id === searchDomain);

  const currentId = getTop(state) ?? DEFAULT_ROOT_ID;
  const prevId = getPrev(state) ?? currentId;
  const current = getNodeById(currentId, nodes);
  const previous = getNodeById(prevId, nodes);
  const breadcrumb = getBreadcrumb(state);
  const activeChain = chainState.chainId ? chainsById[chainState.chainId] : undefined;
  const hasSearchQuery = searchQuery.trim().length > 0;
  const hasDomains = domains.length > 0;
  const demoPresets: DemoPreset[] = [
    {
      id: "deep-dive",
      label: "Deep-dive",
      description: "stack: plant_cell > protoplast > membrane",
      stack: ["plant_cell", "protoplast", "membrane"]
    },
    {
      id: "question-chain",
      label: "Question chain",
      description: "chain: plant_cell_intro (adult, step 0)",
      stack: ["plant_cell"],
      chainId: "plant_cell_intro",
      stepIndex: 0,
      age: "adult"
    },
    {
      id: "mixed",
      label: "Mixed",
      description: "stack + chain (child, step 1)",
      stack: ["plant_cell", "protoplast"],
      chainId: "plant_cell_intro",
      stepIndex: 1,
      age: "child"
    }
  ];

  const handleMentionClick = (nodeId: string) => {
    dispatch(push(nodeId));
  };

  const handleStartChain = (chainId: string) => {
    chainDispatch({ type: "SET_CHAIN", chainId });
  };

  const handleBreadcrumbClick = (index: number) => {
    dispatch(setStack(breadcrumb.slice(0, index + 1)));
  };

  const handlePresetClick = (preset: DemoPreset) => {
    dispatch(setStack(preset.stack));
    if (!preset.chainId) {
      chainDispatch({ type: "EXIT" });
      return;
    }
    chainDispatch({ type: "SET_CHAIN", chainId: preset.chainId });
    chainDispatch({ type: "SET_STEP", index: preset.stepIndex ?? 0 });
    if (preset.age) {
      chainDispatch({ type: "SET_AGE", age: preset.age });
    }
  };

  const handleSearchResultClick = (result: SearchResult) => {
    if (result.kind === "node") {
      dispatch(setStack([result.id]));
      chainDispatch({ type: "EXIT" });
      return;
    }

    dispatch(setStack([result.topicNodeId ?? DEFAULT_ROOT_ID]));
    chainDispatch({ type: "SET_CHAIN", chainId: result.id });
    chainDispatch({ type: "SET_STEP", index: 0 });
  };

  const handleScenarioMatchClick = (match: ScenarioMatch) => {
    dispatch(setStack([match.topicNodeId]));
    if (!match.chainId) {
      chainDispatch({ type: "EXIT" });
      return;
    }
    chainDispatch({ type: "SET_CHAIN", chainId: match.chainId });
    chainDispatch({ type: "SET_STEP", index: 0 });
  };

  const handleDomainTopicClick = (topicId: string) => {
    dispatch(setStack([topicId]));
    chainDispatch({ type: "EXIT" });
  };

  useEffect(() => {
    Promise.all([fetchNodes(), fetchChains(), fetchDomains()])
      .then(([nextNodes, nextChains, nextDomains]) => {
        setNodes(nextNodes);
        setChains(nextChains);
        setDomains(nextDomains);
        setLoading(false);

        const parsedChain = parseChainFromLocation(
          window.location.search,
          new Set(nextChains.map((chain) => chain.id))
        );
        if (parsedChain.chainId) {
          chainDispatch({ type: "SET_CHAIN", chainId: parsedChain.chainId });
          chainDispatch({ type: "SET_STEP", index: parsedChain.stepIndex });
          chainDispatch({ type: "SET_AGE", age: parsedChain.age });
        }
      })
      .catch((error) => {
        setLoadError(String(error));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!hasSearchQuery) {
      setSearchResults([]);
      setSearchStatus("");
      return;
    }

    let cancelled = false;
    setSearchStatus("Searching...");
    void fetchSearchResults(searchQuery, {
      limit: 10,
      kinds: searchKind === "all" ? undefined : [searchKind],
      domainId: searchDomain === "all" ? undefined : searchDomain
    })
      .then((results) => {
        if (cancelled) return;
        setSearchResults(results);
        setSearchStatus("");
      })
      .catch((error) => {
        if (cancelled) return;
        setSearchResults([]);
        setSearchStatus(`Search failed: ${String(error)}`);
      });

    return () => {
      cancelled = true;
    };
  }, [hasSearchQuery, searchDomain, searchKind, searchQuery]);

  useEffect(() => {
    if (!scenarioQuery.trim()) {
      setScenarioMatches([]);
      setScenarioStatus("");
      return;
    }

    let cancelled = false;
    setScenarioStatus("Matching...");
    void fetchScenarioMatches(scenarioQuery, 5, searchDomain === "all" ? undefined : searchDomain)
      .then((results) => {
        if (cancelled) return;
        setScenarioMatches(results);
        setScenarioStatus("");
      })
      .catch((error) => {
        if (cancelled) return;
        setScenarioMatches([]);
        setScenarioStatus(`Scenario match failed: ${String(error)}`);
      });

    return () => {
      cancelled = true;
    };
  }, [scenarioQuery, searchDomain]);

  useEffect(() => {
    if (loading) return;

    const handlePopstate = () => {
      const parsed = parseStackFromLocation(window.location.search);
      dispatch(setStack(parsed));
      const parsedChain = parseChainFromLocation(
        window.location.search,
        new Set(chains.map((chain) => chain.id))
      );
      chainDispatch({
        type: "SET_CHAIN",
        chainId: parsedChain.chainId
      });
      if (parsedChain.chainId) {
        chainDispatch({ type: "SET_STEP", index: parsedChain.stepIndex });
        chainDispatch({ type: "SET_AGE", age: parsedChain.age });
      }
    };

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [chains, loading]);

  useEffect(() => {
    if (loading) return;

    const nextSearch = formatSearch(
      state.stack,
      chainState.chainId ? chainState : undefined
    );
    if (nextSearch === lastSearchRef.current) {
      return;
    }

    const url = `${window.location.pathname}${nextSearch}${window.location.hash}`;
    window.history.replaceState({ stack: state.stack, chain: chainState }, "", url);
    lastSearchRef.current = nextSearch;
  }, [chainState, loading, state.stack]);

  if (loading) {
    return <div className="empty">Loading content...</div>;
  }

  if (loadError) {
    return <div className="empty">Failed to load content: {loadError}</div>;
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Learning Experience Engine</h1>
        <section className="domain-panel" aria-label="Domain overview">
          <div className="domain-panel__header">
            <span className="domain-panel__label">Domain overview</span>
            <strong>{hasDomains ? "Explore available domains" : "Weather Domain"}</strong>
          </div>
          <p className="domain-panel__desc">
            {hasDomains
              ? "Jump into a domain overview or pick a key topic node to explore."
              : "Explore the weather domain and jump into key topic nodes."}
          </p>
          <div className="domain-panel__grid">
            {(hasDomains ? domains : []).map((domain) => (
              <article key={domain.id} className="domain-card" style={{ borderColor: domain.color ?? undefined }}>
                <div className="domain-card__header">
                  <span className="domain-card__icon" aria-hidden="true">
                    {domain.icon ?? "📚"}
                  </span>
                  <div>
                    <div className="domain-card__title">{domain.title}</div>
                    <div className="domain-card__meta">Overview: {getTitle(nodesById[domain.overviewNodeId])}</div>
                  </div>
                </div>
                <p className="domain-card__desc">{domain.description}</p>
                <div className="domain-card__topics">
                  {domain.topicNodeIds.map((topicId: string) => (
                    <button
                      key={topicId}
                      type="button"
                      className="domain-panel__topic"
                      onClick={() => handleDomainTopicClick(topicId)}
                    >
                      {getTitle(nodesById[topicId])}
                    </button>
                  ))}
                </div>
              </article>
            ))}
            {!hasDomains ? (
              <div className="domain-panel__topics">
                {["weather", "air_pressure", "wind", "cloud", "rain", "typhoon"].map((topicId: string) => (
                  <button
                    key={topicId}
                    type="button"
                    className="domain-panel__topic"
                    onClick={() => handleDomainTopicClick(topicId)}
                  >
                    {getTitle(nodesById[topicId])}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>
        <section className="search-panel" aria-label="Content search">
          <div className="search-panel__toolbar">
            <label className="search-panel__field">
              <span className="search-panel__label">Scenario entry</span>
              <input
                type="search"
                value={scenarioQuery}
                onChange={(event) => setScenarioQuery(event.target.value)}
                placeholder={
                  searchDomain === "all"
                    ? "Describe a real-life situation..."
                    : `Describe a scenario in ${selectedDomain?.title ?? "selected domain"}...`
                }
              />
            </label>
            {scenarioQuery.trim() ? (
              <div className="search-panel__results" role="list">
                {scenarioMatches.length > 0 ? (
                  scenarioMatches.map((match) => (
                    <button
                      key={`${match.topicNodeId}-${match.chainId ?? "no-chain"}`}
                      type="button"
                      className="search-result"
                      onClick={() => handleScenarioMatchClick(match)}
                    >
                      <span className="search-result__meta">{getScenarioMeta(match)}</span>
                      <strong className="search-result__title">Confidence {Math.round(match.confidence * 100)}%</strong>
                      <span className="search-result__excerpt">{match.reasoning}</span>
                    </button>
                  ))
                ) : (
                  <div className="search-panel__empty">{scenarioStatus || "No matching scenarios yet."}</div>
                )}
              </div>
            ) : null}
          </div>
          <div className="search-panel__toolbar">
            <label className="search-panel__field">
              <span className="search-panel__label">Search content</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={
                  searchDomain === "all"
                    ? "Search nodes, chains, aliases..."
                    : `Search inside ${selectedDomain?.title ?? "selected domain"}...`
                }
              />
            </label>
            <div className="search-panel__filters" role="group" aria-label="Search kind filter">
              {[
                { label: "All", value: "all" },
                { label: "Nodes", value: "node" },
                { label: "Chains", value: "chain" }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`search-panel__filter${searchKind === option.value ? " is-active" : ""}`}
                  onClick={() => setSearchKind(option.value as "all" | "node" | "chain")}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="search-panel__filters" role="group" aria-label="Search domain filter">
              {[
                { label: "All domains", value: "all" },
                ...domains.map((domain) => ({ label: domain.title, value: domain.id }))
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`search-panel__filter${searchDomain === option.value ? " is-active" : ""}`}
                  onClick={() => setSearchDomain(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {hasSearchQuery ? (
            <div className="search-panel__results" role="list">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={`${result.kind}-${result.id}`}
                    type="button"
                    className="search-result"
                    onClick={() => handleSearchResultClick(result)}
                  >
                    <span className="search-result__meta">{getSearchResultMeta(result)}</span>
                    <strong className="search-result__title">{result.title}</strong>
                    <span className="search-result__excerpt">{result.excerpt}</span>
                  </button>
                ))
              ) : (
                <div className="search-panel__empty">{searchStatus || "No matching nodes or chains."}</div>
              )}
            </div>
          ) : null}
        </section>
        <section className="demo-presets" aria-label="Demo presets">
          <div className="demo-presets__label">Demo presets</div>
          <div className="demo-presets__list">
            {demoPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="demo-presets__button"
                onClick={() => handlePresetClick(preset)}
              >
                <span className="demo-presets__title">{preset.label}</span>
                <span className="demo-presets__desc">{preset.description}</span>
              </button>
            ))}
          </div>
        </section>
        <nav className="breadcrumb">
          {breadcrumb.map((id, index) => {
            const node = getNodeById(id, nodes);
            const isLast = index === breadcrumb.length - 1;
            return (
              <button
                key={`${id}-${index}`}
                type="button"
                className={`breadcrumb__item${isLast ? " is-active" : ""}`}
                onClick={() => handleBreadcrumbClick(index)}
              >
                {getTitle(node)}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="app__content">
        <section className="column">
          {previous ? (
            <NodeCard
              node={previous}
              nodesById={nodesById}
              onMentionClick={handleMentionClick}
              onRelationClick={handleMentionClick}
              onNodeClick={handleMentionClick}
              onNavigate={handleMentionClick}
              hasChain={chainsByTopic.has(previous.id)}
              onStartChain={() => {
                const chain = chainsByTopic.get(previous.id);
                if (chain) handleStartChain(chain.id);
              }}
              neighborhood={
                <NeighborhoodPanel
                  centerId={previous.id}
                  nodesById={nodesById}
                  onNavigate={handleMentionClick}
                />
              }
            />
          ) : (
            <div className="empty">No node</div>
          )}
        </section>
        <section className="column">
          {breadcrumb.length >= 2 && current ? (
            <>
              <NodeCard
                node={current}
                nodesById={nodesById}
                onMentionClick={handleMentionClick}
                onRelationClick={handleMentionClick}
                onNodeClick={handleMentionClick}
                onNavigate={handleMentionClick}
                hasChain={chainsByTopic.has(current.id)}
                onStartChain={() => {
                  const chain = chainsByTopic.get(current.id);
                  if (chain) handleStartChain(chain.id);
                }}
                neighborhood={
                  <NeighborhoodPanel
                    centerId={current.id}
                    nodesById={nodesById}
                    onNavigate={handleMentionClick}
                  />
                }
              />
              {activeChain ? (
                <QuestionChainPanel
                  chain={activeChain}
                  state={chainState}
                  dispatch={chainDispatch}
                  onMentionNavigate={handleMentionClick}
                  nodesById={nodesById}
                />
              ) : null}
            </>
          ) : (
            <>
              <div className="empty">点击左侧术语以展开</div>
              {activeChain ? (
                <QuestionChainPanel
                  chain={activeChain}
                  state={chainState}
                  dispatch={chainDispatch}
                  onMentionNavigate={handleMentionClick}
                  nodesById={nodesById}
                />
              ) : null}
            </>
          )}
        </section>
      </main>
    </div>
  );
};
