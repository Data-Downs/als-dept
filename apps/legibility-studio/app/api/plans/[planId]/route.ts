import { NextRequest, NextResponse } from "next/server";
import type { PlanTemplate } from "@als/schemas";
import { getPlanTemplateStore } from "@/lib/service-store-init";

/** GET /api/plans/[planId] — full plan template. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  const store = await getPlanTemplateStore();
  const plan = await store.getPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  const published = await store.getPublished(planId);
  return NextResponse.json({ ...plan, published });
}

/** PUT /api/plans/[planId] — update a plan template. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params;
    const body = await request.json();
    const store = await getPlanTemplateStore();
    const existing = await store.getPlan(planId);
    if (!existing) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const plan: PlanTemplate = {
      ...existing,
      ...body,
      id: planId,
      membership: body.membership ?? existing.membership,
      settings: body.settings ?? existing.settings,
      posture: body.posture ?? existing.posture,
    };

    await store.updatePlan(planId, plan);
    return NextResponse.json({ id: planId, updated: true });
  } catch (error) {
    console.error("Error updating plan:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 },
    );
  }
}

/** DELETE /api/plans/[planId] */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  const store = await getPlanTemplateStore();
  const deleted = await store.deletePlan(planId);
  if (!deleted) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
