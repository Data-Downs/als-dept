import { NextRequest, NextResponse } from "next/server";
import { getPlanTemplateStore } from "@/lib/service-store-init";

/** GET /api/v1/plans/[planId] — a single published plan template (headless read). */
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
  return NextResponse.json(plan);
}
