import { NextResponse } from "next/server";
import { getPlanTemplateStore } from "@/lib/service-store-init";

/**
 * GET /api/v1/plans — published plan templates (headless read API).
 * This is what the citizen app hydrates active plans from.
 */
export async function GET() {
  const store = await getPlanTemplateStore();
  const plans = await store.listPlans({ published: true });
  return NextResponse.json({ plans });
}
