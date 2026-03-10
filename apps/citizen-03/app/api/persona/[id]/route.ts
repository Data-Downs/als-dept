import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
