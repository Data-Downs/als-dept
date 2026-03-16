import { NextRequest, NextResponse } from "next/server";
import { getSubmittedStore } from "@/lib/personal-data-store";
import { getPersonaData } from "@/lib/service-data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ personaId: string }> },
) {
  const { personaId } = await params;

  try {
    // In dev mode, always return fresh file data so edits in Legibility Studio are picked up
    if (process.env.NODE_ENV === "development") {
      const freshData = getPersonaData(personaId);
      if (freshData) {
        return NextResponse.json(freshData);
      }
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const submittedStore = await getSubmittedStore();

    // Seed from bundled persona data on first access
    const bundled = getPersonaData(personaId);
    if (bundled) {
      await submittedStore.seedFromPersona(personaId, bundled);
    }

    // Reconstruct persona-shaped object from DB
    const data = await submittedStore.reconstructPersonaData(personaId);
    if (data) {
      return NextResponse.json(data);
    }

    // Fallback: return bundled data directly
    if (bundled) {
      return NextResponse.json(bundled);
    }

    return NextResponse.json({ error: "Persona not found" }, { status: 404 });
  } catch (error) {
    console.error("[PersonalData/full] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load persona data" },
      { status: 500 },
    );
  }
}
