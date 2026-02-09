import { describe, expect, it } from "vitest";
import type { Node } from "@lxp/schema";
import { formatJson, formatMessages, lintNodes } from "./index";

describe("formatters", () => {
  it("keeps text output as the default view", () => {
    const nodes: Node[] = [
      {
        id: "a",
        title: "A",
        body: "",
        mentions: {},
        relations: []
      }
    ];

    const result = lintNodes(nodes);
    const lines = formatMessages(result);

    expect(lines[0]).toContain("[WARN]");
  });

  it("formats JSON output with errors and warnings", () => {
    const nodes: Node[] = [
      {
        id: "a",
        title: "A",
        body: "",
        mentions: {},
        relations: [
          {
            type: "part_of",
            facet: "what",
            to: "missing"
          }
        ]
      }
    ];

    const result = lintNodes(nodes);
    const payload = JSON.parse(formatJson(result)) as {
      errors: Array<Record<string, unknown>>;
      warnings: Array<Record<string, unknown>>;
    };

    expect(payload.errors.length).toBeGreaterThan(0);
    expect(payload.warnings.length).toBeGreaterThanOrEqual(0);
  });
});
