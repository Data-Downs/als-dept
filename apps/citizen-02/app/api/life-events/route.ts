import { NextRequest, NextResponse } from "next/server";
import {
  getLifeEvents,
  getGraphEngine,
  getPersonaData,
} from "@/lib/service-data";
import { checkPersonaEligibility } from "@/lib/eligibility-filter";
import { inferInteractionType, resolveProactivityConfig } from "@als/schemas";

export const dynamic = "force-dynamic";

/**
 * GET /api/life-events?persona=mary-summers
 * Returns all life events with their associated services.
 * When a persona is provided, filters out services the persona is clearly ineligible for.
 */
export async function GET(request: NextRequest) {
  const engine = getGraphEngine();
  const rawLifeEvents = await getLifeEvents();

  // Optional persona-based filtering
  const personaId = request.nextUrl.searchParams.get("persona");
  const personaData = personaId ? getPersonaData(personaId) : null;

  const lifeEvents = rawLifeEvents.map((le) => {
    const allServices = engine.getLifeEventServices(le.id);
    const plan = engine.getLifeEventPlan(le.id);

    // Determine which service IDs to exclude
    const excludedIds = new Set<string>();
    if (personaData) {
      for (const node of allServices) {
        const result = checkPersonaEligibility(node.eligibility, personaData);
        if (!result.eligible) {
          excludedIds.add(node.id);
        }
      }
    }

    // Filter services and enrich with proactivity config
    const services = allServices
      .filter((node) => !excludedIds.has(node.id))
      .map((node) => {
        const interactionType = inferInteractionType(node.serviceType);
        const proactivity = resolveProactivityConfig(interactionType);
        return {
          id: node.id,
          name: node.name,
          dept: node.dept,
          serviceType: node.serviceType,
          interactionType,
          proactive: node.proactive,
          gated: node.gated,
          desc: node.desc,
          govuk_url: node.govuk_url,
          eligibility_summary: node.eligibility.summary,
          // Proposal E: type-aware proactivity metadata
          proactivity: {
            mode: proactivity.mode,
            framingPrefix: proactivity.framingPrefix,
            priority: proactivity.priority,
            iconHint: proactivity.iconHint,
            accentColor: proactivity.accentColor,
          },
        };
      });

    const remainingIds = new Set(services.map((s) => s.id));

    // Rebuild plan if filtering removed services
    let filteredPlan = plan;
    if (plan && excludedIds.size > 0) {
      const filteredGroups = plan.groups
        .map((group) => ({
          ...group,
          serviceIds: group.serviceIds.filter((id) => remainingIds.has(id)),
        }))
        .filter((group) => group.serviceIds.length > 0);

      const filteredEdges = plan.edges.filter(
        (edge) => remainingIds.has(edge.from) && remainingIds.has(edge.to),
      );

      const filteredEntryIds = plan.entryServiceIds.filter((id) =>
        remainingIds.has(id),
      );

      filteredPlan = {
        entryServiceIds: filteredEntryIds,
        groups: filteredGroups,
        edges: filteredEdges,
      };
    }

    return {
      id: le.id,
      icon: le.icon,
      name: le.name,
      desc:
        le.desc ?? (le as unknown as Record<string, unknown>).description ?? "",
      entryNodeCount: le.entryNodes?.length ?? 0,
      totalServiceCount: services.length,
      services,
      plan: filteredPlan,
    };
  });

  return NextResponse.json({ lifeEvents });
}
