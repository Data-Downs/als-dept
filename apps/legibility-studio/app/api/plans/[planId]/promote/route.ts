import { NextRequest, NextResponse } from "next/server";
import { getPlanTemplateStore } from "@/lib/service-store-init";

/** POST /api/plans/[planId]/promote — toggle the published flag. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  const store = await getPlanTemplateStore();
  const published = await store.togglePublished(planId);
  if (published === undefined) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json({ id: planId, published });
}
