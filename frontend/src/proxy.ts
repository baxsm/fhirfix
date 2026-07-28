import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = getSessionCookie(request) !== null;

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
