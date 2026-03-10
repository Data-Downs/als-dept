import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "citizen-03",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
