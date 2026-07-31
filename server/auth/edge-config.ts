import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * The half of the auth config that can run on the edge.
 *
 * middleware.ts needs to read a session on every matched request, but the
 * Drizzle adapter pulls the Neon driver and the whole schema in with it — far
 * too much to ship to the edge, and it is not needed there: under the JWT
 * strategy middleware only decodes a cookie. So the adapter and every callback
 * that touches the database live in auth.ts, which runs on Node, and this file
 * holds what both share.
 *
 * The `session` callback has to be here rather than in auth.ts alone: it is
 * what puts id and role on the session object, and middleware reads
 * `req.auth.user.role` to gate /admin.
 *
 * The Resend provider is deliberately NOT here. Auth.js validates the whole
 * config on every request, and an email provider without an adapter fails that
 * validation with MissingAdapter — which aborts the request before the session
 * is read, so `req.auth` comes back null and every gated route behaves as if
 * nobody is signed in. It is added in auth.ts, alongside the adapter it needs.
 */
export default {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // rotate at most once a day
  },

  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login/error",
  },

  providers: [
    /*
     * allowDangerousEmailAccountLinking is deliberate.
     *
     * Without it, someone who first signed up with a magic link and later hits
     * "Continue with Google" on the same address gets OAuthAccountNotLinked and
     * a dead end. The flag is only dangerous when a provider does not prove
     * ownership of the address it reports — an attacker could then claim
     * someone else's account by asserting their email. Both providers here do
     * prove it: Google returns email_verified, and a magic link is only
     * clickable by whoever receives the mail. Same address therefore means the
     * same person, and they land on one account.
     *
     * If a provider that does not verify email is ever added, it must not carry
     * this flag.
     */
    Google({ allowDangerousEmailAccountLinking: true }),
  ],

  callbacks: {
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      session.user.role = token.role ?? "customer";
      return session;
    },
  },
} satisfies NextAuthConfig;
