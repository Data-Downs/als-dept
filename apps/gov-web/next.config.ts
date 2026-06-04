import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@als/schemas",
    "@als/evidence",
    "@als/service-graph",
    "@als/service-store",
  ],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
