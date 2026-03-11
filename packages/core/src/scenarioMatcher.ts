import { listChains, listNodes } from "./contentSearch.js";
import { loadExampleDomains } from "./examples.js";

export type ScenarioMatch = {
  topicNodeId: string;
  chainId?: string;
  confidence: number;
  reasoning: string;
};

export type ScenarioMatchOptions = {
  limit?: number;
  domainId?: string;
};

const normalize = (value: string): string => value.trim().toLowerCase();

const SCENARIO_RULES = [
  {
    topicNodeId: "weather",
    chainId: "typhoon_safety",
    keywords: ["台风", "暴雨", "下雨", "天气", "出门", "预警"],
    reasoning: "关键词命中天气风险与出行场景"
  },
  {
    topicNodeId: "skin",
    chainId: "acne_why",
    keywords: ["长痘", "痘痘", "出油", "护肤", "毛孔"],
    reasoning: "关键词命中皮肤状态与痘痘护理场景"
  },
  {
    topicNodeId: "skin",
    chainId: "sun_tan_uv",
    keywords: ["晒黑", "晒伤", "防晒", "紫外线", "太阳"],
    reasoning: "关键词命中紫外线暴露与防晒场景"
  },
  {
    topicNodeId: "plant_cell",
    chainId: "plant_cell_intro",
    keywords: ["植物细胞", "细胞壁", "原生质体", "细胞膜"],
    reasoning: "关键词命中植物细胞基础结构场景"
  }
] as const;

export const matchScenarios = (
  rawInput: string,
  options: ScenarioMatchOptions = {}
): ScenarioMatch[] => {
  const input = normalize(rawInput);
  if (!input) return [];

  const availableTopics = new Set(listNodes().map((node) => node.id));
  const availableChains = new Set(listChains().map((chain) => chain.id));
  const domainTopics = options.domainId
    ? new Set(
        loadExampleDomains()
          .find((domain) => domain.id === options.domainId)
          ?.topicNodeIds ?? []
      )
    : undefined;

  const scored = SCENARIO_RULES.map((rule) => {
    const matches = rule.keywords.filter((keyword) => input.includes(normalize(keyword)));
    const score = matches.length / rule.keywords.length;
    return { rule, matches, score };
  })
    .filter((entry) => entry.matches.length > 0)
    .filter((entry) => availableTopics.has(entry.rule.topicNodeId))
    .filter((entry) => !entry.rule.chainId || availableChains.has(entry.rule.chainId))
    .filter((entry) => (!domainTopics ? true : domainTopics.has(entry.rule.topicNodeId)));

  const limit = options.limit ?? 5;
  return scored
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ rule, matches, score }) => ({
      topicNodeId: rule.topicNodeId,
      chainId: rule.chainId,
      confidence: Number(Math.min(0.98, 0.45 + score * 0.5).toFixed(2)),
      reasoning: `${rule.reasoning}：${matches.join("、")}`
    }));
};
