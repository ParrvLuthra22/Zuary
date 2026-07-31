import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig from "@/server/auth/edge-config";

/*
 * Built from server/auth/edge-config.ts, not server/auth/config.ts: the Drizzle
 * adapter and the Neon driver cannot be shipped to the edge, and under the JWT
 * strategy middleware does not need them — it only decodes the session cookie.
 *
 * That file is also the one module under /server without the `server-only`
 * banner, for the same reason: this import is the edge runtime, not the server.
 */
const { auth } = NextAuth(authConfig);

/** Deliberately unroutable, so the App Router falls through to not-found.tsx. */
const NOT_FOUND_PATH = "/__not-found";

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const path = nextUrl.pathname;

  const isAdminRoute = path === "/admin" || path.startsWith("/admin/");

  /*
   * /admin answers 404, never 403, and never a redirect to /login.
   *
   * A 403 or a login redirect both confirm the route exists, which tells an
   * unauthenticated prober exactly where to point a credential-stuffing run.
   * A signed-in customer gets the same 404 as a stranger — the existence of an
   * admin surface is not something the shop needs to admit to.
   *
   * rewrite, not redirect: the URL stays /admin, so the response is
   * indistinguishable from a route that was never defined. Rewriting to a path
   * the router does not match is what makes Next serve app/not-found.tsx with a
   * real 404 status, rather than a bare bodyless response.
   */
  if (isAdminRoute) {
    if (session?.user?.role === "admin") return NextResponse.next();
    return NextResponse.rewrite(new URL(NOT_FOUND_PATH, nextUrl.origin));
  }

  if (session?.user) return NextResponse.next();

  /*
   * Everything else matched here just needs a session. `next` carries the
   * intended destination so sign-in can return them to it — path plus query
   * only, so it can never be turned into an off-site redirect.
   */
  const next = `${path}${nextUrl.search}`;
  const login = new URL("/login", nextUrl.origin);
  login.searchParams.set("next", next);
  return NextResponse.redirect(login);
});

export const config = {
  matcher: ["/account/:path*", "/checkout", "/admin/:path*"],
};
