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
import crypto from "crypto";
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
// Cases use the real sha256 case_id (so the studio's detail view resolves
// them), so they're identified via their sim_ trace events instead. Order is
// FK-safe on both better-sqlite3 and D1 (which enforce FKs and forbid temp
// tables): delete children first, then the parent cases (matched through the
// still-present trace events), then the trace events themselves.
const SIM_CLEANUP_SQL = [
  "DELETE FROM case_events WHERE trace_id LIKE 'sim_%';",
  "DELETE FROM cases WHERE EXISTS (SELECT 1 FROM trace_events te WHERE te.trace_id LIKE 'sim_%' AND json_extract(te.metadata, '$.userId') = cases.user_id AND json_extract(te.metadata, '$.capabilityId') = cases.service_id);",
  "DELETE FROM trace_events WHERE trace_id LIKE 'sim_%';",
];

// Matches CaseStore.caseId — the studio's case-detail view looks cases up by
// this hash, so simulated cases must use it too.
function caseIdFor(userId: string, serviceId: string): string {
  return crypto
    .createHash("sha256")
    .update(`${userId}:${serviceId}`)
    .digest("hex")
    .slice(0, 16);
}

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

// Who drives a given state transition, inferred from the destination state.
// citizen = the steps a person must personally take (prove identity, consent,
// provide/confirm details, upload, sign, pay); system = automated outcomes
// (checks, assessments, decisions, issuance); agent = everything done on the
// citizen's behalf (submissions, notifications). The studio renders these as
// the green "C / Citizen", grey "S / System" and blue "A / Agent" badges.
function actorForState(toState: string): "agent" | "citizen" | "system" {
  const s = toState.toLowerCase();
  if (
    s === "identity-verified" ||
    s.includes("consent") ||
    s.includes("personal-details") ||
    s.includes("child-details") ||
    s.includes("details-provided") ||
    s.includes("details-confirmed") ||
    s.includes("details-collected") ||
    s.includes("housing") ||
    s.includes("income") ||
    s.includes("bank") ||
    s.includes("upload") ||
    s.includes("sign") ||
    s.includes("appointment-booked") ||
    s.includes("payment") ||
    s.includes("paid")
  )
    return "citizen";
  if (
    s.includes("decision") ||
    s.includes("assessment") ||
    s.includes("determination") ||
    s.includes("calculated") ||
    s.includes("verified") ||
    s.includes("registered") ||
    s.includes("completed") ||
    s.includes("issued") ||
    s.includes("under-review") ||
    s.includes("order-confirmed")
  )
    return "system";
  return "agent";
}

