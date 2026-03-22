/**
 * ConsentPreferenceStore — Persistent store for standing consent preferences.
 *
 * Citizens can set preferences like "always allow DWP to access my financial data"
 * which are automatically resolved when services request consent.
 *
 * Follows the same DatabaseAdapter pattern as ConsentLedger and ServiceAccessStore.
 */

import type { DatabaseAdapter } from "@als/evidence";
import type {
  ConsentPreference,
  ConsentGrant,
  ConsentResolutionResult,
  ConsentScope,
  ConsentDataCategory,
} from "@als/schemas";
import { categoriseGrant } from "./field-categories";

const CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS consent_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    data_category TEXT NOT NULL,
    scope TEXT NOT NULL,
    decision TEXT NOT NULL,
    department TEXT,
    service_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    revoked_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_consent_pref_user ON consent_preferences(user_id);
  CREATE INDEX IF NOT EXISTS idx_consent_pref_category ON consent_preferences(user_id, data_category);
`;

/** Scope priority — higher number = broader scope, checked first */
const SCOPE_PRIORITY: Record<ConsentScope, number> = {
  "cross-government": 4,
  department: 3,
  service: 2,
  once: 1,
};

export class ConsentPreferenceStore {
  private db: DatabaseAdapter;

  constructor(db: DatabaseAdapter) {
    this.db = db;
  }

  async init(): Promise<void> {
    await this.db.exec(CREATE_SQL);
  }

  /** Create or update a standing preference */
  async set(pref: ConsentPreference): Promise<void> {
    // Check for existing matching preference to upsert
    const existing = await this.db.get<Record<string, unknown>>(
      `SELECT id FROM consent_preferences
       WHERE user_id = ? AND data_category = ? AND scope = ?
       AND COALESCE(department, '') = COALESCE(?, '')
       AND COALESCE(service_id, '') = COALESCE(?, '')
       AND revoked_at IS NULL`,
      pref.userId,
      pref.dataCategory,
      pref.scope,
      pref.department || "",
      pref.serviceId || "",
    );

    if (existing) {
      await this.db.run(
        `UPDATE consent_preferences
         SET decision = ?, updated_at = ?
         WHERE id = ?`,
        pref.decision,
        pref.updatedAt,
        existing.id as string,
      );
    } else {
      await this.db.run(
        `INSERT INTO consent_preferences
         (id, user_id, data_category, scope, decision, department, service_id, created_at, updated_at, revoked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        pref.id,
        pref.userId,
        pref.dataCategory,
        pref.scope,
        pref.decision,
        pref.department || null,
        pref.serviceId || null,
        pref.createdAt,
        pref.updatedAt,
        pref.revokedAt || null,
      );
    }
  }

  /** Get all active preferences for a user */
  async getAll(userId: string): Promise<ConsentPreference[]> {
    const rows = await this.db.all<Record<string, unknown>>(
      `SELECT * FROM consent_preferences
       WHERE user_id = ? AND revoked_at IS NULL
       ORDER BY created_at DESC`,
      userId,
    );
    return rows.map(this.rowToPreference);
  }

  /** Get preferences by data category */
  async getByCategory(
    userId: string,
    category: ConsentDataCategory,
  ): Promise<ConsentPreference[]> {
    const rows = await this.db.all<Record<string, unknown>>(
      `SELECT * FROM consent_preferences
       WHERE user_id = ? AND data_category = ? AND revoked_at IS NULL
       ORDER BY scope DESC`,
      userId,
      category,
    );
    return rows.map(this.rowToPreference);
  }

  /** Revoke a preference */
  async revoke(id: string): Promise<void> {
    await this.db.run(
      "UPDATE consent_preferences SET revoked_at = ? WHERE id = ?",
      new Date().toISOString(),
      id,
    );
  }

  /**
   * Resolve consent grants against standing preferences.
   *
   * For each grant, categorises its data fields and checks for matching
   * preferences in scope priority order (cross-government > department > service).
   */
  async resolve(
    userId: string,
    grants: ConsentGrant[],
    serviceId: string,
    department: string,
  ): Promise<ConsentResolutionResult[]> {
    const preferences = await this.getAll(userId);
    if (preferences.length === 0) {
      return grants.map((g) => ({
        grantId: g.id,
        resolved: false,
        decision: "ask" as const,
      }));
    }

    return grants.map((grant) => {
      const categories = categoriseGrant(grant);

      // Find the best matching preference for this grant's data categories
      // A grant is resolved if ALL its categories have matching preferences
      const matchResults = categories.map((category) =>
        this.findBestPreference(preferences, category, serviceId, department),
      );

      // All categories must be resolved for the grant to be auto-resolved
      const allResolved = matchResults.every((m) => m !== null);
      if (!allResolved) {
        return {
          grantId: grant.id,
          resolved: false,
          decision: "ask" as const,
        };
      }

      // Check if any matched preference says "ask-each-time"
      const hasAsk = matchResults.some(
        (m) => m && m.decision === "ask-each-time",
      );
      if (hasAsk) {
        return {
          grantId: grant.id,
          resolved: false,
          decision: "ask" as const,
          matchedPreferenceId: matchResults[0]?.id,
          reason: "Standing preference set to ask each time",
        };
      }

      // Check if any matched preference denies
      const hasDeny = matchResults.some((m) => m && m.decision === "deny");
      if (hasDeny) {
        return {
          grantId: grant.id,
          resolved: true,
          decision: "denied" as const,
          matchedPreferenceId: matchResults.find((m) => m?.decision === "deny")
            ?.id,
          reason: "Denied by standing preference",
        };
      }

      // All categories allowed
      return {
        grantId: grant.id,
        resolved: true,
        decision: "granted" as const,
        matchedPreferenceId: matchResults[0]?.id,
        reason: `Allowed by ${matchResults[0]?.scope} preference`,
      };
    });
  }

  close(): void {
    this.db.close();
  }

  /**
   * Find the best matching preference for a given category, checking
   * scope hierarchy: cross-government > department > service.
   */
  private findBestPreference(
    preferences: ConsentPreference[],
    category: ConsentDataCategory,
    serviceId: string,
    department: string,
  ): ConsentPreference | null {
    const matching = preferences
      .filter((p) => {
        if (p.dataCategory !== category) return false;
        switch (p.scope) {
          case "cross-government":
            return true;
          case "department":
            return p.department === department;
          case "service":
            return p.serviceId === serviceId;
          default:
            return false;
        }
      })
      .sort((a, b) => SCOPE_PRIORITY[b.scope] - SCOPE_PRIORITY[a.scope]);

    return matching[0] || null;
  }

  private rowToPreference(row: Record<string, unknown>): ConsentPreference {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      dataCategory: row.data_category as ConsentDataCategory,
      scope: row.scope as ConsentScope,
      decision: row.decision as ConsentPreference["decision"],
      department: (row.department as string) || undefined,
      serviceId: (row.service_id as string) || undefined,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      revokedAt: (row.revoked_at as string) || undefined,
    };
  }
}
