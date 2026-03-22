/**
 * Life Event Matcher — matches a needProposal's service IDs to a life event.
 *
 * When the LLM identifies a multi-service need via triage, this module finds
 * the best-matching life event from the service graph so the conversation
 * can be informed by the full life event context (all services, dependencies,
 * merged field requirements).
 */

import type { LifeEvent } from "@als/service-graph";
import type { ServiceGraphEngine } from "@als/service-graph";

interface MatchResult {
  lifeEvent: LifeEvent;
  overlapCount: number;
  overlapServiceIds: string[];
}

/**
 * Match a set of proposed service IDs to the best life event.
 *
 * Scores each life event by how many of its reachable services overlap
 * with the proposed services. Returns the best match if at least 2 services
 * overlap, or null if no good match exists.
 */
export function matchNeedToLifeEvent(
  resolvedServiceIds: string[],
  engine: ServiceGraphEngine,
): MatchResult | null {
  const proposedSet = new Set(resolvedServiceIds);
  const lifeEvents = engine.getLifeEvents();

  let best: MatchResult | null = null;

  for (const le of lifeEvents) {
    const reachable = engine.getLifeEventServices(le.id);
    const reachableIds = new Set(reachable.map((s) => s.id));

    const overlap = resolvedServiceIds.filter((id) => reachableIds.has(id));

    if (overlap.length >= 2 && (!best || overlap.length > best.overlapCount)) {
      best = {
        lifeEvent: le,
        overlapCount: overlap.length,
        overlapServiceIds: overlap,
      };
    }
  }

  return best;
}

/**
 * Match a life event by ID hint from the LLM.
 * Falls back to service overlap matching if the hint doesn't match.
 */
export function matchLifeEventById(
  lifeEventId: string,
  engine: ServiceGraphEngine,
): LifeEvent | null {
  const le = engine.getLifeEvent(lifeEventId);
  if (le) return le;

  // Try fuzzy matching on life event IDs/names
  const lifeEvents = engine.getLifeEvents();
  const normalised = lifeEventId.toLowerCase().replace(/[-_\s]/g, "");

  return (
    lifeEvents.find(
      (le) =>
        le.id.toLowerCase().replace(/[-_\s]/g, "") === normalised ||
        le.name.toLowerCase().replace(/[-_\s]/g, "").includes(normalised),
    ) ?? null
  );
}
