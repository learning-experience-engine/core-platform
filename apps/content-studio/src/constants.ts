import type { AgeBand, Facet, RelationType } from "@lxp/schema";

export const RELATION_TYPES: RelationType[] = ["part_of", "has_part", "compare_with", "related"];
export const FACETS: Facet[] = ["what", "how", "in_life", "compare", "practice"];
export const AGE_BANDS: AgeBand[] = ["child", "adult"];

export const DEFAULT_CHAIN_STEP_TEMPLATES = [
  { key: "what", question: "是什么（What）", hint: "<补充核心定义>" },
  { key: "parts", question: "结构/组成（Parts）", hint: "<拆解关键要素>" },
  { key: "how", question: "怎么工作（How）", hint: "<解释机制或方法>" },
  { key: "in_life", question: "生活中的表现（In life）", hint: "<举例应用场景>" },
  { key: "compare_practice", question: "对比/实践（Compare/Practice）", hint: "<对比并给出练习>" }
] as const;
