/**
 * PlanTemplateStore — DB-backed CRUD for plan templates.
 *
 * A plan template is the authored, publishable form of a "life event": a
 * cross-service journey. Mirrors ServiceArtefactStore (DatabaseAdapter, idempotent
 * ALTER migrations) so it runs on SQLite locally and D1 in production.
 */

import type { DatabaseAdapter } from "@als/evidence";
import type {
  PlanTemplate,
  PlanEdge,
  PlanMembership,
  PlanSharedField,
  PlanRelevanceRule,
  PlanSettings,
  ServicePosture,
} from "@als/schemas";
import { DEFAULT_PLAN_SETTINGS, DEFAULT_POSTURE } from "@als/schemas";

interface PlanRow {
  id: string;
  version: string;
  name: string;
  icon: string;
  description: string;
  membership_mode: string;
  entry_service_ids_json: string;
  service_ids_json: string | null;
  edges_json: string;
  shared_fields_json: string | null;
  relevance_rules_json: string | null;
  gate_ids_json: string | null;
  settings_json: string | null;
  posture_json: string | null;
  published: number;
  created_at: string;
  updated_at: string;
}

export interface PlanFilter {
  published?: boolean;
}

export interface PlanSummary {
  id: string;
  name: string;
  icon: string;
  description: string;
  published: boolean;
  serviceCount: number;
  gateCount: number;
}

export class PlanTemplateStore {
  constructor(private db: DatabaseAdapter) {}

