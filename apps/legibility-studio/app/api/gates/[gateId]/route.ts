import { NextRequest, NextResponse } from "next/server";
import type { DecisionGateDefinition } from "@als/schemas";
import { getDecisionGateStore } from "@/lib/service-store-init";

/** GET /api/gates/[gateId] */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gateId: string }> },
) {
  const { gateId } = await params;
  const store = await getDecisionGateStore();
  const gate = await store.getGate(gateId);
  if (!gate) {
    return NextResponse.json({ error: "Gate not found" }, { status: 404 });
  }
  return NextResponse.json(gate);
}

/** PUT /api/gates/[gateId] — update a gate (rejects unknown service references). */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ gateId: string }> },
) {
  try {
    const { gateId } = await params;
    const body = (await request.json()) as DecisionGateDefinition;
    const store = await getDecisionGateStore();

    const missing = await store.findMissingServiceReferences({
      ...body,
      id: gateId,
    });
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Gate routes to unknown services: ${missing.join(", ")}` },
        { status: 422 },
      );
    }

    const updated = await store.updateGate(gateId, { ...body, id: gateId });
    if (!updated) {
      return NextResponse.json({ error: "Gate not found" }, { status: 404 });
    }
    return NextResponse.json({ id: gateId, updated: true });
  } catch (error) {
    console.error("Error updating gate:", error);
    return NextResponse.json(
      { error: "Failed to update gate" },
      { status: 500 },
    );
  }
}

/** DELETE /api/gates/[gateId] */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ gateId: string }> },
) {
  const { gateId } = await params;
  const store = await getDecisionGateStore();
  const deleted = await store.deleteGate(gateId);
  if (!deleted) {
    return NextResponse.json({ error: "Gate not found" }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
