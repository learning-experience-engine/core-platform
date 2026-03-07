import { expect, test, type Locator, type Page } from "@playwright/test";
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
