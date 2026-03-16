/**
 * @als/mcp-server — Local MCP server for service artefacts
 *
 * Exposes government service capabilities as MCP primitives:
 *   - Resources: service metadata, policy, consent, state-model per service
 *   - Tools: check_eligibility, advance_state per service (with annotations)
 *   - Prompts: journey template, eligibility check template per service
 *
 * Transport: stdio (standard MCP pattern for local servers)
 * Usage: npx tsx packages/mcp-server/src/index.ts
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server";

const __dirname =
  typeof import.meta.dirname === "string"
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const servicesDir =
    process.env.SERVICES_DIR ||
    path.resolve(__dirname, "../../../data/services");

  // Try service-store DB first (contains all 110+ services with generated artefacts)
  const dbPath =
    process.env.SERVICE_STORE_DB_PATH ||
    path.resolve(__dirname, "../../../data/services.db");

  const dbExists = fs.existsSync(dbPath);
  console.error(
    `[MCP Server] Loading services from: ${dbExists ? `DB (${dbPath})` : servicesDir}`,
  );

  // Load personas from filesystem
  const personasDir = path.resolve(__dirname, "../../../data/simulated/users");
  let personas: Record<string, unknown>[] = [];
  if (fs.existsSync(personasDir)) {
    const files = fs
      .readdirSync(personasDir)
      .filter((f) => f.endsWith(".json"))
      .sort();
    personas = files.map((f) =>
      JSON.parse(fs.readFileSync(path.join(personasDir, f), "utf-8")),
    );
    console.error(`[MCP Server] Loaded ${personas.length} personas`);
  }

  const { server, toolCount, resourceCount, promptCount, serviceCount } =
    await createServer(servicesDir, {
      ...(dbExists ? { dbPath } : {}),
      personas,
    });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(
    `[MCP Server] Running on stdio — ${serviceCount} services, ${resourceCount} resources, ${toolCount} tools, ${promptCount} prompts`,
  );
}

main().catch((err) => {
  console.error("[MCP Server] Fatal error:", err);
  process.exit(1);
});
