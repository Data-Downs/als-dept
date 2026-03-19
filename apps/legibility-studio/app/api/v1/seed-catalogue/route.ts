import {
  getServiceStoreAdapter,
  getServiceArtefactStore,
  invalidateServiceStore,
} from "@/lib/service-store-init";
import { handleOptions, jsonWithCors } from "@/lib/cors";

export async function OPTIONS() {
  return handleOptions();
}

interface CatalogueEntry {
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
}

/**
 * POST /api/v1/seed-catalogue
 * Accepts an array of catalogue service entries and inserts them
 * into D1 as source="catalogue" with no artefacts.
 *
 * Body: { services: CatalogueEntry[] }
 *
 * Uses INSERT OR IGNORE — existing services (full/graph) are not overwritten.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entries = body.services as CatalogueEntry[];

    if (!Array.isArray(entries) || entries.length === 0) {
      return jsonWithCors(
        { error: "Body must contain a non-empty 'services' array" },
        { status: 400 },
      );
    }

    const db = await getServiceStoreAdapter();

    let inserted = 0;
    let skipped = 0;

    // Batch in chunks of 50 to stay within D1 limits
    for (let i = 0; i < entries.length; i += 50) {
      const chunk = entries.slice(i, i + 50);
      const statements: Array<{ sql: string; params: unknown[] }> = [];

      for (const entry of chunk) {
        const manifest = {
          id: entry.id,
          name: entry.title,
          department: entry.primary_department,
          description: entry.description,
          govuk_url: entry.govuk_url,
          serviceType:
            entry.format === "transaction" ? "application" : entry.format,
        };

        statements.push({
          sql: `INSERT OR IGNORE INTO services
                (id, name, department, department_key, description, source, service_type, govuk_url, promoted, proactive, gated, manifest_json, channels_json, priority)
                VALUES (?, ?, ?, ?, ?, 'catalogue', ?, ?, 0, 0, 0, ?, ?, ?)`,
          params: [
            entry.id,
            entry.title,
            entry.primary_department,
            entry.department_key,
            entry.description,
            entry.format === "transaction" ? "application" : entry.format,
            entry.govuk_url,
            JSON.stringify(manifest),
            JSON.stringify(entry.channels),
            entry.priority,
          ],
        });
      }

      await db.batch(statements);
      inserted += chunk.length;
    }

    // Check how many were actually new (INSERT OR IGNORE skips duplicates)
    const store = await getServiceArtefactStore();
    const all = await store.listServices();
    const catalogueCount = all.filter(
      (s) => s.source === "catalogue",
    ).length;

    invalidateServiceStore();

    return jsonWithCors({
      success: true,
      submitted: entries.length,
      catalogueServicesInDb: catalogueCount,
    });
  } catch (error) {
    console.error("[v1/seed-catalogue] Error:", error);
    return jsonWithCors(
      { error: "Failed to seed catalogue" },
      { status: 500 },
    );
  }
}
