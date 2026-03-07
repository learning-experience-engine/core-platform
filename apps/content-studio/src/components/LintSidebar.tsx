import type { FC } from "react";
import { classNames } from "../utils/classNames";
import { formatLintMessage } from "../lint/targets";
import type { LintIssue, LintResult } from "../lint/types";

type LintSidebarProps = {
  lintResult: LintResult;
  lintIssues: LintIssue[];
  lintStatus: string;
  lintNeedsBuild: boolean;
  onRunLint: () => void;
  onBuildLinter: () => void;
  onIssueClick: (issue: LintIssue) => void;
};

export const LintSidebar: FC<LintSidebarProps> = ({
  lintResult,
  lintIssues,
  lintStatus,
  lintNeedsBuild,
  onRunLint,
  onBuildLinter,
  onIssueClick
}) => {
  return (
    <aside className="studio__panel studio__panel--lint">
      <div className="panel__header">
        <h2>Lint Results</h2>
        <button type="button" className="button" onClick={onRunLint}>
          Run content lint
        </button>
      </div>
      <div className="lint__summary">
        <span className="lint__badge lint__badge--error">Errors {lintResult.errors.length}</span>
        <span className="lint__badge lint__badge--warn">Warnings {lintResult.warnings.length}</span>
      </div>
      <p className="panel__status">{lintStatus}</p>
      {lintNeedsBuild && (
        <div className="lint__build">
          <p className="form__hint form__hint--error">
            Content linter 未构建。请先执行 `pnpm -r build`，或点击按钮构建。
          </p>
          <button type="button" className="button button--ghost" onClick={onBuildLinter}>
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
                onClick={() => onIssueClick(issue)}
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
  );
};
