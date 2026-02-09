import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "packages/core/src/**/*.test.ts",
      "packages/graph/src/**/*.test.ts",
      "packages/content-linter/src/**/*.test.ts"
    ]
  }
});
