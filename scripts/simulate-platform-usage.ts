/**
 * simulate-platform-usage.ts
 *
 * Fabricates a few hundred realistic citizen applications across every
 * full-artefact service so the Legibility Studio's ledger and evidence plane
 * look like a platform in active use. Each service gets a handful of cases
 * walking its REAL state model, with a mix of outcomes (completed / in
 * progress / rejected / handed-off) and correct progress.
 *
 * Generates SQL into .tmp-sim/ which is then pushed to the live `als-evidence`
 * D1 via `wrangler d1 execute --remote`. All rows are tagged for easy cleanup:
 *   - trace_events.trace_id  LIKE 'sim_%'
 *   - cases.case_id          LIKE 'simcase_%'
 *
 * Run with: npx tsx scripts/simulate-platform-usage.ts
 */

import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { execSync } from "child_process";
import path from "path";

const SERVICES_DIR = path.resolve(process.cwd(), "data/services");
const OUT_DIR = path.resolve(process.cwd(), ".tmp-sim");
const CITIZEN_DIR = path.resolve(process.cwd(), "apps/citizen");
const D1_NAME = "als-evidence";
const STATEMENTS_PER_FILE = 250;
// The citizen app runs with cwd=apps/citizen, so its SQLite store lives here.
const LOCAL_DB = path.resolve(process.cwd(), "apps/citizen/data/traces.db");

// Target: --remote pushes to the live `als-evidence` D1; --local writes to the
// local SQLite the dev servers use. Defaults to local when neither is given.
const DO_REMOTE = process.argv.includes("--remote");
const DO_LOCAL = process.argv.includes("--local") || !DO_REMOTE;

// Removes everything this script creates — kept in sync with
// scripts/clear-simulated-usage.ts. Run first so re-runs replace cleanly.
const SIM_CLEANUP_SQL = [
  "DELETE FROM case_events WHERE case_id LIKE 'simcase_%' OR trace_id LIKE 'sim_%';",
  "DELETE FROM trace_events WHERE trace_id LIKE 'sim_%';",
  "DELETE FROM cases WHERE case_id LIKE 'simcase_%';",
];

// ── Synthetic applicants (shown monospace as a case reference in the studio) ──
const FIRST = [
  "amelia", "noah", "olivia", "george", "ava", "leo", "isla", "arthur", "mia",
  "oscar", "ivy", "harry", "freya", "jack", "lily", "charlie", "grace", "henry",
  "sophie", "thomas", "ruby", "william", "evie", "james", "ella", "joshua",
  "rosie", "daniel", "maya", "samuel", "aisha", "raj", "fatima", "kwame",
  "wei", "nina", "omar", "priya", "tomasz", "chloe",
];
const LAST = [
  "bradley", "foster", "okafor", "nguyen", "patel", "khan", "reed", "campbell",
  "hughes", "marsh", "doyle", "abbott", "frost", "shah", "ellis", "byrne",
  "novak", "mensah", "lowe", "pike", "quinn", "rahman", "sutton", "vance",
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}
const rand = rng(20260626);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const randint = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

function applicantRef(): string {
  return `${pick(FIRST)[0]}${pick(LAST)}${randint(10, 99)}`;
}

const FAILURE_STATES = new Set(["rejected", "handed-off"]);

interface StateDef {
  id: string;
  type?: string;
}
interface TransitionDef {
  from: string;
  to: string;
  trigger?: string;
}

function sql(v: string | number | null): string {
  if (v === null) return "NULL";
  if (typeof v === "number") return String(v);
  return `'${v.replace(/'/g, "''")}'`;
}

function isoMinus(daysAgo: number, addMinutes: number): string {
  const d = new Date("2026-06-26T09:00:00Z");
  d.setDate(d.getDate() - daysAgo);
  d.setMinutes(d.getMinutes() + addMinutes);
  return d.toISOString();
}

type Outcome = "completed" | "in-progress" | "rejected" | "handed-off";

const statements: string[] = [];
let caseCounter = 0;
let eventCounter = 0;
const serviceIds = readdirSync(SERVICES_DIR).filter((d) => {
  try {
    return readFileSync(path.join(SERVICES_DIR, d, "state-model.json"), "utf8");
  } catch {
    return false;
  }
});

