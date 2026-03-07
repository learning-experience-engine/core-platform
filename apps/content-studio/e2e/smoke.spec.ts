import { expect, test, type Locator, type Page } from "@playwright/test";
import type { QuestionChain, Node } from "@lxp/schema";
import type { LintIssue } from "../src/lint/types";

// Scope: keep default smoke read-only; do not cover successful saves that would write content/examples.
// Real lint coverage here only verifies sidebar-triggered execution and stable no-issue rendering.
// Lint-navigation cases use mocked lint payloads so target switching/focus behavior stays deterministic.
async function openStudio(page: Page) {
  await page.goto("/");
  await expect(page.getByText("Content Studio")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Editor" })).toBeVisible();
}

async function mockLintIssues(page: Page, errors: LintIssue[]) {
  await page.route(/\/api\/lint\?format=json$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        format: "json",
        code: errors.length > 0 ? 1 : 0,
        stdout: JSON.stringify({ errors, warnings: [] }),
        stderr: ""
      })
    });
  });
}

function waitForLintRun(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.url().includes("/api/lint?format=json") && response.request().method() === "POST"
  );
}

function waitForLintBuild(page: Page) {
  return page.waitForResponse(
    (response) => response.url().includes("/api/lint/build") && response.request().method() === "POST"
  );
}

async function clickAndWait(locator: Locator, responsePromise: Promise<unknown>) {
  await Promise.all([responsePromise, locator.click()]);
}

async function createNewChainDraftFromNode(page: Page, searchTerm: string, nodeButtonName: RegExp) {
  await page.getByPlaceholder("Search by id or title").fill(searchTerm);
  await page.getByRole("button", { name: nodeButtonName }).click();
  await page.getByRole("tab", { name: "Chains" }).click();
  await page.getByRole("button", { name: "New Chain" }).click();
}

async function expectConfirmOnAction(
  page: Page,
  action: () => Promise<void>,
  decision: "accept" | "dismiss",
  expectedMessage = "当前有未保存改动，确定要放弃吗？"
) {
  const dialogHandled = new Promise<void>((resolve) => {
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(expectedMessage);
      if (decision === "accept") {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
      resolve();
    });
  });

  await action();
  await dialogHandled;
}

function cloneFixture<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function mockEditableContentApi(
  page: Page,
  fixtures: {
    nodes: Node[];
    chains: QuestionChain[];
  }
) {
  let nodes = cloneFixture(fixtures.nodes);
  let chains = cloneFixture(fixtures.chains);

  await page.route("**/api/nodes", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(nodes) });
      return;
    }

    if (method === "PUT") {
      const payload = route.request().postDataJSON() as { node: Record<string, unknown> };
      const nextNode = payload.node;
      const index = nodes.findIndex((item) => item.id === nextNode.id);
      if (index >= 0) {
        nodes[index] = nextNode;
      } else {
        nodes.push(nextNode);
      }
      await route.fulfill({ contentType: "application/json", body: "" });
      return;
    }

    await route.fallback();
  });

  await page.route("**/api/chains", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(chains) });
      return;
    }

    if (method === "PUT") {
      const payload = route.request().postDataJSON() as { chain: Record<string, unknown> };
      const nextChain = payload.chain;
      const index = chains.findIndex((item) => item.id === nextChain.id);
      if (index >= 0) {
        chains[index] = nextChain;
      } else {
        chains.push(nextChain);
      }
      await route.fulfill({ contentType: "application/json", body: "" });
      return;
    }

    await route.fallback();
  });

  await page.route(/\/api\/lint\?format=json$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        format: "json",
        code: 0,
        stdout: JSON.stringify({ errors: [], warnings: [] }),
        stderr: ""
      })
    });
  });
}

function captureUnexpectedDialogs(page: Page) {
  const messages: string[] = [];
  page.on("dialog", async (dialog) => {
    messages.push(dialog.message());
    await dialog.dismiss();
  });
  return messages;
}

