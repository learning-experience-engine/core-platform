# Dev 复盘与长期准备（Learning Experience Engine）

## 一、复盘结论（Executive Summary）
我们已经完成从“想法”到“可持续迭代引擎”的跨越：
- 核心体验形成闭环：概念卡片（Card Stack）+ 关系/邻域导航（Relations/Neighborhood）+ 问题链（Question Chains）+ 教学增强（Goal/Summary/Quick Check）。
- 内容共创不再依赖手改 JSON：Content Studio 支持 nodes/chains 编辑、保存前校验、保存后自动 lint（JSON 输出）、inline errors、一键跳转定位字段。
- 数据域覆盖至少 3 个主题（cell/weather/skin），并有多条可演示的教学链路。

项目定位清晰：Learning Experience Engine（可复现学习路径引擎），不是 Wiki 的替代品，而是“引导式学习 + 即时验证”。

## 二、我们做对了什么（Keep）
### 1) 把内容质量门禁前置为工程能力
- content-linter + CI gate，支持 `--format json` 的机器可读输出
- Studio 保存后自动 lint + inline errors + 点击定位字段
效果：内容增长不会稀释质量，贡献者也不容易写坏数据。

### 2) 选择了可扩展的最小产品形态
- cards：stack URL 可复现/可分享
- relations：facet tabs
- neighborhood：1-hop graph/list
- question chains：child/adult + URL sync
- teaching UX：goal + summary + quick check（可选字段、向后兼容）
效果：每个能力可独立演示，也能组合成完整学习体验。

### 3) 用“示例链”驱动体验验证
当前具备多条高展示价值链路（如 typhoon_safety / sun_tan_uv / acne_why），可以用真实场景证明“我们比条目式阅读更像学习产品”。

## 三、我们踩到的坑（Problem）
### 1) CI 顺序导致 lint 失败（已修复）
根因：workspace `pnpm -r lint` 依赖 `dist/cli.js`，但 CI 未在 lint 前 build。
修复：CI 先 build 再 recursive lint。
经验：monorepo 中“lint 是否依赖 build”必须明确，CI 顺序要固定。

### 2) 手测受环境限制
无 GUI 环境无法交互点击，因此 smoke report 采用 NOT RUN + URL + Expected 方式保留可复测路径。
经验：真实记录优先；后续可逐步引入最小自动化回归（见路线）。

### 3) Schema 演进需要纪律
从 LocalizedText 到 chain.goal/summary/check。
经验：每次 schema 变更都要同步：
- 向后兼容
- linter 覆盖
- studio 支持
- 至少 1 条 demo 链落地示例

## 四、当前系统能力地图（Now）
### 核心体验
- Card Stack（URL 同步，可回放）
- Relations（facet tabs）+ Neighborhood（1-hop, graph/list）
- Question Chains（child/adult + URL sync）
- Teaching UX：Goal / Summary / Quick Check

### 内容生产与质量
- Content Studio：nodes/chains 编辑、一键创建、suggestions、保存前校验
- 自动 lint：保存后 lint(json)，inline errors，点击跳转定位
- CI gate：lint/test/build 通过

## 五、关键指标（Metrics we should track）
### 内容指标（每周）
- domains 数与覆盖：每域 ≥2 条高质量 chain
- chains with quick check 覆盖率（目标 >70%）
- facet 覆盖率：缺失 facet 的节点占比（目标持续下降）

### 工程指标（每周）
- CI 通过率（目标稳定）
- 内容 lint 错误数（目标随规模增长可控）

## 六、下一阶段路线（Plan）
建议按 4–6 周拆成三个里程碑，每个里程碑可独立对外展示。

### Milestone 1：教学体验打磨（1–2 周）
- Chain 面板加入 “Share this step” 复制链接
- Quick Check skeleton 生成（提升出题效率）
- 演示链统一补齐：goal + summary + quick checks

### Milestone 2：内容规模化（2–3 周）
- 每域再补 1–2 条链（优先生活场景）
- 强化 aliases / suggestions 减噪（已具备基础）
- 可选：域级导航页（domain overview）

### Milestone 3：内部种子共创（1–2 周）
- 招募 3–5 名内部种子开发者/内容贡献者
- 贡献类型：
  - 内容贡献（chains/nodes）
  - 工具贡献（studio）
  - 体验贡献（renderer）
- 做一次 onboarding 演示：15 分钟跑通 idea → PR → CI 绿

## 七、风险清单与对策（Risks）
- 内容质量稀释：linter + studio inline errors + quick check 规范控制
- 功能扩散：每次只做一个可演示增量，避免大爆炸重构
- 多语言过早：LocalizedText 已铺路，先不扩散翻译体系
- 回归不足：短期用 URL+Expected；中期再考虑 e2e（引依赖需谨慎）

## 八、落盘动作（Next Actions）
- 本文档每周更新一次（Keep/Problem/Try）
- 建 Milestone：M1 Teaching Polish，并把任务拆成小 issue
- 每周一次小复盘（≤30 分钟），以可演示增量为单位推进
