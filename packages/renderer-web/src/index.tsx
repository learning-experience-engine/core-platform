import type { NodeId, QuestionChainAction, QuestionChainState } from "@lxp/core";
import type {
  AgeBand,
  ChainStep,
  Facet,
  LocalizedText,
  Node,
  QuestionChain,
  RelationType
} from "@lxp/schema";
import { groupRelationsByFacet, type RelationView } from "@lxp/core";
import { getNeighborhood, type NeighborhoodFacet } from "@lxp/graph";
import React from "react";

export type NodeCardProps = {
  node: Node;
  nodesById: Record<string, Node>;
  onMentionClick?: (nodeId: string) => void;
  onRelationClick?: (nodeId: string) => void;
  onNodeClick?: (nodeId: string) => void;
  onNavigate?: (nodeId: string) => void;
  neighborhood?: React.ReactNode;
  onStartChain?: () => void;
  hasChain?: boolean;
};

export type QuestionChainPanelProps = {
  chain: QuestionChain;
  state: QuestionChainState;
  dispatch: (action: QuestionChainAction) => void;
  onMentionNavigate?: (nodeId: string) => void;
  nodesById?: Record<string, Node>;
};

type RelationDockProps = {
  node: Node;
  nodesById: Record<string, Node>;
  onNavigate?: (nodeId: string) => void;
};

type GraphMiniProps = {
  centerId: NodeId;
  nodesById: Record<NodeId, Node>;
  facet: NeighborhoodFacet;
  view: "graph" | "list";
  onNavigate?: (nodeId: NodeId) => void;
};

const FACETS: Facet[] = ["what", "how", "in_life", "compare", "practice"];
const RELATION_TYPES: RelationType[] = ["part_of", "has_part", "compare_with", "related"];

const FACET_LABELS: Record<Facet, string> = {
  what: "是什么",
  how: "怎么实现",
  in_life: "生活体现",
  compare: "差异对比",
  practice: "动手实践"
};

const TYPE_LABELS: Record<RelationType, string> = {
  part_of: "结构",
  has_part: "结构",
  compare_with: "对比",
  related: "关联"
};

const isDev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV ?? false;

const getMissingMentions = (
  mentions: Record<string, string> | undefined,
  nodesById: Record<string, Node> | undefined
): string[] => {
  if (!isDev || !mentions || !nodesById) return [];
  return Object.values(mentions).filter((targetId) => !nodesById[targetId]);
};

const getMissingRelations = (node: Node, nodesById: Record<string, Node>): string[] => {
  if (!isDev) return [];
  return node.relations.map((rel) => rel.to).filter((targetId) => !nodesById[targetId]);
};

const DevWarning: React.FC<{ title: string; items: string[] }> = ({ title, items }) => {
  if (!isDev || items.length === 0) return null;
  return (
    <div className="dev-warning" role="status" aria-live="polite">
      <strong>{title}</strong>
      <span>Missing nodeId:</span>
      <span>{items.join(", ")}</span>
    </div>
  );
};

const warnOnUnknown = (relations: RelationView[]) => {
  if (!isDev) return;
  relations.forEach((rel) => {
    if (!FACETS.includes(rel.facet)) {
      console.warn("[renderer-web] Unknown facet:", rel.facet, rel);
    }
    if (!RELATION_TYPES.includes(rel.type)) {
      console.warn("[renderer-web] Unknown relation type:", rel.type, rel);
    }
  });
};

const groupByType = (relations: RelationView[]) => {
  const grouped = new Map<RelationType, RelationView[]>();
  relations.forEach((relation) => {
    if (!grouped.has(relation.type)) {
      grouped.set(relation.type, []);
    }
    grouped.get(relation.type)?.push(relation);
  });
  return grouped;
};

