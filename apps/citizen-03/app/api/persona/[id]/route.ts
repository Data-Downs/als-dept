import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/service-client";
import fs from "fs/promises";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Try Studio API first (works on Cloudflare Workers where filesystem is unavailable)
  try {
    const client = await getServiceClient();
    if (client) {
      const result = await client.getPersona(id);
      if (result?.user) {
        return NextResponse.json(result.user);
      }
    }
  } catch {
    // Fall through to filesystem
  }

  // Fallback: read from filesystem (local dev)
  for (const base of [
    path.join(process.cwd(), "..", "..", "data", "simulated", "users"),
    path.join(process.cwd(), "data", "simulated", "users"),
  ]) {
    try {
      const raw = await fs.readFile(path.join(base, `${id}.json`), "utf-8");
      return NextResponse.json(JSON.parse(raw));
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Persona not found" }, { status: 404 });
}
