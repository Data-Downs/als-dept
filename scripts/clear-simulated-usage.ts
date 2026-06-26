/**
 * clear-simulated-usage.ts
 *
 * Removes everything created by scripts/simulate-platform-usage.ts. Only
 * touches rows tagged by that script (sim_ trace ids, simcase_ case ids), so
 * real and pre-existing demo data is left untouched.
 *
 *   npx tsx scripts/clear-simulated-usage.ts            # local SQLite (default)
 *   npx tsx scripts/clear-simulated-usage.ts --remote   # live als-evidence D1
 */

import { execSync } from "child_process";
import path from "path";

// The citizen app runs with cwd=apps/citizen, so its SQLite store lives here.
const LOCAL_DB = path.resolve(process.cwd(), "apps/citizen/data/traces.db");
const CITIZEN_DIR = path.resolve(process.cwd(), "apps/citizen");
const D1_NAME = "als-evidence";

const DO_REMOTE = process.argv.includes("--remote");
const DO_LOCAL = process.argv.includes("--local") || !DO_REMOTE;

const CLEANUP_SQL = [
  "DELETE FROM case_events WHERE case_id LIKE 'simcase_%' OR trace_id LIKE 'sim_%';",
  "DELETE FROM trace_events WHERE trace_id LIKE 'sim_%';",
  "DELETE FROM cases WHERE case_id LIKE 'simcase_%';",
];

void (async () => {
  if (DO_LOCAL) {
    const { SqliteAdapter } = await import("@als/evidence/sqlite");
    const adapter = await SqliteAdapter.create(LOCAL_DB);
    for (const sql of CLEANUP_SQL) await adapter.run(sql);
    console.log(`Cleared simulated usage from local store: ${LOCAL_DB}`);
  }

  if (DO_REMOTE) {
    for (const sql of CLEANUP_SQL) {
      execSync(
        `npx wrangler d1 execute ${D1_NAME} --remote --command ${JSON.stringify(sql)}`,
        { cwd: CITIZEN_DIR, encoding: "utf8" },
      );
    }
    console.log(`Cleared simulated usage from live D1: ${D1_NAME}`);
  }
})();
