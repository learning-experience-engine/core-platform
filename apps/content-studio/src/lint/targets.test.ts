import { describe, expect, it } from "vitest";
import {
  buildChainMentionPath,
  buildLintFallbackPaths,
  buildLintTargetKey,
  buildNodeMentionPath,
  formatLintMessage
} from "./targets";

describe("lint target helpers", () => {
  it("builds stable target keys", () => {
    expect(buildLintTargetKey("node", "earth", "mentions[\"Moon\"]")).toBe(
      "node:earth:mentions%5B%22Moon%22%5D"
    );
  });

  it("builds mention paths for nodes and chains", () => {
    expect(buildNodeMentionPath("Moon")).toBe('mentions["Moon"]');
    expect(buildChainMentionPath(2, "Moon")).toBe('steps[2].mentions["Moon"]');
  });

  it("returns fallback paths for step mentions and relations", () => {
    expect(buildLintFallbackPaths('steps[1].mentions["Moon"]', "topicNodeId")).toEqual([
      'steps[1].mentions["Moon"]',
      "steps[1].mentions",
      "steps[1]",
      "topicNodeId"
    ]);

    expect(buildLintFallbackPaths("relations[0].to", "title")).toEqual([
      "relations[0].to",
      "relations[0]",
      "title"
    ]);
  });

  it("strips severity prefixes from lint messages", () => {
    expect(formatLintMessage({ level: "error", code: "E", message: "[ERROR] bad field" })).toBe(
      "bad field"
    );
    expect(formatLintMessage({ level: "warn", code: "W", message: "plain warning" })).toBe(
      "plain warning"
    );
  });
});
