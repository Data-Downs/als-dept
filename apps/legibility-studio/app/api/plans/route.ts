import { NextRequest, NextResponse } from "next/server";
import type { PlanTemplate } from "@als/schemas";
import { DEFAULT_PLAN_SETTINGS, DEFAULT_POSTURE } from "@als/schemas";
import { getPlanTemplateStore } from "@/lib/service-store-init";

/** GET /api/plans — list plan template summaries (with published flag + counts). */
export async function GET() {
  const store = await getPlanTemplateStore();
  const plans = await store.listSummaries();
  return NextResponse.json({ plans });
}

/** POST /api/plans — create a plan template. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id || !body.name) {
      return NextResponse.json(
        { error: "id and name are required" },
        { status: 400 },
      );
    }
    const store = await getPlanTemplateStore();
    if (await store.getPlan(body.id)) {
      return NextResponse.json(
        { error: `Plan '${body.id}' already exists` },
        { status: 409 },
      );
    }

    const plan: PlanTemplate = {
      id: body.id,
      version: body.version || "1.0.0",
      name: body.name,
      icon: body.icon || "",
      description: body.description || "",
      entryServiceIds: body.entryServiceIds || [],
      membership: body.membership || { mode: "graph-traversal" },
      edges: body.edges || [],
      attachedGateIds: body.attachedGateIds || [],
      sharedFields: body.sharedFields || [],
      relevanceRules: body.relevanceRules || [],
      settings: body.settings || DEFAULT_PLAN_SETTINGS,
      posture: body.posture || DEFAULT_POSTURE,
    };

    await store.createPlan(plan, !!body.published);
    return NextResponse.json({ id: plan.id, created: true });
  } catch (error) {
    console.error("Error creating plan:", error);
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 },
    );
  }
}
