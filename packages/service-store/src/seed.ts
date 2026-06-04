/**
 * Seed the service store from @als/service-graph constants and
 * embedded full-artefact service data.
 *
 * Full services are now embedded in full-services.ts (no filesystem dependency)
 * so seeding works on both local dev and Cloudflare Workers.
 */

import type { DatabaseAdapter } from "@als/evidence";
import {
  ServiceGraphEngine,
  graphNodeToManifest,
  EDGES,
  LIFE_EVENTS,
} from "@als/service-graph";
import { ServiceArtefactStore } from "./service-store";
import { ServiceGraphStore } from "./graph-store";
import { PlanTemplateStore } from "./plan-store";
import { DecisionGateStore } from "./gate-store";
import { FULL_SERVICES } from "./full-services";
import { normaliseDepartment } from "./department-map";
import {
  DEFAULT_PLAN_SETTINGS,
  DEFAULT_POSTURE,
  type DecisionGateFile,
} from "@als/schemas";

// Decision-gate definitions, loaded lazily (filesystem available locally; absent
// in the Worker bundle, where this returns []).
let _gateFiles: DecisionGateFile[] | null = null;
function getGateFiles(): DecisionGateFile[] {
  if (!_gateFiles) {
    _gateFiles = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _gateFiles.push(require("../../../data/decision-gates/bereavement.json"));
    } catch {
      /* no gate files in this context */
    }
  }
  return _gateFiles;
}

// Catalogue data loaded lazily to avoid bloating the Worker bundle
let _catalogueData: Array<Record<string, unknown>> | null = null;
function getCatalogueData(): Array<Record<string, unknown>> {
  if (!_catalogueData) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _catalogueData = require("../../../data/govuk-services-catalogue.json");
    } catch {
      _catalogueData = [];
    }
  }
  return _catalogueData!;
}

export interface SeedOptions {
  /** @deprecated — no longer used. Full services are now embedded. */
  servicesDir?: string | null;
  /** If true, clear existing data before seeding */
  clear?: boolean;
}

export interface SeedResult {
  graphServices: number;
  fullServices: number;
  catalogueServices: number;
  edges: number;
  lifeEvents: number;
  planTemplates: number;
  decisionGates: number;
}

/**
 * Seed the service store with data from:
 * 1. @als/service-graph (108 graph services, 98 edges, 16 life events)
 * 2. Embedded full-artefact services (4 services with policy/stateModel/consent)
 *
 * Full services that have a matching graph node ID replace the graph-only entry.
 */
