import { NextResponse } from "next/server";
import { getPersonaData } from "@/lib/service-data";

/**
 * GET /api/personas/[id]
 *
 * Full persona record — identity, credentials, logins — used to load a
 * simulated citizen into the agent experience and their wallet.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const persona = getPersonaData(id);
  if (!persona) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ persona });
}
