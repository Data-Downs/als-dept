import { NextRequest, NextResponse } from "next/server";
import { getConsentPreferenceStore } from "@/lib/personal-data-store";
import type { ConsentPreference } from "@als/schemas";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  try {
    const store = await getConsentPreferenceStore();
    const preferences = await store.getAll(userId);
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Failed to load consent preferences:", error);
    return NextResponse.json({ preferences: [] });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  try {
    const body = await request.json();
    const store = await getConsentPreferenceStore();

    const now = new Date().toISOString();
    const pref: ConsentPreference = {
      id: `cpref_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      dataCategory: body.dataCategory,
      scope: body.scope,
      decision: body.decision,
      department: body.department,
      serviceId: body.serviceId,
      createdAt: now,
      updatedAt: now,
    };

    await store.set(pref);
    return NextResponse.json({ preference: pref });
  } catch (error) {
    console.error("Failed to save consent preference:", error);
    return NextResponse.json(
      { error: "Failed to save preference" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  await params; // validate param exists
  try {
    const body = await request.json();
    const store = await getConsentPreferenceStore();
    await store.revoke(body.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to revoke consent preference:", error);
    return NextResponse.json(
      { error: "Failed to revoke preference" },
      { status: 500 },
    );
  }
}
