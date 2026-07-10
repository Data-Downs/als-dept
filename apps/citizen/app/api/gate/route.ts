import { NextRequest, NextResponse } from "next/server";

async function token(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`als-gate::${pw}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Relative Location headers keep the redirect on the same origin regardless of
// the host Next reports (avoids a localhost↔0.0.0.0 cookie mismatch in dev).
function redirect(location: string, cookie?: string): NextResponse {
  const res = new NextResponse(null, { status: 303, headers: { Location: location } });
  if (cookie) {
    res.cookies.set("als_gate", cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}

export async function POST(req: NextRequest) {
  const pw = process.env.DEMO_PASSWORD;
  const form = await req.formData();
  const entered = String(form.get("password") ?? "");
  const raw = String(form.get("next") ?? "/agent");
  const next = raw.startsWith("/") ? raw : "/agent";

  if (!pw || entered !== pw) {
    return redirect(`/gate?next=${encodeURIComponent(next)}&error=1`);
  }
  return redirect(next, await token(pw));
}
