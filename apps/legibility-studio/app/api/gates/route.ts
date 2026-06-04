import { NextRequest, NextResponse } from "next/server";
import type { DecisionGateDefinition } from "@als/schemas";
import { getDecisionGateStore } from "@/lib/service-store-init";

/** GET /api/gates — list decision gates (optional ?lifeEventId= / ?serviceId=). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const store = await getDecisionGateStore();
  const gates = await store.listGates({
    lifeEventId: searchParams.get("lifeEventId") || undefined,
    serviceId: searchParams.get("serviceId") || undefined,
  });
  return NextResponse.json({ gates });
}

/** POST /api/gates — create a decision gate (rejects unknown service references). */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DecisionGateDefinition & {
      published?: boolean;
    };
    if (!body.id || !body.question || !Array.isArray(body.options)) {
      return NextResponse.json(
        { error: "id, question and options are required" },
        { status: 400 },
      );
    }
    const store = await getDecisionGateStore();
    if (await store.getGate(body.id)) {
      return NextResponse.json(
        { error: `Gate '${body.id}' already exists` },
        { status: 409 },
      );
    }

    const missing = await store.findMissingServiceReferences(body);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Gate routes to unknown services: ${missing.join(", ")}` },
        { status: 422 },
      );
    }

    await store.createGate(body, !!body.published);
    return NextResponse.json({ id: body.id, created: true });
  } catch (error) {
    console.error("Error creating gate:", error);
    return NextResponse.json(
      { error: "Failed to create gate" },
      { status: 500 },
    );
  }
}
