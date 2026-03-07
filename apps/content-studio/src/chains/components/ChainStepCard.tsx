import type { Node } from "@lxp/schema";
import { AGE_BANDS } from "../../constants";
import { buildMentionSuggestions } from "../../nodes/mentions";
import { buildChainMentionPath, buildLintTargetKey, formatLintMessage } from "../../lint/targets";
import type { LintIssue } from "../../lint/types";
import type { DraftStep } from "../../types";
import { classNames } from "../../utils/classNames";
import { makeId } from "../../utils/ids";

type ChainStepCardProps = {
  chainId: string;
  step: DraftStep;
  index: number;
  nodes: Node[];
  lintFocusTarget: string;
  getLintIssuesForTarget: (key: string) => LintIssue[];
  registerLintTarget: (key: string) => (node: HTMLElement | null) => void;
  onChange: (next: DraftStep) => void;
  onRemove: () => void;
};

export function ChainStepCard({
  chainId,
  step,
  index,
  nodes,
  lintFocusTarget,
  getLintIssuesForTarget,
  registerLintTarget,
  onChange,
  onRemove
}: ChainStepCardProps) {
  const stepTarget = buildLintTargetKey("chain", chainId, `steps[${index}]`);
  const questionTarget = buildLintTargetKey("chain", chainId, `steps[${index}].question`);
  const answerTarget = (age: (typeof AGE_BANDS)[number]) =>
    buildLintTargetKey("chain", chainId, `steps[${index}].answers.${age}`);
  const stepMentionsTarget = buildLintTargetKey("chain", chainId, `steps[${index}].mentions`);
  const stepSuggestions = buildMentionSuggestions(
    `${step.answers.child}\n${step.answers.adult}`,
    nodes,
    step.mentions
  ).slice(0, 10);
  const quickCheck = step.check;

  return (
    <div
      className={classNames("step-card", lintFocusTarget === stepTarget && "lint-focus")}
      data-lint-target={stepTarget}
      ref={registerLintTarget(stepTarget)}
      tabIndex={-1}
    >
      <div className="step-card__header">
        <div>
          <strong>{step.id}</strong>
          <span>Step {index + 1}</span>
        </div>
        <button type="button" className="button button--ghost" onClick={onRemove}>
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
          onChange={(event) => onChange({ ...step, question: event.target.value })}
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
                getLintIssuesForTarget(answerTarget(age)).length > 0 && "input--error",
                lintFocusTarget === answerTarget(age) && "input--lint-focus"
              )}
              onChange={(event) =>
                onChange({
                  ...step,
                  answers: {
                    ...step.answers,
                    [age]: event.target.value
                  }
                })
              }
            />
            {getLintIssuesForTarget(answerTarget(age)).length > 0 && (
              <span className="form__hint form__hint--error">
                {formatLintMessage(getLintIssuesForTarget(answerTarget(age))[0])}
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
                  onChange({
                    ...step,
                    summary: {
                      ...step.summary,
                      [age]: event.target.value
                    }
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
          {quickCheck ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => onChange({ ...step, check: null })}
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              className="button button--ghost"
              onClick={() =>
                onChange({
                  ...step,
                  check: {
                    question: "",
                    options: ["", ""],
                    answerIndex: 0,
                    explanation: { child: "", adult: "" }
                  }
                })
              }
            >
              Add
            </button>
          )}
        </div>
        {quickCheck ? (
          <>
            <label>
              <span>Question</span>
              <input
                value={quickCheck.question}
                onChange={(event) =>
                  onChange({
                    ...step,
                    check: {
                      ...quickCheck,
                      question: event.target.value
                    }
                  })
                }
              />
            </label>
            <div className="grid">
              {quickCheck.options.map((option, optionIndex) => (
                <div key={`${step.id}-opt-${optionIndex}`} className="grid__row">
                  <input
                    type="radio"
                    name={`answer-${step.id}`}
                    checked={quickCheck.answerIndex === optionIndex}
                    onChange={() =>
                      onChange({
                        ...step,
                        check: {
                          ...quickCheck,
                          answerIndex: optionIndex
                        }
                      })
                    }
                  />
                  <input
                    placeholder={`Option ${optionIndex + 1}`}
                    value={option}
                    onChange={(event) =>
                      onChange({
                        ...step,
                        check: {
                          ...quickCheck,
                          options: quickCheck.options.map((value, index) =>
                            index === optionIndex ? event.target.value : value
                          )
                        }
                      })
                    }
                  />
                  <button
                    type="button"
                    className="button button--ghost"
                    disabled={quickCheck.options.length <= 2}
                    onClick={() => {
                      const nextOptions = quickCheck.options.filter((_, index) => index !== optionIndex);
                      let nextAnswerIndex = quickCheck.answerIndex;
                      if (optionIndex === nextAnswerIndex) {
                        nextAnswerIndex = 0;
                      } else if (optionIndex < nextAnswerIndex) {
                        nextAnswerIndex -= 1;
                      }
                      onChange({
                        ...step,
                        check: {
                          ...quickCheck,
                          options: nextOptions,
                          answerIndex: nextAnswerIndex
                        }
                      });
                    }}
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
                onChange({
                  ...step,
                  check: {
                    ...quickCheck,
                    options: [...quickCheck.options, ""]
                  }
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
                    value={quickCheck.explanation[age]}
                    onChange={(event) =>
                      onChange({
                        ...step,
                        check: {
                          ...quickCheck,
                          explanation: {
                            ...quickCheck.explanation,
                            [age]: event.target.value
                          }
                        }
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
              <div key={`${step.id}-${suggestion.term}-${suggestion.targetId}`} className="suggestion">
                <div>
                  <strong>{suggestion.term}</strong>
                  <span>→ {suggestion.targetTitle}</span>
                </div>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() =>
                    onChange({
                      ...step,
                      mentions: [
                        ...step.mentions,
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
          <h4>Mentions</h4>
          <button
            type="button"
            className="button button--ghost"
            onClick={() =>
              onChange({
                ...step,
                mentions: [...step.mentions, { id: makeId(), term: "", targetId: "" }]
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
              const mentionPath = row.term ? buildChainMentionPath(index, row.term) : "";
              const mentionTarget = buildLintTargetKey("chain", chainId, mentionPath);
              const mentionIssues = mentionPath ? getLintIssuesForTarget(mentionTarget) : [];
              return (
                <div key={row.id}>
                  <div className="grid__row">
                    <input
                      placeholder="Term"
                      value={row.term}
                      className={classNames(
                        mentionIssues.length > 0 && "input--error",
                        lintFocusTarget === mentionTarget && "input--lint-focus"
                      )}
                      onChange={(event) =>
                        onChange({
                          ...step,
                          mentions: step.mentions.map((mention) =>
                            mention.id === row.id ? { ...mention, term: event.target.value } : mention
                          )
                        })
                      }
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
                      onChange={(event) =>
                        onChange({
                          ...step,
                          mentions: step.mentions.map((mention) =>
                            mention.id === row.id
                              ? { ...mention, targetId: event.target.value }
                              : mention
                          )
                        })
                      }
                    />
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() =>
                        onChange({
                          ...step,
                          mentions: step.mentions.filter((mention) => mention.id !== row.id)
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
