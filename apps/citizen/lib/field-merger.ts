/**
 * Field Merger — citizen-side wrapper.
 *
 * The canonical alias map and merge logic now live in @als/schemas
 * (field-merge.ts) so the web renderer computes the same collapse. This module
 * resolves each service's consent data from the store, then delegates.
 */

import { getServiceArtefact } from "./service-data";
import {
  mergeConsentFields,
  type MergedField,
  type MergedFieldSummary,
} from "@als/schemas";

export type { MergedField, MergedFieldSummary };

/**
 * Merge data_shared fields across services, deduplicating by canonical field.
 * Resolves consent grants from the store, then delegates to the shared merger.
 */
export async function mergeServiceFields(
  serviceIds: string[],
): Promise<MergedFieldSummary> {
  const services = [];
  for (const serviceId of serviceIds) {
    const consentRaw = await getServiceArtefact(serviceId, "consent");
    const consent = consentRaw as {
      grants?: Array<{ data_shared?: string[] }>;
    } | null;
    const dataShared = (consent?.grants ?? []).flatMap(
      (g) => g.data_shared ?? [],
    );
    services.push({ serviceId, dataShared });
  }
  return mergeConsentFields(services);
}
