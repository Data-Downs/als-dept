import { NextRequest, NextResponse } from "next/server";
import {
  getLifeEvents,
  getGraphEngine,
  getPersonaData,
} from "@/lib/service-data";
import { checkPersonaEligibility } from "@/lib/eligibility-filter";
import { inferInteractionType, resolveProactivityConfig } from "@als/schemas";
import type { PlanTemplate } from "@als/schemas";
import { getServiceClient, type ServiceClient } from "@/lib/service-client";

export const dynamic = "force-dynamic";

type Edge = { from: string; to: string; type: "REQUIRES" | "ENABLES" };

/** Depth-group a plan's services from its entry points over its edges. */
function buildGroups(
  entryIds: string[],
  edges: Edge[],
  memberIds: string[],
): Array<{
  depth: number;
  label: string;
  prerequisiteIds: string[];
  serviceIds: string[];
}> {
  const members = new Set(memberIds);
  const placed = new Set<string>();
  const groups: Array<{
    depth: number;
    label: string;
    prerequisiteIds: string[];
    serviceIds: string[];
  }> = [];
  let frontier = entryIds.filter((id) => members.has(id));
  let depth = 0;
  while (frontier.length > 0) {
    const layer = [...new Set(frontier)].filter((id) => !placed.has(id));
    if (layer.length === 0) break;
    layer.forEach((id) => placed.add(id));
    groups.push({
      depth,
      label: depth === 0 ? "Start here" : `Next steps`,
      prerequisiteIds: [],
      serviceIds: layer,
    });
    frontier = edges
      .filter((e) => layer.includes(e.from))
      .map((e) => e.to)
      .filter((id) => members.has(id) && !placed.has(id));
    depth++;
  }
  const rest = memberIds.filter((id) => !placed.has(id));
  if (rest.length > 0) {
    groups.push({
      depth,
      label: "Also relevant",
      prerequisiteIds: [],
      serviceIds: rest,
    });
  }
  return groups;
}

/**
 * Build a life-event entry directly from a published plan template — the
 * studio's structure (membership, edges, entry points) is the source, not the
 * graph engine. Member services are resolved from the studio catalogue.
 */
async function resolveTemplate(
  t: PlanTemplate,
  client: ServiceClient,
): Promise<Record<string, unknown> | null> {
  const memberIds = [
    ...new Set([
      ...t.entryServiceIds,
      ...t.edges.flatMap((e) => [e.from, e.to]),
      ...(t.membership.serviceIds ?? []),
    ]),
  ];

  const services = [];
  for (const id of memberIds) {
    const svc = await client.getService(id);
    if (!svc) continue;
    const manifest = (svc.manifest as Record<string, unknown>) || {};
    const serviceType =
      (svc.serviceType as string) || (manifest.serviceType as string) || "guide";
    const interactionType = inferInteractionType(serviceType);
    const proactivity = resolveProactivityConfig(interactionType);
    services.push({
      id,
      name: (svc.name as string) || (manifest.name as string) || id,
      dept: (svc.department as string) || (manifest.department as string) || "",
      serviceType,
      interactionType,
      proactive: false,
      gated: false,
      desc: (manifest.description as string) || "",
      govuk_url: (manifest.govuk_url as string) || "",
      eligibility_summary: (manifest.eligibility_summary as string) || "",
      proactivity: {
        mode: proactivity.mode,
        framingPrefix: proactivity.framingPrefix,
        priority: proactivity.priority,
        iconHint: proactivity.iconHint,
        accentColor: proactivity.accentColor,
      },
    });
  }

  if (services.length === 0) return null;
  const memberSet = services.map((s) => s.id);

  return {
    id: t.id,
    icon: t.icon,
    name: t.name,
    desc: t.description,
    entryNodeCount: t.entryServiceIds.length,
    totalServiceCount: services.length,
    services,
    plan: {
      entryServiceIds: t.entryServiceIds.filter((id) => memberSet.includes(id)),
      groups: buildGroups(t.entryServiceIds, t.edges, memberSet),
      edges: t.edges.filter(
        (e) => memberSet.includes(e.from) && memberSet.includes(e.to),
      ),
    },
    templateId: t.id,
    templateVersion: t.version,
  };
}

/**
 * GET /api/life-events?persona=mary-summers
 * Returns all life events with their associated services.
 * When a persona is provided, filters out services the persona is clearly ineligible for.
 */
export async function GET(request: NextRequest) {
  // Optional persona-based filtering
  const personaId = request.nextUrl.searchParams.get("persona");
  const personaData = personaId ? getPersonaData(personaId) : null;

  // Plan source switch. "graph" = engine-derived journeys (the structural
  // source during cutover). "studio" = published plan templates, structured
  // directly from what the legibility studio published.
  const source =
    request.nextUrl.searchParams.get("source") === "studio"
      ? "studio"
      : "graph";

  if (source === "studio") {
    const client = await getServiceClient();
    const published = client ? await client.getPlans() : null;
    if (!client || !published) {
      return NextResponse.json({
        lifeEvents: [],
        source,
        studioAvailable: false,
      });
    }
    const lifeEvents = [];
    for (const t of published.plans) {
      try {
        const resolved = await resolveTemplate(t, client);
        if (resolved) lifeEvents.push(resolved);
      } catch {
        // Skip a template that fails to resolve — never break the list.
      }
    }
    return NextResponse.json({ lifeEvents, source, studioAvailable: true });
  }

  // Graph mode — engine-derived life events, no studio dependency.
  const engine = getGraphEngine();
  const rawLifeEvents = await getLifeEvents();

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

  return NextResponse.json({ lifeEvents, source });
}
