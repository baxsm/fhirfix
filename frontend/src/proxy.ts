import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// optimistic auth routing. this only READS the session cookie - never a db or
// network call - because proxy runs on every request including prefetches.
// the real authorization still happens on the backend for every api call.
//
// this is only possible because next.config rewrites /api/auth/* through this
// origin, which makes the session cookie first-party and therefore visible here.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = getSessionCookie(request) !== null;

  // signed out and heading into the app: bounce to sign-in before any html
  // paints, instead of letting the client render a skeleton and then redirect.
  if (
    !hasSession &&
    (pathname === "/app" || pathname.startsWith("/app/") || pathname === "/account")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    // remember where they were headed so sign-in can return them there.
    if (pathname !== "/app") url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  // signed in and sitting on an auth page: send them to the app. this replaces
  // the client-side signed-in-guard round trip.
  if (hasSession && (pathname === "/sign-in" || pathname === "/sign-up")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app", "/app/:path*", "/account", "/sign-in", "/sign-up"],
};
