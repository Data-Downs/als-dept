import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import { PERSONA_LIST } from "@/lib/service-data";

/**
 * GET /api/personas
 *
 * Fetches personas from Legibility Studio API, falling back to bundled data.
 */
export async function GET() {
  try {
    // Try Studio API first
    const client = await getServiceClient();
    if (client) {
      const result = await client.getPersonas();
      if (result?.users?.length) {
        const personas = result.users.map((u) => ({
          id: u.id as string,
          name: (u.personaName as string) ?? (u.name as string),
          initials: deriveInitials((u.name as string) ?? ""),
          color: (u.color as string) ?? "#505a5f",
          desc: (u.description as string) ?? "",
        }));
        return NextResponse.json({ personas, source: "studio" });
      }
    }
  } catch {
    // Fall through to bundled
  }

  // Fallback to bundled static list
  return NextResponse.json({ personas: PERSONA_LIST, source: "bundled" });
}

function deriveInitials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Z]/.test(w));
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0][0];
  return words[0][0] + words[words.length - 1][0];
}