for (const serviceId of serviceIds) {
  const model = JSON.parse(
    readFileSync(path.join(SERVICES_DIR, serviceId, "state-model.json"), "utf8"),
  ) as { states: StateDef[]; transitions?: TransitionDef[] };

  const states = model.states ?? [];
  if (states.length < 2) continue;

  const triggerOf = new Map<string, string>();
  for (const t of model.transitions ?? []) {
    triggerOf.set(`${t.from}|${t.to}`, t.trigger ?? "advance");
  }

  // Happy path: every state except the failure terminals, in declared order.
  const happy = states.map((s) => s.id).filter((id) => !FAILURE_STATES.has(id));
  if (happy.length < 2) continue;
  const successTerminal = happy[happy.length - 1];
  const totalStates = states.length;

  const numCases = randint(2, 5);
  for (let i = 0; i < numCases; i++) {
    const roll = rand();
    const outcome: Outcome =
      roll < 0.5 ? "completed" : roll < 0.8 ? "in-progress" : roll < 0.9 ? "rejected" : "handed-off";

    // Build the path of states this applicant walked through.
    let path_: string[];
    if (outcome === "completed") {
      path_ = [...happy];
    } else if (outcome === "in-progress") {
      path_ = happy.slice(0, randint(2, Math.max(2, happy.length - 1)));
    } else {
      const stopAt = randint(2, Math.max(2, happy.length - 1));
      path_ = [...happy.slice(0, stopAt), outcome === "rejected" ? "rejected" : "handed-off"];
    }

    const userId = applicantRef();
    const caseId = `simcase_${++caseCounter}_${serviceId.slice(0, 20)}`;
    const traceId = `sim_${caseCounter}_${Math.floor(rand() * 1e7).toString(36)}`;
    const daysAgo = randint(0, 60);
    const startedAt = isoMinus(daysAgo, 0);

    const finalState = path_[path_.length - 1];
    const visited = path_;
    const progress =
      outcome === "completed"
        ? 100
        : Math.round((visited.length / totalStates) * 100);
    const status = outcome;
    const identityVerified = visited.includes("identity-verified") ? 1 : 0;
    const eligibilityChecked = visited.includes("eligibility-checked") ? 1 : 0;
    const consentGranted = visited.some((s) => s === "consent-given" || s === "consent-granted") ? 1 : 0;
    const handedOff = outcome === "handed-off" ? 1 : 0;

    // ── trace events ──
    let minute = 0;
    const span = `span_${caseCounter}`;
    const meta = (cap?: string) =>
      JSON.stringify({ userId, sessionId: traceId, capabilityId: cap ?? serviceId });

    const pushEvent = (
      type: string,
      payload: Record<string, unknown>,
      cap?: string,
    ) => {
      const id = `evt_sim_${++eventCounter}`;
      statements.push(
        `INSERT INTO trace_events (id, trace_id, span_id, parent_span_id, timestamp, type, payload, metadata) VALUES (${sql(id)}, ${sql(traceId)}, ${sql(span)}, NULL, ${sql(isoMinus(daysAgo, minute))}, ${sql(type)}, ${sql(JSON.stringify(payload))}, ${sql(meta(cap))});`,
      );
      minute += randint(1, 4);
      return id;
    };

    pushEvent("llm.request", { agent: "dot", messageCount: 1 }, serviceId);
    pushEvent("capability.invoked", { serviceId, fromState: "not-started" }, serviceId);

    let agentActions = 0;
    let humanActions = 0;
    const caseEventRows: Array<{ evtId: string; type: string; actor: string; summary: string; min: number }> = [];
    for (let k = 0; k < path_.length - 1; k++) {
      const from = path_[k];
      const to = path_[k + 1];
      const trig = triggerOf.get(`${from}|${to}`) ?? "advance";
      const terminal = FAILURE_STATES.has(to)
        ? to === "rejected"
          ? "rejected"
          : "handoff"
        : to === successTerminal
          ? "success"
          : undefined;
      const evtId = pushEvent(
        "state.transition",
        { fromState: from, toState: to, trigger: trig, ...(terminal ? { terminal } : {}) },
        serviceId,
      );
      const actor = rand() < 0.6 ? "agent" : "human";
      if (actor === "agent") agentActions++;
      else humanActions++;
      caseEventRows.push({ evtId, type: "state.transition", actor, summary: `State: ${from} -> ${to}`, min: minute });
    }
    pushEvent("llm.response", { responseChars: randint(200, 1600), status: "complete" }, serviceId);
    if (outcome === "completed") {
      pushEvent("capability.result", { success: true, toState: finalState }, serviceId);
    }

    const eventCount = path_.length - 1 + (outcome === "completed" ? 4 : 3);
    const lastActivity = isoMinus(daysAgo, minute);

    // ── case row ──
    statements.push(
      `INSERT INTO cases (case_id, user_id, service_id, current_state, status, started_at, last_activity_at, states_completed, progress_percent, identity_verified, eligibility_checked, eligibility_result, consent_granted, handed_off, handoff_reason, agent_actions, human_actions, review_status, review_requested_at, review_reason, event_count) VALUES (` +
        `${sql(caseId)}, ${sql(userId)}, ${sql(serviceId)}, ${sql(finalState)}, ${sql(status)}, ${sql(startedAt)}, ${sql(lastActivity)}, ${sql(JSON.stringify(visited))}, ${progress}, ${identityVerified}, ${eligibilityChecked}, ${eligibilityChecked ? 1 : "NULL"}, ${consentGranted}, ${handedOff}, ${handedOff ? sql("Complex case escalated to a human caseworker") : "NULL"}, ${agentActions}, ${humanActions}, NULL, NULL, NULL, ${eventCount});`,
    );

    // ── case_events (timeline) ──
    for (const ce of caseEventRows) {
      statements.push(
        `INSERT INTO case_events (case_id, trace_event_id, trace_id, event_type, actor, summary, created_at) VALUES (${sql(caseId)}, ${sql(ce.evtId)}, ${sql(traceId)}, ${sql(ce.type)}, ${sql(ce.actor)}, ${sql(ce.summary)}, ${sql(isoMinus(daysAgo, ce.min))});`,
      );
    }
  }
}

