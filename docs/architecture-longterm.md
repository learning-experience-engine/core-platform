Long-term Architecture Blueprint（Learning Experience Engine）

0. 目标与边界

目标：构建一个开放共创的“学习体验引擎”（Learning Experience Engine, LxE），将知识从“条目阅读”升级为“可引导的学习路径 + 可验证的理解”。
边界：
	•	不做一次性“百科全集”；做可扩展的内容结构、工具链与运行时体验。
	•	不把 AI 当作内容真理来源；AI 用于辅助生产/检索/组织/个性化，但内容仍以结构化数据与人类审校为主。
	•	先把内容与工具链跑通，再逐步引入多语言、权限、规模化检索与推荐。

1. 核心原则（Architecture Principles）
	1.	Content is Data：内容以结构化数据为中心（nodes/chains/relations/mentions），而不是以 Markdown 文件为中心。
	2.	Headless by default：内容层与展示层解耦，支持多端输出（web/移动/插件/未来 AR/语音）。  ￼
	3.	Shareable & Reproducible：任何学习路径可通过 URL/ID 复现、分享、回放（尤其是 stack + chain + step + age）。
	4.	Quality gates：内容必须可 lint、可测试、可回归；CI 门禁是共创的底座。
	5.	Backward compatible schema：Schema 演进必须向后兼容（optional 字段优先），并配套 studio + linter + renderer 同步升级。
	6.	Composable UX：卡片深挖、关系导航、邻域视图、问题链是可组合的 UI primitives。

2. 逻辑分层（4-layer Model）

2.1 Content Layer（内容数据层）

数据实体：
	•	Node（概念卡片）：id/title/body/mentions/relations（facet + type + to）
	•	Graph（关系图）：1-hop neighborhood、去重、facet filter、截断优先级
	•	QuestionChain（问题链）：topicNodeId + steps（child/adult），以及可选教学字段：goal/summary/check
	•	LocalizedText：为多语言铺路（string | Record<lang,string>）

内容存储（当前）：repo 内 JSON（examples），用于 build-in-public 与可审阅 PR。
未来演进：可切换到“内容仓库服务”（Content Service）以支持在线协作、版本与权限，但仍保持导出为可审阅的 JSON/快照。

2.2 Authoring Layer（生产与共创层）

目标：降低贡献门槛，同时保证质量与一致性。

组件：
	•	Content Studio（已实现）：nodes/chains 编辑、创建流程、suggestions、保存前校验
	•	Auto Lint on Save（已实现）：保存即 lint（JSON 输出）+ inline errors + 跳转定位
	•	Content Linter CLI（已实现）：规则校验 + CI gate；建议长期保持“人读输出 + JSON 输出”两种格式
	•	Contribution workflow（未来增强）：模板化 issue、PR checklist、内容审校角色（maintainer/editor/reviewer）

2.3 Runtime Layer（学习体验运行时）

核心交互 primitives：
	•	Card Stack：可深挖的卡片栈（stack）
	•	Relations Dock：按 facet 展示关系（what/how/in_life/compare/practice）
	•	Neighborhood Panel：图/列表视图的 1-hop 邻域
	•	Question Chain Panel：child/adult 切换、step 导航、Goal/Summary/Quick Check

关键能力：
	•	URL state：stack + chain + step + age 同步，保证可分享与回放
	•	Teaching UX：goal/summary/check 构成“引导—巩固—验证”的闭环
	•	Composable rendering：NodeCard 接受 neighborhood slot；web-demo 组合 UI（保持可扩展）

2.4 Platform/Infra Layer（平台与基础设施）

当前：纯前端 demo + repo 内容快照 + CI。
未来（按阶段引入）：
	•	Content API：提供 nodes/chains 查询、版本、增量更新、导出快照
	•	Search/Index：本地索引 → 服务器索引（全文/结构化/图查询）
	•	Auth & Roles：匿名浏览、贡献者、编辑者、管理员；PR 仍保留为“可审阅来源”
	•	Observability：基础埋点（chain 完成率、check 正确率、跳转路径）、错误日志、性能指标
	•	Moderation：反垃圾、内容合规、审校队列（尤其面向 K12 时）

3. Schema 演进策略（Schema Evolution Strategy）

规则：
	•	优先加 optional 字段（例如 chain.goal/step.summary/step.check）
	•	任何 schema 变更必须同步：
	1.	schema 类型定义
	2.	renderer 展示（缺失字段需优雅降级）
	3.	content-studio 编辑
	4.	linter 校验（含 tests）
	5.	至少 1 条示例内容落地（demo）

版本管理建议：
	•	文档化 schema 变更（CHANGELOG）
	•	未来可引入 schemaVersion 字段，但短期可用“向后兼容 + lint”替代

