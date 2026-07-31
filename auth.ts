import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq, sql } from "drizzle-orm";
import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";

import authConfig from "./auth.config";
import { MagicLink } from "@/emails/MagicLink";
import { verifyTicket } from "@/lib/auth/otp";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { db, getDb } from "@/lib/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
  type UserRole,
} from "@/lib/db/schema";

/**
 * Emails that get the admin role, from ADMIN_EMAILS as a comma-separated list.
 * Parsed once per process; changing the env var needs a redeploy, which is the
 * right friction for granting admin.
 */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

const isAllowlisted = (email: string | null | undefined) =>
  Boolean(email) && adminEmails().has(email!.trim().toLowerCase());

/**
 * Writes the admin role to the user row.
 *
 * Matched on lower(email) rather than on id, because this runs at two points in
 * the sign-in flow and only one of them has an id to hand. Guarded on the
 * current role so a repeat sign-in is not a pointless write.
 *
 * The database is the source of truth on purpose. Promoting only in the token
 * would mean admin status silently disappearing whenever the JWT is reissued,
 * and would leave no record anything privileged had been granted.
 */
async function promoteToAdmin(email: string | null | undefined) {
  if (!isAllowlisted(email)) return;
  try {
    await db
      .update(users)
      .set({ role: "admin" })
      .where(
        sql`lower(${users.email}) = ${email!.trim().toLowerCase()} and ${users.role} <> 'admin'`,
      );
  } catch (error) {
    // Never block a sign-in on this. A failed promotion means the user gets in
    // as a customer, which is the safe direction to fail in.
    console.error("[auth] admin promotion failed", error);
  }
}

/** Authoritative role read. Falls back to customer if the row has gone. */
async function roleFor(userId: string): Promise<UserRole> {
  try {
    const [row] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row?.role ?? "customer";
  } catch (error) {
    console.error("[auth] role lookup failed", error);
    return "customer";
  }
}

/**
 * Every method @auth/drizzle-adapter's pg implementation exposes.
 *
 * Hard-coded on purpose. Auth.js decides what a deployment can do by probing
 * the adapter — `"createSession" in adapter`, and a filter over its keys — and
 * it does that on requests that have nothing to do with the database, including
 * every `auth()` call. Answering those probes from this list is what keeps a
 * session read off the database entirely.
 *
 * If the adapter package gains or loses a method this list has to move with it.
 * The assertion in `resolve` is what makes a drift loud instead of silent.
 */
const ADAPTER_METHODS = [
  "createUser",
  "getUser",
  "getUserByEmail",
  "getUserByAccount",
  "updateUser",
  "deleteUser",
  "linkAccount",
  "unlinkAccount",
  "getAccount",
  "createSession",
  "getSessionAndUser",
  "updateSession",
  "deleteSession",
  "createVerificationToken",
  "useVerificationToken",
  "createAuthenticator",
  "getAuthenticator",
  "listAuthenticatorsByUserId",
  "updateAuthenticatorCounter",
] as const satisfies readonly (keyof Adapter)[];

const ADAPTER_METHOD_SET = new Set<string | symbol>(ADAPTER_METHODS);

/**
 * The adapter, built on first actual use.
 *
 * DrizzleAdapter must be handed the real client — it picks its dialect with
 * drizzle's `is()`, which fails against the lazy proxy `db` exports. But
 * building the client eagerly needs DATABASE_URL at module load, and this module
 * is imported by every page that calls auth(), so `next build` would need a
 * database to compile.
 *
 * So `get` hands back a thunk rather than the real method: construction is
 * deferred all the way to the moment an adapter operation is actually invoked.
 */