console.log(
  `Generated ${caseCounter} cases across ${serviceIds.length} services ` +
    `(${statements.length} statements).`,
);

void (async () => {
// ── Apply to the local SQLite the dev servers read ──
if (DO_LOCAL) {
  const { SqliteAdapter } = await import("@als/evidence/sqlite");
  const { TraceStore, CaseStore } = await import("@als/evidence");
  const adapter = await SqliteAdapter.create(LOCAL_DB);
  await new TraceStore(adapter).init();
  await new CaseStore(adapter).init();
  for (const stmt of SIM_CLEANUP_SQL) await adapter.run(stmt);
  for (const stmt of statements) await adapter.run(stmt);
  console.log(`Applied to local store: ${LOCAL_DB}`);
}

// ── Push to the live als-evidence D1 (delete-first so re-runs replace) ──
if (DO_REMOTE) {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "_cleanup.sql"), SIM_CLEANUP_SQL.join("\n"));
  const files: string[] = [];
  for (let i = 0; i < statements.length; i += STATEMENTS_PER_FILE) {
    const fp = path.join(OUT_DIR, `sim_${String(files.length).padStart(3, "0")}.sql`);
    writeFileSync(fp, statements.slice(i, i + STATEMENTS_PER_FILE).join("\n"));
    files.push(fp);
  }
  const d1 = (file: string) =>
    execSync(`npx wrangler d1 execute ${D1_NAME} --remote --file="${file}"`, {
      cwd: CITIZEN_DIR,
      encoding: "utf8",
    });
  d1(path.join(OUT_DIR, "_cleanup.sql"));
  files.forEach((f, i) => {
    process.stdout.write(`  pushing batch ${i + 1}/${files.length}\r`);
    d1(f);
  });
  rmSync(OUT_DIR, { recursive: true, force: true });
  console.log(`\nPushed to live D1: ${D1_NAME}`);
}
})();