test.describe("smoke", () => {
  test("renders the studio shell", async ({ page }) => {
    await openStudio(page);

    await expect(page.getByRole("tablist", { name: "Edit mode" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Nodes" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Chains" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nodes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lint Results" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
  });

  test("filters nodes and opens the selected node editor", async ({ page }) => {
    await openStudio(page);

    await page.getByPlaceholder("Search by id or title").fill("typhoon");
    await page.getByRole("button", { name: /台风/ }).click();

    await expect(page.getByLabel("ID")).toHaveValue("typhoon");
    await expect(page.getByLabel("Title")).toHaveValue("台风");
  });

  test("renders the chain editor after switching modes", async ({ page }) => {
    await openStudio(page);

    await page.getByRole("tab", { name: "Chains" }).click();

    await expect(page.getByRole("heading", { name: "问题链编辑台" })).toBeVisible();
    await expect(page.getByLabel("Chain ID")).toBeVisible();
    await expect(page.getByLabel("Title")).toBeVisible();
    await expect(page.getByLabel("Topic Node")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Chain stats" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Steps" })).toBeVisible();
  });

  test("creates a new chain draft from the selected node", async ({ page }) => {
    await openStudio(page);
    await createNewChainDraftFromNode(page, "weather", /天气/);

    await expect(page.getByLabel("Topic Node")).toHaveValue("weather");
    await expect(page.getByLabel("Step ID").first()).toHaveValue("step_1");
  });

  test("blocks invalid chain saves before any write happens", async ({ page }) => {
    await openStudio(page);
    await createNewChainDraftFromNode(page, "weather", /天气/);
    await page.getByLabel("Topic Node").fill("");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Topic node 不能为空")).toBeVisible();
    await expect(page.getByText("保存失败: 表单校验未通过")).toBeVisible();
  });

  test("keeps the current node draft when switching nodes is canceled", async ({ page }) => {
    await openStudio(page);

    await page.getByPlaceholder("Search by id or title").fill("weather");
    await page.getByRole("button", { name: /天气/ }).click();
    await page.getByLabel("Title").fill("天气 - 未保存");
    await page.getByPlaceholder("Search by id or title").fill("typhoon");

    await expectConfirmOnAction(
      page,
      () => page.getByRole("button", { name: /台风/ }).click(),
      "dismiss"
    );

    await expect(page.getByRole("tab", { name: "Nodes", selected: true })).toBeVisible();
    await expect(page.getByLabel("ID")).toHaveValue("weather");
    await expect(page.getByLabel("Title")).toHaveValue("天气 - 未保存");
  });

  test("confirms before switching modes away from a dirty chain draft", async ({ page }) => {
    await openStudio(page);
    await createNewChainDraftFromNode(page, "weather", /天气/);
    await page.getByLabel("Title").fill("未保存链路");

    await expectConfirmOnAction(
      page,
      () => page.getByRole("tab", { name: "Nodes" }).click(),
      "accept"
    );

    await expect(page.getByRole("tab", { name: "Nodes", selected: true })).toBeVisible();
    await expect(page.getByLabel("ID")).toBeVisible();
  });

  test("triggers beforeunload when the current draft is dirty", async ({ page }) => {
    await openStudio(page);

    await page.getByPlaceholder("Search by id or title").fill("weather");
    await page.getByRole("button", { name: /天气/ }).click();
    await page.getByLabel("Title").fill("天气 - 未保存");

    const dialogPromise = new Promise<string>((resolve) => {
      page.once("dialog", async (dialog) => {
        const type = dialog.type();
        await dialog.accept();
        resolve(type);
      });
    });

    await page.reload();
    expect(await dialogPromise).toBe("beforeunload");

    await expect(page.getByLabel("ID")).toHaveValue("plant_cell");
    await expect(page.getByLabel("Title")).toHaveValue("植物细胞");
  });

  test("shows an unsaved indicator only while the current draft is dirty", async ({ page }) => {
    await mockEditableContentApi(page, {
      nodes: [
        {
          id: "weather",
          title: "天气",
          body: "天气是大气在某地短时间内的状态变化。",
          mentions: {},
          relations: []
        }
      ],
      chains: [
        {
          id: "weather_intro",
          title: "天气入门问题链",
          topicNodeId: "weather",
          steps: [
            {
              id: "w-1",
              question: "天气是什么？",
              answers: {
                child: "天气像天空的心情。",
                adult: "天气是短时间内的大气状态。"
              },
              mentions: {}
            }
          ]
        }
      ]
    });

    await openStudio(page);
    await expect(page.getByText("未保存改动")).toHaveCount(0);

    await page.getByLabel("Title").fill("天气（未保存）");
    await expect(page.getByText("未保存改动")).toBeVisible();

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("已保存: weather")).toBeVisible();
    await expect(page.getByText("未保存改动")).toHaveCount(0);
  });

  test("does not prompt after saving a node draft", async ({ page }) => {
    await mockEditableContentApi(page, {
      nodes: [
        {
          id: "weather",
          title: "天气",
          body: "天气是大气在某地短时间内的状态变化。",
          mentions: {},
          relations: []
        },
        {
          id: "typhoon",
          title: "台风",
          body: "台风是强烈的热带气旋。",
          mentions: {},
          relations: []
        }
      ],
      chains: [
        {
          id: "weather_intro",
          title: "天气入门问题链",
          topicNodeId: "weather",
          steps: [
            {
              id: "w-1",
              question: "天气是什么？",
              answers: {
                child: "天气像天空的心情。",
                adult: "天气是短时间内的大气状态。"
              },
              mentions: {}
            }
          ]
        }
      ]
    });

    await openStudio(page);
    const unexpectedDialogs = captureUnexpectedDialogs(page);

    await page.getByLabel("Title").fill("天气（已保存）");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("已保存: weather")).toBeVisible();

    await page.getByPlaceholder("Search by id or title").fill("typhoon");
    await page.getByRole("button", { name: /台风/ }).click();

    await expect(page.getByLabel("ID")).toHaveValue("typhoon");
    await expect(unexpectedDialogs).toEqual([]);
  });

  test("does not prompt after saving a chain draft", async ({ page }) => {
    await mockEditableContentApi(page, {
      nodes: [
        {
          id: "weather",
          title: "天气",
          body: "天气是大气在某地短时间内的状态变化。",
          mentions: {},
          relations: []
        }
      ],
      chains: [
        {
          id: "weather_intro",
          title: "天气入门问题链",
          topicNodeId: "weather",
          steps: [
            {
              id: "w-1",
              question: "天气是什么？",
              answers: {
                child: "天气像天空的心情。",
                adult: "天气是短时间内的大气状态。"
              },
              mentions: {}
            }
          ]
        },
        {
          id: "storm_intro",
          title: "风暴入门问题链",
          topicNodeId: "weather",
          steps: [
            {
              id: "s-1",
              question: "风暴有什么特点？",
              answers: {
                child: "风暴会带来大风。",
                adult: "风暴常伴随强风和剧烈天气变化。"
              },
              mentions: {}
            }
          ]
        }
      ]
    });

    await openStudio(page);
    const unexpectedDialogs = captureUnexpectedDialogs(page);

    await page.getByRole("tab", { name: "Chains" }).click();
    await page.getByLabel("Title").fill("天气链路（已保存）");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("已保存: weather_intro")).toBeVisible();

    await page.getByPlaceholder("Search by id or title").fill("风暴");
    await page.getByRole("button", { name: /风暴/ }).click();

    await expect(page.getByLabel("Chain ID")).toHaveValue("storm_intro");
    await expect(unexpectedDialogs).toEqual([]);
  });
});

