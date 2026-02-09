# Content Guide (Nodes + Chains)

Use this guide when adding or editing content under `content/`.

## Rules

1. Keep `id` lowercase snake_case and stable once published.
2. `title` is short, readable, and consistent with the term used in `body`.
3. `body` should be 1-3 sentences and explain the core idea plainly.
4. Use mentions by writing `[Term]` in `body` and mapping `"Term": "node_id"` in `mentions`.
5. Mentions should point to nodes that already exist (or are added in the same PR).
6. Every node should include relations across facets: `what`, `how`, `in_life`, `compare`, `practice`.
7. Use `compare_with` only when you can clearly explain the contrast in the label or body.
8. Use `has_part` / `part_of` to express structure or composition (not just “related”).
9. Relation `label` should be short and concrete (3-8 chars in CN or 1-3 words in EN).
10. Avoid duplicate relations pointing to the same target with the same facet and label.
11. Chains should be 4-6 steps when possible, each step has `child` + `adult`.
12. Steps should follow a progression: definition → mechanism → comparison → application.
13. Include at least 2 steps with mentions that navigate to other nodes.
14. Keep questions concise; each question should be answerable by the linked nodes.
15. Validate JSON with `pnpm lint:content` before committing.

## Facet Mapping

- `what`: definition, composition, classification
- `how`: mechanism, process, method
- `in_life`: real-world uses or phenomena
- `compare`: differences, trade-offs, contrasts
- `practice`: experiments, hands-on actions

## Quick Check 写作规范（统一口径）

### 题型范围（MVP）
- 仅支持单选题（1 step 最多 1 题）
- 每条 chain 建议 2 题：概念纠偏题（What/How）+ 实践决策题（Compare/Practice）

### 选项数量与结构
- 默认 4 个选项
- 结构建议：1 正确 + 1 常见误区 + 1 过度绝对化 + 1 无关/伪因果
- 避免 “全都对/以上都不是”

### 正确选项写法（可验证、不过度承诺）
- 用 “更可能/通常/更符合原则” 替代 “必然/一定”
- 正确答案必须能由该 step 内容直接支持（不引入新知识点）

### 错误选项写法（必须像真的）
- 选择用户常见误区，而不是明显胡扯
- 每个错误选项尽量只错一个点（便于学习纠正）

### explanation（child / adult）
- child：2–3 句 + 类比；40–90 字；最后给一个可执行提示
- adult：2–4 句 + 关键词；80–160 字；包含边界条件（避免绝对化）与实践落地

### 放置策略
- 概念纠偏题：优先放 step_1 或 step_3
- 实践决策题：优先放 step_5

### 题干模板（可直接套用）
- 概念纠偏：
  - “最准确的理解是什么？”
  - “更常见的起点/原因是哪一个？”
- 实践决策：
  - “哪种做法更符合有效实践？”
  - “在这种场景下，更优先做什么？”

### （可选）Linter 软规则建议（WARN）
- options 非 4 则 warn
- explanation.child/adult 缺一个则 warn
- 正确选项出现 “100%/一定/永远/保证” 等绝对词则 warn
