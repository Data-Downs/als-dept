import { NextRequest, NextResponse } from "next/server";
import { getServiceArtefactStore } from "@/lib/service-store-init";

export async function GET(req: NextRequest) {
  const store = await getServiceArtefactStore();
  const { searchParams } = req.nextUrl;

  const services = await store.listServices({
    department: searchParams.get("department") || undefined,
    source: searchParams.get("source") || undefined,
    promoted:
      searchParams.get("promoted") === "true"
        ? true
        : searchParams.get("promoted") === "false"
          ? false
          : undefined,
    search: searchParams.get("search") || undefined,
    serviceType: searchParams.get("serviceType") || undefined,
  });

  return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
  const store = await getServiceArtefactStore();
  const body = await req.json();

  const { name, department, interactionType } = body;

  if (!name || !department) {
    return NextResponse.json(
      { error: "name and department are required" },
      { status: 400 }
    );
  }

  // Generate service ID from department + name
  const deptKey = department.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nameKey = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");
  const id = `${deptKey}.${nameKey}`;

  // Check for collision
  const existing = await store.getService(id);
  if (existing) {
    return NextResponse.json(
      { error: `Service ${id} already exists` },
      { status: 409 }
    );
  }

  const manifest = {
    id,
    version: "1.0.0",
    name,
    department,
    description: "",
    jurisdiction: "England, Wales, Scotland",
    input_schema: { type: "object", properties: {} },
    output_schema: { type: "object", properties: {} },
    constraints: {},
    eligibility_ruleset_id: `${id}.eligibility`,
    consent_requirements: [],
    evidence_requirements: [],
    redress: {},
    audit_requirements: {},
    handoff: {},
    promoted: false,
    source: "full",
  };

  await store.createService({
    id,
    name,
    department,
    departmentKey: deptKey,
    description: "",
    source: "full",
    serviceType: interactionType || null,
    govukUrl: null,
    promoted: false,
    proactive: false,
    gated: false,
    manifest: JSON.stringify(manifest),
    policy: null,
    stateModel: null,
    consent: null,
    cardDefinitions: null,
    generatedAt: null,
    interactionType: interactionType || null,
  });

  return NextResponse.json({ id, created: true });
}
