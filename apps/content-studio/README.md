# Content Studio

## 运行方式
1. 在仓库根目录执行 `pnpm --filter content-studio dev`
2. 或者在应用目录执行 `pnpm -C apps/content-studio dev`

打开 Vite 输出的本地地址即可进入编辑台。

## New Node / New Chain
- 左侧列表上方提供 `New Node` / `New Chain` 按钮。
- New Node 会创建一个空节点并选中进入编辑：`id` 自动生成（基于 title；若 title 为空则 `node_<timestamp>`），`title/body` 为空，`mentions/relations` 为空。
- New Chain 会创建一个空链路并选中进入编辑：`id` 自动生成（基于 title；若 title 为空则 `chain_<timestamp>`），`topicNodeId` 默认当前选中节点（若无则提示必填），并自动带有 `step_1`。

## Mention Suggestions
- Node 编辑区包含 `Mention Suggestions`，根据 body 内容扫描已存在节点标题，给出未被 mentions 覆盖的建议，点击即可一键添加。
- Chain 的每个 step 在答案区域下方也提供 `Mention Suggestions`，基于 child/adult answers 的文本内容生成建议。

## 保存与 lint
- 保存前会进行轻量校验（id/title/topicNodeId 等必填、关联目标存在等）。校验不通过会阻止保存并展示错误列表。
- `Content lint` 仍是权威门禁；即使保存成功，也应以 `pnpm lint:content` 的结果为最终准入标准。

### 手测步骤（自动 lint + inline errors）
1. 在 Studio 中把某个 relation 的 `to` 改成不存在的 nodeId。
2. 点击 Save。
3. 观察 Lint Results 面板自动更新，并显示对应错误。
4. 修复 relation 的 `to` 后再次 Save，错误提示清空。
