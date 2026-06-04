import { NextRequest, NextResponse } from "next/server";
import { planToMarkdown, type PlanServiceSummary } from "@als/schemas";
import type { DecisionGateDefinition } from "@als/schemas";
import {
  getPlanTemplateStore,
  getServiceArtefactStore,
  getDecisionGateStore,
} from "@/lib/service-store-init";

/**
 * GET /plans/[planId]/md
 * Renders a plan template as a Markdown capability card (text/markdown).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  const planStore = await getPlanTemplateStore();
  const plan = await planStore.getPlan(planId);

  if (!plan) {
    return new NextResponse("Plan not found", { status: 404 });
  }

  // Collect member service ids: entry services + every edge endpoint + explicit members.
  const memberIds = new Set<string>(plan.entryServiceIds);
  for (const e of plan.edges) {
    memberIds.add(e.from);
    memberIds.add(e.to);
  }
  for (const id of plan.membership.serviceIds ?? []) memberIds.add(id);

  const serviceStore = await getServiceArtefactStore();
  const services: PlanServiceSummary[] = [];
  for (const id of memberIds) {
    const svc = await serviceStore.getService(id);
    if (svc) {
      services.push({
        id: svc.id,
        name: svc.name,
        department: svc.department,
        description: svc.description,
      });
    }
  }

  const gateStore = await getDecisionGateStore();
  const gates: DecisionGateDefinition[] = [];
  for (const gateId of plan.attachedGateIds) {
    const gate = await gateStore.getGate(gateId);
    if (gate) gates.push(gate);
  }

  const markdown = planToMarkdown({ plan, services, gates });

  return new NextResponse(markdown, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