export async function seedServiceStore(
  db: DatabaseAdapter,
  options: SeedOptions,
): Promise<SeedResult> {
  const artefactStore = new ServiceArtefactStore(db);
  const graphStore = new ServiceGraphStore(db);
  const planStore = new PlanTemplateStore(db);
  const gateStore = new DecisionGateStore(db);
  const engine = new ServiceGraphEngine();

  // Ensure the plan-layer tables exist (no-op if already created / on D1 migrations).
  await planStore.init();
  await gateStore.init();

  if (options.clear) {
    // Preserve LLM-generated services — only clear graph-only and non-generated entries
    await db.exec("DELETE FROM life_event_services");
    await db.exec("DELETE FROM life_events");
    await db.exec("DELETE FROM edges");
    await db.exec("DELETE FROM services WHERE generated_at IS NULL");
  }

  let graphCount = 0;
  let fullCount = 0;

  // Build set of graph IDs that will be replaced by full services
  const replacedGraphIds = new Set<string>();
  for (const fs of FULL_SERVICES) {
    if (fs.graphId) replacedGraphIds.add(fs.graphId);
  }

  // 1. Seed graph services (skip those that will be replaced by full services)
  const nodes = engine.getServices();
  const graphStatements: Array<{ sql: string; params: unknown[] }> = [];

  for (const node of nodes) {
    if (replacedGraphIds.has(node.id)) continue; // Will be seeded as full service

    const manifest = graphNodeToManifest(node);
    const dept = normaliseDepartment(node.dept, node.deptKey);
    graphStatements.push({
      sql: `INSERT OR IGNORE INTO services (id, name, department, department_key, description, source, service_type, govuk_url, eligibility_summary, promoted, proactive, gated, manifest_json)
            VALUES (?, ?, ?, ?, ?, 'graph', ?, ?, ?, 0, ?, ?, ?)`,
      params: [
        node.id,
        node.name,
        dept.name,
        dept.key,
        node.desc,
        node.serviceType,
        node.govuk_url,
        node.eligibility.summary,
        node.proactive ? 1 : 0,
        node.gated ? 1 : 0,
        JSON.stringify(manifest),
      ],
    });
    graphCount++;
  }

  await db.batch(graphStatements);

  // 2. Seed full-artefact services from embedded data
  for (const fullSvc of FULL_SERVICES) {
    // Use graph ID if available, otherwise use manifest ID
    const serviceId =
      fullSvc.graphId || (fullSvc.manifest.id as string) || fullSvc.dirName;

    // Delete any existing entry (graph or stale full) with this ID
    await db.run("DELETE FROM services WHERE id = ?", serviceId);

    // Also delete any entry with the manifest ID if different from serviceId
    const manifestId = fullSvc.manifest.id as string;
    if (manifestId && manifestId !== serviceId) {
      await db.run("DELETE FROM services WHERE id = ?", manifestId);
    }

    const rawDeptName = (fullSvc.manifest.department as string) || "";
    const rawDeptKey = rawDeptName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "other";
    const fullDept = normaliseDepartment(rawDeptName, rawDeptKey);

    await artefactStore.createService({
      id: serviceId,
      manifest: {
        ...fullSvc.manifest,
        department: fullDept.name,
        source: "full",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      policy: fullSvc.policy,
      stateModel: fullSvc.stateModel,
      consent: fullSvc.consent,
      source: "full",
      departmentKey: fullDept.key,
    });
    fullCount++;
  }

  // 3. Seed edges
  const edgeStatements: Array<{ sql: string; params: unknown[] }> = [];
  for (const edge of EDGES) {
    edgeStatements.push({
      sql: "INSERT OR IGNORE INTO edges (from_service_id, to_service_id, edge_type) VALUES (?, ?, ?)",
      params: [edge.from, edge.to, edge.type],
    });
  }
  await db.batch(edgeStatements);

  // 4. Seed life events
  const leStatements: Array<{ sql: string; params: unknown[] }> = [];
  const lesStatements: Array<{ sql: string; params: unknown[] }> = [];

  for (const le of LIFE_EVENTS) {
    leStatements.push({
      sql: "INSERT OR IGNORE INTO life_events (id, name, icon, description) VALUES (?, ?, ?, ?)",
      params: [le.id, le.name, le.icon, le.desc],
    });

    for (const nodeId of le.entryNodes) {
      lesStatements.push({
        sql: "INSERT OR IGNORE INTO life_event_services (life_event_id, service_id) VALUES (?, ?)",
        params: [le.id, nodeId],
      });
    }
  }

  await db.batch(leStatements);
  await db.batch(lesStatements);

  // 4b. Migrate decision gates into the gate store. Idempotent (INSERT OR IGNORE)
  //     and additive — never overwrites a gate edited/published in the studio.
  const gateFiles = getGateFiles();
  const gatesByLifeEvent = new Map<string, string[]>();
  const gateStatements: Array<{ sql: string; params: unknown[] }> = [];
  let gateCount = 0;
  for (const file of gateFiles) {
    for (const gate of file.gates) {
      const lifeEventId = gate.context?.lifeEventId ?? file.lifeEventId ?? null;
      const serviceId = gate.context?.serviceId ?? file.serviceId ?? null;
      gateStatements.push({
        sql: `INSERT OR IGNORE INTO decision_gates
                (id, question, help_text, sensitive, options_json, context_life_event_id, context_service_id, published)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        params: [
          gate.id,
          gate.question,
          gate.helpText ?? null,
          gate.sensitive ? 1 : 0,
          JSON.stringify(gate.options),
          lifeEventId,
          serviceId,
        ],
      });
      if (lifeEventId) {
        const list = gatesByLifeEvent.get(lifeEventId) ?? [];
        list.push(gate.id);
        gatesByLifeEvent.set(lifeEventId, list);
      }
      gateCount++;
    }
  }
  await db.batch(gateStatements);

  // 4c. Migrate the 16 life events into plan templates. Structure (entry services,
  //     edges) is derived from the graph engine; gates attached by life event.
  //     Published so existing journeys stay live. Idempotent and additive.
  const planStatements: Array<{ sql: string; params: unknown[] }> = [];
  let planCount = 0;
  for (const le of LIFE_EVENTS) {
    const lePlan = engine.getLifeEventPlan(le.id);
    const entryServiceIds = lePlan?.entryServiceIds ?? le.entryNodes;
    const edges = lePlan?.edges ?? [];
    planStatements.push({
      sql: `INSERT OR IGNORE INTO plan_templates
              (id, version, name, icon, description, membership_mode,
               entry_service_ids_json, service_ids_json, edges_json,
               shared_fields_json, relevance_rules_json, gate_ids_json,
               settings_json, posture_json, published)
            VALUES (?, '1.0.0', ?, ?, ?, 'graph-traversal', ?, NULL, ?, '[]', '[]', ?, ?, ?, 1)`,
      params: [
        le.id,
        le.name,
        le.icon,
        le.desc,
        JSON.stringify(entryServiceIds),
        JSON.stringify(edges),
        JSON.stringify(gatesByLifeEvent.get(le.id) ?? []),
        JSON.stringify(DEFAULT_PLAN_SETTINGS),
        JSON.stringify(DEFAULT_POSTURE),
      ],
    });
    planCount++;
  }
  await db.batch(planStatements);

  // 5. Seed catalogue services from GOV.UK spreadsheet
  // These are lightweight entries (no artefacts) — INSERT OR IGNORE to avoid
  // duplicating existing full or graph services.
  const catalogue = getCatalogueData() as Array<{
    id: string;
    title: string;
    description: string;
    link: string;
    govuk_url: string;
    format: string;
    primary_department: string;
    department_key: string;
    service_available: boolean;
    channels: Record<string, boolean>;
    priority: "demo" | "transactional" | "reference";
  }>;

  let catalogueCount = 0;
  const catStatements: Array<{ sql: string; params: unknown[] }> = [];

  for (const entry of catalogue) {
    const dept = normaliseDepartment(
      entry.primary_department,
      entry.department_key,
    );

    const manifest = {
      id: entry.id,
      name: entry.title,
      department: dept.name,
      description: entry.description,
      govuk_url: entry.govuk_url,
      serviceType: entry.format === "transaction" ? "application" : "guide",
    };

    catStatements.push({
      sql: `INSERT OR IGNORE INTO services (id, name, department, department_key, description, source, service_type, govuk_url, promoted, proactive, gated, manifest_json, channels_json, priority)
            VALUES (?, ?, ?, ?, ?, 'catalogue', ?, ?, 0, 0, 0, ?, ?, ?)`,
      params: [
        entry.id,
        entry.title,
        dept.name,
        dept.key,
        entry.description,
        entry.format === "transaction" ? "application" : entry.format,
        entry.govuk_url,
        JSON.stringify(manifest),
        JSON.stringify(entry.channels),
        entry.priority,
      ],
    });
    catalogueCount++;
  }

  // Batch in chunks of 100 to avoid exceeding D1 limits
  for (let i = 0; i < catStatements.length; i += 100) {
    await db.batch(catStatements.slice(i, i + 100));
  }

  // 6. Fix department names/keys on any surviving services (e.g. LLM-generated
  //    services that weren't cleared). Query all distinct department values and
  //    update any that normalise differently.
  const deptRows = await db.all<{ department: string; department_key: string }>(
    "SELECT DISTINCT department, department_key FROM services",
  );
  const fixStatements: Array<{ sql: string; params: unknown[] }> = [];
  for (const row of deptRows) {
    const canonical = normaliseDepartment(row.department, row.department_key);
    if (
      canonical.name !== row.department ||
      canonical.key !== row.department_key
    ) {
      fixStatements.push({
        sql: "UPDATE services SET department = ?, department_key = ? WHERE department = ? AND department_key = ?",
        params: [
          canonical.name,
          canonical.key,
          row.department,
          row.department_key,
        ],
      });
    }
  }
  if (fixStatements.length > 0) {
    await db.batch(fixStatements);
  }

  return {
    graphServices: graphCount,
    fullServices: fullCount,
    catalogueServices: catalogueCount,
    edges: EDGES.length,
    lifeEvents: LIFE_EVENTS.length,
    planTemplates: planCount,
    decisionGates: gateCount,
  };
}
