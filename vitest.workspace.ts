import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/*/vitest.config.ts",
  "apps/citizen-02/vitest.config.ts",
  "vitest.config.ts",
]);
