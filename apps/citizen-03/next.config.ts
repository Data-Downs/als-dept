import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: { appIsrStatus: false, buildActivity: false },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@als/schemas",
    "@als/agent-tools",
    "@als/evidence",
    "@als/legibility",
    "@als/personal-data",
    "@als/adapters",
    "@als/service-graph",
  ],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
