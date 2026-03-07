import type { FC } from "react";
import type { Node, QuestionChain } from "@lxp/schema";
import type { Mode } from "../types";

type ContentListPanelProps = {
  mode: Mode;
  filteredNodes: Node[];
  filteredChains: QuestionChain[];
  selectedId: string;
  selectedChainId: string;
  search: string;
  chainSearch: string;
  onSearchChange: (value: string) => void;
  onChainSearchChange: (value: string) => void;
  onSelectNode: (id: string) => void;
  onSelectChain: (id: string) => void;
  onNewNode: () => void;
  onNewChain: () => void;
};

export const ContentListPanel: FC<ContentListPanelProps> = ({
  mode,
  filteredNodes,
  filteredChains,
  selectedId,
  selectedChainId,
  search,
  chainSearch,
  onSearchChange,
  onChainSearchChange,
  onSelectNode,
  onSelectChain,
  onNewNode,
  onNewChain
}) => {
  return (
    <aside className="studio__panel studio__panel--list">
      <div className="panel__header">
        <h2>{mode === "nodes" ? "Nodes" : "Chains"}</h2>
        <span className="panel__badge">{mode === "nodes" ? filteredNodes.length : filteredChains.length}</span>
      </div>
      <input
        className="panel__search"
        placeholder="Search by id or title"
        value={mode === "nodes" ? search : chainSearch}
        onChange={(event) =>
          mode === "nodes"
            ? onSearchChange(event.target.value)
            : onChainSearchChange(event.target.value)
        }
      />
      <div className="panel__actions">
        {mode === "nodes" ? (
          <button type="button" className="button button--ghost" onClick={onNewNode}>
            New Node
          </button>
        ) : (
          <button type="button" className="button button--ghost" onClick={onNewChain}>
            New Chain
          </button>
        )}
      </div>
      <div className="panel__list">
        {mode === "nodes"
          ? filteredNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className={`node-row${node.id === selectedId ? " is-active" : ""}`}
                onClick={() => onSelectNode(node.id)}
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
                onClick={() => onSelectChain(chain.id)}
              >
                <div>
                  <strong>{chain.title}</strong>
                  <span>{chain.id}</span>
                </div>
              </button>
            ))}
      </div>
    </aside>
  );
};
