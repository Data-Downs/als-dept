import {
  resolveCardsWithOverrides,
  inferInteractionType,
  type CardDefinition,
  type StateCardMapping,
} from "@als/schemas";
import type { ServiceWithArtefacts } from "@als/service-store";

/**
 * Resolve a service's form journey as an ordered list of cards — the SAME
 * resolution the citizen app uses (resolveCardsWithOverrides), just rendered
 * as GOV.UK pages. One card = one "thing per page" step.
 */
export function resolveServiceCards(
  service: ServiceWithArtefacts,
): CardDefinition[] {
  const interactionType =
    service.interactionType ||
    inferInteractionType(service.serviceType || "");
  const overrides =
    (service.cardDefinitions as StateCardMapping[] | null) ?? null;
  const states = service.stateModel?.states ?? [];

  const cards: CardDefinition[] = [];
  const seen = new Set<string>();
  for (const st of states) {
    if (st.type === "terminal") continue;
    const resolved = resolveCardsWithOverrides(
      interactionType,
      st.id,
      service.id,
      overrides,
      { useFallback: false },
    );
    for (const card of resolved) {
      const key = `${st.id}:${card.cardType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push(card);
    }
  }
  return cards;
}
