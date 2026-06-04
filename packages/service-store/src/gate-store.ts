/**
 * DecisionGateStore — DB-backed CRUD for decision gates.
 *
 * Promotes decision gates from hand-authored JSON files into a first-class
 * published artefact, authored in the studio. Mirrors ServiceArtefactStore's
 * use of the DatabaseAdapter so it works with SQLite (local) and D1 (prod).
 */

import type { DatabaseAdapter } from "@als/evidence";
import type {
  DecisionGateDefinition,
  DecisionGateOption,
} from "@als/schemas";

interface GateRow {
  id: string;
  question: string;
  help_text: string | null;
  sensitive: number;
  options_json: string;
  context_life_event_id: string | null;
  context_service_id: string | null;
  published: number;
  created_at: string;
  updated_at: string;
}

export interface GateFilter {
  lifeEventId?: string;
  serviceId?: string;
  published?: boolean;
}

export class DecisionGateStore {
  constructor(private db: DatabaseAdapter) {}

  /** Create the table if it doesn't exist (SQLite local dev). D1 uses migrations. */
  async init(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS decision_gates (
        id TEXT PRIMARY KEY,
        question TEXT NOT NULL,
        help_text TEXT,
        sensitive INTEGER NOT NULL DEFAULT 0,
        options_json TEXT NOT NULL,
        context_life_event_id TEXT,
        context_service_id TEXT,
        published INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_gates_life_event ON decision_gates(context_life_event_id);
      CREATE INDEX IF NOT EXISTS idx_gates_service ON decision_gates(context_service_id);
    `);
  }

  async getGate(id: string): Promise<DecisionGateDefinition | undefined> {
    const row = await this.db.get<GateRow>(
      "SELECT * FROM decision_gates WHERE id = ?",
      id,
    );
    return row ? this.rowToGate(row) : undefined;
  }

  async listGates(filter?: GateFilter): Promise<DecisionGateDefinition[]> {
    let sql = "SELECT * FROM decision_gates WHERE 1=1";
    const params: unknown[] = [];
    if (filter?.lifeEventId) {
      sql += " AND context_life_event_id = ?";
      params.push(filter.lifeEventId);
    }
    if (filter?.serviceId) {
      sql += " AND context_service_id = ?";
      params.push(filter.serviceId);
    }
    if (filter?.published !== undefined) {
      sql += " AND published = ?";
      params.push(filter.published ? 1 : 0);
    }
    sql += " ORDER BY id ASC";
    const rows = await this.db.all<GateRow>(sql, ...params);
    return rows.map((r) => this.rowToGate(r));
  }

  async createGate(
    gate: DecisionGateDefinition,
    published = false,
  ): Promise<void> {
    await this.db.run(
      `INSERT INTO decision_gates
        (id, question, help_text, sensitive, options_json, context_life_event_id, context_service_id, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      gate.id,
      gate.question,
      gate.helpText ?? null,
      gate.sensitive ? 1 : 0,
      JSON.stringify(gate.options),
      gate.context?.lifeEventId ?? null,
      gate.context?.serviceId ?? null,
      published ? 1 : 0,
    );
  }

  async updateGate(
    id: string,
    gate: DecisionGateDefinition,
  ): Promise<boolean> {
    const existing = await this.getGate(id);
    if (!existing) return false;
    await this.db.run(
      `UPDATE decision_gates SET
        question = ?, help_text = ?, sensitive = ?, options_json = ?,
        context_life_event_id = ?, context_service_id = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      gate.question,
      gate.helpText ?? null,
      gate.sensitive ? 1 : 0,
      JSON.stringify(gate.options),
      gate.context?.lifeEventId ?? null,
      gate.context?.serviceId ?? null,
      id,
    );
    return true;
  }

  async deleteGate(id: string): Promise<boolean> {
    const result = await this.db.run(
      "DELETE FROM decision_gates WHERE id = ?",
      id,
    );
    return result.changes > 0;
  }

  async togglePublished(id: string): Promise<boolean | undefined> {
    const row = await this.db.get<{ published: number }>(
      "SELECT published FROM decision_gates WHERE id = ?",
      id,
    );
    if (!row) return undefined;
    const next = row.published ? 0 : 1;
    await this.db.run(
      "UPDATE decision_gates SET published = ?, updated_at = datetime('now') WHERE id = ?",
      next,
      id,
    );
    return !!next;
  }

  async count(): Promise<number> {
    const row = await this.db.get<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM decision_gates",
    );
    return row?.cnt || 0;
  }

  async isEmpty(): Promise<boolean> {
    return (await this.count()) === 0;
  }

  /**
   * Referential integrity: every service id a gate's options route to must exist.
   * Returns the list of missing service ids (empty = clean). Studio create/update
   * should reject a gate with missing references at publish time.
   */
  async findMissingServiceReferences(
    gate: DecisionGateDefinition,
  ): Promise<string[]> {
    const referenced = new Set<string>();
    for (const opt of gate.options) {
      for (const id of opt.routingEffect?.enableServices ?? [])
        referenced.add(id);
      for (const id of opt.routingEffect?.skipServices ?? []) referenced.add(id);
    }
    if (referenced.size === 0) return [];

    const ids = [...referenced];
    const placeholders = ids.map(() => "?").join(",");
    try {
      const rows = await this.db.all<{ id: string }>(
        `SELECT id FROM services WHERE id IN (${placeholders})`,
        ...ids,
      );
      const present = new Set(rows.map((r) => r.id));
      return ids.filter((id) => !present.has(id));
    } catch {
      // No services table in this context — cannot validate; treat as clean.
      return [];
    }
  }

  private rowToGate(row: GateRow): DecisionGateDefinition {
    const context: DecisionGateDefinition["context"] = {};
    if (row.context_life_event_id) context.lifeEventId = row.context_life_event_id;
    if (row.context_service_id) context.serviceId = row.context_service_id;
    return {
      id: row.id,
      question: row.question,
      ...(row.help_text ? { helpText: row.help_text } : {}),
      ...(row.sensitive ? { sensitive: true } : {}),
      options: JSON.parse(row.options_json) as DecisionGateOption[],
      ...(Object.keys(context).length > 0 ? { context } : {}),
    };
  }
}
