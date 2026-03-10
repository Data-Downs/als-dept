import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "agent-tools",
    include: ["src/**/*.test.ts"],
  },
});