// Plausible, service-agnostic reasons a rejection decision could carry.
const REJECTION_REASONS = [
  "Income exceeds the eligibility threshold for this service",
  "Residency requirement not met — insufficient qualifying period",
  "Required supporting evidence could not be verified",
  "An active entitlement for this benefit already exists",
  "Eligibility criteria not met based on the details provided",
  "Identity could not be confirmed against authoritative records",
  "Application submitted outside the qualifying window",
];

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
const usedCaseIds = new Set<string>();
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

  // Consent grants define exactly which fields are shared, from where, and why
  // — the privacy-preserving record of what was exchanged (no raw values).
  let grants: Array<{
    id: string;
    description: string;
    data_shared: string[];
    source: string;
    purpose: string;
  }> = [];
  try {
    const cm = JSON.parse(
      readFileSync(path.join(SERVICES_DIR, serviceId, "consent.json"), "utf8"),
    );
    grants = (cm.grants || []).filter(
      (g: { data_shared?: string[] }) =>
        Array.isArray(g.data_shared) && g.data_shared.length > 0,
    );
  } catch {
    // Service has no consent model — leave grants empty.
  }

  const triggerOf = new Map<string, string>();
  for (const t of model.transitions ?? []) {
    triggerOf.set(`${t.from}|${t.to}`, t.trigger ?? "advance");
  }

  // Happy path: every state except the failure terminals, in declared order.
  const happy = states.map((s) => s.id).filter((id) => !FAILURE_STATES.has(id));
  if (happy.length < 2) continue;
  const successTerminal = happy[happy.length - 1];
  const totalStates = states.length;

  const numCases = randint(3, 6);
  const outcomes: Outcome[] = Array.from({ length: numCases }, () => {
    const roll = rand();
    return roll < 0.4
      ? "completed"
      : roll < 0.6
        ? "in-progress"
        : roll < 0.85
          ? "rejected"
          : "handed-off";
  });
  // Guarantee at least one rejected case per service so a rejection is always
  // easy to find when demoing.
  if (!outcomes.includes("rejected")) outcomes[outcomes.length - 1] = "rejected";

  for (let i = 0; i < numCases; i++) {
    const outcome: Outcome = outcomes[i];

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

    caseCounter++;
    let userId = applicantRef();
    let caseId = caseIdFor(userId, serviceId);
    while (usedCaseIds.has(caseId)) {
      userId = applicantRef();
      caseId = caseIdFor(userId, serviceId);
    }
    usedCaseIds.add(caseId);
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

    const rejectionReason = outcome === "rejected" ? pick(REJECTION_REASONS) : null;

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

    const evtStart = eventCounter;
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
      // A rejection is preceded by a policy evaluation that explains it.
      if (to === "rejected" && rejectionReason) {
        const pEvt = pushEvent(
          "policy.evaluated",
          {
            eligible: false,
            passed: k,
            failed: 1,
            reason: rejectionReason,
            failedRules: [rejectionReason],
          },
          serviceId,
        );
        caseEventRows.push({
          evtId: pEvt,
          type: "policy.evaluated",
          actor: "system",
          summary: `Eligibility decision: rejected — ${rejectionReason}`,
          min: minute,
        });
      }

      const evtId = pushEvent(
        "state.transition",
        {
          fromState: from,
          toState: to,
          trigger: trig,
          ...(terminal ? { terminal } : {}),
          ...(to === "rejected" && rejectionReason ? { reason: rejectionReason } : {}),
        },
        serviceId,
      );
      const actor = actorForState(to);
      if (actor === "agent") agentActions++;
      else if (actor === "citizen") humanActions++;
      const summary =
        to === "rejected" && rejectionReason
          ? `State: ${from} -> rejected — ${rejectionReason}`
          : `State: ${from} -> ${to}`;
      caseEventRows.push({ evtId, type: "state.transition", actor, summary, min: minute });

      // On reaching consent, record what the citizen actually shared: the
      // field list, source and purpose for each grant — but not the values.
      if (to.includes("consent") && grants.length > 0) {
        for (const g of grants.slice(0, 4)) {
          const cEvt = pushEvent(
            "consent.granted",
            {
              grantId: g.id,
              description: g.description,
              dataShared: g.data_shared,
              source: g.source,
              purpose: g.purpose,
            },
            serviceId,
          );
          const fields =
            g.data_shared.slice(0, 3).join(", ") +
            (g.data_shared.length > 3 ? `, +${g.data_shared.length - 3} more` : "");
          caseEventRows.push({
            evtId: cEvt,
            type: "consent.granted",
            actor: "citizen",
            summary: `Consent granted — shared ${fields} via ${g.source}`,
            min: minute,
          });
        }
      }
    }
    pushEvent("llm.response", { responseChars: randint(200, 1600), status: "complete" }, serviceId);
    if (outcome === "completed") {
      pushEvent("capability.result", { success: true, toState: finalState }, serviceId);
    }

    const eventCount = eventCounter - evtStart;
    const lastActivity = isoMinus(daysAgo, minute);

    // ── case row ──
    statements.push(
      `INSERT INTO cases (case_id, user_id, service_id, current_state, status, started_at, last_activity_at, states_completed, progress_percent, identity_verified, eligibility_checked, eligibility_result, consent_granted, handed_off, handoff_reason, agent_actions, human_actions, review_status, review_requested_at, review_reason, event_count) VALUES (` +
        `${sql(caseId)}, ${sql(userId)}, ${sql(serviceId)}, ${sql(finalState)}, ${sql(status)}, ${sql(startedAt)}, ${sql(lastActivity)}, ${sql(JSON.stringify(visited))}, ${progress}, ${identityVerified}, ${eligibilityChecked}, ${outcome === "rejected" ? 0 : eligibilityChecked ? 1 : "NULL"}, ${consentGranted}, ${handedOff}, ${handedOff ? sql("Complex case escalated to a human caseworker") : "NULL"}, ${agentActions}, ${humanActions}, NULL, NULL, NULL, ${eventCount});`,
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
