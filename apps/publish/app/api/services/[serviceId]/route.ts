import { NextRequest, NextResponse } from "next/server";
import { getServiceArtefactStore } from "@/lib/service-store-init";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await params;
  const store = await getServiceArtefactStore();
  const service = await store.getService(serviceId);

  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const gaps = store.analyzeGaps(service);

  return NextResponse.json({ ...service, gaps });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  const { serviceId } = await params;
  const store = await getServiceArtefactStore();
  const body = await req.json();

  const existing = await store.getService(serviceId);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await store.updateService(serviceId, body);

  return NextResponse.json({ updated: true });
}
