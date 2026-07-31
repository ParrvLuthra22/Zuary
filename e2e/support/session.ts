import { encode } from "@auth/core/jwt";
import type { BrowserContext } from "@playwright/test";

/**
 * Signs a test browser in by minting the session cookie directly.
 *
 * There is no password provider to drive — the site offers Google, a magic
 * link and phone OTP, and all three leave the app mid-flow. Automating a real
 * inbox or an OAuth consent screen is exactly the kind of brittle, third-party
 * dependence that makes a suite untrustworthy, so the tests forge what those
 * flows would have produced.
 *
 * This is the same JWT the app issues, encrypted with the same secret, so
 * middleware and `auth()` treat it as genuine. It proves nothing about the
 * providers themselves — that is what auth.spec.ts covers at the surface — but
 * it makes everything downstream of "is signed in" testable.
 */

/** Auth.js names the cookie by scheme; the salt must match it exactly. */
export function cookieName(baseURL: string) {
  return baseURL.startsWith("https://")
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
}

export type TestUser = {
  id: string;
  email: string;
  name?: string;
  role?: "customer" | "admin";
};

export async function signIn(
  context: BrowserContext,
  baseURL: string,
  user: TestUser,
) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET must be set for e2e — it is what the session cookie is encrypted with.",
    );
  }

  const name = cookieName(baseURL);
  const maxAge = 60 * 60; // an hour is plenty for a test run

  const token = await encode({
    salt: name,
    secret,
    maxAge,
    token: {
      // The shape the jwt callback produces: sub plus the two fields the
      // session callback copies onto session.user.
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name ?? "Test Person",
      role: user.role ?? "customer",
    },
  });

  const url = new URL(baseURL);
  await context.addCookies([
    {
      name,
      value: token,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: url.protocol === "https:",
      expires: Math.floor(Date.now() / 1000) + maxAge,
    },
  ]);
}

/** The two accounts scripts/seed-e2e.ts writes. Ids are fixed so specs can rely on them. */
export const CUSTOMER: TestUser = {
  id: "e2e-customer",
  email: "e2e-customer@zuary.test",
  name: "E2E Customer",
  role: "customer",
};

export const OTHER_CUSTOMER: TestUser = {
  id: "e2e-other",
  email: "e2e-other@zuary.test",
  name: "E2E Other",
  role: "customer",
};

export const ADMIN: TestUser = {
  id: "e2e-admin",
  email: "e2e-admin@zuary.test",
  name: "E2E Admin",
  role: "admin",
};
