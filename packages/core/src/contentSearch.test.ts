import { describe, expect, it } from "vitest";
import { getChain, getNode, listChains, listNodes, searchContent } from "./contentSearch";

describe("content search", () => {
  it("lists nodes and chains from bundled examples", () => {
    expect(listNodes().length).toBeGreaterThan(0);
    expect(listChains().length).toBeGreaterThan(0);
  });

  it("gets single nodes and chains by id", () => {
    expect(getNode("weather")?.title).toBe("天气");
    expect(getChain("weather_intro")?.title).toContain("天气");
  });

  it("finds node matches by title and alias", () => {
    const byTitle = searchContent("天气", { kinds: ["node"] });
    const byAlias = searchContent("大气压", { kinds: ["node"] });

    expect(byTitle[0]).toMatchObject({ kind: "node", id: "weather" });
    expect(byAlias[0]).toMatchObject({ kind: "node", id: "air_pressure" });
  });

  it("finds chains by title and question text", () => {
    const byTitle = searchContent("台风来了怎么办", { kinds: ["chain"] });
    const byQuestion = searchContent("青春期更容易长痘", { kinds: ["chain"] });

    expect(byTitle[0]).toMatchObject({ kind: "chain", id: "typhoon_safety" });
    expect(byQuestion[0]).toMatchObject({ kind: "chain", id: "acne_why" });
  });

  it("supports topic-scoped chain filtering", () => {
    const results = searchContent("台风", { kinds: ["chain"], topicNodeId: "weather" });
    expect(results.some((result) => result.id === "typhoon_safety")).toBe(true);
    expect(results.every((result) => result.kind === "chain" && result.topicNodeId === "weather")).toBe(true);
  });

  it("supports domain-scoped chain filtering", () => {
    const results = searchContent("台风", { kinds: ["chain"], domainId: "weather_domain" });
    expect(results.some((result) => result.id === "typhoon_safety")).toBe(true);
  });

  it("scopes node matches by domain", () => {
    const results = searchContent("细胞", { kinds: ["node"], domainId: "plant_cell_domain" });
    expect(results.some((result) => result.id === "plant_cell")).toBe(true);
    expect(results.every((result) => result.kind === "node")).toBe(true);
  });

  it("returns mixed node and chain matches", () => {
    const results = searchContent("台风");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.kind === "node" && result.id === "typhoon")).toBe(true);
    expect(results.some((result) => result.kind === "chain" && result.id === "typhoon_safety")).toBe(true);
  });

  it("returns empty results for blank query", () => {
    expect(searchContent("   ")).toEqual([]);
  });
});
