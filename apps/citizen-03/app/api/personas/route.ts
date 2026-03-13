import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import fs from "fs/promises";
import path from "path";

/**
 * GET /api/personas
 *
 * Fetches personas from Legibility Studio API, falling back to filesystem.
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
    // Fall through to filesystem
  }

  // Fallback: read user JSON files from filesystem
  const personas = await loadPersonasFromFilesystem();
  return NextResponse.json({ personas, source: "filesystem" });
}

async function loadPersonasFromFilesystem() {
  const bases = [
    path.join(process.cwd(), "..", "..", "data", "simulated", "users"),
    path.join(process.cwd(), "data", "simulated", "users"),
  ];

  for (const base of bases) {
    try {
      const files = await fs.readdir(base);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));
      const personas = await Promise.all(
        jsonFiles.map(async (file) => {
          const raw = await fs.readFile(path.join(base, file), "utf-8");
          const user = JSON.parse(raw);
          return {
            id: user.id as string,
            name: (user.personaName ?? user.name) as string,
            initials: deriveInitials((user.name as string) ?? ""),
            color: (user.color as string) ?? "#505a5f",
            desc: (user.description as string) ?? "",
          };
        }),
      );
      return personas;
    } catch {
      continue;
    }
  }
  return [];
}

function deriveInitials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Z]/.test(w));
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0][0];
  return words[0][0] + words[words.length - 1][0];
}