function lazyDrizzleAdapter(): Adapter {
  let real: Adapter | undefined;

  const resolve = () => {
    if (!real) {
      real = DrizzleAdapter(getDb(), {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      });
      const missing = ADAPTER_METHODS.filter((name) => !(name in real!));
      if (missing.length) {
        throw new Error(
          `[auth] ADAPTER_METHODS is out of date with @auth/drizzle-adapter; it does not implement: ${missing.join(", ")}`,
        );
      }
    }
    return real;
  };

  return new Proxy({} as Adapter, {
    get(_target, prop) {
      if (!ADAPTER_METHOD_SET.has(prop)) return undefined;
      return (...args: unknown[]) => {
        const method = resolve()[prop as keyof Adapter] as (
          ...a: unknown[]
        ) => unknown;
        return method.call(resolve(), ...args);
      };
    },
    has: (_target, prop) => ADAPTER_METHOD_SET.has(prop),
    ownKeys: () => [...ADAPTER_METHODS],
    getOwnPropertyDescriptor: (_target, prop) =>
      ADAPTER_METHOD_SET.has(prop)
        ? { configurable: true, enumerable: true, writable: false }
        : undefined,
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  /*
   * Google comes from the shared config; the magic link is added only here.
   * An email provider requires an adapter, and Auth.js enforces that when it
   * validates the config — so it can exist only in the instance that has one.
   * Putting it in auth.config.ts breaks middleware for every route.
   *
   * No linking flag on it: that option is not valid for an email provider and
   * is not needed. A magic link proves the address by construction, so Auth.js
   * already resolves it to the existing user with that email. The Google flag
   * is what makes the pair interchangeable.
   */
  providers: [
    ...authConfig.providers,
    Credentials({
      id: "phone-otp",
      name: "Phone",
      credentials: { ticket: { type: "text" } },
      async authorize(raw) {
        const ticket = typeof raw?.ticket === "string" ? raw.ticket : "";
        const claim = verifyTicket(ticket);
        if (!claim) return null;

        /* Find-or-create by phone, and stamp phoneVerified — reaching here
           means a code sent to that number was entered correctly. */
        try {
          const [existing] = await db
            .select()
            .from(users)
            .where(eq(users.phone, claim.phone))
            .limit(1);

          if (existing) {
            await db
              .update(users)
              .set({ phoneVerified: new Date() })
              .where(eq(users.id, existing.id));
            return {
              id: existing.id,
              email: existing.email,
              name: existing.name,
              role: existing.role,
            };
          }

          /* No email yet. The users table requires one and it is unique, so a
             placeholder derived from the phone keeps the row valid until they
             add a real address. Never emailed. */
          const [created] = await db
            .insert(users)
            .values({
              email: `phone+${claim.phone}@users.zuary.in`,
              phone: claim.phone,
              phoneVerified: new Date(),
            })
            .returning();

          return {
            id: created.id,
            email: created.email,
            name: created.name,
            role: created.role,
          };
        } catch (error) {
          console.error("[auth] phone sign-in failed", error);
          return null;
        }
      },
    }),
    Resend({
      from: process.env.EMAIL_FROM,
      /*
       * Replaces Auth.js's built-in sign-in email, which is unstyled and
       * unbranded. Auth.js awaits this and treats a throw as a failed sign-in
       * attempt — so it goes through sendEmail, which never throws, and a
       * delivery failure surfaces as "check your inbox" rather than an error
       * page. The token is single-use either way.
       */
      async sendVerificationRequest({ identifier, url, provider }) {
        /* Five links per address per hour. Without this the form is a free
           mailer: anyone can type a stranger's address repeatedly and fill
           their inbox from our domain, which is how a sender reputation dies. */
        const limit = await rateLimit("magic-link", identifier.toLowerCase());
        if (limit.limited) {
          console.warn("[auth] magic link rate limited", identifier);
          // Returning quietly rather than throwing: Auth.js treats a throw as a
          // failed sign-in and shows an error page, which tells a prober that
          // this address is being throttled.
          return;
        }

        const host = new URL(url).host;
        const result = await sendEmail({
          to: identifier,
          subject: "Your ZUARY sign-in link",
          react: MagicLink({ url, host }),
          replyTo: provider.from ?? undefined,
        });
        if (!result.ok) {
          console.error("[auth] magic link send failed", result.error);
        }
      },
    }),
  ],

  adapter: lazyDrizzleAdapter(),

  /*
   * Phone sign-in.
   *
   * Accepts ONE field: a ticket minted by /api/auth/otp/verify and signed with
   * AUTH_SECRET. It deliberately does not accept a phone number — a Credentials
   * provider is a public POST endpoint, so one that trusts `{ phone }` lets
   * anyone sign in as anyone by typing their number.
   *
   * Registered unconditionally rather than behind ENABLE_PHONE_OTP: the flag
   * gates whether codes are *sent* and whether the UI appears, and a ticket
   * cannot exist without a verified code anyway. Adding and removing providers
   * by env var changes the config Auth.js validates per request, which is how
   * the MissingAdapter breakage happened before.
   */

  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user }) {
      // Covers every sign-in where the row already exists. A brand-new OAuth
      // user may not have been written yet at this point, which is what the
      // createUser event below is for.
      await promoteToAdmin(user.email);
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.id = user.id;
        // Read the role back rather than trusting what the adapter handed us:
        // the promotion above may have landed after this user object was built.
        token.role = await roleFor(user.id);
        return token;
      }

      // `update` is the client calling useSession().update() — the one moment
      // we are asked to refresh, so re-read the role. Ordinary rotations at
      // updateAge deliberately do not hit the database.
      if (trigger === "update" && token.id) {
        token.role = await roleFor(token.id);
      }

      return token;
    },
  },

  events: {
    // First-time OAuth and magic-link users are created after the signIn
    // callback has run, so the allowlist is applied again here. The jwt
    // callback reads the role after both have had their turn.
    async createUser({ user }) {
      await promoteToAdmin(user.email);
    },
  },
});