  /** Create the table if it doesn't exist (SQLite local dev). D1 uses migrations. */
  async init(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS plan_templates (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL DEFAULT '1.0.0',
        name TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        membership_mode TEXT NOT NULL DEFAULT 'graph-traversal',
        entry_service_ids_json TEXT NOT NULL DEFAULT '[]',
        service_ids_json TEXT,
        edges_json TEXT NOT NULL DEFAULT '[]',
        shared_fields_json TEXT,
        relevance_rules_json TEXT,
        gate_ids_json TEXT,
        settings_json TEXT,
        posture_json TEXT,
        published INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    // Idempotent column adds for existing DBs.
    for (const col of [
      "settings_json TEXT",
      "posture_json TEXT",
    ]) {
      try {
        await this.db.exec(`ALTER TABLE plan_templates ADD COLUMN ${col}`);
      } catch {
        /* column already exists */
      }
    }
  }

  async getPlan(id: string): Promise<PlanTemplate | undefined> {
    const row = await this.db.get<PlanRow>(
      "SELECT * FROM plan_templates WHERE id = ?",
      id,
    );
    return row ? this.rowToPlan(row) : undefined;
  }

  async listPlans(filter?: PlanFilter): Promise<PlanTemplate[]> {
    let sql = "SELECT * FROM plan_templates WHERE 1=1";
    const params: unknown[] = [];
    if (filter?.published !== undefined) {
      sql += " AND published = ?";
      params.push(filter.published ? 1 : 0);
    }
    sql += " ORDER BY name ASC";
    const rows = await this.db.all<PlanRow>(sql, ...params);
    return rows.map((r) => this.rowToPlan(r));
  }

  /** Lightweight list for UI, including the published flag and counts. */
  async listSummaries(): Promise<PlanSummary[]> {
    const rows = await this.db.all<PlanRow>(
      "SELECT * FROM plan_templates ORDER BY name ASC",
    );
    return rows.map((row) => {
      const ids = new Set<string>(
        JSON.parse(row.entry_service_ids_json) as string[],
      );
      for (const e of JSON.parse(row.edges_json) as PlanEdge[]) {
        ids.add(e.from);
        ids.add(e.to);
      }
      if (row.service_ids_json) {
        for (const id of JSON.parse(row.service_ids_json) as string[])
          ids.add(id);
      }
      const gateIds = row.gate_ids_json
        ? (JSON.parse(row.gate_ids_json) as string[])
        : [];
      return {
        id: row.id,
        name: row.name,
        icon: row.icon,
        description: row.description,
        published: !!row.published,
        serviceCount: ids.size,
        gateCount: gateIds.length,
      };
    });
  }

  async getPublished(id: string): Promise<boolean | undefined> {
    const row = await this.db.get<{ published: number }>(
      "SELECT published FROM plan_templates WHERE id = ?",
      id,
    );
    return row ? !!row.published : undefined;
  }

  async createPlan(plan: PlanTemplate, published = false): Promise<void> {
    await this.db.run(
      `INSERT INTO plan_templates
        (id, version, name, icon, description, membership_mode, entry_service_ids_json,
         service_ids_json, edges_json, shared_fields_json, relevance_rules_json,
         gate_ids_json, settings_json, posture_json, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      plan.id,
      plan.version,
      plan.name,
      plan.icon,
      plan.description,
      plan.membership.mode,
      JSON.stringify(plan.entryServiceIds),
      plan.membership.serviceIds ? JSON.stringify(plan.membership.serviceIds) : null,
      JSON.stringify(plan.edges),
      JSON.stringify(plan.sharedFields),
      JSON.stringify(plan.relevanceRules),
      JSON.stringify(plan.attachedGateIds),
      JSON.stringify(plan.settings),
      JSON.stringify(plan.posture),
      published ? 1 : 0,
    );
  }

  async updatePlan(id: string, plan: PlanTemplate): Promise<boolean> {
    const existing = await this.getPlan(id);
    if (!existing) return false;
    await this.db.run(
      `UPDATE plan_templates SET
        version = ?, name = ?, icon = ?, description = ?, membership_mode = ?,
        entry_service_ids_json = ?, service_ids_json = ?, edges_json = ?,
        shared_fields_json = ?, relevance_rules_json = ?, gate_ids_json = ?,
        settings_json = ?, posture_json = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      plan.version,
      plan.name,
      plan.icon,
      plan.description,
      plan.membership.mode,
      JSON.stringify(plan.entryServiceIds),
      plan.membership.serviceIds ? JSON.stringify(plan.membership.serviceIds) : null,
      JSON.stringify(plan.edges),
      JSON.stringify(plan.sharedFields),
      JSON.stringify(plan.relevanceRules),
      JSON.stringify(plan.attachedGateIds),
      JSON.stringify(plan.settings),
      JSON.stringify(plan.posture),
      id,
    );
    return true;
  }

  async deletePlan(id: string): Promise<boolean> {
    const result = await this.db.run(
      "DELETE FROM plan_templates WHERE id = ?",
      id,
    );
    return result.changes > 0;
  }

  async togglePublished(id: string): Promise<boolean | undefined> {
    const row = await this.db.get<{ published: number }>(
      "SELECT published FROM plan_templates WHERE id = ?",
      id,
    );
    if (!row) return undefined;
    const next = row.published ? 0 : 1;
    await this.db.run(
      "UPDATE plan_templates SET published = ?, updated_at = datetime('now') WHERE id = ?",
      next,
      id,
    );
    return !!next;
  }

  async count(): Promise<number> {
    const row = await this.db.get<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM plan_templates",
    );
    return row?.cnt || 0;
  }

  async isEmpty(): Promise<boolean> {
    return (await this.count()) === 0;
  }

  private rowToPlan(row: PlanRow): PlanTemplate {
    const membership: PlanMembership = {
      mode: row.membership_mode as PlanMembership["mode"],
      ...(row.service_ids_json
        ? { serviceIds: JSON.parse(row.service_ids_json) as string[] }
        : {}),
    };
    return {
      id: row.id,
      version: row.version,
      name: row.name,
      icon: row.icon,
      description: row.description,
      entryServiceIds: JSON.parse(row.entry_service_ids_json) as string[],
      membership,
      edges: JSON.parse(row.edges_json) as PlanEdge[],
      attachedGateIds: row.gate_ids_json
        ? (JSON.parse(row.gate_ids_json) as string[])
        : [],
      sharedFields: row.shared_fields_json
        ? (JSON.parse(row.shared_fields_json) as PlanSharedField[])
        : [],
      relevanceRules: row.relevance_rules_json
        ? (JSON.parse(row.relevance_rules_json) as PlanRelevanceRule[])
        : [],
      settings: row.settings_json
        ? (JSON.parse(row.settings_json) as PlanSettings)
        : DEFAULT_PLAN_SETTINGS,
      posture: row.posture_json
        ? (JSON.parse(row.posture_json) as ServicePosture)
        : DEFAULT_POSTURE,
    };
  }
}