4. 内容组织与知识图谱方向
	•	以 “概念节点 + 关系边” 形成知识图谱式底座（Graph-structured Knowledge Base）。  ￼
	•	facet（what/how/in_life/compare/practice）用于把“学习任务”显式化，而不仅是百科式的 related links
	•	长期可扩展：
	•	关系类型（prerequisite_of、causes、evidence_for…）
	•	域级索引节点（domain overview）
	•	跨域链接与对比学习（compare facet 的重要性）

5. 多端与输出（Omni-channel）

短期：web-demo 作为参考实现。
中期：将 renderer-web 抽象为可嵌入组件（SDK），支持：
	•	教学网站嵌入
	•	内容站点静态导出（SSG）
	•	移动端/小程序
	•	浏览器插件/AI 助教层

关键要求：内容层与呈现层彻底解耦（headless），以保证多端一致性。  ￼

6. AI 的接入方式（AI Integration）

AI 不直接“替代内容真理”，而是作为工具层能力：
	•	Authoring assist：suggestions（aliases/mentions）、自动生成 quick check 草稿、总结草稿
	•	Learning assist：基于当前 stack/chain 的解释补充（可标注来源/置信）
	•	Graph assist：候选关系推荐、重复/冲突检测
	•	Safety：K12 场景下的内容与对话安全策略（后续阶段）

7. 安全与合规（尤其面向 K12）
	•	内容审校流程与角色权限
	•	版本与可追溯性（谁改了什么、何时发布）
	•	用户数据最小化、默认匿名
	•	未来引入 K12 时的内容分级、可见范围、审查队列

8. 工程与仓库结构（Monorepo Direction）

继续保持 apps/ + packages/ 模式，核心模块保持可复用：
	•	packages/schema（类型与 schema）
	•	packages/core（状态机、selectors）
	•	packages/graph（邻域 API）
	•	packages/renderer-web（UI primitives）
	•	packages/content-linter（质量门禁）
	•	apps/web-demo（参考实现）
	•	apps/content-studio（生产工具）

CI 原则：先 build 再 recursive lint，保证产物存在并减少脚本副作用。

9. 路线图（Roadmap）

M1 Teaching Polish（1–2 周）
	•	share step 链接（复制 URL）
	•	quick check skeleton 生成
	•	演示链统一补齐 goal/summary/check

M2 Scale Content（2–4 周）
	•	每域再补 1–2 条链（优先生活场景）
	•	域级 overview 与导航
	•	更强 suggestions（aliases + 去噪）

M3 Seed Community（1–2 周）
	•	内部种子开发者/内容贡献者 onboarding
	•	贡献模板、review 机制、内容风格指南
	•	build-in-public 节奏：每周 release notes + milestone

M4 Platformize（长期）
	•	content API + indexing + roles + moderation
	•	多端 SDK + 发布流程
	•	AI 辅助生产/学习的安全落地

10. Why this is better than a Wiki (Positioning)

### Not just “knowledge storage”, but “guided learning”
- Wiki 强在条目与引用；学习者常见痛点是：不知道从哪开始、学到哪算掌握、跳转越多越迷路。
- LxE 以“可复现学习路径”为中心：从一个问题出发，按 step 引导，最后用 quick check 验证理解。

### Reproducible learning paths (share & replay)
- URL 同步 stack/chain/step/age，使学习路径可分享、可回放、可复测（不仅是页面链接）。

### Teaching loop: Goal → Summary → Quick Check
- 每条 chain 可定义学习目标（goal），每步有小结（summary），并用单选自测（check）即时纠偏。
- 这为 K12/教学场景提供了比条目更直接的教学结构（同时保持向后兼容与可扩展）。

### Concept cards + Graph navigation (structured exploration)
- 卡片栈支持“术语一键深挖”，并通过 facet 化关系与 1-hop 邻域让探索具有学习维度（what/how/in_life/compare/practice），而不仅是 related links 列表。
- Graph 是内容底座，链是教学脚本，两者可组合。

### Build-in-public authoring with quality gates
- Content Studio 降低贡献门槛（编辑 nodes/chains、suggestions、保存即 lint、错误一键定位）。
- Content Linter + CI gate 保证共创质量与一致性，避免规模增长导致内容崩坏。

### What we are NOT claiming
- 不声称替代 Wiki 或覆盖所有知识。
- 不把 AI 当真理来源；AI 主要用于辅助生产/组织/个性化（可审校、可追溯）。

Try it quickly：
- 建议先看 README/DEMO 中的 3 条演示链（typhoon_safety / sun_tan_uv / acne_why）。
