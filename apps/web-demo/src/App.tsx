import { useEffect, useMemo, useReducer, useRef, type ReactElement } from "react";
import {
  getNodeById,
  loadExamples,
  loadExampleChains,
  reduceCardStack,
  setStack,
  push,
  getTop,
  getPrev,
  getBreadcrumb,
  DEFAULT_ROOT_ID,
  createQuestionChainState,
  reduceQuestionChain,
  type Node,
  type CardStackState,
  type QuestionChainState,
  type QuestionChainAction
} from "@lxp/core";
import { GraphMini, NodeCard, QuestionChainPanel } from "@lxp/renderer-web";
import "./styles.css";
import { formatSearch, parseChainFromLocation, parseStackFromLocation } from "./urlStack";
import type { Facet, QuestionChain } from "@lxp/schema";

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
  const nodes = useMemo(() => loadExamples(), []);
  const chains = useMemo(() => loadExampleChains(), []);
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
    () => {
      const parsed = parseChainFromLocation(
        window.location.search,
        new Set(chains.map((chain) => chain.id))
      );
      const initialChain = chainsById[parsed.chainId];
      return createQuestionChainState(
        {
          stepCount: initialChain?.steps.length ?? 0,
          defaultAge: "child",
          defaultChainId: ""
        },
        parsed
      );
    }
  );
  const lastSearchRef = useRef<string>("");

  const currentId = getTop(state) ?? DEFAULT_ROOT_ID;
  const prevId = getPrev(state) ?? currentId;
  const current = getNodeById(currentId, nodes);
  const previous = getNodeById(prevId, nodes);
  const breadcrumb = getBreadcrumb(state);
  const activeChain = chainState.chainId ? chainsById[chainState.chainId] : undefined;
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

  useEffect(() => {
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
  }, [chains]);

  useEffect(() => {
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
  }, [state.stack, chainState]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Learning Experience Engine</h1>
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
