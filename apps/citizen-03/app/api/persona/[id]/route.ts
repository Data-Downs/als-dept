import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Try Studio API first (works on Cloudflare Workers where filesystem is unavailable)
  const studioUrl = process.env.STUDIO_API_URL;
  if (studioUrl) {
    try {
      const res = await fetch(`${studioUrl.replace(/\/+$/, "")}/api/personas/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        const data = await res.json();
        // Studio returns { user: {...}, credentialTypes: [...] } — unwrap
        return NextResponse.json(data.user ?? data);
      }
    } catch {
      // Fall through to filesystem
    }
  }

  // Fallback: read from filesystem (local dev)
  for (const base of [
    path.join(process.cwd(), "..", "..", "data", "simulated", "users"),
    path.join(process.cwd(), "data", "simulated", "users"),
  ]) {
    try {
      const raw = await fs.readFile(path.join(base, `${id}.json`), "utf-8");
      return NextResponse.json(JSON.parse(raw));
    } catch { continue; }
  }

  return NextResponse.json({ error: "Persona not found" }, { status: 404 });
}
