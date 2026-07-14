import { NextRequest, NextResponse } from "next/server";

// Lightweight shared-password gate for the hosted demo.
//  - Bare domain → the cohort demo (/agent).
//  - When DEMO_PASSWORD is set (production), everything is gated behind /gate;
//    the cost-bearing API routes return 401 until unlocked.
//  - When it's unset (local dev), nothing is gated.
const COOKIE = "als_gate";

async function token(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`als-gate::${pw}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Send the bare domain straight to the cohort demo the report describes.
  // The mobile (app) view lives at /mobile.
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/agent";
    return NextResponse.redirect(url);
  }

  const pw = process.env.DEMO_PASSWORD;
  if (!pw) return NextResponse.next(); // ungated (local dev / no secret configured)

  if (pathname.startsWith("/gate") || pathname.startsWith("/api/gate")) {
    return NextResponse.next();
  }

  if (req.cookies.get(COOKIE)?.value === (await token(pw))) {
    return NextResponse.next();
  }

  // Not unlocked: block the API (protects the API budget), gate the pages.
  if (pathname.startsWith("/api/")) {
    return new NextResponse("Locked", { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpe?g|svg|ico|webp|woff2?)$).*)"],
};
