import { describe, expect, it } from "vitest";
import { matchScenarios } from "./scenarioMatcher";

describe("scenario matcher", () => {
  it("matches weather scenarios to weather content", () => {
    const results = matchScenarios("明天出门怕台风下大雨", { limit: 3 });
    expect(results[0]?.topicNodeId).toBe("weather");
    expect(results.some((result) => result.chainId === "typhoon_safety")).toBe(true);
  });

  it("matches skin scenarios to skin chains", () => {
    const results = matchScenarios("最近总长痘，护肤该怎么做", { limit: 3 });
    expect(results[0]?.topicNodeId).toBe("skin");
    expect(results.some((result) => result.chainId === "acne_why")).toBe(true);
  });

  it("returns empty for blank input", () => {
    expect(matchScenarios("   ")).toEqual([]);
  });
});
