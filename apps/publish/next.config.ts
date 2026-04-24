import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@als/schemas",
    "@als/evidence",
    "@als/service-graph",
    "@als/service-store",
    "@als/mcp-server",
    "@als/publish-generators",
  ],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
