import type { NodeId } from "@lxp/core";
import type { Facet, Node, RelationType } from "@lxp/schema";
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

  if (node.relations.length === 0) {
    return <p className="node-card__empty">No relations</p>;
  }

  return (
    <div className="relation-dock">
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
        <p className="node-card__empty">No relations</p>
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
            <li className="graph-mini__more">+ more neighbors not shown</li>
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
        <p className="graph-mini__more">+ more neighbors not shown</p>
      ) : null}
    </section>
  );
};

const renderBody = (
  body: string,
  mentions: Record<string, string>,
  onMentionClick?: (nodeId: string) => void
): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  const regex = /\[(.+?)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body))) {
    const [raw, term] = match;
    const start = match.index;
    const end = start + raw.length;

    if (start > lastIndex) {
      parts.push(body.slice(lastIndex, start));
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

  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex));
  }

  return parts;
};

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  nodesById,
  onMentionClick,
  onRelationClick,
  onNodeClick,
  onNavigate,
  neighborhood
}) => {
  const handleNavigate = onNavigate ?? onRelationClick ?? onNodeClick;

  return (
    <article className="node-card">
      <header className="node-card__header">
        <h2>{node.title}</h2>
      </header>
      <p className="node-card__body">{renderBody(node.body, node.mentions, onMentionClick)}</p>
      <footer className="node-card__footer">
        <div className="node-card__relations">
          <h3>Relations</h3>
          <RelationDock node={node} nodesById={nodesById} onNavigate={handleNavigate} />
        </div>
        {neighborhood ? (
          <div className="node-card__graph">
            <h3>Neighborhood</h3>
            {neighborhood}
          </div>
        ) : null}
      </footer>
    </article>
  );
};
