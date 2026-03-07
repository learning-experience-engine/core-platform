import { describe, expect, it } from "vitest";
import { parseLintResult } from "./parsing";
import type { LintApiResponse } from "./types";

describe("parseLintResult", () => {
  it("parses valid JSON lint payloads", () => {
    const payload: LintApiResponse = {
      format: "json",
      stdout: JSON.stringify({
        errors: [{ level: "error", code: "E", message: "bad" }],
        warnings: [{ level: "warn", code: "W", message: "warn" }]
      })
    };

    expect(parseLintResult(payload)).toEqual({
      errors: [{ level: "error", code: "E", message: "bad" }],
      warnings: [{ level: "warn", code: "W", message: "warn" }]
    });
  });

  it("returns null for non-json format", () => {
    expect(parseLintResult({ format: "text", stdout: "oops" })).toBeNull();
  });

  it("returns null for malformed payload shape", () => {
    expect(parseLintResult({ format: "json", stdout: JSON.stringify({ errors: [] }) })).toBeNull();
  });
});