export const RelationDock: React.FC<RelationDockProps> = ({ node, nodesById, onNavigate }) => {
  const missingRelations = React.useMemo(
    () => getMissingRelations(node, nodesById),
    [node, nodesById]
  );
  const grouped = React.useMemo(
    () => groupRelationsByFacet(node, nodesById),
    [node, nodesById]
  );

  const facetsWithContent = React.useMemo(
    () => FACETS.filter((facet) => grouped[facet].length > 0),
    [grouped]
  );

  const [activeFacet, setActiveFacet] = React.useState<Facet>(
    facetsWithContent[0] ?? FACETS[0]
  );

  React.useEffect(() => {
    if (!facetsWithContent.includes(activeFacet)) {
      setActiveFacet(facetsWithContent[0] ?? FACETS[0]);
    }
  }, [activeFacet, facetsWithContent]);

  const activeRelations = grouped[activeFacet];
  warnOnUnknown(activeRelations);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key != "ArrowLeft" && event.key != "ArrowRight") return;
    event.preventDefault();
    const currentIndex = FACETS.indexOf(activeFacet);
    const delta = event.key == "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + delta + FACETS.length) % FACETS.length;
    setActiveFacet(FACETS[nextIndex]);
  };

  return (
    <div className="relation-dock">
      <DevWarning title="Dev warning (relations)" items={missingRelations} />
      <div
        className="relation-dock__tabs"
        role="tablist"
        aria-label="Facet tabs"
        onKeyDown={handleKeyDown}
      >
        {FACETS.map((facet) => (
          <button
            key={facet}
            type="button"
            role="tab"
            aria-selected={activeFacet === facet}
            tabIndex={activeFacet === facet ? 0 : -1}
            className={`relation-dock__tab${activeFacet === facet ? " is-active" : ""}`}
            onClick={() => setActiveFacet(facet)}
          >
            {FACET_LABELS[facet]}
          </button>
        ))}
      </div>
      {activeRelations.length === 0 ? (
        <p className="node-card__empty">暂无内容（欢迎贡献）</p>
      ) : (
        <div className="relation-dock__list">
          {[...groupByType(activeRelations).entries()].map(([type, items]) => (
            <div key={type} className="relation-dock__group">
              <h5>{TYPE_LABELS[type]}</h5>
              <ul>
                {items.map((rel, index) => (
                  <li key={`${rel.to}-${index}`}>
                    <button
                      type="button"
                      className="relation-link"
                      onClick={() => onNavigate?.(rel.to)}
                    >
                      {rel.label ?? rel.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const GraphMini: React.FC<GraphMiniProps> = ({
  centerId,
  nodesById,
  facet,
  view,
  onNavigate
}) => {
  const neighborhood = React.useMemo(
    () => getNeighborhood(centerId, nodesById, facet),
    [centerId, nodesById, facet]
  );

  if (view === "list") {
    return (
      <section className="graph-mini" aria-label="Neighborhood list">
        <ul className="graph-mini__list">
          {neighborhood.nodes.map((node) => (
            <li key={node.id}>
              <button
                type="button"
                className="graph-mini__chip"
                onClick={() => onNavigate?.(node.id)}
              >
                {node.title}
              </button>
            </li>
          ))}
          {neighborhood.truncated ? (
            <li className="graph-mini__more">More neighbors not shown</li>
          ) : null}
        </ul>
      </section>
    );
  }

  return (
    <section className="graph-mini" aria-label="Neighborhood graph">
      <div className="graph-mini__graph" role="group" aria-label="Neighborhood layout">
        <button
          type="button"
          className="graph-mini__center"
          onClick={() => onNavigate?.(centerId)}
        >
          {neighborhood.center.title}
        </button>
        <div className="graph-mini__neighbors">
          {neighborhood.nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              className="graph-mini__chip"
              onClick={() => onNavigate?.(node.id)}
            >
              {node.title}
            </button>
          ))}
        </div>
      </div>
      {neighborhood.truncated ? (
        <p className="graph-mini__more">More neighbors not shown</p>
      ) : null}
    </section>
  );
};

const renderBody = (
  body: LocalizedText,
  mentions: Record<string, string>,
  onMentionClick?: (nodeId: string) => void
): React.ReactNode[] => {
  const bodyText = (() => {
    if (typeof body === "string") return body;
    if (body.zh) return body.zh ?? "";
    const first = Object.values(body)[0];
    return first ?? "";
  })();
  const parts: React.ReactNode[] = [];
  const regex = /\[(.+?)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(bodyText))) {
    const [raw, term] = match;
    const start = match.index;
    const end = start + raw.length;

    if (start > lastIndex) {
      parts.push(bodyText.slice(lastIndex, start));
    }

    const targetId = mentions[term];
    if (targetId && onMentionClick) {
      parts.push(
        <button
          key={`${term}-${start}`}
          type="button"
          className="mention"
          onClick={() => onMentionClick(targetId)}
        >
          {term}
        </button>
      );
    } else {
      parts.push(term);
    }

    lastIndex = end;
  }

  if (lastIndex < bodyText.length) {
    parts.push(bodyText.slice(lastIndex));
  }

  return parts;
};

const renderMentions = (
  text: string,
  mentions: Record<string, string> | undefined,
  onMentionClick?: (nodeId: string) => void
): React.ReactNode[] => {
  if (!mentions || Object.keys(mentions).length === 0) {
    return [text];
  }

  const terms = Object.keys(mentions).sort((a, b) => b.length - a.length);
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = text.split(regex).filter(Boolean);

  return parts.map((part, index) => {
    const targetId = mentions[part];
    if (targetId && onMentionClick) {
      return (
        <button
          key={`${part}-${index}`}
          type="button"
          className="mention"
          onClick={() => onMentionClick(targetId)}
        >
          {part}
        </button>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
};

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  nodesById,
  onMentionClick,
  onRelationClick,
  onNodeClick,
  onNavigate,
  neighborhood,
  onStartChain,
  hasChain
}) => {
  const handleNavigate = onNavigate ?? onRelationClick ?? onNodeClick;
  const missingMentions = React.useMemo(
    () => getMissingMentions(node.mentions, nodesById),
    [node.mentions, nodesById]
  );

  return (
    <article className="node-card">
      <header className="node-card__header">
        <h2>{node.title}</h2>
      </header>
      <DevWarning title="Dev warning (mentions)" items={missingMentions} />
      <p className="node-card__body">{renderBody(node.body, node.mentions, onMentionClick)}</p>
      <footer className="node-card__footer">
        {hasChain ? (
          <div className="node-card__chain">
            <button type="button" className="chain-start" onClick={onStartChain}>
              开始问题链
            </button>
          </div>
        ) : null}
        <div className="node-card__relations">
          <h3>关系</h3>
          <RelationDock node={node} nodesById={nodesById} onNavigate={handleNavigate} />
        </div>
        {neighborhood ? (
          <div className="node-card__graph">
            <h3>邻域</h3>
            {neighborhood}
          </div>
        ) : null}
      </footer>
    </article>
  );
};

const getStep = (chain: QuestionChain, index: number): ChainStep | undefined => {
  if (!chain.steps.length) return undefined;
  if (index < 0) return chain.steps[0];
  if (index >= chain.steps.length) return chain.steps[chain.steps.length - 1];
  return chain.steps[index];
};

const AGE_LABELS: Record<AgeBand, string> = {
  child: "儿童",
  adult: "成人"
};

export const QuestionChainPanel: React.FC<QuestionChainPanelProps> = ({
  chain,
  state,
  dispatch,
  onMentionNavigate,
  nodesById
}) => {
  const total = chain.steps.length;
  const currentIndex = total === 0 ? 0 : Math.min(Math.max(state.stepIndex, 0), total - 1);
  const step = getStep(chain, currentIndex);
  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= total - 1;
  const progress = total === 0 ? 0 : (currentIndex + 1) / total;
  const missingMentions = React.useMemo(
    () => getMissingMentions(step?.mentions, nodesById),
    [step?.mentions, nodesById]
  );

  if (!step) {
    return (
      <section className="question-chain">
        <div className="question-chain__empty">No steps in chain.</div>
      </section>
    );
  }

  return (
    <section className="question-chain">
      <header className="question-chain__header">
        <div>
          <p className="question-chain__kicker">问题链</p>
          <h3>{chain.title}</h3>
          <div className="question-chain__progress" aria-hidden="true">
            <div
              className="question-chain__progress-bar"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
        <div className="question-chain__actions">
          <button
            type="button"
            className="question-chain__exit"
            onClick={() => dispatch({ type: "EXIT" })}
          >
            退出
          </button>
          <div className="question-chain__ages" role="group" aria-label="Age switch">
            {(Object.keys(AGE_LABELS) as AgeBand[]).map((age) => (
              <button
                key={age}
                type="button"
                className={`question-chain__age${state.age === age ? " is-active" : ""}`}
                onClick={() => dispatch({ type: "SET_AGE", age })}
              >
                {AGE_LABELS[age]}
              </button>
            ))}
          </div>
        </div>
      </header>
      <DevWarning title="Dev warning (chain mentions)" items={missingMentions} />
      <div className="question-chain__body">
        <p className="question-chain__step">
          Step {currentIndex + 1} · {step.id}
        </p>
        <h4>{step.question}</h4>
        <p>{renderMentions(step.answers[state.age], step.mentions, onMentionNavigate)}</p>
      </div>
      <footer className="question-chain__footer">
        <div className="question-chain__controls">
          <button
            type="button"
            className="question-chain__nav"
            onClick={() => dispatch({ type: "PREV" })}
            disabled={isFirst}
          >
            上一步
          </button>
          <button
            type="button"
            className="question-chain__nav"
            onClick={() => dispatch({ type: "NEXT" })}
            disabled={isLast}
          >
            下一步
          </button>
        </div>
        <div className="question-chain__indicator">
          {currentIndex + 1}/{total}
        </div>
      </footer>
    </section>
  );
};