test.describe("lint", () => {
  test("runs content lint from the sidebar without writing content files", async ({ page }) => {
    test.slow();
    await openStudio(page);

    const runLintButton = page.getByRole("button", { name: "Run content lint" });
    const buildLinterButton = page.getByRole("button", { name: "Build linter" });

    await clickAndWait(runLintButton, waitForLintRun(page));

    if (await buildLinterButton.isVisible()) {
      await clickAndWait(buildLinterButton, waitForLintBuild(page));
      await expect(page.getByText("Build completed.")).toBeVisible();
      await clickAndWait(runLintButton, waitForLintRun(page));
    }

    await expect(page.getByText("Lint passed")).toBeVisible();
    await expect(page.getByText("No lint issues.")).toBeVisible();
  });
});

test.describe("navigation", () => {
  test("clicking a chain lint issue switches mode and focuses the target field", async ({ page }) => {
    await mockLintIssues(page, [
      {
        level: "error",
        code: "CHAIN_TOPIC_REQUIRED",
        message: "[ERROR] Topic node 不能为空",
        chainId: "weather_intro",
        path: "topicNodeId"
      }
    ]);

    await openStudio(page);
    await clickAndWait(page.getByRole("button", { name: "Run content lint" }), waitForLintRun(page));

    const lintIssue = page.getByRole("button", {
      name: /chain:weather_intro.*topicNodeId.*Topic node 不能为空/
    });
    await expect(lintIssue).toBeVisible();
    await lintIssue.click();

    await expect(page.getByRole("tab", { name: "Chains", selected: true })).toBeVisible();
    await expect(page.getByLabel("Chain ID")).toHaveValue("weather_intro");
    await expect(page.getByLabel("Topic Node")).toHaveValue("weather");
    await expect(page.getByLabel("Topic Node")).toBeFocused();
  });

  test("clicking a node lint issue switches mode and focuses the node field", async ({ page }) => {
    await mockLintIssues(page, [
      {
        level: "error",
        code: "NODE_TITLE_REQUIRED",
        message: "[ERROR] Title 不能为空",
        nodeId: "weather",
        path: "title"
      }
    ]);

    await openStudio(page);
    await page.getByRole("tab", { name: "Chains" }).click();
    await clickAndWait(page.getByRole("button", { name: "Run content lint" }), waitForLintRun(page));

    const lintIssue = page.getByRole("button", {
      name: /node:weather.*title.*Title 不能为空/
    });
    await expect(lintIssue).toBeVisible();
    await lintIssue.click();

    await expect(page.getByRole("tab", { name: "Nodes", selected: true })).toBeVisible();
    await expect(page.getByLabel("ID")).toHaveValue("weather");
    await expect(page.getByLabel("Title")).toHaveValue("天气");
    await expect(page.getByLabel("Title")).toBeFocused();
  });

  test("clicking a step mention lint issue focuses the mention section fallback", async ({ page }) => {
    await mockLintIssues(page, [
      {
        level: "error",
        code: "CHAIN_MENTION_TARGET_REQUIRED",
        message: "[ERROR] Mention target 缺失",
        chainId: "weather_intro",
        path: 'steps[0].mentions["不存在的术语"]'
      }
    ]);

    await openStudio(page);
    await clickAndWait(page.getByRole("button", { name: "Run content lint" }), waitForLintRun(page));

    const lintIssue = page.getByRole("button", {
      name: /chain:weather_intro.*steps\[0\]\.mentions\["不存在的术语"\].*Mention target 缺失/
    });
    await expect(lintIssue).toBeVisible();
    await lintIssue.click();

    await expect(page.getByRole("tab", { name: "Chains", selected: true })).toBeVisible();
    await expect(page.getByLabel("Chain ID")).toHaveValue("weather_intro");
    await expect(page.getByText("pc-1")).not.toBeVisible();

    const mentionSection = page.locator(
      '[data-lint-target="chain:weather_intro:steps%5B0%5D.mentions"]'
    );
    await expect(mentionSection).toHaveClass(/lint-focus/);
    await expect(page.getByRole("heading", { name: "Mention Suggestions" }).first()).toBeVisible();
  });
});
